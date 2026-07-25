(()=>{const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='tw_ultimate_5';let saveData;try{saveData=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}saveData=saveData||{coins:0,level:1,best:1,u:{armor:0,damage:0,reload:0,speed:0,repair:0}};saveData.u={armor:0,damage:0,reload:0,speed:0,repair:0,...saveData.u};
const menu=$('#menu'),garage=$('#garage'),battle=$('#battle'),canvas=$('#game'),ctx=canvas.getContext('2d');
let W,H,dpr=1,raf=0,last=0,paused=false,over=false,wave=1,runCoins=0,player,enemies=[],bullets=[],particles=[],wrecks=[],obstacles=[],joy={x:0,y:0},firing=false,boss=null,repairCd=0,shake=0;
function store(){localStorage.setItem(KEY,JSON.stringify(saveData));menuUI()}
function menuUI(){$('#mCoins').textContent=saveData.coins;$('#mLevel').textContent=saveData.level;$('#mBest').textContent=saveData.best}
function show(el){[menu,garage,battle].forEach(x=>x.classList.add('hidden'));el.classList.remove('hidden')}
function stats(){return{hp:140+saveData.u.armor*25,dmg:34+saveData.u.damage*8,reload:Math.max(190,560-saveData.u.reload*32),speed:2.6+saveData.u.speed*.18,repair:25+saveData.u.repair*8}}
const labels={armor:['🛡️ 装甲','增加最大生命'],damage:['💥 火力','提高炮弹伤害'],reload:['⚡ 装填','提高射击速度'],speed:['⚙️ 引擎','提高移动速度'],repair:['➕ 维修','提高维修量']};
function cost(k){return 80+saveData.u[k]*100}
function garageUI(){$('#gCoins').textContent=saveData.coins;$('#upgradeList').innerHTML=Object.keys(labels).map(k=>`<div class=up><h3>${labels[k][0]}</h3><p>${labels[k][1]} · Lv.${saveData.u[k]}/10</p><div class=meter><i style="width:${saveData.u[k]*10}%"></i></div><button data-u="${k}" ${saveData.coins<cost(k)||saveData.u[k]>=10?'disabled':''}>升级 🪙${cost(k)}</button></div>`).join('');$$('[data-u]').forEach(b=>b.onclick=()=>{let k=b.dataset.u,c=cost(k);if(saveData.coins>=c&&saveData.u[k]<10){saveData.coins-=c;saveData.u[k]++;saveData.level=1+Object.values(saveData.u).reduce((a,b)=>a+b,0);store();garageUI()}})}
$('#garageBtn').onclick=()=>{garageUI();show(garage)};$('#garageBack').onclick=()=>{menuUI();show(menu)};$('#start').onclick=()=>{show(battle);start()};$('#pause').onclick=()=>openModal('暂停','战斗已暂停','继续',()=>{paused=false;closeModal()});$('#quit').onclick=()=>{cancelAnimationFrame(raf);closeModal();menuUI();show(menu)};
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function start(){let s=stats();wave=1;runCoins=0;paused=false;over=false;repairCd=0;wrecks=[];particles=[];bullets=[];player={x:W/2,y:H*.74,a:-Math.PI/2,t:-Math.PI/2,hp:s.hp,max:s.hp,last:0};makeMap();spawn();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function makeMap(){obstacles=[{x:W*.08,y:H*.32,w:90,h:34,type:'wall'},{x:W*.66,y:H*.39,w:115,h:32,type:'wall'},{x:W*.18,y:H*.56,w:60,h:60,type:'rock'},{x:W*.58,y:H*.60,w:42,h:105,type:'ruin'},{x:W*.76,y:H*.69,w:75,h:38,type:'rock'}]}
function spawn(){enemies=[];boss=null;let n=Math.min(4+wave,11);if(wave%5===0){boss={x:W/2,y:130,r:31,hp:420+wave*70,max:420+wave*70,s:.42,last:0,type:'boss'};enemies.push(boss);toast('⚠ BOSS WAVE ⚠')}else{for(let i=0;i<n;i++){let r=Math.random(),type=r<.22?'heavy':r<.48?'fast':'normal',hp=type==='heavy'?120+wave*16:65+wave*11;enemies.push({x:35+Math.random()*(W-70),y:105+Math.random()*Math.max(100,H*.3),r:type==='heavy'?22:17,hp,max:hp,s:type==='fast'?1.18:.68+wave*.022,last:0,type})}toast('WAVE '+wave)}hud()}
function loop(t){let dt=Math.min(34,t-last);last=t;if(!paused&&!over){update(dt,t);draw()}raf=requestAnimationFrame(loop)}
function update(dt,t){let s=stats(),m=Math.hypot(joy.x,joy.y);if(m>.1){let mx=joy.x/m,my=joy.y/m;player.x+=mx*s.speed*dt/16.7;player.y+=my*s.speed*dt/16.7;player.a=Math.atan2(my,mx)}player.x=Math.max(22,Math.min(W-22,player.x));player.y=Math.max(90,Math.min(H-170,player.y));resolve(player);let target=nearest();if(target)player.t=Math.atan2(target.y-player.y,target.x-player.x);if(firing&&t-player.last>s.reload){shot(player.x,player.y,player.t,9,s.dmg,true);player.last=t;muzzle(player.x+Math.cos(player.t)*27,player.y+Math.sin(player.t)*27)}
enemies.forEach(e=>{let a=Math.atan2(player.y-e.y,player.x-e.x);e.a=a;e.x+=Math.cos(a)*e.s*dt/16.7;e.y+=Math.sin(a)*e.s*dt/16.7;resolve(e);let dist=Math.hypot(player.x-e.x,player.y-e.y);if(dist<390&&t-e.last>(e.type==='boss'?520:900+Math.random()*400)){shot(e.x,e.y,a,e.type==='boss'?6:4.8,e.type==='boss'?22:12+wave,false);e.last=t}});
for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];b.x+=b.vx*dt/16.7;b.y+=b.vy*dt/16.7;b.life-=dt;if(b.life<0||b.x<0||b.x>W||b.y<80||b.y>H-155||hitsObstacle(b)){bullets.splice(i,1);continue}if(b.f){for(let j=enemies.length-1;j>=0;j--){let e=enemies[j];if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+5){e.hp-=b.d;explode(b.x,b.y,8);bullets.splice(i,1);if(e.hp<=0){wrecks.push({x:e.x,y:e.y,a:e.a,life:1});explode(e.x,e.y,e.type==='boss'?42:22);shake=e.type==='boss'?16:7;runCoins+=e.type==='boss'?120:10+wave*2;enemies.splice(j,1);if(e===boss)boss=null}break}}}else if(Math.hypot(b.x-player.x,b.y-player.y)<24){player.hp-=b.d;explode(player.x,player.y,7);shake=5;bullets.splice(i,1);if(player.hp<=0)finish()}}
particles.forEach(p=>{p.x+=p.vx*dt/16.7;p.y+=p.vy*dt/16.7;p.life-=dt;p.vx*=.97;p.vy*=.97});particles=particles.filter(p=>p.life>0);repairCd=Math.max(0,repairCd-dt);shake*=.85;if(!enemies.length&&!over){wave++;player.hp=Math.min(player.max,player.hp+Math.round(player.max*.16));spawn()}hud()}
function shot(x,y,a,s,d,f){bullets.push({x:x+Math.cos(a)*25,y:y+Math.sin(a)*25,vx:Math.cos(a)*s,vy:Math.sin(a)*s,d,f,life:1700})}
function nearest(){let q=null,z=1e12;enemies.forEach(e=>{let d=(e.x-player.x)**2+(e.y-player.y)**2;if(d<z){z=d;q=e}});return q}
function resolve(o){obstacles.forEach(w=>{let cx=Math.max(w.x,Math.min(o.x,w.x+w.w)),cy=Math.max(w.y,Math.min(o.y,w.y+w.h)),dx=o.x-cx,dy=o.y-cy,d=Math.hypot(dx,dy);if(d<o.r||d<19){let rr=o.r||19,k=((rr-d)+1)/(d||1);o.x+=dx*k;o.y+=dy*k}})}
function hitsObstacle(b){return obstacles.some(w=>b.x>w.x&&b.x<w.x+w.w&&b.y>w.y&&b.y<w.y+w.h)}
function muzzle(x,y){for(let i=0;i<7;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:120+Math.random()*130,c:'#ffd34d'})}
function explode(x,y,n){for(let i=0;i<n;i++){let a=Math.random()*6.28,s=1+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:250+Math.random()*450,c:i%3?'#ff8c32':'#ffd35c'})}}
function hud(){$('#hpBar').style.width=Math.max(0,player.hp/player.max*100)+'%';$('#hpText').textContent=Math.ceil(Math.max(0,player.hp))+'/'+player.max;$('#wave').textContent=wave;$('#enemyCount').textContent=enemies.length;$('#coins').textContent=runCoins;if(boss){$('#bossHud').classList.remove('hidden');$('#bossBar').style.width=Math.max(0,boss.hp/boss.max*100)+'%'}else $('#bossHud').classList.add('hidden')}
function finish(){over=true;saveData.coins+=runCoins;saveData.best=Math.max(saveData.best,wave);store();openModal('战斗结束',`到达 Wave ${wave} · 获得 🪙 ${runCoins}`,'再来一局',()=>{closeModal();start()})}
function openModal(t,d,b,fn){paused=true;$('#modalTitle').textContent=t;$('#modalText').textContent=d;$('#modalMain').textContent=b;$('#modalMain').onclick=fn;$('#modal').classList.remove('hidden')}function closeModal(){$('#modal').classList.add('hidden')}
function toast(s){let e=$('#toast');e.textContent=s;setTimeout(()=>{if(e.textContent===s)e.textContent=''},1100)}
function drawLegacy(){
ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
let g=ctx.createLinearGradient(0,70,W,H);g.addColorStop(0,'#61764a');g.addColorStop(.48,'#405c37');g.addColorStop(1,'#253b2a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
// dirt lane with layered edges
ctx.lineCap='round';ctx.globalAlpha=.28;ctx.strokeStyle='#1b291d';ctx.lineWidth=Math.max(104,W*.27);ctx.beginPath();ctx.moveTo(W*.10,H*.16);ctx.bezierCurveTo(W*.88,H*.28,W*.13,H*.57,W*.83,H*.84);ctx.stroke();
ctx.globalAlpha=.95;ctx.strokeStyle='#817257';ctx.lineWidth=Math.max(78,W*.20);ctx.beginPath();ctx.moveTo(W*.10,H*.16);ctx.bezierCurveTo(W*.88,H*.28,W*.13,H*.57,W*.83,H*.84);ctx.stroke();
ctx.globalAlpha=.22;ctx.strokeStyle='#c0a97c';ctx.lineWidth=Math.max(46,W*.12);ctx.stroke();ctx.globalAlpha=1;
// deterministic grass, stones, scorch marks
for(let i=0;i<110;i++){let px=(i*83+17)%W,py=90+(i*149)%Math.max(130,H-250),r=1+(i%4);ctx.fillStyle=i%7===0?'#263d2b':i%5===0?'#6d7451':'#355a34';ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill()}
for(let i=0;i<14;i++){let px=(i*157+53)%W,py=105+(i*211)%Math.max(150,H-280);ctx.globalAlpha=.12;ctx.fillStyle='#080b08';ctx.beginPath();ctx.ellipse(px,py,13+i%9,6+i%5,(i*.7)%3,0,7);ctx.fill()}ctx.globalAlpha=1;
// obstacles with depth and cracks
obstacles.forEach((w,i)=>{ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=13;ctx.shadowOffsetY=8;
let og=ctx.createLinearGradient(w.x,w.y,w.x+w.w,w.y+w.h);og.addColorStop(0,w.type==='rock'?'#77766c':'#847b67');og.addColorStop(1,w.type==='rock'?'#474b47':'#514b40');ctx.fillStyle=og;
if(w.type==='rock'){ctx.beginPath();ctx.moveTo(w.x+7,w.y);ctx.lineTo(w.x+w.w-8,w.y+4);ctx.lineTo(w.x+w.w,w.y+w.h*.55);ctx.lineTo(w.x+w.w-10,w.y+w.h);ctx.lineTo(w.x+4,w.y+w.h-5);ctx.lineTo(w.x,w.y+9);ctx.closePath();ctx.fill()}
else ctx.fillRect(w.x,w.y,w.w,w.h);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#b0a78d';ctx.globalAlpha=.55;ctx.strokeRect(w.x+2,w.y+2,w.w-4,w.h-4);
ctx.strokeStyle='#282a25';ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(w.x+w.w*.2,w.y+w.h*.2);ctx.lineTo(w.x+w.w*.48,w.y+w.h*.55);ctx.lineTo(w.x+w.w*.72,w.y+w.h*.35);ctx.stroke();ctx.restore()});
// wreck shadows
wrecks.forEach(w=>{ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.a);ctx.globalAlpha=.42;ctx.fillStyle='#111713';ctx.fillRect(-23,-16,46,32);ctx.fillStyle='#40251e';ctx.fillRect(-15,-11,30,22);ctx.restore()});
enemies.forEach(e=>tank(e,true));tank(player,false);
// projectiles
bullets.forEach(b=>{ctx.strokeStyle=b.f?'#fff19a':'#ff6d58';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=9;ctx.lineWidth=b.f?3.2:2.7;ctx.beginPath();ctx.moveTo(b.x-b.vx*3.5,b.y-b.vy*3.5);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fffbd4';ctx.beginPath();ctx.arc(b.x,b.y,3.5,0,7);ctx.fill();ctx.shadowBlur=0});
particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life/260);ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=11;ctx.beginPath();ctx.arc(p.x,p.y,2.5+Math.min(3,p.life/220),0,7);ctx.fill();ctx.shadowBlur=0});
ctx.globalAlpha=1;ctx.restore()}
function tank(o,enemy){
let bossy=o.type==='boss',sc=bossy?1.38:(o.type==='heavy'?1.12:1),a=o.a;
ctx.save();ctx.translate(o.x,o.y);ctx.rotate(a);ctx.shadowColor='#000b';ctx.shadowBlur=9;ctx.shadowOffsetY=6;
// tracks
ctx.fillStyle='#202622';ctx.fillRect(-24*sc,-18*sc,48*sc,8*sc);ctx.fillRect(-24*sc,10*sc,48*sc,8*sc);
ctx.strokeStyle='#596058';ctx.lineWidth=1;for(let k=-18;k<=18;k+=8){ctx.beginPath();ctx.moveTo(k*sc,-18*sc);ctx.lineTo(k*sc,-10*sc);ctx.moveTo(k*sc,10*sc);ctx.lineTo(k*sc,18*sc);ctx.stroke()}
// hull
let hg=ctx.createLinearGradient(-18,-13,18,13);hg.addColorStop(0,enemy?(bossy?'#6f211f':'#7e302b'):'#315f48');hg.addColorStop(.5,enemy?(bossy?'#c34635':'#b64c3e'):'#64a06a');hg.addColorStop(1,enemy?'#52201e':'#244b39');ctx.fillStyle=hg;
ctx.beginPath();ctx.moveTo(-19*sc,-12*sc);ctx.lineTo(15*sc,-12*sc);ctx.lineTo(21*sc,-7*sc);ctx.lineTo(21*sc,7*sc);ctx.lineTo(15*sc,12*sc);ctx.lineTo(-19*sc,12*sc);ctx.closePath();ctx.fill();
ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#ffffff32';ctx.stroke();
// engine deck
ctx.fillStyle='#1118';ctx.fillRect(-16*sc,-7*sc,8*sc,14*sc);ctx.restore();
// turret independently aims for player
let ta=o===player?o.t:o.a;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(ta);ctx.shadowColor='#0009';ctx.shadowBlur=5;
ctx.fillStyle=enemy?(bossy?'#d0523c':'#a83e35'):'#57955f';ctx.beginPath();ctx.ellipse(0,0,12*sc,10*sc,0,0,7);ctx.fill();ctx.fillStyle='#c9c3aa';ctx.fillRect(4*sc,-3*sc,30*sc,6*sc);ctx.fillStyle='#222';ctx.fillRect(31*sc,-3.4*sc,5*sc,6.8*sc);ctx.restore();
if(enemy){ctx.fillStyle='#321619';ctx.fillRect(o.x-23,o.y-o.r-14,46,6);ctx.fillStyle=bossy?'#ffb23f':'#ef4b45';ctx.fillRect(o.x-23,o.y-o.r-14,46*Math.max(0,o.hp/o.max),6)}
}
// ===== ULTIMATE 6.0 VISUAL REMAKE =====
function rr(x,y,w,h,r){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function shadowEllipse(x,y,rx,ry,a=.35){
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawTerrain(){
  let g=ctx.createLinearGradient(0,70,W,H);
  g.addColorStop(0,'#52613d');g.addColorStop(.45,'#35452f');g.addColorStop(1,'#1f3027');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  // broad cinematic dirt road
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle='#171c17';ctx.globalAlpha=.45;ctx.lineWidth=Math.max(150,W*.42);
  ctx.beginPath();ctx.moveTo(W*.18,H*.08);ctx.bezierCurveTo(W*.88,H*.26,W*.08,H*.56,W*.78,H*.94);ctx.stroke();
  ctx.strokeStyle='#74664d';ctx.globalAlpha=1;ctx.lineWidth=Math.max(128,W*.35);ctx.stroke();
  ctx.strokeStyle='#9a8862';ctx.globalAlpha=.28;ctx.lineWidth=Math.max(82,W*.22);ctx.stroke();
  ctx.restore();

  // tile/stone variation
  for(let i=0;i<150;i++){
    let x=(i*97+31)%W, y=85+(i*173)%Math.max(100,H-225);
    let r=1+(i%5)*.65;
    ctx.fillStyle=i%6===0?'#17291d':i%4===0?'#6c694f':'#304c31';
    ctx.globalAlpha=.45+(i%4)*.08;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
  }
  ctx.globalAlpha=1;

  // bushes
  for(let i=0;i<26;i++){
    let x=(i*181+47)%W,y=110+(i*239)%Math.max(120,H-300);
    ctx.save();ctx.globalAlpha=.5;
    for(let k=0;k<5;k++){
      ctx.fillStyle=k%2?'#1c3c25':'#294e2d';
      ctx.beginPath();ctx.arc(x+Math.cos(k*1.3)*7,y+Math.sin(k*1.7)*5,5+(k%3),0,7);ctx.fill();
    }ctx.restore();
  }
}
function drawObstacle(w,i){
  ctx.save();ctx.shadowColor='#000b';ctx.shadowBlur=14;ctx.shadowOffsetY=9;
  let g=ctx.createLinearGradient(w.x,w.y,w.x+w.w,w.y+w.h);
  if(w.type==='rock'){g.addColorStop(0,'#827b69');g.addColorStop(.5,'#5c594d');g.addColorStop(1,'#343934')}
  else {g.addColorStop(0,'#9b8b70');g.addColorStop(.45,'#756852');g.addColorStop(1,'#403c34')}
  ctx.fillStyle=g;
  if(w.type==='rock'){
    ctx.beginPath();ctx.moveTo(w.x+5,w.y+10);ctx.lineTo(w.x+w.w*.25,w.y);
    ctx.lineTo(w.x+w.w-8,w.y+6);ctx.lineTo(w.x+w.w,w.y+w.h*.62);
    ctx.lineTo(w.x+w.w*.72,w.y+w.h);ctx.lineTo(w.x+8,w.y+w.h-5);ctx.closePath();ctx.fill();
  } else rr(w.x,w.y,w.w,w.h,4);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='#c4b69555';ctx.lineWidth=2;ctx.strokeRect(w.x+2,w.y+2,w.w-4,w.h-4);
  ctx.strokeStyle='#2a2924aa';ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(w.x+w.w*.18,w.y+w.h*.25);ctx.lineTo(w.x+w.w*.42,w.y+w.h*.55);
  ctx.lineTo(w.x+w.w*.58,w.y+w.h*.38);ctx.lineTo(w.x+w.w*.82,w.y+w.h*.7);ctx.stroke();
  // rubble
  for(let k=0;k<4;k++){ctx.fillStyle='#4a463c';ctx.fillRect(w.x+8+k*17,w.y+w.h-3+(k%2)*5,7,5)}
  ctx.restore();
}
function drawTank6(o,enemy){
  let bossy=o.type==='boss', heavy=o.type==='heavy', sc=bossy?1.45:(heavy?1.16:1);
  let bodyA=o.a||0, turretA=o===player?o.t:bodyA;
  shadowEllipse(o.x+3,o.y+7,29*sc,20*sc,.42);

  // chassis
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate(bodyA);
  ctx.shadowColor='#000b';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
  // tracks
  let track=ctx.createLinearGradient(0,-20,0,20);track.addColorStop(0,'#111713');track.addColorStop(.5,'#3e443d');track.addColorStop(1,'#0c100e');
  ctx.fillStyle=track;rr(-27*sc,-20*sc,52*sc,9*sc,3);rr(-27*sc,11*sc,52*sc,9*sc,3);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  // road wheels
  for(let k=-19;k<=17;k+=9){
    ctx.fillStyle='#171b18';ctx.beginPath();ctx.arc(k*sc,-15.5*sc,3.2*sc,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(k*sc,15.5*sc,3.2*sc,0,7);ctx.fill();
    ctx.strokeStyle='#72766d';ctx.lineWidth=1;ctx.stroke();
  }
  // hull
  let hg=ctx.createLinearGradient(-22,-15,22,15);
  if(enemy){hg.addColorStop(0,bossy?'#421518':'#5c2020');hg.addColorStop(.45,bossy?'#d24b32':'#a83931');hg.addColorStop(1,'#351516')}
  else {hg.addColorStop(0,'#123d3c');hg.addColorStop(.42,'#20a69a');hg.addColorStop(.68,'#397d63');hg.addColorStop(1,'#112d29')}
  ctx.fillStyle=hg;ctx.beginPath();ctx.moveTo(-23*sc,-13*sc);ctx.lineTo(14*sc,-14*sc);ctx.lineTo(23*sc,-8*sc);ctx.lineTo(23*sc,8*sc);ctx.lineTo(14*sc,14*sc);ctx.lineTo(-23*sc,13*sc);ctx.closePath();ctx.fill();
  ctx.strokeStyle=enemy?'#ff826855':'#7dfff077';ctx.lineWidth=1.4;ctx.stroke();
  // armor plates / engine
  ctx.fillStyle='#0b1512aa';rr(-18*sc,-9*sc,10*sc,18*sc,2);
  ctx.strokeStyle='#ffffff25';for(let k=-5;k<=5;k+=5){ctx.beginPath();ctx.moveTo(-16*sc,k*sc);ctx.lineTo(-10*sc,k*sc);ctx.stroke()}
  ctx.fillStyle=enemy?'#ff7c5d':'#61e2c1';ctx.globalAlpha=.7;ctx.fillRect(9*sc,-10*sc,2*sc,20*sc);ctx.globalAlpha=1;
  ctx.restore();

  // turret
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate(turretA);
  ctx.shadowColor='#000a';ctx.shadowBlur=6;
  let tg=ctx.createRadialGradient(-4,-4,2,0,0,17*sc);
  if(enemy){tg.addColorStop(0,bossy?'#ff7b48':'#db5b47');tg.addColorStop(1,'#501b1d')}
  else {tg.addColorStop(0,'#62e0c1');tg.addColorStop(.45,'#258c78');tg.addColorStop(1,'#123d38')}
  ctx.fillStyle=tg;ctx.beginPath();ctx.moveTo(-12*sc,-11*sc);ctx.lineTo(8*sc,-10*sc);ctx.lineTo(15*sc,-5*sc);ctx.lineTo(15*sc,5*sc);ctx.lineTo(8*sc,10*sc);ctx.lineTo(-12*sc,11*sc);ctx.lineTo(-16*sc,5*sc);ctx.lineTo(-16*sc,-5*sc);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ffffff35';ctx.stroke();
  // hatch
  ctx.fillStyle='#111b18aa';ctx.beginPath();ctx.arc(-4*sc,0,5*sc,0,7);ctx.fill();ctx.strokeStyle='#ffffff30';ctx.stroke();
  // barrel
  let bg=ctx.createLinearGradient(8,-4,8,4);bg.addColorStop(0,'#ddd8c1');bg.addColorStop(.5,'#8f9187');bg.addColorStop(1,'#454b47');
  ctx.fillStyle=bg;rr(8*sc,-3.5*sc,34*sc,7*sc,2);ctx.fillStyle='#181c1b';rr(38*sc,-4.2*sc,7*sc,8.4*sc,2);
  // glow accent for player
  if(!enemy){ctx.shadowColor='#31fff0';ctx.shadowBlur=14;ctx.strokeStyle='#43e9dc99';ctx.beginPath();ctx.moveTo(-15*sc,-8*sc);ctx.lineTo(7*sc,-8*sc);ctx.stroke()}
  ctx.restore();

  if(enemy){
    let bw=bossy?58:48;ctx.fillStyle='#210f12cc';rr(o.x-bw/2,o.y-(o.r||20)-18,bw,7,4);
    ctx.fillStyle=bossy?'#ff9d32':'#ff4949';let hp=Math.max(0,o.hp/o.max);rr(o.x-bw/2,o.y-(o.r||20)-18,bw*hp,7,4);
  } else {
    ctx.save();ctx.strokeStyle='#45e6dc55';ctx.lineWidth=2;ctx.shadowColor='#36e7db';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(o.x,o.y,34,0,7);ctx.stroke();ctx.restore();
  }
}
function draw(){
  ctx.save();
  if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  drawTerrain();
  obstacles.forEach(drawObstacle);
  wrecks.forEach(w=>{ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.a);ctx.globalAlpha=.45;ctx.fillStyle='#151714';rr(-24,-15,48,30,4);ctx.fillStyle='#5b2c20';rr(-15,-10,30,20,4);ctx.restore()});
  enemies.forEach(e=>drawTank6(e,true));drawTank6(player,false);

  bullets.forEach(b=>{
    ctx.save();ctx.strokeStyle=b.f?'#8ffcff':'#ff7b55';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=14;ctx.lineWidth=b.f?4:3;
    ctx.beginPath();ctx.moveTo(b.x-b.vx*4.5,b.y-b.vy*4.5);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,3.5,0,7);ctx.fill();ctx.restore();
  });
  particles.forEach(p=>{
    ctx.save();ctx.globalAlpha=Math.min(1,p.life/220);ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(p.x,p.y,2.5+Math.min(5,p.life/160),0,7);ctx.fill();ctx.restore();
  });
  // cinematic vignette
  let vg=ctx.createRadialGradient(W/2,H*.48,Math.min(W,H)*.18,W/2,H*.48,Math.max(W,H)*.7);
  vg.addColorStop(.55,'#0000');vg.addColorStop(1,'#0007');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  ctx.restore();
}

let J=$('#joy'),stick=J.querySelector('i'),jid=null;function moveJoy(X,Y){let r=J.getBoundingClientRect(),dx=X-(r.left+r.width/2),dy=Y-(r.top+r.height/2),m=Math.hypot(dx,dy),lim=42;if(m>lim){dx=dx/m*lim;dy=dy/m*lim}joy.x=dx/lim;joy.y=dy/lim;stick.style.transform=`translate(${dx}px,${dy}px)`}J.onpointerdown=e=>{jid=e.pointerId;J.setPointerCapture(jid);moveJoy(e.clientX,e.clientY)};J.onpointermove=e=>{if(e.pointerId===jid)moveJoy(e.clientX,e.clientY)};J.onpointerup=J.onpointercancel=e=>{if(jid===null||e.pointerId===jid){jid=null;joy.x=joy.y=0;stick.style.transform=''}};
let F=$('#fire');F.onpointerdown=e=>{firing=true;F.setPointerCapture(e.pointerId)};F.onpointerup=F.onpointercancel=()=>firing=false;
$('#skill').onclick=()=>{if(repairCd>0||!player)return;let s=stats();player.hp=Math.min(player.max,player.hp+s.repair);repairCd=8000;toast('维修 +'+s.repair);hud()};
menuUI();show(menu);
})();