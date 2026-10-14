# 写课件：lessons/l12.js … l23.js

Guide for authors of the five course lessons (1-2, 1-3, 2-1, 2-2, 2-3). Read `SIM_SPEC.md` first.
Then open `index.html#_demo` (组件演示) and `index.html#_parts` (元件一览) in a browser. Between them they use
every slide kind, every part type and every smoke step described here, and both pass `test/smoke.js`.
Copy from them freely.

Content rules (from the user, see `../CLAUDE.md`):
- One lesson per guide. Follow the guide's experiment order and cover every experiment.
- Each experiment runs: 实验卡 → 接线 → 代码逐行看懂 → 实验结果 / 动手实验室.
- Explain programming in plain language: give an analogy first, then the smallest example.
- Keep **every** image from the guide (they are already in `img/lXX/`). Leave out mBlock / Mixly (graphical programming) content.
- Lesson files are **data only**. Never put engine or UI logic in them.

---

## 1. The file and how it is loaded

```
lessons/l12.js   → registers id 'l12'   (l13, l21, l22, l23 likewise)
img/l12/*.jpg    → referenced as 'img/l12/btn_wiring.jpg' (relative to index.html)
```

1. Write `lessons/l12.js` as an IIFE that calls `SIM.deck.register({...})` (example in §2).
2. Add **one** line for your file in `index.html`, between the `<!-- LESSONS … -->` and `<!-- /LESSONS -->`
   markers, in course order. Do not touch the other lines:
   ```html
   <script src="lessons/l12.js"></script>
   ```
   Only list files that exist. A missing file is a console error, and the smoke test fails on console errors.
   A lesson that is not listed shows “制作中” on its home card. A listed one shows “可以开始” with its page count.
3. The home card text (title and experiment list) is static HTML in `index.html`. Edit it only if it is wrong.

Routes: `#l12` is page 1, `#l12-7` is page 7. ← / → / PageUp / PageDown turn pages, except while focus is
in an input, the editor or a lab. The outline dropdown at the top right groups pages by `section` slides.

## 2. A complete small lesson

```js
/* lessons/l12.js — 1-2 开关类传感器 */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);            // inline SVG icons, see §5

  // programs: copied VERBATIM from ../arduino-ppt/assets/l12/guide_text.md (see §7)
  const BUTTON = `
int led_out = 11 ; //GPIO 11  LED pin
int keypad_pin = 7; //GPIO 7 key pin
int value;
void setup()
{
    pinMode(led_out,OUTPUT);                     // init led pin output
    pinMode(keypad_pin,INPUT);          // init key pin input
    digitalWrite(led_out,LOW);
}
void loop()
{
    value = digitalRead(keypad_pin);    // read key pad pin vaule
    if( value == LOW )
    {
        digitalWrite(led_out,HIGH);      // if key value is down  turn on LED

    }
    else
    {
        digitalWrite(led_out,LOW);     // if key value is down  turn off LED
    }
}
`;

  SIM.deck.register({
    id: 'l12', no: '1-2', title: '开关类传感器',
    subtitle: '按键 · 触摸开关 · 限位开关 · 倾斜开关',
    slides: [
      { kind: 'cover', title: '开关类传感器', subtitle: '4 个实验：按键、触摸、限位、倾斜' },
      { kind: 'section', no: '实验 01', title: '按键模块实验', desc: '第一次用引脚的 <b>INPUT</b> 功能。',
        tiles: [{ title: '原理', sub: '按下 = 低电平' }, { title: '接线', sub: '按键 → D7' },
                { title: '代码', sub: 'digitalRead' }, { title: '结果', sub: '按下就亮' }] },
      { kind: 'figure', title: '按键开关模块', desc: '红色按键 + 三根针脚 S / V / G。',
        img: 'img/l12/btn_module_photo.jpg', caption: '按键开关模块 正面 / 反面',
        side: `<div class="card"><h3><span class="ico">${I('eye')}</span>看图找三件事</h3>
               <ol class="steps"><li>S 接数字口</li><li>V 接 5V</li><li>G 接 GND</li></ol></div>` },
      { kind: 'wiring', title: '接线：按键接 D7，LED 接 D11', img: 'img/l12/btn_wiring.jpg', caption: '按键模块 + LED',
        tables: [{ left: 'Arduino Uno', right: '按键模块', rows: [['7', 'S'], ['GND', 'G'], ['5V', 'V']] }],
        note: 'LED 长脚是正极（+）。' },
      { kind: 'code', title: '代码逐行看懂', file: 'button.ino', code: BUTTON, from: 10, to: 22, hl: [13],
        notes: [{ line: 12, text: '<code>digitalRead(7)</code>：松开 1，按下 0。' },
                { line: [14, 17], text: '按下 → D11 HIGH → 灯亮。' }] },
      { kind: 'lab', title: '动手实验室：按键控制 LED', desc: '点 ▶ 运行，按住红色按键。',
        lab: {
          programs: [{ name: 'button.ino', label: '按键程序', code: BUTTON }],
          parts: [{ type: 'board' }, { type: 'button', pin: 7, label: '按键模块 S→D7' },
                  { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED +→D11' }],
          tasks: [
            { text: '按住按键：LED 亮了吗？松开呢？' },
            { text: '把第 13 行的 <code>LOW</code> 改成 <code>HIGH</code>，按键的作用反过来了吗？',
              code: BUTTON.replace('if( value == LOW )', 'if( value == HIGH )') }
          ],
          smoke: [
            { expect: { pin: [11, 0] } },
            { press: 'button' }, { expect: { pin: [11, 1], var: ['value', 0] } }, { release: true },
            { task: 2, run: true }, { expect: { pin: [11, 1] } }
          ]
        } },
      { kind: 'summary', title: '本课小结', items: [{ title: '数字输入', text: '<code>digitalRead</code> 只有 0 和 1。' }] },
      { kind: 'end', title: '本课结束', subtitle: '下一课：1-3 传感器与声光输出' }
    ]
  });
})();
```

## 3. Lesson object and slide kinds

`SIM.deck.register({ id, no, title, subtitle, experiments?, slides })`
- `id`: `'l12'` etc. `no`: `'1-2'`. `title` / `subtitle`: used on the cover, in the top bar and in the tab title.
- `experiments` (optional): defaults to the titles of the `section` slides.
- Every text field may contain HTML. Escape a literal `<` as `&lt;` (for example `#include &lt;Wire.h&gt;`).
- Every slide may set `kicker` (the small line above the title). The default is `1-2 开关类传感器　/　实验 01 按键模块实验`.

| kind | fields | notes |
|---|---|---|
| `cover` | `title, subtitle, kicker?, meta?` | Full turquoise page. `\n` in `subtitle` makes a line break. Has a “开始学习” button. |
| `section` | `no:'实验 01', title, desc, tiles:[{title, sub, n?}×4]` | Text on the left, 2×2 tiles on the right (turquoise / gray / dark / white). One per experiment. It starts an outline group. |
| `html` | `title, desc, body` | General page. `body` uses the CSS classes in §5. |
| `figure` | `title, desc, img, caption, side?, alt?` | Large image (never cropped, click to zoom) with an optional side panel. `img` may be an array (`img:['a.jpg','b.jpg'], captions:[…]`, or `img:[{src, caption}]`). |
| `wiring` | `title, desc, img, caption, tables:[{left, right, rows:[[a,b]…]}], note?, side?` | Image on the left, wiring tables and an amber note on the right. |
| `code` | `title, desc, file, code, from?, to?, hl?:[n…], notes:[{line:n \| [a,b], text}], foot?` | Line numbers match the original program. Notes line up with their line, and hovering a note highlights its lines. Every note line must be inside `from…to`, which the smoke test checks. Long lines wrap with a hanging indent. |
| `lab` | `title, desc, lab:{…}` (§4) | Full-width lab. It is mounted when shown and destroyed when the page is left. Only one lab runs at a time. |
| `tasks` | `title, desc, items:[string \| {title, text}], body?` | Numbered cards, for example “先想一想” before a lab. |
| `summary` | `title, desc, items:[…], body?` | Same look as `tasks`. Use it for the lesson summary. |
| `end` | `title, subtitle?` | Turquoise closing page with “回到首页” and “下一课” (the next registered course lesson). |

Every page must work at 1280×720 and 390×844. Long content scrolls inside the page, and nothing may overflow
sideways (the smoke test checks for horizontal overflow on every page).

## 4. Lab config (`{kind:'lab', lab:{…}}`)

```js
lab: {
  programs: [                                  // ≥1; several → tabs above the editor
    { name: 'scanner.ino', label: '扫描地址（补好）', code: FIXED, note: '一行说明（显示在工具条下）' },
    { name: 'scanner_原样.ino', label: '原指南原样', code: ORIGINAL, expect: 'error' }   // must NOT compile
  ],
  parts: [ { type: 'board' }, … ],             // §4.1, in display order
  i2c: [0x27],                                 // devices on the bus (default: the lcd1602 addresses in parts)
  baud: 9600,                                  // serial monitor's initial baud (9600 | 115200)
  lineEnding: 'none',                          // serial monitor default: 'none' | 'nl' | 'cr' | 'both'
  sensors: { ultrasonic: { trig: 2, echo: 3, distanceCm: 15 } },   // optional initial sensor values
  tasks: [
    { text: '…HTML…' },
    { text: '…', code: ORIGINAL.replace('a', 'b') },   // “载入参考代码” (with undo)
    { text: '…', code: '…', program: 1 },               // load into tab 1 instead of the current tab
    { text: '…', code: '…', expect: 'error' }           // reference code that is meant to fail
  ],
  note: '可选：实验室顶部一行说明',
  key: 'button-lab',                           // optional storage key (default: lessonId:slide title)
  smoke: [ … ]                                 // REQUIRED, see §6
}
```
- `expect:'error'` on a program or task means the smoke test asserts that it fails to compile and that the status
  bar shows `编译错误：第 N 行：…` with the line marked red. Every other program and task must compile.
- Task checkboxes are saved in localStorage under `key`. If you change a lab's slide title, students lose their ticks.
- Every ▶ 运行 is a fresh power-on: clock 0, LCD blank, serial monitor cleared, part settings kept.
- The status bar reads `运行中 · loop() 已执行 N 次 · x 秒`. It adds `· 全速循环中` when loop() has no delay, and `· 0.1× 速度` at other speeds.

### 4.1 Part types

Pins may be numbers or strings: `7`, `'D7'`, `'A0'`. For `pot`, `ldr` and `joystick`, the numbers `0…5` mean A0…A5.
Write `label` like a wiring note, for example `'按键模块 S→D7'` or `'LED +→D11（PWM）'`. The card also shows a pin chip.
The **data** column lists the `data-*` attributes each card exposes. Smoke expectations assert them with
`part:[type, attr, value]`. Every card also has `data-read`, its readout text.

| type | config (defaults) | student controls | data |
|---|---|---|---|
| `board` | `{}` | — (ON, L = D13, TX / RX lamps) | — |
| `led` | `pin, color:'#ff4d4f', label, activeLow:false` | — | `brightness` `0.000…1.000` |
| `rgbLed` | `pins:{r:11, g:10, b:9}, label` | — | `rgb` `'255,0,0'` |
| `ledBar` | `pins:[2…9], activeLow:true, color?, colors?:[…], label` | — | `lit` `'D2,D3'` |
| `button` | `pin, label, pressedLevel:0, color?:'dark'` | press and hold the cap · “保持按下” · Space | `pressed` `1/0` |
| `touch` | `pin, label` | press and hold the pad (touched → 1) · “手指一直放着” | `pressed` |
| `limitSwitch` | `pin, label` | press and hold the lever (→ 0) · “一直压着” | `pressed` |
| `tilt` | `pin, label, angle:0` | slider −90…90° (>10° toward the cap → open → 1) · “碰一下” (open for 350 ms) | `open` |
| `pot` | `pin:'A0', label, vcc:5 \| 3.3, value:0.5` | knob (drag around it, arrow keys) plus a slider | `value` `0…1023` (×vcc/5) |
| `ldr` | `pin:'A0', label, light:60` | light slider 0…100 % · “用手盖住” toggle | `value` |
| `buzzer` | `pin, kind:'active' \| 'passive', label` | “开启声音” (sound starts only after this click) | `freq` Hz \| `'high'` (>20 kHz) \| `'0'` |
| `reed` | `pin, label, distanceCm:4` | drag the magnet or use the slider 0.3…6 cm (<1.5 cm → closed → 0) | `closed` |
| `servo` | `pin, label` | — (arm moves at about 0.12 s / 60°) | `angle`, `target` |
| `joystick` | `x:'A0', y:'A1', buttons:{2:'A',3:'B',4:'C',5:'D',6:'E',7:'F',8:'K'}, restX:525, restY:518, label` | drag the stick (springs back) · hold A…F / K · arrow keys and letter keys when focused | `x`, `y`, `buttons` `'AB'` |
| `ultrasonic` | `trig:2, echo:3, label, distanceCm:20` | drag the obstacle or use the slider 2…400 cm | `distance` |
| `ir` | `pin, label, distanceCm:20, thresholdCm:10` | obstacle slider 1…40 cm · detection-distance knob 2…30 cm (≤ → OUT 0) | `detected` |
| `dht11` | `pin:8, label, temperature:24, humidity:46` | temperature slider 0…50 °C, humidity slider 20…90 % | `temperature`, `humidity` |
| `lcd1602` | `addr:0x27, label, contrast:0.55` | contrast knob on the back (too low: no text, too high: black blocks) | `row0`, `row1` (16 visible chars), `backlight` |
| `neopixel` | `pin:10, count:12, label` | — | `lit` (count), `first` `'r,g,b'` |

Behaviour you must explain in the lesson where it matters:
- **ldr**: in this simulation, brighter light gives a bigger reading. The card says the real module may be the
  reverse. In 1-3, tell students what to watch for.
- **tilt**: tilting more than 10° toward the cap end opens the switch (reads 1). Level or toward the pins closes it (reads 0).
- **button** modules have a pull-up: released reads 1, pressed reads 0. **touch** is the reverse: touched reads 1.
- **joystick** at rest reads x≈525, y≈518, as in the guide's screenshot. Pushing up raises y, pushing right raises x.
  The guide program's dead zones (520/530, 515/520) depend on these values.
- An input pin set to `INPUT` with no part driving it **floats**: it reads random 0/1 and shows a one-time hint.

## 5. CSS classes for `html` bodies (and `side`, `note`, `foot`, task text)

Layout: `.grid-2 .grid-3 .grid-4` (add `.stretch` for equal heights; they collapse to 1–2 columns on phones),
`.span-2`, `.stack`, `.row`, `.mt .mt-s .mb`.
Cards: `.card` (light gray), `.card.dark`, `.card.turq`, `.card.pale`, `.card.white`, `.card.warn`
(red outline, for 常见错误 / 原指南有误), `.card.ok`. A card title is `<h3><span class="ico">${I('bulb')}</span>标题</h3>`.
Icons: `.ico` (turquoise circle), `.ico.dark .ico.red .ico.gray .ico.lg`.
Tiles: `.tile` with `<div class="n">D7</div><b>标题</b><span>说明</span>`, plus `.tile.turq .tile.dark .tile.white`.
Callouts: `.callout` (pale turquoise), `.callout.warn`, `.callout.note` (amber), `.callout.gray`. Structure:
`<div class="callout"><span class="ico">${I('question')}</span><div><b>打个比方</b><p>…</p></div></div>`.
Title rule (callouts, summary items, task-slide items): only a `<b>` that **opens** the text becomes a block title;
a `<b>` after some words (`电位器接的是 <b>3.3V</b>`) and any `<b>` inside a `<p>` stay inline.
Tags: `.tag`, `.tag.turq .tag.pale .tag.dark .tag.red .tag.outline .tag.line`.
Figures: `<figure class="figure"><img src="img/l12/x.jpg" alt="…"><figcaption>…</figcaption></figure>` (click to zoom).
Tables: `<div class="table-wrap"><table class="table">…</table></div>` (`td.l` left-aligns, `tr.hl` highlights a row).
Lists and text: `.steps` (numbered circles), `.flow` (boxes in a row, `.on` for the dark one), `.chips`, `.kv`
(`<dl>`), `.checklist`, `.muted .small .mono .big .center`. Code: inline `<code>` is styled automatically;
use `<pre class="snippet"><code>…</code></pre>` for a short block (escape `<`).
Icons via `SIM.icon(name)`: play stop reset info warn error check left right home zoom close sun moon auto code
chip send trash list load bulb book plug hand eye question flag bolt cube wave clock target.
Do not use emoji as icons, gradients, inline colours (use the classes, which work in both light and dark theme)
or external images.

## 6. Smoke steps (`lab.smoke`) — required for every lab

`test/smoke.js` mounts each lab, clicks ▶ 运行, runs your steps in order and fails on any unmet expectation.
Each step is an object, and its keys run in this order:

| step | does |
|---|---|
| `tab: i` | switch to program tab `i` (0-based) |
| `code: '…'` | replace the editor text |
| `task: n` | click “载入参考代码” on task `n` (1-based) |
| `run: true` / `stop: true` | ▶ 运行 / ■ 停止 (the lab is already running when your steps start) |
| `speed: 0.1` | speed menu |
| `wait: ms` | sleep |
| `press: type, target?, n?` | mouse down on the part's press-and-hold control (`target` is a CSS selector inside the card, e.g. `'[aria-label^="按键 B"]'` for the joystick; `n` = which card of that type). Held until `release`. |
| `release: true` | mouse up (and release held keys) |
| `knob: type, to: 0…1, index?` | drag a knob to a position |
| `slider: type, value, index?` | set a card's range slider (`index` = which slider in the card, e.g. dht11 humidity = 1) |
| `stick: [dx, dy]` | drag the joystick, −1…1 with right and up positive. Held until `release`. |
| `click: type, target?` | click a button in the card (default `.pbtn`: 用手盖住 / 碰一下 / 开启声音) |
| `key: 'ArrowLeft', part: type, target?, times?, hold?` | keyboard on a part control (`target` default: its first focusable element, e.g. `'g.drag'` for magnets / obstacles / the stick). `hold: true` keeps the key down until `release`. |
| `sound: true` | click 开启声音 on the buzzer |
| `send: '90', ending?: 'none'\|'nl'\|'cr'\|'both'` | type into the serial monitor and press 发送 |
| `baud: 115200` | change the monitor baud |
| `expect: {…}, timeout?: ms` | poll (default 5000 ms) until **all** expectations hold |

Expectations (the strings `'/regex/'` are treated as regular expressions where noted):

| key | value |
|---|---|
| `serial` / `serialRe` / `noSerial` | text contained in the monitor / regex source string / text NOT contained |
| `pin` | `[n, 0 \| 1 \| 'pwm']` (PWM 255 counts as 1, 0 as 0) |
| `pwm` | `[n, lo, hi]` duty range 0…255 |
| `servo` | `[pin, angle, tol=3]` |
| `lcd` | `['row 1', 'row 2']` visible text, trailing spaces ignored (`null` skips a row) |
| `part` | `[type, dataAttr, value \| '/re/', n?]`, e.g. `['led','brightness','/^0\\.[5-9]/']` |
| `read` | `[type, text \| '/re/', n?]` matches the card's readout |
| `freq` | `['buzzer', Hz, tol=0.05]` or `['buzzer', 'high']` |
| `var` | `[name, value \| '/re/']` as in the variables panel (arrays `{0,1,0}`, String `"abc"`, char `'A'(65)`) |
| `state` | `'running' \| 'stopped' \| 'error' \| 'idle'` |
| `status` / `msg` | status bar text / message list text (status accepts `'/re/'`) |
| `errLine` | `n`: line `n` marked red in the editor |
| `loops` | loop() count ≥ n |
| `audio` | number of AudioContexts created (0 before 开启声音) |
| `text` | `[cssSelector, substring]` anywhere in the lab |
| `garbled` | `true / false` serial monitor showing garbled text |

Write steps for the behaviour the slide teaches, using the guide's exact program. For example, the AD lab turns the
pot until the serial monitor shows `get ad pin value`. Long `delay()`s are fine: an expectation polls for up to
`timeout` ms. Before your steps, the smoke test also compiles every program and task, runs every tab once and
checks ▶ / ■. The examples in `lessons/_demo.js` and `lessons/_parts.js` cover every step kind.

## 7. Conventions

- **Programs verbatim.** Copy each `cpp` block of `../arduino-ppt/assets/lXX/guide_text.md` character for character,
  including the original typos and comments. The code slide's line numbers must match the original. The safest
  way is a small generator script that reads the blocks and writes them into the lesson as template literals
  (escape `\`, `` ` `` and `${`), as `lessons/_demo.js` and `lessons/_parts.js` were made. Build task reference code
  as `ORIGINAL.replace(…)` so it stays in sync with the original.
- **Guide errors.** When the guide's text contradicts its program, say so on the slide in a `.card.warn` and go by
  the program. Two programs are known not to compile as printed: the 2-3 I2C scanner has no `#include <Wire.h>`, and
  the 2-1 servo / pot program is missing its last `}`. Show the original as a second tab with `expect:'error'`, plus a
  fixed tab, and say exactly what was changed.
- **Images.** Use every image in `img/lXX/` at least once, in a figure, wiring slide or `.figure` inside an html
  body. Paths are relative: `'img/l12/btn_wiring.jpg'`. The smoke test checks that every image exists and loads.
- **Wiring tables** copy the guide's tables. Part labels use the same pins as the program.
- **Language**: Simplified Chinese. Keep to short sentences. Code identifiers stay in English. Add `alt` / `caption`
  to images.
- **No graphical programming** (mBlock / Mixly) slides.

## 8. What the simulator can and cannot do

Supported: everything the 22 guide programs and the 5 language examples use. That is all of SIM_SPEC §2, with
exact AVR integer semantics (16-bit `int` wraparound, `7/2==3`, `delay(0.5)` = `delay(0)`, `analogWrite(256)` → off),
String, Serial (print bases and float digits), Servo, LiquidCrystal_I2C, Adafruit_NeoPixel, dht11, Wire scans,
tone / noTone and pulseIn on the ultrasonic Echo pin.

Not supported (each gives a clear Chinese compile error, so do not use them in task code):
pointers other than `char*` / `const char*`, reference parameters (`&`), `struct` / `class` / `enum` / `typedef`,
2-D arrays, `goto`, `attachInterrupt`, `sprintf` / `strcpy`-style C string functions, SoftwareSerial and any other
library. User functions can only be overloaded by parameter count, and `long long` is 32-bit.

Behaviour to know:
- Errors read like `第 N 行：中文解释（GCC 原文）`. A missing `;` is reported on the line of the unfinished statement
  (GCC reports the next line). A missing final `}` is reported at the end of the file.
- Runtime errors such as array out of bounds and runaway recursion **stop** the program with a red line (a real
  UNO would silently misbehave; say so if you teach it). Integer division by zero only warns.
- `if (x = 0)` compiles and runs (C semantics), and the lab also shows a warning on that line.
- Serial output is paced like a real 9600-baud UART (64-byte buffer). A loop that prints every pass slows to about
  960 characters per second, e.g. the 2-1 PWM program prints about 22 lines/s. Typed input arrives about 1 ms per
  character. `Serial.print` before `Serial.begin` prints nothing and shows a hint.
- The serial monitor keeps the last 500 lines. If its baud differs from `Serial.begin`, both directions are garbled
  and a hint appears.
- `pulseIn` returns real pulses only on an `ultrasonic` part's Echo pin. Other pins wait for the timeout and return 0.
  Extra I2C addresses in `i2c` only answer the bus scan.
- `Servo.attach()` starts at 90°. `write()` above 180 clamps, ≥544 is treated as microseconds. The arm moves at about 0.12 s / 60°.
- DHT11 returns integers, so `(float)DHT11.temperature, 2` prints `24.00`. A read within 1 s of the previous one returns the old values.
- NeoPixel `setBrightness(30)` scales at `show()`: 127 → 15. Nothing changes on the ring until `show()`.
- Each library call costs virtual time (`analogRead` about 112 µs, LCD about 1.3 ms per character, DHT11 read about
  23 ms). A `loop()` without delay runs “全速” and never freezes the page. ■ 停止 always works.
- Sound only plays after the student clicks 开启声音 on a buzzer card. That switch is shared by all buzzers on the page.

## 9. Testing your lesson

```bash
cd arduino-sim
node test/interp.test.js                                                  # engine: must stay green
NODE_PATH=/opt/node22/lib/node_modules node test/smoke.js l12             # your lesson, 4 passes (+ home)
SIM_QUICK=1 NODE_PATH=/opt/node22/lib/node_modules node test/smoke.js l12 # desktop-light only (full lab checks)
```
Options (environment variables): `SIM_SHOTS=<dir>` (screenshots, default `<tmp>/arduino-sim-smoke`),
`SIM_MODES=phone-light,desktop-dark`, `SIM_FONT_CACHE=<dir>`. Fonts are stubbed offline, so no network is needed.
Without an argument the test walks home, `#_demo`, `#_parts` and every course lesson listed in index.html. Run that
before you finish, because your `index.html` line must not break the others.

The smoke test fails on: any console error or page error; a file that fails to load; a request to anything but
Google Fonts; a missing or unloaded image; horizontal overflow; a code note outside `from…to`; a program or task
that compiles when it should not (or the reverse); a lab without `smoke`; any unmet expectation.
**Look at your screenshots** (`<lesson>-<page>.png`, `-full.png`, `-lab.png`) in all four passes before you call it done.
