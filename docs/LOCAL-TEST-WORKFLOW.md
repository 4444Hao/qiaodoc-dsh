# 每次版本优化后的本地测试

适用：Windows、Node/npm、桌面版附带的 DSH 0.2.1-rc.5。全部命令在项目根目录运行。

## 首次准备

```powershell
cd D:\qiaomu-reader-dsh
npm ci
npm run dev:local
```

`dev:local` 会依次检查宿主版本、构建、运行全部测试、校验包、生成带内容哈希的 reader/模型桩包、安装到隔离 profile、比对实际安装的两个构建文件，最后在 `127.0.0.1:3087` 启动宿主。任一步失败就停止。该终端保持打开。

脚本先完整执行 `npm run check`，成功后用 `npm pack --ignore-scripts` 打包这份已验证构建，避免重复构建和生命周期输出混入 JSON；不是跳过检查。独立手动打包仍可使用正常 `npm pack`。

另开一个终端：

```powershell
cd D:\qiaomu-reader-dsh
npm run dev:browser
```

这会打开可见的独立 Edge 测试窗口，使用 `release/dev/local-browser`，调试端口为 9228。首次在这个窗口中完成欢迎页，通过原生“添加工作区”选择 **D:\qiaomu-reader-dsh\release\dev\workspace**，进入该目录的专用合成测试会话，并选择 **QMR test fixture → QMR deterministic test**。不要使用默认工作区或含私人材料的会话；粘贴回归会创建真实文件，脚本会核查会话缓存中的实际 cwd。

然后运行：

```powershell
npm run test:browser
```

脚本自动打开合成 PDF、Markdown 和 TXT，验证选段翻译/解释、重复点击、当前会话绑定、草稿保护、询问 AI、对话附件、格式分组，以及重载后的 PDF 页码和消息定位。粘贴回归还会在上述工作区的“粘贴文档”目录创建三个合成文本文件，验证 TXT 默认名称、Markdown 自定名称、同名不覆盖、保存不发送消息、刷新重开和选段翻译。测试会向当前测试会话追加消息；生成的文件留作检查，不自动清理。模型固定返回测试文字，不调用真实 provider，也不评估翻译质量。

跨会话返回用例需要隔离环境中另有一个已打开文档、完成过选段交互的测试会话。首次准备时可新建第二个合成测试会话，选择同一测试模型，打开样本并点击一次翻译，再回原测试会话运行脚本。缺少第二条有效历史时，报告会明确标记此用例为 skipped；不能当作完整的十三项通过。保持测试窗口可见，最小化可能影响原生编辑器的渲染时序。

## 之后每次修改

1. 保存代码，在运行测试宿主的终端按 **Ctrl+C**，等待退出。
2. 同一终端运行：

   ```powershell
   npm run dev:local
   ```

3. 测试浏览器仍开着时直接刷新，手动试用改动；已关闭则重新运行 `npm run dev:browser`。
4. 在另一终端运行：

   ```powershell
   npm run test:browser
   ```

`test:browser` 本身会刷新页面，核对源构建与安装摘要。无需每次重开浏览器、执行 `npm ci`、修改版本号或手动找 tgz。依赖或 lockfile 改变时再执行 `npm ci`。版本号改变也会自动使用 npm 返回的新包名。

## 可单独使用的命令

| 命令 | 用途 |
| --- | --- |
| `npm test` | 开发中快速跑自动测试；不构建、不安装 |
| `npm run dev:check` | 构建、全部测试、包校验并保存日志；不安装、不启动 |
| `npm run dev:prepare` | 完整检查、打包、隔离安装及摘要核对；不启动 |
| `npm run dev:local` | 完整检查到启动，日常推荐入口 |
| `npm run dev:browser` | 打开可见的独立测试浏览器，通常只需启动一次 |
| `npm run test:browser` | 对运行中的隔离版本做真实浏览器回归 |
| `npm run dev:desktop` | 检查、备份旧版、打包并更新日用桌面 reader；需重启应用 |
| `npm run dev:desktop:rollback` | 恢复上次更新前的 reader 包并启用；需重启应用 |

CLI 安装位置不同，可覆盖：

```powershell
npm run dev:local -- -DshCli 'E:\dsh-desktop\resources\runtime\cli\bin\dsh.cmd'
```

`dev:local` 等隔离测试命令固定使用项目内的 `DSH_HOME=release/dev/dsh-home` 和 Web profile。显式调用 `dev:desktop` / `dev:desktop:rollback` 会修改当前 Windows 用户的日用 `~/.dsh/profiles/desktop`。脚本退出时恢复环境变量，不改系统环境变量或全局执行策略。

## 在桌面 DSH 中体验

```powershell
cd D:\qiaomu-reader-dsh
npm run dev:desktop
```

这个命令使用桌面自带的 rc.5 CLI，完整检查通过后保存 profile 配置快照、将当前已安装的 reader 打成回退包，再安装新候选并核对哈希。它只安装 reader，不安装测试模型。对使用显式 `dsh.profile.bundles` 的 profile，还会将 reader 加入组合清单；仅 `pnpm add` 不足以确保加载。现有其他插件与模型配置不改。

安装成功后，手动完全退出桌面 DSH（包括托盘），再重新打开。宿主代码需要重启加载，刷新页面不等于重启。脚本不会强制结束进程，以免丢失输入中的草稿。

进入普通会话，点击顶部“打开原文”选择 PDF，在右栏选段测试解释、翻译、复制及询问 AI。桌面使用你原有的真实模型，解释/翻译会向当前会话发送任务；请自行选择测试材料和模型。“询问 AI”只插入引用，便于先核查来源和草稿。

`1.2.0-dev.1` 将旧“乔木阅读”主面板替换为“文档历史”。打开几个文件后查看格式分组，点击历史确认返回原对话、阅读位置与交互消息。旧书库不自动迁入；历史从本版开始登记，原有文档重新在对话侧栏打开一次即可登记。

`1.2.0-dev.2` 增加“打开原文 → 粘贴文字”：默认 TXT，可选 Markdown，文件名可改，保存到当前会话工作区的“粘贴文档”目录并在右栏打开。保存本身不调用模型；刷新后可从该会话的文件列表重开。

`1.2.0-dev.3` 修复首次历史写入等待期间滚动位置丢失，并增加首次打开后立即滚动的第十三项回归。此项会额外创建一份长 Markdown 合成样本；当前日用安装仍为 dev.2，运行更新命令前先确认需要更换候选。

回退上一轮安装前的 reader：

```powershell
npm run dev:desktop:rollback
```

然后同样完全退出并重新打开 DSH。回退只恢复 reader 版本，不整体还原 profile 配置、会话或书库。所有配置快照与回退包保存在 `~/.dsh/profiles/desktop/qiaomu-reader-backup-时间戳/`；最新操作指针为 `release/dev/reports/desktop-installation.json`，不要删除仍需回退的备份目录。

## 如何判断通过

- 自动检查：终端显示测试全部通过、包校验成功；当前基线为 101 项，后续以实际总数为准。
- 安装核对：终端显示 `Candidate installed in isolated profile`。
- 浏览器检查：终端列出各项通过结果，`actionExceptions` 为 0。失败退出码为非零。
- `startupExceptions` 单独记录冷启动异常。当前基线的两条偶发、可恢复初始化异常，原版 1.1.2 对照也能复现，详见维护记录；脚本只容许这两个已登记的异常标题，出现其他启动异常会失败。
- 最后手动检查本轮改动涉及的 UI、格式、真实模型质量；当前十三项浏览器回归覆盖 PDF 核心链路、Markdown/TXT 登记、历史往返、粘贴保存与首次滚动。专项异常和复杂文档结果见 [阶段验收报告](ACCEPTANCE-REPORT.md)，不包含在这十三项全部通过的表述中。HTML 渲染选段不支持 AI 菜单，完整宿主重启恢复未通过，保存中切换会话仍待验收。

报告都在 `release/dev/reports/`：

| 文件 | 内容 |
| --- | --- |
| `local-check-时间戳.log` | 每次完整自动检查输出 |
| `local-installation.json` | 最新候选包摘要、宿主版本和安装构建摘要 |
| `local-host.log` | 本次宿主启动输出，包含本地登录链接 |
| `p1-browser-smoke.json` / `p1-browser-smoke-failure.json` | 最近的成功或失败报告；两者可能同时存在，以本次命令结果与时间为准 |
| `local-browser-时间戳/` | 每轮浏览器报告与截图快照 |

报告包含选段、路径或本地登录信息，整个 `release/` 已被 Git 忽略，不提交这些日志。

端口 3087 已占用时，安装流程会退出，不会自动结束进程。先在原测试宿主终端按 Ctrl+C。端口 9228 占用时，若测试浏览器已打开，直接使用它并运行 `test:browser` 即可。`DSH_WORKSPACE` 仅设置插件书库目录，原生会话工作区需在界面中选择；测试桩不执行模型工具。

工作流实现：[scripts/local-test.ps1](../scripts/local-test.ps1)。接口与环境细节见 [Windows 开发说明](WINDOWS-DEVELOPMENT.md)，每轮版本结果记录在 [维护记录](MAINTENANCE.md)。
