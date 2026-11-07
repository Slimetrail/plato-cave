# Start a local-only server in game/, then PLATO_URL=http://127.0.0.1:19543/ python3 tests/browser_check.py
import asyncio,sys,os,json
from pathlib import Path
from playwright.async_api import async_playwright
U=os.environ.get('PLATO_URL','http://127.0.0.1:19543/')
OUT=Path('/workspace/plato-cave/game-export/r1-fixes');OUT.mkdir(parents=True,exist_ok=True)
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
    for name in ['bird','tower','cone','pyramid']:
      await pg.evaluate('(name)=>{startGame();round=PlatoShapes.SHAPES.findIndex(s=>s.name===name);newRound()}',name)
      await pg.wait_for_timeout(200);await pg.screenshot(path=str(OUT/f'{name}-shadow.png'))
      await pg.evaluate('__plato.submit("x")');await pg.wait_for_timeout(700);await pg.screenshot(path=str(OUT/f'{name}-reveal.png'))
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
      Object.defineProperty(video,'duration',{configurable:true,get:()=>25.36});
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
    keys=await pg.evaluate('caches.keys()');ok('build 2 cache installed', 'platocave-v2' in keys)
    await c.set_offline(True);await pg.reload();await pg.wait_for_timeout(500);ok('works offline after first load',await pg.is_visible('#startBtn'))
    rr=await pg.evaluate('''async()=>{const r=await fetch('assets/intro.mp4',{headers:{range:'bytes=-4096'}});return {s:r.status,cr:r.headers.get('content-range'),size:(await r.arrayBuffer()).byteLength}}''')
    ok('offline seek byte range served from cached video',rr['s']==206 and rr['size']==4096 and rr['cr'].startswith('bytes '))
    rr=await pg.evaluate('''async()=>{const r=await fetch('assets/intro.mp4',{headers:{range:'bytes=99-9'}});return {s:r.status,cr:r.headers.get('content-range')}}''')
    ok('offline reversed range returns 416 not illegal 206',rr['s']==416 and rr['cr'].startswith('bytes */'))
    await pg.click('#startBtn');await pg.wait_for_timeout(500);ok('music plays offline',await pg.evaluate('!music.paused'))
    ok('no page errors',not errs);print(errs,flush=True);await b.close()
  summary={'passed':sum(1 for _,x in res if x),'failed':sum(1 for _,x in res if not x),'checks':res}
  (OUT/'browser-results.json').write_text(json.dumps(summary,indent=2));print(summary['passed'],'passed,',summary['failed'],'failed');sys.exit(0 if all(x for _,x in res) else 1)
asyncio.run(main())
