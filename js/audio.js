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
    const name=`voice/${kind}-${a}-${b}.mp3`;
    return new Promise(res=>{
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
