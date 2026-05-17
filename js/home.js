// ══════════════════════════════════════════════
// ホーム画面
// ══════════════════════════════════════════════
function switchHomeTab(tab, btn){
  homeTab = tab;
  document.querySelectorAll('.home-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderHome();
}

function renderHome(){
  const el = document.getElementById('home-content');
  const now = new Date();
  const todayStr   = now.toISOString().slice(0,10);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0,10);
  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate()+30);
  const thirtyDaysLaterStr = thirtyDaysLater.toISOString().slice(0,10);

  if(homeTab==='current')  renderCurrentTab(el, todayStr, twoWeeksAgoStr, thirtyDaysLaterStr);
  if(homeTab==='past')     renderPastTab(el, twoWeeksAgoStr);
  if(homeTab==='upcoming') renderUpcomingTab(el, todayStr);
  if(homeTab==='pastall')  renderPastAllTab(el, todayStr);
}

// ── 当月・直近：-14日〜+30日の公式スケジュール＋ユーザー登録済み ──
function renderCurrentTab(el, todayStr, twoWeeksAgoStr, thirtyDaysLaterStr){
  // 公式スケジュールから -14日〜+30日
  const entries = officialSchedule
    .filter(e => e.dates[0] >= twoWeeksAgoStr && e.dates[0] <= thirtyDaysLaterStr)
    .sort((a,b)=>a.dates[0].localeCompare(b.dates[0]));

  // カスタム大会（officialIdなし）同範囲
  const customList = S.tournaments
    .filter(t => !t.officialId && t.date >= twoWeeksAgoStr && t.date <= thirtyDaysLaterStr);

  if(!entries.length && !customList.length){
    el.innerHTML='<div class="empty">当月・直近の大会はありません</div>'; return;
  }

  const rows = [];
  entries.forEach(e=>{
    const reg = S.tournaments.find(t=>t.officialId===e.id);
    rows.push({ date: e.dates[0], html: reg ? buildRegisteredCard(reg) : buildSuggestCard(e) });
  });
  customList.forEach(t=>{
    rows.push({ date: t.date, html: buildRegisteredCard(t) });
  });
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  el.innerHTML = buildMonthGroupsFromRows(rows);
}

// ── 記録：ユーザー登録済み全件 ──
let pastSortOrder = 'desc'; // desc=新しい順 asc=古い順
function renderPastTab(el, twoWeeksAgoStr){
  const list = [...S.tournaments].sort((a,b)=>
    pastSortOrder==='desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );
  const sortBtn = `<div style="display:flex;justify-content:flex-end;margin-bottom:8px">
    <button class="btn btn-sm" onclick="togglePastSort()">
      ${pastSortOrder==='desc'?'新しい順 ▼':'古い順 ▲'}
    </button>
  </div>`;
  if(!list.length){ el.innerHTML='<div class="empty">記録がありません</div>'; return; }
  el.innerHTML = sortBtn + buildMonthGroupsFromRows(list.map(t=>({ date:t.date, html:buildRegisteredCard(t) })));
}
function togglePastSort(){
  pastSortOrder = pastSortOrder==='desc'?'asc':'desc';
  const el=document.getElementById('home-content');
  const now=new Date();
  const twoWeeksAgo=new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);
  renderPastTab(el, twoWeeksAgo.toISOString().slice(0,10));
}

// ── 今後の公式大会：今日以降の公式スケジュール ──
function renderUpcomingTab(el, todayStr){
  const entries = officialSchedule
    .filter(e=>e.dates[0]>=todayStr)
    .sort((a,b)=>a.dates[0].localeCompare(b.dates[0]));
  if(!entries.length){ el.innerHTML='<div class="empty">今後の公式大会情報はありません</div>'; return; }
  const rows = entries.map(e=>{
    const reg = S.tournaments.find(t=>t.officialId===e.id);
    return { date: e.dates[0], html: reg ? buildRegisteredCard(reg) : buildSuggestCard(e) };
  });
  el.innerHTML = buildMonthGroupsFromRows(rows);
}

// ── 過去の公式大会：今日より前の公式スケジュール ──
function renderPastAllTab(el, todayStr){
  const entries = officialSchedule
    .filter(e=>e.dates[0]<todayStr)
    .sort((a,b)=>b.dates[0].localeCompare(a.dates[0]));
  if(!entries.length){ el.innerHTML='<div class="empty">過去の公式大会情報はありません</div>'; return; }
  const rows = entries.map(e=>{
    const reg = S.tournaments.find(t=>t.officialId===e.id);
    return { date: e.dates[0], html: reg ? buildRegisteredCard(reg) : buildSuggestCard(e) };
  });
  el.innerHTML = buildMonthGroupsFromRows(rows);
}

// ── 月グループ化共通 ──
function buildMonthGroupsFromRows(rows){
  const byMonth = {};
  rows.forEach(row=>{
    const m = row.date.slice(0,7);
    if(!byMonth[m]) byMonth[m]=[];
    byMonth[m].push(row.html);
  });
  let h='';
  Object.entries(byMonth).forEach(([m,cards])=>{
    const [y,mo]=m.split('-');
    h+=`<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    cards.forEach(c=>{ h+=c; });
    h+='</div>';
  });
  return h;
}

// ── 登録済み大会カード ──
function buildRegisteredCard(t){
  const recs = t.records||[];
  const wins = recs.filter(r=>r.format==='bo3'?r.setResult==='win':r.result==='win').length;
  const d1=getDeck(t.deckId1); const d2=getDeck(t.deckId2);
  const deckStr=[d1,d2].filter(Boolean)
    .map(d=>`<span class="badge b-deck" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(d.className,11)}${d.name}</span>`)
    .join(' ');
  const recordStr=recs.length?`${wl(wins,recs.length-wins)} (${pct(wins,recs.length)})`:'';
  const officialBadge=isOfficial(t)?`<span class="badge b-official">公式</span>`:`<span class="badge b-custom">非公式</span>`;
  const tagBadges=(t.tags||[]).filter(tag=>tag!=='公式'&&tag!=='非公式')
    .map(tag=>`<span class="badge b-custom">${tag}</span>`).join('');
  return `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:500">${t.group||t.name}</span>
        <span class="badge ${PHASE_CLS[t.phase]||''}">${PHASE_LABEL[t.phase]||t.phase}</span>
        ${officialBadge}${tagBadges}
      </div>
      <div style="font-size:12px;color:var(--text2);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span>${t.date}</span>${deckStr}
        ${recordStr?`<span style="font-weight:500">${recordStr}</span>`:`<span style="color:var(--text3)">未記録</span>`}
      </div>
    </div>
    <div class="home-card-actions" onclick="event.stopPropagation()">
      <button class="btn btn-sm btn-primary" onclick="goRecord(${t.id})">記録を見る</button>
      <button class="btn btn-sm" onclick="goAnalysis(${t.id})">分析</button>
      <button class="icon-btn" onclick="openEditTournament(${t.id})" title="編集">✎</button>
      <button class="icon-btn danger" onclick="deleteTournament(${t.id})" title="削除">✕</button>
    </div>
  </div>`;
}

// ── 未登録公式大会サジェストカード ──
function buildSuggestCard(e){
  return `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-style:dashed;opacity:0.75">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:500">${e.group}</span>
        <span class="badge ${PHASE_CLS[e.phase]||''}">${PHASE_LABEL[e.phase]||e.phase}</span>
        <span class="badge b-official">公式</span>
      </div>
      <div style="font-size:12px;color:var(--text2)">${e.dates.join(' / ')}</div>
    </div>
    <div class="home-card-actions">
      <button class="btn btn-sm" onclick="selectOfficialEvent('${e.id}')">登録</button>
    </div>
  </div>`;
}

function goRecord(id){ currentTId=id; showPage('record'); }
function goAnalysis(id){ currentAnalysisTId=id; showPage('analysis'); }

function deleteTournament(id){
  if(!confirm('この大会の記録を削除しますか？')) return;
  S.tournaments=S.tournaments.filter(t=>t.id!==id);
  save();
  if(currentTId===id){ currentTId=getLatestTId(); showPage('home'); return; }
  renderHome();
}
