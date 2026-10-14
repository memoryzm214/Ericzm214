# 实验指南 2-3 转录（程序、接线、图片、讲解提示）

来源：用户提供的 2-3 实验指南 PDF（7 页）。正文原文见同目录 `guide_raw.txt`（PDF 文字层）；第 1–2 页（WS2812b 实验）大部分是图片，文字层不全，已在下面手工转录。PDF 原件可用 Read 工具按页查看。本指南没有 mBlock / Mixly 内容。

本指南共 2 个实验：
1. WS2812b RGB LED 模块实验（PDF 第 1–2 页）
2. 串行 LCD1602 模块动态显示屏实验（第 3–7 页）

---

## 一、WS2812b RGB LED 模块实验（p1–2）

**1、介绍**：12 位 RGB 灯环采用 12 颗 WS2812RGB 灯珠串联组成，只需要一个 IO 口就可以驱动此模块。WS2812 RGB 灯内部集成了一个芯片，我们只需单个 IO 口就可以控制 WS2812RGB 灯，D 脚为信号输出可以串连下个灯珠，R 脚为信号输入控制 RGB 灯珠颜色与串联数量，V 脚 VDD 为电源正极，G 脚为电源负极。
图片：`ws_module_photo.jpg`（RGB LED 环形灯（正面）/（背面），图中自带文字）
**2、组件清单**：Arduino UNO R3 主板；USB 数据线；WS2812b RGB LED 模块 ×1；若干跳线
**3、实验原理** 模块主要特点：
- 5050 高亮 LED，内置控制芯片，仅需 1 个 IO 口即可控制多个 LED 模块
- 芯片内置整形电路，信号畸变不会累计，稳定显示
- 三基色 256 级亮度调剂，16 万色真彩显示效果，扫描频率不低于 400Hz/S
- 串行级联接口，能通过一根信号线完成数据的接收与解码
- 刷新速率 30 帧/秒时，低速连级模式连级数不小于 512 点
- 数据收发速度最高可达 800Kbps
- 高亮 LED，光色亮度一致性高
> 讲解提示：“16 万色” 应为 1677 万色（256³）；原文照录时可加一句更正。

**4、连线**
| Arduino Uno | WS2812b RGB LED 模块 |
|---|---|
| 10 | R |
| 5V | V |
| GND | G |
图片：`ws_wiring.jpg`

**5、程序**（原文：Arduino 编写的程序如下图所示，您也可以直接打开程序文件，它是一个 .ino 文件）
```cpp
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
```
> 讲解提示：① 需要先在 “库管理” 安装 Adafruit NeoPixel 库；② `pixels` 是一个 “对象”，`pixels.begin()`、`pixels.show()` 是它的函数（对象.函数）；③ setPixelColor 只是把颜色写进 “草稿”，show() 才真正发出去点亮；④ setBrightness(30) 把整体亮度限制在约 30/255，保护眼睛也省电；⑤ loop 里每次都重写同样的白色，效果是 12 颗灯常亮白光。

**实验结果**（原文）：上传程序之后，12 bit RGB 灯会亮起；注意，不要直视太久！图片：`ws_result_photo.jpg`

---

## 二、串行 LCD1602 模块动态显示屏实验（p3–7）

**LCD1602 介绍**：原文见 guide_raw.txt（字符型 LCD，16 字符 × 2 行，HD44780 芯片，带 IIC 转接板 PCF8574 只用 SDA/SCL 两根线；电位器调对比度；跳线可设地址 0x20–0x27）。原文 “‘1602’ 表示每行 2 行和 16 个字符” 应为 “2 行、每行 16 个字符”；“PCA8574” 是 PCF8574 的兼容型号（NXP/TI），不算错，可顺带说明。
图片：`lcd_module_photo1.jpg`（背面：转接板与蓝色电位器）、`lcd_module_photo2.jpg`（侧面：排针）
**实验原理**（原文）：通过 Arduino UNO R3 主控板和串行 LCD1602 液晶显示屏连接，使用 I2C 通信，控制 LCD1602 液晶显示屏显示字符。
**实验目的**（原文）：通过 Arduino UNO R3 主控板控制 LCD1602 液晶显示屏显示字符。
**组件清单**：Arduino Uno R3 主板；面包板；USB 数据线；带转接板的 LCD1602 显示屏；若干跳线
**接线**（原文：首先，把转接板焊接到 LCD 显示屏上）
| LCD1602 模块 | Arduino |
|---|---|
| GND | GND |
| VCC | 5V |
| SDA | A4 |
| SCL | A5 |
图片：`lcd_wiring.jpg`、`lcd_connect_photo.jpg`（实物连接照片）

**程序 ① 扫描 I2C 地址**（原文：将以下代码拷贝到 Arduino IDE，并执行。然后选择工具 -> 串口监视器，把右下角的波特率改为 9600，即可读出 I2C 地址。很多的 I2C 转接板的默认地址为 0x27，但是为了能够确认自己的 I2C 转接板地址，最好自己去扫描一下，以防后面的实验出错。）
```cpp
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
```
> 讲解提示：原 PDF 的扫描程序 **少了第一行 `#include <Wire.h>`**，直接编译会报 “'Wire' was not declared in this scope”；页面上提示 “在最前面加上 #include <Wire.h>”。程序逻辑：挨个 “敲门” 8～119 号地址，有回应（endTransmission()==0）就打印出来。
图片：`lcd_i2c_scan_serial.jpg`（串口：I2C scanner. Scanning ... / Found address: 39 (0x27) / Done. / Found 1 device(s).）原文：串口监视器扫描到的 I2C 地址为 0x27。（39 是十进制，0x27 是十六进制，同一个数）

**程序 ② 烧录显示字符程序**
```cpp
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
```
> 讲解提示：① setCursor(列, 行)，列和行都从 0 开始：(0,0) 是第 1 行第 1 格，(4,1) 是第 2 行第 5 格；第一个注释 “2nd line” 写错了（其实是第 1 行开头）；② “Hello Word” 是原程序拼写（Word 应为 World）；结果照片里屏幕显示 “Hello, world!”，与程序文字不同，说明照片来自另一版程序——页面上如实注明；③ 程序全写在 setup() 里只显示一次，loop() 空着也没关系；④ 需要安装 LiquidCrystal_I2C 库（套件资料提供）。
**实验结果**：图片 `lcd_result_photo.jpg`
**LCD1602 显示常见问题及解决方案**（原文）：如果碰到上传程序后背景灯亮了，但是不显示字符的问题，尝试去调节转接板后面的电位器，调节亮度和显示效果。
