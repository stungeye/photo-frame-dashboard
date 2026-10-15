import {
  RainField, GLYPHS, PROFILES, TILE_W, TILE_H, TONES,
  MAX_RASTER_WIDTH, TARGET_FPS, nextDelay
} from './frame-core.js';

// One visible opaque canvas + one compact, reusable atlas. No readbacks,
// offscreen world, DPR scaling, grain, glow buffers or full-screen overlays.
export function startFrameRain(mount, { benchmark = false, scanlines = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.id = 'frame-rain-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  mount.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const atlas = document.createElement('canvas');
  const atlasCtx = atlas.getContext('2d', { alpha: false });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { grade: 'cinema',
    crt: scanlines ? 'scan' : 'off', paused: motion.matches };
  const stats = { frames: 0, dirty: 0, cells: 0, calls: 0, workMs: 0, updateMs: 0,
    paintMs: 0, atlasBytes: 0, bufferBytes: 0, maxWorkMs: 0, targetFPS: TARGET_FPS };
  let field;
  let timer = null, raf = null, lastTime = 0, dead = false, userPause = false;
  let tickCount = 0, workTotal = 0, updateTotal = 0, paintTotal = 0;
  let dirtyTotal = 0, callsTotal = 0, seed = 2166136261;
  let benchmarkCount = 0, benchmarkWork = 0, benchmarkCalls = 0, benchmarkUpdates = 0;
  let benchmarkPaint = 0, benchmarkMax = 0;

  function makeAtlas() {
    const profile = PROFILES[state.grade];
    atlas.width = GLYPHS.length * TILE_W;
    atlas.height = TILE_H * TONES * 3;
    atlasCtx.fillStyle = profile.bg;
    atlasCtx.fillRect(0, 0, atlas.width, atlas.height);
    atlasCtx.textAlign = 'center';
    atlasCtx.textBaseline = 'middle';
    atlasCtx.imageSmoothingEnabled = false;
    for (let depth = 0; depth < 3; depth++) {
      atlasCtx.font = '700 ' + [12, 16, 18][depth] + 'px monospace';
      for (let level = 1; level < TONES; level++) {
        const y = (depth * TONES + level) * TILE_H;
        atlasCtx.fillStyle = profile.ink[level];
        // Bright-head glow is baked once, rather than blended every tick.
        atlasCtx.shadowColor = level === 7 ? profile.ink[5] : profile.bg;
        atlasCtx.shadowBlur = level === 7 ? 2 : 0;
        for (let glyph = 0; glyph < GLYPHS.length; glyph++) {
          atlasCtx.fillText(GLYPHS[glyph], glyph * TILE_W + TILE_W / 2, y + TILE_H / 2);
        }
      }
    }
    atlasCtx.shadowBlur = 0;
    if (state.crt === 'scan') {
      // Scanlines add zero steady-state draw calls or compositor layers.
      atlasCtx.fillStyle = 'rgba(0,0,0,.22)';
      for (let y = 2; y < atlas.height; y += 3) atlasCtx.fillRect(0, y, atlas.width, 1);
    }
    stats.atlasBytes = atlas.width * atlas.height * 4;
  }

  function configure(reseed = false) {
    const scale = Math.min(1, MAX_RASTER_WIDTH / Math.max(1, mount.clientWidth));
    const width = Math.max(TILE_W, Math.round(mount.clientWidth * scale));
    const height = Math.max(TILE_H, Math.round(mount.clientHeight * scale));
    if (!reseed && field && canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
    seed = (seed + 2654435761) >>> 0;
    field = new RainField(width, height, seed);
    makeAtlas();
    stats.targetFPS = TARGET_FPS;
    stats.cells = field.count;
    stats.bufferBytes = field.bytes;
    tickCount = 0; workTotal = 0; updateTotal = 0; paintTotal = 0;
    dirtyTotal = 0; callsTotal = 0;
    stats.workMs = stats.updateMs = stats.paintMs = stats.calls = stats.dirty = stats.maxWorkMs = 0;
    benchmarkCount = 0; benchmarkWork = 0; benchmarkUpdates = 0;
    benchmarkPaint = 0; benchmarkCalls = 0; benchmarkMax = 0;
    delete mount.dataset.benchmark;
    ctx.fillStyle = PROFILES[state.grade].bg;
    ctx.fillRect(0, 0, width, height);
    paint(0);
  }

  function paint(dt) {
    const started = performance.now();
    const count = field.step(dt, PROFILES[state.grade].speed);
    const updated = performance.now();
    // One opaque, unscaled blit also erases the previous glyph.
    for (let n = 0; n < count; n++) {
      const i = field.dirty[n], col = i % field.cols, row = (i / field.cols) | 0;
      const level = field.level[i];
      const glyph = level ? field.glyph[i] : 0;
      const sy = (field.depth[col] * TONES + level) * TILE_H;
      ctx.drawImage(atlas, glyph * TILE_W, sy, TILE_W, TILE_H,
        col * TILE_W, row * TILE_H, TILE_W, TILE_H);
    }
    const finished = performance.now();
    const work = finished - started;
    // Paint submission timing excludes deferred GPU/raster/compositor work.
    stats.frames++;
    tickCount++; workTotal += work; updateTotal += updated - started;
    paintTotal += finished - updated; dirtyTotal += count;
    callsTotal += count;
    stats.maxWorkMs = Math.max(stats.maxWorkMs, work);
    // Counters are scalar and rolling; diagnostics never retain a frame history.
    if (tickCount >= 20) {
      stats.workMs = workTotal / tickCount;
      stats.updateMs = updateTotal / tickCount;
      stats.paintMs = paintTotal / tickCount;
      stats.dirty = dirtyTotal / tickCount;
      stats.calls = callsTotal / tickCount;
      tickCount = 0; workTotal = 0; updateTotal = 0; paintTotal = 0; dirtyTotal = 0; callsTotal = 0;
    }
    if (benchmark && dt > 0) {
      benchmarkCount++; benchmarkWork += work; benchmarkUpdates += updated - started;
      benchmarkPaint += finished - updated; benchmarkCalls += count;
      benchmarkMax = Math.max(benchmarkMax, work);
      // A bounded diagnostic sample stops itself. It never launches a heat soak.
      if (benchmarkCount >= 80) {
        state.paused = true;
        mount.dataset.benchmark = JSON.stringify({ mode: 'rain', ticks: benchmarkCount,
          workMs: benchmarkWork / benchmarkCount, updateMs: benchmarkUpdates / benchmarkCount,
          paintMs: benchmarkPaint / benchmarkCount, calls: benchmarkCalls / benchmarkCount,
          maxWorkMs: benchmarkMax, atlasBytes: stats.atlasBytes, bufferBytes: stats.bufferBytes });
        emit();
      }
    }
    return work;
  }

  function cancel() {
    if (timer !== null) clearTimeout(timer);
    if (raf !== null) cancelAnimationFrame(raf);
    timer = null; raf = null;
  }
  function queue(delay) {
    if (dead || state.paused || document.hidden) return;
    timer = setTimeout(onTimer, delay);
  }
  function onTimer() { timer = null; raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = null;
    if (dead || state.paused || document.hidden) return;
    const dt = lastTime ? Math.max(0, Math.min(.25, (now - lastTime) / 1000)) : 0;
    lastTime = now;
    const work = paint(dt);
    queue(nextDelay(work, stats.targetFPS));
  }
  function restart() { cancel(); lastTime = 0; queue(0); }
  function emit() { window.dispatchEvent(new CustomEvent('rain-state')); }
  function visibility() { cancel(); lastTime = 0; if (!document.hidden) queue(0); }
  function resize() { cancel(); configure(); restart(); }
  function preference() { if (!userPause) { state.paused = motion.matches; restart(); emit(); } }
  function pulse(event) {
    if (state.paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = canvas.getBoundingClientRect();
    field.pulse((event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height);
  }
  canvas.addEventListener('pointerdown', pulse);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', resize);
  motion.addEventListener('change', preference);
  const api = {
    state, stats, canvas,
    setOption(key, value) {
      if (key === 'paused' && typeof value === 'boolean') {
        userPause = true; state.paused = value; restart();
      } else if (key === 'grade' && Object.hasOwn(PROFILES, value)) {
        state.grade = value; makeAtlas();
        field.invalidate();
        paint(0);
      } else if (key === 'crt' && (value === 'off' || value === 'scan')) {
        state.crt = value; makeAtlas();
        field.invalidate();
        paint(0);

      } else return false;
      emit(); return true;
    },
    reseed() { cancel(); configure(true); restart(); },
    surge() { field.surge(); if (state.paused) { state.paused = false; userPause = true; restart(); emit(); } },
    destroy() {
      dead = true; cancel();
      canvas.removeEventListener('pointerdown', pulse);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      motion.removeEventListener('change', preference);
      canvas.width = canvas.height = atlas.width = atlas.height = 0;
      canvas.remove(); field = null;
    }
  };
  configure(); restart();
  return api;
}
