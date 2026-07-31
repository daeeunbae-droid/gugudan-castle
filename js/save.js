/* =========================================================
   save.js — 저장. 기기(localStorage)가 항상 기준이고,
   sync.js 가 설정돼 있으면 클라우드로 복사됩니다.
========================================================= */
const SAVE_KEY = 'gugudan-castle-v1';
const SAVE_VERSION = 1;

function blankSave(){
  return {
    v: SAVE_VERSION,
    player:   { name:'', hero:'girl', photo:null },
    progress: { pos:0, cleared:[], trained:[], difficulty:'easy', started:false },
    wallet:   { gold:0 },
    potions:  { energy:0, time:0, hint:0 },
    items:    [],                 // 획득/구매한 아이템 id
    equipped: {},                 // {머리:'crown', 무기:'sword-gold'}
    pet:      { owned:false, exp:0, name:'꼬미' },
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
  // 누락 필드 채우기 (구버전 저장이 들어와도 죽지 않도록)
  for(const k of Object.keys(base)){
    if(d[k]===undefined) d[k]=base[k];
    else if(base[k] && typeof base[k]==='object' && !Array.isArray(base[k])){
      d[k] = Object.assign({}, base[k], d[k]);
    }
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
    if(ok && S.pet.owned) S.pet.exp += PET.expPerCorrect;
  },
  weakest(n){
    return Object.entries(S.facts)
      .filter(([,f])=>f.wrong>0)
      .sort((a,b)=> (b[1].wrong/b[1].seen) - (a[1].wrong/a[1].seen))
      .slice(0, n||5).map(([k])=>k);
  },
  petStage(){
    if(!S.pet.owned) return -1;
    let st=0;
    PET.stages.forEach((s,i)=>{ if(S.pet.exp>=s.need) st=i; });
    return st;
  }
};
