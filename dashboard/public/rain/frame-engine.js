import {
  RainField, TunnelField, GLYPHS, PROFILES, TILE_W, TILE_H, TONES,
  TUNNEL_SIZES, TUNNEL_GLYPHS, TUNNEL_TONES, MAX_RASTER_WIDTH,
  TARGET_FPS, TUNNEL_FPS, nextDelay
} from './frame-core.js';

// One visible opaque canvas + one compact, reusable atlas. No readbacks,
// offscreen world, DPR scaling, grain, glow buffers or full-screen overlays.
export function startFrameRain(mount, { benchmark = false, mode = 'rain', scanlines = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.id = 'frame-rain-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  mount.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const atlas = document.createElement('canvas');
  const atlasCtx = atlas.getContext('2d', { alpha: false });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { mode: mode === 'tunnel' ? 'tunnel' : 'rain', grade: 'cinema',
    crt: scanlines ? 'scan' : 'off', paused: motion.matches };
  const stats = { frames: 0, dirty: 0, cells: 0, calls: 0, workMs: 0, updateMs: 0,
    paintMs: 0, atlasBytes: 0, bufferBytes: 0, maxWorkMs: 0, targetFPS: TARGET_FPS };
  let field, atlasOffsets = new Uint16Array(TUNNEL_SIZES.length);
  let timer = null, raf = null, lastTime = 0, dead = false, userPause = false;
  let tickCount = 0, workTotal = 0, updateTotal = 0, paintTotal = 0;
  let dirtyTotal = 0, callsTotal = 0, seed = 2166136261;
  let benchmarkCount = 0, benchmarkWork = 0, benchmarkCalls = 0, benchmarkUpdates = 0;
  let benchmarkPaint = 0, benchmarkMax = 0;

  function makeAtlas() {
    const profile = PROFILES[state.grade];
    if (state.mode === 'rain') {
      atlas.width = GLYPHS.length * TILE_W;
      atlas.height = TILE_H * TONES * 3;
    } else {
      atlas.width = TUNNEL_GLYPHS * TUNNEL_SIZES[TUNNEL_SIZES.length - 1];
      let height = 0;
      for (let i = 0; i < TUNNEL_SIZES.length; i++) {
        atlasOffsets[i] = height;
        height += TUNNEL_SIZES[i] * TUNNEL_TONES;
      }
      atlas.height = height;
    }
    atlasCtx.fillStyle = profile.bg;
    atlasCtx.fillRect(0, 0, atlas.width, atlas.height);
    atlasCtx.textAlign = 'center';
    atlasCtx.textBaseline = 'middle';
    atlasCtx.imageSmoothingEnabled = false;
    if (state.mode === 'rain') {
      for (let depth = 0; depth < 3; depth++) {
        const fontSize = [12, 16, 18][depth];
        atlasCtx.font = '700 ' + fontSize + 'px monospace';
        for (let level = 1; level < TONES; level++) {
          const y = (depth * TONES + level) * TILE_H;
          atlasCtx.fillStyle = profile.ink[level];
          // Glow is baked once inside the tile, rather than blended every tick.
          atlasCtx.shadowColor = level === 7 ? profile.ink[5] : profile.bg;
          atlasCtx.shadowBlur = level === 7 ? 2 : 0;
          for (let glyph = 0; glyph < GLYPHS.length; glyph++) {
            atlasCtx.fillText(GLYPHS[glyph], glyph * TILE_W + TILE_W / 2, y + TILE_H / 2);
          }
        }
      }
    } else {
      atlasCtx.shadowBlur = 0;
      for (let s = 0; s < TUNNEL_SIZES.length; s++) {
        const size = TUNNEL_SIZES[s];
        atlasCtx.font = '700 ' + Math.max(5, size - 2) + 'px monospace';
        for (let level = 1; level < TUNNEL_TONES; level++) {
          atlasCtx.fillStyle = profile.ink[Math.min(7, level + 2)];
          for (let glyph = 0; glyph < TUNNEL_GLYPHS; glyph++) {
            atlasCtx.fillText(GLYPHS[glyph * 3 % GLYPHS.length], glyph * size + size / 2,
              atlasOffsets[s] + level * size + size / 2);
          }
        }
      }
    }
    atlasCtx.shadowBlur = 0;
    if (state.crt === 'scan') {
      // Scanlines add zero steady-state draw calls or DOM compositor layers.
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
    field = state.mode === 'rain' ? new RainField(width, height, seed) : new TunnelField(width, height, seed);
    makeAtlas();
    stats.targetFPS = state.mode === 'rain' ? TARGET_FPS : TUNNEL_FPS;
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
    if (state.mode === 'rain') {
      // The atlas tiles include their background: exactly one unscaled blit per
      // dirty cell, with integer coordinates and no clear/composite pass.
      for (let n = 0; n < count; n++) {
        const i = field.dirty[n], col = i % field.cols, row = (i / field.cols) | 0;
        const level = field.level[i];
        const glyph = level ? field.glyph[i] : 0;
        const sy = (field.depth[col] * TONES + level) * TILE_H;
        ctx.drawImage(atlas, glyph * TILE_W, sy, TILE_W, TILE_H,
          col * TILE_W, row * TILE_H, TILE_W, TILE_H);
      }
    } else {
      ctx.fillStyle = PROFILES[state.grade].bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let n = 0; n < count; n++) {
        const i = field.visible[n], s = field.size[i], size = TUNNEL_SIZES[s];
        ctx.drawImage(atlas, field.glyph[i] * size, atlasOffsets[s] + field.level[i] * size,
          size, size, field.x[i], field.y[i], size, size);
      }
    }
    const finished = performance.now();
    const work = finished - started;
    // Paint submission timing excludes deferred GPU/raster/compositor work.
    stats.frames++;
    tickCount++; workTotal += work; updateTotal += updated - started;
    paintTotal += finished - updated; dirtyTotal += count;
    callsTotal += count + (state.mode === 'tunnel' ? 1 : 0);
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
        mount.dataset.benchmark = JSON.stringify({ mode: state.mode, ticks: benchmarkCount,
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
        if (state.mode === 'rain') field.invalidate();
        paint(0);
      } else if (key === 'crt' && (value === 'off' || value === 'scan')) {
        state.crt = value; makeAtlas();
        if (state.mode === 'rain') field.invalidate();
        paint(0);
      } else if (key === 'mode' && (value === 'rain' || value === 'tunnel')) {
        cancel(); state.mode = value; configure(true); restart();
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
