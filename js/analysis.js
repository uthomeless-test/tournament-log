// ══════════════════════════════════════════════
// 分析画面
// ══════════════════════════════════════════════
function renderAnalysis(){
  const groupSel  = document.getElementById('an-group');
  const tagSel    = document.getElementById('an-tag');

  const groups = [...new Set(S.tournaments.map(t=>t.group||t.name))].sort();
  const prevGroup = groupSel.value;
  groupSel.innerHTML = '<option value="">すべての大会</option>' +
    groups.map(g=>`<option value="${g}"${g===prevGroup?' selected':''}>${g}</option>`).join('');

  if(currentAnalysisTId !== null){
    const t = getTournament(currentAnalysisTId);
    if(t) groupSel.value = t.group||t.name;
    currentAnalysisTId = null;
  }

  const allTags = [...new Set(S.tournaments.flatMap(t=>t.tags||[]))].filter(Boolean);
  const prevTag = tagSel.value;
  tagSel.innerHTML = '<option value="">すべてのタグ</option>' +
    allTags.map(tag=>`<option value="${tag}"${tag===prevTag?' selected':''}>${tag}</option>`).join('');

  _runAnalysis();
}

function _runAnalysis(){
  const groupVal  = document.getElementById('an-group').value;
  const phaseVal  = document.getElementById('an-phase').value;
  const formatVal = document.getElementById('an-format')?.value||'';
  const tagVal    = document.getElementById('an-tag').value;

  // 対象大会を絞り込む
  const filteredTournaments = S.tournaments.filter(t=>{
    if(groupVal  && (t.group||t.name) !== groupVal) return false;
    if(phaseVal  && t.phase !== phaseVal) return false;
    if(formatVal && (t.format||'bo1') !== formatVal) return false;
    if(tagVal    && !(t.tags||[]).includes(tagVal)) return false;
    return true;
  });

  const el = document.getElementById('analysis-content');
  if(!filteredTournaments.length){ el.innerHTML='<div class="empty">分析データがありません</div>'; return; }

  // 全レコードを収集
  const allRecords = filteredTournaments.flatMap(t=>(t.records||[]).map(r=>({...r,_t:t})));
  if(!allRecords.length){ el.innerHTML='<div class="empty">分析データがありません</div>'; return; }

  const bo1Records = allRecords.filter(r=>!r.format||r.format==='bo1');
  const bo3Records = allRecords.filter(r=>r.format==='bo3');

  let h = '';

  // ── セット単位サマリー（全形式） ──
  const setTotal = allRecords.length;
  const setWins  = allRecords.filter(r=>r.format==='bo3'?r.setResult==='win':r.result==='win').length;
  const bo1Total = bo1Records.length;
  const bo1Wins  = bo1Records.filter(r=>r.result==='win').length;
  const bo3Total = bo3Records.length;
  const bo3Wins  = bo3Records.filter(r=>r.setResult==='win').length;

  h += `<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:1.5rem">
    <div class="stat-card"><div class="stat-label">セット総合</div><div class="stat-val">${wl(setWins,setTotal-setWins)}</div><div class="stat-sub">${pct(setWins,setTotal)}</div></div>
    <div class="stat-card"><div class="stat-label">BO1セット</div><div class="stat-val">${wl(bo1Wins,bo1Total-bo1Wins)}</div><div class="stat-sub">${pct(bo1Wins,bo1Total)}</div></div>
    <div class="stat-card"><div class="stat-label">BO3セット</div><div class="stat-val">${wl(bo3Wins,bo3Total-bo3Wins)}</div><div class="stat-sub">${pct(bo3Wins,bo3Total)}</div></div>
  </div>`;

  // ── BO1単位の全試合（BO3のgamesも展開） ──
  const allBO1Units = [];
  allRecords.forEach(r=>{
    if(r.format==='bo3'){
      (r.games||[]).forEach(g=>{
        if(g.result) allBO1Units.push({
          myDeckId: Number(g.myDeckId)||null,
          oppClass1: r.oppClass1, oppClass2: r.oppClass2,
          oppPick: g.oppPick, turn: g.turn, result: g.result
        });
      });
    } else {
      allBO1Units.push(r);
    }
  });

  // ── クラス別成績（BO1単位） ──
  if(allBO1Units.length){
    const byClass = {};
    allBO1Units.forEach(r=>{
      if(!r.myDeckId) return;
      const dk = getDeck(r.myDeckId);
      const cls = dk?.className||'不明';
      if(!byClass[cls]) byClass[cls]={w:0,l:0,fw:0,fl:0,sw:0,sl:0};
      const d = byClass[cls], win = r.result==='win';
      win?d.w++:d.l++;
      if(r.turn==='first'){win?d.fw++:d.fl++;} else if(r.turn==='second'){win?d.sw++:d.sl++;}
    });

    const classEntries = Object.entries(byClass).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l));
    h += `<div style="font-size:13px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">クラス別成績（BO1単位）</div>
    <div class="tbl-wrap" style="margin-bottom:1.5rem"><table class="an-tbl"><thead><tr>
      <th style="text-align:left">クラス</th><th>試合</th><th>勝</th><th>敗</th><th>勝率</th>
      <th>先攻勝</th><th>先攻敗</th><th>先攻率</th><th>後攻勝</th><th>後攻敗</th><th>後攻率</th>
    </tr></thead><tbody>`;
    classEntries.forEach(([cls,d])=>{
      const t2=d.w+d.l, ft=d.fw+d.fl, st=d.sw+d.sl;
      h+=`<tr>
        <td style="text-align:left"><span style="display:inline-flex;align-items:center;gap:4px">${clsIcon(cls,13)}${cls}</span></td>
        <td>${t2}</td><td>${d.w}</td><td>${d.l}</td><td>${pct(d.w,t2)}</td>
        <td>${d.fw}</td><td>${d.fl}</td><td>${pct(d.fw,ft)}</td>
        <td>${d.sw}</td><td>${d.sl}</td><td>${pct(d.sw,st)}</td>
      </tr>`;
    });
    h += '</tbody></table></div>';

    // ── 相手の選出別（BO1単位） ──
    const byOppPick = {};
    allBO1Units.forEach(r=>{
      const c=r.oppPick; if(!c) return;
      if(!byOppPick[c]) byOppPick[c]={w:0,l:0};
      r.result==='win'?byOppPick[c].w++:byOppPick[c].l++;
    });
    if(Object.keys(byOppPick).length){
      h+=`<div style="font-size:13px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">相手の選出別</div>
      <div class="opp-grid" style="margin-bottom:1.5rem">`;
      Object.entries(byOppPick).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l)).forEach(([c,d])=>{
        const t2=d.w+d.l;
        h+=`<div class="opp-card">
          <div class="opp-card-name" style="display:flex;align-items:center;gap:5px">${clsIcon(c,15)}<span>${c}</span></div>
          <div class="opp-card-row"><span>戦績</span><span style="font-weight:500">${wl(d.w,d.l)}</span></div>
          <div class="opp-card-row"><span>勝率</span><span style="font-weight:500">${pct(d.w,t2)}</span></div>
        </div>`;
      });
      h += '</div>';
    }

    // ── 相手の持ち込み組み合わせ別 ──
    const byCombo = {};
    allBO1Units.forEach(r=>{
      const key=[r.oppClass1,r.oppClass2].sort().join('+');
      if(!byCombo[key]) byCombo[key]={w:0,l:0};
      r.result==='win'?byCombo[key].w++:byCombo[key].l++;
    });
    if(Object.keys(byCombo).length){
      h+=`<div style="font-size:13px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">相手の持ち込み組み合わせ別</div>
      <div class="tbl-wrap" style="margin-bottom:1.5rem"><table><thead>
        <tr><th style="text-align:left">持ち込み</th><th>試合</th><th>戦績</th><th>勝率</th></tr>
      </thead><tbody>`;
      Object.entries(byCombo).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l)).forEach(([k,d])=>{
        const [c1,c2]=k.split('+'),t2=d.w+d.l;
        h+=`<tr><td style="text-align:left">
          <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(c1,12)}${c1}</span>
          <span style="color:var(--text3);font-size:10px">+</span>
          <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(c2,12)}${c2}</span>
        </td><td>${t2}</td><td>${wl(d.w,d.l)}</td><td>${pct(d.w,t2)}</td></tr>`;
      });
      h += '</tbody></table></div>';
    }
  }

  // ── BO3専用セクション ──
  if(bo3Records.length){
    h += `<div style="font-size:13px;font-weight:600;margin:1.5rem 0 8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">BO3セット詳細</div>`;

    // BO3セット先攻後攻
    const bo3First  = bo3Records.filter(r=>(r.games||[])[0]?.turn==='first');
    const bo3Second = bo3Records.filter(r=>(r.games||[])[0]?.turn==='second');
    const bo3fW = bo3First.filter(r=>r.setResult==='win').length;
    const bo3sW = bo3Second.filter(r=>r.setResult==='win').length;

    h += `<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:1rem">
      <div class="stat-card"><div class="stat-label">セット数</div><div class="stat-val">${bo3Total}</div></div>
      <div class="stat-card"><div class="stat-label">第1戦先攻</div><div class="stat-val">${pct(bo3fW,bo3First.length)}</div><div class="stat-sub">${wl(bo3fW,bo3First.length-bo3fW)}</div></div>
      <div class="stat-card"><div class="stat-label">第1戦後攻</div><div class="stat-val">${pct(bo3sW,bo3Second.length)}</div><div class="stat-sub">${wl(bo3sW,bo3Second.length-bo3sW)}</div></div>
    </div>`;

    // BO3クラス別単体戦績
    const bo3Units = [];
    bo3Records.forEach(r=>{
      (r.games||[]).forEach(g=>{
        if(g.result) bo3Units.push({
          myDeckId: Number(g.myDeckId)||null,
          oppPick: g.oppPick, turn: g.turn, result: g.result
        });
      });
    });

    const bo3ByClass = {};
    bo3Units.forEach(r=>{
      if(!r.myDeckId) return;
      const dk = getDeck(r.myDeckId);
      const cls = dk?.className||'不明';
      if(!bo3ByClass[cls]) bo3ByClass[cls]={w:0,l:0,fw:0,fl:0,sw:0,sl:0};
      const d=bo3ByClass[cls],win=r.result==='win';
      win?d.w++:d.l++;
      if(r.turn==='first'){win?d.fw++:d.fl++;} else if(r.turn==='second'){win?d.sw++:d.sl++;}
    });

    if(Object.keys(bo3ByClass).length){
      h += `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">クラス別単体戦績（BO3内のBO1単位）</div>
      <div class="tbl-wrap" style="margin-bottom:1rem"><table class="an-tbl"><thead><tr>
        <th style="text-align:left">クラス</th><th>試合</th><th>勝</th><th>敗</th><th>勝率</th>
        <th>先攻勝</th><th>先攻敗</th><th>先攻率</th><th>後攻勝</th><th>後攻敗</th><th>後攻率</th>
      </tr></thead><tbody>`;
      Object.entries(bo3ByClass).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l)).forEach(([cls,d])=>{
        const t2=d.w+d.l,ft=d.fw+d.fl,st=d.sw+d.sl;
        h+=`<tr>
          <td style="text-align:left"><span style="display:inline-flex;align-items:center;gap:4px">${clsIcon(cls,13)}${cls}</span></td>
          <td>${t2}</td><td>${d.w}</td><td>${d.l}</td><td>${pct(d.w,t2)}</td>
          <td>${d.fw}</td><td>${d.fl}</td><td>${pct(d.fw,ft)}</td>
          <td>${d.sw}</td><td>${d.sl}</td><td>${pct(d.sw,st)}</td>
        </tr>`;
      });
      h += '</tbody></table></div>';
    }

    // BO3相手持ち込み別セット勝率
    const bo3ByCombo = {};
    bo3Records.forEach(r=>{
      const key=[r.oppClass1,r.oppClass2].sort().join('+');
      if(!bo3ByCombo[key]) bo3ByCombo[key]={w:0,l:0};
      r.setResult==='win'?bo3ByCombo[key].w++:bo3ByCombo[key].l++;
    });
    if(Object.keys(bo3ByCombo).length){
      h+=`<div style="font-size:12px;color:var(--text2);margin-bottom:6px">相手の持ち込み別セット勝率</div>
      <div class="tbl-wrap" style="margin-bottom:1rem"><table><thead>
        <tr><th style="text-align:left">相手の持ち込み</th><th>セット数</th><th>戦績</th><th>勝率</th></tr>
      </thead><tbody>`;
      Object.entries(bo3ByCombo).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l)).forEach(([k,d])=>{
        const [c1,c2]=k.split('+'),t2=d.w+d.l;
        h+=`<tr><td style="text-align:left">
          <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(c1,12)}${c1}</span>
          <span style="color:var(--text3);font-size:10px">+</span>
          <span class="badge b-opp" style="display:inline-flex;align-items:center;gap:3px">${clsIcon(c2,12)}${c2}</span>
        </td><td>${t2}</td><td>${wl(d.w,d.l)}</td><td>${pct(d.w,t2)}</td></tr>`;
      });
      h += '</tbody></table></div>';
    }
  }

  el.innerHTML = h;
}
