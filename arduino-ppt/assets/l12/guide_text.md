# 实验指南 1-2 转录（程序、接线、图片、讲解提示）

来源：用户提供的 1-2 实验指南 PDF（15 页）。正文原文见同目录 `guide_raw.txt`（PDF 文字层，按页排列），PDF 原件可用 Read 工具按页查看。
**mBlock / Mixly 图形化编程** 部分按要求不收录（PDF 第 4、8、11 页的积木截图与说明）。

本指南共 4 个实验：
1. 按键模块实验（PDF 第 1–4 页）
2. 触摸开关模块实验（第 5–8 页）
3. 第 2.17 讲：限位开关模块实验（第 9–11 页）
4. 倾斜开关模块实验（第 12–15 页）

---

## 一、按键模块实验（p1–4）

**介绍**（原文）：数字 I/O 端口的含义是 INPUT 和 OUTPUT 接口，在以前的 LED 灯实验中，我们只使用 GPIO 的 OUTPUT 功能。现在让我们尝试在 Arduino 中使用 I/O 的 INPUT 功能，即该功能是在本实验中从外部设备读取输出值。我们使用按键和 LED 灯来完成使用 INPUT 和 OUTPUT 作为组合的实验。
图片：`btn_module_photo.jpg`（按键开关模块 正面 / 反面，图中自带文字；反面丝印 “Key switch (Press output low) 按下输出低电平”）

**实验目的**（原文）：我们将按键连接到 D7 号接口，红灯连接到 D11 号接口（Arduino 控制器中的所有 D0–D13 数字 I/O 接口可用于连接按键和指示灯，但尽量不要选择数字 D0 和 D1 接口，因为 D0 和 D1 功能复用，除了 I/O 端口功能外，它们还用作串行通信接口。下载程序时，设备正在与 PC 通信。所以我们应该保留 D0 和 D1 接口，为了避免插入线路的麻烦，我们不选择 D0 号和 D1 号接口。

**组件清单**：Arduino Uno 主板；面包板；USB 数据线；按键 ×1；LED 灯模块 ×1；若干跳线

**接线**
| Arduino Uno | 按键模块 |
|---|---|
| 7 | S |
| GND | G |
| 5V | V |

| Arduino Uno | LED 灯 |
|---|---|
| 11 | + |
| GND | - |

图片：`btn_wiring.jpg`（按键模块 + 面包板上的 LED 和电阻）

**实验原理**（原文）：通过分析电路我们可以知道，当按下按钮时，D7 号接口处于高电平，它将 D11 号输出引脚置高电平，这可以使灯亮。当 D7 号接口读为低电平时，D11 号输出保持低电平，此时指示灯熄灭。原理与上述相同。
> 讲解提示：这段文字和程序矛盾。模块反面印着 “按下输出低电平”，程序也是 `if( value == LOW )` 时点灯——实际是 **按下 → D7 读到 LOW → 灯亮**。页面上以程序和模块丝印为准，并用一句话说明原文写反了。

**程序**（原样，仅统一缩进）
```cpp
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
```
> 讲解提示：第二个注释也写成了 “key value is down”，其实是 “松开时关灯”。`value` 没有初值没关系，loop() 一开始就赋值。

**实验结论**：PDF 此处只有标题，无文字。
图片：`btn_result_photo.jpg`（实物：红色按键模块 + 面包板上的黄色 LED 接 UNO）

---

## 二、触摸开关模块实验（p5–8）

**介绍**（原文）：触摸开关模块是一个基于触摸检测 IC（TTP223B）的电容式点动型触摸开关模块。常态下，模块输出低电平，模式为低功耗模式；当用手指触摸相应位置时，模块会输出高电平，模式切换为快速模式；当持续 12 秒没有触摸时，模式又切换为低功耗模式。可以将模块安装在非金属材料如塑料、玻璃的表面，另外将薄薄的纸片（非金属）覆盖在模块的表面，只要触摸的位置正确，即可做成隐藏在墙壁、桌面等地方的按键。
图片：`touch_module_photo.jpg`（触摸开关模块实物图：蓝色 Touch Sensor，SIG VCC GND）

**实验目的**：了解触摸开关模块的工作原理；实现使用 Arduino 控制触摸开关控制 LED 灯。
**组件**：Arduino UNO R3 主板；面包板；USB 数据线；触摸开关模块 ×1；LED 模块 ×1；若干跳线
**实验原理**（原文）：使用 Arduino 控制触摸开关控制 LED 灯亮灭，用手指触摸触摸开关模块，当 Arduino UNO 板检测到触摸开关模块输出高电平，控制 LED 灯亮，负责 LED 灯灭。（“负责” 应为 “否则”）

**接线**
| Arduino UNO | 触摸开关模块 |
|---|---|
| A0 | SIG（信号引脚） |
| 5V | VCC(+) |
| GND | GND(-) |

| Arduino UNO | LED |
|---|---|
| A5 | + |
| GND | GND(-) |

图片：`touch_wiring.jpg`（接线图里的 “LED” 是一块 RGB 贴片模块，A5 接它的一个颜色脚）

**ArduinoIDE 编程程序**：PDF 此处 **空白**。下面的程序来自同一套件《Arduino 编程入门学习教程》第 2.19 讲（说明书第 81–83 页），接线与本指南一致（A0 读触摸、A5 控制灯）：
```cpp
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
```
> 讲解提示：A0～A5 除了读模拟量，也能当普通数字口用 digitalRead / digitalWrite。触摸 → 读到 1 → 灯亮。

**实验结果**：图片 `touch_result_photo.jpg`（手指按在触摸模块上，RGB 模块亮红灯）
原文：如果你的套件中有 Sensor V5.0 扩展板，可以按照下图接线。图片 `touch_shield_photo.jpg`（Sensor V5.0 扩展板接触摸模块和 RGB 模块）

---

## 三、第 2.17 讲：限位开关模块实验（p9–11）

**1、介绍**（原文）：限位开关又称行程开关，用于反应设备机械位置的变化，并在设备达到预定位置时实现电路的切换，进而实现行程控制、限位保护、报警、联锁启停设备等功能。
图片：`limit_module_photo.jpg`（带滚轮摆杆的微动开关，蓝色小板，三针 OUT GND VCC）

**2、组件清单**：Arduino UNO R3 主板；USB 数据线；限位开关模块 ×1；LED 灯模块 ×1；220Ω 电阻 ×1；若干跳线

**3、实验原理**：只有一张原理图 `limit_schematic.jpg`（+5 → R1 1K → LED → 开关 K → 地；R2 10K 上拉到 OUT；J1 引脚 GND VCC OUT）。
> 讲解提示：从原理图看，OUT 经 10K 电阻上拉到 5V，开关 K 一端接地——开关没被按下时 OUT 是高电平（读 1），按下接通到地时 OUT 变低电平（读 0），同时模块板上的指示 LED 也亮。所以程序 `if(val==0)` 表示 “按下了”。

**4、连线**
| Arduino Uno | 限位开关模块 |
|---|---|
| 10 | OUT |
| GND | GND |
| 5V | VCC |

| Arduino Uno | LED（中间加电阻） |
|---|---|
| 11 | 长脚 |
| GND | 短脚 |

图片：`limit_wiring.jpg`

**5、程序**（原文：Arduino 编写的程序如下图所示，您也可以直接打开程序文件，它是一个 .ino 文件，打开步骤可以参考第 2.1 讲：Hello Arduino！实验）
```cpp
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
```
> 讲解提示：第 6 行注释写 “输出接口”，代码其实是 INPUT（输入），注释笔误。

**实验结果**（原文）：现在，上传程序之后，按下限位开关，灯会随之亮起。图片 `limit_result_photo.jpg`

---

## 四、倾斜开关模块实验（p12–15）

**介绍**（原文）：倾斜开关模块也称为滚珠开关，滚珠开关也叫钢珠开关，珠子开关，其实都是震动开关的一种只是叫法不一样，都是通过珠子滚动接触导针的原理来控制电路的接通或者断开的。当倾斜传感器感应到倾斜时，模块会输出低电平信号，否则输出高电平。
1、SW-520、SW-520D 为滚珠型倾斜震动感应单方向性触发开关。
2、当产品向帽盖端倾斜、倾斜角大于 10 度时，为开路 OFF 状态；当产品水平状态发生倾斜改变（并且引线平行于平面方向，上下高度一样），触发端（镀金引脚端 A 与 B）低于水平倾斜角大于 10 度角时，为闭路 ON 状态。
图片：`tilt_module_photo.jpg`（倾斜传感器（正面）/（反面），图中自带文字）

**实验目的**：了解倾斜开关模块的工作原理；使用 Arduino 控制倾斜开关模块实现防盗报警的功能。
**组件清单**：Arduino UNO R3 主板；面包板；USB 数据线；倾斜开关模块 ×1；贴片模块 ×1；有源蜂鸣器 ×1；若干跳线

**实验原理**（原文）：利用倾斜开关模块的工作特性，当在电路板在静止状态时，倾斜开关模块处于闭合状态，当有外力触碰到了电路板致使其倾斜开关里面的滚珠和导线断开接触从而断开电路，此时触发报警，LED 亮，蜂鸣器响；当断开模块恢复到静止状态时，LED 熄灭，蜂鸣器不响。
> 讲解提示：介绍（“倾斜时输出低电平”）和实验原理（“静止闭合、触碰断开时报警”）两种说法角度不同，程序的规则只有一条：**读到 0 就报警**。让学生先打开串口看 val 在静止 / 倾斜 / 轻碰时分别是几，再理解程序，不要硬背哪种状态是 0。

**接线**
| Arduino UNO | 倾斜开关模块 |
|---|---|
| 12 | S |
| 5V | V |
| GND | G |

| Arduino UNO | 贴片模块 |
|---|---|
| 11 | R |
| GND | GND |

| Arduino UNO | 有源蜂鸣器 |
|---|---|
| 13 | S |
| GND | G |
| 5V | V |

图片：`tilt_wiring.jpg`（RGB 贴片模块、有源蜂鸣器模块、倾斜开关模块接 UNO）

**Arduino IDE 编程程序**（PDF 中程序是一张截图，下面逐字转录）
```cpp
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
```
> 讲解提示：三处注释笔误——第 9 行 INPUT 写成 “输出接口”；第 14 行读的是 12 号脚（buttonpin），不是 A5；第 16 行说 “LED 闪烁”，实际是常亮（`delay(1000)` 被注释掉了）。变量名 buttonpin 沿用了按键实验的名字。

原文：烧录程序后，将倾斜开关模块稍微触碰一下，即可触发报警，LED 灯亮，蜂鸣器响。
**实验结果**：图片 `tilt_result_photo.jpg`
