# 实验指南 2-1 转录（程序、接线、图片、讲解提示）

来源：用户提供的 2-1 实验指南 PDF（18 页）。正文原文见同目录 `guide_raw.txt`（PDF 文字层）；第 14–15 页（摇杆实验开头）是整页图片，文字层里没有，已在下面手工转录。PDF 原件可用 Read 工具按页查看。
**mBlock / Mixly 图形化编程** 部分按要求不收录（PDF 第 5、8、13 页的积木截图与说明）。

本指南共 4 个实验：
1. PWM 调节 LED 灯亮度实验（PDF 第 1–5 页）
2. RGB 贴片模块呼吸灯实验（第 6–8 页）
3. 电位器调节舵机实验（第 9–13 页）
4. 摇杆模块实验（第 14–18 页）

---

## 一、PWM 调节 LED 灯亮度实验（p1–5）

**介绍**：原文见 guide_raw.txt（脉冲宽度调制 PWM、占空比、输出电压 =（导通时间 / 脉冲时间）× 最大电压值；1、脉冲宽度变化幅度；2、脉冲周期；3、电压范围）。
图片：`pwm_waveforms.jpg`（三组方波：75%/25% → 3.75V，50%/50% → 2.5V，20%/80% → 1V）
> 讲解提示（原文有误，页面上用正确说法并一句话注明）：① UNO 的 PWM 频率不是 50Hz，而是约 490Hz（5、6 号脚约 980Hz）；② analogWrite 第二个参数范围是 0～255，不是 0～256；③ 128 → 占空比约 50% → 平均约 2.5V，这句是对的。

**电位器**（原文）：电位器就是可调电阻，它有如下作用：1. 用作分压器 2. 用作变阻器 3. 用作电流控制器。电位器三个引脚接法：1、两头的电阻值是固定的，中间引脚对任何一端引脚的电阻值是可变的；2、它等效于从中间引脚起把电位器分成两个串联的电阻，串联总阻值是固定的；3、如果作为可变分压电阻用，则一端接输入电压，中间端接输出，余下端接地；4、如果作为可变电阻用，一端接输入电压，中间端接输出，余下端可悬空，或与中间端连接。
图片：`pot_photo.jpg`（两个旋转电位器，红色箭头标注 “接地 / 输出 / 输入”）

**程序原理**（原文）：在编写程序的过程中，我们不断通过 analogRead（引脚）读取 AD 接口的采集值并将其转换为电压值，然后将其转换为 256 级的占空比，并使用 analogWrite（pwm_pin，val）函数导出平均电压值。可以通过 LED 的亮度判断电压的变化。
**实验目的**（原文）：我们做过按钮控制灯实验，之前是数字信号控制数字接口，我们也实现了电位器实验。现在我们要完成一个由电位器控制的 LED 灯的实验。
**组件清单**：Arduino Uno R3 主板；面包板；USB 数据线；10k 电位器 ×1；Red LED ×1；220Ω 电阻 ×1；若干跳线
**接线**：PDF 只有接线图 `pwm_wiring.jpg`（无接线表）。从图上读：电位器两端接 5V、GND，中间脚接 A0；LED 经 220Ω 电阻接 11 号脚，另一端接 GND。

**程序**（原样，仅统一缩进）
```cpp
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
```
> 讲解提示：① “计算电压” 那行算出的其实是 0～1 的比例（没有 ×5），所以串口里 voltage 只在 0.00～1.00 之间——截图里 voltage==0.20 / 0.35 就是这个原因；② voltage×256 在读数满 1023 时得到 256，超出 0～255，灯会突然变暗，更稳妥写 `map(value, 0, 1023, 0, 255)`；③ delay(0) 等于不等待，串口会刷得很快。④ 截图里打印的是 “voltage==… / value==…” 两行一组，和这段程序的输出格式（value1== … voltage== … PWM== … 一行）不完全一样，截图应来自旧版程序；页面上如实说明 “截图格式与程序略有不同”。

原文：一旦程序下载，旋转电位器旋钮，那么我们可以改变 LED 的亮度。
**实验结果**（原文）：通过这个实验我们可以观察到灯的亮灯随着旋转电位器明暗亮度的变化，同时也可以观察到串行监视器的 voltage 和 value 的数值变化。
图片：`pwm_result_photo.jpg`（实物）、`pwm_serial_monitor.jpg`（串口截图：voltage==0.20 / value==50 … voltage==0.35 / value==89）

---

## 二、RGB 贴片模块呼吸灯实验（p6–8）

**介绍**（原文）：在本课程中，您将使用 PWM 来控制 RGB LED 灯并使其显示不同的颜色。RGB 代表红色，绿色和蓝色通道，是行业颜色标准。RGB 通过改变三个通道并叠加它们来显示各种新颜色，根据统计，它可以创建 16777216 种不同的颜色。如果你说显示的颜色与自然颜色不完全匹配，那么它几乎无法用肉眼区分。
图片：`rgb_module_photo.jpg`（RGB LED（正面）/（反面），引脚 R G B GND）
**组件清单**：Arduino UNO R3 主板；面包板；USB 数据线；RGB LED 模块 ×1；若干跳线
**实验原理**（原文）：红色，绿色和蓝色的三个颜色通道中的每一个具有 255 级亮度。当三原色全部为 0 时，“LED 灯” 最暗，即关闭。当三原色全部为 255 时，“LED 灯” 是最亮的。当叠加三原色发出的光时，颜色将混合。但是，亮度等于所有亮度的总和，混合得越多，LED 就越亮。该过程称为添加剂混合（即 “加色混合”）。在这个实验中，我们也将使用 PWM……在 RGB LED 的三个引脚之间输入 0 到 255 之间的值，使其显示不同的颜色。
> 讲解提示：每个通道 0～255 共 256 级，256³ = 16777216 种颜色。

**接线**
| Arduino Uno | RGB |
|---|---|
| 11 | R |
| 10 | G |
| 9 | B |
| GND | - |
图片：`rgb_wiring.jpg`

**程序**（原样，仅统一缩进）
```cpp
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
```
> 讲解提示：每种颜色从 0 渐亮到 255，用 256 × 4ms ≈ 1 秒；这里是 “渐亮后突然熄灭” 再换下一色（真正的 “呼吸” 还要再写一段从 255 渐暗到 0 的循环，可作为动手改一改）。

**实验结果**（原文）：在这里你应该看到 RGB LED 呈圆形闪烁，先是红色，然后绿色，蓝色。图片：`rgb_result_photo.jpg`

---

## 三、电位器调节舵机实验（p9–13）

**介绍 / 工作原理 / 舵机的控制**：原文见 guide_raw.txt（舵机 = 位置伺服驱动器，0～180°，由直流电机、减速齿轮组、传感器（电位器）和控制电路组成，闭环反馈；控制信号周期 20ms，高电平 0.5～2.5ms：0.5ms→0°、1.0ms→45°、1.5ms→90°、2.0ms→135°、2.5ms→180°；小于 1.5ms 逆时针、大于 1.5ms 顺时针）。原文 “中间位置是指从该位置到最小角度的体积” 是机翻，应为 “从中间位置到最小角度、到最大角度的转角相等”。
图片：`servo_photo.jpg`（SG90 舵机 TOWER PRO Micro Servo 9g 及舵盘螺丝）、`servo_pulse_period.jpg`（周期为 20ms，脉冲宽度最小 0.5ms 最大 2.5ms）、`servo_wires.jpg`（舵机三根线：(0V) GND / (+5V) / (PWM) 信号线，180° 示意）、`servo_pulse_angles.jpg`（最小 / 中间 / 最大脉冲 → 0° / 90° / 180°）、`servo_inside_photo.jpg`（舵机内部结构：拆开的电机、电路板）
**实验目的**（原文）：目的是通过电位计控制电机旋转。
**组件清单**：Arduino Uno 主板；面包板；USB 数据线；10k 电位器 ×1；SG90 舵机 ×1；若干跳线
**接线**（原文）：将电位器的左侧引脚连接至 3.3V，右侧连接至 GND，中间至模拟接口 A0。将 5V 和 GND 连接到舵机，信号端口连接到 7 号接口。图片：`servo_pot_wiring.jpg`
> 讲解提示：电位器接的是 **3.3V**，所以 A0 读数最大约 3.3/5×1023 ≈ 675，675÷4 ≈ 168°，转到底也到不了 180°。如果电位器接 5V，读数到 1023，1023÷4 = 255 超过 180，Servo 库会把超出的部分当 180 处理，后面一段旋钮就没反应了。更好的写法：`map(readValue, 0, 1023, 0, 180)`（接 5V 时）。

**程序**（原样，仅统一缩进）
```cpp
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
```
> 原 PDF 第 4 页程序框在 `delay(15);` 后断页，第 5 页的框是空的，**loop() 的右大括号 `}` 漏印了**，照抄会编译报错；上面已补上，页面上说明。注释 “pin 9” 与实际 7 号脚不符（沿用例程的旧注释），“variable 'pos'” 实际变量是 angle。

**实验结论**（原文）：我们上传程序后我们通过旋转电位器可以改变舵机的角度，舵机的角度为 0–180 度，为之后的机械臂打下基础。图片：`servo_pot_result_photo.jpg`

---

## 四、摇杆模块实验（p14–18，第 14–15 页为图片，以下手工转录）

**1、介绍**：Arduino 摇杆模块提供七个按钮开关（六个独立按钮和摇杆下方的按钮）和一个带有两个电位计的拇指摇杆。这个扩展板为您的 Arduino 提供旧的任天堂（Nintendo）控制器上的功能。摇杆可用于控制诸如旋律或屏幕上的像素之类的输出。按钮可用于导航或游戏控制。
图片：`joystick_shield_photo.jpg`（红色 Joystick Shield 扩展板，黑色摇杆 + 蓝黄四个按键）
**2、组件清单**：Arduino UNO R3 主板；USB 数据线；遥杆模块 ×1；若干跳线
**3、原理图**：图片 `joystick_schematic.jpg`（Joystick 的 SW / VRy / VRx / VCC / GND → Port 的 Bt / Y-out / X-out / VCC / GND，含 R1 10K、LED 指示）
**4、连线**（直接将扩展板插在 uno 板上面即可）
| Arduino Uno | 摇杆模块 |
|---|---|
| 0 | VRX |
| 1 | VRY |
| 2 | A |
| 3 | B |
| 4 | C |
| 5 | D |
| 6 | E |
| 7 | F |
| GND | GND |
| 5V | VCC |
图片：`joystick_wiring.jpg`（扩展板插在 UNO 上的示意图）
> 讲解提示：表里的 0、1 指模拟口 A0、A1（程序里 analogRead(0) / analogRead(1)），不是数字 0、1 号脚；2～7 是数字口上的按键 A～F；程序里还有 BUTTON_K = 8（摇杆按下），表里没列。

**5、程序 ① 测试摇杆模块的摇杆处于静止时，X、Y 输出值**（原文：Arduino 编写的程序如下图所示，您也可以直接打开程序文件，它是一个 .ino 文件，打开步骤可以参考第 2.1 讲：Hello Arduino！实验）
```cpp
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
```
图片：`joystick_serial_xy.jpg`（串口：静止时 x: 525 / y: 518 交替）

**程序 ② 烧录串口打印数据**
```cpp
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
```
> 讲解提示：① `pinMode(…, INPUT)` 后再 `digitalWrite(…, HIGH)` 是老写法，作用是打开内部上拉电阻，等同于 `pinMode(…, INPUT_PULLUP)`，所以 “按下 = LOW”；② else if 链：从上往下只执行第一个成立的分支；③ 520/530、515/520 是 “死区”：摇杆静止时 x≈525、y≈518 落在中间不触发。

**实验结果**（原文）：现在，您可以操纵摇杆来验证实验，当您往上拨时，对应的 LED 灯就会亮起，每个方位都有对应的 LED 灯。
> 讲解提示：这段程序只在串口打印方向和按键，不控制 LED；扩展板上的指示灯是电源 / 按键自带的。页面上以串口输出为准，说明原文这句与程序不符。
图片：`joystick_result_photo.jpg`（扩展板插在 UNO 上的实物）、`joystick_serial_buttons.jpg`（串口：up / down / right / left / Button k is pressed / Button D/C/B/A/F/E is pressed）
