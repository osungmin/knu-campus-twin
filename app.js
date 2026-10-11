(() => {
'use strict';
const cfg = window.KNU_CONFIG || {};
const campus = cfg.campusCenter || {lat:37.86721,lng:127.74482};
const $ = id => document.getElementById(id);
const M_PER_DEG = 111320;
const SIGMA0 = 45; // meters; initial Gaussian standard deviation
const state = { D:180, u:9, angle:90, time:0, source:{...(cfg.initialSource||campus)}, sensor:null, mode:'source' };
let adapter=null, playTimer=null, drawPending=false;
const canvas=$('plume'), ctx=canvas.getContext('2d',{willReadFrequently:false});

function windComponents(){const r=state.angle*Math.PI/180;return {east:state.u*Math.sin(r),north:state.u*Math.cos(r)};}
function sigma(){return Math.sqrt(SIGMA0*SIGMA0+2*state.D*state.time);}
function centerLocation(){
  const w=windComponents();
  return {lat:state.source.lat+w.north*state.time/M_PER_DEG,
    lng:state.source.lng+w.east*state.time/(M_PER_DEG*Math.cos(state.source.lat*Math.PI/180))};
}
function concentrationAt(pos){
  const c=centerLocation(), s=sigma();
  const dx=(pos.lng-c.lng)*M_PER_DEG*Math.cos(c.lat*Math.PI/180);
  const dy=(pos.lat-c.lat)*M_PER_DEG;
  return (SIGMA0*SIGMA0/(s*s))*Math.exp(-(dx*dx+dy*dy)/(2*s*s));
}
function compass(deg){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg/45)%8];}
function syncUI(){
  $('D-val').textContent=`${state.D} m²/min`;
  $('u-val').textContent=`${state.u} m/min`;
  $('angle-val').textContent=`${state.angle}° · ${compass(state.angle)}`;
  $('time-val').textContent=`${state.time.toFixed(state.time%1?1:0)} min`;
  $('dist').textContent=`${(state.u*state.time).toFixed(0)} m`;
  $('spread').textContent=`${sigma().toFixed(1)} m`;
  $('peak').textContent=`${(100*SIGMA0*SIGMA0/(sigma()*sigma())).toFixed(1)}%`;
  $('reading').textContent=state.sensor?concentrationAt(state.sensor).toFixed(3):'—';
  for(const id of ['D','u','angle','time'])$(id).value=state[id];
  scheduleDraw();
}
function setMode(mode){
  state.mode=mode;
  $('source').classList.toggle('selected',mode==='source');
  $('sensor').classList.toggle('selected',mode==='sensor');
  $('hint').textContent=mode==='source'?'지도를 클릭하면 가상 오염원이 이동합니다.':'지도를 클릭하면 가상 관측 지점이 이동합니다.';
}
function onMapClick(pos){
  if(state.mode==='source'){state.source=pos;state.time=0;pause();}
  else state.sensor=pos;
  syncUI();
}
function updatePins(){
  if(!adapter)return;
  for(const [id,pos] of [['source-pin',state.source],['sensor-pin',state.sensor]]){
    const node=$(id);
    if(!pos){node.style.display='none';continue;}
    const p=adapter.project(pos.lat,pos.lng);
    node.style.display='flex';node.style.left=`${p.x}px`;node.style.top=`${p.y}px`;
  }
}
function palette(z){
  const stops=[[0.0,36,116,213],[0.28,27,189,218],[0.55,255,222,92],[0.8,249,121,57],[1.0,220,40,63]];
  for(let k=1;k<stops.length;k++)if(z<=stops[k][0]){
    const a=stops[k-1],b=stops[k],f=(z-a[0])/(b[0]-a[0]);
    return [Math.round(a[1]+(b[1]-a[1])*f),Math.round(a[2]+(b[2]-a[2])*f),Math.round(a[3]+(b[3]-a[3])*f)];
  }
  return [220,40,63];
}
function draw(){
  drawPending=false;
  if(!adapter)return;
  const wrap=$('map-wrap'), width=wrap.clientWidth, height=wrap.clientHeight;
  if(width<1||height<1)return;
  const scale=Math.min(.62,680/width);
  const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  canvas.style.width=width+'px';canvas.style.height=height+'px';
  const center=centerLocation(), p=adapter.project(center.lat,center.lng);
  const latR=center.lat*Math.PI/180;
  const east=adapter.project(center.lat,center.lng+100/(M_PER_DEG*Math.cos(latR)));
  const north=adapter.project(center.lat+100/M_PER_DEG,center.lng);
  const pxmX=Math.max(.0001,Math.hypot(east.x-p.x,east.y-p.y)/100)*scale;
  const pxmY=Math.max(.0001,Math.hypot(north.x-p.x,north.y-p.y)/100)*scale;
  const cx=p.x*scale,cy=p.y*scale,s=sigma(),peak=SIGMA0*SIGMA0/(s*s);
  const image=ctx.createImageData(w,h), data=image.data;
  const x0=Math.max(0,Math.floor(cx-3.8*s*pxmX)),x1=Math.min(w,Math.ceil(cx+3.8*s*pxmX));
  const y0=Math.max(0,Math.floor(cy-3.8*s*pxmY)),y1=Math.min(h,Math.ceil(cy+3.8*s*pxmY));
  for(let y=y0;y<y1;y++){
    const dy=(y-cy)/pxmY,dy2=dy*dy;
    for(let x=x0;x<x1;x++){
      const dx=(x-cx)/pxmX,z=Math.exp(-(dx*dx+dy2)/(2*s*s));
      if(z<.012)continue;
      const i=(y*w+x)*4,col=palette(z);
      data[i]=col[0];data[i+1]=col[1];data[i+2]=col[2];
      data[i+3]=Math.min(220,Math.round(200*Math.sqrt(peak)*Math.pow(z,.65)));
    }
  }
  ctx.putImageData(image,0,0);
  updatePins();
}
function scheduleDraw(){if(!drawPending){drawPending=true;requestAnimationFrame(draw);}}
function initOSM(){
  if(!window.L){$('status').textContent='MAP ERROR · Leaflet could not load';return;}
  const map=L.map('map',{zoomControl:false,scrollWheelZoom:true}).setView([campus.lat,campus.lng],17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.control.zoom({position:'bottomleft'}).addTo(map);
  map.on('click',e=>onMapClick({lat:e.latlng.lat,lng:e.latlng.lng}));
  for(const event of ['move','zoom','resize'])map.on(event,scheduleDraw);
  adapter={project:(lat,lng)=>map.latLngToContainerPoint([lat,lng]),
    recenter:()=>map.setView([campus.lat,campus.lng],17)};
  $('provider').textContent='OpenStreetMap';
  $('status').textContent='● MODEL READY · OPEN MAP';
  setTimeout(()=>{map.invalidateSize();syncUI();},120);
}
function initNaver(){
  if(!window.naver?.maps){initOSM();return;}
  try{
    const n=naver.maps;
    const map=new n.Map('map',{
      center:new n.LatLng(campus.lat,campus.lng),zoom:17,
      mapTypeId:n.MapTypeId.HYBRID,mapTypeControl:true,zoomControl:true,
      zoomControlOptions:{position:n.Position.BOTTOM_LEFT}
    });
    n.Event.addListener(map,'click',e=>onMapClick({lat:e.coord.lat(),lng:e.coord.lng()}));
    for(const event of ['bounds_changed','idle','zoom_changed'])n.Event.addListener(map,event,scheduleDraw);
    adapter={project:(lat,lng)=>map.getProjection().fromCoordToOffset(new n.LatLng(lat,lng)),
      recenter:()=>{map.setCenter(new n.LatLng(campus.lat,campus.lng));map.setZoom(17);}};
    $('provider').textContent='NAVER · HYBRID';
    $('status').textContent='● MODEL READY · SATELLITE';
    setTimeout(syncUI,500);
  }catch(err){console.error(err);$('map').innerHTML='';initOSM();}
}
function loadMap(){
  const id=(cfg.naverClientId||'').trim();
  if(cfg.mapProvider!=='naver'||!id){initOSM();return;}
  let done=false;
  function fallback(){if(done)return;done=true;$('map').innerHTML='';initOSM();$('status').textContent='● NAVER unavailable · OpenStreetMap fallback';}
  window.navermap_authFailure=fallback;
  window.knuNaverReady=()=>{if(done)return;done=true;initNaver();};
  const script=document.createElement('script');
  script.src=`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(id)}&callback=knuNaverReady`;
  script.onerror=fallback;
  document.head.appendChild(script);
  setTimeout(fallback,9000);
}
function pause(){
  if(playTimer!==null){clearInterval(playTimer);playTimer=null;}
  $('play').textContent='▶ Play';
}
function play(){
  if(playTimer!==null){pause();return;}
  if(state.time>=60)state.time=0;
  $('play').textContent='Ⅱ Pause';
  playTimer=setInterval(()=>{
    state.time=Math.min(60,state.time+.5);
    syncUI();
    if(state.time>=60)pause();
  },160);
}
function reset(){
  pause();
  Object.assign(state,{D:180,u:9,angle:90,time:0,source:{...(cfg.initialSource||campus)},sensor:null});
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('selected',b.dataset.preset==='both'));
  setMode('source');syncUI();
}
function bind(){
  for(const id of ['D','u','angle','time']){
    $(id).addEventListener('input',e=>{
      state[id]=Number(e.target.value);
      if(id!=='time')document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('selected'));
      syncUI();
    });
  }
  $('play').addEventListener('click',play);
  $('reset').addEventListener('click',reset);
  $('source').addEventListener('click',()=>setMode('source'));
  $('sensor').addEventListener('click',()=>setMode('sensor'));
  $('home').addEventListener('click',()=>adapter?.recenter());
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
    pause();
    const name=b.dataset.preset;
    if(name==='diff')Object.assign(state,{D:220,u:0,angle:90,time:25});
    if(name==='both')Object.assign(state,{D:180,u:9,angle:90,time:25});
    if(name==='wind')Object.assign(state,{D:140,u:24,angle:90,time:25});
    document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('selected',x===b));
    syncUI();
  }));
  if(window.ResizeObserver)new ResizeObserver(scheduleDraw).observe($('map-wrap'));
  window.addEventListener('resize',scheduleDraw);
}
bind();loadMap();syncUI();
})();
