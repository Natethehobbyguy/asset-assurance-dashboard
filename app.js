const STORAGE_KEY = 'asset-assurance-demo-v1';
const today = new Date().toISOString().slice(0, 10);

const seedAssets = [
  { id:'SR-LT-0142', name:'MacBook Pro 14 — Finance', type:'Laptop', owner:'Maya Chen', location:'SLC HQ / Finance', confidence:'verified', lastVerified:'2026-08-28', evidence:'Barcode scan + endpoint check-in', action:'No action required', criticality:'Medium', status:'active' },
  { id:'SR-SW-0027', name:'Core Switch — SLC', type:'Network', owner:'Infrastructure', location:'SLC HQ / MDF', confidence:'verified', lastVerified:'2026-08-30', evidence:'SNMP + physical audit', action:'No action required', criticality:'Critical', status:'active' },
  { id:'SR-LT-0178', name:'Dell Latitude — Sales', type:'Laptop', owner:'Jordan Lee', location:'SLC HQ / Sales', confidence:'probable', lastVerified:'2026-07-19', evidence:'Endpoint check-in; assignment record stale', action:'Confirm owner', criticality:'High', status:'active' },
  { id:'SR-MON-0119', name:'Conference Display', type:'Display', owner:'Facilities', location:'SLC HQ / Room 4B', confidence:'probable', lastVerified:'2026-06-11', evidence:'Physical audit photo', action:'Reverify location', criticality:'Medium', status:'active' },
  { id:'SR-SRV-0008', name:'Legacy File Server', type:'Server', owner:'Unknown', location:'Unknown', confidence:'unknown', lastVerified:'2025-12-02', evidence:'CMDB record only', action:'Locate / investigate', criticality:'Critical', status:'active' },
  { id:'SR-LT-0091', name:'ThinkPad — Former Employee', type:'Laptop', owner:'Unknown', location:'Unknown', confidence:'unknown', lastVerified:'2026-01-14', evidence:'Procurement record; no endpoint check-in', action:'Locate / reconcile', criticality:'High', status:'active' },
  { id:'SR-AP-0044', name:'Wireless AP — Floor 3', type:'Network', owner:'Infrastructure', location:'SLC HQ / Floor 3', confidence:'verified', lastVerified:'2026-08-25', evidence:'Controller inventory + MAC match', action:'No action required', criticality:'High', status:'active' },
  { id:'SR-PRN-0021', name:'Laser Printer — HR', type:'Printer', owner:'HR', location:'SLC HQ / HR', confidence:'probable', lastVerified:'2026-05-23', evidence:'Print server + department record', action:'Physical confirmation', criticality:'Low', status:'active' },
  { id:'SR-TAB-0063', name:'Warehouse Tablet', type:'Tablet', owner:'Operations', location:'West Warehouse', confidence:'unknown', lastVerified:'2026-02-08', evidence:'MDM record with stale location', action:'Locate / investigate', criticality:'Medium', status:'active' },
  { id:'SR-SRV-0017', name:'Backup Appliance', type:'Server', owner:'Infrastructure', location:'DR Site', confidence:'verified', lastVerified:'2026-08-21', evidence:'Backup console + network check', action:'No action required', criticality:'Critical', status:'active' }
];

let assets = loadAssets();
let activity = [
  {date:'2026-08-30', text:'Core Switch — SLC verified', evidence:'SNMP + physical audit'},
  {date:'2026-08-28', text:'MacBook Pro 14 — Finance verified', evidence:'Barcode scan + endpoint check-in'},
  {date:'2026-08-25', text:'Wireless AP — Floor 3 verified', evidence:'Controller inventory + MAC match'},
  {date:'2026-08-21', text:'Backup Appliance verified', evidence:'Backup console + network check'}
];

function loadAssets(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seedAssets); }
  catch { return structuredClone(seedAssets); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(assets)); }
function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function label(v){ return v.charAt(0).toUpperCase()+v.slice(1); }
function badge(c){ return `<span class="badge ${c}">${label(c)}</span>`; }

function renderDashboard(){
  const counts = ['verified','probable','unknown'].reduce((o,k)=>(o[k]=assets.filter(a=>a.confidence===k).length,o),{});
  const assurance = Math.round(((counts.verified + counts.probable*.65)/assets.length)*100);
  document.getElementById('summary-cards').innerHTML = `
    <div class="card"><div class="label">Total assets</div><div class="value">${assets.length}</div><div class="sub">Across all inventory sources</div></div>
    <div class="card"><div class="label">Verified</div><div class="value">${counts.verified}</div><div class="sub">Current supporting evidence</div></div>
    <div class="card"><div class="label">Probable</div><div class="value">${counts.probable}</div><div class="sub">Needs confirmation</div></div>
    <div class="card"><div class="label">Unknown</div><div class="value">${counts.unknown}</div><div class="sub">Requires investigation</div></div>`;
  document.getElementById('assurance-chart').innerHTML = ['verified','probable','unknown'].map(k=>`<div class="bar-row"><span>${label(k)}</span><div class="bar-track"><div class="bar ${k}" style="width:${Math.max(5,(counts[k]/assets.length)*100)}%"></div></div><b>${counts[k]}</b></div>`).join('') + `<p class="muted" style="margin:8px 0 0;font-size:12px">Assurance index: <b>${assurance}%</b> (probable records weighted at 65%).</p>`;
  const priorities = assets.filter(a=>a.confidence==='unknown' || a.criticality==='Critical').sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[a.criticality]-({Critical:0,High:1,Medium:2,Low:3}[b.criticality]))).slice(0,4);
  document.getElementById('priority-list').innerHTML = priorities.map(a=>`<div class="priority-item"><div><b>${esc(a.name)}</b><div class="asset-meta">${esc(a.action)} · ${esc(a.criticality)} criticality</div></div>${badge(a.confidence)}</div>`).join('');
  document.getElementById('activity-list').innerHTML = activity.slice(0,5).map(x=>`<div class="activity-item"><div><b>${esc(x.text)}</b><div class="asset-meta">${esc(x.evidence)}</div></div><span class="muted">${x.date}</span></div>`).join('');
}

function renderFilters(){
  const select=document.getElementById('type-filter');
  const types=[...new Set(assets.map(a=>a.type))].sort();
  select.innerHTML='<option value="all">All asset types</option>'+types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
}
function renderAssets(){
  const q=document.getElementById('search').value.toLowerCase().trim();
  const tier=document.getElementById('tier-filter').value;
  const type=document.getElementById('type-filter').value;
  const filtered=assets.filter(a=>(tier==='all'||a.confidence===tier)&&(type==='all'||a.type===type)&&(!q||Object.values(a).some(v=>String(v).toLowerCase().includes(q))));
  document.getElementById('asset-table').innerHTML=filtered.length ? filtered.map(a=>`<tr>
    <td><div class="asset-name">${esc(a.name)}</div><div class="asset-meta">${esc(a.id)}</div></td><td>${esc(a.type)}</td><td>${badge(a.confidence)}</td><td>${esc(a.location)}</td><td>${esc(a.owner)}</td><td>${esc(a.lastVerified)}</td><td><button class="row-action" data-asset="${esc(a.id)}">Inspect</button></td>
  </tr>`).join('') : '<tr><td colspan="7"><div class="empty">No assets match your filters.</div></td></tr>';
}
function renderDiscovery(){
  const list=assets.filter(a=>a.confidence==='unknown').sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[a.criticality]-({Critical:0,High:1,Medium:2,Low:3}[b.criticality])));
  document.getElementById('discovery-list').innerHTML=list.length?list.map(a=>`<div class="discovery-item"><div><b>${esc(a.name)}</b><div class="asset-meta">${esc(a.id)} · Last evidence ${esc(a.lastVerified)} · ${esc(a.evidence)}</div></div><div><span class="badge unknown">Unknown</span><button class="row-action" data-asset="${esc(a.id)}"> Investigate</button></div></div>`).join(''):'<div class="empty">Great news—there are no unknown assets.</div>';
}
function showAsset(id){
  const a=assets.find(x=>x.id===id); if(!a)return;
  document.getElementById('modal-title').textContent=a.name;
  document.getElementById('modal-body').innerHTML=`<div class="detail-grid">
    <div class="field"><label>Asset ID</label><input value="${esc(a.id)}" disabled></div>
    <div class="field"><label>Confidence</label><select id="edit-confidence"><option value="verified">Verified</option><option value="probable">Probable</option><option value="unknown">Unknown</option></select></div>
    <div class="field"><label>Owner</label><input id="edit-owner" value="${esc(a.owner)}"></div>
    <div class="field"><label>Location</label><input id="edit-location" value="${esc(a.location)}"></div>
    <div class="field"><label>Last verified</label><input id="edit-date" type="date" value="${esc(a.lastVerified)}"></div>
    <div class="field"><label>Criticality</label><select id="edit-criticality"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
    <div class="field full"><label>Evidence</label><textarea id="edit-evidence" rows="3">${esc(a.evidence)}</textarea></div>
  </div><div class="modal-actions"><button id="cancel-modal" class="secondary-btn">Cancel</button><button id="save-asset" class="primary-btn">Save & Reclassify</button></div>`;
  document.getElementById('edit-confidence').value=a.confidence; document.getElementById('edit-criticality').value=a.criticality;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('cancel-modal').onclick=closeModal;
  document.getElementById('save-asset').onclick=()=>{
    const old=a.confidence;
    a.confidence=document.getElementById('edit-confidence').value; a.owner=document.getElementById('edit-owner').value; a.location=document.getElementById('edit-location').value; a.lastVerified=document.getElementById('edit-date').value; a.criticality=document.getElementById('edit-criticality').value; a.evidence=document.getElementById('edit-evidence').value;
    save(); activity.unshift({date:today,text:`${a.name} moved from ${label(old)} to ${label(a.confidence)}`,evidence:a.evidence}); closeModal(); renderAll();
  };
}
function closeModal(){document.getElementById('modal').classList.add('hidden');}
function renderAll(){renderDashboard();renderFilters();renderAssets();renderDiscovery();}

document.querySelectorAll('.nav-btn,.text-btn').forEach(btn=>btn.addEventListener('click',()=>{const view=btn.dataset.view;if(!view)return;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));document.getElementById(view).classList.add('active-view');document.querySelectorAll('.nav-btn').forEach(n=>n.classList.toggle('active',n.dataset.view===view));}));
document.getElementById('search').addEventListener('input',renderAssets); document.getElementById('tier-filter').addEventListener('change',renderAssets); document.getElementById('type-filter').addEventListener('change',renderAssets);
document.addEventListener('click',e=>{const id=e.target.dataset.asset;if(id)showAsset(id);}); document.getElementById('close-modal').onclick=closeModal; document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
document.getElementById('reset-data').onclick=()=>{assets=structuredClone(seedAssets);save();renderAll();};
document.getElementById('add-asset').onclick=()=>{
  const id=`SR-NEW-${String(assets.length+1).padStart(4,'0')}`; assets.push({id,name:'New Asset',type:'Laptop',owner:'Unassigned',location:'Unknown',confidence:'unknown',lastVerified:today,evidence:'Added manually — verification required',action:'Locate / investigate',criticality:'Medium',status:'active'});save();renderAll();showAsset(id);
};
renderAll();
