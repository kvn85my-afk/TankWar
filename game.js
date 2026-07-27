
// ===== V5.2 GAMEPLAY + AI UPGRADE =====
// Safer spawn water, island-aware enemy steering, stronger battle FX, denser sea atmosphere.
// Fix: player can no longer spawn/stay trapped inside an island.
// ===== V5.1 FULL ASSET EDITION =====
// ===== V5.3 SINGLE BATTLESHIP VISUAL =====
// Player always uses the same battleship image. Upgrades increase its visual size.
const PLAYER_BATTLESHIP_SRC='assets/ships/player_battleship.png';
const PLAYER_BATTLESHIP_ART=new Image();
PLAYER_BATTLESHIP_ART.src=PLAYER_BATTLESHIP_SRC;

// Visual scale by level: Lv1 -> Lv8
const PLAYER_SHIP_SCALE=[0.50,0.58,0.66,0.74,0.82,0.90,1.00,1.15];

const c=document.querySelector('#c'),ctx=c.getContext('2d');let W,H,DPR;
const $=s=>document.querySelector(s);
// ===== Pause / Restart / Exit Menu =====
const pauseStyle=document.createElement('style');
pauseStyle.textContent=`
#pauseMenu,#exitScreen{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:24px;background:#000c}
#pauseMenu.show,#exitScreen.show{display:flex}
.pauseCard{width:min(88vw,390px);padding:22px;border-radius:20px;background:linear-gradient(160deg,#0d1b16,#07100d);
border:1px solid #ffffff22;box-shadow:0 24px 70px #000d;text-align:center}
.pauseCard h2{margin:0 0 16px;font-size:30px}
.pauseCard p{color:#cbd7d1;line-height:1.55}
.pauseCard button{display:block;width:100%;margin:10px 0;padding:15px;border:0;border-radius:13px;font-weight:900;font-size:18px;color:#fff;background:#1c4938}
.pauseCard .restart{background:#805c18}
.pauseCard #mainMenuBtn{background:#155f72}
.pauseCard .exit{background:#8d2026}
`;
document.head.appendChild(pauseStyle);

const mainMenu=document.querySelector('#mainMenu');
const pauseMenu=document.createElement('div');
pauseMenu.id='pauseMenu';
pauseMenu.innerHTML=`<div class="pauseCard">
  <h2>游戏暂停</h2>
  <button id="resumeGame">▶ 继续海战</button>
  <button id="restartGame" class="restart">↻ 重新开始</button>
  <button id="mainMenuBtn">⌂ 回到主选单</button>
  <button id="exitGame" class="exit">⏻ 退出游戏</button>
</div>`;
document.body.appendChild(pauseMenu);

const exitScreen=document.createElement('div');
exitScreen.id='exitScreen';
exitScreen.innerHTML=`<div class="pauseCard">
  <h2>已退出游戏</h2>
  <p>游戏已经停止。由于这是浏览器网页，系统通常不允许网页强制关闭当前标签页。</p>
  <button id="backToGame">回到主选单</button>
</div>`;
document.body.appendChild(exitScreen);

let keys={},joy={x:0,y:0},wave=1,coins=0,paused=true,shake=0,last=performance.now();
const WORLD={w:4600,h:6800};
const camera={x:0,y:0};

const MAP_ISLANDS=[
 {x:520,y:680,rx:220,ry:145},{x:1220,y:830,rx:155,ry:110},{x:3500,y:760,rx:250,ry:155},
 {x:3880,y:1520,rx:175,ry:115},{x:760,y:1850,rx:190,ry:125},{x:1850,y:2100,rx:140,ry:100},
 {x:3200,y:2300,rx:215,ry:135},{x:930,y:3200,rx:235,ry:150},{x:2250,y:3350,rx:170,ry:110},
 {x:3650,y:3400,rx:200,ry:130},{x:590,y:4550,rx:210,ry:135},{x:1750,y:4700,rx:150,ry:100},
 {x:3000,y:4900,rx:230,ry:145},{x:3950,y:5350,rx:175,ry:120},{x:1050,y:6000,rx:230,ry:145},
 {x:2500,y:6100,rx:180,ry:115},{x:3600,y:6350,rx:210,ry:130}
];
const REEFS=[
 {x:1040,y:1040,r:38},{x:3480,y:1350,r:46},{x:2250,y:2280,r:42},
 {x:920,y:3300,r:48},{x:3650,y:3600,r:40},{x:2050,y:4650,r:52},
 {x:1100,y:5550,r:42},{x:3480,y:5700,r:44}
];
const PORTS=[
 {x:WORLD.w/2,y:WORLD.h-260,team:'ally'},
 {x:WORLD.w/2,y:260,team:'enemy'}
];

const imgs={};
const sources={};
let loaded=0;
// Battle Ship V1 uses procedural ocean/ship art, so it does not require new asset files.
setTimeout(()=>{ $('#loading').style.display='none'; resetWave(); },120);
function resize(){
 DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;
 c.width=W*DPR;c.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',resize);resize();

const SHIPS=[
 {name:'木船',cost:20,hp:140,speed:215,damage:28,rate:.58,size:42,guns:1,range:430},
 {name:'小帆船',cost:45,hp:175,speed:228,damage:34,rate:.54,size:46,guns:1,range:455},
 {name:'中帆船',cost:80,hp:220,speed:238,damage:42,rate:.50,size:50,guns:2,range:480},
 {name:'大帆船',cost:130,hp:280,speed:248,damage:52,rate:.46,size:55,guns:2,range:505},
 {name:'小战艇',cost:210,hp:350,speed:262,damage:64,rate:.41,size:58,guns:2,range:535},
 {name:'中战艇',cost:320,hp:430,speed:274,damage:78,rate:.36,size:62,guns:3,range:565},
 {name:'大战艇',cost:480,hp:530,speed:286,damage:94,rate:.31,size:67,guns:4,range:600},
 {name:'终极战艇',cost:0,hp:680,speed:300,damage:118,rate:.25,size:74,guns:5,range:650}
];
let shipTier=0;
let player={x:WORLD.w/2,y:WORLD.h/2,a:-Math.PI/2,hp:140,max:140,speed:215,r:13};
let enemies=[],bullets=[],particles=[],floatingTexts=[],pickups=[],ambientShips=[],waterSplashes=[];
let laneUnits=[],laneSpawnTimer=0;
let autoFireTimer=0,autoFireRate=0.48,autoRange=460;
let heavyCooldown=0,heavyCooldownMax=5;
let shockCooldown=0,shockCooldownMax=8,shockRange=250;
let repairCooldown=0,repairCooldownMax=12;


function blockedByLand(x,y,r=18){
 // Expand every island by the ship radius, so collision follows the
 // actual size of the ship instead of only checking its centre point.
 for(const i of MAP_ISLANDS){
   const safeRx=i.rx*1.05+r;
   const safeRy=i.ry*1.05+r;
   const nx=(x-i.x)/safeRx,ny=(y-i.y)/safeRy;
   if(nx*nx+ny*ny<1)return true;
 }
 for(const q of REEFS){
   if(Math.hypot(x-q.x,y-q.y)<q.r+r)return true;
 }
 return false;
}

function findNearestSafeWater(x,y,r=18){
 // First keep the requested position when it is already valid water.
 if(!blockedByLand(x,y,r)) return {x,y};

 // Search outward in rings so a bad spawn point can never trap the ship inside land.
 const step=28;
 for(let radius=step; radius<=520; radius+=step){
   const samples=Math.max(16,Math.ceil(radius/12));
   for(let n=0;n<samples;n++){
     const a=(n/samples)*Math.PI*2;
     const sx=Math.max(60,Math.min(WORLD.w-60,x+Math.cos(a)*radius));
     const sy=Math.max(60,Math.min(WORLD.h-60,y+Math.sin(a)*radius));
     if(!blockedByLand(sx,sy,r+4)) return {x:sx,y:sy};
   }
 }
 // Very unlikely fallback: allied harbor water area.
 return {x:WORLD.w/2,y:WORLD.h-520};
}

function rescuePlayerFromLand(){
 const rescueRadius=(player.r||13)+4;
 if(!blockedByLand(player.x,player.y,rescueRadius)) return;
 const safe=findNearestSafeWater(player.x,player.y,rescueRadius+4);
 player.x=safe.x;
 player.y=safe.y;
 waterSplashes.push({x:player.x,y:player.y,life:700,max:700});
}

function clearanceFromLand(x,y,r=18){
 // Approximate free-water clearance. Larger value = safer/open water.
 let best=99999;
 for(const i of MAP_ISLANDS){
   const dx=Math.abs(x-i.x),dy=Math.abs(y-i.y);
   const edge=Math.max(dx-(i.rx*1.05+r),dy-(i.ry*1.05+r));
   best=Math.min(best,edge);
 }
 for(const q of REEFS){
   best=Math.min(best,Math.hypot(x-q.x,y-q.y)-(q.r+r));
 }
 return best;
}

function findOpenWaterSpawn(){
 // Prefer the allied half of the map and keep plenty of room from islands.
 const candidates=[
   {x:WORLD.w*.50,y:WORLD.h*.90},
   {x:WORLD.w*.36,y:WORLD.h*.86},
   {x:WORLD.w*.64,y:WORLD.h*.86},
   {x:WORLD.w*.50,y:WORLD.h*.78},
   {x:WORLD.w*.30,y:WORLD.h*.76},
   {x:WORLD.w*.70,y:WORLD.h*.76}
 ];
 let best=null,bestScore=-Infinity;
 for(const p of candidates){
   if(blockedByLand(p.x,p.y,player.r+18))continue;
   const score=clearanceFromLand(p.x,p.y,player.r+18);
   if(score>bestScore){bestScore=score;best=p}
 }
 return best||findNearestSafeWater(WORLD.w/2,WORLD.h*.84,player.r+18);
}

function steerAroundLand(o,targetX,targetY,speed,dt){
 const dx=targetX-o.x,dy=targetY-o.y,d=Math.hypot(dx,dy)||1;
 const base=Math.atan2(dy,dx);
 const step=speed*dt;
 const angles=[0,.28,-.28,.55,-.55,.85,-.85,1.15,-1.15,Math.PI/2,-Math.PI/2];
 let chosen=null,best=-Infinity;

 for(const off of angles){
   const a=base+off;
   const nx=o.x+Math.cos(a)*step,ny=o.y+Math.sin(a)*step;
   if(blockedByLand(nx,ny,o.r||14))continue;

   // Look further ahead so AI starts turning before hitting the shoreline.
   const look=72+(o.r||14)*2;
   const lx=o.x+Math.cos(a)*look,ly=o.y+Math.sin(a)*look;
   const clear=blockedByLand(lx,ly,(o.r||14)+4)?-300:clearanceFromLand(lx,ly,o.r||14);
   const progress=-(Math.hypot(targetX-nx,targetY-ny));
   const score=progress+clear*.22-Math.abs(off)*22;
   if(score>best){best=score;chosen={nx,ny,a}}
 }
 if(chosen){
   moveWithCollision(o,chosen.nx,chosen.ny);
   o.a=chosen.a;
   return true;
 }
 return false;
}

function impactFx(x,y,heavy=false){
 const count=heavy?28:14;
 for(let i=0;i<count;i++){
   const a=Math.random()*Math.PI*2,sp=(heavy?90:55)+Math.random()*(heavy?260:150);
   particles.push({
     x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
     life:(heavy?420:260)+Math.random()*260,
     c:i%3===0?'#fff7c2':i%2?'#ff7a2f':'#ffd35c'
   });
 }
 waterSplashes.push({x,y,life:heavy?900:520,max:heavy?900:520});
}

function navalExplosion(x,y,power=1){
 shake=Math.max(shake,7*power);
 impactFx(x,y,power>1.15);
 for(let ring=0;ring<3;ring++){
   const count=18+ring*6;
   for(let i=0;i<count;i++){
     const a=i/count*Math.PI*2;
     const sp=(85+ring*65)*power;
     particles.push({
       x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
       life:340+ring*130,c:ring===0?'#fff0a4':ring===1?'#ff8b32':'#d94b24'
     });
   }
 }
}
function moveWithCollision(o,nx,ny){
 const r=o.r||14;
 const ox=o.x,oy=o.y;
 const dx=nx-ox,dy=ny-oy;
 const dist=Math.hypot(dx,dy);

 // Sweep movement in small steps. This prevents a fast ship from
 // skipping through a thin shoreline between two frames.
 const stepSize=Math.max(6,r*.45);
 const steps=Math.max(1,Math.ceil(dist/stepSize));

 for(let s=1;s<=steps;s++){
   const t=s/steps;
   const tx=ox+dx*t,ty=oy+dy*t;

   if(!blockedByLand(tx,ty,r)){
     o.x=tx;o.y=ty;
     continue;
   }

   // Slide along the coast instead of becoming wedged into it.
   if(!blockedByLand(tx,o.y,r))o.x=tx;
   if(!blockedByLand(o.x,ty,r))o.y=ty;
   break;
 }
}
function spawnPickup(x,y,amount=5){
 pickups.push({x,y,amount,life:12000,bob:Math.random()*6.28});
}

function spawnFarFromPlayer(){
 let x,y,d=0;
 do{
   x=120+Math.random()*(WORLD.w-240);
   y=120+Math.random()*(WORLD.h-240);
   d=Math.hypot(x-player.x,y-player.y);
 }while(d<520 || blockedByLand(x,y,30));
 return {x,y};
}

function spawnLaneForces(){
 const lanes=[WORLD.w*.24,WORLD.w*.50,WORLD.w*.76];
 lanes.forEach((lx,i)=>{
   laneUnits.push({x:lx-26,y:WORLD.h-330,team:'ally',lane:i,hp:75,max:75,r:11,speed:52,a:-Math.PI/2});
   laneUnits.push({x:lx+26,y:330,team:'enemy',lane:i,hp:75,max:75,r:11,speed:48,a:Math.PI/2});
 });
}
function updateLaneForces(dt){
 laneSpawnTimer-=dt;
 if(laneSpawnTimer<=0){laneSpawnTimer=5;spawnLaneForces()}
 for(const u of laneUnits){
   const dir=u.team==='ally'?-1:1;
   u.y+=dir*u.speed*dt;
   u.a=dir<0?-Math.PI/2:Math.PI/2;
   // Nearby opposing lane units damage each other.
   for(const v of laneUnits){
     if(v===u||v.team===u.team)continue;
     if(Math.hypot(v.x-u.x,v.y-u.y)<55){u.hp-=18*dt;v.hp-=18*dt}
   }
 }
 laneUnits=laneUnits.filter(u=>u.hp>0&&u.y>190&&u.y<WORLD.h-190);
}
function drawLaneForces(){
 for(const u of laneUnits){
   if(!visible(u,80))continue;
   const sx=screenX(u.x),sy=screenY(u.y);
   ctx.save();ctx.translate(sx,sy);ctx.rotate(u.a+Math.PI/2);
   ctx.fillStyle=u.team==='ally'?'#45a9c6':'#a94046';
   ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=9;
   ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(9,-5);ctx.lineTo(7,15);ctx.lineTo(-7,15);ctx.lineTo(-9,-5);ctx.closePath();ctx.fill();
   ctx.fillStyle='#d6edf2';ctx.fillRect(-4,-5,8,10);
   ctx.restore();
   ctx.fillStyle='#1b1515';ctx.fillRect(sx-15,sy-24,30,4);
   ctx.fillStyle=u.team==='ally'?'#42e5c8':'#ff5b58';ctx.fillRect(sx-15,sy-24,30*Math.max(0,u.hp/u.max),4);
 }
}

function resetWave(){
 const spawn=findOpenWaterSpawn();
 player.x=spawn.x;player.y=spawn.y;
 player.r=13+shipTier*1.25;
 player.speed=SHIPS[shipTier].speed; autoFireRate=SHIPS[shipTier].rate; autoRange=SHIPS[shipTier].range;
 let n=10+Math.min(14,wave*3);
 enemies=[];laneUnits=[];laneSpawnTimer=1;
 for(let i=0;i<n;i++){
   let p=spawnFarFromPlayer(),boss=wave%5===0&&i===0;
   enemies.push({x:p.x,y:p.y,a:Math.PI/2,hp:boss?260:70,max:boss?260:70,r:boss?17:12,boss,cd:500+Math.random()*1000,type:1+i%3});
 }
 updateCamera(true);updateHUD();
}

function updateZoneLabel(){
 const z=$('#zoneName');
 if(!z)return;
 const py=player.y/WORLD.h;
 z.textContent=py<.22?'敌军领海':py<.45?'北方群岛':py<.68?'翡翠海峡':py<.88?'南方航道':'盟军港口';
}

function updateHUD(){
 $('#wave').textContent='WAVE '+wave;$('#remain').textContent='敌军 '+enemies.length;
 $('#coins').textContent=coins;$('#hpText').textContent=Math.ceil(player.hp)+'/'+player.max;
 $('#hpFill').style.width=Math.max(0,player.hp/player.max*100)+'%';
 const sl=$('#shipLevel'),uc=$('#upgradeCost');
 if(sl)sl.textContent=SHIPS[shipTier].name;
 if(uc)uc.textContent=shipTier<SHIPS.length-1?SHIPS[shipTier].cost:'MAX';
 const ss=$('#shipStats'),pt=$('#progressTitle'),px=$('#progressText');
 if(ss)ss.textContent='火力 '+SHIPS[shipTier].damage+' · 炮 '+SHIPS[shipTier].guns;
 if(pt)pt.textContent='Lv.'+(shipTier+1)+' '+SHIPS[shipTier].name;
 if(px)px.textContent=shipTier<SHIPS.length-1?'下一阶：'+SHIPS[shipTier+1].name:'已达到终极战艇';
}
function updateCamera(snap=false){
 let tx=player.x-W/2,ty=player.y-H/2;
 tx=Math.max(0,Math.min(WORLD.w-W,tx));ty=Math.max(0,Math.min(WORLD.h-H,ty));
 if(snap){camera.x=tx;camera.y=ty}
 else {camera.x+=(tx-camera.x)*.12;camera.y+=(ty-camera.y)*.12}
}
function nearestEnemy(range=autoRange){
 let best=null,bd=range;
 for(const e of enemies){
   const d=Math.hypot(e.x-player.x,e.y-player.y);
   if(d<bd){bd=d;best=e}
 }
 return best;
}
function fireAt(target,heavy=false){
 if(paused||!target)return;
 let dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy)||1;
 let a=Math.atan2(dy,dx);
 // Auto aim the tank toward the current target when firing.
 player.a=a;
 let speed=heavy?720:560;
 const guns=heavy?1:SHIPS[shipTier].guns;
 for(let gi=0;gi<guns;gi++){
   const spread=(gi-(guns-1)/2)*0.045;
   const aa=a+spread;
   bullets.push({
     x:player.x+Math.cos(aa)*48,y:player.y+Math.sin(aa)*48,
     vx:Math.cos(aa)*speed,vy:Math.sin(aa)*speed,
     life:heavy?1700:1500,f:true,heavy:heavy,
     damage:heavy?Math.round(SHIPS[shipTier].damage*2.7):Math.round(SHIPS[shipTier].damage/Math.max(1,guns*.72))
   });
 }
 muzzle(player.x+Math.cos(a)*50,player.y+Math.sin(a)*50);
 if(heavy){shake=7;for(let i=0;i<28;i++)particles.push({x:player.x+Math.cos(a)*48,y:player.y+Math.sin(a)*48,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*220,life:350,c:i%2?'#ff6b20':'#fff0a0'})}
}
function fire(){
 // FIRE button is now the heavy cannon skill.
 if(paused||heavyCooldown>0)return;
 const target=nearestEnemy(760);
 if(!target)return;
 heavyCooldown=heavyCooldownMax;
 fireAt(target,true);
}

function shockWave(){
 if(paused||shockCooldown>0)return;
 shockCooldown=shockCooldownMax;
 shake=8;

 // Damage every enemy around the player.
 for(const e of enemies){
   const d=Math.hypot(e.x-player.x,e.y-player.y);
   if(d<=shockRange){
     const dmg=70*(1-d/shockRange*.35);
     e.hp-=dmg;
     for(let i=0;i<8;i++){
       particles.push({
         x:e.x,y:e.y,
         vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,
         life:300+Math.random()*220,c:i%2?'#6fe8ff':'#d8fbff'
       });
     }
     if(e.hp<=0){awardCoins(e.boss?50:10,player.x,player.y);navalExplosion(e.x,e.y,e.boss?1.45:1);if(Math.random()<.45)spawnPickup(e.x,e.y,e.boss?20:5)}
   }
 }

 // Blue expanding rings.
 for(let i=0;i<30;i++){
   const a=i/30*Math.PI*2;
   const sp=220+Math.random()*120;
   particles.push({
     x:player.x,y:player.y,
     vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
     life:520,c:i%2?'#4dc8ff':'#b8f3ff'
   });
 }
}

function repairSkill(){
 if(paused||repairCooldown>0||player.hp>=player.max)return;
 repairCooldown=repairCooldownMax;
 player.hp=Math.min(player.max,player.hp+50);
 for(let i=0;i<26;i++){
   const a=Math.random()*Math.PI*2;
   const sp=40+Math.random()*120;
   particles.push({
     x:player.x,y:player.y,
     vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-35,
     life:500+Math.random()*320,c:i%2?'#72ffb6':'#d5ffe7'
   });
 }
 updateHUD();
}

function updateSkillUI(){
 const heavy=$('#heavyCd'),shock=$('#shockCd'),repair=$('#repairCd');
 if(heavy)heavy.textContent=heavyCooldown>0?heavyCooldown.toFixed(1)+'s':'READY';
 if(shock)shock.textContent=shockCooldown>0?shockCooldown.toFixed(1)+'s':'READY';
 if(repair)repair.textContent=repairCooldown>0?repairCooldown.toFixed(1)+'s':'READY';
 $('#fire')?.classList.toggle('cooling',heavyCooldown>0);
 $('#shock')?.classList.toggle('cooling',shockCooldown>0);
 $('#repair')?.classList.toggle('cooling',repairCooldown>0);
}

function awardCoins(amount,x=player.x,y=player.y){
 coins += amount;
 floatingTexts.push({
   x:x,y:y-34,
   text:'+$'+amount,
   life:1300,maxLife:1300,
   vy:0
 });
 updateHUD();
}

function muzzle(x,y){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:250,c:i%2?'#ffb42d':'#fff2a0'})}
function boom(x,y){shake=10;for(let i=0;i<34;i++)particles.push({x,y,vx:(Math.random()-.5)*280,vy:(Math.random()-.5)*280,life:350+Math.random()*550,c:i%3?'#ff6b20':'#ffd45a'})}
function update(dt){
 if(paused)return;
 // Safety net for old saves/map edits: never allow the player to remain trapped inside land.
 rescuePlayerFromLand();
 let mx=joy.x,my=joy.y,mag=Math.hypot(mx,my);
 if(mag>.08){
   const nx=Math.max(60,Math.min(WORLD.w-60,player.x+mx*player.speed*dt));
   const ny=Math.max(60,Math.min(WORLD.h-60,player.y+my*player.speed*dt));
   moveWithCollision(player,nx,ny);player.a=Math.atan2(my,mx);
   if(Math.random()<dt*9)waterSplashes.push({x:player.x-Math.cos(player.a)*22,y:player.y-Math.sin(player.a)*22,life:420,max:420});
 }
 autoFireTimer-=dt;
 heavyCooldown=Math.max(0,heavyCooldown-dt);
 shockCooldown=Math.max(0,shockCooldown-dt);
 repairCooldown=Math.max(0,repairCooldown-dt);
 updateLaneForces(dt);
 const autoTarget=nearestEnemy(autoRange);
 if(autoTarget&&autoFireTimer<=0){
   autoFireTimer=autoFireRate;
   fireAt(autoTarget,false);
 }

 enemies.forEach(e=>{
   let dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;e.a=Math.atan2(dy,dx);
   if(d<760&&d>150){
     const chaseSpeed=e.boss?40:56;
     steerAroundLand(e,player.x,player.y,chaseSpeed,dt);
   }else if(d<=150){
     // Circle slightly at close range instead of ramming into the player/shore.
     const orbit=e.a+(e.type%2?1:-1)*Math.PI/2;
     const nx=e.x+Math.cos(orbit)*32*dt,ny=e.y+Math.sin(orbit)*32*dt;
     moveWithCollision(e,nx,ny);
   }
   e.cd-=dt*1000;
   if(e.cd<=0&&d<620){
     e.cd=900+Math.random()*1000;
     bullets.push({x:e.x,y:e.y,vx:dx/d*270,vy:dy/d*270,life:2600,f:false});
   }
 });
 bullets.forEach(b=>{
   b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt*1000;
   if(Math.random()<dt*(b.heavy?28:13)){
     particles.push({
       x:b.x-b.vx*.025,y:b.y-b.vy*.025,
       vx:(Math.random()-.5)*24,vy:(Math.random()-.5)*24,
       life:b.heavy?260:160,c:b.f?'#e6f7ff':'#ffd0b4'
     });
   }
 });
 bullets.forEach(b=>{
   if(b.life<=0)return;
   if(b.f){
     for(let e of enemies)if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+9){
       e.hp-=(b.damage||35);b.life=0;impactFx(b.x,b.y,!!b.heavy);if(e.hp<=0){awardCoins(e.boss?50:10,player.x,player.y);navalExplosion(e.x,e.y,e.boss?1.45:1);if(Math.random()<.45)spawnPickup(e.x,e.y,e.boss?20:5)};break;
     }
   }else if(Math.hypot(b.x-player.x,b.y-player.y)<player.r+7){player.hp-=8;b.life=0;shake=5;impactFx(b.x,b.y,false)}
 });
 enemies=enemies.filter(e=>e.hp>0);
 bullets=bullets.filter(b=>b.life>0&&b.x>-80&&b.x<WORLD.w+80&&b.y>-80&&b.y<WORLD.h+80);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt*1000});
 particles=particles.filter(p=>p.life>0);
 floatingTexts.forEach(f=>{f.life-=dt*1000;if(f.life<950){f.vy=-48;f.y+=f.vy*dt}});
 floatingTexts=floatingTexts.filter(f=>f.life>0);

 waterSplashes.forEach(s=>s.life-=dt*1000);waterSplashes=waterSplashes.filter(s=>s.life>0);
 pickups.forEach(p=>{
   p.life-=dt*1000;p.bob+=dt*4;
   if(Math.hypot(p.x-player.x,p.y-player.y)<34){
     awardCoins(p.amount,player.x,player.y);p.life=0;
   }
 });
 pickups=pickups.filter(p=>p.life>0);

 if(ambientShips.length<14 && Math.random()<dt*.55){
   const edge=Math.random()<.5?0:1;
   ambientShips.push({x:120+Math.random()*(WORLD.w-240),y:edge?WORLD.h-120:120,a:edge?-Math.PI/2:Math.PI/2,
     speed:26+Math.random()*24,life:70000,kind:Math.random()<.35?'merchant':'patrol'});
 }
 ambientShips.forEach(s=>{
   s.y+=Math.sin(s.a)*s.speed*dt;s.life-=dt*1000;
 });
 ambientShips=ambientShips.filter(s=>s.life>0&&s.y>80&&s.y<WORLD.h-80);

 // Occasional distant battle flashes make the sea feel alive.
 if(Math.random()<dt*.9){
   const fx=player.x+(Math.random()-.5)*900,fy=player.y+(Math.random()-.5)*1200;
   if(fx>80&&fx<WORLD.w-80&&fy>80&&fy<WORLD.h-80&&!blockedByLand(fx,fy,8)){
     particles.push({x:fx,y:fy,vx:0,vy:0,life:120,c:'#ffd783'});
   }
 }

 if(player.hp<=0){player.hp=player.max;coins=Math.max(0,coins-10);resetWave()}
 if(enemies.length===0){wave++;resetWave()}
 updateCamera();updateHUD();updateZoneLabel();updateSkillUI();shake*=.88;
}
function screenX(x){return x-camera.x}
function screenY(y){return y-camera.y}
function visible(o,pad=180){let x=screenX(o.x),y=screenY(o.y);return x>-pad&&x<W+pad&&y>-pad&&y<H+pad}
function drawSprite(im,o,size){
 const _ambient=typeof ambientShips!=='undefined'&&ambientShips.includes(o);
 const _enemy=o!==player&&!_ambient;

 // Player: one fixed battleship image, enlarged as the ship level rises.
 if(o===player && PLAYER_BATTLESHIP_ART.complete && PLAYER_BATTLESHIP_ART.naturalWidth){
   const _sx=screenX(o.x),_sy=screenY(o.y);
   const _scale=PLAYER_SHIP_SCALE[Math.max(0,Math.min(PLAYER_SHIP_SCALE.length-1,shipTier))];
   const _base=92;
   const _w=_base*_scale;
   const _h=_w*(PLAYER_BATTLESHIP_ART.naturalHeight/PLAYER_BATTLESHIP_ART.naturalWidth);
   ctx.save();
   ctx.translate(_sx,_sy);
   ctx.rotate(o.a+Math.PI/2);
   ctx.globalAlpha=1;
   ctx.filter='brightness(1.18) contrast(1.08) saturate(1.10)';
   ctx.shadowColor='#7cecff';
   ctx.shadowBlur=8;
   ctx.drawImage(PLAYER_BATTLESHIP_ART,-_w/2,-_h/2,_w,_h);
   ctx.restore();
   ctx.filter='none';
   return;
 }

 const sx=screenX(o.x),sy=screenY(o.y),ambient=ambientShips.includes(o),enemy=o!==player&&!ambient;
 let tier=o===player?shipTier:(enemy?(o.boss?7:Math.min(6,(o.type||1)+1)):(o.kind==='merchant'?3:4));
 ctx.save();ctx.translate(sx,sy);ctx.rotate(o.a+Math.PI/2);

 // wake
 ctx.globalAlpha=.42;ctx.strokeStyle='#d7fbff';ctx.lineWidth=2;
 for(let k=0;k<3;k++){let d=size*(.55+k*.13);ctx.beginPath();ctx.moveTo(-size*.15,size*.30);ctx.quadraticCurveTo(-size*.28,d*.72,-size*(.30+k*.08),d);ctx.stroke();
 ctx.beginPath();ctx.moveTo(size*.15,size*.30);ctx.quadraticCurveTo(size*.28,d*.72,size*(.30+k*.08),d);ctx.stroke();}
 // shadow
 ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(5,9,size*.36,size*.59,0,0,7);ctx.fill();ctx.globalAlpha=1;

 const war=tier>=5;
 // hull
 ctx.fillStyle=enemy?'#71362f':ambient?'#6d5b43':war?'#526873':'#855a37';
 ctx.strokeStyle=enemy?'#ff9b82':'#d5edf0';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(0,-size*.68);ctx.quadraticCurveTo(size*.34,-size*.42,size*.36,-size*.10);
 ctx.lineTo(size*.28,size*.48);ctx.quadraticCurveTo(0,size*.68,-size*.28,size*.48);ctx.lineTo(-size*.36,-size*.10);
 ctx.quadraticCurveTo(-size*.34,-size*.42,0,-size*.68);ctx.closePath();ctx.fill();ctx.stroke();

 // deck
 ctx.fillStyle=war?'#9aa6a8':'#b07b48';ctx.beginPath();ctx.ellipse(0,0,size*.23,size*.43,0,0,7);ctx.fill();
 ctx.strokeStyle='#513b27';ctx.lineWidth=1;for(let q=-2;q<=2;q++){ctx.beginPath();ctx.moveTo(-size*.18,q*size*.12);ctx.lineTo(size*.18,q*size*.12);ctx.stroke();}

 if(!war){
   // masts + layered sails
   ctx.strokeStyle='#30271f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-size*.38);ctx.lineTo(0,size*.38);ctx.stroke();
   const sails=tier>=3?3:tier>=2?2:1;
   for(let m=0;m<sails;m++){
     let yy=-size*.28+m*size*.25,side=m%2? -1:1;
     ctx.fillStyle=enemy?'#b86d59':ambient?'#d6c18d':'#eee0b9';
     ctx.beginPath();ctx.moveTo(side*2,yy-size*.12);ctx.lineTo(side*size*(.22+.03*m),yy);ctx.lineTo(side*2,yy+size*.13);ctx.closePath();ctx.fill();
   }
 }else{
   // armored superstructure + turrets
   ctx.fillStyle=enemy?'#554844':'#b6c0c1';ctx.fillRect(-size*.15,-size*.05,size*.30,size*.30);
   ctx.fillStyle='#314148';ctx.fillRect(-size*.06,-size*.29,size*.12,size*.23);
   let guns=o===player?SHIPS[shipTier].guns:(o.boss?4:2);
   for(let g=0;g<Math.min(4,guns);g++){let gy=-size*.43+g*size*.20;ctx.fillStyle='#202c31';ctx.beginPath();ctx.arc(0,gy,size*.085,0,7);ctx.fill();ctx.fillRect(-2,gy-size*.20,4,size*.20);}
 }
 // side gun ports
 if(tier>=2){ctx.fillStyle='#11181a';for(let q=-1;q<=1;q++){ctx.beginPath();ctx.arc(size*.285,q*size*.17,2.3,0,7);ctx.fill();ctx.beginPath();ctx.arc(-size*.285,q*size*.17,2.3,0,7);ctx.fill();}}
 // faction pennant
 ctx.strokeStyle='#2a2118';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-size*.32);ctx.lineTo(0,-size*.51);ctx.stroke();
 ctx.fillStyle=enemy?'#d9483d':ambient?'#e0c36b':'#31d8ca';ctx.beginPath();ctx.moveTo(0,-size*.51);ctx.lineTo(size*.14,-size*.46);ctx.lineTo(0,-size*.42);ctx.fill();
 ctx.restore();
}
function drawWorldBackground(){
 const g=ctx.createLinearGradient(0,0,W,H);
 g.addColorStop(0,'#050c2f');g.addColorStop(.48,'#071b4b');g.addColorStop(1,'#050a24');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

 // Deep-water flowing streaks
 ctx.save();
 ctx.globalAlpha=.16;ctx.strokeStyle='#285c92';ctx.lineWidth=2;
 for(let wy=Math.floor(camera.y/76)*76;wy<camera.y+H+76;wy+=76){
   const y=wy-camera.y;
   for(let wx=Math.floor(camera.x/150)*150;wx<camera.x+W+180;wx+=150){
     const x=wx-camera.x;
     ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+25,y-8,x+55,y+7,x+82,y);ctx.stroke();
   }
 }
 ctx.restore();

 // Dense organic islands, darker like Warcraft III terrain.
 for(let n=0;n<MAP_ISLANDS.length;n++){
   const i=MAP_ISLANDS[n],x=i.x-camera.x,y=i.y-camera.y;
   if(x<-i.rx*1.8||x>W+i.rx*1.8||y<-i.ry*1.8||y>H+i.ry*1.8)continue;
   ctx.save();ctx.translate(x,y);ctx.rotate((n%5-2)*.08);

   // murky shallow ring
   ctx.fillStyle='#4f8c8250';ctx.beginPath();ctx.ellipse(0,0,i.rx*1.22,i.ry*1.22,0,0,7);ctx.fill();
   ctx.strokeStyle='#80afa05c';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,i.rx*1.15,i.ry*1.15,0,0,7);ctx.stroke();

   // rugged shoreline
   let pts=[];
   for(let k=0;k<44;k++){
     let a=k/44*Math.PI*2;
     let noise=1+Math.sin(k*2.17+n)*.08+Math.sin(k*5.3+n*.8)*.045;
     pts.push([Math.cos(a)*i.rx*noise,Math.sin(a)*i.ry*noise]);
   }
   ctx.fillStyle='#54614a';ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
   // inner dark soil/forest floor
   ctx.fillStyle='#15291f';ctx.beginPath();ctx.ellipse(0,-3,i.rx*.85,i.ry*.78,0,0,7);ctx.fill();

   // many dense tree crowns
   for(let k=0;k<52;k++){
     const a=k*2.399+n*.6,rr=.08+(k%9)*.085;
     const tx=Math.cos(a)*i.rx*rr,ty=Math.sin(a)*i.ry*rr*.84;
     const r=5+(k%5)*1.8;
     ctx.fillStyle=k%4===0?'#0b2f23':k%4===1?'#103c29':k%4===2?'#17472d':'#1c5532';
     ctx.beginPath();ctx.arc(tx,ty,r,0,7);ctx.fill();
   }

   // shoreline rocks / ruins
   ctx.fillStyle='#6b6f67';
   for(let k=0;k<13;k++){
     let a=k*.71+n*.35;
     ctx.beginPath();ctx.ellipse(Math.cos(a)*i.rx*.83,Math.sin(a)*i.ry*.68,4+(k%3)*3,3+(k%2)*2,a,0,7);ctx.fill();
   }
   if(n%3===0){
     ctx.fillStyle='#2c2c28';ctx.fillRect(-9,-18,18,20);ctx.fillStyle='#535449';ctx.fillRect(-14,-22,28,6);
   }
   ctx.restore();
 }

 // reefs
 for(const q of REEFS){
   const x=q.x-camera.x,y=q.y-camera.y;if(x<-90||x>W+90||y<-90||y>H+90)continue;
   ctx.save();ctx.globalAlpha=.85;ctx.fillStyle='#4f5b5f';
   for(let k=0;k<9;k++){let a=k*.72;ctx.beginPath();ctx.arc(x+Math.cos(a)*q.r*.45,y+Math.sin(a)*q.r*.33,4+(k%4)*2,0,7);ctx.fill()}
   ctx.strokeStyle='#698f8d66';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,y,q.r*1.1,q.r*.62,.25,0,7);ctx.stroke();ctx.restore();
 }

 // smoky dark vignette
 const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.18,W/2,H/2,Math.max(W,H)*.72);
 v.addColorStop(.45,'#0000');v.addColorStop(1,'#0009');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
function drawMiniMap(){
 const mw=118,mh=118,x=W-mw-18,y=120;
 ctx.save();ctx.globalAlpha=.92;ctx.fillStyle='#06100ddd';ctx.fillRect(x,y,mw,mh);
 ctx.strokeStyle='#d9c06c';ctx.lineWidth=2;ctx.strokeRect(x,y,mw,mh);
 MAP_ISLANDS.forEach(i=>{ctx.fillStyle='#486b45';ctx.beginPath();ctx.ellipse(x+i.x/WORLD.w*mw,y+i.y/WORLD.h*mh,Math.max(2,i.rx/WORLD.w*mw),Math.max(2,i.ry/WORLD.h*mh),0,0,7);ctx.fill()});
 enemies.forEach(e=>{ctx.fillStyle=e.boss?'#ffad33':'#ff4d4d';ctx.fillRect(x+e.x/WORLD.w*mw-1.5,y+e.y/WORLD.h*mh-1.5,e.boss?5:3,e.boss?5:3)});
 ctx.fillStyle='#55fff0';ctx.beginPath();ctx.arc(x+player.x/WORLD.w*mw,y+player.y/WORLD.h*mh,4,0,7);ctx.fill();
 ctx.strokeStyle='#ffffff66';ctx.strokeRect(x+camera.x/WORLD.w*mw,y+camera.y/WORLD.h*mh,Math.min(mw,W/WORLD.w*mw),Math.min(mh,H/WORLD.h*mh));
 ctx.restore();
}


function drawWorldElements(){
 PORTS.forEach(p=>{
   const x=p.x-camera.x,y=p.y-camera.y;if(x<-220||x>W+220||y<-150||y>H+150)return;
   ctx.save();
   // stone harbor platform
   ctx.fillStyle='#403d34';ctx.fillRect(x-120,y-35,240,70);
   ctx.strokeStyle='#756b54';ctx.lineWidth=3;ctx.strokeRect(x-120,y-35,240,70);
   // wooden piers
   ctx.fillStyle='#77593a';
   for(let k=-3;k<=3;k++){ctx.fillRect(x+k*32-5,y-72,10,105);ctx.fillRect(x+k*32-14,y-72,28,8)}
   // two defense towers
   for(let side of [-1,1]){
     let tx=x+side*92,ty=y-43;
     ctx.fillStyle='#6e6b5d';ctx.beginPath();ctx.arc(tx,ty,15,0,7);ctx.fill();
     ctx.fillStyle='#292e2d';ctx.fillRect(tx-3,ty-23,6,24);
     ctx.fillStyle=p.team==='ally'?'#62e8d0':'#ff675b';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
     ctx.beginPath();ctx.arc(tx,ty-27,4,0,7);ctx.fill();ctx.shadowBlur=0;
   }
   ctx.fillStyle='#f0d783';ctx.font='900 12px Georgia';ctx.textAlign='center';
   ctx.fillText(p.team==='ally'?'⚓ ALLY HARBOR':'☠ ENEMY HARBOR',x,y+52);ctx.restore();
 });

 const props=[
  ['crate',640,2050],['barrel',3820,2100],['wreck',2200,2750],['tower',1080,3950],
  ['crate',3420,4250],['wreck',1550,5250],['barrel',3100,5550],['tower',3650,1200],
  ['wreck',2550,1500],['crate',980,4450],['tower',2450,5200]
 ];
 props.forEach(([t,wx,wy],idx)=>{
   const x=wx-camera.x,y=wy-camera.y;if(x<-70||x>W+70||y<-70||y>H+70)return;ctx.save();
   if(t==='crate'){ctx.fillStyle='#8a5d31';ctx.fillRect(x-12,y-12,24,24);ctx.strokeStyle='#e0b76b';ctx.lineWidth=2;ctx.strokeRect(x-12,y-12,24,24);
     ctx.beginPath();ctx.moveTo(x-10,y-10);ctx.lineTo(x+10,y+10);ctx.moveTo(x+10,y-10);ctx.lineTo(x-10,y+10);ctx.stroke();}
   else if(t==='barrel'){ctx.fillStyle='#774829';ctx.beginPath();ctx.ellipse(x,y,9,13,0,0,7);ctx.fill();ctx.strokeStyle='#c08b55';ctx.lineWidth=2;ctx.stroke();}
   else if(t==='wreck'){ctx.fillStyle='#2d251f';ctx.beginPath();ctx.ellipse(x,y,26,10,-.3,0,7);ctx.fill();ctx.strokeStyle='#5a432e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-22,y+13);ctx.lineTo(x+21,y-12);ctx.stroke();
     ctx.strokeStyle='#8b7758';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+4,y-10);ctx.lineTo(x+4,y-32);ctx.stroke();}
   else {ctx.fillStyle='#625b4b';ctx.fillRect(x-10,y-19,20,35);ctx.fillStyle='#8a7a5d';ctx.fillRect(x-15,y-26,30,9);
     ctx.fillStyle='#ffb23e';ctx.shadowColor='#ff7b20';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y-31,5,0,7);ctx.fill();}
   ctx.restore();
 });

 pickups.forEach(p=>{
   const x=screenX(p.x),y=screenY(p.y)+Math.sin(p.bob)*3;if(x<-30||x>W+30||y<-30||y>H+30)return;
   ctx.save();ctx.shadowColor='#ffd84c';ctx.shadowBlur=16;ctx.fillStyle='#f3ca49';ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.fill();
   ctx.fillStyle='#765111';ctx.font='900 10px Arial';ctx.textAlign='center';ctx.fillText('$',x,y+4);ctx.restore();
 });
 ambientShips.forEach(s=>{if(visible(s,80))drawSprite(null,s,s.kind==='merchant'?38:34)});
}
function drawBattleLanes(){
 ctx.save();
 // Subtle navigational lanes only — no translucent rectangles.
 ctx.globalAlpha=.10;ctx.strokeStyle='#9feeff';ctx.lineWidth=3;ctx.setLineDash([24,34]);
 [WORLD.w*.28,WORLD.w*.50,WORLD.w*.72].forEach(x=>{
   ctx.beginPath();ctx.moveTo(x-camera.x,-camera.y);ctx.lineTo(x-camera.x,WORLD.h-camera.y);ctx.stroke();
 });
 ctx.setLineDash([]);

 // Friendly / enemy harbours
 const ports=[
  {x:WORLD.w/2,y:WORLD.h-220,ally:true},
  {x:WORLD.w/2,y:220,ally:false}
 ];
 ports.forEach(p=>{
   let x=p.x-camera.x,y=p.y-camera.y;
   ctx.globalAlpha=.9;ctx.fillStyle=p.ally?'#3d7b72':'#783b38';
   ctx.fillRect(x-90,y-26,180,52);
   ctx.fillStyle='#765d3d';
   for(let k=-2;k<=2;k++)ctx.fillRect(x+k*34-5,y-55,10,70);
   ctx.fillStyle='#e4d4a2';ctx.font='900 13px Arial';ctx.textAlign='center';
   ctx.fillText(p.ally?'ALLY PORT':'ENEMY PORT',x,y+48);
 });

 // Decorative buoys, wreckage and supply crates.
 const deco=[
  ['buoy',900,1250],['crate',3350,1550],['wreck',1900,2450],
  ['buoy',3200,3350],['crate',900,4200],['wreck',2700,5050],
  ['crate',2100,5600],['buoy',1150,5350]
 ];
 deco.forEach(([t,wx,wy],i)=>{
   let x=wx-camera.x,y=wy-camera.y;
   if(x<-60||x>W+60||y<-60||y>H+60)return;
   ctx.globalAlpha=.95;
   if(t==='buoy'){
     ctx.fillStyle='#d64a32';ctx.beginPath();ctx.arc(x,y,7,0,7);ctx.fill();
     ctx.strokeStyle='#f4df91';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-6);ctx.lineTo(x,y-18);ctx.stroke();
   }else if(t==='crate'){
     ctx.fillStyle='#8b6439';ctx.fillRect(x-12,y-12,24,24);ctx.strokeStyle='#d3aa66';ctx.strokeRect(x-12,y-12,24,24);
     ctx.beginPath();ctx.moveTo(x-10,y-10);ctx.lineTo(x+10,y+10);ctx.moveTo(x+10,y-10);ctx.lineTo(x-10,y+10);ctx.stroke();
   }else{
     ctx.strokeStyle='#5a4939';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-20,y+10);ctx.lineTo(x+18,y-10);ctx.stroke();
     ctx.fillStyle='#372e28';ctx.beginPath();ctx.ellipse(x,y,22,9,-.3,0,7);ctx.fill();
   }
 });
 ctx.restore();
}

function drawUnitHealth(o,width=42){
 const sx=screenX(o.x),sy=screenY(o.y);
 const hp=o.hp??o.max??100, max=o.max??100;
 ctx.save();
 ctx.fillStyle='#151515dd';ctx.fillRect(sx-width/2,sy-34,width,5);
 ctx.fillStyle=(o===player||o.team==='ally')?'#58d6a7':'#e34c4c';
 ctx.fillRect(sx-width/2,sy-34,width*Math.max(0,hp/max),5);
 ctx.strokeStyle='#d9c87099';ctx.lineWidth=1;ctx.strokeRect(sx-width/2,sy-34,width,5);
 ctx.restore();
}

function draw(){
 
 ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 drawWorldBackground();drawWorldElements();
 drawBattleLanes();

 waterSplashes.forEach(s=>{
   const x=screenX(s.x),y=screenY(s.y);ctx.save();ctx.globalAlpha=Math.max(0,s.life/s.max);
   ctx.strokeStyle='#d8fbff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,6+(1-s.life/s.max)*18,0,7);ctx.stroke();ctx.restore();
 });

 // subtle unexplored-war atmosphere
 let fog=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.20,W/2,H/2,Math.max(W,H)*.78);
 fog.addColorStop(0,'#0000');fog.addColorStop(1,'#00000055');ctx.fillStyle=fog;ctx.fillRect(0,0,W,H);
 let shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#00120b44');shade.addColorStop(.62,'#0000');shade.addColorStop(1,'#0008');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);

 drawLaneForces();
 enemies.forEach(e=>{
   if(!visible(e))return;
   drawSprite(null,e,e.boss?58:38);drawUnitHealth(e,e.boss?56:42);
   let sx=screenX(e.x),sy=screenY(e.y);
   ctx.save();
   ctx.strokeStyle=e.boss?'#ffb24d':'#ff5d63';ctx.lineWidth=e.boss?3:2;
   ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=e.boss?14:8;
   ctx.beginPath();ctx.arc(sx,sy,e.boss?26:21,0,Math.PI*2);ctx.stroke();ctx.restore();
   ctx.fillStyle='#351013';ctx.fillRect(sx-36,sy-70,72,8);
   ctx.fillStyle=e.boss?'#ff9a2d':'#ff4047';ctx.fillRect(sx-36,sy-70,72*Math.max(0,e.hp/e.max),8);
 });
 drawSprite(null,player,Math.max(34,SHIPS[shipTier].size*.78));drawUnitHealth(player,50);
 let px=screenX(player.x),py=screenY(player.y);
 // High-contrast player locator: soft dark plate + cyan dual ring + direction tick.
 ctx.save();
 ctx.fillStyle='#00181499';
 ctx.beginPath();ctx.arc(px,py,31,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#77fff3';ctx.lineWidth=3;ctx.shadowColor='#00ffe5';ctx.shadowBlur=20;
 ctx.beginPath();ctx.arc(px,py,28,0,Math.PI*2);ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle='#00bfaeaa';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.arc(px,py,34,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#fff6';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(px+Math.cos(player.a)*28,py+Math.sin(player.a)*28);
 ctx.lineTo(px+Math.cos(player.a)*38,py+Math.sin(player.a)*38);ctx.stroke();
 ctx.restore();

 bullets.forEach(b=>{if(!visible(b,60))return;let x=screenX(b.x),y=screenY(b.y);ctx.strokeStyle=b.f?'#ffd36b':'#ff713e';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=22;ctx.lineWidth=b.heavy?8:4;ctx.beginPath();ctx.moveTo(x-b.vx*(b.heavy?.055:.035),y-b.vy*(b.heavy?.055:.035));ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#fff7b2';ctx.beginPath();ctx.arc(x,y,b.heavy?7:3.5,0,7);ctx.fill()});
 particles.forEach(p=>{if(!visible(p,80))return;let x=screenX(p.x),y=screenY(p.y);ctx.globalAlpha=Math.min(1,p.life/250);ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(x,y,2+Math.min(6,p.life/100),0,7);ctx.fill();ctx.globalAlpha=1});
 floatingTexts.forEach(f=>{
   let x=screenX(f.x),y=screenY(f.y);
   let a=Math.max(0,Math.min(1,f.life/f.maxLife));
   ctx.save();
   ctx.globalAlpha=Math.min(1,a*1.7);
   ctx.textAlign='center';
   ctx.font='900 25px Arial';
   ctx.lineWidth=5;
   ctx.strokeStyle='#09230f';
   ctx.shadowColor='#ffd84d';
   ctx.shadowBlur=12;
   ctx.strokeText(f.text,x,y);
   ctx.fillStyle='#ffe35b';
   ctx.fillText(f.text,x,y);
   ctx.restore();
 });
 drawMiniMap();
 ctx.restore();
}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

$('#fire').addEventListener('pointerdown',e=>{e.preventDefault();fire()});
$('#repair').addEventListener('pointerdown',e=>{e.preventDefault();repairSkill()});
$('#shock').addEventListener('pointerdown',e=>{e.preventDefault();shockWave()});

function showMainMenu(){
 paused=true;
 pauseMenu.classList.remove('show');
 exitScreen.classList.remove('show');
 mainMenu?.classList.add('show');
}
function startFromMainMenu(){
 mainMenu?.classList.remove('show');
 paused=false;
 last=performance.now();
}
$('#startGameBtn')?.addEventListener('pointerdown',e=>{
 e.preventDefault();
 startFromMainMenu();
});
$('#mainMenuBtn')?.addEventListener('pointerdown',e=>{
 e.preventDefault();
 showMainMenu();
});

$('#pause').onclick=()=>{paused=true;pauseMenu.classList.add('show')};
$('#resumeGame').onclick=()=>{pauseMenu.classList.remove('show');paused=false;last=performance.now()};
$('#restartGame').onclick=()=>{pauseMenu.classList.remove('show');paused=false;wave=1;coins=0;player.hp=player.max;bullets=[];particles=[];floatingTexts=[];pickups=[];ambientShips=[];waterSplashes=[];autoFireTimer=0;heavyCooldown=0;shockCooldown=0;repairCooldown=0;resetWave();updateSkillUI();last=performance.now()};
$('#exitGame').onclick=()=>{paused=true;pauseMenu.classList.remove('show');exitScreen.classList.add('show');try{window.close()}catch(e){}};
$('#backToGame').onclick=()=>{exitScreen.classList.remove('show');showMainMenu()};

let J=$('#joy'),knob=J.querySelector('i'),pid=null;
function moveJoy(e){let r=J.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.hypot(x,y),max=Math.max(42,r.width*.31);if(m>max){x=x/m*max;y=y/m*max}joy.x=x/max;joy.y=y/max;knob.style.transform=`translate(${x}px,${y}px)`}
J.addEventListener('pointerdown',e=>{pid=e.pointerId;J.classList.add('active');J.setPointerCapture(pid);moveJoy(e)});
J.addEventListener('pointermove',e=>{if(e.pointerId===pid)moveJoy(e)});
J.addEventListener('pointerup',e=>{pid=null;joy.x=joy.y=0;J.classList.remove('active');knob.style.transform='translate(0,0)'});
J.addEventListener('pointercancel',()=>{pid=null;joy.x=joy.y=0;J.classList.remove('active');knob.style.transform='translate(0,0)'});


function upgradeShip(){
 if(paused || shipTier>=SHIPS.length-1)return;
 const cost=SHIPS[shipTier].cost;
 if(coins<cost)return;
 coins-=cost; shipTier++;
 const s=SHIPS[shipTier];
 const ratio=Math.max(.35,player.hp/player.max);
 player.max=s.hp; player.hp=Math.round(s.hp*ratio);
 player.speed=s.speed; autoFireRate=s.rate; autoRange=s.range;
 // Slightly increase collision radius as the same battleship grows visually.
 player.r=13+shipTier*1.25;
 boom(player.x,player.y); updateHUD();
}
$('#upgradeShip')?.addEventListener('pointerdown',e=>{e.preventDefault();upgradeShip()});

updateSkillUI();


