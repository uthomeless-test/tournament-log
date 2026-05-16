// ══════════════════════════════════════════════
// カレンダーモーダル
// ══════════════════════════════════════════════
let calYear, calMonth;

function openCalendarModal(){
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  openModal(buildCalendarModal());
}

function buildCalendarModal(){
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today       = new Date();
  const todayStr    = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const monthStr    = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const monthEvents = officialSchedule.filter(e=>e.dates.some(d=>d.startsWith(monthStr)));

  const dateEventMap = {};
  monthEvents.forEach(e=>{
    e.dates.forEach(d=>{
      if(!dateEventMap[d]) dateEventMap[d]=[];
      dateEventMap[d].push(e);
    });
  });

  const registeredDates = {};
  S.tournaments.forEach(t=>{
    if(!registeredDates[t.date]) registeredDates[t.date]=[];
    registeredDates[t.date].push(t);
  });

  const dows = ['日','月','火','水','木','金','土'];
  let cal = `<div class="cal-grid">`;
  cal += dows.map(d=>`<div class="cal-dow">${d}</div>`).join('');

  // 前月空白
  for(let i=0;i<firstDay;i++) cal+=`<div class="cal-day other-month"><div class="cal-day-num"></div></div>`;

  for(let d=1;d<=daysInMonth;d++){
    const dow     = (firstDay + d - 1) % 7;
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr===todayStr;
    const events  = dateEventMap[dateStr]||[];
    const regTs   = registeredDates[dateStr]||[];
    const numCls  = dow===0?'cal-day-num sun':dow===6?'cal-day-num sat':'cal-day-num';

    let evHTML = '';
    events.forEach(e=>{
      const isReg = S.tournaments.some(t=>t.officialId===e.id);
      evHTML += `<span class="cal-event ${isReg?'registered':'official'}"
        onclick="event.stopPropagation();selectOfficialEvent('${e.id}')"
        title="${e.name}">${e.name}</span>`;
    });
    regTs.filter(t=>!t.officialId).forEach(t=>{
      evHTML += `<span class="cal-event registered"
        onclick="event.stopPropagation();goRecord(${t.id});closeModal()"
        title="${t.name}">${t.name}</span>`;
    });

    cal += `<div class="cal-day${isToday?' today':''}" onclick="selectDate('${dateStr}')">
      <div class="${isToday?'cal-day-num':numCls}">${d}</div>
      ${evHTML}
    </div>`;
  }

  // 後月空白
  const remainder = (firstDay + daysInMonth) % 7;
  if(remainder>0){ for(let i=remainder;i<7;i++) cal+=`<div class="cal-day other-month"><div class="cal-day-num"></div></div>`; }
  cal += '</div>';

  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div class="modal-title" style="margin-bottom:0">大会を登録</div>
    <button class="btn btn-sm" onclick="closeModal()">✕</button>
  </div>
  <div class="calendar-wrap">
    <div class="cal-header">
      <button class="cal-nav" onclick="calNav(-1)">‹</button>
      <span class="cal-month-label">${calYear}年 ${calMonth+1}月</span>
      <button class="cal-nav" onclick="calNav(1)">›</button>
    </div>
    ${cal}
  </div>
  <div style="font-size:11px;color:var(--text3);margin-bottom:4px">日付または大会名をクリックして登録</div>`;
}

function calNav(dir){
  calMonth += dir;
  if(calMonth<0){ calMonth=11; calYear--; }
  if(calMonth>11){ calMonth=0; calYear++; }
  document.getElementById('modal-box').innerHTML = buildCalendarModal();
}

function selectDate(dateStr){
  openNewTournamentModal(dateStr, null);
}

function selectOfficialEvent(eventId){
  const ev = officialSchedule.find(e=>e.id===eventId);
  if(!ev) return;
  const existing = S.tournaments.find(t=>t.officialId===eventId);
  if(existing){ goRecord(existing.id); closeModal(); return; }
  openNewTournamentModal(ev.dates[0], ev);
}

// ══════════════════════════════════════════════
// 新規大会登録モーダル
// ══════════════════════════════════════════════
function openNewTournamentModal(date, officialEvent){
  const name  = officialEvent ? officialEvent.name  : '';
  const phase = officialEvent ? officialEvent.phase : 'day1';
  openModal(`<div class="modal-title">大会を登録</div>
    <div class="mfg"><label>大会名</label><input id="m-tname" type="text" value="${name}" placeholder="大会名を入力" /></div>
    <div class="mfg"><label>日付</label><input id="m-tdate" type="date" value="${date}" /></div>
    <div class="mfg"><label>フェーズ</label>
      <select id="m-tphase">
        <option value="day1"${phase==='day1'?' selected':''}>Day1</option>
        <option value="day2"${phase==='day2'?' selected':''}>Day2</option>
        <option value="playoff"${phase==='playoff'?' selected':''}>プレーオフ</option>
      </select>
    </div>
    <hr class="mdivider">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="mfg"><label>デッキ1 クラス</label><select id="m-dcls1">${clsOpts('エルフ')}</select></div>
      <div class="mfg"><label>デッキ1 名前（省略可）</label><input id="m-dname1" type="text" /></div>
      <div class="mfg"><label>デッキ2 クラス</label><select id="m-dcls2">${clsOpts('ロイヤル')}</select></div>
      <div class="mfg"><label>デッキ2 名前（省略可）</label><input id="m-dname2" type="text" /></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveTournament(${officialEvent?`'${officialEvent.id}'`:'null'})">作成して記録を開始</button>
    </div>`);
}

function saveTournament(officialId){
  const name  = document.getElementById('m-tname').value.trim();
  const date  = document.getElementById('m-tdate').value;
  const phase = document.getElementById('m-tphase').value;
  if(!name) return alert('大会名を入力してください');
  if(!date) return alert('日付を入力してください');
  const deckId1 = getOrCreateDeck(document.getElementById('m-dcls1').value, document.getElementById('m-dname1').value.trim());
  const deckId2 = getOrCreateDeck(document.getElementById('m-dcls2').value, document.getElementById('m-dname2').value.trim());
  const t = {
    id: S.nextTId++, name, date, phase,
    type: (officialId && officialId!=='null') ? 'official' : 'custom',
    officialId: (officialId && officialId!=='null') ? officialId : null,
    deckId1, deckId2, records: [], createdAt: Date.now()
  };
  S.tournaments.push(t); save();
  currentTId = t.id;
  closeModal();
  showPage('record');
}

// ══════════════════════════════════════════════
// 大会編集
// ══════════════════════════════════════════════
function openEditTournament(id){
  const t = getTournament(id); if(!t) return;
  const d1 = getDeck(t.deckId1);
  const d2 = getDeck(t.deckId2);
  openModal(`<div class="modal-title">大会を編集</div>
    <div class="mfg"><label>大会名</label><input id="m-tname" type="text" value="${t.name}" /></div>
    <div class="mfg"><label>日付</label><input id="m-tdate" type="date" value="${t.date||''}" /></div>
    <div class="mfg"><label>フェーズ</label>
      <select id="m-tphase">
        <option value="day1"${t.phase==='day1'?' selected':''}>Day1</option>
        <option value="day2"${t.phase==='day2'?' selected':''}>Day2</option>
        <option value="playoff"${t.phase==='playoff'?' selected':''}>プレーオフ</option>
      </select>
    </div>
    <hr class="mdivider">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="mfg"><label>デッキ1 クラス</label><select id="m-dcls1">${clsOpts(d1?.className||'エルフ')}</select></div>
      <div class="mfg"><label>デッキ1 名前（省略可）</label><input id="m-dname1" type="text" value="${d1?.name===d1?.className?'':d1?.name||''}" /></div>
      <div class="mfg"><label>デッキ2 クラス</label><select id="m-dcls2">${clsOpts(d2?.className||'ロイヤル')}</select></div>
      <div class="mfg"><label>デッキ2 名前（省略可）</label><input id="m-dname2" type="text" value="${d2?.name===d2?.className?'':d2?.name||''}" /></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveEditTournament(${id})">保存</button>
    </div>`);
}

function saveEditTournament(id){
  const t = getTournament(id); if(!t) return;
  t.name   = document.getElementById('m-tname').value.trim() || t.name;
  t.date   = document.getElementById('m-tdate').value;
  t.phase  = document.getElementById('m-tphase').value;
  t.deckId1 = getOrCreateDeck(document.getElementById('m-dcls1').value, document.getElementById('m-dname1').value.trim());
  t.deckId2 = getOrCreateDeck(document.getElementById('m-dcls2').value, document.getElementById('m-dname2').value.trim());
  save(); closeModal();
  renderHome();
  if(currentTId===id) renderRecord();
}
