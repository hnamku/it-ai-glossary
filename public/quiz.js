// 용어 퀴즈: 미리 만들어 둔 문제 은행(/quiz-bank.json, 용어당 5문제)에서 섞어 4지선다로 출제. ?c=분야&n=문제수&start=1 이면 바로 시작(QR용).
// 한 퀴즈 안에서는 같은 용어가 겹치지 않게 고르고, 보기 순서도 매번 섞습니다. 문제 은행의 보기 0번이 정답입니다.
(() => {
  const $ = id => document.getElementById(id);
  let terms = [], cats = [], bank = [], quiz = [], idx = 0, right = 0, wrongs = [];
  let room = null, me = null;   // 강의실 모드: 방 정보, 내 기록 {pid, name, answers:[{id,pick}]}
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 용어 이름(과 그 조각)을 정의에서 가림
  function nameParts(term) {
    const out = new Set([term]);
    for (const raw of term.split(/[·\/]/)) {
      const p = raw.trim(); if (!p) continue; out.add(p);
      const m = p.match(/^(.+?)\s*\((.+)\)$/);
      if (m) { out.add(m[1].trim()); out.add(m[2].trim()); }
    }
    for (const w of [...out]) for (const x of w.split(/\s+/)) out.add(x.replace(/[()]/g, ''));   // 'LLM 추론' → 'LLM', '추론'도 가림
    return [...out].filter(s => s.length >= 2).sort((a, b) => b.length - a.length);
  }
  // 문제는 짧게: 정의의 앞 1~2문장만 (예시·주의 문장은 빼고)
  function shortDef(d) {
    const sents = d.split(/(?<=[.!?])\s+/);
    let out = sents[0] || d;
    if (out.length < 45 && sents[1]) out += ' ' + sents[1];
    return out.length > 170 ? out.slice(0, 168) + '…' : out;
  }
  function masked(t) {
    let html = esc(shortDef(t.definition));
    const parts = nameParts(t.term).map(p => esc(p));
    if (parts.length) html = html.replace(new RegExp(parts.map(reEsc).join('|'), 'gi'), '<mark>???</mark>');
    return html;
  }

  function quizUrl() {
    const u = new URL('/quiz.html', location.origin);
    if ($('cat').value) u.searchParams.set('c', $('cat').value);
    u.searchParams.set('n', $('num').value);
    u.searchParams.set('start', '1');
    return u.toString();
  }
  function drawQR() {
    const url = quizUrl(); $('qrUrl').textContent = url;
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), quiet = 3, cv = $('qr'), size = 504;   // 3배 해상도로 그려 저장해도 선명하게
    cv.width = cv.height = size; const ctx = cv.getContext('2d'), cell = size / (n + quiet * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#202a26';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(Math.floor((c + quiet) * cell), Math.floor((r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
  }

  function show(id) { for (const s of ['join', 'setup', 'play', 'result']) $(s).hidden = s !== id; window.scrollTo(0, 0); }
  const termOf = id => terms.find(t => t.id === id);
  // 문제 은행 문제 하나 → 출제용 문제(보기 순서 섞기). pick은 은행 기준 보기 번호(0이 정답)
  const fromBank = b => ({ b, t: termOf(b.termId) || { id: b.termId, term: '', category: '', categoryId: '' }, order: shuffle([0, 1, 2, 3]) });
  // 예전 방(용어 id로 저장된 방)용: 정의에서 용어 이름을 가리고 용어를 고르는 문제
  const legacyQ = t => {
    const same = shuffle(terms.filter(x => x.id !== t.id && x.categoryId === t.categoryId));
    const rest = shuffle(terms.filter(x => x.id !== t.id && x.categoryId !== t.categoryId));
    return { t, legacy: true, options: shuffle([t, ...same.concat(rest).slice(0, 3)]) };
  };
  // 용어가 겹치지 않게 n문제 고르기 (용어보다 많이 원하면 그다음부터 겹침 허용)
  function pickQuestions(pool, n) {
    const byTerm = new Map();
    for (const q of shuffle(pool)) { if (!byTerm.has(q.termId)) byTerm.set(q.termId, []); byTerm.get(q.termId).push(q); }
    const out = [], lists = shuffle([...byTerm.values()]);
    while (out.length < n && lists.some(l => l.length)) for (const l of lists) { if (out.length >= n) break; if (l.length) out.push(l.pop()); }
    return out;
  }

  function start() {
    const c = $('cat').value, n = +$('num').value;
    const ids = new Set(terms.filter(t => !c || t.categoryId === c).map(t => t.id));
    const pool = bank.filter(q => ids.has(q.termId));
    if (!pool.length) return;
    quiz = pickQuestions(pool, n).map(fromBank);
    idx = 0; right = 0; wrongs = []; show('play'); ask();
  }

  function ask() {
    const q = quiz[idx];
    $('qCat').textContent = q.t.category || ''; $('qNum').textContent = `${idx + 1} / ${quiz.length}`;
    $('qBar').style.width = `${idx / quiz.length * 100}%`;
    $('qAsk').textContent = q.legacy ? '이 설명에 맞는 용어는?' : '알맞은 답을 고르세요';   // 용어 이름은 답을 고른 뒤에 보여 줌(정답 힌트가 되지 않게)
    $('qDef').innerHTML = q.legacy ? masked(q.t) : esc(q.b.q);
    $('fb').textContent = ''; $('next').hidden = true;
    const box = $('opts'); box.textContent = '';
    const labels = q.legacy ? q.options.map(o => o.term) : q.order.map(i => q.b.options[i]);
    labels.forEach((label, i) => {
      const b = document.createElement('button'); b.className = 'opt'; b.type = 'button';
      b.textContent = `${'①②③④'[i]} ${label}`; b.onclick = () => pick(b, i); box.append(b);
    });
    box.firstChild.focus({ preventScroll: true });
    if (room && idx > 0) send();
  }

  function pick(btn, i) {
    const q = quiz[idx];
    const rightPos = q.legacy ? q.options.findIndex(o => o.id === q.t.id) : q.order.indexOf(0);
    const ok = i === rightPos;
    [...$('opts').children].forEach((b, k) => { b.disabled = true; if (k === rightPos) b.classList.add('right'); });
    if (room) {
      me.answers.push(q.legacy ? { id: q.t.id, pick: q.options[i].id } : { id: q.b.id, pick: q.order[i] });
      store.set('room:' + room.code, me); if (me.answers.length >= quiz.length) heartbeat(false); send();
    }
    const rightText = q.legacy ? q.t.term : q.b.options[0];
    const why = q.legacy ? '' : `<span class="why">${esc(q.b.explain)}</span><span class="why">관련 용어: <a href="/#${encodeURIComponent(q.t.categoryId || '')}">${esc(q.t.term)}</a></span>`;
    if (ok) { right++; $('fb').innerHTML = `<b class="ok">정답!</b> ${why}`; }
    else { btn.classList.add('wrong'); wrongs.push(q); $('fb').innerHTML = `<b class="no">아쉬워요.</b> 정답은 <b>${esc(rightText)}</b>입니다. ${why}`; }
    $('qBar').style.width = `${(idx + 1) / quiz.length * 100}%`;
    $('next').textContent = idx + 1 < quiz.length ? '다음 문제' : '결과 보기';
    $('next').hidden = false; $('next').focus({ preventScroll: true });
  }

  function next() { if (++idx < quiz.length) ask(); else finish(); }

  function finish() {
    const total = quiz.length, pct = right / total;
    $('score').innerHTML = `${right}<span> / ${total}</span>`;
    $('msg').textContent = pct === 1 ? '전부 맞혔어요! 용어를 잘 이해하고 있네요.' : pct >= .7 ? '잘했어요. 틀린 용어만 한 번 더 읽어 보세요.' : '틀린 용어를 다시 읽고 한 번 더 도전해 보세요.';
    const ul = $('wrong'); ul.textContent = '';
    for (const q of wrongs) {
      const li = document.createElement('li'), t = q.t;
      const link = `<a href="/#${encodeURIComponent(t.categoryId || '')}">${esc(t.term)}</a>`;
      li.innerHTML = q.legacy ? `${link} — ${esc(t.definition.length > 90 ? t.definition.slice(0, 90) + '…' : t.definition)}`
        : `<span class="wq">${esc(q.b.q)}</span><span class="wa">정답: <b>${esc(q.b.options[0])}</b></span><span class="why">${esc(q.b.explain)}</span><span class="wt">관련 용어: ${link}</span>`;
      ul.append(li);
    }
    $('sent').hidden = !room; $('resActions').hidden = !!room;
    show('result');
  }

  // ── 강의실 모드 ── 이름 적고 입장 → (대기) → 퀴즈 풀기 시작 → 푸는 중 → 완료.  교수자 화면에 단계·문제 번호·접속 여부가 보임
  let beat = null;
  async function send() {
    if (!room || !me) return;
    const stage = me.started ? 'playing' : 'joined', at = Math.min(quiz.length || 5, idx + 1);
    try {
      const r = await fetch('/api/room?op=submit', { method: 'POST', headers: { 'content-type': 'application/json', 'x-malteut-admin': '1' }, body: JSON.stringify({ code: room.code, pid: me.pid, name: me.name, answers: me.answers, stage, at }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); note(j.error || '점수 전송에 실패했어요.'); }
    } catch { note('인터넷 연결을 확인해 주세요.'); }
  }
  function note(msg) { const fb = $('play').hidden ? $('jLead') : $('fb'); fb.insertAdjacentHTML('beforeend', `<br><b class="no">${esc(msg)}</b>`); }
  function heartbeat(on) { clearInterval(beat); beat = on ? setInterval(send, 20000) : null; }   // 20초마다 '접속 중' 알림

  function prepare() {
    quiz = room.questionIds.map(id => typeof id === 'number' ? (termOf(id) && legacyQ(termOf(id))) : (bank.find(q => q.id === id) && fromBank(bank.find(q => q.id === id)))).filter(Boolean);
    right = 0; wrongs = []; idx = 0;
    // 새로고침했으면 이미 푼 문제는 건너뜀
    for (const a of me.answers) {
      const q = quiz[idx], qid = q && (q.legacy ? q.t.id : q.b.id); if (!q || qid !== a.id) break;
      if (q.legacy ? a.pick === a.id : a.pick === 0) right++; else wrongs.push(q); idx++;
    }
  }
  function startRoom() {
    me.started = true; store.set('room:' + room.code, me);
    if (idx >= quiz.length) { heartbeat(false); return finish(); }
    show('play'); ask();
  }
  function ready() {   // 이름 적고 입장한 뒤 대기 화면
    $('jForm').hidden = true; $('jReady').hidden = false;
    $('jHello').textContent = `${me.name}님, 입장했어요!`;
    $('jStart').textContent = me.answers.length ? `이어서 풀기 (${me.answers.length + 1}번부터)` : '퀴즈 풀기 시작';
    $('jStart').focus();
  }
  async function openRoom(code) {
    show('join'); $('jCode').textContent = code;
    let meta;
    try { const r = await fetch('/api/room?op=room&code=' + encodeURIComponent(code)); meta = await r.json(); if (!r.ok) throw Error(meta.error); }
    catch (e) { $('jLead').textContent = e.message || '방 정보를 불러오지 못했어요.'; $('jForm').hidden = true; return; }
    room = meta; if (room.title) $('jTitle').textContent = room.title;
    me = store.get('room:' + code);
    if (me && !me.pid) me = null;
    if (me) prepare();
    if (me && me.answers.length >= room.questionIds.length) { prepare(); return finish(); }
    if (!room.open) { $('jLead').textContent = '이 퀴즈는 마감되었습니다.'; $('jForm').hidden = true; return; }
    if (me) { send(); heartbeat(true); return ready(); }   // 이미 입장한 학생: 대기 화면으로
    const go = () => {
      const name = $('jName').value.trim(); if (!name) { $('jName').focus(); return; }
      me = { pid: Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join(''), name, answers: [], started: false };
      store.set('room:' + code, me); prepare(); send(); heartbeat(true); ready();
    };
    $('jGo').onclick = go; $('jName').onkeydown = e => { if (e.key === 'Enter') go(); };
    $('jName').focus();
  }
  $('jStart').onclick = () => { startRoom(); send(); };

  $('start').onclick = start; $('next').onclick = next; $('again').onclick = start;
  $('other').onclick = () => { show('setup'); drawQR(); };
  $('cat').onchange = $('num').onchange = drawQR;
  $('copy').onclick = async () => { try { await navigator.clipboard.writeText(quizUrl()); $('copy').textContent = '복사됨!'; } catch { $('copy').textContent = '복사 실패'; } setTimeout(() => $('copy').textContent = '링크 복사', 1500); };
  $('save').onclick = () => { const a = document.createElement('a'); a.download = 'quiz-qr.png'; a.href = $('qr').toDataURL('image/png'); a.click(); };

  Promise.all([fetch('/api?op=terms'), fetch('/quiz-bank.json')]).then(rs => Promise.all(rs.map(r => { if (!r.ok) throw Error(); return r.json(); }))).then(([d, qb]) => {
    terms = d.terms; cats = d.categories; bank = qb.questions;
    // 분야 선택 없음: 항상 전체 용어에서 출제
    const p = new URLSearchParams(location.search);
    if (p.get('room')) return openRoom(p.get('room').toUpperCase());
    if (p.get('n') && [...$('num').options].some(o => o.value === p.get('n'))) $('num').value = p.get('n');
    drawQR();
    if (p.get('start') === '1') start();
  }).catch(() => { $('setup').querySelector('.lead').textContent = '용어를 불러오지 못했어요. 잠시 후 새로고침해 주세요.'; });
})();
