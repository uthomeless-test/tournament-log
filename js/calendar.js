// イベント名省略: 前7文字 + … + 後5文字
function abbr(name){
  if(name.length <= 13) return name;
  return name.slice(0,7) + '…' + name.slice(-5);
}

// ══════════════════════════════════════════════
// カレンダーモーダル
// ══════════════════════════════════════════════
let calYear, calMonth;

function openCalendarModal(){
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  openModal(buildCalendarModal());
  document.getElementById('modal-box').classList.add('cal-modal');
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
        title="${e.name}">${abbr(e.name)}</span>`;
    });
    regTs.filter(t=>!t.officialId).forEach(t=>{
      evHTML += `<span class="cal-event registered"
        onclick="event.stopPropagation();goRecord(${t.id});closeModal()"
        title="${t.name}">${abbr(t.name)}</span>`;
    });

    cal += `<div class="cal-day${isToday?' today':''}" onclick="selectDate('${dateStr}')">
      <div class="${isToday?'cal-day-num':numCls}">${d}</div>
      ${evHTML}
    </div>`;
  }

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
  <div style="font-size:11px;color:var(--text3);margin-bottom:4px">大会名をクリックして登録 / <strong>日付をクリックして手動登録</strong></div>`;
}

function calNav(dir){
  calMonth += dir;
  if(calMonth<0){ calMonth=11; calYear--; }
  if(calMonth>11){ calMonth=0; calYear++; }
  const box = document.getElementById('modal-box');
  box.innerHTML = buildCalendarModal();
  box.classList.add('cal-modal');
}

function selectDate(dateStr){ openNewTournamentModal(dateStr, null); }

function selectOfficialEvent(eventId){
  const ev = officialSchedule.find(e=>e.id===eventId);
  if(!ev) return;
  const existing = S.tournaments.find(t=>t.officialId===eventId);
  if(existing){ goRecord(existing.id); closeModal(); return; }
  openNewTournamentModal(ev.dates[0], ev);
}

// ══════════════════════════════════════════════
// タグ管理ユーティリティ
// ══════════════════════════════════════════════
const PRESET_TAGS = ['-', '公式', '非公式'];

function getTagOptions(selectedTags){
  const allTags = [...PRESET_TAGS, ...S.tags.filter(t=>!PRESET_TAGS.includes(t))];
  return allTags.map(tag=>{
    const checked = selectedTags && selectedTags.includes(tag) ? 'checked' : '';
    return `<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 4px;font-size:12px;cursor:pointer">
      <input type="checkbox" value="${tag}" ${checked} style="width:auto;height:auto"> ${tag}
    </label>`;
  }).join('');
}

function getSelectedTags(){
  return [...document.querySelectorAll('#m-tags input[type=checkbox]:checked')].map(el=>el.value);
}

function addCustomTag(){
  const inp = document.getElementById('m-new-tag');
  const val = inp.value.trim();
  if(!val) return;
  if(!S.tags.includes(val) && !PRESET_TAGS.includes(val)){
    S.tags.push(val); save();
  }
  inp.value = '';
  // タグ欄を再描画
  const currentChecked = getSelectedTags();
  document.getElementById('m-tags').innerHTML = getTagOptions([...currentChecked, val]);
}

// ══════════════════════════════════════════════
// 新規大会登録モーダル
// ══════════════════════════════════════════════
function openNewTournamentModal(date, officialEvent){
  const name  = officialEvent ? officialEvent.name  : '';
  const phase = officialEvent ? officialEvent.phase : 'day1';
  const group = officialEvent ? officialEvent.group : '';
  const defaultTags = officialEvent ? ['公式'] : [];
  openModal(buildTournamentForm({name, date, phase, group, tags: defaultTags, officialId: officialEvent?.id||null, isNew: true}));
}

function buildTournamentForm({name, date, phase, group, tags, officialId, isNew, id}){
  const saveCall = isNew ? `saveTournament('${officialId||'null'}')` : `saveEditTournament(${id})`;
  const cancelCall = isNew ? `closeModal()` : `closeModal()`;
  return `<div class="modal-title">${isNew?'大会を登録':'大会を編集'}</div>
    <div class="mfg"><label>大会名</label><input id="m-tname" type="text" value="${name}" placeholder="大会名を入力" /></div>
    <div class="mfg"><label>大会グループ（シリーズ名・省略可）</label><input id="m-tgroup" type="text" value="${group||''}" placeholder="例: ECS 2026 大阪大会" /></div>
    <div class="mfg"><label>日付</label><input id="m-tdate" type="date" value="${date}" /></div>
    <div class="mfg"><label>フェーズ</label>
      <select id="m-tphase">
        <option value="day1"${phase==='day1'?' selected':''}>Day1</option>
        <option value="day2"${phase==='day2'?' selected':''}>Day2</option>
        <option value="playoff"${phase==='playoff'?' selected':''}>プレーオフ</option>
      </select>
    </div>
    <div class="mfg"><label>タグ</label>
      <div id="m-tags" style="display:flex;flex-wrap:wrap;margin-bottom:4px">${getTagOptions(tags||[])}</div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <input id="m-new-tag" type="text" placeholder="カスタムタグを追加" style="flex:1;height:28px;font-size:12px" />
        <button class="btn btn-sm" onclick="addCustomTag()">追加</button>
      </div>
    </div>
    <hr class="mdivider">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="mfg"><label>デッキ1 クラス</label><select id="m-dcls1">${clsOpts('エルフ')}</select></div>
      <div class="mfg"><label>デッキ1 名前（省略可）</label><input id="m-dname1" type="text" /></div>
      <div class="mfg"><label>デッキ2 クラス</label><select id="m-dcls2">${clsOpts('ロイヤル')}</select></div>
      <div class="mfg"><label>デッキ2 名前（省略可）</label><input id="m-dname2" type="text" /></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="${cancelCall}">キャンセル</button>
      <button class="btn btn-primary" onclick="${saveCall}">${isNew?'作成して記録を開始':'保存'}</button>
    </div>`;
}

function saveTournament(officialId){
  const name  = document.getElementById('m-tname').value.trim();
  const date  = document.getElementById('m-tdate').value;
  const phase = document.getElementById('m-tphase').value;
  const group = document.getElementById('m-tgroup').value.trim();
  const tags  = getSelectedTags().filter(t=>t!=='-');
  if(!name) return alert('大会名を入力してください');
  if(!date) return alert('日付を入力してください');
  const deckId1 = getOrCreateDeck(document.getElementById('m-dcls1').value, document.getElementById('m-dname1').value.trim());
  const deckId2 = getOrCreateDeck(document.getElementById('m-dcls2').value, document.getElementById('m-dname2').value.trim());
  const t = {
    id: S.nextTId++, name, date, phase,
    group: group || name,
    tags,
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
  openModal(buildTournamentForm({
    name: t.name, date: t.date||'', phase: t.phase,
    group: t.group||'', tags: t.tags||[],
    officialId: t.officialId, isNew: false, id
  }));
  // デッキクラスを現在値にセット
  setTimeout(()=>{
    if(d1) document.getElementById('m-dcls1').value = d1.className;
    if(d2) document.getElementById('m-dcls2').value = d2.className;
    if(d1) document.getElementById('m-dname1').value = d1.name===d1.className?'':d1.name;
    if(d2) document.getElementById('m-dname2').value = d2.name===d2.className?'':d2.name;
  }, 0);
}

function saveEditTournament(id){
  const t = getTournament(id); if(!t) return;
  t.name  = document.getElementById('m-tname').value.trim() || t.name;
  t.date  = document.getElementById('m-tdate').value;
  t.phase = document.getElementById('m-tphase').value;
  t.group = document.getElementById('m-tgroup').value.trim() || t.name;
  t.tags  = getSelectedTags().filter(tag=>tag!=='-');
  t.deckId1 = getOrCreateDeck(document.getElementById('m-dcls1').value, document.getElementById('m-dname1').value.trim());
  t.deckId2 = getOrCreateDeck(document.getElementById('m-dcls2').value, document.getElementById('m-dname2').value.trim());
  save(); closeModal();
  renderHome();
  if(currentTId===id) renderRecord();
}
