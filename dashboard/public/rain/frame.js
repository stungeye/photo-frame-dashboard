// This edition never loads audio.js or requests audio input/output.
(() => {
  const $=id=>document.getElementById(id);
  window.addEventListener('error',()=>{$('error').style.display='block';});
  const profiles={cinema:'Source',abyss:'Deep',voltage:'Voltage',anomaly:'Anomaly'};
  function update(){const s=getRainOptions();$('pause').textContent=s.paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(s.paused));$('mode').textContent=s.mode==='rain'?'Enter tunnel':'Return to rain';$('grade').textContent='Signal: '+profiles[s.grade];$('crt').textContent='CRT: '+({off:'Flat',scan:'Scanlines'})[s.crt];}
  $('pause').onclick=()=>setRainOption('paused',!getRainOptions().paused);
  $('mode').onclick=()=>setRainOption('mode',getRainOptions().mode==='rain'?'tunnel':'rain');
  $('grade').onclick=()=>{const keys=Object.keys(profiles);setRainOption('grade',keys[(keys.indexOf(getRainOptions().grade)+1)%keys.length]);};
  $('crt').onclick=()=>{const keys=['off','scan'];setRainOption('crt',keys[(keys.indexOf(getRainOptions().crt)+1)%keys.length]);};
  $('surge').onclick=()=>signalRain();$('reseed').onclick=()=>reseedRain();
  $('fill').onclick=()=>parent.postMessage('frame-cinema',location.origin);
  document.addEventListener('pointerdown',()=>parent.postMessage('frame-interaction',location.origin),true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')parent.postMessage('frame-cinema',location.origin);if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();$('pause').click();}});
  window.addEventListener('rain-state',update);
  let previous=0,last=performance.now();
  setInterval(()=>{const t=performance.now(),frames=RainApp.renderedFrames,rate=Math.round((frames-previous)*1000/(t-last));$('fps').textContent=getRainOptions().paused?'SIGNAL HELD':rate+' FPS / SILENT';previous=frames;last=t;},2000);
  installRainCanvasRuntime();update();
})();
