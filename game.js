"use strict";
const S=PlatoShapes,$=id=>document.getElementById(id);
const screens=["start","intro","game","end"];function show(n){for(const s of screens)$(s).classList.toggle("on",s===n)}
const video=$("introVideo"),music=$("introMusic");
// Title is fully readable at 23.0s (decoded frames inspected at 18..25s).
const TITLE_TIME=23.0;
let introState="idle",titleReady=false,musicNeedsUnlock=false,skipPending=false,seekTimer=0;
function retryMusic(){if(!["playing","hold"].includes(introState))return;
 try{const p=music.play();if(p&&p.then)p.then(()=>{musicNeedsUnlock=false},()=>{musicNeedsUnlock=true})}catch(_){musicNeedsUnlock=true}}
function markTitle(){if(video.currentTime>=TITLE_TIME&&video.readyState>=2){titleReady=true;$("tapHint").classList.add("on")}}
function startIntro(){PlatoSfx.unlock();show("intro");introState="playing";titleReady=false;skipPending=false;clearTimeout(seekTimer);$("tapHint").classList.remove("on");$("skipBtn").style.display="";
 video.currentTime=0;music.currentTime=0;music.volume=1;music.loop=true;
 const pv=video.play();if(pv&&pv.catch)pv.catch(()=>{/* Never freeze an undecoded/zero-time frame. A later gesture retries. */});retryMusic()}
function toHold(){if(introState!=="playing"||video.currentTime<TITLE_TIME||video.readyState<2)return;
 markTitle();introState="hold";skipPending=false;clearTimeout(seekTimer);video.pause();$("skipBtn").style.display="none"}
video.addEventListener("timeupdate",()=>{if(!skipPending&&introState==="playing")markTitle()});
video.addEventListener("ended",toHold);
function resumeIntro(){skipPending=false;clearTimeout(seekTimer);if(introState==="playing")video.play().catch(()=>{})}
video.addEventListener("seeked",()=>{if(!skipPending)return;
 // seeked alone isn't enough: require a decoded frame at the requested title position.
 const valid=()=>skipPending&&introState==="playing"&&!video.seeking&&video.readyState>=2&&video.currentTime>=Math.max(TITLE_TIME,video.duration-0.25);
 if(!valid()){resumeIntro();return}
 if(video.requestVideoFrameCallback)video.requestVideoFrameCallback((_,meta)=>{if(valid()&&meta.mediaTime>=TITLE_TIME)toHold();else resumeIntro()});
 else requestAnimationFrame(()=>{if(valid())toHold();else resumeIntro()})});
$("skipBtn").addEventListener("click",e=>{e.stopPropagation();retryMusic();
 if(!Number.isFinite(video.duration)||video.duration<TITLE_TIME){resumeIntro();return}
 skipPending=true;seekTimer=setTimeout(resumeIntro,3500);
 try{video.currentTime=video.duration-0.12}catch(_){resumeIntro()}});
$("intro").addEventListener("click",()=>{retryMusic();if(titleReady||introState==="hold")endIntro();else if(video.paused)video.play().catch(()=>{})});
// Retry a rejected unlock on every later intro gesture, including a title/Skip tap.
$("intro").addEventListener("pointerdown",retryMusic);
function fadeMusic(){const v0=music.volume;let k=0;const id=setInterval(()=>{k++;music.volume=Math.max(0,v0*(1-k/20));if(k>=20){clearInterval(id);music.pause();music.volume=1}},50)}
function endIntro(){introState="done";skipPending=false;clearTimeout(seekTimer);video.pause();fadeMusic();startGame()}
$("startBtn").addEventListener("click",startIntro);
document.addEventListener("visibilitychange",()=>{if(document.hidden){music.pause();if(introState==="playing")video.pause()}else if(introState==="playing"||introState==="hold"){retryMusic();if(introState==="playing")video.play().catch(()=>{})}});

// ---------- game ----------
const cv=$("cv"),g=cv.getContext("2d"),wall=new Image();wall.src="assets/cave-wall.jpg";
const sh=document.createElement("canvas"),sg=sh.getContext("2d");
const PAL=[["#c9a26a","#8f6634","#4e3214"],["#b98552","#7d5028","#3f230d"],["#d6b88a","#9a7a4e","#54391b"],["#a8835a","#6d4e2c","#36230f"],["#c48d4a","#88561f","#45290b"]];
let round=0,score=0,phase="guess",t0=performance.now(),revealAt=0,lastResult=null,W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);const vv=window.visualViewport;
 W=vv?vv.width:innerWidth;H=vv?vv.height:innerHeight;const x=vv?vv.offsetLeft:0,y=vv?vv.offsetTop:0;
 // All four elements use the same visual-viewport coordinate space, not the layout bottom.
 Object.assign(cv.style,{left:x+"px",top:y+"px",width:W+"px",height:H+"px"});
 Object.assign($("bar").style,{left:x+"px",top:"auto",bottom:"auto",width:W+"px",transform:"none"});
 $("bar").style.top=(y+H-$("bar").offsetHeight)+"px";
 Object.assign($("msg").style,{left:x+"px",top:(y+H-$("bar").offsetHeight-56)+"px",bottom:"auto",width:W+"px"});
 Object.assign($("hud").style,{left:(x+14)+"px",top:(y+10)+"px",width:Math.max(0,W-28)+"px",right:"auto"});
 cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);sh.width=cv.width;sh.height=cv.height}
addEventListener("resize",resize);if(window.visualViewport){visualViewport.addEventListener("resize",resize);visualViewport.addEventListener("scroll",resize)}resize();
function startGame(){round=0;score=0;show("game");resize();newRound()}
function newRound(){phase="guess";t0=performance.now();$("guess").value="";$("guess").disabled=false;$("goBtn").style.display="";$("nextBtn").style.display="none";$("msg").textContent="What makes this shadow?";
 $("roundTxt").textContent=(round+1)+" / "+S.SHAPES.length;$("scoreTxt").textContent="Score "+score}
function flicker(t){return Math.sin(t*0.0071)*0.5+Math.sin(t*0.0173+1)*0.3+Math.sin(t*0.031+2)*0.2}
function poseOf(shape,t){return S.displayPose(shape,t)}
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
// Paint into a transparent layer: one soft exterior ink edge, continuous shading,
// wood-grain brushwork clipped to the object, never black triangle wireframes.
const paint=document.createElement("canvas"),pg=paint.getContext("2d");
const normalCache=new WeakMap();
function vertexNormals(mesh){if(normalCache.has(mesh))return normalCache.get(mesh);
 const sums=new Map(),keys=mesh.v.map(p=>p.map(x=>x.toFixed(5)).join(","));
 // Builders have mixed winding. Orient each connected carving component by its
 // signed volume so illumination really comes from below, not inside the wood.
 const parent=mesh.v.map((_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
 for(const f of mesh.f){parent[root(f[1])]=root(f[0]);parent[root(f[2])]=root(f[0])}
 const volumes=new Map();for(const f of mesh.f){const [a,b,c]=f.map(i=>mesh.v[i]),key=root(f[0]),vol=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);volumes.set(key,(volumes.get(key)||0)+vol)}
 for(const f of mesh.f){const [a,b,c]=f.map(i=>mesh.v[i]),u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]);
 const n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
 for(const i of f){const key=keys[i],q=sums.get(key)||[0,0,0];sums.set(key,q.map((x,k)=>x+n[k]*(volumes.get(root(f[0]))<0?-1:1)))}}
 const out=keys.map(k=>{const n=sums.get(k),l=Math.hypot(...n)||1;return n.map(x=>x/l)});normalCache.set(mesh,out);return out}
function drawObject(shape,t,cx,cy,size){
 if(paint.width!==cv.width||paint.height!==cv.height){paint.width=cv.width;paint.height=cv.height}
 pg.setTransform(DPR,0,0,DPR,0,0);pg.clearRect(0,0,W,H);
 const v=poseOf(shape,t),cam=7,pal=shape.name==="bird"?["#c88a42","#854a20","#37200f"]:PAL[shape.id%PAL.length];
 const P=v.map(p=>{const s=cam/(cam-p[2]);return [cx+p[0]*s*size,cy-p[1]*s*size,p[2]]});
 // Rotate normals by exactly the object's pose (translation-free).
 const normals=S.displayPose({...shape,mesh:{v:vertexNormals(shape.mesh)}},t);
 const brightness=normals.map(n=>Math.min(1,Math.max(.08,.48+.42*(n[0]*-.28+n[1]*-.65+n[2]*.70))));
 const tris=shape.mesh.f.map(f=>({f,z:f.reduce((z,i)=>z+v[i][2],0)/3})).sort((a,b)=>a.z-b.z);
 const path=f=>{pg.beginPath();pg.moveTo(P[f[0]][0],P[f[0]][1]);pg.lineTo(P[f[1]][0],P[f[1]][1]);pg.lineTo(P[f[2]][0],P[f[2]][1]);pg.closePath()};
 for(const {f} of tris){const vals=f.map(i=>brightness[i]),pts=f.map(i=>P[i]);
 // Fit a linear illumination field to all three vertices; smooth, unquantized pigment.
 const [a,b,c]=pts,[va,vb,vc]=vals,det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
 let fill=shade(pal,(va+vb+vc)/3);
 if(Math.abs(det)>.1){const gx=((vb-va)*(c[1]-a[1])-(vc-va)*(b[1]-a[1]))/det,gy=((b[0]-a[0])*(vc-va)-(c[0]-a[0])*(vb-va))/det,gg=gx*gx+gy*gy;
 if(gg>.00000001){const lo=Math.min(...vals),hi=Math.max(...vals),x0=a[0]+gx*(lo-va)/gg,y0=a[1]+gy*(lo-va)/gg,x1=a[0]+gx*(hi-va)/gg,y1=a[1]+gy*(hi-va)/gg;
 if(hi-lo>.001){fill=pg.createLinearGradient(x0,y0,x1,y1);fill.addColorStop(0,shade(pal,lo));fill.addColorStop(1,shade(pal,hi))}}}
 pg.fillStyle=pg.strokeStyle=fill;pg.lineWidth=.65;path(f);pg.fill();pg.stroke()}
 pg.globalCompositeOperation="source-atop";
 // Translucent long, wandering dry-brush strokes and fine end-grain. Fixed seed, no flickering noise.
 const left=cx-size*1.5,top=cy-size*1.5;
 for(let i=0;i<220;i++){const x=left+(i/220)*size*3;pg.beginPath();
 for(let j=0;j<=32;j++){const y=top+j/32*size*3,xx=x+Math.sin(j*.36+i*.17)*size*.012+Math.sin(j*.8+i)*size*.003;if(!j)pg.moveTo(xx,y);else pg.lineTo(xx,y)}
 pg.strokeStyle=i%3?"rgba(58,26,9,.09)":"rgba(255,204,125,.08)";pg.lineWidth=i%7===0?2.0:.65;pg.stroke()}
 // Scumbled pigment flecks break up the mathematical gradients like a dry brush.
 for(let i=0;i<850;i++){const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)},x=left+hash(i+1)*size*3,y=top+hash(i+912)*size*3;
 pg.strokeStyle=i%2?"rgba(255,186,98,.045)":"rgba(49,24,11,.05)";pg.lineWidth=.8+hash(i+44)*2.2;pg.beginPath();pg.moveTo(x,y);pg.lineTo(x+2+hash(i+8)*6,y-1-hash(i+75)*4);pg.stroke()}
 const glaze=pg.createLinearGradient(0,cy-size,0,cy+size);glaze.addColorStop(0,"rgba(17,12,9,.27)");glaze.addColorStop(.55,"rgba(129,64,18,0)");glaze.addColorStop(1,"rgba(255,145,45,.23)");pg.fillStyle=glaze;pg.fillRect(0,0,W,H);
 pg.globalCompositeOperation="source-over";
 // Wing feather incisions and a tiny carved eye, projected with the very same pose.
 if(shape.name==="bird"){
 const lines=[];for(const side of [-1,1])for(let j=0;j<3;j++)lines.push([[side*(.30+j*.04),.32-j*.13,.15],[side*.80,.43-j*.12,.15],[side*(1.50-j*.17),.65-j*.13,.12]]);
 // Mesh is fitted uniformly; derive the carving scale from the known original wingspan.
 const fit= (Math.max(...shape.mesh.v.map(p=>p[0]))-Math.min(...shape.mesh.v.map(p=>p[0])))/3.3;
 for(const line of lines){const points=S.displayPose({...shape,mesh:{v:line.map(p=>[p[0]*fit,(p[1]-.065)*fit,p[2]*fit])}},t).map(p=>{const k=cam/(cam-p[2]);return [cx+p[0]*k*size,cy-p[1]*k*size]});
 pg.beginPath();points.forEach((p,i)=>i?pg.lineTo(...p):pg.moveTo(...p));pg.strokeStyle="rgba(55,26,9,.42)";pg.lineWidth=1.3;pg.stroke()}}
 // A single blurred painted silhouette edge; no per-face ink.
 g.save();g.shadowColor="rgba(23,11,4,.9)";g.shadowBlur=3;g.shadowOffsetY=1.5;g.drawImage(paint,0,0,W,H);g.restore()}
function frame(now){requestAnimationFrame(frame);if(!$("game").classList.contains("on"))return;const sp=S.SHAPES[round];if(!sp)return;g.setTransform(DPR,0,0,DPR,0,0);drawWall(now);drawShadow(sp,now);
 if(phase==="reveal"){const a=Math.min(1,(now-revealAt)/500);g.save();g.globalAlpha=a*0.20;g.fillStyle="#000";g.fillRect(0,0,W,H);g.restore();g.save();g.globalAlpha=a;drawObject(sp,now,W/2,(H-150)/2+20,Math.min(W,H-150)*0.27);g.restore()}}
requestAnimationFrame(frame);
function submit(){if(phase!=="guess")return;const text=$("guess").value;if(!S.norm(text)){$("msg").textContent="Type a word first.";$("guess").focus();return}
 const sp=S.SHAPES[round],ok=S.isCorrect(sp,text);lastResult=ok;phase="reveal";revealAt=performance.now();$("guess").disabled=true;$("guess").blur();
 if(ok){score+=100;$("msg").textContent="Yes! "+S.article(sp.name).replace(/^./,c=>c.toUpperCase())+" "+sp.name+". +100"}else{PlatoSfx.wrong();$("msg").textContent="No! It was "+S.article(sp.name)+" "+sp.name+"."}
 $("scoreTxt").textContent="Score "+score;$("goBtn").style.display="none";$("nextBtn").style.display="block"}
function next(){if(phase!=="reveal")return;round++;if(round>=S.SHAPES.length){phase="end";$("endScore").textContent="Score "+score+"  ("+(score/100)+" of "+S.SHAPES.length+" right)";show("end")}else newRound()}
$("bar").addEventListener("submit",e=>{e.preventDefault();if(phase==="guess")submit();else next()});
$("nextBtn").addEventListener("click",next);
$("againBtn").addEventListener("click",startGame);$("rewatchBtn").addEventListener("click",startIntro);
// testing hook (no answers exposed beyond the shape list already in shapes.js)
self.__plato={get state(){return {introState,titleReady,musicNeedsUnlock,skipPending,round,score,phase,lastResult}},submit:t=>{$("guess").value=t;submit()},next};
if("serviceWorker" in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready).then(r=>{if(navigator.onLine&&r.active)r.active.postMessage("check")}).catch(()=>{})}
