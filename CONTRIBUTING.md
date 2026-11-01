# 参与贡献 / Contributing

本地 fork 开发请先阅读 [文档索引](docs/README.md)、[改造计划](docs/CONVERSATION-READER-PLAN.md) 和 [Windows 开发说明](docs/WINDOWS-DEVELOPMENT.md)。每轮交接更新 [维护记录](docs/MAINTENANCE.md)，区分规划、自动测试和真实宿主验收。Windows npm 入口问题已修复；运行 `npm run check` 完成构建、测试与打包检查，浏览器集成验证另行运行。

欢迎提交问题报告和小范围改进。请先说明实际使用场景，并附上 DSH 版本、操作步骤、预期与实际结果。涉及界面时请附截图，但先移除私人会话、工作区路径和令牌。

本项目目前以 DeepSeek Harness 桌面版为主要验证环境。提交代码前运行：

```bash
npm ci
npm run build
npm test
```

`client.js` 是需要随源码一起提交的构建产物。请在 PR 中说明可见行为、验证结果和未覆盖的平台。新文案应同时更新中英字典。

Issues and focused pull requests are welcome. Include reproduction steps, your DSH version, expected and actual behavior, and redacted screenshots when useful. Run the commands above, commit the generated `client.js`, and update both locale dictionaries for UI text changes.
