# 上游历史资料

这里保存乔木阅读 DSH 阶段的设计、适配与验证记录，供追溯来源和理解仍保留的数据层使用。它们不是当前 QiaoDoc 的功能说明、兼容承诺或安装指南。

当前入口：[维护文档](../README.md)、[安装说明](../INSTALLATION.md)、[阶段验收报告](../ACCEPTANCE-REPORT.md)。

| 归档文档 | 原路径 | 内容 |
| --- | --- | --- |
| [旧视觉规范](DESIGN.md) | 根目录 DESIGN.md | 旧书库、独立阅读器、伴读的视觉设计 |
| [原阅读功能适配记录](READER-ADAPTATION.md) | docs/READER-ADAPTATION.md | 上游阶段的移植、测试和未完成范围 |
| [rc.3 验证记录](RC3-COMPATIBILITY.md) | docs/RC3-COMPATIBILITY.md | 上游 1.1.1 的指定环境安装与页面验证 |
| [rc.5 兼容记录](RC5-COMPATIBILITY.md) | docs/RC5-COMPATIBILITY.md | 上游 1.1.2 的兼容维护，不能替代当前 Windows 验收 |
| [上游发布验证](RELEASE-VALIDATION.md) | docs/RELEASE-VALIDATION.md | 上游历史构建、安装和分发验证边界 |
| [上游截图说明](SCREENSHOTS.md) | docs/SCREENSHOTS.md | docs/screenshots 下原有截图的环境与来源 |

[历史架构契约](../ARCHITECTURE.md) 暂留原路径，因为现存核心模块的注释仍引用其中章节；它已有历史说明，不作为当前接口规范。

归档仅新增提示并调整实际 Markdown 相对链接，历史版本、摘要、环境和结论保持原样。正文中以反引号记录的旧仓库路径、命令和测试名称仍表示当时位置；例如 `docs/qa/` 仍是仓库根下的截图目录。A1 已退出的模块不会因为历史文档提及而恢复。

历史截图留在原目录，避免破坏验收证据；用途见 [素材索引](../qa/README.md)。冻结的 QiaoDoc 验收候选及报告未迁入本区，也未改写。历史适配文档退出当前安装包白名单，但继续随源码保存。
