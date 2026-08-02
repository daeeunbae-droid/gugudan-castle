/* =========================================================
   challenge.js — 도전 모드 (성을 깬 뒤 반복 복습 + 골드 벌이)

   Battle 과 일부러 분리했습니다. 여기에는 하트도, 시간 제한도,
   퍼즐방도, 아이템 드랍도 없습니다. 20문제를 쭉 풀고
   맞힌 만큼 골드를 받는 것이 전부입니다.
   틀린 문제를 대기열 뒤로 보내는 규칙은 Battle 전용이라 쓰지 않습니다.

   몬스터는 '연출'로만 나옵니다. 문제의 단에 맞는 몬스터를 MONS 에서
   찾아 보여주고, 맞히면 흔들립니다. 체력도 승패도 없습니다.
========================================================= */
const Challenge = {
  COUNT: 20,
  goldPer: 5,          // 정답 1개당
  perfectBonus: 20,    // 20문제 만점 보너스

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
    $('cq-mode').textContent=m.e+' '+m.name;
    this.buildPad();
    this.draw();
    show('s-cq');
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
    let gold = this.correct*this.goldPer;
    if(this.correct===this.list.length) gold += this.perfectBonus;
    return gold;
  },

  finish(){
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
  }
};
