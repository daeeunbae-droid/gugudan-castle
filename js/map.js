/* =========================================================
   map.js — 꼬불꼬불한 길 · 지점 · 캐릭터 이동 · 펫 따라다니기
========================================================= */
const VB={w:360,h:1620};

const Map = {
  road:null, len:0, pos:[], walking:false,

  build(){
    const N=10, bot=1550, top=70, cx=180, amp=105, pts=[];
    for(let i=0;i<=N;i++){
      const y=bot-(bot-top)*i/N, side=(i%2===0?-1:1), k=(i===0||i===N)?.2:1;
      pts.push({x:cx+amp*side*k, y});
    }
    let d=`M ${pts[0].x} ${pts[0].y}`;
    for(let i=1;i<=N;i++){
      const p0=pts[i-1], p1=pts[i], my=(p0.y+p1.y)/2;
      d+=` C ${p0.x} ${my} ${p1.x} ${my} ${p1.x} ${p1.y}`;
    }
    this.road=$('road'); this.road.setAttribute('d',d);
    $('road2').setAttribute('d',d);
    this.len=this.road.getTotalLength();
    this.pos=NODES.map((_,i)=>{
      const L=this.len*i/(NODES.length-1), p=this.road.getPointAtLength(L);
      return {x:p.x, y:p.y, L};
    });
    this.refresh();
  },

  meta(n){
    if(n.type==='village')  return {f:'village.png',  e:'🏡', label:'출발'};
    if(n.type==='treasure') return {f:'treasure.png', e:'🎁', label:'보물'};
    if(n.type==='boss')     return {f:BOSS.f,         e:BOSS.e, label:'드래곤'};
    const t = tableAt(n.slot);
    if(!t) return {f:'', e:'❔', label:'???'};          // 아직 안 고른 자리
    if(n.type==='train') return {f:'camp.png', e:'⛺', label:t+'단 훈련소'};
    const m=MONS.find(x=>x.t===t);
    return {f:m.f, e:m.e, label:m.name};
  },

  refresh(){
    const P=Save.s.progress;
    const box=$('nodes'); if(!box) return;
    box.innerHTML='';
    NODES.forEach((n,i)=>{
      const meta=this.meta(n), p=this.pos[i];
      const d=document.createElement('div');
      d.className='node '+(i<=P.pos ? 'done' : (i===P.pos+1 ? 'here' : 'locked'));
      d.style.left=(p.x/VB.w*100)+'%';
      d.style.top =(p.y/VB.h*100)+'%';
      d.innerHTML=artHTML(meta.f,meta.e,'art')+`<div class="lbl">${meta.label}</div>`;
      const replayable = i<P.pos && (n.type==='battle'||n.type==='boss');
      if(i===P.pos+1 || replayable){
        d.onclick=()=>this.walkTo(i);
        if(replayable) d.classList.add('replay');
      }
      box.appendChild(d);
    });
    this.place(this.pos[P.pos]);
    this.drawWalker();
    const nxt=NODES[P.pos+1];
    $('hint').textContent = nxt
      ? (nxt.type==='train' ? '훈련소로 이동하세요'
        : nxt.type==='treasure' ? '보물 상자를 여세요' : '몬스터에게 도전하세요')
      : '';
    this.scroll();
  },

  drawWalker(){
    const s=Save.s;
    $('walker').innerHTML = (s.player.photo && s.player.photoHero===s.player.hero)
      ? `<img src="${s.player.photo}" style="border-radius:50%">`
      : artHTML('hero-'+s.player.hero+'.png', s.player.hero==='girl'?'🧝':'🧑','');
    const petEl=$('pet');
    const art=Save.petArt();          /* 데리고 다니는 펫 기준 */
    if(!art){ petEl.style.display='none'; }
    else{
      petEl.style.display='block';
      petEl.innerHTML=artHTML(art.f,art.e,'');
    }
  },

  place(p){
    $('walker').style.left=(p.x/VB.w*100)+'%';
    $('walker').style.top =(p.y/VB.h*100)+'%';
    const petL=Math.max(0,(this.pos[Save.s.progress.pos]||p).L-46);
    const q=this.road.getPointAtLength(petL);
    $('pet').style.left=(q.x/VB.w*100)+'%';
    $('pet').style.top =(q.y/VB.h*100)+'%';
  },

  scroll(){
    const sc=$('mapscroll'), wrap=$('mapwrap');
    const y=this.pos[Save.s.progress.pos].y/VB.h*wrap.offsetHeight;
    sc.scrollTo({top:Math.max(0,y-sc.clientHeight*.62), behavior:'smooth'});
  },

  walkTo(target){
    if(this.walking) return;
    this.walking=true;
    const w=$('walker'); w.classList.add('step');
    const P=Save.s.progress;
    const from=this.pos[P.pos].L, to=this.pos[target].L;
    const dur=Math.max(600,Math.abs(to-from)*4);
    const t0=performance.now();
    const sc=$('mapscroll'), wrap=$('mapwrap');
    let lastTick=0;
    const frame=now=>{
      const k=Math.min(1,(now-t0)/dur), L=from+(to-from)*k;
      const p=this.road.getPointAtLength(L);
      $('walker').style.left=(p.x/VB.w*100)+'%';
      $('walker').style.top =(p.y/VB.h*100)+'%';
      const q=this.road.getPointAtLength(Math.max(0,L-46));
      $('pet').style.left=(q.x/VB.w*100)+'%';
      $('pet').style.top =(q.y/VB.h*100)+'%';
      sc.scrollTop=Math.max(0,p.y/VB.h*wrap.offsetHeight - sc.clientHeight*.62);
      if(k-lastTick>.13){ lastTick=k; beep(300+Math.random()*80,.03,'triangle',.02); }
      if(k<1) requestAnimationFrame(frame);
      else{
        w.classList.remove('step'); this.walking=false;
        P.pos=target; commit();
        this.refresh(); this.arrive(NODES[target]);
      }
    };
    requestAnimationFrame(frame);
  },

  arrive(n){
    if(n.type==='train')         setTimeout(()=>Train.enter(tableAt(n.slot)),350);
    else if(n.type==='battle')   setTimeout(()=>Battle.start(MONS.find(m=>m.t===tableAt(n.slot))),350);
    else if(n.type==='boss')     setTimeout(()=>Battle.start(BOSS),350);
    else if(n.type==='treasure') setTimeout(()=>ending(),500);
  }
};
