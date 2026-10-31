// 강의실 퀴즈(교수자): 방 만들기 → QR 띄우기 → 학생 점수 실시간 보기
(() => {
  const $ = id => document.getElementById(id);
  const H = { 'content-type': 'application/json', 'x-malteut-admin': '1' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let terms = [], cats = [], room = null, timer = null;

  const show = id => { for (const s of ['login', 'make', 'room']) $(s).hidden = s !== id; };
  const termName = id => terms.find(t => t.id === id)?.term || '(삭제된 용어)';
  const catName = id => id ? (cats.find(c => c.id === id)?.title || '') : '전체 분야';

  function drawQR(url) {
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), quiet = 3, cv = $('qr'), size = 600; cv.width = cv.height = size;
    const ctx = cv.getContext('2d'), cell = size / (n + quiet * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#202a26';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(Math.floor((c + quiet) * cell), Math.floor((r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
  }

  async function api(op, body) {
    const r = await fetch('/api/room?op=' + op, body ? { method: 'POST', headers: H, credentials: 'same-origin', body: JSON.stringify(body) } : { credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { show('login'); throw Error(j.error); }
    if (!r.ok) throw Error(j.error || '오류가 났어요.');
    return j;
  }

  function openRoom(meta) {
    room = meta; history.replaceState(null, '', '/class?room=' + meta.code);
    const url = `${location.origin}/quiz.html?room=${meta.code}`;
    drawQR(url); $('code').textContent = meta.code; $('url').textContent = url;
    $('roomTitle').textContent = meta.title || '강의실 퀴즈'; $('roomCat').textContent = catName(meta.categoryId) + ' · 5문제';
    setOpen(meta.open); show('room');
    $('thead').innerHTML = `<tr><th class="name">이름</th><th>진행</th><th>점수</th>${meta.questionIds.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr>`;
    clearInterval(timer); refresh(); timer = setInterval(refresh, 3000);
  }
  function setOpen(open) {
    room.open = open; $('state').textContent = open ? '진행 중' : '마감됨'; $('state').classList.toggle('closed', !open);
    $('toggle').textContent = open ? '마감하기' : '다시 열기'; $('toggle').className = open ? 'btn warn' : 'btn ghost';
  }

  async function refresh() {
    if (!room || document.hidden) return;
    let data; try { data = await api('scores&code=' + room.code); } catch { return; }
    const ps = data.players, Q = room.questionIds;
    const done = ps.filter(p => p.done);
    $('sJoin').textContent = ps.length; $('sDone').textContent = done.length;
    $('sAvg').textContent = done.length ? (done.reduce((s, p) => s + p.score, 0) / done.length).toFixed(1) : '–';
    // 문제별 정답률
    $('qrate').innerHTML = Q.map((id, i) => {
      const ans = ps.map(p => p.answers[i]).filter(Boolean), ok = ans.filter(a => a.ok).length;
      const pct = ans.length ? Math.round(ok / ans.length * 100) : 0;
      return `<div class="qrate-row"><span class="t">${i + 1}. ${esc(termName(id))}</span><span class="bar"><i style="width:${pct}%"></i></span><span>${ans.length ? pct + '%' : '–'}</span></div>`;
    }).join('');
    // 학생 표: 점수 높은 순, 같으면 이름순
    const rows = ps.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'));
    $('tbody').innerHTML = rows.length ? rows.map(p => `<tr><td class="name">${esc(p.name)}</td><td>${p.done ? '완료' : `${p.answers.length} / ${Q.length}`}</td><td class="sc">${p.score}</td>${Q.map((_, i) => { const a = p.answers[i]; return `<td>${!a ? '<span class="d">·</span>' : a.ok ? '<span class="o">○</span>' : '<span class="x">×</span>'}</td>`; }).join('')}</tr>`).join('')
      : `<tr><td colspan="${3 + Q.length}" class="empty">아직 입장한 학생이 없어요. QR을 화면에 띄워 주세요.</td></tr>`;
  }

  async function loadRecent() {
    try {
      const { rooms } = await api('rooms');
      $('recent').innerHTML = rooms.length ? '최근 방: ' : '';
      for (const r of rooms.slice(0, 8)) {
        const b = document.createElement('button'); const d = new Date(r.createdAt);
        b.textContent = `${r.code} · ${r.title || catName(r.categoryId)} · ${d.getMonth() + 1}/${d.getDate()}`;
        b.onclick = () => openRoom(r); $('recent').append(b);
      }
    } catch {}
  }

  $('create').onclick = async () => {
    $('create').disabled = true;
    try { openRoom(await api('create', { categoryId: $('cat').value, title: $('title').value })); }
    catch (e) { if (e.message) alert(e.message); }
    finally { $('create').disabled = false; }
  };
  $('toggle').onclick = async () => { try { setOpen((await api(room.open ? 'close' : 'reopen', { code: room.code })).open); } catch (e) { alert(e.message); } };
  $('newRoom').onclick = () => { clearInterval(timer); room = null; history.replaceState(null, '', '/class'); show('make'); loadRecent(); };
  document.addEventListener('visibilitychange', refresh);

  Promise.all([fetch('/api?op=status', { credentials: 'same-origin' }).then(r => r.json()), fetch('/api?op=terms').then(r => r.json())]).then(async ([st, d]) => {
    terms = d.terms; cats = d.categories;
    for (const c of cats) { const n = terms.filter(t => t.categoryId === c.id).length; if (!n) continue; const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.title} (${n})`; $('cat').append(o); }
    if (!st.authenticated) return show('login');
    const code = new URLSearchParams(location.search).get('room');
    if (code) { try { const r = await fetch('/api/room?op=room&code=' + encodeURIComponent(code)).then(r => r.json()); if (r.code) return openRoom(r); } catch {} }
    show('make'); loadRecent();
  });
})();
