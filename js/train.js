/* =========================================================
   train.js — 훈련소 (10칸 프레임 + 끝자리 패턴 + 포션 선택)
========================================================= */
const Train = {
  table:2, idx:1,

  enter(t){
    this.table=t; this.idx=1;
    $('tr-title').textContent=t+'단 훈련';
    $('tr-sub').textContent='9개를 다 익히면 포션을 하나 고를 수 있어요';
    $('tr-potion').style.display='none';
    $('tr-body').style.display='';
    this.loadSong(t);
    this.draw();
    show('s-train');
  },

  /* 10칸 프레임 — 한 줄이 10. 묶음은 색으로 구분되고 줄을 넘어 이어집니다. */
  frameHTML(a,total){
    const rows=Math.max(1,Math.ceil(total/10));
    let h='';
    for(let r=0;r<rows;r++){
      const inRow=Math.min(10,Math.max(0,total-r*10));
      let cells='';
      for(let half=0;half<2;half++){
        cells+='<div class="half">';
        for(let c=0;c<5;c++){
          const i=r*10+half*5+c, on=i<total;
          cells+=`<div class="cell${on?' f g'+(Math.floor(i/a)%2):''}"${
            on?` style="animation-delay:${(i%10)*.02}s"`:''}></div>`;
        }
        cells+='</div>';
      }
      const tag = inRow===10 ? String((r+1)*10) : (r===0?String(total):'+'+inRow);
      h+=`<div class="frow"><div class="tenframe${inRow===10?' full':''}">${cells}</div>
          <div class="rowtag${inRow===10?' full':''}">${tag}</div></div>`;
    }
    return h;
  },
  /* 줄 수에 따라 점 크기를 줄이는 클래스 */
  sizeClass(total){
    const rows=Math.ceil(total/10);
    return rows>=7 ? 'r7' : (rows>=5 ? 'r5' : '');
  },

  decompHTML(total){
    const t=Math.floor(total/10), o=total%10;
    if(total<10)  return `낱개 ${total}개 → <b>${total}</b>`;
    if(o===0)     return `10이 ${t}줄 → <b>${total}</b>`;
    return `10이 ${t}줄 + 낱개 ${o}개 → <b>${total}</b>`;
  },

  draw(){
    const a=this.table, b=this.idx, total=a*b;
    $('tr-eq').textContent=`${a} × ${b} = ${total}`;
    $('tr-chant').textContent=chant(a,b);
    const F=$('tr-frame');
    F.className='frame '+this.sizeClass(total);
    F.innerHTML=this.frameHTML(a,total);
    $('tr-decomp').innerHTML=this.decompHTML(total);

    let ones='';
    for(let i=1;i<=9;i++)
      ones+=`<span class="onebox${i<b?' seen':(i===b?' now':'')}">${(a*i)%10}</span>`;
    $('tr-ones').innerHTML=ones;

    $('tr-star').innerHTML = (b===9) ? this.starSVG(a) : '';
    let dots='';
    for(let i=1;i<=9;i++) dots+=`<div class="pd${i<=b?' on':''}"></div>`;
    $('tr-dots').innerHTML=dots;
    $('tr-next').textContent = b===9 ? '훈련 완료 — 포션 고르기' : '다음';
    beep(500+b*35,.08,'triangle',.04);
  },

  /* 끝자리를 이어 만든 무늬 */
  starSVG(a){
    const R=52,cx=66,cy=66;
    const pt=d=>{ const ang=(d/10)*Math.PI*2-Math.PI/2;
      return [cx+R*Math.cos(ang), cy+R*Math.sin(ang)]; };
    let dots='';
    for(let d=0;d<10;d++){
      const [x,y]=pt(d), ang=(d/10)*Math.PI*2-Math.PI/2;
      dots+=`<circle cx="${x}" cy="${y}" r="3" fill="#6b5a99"/>`+
            `<text x="${cx+(R+11)*Math.cos(ang)}" y="${cy+(R+11)*Math.sin(ang)+4}"
                   font-size="11" fill="#9c8fc4" text-anchor="middle">${d}</text>`;
    }
    const seq=[]; for(let i=1;i<=10;i++) seq.push((a*i)%10);
    const line=seq.map((d,i)=>{ const[x,y]=pt(d); return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1); }).join(' ');
    const cyc=[]; for(let i=1;i<=10;i++){ const v=(a*i)%10; if(cyc.includes(v))break; cyc.push(v); }
    return `<div class="starwrap"><svg viewBox="0 0 132 132">${dots}
      <path d="${line}" fill="none" stroke="#ffb545" stroke-width="2" stroke-linejoin="round"/>
      </svg><div class="starnote">${a}단 끝자리: ${cyc.join(' · ')} 반복</div></div>`;
  },

  next(){
    if(this.idx<9){ this.idx++; this.draw(); return; }
    Tune.stop(); $('player').pause(); chime();
    const P=Save.s.progress;
    if(P.trained.includes(this.table)){        // 복습이면 포션 없이 통과
      show('s-map');
      setTimeout(()=>Map.walkTo(P.pos+1),400);
      return;
    }
    P.trained.push(this.table); commit();
    this.showPotionPick();
  },

  /* 포션 3종 중 하나 선택 — 고르는 행위 자체가 전략이 됩니다 */
  showPotionPick(){
    $('tr-body').style.display='none';
    const box=$('tr-potion'); box.style.display='';
    const diffNoTime = Save.s.progress.difficulty==='easy';
    let h='<h2>포션을 하나 고르세요</h2><div class="psel">';
    Object.values(POTIONS).forEach(p=>{
      const off = (p.id==='time' && diffNoTime);
      h+=`<div class="pcard${off?' off':''}" ${off?'':`onclick="Train.pick('${p.id}')"`}>
            <div class="pe">${p.e}</div><b>${p.name}</b>
            <small>${off?'연습 모드에선 필요 없어요':p.desc}</small>
            <div class="have">보유 ${Save.s.potions[p.id]}</div>
          </div>`;
    });
    h+='</div>';
    box.innerHTML=h;
  },
  pick(kind){
    Save.potion(kind,1); glug();
    toast(`${POTIONS[kind].e} ${POTIONS[kind].name} 획득!`);
    show('s-map');
    setTimeout(()=>Map.walkTo(Save.s.progress.pos+1),500);
  },

  loadSong(t){
    const p=$('player'), label=$('song-label');
    p.pause(); p.style.display='none';
    p.onloadeddata=()=>{ p.style.display='block'; label.textContent=t+'단 노래 준비 완료'; };
    p.onerror=()=>{ p.removeAttribute('src'); p.style.display='none';
                    label.textContent=t+'단 노래를 켜고 따라 불러요'; };
    p.src='songs/song-'+t+'.mp3';
  }
};
