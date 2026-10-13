# Arduino 互动实验室 — 工程规格（所有构建者必须遵守）

目标：把 5 份实验指南（1-2、1-3、2-1、2-2、2-3，共 19 个实验）做成学生可以自己操作的网页互动课件。
每个实验 = 几页讲解（原理、接线、代码逐行看懂）+ 一个 **动手实验室**：学生能运行指南里的真实程序、修改代码、拖旋钮/按按键/移动磁铁和障碍物，看 LED、舵机、蜂鸣器（有声音）、LCD、灯环、串口监视器像真的一样反应。
风格参考：用户之前很喜欢的网页版（`../arduino-ppt` 旧手册的“运行”页：左侧深色代码编辑器带标签页和 ▶运行 / ■停止 / ↺原始代码 / 速度；右上“虚拟电路”卡片区；右下串口监视器（波特率、清空、输入框+发送）和变量面板；底部状态栏“运行中 · loop() 已执行 N 次 · x 秒”）。参考截图：`/tmp/claude-0/-home-user-Ericzm214/b4d537fd-f704-5f1f-bbc7-6daa86fa8a08/scratchpad/ref/old_hi-015.jpg、018、021、025、028、122、126`。
视觉换成青绿模版（见 §6），和 PPT 一致。

---

## 1. 目录结构（固定）

```
arduino-sim/
  index.html          完整 HTML 文档（本地双击可用）：课程首页 + 课件容器（hash 路由）
  sim/sim.css         全部样式（设计令牌、首页、课件、实验室、元件）
  sim/interp.js       Arduino C 子集解释器（无 DOM，Node 和浏览器通用）
  sim/hw.js           虚拟硬件：引脚、虚拟时钟、串口、库（Servo / LCD / NeoPixel / DHT11 / Wire / 超声波）
  sim/parts.js        虚拟元件（DOM/SVG 小部件），通过 hw API 读写
  sim/lab.js          实验室界面：编辑器、控制条、串口监视器、变量、引脚面板、任务卡
  sim/deck.js         课件框架：翻页、键盘、进度、目录、各类讲解页渲染
  lessons/l12.js … l23.js   每课的讲解页 + 实验室配置（数据，不含引擎逻辑）
  img/l12 … l23/       指南图片（已压缩）
  test/                node 解释器测试 + playwright 冒烟测试
```
脚本加载顺序（index.html 末尾）：`sim/interp.js` → `sim/hw.js` → `sim/parts.js` → `sim/lab.js` → `sim/deck.js` → `lessons/*.js` → 启动。
所有脚本是普通 `<script src>`（不用 ES module、不用打包器），每个文件用 IIFE 把公开对象挂到 `window.SIM`（Node 下挂到 `globalThis.SIM`，并 `module.exports = SIM` 方便测试）。
**不加载任何外部 JS 库**（编辑器自己写：textarea 叠在高亮的 pre 上）。字体只从 Google Fonts 加载（Noto Sans SC、Poppins、JetBrains Mono），都要有回退字体栈（"Microsoft YaHei"、"PingFang SC"、system-ui / Consolas、monospace）。
发布时 index.html 会被去掉 doctype/head 包装，所以 **index.html 里的 `<style>` 只写 `<link>` 引用，所有规则放 sim/sim.css**；`<title>Arduino 互动实验室</title>` 必须在文件前 8KB。

## 2. 解释器 `SIM.interp`（sim/interp.js）

### 2.1 API
```js
const r = SIM.interp.compile(source)          // → { ok:true, program } | { ok:false, errors:[{line, msg}] }
const run = new SIM.interp.Runner(program, board, { onError, onLine })
run.start()            // 执行全局初始化 → setup() → 反复 loop()
run.stop()
run.tick(wallMs, speed)  // 由 lab 每帧调用：推进虚拟时间 wallMs*speed 毫秒；有操作预算（默认 40000 步/帧），超预算则把虚拟时间直接跳到目标（标记 fastLoop=true）
run.state              // 'idle' | 'running' | 'stopped' | 'error' | 'done'
run.curLine            // 当前执行到的源代码行号（1 起）
run.loopCount          // loop() 已执行次数
run.globals()          // [{name, type, value:string}]  供变量面板；数组显示为 {2,3,4,…}，String 带引号，char 显示 'A'(65)
```
错误对象 `{line, msg}`：`msg` 用中文解释 + 括号里给 IDE 原文，例如 `第 24 行：缺少右大括号 }（expected '}' at end of input）`、`'Wire' 没有声明：是不是忘了 #include <Wire.h>？（'Wire' was not declared in this scope）`。运行时错误同样格式（数组越界、调用未定义函数、除以 0 → 警告但不中断：AVR 上整数除 0 结果为 -1/不确定，给警告即可）。

### 2.2 支持的语言子集（必须全部覆盖）
- 预处理：`//`、`/* */` 注释（保留行号）；`#include <X>` / `#include "X"` 记录库；`#define NAME 值`（对象式宏，按 token 替换）。未 include 而使用 Wire / Servo / LiquidCrystal_I2C / Adafruit_NeoPixel / dht11 → 编译错误（Wire 的例外见 2.4）。
- 类型：`void int long short float double char byte bool boolean word String unsigned (int|long|char) uint8_t int16_t uint16_t int32_t uint32_t`，`const`、`static` 修饰。库类型：`Servo`、`LiquidCrystal_I2C`、`Adafruit_NeoPixel`、`dht11`。
- 声明：全局/局部、多变量 `int a=1, b;`、数组 `int a[8] = {…}`、`int a[] = {…}`、二维数组可不支持；对象 `Servo s;`、`LiquidCrystal_I2C lcd(0x27,16,2);`、`Adafruit_NeoPixel pixels(12, 10, NEO_GRB + NEO_KHZ800);`、`dht11 DHT11;`。
- 函数：任意返回类型，形参 `()` / `(void)` / 列表；`return`；递归可以支持但不必优化。
- 语句：块、`if / else if / else`、`for`（init 可声明变量）、`while`、`do…while`、`break`、`continue`、`switch/case/default`、表达式语句、空语句 `;`。
- 表达式：赋值 `= += -= *= /= %= &= |= ^= <<= >>=`、三目、`|| && | ^ &`、`== !=`、`< > <= >=`、`<< >>`、`+ -`、`* / %`、一元 `! - + ~ ++ --`（前后缀）、强制转换 `(int)` `(float)` `(long)` `(byte)` `(char)` 等、函数调用、`obj.method(args)`、`obj.member`、数组下标、字面量（十进制、`0x27`、`0b101`、`12.5`、`1e3`、`'A'`、`'\n'`、`"字符串"` 含 `\n \t \\ \"` 转义、`true/false/HIGH/LOW/INPUT/OUTPUT/INPUT_PULLUP/LED_BUILTIN/A0…A5/DEC/HEX/BIN/OCT/NEO_GRB/NEO_KHZ800` 等常量）。
- 条件里的赋值 `if(val=0)` 按 C 语义执行（值为 0 → 假），这是要演示的坑。

### 2.3 数值语义（UNO = AVR，必须准确，这是教学重点）
- `int`/`short` 16 位有符号（-32768…32767，溢出回绕），`long` 32 位，`unsigned int` 16 位，`unsigned long` 32 位，`byte/uint8_t` 8 位无符号，`char` 8 位有符号，`bool` 0/1。
- 算术：两边都是整数 → 整数运算（除法向 0 截断：`7/2 = 3`，`338/1023 = 0`），结果宽度按 C 提升（至少 int）；有 float/double → 浮点（float 用 `Math.fround`，double 在 AVR 上也是 32 位 float）。
- 赋值时转换成变量的声明类型（回绕/截断，float→int 向 0 截断）。`(int)(voltage*256)` 同理。
- 函数实参按形参类型转换：**`delay(0.5)` → `delay(0)`**（unsigned long），`delay(-1)` → 很大。
- `String`：`String s = ""`、`s += 'a'`（追加字符）、`s += 5`（追加 "5"）、`s + "x"`、`==`/`!=`、`s.toInt()`（解析前导整数，失败 0）、`s.length()`、`s.indexOf()`、`s.trim()`、`s.charAt()`、`s.toFloat()`。
- `char` 打印为字符；`byte`/`int` 打印为数字。

### 2.4 内置函数与库（行为细节）
- `pinMode, digitalWrite, digitalRead, analogRead, analogWrite, delay, delayMicroseconds, millis, micros, map(长整型运算, 向 0 截断), constrain, min, max, abs, sq, sqrt, pow, random(n) / random(a,b), randomSeed, tone(pin,freq[,ms]), noTone(pin), pulseIn(pin, level[, timeout])`。
- `analogWrite(pin, v)`：只有 3 5 6 9 10 11 支持 PWM；`v<=0` → LOW；`v>=255`：**255 → HIGH；256 → 写入 8 位寄存器后变 0 → 熄灭**（v & 255，=0 时几乎全灭），其余 → 占空比 v/255；非 PWM 引脚 `v<128` LOW 否则 HIGH（并给一次警告“X 号脚不支持 PWM”）。
- `digitalRead`：输入脚由元件决定；`INPUT` 且没有元件驱动 → 浮空：随机 0/1 并给一次提示；`INPUT_PULLUP` 或 `pinMode(INPUT)` 后 `digitalWrite(pin,HIGH)`（老写法开上拉）→ 无驱动时读 1。
- `analogRead(A0…A5)`：由元件给 0…1023；数字 0…5 也表示 A0…A5（`analogRead(0)` = A0）。耗时约 112µs。
- `Serial.begin(b)`、`print(x)`、`print(x, DEC|HEX|BIN|OCT)`、`print(float, n位小数)`（float 默认 2 位）、`println(...)`（追加 `\r\n`）、`println()`、`available()`、`read()`（无数据 -1）、`peek()`、`write(c)`、`while(!Serial)`（Serial 在布尔上下文为真）。没调用 begin 就 print → 不输出 + 一次提示。
- `Wire`：`begin()`、`beginTransmission(addr)`、`endTransmission()`（总线上有该地址设备 → 0，否则 2）、`write()`。**没有 `#include <Wire.h>` 时使用 Wire → 编译错误**（指南扫描程序的原样版本就要报这个错）；但 `#include "LiquidCrystal_I2C.h"` 时允许 Wire（真实库也会带进来）。
- `Servo`：`attach(pin)`、`write(a)`（<0 → 0；>180 且 <544 → 180；≥544 视为微秒 544…2400 → 0…180）、`writeMicroseconds(us)`、`read()`、`detach()`、`attached()`。舵机转动有速度（约 0.12s/60°，SG90），由 hw 平滑。
- `LiquidCrystal_I2C lcd(addr, cols, rows)`：`init()`、`begin()`、`backlight()`、`noBacklight()`、`clear()`、`home()`、`setCursor(col,row)`、`print(x[,fmt])`、`write(c)`。DDRAM 每行 40 格，屏幕只显示前 16 格（第 17 格起写入但看不见——指南里 “Science Robot” 的 t 就看不见）。地址必须等于总线上 LCD 的地址（默认 0x27）且 SDA=A4、SCL=A5 接好，否则屏幕没有字。
- `Adafruit_NeoPixel`：`begin()`、`show()`（把缓冲区推到灯上；没 show 灯不变）、`setPixelColor(i, c)` / `setPixelColor(i, r, g, b)`、`Color(r,g,b)`（打包成 24 位 → 返回 unsigned long）、`setBrightness(b)`（show 时按 b/255 缩放）、`clear()`、`numPixels()`、`getPixelColor(i)`。
- `dht11`：`read(pin)` → 0（成功）并把 `temperature`、`humidity`（整数）设为元件的温湿度；距上次读取 <1000ms 时仍返回上次数据（真实 DHT11 行为的简化），引脚不对 → 返回 -2（DHTLIB_ERROR_TIMEOUT）。成员 `DHT11.temperature`、`DHT11.humidity`。
- 超声波：`pulseIn(echo, HIGH)` 前 Trig 脚要有 ≥10µs 的高电平脉冲（hw 记录 Trig 脉宽）；有 → 返回 `distanceCm*58` µs（范围 2…400cm，超出返回 0），并推进虚拟时间；没触发 → 等到 timeout（默认 1s）返回 0。
- 时间代价（虚拟 µs）：普通语句 ≈1，`digitalWrite/digitalRead` ≈4，`analogRead` ≈112，`analogWrite` ≈6，`Serial.print` 每字符 ≈1040/（9600 波特时）但不阻塞超过 1ms（简化），`delay(ms)` 让出 ms*1000，`delayMicroseconds(us)` us。这样 `delay(0.5)` 版的无源蜂鸣器会以几十 kHz 翻转（听不见），`delay(2)` 版是 250Hz。

### 2.5 执行模型
- 解释器为生成器（`function*`），`delay`/`pulseIn`/预算耗尽时 `yield`。全局初始化 → `setup()` 一次 → 无限 `loop()`。
- `tick(wallMs, speed)`：目标虚拟时间 = 当前 + wallMs×speed×1000µs；一直执行到虚拟时间 ≥ 目标；若一帧执行步数超过预算，直接把虚拟时间设为目标（全速循环程序不卡死页面，`run.fastLoop = true`，状态栏显示“全速循环中”）。
- 运行中可以随时 stop；stop 后所有引脚复位（输出 LOW、PWM 0、舵机保持角度、LCD 保持内容但标记“已停止”）。
- 必须能跑 `../arduino-ppt/assets/*/guide_text.md` 里全部 ```cpp 代码块（22 段）+ `../arduino-ppt/build/00_language_basics.js` 里的 5 个示例程序，不报错、行为正确。

## 3. 虚拟硬件 `SIM.hw`（sim/hw.js）

```js
const board = new SIM.hw.Board({ i2c: [0x27], baud: 9600 })
board.now()                     // 虚拟 µs
board.reset()                   // 回到上电状态
// 引脚 0…19（A0=14 … A5=19）
board.pin(n)                    // → { mode:'INPUT'|'OUTPUT'|'INPUT_PULLUP'|null, level:0|1, pwm:null|0…255, pullup:bool }
board.pinLabel(n)               // 'D7' / 'A0'
board.on('pin', (n, state, tUs) => …)        // 模式/电平/PWM 变化（含时间戳，蜂鸣器用来算频率）
board.setDigitalSource(n, () => 0|1|null)    // 元件注册：读这个脚时返回的电平（null = 不驱动）
board.setAnalogSource(n, () => 0…1023)
// 串口
board.on('serial', text => …)                // 程序输出（原始文本，含 \r\n）
board.serialSend(text)                       // 串口监视器“发送”：把字符放入接收队列（行结束符由 lab 拼好）
board.serialBaud                             // 程序 Serial.begin 的波特率（null = 未开）
// 设备状态（元件只读，hw 在库调用时更新并触发事件）
board.servo(pin)        → { attached, target, angle }      board.on('servo', …)
board.lcd(addr)         → { cols:16, rows:2, ddram:['…40 字…','…'], backlight, inited, cursor:{c,r} }   board.on('lcd', …)
board.neopixel(pin)     → { count, shown:[[r,g,b]…], brightness }     board.on('neopixel', …)
board.tone(pin)         → { freq|null }                    board.on('tone', …)
// 传感器参数（元件写入）
board.sensors.ultrasonic = { trig:2, echo:3, distanceCm: 20 }
board.sensors.dht = { pin:8, temperature: 24, humidity: 46 }
board.i2c = new Set([0x27])
board.warn(msg)  /  board.on('warn', msg => …)  // 一次性提示，显示在实验室状态区
```

## 4. 虚拟元件 `SIM.parts`（sim/parts.js）

每个元件：`SIM.parts.create(type, config, board) → { el, update(), destroy() }`；`el` 是一张卡片（标题 + 引脚标签 + 图形 + 读数），lab 把它放进“虚拟电路”区域。元件通过 `board.on(...)` 或在 `update()`（每帧调用）里读状态。全部用 SVG/DOM 自己画，支持鼠标、触摸、键盘（可聚焦，空格/方向键操作），状态要有文字读数（例如“读数 512 (2.50V)”、“亮度 50%”、“角度 90°”）。

| type | config | 行为 |
|---|---|---|
| `led` | `{pin, color, label, activeLow?}` | 亮度 = PWM 占空比 或 电平；activeLow 时 LOW 亮（流水灯共阳）|
| `rgbLed` | `{pins:{r,g,b}, label}` | 三通道混色，显示 R/G/B 数值 |
| `ledBar` | `{pins:[2,3,…,9], activeLow:true, label}` | 一排 8 灯 |
| `button` | `{pin, label, pressedLevel:0}` | 按住才按下；松开回到 1（模块自带上拉）|
| `touch` | `{pin, label}` | 手指放上 → 1，离开 → 0 |
| `limitSwitch` | `{pin, label}` | 压下摆杆 → 0，松开 → 1，模块指示灯同步 |
| `tilt` | `{pin, label}` | 倾斜角滑块（-90…90°）＋“碰一下”按钮（短暂断开）；倾斜 >10° 向帽盖端 → 断开读 1，水平/向引脚端 → 闭合读 0（与程序“读到 0 报警”一致时请在 lesson 里说明观察方法）|
| `pot` | `{pin, label, vcc:5|3.3}` | 旋钮可拖动＋滑块；读数 = 位置×vcc/5×1023；显示 读数/电压 |
| `ldr` | `{pin, label}` | 光照滑块＋“用手盖住”按钮；**本模拟：越亮读数越大**（卡片上写一行小字：实物模块可能相反）|
| `buzzer` | `{pin, kind:'active'|'passive', label}` | 有源：高电平就响（固定约 2.3kHz）；无源：根据最近 50ms 内引脚翻转的虚拟时间间隔算频率，20Hz…20kHz 用 WebAudio 方波播放，>20kHz 显示“频率太高，人耳听不到”；也响应 tone()。卡片上有“开启声音”按钮（浏览器要求用户点击后才能出声），显示频率读数和声波动画 |
| `reed` | `{pin, label}` | 可拖动的磁铁（或距离滑块），距离 < 1.5cm → 簧片吸合（动画）→ 读 0 |
| `servo` | `{pin, label}` | 舵机臂按角度转动（平滑），显示角度 |
| `joystick` | `{x:14, y:15, buttons:{2:'A',3:'B',4:'C',5:'D',6:'E',7:'F',8:'K'}, label}` | 可拖动摇杆（松手回中，静止 x≈525、y≈518，与指南截图一致；上推 y 增大、右推 x 增大），7 个按键按住读 0 |
| `ultrasonic` | `{trig, echo, label}` | 障碍物距离滑块 2…400cm＋示意图（声波往返）|
| `ir` | `{pin, label}` | 障碍物距离滑块＋“检测距离”小旋钮（2…30cm）；距离 ≤ 阈值 → 模块绿灯亮，OUT 读 0 |
| `dht11` | `{pin, label}` | 温度 0…50°C、湿度 20…90% 两个滑块（整数）|
| `lcd1602` | `{addr:0x27, label}` | 16×2 字符格（等宽、像素风），背光，背面对比度旋钮（太低看不见字，太高满屏黑块，中间正常）|
| `neopixel` | `{pin, count:12, label}` | 12 颗灯排成环，显示 show() 后的颜色×亮度 |
| `board` | `{}` | “Arduino UNO” 小卡：ON 灯、L 灯（13 号脚）、TX 灯（串口输出时闪）|

## 5. 实验室 `SIM.lab`（sim/lab.js）与课件 `SIM.deck`（sim/deck.js）

### 5.1 实验室配置（lessons/*.js 里写）
```js
{
  programs: [                          // ≥1 个；多个时显示为编辑器顶部标签页
    { name: 'button.ino', label: '按键程序', code: `…原样代码…` },
    { name: 'scanner_原样.ino', label: '原指南原样', code: `…`, note: '原指南少了 #include <Wire.h>，运行会报错，看看错误提示' },
  ],
  parts: [ { type:'board' }, { type:'button', pin:7, label:'按键模块 S→D7' }, { type:'led', pin:11, color:'#ff4d4f', label:'LED +→D11' } ],
  i2c: [0x27], baud: 9600,
  sensors: { ultrasonic:{trig:2, echo:3, distanceCm:20} },
  tasks: [                              // 任务卡：学生按顺序做
    { text: '点 ▶ 运行，按住按键：LED 亮了吗？松开呢？' },
    { text: '把第 13 行的 LOW 改成 HIGH 再运行，按键的作用反过来了吗？', code: `…可选：一键载入的参考代码…` },
  ],
  note: '可选一行说明'
}
```
`SIM.lab.mount(container, config) → { destroy(), run(), stop(), loadProgram(i), board, runner }`（deck 在显示实验室页时 mount，离开时 destroy；同一时刻只运行一个实验室）。

### 5.2 实验室界面（照旧网页版布局，换青绿风格）
- 左：代码编辑器（深色底 #262A2A 左右，行号，语法高亮：关键字青绿、函数白色加粗、数字/字符串琥珀、注释灰斜体；当前执行行高亮条；编辑时 Tab 插 2 空格；内容改动后标签显示“已修改”）。工具条：程序标签页 · ▶ 运行 · ■ 停止 · ↺ 原始代码 · 速度（0.1× 慢动作 / 0.5× / 1× / 2× / 5×）· “跟随行”开关。底部状态栏：`运行中 · loop() 已执行 15 次 · 3.2 秒`／`编译错误：第 24 行…`（错误行在编辑器里标红）。
- 右上：“虚拟电路”卡片区（自动换行网格）。
- 右下：串口监视器（深色，等宽；波特率下拉 9600/115200——和程序 Serial.begin 不一致时显示乱码字符；清空；自动滚动；输入框 + 行结束符下拉【没有结束符 / 换行 / 回车 / 换行和回车】+ 发送，回车键也发送）＋ 变量面板（全局变量实时值）＋ 引脚面板（用到的引脚：模式、HIGH/LOW、PWM 条）。
- 任务卡区（实验室下方或侧边）：编号任务，可勾选完成（localStorage 记住，try/catch 包裹），带“载入参考代码”按钮。
- 手机宽度：上下堆叠，编辑器高度可滚动，不出现横向滚动。

### 5.3 课件（deck）
- 首页（index.html 默认视图）：课程名、怎么用（3 步）、5 张课次卡片（课次号、标题、实验列表、页数），点击进入 `#l12` 等。
- 课件视图：顶部条（← 首页 · 课次标题 · 实验目录下拉 · 页码 n/N），中间一页，底部 ←/→ 按钮 + 进度点；键盘 ←/→/PageUp/PageDown 翻页（焦点在编辑器/输入框时不拦截）；hash `#l12-7` 记住页码。
- 讲解页类型（deck 提供渲染器，lessons 只写数据）：
  - `{kind:'cover', title, subtitle, kicker}` 课次封面（青绿整屏，像 PPT 封面）
  - `{kind:'section', no:'实验 01', title, desc, tiles:[{title,sub}…4]}` 实验分节页（左文右 2×2 色块）
  - `{kind:'html', title, desc, body}` 通用页（body 用 sim.css 提供的工具类：`.grid-2 .grid-3 .card .card.dark .card.warn .tile .callout .tag .figure .table .steps`）
  - `{kind:'figure', title, desc, img:'img/l12/xxx.jpg', caption, side:'html…'}` 大图＋旁注（图片等比显示，不裁切，可点击放大）
  - `{kind:'wiring', title, desc, img, caption, tables:[{left:'Arduino UNO', right:'按键模块', rows:[['7','S'],…]}], note}`
  - `{kind:'code', title, desc, file, code, from, to, hl:[行号], notes:[{line, text}|{line:[a,b], text}]}` 代码逐行看懂（行号与原程序一致）
  - `{kind:'lab', title, desc, lab:{…}}` 动手实验室（占满宽度）
  - `{kind:'tasks', title, desc, items:[…]}`、`{kind:'summary', …}` 可用 html 实现
- 每页都要能在 1280×720 和 390×844 下正常显示（内容多时页内滚动，不横向溢出）。

## 6. 视觉（青绿模版，和 PPT 一致）

令牌（写在 sim.css 顶部，暗色模式按 Artifact 规范重定义）：
```css
:root{
  --turq:#40E0D0; --turq-deep:#1A9E92; --turq-pale:#E3FAF7;
  --ink:#2D2D2D; --muted:#6B6B6B; --line:#E2E2E2; --card:#F5F5F5; --gray1:#EBEBEB;
  --bg:#FFFFFF; --fg:#2D2D2D; --red:#E5484D; --amber:#F7C873;
  --code-bg:#262A2A; --code-fg:#D9D9D9; --code-line:#3E5250;
  --font-ui:"Noto Sans SC","Poppins","Microsoft YaHei","PingFang SC",system-ui,sans-serif;
  --font-head:"Poppins","Noto Sans SC","Microsoft YaHei",sans-serif;
  --font-code:"JetBrains Mono",Consolas,"Courier New",monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#151818; --fg:#E8ECEB; --card:#1F2424; --gray1:#262C2C; --line:#333A3A; --muted:#9AA3A2; --turq-pale:#123A36; --ink:#E8ECEB; color-scheme:dark } }
:root[data-theme="dark"]{ …同上… }
body{ background:var(--bg); color:var(--fg) }
```
- 封面/结束页：整屏青绿底、炭黑大字（同 PPT 封面）。内容页：白底、左上标题（24–28px 常规字重）+ 一句灰色说明，内容区用圆角浅灰卡片、2×2 色块、青绿圆形图标；“常见错误”用红色描边卡片。
- 不用渐变、不用 emoji 当图标（图标用内联 SVG）、不要每块都加阴影；按钮可点状态明显；键盘焦点可见；`prefers-reduced-motion` 时关闭动画。

## 7. 测试（必须）
- `node test/interp.test.js`：编译并运行全部 22 段指南程序 + 5 个语言示例，用脚本化输入断言行为，例如：
  - AD：电位器 399 → 串口含 `get ad pin value 399` 和 `1.95`；
  - 1-2 按键：按下（读 0）→ 11 号脚 HIGH；
  - 光敏/PWM：读数 1023 → `(int)(1.0*256)=256` → analogWrite(256) 熄灭；
  - 流水灯：前 800ms 内 2…9 号脚依次 LOW；
  - 无源蜂鸣器 frequence_2：9 号脚翻转周期 4ms（250Hz）；frequence_1（delay(0.5)）翻转周期 < 50µs；
  - 超声波距离 15cm → `distance is :15.00cm`；
  - 串口舵机：发送 "90"（没有结束符）→ 输出 `Servo degree: 90`，舵机目标 90；
  - 摇杆：x=500 → ` left`；按 A（2 号脚读 0）→ `Button A is pressed`；
  - DHT11 24°C/46% → LCD 第 1 行 `Tep: 24.00C`，第 2 行 `Hum: 46.00%`；
  - LCD：第 1 行 `Hello Word`，第 2 行从第 4 格起 `Science Robo`（第 16 格起不可见）；
  - I2C 扫描（补上 Wire.h 后）→ `Found address: 39 (0x27)`、`Found 1 device(s).`；原样版本 → 编译错误提到 Wire；
  - 舵机（电位器）程序原样版本（缺 `}`）→ 编译错误；修正版：A0=675 → 角度 168；
  - 语义单测：`7/2==3`、`int` 回绕、`delay(0.5)`→0、`'A'` 打印为 A、`String` 拼接与 toInt、`map(512,0,1023,0,255)==127`。
- `NODE_PATH=/opt/node22/lib/node_modules node test/smoke.js`（playwright 已全局安装，`require('playwright').chromium.launch()` 直接可用，浏览器在 /opt/pw-browsers；不要运行 playwright install）：打开 index.html（file://），进入每课，翻到每个实验室页，点运行，做一个交互，断言串口/元件状态变化，截图到 scratchpad，并且 **控制台零报错**。
