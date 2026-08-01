/* =========================================================
   core.js — 화면 전환 · 이미지 · 공용 HUD
========================================================= */
function $(id){ return document.getElementById(id); }

/* =========================================================
   실제 보이는 화면 높이를 --vh 에 넣습니다.
   폰에서 주소창이 접히고 펼쳐질 때 100dvh 가 어긋나 아래가
   잘리는 문제를 막습니다. iOS 사파리는 dvh 계산이 특히 자주 틀립니다.
========================================================= */
function fixVH(){
  const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  document.documentElement.style.setProperty('--vh', h+'px');
}
fixVH();
window.addEventListener('resize', fixVH);
window.addEventListener('orientationchange', ()=>setTimeout(fixVH,250));
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', fixVH);
}

/* 이미지가 없으면 이모지로 대체 */
function artFail(img,emoji){
  const s=document.createElement('span');
  s.className=(img.className?img.className+' ':'')+'emoji';
  s.style.cssText=img.style.cssText;
  s.textContent=emoji;
  img.replaceWith(s);
}
function artHTML(file,emoji,cls){
  if(!file) return `<span class="${cls||''} emoji">${emoji}</span>`;
  return `<img class="${cls||''}" src="img/${file}" alt="" onerror="artFail(this,'${emoji}')">`;
}

/* 화면 전환 */
let curScreen='s-title';
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  const el=$(id);
  el.classList.add('on');
  el.scrollTop=0;
  window.scrollTo(0,0);
  curScreen=id;
  if(id!=='s-train') Tune.stop();
  if(id!=='s-battle' && id!=='s-jail') Voice.stop();
  if(id==='s-map') Map.refresh();
  if(id==='s-shop') Shop.render();
  drawHUD();
}
function on(id){ return curScreen===id; }

/* 상단 HUD */
function drawHUD(){
  const s=Save.s;
  document.querySelectorAll('.hud-gold').forEach(el=>{
    el.innerHTML = `🪙 <b>${s.wallet.gold}</b>`;
  });
  document.querySelectorAll('.hud-name').forEach(el=>el.textContent=s.player.name||'용사');
  document.querySelectorAll('.hud-face').forEach(el=>paintFace(el));
  document.querySelectorAll('.hud-diff').forEach(el=>{
    const d=DIFF[s.progress.difficulty];
    el.textContent=d.emoji+' '+d.name;
  });
}
/* which 를 주면 그 성별을 고정으로 그립니다 (선택 화면용).
   생략하면 현재 고른 용사를 그립니다 (HUD·지도용).          */
function paintFace(el, which){
  const s=Save.s;
  const hero = which || s.player.hero;
  /* 사진은 그 사진을 넣은 용사 칸에만 적용 */
  if(s.player.photo && s.player.photoHero===hero){
    el.innerHTML=`<img src="${s.player.photo}" alt="">`;
    return;
  }
  el.innerHTML=artHTML('face-'+hero+'.png', hero==='girl'?'👧':'👦','');
}

/* 토스트 알림 */
function toast(html, ms){
  const t=document.createElement('div');
  t.className='toast'; t.innerHTML=html;
  $('app').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),400); }, ms||1900);
}

/* 골드 지급 (연출 포함) */
function grantGold(n){
  Save.gold(n); coinSfx();
  toast(`🪙 <b>+${n}</b> 골드`);
  drawHUD();
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function confetti(n){
  const app=$('app'), ch=['✨','⭐','💎','🎉','🏆','🪙'];
  for(let i=0;i<(n||30);i++){
    const c=document.createElement('div');
    c.className='confetti'; c.textContent=ch[Math.floor(Math.random()*ch.length)];
    c.style.left=Math.random()*100+'%';
    c.style.animationDuration=(1.8+Math.random()*2)+'s';
    c.style.animationDelay=(Math.random()*.9)+'s';
    app.appendChild(c); setTimeout(()=>c.remove(),5200);
  }
}
