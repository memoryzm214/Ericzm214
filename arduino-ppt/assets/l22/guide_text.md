# 实验指南 2-2 转录（程序、接线、图片、讲解提示）

来源：用户提供的 2-2 实验指南 PDF（21 页）。正文原文见同目录 `guide_raw.txt`（PDF 文字层），PDF 原件可用 Read 工具按页查看。
**mBlock / Mixly 图形化编程** 部分按要求不收录（PDF 第 3、10、14、21 页的积木截图与说明）。

本指南共 4 个实验：
1. 超声波模块实验（PDF 第 1–3 页）
2. 串口调节舵机角度实验（第 4–10 页）
3. 红外避障模块实验（第 11–14 页）
4. 温湿度传感器模块实验（第 15–21 页）

---

## 一、超声波模块实验（p1–3）

**超声波模块介绍**（原文）：超声波测距原理：超声波发射器向某个方向发射超声波，我们同时开始计时。当空气中的超声波遇到障碍物时，它会立即返回，超声波接收器接收到反射波，然后我们停止计时。空气中的声波速率为 340 米/秒，根据记录的时间 t，可以计算出发点和障碍物之间的距离 s，即：s = 340m/s × t / 2。所以我们可以得到距离。
超声波测距模块有四个引脚，它们分别是 Vcc，Trig，Echo，GND，Trig 是距离测量触发引脚，只要 Trig 引脚至少有 10μs 高电平，超声波发送模块会自动发送 8 个 40KHZ 超声波脉冲，并自动检测是否有返回的信号。此步骤将由内部模块自动完成。如果有任何返回信号，Echo 引脚将输出高电平，高电平的持续时间是超声波从发射到返回的时间。此时，我们可以使用 pulseIn() 函数来获得距离测量的结果，并计算实际距离。
图片：`ultra_timing.jpg`（时序图：Trig pin 10us high level → Ultrasonic Sender Eight 40khz ultrasonic pulse → Echo Pin Measuring result high level）
**实验目的**（原文）：目的是通过串口输入超声波测距模块的距离。（“输入” 应为 “输出 / 显示”）
**组件清单**：Arduino UNO R3 主板；面包板；USB 数据线；超声波模块 ×1；若干跳线
**接线**
| Arduino Uno | Ultrasonic |
|---|---|
| VCC | 1 (Vcc) |
| 2 | 2 (Trig) |
| 3 | 3 (Echo) |
| GND | 4 (Gnd) |
图片：`ultra_wiring.jpg`

**程序**：PDF 此处 **空白**。下面的程序来自同一套件《Arduino 编程入门学习教程》第 2.38 讲（说明书第 142–144 页），引脚与本指南一致（Trig 2、Echo 3），串口输出格式也与本指南截图一致（Ultrasonic sensor: / distance is :xx.xxcm）：
```cpp
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
```
> 讲解提示：为什么 ÷58？声速 340m/s = 0.034cm/μs，来回 1cm 要走 2cm，约需 2 ÷ 0.034 ≈ 58μs，所以 距离(cm) = 回波时间(μs) ÷ 58，和公式 s = 340 × t / 2 是同一回事。pulseIn(pin, HIGH) 测 Echo 高电平持续多少微秒。

**实验结果**：图片 `ultra_result_photo.jpg`（实物）、`ultra_serial_monitor.jpg`（串口：Ultrasonic sensor: / distance is :119.64cm / 8.57cm / 4.40cm / 114.98cm …）

---

## 二、串口调节舵机角度实验（p4–10）

**舵机介绍 / 工作原理 / 舵机的控制**：原文见 guide_raw.txt（与 2-1 电位器调节舵机实验相同的舵机原理：0～180°，周期 20ms，高电平 0.5～2.5ms 对应 0°～180°，1.5ms 中间位置）。
图片：`servo_pulse_period.jpg`（Cycle is 20ms，The pulse width 1ms (Min) – 2ms (Max)）、`servo_pulse_angles.jpg`（最小 / 中间 / 最大脉冲 → 0° / 90° / 180°）、`servo_inside_photo.jpg`（舵机内部结构分解：driveshaft / gear train / potentiometer / motor / control electronics）
> 讲解提示：图中写 1ms–2ms，正文写 0.5ms–2.5ms——不同舵机范围不同，原文也说 “不同品牌的转向器……最大值和最小值可能不同”。
**实验目的**（原文）：使用 Keywish Arduino Uno R3 主板实现调整舵机角度的实验。
**组件清单**：Keywish Arduino Uno R3 主板；USB 数据线；SG90 舵机；若干跳线
**实验原理**（原文）：舵机信号线连接到 Keywish Arduino Uno R3 主板，烧录程序之后，在串口监视器中输入要调整舵机的角度，让舵机转到相应角度的位置。
**接线**
| Arduino UNO | 舵机 |
|---|---|
| GND | 黑线 |
| VCC | 红线 |
| 13 | 黄线 |
图片：`servo_wiring.jpg`（接线图，PDF 放在 “实验结论” 标题下）、`servo_result_photo.jpg`（实物：舵机 + 9V 电池给 UNO 供电）
> 讲解提示：SG90 的线色常见为 棕 / 红 / 橙（= GND / VCC / 信号），和表里的 黑 / 红 / 黄 一一对应。

**程序**（原样，仅统一缩进；PDF 里 temp += inByte 那行的注释被排版折成两行，这里合回一行，否则第二行不是注释会编译报错）
```cpp
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
```
> 讲解提示：① 串口一次只能读 1 个字符：输入 “180” 会依次读到 '1' '8' '0'，用 String temp 把它们拼起来，再 toInt() 变成数字 180；② while 只要还有没读完的字符就一直读；③ 串口监视器的 “行结束符” 要选 “没有结束符”（截图里就是这样），否则回车换行也会被拼进 temp；④ 舵机耗电大，原文让接上电池（9V 电池插 UNO 的 DC 口）一起供电。

原文：将程序烧录到 UNO 板之后，先不要拔下 USB 线，并将电池插头插到 UNO 板上给其供电，然后打开 Arduino IDE 的串口监视器；
图片：`servo_ide_monitor.jpg`（打开串口监视器示意图：IDE 右上角 “串口监视器” 按钮被红框标出）
原文：打开串口监视器之后，在串口监视器依次输入 0，90，180，90，这样的舵机角度值。
图片：`servo_serial_input.jpg`（串口输入舵机角度数值：输入框 “输入数值”，输出 Servo degree: 0 / 90 / 180 / 90）
原文：在串口监视器分别输入以上舵机角度值之后，会发现舵机会转动。

---

## 三、红外避障模块实验（p11–14）

**红外避障模块介绍**（原文）：红外避障模块是具有一对红外线发射与接收管，发射管发射出一定频率的红外线，当检测方向遇到障碍物（反射面）时，红外线反射回来被接收管接收，经过比较器电路处理之后，绿色指示灯会亮起，同时信号输出接口输出数字信号（一个低电平信号），可通过电位器旋钮调节检测距离，有效距离范围 2～30cm，工作电压为 3.3V–5V。该传感器的探测距离可以通过电位器调节，由于使用的是红外线，所以抗干扰能力很强、干扰小，在距离适中的时候测量精度很高。除此外，该模块便于装配、使用方便，可以广泛应用于机器人避障、避障小车、流水线计数及黑白线循迹等众多场合。
图片：`ir_module_photo.jpg`（红外避障模块实物图）
**实验目的**：了解红外避障模块的工作原理；使用 Arduino UNO 获取红外避障模块的值，控制蜂鸣器和 LED 灯。
**组件清单**：Arduino UNO R3 主板；面包板；USB 数据线；红外避障模块 ×1；LED 模块 ×1；有源蜂鸣器 ×1；若干跳线
**实验原理**（原文）：利用红外避障模块的工作特性，当红外避障模块检测到障碍物，LED 亮，蜂鸣器响；如果没有检测到障碍物，LED 熄灭，蜂鸣器不响。
**接线**
| Arduino UNO | 红外避障模块 |
|---|---|
| 12 | OUT |
| 5V | VCC |
| GND | GND |

| Arduino UNO | LED |
|---|---|
| 11 | + |
| GND | — |

| Arduino UNO | 有源蜂鸣器 |
|---|---|
| 13 | + |
| GND | — |
图片：`ir_wiring.jpg`（接线图里 LED 是 RGB 贴片模块）

**程序**：PDF 此处 **空白**。下面的程序来自同一套件《Arduino 编程入门学习教程》第 2.25 讲（说明书第 101–103 页），引脚与本指南一致（OUT 12、LED 11、蜂鸣器 13）：
```cpp
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
```
> 讲解提示：有障碍物 → 模块输出 LOW（绿灯亮）→ val==0 → 灯亮、蜂鸣器响。检测距离用模块上的蓝色电位器调。这个程序和 1-3 小磁簧开关实验几乎一模一样，只是换了传感器——“输入换了，逻辑不变”。

**实验结果**：PDF 只有标题，下面是照片：`ir_result_photo.jpg`（竖拍：面包板上的蜂鸣器、RGB 模块和红外模块接 UNO）、`ir_result_photo2.jpg`（RGB 模块亮红灯，红外模块绿灯亮）
原文：如果你的套件中有 Sensor V5.0 扩展板，可以按照下图接线，更加方便。图片：`ir_shield_photo.jpg`

---

## 四、温湿度传感器模块实验（p15–21）

**温湿度传感器模块介绍**（原文）：DHT11 数字温度 - 湿度传感器是一种包含校准数字信号输出的复合传感器。它采用特殊的数字模块采集技术和湿度 - 温度传感器技术，确保高可靠性和出色的长期稳定性。传感器由电阻式湿度元件和 NTC 温度测量元件组成，并连接到高性能 8 位微控制器。
图片：`dht_photo.jpg`（温湿度传感器实物图：蓝色 DHT11 与模块板）
**引脚说明**（原文）：1, VDD：连接电源正极（3–5V）；2, DATA：串行数据，单总线，必须连接到一个接近 5.1K 的上拉电阻，因此 DATA 在空闲时间内始终处于高电平；3, GND：连接电源负极；4, NC：悬空引脚
**DHT11 的工作原理**（原文）：DHT11 通过单总线与微处理器通信。它只需要一个线程（应为 “一根线”），一次发送 40 个数据（位），大端（高位先发）。
**数据格式**（原文）：8 位湿度整数数据 + 8 位湿度十进制（小数）数据 + 8 位温度整数数据 + 8 位温度十进制（小数）数据 + 8 位奇偶校验位（校验和）。
**通信方式 / 详细过程**：原文见 guide_raw.txt（主从结构，M0 是主机、DHT11 是从机；M0 发启动信号 → DHT 响应 → DHT 发 40 位数据 → 结束；每次读到的是上一次测量的数据；读取间隔建议大于 5 秒（实际手册多为 1～2 秒）；上电需 1 秒稳定）。
**M0 启动信号**：1 将 DATA 引脚设置为输出状态并输出高电平；2 然后 DATA 引脚输出低电平，持续时间超过 18ms，检测到后，DHT 从低功耗模式 -> 高速模式；3 将 DATA 引脚设置为输入状态，由于上拉电阻，它变为高电平，从而完成启动信号。图片：`dht_timing_start.jpg`（>18ms，The host sends a start signal）
**DHT 响应信号，就绪信号**（原文标题误作 “THD”）：1. DHT 输出 80us 低电平作为响应信号；2. DHT 输出 80us 高电平，通知微处理器准备好接收数据；3. 连续发送 40 个数据（上次数据）。图片：`dht_timing_response.jpg`（80us / 80us，start to sent data）
**DHT 数据信号**：“0” 格式数据：50us 低电平 + 26–28us 高电平；“1” 格式数据：50us 低电平 + 70us 高电平。图片：`dht_timing_bit0.jpg`（"0" format data）、`dht_timing_bit1.jpg`（"1" format data）
**DHT 终止信号**：DHT DATA 引脚输出 40 个数据，在连续输出低电平 50us 后，转入输入状态。由于上拉电阻，DATA 变为高电平。DHT 内部重新测试环境温度和湿度，记录来自外部的下一个启动信号的数据。图片：`dht_timing_sequence.jpg`（The time sequence diagram 完整时序）
> 以上 5 张时序图在 PDF 里是矢量图，已从页面裁切成图片，必须全部放进 PPT。讲解提示：用 “摩尔斯电码” 类比——高电平短（26–28us）= 0，长（70us）= 1；dht11 库已经把这些时序都处理好了，我们只需要 DHT11.read()。

**该实验的目的**（原文）：使用温度 - 湿度传感器检测空气中的温度和湿度。传感器将收集的数据发送到 ARDUINO 板。处理完毕后，结果将反映在 LCD 上，第一行显示温度，第二行显示湿度。
**组件清单**：Arduino UNO R3 主板；面包板；USB 数据线；LCD1602 模块 ×1；DHT11 温湿度传感器模块 ×1（原文误作 DTH11）；若干跳线
**实验目的**：学习温湿度传感器的工作原理；使用 Arduino UNO 获取温湿度传感器模块的值并将该值通过 LCD 1602 显示屏显示出来。
**接线**
| LCD 显示屏 PCF8574T | Arduino |
|---|---|
| GND | GND |
| VCC | 5V |
| SDA | A4 |
| SCL | A5 |

| 温湿度传感器 | Arduino |
|---|---|
| GND | GND |
| VCC | 5V |
| OUT | 8 |
图片：`dht_wiring.jpg`

**Arduino IDE 编程程序**（原样，仅统一缩进）
```cpp
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
```
> 讲解提示：① 三个 #include 引入三个库：Wire（I2C 通信）、dht11（温湿度传感器，套件资料提供）、LiquidCrystal_I2C（I2C 显示屏）；② `dht11 DHT11;` 创建一个传感器 “对象”，`DHT11.temperature` 用 “对象.成员” 取值；③ (float) 转成小数、第二个参数 2 表示保留 2 位小数（DHT11 本身只有整数精度，所以显示 24.00）；④ chk 是读取结果码（0 表示成功），程序里没用到；⑤ “Tep” 是原程序的拼写（Temp 的缩写）；⑥ 手册建议读取间隔 ≥ 1 秒，这里 delay(200) 偏短，可改成 delay(1000) 以上；⑦ LCD 接线和 2-3 实验相同（SDA→A4、SCL→A5），地址 0x27。
**实验结果**：图片 `dht_result_photo.jpg`（LCD 显示 Tep: 24.00C / Hum: 46.00%）
原文：如果你的套件中有 sensor V5.0 的扩展板，可以按照下图中的接线方法接线，更加的方便。图片：`dht_shield_photo.jpg`（LCD 显示 Tep:30 C / Hum:45 %）
