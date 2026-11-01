# QiaoDoc 分发与目录资料

更新日期：2026-11-01。

- 独立仓库：[4444Hao/qiaodoc-dsh](https://github.com/4444Hao/qiaodoc-dsh)。
- 当前仅迁移源码与固定验收标签 `acceptance-1.2.0-dev.2`，未发布本项目的稳定版、npm 包或市场条目。
- 内部安装包名保留 `qiaomu-reader-dsh`；本地构建与安装见 [测试工作流](LOCAL-TEST-WORKFLOW.md)。
- [marketplace-entry.yml](marketplace-entry.yml) 为当前项目的资料草稿，未提交。
- [screenshots.json](../screenshots.json) 使用用户提供的三张桌面截图，顺序为分屏、选段、粘贴；第四张新对话入口仅作为 README 折叠补充。四张图片均进入包清单，旧截图及原始哈希文件名副本保留在源码中。
- 工作区版本为 `1.2.0-dev.5`；历史验收证据见 [阶段验收报告](ACCEPTANCE-REPORT.md)，最新交付状态见 [维护记录](MAINTENANCE.md)。

## 上游历史资料

下列资料仅说明上游的渠道与准备过程，不代表 QiaoDoc 已发布或收录。

- 仓库：https://github.com/joeseesun/qiaomu-reader-dsh
- 安装渠道：GitHub Releases 的预构建 tgz；未发布 npm。
- Topics：dsh-plugin、deepseek-harness，以及真实功能标签。
- 截图入口：[screenshots.json](../screenshots.json)。
- Awesome DSH Plugin 条目草稿：[marketplace-entry.yml](marketplace-entry.yml)，目标路径 `data/plugins/joeseesun__qiaomu-reader-dsh.yml`。

准备材料不等于提交或收录。提交前重新核对 [contributing](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，包括仓库满 24 小时、分类、每个 PR 条目上限等规则。dsh-market 共用该目录，不重复向市场应用提交。其他独立入口需分别核对，不能称为官方认证。

官方社区发现依赖 GitHub `dsh-plugin` Topic；package keywords 不能替代 Topic。
