# Windows 开发与隔离验证

更新日期：2026-11-01。本地 fork 原型说明；正式交付范围见维护记录。

当前源码版本 `1.2.0-dev.2` 增加粘贴 TXT/Markdown：通过已有会话 header 的 cwd 写入 `粘贴文档/`，不使用 `DSH_WORKSPACE` 指定的书库位置。完整回归需选择项目内 `release/dev/workspace` 为原生测试会话工作区；101 项自动测试、12 项隔离浏览器回归结果见维护记录。下文旧版安装条目保留当时状态，最新日用候选以维护记录和 `desktop-installation.json` 为准。

日常使用优先参照 [每轮本地测试工作流](LOCAL-TEST-WORKFLOW.md)：`npm run dev:local` → `npm run dev:browser` → `npm run test:browser`。下文保留接口边界与底层准备方法；新工作流使用可见 Edge、端口 9228，原手动无头方案使用 9227。

## 版本与安装

| 项目 | 当前值 |
| --- | --- |
| 仓库及基线 | `4444Hao/qiaomu-reader-dsh`，`D:\qiaomu-reader-dsh`；`b549874` / 1.1.2 |
| 目标宿主 | Windows 桌面版自带 DSH 0.2.1-rc.5 |
| CLI | `D:\dsh-desktop\resources\runtime\cli\bin\dsh.cmd` |
| PATH 中的 CLI | 0.1.0-rc.6，未使用、未升级 |
| Node / npm / Python | 24.14.0 / 11.9.0 / 3.11.4 |
| 浏览器验证 | 独立无头 Edge 156.0.4314.50；1440 × 1000 |
| 依赖 | 沿用现有依赖；未新增 Playwright、React 或外部 DSH 客户端包 |

日用 `%USERPROFILE%\.dsh\profiles\desktop\node_modules\qiaomu-reader-dsh` 已从指向源码的 Junction 切换为独立安装。2026-11-01 已更新至粘贴原文开发版 `1.2.0-dev.2`，启用 reader bundle，安装构建与十二项隔离浏览器回归的摘要一致，未安装模型桩。上一版 `1.2.0-dev.1` 包与配置保存在 `qiaomu-reader-backup-20261101-145612-457`；未自动重启日用应用，桌面效果待手动重启验收。更新/回退命令分别为 `npm run dev:desktop`、`npm run dev:desktop:rollback`，详见测试工作流及维护记录。

配置备份分别为该 profile 中的 `qiaomu-install-backup-20261031-201218` 与 `qiaomu-isolation-backup-20261031`。配置备份不等于书库或会话备份，不提交到仓库。安装成功还需同时检查包声明、真实路径与构建摘要。

## 本地目录与技能

Git 忽略的 `release/dev/` 存放 `baseline/`、`candidate/`、`dsh-home/`、`workspace/`、`browser/`、`reports/` 与目标版本接口核查副本。合成样本源文件在 `test/fixtures/conversation-reader/`。不复制日用账号、凭据或真实附件。

项目技能固定为 `oh-my-dsh/dsh-plugin-upgrade-skill` 提交 `92afb64abf71f36a4bbd991ac9a29ad39a265db9` 的 `plugin-runtime-debug`、`plugin-test`，安装在 `.agents/skills/`。`skills-lock.json` 记录 11 个文件的 SHA-256 和 MIT 许可。清单为本项目手工维护，升级须重新核验来源及摘要。技能指导不能替代目标 rc.5 的真实接口证据。

**隔离边界：** `DSH_HOME` 隔离 profile、会话和附件；本插件的 `DSH_WORKSPACE` 指定阅读书库根目录，并不会改变 DSH 原生会话的 cwd。当前测试会话的 cwd 仍为默认工作区。测试仅上传合成样本并调用不会执行工具的固定回复模型，未使用真实模型访问该目录。后续涉及模型工具执行前，须在原生界面选择专用的 `release/dev/workspace` 工作区。独立 Web profile 不能代替桌面日用版最终验收。

## 构建和候选包

```powershell
npm ci
npm run check
npm pack --pack-destination release/dev/candidate --json
```

Windows `execFileSync('npm')` 的 ENOENT 已修复：优先通过 Node 调用 npm 的 JS 入口，保留非 Windows 回退。`check` 包含构建、测试和 dry-run 打包检查，正常 pack 执行 prepack。受限执行环境中部分既有落盘测试会发生 EPERM rename；应保留失败记录，并在有权写临时目录的环境重跑，不能修改断言掩盖。

**pnpm 缓存：** 同版本 tgz 覆盖到相同路径后，重新安装可能继续使用缓存。每次候选应复制为包含新 SHA-256 前缀的唯一文件名，再传给 `dsh plugin add`；安装后比较根目录与安装目录的 `index.js`、`client.js` 哈希。不要只核对版本号。

`client.js`、`index.js` 由构建生成。`src/client/ui` 是原仓库 Git symlink，Windows 可能检出成文本；实际入口使用 `../ui`，不擅自替换它。

## 隔离宿主与固定回复模型

在项目根目录的独立 PowerShell 终端准备环境：

```powershell
$dshCli = 'D:\dsh-desktop\resources\runtime\cli\bin\dsh.cmd'
$env:DSH_HOME = Join-Path (Get-Location) 'release/dev/dsh-home'
$env:DSH_WORKSPACE = Join-Path (Get-Location) 'release/dev/workspace'
$env:QMR_SMOKE_LOG = Join-Path (Get-Location) 'release/dev/reports/model-requests.jsonl'
npm pack ./test/fixtures/dsh-document-model --ignore-scripts --pack-destination release/dev/candidate
```

将 reader 候选与模型桩 tgz 分别复制为含内容哈希的唯一文件名，然后用对应的绝对路径执行 `& $dshCli plugin --profile web add <reader-candidate.tgz> <model-fixture.tgz>`。确认退出码为 0 后启动：

```powershell
& $dshCli --profile web --host 127.0.0.1 --port 3087 --no-open
```

模型桩源码位于 `test/fixtures/dsh-document-model/`，仅测试传输。**不安装到日用 profile。** 在隔离界面中选 `QMR test fixture` 下的 `QMR deterministic test`。它记录收到的用户文本，固定返回 `QMR_SMOKE_REPLY`，不调用真实 provider、不执行工具、不评估翻译或解释质量。日志可能包含选段和系统上下文，只保存于被忽略的报告目录。

在单独的浏览器用户目录启动无头 Edge：

```powershell
Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=9227',
  "--user-data-dir=$((Join-Path (Get-Location) 'release/dev/browser'))",
  '--no-first-run', '--no-default-browser-check', 'about:blank'
)
```

用宿主正常输出的启动链接进入隔离页；链接含登录令牌，不提交或贴入公开报告。完成欢迎页，在合成测试会话中选择模型，并通过顶部“打开原文”打开样本 `sample.pdf`。可用 CDP `Page.navigate` 正常导航到启动链接；无需读取凭据或构造认证 cookie。

接着运行：

```powershell
node scripts/smoke-document-reader.mjs
```

脚本只连接本机 CDP 和 `127.0.0.1:3087`，核对安装构建摘要与模型桩，拒绝清空任意非测试草稿。它在真实宿主验证工作区 PDF、连续解释/翻译、同一会话、防重复点击、草稿保护、询问 AI，以及原生上传 PDF 后的附件读取和入库预览。新增文档历史回归覆盖 Markdown/TXT 登记、重载后 PDF/消息定位和两个已有会话往返的草稿保护；后一项缺少第二个测试会话历史时明确跳过。报告与截图写入 `release/dev/reports/`，分别记录启动异常和交互异常。成功报告不代表未覆盖条件或模型实际质量通过。

## 接口约束与回退

- 普通文件不能调用 `session.readAttachment`，该 API 只处理图片。新宿主方法从 `sessionQuery` 的 `user/message` 获取真实引用，再用 `attachments.readFileStream` 校验内容后沿用入库 API；不接受客户端提供的路径或元数据来证明归属。
- 附件阅读入口暂支持 PDF/TXT/Markdown/HTML，限制 64 MiB。本轮不提供 EPUB 主界面入口，旧解析后端保留。原生右栏标签目前显示内部副本文件名，发送引用时使用原文件显示名称。
- 选区容器、页码、文字层使用 rc.5 的 `data-*` 属性；生命周期和目标有效性使用原生接口。其他 rc 版本虽在原包 engines 中，尚未验收新增功能。
- 新 Remote 的宿主注册和客户端描述符共用 `src/core/reader-remotes.js`，避免只更新一端。
- 回退先停止相应隔离宿主，用同一 CLI 安装保留基线包，再核对真实路径并冷启动。不递归删除 profile、会话或书库。
- `1.2.0-dev.1` 增加独立 `document-history.json` v1，按会话与来源路径关联位置和消息锚点。旧 library/state schema 不变、不自动回填旧历史。回退旧 reader 时历史文件保留但旧版不读取。

每轮交接记录源码基线、候选摘要、真实安装路径、宿主与浏览器版本、检查结果和未覆盖边界，见 [维护记录](MAINTENANCE.md)。
