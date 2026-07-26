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
.pauseCard .exit{background:#8d2026}
`;
document.head.appendChild(pauseStyle);

const pauseMenu=document.createElement('div');
pauseMenu.id='pauseMenu';
pauseMenu.innerHTML=`<div class="pauseCard">
  <h2>游戏暂停</h2>
  <button id="resumeGame">▶ 继续战斗</button>
  <button id="restartGame" class="restart">↻ 重新开始</button>
  <button id="exitGame" class="exit">⏻ 退出游戏</button>
</div>`;
document.body.appendChild(pauseMenu);

const exitScreen=document.createElement('div');
exitScreen.id='exitScreen';
exitScreen.innerHTML=`<div class="pauseCard">
  <h2>已退出游戏</h2>
  <p>游戏已经停止。由于这是浏览器网页，系统通常不允许网页强制关闭当前标签页。</p>
  <button id="backToGame">重新进入游戏</button>
</div>`;
document.body.appendChild(exitScreen);

let keys={},joy={x:0,y:0},wave=1,coins=0,paused=false,shake=0,last=performance.now();
const WORLD={w:4200,h:5200};
const camera={x:0,y:0};
const imgs={}; const sources={
 bg:'assets/battlefield_hd.jpg',player:'assets/player_tank.png',
 e1:'assets/enemy_tank_1.png',e2:'assets/enemy_tank_2.png',e3:'assets/enemy_tank_3.png',boss:'assets/boss_tank.png'
};
let loaded=0;
Object.entries(sources).forEach(([k,s])=>{
 let im=new Image();
 im.onload=()=>{imgs[k]=im;if(++loaded===Object.keys(sources).length){$('#loading').style.display='none';resetWave()}};
 im.onerror=()=>console.error('Asset failed:',s);
 im.src=s;
});
function resize(){
 DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;
 c.width=W*DPR;c.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',resize);resize();

let player={x:WORLD.w/2,y:WORLD.h/2,a:-Math.PI/2,hp:140,max:140,speed:245,r:13};
let enemies=[],bullets=[],particles=[];
let laneUnits=[],laneSpawnTimer=0;
let autoFireTimer=0,autoFireRate=0.48,autoRange=460;
let heavyCooldown=0,heavyCooldownMax=5;
let shockCooldown=0,shockCooldownMax=8,shockRange=250;
let repairCooldown=0,repairCooldownMax=12;

function spawnFarFromPlayer(){
 let x,y,d=0;
 do{
   x=120+Math.random()*(WORLD.w-240);
   y=120+Math.random()*(WORLD.h-240);
   d=Math.hypot(x-player.x,y-player.y);
 }while(d<520);
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
   ctx.fillStyle=u.team==='ally'?'#45e6cf':'#ef5c58';
   ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=9;
   ctx.fillRect(-10,-14,20,28);ctx.fillStyle='#17231f';ctx.fillRect(-6,-10,12,18);
   ctx.fillStyle=u.team==='ally'?'#bafff4':'#ffd0cb';ctx.fillRect(-2,-22,4,14);
   ctx.restore();
   ctx.fillStyle='#1b1515';ctx.fillRect(sx-15,sy-24,30,4);
   ctx.fillStyle=u.team==='ally'?'#42e5c8':'#ff5b58';ctx.fillRect(sx-15,sy-24,30*Math.max(0,u.hp/u.max),4);
 }
}

function resetWave(){
 player.x=WORLD.w/2;player.y=WORLD.h/2;
 let n=5+Math.min(9,wave*2);
 enemies=[];laneUnits=[];laneSpawnTimer=1;
 for(let i=0;i<n;i++){
   let p=spawnFarFromPlayer(),boss=wave%5===0&&i===0;
   enemies.push({x:p.x,y:p.y,a:Math.PI/2,hp:boss?260:70,max:boss?260:70,r:boss?17:12,boss,cd:500+Math.random()*1000,type:1+i%3});
 }
 updateCamera(true);updateHUD();
}
function updateHUD(){
 $('#wave').textContent='WAVE '+wave;$('#remain').textContent='敌军 '+enemies.length;
 $('#coins').textContent=coins;$('#hpText').textContent=Math.ceil(player.hp)+'/'+player.max;
 $('#hpFill').style.width=Math.max(0,player.hp/player.max*100)+'%';
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
 bullets.push({
   x:player.x+Math.cos(a)*48,y:player.y+Math.sin(a)*48,
   vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
   life:heavy?1700:1500,f:true,heavy:heavy,damage:heavy?95:35
 });
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
     if(e.hp<=0){coins+=e.boss?30:5;boom(e.x,e.y)}
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
function muzzle(x,y){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:250,c:i%2?'#ffb42d':'#fff2a0'})}
function boom(x,y){shake=10;for(let i=0;i<34;i++)particles.push({x,y,vx:(Math.random()-.5)*280,vy:(Math.random()-.5)*280,life:350+Math.random()*550,c:i%3?'#ff6b20':'#ffd45a'})}
function update(dt){
 if(paused||!imgs.bg)return;
 let mx=joy.x,my=joy.y,mag=Math.hypot(mx,my);
 if(mag>.08){player.x+=mx*player.speed*dt;player.y+=my*player.speed*dt;player.a=Math.atan2(my,mx)}
 player.x=Math.max(60,Math.min(WORLD.w-60,player.x));player.y=Math.max(60,Math.min(WORLD.h-60,player.y));
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
   if(d<720&&d>145){e.x+=dx/d*(e.boss?38:52)*dt;e.y+=dy/d*(e.boss?38:52)*dt}
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
       e.hp-=(b.damage||35);b.life=0;muzzle(b.x,b.y);if(e.hp<=0){coins+=e.boss?30:5;boom(e.x,e.y)};break;
     }
   }else if(Math.hypot(b.x-player.x,b.y-player.y)<player.r+7){player.hp-=8;b.life=0;shake=5}
 });
 enemies=enemies.filter(e=>e.hp>0);
 bullets=bullets.filter(b=>b.life>0&&b.x>-80&&b.x<WORLD.w+80&&b.y>-80&&b.y<WORLD.h+80);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt*1000});
 particles=particles.filter(p=>p.life>0);
 if(player.hp<=0){player.hp=player.max;coins=Math.max(0,coins-10);resetWave()}
 if(enemies.length===0){wave++;resetWave()}
 updateCamera();updateHUD();updateSkillUI();shake*=.88;
}
function screenX(x){return x-camera.x}
function screenY(y){return y-camera.y}
function visible(o,pad=180){let x=screenX(o.x),y=screenY(o.y);return x>-pad&&x<W+pad&&y>-pad&&y<H+pad}
function drawSprite(im,o,size){
 let sx=screenX(o.x),sy=screenY(o.y);
 ctx.save();ctx.translate(sx,sy);ctx.rotate(o.a+Math.PI/2);
 ctx.save();ctx.globalAlpha=.62;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(5,12,size*.32,size*.20,0,0,Math.PI*2);ctx.fill();ctx.restore();
 let ratio=im.width/im.height,h=size,w=size*ratio;
 // Bright outline underneath the sprite so dark tanks remain visible on rocky terrain.
 ctx.save();ctx.globalAlpha=.62;ctx.fillStyle=o===player?'#54fff0':'#ff655f';
 ctx.beginPath();ctx.ellipse(0,0,w*.43,h*.43,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.filter='brightness(1.32) contrast(1.18) saturate(1.18)';
 ctx.shadowColor=o===player?'#00ffe0':'#ff463f';ctx.shadowBlur=12;ctx.shadowOffsetY=5;
 ctx.drawImage(im,-w/2,-h/2,w,h);
 ctx.filter='none';ctx.restore();
}
function drawWorldBackground(){
 let bg=imgs.bg;
 // Repeat the HD battlefield as a large world texture instead of stretching one screen.
 const tile=900;
 for(let y=Math.floor(camera.y/tile)*tile;y<camera.y+H+tile;y+=tile){
   for(let x=Math.floor(camera.x/tile)*tile;x<camera.x+W+tile;x+=tile){
     if(x<0||y<0||x>=WORLD.w||y>=WORLD.h)continue;
     let sx=x-camera.x,sy=y-camera.y;
     ctx.save();
     // alternate transforms to reduce obvious repetition
     let flip=((x/tile+y/tile)&1)?-1:1;
     if(flip<0){ctx.translate(sx+tile,sy);ctx.scale(-1,1);ctx.drawImage(bg,0,0,tile,tile)}
     else ctx.drawImage(bg,sx,sy,tile,tile);
     ctx.restore();
   }
 }
 // World boundary
 ctx.strokeStyle='#e1b85a88';ctx.lineWidth=8;ctx.strokeRect(-camera.x,-camera.y,WORLD.w,WORLD.h);
}
function drawMiniMap(){
 const mw=118,mh=118,x=W-mw-18,y=120;
 ctx.save();ctx.globalAlpha=.92;ctx.fillStyle='#06100ddd';ctx.fillRect(x,y,mw,mh);
 ctx.strokeStyle='#d9c06c';ctx.lineWidth=2;ctx.strokeRect(x,y,mw,mh);
 enemies.forEach(e=>{ctx.fillStyle=e.boss?'#ffad33':'#ff4d4d';ctx.fillRect(x+e.x/WORLD.w*mw-1.5,y+e.y/WORLD.h*mh-1.5,e.boss?5:3,e.boss?5:3)});
 ctx.fillStyle='#55fff0';ctx.beginPath();ctx.arc(x+player.x/WORLD.w*mw,y+player.y/WORLD.h*mh,4,0,7);ctx.fill();
 ctx.strokeStyle='#ffffff66';ctx.strokeRect(x+camera.x/WORLD.w*mw,y+camera.y/WORLD.h*mh,Math.min(mw,W/WORLD.w*mw),Math.min(mh,H/WORLD.h*mh));
 ctx.restore();
}

function drawBattleLanes(){
  ctx.save();
  // Three broad strategic lanes, inspired by Battle Tanks-style map flow.
  const lanes=[WORLD.w*.24,WORLD.w*.50,WORLD.w*.76];
  ctx.globalAlpha=.20;
  ctx.strokeStyle='#d8c28b';
  ctx.lineWidth=110;
  ctx.setLineDash([90,55]);
  lanes.forEach(x=>{
    ctx.beginPath();
    ctx.moveTo(x-camera.x,0-camera.y);
    ctx.lineTo(x-camera.x,WORLD.h-camera.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Friendly/enemy base zones.
  const baseH=250;
  const baseW=560;
  const bx=WORLD.w/2-baseW/2;
  ctx.globalAlpha=.32;
  ctx.fillStyle='#0d7b63';
  ctx.fillRect(bx-camera.x,WORLD.h-baseH-camera.y,baseW,baseH);
  ctx.fillStyle='#8c2c2c';
  ctx.fillRect(bx-camera.x,-camera.y,baseW,baseH);

  ctx.globalAlpha=.9;
  ctx.font='900 24px Arial';
  ctx.textAlign='center';
  ctx.fillStyle='#7fffe9';
  ctx.fillText('ALLY BASE',WORLD.w/2-camera.x,WORLD.h-95-camera.y);
  ctx.fillStyle='#ff8f8f';
  ctx.fillText('ENEMY BASE',WORLD.w/2-camera.x,145-camera.y);
  // Base cores
  const cx=WORLD.w/2-camera.x;
  ctx.shadowBlur=24;
  ctx.shadowColor='#4affdf';ctx.fillStyle='#55e8cf';ctx.beginPath();ctx.arc(cx,WORLD.h-155-camera.y,38,0,Math.PI*2);ctx.fill();
  ctx.shadowColor='#ff4e4e';ctx.fillStyle='#e95757';ctx.beginPath();ctx.arc(cx,155-camera.y,38,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}

function draw(){
 if(!imgs.bg)return;
 ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 drawWorldBackground();
 drawBattleLanes();
 let shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#00120b44');shade.addColorStop(.62,'#0000');shade.addColorStop(1,'#0008');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);

 drawLaneForces();
 enemies.forEach(e=>{
   if(!visible(e))return;
   let im=e.boss?imgs.boss:imgs['e'+e.type];drawSprite(im,e,e.boss?64:48);
   let sx=screenX(e.x),sy=screenY(e.y);
   ctx.save();
   ctx.strokeStyle=e.boss?'#ffb24d':'#ff5d63';ctx.lineWidth=e.boss?3:2;
   ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=e.boss?14:8;
   ctx.beginPath();ctx.arc(sx,sy,e.boss?26:21,0,Math.PI*2);ctx.stroke();ctx.restore();
   ctx.fillStyle='#351013';ctx.fillRect(sx-36,sy-70,72,8);
   ctx.fillStyle=e.boss?'#ff9a2d':'#ff4047';ctx.fillRect(sx-36,sy-70,72*Math.max(0,e.hp/e.max),8);
 });
 drawSprite(imgs.player,player,55);
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
 drawMiniMap();
 ctx.restore();
}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

$('#fire').addEventListener('pointerdown',e=>{e.preventDefault();fire()});
$('#repair').addEventListener('pointerdown',e=>{e.preventDefault();repairSkill()});
$('#shock').addEventListener('pointerdown',e=>{e.preventDefault();shockWave()});
$('#pause').onclick=()=>{paused=true;pauseMenu.classList.add('show')};
$('#resumeGame').onclick=()=>{pauseMenu.classList.remove('show');paused=false;last=performance.now()};
$('#restartGame').onclick=()=>{pauseMenu.classList.remove('show');paused=false;wave=1;coins=0;player.hp=player.max;bullets=[];particles=[];autoFireTimer=0;heavyCooldown=0;shockCooldown=0;repairCooldown=0;resetWave();updateSkillUI();last=performance.now()};
$('#exitGame').onclick=()=>{paused=true;pauseMenu.classList.remove('show');exitScreen.classList.add('show');try{window.close()}catch(e){}};
$('#backToGame').onclick=()=>{exitScreen.classList.remove('show');paused=false;wave=1;coins=0;player.hp=player.max;bullets=[];particles=[];autoFireTimer=0;heavyCooldown=0;shockCooldown=0;repairCooldown=0;resetWave();updateSkillUI();last=performance.now()};

let J=$('#joy'),knob=J.querySelector('i'),pid=null;
function moveJoy(e){let r=J.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.hypot(x,y),max=Math.max(42,r.width*.31);if(m>max){x=x/m*max;y=y/m*max}joy.x=x/max;joy.y=y/max;knob.style.transform=`translate(${x}px,${y}px)`}
J.addEventListener('pointerdown',e=>{pid=e.pointerId;J.classList.add('active');J.setPointerCapture(pid);moveJoy(e)});
J.addEventListener('pointermove',e=>{if(e.pointerId===pid)moveJoy(e)});
J.addEventListener('pointerup',e=>{pid=null;joy.x=joy.y=0;J.classList.remove('active');knob.style.transform='translate(0,0)'});
J.addEventListener('pointercancel',()=>{pid=null;joy.x=joy.y=0;J.classList.remove('active');knob.style.transform='translate(0,0)'});

updateSkillUI();


