/* =========================================================
   main.js — 시작 화면 · 상점 · 설정 · 엔딩
========================================================= */

/* ---------- 상점 ---------- */
const Shop = {
  /* 먹이 1개로 오르는 경험치 — 먹이 몇 개가 남았는지 안내할 때 씁니다. */
  get foodExp(){ return PET.foodExp; },

  /* 'inv'(인벤토리) 또는 'shop'. 🎒 로 들어오면 항상 인벤토리부터. */
  tab:'inv',
  open(){ this.tab='inv'; this.render(); },
  setTab(t){ this.tab=t; this.render(); $('shop-body').scrollTop=0; },

  /* 펫 칸. 알일 때는 "먹이를 주면 부화한다"를 크게 알려줍니다.
     경험치는 데리고 다니는 펫에게만 쌓이므로 그 펫을 보여 줍니다.
     교체 그리드(.petswitch)는 인벤토리 탭에서만 보여 줍니다.        */
  petHTML(withSwitch){
    const s=Save.s;
    let h='<div class="shoplabel">내 펫</div>';
    const art=Save.petArt();
    if(!art){
      h+=`<div class="petbox empty">${artHTML(PET.eggF,PET.eggE,'petart')}
            <div><b>아직 펫이 없어요</b>
              <small>드래곤을 물리치면 펫 알을 받아요</small></div>
          </div>`;
      return h;
    }
    const p=Save.petOf(), st=Save.petStage(), stage=PET.stages[st], nxt=PET.stages[st+1];
    const pct = nxt ? Math.min(100,(p.exp-stage.need)/(nxt.need-stage.need)*100) : 100;
    let note='', bartext;
    if(st===0 && nxt){                       /* 아직 알 */
      const left=nxt.need-p.exp;
      const food=Math.ceil(left/this.foodExp);
      note=`<div class="pethatch">🍖 펫 먹이를 주면 알이 부화해요!</div>`;
      bartext=`정답 ${left}개 또는 먹이 ${food}개`;
    } else {
      bartext = nxt ? `정답 ${nxt.need-p.exp}개 더 모으면 자라요` : '다 자랐어요!';
    }
    h+=note+`<div class="petbox">${artHTML(art.f,art.e,'petart')}
        <div><b>${art.name}</b> · ${art.label}
          <div class="petbar"><i style="width:${pct}%"></i></div>
          <small>${bartext}</small></div>
      </div>`;
    /* 두 마리 이상이면 데리고 다닐 펫을 여기서 바꿉니다 (인벤토리 탭에서만) */
    const mine=Save.ownedPets();
    if(withSwitch && mine.length>1){
      h+='<div class="petswitch">';
      mine.forEach(sp=>{
        const a=Save.petArt(sp.id);
        const on=s.activePet===sp.id;
        h+=`<div class="petpick${on?' on':''}" onclick="Shop.pickPet('${sp.id}')">
              ${artHTML(a.f,a.e,'petmini')}<b>${sp.name}</b>
              <small>${on?'동행 중':a.label}</small></div>`;
      });
      h+='</div>';
    }
    return h;
  },

  /* 펫 알 판매 칸 (드래곤은 보스에게서만 받습니다) */
  petShopHTML(){
    const s=Save.s;
    const buyable=Object.values(PET_SPECIES).filter(sp=>sp.source==='shop');
    let h='<div class="shoplabel">펫 알</div><div class="grid">';
    buyable.forEach(sp=>{
      const have=s.pets[sp.id] && s.pets[sp.id].owned;
      const can=s.wallet.gold>=sp.price;
      const cls = have ? 'sitem got' : (can?'sitem':'sitem poor');
      const act = (!have && can) ? `onclick="Shop.buyPet('${sp.id}')"` : '';
      h+=`<div class="${cls}" ${act}><div class="se">${have?sp.e1:PET.eggE}</div>
          <b>${sp.name}</b>
          <small>${have?'보유 중':'🪙 '+sp.price}</small>
          <em>${have?'':'알로 받아서 키워요'}</em></div>`;
    });
    return h+'</div>';
  },

  pickPet(sp){
    if(Save.setActivePet(sp)){
      const a=Save.petArt(sp);
      toast(`${a.name}와(과) 함께 가요!`);
      chime(); this.render(); Map.drawWalker();
    }
  },

  buyPet(sp){
    const spec=PET_SPECIES[sp], s=Save.s;
    if(!spec || spec.source!=='shop') return;
    if(s.pets[sp] && s.pets[sp].owned) return;
    if(s.wallet.gold<spec.price) return;
    Save.gold(-spec.price);
    Save.grantPet(sp);
    toast(`🥚 ${spec.name} 알을 받았어요!`);
    coinSfx(); commit(); this.render(); drawHUD();
  },

  /* ---------- 인벤토리 탭 — 보기 전용 (구매 버튼 없음) ---------- */
  invHTML(){
    const s=Save.s;
    let h=this.petHTML(true);          /* 교체 그리드 포함 */
    /* 몬스터에게서 얻은 것 */
    const drops=Object.values(DROPS).filter(d=>s.items.includes(d.id));
    if(drops.length){
      h+='<div class="shoplabel">모험으로 얻은 것</div><div class="grid">';
      drops.forEach(d=>{ h+=`<div class="sitem got" onclick="Shop.tapItem()">
        <div class="se">${d.e}</div><b>${d.name}</b><small>전리품</small></div>`; });
      h+='</div>';
    }
    /* 상점에서 산 것 — 먹이 같은 소모품은 남지 않으므로 제외 */
    const bought=SHOP.filter(it=>s.items.includes(it.id) && !it.repeat);
    if(bought.length){
      h+='<div class="shoplabel">상점에서 산 것</div><div class="grid">';
      bought.forEach(it=>{ h+=`<div class="sitem got" onclick="Shop.tapItem()">
        <div class="se">${it.e}</div><b>${it.name}</b><small>${it.tag}</small></div>`; });
      h+='</div>';
    }
    if(!drops.length && !bought.length){
      h+='<div class="shoplabel">가진 물건</div><p class="tiny">아직 모은 물건이 없어요</p>';
    }
    return h;
  },

  /* 옷·검 착용은 그림이 준비되면 붙입니다 */
  tapItem(){ toast('착용 기능은 곧 추가될 예정이에요'); },

  /* ---------- 상점 탭 — 구매 ---------- */
  shopHTML(){
    const s=Save.s;
    let h=this.petHTML(false);         /* 먹이를 누구에게 주는지 알 수 있게 요약만 */
    h+='<div class="shoplabel">상점</div><div class="grid">';
    SHOP.forEach(it=>{
      const have=s.items.includes(it.id);
      const can=s.wallet.gold>=it.price;
      const cls = have&&!it.repeat ? 'sitem got' : (can?'sitem':'sitem poor');
      const act = (have&&!it.repeat) ? '' : (can?`onclick="Shop.buy('${it.id}')"`:'');
      const desc = it.id==='food-pet'
        ? `<em>알을 깨우고 펫을 키워요 · 경험치 +${this.foodExp}</em>` : '';
      h+=`<div class="${cls}" ${act}><div class="se">${it.e}</div>
          <b>${it.name}</b>
          <small>${have&&!it.repeat?'보유 중':'🪙 '+it.price}</small>${desc}</div>`;
    });
    h+='</div>';
    return h+this.petShopHTML();
  },

  render(){
    const inv=this.tab!=='shop';
    let h=`<div class="shoptabs">
        <div class="stab${inv?' sel':''}" onclick="Shop.setTab('inv')">🎒 인벤토리</div>
        <div class="stab${inv?'':' sel'}" onclick="Shop.setTab('shop')">🪙 상점</div>
      </div>`;
    $('shop-body').innerHTML = h + (inv ? this.invHTML() : this.shopHTML());
  },
  buy(id){
    const it=SHOP.find(x=>x.id===id), s=Save.s;
    if(!it || s.wallet.gold<it.price) return;
    /* 펫이 없으면 먹이는 살 수 없습니다 (골드만 날아가지 않도록) */
    if(it.id==='food-pet' && !Save.petOf()){ toast('아직 펫이 없어요'); return; }
    Save.gold(-it.price);
    if(it.id==='food-pet'){
      const p=Save.petOf();
      const was=Save.petStage();            /* 부화 여부를 먹이기 전후로 비교 */
      p.exp+=this.foodExp;
      const now=Save.petStage();
      const nm=Save.petArt().name;
      if(was===0 && now>was)   toast(`🎉 ${nm} 알이 부화했어요!`);
      else if(now===0)         toast(`🍖 알이 조금 더 갈라졌어요! (+${this.foodExp})`);
      else                     toast(`🍖 ${nm}이(가) 좋아해요! (+${this.foodExp})`);
    } else {
      Save.addItem(it.id);
      toast(`${it.e} ${it.name} 구입!`);
    }
    coinSfx(); commit(); this.render(); drawHUD();
  }
};

/* ---------- 다음 단 고르기 ----------
   길은 하나지만, 다음 자리에 누가 기다릴지는 아이가 정합니다.        */
const Choose = {
  open(){
    const left = remainingTables();
    $('ch-count').textContent = `${left.length}개 남음`;
    let h='';
    left.forEach((t,i)=>{
      const m=MONS.find(x=>x.t===t), tip=TABLE_TIP[t];
      const star = i===0 ? '<span class="rec">추천</span>' : '';
      h+=`<div class="chcard" onclick="Choose.pick(${t})">
            <div class="chart">${artHTML(monsterArt(m),m.e,'')}</div>
            <div class="chtxt"><b>${t}단</b>${star}
              <small>${m.name}</small>
              <em>${tip.tip}</em></div>
            <div class="chgo">▶</div>
          </div>`;
    });
    $('ch-list').innerHTML=h;
    show('s-choose');
  },
  pick(t){
    Save.run().order.push(t);
    commit(true);
    chime();
    toast(`${t}단의 길이 열렸어요!`);
    show('s-map');
    setTimeout(()=>Map.walkTo(Save.run().pos+1),600);
  }
};

/* ---------- 보물 이후 갈림길 ----------
   성을 한 번 깬 뒤 무엇을 할지 고릅니다. 난이도별로 지도가 따로
   있으므로, 다른 난이도를 골라도 지금까지의 기록은 남아 있습니다.   */
const Fork = {
  /* 그 난이도가 지금 어떤 상태인지 한 줄로 */
  state(tier){
    const r=Save.run(tier);
    if(r.cleared.includes('boss')) return {txt:'깬 적 있음 · 처음부터 다시', warn:false};
    if(r.started || r.pos>0)       return {txt:`${r.cleared.length}단까지 가는 중 · 처음부터 다시`, warn:true};
    return {txt:'아직 안 해봤어요', warn:false};
  },

  open(){
    let h=`<div class="cgcard" onclick="Fork.challenge()">
             <div class="cge">🏆</div>
             <div class="cgtxt"><b>도전 모드로</b>
               <em>20문제를 풀고 골드를 벌어요</em></div>
             <div class="chgo">▶</div>
           </div>`;
    Object.values(DIFF).forEach(d=>{
      const st=this.state(d.id);
      const now = Save.s.progress.difficulty===d.id ? ' · 지금 여기' : '';
      h+=`<div class="cgcard" onclick="Fork.restart('${d.id}')">
            <div class="cge">${d.emoji}</div>
            <div class="cgtxt"><b>${d.name} 모드 처음부터</b>
              <em>${d.desc}<br>${st.txt}${now}</em></div>
            <div class="chgo">▶</div>
          </div>`;
    });
    $('fk-list').innerHTML=h;
    show('s-fork');
  },

  challenge(){ show('s-challenge'); },

  /* 고른 난이도만 처음 상태로 되돌리고 그 지도로 옮겨 갑니다 */
  restart(tier){
    const d=DIFF[tier]; if(!d) return;
    const st=this.state(tier);
    /* 아직 깨는 중인 기록을 지우게 되는 경우에만 한 번 물어봅니다 */
    if(st.warn && !confirm(`${d.name} 모드는 지금 진행 중이에요.\n처음부터 다시 시작하면 그 지도는 마을부터 다시 걷게 됩니다.\n계속할까요?`)) return;
    Save.resetRun(tier);
    Save.s.progress.difficulty=tier;
    commit(true);
    chime(); toast(`${d.emoji} ${d.name} 모드 시작!`);
    Map.build();
    show('s-map');
  }
};

/* ---------- 시작 화면 ---------- */
function pickHero(h){
  Save.s.player.hero=h;
  $('h-girl').classList.toggle('sel',h==='girl');
  $('h-boy').classList.toggle('sel',h==='boy');
  paintFace($('face-girl'),'girl');
  paintFace($('face-boy'),'boy');
}
function loadPhoto(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    /* 저장 용량을 위해 256px로 줄여서 보관 */
    const im=new Image();
    im.onload=()=>{
      const c=document.createElement('canvas'); c.width=c.height=256;
      const g=c.getContext('2d');
      const side=Math.min(im.width,im.height);
      g.drawImage(im,(im.width-side)/2,(im.height-side)/2,side,side,0,0,256,256);
      Save.s.player.photo=c.toDataURL('image/jpeg',.82);
      Save.s.player.photoHero=Save.s.player.hero;   /* 사진 주인 기록 */
      commit();
      paintFace($('face-girl'),'girl');
      paintFace($('face-boy'),'boy');
    };
    im.src=r.result;
  };
  r.readAsDataURL(f);
}
function pickDiff(id){
  Save.s.progress.difficulty=id;
  document.querySelectorAll('.dcard').forEach(el=>
    el.classList.toggle('sel', el.dataset.d===id));
}
function startAdventure(){
  const v=$('pname').value.trim();
  Save.s.player.name=v||'용사님';
  Save.run().started=true;              /* 지금 고른 난이도의 모험을 시작 */
  Save.s.stats.plays++;
  commit(true);
  Map.build();
  show('s-map');
}
function continueGame(){
  Map.build();
  show('s-map');
}

/* ---------- 설정 ---------- */
function openSettings(){
  const s=Save.s;
  $('set-sfx').checked=s.settings.sfx;
  $('set-bgm').checked=s.settings.bgm;
  $('set-music').checked=s.settings.music;
  $('set-voice').checked=s.settings.voice;
  $('set-code').textContent=s.familyCode||'없음';
  let d='';
  Object.values(DIFF).forEach(x=>{
    d+=`<button class="dbtn${s.progress.difficulty===x.id?' sel':''}"
          onclick="setDiff('${x.id}')">${x.emoji} ${x.name}</button>`;
  });
  $('set-diff').innerHTML=d;
  show('s-settings');
}
/* 난이도를 바꾸면 그 난이도의 지도로 갈아탑니다.
   진행 상태는 난이도별로 따로 있으므로 서로 덮어쓰지 않습니다. */
function setDiff(id){
  Save.s.progress.difficulty=id;
  Save.run().started=true;
  commit(); openSettings(); drawHUD();
}
function saveSettings(){
  const s=Save.s;
  s.settings.sfx=$('set-sfx').checked;
  s.settings.music=$('set-music').checked;
  s.settings.voice=$('set-voice').checked;
  Bgm.setEnabled($('set-bgm').checked);      /* 배경음악은 즉시 켜고/끄는 효과도 같이 적용 */
  commit(true); toast('저장했어요');
  show('s-map');
}
async function makeFamilyCode(){
  if(!Sync.ready){
    alert('클라우드 연결이 설정돼 있지 않습니다.\njs/sync.js 의 FIREBASE_CONFIG 를 채워주세요.');
    return;
  }
  const code=Sync.makeCode();
  Save.s.familyCode=code; commit(true);
  $('set-code').textContent=code;
  alert('가족 코드: '+code+'\n\n다른 기기에서 이 코드를 입력하면 이어서 할 수 있어요.');
}
async function enterFamilyCode(){
  const code=(prompt('다른 기기에서 만든 가족 코드를 입력하세요')||'').trim().toUpperCase();
  if(!code) return;
  if(!Sync.ready){ alert('클라우드 연결이 설정돼 있지 않습니다.'); return; }
  const remote=await Sync.pull(code);
  if(remote){
    Save.set(remote); Save.s.familyCode=code; commit(true);
    alert('불러왔습니다!'); location.reload();
  }else{
    Save.s.familyCode=code; commit(true);
    alert('그 코드에 저장된 기록이 없어 지금 진행 상황을 그 코드로 올립니다.');
  }
}
function hardReset(){
  if(!confirm('정말 처음부터 다시 시작할까요?\n골드와 아이템이 모두 사라집니다.')) return;
  resetSave(); location.reload();
}

/* ---------- 엔딩 ---------- */
function ending(){
  const s=Save.s;
  $('ed-sub').textContent=`${s.player.name}, 구구단성의 길을 끝까지 걸었어요.`;
  $('ed-correct').textContent=s.stats.correct;
  $('ed-wrong').textContent=s.stats.wrong;
  $('ed-gold').textContent=s.wallet.gold;
  const w=Save.weakest(6);
  $('ed-weak').innerHTML = w.length
    ? '다시 볼 문제 &nbsp;'+w.map(k=>`<b>${k.replace('x','×')}</b>`).join(' &nbsp; ')
    : '틀린 문제가 하나도 없어요!';
  show('s-ending'); confetti(60);
}

/* ---------- 시동 ---------- */
window.addEventListener('DOMContentLoaded', async ()=>{
  let hasSave=false;
  try{ hasSave = loadSave(); }catch(e){ console.warn('저장 읽기 실패',e); }

  /* 클라우드는 선택 기능 — 없거나 실패해도 게임은 그대로 돌아갑니다 */
  try{
    if(typeof Sync!=='undefined'){
      await Sync.init();
      if(Sync.ready && Save.s.familyCode){
        const remote = await Sync.pull(Save.s.familyCode);
        if(remote) Save.set(remote);
      }
    }
  }catch(e){ console.warn('클라우드 건너뜀',e); }

  try{
    const s=Save.s;
    if(hasSave || Save.anyStarted()){
      const d=DIFF[s.progress.difficulty]||DIFF.easy;
      $('btn-continue').style.display='';
      $('continue-info').textContent =
        `${s.player.name||'용사'} · ${d.name} · ${Save.run().cleared.length}단 클리어 · 🪙${s.wallet.gold}`;
    }
    pickHero(s.player.hero||'girl');
    pickDiff(s.progress.difficulty||'easy');
    $('pname').value=s.player.name||'';
    drawHUD();
  }catch(e){ console.warn('초기 화면 그리기 일부 실패',e); }

  /* 키보드 입력 */
  document.addEventListener('keydown',e=>{
    if(on('s-battle')){
      if(/^[0-9]$/.test(e.key)) Battle.press(e.key);
      else if(e.key==='Backspace'){ e.preventDefault(); Battle.press('⌫'); }
      else if(e.key==='Enter') Battle.press('확인');
    }else if(on('s-jail')){
      if(/^[0-9]$/.test(e.key)) Jail.press(e.key);
      else if(e.key==='Backspace'){ e.preventDefault(); Jail.press('⌫'); }
      else if(e.key==='Enter') Jail.press('확인');
    }
  });

  /* 앱을 벗어날 때 즉시 저장 */
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) commit(true); });
  window.addEventListener('pagehide',()=>commit(true));
});
