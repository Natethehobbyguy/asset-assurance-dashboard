const STORAGE_KEY = 'asset-assurance-state-v2';
const SOURCE_WEIGHTS = { physical:45, endpoint:35, network:30, owner:25, procurement:15, cmdb:10 };
const SOURCE_LABELS = { physical:'Physical audit', endpoint:'Endpoint management', network:'Network discovery', owner:'Owner confirmation', procurement:'Procurement', cmdb:'CMDB' };
const CRITICALITY = { Low:1, Medium:2, High:3, Critical:4 };
const TODAY = new Date().toISOString().slice(0, 10);

const seedAssets = [
  asset('SR-LT-0142','MacBook Pro 14 — Finance','Laptop','SN-C02F142','Maya Chen','SLC HQ / Finance','Medium',false,[ev('endpoint','2026-08-28','Jamf check-in matched serial and assigned user'),ev('physical','2026-08-27','Barcode scan during floor audit'),ev('owner','2026-08-28','Custodian confirmed')]),
  asset('SR-SW-0027','Core Switch — SLC','Network','SN-CSW0027','Infrastructure','SLC HQ / MDF','Critical',false,[ev('network','2026-08-30','SNMP poll and MAC match'),ev('physical','2026-08-30','Rack position verified')]),
  asset('SR-LT-0178','Dell Latitude — Sales','Laptop','SN-DL0178','Jordan Lee','SLC HQ / Sales','High',true,[ev('endpoint','2026-07-19','EDR check-in from expected office'),ev('cmdb','2026-06-14','Assignment record names previous team'),ev('owner','2026-08-29','Sales manager believes assignment is current')],investigation('assigned','Alex Morgan','Confirm custodian and resolve assignment conflict','2026-09-05')),
  asset('SR-MON-0119','Conference Display','Display','SN-DSP0119','Facilities','SLC HQ / Room 4B','Medium',false,[ev('physical','2026-08-11','Audit photo with visible asset tag')]),
  asset('SR-SRV-0008','Legacy File Server','Server','SN-SRV0008','Unknown','Unknown','Critical',true,[ev('cmdb','2025-12-02','Legacy CMDB record only')],investigation('in-progress','Priya Shah','Trace switch port and validate decommission status','2026-09-04')),
  asset('SR-LT-0091','ThinkPad — Former Employee','Laptop','SN-TP0091','Unknown','Unknown','High',false,[ev('procurement','2026-01-14','Purchase and warranty record found'),ev('cmdb','2026-01-14','Assigned to departed employee')],investigation('unassigned','','Contact former manager and review offboarding record','2026-09-08')),
  asset('SR-AP-0044','Wireless AP — Floor 3','Network','SN-AP0044','Infrastructure','SLC HQ / Floor 3','High',false,[ev('network','2026-08-25','Controller inventory and MAC match'),ev('physical','2026-08-24','Ceiling location verified')]),
  asset('SR-PRN-0021','Laser Printer — HR','Printer','SN-PRN0021','HR','SLC HQ / HR','Low',false,[ev('network','2026-08-13','Print server check-in'),ev('cmdb','2026-08-10','Department record matches')]),
  asset('SR-TAB-0063','Warehouse Tablet','Tablet','SN-TAB0063','Operations','West Warehouse','Medium',true,[ev('endpoint','2026-02-08','MDM record has stale location')],investigation('assigned','Alex Morgan','Ask shift lead to scan the asset tag','2026-09-06')),
  asset('SR-SRV-0017','Backup Appliance','Server','SN-BA0017','Infrastructure','DR Site','Critical',false,[ev('endpoint','2026-08-21','Backup console heartbeat'),ev('network','2026-08-21','Expected IP and MAC observed'),ev('physical','2026-08-15','Rack audit confirmed')])
];

function asset(id,name,type,serial,owner,location,criticality,conflict,evidence,investigationData=null){
  return {id,name,type,serial,owner,location,criticality,conflict,evidence,investigation:investigationData,status:'active'};
}
function ev(source,date,note){ return {id:cryptoId(),source,date,note}; }
function investigation(status,assignee,nextStep,dueDate){ return {status,assignee,nextStep,dueDate,resolution:''}; }
function cryptoId(){ return Math.random().toString(36).slice(2,10); }

const seedAudit = [
  audit('SR-SW-0027','Evidence verified','System','Network and physical evidence corroborated','2026-08-30T16:12:00Z'),
  audit('SR-LT-0142','Custody confirmed','Maya Chen','Owner confirmation matched endpoint and physical evidence','2026-08-28T19:04:00Z'),
  audit('SR-SRV-0008','Investigation started','Priya Shah','Tracing switch port and decommission records','2026-08-27T15:22:00Z'),
  audit('SR-AP-0044','Evidence verified','System','Controller inventory matched physical audit','2026-08-25T18:40:00Z')
];
function audit(assetId,action,analyst,details,timestamp=new Date().toISOString()){ return {id:cryptoId(),assetId,action,analyst,details,timestamp}; }

function freshState(){ return {assets:structuredClone(seedAssets),audit:structuredClone(seedAudit)}; }
function loadState(){
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved?.assets && saved?.audit) return saved;
  } catch {}
  return freshState();
}
let state=loadState();
function persist(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function esc(value){ return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function title(value){ return String(value).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function daysSince(date){ return Math.max(0,Math.floor((new Date(TODAY)-new Date(date))/(864e5))); }
function freshness(date){ const d=daysSince(date); return d<=30?1:d<=90?.7:d<=180?.4:.15; }
function metrics(a){
  const evidence=a.evidence||[];
  const sourcePoints=evidence.reduce((sum,e)=>sum+(SOURCE_WEIGHTS[e.source]||0)*freshness(e.date),0);
  const corroboration=new Set(evidence.map(e=>e.source)).size>=2?10:0;
  const confidence=Math.max(0,Math.min(100,Math.round(sourcePoints+corroboration-(a.conflict?20:0))));
  const tier=confidence>=80?'verified':confidence>=45?'probable':'unknown';
  const rawRisk=Math.round((100-confidence)*(CRITICALITY[a.criticality]||2)/4+(a.investigation?.status==='in-progress'?5:0));
  const riskScore=Math.min(100,rawRisk);
  const risk=riskScore>=75?'critical':riskScore>=50?'high':riskScore>=25?'medium':'low';
  const lastEvidence=evidence.length?evidence.map(e=>e.date).sort().at(-1):'Never';
  return {confidence,tier,riskScore,risk,lastEvidence};
}
function badge(value,score){ return `<span class="badge ${esc(value)}">${title(value)}${score===undefined?'':` · ${score}`}</span>`; }
function addAudit(assetId,action,analyst,details){ state.audit.unshift(audit(assetId,action,analyst||'Portfolio Demo User',details)); }

function renderDashboard(){
  const rows=state.assets.map(a=>({...a,...metrics(a)}));
  const counts={verified:0,probable:0,unknown:0}; rows.forEach(a=>counts[a.tier]++);
  const assurance=rows.length?Math.round(rows.reduce((s,a)=>s+a.confidence,0)/rows.length):0;
  const open=rows.filter(a=>a.tier==='unknown'||(a.investigation&&a.investigation.status!=='resolved')).length;
  const highRisk=rows.filter(a=>['critical','high'].includes(a.risk)).length;
  document.getElementById('summary-cards').innerHTML=[
    ['Total assets',rows.length,'Across the normalized inventory','neutral'],
    ['Assurance index',assurance+'%','Average evidence confidence','verified'],
    ['Open investigations',open,'Require analyst follow-up','probable'],
    ['High-risk exposure',highRisk,'Critical or high risk','unknown']
  ].map(([label,value,sub,tone])=>`<div class="card ${tone}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`).join('');
  document.getElementById('assurance-score').innerHTML=`<b>${assurance}%</b><small>index</small>`;
  document.getElementById('assurance-chart').innerHTML=barChart(['verified','probable','unknown'],k=>counts[k],rows.length,k=>k);
  const risks={critical:0,high:0,medium:0,low:0}; rows.forEach(a=>risks[a.risk]++);
  document.getElementById('risk-chart').innerHTML=barChart(['critical','high','medium','low'],k=>risks[k],rows.length,k=>k);
  const priority=rows.filter(a=>a.risk!=='low'&&(a.tier!=='verified'||a.investigation)).sort((a,b)=>b.riskScore-a.riskScore).slice(0,5);
  document.getElementById('priority-list').innerHTML=priority.length?priority.map(a=>`<button class="priority-item item-button" data-asset="${esc(a.id)}"><span><b>${esc(a.name)}</b><small>${esc(a.investigation?.nextStep||'Review evidence and assign investigation')}</small></span><span class="right">${badge(a.risk,a.riskScore)}<small>${esc(a.id)}</small></span></button>`).join(''):'<div class="empty">No priority actions.</div>';
  const coverage=Object.keys(SOURCE_WEIGHTS).map(source=>({source,count:rows.filter(a=>a.evidence.some(e=>e.source===source)).length})).sort((a,b)=>b.count-a.count);
  document.getElementById('source-chart').innerHTML=coverage.map(x=>`<div class="coverage"><span><b>${esc(SOURCE_LABELS[x.source])}</b><small>${x.count} of ${rows.length} assets</small></span><strong>${rows.length?Math.round(x.count/rows.length*100):0}%</strong></div>`).join('');
  document.getElementById('activity-list').innerHTML=state.audit.slice(0,5).map(log=>`<div class="activity-item"><span><b>${esc(log.action)}</b><small>${esc(assetName(log.assetId))} · ${esc(log.details)}</small></span><span class="right"><time>${formatDate(log.timestamp)}</time><small>${esc(log.analyst)}</small></span></div>`).join('');
  document.getElementById('queue-count').textContent=open;
}
function barChart(keys,getValue,total,getClass){
  return keys.map(k=>{const v=getValue(k);return `<div class="bar-row"><span>${title(k)}</span><div class="bar-track"><div class="bar ${getClass(k)}" style="width:${total?Math.max(v?3:0,v/total*100):0}%"></div></div><b>${v}</b></div>`}).join('');
}
function assetName(id){ return state.assets.find(a=>a.id===id)?.name||id; }
function formatDate(value){ return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(new Date(value)); }

function renderFilters(){
  const select=document.getElementById('type-filter'),current=select.value;
  const types=[...new Set(state.assets.map(a=>a.type))].sort();
  select.innerHTML='<option value="all">All asset types</option>'+types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
  select.value=types.includes(current)?current:'all';
}
function filteredAssets(){
  const q=document.getElementById('search').value.toLowerCase().trim(),tier=document.getElementById('tier-filter').value,risk=document.getElementById('risk-filter').value,type=document.getElementById('type-filter').value;
  return state.assets.map(a=>({...a,...metrics(a)})).filter(a=>(tier==='all'||a.tier===tier)&&(risk==='all'||a.risk===risk)&&(type==='all'||a.type===type)&&(!q||[a.id,a.name,a.type,a.serial,a.owner,a.location,...a.evidence.map(e=>e.note)].some(v=>String(v).toLowerCase().includes(q)))).sort((a,b)=>b.riskScore-a.riskScore);
}
function renderAssets(){
  const rows=filteredAssets(); document.getElementById('result-count').textContent=`Showing ${rows.length} of ${state.assets.length} assets`;
  document.getElementById('asset-table').innerHTML=rows.length?rows.map(a=>`<tr><td><div class="asset-name">${esc(a.name)}</div><div class="asset-meta">${esc(a.id)} · ${esc(a.serial)}</div></td><td>${esc(a.type)}</td><td>${badge(a.tier,a.confidence)}</td><td>${badge(a.risk,a.riskScore)}</td><td>${esc(a.location)}</td><td>${esc(a.owner)}</td><td><b>${a.evidence.length} sources</b><div class="asset-meta">${esc(a.lastEvidence)}</div></td><td><button class="row-action" data-asset="${esc(a.id)}">Inspect</button></td></tr>`).join(''):'<tr><td colspan="8"><div class="empty">No assets match your filters.</div></td></tr>';
}
function renderDiscovery(){
  const rows=state.assets.map(a=>({...a,...metrics(a)})).filter(a=>a.tier==='unknown'||(a.investigation&&a.investigation.status!=='resolved')).sort((a,b)=>b.riskScore-a.riskScore);
  const statusCounts={unassigned:0,assigned:0,'in-progress':0}; rows.forEach(a=>statusCounts[a.investigation?.status||'unassigned']++);
  document.getElementById('queue-stats').innerHTML=Object.entries(statusCounts).map(([k,v])=>`<div><b>${v}</b><span>${title(k)}</span></div>`).join('');
  document.getElementById('discovery-list').innerHTML=rows.length?rows.map(a=>`<article class="discovery-item"><div class="discovery-main"><div class="button-row">${badge(a.risk,a.riskScore)} ${badge(a.tier,a.confidence)}</div><h3>${esc(a.name)}</h3><p>${esc(a.investigation?.nextStep||'Review available records and define the next investigative step.')}</p><div class="asset-meta">${esc(a.id)} · Last evidence ${esc(a.lastEvidence)} · ${a.evidence.length} source(s)</div></div><div class="investigation-meta"><span><small>STATUS</small><b>${title(a.investigation?.status||'unassigned')}</b></span><span><small>ASSIGNEE</small><b>${esc(a.investigation?.assignee||'Unassigned')}</b></span><span><small>DUE</small><b>${esc(a.investigation?.dueDate||'Not set')}</b></span><button class="primary-btn" data-investigate="${esc(a.id)}">Investigate</button></div></article>`).join(''):'<div class="empty">All assets are accounted for. The investigation queue is clear.</div>';
}
function renderAudit(){
  const q=document.getElementById('audit-search').value.toLowerCase().trim();
  const logs=state.audit.filter(x=>!q||[x.assetId,assetName(x.assetId),x.action,x.analyst,x.details].some(v=>String(v).toLowerCase().includes(q)));
  document.getElementById('audit-table').innerHTML=logs.length?logs.map(x=>`<tr><td><time>${esc(formatDate(x.timestamp))}</time><div class="asset-meta">${esc(new Date(x.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}</div></td><td><b>${esc(assetName(x.assetId))}</b><div class="asset-meta">${esc(x.assetId)}</div></td><td>${esc(x.action)}</td><td>${esc(x.analyst)}</td><td>${esc(x.details)}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">No audit entries match your search.</div></td></tr>';
}
function renderAll(){ renderDashboard(); renderFilters(); renderAssets(); renderDiscovery(); renderAudit(); }

function showAsset(id){
  const a=state.assets.find(x=>x.id===id); if(!a)return; const m=metrics(a);
  document.getElementById('modal-kicker').textContent=`${a.id} · ${a.type}`; document.getElementById('modal-title').textContent=a.name;
  document.getElementById('modal-body').innerHTML=`<div class="score-summary"><div><span>Confidence</span><b>${m.confidence}/100</b>${badge(m.tier)}</div><div><span>Risk</span><b>${m.riskScore}/100</b>${badge(m.risk)}</div></div>
    <div class="tabs"><button class="tab active" data-tab="details">Details</button><button class="tab" data-tab="evidence">Evidence (${a.evidence.length})</button><button class="tab" data-tab="history">History</button></div>
    <div id="tab-details" class="tab-panel active"><div class="detail-grid"><label class="field"><span>Name</span><input id="edit-name" value="${esc(a.name)}"></label><label class="field"><span>Serial</span><input id="edit-serial" value="${esc(a.serial)}"></label><label class="field"><span>Owner</span><input id="edit-owner" value="${esc(a.owner)}"></label><label class="field"><span>Location</span><input id="edit-location" value="${esc(a.location)}"></label><label class="field"><span>Criticality</span><select id="edit-criticality">${Object.keys(CRITICALITY).map(x=>`<option ${x===a.criticality?'selected':''}>${x}</option>`).join('')}</select></label><label class="check-field"><input id="edit-conflict" type="checkbox" ${a.conflict?'checked':''}><span><b>Conflicting records</b><small>Subtracts 20 confidence points</small></span></label></div><div class="modal-actions"><button class="secondary-btn close-action">Cancel</button><button id="save-details" class="primary-btn">Save Changes</button></div></div>
    <div id="tab-evidence" class="tab-panel"><div class="evidence-list">${a.evidence.length?a.evidence.slice().sort((x,y)=>y.date.localeCompare(x.date)).map(e=>`<div class="evidence-item"><span class="source-icon">${SOURCE_LABELS[e.source].slice(0,2).toUpperCase()}</span><span><b>${esc(SOURCE_LABELS[e.source])}</b><small>${esc(e.note)}</small></span><time>${esc(e.date)}</time></div>`).join(''):'<div class="empty">No evidence recorded.</div>'}</div><div class="divider"></div><h3>Add evidence</h3><div class="detail-grid"><label class="field"><span>Source</span><select id="new-source">${Object.entries(SOURCE_LABELS).map(([k,v])=>`<option value="${k}">${v} (+${SOURCE_WEIGHTS[k]})</option>`).join('')}</select></label><label class="field"><span>Observed date</span><input id="new-evidence-date" type="date" value="${TODAY}"></label><label class="field full"><span>Observation</span><textarea id="new-evidence-note" rows="3" placeholder="What did this source confirm?"></textarea></label></div><div class="modal-actions"><button id="add-evidence" class="primary-btn">Add & Recalculate</button></div></div>
    <div id="tab-history" class="tab-panel"><div class="evidence-list">${state.audit.filter(x=>x.assetId===a.id).map(x=>`<div class="evidence-item"><span class="source-icon">AL</span><span><b>${esc(x.action)}</b><small>${esc(x.details)} · ${esc(x.analyst)}</small></span><time>${esc(formatDate(x.timestamp))}</time></div>`).join('')||'<div class="empty">No history recorded.</div>'}</div></div>`;
  openModal();
  bindTabs();
  document.querySelector('.close-action').onclick=closeModal;
  document.getElementById('save-details').onclick=()=>{const before=metrics(a);a.name=value('edit-name');a.serial=value('edit-serial');a.owner=value('edit-owner');a.location=value('edit-location');a.criticality=value('edit-criticality');a.conflict=document.getElementById('edit-conflict').checked;const after=metrics(a);addAudit(a.id,'Asset updated','Portfolio Demo User',`Details saved; confidence ${before.confidence} → ${after.confidence}, risk ${before.riskScore} → ${after.riskScore}`);persist();closeModal();renderAll();};
  document.getElementById('add-evidence').onclick=()=>{const note=value('new-evidence-note').trim();if(!note){document.getElementById('new-evidence-note').focus();return;}const before=metrics(a);const source=value('new-source');a.evidence.push(ev(source,value('new-evidence-date'),note));const after=metrics(a);addAudit(a.id,'Evidence added','Portfolio Demo User',`${SOURCE_LABELS[source]} added; confidence ${before.confidence} → ${after.confidence}`);persist();renderAll();showAsset(id);activateTab('evidence');};
}
function showInvestigation(id){
  const a=state.assets.find(x=>x.id===id);if(!a)return; const current=a.investigation||investigation('unassigned','','',TODAY);
  document.getElementById('modal-kicker').textContent=`${a.id} · RISK ${metrics(a).riskScore}`;document.getElementById('modal-title').textContent='Investigate this asset';
  document.getElementById('modal-body').innerHTML=`<div class="investigation-banner"><b>${esc(a.name)}</b><span>${badge(metrics(a).tier,metrics(a).confidence)} ${badge(metrics(a).risk,metrics(a).riskScore)}</span></div><div class="detail-grid"><label class="field"><span>Status</span><select id="inv-status"><option value="unassigned">Unassigned</option><option value="assigned">Assigned</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option></select></label><label class="field"><span>Assignee</span><input id="inv-assignee" value="${esc(current.assignee)}" placeholder="Analyst name"></label><label class="field"><span>Due date</span><input id="inv-due" type="date" value="${esc(current.dueDate||TODAY)}"></label><label class="field full"><span>Next investigative step</span><textarea id="inv-step" rows="3" placeholder="Define a concrete next action">${esc(current.nextStep)}</textarea></label><label class="field full"><span>Resolution / notes</span><textarea id="inv-resolution" rows="3" placeholder="Required when resolving">${esc(current.resolution)}</textarea></label></div><div class="modal-actions"><button class="secondary-btn close-action">Cancel</button><button id="save-investigation" class="primary-btn">Save Investigation</button></div>`;
  document.getElementById('inv-status').value=current.status;openModal();document.querySelector('.close-action').onclick=closeModal;
  document.getElementById('save-investigation').onclick=()=>{const status=value('inv-status'),resolution=value('inv-resolution').trim();if(status==='resolved'&&!resolution){document.getElementById('inv-resolution').focus();return;}a.investigation={status,assignee:value('inv-assignee').trim(),dueDate:value('inv-due'),nextStep:value('inv-step').trim(),resolution};addAudit(a.id,status==='resolved'?'Investigation resolved':'Investigation updated',value('inv-assignee').trim()||'Portfolio Demo User',resolution||value('inv-step').trim()||`Status changed to ${title(status)}`);persist();closeModal();renderAll();};
}
function value(id){return document.getElementById(id).value;}
function openModal(){document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');document.getElementById('close-modal').focus();}
function closeModal(){document.getElementById('modal').classList.add('hidden');document.body.classList.remove('modal-open');}
function bindTabs(){document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>activateTab(t.dataset.tab));}
function activateTab(name){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));}

function showNewAsset(){
  document.getElementById('modal-kicker').textContent='NEW INVENTORY RECORD';document.getElementById('modal-title').textContent='Add an asset';
  document.getElementById('modal-body').innerHTML=`<div class="detail-grid"><label class="field"><span>Asset ID</span><input id="add-id" placeholder="SR-LT-0200"></label><label class="field"><span>Name</span><input id="add-name" placeholder="Device and business use"></label><label class="field"><span>Type</span><input id="add-type" placeholder="Laptop"></label><label class="field"><span>Serial</span><input id="add-serial"></label><label class="field"><span>Owner</span><input id="add-owner" value="Unassigned"></label><label class="field"><span>Location</span><input id="add-location" value="Unknown"></label><label class="field"><span>Criticality</span><select id="add-criticality">${Object.keys(CRITICALITY).map(x=>`<option>${x}</option>`).join('')}</select></label></div><p id="add-error" class="error hidden"></p><div class="modal-actions"><button class="secondary-btn close-action">Cancel</button><button id="create-asset" class="primary-btn">Create Asset</button></div>`;openModal();document.querySelector('.close-action').onclick=closeModal;
  document.getElementById('create-asset').onclick=()=>{const id=value('add-id').trim().toUpperCase(),name=value('add-name').trim();if(!id||!name||state.assets.some(a=>a.id===id)){const e=document.getElementById('add-error');e.textContent=!id||!name?'Asset ID and name are required.':'That asset ID already exists.';e.classList.remove('hidden');return;}state.assets.push(asset(id,name,value('add-type').trim()||'Other',value('add-serial').trim(),value('add-owner').trim()||'Unassigned',value('add-location').trim()||'Unknown',value('add-criticality'),false,[]));addAudit(id,'Asset created','Portfolio Demo User','Manual inventory record created; verification required');persist();closeModal();renderAll();showAsset(id);};
}

function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i],next=text[i+1];if(c==='"'&&quoted&&next==='"'){field+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&next==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=c;}
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function importCSV(text){
  const rows=parseCSV(text);if(rows.length<2)throw new Error('The CSV must include a header and at least one asset.');
  const headers=rows[0].map(h=>h.trim().toLowerCase());const required=['id','name','type','serial','owner','location','criticality','evidence_source','evidence_date','evidence_note'];const missing=required.filter(h=>!headers.includes(h));if(missing.length)throw new Error(`Missing columns: ${missing.join(', ')}`);
  let created=0,updated=0,evidenceAdded=0,skipped=0;
  rows.slice(1).forEach(cols=>{const data=Object.fromEntries(headers.map((h,i)=>[h,(cols[i]||'').trim()]));if(!data.id||!data.name){skipped++;return;}let a=state.assets.find(x=>x.id.toLowerCase()===data.id.toLowerCase());const wasNew=!a;if(a){a.name=data.name||a.name;a.type=data.type||a.type;a.serial=data.serial||a.serial;a.owner=data.owner||a.owner;a.location=data.location||a.location;a.criticality=Object.hasOwn(CRITICALITY,data.criticality)?data.criticality:a.criticality;updated++;}else{a=asset(data.id.toUpperCase(),data.name,data.type||'Other',data.serial,data.owner||'Unassigned',data.location||'Unknown',Object.hasOwn(CRITICALITY,data.criticality)?data.criticality:'Medium',false,[]);state.assets.push(a);created++;}if(SOURCE_WEIGHTS[data.evidence_source]&&data.evidence_date&&data.evidence_note&&!a.evidence.some(e=>e.source===data.evidence_source&&e.date===data.evidence_date&&e.note===data.evidence_note)){a.evidence.push(ev(data.evidence_source,data.evidence_date,data.evidence_note));evidenceAdded++;}addAudit(a.id,'CSV import','Portfolio Demo User',`Record ${wasNew?'created':'updated'} from CSV`);});
  persist();return {created,updated,evidenceAdded,skipped};
}
const CSV_HEADERS=['id','name','type','serial','owner','location','criticality','confidence_score','confidence_tier','risk_score','risk_level','evidence_source','evidence_date','evidence_note'];
function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function assetCSV(includeComputed=true){
  const headers=includeComputed?CSV_HEADERS:CSV_HEADERS.filter(h=>!['confidence_score','confidence_tier','risk_score','risk_level'].includes(h));
  const rows=state.assets.flatMap(a=>{const m=metrics(a),evidence=a.evidence.length?a.evidence:[{}];return evidence.map(e=>({id:a.id,name:a.name,type:a.type,serial:a.serial,owner:a.owner,location:a.location,criticality:a.criticality,confidence_score:m.confidence,confidence_tier:m.tier,risk_score:m.riskScore,risk_level:m.risk,evidence_source:e.source||'',evidence_date:e.date||'',evidence_note:e.note||''}));});
  return [headers.join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\n');
}
function download(name,text){const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function showNotice(message,error=false){const el=document.getElementById('import-result');el.textContent=message;el.className=`notice ${error?'error-notice':'success-notice'}`;}

function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===view));document.querySelectorAll('.nav-btn').forEach(n=>n.classList.toggle('active',n.dataset.view===view));document.querySelector('nav').classList.remove('open');document.getElementById('mobile-menu').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));
['search','tier-filter','risk-filter','type-filter'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',renderAssets));
document.getElementById('audit-search').addEventListener('input',renderAudit);
document.addEventListener('click',e=>{const assetId=e.target.closest('[data-asset]')?.dataset.asset,investigateId=e.target.closest('[data-investigate]')?.dataset.investigate;if(assetId)showAsset(assetId);if(investigateId)showInvestigation(investigateId);});
document.getElementById('close-modal').onclick=closeModal;document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
document.getElementById('mobile-menu').onclick=()=>{const nav=document.querySelector('nav'),open=nav.classList.toggle('open');document.getElementById('mobile-menu').setAttribute('aria-expanded',String(open));};
document.getElementById('load-scenario').onclick=()=>{if(confirm('Reset all demo assets and audit history?')){state=freshState();persist();renderAll();}};
document.getElementById('add-asset').onclick=showNewAsset;
document.getElementById('import-csv').onclick=()=>document.getElementById('csv-file').click();
document.getElementById('csv-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const result=importCSV(await file.text());renderAll();showNotice(`Import complete: ${result.created} created, ${result.updated} updated, ${result.evidenceAdded} evidence observations added, ${result.skipped} skipped.`);}catch(error){showNotice(error.message,true);}e.target.value='';};
document.getElementById('export-csv').onclick=()=>download('asset-assurance-inventory.csv',assetCSV());
document.getElementById('download-template').onclick=()=>download('asset-import-template.csv','id,name,type,serial,owner,location,criticality,evidence_source,evidence_date,evidence_note\nSR-LT-0200,Example Laptop,Laptop,SN-EXAMPLE,Employee Name,SLC HQ,Medium,endpoint,2026-09-04,Endpoint check-in matched serial');
document.getElementById('export-audit').onclick=()=>{const h=['timestamp','asset_id','asset_name','action','analyst','details'];download('asset-assurance-audit.csv',[h.join(','),...state.audit.map(x=>[x.timestamp,x.assetId,assetName(x.assetId),x.action,x.analyst,x.details].map(csvCell).join(','))].join('\n'));};
renderAll();
