# Obsidian Reader → DeepSeek Harness 阅读流程

> 历史归档（2026-11-02）：保留上游阶段的版本、环境与结论，不代表当前 QiaoDoc 功能或安装步骤。当前资料见 [维护文档](../README.md)，历史路径说明见 [归档索引](README.md)。

## 2026-10-27 稳定版差异适配：1.1.0 第一阶段本地候选

比对基线：原版稳定提交 `4a6e6ee1e39966f2af5d831df8b3f4c4fd387ca3`（4.9.2）；仅用 Git 对象读取，未修改原版工作区，也未混入其未提交的 AI 登录改动。DSH 起点 1.0.4、60 项测试；初次开发目录没有 `.git`；现已核对已有远端 `joeseesun/qiaomu-reader-dsh`，在独立检出上整合其 CI、发布元数据及许可证。回退源码快照：`/tmp/qiaomu-reader-dsh-before-adaptation-20261027.tgz`，此前安装包 `/tmp/qiaomu-reader-dsh-1.0.4.tgz`。

本轮完成 P0 及核心 P1 阅读链路，不表示原版全部功能已迁移。本地开发候选曾保存在原工作目录 `release/`；公开包通过此仓库的 PR、CI 与 v1.1.0 Release 交付，远端发布结果以该 Release 的公开资产和校验值为准。未提交新市场条目。

| 差异 | 1.1.0 实现 | 验收与剩余范围 |
| --- | --- | --- |
| 书库移除保数据、撤销 | Host/Client 都改为归档，保留文件、进度、划线、生词、笔记；恢复/重导入；库级串行读改写；损坏 JSON 不覆盖 | 原版基线的三个回归用例实际失败，新版通过；真实界面移除→页面重开→恢复后进度和生词仍在，回跳可用。并发 12 本导入、磁盘失败、离线归档迁移及宿主重启由集成测试覆盖 |
| Markdown/HTML、文本编码、章节识别 | Marked GFM + parse5 白名单；UTF-8/UTF-16 BOM/GB18030；按标题分章，Host/Client/Agent 共用；历史 TXT 保持 layout=1，避免旧坐标漂移 | GFM 表格/任务项真实显示；恶意 HTML、编码、章节与 Agent 文本一致性测试通过。仅保留安全排版，不保证原网页样式或本地图片路径 |
| 连续朗读、保存位置、跟随/回到 | 浏览器语音 + macOS Host `/usr/bin/say`；音色、速度、跨章、暂停/继续、当前位置启动、跟随和回到朗读处 | 真实 DSH 枚举 186 个 Mac 音色，观察到真实 Audio playing/ended/pause；从第一章跨入第二章、Host 文件保存句子位置。错误、空章、取消和恢复单测通过。Windows/Linux 原生、云端与本地模型 TTS 引擎仍待第二阶段适配 |
| 查词翻译、生词本、Markdown/Anki | 就近查词卡开独立原生会话，保留 DSH 模型/授权；完成回答投影提取；可编辑释义；生词上下文、划线回跳、自动笔记与 Markdown 导出；可选 AnkiConnect | 实际选词、原生会话草稿、手填释义保存、导出文件、回跳与恢复验证通过。隔离 profile 未配置模型，实际 AI 回答未验收；Anki 去重/HTML 转义协议测试通过，未向真实 Anki 写卡 |
| 找书下载与大书库 | Gutenberg OPDS 搜索、同源下载、体积/ZIP/EPUB 校验、已拥有标记；内容 hash 去重与元数据保留；离线 ID 别名迁移；80px 行窗口 + ID 索引 | 真实搜索 Alice、下载书号 11、显示“已加入书库/已拥有”，Host 留存有效 EPUB；10,008 条元数据实测搜索目标约 222ms、末尾仅 13 行 DOM。不同内容版本仍视为不同书。乔木书库激活服务未接入，不读取或导出旧密钥 |
| Kindle 双模式、配对、校验 | 本轮未实现，已核对稳定版为 Obsidian/ssh2/SecretStorage/转换器组合，需单独迁移到 DSH Host | 当前 `/Volumes` 未见 Kindle USB 卷；Wi-Fi 设备未探测。尚无 DSH 配对/传输实现，不能把缺设备写成唯一阻碍。第二阶段须完成凭据与固定身份设计、双模式传输、转换及设备打开验收 |
| 页码、百分比跳转、返回 | 百分比包含章内位置，分页恢复章内比例；保存跳转前 locator，可一键返回 | 真实界面 53%→80%（第 10/16 页）→返回 53%通过；当前页码随窗口/排版改变，未迁移全书稳定页码 |
| MOBI/FB2/漫画 | 本轮不支持；移除无解析器的 FB2 假入口，统一明确支持 EPUB/PDF/TXT/MD/HTML | 确认缺少可用引擎，列为后续独立格式工作，不由扩展名分支声称支持 |
| 原有阅读/伴读/PDF | 保留单页默认、C 书目列表、纯白无框划线、独立伴读外观、键盘守卫、扫描 PDF 离线解码 | 原有测试持续通过。未在本轮复测实体手机/平板及所有扫描 PDF 样本 |
| 原版 AI 账号/CLI、Obsidian Vault/SecretStorage | 不适用，继续使用 DSH 原生会话和授权 | 没有自行调用 DeepSeek API，也没有导出原版账号信息 |

### 验证证据

- **代码和自动测试**：`npm run build` 与 `npm test`，84/84 通过；`npm audit` 0 漏洞。新增测试在 `test/library-recovery.test.mjs`、`text-import.test.mjs`、`speech.test.mjs`、`vocabulary-discovery.test.mjs`、`offline-migration.test.mjs`，原有套件保留。
- **实际宿主**：macOS，应用 bundled CLI `dsh --version` = **0.2.1-rc.3**；`DSH_HOME=/tmp/qmr-adaptation-qa-20261027`，profile `reader-qa`，从官方 Web profile 初始化并用 tgz 安装。测试书库通过 patch 指向 `/tmp/qmr-adaptation-qa-20261027/workspace/乔木阅读`；未修改日用 profile 配置。
- **运行截图**：[书库](../qa/adaptation-library.png)、[朗读](../qa/adaptation-speech.png)、[生词本](../qa/adaptation-vocabulary.png)、[390px 窄屏正文](../qa/adaptation-mobile-reader.png)、[窄屏朗读](../qa/adaptation-mobile-speech.png)。均来自真实 DSH Web surface，窄屏为浏览器尺寸模拟，不是实体手机。生词释义为手填，不能当 AI 输出证据。
- **数据恢复**：真实导入样本 `40ec44a7f31c3234` 的 MD 原文件、state JSON、自动 Markdown 均在隔离书库；词条 `reader` 与 `bzza2u-niyw2y` 划线回跳一致。导出的 Markdown 在 `/tmp/qmr-vocabulary-export.md`。
- **大库反例修复**：初次仅窗口化仍因 controller 每次复制/查找整库导致主线程卡顿。改为不可变数组缓存和 ID Map；同一实际宿主复测末尾滚动和搜索通过，测试还约束元数据读取次数避免二次复杂度回归。10,000 条临时元数据已清除，原测试库恢复。
- **接口/语言反例修复**：音色接口的 Remote descriptor 误声明一个参数，实际调用被拒；修为零参数并补契约测试。DSH LocaleFace 是字面键查询，嵌套字典需展平；实际 slot 已返回“选择音色后开始朗读”，不再依赖中文 fallback。中英文平键注册均有测试，英文整页未人工验收。
- **日用安装与发布边界**：`~/.dsh/profiles/desktop/node_modules/qiaomu-reader-dsh` 仍链接本目录，文件版本为 1.1.0；日用桌面进程未重载，因此不能声称桌面运行已更新。已确认公开渠道为 `https://github.com/joeseesun/qiaomu-reader-dsh`；发布验证记录见 `docs/RELEASE-VALIDATION.md`，不由本地包推断公开下载成功。

### 下一阶段和回滚

优先处理 Kindle Host 双模式与凭据保存、可选乔木书库、更多 TTS provider；这些是未实现工作，不能只补验收。AI 回答和真实 Anki 分别在有模型/AnkiConnect 的环境补测。MOBI/FB2/漫画及稳定页码保持单独范围，避免扩展名假支持。

更新前备份整个书库及 profile。1.1.0 归档字段和新文本格式对 1.0.4 不透明：回滚后不要用旧版删除或修改这些条目；恢复旧版前先保留新版数据副本。原版 `qiaomu-reader` 的状态与安装不受本轮更改。

以下为已有历史记录，并非全部在本轮重新验收。

参照当前 Obsidian Reader 的书库、划线和阅读定位，以及 Obsidian AI RSS Reader 的「正文/选段作为伴读上下文」方法。Harness 版使用原生会话、模型选择、工具和授权界面。

| 流程 | Harness 实现 | 本轮验证 |
| --- | --- | --- |
| 书库与继续阅读 | 主面板书库、搜索/筛选、最近在读、书卡进度与笔记入口 | 桌面端六本内置书，以及新导入 PDF/TXT 的书卡与继续阅读显示正常 |
| EPUB | 分页/滚动、目录、进度恢复、划线/笔记/搜索 | 桌面端《道德经》正文已显示 |
| TXT | UTF-8 文本按段落排版、长文拆章，沿用划线、搜索、伴读 | 桌面端测试 TXT 导入并显示正文；界面导入的 TXT 已写到宿主书库 |
| PDF | PDF.js 页图和可选文字层，逐页目录、搜索、滚动排版 | 桌面端测试 PDF 的页图、文字选区、划线与重启后恢复均已看到；文件与状态已写到宿主书库 |
| Markdown 阅读笔记 | 划线变化时自动更新宿主 `.md`，导出时也可下载；只更新受管理区块，保留手写内容；摘录附 `#qmr-book=…&qmr-highlight=…` 回跳链接 | 桌面端 TXT 划线后自动生成 `.md`；在笔记面板点击链接已回到原文并聚焦划线。PDF 笔记文件也含回跳链接；重复文字定位与手写内容保留有单测 |
| AI 伴读 | 阅读正文右侧使用 Harness 原生会话；窄窗口移到下方。分割线可拖动、方向键微调、双击复位并记住宽度。选文自动关联书籍/章节与选段，输入框只插入简短引用预览；快捷提示词在输入框上方，可编辑并直接发送，已有草稿时不覆盖。阅读材料由宿主按会话作为上下文提供。书名和章节在伴读标题栏同一行显示 | 已与 RSS 伴读源码及运行界面核对；Reader 构建和测试通过。当前桌面进程尚未重载，新的 Reader 交互和模型回答仍待实机复测 |
| Agent 共用书库 | Reader Remote 与 `reader_library` 工具共用宿主 API；离线缓存可迁移到宿主 | 桌面端界面导入的 PDF/TXT 在宿主索引及原文件中找到；工具本身的模型调用尚未单独验收 |

宿主书库默认在 DSH profile 的 `乔木阅读/`，可用 `workspaceRoot` 配置改变。书库根固定，不再取最近会话的 cwd。

阅读时顶部与底部工具栏覆盖在正文区域，停止操作约 2.8 秒后淡出；移动鼠标、触摸正文、滚动或通过键盘聚焦会重新显示。目录位于底部进度条左侧；顶部搜索、划线、AI 与设置入口仅显示图标，并保留提示和无障碍名称。

Markdown 保存可读摘录与回跳链接；精确定位仍依赖结构化划线状态里的书籍 ID、章节或页、文字偏移、划线 ID。扫描版 PDF 没有文字层时能看页图，但不能对不可提取文字划线或搜索。

## 2026-10-01 排版与视觉打磨

页边距与分页裁切分离，裁切容器使用 `overflow: clip`，避免下一列进入页边距和自动定位时造成横向偏移；分割、窗口、字体和行高变化重新测量当前页。搜索与划线回跳直接翻到目标所在页，避免横向滚动正文。分界线只占 1px，拖动热区仍向两侧延伸；两侧标题栏采用同一纸面背景和 52px 高度。

本轮在直接加载项目实际组件和内置 EPUB 的本地预览中验证了分页、双页、拖动、键盘调整、窄屏、滚动、夜间配色及工具栏隐藏。预览未连接 Harness 原生 AI 对话；桌面应用自动操作受状态变化阻止，尚未重载验收。规范与截图见 `DESIGN.md` 和 `docs/qa/`。

## 2026-10-01：书库 C「清晰书目」已落地

按用户预览选择 C 和「更精致一点」反馈，正式 LibraryView 改为分类栏与书目列表。移除大卡片、封面上的重复徽标、零划线文字和随机 QM 占位块；保留搜索、排序、导入、阅读进度、划线、笔记和删除确认，并增加 EPUB/PDF/TXT 格式筛选。窄屏改为横向分类，按钮保持可触达；中英书库文案已注册。

两个顺带修正的实际交互问题：嵌套行按钮会吞掉菜单键盘操作；笔记入口原先打开划线列表。新版使用独立原生按钮，菜单 Esc 交还焦点，笔记入口设置 notesMode 后打开面板。

本轮实际组件已验证桌面、手机、深色、长书名、筛选、排序、空库、加载与错误。Harness 安装版已确认新书目界面、搜索和更多菜单，不再仅停留在同步 client.js 产物。实机截图见 `docs/qa/library-harness.png`。导入、删除与 AI 回复未在本轮执行，不扩大为相关链路已验收。


## 纯白与无边框划线（v1.0.2）

新增独立的「纯白」主题：背景 `#ffffff`，正文 `#242629`，分界 `#e4e6e9`。设置面板中放在「纸白」之前；「纸白」继续使用原本的暖色纸面。纯白主题覆盖正文、工具栏与 AI 伴读纸面，通过既有书籍设置持久化。

正文划线取消 normal / is-focused 的 border、outline 与 box-shadow，只保留原来的半透明荧光色。去掉额外 padding，跨行不形成框角。划线文字继承当前阅读主题的正文色，夜间保持可读。点击仍打开划线 / 批注面板，定位行为保留。

实际组件验收：在《道德经》第三章点击跨三行的粉色划线，is-focused 为 true，border 为 0px、outline 为 none、box-shadow 为 none；背景 rgba(248,123,168,.42)。纯白正文背景为 rgb(255,255,255)。截图见 `docs/qa/white-borderless-highlight.png`。

## 对照原版 4.5.7→4.5.13 的同步移植（v1.0.3）

原版 qiaomu-reader 在 DSH 移植基线（约 2026-10-01）之后发布了 4.5.7–4.5.13。逐项对照结论：

| 原版改动 | 结论 | DSH 实现 |
| --- | --- | --- |
| 4.5.7 默认单页 | 已一致 | DSH 一直是 `spread: false` 默认 |
| 4.5.8 RSS 配色 | 不适用 | DSH 无 RSS 面板 |
| 4.5.9 删笔记护书（删除笔记前先确认笔记只属于这本书） | 不适用 | 依赖 Obsidian Vault 结构 |
| 4.5.10 AI 伴读独立外观 | 已移植 | `src/ui/companion-appearance.js`：主题/字体/字号(12–32)/行高(1.4–2.2)，null = 跟随正文，存全局 localStorage（`qmr.companionAppearance`）跨书共用。设置面板新增「AI 伴读外观」组（跟随开关 + 自定义卡片/滑杆）；阅读器给伴读容器套 `data-qmr-ai-appearance="custom"` 与 `--qmr-ai-*` 变量。DSH 伴读是原生会话，自定义模式只作用于包裹层与会话容器字体 |
| 4.5.11 原生分栏线 | 不适用 | Obsidian 专有 |
| 4.5.12 翻页键防误触 | 已移植 | `src/ui/reader.js` 导出纯函数 `readerPageDirection(event)`：焦点在 `input/textarea/select/contenteditable/[role=slider]/[role=menu]/[role=tablist]` 不翻页；空格落在 `button/a[href]/[role=button]` 不翻页（方向键不受影响）；修饰键、输入法（isComposing/keyCode 229）、已 preventDefault 均忽略。保留 DSH 特有 Home/End 跳章与 Shift+Space 上一页 |
| 4.5.13 扫描版 PDF 离线解码 | 已移植 | `scripts/generate-pdf-resources.mjs` 构建期生成 `src/client/pdf-resources-data.js`（44 个繁中 CMap base64 + 3 个 wasm 打成 deflate zip 再 base64，共约 213KB）；`src/client/pdf-resources.js` 提供 `EmbeddedPdfBinaryDataFactory`（duck-typing `fetch({kind, filename})`），`src/client/pdf-book.js` 的 `getDocument` 接入 `PDF_EMBEDDED_RESOURCE_OPTIONS`（`cMapUrl`/`wasmUrl` 占位 URL + `useWorkerFetch: false`）。运行时用 DSH 自带 `core/zip.js` 的 `openZip` 解 wasm，免新增依赖。离线后扫描版 PDF 的 CJK 页不再整页空白 |

另补齐原版 4.2.4 的 pdf.js 句号截断修复：`scripts/patch-pdfjs.mjs` 把 worker 里 `SpecialCharRegExp` 的 `/^(\s)|…/u` 改成 `/^(\s+)$|(\p{Mn})|(\p{Cf})$/u`（否则 " ." 中的句号被吞）。`scripts/build.mjs` 每次构建前自动重打（npm install 会还原补丁），脚本幂等。

新增测试 `test/upgrades.test.mjs`（60 个用例全绿）：伴读外观归一化/持久化/容错、`readerPageDirection` 守卫矩阵（含 shadow DOM composedPath）、PDF 资源工厂（CMap 字节、wasm `\0asm` 魔数、未知资源报错、选项契约）。构建通过，`client.js` 5,782,813 字节。
