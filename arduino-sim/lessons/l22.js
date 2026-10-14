/* lessons/l22.js — 2-2 测距、通信与环境感知
   Guide: arduino-ppt/assets/l22/guide_text.md (PDF 21 页). Four experiments in the guide's order:
     ① 超声波模块实验 ② 串口调节舵机角度实验 ③ 红外避障模块实验 ④ 温湿度传感器模块实验
   Explanations, analogies, pitfalls and 动手改一改 ideas are ported from arduino-ppt/build/22_lesson_2-2.js.
   Programs are copied verbatim from the guide's cpp blocks (generated, do not retype them).
   ① and ③ are blank in the PDF; their programs come from the same kit's 《Arduino 编程入门学习教程》 2.38 / 2.25.
   mBlock / Mixly parts of the guide are intentionally left out.
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- programs copied verbatim from arduino-ppt/assets/l22/guide_text.md (in the guide's order)
  const ULTRA = `
const int TrigPin = 2;
const int EchoPin = 3;
float distance;
void setup()
{
  Serial.begin(9600);
  pinMode(TrigPin, OUTPUT);
  pinMode(EchoPin, INPUT);
  Serial.println("Ultrasonic sensor:");
}
void loop()
{
  digitalWrite(TrigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(TrigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(TrigPin, LOW);
  distance = pulseIn(EchoPin, HIGH) / 58.00;
  Serial.print("distance is :");
  Serial.print(distance);
  Serial.print("cm");
  Serial.println();
  delay(1000);
}
`;
  const SERVO = `
#include <Servo.h>
Servo myservo;
int ServoPin = 13;
char inByte = 0;
int angle = 0;
String temp = "";//Temporary character variables, or use it for the cache
void setup()
{
  Serial.begin(9600); //Set the baud rate
  pinMode(ServoPin, OUTPUT);
  myservo.attach(ServoPin);
}
void loop()
{
  while (Serial.available() > 0) //Determine whether the serial data
  {
    inByte = Serial.read();//Read data, the serial port can only read 1 character
    temp += inByte;//The characters read into temporary variables inside the cache, Continue to determine the serial port there is no data, know all the data read out
  }

  if (temp != "")// Determine whether the temporary variable is empty
  {
    angle = temp.toInt();    //Convert variable string type to integer
    Serial.print("Servo degree: ");
    Serial.println(angle);
    //Control the servo to rotate the corresponding angle.
  }
  temp = "";//Please see temporary variables
  myservo.write(angle);
  delay(100);//Delayed 100 milliseconds

}
`;
  const IR = `
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
  const DHT = `
#include <Wire.h>
#include"dht11.h"
#include "LiquidCrystal_I2C.h"

#define    DHT11PIN     8
dht11 DHT11;
LiquidCrystal_I2C lcd(0x27, 16, 2);// 0x27 is the I2C bus address for an unmodified backpack
void setup() {
  pinMode(DHT11PIN, OUTPUT);
  lcd.init();
  lcd.backlight();
  Serial.begin(9600);
}

void loop() {
  int chk = DHT11.read(DHT11PIN);
  lcd.setCursor(0, 0);
  lcd.print("Tep: ");
  lcd.print((float)DHT11.temperature, 2);
  lcd.print("C");
  lcd.setCursor(0, 1);
  lcd.print("Hum: ");
  lcd.print((float)DHT11.humidity, 2);
  lcd.print("%");
  delay(200);
}
`;

  // ---- variants (built from the originals so they stay in sync)
  // ① ultrasonic
  const ULTRA_HALF = ULTRA.replace('/ 58.00;', '/ 29.00;');
  const ULTRA_RADAR = ULTRA
    .replace('  pinMode(EchoPin, INPUT);\n', '  pinMode(EchoPin, INPUT);\n  pinMode(13, OUTPUT);\n')
    .replace('  delay(1000);\n', '  if (distance < 10)\n    digitalWrite(13, HIGH);\n  else\n    digitalWrite(13, LOW);\n  delay(1000);\n');
  const ULTRA_FAST = ULTRA_RADAR.replace('  delay(1000);\n', '  delay(200);\n');
  // ② serial servo: the PDF wrapped the comment of `temp += inByte;` (line 18) onto a second line.
  //    Copied as printed, that second line is not a comment → compile error on line 19.
  const SERVO_ORIG = SERVO.replace('inside the cache, Continue', 'inside the cache,\nContinue');
  const SERVO_LIMIT = SERVO.replace('    angle = temp.toInt();    //Convert variable string type to integer\n',
    '    angle = temp.toInt();    //Convert variable string type to integer\n    angle = constrain(angle, 0, 180);\n');
  // ③ IR obstacle
  const IR_ALARM = IR.replace('if(val==0)', 'if(val==1)');
  const IR_SLOW = IR.replace(/  \}\n\}\n$/, '  }\n  delay(200);\n}\n');
  // ④ DHT11 + LCD
  const DHT_SLOW = DHT.replace('  delay(200);\n', '  delay(2000);\n');
  const DHT_SERIAL = DHT.replace('  delay(200);\n', '  Serial.println(DHT11.humidity);\n  delay(200);\n');
  const DHT_3F = DHT.replace('lcd(0x27, 16, 2)', 'lcd(0x3F, 16, 2)');

  // ---- small markup helpers (strings only)
  const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const strip = s => String(s).replace(/<[^>]*>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  const snip = code => `<pre class="snippet"><code>${escH(code)}</code></pre>`;
  const card = (ic, title, body, cls) => `<div class="card${cls ? ' ' + cls : ''}"><h3><span class="ico${cls === 'warn' ? ' red' : ''}">${I(ic)}</span>${title}</h3>${body}</div>`;
  const warn = (title, body) => card('warn', title, `<p>${body}</p>`, 'warn');
  const callout = (ic, title, text, cls) => `<div class="callout${cls ? ' ' + cls : ''}"><span class="ico">${I(ic)}</span><div>${title ? `<b>${title}</b>` : ''}<p>${text}</p></div></div>`;
  const mistake = text => `<div class="callout warn mt-s"><span class="ico">${I('error')}</span><div><b>常见错误</b><p>${text}</p></div></div>`;
  const fig = (file, cap) => `<figure class="figure"><img src="img/l22/${file}" alt="${escH(strip(cap)).replace(/"/g, '&quot;')}"><figcaption>${cap}</figcaption></figure>`;
  const chips = list => `<div class="chips mt-s">${list.map(c => `<code>${c}</code>`).join('')}</div>`;
  const table = (head, rows, cls) => `<div class="table-wrap"><table class="table${cls ? ' ' + cls : ''}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map(r => `<tr${r.hl ? ' class="hl"' : ''}>${(r.cells || r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  // ---- small drawings (inline SVG, theme colours via CSS variables)
  // ① sound goes to the obstacle and back
  const echoSvg = `<svg viewBox="0 0 380 140" width="100%" role="img" aria-label="超声波从模块出发，碰到障碍物后反射回来">
  <rect x="8" y="26" width="62" height="84" rx="7" fill="var(--char)" stroke="var(--muted)"/>
  <circle cx="39" cy="48" r="15" fill="var(--turq)"/><circle cx="39" cy="88" r="15" fill="var(--turq)"/>
  <text x="39" y="53" font-size="13" font-weight="600" text-anchor="middle" fill="#2D2D2D">发</text>
  <text x="39" y="93" font-size="13" font-weight="600" text-anchor="middle" fill="#2D2D2D">收</text>
  <text x="39" y="128" font-size="11" text-anchor="middle" fill="var(--muted)">超声波模块</text>
  <rect x="338" y="18" width="18" height="100" rx="2" fill="var(--gray1)" stroke="var(--muted)"/>
  <text x="347" y="132" font-size="11" text-anchor="middle" fill="var(--muted)">障碍物</text>
  <line x1="78" y1="48" x2="322" y2="48" stroke="var(--turq-deep)" stroke-width="3"/>
  <path d="M332 48 L320 42 L320 54 Z" fill="var(--turq-deep)"/>
  <line x1="330" y1="88" x2="88" y2="88" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/>
  <path d="M78 88 L90 82 L90 94 Z" fill="currentColor"/>
  <text x="205" y="37" font-size="14" font-weight="600" text-anchor="middle" fill="currentColor">① 发出超声波（去）</text>
  <text x="205" y="110" font-size="14" font-weight="600" text-anchor="middle" fill="currentColor">② 碰到障碍物反射回来（回）</text>
  <text x="205" y="70" font-size="13" text-anchor="middle" fill="var(--muted)">来回一共走了 2 × s，用时 t</text>
</svg>`;
  // ② servo dial: 0° points left, 90° up, 180° right (as in the guide's picture)
  const dial = (deg, label) => {
    const a = deg * Math.PI / 180, x = 40 - 26 * Math.cos(a), y = 44 - 26 * Math.sin(a);
    return `<div class="center"><svg viewBox="0 0 80 64" width="68" height="54" role="img" aria-label="${label}：舵机转到 ${deg} 度">` +
      `<path d="M8 44 A32 32 0 0 1 72 44" fill="none" stroke="var(--line)" stroke-width="5"/>` +
      `<line x1="40" y1="44" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--turq-deep)" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="40" cy="44" r="4.5" fill="currentColor"/><text x="40" y="61" font-size="10" text-anchor="middle" fill="var(--muted)">${deg}°</text></svg>` +
      `<div class="small"><b>${label}</b></div></div>`;
  };
  // ④ DHT11 bits: 50 µs low, then a short (0) or long (1) high level
  const bitsSvg = (() => {
    const bits = [0, 1, 1, 0], k = 1, x0 = 8, hi = 10, lo = 46;
    let t = 0, d = `M${x0} ${hi} H${x0 + 12 * k} V${lo}`, marks = '';
    t = 12;
    bits.forEach(b => {
      t += 50; d += ` H${x0 + t * k} V${hi}`;
      const w = b ? 70 : 27, xs = x0 + t * k;
      marks += `<rect x="${xs}" y="${hi}" width="${w * k}" height="${lo - hi}" fill="${b ? 'var(--turq)' : 'var(--gray1)'}"/>` +
        `<text x="${xs + w * k / 2}" y="${lo + 20}" font-size="15" font-weight="600" text-anchor="middle" fill="currentColor">${b ? '1 长' : '0 短'}</text>`;
      t += w; d += ` H${x0 + t * k} V${lo}`;
    });
    d += ` H${x0 + (t + 12) * k}`;
    const W = x0 * 2 + (t + 12) * k;
    return `<svg viewBox="0 0 ${W.toFixed(0)} 72" width="100%" role="img" aria-label="依次发出 0、1、1、0：高电平短是 0，长是 1">${marks}` +
      `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  })();
  // ④ LCD1602 as a 16 × 2 grid of cells (column 0 highlighted), optional column / row numbers
  const lcdSvg = (rows, numbers) => {
    const cw = 22, chh = 30, ox = numbers ? 22 : 4, oy = numbers ? 18 : 4;
    let s = '';
    if (numbers) {
      for (let c = 0; c < 16; c++) s += `<text x="${ox + c * cw + cw / 2}" y="12" font-size="10" text-anchor="middle" fill="var(--muted)">${c}</text>`;
      for (let r = 0; r < 2; r++) s += `<text x="9" y="${oy + r * chh + chh / 2 + 4}" font-size="10" text-anchor="middle" fill="var(--muted)">${r}</text>`;
    }
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 16; c++) {
        const ch = rows[r][c] || ' ';
        s += `<rect x="${ox + c * cw}" y="${oy + r * chh}" width="${cw}" height="${chh}" fill="${c === 0 && numbers ? 'var(--turq)' : 'var(--surface)'}" stroke="var(--line)"/>`;
        if (ch !== ' ') s += `<text x="${ox + c * cw + cw / 2}" y="${oy + r * chh + 20}" font-size="15" font-weight="600" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" fill="${c === 0 && numbers ? '#2D2D2D' : 'currentColor'}">${escH(ch)}</text>`;
      }
    }
    return `<svg viewBox="0 0 ${ox + 16 * cw + 4} ${oy + 2 * chh + 4}" width="100%" role="img" aria-label="LCD1602：${escH(rows[0].trim())} / ${escH(rows[1].trim())}">${s}</svg>`;
  };

  SIM.deck.register({
    id: 'l22', no: '2-2', title: '测距、通信与环境感知',
    subtitle: '超声波 · 串口调节舵机 · 红外避障 · 温湿度传感器',
    slides: [
      {
        kind: 'cover', title: '测距、通信与环境感知',
        subtitle: '超声波 · 串口调节舵机 · 红外避障 · 温湿度传感器\n传感器不只会“感觉”，还会“测量”，还会和 Arduino“说话”'
      },
      {
        kind: 'html', kicker: '2-2 测距、通信与环境感知', title: '本节导览',
        desc: '四个实验，按指南顺序：每个实验都是 原理和接线 → 代码逐行看懂 → 动手实验室。',
        body: `
<div class="grid-4 stretch">
  ${card('wave', '实验 01　超声波模块', `<p>像蝙蝠一样听回声，算出前方有多远。</p>${chips(['const', 'pulseIn()', '÷ 58'])}`, 'pale')}
  ${card('send', '实验 02　串口调节舵机', `<p>在电脑上输入角度，舵机就转过去。</p>${chips(['available()', 'read()', 'toInt()'])}`)}
  ${card('eye', '实验 03　红外避障模块', `<p>前面有东西，就亮灯、报警。</p>${chips(['digitalRead()', 'if / else'])}`)}
  ${card('sun', '实验 04　温湿度传感器', `<p>读出温度和湿度，显示在 LCD 屏上。</p>${chips(['#include', '对象.成员'])}`)}
</div>
<div class="flow mt">
  <div class="on"><b>测时间 → 算距离</b><br>回声的微秒数 ÷ 58</div>
  <div><b>读字符 → 拼数字</b><br>"1" "8" "0" → 180</div>
  <div><b>读高低 → 做判断</b><br>读到 0 = 有障碍物</div>
  <div><b>按时序 → 收数据</b><br>一根线传 40 位</div>
</div>
<div class="grid-2 mt">
  ${callout('question', '开场猜一猜', 'Arduino 怎么知道手离它有多远？怎么知道空气有多潮？带着这两个问题往下看。')}
  ${callout('flag', '每个实验的中心是“动手实验室”', '运行指南里的真实程序，拖障碍物、发串口、拧旋钮、调温湿度，再按任务卡改代码。', 'gray')}
</div>`
      },

      // ================================================================ 实验 01　超声波模块
      {
        kind: 'section', no: '实验 01', title: '超声波模块实验',
        desc: '超声波模块会“喊一声、听回声”：测出声音来回用了多少时间，就能算出前方物体有多远。顺带学会三个新词：<code>const</code>、<code>delayMicroseconds()</code> 和 <code>pulseIn()</code>。',
        tiles: [
          { title: '原理', sub: '回声 · s = 340 × t ÷ 2' },
          { title: '接线', sub: 'Trig → 2，Echo → 3' },
          { title: '代码', sub: 'pulseIn() · ÷ 58' },
          { title: '结果', sub: '串口里看距离' }
        ]
      },
      {
        kind: 'figure', title: '认识超声波模块：像蝙蝠一样“听回声”',
        desc: '模块一边“喊”（发出超声波），一边“听”（接收回声），用声音来回的时间算出距离。',
        img: 'img/l22/ultra_result_photo.jpg', caption: '原指南实验照片：右边带两只“眼睛”的就是超声波模块，一只发射、一只接收',
        side: `
${callout('question', '打个比方', '蝙蝠在黑暗里飞行时会发出超声波，听回声就知道前面有没有障碍物。对着山谷喊一声，回声越晚回来，山就越远。')}
<div class="card">
  <h3><span class="ico">${I('eye')}</span>模块怎么测</h3>
  <ol class="steps">
    <li>发射器发出超声波，同时开始计时。</li>
    <li>超声波碰到障碍物，立刻反射回来。</li>
    <li>接收器听到回声，停止计时，得到时间 t。</li>
  </ol>
</div>
${callout('target', '实验目的', '通过串口<b>显示</b>测到的距离。原指南写成了“通过串口输入”，应为“输出”。', 'note')}`
      },
      {
        kind: 'html', title: '测距原理：距离 = 340 × t ÷ 2',
        desc: '声音跑了一个来回，所以路程要除以 2；换成厘米和微秒，就是“回波时间 ÷ 58”。',
        body: `
<div class="grid-2">
  <div class="card"><h3><span class="ico">${I('wave')}</span>声音走了一个来回</h3>${echoSvg}</div>
  <div class="card pale">
    <h3><span class="ico">${I('book')}</span>原指南的公式</h3>
    <div class="big center">s = 340 m/s × t ÷ 2</div>
    <dl class="kv mt-s"><dt>s</dt><dd>模块到障碍物的距离（米）</dd><dt>340</dt><dd>空气中的声速（米/秒）</dd><dt>t</dt><dd>声音来回的时间（秒）</dd><dt>÷ 2</dt><dd>来回两趟，只要单程</dd></dl>
  </div>
</div>
<h3 class="mt">为什么程序里写的是 ÷ 58？</h3>
<div class="flow">
  <div><b>① 声速换个单位</b><br>340 m/s = 0.034 cm/µs</div>
  <div><b>② 来回 1 cm 要走 2 cm</b><br>2 ÷ 0.034 ≈ 58 µs</div>
  <div class="on"><b>③ 所以</b><br>距离(cm) = t(µs) ÷ 58</div>
</div>
<div class="mt">${callout('check', '算一算', '回波时间 580 µs 是多远？580 ÷ 58 = <b>10 cm</b>。')}</div>`
      },
      {
        kind: 'figure', title: '时序图：Trig 喊一声，Echo 报时间',
        desc: 'Trig 给至少 10µs 高电平 → 模块自动发出 8 个 40kHz 超声波脉冲 → Echo 高电平持续多久，声音就来回了多久。',
        img: 'img/l22/ultra_timing.jpg', caption: '原指南时序图：Trig 引脚 / 超声波发射器 / Echo 引脚，横轴是时间',
        side: `
<div class="card">
  <h3><span class="ico">${I('list')}</span>从上往下读</h3>
  <ol class="steps">
    <li><b>Trig pin</b>：Arduino 给 ≥10µs 高电平，等于说“测一次”。</li>
    <li><b>Ultrasonic Sender</b>：模块自己发出 8 个 40kHz 超声波脉冲。人耳最多听到约 20kHz，所以听不见。</li>
    <li><b>Echo Pin</b>：高电平持续的时间 = 声音来回的时间 t。</li>
  </ol>
</div>
${callout('clock', '<code>pulseIn()</code> 是一块秒表', '量出第三行 Echo 高电平有多长（微秒）。程序只要做两件事：“喊”和“量”。')}`
      },
      {
        kind: 'wiring', title: '接线：Trig 接 2，Echo 接 3',
        desc: '只要四根线：VCC 接 5V、GND 接 GND；Trig 是 Arduino 发出的命令，Echo 是模块送回的结果。',
        img: 'img/l22/ultra_wiring.jpg', caption: '原指南接线图',
        tables: [{ left: 'Arduino Uno', right: 'Ultrasonic', rows: [['VCC', '1 (Vcc)'], ['2', '2 (Trig)'], ['3', '3 (Echo)'], ['GND', '4 (Gnd)']] }],
        note: '表里 Arduino 一侧的 VCC 就是 UNO 上的 5V 口。接线前先拔掉 USB。',
        side: `
<div class="grid-2">
  <div class="card pale"><h3><span class="ico">${I('send')}</span>Trig ← 2 号脚</h3><p><code>OUTPUT</code>：Arduino 发出“测一次”的命令。</p></div>
  <div class="card dark"><h3><span class="ico">${I('load')}</span>Echo → 3 号脚</h3><p><code>INPUT</code>：模块把测量结果送回来。</p></div>
</div>
${callout('list', '组件清单', 'Arduino UNO R3 主板 · 面包板 · USB 数据线 · 超声波模块 ×1 · 若干跳线', 'gray')}`
      },
      {
        kind: 'html', title: '三个新词：const、delayMicroseconds()、pulseIn()',
        desc: '先打个比方，再看最小的例子。',
        body: `
<div class="grid-3">
  ${card('flag', 'const 常量', `<p>像门牌号：钉上去就不改了。用名字代替数字，好读又防误改。</p>${snip('const int TrigPin = 2;\nTrigPin = 5;   // 报错')}${mistake('给 <code>const</code> 再赋值会编译报错：要改，就改它的初始值。')}`)}
  ${card('clock', 'delayMicroseconds()', `<p>更细的计时单位：1 秒 = 1000 毫秒 = 1000000 微秒（µs）。</p>${snip('delayMicroseconds(10); // 10 微秒\ndelay(1000);           // 1 秒')}${mistake('<code>delay(0.01)</code> 不等于 10µs：<code>delay()</code> 只认整数毫秒，0.01 会变成 0。')}`)}
  ${card('target', 'pulseIn(引脚, HIGH)', `<p>像秒表：Echo 一变高就开始计时，变低就停表，返回多少微秒。</p>${snip('pulseIn(EchoPin, HIGH)\n// → 高电平的微秒数')}${mistake('Echo 一直没变高（比如线没插牢）时，等约 1 秒后返回 0：读数是 0，先查线。')}`)}
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：准备工作',
        desc: '用 const 给两个引脚起名，准备一个小数变量装距离；setup() 里设好输入输出、打开串口。',
        file: 'ultrasonic.ino', code: ULTRA, from: 1, to: 10, hl: [1, 2, 3, 7, 8],
        notes: [
          { line: [1, 2], text: '<code>const</code> 常量：Trig 接 2 号脚、Echo 接 3 号脚，运行中不会变。' },
          { line: 3, text: '<code>float</code> 小数变量，用来装算出的距离（例如 8.57）。' },
          { line: 6, text: '打开串口，速度 9600。' },
          { line: [7, 8], text: 'Trig 设为输出（发命令），Echo 设为输入（收结果）：方向不能反。' },
          { line: 9, text: '先打印一行标题 <code>Ultrasonic sensor:</code>。' }
        ],
        foot: callout('book', '程序从哪来', '原指南这一页的程序是空白的。这里用同一套件《Arduino 编程入门学习教程》第 2.38 讲的程序，引脚（Trig 2、Echo 3）和串口输出格式都与本指南的截图一致。', 'gray')
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：喊一声，量回声',
        desc: '每一轮：Trig 发 10 微秒高电平“喊一声”→ pulseIn() 量回声 → ÷ 58 换成厘米 → 打印 → 等 1 秒。',
        file: 'ultrasonic.ino', code: ULTRA, from: 11, to: 24, hl: [15, 16, 18],
        notes: [
          { line: [13, 14], text: 'Trig 先拉低 2 微秒，“清零”。' },
          { line: [15, 17], text: '拉高 10 微秒再拉低 = “喊一声”，模块自动发出 8 个 40kHz 脉冲。' },
          { line: 18, text: 'Echo 高电平的微秒数 ÷ 58 = 厘米。写成 <code>58.00</code> 是按小数除，才能保留小数（如 8.57）。' },
          { line: [19, 22], text: '三个 <code>print</code> 拼成一行 <code>distance is :8.57cm</code>，最后 <code>println()</code> 换行。' },
          { line: 23, text: '等 1 秒，再测下一次。' }
        ]
      },
      {
        kind: 'lab', title: '动手实验室：拖动障碍物，看距离',
        desc: '点 ▶ 运行，左右拖动障碍物（或用下面的滑块）：串口监视器每秒打印一次距离，超声波卡片上还写着回波的微秒数。',
        lab: {
          programs: [{ name: 'ultrasonic.ino', label: '超声波测距', code: ULTRA, note: '原指南这一页的程序是空白的，这里用同一套件《Arduino 编程入门学习教程》第 2.38 讲的程序。' }],
          parts: [
            { type: 'board' },
            { type: 'ultrasonic', trig: 2, echo: 3, distanceCm: 20, label: '超声波模块 Trig→D2 Echo→D3' }
          ],
          sensors: { ultrasonic: { trig: 2, echo: 3, distanceCm: 20 } },
          baud: 9600,
          tasks: [
            { text: '运行后串口先打印 <code>Ultrasonic sensor:</code>，之后每秒一行 <code>distance is :20.00cm</code>。把障碍物拖近、拖远，数字跟着变。' },
            { text: '验算 ÷ 58：把距离调到 50 cm，卡片上回波约 2900 µs，2900 ÷ 58 = 50。再看右下角“引脚”：D2 是输出，D3 是输入。' },
            { text: '如果忘了“来回要除以 2”：把第 18 行的 <code>58.00</code> 改成 <code>29.00</code>，读数变成实际距离的两倍。', code: ULTRA_HALF },
            { text: '做个倒车雷达：物体近于 10 cm，板上的 L 灯（13 号脚）就亮。在 setup() 里加 <code>pinMode(13, OUTPUT);</code>，在 <code>delay(1000);</code> 前面加一个 if / else。', code: ULTRA_RADAR },
            { text: '雷达反应太慢？把 <code>delay(1000)</code> 改成 <code>delay(200)</code>，每秒测 5 次，灯跟得更紧。', code: ULTRA_FAST }
          ],
          smoke: [
            { expect: { serial: 'Ultrasonic sensor:' } },
            { expect: { serial: 'distance is :20.00cm', part: ['ultrasonic', 'distance', '20'] }, timeout: 3000 },
            { slider: 'ultrasonic', value: 50 },
            { expect: { serial: 'distance is :50.00cm', read: ['ultrasonic', '2900'] }, timeout: 3000 },
            { task: 3, run: true },
            { expect: { serial: 'distance is :100.00cm' }, timeout: 3000 },
            { task: 4, run: true },
            { slider: 'ultrasonic', value: 8 },
            { expect: { serial: 'distance is :8.00cm', pin: [13, 1] }, timeout: 3000 },
            { slider: 'ultrasonic', value: 30 },
            { expect: { serial: 'distance is :30.00cm', pin: [13, 0] }, timeout: 3000 }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果和常见坑',
        desc: '打开串口监视器（9600 波特率）：先显示 <code>Ultrasonic sensor:</code>，之后每秒一行 <code>distance is :xx.xxcm</code>。挡在前面的物体越近，数字越小。',
        img: 'img/l22/ultra_serial_monitor.jpg', caption: '原指南串口截图',
        side: `
<div class="card">
  <h3><span class="ico">${I('eye')}</span>怎么读截图里的数字</h3>
  ${table(['串口读数（cm）', '说明'], [['4.40 / 8.57', '物体离模块只有几厘米'], ['114.98 / 119.64', '物体在 1 米多远的地方'], ['243.98', '前方空旷，测到了远处的物体']])}
</div>
${warn('读数一直是 0', 'Echo 等不到高电平，<code>pulseIn()</code> 超时就返回 0。多半是 Trig、Echo 接反或没插牢：对照接线表查 2、3 号脚。')}
${warn('读数忽大忽小', '超声波碰到斜面、软布、海绵会被反射偏或被吸收；离得太近（几厘米以内）也测不准。对着平整的硬物测最稳。')}`
      },

      // ================================================================ 实验 02　串口调节舵机角度
      {
        kind: 'section', no: '实验 02', title: '串口调节舵机角度实验',
        desc: '在电脑的串口监视器里输入一个角度，舵机就转到那个角度。舵机在 2-1 认识过；这一节的新本领是：从串口一个个读入字符，拼成一个数字。',
        tiles: [
          { title: '回顾', sub: '舵机：脉宽决定角度' },
          { title: '接线', sub: '信号线 → 13 号脚' },
          { title: '代码', sub: 'available() · read() · toInt()' },
          { title: '结果', sub: '输入 0、90、180' }
        ]
      },
      {
        kind: 'html', title: '回顾：舵机的结构与控制信号',
        desc: '舵机里有电机、齿轮、电位器和控制电路；Arduino 每 20ms 发一个脉冲，高电平的宽度决定转到几度。',
        body: `
<div class="grid-2">
  ${fig('servo_inside_photo.jpg', '原指南：舵机内部结构')}
  <div class="stack">
    ${fig('servo_pulse_period.jpg', '原指南：周期（Cycle）20ms，脉宽（pulse width）1ms (Min) – 2ms (Max)')}
    <div class="card">
      <h3><span class="ico">${I('cube')}</span>认一认拆解照片里的英文</h3>
      <dl class="kv"><dt>driveshaft</dt><dd>输出轴</dd><dt>gear train</dt><dd>减速齿轮组</dd><dt>potentiometer</dt><dd>电位器：随时汇报转到了几度</dd><dt>motor</dt><dd>直流电机</dd><dt>control electronics</dt><dd>控制电路：没转到位就继续转（闭环）</dd></dl>
    </div>
  </div>
</div>`
      },
      {
        kind: 'figure', title: '回顾：脉冲越宽，角度越大',
        desc: '高电平 0.5ms → 0°，1.5ms → 90°，2.5ms → 180°；小于 1.5ms 逆时针转，大于 1.5ms 顺时针转。',
        img: 'img/l22/servo_pulse_angles.jpg', caption: '原指南：最小 / 中间 / 最大脉冲 → 0° / 90° / 180°',
        side: `
${table(['高电平宽度', '舵机角度'], [['0.5ms', '0°'], ['1.0ms', '45°'], { hl: true, cells: ['1.5ms', '90°（中间）'] }, ['2.0ms', '135°'], ['2.5ms', '180°']])}
${warn('图和正文不一样', '上一页的周期图上写 1ms–2ms，正文写 0.5ms–2.5ms。原文也说：不同品牌、甚至同一品牌的舵机，最大值和最小值都可能不同。好在 Servo 库会替我们换算，程序里只写 <code>write(角度)</code>。')}`
      },
      {
        kind: 'wiring', title: '接线：信号线接 13 号脚',
        desc: '舵机三根线：黑线接 GND，红线接 VCC（5V），黄色信号线接 13 号脚。',
        img: 'img/l22/servo_wiring.jpg', caption: '原指南接线图',
        tables: [{ left: 'Arduino UNO', right: '舵机', rows: [['GND', '黑线'], ['VCC', '红线'], ['13', '黄线']] }],
        note: 'SG90 的线常见为 棕 / 红 / 橙，分别对应表里的 黑 / 红 / 黄（GND / 电源 / 信号），别因为颜色不同接错。',
        side: `
${callout('target', '实验目的与原理', '用 UNO 主板调整舵机角度：烧录程序后，在串口监视器里输入要调整的角度，舵机就转到对应的位置。')}
${callout('list', '组件清单', 'Keywish Arduino Uno R3 主板 · USB 数据线 · SG90 舵机 · 若干跳线', 'gray')}`
      },
      {
        kind: 'html', title: '新语法：从串口读一串数字',
        desc: '串口一次只能取 1 个字符：用 while 把字符一个个取出来，拼成一串，再变成数字。',
        body: `
<div class="flow">
  <div><b>输入 180</b><br><span class="small">串口监视器</span></div>
  <div><b class="mono">'1' '8' '0'</b><br><span class="small">read() 每次取 1 个</span></div>
  <div><b class="mono">temp = "180"</b><br><span class="small">String 用 += 拼接</span></div>
  <div><b class="mono">angle = 180</b><br><span class="small">toInt() 变成数字</span></div>
  <div class="on"><b>转到 180°</b><br><span class="small">myservo.write()</span></div>
</div>
<div class="grid-3 mt">
  ${card('send', '串口像个信箱', `<p><code>available()</code> 问信箱里还剩几个字符；<code>read()</code> 每次只取 1 个。</p>${snip('inByte = Serial.read();')}${mistake('以为 <code>read()</code> 一次能读到整个“180”。')}`)}
  ${card('list', '字符串像串珠子', `<p><code>String</code> 装一串字符，<code>+=</code> 把新字符接到末尾："1" → "18" → "180"。</p>${snip('temp += inByte;')}${mistake('用完不清空，下次会拼成“18090”。')}`)}
  ${card('cube', '纸条换成数字', `<p><code>toInt()</code> 把文字 "180" 变成能交给舵机的数字 180。</p>${snip('angle = temp.toInt();')}${mistake('“abc”不是数字，<code>toInt()</code> 得到 0。')}`)}
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/3）：准备工作',
        desc: '引入舵机库、创建舵机对象，再准备三个“盒子”：一个装字符，一个装角度，一个拼字符串。',
        file: 'serial_servo.ino', code: SERVO, from: 1, to: 12, hl: [1, 2, 4, 6, 11],
        notes: [
          { line: [1, 2], text: '引入舵机库，创建舵机对象 <code>myservo</code>（2-1 学过）。' },
          { line: 3, text: '信号线接 13 号脚。' },
          { line: [4, 5], text: '<code>char</code> 一次只装 1 个字符，比如 <code>\'9\'</code>；<code>angle</code> 装角度。' },
          { line: 6, text: '<code>String</code> 字符串 <code>temp</code>：先放一个空串 <code>""</code>，用来拼字符。' },
          { line: [9, 11], text: '开串口 9600；13 号脚设为输出；<code>attach</code> 把舵机“绑”到 13 号脚。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（2/3）：把字符一个个读进来',
        desc: '只要串口里还有没读的字符，while 就一直转：每圈取 1 个字符，接到 temp 的末尾。',
        file: 'serial_servo.ino', code: SERVO, from: 13, to: 19, hl: [15, 17, 18],
        notes: [
          { line: 13, text: '<code>loop()</code> 一遍遍重复。' },
          { line: 15, text: '<code>while</code>：串口里还有没读的字符，就继续。<code>if</code> 只判断一次，<code>while</code> 会一直重复。' },
          { line: 17, text: '<code>read()</code> 取出 1 个字符，放进 <code>inByte</code>。' },
          { line: 18, text: '把 <code>inByte</code> 接到 <code>temp</code> 的末尾。' },
          { line: 19, text: '串口里没有字符了，跳出 while。' }
        ],
        foot: `<div class="grid-2">
  <div class="card pale"><h3><span class="ico">${I('reset')}</span>输入 180 时，while 一般转 3 圈</h3><div class="flow"><div>第 1 圈 <b class="mono">"1"</b></div><div>第 2 圈 <b class="mono">"18"</b></div><div class="on">第 3 圈 <b class="mono">"180"</b></div></div></div>
  ${warn('原指南这里印错了', '原指南（PDF）把第 18 行的注释折成了两行：照抄的话，第二行前面没有 <code>//</code>，不是注释，编译会报错。这里已合回一行；实验室的“原指南原样”标签能看到报错。')}
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（3/3）：拼好的数字交给舵机',
        desc: '收到新输入就把文字变成数字、在串口回一句，再清空 temp；舵机始终转到 angle 度。',
        file: 'serial_servo.ino', code: SERVO, from: 21, to: 32, hl: [21, 23, 28, 29],
        notes: [
          { line: 21, text: '<code>temp</code> 不是空的 = 刚收到新输入。' },
          { line: 23, text: '<code>toInt()</code>：文字 "180" → 数字 180。' },
          { line: [24, 25], text: '串口回一句 <code>Servo degree: 180</code>，方便确认。' },
          { line: 26, text: '只是注释：真正让舵机转的是第 29 行。' },
          { line: 28, text: '清空 <code>temp</code>，等下一次输入。原注释 “Please see temporary variables” 是机翻，意思是“清空临时变量”。' },
          { line: [29, 30], text: '舵机转到 <code>angle</code> 度；没有新输入时 angle 不变，舵机保持原位。等 0.1 秒：这期间新发来的字符先存在串口里，下一圈一起读出来。' }
        ]
      },
      {
        kind: 'figure', title: '实验步骤：接上电池，打开串口监视器',
        desc: '原指南：程序烧录后先不要拔 USB 线，把电池插头插到 UNO 上一起供电，然后打开 Arduino IDE 的串口监视器。',
        img: [
          { src: 'img/l22/servo_result_photo.jpg', caption: '原指南实物：舵机 + 9V 电池给 UNO 供电' },
          { src: 'img/l22/servo_ide_monitor.jpg', caption: '打开串口监视器：IDE 右上角红框里的按钮（截图里的代码版本略有不同）' }
        ],
        side: `
<div class="card">
  <h3><span class="ico">${I('list')}</span>真实硬件上三步走</h3>
  <ol class="steps">
    <li>烧录后先别拔 USB 线：串口监视器要靠它和电脑“聊天”。</li>
    <li>插上电池：UNO 自动改用电池供电，舵机的大电流不再压在 USB 上。</li>
    <li>点 IDE 右上角“串口监视器”，选 9600 波特率、“没有结束符”。</li>
  </ol>
</div>
${callout('play', '在模拟器里', '下一页实验室的串口监视器在右下角：输入框、行结束符和“发送”都和 IDE 一样。')}`
      },
      {
        kind: 'lab', title: '动手实验室：从串口发送角度',
        desc: '点 ▶ 运行，在右下角串口监视器的输入框里输入角度，行结束符保持“没有结束符”，点“发送”（或按回车）。',
        lab: {
          programs: [
            { name: 'serial_servo.ino', label: '串口调舵机', code: SERVO, note: '原指南第 18 行的注释被排版折成了两行，这里已合回一行，其余一字未改。' },
            { name: 'serial_servo_原样.ino', label: '原指南原样', code: SERVO_ORIG, expect: 'error', note: '照 PDF 原样：第 18 行的注释折到了第 19 行，第 19 行前面没有 <code>//</code>。点 ▶ 运行，读一读错误提示。' }
          ],
          parts: [
            { type: 'board' },
            { type: 'servo', pin: 13, label: '舵机 黄线（信号）→D13' }
          ],
          baud: 9600,
          lineEnding: 'none',
          tasks: [
            { text: '输入 <code>90</code> 点发送：串口回 <code>Servo degree: 90</code>，舵机转到 90°。再照原指南依次输入 0、90、180、90。偶尔回了两行（比如 9 和 0）？这是原程序把字符拆开了，再发一次就好，原因见后面的“常见坑”页。' },
            { text: '发送 <code>180</code> 后看右下角“变量”里的 <code>inByte</code>：是 <code>\'0\'(48)</code>，也就是最后读到的那个字符。串口一次只给 1 个字符，三个字符拼成 "180" 才 <code>toInt()</code>。' },
            { text: '把行结束符改成“换行”，输入框空着点发送：舵机跳回 0°！换行符被拼进了 temp，<code>toInt()</code> 得到 0。试完改回“没有结束符”。' },
            { text: '发送 <code>200</code>：串口打印 200，舵机却最多转到 180°。在第 23 行后面加一行 <code>angle = constrain(angle, 0, 180);</code>，再发 200：打印和实际一致了。', code: SERVO_LIMIT },
            { text: '切到“原指南原样”点 ▶ 运行：红色错误指向第 19 行。把第 19 行接回第 18 行末尾（合成一行注释），再运行。', code: SERVO, program: 1 }
          ],
          // The guide program splits a number about 1 send in 50 (a character arrives while the while-loop
          // is reading, see the pitfall page), so each multi-digit send is repeated once after a pause.
          smoke: [
            { expect: { servo: [13, 0, 2] }, timeout: 3000 },
            { send: '90', ending: 'none' }, { wait: 300 }, { send: '90' },
            { expect: { serial: 'Servo degree: 90', servo: [13, 90, 2], read: ['servo', '90°'], var: ['inByte', '/48/'] }, timeout: 4000 },
            { send: '', ending: 'nl' },
            { expect: { serial: 'Servo degree: 0', servo: [13, 0, 2] }, timeout: 4000 },
            { task: 4, run: true },
            { send: '200', ending: 'none' }, { wait: 300 }, { send: '200' },
            { expect: { serial: 'Servo degree: 180', noSerial: 'Servo degree: 200', servo: [13, 180, 2] }, timeout: 4000 },
            { tab: 1, run: true },
            { expect: { state: 'error', status: '/^编译错误：第 19 行：.*Continue/', errLine: 19 } }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：输入角度，舵机跟着转',
        desc: '原指南：在串口监视器依次输入 0、90、180、90，每输入一次，串口回一句 <code>Servo degree:</code>，舵机转到对应角度。',
        img: 'img/l22/servo_serial_input.jpg', caption: '原指南：串口输入舵机角度数值（右下角：没有结束符 · 9600 波特）',
        side: `
<div class="card">
  <h3><span class="ico">${I('reset')}</span>依次输入 0、90、180、90</h3>
  <div class="row">${dial(0, '输入 0')}${dial(90, '输入 90')}${dial(180, '输入 180')}${dial(90, '输入 90')}</div>
</div>
<div class="card">
  <h3><span class="ico">${I('send')}</span>串口监视器右下角这样设</h3>
  <div class="row"><span class="tag dark">没有结束符</span><span class="tag dark">9600 波特率</span></div>
</div>
${callout('check', '原指南结论', '在串口监视器分别输入以上舵机角度值之后，会发现舵机会转动。')}`
      },
      {
        kind: 'html', title: '常见坑：行结束符、拆开的数字、供电和角度范围',
        desc: '舵机乱跳，先看串口监视器右下角的设置，再看供电。',
        body: `
<div class="grid-2 stretch">
  ${warn('空着点“发送”，舵机跳回 0°', '行结束符选了“换行”时，空着发送也会送出一个换行符：temp 不为空，<code>toInt()</code> 得到 0。选“没有结束符”就不会这样。')}
  ${warn('偶尔转错：“180”被拆成“1”和“80”', '9600 波特率下每个字符要约 1 毫秒才到，<code>while</code> 却读得飞快。loop() 碰巧在字符还没到齐时去读，就会先读到 "1"、下一圈才读到 "80"：舵机先转到 1°，再转到 80°。几十次里会碰到一次，实验室里也能遇到。在第 18 行后面加一行 <code>delay(2);</code>，等下一个字符到了再判断，就不会拆开。')}
  ${warn('舵机抖动、板子反复重启', '舵机转动的瞬间电流很大，只靠 USB 供电会“掉电”。按原指南插上电池一起供电。')}
  ${warn('打印 200，却只转到 180°', 'Servo 库最多转到 180°，串口却照样打印 200。加一行 <code>constrain</code>，打印和实际就一致了。')}
</div>
<div class="grid-2 mt">
  <div class="card pale">
    <h3><span class="ico">${I('target')}</span>把角度“关进笼子”：constrain(值, 最小, 最大)</h3>
    ${snip('angle = temp.toInt();\nangle = constrain(angle, 0, 180);')}
    <p>比最小还小就取最小，比最大还大就取最大：-20 → 0，200 → 180，90 → 90。</p>
  </div>
  ${callout('question', '再试试', '输入 45、135，对照“脉冲越宽，角度越大”那一页的表，看角度对不对。')}
</div>`
      },

      // ================================================================ 实验 03　红外避障模块
      {
        kind: 'section', no: '实验 03', title: '红外避障模块实验',
        desc: '红外避障模块像一只会“看”障碍物的眼睛：前面有东西，它就输出低电平。程序和 1-3 的小磁簧开关一字不差：输入换了，逻辑不变。',
        tiles: [
          { title: '认识', sub: '发射管 + 接收管' },
          { title: '接线', sub: 'OUT → 12，LED → 11，蜂鸣器 → 13' },
          { title: '代码', sub: 'digitalRead() · if / else' },
          { title: '结果', sub: '挡一下：灯亮、响' }
        ]
      },
      {
        kind: 'figure', title: '认识红外避障模块：看“反光”找障碍物',
        desc: '透明的发射管发出红外线，碰到障碍物反射回来被黑色的接收管收到：绿灯亮，OUT 输出低电平。',
        img: 'img/l22/ir_module_photo.jpg', caption: '红外避障模块实物图（原指南）：前端一透明一黑两个管子，中间是蓝色电位器',
        side: `
${callout('question', '像拿手电筒照墙', '前面有墙，就能看到反光；前面空空的，光就有去无回。模块用看不见的红外线做同样的事。')}
<div class="card">
  <h3><span class="ico">${I('eye')}</span>它怎么工作</h3>
  <ol class="steps">
    <li>透明的发射管发出红外线。</li>
    <li>遇到障碍物，红外线反射回来被接收管收到。</li>
    <li>比较器判断后：绿灯亮，OUT 输出低电平 0。</li>
  </ol>
</div>
<div class="card">
  <dl class="kv"><dt>检测距离</dt><dd>2～30 cm，用蓝色电位器旋钮调</dd><dt>工作电压</dt><dd>3.3～5V</dd><dt>用在哪</dt><dd>机器人避障、避障小车、流水线计数、黑白线循迹</dd></dl>
</div>`
      },
      {
        kind: 'html', title: '实验目的与原理：有障碍物，灯亮、蜂鸣器响',
        desc: '前方有障碍物 → LED 亮、蜂鸣器响；没有障碍物 → 全部熄灭。和 1-3 的小磁簧开关是同一个套路。',
        body: `
<div class="grid-2">
  <div class="stack">
    ${callout('target', '实验目的', '① 了解红外避障模块的工作原理<br>② 用 Arduino UNO 获取红外避障模块的值，控制蜂鸣器和 LED 灯')}
    ${callout('list', '组件清单', 'Arduino UNO R3 主板 · 面包板 · USB 数据线 · 红外避障模块 ×1 · LED 模块 ×1 · 有源蜂鸣器 ×1 · 若干跳线', 'gray')}
  </div>
  <div class="stack">
    <div class="flow">
      <div><b>前方有障碍物</b><br><span class="small">绿灯亮</span></div>
      <div><b>OUT 输出 0</b><br><span class="small">低电平</span></div>
      <div class="on"><b>LED 亮</b><br><span class="small">蜂鸣器响</span></div>
    </div>
    <p class="muted small">没有障碍物：OUT 输出 1 → LED 灭、蜂鸣器不响。</p>
    ${table(['', '小磁簧开关（1-3）', '红外避障模块'], [['触发条件', '磁铁靠近', '前方有障碍物'], ['触发时读到', '0（低电平）', '0（低电平）'], ['引脚', 'D12 / D11 / D13', 'D12 / D11 / D13'], { hl: true, cells: ['程序', '同一个程序', '一字不差'] }])}
  </div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：三个模块，三张表',
        desc: '红外模块 OUT 接 12，LED 模块 + 接 11，有源蜂鸣器 + 接 13；所有 GND 都接 UNO 的 GND。',
        img: 'img/l22/ir_wiring.jpg', caption: '原指南接线图：LED 用的是 RGB 贴片模块（11 → R 脚，所以亮红灯）',
        tables: [
          { left: 'Arduino UNO', right: '红外避障模块', rows: [['12', 'OUT'], ['5V', 'VCC'], ['GND', 'GND']] },
          { left: 'Arduino UNO', right: 'LED', rows: [['11', '+'], ['GND', '—']] },
          { left: 'Arduino UNO', right: '有源蜂鸣器', rows: [['13', '+'], ['GND', '—']] }
        ],
        note: '接线图里的 LED 是 RGB 贴片模块，11 号脚接它的 R 脚；用普通 LED 模块也可以。UNO 上有好几个 GND 口，哪个都行。'
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：准备工作',
        desc: '先给三个引脚起名字、准备装读数的盒子，再在 setup() 里分好输入和输出。',
        file: 'ir_obstacle.ino', code: IR, from: 1, to: 11, hl: [1, 2, 3, 9],
        notes: [
          { line: [1, 3], text: '给三个引脚起名字：LED 11、蜂鸣器 13、传感器 12。' },
          { line: 4, text: '<code>val</code>：装读数的盒子，先放 0。' },
          { line: 5, text: '<code>setup()</code>：通电后只运行一次。' },
          { line: [7, 8], text: 'LED、蜂鸣器设为输出。' },
          { line: [9, 10], text: '红外模块设为输入；打开串口 9600。' }
        ],
        foot: callout('book', '程序从哪来', '原指南这一页的程序是空白的。这里用同一套件《Arduino 编程入门学习教程》第 2.25 讲的程序，引脚与本指南一致（OUT 12、LED 11、蜂鸣器 13）。', 'gray')
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：读、打印、判断',
        desc: '读到 0（有障碍物）就亮灯、响蜂鸣器，否则全部关掉。和 1-3 小磁簧开关的程序一模一样。',
        file: 'ir_obstacle.ino', code: IR, from: 12, to: 26, hl: [14, 15, 16, 21],
        notes: [
          { line: 14, text: '读 12 号脚：有障碍物是 0，没有是 1。' },
          { line: 15, text: '把读数打印到串口，一行一个。' },
          { line: 16, text: '岔路口：val 等于 0 吗？（<code>==</code> 是比较，两个等号）' },
          { line: [18, 19], text: '是（有障碍物）：LED 亮、蜂鸣器响。' },
          { line: 21, text: '否则（val 是 1）……' },
          { line: [23, 24], text: '……LED 灭、蜂鸣器停。' }
        ]
      },
      {
        kind: 'lab', title: '动手实验室：挡一下，灯亮、蜂鸣器响',
        desc: '点 ▶ 运行，把障碍物拖近（越过虚线 = 检测距离）。想听声音，先点蜂鸣器卡片上的“开启声音”。',
        lab: {
          programs: [{ name: 'ir_obstacle.ino', label: '红外避障', code: IR, note: '原指南这一页的程序是空白的，这里用同一套件《Arduino 编程入门学习教程》第 2.25 讲的程序。' }],
          parts: [
            { type: 'board' },
            { type: 'ir', pin: 12, distanceCm: 20, thresholdCm: 10, label: '红外避障模块 OUT→D12' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED 模块 +→D11' },
            { type: 'buzzer', pin: 13, kind: 'active', label: '有源蜂鸣器 +→D13' }
          ],
          baud: 9600,
          tasks: [
            { text: '把障碍物拖近，越过虚线：模块 OBS 绿灯亮，串口从 1 变成 0，LED 亮、蜂鸣器响（13 号脚，板上的 L 灯也亮）。拖远就全部停下。' },
            { text: '拧红外卡片上的“检测距离”旋钮（真模块上是蓝色电位器）：调到 5 cm，障碍物要贴得很近才报警；调到 30 cm，远远就报警。' },
            { text: '简易防盗器：把第 16 行改成 <code>if(val==1)</code>。东西在跟前时安静，被拿走才报警。', code: IR_ALARM },
            { text: '串口刷得太快？在 loop() 最后加一行 <code>delay(200);</code>，每秒只打印 5 个数。', code: IR_SLOW }
          ],
          smoke: [
            { expect: { var: ['val', 1], pin: [11, 0], serialRe: '(^|\\n)1\\n' } },
            { slider: 'ir', value: 6 },
            { expect: { var: ['val', 0], pin: [11, 1], freq: ['buzzer', 2300], part: ['ir', 'detected', '1'], serialRe: '(^|\\n)0\\n' } },
            { knob: 'ir', to: 0 },
            { expect: { var: ['val', 1], pin: [11, 0], part: ['ir', 'detected', '0'] } },
            { knob: 'ir', to: 1 },
            { slider: 'ir', value: 25 },
            { expect: { var: ['val', 0], pin: [13, 1] } },
            { task: 3, run: true },
            { expect: { var: ['val', 0], pin: [11, 0] } },
            { slider: 'ir', value: 35 },
            { expect: { var: ['val', 1], pin: [11, 1] } }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：挡一下，灯亮、蜂鸣器响',
        desc: '原指南的实验结果只有两张照片：把手挡在红外模块前，模块绿灯亮、RGB 模块亮红灯、蜂鸣器响；手拿开，全部熄灭。',
        img: [
          { src: 'img/l22/ir_result_photo.jpg', caption: '原指南实物照片' },
          { src: 'img/l22/ir_result_photo2.jpg', caption: '检测到障碍物：RGB 模块亮红灯，红外模块绿灯亮' }
        ],
        side: `
<div class="card pale"><h3><span class="ico">${I('hand')}</span>挡住它</h3><p><code>val = 0</code>：LED 亮、蜂鸣器响。</p></div>
<div class="card"><h3><span class="ico">${I('eye')}</span>拿开</h3><p><code>val = 1</code>：LED 灭、蜂鸣器停。</p></div>
${callout('reset', '调距离', '用螺丝刀拧模块上的蓝色电位器，检测距离就调远或调近。')}`
      },
      {
        kind: 'figure', title: '扩展板接法和常见坑',
        desc: '有 Sensor V5.0 扩展板时，用杜邦线直插更方便；一直报警、黑色物体测不到，是两个最常见的问题。',
        img: 'img/l22/ir_shield_photo.jpg', caption: '原指南：扩展板接法',
        side: `
${callout('plug', '原指南', '如果你的套件中有 Sensor V5.0 扩展板，可以按照图里的方法接线，更加方便。引脚号不变，程序不用改。')}
${warn('一直在报警', '检测距离调得太远，或模块正对着桌面、墙面。拧蓝色电位器调近，直到前方没东西时绿灯熄灭。')}
${warn('黑色物体测不到', '黑色表面会吸收红外线，反光太弱，要靠得更近才能检测到。')}`
      },

      // ================================================================ 实验 04　温湿度传感器模块
      {
        kind: 'section', no: '实验 04', title: '温湿度传感器模块实验',
        desc: 'DHT11 只用一根数据线，就能把温度和湿度“说”给 Arduino 听。先看懂它的“说话规则”（时序），再用现成的库读出数据，显示在 LCD1602 上。',
        tiles: [
          { title: '认识', sub: 'DHT11 · 单总线' },
          { title: '时序', sub: '高电平长短 = 0 / 1' },
          { title: '代码', sub: '库 · 对象.成员' },
          { title: '结果', sub: 'LCD 显示温湿度' }
        ]
      },
      {
        kind: 'html', title: '认识 DHT11：一个模块，两种本领',
        desc: 'DHT11 里有测湿度的电阻式元件、测温度的 NTC 元件和一颗 8 位单片机，直接输出校准好的数字信号。',
        body: `
<div class="grid-2">
  <div class="stack">
    ${fig('dht_photo.jpg', '温湿度传感器实物图（原指南）：蓝色的 DHT11，和焊在小板上的模块')}
    <div class="flow">
      <div><b>湿度</b><br><span class="small">电阻式元件</span></div>
      <div><b>温度</b><br><span class="small">NTC 元件</span></div>
      <div class="on"><b>处理</b><br><span class="small">8 位单片机</span></div>
    </div>
  </div>
  <div class="stack">
    ${table(['引&#8288;脚', '名称', '说明（原指南）'], [['1', 'VDD', '电源正极（3～5V）'], ['2', 'DATA', '串行数据，单总线；要接约 5.1kΩ 上拉电阻，空闲时保持高电平（模块上一般已带好）'], ['3', 'GND', '电源负极'], ['4', 'NC', '悬空，不用接']])}
    ${callout('target', '实验目的', '用 DHT11 检测空气的温度和湿度，结果显示在 LCD 上：第一行温度，第二行湿度。')}
  </div>
</div>`
      },
      {
        kind: 'html', title: 'DHT11 怎么“说话”：一根线、四个步骤',
        desc: '像课堂点名：主机 Arduino 先喊，从机 DHT11 才回答。一次对话分四步：起始 → 响应 → 40 位数据 → 结束。',
        body: `
${fig('dht_timing_sequence.jpg', '原指南：完整时序图（The time sequence diagram）。粗线是主机 Arduino 发出的（host signal），细线是 DHT11 发出的（slave signal）。点图可放大')}
<div class="flow mt">
  <div><b>① 起始</b><br>Arduino 把线拉低 &gt;18ms：“点名”</div>
  <div><b>② 响应</b><br>DHT11 拉低、拉高各 80µs：“到！”</div>
  <div class="on"><b>③ 数据</b><br>连发 40 位（上一次测得的）</div>
  <div><b>④ 结束</b><br>拉低 50µs 后松开，线回到高电平</div>
</div>`
      },
      {
        kind: 'html', title: '40 位数据：5 个 8 位的数',
        desc: '一次发 40 位 = 湿度整数 + 湿度小数 + 温度整数 + 温度小数 + 校验和，高位先发（“大端”）。',
        body: `
<div class="grid-4">
  <div class="tile turq"><div class="n">46</div><b>湿度整数</b><span>8 位</span></div>
  <div class="tile turq"><div class="n">0</div><b>湿度小数</b><span>8 位</span></div>
  <div class="tile"><div class="n">24</div><b>温度整数</b><span>8 位</span></div>
  <div class="tile"><div class="n">0</div><b>温度小数</b><span>8 位</span></div>
</div>
<div class="grid-2 mt">
  <div class="tile dark"><div class="n">70</div><b>校验和</b><span>8 位：前 4 个数相加（只取低 8 位）46 + 0 + 24 + 0 = 70，对得上才算没传错</span></div>
  <div class="stack">
    ${callout('clock', '每次读到的是“上一次”的数据', 'DHT11 发完数据才重新测量，所以每次读到的是上一次测得的值。原文建议读取间隔超过 5 秒（实际手册多为 1～2 秒），通电后要 1 秒才稳定。')}
    ${callout('book', '原指南用词', '原文说 DHT11 “只需要一个线程”，应为“只需要一根线”。', 'note')}
  </div>
</div>`
      },
      {
        kind: 'html', title: '时序细节①：起始信号与响应信号',
        desc: 'Arduino 把线拉低超过 18ms 叫醒 DHT11；DHT11 先拉低 80µs、再拉高 80µs，表示“我准备好了”。',
        body: `
<div class="grid-2">
  <div class="stack">
    ${fig('dht_timing_start.jpg', '① 原指南：主机发送起始信号（&gt;18ms）')}
    <ol class="steps">
      <li>先输出高电平，再拉低超过 18ms。</li>
      <li>DHT11 被叫醒：从低功耗模式切到高速模式。</li>
      <li>Arduino 改为输入，上拉电阻把线拉回高电平。</li>
    </ol>
  </div>
  <div class="stack">
    ${fig('dht_timing_response.jpg', '② 原指南：DHT11 响应信号（原标题误作“THD 响应信号”）')}
    <ol class="steps">
      <li>DHT11 输出 80µs 低电平：应答“到！”</li>
      <li>再输出 80µs 高电平：准备好发数据了。</li>
      <li>接着连续发出 40 位数据（上一次测得的）。</li>
    </ol>
  </div>
</div>`
      },
      {
        kind: 'html', title: '时序细节②：高电平的长短表示 0 和 1',
        desc: '每一位都先拉低 50µs，接着看高电平多长：短（26–28µs）是 0，长（70µs）是 1。',
        body: `
<div class="grid-2">
  ${fig('dht_timing_bit0.jpg', '“0”：50µs 低电平 + 26–28µs 高电平')}
  ${fig('dht_timing_bit1.jpg', '“1”：50µs 低电平 + 70µs 高电平')}
</div>
<div class="grid-2 mt">
  ${callout('wave', '像摩尔斯电码', '短音、长音拼字母；DHT11 用短、长高电平拼出 0 和 1。40 位发完，DHT11 再拉低 50µs 后松开，表示结束。<b>好消息</b>：这些微秒级的时序都由 dht11 库处理，程序里一句 <code>DHT11.read()</code> 就够。')}
  <div class="card"><h3><span class="ico">${I('eye')}</span>例：依次发出 0、1、1、0</h3>${bitsSvg}</div>
</div>`
      },
      {
        kind: 'wiring', title: '接线：LCD 接 I2C，DHT11 接 8 号脚',
        desc: 'LCD 四根线：SDA → A4、SCL → A5、VCC → 5V、GND → GND；温湿度模块 OUT → 8 号脚。',
        img: 'img/l22/dht_wiring.jpg', caption: '原指南接线图',
        tables: [
          { left: 'LCD 显示屏 PCF8574T', right: 'Arduino', rows: [['GND', 'GND'], ['VCC', '5V'], ['SDA', 'A4'], ['SCL', 'A5']] },
          { left: '温湿度传感器', right: 'Arduino', rows: [['GND', 'GND'], ['VCC', '5V'], ['OUT', '8']] }
        ],
        note: 'A4 = SDA，A5 = SCL：这里当 I2C 接口用，不是读模拟量。LCD 背面的 PCF8574T 转接板把十几根线变成 4 根，2-3 会专门讲。',
        side: callout('list', '组件清单', 'Arduino UNO R3 主板 · 面包板 · USB 数据线 · LCD1602 模块 ×1 · DHT11 温湿度传感器模块 ×1 · 若干跳线。原指南清单里写成了“DTH11”，是笔误。', 'gray')
      },
      {
        kind: 'html', title: '新语法①：库、#define 和对象',
        desc: '库是别人写好的“工具箱”，#include 把它搬进来；#define 起外号；用“对象.成员”指挥一台具体的设备。',
        body: `
<div class="grid-3">
  ${card('book', '库与 #include', `<p>像借来一套工具：复杂的细节，库里都写好了。</p>${snip('#include "dht11.h"')}<dl class="kv"><dt class="mono">Wire.h</dt><dd>I2C 通信</dd><dt class="mono">dht11.h</dt><dd>读温湿度</dd><dt class="mono">LiquidCrystal_I2C.h</dt><dd>I2C 液晶屏</dd></dl>${mistake('没安装库：编译时报 No such file。dht11 和 LiquidCrystal_I2C 在套件资料的库文件里。')}`)}
  ${card('flag', '#define 起外号', `<p>像“查找替换”：编译前把名字换成后面的值。</p>${snip('#define DHT11PIN 8\n\nDHT11.read(DHT11PIN);\n// 编译前变成\nDHT11.read(8);')}${mistake('末尾加分号：分号也会被替换进去。')}`)}
  ${card('cube', '对象.成员', `<p><code>dht11</code> 是“型号”，<code>DHT11</code> 是你手里这一台；用“.”按它的按钮、看它的读数。</p>${snip('dht11 DHT11;    // 造一台\nDHT11.read(8);  // 读一次\nDHT11.humidity  // 湿度')}${mistake('大小写写错：<code>dht11</code> 是型号，<code>DHT11</code> 才是对象。')}`)}
</div>`
      },
      {
        kind: 'html', title: '新语法②：setCursor() 和 print()',
        desc: 'LCD1602 像一个 16 列 × 2 行的格子本：setCursor(列, 行) 先指好从哪一格写，print() 再从那里往后写。',
        body: `
<div class="grid-2">
  <div class="card">
    <h3><span class="ico">${I('target')}</span>setCursor(列, 行)：行和列都从 0 开始数</h3>
    ${lcdSvg(['Tep: 24.00C', 'Hum: 46.00%'], true)}
    <p class="mt-s"><code>setCursor(0, 0)</code> → 第一行开头；<code>setCursor(0, 1)</code> → 第二行开头。</p>
  </div>
  <div class="stack">
    ${card('code', '(float) 和“保留 2 位小数”', `${snip('lcd.print((float)DHT11.temperature, 2);')}<p><code>(float)</code> 先把整数变成小数，第二个参数 2 = 保留 2 位：24 → 24.00。</p>`)}
    ${warn('常见错误', '① 行号从 0 开始：第二行是 1。<br>② <code>print</code> 不会擦旧字：新内容更短时，后面会残留旧字符。')}
  </div>
</div>`
      },
      {
        kind: 'code', title: '代码逐行看懂（1/2）：库、对象和准备工作',
        desc: '引入三个库，给 8 号脚起外号，创建传感器对象 DHT11 和屏幕对象 lcd，再初始化屏幕。',
        file: 'dht11_lcd.ino', code: DHT, from: 1, to: 13, hl: [1, 2, 3, 5, 6, 7],
        notes: [
          { line: [1, 3], text: '引入三个库：Wire（I2C 通信）、dht11（读温湿度）、LiquidCrystal_I2C（I2C 液晶屏）。第 2 行 <code>#include</code> 后面少个空格，也能编译。' },
          { line: [5, 6], text: '8 号脚起外号 <code>DHT11PIN</code>；创建传感器对象 <code>DHT11</code>。' },
          { line: 7, text: '创建屏幕对象 <code>lcd</code>：I2C 地址 0x27，16 列 2 行。原指南把末尾注释折成两行，照抄要把 backpack 接回本行，否则编译报错。' },
          { line: 9, text: '8 号脚先设为输出（dht11 库读数时会自己切换输入输出）。' },
          { line: [10, 12], text: '初始化屏幕、打开背光；打开串口（这个程序没用串口打印）。' }
        ]
      },
      {
        kind: 'code', title: '代码逐行看懂（2/2）：读一次，写两行',
        desc: 'loop() 每轮：读一次温湿度 → 光标移到第一行写温度 → 移到第二行写湿度 → 等 0.2 秒。',
        file: 'dht11_lcd.ino', code: DHT, from: 15, to: 26, hl: [16, 17, 19, 21, 23, 25],
        notes: [
          { line: 16, text: '读一次温湿度。<code>chk</code> 是结果码（0 表示成功），这个程序没用到。' },
          { line: 17, text: '光标移到第 1 行开头。' },
          { line: [18, 20], text: '显示 <code>Tep: 24.00C</code>。“Tep” 是原程序的拼写（Temp 的缩写）。' },
          { line: 21, text: '光标移到第 2 行开头。' },
          { line: [22, 24], text: '显示 <code>Hum: 46.00%</code>。' },
          { line: 25, text: '等 0.2 秒再读：偏短，见下面。' }
        ],
        foot: warn('第 25 行偏短', 'DHT11 两次读取最好隔 1 秒以上（原指南说隔 5 秒以上最准）。<code>delay(200)</code> 读得太勤，建议改成 <code>delay(2000)</code>：实验室任务 3。')
      },
      {
        kind: 'lab', title: '动手实验室：温湿度显示在 LCD 上',
        desc: '点 ▶ 运行，拖动 DHT11 卡片上的温度、湿度滑块，看 LCD 上的数字跟着变。',
        lab: {
          programs: [{ name: 'dht11_lcd.ino', label: '温湿度 LCD', code: DHT }],
          parts: [
            { type: 'board' },
            { type: 'dht11', pin: 8, temperature: 24, humidity: 46, label: '温湿度模块 OUT→D8' },
            { type: 'lcd1602', addr: 0x27, label: 'LCD1602（I2C 0x27）SDA→A4 SCL→A5' }
          ],
          i2c: [0x27],
          baud: 9600,
          tasks: [
            { text: '运行：LCD 第 1 行 <code>Tep: 24.00C</code>，第 2 行 <code>Hum: 46.00%</code>。拖温度、湿度滑块，LCD 跟着变（DHT11 一秒内重复读取会给上一次的数据，所以要等一会儿）。' },
            { text: '拧 LCD 下面的“背面对比度旋钮”：太低看不见字，太高满屏方块。屏幕亮了却没有字，先查它。' },
            { text: '把第 25 行的 <code>delay(200)</code> 改成 <code>delay(2000)</code>：每 2 秒读一次，符合 DHT11 的要求。拖滑块，LCD 最多 2 秒后才变。', code: DHT_SLOW },
            { text: '在第 25 行前面加一句 <code>Serial.println(<wbr>DHT11.humidity);</code>：串口监视器里也能看湿度（setup() 里已经打开了串口）。同一个数据，可以同时显示在两个地方。', code: DHT_SERIAL },
            { text: '把第 7 行的地址 <code>0x27</code> 改成 <code>0x3F</code>：屏幕上一个字也没有，卡片提示“地址不对”。地址必须和屏幕一致（常见 0x27，有的屏是 0x3F）。', code: DHT_3F }
          ],
          smoke: [
            { expect: { lcd: ['Tep: 24.00C', 'Hum: 46.00%'], part: ['lcd1602', 'backlight', '1'] }, timeout: 3000 },
            { slider: 'dht11', value: 30 },
            { slider: 'dht11', index: 1, value: 60 },
            { expect: { lcd: ['Tep: 30.00C', 'Hum: 60.00%'], part: ['dht11', 'temperature', '30'] }, timeout: 4000 },
            { task: 3, run: true },
            { expect: { lcd: ['Tep: 30.00C', 'Hum: 60.00%'] }, timeout: 4000 },
            { task: 4, run: true },
            { expect: { serialRe: '(^|\\n)60\\n', lcd: ['Tep: 30.00C', 'Hum: 60.00%'] }, timeout: 4000 },
            { task: 5, run: true },
            { expect: { lcd: ['', ''], part: ['lcd1602', 'backlight', '0'], read: ['lcd1602', '地址不对'] }, timeout: 3000 }
          ]
        }
      },
      {
        kind: 'figure', title: '实验结果：LCD 第一行温度，第二行湿度',
        desc: '原指南：结果显示在 LCD 上，第一行显示温度，第二行显示湿度。',
        img: 'img/l22/dht_result_photo.jpg', caption: '原指南实物：LCD 显示 Tep: 24.00C / Hum: 46.00%',
        side: `
<div class="card">${lcdSvg(['Tep: 24.00C', 'Hum: 46.00%'], false)}</div>
${callout('question', '为什么总是 .00？', 'DHT11 只测到整数精度，程序用 <code>(float)</code> 保留 2 位小数显示，就成了 24.00。')}
${callout('hand', '试一试', '对着传感器哈一口气，湿度很快上升；用手捂住，温度慢慢上升。', 'gray')}`
      },
      {
        kind: 'figure', title: '扩展板接法和常见坑',
        desc: '有 Sensor V5.0 扩展板时接线更方便；读得太勤、LCD 没字是两个最常见的问题。',
        img: 'img/l22/dht_shield_photo.jpg', caption: '原指南：扩展板接法（屏幕显示 Tep:30 C / Hum:45 %）',
        side: `
${callout('plug', '原指南', '套件中有 Sensor V5.0 扩展板时，可以按照图里的方法接线，更加方便。照片里屏幕显示“Tep:30 C / Hum:45 %”，没有小数，是另一版程序的显示格式，不影响接线。')}
${warn('读得太勤', '<code>delay(200)</code> 太短：DHT11 两次读取最好间隔 1 秒以上，改成 <code>delay(2000)</code> 更稳。')}
${warn('LCD 亮了却没有字', '先拧背面蓝色电位器调对比度；还不行就查地址：常见是 0x27，有的屏是 0x3F。')}`
      },

      // ================================================================ 小结
      {
        kind: 'summary', kicker: '2-2 测距、通信与环境感知　/　小结', title: '本课小结',
        desc: '四个传感器，一条主线：测时间算距离、读字符拼数字、读高低做判断、按时序收数据。',
        items: [
          { title: '超声波测距', text: 'Trig 喊一声，<code>pulseIn()</code> 量 Echo 高电平的微秒数，÷ 58 = 厘米。' },
          { title: '串口调舵机', text: '<code>Serial.read()</code> 一次读 1 个字符，用 String 拼起来，<code>toInt()</code> 变成角度；行结束符选“没有结束符”。' },
          { title: '红外避障', text: '有障碍物读到 0，检测距离用蓝色电位器调。程序和 1-3 磁簧开关一样：输入换了，逻辑不变。' },
          { title: '温湿度 DHT11', text: '一根线传 40 位，高电平长短 = 0 / 1；库替我们读，<code>DHT11.temperature</code> 取值，读取间隔 ≥ 1 秒。' }
        ],
        body: `
<div class="grid-2">
  ${card('code', '本节新语法', chips(['const', 'delayMicroseconds()', 'pulseIn()', 'available()', 'read()', 'String', 'toInt()', 'constrain()', '#include', '#define', '对象.成员', 'setCursor()']))}
  ${card('flag', '课后小挑战', '<p>选一个传感器做个小装置：会提醒“离屏幕太近”的台灯，或会显示温湿度的桌面小摆件，下节课分享。</p>', 'dark')}
</div>`
      },
      { kind: 'end', title: '会测量，也会“说话”', subtitle: '把超声波、红外和温湿度装进你的设计，让作品感知周围的世界。\n下一节：2-3 显示模块（WS2812b 灯环 · LCD1602）' }
    ]
  });
})();
