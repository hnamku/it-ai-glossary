const motionObservers=new Set();
function clearChapterMotion(){for(const o of motionObservers)o.disconnect();motionObservers.clear()}
/* 웹과 개발·데이터: 개념을 한 줄로 풀어 주는 설명과 재생/일시정지 버튼 */
const chapterMotion={
 1:{caption:"쇼핑몰 화면에서 \"담기\"를 누르면 장바구니 숫자가 올라갑니다."},
 2:{caption:"화면 뒤 보이지 않는 곳에서 재고를 확인하고 결제를 승인합니다."},
 3:{caption:"한 사람이 화면(프론트)과 서버(백엔드)를 오가며 둘 다 만듭니다."},
 4:{caption:"브라우저와 앱이 손을 들어 요청하고, 받은 정보를 화면에 보여 줍니다."},
 5:{caption:"여러 요청을 듣고, 알맞은 정보를 찾아 각자에게 돌려줍니다."},
 6:{caption:"태그를 한 줄씩 쓰면 페이지의 내용과 구조(뼈대)가 생깁니다."},
 7:{caption:"같은 뼈대에 색·글꼴·배치·모서리 규칙을 입혀 꾸밉니다."},
 8:{caption:"하트를 누르면 숫자가 오르듯, 화면에 반응을 붙입니다."},
 9:{caption:"방 구조(틀)는 그대로 두고, 벽지와 가구(기능)를 채웁니다."},
 10:{caption:"도구를 골라 꺼내 쓰지만, 집 모양(설계)은 내가 정합니다."},
 11:{caption:"HTTP는 엽서처럼 보이고, HTTPS는 잠긴 봉투라 엿봐도 모릅니다."},
 12:{caption:'날씨 앱이 API 창구로 요청하면, 기상 서버가 예보를 돌려줍니다.'},
 13:{caption:'GET은 /users를 조회하고, POST는 새 사용자를 만듭니다.'},
 14:{caption:'정보를 "이름표": 값 쌍의 텍스트로 옮겨 주고받습니다.'},
 42:{caption:'이름을 입력하면 DNS가 IP를 찾아 주고, 그 주소의 서버로 갑니다.'},
 43:{caption:'기기마다 고유 번호가 있어, 데이터가 정확한 기기로 찾아갑니다.'},
 44:{caption:'조각이 뒤섞여 도착해도 번호대로 맞추고, 받았다고 응답합니다.'},
 45:{caption:'한 번 연결하면 끊지 않고, 양쪽이 언제든 먼저 보냅니다.'},
 46:{caption:'SDK 상자 속 도구를 꺼내 앱을 완성합니다.'},
 78:{caption:'오래 걸리는 A를 기다리는 동안, B가 먼저 끝납니다.'},
 79:{caption:'계획→개발→피드백을 돌 때마다 결과물이 한 단계씩 자랍니다.'},
 80:{caption:'완성품을 살펴보고 뜯어서, 부품과 연결을 설계도로 정리합니다.'},
 15:{caption:"흩어진 기록을 칸칸이 저장해 두고, 필요할 때 바로 찾아 꺼냅니다."},
 16:{caption:"정해진 양식의 표에서 조건에 맞는 줄만 골라 꺼냅니다."},
 81:{caption:"사진·음성·글이 서로 다른 항목 그대로 한 저장소에 담깁니다."},
 17:{caption:"처음엔 DB까지 다녀오지만, 복사본을 가까이 두면 다음엔 바로 꺼냅니다."},
 48:{caption:"기록을 만들고(C)·읽고(R)·고치고(U)·지우는(D) 네 가지 기본 동작입니다."},
 49:{caption:"항목과 형식의 규칙에 맞는 데이터만 들어갈 수 있습니다."},
 50:{caption:"옛 시스템의 데이터를 새 구조로 바꿔 새 시스템으로 옮깁니다."},
 51:{caption:"저장하기 전에 정제·정리해 두어, 집계 보고서가 빠르게 나옵니다."},
 52:{caption:"원본을 가공 없이 그대로 담아 두고, 나중에 AI 학습 등에 꺼내 씁니다."}
};
function addChapterMotion(svg,frame,term){
 const spec=chapterMotion[Number(term.id)];if(!spec)return;
 const caption=document.createElement('p');caption.className='motion-caption';caption.textContent=spec.caption;
 const controls=document.createElement('div');controls.className='motion-controls';
 const button=document.createElement('button');button.type='button';button.className='motion-toggle';
 let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,visible=true;
 const update=()=>{frame.classList.toggle('paused',paused||!visible);button.textContent=paused?'▶ 재생':'Ⅱ 일시정지';button.setAttribute('aria-label',term.term+' 모션 '+(paused?'재생':'일시정지'));button.setAttribute('aria-pressed',String(!paused))};
 button.onclick=()=>{paused=!paused;update()};controls.append(button);frame.append(caption,controls);
 // 화면에 보이는 카드만 움직임
 const observer=new IntersectionObserver(entries=>{if(!frame.isConnected){observer.disconnect();return}visible=entries[0].isIntersecting;update()},{threshold:0.1});motionObservers.add(observer);observer.observe(frame);
 update();
}
