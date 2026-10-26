const motionObservers=new Set();
function clearChapterMotion(){for(const o of motionObservers)o.disconnect();motionObservers.clear()}
/* 웹과 개발·데이터: 개념을 한 줄로 풀어 주는 설명과 재생/일시정지 버튼 */
const chapterMotion={
  36:{caption:"질문과 비슷한 문서를 먼저 찾아 질문과 함께 모델에 넣고, 근거 있는 답을 만듭니다. 틀린 답을 완전히 없애지는 못합니다."},
  37:{caption:"이미 학습된 모델에 우리 데이터를 더 학습시키면 내부 수치가 바뀌어 말투·형식이 맞춰집니다."},
  38:{caption:"사진·소리·글처럼 다른 종류의 정보를 한 모델이 함께 받아 이해합니다."},
  39:{caption:"모델은 어떤 도구에 무엇을 넣을지 제안하고, 실행은 연결된 프로그램이 허용 범위 안에서 맡아 결과를 돌려줍니다."},
  40:{caption:"목표를 받으면 다음 행동을 스스로 골라 단계를 이어가고, 중요한 순간엔 사람이 확인합니다."},
  41:{caption:"없는 논문도 그럴듯하게 지어낼 수 있습니다. 자신감 있는 말투가 사실을 뜻하지 않으니 근거를 확인하세요."},
  62:{caption:"토큰들이 어텐션 층을 하나씩 올라가며 서로의 관계를 반영합니다. 특정 서비스가 아닌 구조의 이름입니다."},
  63:{caption:"\"그는\"을 처리할 때 다른 단어와의 관련도를 계산해, 가장 관련 있는 \"철수는\"에 큰 무게를 둡니다."},
  64:{caption:"연결마다 붙은 수치(가중치·편향)가 학습하며 조정됩니다. 학습률 같은 설정은 사람이 정하는 하이퍼파라미터입니다."},
  65:{caption:"방대한 글로 언어의 기본 패턴을 먼저 익히고, 나중에 파인튜닝으로 번역·요약 같은 업무에 맞춥니다."},
  26:{caption:"AI 안에 머신러닝, 그 안에 신경망을 여러 층 쌓은 딥러닝이 있고, 생성형 AI는 대부분 딥러닝입니다."},
  28:{caption:"요청을 받으면 글은 트랜스포머가 써 내려가고, 그림은 디퓨전이 노이즈에서 그려 냅니다."},
  29:{caption:"많은 글로 배운 모델이 다음에 올 토큰을 확률로 골라 이어 붙입니다. 자연스러워도 사실인지는 따로 확인해야 합니다."},
  30:{caption:"정답이 붙은 메일로 모델 속 수치를 조정하는 것이 학습, 새 메일을 판별하는 것이 추론입니다."},
  31:{caption:"문장을 모델이 다루는 조각(토큰)으로 자릅니다. 글자 수와 토큰 수는 같지 않습니다."},
  32:{caption:"모델이 한 번에 볼 수 있는 범위입니다. 새 내용이 들어오면 오래된 앞부분은 창 밖으로 밀려납니다."},
  33:{caption:"\"요약해 줘\"에 독자·분량·형식을 덧붙이고 결과를 확인하며 고치면, 결과가 또렷해집니다."},
  34:{caption:"단어를 숫자 배열(벡터)로 바꿔 지도에 찍으면, 뜻이 비슷한 말끼리 가까이 모입니다."},
  35:{caption:"질문 벡터와 가까운 벡터를 재빨리 찾아 비슷한 문서 조각을 돌려줍니다. 가깝다고 정답인 것은 아닙니다."},
  19:{caption:"고칠 때마다 저장 지점(커밋)이 쌓이고, 필요하면 그때로 되돌아갑니다."},
  20:{caption:"내 컴퓨터 대신 인터넷 너머 서버의 저장·계산을 빌려 쓰고, 쓴 만큼 냅니다."},
  21:{caption:"새 버전을 운영 서버에 올리면 사용자 화면이 v1에서 v2로 바뀝니다."},
  22:{caption:"코드를 합칠 때마다 자동으로 빌드·테스트(CI)하고, 통과하면 자동 배포(CD), 실패하면 멈춥니다."},
  23:{caption:"앱·라이브러리·설정을 한 상자에 담아, 어느 컴퓨터에서든 똑같이 실행합니다."},
  24:{caption:"docker build로 이미지에서 컨테이너를 만들고, docker run으로 실행합니다."},
  25:{caption:"일어난 일이 기록으로 쌓이고, 응답 시간이 기준선을 넘으면 알림이 울립니다."},
  53:{caption:"몰려드는 요청을 여러 서버에 고루 나누고, 고장 난 서버는 건너뜁니다."},
  54:{caption:"접속자가 늘면 서버가 자동으로 늘고, 줄면 다시 줄어듭니다."},
  55:{caption:"컨테이너를 서버에 배치하고, 고장 나면 새로 띄우고, 필요하면 늘립니다."},
  60:{caption:"부품 하나하나가 통과해도, 이어 붙여 함께 돌려 봐야 제대로 확인됩니다."},
  61:{caption:"뒤엉킨 코드를 깔끔하게 정리하지만, 결과(동작)는 그대로입니다."},
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
