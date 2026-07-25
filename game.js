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
function tank(t,enemy=false){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.a+Math.PI/2);let boss=t.boss;ctx.fillStyle=enemy?(boss?'#78191c':'#9c292d'):'#397c3e';ctx.fillRect(-boss*8-17,-25-boss*8,boss?50:34,boss?66:50);ctx.fillStyle=enemy?'#d53b40':'#6baa57';ctx.fillRect(-13,-18,26,34);ctx.fillStyle='#ddd';ctx.fillRect(-4,-42,8,30);ctx.restore();if(enemy){ctx.fillStyle='#431a1d';ctx.fillRect(t.x-25,t.y-34,50,5);ctx.fillStyle='#ff4650';ctx.fillRect(t.x-25,t.y-34,50*Math.max(0,t.hp/t.max),5)}}
function draw(){ctx.clearRect(0,0,W,H);let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#244d28');g.addColorStop(1,'#102f1b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalAlpha=.12;ctx.strokeStyle='#b7d79f';for(let x=0;x<W;x+=55){ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x,H);ctx.stroke()}for(let y=110;y<H;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.globalAlpha=1;
 [[55,H*.43,125,50],[W*.66,H*.49,150,48],[W*.38,H*.62,50,150]].forEach(o=>{ctx.fillStyle='#665941';ctx.fillRect(...o);ctx.strokeStyle='#9c8b65';ctx.strokeRect(...o)});
 enemies.forEach(e=>tank(e,true));tank(player,false);ctx.fillStyle='#ffe66a';bullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill()});ctx.fillStyle='#ff9d63';enemyBullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill()});particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.l/15);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,4,4)});ctx.globalAlpha=1}
function loop(t){if(!running)return;if(!paused)update();draw();requestAnimationFrame(loop)}
