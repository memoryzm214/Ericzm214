/* lessons/_demo.js — 组件演示课（#_demo）
   One slide of every kind + six labs, using the exact programs from the guides:
     (a) 1-2 按键模块实验（guide l12 程序 1）· (b) 2-1 PWM 调节 LED 灯亮度（guide l21 程序 1）·
     (c) 2-3 LCD1602 显示字符（guide l23 程序 ②）· (d) 1-3 无源蜂鸣器 frequence_1/2（guide l13 程序 5）·
     (e) 2-2 串口调节舵机（guide l22 程序 2）· (f) 2-3 I2C 扫描：补好 Wire.h 的版本 + 原样版（guide l23 程序 ①）
   test/smoke.js walks every slide and drives every lab of this lesson.
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- programs copied verbatim from arduino-ppt/assets/*/guide_text.md
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

  const BUZZER = `
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
  const SERVO_SERIAL = `
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

  SIM.deck.register({
    id: '_demo',
    no: 'DEMO',
    title: '组件演示',
    subtitle: '每种讲解页 + 六个动手实验室',
    experiments: ['按键模块实验', 'PWM 调节 LED 灯亮度实验', '串行 LCD1602 显示屏实验', '无源蜂鸣器实验', '串口调节舵机角度实验', 'I2C 地址扫描'],
    slides: [
      {
        kind: 'cover',
        kicker: 'Arduino 互动实验室　·　组件演示',
        title: '组件演示课',
        subtitle: '每种讲解页各一页\n按键 · PWM 调光 · LCD1602 · 蜂鸣器 · 串口舵机 · I2C 扫描'
      },

      // ------------------------------------------------ 实验 01 按键
      {
        kind: 'section', no: '实验 01', title: '按键模块实验',
        desc: '第一次用引脚的 <b>INPUT</b> 功能：读按键的高低电平，再用它控制 LED 亮灭。',
        tiles: [
          { title: '原理', sub: '按下 = 低电平' },
          { title: '接线', sub: '按键 → D7，LED → D11' },
          { title: '代码', sub: 'digitalRead · if / else' },
          { title: '结果', sub: '按下就亮，松开就灭' }
        ]
      },
      {
        kind: 'html',
        title: '认识按键模块：从“输出”到“输入”',
        desc: '以前 Arduino 只“说话”（输出）；这次它要“听”（输入）——听按键有没有被按下。',
        body: `
<div class="grid-2">
  <div class="card">
    <h3><span class="ico">${I('bulb')}</span>以前：OUTPUT 输出</h3>
    <p>Arduino <b>说话</b>：用 <code>digitalWrite(11, HIGH)</code> 让引脚变成 5V，点亮 LED。</p>
  </div>
  <div class="card dark">
    <h3><span class="ico">${I('hand')}</span>现在：INPUT 输入</h3>
    <p>Arduino <b>听</b>：用 <code>digitalRead(7)</code> 读引脚上是高（1）还是低（0），就知道按键有没有按下。</p>
  </div>
</div>
<div class="grid-3 mt">
  <div class="tile turq"><div class="n">D7</div><b>按键模块 S</b><span>输入：读按键</span></div>
  <div class="tile"><div class="n">D11</div><b>LED +</b><span>输出：亮 / 灭</span></div>
  <div class="tile dark"><div class="n">D0 D1</div><b>先空着</b><span>上传程序时要用串口</span></div>
</div>
<div class="grid-2 mt">
  <div class="callout"><span class="ico">${I('question')}</span><div><b>打个比方</b><p>按键像门铃按钮：模块里有个“上拉电阻”，平时把 S 脚拉到 5V（读到 1）；按下去 S 脚接地，读到 0。</p></div></div>
  <div class="card warn"><h3><span class="ico red">${I('warn')}</span>原指南这里写反了</h3><p>原文说“按下时 D7 是高电平”。模块背面丝印是 <span class="tag outline">按下输出低电平</span>，程序也是 <code>value == LOW</code> 时点灯——以程序为准。</p></div>
</div>`
      },
      {
        kind: 'figure',
        title: '按键开关模块长什么样',
        desc: '红色大按键 + 三根针脚：S（信号）、V（5V）、G（地）。点图片可以放大。',
        img: 'img/l12/btn_module_photo.jpg',
        caption: '按键开关模块 正面 / 反面（反面丝印：Key switch, Press output low）',
        side: `
<div class="card">
  <h3><span class="ico">${I('eye')}</span>看图找三件事</h3>
  <ol class="steps">
    <li>三个针脚：<b>S</b> 接数字口，<b>V</b> 接 5V，<b>G</b> 接 GND。</li>
    <li>反面丝印 <span class="tag pale">按下输出低电平</span>：按下 → 读到 0。</li>
    <li>模块自带上拉电阻，所以松开时稳定读到 1，不会“浮空”。</li>
  </ol>
</div>
<div class="callout gray"><span class="ico gray">${I('book')}</span><div>D0～D13 都能接按键；D0、D1 兼做串口，上传程序时会冲突，所以先不用。</div></div>`
      },
      {
        kind: 'wiring',
        title: '接线：按键接 D7，LED 接 D11',
        desc: '一共 5 根线：按键模块 3 根，LED 2 根（LED 串一个 220Ω 电阻保护）。',
        img: 'img/l12/btn_wiring.jpg',
        caption: '按键模块 + 面包板上的 LED 和电阻',
        tables: [
          { left: 'Arduino Uno', right: '按键模块', rows: [['7', 'S'], ['GND', 'G'], ['5V', 'V']] },
          { left: 'Arduino Uno', right: 'LED 灯', rows: [['11', '+（长脚）'], ['GND', '-（短脚）']] }
        ],
        note: 'LED 长脚是正极（+）。接反了不会坏，只是不亮——这时先检查方向。'
      },
      {
        kind: 'code',
        title: '代码逐行看懂：loop() 里的 if / else',
        desc: '每一圈 loop() 都先读按键，再决定 LED 亮还是灭。左边行号和原程序一致。',
        file: 'button.ino',
        code: BUTTON,
        from: 10, to: 22,
        hl: [13],
        notes: [
          { line: 12, text: '<code>digitalRead(7)</code> 读 D7：松开读到 1（HIGH），按下读到 0（LOW），结果存进 <code>value</code>。' },
          { line: 13, text: '<code>value == LOW</code> 就是“按键被按下了”。注意是两个等号：比较，不是赋值。' },
          { line: [14, 17], text: '按下 → D11 输出 HIGH → LED 亮。' },
          { line: [18, 21], text: '否则（松开）→ 输出 LOW → LED 灭。原注释也写成了 “down”，其实是松开。' }
        ],
        foot: '<div class="callout"><span class="ico">' + I('bolt') + '</span><div><b>loop() 跑得有多快？</b><p>这段 loop() 里没有 delay，一秒能转几万圈，所以一按下灯就立刻亮。</p></div></div>'
      },
      {
        kind: 'lab',
        title: '动手实验室：按键控制 LED',
        desc: '点 ▶ 运行，然后按住“虚拟电路”里的红色按键（也可以用 Tab 选中它再按住空格）。',
        lab: {
          programs: [{ name: 'button.ino', label: '按键程序', code: BUTTON }],
          parts: [
            { type: 'board' },
            { type: 'button', pin: 7, label: '按键模块 S→D7' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED +→D11' }
          ],
          tasks: [
            { text: '点 ▶ 运行，按住按键：LED 亮了吗？松开呢？同时看右下角“引脚”里 D7 和 D11 的变化。' },
            { text: '把第 13 行的 <code>LOW</code> 改成 <code>HIGH</code> 再运行：按键的作用反过来了吗？', code: BUTTON.replace('if( value == LOW )', 'if( value == HIGH )') },
            { text: '速度选 <b>0.1× 慢动作</b>，勾上“跟随行”，按住按键看高亮的执行行走 if 还是 else。' }
          ],
          // test/smoke.js: press the button part → D11 HIGH, LED lit; release → LOW
          smoke: [
            { expect: { pin: [11, 0], part: ['led', 'brightness', '0.000'] } },
            { press: 'button' },
            { expect: { pin: [11, 1], part: ['led', 'brightness', '/^(0\\.[5-9]|1)/'], var: ['value', 0] } },
            { release: true },
            { expect: { pin: [11, 0], var: ['value', 1] } }
          ]
        }
      },

      // ------------------------------------------------ 实验 02 PWM
      {
        kind: 'section', no: '实验 02', title: 'PWM 调节 LED 灯亮度实验',
        desc: '电位器给 A0 一个 0～1023 的读数，程序把它换算成 PWM 占空比，LED 就能“半亮”。',
        tiles: [
          { title: '原理', sub: '占空比 = 平均电压' },
          { title: '接线', sub: '电位器 → A0，LED → D11' },
          { title: '代码', sub: 'analogRead · analogWrite' },
          { title: '结果', sub: '拧旋钮，灯渐亮渐暗' }
        ]
      },
      {
        kind: 'tasks',
        title: '先想一想：PWM 是怎么让灯“半亮”的？',
        desc: '带着这三个问题去下一页的实验室里找答案。',
        items: [
          { title: '一秒开关几百次', text: 'D11 的 PWM 约 490Hz：开关快到眼睛分不清，只看到平均亮度。' },
          { title: '占空比 50% ≈ 2.5V', text: '<code>analogWrite(11, 128)</code>：一半时间 5V、一半时间 0V。' },
          { title: '最大只能写 255', text: '写 256 会“溢出”变成 0——这个程序拧到底时就会遇到。' }
        ]
      },
      {
        kind: 'lab',
        title: '动手实验室：电位器调 LED 亮度',
        desc: '运行后拖动电位器旋钮（或下面的滑块），看 LED 亮度和串口里的三个数一起变。',
        lab: {
          programs: [{ name: 'pwm_led.ino', label: '电位器调亮度', code: PWM }],
          parts: [
            { type: 'board' },
            { type: 'pot', pin: 'A0', label: '电位器 中间脚→A0' },
            { type: 'led', pin: 11, color: '#ff4d4f', label: 'LED +→D11（PWM）' }
          ],
          baud: 9600,
          tasks: [
            { text: '运行后慢慢拧电位器：LED 亮度、串口里的 <code>value1</code>、<code>voltage</code>、<code>PWM</code> 一起变。' },
            { text: '把电位器拧到底（读数 1023）：PWM 变成 256，灯反而灭了！看“引脚”里 D11 的 PWM 条。' },
            { text: '把第 19 行的 <code>256</code> 改成 <code>255</code> 再拧到底试试。', code: PWM.replace('voltage * 256', 'voltage * 255') },
            { text: '把串口监视器的波特率改成 115200：出现乱码；改回 9600 就正常了。' }
          ],
          smoke: [
            { knob: 'pot', to: 0.25 },
            { expect: { serialRe: 'value1==2[3-8]\\d\\s+voltage==0\\.2\\d\\s+PWM==(5\\d|6\\d|7\\d)', pwm: [11, 50, 79] } },
            { knob: 'pot', to: 1 },
            { expect: { serial: 'value1==1023     voltage==1.00    PWM==256', pwm: [11, 0, 0], part: ['led', 'brightness', '0.000'] } },
            { baud: 115200, expect: { garbled: true } },
            { baud: 9600, wait: 200, expect: { garbled: false } }
          ]
        }
      },

      // ------------------------------------------------ 实验 03 LCD
      {
        kind: 'section', no: '实验 03', title: '串行 LCD1602 显示屏实验',
        desc: '带 I2C 转接板的 LCD1602 只用 SDA、SCL 两根信号线，就能显示 2 行 × 16 个字符。',
        tiles: [
          { title: '原理', sub: 'I2C 地址 0x27' },
          { title: '接线', sub: 'SDA → A4，SCL → A5' },
          { title: '代码', sub: 'setCursor(列, 行) · print' },
          { title: '结果', sub: 'Hello Word / Science Robo' }
        ]
      },
      {
        kind: 'lab',
        title: '动手实验室：LCD 显示文字',
        desc: '点 ▶ 运行看屏幕上的两行字。拧屏幕下面的对比度旋钮，看看太低、太高会怎样。',
        lab: {
          programs: [
            { name: 'lcd_hello.ino', label: '显示文字', code: LCD }
          ],
          parts: [
            { type: 'board' },
            { type: 'lcd1602', addr: 0x27, label: 'LCD1602 显示屏（I2C 0x27）' }
          ],
          i2c: [0x27],
          tasks: [
            { text: '运行“显示文字”：第 1 行 <code>Hello Word</code>，第 2 行从第 5 格开始——<code>Science Robot</code> 最后的 t 去哪了？' },
            { text: '拧 LCD 下面的对比度旋钮：太低看不见字，太高满屏方块，中间刚好。' },
            { text: '把 <code>lcd.setCursor(4,1)</code> 改成 <code>lcd.setCursor(0,1)</code>，13 个字母就都显示出来了。', code: LCD.replace('lcd.setCursor(4,1)', 'lcd.setCursor(0,1)') },
            { text: '把第 4 行的地址 <code>0x27</code> 改成 <code>0x3F</code> 再运行：屏幕亮了却没有字——地址必须和扫描到的一致。', code: LCD.replace('lcd(0x27,16,2)', 'lcd(0x3F,16,2)') }
          ],
          smoke: [
            { expect: { lcd: ['Hello Word', '    Science Robo'], part: ['lcd1602', 'backlight', '1'] } }
          ]
        }
      },

      // ------------------------------------------------ 实验 04 无源蜂鸣器
      {
        kind: 'section', no: '实验 04', title: '无源蜂鸣器实验',
        desc: '无源蜂鸣器自己不会响，要程序让引脚<b>一高一低</b>来回翻转；翻转得越快，音调越高。',
        tiles: [
          { title: '原理', sub: '翻转频率 = 音调' },
          { title: '接线', sub: '蜂鸣器 I/O → D9' },
          { title: '代码', sub: 'frequence_1 · frequence_2' },
          { title: '结果', sub: '只听到 250Hz 那一段' }
        ]
      },
      {
        kind: 'code',
        title: '代码逐行看懂：delay(0.5) 其实是 delay(0)',
        desc: '两个函数长得几乎一样，只差 delay 里的数。注释写着 1kHz 和 250Hz——实际呢？',
        file: 'buzzer_passive.ino',
        code: BUZZER,
        from: 1, to: 36,
        hl: [9, 11, 21, 23],
        notes: [
          { line: [3, 13], text: '<code>frequence_1</code>：翻转 800 次。<code>delay()</code> 的参数是整数（unsigned long），<code>0.5</code> 被截成 <b>0</b>，所以根本没等，几十 kHz 的翻转人耳听不到。' },
          { line: [15, 25], text: '<code>frequence_2</code>：高 2ms + 低 2ms = 一个周期 4ms → <b>250Hz</b>，800 个周期正好 3.2 秒。' },
          { line: [30, 36], text: 'loop()：先“响”一下听不到的 frequence_1，停 1 秒，再响 3.2 秒 250Hz，再停 1 秒。' }
        ]
      },
      {
        kind: 'lab',
        title: '动手实验室：听一听两种频率',
        desc: '先点蜂鸣器卡片上的“开启声音”，再点 ▶ 运行。盯着频率读数：先闪过“频率太高”，1 秒后变成 250Hz。',
        lab: {
          programs: [{ name: 'buzzer_passive.ino', label: '无源蜂鸣器', code: BUZZER }],
          parts: [
            { type: 'board' },
            { type: 'buzzer', pin: 9, kind: 'passive', label: '无源蜂鸣器 I/O→D9' }
          ],
          tasks: [
            { text: '点“开启声音”后运行：能听到哪一段？频率读数分别显示什么？' },
            { text: '把 frequence_1 里的两个 <code>delay(0.5)</code> 都改成 <code>delay(1)</code>：周期 2ms，应该听到 500Hz。', code: BUZZER.replace(/delay\(0\.5\)/g, 'delay(1)') },
            { text: '用 <code>delayMicroseconds(500)</code> 代替 <code>delay(0.5)</code>：这才是真正的 1kHz。', code: BUZZER.replace(/delay\(0\.5\)/g, 'delayMicroseconds(500)') }
          ],
          // frequence_1 (delay(0.5) → delay(0)) is far above 20 kHz; frequence_2 is 250 Hz; no audio before the click
          smoke: [
            { expect: { freq: ['buzzer', 'high'], read: ['buzzer', '超过 20 kHz'], audio: 0 }, timeout: 1500 },
            { expect: { freq: ['buzzer', 250, 0.04], audio: 0 }, timeout: 4000 },
            { sound: true, expect: { audio: 1, text: ['.part[data-type=buzzer] .pbtn.sound', '声音：开'] } }
          ]
        }
      },

      // ------------------------------------------------ 实验 05 串口舵机
      {
        kind: 'section', no: '实验 05', title: '串口调节舵机角度实验',
        desc: '在串口监视器里输入一个角度发给 Arduino，程序把收到的字符拼成字符串，再转成数字让舵机转过去。',
        tiles: [
          { title: '原理', sub: '一次只能读 1 个字符' },
          { title: '接线', sub: '舵机信号线 → D13' },
          { title: '代码', sub: 'Serial.read · String · toInt' },
          { title: '结果', sub: '输入 90，舵机转到 90°' }
        ]
      },
      {
        kind: 'lab',
        title: '动手实验室：从串口发送角度',
        desc: '运行后在串口监视器输入框里输入 90，行结束符选“没有结束符”，点发送（或按回车）。',
        lab: {
          programs: [{ name: 'servo_serial.ino', label: '串口调舵机', code: SERVO_SERIAL }],
          parts: [
            { type: 'board' },
            { type: 'servo', pin: 13, label: '舵机 信号线→D13' }
          ],
          baud: 9600,
          lineEnding: 'none',
          tasks: [
            { text: '输入 <code>90</code> 发送：串口显示 <code>Servo degree: 90</code>，舵机转到 90°。再试 0、45、180。' },
            { text: '发送 <code>abc</code>：<code>toInt()</code> 转不出数字时得到 0，舵机回到 0°。' },
            { text: '发送 <code>300</code>：<code>write()</code> 最多转到 180°，看看舵机卡片上的角度。' },
            { text: '把第 30 行的 <code>delay(100)</code> 改成 <code>delay(2000)</code>，再快速发两次：两次输入会被拼在一起吗？', code: SERVO_SERIAL.replace('delay(100);', 'delay(2000);') }
          ],
          smoke: [
            { expect: { servo: [13, 0, 2] }, timeout: 3000 },
            { send: '90', ending: 'none' },
            { expect: { serial: 'Servo degree: 90', servo: [13, 90, 2], read: ['servo', '90°'] }, timeout: 4000 },
            { send: '300', ending: 'nl' },
            { expect: { serial: 'Servo degree: 300', servo: [13, 180, 2] }, timeout: 4000 }
          ]
        }
      },

      // ------------------------------------------------ 实验 06 I2C 扫描
      {
        kind: 'section', no: '实验 06', title: 'I2C 地址扫描',
        desc: '不知道 LCD 的地址？让 Arduino 从 8 到 119 挨个“点名”，有设备应答的地址就打印出来。',
        tiles: [
          { title: '原理', sub: '有应答 → 返回 0' },
          { title: '接线', sub: 'SDA → A4，SCL → A5' },
          { title: '代码', sub: 'Wire.beginTransmission' },
          { title: '结果', sub: 'Found address: 39 (0x27)' }
        ]
      },
      {
        kind: 'lab',
        title: '动手实验室：扫描 I2C 地址',
        desc: '第一个标签是补好 #include &lt;Wire.h&gt; 的版本；第二个是原指南的原样程序，运行会报编译错误。',
        lab: {
          programs: [
            { name: 'i2c_scanner.ino', label: '扫描地址（补好）', code: '#include <Wire.h>\n' + SCANNER, note: '在原指南程序的第一行补上了 <code>#include &lt;Wire.h&gt;</code>，其余一字未改。' },
            { name: 'i2c_scanner_原样.ino', label: '原指南原样', code: SCANNER, expect: 'error', note: '原指南的扫描程序少了第一行 <code>#include &lt;Wire.h&gt;</code>：运行看看错误提示，再自己补上。' }
          ],
          parts: [
            { type: 'board' },
            { type: 'lcd1602', addr: 0x27, label: 'LCD1602（I2C 0x27）' }
          ],
          i2c: [0x27],
          tasks: [
            { text: '运行“扫描地址（补好）”：串口里出现 <code>Found address: 39 (0x27)</code>——39 就是十六进制的 0x27。' },
            { text: '切到“原指南原样”点运行：读一读红色的编译错误，它指向第几行？' },
            { text: '在原样程序的第一行加上 <code>#include &lt;Wire.h&gt;</code> 再运行。', code: '#include <Wire.h>\n' + SCANNER, program: 1 }
          ],
          smoke: [
            { expect: { serial: 'Found address: 39 (0x27)' } },
            { expect: { serial: 'Found 1 device(s).' } },
            { tab: 1, run: true },
            { expect: { state: 'error', status: '/^编译错误：第 8 行：.*Wire.*没有声明.*#include <Wire\\.h>/', errLine: 8 } }
          ]
        }
      },

      {
        kind: 'summary',
        title: '本课小结',
        desc: '六个实验，几种和外界打交道的方式。',
        items: [
          { title: '数字输入', text: '<code>digitalRead</code> 只有 0 和 1；按键模块按下读到 0。' },
          { title: '模拟输入', text: '<code>analogRead</code> 读到 0～1023，对应 0～5V。' },
          { title: 'PWM 输出', text: '<code>analogWrite</code> 写 0～255，写 256 会溢出成 0。' },
          { title: 'I2C 显示', text: '先扫描确认地址（0x27），再 <code>init</code> → <code>backlight</code> → <code>setCursor</code> → <code>print</code>。' },
          { title: '声音', text: '无源蜂鸣器靠翻转出声；<code>delay()</code> 只收整数，<code>delay(0.5)</code> 等于 <code>delay(0)</code>。' },
          { title: '串口输入', text: '<code>Serial.read()</code> 一次读 1 个字符，拼成 String 再 <code>toInt()</code>。' }
        ]
      },
      { kind: 'end', title: '演示结束', subtitle: '正式课程从首页进入：1-2、1-3、2-1、2-2、2-3' }
    ]
  });
})();
