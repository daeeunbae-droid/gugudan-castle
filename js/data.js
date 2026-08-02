/* =========================================================
   data.js — 게임 데이터. 밸런스는 대부분 여기만 고치면 됩니다.
========================================================= */

/* ---------- 난이도 ---------- */
const DIFF = {
  easy:   { id:'easy',   name:'용사',   emoji:'🌱', time:0,  hearts:3, gold:1.0,
            desc:'시간 제한 없음 · 천천히 생각해도 돼요' },
  normal: { id:'normal', name:'마스터', emoji:'⚔️', time:8,  hearts:3, gold:1.5,
            desc:'문제당 8초 · 골드 1.5배 · 몬스터가 강해져요' },
  hard:   { id:'hard',   name:'레전드', emoji:'👑', time:5,  hearts:3, gold:2.2,
            desc:'문제당 5초 · 골드 2.2배 · 단이 섞여 나와요' }
};

/* ---------- 몬스터 (단별) ----------
   f      : 용사(easy) 난이도 그림
   champF : 마스터·레전드에서 쓰는 강해진 모습                        */
const MONS = [
  {t:2, f:'mon-2.png', champF:'mon-2-champion.png', e:'👾', name:'말랑 슬라임',   taunt:['두 배로 늘어난다!','물렁물렁 공격!']},
  {t:3, f:'mon-3.png', champF:'mon-3-champion.png', e:'🦇', name:'밤하늘 박쥐',   taunt:['세 마리씩 날아간다!','어둠 속이다!']},
  {t:4, f:'mon-4.png', champF:'mon-4-champion.png', e:'🕷️', name:'그물 거미',     taunt:['네 칸 거미줄이다!','걸려들었군!']},
  {t:5, f:'mon-5.png', champF:'mon-5-champion.png', e:'🐺', name:'달빛 늑대',     taunt:['다섯 걸음마다 짖는다!','아우우우!']},
  {t:6, f:'mon-6.png', champF:'mon-6-champion.png', e:'🗿', name:'바위 골렘',     taunt:['여섯 개의 돌이다!','부서지지 않는다!']},
  {t:7, f:'mon-7.png', champF:'mon-7-champion.png', e:'🧙', name:'안개 마법사',   taunt:['일곱 개의 주문!','안개 속으로!']},
  {t:8, f:'mon-8.png', champF:'mon-8-champion.png', e:'💀', name:'해골 기사',     taunt:['여덟 개의 갈비뼈!','덜그럭덜그럭!']},
  {t:9, f:'mon-9.png', champF:'mon-9-champion.png', e:'🐂', name:'미노타우로스', taunt:['아홉 번 땅을 구른다!','뿔을 조심해!']}
];
const BOSS = {t:'boss', f:'mon-boss.png', champF:'mon-boss-champion.png', e:'🐉',
              name:'구구단 드래곤',
              taunt:['2단부터 9단까지 전부다!','보물은 못 가져간다!']};

/* 난이도별 몬스터 그림 — 그림을 가져오는 곳은 전부 이 함수를 씁니다.
   레전드 전용 그림을 쓰기로 하면 MONS 에 legendF 를 넣고
   아래 한 줄만 풀면 됩니다:
       if(tier==='hard' && mon.legendF) return mon.legendF;          */
function monsterArt(mon, tierId){
  const tier = tierId || (Save.s.progress && Save.s.progress.difficulty) || 'easy';
  if(tier==='easy') return mon.f;
  return mon.champF || mon.f;
}

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

/* ---------- 펫 ----------
   4종 모두 "알"로 받아서 같은 방식으로 부화합니다.
   알 그림은 종에 상관없이 하나를 같이 씁니다.
   파일명만 적습니다 — artHTML() 이 앞에 img/ 를 붙여 줍니다.       */
const PET = {
  eggF:'pet-egg.png', eggE:'🥚',
  stages:[
    {need:0,   label:'알'},
    {need:30,  label:'아기'},
    {need:120, label:'다 자란'}
  ],
  expPerCorrect:1,
  foodExp:15          // 펫 먹이 1개로 오르는 경험치
};

const PET_SPECIES = {
  dragon:{ id:'dragon', name:'드래곤',  f1:'pet-dragon-1.png', f2:'pet-dragon-2.png',
           e1:'🐣', e2:'🐲', source:'boss' },
  cat:   { id:'cat',    name:'고양이',  f1:'pet-cat-1.png',    f2:'pet-cat-2.png',
           e1:'🐱', e2:'🐈', source:'shop', price:180 },
  dog:   { id:'dog',    name:'강아지',  f1:'pet-dog-1.png',    f2:'pet-dog-2.png',
           e1:'🐶', e2:'🐕', source:'shop', price:180 },
  lizard:{ id:'lizard', name:'도마뱀',  f1:'pet-lizard-1.png', f2:'pet-lizard-2.png',
           e1:'🦎', e2:'🐊', source:'shop', price:180 }
};

/* ---------- 단을 고를 때 보여줄 힌트 (lv 낮을수록 쉬움 → 위에 표시) ---------- */
const TABLE_TIP = {
  2:{lv:1, tip:'가장 쉬워요 · 두 배씩'},
  5:{lv:1, tip:'끝자리가 5, 0만 나와요'},
  4:{lv:2, tip:'2단을 두 번 하면 4단'},
  9:{lv:2, tip:'끝자리가 9,8,7… 거꾸로'},
  3:{lv:3, tip:'조금 익숙해졌다면'},
  6:{lv:3, tip:'3단의 두 배'},
  8:{lv:4, tip:'4단의 두 배'},
  7:{lv:5, tip:'제일 어려워요 · 도전!'}
};

/* ---------- 길 위의 지점 ----------
   자리(slot)는 8칸 고정이고, 어떤 단이 들어갈지는 아이가 그때그때 고릅니다. */
const SLOT_COUNT = 8;
const FIRST_TABLE = 2;                    // 첫 자리는 2단 고정 (가장 쉬운 입구)
const NODES = [{type:'village'}];
for(let i=0;i<SLOT_COUNT;i++){
  NODES.push({type:'train', slot:i});
  NODES.push({type:'battle', slot:i});
}
NODES.push({type:'boss'});
NODES.push({type:'treasure'});

/* 이 자리에 배정된 단. 아직 안 골랐으면 undefined */
function tableAt(slot){ return Save.run().order[slot]; }
/* 아직 안 고른 단들 */
function remainingTables(){
  const done = Save.run().order;
  return MONS.map(m=>m.t).filter(t=>!done.includes(t))
             .sort((a,b)=>TABLE_TIP[a].lv - TABLE_TIP[b].lv);
}

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
