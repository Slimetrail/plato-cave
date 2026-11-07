// Plato's Cave - 50 original procedural 3D shapes. Every shadow is cast from the SAME mesh by a point light (the fire)
// projected onto the wall plane. Works in the browser and in node (for tests).
(function(root){
"use strict";
const PI=Math.PI;
function M(v,f){return {v:v,f:f}}
function merge(){const v=[],f=[];for(const m of arguments){const o=v.length;for(const p of m.v)v.push(p.slice());for(const t of m.f)f.push([t[0]+o,t[1]+o,t[2]+o])}return M(v,f)}
function rotX(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c]}
function rotY(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c]}
function rotZ(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]]}
function xf(m,o){o=o||{};const s=o.s===undefined?[1,1,1]:(typeof o.s==="number"?[o.s,o.s,o.s]:o.s),r=o.r||[0,0,0],t=o.t||[0,0,0];
 return M(m.v.map(p=>{let q=[p[0]*s[0],p[1]*s[1],p[2]*s[2]];q=rotX(q,r[0]);q=rotY(q,r[1]);q=rotZ(q,r[2]);return [q[0]+t[0],q[1]+t[1],q[2]+t[2]]}),m.f.map(x=>x.slice()))}
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
["tree",["pine","pine tree","christmas tree"],()=>merge(cone(0.9,1.2),xf(cone(0.7,1),{t:[0,0.65,0]}),xf(cyl(0.2,0.6),{t:[0,-0.85,0]}))],
["mushroom",["toadstool"],()=>merge(lathe([[0,0.2],[1.1,0.2],[0.9,0.6],[0.5,0.9],[0,1]]),cyl(0.3,1.4))],
["snowman",["snow man"],()=>merge(xf(sphere(0.8),{t:[0,-0.8,0]}),xf(sphere(0.55),{t:[0,0.3,0]}),xf(sphere(0.38),{t:[0,1.1,0]}))],
["lollipop",["lolly","sucker","candy"],()=>merge(xf(cyl(0.75,0.25),{r:[PI/2,0,0],t:[0,0.6,0]}),xf(cyl(0.08,1.8),{t:[0,-0.7,0]})),1],
["ice cream",["ice cream cone","icecream","cone of ice cream"],()=>merge(xf(cone(0.6,1.5),{r:[PI,0,0],t:[0,-0.55,0]}),xf(sphere(0.65),{t:[0,0.4,0]}))],
["bell",[],()=>lathe([[0,1],[0.18,1],[0.28,0.85],[0.35,0.5],[0.45,0],[0.65,-0.5],[0.9,-0.8],[0.95,-0.9],[0,-0.9]])],
["bottle",[],()=>lathe([[0,-1.2],[0.6,-1.2],[0.6,0.1],[0.25,0.6],[0.22,1.1],[0.28,1.2],[0,1.2]])],
["vase",["pot","jar","urn"],()=>lathe([[0,-1],[0.45,-1],[0.85,-0.4],[0.8,0.2],[0.4,0.7],[0.6,1.05],[0,1.05]])],
["cup",["mug"],()=>merge(lathe([[0,-0.8],[0.6,-0.8],[0.65,0.8],[0,0.8]]),xf(torus(0.38,0.09,20,8),{t:[0.7,0,0]})),1],
["dumbbell",["weight","barbell"],()=>merge(xf(cyl(0.12,1.8),{r:[0,0,PI/2]}),xf(sphere(0.5),{t:[-1,0,0]}),xf(sphere(0.5),{t:[1,0,0]}))],
["hourglass",["sand timer","egg timer"],()=>lathe([[0,-1.2],[0.8,-1.2],[0.75,-1],[0.12,0],[0.75,1],[0.8,1.2],[0,1.2]])],
["candle",[],()=>merge(cyl(0.35,1.6),xf(lathe([[0,-0.2],[0.18,0],[0,0.45]]),{t:[0,1,0]}),xf(cyl(0.03,0.2),{t:[0,0.85,0]}))],
["table",["desk"],()=>merge(box(2,0.15,0.8),xf(box(0.15,1,0.15),{t:[-0.85,-0.55,0]}),xf(box(0.15,1,0.15),{t:[0.85,-0.55,0]})),1],
["chair",["seat","stool"],()=>merge(box(1,0.12,0.9),xf(box(0.12,1,0.12),{t:[-0.44,-0.55,0]}),xf(box(0.12,1,0.12),{t:[0.44,-0.55,0]}),xf(box(0.12,1.1,0.9),{t:[-0.44,0.6,0]})),1],
["ladder",[],()=>{const ms=[xf(box(0.12,2.4,0.12),{t:[-0.5,0,0]}),xf(box(0.12,2.4,0.12),{t:[0.5,0,0]})];for(let i=0;i<5;i++)ms.push(xf(box(1,0.1,0.1),{t:[0,-0.9+i*0.45,0]}));return merge.apply(null,ms)},1],
["key",[],()=>merge(xf(torus(0.38,0.12,20,8),{t:[-0.9,0,0]}),xf(box(1.6,0.18,0.15),{t:[0.2,0,0]}),xf(box(0.15,0.4,0.15),{t:[0.8,-0.25,0]}),xf(box(0.15,0.3,0.15),{t:[0.5,-0.2,0]})),1],
["hammer",["mallet"],()=>merge(xf(box(0.2,2,0.2),{t:[0,-0.3,0]}),xf(extrude([[-0.9,0.65],[0.5,0.65],[0.5,1.15],[-0.7,1.15],[-0.9,1.0]],0.4),{})),1],
["sword",["blade","knife"],()=>extrude([[-0.08,-1.3],[0.08,-1.3],[0.08,-0.8],[0.45,-0.8],[0.45,-0.65],[0.15,-0.65],[0.15,1.0],[0,1.35],[-0.15,1.0],[-0.15,-0.65],[-0.45,-0.65],[-0.45,-0.8],[-0.08,-0.8]],0.15)],
["axe",["ax","hatchet"],()=>merge(xf(box(0.18,2.2,0.18),{}),extrude([[0.05,0.3],[0.8,0.1],[0.95,0.6],[0.8,1.1],[0.05,0.9]],0.12)),1],
["umbrella",["parasol"],()=>{const p=[];for(let i=0;i<=10;i++){const t=PI/2*i/10;p.push([1.2*Math.sin(t),0.9*Math.cos(t)-0.1])}p.push([0,-0.1]);const hook=[];for(let i=0;i<=10;i++){const a=PI+PI*i/10;hook.push([0.2+0.2*Math.cos(a),-1.1+0.2*Math.sin(a)])}for(let i=10;i>=0;i--){const a=PI+PI*i/10;hook.push([0.2+0.32*Math.cos(a),-1.1+0.32*Math.sin(a)])}
  return merge(lathe(p),xf(cyl(0.05,1.1),{t:[0,-0.55,0]}),extrude(hook,0.1))}],
["fish",[],()=>extrude([[1.2,0],[0.9,0.35],[0.3,0.55],[-0.3,0.4],[-0.75,0.05],[-1.2,0.5],[-1.05,0],[-1.2,-0.5],[-0.75,-0.05],[-0.3,-0.4],[0.3,-0.55],[0.9,-0.35]])],
["bird",["dove","seagull","pigeon","eagle","carved eagle","wooden eagle"],eagle],
["boat",["ship","sailboat","sail boat"],()=>merge(extrude([[-1.3,-0.4],[1.3,-0.4],[0.9,-0.9],[-0.9,-0.9]],0.6),xf(box(0.08,1.8,0.08),{t:[0,0.5,0]}),extrude([[0.08,-0.2],[1,-0.2],[0.08,1.3]],0.05)),1],
["car",["auto","automobile"],()=>merge(extrude([[-1.3,-0.3],[1.3,-0.3],[1.3,0.15],[0.6,0.2],[0.3,0.7],[-0.6,0.7],[-0.9,0.2],[-1.3,0.15]],0.8),xf(cyl(0.3,0.9),{r:[PI/2,0,0],t:[-0.75,-0.35,0]}),xf(cyl(0.3,0.9),{r:[PI/2,0,0],t:[0.75,-0.35,0]})),1],
["rocket",["rocket ship","spaceship"],()=>merge(lathe([[0,-1],[0.4,-1],[0.45,0.2],[0.3,0.8],[0,1.3]]),extrude([[0.4,-1.1],[0.85,-1.3],[0.4,-0.3]],0.08),extrude([[-0.4,-1.1],[-0.4,-0.3],[-0.85,-1.3]],0.08))],
["lightning",["lightning bolt","bolt","thunderbolt","thunder"],()=>extrude([[0.2,1.3],[-0.6,0],[0,0],[-0.4,-1.3],[0.7,0.25],[0.1,0.25],[0.6,1.3]].reverse())],
["crown",[],()=>extrude([[-1,-0.6],[1,-0.6],[1,0.7],[0.6,0.15],[0.3,0.8],[0,0.2],[-0.3,0.8],[-0.6,0.15],[-1,0.7]])],
["letter t",["t"],()=>extrude([[-0.2,-1.1],[0.2,-1.1],[0.2,0.7],[1,0.7],[1,1.1],[-1,1.1],[-1,0.7],[-0.2,0.7]])],
["letter l",["l"],()=>extrude([[-0.6,-1.1],[0.8,-1.1],[0.8,-0.7],[-0.2,-0.7],[-0.2,1.1],[-0.6,1.1]])],
["letter h",["h"],()=>extrude([[-0.9,-1.1],[-0.5,-1.1],[-0.5,-0.2],[0.5,-0.2],[0.5,-1.1],[0.9,-1.1],[0.9,1.1],[0.5,1.1],[0.5,0.2],[-0.5,0.2],[-0.5,1.1],[-0.9,1.1]])],
["cloud",[],()=>merge(xf(sphere(0.6),{t:[-0.7,-0.1,0]}),xf(sphere(0.8),{t:[0,0.2,0]}),xf(sphere(0.6),{t:[0.75,-0.05,0]}),xf(box(2,0.6,0.8),{t:[0,-0.35,0]}))],
["flower",["daisy","rose"],()=>{const ms=[xf(box(0.12,1.4,0.12),{t:[0,-0.8,0]}),xf(cyl(0.25,0.2),{r:[PI/2,0,0],t:[0,0.4,0.05]})];for(let i=0;i<6;i++){const a=2*PI*i/6;ms.push(xf(sphere(1,12),{s:[0.42,0.2,0.1],r:[0,0,a],t:[0.45*Math.cos(a),0.4+0.45*Math.sin(a),0]}))}ms.push(xf(sphere(1,12),{s:[0.35,0.12,0.08],r:[0,0,0.5],t:[0.3,-0.7,0]}));return merge.apply(null,ms)}],
["tower",["castle","castle tower","rook"],()=>{const ms=[xf(cyl(0.78,1.45,32),{t:[0,-0.35,0]})];
 // Deep, genuinely open gaps above the shaft; rear merlons align with front ones.
 for(const x of [-0.59,0,0.59])for(const z of [-0.22,0.22])ms.push(xf(box(0.29,0.64,0.25),{t:[x,0.67,z]}));return merge.apply(null,ms)}],
["anchor",[],()=>{const arc=[];for(let i=0;i<=16;i++){const a=PI+PI*i/16;arc.push([0.85*Math.cos(a),-0.3+0.85*Math.sin(a)])}for(let i=16;i>=0;i--){const a=PI+PI*i/16;arc.push([0.62*Math.cos(a),-0.3+0.62*Math.sin(a)])}
  return merge(extrude(arc,0.15),xf(box(0.18,1.9,0.15),{t:[0,0.05,0]}),xf(box(0.9,0.15,0.15),{t:[0,0.6,0]}),xf(torus(0.2,0.07,16,6),{t:[0,1.15,0]}))}],
];
function fit(m){let c=[0,0,0],R=0;const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const p of m.v)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k])}
 c=[0,1,2].map(k=>(lo[k]+hi[k])/2);for(const p of m.v)R=Math.max(R,Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]));const s=1.25/R;return M(m.v.map(p=>[(p[0]-c[0])*s,(p[1]-c[1])*s,(p[2]-c[2])*s]),m.f)}
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
const API={article,displayPose,SHAPES:SHAPES,isCorrect:isCorrect,norm:norm,castShadow:castShadow,pose:pose,WALL_Z:WALL_Z,rotX:rotX,rotY:rotY};
if(typeof module!=="undefined"&&module.exports)module.exports=API;else root.PlatoShapes=API;
})(typeof self!=="undefined"?self:this);
