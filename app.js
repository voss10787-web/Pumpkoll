const plannedOpenGroups={};
let jobKindFilter='all';
'use strict';
const $=s=>document.querySelector(s), key='pumpkoll-v1';let db={jobs:[]},tab='live',detail=null,volume=7;
try{const raw=localStorage.getItem(key);if(raw){const d=JSON.parse(raw);if(!Array.isArray(d.jobs))throw Error();db=d}}catch(e){$('#notice').textContent='Kunde inte läsa sparade jobb. Exportera eller kontrollera lagringen innan du registrerar nytt.';$('#notice').style.display='block'}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(key,JSON.stringify(db));return true}catch(e){alert('Kunde inte spara. Exportera en säkerhetskopia innan du stänger appen.');return false}}
const time=t=>t?new Date(t).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
const date=t=>new Date(t).toLocaleDateString('sv-SE');const num=n=>n.toLocaleString('sv-SE',{maximumFractionDigits:1});
const dur=ms=>{let s=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(s/3600)?Math.floor(s/3600)+' h ':''}${Math.floor(s/60)%60} min ${s%60} s`};
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));const active=()=>db.jobs.find(j=>!j.end&&!j.planned&&!j.deleted);
function metrics(j,now=Date.now()){const end=j.end||now,done=j.trucks.filter(t=>t.empty),intervals=j.trucks.filter(t=>t.start).map(t=>[Math.max(j.start,t.start),Math.min(end,t.empty||end)]).sort((a,b)=>a[0]-b[0]);let pumping=0,last=j.start;for(const [a,b] of intervals){if(b>a){pumping+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b)}}const elapsed=Math.max(0,end-j.start),v=done.reduce((s,t)=>s+t.volume,0);return {v,pumping,elapsed,wait:Math.max(0,elapsed-pumping),rate:pumping?v*3600000/pumping:0,totalRate:elapsed?v*3600000/elapsed:0,done:done.length}}
const metric=(label,value,unit='')=>`<div class="metric"><small>${label}</small><strong>${value}</strong><small>${unit}</small></div>`;
function summary(j){const m=metrics(j);return `<div class="grid">${metric('Pumpad betong',num(m.v),'m³ · endast tömda bilar')}${metric('Väntetid',dur(m.wait),'utan pågående lossning')}${metric('Under lossning',num(m.rate),'m³/h · registrerad volym')}${metric('Hela jobbet',num(m.totalRate),'m³/h · inklusive väntan')}</div>`}
function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));let j=active();if(tab==='live'){if(!j){$('#app').innerHTML=`<div class="eyebrow">Leveranslogg för pumpbilen</div><h2>Redo för nästa gjutning?</h2><p class="muted">En knapptryckning vid varje steg. Resten räknar Pumpkoll.</p><div class="card hero"><h3>Ett jobb. Alla leveranser.</h3><p class="muted">Få koll på betongen, tiden vid pumpen och pauserna mellan bilarna.</p><button class="primary" onclick="newJob()">＋ Starta nytt jobb</button></div><div class="card"><h3>Så fungerar det</h3><p class="muted">1. Starta jobbet när pumpen är redo.<br>2. Registrera varje betongbil och dess mängd.<br>3. Tryck ”Börja lossa” och sedan ”Bilen är tom”.<br>4. Avsluta jobbet för en fullständig rapport.</p><p class="muted">Tiderna hämtas från din telefons klocka och bevaras även när skärmen är låst. Jobben sparas i den här webbläsaren. Exportera regelbundet som säkerhetskopia.</p></div>`;return}$('#app').innerHTML=`<div class="row between"><div><div class="eyebrow">Pågående jobb · ${date(j.start)}</div><h2>${esc(j.name)}</h2></div><span class="badge">● ${j.trucks.some(t=>t.start&&!t.empty)?'Lossning pågår':'Väntar på betong'}</span></div><p class="muted">Start ${time(j.start)} · ${esc(j.place||'Ingen plats angiven')}</p><div class="card hero" id="liveMetrics">${summary(j)}</div><div class="row between section-head"><h3>Betongbilar <span class="muted">${j.trucks.length} leveranser</span></h3><button class="primary" onclick="addTruck()">＋ Bil ankommen</button></div>${j.trucks.length?j.trucks.map((t,i)=>truckCard(j,t,i)).join(''):'<div class="card empty"><h3>Första bilen på väg?</h3><p class="muted">Tryck ”Bil ankommen” när den kommer fram.</p></div>'}<div class="row actions"><button class="secondary" onclick="editJob()">Ändra jobbstart</button><button class="secondary danger" onclick="finish()">Avsluta jobb</button></div><p class="muted">Volym räknas som pumpad när bilen markerats tom. Lossningstid inkluderar eventuella pauser medan bilen lossar.</p>`}else if(tab==='history'){let list=db.jobs.filter(j=>j.end&&!j.deleted&&matchesJobKind(j)).sort((a,b)=>b.start-a.start);$('#app').innerHTML=`<div class="eyebrow">Avslutade gjutningar</div><h2>Jobbhistorik</h2>${detail?report(db.jobs.find(j=>j.id===detail)):list.length?list.map(j=>`<button class="card" style="width:100%;text-align:left" onclick="detail='${j.id}';render()"><div class="row between"><h3>${esc(j.name)}</h3><span class="badge">${jobKindLabel(j)} ↗</span></div><p class="muted">${date(j.start)} · ${esc(j.place)}</p><b>${num(metrics(j).v)} m³</b> · ${j.trucks.length} bilar · ${dur(metrics(j).wait)} väntan</button>`).join(''):'<div class="card empty">Dina avslutade jobb visas här.</div>'}`}else{const jobs=db.jobs.filter(j=>j.end&&!j.deleted&&matchesJobKind(j)),ms=jobs.map(j=>metrics(j)),v=ms.reduce((s,m)=>s+m.v,0),p=ms.reduce((s,m)=>s+m.pumping,0),e=ms.reduce((s,m)=>s+m.elapsed,0);$('#app').innerHTML=`<div class="eyebrow">Alla avslutade jobb</div><h2>Din pumpstatistik</h2><div class="card hero"><div class="grid">${metric('Totalt pumpat',num(v),'m³')}${metric('Utförda jobb',jobs.length,'avslutade jobb')}${metric('Under lossning',num(p?v*3600000/p:0),'m³/h · viktat snitt')}${metric('Hela arbetstiden',num(e?v*3600000/e:0),'m³/h · inklusive väntan')}</div></div><div class="card"><h3>Tid & leveranser</h3><p>Lossningstid: <b>${dur(p)}</b></p><p>Väntetid: <b>${dur(e-p)}</b></p><p>Antal tömda bilar: <b>${ms.reduce((s,m)=>s+m.done,0)}</b></p></div><div class="card"><h3>Säkerhetskopia</h3><p class="muted">Data sparas på den här enheten i den här webbläsaren. Exportera för att behålla en separat kopia eller flytta till en annan enhet.</p><div class="row"><button class="secondary" onclick="backup()">Exportera alla jobb</button><button class="secondary" onclick="$('#import').click()">Importera kopia</button><input hidden id="import" type="file" accept="application/json" onchange="restore(this.files[0])"></div></div>`}}
function truckCard(j,t,i,readonly=false){return `<div class="card truck ${t.start&&!t.empty?'active':''}"><div class="row between"><h3 style="margin:0">Bil ${i+1} <span class="muted">${esc(t.name)}</span></h3><span class="badge">${num(t.volume)} m³ · ${t.empty?'Tom':t.start?'Lossar':'Ankommen'}</span></div><div class="times"><span>Ankomst<b>${time(t.arrival)}</b></span><span>Lossningsstart<b>${time(t.start)}</b></span><span>Tom<b>${time(t.empty)}</b></span></div>${t.empty?`<p class="muted">Lossning ${dur(t.empty-t.start)} · ${num(t.empty>t.start?t.volume*3600000/(t.empty-t.start):0)} m³/h · bilens kötid ${dur(t.start-t.arrival)}</p>`:''}<div class="row actions">${!readonly&&!t.start?`<button class="primary" onclick="stamp('${t.id}','start')">▶ Börja lossa</button>`:''}${!readonly&&t.start&&!t.empty?`<button class="primary" onclick="stamp('${t.id}','empty')">✓ Bilen är tom</button>`:''}<button class="secondary" onclick="editTruck('${j.id}','${t.id}')">Ändra${readonly?' tider':''}</button></div></div>`}
function report(j){const m=metrics(j);return `<button class="secondary" onclick="detail=null;render()">← Alla jobb</button><div class="card"><h3>${esc(j.name)}</h3><p class="muted">${date(j.start)} · ${time(j.start)}–${time(j.end)}<br>${esc(j.place)}</p>${summary(j)}<p class="muted">Jobbtid ${dur(m.elapsed)} · lossning ${dur(m.pumping)}. Väntetid inkluderar tid efter sista bilen fram till avslutat jobb. Lossningstakt är ett genomsnitt inklusive pauser under lossningen.</p><button class="secondary" onclick="csv('${j.id}')">Exportera leveransrapport (CSV)</button></div>${j.trucks.map((t,i)=>truckCard(j,t,i,true)).join('')}`}
function modal(html){$('#modal').innerHTML=html;$('#modal').showModal()}
function closeModal(){$('#modal').close()}
function newJob(){modal(`<h3>Starta nytt jobb</h3><form onsubmit="event.preventDefault();createJob(this)"><label>Jobb / kund</label><input name="name" placeholder="T.ex. Villagrund, Växjö" required maxlength="120"><label>Plats (valfritt)</label><input name="place" placeholder="Adress eller arbetsplats" maxlength="160"><p class="muted">Väntetiden börjar räknas nu. Starttiden kan rättas i efterhand.</p><div class="row"><button class="primary">Starta jobb</button><button type="button" class="secondary" onclick="closeModal()">Avbryt</button></div></form>`)}
function createJob(f){if(active())return;if(!readPlan(f))return;db.jobs.push({id:uid(),name:f.elements.namedItem('name').value.trim()||'Nytt jobb',place:f.place.value.trim(),...readPlan(f),start:Date.now(),end:null,trucks:[]});save();closeModal();render()}
function addTruck(){volume=7;modal(`<h3>Bil ankommen</h3><form onsubmit="event.preventDefault();createTruck(this)"><label>Mängd betong</label><div class="row pills">${[7,7.5,9.5].map(v=>`<button type="button" class="secondary ${v===7?'selected':''}" onclick="setVolume(${v},this)">${num(v)} m³</button>`).join('')}</div><label>Valfri mängd (m³)</label><input name="volume" id="volume" inputmode="decimal" value="7" required oninput="document.querySelectorAll('.pills button').forEach(b=>b.classList.remove('selected'))"><label>Bilnummer / registrering (valfritt)</label><input name="truckname" placeholder="T.ex. ABC 123" maxlength="50"><p class="muted">Ankomsttiden registreras när du sparar.</p><div class="row"><button class="primary">Registrera ankomst</button><button class="secondary" type="button" onclick="closeModal()">Avbryt</button></div></form>`)}
function setVolume(v,b){$('#volume').value=String(v).replace('.',',');document.querySelectorAll('.pills button').forEach(x=>x.classList.toggle('selected',x===b))}
function createTruck(f){const v=Number(f.volume.value.replace(',','.'));if(!(v>0&&v<=100))return alert('Ange en mängd större än 0 och högst 100 m³.');active().trucks.push({id:uid(),name:f.truckname.value.trim(),volume:v,arrival:Date.now(),start:null,empty:null});save();closeModal();render()}
function stamp(id,field){const j=active(),t=j.trucks.find(t=>t.id===id);if(field==='start'&&j.trucks.some(x=>x.start&&!x.empty))return alert('Markera först den lossande bilen som tom.');if(t[field])return;t[field]=Date.now();save();render()}
function finish(){const j=active();if(j.trucks.some(t=>!t.empty))return alert('Alla registrerade bilar måste vara tömda innan du avslutar. Rätta eller ta bort en felregistrerad bil via Ändra.');modal(`<h3>Avsluta ${esc(j.name)}?</h3><p class="muted">${num(metrics(j).v)} m³ registrerat. Rapporten sparas i jobbhistoriken.</p><div class="row"><button class="primary" onclick="active().end=Date.now();save();closeModal();detail=activeReportId;tab='history';render()">Avsluta och visa rapport</button><button class="secondary" onclick="closeModal()">Fortsätt jobbet</button></div>`);window.activeReportId=j.id}
const local=t=>{const d=new Date(t);return new Date(t-d.getTimezoneOffset()*60000).toISOString().slice(0,19)};
function editJob(){const j=active();modal(`<h3>Ändra jobbstart</h3><form onsubmit="event.preventDefault();const t=new Date(this.start.value).getTime();if(!Number.isFinite(t)||t>Date.now()||active().trucks.some(x=>x.arrival<t))return alert('Starten måste vara före första ankomsten och inte i framtiden.');active().start=t;save();closeModal();render()"><input type="datetime-local" step="1" name="start" value="${local(j.start)}" required><div class="row" style="margin-top:18px"><button class="primary">Spara</button><button class="secondary" type="button" onclick="closeModal()">Avbryt</button></div></form>`)}
function editTruck(jid,tid){const j=db.jobs.find(x=>x.id===jid),t=j.trucks.find(x=>x.id===tid);modal(`<h3>Ändra leverans</h3><p id="deliveryError" role="alert" class="error"></p><form onsubmit="event.preventDefault();updateTruck(this,'${jid}','${tid}')"><label for="jobStart">Jobbets starttid</label><input id="jobStart" name="jobStart" type="datetime-local" step="1" required value="${local(j.start)}"><p class="muted">Jobbstarten måste vara senast vid första leveransen. Ändra här om du registrerar ett jobb i efterhand.</p>${j.end?`<label for="jobEnd">Jobbets sluttid</label><input id="jobEnd" name="jobEnd" type="datetime-local" step="1" required value="${local(j.end)}">`:''}<label>Mängd (m³)</label><input name="volume" inputmode="decimal" value="${num(t.volume)}" required><label>Bilnummer</label><input name="truckname" value="${esc(t.name)}" maxlength="50">${[['arrival','Ankomst'],['start','Lossningsstart'],['empty','Tom']].map(([k,label])=>`<label>${label}</label><input type="datetime-local" step="1" name="${k}" value="${t[k]?local(t[k]):''}" ${k==='arrival'?'required':''}>`).join('')}<p class="muted">Rätta tider även om du glömde trycka på en knapp. Datum följer med över midnatt.</p><div class="row"><button class="primary">Spara</button><button class="secondary" type="button" onclick="closeModal()">Avbryt</button><button class="secondary danger" type="button" onclick="removeTruck('${jid}','${tid}')">Ta bort</button></div></form>`)}
function validJob(j){if(j&&j.planned)return typeof j.id==='string'&&typeof j.name==='string'&&Array.isArray(j.trucks)&&j.trucks.length===0&&!j.start&&!j.end;if(!j||typeof j.id!=='string'||typeof j.name!=='string'||!Number.isFinite(j.start)||j.start<=0||j.start>Date.now()||!Array.isArray(j.trucks)||j.end!=null&&(!Number.isFinite(j.end)||j.end<j.start||j.end>Date.now()))return false;let last=j.start;const ids=new Set();for(const t of [...j.trucks].sort((a,b)=>(a.start||Infinity)-(b.start||Infinity))){if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.name!=='string'||!Number.isFinite(t.volume)||t.volume<=0||t.volume>100||!Number.isFinite(t.arrival)||t.arrival<j.start||t.arrival>(j.end||Date.now()))return false;ids.add(t.id);if(t.start!=null){if(!Number.isFinite(t.start)||t.start<t.arrival||t.start<last||t.start>(j.end||Date.now()))return false;last=t.empty||Infinity}if(t.empty!=null&&(!t.start||!Number.isFinite(t.empty)||t.empty<t.start||t.empty>(j.end||Date.now())))return false;if(j.end&&!t.empty)return false}return true}
function updateTruck(f,jid,tid){const j=db.jobs.find(x=>x.id===jid),t=j.trucks.find(x=>x.id===tid),next={...t,volume:Number(f.volume.value.replace(',','.')),name:f.truckname.value.trim()};for(const k of ['arrival','start','empty'])next[k]=f[k].value?new Date(f[k].value).getTime():null;const copy={...j,start:new Date(f.jobStart.value).getTime(),end:f.jobEnd?new Date(f.jobEnd.value).getTime():j.end,trucks:j.trucks.map(x=>x.id===tid?next:x)};const error=deliveryValidationError(copy);if(error){$('#deliveryError').textContent=error;return}if(!validJob(copy)){$('#deliveryError').textContent='Jobbet innehåller ogiltiga uppgifter. Kontrollera övriga leveranser eller exportera en säkerhetskopia för felsökning.';return}j.start=copy.start;j.end=copy.end;Object.assign(t,next);save();closeModal();render()}
function removeTruck(jid,tid){if(!confirm('Ta bort leveransen? Volym och tider räknas då bort.'))return;const j=db.jobs.find(x=>x.id===jid);j.trucks=j.trucks.filter(t=>t.id!==tid);save();closeModal();render()}
function download(data,name,type){const url=URL.createObjectURL(new Blob(['\ufeff',data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function backup(){download(JSON.stringify(db,null,2),'pumpkoll-sakerhetskopia-'+date(Date.now())+'.json','application/json')}
async function restore(file){if(!file)return;try{const d=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!d||!Array.isArray(d.jobs)||!d.jobs.every(validJob)||new Set(d.jobs.map(j=>j.id)).size!==d.jobs.length||d.jobs.filter(j=>!j.end&&!j.planned&&!j.deleted).length>1)throw Error();if(!confirm('Importera säkerhetskopian? Det ersätter alla jobb på den här enheten. Exportera nuvarande jobb först om du vill behålla dem.'))return;db=d;save();detail=null;render()}catch(e){alert('Filen är inte en giltig Pumpkoll-kopia med korrekta tider.')}}
function csv(id){const j=db.jobs.find(x=>x.id===id),m=metrics(j);const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const lines=[['Jobb',j.name],['Datum',date(j.start)],['Typ av jobb',jobKindLabel(j)],['Pumpat m3',num(m.v)],['Väntetid',dur(m.wait)],['Lossningstid',dur(m.pumping)],['m3/h lossning',num(m.rate)],['m3/h hela jobbet',num(m.totalRate)],[],['Bil','Registrering','m3','Ankomst','Lossningsstart','Tom','Lossning','Bilens kötid'],...j.trucks.map((t,i)=>[i+1,t.name,num(t.volume),new Date(t.arrival).toLocaleString('sv-SE'),new Date(t.start).toLocaleString('sv-SE'),new Date(t.empty).toLocaleString('sv-SE'),dur(t.empty-t.start),dur(t.start-t.arrival)])];download(lines.map(l=>l.map(q).join(';')).join('\r\n'),'pumpkoll-'+date(j.start)+'.csv','text/csv;charset=utf-8')}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;detail=null;render()});
function tick(){$('#clock').textContent=time(Date.now());$('#date').textContent=new Date().toLocaleDateString('sv-SE',{day:'numeric',month:'short'});const j=active();if(tab==='live'&&j&&$('#liveMetrics'))$('#liveMetrics').innerHTML=summary(j)}setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();render()}});render();tick();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

const baseRender=render;
render=function(){baseRender();if(tab==='live'){const panel=document.createElement('div');panel.className='card';panel.innerHTML='<h3>Planerade jobb</h3><button class="secondary" onclick="planJob()">＋ Planera jobb</button>'+plannedScheduleHtml(db.jobs.filter(j=>j.planned&&!j.deleted));$('#app').append(panel);const j=active();if(j){const tools=document.createElement('div');tools.className='card row';tools.innerHTML=`<button class="primary" onclick="ownLoad()">＋ Egenlastad betong</button><button class="secondary danger" onclick="deleteJob('${j.id}')">Ta bort hela jobbet</button>`;$('#liveMetrics').after(tools)}}if(tab==='history'&&detail){const b=document.createElement('button');b.className='secondary danger';b.textContent='Ta bort hela jobbet';b.onclick=()=>deleteJob(detail);$('#app').append(b)}if(tab==='history'){const removed=db.jobs.filter(j=>j.deleted);if(removed.length){const box=document.createElement('div');box.className='card';box.innerHTML='<h3>Borttagna jobb</h3>'+removed.map(j=>`<p>${esc(j.name)} <button class="secondary" onclick="undoDelete('${j.id}')">Återställ</button></p>`).join('');$('#app').append(box)}}};
function deleteJob(id){const j=db.jobs.find(j=>j.id===id);if(!confirm('Ta bort hela jobbet inklusive leveranser från historik och statistik? Det kan återställas under Borttagna jobb.'))return;j.deleted=Date.now();save();detail=null;render()}
function undoDelete(id){const j=db.jobs.find(j=>j.id===id);if(!j.end&&!j.planned&&active())return alert('Avsluta det pågående jobbet innan du återställer detta.');delete j.deleted;save();render()}
function planJob(id){const j=db.jobs.find(j=>j.id===id)||{};modal(`<h3>Planera jobb</h3><form onsubmit="event.preventDefault();savePlan(this,'${id||''}')"><label>Jobb / kund</label><input name="jobname" required maxlength="120" value="${esc(j.name||'')}"><label>Plats</label><input name="place" maxlength="160" value="${esc(j.place||'')}"><label>Planerat datum och tid (valfritt)</label><input type="datetime-local" name="scheduled" value="${esc(j.scheduled||'')}"><p class="muted">Ingen tid räknas förrän du trycker Starta jobb.</p><button class="primary">Spara planerat jobb</button><button type="button" class="secondary" onclick="closeModal()">Avbryt</button></form>`)}
function savePlan(f,id){const planning=readPlan(f);if(!planning)return;let j=db.jobs.find(j=>j.id===id);if(!j){j={id:uid(),start:null,end:null,trucks:[],planned:true};db.jobs.push(j)}Object.assign(j,{name:f.jobname.value.trim(),place:f.place.value.trim(),scheduled:f.scheduled.value,...planning});save();closeModal();render()}
function startPlanned(id){if(active())return alert('Avsluta det pågående jobbet först.');const j=db.jobs.find(j=>j.id===id);j.planned=false;j.start=Date.now();save();tab='live';render()}
function ownLoad(startNow=false){modal(`<h3>Egenlastad betong · rotorpump</h3><form onsubmit="event.preventDefault();saveOwnLoad(this,${startNow})"><label>Mängd i m³</label><input name="amount" inputmode="decimal" required placeholder="T.ex. 7,5" value="${active().plannedOwnVolume??''}"><label>Lastad vid</label><input name="loaded" type="datetime-local" step="1" required value="${local(Date.now())}"><p class="muted">Lasttiden sparas separat. Tryck Starta pumpning av egen last och därefter Egen last färdigpumpad för att mäta pumpningstiden.</p><button class="primary">${startNow?'Spara och starta pumpning':'Spara egen last'}</button><button type="button" class="secondary" onclick="closeModal()">Avbryt</button></form>`)}
function saveOwnLoad(f,startNow=false){if(startNow&&active().trucks.some(t=>t.start&&!t.empty))return alert('Avsluta den pågående lossningen eller pumpningen först.');const v=Number(f.amount.value.replace(',','.')),loaded=new Date(f.loaded.value).getTime();if(!(v>0&&v<=100)||!Number.isFinite(loaded)||loaded>Date.now())return alert('Kontrollera mängd och lasttid.');active().trucks.push({id:uid(),name:'Egenlastad betong · rotorpump',own:true,loaded,volume:v,arrival:Date.now(),start:startNow?Date.now():null,empty:null});save();closeModal();render()}
const originalTruckCard=truckCard;truckCard=function(j,t,i,r=false){let html=originalTruckCard(j,t,i,r);if(t.own)html=html.replace('Bil '+(i+1),'Egen last').replace('▶ Börja lossa','▶ Starta pumpning av egen last').replace('✓ Bilen är tom','✓ Egen last färdigpumpad').replace('Lossningsstart','Pumpstart').replace('Lossning ','Pumpning ').replace('· Lossar','· Pumpar').replace('· Tom','· Färdigpumpad').replace('· Ankommen','· Lastad').replace('<div class="times">',`<p class="muted">Lastad ${date(t.loaded)} ${time(t.loaded)}</p><div class="times">`);return html};
render();


function plannedDuration(volume,rate){return volume>0&&rate>0?volume/rate*3600000:null}
function planTime(ms){if(ms==null)return 'Ange mängd och takt';const minutes=Math.ceil(ms/60000);return Math.floor(minutes/60)+' h '+(minutes%60)+' min'}
function planningSummary(j){if(!j.plannedVolume&&!j.plannedRate&&j.plannedOwnVolume==null)return `<p class="badge">${jobKindLabel(j)}</p>`;return `<div class="card"><h3>Planering</h3><p class="badge">${jobKindLabel(j)}</p><div class="grid">${metric('Planerad mängd',j.plannedVolume?num(j.plannedVolume):'—','m³')}${metric('Planerad egen last',j.plannedOwnVolume!=null?num(j.plannedOwnVolume):'—','m³ · ingår i totalmängden')}${metric('Planerad utläggningstakt',j.plannedRate?num(j.plannedRate):'—','m³/h')}${metric('Beräknad åtgångstid',planTime(plannedDuration(j.plannedVolume,j.plannedRate)),'exklusive väntan och etablering')}</div></div>`}
function readPlan(f){const v=f.elements.namedItem('plannedVolume'),r=f.elements.namedItem('plannedRate'),own=f.elements.namedItem('plannedOwnVolume');const parse=e=>!e||!e.value.trim()?null:Number(e.value.replace(',','.'));const plannedVolume=parse(v),plannedRate=parse(r),plannedOwnVolume=parse(own);if(plannedOwnVolume!==null&&(!Number.isFinite(plannedOwnVolume)||plannedOwnVolume<0)){alert('Planerad egen last måste vara 0 eller ett positivt tal.');return null}if(plannedVolume!==null&&plannedOwnVolume!==null&&plannedOwnVolume>plannedVolume){alert('Egen last kan inte vara större än jobbets totala planerade betongmängd.');return null}if([plannedVolume,plannedRate].some(n=>n!==null&&(!Number.isFinite(n)||n<=0))){alert('Ange mängd och takt som positiva tal, eller lämna tomt.');return null}return {plannedVolume,plannedRate,plannedOwnVolume,jobKind:normalJobKind(f.elements.namedItem('jobKind')?.value)}}
function previewPlan(f){const p=readPlanPreview(f);const output=f.querySelector('[data-plan-output]');output.textContent='Beräknad åtgångstid: '+planTime(plannedDuration(p.v,p.r))}
function readPlanPreview(f){return {v:Number(f.elements.namedItem('plannedVolume').value.replace(',','.')),r:Number(f.elements.namedItem('plannedRate').value.replace(',','.'))}}
function addPlanningFields(j={}){const f=$('#modal form');const box=document.createElement('div');box.innerHTML=`<label for="jobKind">Typ av jobb</label><select id="jobKind" name="jobKind" style="width:100%;font:inherit;padding:13px;border:1px solid #ced8ca;border-radius:10px;min-height:48px">${jobKindOptions(normalJobKind(j.jobKind))}</select><label for="plannedVolume">Planerad mängd betong (m³)</label><input id="plannedVolume" name="plannedVolume" inputmode="decimal" placeholder="T.ex. 63" value="${j.plannedVolume??''}" oninput="previewPlan(this.form)"><label for="plannedOwnVolume">Planerad egen last (m³)</label><input id="plannedOwnVolume" name="plannedOwnVolume" inputmode="decimal" placeholder="T.ex. 7,5" value="${j.plannedOwnVolume??''}"><p class="muted">Mängden du ska lasta i rotorpumpen. Ingår i jobbets totala planerade mängd.</p><label for="plannedRate">Planerad utläggningstakt (m³/h)</label><input id="plannedRate" name="plannedRate" inputmode="decimal" placeholder="T.ex. 21" value="${j.plannedRate??''}" oninput="previewPlan(this.form)"><p data-plan-output class="badge"></p><p class="muted">Mängd ÷ utläggningstakt. Avrundat uppåt till hela minuter. Väntan, etablering och rengöring tillkommer.</p>`;let anchor=f.querySelector('button');while(anchor.parentElement!==f)anchor=anchor.parentElement;f.insertBefore(box,anchor);previewPlan(f)}
const newJobBeforePlanning=newJob;newJob=function(){newJobBeforePlanning();addPlanningFields()};
const planJobBeforePlanning=planJob;planJob=function(id){planJobBeforePlanning(id);addPlanningFields(db.jobs.find(j=>j.id===id)||{})};
const renderBeforePlanning=render;render=function(){renderBeforePlanning();const j=active();if(tab==='live'&&j){const box=document.createElement('div');box.innerHTML=planningSummary(j)+`<button class="secondary" onclick="editPlanning('${j.id}')">Ändra planering och jobbtyp</button>`;$('#liveMetrics').after(box)}};
function editPlanning(id){modal(`<h3>Jobbets planering</h3><form onsubmit="event.preventDefault();savePlanningOnly(this,'${id}')"><button class="primary">Spara</button><button class="secondary" type="button" onclick="closeModal()">Avbryt</button></form>`);addPlanningFields(db.jobs.find(j=>j.id===id))}
function savePlanningOnly(f,id){const p=readPlan(f);if(!p)return;Object.assign(db.jobs.find(j=>j.id===id),p);save();closeModal();render()}
const reportBeforePlanning=report;report=function(j){return planningSummary(j)+reportBeforePlanning(j)};
render();



function normalJobKind(value){return ['own','billable'].includes(value)?value:'unclassified'}
function jobKindLabel(j){return {own:'Eget jobb',billable:'Fakturerbart jobb',unclassified:'Ej klassificerat'}[normalJobKind(j.jobKind)]}
function matchesJobKind(j){return jobKindFilter==='all'||normalJobKind(j.jobKind)===jobKindFilter}
function jobKindOptions(selected,all=false){return Object.entries({...all?{all:'Alla jobb'}:{},own:'Eget jobb',billable:'Fakturerbart jobb',unclassified:'Ej klassificerat'}).map(([k,label])=>`<option value="${k}" ${k===selected?'selected':''}>${label}</option>`).join('')}
const renderBeforeJobKind=render;render=function(){renderBeforeJobKind();if(tab==='history'||tab==='stats'){const filter=document.createElement('div');filter.className='card';filter.innerHTML=`<label for="jobKindFilter">Visa jobbtyp</label><select id="jobKindFilter" style="font:inherit;padding:13px;border:1px solid #ced8ca;border-radius:10px;width:100%" onchange="jobKindFilter=this.value;detail=null;render()">${jobKindOptions(jobKindFilter,true)}</select><p class="muted">${tab==='stats'?'Statistiken räknar avslutade jobb av vald typ.':'Välj en jobbtyp för att filtrera historiken.'}</p>`;$('#app').prepend(filter);if(tab==='history'&&detail){const b=document.createElement('button');b.className='secondary';b.textContent='Ändra planering och jobbtyp';b.onclick=()=>editPlanning(detail);$('#app').append(b)}}};
render();


function startOwnPumping(){const j=active();if(!j)return;if(j.trucks.some(t=>t.start&&!t.empty))return alert('Avsluta pågående lossning eller pumpning först.');const t=j.trucks.find(t=>t.own&&!t.start&&!t.empty);if(t)stamp(t.id,'start');else ownLoad(true)}
function finishOwnPumping(){const t=active()?.trucks.find(t=>t.own&&t.start&&!t.empty);if(t)stamp(t.id,'empty')}
const renderBeforeOwnPumping=render;render=function(){renderBeforeOwnPumping();const j=active();if(tab!=='live'||!j)return;const ongoing=j.trucks.find(t=>t.own&&t.start&&!t.empty);const pending=j.trucks.find(t=>t.own&&!t.start&&!t.empty);const panel=document.createElement('div');panel.className='card';panel.innerHTML=`<h3>Rotorpump · egen last</h3><p class="muted">${ongoing?'Pumpning pågår · '+num(ongoing.volume)+' m³ · start '+time(ongoing.start):pending?'Registrerad egen last: '+num(pending.volume)+' m³':j.plannedOwnVolume?'Planerad egen last: '+num(j.plannedOwnVolume)+' m³':'Registrera mängden och starta pumpningen.'}</p><button class="primary" onclick="${ongoing?'finishOwnPumping()':'startOwnPumping()'}">${ongoing?'✓ Egen last färdigpumpad':'▶ Starta pumpning av egen last'}</button><p class="muted">Tiderna följer telefonens klocka. Mängden räknas som pumpad när lasten är färdigpumpad.</p>`;$('#liveMetrics').after(panel)};
render();


function deliveryValidationError(j,now=Date.now()){
const stamp=t=>new Date(t).toLocaleString('sv-SE');
if(!Number.isFinite(j.start)||j.start<=0)return 'Ange en giltig starttid för jobbet.';
if(j.start>now)return 'Jobbets starttid ligger i framtiden.';
if(j.end!=null&&(!Number.isFinite(j.end)||j.end<j.start||j.end>now))return 'Jobbets sluttid måste ligga efter jobbstarten och får inte vara i framtiden.';
for(let i=0;i<j.trucks.length;i++){const t=j.trucks[i],label=t.own?'Egen last '+(i+1):'Bil '+(i+1);
if(!Number.isFinite(t.volume)||t.volume<=0||t.volume>100)return label+': mängden måste vara större än 0 och högst 100 m³.';
if(!Number.isFinite(t.arrival))return label+': ange en giltig ankomsttid.';
if(t.arrival<j.start)return label+': ankomsten '+stamp(t.arrival)+' ligger före jobbstarten '+stamp(j.start)+'. Ändra Jobbets starttid ovan eller rätta ankomsten.';
for(const [key,name] of [['arrival','ankomst'],['start','pump-/lossningsstart'],['empty','sluttid']])if(t[key]!=null&&(!Number.isFinite(t[key])||t[key]>(j.end||now)))return label+': '+name+' ligger '+(j.end?'efter jobbets sluttid '+stamp(j.end):'i framtiden')+'.';
if(t.start!=null&&t.start<t.arrival)return label+': pump-/lossningsstart '+stamp(t.start)+' ligger före ankomsten '+stamp(t.arrival)+'.';
if(t.empty!=null&&t.start==null)return label+': ange pump-/lossningsstart innan du anger sluttid.';
if(t.empty!=null&&t.empty<t.start)return label+': sluttiden ligger före pump-/lossningsstarten.';
if(j.end&&t.empty==null)return label+': en avslutad gjutning måste ha sluttid för varje last.';
}
const pumping=j.trucks.map((t,i)=>({...t,index:i})).filter(t=>t.start!=null).sort((a,b)=>a.start-b.start);
for(let i=1;i<pumping.length;i++){const a=pumping[i-1],b=pumping[i];if(b.start<(a.empty||Infinity))return 'Last '+(b.index+1)+' startar '+stamp(b.start)+' innan last '+(a.index+1)+' är färdig'+(a.empty?' '+stamp(a.empty):' (sluttid saknas)')+'. Rätta den berörda lastens tider.';}
return '';
}


function scheduledTimestamp(j){const t=j.scheduled?new Date(j.scheduled).getTime():NaN;return Number.isFinite(t)?t:Infinity}
function groupPlannedJobs(jobs){const sorted=[...jobs].sort((a,b)=>{const at=scheduledTimestamp(a),bt=scheduledTimestamp(b);if(at!==bt)return at<bt?-1:1;return String(a.name||'').localeCompare(String(b.name||''),'sv')||String(a.id).localeCompare(String(b.id))});const groups=[];for(const j of sorted){const key=scheduledTimestamp(j)===Infinity?'unscheduled':j.scheduled.slice(0,10);let group=groups.find(g=>g.key===key);if(!group){group={key,jobs:[]};groups.push(group)}group.jobs.push(j)}return groups}
function plannedScheduleHtml(jobs){const groups=groupPlannedJobs(jobs);if(!groups.length)return '<p class="muted">Inga planerade jobb ännu.</p>';const today=local(Date.now()).slice(0,10);const nearest=groups.find(g=>g.key!=='unscheduled'&&g.key>=today)?.key;return groups.map(group=>{const label=group.key==='unscheduled'?'Datum och tid ej angivet':new Date(group.key+'T12:00').toLocaleDateString('sv-SE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const opened=Object.prototype.hasOwnProperty.call(plannedOpenGroups,group.key)?plannedOpenGroups[group.key]:group.key===nearest;return `<details class="card" ${opened?'open':''} ontoggle="plannedOpenGroups['${group.key}']=this.open"><summary style="cursor:pointer;min-height:44px;font-weight:700;padding:10px 0">${esc(label)} · ${group.jobs.length} jobb</summary>${group.jobs.map(j=>`<details class="card"><summary style="cursor:pointer;min-height:44px;line-height:1.7"><strong>${scheduledTimestamp(j)===Infinity?'Tid ej angiven':new Date(j.scheduled).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})} · ${esc(j.name)}</strong><br><span class="muted">${esc(j.place||'Plats ej angiven')} · ${jobKindLabel(j)}</span></summary>${planningSummary(j)}<div class="row"><button class="primary" onclick="startPlanned('${j.id}')">▶ Starta jobb</button><button class="secondary" onclick="planJob('${j.id}')">Ändra</button><button class="secondary danger" onclick="deleteJob('${j.id}')">Ta bort jobb</button></div></details>`).join('')}</details>`}).join('')}
render();


/* Nedfällbart innehåll på samtliga huvudflikar. */
(() => {
  const previousRender = render;
  const stateKey = 'pumpkoll-folds-v1';
  let folds = {};
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) folds = saved;
  } catch (_) {}

  function fold(content, title, id) {
    const container = document.createElement('details');
    container.className = 'fold-section';
    container.open = folds[id] !== false;
    const heading = document.createElement('summary');
    heading.textContent = title;
    container.append(heading);
    content.replaceWith(container);
    container.append(content);
    container.addEventListener('toggle', () => {
      folds[id] = container.open;
      try { localStorage.setItem(stateKey, JSON.stringify(folds)); } catch (_) {}
    });
    return container;
  }

  render = function () {
    previousRender();
    const app = document.querySelector('#app');
    const scope = tab + ':' + (tab === 'history' ? detail || 'list' : 'main');
    const cards = [...app.children].filter(node =>
      node.matches('div.card') && !node.classList.contains('truck')
    );
    const counts = {};
    cards.forEach(card => {
      const heading = card.querySelector('h3');
      const title = heading ? heading.textContent.trim()
        : card.id === 'liveMetrics' ? 'Jobbets siffror'
        : card.querySelector('.grid') ? 'Sammanlagd statistik'
        : card.querySelector('#jobKindFilter') ? 'Filtrera jobbtyp'
        : '';
      if (!title) return;
      counts[title] = (counts[title] || 0) + 1;
      fold(card, title, scope + ':' + title + ':' + counts[title]);
      if (heading) heading.hidden = true;
    });
    const body = document.createElement('div');
    while (app.firstChild) body.append(app.firstChild);
    app.append(body);
    const title = tab === 'live' ? 'Pågående och planerade jobb'
      : tab === 'history' ? 'Jobbhistorik' : 'Statistik';
    fold(body, title, scope + ':all');
  };
  render();
})();

/* Kartor öppnas först när användaren väljer en kartknapp. */
function jobMapUrls(address) {
  const value = String(address || '').trim();
  if (!value) return null;
  const url = (base, params) => {
    const link = new URL(base);
    Object.entries(params).forEach(([key, value]) => link.searchParams.set(key, value));
    return link.href;
  };
  return {
    appleMap: url('https://maps.apple.com/', { q: value }),
    appleRoute: url('https://maps.apple.com/', { daddr: value, dirflg: 'd' }),
    googleMap: url('https://www.google.com/maps/search/', { api: '1', query: value }),
    googleRoute: url('https://www.google.com/maps/dir/', { api: '1', destination: value, travelmode: 'driving' })
  };
}

function jobMapLinks(address) {
  const urls = jobMapUrls(address);
  if (!urls) return '<p class="muted">Ange gatuadress och ort för att öppna karta och vägbeskrivning.</p>';
  const link = (href, text) => `<a class="secondary map-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  return `<p class="muted">${esc(String(address).trim())}</p>
    <p><strong>Apple Kartor</strong></p><div class="row">
      ${link(urls.appleMap, '📍 Visa karta')}
      ${link(urls.appleRoute, '↗ Vägbeskrivning')}
    </div><p><strong>Google Maps</strong></p><div class="row">
      ${link(urls.googleMap, '📍 Visa karta')}
      ${link(urls.googleRoute, '↗ Vägbeskrivning')}
    </div>`;
}

function jobMapPanel(job) {
  return `<details class="card job-map"><summary>Karta & vägbeskrivning</summary>
    ${jobMapLinks(job.place)}
    <button class="secondary" onclick="editJobAddress('${job.id}')">Ändra adress</button>
    </details>`;
}

function editJobAddress(id) {
  const job = db.jobs.find(job => job.id === id);
  if (!job) return;
  modal(`<h3>Jobbets adress</h3><form onsubmit="event.preventDefault();saveJobAddress(this,'${id}')">
    <label for="mapAddress">Adress / arbetsplats och ort</label>
    <input id="mapAddress" name="address" maxlength="160" value="${esc(job.place || '')}" placeholder="Gata, nummer och ort">
    <p class="muted">Skriv en tydlig adress så att kartan hittar rätt arbetsplats.</p>
    <div class="row"><button class="primary">Spara adress</button>
    <button class="secondary" type="button" onclick="closeModal()">Avbryt</button></div>
    </form>`);
}

function saveJobAddress(form, id) {
  const job = db.jobs.find(job => job.id === id);
  if (!job) return;
  const previous = job.place;
  job.place = form.elements.namedItem('address').value.trim();
  if (!save()) { job.place = previous; return; }
  closeModal();
  render();
}

const planningSummaryBeforeMaps = planningSummary;
planningSummary = function(job) {
  return planningSummaryBeforeMaps(job) + jobMapPanel(job);
};

function addAddressPreview() {
  const input = document.querySelector('#modal input[name="place"]');
  if (!input) return;
  input.placeholder = 'Gata, nummer och ort';
  const preview = document.createElement('details');
  preview.className = 'card job-map';
  const heading = document.createElement('summary');
  heading.textContent = 'Förhandsvisa adress i kartan';
  const links = document.createElement('div');
  const update = () => { links.innerHTML = jobMapLinks(input.value); };
  update();
  input.addEventListener('input', update);
  preview.append(heading, links);
  input.after(preview);
}

const newJobBeforeMaps = newJob;
newJob = function() { newJobBeforeMaps(); addAddressPreview(); };
const planJobBeforeMaps = planJob;
planJob = function(id) { planJobBeforeMaps(id); addAddressPreview(); };
render();

/* Pumpkoll: arbetsdag, uppföljning och rapporter. */
const workLabels={setup:'Etablering',ready:'Väntar på betong',pumping:'Pumpning',crew:'Väntar på gjutlag',break:'Rast',fault:'Maskinstopp',wash:'Tvätt / avetablering',other:'Övrigt uppehåll'};
const workFilters={from:'',to:'',search:''};
function workParts(j,now=Date.now()){
  const end=j.end||now,parts={};
  for(const [i,e] of (j.workEvents||[]).entries()){
    const until=Math.min(end,j.workEvents[i+1]?.at??end);
    const length=Math.max(0,until-Math.max(j.start,e.at));
    parts[e.kind]=(parts[e.kind]||0)+length;
  }
  return parts;
}
function workKind(j){return j.workEvents?.at(-1)?.kind||'ready'}
function loadPumpTime(j,t){if(!t.start)return 0;const end=t.empty||j.end||Date.now();if(!j.workEvents?.length)return Math.max(0,end-t.start);return j.workEvents.reduce((total,e,i)=>e.kind==='pumping'?total+Math.max(0,Math.min(end,j.workEvents[i+1]?.at??end)-Math.max(t.start,e.at)):total,0)}
function recordWork(j,kind,at=Date.now()){
  if(!j.workEvents?.length)j.workEvents=[{at:j.start,kind:'ready'}];
  if(workKind(j)!==kind)j.workEvents.push({at,kind});
}
function workMatches(j){
  const day=j.start?local(j.start).slice(0,10):'';
  return (!workFilters.from||day>=workFilters.from)&&(!workFilters.to||day<=workFilters.to)&&
    (!workFilters.search||[j.name,j.place,j.contactName,j.notes].join(' ').toLocaleLowerCase('sv').includes(workFilters.search.toLocaleLowerCase('sv')));
}
const kindMatchesBeforeWork=matchesJobKind;
matchesJobKind=function(j){return kindMatchesBeforeWork(j)&&workMatches(j)};
const metricsBeforeWork=metrics;
metrics=function(j,now=Date.now()){
  const m=metricsBeforeWork(j,now);
  m.v=j.trucks.filter(t=>t.empty).reduce((v,t)=>v+(t.pumpedVolume??t.volume),0);
  if(j.workEvents?.length){const p=workParts(j,now);m.pumping=p.pumping||0;m.wait=p.ready||0;m.other=Math.max(0,m.elapsed-m.pumping-m.wait)}
  m.rate=m.pumping?m.v*3600000/m.pumping:0;
  m.totalRate=m.elapsed?m.v*3600000/m.elapsed:0;
  return m;
};
summary=function(j){const m=metrics(j);return `<div class="grid">${metric('Pumpad betong',num(m.v),'m³ · färdigregistrerade laster')}${metric(j.workEvents?.length?'Väntan på betong':'Tid utan lossning',dur(m.wait),j.workEvents?.length?'registrerat arbetsläge':'äldre jobb · samtliga uppehåll')}${metric('Under pumpning',num(m.rate),'m³/h · registrerad volym')}${metric('Hela jobbet',num(m.totalRate),'m³/h · inklusive alla moment')}</div>`};
function workFields(j={}){return `<label>Kontaktperson</label><input name="contactName" maxlength="120" value="${esc(j.contactName||'')}"><label>Telefon</label><input name="contactPhone" type="tel" maxlength="50" value="${esc(j.contactPhone||'')}"><label>Anteckningar / avvikelser</label><textarea name="notes" rows="4" maxlength="10000" placeholder="T.ex. extra slang, pumpflytt eller försening">${esc(j.notes||'')}</textarea>`}
function readWorkFields(f){return {contactName:f.elements.namedItem('contactName')?.value.trim()||'',contactPhone:f.elements.namedItem('contactPhone')?.value.trim()||'',notes:f.elements.namedItem('notes')?.value.trim()||''}}
function appendWorkFields(j={}){const f=$('#modal form');if(!f||f.elements.namedItem('contactName'))return;const box=document.createElement('div');box.innerHTML=workFields(j);const button=f.querySelector('button');let anchor=button;while(anchor.parentElement!==f)anchor=anchor.parentElement;f.insertBefore(box,anchor)}
const newJobBeforeWork=newJob;
newJob=function(){newJobBeforeWork();appendWorkFields()};
const planJobBeforeWork=planJob;
planJob=function(id){planJobBeforeWork(id);appendWorkFields(db.jobs.find(j=>j.id===id)||{})};
const createJobBeforeWork=createJob;
createJob=function(f){const ids=new Set(db.jobs.map(j=>j.id));const extra=readWorkFields(f);createJobBeforeWork(f);const j=db.jobs.find(j=>!ids.has(j.id));if(j){Object.assign(j,extra,{workEvents:[{at:j.start,kind:'setup'}]});save();render()}};
const savePlanBeforeWork=savePlan;
savePlan=function(f,id){const ids=new Set(db.jobs.map(j=>j.id));const extra=readWorkFields(f);savePlanBeforeWork(f,id);if($('#modal').open)return;const j=id?db.jobs.find(j=>j.id===id):db.jobs.find(j=>!ids.has(j.id));if(j){Object.assign(j,extra);save();render()}};
const startPlannedBeforeWork=startPlanned;
startPlanned=function(id){startPlannedBeforeWork(id);const j=db.jobs.find(j=>j.id===id);if(j&&!j.planned&&active()?.id===id&&!j.workEvents?.length){j.workEvents=[{at:j.start,kind:'setup'}];save();render()}};
function setWorkKind(kind){
  const j=active();if(!j||!workLabels[kind])return;
  if(kind==='pumping'&&!j.trucks.some(t=>t.start&&!t.empty))return alert('Starta först en leverans eller din egen last.');
  recordWork(j,kind);save();render();
}
const stampBeforeWork=stamp;
stamp=function(id,field){const j=active(),t=j?.trucks.find(t=>t.id===id);if(!t)return;
  const previous=t[field];stampBeforeWork(id,field);
  if(!previous&&t[field]){recordWork(j,field==='start'?'pumping':'ready',t[field]);save();render()}
};
function finishOwnAmount(id){const j=active(),t=j?.trucks.find(t=>t.id===id);if(!t||t.empty)return;
  modal(`<h3>Avsluta egen last</h3><form onsubmit="event.preventDefault();saveOwnAmount(this,'${id}')"><p>Lastat: <b>${num(t.volume)} m³</b></p><label>Pumpat av denna last (m³)</label><input name="pumped" inputmode="decimal" required value="${t.volume}"><p class="muted">Resterande mängd sparas som kvar i bilen och räknas inte som pumpad.</p><div class="row"><button class="primary">Färdigpumpad</button><button type="button" class="secondary" onclick="closeModal()">Avbryt</button></div></form>`);
}
function saveOwnAmount(f,id){const j=active(),t=j?.trucks.find(t=>t.id===id),v=Number(f.pumped.value.replace(',','.'));if(!t||!Number.isFinite(v)||v<0||v>t.volume)return alert('Pumpad mängd ska vara mellan 0 och lastad mängd.');t.pumpedVolume=v;closeModal();stamp(id,'empty')}
finishOwnPumping=function(){const t=active()?.trucks.find(t=>t.own&&t.start&&!t.empty);if(t)finishOwnAmount(t.id)};
const truckBeforeWork=truckCard;
truckCard=function(j,t,i,readonly=false){let html=truckBeforeWork(j,t,i,readonly);if(t.empty){const ms=loadPumpTime(j,t),v=t.pumpedVolume??t.volume;html=html.replace(/<p class="muted">(?:Lossning|Pumpning) [\s\S]*?<\/p>/,`<p class="muted">Pumpning ${dur(ms)} · ${num(ms?v*3600000/ms:0)} m³/h · total lasttid ${dur(t.empty-t.start)} · kötid ${dur(t.start-t.arrival)}</p>`)}if(t.own){html=html.replace(`stamp('${t.id}','empty')`,`finishOwnAmount('${t.id}')`);if(t.empty)html+=`<p class="card">Egen last: lastat ${num(t.volume)} m³ · pumpat ${num(t.pumpedVolume??t.volume)} m³ · kvar ${num(t.volume-(t.pumpedVolume??t.volume))} m³</p>`}return html};
const saveOwnBeforeWork=saveOwnLoad;
saveOwnLoad=function(f,startNow=false){const j=active(),ids=new Set(j.trucks.map(t=>t.id));saveOwnBeforeWork(f,startNow);const t=j.trucks.find(t=>!ids.has(t.id));if(t?.start){recordWork(j,'pumping',t.start);save();render()}};
function workProgress(j){const m=metrics(j),total=j.plannedVolume,remaining=total?Math.max(0,total-m.v):null;
  const rate=m.v>0&&m.pumping>0?m.rate:j.plannedRate;
  const eta=remaining!==null&&rate>0?Date.now()+remaining/rate*3600000:null;
  return `<div class="grid">${metric('Pumpat',num(m.v),'m³ · färdigregistrerade laster')}${metric('Kvar av planerat',remaining===null?'—':num(remaining),'m³')}${metric('Beräknat färdigpumpat',eta?new Date(eta).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'}):'—',eta?date(eta):'ange mängd och takt')}</div><p class="muted">Prognosen använder uppmätt pumptakt när volym finns, annars planerad takt. Återstående volym uppdateras när en last avslutas. Kommande uppehåll och tvätt tillkommer.</p>`}
function workPanel(j){const current=j.trucks.find(t=>t.start&&!t.empty),pending=j.trucks.find(t=>!t.start&&!t.empty);
 const next=current?`<button class="primary" onclick="${current.own?'finishOwnPumping()':`stamp('${current.id}','empty')`}">${current.own?'✓ Egen last färdigpumpad':'✓ Bilen är tom'}</button>`:pending?`<button class="primary" onclick="stamp('${pending.id}','start')">▶ ${pending.own?'Pumpa egen last':'Börja lossa nästa bil'}</button>`:'';
 return `<div class="card work-panel"><h3>Arbetsvy · ${workLabels[workKind(j)]||'Väntar'}</h3><div class="row">${current&&workKind(j)!=='pumping'?'<button class="primary" onclick="setWorkKind(\'pumping\')">▶ Återuppta pumpning</button>':''}${next}<button class="primary" onclick="addTruck()">＋ Bil ankommen</button>${!current?'<button class="secondary" onclick="startOwnPumping()">▶ Egen last</button>':''}<button class="secondary" onclick="workModeDialog()">Arbetsläge / uppehåll</button></div><div id="workProgress">${workProgress(j)}</div></div>`;
}
function workModeDialog(){const j=active();modal(`<h3>Arbetsläge / orsak till uppehåll</h3><p class="muted">Välj vad du gör nu. Under ett uppehåll fortsätter lasten vara öppen, men tiden räknas separat. Välj Pumpning när du fortsätter.</p><div class="work-choices">${Object.entries(workLabels).map(([key,label])=>`<button class="${workKind(j)===key?'primary':'secondary'}" onclick="setWorkKind('${key}');closeModal()">${label}</button>`).join('')}<button class="secondary" onclick="closeModal();editWorkLog('${j.id}')">Rätta arbetsmoment</button><button class="secondary" onclick="closeModal()">Stäng</button></div>`)}
function editWorkInfo(id){const j=db.jobs.find(j=>j.id===id);modal(`<h3>Kontakt & anteckningar</h3><form onsubmit="event.preventDefault();saveWorkInfo(this,'${id}')">${workFields(j)}<div class="row"><button class="primary">Spara</button><button class="secondary" type="button" onclick="closeModal()">Avbryt</button></div></form>`)}
function saveWorkInfo(f,id){const j=db.jobs.find(j=>j.id===id),previous={contactName:j.contactName,contactPhone:j.contactPhone,notes:j.notes};Object.assign(j,readWorkFields(f));if(!save()){Object.assign(j,previous);return}closeModal();render()}
function workInfo(j){const phone=String(j.contactPhone||'').replace(/[^+0-9]/g,'');return `<details class="card"><summary>Kontakt & anteckningar</summary><p>${esc(j.contactName||'Ingen kontaktperson angiven')}${phone?` · <a href="tel:${phone}">Ring ${esc(j.contactPhone)}</a>`:''}</p><p style="white-space:pre-wrap">${esc(j.notes||'Inga anteckningar ännu.')}</p><button class="secondary" onclick="editWorkInfo('${j.id}')">Ändra kontakt / anteckningar</button></details>`}
const planningBeforeWork=planningSummary;
planningSummary=function(j){return planningBeforeWork(j)+workInfo(j)};
function workBreakdown(j){return j.workEvents?.length?`<div class="card"><h3>Arbetstid per moment</h3>${Object.entries(workParts(j)).map(([kind,ms])=>`<p>${esc(workLabels[kind]||kind)}: <b>${dur(ms)}</b></p>`).join('')}<details><summary>Tidslinje</summary>${j.workEvents.map(e=>`<p>${date(e.at)} ${time(e.at)} · ${esc(workLabels[e.kind]||e.kind)}</p>`).join('')}</details></div>`:'<p class="muted">Äldre jobb saknar registrerade arbetslägen. Deras väntetid omfattar all tid utan lossning.</p>'}
const reportBeforeWork=report;
report=function(j){const explanation=j.workEvents?.length?'Arbetslägena avgör hur tiden fördelas. Väntan på betong, övriga uppehåll, etablering och tvätt redovisas separat.':'Äldre jobb: tid utan lossning räknas som väntan, inklusive tiden efter sista lasten.';return `<div class="row"><button class="primary" onclick="printWorkReport('${j.id}')">Dela / skriv ut jobbrapport</button><button class="secondary" onclick="editWorkTimes('${j.id}')">Rätta jobbets tider</button><button class="secondary" onclick="editWorkLog('${j.id}')">Rätta arbetsmoment</button></div>`+reportBeforeWork(j).replace(/<p class="muted">Jobbtid [\s\S]*?<\/p>/,`<p class="muted">${explanation}</p>`)+workBreakdown(j)};
function editWorkLog(id){const j=db.jobs.find(j=>j.id===id);if(!j.workEvents?.length)return alert('Jobbet saknar arbetsmoment. Äldre jobb behåller sin tidigare tidsberäkning.');modal(`<h3>Rätta arbetsmoment</h3><p class="muted">Första momentet börjar vid jobbstart. Tiderna ska vara i ordning. Lastens tider ändras inte.</p><form onsubmit="event.preventDefault();saveWorkLog(this,'${id}')">${j.workEvents.map((e,i)=>`<div class="card"><label>Moment ${i+1}</label><select name="kind${i}">${Object.entries(workLabels).map(([k,label])=>`<option value="${k}" ${k===e.kind?'selected':''}>${label}</option>`).join('')}</select><label>Start</label><input name="at${i}" type="datetime-local" step="1" required ${i===0?'readonly':''} value="${local(e.at)}">${i?`<label><input name="remove${i}" type="checkbox"> Ta bort felregistrerat moment</label>`:''}</div>`).join('')}<div class="row"><button class="primary">Spara moment</button><button type="button" class="secondary" onclick="closeModal()">Avbryt</button></div></form>`)}
function saveWorkLog(f,id){const j=db.jobs.find(j=>j.id===id),events=[];for(let i=0;i<j.workEvents.length;i++){if(f.elements.namedItem('remove'+i)?.checked)continue;const at=new Date(f.elements.namedItem('at'+i).value).getTime(),kind=f.elements.namedItem('kind'+i).value;if(!Number.isFinite(at)||at<j.start||at>(j.end||Date.now())||(events.length&&at<events.at(-1).at)||!Object.hasOwn(workLabels,kind))return alert('Kontrollera ordning, datum och tider för arbetsmomenten.');events.push({at,kind})}if(events[0]?.at!==j.start)return alert('Första momentet måste börja vid jobbstart.');const old=j.workEvents;j.workEvents=events;if(!save()){j.workEvents=old;return}closeModal();render()}
function editWorkTimes(id){const j=db.jobs.find(j=>j.id===id);modal(`<h3>Rätta jobbets tider</h3><p class="muted">Ändrade tider får inte hamna innanför en leverans eller ett registrerat arbetsmoment.</p><form onsubmit="event.preventDefault();saveWorkTimes(this,'${id}')"><label>Jobbstart</label><input name="begin" type="datetime-local" step="1" required value="${local(j.start)}">${j.end?`<label>Jobbslut</label><input name="end" type="datetime-local" step="1" required value="${local(j.end)}">`:''}<button class="primary">Spara</button><button class="secondary" type="button" onclick="closeModal()">Avbryt</button></form>`)}
function saveWorkTimes(f,id){const j=db.jobs.find(j=>j.id===id),start=new Date(f.begin.value).getTime(),end=f.elements.namedItem('end')?new Date(f.elements.namedItem('end').value).getTime():j.end;const copy={...j,start,end};const error=deliveryValidationError(copy);if(error)return alert(error);if(j.workEvents?.length){const events=j.workEvents.slice(1);if(events.some(e=>e.at<start||e.at>(end||Date.now())))return alert('Arbetsmoment ligger utanför de valda tiderna.');j.workEvents[0].at=start}j.start=start;j.end=end;save();closeModal();render()}
function printWorkReport(id){const j=db.jobs.find(j=>j.id===id),m=metrics(j);const w=window.open('','_blank');if(!w)return alert('Tillåt att rapporten öppnas i en ny flik.');
 w.document.write(`<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jobbrapport · ${esc(j.name)}</title><style>body{font:16px system-ui;max-width:900px;margin:24px auto;padding:16px;color:#173e34}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #ccc;text-align:left}button{padding:14px;font:inherit}@media print{button,.hint{display:none}tr{break-inside:avoid}}</style><button onclick="window.print()">Skriv ut / spara som PDF</button><p class="hint">På iPhone: använd webbläsarens delning, eller Skriv ut för att spara/dela som PDF.</p><h1>Pumpkoll · Jobbrapport</h1><h2>${esc(j.name)}</h2><p>${esc(jobKindLabel(j))} · ${esc(j.place)}</p><p>${date(j.start)} ${time(j.start)} – ${j.end?date(j.end)+' '+time(j.end):'Pågående'}</p><p>Kontakt: ${esc(j.contactName||'—')} · ${esc(j.contactPhone||'—')}</p><p>Planerat ${j.plannedVolume?num(j.plannedVolume):'—'} m³ · pumpat <b>${num(m.v)} m³</b></p><p>Pumpning ${dur(m.pumping)} · väntan på betong ${dur(m.wait)} · hela jobbet ${dur(m.elapsed)}</p><p>Pumptakt ${num(m.rate)} m³/h · hela jobbet ${num(m.totalRate)} m³/h</p>${workBreakdown(j)}<h2>Laster</h2><table><thead><tr><th>Last</th><th>Lastat / pumpat m³</th><th>Ankomst</th><th>Start</th><th>Färdig</th></tr></thead><tbody>${j.trucks.map((t,i)=>`<tr><td>${t.own?'Egen last':'Bil '+(i+1)} ${esc(t.name)}</td><td>${num(t.volume)} / ${t.empty?num(t.pumpedVolume??t.volume):'ej klar'}</td><td>${date(t.arrival)} ${time(t.arrival)}</td><td>${t.start?date(t.start)+' '+time(t.start):'—'}</td><td>${t.empty?date(t.empty)+' '+time(t.empty):'—'}</td></tr>`).join('')}</tbody></table><h2>Anteckningar / avvikelser</h2><p style="white-space:pre-wrap">${esc(j.notes||'—')}</p><p>Underlag för fakturering. Inga priser eller fakturabelopp beräknas.</p></html>`);w.document.close();
}
const csvBeforeWork=csv;
csv=function(id){const j=db.jobs.find(j=>j.id===id),m=metrics(j),q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const rows=[['Jobb',j.name],['Typ',jobKindLabel(j)],['Plats',j.place],['Kontakt',j.contactName],['Telefon',j.contactPhone],['Anteckningar',j.notes],['Pumpat m3',m.v],['Pumpning',dur(m.pumping)],['Väntan betong',dur(m.wait)],['Pumptakt m3/h',m.rate],...Object.entries(workParts(j)).map(([k,v])=>[workLabels[k],dur(v)]),[],['Last','Typ','Lastat m3','Pumpat m3','Kvar m3','Ankomst','Start','Färdig'],...j.trucks.map((t,i)=>[i+1,t.own?'Egen':'Leverans',t.volume,t.empty?(t.pumpedVolume??t.volume):'',t.empty?t.volume-(t.pumpedVolume??t.volume):'',new Date(t.arrival).toLocaleString('sv-SE'),t.start?new Date(t.start).toLocaleString('sv-SE'):'',t.empty?new Date(t.empty).toLocaleString('sv-SE'):''])];download(rows.map(r=>r.map(q).join(';')).join('\r\n'),'pumpkoll-'+date(j.start)+'.csv','text/csv;charset=utf-8')};
const backupBeforeWork=backup;
backup=function(){backupBeforeWork();try{localStorage.setItem('pumpkoll-last-export',String(Date.now()))}catch(_){}render()};
function workFilterPanel(){return `<div class="card"><h3>Sök & datumfilter</h3><label>Sök jobb, adress eller anteckningar</label><input id="workSearch" value="${esc(workFilters.search)}"><div class="row"><div><label>Från datum</label><input id="workFrom" type="date" value="${workFilters.from}"></div><div><label>Till datum</label><input id="workTo" type="date" value="${workFilters.to}"></div></div><div class="row"><button class="primary" onclick="applyWorkFilter()">Visa urval</button><button class="secondary" onclick="workDateRange('week')">Denna vecka</button><button class="secondary" onclick="workDateRange('month')">Denna månad</button><button class="secondary" onclick="workDateRange('all')">Alla datum</button></div></div>`}
function applyWorkFilter(){const from=$('#workFrom').value,to=$('#workTo').value;if(from&&to&&from>to)return alert('Från datum måste vara före Till datum.');Object.assign(workFilters,{from,to,search:$('#workSearch').value.trim()});detail=null;render()}
function workDateRange(kind){const now=new Date(),begin=new Date(now),end=new Date(now);if(kind==='week'){begin.setDate(now.getDate()-(now.getDay()+6)%7);end.setDate(begin.getDate()+6)}else if(kind==='month'){begin.setDate(1);end.setMonth(now.getMonth()+1,0)}Object.assign(workFilters,{from:kind==='all'?'':local(begin.getTime()).slice(0,10),to:kind==='all'?'':local(end.getTime()).slice(0,10),search:''});detail=null;render()}
const renderBeforeWork=render;
render=function(){renderBeforeWork();const app=$('#app'),j=active();
 if(tab==='live'&&j){const badge=app.querySelector('.row.between > .badge');if(badge)badge.textContent='● '+(workLabels[workKind(j)]||'Väntar');const box=document.createElement('section');box.className='work-top';box.innerHTML=workPanel(j);app.prepend(box)}
 if(tab==='history'||tab==='stats'){const box=document.createElement('details');box.className='card';box.open=!!(workFilters.from||workFilters.to||workFilters.search);box.innerHTML='<summary>Sök & datumfilter</summary>'+workFilterPanel();app.prepend(box)}
 if(tab==='stats'){const jobs=db.jobs.filter(j=>j.end&&!j.deleted&&matchesJobKind(j)),parts={};for(const j of jobs)for(const [k,v]of Object.entries(workParts(j)))parts[k]=(parts[k]||0)+v;const box=document.createElement('details');box.className='card';box.innerHTML='<summary>Arbetstid per moment i urvalet</summary>'+Object.entries(parts).map(([k,v])=>`<p>${workLabels[k]}: ${dur(v)}</p>`).join('')+'<p class="muted">Momentfördelningen omfattar jobb där arbetslägen registrerats.</p>';app.append(box);const text=[...app.querySelectorAll('p')].find(p=>p.textContent.startsWith('Väntetid:'));if(text)text.innerHTML='Väntetid: <b>'+dur(jobs.reduce((s,j)=>s+metrics(j).wait,0))+'</b>'}
 const last=Number(localStorage.getItem('pumpkoll-last-export')||0),latest=Math.max(0,...db.jobs.filter(j=>j.end&&!j.deleted).map(j=>j.end));if(latest>last&&(tab==='history'||tab==='stats')){const reminder=document.createElement('div');reminder.className='card backup-reminder';reminder.innerHTML='<strong>Säkerhetskopiera dina jobb</strong><p>Det finns avslutade jobb sedan senaste exportförsöket. Spara kopian i Filer eller iCloud Drive.</p><button class="primary" onclick="backup()">Exportera alla jobb</button><p class="muted">Kontrollera att filen verkligen sparades på telefonen.</p>';app.prepend(reminder)}
};
const tickBeforeWork=tick;
tick=function(){tickBeforeWork();if(tab==='live'&&active()&&$('#workProgress'))$('#workProgress').innerHTML=workProgress(active())};
// Registrerade arbetsmoment bevaras vid rättning av laster; de är en separat logg.
const updateTruckBeforeWork=updateTruck;
updateTruck=function(f,jid,tid){const j=db.jobs.find(j=>j.id===jid),t=j?.trucks.find(t=>t.id===tid);if(t?.pumpedVolume!=null&&Number(f.volume.value.replace(',','.'))<t.pumpedVolume)return alert('Lastad mängd kan inte vara mindre än registrerad pumpad mängd.');const start=new Date(f.jobStart.value).getTime(),end=f.jobEnd?new Date(f.jobEnd.value).getTime():j.end;if(j.workEvents?.slice(1).some(e=>e.at<start||e.at>(end||Date.now())))return alert('Jobbtiderna skulle hamna innanför registrerade arbetsmoment.');updateTruckBeforeWork(f,jid,tid);if(!$('#modal').open&&j.workEvents?.length){j.workEvents[0].at=j.start;save();render()}};
editJob=function(){const j=active();if(j)editWorkTimes(j.id)};
const validBeforeWork=validJob;
validJob=function(j){if(!validBeforeWork(j))return false;
 if(j.trucks.some(t=>t.pumpedVolume!=null&&(!t.own||!Number.isFinite(t.pumpedVolume)||t.pumpedVolume<0||t.pumpedVolume>t.volume)))return false;
 if(j.workEvents!=null){if(!Array.isArray(j.workEvents))return false;let last=0;for(const e of j.workEvents){if(!e||!Object.hasOwn(workLabels,e.kind)||!Number.isFinite(e.at)||e.at<j.start||e.at<last||e.at>(j.end||Date.now()))return false;last=e.at}}
 return true;
};
const editTruckBeforeWork=editTruck;
editTruck=function(jid,tid){editTruckBeforeWork(jid,tid);const t=db.jobs.find(j=>j.id===jid)?.trucks.find(t=>t.id===tid),form=$('#modal form');if(t?.own&&t.empty){const box=document.createElement('div');box.innerHTML=`<label>Pumpad mängd av egen last (m³)</label><input name="ownPumped" inputmode="decimal" required value="${t.pumpedVolume??t.volume}">`;form.querySelector('input[name="volume"]').after(box)}if(db.jobs.find(j=>j.id===jid)?.workEvents?.length){const p=document.createElement('p');p.className='muted';p.textContent='Lastens tider och arbetslägen är separata loggar. Rättade lasttider ändrar inte automatiskt momentfördelningen.';form.prepend(p)}};
const updateWithWork=updateTruck;
updateTruck=function(f,jid,tid){const t=db.jobs.find(j=>j.id===jid)?.trucks.find(t=>t.id===tid),field=f.elements.namedItem('ownPumped'),old=t?.pumpedVolume;if(field){const v=Number(field.value.replace(',','.')),loaded=Number(f.volume.value.replace(',','.'));if(!Number.isFinite(v)||v<0||v>loaded)return alert('Pumpad mängd ska vara mellan 0 och lastad mängd.');t.pumpedVolume=v}updateWithWork(f,jid,tid);if($('#modal').open){if(old===undefined)delete t.pumpedVolume;else t.pumpedVolume=old}};
setInterval(()=>{if(tab==='live'&&active()&&$('#workProgress'))$('#workProgress').innerHTML=workProgress(active())},1000);
render();tick();
