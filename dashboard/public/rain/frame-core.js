// Bounded simulation only: no DOM, canvases, Maps, cell objects or per-tick arrays.
// Glyphs stay in fixed cells; heads advance through them. The renderer copies only
// changed, opaque tiles. Unlike a faded full-screen fill, an idle cell costs no paint.
export const TILE_W = 20;
export const TILE_H = 24;
export const TONES = 8;
export const MAX_RASTER_WIDTH = 640;
export const TARGET_FPS = 10;
export const DUTY_BUDGET = 0.20;
export const GLYPHS = 'ﾊﾋｼﾂｳｰﾅﾐﾓﾆｻﾜｵﾘﾎﾏｴｷﾑﾃｹﾒｶﾕﾗｾﾈｽﾀﾇ0123456789Z*+:=.';
export const PROFILES = {
  cinema: { name: 'Source', bg: '#000301', ink: ['#000301','#05260d','#09491b','#0d7025','#22a341','#51cf6a','#a3efb0','#effff2'], speed: 1 },
  abyss: { name: 'Deep', bg: '#000509', ink: ['#000509','#06202b','#0a3844','#0c5461','#167f88','#35a9af','#7acfd0','#d8f1ed'], speed: .72 },
  voltage: { name: 'Voltage', bg: '#020400', ink: ['#020400','#172e02','#2c4c03','#476f03','#78a309','#a9cd25','#def16a','#fbffd2'], speed: 1.15 },
  anomaly: { name: 'Anomaly', bg: '#070005', ink: ['#070005','#2e0719','#50112d','#7e1743','#af2b62','#dc5188','#f99ec2','#fff0f6'], speed: 1.05 }
};

// This delay caps submission-side JS + Canvas work to 20% of elapsed time.
// It is NOT a GPU/thermal measurement: async raster/composition may finish later.
export function nextDelay(workMs, fps) {
  return Math.max(0, 1000 / fps - workMs, workMs * (1 / DUTY_BUDGET - 1));
}

export class RainField {
  constructor(width, height, seed = 1) {
    this.width = width;
    this.height = height;
    this.cols = Math.max(1, Math.floor(width / TILE_W));
    this.rows = Math.max(1, Math.floor(height / TILE_H));
    this.count = this.cols * this.rows;
    this.seed = seed >>> 0 || 1;
    this.time = 0;
    this.surgeAt = -10000;
    this.glyph = new Uint8Array(this.count);
    this.level = new Uint8Array(this.count);
    this.depth = new Uint8Array(this.cols);
    this.head = new Float32Array(this.cols);
    this.speed = new Float32Array(this.cols);
    this.length = new Uint8Array(this.cols);
    this.gap = new Uint8Array(this.cols);
    this.active = new Uint8Array(this.cols);
    this.drawn = new Uint16Array(this.count);
    this.dirty = new Uint16Array(this.count);
    this.dirtyCount = 0;
    this.pulseAge = new Float32Array(2);
    this.pulseAge.fill(-1);
    this.pulseDistance = new Float32Array(this.count * 2);
    this.nextPulse = 0;
    this.mutationClock = 0;
    for (let col = 0; col < this.cols; col++) {
      this.depth[col] = (this.random() * 3) | 0;
      this.length[col] = Math.max(5, Math.round(this.rows * (.35 + this.random() * .35)));
      this.gap[col] = 4 + ((this.random() * 10) | 0);
      this.head[col] = this.random() * (this.rows + this.length[col] + this.gap[col]);
      this.speed[col] = 3.5 + this.random() * 5;
      this.active[col] = this.random() < .85 ? 1 : 0;
    }
    for (let i = 0; i < this.count; i++) this.glyph[i] = (this.random() * GLYPHS.length) | 0;
    this.invalidate();
  }

  random() {
    let n = this.seed;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.seed = n >>> 0;
    return this.seed / 4294967296;
  }

  invalidate() { this.drawn.fill(65535); }

  pulse(x, y) {
    const slot = this.nextPulse;
    this.nextPulse = 1 - slot;
    this.pulseAge[slot] = 0;
    const offset = slot * this.count;
    // Calculate distances once on touch, never once per glyph per animation tick.
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const dx = col * TILE_W + TILE_W / 2 - x;
        const dy = row * TILE_H + TILE_H / 2 - y;
        this.pulseDistance[offset + row * this.cols + col] = Math.sqrt(dx * dx + dy * dy);
      }
    }
  }

  surge() { this.surgeAt = this.time; }

  step(dt, speed = 1) {
    // No catch-up loop after a stall. Pausing/visibility are handled by the owner.
    dt = Math.max(0, Math.min(.25, dt));
    this.time += dt;
    this.dirtyCount = 0;
    for (let slot = 0; slot < 2; slot++) {
      if (this.pulseAge[slot] < 0) continue;
      this.pulseAge[slot] += dt;
      if (this.pulseAge[slot] > 1.4) this.pulseAge[slot] = -1;
    }
    for (let col = 0; col < this.cols; col++) {
      if (!this.active[col]) continue;
      const old = Math.floor(this.head[col]);
      const cycle = this.rows + this.length[col] + this.gap[col];
      this.head[col] = (this.head[col] + dt * this.speed[col] * speed) % cycle;
      const head = Math.floor(this.head[col]);
      if (head !== old && head < this.rows) {
        this.glyph[head * this.cols + col] = (this.random() * GLYPHS.length) | 0;
      }
    }
    // Bounded low-frequency mutation, independent of render rate.
    this.mutationClock += dt;
    if (this.mutationClock >= .2) {
      this.mutationClock %= .2;
      for (let n = 0; n < 3; n++) this.glyph[(this.random() * this.count) | 0] = (this.random() * GLYPHS.length) | 0;
    }
    const surgeAge = this.time - this.surgeAt;
    const surgeY = surgeAge * this.height / 1.2;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = row * this.cols + col;
        const age = Math.floor(this.head[col]) - row;
        let level = 0;
        if (this.active[col] && age >= 0 && age < this.length[col]) {
          // Eight discrete tones keep cells unchanged between row advances.
          level = age === 0 ? 7 : Math.max(1, 6 - ((age * 6 / this.length[col]) | 0));
          if (this.depth[col] === 0 && level < 7) level = Math.max(1, level - 2);
          if (surgeAge >= 0 && surgeAge < 1.2 && Math.abs(row * TILE_H - surgeY) < 45) level = 7;
          for (let slot = 0; slot < 2; slot++) {
            if (this.pulseAge[slot] < 0) continue;
            const distance = this.pulseDistance[slot * this.count + i];
            if (Math.abs(distance - this.pulseAge[slot] * 550) < 35) level = Math.min(7, level + 3);
          }
        }
        this.level[i] = level;
        // All blank tiles are identical; a hidden glyph mutation needs no paint.
        const encoded = level ? this.glyph[i] * TONES + level : 0;
        if (encoded !== this.drawn[i]) {
          this.drawn[i] = encoded;
          this.dirty[this.dirtyCount++] = i;
        }
      }
    }
    return this.dirtyCount;
  }

  get bytes() {
    return this.glyph.byteLength + this.level.byteLength + this.depth.byteLength +
      this.head.byteLength + this.speed.byteLength + this.length.byteLength +
      this.gap.byteLength + this.active.byteLength + this.drawn.byteLength +
      this.dirty.byteLength + this.pulseAge.byteLength + this.pulseDistance.byteLength;
  }
}
