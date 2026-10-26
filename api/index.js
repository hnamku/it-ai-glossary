import {normalize,publicState,editCategories} from '../lib/categories.js';
import {get,head,put,BlobPreconditionFailedError} from '@vercel/blob';
import {scryptSync,randomBytes,createHmac,timingSafeEqual,createHash} from 'node:crypto';
const path=process.env.GLOSSARY_STATE_PATH||'glossary-state.json';
const eq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
const hash=(password,salt)=>scryptSync(password,salt,64).toString('hex');
const mac=p=>createHmac('sha256',process.env.SESSION_SECRET).update(p).digest('base64url');
function cookie(res,state){const payload=Buffer.from(JSON.stringify({exp:Date.now()+8*3600000,v:state.auth.version})).toString('base64url');res.setHeader('Set-Cookie',`malteut=${payload}.${mac(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`)}
function authenticated(req,state){try{const c=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('malteut='))?.slice(8);if(!c)return false;const [p,s]=c.split('.');if(!eq(mac(p),s))return false;const j=JSON.parse(Buffer.from(p,'base64url'));return state.auth&&j.exp>Date.now()&&j.v===state.auth.version}catch{return false}}
async function read(){
 const [data,metadata]=await Promise.all([
  get(path,{access:'private',useCache:false}).then(async r=>{
   if(!r||r.statusCode!==200)throw Error('Missing state');
   const chunks=[];for await(const chunk of r.stream)chunks.push(Buffer.from(chunk));
   return {state:JSON.parse(Buffer.concat(chunks).toString('utf8')),etag:r.blob.etag};
  }),head(path)
 ]);
 // A compressed GET may return a weak ETag; conditional writes need the
 // strong storage ETag. Verify both reads describe the same version first.
 if(data.etag.replace(/^W\//,'')!==metadata.etag.replace(/^W\//,''))throw fail(409,'내용이 변경되었습니다. 다시 시도해 주세요.');
 return {state:normalize(data.state),etag:metadata.etag};
}
async function save(state,etag){return put(path,JSON.stringify(state),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:etag,contentType:'application/json',cacheControlMaxAge:0})}
const fail=(status,message)=>Object.assign(Error(message),{status});
function validPassword(p){if(typeof p!=='string'||p.length<10||p.length>128)throw fail(400,'비밀번호는 10~128자로 입력해 주세요.')}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');try{const op=new URL(req.url,'https://local').searchParams.get('op')||'terms';const {state,etag}=await read();const auth=authenticated(req,state);if(req.method==='GET'){if(op==='terms')return res.status(200).json(publicState(state));if(op==='status')return res.status(200).json({configured:!!state.auth,authenticated:auth});throw fail(404,'없는 요청입니다.')}if(req.method!=='POST')throw fail(405,'지원하지 않는 요청입니다.');const origin=req.headers.origin;const host=req.headers['x-forwarded-host']||req.headers.host;if(!origin||new URL(origin).host!==host||req.headers['x-malteut-admin']!=='1')throw fail(403,'허용되지 않은 요청입니다.');const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
if(op==='setup'){if(state.auth)throw fail(409,'비밀번호가 이미 설정되어 있습니다. 로그인해 주세요.');if(!process.env.SETUP_KEY||!eq(body.setupKey,process.env.SETUP_KEY))throw fail(403,'전용 초기 설정 링크가 필요합니다.');validPassword(body.password);const salt=randomBytes(24).toString('hex');state.auth={salt,hash:hash(body.password,salt),version:randomBytes(20).toString('hex')};await save(state,etag);cookie(res,state);return res.status(200).json({ok:true});}
if(op==='login'){if(!state.auth)throw fail(409,'먼저 비밀번호를 설정해 주세요.');const ip=createHash('sha256').update(String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown')).digest('hex');const now=Date.now();state.attempts=Object.fromEntries(Object.entries(state.attempts||{}).filter(([,v])=>v.until>now));const item=state.attempts[ip]||{count:0,until:now+15*60000};if(item.count>=8)throw fail(429,'로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.');if(typeof body.password!=='string'||body.password.length>128||!eq(hash(body.password,state.auth.salt),state.auth.hash)){item.count++;state.attempts[ip]=item;await save(state,etag);throw fail(401,'비밀번호가 일치하지 않습니다.');}delete state.attempts[ip];await save(state,etag);cookie(res,state);return res.status(200).json({ok:true});}
if(op==='logout'){res.setHeader('Set-Cookie','malteut=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return res.status(200).json({ok:true});}
if(!auth)throw fail(401,'로그인이 필요합니다.');
if(op==='password'){validPassword(body.password);if(typeof body.currentPassword!=='string'||body.currentPassword.length>128||!eq(hash(body.currentPassword,state.auth.salt),state.auth.hash))throw fail(401,'현재 비밀번호가 일치하지 않습니다.');const salt=randomBytes(24).toString('hex');state.auth={salt,hash:hash(body.password,salt),version:randomBytes(20).toString('hex')};await save(state,etag);cookie(res,state);return res.status(200).json({ok:true});}
if(op==='move'){
 if(body.revision!==state.revision)throw fail(409,'다른 화면에서 변경되었습니다. 목록을 새로고침해 주세요.');
 if(!Number.isSafeInteger(body.id)||![-1,1].includes(body.direction))throw fail(400,'이동할 용어와 방향을 확인해 주세요.');
 const index=state.terms.findIndex(t=>t.id===body.id);
 if(index<0)throw fail(404,'용어를 찾지 못했습니다.');
 const siblings=state.terms.map((t,i)=>({t,i})).filter(x=>x.t.categoryId===state.terms[index].categoryId);
 const position=siblings.findIndex(x=>x.i===index),target=siblings[position+body.direction];
 if(!target)throw fail(400,'이 방향으로 더 이동할 수 없습니다.');
 [state.terms[index],state.terms[target.i]]=[state.terms[target.i],state.terms[index]];
 state.revision++;await save(state,etag);return res.status(200).json({ok:true,...publicState(state)});
}
if(op==='categories'){
 if(body.revision!==state.revision)throw fail(409,'다른 화면에서 변경되었습니다. 목록을 새로고침해 주세요.');
 try{editCategories(state,body.categories)}catch(e){throw fail(400,e.message)}
 state.revision++;await save(state,etag);return res.status(200).json({ok:true,...publicState(state)});
}
if(op==='delete'){
 if(body.revision!==state.revision)throw fail(409,'다른 화면에서 변경되었습니다. 목록을 새로고침한 뒤 다시 삭제해 주세요.');
 if(!Number.isSafeInteger(body.id)||body.id<1)throw fail(400,'삭제할 용어를 올바르게 선택해 주세요.');
 const index=state.terms.findIndex(t=>t.id===body.id);
 if(index<0)throw fail(404,'용어를 찾지 못했습니다. 목록을 새로고침해 주세요.');
 // Keep IDs unique after deleting the highest ID so saved learning records
 // can never attach to a different, newly added term.
 state.nextId=Math.max(state.nextId||1,Math.max(0,...state.terms.map(t=>t.id))+1);
 state.terms.splice(index,1);state.revision++;
 await save(state,etag);
 return res.status(200).json({ok:true,...publicState(state)});
}
if(op==='save'){if(body.revision!==state.revision)throw fail(409,'다른 화면에서 변경되었습니다. 목록을 새로고침한 뒤 다시 저장해 주세요.');const term=String(body.term||'').trim(),definition=String(body.definition||'').trim(),categoryId=String(body.categoryId||''),selected=state.categories.find(c=>c.id===categoryId),category=selected?.title||'';if(!term||term.length>120||!definition||definition.length>2000||!category||category.length>40)throw fail(400,'용어·정의·분야를 올바르게 입력해 주세요.');if(state.terms.some(t=>t.id!==body.id&&t.term.toLowerCase()===term.toLowerCase()))throw fail(400,'같은 이름의 용어가 이미 있습니다.');let t;if(body.id){t=state.terms.find(t=>t.id===body.id);if(!t)throw fail(404,'용어를 찾지 못했습니다.');Object.assign(t,{term,definition,category,categoryId})}else{const nextId=Math.max(state.nextId||1,Math.max(0,...state.terms.map(t=>t.id))+1);t={id:nextId,term,definition,category,categoryId};state.nextId=nextId+1;state.terms.push(t)}state.revision++;await save(state,etag);return res.status(200).json({ok:true,...publicState(state)});}throw fail(404,'없는 요청입니다.');
}catch(e){if(e instanceof BlobPreconditionFailedError)return res.status(409).json({error:'동시에 변경된 내용이 있습니다. 다시 시도해 주세요.'});if(e.status)return res.status(e.status).json({error:e.message});console.error('Glossary API error',e.name,e.message);return res.status(500).json({error:'저장 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}}
