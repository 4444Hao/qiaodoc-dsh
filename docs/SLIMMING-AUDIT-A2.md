# 瘦身 A2 审计与结果

日期：2026-11-02。状态：**A2 完成，第一轮仓库整理收尾；B1–B3 待执行**。工作区仍为 qiaodoc-dsh 1.2.0-dev.6，延续 [A0/A1](SLIMMING-AUDIT-A1.md)，没有覆盖此前未提交的修改或固定验收归档。

## 重复素材

对项目图片按 SHA-256 分组，再扫描源码、脚本、JSON/YAML 和 Markdown 中的文件名引用。仅下列四份是完全相同且无引用的副本，已删除；保留文件的字节、尺寸和命名不变。

| 删除的 docs/qa 文件 | 保留的同目录文件 | 字节 |
| --- | --- | ---: |
| `644bc0bc9268f11e4dab864a1cae4d6.png` | `qiaodoc-new-chat-entry-v1.png` | 75,306 |
| `667fcbdf0b1dfada336c70f8d00960a.png` | `qiaodoc-paste-text-v1.png` | 142,146 |
| `90b4a2afc71cbe6aa16e5ecb5236459.png` | `qiaodoc-selection-v1.png` | 128,699 |
| `fdf9b71bbcb173e3b192e391d63219a.png` | `qiaodoc-split-view-v1.png` | 541,054 |
| 合计 | | **887,205** |

其余图片即使没有直接引用，也可能保存了早期验收状态；未按“无引用”批量删除。新增 [素材索引](qa/README.md) 区分当前展示、早期 QiaoDoc 验证与上游截图。项目 SVG/PNG 标识及全部保留图片的摘要均未变化。

README 四张图、展示宽度、折叠补充与市场清单前三张的顺序保持原样。删除的副本原本未进入安装包，所以 887 KB 是仓库文件收益，不是 tgz 收益，也不是 Git 历史克隆大小的减少承诺。

## 历史资料与发布清单

六份文档移入 docs/history：根目录 DESIGN.md，以及 docs 下的 SCREENSHOTS.md、READER-ADAPTATION.md、RC3-COMPATIBILITY.md、RC5-COMPATIBILITY.md、RELEASE-VALIDATION.md。新增 [归档索引](history/README.md)，更新文档入口和实际 Markdown 相对链接，补历史提示；旧版本、环境、摘要和当时结论不改写。

ARCHITECTURE.md 暂留原路径，因为当前核心模块注释仍引用其章节；其历史说明继续有效。冻结候选、阶段验收报告和用户数据均未改动。历史截图留原目录，旧文档中的反引号路径按当时仓库根解释。

package.files 移除旧 READER-ADAPTATION.md，源仓库仍有归档。当前包保留两个运行入口、bundle patch、标识、中英文元数据、README 四张展示图及截图清单、安装说明、许可证和第三方声明；实际文件数从 18 降为 17。package keywords 去掉旧 qiaomu/epub/reading 标签，使用当前文档用途标签；不改变包名、版本、依赖或锁文件。安装说明中的当前版本与 tgz 示例同步为 dev.6。

## Locale 核查

locale/zh.json 和 locale/en.json 各从 100 个叶子词条收窄为两个当前元数据：title、description，两个值逐项保持一致。共退出 196 个旧 catalog、themeWhite、speech、lookup、discover、navigation 词条。

当前界面由 src/client/index.js 注册 HISTORY_MESSAGES 与 DOCUMENT_MESSAGES，未从这两份 JSON 读取旧词条；其界面中英文文案与兼容命名空间均不变。客户端激活测试覆盖 locale 先到、后到和缺席时的注册、清理及当前翻译键。旧宿主接口尚未退出，不能据此称朗读、Anki 或找书运行时已移除。

## 实际验证与体积

| 指标 | A2 前 | A2 后 |
| --- | ---: | ---: |
| tgz 文件数 | 18 | 17 |
| tgz 字节 | 3,040,170 | 3,029,405 |
| 包内文件合计字节 | 7,462,372 | 7,438,874 |
| locale 两文件字节 | 8,014 | 380 |
| index.js 字节 | 476,464 | 476,464 |
| client.js 字节 | 6,002,468 | 6,002,468 |

压缩包减少 10,765 字节，约 10.5 KiB。变化来自历史文档退出、locale 与安装/包元数据调整；两个运行时构建的 SHA-256 与 A1 相同。此阶段没有减少运行时代码或加载内置书。

- `npm run check` 最终通过：构建、84 项测试（0 失败、0 跳过）和 17 文件包校验。
- 首次沙箱运行因 Windows 临时目录 rename/symlink 权限受限失败，保留日志；未改产品代码或放宽断言，改在授权的沙箱外运行既有临时样本测试后通过。
- 全仓 142 处 Markdown/HTML 本地链接与路径大小写核对通过；README 图片、截图清单及 PNG 格式/尺寸通过。实际解包 17 个 tgz 文件，内容均与当前输入文件逐字节相同。
- 保留图片、README、screenshots.json、锁文件和固定验收资料与 A2 前摘要相同；71 个源码/测试/脚本及许可证、第三方声明文件也逐项未变。除本轮计划内的资料/locale/package 改动外，不改变运行功能。
- 未重复浏览器或真实桌面验收；未核对 GitHub 公开访问或市场缩略图。它们仍需维护者推送后确认，不能以本地包检查代替。

新 tgz SHA-256：`43085c571317afd7680785273dcfdc92850f4a73a9d266348f56e0e826b85651`。它是本地资料整理包，未安装、发布或替代固定验收候选。

## 回退与后续

实施前保存 142 文件源码快照，含 A1 的未提交结果：`release/dev/slimming/a2-1793597727120/source/`。同目录 before.json 记录文件字节、摘要、图片引用与重复分组；changes.json 记录删除、移动和 locale 处理；before.tgz 与 after 子目录的新包分别保存。

检查日志为 `release/dev/reports/slimming-a2-check.log`（沙箱失败）及 `slimming-a2-check-unsandboxed.log`（最终通过）；最终比对为 `release/dev/reports/slimming-a2-result.json`。这些本地文件被忽略，不进入源码提交或发布包。

回退时按最终 changes 范围恢复这轮变动：从 source 恢复四张副本、原文档路径、locale、package 与相关资料；移除本轮新建的归档及索引。先核对之后是否有用户修改，不整体覆盖工作区，更不回退 A1 或清空数据。before.tgz 只保存旧包，不表示已执行桌面回退。

本轮未执行 Git 暂存、提交、标签、推送、PR 或发布，未更新或重启日用 Harness。下一步 B1 单独使用新候选，先收窄当前文档所需数据接口，再退出内置示例书；保留现有文件副本、名称映射和历史数据。
