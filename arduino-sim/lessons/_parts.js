/* lessons/_parts.js — 元件一览（#_parts，不在首页显示）
   A catalogue for lesson authors: every part type of SIM_SPEC §4 that lessons/_demo.js does not use,
   running on the real engine, with the smoke steps that drive it (test/smoke.js walks this lesson).
   Labs: digital input modules · pot + LED bar + active buzzer · LDR + RGB LED + tone() ·
         joystick (guide 2-1 程序 5) · ultrasonic (guide 2-2 程序 1) · DHT11 + LCD (guide 2-2 程序 4) ·
         WS2812 ring (guide 2-3 程序 1). Guide programs are copied verbatim from arduino-ppt/assets/lXX/guide_text.md.
   Lesson files are data only: they call SIM.deck.register({...}). */
(function () {
  'use strict';
  const SIM = window.SIM;
  const I = n => SIM.icon(n);

  // ---- small programs written for this catalogue
  const DIGITAL = `
// 六个开关类模块，各接一个数字口；v[] 里是每个口读到的 0 / 1（看右下角“变量”）
int pins[6] = {2, 3, 4, 5, 6, 7};   // 触摸 限位 倾斜 磁簧 红外 按键
int v[6];

void setup() {
  for (int i = 0; i < 6; i++) {
    pinMode(pins[i], INPUT);
  }
}

void loop() {
  for (int i = 0; i < 6; i++) {
    v[i] = digitalRead(pins[i]);
  }
  delay(50);
}
`;
  const BAR = `
// 电位器 → 8 个 LED 的“音量条”；拧到底时有源蜂鸣器响
int leds[8] = {2, 3, 4, 5, 6, 7, 8, 9};
int value = 0;
int n = 0;

void setup() {
  for (int i = 0; i < 8; i++) {
    pinMode(leds[i], OUTPUT);
  }
  pinMode(12, OUTPUT);
}

void loop() {
  value = analogRead(A0);
  n = map(value, 0, 1023, 0, 8);
  for (int i = 0; i < 8; i++) {
    digitalWrite(leds[i], i < n ? LOW : HIGH);   // 共阳接法：LOW 才亮
  }
  digitalWrite(12, n == 8 ? HIGH : LOW);
  delay(20);
}
`;
  const LIGHT = `
// 光敏电阻 → RGB 灯：越亮越红、越暗越蓝；用手盖住时无源蜂鸣器用 tone() 响 440Hz
int light = 0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  light = analogRead(A1);
  analogWrite(11, light / 4);
  analogWrite(10, 0);
  analogWrite(9, 255 - light / 4);
  if (light < 100) {
    tone(8, 440);
  } else {
    noTone(8);
  }
  Serial.println(light);
  delay(100);
}
`;
  const JOYSTICK = `
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
  const DHT_LCD = `
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

  const card = (t, body) => `<div class="card"><h3><span class="ico">${I('cube')}</span>${t}</h3>${body}</div>`;

  SIM.deck.register({
    id: '_parts',
    no: 'PARTS',
    title: '元件一览',
    subtitle: '给写课件的人看：每种虚拟元件长什么样、怎么配置、smoke 怎么驱动',
    experiments: ['开关类输入', '电位器与 LED 条', '光敏与 RGB 灯', '摇杆', '超声波', '温湿度 + LCD', '灯环'],
    slides: [
      { kind: 'cover', kicker: 'Arduino 互动实验室　·　元件一览', title: '元件一览', subtitle: '19 种虚拟元件里，演示课没用到的 12 种\n配置写法见 AUTHORING_LESSONS.md' },
      {
        kind: 'html',
        title: '这一课给谁看',
        desc: '写 lessons/l12.js … l23.js 的人：先在这里看看每种元件的样子和交互，再照抄配置。',
        body: `
<div class="grid-3">
  ${card('开关类输入', '<p><code>touch</code> <code>limitSwitch</code> <code>tilt</code> <code>reed</code> <code>ir</code> <code>button</code>：按住 / 拖动 / 滑块，读到 0 或 1。</p>')}
  ${card('模拟输入', '<p><code>pot</code>（旋钮 + 滑块，可接 3.3V）、<code>ldr</code>（光照滑块 + 用手盖住）、<code>joystick</code>（松手回中）。</p>')}
  ${card('输出', '<p><code>led</code> <code>ledBar</code> <code>rgbLed</code> <code>buzzer</code>（有源 / 无源）<code>servo</code> <code>lcd1602</code> <code>neopixel</code>。</p>')}
</div>
<div class="callout mt"><span class="ico">${I('info')}</span><div>每个实验室页都带 <code>smoke</code> 步骤：<code>node test/smoke.js _parts</code> 会自动按键、拖滑块、拧旋钮，并检查变量、串口和元件状态。</div></div>`
      },

      { kind: 'section', no: '实验 01', title: '开关类输入模块', desc: '六种“开关”，六种操作方法，读到的都只是 0 或 1。', tiles: [{ title: '触摸', sub: '摸到 = 1' }, { title: '限位 / 按键', sub: '压下 = 0' }, { title: '倾斜', sub: '向帽盖端 >10° = 1' }, { title: '磁簧 / 红外', sub: '靠近 = 0' }] },
      {
        kind: 'lab',
        title: '动手：六个开关类模块',
        desc: '运行后逐个操作元件，看右下角“变量”里的 v[] 怎么变。',
        lab: {
          programs: [{ name: 'digital_inputs.ino', label: '六个数字输入', code: DIGITAL }],
          parts: [
            { type: 'board' },
            { type: 'touch', pin: 2, label: '触摸开关 SIG→D2' },
            { type: 'limitSwitch', pin: 3, label: '限位开关 OUT→D3' },
            { type: 'tilt', pin: 4, label: '倾斜开关 S→D4' },
            { type: 'reed', pin: 5, label: '小磁簧 S→D5', distanceCm: 4 },
            { type: 'ir', pin: 6, label: '红外避障 OUT→D6', distanceCm: 20, thresholdCm: 10 },
            { type: 'button', pin: 7, label: '按键 S→D7' }
          ],
          tasks: [
            { text: '逐个操作：摸触摸板、压限位开关、把倾斜滑块拖到右边、把磁铁拖近、把障碍物推近、按住按键。' },
            { text: '哪几个模块“触发”时读到 0？哪几个读到 1？' }
          ],
          smoke: [
            { expect: { var: ['v', '{0,1,0,1,1,1}'] } },
            { press: 'touch' }, { expect: { var: ['v', '{1,1,0,1,1,1}'], part: ['touch', 'pressed', '1'] } }, { release: true },
            { press: 'limitSwitch' }, { expect: { var: ['v', '{0,0,0,1,1,1}'], part: ['limitSwitch', 'pressed', '1'] } }, { release: true },
            { slider: 'tilt', value: 30 }, { expect: { var: ['v', '{0,1,1,1,1,1}'], part: ['tilt', 'open', '1'] } },
            { slider: 'tilt', value: -20 }, { expect: { var: ['v', '{0,1,0,1,1,1}'] } },
            { slider: 'reed', value: 1 }, { expect: { var: ['v', '{0,1,0,0,1,1}'], part: ['reed', 'closed', '1'] } },
            { slider: 'reed', value: 5 },
            { key: 'ArrowLeft', part: 'ir', target: 'g.drag', times: 14 }, { expect: { var: ['v', '{0,1,0,1,0,1}'], part: ['ir', 'detected', '1'], read: ['ir', '6 cm'] } },
            { press: 'button' }, { expect: { var: ['v', '{0,1,0,1,0,0}'] } }, { release: true },
            { expect: { var: ['v', '{0,1,0,1,0,1}'] } }
          ]
        }
      },

      { kind: 'section', no: '实验 02', title: '电位器、LED 条和有源蜂鸣器', desc: 'analogRead → map → 一排 LED；ledBar 默认共阳（LOW 亮），和 1-3 流水灯一样。', tiles: [{ title: 'pot', sub: '读数 0～1023' }, { title: 'ledBar', sub: 'activeLow 默认 true' }, { title: 'buzzer active', sub: '高电平就响' }, { title: 'map()', sub: '整数，向 0 截断' }] },
      {
        kind: 'lab',
        title: '动手：拧电位器点亮 LED 条',
        desc: '拧旋钮：亮几颗灯 = map(读数, 0, 1023, 0, 8)。拧到底蜂鸣器响。',
        lab: {
          programs: [{ name: 'pot_bar.ino', label: '电位器音量条', code: BAR }],
          parts: [
            { type: 'board' },
            { type: 'pot', pin: 'A0', label: '电位器 →A0', value: 0.5 },
            { type: 'buzzer', pin: 12, kind: 'active', label: '有源蜂鸣器 I/O→D12' },
            { type: 'ledBar', pins: [2, 3, 4, 5, 6, 7, 8, 9], activeLow: true, label: '8 个 LED（共阳）D2–D9' }
          ],
          tasks: [{ text: '把电位器从 0 慢慢拧到底：第几颗灯什么时候亮？为什么要拧到 1023 才 8 颗全亮？' }],
          smoke: [
            { expect: { part: ['ledBar', 'lit', 'D2,D3,D4,D5'], freq: ['buzzer', 0, 0] } },
            { knob: 'pot', to: 1 },
            { expect: { part: ['ledBar', 'lit', 'D2,D3,D4,D5,D6,D7,D8,D9'], freq: ['buzzer', 2300, 0.01], read: ['buzzer', '2.3 kHz'] } },
            { knob: 'pot', to: 0 },
            { expect: { part: ['ledBar', 'lit', ''], freq: ['buzzer', 0, 0], pin: [12, 0] } }
          ]
        }
      },

      { kind: 'section', no: '实验 03', title: '光敏电阻、RGB 灯和 tone()', desc: 'ldr 卡片上写着“本模拟：越亮读数越大”；无源蜂鸣器既能靠翻转出声，也认 tone()。', tiles: [{ title: 'ldr', sub: '光照滑块 · 用手盖住' }, { title: 'rgbLed', sub: 'pins:{r,g,b}' }, { title: 'tone(8, 440)', sub: '读数精确 440 Hz' }, { title: 'noTone(8)', sub: '停' }] },
      {
        kind: 'lab',
        title: '动手：用手盖住光敏电阻',
        desc: '拖光照滑块看 RGB 灯变色；点“用手盖住”：读数掉到 100 以下，蜂鸣器响 440Hz。',
        lab: {
          programs: [{ name: 'ldr_rgb.ino', label: '光敏调色', code: LIGHT }],
          parts: [
            { type: 'board' },
            { type: 'ldr', pin: 'A1', label: '光敏电阻 S→A1', light: 60 },
            { type: 'rgbLed', pins: { r: 11, g: 10, b: 9 }, label: 'RGB 模块 R11 G10 B9' },
            { type: 'buzzer', pin: 8, kind: 'passive', label: '无源蜂鸣器 I/O→D8' }
          ],
          tasks: [{ text: '把光照拖到 0% 和 100%，RGB 灯分别是什么颜色？串口里打印的数是多少？' }],
          smoke: [
            { expect: { serial: '614', part: ['rgbLed', 'rgb', '153,0,102'], freq: ['buzzer', 0, 0] } },
            { slider: 'ldr', value: 100 },
            { expect: { serial: '1023', part: ['rgbLed', 'rgb', '255,0,0'] } },
            { click: 'ldr' },
            { expect: { serial: '41', freq: ['buzzer', 440, 0.001], read: ['buzzer', '440 Hz'], part: ['ldr', 'value', '41'] } },
            { click: 'ldr' },
            { expect: { freq: ['buzzer', 0, 0] } }
          ]
        }
      },

      { kind: 'section', no: '实验 04', title: '摇杆扩展板', desc: '2-1 指南的原样程序：拖动摇杆打印方向，按住 A～F、K 打印按键。静止时 x≈525、y≈518。', tiles: [{ title: 'X → A0', sub: '右推变大' }, { title: 'Y → A1', sub: '上推变大' }, { title: 'A～F', sub: 'D2～D7，按下 = 0' }, { title: 'K', sub: 'D8，按下摇杆' }] },
      {
        kind: 'lab',
        title: '动手：摇杆和七个按键（指南原样程序）',
        desc: '拖动摇杆、按住 A～F 或 K，看串口打印什么。松手后摇杆自动回中。',
        lab: {
          programs: [{ name: 'joystick.ino', label: '摇杆', code: JOYSTICK }],
          parts: [
            { type: 'board' },
            { type: 'joystick', x: 'A0', y: 'A1', buttons: { 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'E', 7: 'F', 8: 'K' }, label: '摇杆扩展板' }
          ],
          tasks: [{ text: '往左拖摇杆：串口打印 <code> left</code>。为什么程序里用 520 和 530 两个数？' }],
          smoke: [
            { expect: { part: ['joystick', 'x', '525'], noSerial: 'left' } },
            { stick: [-0.8, 0] },
            { expect: { serial: ' left', read: ['joystick', 'X 105'] } },
            { release: true },
            { expect: { part: ['joystick', 'x', '525'] }, timeout: 2000 },
            { press: 'joystick', target: '[aria-label^="按键 B"]' },
            { expect: { serial: 'Button B is pressed', part: ['joystick', 'buttons', 'B'] } },
            { release: true },
            { key: 'k', part: 'joystick', target: 'g.drag', hold: true },
            { expect: { serial: 'Button k is pressed', part: ['joystick', 'buttons', 'K'] } },
            { release: true }
          ]
        }
      },

      { kind: 'section', no: '实验 05', title: '超声波测距', desc: '2-2 指南的原样程序：Trig 发 10µs 脉冲，pulseIn 量 Echo 高电平时间，÷58 得到厘米。', tiles: [{ title: 'Trig → D2', sub: '≥10µs 高电平' }, { title: 'Echo → D3', sub: 'pulseIn(HIGH)' }, { title: '÷ 58', sub: 'µs → cm' }, { title: '2～400 cm', sub: '超出返回 0' }] },
      {
        kind: 'lab',
        title: '动手：拖动障碍物测距离（指南原样程序）',
        desc: '拖障碍物或滑块改变距离，每秒打印一次。',
        lab: {
          programs: [{ name: 'ultrasonic.ino', label: '超声波', code: ULTRA }],
          parts: [{ type: 'board' }, { type: 'ultrasonic', trig: 2, echo: 3, label: '超声波 Trig→D2 Echo→D3' }],
          sensors: { ultrasonic: { trig: 2, echo: 3, distanceCm: 15 } },
          tasks: [{ text: '把障碍物放到 50cm，串口打印多少？把 <code>58.00</code> 改成 <code>58</code> 会怎样？', code: ULTRA.replace('58.00', '58') }],
          smoke: [
            { expect: { serial: 'distance is :15.00cm', part: ['ultrasonic', 'distance', '15'] }, timeout: 3000 },
            { slider: 'ultrasonic', value: 50 },
            { expect: { serial: 'distance is :50.00cm' }, timeout: 3000 },
            { key: 'ArrowRight', part: 'ultrasonic', target: 'g.drag', times: 3 },
            { expect: { serial: 'distance is :53.00cm', part: ['ultrasonic', 'distance', '53'] }, timeout: 3000 },
            { task: 1, run: true },
            { expect: { serial: 'distance is :53.00cm' }, timeout: 3000 }
          ]
        }
      },

      { kind: 'section', no: '实验 06', title: '温湿度传感器 + LCD', desc: '2-2 指南的原样程序：DHT11 读温湿度，显示在 I2C LCD1602 上。', tiles: [{ title: 'DHT11 → D8', sub: '整数温湿度' }, { title: 'LCD 0x27', sub: 'SDA A4 · SCL A5' }, { title: '(float)… , 2', sub: '24.00' }, { title: '读取间隔', sub: '<1 秒返回旧数据' }] },
      {
        kind: 'lab',
        title: '动手：温湿度显示在 LCD 上（指南原样程序）',
        desc: '拖动温度、湿度滑块，LCD 上的数字跟着变。',
        lab: {
          programs: [{ name: 'dht11_lcd.ino', label: '温湿度 LCD', code: DHT_LCD }],
          parts: [
            { type: 'board' },
            { type: 'dht11', pin: 8, label: 'DHT11 S→D8', temperature: 24, humidity: 46 },
            { type: 'lcd1602', addr: 0x27, label: 'LCD1602（I2C 0x27）' }
          ],
          i2c: [0x27],
          tasks: [{ text: '把温度拖到 35°C：LCD 要过多久才变？（DHT11 一秒内重复读取会返回上一次的数据）' }],
          smoke: [
            { expect: { lcd: ['Tep: 24.00C', 'Hum: 46.00%'] }, timeout: 3000 },
            { slider: 'dht11', value: 30 },
            { slider: 'dht11', index: 1, value: 60 },
            { expect: { lcd: ['Tep: 30.00C', 'Hum: 60.00%'], part: ['dht11', 'temperature', '30'] }, timeout: 4000 }
          ]
        }
      },

      { kind: 'section', no: '实验 07', title: 'WS2812 灯环', desc: '2-3 指南的原样程序：12 颗灯全部写成白色 (127,127,127)，亮度 30。', tiles: [{ title: 'D10', sub: '数据线' }, { title: 'setPixelColor', sub: '写草稿' }, { title: 'show()', sub: '真正点亮' }, { title: 'setBrightness(30)', sub: '127 → 15' }] },
      {
        kind: 'lab',
        title: '动手：点亮 12 颗灯（指南原样程序）',
        desc: '运行后 12 颗灯亮白光；卡片读数是 show() 之后、按亮度缩放过的颜色。',
        lab: {
          programs: [{ name: 'ws2812.ino', label: '灯环', code: RING }],
          parts: [{ type: 'board' }, { type: 'neopixel', pin: 10, count: 12, label: 'WS2812 灯环 DIN→D10' }],
          tasks: [{ text: '把 <code>Color(127, 127, 127)</code> 改成 <code>Color(127, 0, 0)</code>：变成什么颜色？', code: RING.replace('pixels.Color(127, 127, 127)', 'pixels.Color(127, 0, 0)') }],
          smoke: [
            { expect: { part: ['neopixel', 'lit', '12'], read: ['neopixel', 'RGB(15,15,15)'] } },
            { task: 1, run: true },
            { expect: { part: ['neopixel', 'first', '15,0,0'] } }
          ]
        }
      },
      { kind: 'end', title: '元件一览结束', subtitle: '配置和 smoke 步骤的写法见 AUTHORING_LESSONS.md' }
    ]
  });
})();
