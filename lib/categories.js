export const defaults = [
 {slug:'web-basics',title:'웹과 개발 · 기본',description:'웹사이트의 앞과 뒤, 화면과 동작을 만드는 기본 요소',ids:[1,2,3,4,5,6,7,8,9,10,11],category:'웹과 개발'},
 {slug:'web-connections',title:'웹과 개발 · 연결과 방법',description:'프로그램이 서로 연결되고, 함께 개발되는 방식',ids:[12,13,14,42,43,44,45,46,78,79,80],category:'웹과 개발'},
 {slug:'data',title:'데이터',description:'정보를 저장하고 찾고 옮기는 방법',ids:[15,16,81,17,18,47,48,49,50,51,52],category:'데이터'},
 {slug:'infrastructure',title:'인프라와 운영',description:'서비스를 배포하고 안정적으로 운영하는 기술',ids:[19,20,21,22,23,24,25,53,54,55,60,61],category:'인프라와 운영'},
 {slug:'ai-basics',title:'AI와 머신러닝 · 기초',description:'데이터에서 배우고, 언어와 의미를 다루는 AI의 기초',ids:[26,27,28,29,30,31,32,33,34,35],category:'AI와 머신러닝'},
 {slug:'ai-applications',title:'AI와 머신러닝 · 활용과 구조',description:'AI의 내부 구조와 도구를 활용하는 방식',ids:[36,37,38,39,40,41,62,63,64,65],category:'AI와 머신러닝'},
 {slug:'ai-training',title:'AI와 머신러닝 · 학습과 운영',description:'모델을 가르치고, 평가하고, 실제로 실행하는 과정',ids:[66,67,68,69,70,71,72,73,76,77],category:'AI와 머신러닝'},
 {slug:'security',title:'보안과 신뢰',description:'접근 권한과 정보를 보호하고 AI를 안전하게 사용하는 방법',ids:[56,57,58,59,74,75],category:'보안과 신뢰'}
];
export function normalize(state){
 if(!Array.isArray(state.categories))state.categories=defaults.map(({slug,title,description})=>({id:slug,title,description}));
 for(const t of state.terms){
  if(state.categories.some(c=>c.id===t.categoryId))continue;
  const original=defaults.find(c=>c.ids.includes(Number(t.id)))||defaults.find(c=>c.title===t.category)||defaults.find(c=>c.category===t.category);
  t.categoryId=state.categories.find(c=>c.title===t.category)?.id||state.categories.find(c=>c.id===original?.slug)?.id||state.categories[0].id;
 }
 return state;
}
export function publicState(state){return {terms:state.terms.map(t=>({...t,category:state.categories.find(c=>c.id===t.categoryId)?.title||t.category})),categories:state.categories,revision:state.revision}}
export function editCategories(state,items){
 if(!Array.isArray(items)||items.length<1||items.length>40)throw Error('분야는 1~40개로 구성해 주세요.');
 const ids=new Set(),names=new Set();
 const categories=items.map(c=>{
  const id=String(c.id||''),title=String(c.title||'').trim(),description=String(c.description||'').trim();
  if(!/^[a-z0-9-]{1,80}$/.test(id)||!title||title.length>40||description.length>200||ids.has(id)||names.has(title))throw Error('분야 이름은 중복 없이 40자 이내로 입력해 주세요.');
  ids.add(id);names.add(title);return {id,title,description};
 });
 if(state.terms.some(t=>!ids.has(t.categoryId)))throw Error('용어가 있는 분야는 삭제할 수 없습니다. 먼저 다른 분야로 옮겨 주세요.');
 state.categories=categories;
}
