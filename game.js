const $=s=>document.querySelector(s);
let save=JSON.parse(localStorage.getItem('tankwar2')||'null')||{coins:0,level:1,best:1,hp:120,damage:25,speed:1};
const menu=$('#menu'),game=$('#game'),canvas=$('#canvas'),ctx=canvas.getContext('2d');
let W,H,player,enemies=[],bullets=[],enemyBullets=[],particles=[],wave=1,paused=false,running=false,last=0,joy={x:0,y:0};
function persist(){localStorage.setItem('tankwar2',JSON.stringify(save));syncUI()}
function syncUI(){ $('#coinsMenu').textContent=save.coins;$('#levelMenu').textContent=save.level;$('#bestMenu').textContent=save.best;$('#coins').textContent=save.coins;$('#upgradeInfo').textContent=`装甲 ${save.hp} · 火力 ${save.damage} · 速度 ${Math.round(save.speed*100)}%`}
syncUI();
$('#garageBtn').onclick=()=>$('#garage').classList.toggle('hidden');
document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{if(save.coins<20)return;save.coins-=20;let k=b.dataset.up;if(k==='hp')save.hp+=20;if(k==='damage')save.damage+=5;if(k==='speed')save.speed+=.05;persist()});
$('#startBtn').onclick=startGame;
$('#pauseBtn').onclick=()=>{paused=!paused;$('#pauseBtn').textContent=paused?'▶':'Ⅱ'};
function resize(){W=canvas.width=innerWidth*devicePixelRatio;H=canvas.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);W=innerWidth;H=innerHeight}addEventListener('resize',resize);resize();
function startGame(){menu.classList.add('hidden');game.classList.remove('hidden');wave=1;running=true;paused=false;player={x:W/2,y:H*.73,a:-Math.PI/2,hp:save.hp,max:save.hp,cd:0};spawnWave();requestAnimationFrame(loop)}
function spawnWave(){enemies=[];let n=3+wave;if(wave%5===0){n=1;$('#bossLabel').classList.remove('hidden');setTimeout(()=>$('#bossLabel').classList.add('hidden'),1800)}for(let i=0;i<n;i++){let boss=wave%5===0;enemies.push({x:40+Math.random()*(W-80),y:130+Math.random()*Math.min(330,H*.35),a:Math.PI/2,hp:boss?350+wave*30:55+wave*8,max:boss?350+wave*30:55+wave*8,s:boss?.35:.55+wave*.02,cd:40+Math.random()*80,boss})}$('#wave').textContent=wave;$('#enemyCount').textContent=enemies.length}
function fire(){if(!running||paused||player.cd>0)return;player.cd=12;bullets.push({x:player.x+Math.cos(player.a)*25,y:player.y+Math.sin(player.a)*25,vx:Math.cos(player.a)*9,vy:Math.sin(player.a)*9,d:save.damage});burst(player.x+Math.cos(player.a)*28,player.y+Math.sin(player.a)*28,'#ffd85a',5)}
$('#fireBtn').addEventListener('pointerdown',e=>{e.preventDefault();fire()});
let joyEl=$('#joy'),stick=$('#stick'),jid=null;
joyEl.addEventListener('pointerdown',e=>{jid=e.pointerId;joyEl.setPointerCapture(jid);moveJoy(e)});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId===jid)moveJoy(e)});
joyEl.addEventListener('pointerup',e=>{jid=null;joy={x:0,y:0};stick.style.transform='translate(0,0)'});
function moveJoy(e){let r=joyEl.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.hypot(x,y),lim=r.width*.32;if(m>lim){x=x/m*lim;y=y/m*lim}joy={x:x/lim,y:y/lim};stick.style.transform=`translate(${x}px,${y}px)`}
function burst(x,y,c,n=12){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,l:25+Math.random()*20,c})}
function hit(a,b,r){return Math.hypot(a.x-b.x,a.y-b.y)<r}
function update(){
 if(Math.hypot(joy.x,joy.y)>.12){player.a=Math.atan2(joy.y,joy.x);player.x+=joy.x*3.2*save.speed;player.y+=joy.y*3.2*save.speed}
 player.x=Math.max(22,Math.min(W-22,player.x));player.y=Math.max(105,Math.min(H-25,player.y));if(player.cd>0)player.cd--;
 bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy});enemyBullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy});
 enemies.forEach(e=>{let a=Math.atan2(player.y-e.y,player.x-e.x);e.a=a;e.x+=Math.cos(a)*e.s;e.y+=Math.sin(a)*e.s;e.cd--;if(e.cd<=0){e.cd=e.boss?28:65+Math.random()*40;enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*3.2,vy:Math.sin(a)*3.2,d:e.boss?18:10})}});
 bullets.forEach(b=>enemies.forEach(e=>{if(!b.dead&&!e.dead&&hit(b,e,e.boss?35:24)){b.dead=true;e.hp-=b.d;burst(b.x,b.y,'#ffbd36',8);if(e.hp<=0){e.dead=true;save.coins+=e.boss?50:5;burst(e.x,e.y,'#ff5a24',30)}}}));
 enemyBullets.forEach(b=>{if(!b.dead&&hit(b,player,22)){b.dead=true;player.hp-=b.d;burst(player.x,player.y,'#ff693c',10)}});
 bullets=bullets.filter(b=>!b.dead&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);enemyBullets=enemyBullets.filter(b=>!b.dead&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);enemies=enemies.filter(e=>!e.dead);
 particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.96;p.vy*=.96;p.l--});particles=particles.filter(p=>p.l>0);
 $('#enemyCount').textContent=enemies.length;$('#coins').textContent=save.coins;$('#hptext').textContent=`${Math.max(0,Math.ceil(player.hp))}/${player.max}`;$('#hpbar').style.width=Math.max(0,player.hp/player.max*100)+'%';
 if(player.hp<=0){running=false;save.best=Math.max(save.best,wave);persist();$('#message').textContent='战车被摧毁';setTimeout(()=>{game.classList.add('hidden');menu.classList.remove('hidden');$('#message').textContent=''},1400)}
 if(enemies.length===0&&running){wave++;save.best=Math.max(save.best,wave);if(wave%3===0){save.level++;player.hp=Math.min(player.max,player.hp+30)}persist();spawnWave()}
}
function tank(t,enemy=false){
 ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.a+Math.PI/2);
 let boss=t.boss, sc=boss?1.35:1;
 ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.shadowOffsetY=7;
 ctx.fillStyle='#182018';
 ctx.fillRect(-24*sc,-25*sc,10*sc,50*sc);ctx.fillRect(14*sc,-25*sc,10*sc,50*sc);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.fillStyle=enemy?(boss?'#681c20':'#8f3030'):'#356b3d';
 ctx.fillRect(-17*sc,-23*sc,34*sc,46*sc);
 ctx.fillStyle=enemy?(boss?'#a33132':'#bd4945'):'#5d9a55';
 ctx.fillRect(-13*sc,-17*sc,26*sc,30*sc);
 ctx.fillStyle='#ffffff18';ctx.fillRect(-10*sc,-14*sc,5*sc,23*sc);
 ctx.restore();

 ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.a+Math.PI/2);
 ctx.fillStyle=enemy?'#b4a69b':'#b9c6a4';ctx.fillRect(-3.5*sc,-43*sc,7*sc,35*sc);
 ctx.fillStyle=enemy?(boss?'#8c292b':'#a63b3a'):'#4d8449';
 ctx.beginPath();ctx.arc(0,-5*sc,11*sc,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#1b241b';ctx.beginPath();ctx.arc(0,-5*sc,4*sc,0,Math.PI*2);ctx.fill();
 ctx.restore();

 if(enemy){
  ctx.fillStyle='#281517';ctx.fillRect(t.x-25,t.y-36,50,5);
  ctx.fillStyle=t.boss?'#ffb02e':'#ff4650';
  ctx.fillRect(t.x-25,t.y-36,50*Math.max(0,t.hp/t.max),5)
 }
}
function draw(){
 ctx.clearRect(0,0,W,H);
 let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#315c32');g.addColorStop(.55,'#234a2a');g.addColorStop(1,'#132e1d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

 // dirt road
 ctx.fillStyle='#725f3f';ctx.globalAlpha=.42;ctx.beginPath();ctx.moveTo(W*.37,90);ctx.lineTo(W*.64,90);ctx.lineTo(W*.82,H);ctx.lineTo(W*.16,H);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 // grass, stones, craters
 for(let i=0;i<55;i++){let px=(i*97+23)%W,py=105+(i*151)%(Math.max(120,H-250));ctx.fillStyle=i%4===0?'#756747':'#47703b';ctx.beginPath();ctx.arc(px,py,2+i%3,0,7);ctx.fill()}
 for(let i=0;i<7;i++){let px=(i*131+61)%W,py=150+(i*173)%(Math.max(100,H-330));ctx.fillStyle='#16271955';ctx.beginPath();ctx.ellipse(px,py,18+i%3*5,8+i%2*4,.2,0,7);ctx.fill()}

 [[55,H*.43,125,50],[W*.66,H*.49,150,48],[W*.38,H*.62,50,150]].forEach((o,i)=>{
  ctx.shadowColor='#0008';ctx.shadowBlur=9;ctx.shadowOffsetY=5;ctx.fillStyle=i===2?'#61553d':'#75664a';ctx.fillRect(...o);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#a39068';ctx.lineWidth=2;ctx.strokeRect(...o);
  ctx.strokeStyle='#ffffff10';for(let k=8;k<o[2];k+=18){ctx.beginPath();ctx.moveTo(o[0]+k,o[1]);ctx.lineTo(o[0]+k,o[1]+o[3]);ctx.stroke()}
 });

 enemies.forEach(e=>tank(e,true));tank(player,false);

 bullets.forEach(b=>{ctx.strokeStyle='#ffe16a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*2.2,b.y-b.vy*2.2);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fff5ae';ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill()});
 enemyBullets.forEach(b=>{ctx.strokeStyle='#ff684d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x-b.vx*2,b.y-b.vy*2);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#ffb18a';ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill()});
 particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.l/15);ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,2+Math.min(4,p.l/12),0,7);ctx.fill();ctx.shadowBlur=0});
 ctx.globalAlpha=1
}
function loop(t){if(!running)return;if(!paused)update();draw();requestAnimationFrame(loop)}
