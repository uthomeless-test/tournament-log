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
  const todayStr = now.toISOString().slice(0,10);
  const thisMonth = todayStr.slice(0,7);
  const nextMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth()+1, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  })();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0,10);

  if(homeTab==='current')  renderCurrentTab(el, thisMonth, twoWeeksAgoStr);
  if(homeTab==='past')     renderPastTab(el, twoWeeksAgoStr);
  if(homeTab==='upcoming') renderUpcomingTab(el, nextMonth);
  if(homeTab==='pastall')  renderPastAllTab(el, thisMonth);
}

// ── 当月・直近（公式スケジュール＋登録済み） ────
function renderCurrentTab(el, thisMonth, twoWeeksAgoStr){
  // 公式スケジュールから当月 + 過去14日以内を抽出
  const entries = officialSchedule
    .filter(e => e.dates[0].slice(0,7) === thisMonth || e.dates[0] >= twoWeeksAgoStr)
    .sort((a,b) => a.dates[0].localeCompare(b.dates[0]));

  // カスタム大会（officialIdなし）も追加
  const customList = S.tournaments
    .filter(t => !t.officialId && (t.date.slice(0,7) === thisMonth || t.date >= twoWeeksAgoStr));

  if(!entries.length && !customList.length){
    el.innerHTML = '<div class="empty">当月・直近の大会はありません</div>';
    return;
  }

  // 公式エントリーを行に変換（登録済みなら登録済みカード、未登録ならサジェスト）
  const rows = [];
  entries.forEach(e => {
    const registered = S.tournaments.find(t => t.officialId === e.id);
    rows.push({ date: e.dates[0], card: registered ? buildRegisteredCard(registered) : buildSuggestCard(e) });
  });
  customList.forEach(t => {
    rows.push({ date: t.date, card: buildRegisteredCard(t) });
  });
  rows.sort((a,b) => a.date.localeCompare(b.date));

  // 月グループ化
  const byMonth = {};
  rows.forEach(row => {
    const m = row.date.slice(0,7);
    if(!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(row.card);
  });

  let h = '';
  Object.entries(byMonth).forEach(([m, cards]) => {
    const [y, mo] = m.split('-');
    h += `<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    cards.forEach(c => { h += c; });
    h += '</div>';
  });
  el.innerHTML = h;
}

// ── 過去の記録（ユーザー登録済みのみ） ──────────
function renderPastTab(el, twoWeeksAgoStr){
  const list = S.tournaments
    .filter(t => t.date < twoWeeksAgoStr)
    .sort((a,b) => b.date.localeCompare(a.date));

  if(!list.length){
    el.innerHTML = '<div class="empty">過去の記録はありません</div>';
    return;
  }
  el.innerHTML = buildMonthGroups(list, t => buildRegisteredCard(t));
}

// ── 今後の大会（公式スケジュール、来月以降） ────
function renderUpcomingTab(el, nextMonth){
  const entries = officialSchedule
    .filter(e => e.dates[0].slice(0,7) >= nextMonth)
    .sort((a,b) => a.dates[0].localeCompare(b.dates[0]));

  if(!entries.length){
    el.innerHTML = '<div class="empty">今後の公式大会情報はありません</div>';
    return;
  }

  const byMonth = {};
  entries.forEach(e => {
    const m = e.dates[0].slice(0,7);
    if(!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(e);
  });

  let h = '';
  Object.entries(byMonth).forEach(([m, list]) => {
    const [y, mo] = m.split('-');
    h += `<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    list.forEach(e => {
      const registered = S.tournaments.find(t => t.officialId === e.id);
      h += registered ? buildRegisteredCard(registered) : buildSuggestCard(e);
    });
    h += '</div>';
  });
  el.innerHTML = h;
}

// ── 過去の大会（公式スケジュール、今月より前） ──
function renderPastAllTab(el, thisMonth){
  const entries = officialSchedule
    .filter(e => e.dates[0].slice(0,7) < thisMonth)
    .sort((a,b) => b.dates[0].localeCompare(a.dates[0]));

  if(!entries.length){
    el.innerHTML = '<div class="empty">過去の公式大会情報はありません</div>';
    return;
  }

  const byMonth = {};
  entries.forEach(e => {
    const m = e.dates[0].slice(0,7);
    if(!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(e);
  });

  let h = '';
  Object.entries(byMonth).forEach(([m, list]) => {
    const [y, mo] = m.split('-');
    h += `<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    list.forEach(e => {
      const registered = S.tournaments.find(t => t.officialId === e.id);
      h += registered ? buildRegisteredCard(registered) : buildSuggestCard(e);
    });
    h += '</div>';
  });
  el.innerHTML = h;
}

// ── 共通：月グループ化 ──────────────────────────
function buildMonthGroups(list, cardFn){
  const byMonth = {};
  list.forEach(t => {
    const m = t.date.slice(0,7);
    if(!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(t);
  });
  let h = '';
  Object.entries(byMonth).forEach(([m, ts]) => {
    const [y, mo] = m.split('-');
    h += `<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    ts.forEach(t => { h += cardFn(t); });
    h += '</div>';
  });
  return h;
}

// ── 登録済み大会カード ──────────────────────────
function buildRegisteredCard(t){
  const recs = t.records||[];
  const wins = recs.filter(r=>r.result==='win').length;
  const d1 = getDeck(t.deckId1); const d2 = getDeck(t.deckId2);
  const deckStr = [d1,d2].filter(Boolean)
    .map(d=>`<span class="badge b-deck" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(d.className,11)}${d.name}</span>`)
    .join(' ');
  const recordStr = recs.length ? `${wl(wins,recs.length-wins)} (${pct(wins,recs.length)})` : '';
  return `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:500">${t.name}</span>
        <span class="badge ${PHASE_CLS[t.phase]||''}">${PHASE_LABEL[t.phase]||t.phase}</span>
        <span class="badge ${t.type==='official'?'b-official':'b-custom'}">${t.type==='official'?'公式':'カスタム'}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span>${t.date}</span>
        ${deckStr}
        ${recordStr
          ? `<span style="font-weight:500">${recordStr}</span>`
          : `<span style="color:var(--text3)">未記録</span>`}
      </div>
    </div>
    <div class="home-card-actions" onclick="event.stopPropagation()">
      <button class="btn btn-sm btn-primary" onclick="goRecord(${t.id})">記録を見る</button>
      <button class="icon-btn" onclick="openEditTournament(${t.id})" title="編集">✎</button>
      <button class="icon-btn danger" onclick="deleteTournament(${t.id})" title="削除">✕</button>
    </div>
  </div>`;
}

// ── 未登録公式大会サジェストカード ──────────────
function buildSuggestCard(e){
  return `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-style:dashed;opacity:0.75">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:500">${e.name}</span>
        <span class="badge ${PHASE_CLS[e.phase]||''}">${PHASE_LABEL[e.phase]||e.phase}</span>
        <span class="badge b-official">公式</span>
      </div>
      <div style="font-size:12px;color:var(--text2);display:flex;gap:8px;align-items:center">
        <span>${e.dates.join(' / ')}</span>
        <span style="color:var(--text3)">未登録</span>
      </div>
    </div>
    <div class="home-card-actions">
      <button class="btn btn-sm" onclick="selectOfficialEvent('${e.id}')">登録</button>
    </div>
  </div>`;
}

function goRecord(id){ currentTId=id; showPage('record'); }

function deleteTournament(id){
  if(!confirm('この大会の記録を削除しますか？')) return;
  S.tournaments = S.tournaments.filter(t=>t.id!==id);
  if(currentTId===id){ currentTId=getLatestTId(); showPage('home'); return; }
  save(); renderHome();
}
