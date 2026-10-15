// The frame's old GPU struggled with a second raster + brightness filter and
// produced a blank curved shader. Use a composited CSS scanline layer instead.
// crt.js retains the supplied original implementation for reference.
window.CRTDisplay = class FrameCRTDisplay {
  constructor(source) { this.source=source; this.mount=source.parentElement; }
  setMode(mode) { this.mount.dataset.crt=mode==='off'?'off':'scan'; }
  present() {}
  resize() {}
  screenToSource(x,y) { return {x,y}; }
};
