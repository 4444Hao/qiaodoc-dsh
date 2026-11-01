# Windows rc.5 安装与试用

适用范围：Windows、已安装并至少启动过一次的 DeepSeek Harness 桌面版，附带 CLI 版本 `0.2.1-rc.5`。QiaoDoc 内部包名仍为 `qiaomu-reader-dsh`。其他宿主版本和平台未纳入这轮试用。

当前工作区版本为 `1.2.0-dev.5`；下面是发行前核查后的使用步骤，不表示已有公开下载资产。原固定标签 `acceptance-1.2.0-dev.2` 不移动。

## 取得安装包

预构建发行时应同时提供 `.tgz` 与 `SHA256SUMS`，核对下载包摘要后安装。本机桌面更新产生的候选位于 `release/dev/candidate/`，具体包名与摘要见 `release/dev/reports/desktop-installation.json`；旧 `release/dev/acceptance-final/` 是 dev.3 验收归档。原始日志与测试 profile 不应作为发行附件。

从源码构建时，在实际项目根目录执行：

```powershell
npm ci
npm run check
New-Item -ItemType Directory -Path .\release\manual -Force | Out-Null
npm pack --ignore-scripts --pack-destination .\release\manual
```

只有完整 check 成功后才使用这里的 `--ignore-scripts`，避免重复 prepack。独立手动打包可以使用正常 `npm pack`，其 prepack 会构建并校验包。

## 首次安装到桌面

1. 先正常启动桌面 DSH 一次，让应用初始化默认 desktop profile；再保存草稿并完全退出，包括托盘。
2. 找到桌面安装目录中的 `resources\runtime\cli\bin\dsh.cmd`，下列 `$dshCli` 和 `$packageFile` 替换为实际路径。
3. 保存默认 profile 的配置快照，再安装包。下面针对 `%USERPROFILE%\.dsh\profiles\desktop`；自定义 DSH_HOME 的用户先确认实际数据目录。

```powershell
$dshCli = 'C:\你的DSH安装目录\resources\runtime\cli\bin\dsh.cmd'
$packageFile = 'C:\下载目录\qiaomu-reader-dsh-1.2.0-dev.5.tgz'
& $dshCli --version
# 上面应为 0.2.1-rc.5；不同版本先停止。

$profilePath = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
if (!(Test-Path -LiteralPath (Join-Path $profilePath 'package.json'))) { throw '请先启动桌面应用完成初始化，并确认 profile 路径。' }
$backupPath = Join-Path $profilePath ('qiaodoc-config-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backupPath | Out-Null
foreach ($name in @('package.json', 'pnpm-lock.yaml', 'cordis.patch.yml', 'cordis.yml')) {
  $file = Join-Path $profilePath $name
  if (Test-Path -LiteralPath $file) { Copy-Item -LiteralPath $file -Destination $backupPath }
}
& $dshCli plugin --profile desktop add $packageFile
```

然后重新打开桌面应用，检查左侧“文档历史”和对话中的“打开原文”。rc.5 安装后的显式 `dsh.profile.bundles` 清单应包含 `qiaomu-reader-dsh`；包下载成功不代替实际入口验收。当前首次 tarball 安装已在全新隔离 web profile 验证自动登记 bundle、冷启动及空历史界面；首次日用 desktop 的独立用户操作仍待复核。

不要用 `--from-default-profile` 重置日用 desktop：该 profile 由 Electron 应用管理。源码仓库的 `dev:desktop` 当前要求存在旧 reader 以生成回退包，适用于更新已有安装，不作为首次安装命令。

## 已有安装的更新与回退

在源码根目录，可使用已有流程：

```powershell
npm run dev:desktop -- -DshCli 'C:\你的DSH安装目录\resources\runtime\cli\bin\dsh.cmd'
# 需要恢复上一轮 reader 时：
npm run dev:desktop:rollback -- -DshCli 'C:\你的DSH安装目录\resources\runtime\cli\bin\dsh.cmd'
```

命令会检查、备份旧包并比对安装构建。更新和回退后均需完全退出并重开应用；不整体覆盖会话、文件或其他插件配置。首次安装没有旧 reader 包可回退，配置快照也不是会话和文件的备份。

## 试用时确认

打开文件不自动把全文交给模型；解释/翻译会向当前真实模型发送选段，询问 AI 仅加入草稿。先用少量可分享的材料试用。

当前限制包括 HTML 渲染选段菜单、完整宿主重启的未保存表单恢复，以及超长 TXT 加载变化后的精确返回。异常和复杂文档验证范围见仓库的阶段验收报告；不要按全部格式、全部异常均通过理解。
