// Source: https://digital-raindrops.netlify.app/js/crt.js (2026-10-15)
(()=>{
const rain = RainApp.state;
// Stretch the middle more than the top/bottom: straight vertical lanes bow
// outward on convex glass. A positive edge overscan keeps all corners filled.
const stripOverscan = (w,h,y,curve) => {
  const v=(y/h-.5)*2;
  return w*(.018-.013*v*v)*curve;
};
// ─── CRT VIDEO OUTPUT ────────────────────────────────────────────────────
// A genuine radial barrel distortion via a fragment shader. This does NOT
// modify glyph placement or the collision-free rain scheduler; it only bends
// the final raster as a CRT would. A Canvas2D strip fallback is included.
window.CRTDisplay = class CRTDisplay {
  constructor(source) {
    this.source = source;
    this.mode = 'off';
    this.output = document.createElement('canvas');
    this.output.id = 'crt-output';
    this.output.setAttribute('aria-hidden', 'true');
    this.output.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none;';
    source.parentElement.appendChild(this.output);
    const mobileCanvas = RainApp.mobileInput;
    this.gl = mobileCanvas ? null : this.output.getContext('webgl', {
      alpha:false, antialias:false, depth:false, stencil:false,
      preserveDrawingBuffer:true, powerPreference:'default'
    });
    if (this.gl) {
      try { this.createGL(); }
      catch (err) {
        console.warn('CRT shader unavailable; using canvas fallback', err);
        this.gl = null;
        const replacement = document.createElement('canvas');
        replacement.id = this.output.id;
        replacement.setAttribute('aria-hidden','true');
        replacement.style.cssText = this.output.style.cssText;
        this.output.replaceWith(replacement);
        this.output = replacement;
      }
    }
    if (!this.gl) this.ctx = this.output.getContext('2d',{alpha:false});
    this.resize();
  }
  createGL() {
    const gl = this.gl;
    const vs = `attribute vec2 a_pos;
      void main(){gl_Position=vec4(a_pos,0.,1.);}`;
    const fs = `precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_size;
      uniform float u_curve;
      uniform float u_scan;
      uniform float u_scanScale;
      uniform float u_brightness;
      uniform float u_time;
      void main() {
        vec2 uv = gl_FragCoord.xy/u_size;
        vec2 p = uv*2.-1.;
        // Fit the largest radial displacement (at the corners) into the
        // source image. Mild overscan crops the edge centres, filling every
        // output pixel without a curved black border or clamped edge smear.
        vec2 lookup = p*(1. + .08*u_curve*dot(p,p))*(.5/(1. + .16*u_curve))+.5;
        if (lookup.x<0. || lookup.x>1. || lookup.y<0. || lookup.y>1.) {
          gl_FragColor = vec4(.001,.006,.003,1.);
          return;
        }
        vec3 rgb = texture2D(u_image,lookup).rgb;
        float period=2.7*u_scanScale;
        // Keep the band profile fixed in raster coordinates. Spacing, dark
        // width and edge softness then scale together with glyph height.
        float distanceToBand=abs(fract(gl_FragCoord.y/period)-.5);
        float darkBand=1.0-smoothstep((1.25/5.4)-.06,(1.25/5.4)+.06,distanceToBand);
        float scan=1.0-darkBand;
        // Keep average phosphor brightness stable as the wider bands scale.
        float recovery=1.0/(1.0-(.88*1.25/2.7)*u_scan);
        rgb *= (1. - u_scan*(.88*(1.-scan))) * recovery * u_brightness;
        // Very subtle RGB grille / horizontal phosphor spread.
        float grille=.96+.04*cos(gl_FragCoord.x*2.0944);
        rgb *= 1.-.11*u_scan*(1.-grille);
        float vignette = 1.-(.11*u_curve)*pow(max(abs(p.x),abs(p.y)),2.1);
        rgb *= vignette;
        if (u_curve>0.) {
          float glass = exp(-pow((p.x+.60)/.24,2.)-pow((p.y+.80)/.20,2.));
          rgb += vec3(.015,.024,.019)*glass*min(u_curve,1.);
        }
        gl_FragColor=vec4(rgb,1.);
      }`;
    const compile = (kind, code) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'a_pos');
    gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    this.uniforms = Object.fromEntries(['u_image','u_size','u_curve','u_scan','u_scanScale','u_brightness','u_time'].map(key=>[key,gl.getUniformLocation(program,key)]));
    this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.uniform1i(this.uniforms.u_image,0);
  }
  resize() {
    this.output.width=this.source.width;
    this.output.height=this.source.height;
    if(this.gl) this.gl.viewport(0,0,this.output.width,this.output.height);
  }
  // The shader maps output pixels to sampled source pixels. Pointer input
  // must follow the same transformation or a click near curved edges misses.
  screenToSource(x,y) {
    if(this.mode!=='glass'||rain.mode==='tunnel')return {x,y};
    const w=this.source.width,h=this.source.height;
    if(!this.gl) {
      // The fallback stretches each strip past the viewport edges. Follow
      // the same crop as drawImage so pointer effects stay under the finger.
      const stripY=Math.floor(y/3)*3;
      const overscan=stripOverscan(w,h,stripY,rain.curvature);
      return {x:(x+overscan)*w/(w+2*overscan),y};
    }
    const px=2*x/w-1,py=2*y/h-1;
    const curve=rain.curvature;
    const factor=(.5/(1+.16*curve))*(1+.08*curve*(px*px+py*py));
    return {x:(.5+px*factor)*w,y:(.5+py*factor)*h};
  }
  setMode(mode) {
    this.mode=mode;
    this.source.style.opacity=mode==='off'?'1':'0';
    this.output.style.display=mode==='off'?'none':'block';
  }
  present(source) {
    if(this.mode==='off')return;
    if (this.output.width!==source.width||this.output.height!==source.height)this.resize();
    const w=this.output.width,h=this.output.height;
    // Glyphs grow directly with camera zoom. Use the same factor for both
    // scanline spacing and thickness above 100%, keeping their ratio fixed.
    const scanScale=Math.max(1,rain.zoom);
    // Tunnel perspective supplies its own curvature. Retain the rain setting.
    const curve=this.mode==='glass'&&rain.mode!=='tunnel'?rain.curvature:0;
    if(this.gl) {
      const gl=this.gl,u=this.uniforms;
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform2f(u.u_size,w,h);
      gl.uniform1f(u.u_curve,curve);
      gl.uniform1f(u.u_scan,rain.scanStrength);
      gl.uniform1f(u.u_scanScale,scanScale);
      gl.uniform1f(u.u_brightness,rain.scanBrightness);
      gl.uniform1f(u.u_time,RainApp.time*.001);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    } else if(this.ctx) {
      const ctx=this.ctx;
      ctx.fillStyle='#000400';ctx.fillRect(0,0,w,h);
      // Fallback brightness must be applied BEFORE the dark scanline masks.
      const maskCoverage=(.82*1.25+.17*.65)/2.7;
      const compensation=1/(1-maskCoverage*rain.scanStrength)*rain.scanBrightness;
      ctx.save();ctx.filter=`brightness(${compensation})`;
      if(curve>0) {
        for (let y=0;y<h;y+=3) {
          const row=Math.min(3,h-y);
          const overscan=stripOverscan(w,h,y,curve);
          ctx.drawImage(source,0,y,w,row,-overscan,y,w+2*overscan,row);
        }
      } else ctx.drawImage(source,0,0,w,h);
      ctx.restore();
      ctx.fillStyle=`rgba(0,0,0,${rain.scanStrength*.82})`;
      for(let y=0;y<h;y+=2.7*scanScale)ctx.fillRect(0,y,w,1.25*scanScale);
      ctx.fillStyle=`rgba(0,0,0,${rain.scanStrength*.17})`;
      for(let y=1.25*scanScale;y<h;y+=2.7*scanScale)ctx.fillRect(0,y,w,.65*scanScale);
    }
  }
}

})();
