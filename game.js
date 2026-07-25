(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens={lobby:$('#lobby'),upgrade:$('#upgradeScreen'),game:$('#gameScreen')};
const saveKey='tankwar_v4_save';
const defaultSave={coins:0,level:1,bestWave:1,upgrades:{armor:0,damage:0,reload:0,speed:0}};
let save=loadSave();

function loadSave(){try{return {...defaultSave,...JSON.parse(localStorage.getItem(saveKey)||'{}'),upgrades:{...defaultSave.upgrades,...(JSON.parse(localStorage.getItem(saveKey)||'{}').upgrades||{})}}}catch{return structuredClone(defaultSave)}}
function store(){localStorage.setItem(saveKey,JSON.stringify(save))}
function show(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active');if(name==='lobby')refreshLobby();if(name==='upgrade')refreshUpgrades()}
function refreshLobby(){$('#lobbyCoins').textContent=save.coins;$('#lobbyLevel').textContent=save.level;$('#bestWave').textContent=save.bestWave}
function upgradeCost(k){return 100+save.upgrades[k]*150}
function refreshUpgrades(){
 $('#upgradeCoins').textContent=save.coins;
 for(const k of Object.keys(save.upgrades)){
  const lv=save.upgrades[k], cost=upgradeCost(k);
  $('#'+k+'Meter').style.width=Math.min(100,lv*10)+'%';
  $('#'+k+'Cost').textContent='🪙'+cost;
  const b=$(`[data-upgrade="${k}"]`); b.disabled=save.coins<cost||lv>=10;
 }
}
$$('[data-upgrade]').forEach(b=>b.onclick=()=>{const k=b.dataset.upgrade,c=upgradeCost(k);if(save.coins>=c&&save.upgrades[k]<10){save.coins-=c;save.upgrades[k]++;save.level=1+Object.values(save.upgrades).reduce((a,b)=>a+b,0);store();refreshUpgrades()}})
$('#startBtn').onclick=()=>{show('game');startGame()}
$('#upgradeBtn').onclick=()=>show('upgrade'); $('#backLobby').onclick=()=>show('lobby')
$('#resetBtn').onclick=()=>{if(confirm('确定重置全部进度？')){save=structuredClone(defaultSave);store();refreshLobby()}}
$('#quitBtn').onclick=()=>{endLoop();show('lobby')}
$('#resultLobbyBtn').onclick=()=>{show('lobby')}
$('#retryBtn').onclick=()=>{hide($('#gameOverPanel'));startGame()}
$('#pauseBtn').onclick=()=>pause(true); $('#resumeBtn').onclick=()=>pause(false)

const canvas=$('#game'),ctx=canvas.getContext('2d');
let W=0,H=0,raf=0,last=0,paused=false,gameOver=false,wave=1,runCoins=0,nextWaveTimer=0;
let player,bullets,enemies,particles,walls,keys={},joy={x:0,y:0},firing=false;

function resize(){const dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

function stats(){
 return {
  maxHp:100+save.upgrades.armor*25,
  damage:34+save.upgrades.damage*8,
  reload:Math.max(180,560-save.upgrades.reload*32),
  speed:2.45+save.upgrades.speed*.18
 }
}
function startGame(){
 const s=stats(); player={x:W/2,y:H*.72,r:20,angle:-Math.PI/2,turret:-Math.PI/2,hp:s.maxHp,maxHp:s.maxHp,lastShot:0,inv:0};
 bullets=[];enemies=[];particles=[];walls=[];wave=1;runCoins=0;nextWaveTimer=0;gameOver=false;paused=false;hide($('#pausePanel'));hide($('#gameOverPanel'));
 makeWalls();spawnWave();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);updateHud()
}
function makeWalls(){
 const top=90,bottom=H-210;
 walls=[{x:W*.18,y:H*.38,w:70,h:22},{x:W*.65,y:H*.46,w:90,h:22},{x:W*.39,y:H*.58,w:24,h:85}].filter(w=>w.y>top&&w.y+w.h<bottom)
}
function spawnWave(){
 const count=Math.min(3+wave,12);
 for(let i=0;i<count;i++){let x=50+Math.random()*(W-100),y=95+Math.random()*Math.max(90,H*.34);enemies.push({x,y,r:18,hp:55+wave*12,maxHp:55+wave*12,speed:.7+wave*.035,cd:700+Math.random()*700,lastShot:0,angle:0})}
 updateHud()
}
function loop(t){
 const dt=Math.min(32,t-last);last=t;if(!paused&&!gameOver){update(dt,t);draw()}raf=requestAnimationFrame(loop)
}
function endLoop(){cancelAnimationFrame(raf)}
function update(dt,t){
 const s=stats();let mx=joy.x,my=joy.y;
 if(keys['w']||keys['ArrowUp'])my-=1;if(keys['s']||keys['ArrowDown'])my+=1;if(keys['a']||keys['ArrowLeft'])mx-=1;if(keys['d']||keys['ArrowRight'])mx+=1;
 const m=Math.hypot(mx,my);if(m>.1){mx/=Math.max(1,m);my/=Math.max(1,m);player.x+=mx*s.speed*dt/16.7;player.y+=my*s.speed*dt/16.7;player.angle=Math.atan2(my,mx)}
 player.x=Math.max(24,Math.min(W-24,player.x));player.y=Math.max(86,Math.min(H-190,player.y));resolveWalls(player);
 let target=nearestEnemy();if(target)player.turret=Math.atan2(target.y-player.y,target.x-player.x);
 if((firing||keys[' '])&&t-player.lastShot>s.reload){shoot(player.x,player.y,player.turret,9,s.damage,true);player.lastShot=t;beep(520,.04,.035)}
 for(const e of enemies){
  const a=Math.atan2(player.y-e.y,player.x-e.x);e.angle=a;e.x+=Math.cos(a)*e.speed*dt/16.7;e.y+=Math.sin(a)*e.speed*dt/16.7;resolveWalls(e);
  const d=Math.hypot(player.x-e.x,player.y-e.y);
  if(d<310&&t-e.lastShot>e.cd){shoot(e.x,e.y,a,5.2,12+wave*1.7,false);e.lastShot=t}
 }
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt/16.7;b.y+=b.vy*dt/16.7;b.life-=dt;if(b.life<=0||b.x<0||b.x>W||b.y<70||b.y>H-175||hitWall(b)){bullets.splice(i,1);continue}
  if(b.friendly){for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+4){e.hp-=b.dmg;burst(b.x,b.y,6);bullets.splice(i,1);if(e.hp<=0){burst(e.x,e.y,18);enemies.splice(j,1);runCoins+=10+wave*2;beep(120,.08,.05)}break}}}
  else if(Math.hypot(b.x-player.x,b.y-player.y)<player.r+4&&player.inv<=0){player.hp-=b.dmg;player.inv=140;burst(player.x,player.y,8);bullets.splice(i,1);beep(80,.1,.05);if(player.hp<=0)finishGame()}
 }
 player.inv-=dt;
 particles.forEach(p=>{p.x+=p.vx*dt/16.7;p.y+=p.vy*dt/16.7;p.life-=dt;p.a=p.life/p.max});particles=particles.filter(p=>p.life>0);
 if(enemies.length===0&&!gameOver){if(!nextWaveTimer)nextWaveTimer=t+1300;if(t>nextWaveTimer){wave++;nextWaveTimer=0;player.hp=Math.min(player.maxHp,player.hp+Math.round(player.maxHp*.18));spawnWave()}}
 updateHud()
}
function shoot(x,y,a,speed,dmg,friendly){bullets.push({x:x+Math.cos(a)*24,y:y+Math.sin(a)*24,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,dmg,friendly,life:1600})}
function nearestEnemy(){let best=null,bd=1e9;for(const e of enemies){const d=(e.x-player.x)**2+(e.y-player.y)**2;if(d<bd){bd=d;best=e}}return best}
function resolveWalls(o){for(const w of walls){const cx=Math.max(w.x,Math.min(o.x,w.x+w.w)),cy=Math.max(w.y,Math.min(o.y,w.y+w.h));const dx=o.x-cx,dy=o.y-cy,d=Math.hypot(dx,dy);if(d<o.r){const k=(o.r-d+1)/(d||1);o.x+=dx*k;o.y+=dy*k}}}
function hitWall(b){return walls.some(w=>b.x>w.x&&b.x<w.x+w.w&&b.y>w.y&&b.y<w.y+w.h)}
function burst(x,y,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*4,l=180+Math.random()*420;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:l,max:l,a:1})}}
function finishGame(){gameOver=true;save.coins+=runCoins;save.bestWave=Math.max(save.bestWave,wave);store();$('#resultWave').textContent=wave;$('#resultCoins').textContent=runCoins;showEl($('#gameOverPanel'))}
function pause(v){paused=v;v?showEl($('#pausePanel')):hide($('#pausePanel'))}
function updateHud(){$('#hpBar').style.width=Math.max(0,player?player.hp/player.maxHp*100:100)+'%';$('#hpText').textContent=player?Math.max(0,Math.ceil(player.hp))+'/'+player.maxHp:'100/100';$('#waveText').textContent=wave;$('#enemyCount').textContent=enemies?enemies.length:0;$('#coinsText').textContent=runCoins}
function draw(){
 ctx.clearRect(0,0,W,H);
 const grd=ctx.createLinearGradient(0,70,0,H);grd.addColorStop(0,'#25462f');grd.addColorStop(1,'#17291e');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#ffffff0c';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,70);ctx.lineTo(x,H);ctx.stroke()}for(let y=70;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 for(const w of walls){ctx.fillStyle='#6b5d44';ctx.fillRect(w.x,w.y,w.w,w.h);ctx.strokeStyle='#9d8a69';ctx.strokeRect(w.x,w.y,w.w,w.h)}
 for(const e of enemies)drawTank(e,'#b93838','#6f1d1d');if(player)drawTank(player,player.inv>0?'#7dd3fc':'#34d399','#065f46');
 for(const b of bullets){ctx.fillStyle=b.friendly?'#ffe066':'#ff8b8b';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}
 for(const p of particles){ctx.globalAlpha=p.a;ctx.fillStyle='#ffb703';ctx.fillRect(p.x,p.y,3,3);ctx.globalAlpha=1}
}
function drawTank(o,body,track){
 ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.angle);ctx.fillStyle=track;ctx.fillRect(-22,-16,44,8);ctx.fillRect(-22,8,44,8);ctx.fillStyle=body;ctx.fillRect(-17,-12,34,24);ctx.restore();
 const a=o===player?o.turret:o.angle;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(a);ctx.fillStyle='#d1d5db';ctx.fillRect(0,-3,30,6);ctx.fillStyle=body;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.restore();
 if(o.hp!==undefined&&o!==player){ctx.fillStyle='#0008';ctx.fillRect(o.x-20,o.y-27,40,5);ctx.fillStyle='#ef4444';ctx.fillRect(o.x-20,o.y-27,40*Math.max(0,o.hp/o.maxHp),5)}
}
addEventListener('keydown',e=>keys[e.key]=true);addEventListener('keyup',e=>keys[e.key]=false);

const joyEl=$('#joystick'),stick=$('#stick');let joyId=null;
function joyMove(clientX,clientY){const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=clientX-cx,dy=clientY-cy,m=Math.hypot(dx,dy),max=42,k=Math.min(1,max/(m||1));const px=dx*k,py=dy*k;stick.style.transform=`translate(${px}px,${py}px)`;joy.x=px/max;joy.y=py/max}
joyEl.addEventListener('pointerdown',e=>{joyId=e.pointerId;joyEl.setPointerCapture(joyId);joyMove(e.clientX,e.clientY)});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e.clientX,e.clientY)});joyEl.addEventListener('pointerup',e=>{if(e.pointerId===joyId){joyId=null;joy.x=joy.y=0;stick.style.transform='translate(0,0)'}});
const fire=$('#fireBtn');fire.addEventListener('pointerdown',e=>{firing=true;fire.setPointerCapture(e.pointerId)});['pointerup','pointercancel','pointerleave'].forEach(ev=>fire.addEventListener(ev,()=>firing=false));

function showEl(e){e.classList.remove('hidden')}function hide(e){e.classList.add('hidden')}
let ac=null;function beep(freq,dur,vol){try{ac=ac||new (AudioContext||webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=freq;o.type='square';g.gain.value=vol;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);o.stop(ac.currentTime+dur)}catch{}}
refreshLobby();
})();