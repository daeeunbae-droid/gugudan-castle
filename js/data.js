/* =========================================================
   data.js — 게임 데이터. 밸런스는 대부분 여기만 고치면 됩니다.
========================================================= */

/* ---------- 난이도 ---------- */
const DIFF = {
  easy:   { id:'easy',   name:'연습',   emoji:'🌱', time:0,  hearts:3, gold:1.0,
            desc:'시간 제한 없음 · 천천히 생각해도 돼요' },
  normal: { id:'normal', name:'모험',   emoji:'⚔️', time:8,  hearts:3, gold:1.5,
            desc:'문제당 8초 · 골드를 더 많이 받아요' },
  hard:   { id:'hard',   name:'챔피언', emoji:'👑', time:5,  hearts:3, gold:2.2,
            desc:'문제당 5초 · 단이 섞여 나와요' }
};

/* ---------- 몬스터 (단별) ---------- */
const MONS = [
  {t:2, f:'mon-2.png', e:'👾', name:'말랑 슬라임',   taunt:['두 배로 늘어난다!','물렁물렁 공격!']},
  {t:3, f:'mon-3.png', e:'🦇', name:'밤하늘 박쥐',   taunt:['세 마리씩 날아간다!','어둠 속이다!']},
  {t:4, f:'mon-4.png', e:'🕷️', name:'그물 거미',     taunt:['네 칸 거미줄이다!','걸려들었군!']},
  {t:5, f:'mon-5.png', e:'🐺', name:'달빛 늑대',     taunt:['다섯 걸음마다 짖는다!','아우우우!']},
  {t:6, f:'mon-6.png', e:'🗿', name:'바위 골렘',     taunt:['여섯 개의 돌이다!','부서지지 않는다!']},
  {t:7, f:'mon-7.png', e:'🧙', name:'안개 마법사',   taunt:['일곱 개의 주문!','안개 속으로!']},
  {t:8, f:'mon-8.png', e:'💀', name:'해골 기사',     taunt:['여덟 개의 갈비뼈!','덜그럭덜그럭!']},
  {t:9, f:'mon-9.png', e:'🐂', name:'미노타우로스', taunt:['아홉 번 땅을 구른다!','뿔을 조심해!']}
];
const BOSS = {t:'boss', f:'mon-boss.png', e:'🐉', name:'구구단 드래곤',
              taunt:['2단부터 9단까지 전부다!','보물은 못 가져간다!']};

/* ---------- 몬스터 격파 보상 아이템 ---------- */
const DROPS = {
  2:{id:'boots-slime',  name:'슬라임 부츠',   e:'👢'},
  3:{id:'cape-night',   name:'밤하늘 망토',   e:'🧣'},
  4:{id:'glove-silk',   name:'실크 장갑',     e:'🧤'},
  5:{id:'neck-moon',    name:'달빛 목걸이',   e:'📿'},
  6:{id:'shield-rock',  name:'바위 방패',     e:'🛡️'},
  7:{id:'staff-mist',   name:'안개 지팡이',   e:'🪄'},
  8:{id:'helm-knight',  name:'기사 투구',     e:'⛑️'},
  9:{id:'sword-gold',   name:'황금 검',       e:'🗡️'},
  boss:{id:'egg-dragon',name:'아기 드래곤 알', e:'🥚'}
};

/* ---------- 상점 (외형 전용 — 능력치 없음) ---------- */
const SHOP = [
  {id:'hat-star',    name:'별 모자',     e:'🎩', price:60,  tag:'머리'},
  {id:'cape-red',    name:'붉은 망토',   e:'🟥', price:80,  tag:'망토'},
  {id:'boots-swift', name:'날쌘 부츠',   e:'🥾', price:70,  tag:'신발'},
  {id:'sword-crystal',name:'수정 검',    e:'⚔️', price:130, tag:'무기'},
  {id:'shield-gold', name:'황금 방패',   e:'🛡️', price:120, tag:'방패'},
  {id:'crown',       name:'작은 왕관',   e:'👑', price:200, tag:'머리'},
  {id:'food-pet',    name:'펫 먹이',     e:'🍖', price:25,  tag:'펫', repeat:true}
];

/* ---------- 보상 계산 ---------- */
const REWARD = {
  base: 20,          // 몬스터 격파 기본 골드
  perHeart: 5,       // 남은 하트 1개당
  perfect: 15,       // 하나도 안 틀렸을 때
  boss: 100,         // 드래곤
  retryPenalty: 0.5  // 퍼즐방 거쳐서 재도전 시 배율
};

/* ---------- 포션 ---------- */
const POTIONS = {
  energy:{ id:'energy', name:'에너지 포션', e:'❤️', desc:'하트 1칸 회복' },
  time:  { id:'time',   name:'타임 포션',   e:'⏳', desc:'남은 문제 +4초' },
  hint:  { id:'hint',   name:'힌트 포션',   e:'💡', desc:'묶음 그림 보기' }
};
const POTION_MAX = 5;

/* ---------- 펫 ---------- */
const PET = {
  stages:[
    {need:0,   f:'pet-0.png', e:'🥚', label:'알'},
    {need:30,  f:'pet-1.png', e:'🐣', label:'아기 드래곤'},
    {need:120, f:'pet-2.png', e:'🐲', label:'꼬마 드래곤'}
  ],
  expPerCorrect:1
};

/* ---------- 길 위의 지점 ---------- */
const NODES = [{type:'village'}];
MONS.forEach(m=>{ NODES.push({type:'train',t:m.t}); NODES.push({type:'battle',t:m.t}); });
NODES.push({type:'boss'});
NODES.push({type:'treasure'});

/* ---------- 한글 구구단 읽기 ---------- */
const ONES=['','일','이','삼','사','오','육','칠','팔','구'];
function sino(n){
  if(n<10) return ONES[n];
  const t=Math.floor(n/10), o=n%10;
  return (t===1?'십':ONES[t]+'십')+(o?ONES[o]:'');
}
const PARTICLE={2:{1:'은',2:'는',3:'은'},3:{1:'은',3:'은'},4:{1:'은'},
                5:{1:'은'},6:{1:'은'},7:{1:'은'},8:{1:'은'},9:{1:'은'}};
function chant(a,b){
  const p=(PARTICLE[a]&&PARTICLE[a][b])||'';
  return `${ONES[a]} ${ONES[b]}${p} ${sino(a*b)}`;
}
function askText(a,b){
  const p=(PARTICLE[a]&&PARTICLE[a][b])||'';
  return `${ONES[a]} ${ONES[b]}${p}?`;
}
