# Start a local-only server in game/, then PLATO_URL=http://127.0.0.1:19543/ python3 tests/browser_check.py
import asyncio,sys,os,json
from pathlib import Path
from playwright.async_api import async_playwright
U=os.environ.get('PLATO_URL','http://127.0.0.1:19543/')
OUT=Path('/workspace/plato-cave/game-export/r3-fixes');OUT.mkdir(parents=True,exist_ok=True)
async def main():
  res=[]
  def ok(n,c):res.append((n,bool(c)));print('PASS' if c else 'FAIL',n,flush=True)
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']);c=await b.new_context(viewport={'width':1280,'height':800},has_touch=True);pg=await c.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(U);await pg.evaluate('navigator.serviceWorker.ready');await pg.reload();await pg.wait_for_function('!!navigator.serviceWorker.controller')
    await pg.click('#startBtn');await pg.wait_for_timeout(2100)
    st=await pg.evaluate('({v:!video.paused,t:video.currentTime,m:!music.paused,e:video.error?.code,s:__plato.state.introState})')
    print('REAL MEDIA',st,flush=True);ok('music plays with intro',st['m'])
    await pg.click('#skipBtn');await pg.wait_for_timeout(1800)
    st=await pg.evaluate('({s:__plato.state.introState,m:!music.paused,loop:music.loop,vp:video.paused,t:video.currentTime,title:__plato.state.titleReady})')
    print('REAL SKIP',st,flush=True)
    await pg.screenshot(path=str(OUT/'skip-after-2s.png'))
    if st['s']=='hold':
      ok('real decoded Skip title hold, music continues',st['t']>=23 and st['m'] and st['loop'] and st['vp'] and st['title'])
      await pg.mouse.click(600,400);ok('real title tap starts game',await pg.is_visible('#game'))
    else:
      print('NOTE: local browser could not seek title; real-video hold not visually proven. Kept playing rather than freezing black.',flush=True)
      ok('failed real seek does not freeze black/zero frame',not st['vp'])
      await pg.evaluate('video.pause();startGame()')
    await pg.wait_for_timeout(300);await pg.screenshot(path=str(OUT/'painted-wall-guess.png'))
    await pg.fill('#guess','Ball');await pg.press('#guess','Enter');await pg.wait_for_timeout(600)
    st=await pg.evaluate('__plato.state');ok('right answer +100',st['score']==100 and st['lastResult']==True)
    await pg.click('#nextBtn');await pg.evaluate('()=>{window.__sfx=0;const w=PlatoSfx.wrong;PlatoSfx.wrong=()=>{window.__sfx++;return w()}}')
    await pg.fill('#guess','banana');await pg.click('#goBtn');st=await pg.evaluate('({s:__plato.state,n:window.__sfx})');ok('wrong answer: 0 points, moan/scream played',st['s']['score']==100 and st['n']==1)
    await pg.click('#nextBtn');await pg.click('#goBtn');ok('empty guess ignored',(await pg.evaluate('__plato.state'))['phase']=='guess')
    for i in range(2,50):await pg.evaluate('__plato.submit("x");__plato.next()')
    ok('results after 50 rounds',await pg.is_visible('#end'))
    for name in ['ball','cube','ice cream','bird','sword','vase','egg','mushroom','tower','cone','pyramid']:
      await pg.evaluate('(name)=>{startGame();round=PlatoShapes.SHAPES.findIndex(s=>s.name===name);newRound()}',name)
      await pg.wait_for_timeout(200);await pg.screenshot(path=str(OUT/f"{name.replace(' ','-')}-shadow.png"))
      await pg.evaluate('__plato.submit("x")');await pg.wait_for_timeout(700);await pg.screenshot(path=str(OUT/f"{name.replace(' ','-')}-reveal.png"))
    # Exercise all material brushes at genuinely short sizes, including caller-supplied negatives.
    for width,height in [(400,380),(400,120),(400,1)]:
      await pg.set_viewport_size({'width':width,'height':height})
      await pg.evaluate("()=>{startGame();for(const sp of PlatoShapes.SHAPES){drawObject(sp,1000,W/2,H/2,Math.min(W,H-150)*.27);drawShadow(sp,1000)}drawWall(1000);round=PlatoShapes.SHAPES.findIndex(s=>s.name==='ice cream');newRound();__plato.submit('x')}")
      await pg.wait_for_timeout(100)
      if height==380:await pg.screenshot(path=str(OUT/'short-viewport-400x380.png'))
      ok(f'all 50 materials draw without IndexSizeError at {width}x{height}',not errs)
    await pg.set_viewport_size({'width':1280,'height':800})
    # Pretend keyboard: real offset + shrunk visual viewport, dispatched resize AND scroll.
    await pg.evaluate('''()=>{startGame();for(const [k,v] of Object.entries({width:390,height:320,offsetTop:140,offsetLeft:35}))Object.defineProperty(visualViewport,k,{configurable:true,get:()=>v});visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'))}''')
    rect=await pg.evaluate('''()=>Object.fromEntries(['cv','msg','bar','hud'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}]}))''')
    ok('keyboard-offset bar stays inside visual viewport',rect['bar']['y']>=140 and rect['bar']['bottom']<=460.1 and rect['bar']['x']==35 and rect['bar']['right']==425)
    ok('canvas/message/HUD follow viewport offset',rect['cv']['x']==35 and rect['cv']['y']==140 and rect['cv']['width']==390 and rect['cv']['height']==320 and rect['msg']['y']>=140 and rect['hud']['y']>=140)
    await pg.screenshot(path=str(OUT/'keyboard-offset.png'))
    # Deterministic video state regressions, explicitly NOT visual proof of locked media.
    await pg.reload();await pg.evaluate('''()=>{
      window.mockVideo={time:0,ready:4,paused:true,seeking:false,plays:0};
      for(const [key,field] of [['currentTime','time'],['readyState','ready'],['paused','paused'],['seeking','seeking']])Object.defineProperty(video,key,{configurable:true,get:()=>mockVideo[field],set:v=>mockVideo[field]=v});
      Object.defineProperty(video,'duration',{configurable:true,get:()=>mockVideo.dur??25.36});Object.defineProperty(video,'seekable',{configurable:true,get:()=>({length:mockVideo.noseek?0:1,end:()=>mockVideo.dur??25.36})});
      video.play=()=>{mockVideo.paused=false;mockVideo.plays++;return Promise.resolve()};video.pause=()=>{mockVideo.paused=true};
      video.requestVideoFrameCallback=cb=>setTimeout(()=>cb(performance.now(),{mediaTime:mockVideo.time}),0);
      const realPlay=music.play.bind(music);window.musicCalls=0;music.play=()=>{musicCalls++;return musicCalls===1?Promise.reject(new Error('blocked unlock')):realPlay()};
    }''')
    await pg.click('#startBtn');await pg.wait_for_timeout(80);ok('music rejection is remembered',(await pg.evaluate('__plato.state'))['musicNeedsUnlock'])
    await pg.dispatch_event('#intro','pointerdown');await pg.wait_for_timeout(100);ok('later intro gesture retries rejected music',await pg.evaluate('musicCalls>=2&&!__plato.state.musicNeedsUnlock&&!music.paused'))
    await pg.click('#skipBtn');ok('Skip waits for seeked instead of immediate hold',await pg.evaluate('__plato.state.introState==="playing"&&__plato.state.skipPending&&!video.paused'))
    await pg.evaluate('video.dispatchEvent(new Event("seeked"))');await pg.wait_for_timeout(100)
    ok('seeked + decoded title enters hold and keeps music looping',await pg.evaluate('__plato.state.introState==="hold"&&video.paused&&!music.paused&&music.loop&&__plato.state.titleReady'))
    await pg.mouse.click(600,400);ok('hold tap starts game',await pg.is_visible('#game'))
    # Finish fade before restarting so the prior fade cannot interfere with next music test.
    await pg.wait_for_timeout(1100)
    await pg.evaluate('startIntro();mockVideo.time=23.05;video.dispatchEvent(new Event("timeupdate"))')
    ok('readable title is tappable before ended',await pg.evaluate('__plato.state.introState==="playing"&&__plato.state.titleReady&&document.getElementById("tapHint").classList.contains("on")'))
    await pg.mouse.click(600,400);ok('tap during title playback starts game',await pg.is_visible('#game'));await pg.wait_for_timeout(1100)
    await pg.evaluate('startIntro();document.getElementById("skipBtn").click();mockVideo.time=0;mockVideo.ready=0;video.dispatchEvent(new Event("seeked"))')
    ok('failed zero-time seek keeps playing, no title hint or black hold',await pg.evaluate('__plato.state.introState==="playing"&&!__plato.state.titleReady&&!video.paused&&!__plato.state.skipPending'))
    await pg.evaluate('mockVideo.time=25.36;mockVideo.ready=4;video.dispatchEvent(new Event("ended"))')
    ok('natural ended holds decoded title with music continuing',await pg.evaluate('__plato.state.introState==="hold"&&video.paused&&!music.paused'))
    await pg.evaluate('startIntro();mockVideo.time=3;mockVideo.noseek=true;mockVideo.dur=NaN;document.getElementById("skipBtn").click()')
    ok('first uncached Skip is remembered and keeps playing (no black hold)',await pg.evaluate('__plato.state.introState==="playing"&&!video.paused&&!__plato.state.skipPending'))
    await pg.evaluate('mockVideo.noseek=false;mockVideo.dur=25.36;video.dispatchEvent(new Event("progress"))')
    ok('remembered Skip seeks once seekable',await pg.evaluate('__plato.state.skipPending&&Math.abs(mockVideo.time-25.24)<0.01'))
    await pg.evaluate('video.dispatchEvent(new Event("seeked"))');await pg.wait_for_timeout(100)
    ok('deferred Skip then holds decoded title',await pg.evaluate('__plato.state.introState==="hold"&&video.paused'))
    await pg.evaluate('startIntro();mockVideo.noseek=true;mockVideo.dur=NaN;mockVideo.ready=1;document.getElementById("skipBtn").click();mockVideo.dur=25.36;mockVideo.ready=2;video.dispatchEvent(new Event("canplay"))')
    ok('remembered Skip with permanently empty ranges seeks once data ready',await pg.evaluate('__plato.state.skipPending&&mockVideo.time>23&&!video.paused'))
    await pg.evaluate('video.dispatchEvent(new Event("seeked"))');await pg.wait_for_timeout(100)
    ok('empty-range decoded title safely held',await pg.evaluate('__plato.state.introState==="hold"&&video.paused'))
    await pg.evaluate('mockVideo.noseek=false;startIntro();for(let i=0;i<6;i++)document.getElementById("skipBtn").click();mockVideo.time=25.24;mockVideo.ready=4;video.dispatchEvent(new Event("seeked"))');await pg.wait_for_timeout(3800)
    ok('rapid Skips: no stale fallback resumes after successful seek',await pg.evaluate('__plato.state.introState==="hold"&&video.paused'))
    keys=await pg.evaluate('caches.keys()');ok('build 4 cache installed', 'platocave-v4' in keys)
    await c.set_offline(True);await pg.reload();await pg.wait_for_timeout(500);ok('works offline after first load',await pg.is_visible('#startBtn'))
    rr=await pg.evaluate('''async()=>{const r=await fetch('assets/intro.mp4',{headers:{range:'bytes=-4096'}});return {s:r.status,cr:r.headers.get('content-range'),size:(await r.arrayBuffer()).byteLength}}''')
    ok('offline seek byte range served from cached video',rr['s']==206 and rr['size']==4096 and rr['cr'].startswith('bytes '))
    rr=await pg.evaluate('''async()=>{const r=await fetch('assets/intro.mp4',{headers:{range:'bytes=99-9'}});return {s:r.status,cr:r.headers.get('content-range')}}''')
    ok('offline reversed range returns 416 not illegal 206',rr['s']==416 and rr['cr'].startswith('bytes */'))
    await pg.click('#startBtn');await pg.wait_for_timeout(500);ok('music plays offline',await pg.evaluate('!music.paused'))
    ok('no page errors',not errs);print(errs,flush=True)
    # Actual worker migration, not a source-pattern assertion: manufacture a complete older
    # cache with no manifest/pins, leave its window open, then install this worker anew.
    upgrade_ctx=await b.new_context();old=await upgrade_ctx.new_page();await old.goto(U)
    await old.evaluate('navigator.serviceWorker.ready');await old.reload();await old.wait_for_function('!!navigator.serviceWorker.controller')
    await old.evaluate('''async()=>{
      const src=await caches.open('platocave-v4'),dst=await caches.open('platocave-v2');
      for(const req of await src.keys()){if(req.url.endsWith('__build_manifest__'))continue;
        const url=req.url.replace(/([?]v=)4$/,(_,a)=>a+'2');await dst.put(url,await src.match(req))}
      const meta=await caches.open('platocave-vmeta');await meta.put('meta',new Response(JSON.stringify({current:'2'})));
      await navigator.serviceWorker.register('sw.js?r3-upgrade',{scope:'./'});
    }''')
    await old.wait_for_function('''async()=>{const c=await caches.open('platocave-vmeta'),r=await c.match('meta'),m=await r.json();return m.current==='2'&&m.pending==='4'&&Object.values(m.pins||{}).includes('2')}''')
    await old.wait_for_function('navigator.serviceWorker.controller.scriptURL.includes("r3-upgrade")')
    migration=await old.evaluate('''async()=>{const m=await (await (await caches.open('platocave-vmeta')).match('meta')).json();return {m,keys:await caches.keys()}}''')
    ok('actual install pins unpinned legacy tab before claim; build 4 pending',migration['m']['current']=='2' and migration['m']['pending']=='4' and 'platocave-v2' in migration['keys'])
    text=await old.evaluate('fetch("game.js?v=2").then(r=>r.text())')
    ok('legacy client still reads its v2 script key', 'const TITLE_TIME=23.0' in text)
    new=await upgrade_ctx.new_page();await new.goto(U);await new.wait_for_function('!!navigator.serviceWorker.controller')
    migration=await new.evaluate('''async()=>({m:await (await (await caches.open('platocave-vmeta')).match('meta')).json(),keys:await caches.keys()})''')
    ok('actual next launch promotes 4 but retains old live cache',migration['m']['current']=='4' and 'platocave-v2' in migration['keys'] and '2' in migration['m']['pins'].values())
    await old.close();await new.reload()
    await new.wait_for_function('caches.keys().then(k=>!k.includes("platocave-v2"))')
    ok('actual cleanup reclaims legacy cache only after window closes',True)
    await upgrade_ctx.close();await b.close()
  summary={'passed':sum(1 for _,x in res if x),'failed':sum(1 for _,x in res if not x),'checks':res}
  (OUT/'browser-results.json').write_text(json.dumps(summary,indent=2));print(summary['passed'],'passed,',summary['failed'],'failed');sys.exit(0 if all(x for _,x in res) else 1)
asyncio.run(main())
