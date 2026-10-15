// Frame Playground: local-only sample dashboards and touch experiments.
// Original Home HQ modules remain in js/views; this branch swaps only the entry point.
import { mountOrbit, mountInk, mountLife, mountArcade } from './playground-worlds.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const screen = $('#screen'), stage = $('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const paths = {
  explore:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  today:'<path d="M3 10l9-7 9 7v11H3zM9 21v-8h6v8"/>',
  habitat:'<path d="M13 2L4 14h7l-1 8 10-13h-8z"/>',
  station:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 18l-3 4M15 18l3 4M9 15h.1M15 15h.1"/>',
  matrix:'<path d="M5 3v8m0 4v6M12 3v3m0 4v11M19 3v12m0 4v2"/>',
  orbit:'<ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="4"/>',
  ink:'<path d="M3 21c12 0 2-17 10-17 9 0-6 17 8 17M3 16c7 0 3-9 8-9"/>',
  life:'<path d="M12 21V11M12 15C3 16 2 8 3 4c7 0 10 4 9 11zM12 11c0-6 4-8 9-8 0 6-2 9-9 8"/>',
  arcade:'<rect x="2" y="7" width="20" height="14" rx="5"/><path d="M7 11v6M4 14h6M16 12h.1M19 15h.1M12 7V3"/>',
  focus:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'
};
const demos = [
  ['explore','Explore','The possibility index','✳'],
  ['today','Daybook','A calmer family dashboard','☀'],
  ['habitat','Habitat','An interactive home & energy desk','↯'],
  ['station','Departures','Your own little station board','↗'],
  ['matrix','Digital rain','Your Matrix demo, silently remixed','ﾐ'],
  ['orbit','Gravity lab','Bend a miniature universe','◎'],
  ['ink','Light loom','Draw with luminous symmetry','≋'],
  ['life','Living grid','Grow a pocket cellular garden','✳'],
  ['arcade','Brick club','A tiny, touch-powered arcade','▦'],
  ['focus','Quiet time','A breathing sculpture & focus timer','◷']
];
const icon = id => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[id]+'</svg>';
$('#rail').innerHTML='<div class="brand">HQ<small>PLAYGROUND</small></div>'+demos.map(d=>'<button class="nav-item" data-demo="'+d[0]+'" aria-label="'+d[1]+'">'+icon(d[0])+'<span>'+d[1]+'</span></button>').join('')+'<div class="rail-bottom"><button id="tour-toggle" aria-pressed="false">▷ TOUR</button><b id="rail-time"></b><small>FRAME LAB / 01</small></div>';
let current, cleanup = () => {}, tour = false, tourAt = 0, toastTimer;
const state = { checklist:[false,false,false], rooms:[true,false,true,false], outbound:true };
const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem('frame-lab-'+key)); } catch { return null; } },
  set(key,value) { try { localStorage.setItem('frame-lab-'+key,JSON.stringify(value)); return true; } catch { toast('Storage unavailable — changes kept for this session.'); return false; } }
};
function toast(message) { $('#notice').textContent=message; $('#notice').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#notice').classList.remove('visible'),3200); }
function fit() { stage.style.transform='scale('+Math.min(innerWidth/1280,innerHeight/800)+')'; }
function clockText() { return new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); }
function head(n,title,tag='SAMPLE DATA') { return '<header class="page-head"><div><div class="eyebrow"><span class="dot"></span>FRAME EXPERIMENT / '+n+'</div><h1>'+title+'</h1></div><span class="badge">'+tag+'</span></header>'; }
function foot(a,b='HOME HQ / FRAME PLAYGROUND') { return '<footer class="footnote"><span>'+a+'</span><span>'+b+'</span></footer>'; }
function on(selector, fn) { $$(selector,screen).forEach(el=>el.addEventListener('click',()=>fn(el))); }
function setTour(value) { tour=value; tourAt=Date.now(); $('#tour-toggle').textContent=value?'Ⅱ STOP TOUR':'▷ TOUR'; $('#tour-toggle').classList.toggle('tour-on',value); $('#tour-toggle').setAttribute('aria-pressed',String(value)); }
function cinema() { stage.classList.toggle('cinema'); window.dispatchEvent(new Event('resize')); }
function go(id) {
  if(!demos.some(d=>d[0]===id))id='explore';
  cleanup();cleanup=()=>{};stage.classList.remove('cinema');current=id;tourAt=Date.now();
  $$('.nav-item').forEach(b=>{ if(b.dataset.demo===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current'); });
  history.replaceState(null,'','#'+id);document.title=demos.find(d=>d[0]===id)[1]+' — Home HQ Playground';
  mounts[id]();
}
function explore() {
  screen.innerHTML='<section class="page catalogue"><header class="page-head"><div class="eyebrow"><span class="dot"></span>HOME HQ / THE POSSIBILITY COLLECTION</div><span class="edition">VOL. 01 — BUILT FOR TOUCH</span></header><div class="lead"><h1>A little frame.<br><em>A bigger world.</em></h1><div class="intro-side"><p>A daily companion. A window into another world. A canvas that plays back.<br>Pick an experiment. Make it yours.</p><button class="pill solid" id="start-tour">Take a tour ↗</button></div></div><div class="catalog-grid">'+demos.slice(1).map((d,i)=>'<button class="demo-card" data-demo="'+d[0]+'"><span class="card-number">0'+(i+1)+' / '+(i<3?'DASHBOARD':'EXPERIMENT')+'</span><span class="motif" aria-hidden="true">'+d[3]+'</span><div><h2>'+d[1]+'</h2><p>'+d[2]+'</p></div><span class="arrow" aria-hidden="true">↗</span></button>').join('')+'</div>'+foot('09 EXPERIMENTS · NO ACCOUNTS · NO AUDIO','1280 × 800 / ENDLESS POSSIBILITIES')+'</section>';
  $('#start-tour').onclick=()=>{setTour(true);go('today');};
}
function today() {
  const now=new Date();
  screen.innerHTML='<section class="page today"><div class="masthead"><span>'+now.toLocaleDateString('en-CA',{weekday:'long',month:'short',day:'numeric'}).toUpperCase()+'</span><strong>The Daybook</strong><span>A HOUSEHOLD DEMO</span></div><div class="today-grid"><div><div class="today-clock" id="day-clock"></div><h1 class="greeting">A little less rush.<br>A little more home.</h1><div class="weather-card"><div class="sun-mark" aria-hidden="true">☀</div><div><strong>18°</strong><p>Mostly sunny in our sample forecast<br>High 20° / Low 9° · A light-jacket day</p></div></div><div class="hourly">'+['Now|18°','14:00|20°','16:00|19°','18:00|16°','20:00|12°'].map(s=>'<div><span>'+s.split('|')[0]+'</span><span>☀</span><b>'+s.split('|')[1]+'</b></div>').join('')+'</div><div class="note">“Let’s take the long way home.”<small>THE NOTE ON THE FRIDGE / SAMPLE</small></div></div><div><div class="agenda-label"><span class="kicker">A little later</span><span class="kicker muted">3 PLANS / SAMPLE</span></div>'+[['15:30','The school run','Meet at the north gate','LEAVE AT 15:15'],['17:00','Make something good','Pasta, tomatoes & whatever is in the fridge','IN THE KITCHEN'],['19:30','An evening outside','Walk around the neighbourhood','ALL OF US']].map(e=>'<article class="agenda-row"><time>'+e[0]+'</time><div><h3>'+e[1]+'</h3><p>'+e[2]+'</p><span class="tag">'+e[3]+'</span></div></article>').join('')+'<div class="kicker" style="margin-top:24px">Tiny victories · tap to check</div><div class="checklist">'+['Water plants','Feed the cat','Pack lunches'].map((s,i)=>'<button data-check="'+i+'" aria-pressed="'+state.checklist[i]+'">'+(state.checklist[i]?'✓':'○')+' '+s+'</button>').join('')+'</div></div></div>'+foot('REAL CLOCK · FICTIONAL WEATHER & PLANS')+'</section>';
  updateTodayClock();on('[data-check]',el=>{const i=+el.dataset.check;state.checklist[i]=!state.checklist[i];today();});
}
function updateTodayClock() { const el=$('#day-clock');if(el){const [time,period]=clockText().split(' ');el.innerHTML=time+'<small>'+period+'</small>';} }
function habitat() {
  const loads=[180,110,60,140], consumption=840+state.rooms.reduce((s,on,i)=>s+(on?loads[i]:0),0);
  const rooms=[['Living room','Ambient lights','◉'],['Kitchen','Under-cabinet lights','⌂'],['Studio','Desk & task lights','✳'],['Garden','Evening lights','♧']];
  screen.innerHTML='<section class="page habitat">'+head('02','A home in balance.')+'<div class="habitat-grid"><div class="energy-hero"><div class="kicker">CURRENT SOLAR GENERATION</div><div class="watts">3.42 <small>kW</small></div><p class="muted" style="font-size:14px;margin-top:8px">More sunshine than you need. A good place to be.</p><div class="flow"><div class="flow-node">SOLAR<b>3.42</b></div><span class="flow-line">→</span><div class="flow-node">HOME<b>'+(consumption/1000).toFixed(2)+'</b></div><span class="flow-line">→</span><div class="flow-node">EXPORT<b>'+((3420-consumption)/1000).toFixed(2)+'</b></div></div><div class="energy-meta"><span>BATTERY / 86%</span><span>GRID / SENDING EXCESS ↗</span></div></div><div class="rooms">'+rooms.map((r,i)=>'<button class="room" data-room="'+i+'" aria-pressed="'+state.rooms[i]+'"><div class="room-icon">'+r[2]+'</div><span class="switch" aria-hidden="true"></span><h3>'+r[0]+'</h3><p>'+r[1]+' · '+(state.rooms[i]?'On':'Off')+'</p></button>').join('')+'</div></div><div class="energy-chart"><h2>Following the sun.<small>TODAY’S SAMPLE GENERATION</small></h2><div class="bars" aria-label="Sample solar generation rises to a midday peak">'+[8,12,20,30,47,64,80,92,100,93,84,67,48,26,12,5].map(n=>'<i style="height:'+n+'%"></i>').join('')+'</div><div class="eco-stat">18.6<small>kWh GENERATED TODAY</small></div></div>'+foot('TRY THE ROOM SWITCHES · SIMULATED DEVICES & ENERGY')+'</section>';
  on('[data-room]',el=>{state.rooms[+el.dataset.room]=!state.rooms[+el.dataset.room];habitat();});
}
let departureEpoch=Date.now();
function station() {
  const outbound=state.outbound;
  const rows=outbound?[['18','Downtown','via River Avenue',3],['60','University','via South Station',8],['B','Airport express','Limited stops',12],['24','West End','via Central Library',19]]:[['18','River Park','via Osborne Village',4],['60','North Station','via Main Street',10],['B','City centre','Express service',15],['24','Central Library','via Museum Quarter',22]];
  screen.innerHTML='<section class="page station">'+head('03','Somewhere to be.','SIMULATED DEPARTURES')+'<div class="departures"><div><div class="eyebrow">● RIVER STATION / '+(outbound?'OUTBOUND':'INBOUND')+'</div><div class="departure-head"><span>ROUTE</span><span>DESTINATION</span><span>LEAVES IN</span></div>'+rows.map((r,i)=>'<div class="departure-row"><div class="route-number">'+r[0]+'</div><div><h3>'+r[1]+'</h3><p>'+r[2]+'</p></div><strong data-departure="'+(r[3]*60)+'" data-platform="'+(i%2+1)+'"></strong></div>').join('')+'<div class="station-toggle"><button class="pill '+(outbound?'solid':'')+'" data-direction="out">Outbound ↗</button><button class="pill '+(!outbound?'solid':'')+'" data-direction="in">↙ Inbound</button></div></div><div class="station-map"><h2>One small journey.</h2><svg viewBox="0 0 300 310" role="img" aria-label="Illustrative route from River Park through River Station to the city centre"><path d="M68 30v180q0 45 45 45h120" fill="none" stroke="#7188e3" stroke-width="9"/><path d="M68 100v110q0 45 45 45h120" fill="none" stroke="#e4ed9a" stroke-width="9"/><g fill="#1231ac" stroke="#fff" stroke-width="4"><circle cx="68" cy="35" r="7"/><circle cx="68" cy="100" r="11"/><circle cx="68" cy="165" r="7"/><circle cx="112" cy="255" r="7"/><circle cx="230" cy="255" r="7"/></g><g fill="#fff" font-family="Arial" font-size="13"><text x="90" y="40">River Park</text><text x="90" y="105" font-weight="bold">You are here</text><text x="90" y="170">The Village</text><text x="87" y="285">Museum</text><text x="202" y="285">Centre</text></g><rect class="route-train" x="60" y="76" width="16" height="25" rx="5" fill="#e4ed9a" stroke="#1231ac" stroke-width="3"/></svg><p class="map-legend">A wall display for the moment<br>between “ready” and “let’s go”.<br><br>Illustrative routes, not a live feed.</p></div></div>'+foot('DEMO COUNTDOWNS LOOP EVERY 24 MINUTES · NO TRANSIT CONNECTION')+'</section>';
  on('[data-direction]',el=>{state.outbound=el.dataset.direction==='out';departureEpoch=Date.now();station();});updateDepartures();
}
function updateDepartures() { $$('[data-departure]').forEach(el=>{const seconds=(+el.dataset.departure-Math.floor((Date.now()-departureEpoch)/1000)%1440+1440)%1440;el.innerHTML=(seconds<60?'<span style="font-size:25px">DUE</span>':Math.ceil(seconds/60)+'′')+'<small>PLATFORM '+el.dataset.platform+'</small>';}); }
function matrix() {
  screen.innerHTML='<section class="page world"><div class="matrix-loading">CONNECTING TO THE SOURCE…</div><iframe class="matrix-frame" title="Silent Digital Rain interactive demo" src="/rain/index.html"></iframe></section>';
  const frame=$('iframe');frame.onload=()=>$('.matrix-loading')?.remove();
  // Destroy the iframe on navigation, releasing its canvas, RAF and GPU resources.
  cleanup=()=>{frame.src='about:blank';frame.remove();};
}
const savedFocus=storage.get('focus');
const focusState=savedFocus && typeof savedFocus==='object' && !Array.isArray(savedFocus)?savedFocus:{duration:25*60,remaining:25*60,end:null};
// Accept only our bounded, numeric state if storage was edited or is stale.
if(!Number.isFinite(focusState.duration)||focusState.duration<60||focusState.duration>3600||!Number.isFinite(focusState.remaining)||focusState.remaining<0||focusState.remaining>3600||!(focusState.end===null||Number.isFinite(focusState.end)))Object.assign(focusState,{duration:1500,remaining:1500,end:null});
function remainingFocus() { return focusState.end?Math.max(0,Math.ceil((focusState.end-Date.now())/1000)):focusState.remaining; }
function focus() {
  screen.innerHTML='<section class="page focus">'+head('09','Leave a little space.','A QUIETER KIND OF SCREEN')+'<div class="focus-body"><div class="breath-art"><div class="breath-disc"></div><div class="breath-caption">Breathe in · soften · breathe out</div></div><div><div class="timer-modes">'+[[5,'A moment'],[25,'Focus'],[50,'Deep work']].map(([m,s])=>'<button data-minutes="'+m+'" class="'+(focusState.duration===m*60?'selected':'')+'">'+s+' / '+m+'m</button>').join('')+'</div><div class="timer" id="focus-time" aria-label="Time remaining"></div><p class="focus-detail" id="focus-message">One thing at a time is enough.</p><div class="toolbar"><button class="pill solid" id="focus-start"></button><button class="pill" id="focus-reset">Reset</button></div><p class="focus-note">A silent timer. A slow, twelve-second rhythm.<br>Your timer keeps going when you explore other pages.</p></div></div>'+foot('NO NOTIFICATIONS · NO SOUND · JUST THIS MOMENT')+'</section>';
  on('[data-minutes]',el=>{const duration=+el.dataset.minutes*60;Object.assign(focusState,{duration,remaining:duration,end:null});storage.set('focus',focusState);focus();});
  $('#focus-start').onclick=()=>{if(focusState.end){focusState.remaining=remainingFocus();focusState.end=null;}else{if(!focusState.remaining)focusState.remaining=focusState.duration;focusState.end=Date.now()+focusState.remaining*1000;}storage.set('focus',focusState);updateFocus();};
  $('#focus-reset').onclick=()=>{Object.assign(focusState,{remaining:focusState.duration,end:null});storage.set('focus',focusState);updateFocus();};updateFocus();
}
function updateFocus() { const el=$('#focus-time');if(!el)return;const r=remainingFocus();el.textContent=String(Math.floor(r/60)).padStart(2,'0')+':'+String(r%60).padStart(2,'0');$('#focus-start').textContent=focusState.end?'Pause':r?'Begin':'Begin again';$('#focus-message').textContent=r?'One thing at a time is enough.':'A little space, well spent.'; }
const helpers={$,on,toast,cinema,reducedMotion,storage};
const mounts={explore,today,habitat,station,matrix,focus,
  orbit:()=>{cleanup=mountOrbit(screen,helpers);},ink:()=>{cleanup=mountInk(screen,helpers);},life:()=>{cleanup=mountLife(screen,helpers);},arcade:()=>{cleanup=mountArcade(screen,helpers);}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-demo]');if(b){setTour(false);go(b.dataset.demo);}});
document.addEventListener('pointerdown',()=>{tourAt=Date.now();},true);
$('#tour-toggle').onclick=()=>{setTour(!tour);if(tour&&current==='explore')go('today');};
$('#exit-cinema').onclick=cinema;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.classList.contains('cinema'))cinema();});
window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
window.addEventListener('resize',fit);
document.addEventListener('visibilitychange',()=>{tourAt=Date.now();});
// Rain's isolated document can request presentation mode; accept only that exact frame.
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===$('iframe',screen)?.contentWindow){if(e.data==='frame-cinema')cinema();if(e.data==='frame-interaction')tourAt=Date.now();}});
setInterval(()=>{
  $('#rail-time').textContent=clockText().replace(/\s[AP]M/,'');
  if(current==='today')updateTodayClock();if(current==='station')updateDepartures();
  if(focusState.end&&remainingFocus()===0){Object.assign(focusState,{remaining:0,end:null});storage.set('focus',focusState);toast('Quiet time complete. Take a little break.');}
  if(current==='focus')updateFocus();
  if(tour&&!document.hidden&&Date.now()-tourAt>25000){const i=demos.findIndex(d=>d[0]===current);go(demos[i===demos.length-1?1:i+1][0]);}
},1000);
fit();$('#rail-time').textContent=clockText().replace(/\s[AP]M/,'');go(location.hash.slice(1)||'explore');
