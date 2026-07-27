// ===== V9.0 FINAL CANVAS EDITION =====
// Complete no-asset visual rebuild.

// ===== V7 NO-ASSET CARTOON EDITION =====
// All gameplay art is drawn directly with Canvas. No assets folder required.
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
 {x:420,y:650,rx:420,ry:330},{x:520,y:1320,rx:470,ry:360},{x:460,y:2060,rx:440,ry:350},
 {x:520,y:2850,rx:480,ry:390},{x:430,y:3680,rx:430,ry:360},{x:520,y:4550,rx:470,ry:380},
 {x:470,y:5400,rx:450,ry:360},{x:530,y:6250,rx:490,ry:390},
 {x:WORLD.w-420,y:760,rx:430,ry:340},{x:WORLD.w-500,y:1540,rx:470,ry:370},
 {x:WORLD.w-430,y:2350,rx:420,ry:350},{x:WORLD.w-520,y:3180,rx:490,ry:390},
 {x:WORLD.w-450,y:4050,rx:440,ry:370},{x:WORLD.w-520,y:4920,rx:480,ry:390},
 {x:WORLD.w-440,y:5750,rx:430,ry:350},{x:WORLD.w-520,y:6500,rx:470,ry:360},
 {x:1650,y:1150,rx:170,ry:105},{x:2950,y:1700,rx:150,ry:95},
 {x:1700,y:2500,rx:140,ry:90},{x:3000,y:3000,rx:165,ry:100},
 {x:1550,y:3850,rx:155,ry:95},{x:3000,y:4400,rx:145,ry:90},
 {x:1700,y:5250,rx:170,ry:105},{x:3000,y:5900,rx:150,ry:95}
];
const REEFS=[
 {x:1400,y:900,r:42},{x:3150,y:1200,r:46},{x:2050,y:1800,r:38},{x:2550,y:2350,r:44},
 {x:1450,y:3200,r:48},{x:3200,y:3600,r:44},{x:2100,y:4200,r:46},{x:2650,y:4950,r:42},
 {x:1500,y:5700,r:46},{x:3200,y:6200,r:44}
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
 for(const i of MAP_ISLANDS){
   const nx=(x-i.x)/(i.rx*1.05),ny=(y-i.y)/(i.ry*1.05);
   if(nx*nx+ny*ny<1)return true;
 }
 for(const q of REEFS){
   if(Math.hypot(x-q.x,y-q.y)<q.r+r)return true;
 }
 return false;
}
function moveWithCollision(o,nx,ny){
 if(!blockedByLand(nx,ny,o.r||14)){o.x=nx;o.y=ny;return}
 if(!blockedByLand(nx,o.y,o.r||14))o.x=nx;
 if(!blockedByLand(o.x,ny,o.r||14))o.y=ny;
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
 player.x=WORLD.w/2;player.y=WORLD.h-760;
 player.speed=SHIPS[shipTier].speed;autoFireRate=SHIPS[shipTier].rate;autoRange=SHIPS[shipTier].range;
 let n=10+Math.min(14,wave*3);
 enemies=[];laneUnits=[];laneSpawnTimer=1;
 for(let i=0;i<n;i++){
   let x,y,tries=0;
   do{
     x=WORLD.w*.31+Math.random()*WORLD.w*.38;
     y=380+Math.random()*(WORLD.h-1500);
     tries++;
   }while((Math.hypot(x-player.x,y-player.y)<650||blockedByLand(x,y,30))&&tries<120);
   let boss=wave%5===0&&i===0;
   enemies.push({x,y,a:Math.PI/2,hp:boss?300:78,max:boss?300:78,r:boss?18:13,boss,cd:450+Math.random()*900,type:1+i%3});
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
     if(e.hp<=0){awardCoins(e.boss?50:10,player.x,player.y);boom(e.x,e.y);if(Math.random()<.45)spawnPickup(e.x,e.y,e.boss?20:5)}
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

function muzzle(x,y){for(let i=0;i<20;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.5)*210,life:220+Math.random()*180,c:i%3===0?'#fff6c7':i%2?'#ff8b25':'#ffd15a'})}
function boom(x,y){shake=13;for(let i=0;i<58;i++)particles.push({x,y,vx:(Math.random()-.5)*340,vy:(Math.random()-.5)*340,life:360+Math.random()*720,c:i%5===0?'#fff4b0':i%3?'#ff6320':'#ffd34d'})}
function update(dt){
 if(paused)return;
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
   if(d<720&&d>145){
     const nx=e.x+dx/d*(e.boss?38:52)*dt,ny=e.y+dy/d*(e.boss?38:52)*dt;
     moveWithCollision(e,nx,ny);
   }
   e.cd-=dt*1000;
   if(e.cd<=0&&d<620){
     e.cd=900+Math.random()*1000;
     bullets.push({x:e.x,y:e.y,vx:dx/d*270,vy:dy/d*270,life:2600,f:false});
   }
 });
 bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt*1000});
 bullets.forEach(b=>{
   if(b.life<=0)return;
   if(b.f){
     for(let e of enemies)if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+9){
       e.hp-=(b.damage||35);b.life=0;muzzle(b.x,b.y);if(e.hp<=0){awardCoins(e.boss?50:10,player.x,player.y);boom(e.x,e.y);if(Math.random()<.45)spawnPickup(e.x,e.y,e.boss?20:5)};break;
     }
   }else if(Math.hypot(b.x-player.x,b.y-player.y)<player.r+7){player.hp-=8;b.life=0;shake=5}
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

 if(player.hp<=0){player.hp=player.max;coins=Math.max(0,coins-10);resetWave()}
 if(enemies.length===0){wave++;resetWave()}
 updateCamera();updateHUD();updateZoneLabel();updateSkillUI();shake*=.88;
}
function screenX(x){return x-camera.x}
function screenY(y){return y-camera.y}
function visible(o,pad=180){let x=screenX(o.x),y=screenY(o.y);return x>-pad&&x<W+pad&&y>-pad&&y<H+pad}
function drawSprite(im,o,size){
 const sx=screenX(o.x),sy=screenY(o.y);
 const ambient=ambientShips.includes(o),enemy=o!==player&&!ambient,boss=!!o.boss;
 const hull=enemy?(boss?'#a72c25':'#c24733'):ambient?'#8d7049':'#159f9c';
 const hullDark=enemy?'#64251e':ambient?'#5a492f':'#075e64';
 const deck=enemy?'#d47b57':ambient?'#b99461':'#6ed7ca';
 ctx.save();ctx.translate(sx,sy);ctx.rotate(o.a+Math.PI/2);

 ctx.globalAlpha=.22;ctx.fillStyle='#001722';ctx.beginPath();ctx.ellipse(5,10,size*.43,size*.73,0,0,7);ctx.fill();ctx.globalAlpha=1;
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let q=0;q<3;q++){
   ctx.globalAlpha=.30-q*.07;ctx.strokeStyle=q===0?'#ecffff':'#6ed6ee';ctx.lineWidth=2.5-q*.4;
   ctx.beginPath();ctx.moveTo(-size*.13,size*.40);ctx.quadraticCurveTo(-size*(.30+q*.06),size*(.62+q*.06),-size*(.44+q*.10),size*(.94+q*.12));ctx.stroke();
   ctx.beginPath();ctx.moveTo(size*.13,size*.40);ctx.quadraticCurveTo(size*(.30+q*.06),size*(.62+q*.06),size*(.44+q*.10),size*(.94+q*.12));ctx.stroke();
 }ctx.restore();

 ctx.fillStyle='#172126';ctx.beginPath();ctx.moveTo(0,-size*.76);ctx.quadraticCurveTo(size*.41,-size*.52,size*.43,-size*.16);
 ctx.lineTo(size*.35,size*.53);ctx.quadraticCurveTo(0,size*.76,-size*.35,size*.53);ctx.lineTo(-size*.43,-size*.16);
 ctx.quadraticCurveTo(-size*.41,-size*.52,0,-size*.76);ctx.closePath();ctx.fill();

 ctx.fillStyle=hull;ctx.beginPath();ctx.moveTo(0,-size*.69);ctx.quadraticCurveTo(size*.34,-size*.46,size*.36,-size*.15);
 ctx.lineTo(size*.29,size*.46);ctx.quadraticCurveTo(0,size*.66,-size*.29,size*.46);ctx.lineTo(-size*.36,-size*.15);
 ctx.quadraticCurveTo(-size*.34,-size*.46,0,-size*.69);ctx.closePath();ctx.fill();

 ctx.fillStyle=hullDark;ctx.fillRect(-size*.38,-size*.12,size*.08,size*.50);ctx.fillRect(size*.30,-size*.12,size*.08,size*.50);
 for(let k=0;k<5;k++){let yy=-size*.08+k*size*.10;ctx.fillStyle='#202a2f';
   ctx.beginPath();ctx.arc(-size*.40,yy,size*.045,0,7);ctx.fill();ctx.beginPath();ctx.arc(size*.40,yy,size*.045,0,7);ctx.fill();}

 ctx.fillStyle=deck;ctx.beginPath();ctx.roundRect(-size*.20,-size*.34,size*.40,size*.66,size*.08);ctx.fill();
 ctx.fillStyle='#1b3439';ctx.beginPath();ctx.roundRect(-size*.12,-size*.05,size*.24,size*.24,size*.06);ctx.fill();

 const ty=-size*.30;
 ctx.fillStyle=enemy?'#7b3027':'#0d686a';ctx.beginPath();ctx.arc(0,ty,size*.16,0,7);ctx.fill();
 ctx.strokeStyle='#151d20';ctx.lineCap='round';ctx.lineWidth=size*.085;ctx.beginPath();ctx.moveTo(0,ty-size*.05);ctx.lineTo(0,-size*.73);ctx.stroke();
 ctx.strokeStyle='#b9d0d3';ctx.lineWidth=size*.045;ctx.beginPath();ctx.moveTo(-size*.012,ty-size*.05);ctx.lineTo(-size*.012,-size*.70);ctx.stroke();

 ctx.fillStyle='#ffffff35';ctx.beginPath();ctx.ellipse(-size*.10,-size*.34,size*.065,size*.18,-.25,0,7);ctx.fill();
 ctx.fillStyle=enemy?'#ff8a6a':'#81f9e8';ctx.beginPath();ctx.moveTo(0,-size*.66);ctx.lineTo(size*.10,-size*.53);ctx.lineTo(-size*.10,-size*.53);ctx.closePath();ctx.fill();

 ctx.strokeStyle='#2a241f';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(size*.18,size*.10);ctx.lineTo(size*.18,-size*.18);ctx.stroke();
 ctx.fillStyle=enemy?'#ff3c34':'#42f1d4';ctx.beginPath();ctx.moveTo(size*.18,-size*.18);ctx.lineTo(size*.35,-size*.13);ctx.lineTo(size*.18,-size*.07);ctx.fill();

 if(boss){
   ctx.strokeStyle='#161c1f';ctx.lineWidth=size*.055;
   ctx.beginPath();ctx.moveTo(-size*.10,ty);ctx.lineTo(-size*.10,-size*.73);ctx.stroke();
   ctx.beginPath();ctx.moveTo(size*.10,ty);ctx.lineTo(size*.10,-size*.73);ctx.stroke();
 }
 ctx.restore();
}
function drawWorldBackground(){
 const g=ctx.createLinearGradient(0,0,W,H);
 g.addColorStop(0,'#06466e');g.addColorStop(.46,'#087e98');g.addColorStop(1,'#065276');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

 const tt=performance.now()*.001;
 ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
 for(let row=-1;row<Math.ceil(H/78)+2;row++){
   let y=row*78-((camera.y*.11)%78);
   for(let col=-1;col<Math.ceil(W/150)+2;col++){
     let x=col*150-((camera.x*.08)%150)+Math.sin(tt*1.2+row+col)*12;
     ctx.globalAlpha=.10;ctx.strokeStyle='#8de7f0';ctx.lineWidth=1.5;
     ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+24,y-5,x+49,y+6,x+78,y);ctx.stroke();
   }
 }
 for(let k=0;k<30;k++){
   let x=((k*173+tt*20*(k%3+1))%(W+140))-70,y=((k*97+Math.sin(tt+k)*30)%(H+80))-40;
   ctx.globalAlpha=.04+(k%5)*.012;ctx.fillStyle='#dbffff';
   ctx.beginPath();ctx.ellipse(x,y,10+(k%4)*5,1.2,0,0,7);ctx.fill();
 }ctx.restore();

 MAP_ISLANDS.forEach((i,n)=>{
   const x=i.x-camera.x,y=i.y-camera.y;
   if(x<-i.rx*1.7||x>W+i.rx*1.7||y<-i.ry*1.7||y>H+i.ry*1.7)return;
   ctx.save();ctx.translate(x,y);ctx.rotate((n%7-3)*.025);

   ctx.globalAlpha=.72;ctx.fillStyle='#45d1c7';ctx.beginPath();ctx.ellipse(0,0,i.rx*1.16,i.ry*1.18,0,0,7);ctx.fill();
   ctx.globalAlpha=.82;ctx.strokeStyle='#e4ffff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,i.rx*1.09,i.ry*1.11,0,0,7);ctx.stroke();
   ctx.globalAlpha=1;

   ctx.fillStyle='#d9bd73';ctx.beginPath();
   for(let k=0;k<38;k++){let a=k/38*Math.PI*2,noise=1+Math.sin(k*2.17+n)*.06+Math.sin(k*5.1+n*.4)*.025;
     let px=Math.cos(a)*i.rx*noise,py=Math.sin(a)*i.ry*noise;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}
   ctx.closePath();ctx.fill();

   ctx.fillStyle='#2e7138';ctx.beginPath();ctx.ellipse(0,0,i.rx*.83,i.ry*.78,0,0,7);ctx.fill();

   for(let k=0;k<46;k++){
     const a=k*2.399+n*.47,rr=.08+(k%10)*.073,tx=Math.cos(a)*i.rx*rr,ty=Math.sin(a)*i.ry*rr*.80,r=5+(k%5)*1.7;
     ctx.fillStyle=k%4===0?'#17582f':k%4===1?'#23723a':k%4===2?'#2e8b43':'#3ba14b';
     ctx.beginPath();ctx.arc(tx,ty,r,0,7);ctx.fill();
     ctx.fillStyle='#a6ef8020';ctx.beginPath();ctx.arc(tx-r*.25,ty-r*.25,r*.42,0,7);ctx.fill();
   }

   for(let k=0;k<5;k++){
     let a=k*1.91+n*.7,rr=.28+.14*((k+n)%3),tx=Math.cos(a)*i.rx*rr,ty=Math.sin(a)*i.ry*rr*.78;
     ctx.save();ctx.translate(tx,ty);ctx.strokeStyle='#674b2b';ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(0,8);ctx.quadraticCurveTo(2,1,1,-8);ctx.stroke();
     for(let q=0;q<5;q++){ctx.save();ctx.rotate(q*Math.PI*2/5);ctx.fillStyle=q%2?'#2c8d42':'#3ca953';
       ctx.beginPath();ctx.ellipse(0,-11,3.2,10,0,0,7);ctx.fill();ctx.restore();}
     ctx.restore();
   }

   for(let k=0;k<10;k++){
     const a=k*.72+n*.39,rr=.82+(k%2)*.07,rx=Math.cos(a)*i.rx*rr,ry=Math.sin(a)*i.ry*rr;
     ctx.fillStyle=k%2?'#69757a':'#7d888c';ctx.beginPath();ctx.ellipse(rx,ry,5+(k%3)*3,4+(k%2)*3,a,0,7);ctx.fill();
     ctx.fillStyle='#c6d1d155';ctx.beginPath();ctx.ellipse(rx-2,ry-2,3+(k%2),2,0,0,7);ctx.fill();
   }
   ctx.restore();
 });

 REEFS.forEach((q,n)=>{
   const x=q.x-camera.x,y=q.y-camera.y;if(x<-90||x>W+90||y<-90||y>H+90)return;
   ctx.save();ctx.globalAlpha=.62;ctx.fillStyle='#46cbc1';ctx.beginPath();ctx.ellipse(x,y,q.r*1.45,q.r*.92,.25,0,7);ctx.fill();ctx.globalAlpha=1;
   for(let k=0;k<8;k++){let a=k*.82+n*.24,rr=q.r*.44;ctx.fillStyle=k%2?'#69757a':'#7d888c';
     ctx.beginPath();ctx.arc(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.68,5+(k%4)*2.2,0,7);ctx.fill();}
   ctx.strokeStyle='#e9ffffdd';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(x,y,q.r*1.05,q.r*.65,.25,0,7);ctx.stroke();ctx.restore();
 });

 const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.30,W/2,H/2,Math.max(W,H)*.78);
 v.addColorStop(.55,'#0000');v.addColorStop(1,'#00121f55');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
function drawMiniMap(){
 const mw=118,mh=142,x=W-mw-16,y=118;
 ctx.save();ctx.globalAlpha=.94;ctx.fillStyle='#052b35e8';
 ctx.beginPath();ctx.roundRect(x,y,mw,mh,8);ctx.fill();ctx.strokeStyle='#d9c06c';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#0b6f7e';ctx.fillRect(x+mw*.27,y+4,mw*.46,mh-8);
 ctx.fillStyle='#315e36';ctx.fillRect(x+3,y+3,mw*.24,mh-6);ctx.fillRect(x+mw*.73,y+3,mw*.24,mh-6);
 enemies.forEach(e=>{ctx.fillStyle=e.boss?'#ffb23c':'#ff493e';let ex=x+e.x/WORLD.w*mw,ey=y+e.y/WORLD.h*mh;ctx.fillRect(ex-2,ey-2,e.boss?5:4,e.boss?5:4)});
 ctx.fillStyle='#5cfff0';ctx.beginPath();ctx.arc(x+player.x/WORLD.w*mw,y+player.y/WORLD.h*mh,4,0,7);ctx.fill();
 ctx.strokeStyle='#ffffff55';ctx.strokeRect(x+camera.x/WORLD.w*mw,y+camera.y/WORLD.h*mh,Math.min(mw,W/WORLD.w*mw),Math.min(mh,H/WORLD.h*mh));
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
 fog.addColorStop(0,'#0000');fog.addColorStop(1,'#00000022');ctx.fillStyle=fog;ctx.fillRect(0,0,W,H);
 let shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#00120b18');shade.addColorStop(.62,'#0000');shade.addColorStop(1,'#0003');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);

 drawLaneForces();
 enemies.forEach(e=>{
   if(!visible(e))return;
   drawSprite(null,e,e.boss?62:43);drawUnitHealth(e,e.boss?56:42);
   let sx=screenX(e.x),sy=screenY(e.y);
   ctx.fillStyle='#351013';ctx.fillRect(sx-36,sy-70,72,8);
   ctx.fillStyle=e.boss?'#ff9a2d':'#ff4047';ctx.fillRect(sx-36,sy-70,72*Math.max(0,e.hp/e.max),8);
 });
 drawSprite(null,player,Math.max(50,SHIPS[shipTier].size*1.10));drawUnitHealth(player,60);
 let px=screenX(player.x),py=screenY(player.y);
 // V7: no blue locator ring. Small heading marker only.
 ctx.save();
 ctx.strokeStyle='#ffffffbb';ctx.lineWidth=2;
 ctx.beginPath();
 ctx.moveTo(px+Math.cos(player.a)*29,py+Math.sin(player.a)*29);
 ctx.lineTo(px+Math.cos(player.a)*38,py+Math.sin(player.a)*38);
 ctx.stroke();
 ctx.restore();

 bullets.forEach(b=>{if(!visible(b,60))return;let x=screenX(b.x),y=screenY(b.y);ctx.strokeStyle=b.f?'#ffd36b':'#ff713e';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=34;ctx.lineWidth=b.heavy?11:5.5;ctx.beginPath();ctx.moveTo(x-b.vx*(b.heavy?.055:.035),y-b.vy*(b.heavy?.055:.035));ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#fff7b2';ctx.beginPath();ctx.arc(x,y,b.heavy?7:3.5,0,7);ctx.fill()});
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
 boom(player.x,player.y); updateHUD();
}
$('#upgradeShip')?.addEventListener('pointerdown',e=>{e.preventDefault();upgradeShip()});

updateSkillUI();


