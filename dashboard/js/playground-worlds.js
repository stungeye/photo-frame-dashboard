// Each experiment owns one animation loop; the router always calls its cleanup.
const TAU=Math.PI*2;
function loop(draw,fps=30) {
  let raf,dead=false,last=0;
  function tick(t){if(dead)return;raf=requestAnimationFrame(tick);if(document.hidden){last=t;return;}if(t-last<1000/fps-1)return;const dt=Math.min((t-last)/1000,.05);last=t;draw(t,dt);}
  raf=requestAnimationFrame(tick);return()=>{dead=true;cancelAnimationFrame(raf);};
}
function point(e,c) { const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}; }
function canvas(el,w=1192,h=800) { const c=el.querySelector('canvas');c.width=w;c.height=h;return[c,c.getContext('2d',{alpha:false})]; }
function title(n,name,description) {return '<div class="world-title"><div class="eyebrow">EXPERIMENT / '+n+'</div><h1>'+name+'</h1><p>'+description+'</p></div>';}
function pill(id,label,selected=false){return '<button class="pill'+(selected?' selected':'')+'" id="'+id+'">'+label+'</button>';}
function stars(ctx,w,h) {for(let i=0;i<90;i++){ctx.fillStyle=i%6?'#425658':'#b1c4af';ctx.fillRect((i*137.51)%w,(i*i*73.31)%h,i%6?1:2,1);}}

export function mountOrbit(el,{$,cinema,reducedMotion}) {
  el.innerHTML='<section class="page world orbit-world"><canvas aria-label="Interactive gravity field. Tap or drag to attract the particles."></canvas>'+title('05','A small universe.','Touch the field. Become the centre of gravity.')+'<span class="world-status" id="orbit-status">180 PARTICLES / ONE ATTRACTOR</span><div class="world-controls"><div class="toolbar">'+pill('orbit-pause','Pause',reducedMotion)+pill('orbit-mode','Binary stars')+pill('orbit-reset','New universe')+'</div><div class="toolbar"><span class="world-hint">DRAG TO BEND THE ORBITS</span>'+pill('orbit-cinema','↗ Fill frame')+'</div></div></section>';
  const [c,ctx]=canvas(el);let particles=[],target={x:c.width*.55,y:c.height*.53},attractors=1,paused=reducedMotion,drag=false;
  function seed(){particles=Array.from({length:180},(_,i)=>{const a=Math.random()*TAU,r=60+Math.random()*235,v=Math.sqrt(6200/r);return{x:target.x+Math.cos(a)*r,y:target.y+Math.sin(a)*r,vx:-Math.sin(a)*v,vy:Math.cos(a)*v,color:['#cfe9a8','#e37b50','#85bdc6','#e6ca85'][i%4]};});ctx.fillStyle='#0d181e';ctx.fillRect(0,0,c.width,c.height);}
  function draw(t,dt){if(paused)return;ctx.fillStyle='rgba(13,24,30,.18)';ctx.fillRect(0,0,c.width,c.height);stars(ctx,c.width,c.height);const centers=attractors===1?[target]:[{x:target.x-105,y:target.y},{x:target.x+105,y:target.y}];
    for(const p of particles){const x=p.x,y=p.y;for(const a of centers){const dx=a.x-p.x,dy=a.y-p.y,r2=Math.max(700,dx*dx+dy*dy),f=6200/(r2*Math.sqrt(r2));p.vx+=dx*f*dt*22;p.vy+=dy*f*dt*22;}p.x+=p.vx*dt*22;p.y+=p.vy*dt*22;if(p.x<-80||p.x>c.width+80||p.y<-80||p.y>c.height+80){const a=Math.random()*TAU;p.x=target.x+Math.cos(a)*200;p.y=target.y+Math.sin(a)*200;p.vx=-Math.sin(a)*5;p.vy=Math.cos(a)*5;}ctx.strokeStyle=p.color;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(p.x,p.y);ctx.stroke();}
    for(const a of centers){ctx.fillStyle='#eeeac9';ctx.beginPath();ctx.arc(a.x,a.y,5,0,TAU);ctx.fill();ctx.strokeStyle='#bfc799';ctx.beginPath();ctx.arc(a.x,a.y,15+Math.sin(t/600)*2,0,TAU);ctx.stroke();}}
  seed();draw(0,.02);$('#orbit-pause',el).textContent=paused?'Resume':'Pause';
  c.onpointerdown=e=>{drag=true;c.setPointerCapture(e.pointerId);target=point(e,c);};c.onpointermove=e=>{if(drag)target=point(e,c);};c.onpointerup=c.onpointercancel=()=>{drag=false;};
  $('#orbit-pause',el).onclick=e=>{paused=!paused;e.target.textContent=paused?'Resume':'Pause';e.target.setAttribute('aria-pressed',String(paused));};
  $('#orbit-mode',el).onclick=e=>{attractors=attractors===1?2:1;e.target.textContent=attractors===1?'Binary stars':'Single star';$('#orbit-status',el).textContent='180 PARTICLES / '+(attractors===1?'ONE ATTRACTOR':'TWO ATTRACTORS');};
  $('#orbit-reset',el).onclick=seed;$('#orbit-cinema',el).onclick=cinema;
  if(paused){paused=false;draw(0,.03);paused=true;}
  return loop(draw);
}

export function mountInk(el,{$,toast,cinema,storage}) {
  const colors=['#b9a7f4','#f19976','#badea5','#8bd5dd','#eadca1'];
  el.innerHTML='<section class="page world ink-world"><canvas aria-label="Light loom drawing surface. Drag to paint a symmetrical pattern."></canvas>'+title('06','Draw a little wonder.','A fingertip, a little symmetry, and a trail of light.')+'<span class="world-status">A SILENT INSTRUMENT OF LIGHT</span><div class="world-controls"><div class="swatches" role="group" aria-label="Ink colours">'+colors.map((co,i)=>'<button class="swatch '+(!i?'selected':'')+'" style="--swatch:'+co+'" data-color="'+co+'" aria-label="'+['Lavender','Coral','Lime','Aqua','Gold'][i]+' ink" aria-pressed="'+(!i)+'"></button>').join('')+'</div><div class="toolbar">'+pill('ink-mirror','6-fold symmetry')+pill('ink-undo','Undo')+pill('ink-clear','Clear')+pill('ink-save','Keep drawing')+pill('ink-cinema','↗ Fill frame')+'</div></div></section>';
  const [c,ctx]=canvas(el);let color=colors[0],fold=6,stroke=null,strokes=[],saved=storage.get('drawing');
  if(Array.isArray(saved))strokes=saved.filter(s=>s&&colors.includes(s.color)&&[2,6,12].includes(s.fold)&&Array.isArray(s.points)&&s.points.length<=2500&&s.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))).slice(-120);
  if(!Array.isArray(saved)) {
    // A starter rosette makes the page useful as ambient art before the first touch.
    for(let k=0;k<3;k++) {
      const points=[];
      for(let i=0;i<=150;i++){const a=i/150*TAU,r=120+45*Math.sin(a*3+k*.65);points.push({x:c.width/2+Math.cos(a)*r,y:c.height/2+Math.sin(a)*r});}
      strokes.push({color:colors[k===2?3:0],fold:6,points});
    }
  }
  function background(){ctx.fillStyle='#17172a';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#292a3e';ctx.lineWidth=1;ctx.beginPath();ctx.arc(c.width/2,c.height/2,220,0,TAU);ctx.moveTo(c.width/2-12,c.height/2);ctx.lineTo(c.width/2+12,c.height/2);ctx.moveTo(c.width/2,c.height/2-12);ctx.lineTo(c.width/2,c.height/2+12);ctx.stroke();}
  function segment(s,a,b){ctx.save();ctx.translate(c.width/2,c.height/2);ctx.strokeStyle=s.color;ctx.lineWidth=2.2;ctx.lineCap='round';for(let i=0;i<s.fold;i++){ctx.save();ctx.rotate(i*TAU/s.fold);ctx.beginPath();ctx.moveTo(a.x-c.width/2,a.y-c.height/2);ctx.lineTo(b.x-c.width/2,b.y-c.height/2);ctx.stroke();ctx.restore();}ctx.restore();}
  function repaint(){background();for(const s of strokes)for(let i=1;i<s.points.length;i++)segment(s,s.points[i-1],s.points[i]);}
  repaint();
  c.onpointerdown=e=>{c.setPointerCapture(e.pointerId);const p=point(e,c);stroke={color,fold,points:[p,{x:p.x+.1,y:p.y+.1}]};strokes.push(stroke);if(strokes.length>120){strokes.shift();repaint();}segment(stroke,...stroke.points);};
  c.onpointermove=e=>{if(!stroke||stroke.points.length>=2500)return;const p=point(e,c),last=stroke.points[stroke.points.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)<2)return;segment(stroke,last,p);stroke.points.push(p);};
  c.onpointerup=c.onpointercancel=()=>{stroke=null;};
  el.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;el.querySelectorAll('[data-color]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
  $('#ink-mirror',el).onclick=e=>{fold=fold===6?12:fold===12?2:6;e.target.textContent=fold+'-fold symmetry';};
  $('#ink-clear',el).onclick=()=>{strokes=[];repaint();};$('#ink-undo',el).onclick=()=>{strokes.pop();repaint();};
  $('#ink-save',el).onclick=()=>{if(storage.set('drawing',strokes))toast('Drawing kept on this device. Come back any time.');};$('#ink-cinema',el).onclick=cinema;
  return()=>{};
}

export function mountLife(el,{$,reducedMotion}) {
  el.innerHTML='<section class="page world life-world"><canvas aria-label="Conway’s Game of Life. Touch the grid to plant living cells."></canvas>'+title('07','Life finds a pattern.','Plant a few cells. Watch a simple rule become something surprising.')+'<span class="world-status" id="life-stats"></span><div class="world-controls"><div class="toolbar">'+pill('life-pause',reducedMotion?'Grow':'Pause')+pill('life-step','One generation')+pill('life-seed','Wild garden')+pill('life-gliders','Gliders')+pill('life-clear','Clear')+'</div><span class="world-hint">TOUCH TO PLANT · EDGES WRAP</span></div></section>';
  const cols=74,rows=35,[c,ctx]=canvas(el,1110,525);let cells=new Uint8Array(cols*rows),next=new Uint8Array(cells.length),age=new Uint8Array(cells.length),generation=0,running=!reducedMotion,last=0,drag=false,paint=1;
  function random(){for(let i=0;i<cells.length;i++){cells[i]=Math.random()<.25?1:0;age[i]=0;}generation=0;render();}
  function render(){ctx.fillStyle='#152b22';ctx.fillRect(0,0,c.width,c.height);let population=0;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*cols+x;ctx.fillStyle=cells[i]?(age[i]>8?'#e6eeb1':age[i]>2?'#b5ce86':'#6eac78'):'#1c3529';ctx.fillRect(x*15+1,y*15+1,13,13);population+=cells[i];}$('#life-stats',el).textContent='GEN '+String(generation).padStart(4,'0')+' / '+population+' LIVING';}
  function step(){for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)n+=cells[((y+dy+rows)%rows)*cols+(x+dx+cols)%cols];const i=y*cols+x;next[i]=n===3||(cells[i]&&n===2)?1:0;age[i]=next[i]?Math.min(255,age[i]+1):0;}[cells,next]=[next,cells];generation++;render();}
  function plant(e){const p=point(e,c),x=Math.max(0,Math.min(cols-1,Math.floor(p.x/15))),y=Math.max(0,Math.min(rows-1,Math.floor(p.y/15)));cells[y*cols+x]=paint;age[y*cols+x]=0;render();}
  c.onpointerdown=e=>{drag=true;c.setPointerCapture(e.pointerId);const p=point(e,c);paint=cells[Math.min(rows-1,Math.max(0,Math.floor(p.y/15)))*cols+Math.min(cols-1,Math.max(0,Math.floor(p.x/15)))]?0:1;plant(e);};c.onpointermove=e=>{if(drag)plant(e);};c.onpointerup=c.onpointercancel=()=>{drag=false;};
  $('#life-pause',el).onclick=e=>{running=!running;e.target.textContent=running?'Pause':'Grow';};$('#life-step',el).onclick=()=>{running=false;$('#life-pause',el).textContent='Grow';step();};$('#life-seed',el).onclick=random;
  $('#life-clear',el).onclick=()=>{cells.fill(0);age.fill(0);generation=0;render();};
  $('#life-gliders',el).onclick=()=>{cells.fill(0);age.fill(0);generation=0;for(const [x,y] of [[6,5],[25,13],[49,22]])for(const [dx,dy] of [[1,0],[2,1],[0,2],[1,2],[2,2]])cells[(y+dy)*cols+x+dx]=1;render();};
  random();return loop(t=>{if(running&&!drag&&t-last>160){last=t;step();}},15);
}

export function mountArcade(el,{$}) {
  el.innerHTML='<section class="page world arcade-world"><canvas tabindex="0" aria-label="Brick Club game. Drag the paddle or use left and right arrow keys. Press Space to launch."></canvas>'+title('08','Welcome to Brick Club.','A photo frame with a competitive streak.')+'<span class="world-status" id="arcade-score"></span><div class="arcade-overlay" id="arcade-overlay"><h2>Your five-minute holiday.</h2><p>Drag anywhere in the court to aim.<br>Tap the court or press Launch to begin.<br>Keyboard: ← → to move · Space to launch.</p></div><div class="world-controls"><div class="toolbar">'+pill('arcade-launch','Launch')+pill('arcade-pause','Pause')+pill('arcade-reset','New game')+'</div><span class="world-hint">BREAK EVERY BRICK · THREE CHANCES</span></div></section>';
  const [c,ctx]=canvas(el,1118,526),W=c.width,H=c.height;let paddle=W/2,ball,bricks,score,lives,playing=false,paused=false,finished=false,keys={};
  const colors=['#e4b45f','#e1897a','#a5cba1','#91b9d3'];
  function resetBall(){ball={x:paddle,y:H-44,vx:220*(Math.random()>.5?1:-1),vy:-265};playing=false;}
  function reset(){paddle=W/2;score=0;lives=3;finished=false;paused=false;$('#arcade-pause',el).textContent='Pause';bricks=Array.from({length:40},(_,i)=>({x:35+(i%10)*105,y:37+Math.floor(i/10)*35,w:97,h:25,color:colors[Math.floor(i/10)],alive:true}));resetBall();$('#arcade-overlay',el).classList.remove('hidden');$('#arcade-overlay',el).innerHTML='<h2>Your five-minute holiday.</h2><p>Drag anywhere in the court to aim.<br>Tap the court or press Launch to begin.<br>Keyboard: ← → to move · Space to launch.</p>';}
  function launch(){if(finished)reset();paused=false;$('#arcade-pause',el).textContent='Pause';playing=true;$('#arcade-overlay',el).classList.add('hidden');}
  function aim(e){paddle=Math.max(65,Math.min(W-65,point(e,c).x));if(!playing)ball.x=paddle;}
  c.onpointerdown=e=>{c.setPointerCapture(e.pointerId);aim(e);launch();};c.onpointermove=e=>{if(e.buttons||e.pointerType==='touch')aim(e);};
  function keydown(e){if(['ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();keys[e.key]=true;if(e.key===' '&&!e.repeat)launch();}}function keyup(e){keys[e.key]=false;}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);
  const clearKeys=()=>{keys={};};window.addEventListener('blur',clearKeys);
  $('#arcade-launch',el).onclick=launch;$('#arcade-reset',el).onclick=reset;$('#arcade-pause',el).onclick=e=>{paused=!paused;e.target.textContent=paused?'Resume':'Pause';};
  function end(title,sub){playing=false;finished=true;$('#arcade-overlay',el).classList.remove('hidden');$('#arcade-overlay',el).innerHTML='<h2>'+title+'</h2><p>'+sub+'<br>Tap the court to play again.</p>';}
  function draw(t,dt){if(!paused){paddle=Math.max(65,Math.min(W-65,paddle+((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*650));if(!playing)ball.x=paddle;
      if(playing){const ox=ball.x,oy=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
        if(ball.x<8){ball.x=8;ball.vx=Math.abs(ball.vx);}if(ball.x>W-8){ball.x=W-8;ball.vx=-Math.abs(ball.vx);}if(ball.y<8){ball.y=8;ball.vy=Math.abs(ball.vy);}
        if(ball.vy>0&&ball.y+8>=H-30&&oy+8<=H-30&&Math.abs(ball.x-paddle)<73){ball.y=H-39;const offset=Math.max(-1,Math.min(1,(ball.x-paddle)/65));ball.vx=offset*300;ball.vy=-Math.sqrt(360*360-ball.vx*ball.vx);}
        for(const b of bricks)if(b.alive&&ball.x+7>b.x&&ball.x-7<b.x+b.w&&ball.y+7>b.y&&ball.y-7<b.y+b.h){b.alive=false;score+=10;if(ox+7<=b.x||ox-7>=b.x+b.w)ball.vx*=-1;else ball.vy*=-1;break;}
        if(ball.y>H+8){lives--;resetBall();if(!lives)end('A good little run.','FINAL SCORE / '+score);}
        if(bricks.every(b=>!b.alive))end('Every brick. Beautiful.','PERFECT CLEAR / '+score);
      }}
    ctx.fillStyle='#182440';ctx.fillRect(0,0,W,H);ctx.fillStyle='#263555';for(let x=20;x<W;x+=30)for(let y=20;y<H;y+=30)ctx.fillRect(x,y,1,1);
    for(const b of bricks)if(b.alive){ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(b.x,b.y,b.w,3);}ctx.fillStyle='#e5efc3';ctx.fillRect(paddle-65,H-30,130,11);ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,TAU);ctx.fill();
    const label='SCORE '+String(score).padStart(3,'0')+' / '+lives+' LIVES'+(paused?' / PAUSED':'');
    if($('#arcade-score',el).textContent!==label)$('#arcade-score',el).textContent=label;
  }
  reset();draw(0,0);const stop=loop(draw);return()=>{stop();document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearKeys);};
}
