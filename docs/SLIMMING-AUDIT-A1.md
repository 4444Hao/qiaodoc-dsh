# 瘦身 A0/A1 审计与结果

日期：2026-11-02。状态：**A0/A1 完成**；后续资料整理见 [A2 审计](SLIMMING-AUDIT-A2.md)，第二轮尚未执行。实施前提交为 `973ad43`，包为 qiaodoc-dsh 1.2.0-dev.6。原有四份已修改文档及未跟踪的瘦身计划一并保存，未通过 Git 回退或覆盖用户修改。

## 范围与依据

对照 [瘦身计划](SLIMMING-PLAN.md)，核查当前 Host/Client 的 esbuild 入口依赖图、全部项目源码和测试的静态路径引用、维护脚本、package exports 与文档。动态导入、测试中的源码读取和构建入口字符串也纳入人工核对。不存在以忽略规则代替移除运行依赖的处理。

本轮只退出已从产品主流程移除的旧 UI。内置示例书、bridge、Host、旧数据、PDF 资源和解析器均保留；朗读/Anki/找书的宿主接口仍留到第二轮。src/ui 下仅保留当前历史面板和仍被数据层使用的格式化模块。

## 逐文件清理表

下表的外部执行引用不包含同批删除模块之间的引用。历史文档对旧实现路径的记录仍保留，代表当时状态，并非要求文件继续存在的运行依赖。

| 文件 | 清理前字节 | 清理前外部执行引用 | 处理与依据 |
| --- | ---: | --- | --- |
| `src/client/native-chat.js` | 5,359 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/client/tts.js` | 5,367 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/core/library-window.js` | 442 | `test/vocabulary-discovery.test.mjs` | 已删除；旧功能测试同步退出或部分调整 |
| `src/core/location.js` | 349 | `test/vocabulary-discovery.test.mjs` | 已删除；旧功能测试同步退出或部分调整 |
| `src/ui/book-discovery.js` | 3,129 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/companion-appearance.js` | 2,389 | `test/upgrades.test.mjs` | 已删除；旧功能测试同步退出或部分调整 |
| `src/ui/companion.js` | 9,084 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/controller.js` | 39,968 | `test/offline-migration.test.mjs` | 已删除；旧功能测试同步退出或部分调整 |
| `src/ui/hooks.js` | 5,239 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/icons.js` | 5,896 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/library-locale.js` | 8,523 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/library.js` | 17,710 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/panel-highlights.js` | 10,755 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/panel-search.js` | 5,917 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/panel-settings.js` | 11,406 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/panel-speech.js` | 6,602 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/panel-vocabulary.js` | 6,637 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/prompt-manager.js` | 2,835 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/quick-prompts.js` | 972 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/reader.js` | 48,936 | `test/upgrades.test.mjs` | 已删除；旧功能测试同步退出或部分调整 |
| `src/ui/selection-menu.js` | 4,386 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/shell.js` | 9,306 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/store.js` | 3,595 | `test/offline-migration.test.mjs` | 已删除；旧功能测试同步退出或部分调整 |
| `src/ui/theme.js` | 47,291 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/ui/toc.js` | 4,416 | 无 | 已删除；执行引用仅在同批旧模块中或不存在 |
| `src/client/ui` | 5 | 无 | 已删除；仅含 ../ui 的旧目录指针占位文件，无执行引用 |

最初列出的 25 个 .js 候选全部退出；另发现并审计了 5 字节的 src/client/ui 普通文本占位文件。未扩大到仍被入口引用的模块。

## 测试与构建脚本调整

- 删除 test/speech.test.mjs：五项均针对已退出的客户端朗读控制器，不是宿主朗读接口测试。
- test/upgrades.test.mjs：退出五项伴读外观、四项旧阅读器翻页键测试；保留四项实际仍使用的 PDF 资源检查。
- test/offline-migration.test.mjs：退出两项旧 controller/UI 用例；保留离线文件迁移、未同步状态恢复和旧字段合并的三个兼容用例。
- test/vocabulary-discovery.test.mjs：仅退出一项旧书库虚拟窗口/章节位置计算；保留数据落盘、Anki、找书及损坏索引保护覆盖。
- scripts/build.mjs：移除无当前调用的 /tmp/qmr-bootstrap UI 替换分支，普通构建方式不变。
- scripts/check-client.mjs：移除旧 UI 桩，改为实际当前客户端的内存构建，继续检查模块外壳与外部依赖。

共退出 17 项旧 UI 测试，清理前 101 项通过，清理后 84 项通过；均为 0 失败、0 跳过。没有用跳过、放宽断言或整删混合测试来维持通过。

<details>
<summary>退出的 17 项测试明细</summary>

- `test/upgrades.test.mjs`：normalizeCompanionAppearance: 非对象输入返回 null（跟随正文）
- `test/upgrades.test.mjs`：normalizeCompanionAppearance: 字段不全时用默认值补齐
- `test/upgrades.test.mjs`：normalizeCompanionAppearance: 字号四舍五入并夹 12–32，行高夹 1.4–2.2
- `test/upgrades.test.mjs`：read/saveCompanionAppearance: 持久化、清除与容错
- `test/upgrades.test.mjs`：readCompanionAppearance: localStorage 抛错时静默返回 null
- `test/upgrades.test.mjs`：readerPageDirection: 方向键 / 空格 / PageUp-Down 映射翻页方向
- `test/upgrades.test.mjs`：readerPageDirection: 修饰键、输入法与已处理事件不触发翻页
- `test/upgrades.test.mjs`：readerPageDirection: 焦点在输入框 / 滑杆 / 菜单 / 标签组时不翻页
- `test/upgrades.test.mjs`：readerPageDirection: 空格落在按钮/链接上不翻页，方向键不受影响
- `test/offline-migration.test.mjs`：vocabulary save reports host failure while keeping retryable local edits
- `test/offline-migration.test.mjs`：large-library metadata lookup is indexed and refreshes after membership replacement
- `test/vocabulary-discovery.test.mjs`：large library window stays bounded at start/middle/end and percentages include chapter offset
- `test/speech.test.mjs`：continuous speech skips empty chapters, saves each sentence and ends once
- `test/speech.test.mjs`：pause and late provider completion cannot advance into the next sentence
- `test/speech.test.mjs`：saved next-sentence position resumes without skipping unread text
- `test/speech.test.mjs`：voice errors are recoverable and pending chapter reads cancel on disposal
- `test/speech.test.mjs`：long sentences are bounded and repeated quotes retain distinct offsets

</details>

## 体积与构建对照

| 指标 | 清理前 | 清理后 | 说明 |
| --- | ---: | ---: | --- |
| src 文件合计字节 | 1,120,222 | 853,708 | 减少 266,514 字节 |
| 基线 src/scripts/test 文件字节 | 1,331,658 | 1,047,930 | 删除与编辑净减少 283,728 字节，不含本轮新增审计文档 |
| client.js | 6,002,468 | 6,002,468 | SHA-256 相同 |
| index.js | 476,464 | 476,464 | SHA-256 相同 |
| tgz 字节 | 3,040,170 | 3,040,170 | 18 文件；整包 SHA-256 相同 |

Host/Client 的入口依赖文件集合也完全一致。旧模块原本未进入产物，因此此次没有安装包瘦身收益；这是预期的仓库整理，不宣称运行时已变小。保留 Git 历史，不承诺 Git 对象库或完整历史克隆体积随之下降。

摘要：

- index.js：`948068f66d6b096bb684e6eab7c33f7d0310140c0db2fe4426d231b4bc4d332e`
- client.js：`4b71a40d17b80c3911c0bf0573d8ee4279cc2517fdf4003497cf1364848cdc59`
- 清理前后 tgz：`7469682d7c692267051a4c93c1c43b25b944dee29fa24ec637dd65d00db0e589`

## 证据、回退与边界

源码和原有用户修改快照共 168 个文件，位于被忽略的 `release/dev/slimming/a1-1793597018347/source/`。同目录有 before.json、changes.json、after.json、baseline-package.json，以及清理前 tgz 和 after 子目录的对照 tgz。

检查日志位于 release/dev/reports：slimming-a1-baseline-check.log、slimming-a1-after-check.log、slimming-a1-client-check.log、slimming-a1-result.json。

需要回退时，仅按 changes.json 从快照恢复这轮删除的 27 个文件和修改的五个脚本/测试文件；不要整体覆盖之后的用户修改。日志与快照不进入发布包或 Git 提交。

本轮未改版本、依赖、锁文件或数据 schema，未修改/启动/重启日用 Harness，也未执行 Git 暂存、提交、标签、推送或发布。由于两个运行时与安装包逐字节一致，没有重复运行浏览器或真实桌面验收；这不等于新增一轮 13 项浏览器通过记录。

A1 交付时下一步为 A2 的截图、历史文档和发布清单审计，后续结果单独记录。真正减少客户端加载内容的 B1–B3 使用新候选和运行时验收。
