const motionObservers=new Set();
function clearChapterMotion(){for(const o of motionObservers)o.disconnect();motionObservers.clear()}
/* Concept-specific motion over the original pen drawings, in sheet coordinates. */
const chapterMotion = {
 12:{caption:'요청을 보내면, 약속된 응답이 돌아옵니다.',paths:['M110 218 Q220 170 340 218','M340 270 Q220 310 110 270']},
 13:{caption:'GET으로 조회하고, POST로 생성을 요청합니다.',paths:['M650 214 L785 214','M650 287 L785 287']},
 14:{caption:'이름과 값이 쌍을 이루어 데이터를 표현합니다.',boxes:[[968,205,133,35],[968,244,133,35]]},
 42:{caption:'도메인 이름을 조회해 연결된 IP 주소를 찾습니다.',paths:['M150 500 L150 540','M185 580 L390 580'],boxes:[[76,430,280,65],[218,556,192,51]]},
 43:{caption:'주소로 통신할 장치를 식별합니다.',paths:['M760 465 L670 465 L610 525'],boxes:[[595,438,172,64]]},
 44:{caption:'데이터를 나누어 보내고, 순서를 맞춰 받습니다.',packets:true},
 45:{caption:'연결을 유지한 채 양방향으로 계속 주고받습니다.',paths:['M153 816 L307 816','M307 850 L153 850'],simultaneous:true},
 46:{caption:'도구·라이브러리·API를 꺼내 개발에 활용합니다.',boxes:[[515,726,68,91],[587,748,63,62],[659,734,70,94]],paths:['M620 840 L620 790']},
 78:{caption:'작업 A를 기다리는 동안에도 작업 B는 진행됩니다.',async:true},
 79:{caption:'개발 → 피드백 → 개선을 짧게 반복합니다.',paths:['M325 1025 C210 1010 170 1130 240 1160 C350 1215 470 1155 420 1090 C390 1045 355 1025 325 1025']},
 80:{caption:'완성품을 관찰하고 내부 구조를 분석합니다.',paths:['M710 1100 L850 1100','M975 1050 L975 1180'],boxes:[[865,999,200,204]]}
};
function addChapterMotion(svg,frame,term){
 const spec=chapterMotion[Number(term.id)];if(!spec)return;
 const ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e};
 const layer=make('g',{'aria-hidden':'true','clip-path':'url(#pictogram-clip-'+term.id+')'});
 const motion=(path,begin=0,dur=4,label)=>{
  const g=make('g',{},layer);
  make('circle',{r:label?13:7,fill:'#275843',stroke:'#fff','stroke-width':2},g);
  if(label){const t=make('text',{'text-anchor':'middle',y:5,fill:'white','font-size':15,'font-weight':700},g);t.textContent=label}
  make('animateMotion',{path,dur:dur+'s',begin:begin+'s',repeatCount:'indefinite',calcMode:'linear'},g);
  make('animate',{attributeName:'opacity',values:'0;1;1;0',keyTimes:'0;0.08;0.85;1',dur:dur+'s',begin:begin+'s',repeatCount:'indefinite'},g);
 };
 const highlight=(box,i,dur=5)=>{
  const r=make('rect',{x:box[0],y:box[1],width:box[2],height:box[3],rx:9,fill:'#275843','fill-opacity':0.06,stroke:'#275843','stroke-width':4,opacity:0},layer);
  make('animate',{attributeName:'opacity',values:'0;1;1;0;0',keyTimes:'0;0.1;0.3;0.4;1',dur:dur+'s',begin:(i*dur/3)+'s',repeatCount:'indefinite'},r);
 };
 (spec.paths||[]).forEach((p,i)=>motion(p,spec.simultaneous?0:i*2,spec.simultaneous?2.8:5));
 (spec.boxes||[]).forEach((b,i)=>highlight(b,i));
 if(spec.packets){for(let i=0;i<3;i++)motion('M920 506 L1095 506',i*0.55,4,String(i+1));motion('M1095 576 L920 576',2.4,4,'✓')}
 if(spec.async){
  const spinner=make('circle',{cx:1049,cy:783,r:23,fill:'none',stroke:'#275843','stroke-width':5,'stroke-dasharray':'35 110'},layer);
  make('animateTransform',{attributeName:'transform',type:'rotate',from:'0 1049 783',to:'360 1049 783',dur:'2s',repeatCount:'indefinite'},spinner);
  motion('M860 815 Q850 866 925 866 L1098 866',0,4);
  highlight([1120,837,74,65],1,4);
 }
 const controls=document.createElement('div');controls.className='motion-controls';
 const caption=document.createElement('p');caption.className='motion-caption';caption.textContent=spec.caption;
 const button=document.createElement('button');button.type='button';button.className='motion-toggle';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,visible=true;
 const update=()=>{(paused||!visible)?svg.pauseAnimations():svg.unpauseAnimations();button.textContent=paused?'▶ 재생':'Ⅱ 일시정지';button.setAttribute('aria-label',term.term+' 모션 '+(paused?'재생':'일시정지'));button.setAttribute('aria-pressed',String(!paused))};
 button.onclick=()=>{paused=!paused;update()};controls.append(button);frame.append(caption,controls);
 // Only animate visible cards. Disconnected cards release their observer.
 const observer=new IntersectionObserver(entries=>{if(!frame.isConnected){observer.disconnect();return}visible=entries[0].isIntersecting;update()},{threshold:0.1});motionObservers.add(observer);observer.observe(frame);
 requestAnimationFrame(update);
}
