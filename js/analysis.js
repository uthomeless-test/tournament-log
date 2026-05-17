// ══════════════════════════════════════════════
// 分析画面
// ══════════════════════════════════════════════
function renderAnalysis(){
  const groupSel=document.getElementById('an-group');
  const tagSel=document.getElementById('an-tag');

  // グループ一覧：ユーザー登録済み大会のgroupフィールドから
  const groups=[...new Set(S.tournaments.map(t=>t.group||t.name))].sort();
  const prevGroup=groupSel.value;
  groupSel.innerHTML='<option value="">すべての大会</option>'+
    groups.map(g=>`<option value="${g}"${g===prevGroup?' selected':''}>${g}</option>`).join('');

  // ホームの「分析」ボタンから来た場合は対応グループを選択
  if(currentAnalysisTId!==null){
    const t=getTournament(currentAnalysisTId);
    if(t) groupSel.value=t.group||t.name;
    currentAnalysisTId=null;
  }

  // タグ一覧
  const allTags=[...new Set(S.tournaments.flatMap(t=>t.tags||[]))].filter(Boolean);
  const prevTag=tagSel.value;
  tagSel.innerHTML='<option value="">すべてのタグ</option>'+
    allTags.map(tag=>`<option value="${tag}"${tag===prevTag?' selected':''}>${tag}</option>`).join('');

  _runAnalysis();
}

function _runAnalysis(){
  const groupVal=document.getElementById('an-group').value;
  const phaseVal=document.getElementById('an-phase').value;
  const formatVal=document.getElementById('an-format')?.value||'';
  const tagVal=document.getElementById('an-tag').value;

  let recs=[];
  S.tournaments.forEach(t=>{
    if(groupVal&&(t.group||t.name)!==groupVal) return;
    if(phaseVal&&t.phase!==phaseVal) return;
    if(formatVal&&(t.format||'bo1')!==formatVal) return;
    if(tagVal&&!(t.tags||[]).includes(tagVal)) return;
    // BO1のみ分析対象（BO3は別途集計が必要なため現状BO1のみ）
    (t.records||[]).filter(r=>!r.format||r.format==='bo1').forEach(r=>recs.push({...r,_tname:t.name,_tid:t.id}));
  });

  const el=document.getElementById('analysis-content');
  if(!recs.length){ el.innerHTML='<div class="empty">分析データがありません</div>'; return; }

  const total=recs.length, wins=recs.filter(r=>r.result==='win').length;
  const firstR=recs.filter(r=>r.turn==='first'), secondR=recs.filter(r=>r.turn==='second');
  const fW=firstR.filter(r=>r.result==='win').length, sW=secondR.filter(r=>r.result==='win').length;

  const byDeck={};
  recs.forEach(r=>{
    const id=r.myDeckId; if(!id) return;
    if(!byDeck[id]) byDeck[id]={w:0,l:0,fw:0,fl:0,sw:0,sl:0};
    const d=byDeck[id],win=r.result==='win';
    win?d.w++:d.l++;
    if(r.turn==='first'){win?d.fw++:d.fl++;} else if(r.turn==='second'){win?d.sw++:d.sl++;}
  });

  const byOppPick={};
  recs.forEach(r=>{
    const c=r.oppPick; if(!c) return;
    if(!byOppPick[c]) byOppPick[c]={w:0,l:0};
    r.result==='win'?byOppPick[c].w++:byOppPick[c].l++;
  });

  const byCombo={};
  recs.forEach(r=>{
    const key=[r.oppClass1,r.oppClass2].sort().join('+');
    if(!byCombo[key]) byCombo[key]={w:0,l:0};
    r.result==='win'?byCombo[key].w++:byCombo[key].l++;
  });

  let h=`<div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.5rem">
    <div class="stat-card"><div class="stat-label">総合</div><div class="stat-val">${wl(wins,total-wins)}</div><div class="stat-sub">${pct(wins,total)}</div></div>
    <div class="stat-card"><div class="stat-label">試合数</div><div class="stat-val">${total}</div></div>
    <div class="stat-card"><div class="stat-label">先攻</div><div class="stat-val">${pct(fW,firstR.length)}</div><div class="stat-sub">${wl(fW,firstR.length-fW)}</div></div>
    <div class="stat-card"><div class="stat-label">後攻</div><div class="stat-val">${pct(sW,secondR.length)}</div><div class="stat-sub">${wl(sW,secondR.length-sW)}</div></div>
  </div>`;

  const deckEntries=Object.entries(byDeck).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l));
  if(deckEntries.length){
    h+=`<div style="font-size:13px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">デッキ別成績</div>
    <div class="tbl-wrap" style="margin-bottom:1.5rem"><table class="an-tbl"><thead><tr>
      <th style="text-align:left">デッキ</th><th>試合</th><th>勝</th><th>敗</th><th>勝率</th>
      <th>先攻勝</th><th>先攻敗</th><th>先攻率</th><th>後攻勝</th><th>後攻敗</th><th>後攻率</th>
    </tr></thead><tbody>`;
    deckEntries.forEach(([id,d])=>{
      const dk=getDeck(Number(id)); const t2=d.w+d.l,ft=d.fw+d.fl,st=d.sw+d.sl;
      h+=`<tr><td style="text-align:left"><span style="display:inline-flex;align-items:center;gap:4px">${clsIcon(dk?.className,13)}${dk?.name||'?'}</span></td>
        <td>${t2}</td><td>${d.w}</td><td>${d.l}</td><td>${pct(d.w,t2)}</td>
        <td>${d.fw}</td><td>${d.fl}</td><td>${pct(d.fw,ft)}</td>
        <td>${d.sw}</td><td>${d.sl}</td><td>${pct(d.sw,st)}</td></tr>`;
    });
    h+='</tbody></table></div>';
  }

  if(Object.keys(byOppPick).length){
    h+=`<div style="font-size:13px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">相手の選出別</div>
    <div class="opp-grid" style="margin-bottom:1.5rem">`;
    Object.entries(byOppPick).sort((a,b)=>(b[1].w+b[1].l)-(a[1].w+a[1].l)).forEach(([c,d])=>{
      const t2=d.w+d.l;
      h+=`<div class="opp-card"><div class="opp-card-name" style="display:flex;align-items:center;gap:5px">${clsIcon(c,15)}<span>${c}</span></div>
        <div class="opp-card-row"><span>戦績</span><span style="font-weight:500">${wl(d.w,d.l)}</span></div>
        <div class="opp-card-row"><span>勝率</span><span style="font-weight:500">${pct(d.w,t2)}</span></div></div>`;
    });
    h+='</div>';
  }

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
    h+='</tbody></table></div>';
  }
  el.innerHTML=h;
}
