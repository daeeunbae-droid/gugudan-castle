/* =========================================================
   challenge.js — 도전 모드 (성을 깬 뒤 반복 복습 + 골드 벌이)

   Battle 과 일부러 분리했습니다. 하트도, 퍼즐방도, 아이템 드랍도
   없습니다. 20문제를 쭉 풀고 맞힌 만큼 골드를 받는 것이 전부입니다.
   틀린 문제를 대기열 뒤로 보내는 규칙은 Battle 전용이라 쓰지 않습니다.

   2026-08-03부터: 문제당 시간 제한만은 Battle 처럼 있습니다 — 단,
   본편 난이도와 달리 "지금 선택된 난이도"가 아니라 "지금까지 깬 적
   있는 가장 높은 난이도"(Save.bestTier())를 기준으로 CHALLENGE_SCALE
   (data.js)에서 시간·골드를 가져옵니다. 하트가 없으므로 시간 초과는
   그냥 오답 처리하고 다음 문제로 넘어갑니다(탈락 없음).

   몬스터는 '연출'로만 나옵니다. 문제의 단에 맞는 몬스터를 MONS 에서
   찾아 보여주고, 맞히면 흔들립니다. 체력도 승패도 없습니다.
========================================================= */
const Challenge = {
  COUNT: 20,
  perfectBonus: 20,    // 20문제 만점 보너스 — 난이도와 무관하게 고정

  /* 세 단씩 묶은 그룹. tables × 1~9 = 27조합에서 20문제를 뽑습니다. */
  MODES: [
    {id:'g248', e:'2️⃣', tables:[2,4,8], name:'2·4·8단 랜덤 20문제',
     desc:'두 배씩 커지는 세 단을 섞어서 풀어요'},
    {id:'g356', e:'3️⃣', tables:[3,5,6], name:'3·5·6단 랜덤 20문제',
     desc:'가운데 세 단을 골고루 연습해요'},
    {id:'g789', e:'7️⃣', tables:[7,8,9], name:'7·8·9단 랜덤 20문제',
     desc:'제일 어려운 세 단에 도전!'}
  ],

  /* 보스를 잡아야 열립니다 — 도전 모드는 난이도 공용 보너스라
     세 난이도 중 하나라도 드래곤을 잡았으면 열립니다.            */
  unlocked(){ return Save.anyCleared('boss'); },

  /* ---------- 보너스 스테이지에서 자유롭게 고르기 (2026-08-03) ----------
     예전엔 g248→g356→g789 세 판을 스킵·이탈 없이 순서대로 다 마쳐야
     했지만, 이제는 보너스 스테이지 허브(Fork)에서 세 장 중 원하는 것만
     골라 풀 수 있습니다(강제 아님).
     done: "지금 이 허브 방문에서 이미 끝낸 도전"만 기억하는 배열 —
     Fork.enter() 가 허브에 새로 들어올 때마다(보물칸 재도달 등) 비웁니다.
     같은 방문 안에서는 완료한 도전을 다시 고를 수 없습니다.        */
  done: [],

  /* ---------- 모드 고르기 ---------- */
  render(){
    let h='';
    this.MODES.forEach(m=>{
      h+=`<div class="cgcard" onclick="Challenge.start('${m.id}')">
            <div class="cge">${m.e}</div>
            <div class="cgtxt"><b>${m.name}</b><em>${m.desc}</em></div>
            <div class="chgo">▶</div>
          </div>`;
    });
    $('cg-list').innerHTML=h;
  },

  /* ---------- 문제 만들기 ---------- */
  /* 그룹의 세 단 × 1~9 = 27조합을 섞어 앞에서 20개 */
  buildList(mode){
    const m=this.MODES.find(x=>x.id===mode) || this.MODES[0];
    const all=[];
    m.tables.forEach(a=>{ for(let b=1;b<=9;b++) all.push({a,b}); });
    return shuffle(all).slice(0,this.COUNT);
  },

  /* ---------- 세션 시작 ---------- */
  start(mode){
    const m=this.MODES.find(x=>x.id===mode) || this.MODES[0];
    this.mode=m;
    this.list=this.buildList(m.id);
    this.i=0; this.buf=''; this.locked=false;
    this.correct=0; this.wrong=0;
    this.scale = CHALLENGE_SCALE[Save.bestTier()] || CHALLENGE_SCALE.easy;
    const tierName = DIFF[Save.bestTier()].name;
    $('cq-mode').textContent=m.e+' '+m.name
      +(this.scale.time ? ` · ${tierName} 기준 ${this.scale.time}초` : '');
    this.buildPad();
    this.draw();
    show('s-cq');
  },

  /* ---------- 시간 제한 (Battle 과 같은 방식, 하트만 없음) ---------- */
  startTimer(){
    this.stopTimer();
    const wrap=$('cq-timerwrap'), bar=$('cq-timerbar');
    if(!this.scale.time){ if(wrap) wrap.style.display='none'; return; }
    const total=this.scale.time*1000;
    wrap.style.display='block'; bar.style.width='100%';
    let left=total;
    this._t=setInterval(()=>{
      left-=100;
      bar.style.width=Math.max(0,left/total*100)+'%';
      bar.classList.toggle('danger', left<total*.3);
      if(left<=2000 && left%1000<100) tickSfx();
      if(left<=0){
        this.stopTimer(); this.locked=true;
        this.miss(`시간 초과! 정답은 ${this.list[this.i].a*this.list[this.i].b}`);
      }
    },100);
  },
  stopTimer(){ if(this._t){ clearInterval(this._t); this._t=null; } },

  /* 시간 초과 전용 — submit() 의 오답 경로와 같은 다음 문제 이동을 합니다 */
  miss(msg){
    const q=this.list[this.i];
    Save.fact(q.a,q.b,false);
    this.wrong++; buzz(); $('cq-fb').textContent=msg;
    setTimeout(()=>{
      this.locked=false; this.i++;
      if(this.i>=this.list.length) this.finish(); else this.draw();
    }, 1600);
  },

  /* Battle·퍼즐방과 같은 12버튼 키패드 */
  buildPad(){
    let h='';
    ['1','2','3','4','5','6','7','8','9','⌫','0','확인'].forEach(k=>{
      h+=`<button class="key${k==='확인'?' ok':(k==='⌫'?' del':'')}"
             onclick="Challenge.press('${k}')">${k}</button>`;
    });
    $('cq-pad').innerHTML=h;
  },

  /* 몬스터 자리 — 전투 화면과 같은 class 를 써서 CSS 를 그대로 씁니다.
     id 만 다르게(cq-) 두고, 없으면 진행바 위에 한 번 만들어 둡니다. */
  mobArt(){
    let w=$('cq-mobwrap');
    if(!w){
      w=document.createElement('div');
      w.id='cq-mobwrap'; w.className='mobwrap';
      w.innerHTML='<div class="mobart" id="cq-mobart"></div>'
                 +'<div class="mname" id="cq-mobname"></div>';
      const scroll=$('cq-scroll');
      scroll.insertBefore(w, scroll.querySelector('.cqbar'));
    }
    return $('cq-mobart');
  },

  /* 문제의 단(a)에 해당하는 몬스터를 세웁니다 */
  drawMob(a){
    const mon=MONS.find(m=>m.t===a);
    const art=this.mobArt();
    if(!mon){ art.innerHTML=''; $('cq-mobname').textContent=''; return ''; }
    art.className='mobart';                 /* 남아 있는 hit 클래스 정리 */
    art.innerHTML=artHTML(monsterArt(mon),mon.e,'');
    $('cq-mobname').textContent=mon.name;
    return mon.taunt[Math.floor(Math.random()*mon.taunt.length)];
  },

  draw(){
    const q=this.list[this.i];
    const taunt=this.drawMob(q.a);
    $('cq-count').textContent=`${this.i+1} / ${this.list.length}`
                            +(taunt?' · '+taunt:'');
    $('cq-q').textContent=`${q.a} × ${q.b} = ?`;
    $('cq-bar').style.width=(this.i/this.list.length*100)+'%';
    $('cq-fb').textContent='';
    $('cq-scroll').scrollTop=0;
    this.buf=''; this.paint();
    this.startTimer();
  },

  paint(){
    const a=$('cq-ans');
    a.textContent=this.buf||'?';
    a.classList.toggle('empty',!this.buf);
  },

  press(k){
    if(this.locked) return;
    if(k==='⌫'){ this.buf=this.buf.slice(0,-1); this.paint(); return; }
    if(k==='확인'){ this.submit(); return; }
    if(this.buf.length<2){ this.buf+=k; beep(660,.04,'square',.03); this.paint(); }
  },

  submit(){
    if(!this.buf) return;
    this.stopTimer();
    const q=this.list[this.i];
    const ans=q.a*q.b;
    const ok=parseInt(this.buf,10)===ans;
    this.locked=true;
    Save.fact(q.a,q.b,ok);        /* 펫 경험치·오답 기록이 여기서 갱신됩니다 */
    if(ok){
      this.correct++; ding(); $('cq-fb').textContent='명중!';
      const m=$('cq-mobart');     /* 전투와 같은 흔들림 연출 */
      if(m){ m.classList.add('hit'); setTimeout(()=>m.classList.remove('hit'),320); }
    }else{
      this.wrong++; buzz(); $('cq-fb').textContent=`정답은 ${ans}`;
    }
    /* 틀려도 다시 묻지 않고 그냥 다음 문제로 갑니다 */
    setTimeout(()=>{
      this.locked=false; this.i++;
      if(this.i>=this.list.length) this.finish(); else this.draw();
    }, ok?600:1600);
  },

  /* ---------- 마무리 · 보상 ---------- */
  reward(){
    let gold = this.correct*this.scale.goldPer;
    if(this.correct===this.list.length) gold += this.perfectBonus;
    return gold;
  },

  finish(){
    this.stopTimer();
    const gold=this.reward();
    const perfect=this.correct===this.list.length;
    commit(true);
    chime(); if(perfect) confetti(40);
    $('cd-title').textContent = perfect ? '전부 맞혔어요!' : '도전 끝!';
    $('cd-sub').textContent   = this.mode.e+' '+this.mode.name
                              + (perfect ? ` · 만점 보너스 +${this.perfectBonus}` : '');
    $('cd-correct').textContent=this.correct;
    $('cd-wrong').textContent=this.wrong;
    $('cd-gold').textContent=gold;
    show('s-cdone');
    grantGold(gold);              /* 골드 지급 + 토스트 + 효과음 */
    if(!this.done.includes(this.mode.id)) this.done.push(this.mode.id);
    const box=$('cd-actions');
    if(box) box.innerHTML=`<button class="btn" onclick="Fork.open()">보너스 스테이지로 돌아가기</button>`;
  }
};
