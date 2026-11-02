# QiaoDoc 分发与目录资料

更新日期：2026-11-02。

最新工作区候选为 dev.7，已退出内置示例书并通过 87 项本地检查，尚未更新日用桌面或发布；下方 dev.6 体积记录属于 A2 阶段，不能作为 dev.7 包摘要。B1 状态见 [阶段记录](SLIMMING-AUDIT-B1.md)。

- 独立仓库：[4444Hao/qiaodoc-dsh](https://github.com/4444Hao/qiaodoc-dsh)。
- 当前仅迁移源码与固定验收标签 `acceptance-1.2.0-dev.2`，未发布本项目的稳定版、npm 包或市场条目。
- 内部安装包名保留 `qiaodoc-dsh`；本地构建与安装见 [测试工作流](LOCAL-TEST-WORKFLOW.md)。
- [marketplace-entry.yml](marketplace-entry.yml) 为当前项目的资料草稿，未提交。
- [screenshots.json](../screenshots.json) 使用用户提供的三张桌面截图，顺序为分屏、选段、粘贴；第四张新对话入口仅作为 README 折叠补充。四张图片均进入包清单。四个字节相同且无引用的哈希文件名副本已清理，其余历史截图保留，见 [素材索引](qa/README.md)。
- 当前包为 `qiaodoc-dsh 1.2.0-dev.6`，本机桌面安装已核对；历史验收证据见 [阶段验收报告](ACCEPTANCE-REPORT.md)，最新交付状态见 [维护记录](MAINTENANCE.md)。
- 投稿前的代码与资源整理按 [瘦身计划](SLIMMING-PLAN.md) 实施。A0/A1 的旧 UI 清理见 [审计结果](SLIMMING-AUDIT-A1.md)；A2 的素材、归档、locale 与包清单整理见 [A2 审计](SLIMMING-AUDIT-A2.md)。当前包不再携带历史适配文档，locale 仅保留当前元数据；运行时精简 B1–B3 尚未执行。

## 包清单与投稿边界

当前包有 17 个文件：两个预构建入口、bundle patch、SVG/PNG 标识、中英文元数据、四张展示图及截图清单、安装说明、README、package.json、LICENSE 和第三方声明。六份上游资料移入 [历史区](history/README.md)，不再把旧适配记录作为当前安装资料分发。

package keywords 已去除旧 EPUB 产品标签，仅描述当前文档阅读能力；它们不能代替 GitHub Topic。投稿前仍须重新核对 [当前贡献规则](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)、公开截图和目录资料，不以本地整理通过推断收录或部署。上游渠道和历史验证不代表本项目已经发布。
