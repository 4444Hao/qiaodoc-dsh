# QiaoDoc 视觉标识

当前工作区版本：`1.2.0-dev.5`。日用桌面已安装 dev.5；本次未重启，入口与面板微调需完全退出并重开后体验。下文主要记录 dev.4 标识设计及其验证范围。

dev.5 将绿色细边框和小标识延续到“打开原文”入口，并将文件面板改为紧凑的两按钮、限高文件列表及单行路径区。真实隔离宿主效果见 [打开原文面板](qa/qiaodoc-open-document-dev5.png)；101 项自动测试和 13 项浏览器回归通过，320px 窄窗口无横向溢出。

后续 README 维护已将当前市场截图清单替换为用户提供的分屏、选段和粘贴三张桌面图，文件名采用 `qiaodoc-*-v1.png`；第四张新对话入口仅作 README 折叠补充。下文 `-dev4.png` 和 `-dev5.png` 记录此前隔离验证截图，保留用于对照，不是当前市场清单。

标识由一页原文和三片叶子组成。文档表达当前项目的阅读功能；叶子延续“乔木”的来源意象。墨绿底色在浅色页面和深色侧栏中都能辨识，薄荷绿与暖黄叶片提供小面积点缀，不增加装饰动效。

## 素材与维护

- [SVG 图标](../icon.svg)：可缩放的包图标。
- [256px PNG 图标](../assets/qiaodoc-icon-256.png)：透明圆角外部区域，供社区市场 `icon:` 等只接受位图的位置使用。
- 共用几何源为 `src/core/brand.js`；`npm run build` 会生成根目录 icon.svg，客户端组件读取同一份形状，避免侧栏、工具条与包图标各自演变。
- PNG 是 SVG 的浏览器渲染结果，不由图片生成模型绘制。修改几何后应重新渲染 PNG。

| 用途 | 颜色 |
| --- | --- |
| 标识底色 | `#075341` |
| 工具条底色 | `#123e35` |
| 工具条文字 | `#f0fff6` |
| 翻译按钮背景 | `#c2f2d4` |
| 键盘焦点 | `#fcd34d` |

工具条保留解释、翻译、复制、询问 AI 四个文字标签。叶子标识为装饰图形，不成为额外按钮；使用固定高对比品牌配色，不依赖宿主深浅主题变量。窄窗口允许换行，并按实际尺寸限制浮层位置。保留禁用态和键盘焦点，强制颜色模式使用系统色，无过渡或循环动画。

## 本地视觉预览

在独立终端启动无头 Edge；下面的浏览器数据目录仅用于此预览，端口 9231 需空闲：

```powershell
$previewProfile = Join-Path $PWD 'release/dev/brand-browser'
Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9231',
  ('--user-data-dir="' + $previewProfile + '"'), '--no-first-run', '--no-default-browser-check', 'about:blank'
)
node scripts/preview-brand.mjs
```

脚本仅连接该端口的空白页面；生成 `assets/qiaodoc-icon-256.png` 和被忽略的 `release/dev/brand-preview/` 设计图，完成后关闭这个独立浏览器。它复用插件 SVG 与 CSS，检查 320px 下中英文四个操作及常规文字颜色对比度，不模拟 AI 调用。

设计预览不等于真实 Harness 验收截图。当前 screenshots.json 使用本轮 dev.4 在隔离 rc.5 宿主中的三张真实截图，以 `-dev4.png` 新文件名避免沿用旧素材缓存；展示的是合成文档和固定回复模型，不代表真实 AI 回答质量。设计图不进入市场截图清单。PNG 图标及新截图的公开地址需要维护者推送后再次核验。

## 本轮验证

101 项自动测试、17 文件包校验和 13 项隔离浏览器回归通过；浏览器回归没有跳过、启动异常或操作异常。实际宿主选段截图已目视检查，新图标与工具条显示正常。320px 中英文 CSS 预览均保留四个操作；三组常规文字颜色对比度分别约为 11.52、9.59、8.25。强制颜色模式已提供系统色规则，但尚未进行真实 Windows 高对比模式验收。

本轮未更新日用桌面，也不改变解释/翻译的发送行为、草稿保护和文件落盘规则。dev.3 的 HTML 选段、完整重启未保存表单恢复等限制继续有效。
