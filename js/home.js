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
  if(!S.tournaments.length){
    el.innerHTML=`<div class="empty"><p style="margin-bottom:12px">大会が登録されていません</p><button class="btn btn-primary" onclick="openCalendarModal()">＋ 新しい大会を登録</button></div>`;
    return;
  }
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0,10);

  let list = [...S.tournaments];
  if(homeTab==='current'){
    // 今月以降 OR 今日から14日以内の過去日
    list = list
      .filter(t => t.date.slice(0,7) >= thisMonth || t.date >= twoWeeksAgoStr)
      .sort((a,b) => a.date.localeCompare(b.date));
  } else {
    // 14日より前の過去のみ
    list = list
      .filter(t => t.date < twoWeeksAgoStr)
      .sort((a,b) => b.date.localeCompare(a.date));
  }

  if(!list.length){
    el.innerHTML=`<div class="empty">${homeTab==='current'?'当月・直近の大会はありません':'過去の大会はありません'}</div>`;
    return;
  }

  // 月ごとにグループ化
  const byMonth = {};
  list.forEach(t=>{
    const m = t.date.slice(0,7);
    if(!byMonth[m]) byMonth[m]=[];
    byMonth[m].push(t);
  });

  let h = '';
  Object.entries(byMonth).forEach(([m, ts])=>{
    const [y, mo] = m.split('-');
    h += `<div class="month-group"><div class="month-label">${y}年 ${parseInt(mo)}月</div>`;
    ts.forEach(t=>{
      const recs = t.records||[];
      const wins = recs.filter(r=>r.result==='win').length;
      const d1 = getDeck(t.deckId1); const d2 = getDeck(t.deckId2);
      const deckStr = [d1,d2].filter(Boolean)
        .map(d=>`<span class="badge b-deck" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(d.className,11)}${d.name}</span>`)
        .join(' ');
      const recordStr = recs.length ? `${wl(wins,recs.length-wins)} (${pct(wins,recs.length)})` : '';
      h += `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
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
    });
    h += '</div>';
  });
  el.innerHTML = h;
}

function goRecord(id){ currentTId=id; showPage('record'); }

function deleteTournament(id){
  if(!confirm('この大会の記録を削除しますか？')) return;
  S.tournaments = S.tournaments.filter(t=>t.id!==id);
  if(currentTId===id){ currentTId=getLatestTId(); showPage('home'); return; }
  save(); renderHome();
}
