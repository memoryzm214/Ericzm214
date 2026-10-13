#!/usr/bin/env node
/* test/interp.test.js — engine tests for sim/interp.js + sim/hw.js (SIM_SPEC §7)
   Plain Node, no framework:  node test/interp.test.js   (exit code 1 on any failure)
   - extracts every ```cpp block from ../arduino-ppt/assets/l1x|l2x/guide_text.md (22 programs)
     and the example programs embedded in ../arduino-ppt/build/00_language_basics.js
   - compiles + runs them with scripted inputs (digital/analog sources registered on the board,
     runner.tick() stepped deterministically) and asserts the behaviour listed in the spec
   - unit tests for AVR integer/float semantics, Serial formatting, libraries, errors, timing
*/
'use strict';
const fs = require('fs');
const path = require('path');
const SIM = require('../sim/hw.js');
require('../sim/interp.js');

const ROOT = path.resolve(__dirname, '..');
const PPT = path.resolve(ROOT, '..', 'arduino-ppt');

// ------------------------------------------------------------------ mini test harness
let passed = 0, failed = 0, current = '';
const failures = [];
function test(name, fn) {
  current = name;
  try { fn(); } catch (e) { failed++; failures.push(`${name}: EXCEPTION ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
}
function ok(cond, msg) {
  if (cond) passed++;
  else { failed++; failures.push(`${current}: ${msg || 'assertion failed'}`); }
}
function eq(a, b, msg) {
  const same = Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
  ok(same, `${msg || 'eq'} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, `${msg || 'near'} — expected ${b}±${tol}, got ${a}`); }
function has(text, needle, msg) { ok(String(text).includes(needle), `${msg || 'contains'} — ${JSON.stringify(needle)} not in ${JSON.stringify(String(text).slice(0, 300))}`); }

// ------------------------------------------------------------------ program sources
function guidePrograms(lesson) {
  const t = fs.readFileSync(path.join(PPT, 'assets', lesson, 'guide_text.md'), 'utf8');
  const out = [];
  const re = /```cpp\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(t))) out.push(m[1]);
  return out;
}
const G = {};
for (const l of ['l12', 'l13', 'l21', 'l22', 'l23']) G[l] = guidePrograms(l);
const deckSrc = fs.readFileSync(path.join(PPT, 'build', '00_language_basics.js'), 'utf8');
function deckProgram(name) {
  const m = new RegExp('const ' + name + ' = `([\\s\\S]*?)`;').exec(deckSrc);
  if (!m) throw new Error('deck program not found: ' + name);
  return m[1];
}
const LANG = {};
for (const n of ['SKELETON', 'SERIAL_DEMO', 'IF_DEMO', 'FOR_DEMO', 'FUNC_DEMO', 'MAP_DEMO']) LANG[n] = deckProgram(n);

// ------------------------------------------------------------------ simulation helper
function sim(code, opts) {
  opts = opts || {};
  const r = SIM.interp.compile(code);
  if (!r.ok) throw new Error('compile failed: ' + JSON.stringify(r.errors));
  const b = new SIM.hw.Board({ i2c: opts.i2c || [], baud: 9600, sensors: opts.sensors });
  const s = { b, out: '', warns: [], errors: [], pins: [], compile: r };
  b.on('serial', t => { s.out += t; });
  b.on('warn', w => s.warns.push(w));
  b.on('pin', (n, st, t) => s.pins.push({ n, level: st.level, pwm: st.pwm, mode: st.mode, t }));
  for (const k in (opts.digital || {})) b.setDigitalSource(+k, opts.digital[k]);
  for (const k in (opts.analog || {})) b.setAnalogSource(+k, opts.analog[k]);
  s.run = new SIM.interp.Runner(r.program, b, { onError: e => s.errors.push(e), budget: opts.budget });
  s.run.start();
  s.ms = (ms, speed) => {
    const t0 = b.now();
    let guard = 0;
    while (b.now() - t0 < ms * 1000 && s.run.state === 'running' && guard++ < 100000) s.run.tick(16, speed || 1);
    return s;
  };
  s.lines = () => s.out.split('\r\n');
  return s;
}
/** run a setup()-only snippet and return what it printed */
function printOf(body, globals) {
  const s = sim(`${globals || ''}\nvoid setup() {\n  Serial.begin(9600);\n  ${body}\n}\nvoid loop() {}\n`);
  s.ms(50);
  if (s.errors.length) throw new Error('runtime error: ' + JSON.stringify(s.errors));
  return s.out;
}
function errorsOf(code) {
  const r = SIM.interp.compile(code);
  return r.ok ? [] : r.errors;
}

// ================================================================== 0. all programs compile & run
test('all 22 guide programs + 5 language examples are found', () => {
  const n = Object.values(G).reduce((a, l) => a + l.length, 0);
  eq(n, 22, 'guide cpp blocks');
  eq(Object.keys(LANG).length, 6, 'language deck programs (skeleton + 5 examples)');
});
test('every program compiles (except the I2C scanner as printed) and runs 2 s without runtime errors', () => {
  const all = [];
  for (const l in G) G[l].forEach((c, i) => all.push([`${l}#${i + 1}`, c]));
  for (const n in LANG) all.push([n, LANG[n]]);
  for (const [name, code] of all) {
    const r = SIM.interp.compile(code);
    if (name === 'l23#2') { ok(!r.ok, 'scanner as printed must not compile'); continue; }
    ok(r.ok, `${name} compiles: ${JSON.stringify(r.errors)}`);
    if (!r.ok) continue;
    const s = sim(code, {
      i2c: [0x27],
      sensors: { ultrasonic: { trig: 2, echo: 3, distanceCm: 20 }, dht: { pin: 8, temperature: 24, humidity: 46 } },
      analog: { 14: () => 512, 15: () => 518 },
      digital: { 7: () => 1, 10: () => 1, 12: () => 1 }
    });
    s.ms(2000);
    ok(s.run.state === 'running', `${name} still running (state ${s.run.state} ${JSON.stringify(s.errors)})`);
    eq(s.errors.length, 0, `${name} no runtime errors`);
  }
});

// ================================================================== 1. spec §7 behaviours
test('AD (1-3 #1): pot 399 → "get ad pin value 399" and "1.95", LED 13 blinks', () => {
  const s = sim(G.l13[0], { analog: { 14: () => 399 } });
  s.ms(100);
  has(s.out, 'get ad pin value 399');
  has(s.out, '1.95');
  has(s.out, 'get ad pin value 399\nvoltage =  \r\n1.95\r\n', 'exact formatting incl. "\\n" inside the string and CRLF');
  eq(s.b.pin(13).level, 1, 'LED on during first second');
  s.ms(1000);
  eq(s.b.pin(13).level, 0, 'LED off during second second');
});
test('1-2 button: pressed (reads 0) → D11 HIGH, released → LOW', () => {
  let pressed = false;
  const s = sim(G.l12[0], { digital: { 7: () => (pressed ? 0 : 1) } });
  s.ms(20);
  eq(s.b.pin(11).level, 0, 'released → LED off');
  pressed = true; s.ms(20);
  eq(s.b.pin(11).level, 1, 'pressed → LED on');
  eq(s.b.pin(11).mode, 'OUTPUT');
  pressed = false; s.ms(20);
  eq(s.b.pin(11).level, 0, 'released again → off');
  ok(s.run.fastLoop, 'loop() without delay → fastLoop');
  ok(s.run.loopCount > 1000, 'loop() ran many times');
});
test('light sensor PWM (1-3 #2): 1023 → (int)(1.0*256)=256 → analogWrite(256) is (almost) off', () => {
  const s = sim(G.l13[1], { analog: { 14: () => 1023 } });
  s.ms(50);
  has(s.out, '256\r\n');
  const p = s.b.pin(11);
  eq(p.level, 0, 'level LOW');
  eq(p.pwm, 0, 'PWM register 0');
  ok(s.warns.some(w => w.includes('256')), 'warning about 256 → low 8 bits');
  const s2 = sim(G.l13[1], { analog: { 14: () => 512 } });
  s2.ms(50);
  has(s2.out, '128\r\n');
  eq(s2.b.pin(11).pwm, 128, '512 → PWM 128');
});
test('2-1 PWM program prints the one-line format and handles 1023', () => {
  const s = sim(G.l21[0], { analog: { 14: () => 1023 } });
  s.ms(30);
  has(s.out, 'value1==1023     voltage==1.00    PWM==256\r\n');
  eq(s.b.pin(11).pwm, 0);
});
test('flowing LEDs (1-3 #3): pins 2…9 go LOW one after another in the first 800 ms', () => {
  const s = sim(G.l13[2]);
  s.ms(820);
  const firstLow = {};
  const wasHigh = {};
  for (const e of s.pins) {
    if (e.n < 2 || e.n > 9 || e.mode !== 'OUTPUT') continue;
    if (e.level === 1) wasHigh[e.n] = true;
    else if (wasHigh[e.n] && firstLow[e.n] === undefined) firstLow[e.n] = e.t;   // HIGH → LOW after setup()
  }
  for (let p = 2; p <= 9; p++) {
    ok(firstLow[p] !== undefined, `pin ${p} went LOW`);
    near(firstLow[p] / 1000, (p - 2) * 100, 3, `pin ${p} LOW at ~${(p - 2) * 100} ms`);
  }
  for (let p = 3; p <= 9; p++) ok(firstLow[p] > firstLow[p - 1], `pin ${p} after pin ${p - 1}`);
  has(s.out, 'start flash led !');
});
test('passive buzzer (1-3 #5): frequence_1 (delay(0.5)) toggles < 50 µs, frequence_2 period 4 ms (250 Hz)', () => {
  const s = sim(G.l13[4]);
  s.ms(1500);
  const tg = s.pins.filter(e => e.n === 9 && e.mode === 'OUTPUT').map(e => e.t);
  // frequence_1: the first 1600 toggles
  const f1 = [];
  for (let i = 2; i < 1600; i += 2) f1.push(tg[i] - tg[i - 2]);
  ok(f1.length > 700, 'frequence_1 produced ~800 periods');
  const p1 = f1.reduce((a, b) => a + b, 0) / f1.length;
  ok(p1 < 50, `frequence_1 period ${p1.toFixed(1)} µs < 50 µs (delay(0.5) → delay(0))`);
  // frequence_2 starts ~1 s later
  const start2 = tg.findIndex(t => t > 1000000 + tg[1599]);
  const f2 = [];
  for (let i = start2 + 2; i < Math.min(tg.length, start2 + 80); i += 2) f2.push(tg[i] - tg[i - 2]);
  ok(f2.length > 20, 'frequence_2 running');
  const p2 = f2.reduce((a, b) => a + b, 0) / f2.length;
  near(p2, 4000, 40, 'frequence_2 period µs');
  near(1e6 / p2, 250, 3, 'frequence_2 ≈ 250 Hz');
});
test('ultrasonic 15 cm → "distance is :15.00cm"', () => {
  const s = sim(G.l22[0], { sensors: { ultrasonic: { trig: 2, echo: 3, distanceCm: 15 } } });
  s.ms(50);
  has(s.out, 'Ultrasonic sensor:\r\n');
  has(s.out, 'distance is :15.00cm\r\n');
  s.b.sensors.ultrasonic.distanceCm = 123;
  s.ms(1100);
  has(s.out, 'distance is :123.00cm');
});
test('ultrasonic without trigger pulse → pulseIn waits for the 1 s timeout and returns 0', () => {
  const code = 'unsigned long d; unsigned long t;\nvoid setup(){ Serial.begin(9600); pinMode(3, INPUT); }\nvoid loop(){ t = millis(); d = pulseIn(3, HIGH); Serial.println(d); Serial.println(millis() - t); delay(10); }';
  const s = sim(code, { sensors: { ultrasonic: { trig: 2, echo: 3, distanceCm: 15 } } });
  s.ms(1200);
  has(s.out, '0\r\n1000\r\n');
  ok(s.warns.some(w => w.includes('Trig')), 'warning about the missing trig pulse');
});
test('serial servo (2-2 #2): send "90" (no line ending) → "Servo degree: 90", servo target 90', () => {
  const s = sim(G.l22[1]);
  s.ms(250);
  eq(s.b.servo(13).attached, true, 'servo attached');
  s.b.serialSend('90');
  s.ms(250);
  has(s.out, 'Servo degree: 90\r\n');
  eq(s.b.servo(13).target, 90, 'servo target');
  s.ms(500);
  near(s.b.servo(13).angle, 90, 0.01, 'servo arm reached 90°');
  eq(s.run.global('angle'), 90, 'global angle');
  s.b.serialSend('180\r\n');
  s.ms(300);
  has(s.out, 'Servo degree: 180\r\n', 'toInt ignores the trailing CR LF');
});
test('joystick (2-1 #5): x=500 → " left"; button A (D2 reads 0) → "Button A is pressed"', () => {
  let x = 525, a = 1;
  const s = sim(G.l21[4], { analog: { 14: () => x, 15: () => 518 }, digital: { 2: () => a } });
  s.ms(600);
  eq(s.out, '', 'rest position prints nothing (dead zone)');
  x = 500; s.ms(600);
  has(s.out, ' left\r\n');
  x = 525; a = 0; s.out = ''; s.ms(600);
  has(s.out, 'Button A is pressed\r\n');
  ok(!s.out.includes('left'), 'else-if chain: only the first true branch');
  eq(s.b.pin(3).pullup, true, 'INPUT + digitalWrite(HIGH) enables the pull-up');
  eq(s.b.digitalRead(4), 1, 'unpressed button reads 1 through the pull-up');
});
test('joystick values (2-1 #4) print x and y', () => {
  const s = sim(G.l21[3], { analog: { 14: () => 525, 15: () => 518 } });
  s.ms(100);
  has(s.out, 'x: 525\r\ny: 518\r\n');
});
test('DHT11 24 °C / 46 % → LCD "Tep: 24.00C" / "Hum: 46.00%"', () => {
  const s = sim(G.l22[3], { i2c: [0x27], sensors: { dht: { pin: 8, temperature: 24, humidity: 46 } } });
  s.ms(600);
  const lcd = s.b.lcd(0x27);
  eq(lcd.inited, true, 'LCD initialised');
  eq(lcd.backlight, true, 'backlight on');
  eq(lcd.ddram[0].slice(0, 16), 'Tep: 24.00C     ', 'row 1');
  eq(lcd.ddram[1].slice(0, 16), 'Hum: 46.00%     ', 'row 2');
  s.b.sensors.dht.temperature = 30;
  s.ms(1500);
  eq(s.b.lcd(0x27).ddram[0].slice(0, 11), 'Tep: 30.00C', 'new temperature after the next read');
});
test('LCD (2-3 #3): "Hello Word" on row 1, "Science Robo" from col 4 on row 2 (t is in DDRAM but invisible)', () => {
  const s = sim(G.l23[2], { i2c: [0x27] });
  s.ms(300);
  const lcd = s.b.lcd(0x27);
  eq(lcd.ddram[0].slice(0, 16), 'Hello Word      ');
  eq(lcd.ddram[1].slice(0, 16), '    Science Robo', 'visible part of row 2');
  eq(lcd.ddram[1].slice(4, 17), 'Science Robot', 'DDRAM keeps the 13th char at col 16');
  eq(lcd.ddram[0].length, 40, '40-column DDRAM');
  eq(lcd.cols, 16);
});
test('LCD with a wrong address shows nothing', () => {
  const code = G.l23[2].replace('0x27', '0x3F');
  const s = sim(code, { i2c: [0x27] });
  s.ms(300);
  eq(s.b.lcd(0x27).inited, false, 'the 0x27 display was never initialised');
  ok(s.warns.some(w => w.includes('0x3F')), 'warning mentions 0x3F');
});
test('I2C scanner: original → compile error about Wire; with #include <Wire.h> → finds 0x27', () => {
  const r = SIM.interp.compile(G.l23[1]);
  ok(!r.ok, 'original does not compile');
  has(r.errors[0].msg, "'Wire' was not declared in this scope");
  has(r.errors[0].msg, '#include <Wire.h>');
  eq(r.errors[0].line, 8, 'error on the first Wire line');
  eq(r.errors.length, 1, 'reported once');
  const s = sim('#include <Wire.h>\n' + G.l23[1], { i2c: [0x27] });
  s.ms(200);
  has(s.out, '\r\nI2C scanner. Scanning ...\r\n');
  has(s.out, 'Found address: 39 (0x27)\r\n');
  has(s.out, 'Done.\r\nFound 1 device(s).\r\n');
  const s0 = sim('#include <Wire.h>\n' + G.l23[1], { i2c: [] });
  s0.ms(200);
  has(s0.out, 'Found 0 device(s).');
  const s2 = sim('#include "LiquidCrystal_I2C.h"\n' + G.l23[1], { i2c: [0x27, 0x3C] });
  s2.ms(200);
  has(s2.out, 'Found address: 60 (0x3C)', 'LiquidCrystal_I2C.h brings Wire in');
  has(s2.out, 'Found 2 device(s).');
});
test('servo + pot (2-1 #3): original without the last } → compile error; fixed: A0=675 → 168°', () => {
  const orig = G.l21[2].replace(/\}\s*$/, '');
  const r = SIM.interp.compile(orig);
  ok(!r.ok, 'missing } does not compile');
  has(r.errors[0].msg, "expected '}' at end of input");
  has(r.errors[0].msg, '缺少右大括号');
  eq(r.errors[0].line, 15, 'error at the last line');
  const s = sim(G.l21[2], { analog: { 14: () => 675 } });
  s.ms(100);
  eq(s.b.servo(7).target, 168, 'servo target 168');
  s.ms(400);
  near(s.b.servo(7).angle, 168, 0.01, 'arm moved to 168');
});
test('servo moves smoothly (≈0.12 s / 60°)', () => {
  const s = sim('#include <Servo.h>\nServo s;\nvoid setup(){ s.attach(9); s.write(0); delay(1000); s.write(180); }\nvoid loop(){}');
  s.ms(900);
  near(s.b.servo(9).angle, 0, 0.01, 'reached 0 first (90° → 0° takes 0.18 s)');
  s.ms(160);
  const a = s.b.servo(9).angle;
  ok(a > 15 && a < 45, `after ~60 ms the arm is on its way (${a.toFixed(1)}°)`);
  s.ms(400);
  near(s.b.servo(9).angle, 180, 0.01, 'arrived at 180');
});
test('NeoPixel (2-3 #1): setPixelColor + show, brightness 30 scales 127 → 15', () => {
  const s = sim(G.l23[0]);
  s.ms(50);
  const np = s.b.neopixel(10);
  eq(np.count, 12);
  eq(np.brightness, 30);
  eq(np.shown[0], [15, 15, 15], 'scaled colour');
  eq(np.shown[11], [15, 15, 15]);
  const s2 = sim('#include <Adafruit_NeoPixel.h>\nAdafruit_NeoPixel p(3, 6, NEO_GRB + NEO_KHZ800);\nvoid setup(){ p.begin(); p.setPixelColor(0, 255, 0, 0); }\nvoid loop(){}');
  s2.ms(20);
  eq(s2.b.neopixel(6).shown[0], [0, 0, 0], 'no show() → LEDs unchanged');
});
test('language deck SERIAL_DEMO prints Hello! then counts every second', () => {
  const s = sim(LANG.SERIAL_DEMO);
  s.ms(2100);
  has(s.out, 'Hello!\r\n第 1 次循环\r\n第 2 次循环\r\n第 3 次循环\r\n', 'UTF-8 Chinese strings survive the byte pipeline');
});
test('language deck IF_DEMO / FOR_DEMO / FUNC_DEMO / MAP_DEMO behave', () => {
  let btn = 1;
  const s = sim(LANG.IF_DEMO, { digital: { 2: () => btn } });
  s.ms(10); eq(s.b.pin(13).level, 0, 'IF released');
  btn = 0; s.ms(10); eq(s.b.pin(13).level, 1, 'IF pressed');
  const f = sim(LANG.FOR_DEMO);
  f.ms(1285);
  near(f.b.pin(9).pwm || 0, 128, 3, 'FOR_DEMO fading up');
  f.ms(2560);
  ok(f.b.pin(9).pwm !== null && f.b.pin(9).pwm < 255, 'fading down');
  const fn = sim(LANG.FUNC_DEMO);
  fn.ms(2000);
  const ups = fn.pins.filter(e => e.n === 13 && e.level === 1 && e.mode === 'OUTPUT').map(e => e.t);
  eq(ups.length, 4, 'blink(3,150) + blink(1,600) → 4 flashes in the first loop()');
  near((ups[1] - ups[0]) / 1000, 300, 1, 'fast blink period 300 ms');
  const m = sim(LANG.MAP_DEMO, { analog: { 14: () => 512 } });
  m.ms(50);
  has(m.out, '512 -> 127\r\n');
  eq(m.b.pin(9).pwm, 127);
});

// ================================================================== 2. numeric semantics (spec §2.3)
test('integer arithmetic', () => {
  eq(printOf('Serial.print(7/2);'), '3', '7/2');
  eq(printOf('Serial.print(-7/2);'), '-3', 'truncation toward 0');
  eq(printOf('Serial.print(-7%3);'), '-1', '% keeps the sign of the dividend');
  eq(printOf('Serial.print(338/1023);'), '0', '338/1023');
  eq(printOf('Serial.print(7/2.0);'), '3.50', 'float division');
  eq(printOf('int a = 32767; a = a + 1; Serial.print(a);'), '-32768', 'int wraps');
  eq(printOf('int a = 32767; a++; Serial.print(a);'), '-32768', '++ wraps');
  eq(printOf('Serial.print(1000 * 60);'), '-5536', 'int * int overflows (16 bit)');
  eq(printOf('Serial.print(1000L * 60);'), '60000', 'long arithmetic');
  eq(printOf('unsigned long x = 1000 * 60; Serial.print(x);'), '4294961760', 'overflow happens before the conversion');
  eq(printOf('byte b = 250; b += 10; Serial.print(b);'), '4', 'byte wraps');
  eq(printOf('unsigned int u = 0; u--; Serial.print(u);'), '65535', 'unsigned int wraps');
  eq(printOf('int a = -1; unsigned int b = 1; Serial.print(a < b);'), '0', 'signed/unsigned comparison like C');
  eq(printOf('long a = -1; unsigned int b = 1; Serial.print(a < b);'), '1', 'long vs unsigned int → long');
  eq(printOf('Serial.print(1 << 15);'), '-32768', '1<<15 in 16-bit int');
  eq(printOf('Serial.print(1UL << 31);'), '2147483648', 'unsigned long shift');
  eq(printOf('int x = 2.9; Serial.print(x);'), '2', 'float → int truncates on assignment');
  eq(printOf('int x = -2.9; Serial.print(x);'), '-2', 'toward zero');
  eq(printOf('float v = 0.39; Serial.print((int)(v * 256));'), '99', '(int) cast');
  eq(printOf('char c = 200; Serial.print((int)c);'), '-56', 'char is signed 8 bit');
  eq(printOf('Serial.print(0x27); Serial.print(" "); Serial.print(0b101); Serial.print(" "); Serial.print(1e3);'), '39 5 1000.00', 'literals');
  eq(printOf('Serial.print(sizeof(a) / sizeof(a[0]));', 'int a[] = {1,2,3,4,5,6,7,8};'), '8', 'sizeof');
  eq(printOf('Serial.print(sizeof(long));'), '4', 'sizeof(long)');
});
test('delay(0.5) becomes delay(0); delay(-1) becomes huge', () => {
  const s = sim('unsigned long t;\nvoid setup(){ Serial.begin(9600); t = micros(); delay(0.5); Serial.println(micros() - t); }\nvoid loop(){}');
  s.ms(20);
  const us = parseInt(s.out, 10);
  ok(us < 20, `delay(0.5) took ${us} µs (< 20)`);
  const s2 = sim('void setup(){ Serial.begin(9600); delay(-1); Serial.println("after"); }\nvoid loop(){}');
  s2.ms(3000);
  ok(!s2.out.includes('after'), 'delay(-1) (4294967295 ms) still waiting after 3 s');
  eq(s2.run.curLine, 1, 'curLine stays on the delay line');
});
test('map / constrain / min / max / abs / sq', () => {
  eq(printOf('Serial.print(map(512, 0, 1023, 0, 255));'), '127', 'map(512,0,1023,0,255)');
  eq(printOf('Serial.print(map(675, 0, 1023, 0, 180));'), '118', 'map truncates');
  eq(printOf('Serial.print(map(5, 0, 10, 100, 0));'), '50', 'reverse range');
  eq(printOf('Serial.print(constrain(300, 0, 255));'), '255', 'constrain');
  eq(printOf('Serial.print(min(3, -4)); Serial.print(max(3, -4));'), '-43', 'min/max');
  eq(printOf('Serial.print(abs(-5)); Serial.print(" "); Serial.print(abs(-2.5));'), '5 2.50', 'abs');
  eq(printOf('Serial.print(sq(300));'), '24464', 'sq(300) overflows int like on the UNO');
  eq(printOf('Serial.print(sqrt(2), 4);'), '1.4142', 'sqrt');
  eq(printOf('Serial.print(round(2.5)); Serial.print(round(-2.5));'), '3-3', 'round');
});
test('assignment in a condition: if (val = 0) is false and assigns', () => {
  const r = SIM.interp.compile('int val = 5;\nvoid setup(){ Serial.begin(9600);\n if (val = 0) Serial.print("yes"); else Serial.print("no");\n Serial.print(val); }\nvoid loop(){}');
  ok(r.ok, 'compiles');
  ok(r.warnings.some(w => w.line === 3 && w.msg.includes('==')), 'compile warning on line 3');
  eq(printOf('if (val = 0) Serial.print("yes"); else Serial.print("no"); Serial.print(val);', 'int val = 5;'), 'no0');
  eq(printOf('if (val = 3) Serial.print("yes"); Serial.print(val);', 'int val = 0;'), 'yes3');
});

// ================================================================== 3. Serial formatting
test('Serial.print formats like Arduino', () => {
  eq(printOf("Serial.print('A');"), 'A', "'A' prints as a character");
  eq(printOf("char c = 'B'; Serial.print(c); Serial.print(c, DEC);"), 'B66', 'char with DEC → number');
  eq(printOf("byte b = 65; Serial.print(b);"), '65', 'byte prints as a number');
  eq(printOf('Serial.print(255, HEX); Serial.print(" "); Serial.print(5, BIN); Serial.print(" "); Serial.print(8, OCT);'), 'FF 101 10', 'bases');
  eq(printOf('Serial.print(-1, HEX);'), 'FFFFFFFF', 'negative HEX is 32-bit');
  eq(printOf('Serial.print(3.14159);'), '3.14', 'float default 2 decimals');
  eq(printOf('Serial.print(2.5, 3);'), '2.500', 'float digits');
  eq(printOf('Serial.print(1.005, 0);'), '1', 'zero decimals');
  eq(printOf('Serial.print(-1.239);'), '-1.24', 'rounding of negatives');
  eq(printOf('Serial.print(-0.005);'), '-0.00', 'float(-0.005) is slightly above -0.005, so Arduino prints -0.00');
  eq(printOf('float z = 0; Serial.print(1.0 / z);'), 'inf', 'inf');
  eq(printOf('Serial.println("a"); Serial.println(); Serial.println(12);'), 'a\r\n\r\n12\r\n', 'println appends CR LF');
  eq(printOf('Serial.write(72); Serial.write("i");'), 'Hi', 'write');
  eq(printOf('bool f = true; Serial.print(f);'), '1', 'bool prints 1');
  eq(printOf('unsigned long big = 4000000000UL; Serial.print(big);'), '4000000000', 'unsigned long');
  eq(printOf('String s = "x"; Serial.print(s + 1.5);'), 'x1.50', 'String + float');
});
test('print before Serial.begin → no output + one warning', () => {
  const s = sim('void setup(){ Serial.print("hi"); Serial.print("again"); }\nvoid loop(){}');
  s.ms(20);
  eq(s.out, '', 'nothing printed');
  eq(s.warns.filter(w => w.includes('Serial.begin')).length, 1, 'one warning');
  eq(s.b.serialBaud, null, 'baud null');
  const s2 = sim('void setup(){ Serial.begin(115200); }\nvoid loop(){}');
  s2.ms(5);
  eq(s2.b.serialBaud, 115200, 'serialBaud set by begin');
});
test('Serial.available / read / peek with the receive queue', () => {
  const s = sim('int n; int c1; int c2; int c3; int pk;\nvoid setup(){ Serial.begin(9600); }\nvoid loop(){ if (Serial.available() >= 2) { n = Serial.available(); pk = Serial.peek(); c1 = Serial.read(); c2 = Serial.read(); c3 = Serial.read(); } }');
  s.ms(10);
  s.b.serialSend('ab');
  s.ms(20);
  eq(s.run.global('n'), 2, 'available');
  eq(s.run.global('pk'), 97, 'peek');
  eq([s.run.global('c1'), s.run.global('c2'), s.run.global('c3')], [97, 98, -1], 'read returns -1 when empty');
});
test('Serial input arrives byte by byte (≈1 ms per char at 9600 baud)', () => {
  const s = sim('int n = -1;\nvoid setup(){ Serial.begin(9600); }\nvoid loop(){}');
  s.ms(5);
  s.b.serialSend('hello');
  eq(s.b.serialAvailable(), 0, 'nothing has arrived yet');
  s.b.advance(2100);
  eq(s.b.serialAvailable(), 2, 'two chars after 2.1 ms');
  s.b.advance(5000);
  eq(s.b.serialAvailable(), 5, 'all five later');
});
test('Serial.readString / parseInt (with timeout)', () => {
  const s = sim('String s; long v;\nvoid setup(){ Serial.begin(9600); }\nvoid loop(){ if (Serial.available()) { v = Serial.parseInt(); Serial.print("v="); Serial.println(v); } }');
  s.ms(10);
  s.b.serialSend('42\n');
  s.ms(100);
  has(s.out, 'v=42\r\n');
  const s2 = sim('String s;\nvoid setup(){ Serial.begin(9600); }\nvoid loop(){ if (Serial.available()) { s = Serial.readString(); Serial.println(s); } }');
  s2.ms(10);
  s2.b.serialSend('abc');
  s2.ms(500);
  eq(s2.out, '', 'readString waits for its 1 s timeout');
  s2.ms(700);
  eq(s2.out, 'abc\r\n');
});

// ================================================================== 4. String
test('String operations', () => {
  eq(printOf('String s = ""; s += \'a\'; s += 5; s += "x"; Serial.print(s);'), 'a5x', '+= char, int, text');
  eq(printOf('String s = "90"; Serial.print(s.toInt() + 1);'), '91', 'toInt');
  eq(printOf('String s = "12abc"; Serial.print(s.toInt());'), '12', 'leading integer');
  eq(printOf('String s = "abc"; Serial.print(s.toInt());'), '0', 'no number → 0');
  eq(printOf('String s = "3.75"; Serial.print(s.toFloat());'), '3.75', 'toFloat');
  eq(printOf('String s = "abc"; Serial.print(s + "x"); Serial.print(s == "abc"); Serial.print(s != "abc");'), 'abcx10', '+ and ==');
  eq(printOf('String s = "  hi  "; s.trim(); Serial.print("["); Serial.print(s); Serial.print("]"); Serial.print(s.length());'), '[hi]2', 'trim + length');
  eq(printOf('String s = "hello"; Serial.print(s.indexOf(\'l\')); Serial.print(s.charAt(1)); Serial.print(s.substring(1, 3));'), '2eel', 'indexOf / charAt / substring');
  eq(printOf('String s = "Hi"; s.toUpperCase(); Serial.print(s);'), 'HI', 'toUpperCase');
  eq(printOf('String a = String(255, HEX); Serial.print(a); Serial.print(String(3.14159, 3));'), 'ff3.142', 'String(n, HEX) is lowercase like itoa');
  eq(printOf('String t = "a"; t = t + 1 + 2; Serial.print(t);'), 'a12', 'left-to-right concatenation');
});
test('"text" + number is pointer arithmetic, not concatenation', () => {
  const s = sim('int v = 2;\nvoid setup(){ Serial.begin(9600); Serial.print("Value: " + v); }\nvoid loop(){}');
  s.ms(10);
  eq(s.out, 'lue: ', 'starts 2 chars later');
  ok(s.warns.some(w => w.includes('String')), 'explains it');
});

// ================================================================== 5. control flow & functions
test('control flow', () => {
  eq(printOf('for (int i = 0; i < 5; i++) { if (i == 1) continue; if (i == 4) break; Serial.print(i); }'), '023', 'for/continue/break');
  eq(printOf('int i = 0; while (i < 3) { Serial.print(i); i++; }'), '012', 'while');
  eq(printOf('int i = 5; do { Serial.print(i); } while (i < 3);'), '5', 'do-while runs once');
  eq(printOf('for (int k = 0; k < 4; k++) { switch (k) { case 0: Serial.print("a"); case 1: Serial.print("b"); break; default: Serial.print("d"); } }'), 'abbdd', 'switch fall-through');
  eq(printOf("char c = 'x'; switch (c) { case 'x': Serial.print(1); break; case 'y': Serial.print(2); break; }"), '1', 'switch on char');
  eq(printOf('int a = 5; Serial.print(a > 3 ? 10 : 20);'), '10', 'ternary');
  eq(printOf('int a = 10; a -= 3; a *= 2; a /= 4; a %= 3; a <<= 3; a |= 1; a ^= 3; a &= 14; Serial.print(a);'), '2', 'compound assignments');
  eq(printOf('int i = 5; int a = i++; int b = ++i; Serial.print(a); Serial.print(b); Serial.print(i--); Serial.print(--i);'), '5775', 'pre/post increment');
  eq(printOf('int i = 0; if (i == 0 || (1 / i)) Serial.print("short");'), 'short', 'short-circuit ||');
  eq(printOf('int x = 3; { int x = 7; Serial.print(x); } Serial.print(x);'), '73', 'block scope shadowing');
});
test('functions: recursion, defaults, arrays, static locals, macros', () => {
  eq(printOf('Serial.print(fact(5)); Serial.print(" "); Serial.print(fact(10));', 'long fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }'), '120 3628800', 'recursion');
  eq(printOf('Serial.print(add(2)); Serial.print(add(2, 3));', 'int add(int a, int b = 10) { return a + b; }'), '125', 'default parameter');
  eq(printOf('int a[4] = {1, 2, 3, 4}; Serial.print(sum(a, 4)); bump(a); Serial.print(a[0]);', 'int sum(int arr[], int n) { int s = 0; for (int i = 0; i < n; i++) s += arr[i]; return s; }\nvoid bump(int arr[]) { arr[0] = 99; }'), '1099', 'array parameters by reference');
  eq(printOf('tick(); tick(); Serial.print(tick());', 'int tick() { static int n = 0; n++; return n; }'), '3', 'static local');
  eq(printOf('Serial.print(SQUARE(3 + 1)); Serial.print(LEDS);', '#define SQUARE(x) ((x) * (x))\n#define LEDS 8'), '168', 'function-like and object-like macros');
  eq(printOf('Serial.print(half(5));', 'float half(int v) { return v / 2.0; }'), '2.50', 'float return');
  eq(printOf('Serial.print(conv(3.9));', 'int conv(int v) { return v; }'), '3', 'argument converted to the parameter type');
  eq(printOf('int x = early(1) + early(0); Serial.print(x);', 'int early(int f) { if (f) return 5; return 1; }'), '6', 'return from the middle');
});
test('blocking calls inside expressions (generator paths)', () => {
  const code = `int a[3];
int slow(int v) { delay(10); return v * 2; }
int g = slow(21);
void setup() {
  Serial.begin(9600);
  a[1] = slow(4);
  int x = slow(1) + slow(2);
  bool b = slow(1) > 0 && slow(0) == 0;
  int c = slow(1) ? slow(5) : 0;
  String s = "v"; s += slow(3);
  switch (slow(1)) { case 2: Serial.print("two"); delay(5); break; default: Serial.print("def"); }
  int k = 0; do { k += slow(1); } while (k < 6);
  for (int i = 0; i < slow(1); i++) { Serial.print(i); }
  Serial.print(a[1]); Serial.print(x); Serial.print(b); Serial.print(c); Serial.print(s); Serial.print(k);
  s.concat(slow(7));
  Serial.print(s); Serial.print(g);
}
void loop() {}`;
  const s = sim(code);
  s.ms(400);
  eq(s.errors, [], 'no runtime errors');
  eq(s.out, 'two0186110v66v61442', 'values computed through generator paths');
  ok(s.b.now() >= 200000, 'each slow() call really waited');
});
test('millis() / micros() follow the virtual clock', () => {
  const s = sim('unsigned long a, b;\nvoid setup(){ Serial.begin(9600); a = millis(); delay(1000); b = millis(); Serial.println(b - a); }\nvoid loop(){}');
  s.ms(1100);
  const v = parseInt(s.out, 10);
  ok(v >= 1000 && v <= 1001, `millis difference ${v}`);
});
test('random() is deterministic (same sequence as avr-libc) and within range', () => {
  const a = printOf('for (int i = 0; i < 5; i++) { Serial.print(random(100)); Serial.print(","); }');
  const b = printOf('for (int i = 0; i < 5; i++) { Serial.print(random(100)); Serial.print(","); }');
  eq(a, b, 'same sequence every run');
  ok(a.split(',').filter(Boolean).every(x => +x >= 0 && +x < 100), 'range 0…99: ' + a);
  ok(printOf('Serial.print(random(5, 6));') === '5', 'random(5,6) == 5');
});

// ================================================================== 6. hardware model
test('analogWrite rules', () => {
  const s = sim('void setup(){ analogWrite(3, 255); analogWrite(5, 0); analogWrite(6, 100); analogWrite(9, 300); analogWrite(13, 200); analogWrite(12, 50); analogWrite(10, -5); }\nvoid loop(){}');
  s.ms(5);
  eq(s.b.pin(3), { mode: 'OUTPUT', level: 1, pwm: null, pullup: false }, '255 → HIGH');
  eq(s.b.pin(5).level, 0, '0 → LOW');
  eq(s.b.pin(6).pwm, 100, 'duty 100');
  eq(s.b.pin(9).pwm, 300 & 255, '300 → low 8 bits');
  eq(s.b.pin(13).level, 1, 'non-PWM pin ≥128 → HIGH');
  eq(s.b.pin(12).level, 0, 'non-PWM pin <128 → LOW');
  eq(s.b.pin(10).level, 0, 'negative → LOW');
  ok(s.warns.some(w => w.includes('13 号脚不支持 PWM')), 'non-PWM warning');
  const s2 = sim('void setup(){ analogWrite(11, 128); digitalWrite(11, HIGH); }\nvoid loop(){}');
  s2.ms(5);
  eq(s2.b.pin(11).pwm, null, 'digitalWrite turns PWM off');
});
test('pull-ups and floating inputs', () => {
  const s = sim('int a, b, c;\nvoid setup(){ pinMode(4, INPUT_PULLUP); pinMode(5, INPUT); digitalWrite(5, HIGH); pinMode(6, INPUT); }\nvoid loop(){ a = digitalRead(4); b = digitalRead(5); c = digitalRead(6); }');
  s.ms(20);
  eq(s.run.global('a'), 1, 'INPUT_PULLUP reads 1');
  eq(s.run.global('b'), 1, 'old idiom INPUT + digitalWrite(HIGH) reads 1');
  eq(s.b.pin(5), { mode: 'INPUT', level: 1, pwm: null, pullup: true }, 'pin state shows the pull-up');
  ok(s.warns.some(w => w.startsWith('D6') && w.includes('悬空')), 'floating pin warning');
  let seen0 = false, seen1 = false;
  for (let i = 0; i < 40; i++) { s.ms(1); const v = s.run.global('c'); if (v === 0) seen0 = true; if (v === 1) seen1 = true; }
  ok(seen0 && seen1, 'floating pin reads random 0/1');
  const s2 = sim('void setup(){ digitalWrite(13, HIGH); }\nvoid loop(){}');
  s2.ms(5);
  ok(s2.warns.some(w => w.includes('pinMode(13, OUTPUT)')), 'digitalWrite without pinMode → hint');
  eq(s2.b.pin(13).pullup, true, 'only the pull-up is on');
});
test('analogRead(0) == analogRead(A0); costs ~112 µs', () => {
  const s = sim('int a, b; unsigned long t0, t1;\nvoid setup(){ t0 = micros(); a = analogRead(0); t1 = micros(); b = analogRead(A0); }\nvoid loop(){}', { analog: { 14: () => 777 } });
  s.ms(5);
  eq(s.run.global('a'), 777);
  eq(s.run.global('b'), 777);
  near(s.run.global('t1') - s.run.global('t0'), 114, 6, 'analogRead time');
});
test('tone / noTone', () => {
  const s = sim('void setup(){ tone(8, 440); delay(100); noTone(8); tone(8, 1000, 200); }\nvoid loop(){}');
  s.ms(50);
  eq(s.b.tone(8).freq, 440, 'tone on');
  s.ms(100);
  eq(s.b.tone(8).freq, 1000, 'second tone');
  s.ms(250);
  eq(s.b.tone(8).freq, null, 'duration expired');
});
test('Servo library: clamping, microseconds, read()', () => {
  const run = body => { const s = sim(`#include <Servo.h>\nServo s;\nvoid setup(){ Serial.begin(9600); s.attach(9); ${body} }\nvoid loop(){}`); s.ms(20); return s; };
  eq(run('s.write(200);').b.servo(9).target, 180, '>180 → 180');
  eq(run('s.write(-5);').b.servo(9).target, 0, '<0 → 0');
  eq(run('s.write(543);').b.servo(9).target, 180, '543 still degrees → 180');
  near(run('s.write(1500);').b.servo(9).target, 92.7, 0.1, '≥544 are microseconds');
  eq(run('s.write(2400);').b.servo(9).target, 180, '2400 µs → 180');
  eq(run('s.writeMicroseconds(544);').b.servo(9).target, 0, '544 µs → 0');
  eq(run('s.write(90); Serial.print(s.read()); Serial.print(s.attached());').out, '901', 'read() and attached()');
  const d = run('s.write(45); delay(200); s.detach();');
  d.ms(200);
  eq(d.b.servo(9).attached, false, 'detached');
  near(d.b.servo(9).angle, 45, 0.01, 'holds its angle');
});
test('dht11.read: success code, members, wrong pin → -2', () => {
  const s = sim('#include "dht11.h"\ndht11 D;\nint c1, c2;\nvoid setup(){ c1 = D.read(8); c2 = D.read(5); }\nvoid loop(){}', { sensors: { dht: { pin: 8, temperature: 21, humidity: 55 } } });
  s.ms(100);
  eq(s.run.global('c1'), 0, 'DHTLIB_OK');
  eq(s.run.global('c2'), -2, 'DHTLIB_ERROR_TIMEOUT');
  const D = s.run.global('D');
  eq([D.temperature, D.humidity], [21, 55], 'members');
});
test('stop(): outputs LOW, PWM off, servo holds angle, LCD keeps text', () => {
  const s = sim('#include <Servo.h>\n#include <Wire.h>\n#include "LiquidCrystal_I2C.h"\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nServo sv;\nvoid setup(){ pinMode(13, OUTPUT); digitalWrite(13, HIGH); analogWrite(5, 100); sv.attach(9); sv.write(30); lcd.init(); lcd.print("kept"); }\nvoid loop(){}', { i2c: [0x27] });
  s.ms(800);
  eq(s.b.pin(13).level, 1);
  s.run.stop();
  eq(s.run.state, 'stopped');
  eq(s.b.pin(13).level, 0, 'output LOW');
  eq(s.b.pin(5).pwm, null, 'PWM off');
  near(s.b.servo(9).angle, 30, 0.01, 'servo keeps its angle');
  eq(s.b.lcd(0x27).ddram[0].slice(0, 4), 'kept', 'LCD keeps its text');
  eq(s.b.lcd(0x27).stopped, true, 'LCD marked stopped');
  s.run.tick(16, 1);
  eq(s.run.state, 'stopped', 'tick after stop does nothing');
});

// ================================================================== 7. compile errors (Chinese + GCC wording, right line)
test('compile errors', () => {
  let e = errorsOf('void setup() {\n  pinMode(13, OUTPUT)\n  digitalWrite(13, HIGH);\n}\nvoid loop() {}');
  eq(e[0] && e[0].line, 2, 'missing semicolon → line of the statement');
  has(e[0] && e[0].msg, "expected ';' before 'digitalWrite'");
  has(e[0] && e[0].msg, '分号');
  e = errorsOf('void setup() {\n  int x = 1;\n}\nvoid loop() {\n  x = 2;\n}');
  eq(e[0] && e[0].line, 5, 'undeclared → line');
  has(e[0] && e[0].msg, "'x' was not declared in this scope");
  e = errorsOf('void setup() {\n  pinMode(13, OUTPUT);\n  digitalwrite(13, HIGH);\n}\nvoid loop() {}');
  has(e[0] && e[0].msg, 'digitalWrite', 'case hint');
  eq(e[0] && e[0].line, 3);
  e = errorsOf('void setup() { blinkTwice(); }\nvoid loop() {}');
  has(e[0] && e[0].msg, "'blinkTwice' was not declared in this scope");
  has(e[0] && e[0].msg, '函数');
  e = errorsOf('void setup() {\n  digitalWrite(13);\n}\nvoid loop() {}');
  eq(e[0] && e[0].line, 2);
  has(e[0] && e[0].msg, 'too few arguments to function');
  e = errorsOf('void f(int a) {}\nvoid setup() { f(1, 2); }\nvoid loop() {}');
  has(e[0] && e[0].msg, "too many arguments to function 'void f(int)'");
  e = errorsOf('Servo s;\nvoid setup() {}\nvoid loop() {}');
  has(e[0] && e[0].msg, "'Servo' does not name a type");
  has(e[0] && e[0].msg, '#include <Servo.h>');
  e = errorsOf('void setup() {\n  Serial.begin(9600)；\n}\nvoid loop() {}');
  eq(e[0] && e[0].line, 2, 'full-width semicolon');
  has(e[0] && e[0].msg, "stray '\\357' in program");
  e = errorsOf('void loop() {}');
  has(e[0] && e[0].msg, "undefined reference to `setup'");
  e = errorsOf('void setup() {}\nvoid loop() {}\n}');
  has(e[0] && e[0].msg, "expected declaration before '}' token");
  // the 1-3 AD program as printed in the PDF: "}" before the last delay(1000);
  const ad = G.l13[0].replace(/\n\s*delay\(1000\);\n\}\s*$/, '\n}\n    delay(1000);\n');
  e = errorsOf(ad);
  ok(e.length > 0, 'misplaced } does not compile');
  has(e[0] && e[0].msg, "expected constructor, destructor, or type conversion before '(' token");
  eq(e[0] && e[0].line, 24);
  e = errorsOf('const int P = 2;\nvoid setup() { P = 3; }\nvoid loop() {}');
  has(e[0] && e[0].msg, "assignment of read-only variable 'P'");
  e = errorsOf('void setup() { int x = "12"; }\nvoid loop() {}');
  has(e[0] && e[0].msg, "invalid conversion from 'const char*' to 'int'");
  e = errorsOf('void setup() { String s = "1"; int x = s; }\nvoid loop() {}');
  has(e[0] && e[0].msg, "cannot convert 'String' to 'int'");
  e = errorsOf('#include <SoftwareSerial.h>\nvoid setup() {}\nvoid loop() {}');
  has(e[0] && e[0].msg, 'SoftwareSerial.h: No such file or directory');
  e = errorsOf('#include <Servo.h>\nServo s;\nvoid setup() { s.wirte(90); }\nvoid loop() {}');
  has(e[0] && e[0].msg, "'class Servo' has no member named 'wirte'");
  has(e[0] && e[0].msg, 'write', 'spelling hint');
  e = errorsOf('void setup() {\n  if (1) {\n    delay(1);\n\nvoid loop() {}');
  has(e[0] && e[0].msg, "a function-definition is not allowed here before '{' token");
  has(e[0] && e[0].msg, '少了一个右大括号');
  eq(e[0] && e[0].line, 5, 'reported at the next function');
  e = errorsOf('void setup() {\n  delay(1);\n');
  has(e[0] && e[0].msg, "expected '}' at end of input");
  eq(e[0] && e[0].line, 2, 'end of input = last line with code');
  e = errorsOf('void setup() { int a[3] = {1,2,3,4}; }\nvoid loop() {}');
  has(e[0] && e[0].msg, 'too many initializers');
  e = errorsOf('void setup() { break; }\nvoid loop() {}');
  has(e[0] && e[0].msg, 'break statement not within loop or switch');
});
test('runtime errors and warnings', () => {
  const s = sim('int a[3] = {1, 2, 3};\nint i;\nvoid setup() {}\nvoid loop() {\n  i++;\n  a[i] = 5;\n  delay(10);\n}');
  s.ms(200);
  eq(s.run.state, 'error', 'out-of-bounds stops the program');
  eq(s.errors.length, 1, 'onError called');
  eq(s.errors[0] && s.errors[0].line, 6, 'error line');
  has(s.errors[0] && s.errors[0].msg, '数组越界');
  eq(s.run.error && s.run.error.line, 6, 'run.error');
  const d = sim('int z = 0; int r;\nvoid setup() {}\nvoid loop() {\n  r = 10 / z;\n  delay(10);\n}');
  d.ms(100);
  eq(d.run.state, 'running', 'integer division by zero does not stop');
  ok(d.warns.some(w => w.includes('第 4 行') && w.includes('除以 0')), 'warning with line');
  eq(d.run.global('r'), -1, 'result -1');
  const rec = sim('void f() { f(); }\nvoid setup() { f(); }\nvoid loop() {}');
  rec.ms(50);
  eq(rec.run.state, 'error', 'infinite recursion detected');
});

// ================================================================== 8. runner API
test('globals() formatting', () => {
  const s = sim("int led_array[8] = {2,3,4,5,6,7,8,9};\nint big[12];\nString temp = \"ab\";\nchar c = 'A';\nfloat v = 1.955;\nbool on = true;\nconst int TrigPin = 2;\nunsigned long t = 7;\nvoid setup() {}\nvoid loop() {}");
  s.ms(5);
  const g = {};
  for (const x of s.run.globals()) g[x.name] = x;
  eq(g.led_array.value, '{2,3,4,5,6,7,8,9}', 'array');
  eq(g.big.value, '{0,0,0,0,0,0,0,0,…}', 'long array truncated');
  eq(g.temp.value, '"ab"', 'String quoted');
  eq(g.c.value, "'A'(65)", 'char');
  eq(g.v.value, '1.96', 'float');
  eq(g.on.value, 'true');
  eq(g.TrigPin.type, 'const int', 'type text');
  eq(g.t.type, 'unsigned long');
  eq(g.led_array.type, 'int[8]');
});
test('curLine / loopCount / state', () => {
  const s = sim('void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}');
  s.ms(500);
  eq(s.run.curLine, 6, 'waiting in the first delay');
  s.ms(1000);
  eq(s.run.curLine, 8, 'second delay');
  eq(s.run.loopCount, 0);
  s.ms(1000);
  eq(s.run.loopCount, 1, 'one loop() completed after 2 s');
  eq(s.run.state, 'running');
  ok(!s.run.fastLoop, 'delay-based loop is not a fast loop');
});
test('time warp: tight loop at 5× uses the op budget and jumps to the frame target', () => {
  const s = sim('long n;\nvoid setup() {}\nvoid loop() { n++; }');
  const t0 = s.b.now();
  s.run.tick(16, 5);
  ok(s.run.fastLoop, 'fastLoop');
  eq(s.b.now() - t0, 80000, 'virtual time advanced exactly 16 ms × 5');
  ok(s.run.ops >= 40000, 'budget used');
});
test('performance: tight loop sustains ≥ 20k statements per 16 ms frame', () => {
  const s = sim('int i = 0; long acc = 0;\nvoid setup() {}\nvoid loop() {\n  i++;\n  acc = acc + i;\n  if (i > 100) { i = 0; }\n}');
  for (let k = 0; k < 30; k++) s.run.tick(16, 5);
  const ops0 = s.run.ops, t0 = process.hrtime.bigint();
  const N = 100;
  for (let k = 0; k < N; k++) s.run.tick(16, 5);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  const per = (s.run.ops - ops0) / N;
  ok(per >= 20000, `${per} statements per frame`);
  ok(ms < 16, `one frame of ${per} statements took ${ms.toFixed(2)} ms`);
  console.log(`  perf: ${per.toFixed(0)} statements/frame in ${ms.toFixed(2)} ms → ${(per / ms / 1000).toFixed(1)} M statements/s`);
});
test('board API basics', () => {
  const b = new SIM.hw.Board({ i2c: [0x27], baud: 9600 });
  eq(b.pinLabel(7), 'D7'); eq(b.pinLabel(14), 'A0'); eq(b.pinLabel(19), 'A5');
  eq(b.now(), 0);
  eq(b.pin(3), { mode: null, level: 0, pwm: null, pullup: false }, 'power-on pin');
  ok(b.i2c.has(0x27), 'i2c set');
  let n = 0; const off = b.on('warn', () => n++);
  b.warn('x'); b.warn('x'); b.warn('y');
  eq(n, 2, 'warnings are one-shot');
  off(); b.warn('z'); eq(n, 2, 'unsubscribe');
  eq(b.lcd(0x27).ddram.length, 2);
  eq(b.neopixel(10), { count: 0, shown: [], brightness: 255 });
  eq(b.tone(8), { freq: null });
  eq(b.servo(9).attached, false);
});

// ------------------------------------------------------------------ report
console.log(`\ninterp tests: ${passed} passed, ${failed} failed (${passed + failed} assertions)`);
if (failures.length) { console.log('\nFAILURES:'); for (const f of failures) console.log('  ✗ ' + f); }
process.exit(failed ? 1 : 0);
