// Plato's Cave: offline cache + quiet updates (same pattern as Shark Attack). The build id lives in version.json, which is NEVER cached (always fetched with no-store).
// Each build gets its own cache PREFIX+build. A new build is downloaded in the background, written only when EVERY file
// fetched OK, and marked "pending". The switch happens on the next launch (navigation), never mid-play.
// Session pin: every client (tab/PWA window) is pinned to the build it launched with and is served ONLY from that
// build's cache. A new navigation may take a completed pending build; already-open clients keep their old cache,
// which is deleted only after every client pinned to it has closed (checked with clients.matchAll).
const PREFIX="platocave-v",META=PREFIX+"meta";
const SHELL=["./","index.html","style.css?v=2","shapes.js?v=4","sfx.js?v=1","game.js?v=5","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","assets/cave-wall.jpg","assets/intro.mp4","assets/intro-music.mp3"];
const VERSION_URL="version.json";
// Meta read-modify-writes are serialized so concurrent fetches cannot lose pins.
let metaLock=Promise.resolve();function withMeta(fn){const p=metaLock.then(async()=>{const m=await getMeta();const r=await fn(m);await setMeta(m);return r});metaLock=p.catch(()=>{});return p}
async function getMeta(){try{const c=await caches.open(META),r=await c.match("meta");return r?await r.json():{}}catch(e){return {}}}
async function setMeta(m){const c=await caches.open(META);await c.put("meta",new Response(JSON.stringify(m),{headers:{"content-type":"application/json"}}))}
async function remoteBuild(){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),8000);let r;try{r=await fetch(VERSION_URL,{cache:"no-store",signal:ac.signal})}finally{clearTimeout(t)}if(!r.ok)throw new Error("version "+r.status);const j=await r.json();if(!j||!j.build)throw new Error("no build");return String(j.build)}
const MANIFEST="__build_manifest__",activeStages=new Set();let stageId=0;
// Fixed pre-manifest shell contract; future SHELL additions must not invalidate older caches.
const LEGACY_CORE=["index.html","style.css","sfx.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","assets/cave-wall.jpg","assets/intro.mp4","assets/intro-music.mp3"];
async function cacheComplete(name,build){if(!(await caches.has(name)))return false;const c=await caches.open(name),manifest=await c.match(MANIFEST);
 if(manifest){try{const m=await manifest.json();if(m.build!==String(build)||!Array.isArray(m.keys)||!m.keys.length)return false;for(const u of m.keys)if(!(await c.match(u)))return false;return true}catch(_){return false}}
 // Legacy cache: use its OWN script queries, not this worker's new SHELL queries.
 const keys=(await c.keys()).map(r=>new URL(r.url));
 for(const script of ["game.js","shapes.js"])if(!keys.some(u=>u.pathname.endsWith("/"+script)&&u.searchParams.get("v")===String(build)))return false;
 for(const path of LEGACY_CORE)if(!keys.some(u=>u.pathname.endsWith("/"+path)))return false;return true}
async function complete(build){return !!build&&cacheComplete(PREFIX+build,build)}
async function liveClients(){return self.clients.matchAll({includeUncontrolled:true,type:"all"})}
// Migrating workers must record unpinned old windows before current promotion, cleanup or claim.
async function pinOpen(m){m.pins=m.pins||{};let old=m.current;
 if(!(await complete(old))){old=null;for(const name of await caches.keys()){const b=name.slice(PREFIX.length);if(name.startsWith(PREFIX)&&await complete(b)){old=b;break}}if(old)m.current=old}
 for(const c of await liveClients())if(!m.pins[c.id]&&old)m.pins[c.id]=old}
async function inUse(m,build){const live=new Set((await liveClients()).map(c=>c.id));return Object.keys(m.pins||{}).some(id=>live.has(id)&&m.pins[id]===build)}
// all-or-nothing download into an unpublished identity. Never rewrite a live tab's cache.
async function download(build){const stage=PREFIX+build+"-staging-"+Date.now()+"-"+(++stageId);activeStages.add(stage);
 try{const res=await Promise.all(SHELL.map(u=>fetch(new Request(u,{cache:"reload"})).then(r=>{if(!r.ok||r.status!==200)throw new Error(u+" "+r.status);return r})));
 const c=await caches.open(stage);for(let i=0;i<SHELL.length;i++)await c.put(SHELL[i],res[i]);
 await c.put(MANIFEST,new Response(JSON.stringify({build:String(build),keys:SHELL}),{headers:{"content-type":"application/json"}}));
 if(!(await cacheComplete(stage,build)))throw new Error("incomplete staging");
 await withMeta(async m=>{await pinOpen(m);if(await inUse(m,build)){
   // A rollback to an already-live immutable build reuses its complete bytes, never swaps them.
   if(!(await complete(build)))throw new Error("target in use");return}
  await caches.delete(PREFIX+build);const dest=await caches.open(PREFIX+build);
  try{for(const req of await c.keys())await dest.put(req,await c.match(req));if(!(await complete(build)))throw new Error("incomplete publish")}
  catch(e){await caches.delete(PREFIX+build);throw e}});
 }finally{activeStages.delete(stage);await caches.delete(stage)}}
// Keep META, current, pending, and every live pin. Claim only after pinOpen has been persisted.
async function cleanup(m){await pinOpen(m);const alive=new Set((await liveClients()).map(c=>c.id)),pins=m.pins||{};
 for(const id of Object.keys(pins))if(!alive.has(id))delete pins[id];m.pins=pins;
 const keep=new Set([META,PREFIX+m.current,PREFIX+m.pending,...activeStages]);for(const id in pins)keep.add(PREFIX+pins[id]);
 for(const k of await caches.keys())if(k.startsWith(PREFIX)&&!keep.has(k))await caches.delete(k)}
async function ranged(res,rg){const b=await res.blob(),size=b.size,m=/^bytes=(\d*)-(\d*)$/.exec(rg.trim());
 const invalid=()=>new Response(null,{status:416,headers:{"content-range":"bytes */"+size,"accept-ranges":"bytes","content-length":"0"}});
 if(!m||(!m[1]&&!m[2])||!size)return invalid();
 let a,e;if(!m[1]){const n=Number(m[2]);if(!Number.isSafeInteger(n)||n<=0)return invalid();a=Math.max(0,size-n);e=size-1}
 else{a=Number(m[1]);e=m[2]?Number(m[2]):size-1;if(!Number.isSafeInteger(a)||!Number.isSafeInteger(e)||a>=size||e<a)return invalid();e=Math.min(e,size-1)}
 return new Response(b.slice(a,e+1),{status:206,headers:{"content-type":res.headers.get("content-type")||"application/octet-stream","content-range":"bytes "+a+"-"+e+"/"+size,"content-length":String(e-a+1),"accept-ranges":"bytes"}})}
let checking=null;
function checkUpdate(){if(checking)return checking;checking=(async()=>{try{const b=await remoteBuild(),m=await getMeta();
  if(b===m.current||b===m.pending)return;await download(b);await withMeta(m2=>{m2.pending=b})}catch(e){/* silent: offline or broken update keeps the working build */try{await withMeta(m=>{m.lastErr=String(e).slice(0,120)})}catch(_){}}finally{checking=null}})();return checking}
// Next launch: promote a COMPLETE pending build for this new navigation and future launches. Nothing is deleted here;
// cleanup() keeps every build an open client is still pinned to.
async function switchIfPending(m){if(m.pending&&m.pending!==m.current&&await complete(m.pending)){m.current=m.pending;delete m.pending}else if(m.pending&&!(await complete(m.pending)))delete m.pending;return m}
// Which build serves this request: the client's pin, or (new launch / first sight) the current build, then pinned.
async function buildFor(e){const r=e.request,nav=r.mode==="navigate",id=nav?(e.resultingClientId||e.clientId||""):(e.clientId||"");
 return withMeta(async m=>{m.pins=m.pins||{};if(!nav&&id&&m.pins[id])return m.pins[id];if(nav)await switchIfPending(m);if(id&&m.current)m.pins[id]=m.current;return m.current})}
async function fromBuild(build,r){if(!build||!(await caches.has(PREFIX+build)))return null;const c=await caches.open(PREFIX+build);
 // exact URL first, then ignoreSearch only inside the SAME pinned build's cache; never another build's cache
 let hit=await c.match(r.url)||await c.match(r.url,{ignoreSearch:true});if(!hit&&r.mode==="navigate")hit=await c.match("index.html");return hit||null}
self.addEventListener("install",e=>{e.waitUntil((async()=>{await withMeta(pinOpen);
 try{const b=await remoteBuild(),m=await getMeta();if(b!==m.current&&b!==m.pending){await download(b);await withMeta(async m2=>{if(await complete(m2.current))m2.pending=b;else m2.current=b})}}
 catch(_){/* silent: keep working old cache on failed update */}await self.skipWaiting()})())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{await withMeta(async m=>{await pinOpen(m);if(m.current)await cleanup(m)});await self.clients.claim()})())});
self.addEventListener("message",e=>{if(e.data==="check")e.waitUntil(checkUpdate())});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(r.method!=="GET"||u.origin!==location.origin)return;
 if(u.pathname.endsWith("/"+VERSION_URL)){e.respondWith(fetch(r,{cache:"no-store"}).catch(()=>new Response("{}",{status:503})));return}
 e.respondWith((async()=>{const build=await buildFor(e),hit=await fromBuild(build,r);
  if(hit){const rg=r.headers.get("range");if(rg&&hit.status===200)return ranged(hit,rg);return hit}
  return fetch(r)})());
 if(r.mode==="navigate")e.waitUntil((async()=>{await checkUpdate();try{await withMeta(cleanup)}catch(_){}})())});
