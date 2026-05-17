// ══════════════════════════════════════════════
// 記録画面
// ══════════════════════════════════════════════
function renderRecord(){
  if(currentTId===null || !S.tournaments.find(t=>t.id===currentTId)){
    currentTId = getLatestTId();
  }
  const t         = getTournament(currentTId);
  const af        = document.getElementById('record-add-form');
  const tbl       = document.getElementById('record-table');
  const stats     = document.getElementById('record-stats');
  const title     = document.getElementById('record-title');
  const subtitle  = document.getElementById('record-subtitle');
  const breadcrumb= document.getElementById('record-breadcrumb-name');

  if(!t){
    af.innerHTML=''; stats.innerHTML='';
    tbl.innerHTML='<div class="empty"><p style="margin-bottom:12px">大会が登録されていません</p><button class="btn btn-primary" onclick="openCalendarModal()">＋ 大会を登録</button></div>';
    title.textContent='記録'; subtitle.textContent=''; breadcrumb.textContent='-';
    return;
  }
  title.textContent     = t.name;
  breadcrumb.textContent= t.name;
  const d1 = getDeck(t.deckId1); const d2 = getDeck(t.deckId2);
  const deckStr = [d1,d2].filter(Boolean).map(d=>`${d.name}（${d.className}）`).join(' / ');
  subtitle.textContent = `${t.date}　${PHASE_LABEL[t.phase]||t.phase}　${deckStr||'デッキ未設定'}`;

  if(t.format==='bo3'){
    renderBO3Form(af, t);
    renderRecordStats(stats, t);
    renderBO3Table(tbl, t);
  } else {
    renderBO1Form(af, t);
    renderRecordStats(stats, t);
    renderBO1Table(tbl, t);
  }
}

function sessionDeckOpts(t, defaultId){
  const ids = [t.deckId1, t.deckId2].filter(Boolean);
  if(!ids.length) return '<option value="">デッキ未設定</option>';
  return ids.map(id=>{ const d=getDeck(id); return d?`<option value="${d.id}"${d.id===defaultId?' selected':''}>${d.name}</option>`:''; }).join('');
}

// ── 入力フォーム ──────────────────────────────
function renderBO1Form(el, t){
  el.innerHTML=`<div class="add-form" id="bo1-form">
    <div class="fg"><label>自分のデッキ</label><select id="b1-my">${sessionDeckOpts(t)}</select></div>
    <div class="fg"><label>相手D1</label><select id="b1-o1" onchange="updateBO1Pick()">${clsOpts('エルフ')}</select></div>
    <div class="fg"><label>相手D2</label><select id="b1-o2" onchange="updateBO1Pick()">${clsOpts('ロイヤル')}</select></div>
    <div class="fg"><label>相手の選出</label><select id="b1-pick"></select></div>
    <div class="fg"><label>先後</label><select id="b1-turn"><option value="">-</option><option value="first">先攻</option><option value="second">後攻</option></select></div>
    <div class="fg"><label>結果</label><select id="b1-res"><option value="win">勝</option><option value="lose">負</option></select></div>
    <button class="btn btn-primary" onclick="addBO1(${t.id})">追加</button>
  </div>`;
  updateBO1Pick();
  document.getElementById('bo1-form').addEventListener('keydown', e=>{
    if(e.key==='Enter' && e.target.tagName!=='TEXTAREA'){ e.preventDefault(); addBO1(t.id); }
  });
}

function updateBO1Pick(){
  const o1   = document.getElementById('b1-o1')?.value;
  const o2   = document.getElementById('b1-o2')?.value;
  const pick = document.getElementById('b1-pick');
  if(!pick || !o1) return;
  pick.innerHTML = [...new Set([o1,o2])].map(c=>`<option>${c}</option>`).join('');
}

function addBO1(tid){
  const t = getTournament(tid); if(!t) return;
  const myDeckId = Number(document.getElementById('b1-my').value)||null;
  const r = {
    id: S.nextRId++, myDeckId,
    oppClass1: document.getElementById('b1-o1').value,
    oppClass2: document.getElementById('b1-o2').value,
    oppPick:   document.getElementById('b1-pick').value,
    turn:      document.getElementById('b1-turn').value,
    result:    document.getElementById('b1-res').value,
    memo: '', createdAt: Date.now()
  };
  t.records.push(r); save(); renderRecord();
}

// ── BO3入力フォーム ───────────────────────────
function renderBO3Form(el, t){
  el.innerHTML=`<div id="bo3-form">
    <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">
      相手の持ち込みデッキ
    </div>
    <div class="add-form" style="margin-bottom:8px">
      <div class="fg"><label>相手D1</label><select id="b3-o1" onchange="updateBO3State()">${clsOpts('エルフ')}</select></div>
      <div class="fg"><label>相手D2</label><select id="b3-o2" onchange="updateBO3State()">${clsOpts('ロイヤル')}</select></div>
    </div>
    <div id="bo3-games"></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="addBO3(${t.id})">セット記録を追加</button>
  </div>`;
  renderBO3Games(t);
}

function renderBO3Games(t){
  const el = document.getElementById('bo3-games'); if(!el) return;
  const d1 = getDeck(t.deckId1); const d2 = getDeck(t.deckId2);
  const myOpts = [d1,d2].filter(Boolean)
    .map(d=>`<option value="${d.id}">${d.name}</option>`).join('');

  // 現在の入力状態から勝利済みデッキを計算
  const state = getBO3State(t);

  let html = '';
  for(let i=0;i<3;i++){
    const game = state.games[i];
    const locked = i===2 && !state.needGame3; // 3戦目は1-1でないとロック
    const myVal = game.myDeckId || '';
    const myFixed = game.myDeckFixed; // 勝利済みで自動確定
    const oppVal = game.oppPick || '';
    const oppFixed = game.oppPickFixed;

    const mySelect = myFixed
      ? `<span class="badge b-deck">${getDeck(Number(myFixed))?.name||'?'}</span><input type="hidden" id="b3-my-${i}" value="${myFixed}">`
      : `<select id="b3-my-${i}" onchange="updateBO3State()">${myOpts}</select>`;

    const oppPick = oppFixed
      ? `<span class="badge b-opp">${oppFixed}</span><input type="hidden" id="b3-opp-${i}" value="${oppFixed}">`
      : `<select id="b3-opp-${i}" onchange="updateBO3State()">
          <option value="">-</option>
          ${[...new Set([
            document.getElementById('b3-o1')?.value||'エルフ',
            document.getElementById('b3-o2')?.value||'ロイヤル'
          ])].map(c=>`<option value="${c}"${c===oppVal?' selected':''}>${c}</option>`).join('')}
        </select>`;

    const disabledClass = locked ? 'style="opacity:0.4;pointer-events:none"' : '';
    const gameLabel = ['第1戦','第2戦','第3戦'][i];
    const lockedNote = locked ? '<span style="font-size:11px;color:var(--text3);margin-left:8px">1-1になると入力可能</span>' : '';

    html += `<div class="add-form" style="margin-bottom:6px;flex-wrap:wrap" ${disabledClass}>
      <div class="fg"><label>${gameLabel}${lockedNote}</label><div style="font-size:11px;color:var(--text2);padding:4px 0">${gameLabel}</div></div>
      <div class="fg"><label>自分のデッキ</label>${mySelect}</div>
      <div class="fg"><label>相手の選出</label>${oppPick}</div>
      <div class="fg"><label>先後</label>
        <select id="b3-turn-${i}">
          <option value="">-</option>
          <option value="first"${game.turn==='first'?' selected':''}>先攻</option>
          <option value="second"${game.turn==='second'?' selected':''}>後攻</option>
        </select>
      </div>
      <div class="fg"><label>結果</label>
        <select id="b3-res-${i}" onchange="updateBO3State()">
          <option value="win"${game.result==='win'?' selected':''}>勝</option>
          <option value="lose"${game.result==='lose'?' selected':''}>負</option>
        </select>
      </div>
    </div>`;
  }
  el.innerHTML = html;
}

// BO3の現在の入力状態を計算
function getBO3State(t){
  const state = { games: [{},{},{}], needGame3: false };
  const myWonDeckIds = new Set(); // 自分が勝利済みのデッキid
  const oppWonClasses = new Set(); // 相手が勝利済みのクラス

  for(let i=0;i<3;i++){
    const myEl = document.getElementById(`b3-my-${i}`);
    const oppEl = document.getElementById(`b3-opp-${i}`);
    const resEl = document.getElementById(`b3-res-${i}`);
    const turnEl = document.getElementById(`b3-turn-${i}`);
    const myVal = myEl?.value||'';
    const oppVal = oppEl?.value||'';
    const res = resEl?.value||'win';
    const turn = turnEl?.value||'';

    state.games[i] = { myDeckId: myVal, oppPick: oppVal, result: res, turn };

    if(i < 2){
      if(myVal && res==='win') myWonDeckIds.add(myVal);
      if(oppVal && res==='lose') oppWonClasses.add(oppVal);
    }
  }

  // 2戦終了後の状態計算
  const game0res = document.getElementById('b3-res-0')?.value;
  const game1res = document.getElementById('b3-res-1')?.value;
  if(game0res && game1res){
    const myWins = [game0res,game1res].filter(r=>r==='win').length;
    const oppWins = [game0res,game1res].filter(r=>r==='lose').length;
    state.needGame3 = myWins===1 && oppWins===1;
  }

  // 自分の次のデッキ自動確定（勝利済みでない方）
  const d1 = String(t.deckId1); const d2 = String(t.deckId2);
  const myRemaining = [d1,d2].find(id=>!myWonDeckIds.has(id));

  // 相手の次のデッキ自動確定
  const o1 = document.getElementById('b3-o1')?.value;
  const o2 = document.getElementById('b3-o2')?.value;
  const oppRemaining = [o1,o2].find(c=>!oppWonClasses.has(c));

  // 2戦目のデッキ自動確定
  const game0myRes = document.getElementById('b3-res-0')?.value;
  const game0my = document.getElementById('b3-my-0')?.value;
  const game0opp = document.getElementById('b3-opp-0')?.value;
  if(game0myRes){
    if(game0myRes==='win' && game0my){
      // 自分が1戦目勝利→2戦目は残りのデッキ
      const rem = [d1,d2].find(id=>id!==game0my);
      if(rem){ state.games[1].myDeckFixed = rem; state.games[1].myDeckId = rem; }
    }
    if(game0myRes==='lose' && game0opp){
      // 相手が1戦目勝利→相手2戦目は残りのクラス
      const rem = [o1,o2].find(c=>c!==game0opp);
      if(rem){ state.games[1].oppPickFixed = rem; state.games[1].oppPick = rem; }
    }
  }

  // 3戦目は両方自動確定
  if(state.needGame3){
    if(myRemaining){ state.games[2].myDeckFixed = myRemaining; state.games[2].myDeckId = myRemaining; }
    if(oppRemaining){ state.games[2].oppPickFixed = oppRemaining; state.games[2].oppPick = oppRemaining; }
  }

  return state;
}

function updateBO3State(){
  const t = getTournament(currentTId); if(!t) return;
  renderBO3Games(t);
}

function addBO3(tid){
  const t = getTournament(tid); if(!t) return;
  const o1 = document.getElementById('b3-o1')?.value;
  const o2 = document.getElementById('b3-o2')?.value;
  if(!o1||!o2) return alert('相手の持ち込みデッキを選択してください');

  const state = getBO3State(t);
  const games = [];
  const needG3 = state.needGame3;

  for(let i=0;i<(needG3?3:2);i++){
    const myDeckId = Number(document.getElementById(`b3-my-${i}`)?.value)||null;
    const oppPick = document.getElementById(`b3-opp-${i}`)?.value||'';
    const turn = document.getElementById(`b3-turn-${i}`)?.value||'';
    const result = document.getElementById(`b3-res-${i}`)?.value||'win';
    games.push({ myDeckId, oppPick, turn, result });
  }

  // セット勝敗判定：自分が2デッキ両方で1勝ずつ
  const myWonDecks = new Set(games.filter(g=>g.result==='win').map(g=>g.myDeckId));
  const oppWonClasses = new Set(games.filter(g=>g.result==='lose').map(g=>g.oppPick));
  const setResult = myWonDecks.size>=2 ? 'win' : oppWonClasses.size>=2 ? 'lose' : 'unknown';

  const r = {
    id: S.nextRId++,
    format: 'bo3',
    oppClass1: o1, oppClass2: o2,
    games,
    setResult,
    memo: '', createdAt: Date.now()
  };
  t.records.push(r); save(); renderRecord();
}


// ── 統計 ──────────────────────────────────────
function renderRecordStats(el, t){
  const recs = t.records||[];
  if(!recs.length){ el.innerHTML=''; return; }
  // BO3はsetResult、BO1はresultで勝敗判定
  const wins  = recs.filter(r=>r.format==='bo3'?r.setResult==='win':r.result==='win').length;
  const total = recs.length;
  const byDeck = {};
  recs.forEach(r=>{
    if(!r.myDeckId) return;
    if(!byDeck[r.myDeckId]) byDeck[r.myDeckId]={w:0,l:0};
    r.result==='win' ? byDeck[r.myDeckId].w++ : byDeck[r.myDeckId].l++;
  });
  const deckCards = Object.entries(byDeck).map(([id,d])=>{
    const dk=getDeck(Number(id)); const t2=d.w+d.l;
    return `<div class="stat-card"><div class="stat-label">${dk?.name||'?'}</div><div class="stat-val" style="font-size:16px">${wl(d.w,d.l)}</div><div class="stat-sub">${pct(d.w,t2)}</div></div>`;
  }).join('');
  const cols = Math.min(1+Object.keys(byDeck).length, 4);
  el.innerHTML=`<div class="stat-grid" style="grid-template-columns:repeat(${cols},1fr);margin-bottom:1rem">
    <div class="stat-card"><div class="stat-label">戦績</div><div class="stat-val" style="font-size:16px">${wl(wins,total-wins)}</div><div class="stat-sub">${total}試合 / ${pct(wins,total)}</div></div>
    ${deckCards}
  </div>`;
}

// ── テーブル ──────────────────────────────────
function renderBO1Table(el, t){
  const recs = t.records||[];
  if(!recs.length){ el.innerHTML='<div class="empty">記録がありません</div>'; return; }
  let h=`<div class="tbl-wrap"><table><thead><tr>
    <th>#</th><th>自分のデッキ</th><th>相手の持ち込み</th><th>相手の選出</th><th>先後</th><th>結果</th><th style="text-align:left">メモ</th><th></th>
  </tr></thead><tbody>`;
  recs.forEach((r,i)=>{
    const d = getDeck(r.myDeckId);
    const turnLabel = r.turn==='first'?'先攻':r.turn==='second'?'後攻':'-';
    h+=`<tr><td style="color:var(--text3)">${i+1}</td>
      <td><span class="badge b-deck">${d?.name||'?'}</span></td>
      <td>
        <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:4px">${clsIcon(r.oppClass1,13)}${r.oppClass1}</span>
        <span style="color:var(--text3);font-size:10px">+</span>
        <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:4px">${clsIcon(r.oppClass2,13)}${r.oppClass2}</span>
      </td>
      <td><span class="badge b-opp" style="display:inline-flex;align-items:center;gap:4px">${clsIcon(r.oppPick,13)}${r.oppPick}</span></td>
      <td style="font-size:12px">${turnLabel}</td>
      <td><span class="badge b-${r.result}">${r.result==='win'?'勝':'負'}</span></td>
      <td class="memo-cell">${r.memo||''}</td>
      <td style="white-space:nowrap">
        <button class="icon-btn" onclick="openEditRecord(${t.id},${r.id})">✎</button>
        <button class="icon-btn danger" onclick="delRecord(${t.id},${r.id})">✕</button>
      </td></tr>`;
  });
  h+='</tbody></table></div>'; el.innerHTML=h;
}

// ── 記録編集・削除 ────────────────────────────
function openEditRecord(tid, rid){
  const t = getTournament(tid);
  const r = t?.records.find(x=>x.id===rid); if(!r) return;
  openModal(`<div class="modal-title">記録を編集</div>
    <div class="mfg"><label>自分のデッキ</label><select id="er-my">${sessionDeckOpts(t,r.myDeckId)}</select></div>
    <div class="mfg"><label>相手D1</label><select id="er-o1">${clsOpts(r.oppClass1)}</select></div>
    <div class="mfg"><label>相手D2</label><select id="er-o2">${clsOpts(r.oppClass2)}</select></div>
    <div class="mfg"><label>相手の選出</label><select id="er-pick">
      ${[...new Set([r.oppClass1,r.oppClass2])].map(c=>`<option${c===r.oppPick?' selected':''}>${c}</option>`).join('')}
    </select></div>
    <div class="mfg"><label>先後</label><select id="er-turn">
      <option value=""${!r.turn?' selected':''}>-</option>
      <option value="first"${r.turn==='first'?' selected':''}>先攻</option>
      <option value="second"${r.turn==='second'?' selected':''}>後攻</option>
    </select></div>
    <div class="mfg"><label>結果</label><select id="er-res">
      <option value="win"${r.result==='win'?' selected':''}>勝</option>
      <option value="lose"${r.result==='lose'?' selected':''}>負</option>
    </select></div>
    <div class="mfg"><label>メモ</label><textarea id="er-memo">${r.memo||''}</textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveEditRecord(${tid},${rid})">保存</button>
    </div>`);
}

function saveEditRecord(tid, rid){
  const t = getTournament(tid);
  const r = t?.records.find(x=>x.id===rid); if(!r) return;
  r.myDeckId  = Number(document.getElementById('er-my').value)||null;
  r.oppClass1 = document.getElementById('er-o1').value;
  r.oppClass2 = document.getElementById('er-o2').value;
  r.oppPick   = document.getElementById('er-pick').value;
  r.turn      = document.getElementById('er-turn').value;
  r.result    = document.getElementById('er-res').value;
  r.memo      = document.getElementById('er-memo').value;
  save(); closeModal(); renderRecord();
}

function delRecord(tid, rid){
  if(!confirm('この記録を削除しますか？')) return;
  const t = getTournament(tid);
  if(t) t.records = t.records.filter(r=>r.id!==rid);
  save(); renderRecord();
}

// ── シェア・画像保存 ──────────────────────────
function shareTweet(){
  const t = getTournament(currentTId); if(!t) return;
  const recs = t.records||[];
  const wins = recs.filter(r=>r.result==='win').length;
  const text = `【${t.name}】\n戦績 ${wins}勝${recs.length-wins}敗`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,'_blank');
}

function saveImage(){
  if(!window.html2canvas){ alert('html2canvasが読み込まれていません'); return; }
  const t = getTournament(currentTId);
  const wrapper = document.createElement('div');
  wrapper.style.cssText='background:#fff;padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;position:fixed;top:-9999px;left:-9999px';
  const hdr = document.createElement('div');
  hdr.style.cssText='margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e0e0e0';
  hdr.innerHTML=`<div style="font-size:16px;font-weight:600">${t?.name||''}</div><div style="font-size:12px;color:#6b6b68;margin-top:3px">${t?.date||''} ${PHASE_LABEL[t?.phase]||''}</div>`;
  wrapper.appendChild(hdr);
  wrapper.appendChild(document.getElementById('record-stats').cloneNode(true));
  wrapper.appendChild(document.getElementById('record-table').cloneNode(true));
  document.body.appendChild(wrapper);
  html2canvas(wrapper, {backgroundColor:'#ffffff', scale:2}).then(c=>{
    const a = document.createElement('a');
    a.href=c.toDataURL('image/png'); a.download=`${t?.name||'記録'}.png`; a.click();
    document.body.removeChild(wrapper);
  });
}

// ── BO3テーブル ───────────────────────────────
function renderBO3Table(el, t){
  const recs = t.records||[];
  if(!recs.length){ el.innerHTML='<div class="empty">記録がありません</div>'; return; }
  let h=`<div class="tbl-wrap"><table><thead><tr>
    <th>#</th><th>相手の持ち込み</th><th>第1戦</th><th>第2戦</th><th>第3戦</th><th>セット結果</th><th style="text-align:left">メモ</th><th></th>
  </tr></thead><tbody>`;
  recs.forEach((r,i)=>{
    const games = r.games||[];
    const gameCell = (g)=>{
      if(!g) return '<td style="color:var(--text3)">-</td>';
      const dk=getDeck(g.myDeckId);
      const turnLabel=g.turn==='first'?'先':g.turn==='second'?'後':'-';
      return `<td style="font-size:12px">
        <div style="display:flex;flex-direction:column;gap:2px;align-items:center">
          <span class="badge b-deck" style="font-size:10px">${dk?.name||'?'}</span>
          <span style="display:inline-flex;align-items:center;gap:2px">${clsIcon(g.oppPick,11)}${g.oppPick}</span>
          <span>${turnLabel} <span class="badge b-${g.result}" style="font-size:10px">${g.result==='win'?'勝':'負'}</span></span>
        </div>
      </td>`;
    };
    const setRes = r.setResult||'unknown';
    h+=`<tr>
      <td style="color:var(--text3)">${i+1}</td>
      <td>
        <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(r.oppClass1,12)}${r.oppClass1}</span>
        <span style="color:var(--text3);font-size:10px">+</span>
        <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(r.oppClass2,12)}${r.oppClass2}</span>
      </td>
      ${gameCell(games[0])}${gameCell(games[1])}${gameCell(games[2]||null)}
      <td><span class="badge b-${setRes==='win'?'win':setRes==='lose'?'lose':'opp'}">${setRes==='win'?'勝':setRes==='lose'?'負':'?'}</span></td>
      <td class="memo-cell">${r.memo||''}</td>
      <td><button class="icon-btn danger" onclick="delRecord(${t.id},${r.id})">✕</button></td>
    </tr>`;
  });
  h+='</tbody></table></div>'; el.innerHTML=h;
}
