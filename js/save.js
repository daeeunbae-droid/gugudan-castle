/* =========================================================
   save.js — 저장. 기기(localStorage)가 항상 기준이고,
   sync.js 가 설정돼 있으면 클라우드로 복사됩니다.
========================================================= */
const SAVE_KEY = 'gugudan-castle-v1';
const SAVE_VERSION = 2;

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
    progress: { pos:0, order:[ (typeof FIRST_TABLE!=='undefined' ? FIRST_TABLE : 2) ],
                cleared:[], trained:[], difficulty:'easy', started:false },
    wallet:   { gold:0 },
    potions:  { energy:0, time:0, hint:0 },
    items:    [],                 // 획득/구매한 아이템 id
    equipped: {},                 // {머리:'crown', 무기:'sword-gold'}
    pets:     blankPets(),        // 종별 { owned, exp, name }
    activePet: null,              // 지금 데리고 다니는 종 id (한 마리만)
    facts:    {},                 // "7x8": {seen, wrong}
    stats:    { correct:0, wrong:0, plays:0 },
    settings: { sfx:true, music:true, voice:true },
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
    return !!(S.progress && S.progress.started);
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
  // 누락 필드 채우기 (구버전 저장이 들어와도 죽지 않도록)
  for(const k of Object.keys(base)){
    if(d[k]===undefined) d[k]=base[k];
    else if(base[k] && typeof base[k]==='object' && !Array.isArray(base[k])){
      d[k] = Object.assign({}, base[k], d[k]);
    }
  }
  /* 순서 자유화 이전에 저장된 기록은 2~9단 순서대로 진행 중이었습니다 */
  if(!Array.isArray(d.progress.order) || !d.progress.order.length){
    d.progress.order = [2,3,4,5,6,7,8,9];
  }
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
