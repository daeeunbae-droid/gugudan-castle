/* =========================================================
   battle.js — 몬스터 대결 · 퍼즐방(보충훈련) · 보상
========================================================= */
let B={};

const Battle = {

  start(mon, isRetry){
    const d=DIFF[Save.s.progress.difficulty];
    const boss = mon.t==='boss';
    const replay = Save.run().cleared.includes(mon.t);
    B={
      mon, isRetry:!!isRetry, replay,
      hearts:d.hearts, correct:0, wrong:0, buf:'', locked:false,
      qid:0, pending:shuffle([1,2,3,4,5,6,7,8,9]), retry:[],
      solved:new Set(), missed:new Set(),
      tableOf:{}, q:null,
      /* 퍼즐방을 거쳐 돌아온 재대결은 시간 제한 없음 */
      limit: isRetry ? 0 : (d.time ? (boss ? Math.max(4,d.time-1) : d.time) : 0),
      bonus:0, hint:false
    };
    $('mobart').className='mobart';
    $('mobart').innerHTML=artHTML(monsterArt(mon),mon.e,'');
    $('mobname').textContent=mon.name;
    $('bt-diff').textContent=d.emoji+' '+d.name+(isRetry?' · 재대결':'');
    this.buildPad();
    this.nextQ();
    show('s-battle');
  },

  buildPad(){
    let h='';
    ['1','2','3','4','5','6','7','8','9','⌫','0','확인'].forEach(k=>{
      h+=`<button class="key${k==='확인'?' ok':(k==='⌫'?' del':'')}"
             onclick="Battle.press('${k}')">${k}</button>`;
    });
    $('pad').innerHTML=h;
  },

  nextQ(){
    let b;
    if(B.pending.length)      b=B.pending.shift();
    else if(B.retry.length)   b=B.retry.shift();
    else { this.win(); return; }

    const mixed = (B.mon.t==='boss') || Save.s.progress.difficulty==='hard';
    const a = (B.mon.t==='boss') ? 2+Math.floor(Math.random()*8)
            : (mixed && Math.random()<.35 ? 2+Math.floor(Math.random()*8) : B.mon.t);
    B.tableOf[b]=a;
    B.q={a,b,ans:a*b}; B.buf=''; B.hint=false; B.qid++;

    $('qtext').textContent=`${a} × ${b} = ?`;
    $('taunt').textContent=B.mon.taunt[Math.floor(Math.random()*B.mon.taunt.length)];
    $('fb').textContent='';
    $('hintbox').innerHTML='';
    /* 힌트를 보느라 아래로 내려가 있어도 새 문제는 맨 위부터 보이게 */
    $('bt-scroll').scrollTop=0;
    this.render();
    const myId=B.qid;
    Voice.play('ask',a,b).then(()=>{ if(B.qid===myId && !B.locked) this.startTimer(); });
  },

  /* ---------- 시간 제한 ---------- */
  startTimer(){
    this.stopTimer();
    const total=(B.limit+B.bonus)*1000;
    const wrap=$('timerwrap'), bar=$('timerbar');
    if(!B.limit){ wrap.style.display='none'; return; }
    wrap.style.display='block'; bar.style.width='100%';
    let left=total;
    this._t=setInterval(()=>{
      left-=100;
      bar.style.width=Math.max(0,left/total*100)+'%';
      bar.classList.toggle('danger', left<total*.3);
      if(left<=2000 && left%1000<100) tickSfx();
      if(left<=0){
        this.stopTimer(); B.locked=true;
        this.miss(`시간 초과! 정답은 ${B.q.ans}`);
      }
    },100);
  },
  stopTimer(){ if(this._t){ clearInterval(this._t); this._t=null; } },

  /* ---------- 입력 ---------- */
  press(k){
    if(B.locked) return;
    if(k==='⌫'){ B.buf=B.buf.slice(0,-1); this.render(); return; }
    if(k==='확인'){ this.submit(); return; }
    if(B.buf.length<2){ B.buf+=k; beep(660,.04,'square',.03); this.render(); }
  },

  submit(){
    if(!B.buf) return;
    this.stopTimer();
    const ok = parseInt(B.buf,10)===B.q.ans;
    B.locked=true;
    if(ok){
      Save.fact(B.q.a,B.q.b,true);
      B.correct++; B.solved.add(B.q.b); B.missed.delete(B.q.b);
      $('fb').textContent='명중!';
      const m=$('mobart'); m.classList.add('hit');
      setTimeout(()=>m.classList.remove('hit'),320);
      ding(); Voice.play('ans',B.q.a,B.q.b);
      this.render();
      setTimeout(()=>{ B.locked=false; this.nextQ(); },700);
    }else{
      this.miss(`아쉬워요 — 정답은 ${B.q.ans}`);
    }
  },

  /* 오답/시간초과 공통 — 바로 다시 내지 않고 대기열 맨 뒤로 */
  miss(msg){
    B.wrong++; B.hearts--;
    B.missed.add(B.q.b);
    B.retry.push(B.q.b);
    Save.fact(B.q.a,B.q.b,false);
    $('fb').textContent=msg;
    buzz(); this.render();
    setTimeout(()=>{
      B.locked=false;
      if(B.hearts<=0){ this.jail(); return; }
      this.nextQ();
    },1500);
  },

  /* ---------- 포션 ---------- */
  usePotion(kind){
    const s=Save.s;
    if(s.potions[kind]<=0) return;
    if(kind==='energy'){
      if(B.hearts>=DIFF[s.progress.difficulty].hearts) return;
      B.hearts++;
    }
    if(kind==='time'){
      if(!B.limit) return;
      B.bonus+=4; this.startTimer();
    }
    if(kind==='hint'){
      B.hint=true;
      $('hintbox').innerHTML=`<div class="frame ${Train.sizeClass(B.q.ans)}">`
        + Train.frameHTML(B.q.a, B.q.ans) + `</div>`
        + `<div class="hintnote">${B.q.a}씩 ${B.q.b}묶음</div>`;
    }
    Save.potion(kind,-1); glug(); this.render();
  },

  render(){
    const d=DIFF[Save.s.progress.difficulty];
    let h='';
    for(let i=0;i<d.hearts;i++) h+=`<span>${i<B.hearts?'❤️':'🖤'}</span>`;
    $('hearts').innerHTML=h;

    let p='';
    Object.values(POTIONS).forEach(x=>{
      const n=Save.s.potions[x.id];
      const dis = n<=0
        || (x.id==='energy' && B.hearts>=d.hearts)
        || (x.id==='time'   && !B.limit)
        || (x.id==='hint'   && B.hint);
      p+=`<button class="potionbtn" ${dis?'disabled':''}
            onclick="Battle.usePotion('${x.id}')">${x.e}<i>${n}</i></button>`;
    });
    $('potions').innerHTML=p;

    const a=$('ansbox');
    a.textContent=B.buf||'?'; a.classList.toggle('empty',!B.buf);

    let pips='';
    for(let i=1;i<=9;i++){
      let c='pip';
      if(B.solved.has(i)) c+=' ok'; else if(B.missed.has(i)) c+=' bad';
      if(B.q&&B.q.b===i) c+=' now';
      pips+=`<div class="${c}">×${i}</div>`;
    }
    $('pips').innerHTML=pips;
  },

  /* ---------- 승리 ---------- */
  win(){
    this.stopTimer();
    $('mobart').classList.add('dead');
    fanfare();
    const s=Save.s, d=DIFF[s.progress.difficulty], boss=B.mon.t==='boss';

    let gold = boss ? REWARD.boss
             : REWARD.base + B.hearts*REWARD.perHeart + (B.wrong===0?REWARD.perfect:0);
    gold = Math.round(gold * d.gold
           * ((B.isRetry||B.replay) ? REWARD.retryPenalty : 1));

    const drop = DROPS[B.mon.t];
    const run = Save.run();
    if(!run.cleared.includes(B.mon.t)) run.cleared.push(B.mon.t);
    Save.addItem(drop.id);
    if(boss){ Save.grantPet('dragon'); }   /* 드래곤도 알로 받아서 부화시킵니다 */
    Save.gold(gold);
    commit(true);

    setTimeout(()=>{
      $('rs-art').innerHTML=artHTML('win.png','🎉','');
      $('rs-title').textContent=B.mon.name+' 격파!';
      $('rs-sub').innerHTML = boss
        ? '드래곤이 쓰러졌다! 보물 상자가 열린다.'
        : (B.mon.t+'단 통과!'+((B.isRetry||B.replay)?' (다시 도전이라 골드 절반)':''));
      $('rs-reward').innerHTML =
        `<div class="rw"><span>🪙</span><b>+${gold}</b><small>골드</small></div>
         <div class="rw"><span>${drop.e}</span><b>획득</b><small>${drop.name}</small></div>`;
      $('rs-correct').textContent=B.correct;
      $('rs-wrong').textContent=B.wrong;
      $('rs-hearts').textContent=B.hearts;
      /* 다음 자리에 어떤 단이 들어갈지 아직 안 골랐다면 고르러 보냅니다 */
      const node = NODES[Save.run().pos];
      const slot = node && typeof node.slot==='number' ? node.slot : -1;
      const needPick = slot>=0 && slot+1 < SLOT_COUNT
                       && Save.run().order.length === slot+1;
      $('rs-btn').textContent = boss ? '보물 상자로' : (needPick ? '다음 길 고르기' : '다음 길로');
      $('rs-btn').onclick = needPick
        ? ()=>Choose.open()
        : ()=>{ show('s-map'); setTimeout(()=>Map.walkTo(Save.run().pos+1),400); };
      show('s-result'); confetti();
    },800);
  },

  /* ---------- 패배 → 퍼즐방 ---------- */
  jail(){
    this.stopTimer(); failSfx();
    const facts=[...B.missed].map(b=>({a:B.tableOf[b]||B.mon.t, b}));
    if(!facts.length) facts.push({a:B.mon.t,b:1+Math.floor(Math.random()*9)});
    Jail.enter(B.mon, facts.slice(0,5));
  }
};

/* =========================================================
   퍼즐방 — 틀린 문제만 짧게. 시간 제한 없음. 벌이 아니라 도움.
========================================================= */
const Jail = {
  mon:null, list:[], i:0, buf:'', locked:false,

  enter(mon,list){
    this.mon=mon; this.list=list; this.i=0; this.buf=''; this.locked=false;
    $('jl-mon').innerHTML=artHTML(monsterArt(mon),mon.e,'');
    $('jl-title').textContent=mon.name+'의 퍼즐방';
    let h='';
    ['1','2','3','4','5','6','7','8','9','⌫','0','확인'].forEach(k=>{
      h+=`<button class="key${k==='확인'?' ok':(k==='⌫'?' del':'')}"
             onclick="Jail.press('${k}')">${k}</button>`;
    });
    $('jl-pad').innerHTML=h;
    this.draw();
    show('s-jail');
  },

  draw(){
    const f=this.list[this.i];
    $('jl-count').textContent=`${this.i+1} / ${this.list.length}`;
    $('jl-eq').textContent=`${f.a} × ${f.b} = ?`;
    $('jl-chant').textContent=chant(f.a,f.b);
    const JF=$('jl-frame');
    JF.className='frame '+Train.sizeClass(f.a*f.b);
    JF.innerHTML=Train.frameHTML(f.a, f.a*f.b);
    $('jl-decomp').innerHTML=Train.decompHTML(f.a*f.b);
    $('jl-ans').textContent='?'; $('jl-ans').classList.add('empty');
    $('jl-fb').textContent='';
    /* 새 문제는 맨 위(식·프레임)부터 보이게 */
    $('jl-scroll').scrollTop=0;
    this.buf='';
  },

  press(k){
    if(this.locked) return;
    if(k==='⌫'){ this.buf=this.buf.slice(0,-1); this.paint(); return; }
    if(k==='확인'){ this.submit(); return; }
    if(this.buf.length<2){ this.buf+=k; beep(660,.04,'square',.03); this.paint(); }
  },
  paint(){
    const a=$('jl-ans');
    a.textContent=this.buf||'?'; a.classList.toggle('empty',!this.buf);
  },
  submit(){
    if(!this.buf) return;
    const f=this.list[this.i];
    const ok=parseInt(this.buf,10)===f.a*f.b;
    this.locked=true;
    if(ok){
      ding(); $('jl-fb').textContent='좋아요!';
      setTimeout(()=>{
        this.locked=false; this.i++;
        if(this.i>=this.list.length) this.done(); else this.draw();
      },600);
    }else{
      buzz(); $('jl-fb').textContent=`그림을 다시 보세요 — 정답은 ${f.a*f.b}`;
      setTimeout(()=>{ this.locked=false; this.buf=''; this.paint(); $('jl-fb').textContent=''; },1600);
    }
  },
  done(){
    chime();
    $('rs-art').innerHTML=artHTML('win.png','🔓','');
    $('rs-title').textContent='퍼즐방 탈출!';
    $('rs-sub').textContent='틀렸던 문제를 모두 익혔어요. 이번 재대결은 시간 제한이 없습니다.';
    $('rs-reward').innerHTML='';
    $('rs-correct').textContent=this.list.length;
    $('rs-wrong').textContent=0;
    $('rs-hearts').textContent=DIFF[Save.s.progress.difficulty].hearts;
    $('rs-btn').textContent='다시 도전!';
    $('rs-btn').onclick=()=>Battle.start(this.mon, true);
    show('s-result');
  }
};
