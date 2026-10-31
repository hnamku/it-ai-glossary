// 용어 퀴즈: 정의에서 용어 이름을 가리고 4지선다로 맞히기. ?c=분야&n=문제수&start=1 이면 바로 시작(QR용).
(() => {
  const $ = id => document.getElementById(id);
  let terms = [], cats = [], quiz = [], idx = 0, right = 0, wrongs = [];
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
  const makeQ = t => {
    const same = shuffle(terms.filter(x => x.id !== t.id && x.categoryId === t.categoryId));
    const rest = shuffle(terms.filter(x => x.id !== t.id && x.categoryId !== t.categoryId));
    return { t, options: shuffle([t, ...same.concat(rest).slice(0, 3)]) };
  };

  function start() {
    const c = $('cat').value, n = +$('num').value;
    const pool = terms.filter(t => !c || t.categoryId === c);
    if (!pool.length) return;
    quiz = shuffle(pool).slice(0, Math.min(n, pool.length)).map(makeQ);
    idx = 0; right = 0; wrongs = []; show('play'); ask();
  }

  function ask() {
    const { t, options } = quiz[idx];
    $('qCat').textContent = t.category; $('qNum').textContent = `${idx + 1} / ${quiz.length}`;
    $('qBar').style.width = `${idx / quiz.length * 100}%`;
    $('qDef').innerHTML = masked(t); $('fb').textContent = ''; $('next').hidden = true;
    const box = $('opts'); box.textContent = '';
    options.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'opt'; b.type = 'button';
      b.textContent = `${'①②③④'[i]} ${o.term}`; b.onclick = () => pick(b, o); box.append(b);
    });
    box.firstChild.focus({ preventScroll: true });
  }

  function pick(btn, o) {
    const { t } = quiz[idx], ok = o.id === t.id;
    [...$('opts').children].forEach((b, i) => { b.disabled = true; if (quiz[idx].options[i].id === t.id) b.classList.add('right'); });
    if (room) { me.answers.push({ id: t.id, pick: o.id }); store.set('room:' + room.code, me); send(); }
    if (ok) { right++; $('fb').innerHTML = '<b class="ok">정답!</b>'; }
    else { btn.classList.add('wrong'); wrongs.push(t); $('fb').innerHTML = `<b class="no">아쉬워요.</b> 정답은 <b>${esc(t.term)}</b>입니다.`; }
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
    for (const t of wrongs) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="/#${encodeURIComponent(t.categoryId)}">${esc(t.term)}</a> — ${esc(t.definition.length > 90 ? t.definition.slice(0, 90) + '…' : t.definition)}`;
      ul.append(li);
    }
    $('sent').hidden = !room; $('resActions').hidden = !!room;
    show('result');
  }

  // ── 강의실 모드 ──
  async function send() {
    try {
      const r = await fetch('/api/room?op=submit', { method: 'POST', headers: { 'content-type': 'application/json', 'x-malteut-admin': '1' }, body: JSON.stringify({ code: room.code, pid: me.pid, name: me.name, answers: me.answers }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); $('fb').insertAdjacentHTML('beforeend', `<br><b class="no">${esc(j.error || '점수 전송에 실패했어요.')}</b>`); }
    } catch { $('fb').insertAdjacentHTML('beforeend', '<br><b class="no">인터넷 연결을 확인해 주세요.</b>'); }
  }
  function startRoom() {
    quiz = room.questionIds.map(id => terms.find(t => t.id === id)).filter(Boolean).map(makeQ);
    right = 0; wrongs = []; idx = 0;
    // 새로고침했으면 이미 푼 문제는 건너뜀
    for (const a of me.answers) { const q = quiz[idx]; if (!q || q.t.id !== a.id) break; if (a.pick === a.id) right++; else wrongs.push(q.t); idx++; }
    if (idx >= quiz.length) return finish();
    show('play'); ask();
  }
  async function openRoom(code) {
    show('join'); $('jCode').textContent = code;
    let meta;
    try { const r = await fetch('/api/room?op=room&code=' + encodeURIComponent(code)); meta = await r.json(); if (!r.ok) throw Error(meta.error); }
    catch (e) { $('jLead').textContent = e.message || '방 정보를 불러오지 못했어요.'; $('jGo').hidden = true; $('jName').parentElement.hidden = true; return; }
    room = meta; if (room.title) $('jTitle').textContent = room.title;
    me = store.get('room:' + code);
    if (me && me.answers?.length) { $('jName').value = me.name; $('jGo').textContent = '이어서 풀기'; }
    if (!room.open && !(me && me.answers?.length >= room.questionIds.length)) { $('jLead').textContent = '이 퀴즈는 마감되었습니다.'; $('jGo').hidden = true; return; }
    const go = () => {
      const name = $('jName').value.trim(); if (!name) { $('jName').focus(); return; }
      if (!me || me.name !== name && !me.answers.length) me = { pid: Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join(''), name, answers: [] };
      store.set('room:' + code, me); if (!me.answers.length) send(); startRoom();
    };
    $('jGo').onclick = go; $('jName').onkeydown = e => { if (e.key === 'Enter') go(); };
    $('jName').focus();
  }

  $('start').onclick = start; $('next').onclick = next; $('again').onclick = start;
  $('other').onclick = () => { show('setup'); drawQR(); };
  $('cat').onchange = $('num').onchange = drawQR;
  $('copy').onclick = async () => { try { await navigator.clipboard.writeText(quizUrl()); $('copy').textContent = '복사됨!'; } catch { $('copy').textContent = '복사 실패'; } setTimeout(() => $('copy').textContent = '링크 복사', 1500); };
  $('save').onclick = () => { const a = document.createElement('a'); a.download = `quiz-qr${$('cat').value ? '-' + $('cat').value : ''}.png`; a.href = $('qr').toDataURL('image/png'); a.click(); };

  fetch('/api?op=terms').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(d => {
    terms = d.terms; cats = d.categories;
    const sel = $('cat');
    for (const c of cats) { const n = terms.filter(t => t.categoryId === c.id).length; if (!n) continue; const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.title} (${n})`; sel.append(o); }
    const p = new URLSearchParams(location.search);
    if (p.get('room')) return openRoom(p.get('room').toUpperCase());
    if (p.get('c') && cats.some(c => c.id === p.get('c'))) sel.value = p.get('c');
    if (p.get('n') && [...$('num').options].some(o => o.value === p.get('n'))) $('num').value = p.get('n');
    drawQR();
    if (p.get('start') === '1') start();
  }).catch(() => { $('setup').querySelector('.lead').textContent = '용어를 불러오지 못했어요. 잠시 후 새로고침해 주세요.'; });
})();
