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
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0,10);

  if(homeTab==='current'){
    renderCurrentTab(el, todayStr, thisMonth, twoWeeksAgoStr);
  } else {
    renderPastTab(el, twoWeeksAgoStr);
  }
}

function renderCurrentTab(el, todayStr, thisMonth, twoWeeksAgoStr){
  // 公式スケジュールから当月・直近に該当するエントリーを取得
  // 条件: dates のいずれかが 今月以降 OR 今日から14日以内の過去
  const officialEntries = officialSchedule.filter(e =>
    e.dates.some(d => d.slice(0,7) >= thisMonth || d >= twoWeeksAgoStr)
  );

  // 公式エントリーをdates[0]基準で日付ソート
  officialEntries.sort((a,b) => a.dates[0].localeCompare(b.dates[0]));

  // ユーザー登録済みの大会（当月・直近）
  const userEntries = S.tournaments.filter(t =>
    t.date.slice(0,7) >= thisMonth || t.date >= twoWeeksAgoStr
  );

  // 表示する行を構築
  // 公式エントリー → 登録済みなら登録済みカードを使う、未登録なら公式サジェストカードを出す
  // ユーザー登録済みでofficialIdがないカスタム大会も追加
  const rows = [];

  officialEntries.forEach(e => {
    const registered = S.tournaments.find(t => t.officialId === e.id);
    rows.push({
      date: e.dates[0],
      type: registered ? 'registered' : 'official-suggest',
      official: e,
      tournament: registered || null
    });
  });

  // カスタム大会（officialIdなし）を追加
  userEntries.filter(t => !t.officialId).forEach(t => {
    rows.push({ date: t.date, type: 'registered', official: null, tournament: t });
  });

  // 日付昇順ソート
  rows.sort((a,b) => a.date.localeCompare(b.date));

  if(!rows.length){
    el.innerHTML = '<div class="empty">当月・直近の大会はありません</div>';
    return;
  }

  // 月グループ化
  const byMonth = {};
  rows.forEach(row => {
    const m = row.date.slice(0,7);
    if(!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(row);
  });

  let h = '';
  Object.entries(byMonth).forEach(([m, rowList]) => {
    const [y, mo] = m.split('-');
    h += `<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    rowList.forEach(row => {
      if(row.type === 'registered'){
        h += buildRegisteredCard(row.tournament);
      } else {
        h += buildSuggestCard(row.official);
      }
    });
    h += '</div>';
  });
  el.innerHTML = h;
}

function renderPastTab(el, twoWeeksAgoStr){
  const list = S.tournaments
    .filter(t => t.date < twoWeeksAgoStr)
    .sort((a,b) => b.date.localeCompare(a.date));

  if(!list.length){
    el.innerHTML = '<div class="empty">過去の大会はありません</div>';
    return;
  }

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
    ts.forEach(t => { h += buildRegisteredCard(t); });
    h += '</div>';
  });
  el.innerHTML = h;
}

// 登録済み大会カード
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
      <button class="btn btn-sm btn-primary" onclick="goRecord(${t.id})">結果を登録</button>
      <button class="btn btn-sm" onclick="goRecord(${t.id})">記録を見る</button>
      <button class="icon-btn" onclick="openEditTournament(${t.id})" title="編集">✎</button>
      <button class="icon-btn danger" onclick="deleteTournament(${t.id})" title="削除">✕</button>
    </div>
  </div>`;
}

// 未登録の公式大会サジェストカード
function buildSuggestCard(e){
  return `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;opacity:0.7;border-style:dashed">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:500">${e.name}</span>
        <span class="badge ${PHASE_CLS[e.phase]||''}">${PHASE_LABEL[e.phase]||e.phase}</span>
        <span class="badge b-official">公式</span>
      </div>
      <div style="font-size:12px;color:var(--text2);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span>${e.dates.join(' / ')}</span>
        <span style="color:var(--text3)">未登録</span>
      </div>
    </div>
    <div class="home-card-actions">
      <button class="btn btn-sm btn-primary" onclick="selectOfficialEvent('${e.id}')">参加登録</button>
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
