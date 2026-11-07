"use strict";
const S=PlatoShapes,$=id=>document.getElementById(id);
let currentScreen="start",pendingReady=false,activeLevel="easy",activeShapes=S.SHAPES;
const screens=["start","intro","menu","settings","game","end"];
function updateCorner(){$("updateReadyBtn").hidden=!(pendingReady&&["start","menu","end"].includes(currentScreen))}
function show(n){currentScreen=n;for(const s of screens)$(s).classList.toggle("on",s===n);updateCorner()}
function savedVolume(key){try{const v=localStorage.getItem(key);if(v!==null&&v.trim()!==""&&Number.isFinite(Number(v)))return Math.max(0,Math.min(100,Number(v)))/100}catch(_){}return 1}
let musicVolume=savedVolume("platocave-music-vol"),soundsVolume=savedVolume("platocave-sfx-vol"),fadeTimer=0;
const video=$("introVideo"),music=$("introMusic");
// Title is fully readable at 23.0s (decoded frames inspected at 18..25s).
const TITLE_TIME=23.0;
let introState="idle",titleReady=false,musicNeedsUnlock=false,skipPending=false,skipWanted=false,seekTimer=0;
function retryMusic(){if(!["playing","hold"].includes(introState))return;
 try{const p=music.play();if(p&&p.then)p.then(()=>{musicNeedsUnlock=false},()=>{musicNeedsUnlock=true})}catch(_){musicNeedsUnlock=true}}
function markTitle(){if(video.currentTime>=TITLE_TIME&&video.readyState>=2){titleReady=true;$("tapHint").classList.add("on")}}
function startIntro(){PlatoSfx.unlock();show("intro");introState="playing";titleReady=false;skipPending=false;skipWanted=false;clearTimeout(seekTimer);$("tapHint").classList.remove("on");$("skipBtn").style.display="";
 clearInterval(fadeTimer);video.currentTime=0;music.currentTime=0;music.volume=musicVolume;music.loop=true;
 const pv=video.play();if(pv&&pv.catch)pv.catch(()=>{/* Never freeze an undecoded/zero-time frame. A later gesture retries. */});retryMusic()}
function toHold(){if(introState!=="playing"||video.currentTime<TITLE_TIME||video.readyState<2)return;
 markTitle();introState="hold";skipPending=false;skipWanted=false;clearTimeout(seekTimer);video.pause();$("skipBtn").style.display="none"}
video.addEventListener("timeupdate",()=>{if(!skipPending&&introState==="playing")markTitle()});
video.addEventListener("ended",toHold);
function resumeIntro(){skipPending=false;clearTimeout(seekTimer);if(introState==="playing")video.play().catch(()=>{})}
video.addEventListener("seeked",()=>{if(!skipPending)return;
 // seeked alone isn't enough: require a decoded frame at the requested title position.
 const valid=()=>skipPending&&introState==="playing"&&!video.seeking&&video.readyState>=2&&video.currentTime>=Math.max(TITLE_TIME,video.duration-0.25);
 if(!valid()){resumeIntro();return}
 if(video.requestVideoFrameCallback)video.requestVideoFrameCallback((_,meta)=>{if(valid()&&meta.mediaTime>=TITLE_TIME)toHold();else resumeIntro()});
 else requestAnimationFrame(()=>{if(valid())toHold();else resumeIntro()})});
// Can we seek to the title yet? Needs a finite duration and decoded data or a seekable range reaching the title.
function canSeekTitle(){if(!Number.isFinite(video.duration)||video.duration<TITLE_TIME)return false;const r=video.seekable;
 // A range reaching the title is enough. No range, or one that stops short of the title (Chromium can report
 // length 1 / end 0 on a first uncached load), counts as empty: fall back to decoded data and attempt the safe seek.
 const end=r&&r.length?r.end(r.length-1):NaN;if(Number.isFinite(end)&&end>=TITLE_TIME)return true;return video.readyState>=2}
// One safe seek-to-title attempt. Always clears the previous fallback timer first, so rapid Skips never leave a stale one.
function trySkip(){if(introState!=="playing")return;clearTimeout(seekTimer);seekTimer=0;
 if(!canSeekTitle()){/* not seekable yet (first uncached load): remember the request, keep playing, never hold black */
  skipPending=false;skipWanted=true;if(video.paused)video.play().catch(()=>{});return}
 skipWanted=false;skipPending=true;seekTimer=setTimeout(resumeIntro,3500);
 try{video.currentTime=video.duration-0.12}catch(_){resumeIntro()}}
// A remembered Skip is finished as soon as the file becomes seekable (metadata, buffered progress, SW finished caching).
function retryWantedSkip(){if(skipWanted&&!skipPending&&introState==="playing"&&canSeekTitle())trySkip()}
for(const ev of ["loadedmetadata","durationchange","progress","canplay","canplaythrough","timeupdate"])video.addEventListener(ev,retryWantedSkip);
$("skipBtn").addEventListener("click",e=>{e.stopPropagation();retryMusic();trySkip()});
$("intro").addEventListener("click",()=>{retryMusic();if(titleReady||introState==="hold")endIntro();else if(video.paused)video.play().catch(()=>{})});
// Retry a rejected unlock on every later intro gesture, including a title/Skip tap.
$("intro").addEventListener("pointerdown",retryMusic);
function fadeMusic(){clearInterval(fadeTimer);const v0=musicVolume;let k=0;fadeTimer=setInterval(()=>{k++;music.volume=Math.max(0,v0*(1-k/20));if(k>=20){clearInterval(fadeTimer);music.pause();music.volume=musicVolume}},50)}
function endIntro(){introState="done";skipPending=false;clearTimeout(seekTimer);video.pause();fadeMusic();show("menu")}
$("startBtn").addEventListener("click",startIntro);
document.addEventListener("visibilitychange",()=>{if(document.hidden){music.pause();if(introState==="playing")video.pause()}else if(introState==="playing"||introState==="hold"){retryMusic();if(introState==="playing")video.play().catch(()=>{})}});

// ---------- game ----------
const cv=$("cv"),g=cv.getContext("2d"),wall=new Image();wall.src="assets/cave-wall.jpg";
const sh=document.createElement("canvas"),sg=sh.getContext("2d");
// Painted substances, not one shared wood: [dark, mid, light, firelit highlight], specular strength, shininess, brush texture.
const MATS={
 wood:{c:["#37200f","#854a20","#c88a42","#f4c27a"],sp:.15,sh:8,tx:"wood"},
 clay:{c:["#3a0f0a","#8e2a1a","#d2643a","#ffd6a6"],sp:.35,sh:14,tx:"paint"},
 limestone:{c:["#202930","#68737a","#b4bfc0","#f0eee0"],sp:.05,sh:4,tx:"ashlar"},
 sandstone:{c:["#4b260c","#ac702e","#e4b65f","#fff0bf"],sp:.05,sh:4,tx:"strata"},
 masonry:{c:["#171e2b","#465266","#8f9cab","#e5e8e9"],sp:.05,sh:4,tx:"masonry"},
 stone:{c:["#2b241d","#6e6255","#b9a991","#f3e3c4"],sp:.05,sh:4,tx:"stone"},
 steel:{c:["#16181c","#4f555d","#b4bac1","#fff6e0"],sp:.95,sh:46,tx:"metal"},
 gold:{c:["#3b2306","#8c5a12","#e2aa3a","#fff3bc"],sp:.85,sh:30,tx:"metal"},
 copper:{c:["#2c1208","#7f3a1c","#d0793f","#ffe0b8"],sp:.75,sh:26,tx:"metal"},
 crystal:{c:["#0b2033","#2c6c94","#8fd5ef","#ffffff"],sp:1.0,sh:60,tx:"glaze"},
 glass:{c:["#0b2416","#2e6b43","#88c89b","#f6fff0"],sp:.9,sh:50,tx:"glaze"},
 terracotta:{c:["#3a160a","#94431f","#da8b57","#ffe2c2"],sp:.45,sh:18,tx:"glaze"},
 porcelain:{c:["#33363f","#8a8e9c","#e4e2dc","#ffffff"],sp:.7,sh:30,tx:"glaze"},
 shell:{c:["#4a3c2e","#a8957c","#eedec2","#fffaf0"],sp:.3,sh:16,tx:"paint"},
 snow:{c:["#36435a","#93a7c0","#e6edf5","#ffffff"],sp:.2,sh:10,tx:"paint"},
 cream:{c:["#5a1f2a","#c96b7c","#f8c3c8","#fff6ef"],sp:.45,sh:16,tx:"cream"},
 wafer:{c:["#4a2508","#a8641e","#e3a85b","#fbe3aa"],sp:.1,sh:6,tx:"wafer"},
 candy:{c:["#3a0612","#a3122f","#f0506a","#fff0f0"],sp:.9,sh:40,tx:"glaze"},
 wax:{c:["#4a3a20","#b9a170","#f2e3b9","#fffbe8"],sp:.35,sh:14,tx:"paint"},
 flame:{c:["#7a2a00","#e06a10","#ffc040","#fffbd0"],sp:0,sh:4,tx:"none"},
 leaf:{c:["#0e2010","#2c5a26","#71a046","#dbeaa2"],sp:.15,sh:8,tx:"paint"},
 dough:{c:["#4a2a10","#a8682a","#e2aa62","#fff0c8"],sp:.25,sh:10,tx:"paint"},
 traffic:{c:["#4a1402","#bf4718","#f4914f","#ffe2b4"],sp:.4,sh:16,tx:"paint"},
 ruby:{c:["#30040c","#8a1022","#e04050","#ffe0e0"],sp:.6,sh:24,tx:"paint"},
 ochre:{c:["#3f2a06","#9a6d18","#e3b649","#fff2c0"],sp:.25,sh:10,tx:"paint"},
 indigo:{c:["#0e1230","#2c3a7a","#7486c8","#e8ecff"],sp:.3,sh:12,tx:"paint"},
 lacquer:{c:["#2a0606","#8c1a14","#e05a3c","#fff0d8"],sp:.85,sh:36,tx:"glaze"},
 moonstone:{c:["#262a36","#6c7488","#cdd3dd","#ffffff"],sp:.35,sh:14,tx:"stone"},
 sail:{c:["#4a4034","#a8987e","#ece0c6","#fffaf0"],sp:.1,sh:6,tx:"paint"},
 fish:{c:["#0f2630","#3a7488","#a6d0d6","#ffffff"],sp:.8,sh:32,tx:"metal"},
 pollen:{c:["#4a2a00","#b8780a","#f2c23a","#fff6c0"],sp:.2,sh:8,tx:"paint"}};
// Per-shape material by mesh part (shapes.js tags parts on one mesh). Only the carved bird and a few furniture/handles are wood.
const OBJ_MATS={ball:["clay"],cube:["limestone"],cone:["traffic"],cylinder:["copper"],pyramid:["sandstone"],donut:["dough"],star:["gold"],heart:["ruby"],diamond:["crystal"],moon:["moonstone"],
 cross:["stone"],arrow:["ochre"],egg:["shell"],"triangle prism":["glass"],hexagon:["steel"],house:["terracotta"],tree:["leaf","wood"],mushroom:["clay","wax"],snowman:["snow"],
 lollipop:["candy","sail"],"ice cream":["wafer","cream"],bell:["gold"],bottle:["glass"],vase:["terracotta"],cup:["porcelain"],dumbbell:["steel"],hourglass:["glass"],candle:["wax","flame","stone"],
 table:["wood"],chair:["wood"],ladder:["wood"],key:["gold"],hammer:["steel","wood"],sword:["steel"],axe:["steel","wood"],umbrella:["indigo","wood"],fish:["fish"],bird:["wood"],
 boat:["wood","sail"],car:["lacquer"],rocket:["steel"],lightning:["ochre"],crown:["gold"],"letter t":["stone"],"letter l":["terracotta"],"letter h":["moonstone"],cloud:["snow"],
 flower:["ruby","pollen","leaf"],tower:["masonry"],anchor:["steel"]};
function matsFor(shape){return (OBJ_MATS[shape.name]||S.LEVEL_MATERIALS[shape.name]||["clay"]).map(k=>MATS[k])}
let round=0,score=0,phase="guess",t0=performance.now(),revealAt=0,lastResult=null,W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);const vv=window.visualViewport;
 W=vv?vv.width:innerWidth;H=vv?vv.height:innerHeight;const x=vv?vv.offsetLeft:0,y=vv?vv.offsetTop:0;
 // All four elements use the same visual-viewport coordinate space, not the layout bottom.
 Object.assign(cv.style,{left:x+"px",top:y+"px",width:W+"px",height:H+"px"});
 Object.assign($("bar").style,{left:x+"px",top:"auto",bottom:"auto",width:W+"px",transform:"none"});
 $("bar").style.top=(y+H-$("bar").offsetHeight)+"px";
 Object.assign($("msg").style,{left:x+"px",top:(y+H-$("bar").offsetHeight-56)+"px",bottom:"auto",width:W+"px"});
 Object.assign($("hud").style,{left:(x+14)+"px",top:(y+10)+"px",width:Math.max(0,W-28)+"px",right:"auto"});
 const q=$("quote");if(q)Object.assign(q.style,{left:(x+W/2)+"px",top:(y+10+$("hud").offsetHeight+6)+"px",maxHeight:"none",overflow:"visible"});
 cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);sh.width=cv.width;sh.height=cv.height}
addEventListener("resize",resize);if(window.visualViewport){visualViewport.addEventListener("resize",resize);visualViewport.addEventListener("scroll",resize)}resize();
function startGame(level=activeLevel){activeLevel=Object.hasOwn(S.LEVELS,level)?level:"easy";activeShapes=S.LEVELS[activeLevel];round=0;score=0;if(!activeShapes.length){endGame();return}show("game");resize();newRound()}
function endGame(){phase="end";$("endScore").textContent="Score "+score+"  ("+(score/100)+" of "+activeShapes.length+" right)";show("end")}
function newRound(){phase="guess";t0=performance.now();$("guess").value="";$("guess").disabled=false;$("goBtn").style.display="";$("nextBtn").style.display="none";$("msg").textContent="What makes this shadow?";
 $("roundTxt").textContent=(round+1)+" / "+activeShapes.length;$("scoreTxt").textContent="Score "+score;showQuote()}
// t2067u: one genuine Plato saying per round (rotates by round index), visible during guess and reveal; hidden off the game screen with #game.
function showQuote(){const Q=self.PlatoQuotes,q=$("quote");if(!Q||!q)return;const s=Q.pickForRound(round);$("quoteText").textContent=s.text;$("quoteBy").textContent="\u2014 "+s.by;q.hidden=false}
function flicker(t){return Math.sin(t*0.0071)*0.5+Math.sin(t*0.0173+1)*0.3+Math.sin(t*0.031+2)*0.2}
function poseOf(shape,t){return S.displayPose(shape,t)}
function light(t){const f=flicker(t);return [0.15+f*0.12,-0.35+f*0.05,5.2]}
function drawWall(t){const f=flicker(t);g.fillStyle="#000";g.fillRect(0,0,W,H);
 if(wall.complete&&wall.naturalWidth){const s=Math.max(W/wall.naturalWidth,H/wall.naturalHeight);const w=wall.naturalWidth*s,h=wall.naturalHeight*s;g.globalAlpha=0.9+f*0.08;g.drawImage(wall,(W-w)/2,(H-h)/2,w,h);g.globalAlpha=1}
 const gr=g.createRadialGradient(W*0.5,H*0.95,0,W*0.5,H*0.6,radius(Math.max(W,H)*0.8));gr.addColorStop(0,"rgba(255,150,50,"+(0.16+f*0.05)+")");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,W,H)}
function wallScale(){return Math.max(0,Math.min(W,H-120))/5.6}
// Landscape only: fit already-projected art between the full quote and message.
// Reserve 24px above (including the soft shadow edge) and 12px below. Portrait
// keeps its original scale/center; no clipping, mesh, light or material changes.
function fitLandscape(points,scale,cy){
 if(W<=H)return {scale,cy};
 const origin=cv.getBoundingClientRect().top,q=$("quote").getBoundingClientRect();
 const top=q.bottom-origin+24,bottom=$("msg").getBoundingClientRect().top-origin-12;
 let lo=Infinity,hi=-Infinity;for(const p of points){lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1])}
 scale=Math.min(scale,Math.max(0,bottom-top)/Math.max(0.001,hi-lo));
 cy=Math.max(top+hi*scale,Math.min(cy,bottom+lo*scale));
 return {scale,cy}
}
function drawShadow(shape,t){const L=light(t),v=poseOf(shape,t),s=S.castShadow(v,shape.mesh.f,L),layout=fitLandscape(s.points,wallScale(),(H-90)/2),k=layout.scale,cx=W/2,cy=layout.cy;
 sg.setTransform(DPR,0,0,DPR,0,0);sg.clearRect(0,0,W,H);sg.fillStyle=sg.strokeStyle="#140802";sg.lineWidth=0.8;sg.lineJoin="round";
 for(const f of s.tris){const a=s.points[f[0]],b=s.points[f[1]],c=s.points[f[2]];sg.beginPath();sg.moveTo(cx+a[0]*k,cy-a[1]*k);sg.lineTo(cx+b[0]*k,cy-b[1]*k);sg.lineTo(cx+c[0]*k,cy-c[1]*k);sg.closePath();sg.fill();sg.stroke()}
 g.save();g.globalAlpha=0.9;g.globalCompositeOperation="multiply";g.filter="blur("+(2.5+Math.abs(flicker(t))*1.5)+"px)";g.drawImage(sh,0,0,W,H);g.restore();g.filter="none"}
function hx(c){return [1,3,5].map(i=>parseInt(c.substr(i,2),16))}
// value 0..1 = diffuse firelight (dark->mid->light), 1..1.4 = specular glint toward the hot highlight.
function shade(mat,d){const c=mat.c.map(hx),v=Math.max(0,Math.min(1.4,d));let a,b,k;if(v<.5){a=c[0];b=c[1];k=v*2}else if(v<1){a=c[1];b=c[2];k=(v-.5)*2}else{a=c[2];b=c[3];k=(v-1)/.4}
 return "rgb("+a.map((x,i)=>Math.round(x+(b[i]-x)*k)).join(",")+")"}
// Paint into a transparent layer: one soft exterior ink edge, continuous shading, a substance-specific brush
// texture per material part (wood only where the object is wood), warm firelight from below, no wireframes.
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
const tex=document.createElement("canvas"),tg=tex.getContext("2d"),mask=document.createElement("canvas"),mg=mask.getContext("2d");
const HL=(()=>{const h=[-.28,-.65,1.70],l=Math.hypot(...h);return h.map(x=>x/l)})();
function hash(n){const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)}
// Substance brushwork, drawn into tg (already masked to that material's visible faces). Fixed seeds: no flicker.
function radius(n){return Number.isFinite(n)?Math.max(0,n):0}
function brush(kind,cx,cy,size,mat){size=radius(size);const left=cx-size*1.5,top=cy-size*1.5,S3=size*3;tg.lineCap="round";
 if(kind==="wood"){for(let i=0;i<220;i++){const x=left+(i/220)*S3;tg.beginPath();for(let j=0;j<=32;j++){const y=top+j/32*S3,xx=x+Math.sin(j*.36+i*.17)*size*.012+Math.sin(j*.8+i)*size*.003;j?tg.lineTo(xx,y):tg.moveTo(xx,y)}
  tg.strokeStyle=i%3?"rgba(58,26,9,.10)":"rgba(255,204,125,.09)";tg.lineWidth=i%7===0?2:.65;tg.stroke()}return}
 if(kind==="ashlar"){ // broad dressed limestone joints, angular edge chips (no oval mottles)
  const bw=size*.82,bh=size*.64;if(!bw||!bh)return;
  for(let row=0;row<6;row++)for(let col=0;col<5;col++){const x=left+col*bw+(row%2)*bw*.22,y=top+row*bh;
   tg.strokeStyle="rgba(25,39,48,.48)";tg.lineWidth=Math.max(1,size*.014);tg.strokeRect(x,y,bw,bh);
   tg.strokeStyle="rgba(235,242,237,.28)";tg.lineWidth=1;tg.beginPath();tg.moveTo(x+3,y+bh-3);tg.lineTo(x+bw-3,y+bh-3);tg.stroke();
   for(let j=0;j<3;j++){const a=x+hash(row*31+col*7+j)*bw,b=y+bh;tg.fillStyle="rgba(28,42,51,.30)";tg.beginPath();tg.moveTo(a,b);tg.lineTo(a+size*.045,b-size*.027);tg.lineTo(a+size*.085,b);tg.fill()}}return}
 if(kind==="strata"){ // wind-worn, undulating ochre sediment layers, fine horizontal sand scratches
  for(let i=0;i<62;i++){const y=top+i/62*S3;tg.strokeStyle=i%4?"rgba(255,213,132,.18)":"rgba(92,43,12,.35)";tg.lineWidth=Math.max(.6,size*(i%4?.009:.022));tg.beginPath();
   for(let j=0;j<=30;j++){const x=left+j/30*S3,yy=y+Math.sin(j*.23+i*.7)*size*.025+j*size*.002;j?tg.lineTo(x,yy):tg.moveTo(x,yy)}tg.stroke()}return}
 if(kind==="masonry"){ // small staggered castle courses and deep cool mortar, fitted to tall merlons
  const bw=size*.38,bh=size*.25;if(!bw||!bh)return;
  for(let row=0;row<13;row++)for(let col=-1;col<9;col++){const x=left+(col+(row%2)*.5)*bw,y=top+row*bh;
   tg.fillStyle=`rgba(8,19,36,${.04+hash(row*29+col+50)*.15})`;tg.fillRect(x+2,y+2,bw-4,bh-4);
   tg.strokeStyle="rgba(12,20,33,.6)";tg.lineWidth=Math.max(1,size*.012);tg.strokeRect(x,y,bw,bh);
   tg.strokeStyle="rgba(194,209,221,.27)";tg.lineWidth=.8;tg.beginPath();tg.moveTo(x+2,y+bh-2);tg.lineTo(x+bw-2,y+bh-2);tg.stroke()}return}
 if(kind==="stone"){for(let i=0;i<160;i++){const x=left+hash(i+3)*S3,y=top+hash(i+71)*S3,r=size*(.03+hash(i+9)*.09);tg.fillStyle=i%2?"rgba(30,24,18,.10)":"rgba(255,232,190,.08)";tg.beginPath();tg.ellipse(x,y,radius(r),radius(r*.7),hash(i)*3,0,7);tg.fill()}
  tg.strokeStyle="rgba(25,18,12,.35)";tg.lineWidth=1;for(let i=0;i<5;i++){let x=left+size*(.8+hash(i+400)*1.4),y=top+size*(.6+hash(i+500)*1.6);tg.beginPath();tg.moveTo(x,y);for(let j=0;j<5;j++){x+=size*(hash(i*9+j)-.5)*.25;y+=size*.09;tg.lineTo(x,y)}tg.stroke()}return}
 if(kind==="metal"){for(let i=0;i<14;i++){const x=left+size*(.6+hash(i+31)*1.8),w=size*(.02+hash(i+5)*.08);const gr=tg.createLinearGradient(x-w,0,x+w,0);gr.addColorStop(0,"rgba(255,240,210,0)");gr.addColorStop(.5,i%3?"rgba(255,226,170,.22)":"rgba(20,22,30,.25)");gr.addColorStop(1,"rgba(255,240,210,0)");tg.fillStyle=gr;tg.fillRect(x-w,top,2*w,S3)}
  for(let i=0;i<90;i++){const x=left+hash(i+600)*S3,y=top+hash(i+700)*S3;tg.strokeStyle="rgba(255,250,235,.10)";tg.lineWidth=.6;tg.beginPath();tg.moveTo(x,y);tg.lineTo(x+size*.08,y+size*.01);tg.stroke()}return}
 if(kind==="glaze"){for(let i=0;i<40;i++){const a=hash(i+90)*6.28,x=cx+Math.cos(a)*size*hash(i+3)*.9,y=cy+Math.sin(a)*size*hash(i+8)*.9;tg.strokeStyle=i%2?"rgba(255,245,225,.10)":"rgba(10,8,14,.08)";tg.lineWidth=size*.05;tg.beginPath();tg.arc(x,y,radius(size*(.15+hash(i+1)*.3)),a,a+.9);tg.stroke()}
  const gl=tg.createRadialGradient(cx-size*.32,cy-size*.38,0,cx-size*.32,cy-size*.38,radius(size*.32));gl.addColorStop(0,"rgba(255,255,248,.55)");gl.addColorStop(1,"rgba(255,255,248,0)");tg.fillStyle=gl;tg.fillRect(left,top,S3,S3);return}
 if(kind==="cream"){for(let i=0;i<55;i++){const x=cx+(hash(i+5)-.5)*size*1.6,y=cy-size*.9+hash(i+15)*size*1.1;tg.strokeStyle=i%3?"rgba(255,250,244,.26)":"rgba(150,50,70,.16)";tg.lineWidth=size*(.02+hash(i)*.04);tg.beginPath();tg.arc(x,y,radius(size*(.08+hash(i+2)*.22)),3.3,5.9);tg.stroke()}return}
 if(kind==="wafer"){tg.strokeStyle="rgba(70,32,6,.55)";tg.lineWidth=Math.max(1,size*.018);for(let i=-14;i<=14;i++){for(const s of [1,-1]){tg.beginPath();tg.moveTo(cx+i*size*.11-size,cy-size*1.5*s+size*.2);tg.lineTo(cx+i*size*.11+size,cy+size*1.5*s+size*.2);tg.stroke()}}
  tg.fillStyle="rgba(255,226,160,.10)";for(let i=0;i<120;i++)tg.fillRect(left+hash(i+44)*S3,top+hash(i+55)*S3,2,2);return}
 if(kind==="paint"){for(let i=0;i<160;i++){const x=left+hash(i+1)*S3,y=top+hash(i+912)*S3,l=size*(.05+hash(i+8)*.12),a=hash(i+77)*.8-.4;
  tg.strokeStyle=i%2?"rgba(255,232,196,.07)":"rgba(30,14,8,.07)";tg.lineWidth=size*(.02+hash(i+44)*.04);tg.beginPath();tg.moveTo(x,y);tg.quadraticCurveTo(x+l*.5,y-l*.3+a*l,x+l,y+a*l);tg.stroke()}}}
function drawObject(shape,t,cx,cy,size){
 size=radius(size);
 for(const c of [paint,tex,mask])if(c.width!==cv.width||c.height!==cv.height){c.width=cv.width;c.height=cv.height}
 pg.setTransform(DPR,0,0,DPR,0,0);pg.clearRect(0,0,W,H);tg.setTransform(DPR,0,0,DPR,0,0);
 const v=poseOf(shape,t),cam=7,mats=matsFor(shape),part=i=>shape.mesh.t?shape.mesh.t[i]||0:0;
 const layout=fitLandscape(v.map(p=>[p[0]*cam/(cam-p[2]),p[1]*cam/(cam-p[2])]),size,cy);size=layout.scale;cy=layout.cy;
 const P=v.map(p=>{const s=cam/(cam-p[2]);return [cx+p[0]*s*size,cy-p[1]*s*size,p[2]]});
 // Rotate normals by exactly the object's pose (translation-free).
 const normals=S.displayPose({...shape,mesh:{v:vertexNormals(shape.mesh)}},t);
 // Fire is low and in front: diffuse from below plus a per-substance specular glint.
 const diffuse=normals.map(n=>Math.min(1,Math.max(.08,.48+.42*(n[0]*-.28+n[1]*-.65+n[2]*.70))));
 const spec=normals.map(n=>Math.max(0,n[0]*HL[0]+n[1]*HL[1]+n[2]*HL[2]));
 const tris=shape.mesh.f.map((f,i)=>({f,i,z:f.reduce((z,k)=>z+v[k][2],0)/3})).sort((a,b)=>a.z-b.z);
 const path=(c,f)=>{c.beginPath();c.moveTo(P[f[0]][0],P[f[0]][1]);c.lineTo(P[f[1]][0],P[f[1]][1]);c.lineTo(P[f[2]][0],P[f[2]][1]);c.closePath()};
 for(const {f,i} of tris){const mat=mats[part(i)]||mats[0],vals=f.map(k=>diffuse[k]+mat.sp*.55*Math.pow(spec[k],mat.sh)),pts=f.map(k=>P[k]);
 // Fit a linear illumination field to all three vertices; smooth, unquantized pigment.
 const [a,b,c]=pts,[va,vb,vc]=vals,det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
 let fill=shade(mat,(va+vb+vc)/3);
 if(Math.abs(det)>.1){const gx=((vb-va)*(c[1]-a[1])-(vc-va)*(b[1]-a[1]))/det,gy=((b[0]-a[0])*(vc-va)-(c[0]-a[0])*(vb-va))/det,gg=gx*gx+gy*gy;
 if(gg>.00000001){const lo=Math.min(...vals),hi=Math.max(...vals),x0=a[0]+gx*(lo-va)/gg,y0=a[1]+gy*(lo-va)/gg,x1=a[0]+gx*(hi-va)/gg,y1=a[1]+gy*(hi-va)/gg;
 if(hi-lo>.001){fill=pg.createLinearGradient(x0,y0,x1,y1);fill.addColorStop(0,shade(mat,lo));fill.addColorStop(1,shade(mat,hi))}}}
 pg.fillStyle=pg.strokeStyle=fill;pg.lineWidth=.65;path(pg,f);pg.fill();pg.stroke()}
 // Each material part gets ITS OWN brushwork, masked to that part's visible (depth-sorted) faces.
 mats.forEach((mat,k)=>{if(mat.tx==="none")return;mg.setTransform(DPR,0,0,DPR,0,0);mg.globalCompositeOperation="source-over";mg.clearRect(0,0,W,H);
  for(const {f,i} of tris){mg.globalCompositeOperation=part(i)===k?"source-over":"destination-out";mg.fillStyle=mg.strokeStyle="#fff";mg.lineWidth=.8;path(mg,f);mg.fill();mg.stroke()}
  tg.globalCompositeOperation="source-over";tg.clearRect(0,0,W,H);brush(mat.tx,cx,cy,size,mat);
  tg.save();tg.setTransform(1,0,0,1,0,0);tg.globalCompositeOperation="destination-in";tg.drawImage(mask,0,0);tg.restore();
  pg.save();pg.setTransform(1,0,0,1,0,0);pg.globalCompositeOperation="source-atop";pg.drawImage(tex,0,0);pg.restore()});
 tg.globalCompositeOperation="source-over";
 // Firelight glaze: cool umber up top, hot orange bounce from the fire below, a thin orange rim on the lower edge.
 pg.globalCompositeOperation="source-atop";
 const glaze=pg.createLinearGradient(0,cy-size*1.2,0,cy+size*1.2);glaze.addColorStop(0,"rgba(20,14,24,.30)");glaze.addColorStop(.5,"rgba(129,64,18,0)");glaze.addColorStop(1,"rgba(255,140,40,.28)");pg.fillStyle=glaze;pg.fillRect(0,0,W,H);
 const bloom=pg.createRadialGradient(cx,cy+size*1.4,0,cx,cy+size*1.4,radius(size*1.6));bloom.addColorStop(0,"rgba(255,170,70,.22)");bloom.addColorStop(1,"rgba(255,170,70,0)");pg.fillStyle=bloom;pg.fillRect(0,0,W,H);
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
function frame(now){requestAnimationFrame(frame);if(!$("game").classList.contains("on"))return;const sp=activeShapes[round];if(!sp)return;g.setTransform(DPR,0,0,DPR,0,0);drawWall(now);drawShadow(sp,now);
 if(phase==="reveal"){const a=Math.min(1,(now-revealAt)/500);g.save();g.globalAlpha=a*0.20;g.fillStyle="#000";g.fillRect(0,0,W,H);g.restore();g.save();g.globalAlpha=a;drawObject(sp,now,W/2,(H-150)/2+20,radius(Math.min(W,H-150)*0.27));g.restore()}}
requestAnimationFrame(frame);
function submit(){if(phase!=="guess")return;const text=$("guess").value;if(!S.norm(text)){$("msg").textContent="Type a word first.";$("guess").focus();return}
 const sp=activeShapes[round],ok=S.isCorrect(sp,text);lastResult=ok;phase="reveal";revealAt=performance.now();$("guess").disabled=true;$("guess").blur();
 if(ok){score+=100;$("msg").textContent="Yes! "+S.article(sp.name).replace(/^./,c=>c.toUpperCase())+" "+sp.name+". +100"}else{PlatoSfx.wrong();$("msg").textContent="No! It was "+S.article(sp.name)+" "+sp.name+"."}
 $("scoreTxt").textContent="Score "+score;$("goBtn").style.display="none";$("nextBtn").style.display="block"}
function next(){if(phase!=="reveal")return;round++;if(round>=activeShapes.length){endGame()}else newRound()}
$("bar").addEventListener("submit",e=>{e.preventDefault();if(phase==="guess")submit();else next()});
$("nextBtn").addEventListener("click",next);
$("againBtn").addEventListener("click",()=>startGame(activeLevel));$("rewatchBtn").addEventListener("click",startIntro);
// testing hook (no answers exposed beyond the shape list already in shapes.js)
self.__plato={get state(){return {introState,titleReady,musicNeedsUnlock,skipPending,skipWanted,round,score,phase,lastResult,activeLevel,total:activeShapes.length,currentScreen,musicVolume,soundsVolume,pendingReady}},submit:t=>{$("guess").value=t;submit()},next};
// Menu and settings sit outside the existing guessing loop.
for(const level of ["easy","medium","hard"])$(level+"Btn").addEventListener("click",()=>startGame(level));
$("menuBtn").addEventListener("click",()=>show("menu"));
let settingsFrom="menu";
function openSettings(){if(!["menu","end"].includes(currentScreen))return;settingsFrom=currentScreen;show("settings")}
$("settingsBtn").addEventListener("click",openSettings);$("endSettingsBtn").addEventListener("click",openSettings);
$("settingsDoneBtn").addEventListener("click",()=>show(settingsFrom));
function applyVolumes(){music.volume=musicVolume;PlatoSfx.setVolume(soundsVolume);
 $("musicVol").value=Math.round(musicVolume*100);$("soundsVol").value=Math.round(soundsVolume*100);
 $("musicPercent").textContent=Math.round(musicVolume*100)+"%";$("soundsPercent").textContent=Math.round(soundsVolume*100)+"%"}
for(const [id,key] of [["musicVol","platocave-music-vol"],["soundsVol","platocave-sfx-vol"]])$(id).addEventListener("input",()=>{
 const value=Number($(id).value);if(id==="musicVol")musicVolume=value/100;else soundsVolume=value/100;
 try{localStorage.setItem(key,String(value))}catch(_){}applyVolumes()});applyVolumes();
let installPrompt=null,installed=false;
const displayModes=matchMedia("(display-mode: standalone), (display-mode: fullscreen)");
function updateInstall(){const hide=installed||displayModes.matches||navigator.standalone===true;
 for(const id of ["startInstall","menuInstall"])$(id).hidden=hide}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e});
addEventListener("appinstalled",()=>{installed=true;installPrompt=null;updateInstall()});
if(displayModes.addEventListener)displayModes.addEventListener("change",updateInstall);
async function installApp(hint){if(!["start","menu"].includes(currentScreen))return;
 if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice}catch(_){} }
 else $(hint).hidden=false}
$("startInstallBtn").addEventListener("click",()=>installApp("startInstallHint"));
$("menuInstallBtn").addEventListener("click",()=>installApp("menuInstallHint"));updateInstall();
let swRegistration=null,updateTimer=0,updateTimeout=0;
function updateStatus(status){clearTimeout(updateTimer);
 if(status==="pending-ready")pendingReady=true;
 const labels={checking:"Checking…",current:"You’re up to date","pending-ready":"Update ready — tap to reload",failed:"Try again when you’re online"};
 $("updateBtn").textContent=pendingReady?labels["pending-ready"]:(labels[status]||"Check for update");updateCorner();
 if(status!=="checking")clearTimeout(updateTimeout);
 if(status==="current"&&!pendingReady)updateTimer=setTimeout(()=>{$("updateBtn").textContent="Check for update"},2000)}
function reloadUpdate(){if(pendingReady&&["start","menu","end"].includes(currentScreen))location.reload()}
$("updateReadyBtn").addEventListener("click",reloadUpdate);
$("updateBtn").addEventListener("click",()=>{if(currentScreen!=="menu")return;if(pendingReady){reloadUpdate();return}
 const worker=navigator.serviceWorker&&(navigator.serviceWorker.controller||(swRegistration&&swRegistration.active));
 if(!navigator.onLine||!worker){updateStatus("failed");return}updateStatus("checking");worker.postMessage("check");
 clearTimeout(updateTimeout);updateTimeout=setTimeout(()=>updateStatus("failed"),45000)});
if("serviceWorker" in navigator&&location.protocol!=="file:"){
 navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="plato-update")updateStatus(e.data.status)});
 navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready).then(r=>{swRegistration=r;if(navigator.onLine&&r.active)r.active.postMessage("check")}).catch(()=>{})}
