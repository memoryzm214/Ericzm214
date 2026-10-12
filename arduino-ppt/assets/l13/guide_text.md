# 实验指南 1-3 原文转录

来源：用户提供的 1-3 实验指南 PDF（20 页，A4）。下面按 PDF 顺序转录正文、表格和程序；图片已提取到本目录（文件名见每节 “图片”）。
**mBlock / Mixly 图形化编程** 部分按要求不收录（PDF 第 6、11、15、20 页的 mBlock 小节与积木截图）。

本指南就是第 1-3 讲，共 5 个实验（全部属于 1-3）：
1. AD 模数转换实验（PDF 第 1–3 页）
2. 光敏电阻模块实验（第 4–6 页）
3. LED 流水灯实验（第 7–11 页）
4. 蜂鸣器模块实验（第 12–15 页）
5. 小磁簧开关模块实验（第 16–20 页）

---

## 一、AD 模数转换实验（PDF p1–3）

### 介绍
我们经常听到专业词汇中的 A/D 或 D/A 转换，那么 A/D 和 D/A 是什么？AD 转换就是模数转换，也可以是整流。顾名思义，就是把模拟信号转换成数字信号。
模拟量可以是电压、电流等电信号，也可以是压力、温度、湿度、位移、声音等非电信号。但在 A/D 转换前，输入到 A/D 转换器的输入信号必须经各种传感器把各种物理量转换成电压信号。A/D 转换后，输出的数字信号可以有 8 位、10 位、12 位、14 位和 16 位等。
DA 转换就是数模转换，就是将离散的数字量转换为连接变化的模拟量。与数模转换相对应的就是模数转换，模数转换是数模转换的逆过程。
Arduino 有 6 个模拟接口，编号从 0 到 5，6 个接口也可以是接口函数重用。除模拟接口功能外，六个接口还可用作数字接口，编号为 14–19。在简单理解之后，让我们开始下面的实验。电位器是一种众所周知的典型模拟值输出元件，它将用于完成本实验。

### 组件清单
Arduino Uno R3 主板；面包板；USB 数据线；10k 电位器 ×1；LED ×1；220Ω 电阻 ×1；若干跳线

### 实验目的
在这个实验中，以便完成我们将电位器的电阻值转换为模拟值并将其读出，然后将值显示在屏幕上，这也是我们掌握的一个非常有用的例子。

### 实验原理
通过函数 analogRead()，语句可以读出模拟接口的值。Arduino328p 采用 10 位 A/D 采样，因此模拟量值范围为 0~（0-1023），数值只是 AD 的值，需要将其转换为实际电压值，因此我们将使用以下公式来计算：

    V_R = Value / (2^10 − 1) × V_DD

V_R：实际电压　Value：AD 采用值　V_DD：AD 参考电压值

### 接线
图片：`ad_wiring.jpg`（面包板接线图：电位器两端接 5V / GND，中间脚接 A0；LED 经 220Ω 电阻接 13 号脚与 GND）

### 程序（原样，仅统一缩进）
```cpp
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
    Serial.println("\nvoltage =  ");
    Serial.println(voltage);
    delay(1000);
    digitalWrite(LEDPIN,LOW);            //turn off led
    delay(1000);
}
```
> 原 PDF 第 3 页把 loop() 的右大括号 `}` 印在了最后一个 `delay(1000);` 之前，那样 `delay(1000);` 落在函数外面，编译会报错。上面已把 `}` 放回最后。注释 “Serial Baud rate is 115200” 与代码里的 9600 不一致，以代码 9600 为准（串口监视器也选 9600）。

### 实验结果
图片：`ad_result_photo.jpg`（实物连接照片）、`ad_serial_monitor.jpg`（串口监视器截图：get ad pin value 399 / voltage = / 1.95 反复出现）
这个实验在这里完成。现在，当您旋转电位器旋钮时，您将在屏幕上看到数字变化。这种读取模拟值的方法将永远伴随我们，这也是我们的共同功能，因为大多数传感器输出模拟值，我们读取模拟值并做相应的算法处理，然后它可以应用于我们需要的功能实验。

---

## 二、光敏电阻模块实验（PDF p4–6）

### 光敏电阻模块介绍
光敏电阻是用硫化镉或硒化镉等半导体材料制成的特殊电阻器，其工作原理是基于内光电效应。光照愈强，阻值就愈低，随着光照强度的升高，电阻值迅速降低，亮电阻值可小至 1KΩ 以下。光敏电阻对光线十分敏感，其在无光照时，呈高阻状态，暗电阻一般可达 1.5MΩ。光敏电阻的特殊性能，随着科技的发展将得到极其广泛应用。光敏传感器它也可广泛应用于各种光控电路，比如控制和调节灯光。光敏电阻对环境光线最敏感，一般用来检测周围环境的光线亮度等。
图片：`ldr_module_photo.jpg`（环境亮度传感器（正面）/ 环境亮度传感器（反面），图中自带说明文字）

### 组件清单
Arduino UNO R3 主板；面包板；USB 数据线；光敏电阻 ×1；LED 模块 ×1；若干跳线

### 实验接线
| Arduino UNO 板 | 光敏电阻模块 |
|---|---|
| A0 | S |
| GND | G |
| 5V | V |

| Arduino UNO 板 | RGB LED 模块 |
|---|---|
| 11 | R |
| GND | GND |

图片：`ldr_wiring.jpg`（UNO 与 RGB LED 模块、光敏电阻模块的接线图）

### 实验原理
光敏电阻模块对环境光线最敏感，一般用来检测周围环境的光线的亮度，触发单片机或继电器模块等；

### Arduino IDE 编程程序
现在我们盖住光敏电阻，我们将清楚地看到光的亮度变化。
> 本 PDF 此处没有印出程序。下面的程序来自同一套件的《Arduino 编程入门学习教程》第 2.20 讲（说明书第 84–86 页），接线与本 PDF 一致（A0 读光敏，11 号脚 PWM 控制 RGB 模块红灯）：

```cpp
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
```
> 讲解提示：读数满量程 1023 时 `voltage*256` = 256，超出 analogWrite 的 0–255，灯会突然变暗（256 被当成 0）。更稳妥的写法：`value = map(value, 0, 1023, 0, 255);`

### 实验结果
图片：`ldr_result_photo.jpg`（实物照片：光敏模块与 RGB 模块接在 UNO 上，红灯亮）

---

## 三、LED 流水灯实验（PDF p7–11）

### LED 器件简介
LED 是发光二极管的缩写，由混合化合物制成，即镓（Ga），砷（AS），磷（P）。磷化镓二极管发红光，磷化镓二极管发绿光，碳化硅二极管发黄光。
图片：`led_photo.jpg`（红色 LED 实物）、`led_symbol.jpg`（发光二极管电路符号）

### 工作原理
发光二极管的反向击穿电压为 5v。其正伏安特性曲线太陡，必须与限流电阻串联，以便在使用时控制流过管道的电流。限流电阻 R 可通过以下公式获得：

    R = (E − V_F) / I

在公式中，E 代表电源电压，VF 是 LED 的正向压降，I 表示 LED 的一般工作电流。发光二极管的工作电压一般为 1.5 V 至 2.0 V，工作电流通常为 10~20 mA。因此在 5v 的数字逻辑电路中，我们可以使用 220Ω 电阻作为限流电阻。

### 实验目的
什么是流水灯？我们听说过山区溪流，河流等，正如它的名字所暗示的那样，让灯光像流水一样亮起来。我们的目的是实现从左到右单个灯光发光的效果，然后所有灯光从左到右发光，此循环继续。

### 组件清单
Keywish Arduino UNO R3 主板；面包板；USB 数据线；LED ×8；1k 电阻 ×8；若干跳线

### 原理图
图片：`flow_schematic.jpg`（VCC_5V → LED1–LED8 → R1–R8（1K）→ D2–D9；LED 正极共接 5V）

### 接线
图片：`flow_wiring.jpg`（面包板接线：8 个 LED 长脚接 5V 电源轨，短脚经 1K 电阻接 D2–D9；图中标注 “短脚 / 电阻1K / 长脚”）

### 程序原理
首先，我们将 D2–D9 引脚设置为高电平，即所有 LED 的初始状态都是熄灭，然后将数字 D9 引脚切换为低电平，因此最左边的 LED 亮起。延迟 500ms 后，我们将 D8–D2 引脚置为低电平，其他引脚保持高电平，这样第一轮每个 LED 开启 500ms。在第二轮中，我们将 D9 号引脚设置为低电平，第一个 LED 亮起，然后将所有 LED 从左到右置于低电平，现在所有灯都发光，此循环继续。它的效果看起来像“自来水”。如果你想让 LED 快速闪烁，你可以减少延迟时间，但如果延迟时间太短，看起来我们眼中的所有 LED 都一直亮着；如果您希望 LED 缓慢闪烁，可以延长延迟时间，但如果时间延迟太长，您可能无法看到闪烁效果。
> 注意：文字说 500ms，程序里 flash_speed = 100（100ms）。以程序为准。

### 程序（原样，仅统一缩进）
```cpp
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
```
> 讲解提示（实际运行效果）：第一轮所有灯本来是灭的，led_flash() 产生“单灯从左跑到右”；led_turn_off() 时灯已经全灭，只是等待 0.8 秒；led_turn_on() 让灯从左到右逐个点亮直到全亮。第二轮开始，灯已全亮，led_flash() 变成“从左到右逐个熄灭”。想每轮都看到单灯跑动，可把 loop() 改成 led_flash(); led_turn_on(); led_turn_off();

### 实验结果
你看到了结果吗？惊喜？你在等什么？请快点为你的女朋友做一个心形的流水灯。
图片：`flow_result_photo.jpg`（实物照片：8 个 LED（黄、红）在面包板上，接 UNO）

---

## 四、蜂鸣器模块实验（PDF p12–15）

### 介绍
有些电器在电气状态下经常会发出嗡嗡声，这实际上来自蜂鸣器，学校里讨厌的铃声只是一个更大的蜂鸣器。有两种蜂鸣器，一个是主动蜂鸣器，另一个是被动蜂鸣器。“主动”和“被动”并不是指是否需要提供电源，而是指有或没有内部振荡器的蜂鸣器。只要你给它通电，有源蜂鸣器就会发出嗡嗡声，但频率是固定的。无源蜂鸣器，是没有内部振荡器的蜂鸣器，在通电时，内部振荡器时不会发出嗡嗡声，它需要 2~5 kHz 的方波驱动，然后不同频率的波形会发出相应的声音。蜂鸣器模块有三个管脚，其中标注 ‘-’ 的管脚接地(GND)，中间的管脚接 5V，（图中左侧）标注 "S" 的管脚接信号(数字 I/O)；
图片：`buzzer_active_module.jpg`（有源蜂鸣器模块，黑色，S V G 三针）、`buzzer_passive_module.jpg`（无源蜂鸣器模块，蓝色板）

### 实验目的
Arduino 可用于创建大量的交互式工作，最常见的是声光显示。我们之前已经在实验中使用过 LED，现在我们开动蜂鸣器来播放两个频率的声音。只要频率与乐谱相匹配，我们就能听到美妙的音乐。

### 组件清单
Arduino Uno 主板；面包板；USB 数据线；有源蜂鸣器模块 ×1，无源蜂鸣器模块 ×1；若干跳线

### 接线
我们有源蜂鸣器与无源蜂鸣器的实物接线一样。
| Arduino UNO R3 | buzzer |
|---|---|
| VCC | V |
| GND | G |
| 9 | S |
图片：`buzzer_wiring.jpg`（UNO 与有源蜂鸣器模块接线图）

### 实验一程序：有源蜂鸣器模块测试
```cpp
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
```
### 实验一有源蜂鸣器实验结论
我们有源蜂鸣器发出只有一个频率滴滴的声音
图片：`buzzer_active_photo.jpg`（实物照片：有源蜂鸣器模块接 UNO）

### 实验二程序：无源蜂鸣器模块测试
```cpp
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
```
> 讲解提示：delay() 只接受整数毫秒，delay(0.5) 会被截成 delay(0)，frequence_1 实际几乎不等待，频率远高于 1kHz、800 次在几毫秒内就结束，基本听不到。要得到 1kHz（周期 1ms：高 0.5ms + 低 0.5ms），应写 delayMicroseconds(500)。frequence_2：高 2ms + 低 2ms = 周期 4ms → 250Hz，800 个周期约 3.2 秒。

### 实验二无源蜂鸣器实验结论
打开程序 buzzer\buzzer.ino；接线不变直接将我们将有源蜂鸣器用无源蜂鸣器代替即可；我们的无源蜂鸣器没有正负极之分；我们可以听到两个频率不一样的蜂鸣声；
图片：`buzzer_passive_photo.jpg`（实物照片：无源蜂鸣器插在面包板上接 UNO）

---

## 五、小磁簧开关模块实验（PDF p16–20）

### 小磁簧开关模块介绍
磁簧开关的工作原理非常简单，两片端点处重叠的可磁化的簧片（通常由铁和镍这两种金属所组成的）密封于一玻璃管中，两簧片呈交迭状且间隔有一小段空隙（仅约几个微米），这两片簧片上的触点上镀有层很硬的金属，通常都是铑和钌，这层硬金属大大提升了切换次数及产品寿命。玻璃管中装填有高纯度的惰性气体（如氮气），部份干簧开关为了提升其高压性能，更会把内部做成真空状态。簧片的作用相当于一个磁通导体。在尚未操作时，两片簧片并未接触；在通过永久磁铁或电磁线圈产生的磁场时，外加的磁场使两片簧片端点位置附近产生不同的极性，当磁力超过簧片本身的弹力时，这两片簧片会吸合导通电路；当磁场减弱或消失后，干簧片由于本身的弹性而释放，触面就会分开从而打开电路。
小磁簧开关在没有磁场时是常开的，当足够强度的磁场产生时，两个簧片会吸和.
图片：`reed_module_photo.jpg`（小磁簧开关模块实物：玻璃管簧片焊在黑色小板上，三针）

### 实验目的
- 学习磁簧开关的特性和工作原理；
- 使用小磁簧开关控制 LED 灯的亮灭。

### 实验原理
小磁簧开关在通电时，当没有磁通量通过小磁簧开关的时候，开关处于断开状态，当有磁铁等产生磁感线的物体靠近小磁簧开关时，产生了磁通使得小磁簧开关导通，让 LED 灯亮起来，蜂鸣器响。

### 组件清单
Arduino UNO R3 主板；面包板；USB 数据线；小磁簧开关模块 ×1；LED ×1；有源蜂鸣器 ×1；若干跳线

### 接线
| Arduino UNO | 小磁簧开关 |
|---|---|
| 5V | VCC（R） |
| GND | GND(G) |
| 12 | OUT(Y) |

| Arduino UNO | LED 模块 |
|---|---|
| 11 | + |
| GND | — |

| Arduino UNO | 有源蜂鸣器 |
|---|---|
| 13 | + |
| GND | — |
图片：`reed_wiring.jpg`（接线图：UNO 接 RGB 灯模块、小磁簧开关模块、蜂鸣器）

### 程序（原样，仅统一缩进）
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

### 实验结果
图片：`reed_result_photo.jpg`（实物照片：磁铁靠近小磁簧开关，RGB 灯亮，面包板上有蜂鸣器）
用一个磁铁靠近小磁簧开关，会使得小磁簧开关输出低电平，从而点亮 LED 灯，蜂鸣器响。如果你的套件中有 Sensor V5.0 的扩展板，按照下图接线，更加方便。
图片：`reed_shield_photo.jpg`（Sensor V5.0 扩展板接线照片：蜂鸣器、磁簧开关、RGB 模块用杜邦线接到扩展板）
