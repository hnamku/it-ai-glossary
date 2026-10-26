import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHmac} from 'node:crypto';
let state={terms:[{id:1,term:'첫 용어',definition:'설명',category:'웹과 개발'}],revision:1,auth:{version:'test'}};
globalThis.__categoryTestStore={read:()=>structuredClone(state),write:s=>state=JSON.parse(s)};
process.env.SESSION_SECRET='offline-test-only';
let source=await readFile(new URL('../api/index.js',import.meta.url),'utf8');
source=source.replace("'../lib/categories.js'",JSON.stringify(new URL('../lib/categories.js',import.meta.url).href));
source=source.replace(/import \{get,head,put,BlobPreconditionFailedError\} from '@vercel\/blob';/,`class BlobPreconditionFailedError extends Error{};const get=async()=>({statusCode:200,stream:[Buffer.from(JSON.stringify(globalThis.__categoryTestStore.read()))],blob:{etag:'test'}}),head=async()=>({etag:'test'}),put=async(path,s)=>globalThis.__categoryTestStore.write(s);`);
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
async function call(op,body,auth=true){const p=Buffer.from(JSON.stringify({exp:Date.now()+60000,v:'test'})).toString('base64url');const cookie='malteut='+p+'.'+createHmac('sha256',process.env.SESSION_SECRET).update(p).digest('base64url');const res={setHeader(){},status(n){this.code=n;return this},json(j){this.data=j;return this}};await handler({url:'/?op='+op,method:body?'POST':'GET',body,headers:{host:'test.local',origin:'https://test.local','x-malteut-admin':'1',cookie:auth?cookie:''}},res);return res;}
test('authenticated category updates and term reassignment persist with conflict protection',async()=>{
 const initial=await call('terms');assert.equal(initial.data.categories.length,8);
 assert.equal((await call('categories',{categories:initial.data.categories,revision:1},false)).code,401);
 const cats=initial.data.categories;cats[7].title='새 보안 분야';assert.equal((await call('categories',{categories:cats,revision:1})).code,200);
 assert.equal((await call('categories',{categories:cats,revision:1})).code,409);
 const moved=await call('save',{id:1,term:'첫 용어',definition:'설명',categoryId:'security',revision:2});assert.equal(moved.code,200);assert.equal(moved.data.terms[0].category,'새 보안 분야');
 assert.equal((await call('terms')).data.terms[0].categoryId,'security');
 assert.equal((await call('save',{id:1,term:'첫 용어',definition:'설명',categoryId:'missing',revision:3})).code,400);
});
test('move preserves IDs and other categories; rejects stale, unauthorized and boundary moves',async()=>{
 state={terms:[{id:1,categoryId:'web-basics'},{id:15,categoryId:'data'},{id:2,categoryId:'web-basics'},{id:3,categoryId:'web-basics'}],revision:10,auth:{version:'test'}};
 assert.equal((await call('move',{id:2,direction:-1,revision:10},false)).code,401);
 const moved=await call('move',{id:2,direction:-1,revision:10});assert.equal(moved.code,200);assert.deepEqual(moved.data.terms.map(t=>t.id),[2,15,1,3]);
 assert.equal((await call('move',{id:2,direction:1,revision:10})).code,409);
 assert.equal((await call('move',{id:2,direction:-1,revision:11})).code,400);
 const down=await call('move',{id:2,direction:1,revision:11});assert.equal(down.code,200);assert.deepEqual(down.data.terms.map(t=>t.id),[1,15,2,3]);
 assert.equal((await call('move',{id:2,direction:0,revision:12})).code,400);
});
