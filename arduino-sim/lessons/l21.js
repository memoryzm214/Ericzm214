/* lessons/l21.js — 2-1 PWM 与舵机控制
   Guide: arduino-ppt/assets/l21/guide_text.md (PDF 18 页). Four experiments in the guide's order:
     ① PWM 调节 LED 灯亮度 ② RGB 贴片模块呼吸灯 ③ 电位器调节舵机 ④ 摇杆模块
   Explanations, analogies, pitfalls and 动手改一改 ideas are ported from arduino-ppt/build/21_lesson_2-1.js.
   Programs are copied verbatim from the guide's cpp blocks (generated, do not retype them).
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- programs copied verbatim from arduino-ppt/assets/l21/guide_text.md (in the guide's order)
  const PWM = `
int ADPIN = A0 ;
int PWM_LEDPIN = 11 ;
int value = 0 ;
float voltage = 0.0 ;
void setup()
{
    pinMode(ADPIN,INPUT);    // define ADPIN input PWM_LEDPIN output
    pinMode(PWM_LEDPIN,OUTPUT);
    Serial.begin(9600);    //Serial Baud rate is 9600
}
void loop()
{
    value = analogRead(ADPIN);        //读取 A0 引脚读取的可调电位计模拟值
    Serial.print("value1=="); //打印模拟值
    Serial.print(value);
    voltage = ( float )value /1023 ;//计算电压
    Serial.print("     voltage==");//打印电压
    Serial.print(voltage);
    value = (int)(voltage * 256 );//计算输出的 PWM 值
    Serial.print("    PWM==");//打印 PWM 值
    Serial.println(value);
    analogWrite(PWM_LEDPIN,value);
    delay(0);
}
`;
  const RGB = `
#define RGB_RED     11
#define RGB_GREEN   10
#define RGB_BLUE    9

void setup()
{
    pinMode(RGB_RED,OUTPUT);
    pinMode(RGB_GREEN,OUTPUT);
    pinMode(RGB_BLUE,OUTPUT);
}

void setColor(int red,int green,int blue)
{
    analogWrite(RGB_RED,red);
    analogWrite(RGB_GREEN,green);
    analogWrite(RGB_BLUE,blue);
}

void loop()
{
    int i;
    for(i=0;i<256;i++)
    {
        setColor(i,0,0);
        delay(4);
    }
    delay(500);            //turn the RGB LED red smoth

    for(i=0;i<256;i++)
    {
        setColor(0,i,0);
        delay(4);
    }
    delay(500);            //turn the RGB LED green smoth

    for(i=0;i<256;i++)
    {
        setColor(0,0,i);
        delay(4);
    }
    delay(100);            //turn the RGB LED blue smoth
}
`;
  const SERVO = `
#include <Servo.h>
Servo myservo;  // create servo object to control a servo
int readPin = A0;
int servopin = 7;

void setup() {
    pinMode(servopin,OUTPUT);
    myservo.attach(servopin);   // attaches the servo on pin 9 to the servo object
}

void loop() {
    int readValue = analogRead(readPin);
    int angle = readValue / 4;
    myservo.write(angle);              // tell servo to go to position in variable 'pos'
    delay(15);
}
`;
  const JOY1 = `
// X values will be read from pin 0 and Y from pin 1
#define PIN_ANALOG_X 0
#define PIN_ANALOG_Y 1
void setup() {
 // Start serial because we will observe values at serial monitor
 Serial.begin(9600);
}
void loop() {
 // Print x axis values
 Serial.print("x: ");
 Serial.println(analogRead(PIN_ANALOG_X));
 // Print y axis values
 Serial.print("y: ");
 Serial.println(analogRead(PIN_ANALOG_Y));
 // Some delay to clearly observe your values on serial monitor.
 delay(500);
}
`;
  const JOY2 = `
#define BUTTON_UP 2
#define BUTTON_RIGHT 3
#define BUTTON_DOWN 4
#define BUTTON_LEFT 5
#define BUTTON_E 6
#define BUTTON_F 7
#define BUTTON_K 8
#define PIN_ANALOG_X 0
#define PIN_ANALOG_Y 1
#define DELAY 500
void setup() {
 Serial.begin(9600);
 // to enable pull up resistors first write pin mode
 // and then make that pin HIGH
 pinMode(BUTTON_UP, INPUT);
 digitalWrite(BUTTON_UP, HIGH);
 pinMode(BUTTON_RIGHT, INPUT);
 digitalWrite(BUTTON_RIGHT, HIGH);
 pinMode(BUTTON_DOWN, INPUT);
 digitalWrite(BUTTON_DOWN, HIGH);
 pinMode(BUTTON_LEFT, INPUT);
 digitalWrite(BUTTON_LEFT, HIGH);
 pinMode(BUTTON_E, INPUT);
 digitalWrite(BUTTON_E, HIGH);
 pinMode(BUTTON_F, INPUT);
 digitalWrite(BUTTON_F, HIGH);
 pinMode(BUTTON_K, INPUT);
 digitalWrite(BUTTON_K, HIGH);
}
void loop() {
 if(digitalRead(BUTTON_UP) == LOW) {
   Serial.println("Button A is pressed");
   delay(DELAY);
 }
 else if(digitalRead(BUTTON_RIGHT) == LOW) {
   Serial.println("Button B is pressed");
   delay(DELAY);
 }
 else if(digitalRead(BUTTON_DOWN) == LOW) {
   Serial.println("Button C is pressed");
   delay(DELAY);
 }
 else if(digitalRead(BUTTON_LEFT) == LOW) {
   Serial.println("Button D is pressed");
   delay(DELAY);
 }
 else if(digitalRead(BUTTON_E) == LOW) {
   Serial.println("Button E is pressed");
   delay(DELAY);
 }
 else if(digitalRead(BUTTON_F) == LOW) {
   Serial.println("Button F is pressed");
   delay(DELAY);
 }
 else if(analogRead(PIN_ANALOG_X)<520){
   Serial.println(" left");
   delay(DELAY);
 }
 else if(analogRead(PIN_ANALOG_X)>530){
   Serial.println(" right");
   delay(DELAY);
 }
 else if(analogRead(PIN_ANALOG_Y)>520){
   Serial.println(" up");
   delay(DELAY);
 }
 else if(analogRead(PIN_ANALOG_Y)<515){
   Serial.println(" down");
   delay(DELAY);
 }
 // Some delay to clearly observe your values on serial monitor.
 if(digitalRead(BUTTON_K) == LOW) {
   Serial.println("Button k is pressed");
   delay(DELAY);
 }
}
`;

  // ---- variants (built from the originals so they stay in sync)
  // PWM: map() instead of ×256 (never 256), then the real voltage (×5), then the knob reversed
  const PWM_MAP = PWM.replace('value = (int)(voltage * 256 );', 'value = map(value, 0, 1023, 0, 255);');
  const PWM_VOLT = PWM_MAP.replace('voltage = ( float )value /1023 ;', 'voltage = ( float )value /1023 * 5 ;');
  const PWM_REV = PWM_MAP.replace('map(value, 0, 1023, 0, 255)', 'map(value, 0, 1023, 255, 0)');
  // RGB: slower fade, a real breathing light (fade-out loops), mixing red + green, the i<=256 boundary bug
  const fadeOut = c => '\n    for(i=255;i>=0;i--)     // 新加：从 255 往下数，慢慢变暗\n    {\n        setColor(' + c + ');\n        delay(4);\n    }';
  const RGB_SLOW = RGB.replace(/delay\(4\)/g, 'delay(10)');
  const RGB_BREATH = RGB
    .replace('//turn the RGB LED red smoth', '//turn the RGB LED red smoth' + fadeOut('i,0,0'))
    .replace('//turn the RGB LED green smoth', '//turn the RGB LED green smoth' + fadeOut('0,i,0'))
    .replace('//turn the RGB LED blue smoth', '//turn the RGB LED blue smoth' + fadeOut('0,0,i'));
  const RGB_YELLOW = RGB.replace('setColor(i,0,0);', 'setColor(i,i,0);');
  const RGB_256 = RGB.replace('for(i=0;i<256;i++)', 'for(i=0;i<=256;i++)');
  // SERVO: the PDF lost loop()'s closing } at a page break (guide_text.md has it restored)
  const SERVO_ORIG = SERVO.replace(/\}\n$/, '');
  const SERVO_MAP1023 = SERVO.replace('int angle = readValue / 4;', 'int angle = map(readValue, 0, 1023, 0, 180);');
  const SERVO_MAP675 = SERVO.replace('int angle = readValue / 4;', 'int angle = map(readValue, 0, 675, 0, 180);');
  const SERVO_MAPREV = SERVO.replace('int angle = readValue / 4;', 'int angle = map(readValue, 0, 1023, 180, 0);');
  // JOY2: INPUT_PULLUP in one line per button; and the pull-up of button A removed (pin 2 floats)
  const JOY2_PULLUP = JOY2
    .replace(' // to enable pull up resistors first write pin mode\n // and then make that pin HIGH\n', ' // INPUT_PULLUP：一句就打开内部上拉电阻\n')
    .replace(/ pinMode\((BUTTON_\w+), INPUT\);\n digitalWrite\(\1, HIGH\);/g, ' pinMode($1, INPUT_PULLUP);');
  const JOY2_FLOAT = JOY2.replace(' digitalWrite(BUTTON_UP, HIGH);\n', '');

  // ---- small markup helpers (strings only)
  const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const snip = code => `<pre class="snippet"><code>${escH(code)}</code></pre>`;
  const card = (ic, title, body, cls) => `<div class="card${cls ? ' ' + cls : ''}"><h3><span class="ico${cls === 'warn' ? ' red' : ''}">${I(ic)}</span>${title}</h3>${body}</div>`;
  const warnCard = (title, body) => card('warn', title, body, 'warn');
  const callout = (ic, title, text, cls) => `<div class="callout${cls ? ' ' + cls : ''}"><span class="ico">${I(ic)}</span><div>${title ? `<b>${title}</b>` : ''}<p>${text}</p></div></div>`;
  const tile = (n, b, s, cls) => `<div class="tile${cls ? ' ' + cls : ''}"><div class="n">${n}</div><b>${b}</b><span>${s}</span></div>`;
  const fig = (src, cap) => `<figure class="figure"><img src="img/l21/${src}" alt="${cap.replace(/<[^>]*>/g, '')}"><figcaption>${cap}</figcaption></figure>`;
  const table = (head, rows, hl) => `<div class="table-wrap"><table class="table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
    rows.map((r, i) => `<tr${hl && hl.includes(i) ? ' class="hl"' : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
  // PWM square wave, 4 periods, in the text colour; duty 0…1
  const pwmWave = (duty, label) => {
    const W = 120, top = 4, base = 24, per = W / 4;
    let d;
    if (duty <= 0) d = `M0 ${base} H${W}`;
    else if (duty >= 1) d = `M0 ${base} V${top} H${W}`;
    else {
      d = `M0 ${base}`;
      for (let k = 0; k < 4; k++) d += ` H${k * per} V${top} H${(k * per + per * duty).toFixed(1)} V${base}`;
      d += ` H${W}`;
    }
    return `<svg viewBox="0 0 ${W} 28" width="96" height="24" role="img" aria-label="${label}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  };
  // brightness-over-time sketch; pts = [[t 0…1, brightness 0…1], …]
  const curve = (pts, label) => {
    const x0 = 30, y0 = 74, gw = 222, gh = 60;
    const p = pts.map(([u, v]) => `${(x0 + u * gw).toFixed(1)} ${(y0 - v * gh).toFixed(1)}`).join(' L');
    return `<svg viewBox="0 0 262 92" width="100%" style="max-width:300px;display:block" role="img" aria-label="${label}">` +
      `<path d="M${x0} 8 V${y0} H${x0 + gw + 8}" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>` +
      `<text x="0" y="18" font-size="10" fill="currentColor" fill-opacity=".6">亮度</text>` +
      `<text x="${x0 + gw + 8}" y="90" font-size="10" fill="currentColor" fill-opacity=".6" text-anchor="end">时间</text>` +
      `<path d="M${p}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  };

  SIM.deck.register({
    id: 'l21', no: '2-1', title: 'PWM 与舵机控制',
    subtitle: 'PWM 调光 · RGB 呼吸灯 · 电位器调节舵机 · 摇杆',
    slides: [
      {
        kind: 'cover', title: 'PWM 与舵机控制',
        subtitle: 'PWM 调光 · RGB 呼吸灯 · 电位器调节舵机 · 摇杆\n数字引脚只会“开 / 关”，怎样做出亮度、颜色和角度的“中间值”？'
      },
      {
        kind: 'html', kicker: '2-1 PWM 与舵机控制', title: '本节导览',
        desc: '四个实验一条主线：前两个用 PWM 输出“中间值”，第三个用脉冲宽度指挥舵机，第四个把摇杆里的“中间值”读回来。',
        body: `
<div class="grid-2 stretch">
  ${card('bulb', '实验 01　PWM 调节 LED 灯亮度', '<p><span class="tag turq">PWM 输出</span> 转动电位器，LED 从暗到亮连续变化。</p><div class="chips mt-s"><code>analogWrite()</code><code>PWM</code><code>占空比</code></div>')}
  ${card('sun', '实验 02　RGB 贴片模块呼吸灯', '<p><span class="tag turq">PWM 输出</span> 红、绿、蓝三种颜色依次由暗渐亮。</p><div class="chips mt-s"><code>#define</code><code>setColor(r,g,b)</code><code>for</code></div>')}
  ${card('reset', '实验 03　电位器调节舵机', '<p><span class="tag dark">舵机</span> 旋钮转到哪里，舵机就转到哪里。</p><div class="chips mt-s"><code>#include</code><code>Servo</code><code>write()</code></div>')}
  ${card('hand', '实验 04　摇杆模块', '<p><span class="tag outline">模拟输入</span> 推摇杆、按按键，串口报出方向。</p><div class="chips mt-s"><code>上拉电阻</code><code>else if</code><code>死区</code></div>')}
</div>
<div class="flow mt">
  <div><b>原理</b><br>先打个比方</div>
  <div><b>接线</b><br>照原指南的图和表</div>
  <div><b>代码逐行看懂</b><br>一行一行读</div>
  <div class="on"><b>动手实验室</b><br>运行、观察、改代码</div>
  <div><b>常见坑</b><br>出错先看这里</div>
</div>`
      },

      // ================================================================ 实验 01　PWM 调节 LED 灯亮度
      {
        kind: 'section', no: '实验 01', title: 'PWM 调节 LED 灯亮度实验',
        desc: '数字引脚只会输出 0V 或 5V，怎样让 LED “半亮”？答案是 PWM：飞快地开关，用“开着的时间占多少”来调亮度。再拿电位器当旋钮，转多少，灯就亮多少。',
        tiles: [
          { title: '原理', sub: 'PWM · 占空比' },
          { title: '接线', sub: '电位器 → A0，LED → 11' },
          { title: '代码', sub: 'analogRead · analogWrite' },
          { title: '实验室', sub: '旋钮调亮度' }
        ]
      },
      {
        kind: 'figure', title: 'PWM：用飞快的开关“调”出中间电压',
        desc: '数字引脚只有 0V 和 5V 两种状态；飞快地开关，开着的时间占比越大，平均电压越高，灯就越亮。',
        img: 'img/l21/pwm_waveforms.jpg', caption: '原指南：占空比 75% → 3.75V，50% → 2.5V，20% → 1V',
        side: `
${callout('question', '打个比方', '一秒钟开关电灯几百次，眼睛看不出闪烁，只觉得灯暗了；“开”的时间越多，灯越亮。')}
<div class="card pale">
  <h3><span class="ico">${I('book')}</span>原指南公式：输出（平均）电压</h3>
  <p class="big center">电压 = 导通时间 ÷ 脉冲周期 × 5V</p>
  <p class="small muted center">例：75% 的时间是 5V → 5 × 75% = 3.75V</p>
</div>
<div class="card">
  <h3><span class="ico">${I('list')}</span>PWM 的三个要素（原指南）</h3>
  <ol class="steps">
    <li><b>脉冲宽度</b>：每次开多久</li>
    <li><b>脉冲周期</b>：多久开关一轮</li>
    <li><b>电压范围</b>：例如 0～5V</li>
  </ol>
</div>`
      },
      {
        kind: 'figure', title: '认识电位器 · 实验目的',
        desc: '电位器就是可调电阻：两端接 5V 和 GND，转动旋钮，中间脚就输出 0～5V 之间的电压。',
        img: 'img/l21/pot_photo.jpg', caption: '原指南：旋转电位器（红色箭头标出“接地 / 输出 / 输入”三个脚）',
        side: `
<div class="card">
  <h3><span class="ico">${I('reset')}</span>三个脚怎么接（原指南）</h3>
  <ol class="steps">
    <li>两端之间电阻固定；中间脚到任一端的电阻随旋钮变化。</li>
    <li>相当于从中间脚分成<b>两段串联电阻</b>，总阻值不变。</li>
    <li><b>当分压器用（本实验）</b>：一端接输入电压，中间脚接输出，另一端接地。</li>
    <li><b>当可变电阻用</b>：一端接输入电压，中间脚接输出，另一端悬空或接中间脚。</li>
  </ol>
  <div class="row mt-s"><span class="small muted">三种用法：</span><span class="tag pale">分压器</span><span class="tag pale">变阻器</span><span class="tag pale">电流控制器</span></div>
</div>
${callout('flag', '实验目的', '之前用按键（数字信号）控制灯的亮灭；这次用电位器（模拟信号）控制 LED 的<b>亮度</b>。')}`
      },
      {
        kind: 'html', title: '新语法：analogWrite() 输出 PWM',
        desc: 'analogWrite(引脚, 值)：值 0～255 决定开着的时间占多少；只有带 ~ 的 3、5、6、9、10、11 号脚能用。',
        body: `
<div class="grid-2">
  <div class="card">
    <h3><span class="ico">${I('wave')}</span>同样是 5V，开着的时间比例不同</h3>
    <p class="small muted"><code>analogWrite(11, 值)</code> 写不同的值，11 号脚上的波形：</p>
    ${table(['值', '波形', '占空比 → 平均电压'], [
      ['<code>0</code>', pwmWave(0, '一直是 0V'), '0% → 0V'],
      ['<code>64</code>', pwmWave(0.25, '四分之一时间是 5V'), '25% → 1.25V'],
      ['<code>128</code>', pwmWave(0.5, '一半时间是 5V'), '50% → 2.5V'],
      ['<code>255</code>', pwmWave(1, '一直是 5V'), '100% → 5V']
    ], [2])}
  </div>
  <div class="stack">
    ${callout('bulb', '像一个 256 档的调光旋钮', '0 全灭，255 全亮，128 约一半亮。')}
    ${snip('pinMode(11, OUTPUT);\nanalogWrite(11, 128);  // 约一半亮')}
    <div class="row"><b class="small">能用的引脚</b><span class="tag">~3</span><span class="tag">~5</span><span class="tag">~6</span><span class="tag">~9</span><span class="tag">~10</span><span class="tag turq">~11</span></div>
    ${warnCard('原指南这里有两处笔误', '<p>UNO 的 PWM 频率约 <b>490Hz</b>（5、6 号脚约 980Hz），不是“固定为 50Hz”；第二个参数的范围是 <b>0～255</b>，不是 0～256。“128 → 占空比 50% → 平均 2.5V”这句是对的。</p>')}
  </div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：电位器接 A0，LED 接 11 号脚',
        desc: '电位器两端接 5V 和 GND、中间脚接 A0；LED 长脚接 11 号脚（带 ~），短脚经 220Ω 电阻接 GND。',
        img: 'img/l21/pwm_wiring.jpg', caption: '原指南接线图：红线 5V · 黑线 GND · 蓝线 A0 · 黄线 11 号脚',
        tables: [
          { left: 'Arduino Uno', right: '10k 电位器', rows: [['5V', '一端'], ['A0', '中间脚'], ['GND', '另一端']] },
          { left: 'Arduino Uno', right: 'LED（串 220Ω 电阻）', rows: [['11', 'LED 长脚（正极）'], ['GND', '220Ω 电阻 → LED 短脚']] }
        ],
        note: '原指南这一节只有接线图，上面两张表是照图整理的。LED 一定要接带 ~ 的引脚，11 号正好是。接线前先拔掉 USB。',
        side: callout('list', '组件清单', 'Arduino Uno R3 主板 · 面包板 · USB 数据线 · 10k 电位器 ×1 · 红色 LED ×1 · 220Ω 电阻 ×1 · 若干跳线', 'gray')
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：准备工作',
        desc: '先给引脚起名字、准备装数据的“盒子”，再在 setup() 里设好输入输出和串口。',
        file: 'pwm_led.ino', code: PWM, from: 1, to: 10, hl: [1, 2, 3, 4],
        notes: [
          { line: [1, 2], text: '起名字：<code>ADPIN</code> 是 A0（读电位器），<code>PWM_LEDPIN</code> 是 11 号脚（带 ~，接 LED）。' },
          { line: [3, 4], text: '两个盒子：<code>value</code> 装整数读数，<code>voltage</code> 是 <code>float</code>，能装小数。' },
          { line: [7, 8], text: 'A0 设为输入，11 号设为输出。' },
          { line: 9, text: '打开串口，速度 9600——串口监视器也选 9600。' }
        ],
        foot: `<div class="flow">
  <div><b>程序原理</b><br><span class="small muted">（原指南）</span></div>
  <div><b><code>analogRead()</code></b><br>读旋钮 0～1023</div>
  <div><b>÷ 1023</b><br>换成 0～1 的比例</div>
  <div><b>× 256</b><br>换成 PWM 值</div>
  <div class="on"><b><code>analogWrite()</code></b><br>输出，LED 跟着变</div>
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：读数、换算、输出',
        desc: 'loop() 一遍遍地做：读旋钮 → 算出 0～1 的比例 → 换成 PWM 值 → 点亮 LED，三个数打印在同一行。',
        file: 'pwm_led.ino', code: PWM, from: 11, to: 24, hl: [13, 16, 19, 22],
        notes: [
          { line: [13, 15], text: '读电位器得到 0～1023，打印 <code>value1==</code> 和读数（<code>print</code> 不换行）。' },
          { line: [16, 18], text: '<code>( float )</code> 先变小数再 ÷ 1023 → 0～1 的比例，打印 <code>voltage==</code>。' },
          { line: [19, 21], text: '× 256，<code>(int)</code> 去掉小数 → PWM 值，打印后换行。读数满 1023 时算出 <b>256</b>！' },
          { line: 22, text: '按 PWM 值点亮 LED。' },
          { line: 23, text: '<code>delay(0)</code>：一点也不等，串口刷得飞快。' }
        ],
        foot: warnCard('原注释不准：第 16 行算的不是电压', '<p>注释写“计算电压”，但没有 × 5，算出的是 0～1 的<b>比例</b>，所以串口里 voltage 只在 0.00～1.00 之间。</p>')
      },
      {
        kind: 'lab', title: '动手实验室：电位器调 LED 亮度',
        desc: '点 ▶ 运行，拖动电位器旋钮（或下面的滑块），看 LED 亮度和串口里的三个数一起变。',
        lab: {
          programs: [{ name: 'pwm_led.ino', label: 'PWM 调光', code: PWM }],
          parts: [
            { type: 'board' },
            { type: 'pot', pin: 'A0', vcc: 5, label: '电位器 中间脚→A0（两端 5V / GND）' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED +→D11（PWM）' }
          ],
          baud: 9600,
          tasks: [
            { text: '运行后慢慢拧电位器：LED 亮度和串口里的 <code>value1</code>、<code>voltage</code>、<code>PWM</code> 一起变。voltage 最大只到 1.00——它是比例，不是电压。' },
            { text: '把滑块拖到 25%：读数 256、比例 0.25、PWM 64。再把旋钮拧到底（读数 1023）：PWM 变成 <b>256</b>，灯反而灭了！看右下角“引脚”里 D11 的 PWM 条。' },
            { text: '用 <code>map()</code> 一步换算，不会越界：把第 19 行改成 <code>value = map(value, 0, 1023, 0, 255);</code>，再拧到底：PWM 正好 255，最亮。', code: PWM_MAP },
            { text: '在任务 3 的基础上打印真实电压：把第 16 行改成 <code>voltage = ( float )value /1023 * 5 ;</code>，拧到底显示 5.00。', code: PWM_VOLT },
            { text: '旋钮反着调：在任务 3 的基础上把 <code>map</code> 的最后两个数对调成 <code>255, 0</code>——越拧越暗。', code: PWM_REV }
          ],
          smoke: [
            { slider: 'pot', value: 250 },
            { expect: { serialRe: 'value1==256\\s+voltage==0\\.25\\s+PWM==64', pwm: [11, 60, 68] } },
            { knob: 'pot', to: 1 },
            { expect: { serial: 'value1==1023     voltage==1.00    PWM==256', pwm: [11, 0, 0], part: ['led', 'brightness', '0.000'] } },
            { task: 3, run: true },
            { expect: { serial: 'value1==1023     voltage==1.00    PWM==255', pin: [11, 1] } },
            { task: 4, run: true },
            { expect: { serial: 'value1==1023     voltage==5.00    PWM==255' } },
            { task: 5, run: true },
            { expect: { serial: 'value1==1023     voltage==1.00    PWM==0', pwm: [11, 0, 0] } },
            { slider: 'pot', value: 250 },
            { expect: { serialRe: 'value1==256\\s+voltage==0\\.25\\s+PWM==192', pwm: [11, 188, 196] } }
          ]
        }
      },
      {
        kind: 'html', title: '实验结果：旋钮一转，LED 跟着变亮变暗',
        desc: '原指南：转动电位器，灯的明暗随之变化；串口监视器里 voltage 和 value 的数值也跟着变。',
        body: `
<div class="grid-2">
  ${fig('pwm_result_photo.jpg', '原指南实物图：电位器、LED 和 220Ω 电阻接在面包板上')}
  ${fig('pwm_serial_monitor.jpg', '原指南串口截图：voltage==0.20 / value==50 … voltage==0.35 / value==89')}
</div>
<div class="card mt">
  <h3><span class="ico">${I('eye')}</span>读懂截图</h3>
  <ol class="steps">
    <li><b>voltage 只到 1.00</b>：程序算的是 0～1 的比例，没有 × 5。截图里 0.20、0.35 就是这个原因。</li>
    <li><b>格式略有不同</b>：截图是“voltage== / value==”两行一组，这段程序打印的是“value1== voltage== PWM==”一行三项——截图来自旧版程序，以你自己屏幕上的输出为准。</li>
  </ol>
</div>`
      },
      {
        kind: 'html', title: '常见坑：voltage 不是电压，256 会越界',
        desc: '这几个坑都来自这段程序本身；遇到了，回实验室改一改再看。',
        body: `
<div class="grid-2">
  ${warnCard('voltage 不是电压', '<p>它是 0～1 的比例；要真实电压还得 × 5（实验室任务 4）。</p>')}
  ${warnCard('× 256 会越界', '<p>读数 1023 时算出 256，超出 <code>analogWrite</code> 的 0～255，灯反而几乎熄灭。用 <code>map(value, 0, 1023, 0, 255)</code>。</p>')}
  ${warnCard('delay(0) 等于不等', '<p>串口刷屏太快、看不清；改成 <code>delay(100)</code> 更好读。</p>')}
  ${warnCard('接在没有 ~ 的引脚上', '<p><code>analogWrite</code> 只能让灯全亮或全灭（值小于 128 灭，否则亮），调不出中间亮度。</p>')}
</div>`
      },

      // ================================================================ 实验 02　RGB 贴片模块呼吸灯
      {
        kind: 'section', no: '实验 02', title: 'RGB 贴片模块呼吸灯实验',
        desc: '一颗 RGB LED 里藏着红、绿、蓝三盏小灯。用三路 PWM 分别调它们的亮度，叠加起来就能混出各种颜色；再用 for 循环一点点加亮，做出渐变的效果。',
        tiles: [
          { title: '原理', sub: '红绿蓝 · 加色混合' },
          { title: '接线', sub: 'R→11 · G→10 · B→9' },
          { title: '代码', sub: 'setColor(r,g,b) · for' },
          { title: '实验室', sub: '红、绿、蓝依次渐亮' }
        ]
      },
      {
        kind: 'figure', title: '认识 RGB LED：三原色混出千万种颜色',
        desc: '红、绿、蓝三个通道各有 0～255 共 256 级亮度，叠加起来能混出 256³ = 16777216 种颜色。',
        img: 'img/l21/rgb_module_photo.jpg', caption: '原指南：RGB LED 模块正面 / 反面（引脚 R、G、B、GND）',
        side: `
<div class="card pale">
  <p class="big center mono">256 × 256 × 256 = 16 777 216</p>
  <p class="small center">每个通道 256 级，三个通道自由组合——多到肉眼几乎分不出和自然颜色的差别。</p>
</div>
<div class="card">
  <h3><span class="ico">${I('sun')}</span>加色混合：光叠加得越多越亮</h3>
  ${table(['混合', '结果', 'setColor(红,绿,蓝)'], [
    ['红 + 绿', '黄', '<code>255,255,0</code>'],
    ['红 + 蓝', '品红', '<code>255,0,255</code>'],
    ['绿 + 蓝', '青', '<code>0,255,255</code>'],
    ['三色全开', '白（最亮）', '<code>255,255,255</code>'],
    ['全为 0', '熄灭', '<code>0,0,0</code>']
  ])}
  <p class="small muted mt-s">原指南说的“添加剂混合”就是加色混合，和颜料越混越暗正好相反。</p>
</div>
${callout('list', '组件清单', 'Arduino UNO R3 主板 · 面包板 · USB 数据线 · RGB LED 模块 ×1 · 若干跳线', 'gray')}`
      },
      {
        kind: 'wiring', title: '接线：R→11，G→10，B→9',
        desc: 'RGB 模块的 R、G、B 三个脚分别接 UNO 的 11、10、9 号脚（都带 ~，能输出 PWM），“-”接 GND。',
        img: 'img/l21/rgb_wiring.jpg', caption: '原指南接线图：红线 R · 绿线 G · 蓝线 B · 黑线 GND',
        tables: [{ left: 'Arduino Uno', right: 'RGB', rows: [['11', 'R'], ['10', 'G'], ['9', 'B'], ['GND', '-']] }],
        note: '三个颜色脚都必须接带 ~ 的引脚，因为每一路都要用 PWM 调亮度。'
      },
      {
        kind: 'html', title: '新语法：#define 和带参数的函数',
        desc: '#define 给数字起个好记的外号；带参数的函数像能“点单”的菜谱——setColor(红, 绿, 蓝) 报三个亮度就行。',
        body: `
<div class="grid-2 stretch">
  <div class="card">
    <h3><span class="ico">${I('book')}</span>#define：给数字起外号</h3>
    <p>像手机通讯录：存一次“RGB_RED 就是 11”，以后写名字就行；编译时自动换回 11。换引脚时只改这一行。</p>
    ${snip('#define RGB_RED   11\npinMode(RGB_RED,OUTPUT);\n// 等于 pinMode(11,OUTPUT);')}
    ${callout('warn', '常见错误', '行末加分号或写等号：<code>#define RGB_RED = 11;</code> 是错的。', 'warn')}
  </div>
  <div class="card">
    <h3><span class="ico">${I('list')}</span>带参数的函数：能“点单”的菜谱</h3>
    <p>点奶茶要报甜度、冰量；调用 <code>setColor()</code> 要报红、绿、蓝三个亮度，<b>按顺序</b>装进 <code>red</code>、<code>green</code>、<code>blue</code>。</p>
    ${snip('setColor(255, 128, 0);  // 红 + 半个绿 ≈ 橙\n//       red  green blue')}
    ${callout('warn', '常见错误', '参数顺序弄反，颜色就错了：第 1 个永远是红色。', 'warn')}
  </div>
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/3）：起外号、setup() 和 setColor()',
        desc: '前三行给三个引脚起外号，setup() 把它们设为输出；setColor() 一次把三个亮度送到三路 PWM。',
        file: 'rgb_breath.ino', code: RGB, from: 1, to: 17, hl: [1, 2, 3, 12],
        notes: [
          { line: [1, 3], text: '起外号：<code>RGB_RED</code> 是 11，<code>RGB_GREEN</code> 是 10，<code>RGB_BLUE</code> 是 9。行末没有分号。' },
          { line: [5, 10], text: '<code>setup()</code>：三个颜色脚都设为输出。' },
          { line: 12, text: '定义 <code>setColor()</code>，带三个参数：调用时报的三个数按顺序装进 red、green、blue。' },
          { line: [14, 16], text: '三个亮度分别交给三路 PWM：11、10、9 号脚。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（2/3）：for 循环让红灯渐亮',
        desc: 'i 从 0 数到 255，每数一下就把 i 当作红色亮度送出去，再停 4 毫秒——红灯就一级一级亮起来。',
        file: 'rgb_breath.ino', code: RGB, from: 19, to: 28, hl: [22, 24, 25],
        notes: [
          { line: 19, text: '<code>loop()</code>：一轮一轮地重复。' },
          { line: 21, text: '<code>int i;</code> 准备一个计数器。' },
          { line: 22, text: 'for：i 从 0 开始，i&lt;256 就继续，每圈 i++——一共 256 次。' },
          { line: [24, 25], text: '红色亮度 = i，绿、蓝为 0；每一级停 4 毫秒。' },
          { line: 27, text: '红色最亮后，停 0.5 秒。' }
        ],
        foot: `<div class="flow">
  <div><b>i = 0</b><br>灭</div>
  <div><b>i = 64</b><br>微亮</div>
  <div><b>i = 128</b><br>半亮</div>
  <div><b>i = 192</b><br>较亮</div>
  <div class="on"><b>i = 255</b><br>最亮：256 级 × 4 毫秒 ≈ 1 秒</div>
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（3/3）：绿灯、蓝灯照样来一遍',
        desc: '后两段 for 循环和红色完全一样，只是把 i 交给绿色、蓝色；最后只停 0.1 秒就回到开头。',
        file: 'rgb_breath.ino', code: RGB, from: 29, to: 42, hl: [29, 31, 38],
        notes: [
          { line: 29, text: '同样的 for：i 再从 0 数到 255。' },
          { line: 31, text: '这次 i 交给绿色——红色一下子变成 0，所以红灯是“突然熄灭”的。' },
          { line: 34, text: '绿色最亮后停 0.5 秒。' },
          { line: [36, 40], text: '再交给蓝色，从 0 渐亮到 255。' },
          { line: 41, text: '蓝色最亮后只停 0.1 秒。' },
          { line: 42, text: '<code>loop()</code> 结束，回到第 19 行，红色重新开始。' }
        ],
        foot: callout('clock', '一轮 loop() 要多久？', '红 1.0 秒 + 停 0.5 秒 + 绿 1.0 秒 + 停 0.5 秒 + 蓝 1.0 秒 + 停 0.1 秒 ≈ <b>4.2 秒</b>。注释里的 smoth 是 smooth（平滑）的拼写错误，不影响运行。')
      },
      {
        kind: 'lab', title: '动手实验室：RGB 灯红、绿、蓝依次渐亮',
        desc: '点 ▶ 运行，看 RGB 灯和卡片上的 R / G / B 数值；速度选 0.5× 看得更清楚。',
        lab: {
          programs: [{ name: 'rgb_breath.ino', label: 'RGB 渐亮', code: RGB }],
          parts: [
            { type: 'board' },
            { type: 'rgbLed', pins: { r: 11, g: 10, b: 9 }, label: 'RGB 模块 R→D11 G→D10 B→D9' }
          ],
          tasks: [
            { text: '运行后盯着 RGB 灯：红 → 绿 → 蓝依次由暗变亮。每种颜色亮到最亮后，是慢慢变暗，还是“突然熄灭”？' },
            { text: '把三个 <code>delay(4)</code> 都改成 <code>delay(10)</code>：一种颜色渐亮要多久？（256 × 10 毫秒 ≈ 2.6 秒）', code: RGB_SLOW },
            { text: '让灯真正“呼吸”：在每段 <code>delay(500);</code>（和最后的 <code>delay(100);</code>）后面，再加一个从 255 往下数的循环 <code>for(i=255;i&gt;=0;i--)</code>，灯就会慢慢亮、慢慢暗。', code: RGB_BREATH },
            { text: '混出新颜色：把第 24 行改成 <code>setColor(i,i,0);</code>——红 + 绿 = 黄。再自己试试 <code>setColor(i,0,i)</code>（品红）。', code: RGB_YELLOW },
            { text: '边界别写错：把第 22 行的 <code>i&lt;256</code> 改成 <code>i&lt;=256</code>：红色亮到顶后为什么一下就灭了？（i 会数到 256，<code>analogWrite</code> 写 256 等于写 0）', code: RGB_256 }
          ],
          smoke: [
            { expect: { part: ['rgbLed', 'rgb', '/^([1-9]\\d*),0,0$/'], pin: [10, 0] } },
            { expect: { part: ['rgbLed', 'rgb', '255,0,0'] }, timeout: 3000 },
            { expect: { part: ['rgbLed', 'rgb', '/^0,([1-9]\\d*),0$/'] }, timeout: 3000 },
            { expect: { part: ['rgbLed', 'rgb', '/^0,0,([1-9]\\d*)$/'] }, timeout: 4000 },
            { task: 3, run: true },
            { expect: { part: ['rgbLed', 'rgb', '255,0,0'] }, timeout: 3000 },
            { expect: { part: ['rgbLed', 'rgb', '/^([1-9]\\d?|1\\d\\d|2[0-4]\\d),0,0$/'] }, timeout: 1500 },
            { task: 4, run: true },
            { expect: { part: ['rgbLed', 'rgb', '/^([1-9]\\d*),\\1,0$/'] } },
            // i<=256: the fade-in ends with analogWrite(11,256) → off, so red is dark during the 0.5 s hold (t≈1.03…1.53 s)
            { task: 5, run: true },
            { wait: 1150, expect: { part: ['rgbLed', 'rgb', '0,0,0'], pwm: [11, 0, 0] }, timeout: 300 }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：红、绿、蓝依次由暗变亮',
        desc: '每种颜色约 1 秒从暗到最亮，停一下就换下一种颜色；一轮约 4.2 秒，循环往复。',
        img: 'img/l21/rgb_result_photo.jpg', caption: '原指南实物图：模块正在亮绿光',
        side: `
${callout('check', '原指南结论', 'RGB LED 先亮红色，然后绿色、蓝色，循环往复。（原文“呈圆形闪烁”是机翻，意思是“循环闪烁”。）')}
<div class="card">
  <h3><span class="ico">${I('eye')}</span>亮度随时间变化（看一种颜色）</h3>
  <p class="small"><b>原程序</b>：渐亮后突然熄灭，像锯齿</p>
  ${curve([[0, 0], [0.28, 1], [0.36, 1], [0.36, 0], [0.64, 1], [0.72, 1], [0.72, 0], [1, 1]], '原程序：渐亮后突然熄灭，像锯齿')}
  <p class="small"><b>加上渐暗（实验室任务 3）</b>：一呼一吸，像山峰</p>
  ${curve([[0, 0], [0.25, 1], [0.5, 0], [0.75, 1], [1, 0]], '加上渐暗：一呼一吸，像山峰')}
</div>`
      },
      {
        kind: 'html', title: '常见坑：外号、参数顺序和 256',
        desc: '这一段程序里最容易写错的四个地方。',
        body: `
<div class="grid-2">
  ${warnCard('#define 行末加了分号或等号', '<p><code>#define RGB_RED = 11;</code> 会把“= 11;”整个替换进代码，编译报错。正确写法：<code>#define RGB_RED 11</code>。</p>')}
  ${warnCard('参数顺序弄反', '<p><code>setColor(红, 绿, 蓝)</code>：第 1 个永远是红色。想要绿色却写成 <code>setColor(i,0,0)</code>，亮的就是红灯。</p>')}
  ${warnCard('i&lt;=256 越界', '<p>i 会数到 256，<code>analogWrite</code> 只认 0～255，写 256 等于写 0——灯在最亮时突然熄灭。</p>')}
  ${warnCard('颜色脚没接 ~ 引脚', '<p>没有 PWM 就调不出渐变，只会全亮或全灭。R、G、B 要接 11、10、9 这样带 ~ 的脚。</p>')}
</div>`
      },

      // ================================================================ 实验 03　电位器调节舵机
      {
        kind: 'section', no: '实验 03', title: '电位器调节舵机实验',
        desc: '舵机是一种能转到指定角度并停住的电机，航模、遥控机器人和机械臂都离不开它。这次用电位器当旋钮：旋钮转多少，舵机就跟着转多少。',
        tiles: [
          { title: '原理', sub: '闭环反馈 · 脉宽定角度' },
          { title: '接线', sub: '电位器 → A0，舵机 → 7' },
          { title: '代码', sub: 'Servo 库 · write()' },
          { title: '实验室', sub: '旋钮控制角度' }
        ]
      },
      {
        kind: 'figure', title: '认识舵机：转到指定角度并停住',
        desc: '舵机（伺服电机）能转到 0～180° 之间的任意角度并保持住，常用在航模、遥控机器人和机械臂里。',
        img: 'img/l21/servo_photo.jpg', caption: '原指南：SG90 舵机（TOWER PRO Micro Servo 9g）与舵盘、螺丝',
        side: `
<div class="card">
  <h3><span class="ico">${I('reset')}</span>它是什么</h3>
  <p>“舵机”是俗称，本名叫<b>伺服电机</b>：能转到 0～180° 中的指定角度并停住，外力推它也会顶回去。</p>
</div>
<div class="grid-2">
  ${tile('1', '直流电机', '提供转动的动力', 'turq')}
  ${tile('2', '减速齿轮组', '降低转速、增大力量')}
  ${tile('3', '电位器', '检测转到了多少度', 'dark')}
  ${tile('4', '控制电路', '比较角度、指挥电机', 'white')}
</div>
${callout('flag', '实验目的', '用电位器控制舵机转动。组件：Arduino Uno 主板、面包板、USB 数据线、10k 电位器 ×1、SG90 舵机 ×1、若干跳线。')}`
      },
      {
        kind: 'figure', title: '工作原理：边转边比较的“闭环”',
        desc: '控制电路把“要转到的角度”和电位器测到的“实际角度”比一比，差多少就让电机转多少，差为 0 就停。',
        img: 'img/l21/servo_inside_photo.jpg', caption: '原指南：舵机内部结构（电路板、电机、外壳）',
        side: `
<div class="card">
  <h3><span class="ico">${I('reset')}</span>闭环：一圈一圈地比</h3>
  <ol class="steps">
    <li><b>收到信号</b>：脉冲宽度说明要转到几度。</li>
    <li><b>比一比</b>：目标角度和电位器测到的实际角度差多少。</li>
    <li><b>电机转动</b>：差多少转多少，正负决定方向。</li>
    <li><b>带动电位器</b>：齿轮带着它一起转，实际角度变了，回到第 2 步；差为 0 就停住。</li>
  </ol>
</div>
${callout('question', '打个比方', '像开车盯着车道线：偏左就往右打一点方向盘，偏右就往左打一点，直到车开正——这就是“闭环反馈”。')}`
      },
      {
        kind: 'html', title: '舵机的控制：脉冲宽度决定角度',
        desc: '每 20ms 发一个脉冲，高电平持续 0.5～2.5ms：0.5ms 转到 0°，1.5ms 转到 90°，2.5ms 转到 180°。',
        body: `
<div class="grid-2">
  <div class="stack">
    ${fig('servo_pulse_period.jpg', '原指南：周期 20ms，脉冲宽度最小 0.5ms、最大 2.5ms')}
    ${fig('servo_pulse_angles.jpg', '原指南：最小 / 中间 / 最大脉冲 → 0° / 90° / 180°')}
  </div>
  <div class="stack">
    ${table(['脉冲宽度（高电平）', '舵机角度'], [['0.5 ms', '0°'], ['1.0 ms', '45°'], ['1.5 ms', '90°（中间位置）'], ['2.0 ms', '135°'], ['2.5 ms', '180°']], [2])}
    ${callout('question', '打个比方', '像按门铃：每 20 毫秒按一次，按住的时间越长，舵机转的角度越大。')}
    <div class="card">
      <h3><span class="ico">${I('list')}</span>要点（原指南）</h3>
      <ul>
        <li>小于 1.5ms：比中间位置偏<b>逆时针</b>；大于 1.5ms：偏<b>顺时针</b>。</li>
        <li>要一直收到脉冲，角度才能保持住——这些脉冲稍后交给 Servo 库来发。</li>
        <li>不同舵机的最小 / 最大脉宽可能略有不同，0° 和 180° 不一定分毫不差。</li>
      </ul>
    </div>
    ${callout('info', '原文这句是机翻', '“中间位置是指从该位置到最小角度的体积……”意思是：从中间位置转到最小角度、转到最大角度，转角相等。', 'note')}
  </div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：电位器接 3.3V 和 A0，舵机信号接 7',
        desc: '电位器左脚接 3.3V、右脚接 GND、中间脚接 A0；舵机红线接 5V、黑（棕）线接 GND、黄（橙）线接 7 号脚。',
        img: 'img/l21/servo_pot_wiring.jpg', caption: '原指南接线图',
        tables: [
          { left: 'Arduino Uno', right: '电位器', rows: [['3.3V', '左脚'], ['A0', '中间脚'], ['GND', '右脚']] },
          { left: 'Arduino Uno', right: '舵机', rows: [['5V', '红线'], ['GND', '黑（棕）线'], ['7', '黄（橙）线：信号']] }
        ],
        note: '<span>电位器接的是 <b>3.3V</b>，不是 5V（原指南原文如此）：A0 最大只能读到约 675，实验室里会看到它的影响。原指南这里只有文字说明，两张表是照文字整理的。</span>',
        side: fig('servo_wires.jpg', '原指南：舵机三根线 (0V) GND · (+5V) · (PWM) 信号线，可转 180°。SG90 实物是棕、红、橙三色：棕 = GND，橙 = 信号。')
      },
      {
        kind: 'html', title: '新语法：用 Servo 库控制舵机',
        desc: '库是别人写好的“扩展包”：#include 引进来，创建舵机对象，attach() 配对引脚，write() 让它转到角度。',
        body: `
<div class="grid-4 stretch">
  ${card('load', '第 1 步：装上“扩展包”', `${snip('#include <Servo.h>')}<p class="small muted">IDE 自带，不用另装</p>`)}
  ${card('cube', '第 2 步：领一个“遥控器”', `${snip('Servo myservo;')}<p class="small muted">对象名字自己起</p>`)}
  ${card('plug', '第 3 步：和 7 号脚配对', `${snip('myservo.attach(7);')}<p class="small muted">信号线接哪就写几</p>`)}
  ${card('target', '第 4 步：按下“转到 90°”', `${snip('myservo.write(90);')}<p class="small muted">0～180 之间的角度</p>`, 'pale')}
</div>
<div class="grid-2 mt">
  ${callout('question', '为什么要用库', '舵机要每 20 毫秒收到一个 0.5～2.5ms 的脉冲；Servo 库像手机上装好的 App，在后台替你一直发，你只管说角度。')}
  ${warnCard('常见错误', '<p><code>Servo</code> 的 S 要大写；忘了第一行 <code>#include</code>，编译会报 <code>\'Servo\' does not name a type</code>。</p>')}
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：引入库、创建对象、配对引脚',
        desc: '前 4 行引入 Servo 库、创建舵机对象 myservo、给两个引脚起名；setup() 把舵机和 7 号脚配对。',
        file: 'servo_knob.ino', code: SERVO, from: 1, to: 9, hl: [1, 2, 8],
        notes: [
          { line: [1, 2], text: '引入 IDE 自带的 Servo 库，创建舵机对象 <code>myservo</code>。' },
          { line: [3, 4], text: 'A0 读电位器，7 号脚接舵机信号线。' },
          { line: 7, text: '7 号脚设为输出（可以省略，<code>attach</code> 会自己处理）。' },
          { line: 8, text: '<code>attach</code>：myservo 和 7 号脚配对。注释写的 pin 9 是旧例程留下的，实际是 7 号脚。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：读旋钮、换角度、转舵机',
        desc: 'loop() 每 15 毫秒做一次：读电位器 → 除以 4 换成角度 → 让舵机转到这个角度。',
        file: 'servo_knob.ino', code: SERVO, from: 11, to: 16, hl: [12, 13, 14, 16],
        notes: [
          { line: 12, text: '读电位器：0～1023（按本接法最大约 675）。' },
          { line: 13, text: '÷ 4 换成角度——整数除法，小数直接扔掉。' },
          { line: 14, text: '舵机转到 angle 度。注释里的 pos 也是旧例程留下的，实际变量是 angle。' },
          { line: 15, text: '等 15 毫秒，让舵机转过去。' },
          { line: 16, text: '补上的右大括号。' }
        ],
        foot: warnCard('原指南漏印了一个 }', '<p>原指南的程序框在 <code>delay(15);</code> 后断页，下一页的框是空的：<code>loop()</code> 的右大括号 <code>}</code> 漏印了，照抄会编译报错。第 16 行是补上的；实验室的“原指南原样”标签能看到这个错误。</p>')
      },
      {
        kind: 'lab', title: '动手实验室①：旋钮控制舵机（电位器接 3.3V）',
        desc: '点 ▶ 运行，拖动电位器旋钮，看舵机的角度。这里的电位器和原指南一样接在 3.3V 上。',
        lab: {
          programs: [
            { name: 'servo_knob.ino', label: '舵机程序（补好 }）', code: SERVO, note: '在原指南程序的最后补上了 <code>loop()</code> 的右大括号 <code>}</code>，其余一字未改。' },
            { name: 'servo_knob_原样.ino', label: '原指南原样', code: SERVO_ORIG, expect: 'error', note: '原指南原样：最后少了一个 <code>}</code>。点 ▶ 运行，读一读错误提示。' }
          ],
          parts: [
            { type: 'board' },
            { type: 'pot', pin: 'A0', vcc: 3.3, label: '电位器 左脚 3.3V · 中间脚→A0' },
            { type: 'servo', pin: 7, label: '舵机 信号线→D7' }
          ],
          tasks: [
            { text: '运行后慢慢拧电位器：舵机跟着转。拧到底：读数最大约 675，舵机只转到 <b>168°</b>（675 ÷ 4），到不了 180°。' },
            { text: '切到“原指南原样”点 ▶ 运行：红色错误指向第几行？在最后补上一个 <code>}</code> 再运行。', code: SERVO, program: 1 },
            { text: '回到第一个标签，把第 13 行改成 <code>int angle = map(readValue, 0, 1023, 0, 180);</code>：拧到底反而只有约 118°——接 3.3V 时读数到不了 1023。', code: SERVO_MAP1023, program: 0 },
            { text: '让 map 的范围对上真实读数：改成 <code>map(readValue, 0, 675, 0, 180)</code>，拧到底正好 180°。', code: SERVO_MAP675, program: 0 }
          ],
          smoke: [
            { expect: { servo: [7, 84, 2], part: ['pot', 'value', '338'] }, timeout: 3000 },
            { knob: 'pot', to: 1 },
            { expect: { servo: [7, 168, 2], part: ['pot', 'value', '675'], read: ['servo', '168°'] }, timeout: 4000 },
            { tab: 1, run: true },
            { expect: { state: 'error', status: '/^编译错误：第 15 行：.*缺少右大括号/', errLine: 15 } },
            { task: 3, run: true },
            { expect: { servo: [7, 118, 2], state: 'running' }, timeout: 4000 },
            { task: 4, run: true },
            { expect: { servo: [7, 180, 2] }, timeout: 4000 }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：旋钮转到哪，舵机就转到哪',
        desc: '转动电位器，舵机跟着转。按原接法（电位器接 3.3V）最大约 168°；改接 5V 再用 map()，就能正好转满 0～180°。',
        img: 'img/l21/servo_pot_result_photo.jpg', caption: '原指南实物图',
        side: `
${callout('check', '原指南结论', '上传程序后旋转电位器，可以改变舵机的角度，舵机的角度为 0～180 度，为之后的机械臂打下基础。')}
<div class="card warn">
  <h3><span class="ico red">${I('warn')}</span>按原接法转不满 180°</h3>
  ${table(['电位器接', '最大读数', '÷ 4', '舵机'], [['3.3V', '≈ 675', '168', '168°'], ['5V', '1023', '255', '按 180° 处理']])}
  <p class="small mt-s">接 5V 却仍然 ÷ 4：读数超过 720 以后都算出 180 以上，旋钮最后一段“白转”。</p>
</div>
<div class="card ok">
  <h3><span class="ico">${I('check')}</span>最稳妥：接 5V + map()</h3>
  ${snip('int angle = map(readValue, 0, 1023, 0, 180);')}
  <p class="small">下一页的实验室把电位器改接到 5V，试一试。</p>
</div>`
      },
      {
        kind: 'lab', title: '动手实验室②：电位器改接 5V，用 map() 转满 180°',
        desc: '这个实验室里电位器左脚改接 5V（读数能到 1023）。先看原程序的 ÷ 4 会怎样，再用 map() 修好。',
        lab: {
          programs: [{ name: 'servo_knob_5v.ino', label: '舵机程序（电位器接 5V）', code: SERVO, note: '和上一个实验室同一段程序（已补好 }）；只是电位器左脚改接到了 5V。' }],
          parts: [
            { type: 'board' },
            { type: 'pot', pin: 'A0', vcc: 5, label: '电位器 左脚 5V · 中间脚→A0' },
            { type: 'servo', pin: 7, label: '舵机 信号线→D7' }
          ],
          tasks: [
            { text: '先运行原程序，慢慢拧到底：读数超过 720 以后 angle 超过 180，舵机停在 180° 不动——最后约四分之一圈旋钮“白转”。' },
            { text: '把第 13 行改成 <code>int angle = map(readValue, 0, 1023, 0, 180);</code>：旋钮从头到尾正好对应 0～180°。', code: SERVO_MAP1023 },
            { text: '想反着转？把 <code>map</code> 的最后两个数换成 <code>180, 0</code>：旋钮往右拧，舵机往左转。', code: SERVO_MAPREV }
          ],
          smoke: [
            { expect: { servo: [7, 128, 2] }, timeout: 3000 },
            { slider: 'pot', value: 750 },
            { expect: { servo: [7, 180, 2], part: ['pot', 'value', '767'] }, timeout: 4000 },
            { task: 2, run: true },
            { expect: { servo: [7, 134, 2] }, timeout: 4000 },
            { slider: 'pot', value: 1000 },
            { expect: { servo: [7, 180, 2] }, timeout: 4000 },
            { task: 3, run: true },
            { expect: { servo: [7, 0, 2] }, timeout: 4000 }
          ]
        }
      },
      {
        kind: 'html', title: '常见坑：库、括号和读数范围',
        desc: '舵机不动、转不满、编译报错，多半是这几个原因。',
        body: `
<div class="grid-2">
  ${warnCard('忘了 #include 或 Servo 写成小写', '<p>编译报 <code>\'Servo\' does not name a type</code>。第一行一定是 <code>#include &lt;Servo.h&gt;</code>，<code>Servo</code> 的 S 大写。</p>')}
  ${warnCard('漏了最后的 }', '<p>编译报“缺少右大括号”。原指南就漏印了一个——每个 <code>{</code> 都要有配对的 <code>}</code>。</p>')}
  ${warnCard('电位器接 3.3V，转不满 180°', '<p>675 ÷ 4 ≈ 168°。<code>map()</code> 的输入范围要和真实读数对上：接 3.3V 用 0～675，接 5V 用 0～1023。</p>')}
  ${warnCard('attach() 的脚和信号线不一致', '<p>信号线接 7 号脚，就写 <code>attach(7)</code>；注释里的 pin 9 是旧例程留下的，别被它带偏。</p>')}
</div>`
      },

      // ================================================================ 实验 04　摇杆模块
      {
        kind: 'section', no: '实验 04', title: '摇杆模块实验',
        desc: '摇杆扩展板就像游戏手柄：一根能前后左右推的拇指摇杆（里面是两个电位器），再加七个按键。直接插在 UNO 上，读出摇杆的位置和按键，在串口里报出方向。',
        tiles: [
          { title: '原理', sub: '两个电位器 + 按键' },
          { title: '接线', sub: '直接插在 UNO 上' },
          { title: '代码', sub: '上拉 · else if · 死区' },
          { title: '实验室', sub: '串口报方向和按键' }
        ]
      },
      {
        kind: 'figure', title: '认识摇杆扩展板：两个电位器加七个按键',
        desc: '拇指摇杆里有两个电位器，分别测左右（X）和上下（Y）；另有六个独立按键，摇杆按下去也是一个按键。',
        img: 'img/l21/joystick_shield_photo.jpg', caption: '原指南：摇杆扩展板（Joystick Shield）',
        side: `
${callout('question', '像一个老式游戏手柄', '原指南：它提供了任天堂（Nintendo）手柄上的功能。摇杆可以控制旋律、屏幕上的像素；按键可以做菜单导航或游戏控制。')}
<div class="grid-3">
  ${tile('X', '左右推', '一个电位器，读数 0～1023', 'turq')}
  ${tile('Y', '上下推', '另一个电位器，读数 0～1023', 'dark')}
  ${tile('7 个', '按键', '6 个独立按键 + 摇杆按下', 'white')}
</div>
${callout('list', '组件清单', 'Arduino UNO R3 主板 · USB 数据线 · 摇杆模块 ×1 · 若干跳线', 'gray')}`
      },
      {
        kind: 'figure', title: '原理图：摇杆 = 两个电位器 + 一个按键',
        desc: 'VRx、VRy 是两个电位器的中间脚，输出 0～1023 的模拟值；SW 是摇杆下面的按键，按下接地。',
        img: 'img/l21/joystick_schematic.jpg', caption: '原指南原理图：Joystick 的 SW / VRy / VRx / VCC / GND 接到 Port 的 Bt / Y-out / X-out / VCC / GND',
        side: `
<div class="card">
  <h3><span class="ico">${I('chip')}</span>对照原理图</h3>
  <ol class="steps">
    <li><b>VRx → X-out</b>：左右那个电位器。</li>
    <li><b>VRy → Y-out</b>：上下那个电位器。</li>
    <li><b>SW → Bt</b>：经 R1（10K）接 VCC，松开是高电平，按下接地变低电平。</li>
  </ol>
</div>
<div class="card">
  <h3><span class="ico">${I('target')}</span>摇杆的“坐标”（按程序的判断）</h3>
  ${table(['推的方向', '读数变化'], [['往左推', 'X 变小'], ['往右推', 'X 变大'], ['往上推', 'Y 变大'], ['往下推', 'Y 变小'], ['不推', '两个都停在中间附近']])}
</div>`
      },
      {
        kind: 'wiring', title: '接线：扩展板直接插在 UNO 上',
        desc: '摇杆 X、Y 接模拟口 A0、A1，按键 A～F 接数字口 2～7，摇杆按下（K）接 8 号脚。',
        img: 'img/l21/joystick_wiring.jpg', caption: '原指南：扩展板插在 UNO 上（示意图）',
        tables: [{ left: 'Arduino Uno', right: '摇杆模块', rows: [['0', 'VRX'], ['1', 'VRY'], ['2', 'A'], ['3', 'B'], ['4', 'C'], ['5', 'D'], ['6', 'E'], ['7', 'F'], ['GND', 'GND'], ['5V', 'VCC']] }],
        note: '<span>表里的 0、1 指模拟口 <b>A0、A1</b>（程序里写 <code>analogRead(0)</code>），不是数字 0、1 号脚。程序里还有 K = 8（按下摇杆），原表没列。</span>',
        side: callout('info', '丝印和表格对不上？', '示意图上按键旁的丝印（D3～D6）和表格编号不完全一致，是扩展板版本不同。以程序和串口打印为准。', 'gray')
      },
      {
        kind: 'code', title: '程序①：读出摇杆的 X、Y',
        desc: '每 0.5 秒读一次模拟口 0、1，把 x、y 的数值打印到串口——先看看摇杆不动时读数是多少。',
        file: 'joystick_xy.ino', code: JOY1, from: 1, to: 17, hl: [2, 3, 11, 14, 16],
        notes: [
          { line: 1, text: '注释：X 从（模拟）0 号口读，Y 从 1 号口读。' },
          { line: [2, 3], text: '<code>#define</code> 起名：0 → <code>PIN_ANALOG_X</code>，1 → <code>PIN_ANALOG_Y</code>。<code>analogRead(0)</code> 和 <code>analogRead(A0)</code> 读的是同一个口。' },
          { line: 6, text: '打开串口，9600。' },
          { line: [10, 11], text: '先打印“x: ”，再打印 X 读数并换行。' },
          { line: [13, 14], text: 'y 也一样。' },
          { line: 16, text: '每 0.5 秒读一次。' }
        ]
      },
      {
        kind: 'figure', title: '程序①结果：不动时 x≈525、y≈518',
        desc: '摇杆静止时读数并不正好是 512；程序②在静止值两边留了一小段“死区”，读数落在里面就当没推。',
        img: 'img/l21/joystick_serial_xy.jpg', caption: '原指南串口截图：静止时 x: 525 / y: 518 交替出现',
        side: `
<div class="card">
  <h3><span class="ico">${I('target')}</span>静止值正好落在“死区”里</h3>
  ${table(['轴', '算作这边', '死区', '算作那边'], [['X', '&lt; 520 left', '520～530<br><b>静止 525</b>', '&gt; 530 right'], ['Y', '&lt; 515 down', '515～520<br><b>静止 518</b>', '&gt; 520 up']])}
</div>
${callout('question', '打个比方', '好比汽车方向盘中间有一点空行程，轻轻碰一下车不会拐；读数抖一抖，也不会误报方向。')}
${callout('info', '你的摇杆不一样？', '每个摇杆的静止值都有一点偏差。先用程序①测出来，再改程序②里的 520、530、515。', 'note')}`
      },
      {
        kind: 'html', title: '新语法：内部上拉电阻和 else if',
        desc: '先 INPUT 再写 HIGH，就打开了引脚内部的上拉电阻（等同 INPUT_PULLUP）；else if 从上往下问，第一个成立就停。',
        body: `
<div class="grid-2 stretch">
  <div class="card">
    <h3><span class="ico">${I('bolt')}</span>内部上拉：芯片里的“弹簧”</h3>
    <p>1-2 课学过上拉电阻：像弹簧把引脚拉在高电平。扩展板的按键没带，就打开引脚里面那一颗。</p>
    ${snip('pinMode(2, INPUT);\ndigitalWrite(2, HIGH);    // 老写法：两句\npinMode(2, INPUT_PULLUP); // 新写法：一句')}
    <p><b>效果</b>：松开读到 <code>HIGH</code>，按下读到 <code>LOW</code>。</p>
    ${callout('warn', '常见错误', '只写 INPUT 不开上拉：松开时引脚“悬空”，读数乱跳。', 'warn')}
  </div>
  <div class="card">
    <h3><span class="ico">${I('list')}</span>else if：一个个问，第一个“是”就停</h3>
    <p>像排队过安检：从上往下一个个问，第一个回答“是”的就执行，后面的都不再问。</p>
    ${snip('if (A 键按下) { 打印 A }\nelse if (B 键按下) { 打印 B }\nelse if (X < 520) { 打印 left }\n// 都不成立：什么也不做')}
    <p><b>只执行一个分支</b>：越靠前，优先级越高。</p>
    ${callout('warn', '常见错误', '写成一串独立的 if：几个条件同时成立时，会打印好几行。', 'warn')}
  </div>
</div>`
      },
      {
        kind: 'code', title: '程序②（1/3）：起名字，打开上拉电阻',
        desc: '10 个 #define 给按键和摇杆起名；setup() 里每个按键脚都做同样两步：先设为输入，再写 HIGH。',
        file: 'joystick.ino', code: JOY2, from: 1, to: 16, hl: [15, 16],
        notes: [
          { line: [1, 4], text: '四个大按键：上 A（2）、右 B（3）、下 C（4）、左 D（5）。' },
          { line: [5, 7], text: '两个小按键 E（6）、F（7）；K（8）是按下摇杆。' },
          { line: [8, 9], text: '摇杆 X、Y：模拟口 0、1。' },
          { line: 10, text: '<code>DELAY</code> = 500：每次打印后停 0.5 秒。' },
          { line: 12, text: '打开串口，9600。' },
          { line: [13, 14], text: '注释：要打开上拉电阻，先设引脚模式，再写 HIGH。' },
          { line: [15, 16], text: 'A 键：<code>INPUT</code> + <code>HIGH</code> = 打开内部上拉。' }
        ],
        foot: callout('list', '第 17～28 行', '其余六个按键 B、C、D、E、F、K 也都是这两步，一模一样（实验室里能看到完整程序）。可以全部改成新写法 <code>pinMode(按键, INPUT_PULLUP);</code>，效果相同——实验室任务 4。')
      },
      {
        kind: 'code', title: '程序②（2/3）：else if 依次检查六个按键',
        desc: '先问 A 键按下没有；没按，再问 B 键……按下读到 LOW，就打印是哪个键，再停 0.5 秒。',
        file: 'joystick.ino', code: JOY2, from: 30, to: 54, hl: [31, 35],
        notes: [
          { line: 31, text: 'A 键按下了吗？按下读到 <code>LOW</code>。' },
          { line: [32, 33], text: '是：打印按键名字，再停 0.5 秒；整条链到此结束，后面的都不问。' },
          { line: 35, text: '否则，再问 B 键。' },
          { line: [39, 54], text: 'C、D、E、F 键：同样的写法，一个接一个往下问。按住不放时，每 0.5 秒再打印一行。' }
        ]
      },
      {
        kind: 'code', title: '程序②（3/3）：死区判断方向，K 键单独检查',
        desc: '六个按键都没按，才去看摇杆：X、Y 落在死区里什么也不做；K 键用一个独立的 if，每一轮都会检查。',
        file: 'joystick.ino', code: JOY2, from: 55, to: 76, hl: [55, 59, 63, 67, 72],
        notes: [
          { line: 55, text: 'X 小于 520：往左推了，打印 left。' },
          { line: 59, text: 'X 大于 530：往右，打印 right。' },
          { line: 63, text: 'Y 大于 520：往上，打印 up。' },
          { line: 67, text: 'Y 小于 515：往下，打印 down。' },
          { line: 71, text: '这句注释是从程序①抄来的，和下面的代码无关。' },
          { line: 72, text: 'K 键：独立的 if，不在 else if 链里，每一轮都会检查。' },
          { line: 76, text: '<code>loop()</code> 结束，从头再来。' }
        ]
      },
      {
        kind: 'lab', title: '动手实验室：摇杆和七个按键',
        desc: '两个标签：程序① 读 X、Y，程序② 报方向和按键。拖动摇杆（松手自动回中）、按住 A～F 或 K；也可以点一下摇杆，用方向键和字母键操作。',
        lab: {
          programs: [
            { name: 'joystick_xy.ino', label: '程序① 读 X、Y', code: JOY1 },
            { name: 'joystick.ino', label: '程序② 方向和按键', code: JOY2 }
          ],
          parts: [
            { type: 'board' },
            { type: 'joystick', x: 'A0', y: 'A1', buttons: { 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'E', 7: 'F', 8: 'K' }, label: '摇杆扩展板（直接插在 UNO 上）' }
          ],
          baud: 9600,
          tasks: [
            { text: '程序①：运行后先不碰摇杆，串口里 x、y 是多少？（525 / 518，和原指南截图一样）再把摇杆推到右上角，x、y 怎么变？' },
            { text: '切到“程序②”运行：往上下左右推，再逐个按住 A～F 和 K，串口打印什么？原指南说“对应的 LED 灯会亮起”——程序里其实没有控制 LED，以串口为准。' },
            { text: 'else if 的优先级：点一下摇杆，按住键盘 → 不放（一直打印 right），再同时按住 C 键：变成只打印 Button C。换成同时按住 K 键呢？两行都会打印——K 是独立的 if。' },
            { text: '用新写法打开上拉：把 setup() 里的 14 行改成 7 行 <code>pinMode(按键, INPUT_PULLUP);</code>，按键照样能用。', code: JOY2_PULLUP, program: 1 },
            { text: '去掉上拉试试：删掉第 16 行 <code>digitalWrite(BUTTON_UP, HIGH);</code> 再运行：不碰任何按键，串口也会乱报 Button A——2 号脚“悬空”了。', code: JOY2_FLOAT, program: 1 }
          ],
          smoke: [
            { expect: { serial: 'x: 525', part: ['joystick', 'x', '525'] }, timeout: 3000 },
            { expect: { serial: 'y: 518' } },
            { stick: [0.6, 0.6] },
            { expect: { serialRe: 'x: 8[0-4]\\d\\s+y: 8[0-4]\\d' }, timeout: 3000 },
            { release: true },
            { expect: { part: ['joystick', 'x', '525'] }, timeout: 2000 },
            { tab: 1, run: true },
            { wait: 700, expect: { noSerial: 'left', state: 'running' } },
            { stick: [0, 0.8] },
            { expect: { serial: ' up', read: ['joystick', 'Y 922'] } },
            { release: true },
            { stick: [-0.8, 0] },
            { expect: { serial: ' left' } },
            { release: true },
            { press: 'joystick', target: '[aria-label^="按键 A"]' },
            { expect: { serial: 'Button A is pressed', part: ['joystick', 'buttons', 'A'] } },
            { release: true },
            { key: 'ArrowRight', part: 'joystick', target: 'g.drag', hold: true },
            { expect: { serial: ' right' } },
            { key: 'c', part: 'joystick', target: 'g.drag', hold: true },
            { expect: { serial: 'Button C is pressed', part: ['joystick', 'buttons', 'C'] } },
            { release: true },
            { key: 'k', part: 'joystick', target: 'g.drag', hold: true },
            { expect: { serial: 'Button k is pressed', part: ['joystick', 'buttons', 'K'] } },
            { release: true },
            { task: 4, run: true },
            { press: 'joystick', target: '[aria-label^="按键 B"]' },
            { expect: { serial: 'Button B is pressed', state: 'running' } },
            { release: true },
            { task: 5, run: true },
            { expect: { serial: 'Button A is pressed', part: ['joystick', 'buttons', ''] }, timeout: 5000 }
          ]
        }
      },
      {
        kind: 'html', title: '实验结果：推摇杆、按按键，串口报出来',
        desc: '往上下左右推，串口打印 up / down / right / left；按下按键，打印 Button A～F（或 k）is pressed。',
        body: `
<div class="grid-2">
  ${fig('joystick_result_photo.jpg', '原指南实物图：扩展板插在 UNO 上')}
  ${fig('joystick_serial_buttons.jpg', '原指南串口截图：up / down / right / left，再依次按下各个按键')}
</div>
<div class="mt">${warnCard('原文与程序不符', '<p>原指南说：“当您往上拨时，对应的 LED 灯就会亮起，每个方位都有对应的 LED 灯。”但这段程序<b>只在串口打印</b>，并不控制 LED；扩展板上亮着的小灯是板子自带的指示灯。以串口里的文字为准。</p>')}</div>`
      },
      {
        kind: 'html', title: '常见坑与挑战：摇杆遥控舵机',
        desc: '读数乱跳先查上拉、方向误报就调死区；学会了读摇杆，就能用它控制实验三的舵机。',
        body: `
<div class="grid-2">
  <div class="stack">
    ${warnCard('按键乱报、自己“按下”', '<p>多半没开上拉：检查 setup() 里的 <code>digitalWrite(…, HIGH)</code>，或者改用 <code>INPUT_PULLUP</code>。</p>')}
    ${warnCard('不推也报方向', '<p>你的摇杆静止值和截图不同：先跑程序①测一下，再改死区的数字。</p>')}
    ${warnCard('按住按键时方向不打印', '<p>这是 else if 的优先级，不是坏了：前面的按键分支先“截胡”。</p>')}
  </div>
  <div class="card ok">
    <h3><span class="ico">${I('flag')}</span>挑战：摇杆遥控舵机</h3>
    <p>把摇杆的 X 读数用 <code>map()</code> 换成角度，直接送给实验三的舵机，就是一个遥控云台的雏形：</p>
    ${snip('int x = analogRead(PIN_ANALOG_X);\nint angle = map(x, 0, 1023, 0, 180);\nmyservo.write(angle);')}
    <p class="small muted">扩展板占用了 2～8 号脚，实验三用的 7 号脚正好是 F 键：舵机信号线改接 9 号脚，写 <code>myservo.attach(9)</code>；别忘了 <code>#include &lt;Servo.h&gt;</code>。</p>
  </div>
</div>`
      },

      // ================================================================ 小结
      {
        kind: 'summary', kicker: '2-1 PWM 与舵机控制　/　小结', title: '本课小结',
        desc: '四个实验一条主线：PWM 让数字引脚输出“中间值”，脉宽指挥舵机，摇杆把“中间值”读回来。',
        items: [
          { title: 'PWM 调光', text: '<code>analogWrite(引脚, 0～255)</code>：开着的时间占比决定平均电压；只有带 ~ 的脚能用。' },
          { title: 'RGB 呼吸灯', text: '三路 PWM 叠加混色，256³ 种颜色；<code>for</code> 让亮度一级一级变化，<code>#define</code> 起外号。' },
          { title: '电位器调节舵机', text: '脉宽 0.5～2.5ms 决定 0～180°；Servo 库：<code>#include</code> → <code>attach()</code> → <code>write()</code>。' },
          { title: '摇杆模块', text: '两个电位器 + 七个按键；上拉电阻让按下读 LOW，<code>else if</code> 第一个成立就停，死区防误报。' }
        ],
        body: `
<div class="grid-3">
  ${card('send', '送出去：中间值', '<p><code>analogWrite()</code> 0～255 · <code>setColor(红, 绿, 蓝)</code> · <code>myservo.write(0～180)</code></p>')}
  ${card('eye', '读进来：摇杆和按键', '<p><code>analogRead()</code> 0～1023 · <code>INPUT_PULLUP</code> 按下读 LOW · <code>else if</code> 第一个成立就停</p>', 'dark')}
  ${card('warn', '小心这几个坑', '<p>× 256 会越界，用 <code>map()</code>；电位器接 3.3V 转不满 180°；原指南漏印了一个 <code>}</code>。</p>', 'warn')}
</div>`
      },
      { kind: 'end', title: '本课结束', subtitle: '让“开”和“关”，变出无数个“中间值”。\nPWM 调亮度、调颜色，脉宽调角度，摇杆把中间值读回来。' }
    ]
  });
})();
