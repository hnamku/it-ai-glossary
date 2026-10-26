import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,publicState,editCategories} from '../lib/categories.js';
test('legacy terms retain all eight assignments',()=>{
 const state=normalize({terms:Array.from({length:81},(_,i)=>({id:i+1,category:'old'})),revision:1});
 assert.equal(state.categories.length,8);
 assert.equal(new Set(state.terms.map(t=>t.categoryId)).size,8);
 assert.equal(state.terms.find(t=>t.id===62).categoryId,'ai-applications');
});
test('rename and reorder preserve membership; selected reassignment survives normalization',()=>{
 const s=normalize({terms:[{id:1,category:'웹과 개발'}],revision:2});
 s.categories[0].title='새 분야 이름';s.categories.reverse();
 assert.equal(publicState(s).terms[0].category,'새 분야 이름');
 s.terms[0].categoryId='security';normalize(s);
 assert.equal(s.terms[0].categoryId,'security');
});
test('reject occupied deletions and duplicate names; allow empty removal',()=>{
 const s=normalize({terms:[{id:1,category:'웹과 개발'}],revision:2});
 assert.throws(()=>editCategories(s,s.categories.slice(1)));
 assert.throws(()=>editCategories(s,s.categories.map(c=>({...c,title:'중복'}))));
 editCategories(s,[s.categories[0]]);assert.equal(s.categories.length,1);
});
