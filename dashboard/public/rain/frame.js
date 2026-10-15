// Silent frame edition: bounded simulation and demand-driven Canvas painting.
import { startFrameRain } from './frame-engine.js';
import { PROFILES } from './frame-core.js';

const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search);
let app;
window.addEventListener('error', () => { $('error').style.display = 'block'; });
try {
  app = startFrameRain($('rain'), { benchmark: query.has('bench'),
    mode: query.get('mode'), scanlines: query.get('scan') === '1' });
} catch (error) {
  $('error').style.display = 'block';
  console.error('Frame rain startup failed', error);
  throw error;
}
function update() {
  const state = app.state;
  $('pause').textContent = state.paused ? 'Resume' : 'Pause';
  $('pause').setAttribute('aria-pressed', String(state.paused));
  $('mode').textContent = state.mode === 'rain' ? 'Tunnel · lite' : 'Return to rain';
  $('grade').textContent = 'Signal: ' + PROFILES[state.grade].name;
  $('crt').textContent = 'Scanlines: ' + (state.crt === 'off' ? 'Off' : 'On');
}
$('pause').onclick = () => app.setOption('paused', !app.state.paused);
$('mode').onclick = () => app.setOption('mode', app.state.mode === 'rain' ? 'tunnel' : 'rain');
$('grade').onclick = () => {
  const keys = Object.keys(PROFILES);
  app.setOption('grade', keys[(keys.indexOf(app.state.grade) + 1) % keys.length]);
};
$('crt').onclick = () => app.setOption('crt', app.state.crt === 'off' ? 'scan' : 'off');
$('surge').onclick = () => app.surge();
$('reseed').onclick = () => app.reseed();
$('fill').onclick = () => parent.postMessage('frame-cinema', location.origin);
document.addEventListener('pointerdown', () => parent.postMessage('frame-interaction', location.origin), true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') parent.postMessage('frame-cinema', location.origin);
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
    event.preventDefault(); $('pause').click();
  }
});
window.addEventListener('rain-state', update);
let previous = app.stats.frames, last = performance.now();
const hud = setInterval(() => {
  const now = performance.now(), frames = app.stats.frames;
  const rate = Math.round((frames - previous) * 1000 / (now - last));
  let label = app.state.paused ? 'SIGNAL HELD' : rate + ' FPS / ECO';
  if (query.has('diag')) label += ' / ' + app.stats.calls.toFixed(0) + ' TILES / ' + app.stats.workMs.toFixed(1) + ' ms JS+SUBMIT';
  if ($('fps').textContent !== label) $('fps').textContent = label;
  // Optional diagnostics retain one bounded snapshot, not a growing frame log.
  if (query.has('diag')) $('fps').dataset.metrics = JSON.stringify(app.stats);
  previous = frames; last = now;
}, 2000);
window.addEventListener('pagehide', event => {
  // A cached document can return on Back. Visibility stops/restarts its loop;
  // release resources only when this document is actually being discarded.
  if (!event.persisted) { clearInterval(hud); app.destroy(); }
});
update();
