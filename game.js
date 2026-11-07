"use strict";
const S=PlatoShapes,$=id=>document.getElementById(id);
const screens=["start","intro","game","end"];function show(n){for(const s of screens)$(s).classList.toggle("on",s===n)}
const video=$("introVideo"),music=$("introMusic");
let introState="idle"; // idle -> playing -> hold (frozen on the last frame, music still playing) -> done
function startIntro(){PlatoSfx.unlock();show("intro");introState="playing";$("tapHint").classList.remove("on");$("skipBtn").style.display="";
 video.currentTime=0;music.currentTime=0;music.volume=1;music.loop=true;
 const pv=video.play();if(pv&&pv.catch)pv.catch(()=>toHold());const pm=music.play();if(pm&&pm.catch)pm.catch(()=>{})}
function toHold(){if(introState!=="playing")return;introState="hold";video.pause();$("skipBtn").style.display="none";setTimeout(()=>{if(introState==="hold")$("tapHint").classList.add("on")},1200)}
video.addEventListener("ended",toHold);
$("skipBtn").addEventListener("click",e=>{e.stopPropagation();try{video.currentTime=Math.max(0,(video.duration||25.36)-0.05)}catch(_){}toHold()});
$("intro").addEventListener("click",()=>{if(introState==="hold")endIntro()});
function fadeMusic(){const v0=music.volume;let k=0;const id=setInterval(()=>{k++;music.volume=Math.max(0,v0*(1-k/20));if(k>=20){clearInterval(id);music.pause();music.volume=1}},50)}
function endIntro(){introState="done";fadeMusic();startGame()}
$("startBtn").addEventListener("click",startIntro);
document.addEventListener("visibilitychange",()=>{if(document.hidden){music.pause();if(introState==="playing")video.pause()}else if(introState==="playing"||introState==="hold"){music.play().catch(()=>{});if(introState==="playing")video.play().catch(()=>{})}});

// ---------- game ----------
const cv=$("cv"),g=cv.getContext("2d"),wall=new Image();wall.src="assets/cave-wall.jpg";
const sh=document.createElement("canvas"),sg=sh.getContext("2d");
const PAL=[["#c9a26a","#8f6634","#4e3214"],["#b98552","#7d5028","#3f230d"],["#d6b88a","#9a7a4e","#54391b"],["#a8835a","#6d4e2c","#36230f"],["#c48d4a","#88561f","#45290b"]];
let round=0,score=0,phase="guess",t0=performance.now(),revealAt=0,lastResult=null,W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);const vv=window.visualViewport;W=innerWidth;H=vv?vv.height:innerHeight;cv.width=W*DPR;cv.height=H*DPR;sh.width=cv.width;sh.height=cv.height}
addEventListener("resize",resize);if(window.visualViewport)visualViewport.addEventListener("resize",resize);resize();
function startGame(){round=0;score=0;show("game");newRound()}
function newRound(){phase="guess";t0=performance.now();$("guess").value="";$("guess").disabled=false;$("goBtn").style.display="";$("nextBtn").style.display="none";$("msg").textContent="What makes this shadow?";
 $("roundTxt").textContent=(round+1)+" / "+S.SHAPES.length;$("scoreTxt").textContent="Score "+score}
function flicker(t){return Math.sin(t*0.0071)*0.5+Math.sin(t*0.0173+1)*0.3+Math.sin(t*0.031+2)*0.2}
function poseOf(shape,t){return S.pose(shape.mesh,Math.sin(t*0.0006)*shape.sway+0.18,0.12+Math.sin(t*0.0004)*0.06)}
function light(t){const f=flicker(t);return [0.15+f*0.12,-0.35+f*0.05,5.2]}
function drawWall(t){const f=flicker(t);g.fillStyle="#000";g.fillRect(0,0,W,H);
 if(wall.complete&&wall.naturalWidth){const s=Math.max(W/wall.naturalWidth,H/wall.naturalHeight);const w=wall.naturalWidth*s,h=wall.naturalHeight*s;g.globalAlpha=0.9+f*0.08;g.drawImage(wall,(W-w)/2,(H-h)/2,w,h);g.globalAlpha=1}
 const gr=g.createRadialGradient(W*0.5,H*0.95,0,W*0.5,H*0.6,Math.max(W,H)*0.8);gr.addColorStop(0,"rgba(255,150,50,"+(0.16+f*0.05)+")");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,W,H)}
function wallScale(){return Math.min(W,H-120)/5.6}
function drawShadow(shape,t){const L=light(t),v=poseOf(shape,t),s=S.castShadow(v,shape.mesh.f,L),k=wallScale(),cx=W/2,cy=(H-90)/2;
 sg.setTransform(DPR,0,0,DPR,0,0);sg.clearRect(0,0,W,H);sg.fillStyle=sg.strokeStyle="#140802";sg.lineWidth=0.8;sg.lineJoin="round";
 for(const f of s.tris){const a=s.points[f[0]],b=s.points[f[1]],c=s.points[f[2]];sg.beginPath();sg.moveTo(cx+a[0]*k,cy-a[1]*k);sg.lineTo(cx+b[0]*k,cy-b[1]*k);sg.lineTo(cx+c[0]*k,cy-c[1]*k);sg.closePath();sg.fill();sg.stroke()}
 g.save();g.globalAlpha=0.9;g.globalCompositeOperation="multiply";g.filter="blur("+(2.5+Math.abs(flicker(t))*1.5)+"px)";g.drawImage(sh,0,0,W,H);g.restore();g.filter="none"}
function hx(c){return [1,3,5].map(i=>parseInt(c.substr(i,2),16))}
function shade(pal,d){const a=hx(pal[2]),b=hx(pal[1]),c=hx(pal[0]);const m=d<0.5?a.map((x,i)=>x+(b[i]-x)*d*2):b.map((x,i)=>x+(c[i]-x)*(d-0.5)*2);return "rgb("+m.map(Math.round).join(",")+")"}
function drawObject(shape,t,cx,cy,size){// painted, ink-outlined, firelit - same cel look as the cave
 const v=poseOf(shape,t),cam=7,pal=PAL[shape.id%PAL.length];
 const P=v.map(p=>{const s=cam/(cam-p[2]);return [cx+p[0]*s*size,cy-p[1]*s*size,p[2]]});
 const tris=shape.mesh.f.map(f=>{const a=v[f[0]],b=v[f[1]],c=v[f[2]];const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];const l=Math.hypot(n[0],n[1],n[2])||1;n=n.map(x=>x/l);
  const ld=[-0.35,0.55,0.76],d=n[0]*ld[0]+n[1]*ld[1]+n[2]*ld[2];return {f:f,z:(a[2]+b[2]+c[2])/3,d:Math.abs(d),facing:n[2]}}).sort((p,q)=>p.z-q.z);
 const path=f=>{g.beginPath();g.moveTo(P[f[0]][0],P[f[0]][1]);g.lineTo(P[f[1]][0],P[f[1]][1]);g.lineTo(P[f[2]][0],P[f[2]][1]);g.closePath()};
 g.save();g.lineJoin="round";g.fillStyle=g.strokeStyle="#1e0f05";g.lineWidth=5;for(const tr of tris){path(tr.f);g.fill();g.stroke()}
 g.lineWidth=1;for(const tr of tris){const c=shade(pal,Math.round(tr.d*6)/6);g.fillStyle=g.strokeStyle=c;path(tr.f);g.fill();g.stroke()}
 g.restore()}
function frame(now){requestAnimationFrame(frame);if(!$("game").classList.contains("on"))return;const sp=S.SHAPES[round];if(!sp)return;g.setTransform(DPR,0,0,DPR,0,0);drawWall(now);drawShadow(sp,now);
 if(phase==="reveal"){const a=Math.min(1,(now-revealAt)/500);g.save();g.globalAlpha=a*0.55;g.fillStyle="#000";g.fillRect(0,0,W,H);g.restore();g.save();g.globalAlpha=a;drawObject(sp,now,W/2,(H-150)/2+20,Math.min(W,H-150)*0.27);g.restore()}}
requestAnimationFrame(frame);
function submit(){if(phase!=="guess")return;const text=$("guess").value;if(!S.norm(text)){$("msg").textContent="Type a word first.";$("guess").focus();return}
 const sp=S.SHAPES[round],ok=S.isCorrect(sp,text);lastResult=ok;phase="reveal";revealAt=performance.now();$("guess").disabled=true;$("guess").blur();
 if(ok){score+=100;$("msg").textContent="Yes! A "+sp.name+". +100"}else{PlatoSfx.wrong();$("msg").textContent="No! It was a "+sp.name+"."}
 $("scoreTxt").textContent="Score "+score;$("goBtn").style.display="none";$("nextBtn").style.display="block"}
function next(){if(phase!=="reveal")return;round++;if(round>=S.SHAPES.length){phase="end";$("endScore").textContent="Score "+score+"  ("+(score/100)+" of "+S.SHAPES.length+" right)";show("end")}else newRound()}
$("bar").addEventListener("submit",e=>{e.preventDefault();if(phase==="guess")submit();else next()});
$("nextBtn").addEventListener("click",next);
$("againBtn").addEventListener("click",startGame);$("rewatchBtn").addEventListener("click",startIntro);
// testing hook (no answers exposed beyond the shape list already in shapes.js)
self.__plato={get state(){return {introState,round,score,phase,lastResult}},submit:t=>{$("guess").value=t;submit()},next};
if("serviceWorker" in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready).then(r=>{if(navigator.onLine&&r.active)r.active.postMessage("check")}).catch(()=>{})}
