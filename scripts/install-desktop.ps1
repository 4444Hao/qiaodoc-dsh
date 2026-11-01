param(
  [switch]$Rollback,
  [string]$DshCli = 'D:\dsh-desktop\resources\runtime\cli\bin\dsh.cmd'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$reports = Join-Path $repo 'release/dev/reports'
$candidates = Join-Path $repo 'release/dev/candidate'
$recordFile = Join-Path $reports 'desktop-installation.json'
$homePath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh'
$profile = Join-Path $homePath 'profiles/desktop'
$previousLocation = Get-Location
$previousHome = $env:DSH_HOME
$previousWorkspace = $env:DSH_WORKSPACE

function Get-Sha256([string]$File) {
  $stream = [IO.File]::OpenRead($File)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
  finally { $stream.Dispose(); $algorithm.Dispose() }
}
function Save-Record($Value) {
  $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $recordFile -Encoding UTF8
}
try {
  Set-Location -LiteralPath $repo
  New-Item -ItemType Directory -Path $reports -Force | Out-Null
  New-Item -ItemType Directory -Path $candidates -Force | Out-Null
  if (!(Test-Path -LiteralPath $DshCli -PathType Leaf)) { throw "Desktop CLI missing: $DshCli" }
  if (!(Test-Path -LiteralPath (Join-Path $profile 'package.json'))) { throw "Desktop profile not found: $profile" }
  $env:DSH_HOME = $homePath
  $env:DSH_WORKSPACE = $null
  $version = (& $DshCli --version | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $version -notmatch '0\.2\.1-rc\.5(?:\s|$)') { throw "This prototype targets desktop CLI 0.2.1-rc.5, found: $version" }
  if ($Rollback) {
    $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
    if ($record.profile -ne $profile -or !(Test-Path -LiteralPath $record.rollbackPackage -PathType Leaf)) { throw 'No valid desktop rollback package recorded.' }
    if ((Get-Sha256 $record.rollbackPackage) -ne $record.rollbackSha256) { throw 'Rollback package checksum mismatch.' }
    & $DshCli plugin --profile desktop add $record.rollbackPackage
    if ($LASTEXITCODE -ne 0) { throw 'Desktop rollback failed.' }
    & node scripts/lib/enable-desktop-reader.mjs $profile
    if ($LASTEXITCODE -ne 0) { throw 'Reader bundle activation failed.' }
    $record.status = 'rolled-back-restart-required'
    Save-Record $record
    Write-Host 'Previous reader package restored. Fully quit and reopen desktop DSH.'
  } else {
    $npmCli = $env:npm_execpath
    if (!$npmCli) { $npmCli = Join-Path (Split-Path -Parent (Get-Command node).Source) 'node_modules/npm/bin/npm-cli.js' }
    $checkLog = Join-Path $reports ('desktop-check-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.log')
    $ErrorActionPreference = 'Continue'
    & node $npmCli run check 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath $checkLog
    $checkExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($checkExit -ne 0) { throw "Checks failed. Desktop was not modified. See $checkLog" }
    $packed = & node $npmCli pack --ignore-scripts --pack-destination $candidates --json
    if ($LASTEXITCODE -ne 0) { throw 'Candidate pack failed.' }
    $metadata = ($packed -join "`n") | ConvertFrom-Json
    $original = Join-Path $candidates $metadata[0].filename
    $digest = Get-Sha256 $original
    $candidate = Join-Path $candidates (([IO.Path]::GetFileNameWithoutExtension($original)) + '-' + $digest.Substring(0,12) + '.tgz')
    Copy-Item -LiteralPath $original -Destination $candidate -Force

    # Preserve the installed version itself, not just its mutable source path.
    $backup = Join-Path $profile ('qiaomu-reader-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    New-Item -ItemType Directory -Path $backup | Out-Null
    foreach ($name in @('package.json', 'pnpm-lock.yaml', 'pnpm-lock.yml', 'cordis.patch.yml', 'cordis.yml')) {
      $source = Join-Path $profile $name
      if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination $backup }
    }
    $installed = Join-Path $profile 'node_modules/qiaodoc-dsh'
    if (!(Test-Path -LiteralPath (Join-Path $installed 'package.json'))) { throw 'Reader baseline missing; preserve a rollback package before installation.' }
    $oldPacked = & node $npmCli pack $installed --ignore-scripts --pack-destination $backup --json
    if ($LASTEXITCODE -ne 0) { throw 'Could not pack installed reader for rollback. Desktop was not modified.' }
    $oldMetadata = ($oldPacked -join "`n") | ConvertFrom-Json
    $rollbackPackage = Join-Path $backup $oldMetadata[0].filename
    $record = @{
      date = (Get-Date).ToUniversalTime().ToString('o'); dsh = $version; profile = $profile
      candidate = $candidate; sha256 = $digest; backup = $backup
      rollbackPackage = $rollbackPackage; rollbackSha256 = (Get-Sha256 $rollbackPackage)
      status = 'prepared'; restartRequired = $true; bundles = @{}
    }
    Save-Record $record
    # Deliberately install only the reader; never add the deterministic model here.
    & $DshCli plugin --profile desktop add $candidate
    if ($LASTEXITCODE -ne 0) { throw 'Desktop installation failed. Backup and rollback command are available.' }
    & node scripts/lib/enable-desktop-reader.mjs $profile
    if ($LASTEXITCODE -ne 0) { throw 'Reader bundle activation failed. See rollback command.' }
    foreach ($name in @('index.js', 'client.js')) {
      $actual = Get-Sha256 (Join-Path $installed $name)
      if ($actual -ne (Get-Sha256 (Join-Path $repo $name))) { throw "Installed $name differs from current build. See rollback command." }
      $record.bundles[$name] = $actual
    }
    $record.status = 'installed-restart-required'
    $record.bundleEnabled = $true
    Save-Record $record
    Write-Host "Desktop reader updated. Backup: $backup"
    Write-Host 'Fully quit desktop DSH (including the tray) and reopen it. No app process was stopped.'
    Write-Host 'Rollback command: npm run dev:desktop:rollback'
  }
} catch {
  Write-Error $_ -ErrorAction Continue
  exit 1
} finally {
  $env:DSH_HOME = $previousHome
  $env:DSH_WORKSPACE = $previousWorkspace
  Set-Location -LiteralPath $previousLocation.Path
}
