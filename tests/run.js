// node tests/run.js
const fs=require("fs"),path=require("path"),crypto=require("crypto");const R=path.join(__dirname,"..");
let pass=0,fail=0;function t(n,f){try{f();pass++;console.log("PASS",n)}catch(e){fail++;console.log("FAIL",n,"-",e.message)}}
function ok(c,m){if(!c)throw new Error(m||"assert")}
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(path.join(R,f))).digest("hex");
const S=require(path.join(R,"shapes.js"));const read=f=>fs.readFileSync(path.join(R,f),"utf8");
t("intro mp4 sha256 lock",()=>ok(sha("assets/intro.mp4")==="60e6cd0c299872637fee6cbd8454328ee8baa4c61f010980e4395c2474098fc4"));
t("music mp3 sha256 lock",()=>ok(sha("assets/intro-music.mp3")==="9c640edc2ebf15d80143b423f89dcb1d169069f5a1d35f5d320db28a65dac8da"));
t("50 uniquely named shapes",()=>{ok(S.SHAPES.length===50,"count "+S.SHAPES.length);ok(new Set(S.SHAPES.map(s=>s.name)).size===50)});
t("no alias collides with another shape",()=>{const own={};for(const s of S.SHAPES)for(const a of [s.name].concat(s.aliases)){const k=S.norm(a);ok(own[k]===undefined||own[k]===s.id,"dup "+a);own[k]=s.id}});
t("first two rounds are ball and cube",()=>ok(S.SHAPES[0].name==="ball"&&S.SHAPES[1].name==="cube"));
t("every mesh is valid 3D (non-flat, finite, indices in range)",()=>{for(const s of S.SHAPES){const v=s.mesh.v;ok(s.mesh.f.length>=8,s.name);for(const f of s.mesh.f)for(const i of f)ok(i>=0&&i<v.length,s.name);
 const zs=v.map(p=>p[2]);ok(Math.max(...zs)-Math.min(...zs)>0.05,s.name+" flat");ok(v.every(p=>p.every(Number.isFinite)),s.name)}});
function shadowArea(s,yaw,time){const v=time===undefined?S.pose(s.mesh,yaw||0.18,0.12):S.displayPose(s,time),L=[0.15,-0.35,5.2],sh=S.castShadow(v,s.mesh.f,L);
 // rasterize union of projected triangles on a grid
 const N=120,G=new Uint8Array(N*N),X=3.2;for(const f of sh.tris){const [a,b,c]=f.map(i=>sh.points[i]);const lo=[Math.min(a[0],b[0],c[0]),Math.min(a[1],b[1],c[1])],hi=[Math.max(a[0],b[0],c[0]),Math.max(a[1],b[1],c[1])];
  for(let gx=Math.max(0,Math.floor((lo[0]+X)/(2*X)*N));gx<=Math.min(N-1,Math.ceil((hi[0]+X)/(2*X)*N));gx++)for(let gy=Math.max(0,Math.floor((lo[1]+X)/(2*X)*N));gy<=Math.min(N-1,Math.ceil((hi[1]+X)/(2*X)*N));gy++){const p=[(gx+0.5)/N*2*X-X,(gy+0.5)/N*2*X-X];
   const d=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]),d1=d(p,a,b),d2=d(p,b,c),d3=d(p,c,a);if(!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0)))G[gy*N+gx]=1}}return G}
t("shadow is cast from the same mesh by the light (every vertex on the light ray, on the wall)",()=>{const L=[0.15,-0.35,5.2];for(const s of S.SHAPES){const v=S.pose(s.mesh,0.3,0.1),sh=S.castShadow(v,s.mesh.f,L);
 ok(sh.tris===s.mesh.f,"faces reused");ok(sh.points.length===v.length);for(let i=0;i<v.length;i+=7){const p=v[i],q=[sh.points[i][0],sh.points[i][1],S.WALL_Z];
  const a=[p[0]-L[0],p[1]-L[1],p[2]-L[2]],b=[q[0]-L[0],q[1]-L[1],q[2]-L[2]],c=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];ok(Math.hypot(...c)<1e-6*Math.hypot(...b)*Math.hypot(...a)+1e-9,s.name+" not collinear")}}});
t("shadow changes when the mesh changes (not a fixed blob); all 50 silhouettes differ",()=>{const gs=S.SHAPES.map(s=>shadowArea(s));for(let i=0;i<50;i++){let n=0;for(const x of gs[i])n+=x;ok(n>150,S.SHAPES[i].name+" tiny shadow "+n);
  for(let j=0;j<i;j++){let d=0;for(let k=0;k<gs[i].length;k++)d+=gs[i][k]!==gs[j][k];ok(d>40,S.SHAPES[i].name+" vs "+S.SHAPES[j].name+" too similar ("+d+")")}}});
t("actual animated silhouettes remain unique at four sampled poses",()=>{for(const time of [0,1000,4000,8000]){const gs=S.SHAPES.map(s=>shadowArea(s,0,time));for(let i=0;i<50;i++)for(let j=0;j<i;j++){let d=0;for(let k=0;k<gs[i].length;k++)d+=gs[i][k]!==gs[j][k];ok(d>40,S.SHAPES[i].name+" vs "+S.SHAPES[j].name+" at "+time+" ("+d+")")}}});
t("guess matching: case/space/article tolerant, wrong rejected, empty rejected",()=>{const b=S.SHAPES[0],c=S.SHAPES[1];ok(S.isCorrect(b,"  Ball "));ok(S.isCorrect(b,"a ball"));ok(S.isCorrect(b,"Sphere"));ok(S.isCorrect(c,"box"));ok(S.isCorrect(c,"cubes"));ok(!S.isCorrect(b,"cube"));ok(!S.isCorrect(b,""));ok(!S.isCorrect(b,"   "))});
const game=read("game.js");
const Q=require(path.join(R,"quotes.js"));
const APPROVED=["They see only their own shadows, or the shadows of one another, which the fire throws on the opposite wall of the cave.","How could they see anything but the shadows if they were never allowed to move their heads?","To them, the truth would be literally nothing but the shadows of the images.","He will be unable to see the realities of which in his former state he had seen the shadows.","Will he not fancy that the shadows which he formerly saw are truer than the objects which are now shown to him?","When he approaches the light his eyes will be dazzled, and he will not be able to see anything at all of what are now called realities.","Last of all he will be able to see the sun, and not mere reflections of him in the water.","Better to be the poor servant of a poor master, and to endure anything, rather than think as they do and live after their manner.","Coming suddenly out of the sun to be replaced in his old situation, would he not be certain to have his eyes full of darkness?","Men would say of him that up he went and down he came without his eyes.","The prison-house is the world of sight, the light of the fire is the sun.","The journey upwards is the ascent of the soul into the intellectual world.","In the world of knowledge the idea of good appears last of all, and is seen only with an effort.","The bewilderments of the eyes are of two kinds, and arise from two causes, either from coming out of the light or from going into the light.","The power and capacity of learning exists in the soul already."];
const BANNED=["be kind, for everyone","only the dead have seen the end of war","music gives a soul","forgive a child who is afraid of the dark","see beyond the shadows and lies","i know that i know nothing","necessity is the mother of invention","courage is knowing what not to fear","wise men speak because","first and greatest victory is to conquer"];
t("quotes: all 15 locked Republic VII texts installed exactly",()=>{ok(Q.QUOTES.length===15,"count "+Q.QUOTES.length);for(const a of APPROVED)ok(Q.QUOTES.some(q=>q.text===a),"missing "+a)});
t("quotes: every installed saying is an approved text",()=>{for(const q of Q.QUOTES)ok(APPROVED.includes(q.text),"unapproved "+q.text);ok(new Set(Q.QUOTES.map(q=>q.text)).size===Q.QUOTES.length)});
t("quotes: every attribution names Plato (Republic)",()=>{for(const q of Q.QUOTES)ok(/Plato/.test(q.by)&&/Republic/.test(q.by),q.by)});
t("quotes: no misattributed internet quotes anywhere in the game",()=>{const all=(read("quotes.js")+read("game.js")+read("index.html")).toLowerCase();for(const b of BANNED)ok(!all.includes(b),b)});
t("quotes: pickForRound rotates and is deterministic",()=>{ok(Q.pickForRound(0)!==Q.pickForRound(1));ok(Q.pickForRound(3)===Q.pickForRound(3));ok(Q.pickForRound(15)===Q.pickForRound(0));for(let i=0;i<50;i++)ok(Q.QUOTES.includes(Q.pickForRound(i)))});
t("quotes: shown per round in newRound, guess loop untouched",()=>{ok(/function newRound\(\)\{[\s\S]*?showQuote\(\)\}/.test(game));ok(/pickForRound\(round\)/.test(game));ok(!/function frame[^\n]*showQuote/.test(game))});
// Execute the real layout helper with viewport-relative DOM rects.
function layoutHarness(W,H,quoteBottom=90,offset=0){const ctx={W,H,cv:{getBoundingClientRect:()=>({top:offset})},$:id=>({getBoundingClientRect:()=>id==="quote"?{bottom:offset+quoteBottom}:{top:offset+H-140}})};
 require("vm").createContext(ctx);require("vm").runInContext(game.slice(game.indexOf("function fitLandscape("),game.indexOf("function drawShadow(")),ctx);return ctx.fitLandscape}
t("landscape art clears full quote and message for all 150 meshes / five poses",()=>{
 for(const [W,H] of [[800,400],[1280,800]])for(const bottom of [65,90,110]){
 const fit=layoutHarness(W,H,bottom,140);
 for(const shape of Object.values(S.LEVELS).flat())for(const time of [0,1000,4000,8000,20000]){
 const v=S.displayPose(shape,time),shadow=S.castShadow(v,shape.mesh.f,[.15,-.35,5.2]).points;
 for(const [p,scale,cy] of [[shadow,Math.min(W,H-120)/5.6,(H-90)/2],[v.map(p=>[p[0]*7/(7-p[2]),p[1]*7/(7-p[2])]),Math.min(W,H-150)*.27,(H-150)/2+20]]){
 const a=fit(p,scale,cy);ok(a.scale<=scale&&a.scale>=0);for(const q of p){const y=a.cy-q[1]*a.scale;ok(y>=bottom+24-1e-6&&y<=H-152+1e-6,shape.name+" "+W+"x"+H+" y="+y)}
 }}}});
t("portrait retains exact original art scale and center",()=>{for(const [W,H] of [[390,844],[400,380+400]]){const fit=layoutHarness(W,H);for(const [scale,cy] of [[52,377],[100,367]]){const a=fit([[0,-10],[0,10]],scale,cy);ok(a.scale===scale&&a.cy===cy)}}});
t("quote is never height-clipped and both drawing paths use landscape reserve",()=>{ok(game.includes('maxHeight:"none",overflow:"visible"'));ok(game.includes('layout=fitLandscape(s.points,wallScale()'));ok(game.includes('layout=fitLandscape(v.map('));ok(read("style.css").includes('@media (orientation:landscape)'))});
t("levels still 50/50/50 and cave wall lock",()=>{ok(S.LEVELS.easy.length===50&&S.LEVELS.medium.length===50&&S.LEVELS.hard.length===50);ok(sha("assets/cave-wall.jpg")==="5916d37cdf7759752ae694807358018d06d7c99b0aebd9e0d1b1697491e315d0")});
t("scoring: +100 on correct, no points + original SFX on wrong",()=>{ok(/if\(ok\)\{score\+=100/.test(game));ok(/else\{PlatoSfx\.wrong\(\)/.test(game));const sfx=read("sfx.js");ok(/createOscillator/.test(sfx)&&!/\.(mp3|wav|ogg)/.test(sfx),"sfx must be synthesized")});
t("no ads / trackers / CDN",()=>{for(const f of ["index.html","game.js","shapes.js","sfx.js","sw.js","style.css","manifest.webmanifest"]){const s=read(f).toLowerCase();for(const bad of ["adsbygoogle","adsense","doubleclick","googletagmanager","google-analytics","gtag(","admob","applovin","unityads","facebook.net","cdn.","https://","http://"])ok(!s.includes(bad),f+" has "+bad)}});
t("service worker caches every bundled asset and they exist",()=>{const sw=read("sw.js");const list=JSON.parse(sw.match(/const SHELL=(\[.*?\]);/)[1]);
 for(const a of ["assets/intro.mp4","assets/intro-music.mp3","assets/cave-wall.jpg","game.js?v=9","quotes.js?v=1","shapes.js?v=6","sfx.js?v=2","style.css?v=5","index.html"])ok(list.includes(a),a);
 for(const a of list)if(a!=="./")ok(fs.existsSync(path.join(R,a.split("?")[0])),"missing "+a);const html=read("index.html");for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))ok(list.includes(m[1])||m[1].startsWith("icons/")&&list.includes(m[1])||m[1]==="manifest.webmanifest","uncached "+m[1])});
t("update path: version.json never cached, pending build, silent fail",()=>{const sw=read("sw.js");ok(/cache:"no-store"/.test(sw));ok(!/"version\.json"\s*[,\]]/.test(sw.match(/const SHELL=(\[.*?\]);/)[1]));ok(/pending/.test(sw)&&/silent/.test(sw));ok(JSON.parse(read("version.json")).build)});
t("manifest standalone/fullscreen",()=>{const m=JSON.parse(read("manifest.webmanifest"));ok(m.display==="fullscreen"&&m.display_override.includes("standalone"))});
t("title is tappable before ended, held only with decoded title",()=>{ok(/addEventListener\("ended",toHold\)/.test(game));ok(/if\(titleReady\|\|introState==="hold"\)endIntro\(\)/.test(game));ok(/video.currentTime<TITLE_TIME\|\|video.readyState<2/.test(game));ok(/requestVideoFrameCallback/.test(game)&&/addEventListener\("seeked"/.test(game));ok(/function endIntro\(\)\{[^}]*show\("menu"\)/.test(game));ok(!(read("index.html")+game).toLowerCase().includes("not included"))});
t("music loops through hold, rejection remembered and gesture retried",()=>{const html=read("index.html");ok(/<audio id="introMusic" src="assets\/intro-music\.mp3"[^>]*loop/.test(html));ok(/<video id="introVideo" src="assets\/intro\.mp4"[^>]*muted/.test(html));ok(/video\.play\(\)[\s\S]{0,200}retryMusic\(\)/.test(game));ok(/musicNeedsUnlock=true/.test(game));ok(/addEventListener\("pointerdown",retryMusic\)/.test(game))});
t("visual viewport offset, size and scroll position all game controls",()=>{for(const term of ["vv.width","vv.height","vv.offsetLeft","vv.offsetTop",'addEventListener("scroll",resize)','$("bar").style.top','$("msg").style','$("hud").style'])ok(game.includes(term),term)});
for(const name of ["arrow","egg","ice cream","hourglass","axe","umbrella","anchor"])t("an "+name,()=>ok(S.article(name)==="an"));
for(const name of ["ball","cube","house","heart","tower"])t("a "+name,()=>ok(S.article(name)==="a"));
t("wooden eagle is volumetric and accepted",()=>{const bird=S.SHAPES.find(s=>s.name==="bird");ok(bird.mesh.f.length>500);ok(S.isCorrect(bird,"wooden eagle"));ok(S.isCorrect(bird,"eagle"))});
t("cone and pyramid have distinct projected bases throughout animation",()=>{const c=S.SHAPES[2],p=S.SHAPES[4];for(const time of [0,1000,4000,8000]){const cv=S.displayPose(c,time),pv=S.displayPose(p,time);ok(Math.max(...cv.map(v=>v[1]))>0);ok(JSON.stringify(cv)!==JSON.stringify(pv))}});

t("version bumped to build 9 with cache-busted changed scripts",()=>{ok(JSON.parse(read("version.json")).build==="9");const html=read("index.html");ok(html.includes('src="quotes.js?v=1"')&&html.includes('href="style.css?v=5"')&&html.indexOf("quotes.js")<html.indexOf("game.js")&&html.includes('src="game.js?v=9"')&&html.includes('src="shapes.js?v=6"')&&html.includes('src="sfx.js?v=2"'))});
t("cave wall image unchanged",()=>ok(sha("assets/cave-wall.jpg")==="5916d37cdf7759752ae694807358018d06d7c99b0aebd9e0d1b1697491e315d0"));
t("Skip clears the previous fallback timer before assigning a new one",()=>{const body=game.match(/function trySkip\(\)\{[\s\S]*?\n function|function trySkip\(\)\{[\s\S]*?resumeIntro\(\)\}\}/)[0];
 const iClear=body.indexOf("clearTimeout(seekTimer)"),iSet=body.indexOf("seekTimer=setTimeout");ok(iClear>=0&&iSet>iClear,"clear before set");
 ok((game.match(/seekTimer=setTimeout/g)||[]).length===1,"only one place assigns a fallback");ok(/\$\("skipBtn"\)\.addEventListener\("click",e=>\{[^}]*trySkip\(\)/.test(game))});
// Simulate the Skip state machine with the real game.js functions and fake timers / video.
t("rapid Skips leave exactly one live fallback; remembered skip retries once seekable and never holds black",()=>{
 const src=game.slice(0,game.indexOf('$("intro").addEventListener("click"'));let timers=new Map(),tid=0;const handlers={};
 const el=()=>({classList:{add(){},remove(){},toggle(){}},style:{},addEventListener(){}});const els={};
 const video={currentTime:0,duration:NaN,readyState:4,paused:false,seeking:false,seekable:{length:0,end:()=>0},plays:0,pauses:0,
  play(){this.paused=false;this.plays++;return Promise.resolve()},pause(){this.paused=true;this.pauses++},addEventListener(ev,f){(handlers[ev]=handlers[ev]||[]).push(f)},requestVideoFrameCallback(cb){cb(0,{mediaTime:this.currentTime})}};
 const music={play(){return Promise.resolve()},pause(){},volume:1,loop:true,currentTime:0};
 const sb={PlatoShapes:S,PlatoSfx:{unlock(){}},document:{getElementById:id=>id==="introVideo"?video:id==="introMusic"?music:(els[id]=els[id]||el())},
  clearInterval(){},setTimeout:(f)=>{timers.set(++tid,f);return tid},clearTimeout:id=>timers.delete(id),requestAnimationFrame:f=>f(),Number,Math,Promise};
 const api=require("vm").runInNewContext(src+";({trySkip,startIntro,get s(){return {introState,skipPending,skipWanted,seekTimer}},toHold})",sb);
 const fire=ev=>(handlers[ev]||[]).forEach(f=>f());
 api.startIntro();video.paused=false;video.duration=25.36;video.seekable={length:1,end:()=>25.36};
 for(let i=0;i<5;i++)api.trySkip();ok(timers.size===1,"live timers "+timers.size);
 // the seek succeeds: decoded title frame
 video.currentTime=25.24;fire("seeked");ok(api.s.introState==="hold"&&timers.size===0,"held, timers cleared");
 // first uncached load: not seekable yet -> remembered, keeps playing, no timer, no hold
 api.startIntro();video.paused=false;video.currentTime=2;video.duration=NaN;video.seekable={length:0,end:()=>0};api.trySkip();
 ok(api.s.skipWanted&&!api.s.skipPending&&timers.size===0&&!video.paused&&api.s.introState==="playing","remembered");
 fire("progress");ok(api.s.skipWanted&&!api.s.skipPending,"still waiting while unseekable");
 video.duration=25.36;video.seekable={length:1,end:()=>25.36};fire("progress");ok(!api.s.skipWanted&&api.s.skipPending&&timers.size===1,"retry seek started");
 // later seek fails and lands on a zero-time / undecoded frame: must resume, never pause black
 video.currentTime=0;video.readyState=0;const p0=video.pauses;fire("seeked");ok(api.s.introState==="playing"&&!api.s.skipPending&&video.pauses===p0&&!video.paused&&timers.size===0,"resumed, no black hold");
 api.toHold();ok(api.s.introState==="playing","toHold refuses zero-time frame");
 // Empty seekable ranges can persist even once decoded data and finite duration exist.
 api.startIntro();video.duration=NaN;video.readyState=1;video.seekable={length:0,end:()=>0};api.trySkip();ok(api.s.skipWanted);
 video.duration=25.36;video.readyState=2;fire("canplay");ok(api.s.skipPending&&video.currentTime>23,"empty ranges fallback seeks");fire("seeked");ok(api.s.introState==="hold","decoded empty-range hold");
 // QA leftover: Chromium first uncached load reports duration 25.36, readyState 4, but seekable length 1 / end 0.
 api.startIntro();video.currentTime=3;video.duration=NaN;video.readyState=1;video.seekable={length:1,end:()=>0};api.trySkip();ok(api.s.skipWanted&&!api.s.skipPending,"NaN duration only remembers");
 video.duration=25.36;video.readyState=4;fire("timeupdate");ok(!api.s.skipWanted&&api.s.skipPending&&timers.size===1&&Math.abs(video.currentTime-25.24)<1e-6,"end-0 range attempts safe seek via retry");
 fire("seeked");ok(api.s.introState==="hold","end-0 range holds decoded title");
 api.startIntro();video.currentTime=3;video.seekable={length:1,end:()=>0};api.trySkip();ok(api.s.skipPending&&!api.s.skipWanted&&Math.abs(video.currentTime-25.24)<1e-6,"end-0 range direct Skip seeks");
 video.currentTime=0;video.readyState=0;fire("seeked");ok(api.s.introState==="playing"&&!video.paused&&timers.size===0,"end-0 failed seek keeps playing");video.readyState=4;
 // A range reaching TITLE_TIME but not duration-0.25 is enough to attempt the seek.
 api.startIntro();video.currentTime=3;video.seekable={length:1,end:()=>24.0};api.trySkip();ok(api.s.skipPending&&Math.abs(video.currentTime-25.24)<1e-6,"range end 24.0 seeks");
 video.seekable={length:1,end:()=>22.9};video.readyState=1;api.startIntro();api.trySkip();ok(api.s.skipWanted&&!api.s.skipPending,"short range without data waits");video.readyState=4;video.seekable={length:1,end:()=>25.36};
 api.startIntro();
 // and the deferred path also clears a previous timer
 video.readyState=4;api.trySkip();const before=timers.size;video.seekable={length:0,end:()=>0};video.readyState=0;api.trySkip();ok(before===1&&timers.size===0,"deferring clears the old fallback")});
t("stone trio have independent ramps and mark vocabularies",()=>{const om=new Function("return "+game.match(/const OBJ_MATS=(\{[\s\S]*?\});/)[1])(),m=new Function("return "+game.match(/const MATS=(\{[\s\S]*?\});/)[1])();const ids=["cube","pyramid","tower"].map(n=>om[n][0]);ok(new Set(ids).size===3);ok(new Set(ids.map(id=>JSON.stringify(m[id].c))).size===3);ok(new Set(ids.map(id=>m[id].tx)).size===3);for(const id of ids)ok(game.includes('if(kind==="'+m[id].tx+'")'));ok(!ids.some(id=>m[id].tx==="stone"))});
t("every dynamic canvas radius is explicitly clamped",()=>{for(const line of game.split("\n"))for(const m of line.matchAll(/(?:arc|ellipse|createRadialGradient)\(([^;]*)/g))ok(m[1].includes("radius("),line);ok(game.includes("radius(Math.min(W,H-150)*0.27)"))});
t("ice cream: accepted names, cream scoop distinct from ridged wafer cone, silhouette unlike plain cone",()=>{const ic=S.SHAPES.find(s=>s.name==="ice cream"),cone=S.SHAPES.find(s=>s.name==="cone");
 for(const n of ["ice cream","Ice cream cone","icecream","cone of ice cream","an ice cream"])ok(S.isCorrect(ic,n),n);ok(!S.isCorrect(ic,"cone"));
 ok(Array.isArray(ic.mesh.t)&&ic.mesh.t.length===ic.mesh.f.length,"per-face parts");const parts=new Set(ic.mesh.t);ok(parts.has(0)&&parts.has(1),"wafer + scoop parts");
 const ys=k=>ic.mesh.f.filter((_,i)=>ic.mesh.t[i]===k).flatMap(f=>f.map(i=>ic.mesh.v[i][1]));ok(Math.min(...ys(1))>Math.min(...ys(0))+0.5,"scoop sits above the cone tip");
 const cream=ic.mesh.f.filter((_,i)=>ic.mesh.t[i]===1).length;ok(cream>300&&ic.mesh.f.length-cream>200,"real scoop and ridged cone volumes");
 const g1=shadowArea(ic),g2=shadowArea(cone);let d=0;for(let k=0;k<g1.length;k++)d+=g1[k]!==g2[k];ok(d>200,"vs cone "+d);
 ok(/ice cream":\["wafer","cream"\]/.test(game))});
t("reveals use per-substance materials, not one universal wood grain (bird keeps wood)",()=>{ok(!/const PAL=/.test(game),"old shared wood palettes");ok(/OBJ_MATS=/.test(game)&&/function brush\(kind/.test(game));
 const om=game.match(/const OBJ_MATS=(\{[\s\S]*?\});/)[1],objs=new Function("return "+om)();ok(Object.keys(objs).length===50&&S.SHAPES.every(s=>objs[s.name]),"every shape mapped");
 ok(objs.bird[0]==="wood","bird is wood");const wood=S.SHAPES.filter(s=>objs[s.name][0]==="wood").length;ok(wood<=6,"wood-first shapes "+wood);
 ok(objs.ball[0]!=="wood"&&objs.cube[0]!=="wood"&&objs.ball[0]!==objs.cube[0],"ball/cube distinct, not wood");ok(new Set(Object.values(objs).map(x=>x[0])).size>=15,"many substances");
 ok(/if\(kind==="wood"\)/.test(game)&&!/for\(let i=0;i<220;i\+\+\)[^\n]*pg\./.test(game),"wood grain is only a material brush, not a pg overlay");ok(/feather incisions/.test(game))});
t("legacy completeness does not depend on a future worker SHELL",()=>{const body=read("sw.js").split("async function cacheComplete")[1].split("async function complete")[0];ok(!/for\(const u of SHELL\)/.test(body));ok(body.includes("LEGACY_CORE")&&body.includes('searchParams.get("v")===String(build)'))});
t("downloads publish a validated staging cache and guard live targets",()=>{const body=read("sw.js").split("async function download")[1].split("async function cleanup")[0];ok(body.indexOf("cacheComplete(stage,build)")<body.indexOf("await caches.delete(PREFIX+build)"));ok(body.indexOf("inUse(m,build)")<body.indexOf("await caches.delete(PREFIX+build)"));ok(body.includes("keys:SHELL")&&body.includes("finally"))});
t("SW update path keeps Shark pattern and adds session pins",()=>{const sw=read("sw.js");ok(/cache:"no-store"/.test(sw)&&/all-or-nothing/.test(sw)&&/silent/.test(sw)&&/m2\.pending=b/.test(sw));
 ok(/resultingClientId/.test(sw)&&/clients\.matchAll/.test(sw)&&/pins/.test(sw));ok(/c\.match\(r\.url\)\|\|await c\.match\(r\.url,\{ignoreSearch:true\}\)/.test(sw),"exact first")});
t("endIntro routes to menu and never starts gameplay",()=>{const body=game.match(/function endIntro\(\)\{([^}]+)\}/)[1];ok(body.includes('show("menu")'));ok(!body.includes("startGame"))});
t("level arrays preserve the complete ordered Easy set",()=>{const names="ball,cube,cone,cylinder,pyramid,donut,star,heart,diamond,moon,cross,arrow,egg,triangle prism,hexagon,house,tree,mushroom,snowman,lollipop,ice cream,bell,bottle,vase,cup,dumbbell,hourglass,candle,table,chair,ladder,key,hammer,sword,axe,umbrella,fish,bird,boat,car,rocket,lightning,crown,letter t,letter l,letter h,cloud,flower,tower,anchor";
 ok(S.LEVELS.easy===S.SHAPES);ok(S.LEVELS.easy.map(s=>s.name).join(",")===names);for(const k of ["medium","hard"])ok(Array.isArray(S.LEVELS[k])&&S.LEVELS[k].length===50)});
t("active level drives rounds, empty sets finish, replay keeps level",()=>{ok(game.includes("activeShapes=S.LEVELS[activeLevel]"));ok(game.includes("if(!activeShapes.length){endGame();return}"));ok(!game.includes("S.SHAPES[round]")&&!game.includes("S.SHAPES.length"));ok(game.includes('()=>startGame(activeLevel)'));for(const id of ["easyBtn","mediumBtn","hardBtn"])ok(read("index.html").includes('id="'+id+'"'))});
t("volume defaults 100/100 and saved music level is restored after fade",()=>{const load=game.match(/function savedVolume[\s\S]*?return 1\}/)[0];const fn=new Function("localStorage",load+";return savedVolume('test')");ok(fn({getItem:()=>null})===1);ok(fn({getItem:()=>"35"})===.35);ok(fn({getItem:()=>"0"})===0);
 ok(game.includes('musicVolume=savedVolume("platocave-music-vol")')&&game.includes('soundsVolume=savedVolume("platocave-sfx-vol")'));
 const fade=game.split("function fadeMusic()")[1].split("function endIntro")[0];ok(fade.includes("const v0=musicVolume")&&fade.includes("music.volume=musicVolume")&&!fade.includes("music.volume=1"));ok(!game.includes("music.volume=1"));
 const html=read("index.html");ok((html.match(/min="0" max="100" step="5" value="100"/g)||[]).length===2);ok(read("sfx.js").includes("0.5*volume")&&read("sfx.js").includes("0.32*volume"))});
t("SW pending notifications do not reload or change promotion policy",()=>{const sw=read("sw.js");for(const term of ["postMessage","pending-ready","checking","current","failed","notifyPending"])ok(sw.includes(term));ok(!sw.includes("location.reload")&&!sw.includes(".navigate("));ok(game.includes('["start","menu","end"].includes(currentScreen)'));ok(!/location.reload/.test(game.split('addEventListener("message"')[1]||""));ok(sw.includes("if(nav)await switchIfPending(m)"))});

// Eve t2060u/t2062u + Graphics Lead official sets, preserving every Easy object byte-for-byte.
const NEW_SETS=[...S.LEVELS.medium,...S.LEVELS.hard];
t("Medium/Hard have exactly 50 each in Graphics Lead order; bicycle in Hard",()=>{const expected={"medium": ["pear", "apple", "lemon", "banana", "pumpkin", "acorn", "peanut", "carrot", "leaf", "cactus", "palm tree", "broom", "shovel", "spoon", "fork", "frying pan", "rolling pin", "teapot", "kettle", "pitcher", "watering can", "boot", "hat", "hard hat", "backpack", "book", "lamp", "alarm clock", "desk globe", "trophy", "bench", "mailbox", "well", "tent", "barn", "lighthouse", "windmill", "street lamp", "wagon", "canoe", "barrel", "igloo", "silo", "pagoda", "grand piano", "violin", "saxophone", "megaphone", "tricycle", "seesaw"], "hard": ["washer", "bead", "straw", "elbow pipe", "funnel", "hex nut", "tire", "life ring", "horseshoe", "button", "picture frame", "arch", "safety pin", "paper clip", "chain link", "padlock", "wrench", "bucket", "basket", "birdhouse", "doghouse", "lantern", "binoculars", "eyeglasses", "scissors", "flute", "telescope", "gear", "pulley", "cart wheel", "steering wheel", "wreath", "pretzel", "chain", "step ladder", "window", "picket fence", "guitar", "harp", "bicycle", "unicycle", "wheelchair", "shopping cart", "tennis racket", "colander", "birdcage", "abacus", "portcullis", "jungle gym", "ferris wheel"]};for(const [k,ns] of Object.entries(expected))ok(JSON.stringify(S.LEVELS[k].map(s=>s.name))===JSON.stringify(ns),k+" official order");ok(S.LEVELS.hard.some(s=>s.name==="bicycle"))});
t("Easy meshes, names, aliases, sway and original material literal unchanged",()=>{const hash=x=>crypto.createHash("sha256").update(x).digest("hex");ok(hash(JSON.stringify(S.SHAPES))==="9ef5f1fdb4e09523d833fad497921f0b551763ca0bef31c81b11c2a8d42f828a","Easy data changed");ok(hash(game.match(/const OBJ_MATS=(\{[\s\S]*?\});/)[1])==="0ee55340cffaadd784cdb21f78d0c0099d7a72dc287ba95748d76386361142d2","Easy materials changed")});
t("all 150 shape names and aliases collision-free using original norm",()=>{const own=new Map();for(const s of [...S.SHAPES,...NEW_SETS])for(const a of [s.name,...s.aliases]){const k=S.norm(a);ok(!own.has(k)||own.get(k)===s.name,a+" conflicts "+own.get(k));own.set(k,s.name)}});
t("new levels reject forbidden hoop and Easy aliases",()=>{const forbid={banana:["crescent"],straw:["tube"],barrel:["drum","can","tube"],canoe:["ship","kayak"],lighthouse:["tower","castle"],birdhouse:["bird"],birdcage:["bird"],"step ladder":["ladder"],portcullis:["castle"],"hex nut":["nut","hex"],"desk globe":["globe"]};for(const n of ["washer","bead","tire","life ring","wreath","chain link","chain","cart wheel","steering wheel","pulley"])forbid[n]=[...(forbid[n]||[]),"donut","ring","torus"];for(const [n,arr] of Object.entries(forbid)){const sh=NEW_SETS.find(s=>s.name===n);for(const a of arr)ok(!S.isCorrect(sh,a),n+" accepted "+a)}});
for(const sh of NEW_SETS)t("new valid 3D mesh + mapped substances: "+sh.name,()=>{const m=sh.mesh;ok(m.f.length>=8);ok(m.v.every(v=>v.length===3&&v.every(Number.isFinite)));for(const f of m.f)for(const i of f)ok(Number.isInteger(i)&&i>=0&&i<m.v.length);for(let k=0;k<3;k++){let lo=Infinity,hi=-Infinity;for(const p of m.v){lo=Math.min(lo,p[k]);hi=Math.max(hi,p[k])}ok(hi-lo>.05,sh.name+" flat")}const mats=S.LEVEL_MATERIALS[sh.name];ok(mats&&mats.length);if(m.t){ok(m.t.length===m.f.length);ok(m.t.every(k=>k>=0&&k<mats.length))}});
t("100 new shadows use SAME mesh with every vertex on the point-light ray",()=>{const L=[.15,-.35,5.2];for(const s of NEW_SETS){const v=S.pose(s.mesh,.3,.1),sh=S.castShadow(v,s.mesh.f,L);ok(sh.tris===s.mesh.f);ok(sh.points.length===v.length);for(let i=0;i<v.length;i++){const a=v[i].map((x,k)=>x-L[k]),b=[...sh.points[i],S.WALL_Z].map((x,k)=>x-L[k]),c=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];ok(Math.hypot(...c)<1e-6*Math.hypot(...a)*Math.hypot(...b)+1e-9,s.name)}}});
for(const level of ["medium","hard"])for(const time of [0,1000,4000,8000])t(level+" silhouettes unique at animated pose "+time,()=>{const set=S.LEVELS[level],gs=set.map(s=>shadowArea(s,0,time));for(let i=0;i<set.length;i++)for(let j=0;j<i;j++){let d=0;for(let k=0;k<gs[i].length;k++)d+=gs[i][k]!==gs[j][k];ok(d>40,set[i].name+" vs "+set[j].name+" too similar "+d)}});
t("new material fallback uses existing painted material definitions only",()=>{const mats=new Function("return "+game.match(/const MATS=(\{[\s\S]*?\});/)[1])();for(const arr of Object.values(S.LEVEL_MATERIALS))for(const id of arr)ok(mats[id],id);ok(game.includes("OBJ_MATS[shape.name]||S.LEVEL_MATERIALS[shape.name]"))});

// Real openings rasterized from the same live triangles and point light.
function levelShadowArea(s,yaw=.18,pitch=.12,N=120){const sh=S.castShadow(S.pose(s.mesh,yaw,pitch),s.mesh.f,[.15,-.35,5.2]),G=new Uint8Array(N*N),X=3.2;
for(const f of sh.tris){const [a,b,c]=f.map(i=>sh.points[i]);const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(area)<1e-12)continue;
const lo=[Math.min(a[0],b[0],c[0]),Math.min(a[1],b[1],c[1])],hi=[Math.max(a[0],b[0],c[0]),Math.max(a[1],b[1],c[1])];
for(let gx=Math.max(0,Math.floor((lo[0]+X)/(2*X)*N));gx<=Math.min(N-1,Math.ceil((hi[0]+X)/(2*X)*N));gx++)for(let gy=Math.max(0,Math.floor((lo[1]+X)/(2*X)*N));gy<=Math.min(N-1,Math.ceil((hi[1]+X)/(2*X)*N));gy++){if(G[gy*N+gx])continue;const p=[(gx+.5)/N*2*X-X,(gy+.5)/N*2*X-X],d=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]),d1=d(p,a,b),d2=d(p,b,c),d3=d(p,c,a);if(!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0)))G[gy*N+gx]=1}}
return G}
function difference(a,b){let d=0;for(let i=0;i<a.length;i++)d+=a[i]!==b[i];return d}
function holes(G,N=120){const seen=new Uint8Array(G.length),q=[];function add(i){if(i>=0&&i<G.length&&!G[i]&&!seen[i]){seen[i]=1;q.push(i)}}for(let i=0;i<N;i++){add(i);add((N-1)*N+i);add(i*N);add(i*N+N-1)}for(let p=0;p<q.length;p++){const i=q[p],x=i%N,y=Math.floor(i/N);if(x)add(i-1);if(x<N-1)add(i+1);if(y)add(i-N);if(y<N-1)add(i+N)}let n=0;for(let i=0;i<G.length;i++)n+=!G[i]&&!seen[i];return n}
const poses=[[.18,.12],[-.3,0],[-.35,0],[0,0],[.7,.2],[1.3,.1],[0,Math.PI/2],[Math.PI/2,Math.PI/4],[Math.PI/2,-Math.PI/4],[.15,-.8]],apertures={};
// Horseshoe and arch are intentionally open-bottomed, so use open-cavity rather than enclosed-island test.
const openBottom=new Set(['horseshoe','arch']);
for(const s of S.LEVELS.hard)t('real light-through opening: '+s.name,()=>{const gs=poses.map(([y,p])=>levelShadowArea(s,y,p));const hs=gs.map(g=>holes(g));let mx=Math.max(...hs);if(openBottom.has(s.name)){// inner opening at center must be lit, while the enclosing top is shadowed
const g=levelShadowArea(s,0,0);const col=Array.from({length:120},(_,y)=>g[y*120+60]);ok(col.some(Boolean)&&col.some(x=>!x));let rows=0;for(let y=25;y<95;y++)if(!g[y*120+60]&&g[y*120+45]&&g[y*120+75])rows++;ok(rows>3,s.name+' no open arch cavity');
}else ok(mx>=2,s.name+' no projected interior opening '+hs.join(','));ok(gs.some(g=>difference(g,gs[0])>40),s.name+' rotation does not change shadow');apertures[s.name]={maxInteriorPixels:mx,pose:poses[hs.indexOf(mx)]}});

// Execute the actual worker range routine, not a copied implementation.
const vm=require("vm"),worker=read("sw.js"),ctx={self:{addEventListener(){}},Response,AbortController,setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(worker,ctx);
async function at(n,f){try{await f();pass++;console.log("PASS",n)}catch(e){fail++;console.log("FAIL",n,"-",e.message)}}
(async()=>{
const run=async(rg)=>ctx.ranged(new Response("0123456789",{headers:{"content-type":"video/mp4"}}),rg);
for(const [rg,body,cr] of [["bytes=2-5","2345","bytes 2-5/10"],["bytes=7-99","789","bytes 7-9/10"],["bytes=6-","6789","bytes 6-9/10"],["bytes=-3","789","bytes 7-9/10"],["bytes=-99","0123456789","bytes 0-9/10"]])await at(rg+" valid 206",async()=>{const r=await run(rg);ok(r.status===206);ok(r.headers.get("content-range")===cr);ok(await r.text()===body)});
for(const rg of ["bytes=99-9","bytes=8-2","bytes=10-","bytes=-0","bytes=-","bytes=x-2","bytes=1-2,4-5","bytes=999999999999999999999-"])await at(rg+" invalid 416, no illegal 206",async()=>{const r=await run(rg);ok(r.status===416);ok(r.headers.get("content-range")==="bytes */10");ok(await r.text()==="")});
await at("offline seek from cached MP4 tail",async()=>{const bytes=fs.readFileSync(path.join(R,"assets/intro.mp4")),start=bytes.length-4096;const r=await ctx.ranged(new Response(bytes,{headers:{"content-type":"video/mp4"}}),"bytes="+start+"-");ok(r.status===206);ok(Buffer.from(await r.arrayBuffer()).equals(bytes.subarray(start)));ok(r.headers.get("content-range")===`bytes ${start}-${bytes.length-1}/${bytes.length}`)});

await at("SW: open tab stays pinned to its build and keeps its cache; next launch takes pending; cache dropped after close",async()=>{
 const store=new Map(),deletions=[];let failStageWrite=false;const mk=(name)=>{const m=new Map();return {async match(u,o){const k=typeof u==="string"?new URL(u,"https://p.test/g/sw.js").href:u.url;if(m.has(k))return m.get(k).clone();if(o&&o.ignoreSearch){for(const [kk,v] of m)if(kk.split("?")[0]===k.split("?")[0])return v.clone()}},async keys(){return [...m.keys()].map(url=>({url}))},async put(u,r){if(failStageWrite&&name.includes("-staging-"))throw new Error("simulated storage failure");m.set(new URL(typeof u==="string"?u:u.url,"https://p.test/g/sw.js").href,r)}}};
 const caches={async open(n){if(!store.has(n))store.set(n,mk(n));return store.get(n)},async has(n){return store.has(n)},async delete(n){deletions.push(n);return store.delete(n)},async keys(){return [...store.keys()]}};
 let remote="2",open=new Set(),netCalls=0;const L={},statuses=[];
 const SHELLf=read("sw.js").match(/const SHELL=(\[.*?\]);/)[1];
 const fetchF=async(req,o)=>{const u=typeof req==="string"?req:req.url;netCalls++;if(/version\.json/.test(u))return new Response(JSON.stringify({build:remote}));return new Response("build"+remote+":"+u.split("/").pop())};
 class Req{constructor(u,o){this.url=new URL(u,"https://p.test/g/").href;this.mode=(o&&o.mode)||"no-cors";this.method="GET";this.headers=new Map(Object.entries((o&&o.headers)||{}));this.headers.get=this.headers.get.bind(this.headers)}}
 const c2={self:{addEventListener:(n,f)=>L[n]=f,skipWaiting(){},clients:{async matchAll(){return [...open].map(id=>({id,postMessage:msg=>statuses.push(msg.status)}))},async claim(){}}},caches,fetch:fetchF,Request:Req,Response,URL,AbortController,setTimeout,clearTimeout,location:{origin:"https://p.test"}};
 c2.self.self=c2.self;vm.createContext(c2);vm.runInContext(read("sw.js"),c2);
 const ev=(extra)=>{const w=[];let resp;return {e:Object.assign({waitUntil:p=>w.push(p),respondWith:p=>resp=p},extra),done:async()=>{const r=await resp;await Promise.all(w);return r}}};
 const install=ev({});L.install(install.e);await install.done();const act=ev({});L.activate(act.e);await act.done();ok(!statuses.includes("pending-ready"),"first install has no update-ready notice");
 const get=async(url,clientId,nav,result)=>{const x=ev({request:new Req(url,{mode:nav?"navigate":"no-cors"}),clientId:clientId||"",resultingClientId:result||""});L.fetch(x.e);const r=await x.done();return r?await r.text():null};
 open.add("A");ok((await get("index.html",null,true,"A")).startsWith("build2"),"A launches build 2");ok(statuses.includes("current"),"current build status delivered");
 remote="3";const chk=ev({data:"check"});L.message(chk.e);await chk.done();ok(store.has("platocave-v3"),"build 3 downloaded as pending");ok(statuses.includes("checking")&&statuses.includes("pending-ready"),"page notified only after completed pending download");
 ok((await get("game.js?v=9","A")).startsWith("build2"),"A still served build 2 before any relaunch");
 open.add("B");ok((await get("index.html",null,true,"B")).startsWith("build3"),"new launch B takes pending build 3");
 ok(store.has("platocave-v2"),"old cache kept while A is open");ok((await get("assets/intro.mp4","A")).startsWith("build2"),"A never gets build-3 bytes");
 ok((await get("game.js?v=10","A")).startsWith("build2"),"ignoreSearch fallback stays inside A's pinned cache");
 ok((await get("assets/intro.mp4","B")).startsWith("build3"),"B on build 3");
 open.delete("A");open.add("C");await get("index.html",null,true,"C");ok(!store.has("platocave-v2"),"old cache deleted after A closed");
 // Simulate an older v2 worker's manifest-less cache and an unpinned already-playing window.
 open.clear();open.add("LEGACY");const legacy=await caches.open("platocave-v2");
 for(const u of JSON.parse(SHELLf))await legacy.put(u.replace(/([?]v=)\d+$/, "$12"),new Response("legacy2:"+u));
 await c2.setMeta({current:"2"});remote="4";
 const upgrade=ev({});L.install(upgrade.e);await upgrade.done();let meta=await c2.getMeta();
 ok(meta.current==="2"&&meta.pending==="4"&&meta.pins.LEGACY==="2","install pins legacy before pending promotion");
 ok(await c2.complete("2"),"legacy own keys complete");const upgradeAct=ev({});L.activate(upgradeAct.e);await upgradeAct.done();
 ok(store.has("platocave-v2"),"claim/cleanup preserves legacy");ok((await get("game.js?v=2","LEGACY")).startsWith("legacy2:"),"legacy bytes served");
 open.add("NEW");ok((await get("index.html",null,true,"NEW")).startsWith("build4"),"new navigation promotes 4");
 // Rollback download must stage but not replace immutable bytes used by LEGACY.
 const deleteStart=deletions.length;remote="2";await c2.download("2");ok((await get("game.js?v=2","LEGACY")).startsWith("legacy2:"),"rollback never replaces pinned cache");
 const goodFetch=c2.fetch;c2.fetch=async()=>new Response("broken",{status:404});let rejected=false;try{await c2.download("2")}catch(_){rejected=true}
 ok(rejected&&(await get("game.js?v=2","LEGACY")).startsWith("legacy2:"),"failed stage leaves live cache intact");c2.fetch=goodFetch;
 failStageWrite=true;rejected=false;try{await c2.download("2")}catch(_){rejected=true}failStageWrite=false;
 ok(rejected&&(await get("game.js?v=2","LEGACY")).startsWith("legacy2:"),"storage failure in staging preserves live target");
 ok(!deletions.slice(deleteStart).includes("platocave-v2"),"live target never deleted during success, network failure or storage failure");
 ok(!(await caches.keys()).some(k=>k.includes("staging")),"no leaked staging caches");
 open.delete("LEGACY");await c2.withMeta(c2.cleanup);ok(!store.has("platocave-v2"),"legacy cache reclaimed only after close");
 // Restore working build 3 so the pre-existing failure regression stays meaningful.
 remote="3";await c2.download("3");await c2.setMeta({current:"3"});open.clear();open.add("D");await c2.withMeta(c2.cleanup);
 remote="4";const before=[...store.keys()].sort().join();const bad=c2.fetch;c2.fetch=async(u)=>{if(/version/.test(typeof u==="string"?u:u.url))return new Response(JSON.stringify({build:"4"}));return new Response("x",{status:404})};
 const chk2=ev({data:"check"});L.message(chk2.e);await chk2.done();ok(!store.has("platocave-v4"),"broken update fails silently, all-or-nothing");ok(statuses.includes("failed"),"page notified about failed update");
 ok((await get("index.html",null,true,"D")).startsWith("build3"),"still the working build")});
console.log(pass+" passed, "+fail+" failed");process.exit(fail?1:0);
})();
