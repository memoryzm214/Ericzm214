/* =====================================================================
   sim/deck.js — 课件框架 (SIM_SPEC §5.3)
   Home view (static markup in index.html, refreshed here) + lesson view with
   hash routing (#l12, #l12-7), keyboard / button / dot navigation, progress,
   experiment outline dropdown, slide renderers and a click-to-zoom lightbox.

   Lesson files (lessons/l12.js …) are plain data and register themselves:
     SIM.deck.register({
       id: 'l12', no: '1-2', title: '开关类传感器', subtitle: '按键 · 触摸开关 · …',
       experiments: ['按键模块实验', …],          // optional (default: titles of the section slides)
       slides: [ {kind:'cover', …}, {kind:'section', …}, {kind:'html', …}, … ]
     })
   (A lesson may also do `(SIM.lessons = SIM.lessons || {})[id] = lesson` before deck.js loads.)

   Slide kinds (lessons only write data; every slide may also carry `kicker`):
     cover    {title, subtitle, kicker, meta}
     section  {no:'实验 01', title, desc, tiles:[{title, sub, n?}…4]}
     html     {title, desc, body}
     figure   {title, desc, img | img:[…], caption | captions:[…], side}
     wiring   {title, desc, img, caption, tables:[{left, right, rows:[[a,b]…]}], note, side}
     code     {title, desc, file, code, from, to, hl:[n…], notes:[{line, text} | {line:[a,b], text}], foot}
     lab      {title, desc, lab:{…SIM.lab config…}}
     tasks    {title, desc, items:[string | {title, text}], body}
     summary  {title, desc, items:[string | {title, text}], body}
     end      {title, subtitle}            (turquoise closing page with “回到首页 / 下一课”)

   DEVIATIONS / DECISIONS (beyond §5.3, documented in the UI builder's report):
     · Lesson registration API above (SIM.deck.register) — §5.3 only says lessons are data.
     · Extra slide kind `end`; `figure`/`wiring` accept an array of images; slides render as
       <section class="slide s-<kind>"> (cover/end keep .cover/.end) so `.figure` etc. stay utility classes.
     · Slide changes use history.replaceState (no history entry per page): Back returns to where the lesson
       was opened from. Keyboard paging is ignored while focus is inside inputs, sliders or a lab.
     · Course lessons are loaded by static <script src="lessons/lXX.js"> tags in index.html (between the
       <!-- LESSONS --> markers, before the boot script). boot() never requests a course lesson file
       itself, so a lesson that does not exist yet causes no 404 / ERR_FILE_NOT_FOUND console error:
       its home card simply shows “制作中”. (Integration change; see AUTHORING_LESSONS.md.)

   SIM.deck.boot({lessons:[ids], base:'lessons/', autoload:false, org}) — `lessons` is the home order;
   `org` is the footer line on cover / end slides (default: the school name).
   Ids in that list that have not registered by boot time are marked “制作中” (autoload:true would
   inject their scripts instead, at the cost of a console error for each missing file). Any other id
   in the hash (e.g. #_demo) is loaded on demand from lessons/<id>.js.
   ===================================================================== */
(function (root) {
  'use strict';
  const SIM = root.SIM = root.SIM || {};
  const doc = root.document;
  const LESSONS = SIM.lessons = SIM.lessons || {};
  const STATUS = {};
  const WAIT = {};
  const icon = (n, c) => (SIM.icon ? SIM.icon(n, c) : '');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strip = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  const pad2 = n => String(n).padStart(2, '0');
  const store = {
    get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, v); } catch (e) { /* */ } }
  };
  // single-file build (tools/make_single.py): window.SIM_ASSETS maps 'img/…' paths to data: URIs,
  // so every slide picture (src) and its zoom target (data-zoom) comes from inside the page
  function withAssets(html) {
    const A = root.SIM_ASSETS;
    return A ? String(html).replace(/(src|data-zoom)="(img\/[^"]+)"/g, (m, k, p) => A[p] ? `${k}="${A[p]}"` : m) : html;
  }
  function h(tag, attrs, html) {
    const e = doc.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    if (html != null) e.innerHTML = withAssets(html);
    return e;
  }

  // isometric cube cluster (the template's mark, same geometry as arduino-ppt/lib/vti.js)
  function cubes(cls) {
    const faces = { top: '#6B6B6B', left: '#2D2D2D', right: '#474747' };
    const list = [{ cx: 70, cy: 112, s: 40 }, { cx: 140, cy: 152, s: 40 }, { cx: 140, cy: 72, s: 40, top: '#EBEBEB' }];
    let p = '';
    for (const { cx, cy, s, top } of list) {
      const a = s * 0.866;
      p += `<polygon points="${cx},${cy - s} ${cx + a},${cy - s / 2} ${cx},${cy} ${cx - a},${cy - s / 2}" fill="${top || faces.top}"/>` +
        `<polygon points="${cx - a},${cy - s / 2} ${cx},${cy} ${cx},${cy + s} ${cx - a},${cy + s / 2}" fill="${faces.left}"/>` +
        `<polygon points="${cx},${cy} ${cx + a},${cy - s / 2} ${cx + a},${cy + s / 2} ${cx},${cy + s}" fill="${faces.right}"/>`;
    }
    return `<svg class="${cls || 'cubes'}" viewBox="0 0 200 200" aria-hidden="true">${p}</svg>`;
  }
  SIM.cubes = cubes;

  // ------------------------------------------------------------------ lessons
  function prepare(L) {
    L.slides = Array.isArray(L.slides) ? L.slides.filter(Boolean) : [];
    const groups = [];
    let g = null, n = 0;
    L.slides.forEach((s, i) => {
      if (s.kind === 'section') {
        n++;
        g = { no: s.no || ('实验 ' + pad2(n)), title: strip(s.title), start: i, slides: [] };
        groups.push(g);
      }
      s.__group = g;
      if (g) g.slides.push(i);
    });
    L.__groups = groups;
    L.__labs = L.slides.filter(s => s.kind === 'lab').length;
    if (!Array.isArray(L.experiments) || !L.experiments.length) L.experiments = groups.map(x => x.title);
    return L;
  }
  function register(L) {
    if (!L || !L.id) return;
    LESSONS[L.id] = prepare(L);
    STATUS[L.id] = 'ready';
    if (booted) {
      refreshHome();
      if (view.pendingId === L.id) route();
    }
  }
  function load(id, cb) {
    if (LESSONS[id] && LESSONS[id].slides) { if (!LESSONS[id].__groups) prepare(LESSONS[id]); STATUS[id] = 'ready'; if (cb) cb(true); return; }
    if (!/^[A-Za-z0-9_]{1,32}$/.test(id)) { STATUS[id] = 'missing'; if (cb) cb(false); return; }
    if (STATUS[id] === 'missing') { if (cb) cb(false); return; }
    (WAIT[id] = WAIT[id] || []).push(cb);
    if (STATUS[id] === 'loading') return;
    STATUS[id] = 'loading';
    const s = doc.createElement('script');
    s.src = base + id + '.js';
    const finish = ok => {
      const L = LESSONS[id];
      if (ok && L && !L.__groups) prepare(L);
      STATUS[id] = ok && L ? 'ready' : 'missing';
      if (!ok) s.remove();
      refreshHome();
      (WAIT[id] || []).splice(0).forEach(f => { if (f) f(STATUS[id] === 'ready'); });
    };
    s.onload = () => finish(true);
    s.onerror = () => finish(false);
    doc.body.appendChild(s);
  }

  // ------------------------------------------------------------------ state
  let booted = false, base = 'lessons/', order = [];
  let org = '湖北工业大学 · 工业设计学院'; // footer line on cover / end slides; boot({org}) overrides it
  let homeEl = null, deckEl = null, mainEl = null, topEls = {}, dotsEl = null, progEl = null, prevBtn = null, nextBtn = null;
  const view = { mode: 'home', id: null, idx: 0, pendingId: null, lab: null, ro: null, lightbox: null };

  // ------------------------------------------------------------------ theme
  const THEMES = [['auto', '自动', 'auto'], ['light', '浅色', 'sun'], ['dark', '深色', 'moon']];
  function curTheme() { const t = store.get('sim-theme'); return t === 'light' || t === 'dark' ? t : 'auto'; }
  function applyTheme(t) {
    const r = doc.documentElement;
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
    const th = THEMES.find(x => x[0] === t) || THEMES[0];
    doc.querySelectorAll('.theme-btn').forEach(b => {
      b.innerHTML = `${icon(th[2])}<span>主题：${th[1]}</span>`;
      b.setAttribute('aria-label', `切换配色（现在：${th[1]}）`);
    });
  }
  function cycleTheme() {
    const i = THEMES.findIndex(x => x[0] === curTheme());
    const t = THEMES[(i + 1) % THEMES.length][0];
    store.set('sim-theme', t === 'auto' ? null : t);
    applyTheme(t);
  }

  // ------------------------------------------------------------------ home
  function refreshHome() {
    doc.querySelectorAll('[data-lesson]').forEach(card => {
      const id = card.getAttribute('data-lesson');
      const L = LESSONS[id] && LESSONS[id].__groups ? LESSONS[id] : null;
      const st = STATUS[id];
      const stateEl = card.querySelector('.state');
      const countEl = card.querySelector('.count');
      card.classList.toggle('is-ready', !!L);
      card.classList.toggle('is-missing', !L && st === 'missing');
      if (L) {
        card.setAttribute('href', '#' + id);
        card.removeAttribute('aria-disabled');
        if (countEl) countEl.textContent = `${L.slides.length} 页 · ${L.__labs} 个动手实验室`;
        if (stateEl) stateEl.textContent = '可以开始';
      } else if (st === 'missing') {
        card.removeAttribute('href');
        card.setAttribute('aria-disabled', 'true');
        if (stateEl) stateEl.textContent = '制作中';
      } else if (stateEl) stateEl.textContent = '加载中…';
    });
  }

  // ------------------------------------------------------------------ deck chrome
  function buildDeck() {
    deckEl.classList.add('deck');
    deckEl.innerHTML = '';
    const top = h('header', { class: 'deck-top' });
    const homeLink = h('a', { class: 'home-link', href: '#', title: '回到课程首页' }, `${icon('left')}<span class="txt">首页</span>`);
    const name = h('div', { class: 'lesson-name' });
    const outline = h('select', { class: 'outline', 'aria-label': '实验目录：跳到某一页' });
    outline.addEventListener('change', () => go(Number(outline.value)));
    const theme = h('button', { type: 'button', class: 'theme-btn' });
    theme.addEventListener('click', cycleTheme);
    const pageno = h('div', { class: 'pageno', 'aria-live': 'polite' });
    top.append(homeLink, name, h('div', { class: 'spacer' }), outline, theme, pageno);
    mainEl = h('main', { class: 'deck-main', id: 'deck-main' });
    const bottom = h('footer', { class: 'deck-bottom' });
    prevBtn = h('button', { type: 'button', class: 'btn nav-btn prev', 'aria-label': '上一页（←）' }, `${icon('left')}<span class="txt">上一页</span>`);
    nextBtn = h('button', { type: 'button', class: 'btn nav-btn next primary', 'aria-label': '下一页（→）' }, `<span class="txt">下一页</span>${icon('right')}`);
    dotsEl = h('nav', { class: 'dots', 'aria-label': '页面' });
    progEl = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '1' }, '<i></i>');
    prevBtn.addEventListener('click', () => go(view.idx - 1));
    nextBtn.addEventListener('click', () => go(view.idx + 1));
    dotsEl.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(Number(b.dataset.i)); });
    bottom.append(prevBtn, dotsEl, progEl, nextBtn);
    deckEl.append(top, mainEl, bottom);
    topEls = { name, outline, pageno };
    mainEl.addEventListener('click', onMainClick);
  }
  function slideLabel(s, i) {
    if (s.kind === 'cover') return '封面';
    if (s.kind === 'end') return strip(s.title) || '结束';
    return strip(s.title) || ('第 ' + (i + 1) + ' 页');
  }
  function fillChrome(L) {
    topEls.name.innerHTML = `<span class="no">${esc(L.no || '')}</span>${esc(strip(L.title))}`;
    topEls.name.title = `${L.no || ''} ${strip(L.title)}`;
    // outline: optgroups per experiment
    let html = '', open = false;
    const first = L.__groups.length ? L.__groups[0].start : L.slides.length;
    if (first > 0) { html += `<optgroup label="开场">`; open = true; }
    L.slides.forEach((s, i) => {
      if (s.kind === 'section' && s.__group) {
        if (open) html += '</optgroup>';
        html += `<optgroup label="${esc(s.__group.no + ' · ' + s.__group.title)}">`;
        open = true;
      }
      const lab = s.kind === 'lab' && !/实验室|动手/.test(strip(s.title)) ? '［动手］' : '';
      html += `<option value="${i}">${i + 1}. ${lab}${esc(slideLabel(s, i))}</option>`;
    });
    if (open) html += '</optgroup>';
    topEls.outline.innerHTML = html;
    // dots
    dotsEl.innerHTML = L.slides.map((s, i) => {
      const cls = s.kind === 'section' || s.kind === 'cover' || s.kind === 'end' ? 'sec' : s.kind === 'lab' ? 'lab' : '';
      return `<button type="button" data-i="${i}" class="${cls}" aria-label="第 ${i + 1} 页：${esc(slideLabel(s, i))}" title="${i + 1}. ${esc(slideLabel(s, i))}"></button>`;
    }).join('');
  }

  // ------------------------------------------------------------------ routing
  function parseHash() {
    let raw = '';
    try { raw = decodeURIComponent(root.location.hash.replace(/^#/, '')); } catch (e) { raw = root.location.hash.replace(/^#/, ''); }
    if (!raw || raw === 'home' || raw === '/') return null;
    const m = /^([A-Za-z0-9_]+?)(?:-(\d+))?$/.exec(raw);
    if (!m) return { id: raw, page: 1, bad: true };
    return { id: m[1], page: m[2] ? Math.max(1, parseInt(m[2], 10)) : 1 };
  }
  function route() {
    const r = parseHash();
    if (!r) { showHome(); return; }
    const L = LESSONS[r.id];
    if (L && L.slides) { if (!L.__groups) prepare(L); view.pendingId = null; showLesson(r.id, r.page - 1); return; }
    if (r.bad) { showMessage('找不到这个页面', '地址里的课次编号不对。'); return; }
    view.pendingId = r.id;
    if (STATUS[r.id] === 'missing') { showMessage('这一课还在制作中', '讲解页和实验室正在制作，先看看其他课吧。'); return; }
    showMessage('正在加载…', '');
    load(r.id, ok => {
      if (view.pendingId !== r.id) return;
      if (ok) route();
      else showMessage('这一课还在制作中', '讲解页和实验室正在制作，先看看其他课吧。');
    });
  }
  function leaveSlide() {
    if (view.lab) { try { view.lab.destroy(); } catch (e) { /* */ } view.lab = null; }
    if (view.ro) { view.ro.disconnect(); view.ro = null; }
    closeLightbox();
  }
  function showHome() {
    leaveSlide();
    view.mode = 'home'; view.id = null;
    if (deckEl) deckEl.hidden = true;
    if (homeEl) homeEl.hidden = false;
    doc.title = 'Arduino 互动实验室';
    refreshHome();
  }
  function showDeck() {
    if (homeEl) homeEl.hidden = true;
    deckEl.hidden = false;
  }
  function showMessage(title, text) {
    leaveSlide();
    view.mode = 'msg';
    showDeck();
    view.id = null;
    topEls.name.innerHTML = '';
    topEls.outline.innerHTML = '';
    topEls.outline.hidden = true;
    topEls.pageno.textContent = '';
    dotsEl.innerHTML = '';
    prevBtn.disabled = true; nextBtn.disabled = true;
    mainEl.innerHTML = `<div class="deck-msg"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}<p><a class="btn" href="#">${icon('left')}回到课程首页</a></p></div>`;
  }
  function showLesson(id, idx) {
    const L = LESSONS[id];
    const n = L.slides.length;
    if (!n) { showMessage('这一课还没有内容', ''); return; }
    idx = Math.max(0, Math.min(n - 1, idx));
    const wasMode = view.mode;
    showDeck();
    topEls.outline.hidden = false;
    if (view.id !== id || wasMode !== 'deck') { fillChrome(L); }
    view.mode = 'deck'; view.id = id;
    const want = '#' + id + (idx > 0 ? '-' + (idx + 1) : '');
    if (root.location.hash !== want && root.location.hash !== '#' + id + '-' + (idx + 1)) {
      try { root.history.replaceState(null, '', want); } catch (e) { /* file:// in some browsers */ }
    }
    renderSlide(L, idx);
  }
  function go(i) {
    if (view.mode !== 'deck' || !view.id) return;
    const L = LESSONS[view.id];
    i = Math.max(0, Math.min(L.slides.length - 1, i));
    if (i === view.idx && mainEl.firstChild) return;
    const want = '#' + view.id + (i > 0 ? '-' + (i + 1) : '');
    try { root.history.replaceState(null, '', want); } catch (e) { root.location.hash = want; return; }
    renderSlide(L, i);
  }

  // ------------------------------------------------------------------ slide rendering
  function renderSlide(L, idx) {
    const hadFocus = mainEl.contains(doc.activeElement);
    leaveSlide();
    view.idx = idx;
    const s = L.slides[idx];
    const R = RENDER[s.kind] || RENDER.html;
    let el;
    try { el = R(s, L, idx); } catch (e) {
      if (root.console) console.warn('[deck] slide render failed', s, e);
      el = h('section', { class: 'slide' }, `<div class="deck-msg"><h2>这一页显示出错</h2><p>${esc(e.message)}</p></div>`);
    }
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-label', `第 ${idx + 1} 页：${slideLabel(s, idx)}`);
    mainEl.replaceChildren(el);
    // a callout's or list item's title is a <b> that opens its text; a <b> after some words is ordinary inline bold
    el.querySelectorAll('.callout > div > b:first-child, .summary-list li > div > b:first-child, .task-list-slide li > div > b:first-child').forEach(b => {
      const t = b.previousSibling;
      if (t && t.nodeType === 3 && t.textContent.trim()) b.classList.add('inline');
    });
    if (el.__after) el.__after(el);
    // chrome
    const n = L.slides.length;
    topEls.pageno.innerHTML = `<b>${idx + 1}</b> / ${n}`;
    topEls.outline.value = String(idx);
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === n - 1;
    Array.prototype.forEach.call(dotsEl.children, (b, i) => {
      b.classList.toggle('on', i === idx);
      if (i === idx) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    progEl.firstChild.style.width = ((idx + 1) / n * 100).toFixed(2) + '%';
    progEl.setAttribute('aria-valuemax', String(n));
    progEl.setAttribute('aria-valuenow', String(idx + 1));
    doc.title = `${L.no ? L.no + ' ' : ''}${strip(L.title)} · Arduino 互动实验室`;
    try { root.scrollTo(0, 0); } catch (e) { /* */ }
    if (hadFocus) { try { el.focus({ preventScroll: true }); } catch (e) { /* */ } }
  }
  function kickerOf(s, L) {
    if (s.kicker != null) return s.kicker;
    const base_ = `${L.no ? L.no + ' ' : ''}${strip(L.title)}`;
    const g = s.__group;
    return g ? `${base_}　/　${g.no} ${g.title}` : base_;
  }
  function head(s, L) {
    const k = kickerOf(s, L);
    return `<header class="slide-head">${k ? `<div class="kicker">${k}</div>` : ''}<h2>${s.title || ''}</h2>${s.desc ? `<p class="desc">${s.desc}</p>` : ''}</header>`;
  }
  function slideEl(kind, html) { return h('section', { class: 'slide s-' + kind }, html); }
  function figBox(src, cap, alt) {
    if (!src) return '';
    const a = esc(alt || strip(cap) || src.split('/').pop());
    return `<figure class="fig-box"><button type="button" class="zoom" data-zoom="${esc(src)}" data-cap="${esc(strip(cap))}" aria-label="放大图片：${a}">` +
      `<img src="${esc(src)}" alt="${a}" loading="lazy" decoding="async"><span class="zbadge">${icon('zoom')}</span></button>` +
      (cap ? `<figcaption>${cap}</figcaption>` : '') + '</figure>';
  }
  function figures(s) {
    const imgs = Array.isArray(s.img) ? s.img : s.img ? [s.img] : [];
    const caps = Array.isArray(s.captions) ? s.captions : Array.isArray(s.caption) ? s.caption : [s.caption];
    if (imgs.length <= 1) return figBox(imgs[0], caps[0] != null ? caps[0] : s.caption, s.alt);
    return `<div class="fig-multi">${imgs.map((src, i) => {
      const o = typeof src === 'object' ? src : { src, caption: caps[i] };
      return figBox(o.src || o.img, o.caption, o.alt);
    }).join('')}</div>`;
  }
  function wireImgErrors(el) {
    el.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        const ph = h('div', { class: 'img-missing' }, `${icon('warn')}<span>图片没有找到：${esc(img.getAttribute('src'))}</span>`);
        const host = img.closest('.zoom') || img;
        host.replaceWith(ph);
      }, { once: true });
    });
  }
  function itemsList(items, cls) {
    return `<ol class="${cls}">${(items || []).map((it, i) => {
      const body = typeof it === 'string' ? it : `${it.title ? `<b>${it.title}</b>` : ''}${it.text || ''}`;
      return `<li><span class="n">${i + 1}</span><div>${body}</div></li>`;
    }).join('')}</ol>`;
  }

  const RENDER = {
    cover(s, L) {
      const kicker = s.kicker != null ? s.kicker : `Arduino 互动实验室　·　第 ${esc(L.no || '')} 课`;
      const el = h('section', { class: 'slide cover' },
        `<div class="cover-in"><div class="kicker">${kicker}</div><h1>${s.title || esc(L.title)}</h1>` +
        `${s.subtitle || L.subtitle ? `<p class="subtitle">${s.subtitle || L.subtitle}</p>` : ''}` +
        `<button type="button" class="btn start">开始学习${icon('right')}</button>` +
        `${cubes('cubes')}<div class="org">${s.meta || esc(org)}</div></div>`);
      el.querySelector('.start').addEventListener('click', () => go(view.idx + 1));
      return el;
    },
    end(s, L) {
      const i = order.indexOf(L.id);
      let nextId = null;
      for (let k = i + 1; i >= 0 && k < order.length; k++) if (LESSONS[order[k]] && LESSONS[order[k]].slides) { nextId = order[k]; break; }
      const nl = nextId ? LESSONS[nextId] : null;
      return h('section', { class: 'slide end' },
        `<div class="cover-in"><div class="kicker">${s.kicker != null ? s.kicker : `${esc(L.no || '')} ${esc(strip(L.title))}`}</div>` +
        `<h1>${s.title || '本课结束'}</h1>${s.subtitle ? `<p class="subtitle">${s.subtitle}</p>` : ''}` +
        `<div class="end-actions"><a class="btn start" href="#">${icon('home')}回到首页</a>` +
        (nl ? `<a class="btn ghost-dark" href="#${esc(nextId)}">下一课：${esc(nl.no || '')} ${esc(strip(nl.title))}${icon('right')}</a>` : '') + '</div>' +
        `${cubes('cubes')}<div class="org">${s.meta || esc(org)}</div></div>`);
    },
    section(s, L) {
      const tiles = (s.tiles || []).slice(0, 4);
      const no = s.no || (s.__group && s.__group.no) || '';
      return slideEl('section', `<div class="section-grid"><div class="section-text">` +
        `<div class="no">${esc(L.no || '')}　/　${no}</div><h2>${s.title || ''}</h2>${s.desc ? `<p class="desc">${s.desc}</p>` : ''}</div>` +
        `<div class="tiles">${tiles.map((t, i) => `<div class="t"><div class="n">${t.n || pad2(i + 1)}</div><b>${t.title || ''}</b>${t.sub ? `<span>${t.sub}</span>` : ''}</div>`).join('')}</div></div>`);
    },
    html(s, L) {
      const el = slideEl('html', head(s, L) + `<div class="slide-body">${s.body || s.html || ''}</div>`);
      wireImgErrors(el);
      return el;
    },
    figure(s, L) {
      const side = s.side || '';
      const el = slideEl('figure', head(s, L) + `<div class="fig-grid${side ? '' : ' no-side'}">${figures(s)}${side ? `<div class="fig-side">${side}</div>` : ''}</div>`);
      wireImgErrors(el);
      return el;
    },
    wiring(s, L) {
      const tables = (s.tables || []).map(t =>
        `<div class="table-wrap"><table class="table wiring-table"><thead><tr><th>${t.left || 'Arduino UNO'}</th><th>${t.right || ''}</th></tr></thead>` +
        `<tbody>${(t.rows || []).map(r => `<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('')}</tbody></table></div>`).join('');
      const note = s.note ? `<div class="callout note"><span class="ico">${icon('bulb')}</span><div>${s.note}</div></div>` : '';
      const el = slideEl('wiring', head(s, L) + `<div class="fig-grid">${figures(s)}<div class="fig-side"><div class="wire-tables">${tables}</div>${note}${s.side || ''}</div></div>`);
      wireImgErrors(el);
      return el;
    },
    code(s, L) {
      const code = SIM.lab ? SIM.lab.normCode(s.code) : String(s.code || '');
      const all = SIM.lab ? SIM.lab.highlightLines(code) : code.split('\n').map(esc);
      const from = Math.max(1, s.from || 1), to = Math.min(all.length, s.to || all.length);
      const hl = new Set(s.hl || []);
      const notes = (s.notes || []).map(n => {
        const a = Array.isArray(n.line) ? n.line[0] : n.line, b = Array.isArray(n.line) ? n.line[1] : n.line;
        return { a: Number(a) || from, b: Number(b) || Number(a) || from, text: n.text };
      }).sort((x, y) => x.a - y.a);
      // long lines (the guides' trailing comments) wrap with a hanging indent: own indentation + 4 columns
      const raw = code.split('\n');
      let lines = '';
      for (let ln = from; ln <= to; ln++) {
        const ind = Math.min(24, (/^[ \t]*/.exec(raw[ln - 1] || '')[0].replace(/\t/g, '  ').length) + 4);
        lines += `<div class="cl${hl.has(ln) ? ' hl' : ''}" data-line="${ln}"><span class="ln">${ln}</span><span class="tx" style="--ind:${ind}ch">${(all[ln - 1] || ' ').replace(/^[ \t]+/, m => `<span class="lead">${m}</span>`)}</span></div>`;
      }
      const notesHtml = notes.map((n, i) => `<div class="note" data-line="${n.a}" data-a="${n.a}" data-b="${n.b}" data-i="${i}">` +
        `<span class="tag line">${n.a === n.b ? 'L' + n.a : 'L' + n.a + '–' + n.b}</span><div class="note-tx">${n.text}</div></div>`).join('');
      const el = slideEl('code', head(s, L) +
        `<div class="code-grid"><div class="codeview"><div class="codeview-head"><span>${icon('code')} ${esc(s.file || 'sketch.ino')}</span><span>第 ${from}–${to} 行</span></div>` +
        `<div class="codeview-body">${lines}</div></div>` +
        `<div class="notes aligned"><div class="notes-title">${icon('eye')} 逐行看懂</div>${notesHtml}</div></div>` +
        (s.foot ? `<div class="code-foot">${s.foot}</div>` : ''));
      const body = el.querySelector('.codeview-body');
      el.querySelectorAll('.note').forEach(nEl => {
        const on = v => {
          const a = +nEl.dataset.a, b = +nEl.dataset.b;
          for (let ln = a; ln <= b; ln++) { const c = body.querySelector(`.cl[data-line="${ln}"]`); if (c) c.classList.toggle('focus', v); }
          nEl.classList.toggle('on', v);
        };
        nEl.addEventListener('mouseenter', () => on(true));
        nEl.addEventListener('mouseleave', () => on(false));
      });
      el.__after = node => {
        const align = () => alignNotes(node);
        align();
        if (root.ResizeObserver) { view.ro = new ResizeObserver(align); view.ro.observe(node.querySelector('.codeview')); view.ro.observe(node.querySelector('.notes')); }
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { if (node.isConnected) align(); });
      };
      return el;
    },
    lab(s, L, idx) {
      const el = h('section', { class: 'slide lab-slide' }, head(s, L) + '<div class="lab-host"></div>');
      el.__after = node => {
        if (!SIM.lab) { node.querySelector('.lab-host').innerHTML = '<div class="lab-error">实验室模块（sim/lab.js）没有加载。</div>'; return; }
        const cfg = Object.assign({ key: `${L.id}:${(s.lab && s.lab.key) || strip(s.title) || idx}` }, s.lab || {});
        view.lab = SIM.lab.mount(node.querySelector('.lab-host'), cfg);
      };
      return el;
    },
    tasks(s, L) {
      return slideEl('tasks', head(s, L) + `<div class="slide-body">${itemsList(s.items, 'task-list-slide')}${s.body ? `<div class="mt">${s.body}</div>` : ''}</div>`);
    },
    summary(s, L) {
      return slideEl('summary', head(s, L) + `<div class="slide-body">${itemsList(s.items, 'summary-list')}${s.body ? `<div class="mt">${s.body}</div>` : ''}</div>`);
    }
  };

  function alignNotes(node) {
    const notes = node.querySelector('.notes.aligned');
    const view_ = node.querySelector('.codeview');
    const body = node.querySelector('.codeview-body');
    if (!notes || !view_ || !body) return;
    const items = notes.querySelectorAll('.note');
    if (!items.length) { notes.style.height = ''; return; }
    if (root.getComputedStyle(items[0]).position !== 'absolute') { notes.style.height = ''; items.forEach(n => { n.style.top = ''; }); return; }
    const nTop = notes.getBoundingClientRect().top;
    const title = notes.querySelector('.notes-title');
    let y = title ? title.offsetHeight + 8 : 0;
    items.forEach(n => {
      const c = body.querySelector(`.cl[data-line="${n.dataset.line}"]`);
      let top = c ? c.getBoundingClientRect().top - nTop : y;
      top = Math.max(top, y);
      n.style.top = Math.round(top) + 'px';
      y = top + n.offsetHeight + 8;
    });
    notes.style.height = Math.ceil(Math.max(y, view_.offsetHeight)) + 'px';
  }

  // ------------------------------------------------------------------ lightbox
  function openLightbox(src, cap) {
    closeLightbox();
    const prev = doc.activeElement;
    const lb = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': '放大查看图片' });
    const close = h('button', { type: 'button', class: 'close', 'aria-label': '关闭（Esc）' }, icon('close'));
    const img = h('img', { src, alt: cap || '' });
    lb.append(close, img);
    if (cap) lb.append(h('div', { class: 'cap', text: cap }));
    lb.addEventListener('click', e => { if (e.target !== img) closeLightbox(); });
    doc.body.append(lb);
    view.lightbox = { el: lb, prev };
    try { close.focus({ preventScroll: true }); } catch (e) { /* */ }
  }
  function closeLightbox() {
    const lb = view.lightbox;
    if (!lb) return;
    view.lightbox = null;
    lb.el.remove();
    if (lb.prev && lb.prev.isConnected) { try { lb.prev.focus({ preventScroll: true }); } catch (e) { /* */ } }
  }
  function onMainClick(e) {
    const z = e.target.closest('[data-zoom]');
    if (z && mainEl.contains(z)) { e.preventDefault(); openLightbox(z.getAttribute('data-zoom'), z.getAttribute('data-cap') || ''); return; }
    const img = e.target.closest('.figure img, img.zoomable');
    if (img && !img.closest('.lab')) {
      const fc = img.closest('figure') && img.closest('figure').querySelector('figcaption');
      openLightbox(img.currentSrc || img.src, fc ? fc.textContent : (img.alt || ''));
    }
  }

  // ------------------------------------------------------------------ keyboard
  function typing(t) {
    if (!t || t === doc.body) return false;
    if (t.isContentEditable) return true;
    return !!(t.closest && t.closest('input, textarea, select, [role="slider"], .lab, .lightbox'));
  }
  function onKey(e) {
    if (view.lightbox) {
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
      else if (e.key === 'Tab') { e.preventDefault(); const c = view.lightbox.el.querySelector('.close'); if (c) c.focus(); }
      return;
    }
    if (view.mode !== 'deck' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (typing(e.target)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(view.idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(view.idx - 1); }
  }

  // ------------------------------------------------------------------ boot
  function boot(opts) {
    if (booted) return;
    opts = opts || {};
    booted = true;
    base = opts.base || 'lessons/';
    if (opts.org != null) org = String(opts.org);
    order = (opts.lessons || ['l12', 'l13', 'l21', 'l22', 'l23']).slice();
    homeEl = doc.getElementById(opts.home || 'home');
    deckEl = doc.getElementById(opts.deck || 'deck');
    if (!deckEl) { deckEl = h('div', { id: 'deck', hidden: true }); doc.body.append(deckEl); }
    buildDeck();
    applyTheme(curTheme());
    doc.querySelectorAll('.theme-btn').forEach(b => { if (!b.__wired) { b.__wired = true; if (!deckEl.contains(b)) b.addEventListener('click', cycleTheme); } });
    for (const id in LESSONS) if (LESSONS[id] && LESSONS[id].slides) { if (!LESSONS[id].__groups) prepare(LESSONS[id]); STATUS[id] = 'ready'; }
    if (opts.autoload) order.forEach(id => load(id));
    else order.forEach(id => { if (STATUS[id] !== 'ready') STATUS[id] = 'missing'; });
    refreshHome();
    root.addEventListener('hashchange', route);
    doc.addEventListener('keydown', onKey);
    route();
  }

  SIM.deck = {
    boot, register, go, route,
    get current() { return { mode: view.mode, id: view.id, index: view.idx, lab: view.lab }; },
    lessons: LESSONS,
    status: STATUS,
    renderers: RENDER,
    openLightbox, closeLightbox
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
