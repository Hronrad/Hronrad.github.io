const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

function fixture(hash = '#home') {
    let nextId = 1;
    const frames = new Map();
    const timers = new Map();
    const elements = new Map();
    const samples = [];
    const strokes = [];
    const observers = [];
    class Target {
        constructor() { this.events = new Map(); }
        addEventListener(type, callback) {
            if (!this.events.has(type)) this.events.set(type, []);
            this.events.get(type).push(callback);
        }
        emit(type) {
            for (const callback of this.events.get(type) || []) callback({ target: this });
        }
    }
    function element(id) {
        const el = new Target();
        const classes = new Set();
        Object.assign(el, { id, dataset: {}, value: '', textContent: '', style: {
            setProperty(key, value) { this[key] = value; },
            removeProperty(key) { delete this[key]; },
        },
            classList: { contains: key => classes.has(key),
                toggle(key, on) { on ? classes.add(key) : classes.delete(key); } },
        });
        if (id) elements.set(id, el);
        return el;
    }
    function canvas(id, width, height) {
        const el = element(id);
        el.width = width;
        el.height = height;
        const context = new Proxy({
            createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
            drawImage(source) { if (id === 'ham-crt-canvas') samples.push(source.id); },
            stroke() { if (id === 'ham-crt-canvas') strokes.push(this.strokeStyle); },
        }, { get: (target, key) => key in target ? target[key] : () => {} });
        el.getContext = () => context;
        return el;
    }
    const page = element('page-ham');
    page.classList.toggle('active', hash === '#ham');
    for (const id of ['ham-console-root', 'ham-vfd-digits', 'crt-freq-osd', 'crt-status-osd',
        'ham-lock-led', 'ham-quick-lock', 'ham-tuning-slider', 'hueSlider', 'lang-btn']) element(id);
    elements.get('ham-tuning-slider').value = '14195';
    elements.get('hueSlider').value = '170';
    canvas('ham-crt-canvas', 460, 250);
    canvas('bg-canvas', 1440, 1000);
    const document = { body: element('body'), documentElement: { lang: 'zh-CN' }, getElementById: id => elements.get(id),
        createElement: () => canvas('', 230, 125) };
    const window = new Target();
    window.location = { hash };
    const requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id; };
    const cancelAnimationFrame = id => frames.delete(id);
    const setTimeout = callback => { const id = nextId++; timers.set(id, callback); return id; };
    vm.runInNewContext(read('ham/ham-console.js'), {
        window, document, requestAnimationFrame, cancelAnimationFrame, setTimeout,
        MutationObserver: class { constructor(callback) { this.callback = callback; } observe() { observers.push(this); } },
    });
    window.emit('DOMContentLoaded');
    function flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); }
    flushTimers();
    return { window, document, elements, frames, samples, strokes, observers,
        route(hash) { window.location.hash = hash; page.classList.toggle('active', hash === '#ham');
            window.emit('hashchange'); window.HamConsole.checkRoute(); },
        frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(100)); },
        flushTimers,
    };
}

test('HAM keeps the specified three SVG panels, a single CRT/VFO control and exact beacon copy', () => {
    const html = read('index.html');
    const ham = html.match(/<main\b[^>]*id="page-ham"[\s\S]*?<\/main>/)[0];
    const visible = ham.replace(/<!--[\s\S]*?-->/g, '');
    assert.equal((ham.match(/<svg class="zone-art-svg"/g) || []).length, 3);
    assert.equal((ham.match(/<article class="ham-zone-card/g) || []).length, 3);
    assert.equal((ham.match(/<canvas /g) || []).length, 1);
    assert.equal((ham.match(/type="range"/g) || []).length, 1);
    assert.match(ham, /ham-monograph-shell/);
    assert.match(ham, /ham-callsign-main">BA4TIR/);
    assert.match(ham, /<span class="zone-key-badge">GRID<\/span>/);
    assert.match(ham, /OM92<em class="zone-val-sub">LC/);
    assert.match(ham, /<span class="zone-key-badge">CQ<\/span>\s*<strong class="zone-monument-val">24/);
    assert.match(ham, /<span class="zone-key-badge">ITU<\/span>\s*<strong class="zone-monument-val">44/);
    assert.match(ham, /href="https:\/\/njuham\.github\.io"/);
    assert.doesNotMatch(visible, /qrz|友台信标|访问友台|S-Meter|NOAA|ham-waterfall|ham-scope|ham-cw-key|ham-auto-cq|ham-squelch|ham-tuning-knob|s-meter-box|vfd-display|ham-telemetry/i);
    const dictionary = { window: {} };
    vm.runInNewContext(read('translations.js'), dictionary);
    const requiredKeys = new Set([...ham.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]));
    assert.equal(requiredKeys.size, 15);
    for (const [locale, action] of [['zh', '访问'], ['en', 'VISIT']]) {
        const translations = dictionary.window.TRANSLATIONS[locale];
        assert.deepEqual(new Set(Object.keys(translations).filter(key => key.startsWith('ham_'))), requiredKeys);
        for (const key of requiredKeys) assert.ok(translations[key], `${locale} missing ${key}`);
        assert.equal(translations.ham_nju_action, action);
        assert.equal(translations.ham_nju_desc, '南京大学学生业余无线电协会网站');
        assert.doesNotMatch(JSON.stringify(translations), /qrz|友台信标|访问友台/i);
    }
    assert.doesNotMatch(read('app.js'), /querySelector\("\.ham-station-notes"\)/, 'removed station notes must not crash shared initialization');
});

test('CRT owns one animation loop, sleeps outside HAM and can remount safely', () => {
    const f = fixture();
    assert.equal(f.frames.size, 0);
    f.route('#ham');
    assert.equal(f.frames.size, 1);
    f.window.HamConsole.mount();
    assert.equal(f.frames.size, 1);
    f.frame();
    assert.equal(f.frames.size, 1);
    f.route('#research');
    assert.equal(f.frames.size, 0);
    f.route('#ham');
    assert.equal(f.frames.size, 1);
    f.window.HamConsole.unmount();
    assert.equal(f.frames.size, 0);
    assert.doesNotMatch(read('ham/ham-console.js'), /AudioContext|createOscillator|fetch\(/, 'removed modules must leave no audio or network work');
});

test('14.195 MHz starts unlocked, tuning and resonance synchronize all carrier indicators', () => {
    const f = fixture('#ham');
    const get = id => f.elements.get(id);
    assert.equal(get('ham-vfd-digits').textContent, '14.195 MHz');
    assert.equal(get('ham-console-root').classList.contains('is-carrier-locked'), false);
    get('ham-quick-lock').emit('click');
    assert.equal(get('ham-tuning-slider').value, '14270');
    assert.equal(get('ham-vfd-digits').textContent, '14.270 MHz');
    assert.equal(get('crt-freq-osd').textContent, '14.270 MHz');
    assert.equal(get('ham-console-root').classList.contains('is-carrier-locked'), true);
    assert.equal(get('ham-lock-led').classList.contains('is-locked'), true);
    get('ham-tuning-slider').value = '14000';
    get('ham-tuning-slider').emit('input');
    assert.equal(get('ham-console-root').classList.contains('is-carrier-locked'), false);
    assert.match(get('crt-status-osd').textContent, /元胞噪点解调中/);
    f.document.documentElement.lang = 'en';
    get('lang-btn').emit('click');
    f.flushTimers();
    assert.match(get('crt-status-osd').textContent, /COUPLED DEMODULATION/);
});

test('CRT samples the real background canvas and follows hue changes on each frame', () => {
    const f = fixture('#ham');
    f.elements.get('hueSlider').value = '0';
    f.frame();
    assert.ok(f.samples.includes('bg-canvas'), 'background canvas must be drawn into CRT');
    const red = f.strokes.filter(value => /^rgb\(/.test(value)).at(-1);
    f.elements.get('hueSlider').value = '120';
    f.frame();
    const green = f.strokes.filter(value => /^rgb\(/.test(value)).at(-1);
    assert.notEqual(red, green);
    assert.ok(red && green);
    f.route('#home');
    const count = f.samples.length;
    f.frame();
    assert.equal(f.samples.length, count, 'sleeping CRT must stop sampling the background');
});

test('VFO quiets full-screen grain near resonance and releases it when leaving HAM', () => {
    const f = fixture('#ham');
    const body = f.document.body;
    const noise = () => Number(body.style['--ham-background-noise']);
    assert.equal(body.classList.contains('ham-noise-coupled'), true);
    const detuned = noise();
    f.elements.get('ham-tuning-slider').value = '14250';
    f.elements.get('ham-tuning-slider').emit('input');
    const approaching = noise();
    f.elements.get('ham-quick-lock').emit('click');
    const locked = noise();
    assert.ok(detuned > approaching && approaching > locked);
    f.route('#research');
    assert.equal(body.classList.contains('ham-noise-coupled'), false);
    assert.equal(body.style['--ham-background-noise'], undefined);
    f.elements.get('lang-btn').emit('click');
    f.flushTimers();
    assert.equal(body.style['--ham-background-noise'], undefined, 'inactive HAM cannot change background grain');
    f.route('#ham');
    assert.equal(noise(), locked, 'returning restores the current VFO setting');
});
