import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as core from '../public/rain/frame-core.js';

function environment(options) {
  let now = 1, nextId = 0, copies = 0, reads = 0;
  const timers = new Map(), rafs = new Map(), windows = new Map(), documents = new Map();
  const canvases = [];
  const mount = { clientWidth: 1192, clientHeight: 800, dataset: {}, appendChild() {} };
  function canvas() {
    const c = { width: 0, height: 0, style: {}, addEventListener() {}, removeEventListener() {}, remove() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 1192, height: 800 }; } };
    c.getContext = () => new Proxy({
      drawImage(...args) { copies++; now += .02; assert.equal(args[3], args[7]); assert.equal(args[4], args[8]); },
      getImageData() { reads++; throw Error('no canvas readbacks allowed'); }
    }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    canvases.push(c); return c;
  }
  const context = {
    ...core, performance: { now: () => now },
    document: { hidden: false, createElement: canvas,
      addEventListener(name, handler) { documents.set(name, handler); }, removeEventListener(name) { documents.delete(name); } },
    window: { addEventListener(name, handler) { windows.set(name, handler); },
      removeEventListener(name) { windows.delete(name); }, dispatchEvent() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    CustomEvent: class {},
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++nextId; rafs.set(id, fn); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); }
  };
  vm.createContext(context);
  const source = fs.readFileSync(new URL('../public/rain/frame-engine.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from '.\/frame-core.js';/, '').replace('export function', 'function');
  vm.runInContext(source, context);
  context.mount = mount; context.options = options;
  const api = vm.runInContext('startFrameRain(mount, options)', context);
  return { api, context, mount, timers, rafs, windows, documents, canvases,
    frame() {
      assert.equal(timers.size, 1, 'at most one timeout');
      const [id, timer] = timers.entries().next().value; timers.delete(id);
      now += timer.delay; timer.fn();
      assert.equal(rafs.size, 1, 'at most one paint callback');
      const [rid, fn] = rafs.entries().next().value; rafs.delete(rid);
      now += 1; fn(now);
    },
    get copies() { return copies; }, get reads() { return reads; }
  };
}

test('pause and hidden documents cancel all animation callbacks', () => {
  const env = environment();
  for (let i = 0; i < 5; i++) env.frame();
  env.api.setOption('paused', true);
  assert.equal(env.timers.size, 0); assert.equal(env.rafs.size, 0);
  env.api.setOption('crt', 'scan'); // one static repaint is allowed while paused
  assert.equal(env.timers.size, 0);
  env.api.setOption('grade', 'abyss');
  assert.equal(env.timers.size, 0);
  env.api.setOption('paused', false);
  assert.equal(env.timers.size, 1);
  env.context.document.hidden = true; env.documents.get('visibilitychange')();
  assert.equal(env.timers.size, 0); assert.equal(env.rafs.size, 0);
  env.context.document.hidden = false; env.documents.get('visibilitychange')();
  assert.equal(env.timers.size, 1);
  env.frame();
  assert.equal(env.reads, 0);
});

test('mode changes reuse one atlas and never accumulate animation loops', () => {
  const env = environment();
  assert.equal(env.canvases.length, 2);
  for (let i = 0; i < 20; i++) {
    assert.equal(env.api.setOption('mode', i % 2 ? 'rain' : 'tunnel'), true);
    env.frame();
    assert.equal(env.canvases.length, 2);
    assert.equal(env.timers.size, 1);
    assert.equal(env.reads, 0);
  }
  env.api.destroy();
  assert.equal(env.timers.size, 0); assert.equal(env.rafs.size, 0);
  assert.equal(env.windows.size, 0); assert.equal(env.documents.size, 0);
  for (const c of env.canvases) { assert.equal(c.width, 0); assert.equal(c.height, 0); }
});

test('bounded device benchmark pauses itself at 80 timed ticks', () => {
  const env = environment({ benchmark: true });
  env.frame(); // resume starts with dt=0, never catches up for initialization time
  for (let i = 0; i < 80; i++) env.frame();
  assert.equal(env.api.state.paused, true);
  assert.equal(env.timers.size, 0); assert.equal(env.rafs.size, 0);
  const result = JSON.parse(env.mount.dataset.benchmark);
  assert.equal(result.ticks, 80);
  assert.ok(result.calls < 200);
  assert.ok(result.atlasBytes < 2300000);
});

test('invalid options cannot enable a heavy or unknown rendering mode', () => {
  const env = environment({ mode: 'anything' });
  assert.equal(env.api.state.mode, 'rain');
  assert.equal(env.api.setOption('mode', 'anything'), false);
  assert.equal(env.api.setOption('grade', '__proto__'), false);
  assert.equal(env.api.setOption('paused', 'false'), false);
});
