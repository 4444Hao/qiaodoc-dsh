param(
  [ValidateSet('Check', 'Prepare', 'Serve', 'Browser', 'Smoke')]
  [string]$Action = 'Serve',
  [string]$DshCli = 'D:\dsh-desktop\resources\runtime\cli\bin\dsh.cmd',
  [string]$BrowserExe = ''
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dev = Join-Path $repo 'release/dev'
$reports = Join-Path $dev 'reports'
$candidateDir = Join-Path $dev 'candidate'
$hostLog = Join-Path $reports 'local-host.log'
$previousLocation = Get-Location
$savedEnvironment = @{}
foreach ($key in @('DSH_HOME', 'DSH_WORKSPACE', 'QMR_SMOKE_LOG', 'QMR_CDP_URL')) {
  $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}

function Assert-Exit([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)." }
}
function Get-Sha256([string]$File) {
  $stream = [IO.File]::OpenRead($File)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
  finally { $stream.Dispose(); $algorithm.Dispose() }
}
function Assert-FreePort([int]$Port) {
  $listener = [System.Net.Sockets.TcpClient]::new()
  try {
    if ($listener.ConnectAsync('127.0.0.1', $Port).Wait(500) -and $listener.Connected) {
      throw "Port $Port is in use. Stop the test host with Ctrl+C in its terminal, or reuse the existing test browser. No process was stopped."
    }
  } catch [System.AggregateException] {
    # Connection refused: nothing is listening.
  } finally { $listener.Dispose() }
}
function Get-NpmCli {
  if ($env:npm_execpath -and (Test-Path -LiteralPath $env:npm_execpath)) { return $env:npm_execpath }
  $nodeDir = Split-Path -Parent (Get-Command node -ErrorAction Stop).Source
  $npm = Join-Path $nodeDir 'node_modules/npm/bin/npm-cli.js'
  if (!(Test-Path -LiteralPath $npm)) { throw 'Cannot locate npm-cli.js. Run this script through the npm commands in package.json.' }
  return $npm
}
function Invoke-Check {
  $log = Join-Path $reports ("local-check-" + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.log')
  $preference = $ErrorActionPreference
  try {
    # Windows PowerShell 5 wraps native stderr as ErrorRecord, even on success.
    $ErrorActionPreference = 'Continue'
    & node $script:npmCli run check 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath $log
    $nativeExit = $LASTEXITCODE
  } finally { $ErrorActionPreference = $preference }
  if ($nativeExit -ne 0) { throw "Build, tests and package verification failed (exit $nativeExit). Log: $log" }
  Write-Host "Check passed. Log: $log"
}
function New-Candidate([string]$Source = '') {
  $arguments = @($script:npmCli, 'pack')
  if ($Source) { $arguments += $Source }
  # Invoke-Check already built and verified this tree. Avoid running prepack twice;
  # build scripts can also print to stdout and corrupt npm's JSON metadata.
  $arguments += @('--ignore-scripts', '--pack-destination', $candidateDir, '--json')
  $preference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & node @arguments
    $nativeExit = $LASTEXITCODE
  } finally { $ErrorActionPreference = $preference }
  if ($nativeExit -ne 0) { throw "npm pack failed (exit $nativeExit)." }
  $packed = ($output -join "`n") | ConvertFrom-Json
  $original = Join-Path $candidateDir $packed[0].filename
  $digest = Get-Sha256 $original
  $unique = Join-Path $candidateDir (([IO.Path]::GetFileNameWithoutExtension($original)) + '-' + $digest.Substring(0, 12) + '.tgz')
  Copy-Item -LiteralPath $original -Destination $unique -Force
  return @{ path = $unique; sha256 = $digest }
}
function Invoke-Prepare {
  Assert-FreePort 3087
  if (!(Test-Path -LiteralPath $DshCli -PathType Leaf)) { throw "DSH CLI missing: $DshCli. Supply -DshCli with the desktop-bundled CLI path." }
  $version = (& $DshCli --version | Out-String).Trim()
  Assert-Exit 'DSH version check'
  if ($version -notmatch '0\.2\.1-rc\.5(?:\s|$)') { throw "Document smoke currently targets DSH 0.2.1-rc.5, found: $version" }
  Invoke-Check
  $reader = New-Candidate
  $model = New-Candidate './test/fixtures/dsh-document-model'
  & $DshCli plugin --profile web add $reader.path $model.path
  Assert-Exit 'Isolated plugin installation'
  $installed = Join-Path $env:DSH_HOME 'profiles/web/node_modules/qiaodoc-dsh'
  $bundles = @{}
  foreach ($name in @('index.js', 'client.js')) {
    $sourceHash = Get-Sha256 (Join-Path $repo $name)
    $installedHash = Get-Sha256 (Join-Path $installed $name)
    if ($sourceHash -ne $installedHash) { throw "Installed $name differs from this build. Do not start the host." }
    $bundles[$name] = $sourceHash.ToLowerInvariant()
  }
  $record = @{
    date = (Get-Date).ToUniversalTime().ToString('o'); dsh = $version
    profile = $env:DSH_HOME; reader = $reader; model = $model; bundles = $bundles
  }
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $reports 'local-installation.json') -Encoding UTF8
  Write-Host "Candidate installed in isolated profile. Package: $($reader.path)"
}

try {
  Set-Location -LiteralPath $repo
  foreach ($folder in @($reports, $candidateDir, (Join-Path $dev 'workspace'))) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
  }
  $env:DSH_HOME = Join-Path $dev 'dsh-home'
  $env:DSH_WORKSPACE = Join-Path $dev 'workspace'
  $env:QMR_SMOKE_LOG = Join-Path $reports 'model-requests.jsonl'
  $env:QMR_CDP_URL = 'http://127.0.0.1:9228'
  $script:npmCli = Get-NpmCli
  switch ($Action) {
    'Check' { Invoke-Check }
    'Prepare' { Invoke-Prepare }
    'Serve' {
      Invoke-Prepare
      Write-Host 'Starting isolated DSH on 3087. Keep this terminal open; Ctrl+C stops it.'
      Write-Host 'In a second terminal: npm run dev:browser (once), then npm run test:browser.'
      $ErrorActionPreference = 'Continue'
      & $DshCli --profile web --host 127.0.0.1 --port 3087 --no-open 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath $hostLog
      $ErrorActionPreference = 'Stop'
      Assert-Exit 'Test host'
    }
    'Browser' {
      Assert-FreePort 9228
      if (!(Test-Path -LiteralPath $hostLog)) { throw 'Start npm run dev:local first.' }
      $text = Get-Content -LiteralPath $hostLog -Raw
      if ($text -notmatch 'dsh web:\s+(http://127\.0\.0\.1:3087/\?[^\s]+)') { throw 'Test host launch URL is not ready. Wait until dev:local finishes starting.' }
      $launchUrl = $Matches[1]
      if (!$BrowserExe) {
        $BrowserExe = @('C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', 'C:\Program Files\Microsoft\Edge\Application\msedge.exe') | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
      }
      if (!$BrowserExe -or !(Test-Path -LiteralPath $BrowserExe)) { throw 'Edge not found. Supply -BrowserExe with its executable path.' }
      $browserProfile = Join-Path $dev 'local-browser'
      # A visible window is intentional: this command is for interactive testing.
      Start-Process -FilePath $BrowserExe -ArgumentList @(
        '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9228',
        ('--user-data-dir="' + $browserProfile + '"'), '--no-first-run', '--no-default-browser-check',
        ('"' + $launchUrl + '"')
      ) | Out-Null
      Write-Host 'Opened the isolated test browser. Choose QMR deterministic test before running test:browser.'
    }
    'Smoke' {
      $smokeStarted = Get-Date
      $ErrorActionPreference = 'Continue'
      & node scripts/smoke-document-reader.mjs
      $smokeExit = $LASTEXITCODE
      $ErrorActionPreference = 'Stop'
      $snapshot = Join-Path $reports ('local-browser-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
      New-Item -ItemType Directory -Path $snapshot -Force | Out-Null
      $evidence = @(Get-ChildItem -LiteralPath $reports -File | Where-Object { $_.LastWriteTime -ge $smokeStarted -and $_.Name -match '^p1-(browser-smoke.*\.json|.*\.png)$' })
      $evidence | Copy-Item -Destination $snapshot
      @{ started = $smokeStarted.ToUniversalTime().ToString('o'); exitCode = $smokeExit; files = @($evidence.Name) } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $snapshot 'run.json') -Encoding UTF8
      Write-Host "Browser evidence snapshot: $snapshot"
      if ($smokeExit -ne 0) { throw "Browser smoke failed (exit $smokeExit). Read the report and terminal error." }
    }
  }
} catch {
  Write-Error $_ -ErrorAction Continue
  exit 1
} finally {
  foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
  Set-Location -LiteralPath $previousLocation.Path
}
