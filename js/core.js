/* =========================================================
   core.js — 화면 전환 · 이미지 · 공용 HUD
========================================================= */
function $(id){ return document.getElementById(id); }

/* 이미지가 없으면 이모지로 대체 */
function artFail(img,emoji){
  const s=document.createElement('span');
  s.className=(img.className?img.className+' ':'')+'emoji';
  s.style.cssText=img.style.cssText;
  s.textContent=emoji;
  img.replaceWith(s);
}
function artHTML(file,emoji,cls){
  return `<img class="${cls||''}" src="img/${file}" alt="" onerror="artFail(this,'${emoji}')">`;
}

/* 화면 전환 */
let curScreen='s-title';
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  $(id).classList.add('on');
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
function paintFace(el){
  const s=Save.s;
  if(s.player.photo) el.innerHTML=`<img src="${s.player.photo}" alt="">`;
  else el.innerHTML=artHTML('face-'+s.player.hero+'.png', s.player.hero==='girl'?'👧':'👦','');
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
