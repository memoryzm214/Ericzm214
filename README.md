# Ericzm214

| 文件 | 说明 |
| --- | --- |
| [`docs/design-system.md`](docs/design-system.md) | 设计规则文档：色彩、字体、间距、栅格、图片比例、组件与动效规范，含 CSS 变量与 Tailwind token |
| [`index.html`](index.html) | 《面向未来的可持续设计 · 可持续发展概论》交互课件 |
| `assets/` | 课件配图，44 张，提取自课程 PDF |

## 使用

用浏览器打开 `index.html` 即可，无需构建。**`assets/` 文件夹需与 `index.html` 保持在同一目录**，否则图片无法显示。

## 修改

- 文字与图片：直接改 `index.html` 的 HTML 段落
- 配色：改文件顶部 `:root` 中的色值，深色模式在紧随其后的两个同名变量块
- 时间轴 / 循环图 / 象限图的数据：在文件末尾 `<script>` 中的对应数组

注意：脚本段内的中文引号必须使用全角 `“ ”`，用半角 `"` 会截断 JS 字符串。
