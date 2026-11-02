# GitHub Release 附件准备

当前候选：qiaodoc-dsh 1.2.0-dev.7，建议首次以 `v1.2.0-dev.7` 发布预发行（Pre-release）。仅声明 Windows、DeepSeek Harness 0.2.1-rc.5。本文件是手动操作说明，不表示已经发布。

## 附件

只需上传以下两个文件：

- `qiaodoc-dsh-1.2.0-dev.7.tgz`：包含预构建入口、双语 README、图标、展示图片、安装说明及适用许可证的插件安装包。
- `SHA256SUMS`：该安装包的 SHA-256 摘要及文件名。

发行说明填写到 Release 正文，不必单独作为附件。源码由对应提交和标签提供。日志、node_modules、测试 profile、用户文件与旧回退包不作为发行附件。

## 生成最终附件

先在 VS Code 手动确认、提交并推送准备发行的源码，最终标签应指向该提交。若构建导致 index.js/client.js 变化，先核对并手动提交对应产物，再固定标签。

当前 dev.7 已通过 87 项测试；本轮只调整文档和包清单，不要求重复功能测试。执行下面的包清单检查与打包即可。后续若修改运行代码，先按开发流程执行 npm run check；干净克隆的依赖安装和源码构建见 [安装说明](INSTALLATION.md)。

在项目根目录的 PowerShell 执行：

```powershell
node scripts/verify-package.mjs
if ($LASTEXITCODE -ne 0) { throw 'Package verification failed.' }

$version = (Get-Content .\package.json -Raw | ConvertFrom-Json).version
$releaseDir = Join-Path (Get-Location) "release\public\v$version"
if (Test-Path -LiteralPath $releaseDir) { throw 'Release directory already exists; inspect it before generating new assets.' }
New-Item -ItemType Directory -Path $releaseDir | Out-Null

$packOutput = npm pack --ignore-scripts --json --pack-destination $releaseDir
if ($LASTEXITCODE -ne 0) { throw 'Package creation failed.' }
$pack = ($packOutput -join "`n") | ConvertFrom-Json
$packageFile = Join-Path $releaseDir $pack[0].filename
$digest = (Get-FileHash -LiteralPath $packageFile -Algorithm SHA256).Hash.ToLowerInvariant()
"$digest  $($pack[0].filename)" | Set-Content -LiteralPath (Join-Path $releaseDir 'SHA256SUMS') -Encoding ascii

Get-ChildItem -LiteralPath $releaseDir
Get-Content -LiteralPath (Join-Path $releaseDir 'SHA256SUMS')
```

`--ignore-scripts` 在这里复用已验证的预构建产物，不重复触发 prepack。旧 B1 固定包不含后来新增的英文 README 和本轮安装说明；对外发行应使用上述当前源码重新生成的包，不能直接拿旧包替代。无需为文档变化重装日用桌面。

## 创建发行草稿

由维护者手动完成：

1. 在仓库 Releases 页面选择新建发行，先保存为 Draft。
2. 标签使用 `v1.2.0-dev.7`，目标选择准备好的提交；标题可用 `QiaoDoc v1.2.0-dev.7`。
3. 正文简述分屏阅读、选段交互、粘贴保存和文档历史，列出 Windows/rc.5 兼容范围、安装命令和 README 中的已知限制。测试写明本地 87 项通过、用户反馈基本合适，不宣称所有异常或全部环境均已验收。
4. 上传本轮生成的 tgz 与 SHA256SUMS，勾选 Pre-release；核对附件名称、版本及目标提交后再发布。
5. 发布后重新下载附件，核对 SHA-256；确认公开下载可用。实际安装效果由用户桌面体验验收，不因上传成功自动记为通过。

这些步骤不包含 npm 发布或市场投稿。README 链接使用 `/releases`，方便查看预发行。若已启用不可变发行，附件必须在发布前准备齐全，避免发布后无法替换。

官方流程：[GitHub 管理发行](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)。
