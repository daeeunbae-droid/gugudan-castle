/* =========================================================
   save.js — 저장. 기기(localStorage)가 항상 기준이고,
   sync.js 가 설정돼 있으면 클라우드로 복사됩니다.
========================================================= */
const SAVE_KEY = 'gugudan-castle-v1';
const SAVE_VERSION = 3;

/* 난이도(run) 하나의 진행 상태. 세 난이도가 서로 간섭하지 않도록
   지도 위치·고른 단·클리어 기록을 난이도별로 따로 갖습니다.        */
const RUN_TIERS = ['easy','normal','hard'];
function blankRun(){
  return { pos:0,
           order:[ (typeof FIRST_TABLE!=='undefined' ? FIRST_TABLE : 2) ],
           cleared:[], trained:[], started:false };
}
function blankRuns(){
  const o={};
  RUN_TIERS.forEach(t=>{ o[t]=blankRun(); });
  return o;
}

/* 종별 펫 보유 칸을 기본값으로 만들어 둡니다 (없으면 빈 오브젝트) */
function blankPets(){
  const o={};
  if(typeof PET_SPECIES!=='undefined'){
    Object.values(PET_SPECIES).forEach(sp=>{ o[sp.id]={owned:false, exp:0, name:sp.name}; });
  }
  return o;
}

function blankSave(){
  return {
    v: SAVE_VERSION,
    player:   { name:'', hero:'girl', photo:null, photoHero:null },
    /* progress 는 이제 "지금 어느 난이도를 하고 있는지"만 가리킵니다.
       실제 진행 상태는 runs[난이도] 안에 있습니다.                 */
    progress: { difficulty:'easy' },
    runs:     blankRuns(),
    wallet:   { gold:0 },
    potions:  { energy:0, time:0, hint:0 },
    items:    [],                 // 획득/구매한 아이템 id
    equipped: {},                 // {머리:'crown', 무기:'sword-gold'}
    pets:     blankPets(),        // 종별 { owned, exp, name }
    activePet: null,              // 지금 데리고 다니는 종 id (한 마리만)
    facts:    {},                 // "7x8": {seen, wrong}
    stats:    { correct:0, wrong:0, plays:0 },
    settings: { sfx:true, music:true, voice:true, bgm:true, bgmVolume:.32 },
    familyCode: null,
    updatedAt: 0
  };
}

let S = blankSave();

/* ---------- 읽기 ---------- */
function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const d = JSON.parse(raw);
    S = migrate(d);
    return Save.anyStarted();
  }catch(e){
    console.warn('저장 읽기 실패 — 새로 시작합니다', e);
    S = blankSave();
    return false;
  }
}

/* ---------- 쓰기 (자동 저장) ---------- */
let saveTimer=null;
function commit(immediate){
  S.updatedAt = Date.now();
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
  catch(e){ console.warn('저장 실패', e); }
  clearTimeout(saveTimer);
  if(immediate){ Sync.push(S); }
  else saveTimer = setTimeout(()=>Sync.push(S), 2500);
}

/* ---------- 버전 이관 ----------
   나중에 스키마가 바뀌면 여기에 단계를 추가합니다.
   예) if(d.v===1){ d.newField = 기본값; d.v=2; }              */
function migrate(d){
  const base = blankSave();
  if(!d || typeof d!=='object') return base;
  if(!d.v) d.v = 1;
  /* v1 → v2 : 펫 한 마리(드래곤 고정) → 종별 보유 구조.
     예전 저장에서 펫을 갖고 있었다면 드래곤으로 옮기고 경험치도 유지합니다. */
  if(d.v < 2){
    const old = d.pet;
    d.pets = d.pets || {};
    if(old && old.owned){
      d.pets.dragon = { owned:true, exp:old.exp||0, name:old.name||'드래곤' };
      d.activePet = 'dragon';
    }
    delete d.pet;
    d.v = 2;
  }
  /* v2 → v3 : 진행 상태 하나(progress) → 난이도별 진행(runs).
     그동안 플레이하던 난이도 자리에 그대로 옮깁니다.
     (무조건 easy 로 넣으면 모험/챔피언으로 하던 기록이 엉뚱한 데로 갑니다) */
  if(d.v < 3){
    const p = d.progress || {};
    const tier = RUN_TIERS.includes(p.difficulty) ? p.difficulty : 'easy';
    const hadOrder = Array.isArray(p.order) && p.order.length;
    d.runs = blankRuns();
    d.runs[tier] = {
      pos:     p.pos || 0,
      /* 순서 자유화 이전 저장은 2~9단을 순서대로 걷던 기록입니다 */
      order:   hadOrder ? p.order.slice()
                        : (p.started ? [2,3,4,5,6,7,8,9] : blankRun().order),
      cleared: Array.isArray(p.cleared) ? p.cleared.slice() : [],
      trained: Array.isArray(p.trained) ? p.trained.slice() : [],
      started: !!p.started
    };
    d.progress = { difficulty: tier };
    d.v = 3;
  }
  // 누락 필드 채우기 (구버전 저장이 들어와도 죽지 않도록)
  for(const k of Object.keys(base)){
    if(d[k]===undefined) d[k]=base[k];
    else if(base[k] && typeof base[k]==='object' && !Array.isArray(base[k])){
      d[k] = Object.assign({}, base[k], d[k]);
    }
  }
  /* 세 난이도 칸이 모두 온전한지 확인 (손상된 저장이 들어와도 죽지 않도록) */
  RUN_TIERS.forEach(t=>{
    const r = Object.assign(blankRun(), d.runs[t]);
    if(!Array.isArray(r.order) || !r.order.length) r.order = blankRun().order;
    if(!Array.isArray(r.cleared)) r.cleared = [];
    if(!Array.isArray(r.trained)) r.trained = [];
    d.runs[t] = r;
  });
  if(!RUN_TIERS.includes(d.progress.difficulty)) d.progress.difficulty='easy';
  d.v = SAVE_VERSION;
  return d;
}

function resetSave(){
  const code = S.familyCode;
  S = blankSave();
  S.familyCode = code;
  commit(true);
}

/* ---------- 편의 함수 ---------- */
const Save = {
  get s(){ return S; },
  set(obj){ S = migrate(obj); },
  /* ---------- 난이도별 진행 ----------
     인자를 안 주면 "지금 하고 있는 난이도"의 진행 상태입니다.
     Save.run().pos / .order / .cleared / .trained / .started      */
  run(tier){
    const id = RUN_TIERS.includes(tier) ? tier : S.progress.difficulty;
    if(!S.runs) S.runs = blankRuns();
    if(!S.runs[id]) S.runs[id] = blankRun();
    return S.runs[id];
  },
  /* 그 난이도만 처음 상태로 되돌립니다 (다른 난이도는 그대로) */
  resetRun(tier){
    if(!RUN_TIERS.includes(tier)) return null;
    S.runs[tier] = blankRun();
    S.runs[tier].started = true;
    return S.runs[tier];
  },
  anyStarted(){
    return RUN_TIERS.some(t=>{ const r=S.runs&&S.runs[t]; return !!(r&&r.started); });
  },
  /* 도전 모드처럼 난이도 공용인 해금 조건에 씁니다 */
  anyCleared(what){
    return RUN_TIERS.some(t=>{
      const r=S.runs&&S.runs[t];
      return !!(r && r.cleared.includes(what));
    });
  },
  /* 도전 모드 난이도 연동용 — 지금까지 깬 적 있는 가장 높은 난이도.
     RUN_TIERS 는 [easy, normal, hard] 순서이므로 뒤에서부터 찾습니다.
     하나도 못 깼으면(도전 모드가 아직 안 열렸을 때) easy 를 기본값으로. */
  bestTier(){
    for(let i=RUN_TIERS.length-1;i>=0;i--){
      const t=RUN_TIERS[i], r=S.runs&&S.runs[t];
      if(r && r.cleared.includes('boss')) return t;
    }
    return 'easy';
  },
  gold(n){ S.wallet.gold = Math.max(0, S.wallet.gold + n); commit(); },
  potion(kind, n){
    S.potions[kind] = Math.max(0, Math.min(POTION_MAX, (S.potions[kind]||0)+n));
    commit();
  },
  addItem(id){ if(!S.items.includes(id)){ S.items.push(id); commit(); } },
  has(id){ return S.items.includes(id); },
  fact(a,b,ok){
    const k = a+'x'+b;
    const f = S.facts[k] || (S.facts[k]={seen:0,wrong:0});
    f.seen++; if(!ok) f.wrong++;
    if(ok) S.stats.correct++; else S.stats.wrong++;
    /* 경험치는 지금 데리고 다니는 펫에게만 쌓입니다 */
    if(ok){
      const p = this.petOf();
      if(p && p.owned) p.exp += PET.expPerCorrect;
    }
  },
  weakest(n){
    return Object.entries(S.facts)
      .filter(([,f])=>f.wrong>0)
      .sort((a,b)=> (b[1].wrong/b[1].seen) - (a[1].wrong/a[1].seen))
      .slice(0, n||5).map(([k])=>k);
  },
  /* ---------- 펫 ----------
     인자를 안 주면 "지금 데리고 다니는 펫"이 기준입니다.        */
  petOf(sp){
    const id = sp || S.activePet;
    return id ? S.pets[id] : null;
  },
  ownedPets(){
    return Object.values(PET_SPECIES).filter(sp => S.pets[sp.id] && S.pets[sp.id].owned);
  },
  petStage(sp){
    const p = this.petOf(sp);
    if(!p || !p.owned) return -1;
    let st=0;
    PET.stages.forEach((s,i)=>{ if(p.exp>=s.need) st=i; });
    return st;
  },
  /* 화면에 그릴 그림·이름. 알일 때는 종과 상관없이 같은 알 그림입니다. */
  petArt(sp){
    const id = sp || S.activePet;
    const st = this.petStage(id);
    if(st<0) return null;
    const spec = PET_SPECIES[id], stage = PET.stages[st];
    const nm = (this.petOf(id) || {}).name || spec.name;   /* 예전에 지어 준 이름을 지킵니다 */
    if(st===0) return { f:PET.eggF, e:PET.eggE, label:stage.label, name:nm };
    return { f: st>=2?spec.f2:spec.f1, e: st>=2?spec.e2:spec.e1,
             label: stage.label+' '+spec.name, name:nm };
  },
  /* 알로 지급. 데리고 다니는 펫이 없으면 자동으로 그 펫이 됩니다. */
  grantPet(sp){
    const p = S.pets[sp];
    if(!p || p.owned) return false;
    p.owned = true; p.exp = 0;
    if(!S.activePet) S.activePet = sp;
    commit(true);
    return true;
  },
  setActivePet(sp){
    if(!S.pets[sp] || !S.pets[sp].owned) return false;
    S.activePet = sp; commit();
    return true;
  }
};
