# 维护记录

## 2026-11-01：QiaoDoc 独立仓库与固定验收候选

迁移目标为 `https://github.com/4444Hao/qiaodoc-dsh`，迁移前已核实其为公开、空白、非 Fork 仓库。本次保留 `.git` 和上游 `b549874` 之前的全部历史，将当前功能固定为 `1.2.0-dev.2`，使用不可覆盖的验收标签 `acceptance-1.2.0-dev.2`；具体范围、构建摘要及桌面验收清单见 `ACCEPTANCE-CANDIDATE.md`。

项目名称为“乔豆文解 / QiaoDoc”，更新 README、repository/homepage/issues 和目录资料草稿，明确独立维护与修改日期；保留原 GPL-3.0-only、版权和第三方声明。内部包名、Remote 标识、版本和运行时源码不变，不为迁移重装日用桌面。新增忽略本地 agent 工具目录、profile 与粘贴文档；公开维护记录中的个人目录泛化为 `%USERPROFILE%`。既有本地项目目录名保持不变。

旧 Git 历史和远程配置先备份到被忽略的 `release/dev/migration/`。提交仅包含源码、构建、合成样本与维护资料；测试 profile、日志、账号和私人文档不进入提交。不使用强制推送或 mirror 推送，也不向旧 Fork 推送修改；新仓库设为后续默认 origin，旧 Fork 保留为 legacy-fork。

迁移前重新执行 `npm run check`：101 项通过、0 失败、0 跳过，16 文件包校验通过，`git diff --check` 通过。宿主与客户端构建 SHA-256 均与固定候选一致；待提交文件经常见凭据模式检查未发现命中。暂存检查发现纯文本编码的合成 PDF 被 Git 当作文本处理，已通过 `.gitattributes` 将 PDF/EPUB 标记为二进制，避免 Windows CRLF 转换破坏 PDF 字节偏移；不修改样本内容。检查日志留在本地 `release/dev/reports/migration-check.log`。

本条记录迁移约定与变更范围；实际提交、标签及推送状态以 Git 引用和目标仓库为准。GitHub 源码迁移不等于稳定版、npm 或市场发布；桌面验收状态仍为待用户签收。

迁移结果：代码提交 `d3bc996368b4f7fec11536bd15e48e0ee4ae2bf8` 和带注释标签 `acceptance-1.2.0-dev.2` 已推送至新仓库，并通过远程引用核对，标签解析到该代码提交。首次 GitHub CI [41284126983](https://github.com/4444Hao/qiaodoc-dsh/actions/runs/41284126983) 已完成且成功。新仓库 `fork=false`、默认分支 `main`；本地 `main` 跟踪 `origin/main`，旧地址保留为 `legacy-fork`。该验收标签不因后续文档维护提交而移动。

## 2026-11-01：粘贴文字生成原文（1.2.0-dev.2）

新增“打开原文 → 粘贴文字”，提供内容输入、自动建议文件名、保存前改名、TXT/Markdown 和“保存并打开”。文件以 UTF-8 写入当前会话实际工作区的 `粘贴文档/` 子目录，保存后在原生右栏打开并沿用历史登记。当前会话文件列表合并已成功打开的历史，刷新后仍能重开粘贴文件。不发送消息、不创建会话、不改变原生聊天草稿。

命名取首个非空行的前 24 个字符及本地时间，去掉 Windows 禁用字符；TXT 为默认，Markdown 显式选择。重名以 `_2`、`_3` 递增，独占创建、不覆盖。内容上限 2 MiB，宿主再次校验；不请求系统剪贴板读取权限，不自动整理、翻译或调用模型命名。界面保留失败输入；保存后打开失败会显示已保存的路径，同一表单重试复用已保存文件。

技术实现：`src/core/pasted-document.js` 共用命名规则；`src/host/pasted-document.js` 从 `sessionQuery.observeSession` header 取得 cwd，不接受客户端目标路径，校验绝对路径和真实子目录后独占写入并释放观察；新增 Remote `createPastedDocument`。会话关联复用历史 `sessionId + 来源路径`，不增加另一份索引，不伪造附件消息。没有新增依赖或改旧 library/state schema。

### 验证

- `npm run dev:local`：构建、101 项自动测试（0 失败、0 跳过）、16 文件包校验、隔离安装与宿主/客户端摘要全部通过。新增 5 项测试覆盖命名与 Windows 禁用名称、精确 UTF-8 内容与实际 cwd、并发同名不覆盖、空白/超限/非法请求不落盘及子目录重定向拒绝。
- 真实 DSH rc.5、独立无头 Edge 9227，1440 × 1000：12 项浏览器回归全部通过，0 跳过、0 启动异常、0 操作异常。原九项继续通过；新增 TXT 默认命名及双击只保存一次、Markdown 自定名称与同名后缀、原草稿和模型请求数保留、刷新后从当前对话列表重开、选段翻译只发送一次且引用名称/sessionId 正确。
- 粘贴前确认原生测试会话 cwd 为 `D:\qiaomu-reader-dsh\release\dev\workspace`。通过 rc.5 公开目录选择桥接钩子提供这一路径以准备原生工作区，不模拟文件保存、会话读取或右栏渲染；实际新会话为 `session-12fa3e19-d925-464e-8764-fe5d68377f2e`。合成文件保留在该工作区“粘贴文档”目录，未向日常默认工作区写入这些材料。
- 隔离包 `qiaomu-reader-dsh-1.2.0-dev.2-8e3efa15207f.tgz`，SHA-256 `8e3efa15207faca9cdd29b0a991e81aa9061e34d3d528e982b48562f037e5fa5`。证据为本地 `release/dev/reports/paste-local.log`、`local-installation.json`、`p1-browser-smoke.json`、`p1-paste-markdown.png`。

### 边界与交付

只在专用输入区接收用户粘贴，不拦截聊天输入框 Ctrl+V。浏览器 textarea 可能规范化换行，保存的是该输入区的文字，不保存网页富文本。未保存表单刷新/切换会话可能丢失。保存中切换会话的目标检查、打开失败路径提示、权限拒绝和网络中断尚未做浏览器验收；已有旧版未覆盖项继续有效。没有验证真实模型质量。

曾因工具额度导致自动审批未完成，一次后续只读检查未执行；用户继续后已通过正常审批恢复，无绕过。

### 桌面安装结果

`npm run dev:desktop` 完成，重新通过 101 项自动测试及包校验，实际安装版本已确认为 `1.2.0-dev.2`，reader bundle 已启用，日用 profile 中未安装固定回复模型。最终候选 `qiaomu-reader-dsh-1.2.0-dev.2-a9207c2324c3.tgz`，SHA-256 `a9207c2324c3bad71f2f12eddd24c72204b152e0b146f484766d6ed40b9a51d8`；相对隔离候选仅更新 README，两个构建摘要与浏览器验收包一致：宿主 `948068f66d6b096bb684e6eab7c33f7d0310140c0db2fe4426d231b4bc4d332e`，客户端 `948a9a33bc4a45be226d2c7157b1bf86eeca210db0ab75c3c258c3519ba39b7e`。

旧 `1.2.0-dev.1` 回退包与配置快照保存在 `%USERPROFILE%\.dsh\profiles\desktop\qiaomu-reader-backup-20261101-145612-457`，回退命令仍为 `npm run dev:desktop:rollback`。本地报告 `release/dev/reports/desktop-installation.json`，日志 `paste-desktop-install.log`。状态 **installed-restart-required**：未结束日用桌面进程，需用户保存草稿、完全退出（包括托盘）并重开。桌面实际界面和真实模型质量待用户验收。

`git diff --check` 通过。收尾检查时 3087 无隔离宿主运行，未结束任何进程。工作区未提交、未推送。

## 2026-11-01：文档历史精简（1.2.0-dev.1）

本轮按最新需求收窄产品：原“乔木阅读”主面板改为“文档历史”，仅展示对话中成功打开的文档，按实际存在的格式分类。移除书籍导入、找书、封面和阅读状态筛选，以及从书籍新建/延续伴读会话的界面路径；原书库、笔记和旧会话数据不删除。当前原生对话右侧阅读和选段 AI 操作保持其行为，只补充历史登记与位置记录。

历史一条记录对应“已有会话 + 文档来源”，不因文件相同而把不同会话合并。点击返回原有会话，重新打开原文并恢复位置；会话或文件失效时提示，不自动新建。新索引与旧书库 schema 分离。原文位置与聊天消息锚点分别保存；精确消息定位使用 rc.5 已加载聊天节点及公开的历史加载方法，并记录边界。

此前“双入口、从书籍开启讨论”的计划在本轮取消；不再作为待交付功能。现已完成：客户端入口与主面板精简、独立历史索引、成功打开登记、PDF/滚动位置记录、交互消息锚点及返回已有会话。版本、插件卡片和中英名称统一为 `1.2.0-dev.1` / 文档历史。旧功能源码及宿主兼容接口保留，客户端不再注册独立伴读路径；本轮没有删除旧书库、笔记或会话。

### 验证结果

- `npm run dev:local`：构建、96 项测试（0 失败、0 跳过）、16 文件包校验、隔离安装与两个构建摘要全部通过。新增测试验证按会话/来源去重、位置独立、非法更新不变更旧索引、六个并发写入、重启持久化及损坏索引保留。
- 真实 DSH rc.5 + 无头 Edge 9227，1440 × 1000：九项浏览器回归全部通过，0 跳过、0 文档操作异常。包括原 PDF 六项链路、Markdown/TXT 独立格式登记、完整页面重载后恢复正确 PDF 页码和交互消息、两个已有会话往返并保留原草稿；历史返回不新增模型请求。
- 冷启动记录了原版也能复现的两条异常标题：`session-maybe` adapter 未安装、`conversation.input: sessions service unavailable`。仅这两条已有对照的初始化异常被容许，其他异常会使脚本失败；不能记作零启动异常。
- 本地证据：`release/dev/reports/p1-browser-smoke.json`、`p1-history-list.png`、`p1-history-return.png`、`local-installation.json`、`history-local-ready.log`。名称沿用原 smoke 脚本；以报告时间和当前候选摘要为准。仅使用合成材料与固定回复模型，无真实模型质量结论。

### 实测修复与边界

原生 Markdown 成功标志为 `data-document-markdown`，现已按 rc.5 实际渲染登记；TXT 使用原生代码内容滚动容器。PDF 使用可见面积最大的页及有符号页内偏移，避免页边残留误判；等待原生渲染/滚动恢复稳定后回放，用户滚动优先。跨会话时等待选中会话和其 React store 就绪，只对原生“面板尚未挂载”拒绝短暂重试。卸载后使用最后一次有效位置，不读取已分离 DOM 产生的零位置。

尚未做真实删除/归档会话、源文件删除、失效消息提示、HTML、复杂长文档/缩放变化与手机布局验收；对应预检或提示代码不能代替真实界面测试。不同来源路径即使内容相同仍分开记录；同一来源在不同对话独立记录。历史从本版开始登记，不扫描旧聊天补造打开记录。

### 桌面安装

`npm run dev:desktop` 已完成，同样通过 96 项检查及包校验。候选为 `qiaomu-reader-dsh-1.2.0-dev.1-f8e12dd99766.tgz`，SHA-256 `f8e12dd9976628edb1cb3dfa3786f810329ddf00e581cbd0ff73ba694ce9b097`。与隔离验收包相比仅补齐插件卡片中英名称/描述；宿主摘要 `de145f45cd3155a6ad80e8acc5123afafd4c32bbbde593f35c7937e0c3f802ad`、客户端摘要 `00255d243045fe5c0c9b0f038d7560a0d2c28dd92f4cad251c803f3922418cf3` 均与验收构建一致。

安装到 `%USERPROFILE%\.dsh\profiles\desktop`，reader bundle 已启用且固定回复模型不存在。旧 P1 reader（1.1.2）回退包和配置快照在 `%USERPROFILE%\.dsh\profiles\desktop\qiaomu-reader-backup-20261101-101830-535`；回退命令 `npm run dev:desktop:rollback`。安装报告 `release/dev/reports/desktop-installation.json`，执行日志 `history-desktop-install.log`。

当前状态 **installed-restart-required**：未强制关闭日用应用，需保存草稿并完全退出（包括托盘）后重新打开。桌面新界面及真实模型质量仍待用户验收；不要把隔离浏览器通过记作日用桌面已验收。工作区未提交、未推送。

收尾：`git diff --check` 通过；仅停止本轮 3087 隔离测试宿主，确认端口可供下一次 `npm run dev:local` 使用。日用桌面进程未动。

## 2026-11-01：按用户要求更新桌面试用版

新增 `npm run dev:desktop` 和 `npm run dev:desktop:rollback`，对应 `scripts/install-desktop.ps1`。使用桌面自带的 DSH 0.2.1-rc.5，不升级或使用 PATH 中旧的全局 CLI。完整检查 93 项通过后，只将 reader 候选安装到日用 desktop profile；未安装固定回复模型，未关闭应用或发送真实模型请求。

桌面安装包为 `qiaomu-reader-dsh-1.1.2-c2f5c4f23470.tgz`，SHA-256 `c2f5c4f23470164945feac1a65d819e7587b41c7eddf59639a2a63fd057e6675`。`index.js` 和 `client.js` 与源码构建哈希一致，安装目录不是源码链接。配置快照与旧版回退包保存在 `%USERPROFILE%\.dsh\profiles\desktop\qiaomu-reader-backup-20261101-090918-207`。安装记录为本地 `release/dev/reports/desktop-installation.json`，退出码为 0。

发现并处理：CLI 的 plugin add 是 pnpm 安装入口，已有 desktop 显式 bundle 清单中缺少 reader。仅更新依赖仍不会组合其 patch；已保留其他条目并加入 `qiaomu-reader-dsh`，二次核查已启用且没有模型桩。此步骤固化在 `scripts/lib/enable-desktop-reader.mjs`，更新和回退均调用它。

状态为 **installed-restart-required**。需用户保存草稿、完全退出（包括托盘）后重新打开桌面应用，再验收可见效果；不能把安装和哈希一致记成桌面 UI 或真实模型质量已通过。回退命令已提供，尚未为测试而实际切回旧版。原有阶段条目保留其当时状态。

## 2026-11-01：每轮本地命令行工作流

新增 `scripts/local-test.ps1` 与五个 npm 入口：`dev:check`、`dev:prepare`、`dev:local`、`dev:browser`、`test:browser`。操作说明见 [每轮本地测试工作流](LOCAL-TEST-WORKFLOW.md)。

- `dev:local` 自动执行完整检查、reader/模型桩唯一哈希打包、隔离安装、两个构建摘要核对及前台启动；不改日用安装。打包使用已完成 check 的构建，不重复运行 prepack。
- 可见 Edge 使用独立 `local-browser` 目录和 9228 端口，与旧无头 9227 区分；正常启动链接仅从测试宿主日志读取。
- 浏览器测试按时间保存当轮报告和截图快照，不混入旧失败报告；每轮记录退出码。仅容许已经对照登记的两个启动异常标题，新启动异常与任意文档操作异常会失败。
- PowerShell 5 的正常 native stderr 不再造成错误中止，依据退出码判断；SHA-256 使用 .NET 实现，不依赖环境中可能缺失的 Get-FileHash cmdlet。

实测：完整 `dev:local` 成功（93 项自动测试、包校验、安装和摘要比对通过）；`dev:browser` 成功打开独立可见窗口；`test:browser` 六项链路通过，启动/操作异常均为 0，快照为本地 `release/dev/reports/local-browser-20261101-090332-050/`。另验证了 3087 占用时流程返回非零、不结束进程。执行日志见 `workflow-prepare.log`、`workflow-local.log` 及各轮 check 日志。验证结束后确认 9228 窗口已关闭，并停止本轮 3087 隔离宿主，端口留给用户运行；旧 9227 环境不动。本轮未改产品功能、未更新日用安装。

## 2026-11-01：P1 原生会话与原文原型

状态：原型已在隔离的真实 DSH 0.2.1-rc.5 跑通，尚未交付到日用安装。源码基线仍为 `b549874`；工作区改动未提交、未推送。P2–P4 保持未完成。

### 可见行为与实现

- 会话顶部新增“打开原文”，支持工作区路径、本地文档及当前已加载消息中的文档列表；左侧继续使用 DSH 原生对话，右侧使用原生预览。
- 原文选段显示解释、翻译、复制、询问 AI。解释/翻译经原生输入动作提交当前会话；询问 AI 在草稿末尾追加完整引用及来源，不自动发送，即使原草稿被全选也不替换它。
- 快捷发送检查会话与原生目标有效性、输入阶段、生成状态、草稿、附件、引用及 draftRev；等待实际编辑器草稿发布后再提交。既有动作在会话/文档失效时不能改投其他会话。新流程没有创建会话的调用。
- 普通文件通过新的宿主 Remote 读取：从所属会话日志找真实文件引用，消费附件存储的校验流，完整成功后沿用现有内容 ID 入库。未引用、损坏、不完整或超限文件不写入书库。
- 宿主 Remote 注册与客户端描述符共用一份方法表。Windows 打包检查改为通过 Node 调用 npm JS 入口，修复 ENOENT。

关键源码：`src/client/document-reader.js`、`src/core/document-task.js`、`src/host/session-document.js`。新增依赖为零，原书库及伴读功能保留，未改变存储 schema。

### 验证证据

| 项目 | 结果及边界 |
| --- | --- |
| 完整 `npm run check` | 93 通过，0 失败、0 跳过；包含构建及包校验；完整本机权限环境执行 |
| 受限执行 | 既有宿主落盘测试发生 EPERM rename，失败日志保留；不是通过跳过测试处理 |
| 打包 | 正常 prepack + 包校验；使用含哈希的唯一 tgz 路径安装，避免 pnpm 同路径缓存 |
| 最终候选 | `release/dev/candidate/qiaomu-reader-dsh-1.1.2-a238d0929582.tgz`；SHA-256 `a238d09295821854449ba6a3092ee0c9af29145df8e44009411b692ca28c6a62`；宿主及客户端均与当前构建摘要一致 |
| 真实运行时 | Windows 桌面版所带 CLI，隔离 Web profile；独立 Edge 156.0.4314.50，1440 × 1000 |
| PDF 与会话 | 工作区样本打开不调用模型；连续翻译和解释、各自重复点击，均只新增一条请求并保留 sessionId 和原文地址 |
| 草稿保护 | 已有草稿时快捷任务提示并保留；询问 AI 追加完整选段/来源且请求数不变 |
| 对话附件 | 原生上传合成 PDF → 发送 → 顶部文件列表 → 读取并入库 → 同一会话右栏展示；入库后引用仍含 `sample.pdf · PDF 1` |
| 单测边界 | 覆盖会话切换、输入 CAS、附件/引用/忙碌保护、日志归属与流校验；不以这些单测代替浏览器验收 |
| 模型边界 | 仅使用仓库内固定回复模型桩，核查实际收到的文本；未验证真实模型解读质量，也未调用付费模型 |
| 日用环境 | 已解除指向源码的 Junction，保留独立原 1.1.2 副本；未安装本轮原型、未重启日用桌面应用 |

本地证据（被 Git 忽略）：`release/dev/reports/p1-check-full.log`、`p1-pack.json`、`p1-installation.json`、`p1-browser-smoke.json`、`p1-attachment-selection.png`、`p1-draft-protection.png`。安装报告记录候选包、两个构建摘要与真实路径；浏览器报告记录版本、sessionId 及各项断言。复现脚本为 `scripts/smoke-document-reader.mjs`，环境步骤见 `WINDOWS-DEVELOPMENT.md`。报告仅适用于本机运行，不能推断桌面、手机或其他 rc 版本全部通过。

### 发现、修复与剩余问题

1. rc.5 的 `session.readAttachment` 只读取图片，PDF 会返回 `Image is not referenced by this session`。已改用宿主正式附件流接口；未猜测附件存储路径。
2. `conversation.activeTargets` 表示激活视图，不表示生成中。错误使用会阻止首次回答后的继续提问，已改用会话的 running 状态并在真实宿主连续发送验证。
3. 覆盖相同路径的同版本 tgz 会命中旧代码缓存。已改为唯一哈希文件名，并比对宿主与客户端构建摘要。
4. 部分冷启动记录到 `session-maybe ... without an installed adapter` 和 `conversation.input: sessions service unavailable` 两条初始化异常，界面随后恢复，文档动作阶段无异常。同一隔离 profile 临时安装保留的原 1.1.2（确认新入口不存在）后，同样复现两条异常，见 `startup-baseline.json`；随后已恢复候选。旧版对照证明并非仅新原型出现，具体底层原因尚未定位，不能声称已修复。
5. 原生文件卡片目前是非交互内容，无公开文件点击扩展口。当前入口是顶部文件列表，尚未达到“直接点击原卡片”的最终交互；不复制宿主消息渲染器来实现。
6. 当前右栏标签显示内容 ID 副本文件名，发送引用已映射为书库显示名称。文件名美化、文档改名、多对多关联、引用返回原文及按会话恢复位置留到 P2。
7. 工作区路径入口直接预览，尚未自动入库；附件与本地导入保存副本。附件入口暂支持 PDF/TXT/Markdown/HTML，64 MiB；真实浏览器本轮验证了 PDF，其他格式新右栏尚未全验收，EPUB 沿用旧阅读器。
8. `DSH_WORKSPACE` 只影响本插件书库，未改变原生会话 cwd。测试仅使用合成文件和无工具调用的模型桩；涉及真实模型工具前需要选择专用原生工作区。
9. 新原型只在 rc.5 隔离 Web profile 验证，尚未回归 rc.2–rc.4、真实手机、扫描件、复杂多栏 PDF、超大文件、断网重连或日用安装回退。

### 下阶段顺序

P2 先冻结“文档内容 ID ↔ 原生 sessionId”的多对多关系和进度恢复约定，再统一“从书库继续会话”入口；保留一个文件一条记录，不把同一会话的多个文件合并成一本书。随后接显示改名、原文回跳与 EPUB。P3 才做主界面减法；P4 再更新日用安装。

## 2026-10-31：对话与原文改造前置准备

状态：准备文档与验证基线；新功能尚未实现。

### 本轮完成

- 整理双入口同界面、会话/文档多对多关联和选区操作的目标，见 `CONVERSATION-READER-PLAN.md`。
- 新增 Windows 开发说明、文档索引和合成 PDF/EPUB/文本样本。
- 为后续技能与环境准备保存精确来源和可复核结果；安装清单见根目录 `skills-lock.json`。
- 准备被忽略的隔离目录、基线包与报告目录；未启动隔离宿主。
- 更新 README、贡献指南及历史架构文档入口，区分规划与已交付功能。

### 验证与发现

| 项目 | 结果 |
| --- | --- |
| 目标桌面 CLI | 0.2.1-rc.5；PATH 全局 CLI 仍为 0.1.0-rc.6 |
| `npm test` | 84 通过，0 失败、0 跳过 |
| 新增样本 | PDF 两页、EPUB 两章及 MD/TXT 经现有解析器验证；PDF 两页已渲染并目视检查 |
| 文档链接 | 检查本轮维护文档中的 18 个本地链接，无失效链接 |
| 项目技能 | 两项技能共 11 个文件与固定上游提交逐字节一致，许可证和 SHA-256 清单已保存 |
| `node scripts/verify-package.mjs` | 失败：`spawnSync npm ENOENT`，已登记后续修复 |
| 日用安装 | package.json 是 file:tgz，但实际目录仍 Junction 到源码；未修改日用安装 |
| 构建产物 | 本轮不生成；开始时 Git 标记修改，实际文本 diff 为空 |
| 新 UI 与 AI 回答 | 未执行；不能根据文档或单测标记通过 |

本轮准备结果及摘要保存在本地 `release/dev/reports/preparation.json`；该目录不提交。样本只包含自拟内容，不含用户附件或真实论文。

### 下一轮入口

1. 先解决日用 Junction 与开发改动的隔离，确认安装真实路径。
2. 根据精确 rc.5 实现核查会话附件和工作区文件的两条入口。
3. 实现最小右栏原型，准确绑定所属会话，验证 PDF 选区与页码。
4. 再接解释/翻译和草稿保护，记录完整一次交互的证据。
5. 修复 Windows 包校验调用后再将完整 `npm run check` 记为通过。

后续每轮在顶部追加日期条目；保留历史结论及其适用范围，不直接覆盖为“全部通过”。
