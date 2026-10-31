// 강의실 퀴즈: 교수자가 방을 만들면(5문제 고정) 학생들이 이름을 적고 입장해 풀고, 교수자는 점수를 실시간으로 봅니다.
// 저장: 방 정보 rooms/{코드}/meta.json, 학생별 기록 rooms/{코드}/p/{pid}.json (학생마다 파일이 따로라 동시에 제출해도 충돌 없음)
import {get,put,list} from '@vercel/blob';
import {createHmac,timingSafeEqual,randomInt} from 'node:crypto';
import {normalize} from '../lib/categories.js';

const STATE = process.env.GLOSSARY_STATE_PATH || 'glossary-state.json';
const QUESTIONS = 5;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/, PID_RE = /^[a-z0-9]{8,32}$/;
const fail = (status, message) => Object.assign(Error(message), {status});
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const mac = p => createHmac('sha256', process.env.SESSION_SECRET).update(p).digest('base64url');

async function readJson(path) {
  try {
    const r = await get(path, {access: 'private', useCache: false});
    if (!r || r.statusCode !== 200) return null;
    const chunks = []; for await (const c of r.stream) chunks.push(Buffer.from(c));
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return null; }
}
const writeJson = (path, obj) => put(path, JSON.stringify(obj), {access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0});

// 관리자 로그인(용어집 관리와 같은 쿠키)을 확인
function authenticated(req, state) {
  try {
    const c = (req.headers.cookie || '').split('; ').find(x => x.startsWith('malteut='))?.slice(8); if (!c) return false;
    const [p, s] = c.split('.'); if (!eq(mac(p), s)) return false;
    const j = JSON.parse(Buffer.from(p, 'base64url'));
    return !!state?.auth && j.exp > Date.now() && j.v === state.auth.version;
  } catch { return false; }
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const publicMeta = m => ({code: m.code, title: m.title, categoryId: m.categoryId, questionIds: m.questionIds, open: m.open, createdAt: m.createdAt});

async function players(code) {
  const out = []; let cursor;
  do {
    const page = await list({prefix: `rooms/${code}/p/`, cursor, limit: 1000});
    out.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const recs = await Promise.all(out.map(b => readJson(b.pathname)));
  return recs.filter(Boolean).map(({pid, name, answers, score, total, done, stage, at, joinedAt, updatedAt}) => ({pid, name, answers: answers.map(a => ({id: a.id, ok: a.ok})), score, total, done, stage: done ? 'done' : stage || (answers.length ? 'playing' : 'joined'), at: at || answers.length + 1, joinedAt, updatedAt, now: Date.now()}));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const op = new URL(req.url, 'https://local').searchParams.get('op') || '';
    const q = new URL(req.url, 'https://local').searchParams;

    if (req.method === 'GET') {
      if (op === 'room') {                                  // 학생: 방 정보(문제 목록)
        const code = String(q.get('code') || '').toUpperCase();
        if (!CODE_RE.test(code)) throw fail(400, '방 코드를 확인해 주세요.');
        const meta = await readJson(`rooms/${code}/meta.json`);
        if (!meta) throw fail(404, '없는 방입니다. 코드를 확인해 주세요.');
        return res.status(200).json(publicMeta(meta));
      }
      const state = await readJson(STATE);
      if (!authenticated(req, state)) throw fail(401, '관리자 로그인이 필요합니다.');
      if (op === 'scores') {                                // 교수자: 실시간 점수
        const code = String(q.get('code') || '').toUpperCase();
        if (!CODE_RE.test(code)) throw fail(400, '방 코드를 확인해 주세요.');
        const meta = await readJson(`rooms/${code}/meta.json`);
        if (!meta) throw fail(404, '없는 방입니다.');
        return res.status(200).json({room: publicMeta(meta), players: await players(code)});
      }
      if (op === 'rooms') {                                 // 교수자: 최근 방 목록
        const metas = []; let cursor;
        do {
          const page = await list({prefix: 'rooms/', cursor, limit: 1000});
          metas.push(...page.blobs.filter(b => b.pathname.endsWith('/meta.json'))); cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
        metas.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        const rooms = (await Promise.all(metas.slice(0, 15).map(b => readJson(b.pathname)))).filter(Boolean).map(publicMeta);
        return res.status(200).json({rooms: rooms.sort((a, b) => b.createdAt - a.createdAt)});
      }
      throw fail(404, '없는 요청입니다.');
    }

    if (req.method !== 'POST') throw fail(405, '지원하지 않는 요청입니다.');
    const origin = req.headers.origin, host = req.headers['x-forwarded-host'] || req.headers.host;
    if (!origin || new URL(origin).host !== host || req.headers['x-malteut-admin'] !== '1') throw fail(403, '허용되지 않은 요청입니다.');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    if (op === 'submit') {                                  // 학생: 답 제출(한 문제 풀 때마다 누적해서 보냄)
      const code = String(body.code || '').toUpperCase(), pid = String(body.pid || ''), name = String(body.name || '').trim();
      if (!CODE_RE.test(code) || !PID_RE.test(pid)) throw fail(400, '잘못된 요청입니다.');
      if (!name || name.length > 20) throw fail(400, '이름은 1~20자로 적어 주세요.');
      const meta = await readJson(`rooms/${code}/meta.json`);
      if (!meta) throw fail(404, '없는 방입니다.');
      if (!meta.open) throw fail(403, '이 퀴즈는 마감되었습니다.');
      const answers = Array.isArray(body.answers) ? body.answers : [];
      if (answers.length > meta.questionIds.length) throw fail(400, '잘못된 답안입니다.');
      const checked = answers.map((a, i) => {
        if (Number(a?.id) !== meta.questionIds[i] || !Number.isSafeInteger(Number(a?.pick))) throw fail(400, '잘못된 답안입니다.');
        return {id: meta.questionIds[i], pick: Number(a.pick), ok: Number(a.pick) === meta.questionIds[i]};
      });
      const path = `rooms/${code}/p/${pid}.json`, prev = await readJson(path);
      // 이미 낸 답은 바꿀 수 없음
      if (prev && (checked.length < prev.answers.length || prev.answers.some((a, i) => a.pick !== checked[i].pick))) throw fail(409, '이미 제출한 답은 바꿀 수 없어요.');
      const score = checked.filter(a => a.ok).length, total = meta.questionIds.length;
      // 단계: joined(이름 적고 대기) → playing(푸는 중, at = 지금 보고 있는 문제 번호) → done
      const stage = checked.length === total ? 'done' : (body.stage === 'playing' || checked.length ? 'playing' : 'joined');
      const at = Math.min(total, Math.max(1, Number.isSafeInteger(Number(body.at)) ? Number(body.at) : checked.length + 1));
      const rec = {pid, name, answers: checked, score, total, done: stage === 'done', stage, at, joinedAt: prev?.joinedAt || Date.now(), updatedAt: Date.now()};
      await writeJson(path, rec);
      return res.status(200).json({ok: true, score, total, done: rec.done});
    }

    const state = await readJson(STATE);
    if (!authenticated(req, state)) throw fail(401, '관리자 로그인이 필요합니다.');
    normalize(state);

    if (op === 'create') {                                  // 교수자: 방 만들기
      const categoryId = String(body.categoryId || '');
      const title = String(body.title || '').trim().slice(0, 40);
      const pool = state.terms.filter(t => !categoryId || t.categoryId === categoryId);
      if (!pool.length) throw fail(400, '이 분야에는 용어가 없습니다.');
      let code;
      for (let i = 0; i < 8; i++) {
        const c = Array.from({length: 5}, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
        if (!(await readJson(`rooms/${c}/meta.json`))) { code = c; break; }
      }
      if (!code) throw fail(503, '잠시 후 다시 시도해 주세요.');
      const meta = {code, title, categoryId, questionIds: shuffle(pool).slice(0, QUESTIONS).map(t => t.id), open: true, createdAt: Date.now()};
      await writeJson(`rooms/${code}/meta.json`, meta);
      return res.status(200).json(publicMeta(meta));
    }
    if (op === 'close' || op === 'reopen') {                // 교수자: 마감 / 다시 열기
      const code = String(body.code || '').toUpperCase();
      if (!CODE_RE.test(code)) throw fail(400, '방 코드를 확인해 주세요.');
      const meta = await readJson(`rooms/${code}/meta.json`);
      if (!meta) throw fail(404, '없는 방입니다.');
      meta.open = op === 'reopen'; await writeJson(`rooms/${code}/meta.json`, meta);
      return res.status(200).json(publicMeta(meta));
    }
    throw fail(404, '없는 요청입니다.');
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    return res.status(status).json({error: status === 500 ? '잠시 후 다시 시도해 주세요.' : e.message});
  }
}
