# Arduino 课程 PPT 制作规范（turquoise 模版）

所有 Arduino 课程 PPT 都用这套模版输出：配色和排版参考用户选定的 “Untitled 7” 模版（青绿 #40E0D0 + 炭黑 #2D2D2D + 浅灰），讲解形式沿用《Arduino 编程手册》（实验卡 → 接线 → 代码逐行看懂 → 结果）。

```
arduino-ppt/
  lib/vti.js          设计系统：颜色、版式（layouts）、所有组件
  build/*.js          每份 PPT 一个脚本：node build/xxx.js → output/xxx.pptx
  assets/pdf/         实验指南 PDF 里提取的图片 + guide_text.md（原文/程序转录）
  tools/render.sh     渲染成图片做目检：tools/render.sh output/x.pptx <输出目录>
  tools/check.py      内容检查：必需图片是否都在、禁用词、备注
  output/             生成的 .pptx
```

## 1. 视觉规则

| 元素 | 规则 |
|---|---|
| 画布 | 16:9，10 × 5.625 in；内容区 x 0.45–9.55，y 1.35–5.0（`V.G`） |
| 颜色 | 只用 `V.P`：turq 40E0D0（大面积填充、标签、深色上的高亮）、ink 2D2D2D（文字、深色方块、代码底）、card F5F5F5（圆角卡片）、gray1/gray2（浅灰方块、细边框）、white、red E5484D（“不要这样做”红框）。**青绿色不要当白底上的文字色**（对比度太低）；白底上要强调用 ink 加粗或 turqDeep |
| 字体 | 全部 `微软雅黑`，代码 `Consolas`（库里已设好，不要自己写 fontFace） |
| 字号 | 标题 24（版式自带）、副标题说明 12、正文 14、注释/逐行讲解 12、图注 10、代码 11.5（自动缩到不小于 9.5）。正文不低于 12，图注不低于 10 |
| 版式母题 | ① 左窄文字栏 + 右侧 2×2 方块（`tiles`，青绿/浅灰/炭黑/白四色）② 浅灰圆角卡片 `card` ③ 青绿圆圈图标 `iconCircle` ④ 炭黑代码卡 `codeBlock` ⑤ 红框卡片 `tip({kind:'warn'})` 表示常见错误 |
| 禁止 | 标题下的装饰线、页面边缘色条、卡片单边色条；居中的正文段落；标题末尾句号；文字溢出；图片裁切或变形（`imageBox` 只做等比缩放） |

每页都要有：标题（`title`）＋一句话说明（`desc`，这一页的要点）＋至少一个视觉元素（图片、方块、卡片、图标、代码卡、流程）＋讲者备注（`notes`，讲课提示，2–4 句）。

## 2. 讲解规则（通俗易懂）

- 先讲“为什么/是什么”，再讲“怎么写”。每个新语法配一个生活类比（变量＝贴标签的盒子、函数＝菜谱、if＝岔路口、for＝数着圈跑步、串口＝和电脑聊天的窗口……），然后给最小示例。
- 代码页：左边代码卡（标行号、高亮被讲解的行），右边“逐行看懂”（`explain`，每条一句大白话，和代码行对齐）。一页代码不超过约 16 行，长程序拆成 1/2、2/3。
- 实验页顺序：实验介绍 → 元件清单/目的 → 原理（公式、流程图）→ 接线（原图＋接线表）→ 新语法小课堂 → 代码逐行 → 实验结果（原图）→ 常见坑/动手改一改 → 小结。
- 原指南的图片一张都不能少（`tools/check.py --require` 检查）；原指南程序照抄（只统一缩进），原文有错的地方保留原样或改正后，在页面上用一句话说明“原指南此处……”。
- **不要**出现 mBlock 图形化编程内容，也不要出现“网页版/模拟器/点 ▶ 运行”（这次没有网页版）。

## 3. 组件速查（`const V = require('../lib/vti')`）

```js
const deck = await V.Deck.create({ label: '1-2　模拟输入实验', title: '文件标题' }); // label 显示在左下角页脚
const I = await deck.loadIcons({ bulb: 'FaLightbulb', warn: 'FaExclamation' }); // I.bulb 炭黑，I.bulb_w 白色
deck.cover({ kicker, title, subtitle, meta, notes });          // 青绿封面
deck.section('AD 模数转换');                                    // PowerPoint 分节；右下角页脚默认显示节名
deck.divider({ kicker:'实验 01', title, desc, tiles:[{fill:V.P.turq, big:'01', title, sub}, ...4], notes });
const s = deck.slide({ title, desc, notes, footer? });         // 内容页（白底）
deck.end({ title, subtitle });                                  // 青绿结束页
await deck.save(__dirname + '/../output/xxx.pptx');

V.text(s, '文字' | runs[], { x, y, w, h, size, bold, color, align, valign, mono });
V.card(s, { x, y, w, h, fill, line, radius });                  // 圆角卡片；line 给边框
V.pill(s, { x, y, text, fill, color, size, mono });             // 返回宽度
V.tags(s, ['analogRead','float'], { x, y, w });                 // 语法标签（炭黑胶囊）
V.iconCircle(s, I.bulb, { x, y, d, fill });
V.numCircle(s, 1, { x, y, d });
V.arrow(s, x1, y1, x2, y2, { color });
V.bullets(s, ['…','…'], { x, y, w, h, size, gap });
V.imageBox(s, { file:'pdf/ad_wiring.jpg', x, y, w, h, diagram:true, caption:'…' }); // 白底示意图用 diagram:true；照片默认浅灰底
V.tiles(s, { x, y, w, h, cols:2, items:[{ fill, big, title, sub }] });
V.table(s, rows, { x, y, w, colW:[..], monoCols:[0], boldCols:[0], rowH, size });
V.wiring(s, { x, y, w, right:'光敏电阻模块', rows:[['A0','S'],['GND','G']] }); // 返回底部 y
V.tip(s, { x, y, w, h, kind:'tip'|'warn'|'note', title, text }, I.bulb);         // warn = 红框 + 白色图标（传 I.xxx_w）
const b = V.codeBlock(s, { x, y, w, h, code, from, to, hl:[行号], file:'xxx.ino', right:'第 1–12 行' });
V.explain(s, b, { x, w, title:'逐行看懂', maxY: V.G.bottom, items:[{ line: 3, text:'…' }, { line:[5,7], text:'…' }] });
V.serialMonitor(s, { x, y, w, h, baud: 9600, lines:['…'] });
V.steps(s, { x, y, w, h, focus, items:[{ title, sub, mono }] });  // 横向流程
V.formula(s, { x, y, h, lhs:'V =', num:'读数', den:'1023', rhs:'× 5V', size });
V.textW(str, size) / V.textH(str, w, size)                       // 估算文字宽高（英寸）
```

`codeBlock` 放不下时会抛错并提示拆页；`explain` 超出 `maxY` 会抛错——缩短文字或拆页，不要硬塞。
`explain` 每条讲解至少占 0.38 in，而代码行距约 0.2 in：相邻 3 行以上都要讲时，合并成一条 `{ line:[a,b] }`，否则讲解会逐条下移、离开对应代码行。
`V.text` 的 `bold` 作用于整个文本框；同一框里要粗细混排时，框不设 bold，只在需要的 run 上写 `bold:true`。

## 4. 生成与检查

```bash
cd arduino-ppt
node build/01_lesson_1-2.js
python3 tools/check.py "output/<名字>.pptx" --require pdf/ad_wiring.jpg ...   # 必须 RESULT: PASS
python /root/.claude/skills/.../pptx/scripts/office/validate.py "output/<名字>.pptx"
tools/render.sh "output/<名字>.pptx" /tmp/.../qa-xxx                         # 逐页看图
```

目检重点：文字溢出/被截断、元素重叠、卡片间距小于 0.3 in、同类页面标题位置不一致、白底上的浅色文字、图片变形或裁切。
