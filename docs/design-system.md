# 设计规则文档 · Sutera × Waste Not

> **版本** v1.0 · 2026-08-28
> **结构参考** sutera.ch（瑞士极简 / 编辑式电商排版）
> **配色参考** wastenot.world（环保自然色系）

---

## 0. 关于本文档的数据来源（必读）

生成本文档的环境网络出口策略拦截了 `sutera.ch`、`wastenot.world` 以及 `siteinspire`、`lapa.ninja`，**无法直接抓取两站的真实 CSS、字体文件与色值**。

因此本文档的处理方式是：

- **结构与规则体系**：完整、自洽、可直接落地，这部分独立于具体数值成立。
- **具体数值**（色值 hex、字体名、字号阶梯、间距标度、动效时长）：标记为 `【推断】`，取自"瑞士极简编辑排版 + 环保自然色系"这一品类的通行规律，而非从原站提取。
- **校正方式**：拿到原站截图或 DevTools 的 computed style 后，**只需替换第 11 节的 token 表**，其余章节（栅格、图片比例、组件规范、动效原则）无需改动。

凡带 `【推断】` 标记的数值，请在落地前用真实数据核对一次。

---

## 1. 设计基调

一句话定位：**用瑞士平面设计的秩序感，承载自然材质的温度。**

| 维度 | 取向 |
| --- | --- |
| 气质 | 克制、留白充足、编辑感强，不做视觉炫技 |
| 信息密度 | 低。一屏只讲一件事 |
| 视觉主角 | 图片与大字标题，UI 元素退到背景 |
| 色彩策略 | 大面积米白/纸色打底，深林绿承重，陶土橙只做点睛 |
| 排版策略 | 衬线大标题 + 无衬线正文，靠字号与留白拉开层级，不靠颜色和描边 |
| 动效策略 | 只做"顺滑"，不做"花哨"。动效服务于阅读节奏 |

三条不可违背的底线：

1. **留白优先于内容填充**——宁可少放一个模块，不可压缩章节间距。
2. **一屏最多一个强调色**——陶土橙在同一视口内不出现第二次。
3. **动效不阻塞阅读**——任何入场动画在 700ms 内结束。

---

## 2. 色彩系统 `【推断】`

### 2.1 基础色板

| Token | Hex | 角色 | 说明 |
| --- | --- | --- | --- |
| `--c-bone` | `#F5F2EC` | 主背景 | 暖调米白，替代纯白，是全站默认底色 |
| `--c-sand` | `#E8E2D6` | 次级背景 | 交替区块、卡片底、输入框底 |
| `--c-clay-50` | `#DED6C7` | 分隔 / 描边 | 1px 线、禁用态底色 |
| `--c-ink` | `#14201A` | 主文字 | 带绿味的近黑，不使用 `#000` |
| `--c-forest` | `#22392C` | 深色区块底 | 页脚、深色 section、主按钮底 |
| `--c-moss` | `#3F5B45` | 深色区块次级 | 深底上的卡片、hover 态 |
| `--c-sage` | `#94A78D` | 深底上的正文 | 深色区块内的次要文字 |
| `--c-stone` | `#6E6A5F` | 浅底上的次要文字 | 说明文字、caption、占位符 |
| `--c-rust` | `#B85C38` | 强调色 | 链接、标签、关键数字、图表主色 |
| `--c-ochre` | `#D9A441` | 装饰色 | 仅用于图形/插画/徽章，不用于文字 |
| `--c-white` | `#FFFFFF` | 纯白 | 仅用于深底上的标题与图片留边 |

### 2.2 使用配比

严格遵循 **60 / 30 / 10**：

- **60%** `--c-bone` / `--c-sand`——背景
- **30%** `--c-ink` / `--c-forest`——文字与深色区块
- **10%** `--c-rust` / `--c-sage`——强调与点缀

`--c-ochre` 不计入配比，全站出现频率控制在 3 处以内。

### 2.3 对比度校验（已按 WCAG 计算）

| 前景 | 背景 | 比值 | 结论 |
| --- | --- | --- | --- |
| `--c-ink` `#14201A` | `--c-bone` `#F5F2EC` | **16.0 : 1** | ✅ AAA，正文默认组合 |
| `--c-stone` `#6E6A5F` | `--c-bone` `#F5F2EC` | **4.83 : 1** | ✅ AA 正文；❌ 不达 AAA |
| `--c-rust` `#B85C38` | `--c-bone` `#F5F2EC` | **4.06 : 1** | ⚠️ 仅限 ≥24px 或 ≥18.66px 粗体；**禁止用于小号正文** |
| `--c-bone` `#F5F2EC` | `--c-forest` `#22392C` | **11.1 : 1** | ✅ AAA，深色区块正文 |
| `--c-sage` `#94A78D` | `--c-forest` `#22392C` | **4.83 : 1** | ✅ AA，深底次要文字 |

**硬规则**：`--c-rust` 作为正文链接色时，必须同时带下划线，不得仅靠颜色区分。

### 2.4 配色组合（只允许这 4 种）

| 组合 | 背景 | 标题 | 正文 | 强调 |
| --- | --- | --- | --- | --- |
| A · 默认 | `bone` | `ink` | `ink` / `stone` | `rust` |
| B · 交替 | `sand` | `ink` | `stone` | `rust` |
| C · 深色 | `forest` | `bone` | `sage` | `ochre` |
| D · 图片压字 | 图片 + 遮罩 | `white` | `white` | 无 |

组合 D 的遮罩规范：`linear-gradient(to top, rgba(20,32,26,.55), rgba(20,32,26,0) 60%)`，文字区域实测对比度必须 ≥ 4.5:1。

---

## 3. 字体系统 `【推断】`

### 3.1 字族

| 用途 | 首选（商用） | 开源替代 | 中文 |
| --- | --- | --- | --- |
| Display / 标题 | PP Editorial New | **Fraunces**（可变，带 optical size） | 思源宋体 Noto Serif SC |
| 正文 / UI | Suisse Int'l | **Inter Tight** | 思源黑体 Noto Sans SC |
| 标签 / 数据 | — | **IBM Plex Mono** | — |

```css
--font-display: "Fraunces", "Noto Serif SC", Georgia, serif;
--font-sans:    "Inter Tight", "Noto Sans SC", -apple-system, "Helvetica Neue", sans-serif;
--font-mono:    "IBM Plex Mono", ui-monospace, monospace;
```

字重只用三档：**400 / 500 / 700**。禁止使用 300 以下（正文发虚）与 800 以上（破坏克制感）。

### 3.2 字号阶梯（流体，clamp 从 375px 到 1440px）

| 级别 | font-size | line-height | letter-spacing | 字族 | 用途 |
| --- | --- | --- | --- | --- | --- |
| `display` | `clamp(48px, 6.5vw, 104px)` | `0.95` | `-0.03em` | display | 首屏主标题，全站仅 1 处 |
| `h1` | `clamp(36px, 4.2vw, 64px)` | `1.02` | `-0.02em` | display | 章节主标题 |
| `h2` | `clamp(28px, 3vw, 44px)` | `1.08` | `-0.015em` | display | 子章节 |
| `h3` | `clamp(22px, 2vw, 30px)` | `1.15` | `-0.01em` | sans 500 | 卡片标题 |
| `h4` | `20px` | `1.30` | `0` | sans 500 | 列表小标题 |
| `body-lg` | `18px` | `1.60` | `0` | sans 400 | 导语、引言段 |
| `body` | `16px` | `1.65` | `0` | sans 400 | 正文默认 |
| `body-sm` | `14px` | `1.60` | `0` | sans 400 | 辅助说明 |
| `caption` | `13px` | `1.45` | `0.01em` | sans 400 | 图注、脚注 |
| `overline` | `12px` | `1.20` | `0.14em` | mono / sans 500 | 全大写标签、章节序号 |

### 3.3 排版规则

- **行长**：正文 `max-width: 68ch`，导语 `max-width: 56ch`。超出必须分栏。
- **标题禁止全大写**，除 `overline` 外。全大写只用于 12px 标签，且必须加 `0.14em` 字距。
- **负字距只给大字**：≥28px 才使用负 `letter-spacing`，正文一律 `0`。
- **中英混排**：中文标题的 `letter-spacing` 归零（负字距会让中文粘连），`line-height` 比英文加 `0.1`。
- **孤字处理**：标题用 `text-wrap: balance`，正文用 `text-wrap: pretty`。
- **数字**：价格、参数使用 `font-variant-numeric: tabular-nums`。

---

## 4. 留白与间距 `【推断】`

### 4.1 间距标度（4px 基数）

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160 · 200
```

只允许使用标度内的值。禁止出现 `18px`、`30px`、`50px` 这类标度外数值。

| Token | 值 | 典型用途 |
| --- | --- | --- |
| `--sp-1` | 4px | 图标与文字间隙 |
| `--sp-2` | 8px | 标签内边距 |
| `--sp-3` | 12px | 表单内间距 |
| `--sp-4` | 16px | 卡片内边距（移动端） |
| `--sp-6` | 24px | 栅格 gutter、卡片内边距 |
| `--sp-8` | 32px | 卡片内边距（桌面端） |
| `--sp-12` | 48px | 组件之间 |
| `--sp-16` | 64px | 子模块之间 |
| `--sp-24` | 96px | 章节内分组 |
| `--sp-32` | 128px | **章节之间（移动端）** |
| `--sp-40` | 160px | **章节之间（桌面端）** |
| `--sp-50` | 200px | 首屏与次屏之间 |

### 4.2 垂直节奏

```
section 上下 padding：clamp(96px, 12vw, 160px)
标题 → 正文：24px
正文 → CTA：48px
卡片网格行间距：64px（桌面）/ 48px（移动）
```

**留白铁律**：章节间距必须 ≥ 该章节内部最大间距的 **2 倍**。内部最大间距 64px，则章节间距至少 128px——这是"呼吸感"的唯一来源。

### 4.3 页面边距

| 断点 | 左右边距 |
| --- | --- |
| < 768px | 24px |
| 768–1279px | 48px |
| ≥ 1280px | `clamp(64px, 5vw, 96px)` |

---

## 5. 栅格与布局

### 5.1 栅格参数

| 断点 | 列数 | Gutter | 容器最大宽 |
| --- | --- | --- | --- |
| Mobile < 768px | 4 | 16px | 100% |
| Tablet 768–1023px | 8 | 20px | 100% |
| Desktop 1024–1439px | 12 | 24px | 1200px |
| Wide ≥ 1440px | 12 | 24px | **1440px**（内容）/ 1600px（图片可溢出） |

```css
.container { max-width: 1440px; margin-inline: auto; padding-inline: var(--page-gutter); }
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
```

### 5.2 常用布局模式

| 模式 | 桌面列占位 | 用途 |
| --- | --- | --- |
| 全宽图 | `1 / -1`（可 bleed 出容器） | 首屏、大图分隔 |
| 居中正文 | `4 / 10`（6 列） | 长文、品牌故事 |
| 偏置标题 | 标题 `1 / 6`，正文 `7 / 12` | 章节头，制造不对称 |
| 图文对开 | 图 `1 / 7`，文 `8 / 12` | 产品介绍，左右交替 |
| 三卡网格 | 每卡 4 列 | 产品列表 |
| 四卡网格 | 每卡 3 列 | 次级列表 |
| 错落双列 | 左列 `1 / 6`，右列 `7 / 12` 且 `margin-top: 96px` | 编辑感图集 |

**不对称原则**：整页至少有 **2 处**内容不居中——瑞士排版的张力来自轴线偏移，全部居中会变成模板感。

---

## 6. 图片规范

### 6.1 比例

| 比例 | 用途 |
| --- | --- |
| **21 : 9** | 首屏横幅、章节分隔大图 |
| **16 : 9** | 视频、场景图 |
| **4 : 3** | 通用内容图 |
| **1 : 1** | 网格图集、头像、小卡片 |
| **4 : 5** | 编辑式竖图（首选竖版比例） |
| **3 : 4** | 产品主图（站内产品卡统一使用） |

同一网格内的图片**必须使用同一比例**，通过 `aspect-ratio` 强制，禁止靠 `height` 撑开。

```css
.media { aspect-ratio: 3 / 4; overflow: hidden; }
.media img { width: 100%; height: 100%; object-fit: cover; }
```

### 6.2 图片处理

- **圆角**：内容图 `8px`；全宽 bleed 图 `0`；产品卡内图 `继承卡片圆角 - 边距`。
- **色调**：统一轻微降饱和 `saturate(0.95)` + 暖色偏移，使摄影素材与米白底融合。禁止高饱和原图直出。
- **底色占位**：图片加载前用 `--c-sand` 填充，避免白闪。
- **格式**：AVIF → WebP → JPG 三级回退；首屏图 `fetchpriority="high"`，其余 `loading="lazy"` + `decoding="async"`。
- **图注**：`caption` 级别，`--c-stone`，与图片间距 12px，左对齐于图片左边缘。

---

## 7. 组件规范

### 7.1 圆角与描边

```css
--radius-sm:   4px;   /* 标签、输入框 */
--radius-md:   8px;   /* 内容图、小卡片 */
--radius-lg:  16px;   /* 产品卡、弹层 */
--radius-pill: 999px; /* 按钮 */
--border: 1px solid var(--c-clay-50);
```

**阴影极度克制**——全站只允许两级，且不用于静态展示，仅用于浮起态：

```css
--shadow-hover: 0 8px 24px rgba(20, 32, 26, 0.08);
--shadow-overlay: 0 24px 64px rgba(20, 32, 26, 0.16); /* 仅 modal / dropdown */
```

静态卡片**不带阴影**，靠底色差与 1px 描边区分层级。

### 7.2 卡片

| 属性 | 值 |
| --- | --- |
| 背景 | `--c-bone`（在 `sand` 区块上）/ `--c-sand`（在 `bone` 区块上） |
| 圆角 | `--radius-lg` 16px |
| 描边 | `1px solid --c-clay-50`（仅当卡片与背景同色系时） |
| 内边距 | 桌面 32px / 移动 24px |
| 图片 | 顶部满宽，比例 3:4，圆角只留上方两角 |
| 结构 | 图片 → `overline` 分类 → `h3` 标题 → `body-sm` 描述 → 价格/链接 |
| 内部间距 | 图片→overline 24px；overline→标题 8px；标题→描述 12px；描述→底部 24px |
| hover | 卡片 `translateY(-4px)` + `--shadow-hover`；内部图片 `scale(1.04)`；400ms |

卡片文字**左对齐**，不居中。卡片高度靠 `grid` 等高，不靠固定 `height`。

### 7.3 按钮

| 类型 | 背景 | 文字 | 描边 | hover |
| --- | --- | --- | --- | --- |
| Primary | `--c-forest` | `--c-bone` | 无 | 背景 → `--c-moss` |
| Secondary | 透明 | `--c-ink` | `1px --c-ink` | 背景 → `--c-ink`，文字 → `--c-bone` |
| Tertiary（文字链接） | 无 | `--c-rust` | 无 | 下划线由左向右展开 |

尺寸：

```
高度  48px（桌面）/ 44px（移动，触控最小 44px）
内边距 0 32px
字号  14px / 500 / letter-spacing 0.02em
圆角  --radius-pill
```

**焦点态必须可见**：`outline: 2px solid var(--c-rust); outline-offset: 3px;` 禁止 `outline: none`。

### 7.4 导航

- 高度 72px（桌面）/ 60px（移动），`position: sticky; top: 0`。
- 初始态**透明**叠在首屏图上，文字 `--c-white`。
- 滚动超过 `80px` 后切换为 `--c-bone` 背景 + `--c-ink` 文字 + 底部 1px `--c-clay-50`，过渡 300ms。
- 向下滚动隐藏、向上滚动显现（`translateY(-100%)` / `0`，400ms）。
- 菜单项字号 14px，字距 `0.02em`，hover 时下方 1px 线由左向右展开 300ms。
- 移动端为全屏覆盖菜单，背景 `--c-forest`，菜单项 `h2` 级别，逐项 stagger 60ms 入场。

### 7.5 表单

```
输入框：高 52px，背景 --c-sand，无描边，圆角 --radius-sm
聚焦：底部 2px --c-forest 线，背景转 --c-bone
占位符：--c-stone
标签：overline 级别，位于输入框上方 8px
错误：--c-rust 文字 + 左侧 2px --c-rust 竖线，13px
```

### 7.6 页脚

- 背景 `--c-forest`，配色组合 C。
- 上下 padding 96px。
- 12 栅格：品牌区 `1 / 5`，链接三列各 2 列位于 `6 / 12`。
- 底部版权行 `caption` 级别，`--c-sage`，与上方间距 64px，中间 1px `rgba(245,242,236,.15)` 分隔线。

---

## 8. 动效规范 `【推断】`

### 8.1 时长与缓动

```css
--dur-fast:  200ms;  /* 颜色、透明度、小位移 */
--dur-base:  400ms;  /* hover、卡片浮起、导航切换 */
--dur-slow:  700ms;  /* 入场揭示、图片视差 */
--ease-out:  cubic-bezier(0.22, 1, 0.36, 1);    /* 默认，快出慢收 */
--ease-io:   cubic-bezier(0.65, 0, 0.35, 1);    /* 双向动画 */
```

**唯一缓动原则**：全站默认 `--ease-out`，除非是往返型动画才用 `--ease-io`。禁止 `linear`（跑马灯除外）、禁止 `ease-in`（起步迟钝）。

### 8.2 滚动揭示

| 参数 | 值 |
| --- | --- |
| 触发 | `IntersectionObserver`，`rootMargin: "0px 0px -15% 0px"` |
| 初始 | `opacity: 0; transform: translateY(24px);` |
| 结束 | `opacity: 1; transform: none;` |
| 时长 | `--dur-slow` 700ms |
| 组内 stagger | 80ms/项，**上限 5 项**（超过则整组一次性出现） |
| 触发次数 | 仅一次，不做反向消失 |

标题的进阶做法：按行切分（`overflow: hidden` 的行容器 + 子元素 `translateY(100%) → 0`），逐行 stagger 80ms。**仅用于 `display` 与 `h1`**，其余标题用整块淡入。

### 8.3 其他动效

| 场景 | 规则 |
| --- | --- |
| 图片视差 | 图片高度 `110%`，滚动位移上限 `±5%`，用 `transform` 实现，禁止改 `background-position` |
| 图片 hover | `scale(1) → scale(1.04)`，600ms，容器 `overflow: hidden` |
| 链接下划线 | `scaleX(0) → scaleX(1)`，`transform-origin: left`，300ms |
| 跑马灯 | `linear` 无限循环，单圈 40s，hover 时降速至 0.3 倍而非停止 |
| 数字滚动 | 进入视口后 1200ms 计数，`--ease-out` |
| 页面切换 | `--c-bone` 遮罩由下往上覆盖 500ms → 内容替换 → 由上往下揭开 500ms |
| 光标 | 桌面端自定义光标：默认 8px 圆点，悬停可点击元素时放大至 40px 圆环，跟随用 `lerp 0.15` |

### 8.4 性能与可访问性

- 只动画 `transform` 与 `opacity`。禁止动画 `width` / `height` / `top` / `left` / `margin`。
- `will-change` 仅在动画开始前添加，结束后移除。
- 必须实现：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

减弱动效模式下，滚动揭示直接呈现最终态（`opacity: 1`），**不得让内容因动效被禁用而不可见**。

---

## 9. 响应式断点

```css
--bp-sm:  480px;
--bp-md:  768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
--bp-2xl: 1440px;
```

移动端降级规则：

- 图文对开 → 上下堆叠，图在上。
- 三/四卡网格 → 单列（`< 768px`）或双列（`768–1023px`）。
- 错落双列 → 取消 `margin-top` 偏移，回归对齐。
- `display` 级标题降至 `clamp` 下限 48px。
- 视差与自定义光标在触屏设备**完全关闭**（`@media (hover: hover)` 判定）。

---

## 10. 可访问性清单

- [ ] 正文对比度 ≥ 4.5:1，大字 ≥ 3:1（见 2.3 表）
- [ ] `--c-rust` 不用于 16px 及以下正文
- [ ] 链接不仅靠颜色区分，必须有下划线或图标
- [ ] 所有可交互元素焦点态可见，`outline-offset: 3px`
- [ ] 触控目标 ≥ 44 × 44px
- [ ] 图片有 `alt`；装饰性图片 `alt=""`
- [ ] 标题层级不跳级（h1 → h2 → h3）
- [ ] 实现 `prefers-reduced-motion`
- [ ] 表单 `label` 与 `input` 通过 `for` / `id` 关联
- [ ] 键盘可完成全部核心流程（导航、表单、弹层含焦点陷阱与 ESC 关闭）

---

## 11. Design Tokens

### 11.1 CSS 变量

```css
:root {
  /* ---- Color ---- */
  --c-bone:    #F5F2EC;
  --c-sand:    #E8E2D6;
  --c-clay-50: #DED6C7;
  --c-ink:     #14201A;
  --c-forest:  #22392C;
  --c-moss:    #3F5B45;
  --c-sage:    #94A78D;
  --c-stone:   #6E6A5F;
  --c-rust:    #B85C38;
  --c-ochre:   #D9A441;
  --c-white:   #FFFFFF;

  /* 语义映射 */
  --bg:          var(--c-bone);
  --bg-alt:      var(--c-sand);
  --bg-invert:   var(--c-forest);
  --text:        var(--c-ink);
  --text-muted:  var(--c-stone);
  --text-invert: var(--c-bone);
  --accent:      var(--c-rust);
  --border-color: var(--c-clay-50);

  /* ---- Type ---- */
  --font-display: "Fraunces", "Noto Serif SC", Georgia, serif;
  --font-sans:    "Inter Tight", "Noto Sans SC", -apple-system, "Helvetica Neue", sans-serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace;

  --fs-display:  clamp(48px, 6.5vw, 104px);
  --fs-h1:       clamp(36px, 4.2vw, 64px);
  --fs-h2:       clamp(28px, 3vw, 44px);
  --fs-h3:       clamp(22px, 2vw, 30px);
  --fs-h4:       20px;
  --fs-body-lg:  18px;
  --fs-body:     16px;
  --fs-body-sm:  14px;
  --fs-caption:  13px;
  --fs-overline: 12px;

  /* ---- Space ---- */
  --sp-1: 4px;   --sp-2: 8px;    --sp-3: 12px;  --sp-4: 16px;
  --sp-6: 24px;  --sp-8: 32px;   --sp-12: 48px; --sp-16: 64px;
  --sp-24: 96px; --sp-32: 128px; --sp-40: 160px; --sp-50: 200px;

  --page-gutter:     clamp(24px, 5vw, 96px);
  --section-padding: clamp(96px, 12vw, 160px);
  --container-max:   1440px;
  --grid-gutter:     24px;

  /* ---- Radius / Shadow ---- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --shadow-hover:   0 8px 24px rgba(20, 32, 26, 0.08);
  --shadow-overlay: 0 24px 64px rgba(20, 32, 26, 0.16);

  /* ---- Motion ---- */
  --dur-fast: 200ms;
  --dur-base: 400ms;
  --dur-slow: 700ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-io:  cubic-bezier(0.65, 0, 0.35, 1);
}
```

### 11.2 Tailwind 配置

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        bone: '#F5F2EC',
        sand: '#E8E2D6',
        clay: '#DED6C7',
        ink: '#14201A',
        forest: '#22392C',
        moss: '#3F5B45',
        sage: '#94A78D',
        stone: '#6E6A5F',
        rust: '#B85C38',
        ochre: '#D9A441',
      },
      fontFamily: {
        display: ['Fraunces', 'Noto Serif SC', 'Georgia', 'serif'],
        sans: ['Inter Tight', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display:  ['clamp(48px,6.5vw,104px)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        h1:       ['clamp(36px,4.2vw,64px)',  { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        h2:       ['clamp(28px,3vw,44px)',    { lineHeight: '1.08', letterSpacing: '-0.015em' }],
        h3:       ['clamp(22px,2vw,30px)',    { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'body-lg':['18px', { lineHeight: '1.6' }],
        body:     ['16px', { lineHeight: '1.65' }],
        'body-sm':['14px', { lineHeight: '1.6' }],
        caption:  ['13px', { lineHeight: '1.45' }],
        overline: ['12px', { lineHeight: '1.2', letterSpacing: '0.14em' }],
      },
      spacing: {
        24: '96px', 32: '128px', 40: '160px', 50: '200px',
      },
      borderRadius: { sm: '4px', md: '8px', lg: '16px', pill: '999px' },
      maxWidth: { container: '1440px', prose: '68ch', lead: '56ch' },
      aspectRatio: { product: '3 / 4', editorial: '4 / 5', ultra: '21 / 9' },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22,1,0.36,1)',
        io:  'cubic-bezier(0.65,0,0.35,1)',
      },
      transitionDuration: { fast: '200ms', base: '400ms', slow: '700ms' },
    },
  },
}
```

---

## 12. 落地检查清单

**做（Do）**

- [ ] 章节间距 ≥ 128px，并大于内部最大间距的 2 倍
- [ ] 每屏只有一个视觉焦点
- [ ] 网格内图片比例完全统一
- [ ] 整页至少 2 处不对称排布
- [ ] 正文行长限制在 68ch 内
- [ ] 间距全部取自 4px 标度
- [ ] 强调色每屏最多出现一次
- [ ] 动效只用 `transform` / `opacity`

**不做（Don't）**

- [ ] ❌ 纯白 `#FFF` 背景 / 纯黑 `#000` 文字
- [ ] ❌ 静态卡片带阴影
- [ ] ❌ 标题全大写（`overline` 除外）
- [ ] ❌ 正文使用 `--c-rust`
- [ ] ❌ 渐变背景、发光、玻璃拟态
- [ ] ❌ 超过 5 项的 stagger 动画
- [ ] ❌ 入场动画超过 700ms
- [ ] ❌ 标度外的"随手"间距值
- [ ] ❌ 移除 `outline` 焦点态

---

## 附录 · 校正待办

拿到 `sutera.ch` 与 `wastenot.world` 的真实数据后，按以下顺序替换：

| 优先级 | 待校正项 | 所在章节 |
| --- | --- | --- |
| P0 | 11 个色值 hex（取自 wastenot.world） | 2.1 / 11.1 |
| P0 | 字体家族真实名称（取自 sutera.ch） | 3.1 / 11.1 |
| P1 | display / h1 的实际 px 与 line-height | 3.2 |
| P1 | 容器最大宽与页面边距实测值 | 5.1 / 4.3 |
| P2 | 章节 padding 实测值 | 4.2 |
| P2 | 动效时长与缓动曲线（DevTools Animations 面板可读出） | 8.1 |
| P2 | 产品卡图片实际比例 | 6.1 |

替换完成后，第 2.3 节的对比度表需要重新计算。
