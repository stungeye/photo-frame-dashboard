// Adapted from the owner-supplied Digital Raindrop, retrieved 2026-10-15.
// REFERENCE ONLY: not loaded by the frame. Used by test/rain-benchmark.mjs.
// Source: https://digital-raindrops.netlify.app/js/rain.js
// Silent frame edition: audio engine omitted; beat energy removed; 24 FPS.
// One native Canvas runtime for desktop and mobile, with no external scripts.
// Install after the ordered app scripts have defined the lifecycle callbacks.
function installRainCanvasRuntime() {
  if (window.__rainCanvasRuntime) return;
  window.__rainCanvasRuntime = true;
  console.info('Digital Rain: using Canvas 2D renderer.');
  const begun=performance.now();
  let main=null,ctx=null,desiredFPS=30,nextDraw=0;
  const screenSize=()=>frameCanvasSize();
  const applySize=(w,h)=>{
    window.width=w;window.height=h;window.windowWidth=w;window.windowHeight=h;
    main.width=w;main.height=h;
    window.drawingContext=ctx;
  };
  window.createCanvas=(w,h)=>{
    main=document.createElement('canvas');
    main.id='defaultCanvas0';
    main.style.cssText='display:block;width:100%;height:100%;';
    ctx=main.getContext('2d',{alpha:false});
    applySize(w,h);
    return {elt:main,parent(node){node.appendChild(main);}};
  };
  window.createGraphics=(w,h)=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const dc=c.getContext('2d');
    return {canvas:c,drawingContext:dc,pixelDensity(){},clear(){dc.clearRect(0,0,w,h);},
      remove(){c.width=0;c.height=0;}};
  };
  window.frameRate=n=>{desiredFPS=n||30;};
  window.pixelDensity=()=>1;
  window.millis=()=>performance.now()-begun;
  window.background=(r,g,b)=>{
    ctx.globalAlpha=1;ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(0,0,window.width,window.height);
  };
  window.resizeCanvas=(w,h)=>applySize(w,h);
  window.addEventListener('resize',()=>{
    if(!main)return;
    const {w,h}=screenSize();
    if(w!==window.width||h!==window.height)window.windowResized?.();
  },{passive:true});
  function tick(now){
    requestAnimationFrame(tick);
    const interval=1000/desiredFPS;
    // Browser refresh timestamps can land fractionally before the deadline.
    // Retain the frame grid instead of restarting it at each late callback:
    // otherwise rounding/jitter drops whole refreshes and looks like a pause.
    const due=now+.5;
    if(due<nextDraw)return;
    nextDraw+=Math.max(1,Math.floor((due-nextDraw)/interval)+1)*interval;
    try{window.draw?.();}catch(e){
      console.error('Digital Rain renderer error',e);
      // A transient graphics failure should not keep hammering the GPU.
      desiredFPS=5;
    }
  }
  let started=false;
  function start(){
    if(started)return;
    started=true;
    const {w,h}=screenSize();
    window.windowWidth=w;window.windowHeight=h;
    try{window.setup?.();requestAnimationFrame(tick);}catch(err){
      console.error('Digital Rain Canvas startup failed',err);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}

/*
  DIGITAL RAIN // SIGNAL ENGINE v16
  Ordered classic scripts; native Canvas rendering on every device.

  Not scrolling text: glyphs are born, age and extinguish in stationary cells.
  One physical horizontal lane per stream depth. Each stream has its own speed;
  birth spacing prevents faster followers from catching slower trails.

  One global capture-phase shortcut dispatcher, independent of UI focus.
  Space pause   F fullscreen   R reseed   G glow   C cycle signal profile
  Frame edition: controls in frame.js; no audio shortcuts.
  T film texture   S settings   Esc close settings   V rain/tunnel   1/2/3 CRT
  + / - density   Wheel / pinch: zoom. Mobile swipe: horizontal pan.
  Click / touch to ripple (SHIFT + click: stronger)
*/

// Cap the backing raster to 800px wide on low-power frame hardware.
function frameCanvasSize() {
  const cssW=Math.max(1,document.documentElement.clientWidth||innerWidth);
  const cssH=Math.max(1,innerHeight||document.documentElement.clientHeight);
  const scale=Math.min(1,800/cssW);
  return {w:Math.round(cssW*scale),h:Math.round(cssH*scale)};
}

const HALF_KATAKANA = 'ﾊﾋｼﾂｳｰﾅﾐﾓﾆｻﾜｵﾘﾎﾏｴｷﾑﾃｹﾒｶﾕﾗｾﾈｽﾀﾇ';
const GLYPHS = [
  ...[...HALF_KATAKANA].map(char => ({ char, flipX: true, flipY: false })),
  { char: '日', flipX: false, flipY: false },
  ...[...'0123456789'].map(char => ({ char, flipX: '259'.includes(char), flipY: '36'.includes(char) })),
  ...[...'Z*+:=.<>"¦_|'].map(char => ({ char, flipX: false, flipY: false })),
];

// The original effect was never a uniform phosphor-green. It's nearly black
// at the tail, clear green near the head, and occasionally porcelain white.
// Deliberately wide looks: near-monochrome green, submerged cyan, and
// aggressive chartreuse. Tonality, depth attenuation, and halos all change.
const GRADES = {
  cinema: {
    name: 'SOURCE', bg: [0, 3, 1], alpha: 1, heads: 1,
    ink: [[1,12,4],[2,23,8],[3,39,13],[5,62,19],[8,91,28],
      [13,128,39],[27,168,58],[62,213,96],[144,248,166],[240,255,244]],
    halo: ['rgba(227,255,225,.59)','rgba(55,255,92,.34)','rgba(8,139,43,.10)'],
  },
  abyss: {
    name: 'DEEP', bg: [0, 5, 9], alpha: .78, heads: .43,
    ink: [[1,10,16],[2,16,24],[2,24,35],[3,35,45],[4,50,65],
      [6,72,87],[12,104,117],[28,148,157],[78,195,200],[175,228,222]],
    halo: ['rgba(154,230,229,.29)','rgba(33,176,191,.22)','rgba(3,85,109,.11)'],
  },
  anomaly: {
    name: 'ANOMALY', bg: [7, 0, 5], alpha: .97, heads: 1,
    ink: [[19,0,9],[35,1,17],[59,2,29],[89,3,42],[127,8,64],
      [171,24,91],[218,48,117],[245,100,155],[255,174,216],[255,240,252]],
    halo: ['rgba(255,206,233,.72)','rgba(252,46,113,.45)','rgba(147,2,65,.15)'],
  },
  voltage: {
    name: 'OVERDRIVE', bg: [2, 4, 0], alpha: 1, heads: 1,
    ink: [[7,19,0],[14,34,0],[24,52,1],[37,78,0],[61,111,1],
      [96,153,4],[140,195,8],[188,229,36],[227,253,97],[255,255,208]],
    halo: ['rgba(242,255,188,.82)','rgba(173,255,22,.49)','rgba(77,164,4,.19)'],
  },
};
const GRADE_NAMES = Object.keys(GRADES);

// Profiles load editable code presets into the controls.
// Cadence and trail breaks remain profile-specific on the existing lanes.
const SIGNAL_MOTION = {
  cinema: { density: 1.05, persistence: 1.25, speed: 1, mutation: 1, glow: 1, cadence: .075, rhythm: 1, blanks: .055 },
  abyss: { density: .75, persistence: 1.25, speed: .64, mutation: .55, glow: .42, cadence: .035, rhythm: .6, blanks: .025 },
  voltage: { density: 1.4, persistence: .85, speed: 1.42, mutation: 1.6, glow: 1.75, cadence: .12, rhythm: 1.7, blanks: .035 },
  anomaly: { density: 1.2, persistence: .65, speed: 1.05, mutation: 1.85, glow: .85, cadence: .48, rhythm: 2.4, blanks: .14 },
};

// Exclusive 22px global lanes; each lane gets one of these treatments.
// The size differences create visual depth without letting planes interpenetrate.
const DEPTHS = [
  { size: 12, advanceMin: 4.1, advanceMax: 8.5, lengthMin: 17, lengthMax: 33,
    ink: 5, alpha: .77, bloom: .18, headChance: .26 },
  { size: 16, advanceMin: 6.2, advanceMax: 12.5, lengthMin: 17, lengthMax: 40,
    ink: 8, alpha: .92, bloom: .52, headChance: .58 },
  { size: 19, advanceMin: 9.1, advanceMax: 18.2, lengthMin: 15, lengthMax: 36,
    ink: 9, alpha: 1, bloom: 1, headChance: .8 },
];

// Bounds, defaults and display values share one definition with the controls.
const percent = value => Math.round(value*100)+'%';
const numberSetting = (value,min,max,step,visual=false) =>
  Object.freeze({type:'number',default:value,min,max,step,format:percent,visual});
const booleanSetting = (value,visual=false) => Object.freeze({type:'boolean',default:value,visual});
const choiceSetting = (value,choices,visual=false) =>
  Object.freeze({type:'enum',default:value,choices:Object.freeze(choices),visual});
const SETTINGS = Object.freeze({
  mode:choiceSetting('rain',['rain','tunnel'],true),
  density:numberSetting(.75,.3,1.65,.05,true),
  zoom:numberSetting(1,.65,2,.01,true),
  speed:numberSetting(1,.2,2.4,.01),
  persistence:numberSetting(1.25,.55,1.55,.05,true),
  mutation:numberSetting(1,.25,2.5,.05),
  glow:numberSetting(1,0,1.8,.01,true),
  bloom:booleanSetting(true,true),
  grain:numberSetting(0,0,1.5,.05,true),
  grade:choiceSetting('cinema',[...GRADE_NAMES],true),
  crt:choiceSetting('scan',['off','scan'],true),
  curvature:numberSetting(1,0,2,.05,true),
  scanStrength:numberSetting(.85,.15,1,.05,true),
  scanBrightness:numberSetting(1,.6,1.75,.05,true),
  showFPS:booleanSetting(false),
  unlockMobileFPS:booleanSetting(false),
  paused:booleanSetting(false,true),
});
const defaults = Object.freeze(Object.fromEntries(Object.entries(SETTINGS).map(([key,spec])=>[key,spec.default])));
const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let pauseChosen = false;
const rain = {...defaults,paused:!!motionPreference?.matches};
const applyMotionPreference = () => {
  if(!pauseChosen) setRainOption('paused',!!motionPreference?.matches,{userChoice:false});
};
if(motionPreference?.addEventListener)motionPreference.addEventListener('change',applyMotionPreference);
else motionPreference?.addListener?.(applyMotionPreference);
let planes = [];
let glows = {};
let vignette;
let filmTile;
let filmData;
let filmPattern;
let pulses = [];
let pulseSeq = 0;
let signalAt = -Infinity;
let viewport = null;
let worldWidth = 0, worldHeight = 0;
let worldMinX = 0, worldMinY = 0;
const LANE_PITCH = Math.max(22.5, Math.ceil(19 * 1.16) + 1);
const worldCenterX = () => worldMinX + worldWidth/2;
const worldCenterY = () => worldMinY + worldHeight/2;
let cameraPanX = 0; // World-space horizontal camera displacement, bounded to the simulated field.
let renderDirty = true;
function invalidateRender() { renderDirty = true; }
let nativeGesturesInstalled = false;
const mobileInput = () => {
  // Touch-capable desktops still have a fine primary pointer. Browsers can
  // report their touchscreen differently; touch support alone
  // must not select the 30 FPS / Canvas CRT path on a mouse-driven desktop.
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const fine = window.matchMedia?.('(pointer: fine)')?.matches;
  return !!(coarse || (!fine && navigator.maxTouchPoints > 0));
};
const ZOOM_MAX = SETTINGS.zoom.max;
function updateFrameRate() {
  frameRate(24);
}
let hover = { x: -999, y: -999, at: -Infinity };
let simulationTime = 0;
let lastRealTime = 0;
let lastClickTime = -Infinity;
let frameNumber = 0;
let breachAt = -Infinity;
const BREACH_DURATION = 3200;
let renderedFrames = 0;
let tunnelTravel = 0;
let tunnelSeed = Math.random()*1000;
let tunnelLanes = [];
const tunnelRows = new Map();
let displayEngine;
let nextGrainFrame = 0;
const ZOOM_MIN = SETTINGS.zoom.min;
function clampZoom(value) { return Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,value)); }
function cameraMaxPan() { return Math.max(0,(worldWidth-width/rain.zoom)*.5); }
function setCameraPan(x) {
  const max=cameraMaxPan();
  const next=Math.max(-max,Math.min(max,x));
  if(Math.abs(next-cameraPanX)<.0001)return;
  cameraPanX=next;
  invalidateRender();
}
function zoomRain(value) {
  setRainOption('zoom',clampZoom(value));
}
function worldViewport() {
  const f=rain.zoom;
  const centerX=worldCenterX()+cameraPanX;
  return {
    minX:centerX - width/2/f, maxX:centerX + width/2/f,
    minY:worldCenterY() - height/2/f, maxY:worldCenterY() + height/2/f,
  };
}
function screenToWorld(x,y) {
  return { x:worldCenterX()+cameraPanX+(x-width/2)/rain.zoom,
           y:worldCenterY()+(y-height/2)/rain.zoom };
}
// Pulses propagate in VIEWPORT pixels, not world cells. This is critical:
// zoom must change glyph magnification, NOT ripple radius or velocity.
function worldToScreen(x,y) {
  return {x:width*.5+(x-worldCenterX()-cameraPanX)*rain.zoom,
          y:height*.5+(y-worldCenterY())*rain.zoom};
}


// One native pointer path on both desktop and mobile. We wait for touch-up
// before emitting a ripple, so a pan or pinch never triggers a false click.
function installRainGestures(target) {
  if(nativeGesturesInstalled)return;
  nativeGesturesInstalled=true;
  const active=new Map();
  let drag=null, pinch=null, suppressTap=false;
  const point=e=>{
    const r=target.getBoundingClientRect();
    return {x:(e.clientX-r.left)*width/Math.max(1,r.width),
            y:(e.clientY-r.top)*height/Math.max(1,r.height)};
  };
  const getPair=()=>Array.from(active.values()).slice(0,2);
  const startPinch=()=>{
    if(active.size<2)return;
    const [a,b]=getPair();
    const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
    pinch={distance:Math.max(12,Math.hypot(a.x-b.x,a.y-b.y)),
      zoom:rain.zoom, anchorX:(()=>{const source=visibleToSource(midX,midY);return screenToWorld(source.x,source.y).x;})()};
    drag=null;suppressTap=true;
  };
  target.style.touchAction='none';
  target.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse') {
      if(e.button!==0 || rain.paused)return;
      const pt=point(e);
      if(pt.x>=0&&pt.x<=width&&pt.y>=0&&pt.y<=height)
        addPulse(pt.x,pt.y,e.shiftKey?3.25:1);
      return;
    }
    if(e.pointerType!=='touch' && e.pointerType!=='pen')return;
    e.preventDefault();
    const pt=point(e);
    active.set(e.pointerId,{...pt,startX:pt.x,startY:pt.y,moved:false});
    try{target.setPointerCapture(e.pointerId);}catch(_e){}
    if(active.size===1){
      drag={id:e.pointerId,startX:pt.x,panX:cameraPanX};
      suppressTap=false;
    }else startPinch();
  },{passive:false});
  target.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse' && !active.has(e.pointerId)) {
      if(rain.paused)return;
      const pt=point(e);
      if(pt.x>=0&&pt.x<=width&&pt.y>=0&&pt.y<=height) {
        const source=visibleToSource(pt.x,pt.y);
        const where=screenToWorld(source.x,source.y);
        hover={x:where.x,y:where.y,at:simulationTime};
        invalidateRender();
      }
      return;
    }
    if(!active.has(e.pointerId))return;
    e.preventDefault();
    const current=active.get(e.pointerId),pt=point(e);
    current.x=pt.x;current.y=pt.y;
    if(Math.hypot(pt.x-current.startX,pt.y-current.startY)>9)current.moved=true;
    if(active.size>=2){
      if(!pinch)startPinch();
      const [a,b]=getPair();
      const distance=Math.max(12,Math.hypot(a.x-b.x,a.y-b.y));
      const midX=(a.x+b.x)/2;
      const next=clampZoom(pinch.zoom*distance/pinch.distance);
      zoomRain(next);
      // Keep the code under the midpoint of the fingers stationary in X.
      const source=visibleToSource(midX,(a.y+b.y)/2);
      setCameraPan(pinch.anchorX-worldCenterX()-(source.x-width/2)/rain.zoom);
    }else if(drag&&drag.id===e.pointerId){
      if(!current.moved)return;
      suppressTap=true;
      setCameraPan(drag.panX-(pt.x-drag.startX)/rain.zoom);
    }
  },{passive:false});
  const finish=(e,cancel)=>{
    const current=active.get(e.pointerId);
    if(!current)return;
    if(e.pointerType==='touch')e.preventDefault();
    active.delete(e.pointerId);
    // A second finger lifting must never count as a tap on the first.
    const wasPinching=!!pinch;
    if(active.size<2)pinch=null;
    if(active.size===1){
      const [id,p]=active.entries().next().value;
      drag={id,startX:p.x,panX:cameraPanX};
      suppressTap=true;
    }else if(active.size===0){
      if(!cancel&&!wasPinching&&!suppressTap&&!current.moved){
        const pt=point(e);
        if(pt.x>=0&&pt.x<=width&&pt.y>=0&&pt.y<=height)
          addPulse(pt.x,pt.y,1);
      }
      drag=null;suppressTap=false;
    }
  };
  target.addEventListener('pointerleave',e=>{
    if(e.pointerType==='mouse' && !rain.paused){hover={x:-999,y:-999,at:-Infinity};invalidateRender();}
  });
  target.addEventListener('pointerup',e=>finish(e,false),{passive:false});
  target.addEventListener('pointercancel',e=>finish(e,true),{passive:false});
  target.addEventListener('lostpointercapture',e=>{
    if(active.has(e.pointerId))finish(e,true);
  });
  target.addEventListener('wheel',e=>{
    if(e.ctrlKey) { // Browser/trackpad pinch events express zoom as ctrl+wheel.
      e.preventDefault();
    } else e.preventDefault();
    const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?width:1);
    const sensitivity=e.ctrlKey ? .0017 : .001;
    zoomRain(rain.zoom*Math.exp(-Math.max(-260,Math.min(260,delta))*sensitivity));
  },{passive:false});
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  updateFrameRate();
  const mount = document.getElementById('rain');
  if (mount) canvas.parent(mount);
  installRainGestures(mount || canvas.elt);
  lastRealTime = millis();
  buildScene();
  displayEngine = new CRTDisplay(canvas.elt);
  displayEngine.setMode(rain.crt);
  // The optional film font downloads after the scene initializes. Rebuilding the
  // glyph atlases (only) switches the glyphs without resetting animation.
  if (document.fonts?.ready) document.fonts.ready.then(() => {
    for (const plane of planes) plane.buildAtlas();
    invalidateRender();
  });
}

function buildScene() {
  for (const plane of planes) plane.dispose();
  for (const resource of Object.values(glows)) resource.remove?.();
  vignette?.remove?.();

  buildLighting();
  vignette = buildVignette();
  if (!filmTile) filmTile = buildFilmTile();
  filmPattern = drawingContext.createPattern(filmTile, 'repeat');

  // A persistent overscanned world. The slider changes ONLY the camera's
  // scale about the exact screen centre; it never destroys/reseeds streams.
  // Mobile gets real off-screen horizontal territory to explore. Desktop
  // retains the smaller overscan and its established performance profile.
  worldWidth = Math.ceil(width * (mobileInput()?2.70:1/ZOOM_MIN));
  worldHeight = Math.ceil(height / ZOOM_MIN);
  worldMinX=0;worldMinY=0;
  cameraPanX=0;
  invalidateRender();
  const lanePitch = LANE_PITCH;
  const laneCount = Math.ceil(worldWidth / lanePitch) + 2;
  const columns = DEPTHS.map(() => []);
  for (let col = -1; col < laneCount; col++) {
    const roll = Math.random();
    const depth = roll < .21 ? 0 : roll < .74 ? 1 : 2;
    columns[depth].push(col);
  }
  planes = DEPTHS.map((config, depth) => new CodePlane({
    ...config, size: config.size
  }, depth, columns[depth], lanePitch));
  pulses = [];
  tunnelTravel = 0;
  tunnelSeed = Math.random()*1000;
  tunnelLanes = [];
  tunnelRows.clear();
  signalAt = -Infinity;
  breachAt = -Infinity;
  background(...GRADES[rain.grade].bg);
}

function draw() {
  const now = millis();
  const dt = Math.max(0,Math.min((now-lastRealTime)/1000,.055));
  lastRealTime=now; // Pause never accumulates movement to catch up later.
  if(document.hidden || (rain.paused && !renderDirty))return;
  if(!rain.paused && dt>0)updateSimulation(dt);
  renderDirty=false;
  renderScene();
}
function updateSimulation(dt) {
  simulationTime+=dt*1000;
  frameNumber++;
  if(rain.grain>0 && frameNumber>=nextGrainFrame) {
    buildFilmTile(filmTile);
    nextGrainFrame=frameNumber+3;
  }
  const t=simulationTime;
  pulses=pulses.filter(p=>t-p.at<1550);
  if(rain.mode==='tunnel') {
    const beat=tunnelBeat();
    const surge=Math.max(0,1-(t-signalAt)/1950);
    tunnelTravel+=dt*rain.speed*(13.5+beat*9+surge*14);
  } else {
    viewport=worldViewport();
    for(const plane of planes)plane.update(dt,t);
  }
}
function renderScene() {
  const t=simulationTime;
  const grade = GRADES[rain.grade];
  background(...grade.bg);
  const ctx = drawingContext;

  if(rain.mode==='tunnel') renderTunnel(ctx,t);
  else {
  viewport = worldViewport();
  ctx.save();
  // Camera zoom is centred in both axes, with no random realignment.
  ctx.translate(width*.5, height*.5);
  ctx.scale(rain.zoom, rain.zoom);
  ctx.translate(-worldCenterX()-cameraPanX, -worldCenterY());
  if (rain.bloom && rain.glow > 0) {
    for (const plane of planes) plane.drawBloom(ctx, t);
  }
  for (const plane of planes) plane.drawGlyphs(ctx, t);
  ctx.restore();
  }
  // A restrained, brief source-point bloom makes the origin legible even
  // if the pointer falls between two glyph lanes. CRT will bend it naturally.
  for (const pulse of pulses) {
    const elapsed=(t-pulse.at)/1000;
    if(elapsed<0 || elapsed>.32)continue;
    const strength=Math.pow(1-elapsed/.32,2)*(pulse.power>2?.23:.13);
    const radius=pulse.power>2?74:52;
    const glow=ctx.createRadialGradient(pulse.x,pulse.y,0,pulse.x,pulse.y,radius);
    const rgb=rain.grade==='anomaly'?'255,76,155':rain.grade==='abyss'?'78,206,218':
      rain.grade==='voltage'?'201,255,66':'95,255,144';
    glow.addColorStop(0,`rgba(${rgb},${strength})`);
    glow.addColorStop(.34,`rgba(${rgb},${strength*.25})`);
    glow.addColorStop(1,`rgba(${rgb},0)`);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=glow;
    ctx.fillRect(pulse.x-radius,pulse.y-radius,radius*2,radius*2);
    ctx.restore();
  }
  // Full-screen hard dropout: unlike E, the entire signal briefly dies.
  const breachAge = t - breachAt;
  if (breachAge >= 0 && breachAge < 220) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.85)';
    ctx.fillRect(0,0,width,height);
  }

  ctx.globalAlpha = 1;
  ctx.drawImage(vignette.canvas, 0, 0, width, height);
  if (rain.grain>0 && filmPattern) {
    ctx.globalAlpha = .54 * rain.grain;
    ctx.fillStyle = filmPattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
  displayEngine?.present(drawingContext.canvas);
  renderedFrames++;
}

// A moving lattice in world Z, rather than rescaled concentric screen rings.
// Every row retains its identity as it approaches, passes the camera and exits.
function tunnelBeat() { return 0; }
function tunnelCurve(s) {
  return {x:2.4*Math.sin(s*.065)+1.1*Math.sin(s*.137),
    y:1.9*Math.sin(s*.081)+.7*Math.cos(s*.153)};
}
function tunnelSection(z,beat=0,frame=null) {
  const s=tunnelTravel, origin=frame?.origin||tunnelCurve(s), ahead=tunnelCurve(s+z);
  const roll=frame?.roll??(.32*Math.sin(s*.047)+.16*Math.sin(s*.093));
  const x=ahead.x-origin.x, y=ahead.y-origin.y;
  const cr=frame?.cr??Math.cos(roll),sr=frame?.sr??Math.sin(roll);
  return {x:x*cr-y*sr,y:x*sr+y*cr,
    twist:(s+z)*.065+roll,
    radius:3.15*(1+.065*Math.sin((s+z)*.22)+beat*.12*Math.sin(z*.8-s*.5)),
    scale:Math.min(width,height)*.88*rain.zoom/z};
}
function tunnelHash(row,lane) {
  const n=Math.sin(row*127.1+lane*311.7+tunnelSeed)*43758.5453;
  return n-Math.floor(n);
}
function tunnelRow(row) {
  let cached=tunnelRows.get(row);
  if(cached)return cached;
  const cells=new Float64Array(96),glyphs=new Uint8Array(96);
  const mutationRows=new Float64Array(96);
  mutationRows.fill(-Infinity);
  for(let lane=0;lane<96;lane++)cells[lane]=tunnelHash(row,lane);
  cached={cells,glyphs,mutationRows};
  tunnelRows.set(row,cached);
  // Cache by wall row, not by mutation row: mutation offsets diverge over
  // long sessions. Each cell retains only its latest glyph lookup.
  if(tunnelRows.size>256)tunnelRows.delete(tunnelRows.keys().next().value);
  return cached;
}
// Both modes light the occupied code with the same broad screen-space wave.
function rippleGlowCharge(x,y,now) {
  let charge=0;
  for(const pulse of pulses) {
    const elapsed=(now-pulse.at)/1000;
    if(elapsed<0)continue;
    const ring=Math.abs(Math.hypot(x-pulse.x,y-pulse.y)-elapsed*780);
    charge+=Math.max(0,1-ring/65)*pulse.power;
  }
  return charge;
}
function renderTunnel(ctx,now) {
  const atlas=planes[2];
  if(!atlas)return;
  const beat=tunnelBeat(), step=.8, far=32;
  const lanes=28; // Bound rotated-sprite work on the Allwinner frame.
  const first=Math.floor(tunnelTravel/step);
  const count=Math.ceil(far/step);
  const grade=GRADES[rain.grade];
  const surgeAge=now-signalAt;
  const breach=breachRupture(now);
  const centerX=width*.5-cameraPanX*.12,centerY=height*.5;
  const source=atlas.atlas.canvas;
  if(tunnelLanes.length!==lanes) {
    tunnelLanes=[];
    for(let lane=0;lane<lanes;lane++) {
      const seed=tunnelHash(0,lane),angle=lane/lanes*Math.PI*2;
      tunnelLanes.push({lane,seed,period:37+Math.floor(seed*19),
        cos:Math.cos(angle),sin:Math.sin(angle),head:0,length:0});
    }
  }
  const active=[];
  const density=Math.min(1,.65+rain.density*.30);
  for(let lane=0;lane<lanes;lane++) {
    const track=tunnelLanes[lane],{seed,period}=track;
    if(seed>density)continue;
    track.head=now*.001*rain.speed*(3+seed*5)+seed*period;
    track.length=Math.min(period-3,(22+seed*18)*rain.persistence);
    active.push(track);
  }
  const origin=tunnelCurve(tunnelTravel);
  const roll=.32*Math.sin(tunnelTravel*.047)+.16*Math.sin(tunnelTravel*.093);
  const cr=Math.cos(roll),sr=Math.sin(roll);
  const frame={origin,roll,cr,sr};
  const blanks=SIGNAL_MOTION[rain.grade].blanks;
  const mutation=now*.001*rain.mutation;
  ctx.save();
  // Painter's order also keeps near phosphor heads on top of distant trails.
  for(let i=count;i>=1;i--) {
    const row=first+i,z=row*step-tunnelTravel;
    if(z<.85||z>far)continue;
    const section=tunnelSection(z,beat,frame);
    const beatBand=beat*(.4+.6*(.5+.5*Math.sin(z*.9-now*.009)));
    const fog=Math.pow(Math.max(0,1-z/far),.65);
    const entrance=Math.min(1,(z-.85)/.9);
    const glyphSize=Math.min(110,section.scale*.22);
    if(glyphSize<1.3)continue;
    const ct=Math.cos(section.twist),st=Math.sin(section.twist);
    const cached=tunnelRow(row);
    for(const track of active) {
      const {lane,period,head,length}=track;
      // Independent falling streams run along the tube, each with a bright
      // leading cell, a fading tail and dark clearance before the next train.
      const age=((head-row)%period+period)%period;
      if(age>length)continue;
      const cell=cached.cells[lane];
      if(cell<blanks && age>2)continue;
      const cos=track.cos*ct-track.sin*st,sin=track.sin*ct+track.cos*st;
      let x=centerX+(section.x+cos*section.radius)*section.scale;
      let y=centerY+(section.y+sin*section.radius)*section.scale;
      if(x<-glyphSize*2||x>width+glyphSize*2||y<-glyphSize*2||y>height+glyphSize*2)continue;
      let charge=rippleGlowCharge(x,y,now);
      if(surgeAge>=0 && surgeAge<1950)
        charge+=2*Math.max(0,1-Math.abs(z-(surgeAge/1950)*far)/4);
      if(breach) {
        const world=screenToWorld(x,y);
        const fragment=breachFragment(world.x,world.y,breach);
        x+=fragment.dx*rain.zoom;y+=fragment.dy*rain.zoom;
      }
      const headCell=age<1.5;
      const intensity=Math.pow(Math.max(0,1-age/length),1.25);
      const ink=Math.min(9,Math.max(1,Math.round(3+intensity*4+beatBand*3.2+charge*3)));
      const mutationRow=row+Math.floor(mutation*(.3+cell));
      if(cached.mutationRows[lane]!==mutationRow) {
        cached.glyphs[lane]=Math.floor(tunnelHash(mutationRow,lane+19)*GLYPHS.length);
        cached.mutationRows[lane]=mutationRow;
      }
      const glyph=cached.glyphs[lane];
      const opacity=Math.min(1,fog*entrance*grade.alpha*(.4+intensity*.6+beatBand*.25));
      if(rain.bloom && rain.glow>0 && (headCell||charge>.3||(beatBand>.3&&cell>.8))) {

        ctx.globalAlpha=Math.min(.8,opacity*rain.glow*(.3+beatBand*.5+charge*.15));
        const halo=glyphSize*(2.1+beatBand*.65);
        ctx.drawImage(glows.halo.canvas,x-halo,y-halo,halo*2,halo*2);
      }
      ctx.globalAlpha=opacity;
      // Upright sprites preserve the projected tunnel without per-glyph transforms.
      ctx.drawImage(source,glyph*atlas.sourceW,(headCell?9:ink)*atlas.sourceH,
        atlas.sourceW,atlas.sourceH,x-glyphSize*.5,y-glyphSize*.62,glyphSize,glyphSize*1.24);
    }
  }
  ctx.restore();
  ctx.globalAlpha=1;
}

function pulseInfluence(pulse,x,y,now) {
  const elapsed=(now-pulse.at)/1000;
  const source=worldToScreen(x,y);
  const distance=Math.hypot(source.x-pulse.x,source.y-pulse.y);
  const ring=Math.abs(distance-elapsed*780);
  const echo=Math.abs(distance-Math.max(0,elapsed-.105)*570);
  const origin=Math.max(0,1-distance/(pulse.power>2?112:72))*Math.max(0,1-elapsed/.30);
  const strength=Math.max(0,1-ring/(pulse.power>2?57:43))+Math.max(0,1-echo/32)*.36+origin*1.5;
  return {ring,strength};
}

class CodePlane {
  constructor(config, depth, columns, pitch) {
    this.config = config;
    this.depth = depth;
    this.lineHeight = Math.round(config.size * 1.19);
    this.rows = Math.ceil(worldHeight / this.lineHeight) + 2;
    this.minRow = 0;
    this.buildAtlas();
    this.lanes = columns.map(column => new CodeLane(this, column, pitch));
  }

  buildAtlas() {
    // A 2x source atlas produces high-quality edges on ordinary 1x canvas
    // without multiplying every framebuffer pixel on a Retina / 4K screen.
    const scale = mobileInput() ? 1.5 : 2;
    const count = GRADES[rain.grade].ink.length;
    this.tileW = Math.ceil(this.config.size * 1.16);
    this.tileH = Math.ceil(this.lineHeight * 1.15);
    this.sourceW = this.tileW * scale;
    this.sourceH = this.tileH * scale;
    this.atlas?.remove?.();
    const g = createGraphics(this.sourceW * GLYPHS.length, this.sourceH * count);
    g.pixelDensity(1);
    g.clear();
    const ctx = g.drawingContext;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${this.config.size * scale}px "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif`;
    for (let ink = 0; ink < count; ink++) {
      const [r, gCol, b] = GRADES[rain.grade].ink[ink];
      ctx.fillStyle = `rgb(${r},${gCol},${b})`;
      for (let i = 0; i < GLYPHS.length; i++) {
        const glyph = GLYPHS[i];
        ctx.save();
        ctx.translate(i * this.sourceW + this.sourceW/2,
                      ink * this.sourceH + this.sourceH/2);
        if (glyph.flipX) ctx.scale(-1, 1);
        if (glyph.flipY) ctx.scale(1, -1);
        ctx.fillText(glyph.char, 0, -this.config.size * .04 * scale);
        ctx.restore();
      }
    }
    this.atlas = g;
  }

  dispose() { this.atlas?.remove?.(); }
  update(dt, now) {
    for(const lane of this.lanes)lane.update(dt,now);
    this.updateCells(now);
  }
  updateCells(now) {
    const view=worldViewport();
    const breachAge=now-breachAt;
    const breachOn=breachAge>=0 && breachAge<BREACH_DURATION;
    const surgeAge=now-signalAt;
    const surgeOn=surgeAge>=0 && surgeAge<1950;
    // Keep the original viewport culling cost. Newly revealed cells update
    // when time advances, never merely because a paused camera moves.
    for(const lane of this.lanes) {
      if(!lane.active)continue;
      const x=lane.x;
      if(x<view.minX-this.tileW||x>view.maxX+this.tileW)continue;
      const front=surgeOn?surgeFront(x,surgeAge):0;
      for(const stream of lane.streams)for(const [row,cell] of stream.cells) {
        const age=stream.head-row;
        const y=(row+.5)*this.lineHeight;
        if(age<0||age>=stream.length||row<this.minRow||row>=this.rows)continue;
        if(y<view.minY-this.tileH||y>view.maxY+this.tileH)continue;
        if(cell.blank&&age>4)continue;
        if(now>=cell.nextChange) {
          cell.glyph=randomGlyph();
          cell.nextChange=now+between(380,3700)/rain.mutation;
        }
        if(now>=cell.nextTwinkle) {
          cell.twinkleUntil=now+between(40,160);
          cell.nextTwinkle=now+between(1600,6300);
        }
        if(breachOn) {
          const pass=breachAge<250?-1:breachAge<640?0:breachAge<1180?1:breachAge<1800?2:3;
          const marker=breachAt+':'+pass;
          if(pass>=0&&cell.lastBreach!==marker) {
            cell.lastBreach=marker;
            if(Math.random()<.83)cell.glyph=randomGlyph();
          }
        }
        for(const pulse of pulses) {
          const {ring,strength}=pulseInfluence(pulse,x,y,now);
          if(strength>0&&ring<21&&!cell.pulseIds.includes(pulse.id)) {
            // Several fronts can cross one cell together. A single last-id
            // marker lets them overwrite each other and reapply every frame.
            // Keep only active pulse ownership, bounded by the four-pulse cap.
            cell.pulseIds=cell.pulseIds.filter(id=>pulses.some(active=>active.id===id));
            cell.pulseIds.push(pulse.id);
            if(Math.random()<.5)cell.glyph=randomGlyph();
            cell.twinkleUntil=now+130;
          }
        }
        if(surgeOn&&Math.abs(y-front)<21&&cell.lastSurge!==signalAt) {
          cell.lastSurge=signalAt;
          if(Math.random()<.89)cell.glyph=randomGlyph();
          cell.twinkleUntil=now+380;
        }
      }
    }
  }
  updateDensity() { for (const lane of this.lanes) lane.updateDensity(); }

  drawBloom(ctx, now) {
    const c = this.config;
    const scale = c.size;
    const rupture = breachRupture(now);
    const beat = 0;
    const strength = rain.glow * c.bloom * (1 + beat*.9) * (rupture ? .25 : 1);
    const surgeAge = now - signalAt;
    const surgeOn = surgeAge>=0 && surgeAge<1950;
    for (const lane of this.lanes) {
      if (!lane.active) continue;
      if(!rupture && (lane.x<viewport.minX-50 || lane.x>viewport.maxX+50))continue;
      for (const stream of lane.streams) {
        if (!stream.whiteHead || stream.head < this.minRow || stream.head >= stream.endRow) continue;
        const sourceY = (stream.head + .5) * this.lineHeight;
        const fracture = rupture ? breachFragment(lane.x, sourceY, rupture) : null;
        const x = lane.x + (fracture?.dx || 0);
        const y = sourceY + (fracture?.dy || 0);
        if (x < viewport.minX-50 || x > viewport.maxX+50 ||
            y < viewport.minY-50 || y > viewport.maxY+50) continue;
        const haloR = scale * 3.1;
        const charge = surgeOn ? Math.max(0,1-Math.abs(y-surgeFront(x,surgeAge))/210) : 0;
        ctx.globalAlpha = Math.min(1, strength * stream.glow * (1+.65*charge));
        ctx.drawImage(glows.halo.canvas,
          x - haloR, y - haloR, haloR*2, haloR*2);
        ctx.globalAlpha = Math.min(1, strength * .63 * stream.glow * (1+.9*charge));
        ctx.drawImage(glows.column.canvas,
          x - scale*.79, y - scale*6.7, scale*1.58, scale*7.2);
      }
    }
    // Illuminate entire trails as the ripple crosses, not only their heads.
    // Halos are drawn before glyphs so the wave never softens the code itself.
    if(pulses.length) {
      for(const lane of this.lanes) {
        if(!lane.active || lane.x<viewport.minX-this.tileW || lane.x>viewport.maxX+this.tileW)continue;
        for(const stream of lane.streams)for(const [row,cell] of stream.cells) {
          const age=stream.head-row;
          if(age<0 || age>=stream.length || row<this.minRow || row>=this.rows || (cell.blank&&age>4))continue;
          const sourceY=(row+.5)*this.lineHeight;
          if(sourceY<viewport.minY-this.tileH || sourceY>viewport.maxY+this.tileH)continue;
          const fracture=rupture?breachFragment(lane.x,sourceY,rupture):null;
          const x=lane.x+(fracture?.dx||0),y=sourceY+(fracture?.dy||0);
          const screen=worldToScreen(x,y);
          const charge=rippleGlowCharge(screen.x,screen.y,now);
          if(charge<=.01)continue;
          const halo=this.tileW*2.1;
          ctx.globalAlpha=Math.min(.8,rain.glow*c.alpha*GRADES[rain.grade].alpha*
            (.45+.55*c.bloom)*(.3+charge*.15)*Math.min(1,charge/.3));
          ctx.drawImage(glows.halo.canvas,x-halo,y-halo,halo*2,halo*2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawGlyphs(ctx, now) {
    const c = this.config;
    const src = this.atlas.canvas;
    const sw = this.sourceW;
    const sh = this.sourceH;
    const tw = this.tileW;
    const th = this.tileH;
    const lineHeight = this.lineHeight;
    const falloffPower = 1.5 / rain.persistence;
    const pulseCount = pulses.length;
    const surgeAge = now - signalAt;
    const surgeOn = surgeAge >= 0 && surgeAge < 1950;
    const hoverAge = now - hover.at;
    const hoverOn = hoverAge < 950;
    const grade = GRADES[rain.grade];
    const breachAge = now - breachAt;
    const breachOn = breachAge >= 0 && breachAge < BREACH_DURATION;
    const rupture = breachRupture(now);
    const blanking = breachOn && breachAge < 220 ? .12 : 1;
    const jolt = breachOn && breachAge >= 220 && breachAge < 640;

    ctx.globalAlpha = c.alpha * grade.alpha * blanking;
    for (const lane of this.lanes) {
      if (!lane.active) continue;
      const x = lane.x;
      if (x < viewport.minX-tw || x > viewport.maxX+tw) continue;
      const front = surgeOn ? surgeFront(x, surgeAge) : 0;
      for (const stream of lane.streams) {
        for (const [row, cell] of stream.cells) {
          const age = stream.head - row;
          if (age < 0 || age >= stream.length || row < this.minRow || row >= this.rows) continue;
          const y = (row + .5)*lineHeight;
          if (y < viewport.minY-th || y > viewport.maxY+th) continue;
          if (cell.blank && age > 4) continue;

          const fraction = 1 - age/stream.length;
          const falloff = Math.pow(fraction, falloffPower);
          let tone = Math.floor((.2 + 8.8*falloff) * cell.energy);
          if (age === 0) tone = stream.whiteHead && (grade.heads >= 1 || lane.lottery < grade.heads) ? 9 : 7;
          else if (age === 1 && stream.whiteHead) tone = Math.max(tone, 7);
          else if (age === 2 && stream.whiteHead) tone = Math.max(tone, 6);
          if (now < cell.twinkleUntil && age > 2) tone += 2;
          // After the opening dropout/jolt, the field physically fractures.
          // Only owned glyphs move; rendering never changes stream state.
          const fracture = rupture ? breachFragment(x, y, rupture) : null;
          if (breachOn) {
            if (jolt) tone = 9;
            else if (fracture) {
              tone = Math.max(0, tone - Math.round(3*fracture.amount));
              if (fracture.edge) tone = Math.max(tone, 8);
              if (fracture.relock) tone = 9;
            }
          }

          // Two nested wavefronts illuminate the current occupied cells.
          for (let p = 0; p < pulseCount; p++) {
            const pulse = pulses[p];
            const {strength}=pulseInfluence(pulse,x,y,now);
            if (strength > 0) {
              tone += Math.ceil(strength * (3 + pulse.power));
            }
          }
          // Pointer proximity is a quiet disturbance, not an opaque spotlight.
          if (hoverOn) {
            const distance2 = (x-hover.x)**2 + (y-hover.y)**2;
            if (distance2 < 125*125) {
              tone += Math.ceil(2.1 * (1-Math.sqrt(distance2)/125) * (1-hoverAge/950));
            }
          }
          // A propagating, irregular wavefront ionizes existing characters.
          // Front lines are staggered across lanes, and leave a hot afterglow.
          // No glyphs are created outside the stream's owned cells.
          if (surgeOn) {
            const dy = y-front;
            const crest = Math.max(0, 1-Math.abs(dy)/54);
            const corona = Math.max(0, 1-Math.abs(dy)/150);
            const afterglow = dy < 0 ? Math.max(0, 1+dy/355) : 0;
            if (crest>0) tone = Math.max(tone,Math.round(7+3*crest));
            else tone += Math.round(4*corona+3*afterglow);
          }
          tone = Math.max(0, Math.min(c.ink, tone));

          ctx.drawImage(src, cell.glyph*sw, tone*sh, sw, sh,
            Math.round(x-tw/2+(fracture?.dx || 0)),
            Math.round(y-th/2+(fracture?.dy || 0)), tw, th);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Density ONLY switches whole horizontal lanes on and off. The scheduler
// never inserts a second stream into an occupied cell in the same lane.
function laneDensity() {
  return Math.max(.13, Math.min(1, .23 + .77 * ((rain.density-.3)/1.35)));
}

class CodeLane {
  constructor(plane, column, pitch) {
    this.plane = plane;
    this.column = column;
    this.x = (column+.5)*pitch;
    this.lottery = Math.random();
    this.active = this.lottery < laneDensity();
    this.phase = between(0, Math.PI*2);
    this.rhythm = between(.25, 1.2);
    this.streams = [];
    this.nextGap = 0;
    this.pending = null;
    this.reset(true);
  }

  randomGap() {
    const tightness = Math.max(0, Math.min(1, (rain.density-.3)/1.35));
    // Even at maximum density there's at least a 2-row dark separation.
    return Math.floor(between(5-3*tightness, 25-17*tightness));
  }

  // All streams share the global velocity/cadence/surge multiplier, so
  // clearance in base-speed time survives changes to those controls.
  safeHead(stream, gap = this.nextGap) {
    let head = Infinity;
    for (const below of this.streams) {
      const position = below.head + below.progress;
      const remaining = Math.max(0, (below.endRow + below.length - position) / below.speed);
      const catchup = Math.max(0, stream.speed - below.speed) * remaining;
      // An extra row covers independently rounded head positions.
      head = Math.min(head, position - below.length - Math.max(2, gap) - 1 - catchup);
    }
    return Math.floor(head);
  }

  fillAbove(head) {
    while (head > this.plane.minRow-this.plane.config.lengthMax && this.streams.length < 15) {
      const stream = new CodeStream(this.plane, head);
      head = Math.min(head, this.safeHead(stream, this.randomGap()));
      if (head <= this.plane.minRow-this.plane.config.lengthMax) break;
      stream.place(head);
      this.streams.push(stream); // Bottommost stream first.
      head -= stream.length + this.randomGap();
    }
  }

  reset(fill) {
    this.streams.length = 0;
    this.pending = null;
    if (fill) {
      this.fillAbove(Math.floor(between(this.plane.minRow+(this.plane.rows-this.plane.minRow)*.3,
                                      this.plane.rows + this.plane.config.lengthMax*.8)));
    } else {
      this.streams.push(new CodeStream(this.plane, this.plane.minRow-1));
    }
    this.nextGap = this.randomGap();
  }

  extendBottom(row) {
    // Extend existing lifetimes only when followers still have clearance.
    // Otherwise the retained trail finishes at its original bottom boundary.
    // New births use the expanded field immediately.
    for (let i=0; i<this.streams.length; i++) {
      const stream=this.streams[i], position=stream.head+stream.progress;
      const remaining=Math.max(0,(row+stream.length-position)/stream.speed);
      const safe=this.streams.slice(i+1).every(follower =>
        position-stream.length-follower.head-follower.progress >=
          3+Math.max(0,follower.speed-stream.speed)*remaining);
      if (safe) stream.endRow=Math.max(stream.endRow,row);
    }
  }

  updateDensity() {
    const enabled = this.lottery < laneDensity();
    if (enabled && !this.active) this.reset(true);
    this.active = enabled;
    this.nextGap = this.randomGap();
  }

  update(dt, now) {
    if (!this.active) return;
    const motion = SIGNAL_MOTION[rain.grade];
    const cadence = 1 + motion.cadence*Math.sin(now*.00085*this.rhythm*motion.rhythm + this.phase);
    const surgeAge = now-signalAt;
    let chargeBoost = 1;
    if (surgeAge >= 0 && surgeAge < 1950) {
      const front = surgeFront(this.x,surgeAge);
      const lead = this.streams.length ? this.streams[this.streams.length-1].head * this.plane.lineHeight : 0;
      chargeBoost += 1.65 * Math.max(0,1-Math.abs(lead-front)/360);
    }
    const travel = dt*rain.speed*cadence*chargeBoost;
    for (const stream of this.streams) {
      stream.progress += travel*stream.speed;
      const steps = Math.floor(stream.progress);
      stream.progress -= steps;
      for (let i=0; i<steps; i++) stream.advanceRow();
    }
    let retained=0;
    for(const stream of this.streams)
      if(stream.head-stream.length<stream.endRow)this.streams[retained++]=stream;
    this.streams.length=retained;
    // Hold one sampled follower while waiting; don't reroll until a slow
    // speed happens to fit, which would bias the speed distribution.
    if (!this.pending) this.pending = new CodeStream(this.plane, this.plane.minRow-1);
    const head = this.plane.minRow-1;
    if (this.safeHead(this.pending) >= head) {
      this.pending.endRow = this.plane.rows;
      this.pending.place(head);
      this.streams.push(this.pending);
      this.pending = null;
      this.nextGap = this.randomGap();
    }
  }
}

class CodeStream {
  constructor(plane, head) {
    this.plane = plane;
    const cfg = plane.config;
    this.length = Math.floor(between(cfg.lengthMin, cfg.lengthMax+1));
    this.speed = between(cfg.advanceMin, cfg.advanceMax);
    this.progress = Math.random();
    this.endRow = plane.rows;
    this.head = head;
    this.whiteHead = Math.random() < cfg.headChance;
    this.glow = between(.6, 1);
    this.cells = new Map();
    this.place(head);
  }

  place(head) {
    this.head = head;
    this.cells.clear();
    for (let row=head-this.length+1; row<=head; row++) {
      if (row>=this.plane.minRow && row<this.endRow) this.cells.set(row, this.makeCell());
    }
  }

  makeCell() {
    const motion = SIGNAL_MOTION[rain.grade];
    return {
      glyph: randomGlyph(), energy: between(.74, 1.13),
      blank: Math.random()<motion.blanks,
      nextChange: simulationTime + between(160, 3500)/rain.mutation,
      nextTwinkle: simulationTime + between(600, 5400),
      twinkleUntil: -Infinity, pulseIds: [], lastBreach: -1, lastSurge: -1,
    };
  }

  advanceRow() {
    this.head++;
    if (this.head>=this.plane.minRow && this.head<this.endRow)
      this.cells.set(this.head, this.makeCell());
    this.cells.delete(this.head-this.length);
  }
}

function buildLighting() {
  const grade = GRADES[rain.grade];
  let g = createGraphics(160, 160);
  g.pixelDensity(1);
  let ctx = g.drawingContext;
  let gradient = ctx.createRadialGradient(80,80,0,80,80,80);
  gradient.addColorStop(0, grade.halo[0]);
  gradient.addColorStop(.19, grade.halo[1]);
  gradient.addColorStop(.51, grade.halo[2]);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,160,160);
  glows.halo = g;

  g = createGraphics(48, 220);
  g.pixelDensity(1);
  ctx = g.drawingContext;
  gradient = ctx.createLinearGradient(0,0,48,0);
  gradient.addColorStop(0,'rgba(4,90,22,0)');
  gradient.addColorStop(.5, grade.halo[1]);
  gradient.addColorStop(1,'rgba(4,90,22,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,48,220);
  ctx.globalCompositeOperation = 'destination-in';
  gradient = ctx.createLinearGradient(0,0,0,220);
  gradient.addColorStop(0,'rgba(0,0,0,0)');
  gradient.addColorStop(.4,'rgba(0,0,0,.12)');
  gradient.addColorStop(.87,'rgba(0,0,0,.6)');
  gradient.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,48,220);
  ctx.globalCompositeOperation = 'source-over';
  glows.column = g;
}

function buildVignette() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  const ctx = g.drawingContext;
  const radius = Math.hypot(width, height)*.59;
  const gradient = ctx.createRadialGradient(width*.5,height*.47,radius*.12,
                                            width*.5,height*.47,radius);
  gradient.addColorStop(0,'rgba(0,0,0,0)');
  gradient.addColorStop(.59,'rgba(0,0,0,.012)');
  gradient.addColorStop(.85,'rgba(0,0,0,.23)');
  gradient.addColorStop(1,'rgba(0,0,0,.64)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,width,height);
  return g;
}

function buildFilmTile(tile) {
  // Chromatic film dust, rebuilt every third frame: on/off is plainly visible.
  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = tile.height = 128;
  }
  const ctx = tile.getContext('2d');
  // The sole film tile has a fixed size; every channel is overwritten below.
  const data = filmData ||= ctx.createImageData(128,128);
  for (let i=0; i<data.data.length; i+=4) {
    const v = Math.random();
    if (v < .13) { data.data[i]=0;data.data[i+1]=0;data.data[i+2]=0;data.data[i+3]=80; }
    else { const n = 70+Math.random()*155;
      data.data[i] = n*.67; data.data[i+1] = n; data.data[i+2] = n*.74;
      data.data[i+3] = v>.955 ? 110 : 46;
    }
  }
  ctx.putImageData(data,0,0);
  return tile;
}

// Breach displacement is camera-relative, so the tear remains significant
// at every zoom. Horizontal slabs return independently instead of sweeping.
function breachRupture(now) {
  const age = now - breachAt;
  if (age < 640 || age >= BREACH_DURATION) return null;
  return {age, center:worldCenterX()+cameraPanX, top:worldViewport().minY,
    span:width/rain.zoom, band:Math.max(24,height/9)/rain.zoom};
}
function breachFragment(x, y, rupture) {
  const {age, center, top, span, band} = rupture;
  const slab = Math.floor((y-top)/band);
  const phase = breachSlabPhase(slab);
  const opening = Math.min(1, Math.max(0,(age-640)/510));
  const closeAt = 2080+phase*460;
  const recovery = Math.min(1, Math.max(0,(age-closeAt)/480));
  const amount = opening*opening*(3-2*opening)*(1-recovery*recovery*(3-2*recovery));
  const seam = center + (phase-.5)*span*.075;
  const side = x < seam ? -1 : 1;
  const proximity = Math.max(0,1-Math.abs(x-seam)/(span*.52));
  return {amount, dx:side*span*(.22+phase*.09)*amount*(.5+.5*proximity),
    dy:(phase-.5)*band*.8*amount,
    edge:amount>.1 && Math.abs(x-seam)<span*.045,
    relock:age>=closeAt+340 && age<closeAt+460};
}

// Shared with the breach cue so each mechanical latch follows its slab.
function breachSlabPhase(slab) {
  const seed = Math.sin(slab*127.1+19.7)*43758.5453;
  return seed-Math.floor(seed);
}

// Deterministic per-column phase jitter creates an uneven surge front.
function surgeFront(x, age) {
  const sweep = -120 + (age/1580)*(worldHeight+310);
  const crooked = 30*Math.sin(x*.021+age*.008) + 14*Math.sin(x*.053-age*.011);
  const laneJitter = 31*Math.sin(Math.floor(x/26)*12.9898);
  return sweep + crooked + laneJitter;
}
function randomGlyph() { return Math.floor(Math.random()*GLYPHS.length); }
function between(a,b) { return a + Math.random()*(b-a); }
function setRainOption(name, value, {userChoice=true}={}) {
  if(!Object.prototype.hasOwnProperty.call(SETTINGS,name))return false;
  const spec=SETTINGS[name];
  if(spec.type==='number') {
    if(typeof value!=='number'||!Number.isFinite(value))return false;
    value=Math.max(spec.min,Math.min(spec.max,value));
  } else if(spec.type==='boolean') {
    if(typeof value!=='boolean')return false;
  } else if(!spec.choices.includes(value))return false;
  if(name==='paused' && userChoice)pauseChosen=true;
  const old = rain[name];

  rain[name] = value;
  if (name === 'unlockMobileFPS') updateFrameRate();
  if (name === 'grade' && old !== value) {
    const preset = SIGNAL_MOTION[value];
    for (const key of ['density','persistence','speed','mutation','glow']) rain[key] = preset[key];
    // Reveal or hide retained lanes without rerolling streams or paused cells.
    for (const plane of planes) for (const lane of plane.lanes)
      lane.active = lane.lottery < laneDensity();
  }
  if (name === 'zoom') {
    setCameraPan(cameraPanX); // Zoom-out can reduce the allowed pan range.
    invalidateRender();
  }
  if (name === 'density') for (const plane of planes) plane.updateDensity();
  // Zoom transforms the existing world: no reseeding, no horizontal slipping.
  if (name === 'crt') displayEngine?.setMode(value);
  if (name === 'grade' && old !== value && planes.length) {
    // Preserve stream positions while recoloring the entire signal.
    for (const g of Object.values(glows)) g.remove?.();
    buildLighting();
    for (const plane of planes) plane.buildAtlas();
  }
  if(spec.visual)invalidateRender();
  emitState();
  return true;
}
function emitState() {
  window.dispatchEvent(new CustomEvent('rain-state', {detail: {...rain}}));
}
function resetRain() {
  for (const key of Object.keys(defaults)) rain[key] = defaults[key];
  pauseChosen=false;
  rain.paused=!!motionPreference?.matches;
  updateFrameRate();
  buildScene();
  displayEngine?.setMode(rain.crt);
  emitState();
}
function signalBurst() {
  setRainOption('paused',false); // Manual effects explicitly choose animation.
  signalAt = simulationTime;
}
function systemBreach() {
  setRainOption('paused',false); // Manual effects explicitly choose animation.
  breachAt = simulationTime;
}

function visibleToSource(x,y) { return displayEngine?.screenToSource(x,y) ?? {x,y}; }
function addPulse(x,y,power=1) {
  if(rain.paused)return;
  const realNow=millis();
  if (realNow - lastClickTime < 65) return;
  lastClickTime = realNow;
  // WebGL curved CRT is a post-process: invert its visible-display mapping
  // before storing the source-canvas origin. Then the effect appears exactly
  // under the real pointer, including near curved edges and at high zoom.
  const source=visibleToSource(x,y);
  pulses.push({x:source.x,y:source.y,at:simulationTime,id:++pulseSeq,power});
  if (pulses.length>4) pulses.shift();
  invalidateRender();
}
function extendSceneForViewport() {
  // Grow around the original world centre and retain every existing object.
  // Shrinking only crops the camera; repeated resize never rerolls the field.
  const centerX=worldCenterX(),centerY=worldCenterY();
  const nextWidth=Math.max(worldWidth,Math.ceil(width*(mobileInput()?2.70:1/ZOOM_MIN)),
    Math.ceil(width/ZOOM_MIN+2*Math.abs(cameraPanX)));
  const nextHeight=Math.max(worldHeight,Math.ceil(height/ZOOM_MIN));
  worldWidth=nextWidth;worldHeight=nextHeight;
  worldMinX=centerX-worldWidth/2;worldMinY=centerY-worldHeight/2;
  for(const plane of planes) {
    const minRow=Math.floor(worldMinY/plane.lineHeight);
    const maxRow=Math.ceil((worldMinY+worldHeight)/plane.lineHeight)+2;
    if(minRow===plane.minRow && maxRow===plane.rows)continue;
    plane.minRow=minRow;plane.rows=maxRow;
    for(const lane of plane.lanes) {
      lane.extendBottom(maxRow);
      // Previously clipped parts of a retained stream acquire only new cells.
      for(const stream of lane.streams) {
        for(let row=Math.max(minRow,stream.head-stream.length+1);row<=Math.min(stream.endRow-1,stream.head);row++)
          if(!stream.cells.has(row))stream.cells.set(row,stream.makeCell());
      }
      // New territory uses the same trajectory clearance as normal births.
      const top=lane.streams.at(-1);
      lane.fillAbove(top ? top.head-top.length-lane.nextGap : minRow-1);
    }
  }
  const owned=new Set(planes.flatMap(plane=>plane.lanes.map(lane=>lane.column)));
  const first=Math.floor(worldMinX/LANE_PITCH)-1;
  const last=Math.ceil((worldMinX+worldWidth)/LANE_PITCH)+1;
  for(let column=first;column<=last;column++) {
    if(owned.has(column))continue;
    const roll=Math.random();
    const plane=planes[roll<.21?0:roll<.74?1:2];
    plane.lanes.push(new CodeLane(plane,column,LANE_PITCH));
  }
  for(const plane of planes)plane.lanes.sort((a,b)=>a.x-b.x);
  viewport=worldViewport();
}
function windowResized() {
  // Mobile browser chrome and orientation changes can produce transient zero
  // sizes. Resize to the actual CSS viewport rather than cached canvas dimensions.
  const {w,h} = frameCanvasSize();
  if (Math.abs(width-w)<2 && Math.abs(height-h)<2) return;
  resizeCanvas(w,h);
  extendSceneForViewport();
  vignette?.remove?.();
  vignette=buildVignette();
  filmPattern=drawingContext.createPattern(filmTile,'repeat');
  invalidateRender();
  displayEngine?.resize();
  // Changing canvas dimensions clears both outputs. Repaint in this same
  // event so the browser cannot display a blank frame between resize and tick.
  renderScene();
  renderDirty=false;
}


window.setRainOption = setRainOption;
window.getRainOptions = () => ({...rain});
window.resetRain = resetRain;
window.reseedRain = buildScene;
window.signalRain = signalBurst;

window.breachRain = systemBreach;

// Shared interface: display settings and frozen simulation time.
// UI changes settings through the public functions below, never this object.
window.RainApp = Object.freeze({
  state: rain,
  get time() { return simulationTime; },
  get mobileInput() { return mobileInput(); },
  get renderedFrames() { return renderedFrames; },
  profiles: Object.freeze([...GRADE_NAMES]),
  settings: SETTINGS,
});
