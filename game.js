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
 {x:620,y:780,rx:150,ry:105},{x:3720,y:830,rx:170,ry:110},
 {x:1180,y:1660,rx:125,ry:90},{x:3140,y:1760,rx:155,ry:100},
 {x:560,y:2720,rx:165,ry:108},{x:3840,y:2880,rx:140,ry:95},
 {x:1520,y:3600,rx:145,ry:96},{x:3050,y:3850,rx:175,ry:115},
 {x:720,y:4740,rx:145,ry:98},{x:3740,y:4940,rx:165,ry:108},
 {x:1450,y:5900,rx:165,ry:110},{x:3200,y:6020,rx:145,ry:98}
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
 if(laneSpawnTimer<=0){laneSpawnTimer=8;spawnLaneForces()}
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
 player.x=WORLD.w/2;player.y=WORLD.h/2; player.speed=SHIPS[shipTier].speed; autoFireRate=SHIPS[shipTier].rate; autoRange=SHIPS[shipTier].range;
 let n=5+Math.min(9,wave*2);
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
 if(heavy){shake=7;for(let i=0;i<18;i++)particles.push({x:player.x+Math.cos(a)*48,y:player.y+Math.sin(a)*48,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*220,life:350,c:i%2?'#ff6b20':'#fff0a0'})}
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

function muzzle(x,y){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:250,c:i%2?'#ffb42d':'#fff2a0'})}
function boom(x,y){shake=10;for(let i=0;i<34;i++)particles.push({x,y,vx:(Math.random()-.5)*280,vy:(Math.random()-.5)*280,life:350+Math.random()*550,c:i%3?'#ff6b20':'#ffd45a'})}
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

 if(ambientShips.length<8 && Math.random()<dt*.35){
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
 const sx=screenX(o.x),sy=screenY(o.y),enemy=o!==player && !ambientShips.includes(o);
 let tier=o===player?shipTier:(enemy?(o.boss?7:Math.min(5,(o.type||1)+1)):2);
 ctx.save();ctx.translate(sx,sy);ctx.rotate(o.a+Math.PI/2);

 // shadow and wake
 ctx.globalAlpha=.27;ctx.fillStyle='#000a';ctx.beginPath();ctx.ellipse(5,10,size*.38,size*.57,0,0,7);ctx.fill();
 ctx.globalAlpha=.62;ctx.strokeStyle='#d5fbff';ctx.lineWidth=1.7;
 for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(-size*(.18+k*.05),size*.28);ctx.lineTo(-size*(.34+k*.07),size*(.70+k*.10));ctx.stroke();
 ctx.beginPath();ctx.moveTo(size*(.18+k*.05),size*.28);ctx.lineTo(size*(.34+k*.07),size*(.70+k*.10));ctx.stroke()}
 ctx.globalAlpha=1;

 const war=tier>=4;
 ctx.fillStyle=enemy?'#64322f':(war?'#536874':'#7e5737');
 ctx.strokeStyle=enemy?'#ff9a86':'#c7edf4';ctx.lineWidth=1.6;
 ctx.beginPath();ctx.moveTo(0,-size*.64);ctx.quadraticCurveTo(size*.34,-size*.35,size*.35,-size*.06);
 ctx.lineTo(size*.27,size*.48);ctx.quadraticCurveTo(0,size*.66,-size*.27,size*.48);ctx.lineTo(-size*.35,-size*.06);
 ctx.quadraticCurveTo(-size*.34,-size*.35,0,-size*.64);ctx.closePath();ctx.fill();ctx.stroke();

 // deck details
 ctx.fillStyle=war?'#91a0a5':'#a87848';ctx.beginPath();ctx.ellipse(0,0,size*.22,size*.39,0,0,7);ctx.fill();

 if(!war){
   ctx.strokeStyle='#3c291a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-size*.34);ctx.lineTo(0,size*.34);ctx.stroke();
   ctx.fillStyle=enemy?'#b8765d':'#ead9b0';
   ctx.beginPath();ctx.moveTo(2,-size*.29);ctx.lineTo(size*.28,-size*.02);ctx.lineTo(2,size*.10);ctx.closePath();ctx.fill();
   if(tier>=2){ctx.beginPath();ctx.moveTo(-2,-size*.12);ctx.lineTo(-size*.24,size*.09);ctx.lineTo(-2,size*.24);ctx.closePath();ctx.fill()}
 }else{
   ctx.fillStyle=enemy?'#4b4440':'#b7c1c4';ctx.fillRect(-size*.14,-size*.03,size*.28,size*.26);
   ctx.fillStyle='#25353b';ctx.fillRect(-size*.05,-size*.25,size*.10,size*.21);
   let guns=o===player?SHIPS[shipTier].guns:(o.boss?4:2);
   for(let g=0;g<Math.min(4,guns);g++){
     let gy=-size*.38+g*size*.18;ctx.fillStyle='#243238';ctx.beginPath();ctx.arc(0,gy,size*.08,0,7);ctx.fill();
     ctx.fillRect(-2,gy-size*.18,4,size*.18);
   }
 }
 // side cannons
 if(tier>=2){ctx.fillStyle='#171b1d';for(let q=-1;q<=1;q++){ctx.beginPath();ctx.arc(size*.28,q*size*.16,2.2,0,7);ctx.fill();ctx.beginPath();ctx.arc(-size*.28,q*size*.16,2.2,0,7);ctx.fill()}}
 ctx.restore();
}
function drawWorldBackground(){
 // Layered water base.
 const g=ctx.createLinearGradient(0,0,W,H);
 g.addColorStop(0,'#061b3b');g.addColorStop(.45,'#083660');g.addColorStop(1,'#03152e');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

 // Fine wave texture.
 ctx.save();ctx.globalAlpha=.11;ctx.strokeStyle='#78d7ee';ctx.lineWidth=1.2;
 const gx=130,gy=64;
 let sy0=Math.floor(camera.y/gy)*gy;
 for(let wy=sy0;wy<camera.y+H+gy;wy+=gy){
   const y=wy-camera.y;
   for(let wx=Math.floor(camera.x/gx)*gx;wx<camera.x+W+gx;wx+=gx){
     const x=wx-camera.x;
     ctx.beginPath();ctx.moveTo(x,y);
     ctx.bezierCurveTo(x+20,y-5,x+40,y+5,x+64,y);ctx.stroke();
   }
 }
 ctx.restore();

 // Islands: shallows, beach, rock rim, forest clusters, palms.
 for(const i of MAP_ISLANDS){
   const x=i.x-camera.x,y=i.y-camera.y;
   if(x<-i.rx*1.7||x>W+i.rx*1.7||y<-i.ry*1.7||y>H+i.ry*1.7)continue;
   ctx.save();
   ctx.fillStyle='#39a7b035';ctx.beginPath();ctx.ellipse(x,y,i.rx*1.32,i.ry*1.32,.16,0,7);ctx.fill();
   ctx.strokeStyle='#9ceef277';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(x,y,i.rx*1.20,i.ry*1.20,.16,0,7);ctx.stroke();
   ctx.fillStyle='#c5ad70';ctx.beginPath();ctx.ellipse(x,y,i.rx,i.ry,.16,0,7);ctx.fill();
   ctx.fillStyle='#3d4938';ctx.beginPath();ctx.ellipse(x,y-5,i.rx*.83,i.ry*.76,.16,0,7);ctx.fill();
   ctx.fillStyle='#184d2d';
   for(let k=0;k<13;k++){
     const a=k*2.399,rr=.18+(k%5)*.12;
     const tx=x+Math.cos(a)*i.rx*rr,ty=y-8+Math.sin(a)*i.ry*rr*.9;
     ctx.beginPath();ctx.arc(tx,ty,7+(k%4)*2,0,7);ctx.fill();
   }
   ctx.fillStyle='#68675c';
   for(let k=0;k<7;k++){
     const a=k*.91+1.2;
     ctx.beginPath();ctx.arc(x+Math.cos(a)*i.rx*.76,y+Math.sin(a)*i.ry*.62,4+(k%3)*2,0,7);ctx.fill();
   }
   ctx.restore();
 }

 // Reef clusters
 for(const q of REEFS){
   const x=q.x-camera.x,y=q.y-camera.y;if(x<-80||x>W+80||y<-80||y>H+80)continue;
   ctx.save();ctx.fillStyle='#526a6b';
   for(let k=0;k<7;k++){let a=k*.9;ctx.beginPath();ctx.arc(x+Math.cos(a)*q.r*.45,y+Math.sin(a)*q.r*.33,5+(k%3)*3,0,7);ctx.fill()}
   ctx.strokeStyle='#8ce8e977';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,y,q.r,q.r*.62,.25,0,7);ctx.stroke();ctx.restore();
 }

 // World boundary
 ctx.strokeStyle='#d4bd6b55';ctx.lineWidth=7;ctx.strokeRect(-camera.x,-camera.y,WORLD.w,WORLD.h);
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
 // Ports and coastal defenses
 PORTS.forEach(p=>{
   const x=p.x-camera.x,y=p.y-camera.y;if(x<-200||x>W+200||y<-130||y>H+130)return;
   ctx.save();
   ctx.fillStyle=p.team==='ally'?'#315e55':'#673734';ctx.fillRect(x-105,y-28,210,56);
   ctx.fillStyle='#7d6040';for(let k=-3;k<=3;k++)ctx.fillRect(x+k*30-4,y-62,8,92);
   for(let s=-1;s<=1;s+=2){
     ctx.fillStyle='#777568';ctx.beginPath();ctx.arc(x+s*75,y-38,14,0,7);ctx.fill();
     ctx.fillStyle='#2e3435';ctx.fillRect(x+s*75-3,y-60,6,24);
   }
   ctx.fillStyle='#efd88d';ctx.font='900 13px Arial';ctx.textAlign='center';
   ctx.fillText(p.team==='ally'?'ALLY PORT':'ENEMY PORT',x,y+48);ctx.restore();
 });

 const props=[
  ['crate',640,2050],['barrel',3820,2100],['wreck',2200,2750],['tower',1080,3950],
  ['crate',3420,4250],['wreck',1550,5250],['barrel',3100,5550],['tower',3650,1200]
 ];
 props.forEach(([t,wx,wy],idx)=>{
   const x=wx-camera.x,y=wy-camera.y;if(x<-60||x>W+60||y<-60||y>H+60)return;
   ctx.save();
   if(t==='crate'){
     ctx.fillStyle='#8d6235';ctx.fillRect(x-12,y-12,24,24);ctx.strokeStyle='#d8b36e';ctx.lineWidth=2;ctx.strokeRect(x-12,y-12,24,24);
     ctx.beginPath();ctx.moveTo(x-10,y-10);ctx.lineTo(x+10,y+10);ctx.moveTo(x+10,y-10);ctx.lineTo(x-10,y+10);ctx.stroke();
   }else if(t==='barrel'){
     ctx.fillStyle='#82522e';ctx.beginPath();ctx.ellipse(x,y,9,12,0,0,7);ctx.fill();ctx.strokeStyle='#c18a52';ctx.stroke();
   }else if(t==='wreck'){
     ctx.strokeStyle='#49382b';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x-21,y+12);ctx.lineTo(x+20,y-10);ctx.stroke();
     ctx.fillStyle='#352a23';ctx.beginPath();ctx.ellipse(x,y,23,9,-.3,0,7);ctx.fill();
   }else{
     ctx.fillStyle='#655843';ctx.fillRect(x-9,y-18,18,32);ctx.fillStyle='#8b7a58';ctx.fillRect(x-14,y-25,28,9);
     ctx.fillStyle='#ffb33c';ctx.shadowColor='#ff7b21';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(x,y-30,5,0,7);ctx.fill();
   }
   ctx.restore();
 });

 // Pickups
 pickups.forEach(p=>{
   const x=screenX(p.x),y=screenY(p.y)+Math.sin(p.bob)*3;if(x<-30||x>W+30||y<-30||y>H+30)return;
   ctx.save();ctx.shadowColor='#ffd84c';ctx.shadowBlur=14;ctx.fillStyle='#f2c94c';ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.fill();
   ctx.fillStyle='#7d5a15';ctx.font='900 10px Arial';ctx.textAlign='center';ctx.fillText('$',x,y+4);ctx.restore();
 });

 // Neutral ambient ships
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
   drawSprite(null,e,e.boss?70:48);
   let sx=screenX(e.x),sy=screenY(e.y);
   ctx.save();
   ctx.strokeStyle=e.boss?'#ffb24d':'#ff5d63';ctx.lineWidth=e.boss?3:2;
   ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=e.boss?14:8;
   ctx.beginPath();ctx.arc(sx,sy,e.boss?26:21,0,Math.PI*2);ctx.stroke();ctx.restore();
   ctx.fillStyle='#351013';ctx.fillRect(sx-36,sy-70,72,8);
   ctx.fillStyle=e.boss?'#ff9a2d':'#ff4047';ctx.fillRect(sx-36,sy-70,72*Math.max(0,e.hp/e.max),8);
 });
 drawSprite(null,player,SHIPS[shipTier].size);
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

 bullets.forEach(b=>{if(!visible(b,60))return;let x=screenX(b.x),y=screenY(b.y);ctx.strokeStyle=b.f?'#8ffcff':'#ff713e';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18;ctx.lineWidth=b.heavy?8:4;ctx.beginPath();ctx.moveTo(x-b.vx*(b.heavy?.055:.035),y-b.vy*(b.heavy?.055:.035));ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#fff7b2';ctx.beginPath();ctx.arc(x,y,b.heavy?7:3.5,0,7);ctx.fill()});
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


