# 对话阅读合成样本

这些文件为本项目维护准备自拟，按项目 GPL-3.0-only 许可使用。不包含真实论文、用户附件或外部版权素材。

| 文件 | 内容与用途 |
| --- | --- |
| `sample.pdf` | 两页可提取文字 PDF；第一页 QMR-PDF-A，第二页 QMR-PDF-B；选区、解释翻译、页码和位置恢复 |
| `sample.epub` | 两章 EPUB 3；QMR-EPUB-A/B；目录、章节定位与恢复 |
| `sample.md` | 两节 Markdown；选段、链接、表格与格式阅读 |
| `sample.txt` | 两章中英文 UTF-8 文本；文本解码与独立文件识别 |

PDF/EPUB 采用标准库生成：PDF 为未压缩文本流和 Helvetica，EPUB 为 ZIP、container、OPF、nav 与两章 XHTML。用于基础交互验证，不覆盖双栏论文、公式、扫描件、复杂字体或超大文件。

建议步骤：在同一会话打开 PDF 与 EPUB，分别选择标记附近句子；在另一会话再次打开同一 PDF，验证内容去重和会话阅读位置独立。用同一文件的副本验证重复导入；修改副本内容验证同名不同内容不覆盖。不要覆盖原样本来制造变体，变体写入被忽略的 `release/dev/workspace/`。

截至 `1.2.0-dev.2`，PDF/TXT/Markdown 已参与隔离真实界面回归；EPUB、复杂排版与真实模型回答质量未由这些样本完成验收。各项状态见 `docs/CONVERSATION-READER-PLAN.md` 与 `docs/ACCEPTANCE-CANDIDATE.md`。
