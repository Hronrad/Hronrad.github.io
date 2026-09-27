const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'responsive-shell.js'), 'utf8');

function fixture() {
    const classes = new Set(['glass-mode']);
    const timers = [];
    const mutations = [];
    const windowEvents = {};
    const navEvents = {};
    const buttons = [];
    const properties = {};
    const compact = { matches: true };
    const model = { width: 320, contentWidth: 900, activeLeft: 790, activeWidth: 90 };
    const list = {};
    const body = { classList: {
        contains: key => classes.has(key),
        toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key),
    } };
    const nav = {
        id: 'left-sidebar', scrollLeft: 0,
        get clientWidth() { return model.width - (classes.has('nav-overflow') ? 96 : 0); },
        get scrollWidth() { return Math.max(this.clientWidth, model.contentWidth); },
        getBoundingClientRect() {
            const left = classes.has('nav-overflow') ? 48 : 0;
            return { left, right: left + this.clientWidth, width: this.clientWidth };
        },
        querySelector(selector) {
            if (selector === '.nav-list') return list;
            return { getBoundingClientRect: () => {
                const left = this.getBoundingClientRect().left + model.activeLeft - this.scrollLeft;
                return { left, right: left + model.activeWidth, width: model.activeWidth };
            } };
        },
        scrollBy({ left }) {
            this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + left));
            navEvents.scroll?.();
        },
        addEventListener: (event, listener) => { navEvents[event] = listener; },
        after: button => buttons.push(button),
    };
    const footer = { getBoundingClientRect: () => ({ height: 61 }) };
    const document = {
        body,
        documentElement: { lang: 'en', style: { setProperty: (key, value) => { properties[key] = value; } } },
        getElementById: () => nav,
        createElement: () => ({ attributes: {}, listeners: {},
            setAttribute(key, value) { this.attributes[key] = value; },
            addEventListener(event, listener) { this.listeners[event] = listener; },
        }),
        querySelector: () => footer,
        querySelectorAll: () => [footer],
        // Font loading deliberately never completes.
        fonts: { ready: new Promise(() => {}) },
    };
    vm.runInNewContext(source, {
        document,
        window: { addEventListener: (event, listener) => { windowEvents[event] = listener; } },
        matchMedia: query => query === '(orientation: portrait) and (max-width: 1400px)' ? compact : { matches: false },
        // No animation frames are delivered, as in the observed Safari failure.
        requestAnimationFrame() { throw new Error('Essential shell UI must not depend on animation frames'); },
        setTimeout: callback => timers.push(callback),
        MutationObserver: class { constructor(callback) { this.callback = callback; } observe(target) { mutations.push({ target, callback: this.callback }); } },
        ResizeObserver: class { observe() {} },
    });
    function flush() {
        let count = 0;
        while (timers.length) {
            assert.ok(++count < 20, 'layout updates should settle');
            timers.shift()();
        }
    }
    return { nav, buttons, properties, classes, model, compact, mutations, windowEvents, flush };
}

test('navigation and footer are ready before fonts or animation frames arrive', () => {
    const f = fixture();
    assert.ok(f.classes.has('nav-overflow'));
    assert.equal(f.properties['--shell-footer'], '61px');
    assert.equal(f.buttons[0].attributes['aria-label'], 'Scroll navigation left');
    assert.equal(f.buttons[1].attributes['aria-label'], 'Scroll navigation right');
    assert.ok(f.nav.scrollLeft > 0, 'active item revealed immediately');
});

test('manual arrows retain the new scroll position and disable at the boundary', () => {
    const f = fixture();
    f.flush();
    f.buttons[0].listeners.click();
    const manuallyScrolled = f.nav.scrollLeft;
    f.flush();
    assert.equal(f.nav.scrollLeft, manuallyScrolled, 'must not snap back to active item');
    for (let i = 0; i < 10; i++) f.buttons[0].listeners.click();
    f.flush();
    assert.equal(f.nav.scrollLeft, 0);
    assert.equal(f.buttons[0].disabled, true);
    assert.equal(f.buttons[1].disabled, false);
});

test('text growth and wide-to-narrow resize reveal the active item after gutters change', () => {
    const f = fixture();
    f.flush();
    f.model.width = 1401;
    f.compact.matches = false;
    f.windowEvents.resize();
    f.flush();
    assert.equal(f.classes.has('nav-overflow'), false);
    f.model.width = 320;
    f.model.contentWidth = 1000;
    f.model.activeLeft = 880;
    f.compact.matches = true;
    f.mutations.find(entry => entry.target === f.nav).callback();
    f.windowEvents.resize();
    f.flush();
    const viewport = f.nav.getBoundingClientRect();
    const active = f.nav.querySelector('a.active').getBoundingClientRect();
    assert.ok(active.left >= viewport.left && active.right <= viewport.right);
});
