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
t("scoring: +100 on correct, no points + original SFX on wrong",()=>{ok(/if\(ok\)\{score\+=100/.test(game));ok(/else\{PlatoSfx\.wrong\(\)/.test(game));const sfx=read("sfx.js");ok(/createOscillator/.test(sfx)&&!/\.(mp3|wav|ogg)/.test(sfx),"sfx must be synthesized")});
t("no ads / trackers / CDN",()=>{for(const f of ["index.html","game.js","shapes.js","sfx.js","sw.js","style.css","manifest.webmanifest"]){const s=read(f).toLowerCase();for(const bad of ["adsbygoogle","adsense","doubleclick","googletagmanager","google-analytics","gtag(","admob","applovin","unityads","facebook.net","cdn.","https://","http://"])ok(!s.includes(bad),f+" has "+bad)}});
t("service worker caches every bundled asset and they exist",()=>{const sw=read("sw.js");const list=JSON.parse(sw.match(/const SHELL=(\[.*?\]);/)[1]);
 for(const a of ["assets/intro.mp4","assets/intro-music.mp3","assets/cave-wall.jpg","game.js?v=3","shapes.js?v=3","sfx.js?v=1","style.css?v=2","index.html"])ok(list.includes(a),a);
 for(const a of list)if(a!=="./")ok(fs.existsSync(path.join(R,a.split("?")[0])),"missing "+a);const html=read("index.html");for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))ok(list.includes(m[1])||m[1].startsWith("icons/")&&list.includes(m[1])||m[1]==="manifest.webmanifest","uncached "+m[1])});
t("update path: version.json never cached, pending build, silent fail",()=>{const sw=read("sw.js");ok(/cache:"no-store"/.test(sw));ok(!/"version\.json"\s*[,\]]/.test(sw.match(/const SHELL=(\[.*?\]);/)[1]));ok(/pending/.test(sw)&&/silent/.test(sw));ok(JSON.parse(read("version.json")).build)});
t("manifest standalone/fullscreen",()=>{const m=JSON.parse(read("manifest.webmanifest"));ok(m.display==="fullscreen"&&m.display_override.includes("standalone"))});
t("title is tappable before ended, held only with decoded title",()=>{ok(/addEventListener\("ended",toHold\)/.test(game));ok(/if\(titleReady\|\|introState==="hold"\)endIntro\(\)/.test(game));ok(/video.currentTime<TITLE_TIME\|\|video.readyState<2/.test(game));ok(/requestVideoFrameCallback/.test(game)&&/addEventListener\("seeked"/.test(game));ok(/function endIntro\(\)\{[^}]*startGame\(\)/.test(game));ok(!(read("index.html")+game).toLowerCase().includes("not included"))});
t("music loops through hold, rejection remembered and gesture retried",()=>{const html=read("index.html");ok(/<audio id="introMusic" src="assets\/intro-music\.mp3"[^>]*loop/.test(html));ok(/<video id="introVideo" src="assets\/intro\.mp4"[^>]*muted/.test(html));ok(/video\.play\(\)[\s\S]{0,200}retryMusic\(\)/.test(game));ok(/musicNeedsUnlock=true/.test(game));ok(/addEventListener\("pointerdown",retryMusic\)/.test(game))});
t("visual viewport offset, size and scroll position all game controls",()=>{for(const term of ["vv.width","vv.height","vv.offsetLeft","vv.offsetTop",'addEventListener("scroll",resize)','$("bar").style.top','$("msg").style','$("hud").style'])ok(game.includes(term),term)});
for(const name of ["arrow","egg","ice cream","hourglass","axe","umbrella","anchor"])t("an "+name,()=>ok(S.article(name)==="an"));
for(const name of ["ball","cube","house","heart","tower"])t("a "+name,()=>ok(S.article(name)==="a"));
t("wooden eagle is volumetric and accepted",()=>{const bird=S.SHAPES.find(s=>s.name==="bird");ok(bird.mesh.f.length>500);ok(S.isCorrect(bird,"wooden eagle"));ok(S.isCorrect(bird,"eagle"))});
t("cone and pyramid have distinct projected bases throughout animation",()=>{const c=S.SHAPES[2],p=S.SHAPES[4];for(const time of [0,1000,4000,8000]){const cv=S.displayPose(c,time),pv=S.displayPose(p,time);ok(Math.max(...cv.map(v=>v[1]))>0);ok(JSON.stringify(cv)!==JSON.stringify(pv))}});

t("version bumped to build 3 with cache-busted changed scripts",()=>{ok(JSON.parse(read("version.json")).build==="3");const html=read("index.html");ok(html.includes('src="game.js?v=3"')&&html.includes('src="shapes.js?v=3"')&&html.includes('src="sfx.js?v=1"'))});
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
  setTimeout:(f)=>{timers.set(++tid,f);return tid},clearTimeout:id=>timers.delete(id),requestAnimationFrame:f=>f(),Number,Math,Promise};
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
 // and the deferred path also clears a previous timer
 video.readyState=4;api.trySkip();const before=timers.size;video.seekable={length:0,end:()=>0};api.trySkip();ok(before===1&&timers.size===0,"deferring clears the old fallback")});
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
t("SW update path keeps Shark pattern and adds session pins",()=>{const sw=read("sw.js");ok(/cache:"no-store"/.test(sw)&&/all-or-nothing/.test(sw)&&/silent/.test(sw)&&/m2\.pending=b/.test(sw));
 ok(/resultingClientId/.test(sw)&&/clients\.matchAll/.test(sw)&&/pins/.test(sw));ok(/c\.match\(r\.url\)\|\|await c\.match\(r\.url,\{ignoreSearch:true\}\)/.test(sw),"exact first")});
// Execute the actual worker range routine, not a copied implementation.
const vm=require("vm"),worker=read("sw.js"),ctx={self:{addEventListener(){}},Response,AbortController,setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(worker,ctx);
async function at(n,f){try{await f();pass++;console.log("PASS",n)}catch(e){fail++;console.log("FAIL",n,"-",e.message)}}
(async()=>{
const run=async(rg)=>ctx.ranged(new Response("0123456789",{headers:{"content-type":"video/mp4"}}),rg);
for(const [rg,body,cr] of [["bytes=2-5","2345","bytes 2-5/10"],["bytes=7-99","789","bytes 7-9/10"],["bytes=6-","6789","bytes 6-9/10"],["bytes=-3","789","bytes 7-9/10"],["bytes=-99","0123456789","bytes 0-9/10"]])await at(rg+" valid 206",async()=>{const r=await run(rg);ok(r.status===206);ok(r.headers.get("content-range")===cr);ok(await r.text()===body)});
for(const rg of ["bytes=99-9","bytes=8-2","bytes=10-","bytes=-0","bytes=-","bytes=x-2","bytes=1-2,4-5","bytes=999999999999999999999-"])await at(rg+" invalid 416, no illegal 206",async()=>{const r=await run(rg);ok(r.status===416);ok(r.headers.get("content-range")==="bytes */10");ok(await r.text()==="")});
await at("offline seek from cached MP4 tail",async()=>{const bytes=fs.readFileSync(path.join(R,"assets/intro.mp4")),start=bytes.length-4096;const r=await ctx.ranged(new Response(bytes,{headers:{"content-type":"video/mp4"}}),"bytes="+start+"-");ok(r.status===206);ok(Buffer.from(await r.arrayBuffer()).equals(bytes.subarray(start)));ok(r.headers.get("content-range")===`bytes ${start}-${bytes.length-1}/${bytes.length}`)});

await at("SW: open tab stays pinned to its build and keeps its cache; next launch takes pending; cache dropped after close",async()=>{
 const store=new Map();const mk=()=>{const m=new Map();return {async match(u,o){const k=typeof u==="string"?new URL(u,"https://p.test/g/sw.js").href:u.url;if(m.has(k))return m.get(k).clone();if(o&&o.ignoreSearch){for(const [kk,v] of m)if(kk.split("?")[0]===k.split("?")[0])return v.clone()}},async put(u,r){m.set(new URL(u,"https://p.test/g/sw.js").href,r)}}};
 const caches={async open(n){if(!store.has(n))store.set(n,mk());return store.get(n)},async has(n){return store.has(n)},async delete(n){return store.delete(n)},async keys(){return [...store.keys()]}};
 let remote="2",open=new Set(),netCalls=0;const L={};
 const SHELLf=read("sw.js").match(/const SHELL=(\[.*?\]);/)[1];
 const fetchF=async(req,o)=>{const u=typeof req==="string"?req:req.url;netCalls++;if(/version\.json/.test(u))return new Response(JSON.stringify({build:remote}));return new Response("build"+remote+":"+u.split("/").pop())};
 class Req{constructor(u,o){this.url=new URL(u,"https://p.test/g/").href;this.mode=(o&&o.mode)||"no-cors";this.method="GET";this.headers=new Map(Object.entries((o&&o.headers)||{}));this.headers.get=this.headers.get.bind(this.headers)}}
 const c2={self:{addEventListener:(n,f)=>L[n]=f,skipWaiting(){},clients:{async matchAll(){return [...open].map(id=>({id}))},async claim(){}}},caches,fetch:fetchF,Request:Req,Response,URL,AbortController,setTimeout,clearTimeout,location:{origin:"https://p.test"}};
 c2.self.self=c2.self;vm.createContext(c2);vm.runInContext(read("sw.js"),c2);
 const ev=(extra)=>{const w=[];let resp;return {e:Object.assign({waitUntil:p=>w.push(p),respondWith:p=>resp=p},extra),done:async()=>{const r=await resp;await Promise.all(w);return r}}};
 const install=ev({});L.install(install.e);await install.done();const act=ev({});L.activate(act.e);await act.done();
 const get=async(url,clientId,nav,result)=>{const x=ev({request:new Req(url,{mode:nav?"navigate":"no-cors"}),clientId:clientId||"",resultingClientId:result||""});L.fetch(x.e);const r=await x.done();return r?await r.text():null};
 open.add("A");ok((await get("index.html",null,true,"A")).startsWith("build2"),"A launches build 2");
 remote="3";const chk=ev({data:"check"});L.message(chk.e);await chk.done();ok(store.has("platocave-v3"),"build 3 downloaded as pending");
 ok((await get("game.js?v=3","A")).startsWith("build2"),"A still served build 2 before any relaunch");
 open.add("B");ok((await get("index.html",null,true,"B")).startsWith("build3"),"new launch B takes pending build 3");
 ok(store.has("platocave-v2"),"old cache kept while A is open");ok((await get("assets/intro.mp4","A")).startsWith("build2"),"A never gets build-3 bytes");
 ok((await get("game.js?v=9","A")).startsWith("build2"),"ignoreSearch fallback stays inside A's pinned cache");
 ok((await get("assets/intro.mp4","B")).startsWith("build3"),"B on build 3");
 open.delete("A");open.add("C");await get("index.html",null,true,"C");ok(!store.has("platocave-v2"),"old cache deleted after A closed");
 remote="4";const before=[...store.keys()].sort().join();const bad=c2.fetch;c2.fetch=async(u)=>{if(/version/.test(typeof u==="string"?u:u.url))return new Response(JSON.stringify({build:"4"}));return new Response("x",{status:404})};
 const chk2=ev({data:"check"});L.message(chk2.e);await chk2.done();ok(!store.has("platocave-v4"),"broken update fails silently, all-or-nothing");
 ok((await get("index.html",null,true,"D")).startsWith("build3"),"still the working build")});
console.log(pass+" passed, "+fail+" failed");process.exit(fail?1:0);
})();
