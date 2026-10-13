#!/usr/bin/env node
/* =====================================================================
   test/smoke.js — browser smoke test (SIM_SPEC §7)

   Run:   NODE_PATH=/opt/node22/lib/node_modules node test/smoke.js [lessonId]
   Env:   SIM_SHOTS=<dir>        where screenshots go (default: <os tmp>/arduino-sim-smoke)
          SIM_FONT_CACHE=<dir>   optional cache of Google Fonts responses (file name = base64url(url), first 200 chars);
                                 without it font requests get an empty stylesheet (no network needed)
          SIM_QUICK=1            only the desktop / light pass (skips phone + dark screenshot passes)
          SIM_LESSON=l12         only test this lesson (same as the first argument); home is always checked
          SIM_MODES=phone-light,desktop-dark   only these passes (desktop-light runs the full checks)

   What it does (opens index.html over file://, like a student double-clicking it):
     · home view: title, 5 lesson cards, “制作中” exactly for lesson files that do not exist,
       every existing lessons/l*.js is loaded by index.html, no horizontal overflow
     · every lesson (#_demo, #_parts + the course lessons that exist): walks every slide with the
       “下一页” button, checks the slide renders, images load, nothing overflows sideways
     · every lab slide: compiles every program and every task's reference code in the page
       (a program marked `expect:'error'` must FAIL to compile, all others must compile), runs
       every program tab with ▶ 运行 and checks the status bar, then performs the lab's `smoke`
       steps (press a button part, drag a knob, type into the serial monitor and send, …) and
       asserts serial output / part state / pin state — see AUTHORING_LESSONS.md
     · robustness (once, desktop): empty fast loop() and while(true){} keep the page responsive and
       ■ 停止 works; speed control; 跟随行; Chinese compile / runtime errors with line numbers;
       leaving a lab slide destroys the running lab; keyboard paging is not hijacked in the editor
     · four passes: desktop 1280×800 and phone 390×844, light and dark (prefers-color-scheme),
       screenshots of every slide (and of every lab after its interaction)
     · FAILS on any console error, page error, failed file load or external (non-font) request.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('playwright not found — run with NODE_PATH=/opt/node22/lib/node_modules node test/smoke.js');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'index.html');
const INDEX = 'file://' + INDEX_FILE;
const SHOTS = process.env.SIM_SHOTS || path.join(os.tmpdir(), 'arduino-sim-smoke');
const FONT_CACHE = process.env.SIM_FONT_CACHE || '';
const QUICK = process.env.SIM_QUICK === '1';
const ONLY = process.argv[2] || process.env.SIM_LESSON || '';
const MODES = process.env.SIM_MODES ? process.env.SIM_MODES.split(',') : null;
const COURSE = ['l12', 'l13', 'l21', 'l22', 'l23'];
fs.mkdirSync(SHOTS, { recursive: true });

const failures = [];
let checks = 0;
function fail(where, msg) { failures.push(`[${where}] ${msg}`); console.log(`  FAIL ${where}: ${msg}`); }
function check(cond, where, msg) { checks++; if (!cond) fail(where, msg); return !!cond; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ page setup
async function newPage(browser, mode) {
  const ctx = await browser.newContext({
    viewport: { width: mode.w, height: mode.h }, deviceScaleFactor: 1,
    colorScheme: mode.dark ? 'dark' : 'light', reducedMotion: 'no-preference'
  });
  // count AudioContext creations: sound may only start after the user clicks “开启声音”
  await ctx.addInitScript(() => {
    window.__audioCtxCount = 0;
    const wrap = name => {
      const C = window[name];
      if (!C) return;
      window[name] = new Proxy(C, { construct(t, a) { window.__audioCtxCount++; return Reflect.construct(t, a); } });
    };
    wrap('AudioContext'); wrap('webkitAudioContext');
  });
  await ctx.route(/^https?:\/\//, route => {
    const url = route.request().url();
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) {
      const isCss = url.includes('googleapis');
      if (FONT_CACHE) {
        const file = path.join(FONT_CACHE, Buffer.from(url).toString('base64url').slice(0, 200));
        if (fs.existsSync(file)) return route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: isCss ? 'text/css' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
      }
      return route.fulfill({ status: 200, body: isCss ? '/* fonts offline in smoke test */' : '', contentType: isCss ? 'text/css' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
    }
    fail(mode.name, 'external request (the site must not load anything but Google Fonts): ' + url);
    return route.abort();
  });
  const page = await ctx.newPage();
  const tag = () => `${mode.name} ${page.url().replace(/^.*index\.html/, '') || '#'}`;
  page.on('console', m => { if (m.type() === 'error') fail(tag(), 'console error: ' + m.text()); });
  page.on('pageerror', e => fail(tag(), 'page error: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)));
  page.on('requestfailed', r => { if (r.url().startsWith('file:')) fail(tag(), 'failed to load ' + r.url().replace('file://' + ROOT + '/', '')); });
  return { ctx, page };
}

// <name>.png = what the student sees (viewport); <name>-full.png = whole page when it is taller than the
// viewport (sticky top / bottom bars made static for the capture so they do not float mid-page)
async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), animations: 'disabled' });
  const tall = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 4);
  if (!tall) return;
  const y = await page.evaluate(() => scrollY);
  await page.addStyleTag({ content: '.deck-top,.deck-bottom{position:static!important}' }).then(h => h.evaluate(e => e.setAttribute('data-smoke-shot', '')));
  await page.screenshot({ path: path.join(SHOTS, name + '-full.png'), animations: 'disabled', fullPage: true });
  await page.evaluate(y => { document.querySelectorAll('style[data-smoke-shot]').forEach(e => e.remove()); scrollTo(0, y); }, y);
}
async function noOverflow(page, where) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(r.sw <= r.cw + 1, where, `horizontal overflow: page is ${r.sw}px wide in a ${r.cw}px viewport`);
}

// ------------------------------------------------------------------ home
async function checkHome(page, mode) {
  const where = mode.name + ' home';
  await page.goto(INDEX);
  await page.waitForFunction(() => window.SIM && SIM.deck && document.querySelectorAll('.lesson-card .state').length === 5);
  await sleep(150);
  check((await page.title()) === 'Arduino 互动实验室', where, 'document title should be “Arduino 互动实验室”');
  const html = fs.readFileSync(INDEX_FILE, 'utf8');
  check(html.slice(0, 8192).includes('<title>Arduino 互动实验室</title>'), where, '<title> must be in the first 8KB of index.html');
  check(!/<script[^>]+src=["']https?:/i.test(html), where, 'index.html must not load external scripts');
  const cards = await page.evaluate(() => [...document.querySelectorAll('.lesson-card')].map(c => ({
    id: c.dataset.lesson, state: (c.querySelector('.state') || {}).textContent, href: c.getAttribute('href')
  })));
  check(cards.length === 5, where, `expected 5 lesson cards, found ${cards.length}`);
  for (const id of COURSE) {
    const exists = fs.existsSync(path.join(ROOT, 'lessons', id + '.js'));
    const tagged = new RegExp(`<script[^>]+src=["']lessons/${id}\\.js["']`).test(html);
    if (exists) check(tagged, where, `lessons/${id}.js exists but index.html does not load it — add <script src="lessons/${id}.js"></script> between the LESSONS markers`);
    else check(!tagged, where, `index.html loads lessons/${id}.js but the file does not exist (that is a console error)`);
    const c = cards.find(x => x.id === id);
    if (!check(!!c, where, `no home card for ${id}`)) continue;
    if (exists && tagged) check(c.state === '可以开始', where, `${id} card should say 可以开始 (got “${c.state}”) — did the lesson call SIM.deck.register({id:'${id}', …})?`);
    if (!exists) check(c.state === '制作中', where, `${id} card should say 制作中 while the file is missing (got “${c.state}”)`);
  }
  await noOverflow(page, where);
  await shot(page, `${mode.name}-home`);
  // a missing lesson opened by URL shows a friendly message, still without console errors
  const missing = COURSE.find(id => !fs.existsSync(path.join(ROOT, 'lessons', id + '.js')));
  if (missing) {
    await page.goto(INDEX + '#' + missing);
    await page.waitForFunction(() => document.querySelector('.deck-msg'));
    const t = await page.textContent('.deck-msg');
    check(/制作中/.test(t), where, `#${missing} should show “这一课还在制作中”, got: ${t}`);
  }
}

// ------------------------------------------------------------------ in-page expectation checker
function pageCheck(exp) {
  /* eslint-disable no-undef */
  const L = SIM.deck.current.lab;
  if (!L) return { ok: false, fails: ['no lab mounted'], got: {} };
  const host = L.el;
  const part = (type, k) => host.querySelectorAll(`.part[data-type="${type}"]`)[k || 0];
  const re = v => (typeof v === 'string' && /^\/.*\/[a-z]*$/.test(v)) ? new RegExp(v.slice(1, v.lastIndexOf('/')), v.slice(v.lastIndexOf('/') + 1)) : null;
  const match = (val, want) => { const r = re(want); return r ? r.test(String(val)) : String(val) === String(want); };
  const fails = [], got = {};
  for (const key of Object.keys(exp)) {
    const v = exp[key];
    try {
      switch (key) {
        case 'serial': { const t = L.serialText(); got.serial = t.slice(-200); if (!t.includes(v)) fails.push(`serial should contain ${JSON.stringify(v)}`); break; }
        case 'serialRe': { const t = L.serialText(); got.serial = t.slice(-200); if (!new RegExp(v).test(t)) fails.push(`serial should match /${v}/`); break; }
        case 'noSerial': { const t = L.serialText(); if (t.includes(v)) fails.push(`serial should not contain ${JSON.stringify(v)}`); break; }
        case 'pin': {
          const p = L.board.pin(v[0]); got['pin' + v[0]] = p;
          const lv = p.pwm != null ? (p.pwm >= 255 ? 1 : p.pwm <= 0 ? 0 : 'pwm') : p.level;
          if (lv !== v[1]) fails.push(`pin ${v[0]} should be ${v[1]} (got ${lv})`);
          break;
        }
        case 'pwm': {
          const p = L.board.pin(v[0]); got['pin' + v[0]] = p;
          const d = p.pwm != null ? p.pwm : (p.level ? 255 : 0);
          if (d < v[1] || d > v[2]) fails.push(`pin ${v[0]} PWM should be ${v[1]}…${v[2]} (got ${d})`);
          break;
        }
        case 'servo': {
          const s = L.board.servo(v[0]); got.servo = s;
          if (!s || Math.abs(s.angle - v[1]) > (v[2] == null ? 3 : v[2])) fails.push(`servo on ${v[0]} should be at ${v[1]}° (got ${s && Math.round(s.angle)})`);
          break;
        }
        case 'lcd': {
          const p = part('lcd1602', 0);
          const rows = p ? [p.dataset.row0 || '', p.dataset.row1 || ''] : [];
          got.lcd = rows;
          v.forEach((want, i) => { if (want != null && (rows[i] || '').replace(/\s+$/, '') !== String(want).replace(/\s+$/, '')) fails.push(`LCD row ${i + 1} should be ${JSON.stringify(want)} (got ${JSON.stringify(rows[i])})`); });
          break;
        }
        case 'part': {
          const [type, attr, want, k] = v; const p = part(type, k);
          const val = p ? p.dataset[attr] : undefined; got[type + '.' + attr] = val;
          if (val === undefined || !match(val, want)) fails.push(`${type}.${attr} should be ${want} (got ${val})`);
          break;
        }
        case 'read': {
          const [type, want, k] = v; const p = part(type, k);
          const val = p ? (p.dataset.read || p.querySelector('.part-read').textContent) : ''; got[type + '.read'] = val;
          if (!(re(want) ? re(want).test(val) : val.includes(want))) fails.push(`${type} readout should contain ${JSON.stringify(want)} (got ${JSON.stringify(val)})`);
          break;
        }
        case 'freq': {
          const [type, want, tol] = v; const p = part(type || 'buzzer', 0);
          const val = p ? p.dataset.freq : undefined; got.freq = val;
          if (want === 'high') { if (val !== 'high') fails.push(`buzzer should show “too high to hear” (data-freq=${val})`); }
          else if (!(Math.abs(Number(val) - want) <= want * (tol == null ? 0.05 : tol))) fails.push(`buzzer frequency should be ≈${want} Hz (got ${val})`);
          break;
        }
        case 'state': got.state = L.state; if (L.state !== v) fails.push(`lab state should be ${v} (got ${L.state})`); break;
        case 'status': { const t = host.querySelector('.ed-status').textContent; got.status = t; if (!(re(v) ? re(v).test(t) : t.includes(v))) fails.push(`status bar should contain ${JSON.stringify(v)} (got ${JSON.stringify(t)})`); break; }
        case 'msg': { const t = host.querySelector('.ed-msgs').textContent; got.msg = t; if (!t.includes(v)) fails.push(`messages should contain ${JSON.stringify(v)} (got ${JSON.stringify(t)})`); break; }
        case 'errLine': {
          const ln = [...host.querySelectorAll('.ed-gutter .ln.err')].map(e => Number(e.textContent));
          got.errLines = ln;
          if (!ln.includes(v) || !host.querySelector('.ed-mark.err')) fails.push(`line ${v} should be marked red in the editor (marked: ${ln})`);
          break;
        }
        case 'var': { const g = (L.runner && L.runner.globals()) || []; const x = g.find(o => o.name === v[0]); got['var ' + v[0]] = x && x.value; if (!x || !match(x.value, v[1])) fails.push(`variable ${v[0]} should be ${v[1]} (got ${x && x.value})`); break; }
        case 'loops': { const n = L.runner ? L.runner.loopCount : 0; got.loops = n; if (n < v) fails.push(`loop() should have run ≥${v} times (got ${n})`); break; }
        case 'audio': { const n = window.__audioCtxCount; got.audio = n; if (v === 0 ? n !== 0 : n < v) fails.push(`AudioContext count should be ${v === 0 ? 0 : '≥' + v} (got ${n})`); break; }
        case 'text': { const e = host.querySelector(v[0]); const t = e ? e.textContent : null; got.text = t; if (t == null || !t.includes(v[1])) fails.push(`${v[0]} should contain ${JSON.stringify(v[1])} (got ${JSON.stringify(t)})`); break; }
        case 'garbled': { const g = host.querySelector('.serial-out').classList.contains('garbled'); got.garbled = g; if (g !== v) fails.push(`serial monitor garbled should be ${v}`); break; }
        default: fails.push('unknown expectation ' + key);
      }
    } catch (e) { fails.push(key + ': ' + e.message); }
  }
  return { ok: !fails.length, fails, got };
}

async function expectPoll(page, exp, timeout, where) {
  const t0 = Date.now();
  let r;
  do {
    r = await page.evaluate(pageCheck, exp);
    if (r.ok) break;
    await sleep(80);
  } while (Date.now() - t0 < timeout);
  checks++;
  if (!r.ok) fail(where, r.fails.join('; ') + '  · got ' + JSON.stringify(r.got).slice(0, 400));
  return r.ok;
}

// ------------------------------------------------------------------ lab driving helpers
const LAB = '#deck-main .lab';
const partSel = (type, k) => `${LAB} .part[data-type="${type}"] >> nth=${k || 0}`;
// scroll the element to the middle of the viewport (clear of the sticky top / bottom bars) and make
// sure a pointer at its centre really hits it — a student's finger would hit the same element
async function center(page, sel) {
  const loc = page.locator(sel).first();
  await loc.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await sleep(40);
  const b = await loc.boundingBox();
  if (!b) throw new Error('not visible: ' + sel);
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const hit = await loc.evaluate((el, [px, py]) => { const t = document.elementFromPoint(px, py); return t ? (el === t || el.contains(t) ? '' : (t.className && t.className.baseVal != null ? t.className.baseVal : t.className) || t.tagName) : 'nothing'; }, [x, y]);
  if (hit) throw new Error(`${sel} is covered by “${hit}” at its centre`);
  return { x, y, b };
}
async function clickRun(page) { await page.locator(`${LAB} .btn-run`).click(); }
async function clickStop(page) { await page.locator(`${LAB} .btn-stop`).click(); }
async function labState(page) { return page.evaluate(() => { const L = SIM.deck.current.lab; return L ? { state: L.state, rs: L.runner && L.runner.state, status: L.el.querySelector('.ed-status').textContent } : null; }); }
async function selectTab(page, i) {
  await page.locator(`${LAB} .ed-tab >> nth=${i}`).click();
  await page.waitForFunction(i => SIM.deck.current.lab && SIM.deck.current.lab.program === i, i);
}

/* One smoke step (all keys optional, applied in this order; see AUTHORING_LESSONS.md §6):
     tab:i  code:'…'  task:n  run  stop  speed  wait:ms
     press:type [target]   mouse down on the part's press-and-hold control (held until release)
     release               mouse up
     knob:type to:0…1 [index]       drag a rotary knob to a position
     slider:type value [index]      set a range slider (index = which slider in the card)
     stick:[dx,dy]         drag the joystick (−1…1, right / up positive; held until release)
     click:type [target]   click a button inside the part (default '.pbtn': 用手盖住 / 碰一下 / 开启声音 …)
     key:'ArrowRight' part:type [target] [times] [hold]   keyboard on a focused part control
                           (hold:true keeps the key down until release — for programs that delay())
     sound                 click 开启声音 on the buzzer
     send:'90' ending:'none'|'nl'|'cr'|'both'      type into the serial monitor and press 发送
     baud:115200           change the serial monitor baud
     expect:{…} [timeout]  poll until every expectation holds (see pageCheck) */
const HELD = []; // keys held down by {key, hold:true}
async function doStep(page, st, where) {
  const k = st.n || 0;
  const inPart = (type, target) => `${LAB} .part[data-type="${type}"] >> nth=${k} >> ${target}`;
  if (st.tab != null) { await selectTab(page, st.tab); }
  if (st.code != null) { await page.evaluate(c => SIM.deck.current.lab.setCode(c), String(st.code)); }
  if (st.task != null) { await page.locator(`${LAB} .lab-tasks li.task >> nth=${st.task - 1} >> button`).click(); }
  if (st.run) { await clickRun(page); await sleep(60); }
  if (st.stop) { await clickStop(page); }
  if (st.speed) { await page.locator(`${LAB} .ed-opt.speed select`).selectOption(String(st.speed)); }
  if (st.wait) await sleep(st.wait);
  if (st.press) {
    const c = await center(page, inPart(st.press, st.target || '[aria-pressed]'));
    await page.mouse.move(c.x, c.y); await page.mouse.down();
  }
  if (st.release) {
    await page.mouse.up();
    for (const key of HELD.splice(0)) await page.keyboard.up(key);
  }
  if (st.stick) {
    // geometry of the joystick card's SVG (viewBox 280×140, stick centre 70,68, travel radius 38)
    const c = await center(page, inPart('joystick', 'svg >> nth=0'));
    const sx = c.b.width / 280, sy = c.b.height / 140;
    const x0 = c.b.x + 70 * sx, y0 = c.b.y + 68 * sy;
    const [dx, dy] = st.stick;
    await page.mouse.move(x0, y0); await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + dx * 38 * sx * i / 8, y0 - dy * 38 * sy * i / 8);
  }
  if (st.knob) {
    const sel = inPart(st.knob, `svg.knob >> nth=${st.index || 0}`);
    const c = await center(page, sel);
    const cur = Number(await page.locator(sel).first().getAttribute('aria-valuenow')) / 100;
    const R = c.b.width * 0.44;
    const pt = f => { const a = (-150 + 300 * Math.max(0, Math.min(1, f))) * Math.PI / 180; return [c.x + Math.sin(a) * R, c.y - Math.cos(a) * R]; };
    let [x, y] = pt(cur);
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { [x, y] = pt(cur + (st.to - cur) * i / 12); await page.mouse.move(x, y); }
    if (st.to >= 1 || st.to <= 0) { [x, y] = pt(st.to >= 1 ? 1.04 : -0.04); await page.mouse.move(x, y); }
    await page.mouse.up();
  }
  if (st.slider) {
    const sel = inPart(st.slider, `input[type=range] >> nth=${st.index || 0}`);
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.locator(sel).evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, st.value);
  }
  if (st.click) { await page.locator(inPart(st.click, st.target || '.pbtn')).first().click(); }
  if (st.key) {
    const loc = page.locator(inPart(st.part, st.target || '[tabindex="0"]')).first();
    await loc.focus();
    if (st.hold) { await page.keyboard.down(st.key); HELD.push(st.key); }
    else for (let i = 0; i < (st.times || 1); i++) await page.keyboard.press(st.key);
  }
  if (st.sound) { await page.locator(inPart(st.sound === true ? 'buzzer' : st.sound, '.pbtn.sound')).click(); }
  if (st.send != null) {
    if (st.ending) await page.locator(`${LAB} .serial-in select`).selectOption(st.ending);
    await page.locator(`${LAB} .serial-in input`).fill(String(st.send));
    await page.locator(`${LAB} .serial-in .send`).click();
  }
  if (st.baud) { await page.locator(`${LAB} .serial-head select`).selectOption(String(st.baud)); }
  if (st.expect) await expectPoll(page, st.expect, st.timeout || 5000, where + ' ' + JSON.stringify(st.expect).slice(0, 80));
}

// ------------------------------------------------------------------ one lab slide
async function testLab(page, mode, id, idx, full) {
  const where = `${mode.name} #${id}-${idx + 1}`;
  await page.waitForSelector(LAB);
  // data: programs, task code, smoke steps (JSON-safe copy)
  const info = await page.evaluate(([id, idx]) => {
    const s = SIM.deck.lessons[id].slides[idx];
    const lab = s.lab || {};
    const norm = SIM.lab.normCode;
    const progs = (lab.programs || []).map(p => {
      const r = SIM.interp.compile(norm(p.code));
      return { name: p.name, label: p.label, expect: p.expect || null, ok: r.ok, err: r.ok ? null : r.errors[0] };
    });
    const tasks = (lab.tasks || []).map((t, i) => {
      if (!t || !t.code) return null;
      const r = SIM.interp.compile(norm(t.code));
      return { i, ok: r.ok, expect: t.expect || null, err: r.ok ? null : r.errors[0] };
    }).filter(Boolean);
    return { progs, tasks, smoke: lab.smoke ? JSON.parse(JSON.stringify(lab.smoke)) : null, parts: (lab.parts || []).map(p => p.type) };
  }, [id, idx]);
  if (full) {
    for (const p of info.progs) {
      if (p.expect === 'error') check(!p.ok, where, `program ${p.name} is marked expect:'error' but compiles`);
      else check(p.ok, where, `program ${p.name} does not compile: ${p.err && p.err.msg}`);
    }
    for (const t of info.tasks) check(t.expect === 'error' ? !t.ok : t.ok, where, `task ${t.i + 1} reference code ${t.ok ? 'compiles but is marked expect:error' : 'does not compile: ' + (t.err && t.err.msg)}`);
    check(!!info.smoke, where, 'lab has no `smoke` steps (see AUTHORING_LESSONS.md) — only the generic run check was done');
    // run every program tab once
    for (let i = 0; i < info.progs.length; i++) {
      const p = info.progs[i];
      if (info.progs.length > 1) await selectTab(page, i);
      await clickRun(page);
      await sleep(700);
      const st = await labState(page);
      if (p.expect === 'error') {
        check(st.state === 'error' && /^编译错误：第 \d+ 行：/.test(st.status), where, `${p.name}: expected a compile error with a line number in the status bar, got “${st.status}”`);
        const marked = await page.evaluate(() => SIM.deck.current.lab.el.querySelectorAll('.ed-gutter .ln.err').length);
        check(marked > 0, where, `${p.name}: the error line should be marked red`);
      } else {
        check(st.state === 'running' || (st.state === 'stopped' && /程序结束/.test(st.status)), where, `${p.name}: expected 运行中 after ▶ 运行, got state=${st.state} “${st.status}”`);
        if (st.state === 'running') {
          check(/^运行中 · loop\(\) 已执行 \d+ 次 · [\d.]+ 秒/.test(st.status), where, `${p.name}: status bar text “${st.status}”`);
          await clickStop(page);
          const st2 = await labState(page);
          check(st2.state === 'stopped' && st2.rs === 'stopped' && /^已停止/.test(st2.status), where, `${p.name}: ■ 停止 should stop the program (got ${st2.state}/${st2.rs} “${st2.status}”)`);
        }
      }
    }
    if (info.progs.length > 1) await selectTab(page, 0);
  }
  // interaction
  if (info.smoke) {
    await clickRun(page);
    await sleep(80);
    for (const st of info.smoke) await doStep(page, st, where);
    await page.mouse.up().catch(() => {});
    for (const key of HELD.splice(0)) await page.keyboard.up(key).catch(() => {});
  } else {
    await clickRun(page);
    await sleep(1200);
    const st = await labState(page);
    check(st.state !== 'error' || info.progs[0].expect === 'error', where, `program failed: “${st.status}”`);
  }
  await sleep(250);
  await shot(page, `${mode.name}-${id}-${idx + 1}-lab`);
}

// ------------------------------------------------------------------ walk a lesson
async function walkLesson(page, mode, id, full) {
  // a fresh document per lesson: a hash change alone would keep page-wide state (sound on/off,
  // the AudioContext counter) from the previous lesson, making results depend on the run order
  await page.goto('about:blank');
  await page.goto(INDEX + '#' + id);
  await page.waitForFunction(id => window.SIM && SIM.deck && SIM.deck.current.id === id && SIM.deck.current.mode === 'deck', id, { timeout: 8000 });
  const slides = await page.evaluate(id => SIM.deck.lessons[id].slides.map(s => ({ kind: s.kind, title: String(s.title || '').replace(/<[^>]*>/g, '') })), id);
  console.log(`  ${mode.name} #${id}: ${slides.length} slides`);
  for (let i = 0; i < slides.length; i++) {
    const where = `${mode.name} #${id}-${i + 1} (${slides[i].kind})`;
    if (i > 0) {
      await page.locator('.deck-bottom .next').click();
      await page.waitForFunction(i => SIM.deck.current.index === i, i, { timeout: 4000 }).catch(() => fail(where, 'the 下一页 button did not move to this slide'));
    }
    const hash = await page.evaluate(() => location.hash);
    check(hash === `#${id}` + (i ? `-${i + 1}` : ''), where, `hash should remember the page (got ${hash})`);
    const st = await page.evaluate(() => ({
      broken: !!document.querySelector('#deck-main .deck-msg'),
      missing: [...document.querySelectorAll('#deck-main .img-missing')].map(e => e.textContent),
      imgs: [...document.querySelectorAll('#deck-main img')].map(e => e.getAttribute('src'))
    }));
    check(!st.broken, where, 'slide failed to render');
    check(!st.missing.length, where, 'missing images: ' + st.missing.join(', '));
    for (const src of st.imgs) if (!/^(data:|https?:)/.test(src)) check(fs.existsSync(path.join(ROOT, decodeURI(src))), where, 'image file not found: ' + src);
    if (st.imgs.length) {
      // lazy images: scroll each into view and wait until it has decoded
      const bad = await page.evaluate(async () => {
        const out = [];
        for (const img of document.querySelectorAll('#deck-main img')) {
          img.loading = 'eager';
          img.scrollIntoView({ block: 'nearest' });
          for (let t = 0; t < 40 && !(img.complete && img.naturalWidth); t++) await new Promise(r => setTimeout(r, 50));
          if (!img.naturalWidth) out.push(img.getAttribute('src'));
        }
        window.scrollTo(0, 0); document.querySelector('#deck-main').scrollTop = 0;
        return out;
      });
      check(!bad.length, where, 'images did not load: ' + bad.join(', '));
    }
    await noOverflow(page, where);
    if (slides[i].kind === 'code') {
      const r = await page.evaluate(() => {
        const notes = [...document.querySelectorAll('#deck-main .note')];
        const lines = new Set([...document.querySelectorAll('#deck-main .cl')].map(e => Number(e.dataset.line)));
        return notes.filter(n => !lines.has(Number(n.dataset.a)) || !lines.has(Number(n.dataset.b))).map(n => n.dataset.a + '-' + n.dataset.b);
      });
      check(!r.length, where, 'code notes point outside the shown lines (from/to): ' + r.join(', '));
    }
    await shot(page, `${mode.name}-${id}-${i + 1}`);
    if (slides[i].kind === 'lab') await testLab(page, mode, id, i, full);
  }
}

// ------------------------------------------------------------------ robustness (desktop, once)
async function robustness(page, mode) {
  const W = mode.name + ' robustness';
  await page.goto(INDEX + '#_demo');
  await page.waitForFunction(() => SIM.deck.current.id === '_demo');
  const labIdx = await page.evaluate(() => SIM.deck.lessons._demo.slides.findIndex(s => s.kind === 'lab'));
  // keyboard: ← → page outside inputs …
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('ArrowRight');
  check(await page.evaluate(() => SIM.deck.current.index) === 1, W, '→ key should turn to page 2');
  await page.keyboard.press('ArrowLeft');
  await page.goto(INDEX + `#_demo-${labIdx + 1}`);
  await page.waitForSelector(LAB);
  // … but not inside the editor
  await page.locator(`${LAB} .ed-ta`).click();
  await page.keyboard.press('ArrowRight');
  check(await page.evaluate(() => SIM.deck.current.index) === labIdx, W, '→ inside the code editor must not turn the page');
  const setCode = async code => { await page.locator(`${LAB} .ed-ta`).fill(code); };
  const frames = () => page.evaluate(() => new Promise(res => {
    const ts = []; const t0 = performance.now();
    (function f(t) { ts.push(t); if (t - t0 < 1000) requestAnimationFrame(f); else { const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); res({ n: d.length, med: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)], max: d[d.length - 1] }); } })(t0);
  }));

  // 1. runaway programs must not freeze the page; ■ 停止 must work
  const runaway = [
    ['empty loop()', 'void setup() {\n}\n\nvoid loop() {\n}'],
    ['while(true) in loop()', 'void setup() {\n}\n\nvoid loop() {\n  while (true) {\n  }\n}'],
    ['for(;;) in setup()', 'int n = 0;\nvoid setup() {\n  for (;;) {\n    n++;\n  }\n}\n\nvoid loop() {\n}']
  ];
  for (const [name, code] of runaway) {
    await setCode(code);
    await clickRun(page);
    await sleep(300);
    const f = await frames();
    check(f.med < 40 && f.p95 < 120, W, `${name}: page not responsive (frame interval median ${f.med && f.med.toFixed(1)} ms, p95 ${f.p95 && f.p95.toFixed(1)} ms, ${f.n} frames/s)`);
    const st = await labState(page);
    check(st.state === 'running', W, `${name}: should be running, got ${st.status}`);
    if (name === 'empty loop()') check(/全速循环中/.test(st.status), W, `${name}: status should say 全速循环中, got “${st.status}”`);
    const t0 = Date.now();
    await clickStop(page);
    const st2 = await labState(page);
    check(st2.state === 'stopped' && Date.now() - t0 < 1500, W, `${name}: ■ 停止 should stop at once (state ${st2.state}, ${Date.now() - t0} ms)`);
  }

  // 2. speed control: virtual time / wall time
  await setCode('void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(50);\n  digitalWrite(13, LOW);\n  delay(50);\n}');
  for (const [sp, lo, hi] of [[0.1, 0.06, 0.13], [1, 0.75, 1.1], [5, 3.6, 5.4]]) {
    await page.locator(`${LAB} .ed-opt.speed select`).selectOption(String(sp));
    await clickRun(page);
    await sleep(200);
    const r = await page.evaluate(async () => {
      const L = SIM.deck.current.lab; const v0 = L.board.now(), t0 = performance.now();
      await new Promise(r => setTimeout(r, 1500));
      return { ratio: (L.board.now() - v0) / 1000 / (performance.now() - t0), status: L.el.querySelector('.ed-status').textContent };
    });
    check(r.ratio >= lo && r.ratio <= hi, W, `speed ${sp}×: virtual time ran at ${r.ratio.toFixed(3)}× wall time`);
    if (sp !== 1) check(r.status.includes(`${sp}× 速度`), W, `speed ${sp}×: status should mention the speed (“${r.status}”)`);
    await clickStop(page);
  }
  await page.locator(`${LAB} .ed-opt.speed select`).selectOption('1');

  // 3. 跟随行: the current line is highlighted and scrolled into view
  const pad = Array.from({ length: 40 }, (_, i) => `// 第 ${i + 2} 行：注释，把程序推到编辑器下面`).join('\n');
  await setCode('// 跟随行测试\n' + pad + '\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(300);\n  digitalWrite(13, LOW);\n  delay(300);\n}');
  await page.evaluate(() => { SIM.deck.current.lab.el.querySelector('.ed-scroll').scrollTop = 0; });
  const follow = page.locator(`${LAB} .ed-opt.follow input`);
  if (!(await follow.isChecked())) await follow.check();
  await clickRun(page);
  await sleep(900);
  const fl = await page.evaluate(() => {
    const L = SIM.deck.current.lab, el = L.el;
    const sc = el.querySelector('.ed-scroll'), mark = el.querySelector('.ed-mark.cur');
    const gut = el.querySelector('.ed-gutter .ln.cur');
    const top = parseFloat(mark.style.top);
    return { cur: L.runner.curLine, gut: gut && Number(gut.textContent), hidden: mark.hidden, top, st: sc.scrollTop, ch: sc.clientHeight };
  });
  check(fl.cur >= 46 && fl.cur <= 52, W, `跟随行: runner.curLine should be in loop() (got ${fl.cur})`);
  check(!fl.hidden && fl.gut === fl.cur && Math.abs(fl.top - (10 + (fl.cur - 1) * 20)) < 1, W, `跟随行: highlight bar / gutter should mark line ${fl.cur} (gutter ${fl.gut}, top ${fl.top})`);
  check(fl.top >= fl.st - 1 && fl.top + 20 <= fl.st + fl.ch + 1, W, `跟随行: the executing line should be scrolled into view (line top ${fl.top}, view ${fl.st}…${fl.st + fl.ch})`);
  await follow.uncheck();
  await page.evaluate(() => { SIM.deck.current.lab.el.querySelector('.ed-scroll').scrollTop = 0; });
  await sleep(900);
  const st0 = await page.evaluate(() => SIM.deck.current.lab.el.querySelector('.ed-scroll').scrollTop);
  check(st0 === 0, W, '跟随行 off: the editor should not scroll by itself');
  await follow.check();
  await clickStop(page);

  // 4. errors in Chinese with line numbers
  await setCode('void setup() {\n  pinMode(13, OUTPUT)\n}\n\nvoid loop() {\n}');
  await clickRun(page);
  await expectPoll(page, { state: 'error', status: '/^编译错误：第 2 行：.*分号.*expected/', errLine: 2 }, 2000, W + ' compile error');
  await shot(page, `${mode.name}-robust-compile-error`);
  await setCode('int a[3];\nint i = 0;\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  a[i] = i;\n  i++;\n  delay(10);\n}');
  await clickRun(page);
  await expectPoll(page, { state: 'error', status: '/^运行错误：第 8 行：数组越界/', errLine: 8 }, 3000, W + ' runtime error');
  await shot(page, `${mode.name}-robust-runtime-error`);
  await setCode('int x;\nvoid setup() {\n  if (x = 0) {\n    x = 1;\n  }\n}\n\nvoid loop() {\n}');
  await clickRun(page);
  await expectPoll(page, { state: 'running', msg: '第 3 行' }, 2000, W + ' compile warning (if x = 0)');
  await clickStop(page);

  // 5. leaving the slide destroys the running lab
  await page.locator(`${LAB} .btn-reset`).click();
  await clickRun(page);
  await sleep(300);
  await page.evaluate(() => { window.__oldLab = SIM.deck.current.lab; });
  await page.locator('.deck-bottom .next').click();
  await sleep(100);
  const v1 = await page.evaluate(() => ({ t: window.__oldLab.board.now(), state: window.__oldLab.state, rs: window.__oldLab.runner.state, conn: window.__oldLab.el.isConnected, active: !!SIM.lab.active() }));
  await sleep(400);
  const v2 = await page.evaluate(() => window.__oldLab.board.now());
  check(v1.state === 'stopped' && v1.rs === 'stopped' && !v1.conn && !v1.active && v1.t === v2, W,
    `switching slides must destroy the running lab (state ${v1.state}/${v1.rs}, still in DOM ${v1.conn}, active ${v1.active}, clock ${v1.t}→${v2})`);
  // only one lab runs at a time: the next lab mounts idle
  const next = await page.evaluate(() => SIM.deck.current.lab ? SIM.deck.current.lab.state : 'none');
  check(next === 'idle' || next === 'none', W, `the next slide's lab should start idle (got ${next})`);
}

// ------------------------------------------------------------------ main
(async () => {
  const browser = await chromium.launch();
  const modes = [
    { name: 'desktop-light', w: 1280, h: 800, dark: false, full: true },
    { name: 'phone-light', w: 390, h: 844, dark: false },
    { name: 'desktop-dark', w: 1280, h: 800, dark: true },
    { name: 'phone-dark', w: 390, h: 844, dark: true }
  ].filter(m => (!QUICK || m.full) && (!MODES || MODES.includes(m.name)));
  const t0 = Date.now();
  try {
    for (const mode of modes) {
      console.log(`== ${mode.name} (${mode.w}×${mode.h})`);
      const { ctx, page } = await newPage(browser, mode);
      await checkHome(page, mode);
      // the two built-in lessons (#_demo: the hard labs, #_parts: every other part type), then every course lesson that exists
      const extra = ['_demo', '_parts'].filter(id => fs.existsSync(path.join(ROOT, 'lessons', id + '.js')));
      const ids = await page.evaluate(([extra, course]) => extra.concat(course.filter(id => SIM.deck.lessons[id])), [extra, COURSE]);
      if (ONLY && !ids.includes(ONLY)) {
        // a course lesson must be loaded by index.html (checked above); any other id is loaded on demand
        if (COURSE.includes(ONLY)) fail(mode.name, `#${ONLY} is not loaded by index.html, so it cannot be walked`);
        else ids.push(ONLY);
      }
      for (const id of ids) {
        if (ONLY && id !== ONLY) continue;
        await walkLesson(page, mode, id, !!mode.full);
      }
      if (mode.full && (!ONLY || ONLY === '_demo')) await robustness(page, mode);
      await ctx.close();
    }
  } catch (e) {
    fail('smoke', 'crashed: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(`\nsmoke: ${checks} checks, ${failures.length} failure(s), ${((Date.now() - t0) / 1000).toFixed(1)} s · screenshots in ${SHOTS}`);
  if (failures.length) { console.log(failures.map(f => ' - ' + f).join('\n')); process.exit(1); }
  console.log('smoke: OK');
})();
