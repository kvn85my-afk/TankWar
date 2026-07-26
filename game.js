const c=document.querySelector('#c'),ctx=c.getContext('2d');let W,H,DPR;
const $=s=>document.querySelector(s);
let keys={},joy={x:0,y:0},wave=1,coins=0,paused=false,shake=0,last=performance.now();
const imgs={}; const sources={
 bg:'assets/battlefield_hd.jpg',player:'assets/player_tank.png',
 e1:'assets/enemy_tank_1.png',e2:'assets/enemy_tank_2.png',e3:'assets/enemy_tank_3.png',boss:'assets/boss_tank.png'
};
let loaded=0;Object.entries(sources).forEach(([k,s])=>{let im=new Image();im.onload=()=>{imgs[k]=im;if(++loaded===Object.keys(sources).length){$('#loading').style.display='none';resetWave()}};im.src=s});
function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;c.width=W*DPR;c.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
let player={x:W*.5,y:H*.72,a:-Math.PI/2,hp:140,max:140,speed:155,r:34};
let enemies=[],bullets=[],particles=[];
function resetWave(){player.x=W*.5;player.y=H*.72;let n=4+Math.min(5,wave);enemies=[];for(let i=0;i<n;i++) enemies.push({x:70+Math.random()*(W-140),y:145+Math.random()*Math.max(100,H*.42),a:Math.PI/2,hp:wave%5===0&&i===0?220:70,max:wave%5===0&&i===0?220:70,r:32,boss:wave%5===0&&i===0,cd:400+Math.random()*700,type:1+i%3});updateHUD()}
function updateHUD(){$('#wave').textContent='WAVE '+wave;$('#remain').textContent='敌军 '+enemies.length;$('#coins').textContent=coins;$('#hpText').textContent=Math.ceil(player.hp)+'/'+player.max;$('#hpFill').style.width=Math.max(0,player.hp/player.max*100)+'%'}
function fire(){if(paused)return;let a=player.a;bullets.push({x:player.x+Math.cos(a)*30,y:player.y+Math.sin(a)*30,vx:Math.cos(a)*420,vy:Math.sin(a)*420,life:1200,f:true});muzzle(player.x+Math.cos(a)*35,player.y+Math.sin(a)*35)}
function muzzle(x,y){for(let i=0;i<10;i++)particles.push({x,y,vx:(Math.random()-.5)*130,vy:(Math.random()-.5)*130,life:250,c:i%2?'#ffb42d':'#fff2a0'})}
function boom(x,y){shake=9;for(let i=0;i<28;i++)particles.push({x,y,vx:(Math.random()-.5)*240,vy:(Math.random()-.5)*240,life:300+Math.random()*500,c:i%3?'#ff6b20':'#ffd45a'})}
function update(dt){
 if(paused||!imgs.bg)return;
 let mx=joy.x,my=joy.y,mag=Math.hypot(mx,my);if(mag>.08){player.x+=mx*player.speed*dt;player.y+=my*player.speed*dt;player.a=Math.atan2(my,mx)}
 player.x=Math.max(35,Math.min(W-35,player.x));player.y=Math.max(125,Math.min(H-45,player.y));
 enemies.forEach(e=>{let dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;e.a=Math.atan2(dy,dx);if(d>125){e.x+=dx/d*35*dt;e.y+=dy/d*35*dt}e.cd-=dt*1000;if(e.cd<=0&&d<430){e.cd=800+Math.random()*800;bullets.push({x:e.x,y:e.y,vx:dx/d*220,vy:dy/d*220,life:1800,f:false})}});
 bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt*1000});
 bullets.forEach(b=>{if(b.life<=0)return;if(b.f){for(let e of enemies){if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+8){e.hp-=35;b.life=0;muzzle(b.x,b.y);if(e.hp<=0){coins+=e.boss?25:5;boom(e.x,e.y)}}}}else if(Math.hypot(b.x-player.x,b.y-player.y)<player.r+6){player.hp-=8;b.life=0;shake=5}});
 enemies=enemies.filter(e=>e.hp>0);bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt*1000});particles=particles.filter(p=>p.life>0);
 if(player.hp<=0){player.hp=player.max;coins=Math.max(0,coins-10);resetWave()} if(enemies.length===0){wave++;resetWave()} updateHUD();shake*=.88;
}
function drawSprite(im,o,size){
 ctx.save();
 ctx.translate(o.x,o.y);
 ctx.rotate(o.a+Math.PI/2);

 // Draw a stronger contact shadow so the tank is clearly visible.
 ctx.save();
 ctx.globalAlpha=.42;
 ctx.fillStyle='#000';
 ctx.beginPath();
 ctx.ellipse(4,10,size*.30,size*.19,0,0,Math.PI*2);
 ctx.fill();
 ctx.restore();

 // Sprite crops contain some transparent padding, so render them larger.
 let ratio=im.width/im.height;
 let h=size,w=size*ratio;

 ctx.shadowColor='#000d';
 ctx.shadowBlur=18;
 ctx.shadowOffsetY=10;
 ctx.drawImage(im,-w/2,-h/2,w,h);
 ctx.shadowBlur=0;
 ctx.shadowOffsetY=0;

 ctx.restore();
}
function draw(){
 if(!imgs.bg)return;ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 let bg=imgs.bg,scale=Math.max(W/bg.width,H/bg.height),bw=bg.width*scale,bh=bg.height*scale;ctx.drawImage(bg,(W-bw)/2,(H-bh)/2,bw,bh);
 let shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#00120b55');shade.addColorStop(.6,'#0000');shade.addColorStop(1,'#0009');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 enemies.forEach(e=>{let im=e.boss?imgs.boss:imgs['e'+e.type];drawSprite(im,e,e.boss?176:138);ctx.fillStyle='#351013';ctx.fillRect(e.x-34,e.y-66,68,8);ctx.fillStyle=e.boss?'#ff9a2d':'#ff4047';ctx.fillRect(e.x-34,e.y-66,68*Math.max(0,e.hp/e.max),8)});
 drawSprite(imgs.player,player,154);ctx.strokeStyle='#39fff0aa';ctx.lineWidth=2;ctx.shadowColor='#35fff0';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(player.x,player.y,37,0,7);ctx.stroke();ctx.shadowBlur=0;
 bullets.forEach(b=>{ctx.strokeStyle=b.f?'#8ffcff':'#ff713e';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.x-b.vx*.035,b.y-b.vy*.035);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fff7b2';ctx.beginPath();ctx.arc(b.x,b.y,3.5,0,7);ctx.fill()});
 particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life/250);ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(p.x,p.y,2+Math.min(6,p.life/100),0,7);ctx.fill();ctx.globalAlpha=1});
 ctx.restore()
}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
$('#fire').addEventListener('pointerdown',e=>{e.preventDefault();fire()});$('#repair').addEventListener('pointerdown',e=>{e.preventDefault();player.hp=Math.min(player.max,player.hp+35);updateHUD()});$('#pause').onclick=()=>paused=!paused;
let J=$('#joy'),knob=J.querySelector('i'),pid=null;
function moveJoy(e){let r=J.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.hypot(x,y),max=47;if(m>max){x=x/m*max;y=y/m*max}joy.x=x/max;joy.y=y/max;knob.style.transform=`translate(${x}px,${y}px)`}
J.addEventListener('pointerdown',e=>{pid=e.pointerId;J.setPointerCapture(pid);moveJoy(e)});J.addEventListener('pointermove',e=>{if(e.pointerId===pid)moveJoy(e)});J.addEventListener('pointerup',e=>{pid=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'});
