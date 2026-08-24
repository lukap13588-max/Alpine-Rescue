const STORAGE_KEY = 'alpineRescueSave_v1';

const incidentTemplates = [
  { type:'Skiunfall', icon:'⛷️', priority:'urgent', location:'Hahnenkamm', patient:'31 J., männlich', note:'Sturz bei hoher Geschwindigkeit, starke Schmerzen im Bein.', reward:820, rep:4, required:['RTW'], x:76, y:36, travel:22 },
  { type:'Wanderer gestürzt', icon:'🥾', priority:'normal', location:'Wilder Kaiser', patient:'54 J., weiblich', note:'Knöchelverletzung auf schmalem Steig.', reward:560, rep:3, required:['BERG'], x:43, y:26, travel:26 },
  { type:'Lawinenabgang', icon:'🏔️', priority:'critical', location:'Kitzbüheler Horn', patient:'2 Vermisste', note:'Mehrere Notrufe. Verschüttung nicht ausgeschlossen.', reward:1650, rep:8, required:['BERG','HELI'], x:67, y:22, travel:30 },
  { type:'Verkehrsunfall', icon:'🚗', priority:'urgent', location:'Pass Thurn', patient:'42 J., männlich', note:'Frontalkollision, Patient ansprechbar.', reward:930, rep:5, required:['RTW','NEF'], x:83, y:55, travel:18 },
  { type:'Herz-Kreislauf', icon:'❤️', priority:'critical', location:'St. Johann', patient:'67 J., männlich', note:'Brustschmerz, Atemnot, kalter Schweiß.', reward:1120, rep:6, required:['RTW','NEF'], x:60, y:63, travel:13 },
  { type:'Mountainbike-Sturz', icon:'🚵', priority:'urgent', location:'Bichlach', patient:'27 J., weiblich', note:'Sturz im Gelände, Verdacht auf Schulterluxation.', reward:690, rep:4, required:['RTW'], x:49, y:49, travel:16 },
  { type:'Kletterunfall', icon:'🧗', priority:'critical', location:'Kaisergebirge', patient:'35 J., männlich', note:'Sturz ins Seil, bewusstseinsgetrübt.', reward:1450, rep:7, required:['HELI'], x:30, y:17, travel:28 },
  { type:'Unterkühlung', icon:'❄️', priority:'urgent', location:'Steinplatte', patient:'19 J., weiblich', note:'Erschöpft, stark frierend, Orientierung eingeschränkt.', reward:740, rep:4, required:['BERG'], x:22, y:32, travel:24 }
];

const vehicleCatalog = {
  RTW: { name:'Rettungswagen', icon:'🚑', price:8500, staff:2, desc:'Notfallrettung und Patiententransport', speed:1.0 },
  NEF: { name:'Notarzteinsatzfahrzeug', icon:'🚙', price:12000, staff:2, desc:'Notarzt und erweitertes Notfallmaterial', speed:1.15 },
  BERG:{ name:'Bergrettung', icon:'🧗', price:10500, staff:3, desc:'Geländefähiges Team für alpine Einsätze', speed:.9 },
  HELI:{ name:'Rettungshubschrauber', icon:'🚁', price:65000, staff:4, desc:'Schnelle Luftrettung in schwerem Gelände', speed:1.7 }
};

const upgrades = [
  { id:'garage', name:'Garage erweitern', desc:'+1 Fahrzeugkapazität', base:4500, max:4 },
  { id:'comms', name:'Leitstelle digitalisieren', desc:'Einsätze bringen +8 % mehr Geld', base:3800, max:4 },
  { id:'training', name:'Trainingszentrum', desc:'+5 % Einsatzerfolg pro Stufe', base:5200, max:4 },
  { id:'helipad', name:'Helipad ausbauen', desc:'Hubschrauber-Einsatzzeit -10 %', base:9000, max:3 }
];

const defaultState = () => ({
  mode:'career', money:12500, rep:38, level:2, stationLevel:1,
  weather:'🌤️', temp:7, gameMinutes:17*60+42,
  incidents:[], activeMissions:[], completed:0,
  vehicles:[
    { id:'v1', type:'RTW', name:'RTW 1', status:'ready', missionId:null },
    { id:'v2', type:'NEF', name:'NEF 1', status:'ready', missionId:null },
    { id:'v3', type:'BERG', name:'Berg 1', status:'ready', missionId:null }
  ],
  upgrades:{garage:0,comms:0,training:0,helipad:0},
  missions:{ first3:0, critical:0, money:0 }
});

let state = loadState();
let selectedResources = [];
let incidentSeq = Date.now();
let toastTimer;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const d = defaultState();
    return {...d, ...parsed, upgrades:{...d.upgrades,...parsed.upgrades}, missions:{...d.missions,...parsed.missions}};
  } catch { return defaultState(); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(n){ return Math.round(n).toLocaleString('de-DE') + ' €'; }
function nowClock(){ const h=Math.floor(state.gameMinutes/60)%24, m=state.gameMinutes%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function priorityLabel(p){ return p==='critical'?'KRITISCH':p==='urgent'?'DRINGEND':'NORMAL'; }
function priorityColor(p){ return p==='critical'?'#ff5f6d':p==='urgent'?'#ffb44b':'#43d6c5'; }
function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2800); }
function haptic(){ if(navigator.vibrate) navigator.vibrate(25); }

function seedIncidents(){
  if(state.incidents.length) return;
  addIncident(4); addIncident(1); addIncident(0);
}
function addIncident(templateIndex=Math.floor(Math.random()*incidentTemplates.length)){
  if(state.incidents.length >= 5) return;
  const t=incidentTemplates[templateIndex];
  const id='i'+(++incidentSeq);
  const jitter=()=>Math.round((Math.random()*8-4)*10)/10;
  state.incidents.push({...t,id,createdAt:Date.now(),x:Math.max(8,Math.min(92,t.x+jitter())),y:Math.max(10,Math.min(82,t.y+jitter()))});
  saveState(); renderAll();
  if(state.incidents.length>1) showToast(`📟 Neuer Einsatz: ${t.type} – ${t.location}`);
}

function renderTop(){
  $('#money').textContent=state.mode==='sandbox'?'∞':Math.round(state.money).toLocaleString('de-DE');
  $('#rep').textContent=state.rep;
  $('#weatherIcon').textContent=state.weather;
  $('#weatherText').textContent=`${state.temp}°C`;
  $('#clock').textContent=nowClock();
}

function renderMap(){
  const layer=$('#incidentLayer'); layer.innerHTML='';
  state.incidents.forEach(i=>{
    const b=document.createElement('button');
    b.className=`incident-marker ${i.priority}`; b.style.left=i.x+'%'; b.style.top=i.y+'%';
    b.innerHTML=`<span class="ring"><span class="symbol">${i.icon}</span></span>`;
    b.setAttribute('aria-label',`${i.type} in ${i.location}`);
    b.onclick=()=>openIncident(i.id); layer.appendChild(b);
  });
  const vlayer=$('#vehicleLayer'); vlayer.innerHTML='';
  state.activeMissions.forEach(m=>{
    m.vehicleIds.forEach((vid,idx)=>{
      const v=state.vehicles.find(x=>x.id===vid); if(!v) return;
      const inc=m.incidentSnapshot;
      const elapsed=(Date.now()-m.startedAt)/1000;
      const pct=Math.min(1,elapsed/m.durationSec);
      const sx=23, sy=69;
      const x=sx+(inc.x-sx)*pct, y=sy+(inc.y-sy)*pct;
      const d=document.createElement('div'); d.className='vehicle-dot'; d.style.left=(x+idx*1.3)+'%'; d.style.top=(y+idx*1.1)+'%'; d.textContent=vehicleCatalog[v.type].icon; vlayer.appendChild(d);
    });
  });
}

function renderIncidentList(){
  const list=$('#incidentList'); $('#incidentCount').textContent=state.incidents.length;
  if(!state.incidents.length){ list.innerHTML='<div class="empty-state">Aktuell keine offenen Einsätze.<br>Die Leitstelle wartet auf neue Meldungen.</div>'; return; }
  list.innerHTML=state.incidents.map(i=>`
    <button class="incident-card" data-id="${i.id}" style="width:100%;color:inherit;text-align:left">
      <div class="incident-icon">${i.icon}</div>
      <div><h3>${i.type}</h3><p>${i.location} · ${i.patient}</p></div>
      <div class="priority ${i.priority}" title="${priorityLabel(i.priority)}"></div>
    </button>`).join('');
  $$('.incident-card').forEach(b=>b.onclick=()=>openIncident(b.dataset.id));
}

function renderFleet(){
  $('#fleetList').innerHTML=state.vehicles.map(v=>{
    const c=vehicleCatalog[v.type];
    return `<div class="fleet-card">
      <div class="vehicle-visual">${c.icon}</div>
      <div><div class="fleet-meta"><div><h3>${v.name}</h3><p>${c.name}</p></div><span class="availability ${v.status==='ready'?'ready':'busy'}">${v.status==='ready'?'BEREIT':'IM EINSATZ'}</span></div>
      <div class="vehicle-bar"><span class="on"></span><span class="on"></span><span class="on"></span><span class="${state.upgrades.training>1?'on':''}"></span><span class="${state.upgrades.training>2?'on':''}"></span></div></div>
    </div>`;
  }).join('');
}

function renderStation(){
  const cap=4+state.upgrades.garage;
  $('#stationLevel').textContent=1+Math.floor(Object.values(state.upgrades).reduce((a,b)=>a+b,0)/3);
  $('#staffStat').textContent=state.vehicles.reduce((sum,v)=>sum+vehicleCatalog[v.type].staff,0);
  $('#vehicleStat').textContent=state.vehicles.length;
  $('#capacityStat').textContent=`${state.vehicles.length}/${cap}`;
  $('#upgradeList').innerHTML=upgrades.map(u=>{
    const lvl=state.upgrades[u.id], cost=Math.round(u.base*(1+lvl*.72));
    return `<div class="upgrade-card"><div><h3>${u.name} <span style="color:#43d6c5;font-size:10px">LVL ${lvl}/${u.max}</span></h3><p>${u.desc}</p></div>
      <button class="upgrade-btn" data-up="${u.id}" ${lvl>=u.max?'disabled':''}>${lvl>=u.max?'MAX':money(cost)}</button></div>`;
  }).join('');
  $$('[data-up]').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.up));
}

function renderCareer(){
  const lvl=Math.max(1,Math.floor(state.rep/25)+1); state.level=lvl;
  const names=['Anwärter','Einsatzleiter','Wachleiter','Bezirksleiter','Alpin-Kommandant','Rettungsdirektor'];
  const name=names[Math.min(names.length-1,lvl-1)]; const inLvl=state.rep%25; const next=25-inLvl;
  $('#rankLevel').textContent=lvl; $('#rankName').textContent=name;
  $('#rankProgressText').textContent=`Noch ${next} Ruf bis zum nächsten Rang.`;
  $('#rankProgress').style.width=(inLvl/25*100)+'%';
  const m=[
    {icon:'✅',name:'Erste Schicht',desc:`${Math.min(state.completed,3)}/3 Einsätze erfolgreich`,reward:'+1.000 €',done:state.completed>=3},
    {icon:'🚨',name:'Roter Alarm',desc:`${Math.min(state.missions.critical,2)}/2 kritische Einsätze`,reward:'+8 Ruf',done:state.missions.critical>=2},
    {icon:'💰',name:'Station aufbauen',desc:`${Math.min(state.missions.money,5000).toLocaleString('de-DE')}/5.000 € verdienen`,reward:'+2.500 €',done:state.missions.money>=5000}
  ];
  $('#missionList').innerHTML=m.map(x=>`<div class="mission-card" style="opacity:${x.done?'.55':'1'}"><div>${x.icon}</div><div><h3>${x.name}</h3><p>${x.desc}</p></div><div class="reward">${x.done?'✓':x.reward}</div></div>`).join('');
}

function renderAll(){ renderTop(); renderMap(); renderIncidentList(); renderFleet(); renderStation(); renderCareer(); }

function openModal(html){ $('#modal').innerHTML=`<div class="handle"></div>${html}`; $('#modalBackdrop').classList.remove('hidden'); $('#modal').classList.remove('hidden'); $('#modalBackdrop').onclick=closeModal; const cb=$('#modal .close-btn'); if(cb) cb.onclick=closeModal; }
function closeModal(){ $('#modalBackdrop').classList.add('hidden'); $('#modal').classList.add('hidden'); selectedResources=[]; }

function openIncident(id){
  haptic(); const i=state.incidents.find(x=>x.id===id); if(!i) return;
  selectedResources=[];
  const requiredText=i.required.map(t=>vehicleCatalog[t].name).join(' + ');
  const options=state.vehicles.map(v=>{ const c=vehicleCatalog[v.type]; return `<button class="resource-option" data-vid="${v.id}" ${v.status!=='ready'?'disabled':''}><span class="r-icon">${c.icon}</span><div><strong>${v.name}</strong><small>${c.name} · ${v.status==='ready'?'bereit':'bereits im Einsatz'}</small></div></button>`; }).join('');
  openModal(`<div class="modal-head"><div><div class="eyebrow" style="color:${priorityColor(i.priority)}">${priorityLabel(i.priority)} · ${i.location}</div><h2>${i.icon} ${i.type}</h2></div><button class="close-btn">×</button></div>
    <p style="color:#a6bbc0;font-size:13px;line-height:1.55;margin:4px 0">${i.note}</p>
    <div class="patient-card"><div class="patient-line"><span style="font-weight:850">Patient</span><strong>${i.patient}</strong></div><div class="vitals"><div><span>PULS</span><strong>${i.priority==='critical'?118:i.priority==='urgent'?96:82}</strong></div><div><span>SpO₂</span><strong>${i.priority==='critical'?91:97}%</strong></div><div><span>GCS</span><strong>${i.priority==='critical'?12:15}</strong></div></div></div>
    <div class="detail-grid"><div class="detail-box"><span>Empfohlen</span><strong>${requiredText}</strong></div><div class="detail-box"><span>Belohnung</span><strong>${money(effectiveReward(i.reward))}</strong></div><div class="detail-box"><span>Entfernung</span><strong>${(i.travel*.55).toFixed(1)} km</strong></div><div class="detail-box"><span>Ruf</span><strong>+${i.rep}</strong></div></div>
    <div class="resource-title">Einsatzmittel auswählen</div><div class="resource-select">${options}</div>
    <button id="dispatchBtn" class="primary-btn" disabled>Einsatz starten</button>`);
  $$('.resource-option').forEach(b=>b.onclick=()=>{ const id=b.dataset.vid; if(selectedResources.includes(id)){selectedResources=selectedResources.filter(x=>x!==id);b.classList.remove('selected')}else{selectedResources.push(id);b.classList.add('selected')} $('#dispatchBtn').disabled=selectedResources.length===0; });
  $('#dispatchBtn').onclick=()=>dispatchIncident(i.id);
}

function effectiveReward(base){ return Math.round(base*(1+state.upgrades.comms*.08)); }
function missionDuration(i, vehicles){
  let best=Math.max(...vehicles.map(v=>vehicleCatalog[v.type].speed));
  let sec=Math.max(7, Math.round(i.travel / best));
  if(vehicles.some(v=>v.type==='HELI')) sec=Math.round(sec*(1-state.upgrades.helipad*.10));
  return sec;
}

function dispatchIncident(id){
  const i=state.incidents.find(x=>x.id===id); if(!i) return;
  const vs=state.vehicles.filter(v=>selectedResources.includes(v.id) && v.status==='ready'); if(!vs.length) return;
  vs.forEach(v=>{v.status='busy';v.missionId=id});
  state.incidents=state.incidents.filter(x=>x.id!==id);
  const durationSec=missionDuration(i,vs);
  state.activeMissions.push({id:'m'+Date.now(),incidentId:id,incidentSnapshot:i,vehicleIds:vs.map(v=>v.id),startedAt:Date.now(),durationSec});
  saveState(); closeModal(); renderAll(); showToast(`🚨 ${vs.map(v=>v.name).join(' + ')} ausgerückt · ETA ${durationSec}s`); haptic();
}

function completeMission(m){
  const i=m.incidentSnapshot; const vs=state.vehicles.filter(v=>m.vehicleIds.includes(v.id));
  const sentTypes=vs.map(v=>v.type); const requiredMet=i.required.every(r=>sentTypes.includes(r));
  let chance=.76 + state.upgrades.training*.05 + (requiredMet?.16:-.12);
  if(i.priority==='critical') chance-=.05; chance=Math.max(.35,Math.min(.98,chance));
  const success=Math.random()<chance;
  vs.forEach(v=>{v.status='ready';v.missionId=null});
  state.activeMissions=state.activeMissions.filter(x=>x.id!==m.id);
  if(success){
    const reward=effectiveReward(i.reward); if(state.mode!=='sandbox') state.money+=reward; state.rep+=i.rep; state.completed++; state.missions.money+=reward; if(i.priority==='critical') state.missions.critical++;
    showResult(i,true,reward,requiredMet);
  } else { state.rep=Math.max(0,state.rep-2); showResult(i,false,0,requiredMet); }
  saveState(); renderAll();
}

function showResult(i,success,reward,requiredMet){
  haptic();
  openModal(`<div class="modal-head"><div><div class="eyebrow">EINSATZ ABGESCHLOSSEN</div><h2>${success?'✅ Patient versorgt':'⚠️ Einsatz schwierig'}</h2></div><button class="close-btn">×</button></div>
    <div style="font-size:46px;text-align:center;padding:12px 0">${success?'🏥':'🚨'}</div>
    <p style="text-align:center;color:#a6bbc0;line-height:1.55">${success?`Der Einsatz <strong style="color:white">${i.type}</strong> wurde erfolgreich abgeschlossen.`:`Der Patient konnte nur eingeschränkt versorgt werden. Prüfe beim nächsten Einsatz die empfohlenen Einsatzmittel.`}</p>
    <div class="detail-grid"><div class="detail-box"><span>Vergütung</span><strong>${success?money(reward):'0 €'}</strong></div><div class="detail-box"><span>Ruf</span><strong>${success?'+'+i.rep:'-2'}</strong></div><div class="detail-box"><span>Einsatzmittel</span><strong>${requiredMet?'Optimal':'Suboptimal'}</strong></div><div class="detail-box"><span>Bilanz</span><strong>${state.completed} Erfolge</strong></div></div>
    <button class="primary-btn" id="resultOk">Zur Leitstelle</button>`);
  $('#resultOk').onclick=closeModal;
}

function buyUpgrade(id){
  const u=upgrades.find(x=>x.id===id); const lvl=state.upgrades[id]; if(!u||lvl>=u.max)return;
  const cost=Math.round(u.base*(1+lvl*.72)); if(state.mode!=='sandbox' && state.money<cost){showToast('💶 Dafür reicht dein Budget noch nicht.');return;}
  if(state.mode!=='sandbox') state.money-=cost; state.upgrades[id]++; saveState(); renderAll(); showToast(`⬆️ ${u.name} auf Stufe ${state.upgrades[id]}`);
}

function openVehicleShop(){
  const cap=4+state.upgrades.garage;
  const cards=Object.entries(vehicleCatalog).map(([type,c])=>`<button class="resource-option shop-option" data-type="${type}"><span class="r-icon">${c.icon}</span><div><strong>${c.name}</strong><small>${c.desc}</small></div><strong style="color:#43d6c5">${money(c.price)}</strong></button>`).join('');
  openModal(`<div class="modal-head"><div><div class="eyebrow">FAHRZEUGHÄNDLER</div><h2>Flotte erweitern</h2></div><button class="close-btn">×</button></div><p style="color:#8ea7ad;font-size:12px">Kapazität: ${state.vehicles.length}/${cap} Fahrzeuge</p><div class="resource-select">${cards}</div>`);
  $$('.shop-option').forEach(b=>b.onclick=()=>buyVehicle(b.dataset.type));
}
function buyVehicle(type){
  const c=vehicleCatalog[type], cap=4+state.upgrades.garage;
  if(state.vehicles.length>=cap){showToast('🏠 Garage voll – zuerst Station erweitern.');return;}
  if(state.mode!=='sandbox'&&state.money<c.price){showToast('💶 Budget reicht nicht.');return;}
  if(state.mode!=='sandbox') state.money-=c.price;
  const count=state.vehicles.filter(v=>v.type===type).length+1;
  state.vehicles.push({id:'v'+Date.now(),type,name:(type==='BERG'?'Bergrettung ':type+' ')+count,status:'ready',missionId:null});
  saveState(); closeModal(); renderAll(); showToast(`${c.icon} ${c.name} gekauft.`);
}

function openSettings(){
  openModal(`<div class="modal-head"><div><div class="eyebrow">SPIELEINSTELLUNGEN</div><h2>Alpine Rescue</h2></div><button class="close-btn">×</button></div>
    <div class="resource-title">Spielmodus</div><div class="mode-toggle"><button data-mode="career" class="${state.mode==='career'?'active':''}">Karriere</button><button data-mode="sandbox" class="${state.mode==='sandbox'?'active':''}">Sandbox ∞</button></div>
    <p style="color:#8ea7ad;font-size:12px;line-height:1.55">Im Sandbox-Modus kostet der Ausbau kein Geld. Fortschritt und Einsätze laufen trotzdem weiter.</p>
    <button id="newIncidentBtn" class="secondary-btn">📟 Test-Einsatz erzeugen</button><button id="resetBtn" class="secondary-btn" style="color:#ff8b95">Spielstand zurücksetzen</button>
    <div style="text-align:center;color:#59737a;font-size:9px;margin-top:18px">ALPINE RESCUE · MOBILE PROTOTYPE 0.1</div>`);
  $$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;saveState();closeModal();renderAll();showToast(state.mode==='sandbox'?'🧪 Sandbox aktiviert':'🏔️ Karriere aktiviert')});
  $('#newIncidentBtn').onclick=()=>{closeModal();addIncident();};
  $('#resetBtn').onclick=()=>{ if(confirm('Spielstand wirklich zurücksetzen?')){state=defaultState();localStorage.removeItem(STORAGE_KEY);seedIncidents();closeModal();renderAll();showToast('Spielstand zurückgesetzt.');} };
}

function gameTick(){
  state.gameMinutes=(state.gameMinutes+1)%(24*60);
  const now=Date.now(); [...state.activeMissions].forEach(m=>{ if((now-m.startedAt)/1000>=m.durationSec) completeMission(m); });
  renderTop(); renderMap();
  if(Math.random()<.012 && state.incidents.length<4) addIncident();
  if(Math.random()<.005){ const w=[['☀️',11],['🌤️',7],['🌧️',5],['🌨️',1],['🌫️',4]][Math.floor(Math.random()*5)]; state.weather=w[0];state.temp=w[1]; }
  saveState();
}

$$('.nav-btn').forEach(btn=>btn.onclick=()=>{
  haptic(); $$('.nav-btn').forEach(x=>x.classList.toggle('active',x===btn)); $$('.view').forEach(v=>v.classList.toggle('active',v.id===btn.dataset.view)); window.scrollTo({top:0,behavior:'smooth'});
});
$('#settingsBtn').onclick=openSettings;
$('#buyVehicleBtn').onclick=openVehicleShop;

seedIncidents(); renderAll();
setInterval(gameTick,1000);

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
