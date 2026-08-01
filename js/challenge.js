/* =========================================================
   challenge.js — 도전 모드 (성을 깬 뒤 반복 복습 + 골드 벌이)

   Battle 과 일부러 분리했습니다. 여기에는 하트도, 시간 제한도,
   퍼즐방도, 몬스터도, 아이템 드랍도 없습니다. 20문제를 쭉 풀고
   맞힌 만큼 골드를 받는 것이 전부입니다.
   틀린 문제를 대기열 뒤로 보내는 규칙은 Battle 전용이라 쓰지 않습니다.
========================================================= */
const Challenge = {
  COUNT: 20,
  goldPer: 5,          // 정답 1개당
  perfectBonus: 20,    // 20문제 만점 보너스
  weakMult: 1.5,       // '자주 틀린 문제만' 모드 배율

  MODES: [
    {id:'nine', e:'9️⃣', name:'9단만 20문제',
     desc:'9단 하나만 집중해서 연습해요'},
    {id:'all',  e:'🎲', name:'전 단 랜덤 20문제',
     desc:'2단부터 9단까지 골고루 나와요'},
    {id:'weak', e:'🎯', name:'자주 틀린 문제만',
     desc:'많이 틀린 문제부터 · 골드 1.5배'}
  ],

  /* 보스를 잡아야 열립니다 */
  unlocked(){ return Save.s.progress.cleared.includes('boss'); },

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
  buildList(mode){
    if(mode==='nine'){
      /* 1~9 를 두 바퀴 돌리고 모자란 2개는 세 번째 섞기에서 앞부터.
         같은 문제가 연달아 나올 확률을 줄이려는 것입니다.          */
      const b=[...shuffle([1,2,3,4,5,6,7,8,9]),
               ...shuffle([1,2,3,4,5,6,7,8,9]),
               ...shuffle([1,2,3,4,5,6,7,8,9]).slice(0,this.COUNT-18)];
      return b.map(x=>({a:9,b:x}));
    }
    if(mode==='weak'){
      const list=[], seen=new Set();
      Save.weakest(this.COUNT).forEach(k=>{
        const [a,b]=k.split('x').map(Number);
        if(a>=2&&a<=9&&b>=1&&b<=9&&!seen.has(k)){ seen.add(k); list.push({a,b}); }
      });
      /* 모자라면 전 단 랜덤으로 채우되 이미 뽑힌 것은 빼고 */
      if(list.length<this.COUNT){
        this.allPairs().filter(p=>!seen.has(p.a+'x'+p.b))
          .slice(0, this.COUNT-list.length)
          .forEach(p=>list.push(p));
      }
      return list.slice(0,this.COUNT);
    }
    return this.allPairs().slice(0,this.COUNT);      /* 전 단 랜덤 */
  },

  /* 2~9단 × 1~9 조합을 섞어서 돌려줍니다 */
  allPairs(){
    const all=[];
    for(let a=2;a<=9;a++) for(let b=1;b<=9;b++) all.push({a,b});
    return shuffle(all);
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

  draw(){
    const q=this.list[this.i];
    $('cq-count').textContent=`${this.i+1} / ${this.list.length}`;
    $('cq-q').textContent=`${q.a} × ${q.b} = ?`;
    $('cq-bar').style.width=(this.i/this.list.length*100)+'%';
    $('cq-fb').textContent='';
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
    if(ok){ this.correct++; ding(); $('cq-fb').textContent='좋아요!'; }
    else  { this.wrong++;   buzz(); $('cq-fb').textContent=`정답은 ${ans}`; }
    /* 틀려도 다시 묻지 않고 그냥 다음 문제로 갑니다 */
    setTimeout(()=>{
      this.locked=false; this.i++;
      if(this.i>=this.list.length) this.finish(); else this.draw();
    }, ok?600:1600);
  },

  /* ---------- 마무리 · 보상 ---------- */
  reward(){
    const per = this.mode.id==='weak' ? this.goldPer*this.weakMult : this.goldPer;
    let gold = Math.round(this.correct*per);
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
