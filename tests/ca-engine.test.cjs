const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');

function createEngine(word = 'HRONRAD', width = 320, height = 568) {
    const classes = new Set();
    const context = { window: { innerWidth: width, innerHeight: height, requestAnimationFrame() {} },
        document: { body: { classList: { contains: key => classes.has(key) } } },
        performance: { now: () => 0 }, Math, CustomEvent: class {} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(require.resolve('../CA.js'), 'utf8'), context);
    const canvasContext = new Proxy({}, { get: (obj, key) => obj[key] || (() => {}) });
    const canvas = { width: 0, height: 0, getContext: () => canvasContext };
    const engine = new context.window.CAEngine(canvas, {word, performanceProfile: {useLowEffects:true}});
    return {engine, context, classes};
}

test('complete site name and radio callsign fit the smallest supported screen', () => {
    for (const word of ['HRONRAD', 'BA4TIR']) {
        const {engine} = createEngine(word);
        engine.resizeCanvas();
        assert.ok(engine.cols >= word.length * 7 + 2);
        const occupied = engine.grid.flat().filter(Boolean).length;
        const {engine: reference} = createEngine(word, 390);
        reference.resizeCanvas();
        assert.equal(occupied, reference.grid.flat().filter(Boolean).length);
        assert.ok(occupied > 60);
    }
});

test('browser chrome height changes preserve the running simulation', () => {
    const {engine, context} = createEngine();
    engine.resizeCanvas();
    engine.grid[0][0] = 3;
    engine.currentPhase = 'EVOLVE';
    context.window.innerHeight = 480;
    engine.resizeCanvas();
    assert.equal(engine.grid[0][0], 3);
    assert.equal(engine.currentPhase, 'EVOLVE');
    assert.equal(engine.grid[0].length, engine.rows);
});

test('reduced motion pauses passive evolution but permits explicit playground use', () => {
    const {engine, classes} = createEngine();
    engine.performanceProfile.prefersReducedMotion = true;
    engine.resizeCanvas();
    let advances = 0;
    engine.advancePhase = () => advances++;
    engine.loop(1000);
    assert.equal(advances, 0);
    classes.add('automata-playground');
    engine.loop(2000);
    assert.equal(advances, 1);
    engine.setRuntimeSuspended(true);
    engine.loop(3000);
    assert.equal(advances, 1);
});

test('orientation changes and unknown glyphs do not crash initialization', () => {
    const {engine, context} = createEngine('BA4TIR?');
    engine.resizeCanvas();
    context.window.innerWidth = 844;
    context.window.innerHeight = 390;
    engine.resizeCanvas();
    assert.equal(engine.grid.length, engine.cols);
    assert.ok(engine.grid.every(column => column.length === engine.rows));
});
