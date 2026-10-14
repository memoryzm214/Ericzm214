/* lessons/l23.js — 2-3 显示模块
   Guide: ../arduino-ppt/assets/l23/guide_text.md (PDF 7 pages). Two experiments in the guide's order:
     ① WS2812b RGB LED 模块实验 ② 串行 LCD1602 模块动态显示屏实验（程序①扫描 I2C 地址 · 程序②显示字符）
   Explanations, analogies, line notes, pitfalls and 动手改一改 ideas ported from the reviewed PowerPoint script
   ../arduino-ppt/build/23_lesson_2-3.js. Programs are copied verbatim from the guide's ```cpp blocks
   (generated, see the three constants below). The guide has no mBlock / Mixly pages.
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- programs copied verbatim from arduino-ppt/assets/l23/guide_text.md (```cpp blocks 1–3)
  const RING = `
#include <Adafruit_NeoPixel.h>    //引入头文件

#define LED_Pin        10  //定义信号输出引脚
#define  PIXEL_COUNT    12  //定义LED灯个数
int count= 12;
Adafruit_NeoPixel pixels(PIXEL_COUNT, LED_Pin, NEO_GRB + NEO_KHZ800);

void setup() {
//灯条初始化
  pixels.begin();
  pixels.show();
  pixels.setBrightness(30);
}

void loop() {
  for (int i = 0; i < count; i++)
  {
    pixels.setPixelColor(i, pixels.Color(127, 127, 127)); //白色
    pixels.show();
  }
}
`;
  const SCANNER = `
void setup()
{
  Serial.begin (9600); // Leonardo: wait for serial port to connect
  while (!Serial) { }
  Serial.println ();
  Serial.println ("I2C scanner. Scanning ...");
  byte count = 0;
  Wire.begin();
  for (byte i = 8; i < 120; i++) {
    Wire.beginTransmission (i);
    if (Wire.endTransmission () == 0) {
      Serial.print ("Found address: ");
      Serial.print (i, DEC);
      Serial.print (" (0x");
      Serial.print (i, HEX);
      Serial.println (")");
      count++;
      delay (1); // maybe unneeded?
    } // end of good response
  } // end of for loop
  Serial.println ("Done.");
  Serial.print ("Found ");
  Serial.print (count, DEC);
  Serial.println (" device(s).");
} // end of setup
void loop()
{
}
`;
  const LCD = `
#include <Wire.h>
#include "LiquidCrystal_I2C.h"

LiquidCrystal_I2C lcd(0x27,16,2);   // set the LCD address to 0x27 for a 16 chars and 2 line display

void setup()
{
    lcd.init();                      // initialize the lcd
    // Print a message to the LCD.
    lcd.backlight();
    lcd.setCursor(0,0); // go to start of 2nd line
    lcd.print("Hello Word");
    lcd.setCursor(4,1); // go to start of 2nd line
    lcd.print("Science Robot");
}

void loop()
{
}
`;

  // The guide's scanner has no `#include <Wire.h>` (guide_text.md): the fixed version adds exactly that one
  // line in front, nothing else (so its line numbers are the guide's + 1).
  const SCAN_FIXED = '#include <Wire.h>' + SCANNER;

  // ---- task reference code (built from the originals so they stay in sync)
  const RING_BLUE = RING.replace('pixels.Color(127, 127, 127)); //白色', 'pixels.Color(0, 0, 127)); //蓝色');
  const RING_BRIGHT = RING.replace('pixels.setBrightness(30);', 'pixels.setBrightness(255);');
  const RING_NOSHOW = RING.replace('    pixels.show();\n  }\n}', '    // pixels.show();\n  }\n}');
  const RING_CHASE = RING.replace('    pixels.show();\n  }\n}',
    '    pixels.show();\n    delay(100);\n  }\n  pixels.clear();\n  pixels.show();\n  delay(500);\n}');
  const SCAN_SHORT = SCAN_FIXED.replace('i < 120', 'i < 30');
  const LCD_NAME = LCD.replace('lcd.print("Hello Word");', 'lcd.print("Hello World");')
    .replace('lcd.setCursor(4,1); // go to start of 2nd line\n    lcd.print("Science Robot");',
      'lcd.setCursor(0,1); // go to start of 2nd line\n    lcd.print("I am Li Ming");');
  const LCD_CLOCK = LCD.replace('void loop()\n{\n}', 'void loop()\n{\n  lcd.setCursor(0,1);\n  lcd.print(millis()/1000);\n  delay(200);\n}');

  // ---- small HTML helpers (markup only)
  const ico = (n, cls) => `<span class="ico${cls ? ' ' + cls : ''}">${I(n)}</span>`;
  const card = (ic, title, body, cls) => `<div class="card${cls ? ' ' + cls : ''}"><h3>${ico(ic, cls === 'warn' ? 'red' : '')}${title}</h3>${body}</div>`;
  const warnCard = (title, body) => card('warn', title, body, 'warn');
  const callout = (ic, title, text, cls) => `<div class="callout${cls ? ' ' + cls : ''}"><span class="ico">${I(ic)}</span><div>${title ? `<b>${title}</b>` : ''}<p>${text}</p></div></div>`;
  const tile = (n, b, s, cls) => `<div class="tile${cls ? ' ' + cls : ''}"><div class="n">${n}</div><b>${b}</b><span>${s}</span></div>`;
  const chips = items => `<div class="chips">${items.map(t => `<span class="tag outline">${t}</span>`).join('')}</div>`;
  const codeTags = items => `<div class="chips">${items.map(t => `<code>${t}</code>`).join('')}</div>`;
  const fig = (src, cap) => `<figure class="figure"><img src="img/l23/${src}" alt="${cap.replace(/<[^>]*>/g, '')}"><figcaption>${cap}</figcaption></figure>`;
  const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const snippet = code => `<pre class="snippet"><code>${escH(code)}</code></pre>`;

  // LCD1602 as a 16 × 2 grid of cells (theme-safe: currentColor + tokens).
  // rows: two 16-char strings; hl: ['c,r', …] highlighted cells; numbers: column / row index labels
  const lcdSvg = (rows, opt) => {
    opt = opt || {};
    const hl = new Set(opt.hl || []);
    const cw = 24, chh = 32, ox = opt.numbers ? 24 : 4, oy = opt.numbers ? 20 : 4;
    let s = '';
    if (opt.numbers) {
      for (let c = 0; c < 16; c++) s += `<text x="${ox + c * cw + cw / 2}" y="14" font-size="13" text-anchor="middle" fill="var(--muted)">${c}</text>`;
      for (let r = 0; r < 2; r++) s += `<text x="10" y="${oy + r * chh + chh / 2 + 5}" font-size="13" text-anchor="middle" fill="var(--muted)">${r}</text>`;
    }
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 16; c++) {
        const on = hl.has(c + ',' + r);
        const ch = (rows[r] || '')[c] || ' ';
        s += `<rect x="${ox + c * cw}" y="${oy + r * chh}" width="${cw}" height="${chh}" fill="${on ? 'var(--turq)' : 'var(--surface)'}" stroke="var(--line)"/>`;
        if (ch !== ' ') s += `<text x="${ox + c * cw + cw / 2}" y="${oy + r * chh + 22}" font-size="17" font-weight="600" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" fill="${on ? '#2D2D2D' : 'currentColor'}">${escH(ch)}</text>`;
      }
    }
    return `<svg viewBox="0 0 ${ox + 16 * cw + 4} ${oy + 2 * chh + 4}" width="100%" role="img" aria-label="${escH(opt.label || 'LCD1602 的 16 × 2 个字符格')}" style="display:block">${s}</svg>`;
  };

  // Line 2 of the LCD: 16 cells inside the screen frame, the 17th cell (index 16) outside it, in red
  const row2Svg = (() => {
    const text = '    Science Robot';
    const cw = 24, ox = 4, oy = 20, h = 32;
    let s = `<rect x="${ox - 3}" y="${oy - 3}" width="${16 * cw + 6}" height="${h + 6}" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>`;
    for (let c = 0; c < 17; c++) {
      const out = c === 16, x = ox + c * cw + (out ? 8 : 0);
      s += out
        ? `<rect x="${x}" y="${oy}" width="${cw}" height="${h}" rx="3" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="4 3"/>`
        : `<rect x="${x}" y="${oy}" width="${cw}" height="${h}" fill="${c >= 4 ? 'var(--turq-pale)' : 'var(--surface)'}" stroke="var(--line)"/>`;
      if (text[c] && text[c] !== ' ') s += `<text x="${x + cw / 2}" y="${oy + 23}" font-size="18" font-weight="600" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" fill="${out ? 'var(--red)' : 'currentColor'}">${text[c]}</text>`;
      if (c === 0 || c === 4 || c === 15 || c === 16) s += `<text x="${x + cw / 2}" y="14" font-size="14" text-anchor="middle" fill="${out ? 'var(--red)' : 'var(--muted)'}">${c}</text>`;
    }
    return `<svg viewBox="0 0 ${ox + 17 * cw + 14} ${oy + h + 6}" width="100%" role="img" aria-label="第 2 行：从第 4 号格开始写 Science Robot，最后的 t 落在第 16 号格，在屏幕外" style="display:block">${s}</svg>`;
  })();

  // I2C bus: UNO on the left, SDA / SCL lines, three devices hanging on the bus with their addresses.
  // Compact viewBox (400 wide) so the labels stay readable on a 390 px phone.
  const busSvg = (() => {
    const devs = [{ x: 110, t: 'LCD1602', a: '0x27', on: true }, { x: 206, t: '另一块 LCD', a: '0x26' }, { x: 302, t: '其他模块', a: '0x3C' }];
    let s = `<rect x="4" y="12" width="70" height="72" rx="8" fill="var(--char)" stroke="var(--line)"/>` +
      `<text x="39" y="43" font-size="17" font-weight="600" text-anchor="middle" fill="#fff">UNO</text>` +
      `<text x="39" y="66" font-size="13" text-anchor="middle" fill="#fff">A4 · A5</text>` +
      `<path d="M74 30H396" stroke="var(--turq-deep)" stroke-width="3"/><path d="M74 66H396" stroke="currentColor" stroke-width="3"/>` +
      `<text x="80" y="23" font-size="13" font-weight="700" fill="var(--turq-deep)">SDA</text>` +
      `<text x="80" y="59" font-size="13" font-weight="700" fill="currentColor">SCL</text>` +
      `<text x="4" y="120" font-size="14" font-weight="600" fill="var(--turq-deep)">SDA 数据线</text>` +
      `<text x="4" y="146" font-size="14" font-weight="600" fill="currentColor">SCL 时钟线</text>`;
    for (const d of devs) {
      s += `<path d="M${d.x + 26} 30V104" stroke="var(--turq-deep)" stroke-width="2"/><path d="M${d.x + 62} 66V104" stroke="currentColor" stroke-width="2"/>` +
        `<rect x="${d.x}" y="104" width="88" height="58" rx="8" fill="${d.on ? 'var(--turq)' : 'var(--surface)'}" stroke="${d.on ? 'var(--turq)' : 'var(--line)'}"/>` +
        `<text x="${d.x + 44}" y="127" font-size="14" font-weight="600" text-anchor="middle" fill="${d.on ? '#2D2D2D' : 'currentColor'}">${d.t}</text>` +
        `<text x="${d.x + 44}" y="151" font-size="16" font-weight="600" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" fill="${d.on ? '#2D2D2D' : 'currentColor'}">${d.a}</text>`;
    }
    return `<svg viewBox="0 0 400 168" width="100%" role="img" aria-label="I2C 总线：UNO 的 SDA、SCL 两根线上挂着地址 0x27、0x26、0x3C 三个设备" style="display:block">${s}</svg>`;
  })();

  const LIT = '/^([1-9]|1[01])$/';   // some, but not all 12 pixels lit

  SIM.deck.register({
    id: 'l23', no: '2-3', title: '显示模块',
    subtitle: 'WS2812b RGB 灯环 · LCD1602 显示屏',
    experiments: ['WS2812b RGB LED 模块实验', '串行 LCD1602 模块动态显示屏实验'],
    slides: [
      {
        kind: 'cover',
        title: '显示模块',
        subtitle: 'WS2812b RGB 灯环 · LCD1602 显示屏\n2 个实验：让作品会发光，也会“说话”'
      },

      // ------------------------------------------------------------ 导览
      {
        kind: 'html',
        kicker: '2-3 显示模块　/　导入',
        title: '本节导览：两种“显示”',
        desc: '用彩灯显示颜色，用液晶屏显示文字。两个模块内部都很复杂，但都有人写好了“库”，我们装上就能用。',
        body: `
<div class="grid-2 stretch">
  ${card('sun', '实验 01　WS2812b RGB 灯环', `<p>12 颗彩灯串成一圈，只用 <b>1 根信号线</b>，就能让每颗灯单独变色。</p>${codeTags(['#include', 'Adafruit_NeoPixel', 'pixels.show()', 'setBrightness()'])}`, 'pale')}
  ${card('list', '实验 02　串行 LCD1602 显示屏', `<p>先扫描 I2C 地址，再让 16 × 2 的液晶屏显示两行英文。</p>${codeTags(['Wire', 'I2C 地址 0x27', 'lcd.setCursor()', 'lcd.print()'])}`)}
</div>
<h3 class="mt">两个实验共同的新本领</h3>
<div class="grid-3">
  ${tile('库', '#include', '引入别人写好的代码', 'turq')}
  ${tile('对象', '对象.函数()', '给模块下命令，如 lcd.print()')}
  ${tile('1 / 2', '少占引脚', '灯环 1 根信号线，屏幕 2 根', 'dark')}
</div>
${callout('play', '每个实验都有一个“动手实验室”', '在网页里运行指南的原程序：看灯环亮起、看串口扫描出地址、看屏幕显示文字，再按任务改几行代码。', 'mt')}`
      },

      // ================================================================ 实验 01 WS2812b
      {
        kind: 'section', no: '实验 01', title: 'WS2812b RGB LED <span style="white-space:nowrap">模块实验</span>',
        desc: '一圈 12 颗彩灯，只用 Arduino 的 1 个引脚就能全部点亮。这一课学会三样新本领：安装和引入“库”、用“对象”下命令、先写草稿再用 <code>show()</code> 发出去。',
        tiles: [
          { title: '认识', sub: '灯珠里藏着芯片' },
          { title: '接线', sub: '信号线 R → D10' },
          { title: '代码', sub: '库 · 对象 · show()' },
          { title: '动手', sub: '换颜色、调亮度' }
        ]
      },
      {
        kind: 'figure',
        title: '认识 WS2812b RGB 灯环',
        desc: '原指南：12 位 RGB 灯环采用 12 颗 WS2812 RGB 灯珠串联组成，只需要一个 IO 口就可以驱动此模块；每颗灯珠内部都集成了一个芯片。',
        img: 'img/l23/ws_module_photo.jpg',
        caption: '原指南：RGB LED 环形灯（正面 / 背面），正面下方 4 根针依次是 D、R、V、G',
        side: `
<div class="card">
  <h3>${ico('plug')}四个引脚（原指南）</h3>
  <dl class="kv">
    <dt class="mono">R</dt><dd>信号<b>输入</b>：控制灯珠颜色与串联数量 → 接 10 号脚</dd>
    <dt class="mono">D</dt><dd>信号<b>输出</b>：可以串连下一个灯珠（灯环）</dd>
    <dt class="mono">V</dt><dd>VDD 电源正极 → 5V</dd>
    <dt class="mono">G</dt><dd>电源负极 → GND</dd>
  </dl>
</div>
${callout('bulb', '比普通 RGB 灯强在哪', '普通 RGB 灯要 3 根信号线才能控制 1 颗；WS2812 每颗灯珠自带芯片，能自己“记住”颜色，1 根线就能分别控制 12 颗。')}
<div><p class="small muted">组件清单</p>${chips(['Arduino UNO R3 主板', 'USB 数据线', 'WS2812b RGB LED 模块 ×1', '若干跳线'])}</div>`
      },
      {
        kind: 'html',
        title: '实验原理：一根信号线串起 12 颗灯',
        desc: 'Arduino 一口气发出 12 份颜色数据：每颗灯留下属于自己的那一份，再把剩下的从 D 脚传给下一颗。',
        body: `
<div class="flow">
  <div class="on"><b>UNO 10 号脚</b><br><span class="small">发出 12 份颜色</span></div>
  <div><b>第 1 颗</b><br><span class="small">留下第 1 份，其余往后传</span></div>
  <div><b>第 2 颗</b><br><span class="small">留下第 2 份，其余往后传</span></div>
  <div><b>……</b><br><span class="small">每颗都一样</span></div>
  <div><b>第 12 颗</b><br><span class="small">留下最后 1 份</span></div>
  <div><b>下一个灯环</b><br><span class="small">从 D 脚还能再串</span></div>
</div>
<div class="grid-2 mt">
  <div class="stack">
    ${callout('bulb', '打个比方：像传纸条', '老师把 12 张纸条交给第 1 位同学：他留下第 1 张，把剩下的往后传……每颗灯都这样做，所以 12 颗灯只要 1 根信号线。每颗灯还会把信号重新“整理”一遍再转发，串得再长也不失真。')}
    ${warnCard('原指南有误：不是“16 万色”', '<p>红、绿、蓝各 256 级亮度，组合起来是 256 × 256 × 256 ≈ <b>1677 万</b>种颜色。</p>')}
  </div>
  ${card('list', '模块主要特点（原指南）', `<ul class="small">
    <li>5050 高亮 LED，内置控制芯片，仅需 1 个 IO 口即可控制多个 LED 模块</li>
    <li>芯片内置整形电路，信号畸变不会累计，稳定显示</li>
    <li>三基色 256 级亮度调节，“16 万色”真彩显示，扫描频率不低于 400Hz/S</li>
    <li>串行级联接口，能通过一根信号线完成数据的接收与解码</li>
    <li>刷新速率 30 帧/秒时，低速连级模式连级数不小于 512 点</li>
    <li>数据收发速度最高可达 800Kbps</li>
    <li>高亮 LED，光色亮度一致性高</li>
  </ul>`)}
</div>`
      },
      {
        kind: 'wiring',
        title: '接线：信号线接 10 号脚',
        desc: '只要三根线：10 号脚 → R（信号），5V → V，GND → G；D 脚空着，留给下一个灯环。先拔掉 USB 再接线。',
        img: 'img/l23/ws_wiring.jpg',
        caption: '原指南接线图：蓝线 10 → R · 红线 5V → V · 黑线 GND → G（最上面的 D 脚不接）',
        tables: [{ left: 'Arduino Uno', right: 'WS2812b RGB LED 模块', rows: [['10', 'R'], ['5V', 'V'], ['GND', 'G']] }],
        note: '<p>最常见的错误：信号线插到了相邻的 D 脚上。D 是信号<b>输出</b>，接它灯不会亮。</p>',
        side: callout('code', '', '程序里写的是 <code>#define LED_Pin 10</code>：信号线换到别的引脚，这个数也要跟着改。', 'gray')
      },
      {
        kind: 'html',
        title: '新语法①：库——给 Arduino 装“扩展包”',
        desc: '控制灯环的复杂代码，别人已经写好打包成了“库”：先在库管理器里安装，再用 <code>#include</code> 引进来。',
        body: `
<div class="grid-2 stretch">
  ${card('cube', '库 = 别人写好的“扩展包”', `
    <p>要让 WS2812 亮起来，得按微秒级的节奏发出一长串 0 和 1，自己写很难。Adafruit 公司把这些代码写好、打包成“库”，装上就能直接用——就像给手机装 App。</p>
    ${snippet('#include <Adafruit_NeoPixel.h>    //引入头文件')}
    <ul class="small">
      <li><code>#include</code> 写在程序最开头</li>
      <li><code>&lt; &gt;</code> 里是库的“说明书”文件（<code>.h</code> 头文件）</li>
      <li>一个库装一次，以后所有程序都能用</li>
    </ul>`)}
  <div class="stack">
    ${card('load', '安装步骤（每台电脑只需一次）', `<ol class="steps">
      <li>打开库管理器：菜单 <b>工具 → 管理库…</b></li>
      <li>在搜索框输入 <b>Adafruit NeoPixel</b></li>
      <li>找到作者是 Adafruit 的那个，点 <b>安装</b></li>
    </ol>`)}
    ${warnCard('没装库就编译，会报错', '<p><code>Adafruit_NeoPixel.h: No such file or directory</code>：意思是“找不到这个文件”，先去装库。</p>')}
    ${callout('play', '', '网页实验室里这些库已经“装好”了，直接运行就行。', 'gray')}
  </div>
</div>`
      },
      {
        kind: 'html',
        title: '新语法②：对象——pixels 是你的“灯环管家”',
        desc: '用库先“创建一个对象”，以后就用 <code>对象.函数()</code> 给它下命令，比如 <code>pixels.begin()</code>、<code>pixels.show()</code>。',
        body: `
<div class="grid-2 stretch">
  ${card('hand', '对象 = 一位“灯环管家”', `
    ${snippet('Adafruit_NeoPixel pixels(PIXEL_COUNT, LED_Pin, NEO_GRB + NEO_KHZ800);')}
    <div class="table-wrap"><table class="table">
      <tbody>
        <tr><td class="l mono">Adafruit_NeoPixel</td><td class="l">类型：管家的“种类”</td></tr>
        <tr class="hl"><td class="l mono">pixels</td><td class="l">名字：自己起，后面都用它</td></tr>
        <tr><td class="l mono">PIXEL_COUNT</td><td class="l">管几颗灯：12</td></tr>
        <tr><td class="l mono">LED_Pin</td><td class="l">接哪个脚：10</td></tr>
        <tr><td class="l mono">NEO_GRB</td><td class="l">颜色按 绿-红-蓝 的顺序发</td></tr>
        <tr><td class="l mono">NEO_KHZ800</td><td class="l">发送速度 800 kHz</td></tr>
      </tbody>
    </table></div>`)}
  <div class="stack">
    ${card('send', '对象.函数()：对管家下命令', `
      ${snippet('pixels.begin();   // 管家，准备开工\npixels.show();    // 管家，把颜色发出去')}
      <p>中间的 <code>.</code> 可以读成“的”：<code>pixels.show()</code> 就是“pixels 的 show 功能”。后面还会用到 <code>setPixelColor()</code>、<code>setBrightness()</code>。</p>`)}
    ${warnCard('名字要一字不差', '<p>写成 <code>Pixels.show()</code>（大写 P）就会报错：<code>\'Pixels\' was not declared in this scope</code>。</p>')}
  </div>
</div>`
      },
      {
        kind: 'html',
        title: '新语法③：先写草稿，再用 show() 寄出',
        desc: '<code>setPixelColor()</code> 只是把颜色写进 Arduino 里的“草稿”，<code>show()</code> 才把 12 颗灯的颜色一次性发出去。',
        body: `
<div class="grid-2 stretch">
  <div class="stack">
    ${callout('bulb', '像写信和寄信', '<code>setPixelColor()</code> 是在信纸上写“第几颗灯要什么颜色”，写多少行灯都不会变；<code>show()</code> 才是把信寄出去，灯环收到后一起变色。')}
    <div class="flow">
      <div><b>① 写信</b><br><code>setPixelColor(i, 颜色)</code><br><span class="small">把第 i 颗灯的颜色写进草稿，灯还没变</span></div>
      <div class="on"><b>② 寄出</b><br><code>show()</code><br><span class="small">整份草稿发给灯环，灯一起变色</span></div>
    </div>
    ${warnCard('只写不寄 = 灯不变', '<p>写完 <code>setPixelColor()</code> 却忘了 <code>show()</code>，灯一点反应都没有。</p>')}
  </div>
  <div class="stack">
    ${card('sun', 'pixels.Color(红, 绿, 蓝)', `
      <div class="table-wrap"><table class="table">
        <tbody>
          <tr><td class="mono">(255, 0, 0)</td><td class="l">红</td></tr>
          <tr><td class="mono">(0, 0, 255)</td><td class="l">蓝</td></tr>
          <tr class="hl"><td class="mono">(127, 127, 127)</td><td class="l">白（约一半亮度）</td></tr>
        </tbody>
      </table></div>
      <p class="small muted mt-s">三个数各 0～255，可混出约 1677 万种颜色。</p>`)}
    ${card('bolt', 'setBrightness(30)：亮度上限', `
      <p>整体亮度只留约 30/255（约 12%）：不刺眼，也更省电——12 颗灯全亮白光约 0.7 A，电脑 USB 口一般只能给 0.5 A。</p>
      <p class="small muted">实验室卡片上会看到 RGB(15,15,15)：127 × 30 ÷ 255 ≈ 15。</p>`, 'pale')}
  </div>
</div>`
      },
      {
        kind: 'code',
        title: '代码逐行看懂（1/2）：准备工作',
        desc: '先引入库、给数字起外号、创建灯环对象，再在 <code>setup()</code> 里让管家开工并设好亮度。',
        file: 'ws2812_ring.ino', code: RING, from: 1, to: 13, hl: [1, 6, 10, 11, 12],
        notes: [
          { line: 1, text: '引入 NeoPixel 库（要先安装）。注释“引入头文件”：<code>.h</code> 文件就是头文件。' },
          { line: [3, 4], text: '<code>#define</code> 起外号：<code>LED_Pin</code> 就是 10，<code>PIXEL_COUNT</code> 就是 12。末尾不加分号。' },
          { line: 5, text: '变量 <code>count</code> 也存 12，下面的 for 循环用它数灯。' },
          { line: 6, text: '创建灯环对象 <code>pixels</code>：管 12 颗灯、接 10 号脚。' },
          { line: [8, 9], text: '<code>setup()</code> 只运行一次；第 9 行是注释“灯条初始化”。' },
          { line: [10, 11], text: '<code>begin()</code> 让管家开工；<code>show()</code> 发出空草稿，先把灯全关掉。' },
          { line: 12, text: '亮度上限设为 30（最大 255）。' }
        ],
        foot: callout('book', '#define 和变量有什么不同？', '<code>#define</code> 只是编译前的“查找替换”：<code>LED_Pin</code> 被直接换成 10，程序运行时不能改它；<code>int count</code> 是一个真正的“盒子”，运行时可以改。', 'gray')
      },
      {
        kind: 'code',
        title: '代码逐行看懂（2/2）：一颗一颗写成白色',
        desc: 'for 循环让 i 从 0 数到 11：每圈给第 i 颗灯写上白色，再 <code>show()</code> 发出去。',
        file: 'ws2812_ring.ino', code: RING, from: 15, to: 21, hl: [16, 18, 19],
        notes: [
          { line: 15, text: '<code>loop()</code>：一遍又一遍地重复。' },
          { line: 16, text: 'i 从 0 数到 11，正好 12 颗：编号从 0 开始，所以条件写 <code>i &lt; count</code>。灯环上印的是 1～12。' },
          { line: 18, text: '写草稿：第 i 颗 → 白色 <code>Color(127, 127, 127)</code>。' },
          { line: 19, text: '<code>show()</code> 寄出：第 i 颗亮起来。' },
          { line: [20, 21], text: 'loop() 又从头写一遍同样的白色，所以灯一直亮着、不闪。' }
        ],
        foot: callout('clock', '慢动作回放', '每转一圈就多亮一颗；12 圈加起来不到 10 毫秒，眼睛分辨不出先后，看到的就是 12 颗一起亮。实验室任务 5 加上 <code>delay()</code>，就能看清“一颗颗亮起”。')
      },
      {
        kind: 'lab',
        title: '动手实验室：点亮 12 颗灯',
        desc: '点 ▶ 运行，灯环亮起白光。卡片读数是 <code>show()</code> 之后、按亮度缩放过的颜色。',
        lab: {
          programs: [{ name: 'ws2812_ring.ino', label: '灯环程序（指南原样）', code: RING }],
          parts: [
            { type: 'board' },
            { type: 'neopixel', pin: 10, count: 12, label: 'WS2812b 灯环 R→D10' }
          ],
          tasks: [
            { text: '运行：12 颗灯都亮了吗？卡片读数是 <code>RGB(15,15,15)</code>——程序写的是 127，为什么变成 15？（提示：127 × 30 ÷ 255 ≈ 15）' },
            { text: '换个颜色：把第 18 行的 <code>Color(127, 127, 127)</code> 改成 <code>Color(0, 0, 127)</code>，灯变成什么颜色？再自己试试红 <code>(127,0,0)</code>、橙 <code>(127,60,0)</code>、紫 <code>(60,0,127)</code>。', code: RING_BLUE },
            { text: '调亮度：把第 12 行的 <code>30</code> 改成 <code>255</code>，读数变成多少？再试 <code>5</code>。最大只能写 255——写 256 会“绕回”成 0，灯反而灭了。', code: RING_BRIGHT },
            { text: '只写不寄：在第 19 行 <code>pixels.show();</code> 前面加 <code>//</code> 把它注释掉再运行。<code>setPixelColor()</code> 照样在执行，灯却一颗都不亮——为什么？', code: RING_NOSHOW },
            { text: '一颗颗亮起再全灭：在 <code>show()</code> 后面加 <code>delay(100);</code>，for 循环结束后用 <code>pixels.clear();</code> 清空草稿、<code>pixels.show();</code> 寄出、<code>delay(500);</code> 停半秒。再比一比 <code>delay(100)</code> 和 <code>delay(30)</code>。', code: RING_CHASE }
          ],
          smoke: [
            { expect: { part: ['neopixel', 'lit', '12'], read: ['neopixel', 'RGB(15,15,15)'] } },
            { task: 2, run: true },
            { expect: { part: ['neopixel', 'first', '0,0,15'], read: ['neopixel', '亮 12 颗'] } },
            { task: 3, run: true },
            { expect: { part: ['neopixel', 'first', '127,127,127'] } },
            { task: 4, run: true },
            { wait: 400, expect: { part: ['neopixel', 'lit', '0'], loops: 3, state: 'running' } },
            { task: 5, run: true },
            { expect: { part: ['neopixel', 'lit', LIT] } },
            { expect: { part: ['neopixel', 'lit', '12'] }, timeout: 3000 },
            { expect: { part: ['neopixel', 'lit', '0'] }, timeout: 3000 }
          ]
        }
      },
      {
        kind: 'figure',
        title: '实验结果：12 颗灯亮起白光',
        desc: '原指南：上传程序之后，12 bit RGB 灯会亮起；注意，不要直视太久！',
        img: 'img/l23/ws_result_photo.jpg',
        caption: '原指南实物照片：12 颗灯亮起白光，中间的小红点是模块的电源指示灯（Power）',
        side: `
<div class="card">
  <h3>${ico('sun')}为什么是柔和的白光</h3>
  <dl class="kv">
    <dt class="mono">R = G = B = 127</dt><dd>三色等量混合，就是白光</dd>
    <dt class="mono">setBrightness(30)</dt><dd>整体只有约 12% 亮度</dd>
  </dl>
</div>
${callout('book', '“12 bit”是什么？', '原指南写“12 bit RGB 灯”，意思是 12 颗灯珠。', 'gray')}
${callout('eye', '不要直视太久', '即使亮度只有 30，LED 也很刺眼。灯不亮？看下一页的常见坑。', 'warn')}`
      },
      {
        kind: 'html',
        title: '常见坑：灯环不亮、不变色',
        desc: '灯不亮先查库和接线；颜色不变先查 <code>show()</code>。',
        body: `
<div class="grid-2 stretch">
  ${warnCard('编译报错：No such file or directory', '<p>没装库：工具 → 管理库，搜索 <b>Adafruit NeoPixel</b> 安装。</p>')}
  ${warnCard('上传成功，灯却不亮', '<p>信号线插到 D 脚了？要插 <b>R</b>；再查 V、G 两根线。</p>')}
  ${warnCard('灯闪烁、板子反复重启', '<p>亮度太高，USB 供电不够：把 <code>setBrightness()</code> 的数调小。</p>')}
  ${warnCard('改了颜色，灯却没变', '<p>只写了 <code>setPixelColor()</code>，忘了 <code>show()</code>——草稿没寄出去。</p>')}
</div>
<h3 class="mt">按这个顺序查</h3>
<div class="flow">
  <div><b>1 编译</b><br><span class="small">库装好了吗？</span></div>
  <div><b>2 接线</b><br><span class="small">信号线在 R 上吗？</span></div>
  <div><b>3 寄出</b><br><span class="small">写了 <code>show()</code> 吗？</span></div>
  <div class="on"><b>4 亮度</b><br><span class="small">30 左右刚刚好</span></div>
</div>`
      },

      // ================================================================ 实验 02 LCD1602
      {
        kind: 'section', no: '实验 02', title: '串行 LCD1602 模块<span style="white-space:nowrap">动态显示屏实验</span>',
        desc: '让一块 16 × 2 的液晶屏显示文字。只用两根信号线（I2C）：先“敲门”找到屏幕的地址，再用 <code>setCursor()</code> 和 <code>print()</code> 把字写上去。',
        tiles: [
          { title: '认识', sub: '2 行 × 16 个字符' },
          { title: 'I2C', sub: '两根线 · 门牌号' },
          { title: '找地址', sub: '扫描程序 → 0x27' },
          { title: '显示', sub: 'setCursor + print' }
        ]
      },
      {
        kind: 'figure',
        title: '认识 LCD1602 液晶显示屏',
        desc: '“1602” 的意思是 2 行、每行 16 个字符；背面的 I2C 转接板让它只用两根信号线就能工作。',
        img: ['img/l23/lcd_module_photo1.jpg', 'img/l23/lcd_module_photo2.jpg'],
        captions: ['原指南：背面——黑色 I2C 转接板和蓝色电位器', '原指南：侧面——转接板焊在屏幕的 16 根针上，引出 4 根针'],
        side: `
<div class="card">
  <dl class="kv">
    <dt>字符型液晶屏</dt><dd>专门显示字母、数字和符号，电子钟、温度显示器里很常见</dd>
    <dt>HD44780</dt><dd>市面上的 1602 大多用这个控制芯片，控制方法都一样，屏内自带字库</dd>
    <dt>I2C 转接板</dt><dd>PCF8574 芯片，只占 SDA、SCL 两根线；跳线可设地址 0x20～0x27</dd>
    <dt>蓝色电位器</dt><dd>旋转它调节对比度（后面排错要用）</dd>
    <dt>4 根针</dt><dd class="mono">GND · VCC · SDA · SCL</dd>
  </dl>
</div>
${warnCard('原指南的两处笔误', '<p>“1602 表示每行 2 行和 16 个字符”应为 <b>2 行、每行 16 个字符</b>；转接板芯片“PCA8574”应为 <b>PCF8574</b>。</p>')}`
      },
      {
        kind: 'html',
        title: '实验目的、原理与组件清单',
        desc: 'Arduino 通过 I2C 通信控制 LCD1602 显示字符；带上转接板，屏幕只占 2 个 IO 口。',
        body: `
<div class="grid-3 stretch">
  ${card('target', '实验目的（原指南）', '<p>通过 Arduino UNO R3 主控板控制 LCD1602 液晶显示屏显示字符。</p>')}
  ${card('bulb', '实验原理（原指南）', '<p>通过 Arduino UNO R3 主控板和串行 LCD1602 液晶显示屏连接，使用 I2C 通信，控制 LCD1602 液晶显示屏显示字符。</p>')}
  ${card('list', '组件清单', chips(['Arduino Uno R3 主板', '面包板', 'USB 数据线', '带转接板的 LCD1602 显示屏', '若干跳线']))}
</div>
<h3 class="mt">为什么要带转接板？</h3>
<div class="grid-2">
  ${tile('6 个', '不带转接板', '要占 6 个 IO 口：RS、E 和 4 根数据线，还要接电源、背光、对比度')}
  ${tile('2 个', '带转接板', '只占 A4、A5 两个口，一共 4 根线；省下的口留给别的传感器', 'turq')}
</div>`
      },
      {
        kind: 'html',
        title: '原理：I2C 总线——两根线，按“门牌号”找设备',
        desc: 'SDA 传数据、SCL 打节拍；同一条总线能挂很多设备，Arduino 按地址（门牌号）找到要说话的那一个。',
        body: `
<div class="grid-2 stretch">
  <div class="stack">
    <div class="card">${busSvg}</div>
    ${callout('home', '打个比方：像一条街', 'SDA、SCL 是街道，设备是住户，地址是门牌号。Arduino 喊“0x27 号”，只有门牌是 0x27 的设备回应。')}
  </div>
  ${card('chip', '0x27 是多少？', `
    <p><code>0x</code> 开头表示<b>十六进制</b>（逢 16 进 1）。</p>
    <p class="big center mt">0x27 = 2 × 16 + 7 = 39</p>
    <div class="table-wrap mt"><table class="table">
      <thead><tr><th>十进制</th><th>十六进制</th></tr></thead>
      <tbody>
        <tr><td class="mono">16</td><td class="mono">0x10</td></tr>
        <tr class="hl"><td class="mono">39</td><td class="mono">0x27</td></tr>
        <tr><td class="mono">63</td><td class="mono">0x3F</td></tr>
      </tbody>
    </table></div>
    <p class="small muted mt-s">扫描程序会把两种写法都打印出来：<code>39 (0x27)</code>。跳线可把地址设成 0x20～0x27，一块 Arduino 能接好几块屏。</p>`)}
</div>`
      },
      {
        kind: 'wiring',
        title: '接线：4 根线，SDA 接 A4、SCL 接 A5',
        desc: '原指南：首先，把转接板焊接到 LCD 显示屏上。然后接 4 根线：两根电源、两根信号。',
        img: 'img/l23/lcd_wiring.jpg',
        caption: '原指南接线图：红 5V · 黑 GND · 黄 A4（SDA）· 蓝 A5（SCL）',
        tables: [{ left: 'LCD1602 模块', right: 'Arduino', rows: [['GND', 'GND'], ['VCC', '5V'], ['SDA', 'A4'], ['SCL', 'A5']] }],
        note: '<p>记住 <b>SDA 对 A4、SCL 对 A5</b>：接反了，扫描程序就找不到设备。</p>',
        side: callout('eye', '', 'UNO R3 在 AREF 旁边还有两个标着 SDA、SCL 的针，和 A4、A5 是连通的，接哪组都可以。', 'gray')
      },
      {
        kind: 'figure',
        title: '实物连接：对照照片检查一遍',
        desc: '杜邦线插在转接板的 4 根针上，另一头接 UNO 的 5V、GND、A4、A5，接好再插 USB。',
        img: 'img/l23/lcd_connect_photo.jpg',
        caption: '原指南：实物连接照片（转接板上的红灯亮 = 通电了）',
        side: `
<div class="card">
  <h3>${ico('check')}接线检查</h3>
  <ol class="steps">
    <li>先拔掉 USB，再接线</li>
    <li>VCC 接 5V，不要接 3.3V</li>
    <li>SDA → A4，SCL → A5，别接反</li>
    <li>插上 USB：背光亮 = 电源接对了</li>
  </ol>
</div>
${callout('info', '背光亮 ≠ 能显示字', '背光亮只说明电源接对了；能不能显示字，还要看地址和程序。')}`
      },
      {
        kind: 'html',
        title: '新语法④：Wire 库——挨家“敲门”找地址',
        desc: '扫描程序用 for 循环把 8～119 号地址挨个“敲一遍门”，谁应答，就把谁的地址打印出来。',
        body: `
<div class="grid-2 stretch">
  ${card('home', '像挨家挨户敲门', `
    <div class="chips"><span class="tag outline mono">8</span><span class="tag outline mono">9</span><span class="tag outline">…</span><span class="tag turq mono">39 应答！</span><span class="tag outline">…</span><span class="tag outline mono">119</span><span class="small muted">其他门没人</span></div>
    ${snippet('#include <Wire.h>             // IDE 自带，不用安装\nWire.begin();                 // 加入 I2C 总线\nWire.beginTransmission(39);   // 敲 39 号的门\nWire.endTransmission() == 0   // 0 = 有人应答')}
    <p>程序里用 <code>for (byte i = 8; i &lt; 120; i++)</code> 从 8 号敲到 119 号。</p>`)}
  <div class="stack">
    ${card('code', '同一个数，两种写法', `
      <dl class="kv">
        <dt class="mono">Serial.print(i, DEC)</dt><dd class="mono">→ 39</dd>
        <dt class="mono">Serial.print(i, HEX)</dt><dd class="mono">→ 27</dd>
      </dl>
      <p class="small mt-s"><code>byte</code>：装 0～255 的小整数，放地址正好够用。</p>`)}
    ${warnCard('原指南的扫描程序少了一行', '<p>要在最前面补上 <code>#include &lt;Wire.h&gt;</code>，不补就编译报错：<code>\'Wire\' was not declared in this scope</code>。实验室的“原指南原样”标签可以亲眼看到这个错误。</p>')}
  </div>
</div>`
      },
      {
        kind: 'code',
        title: '程序①逐行看懂（1/2）：准备好，开始敲门',
        desc: '整个扫描程序都写在 <code>setup()</code> 里，只运行一次：打开串口、加入 I2C 总线，然后让 i 从 8 数到 119，每个号码都敲一次门。',
        file: 'i2c_scanner.ino', code: SCAN_FIXED, from: 1, to: 12, hl: [1, 9, 10, 11, 12],
        notes: [
          { line: 1, text: '补上的一行：原指南漏了 <code>#include &lt;Wire.h&gt;</code>，没有它，第 9 行的 <code>Wire</code> 就“不认识”。' },
          { line: [2, 3], text: '全部写在 <code>setup()</code> 里：扫描一次就够。' },
          { line: [4, 5], text: '打开串口 9600，等它准备好。注释说的是 Leonardo 板要等串口，UNO 上会马上通过。' },
          { line: [6, 8], text: '打印空行和标题；<code>count</code> 用来数找到了几个设备。' },
          { line: 9, text: '<code>Wire.begin()</code>：加入 I2C 总线。' },
          { line: 10, text: 'i 从 8 数到 119。' },
          { line: [11, 12], text: '敲 i 号的门：<code>endTransmission()</code> 返回 0 = 有应答。' }
        ],
        foot: callout('info', '行号比原指南多 1', '原指南的程序从 <code>void setup()</code> 开始。这里和实验室的“扫描地址（补好）”一样，在最前面补了一行 <code>#include &lt;Wire.h&gt;</code>，其余一字未改。', 'gray')
      },
      {
        kind: 'code',
        title: '程序①逐行看懂（2/2）：有人应答就打印',
        desc: '找到设备，就用十进制和十六进制各打印一次地址；全部敲完，再报告一共找到几个。',
        file: 'i2c_scanner.ino', code: SCAN_FIXED, from: 13, to: 29, hl: [14, 16, 18],
        notes: [
          { line: [13, 17], text: '拼出一行：<code>DEC</code> 印出 39，<code>HEX</code> 印出 27，前后补上 “ (0x” 和 “)”。' },
          { line: [18, 19], text: '<code>count++</code> 就是 count = count + 1；稍等 1 毫秒（注释：也许不需要）。' },
          { line: [20, 21], text: '应答处理结束；for 循环结束。' },
          { line: [22, 25], text: '打印 <code>Done.</code> 和找到的设备总数。' },
          { line: [27, 29], text: '<code>loop()</code> 空着：想再扫一次，按板子上的复位键。' }
        ]
      },
      {
        kind: 'html',
        title: '程序①结果：扫描到地址 0x27',
        desc: '原指南：串口监视器（波特率 9600）扫描到的 I2C 地址为 0x27。39 是十进制，0x27 是十六进制，同一个数。',
        body: `
<div class="grid-2">
  ${fig('lcd_i2c_scan_serial.jpg', '原指南截图：串口监视器，右下角波特率 9600')}
  <div class="stack">
    <div class="card">
      <h3>${ico('send')}每一行是哪句代码打印的</h3>
      <p class="small">原指南：上传后打开菜单 <b>工具 → 串口监视器</b>，把右下角的波特率改为 <b>9600</b>，即可读出 I2C 地址。</p>
      <div class="table-wrap mt-s"><table class="table">
        <tbody>
          <tr><td class="l mono">I2C scanner. Scanning ...</td><td>第 7 行</td></tr>
          <tr class="hl"><td class="l mono">Found address: 39 (0x27)</td><td>第 13–17 行</td></tr>
          <tr><td class="l mono">Done.</td><td>第 22 行</td></tr>
          <tr><td class="l mono">Found 1 device(s).</td><td>第 23–25 行</td></tr>
        </tbody>
      </table></div>
    </div>
    ${callout('question', '扫出来不是 0x27？', '原指南提醒：很多转接板默认是 0x27，但最好自己扫一下，以防后面的实验出错。比如扫出 0x3F，程序②第 4 行的 <code>0x27</code> 也要改成 <code>0x3F</code>；显示 <code>Found 0 device(s).</code>：先查 SDA、SCL 两根线。', 'gray')}
  </div>
</div>`
      },
      {
        kind: 'html',
        title: '新语法⑤：lcd 对象和 setCursor(列, 行)',
        desc: '先创建 lcd 对象，告诉它地址和尺寸；<code>setCursor(列, 行)</code> 把“笔尖”放到某一格，<code>print()</code> 从那里开始写。',
        body: `
<div class="grid-2 stretch">
  ${card('hand', '再请一位“屏幕管家”', `
    ${snippet('LiquidCrystal_I2C lcd(0x27,16,2);')}
    <p>括号里：<code>0x27</code> 地址（和扫描结果一致）、<code>16</code> 列、<code>2</code> 行。</p>
    <dl class="kv mt-s">
      <dt class="mono">lcd.init()</dt><dd>初始化屏幕</dd>
      <dt class="mono">lcd.backlight()</dt><dd>打开背光</dd>
      <dt class="mono">lcd.setCursor(列,行)</dt><dd>移动“笔尖”</dd>
      <dt class="mono">lcd.print("…")</dt><dd>从笔尖处写字</dd>
    </dl>
    <p class="small muted mt-s">LiquidCrystal_I2C 库要先安装（套件资料提供，或在库管理器里搜索 LiquidCrystal I2C）。</p>`)}
  <div class="stack">
    ${card('target', '像在格子本上写字：先列后行，从 0 数', `
      ${lcdSvg(['H               ', '    S           '], { numbers: true, hl: ['0,0', '4,1'], label: '16 列 × 2 行的格子：(0,0) 是第 1 行第 1 格，(4,1) 是第 2 行第 5 格' })}
      <dl class="kv mt-s">
        <dt class="mono">setCursor(0,0)</dt><dd>第 1 行第 1 格</dd>
        <dt class="mono">setCursor(4,1)</dt><dd>第 2 行第 5 格</dd>
      </dl>`)}
    ${warnCard('行、列都从 0 开始', '<p><code>setCursor(1,1)</code> 指的是第 2 行、第 2 格。先写列，再写行。</p>')}
  </div>
</div>`
      },
      {
        kind: 'code',
        title: '程序②逐行看懂（1/2）：创建 lcd 对象',
        desc: '引入两个库，按扫描到的地址创建 lcd 对象，然后在 <code>setup()</code> 里初始化屏幕、打开背光。',
        file: 'lcd1602_hello.ino', code: LCD, from: 1, to: 10, hl: [4, 8, 10],
        notes: [
          { line: [1, 2], text: '引入 Wire（I2C，IDE 自带）和 LiquidCrystal_I2C（要安装）。双引号：先在程序所在的文件夹里找库文件，找不到再去库目录找。' },
          { line: 4, text: '创建 <code>lcd</code> 对象：地址 0x27、16 列、2 行。地址一定要和程序①扫描到的一样。' },
          { line: [6, 7], text: '<code>setup()</code>：只运行一次。' },
          { line: 8, text: '<code>init()</code>：屏幕开工，像灯环的 <code>begin()</code>。' },
          { line: [9, 10], text: '第 9 行是注释；<code>backlight()</code> 打开背光，不开背光字很难看清。' }
        ]
      },
      {
        kind: 'code',
        title: '程序②逐行看懂（2/2）：落笔、写字',
        desc: '两次“先 <code>setCursor</code> 落笔、再 <code>print</code> 写字”：第 1 行写 Hello Word，第 2 行从第 5 格写 Science Robot。',
        file: 'lcd1602_hello.ino', code: LCD, from: 11, to: 19, hl: [11, 12, 13, 14],
        notes: [
          { line: 11, text: '(0,0) 是第 1 行第 1 格。注释写成了 “go to start of 2nd line”，是原程序抄错了：这里其实是第 1 行开头。' },
          { line: 12, text: '写 “Hello Word”：这是原程序的拼写，正确应为 Hello World。' },
          { line: 13, text: '(4,1) 是第 2 行第 5 格。' },
          { line: 14, text: '写 “Science Robot”：13 个字符，从第 5 格开始只剩 12 格，最后的 t 看不见。' },
          { line: [17, 19], text: '<code>loop()</code> 空着：字写一次，就会一直留在屏幕上。' }
        ],
        foot: `
<div class="grid-2">
  ${card('eye', '数一数第 2 行：编号 16 的格子在屏幕外', row2Svg)}
  ${warnCard('原程序的两处笔误', '<p>第 11 行注释 “2nd line” 应为第 1 行；第 12 行 “Hello Word” 应为 Hello World。实验室任务 4 把拼写改过来。</p>')}
</div>`
      },
      {
        kind: 'lab',
        title: '动手实验室：扫描地址，再让屏幕显示文字',
        desc: '三个程序标签按指南的顺序：① 扫描地址（补好）→ ② 原指南原样（会报错）→ ③ 显示文字。屏幕卡片下面有对比度旋钮。',
        lab: {
          programs: [
            { name: 'i2c_scanner.ino', label: '① 扫描地址（补好）', code: SCAN_FIXED, note: '在原指南程序的最前面补上了 <code>#include &lt;Wire.h&gt;</code>，其余一字未改。' },
            { name: 'i2c_scanner_原样.ino', label: '② 原指南原样', code: SCANNER, expect: 'error', note: '原指南的扫描程序少了第一行 <code>#include &lt;Wire.h&gt;</code>：运行看看错误提示，再自己补上。' },
            { name: 'lcd1602_hello.ino', label: '③ 显示文字', code: LCD }
          ],
          parts: [
            { type: 'board' },
            { type: 'lcd1602', addr: 0x27, label: 'LCD1602 显示屏（I2C 0x27）' }
          ],
          i2c: [0x27],
          baud: 9600,
          tasks: [
            { text: '运行“① 扫描地址”：串口里出现 <code>Found address: 39 (0x27)</code> 和 <code>Found 1 device(s).</code>——39 就是十六进制的 0x27。把第 10 行的 <code>120</code> 改成 <code>30</code> 再运行，为什么一个都找不到了？', code: SCAN_SHORT },
            { text: '切到“② 原指南原样”点运行：读一读红色的编译错误，它指向第几行？再在最前面加上 <code>#include &lt;Wire.h&gt;</code> 运行。', code: SCAN_FIXED, program: 1 },
            { text: '切到“③ 显示文字”点运行：第 2 行 <code>Science Robot</code> 最后的 t 去哪了？再拧屏幕卡片下面的对比度旋钮：太低看不见字，太高满屏方块，调回中间。' },
            { text: '改正拼写，再写上你的名字：第 12 行改成 <code>"Hello World"</code>；第 13 行改成 <code>setCursor(0,1)</code>，第 14 行写你的名字（只能用英文字母和数字，屏幕里没有汉字字库）。', code: LCD_NAME, program: 2 },
            { text: '做个秒表：把 <code>loop()</code> 改成每 0.2 秒在第 2 行开头打印 <code>millis()/1000</code>。<code>millis()</code> 是开机以来的毫秒数，除以 1000 就是秒——屏幕“动”起来了。后面的 Science Robo 还在：屏幕上的字不会自己消失，只有被新字盖住才会变。', code: LCD_CLOCK, program: 2 }
          ],
          smoke: [
            { expect: { serial: 'Found address: 39 (0x27)' } },
            { expect: { serial: 'Found 1 device(s).' } },
            { task: 1, run: true },
            { expect: { serial: 'Found 0 device(s).', noSerial: 'Found address' } },
            { tab: 1, run: true },
            { expect: { state: 'error', status: '/^编译错误：第 8 行：.*Wire/', errLine: 8 } },
            { task: 2, run: true },
            { expect: { serial: 'Found address: 39 (0x27)', state: 'running' } },
            { tab: 2, run: true },
            { expect: { lcd: ['Hello Word', '    Science Robo'], part: ['lcd1602', 'backlight', '1'] } },
            { knob: 'lcd1602', to: 0.05 },
            { expect: { text: ['.part.lcd1602 .part-note', '太低'] } },
            { key: 'End', part: 'lcd1602', target: 'svg.knob' },
            { expect: { text: ['.part.lcd1602 .part-note', '太高'] } },
            { key: 'PageDown', part: 'lcd1602', target: 'svg.knob', times: 5 },
            { expect: { lcd: ['Hello Word', '    Science Robo'] } },
            { task: 4, run: true },
            { expect: { lcd: ['Hello World', 'I am Li Ming'] } },
            { task: 5, run: true },
            { expect: { part: ['lcd1602', 'row1', '/^[1-9] {3}Science Robo/'] }, timeout: 4000 }
          ]
        }
      },
      {
        kind: 'figure',
        title: '实验结果：屏幕显示文字',
        desc: '原指南的结果照片里屏幕显示 “Hello, world!”，和程序里的文字不一样——照片来自另一版程序，不是你看错了。',
        img: 'img/l23/lcd_result_photo.jpg',
        caption: '原指南：实验结果照片（屏幕文字是 Hello, world!，与本节程序不同）',
        side: `
<div class="card">
  <h3>${ico('check')}按本节程序，屏幕应该是这样</h3>
  ${lcdSvg(['Hello Word      ', '    Science Robo'], { label: '第 1 行 Hello Word，第 2 行从第 5 格开始 Science Robo' })}
  <p class="small muted mt-s">第 1 行 Hello Word；第 2 行从第 5 格开始 Science Robo（t 在屏幕外）。</p>
</div>
${callout('question', '背光亮了，却看不到字？', '先调转接板背面的蓝色电位器，详见下一页。')}`
      },
      {
        kind: 'html',
        title: '常见问题：背光亮了却没有字',
        desc: '原指南：如果上传程序后背景灯亮了，但是不显示字符，尝试去调节转接板后面的电位器，调节亮度和显示效果。',
        body: `
<div class="grid-2 stretch">
  ${card('reset', '调背面的蓝色电位器', `<ol class="steps">
    <li>用小十字螺丝刀，慢慢转转接板背面的蓝色电位器</li>
    <li>转反了：什么都看不见；转过头：一排排黑方块</li>
    <li>转到字清清楚楚为止（实验室里就是屏幕卡片下面的旋钮）</li>
  </ol>
  ${fig('lcd_module_photo1.jpg', '原指南：蓝色电位器在转接板的右上角')}`, 'pale')}
  <div class="stack">
    ${warnCard('怎么调都只有一排黑方块', '<p>屏幕没被初始化：地址不对或程序没跑起来。用程序①核对地址，和第 4 行的 <code>0x27</code> 比一比。</p>')}
    ${warnCard('扫描显示 Found 0 device(s).', '<p>查 SDA、SCL 是否接反、松动：SDA → A4，SCL → A5。</p>')}
    ${warnCard('编译报错：Wire 没有声明', '<p>扫描程序最前面补上 <code>#include &lt;Wire.h&gt;</code>。</p>')}
  </div>
</div>`
      },

      // ================================================================ 小结
      {
        kind: 'summary', kicker: '2-3 显示模块　/　小结', title: '本课小结',
        desc: '两个模块，一个套路：装库 → <code>#include</code> → 创建对象 → <code>对象.函数()</code> 下命令。',
        items: [
          { title: '库', text: '别人写好的“扩展包”：库管理器里装一次，<code>#include</code> 引进来就能用。' },
          { title: '先写草稿再寄出', text: '<code>setPixelColor()</code> 只写草稿，<code>show()</code> 才把颜色发给灯环。' },
          { title: 'I2C 门牌号', text: '两根线挂多台设备，按地址找设备；<code>0x27</code> 就是 39。' },
          { title: 'setCursor(列, 行)', text: '先列后行，都从 0 开始数；一行只显示 16 个字符。' }
        ],
        body: `
<div class="grid-2">
  ${card('bulb', '排错口诀', '<p>编译报错 → 先查库和 <code>#include</code>；没有反应 → 先查线和地址；背光亮没有字 → 调对比度。</p>', 'pale')}
  ${card('flag', '课后想一想', '<p>能不能把传感器的读数显示在 LCD 上？或者用灯环的颜色表示读数的高低？</p>')}
</div>`
      },
      { kind: 'end', title: '本课结束', subtitle: '让作品会发光，也会“说话”。\n灯环显示颜色，液晶屏显示文字——下一步，试着把传感器的读数显示出来。' }
    ]
  });
})();
