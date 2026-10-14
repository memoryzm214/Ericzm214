/* lessons/l12.js — 1-2 开关类传感器
   Guide: ../arduino-ppt/assets/l12/guide_text.md (PDF 15 pages). Four experiments in the guide's order:
     ① 按键模块实验 ② 触摸开关模块实验 ③ 限位开关模块实验（第 2.17 讲） ④ 倾斜开关模块实验
   Explanations, analogies, line notes, pitfalls and 动手改一改 ideas ported from the reviewed PowerPoint script
   ../arduino-ppt/build/12_lesson_1-2.js. Programs are copied verbatim from the guide's ```cpp blocks
   (generated, see the four constants below). mBlock / Mixly pages of the guide are left out on purpose.
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- programs copied verbatim from arduino-ppt/assets/l12/guide_text.md (```cpp blocks 1–4)
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
  const TOUCH = `
int Led=A5;//定义 LED 接口
int SensorPin=A0;
int val=0;
void setup()
{
  pinMode(Led,OUTPUT);//定义 LED 为输出接口
  pinMode(SensorPin, INPUT);
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(SensorPin);
  Serial.println(val);
  if(val==1)
  {
    digitalWrite(Led,HIGH);
  }
  else
  {
    digitalWrite(Led,LOW);
  }
}
`;
  const LIMIT = `
int Led =11; //定义 LED 接口
int SensorPin=10;  //定义限位开关接口
int val=0;//定义数字变量 val
void setup()
{
  pinMode(Led,OUTPUT);//定义 LED 为输出接口
  pinMode(SensorPin,INPUT);//定义限位开关引脚为输出接口
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(SensorPin);
  Serial.println(val);
  if(val==0)
  {
    digitalWrite(Led,HIGH);
  }
  else
  {
    digitalWrite(Led,LOW);
  }
}
`;
  const TILT = `
int Led=11;//定义 LED 接口
int Buzzer_pin=13;
int buttonpin=12; //定义倾斜开关传感器接口
int val=0;//定义数字变量 val
void setup()
{
  pinMode(Led,OUTPUT);//定义 LED 为输出接口
  pinMode(Buzzer_pin,OUTPUT);
  pinMode(buttonpin,INPUT);//定义倾斜开关传感器为输出接口
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(buttonpin);//将数字接口 A5 的值读取赋给 val
  Serial.println(val);
  if(val==0)//当倾斜开关传感器检测有信号时，LED 闪烁
  {
    digitalWrite(Led,HIGH);
    digitalWrite(Buzzer_pin,HIGH);
    // delay(1000);
  }
  else
  {
    digitalWrite(Led,LOW);
    digitalWrite(Buzzer_pin,LOW);
  }
}
`;

  // ---- small HTML helpers (markup only)
  const ico = (n, cls) => `<span class="ico${cls ? ' ' + cls : ''}">${I(n)}</span>`;
  const warnCard = (title, text) => `<div class="card warn"><h3>${ico('warn', 'red')}${title}</h3><p>${text}</p></div>`;
  const chips = items => `<div class="chips">${items.map(t => `<span class="tag outline">${t}</span>`).join('')}</div>`;

  // pull-up output stage of a switch module: 5V — resistor — signal pin — switch — GND (currentColor, theme-safe)
  const pullupSvg = (closed, pin) => {
    const hot = closed ? ' stroke-width="3.6"' : '';
    return `<svg viewBox="0 0 210 170" width="100%" role="img" aria-label="${closed ? '按下：S 脚经按键接到 GND' : '松开：上拉电阻把 S 脚拉到 5V'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;max-width:250px;margin:0 auto">
  <text x="40" y="13" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor" stroke="none">5V</text>
  <path d="M26 20H54M40 20V34"/>
  <rect x="32" y="34" width="16" height="38" rx="2"/>
  <text x="56" y="57" font-size="11" fill="currentColor" stroke="none">上拉电阻</text>
  <path d="M40 72V92"/>
  <circle cx="40" cy="92" r="3.2" fill="currentColor"/>
  <path d="M40 92H122M115 87l7 5-7 5"/>
  <text x="128" y="96" font-size="12" font-weight="600" fill="currentColor" stroke="none">S → ${pin}</text>
  <path d="M40 92V110"${hot}/>
  <circle cx="40" cy="111" r="2.6" fill="currentColor"/>
  <circle cx="40" cy="139" r="2.6" fill="currentColor"/>
  ${closed ? '<path d="M40 139V111" stroke-width="3.6"/>' : '<path d="M40 139L60 116"/>'}
  <text x="${closed ? 52 : 66}" y="130" font-size="11" fill="currentColor" stroke="none">按键</text>
  <path d="M40 139V151"${hot}/>
  <path d="M27 151H53M32 157H48M37 163H43"${hot}/>
  <text x="60" y="161" font-size="11" fill="currentColor" stroke="none">GND</text>
</svg>`;
  };

  // SW-520D ball tilt switch as a glass tube: pins (导针) on the left, cap (帽盖) on the right
  const tubeSvg = (ang, ballAtPins, label) => `<svg viewBox="0 0 200 92" width="100%" role="img" aria-label="${label}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="display:block;max-width:230px;margin:0 auto">
  <path d="M8 46H192" stroke-dasharray="4 4" opacity=".4"/>
  <g transform="rotate(${ang} 100 46)">
    <path d="M18 41H64M18 51H64" stroke-width="2.4"/>
    <rect x="52" y="31" width="96" height="30" rx="9"/>
    <rect x="146" y="29" width="11" height="34" rx="3" fill="currentColor"/>
    <circle cx="${ballAtPins ? 68 : 132}" cy="46" r="10.5" fill="currentColor" opacity=".8"/>
    <text x="30" y="${ang < 0 ? 72 : 30}" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">导针</text>
    <text x="154" y="22" font-size="11" text-anchor="middle" fill="currentColor" stroke="none">帽盖</text>
  </g>
</svg>`;

  // ---- task reference code (built from the originals so they stay in sync)
  const BTN_TALK = BUTTON
    .replace('digitalWrite(led_out,LOW);\n}', 'digitalWrite(led_out,LOW);\n    Serial.begin(9600);\n}')
    .replace('// read key pad pin vaule\n', '// read key pad pin vaule\n    Serial.println(value);\n');
  const LIMIT_BLINK = LIMIT.replace('  {\n    digitalWrite(Led,HIGH);\n  }',
    '  {\n    digitalWrite(Led,HIGH);\n    delay(100);\n    digitalWrite(Led,LOW);\n    delay(100);\n  }');
  const TILT_BLINK = TILT.replace('    digitalWrite(Led,HIGH);\n    digitalWrite(Buzzer_pin,HIGH);\n    // delay(1000);',
    '    digitalWrite(Led,HIGH);\n    digitalWrite(Buzzer_pin,HIGH);\n    delay(100);\n    digitalWrite(Led,LOW);\n    digitalWrite(Buzzer_pin,LOW);\n    delay(100);');

  const LIT = '/^(0\\.[5-9]|1)/';   // LED brightness ≥ 0.5

  SIM.deck.register({
    id: 'l12', no: '1-2', title: '开关类传感器',
    subtitle: '按键 · 触摸开关 · 限位开关 · 倾斜开关',
    experiments: ['按键模块实验', '触摸开关模块实验', '限位开关模块实验', '倾斜开关模块实验'],
    slides: [
      {
        kind: 'cover',
        title: '开关类传感器',
        subtitle: '按键 · 触摸开关 · 限位开关 · 倾斜开关\n4 个实验：让 Arduino “听见”外面的动静'
      },

      // ------------------------------------------------------------ 导览
      {
        kind: 'html',
        kicker: '1-2 开关类传感器　/　导入',
        title: '本节导览：四个开关，一个骨架',
        desc: '开关类传感器只回答“是 / 不是”：用 <code>digitalRead()</code> 把它读进来，再决定灯亮不亮。',
        body: `
<div class="grid-4 stretch">
  <div class="card pale"><h3>${ico('hand')}实验 01 按键</h3><p><span class="tag dark">按下 → 读到 0</span></p><p class="small muted">新语法：pinMode(INPUT) · digitalRead() · if / else · ==</p></div>
  <div class="card"><h3>${ico('target')}实验 02 触摸开关</h3><p><span class="tag dark">摸到 → 读到 1</span></p><p class="small muted">新语法：Serial.println() · A0～A5 当数字口</p></div>
  <div class="card"><h3>${ico('flag')}实验 03 限位开关</h3><p><span class="tag dark">压下 → 读到 0</span></p><p class="small muted">读懂原理图：上拉电阻；程序骨架和实验 01 一样</p></div>
  <div class="card"><h3>${ico('wave')}实验 04 倾斜开关</h3><p><span class="tag dark">读到 0 → 报警</span></p><p class="small muted">一个 if 管两个输出 · 用 // 把代码“注释掉”</p></div>
</div>
<h3 class="mt">四个程序共用一个骨架</h3>
<div class="flow">
  <div><b>1 读</b><br><code>digitalRead()</code></div>
  <div><b>2 打印</b> <span class="small muted">实验 02 起</span><br><code>Serial.println()</code></div>
  <div class="on"><b>3 判断</b><br><code>if … else</code></div>
  <div><b>4 输出</b><br><code>digitalWrite()</code></div>
</div>
<div class="callout mt"><span class="ico">${I('play')}</span><div><b>每个实验都有一个“动手实验室”</b><p>在网页里运行指南的原程序：按按键、摸触摸板、压限位开关、倾斜模块，看灯、蜂鸣器和串口怎么变，再按任务改几行代码。</p></div></div>`
      },

      // ================================================================ 实验 01 按键
      {
        kind: 'section', no: '实验 01', title: '按键模块实验',
        desc: '以前的 LED 实验只用了引脚的“输出”功能。这一次反过来，让 Arduino 读取按键的状态：按下按键，LED 亮；松开，LED 灭。',
        tiles: [
          { title: '原理', sub: '按下 = 低电平' },
          { title: '接线', sub: '按键 → D7，LED → D11' },
          { title: '代码', sub: 'digitalRead · if / else' },
          { title: '动手', sub: '按下就亮，松开就灭' }
        ]
      },
      {
        kind: 'figure',
        title: '认识按键模块：从“输出”到“输入”',
        desc: '引脚既能“说”（OUTPUT 输出），也能“听”（INPUT 输入）。这次用按键做输入、LED 做输出。',
        img: 'img/l12/btn_module_photo.jpg',
        caption: '原指南：按键开关模块 正面 / 反面（反面丝印：Key switch (Press output low) 按下输出低电平）',
        side: `
<div class="card">
  <h3>${ico('target')}实验目的</h3>
  <p>按键接 <b>D7</b>，红灯接 <b>D11</b>：按下按键 LED 亮，松开 LED 灭。</p>
</div>
<div class="grid-2 stretch">
  <div class="card dark"><h3>OUTPUT 输出</h3><p class="small">以前：<code>digitalWrite</code> 点亮 LED</p></div>
  <div class="card pale"><h3>INPUT 输入</h3><p class="small">这次：<code>digitalRead</code> 读取按键</p></div>
</div>
<div class="callout gray"><span class="ico gray">${I('question')}</span><div><b>为什么不用 D0、D1？</b><p>D0～D13 都能接按键，但 D0、D1 兼做串口，上传程序时要和电脑通信，所以先空着。</p></div></div>
<div><p class="small muted">组件清单</p>${chips(['Arduino Uno 主板', '面包板', 'USB 数据线', '按键 ×1', 'LED 灯模块 ×1', '若干跳线'])}</div>`
      },
      {
        kind: 'html',
        title: '实验原理：按下按键 = 低电平',
        desc: '模块里有个上拉电阻：松开时 S 脚是高电平（1）；按下时 S 脚被接到 GND，变成低电平（0）。',
        body: `
<div class="grid-2">
  <div class="grid-2 stretch">
    <div class="card"><h3>${ico('hand', 'gray')}① 松开按键</h3>${pullupSvg(false, 'D7')}<p class="center mt-s"><span class="tag outline">S ≈ 5V → 读到 1</span></p></div>
    <div class="card pale"><h3>${ico('hand')}② 按下按键</h3>${pullupSvg(true, 'D7')}<p class="center mt-s"><span class="tag dark">S ≈ 0V → 读到 0</span></p></div>
  </div>
  <div class="stack">
    <div class="callout"><span class="ico">${I('bulb')}</span><div><b>打个比方</b><p>上拉电阻像一根弹簧，平时把 S 脚“拉”在 5V，所以读到 1；按下按键，S 脚直接接到 GND，读到 0。</p></div></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>按键</th><th>S 脚电压</th><th>digitalRead</th><th>LED</th></tr></thead>
      <tbody><tr><td>松开</td><td>约 5V</td><td><b>1（HIGH）</b></td><td>灭</td></tr>
      <tr class="hl"><td>按下</td><td>约 0V</td><td><b>0（LOW）</b></td><td>亮</td></tr></tbody>
    </table></div>
    ${warnCard('原指南这里写反了', '原文说“按下按钮时，D7 号接口处于高电平”。模块背面印着 <span class="tag outline">按下输出低电平</span>，程序也是 <code>value == LOW</code> 时点灯——以程序为准：按下 → LOW → 灯亮。')}
  </div>
</div>`
      },
      {
        kind: 'wiring',
        title: '接线：按键接 D7，LED 接 D11',
        desc: '按键模块的 S、G、V 分别接 7、GND、5V；LED 正极接 11，负极接 GND。先拔掉 USB 再接线。',
        img: 'img/l12/btn_wiring.jpg',
        caption: '原指南接线图：绿线 7 → S · 红线 5V → V · 黑线 GND → G；蓝线 11 → 电阻 → LED',
        tables: [
          { left: 'Arduino Uno', right: '按键模块', rows: [['7', 'S'], ['GND', 'G'], ['5V', 'V']] },
          { left: 'Arduino Uno', right: 'LED 灯', rows: [['11', '+'], ['GND', '-']] }
        ],
        note: '图中 LED 插在面包板上，还串了一个电阻限流；换成 LED 模块时，直接接模块的 +、− 即可。LED 长脚是正极（+）。',
        side: `<div class="callout gray"><span class="ico gray">${I('eye')}</span><div>按键模块三根针的顺序是 <strong>S、V、G</strong>，对着模块上的丝印插，别插反。</div></div>`
      },
      {
        kind: 'html',
        title: '新语法：pinMode(INPUT)、digitalRead() 与 if / else',
        desc: '先打比方，再看最小的例子。',
        body: `
<div class="grid-2 stretch">
  <div class="card">
    <h3>${ico('hand')}耳朵和嘴巴</h3>
    <p>引脚像人：OUTPUT 是“嘴巴”，用 <code>digitalWrite</code> 往外说；INPUT 是“耳朵”，用 <code>digitalRead</code> 听外面的动静。</p>
<pre class="snippet"><code>pinMode(11, OUTPUT);     // 11 号当嘴巴
pinMode(7, INPUT);       // 7 号当耳朵
value = digitalRead(7);  // 听一次</code></pre>
    <p class="small">答案只有两个：<b>HIGH</b>（也写成 1，约 5V）或 <b>LOW</b>（也写成 0，约 0V）。它回答的是电平高低，不是“按下 / 松开”——按下对应哪一个要看模块。</p>
  </div>
  <div class="card">
    <h3>${ico('flag')}岔路口的路牌：if / else</h3>
    <p>路牌上写着条件：成立就走 if 的路，不成立就走 else 的路，两条只走一条。</p>
<pre class="snippet"><code>if (value == LOW) {
  // 成立（按下了）：灯亮
} else {
  // 不成立（松开）：灯灭
}</code></pre>
    <p class="small"><code>==</code> 两个等号是“比较”：问 value 等于 LOW 吗？ <code>=</code> 一个等号是“赋值”：把右边放进左边。</p>
  </div>
</div>
<div class="callout warn mt"><span class="ico">${I('warn')}</span><div><b>最常犯的错</b><p>写成 <code>if( value = LOW )</code> 也能运行，但它把 LOW 放进了 value，条件永远不成立，按了灯也不亮——实验室的任务 4 让你亲手试一次。</p></div></div>`
      },
      {
        kind: 'code',
        title: '代码逐行看懂（1/2）：准备工作',
        desc: '先给两个引脚起名字、准备一个装读数的“盒子”，再在 setup() 里分好谁是输入、谁是输出。',
        file: 'key_led.ino', code: BUTTON, from: 1, to: 9, hl: [1, 2, 3, 6, 7],
        notes: [
          { line: [1, 2], text: '起名字：<code>led_out</code> 是 11 号（接 LED），<code>keypad_pin</code> 是 7 号（接按键）。' },
          { line: 3, text: '<code>value</code>：装读数的盒子，没写初值，开机自动是 0——loop() 一开始就会把读数放进来。' },
          { line: 4, text: '<code>setup()</code>：通电后只运行一次。' },
          { line: [6, 7], text: '11 号设成 OUTPUT（嘴巴），7 号设成 INPUT（耳朵）。' },
          { line: 8, text: '开机先让 LED 熄灭。' }
        ],
        foot: `<div class="callout gray"><span class="ico gray">${I('book')}</span><div><b>注释翻译</b><p>key pin = 按键引脚；init … output / input = 设为输出 / 输入。<code>//</code> 后面的注释只给人看，Arduino 不执行。</p></div></div>`
      },
      {
        kind: 'code',
        title: '代码逐行看懂（2/2）：读按键、做判断',
        desc: 'loop() 不停地重复：读 7 号脚 → 是 LOW（按下了）就点亮 LED → 否则熄灭。',
        file: 'key_led.ino', code: BUTTON, from: 10, to: 22, hl: [12, 13],
        notes: [
          { line: 12, text: '读 7 号脚，存进 <code>value</code>：松开读到 1（HIGH），按下读到 0（LOW）。' },
          { line: 13, text: '<code>value == LOW</code> 就是“按键被按下了”。两个等号：比较。' },
          { line: [14, 17], text: '成立 → 11 号输出 HIGH → LED 亮。' },
          { line: [18, 21], text: '否则（松开）→ LED 灭。第 20 行注释也写成了 “is down”，其实这里是松开，注释笔误不影响运行。' },
          { line: 22, text: 'loop() 结束，马上回到第 12 行再读一次。' }
        ],
        foot: `<div class="callout"><span class="ico">${I('bolt')}</span><div><b>loop() 转得有多快？</b><p>这段 loop() 里没有 delay，一秒能转几万圈，所以手一按，灯几乎同时就亮。</p></div></div>`
      },
      {
        kind: 'lab',
        title: '动手实验室：按键控制 LED',
        desc: '点 ▶ 运行，按住“虚拟电路”里的红色按键（也可以用 Tab 选中它再按住空格）。',
        lab: {
          programs: [{ name: 'key_led.ino', label: '按键程序（指南原样）', code: BUTTON }],
          parts: [
            { type: 'board' },
            { type: 'button', pin: 7, label: '按键模块 S→D7' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED +→D11' }
          ],
          tasks: [
            { text: '按住按键：LED 亮了吗？松开呢？同时看右下角“变量”里的 <code>value</code>，和“引脚”里 D7、D11 的变化。' },
            { text: '速度选 <b>0.1× 慢动作</b>，“跟随行”保持勾选：按住和松开时，高亮的执行行分别走 if 还是 else？' },
            { text: '反过来：把第 13 行的 <code>LOW</code> 改成 <code>HIGH</code> 再运行——松开时灯亮，按下时灯灭。', code: BUTTON.replace('if( value == LOW )', 'if( value == HIGH )') },
            { text: '试一次最常见的坑：把 <code>==</code> 写成一个 <code>=</code>，即 <code>if( value = LOW )</code>。能运行吗？按下时灯亮不亮？编辑器给了什么提示？', code: BUTTON.replace('if( value == LOW )', 'if( value = LOW )') },
            { text: '让按键“开口说话”：在 setup() 里加 <code>Serial.begin(9600);</code>，在读按键那一行 <code>value = digitalRead(keypad_pin);</code> 后面加 <code>Serial.println(value);</code>。看串口监视器：松开是几，按下是几？', code: BTN_TALK }
          ],
          smoke: [
            { expect: { pin: [11, 0], var: ['value', 1], part: ['led', 'brightness', '0.000'] } },
            { press: 'button' },
            { expect: { pin: [11, 1], var: ['value', 0], part: ['led', 'brightness', LIT] } },
            { release: true },
            { expect: { pin: [11, 0], var: ['value', 1] } },
            { task: 3, run: true },
            { expect: { pin: [11, 1], var: ['value', 1] } },
            { press: 'button' },
            { expect: { pin: [11, 0], var: ['value', 0] } },
            { release: true },
            { task: 4, run: true },
            { press: 'button' },
            { wait: 300, expect: { pin: [11, 0], var: ['value', 0], state: 'running', msg: '只写了一个等号' } },
            { release: true },
            { task: 5, run: true },
            { expect: { serial: '1', noSerial: '0' } },
            { press: 'button' },
            { expect: { serial: '0', pin: [11, 1] } },
            { release: true }
          ]
        }
      },
      {
        kind: 'figure',
        title: '实验结果：按下就亮，松开就灭',
        desc: 'LED 跟着按键走：按住按键灯一直亮，一松手灯就灭。',
        img: 'img/l12/btn_result_photo.jpg',
        caption: '原指南实物照片：按键模块 + 面包板上的黄色 LED 接 UNO（灯的颜色不影响结果）',
        side: `
<div class="callout note"><span class="ico">${I('book')}</span><div><b>原指南“实验结论”处空白</b><p>PDF 这里只有标题，没有文字。按程序运行：按住按键 LED 亮，松开 LED 灭。</p></div></div>
<div><p class="small muted">一按一放，程序这样走</p>
<div class="table-wrap"><table class="table">
  <thead><tr><th>按键</th><th>D7 读到</th><th>走哪条路</th><th>LED</th></tr></thead>
  <tbody><tr><td>松开</td><td>HIGH（1）</td><td>else</td><td>灭</td></tr>
  <tr class="hl"><td>按下</td><td>LOW（0）</td><td>if</td><td>亮</td></tr></tbody>
</table></div></div>
<div class="callout"><span class="ico">${I('reset')}</span><div>快速连按几下，灯也跟着闪：loop 转得比手快得多。</div></div>`
      },
      {
        kind: 'html',
        title: '常见坑：灯不听按键的话',
        desc: '先对照这四个常见错误排查，大部分问题都在这里。',
        body: `
<div class="grid-2 stretch">
  ${warnCard('写成 if( value = LOW )', '一个等号是赋值，条件永远不成立，怎么按灯都不亮。比较要写 <code>==</code>。')}
  ${warnCard('以为 HIGH 就是“按下”', '这块按键模块按下时反而是 LOW。换一个模块，先用串口看看它按下时读到几。')}
  ${warnCard('按键接到了 D0 / D1', '这两个脚兼做串口，可能让上传失败、读数不准。按指南接 D7。')}
  ${warnCard('模块没供电', 'V、G 没接好时，模块上的 Power 灯不亮，按了也没反应。')}
</div>
<div class="callout mt"><span class="ico">${I('list')}</span><div><b>排查三步：电源 → 输入 → 输出</b><p>① 模块的 Power 灯亮吗？② 按下时 <code>value</code> 变成 0 吗？（实验室看“变量”，实物加一句 <code>Serial.println(value);</code>）③ D11 输出 HIGH 时灯亮吗？哪一步不对，就查哪一段接线或代码。</p></div></div>`
      },

      // ================================================================ 实验 02 触摸开关
      {
        kind: 'section', no: '实验 02', title: '触摸开关模块实验',
        desc: '不用按，轻轻一摸就能开灯。触摸模块和按键正好相反：摸到时输出高电平。这一次还要打开串口，亲眼“看见”传感器的读数。',
        tiles: [
          { title: '认识', sub: 'TTP223B 电容触摸' },
          { title: '接线', sub: 'A0 读触摸，A5 控灯' },
          { title: '代码', sub: 'Serial.println()' },
          { title: '动手', sub: '一摸就亮' }
        ]
      },
      {
        kind: 'html',
        title: '认识触摸开关模块',
        desc: '手指一靠近，触摸芯片就能感觉到：平时输出低电平，摸到时输出高电平。',
        body: `
<div class="grid-2">
<figure class="figure"><img src="img/l12/touch_module_photo.jpg" alt="触摸开关模块实物图：蓝色 Touch Sensor，引脚 SIG VCC GND"><figcaption>原指南：触摸开关模块实物图（引脚 SIG · VCC · GND）</figcaption></figure>
<div class="stack">
<div class="card">
  <ol class="steps">
    <li>核心是触摸检测芯片 <b>TTP223B</b>：电容式、点动型——摸着才有信号，松手就没有。</li>
    <li>平时输出<b>低电平</b>（低功耗模式）；手指一摸输出<b>高电平</b>（快速模式）；连续 12 秒没人摸，又回到低功耗模式。</li>
    <li>可以装在塑料、玻璃等非金属表面后面，盖一张薄纸也能用——做成藏在墙上、桌面里的“隐藏按键”。</li>
  </ol>
</div>
<div class="callout"><span class="ico">${I('bulb')}</span><div><b>打个比方</b><p>和手机触摸屏一个道理：手指能导电，靠近感应区会改变它的电容，芯片据此判断“有人摸”。</p></div></div>
</div>
</div>`
      },
      {
        kind: 'html',
        title: '实验目的与原理：摸到 = 高电平',
        desc: '触摸模块检测到手指就输出高电平：Arduino 读到 1 就点亮 LED，否则熄灭。',
        body: `
<div class="grid-2 stretch">
  <div class="card"><h3>${ico('target')}实验目的</h3><ol><li>了解触摸开关模块的工作原理；</li><li>用 Arduino 读取触摸开关，控制 LED 灯亮灭。</li></ol></div>
  <div class="card"><h3>${ico('book')}实验原理（原文）</h3><p>“使用 Arduino 控制触摸开关控制 LED 灯亮灭，用手指触摸触摸开关模块，当 Arduino UNO 板检测到触摸开关模块输出高电平，控制 LED 灯亮，<strong>负责</strong> LED 灯灭。”</p><p class="small muted">“负责”是错字，应为“否则”：摸到灯亮，否则灯灭。</p></div>
</div>
<div class="mt"><p class="small muted">组件</p>${chips(['Arduino UNO R3 主板', '面包板', 'USB 数据线', '触摸开关模块 ×1', 'LED 模块 ×1', '若干跳线'])}</div>
<div class="grid-2 stretch mt">
  <div class="card"><h3>${ico('hand', 'gray')}按键模块（实验 01）</h3><p>按下 → 输出低电平 → 读到 <b>0</b></p><p><code>if( value == LOW )</code></p></div>
  <div class="card pale"><h3>${ico('target')}触摸开关模块（实验 02）</h3><p>摸到 → 输出高电平 → 读到 <b>1</b></p><p><code>if(val==1)</code></p></div>
</div>
<div class="callout mt"><span class="ico">${I('eye')}</span><div>以后遇到新传感器，第一步先弄清：<strong>触发时读到 0 还是 1？</strong>再决定 if 里写什么。</div></div>`
      },
      {
        kind: 'wiring',
        title: '接线：A0 读触摸，A5 控制灯',
        desc: '触摸模块 SIG 接 A0；灯接 A5——模拟口 A0～A5 在这里当普通数字口用。',
        img: 'img/l12/touch_wiring.jpg',
        caption: '原指南接线图：黄线是信号（A0 → SIG，A5 → R），红线 5V，黑线 GND',
        tables: [
          { left: 'Arduino UNO', right: '触摸开关模块', rows: [['A0', 'SIG（信号引脚）'], ['5V', 'VCC(+)'], ['GND', 'GND(-)']] },
          { left: 'Arduino UNO', right: 'LED', rows: [['A5', '+'], ['GND', 'GND(-)']] }
        ],
        note: '原指南接线图里的“LED”其实是一块 <strong>RGB 贴片模块</strong>：A5 接它的 <strong>R</strong> 脚，GND 接 − 脚，所以亮红灯。用普通 LED 模块也行：A5 接 +。'
      },
      {
        kind: 'html',
        title: '新语法：Serial.println() 与“兼职”的 A0～A5',
        desc: '串口是 Arduino 和电脑聊天的窗口：把读数打印出来，看不见的传感器状态就“看得见”了。',
        body: `
<div class="grid-2 stretch">
  <div class="card">
    <h3>${ico('send')}Serial.println(val)</h3>
    <p>打个比方：串口像 Arduino 发给电脑的短信。先在 setup() 里约好速度，再在 loop() 里一句一句发。</p>
<pre class="snippet"><code>Serial.begin(9600);   // 打开窗口
Serial.println(val);  // 说一句并换行</code></pre>
    <p class="small muted">串口监视器里会看到：</p>
<pre class="snippet"><code>0
0
1      ← 摸到了
1
0      ← 松开手</code></pre>
    <p class="small">实验室右下角就是串口监视器。真的 Arduino IDE 里点右上角的放大镜打开它，波特率选 9600，否则是乱码。</p>
  </div>
  <div class="card">
    <h3>${ico('chip')}A0～A5 也能当数字口</h3>
    <p>A0～A5 本职是读模拟量（<code>analogRead</code>），也能“兼职”当普通数字口，用 <code>digitalRead</code> / <code>digitalWrite</code>。</p>
<pre class="snippet"><code>int Led=A5;        // A5 接灯
int SensorPin=A0;  // A0 接触摸
val=digitalRead(SensorPin);</code></pre>
    ${warnCard('把 A0 写成 0', '数字 <code>0</code> 指的是 D0 号脚（串口接收脚），不是 A0！模拟口要写 <code>A0</code>。')}
  </div>
</div>`
      },
      {
        kind: 'code',
        title: '代码逐行看懂：读数、打印、判断',
        desc: '原指南这一节的程序是空白的：下面的程序来自同一套件《Arduino 编程入门学习教程》第 2.19 讲，接线和本指南一致。',
        file: 'touch_led.ino', code: TOUCH, from: 1, to: 22, hl: [1, 2, 12, 13, 14],
        notes: [
          { line: [1, 2], text: 'A5 接灯、A0 接触摸：两个模拟口都当数字口用。' },
          { line: 3, text: '<code>val</code> 装读数，先放 0。' },
          { line: [6, 7], text: 'A5 设为输出，A0 设为输入。' },
          { line: 8, text: '打开串口，速度 9600。' },
          { line: 12, text: '读 A0：没摸 0，摸到 1。' },
          { line: 13, text: '把读数打印到串口。' },
          { line: [14, 17], text: 'val 是 1（摸到）→ 灯亮。<code>val==1</code> 也可以写成 <code>val==HIGH</code>。' },
          { line: [18, 21], text: '否则 → 灯灭。' }
        ],
        foot: `<div class="callout"><span class="ico">${I('eye')}</span><div><b>和按键程序比一比</b><p>骨架一样：读 → 判断 → 输出；只多了串口两句（第 8、13 行），条件换成 <code>val==1</code>。</p></div></div>`
      },
      {
        kind: 'lab',
        title: '动手实验室：摸一下，灯就亮',
        desc: '点 ▶ 运行，按住蓝色触摸板（= 手指放上），同时看灯和串口监视器。',
        lab: {
          programs: [{ name: 'touch_led.ino', label: '触摸程序', code: TOUCH, note: '原指南此处空白，程序来自同一套件《Arduino 编程入门学习教程》第 2.19 讲，接线与本指南一致。' }],
          parts: [
            { type: 'board' },
            { type: 'touch', pin: 'A0', label: '触摸模块 SIG→A0' },
            { type: 'led', pin: 'A5', color: '#ff4d4f', label: 'RGB 模块 R→A5（当红灯用）' }
          ],
          baud: 9600,
          tasks: [
            { text: '按住触摸板：灯亮了吗？串口里的数字从 0 变成了几？松开呢？' },
            { text: '勾选“手指一直放着”，看右下角“引脚”：A0 是输入、A5 是输出——模拟口也能当数字口。' },
            { text: '反过来：把第 14 行改成 <code>if(val==0)</code>——松手时灯亮，摸着时灯灭。', code: TOUCH.replace('if(val==1)', 'if(val==0)') },
            { text: '把第 14 行的 <code>1</code> 换成 <code>HIGH</code>（<code>if(val==HIGH)</code>）：效果和原程序一样吗？', code: TOUCH.replace('if(val==1)', 'if(val==HIGH)') },
            { text: '串口刷得太快？在第 13 行后面加一句 <code>delay(200);</code>：一秒只打印 5 行，好读多了。但摸了以后灯要等一下才亮——为什么？', code: TOUCH.replace('  Serial.println(val);\n', '  Serial.println(val);\n  delay(200);\n') }
          ],
          smoke: [
            { expect: { pin: [19, 0], serial: '0', var: ['val', 0], part: ['touch', 'pressed', '0'] } },
            { press: 'touch' },
            { expect: { pin: [19, 1], serial: '1', var: ['val', 1], part: ['led', 'brightness', LIT] } },
            { release: true },
            { expect: { pin: [19, 0], var: ['val', 0] } },
            { task: 3, run: true },
            { expect: { pin: [19, 1] } },
            { press: 'touch' },
            { expect: { pin: [19, 0] } },
            { release: true },
            { task: 4, run: true },
            { press: 'touch' },
            { expect: { pin: [19, 1], var: ['val', 1] } },
            { release: true },
            { task: 5, run: true },
            { press: 'touch' },
            { expect: { pin: [19, 1], serial: '1' }, timeout: 3000 },
            { release: true },
            { expect: { pin: [19, 0] }, timeout: 3000 }
          ]
        }
      },
      {
        kind: 'figure',
        title: '实验结果：一摸就亮',
        desc: '手指按在触摸区上，RGB 模块亮红灯；松开手，灯就灭——串口里的数字同步在 0 和 1 之间切换。',
        img: ['img/l12/touch_result_photo.jpg', 'img/l12/touch_shield_photo.jpg'],
        captions: ['原指南：手指触摸后，RGB 模块亮红灯', '原指南：Sensor V5.0 扩展板接法'],
        side: `
<div class="callout note"><span class="ico">${I('plug')}</span><div><b>原指南：扩展板接法</b><p>如果你的套件中有 Sensor V5.0 扩展板，可以照“Sensor V5.0 扩展板接法”那张照片接线：模块直接插到对应引脚的 G、V、S 三针座上，程序不用改。</p></div></div>
<div class="table-wrap"><table class="table">
  <thead><tr><th>串口</th><th>手指</th><th>灯</th></tr></thead>
  <tbody><tr><td class="mono">0</td><td>没摸 / 松开</td><td>灭</td></tr>
  <tr class="hl"><td class="mono">1</td><td>摸到</td><td>亮</td></tr></tbody>
</table></div>`
      },
      {
        kind: 'html',
        title: '常见坑与动手改一改',
        desc: '触摸模块很灵敏，也有自己的“小脾气”；盖一张纸，就能玩出新花样。',
        body: `
<div class="grid-2 stretch">
  ${warnCard('一上电就不灵', '通电后约半秒芯片在自动校准，这时别碰触摸区；不灵就松手、重新上电。')}
  ${warnCard('隔着东西摸没反应', '只能隔塑料、玻璃、纸这类非金属，而且要薄。')}
  ${warnCard('摸了，灯却不亮', '先看模块上的小指示灯：亮了说明触摸没问题，去查 A5 和灯；不亮就查 VCC、GND。')}
  ${warnCard('把 A0 写成 0', '<code>int SensorPin=0;</code> 读的是 D0，不是 A0。模拟口要写 <code>A0</code>。')}
</div>
<div class="callout mt"><span class="ico">${I('hand')}</span><div><b>拿到实物再试：做一个“隐藏开关”</b><p>在模块上盖一张便利贴或薄塑料片，隔着它摸，灯照样会亮——开关可以藏进产品外壳里。</p></div></div>`
      },

      // ================================================================ 实验 03 限位开关
      {
        kind: 'section', no: '实验 03', title: '限位开关模块实验',
        desc: '机器上的“到位报告员”：被压下就报告。它的程序和按键实验几乎一模一样，只是换了一个传感器、换了一个引脚。（原指南把这一部分叫作“第 2.17 讲”。）',
        tiles: [
          { title: '认识', sub: '行程开关' },
          { title: '原理', sub: '看懂原理图' },
          { title: '代码', sub: '和按键同一个骨架' },
          { title: '动手', sub: '压下就亮' }
        ]
      },
      {
        kind: 'html',
        title: '认识限位开关：机器的“到位报告员”',
        desc: '限位开关又叫行程开关：机器的运动部件走到预定位置、把它压下，电路就切换，相当于报告“到位了”。',
        body: `
<div class="grid-2">
  <div class="stack">
    <figure class="figure"><img src="img/l12/limit_module_photo.jpg" alt="限位开关模块：带摆杆的微动开关，引脚 OUT GND VCC"><figcaption>原指南：限位开关模块（带摆杆的微动开关，引脚 OUT · GND · VCC）</figcaption></figure>
    <div><p class="small muted">组件清单</p>${chips(['Arduino UNO R3 主板', 'USB 数据线', '限位开关模块 ×1', 'LED 灯模块 ×1', '220Ω 电阻 ×1', '若干跳线'])}</div>
  </div>
  <div class="stack">
    <p>原文：限位开关用于反应设备机械位置的变化，并在设备达到预定位置时实现电路的切换，进而实现：</p>
    <div class="grid-2 stretch">
      <div class="tile turq"><b>行程控制</b><span>走到头就停</span></div>
      <div class="tile"><b>限位保护</b><span>防止冲过头撞坏</span></div>
      <div class="tile dark"><b>报警</b><span>到位或越位就提醒</span></div>
      <div class="tile white"><b>联锁启停</b><span>到位后再做下一步</span></div>
    </div>
    <div class="callout"><span class="ico">${I('bulb')}</span><div><b>打个比方</b><p>3D 打印机开机先“回原点”：喷头碰到限位开关，才知道走到头了。它本质上就是一个装了摆杆的微动开关。</p></div></div>
  </div>
</div>`
      },
      {
        kind: 'figure',
        title: '实验原理：读懂原理图，压下为什么是 0',
        desc: '原指南这一节只有一张原理图：OUT 经 10K 电阻接到 5V（上拉），开关 K 一头接地。',
        img: 'img/l12/limit_schematic.jpg',
        caption: '原指南原理图：R1 1K · R2 10K · LED · 开关 K · 接口 J1（GND · VCC · OUT）',
        side: `
<div class="card dark"><h3><span class="tag turq">1</span>松开：OUT = 高电平</h3><p class="small">K 断开，R2 把 OUT 拉到 5V；模块上的 LED 两头都是 5V，不亮。</p></div>
<div class="card pale"><h3><span class="tag dark">0</span>压下：OUT = 低电平</h3><p class="small">K 接通，OUT 直接接地；电流从 +5 经 R1、LED、K 流到地，模块上的 LED 亮。</p></div>
<div class="callout"><span class="ico">${I('bulb')}</span><div><b>和按键模块一样：低电平有效</b><p>R2 像弹簧把 OUT 拉在高处，压下才被拉到地，所以程序写 <code>if(val==0)</code>。</p></div></div>`
      },
      {
        kind: 'wiring',
        title: '接线：OUT 接 10 号脚，LED 接 11 号脚',
        desc: '限位开关 OUT、GND、VCC 接 10、GND、5V；LED 长脚经 220Ω 电阻接 11，短脚接 GND。',
        img: 'img/l12/limit_wiring.jpg',
        caption: '原指南接线图：黄线 10 → S，红线 5V → V，黑线经面包板接 GND；绿线 11 → 电阻 → LED',
        tables: [
          { left: 'Arduino Uno', right: '限位开关模块', rows: [['10', 'OUT'], ['GND', 'GND'], ['5V', 'VCC']] },
          { left: 'Arduino Uno', right: 'LED（中间加电阻）', rows: [['11', '长脚'], ['GND', '短脚']] }
        ],
        note: '接线图里的模块画成了另一种外形，印着 S、G、V：<strong>S＝OUT、G＝GND、V＝VCC</strong>，按丝印接就不会错。“中间加电阻”是指 11 号脚和 LED 长脚之间串一个 220Ω 电阻。'
      },
      {
        kind: 'code',
        title: '代码逐行看懂：和按键实验是同一个骨架',
        desc: '还是“读 → 判断 → 输出”，中间多了串口打印；换成 10 号脚，条件写成 val==0（0 就是 LOW）。',
        file: 'limit_switch.ino', code: LIMIT, from: 1, to: 22, hl: [2, 7, 14],
        notes: [
          { line: [1, 3], text: '11 接 LED，10 接限位开关（按键实验接的是 7 号），<code>val</code> 装读数。' },
          { line: 6, text: '11 设为输出。' },
          { line: 7, text: '10 设为输入。注释写“输出接口”是笔误：INPUT 是输入。' },
          { line: 8, text: '打开串口，速度 9600。' },
          { line: [12, 13], text: '读 10 号脚并打印：松开 1，压下 0。' },
          { line: [14, 17], text: '<code>val==0</code>（压下）→ 灯亮。' },
          { line: [18, 21], text: '否则 → 灯灭。' }
        ],
        foot: warnCard('注释和代码对不上', '第 7 行注释写“定义限位开关引脚为输出接口”，代码其实是 <code>INPUT</code>（输入）。Arduino 只看代码、不看注释，所以照样能运行。')
      },
      {
        kind: 'lab',
        title: '动手实验室：压下限位开关',
        desc: '点 ▶ 运行，按住限位开关的摆杆（= 压下），看 LED、模块指示灯和串口。',
        lab: {
          programs: [{ name: 'limit_switch.ino', label: '限位开关程序（指南原样）', code: LIMIT }],
          parts: [
            { type: 'board' },
            { type: 'limitSwitch', pin: 10, label: '限位开关 OUT→D10' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED 长脚→电阻→D11' }
          ],
          baud: 9600,
          tasks: [
            { text: '按住摆杆：LED 亮了吗？串口里松开是几，压下是几？卡片上模块自己的小指示灯什么时候亮？' },
            { text: '找不同：和按键程序比，这个程序改了哪几处？（提示：引脚、串口两句、条件的写法）' },
            { text: '把第 14 行的 <code>val==0</code> 改成 <code>val==LOW</code>：效果一样吗？0 和 LOW 是一回事。', code: LIMIT.replace('if(val==0)', 'if(val==LOW)') },
            { text: '不接外部 LED 也能看结果：把第 1 行的 <code>11</code> 改成 <code>13</code>，压下时看 UNO 板上的 L 灯（它连着 13 号脚）。', code: LIMIT.replace('int Led =11;', 'int Led =13;') },
            { text: '做一个“到位提醒”：压下时灯一闪一闪。在 if 里点灯之后加 <code>delay(100);</code>、灭灯、再 <code>delay(100);</code>。', code: LIMIT_BLINK }
          ],
          smoke: [
            { expect: { pin: [11, 0], serial: '1', var: ['val', 1], noSerial: '0' } },
            { press: 'limitSwitch' },
            { expect: { pin: [11, 1], serial: '0', var: ['val', 0], part: ['limitSwitch', 'pressed', '1'] } },
            { release: true },
            { expect: { pin: [11, 0], var: ['val', 1] } },
            { task: 3, run: true },
            { press: 'limitSwitch' },
            { expect: { pin: [11, 1] } },
            { release: true },
            { task: 4, run: true },
            { press: 'limitSwitch' },
            { expect: { pin: [13, 1] } },
            { release: true },
            { expect: { pin: [13, 0] } },
            { task: 5, run: true },
            { press: 'limitSwitch' },
            { expect: { pin: [11, 1] } },
            { expect: { pin: [11, 0] } },
            { expect: { pin: [11, 1] } },
            { release: true }
          ]
        }
      },
      {
        kind: 'figure',
        title: '实验结果：压下开关，灯就亮',
        desc: '原指南：现在，上传程序之后，按下限位开关，灯会随之亮起。',
        img: 'img/l12/limit_result_photo.jpg',
        caption: '原指南实物照片：限位开关模块 + 面包板上的 LED 接 UNO',
        side: `
<div class="table-wrap"><table class="table">
  <thead><tr><th>串口</th><th>限位开关</th><th>LED</th></tr></thead>
  <tbody><tr><td class="mono">1</td><td>松开</td><td>灭</td></tr>
  <tr class="hl"><td class="mono">0</td><td>压下</td><td>亮</td></tr></tbody>
</table></div>
${warnCard('压下了，灯却不亮？', '先看串口：数字会变 0，说明限位开关这一路没问题，去查 LED（长脚经电阻接 11）；数字不变，查 OUT 是否接在 10 号脚。')}
<div class="callout"><span class="ico">${I('bulb')}</span><div><b>排查口诀</b><p>先看串口，再查接线。</p></div></div>`
      },

      // ================================================================ 实验 04 倾斜开关
      {
        kind: 'section', no: '实验 04', title: '倾斜开关模块实验',
        desc: '里面藏着一颗会滚的小钢珠：一倾斜、一碰撞，电路就接通或断开。用它加上灯和蜂鸣器，做一个“碰一下就报警”的防盗装置。',
        tiles: [
          { title: '认识', sub: '滚珠开关' },
          { title: '原理', sub: '先观察，再判断' },
          { title: '代码', sub: '一个 if 管两个输出' },
          { title: '动手', sub: '倾斜、轻碰，看报警' }
        ]
      },
      {
        kind: 'figure',
        title: '认识倾斜开关：管子里有颗小钢珠',
        desc: '倾斜开关模块也叫滚珠开关、钢珠开关、珠子开关，是震动开关的一种：靠珠子滚动去碰导针，让电路接通或断开。',
        img: 'img/l12/tilt_module_photo.jpg',
        caption: '原指南：倾斜传感器（正面）/（反面），正面金色小管就是 SW-520D 滚珠开关',
        side: `
<div class="card pale"><h3>导针端朝下超过 10°</h3>${tubeSvg(-14, true, '导针端朝下：钢珠压在两根导针上')}<p class="small">钢珠滚到导针处，把两根导针接通 → <b>闭路 ON</b></p></div>
<div class="card"><h3>帽盖端朝下超过 10°</h3>${tubeSvg(14, false, '帽盖端朝下：钢珠离开导针')}<p class="small">钢珠滚到帽盖端，离开导针 → <b>开路 OFF</b></p></div>
<p class="small muted">原文：SW-520、SW-520D 为滚珠型倾斜震动感应<b>单方向性</b>触发开关——只对这一个方向的倾斜敏感。</p>`
      },
      {
        kind: 'html',
        title: '实验目的与原理：先观察，再判断',
        desc: '原指南对“什么时候输出低电平”有两种说法；程序只认一条规则：读到 0 就报警。',
        body: `
<div class="grid-2">
  <div class="stack">
    <div class="card"><h3>${ico('target')}实验目的</h3><ol><li>了解倾斜开关模块的工作原理；</li><li>用 Arduino 控制倾斜开关模块，实现防盗报警的功能。</li></ol></div>
    <div><p class="small muted">组件清单（“贴片模块”就是 RGB 贴片灯模块）</p>${chips(['Arduino UNO R3 主板', '面包板', 'USB 数据线', '倾斜开关模块 ×1', '贴片模块 ×1', '有源蜂鸣器 ×1', '若干跳线'])}</div>
    <div class="card dark"><h3>程序只认一条规则</h3><p><code>if(val==0)</code> → 灯亮、蜂鸣器响</p><p class="small muted">哪种姿势读到 0？运行程序后看串口，自己找答案，不用死记。</p></div>
  </div>
  <div class="stack">
    <div class="card"><p><span class="tag">说法 A · 介绍</span></p><p>“当倾斜传感器感应到倾斜时，模块会输出低电平信号，否则输出高电平。”</p></div>
    <div class="card"><p><span class="tag">说法 B · 实验原理</span></p><p>“当电路板在静止状态时，倾斜开关模块处于闭合状态，当有外力触碰到了电路板致使其倾斜开关里面的滚珠和导线断开接触从而断开电路，此时触发报警，LED 亮，蜂鸣器响。”</p></div>
    <div class="callout note"><span class="ico">${I('info')}</span><div><b>在实验室（本模拟）里</b><p>放平或导针端朝下 → 闭合 → 读到 <strong>0</strong>；帽盖端朝下超过 10°，或点“碰一下” → 断开 → 读到 <strong>1</strong>。实物模块的放法、型号不同，结果可能不一样——所以先看串口。</p></div></div>
  </div>
</div>`
      },
      {
        kind: 'wiring',
        title: '接线：三个模块，三张表',
        desc: '倾斜开关 S 接 12，RGB 贴片模块 R 接 11，蜂鸣器 S 接 13；倾斜开关和蜂鸣器从面包板电源轨取电。',
        img: 'img/l12/tilt_wiring.jpg',
        caption: '原指南接线图：上 RGB 贴片模块 · 中 有源蜂鸣器 · 下 倾斜开关；5V、GND 先接到面包板电源轨',
        tables: [
          { left: 'Arduino UNO', right: '倾斜开关模块', rows: [['12', 'S'], ['5V', 'V'], ['GND', 'G']] },
          { left: 'Arduino UNO', right: '贴片模块', rows: [['11', 'R'], ['GND', 'GND']] },
          { left: 'Arduino UNO', right: '有源蜂鸣器', rows: [['13', 'S'], ['GND', 'G'], ['5V', 'V']] }
        ],
        note: '“贴片模块”就是 RGB 贴片灯模块：11 号脚接它的 <strong>R</strong> 脚，所以报警时亮红灯。13 号脚同时连着 UNO 板上的 L 灯，蜂鸣器响时 L 灯也亮。'
      },
      {
        kind: 'html',
        title: '新语法：一个 if 管两件事，// 让代码“休息”',
        desc: '大括号里可以写好几句，条件成立时一起执行；行首加 // 的代码变成注释，Arduino 会跳过它。',
        body: `
<div class="grid-2 stretch">
  <div class="card">
    <h3>${ico('cube')}一个 if，管两件事</h3>
    <p>打个比方：大括号像打包袋——条件成立时，袋子里的几句从上到下一起执行。</p>
<pre class="snippet"><code>if(val==0)
{
  digitalWrite(Led,HIGH);
  digitalWrite(Buzzer_pin,HIGH);
}</code></pre>
    <p class="small">val 是 0 时，大括号里的两句都执行：灯亮、蜂鸣器响，同时动作。</p>
    ${warnCard('漏写大括号', 'if 只管紧跟的第一句；后面有 else 时还会编译报错。')}
  </div>
  <div class="card">
    <h3>${ico('book')}// 注释：写给人看的便利贴</h3>
    <p><code>//</code> 后面的内容 Arduino 一律跳过。在一行代码前加上 <code>//</code>，它就“休息”了，这叫“注释掉”，调试时很常用。</p>
<pre class="snippet"><code>// delay(1000);   ← 第 20 行：这句不执行</code></pre>
    ${warnCard('注释也会写错', '这个程序第 9、14、16 行的注释都和代码不符——以代码为准。')}
  </div>
</div>`
      },
      {
        kind: 'code',
        title: '代码逐行看懂（1/2）：三个引脚',
        desc: '这次要管三个元件：灯和蜂鸣器是输出，倾斜开关是输入，另外打开串口用来观察。',
        file: 'tilt_alarm.ino', code: TILT, from: 1, to: 11, hl: [1, 2, 3, 9],
        notes: [
          { line: [1, 3], text: '11 接灯（RGB 模块 R），13 接蜂鸣器，12 接倾斜开关。' },
          { line: 4, text: '<code>val</code>：装读数的盒子，先放 0。' },
          { line: [7, 8], text: '灯和蜂鸣器设为输出。' },
          { line: 9, text: '倾斜开关设为输入。注释写“输出接口”是笔误，代码是 <code>INPUT</code>。' },
          { line: 10, text: '打开串口，速度 9600。' }
        ],
        foot: `<div class="callout gray"><span class="ico gray">${I('info')}</span><div>变量名 <code>buttonpin</code> 是沿用按键实验的名字，其实接的是倾斜开关——名字可以随便起，但最好见名知意。</div></div>`
      },
      {
        kind: 'code',
        title: '代码逐行看懂（2/2）：读到 0 就报警',
        desc: 'loop() 一直在问：倾斜开关读到 0 了吗？是 → 灯亮、蜂鸣器响；否 → 全部关掉。',
        file: 'tilt_alarm.ino', code: TILT, from: 12, to: 27, hl: [14, 16, 20],
        notes: [
          { line: 14, text: '读 12 号脚存进 <code>val</code>。注释说“数字接口 A5”是笔误：读的是 12 号脚（buttonpin）。' },
          { line: 15, text: '把 val 打印到串口——观察就靠它。' },
          { line: 16, text: 'val 是 0 就报警。注释说“LED 闪烁”也是笔误：灯是常亮的。' },
          { line: [18, 19], text: '灯亮、蜂鸣器响。' },
          { line: 20, text: '这句被 <code>//</code> 注释掉了，不执行。就算恢复它，if 里也没有关灯的语句，灯还是常亮——想闪，要像任务 4 那样加上关灯和 delay。' },
          { line: [22, 26], text: '否则：灯灭、蜂鸣器停。' }
        ],
        foot: warnCard('原程序有三处注释和代码对不上', '第 9 行（INPUT 写成“输出接口”）、第 14 行（读的是 12 号脚，不是 A5）、第 16 行（灯常亮，不是闪烁）。都不影响运行。')
      },
      {
        kind: 'lab',
        title: '动手实验室：倾斜报警器',
        desc: '想听声音先点蜂鸣器卡片上的“开启声音”。拖“倾斜”滑块改变角度，点“碰一下”模拟轻碰，同时看串口里的 val。',
        lab: {
          programs: [{ name: 'tilt_alarm.ino', label: '倾斜报警（指南原样）', code: TILT }],
          parts: [
            { type: 'board' },
            { type: 'tilt', pin: 12, label: '倾斜开关 S→D12', angle: 0 },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'RGB 模块 R→D11' },
            { type: 'buzzer', pin: 13, kind: 'active', label: '有源蜂鸣器 S→D13' }
          ],
          baud: 9600,
          tasks: [
            { text: '运行后先别动（滑块 0°，放平）：串口里 val 是几？灯亮吗？蜂鸣器响吗？' },
            { text: '把“倾斜”滑块拖到 <b>+30°</b>（帽盖端朝下），再拖到 <b>−30°</b>（导针端朝下），最后放回 0° 点“碰一下”。连同任务 1 的“放平”，记下这四种姿势的 val 和报警情况：哪几种读到 0？' },
            { text: '本模拟里放平就读到 0，原程序会一直响。改成“平时安静、一碰就响”的防盗报警：把第 16 行的 <code>val==0</code> 改成 <code>val==1</code>，滑块放 0°，再点“碰一下”。', code: TILT.replace('if(val==0)', 'if(val==1)') },
            { text: '让报警真的“闪”起来：把第 20 行换成 <code>delay(100);</code>，再关灯、关蜂鸣器，再 <code>delay(100);</code>——亮 0.1 秒、灭 0.1 秒（载入参考代码看看）。把两个 100 都改成 300，节奏会怎样？', code: TILT_BLINK },
            { text: '调试时太吵？在第 19 行前面加 <code>//</code>，把蜂鸣器那句“注释掉”：只亮灯，不响。', code: TILT.replace('    digitalWrite(Buzzer_pin,HIGH);', '    // digitalWrite(Buzzer_pin,HIGH);') }
          ],
          smoke: [
            { expect: { var: ['val', 0], serial: '0', pin: [11, 1], freq: ['buzzer', 2300, 0.05], part: ['tilt', 'open', '0'] } },
            { expect: { pin: [13, 1] } },
            { slider: 'tilt', value: 30 },
            { expect: { var: ['val', 1], serial: '1', pin: [11, 0], freq: ['buzzer', 0, 0], part: ['tilt', 'open', '1'] } },
            { slider: 'tilt', value: -30 },
            { expect: { var: ['val', 0], pin: [13, 1], part: ['tilt', 'open', '0'] } },
            { task: 3, run: true },
            { expect: { var: ['val', 0], pin: [11, 0] } },
            { slider: 'tilt', value: 0 },
            { expect: { pin: [13, 0], part: ['tilt', 'open', '0'] } },
            { click: 'tilt' },
            { expect: { pin: [13, 1] }, timeout: 1500 },
            { expect: { pin: [13, 0], var: ['val', 0] }, timeout: 2000 },
            { task: 4, run: true },
            { expect: { pin: [11, 1] } },
            { expect: { pin: [11, 0] } },
            { expect: { pin: [11, 1] } },
            { task: 5, run: true },
            { expect: { pin: [11, 1], part: ['led', 'brightness', LIT] } },
            { expect: { pin: [13, 0], freq: ['buzzer', 0, 0] } },
            { sound: true, expect: { audio: 1 } }
          ]
        }
      },
      {
        kind: 'figure',
        title: '实验结果：原指南说“碰一下就报警”',
        desc: '原指南：烧录程序后，将倾斜开关模块稍微触碰一下，即可触发报警——LED 灯亮，蜂鸣器响。',
        img: 'img/l12/tilt_result_photo.jpg',
        caption: '原指南实物照片：倾斜开关、RGB 贴片模块、有源蜂鸣器接 UNO',
        side: `
<div><p class="small muted">拿到实物：打开串口，填一填</p>
<div class="table-wrap"><table class="table">
  <thead><tr><th class="l">模块的姿势</th><th>val</th><th>报警了吗</th></tr></thead>
  <tbody>
    <tr><td class="l">平放、静止</td><td class="muted">？</td><td class="muted">？</td></tr>
    <tr><td class="l">导针端朝下</td><td class="muted">？</td><td class="muted">？</td></tr>
    <tr><td class="l">帽盖端朝下</td><td class="muted">？</td><td class="muted">？</td></tr>
    <tr><td class="l">轻轻碰一下</td><td class="muted">？</td><td class="muted">？</td></tr>
  </tbody>
</table></div></div>
<div class="callout note"><span class="ico">${I('eye')}</span><div><b>找规律</b><p>读到 0 的姿势就会报警。实验室的任务 1、2 你已经观察过一次；拿实物再填一次，和模拟比一比——以串口里看到的为准。</p></div></div>`
      },
      {
        kind: 'html',
        title: '常见坑：报警器为什么不听话',
        desc: '先看串口，再查接线：大部分问题，串口里的 val 都会告诉你。',
        body: `
<div class="grid-2 stretch">
  ${warnCard('一直报警，停不下来', '先看串口：一直是 0，说明模块此刻的姿势正好读到 0（本模拟放平就是 0）。换个姿势放，或像任务 3 那样把条件改成 <code>val==1</code>。')}
  ${warnCard('数字乱跳', '多半是 S 线没插牢在 12 号脚，或者模块正在被晃动。')}
  ${warnCard('以为灯会闪', '第 16 行注释说“LED 闪烁”，可 if 里只有点亮、没有熄灭，灯是常亮的；只恢复第 20 行的 delay 也不会闪。想闪，按任务 4 加上关灯和 delay。')}
  ${warnCard('蜂鸣器不响', '有源蜂鸣器给高电平就响；不响先查 13 号脚和 V、G。实验室里要先点“开启声音”才有声音。')}
</div>
<div class="callout mt"><span class="ico">${I('bulb')}</span><div><b>调试小技巧：先安静地观察</b><p>先按任务 5 把蜂鸣器那句注释掉，只看灯和串口：摆几个姿势，弄清哪种读到 0；规律确定了，再去掉 <code>//</code> 让蜂鸣器响。</p></div></div>`
      },

      // ================================================================ 小结
      {
        kind: 'summary',
        kicker: '1-2 开关类传感器　/　小结',
        title: '本节小结：四个传感器，一个骨架',
        desc: '四个程序都是“读 → 判断 → 输出”（实验 02 起中间多了“打印”）；变的只是引脚号，以及触发时读到 0 还是 1。',
        items: [
          { title: '数字输入', text: '<code>pinMode(引脚, INPUT)</code> + <code>digitalRead()</code>：答案只有 1（HIGH）和 0（LOW）。' },
          { title: '== 是比较，= 是赋值', text: '<code>if( value = LOW )</code> 能运行，但条件永远不成立。' },
          { title: '先看串口，再写判断', text: '新传感器触发时是 0 还是 1？先用 <code>Serial.println()</code> 打印出来看。' },
          { title: 'A0～A5 也能当数字口', text: '要写 <code>A0</code>，不要写 <code>0</code>（那是 D0）。' },
          { title: '一个 if 可以管几件事', text: '大括号里的几句，条件成立时一起执行。' },
          { title: '注释只给人看', text: '注释写错不影响运行，以代码为准；<code>//</code> 可以把一句代码“注释掉”。' }
        ],
        body: `
<div class="table-wrap"><table class="table">
  <thead><tr><th class="l">传感器（输入脚）</th><th>触发 → 读到</th><th>if 的条件</th><th class="l">控制的输出</th></tr></thead>
  <tbody>
    <tr><td class="l"><b>按键模块</b>（D7）</td><td>按下 → 0（LOW）</td><td><code>value == LOW</code></td><td class="l">LED（D11）</td></tr>
    <tr><td class="l"><b>触摸开关模块</b>（A0）</td><td>摸到 → 1（HIGH）</td><td><code>val==1</code></td><td class="l">灯（A5）</td></tr>
    <tr><td class="l"><b>限位开关模块</b>（D10）</td><td>压下 → 0</td><td><code>val==0</code></td><td class="l">LED（D11）</td></tr>
    <tr><td class="l"><b>倾斜开关模块</b>（D12）</td><td>看串口：0 时报警</td><td><code>val==0</code></td><td class="l">灯（D11）＋ 蜂鸣器（D13）</td></tr>
  </tbody>
</table></div>`
      },
      {
        kind: 'end',
        title: '一个骨架，四种感知',
        subtitle: '学会了数字输入，Arduino 就能“听见”按键、手指、碰撞和倾斜。\n课后：选一个传感器设计一个小装置——隐藏式触摸台灯、抽屉防盗报警器……'
      }
    ]
  });
})();
