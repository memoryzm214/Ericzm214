// Visual smoke test of lib/vti.js — not a deliverable.
const V = require('../lib/vti');
const { P, G } = V;

const AD = `int  ADPIN  = A0 ;
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
}`;

(async () => {
  const deck = await V.Deck.create({ label: '1-2　模拟输入实验', title: 'sample' });
  const I = await deck.loadIcons({ bulb: 'FaLightbulb', warn: 'FaExclamation', plug: 'FaPlug', eye: 'FaEye' });

  deck.cover({ kicker: '开源硬件与 AI 辅助编程　/　第 1 讲 · 第 2 节', title: '1-2　模拟输入实验', subtitle: 'AD 模数转换 · 光敏电阻模块' });

  deck.section('AD 模数转换');
  deck.divider({
    kicker: '实验 01', title: 'AD 模数转换实验', desc: '把“连续变化的电压”变成 Arduino 能看懂的数字 0～1023。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识模拟量', sub: '电压、光线、温度……' },
      { fill: P.gray1, big: '02', title: '接线', sub: '电位器 → A0' },
      { fill: P.ink, big: '03', title: '读代码', sub: 'analogRead()' },
      { fill: P.white, big: '04', title: '看结果', sub: '串口监视器' },
    ],
  });

  let s = deck.slide({ title: '代码（1/2）', desc: '先认识四个“盒子”，再看 setup() 里做的准备工作。' });
  const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.6, h: 3.65, code: AD, file: 'ad_convert.ino', right: '第 1–15 行', from: 1, to: 15, hl: [1, 9, 14, 15] });
  V.explain(s, b, { x: 6.3, w: 3.25, title: '逐行看懂', maxY: G.bottom, items: [
    { line: 1, text: '电位器中间脚接 A0，给这个引脚起名 ADPIN' },
    { line: 9, text: '打开串口，速度 9600（注释写 115200 是笔误）' },
    { line: 14, text: '读电压：0V→0，5V→1023' },
    { line: 15, text: '(float) 先把整数变小数，否则 338/1023 = 0' },
  ] });

  s = deck.slide({ title: '接线', desc: '电位器两端接 5V 和 GND，中间脚接 A0；LED 经 220Ω 电阻接 13 号脚。' });
  V.imageBox(s, { file: 'pdf/ad_wiring.jpg', x: G.L, y: G.top, w: 5.0, h: 3.65, diagram: true, caption: '原指南接线图' });
  V.wiring(s, { x: 5.8, y: G.top, w: 3.75, right: '10K 电位器', rows: [['5V', '一端'], ['A0', '中间引脚'], ['GND', '另一端']] });
  V.wiring(s, { x: 5.8, y: G.top + 1.45, w: 3.75, right: 'LED', rows: [['13', '正极（经 220Ω）'], ['GND', '负极']] });
  V.tip(s, { x: 5.8, y: 4.15, w: 3.75, h: 0.85, title: '小贴士', text: 'LED 长脚是正极。' }, I.bulb);

  s = deck.slide({ title: '实验结果', desc: '转动旋钮，读数和电压一起变。' });
  V.imageBox(s, { file: 'pdf/ad_result_photo.jpg', x: G.L, y: G.top, w: 4.6, h: 3.65, caption: '实物连接' });
  V.imageBox(s, { file: 'pdf/ad_serial_monitor.jpg', x: 5.25, y: G.top, w: 2.1, h: 3.65, diagram: true, caption: '串口输出' });
  V.serialMonitor(s, { x: 7.55, y: G.top, w: 2.0, h: 2.2, lines: ['get ad pin value 399', 'voltage =', '1.95'] });
  V.tip(s, { x: 7.55, y: 3.75, w: 2.0, h: 1.25, kind: 'warn', title: '注意', text: '波特率选 9600' }, I.warn_w);

  s = deck.slide({ title: '原理：模拟量 → 数字量', desc: '公式和流程。' });
  V.card(s, { x: G.L, y: G.top, w: 4.3, h: 1.4 });
  V.formula(s, { x: G.L + 0.3, y: G.top + 0.25, h: 0.9, lhs: 'V =', num: '读数', den: '1023', rhs: '× 5V', size: 22 });
  V.steps(s, { x: G.L, y: 3.0, w: G.cw, h: 2.0, focus: 1, items: [
    { title: '电位器', sub: '旋钮把 0～5V 分出来' }, { title: 'analogRead()', sub: '变成 0～1023', mono: true }, { title: '换算', sub: '× 5 ÷ 1023' }, { title: 'Serial', sub: '打印到电脑' },
  ] });
  V.tags(s, ['analogRead', 'float', '(float)', 'Serial.print'], { x: 5.2, y: G.top, w: 4.3 });
  V.table(s, [['类型', '存什么', '例子'], ['int', '整数', 'int a = 5;'], ['float', '小数', 'float v = 1.5;']], { x: 5.2, y: 1.9, w: 4.35, colW: [1.0, 1.35, 2.0], monoCols: [0, 2] });

  deck.end({ title: '先让它跑起来，再让它变得有趣。', subtitle: '改一个数字、换一个引脚——每次修改都是一次设计。' });
  await deck.save(__dirname + '/../output/_sample.pptx');
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
