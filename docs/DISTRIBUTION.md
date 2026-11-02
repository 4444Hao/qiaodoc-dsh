# QiaoDoc 分发与目录资料

更新日期：2026-11-02。

`v1.2.0-dev.7` 已于北京时间 2026-11-02 18:58 发布为 [GitHub 预发行](https://github.com/4444Hao/qiaodoc-dsh/releases/tag/v1.2.0-dev.7)，源码标签指向 `a20cfd8`。tgz 与 SHA256SUMS 已公开下载核对，18 文件安装包为 2,193,225 字节。已退出内置示例书，87 项本地检查通过，桌面已更新且用户反馈基本合适；不声明稳定版。B1 状态见 [阶段记录](SLIMMING-AUDIT-B1.md)。

- 独立仓库：[4444Hao/qiaodoc-dsh](https://github.com/4444Hao/qiaodoc-dsh)。
- 固定验收标签 `acceptance-1.2.0-dev.2` 保持不变；本项目尚无稳定版、npm 包或市场条目，dev.7 单独作为预发行。
- 内部安装包名保留 `qiaodoc-dsh`；本地构建与安装见 [测试工作流](LOCAL-TEST-WORKFLOW.md)。
- [marketplace-entry.yml](marketplace-entry.yml) 为当前项目的资料草稿，未提交。
- [screenshots.json](../screenshots.json) 使用用户提供的三张桌面截图，顺序为分屏、选段、粘贴；第四张新对话入口仅作为 README 折叠补充。四张图片均进入包清单。四个字节相同且无引用的哈希文件名副本已清理，其余历史截图保留，见 [素材索引](qa/README.md)。
- 当前包为 `qiaodoc-dsh 1.2.0-dev.7`；历史验收证据见 [阶段验收报告](ACCEPTANCE-REPORT.md)，最新交付状态见 [维护记录](MAINTENANCE.md)。
- 仓库整理和示例书退出已收尾，剩余旧接口、解析器和状态兼容层作为可选后续工作，不阻塞当前受限试用。详见 [瘦身计划](SLIMMING-PLAN.md)、[A2 审计](SLIMMING-AUDIT-A2.md) 和 [B1 记录](SLIMMING-AUDIT-B1.md)。

## 包清单与投稿边界

当前包有 18 个文件：两个预构建入口、bundle patch、SVG/PNG 标识、中英文元数据、四张展示图及截图清单、安装说明、双语 README、package.json、LICENSE 和第三方声明。六份上游资料移入 [历史区](history/README.md)，不再把旧适配记录作为当前安装资料分发。附件生成见 [Release 准备](RELEASE-PREPARATION.md)。

package keywords 已去除旧 EPUB 产品标签，仅描述当前文档阅读能力；它们不能代替 GitHub Topic。投稿前仍须重新核对 [当前贡献规则](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)、公开截图和目录资料，不以本地整理通过推断收录或部署。上游渠道和历史验证不代表本项目已经发布。
