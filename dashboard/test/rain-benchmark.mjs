// Reproducible command-count comparison. A mock Canvas cannot measure GPU cost.
// Run: node test/rain-benchmark.mjs. The old renderer is retained as a reference;
// it is never loaded by the frame. Both simulations use a deterministic seed.
import vm from 'node:vm';
import fs from 'node:fs';
import { RainField } from '../public/rain/frame-core.js';

let seed = 12345;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const counts = { blits: 0, scaled: 0, fills: 0, pixels: 0 };
const canvases = [];
let clock = 0;
function canvas() {
  const c = { width: 0, height: 0, style: {}, addEventListener() {}, remove() {}, setAttribute() {}, parentElement: {} };
  const context = new Proxy({ canvas: c,
    drawImage(...args) {
      if (c.id !== 'defaultCanvas0') return;
      counts.blits++;
      if (args.length === 9) {
        if (args[3] !== args[7] || args[4] !== args[8]) counts.scaled++;
        counts.pixels += args[7] * args[8];
      } else if (args.length === 5) counts.pixels += args[3] * args[4];
    },
    fillRect(x, y, w, h) { if (c.id === 'defaultCanvas0') { counts.fills++; counts.pixels += w * h; } },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createPattern() { return {}; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  c.getContext = () => context;
  canvases.push(c);
  return c;
}
const math = Object.create(Math); math.random = random;
const context = {
  Math: math, console: { info() {}, error: console.error },
  innerWidth: 1192, innerHeight: 800, navigator: { maxTouchPoints: 1 },
  performance: { now: () => clock },
  matchMedia: query => ({ matches: query === '(pointer: coarse)', addEventListener() {} }),
  addEventListener() {}, dispatchEvent() {}, requestAnimationFrame() {},
  CustomEvent: class {},
  document: { readyState: 'complete', hidden: false, documentElement: { clientWidth: 1192, clientHeight: 800 },
    createElement: canvas, getElementById: () => ({ appendChild(c) { c.parentElement = this; }, style: {}, addEventListener() {} }) },
  CRTDisplay: class { setMode() {} present() {} }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../public/rain/rain.js', import.meta.url), 'utf8'), context);
vm.runInContext('installRainCanvasRuntime()', context);
const retained = vm.runInContext(`({width,height,worldWidth,worldHeight,
  lanes:planes.reduce((n,p)=>n+p.lanes.length,0),
  cells:planes.reduce((n,p)=>n+p.lanes.reduce((n,l)=>n+l.streams.reduce((n,s)=>n+s.cells.size,0),0),0)})`, context);
const beforeBytes = canvases.reduce((n, c) => n + c.width * c.height * 4, 0);
function reference(mode) {
  vm.runInContext(`setRainOption('mode','${mode}')`, context);
  for (let i = 0; i < 20; i++) { clock += 100; vm.runInContext('draw()', context); }
  counts.blits = counts.scaled = counts.fills = counts.pixels = 0;
  for (let i = 0; i < 100; i++) { clock += 100; vm.runInContext('draw()', context); }
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Math.round(value / 100)]));
}
const beforeRain = reference('rain');
const field = new RainField(640, 430, 12345);
field.step(0);
let dirty = 0;
for (let i = 0; i < 100; i++) dirty += field.step(.1);
const afterRain = { blits: Math.round(dirty / 100), scaled: 0, fills: 0,
  pixels: Math.round(dirty / 100) * 20 * 24, simulationBytes: field.bytes };
console.log(JSON.stringify({ reference: { ...retained, canvasBytes: beforeBytes, rain: beforeRain },
  eco: { width: 640, height: 430, cells: field.count, rain: afterRain },
  note: 'Canvas command counts and nominal bitmap bytes, not measured device FPS, RSS or temperature. Rain simulation semantics differ.' }, null, 2));
