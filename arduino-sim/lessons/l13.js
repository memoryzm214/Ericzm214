/* lessons/l13.js — 1-3 传感器与声光输出
   Guide: arduino-ppt/assets/l13/guide_text.md (PDF 20 页). Five experiments in the guide's order:
     ① AD 模数转换 ② 光敏电阻模块 ③ LED 流水灯 ④ 蜂鸣器模块（有源 + 无源）⑤ 小磁簧开关模块
   Explanations, analogies and 动手改一改 ideas are ported from arduino-ppt/build/13_lesson_1-3.js.
   Programs are copied verbatim from the guide's cpp blocks (generated, do not retype them).
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- programs copied verbatim from arduino-ppt/assets/l13/guide_text.md (in the guide's order)
  const AD = `
int  ADPIN  = A0 ;
int  LEDPIN = 13 ;
int  value = 0 ;
float voltage = 0.0 ;
void setup()
{
    pinMode(ADPIN,INPUT);   // define ADPIN input LEDPIN output
    pinMode(LEDPIN,OUTPUT);
    Serial.begin(9600);    //Serial Baud rate is 115200
}
void loop()
{
    digitalWrite(LEDPIN,HIGH);           // light on led
    value =  analogRead(ADPIN);          // read analog pin raw data
    voltage = ( ( float )value )/1023 ;
    voltage = voltage * 5 ;              // convert analog raw data to real voltage = (analog/1023)*5
    Serial.print("get ad pin value ");   //printf Analog pin value
    Serial.print(value);
    Serial.println("\\nvoltage =  ");
    Serial.println(voltage);
    delay(1000);
    digitalWrite(LEDPIN,LOW);            //turn off led
    delay(1000);
}
`;
  const LDR = `
int ADPIN = A0 ;
int LEDPIN = 11 ;
int value = 0 ;
float voltage = 0.0 ;
void setup()
{
  pinMode(LEDPIN,OUTPUT);
  pinMode(ADPIN,INPUT);
  Serial.begin(9600); //Serial Baud rate is 115200
}
void loop()
{
  value = analogRead(ADPIN);
  voltage = ( ( float )value )/1023 ;
  value = (int)(voltage * 256) ; //convert voltage to value
  Serial.println(value);
  analogWrite(LEDPIN,value);
  delay(1000);
}
`;
  const FLOW = `
int led_array[8] = { 2 , 3 , 4 , 5 , 6 , 7 , 8 , 9 } ;
int flash_speed = 100 ;

/* flash led form left to right one by one */
void led_flash(void)
{
    int i ;
    for( i = 0 ; i < 8 ; i++ )
    {
        digitalWrite(led_array[i],LOW);
        delay(flash_speed);
        digitalWrite(led_array[i],HIGH);
    }
}

/* turn on all led form left to right */
void led_turn_on(void)
{
    int i ;
    for( i = 0 ; i < 8 ; i++ )
    {
        digitalWrite(led_array[i],LOW);
        delay(flash_speed);
    }
}

/* turn off all led  */
void led_turn_off(void)
{
    int i ;
    for( i = 0 ; i < 8 ; i++ )
    {
        digitalWrite(led_array[i],HIGH);
        delay(flash_speed);
    }
}
void setup() {
    // put your setup code here, to run once:
    int i ;
    Serial.begin(115200);
    for( i = 0 ; i < 8 ; i++ )
    {
        pinMode(led_array[i],OUTPUT);
        digitalWrite(led_array[i],HIGH);    // set led control pin defalut HIGH turn off all LED
    }
}

void loop() {
    // put your main code here, to run repeatedly:
    Serial.println("start flash led !");
    led_flash();
    led_turn_off();
    led_turn_on();
}
`;
  const ACTIVE = `
int buzzer = 9;

void setup()
{
    pinMode(buzzer,OUTPUT);
}
void loop()
{
    digitalWrite(buzzer,HIGH);  //sound production
    delay(1000);
    digitalWrite(buzzer,LOW);
    delay(1000);
}
`;
  const PASSIVE = `
int buzzer = 9;
//# define frequence_2()
void frequence_1(void)    // 1k HZ
{
    int i ;
    for(i=0;i<800;i++)
    {
        digitalWrite(buzzer,HIGH);  //sound production
        delay(0.5);
        digitalWrite(buzzer,LOW);
        delay(0.5);
    }
}

void frequence_2(void)    // 250 HZ
{
    int i ;
    for(i=0;i<800;i++)
    {
        digitalWrite(buzzer,HIGH);  //sound production
        delay(2);
        digitalWrite(buzzer,LOW);
        delay(2);
    }
}
void setup()
{
    pinMode(buzzer,OUTPUT);
}
void loop()
{
    frequence_1();
    delay(1000);
    frequence_2();
    delay(1000);
}
`;
  const REED = `
int Led=11;
int Buzzer_pin=13;
int Sensor_PIN=12;
int val=0;
void setup()
{
  pinMode(Led,OUTPUT);
  pinMode(Buzzer_pin,OUTPUT);
  pinMode(Sensor_PIN,INPUT);
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(Sensor_PIN);
  Serial.println(val);
  if(val==0)
  {
    digitalWrite(Led,HIGH);
    digitalWrite(Buzzer_pin,HIGH);
  }
  else
  {
    digitalWrite(Led,LOW);
    digitalWrite(Buzzer_pin,LOW);
  }
}
`;

  // ---- variants (built from the originals so they stay in sync)
  // AD: the PDF printed loop()'s closing } one line early, so the last delay(1000); sits outside the function.
  const AD_ORIG = AD.replace(/    delay\(1000\);\n\}\n$/, '}\n    delay(1000);\n');
  const LDR_MAP = LDR.replace('value = (int)(voltage * 256) ;', 'value = map(value, 0, 1023, 0, 255) ;');
  const LDR_NIGHT = LDR_MAP.replace('analogWrite(LEDPIN,value);', 'analogWrite(LEDPIN,255 - value);');
  const FLOW_ORDER = FLOW.replace('    led_flash();\n    led_turn_off();\n    led_turn_on();', '    led_flash();\n    led_turn_on();\n    led_turn_off();');
  const REED_DELAY = REED.replace(/  \}\n\}\n$/, '  }\n  delay(200);\n}\n');
  const REED_BEEP = REED.replace('    digitalWrite(Buzzer_pin,HIGH);\n', '    digitalWrite(Buzzer_pin,HIGH);\n    delay(100);\n    digitalWrite(Buzzer_pin,LOW);\n    delay(100);\n');

  // ---- small markup helpers (strings only)
  const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const snip = code => `<pre class="snippet"><code>${escH(code)}</code></pre>`;
  const card = (ic, title, body, cls) => `<div class="card${cls ? ' ' + cls : ''}"><h3><span class="ico${cls === 'warn' ? ' red' : cls === 'dark' ? '' : ''}">${I(ic)}</span>${title}</h3>${body}</div>`;
  const strong = t => String(t).replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>');
  const callout = (ic, title, text, cls) => `<div class="callout${cls ? ' ' + cls : ''}"><span class="ico">${I(ic)}</span><div>${title ? `<b>${title}</b>` : ''}<p>${strong(text)}</p></div></div>`;
  const tile = (n, b, s, cls) => `<div class="tile${cls ? ' ' + cls : ''}"><div class="n">${n}</div><b>${b}</b><span>${s}</span></div>`;
  // square wave over 8 ms (40 px per ms) for the sound slide; halfMs = time HIGH (= time LOW)
  const wave = (halfMs, label) => {
    const step = halfMs * 40;
    let d = 'M0 52 V12', x = 0, hi = true;
    while (x + step <= 320 + 0.01) { x += step; d += ` H${x}` + (x < 320 ? (hi ? ' V52' : ' V12') : ''); hi = !hi; }
    return `<svg viewBox="0 0 330 64" width="100%" role="img" aria-label="${label}"><path d="M0 58 H326" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"/>` +
      `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  };

  SIM.deck.register({
    id: 'l13', no: '1-3', title: '传感器与声光输出',
    subtitle: 'AD 模数转换 · 光敏电阻 · LED 流水灯 · 蜂鸣器 · 小磁簧开关',
    slides: [
      {
        kind: 'cover', title: '传感器与声光输出',
        subtitle: 'AD 模数转换 · 光敏电阻 · LED 流水灯 · 蜂鸣器 · 小磁簧开关\n先把外界的变化“读进来”，再用灯光和声音“送出去”'
      },
      {
        kind: 'html', kicker: '1-3 传感器与声光输出', title: '本节导览',
        desc: '五个实验，按指南顺序：前两个把变化“读进来”，中间两个把灯光和声音“送出去”，最后一个把两者连起来。',
        body: `
<div class="grid-3 stretch">
  ${card('wave', '实验 01　AD 模数转换', '<p><span class="tag turq">模拟输入</span> 转动电位器，读出 0～1023，再换算成电压。</p><div class="chips mt-s"><code>analogRead()</code><code>(float)</code><code>Serial.print()</code></div>')}
  ${card('sun', '实验 02　光敏电阻模块', '<p><span class="tag turq">模拟输入</span> 光敏电阻感知亮度，用 PWM 调红灯亮度。</p><div class="chips mt-s"><code>analogWrite()</code><code>PWM</code><code>map()</code></div>')}
  ${card('bulb', '实验 03　LED 流水灯', '<p><span class="tag dark">数字输出</span> 8 盏 LED 依次点亮，像流水一样。</p><div class="chips mt-s"><code>数组</code><code>for</code><code>自定义函数</code></div>')}
  ${card('bolt', '实验 04　蜂鸣器模块', '<p><span class="tag dark">数字输出</span> 有源“滴滴”响，无源唱出两种音调。</p><div class="chips mt-s"><code>delay()</code><code>delayMicroseconds()</code><code>Hz</code></div>')}
  ${card('target', '实验 05　小磁簧开关模块', '<p><span class="tag outline">数字输入</span> 磁铁靠近：灯亮、蜂鸣器响；拿开就停。</p><div class="chips mt-s"><code>digitalRead()</code><code>if / else</code><code>==</code></div>')}
  ${card('flag', '每个实验怎么学', '<ol class="steps"><li>原理和接线：先看懂电路</li><li>代码逐行看懂：一行一行读</li><li>动手实验室：运行、观察、改代码</li></ol>', 'dark')}
</div>`
      },

      // ================================================================ 实验 01　AD 模数转换
      {
        kind: 'section', no: '实验 01', title: 'AD 模数转换实验',
        desc: '转动电位器旋钮，让 Arduino 读出 0～1023 的数字，再换算成真实电压，显示在串口监视器上。',
        tiles: [
          { title: '原理', sub: '电位器分压 · 换算公式' },
          { title: '接线', sub: '电位器中间脚 → A0' },
          { title: '代码', sub: 'analogRead() · (float)' },
          { title: '结果', sub: '串口监视器看数字' }
        ]
      },
      {
        kind: 'html', title: '实验介绍：A/D 转换是什么',
        desc: 'A/D 转换就是把模拟信号变成数字信号——Arduino 正是靠它“读懂”各种传感器。',
        body: `
<div class="grid-2">
  ${card('wave', '数字信号 和 模拟信号', '<p><b>数字信号</b>只有两种状态：HIGH / LOW，像电灯开关，非亮即灭。</p><p><b>模拟信号</b>可以连续变化：0～5V 之间任何值都行，像调光旋钮、水龙头。温度、光线、声音……先由传感器变成电压，再交给 Arduino。</p>')}
  ${card('target', 'ADC：一把刻了 1024 格的尺子', '<p>UNO 的 A/D 是 <b>10 位</b>：2<sup>10</sup> = 1024 级。<code>analogRead()</code> 读出电压落在第几格：0V → 0，5V → 1023，每格约 4.9 mV。</p><p>反过来把数字变回电压叫 D/A（数模转换）。</p>', 'dark')}
</div>
<div class="grid-4 mt">
  ${tile('A/D', '模数转换', '模拟 → 数字，本实验的主角', 'turq')}
  ${tile('D/A', '数模转换', '数字 → 模拟，正好反过来')}
  ${tile('A0～A5', '6 个模拟输入口', '也能当数字口用，编号 14～19', 'dark')}
  ${tile('10K', '电位器', '会转的“分压旋钮”', 'white')}
</div>
<div class="grid-2 mt">
  ${callout('list', '组件清单', 'Arduino Uno R3 主板 · 面包板 · USB 数据线 · 10k 电位器 ×1 · LED ×1 · 220Ω 电阻 ×1 · 若干跳线', 'gray')}
  ${callout('flag', '实验目的', '把电位器旋钮的位置变成 0～1023 的读数，再换算成电压显示在屏幕上。13 号脚的 LED 一闪一闪，说明程序在一遍遍运行。')}
</div>`
      },
      {
        kind: 'html', title: '实验原理：电位器分压 → 读数 → 电压',
        desc: 'A0 读的是电位器中间脚的电压；读数 ÷ 1023 × 5V，就是引脚上的真实电压。',
        body: `
<div class="grid-2">
  <div class="card">
    <h3><span class="ico">${I('reset')}</span>电位器是一个“分压旋钮”</h3>
    <ol class="steps">
      <li>两端接 5V 和 GND，中间是一整条电阻。</li>
      <li>中间脚连着一个能滑动的“滑片”。</li>
      <li>转旋钮 = 移动滑片：中间脚输出 0～5V 之间的电压，接到 A0 去读。</li>
    </ol>
    <div class="table-wrap mt-s"><table class="table">
      <thead><tr><th>旋钮位置</th><th>中间脚电压</th><th>读数</th></tr></thead>
      <tbody><tr><td>GND 一端</td><td>≈ 0 V</td><td>≈ 0</td></tr><tr><td>正中间</td><td>≈ 2.5 V</td><td>≈ 512</td></tr><tr><td>5V 一端</td><td>≈ 5 V</td><td>≈ 1023</td></tr></tbody>
    </table></div>
  </div>
  <div class="stack">
    <div class="card pale">
      <h3><span class="ico">${I('book')}</span>原指南的换算公式</h3>
      <p class="big center">V<sub>R</sub> = Value ÷ (2<sup>10</sup> − 1) × V<sub>DD</sub></p>
      <dl class="kv mt-s"><dt>V<sub>R</sub></dt><dd>实际电压</dd><dt>Value</dt><dd>AD 读数 0～1023</dd><dt>V<sub>DD</sub></dt><dd>AD 参考电压，UNO 上是 5V</dd></dl>
    </div>
    ${callout('check', '举个例子：读数 399', '399 ÷ 1023 × 5 ≈ <b>1.95 V</b>——和原指南串口截图里的 1.95 对上了。')}
  </div>
</div>
<div class="flow mt">
  <div><b>电位器</b><br>旋钮分出 0～5V</div>
  <div><b><code>analogRead()</code></b><br>电压 → 0～1023</div>
  <div><b>换算</b><br>读数 ÷ 1023 × 5</div>
  <div class="on"><b>Serial</b><br>读数和电压发到电脑</div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：电位器接 A0，LED 接 13',
        desc: '电位器两端接 5V 和 GND，中间脚接 A0；LED 和 220Ω 电阻串联，接在 13 号脚与 GND 之间。',
        img: 'img/l13/ad_wiring.jpg', caption: '原指南接线图：红线 5V · 黄线 A0 · 黑线 GND · 蓝线 13 号脚',
        tables: [
          { left: 'Arduino UNO', right: '10K 电位器', rows: [['5V', '一端'], ['A0', '中间引脚'], ['GND', '另一端']] },
          { left: 'Arduino UNO', right: 'LED（串 220Ω 电阻）', rows: [['13', 'LED 正极（长脚）'], ['GND', '220Ω 电阻 → LED 负极']] }
        ],
        note: '原指南这一节只有接线图，上面两张表是照图整理的。电位器两端的 5V、GND 对调也能用，只是读数随旋钮变化的方向反过来。'
      },
      {
        kind: 'html', title: '三个新词：analogRead()、(float)、Serial.print()',
        desc: '先打个比方，再看最小的例子。',
        body: `
<div class="grid-3">
  ${card('target', 'analogRead(引脚)', `<p>像拿尺子量一下：读出引脚电压落在 0～1023 的第几格。只有 A0～A5 能用。</p>${snip('value = analogRead(A0);  // 0～1023')}<p class="small muted">digitalRead() 只回答 0 或 1；analogRead() 回答“有多少”。</p>`)}
  ${card('cube', 'float 和 (float)', `<p><code>int</code> 只装整数，<code>float</code> 能装小数。<code>(float)</code> 让整数临时变成小数。</p>${snip('399 / 1023          // → 0\n(float)399 / 1023   // → 0.39')}<p class="small muted">两个整数相除，小数部分被直接扔掉。</p>`)}
  ${card('send', 'Serial.print() 和 println()', `<p>串口是 Arduino 和电脑聊天的窗口：<code>print</code> 说完不换行，<code>println</code> 说完换行，文字里的 <code>\\n</code> 表示“在这里换行”。</p>${snip('get ad pin value 399\nvoltage =\n1.95')}<p class="small muted">上面就是这个程序每次打印的 3 行。</p>`)}
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：准备工作',
        desc: '先准备四个“盒子”（变量），再在 setup() 里把引脚和串口设置好。',
        file: 'ad_convert.ino', code: AD, from: 1, to: 12, hl: [1, 2, 9],
        notes: [
          { line: [1, 2], text: '起名字：<code>ADPIN</code> 就是 A0，<code>LEDPIN</code> 就是 13。' },
          { line: [3, 4], text: '两个盒子：<code>value</code> 装整数读数，<code>voltage</code> 装带小数的电压。' },
          { line: [7, 8], text: 'A0 设为输入（读电压），13 设为输出（点亮 LED）。' },
          { line: 9, text: '打开串口，速度 9600。注释写的 115200 是笔误，以代码为准，串口监视器也选 9600。' },
          { line: 11, text: '<code>loop()</code> 里的内容会一遍又一遍地重复。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：读数、换算、打印',
        desc: '每一轮：亮灯 → 读 A0 → 换算成电压 → 打印 → 灭灯，每 2 秒重复一次。',
        file: 'ad_convert.ino', code: AD, from: 13, to: 24, hl: [14, 15, 16, 19],
        notes: [
          { line: [13, 14], text: '先点亮 LED，再读 A0：0V → 0，5V → 1023。' },
          { line: [15, 16], text: '<code>(float)</code> 先变小数，÷ 1023 得到 0～1 的比例，× 5 就是电压。' },
          { line: [17, 20], text: '打印 3 行：读数、“voltage =”、电压值。第 19 行开头的 <code>\\n</code> 让“voltage =”另起一行。' },
          { line: [21, 24], text: '亮 1 秒 → 灭灯 → 再等 1 秒。' }
        ],
        foot: `<div class="card warn"><h3><span class="ico red">${I('warn')}</span>原指南这里印错了</h3><p>原指南第 3 页把第 24 行的 <code>}</code> 印在了第 23 行前面，<code>delay(1000);</code> 落到函数外，编译会报错。这里已放回最后；实验室的“原指南原样”标签能看到报错。</p></div>`
      },
      {
        kind: 'lab', title: '动手实验室：转动电位器，看读数和电压',
        desc: '点 ▶ 运行，拖动电位器旋钮（或下面的滑块），看串口监视器里的读数和电压；13 号脚的 LED 每 2 秒闪一次。',
        lab: {
          programs: [
            { name: 'ad_convert.ino', label: 'AD 程序（已修正）', code: AD, note: '原指南把 loop() 的 <code>}</code> 印早了一行，这里已放回最后，其余一字未改。' },
            { name: 'ad_convert_原样.ino', label: '原指南原样', code: AD_ORIG, expect: 'error', note: '原指南原样：第 23 行的 <code>}</code> 后面还有一行 <code>delay(1000);</code>。点 ▶ 运行，读一读错误提示。' }
          ],
          parts: [
            { type: 'board' },
            { type: 'pot', pin: 'A0', vcc: 5, label: '电位器 中间脚→A0' },
            { type: 'led', pin: 13, color: '#ff4d4f', label: 'LED +→D13' }
          ],
          baud: 9600,
          tasks: [
            { text: '运行后慢慢转电位器：读数在 0～1023 之间变，电压在 0～5V 之间变。LED（和 UNO 板上的 L 灯）亮 1 秒、灭 1 秒。' },
            { text: '把电位器下面的滑块拖到 39% 左右，再用键盘 ← → 微调，让读数停在 399：电压 1.95，和原指南的截图一样。验算：399 ÷ 1023 × 5 ≈ 1.95。' },
            { text: '切到“原指南原样”点 ▶ 运行：红色错误指向第几行？把第 23 行的 <code>}</code> 挪到最后一行，再运行。', code: AD, program: 1 },
            { text: '把第 15 行的 <code>( ( float )value )</code> 改成 <code>value</code>：电压几乎总是 0.00——两个整数相除，小数被扔掉了。', code: AD.replace('voltage = ( ( float )value )/1023 ;', 'voltage = value/1023 ;'), program: 0 },
            { text: '把两个 <code>delay(1000)</code> 都改成 <code>delay(100)</code>：每 0.2 秒刷新一次，转旋钮时数字跟得更紧。', code: AD.replace(/delay\(1000\)/g, 'delay(100)'), program: 0 }
          ],
          smoke: [
            { slider: 'pot', value: 390 },
            { expect: { serialRe: 'get ad pin value 399\\s*\\n\\s*voltage =\\s*\\n\\s*1\\.95', pin: [13, 1] } },
            { expect: { pin: [13, 0] }, timeout: 3000 },
            { knob: 'pot', to: 1 },
            { expect: { serialRe: 'get ad pin value 1023\\s*\\n\\s*voltage =\\s*\\n\\s*5\\.00' } },
            { tab: 1, run: true },
            { expect: { state: 'error', status: '/^编译错误：第 24 行：.*函数外面/', errLine: 24 } },
            { task: 4, run: true },
            { slider: 'pot', value: 390 },
            { expect: { serialRe: 'get ad pin value 399\\s*\\n\\s*voltage =\\s*\\n\\s*0\\.00', state: 'running' } }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：转动旋钮，数字跟着变',
        desc: '串口监视器（9600）每 2 秒打印一组：<code>get ad pin value 399</code> 是读数，<code>voltage =</code> 是提示文字，<code>1.95</code> 是电压。不动旋钮时数字在 398、399 之间轻轻跳动，属于正常的小误差。',
        img: [
          { src: 'img/l13/ad_result_photo.jpg', caption: '实物连接（原指南照片）' },
          { src: 'img/l13/ad_serial_monitor.jpg', caption: '串口监视器（原指南截图）：399 → 1.95 V' }
        ]
      },

      // ================================================================ 实验 02　光敏电阻模块
      {
        kind: 'section', no: '实验 02', title: '光敏电阻模块实验',
        desc: '光敏电阻会随光线改变阻值。把它接到 A0 读出环境亮度，再用这个数控制 RGB 灯模块里红灯的亮度。',
        tiles: [
          { title: '认识模块', sub: '光越强，电阻越小' },
          { title: '接线', sub: 'S → A0，R → 11' },
          { title: '代码', sub: 'analogRead · analogWrite' },
          { title: '结果', sub: '盖住它，看灯的变化' }
        ]
      },
      {
        kind: 'figure', title: '认识光敏电阻：光越强，电阻越小',
        desc: '光敏电阻对光线非常敏感，常用来检测环境亮度，做光控灯、自动调光。',
        img: 'img/l13/ldr_module_photo.jpg', caption: '环境亮度传感器（光敏电阻模块）：正面 / 反面',
        side: `
<div class="card">
  <h3><span class="ico">${I('sun')}</span>三句话认识它</h3>
  <ol class="steps">
    <li><b>它是什么</b>：一种会“看光”的电阻，用硫化镉等半导体材料做成。</li>
    <li><b>为什么会变</b>：光一照，材料里能移动的电荷变多，电阻就变小（内光电效应）。</li>
    <li><b>变化有多大</b>：强光下可小于 1 kΩ，无光时约 1.5 MΩ，相差上千倍。</li>
  </ol>
</div>
<div class="grid-3 mt-s">
  ${tile('S', '信号', '接 A0', 'turq')}
  ${tile('V', '电源', '接 5V')}
  ${tile('G', '地', '接 GND', 'dark')}
</div>`
      },
      {
        kind: 'html', title: '原理：光线 → 电阻 → 电压 → 读数 → 亮度',
        desc: '模块里光敏电阻和一个固定电阻串联分压（和实验一的电位器同一个道理）；读数再用 PWM 变成红灯的亮度。',
        body: `
<div class="flow">
  <div><b>光线变化</b><br>用手盖住 / 手电筒照</div>
  <div><b>电阻变化</b><br>光越强电阻越小</div>
  <div><b>A0 电压变化</b><br>串联分压</div>
  <div><b>读数 0～1023</b><br><code>analogRead(A0)</code></div>
  <div class="on"><b>亮度 0～255</b><br><code>analogWrite(11, 值)</code></div>
</div>
<div class="grid-2 mt">
  <div class="card">
    <h3><span class="ico">${I('bolt')}</span>新语法：analogWrite() 和 PWM</h3>
    ${callout('question', '打个比方', '飞快地开关灯：一秒开关几百次，眼睛看不出闪烁，只觉得灯暗了一些。开着的时间越长，看起来越亮。')}
    ${snip('analogWrite(11, 128);  // 一半亮度')}
    <dl class="kv"><dt>值的范围</dt><dd>0～255（0 灭，255 最亮）</dd><dt>能用的引脚</dt><dd>3 5 6 9 10 11（板上带 ~ 的）</dd><dt>11 号脚</dt><dd>每秒开关约 490 次</dd></dl>
  </div>
  <div class="stack">
    ${callout('list', '组件清单', 'Arduino UNO R3 主板 · 面包板 · USB 数据线 · 光敏电阻（模块）×1 · LED 模块 ×1 · 若干跳线', 'gray')}
    ${callout('info', '清单和接线图不一样', '清单写的是“LED 模块”，接线图用的是 <b>RGB LED 模块</b>，只接了 R（红）一路，所以亮的是红灯。', 'note')}
    ${callout('flag', '原理（原指南）', '光敏电阻模块对环境光线最敏感，一般用来检测周围环境光线的亮度，触发单片机或继电器模块等。')}
  </div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：光敏模块接 A0，RGB 模块红灯接 11',
        desc: '光敏电阻模块 S → A0、G → GND、V → 5V；RGB LED 模块 R → 11、GND → GND。',
        img: 'img/l13/ldr_wiring.jpg', caption: '原指南接线图：上方是 RGB LED 模块，下方是光敏电阻模块',
        tables: [
          { left: 'Arduino UNO 板', right: '光敏电阻模块', rows: [['A0', 'S'], ['GND', 'G'], ['5V', 'V']] },
          { left: 'Arduino UNO 板', right: 'RGB LED 模块', rows: [['11', 'R'], ['GND', 'GND']] }
        ],
        note: 'S = 信号，G = 地，V = 电源。R 接的是 11 号脚——板上 11 旁边有 ~，表示它能输出 PWM。'
      },
      {
        kind: 'code', title: '代码逐行看懂：读光线，调亮度',
        desc: '原指南这一节没有印出程序：这里的程序来自同一套件的《Arduino 编程入门学习教程》第 2.20 讲，接线和本指南一致。',
        file: 'light_sensor.ino', code: LDR, from: 1, to: 19, hl: [13, 14, 15, 17],
        notes: [
          { line: [1, 2], text: 'A0 读光敏电阻；LED 换到带 ~ 的 11 号脚。' },
          { line: [3, 4], text: '<code>value</code> 装读数；<code>voltage</code> 这里装的是 0～1 的比例，不是电压。' },
          { line: [7, 9], text: '11 设为输出，A0 设为输入；串口 9600（注释里的 115200 同样是笔误）。' },
          { line: 13, text: '读光敏电阻，得到 0～1023。' },
          { line: 14, text: '先变小数再 ÷ 1023 → 0～1 的比例。' },
          { line: 15, text: '× 256，<code>(int)</code> 去掉小数 → 亮度值。读数满 1023 时会算出 <b>256</b>！' },
          { line: [16, 17], text: '打印亮度值，再送到红灯。' },
          { line: 18, text: '等 1 秒，回到第 13 行再读。' }
        ]
      },
      {
        kind: 'lab', title: '动手实验室：用光线控制红灯亮度',
        desc: '点 ▶ 运行，拖动“光照”滑块或点“用手盖住”。注意：本模拟越亮读数越大，实物模块可能正好相反——以实物测量为准。',
        lab: {
          programs: [
            { name: 'light_sensor.ino', label: '光敏程序', code: LDR, note: '程序来自同一套件《Arduino 编程入门学习教程》第 2.20 讲（原指南此处没有印程序）。' }
          ],
          parts: [
            { type: 'board' },
            { type: 'ldr', pin: 'A0', light: 60, label: '光敏电阻模块 S→A0' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'RGB 模块 R→D11（PWM）' }
          ],
          baud: 9600,
          tasks: [
            { text: '运行后拖动“光照”滑块、点“用手盖住”：串口里的数和红灯亮度一起变。记下三种情况的数：正常光、盖住、最亮。' },
            { text: '把光照拉到 100%：读数 1023，算出 256——红灯反而灭了！看右下角“引脚”里 D11 的 PWM 条。' },
            { text: '把第 15 行改成 <code>value = map(value, 0, 1023, 0, 255) ;</code>：最亮时正好 255，不会越界。', code: LDR_MAP },
            { text: '做一盏“小夜灯”：在任务 3 的基础上，把第 17 行改成 <code>analogWrite(LEDPIN,255 - value);</code>——越暗灯越亮。用手盖住试试。', code: LDR_NIGHT }
          ],
          smoke: [
            { slider: 'ldr', value: 50 },
            { expect: { serialRe: '(^|\\n)128\\n', pwm: [11, 120, 136] } },
            { slider: 'ldr', value: 100 },
            { expect: { serialRe: '(^|\\n)256\\n', pwm: [11, 0, 0], part: ['led', 'brightness', '0.000'] } },
            { task: 3, run: true },
            { expect: { serialRe: '(^|\\n)255\\n', pin: [11, 1] } },
            { click: 'ldr' },
            { expect: { serialRe: '(^|\\n)10\\n', pwm: [11, 5, 15], read: ['ldr', '盖住'] } },
            { task: 4, run: true },
            { expect: { serialRe: '(^|\\n)10\\n', pwm: [11, 240, 250] } }
          ]
        }
      },
      {
        kind: 'html', title: '常见坑：(int) 和越界的 256',
        desc: '(int) 直接去掉小数；读数满 1023 时会算出 256，超出 analogWrite 的 0～255。',
        body: `
<div class="grid-2">
  <div class="card">
    <h3><span class="ico">${I('cube')}</span>(int)：把小数砍掉</h3>
    <p>像量身高只记整厘米：172.9 cm 记作 172。<code>(int)</code> 不四舍五入，直接扔掉小数部分。</p>
    <div class="table-wrap mt-s"><table class="table">
      <thead><tr><th>读数 value</th><th>÷ 1023</th><th>× 256</th><th>(int) 结果</th></tr></thead>
      <tbody>
        <tr><td>0</td><td>0.000</td><td>0.0</td><td>0</td></tr>
        <tr><td>512</td><td>0.500</td><td>128.1</td><td>128</td></tr>
        <tr><td>1000</td><td>0.978</td><td>250.2</td><td>250</td></tr>
        <tr><td>1022</td><td>0.999</td><td>255.7</td><td>255</td></tr>
        <tr class="hl"><td><b>1023</b></td><td>1.000</td><td>256.0</td><td><b>256 越界</b></td></tr>
      </tbody>
    </table></div>
  </div>
  <div class="stack">
    <div class="card warn"><h3><span class="ico red">${I('warn')}</span>小心：256 越界了</h3><p><code>analogWrite</code> 只认 0～255。写 256 时只剩低 8 位，变成 0——读数正好 1023 时，灯突然几乎熄灭，而不是最亮。</p></div>
    <div class="card ok"><h3><span class="ico">${I('check')}</span>更稳妥：用 map() 换算</h3>${snip('value = map(value, 0, 1023, 0, 255);')}<p><code>map()</code> 把 0～1023 按比例换成 0～255，最大正好是 255，不会越界。把 256 改成 255 也行。</p></div>
  </div>
</div>`
      },
      {
        kind: 'figure', title: '实验结果：盖住光敏电阻，红灯亮度跟着变',
        desc: '原指南：“现在我们盖住光敏电阻，我们将清楚地看到光的亮度变化。”',
        img: 'img/l13/ldr_result_photo.jpg', caption: '原指南实物照片：光敏模块和 RGB 模块接在 UNO 上，红灯亮起',
        side: `
<div class="card">
  <h3><span class="ico">${I('eye')}</span>在实物上测一测，填一填</h3>
  <div class="table-wrap"><table class="table">
    <thead><tr><th>光线条件</th><th>串口数值</th><th>红灯亮度</th></tr></thead>
    <tbody><tr><td class="l">① 正常光线</td><td></td><td></td></tr><tr><td class="l">② 用手盖住</td><td></td><td></td></tr><tr><td class="l">③ 手电筒照</td><td></td><td></td></tr></tbody>
  </table></div>
</div>
${callout('info', '变大还是变小？', '取决于模块内部电路，原指南没有写。模拟器里越亮读数越大；实物可能相反——自己测出来才算数。', 'note')}`
      },

      // ================================================================ 实验 03　LED 流水灯
      {
        kind: 'section', no: '实验 03', title: 'LED 流水灯实验',
        desc: '让 8 盏 LED 一个接一个亮起来，像水一样“流”过去。顺便学会三样新本领：数组、for 循环和自定义函数。',
        tiles: [
          { title: '原理', sub: '限流电阻 · LOW 点亮' },
          { title: '接线', sub: '8 盏灯 → D2～D9' },
          { title: '代码', sub: '数组 · for · 函数' },
          { title: '结果', sub: '看灯怎么“流”起来' }
        ]
      },
      {
        kind: 'figure', title: '认识 LED：会发光的二极管',
        desc: 'LED 只让电流从正极流向负极——长脚接正、短脚接负，接反了就不亮。',
        img: [
          { src: 'img/l13/led_photo.jpg', caption: '实物：红色 LED（长脚是正极）' },
          { src: 'img/l13/led_symbol.jpg', caption: '发光二极管的电路符号（三角形尖端指向负极）' }
        ],
        side: `
<div class="card">
  <h3><span class="ico">${I('bulb')}</span>三件事</h3>
  <ol class="steps">
    <li><b>它是什么</b>：发光二极管，电流流过就发光，省电又耐用。</li>
    <li><b>颜色</b>：半导体材料不同（镓、砷、磷等的化合物），颜色就不同。</li>
    <li><b>单向导通</b>：电流只能从长脚（+）流到短脚（−），像单向闸机。</li>
  </ol>
  <p class="small muted mt-s">注：原指南这里把两种颜色的材料印成了同一个名字，记结论就好。</p>
</div>
${callout('flag', '实验目的', '让灯光像流水一样：先让单个灯从左到右跑一趟，再让所有灯依次点亮，如此循环。<br>清单：UNO 主板 · 面包板 · USB 线 · LED ×8 · 1k 电阻 ×8 · 跳线')}`
      },
      {
        kind: 'html', title: '为什么要串电阻：限流电阻',
        desc: 'LED 自己不会“限速”，电压只高一点点电流就猛增；串一个电阻，把电流控制在安全范围。',
        body: `
<div class="grid-2">
  <div class="card pale">
    <h3><span class="ico">${I('book')}</span>原指南的公式</h3>
    <p class="big center">R = (E − V<sub>F</sub>) ÷ I</p>
    <dl class="kv mt-s"><dt>E</dt><dd>电源电压，这里是 5V</dd><dt>V<sub>F</sub></dt><dd>LED 正向压降，约 1.5～2V</dd><dt>I</dt><dd>工作电流，约 10～20 mA</dd></dl>
    <p class="mt-s">电源电压减去 LED “吃掉”的电压，剩下的由电阻承担。</p>
  </div>
  <div class="stack">
    ${card('target', '算一算：红色 LED 接 5V', '<p>(5 − 2) V ÷ 0.015 A ≈ 200 Ω → 取常见的规格 <b>220 Ω</b>。</p><p>本套件用 <b>1 kΩ</b>：(5 − 2) V ÷ 1000 Ω ≈ 3 mA，灯稍暗，但更省电、更安全，照样看得清。</p>')}
    ${callout('question', '打个比方', '电阻像水龙头的阀门：阀门拧小，水流（电流）就小。灯会暗一些，但不会被“冲坏”。')}
    ${callout('warn', '', 'LED 反向最多只能承受约 5V，不要反接到更高的电压上。', 'note')}
  </div>
</div>`
      },
      {
        kind: 'figure', title: '原理图：LOW 点亮，HIGH 熄灭',
        desc: '8 盏 LED 的正极都接 5V，负极经 1kΩ 电阻接 D2～D9——这和“HIGH 才亮”正好相反。',
        img: 'img/l13/flow_schematic.jpg', caption: '原指南原理图：VCC_5V → LED1～LED8 → 1K 电阻 → D2～D9',
        side: `
<div class="grid-2">
  ${tile('LOW', '灯亮', '引脚 0V，比正极低 5V，电流流过 LED', 'turq')}
  ${tile('HIGH', '灯灭', '引脚也是 5V，两头一样高，没有电流', 'dark')}
</div>
${callout('question', '水往低处流', '正极在 5V 的“高处”，引脚降到 0V，电流才流下来；引脚也在 5V，就流不动。')}`
      },
      {
        kind: 'wiring', title: '接线：8 盏灯接 D2～D9',
        desc: 'LED 长脚插 5V 电源轨，短脚各串一个 1kΩ 电阻，再分别接到 D2～D9。',
        img: 'img/l13/flow_wiring.jpg', caption: '原指南接线图（图中标注：短脚 · 电阻 1K · 长脚）',
        tables: [
          { left: 'Arduino UNO', right: '8 盏 LED', rows: [['2～9', '各 LED 短脚（各串 1kΩ 电阻）'], ['5V', '所有 LED 长脚（电源轨）']] }
        ],
        note: '原指南这一节只有原理图和接线图，表格照图整理。先断电再接线：8 个 LED 方向要一致，长脚全部朝 5V 电源轨。D0、D1 是和电脑通信的串口，先空着，所以从 D2 开始。'
      },
      {
        kind: 'html', title: '三个新本领：数组、for 循环、自定义函数',
        desc: '数组把 8 个引脚号排进一排编号的柜子；for 循环挨个打开；函数把一串动作打包成一个名字。',
        body: `
<div class="grid-3">
  ${card('list', '数组 = 一排编号的柜子', `<p>一个名字装 8 个引脚号，按编号取用。</p>${snip('int led_array[8] = {2,3,4,5,6,7,8,9};\nled_array[0]   // → 2\nled_array[7]   // → 9')}<p class="small"><b>编号从 0 开始！</b>8 个柜子是 0～7，没有 <code>led_array[8]</code>。</p>`)}
  ${card('reset', 'for 循环 = 数着圈跑步', `${snip('for( i = 0 ; i < 8 ; i++ )')}<dl class="kv"><dt class="mono">i = 0</dt><dd>从 0 开始</dd><dt class="mono">i &lt; 8</dt><dd>小于 8 就继续跑</dd><dt class="mono">i++</dt><dd>每跑一圈加 1</dd></dl><p class="small mt-s">i = 0 点 2 号脚，i = 1 点 3 号脚……i = 7 点 9 号脚。</p>`)}
  ${card('book', '自定义函数 = 一份菜谱', `${snip('void led_flash(void)\n{\n  // 一串动作写在这里\n}\n\nled_flash();   // 喊一声名字 = 做一遍')}<p class="small"><code>void</code>：做完不交回结果；<code>(void)</code>：不需要额外“材料”。</p>`)}
</div>
<div class="card warn mt"><h3><span class="ico red">${I('warn')}</span>原指南的文字和程序不一致</h3><p>文字说“每盏灯 500ms、先点亮 D9”，程序里是 <code>flash_speed = 100</code>（0.1 秒）、数组从 2 号脚开始——以程序为准。</p></div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/3）：数组和单灯跑',
        desc: '先准备好“柜子”和速度，再把“一盏灯从头跑到尾”打包成 led_flash()。',
        file: 'flowing_led.ino', code: FLOW, from: 1, to: 14, hl: [1, 2, 10, 11, 12],
        notes: [
          { line: [1, 2], text: '数组：<code>led_array[0]</code> 是 2，<code>[7]</code> 是 9；每一步停 100 毫秒。' },
          { line: 4, text: '注释：从左到右一个一个闪（form 是 from 的笔误，不影响程序）。' },
          { line: 5, text: '自定义函数：把“单灯跑一趟”打包。' },
          { line: 8, text: 'i 从 0 数到 7，8 盏灯挨个处理。' },
          { line: [10, 12], text: '拉低 → 这盏<b>亮</b>；等 0.1 秒；拉高 → 熄灭，换下一盏。记住：这里 LOW 才是亮。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（2/3）：一对“双胞胎”函数',
        desc: 'led_turn_on() 逐个点亮，led_turn_off() 逐个熄灭——两段代码只差 LOW 和 HIGH。',
        file: 'flowing_led.ino', code: FLOW, from: 16, to: 36, hl: [22, 33],
        notes: [
          { line: 17, text: '<code>led_turn_on()</code>：逐个点亮。比 led_flash() 少了“拉高熄灭”这一步。' },
          { line: [22, 23], text: 'LOW：点亮这一盏，而且不再熄灭；等 0.1 秒再点下一盏 → 灯越亮越多。' },
          { line: 28, text: '<code>led_turn_off()</code>：逐个熄灭。' },
          { line: [33, 34], text: 'HIGH：熄灭这一盏；等 0.1 秒再关下一盏。每个函数都要 8 × 0.1 = 0.8 秒。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（3/3）：setup() 和 loop()',
        desc: 'setup() 开机只做一次准备；loop() 按顺序调用三个函数，一遍又一遍地重复。',
        file: 'flowing_led.ino', code: FLOW, from: 37, to: 54, hl: [40, 44, 51, 52, 53],
        notes: [
          { line: 37, text: '<code>setup()</code>：像上课前摆好桌椅，只做一次。' },
          { line: 40, text: '打开串口，速度 <b>115200</b>——串口监视器也要选 115200 才能看到第 50 行的文字。' },
          { line: [41, 45], text: '8 个引脚设为输出，先输出 HIGH → 全部熄灭（defalut 是 default 的笔误）。' },
          { line: 50, text: '每轮在串口发一句 <code>start flash led !</code>' },
          { line: [51, 53], text: '单灯跑 → 逐个熄灭 → 逐个点亮，然后回到 loop() 开头再来一遍。三行读起来像说话——这就是函数的好处。' }
        ]
      },
      {
        kind: 'tasks', title: '先想一想：实际跑起来是什么样？',
        desc: '根据代码推一推，再到下一页的实验室里验证。',
        items: [
          { title: '第 1 轮（灯从全灭开始）', text: '<code>led_flash()</code>：一盏灯从 2 号跑到 9 号；<code>led_turn_off()</code>：灯已经全灭，只是停顿 0.8 秒；<code>led_turn_on()</code>：一盏接一盏点亮，最后全亮。' },
          { title: '第 2 轮起（灯从全亮开始）', text: '<code>led_flash()</code> 把每盏灯“拉低再拉高”——原本亮着的灯被逐个关掉，看起来变成了<strong>逐个熄灭</strong>！' },
          { title: '想每轮都看到单灯跑？', text: '把 loop() 里的顺序换成 <code>led_flash(); led_turn_on(); led_turn_off();</code>' }
        ],
        body: `
<div class="flow">
  <div><b>0～0.8 秒</b><br><code>led_flash()</code></div>
  <div><b>0.8～1.6 秒</b><br><code>led_turn_off()</code></div>
  <div class="on"><b>1.6～2.4 秒</b><br><code>led_turn_on()</code></div>
</div>
<p class="small muted mt-s">每个函数 8 × 0.1 秒 = 0.8 秒，一轮 2.4 秒，然后 loop() 从头再来。</p>`
      },
      {
        kind: 'lab', title: '动手实验室：8 盏灯的流水灯',
        desc: '点 ▶ 运行，盯住第 1 轮和第 2 轮的区别。看不清就把速度选 0.1× 慢动作。',
        lab: {
          programs: [{ name: 'flowing_led.ino', label: '流水灯', code: FLOW }],
          parts: [
            { type: 'board' },
            { type: 'ledBar', pins: [2, 3, 4, 5, 6, 7, 8, 9], activeLow: true, label: '8 个 LED 短脚→D2～D9，长脚接 5V' }
          ],
          baud: 115200,
          tasks: [
            { text: '运行后看一看：第 1 轮是“单灯跑”，第 2 轮的 led_flash() 变成了什么？选 0.1× 慢动作、勾上“跟随行”，看执行到哪一行。' },
            { text: '串口监视器每轮出现一行 <code>start flash led !</code>。把波特率改成 9600 会怎样？再改回 115200。' },
            { text: '把 loop() 里的顺序换成 <code>led_flash(); led_turn_on(); led_turn_off();</code>：每一轮都能看到单灯跑了吗？', code: FLOW_ORDER },
            { text: '把第 2 行的 <code>flash_speed</code> 改成 300：水流变慢；再试试 5：一轮只要 0.12 秒，快到看不出“流”的方向，只见一排灯在闪。', code: FLOW.replace('int flash_speed = 100 ;', 'int flash_speed = 300 ;') },
            { text: '把数组倒过来写成 <code>{ 9 , 8 , 7 , 6 , 5 , 4 , 3 , 2 }</code>：水流方向反过来了吗？', code: FLOW.replace('{ 2 , 3 , 4 , 5 , 6 , 7 , 8 , 9 }', '{ 9 , 8 , 7 , 6 , 5 , 4 , 3 , 2 }') }
          ],
          smoke: [
            { expect: { part: ['ledBar', 'lit', '/^D\\d$/'], serial: 'start flash led !' }, timeout: 1500 },
            { expect: { part: ['ledBar', 'lit', 'D2,D3,D4,D5,D6,D7,D8,D9'] }, timeout: 4000 },
            { baud: 9600, expect: { garbled: true } },
            { baud: 115200, wait: 200, expect: { garbled: false } },
            { task: 3, run: true },
            { wait: 2500 },
            { expect: { part: ['ledBar', 'lit', '/^D\\d$/'] }, timeout: 1500 },
            { task: 4, run: true },
            { expect: { var: ['flash_speed', 300], part: ['ledBar', 'lit', '/^D\\d$/'] } }
          ]
        }
      },
      {
        kind: 'html', title: '实验结果和常见坑',
        desc: '上传程序后，灯一盏接一盏亮起又熄灭；改一改 flash_speed，“水流”就会变快或变慢。',
        body: `
<div class="grid-2">
  <figure class="figure"><img src="img/l13/flow_result_photo.jpg" alt="原指南实物照片：8 个黄、红色 LED 插在面包板上接 UNO"><figcaption>原指南实物照片：8 个 LED（黄、红）接 UNO</figcaption></figure>
  <div class="stack">
    ${callout('flag', '小挑战：心形流水灯', '原指南的彩蛋：把 LED 摆成心形，做一盏送给重要的人。同样 8 个引脚，换一种摆法就是新作品。')}
    <div class="card warn"><h3><span class="ico red">${I('warn')}</span>常见坑</h3>
      <ul class="checklist">
        <li><span><b>以为 HIGH 才亮</b>：正极接 5V 的接法里，LOW 才亮。</span></li>
        <li><span><b>有一盏不亮</b>：先查它的长短脚是不是插反了，再查电阻有没有插牢。</span></li>
        <li><span><b>串口乱码</b>：程序用 115200，串口监视器也要选 115200。</span></li>
        <li><span><b>数组越界</b>：写了 <code>led_array[8]</code>？编号只有 0～7。模拟器会停下并标红；真实 UNO 不报错，只会乱写别的内存。</span></li>
      </ul>
    </div>
  </div>
</div>`
      },

      // ================================================================ 实验 04　蜂鸣器模块
      {
        kind: 'section', no: '实验 04', title: '蜂鸣器模块实验',
        desc: 'LED 管“光”，蜂鸣器管“声”。还是用 digitalWrite()：先让有源蜂鸣器“滴滴”响，再让无源蜂鸣器唱出两种音调。',
        tiles: [
          { title: '认识', sub: '有源 vs 无源' },
          { title: '接线', sub: 'S → 9 号脚' },
          { title: '代码', sub: '开关的快慢 = 音调' },
          { title: '结果', sub: '听出两种声音' }
        ]
      },
      {
        kind: 'figure', title: '认识蜂鸣器：有源和无源',
        desc: '“源”指的是内部振荡器，不是电源——有源通电就响，无源要 Arduino 替它打拍子。',
        img: [
          { src: 'img/l13/buzzer_active_module.jpg', caption: '有源蜂鸣器模块（黑色，S V G 三针）' },
          { src: 'img/l13/buzzer_passive_module.jpg', caption: '无源蜂鸣器模块（蓝色板，VCC I/O GND）' }
        ],
        side: `
<div class="table-wrap"><table class="table">
  <thead><tr><th></th><th>有源</th><th>无源</th></tr></thead>
  <tbody>
    <tr><td class="l">内部振荡器</td><td>有</td><td>没有</td></tr>
    <tr><td class="l">通电以后</td><td>直接响</td><td>不响，要喂方波（原指南：2～5 kHz）</td></tr>
    <tr><td class="l">音调</td><td>固定一种</td><td>随频率变，能“唱歌”</td></tr>
    <tr><td class="l">程序怎么写</td><td>HIGH 响，LOW 停</td><td>飞快地来回切换 HIGH / LOW</td></tr>
  </tbody>
</table></div>
${callout('question', '打个比方', '有源蜂鸣器像带节拍器的音乐盒，一通电就按固定音调响；无源蜂鸣器像一面鼓，要有人按节奏敲它才响，敲得快慢不同，音调就不同。')}`
      },
      {
        kind: 'wiring', title: '接线：S 接 9 号脚，两种蜂鸣器接法一样',
        desc: 'V 接 5V、G 接 GND、S 接 9 号脚——测完有源蜂鸣器，换上无源的，线一根都不用动。',
        img: 'img/l13/buzzer_wiring.jpg', caption: '原指南接线图：UNO 接有源蜂鸣器模块',
        tables: [
          { left: 'Arduino UNO R3', right: 'buzzer', rows: [['VCC', 'V'], ['GND', 'G'], ['9', 'S']] }
        ],
        note: '表里的 VCC 就是 UNO 上的 5V。模块三根针：标“−”的接 GND，中间接 5V，标“S”的接信号（数字口）。',
        side: `${callout('list', '组件清单', 'Arduino Uno 主板 · 面包板 · USB 数据线 · 有源蜂鸣器模块 ×1 · 无源蜂鸣器模块 ×1 · 若干跳线', 'gray')}`
      },
      {
        kind: 'code', title: '有源蜂鸣器代码：让它“滴——滴——”',
        desc: '9 号脚输出 HIGH 就响，输出 LOW 就停，各持续 1 秒，然后不停循环。',
        file: 'active_buzzer.ino', code: ACTIVE, from: 1, to: 13, hl: [9, 10, 11, 12],
        notes: [
          { line: 1, text: '给 9 号脚起名 <code>buzzer</code>，以后换引脚只改这里。' },
          { line: 5, text: '设为输出：Arduino 来发号施令。' },
          { line: [9, 10], text: '输出 HIGH：有源蜂鸣器通电就响，持续 1 秒（1000 毫秒）。' },
          { line: [11, 12], text: '输出 LOW：声音停，安静 1 秒后 loop() 从头再来。' }
        ],
        foot: callout('bulb', '眼熟吗？', '这段程序和最早的 Blink 闪灯几乎一模一样，只是把灯换成了蜂鸣器。')
      },
      {
        kind: 'lab', title: '动手实验室：有源蜂鸣器“滴——滴——”',
        desc: '先点蜂鸣器卡片上的“开启声音”（浏览器要求点一下才能出声），再点 ▶ 运行。',
        lab: {
          programs: [{ name: 'active_buzzer.ino', label: '有源蜂鸣器', code: ACTIVE }],
          parts: [
            { type: 'board' },
            { type: 'buzzer', pin: 9, kind: 'active', label: '有源蜂鸣器模块 S→D9' }
          ],
          tasks: [
            { text: '点“开启声音”后运行：每声响 1 秒、停 1 秒。看右下角“引脚”里 D9 怎么变。音调能变吗？' },
            { text: '把两个 <code>delay(1000)</code> 都改成 <code>delay(200)</code>：变成急促的“嘀嘀嘀”，像倒车雷达。', code: ACTIVE.replace(/delay\(1000\)/g, 'delay(200)') },
            { text: '做一个提示音：第 10 行改成 <code>delay(100)</code>（响 0.1 秒），第 12 行改成 <code>delay(900)</code>（停 0.9 秒）。', code: ACTIVE.replace('delay(1000);\n    digitalWrite(buzzer,LOW);\n    delay(1000);', 'delay(100);\n    digitalWrite(buzzer,LOW);\n    delay(900);') }
          ],
          smoke: [
            { expect: { freq: ['buzzer', 2300], audio: 0 }, timeout: 1500 },
            { expect: { part: ['buzzer', 'freq', '0'], pin: [9, 0] }, timeout: 2500 },
            { sound: true, expect: { audio: 1, text: ['.part[data-type=buzzer] .pbtn.sound', '声音：开'] } },
            { task: 2, run: true },
            { expect: { pin: [9, 1] }, timeout: 1000 },
            { expect: { pin: [9, 0] }, timeout: 1000 },
            { expect: { pin: [9, 1] }, timeout: 1000 }
          ]
        }
      },
      {
        kind: 'html', title: '声音的原理：开关越快，音调越高',
        desc: '每秒“开-关”多少次叫频率，单位赫兹（Hz）——像拨桌边的钢尺，振得越快，音调越高。',
        body: `
<div class="grid-2">
  <div class="card">
    <h3><span class="ico">${I('wave')}</span>同样 8 毫秒，开关的快慢不同</h3>
    <p><b>高 2 ms + 低 2 ms</b> = 周期 4 ms → <b>250 Hz</b>（低沉）</p>
    ${wave(2, '250 赫兹方波：8 毫秒里开关 2 次')}
    <p class="mt-s"><b>高 0.5 ms + 低 0.5 ms</b> = 周期 1 ms → <b>1000 Hz</b>（尖细）</p>
    ${wave(0.5, '1000 赫兹方波：8 毫秒里开关 8 次')}
    <p class="small muted">开关越快 → 周期越短 → 频率越高 → 音调越尖</p>
  </div>
  <div class="stack">
    <div class="card pale"><h3><span class="ico">${I('clock')}</span>一个公式</h3><p class="big center">频率 = 1000 ÷ 周期（毫秒） Hz</p><dl class="kv mt-s"><dt>周期 4 ms</dt><dd>1000 ÷ 4 = 250 Hz</dd><dt>周期 1 ms</dt><dd>1000 ÷ 1 = 1000 Hz</dd></dl></div>
    ${callout('question', '无源蜂鸣器为什么会响', '里面有一片薄膜：高电平吸一下，低电平弹回，一开一关就振动一次。每秒振动的次数就是频率。人耳大约能听到 20 Hz～20 kHz。')}
  </div>
</div>`
      },
      {
        kind: 'code', title: '无源蜂鸣器代码（1/2）：frequence_1() 想发 1 kHz',
        desc: '无源蜂鸣器要靠程序“打拍子”：开 0.5 毫秒、关 0.5 毫秒，重复 800 次——想法对，但写法有坑。',
        file: 'buzzer.ino', code: PASSIVE, from: 1, to: 13, hl: [3, 6, 9, 11],
        notes: [
          { line: [1, 2], text: '蜂鸣器还是接 9 号脚；第 2 行前面有 <code>//</code>，被注释掉了，不起作用。' },
          { line: 3, text: '高音函数，注释说要发 1 kHz。' },
          { line: 6, text: '重复 800 次“开-关”：次数决定响多久。' },
          { line: [8, 11], text: '开 0.5 + 关 0.5 毫秒 = 周期 1 毫秒（1 kHz）。但 <code>delay()</code> 只收整数毫秒，<b>0.5 被截成 0</b>！' }
        ],
        foot: `<div class="card warn"><h3><span class="ico red">${I('warn')}</span>delay(0.5) 其实是 delay(0)</h3><p>frequence_1() 几乎不等待，800 次开关几毫秒就做完，频率远高于 20 kHz，人耳听不到。要真正的 1 kHz，写 <code>delayMicroseconds(500)</code>。</p></div>`
      },
      {
        kind: 'code', title: '无源蜂鸣器代码（2/2）：低音函数和主程序',
        desc: 'frequence_2() 开 2 毫秒、关 2 毫秒，音调更低；loop() 让两种音调轮流播放。',
        file: 'buzzer.ino', code: PASSIVE, from: 15, to: 36, hl: [21, 23, 32, 34],
        notes: [
          { line: 15, text: '低音函数，注释写 250 Hz。' },
          { line: [20, 23], text: '高 2 ms + 低 2 ms = 周期 4 ms → <b>250 Hz</b>；800 个周期约 3.2 秒。' },
          { line: 28, text: '9 号脚设为输出。' },
          { line: [32, 35], text: '高音（实际听不到）→ 停 1 秒 → 低音 3.2 秒 → 停 1 秒，循环。' }
        ]
      },
      {
        kind: 'lab', title: '动手实验室：无源蜂鸣器的两种频率',
        desc: '接线不变，把有源蜂鸣器换成无源蜂鸣器。点“开启声音”后运行，盯住频率读数：先闪过“频率太高”，1 秒后变成约 250 Hz。',
        lab: {
          programs: [{ name: 'buzzer.ino', label: '无源蜂鸣器', code: PASSIVE }],
          parts: [
            { type: 'board' },
            { type: 'buzzer', pin: 9, kind: 'passive', label: '无源蜂鸣器模块 I/O→D9' }
          ],
          tasks: [
            { text: '运行后听一听、看一看：frequence_1 那一段读数显示什么？frequence_2 那一段是多少 Hz？' },
            { text: '把 frequence_1 里的两个 <code>delay(0.5)</code> 都改成 <code>delayMicroseconds(500)</code>：这才是真正的 1 kHz，比 250 Hz 尖得多。', code: PASSIVE.replace(/delay\(0\.5\)/g, 'delayMicroseconds(500)') },
            { text: '把 frequence_2 里的两个 <code>delay(2)</code> 都改成 <code>delay(1)</code>：周期 2 ms → 500 Hz，音调升高。', code: PASSIVE.replace(/delay\(2\)/g, 'delay(1)') },
            { text: '把第 18 行的 <code>800</code> 改成 <code>1600</code>：低音响的时间翻倍，3.2 秒 → 6.4 秒。', code: PASSIVE.replace(/(void frequence_2\(void\)[\s\S]*?)i<800/, '$1i<1600') }
          ],
          smoke: [
            { expect: { freq: ['buzzer', 'high'], read: ['buzzer', '超过 20 kHz'] }, timeout: 1500 },
            { expect: { freq: ['buzzer', 250, 0.04] }, timeout: 4000 },
            { task: 2, run: true },
            { expect: { freq: ['buzzer', 1000, 0.06] }, timeout: 3000 },
            { task: 3, run: true },
            { expect: { freq: ['buzzer', 500, 0.06] }, timeout: 5000 }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：一种“滴滴”声，两种蜂鸣声',
        desc: '原指南的两张实物照片和实验结论。',
        img: [
          { src: 'img/l13/buzzer_active_photo.jpg', caption: '有源蜂鸣器模块接 UNO（红灯是电源指示灯）' },
          { src: 'img/l13/buzzer_passive_photo.jpg', caption: '无源蜂鸣器插在面包板上，用跳线接 UNO' }
        ],
        side: `
${card('check', '有源蜂鸣器（原指南结论）', '<p>只发出一个频率的“滴滴”声。音调固定，适合做报警、提示音。</p>')}
${card('check', '无源蜂鸣器（原指南结论）', '<p>接线不变，直接用无源蜂鸣器替换；无源蜂鸣器没有正负极之分；可以听到两个频率不一样的蜂鸣声。</p><p class="small muted">实际上要把 delay(0.5) 改成 delayMicroseconds(500)，1 kHz 那一段才听得到。</p>')}`
      },
      {
        kind: 'html', title: '常见坑：delay(0.5) 其实是 delay(0)',
        desc: 'delay() 只认整数毫秒；要等不到 1 毫秒，就用 delayMicroseconds()。',
        body: `
<div class="grid-2">
  <div class="card warn"><h3><span class="ico red">${I('error')}</span>原指南写法</h3>${snip('delay(0.5);   // 被截成 delay(0)')}<p>0.5 变成 0，几乎不等待。800 次开关一眨眼就做完，频率远高于 1 kHz，人耳基本听不到。</p></div>
  <div class="card ok"><h3><span class="ico">${I('check')}</span>改成这样</h3>${snip('delayMicroseconds(500);  // 0.5 毫秒')}<p>按微秒计时：500 微秒 = 0.5 毫秒。开 0.5 + 关 0.5 = 1 毫秒 → 正好 1 kHz，800 次约 0.8 秒。</p></div>
</div>
<div class="grid-3 mt">
  ${tile('1 秒', '= 1000 毫秒', 'delay() 的单位是毫秒', 'turq')}
  ${tile('1 毫秒', '= 1000 微秒', 'delayMicroseconds() 的单位是微秒')}
  ${tile('20 kHz', '人耳的上限', '再快的翻转就听不到了', 'dark')}
</div>
<div class="mt">${callout('bulb', '进阶预告：tone()', 'Arduino 自带发声函数 <code>tone(buzzer, 262, 500);</code>：262 Hz（中音 do）响 500 毫秒，不用自己写循环。')}</div>`
      },

      // ================================================================ 实验 05　小磁簧开关模块
      {
        kind: 'section', no: '实验 05', title: '小磁簧开关模块实验',
        desc: '用一块磁铁当“钥匙”：磁铁靠近，灯亮、蜂鸣器响；磁铁拿开，全部停下。新学 digitalRead() 读开关的 0 / 1，再用 if / else 做判断。',
        tiles: [
          { title: '认识元件', sub: '磁铁靠近就接通' },
          { title: '接线', sub: '三个模块 · 三张表' },
          { title: '代码', sub: 'digitalRead · if / else' },
          { title: '结果', sub: '看灯、听声、读串口' }
        ]
      },
      {
        kind: 'figure', title: '认识小磁簧开关：用磁铁“隔空按”的开关',
        desc: '普通按键要用手指按；磁簧开关不用碰它，磁铁一靠近，它自己就接通了。',
        img: 'img/l13/reed_module_photo.jpg', caption: '小磁簧开关模块：玻璃管里就是两片簧片',
        side: `
<div class="card">
  <h3><span class="ico">${I('target')}</span>工作过程</h3>
  <ol class="steps">
    <li>玻璃管里封着两片铁镍簧片，中间只隔几微米的缝。</li>
    <li>平时两片不接触，电路断开——这叫<b>常开</b>。</li>
    <li>磁铁靠近：簧片被磁化、互相吸住 → 接通。</li>
    <li>磁铁移开：簧片靠自身弹力弹开 → 断开。</li>
  </ol>
</div>
${callout('book', '小知识', '管内充有惰性气体（如氮气），触点镀了很硬的铑、钌，开关次数更多、寿命更长。门窗报警、笔记本合盖熄屏、自行车码表都用到它。', 'gray')}
${callout('warn', '', '玻璃管很脆，不要用力掰它的引线。', 'note')}`
      },
      {
        kind: 'html', title: '原理：有磁铁读到 0，没磁铁读到 1',
        desc: '模块里有一个上拉电阻：簧片断开时 OUT 是高电平（1）；簧片吸合时 OUT 接到 GND（0）。',
        body: `
<div class="grid-2">
  <div class="stack">
    ${callout('flag', '实验目的', '① 学习磁簧开关的特性和工作原理；② 使用小磁簧开关控制 LED 灯的亮灭。')}
    ${callout('book', '实验原理（原指南）', '没有磁铁时开关断开；磁铁等产生磁感线的物体靠近时，开关导通——LED 灯亮起来，蜂鸣器响。', 'gray')}
    ${callout('list', '组件清单', 'Arduino UNO R3 主板 · 面包板 · USB 数据线 · 小磁簧开关模块 ×1 · LED ×1 · 有源蜂鸣器 ×1 · 若干跳线 · 另备一块小磁铁', 'gray')}
  </div>
  <div class="card">
    <h3><span class="ico">${I('chip')}</span>为什么“有磁铁”反而是 0？</h3>
    <p>上拉电阻像一根弹簧，平时把 OUT 往 5V 拉；簧片一吸合，OUT 直接连到 GND，被“按”到 0V。</p>
    <div class="table-wrap mt-s"><table class="table">
      <thead><tr><th>磁铁</th><th>簧片</th><th>OUT 电平</th><th>digitalRead</th></tr></thead>
      <tbody><tr><td>远离</td><td>断开</td><td>高（约 5V）</td><td><b>1</b></td></tr><tr class="hl"><td>靠近</td><td>吸合</td><td>低（约 0V）</td><td><b>0</b></td></tr></tbody>
    </table></div>
    <p class="small mt-s">记住“低电平有效”：有磁铁 = 0，所以程序里写 <code>if(val==0)</code>。</p>
  </div>
</div>
<div class="flow mt">
  <div><b>磁铁靠近</b><br>磁感线穿过玻璃管</div>
  <div><b>簧片吸合</b><br>OUT 连到 GND</div>
  <div><b>读到 0</b><br><code>digitalRead(12)</code></div>
  <div class="on"><b>灯亮 + 响</b><br>11、13 号脚输出 HIGH</div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：开关进 12，LED 接 11，蜂鸣器接 13',
        desc: '照原指南三张表接线；所有模块的 GND 都接 UNO 的 GND（板上有好几个 GND 口，哪个都可以）。',
        img: 'img/l13/reed_wiring.jpg', caption: '原指南接线图：上 RGB 灯模块 · 中 小磁簧开关 · 下 有源蜂鸣器',
        tables: [
          { left: 'Arduino UNO', right: '小磁簧开关', rows: [['5V', 'VCC（R）'], ['GND', 'GND(G)'], ['12', 'OUT(Y)']] },
          { left: 'Arduino UNO', right: 'LED 模块', rows: [['11', '+'], ['GND', '—']] },
          { left: 'Arduino UNO', right: '有源蜂鸣器', rows: [['13', '+'], ['GND', '—']] }
        ],
        note: '模块上印的 S 就是 OUT，中间脚是 VCC，− 是 GND；R、Y 对应图里的红线、黄线。图中用 RGB 灯模块当 LED 模块，11 接它的 R 脚，所以亮红灯。'
      },
      {
        kind: 'html', title: '新语法：digitalRead()、if / else 与 ==',
        desc: 'digitalRead() 问开关“通了没有”；if / else 是岔路口；比较相等要写两个等号。',
        body: `
<div class="grid-3">
  ${card('hand', 'digitalRead(引脚)', `<p>像问开关一句：“你现在通了没有？”它只回答 1（高电平）或 0（低电平）。</p>${snip('pinMode(12, INPUT);     // 当“耳朵”\nval = digitalRead(12);  // 0 或 1')}<p class="small muted">analogRead() 回答“有多少”（0～1023），digitalRead() 回答“有没有”。</p>`)}
  ${card('flag', 'if / else = 岔路口', `<p>路牌上写着条件：成立走左边，不成立走右边，两条路只走一条。</p>${snip('if (条件) {\n  // 成立：做这里\n} else {\n  // 不成立：做这里\n}')}`)}
  <div class="card warn"><h3><span class="ico red">${I('warn')}</span>== 和 = 不一样</h3>${snip('if(val==0)   // 比较：val 等于 0 吗？\nif(val=0)    // 赋值：把 0 放进 val！')}<p>写成 <code>if(val=0)</code> 也能编译通过，但条件永远不成立，灯永远不亮。实验室里可以故意试一次。</p></div>
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：准备工作',
        desc: '先准备四个“盒子”记住引脚号和读数，再在 setup() 里告诉 Arduino 谁是输入、谁是输出。',
        file: 'reed_switch.ino', code: REED, from: 1, to: 11, hl: [1, 2, 3, 9],
        notes: [
          { line: [1, 3], text: '给三个引脚起名字：LED 11、蜂鸣器 13、磁簧开关 12。' },
          { line: 4, text: '<code>val</code>：装读数的盒子，先放一个 0。' },
          { line: [7, 8], text: 'LED、蜂鸣器设为输出：Arduino 去“说”。' },
          { line: 9, text: '磁簧开关设为输入：Arduino 去“听”。' },
          { line: 10, text: '打开串口，速度 9600。' }
        ],
        foot: callout('bulb', '起名字的好处', '换引脚时只改第 1–3 行，下面的代码一字不动。')
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：读、打印、判断',
        desc: 'loop() 不停地重复三件事：读开关、把读数打印出来、按读数决定灯和蜂鸣器开还是关。',
        file: 'reed_switch.ino', code: REED, from: 12, to: 26, hl: [14, 15, 16],
        notes: [
          { line: 14, text: '读 12 号脚，存进 <code>val</code>：有磁铁是 0，没有磁铁是 1。' },
          { line: 15, text: '把 val 打印到串口，一行一个数。' },
          { line: 16, text: '岔路口：val 等于 0 吗？（<code>==</code> 是比较）' },
          { line: [18, 19], text: '成立（有磁铁）：LED 亮、蜂鸣器响。' },
          { line: [21, 24], text: '否则（val 是 1，没有磁铁）：LED 灭、蜂鸣器停。' },
          { line: 26, text: 'loop() 结束，马上回到第 12 行再来一遍——没有 delay，一秒转几百圈，所以磁铁一靠近灯几乎同时就亮。' }
        ]
      },
      {
        kind: 'lab', title: '动手实验室：磁铁一靠近，灯亮、蜂鸣器响',
        desc: '点 ▶ 运行，把磁铁拖近小磁簧开关（小于 1.5 cm 吸合），再拖远。想听声音，先点蜂鸣器卡片上的“开启声音”。',
        lab: {
          programs: [{ name: 'reed_switch.ino', label: '磁簧开关程序', code: REED }],
          parts: [
            { type: 'board' },
            { type: 'reed', pin: 12, distanceCm: 4, label: '小磁簧开关 OUT(S)→D12' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED 模块 +→D11' },
            { type: 'buzzer', pin: 13, kind: 'active', label: '有源蜂鸣器 +→D13' }
          ],
          baud: 9600,
          tasks: [
            { text: '把磁铁拖近：串口从 1 变成 0，LED 亮、蜂鸣器响（13 号脚——板上的 L 灯也跟着亮）；拖远就全部停下。' },
            { text: '串口刷得太快？在 loop() 最后加一行 <code>delay(200);</code>，每秒只打印 5 个数。', code: REED_DELAY },
            { text: '门磁报警器：把第 16 行改成 <code>if(val==1)</code>——门关着时磁铁贴着开关（安静），门一打开磁铁离开就报警。', code: REED.replace('if(val==0)', 'if(val==1)') },
            { text: '“滴滴”提醒声：在第 19 行后面加上 <code>delay(100); digitalWrite(Buzzer_pin,LOW); delay(100);</code>，磁铁靠近时蜂鸣器“滴滴滴”。', code: REED_BEEP },
            { text: '故意把第 16 行写成 <code>if(val=0)</code>（少一个等号）：能运行，但磁铁靠近灯也不亮——看看编辑器给的提示。', code: REED.replace('if(val==0)', 'if(val=0)') }
          ],
          smoke: [
            { expect: { var: ['val', 1], pin: [11, 0], serialRe: '(^|\\n)1\\n' } },
            { slider: 'reed', value: 0.8 },
            { expect: { var: ['val', 0], pin: [11, 1], freq: ['buzzer', 2300], serialRe: '(^|\\n)0\\n' } },
            { expect: { pin: [13, 1] } },
            { slider: 'reed', value: 5 },
            { expect: { var: ['val', 1], pin: [11, 0], part: ['buzzer', 'freq', '0'] } },
            { task: 3, run: true },
            { expect: { var: ['val', 1], pin: [11, 1] } },
            { slider: 'reed', value: 0.8 },
            { expect: { var: ['val', 0], pin: [11, 0] } }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：磁铁靠近，灯亮、蜂鸣器响',
        desc: '原指南：用一个磁铁靠近小磁簧开关，会使得小磁簧开关输出低电平，从而点亮 LED 灯，蜂鸣器响。',
        img: 'img/l13/reed_result_photo.jpg', caption: '原指南实物照片：磁铁靠近磁簧开关，RGB 灯亮红光',
        side: `
<div class="card">
  <h3><span class="ico">${I('send')}</span>串口监视器里（示意）</h3>
  <dl class="kv"><dt class="mono">1 1 1</dt><dd>没有磁铁：灯灭、不响</dd><dt class="mono">0 0 0</dt><dd>磁铁靠近：灯亮、响</dd><dt class="mono">1 1 1</dt><dd>磁铁拿开：全部停下</dd></dl>
</div>
${callout('eye', '三样一起看', '拿磁铁慢慢靠近再拿开：灯、蜂鸣器和串口里的数字应该同步变化。')}`
      },
      {
        kind: 'figure', title: '更方便的接法：Sensor V5.0 扩展板',
        desc: '原指南：如果你的套件中有 Sensor V5.0 的扩展板，按照下图接线，更加方便。',
        img: 'img/l13/reed_shield_photo.jpg', caption: '原指南：扩展板接法（蜂鸣器、磁簧开关、RGB 模块用杜邦线接到扩展板）',
        side: `
<div class="grid-3">
  ${tile('GVS', '三针一排', '每个数字脚旁都有 G、V、S', 'turq')}
  ${tile('插', '直接插', '杜邦线直插，不用面包板')}
  ${tile('不改', '程序不用改', '引脚号还是 13、12、11', 'dark')}
</div>
${card('plug', '对准排针', '<p>磁簧开关：G 接 −，V 接中间脚，S 接 S。</p><p>LED、蜂鸣器：+ 接 S，− 接 G。</p>')}`
      },
      {
        kind: 'html', title: '常见问题：先看串口，再查接线',
        desc: '串口里的 0 / 1 会告诉你问题出在输入还是输出：数字会变 → 查灯和蜂鸣器；数字不变 → 查磁簧开关。',
        body: `
<div class="grid-2">
  ${card('warn', '磁铁靠近没反应', '<p>OUT 接在 12 号脚了吗？磁铁要贴近玻璃管、顺着管子方向放，离远了吸不动。</p>', 'warn')}
  ${card('warn', '一直亮、一直响', '<p>串口一直是 0？先查模块中间脚有没有接 5V，再看旁边有没有别的磁铁，最后核对程序里的引脚号。</p>', 'warn')}
  ${card('warn', '读数乱跳、灯忽亮忽灭', '<p>12 号脚的信号线没插牢时，引脚“悬空”，读数会乱跳。把信号线重新插紧就好。</p>', 'warn')}
  ${card('warn', '串口乱码、刷屏太快', '<p>波特率选 9600，和程序一致。嫌刷得太快，可在 loop() 末尾临时加一句 <code>delay(200);</code>。</p>', 'warn')}
</div>`
      },

      // ================================================================ 小结
      {
        kind: 'summary', kicker: '1-3 传感器与声光输出　/　小结', title: '本课小结',
        desc: '五个实验一条主线：传感器把变化变成电压或开关信号 → Arduino 读进来 → 用引脚控制灯光和声音。',
        items: [
          { title: 'AD 模数转换', text: '<code>analogRead()</code> 读到 0～1023；读数 ÷ 1023 × 5 就是电压。' },
          { title: '光敏电阻', text: '光越强电阻越小；<code>analogWrite()</code> 只认 0～255，用 <code>map()</code> 换算不越界。' },
          { title: 'LED 流水灯', text: '正极接 5V 时 LOW 才亮；数组 + for + 函数，批量控制 8 盏灯。' },
          { title: '蜂鸣器', text: '有源 HIGH 就响；无源靠翻转出声，开关越快音调越高。' },
          { title: '小磁簧开关', text: '有磁铁读到 0；<code>if / else</code> 做判断，相等要写 <code>==</code>。' }
        ],
        body: `
<div class="grid-3">
  ${card('eye', '读进来', '<p><code>analogRead()</code> 0～1023 · <code>digitalRead()</code> 0 / 1，看不见的数值打印到串口看。</p>')}
  ${card('bolt', '送出去', '<p><code>digitalWrite()</code> HIGH / LOW · <code>analogWrite()</code> 0～255，切换得飞快就成了声音。</p>', 'dark')}
  ${card('warn', '小心这几个坑', '<p>先 <code>(float)</code> 再除，小数才不丢；数组从 [0] 开始；比较要写 <code>==</code>；<code>delay()</code> 只认整数毫秒。</p>', 'warn')}
</div>`
      },
      { kind: 'end', title: '本课结束', subtitle: '感知世界，再用灯光和声音回应。\n五个实验走完了一条完整的链：读进来 → 判断 → 送出去。' }
    ]
  });
})();
