/* =========================================================
   audio.js — 효과음 / 훈련소 음악 / 몬스터 음성
========================================================= */
let ac=null;
function ctx(){ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); return ac; }
function sfxOn(){ return Save.s.settings.sfx; }

function beep(f,d,type,vol){
  if(!sfxOn()) return;
  try{
    const c=ctx(), o=c.createOscillator(), g=c.createGain();
    o.type=type||'square'; o.frequency.value=f;
    g.gain.setValueAtTime(vol||.06,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+d);
  }catch(e){}
}
const ding    = ()=>{ beep(880,.09,'square',.05); setTimeout(()=>beep(1320,.13,'square',.05),80); };
const buzz    = ()=>beep(160,.22,'sawtooth',.06);
const glug    = ()=>{ beep(420,.08,'sine',.06); setTimeout(()=>beep(620,.12,'sine',.06),90); };
const chime   = ()=>[660,880,1100].forEach((f,i)=>setTimeout(()=>beep(f,.14,'triangle',.05),i*110));
const fanfare = ()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.18,'square',.05),i*130));
const failSfx = ()=>[400,330,260].forEach((f,i)=>setTimeout(()=>beep(f,.2,'sawtooth',.05),i*150));
const coinSfx = ()=>[1046,1318].forEach((f,i)=>setTimeout(()=>beep(f,.1,'square',.045),i*70));
const tickSfx = ()=>beep(700,.03,'square',.025);

/* ---------- 몬스터 음성 ----------
   voice/ask-2-3.mp3 같은 파일이 있으면 그걸 쓰고,
   없으면 기기 음성으로 읽습니다. (파일 우선)               */
const Voice = {
  cache:{},
  enabled(){ return Save.s.settings.voice; },

  play(kind,a,b){
    if(!this.enabled()) return Promise.resolve();
    /* 문제 읽기 음성이 나가는 동안은 배경음악을 살짝 줄였다가, 끝나면 되돌립니다. */
    if(typeof Bgm!=='undefined') Bgm.duck();
    const name=`voice/${kind}-${a}-${b}.mp3`;
    return new Promise(resolve=>{
      const res=()=>{ if(typeof Bgm!=='undefined') Bgm.restore(); resolve(); };
      let au=this.cache[name];
      if(au===false) return this.tts(kind,a,b,res);
      if(!au){
        au=new Audio(name);
        au.onerror=()=>{ this.cache[name]=false; this.tts(kind,a,b,res); };
        this.cache[name]=au;
      }
      au.onended=res;
      const p=au.play();
      if(p&&p.catch) p.catch(()=>{ this.cache[name]=false; this.tts(kind,a,b,res); });
    });
  },

  tts(kind,a,b,done){
    if(!('speechSynthesis' in window)){ done&&done(); return; }
    try{
      speechSynthesis.cancel();
      const text = kind==='ask' ? askText(a,b) : sino(a*b)+'!';
      const u=new SpeechSynthesisUtterance(text);
      u.lang='ko-KR'; u.rate=kind==='ask'?.9:1.0; u.pitch=kind==='ask'?.8:1.5;
      const v=speechSynthesis.getVoices().find(x=>/ko/i.test(x.lang));
      if(v) u.voice=v;
      u.onend=()=>done&&done();
      u.onerror=()=>done&&done();
      speechSynthesis.speak(u);
    }catch(e){ done&&done(); }
  },
  stop(){ try{ speechSynthesis.cancel(); }catch(e){} }
};

/* ---------- 훈련소 배경 음악 (칩튠) ---------- */
const TUNE={ bpm:100,
  lead:['G4','C5','E5','C5','G4','C5','E5','G5','F5','E5','D5','C5','D5','E5','C5','R',
        'A4','D5','F5','D5','A4','D5','F5','A5','G5','F5','E5','D5','C5','R','G4','R'],
  bass:['C3','C3','G2','G2','F2','F2','C3','C3','D3','D3','A2','A2','G2','G2','C3','C3']};
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function hz(n){
  if(n==='R') return 0;
  const oct=parseInt(n.slice(-1),10);
  return 440*Math.pow(2,(((oct+1)*12+SEMI[n[0]])-69)/12);
}
function tone(f,dur,type,vol){
  if(!f) return;
  try{
    const c=ctx(),o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.value=f;
    g.gain.setValueAtTime(0,c.currentTime);
    g.gain.linearRampToValueAtTime(vol,c.currentTime+.012);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+dur);
    o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur+.02);
  }catch(e){}
}
function hatNoise(vol){
  try{
    const c=ctx(),len=Math.floor(c.sampleRate*.03);
    const buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const s=c.createBufferSource();s.buffer=buf;
    const g=c.createGain();g.gain.value=vol;
    s.connect(g).connect(c.destination);s.start();
  }catch(e){}
}
const Tune={
  on:false, step:0, timer:null,
  start(table){
    if(this.on||!Save.s.settings.music) return;
    try{ ctx().resume(); }catch(e){}
    this.on=true; this.step=0;
    this.timer=setInterval(()=>{
      const i=this.step%32;
      tone(hz(TUNE.lead[i]),.16,'square',.04);
      if(i%2===0) tone(hz(TUNE.bass[i/2]),.3,'triangle',.08); else hatNoise(.015);
      this.step++;
    },60000/TUNE.bpm/2);
    this.chant(table,1);
    const b=document.getElementById('btn-tune');
    if(b){ b.textContent='⏸ 정지'; b.classList.add('playing'); }
  },
  chant(a,i){
    if(!this.on||!('speechSynthesis' in window)) return;
    const u=new SpeechSynthesisUtterance(chant(a,i));
    u.lang='ko-KR'; u.rate=.92; u.pitch=1.4;
    const v=speechSynthesis.getVoices().find(x=>/ko/i.test(x.lang));
    if(v) u.voice=v;
    u.onend=()=>{ if(this.on) setTimeout(()=>this.chant(a,i>=9?1:i+1),420); };
    speechSynthesis.speak(u);
  },
  stop(){
    this.on=false;
    if(this.timer){ clearInterval(this.timer); this.timer=null; }
    try{ speechSynthesis.cancel(); }catch(e){}
    const b=document.getElementById('btn-tune');
    if(b){ b.textContent='▶ 노래'; b.classList.remove('playing'); }
  },
  toggle(table){ this.on ? this.stop() : this.start(table); }
};
try{ speechSynthesis.getVoices(); }catch(e){}

/* =========================================================
   Bgm — 화면별 배경음악 (2026-08-02 추가)

   구구단 암기 노래(song-2~9.mp3, 훈련소 재생 버튼)와는 완전히 별개입니다.
   훈련소 화면(s-train)에서는 이 배경음악을 잠깐 멈춰서
   위 Tune(훈련소 칩튠)과 겹치지 않게만 하고, 그 외에는 훈련소 코드를
   전혀 건드리지 않습니다.

   화면당 <audio> 하나씩 새로 만들지 않고, "지금 곡"/"다음 곡" 두 슬롯만
   두고 전환할 때만 새 Audio를 만들어 서로 페이드 크로스합니다.
========================================================= */
const BGM_FILES = {
  title:     'songs/bgm-title.mp3',
  map:       'songs/bgm-map.mp3',
  battle:    'songs/bgm-battle.mp3',
  puzzle:    'songs/bgm-puzzle.mp3',
  shop:      'songs/bgm-shop.mp3',
  dragon:    'songs/bgm-dragon.mp3',
  ending:    'songs/bgm-ending.mp3',
  challenge: 'songs/bgm-challenge.mp3'
};
/* ending만 한 번만 재생하고 나머지는 전부 반복 재생 */
const BGM_LOOP = {
  title:true, map:true, battle:true, puzzle:true,
  shop:true, dragon:true, challenge:true, ending:false
};
/* 화면 id → bgm 키. 여기 없는 화면(전투 결과·다음 단 고르기·
   갈림길·설정 등)은 일부러 비워 뒀습니다 — 지도 위에서 잠깐
   뜨는 안내성 화면이라, 재생 중이던 곡을 그대로 두는 쪽이
   화면을 옮길 때마다 음악이 계속 끊기는 것보다 자연스럽습니다.
   s-battle 은 일반전/보스전을 구분해야 해서 forScreen()에서
   따로 처리합니다(아래). s-train 도 따로 처리합니다(훈련소 칩튠과
   겹치지 않도록 잠깐 멈추기만 함). */
const SCREEN_BGM = {
  's-title':'title', 's-select':'title',
  's-map':'map',
  's-jail':'puzzle',
  's-shop':'shop',
  's-challenge':'challenge', 's-cq':'challenge', 's-cdone':'challenge',
  's-ending':'ending'
};

const Bgm = {
  cur:null, curKey:null, duckLevel:1, _trainPaused:false,

  enabled(){ return Save.s.settings.bgm!==false; },
  vol(){ const v=Save.s.settings.bgmVolume; return (typeof v==='number') ? v : .32; },

  /* 화면이 바뀔 때 core.js의 show()에서 이 하나만 호출하면 됩니다. */
  forScreen(id){
    if(id==='s-train'){                    // 훈련소는 자체 음악(Tune)을 쓰므로 잠깐 멈춤만
      if(this.cur && !this.cur.paused){ this._trainPaused=true; this.cur.pause(); }
      return;
    }
    this._trainPaused=false;
    let key;
    if(id==='s-battle'){
      /* 화면 id만으로는 일반전/보스전을 못 가르므로 실제 상태(B.mon)를 봅니다 */
      key = (typeof B!=='undefined' && B && B.mon && B.mon.t==='boss') ? 'dragon' : 'battle';
    } else {
      key = SCREEN_BGM[id];
    }
    if(key===undefined) return;            // 매핑에 없는 화면 — 재생 중인 곡 유지
    this.play(key);
  },

  play(key){
    if(!BGM_FILES[key]) return;
    if(!this.enabled()){ this.curKey=key; return; }   /* 꺼져 있으면 "다음에 켜지면 이 곡" 만 기억 */
    if(this.curKey===key && this.cur){
      if(this.cur.paused){                 /* 같은 곡이 잠깐 멈춰 있었을 뿐이면 이어서 재생 */
        const p=this.cur.play();
        if(p&&p.catch) p.catch(()=>{});
        this._fade(this.cur, this.cur.volume, this.vol()*this.duckLevel, 300);
      }
      return;                              /* 이미 같은 곡이 재생 중이면 처음부터 다시 틀지 않음 */
    }
    this._switchTo(key);
  },

  _switchTo(key){
    const old=this.cur;
    const neu=new Audio(BGM_FILES[key]);
    neu.loop = BGM_LOOP[key]!==false;
    neu.volume = 0;
    neu.onerror=()=>console.warn('BGM 파일을 불러오지 못했습니다:', BGM_FILES[key]);
    this.cur=neu; this.curKey=key;
    const target=this.vol()*this.duckLevel;
    const p=neu.play();
    if(p&&p.catch) p.catch(()=>{});        /* 자동재생 제한으로 막혀도 게임 진행에는 영향 없음 */
    this._fade(neu, 0, target, 500);
    if(old) this._fade(old, old.volume, 0, 500, ()=>old.pause());
  },

  _fade(audio, from, to, ms, done){
    const t0=(typeof performance!=='undefined'?performance.now():Date.now());
    const step=()=>{
      const now=(typeof performance!=='undefined'?performance.now():Date.now());
      const k=Math.min(1,(now-t0)/ms);
      try{ audio.volume = from+(to-from)*k; }catch(e){}
      if(k<1) requestAnimationFrame(step); else if(done) done();
    };
    requestAnimationFrame(step);
  },

  stop(){
    const old=this.cur; this.cur=null; this.curKey=null;
    if(old) this._fade(old, old.volume, 0, 300, ()=>old.pause());
  },
  pause(){ if(this.cur && !this.cur.paused) this.cur.pause(); },
  resume(){ if(this.curKey) this.play(this.curKey); },

  /* 몬스터 음성(Voice)이 나가는 동안만 살짝 줄였다가 되돌립니다.
     훈련소 암기 노래 쪽에는 절대 연결하지 않습니다. */
  duck(){
    if(!this.cur) return;
    this.duckLevel=.4;
    this._fade(this.cur, this.cur.volume, this.vol()*this.duckLevel, 250);
  },
  restore(){
    if(!this.cur) return;
    this.duckLevel=1;
    this._fade(this.cur, this.cur.volume, this.vol(), 300);
  },

  setVolume(v){
    v=Math.max(0,Math.min(1,v));
    Save.s.settings.bgmVolume=v; commit();
    if(this.cur) this.cur.volume = v*this.duckLevel;
  },
  setEnabled(b){
    Save.s.settings.bgm=b; commit();
    if(!b) this.stop();
    else if(typeof curScreen!=='undefined') this.forScreen(curScreen);
  }
};

/* 탭을 숨기면 멈추고, 다시 보이면(음악 설정이 켜져 있을 때만) 이어서 재생 */
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) Bgm.pause();
  else if(Bgm.enabled()) Bgm.resume();
});

/* 브라우저 자동재생 제한 — 첫 클릭/터치 이후에 현재 화면에 맞는 곡을 한 번 더 시도합니다.
   이미 재생 중이면 play() 안에서 자동으로 아무 일도 하지 않습니다. */
(function(){
  let unlocked=false;
  function unlock(){
    if(unlocked) return; unlocked=true;
    try{ ctx().resume(); }catch(e){}
    if(typeof curScreen!=='undefined') Bgm.forScreen(curScreen);
  }
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev, unlock, {once:true}));
})();
