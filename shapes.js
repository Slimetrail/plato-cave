// Plato's Cave - 50 original procedural 3D shapes. Every shadow is cast from the SAME mesh by a point light (the fire)
// projected onto the wall plane. Works in the browser and in node (for tests).
(function(root){
"use strict";
const PI=Math.PI;
function M(v,f){return {v:v,f:f}}
// m.t (optional) = per-face material part index, kept through merge/xf/fit so the reveal can paint
// different substances (wafer vs cream, iron head vs wooden handle) on ONE mesh. Shadows ignore it.
function merge(){const v=[],f=[],t=[];for(const m of arguments){const o=v.length;for(const p of m.v)v.push(p.slice());m.f.forEach((q,i)=>{f.push([q[0]+o,q[1]+o,q[2]+o]);t.push(m.t?m.t[i]:0)})}const r=M(v,f);if(t.some(x=>x))r.t=t;return r}
function tag(m,k){m.t=m.f.map(()=>k);return m}
function rotX(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c]}
function rotY(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c]}
function rotZ(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]]}
function xf(m,o){o=o||{};const s=o.s===undefined?[1,1,1]:(typeof o.s==="number"?[o.s,o.s,o.s]:o.s),r=o.r||[0,0,0],t=o.t||[0,0,0];
 return keepT(m,M(m.v.map(p=>{let q=[p[0]*s[0],p[1]*s[1],p[2]*s[2]];q=rotX(q,r[0]);q=rotY(q,r[1]);q=rotZ(q,r[2]);return [q[0]+t[0],q[1]+t[1],q[2]+t[2]]}),m.f.map(x=>x.slice())))}
function keepT(a,b){if(a.t)b.t=a.t.slice();return b}
function area2(p){let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1]}return a/2}
function inTri(p,a,b,c){const d=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]);const d1=d(p,a,b),d2=d(p,b,c),d3=d(p,c,a);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0))}
function earcut(pts){const idx=pts.map((_,i)=>i),out=[];let guard=0;
 while(idx.length>3&&guard++<5000){let cut=false;for(let i=0;i<idx.length;i++){const a=pts[idx[(i+idx.length-1)%idx.length]],b=pts[idx[i]],c=pts[idx[(i+1)%idx.length]];
  if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<=1e-12)continue;let ok=true;
  for(const j of idx){const p=pts[j];if(p===a||p===b||p===c)continue;if(inTri(p,a,b,c)){ok=false;break}}
  if(ok){out.push([idx[(i+idx.length-1)%idx.length],idx[i],idx[(i+1)%idx.length]]);idx.splice(i,1);cut=true;break}}if(!cut)break}
 if(idx.length===3)out.push([idx[0],idx[1],idx[2]]);return out}
function extrude(pts,d){d=d===undefined?0.35:d;if(area2(pts)<0)pts=pts.slice().reverse();const n=pts.length,v=[],f=[];
 for(const p of pts)v.push([p[0],p[1],d/2]);for(const p of pts)v.push([p[0],p[1],-d/2]);
 for(const t of earcut(pts)){f.push([t[0],t[1],t[2]]);f.push([t[2]+n,t[1]+n,t[0]+n])}
 for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,i+n,j+n]);f.push([i,j+n,j])}return M(v,f)}
function lathe(prof,seg){seg=seg||24;const v=[],f=[],n=prof.length;for(let k=0;k<seg;k++){const a=2*PI*k/seg;for(const p of prof)v.push([p[0]*Math.cos(a),p[1],p[0]*Math.sin(a)])}
 for(let k=0;k<seg;k++){const k2=(k+1)%seg;for(let i=0;i<n-1;i++){const a=k*n+i,b=k*n+i+1,c=k2*n+i+1,e=k2*n+i;f.push([a,c,b]);f.push([a,e,c])}}return M(v,f)}
function circ(n,r,cx,cy,a0,a1){cx=cx||0;cy=cy||0;a0=a0||0;a1=a1===undefined?2*PI:a1;const o=[];const full=Math.abs(a1-a0-2*PI)<1e-9;const m=full?n:n+1;for(let i=0;i<m;i++){const a=a0+(a1-a0)*i/n;o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}return o}
function sphere(r,seg){r=r||1;const p=[];for(let i=0;i<=12;i++){const t=PI*i/12;p.push([r*Math.sin(t),-r*Math.cos(t)])}return lathe(p,seg||24)}
function cyl(r,h,seg){return lathe([[0,-h/2],[r,-h/2],[r,h/2],[0,h/2]],seg||24)}
function cone(r,h,seg){return lathe([[0,-h/2],[r,-h/2],[0,h/2]],seg||24)}
function box(w,h,d){return extrude([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],d)}
function torus(R,r,a,b){a=a||28;b=b||12;const v=[],f=[];for(let i=0;i<a;i++){const u=2*PI*i/a;for(let j=0;j<b;j++){const w=2*PI*j/b;v.push([(R+r*Math.cos(w))*Math.cos(u),(R+r*Math.cos(w))*Math.sin(u),r*Math.sin(w)])}}
 for(let i=0;i<a;i++)for(let j=0;j<b;j++){const i2=(i+1)%a,j2=(j+1)%b,p=i*b+j,q=i2*b+j,s=i2*b+j2,t=i*b+j2;f.push([p,q,s]);f.push([p,s,t])}return M(v,f)}
function star(n,r1,r2){const o=[];for(let i=0;i<2*n;i++){const a=PI/2+PI*i/n,r=i%2?r2:r1;o.push([r*Math.cos(a),r*Math.sin(a)])}return o}
function heart(){const o=[];for(let i=0;i<48;i++){const t=2*PI*i/48;o.push([16*Math.pow(Math.sin(t),3)/16,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16])}return o}
// Rounded relief carving: inset rings give the wings real volume, not a flat bird cutout.
function relief(poly,depth){const cx=poly.reduce((a,p)=>a+p[0],0)/poly.length,cy=poly.reduce((a,p)=>a+p[1],0)/poly.length,n=poly.length,v=[],f=[];
 for(const [scale,z] of [[0.88,-depth/2],[1,0],[0.88,depth/2]])for(const p of poly)v.push([cx+(p[0]-cx)*scale,cy+(p[1]-cy)*scale,z]);
 for(let r=0;r<2;r++)for(let i=0;i<n;i++){const j=(i+1)%n,a=r*n+i,b=r*n+j;f.push([a,b,b+n],[a,b+n,a+n])}
 for(const t of earcut(area2(poly)>0?poly:poly.slice().reverse())){f.push(t.map(i=>i+2*n));f.push(t.slice().reverse())}return M(v,f)}
function eagle(){const wing=[[0.16,0.30],[0.55,0.68],[1.65,0.88],[1.59,0.68],[1.43,0.53],[1.49,0.52],[1.28,0.33],[1.13,0.24],[1.17,0.23],[0.91,0.04],[0.52,-0.09],[0.18,-0.16]];
 const right=relief(wing.slice().reverse(),0.24),left=xf(right,{s:[-1,1,1]});
 const body=xf(lathe([[0,-0.62],[0.25,-0.58],[0.22,-0.25],[0.29,0.15],[0.25,0.55],[0.18,0.76],[0,0.83]],32),{s:[1,1,0.86],t:[0,0,0.07]});
 const head=xf(sphere(1,24),{s:[0.20,0.26,0.21],t:[-0.025,0.78,0.08]});
 const beak=xf(relief([[-0.13,0.85],[-0.37,0.77],[-0.29,0.63],[-0.20,0.74]],0.18),{t:[0,0,0.10]});
 const tail=relief([[-0.18,-0.32],[-0.36,-0.86],[-0.16,-0.91],[0,-0.89],[0.16,-0.91],[0.36,-0.86],[0.18,-0.32]].reverse(),0.24);
 return merge(right,left,tail,body,head,beak)}
// Ice cream: ridged waffle cone (part 0) + an overhanging, rippled cream scoop with a melt drip (part 1).
function icecream(){const prof=[[0,-1.25]];for(let i=1;i<=12;i++){const y=-1.25+i*0.105,r=0.55*(i/12);prof.push([r+(i%2?0.035:0),y])}prof.push([0.6,0.05],[0,0.05]);
 const wafer=lathe(prof,24),sp=[];for(let i=0;i<=12;i++){const a=PI*i/12;sp.push([0.74*Math.sin(a),-0.7*Math.cos(a)])}
 const scoop=lathe(sp,28);scoop.v=scoop.v.map(p=>{const a=Math.atan2(p[2],p[0]),w=p[1]<-0.2?1+0.09*Math.sin(a*7):1;return [p[0]*w,p[1]+0.62,p[2]*w]});
 const lip=xf(torus(0.66,0.13,28,10),{r:[PI/2,0,0],t:[0,0.1,0]});lip.v=lip.v.map(p=>{const a=Math.atan2(p[2],p[0]);return [p[0],p[1]+0.05*Math.sin(a*6),p[2]]});
 const drip=xf(sphere(1,12),{s:[0.11,0.2,0.11],t:[0.42,-0.12,0.32]});
 return merge(wafer,tag(scoop,1),tag(lip,1),tag(drip,1))}
// [name, aliases, builder, sway] - ordered easy to hard (Jeremy: start with a ball and a cube)
const DEFS=[
["ball",["sphere","orb","globe"],()=>sphere(1)],
["cube",["box","block","square"],()=>box(1.6,1.6,1.6),1],
["cone",["traffic cone"],()=>cone(1,2)],
["cylinder",["can","tube","drum"],()=>cyl(0.8,1.8)],
["pyramid",["triangle"],()=>xf(lathe([[0,-0.8],[1.1,-0.8],[0,0.9]],4),{r:[0,PI/4,0]}),1],
["donut",["ring","torus","doughnut"],()=>torus(0.9,0.38)],
["star",["starfish"],()=>extrude(star(5,1.2,0.5))],
["heart",["love"],()=>extrude(heart())],
["diamond",["gem","octahedron","crystal"],()=>lathe([[0,-1.2],[0.8,0.2],[0.5,0.6],[0,0.6]],8)],
["moon",["crescent","crescent moon"],()=>{const o=circ(20,1,0,0,PI/3,5*PI/3),e=[];for(let i=1;i<20;i++){const a=-PI/2-PI*i/20;e.push([0.5+0.8*Math.cos(a),0.866*Math.sin(a)])}return extrude(o.concat(e).reverse())}],
["cross",["plus","plus sign"],()=>extrude([[-0.3,-1],[0.3,-1],[0.3,-0.3],[1,-0.3],[1,0.3],[0.3,0.3],[0.3,1],[-0.3,1],[-0.3,0.3],[-1,0.3],[-1,-0.3],[-0.3,-0.3]])],
["arrow",[],()=>extrude([[-1.2,-0.25],[0.3,-0.25],[0.3,-0.65],[1.2,0],[0.3,0.65],[0.3,0.25],[-1.2,0.25]])],
["egg",[],()=>{const p=[];for(let i=0;i<=14;i++){const t=PI*i/14;p.push([0.75*Math.sin(t)*(1-0.12*Math.cos(t)),-1.05*Math.cos(t)])}return lathe(p)}],
["triangle prism",["prism","triangular prism","wedge"],()=>xf(extrude([[-1,-0.8],[1,-0.8],[0,0.9]],1.2),{r:[0,0.5,0]}),1],
["hexagon",["hexagon prism","hex","hexagonal prism","nut"],()=>extrude(circ(6,1),0.5)],
["house",["home","hut"],()=>merge(extrude([[-1,-1],[1,-1],[1,0.2],[0,1.1],[-1,0.2]]),xf(box(0.3,0.6,0.3),{t:[0.55,0.75,0]}))],
["tree",["pine","pine tree","christmas tree"],()=>merge(cone(0.9,1.2),xf(cone(0.7,1),{t:[0,0.65,0]}),tag(xf(cyl(0.2,0.6),{t:[0,-0.85,0]}),1))],
["mushroom",["toadstool"],()=>merge(lathe([[0,0.2],[1.1,0.2],[0.9,0.6],[0.5,0.9],[0,1]]),tag(cyl(0.3,1.4),1))],
["snowman",["snow man"],()=>merge(xf(sphere(0.8),{t:[0,-0.8,0]}),xf(sphere(0.55),{t:[0,0.3,0]}),xf(sphere(0.38),{t:[0,1.1,0]}))],
["lollipop",["lolly","sucker","candy"],()=>merge(xf(cyl(0.75,0.25),{r:[PI/2,0,0],t:[0,0.6,0]}),tag(xf(cyl(0.08,1.8),{t:[0,-0.7,0]}),1)),1],
["ice cream",["ice cream cone","icecream","cone of ice cream"],icecream],
["bell",[],()=>lathe([[0,1],[0.18,1],[0.28,0.85],[0.35,0.5],[0.45,0],[0.65,-0.5],[0.9,-0.8],[0.95,-0.9],[0,-0.9]])],
["bottle",[],()=>lathe([[0,-1.2],[0.6,-1.2],[0.6,0.1],[0.25,0.6],[0.22,1.1],[0.28,1.2],[0,1.2]])],
["vase",["pot","jar","urn"],()=>lathe([[0,-1],[0.45,-1],[0.85,-0.4],[0.8,0.2],[0.4,0.7],[0.6,1.05],[0,1.05]])],
["cup",["mug"],()=>merge(lathe([[0,-0.8],[0.6,-0.8],[0.65,0.8],[0,0.8]]),xf(torus(0.38,0.09,20,8),{t:[0.7,0,0]})),1],
["dumbbell",["weight","barbell"],()=>merge(xf(cyl(0.12,1.8),{r:[0,0,PI/2]}),xf(sphere(0.5),{t:[-1,0,0]}),xf(sphere(0.5),{t:[1,0,0]}))],
["hourglass",["sand timer","egg timer"],()=>lathe([[0,-1.2],[0.8,-1.2],[0.75,-1],[0.12,0],[0.75,1],[0.8,1.2],[0,1.2]])],
["candle",[],()=>merge(cyl(0.35,1.6),tag(xf(lathe([[0,-0.2],[0.18,0],[0,0.45]]),{t:[0,1,0]}),1),tag(xf(cyl(0.03,0.2),{t:[0,0.85,0]}),2))],
["table",["desk"],()=>merge(box(2,0.15,0.8),xf(box(0.15,1,0.15),{t:[-0.85,-0.55,0]}),xf(box(0.15,1,0.15),{t:[0.85,-0.55,0]})),1],
["chair",["seat","stool"],()=>merge(box(1,0.12,0.9),xf(box(0.12,1,0.12),{t:[-0.44,-0.55,0]}),xf(box(0.12,1,0.12),{t:[0.44,-0.55,0]}),xf(box(0.12,1.1,0.9),{t:[-0.44,0.6,0]})),1],
["ladder",[],()=>{const ms=[xf(box(0.12,2.4,0.12),{t:[-0.5,0,0]}),xf(box(0.12,2.4,0.12),{t:[0.5,0,0]})];for(let i=0;i<5;i++)ms.push(xf(box(1,0.1,0.1),{t:[0,-0.9+i*0.45,0]}));return merge.apply(null,ms)},1],
["key",[],()=>merge(xf(torus(0.38,0.12,20,8),{t:[-0.9,0,0]}),xf(box(1.6,0.18,0.15),{t:[0.2,0,0]}),xf(box(0.15,0.4,0.15),{t:[0.8,-0.25,0]}),xf(box(0.15,0.3,0.15),{t:[0.5,-0.2,0]})),1],
["hammer",["mallet"],()=>merge(tag(xf(box(0.2,2,0.2),{t:[0,-0.3,0]}),1),xf(extrude([[-0.9,0.65],[0.5,0.65],[0.5,1.15],[-0.7,1.15],[-0.9,1.0]],0.4),{})),1],
["sword",["blade","knife"],()=>extrude([[-0.08,-1.3],[0.08,-1.3],[0.08,-0.8],[0.45,-0.8],[0.45,-0.65],[0.15,-0.65],[0.15,1.0],[0,1.35],[-0.15,1.0],[-0.15,-0.65],[-0.45,-0.65],[-0.45,-0.8],[-0.08,-0.8]],0.15)],
["axe",["ax","hatchet"],()=>merge(tag(xf(box(0.18,2.2,0.18),{}),1),extrude([[0.05,0.3],[0.8,0.1],[0.95,0.6],[0.8,1.1],[0.05,0.9]],0.12)),1],
["umbrella",["parasol"],()=>{const p=[];for(let i=0;i<=10;i++){const t=PI/2*i/10;p.push([1.2*Math.sin(t),0.9*Math.cos(t)-0.1])}p.push([0,-0.1]);const hook=[];for(let i=0;i<=10;i++){const a=PI+PI*i/10;hook.push([0.2+0.2*Math.cos(a),-1.1+0.2*Math.sin(a)])}for(let i=10;i>=0;i--){const a=PI+PI*i/10;hook.push([0.2+0.32*Math.cos(a),-1.1+0.32*Math.sin(a)])}
  return merge(lathe(p),tag(xf(cyl(0.05,1.1),{t:[0,-0.55,0]}),1),tag(extrude(hook,0.1),1))}],
["fish",[],()=>extrude([[1.2,0],[0.9,0.35],[0.3,0.55],[-0.3,0.4],[-0.75,0.05],[-1.2,0.5],[-1.05,0],[-1.2,-0.5],[-0.75,-0.05],[-0.3,-0.4],[0.3,-0.55],[0.9,-0.35]])],
["bird",["dove","seagull","pigeon","eagle","carved eagle","wooden eagle"],eagle],
["boat",["ship","sailboat","sail boat"],()=>merge(extrude([[-1.3,-0.4],[1.3,-0.4],[0.9,-0.9],[-0.9,-0.9]],0.6),xf(box(0.08,1.8,0.08),{t:[0,0.5,0]}),tag(extrude([[0.08,-0.2],[1,-0.2],[0.08,1.3]],0.05),1)),1],
["car",["auto","automobile"],()=>merge(extrude([[-1.3,-0.3],[1.3,-0.3],[1.3,0.15],[0.6,0.2],[0.3,0.7],[-0.6,0.7],[-0.9,0.2],[-1.3,0.15]],0.8),xf(cyl(0.3,0.9),{r:[PI/2,0,0],t:[-0.75,-0.35,0]}),xf(cyl(0.3,0.9),{r:[PI/2,0,0],t:[0.75,-0.35,0]})),1],
["rocket",["rocket ship","spaceship"],()=>merge(lathe([[0,-1],[0.4,-1],[0.45,0.2],[0.3,0.8],[0,1.3]]),extrude([[0.4,-1.1],[0.85,-1.3],[0.4,-0.3]],0.08),extrude([[-0.4,-1.1],[-0.4,-0.3],[-0.85,-1.3]],0.08))],
["lightning",["lightning bolt","bolt","thunderbolt","thunder"],()=>extrude([[0.2,1.3],[-0.6,0],[0,0],[-0.4,-1.3],[0.7,0.25],[0.1,0.25],[0.6,1.3]].reverse())],
["crown",[],()=>extrude([[-1,-0.6],[1,-0.6],[1,0.7],[0.6,0.15],[0.3,0.8],[0,0.2],[-0.3,0.8],[-0.6,0.15],[-1,0.7]])],
["letter t",["t"],()=>extrude([[-0.2,-1.1],[0.2,-1.1],[0.2,0.7],[1,0.7],[1,1.1],[-1,1.1],[-1,0.7],[-0.2,0.7]])],
["letter l",["l"],()=>extrude([[-0.6,-1.1],[0.8,-1.1],[0.8,-0.7],[-0.2,-0.7],[-0.2,1.1],[-0.6,1.1]])],
["letter h",["h"],()=>extrude([[-0.9,-1.1],[-0.5,-1.1],[-0.5,-0.2],[0.5,-0.2],[0.5,-1.1],[0.9,-1.1],[0.9,1.1],[0.5,1.1],[0.5,0.2],[-0.5,0.2],[-0.5,1.1],[-0.9,1.1]])],
["cloud",[],()=>merge(xf(sphere(0.6),{t:[-0.7,-0.1,0]}),xf(sphere(0.8),{t:[0,0.2,0]}),xf(sphere(0.6),{t:[0.75,-0.05,0]}),xf(box(2,0.6,0.8),{t:[0,-0.35,0]}))],
["flower",["daisy","rose"],()=>{const ms=[tag(xf(box(0.12,1.4,0.12),{t:[0,-0.8,0]}),2),tag(xf(cyl(0.25,0.2),{r:[PI/2,0,0],t:[0,0.4,0.05]}),1)];for(let i=0;i<6;i++){const a=2*PI*i/6;ms.push(xf(sphere(1,12),{s:[0.42,0.2,0.1],r:[0,0,a],t:[0.45*Math.cos(a),0.4+0.45*Math.sin(a),0]}))}ms.push(xf(sphere(1,12),{s:[0.35,0.12,0.08],r:[0,0,0.5],t:[0.3,-0.7,0]}));return merge.apply(null,ms)}],
["tower",["castle","castle tower","rook"],()=>{const ms=[xf(cyl(0.78,1.45,32),{t:[0,-0.35,0]})];
 // Deep, genuinely open gaps above the shaft; rear merlons align with front ones.
 for(const x of [-0.59,0,0.59])for(const z of [-0.22,0.22])ms.push(xf(box(0.29,0.64,0.25),{t:[x,0.67,z]}));return merge.apply(null,ms)}],
["anchor",[],()=>{const arc=[];for(let i=0;i<=16;i++){const a=PI+PI*i/16;arc.push([0.85*Math.cos(a),-0.3+0.85*Math.sin(a)])}for(let i=16;i>=0;i--){const a=PI+PI*i/16;arc.push([0.62*Math.cos(a),-0.3+0.62*Math.sin(a)])}
  return merge(extrude(arc,0.15),xf(box(0.18,1.9,0.15),{t:[0,0.05,0]}),xf(box(0.9,0.15,0.15),{t:[0,0.6,0]}),xf(torus(0.2,0.07,16,6),{t:[0,1.15,0]}))}],
];
function fit(m){let c=[0,0,0],R=0;const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const p of m.v)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k])}
 c=[0,1,2].map(k=>(lo[k]+hi[k])/2);for(const p of m.v)R=Math.max(R,Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]));const s=1.25/R;return keepT(m,M(m.v.map(p=>[(p[0]-c[0])*s,(p[1]-c[1])*s,(p[2]-c[2])*s]),m.f))}
const SHAPES=DEFS.map((d,i)=>({id:i,name:d[0],aliases:d[1],sway:d[3]?0.45:0.25,mesh:fit(d[2]())}));
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim().replace(/^(a|an|the|its|it s|it is|is it) /,"").replace(/^(a|an|the) /,"").replace(/s$/,"")}
function isCorrect(shape,guess){const g=norm(guess);if(!g)return false;return [shape.name].concat(shape.aliases).some(a=>norm(a)===g)}
// The fire (point light) sits behind the prisoners; the wall is the plane z=WALL_Z.
const WALL_Z=-3.2;
function pose(mesh,yaw,pitch){return mesh.v.map(p=>rotX(rotY(p,yaw),pitch))}
function castShadow(verts,faces,light){// project every vertex of the mesh along the ray from the light onto the wall
 const P=verts.map(p=>{const t=(WALL_Z-light[2])/(p[2]-light[2]);return [light[0]+t*(p[0]-light[0]),light[1]+t*(p[1]-light[1])]});
 return {points:P,tris:faces}}
function article(name){return /^(?:[aeiou]|hour)/i.test(name)?"an":"a"}
function displayPose(shape,t){let yaw=Math.sin(t*0.0006)*shape.sway+0.18,pitch=0.12+Math.sin(t*0.0004)*0.06;
 if(shape.name==="cone"){pitch=0.48;yaw=0.18}if(shape.name==="pyramid"){yaw=0.60;pitch=0.31}if(shape.name==="tower"){yaw=0.05+Math.sin(t*0.0006)*0.04;pitch=0.06}return pose(shape.mesh,yaw,pitch)}
// BEGIN T2060U FROZEN LEVEL EXPORT
// Eve t2060u/t2062u: add sets only; Easy and the same-mesh play loop are unchanged.
// Graphics Lead: notes-from-graphics/t2060u-medium-hard-shapes.md
// Frozen export SHA256: 12bf8ea0bccc3cb993a96514ad1bb6e5d815b8e330508969e803c3ac27ff9b32
const EXTRA_LEVELS=(()=>{
const PI=Math.PI;
function M(v,f){return {v:v,f:f}}
// m.t (optional) = per-face material part index, kept through merge/xf/fit so the reveal can paint
// different substances (wafer vs cream, iron head vs wooden handle) on ONE mesh. Shadows ignore it.
function merge(){const v=[],f=[],t=[];for(const m of arguments){const o=v.length;for(const p of m.v)v.push(p.slice());m.f.forEach((q,i)=>{f.push([q[0]+o,q[1]+o,q[2]+o]);t.push(m.t?m.t[i]:0)})}const r=M(v,f);if(t.some(x=>x))r.t=t;return r}
function tag(m,k){m.t=m.f.map(()=>k);return m}
function rotX(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c]}
function rotY(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c]}
function rotZ(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]]}
function xf(m,o){o=o||{};const s=o.s===undefined?[1,1,1]:(typeof o.s==="number"?[o.s,o.s,o.s]:o.s),r=o.r||[0,0,0],t=o.t||[0,0,0];
 return keepT(m,M(m.v.map(p=>{let q=[p[0]*s[0],p[1]*s[1],p[2]*s[2]];q=rotX(q,r[0]);q=rotY(q,r[1]);q=rotZ(q,r[2]);return [q[0]+t[0],q[1]+t[1],q[2]+t[2]]}),m.f.map(x=>x.slice())))}
function keepT(a,b){if(a.t)b.t=a.t.slice();return b}
function area2(p){let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1]}return a/2}
function inTri(p,a,b,c){const d=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]);const d1=d(p,a,b),d2=d(p,b,c),d3=d(p,c,a);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0))}
function earcut(pts){const idx=pts.map((_,i)=>i),out=[];let guard=0;
 while(idx.length>3&&guard++<5000){let cut=false;for(let i=0;i<idx.length;i++){const a=pts[idx[(i+idx.length-1)%idx.length]],b=pts[idx[i]],c=pts[idx[(i+1)%idx.length]];
  if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<=1e-12)continue;let ok=true;
  for(const j of idx){const p=pts[j];if(p===a||p===b||p===c)continue;if(inTri(p,a,b,c)){ok=false;break}}
  if(ok){out.push([idx[(i+idx.length-1)%idx.length],idx[i],idx[(i+1)%idx.length]]);idx.splice(i,1);cut=true;break}}if(!cut)break}
 if(idx.length===3)out.push([idx[0],idx[1],idx[2]]);return out}
function extrude(pts,d){d=d===undefined?0.35:d;if(area2(pts)<0)pts=pts.slice().reverse();const n=pts.length,v=[],f=[];
 for(const p of pts)v.push([p[0],p[1],d/2]);for(const p of pts)v.push([p[0],p[1],-d/2]);
 for(const t of earcut(pts)){f.push([t[0],t[1],t[2]]);f.push([t[2]+n,t[1]+n,t[0]+n])}
 for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,i+n,j+n]);f.push([i,j+n,j])}return M(v,f)}
function lathe(prof,seg){seg=seg||24;const v=[],f=[],n=prof.length;for(let k=0;k<seg;k++){const a=2*PI*k/seg;for(const p of prof)v.push([p[0]*Math.cos(a),p[1],p[0]*Math.sin(a)])}
 for(let k=0;k<seg;k++){const k2=(k+1)%seg;for(let i=0;i<n-1;i++){const a=k*n+i,b=k*n+i+1,c=k2*n+i+1,e=k2*n+i;f.push([a,c,b]);f.push([a,e,c])}}return M(v,f)}
function circ(n,r,cx,cy,a0,a1){cx=cx||0;cy=cy||0;a0=a0||0;a1=a1===undefined?2*PI:a1;const o=[];const full=Math.abs(a1-a0-2*PI)<1e-9;const m=full?n:n+1;for(let i=0;i<m;i++){const a=a0+(a1-a0)*i/n;o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}return o}
function sphere(r,seg){r=r||1;const p=[];for(let i=0;i<=12;i++){const t=PI*i/12;p.push([r*Math.sin(t),-r*Math.cos(t)])}return lathe(p,seg||24)}
function cyl(r,h,seg){return lathe([[0,-h/2],[r,-h/2],[r,h/2],[0,h/2]],seg||24)}
function cone(r,h,seg){return lathe([[0,-h/2],[r,-h/2],[0,h/2]],seg||24)}
function box(w,h,d){return extrude([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],d)}
function torus(R,r,a,b){a=a||28;b=b||12;const v=[],f=[];for(let i=0;i<a;i++){const u=2*PI*i/a;for(let j=0;j<b;j++){const w=2*PI*j/b;v.push([(R+r*Math.cos(w))*Math.cos(u),(R+r*Math.cos(w))*Math.sin(u),r*Math.sin(w)])}}
 for(let i=0;i<a;i++)for(let j=0;j<b;j++){const i2=(i+1)%a,j2=(j+1)%b,p=i*b+j,q=i2*b+j,s=i2*b+j2,t=i*b+j2;f.push([p,q,s]);f.push([p,s,t])}return M(v,f)}
function star(n,r1,r2){const o=[];for(let i=0;i<2*n;i++){const a=PI/2+PI*i/n,r=i%2?r2:r1;o.push([r*Math.cos(a),r*Math.sin(a)])}return o}
function fit(m){let c=[0,0,0],R=0;const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const p of m.v)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k])}
 c=[0,1,2].map(k=>(lo[k]+hi[k])/2);for(const p of m.v)R=Math.max(R,Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]));const s=1.25/R;return keepT(m,M(m.v.map(p=>[(p[0]-c[0])*s,(p[1]-c[1])*s,(p[2]-c[2])*s]),m.f))}
// Helpers deliberately operate on Easy's {v,f,t} geometry, not another engine.
const at=(m,x=0,y=0,z=0)=>xf(m,{t:[x,y,z]});
const ell=(x,y,z)=>xf(sphere(1,20),{s:[x,y,z]});
const disc=(r,d=.16,n=28)=>xf(cyl(r,d,n),{r:[PI/2,0,0]});
const hoop=(r,t=.09,sx=1,sy=1)=>xf(torus(r,t,32,8),{s:[sx,sy,1]});
function bar(a,b,r=.06,k=0){const h=Math.hypot(...b.map((v,i)=>v-a[i]));return align(cyl(r,h,10),a,b,k)}
function align(m,a,b,k=0){const d=b.map((v,i)=>v-a[i]),h=Math.hypot(...d),u=d.map(x=>x/h),ref=Math.abs(u[1])<.9?[0,1,0]:[1,0,0];let v=[u[1]*ref[2]-u[2]*ref[1],u[2]*ref[0]-u[0]*ref[2],u[0]*ref[1]-u[1]*ref[0]],l=Math.hypot(...v);v=v.map(x=>x/l);const w=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]];return tag(M(m.v.map(p=>[0,1,2].map(i=>(a[i]+b[i])/2+v[i]*p[0]+u[i]*p[1]+w[i]*p[2])),m.f),k)}
function path(points,r=.06,k=0,close=false){const ms=[];for(let i=1;i<points.length;i++)ms.push(bar(points[i-1],points[i],r,k));if(close)ms.push(bar(points[points.length-1],points[0],r,k));for(const p of points)ms.push(tag(at(sphere(r,10),...p),k));return merge(...ms)}
function arc(r,t=.1,a0=0,a1=PI,cx=0,cy=0,z=0){return path(circ(24,r,cx,cy,a0,a1).map(p=>[...p,z]),t)}
// Annulus with separate inner contour and front/back bridges: no cap ever fills the aperture.
function annulus(outer,inner,depth=.24){const n=outer.length;if(n!==inner.length)throw Error('contour size');const v=[],f=[];for(const z of [-depth/2,depth/2])for(const loop of [outer,inner])for(const p of loop)v.push([p[0],p[1],z]);for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,j,j+n],[i,j+n,i+n],[i+2*n,j+3*n,j+2*n],[i+2*n,i+3*n,j+3*n],[i,i+2*n,j+2*n],[i,j+2*n,j],[i+n,j+3*n,i+3*n],[i+n,j+n,j+3*n])}return M(v,f)}
function rectContour(w,h,n=48){return circ(n,1).map(([x,y])=>{const t=1/Math.max(Math.abs(x)/(w/2),Math.abs(y)/(h/2));return [x*t,y*t]})}
function frame(w,h,t=.12,d=.25){return annulus(rectContour(w,h),rectContour(w-2*t,h-2*t),d)}
function tube(ro,ri,h,n=32){return lathe([[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2],[ro,-h/2]],n)}
function roof(w,h,d){return extrude([[-w/2,0],[0,h],[w/2,0],[w/2-.1,-.08],[0,h-.15],[-w/2+.1,-.08]].reverse(),d)}
function legs(w,h,d,y=0){const a=[];for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])a.push(at(box(.13,h,.13),x,y-h/2,z));return merge(...a)}
function stem(x=0,y=.9){return tag(bar([x,y,0],[x+.12,y+.36,0],.065),1)}
function wheel(r=.6,spokes=8){const a=[hoop(r,.07),annulus(circ(24,.15),circ(24,.075),.18)];for(let i=0;i<spokes;i++){const t=i*2*PI/spokes;a.push(bar([.14*Math.cos(t),.14*Math.sin(t),0],[(r-.03)*Math.cos(t),(r-.03)*Math.sin(t),0],.028,1))}return merge(...a)}
function grid(w,h,nx,ny,r=.035,z=0){const ms=[];for(let i=0;i<=nx;i++)ms.push(bar([-w/2+i*w/nx,-h/2,z],[-w/2+i*w/nx,h/2,z],r));for(let i=0;i<=ny;i++)ms.push(bar([-w/2,-h/2+i*h/ny,z],[w/2,-h/2+i*h/ny,z],r));return merge(...ms)}
function bowl(ro=.8,h=.7){return lathe([[0,-h/2],[.28,-h/2],[ro,h/2],[ro-.08,h/2],[.23,-h/2+.09],[0,-h/2+.09]])}
function instrumentBody(hole=false){const outer=[];for(let i=0;i<64;i++){const a=2*PI*i/64;outer.push([-(hole?.75:.62)*Math.sin(a)*(1+(hole?.5:.68)*Math.cos(2*a)),.85*Math.cos(a)])}return hole?annulus(outer,circ(64,.21,0,.1,PI/2,PI/2+2*PI),.35):extrude(outer,.38)}
function housing(w=1.5,h=1.2,d=.75){return merge(at(box(.12,h,d),-w/2,h/2,0),at(box(.12,h,d),w/2,h/2,0),at(roof(w+.3,.7,d+.2),0,h,0))}
function discWheels(xs,ys,z,r){return merge(...xs.flatMap(x=>[-z,z].map(q=>at(disc(r,.16),x,ys,q))))}
// All opening tests use the actual triangle union. No aperture metadata is trusted.
const BUILD={};
// MEDIUM: fruits and household silhouettes.
BUILD.pear=()=>merge(lathe([[0,-1],[.5,-.95],[.8,-.55],[.75,-.05],[.38,.55],[.24,.85],[0,.88]]),stem(0,.85));
BUILD.apple=()=>{const m=ell(.85,.78,.8);m.v=m.v.map(p=>[p[0],p[1]>.48?p[1]-.16*(1-Math.hypot(p[0],p[2])):p[1],p[2]]);return merge(m,stem(0,.63),tag(at(ell(.28,.07,.13),.27,.87,0),2))};
BUILD.lemon=()=>xf(lathe([[0,-1.05],[.17,-.9],[.5,-.63],[.65,0],[.5,.63],[.17,.9],[0,1.05]]),{r:[0,0,.75]});
BUILD.banana=()=>{const pts=[];for(let i=0;i<=22;i++){const a=-.95+1.9*i/22;pts.push([1.25*Math.sin(a),-.9*Math.cos(a)+.4,0])}const m=path(pts,.23);return merge(m,bar(pts[0],[pts[0][0]-.15,pts[0][1]+.17,0],.09,1),bar(pts[22],[pts[22][0]+.1,pts[22][1]+.18,0],.07,1))};
BUILD.pumpkin=()=>{const a=[];for(let i=0;i<10;i++){const t=2*PI*i/10;a.push(at(ell(.39,.69,.39),.5*Math.cos(t),0,.5*Math.sin(t)))}return merge(...a,stem(0,.68))};
BUILD.acorn=()=>merge(at(ell(.6,.83,.6),0,-.2,0),tag(lathe([[0,.35],[.7,.35],[.68,.56],[.45,.8],[0,.85]]),1),stem(0,.82));
BUILD.peanut=()=>{const m=lathe([[0,-1.15],[.35,-1.1],[.53,-.65],[.3,0],[.46,.55],[.3,1],[0,1.1]]);m.v=m.v.map(p=>{const a=Math.atan2(p[2],p[0]),f=1+.045*Math.cos(12*a);return [p[0]*f,p[1],p[2]*f]});return xf(m,{r:[0,0,.4]})};
BUILD.carrot=()=>merge(lathe([[0,-1.2],[.16,-.65],[.38,.55],[.32,.7],[0,.73]]),...[-.5,-.25,0,.25,.5].map(x=>tag(bar([0,.65,0],[x,1.2-Math.abs(x)*.3,0],.07),1)));
BUILD.leaf=()=>merge(xf(ell(.48,1,.13),{r:[0,0,-.4]}),bar([-.25,-1.2,0],[.2,.6,.12],.035,1));
BUILD.cactus=()=>merge(cyl(.28,1.9),bar([-.75,.2,0],[-.75,.85,0],.2),bar([-.75,.2,0],[0,.2,0],.2),bar([0,-.2,0],[.7,-.2,0],.18),bar([.7,-.2,0],[.7,.4,0],.18),at(sphere(.28),0,.95,0));
BUILD['palm tree']=()=>{const a=[path([[0,-1.3,0],[-.12,-.5,0],[.1,.3,0],[.22,.8,0]],.12,1)];for(let i=0;i<7;i++){const t=2*PI*i/7;const leaf=extrude([[0,0],[.4,.3],[1,.1],[1.25,-.25],[.5,-.04]],.08);a.push(tag(xf(leaf,{r:[0,t,0],t:[.22,.8,0]}),0))}return merge(...a)};
BUILD.broom=()=>merge(tag(bar([0,-.3,0],[0,1.4,0],.075),1),extrude([[-.65,-1.1],[.65,-1.1],[.28,-.25],[-.28,-.25]],.3),...[-.45,-.22,0,.22,.45].map(x=>tag(bar([x,-1.08,.17],[x*.55,-.38,.17],.018),2)));
BUILD.shovel=()=>merge(tag(bar([0,-.2,0],[0,1.4,0],.07),1),xf(ell(.55,.7,.13),{t:[0,-.65,0]}),at(box(.8,.16,.15),0,1.4,0));
BUILD.spoon=()=>merge(xf(bowl(.52,.18),{r:[PI/2,0,0],s:[1,1,1.4],t:[0,.65,0]}),bar([0,.2,0],[0,-1.2,0],.075));
BUILD.fork=()=>merge(at(box(.15,1.5,.13),0,-.5,0),at(box(.63,.15,.14),0,.3,0),...[-.27,-.09,.09,.27].map(x=>bar([x,.3,0],[x,1.1,0],.045)));
BUILD['frying pan']=()=>merge(xf(bowl(.8,.2),{r:[PI/2,0,0]}),tag(bar([.7,0,0],[1.8,0,0],.105),1));
BUILD['rolling pin']=()=>merge(xf(cyl(.3,1.7),{r:[0,0,PI/2]}),tag(bar([-1.3,0,0],[1.3,0,0],.1),1));
BUILD.teapot=()=>merge(ell(.77,.61,.66),tag(at(hoop(.45,.095,.8,1),-.8,.12,0),1),path([[.55,-.1,0],[.95,.25,0],[1.12,.65,0]],.16),at(disc(.4,.12),0,.54,0),at(sphere(.13),0,.8,0));
BUILD.kettle=()=>merge(ell(.88,.5,.7),arc(.75,.085,0,PI,0,.35),bar([.65,.15,0],[1.08,.4,0],.17),at(cyl(.35,.13),0,.52,0),at(sphere(.12),0,.68,0));
BUILD.pitcher=()=>merge(lathe([[0,-.9],[.55,-.9],[.62,.55],[.48,.8],[.4,.8],[.5,.5],[.44,-.75],[0,-.75]]),at(hoop(.46,.09,.8,1),.68,.1,0),extrude([[-.45,.6],[-.85,.75],[-.45,.9]],.3));
BUILD['watering can']=()=>merge(cyl(.65,1),at(hoop(.52,.09),0,.8,0),bar([.4,-.2,0],[1.35,.65,0],.14),at(ell(.25,.16,.25),1.35,.65,0));
BUILD.boot=()=>merge(at(box(.63,1.2,.65),-.2,.35,0),at(ell(.8,.32,.4),.25,-.4,0),tag(at(box(1.5,.12,.76),.2,-.66,0),1),tag(at(box(.4,.25,.7),-.35,-.73,0),1));
BUILD.hat=()=>merge(xf(cyl(1.1,.12),{s:[1,1,.8]}),at(lathe([[0,0],[.62,0],[.62,.45],[.4,.7],[0,.75]]),0,.04,0),tag(at(cyl(.63,.12),0,.15,0),1));
BUILD['hard hat']=()=>merge(lathe([[0,-.3],[.85,-.3],[.83,.1],[.6,.6],[0,.78]]),at(box(1.2,.1,.62),0,-.27,.68),tag(at(box(.12,.75,1),0,.25,0),1));
BUILD.backpack=()=>merge(ell(.65,.9,.36),tag(at(ell(.45,.34,.2),0,-.35,.37),1),...[-.4,.4].map(x=>at(xf(hoop(.55,.07,.4,1),{r:[0,PI/2,0]}),x,0,-.24)),at(hoop(.2,.05),0,.94,0));
BUILD.book=()=>merge(box(1.15,1.6,.34),tag(at(box(.17,1.7,.44),-.6,0,0),1),tag(at(box(1.13,.07,.43),0,.83,0),1),tag(at(box(1.13,.07,.43),0,-.83,0),1));
BUILD.lamp=()=>merge(at(cyl(.62,.14),0,-.95,0),bar([0,-.9,0],[0,.4,0],.075),at(lathe([[.8,0],[.39,.7],[.3,.7],[.69,0],[.8,0]]),0,.25,0));
BUILD['alarm clock']=()=>merge(disc(.8,.4),...[-.55,.55].map(x=>at(ell(.32,.22,.3),x,.76,0)),bar([0,0,.23],[0,.5,.23],.035,1),bar([0,0,.23],[.34,-.15,.23],.035,1),bar([-.45,-.65,0],[-.6,-.95,0],.06),bar([.45,-.65,0],[.6,-.95,0],.06));
BUILD['desk globe']=()=>merge(tag(sphere(.66),0),tag(arc(.84,.055,-PI*.65,PI*.65),1),tag(bar([.45,-.65,0],[0,-1,0],.07),1),tag(at(cyl(.5,.12),0,-1.08,0),1));
BUILD.trophy=()=>merge(at(bowl(.65,.75),0,.45,0),bar([0,-.65,0],[0,.1,0],.12),at(box(.9,.17,.65),0,-.77,0),...[-.65,.65].map(x=>at(hoop(.34,.065,.8,1),x,.45,0)));
BUILD.bench=()=>merge(box(2,.15,.7),tag(at(box(2,.6,.13),0,.6,-.3),1),legs(1.7,.85,.55));
BUILD.mailbox=()=>merge(at(box(1.3,.65,.8),0,.5,0),at(xf(cyl(.42,1.3),{r:[0,0,PI/2]}),0,.82,0),tag(bar([0,-1,0],[0,.25,0],.09),1),tag(bar([.5,.55,.5],[.5,1.35,.5],.04),2),tag(at(box(.32,.2,.05),.66,1.25,.5),2));
BUILD.well=()=>merge(tube(.72,.56,.75),...[-.62,.62].map(x=>tag(bar([x,0,0],[x,1.2,0],.08),1)),tag(at(roof(1.9,.6,1),0,1.1,0),2));
BUILD.tent=()=>merge(extrude([[-1,-.7],[0,.9],[1,-.7],[.8,-.7],[0,.6],[-.8,-.7]],1.1),at(box(2.15,.12,1.3),0,-.76,0));
BUILD.barn=()=>merge(at(box(1.6,1.1,1.25),0,-.3,0),tag(at(roof(1.9,.85,1.5),0,.25,0),1),at(box(.5,.4,.55),0,1.1,0),tag(at(box(.65,.72,.06),0,-.48,.66),2));
BUILD.lighthouse=()=>merge(lathe([[0,-1.3],[.52,-1.3],[.28,.6],[0,.6]]),tag(at(cyl(.47,.15),0,.6,0),1),at(cyl(.3,.42,8),0,.85,0),tag(at(cone(.5,.3),0,1.2,0),1),...Array.from({length:8},(_,i)=>{const a=i*PI/4;return bar([.43*Math.cos(a),.62,.43*Math.sin(a)],[.43*Math.cos(a),.86,.43*Math.sin(a)],.025,1)}));
BUILD.windmill=()=>{const ms=[lathe([[0,-1.2],[.65,-1.2],[.4,.8],[0,1]]),at(cone(.55,.45),0,.95,0)];for(let i=0;i<4;i++)ms.push(tag(xf(box(.23,1.1,.12),{r:[0,0,i*PI/2+.5],t:[-.55*Math.sin(i*PI/2+.5),.4+.55*Math.cos(i*PI/2+.5),.6]}),1));return merge(...ms)};
BUILD['street lamp']=()=>merge(at(cyl(.3,.15),0,-1.3,0),bar([0,-1.3,0],[0,1.2,0],.055),path([[0,1,0],[.2,1.35,0],[.7,1.35,0],[.8,1.1,0]],.06),at(box(.42,.6,.35),.8,.75,0),at(cone(.35,.25),.8,1.16,0));
BUILD.wagon=()=>merge(at(box(1.5,.12,.8),0,-.1,0),...[-.4,.4].map(z=>at(box(1.5,.45,.08),0,.16,z)),...[-.75,.75].map(x=>at(box(.08,.45,.8),x,.16,0)),tag(discWheels([-.5,.5],-.35,.52,.28),1),bar([.7,-.1,0],[1.5,.65,0],.045),at(box(.4,.07,.1),1.5,.65,0));
BUILD.canoe=()=>{const v=[],f=[],nu=32,nt=16,n=(nu+1)*(nt+1);for(let skin=0;skin<2;skin++)for(let i=0;i<=nu;i++){const u=-1+2*i/nu,w=.5*Math.pow(Math.max(0,1-u*u),.7);for(let j=0;j<=nt;j++){const t=PI*j/nt;v.push([1.65*u,-.4*Math.sin(t)*Math.pow(Math.max(0,1-u*u),.35)+.2*Math.pow(Math.abs(u),4)+skin*.05,w*Math.cos(t)*(skin?.88:1)])}}for(let i=0;i<nu;i++)for(let j=0;j<nt;j++)for(let k=0;k<2;k++){const a=k*n+i*(nt+1)+j,b=a+nt+1;f.push(k?[a,b,b+1]:[a,b+1,b],k?[a,b+1,a+1]:[a,a+1,b+1])}for(let i=0;i<nu;i++)for(const j of [0,nt]){const a=i*(nt+1)+j,b=a+nt+1;f.push([a,b,b+n],[a,b+n,a+n])}for(const i of [0,nu])for(let j=0;j<nt;j++){const a=i*(nt+1)+j;f.push([a,a+n,a+1+n],[a,a+1+n,a+1])}return merge(M(v,f),at(box(.14,.1,.85),0,-.08,0))};
BUILD.barrel=()=>{const p=[[0,-.9],[.55,-.9],[.73,-.5],[.8,0],[.73,.5],[.55,.9],[0,.9]],ms=[lathe(p,32)];for(const y of [-.65,0,.65])ms.push(tag(at(xf(torus(y===0?.8:.66,.05),{r:[PI/2,0,0]}),0,y,0),1));return merge(...ms)};
BUILD.igloo=()=>merge(lathe([[0,-.5],[1,-.5],[.94,0],[.7,.5],[.35,.8],[0,.88]]),at(xf(tube(.35,.25,.65),{r:[PI/2,0,0]}),0,-.25,1));
BUILD.silo=()=>merge(cyl(.55,2.1),at(cone(.61,.5),0,1.25,0),tag(at(xf(torus(.56,.035),{r:[PI/2,0,0]}),0,-.5,0),1),tag(at(xf(torus(.56,.035),{r:[PI/2,0,0]}),0,.5,0),1));
BUILD.pagoda=()=>{const a=[];for(let i=0;i<4;i++){const w=1.8-i*.32,y=-.85+i*.6;a.push(at(box(w*.65,.5,w*.6),0,y,0),tag(at(roof(w,.38,w),0,y+.3,0),1))}return merge(...a)};
BUILD['grand piano']=()=>merge(extrude([[-.8,-.3],[.8,-.3],[1,.5],[.6,.9],[-.6,.7]],.5),tag(at(box(1.7,.22,.4),0,-.43,.2),1),tag(xf(box(1.6,.12,1.25),{r:[.45,0,0],t:[0,.4,-.3]}),0),legs(1.35,.8,.8,-.35));
BUILD.violin=()=>merge(instrumentBody(),at(box(.15,1.2,.2),0,1.1,0),at(ell(.19,.25,.16),0,1.85,0),tag(at(box(.34,.07,.16),0,-.05,.25),1),...[-.045,0,.045].map(x=>bar([x,-.4,.25],[x,1.7,.18],.009,1)));
BUILD.saxophone=()=>merge(path([[.35,1.2,0],[.05,1.25,0],[-.1,1,0],[-.3,-.65,0],[-.12,-.95,0],[.35,-.9,0],[.65,-.3,0]],.14),at(lathe([[.14,-.3],[.45,.3],[.38,.3],[.08,-.3],[.14,-.3]]),.65,-.15,0),...[-.3,0,.3,.6].map(y=>tag(at(sphere(.07),-.17,y,.14),1)));
BUILD.megaphone=()=>merge(xf(lathe([[.18,-.65],[.75,.65],[.66,.65],[.1,-.65],[.18,-.65]]),{r:[0,0,-PI/2]}),tag(at(hoop(.29,.075,.65,1),-.25,-.4,0),1));
BUILD.tricycle=()=>merge(at(disc(.58,.2),.65,-.35,0),...[-.5,.5].map(z=>tag(at(disc(.32,.14),-.7,-.6,z),1)),bar([-.75,-.25,0],[.3,0,0],.07),bar([.3,0,0],[.65,-.35,0],.07),bar([.65,-.35,0],[.45,.65,0],.06),at(box(.65,.12,.45),-.3,.2,0),bar([.3,.65,-.35],[.3,.65,.35],.06));
BUILD.seesaw=()=>merge(cone(.4,.8,4),xf(box(2.8,.12,.38),{r:[0,0,.18],t:[0,.45,0]}),...[-1.2,1.2].map(x=>tag(at(box(.45,.12,.6),x,.5+x*.18,0),1)));
// HARD: apertures are actual open geometry. Hollow bores retain inner walls.
BUILD.washer=()=>annulus(circ(40,.95),circ(40,.43),.12);
BUILD.bead=()=>{const prof=[];const ri=.33;for(let i=0;i<=22;i++){const t=.38+(PI-.76)*i/22;prof.push([Math.sin(t),-Math.cos(t)])}prof.push([ri,prof[prof.length-1][1]],[ri,prof[0][1]],prof[0]);return xf(lathe(prof,40),{r:[PI/2,0,0]})};
BUILD.straw=()=>xf(tube(.19,.13,2.3),{r:[PI/2,.3,0]});
function bentTube(){const v=[],f=[],N=32,points=[[0,-.5,0],[0,0,0],[.5,0,0]];const dirs=[[0,1,0],[Math.SQRT1_2,Math.SQRT1_2,0],[1,0,0]];for(let j=0;j<3;j++)for(const r of [.32,.25])for(let i=0;i<N;i++){const a=2*PI*i/N;v.push([points[j][0]+dirs[j][1]*r*Math.cos(a),points[j][1]-dirs[j][0]*r*Math.cos(a),r*Math.sin(a)])}for(let j=0;j<2;j++)for(let k=0;k<2;k++)for(let i=0;i<N;i++){const a=j*2*N+k*N+i,b=j*2*N+k*N+(i+1)%N,c=b+2*N,d=a+2*N;f.push([a,b,c],[a,c,d])}for(const j of [0,2])for(let i=0;i<N;i++){const a=j*2*N+i,b=j*2*N+(i+1)%N;f.push([a,a+N,b+N],[a,b+N,b])}return M(v,f)}
BUILD['elbow pipe']=bentTube;
BUILD.funnel=()=>lathe([[.16,-1],[.16,-.3],[.95,.7],[.86,.7],[.09,-.3],[.09,-1],[.16,-1]],40);
BUILD['hex nut']=()=>annulus(circ(48,1).map(([x,y],i)=>{const a=2*PI*i/48,t=1/Math.cos(((a+PI/6)%(PI/3))-PI/6);return [x*t,y*t]}),circ(48,.45),.6);
BUILD.tire=()=>merge(hoop(.8,.24),...Array.from({length:22},(_,i)=>{const a=2*PI*i/22;return xf(box(.12,.08,.43),{r:[0,0,a-PI/2],t:[1.02*Math.cos(a),1.02*Math.sin(a),0]})}));
BUILD['life ring']=()=>merge(hoop(.86,.18),...Array.from({length:4},(_,i)=>{const a=2*PI*i/4;return tag(xf(box(.26,.12,.4),{r:[0,0,a],t:[.86*Math.cos(a),.86*Math.sin(a),0]}),1)}),tag(hoop(1.1,.035),2));
BUILD.horseshoe=()=>merge(arc(.8,.16,-PI*.15,PI*1.15),...[-.72,.72].map(x=>at(box(.24,.2,.26),x,-.36,0)));
BUILD.button=()=>{const ms=[];for(const x of [-.35,.35])for(const y of [-.35,.35])ms.push(at(annulus(rectContour(.7,.7,32),circ(32,.15),.18),x,y,0));return merge(...ms)};
BUILD['picture frame']=()=>merge(frame(1.9,1.5,.17,.2),tag(frame(1.55,1.15,.04,.25),1));
BUILD.arch=()=>merge(arc(.8,.18,0,PI,0,.3),...[-.8,.8].map(x=>at(box(.36,1,.5),x,-.2,0)));
BUILD['safety pin']=()=>merge(path([[-.85,-.55,0],[-.95,.3,0],[-.7,.6,0],[.95,-.5,0]],.055),bar([-.85,-.55,0],[.95,-.5,0],.045),tag(at(box(.26,.22,.16),.9,-.46,0),1),at(hoop(.12,.04),-.85,-.5,0));
BUILD['paper clip']=()=>path([[.2,-.8,0],[.2,.65,0],[.05,.82,0],[-.35,.82,0],[-.52,.65,0],[-.52,-.9,0],[-.35,-1.05,0],[.4,-1.05,0],[.56,-.86,0],[.56,.72,0]],.065);
BUILD['chain link']=()=>hoop(.7,.13,.68,1.5);
BUILD.padlock=()=>merge(at(box(1.2,.9,.4),0,-.45,0),arc(.44,.11,0,PI,0,.1),bar([-.44,.1,0],[-.44,.4,0],.11),bar([.44,.1,0],[.44,.4,0],.11));
BUILD.wrench=()=>merge(at(annulus(circ(24,.35),circ(24,.2),.2),0,-1,0),at(box(.2,1.7,.18),0,-.05,0),at(arc(.37,.13,-PI*.1,PI*1.1),0,.9,0));
BUILD.bucket=()=>merge(lathe([[0,-.9],[.5,-.9],[.72,.35],[.63,.35],[.43,-.81],[0,-.81]]),arc(.7,.045,0,PI,0,.35));
BUILD.basket=()=>{const ms=[at(disc(.46,.08),0,-.5,0)]; // woven sides: lattice strips, not an opaque shell
for(let i=0;i<16;i++){const a=2*PI*i/16;ms.push(tag(bar([.4*Math.cos(a),-.45,.4*Math.sin(a)],[.8*Math.cos(a),.45,.8*Math.sin(a)],.035),0))}for(let j=0;j<5;j++){const y=-.4+j*.21,r=.42+(y+.4)*.42;ms.push(xf(hoop(r,.034),{r:[PI/2,0,0],t:[0,y,0]}))}ms.push(arc(.79,.07,0,PI,0,.42));return merge(...ms)};
BUILD.birdhouse=()=>merge(at(annulus(rectContour(1.3,1.3,48),circ(48,.25,0,.15),.15),0,-.1,.4),tag(at(roof(1.7,.65,.95),0,.55,0),1),at(box(.12,1.3,.7),-.65,-.1,0),at(box(.12,1.3,.7),.65,-.1,0),at(box(1.4,.1,.8),0,-.78,0),bar([0,-.4,.4],[0,-.4,.75],.05,1));
BUILD.doghouse=()=>merge(housing(1.5,1,.9),at(box(1.6,.12,1),0,-.05,0),at(arc(.38,.12,0,PI,0,.43),0,0,.5),...[-.38,.38].map(x=>bar([x,.05,.5],[x,.43,.5],.12)));
BUILD.lantern=()=>{const a=[at(box(.85,.13,.7),0,-.65,0),at(cone(.65,.35,4),0,.75,0),at(hoop(.2,.05),0,1.05,0),tag(at(ell(.13,.28,.13),0,-.28,0),1)];for(const x of [-.37,.37])for(const z of [-.3,.3])a.push(bar([x,-.6,z],[x,.65,z],.045));return merge(...a)};
BUILD.binoculars=()=>merge(...[-.48,.48].map(x=>at(xf(tube(.35,.26,1.2),{r:[PI/2,0,0]}),x,0,0)),tag(box(.4,.2,.4),1),...[-.48,.48].map(x=>at(hoop(.32,.055),x,0,.65)));
BUILD.eyeglasses=()=>merge(...[-.53,.53].map(x=>at(hoop(.42,.045,1,.8),x,0,0)),bar([-.12,0,0],[.12,0,0],.035),...[-.95,.95].map(x=>path([[x,.1,0],[x,.1,-.8],[x,.02,-1]],.035)));
BUILD.scissors=()=>merge(...[-.36,.36].map(x=>at(hoop(.3,.075,.78,1),x,-.8,0)),...[-1,1].map(s=>extrude([[s*.12,-.6],[s*.3,-.3],[-s*.45,1.1],[-s*.12,.15]],.12)),tag(at(disc(.12,.18),0,0,0),1));
// Closed thick tube grid, omit outer+inner patches and bridge exposed edges for real finger holes.
function perforatedTube(){const n=32,ny=36,ro=.16,ri=.1,h=2.5,v=[],f=[],keep=[];for(const r of [ro,ri])for(let j=0;j<=ny;j++)for(let i=0;i<n;i++){const a=2*PI*i/n;v.push([r*Math.cos(a),-h/2+h*j/ny,r*Math.sin(a)])}const stride=(ny+1)*n;
for(let j=0;j<ny;j++){keep[j]=[];for(let i=0;i<n;i++)keep[j][i]=!([7,12,17,22,27].some(q=>j>=q&&j<q+2)&&([7,8,23,24].includes(i)))}
const idx=(j,i,k)=>k*stride+j*n+(i+n)%n;
for(let j=0;j<ny;j++)for(let i=0;i<n;i++)if(keep[j][i]){for(let k=0;k<2;k++){const a=idx(j,i,k),b=idx(j,i+1,k),c=idx(j+1,i+1,k),d=idx(j+1,i,k);f.push(k?[a,c,b]:[a,b,c],k?[a,d,c]:[a,c,d])}const sides=[[j,i,j,i+1,j-1,i],[j+1,i+1,j+1,i,j+1,i],[j+1,i,j,i,j,(i+n-1)%n],[j,i+1,j+1,i+1,j,(i+1)%n]];for(const [ja,ia,jb,ib,jq,iq] of sides)if(jq<0||jq>=ny||!keep[jq][iq]){const a=idx(ja,ia,0),b=idx(jb,ib,0);f.push([a,b,b+stride],[a,b+stride,a+stride])}}
return M(v,f)}
BUILD.flute=()=>merge(perforatedTube(),tag(at(xf(hoop(.17,.035),{r:[PI/2,0,0]}),0,.95,0),1));
BUILD.telescope=()=>xf(merge(xf(tube(.27,.2,2),{r:[PI/2,0,0]}),at(xf(tube(.4,.29,.35),{r:[PI/2,0,0]}),0,0,-1),at(xf(tube(.22,.15,.3),{r:[PI/2,0,0]}),0,0,1.1)),{r:[0,.35,0]});
BUILD.gear=()=>annulus(star(14,1,.82),circ(28,.34),.28);
BUILD.pulley=()=>merge(annulus(circ(36,.83),circ(36,.23),.14),at(annulus(circ(36,.96),circ(36,.23),.09),0,0,-.16),at(annulus(circ(36,.96),circ(36,.23),.09),0,0,.16));
BUILD['cart wheel']=()=>wheel(.95,10);
BUILD['steering wheel']=()=>merge(hoop(.95,.095),disc(.2,.18),...[0,2*PI/3,4*PI/3].map(a=>bar([.12*Math.cos(a),.12*Math.sin(a),0],[.87*Math.cos(a),.87*Math.sin(a),0],.08)));
BUILD.wreath=()=>merge(hoop(.84,.13),...Array.from({length:18},(_,i)=>{const a=2*PI*i/18;return tag(xf(ell(.25,.09,.1),{r:[0,0,a+.65],t:[.87*Math.cos(a),.87*Math.sin(a),0]}),1)}));
BUILD.pretzel=()=>merge(at(hoop(.45,.11),-.46,.25,0),at(hoop(.45,.11),.46,.25,0),xf(arc(.95,.11,PI,2*PI),{s:[1,.9,1],t:[0,.25,.04]}));
BUILD.chain=()=>merge(...Array.from({length:4},(_,i)=>xf(hoop(.38,.09,.75,1.3),{r:[0,i%2?PI/2:0,0],t:[0,i*.66-1,0]})));
BUILD['step ladder']=()=>{const a=[];for(const z of [-.55,.55]){for(const x of [-.5,.5])a.push(bar([x,-1,z],[x,1,0],.07));for(let i=0;i<5;i++){const y=-.8+i*.39;a.push(tag(bar([-.5,y,z*(1-y)/2],[.5,y,z*(1-y)/2],.055),1))}}return merge(...a,at(box(1.2,.13,.35),0,1,0))};
BUILD.window=()=>merge(frame(1.7,2,.14,.2),box(.1,1.9,.18),box(1.6,.1,.18));
BUILD['picket fence']=()=>merge(...Array.from({length:6},(_,i)=>at(extrude([[-.1,-.75],[.1,-.75],[.1,.65],[0,.9],[-.1,.65]],.16),-1.1+i*.44,0,0)),tag(at(box(2.6,.12,.15),0,-.4,-.1),1),tag(at(box(2.6,.12,.15),0,.35,-.1),1));
BUILD.guitar=()=>merge(instrumentBody(true),at(box(.17,1.2,.2),0,1.05,0),at(box(.28,.35,.2),0,1.78,0),tag(at(box(.42,.08,.16),0,-.45,.23),1),...[-.06,-.036,-.012,.012,.036,.06].map(x=>bar([x,-.45,.26],[x,1.9,.15],.006,1)));
BUILD.harp=()=>merge(path([[-.85,-1,0],[.65,-1,0],[.55,1.2,0],[-.85,-1,0]],.095),...Array.from({length:8},(_,i)=>{const x=-.66+i*.16,y=-1+(x+.85)/1.4*2.2;return tag(bar([x,-.92,0],[x,y-.1,0],.014),1)}));
function cycleFrame(){return merge(path([[-.8,-.5,0],[-.35,.35,0],[.55,.35,0],[.1,-.5,0],[-.8,-.5,0]],.055),bar([-.35,.35,0],[.1,-.5,0],.055),bar([.55,.35,0],[.85,-.5,0],.05),bar([.55,.35,0],[.48,.7,0],.05),bar([.48,.7,-.25],[.48,.7,.25],.05),bar([-.35,.35,0],[-.45,.65,0],.05),tag(at(box(.48,.1,.28),-.45,.65,0),1),at(disc(.12,.12),.1,-.5,0))}
BUILD.bicycle=()=>merge(tag(cycleFrame(),0),...[-.85,.85].map(x=>tag(at(wheel(.61,7),x,-.5,0),1)));
BUILD.unicycle=()=>merge(wheel(.8,9),bar([0,0,0],[0,1.6,0],.06,1),tag(at(box(.6,.15,.35),0,1.6,0),1),bar([-.25,0,0],[.25,0,0],.04,1),at(box(.17,.06,.15),.25,0,0));
BUILD.wheelchair=()=>merge(...[-.62,.62].map(z=>at(wheel(.72,9),-.2,-.4,z)),tag(at(box(.9,.13,1.1),0,.1,0),1),tag(at(box(.13,.8,1.1),-.4,.5,0),1),...[-.5,.5].map(z=>bar([-.5,.15,z],[.75,-.75,z],.045)),...[-.55,.55].map(z=>at(disc(.17,.1),.65,-.85,z)),at(box(.45,.08,.95),.85,-.6,0),...[-.55,.55].map(z=>bar([-.4,.95,z],[-.7,.95,z],.04)));
BUILD['shopping cart']=()=>{const a=[at(grid(1.45,.8,7,4),0,.5,.46),at(grid(1.45,.8,7,4),0,.5,-.46),xf(grid(.9,.8,5,4),{r:[0,PI/2,0],t:[.72,.5,0]}),xf(grid(.9,.8,5,4),{r:[0,PI/2,0],t:[-.72,.5,0]}),xf(grid(1.45,.9,7,5),{r:[PI/2,0,0],t:[0,.1,0]}),path([[-.9,1.2,-.5],[-.9,1.2,.5],[-.65,-.65,.5],[.65,-.65,.5]],.05),bar([-.65,-.65,-.5],[.65,-.65,-.5],.05)];for(const x of [-.6,.6])for(const z of [-.5,.5])a.push(tag(at(hoop(.16,.045),x,-.8,z),1));return merge(...a)};
BUILD['tennis racket']=()=>{const a=[hoop(.7,.065,.8,1.12),tag(bar([0,-.75,0],[0,-1.85,0],.07),1)];for(let i=-3;i<=3;i++){const x=i*.13,h=.77*Math.sqrt(1-x*x/.56**2);a.push(bar([x,-h,0],[x,h,0],.012))}for(let i=-4;i<=4;i++){const y=i*.13,w=.55*Math.sqrt(1-y*y/.78**2);a.push(bar([-w,y,0],[w,y,0],.012))}return merge(...a)};
BUILD.colander=()=>{const a=[];for(let j=0;j<5;j++){const t=.2+j*.26,r=.86*Math.sin(t),y=-.7*Math.cos(t);a.push(xf(hoop(r,.025),{r:[PI/2,0,0],t:[0,y,0]}))}for(let i=0;i<20;i++){const t=i*2*PI/20,p=[];for(let j=0;j<=12;j++){const q=.08+1.32*j/12;p.push([.86*Math.sin(q)*Math.cos(t),-.7*Math.cos(q),.86*Math.sin(q)*Math.sin(t)])}a.push(path(p,.023))}for(const x of [-.98,.98])a.push(at(hoop(.22,.05,1,.6),x,-.1,0));return merge(...a)};
BUILD.birdcage=()=>{const a=[at(cyl(.72,.1),0,-.8,0),at(hoop(.16,.035),0,1.2,0),at(hoop(.3,.045,.7,1),0,-.1,.73)];for(let j=0;j<3;j++)a.push(xf(hoop(.72,.025),{r:[PI/2,0,0],t:[0,-.65+j*.46,0]}));for(let i=0;i<16;i++){const t=2*PI*i/16,p=[[.72*Math.cos(t),-.8,.72*Math.sin(t)],[.72*Math.cos(t),.45,.72*Math.sin(t)]];for(let j=1;j<=8;j++){const q=PI/2*j/8;p.push([.72*Math.cos(q)*Math.cos(t),.45+.65*Math.sin(q),.72*Math.cos(q)*Math.sin(t)])}a.push(path(p,.025))}return merge(...a)};
BUILD.abacus=()=>{const a=[frame(2,1.7,.13,.22)];for(let j=0;j<5;j++){const y=-.58+j*.29;a.push(tag(bar([-.87,y,0],[.87,y,0],.025),1));for(let i=0;i<5;i++)a.push(tag(at(ell(.1,.13,.14),-.7+i*.25+(j%2)*.3,y,0),2))}return merge(...a)};
BUILD.portcullis=()=>merge(frame(1.9,2.2,.14,.3),...Array.from({length:6},(_,i)=>{const x=-.68+i*.27;return merge(bar([x,-1.05,0],[x,1,0],.04),at(cone(.075,.22,4),x,-1.12,0))}),...[-.65,-.2,.25,.7].map(y=>bar([-.85,y,0],[.85,y,0],.04)));
BUILD['jungle gym']=()=>{const a=[];for(const x of [-.9,0,.9])for(const z of [-.9,0,.9])a.push(bar([x,-.9,z],[x,.9,z],.035));for(const y of [-.9,0,.9])for(const z of [-.9,0,.9])a.push(bar([-.9,y,z],[.9,y,z],.035));for(const y of [-.9,0,.9])for(const x of [-.9,0,.9])a.push(bar([x,y,-.9],[x,y,.9],.035));return merge(...a)};
BUILD['ferris wheel']=()=>{const a=[at(wheel(1.05,12),0,.3,0),tag(path([[-.7,-1, -.2],[0,.3,-.2],[.7,-1,-.2]],.065),1),tag(path([[-.7,-1,.2],[0,.3,.2],[.7,-1,.2]],.065),1)];for(let i=0;i<10;i++){const t=2*PI*i/10,x=1.05*Math.cos(t),y=.3+1.05*Math.sin(t);a.push(tag(at(box(.28,.18,.28),x,y-.17,0),2),bar([x,y,0],[x,y-.15,0],.02))}return merge(...a)};

const MEDIUM=[
["pear",[],BUILD["pear"],1],
["apple",[],BUILD["apple"],1],
["lemon",[],BUILD["lemon"],1],
["banana",[],BUILD["banana"],1],
["pumpkin",[],BUILD["pumpkin"],1],
["acorn",[],BUILD["acorn"],1],
["peanut",[],BUILD["peanut"],1],
["carrot",[],BUILD["carrot"],1],
["leaf",[],BUILD["leaf"],1],
["cactus",[],BUILD["cactus"],1],
["palm tree",["palm"],BUILD["palm tree"],1],
["broom",[],BUILD["broom"],1],
["shovel",[],BUILD["shovel"],1],
["spoon",[],BUILD["spoon"],1],
["fork",[],BUILD["fork"],1],
["frying pan",["skillet", "pan"],BUILD["frying pan"],1],
["rolling pin",[],BUILD["rolling pin"],1],
["teapot",[],BUILD["teapot"],1],
["kettle",[],BUILD["kettle"],1],
["pitcher",["jug"],BUILD["pitcher"],1],
["watering can",[],BUILD["watering can"],1],
["boot",["rain boot"],BUILD["boot"],1],
["hat",["brimmed hat"],BUILD["hat"],1],
["hard hat",["safety helmet"],BUILD["hard hat"],1],
["backpack",["knapsack", "rucksack"],BUILD["backpack"],1],
["book",["hardcover"],BUILD["book"],1],
["lamp",["table lamp"],BUILD["lamp"],1],
["alarm clock",["clock"],BUILD["alarm clock"],1],
["desk globe",["world globe"],BUILD["desk globe"],1],
["trophy",["trophy cup"],BUILD["trophy"],1],
["bench",["park bench"],BUILD["bench"],1],
["mailbox",["letter box"],BUILD["mailbox"],1],
["well",[],BUILD["well"],1],
["tent",["camping tent"],BUILD["tent"],1],
["barn",[],BUILD["barn"],1],
["lighthouse",[],BUILD["lighthouse"],1],
["windmill",[],BUILD["windmill"],1],
["street lamp",["lamp post", "lamppost"],BUILD["street lamp"],1],
["wagon",["cart"],BUILD["wagon"],1],
["canoe",[],BUILD["canoe"],1],
["barrel",["cask", "keg"],BUILD["barrel"],1],
["igloo",[],BUILD["igloo"],1],
["silo",[],BUILD["silo"],1],
["pagoda",[],BUILD["pagoda"],1],
["grand piano",["piano"],BUILD["grand piano"],1],
["violin",[],BUILD["violin"],1],
["saxophone",["sax"],BUILD["saxophone"],1],
["megaphone",["bullhorn"],BUILD["megaphone"],1],
["tricycle",["trike"],BUILD["tricycle"],1],
["seesaw",["teeter totter", "teeter-totter"],BUILD["seesaw"],1]
];

const HARD=[
["washer",["flat washer", "metal washer"],BUILD["washer"],1],
["bead",[],BUILD["bead"],1],
["straw",["drinking straw"],BUILD["straw"],1],
["elbow pipe",["pipe", "plumbing pipe"],BUILD["elbow pipe"],1],
["funnel",["kitchen funnel"],BUILD["funnel"],1],
["hex nut",["bolt nut"],BUILD["hex nut"],1],
["tire",["tyre", "car tire"],BUILD["tire"],1],
["life ring",["life preserver", "lifebuoy"],BUILD["life ring"],1],
["horseshoe",["horse shoe"],BUILD["horseshoe"],1],
["button",["shirt button"],BUILD["button"],1],
["picture frame",["frame", "empty frame"],BUILD["picture frame"],1],
["arch",["archway", "stone arch"],BUILD["arch"],1],
["safety pin",[],BUILD["safety pin"],1],
["paper clip",["paperclip"],BUILD["paper clip"],1],
["chain link",[],BUILD["chain link"],1],
["padlock",["lock"],BUILD["padlock"],1],
["wrench",["spanner"],BUILD["wrench"],1],
["bucket",["pail"],BUILD["bucket"],1],
["basket",["wicker basket"],BUILD["basket"],1],
["birdhouse",["bird house"],BUILD["birdhouse"],1],
["doghouse",["dog house", "kennel"],BUILD["doghouse"],1],
["lantern",["oil lantern"],BUILD["lantern"],1],
["binoculars",["field glasses"],BUILD["binoculars"],1],
["eyeglasses",["glasses", "spectacles"],BUILD["eyeglasses"],1],
["scissors",["shears"],BUILD["scissors"],1],
["flute",[],BUILD["flute"],1],
["telescope",["spyglass"],BUILD["telescope"],1],
["gear",["cog", "cogwheel"],BUILD["gear"],1],
["pulley",["pulley wheel"],BUILD["pulley"],1],
["cart wheel",["wagon wheel", "spoked wheel"],BUILD["cart wheel"],1],
["steering wheel",["driving wheel"],BUILD["steering wheel"],1],
["wreath",[],BUILD["wreath"],1],
["pretzel",[],BUILD["pretzel"],1],
["chain",["metal chain"],BUILD["chain"],1],
["step ladder",["stepladder"],BUILD["step ladder"],1],
["window",["window frame"],BUILD["window"],1],
["picket fence",["fence"],BUILD["picket fence"],1],
["guitar",["acoustic guitar"],BUILD["guitar"],1],
["harp",[],BUILD["harp"],1],
["bicycle",["bike"],BUILD["bicycle"],1],
["unicycle",[],BUILD["unicycle"],1],
["wheelchair",[],BUILD["wheelchair"],1],
["shopping cart",["shopping trolley"],BUILD["shopping cart"],1],
["tennis racket",["tennis racquet"],BUILD["tennis racket"],1],
["colander",["strainer", "sieve"],BUILD["colander"],1],
["birdcage",["bird cage", "cage"],BUILD["birdcage"],1],
["abacus",["counting frame"],BUILD["abacus"],1],
["portcullis",["barred gate"],BUILD["portcullis"],1],
["jungle gym",["climbing frame", "monkey bars"],BUILD["jungle gym"],1],
["ferris wheel",["observation wheel"],BUILD["ferris wheel"],1]
];

// Merge into the live OBJ_MATS only when integrating this export; all IDs exist in Easy MATS.
const OBJ_MATS={
 "pear": [
  "leaf",
  "wood",
  "leaf"
 ],
 "leaf": [
  "leaf",
  "steel",
  "leaf"
 ],
 "cactus": [
  "leaf",
  "steel",
  "leaf"
 ],
 "palm tree": [
  "leaf",
  "wood",
  "leaf"
 ],
 "wreath": [
  "leaf",
  "leaf",
  "ruby"
 ],
 "apple": [
  "ruby",
  "wood",
  "leaf"
 ],
 "lemon": [
  "ochre",
  "steel",
  "leaf"
 ],
 "banana": [
  "ochre",
  "wood",
  "leaf"
 ],
 "pumpkin": [
  "traffic",
  "wood",
  "leaf"
 ],
 "carrot": [
  "traffic",
  "leaf",
  "leaf"
 ],
 "acorn": [
  "dough",
  "wood",
  "leaf"
 ],
 "peanut": [
  "dough",
  "steel",
  "leaf"
 ],
 "pretzel": [
  "dough",
  "steel",
  "leaf"
 ],
 "broom": [
  "dough",
  "wood",
  "steel"
 ],
 "rolling pin": [
  "wood",
  "wood",
  "wood"
 ],
 "book": [
  "shell",
  "indigo",
  "gold"
 ],
 "bench": [
  "wood",
  "wood",
  "steel"
 ],
 "mailbox": [
  "wood",
  "steel",
  "leaf"
 ],
 "well": [
  "masonry",
  "wood",
  "terracotta"
 ],
 "windmill": [
  "wood",
  "steel",
  "leaf"
 ],
 "wagon": [
  "wood",
  "steel",
  "leaf"
 ],
 "canoe": [
  "wood",
  "steel",
  "leaf"
 ],
 "barrel": [
  "wood",
  "steel",
  "leaf"
 ],
 "grand piano": [
  "moonstone",
  "shell",
  "gold"
 ],
 "violin": [
  "wood",
  "steel",
  "leaf"
 ],
 "seesaw": [
  "wood",
  "steel",
  "leaf"
 ],
 "picture frame": [
  "wood",
  "steel",
  "leaf"
 ],
 "birdhouse": [
  "wood",
  "steel",
  "leaf"
 ],
 "doghouse": [
  "wood",
  "steel",
  "leaf"
 ],
 "basket": [
  "wood",
  "steel",
  "leaf"
 ],
 "step ladder": [
  "wood",
  "steel",
  "leaf"
 ],
 "picket fence": [
  "wood",
  "steel",
  "leaf"
 ],
 "guitar": [
  "wood",
  "gold",
  "wood"
 ],
 "harp": [
  "gold",
  "steel",
  "wood"
 ],
 "abacus": [
  "wood",
  "steel",
  "candy"
 ],
 "cart wheel": [
  "wood",
  "steel",
  "leaf"
 ],
 "shovel": [
  "steel",
  "steel",
  "leaf"
 ],
 "spoon": [
  "steel",
  "steel",
  "leaf"
 ],
 "fork": [
  "steel",
  "steel",
  "leaf"
 ],
 "frying pan": [
  "steel",
  "wood",
  "steel"
 ],
 "kettle": [
  "steel",
  "steel",
  "leaf"
 ],
 "watering can": [
  "steel",
  "steel",
  "leaf"
 ],
 "alarm clock": [
  "steel",
  "steel",
  "leaf"
 ],
 "street lamp": [
  "steel",
  "steel",
  "leaf"
 ],
 "silo": [
  "steel",
  "steel",
  "leaf"
 ],
 "washer": [
  "steel",
  "steel",
  "leaf"
 ],
 "straw": [
  "steel",
  "steel",
  "leaf"
 ],
 "elbow pipe": [
  "steel",
  "steel",
  "leaf"
 ],
 "hex nut": [
  "steel",
  "steel",
  "leaf"
 ],
 "horseshoe": [
  "steel",
  "steel",
  "leaf"
 ],
 "safety pin": [
  "steel",
  "steel",
  "leaf"
 ],
 "paper clip": [
  "steel",
  "steel",
  "leaf"
 ],
 "chain link": [
  "steel",
  "steel",
  "leaf"
 ],
 "padlock": [
  "steel",
  "steel",
  "leaf"
 ],
 "wrench": [
  "steel",
  "steel",
  "leaf"
 ],
 "bucket": [
  "steel",
  "steel",
  "leaf"
 ],
 "lantern": [
  "steel",
  "steel",
  "leaf"
 ],
 "binoculars": [
  "steel",
  "steel",
  "leaf"
 ],
 "eyeglasses": [
  "steel",
  "steel",
  "leaf"
 ],
 "scissors": [
  "steel",
  "steel",
  "leaf"
 ],
 "flute": [
  "steel",
  "steel",
  "leaf"
 ],
 "telescope": [
  "steel",
  "steel",
  "leaf"
 ],
 "gear": [
  "steel",
  "steel",
  "leaf"
 ],
 "pulley": [
  "steel",
  "steel",
  "leaf"
 ],
 "steering wheel": [
  "steel",
  "steel",
  "leaf"
 ],
 "chain": [
  "steel",
  "steel",
  "leaf"
 ],
 "bicycle": [
  "lacquer",
  "steel",
  "moonstone"
 ],
 "unicycle": [
  "steel",
  "steel",
  "leaf"
 ],
 "wheelchair": [
  "steel",
  "steel",
  "leaf"
 ],
 "shopping cart": [
  "steel",
  "steel",
  "leaf"
 ],
 "colander": [
  "steel",
  "steel",
  "leaf"
 ],
 "birdcage": [
  "steel",
  "steel",
  "leaf"
 ],
 "portcullis": [
  "steel",
  "steel",
  "leaf"
 ],
 "jungle gym": [
  "steel",
  "steel",
  "leaf"
 ],
 "ferris wheel": [
  "steel",
  "lacquer",
  "candy"
 ],
 "teapot": [
  "porcelain",
  "porcelain",
  "gold"
 ],
 "pitcher": [
  "porcelain",
  "steel",
  "leaf"
 ],
 "boot": [
  "indigo",
  "moonstone",
  "steel"
 ],
 "backpack": [
  "indigo",
  "lacquer",
  "steel"
 ],
 "tent": [
  "indigo",
  "steel",
  "leaf"
 ],
 "bead": [
  "indigo",
  "steel",
  "leaf"
 ],
 "tennis racket": [
  "indigo",
  "steel",
  "leaf"
 ],
 "hat": [
  "sail",
  "steel",
  "leaf"
 ],
 "life ring": [
  "sail",
  "traffic",
  "dough"
 ],
 "hard hat": [
  "ochre",
  "steel",
  "leaf"
 ],
 "trophy": [
  "gold",
  "steel",
  "leaf"
 ],
 "saxophone": [
  "gold",
  "steel",
  "leaf"
 ],
 "lighthouse": [
  "masonry",
  "steel",
  "leaf"
 ],
 "igloo": [
  "snow",
  "steel",
  "leaf"
 ],
 "barn": [
  "lacquer",
  "steel",
  "leaf"
 ],
 "pagoda": [
  "lacquer",
  "steel",
  "leaf"
 ],
 "tricycle": [
  "lacquer",
  "steel",
  "leaf"
 ],
 "megaphone": [
  "copper",
  "steel",
  "leaf"
 ],
 "button": [
  "shell",
  "steel",
  "leaf"
 ],
 "arch": [
  "limestone",
  "steel",
  "leaf"
 ],
 "desk globe": [
  "leaf",
  "gold",
  "steel"
 ],
 "lamp": [
  "clay",
  "steel",
  "leaf"
 ],
 "funnel": [
  "clay",
  "steel",
  "leaf"
 ],
 "tire": [
  "moonstone",
  "steel",
  "leaf"
 ],
 "window": [
  "glass",
  "steel",
  "leaf"
 ]
};

function mapDefs(defs){return defs.map((d,i)=>({id:i,name:d[0],aliases:d[1].slice(),sway:d[3]?0.45:0.25,mesh:fit(d[2]())}))}
function buildLevels(){return {medium:mapDefs(MEDIUM),hard:mapDefs(HARD)}}
const API={MEDIUM,HARD,mapDefs,buildLevels,OBJ_MATS};
return API;
})();
// END T2060U FROZEN LEVEL EXPORT
const LEVELS={easy:SHAPES,medium:EXTRA_LEVELS.mapDefs(EXTRA_LEVELS.MEDIUM),hard:EXTRA_LEVELS.mapDefs(EXTRA_LEVELS.HARD)};
const API={LEVELS,LEVEL_MATERIALS:EXTRA_LEVELS.OBJ_MATS,article,displayPose,SHAPES:SHAPES,isCorrect:isCorrect,norm:norm,castShadow:castShadow,pose:pose,WALL_Z:WALL_Z,rotX:rotX,rotY:rotY};
if(typeof module!=="undefined"&&module.exports)module.exports=API;else root.PlatoShapes=API;
})(typeof self!=="undefined"?self:this);
