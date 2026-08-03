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

  /* 상점의 뒤로가기 버튼이 돌아갈 화면. 지도·보너스 스테이지 허브 등
     여러 곳에서 상점으로 들어올 수 있으므로, 들어온 곳으로 그대로
     돌아가게 진입 지점마다 기록해 둡니다(기본값 지도). 버튼 글자도
     돌아갈 곳에 맞춰 바꿔 줍니다.                                  */
  backTo:'s-map',
  backLabel:{'s-map':'지도로', 's-fork':'보너스 스테이지로'},
  enterFrom(id){
    this.backTo=id||'s-map';
    show('s-shop');
    const btn=$('shop-back');
    if(btn) btn.textContent=this.backLabel[this.backTo]||'돌아가기';
  },

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
    /* 난이도(용사·마스터·레전드)를 처음 깼을 때 받은 것 (2026-08-03) */
    const tierItems=Object.values(TIER_ITEMS).filter(it=>s.items.includes(it.id));
    if(tierItems.length){
      h+='<div class="shoplabel">난이도를 깨서 받은 것</div><div class="grid">';
      tierItems.forEach(it=>{ h+=`<div class="sitem got" onclick="Shop.tapItem()">
        <div class="se">${it.e}</div><b>${it.name}</b><small>단계 보상</small></div>`; });
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
    if(!drops.length && !tierItems.length && !bought.length){
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

/* ---------- 보물 이후 갈림길 = 보너스 스테이지 허브 ----------
   성을 한 번 깬 뒤 무엇을 할지 고릅니다. 난이도별로 지도가 따로
   있으므로, 다른 난이도를 골라도 지금까지의 기록은 남아 있습니다.
   2026-08-03부터: 도전 모드(g248/g356/g789)가 강제 순차 진행이 아니라
   이 허브에서 세 장 중 원하는 것만 골라 풀 수 있는 보너스가 됐습니다.  */
const Fork = {
  /* 그 난이도가 지금 어떤 상태인지 한 줄로 */
  state(tier){
    const r=Save.run(tier);
    if(r.cleared.includes('boss')) return {txt:'깬 적 있음 · 처음부터 다시', warn:false};
    if(r.started || r.pos>0)       return {txt:`${r.cleared.length}단까지 가는 중 · 처음부터 다시`, warn:true};
    return {txt:'아직 안 해봤어요', warn:false};
  },

  /* 난이도는 단계적으로 열립니다 — 용사는 항상 열려있고, 마스터는
     용사 보스를 한 번이라도 잡아야, 레전드는 마스터 보스를 한 번이라도
     잡아야 열립니다(2026-08-03, 대은님 확정). 한 번 열리면 계속 열려
     있습니다 — Save.run(tier).cleared 는 난이도별로 따로 쌓이므로
     (5-4) 이 기록만 보면 되고 별도 필드가 필요 없습니다.            */
  TIERS: ['easy','normal','hard'],
  unlocked(tier){
    const idx=this.TIERS.indexOf(tier);
    if(idx<=0) return true;                       /* 용사는 항상 열려있음 */
    const prev=this.TIERS[idx-1];
    return Save.run(prev).cleared.includes('boss');
  },

  /* 허브에 "새로" 들어올 때 씁니다 — 보물칸에 도달했거나 다시 눌렀을 때.
     도전 모드 3장을 전부 다시 고를 수 있는 상태로 리셋한 뒤 엽니다.
     (허브 안에서 도전 하나를 끝내고 돌아올 때는 open()만 호출되므로
      done 은 그대로 남아 완료 표시가 유지됩니다.)                    */
  enter(){
    Challenge.done = [];
    this.open();
  },

  /* 세 난이도를 항상 다 보여 주되, 아직 열리지 않은 난이도는 자물쇠로
     표시만 하고 고를 수 없게 합니다(unlocked() 참고 — 용사는 항상 열림,
     마스터는 용사를, 레전드는 마스터를 한 번 깨야 열림). 열린 난이도
     중에서는 방금 깬 난이도의 바로 윗 단계에 '추천'을 붙여 다음 단계를
     가리키기만 합니다 — 막지는 않습니다.
     도전 모드 3장은 강제가 아니라 이 허브의 첫 번째 묶음으로 같이
     보여 줍니다 — 완료한 카드는 다시 고를 수 없게 표시만 바뀝니다.    */
  open(){
    const here = Save.s.progress.difficulty;
    const next = this.TIERS[this.TIERS.indexOf(here)+1];   /* 없으면(레전드였으면) undefined */

    let h='<p class="grouplabel">🏆 보너스 스테이지 · 도전 모드</p>';
    Challenge.MODES.forEach(m=>{
      if(Challenge.done.includes(m.id)){
        h+=`<div class="cgcard done">
              <div class="cge">${m.e}</div>
              <div class="cgtxt"><b>${m.name}</b><em>완료했어요 · 골드는 이미 받았어요</em></div>
              <div class="chgo">✅</div>
            </div>`;
      }else{
        h+=`<div class="cgcard" onclick="Challenge.start('${m.id}')">
              <div class="cge">${m.e}</div>
              <div class="cgtxt"><b>${m.name}</b><em>${m.desc}</em></div>
              <div class="chgo">▶</div>
            </div>`;
      }
    });

    h+='<p class="grouplabel">⚔️ 다음 모험</p>';
    this.TIERS.forEach((id,idx)=>{
      const d=DIFF[id]; if(!d) return;
      if(!this.unlocked(id)){
        const prevName=DIFF[this.TIERS[idx-1]].name;
        h+=`<div class="cgcard locked">
              <div class="cge">🔒</div>
              <div class="cgtxt"><b>${d.name} 모드</b>
                <em>${prevName} 모드를 먼저 깨면 열려요</em></div>
            </div>`;
        return;
      }
      const st=this.state(id);
      const now = here===id ? ' · 지금 여기' : '';
      const rec = (id===next) ? '<span class="rec">추천</span>' : '';
      h+=`<div class="cgcard" onclick="Fork.restart('${id}')">
            <div class="cge">${d.emoji}</div>
            <div class="cgtxt"><b>${d.name} 모드 처음부터</b>${rec}
              <em>${d.desc}<br>${st.txt}${now}</em></div>
            <div class="chgo">▶</div>
          </div>`;
    });
    $('fk-list').innerHTML=h;
    show('s-fork');
  },

  /* 고른 난이도만 처음 상태로 되돌리고 그 지도로 옮겨 갑니다 */
  restart(tier){
    const d=DIFF[tier]; if(!d) return;
    if(!this.unlocked(tier)) return;   /* 잠긴 난이도는 카드에 onclick이 없지만 방어적으로 한 번 더 막음 */
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
/* 시작 화면의 난이도 카드 — 갈림길(Fork)과 똑같은 잠금 규칙을 씁니다.
   용사는 항상 열려 있고, 마스터는 용사를, 레전드는 마스터를 한 번
   깨야 열립니다. 잠긴 카드는 사라지지 않고 🔒 로 흐리게 남습니다.

   보호자 설정(setDiff)은 일부러 잠그지 않았습니다 — 어른이 필요할 때
   난이도를 조절할 수 있어야 하므로. 그래서 설정에서 잠긴 난이도로
   맞춰 둔 채 "새로 시작하기"로 들어올 수 있는데, 그때는 아래에서
   열린 난이도 중 가장 높은 것으로 조용히 되돌립니다.              */
function paintDiffCards(){
  let cur = Save.s.progress.difficulty || 'easy';
  if(!Fork.unlocked(cur)){
    cur = Fork.TIERS.filter(t=>Fork.unlocked(t)).pop() || 'easy';
    Save.s.progress.difficulty = cur;
  }
  document.querySelectorAll('#s-select .dcard').forEach(el=>{
    const id=el.dataset.d, d=DIFF[id]; if(!d) return;
    const b=el.querySelector('b'), sm=el.querySelector('small');
    if(sm && sm.dataset.orig===undefined) sm.dataset.orig=sm.textContent;
    const open=Fork.unlocked(id);
    el.classList.toggle('locked', !open);
    el.classList.toggle('sel', open && id===cur);
    if(open){
      if(b)  b.textContent = d.emoji+' '+d.name;
      if(sm) sm.textContent = sm.dataset.orig;
    }else{
      const prev=DIFF[Fork.TIERS[Fork.TIERS.indexOf(id)-1]];
      if(b)  b.textContent = '🔒 '+d.name;
      if(sm) sm.textContent = `${prev.name} 모드를 먼저 깨면 열려요`;
    }
  });
}
function pickDiff(id){
  if(!Fork.unlocked(id)){
    const prev=DIFF[Fork.TIERS[Fork.TIERS.indexOf(id)-1]];
    toast(`🔒 ${prev.name} 모드를 먼저 깨면 열려요`);
    return;
  }
  Save.s.progress.difficulty=id;
  paintDiffCards();
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

/* ---------- 설정 ----------
   지도 화면·보너스 스테이지 허브 둘 다에서 ⚙️ 로 들어올 수 있으므로,
   상점과 같은 방식으로 "들어온 곳"을 기억했다가 저장 후 그대로
   돌아갑니다(기본값 지도).                                         */
let settingsBackTo='s-map';
function openSettings(from){
  settingsBackTo = from || 's-map';
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
  commit(); openSettings(settingsBackTo); drawHUD();
}
function saveSettings(){
  const s=Save.s;
  s.settings.sfx=$('set-sfx').checked;
  s.settings.music=$('set-music').checked;
  s.settings.voice=$('set-voice').checked;
  Bgm.setEnabled($('set-bgm').checked);      /* 배경음악은 즉시 켜고/끄는 효과도 같이 적용 */
  commit(true); toast('저장했어요');
  show(settingsBackTo);
}

/* 안심하고 끝낼 수 있는 "저장하고 나가기" — 사실 게임은 문제 하나
   풀 때마다 이미 자동 저장되지만(그래서 별도 저장 버튼이 원래 없었지만),
   "확실히 저장하고 끝냈다"는 안심을 주기 위해 타이틀 화면으로 보내기
   직전에 한 번 더 commit 하고 안내를 띄웁니다 (2026-08-03). */
function saveAndExit(){
  commit(true);
  const s=Save.s, d=DIFF[s.progress.difficulty]||DIFF.easy;
  if(Save.anyStarted()){
    $('btn-continue').style.display='';
    $('continue-info').textContent =
      `${s.player.name||'용사'} · ${d.name} · ${Save.run().cleared.length}단 클리어 · 🪙${s.wallet.gold}`;
  }
  chime();
  toast('💾 저장 완료! 안심하고 나가도 돼요');
  show('s-title');
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
    paintDiffCards();          /* 잠금 상태까지 같이 그립니다 */
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
