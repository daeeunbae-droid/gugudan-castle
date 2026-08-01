/* =========================================================
   main.js — 시작 화면 · 상점 · 설정 · 엔딩
========================================================= */

/* ---------- 상점 ---------- */
const Shop = {
  render(){
    const s=Save.s;
    let h='';
    /* 몬스터에게서 얻은 아이템 */
    const owned=Object.values(DROPS).filter(d=>s.items.includes(d.id));
    if(owned.length){
      h+='<div class="shoplabel">모험으로 얻은 것</div><div class="grid">';
      owned.forEach(d=>{ h+=`<div class="sitem got"><div class="se">${d.e}</div>
        <b>${d.name}</b><small>전리품</small></div>`; });
      h+='</div>';
    }
    h+='<div class="shoplabel">상점</div><div class="grid">';
    SHOP.forEach(it=>{
      const have=s.items.includes(it.id);
      const can=s.wallet.gold>=it.price;
      const cls = have&&!it.repeat ? 'sitem got' : (can?'sitem':'sitem poor');
      const act = (have&&!it.repeat) ? '' : (can?`onclick="Shop.buy('${it.id}')"`:'');
      h+=`<div class="${cls}" ${act}><div class="se">${it.e}</div>
          <b>${it.name}</b>
          <small>${have&&!it.repeat?'보유 중':'🪙 '+it.price}</small></div>`;
    });
    h+='</div>';
    if(s.pet.owned){
      const st=Save.petStage(), p=PET.stages[st];
      const nxt=PET.stages[st+1];
      h+=`<div class="shoplabel">내 펫</div>
        <div class="petbox">${artHTML(p.f,p.e,'petart')}
          <div><b>${s.pet.name}</b> · ${p.label}
          <div class="petbar"><i style="width:${nxt?Math.min(100,(s.pet.exp-p.need)/(nxt.need-p.need)*100):100}%"></i></div>
          <small>${nxt?`정답 ${nxt.need-s.pet.exp}개 더 모으면 자라요`:'다 자랐어요!'}</small></div>
        </div>`;
    }
    $('shop-body').innerHTML=h;
  },
  buy(id){
    const it=SHOP.find(x=>x.id===id), s=Save.s;
    if(!it || s.wallet.gold<it.price) return;
    Save.gold(-it.price);
    if(it.id==='food-pet'){
      if(s.pet.owned){ s.pet.exp+=15; toast('🍖 펫이 좋아해요! 경험치 +15'); }
      else toast('아직 펫이 없어요');
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
            <div class="chart">${artHTML(m.f,m.e,'')}</div>
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
    Save.s.progress.order.push(t);
    commit(true);
    chime();
    toast(`${t}단의 길이 열렸어요!`);
    show('s-map');
    setTimeout(()=>Map.walkTo(Save.s.progress.pos+1),600);
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
  Save.s.progress.started=true;
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
function setDiff(id){ Save.s.progress.difficulty=id; commit(); openSettings(); drawHUD(); }
function saveSettings(){
  const s=Save.s;
  s.settings.sfx=$('set-sfx').checked;
  s.settings.music=$('set-music').checked;
  s.settings.voice=$('set-voice').checked;
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
    if(hasSave || s.progress.started){
      $('btn-continue').style.display='';
      $('continue-info').textContent =
        `${s.player.name||'용사'} · ${s.progress.cleared.length}단 클리어 · 🪙${s.wallet.gold}`;
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
