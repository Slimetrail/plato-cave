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
function shadowArea(s,yaw){const v=S.pose(s.mesh,yaw||0.18,0.12),L=[0.15,-0.35,5.2],sh=S.castShadow(v,s.mesh.f,L);
 // rasterize union of projected triangles on a grid
 const N=120,G=new Uint8Array(N*N),X=3.2;for(const f of sh.tris){const [a,b,c]=f.map(i=>sh.points[i]);const lo=[Math.min(a[0],b[0],c[0]),Math.min(a[1],b[1],c[1])],hi=[Math.max(a[0],b[0],c[0]),Math.max(a[1],b[1],c[1])];
  for(let gx=Math.max(0,Math.floor((lo[0]+X)/(2*X)*N));gx<=Math.min(N-1,Math.ceil((hi[0]+X)/(2*X)*N));gx++)for(let gy=Math.max(0,Math.floor((lo[1]+X)/(2*X)*N));gy<=Math.min(N-1,Math.ceil((hi[1]+X)/(2*X)*N));gy++){const p=[(gx+0.5)/N*2*X-X,(gy+0.5)/N*2*X-X];
   const d=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]),d1=d(p,a,b),d2=d(p,b,c),d3=d(p,c,a);if(!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0)))G[gy*N+gx]=1}}return G}
t("shadow is cast from the same mesh by the light (every vertex on the light ray, on the wall)",()=>{const L=[0.15,-0.35,5.2];for(const s of S.SHAPES){const v=S.pose(s.mesh,0.3,0.1),sh=S.castShadow(v,s.mesh.f,L);
 ok(sh.tris===s.mesh.f,"faces reused");ok(sh.points.length===v.length);for(let i=0;i<v.length;i+=7){const p=v[i],q=[sh.points[i][0],sh.points[i][1],S.WALL_Z];
  const a=[p[0]-L[0],p[1]-L[1],p[2]-L[2]],b=[q[0]-L[0],q[1]-L[1],q[2]-L[2]],c=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];ok(Math.hypot(...c)<1e-6*Math.hypot(...b)*Math.hypot(...a)+1e-9,s.name+" not collinear")}}});
t("shadow changes when the mesh changes (not a fixed blob); all 50 silhouettes differ",()=>{const gs=S.SHAPES.map(s=>shadowArea(s));for(let i=0;i<50;i++){let n=0;for(const x of gs[i])n+=x;ok(n>150,S.SHAPES[i].name+" tiny shadow "+n);
  for(let j=0;j<i;j++){let d=0;for(let k=0;k<gs[i].length;k++)d+=gs[i][k]!==gs[j][k];ok(d>40,S.SHAPES[i].name+" vs "+S.SHAPES[j].name+" too similar ("+d+")")}}});
t("guess matching: case/space/article tolerant, wrong rejected, empty rejected",()=>{const b=S.SHAPES[0],c=S.SHAPES[1];ok(S.isCorrect(b,"  Ball "));ok(S.isCorrect(b,"a ball"));ok(S.isCorrect(b,"Sphere"));ok(S.isCorrect(c,"box"));ok(S.isCorrect(c,"cubes"));ok(!S.isCorrect(b,"cube"));ok(!S.isCorrect(b,""));ok(!S.isCorrect(b,"   "))});
const game=read("game.js");
t("scoring: +100 on correct, no points + original SFX on wrong",()=>{ok(/if\(ok\)\{score\+=100/.test(game));ok(/else\{PlatoSfx\.wrong\(\)/.test(game));const sfx=read("sfx.js");ok(/createOscillator/.test(sfx)&&!/\.(mp3|wav|ogg)/.test(sfx),"sfx must be synthesized")});
t("no ads / trackers / CDN",()=>{for(const f of ["index.html","game.js","shapes.js","sfx.js","sw.js","style.css","manifest.webmanifest"]){const s=read(f).toLowerCase();for(const bad of ["adsbygoogle","adsense","doubleclick","googletagmanager","google-analytics","gtag(","admob","applovin","unityads","facebook.net","cdn.","https://","http://"])ok(!s.includes(bad),f+" has "+bad)}});
t("service worker caches every bundled asset and they exist",()=>{const sw=read("sw.js");const list=JSON.parse(sw.match(/const SHELL=(\[.*?\]);/)[1]);
 for(const a of ["assets/intro.mp4","assets/intro-music.mp3","assets/cave-wall.jpg","game.js?v=1","shapes.js?v=1","sfx.js?v=1","style.css?v=1","index.html"])ok(list.includes(a),a);
 for(const a of list)if(a!=="./")ok(fs.existsSync(path.join(R,a.split("?")[0])),"missing "+a);const html=read("index.html");for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))ok(list.includes(m[1])||m[1].startsWith("icons/")&&list.includes(m[1])||m[1]==="manifest.webmanifest","uncached "+m[1])});
t("update path: version.json never cached, pending build, silent fail",()=>{const sw=read("sw.js");ok(/cache:"no-store"/.test(sw));ok(!/"version\.json"\s*[,\]]/.test(sw.match(/const SHELL=(\[.*?\]);/)[1]));ok(/pending/.test(sw)&&/silent/.test(sw));ok(JSON.parse(read("version.json")).build)});
t("manifest standalone/fullscreen",()=>{const m=JSON.parse(read("manifest.webmanifest"));ok(m.display==="fullscreen"&&m.display_override.includes("standalone"))});
t("intro holds on frozen title until tap; tap starts game; no preview disclaimer",()=>{ok(/addEventListener\("ended",toHold\)/.test(game));ok(/introState==="hold"\)endIntro\(\)/.test(game));ok(/function endIntro\(\)\{[^}]*startGame\(\)/.test(game));
 const all=(read("index.html")+game).toLowerCase();ok(!all.includes("not included"))});
t("music referenced, looped through the hold, starts with playback",()=>{const html=read("index.html");ok(/<audio id="introMusic" src="assets\/intro-music\.mp3"[^>]*loop/.test(html));ok(/<video id="introVideo" src="assets\/intro\.mp4"[^>]*muted/.test(html));ok(/video\.play\(\)[\s\S]{0,80}music\.play\(\)/.test(game))});
console.log(pass+" passed, "+fail+" failed");process.exit(fail?1:0);
