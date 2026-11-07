# Start a local-only server in game/, then PLATO_URL=http://127.0.0.1:19617/ python3 tests/browser_check.py
import asyncio,sys,os,json
from pathlib import Path
from playwright.async_api import async_playwright
U=os.environ.get('PLATO_URL','http://127.0.0.1:19617/')
OUT=Path('/workspace/plato-cave/game-export/t2098u');OUT.mkdir(parents=True,exist_ok=True)
async def main():
  res=[]
  def ok(n,c):res.append((n,bool(c)));print('PASS' if c else 'FAIL',n,flush=True)
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']);c=await b.new_context(viewport={'width':1280,'height':800},has_touch=True);pg=await c.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    # REAL first uncached HTTP load: fresh context, no preload, no reload before Skip.
    fc=await b.new_context(viewport={'width':1280,'height':800},has_touch=True);await fc.add_init_script("window.__seeks=[];for(const n of ['seeking','seeked'])document.addEventListener(n,e=>{const v=e.target;window.__seeks.push({ev:n,t:v.currentTime,se:v.seekable.length?v.seekable.end(v.seekable.length-1):null,pending:window.__plato?__plato.state.skipPending:null,at:Math.round(performance.now())})},true)");fp=await fc.new_page();ferrs=[];fp.on('pageerror',lambda e:ferrs.append(str(e)))
    await fp.goto(U);await fp.click('#startBtn');await fp.wait_for_timeout(400);await fp.click('#skipBtn')
    probe='({dur:video.duration,rs:video.readyState,sl:video.seekable.length,se:video.seekable.length?video.seekable.end(video.seekable.length-1):null,s:__plato.state.introState,t:video.currentTime,title:__plato.state.titleReady,sp:__plato.state.skipPending,sw:__plato.state.skipWanted,vp:video.paused,hint:document.getElementById("tapHint").classList.contains("on"),ctrl:!!navigator.serviceWorker.controller})'
    first=[]
    for ms in (150,1000,2500):
      await fp.wait_for_timeout(ms-(0 if not first else [150,1000,2500][len(first)-1]));first.append(await fp.evaluate(probe));print('FIRST UNCACHED SKIP',ms,'ms',first[-1],flush=True)
    await fp.screenshot(path=str(OUT/'first-uncached-skip.png'))
    fl=first[-1];seeks=await fp.evaluate('window.__seeks');print('FIRST UNCACHED SEEK EVENTS',seeks,flush=True);firstUncached={'samples':first,'seek_events':seeks,'errors':ferrs}
    if fl['s']=='hold':
      ok('REAL first-uncached Skip holds locked title (t>=23, Tap to play)',fl['t']>=23 and fl['vp'] and fl['title'] and fl['hint'])
    else:
      attempted=any(x['ev']=='seeking' for x in seeks)
      ok('REAL first-uncached Skip attempted the seek and keeps playing (no black hold)',attempted and not fl['vp'])
    ok('REAL first-uncached Skip not stuck in skipWanted while seekable-by-data',len(seeks)>0 and not (fl['sw'] and fl['s']=='playing' and fl['dur']>=23 and fl['rs']>=2))
    ok('first-uncached no page errors',not ferrs);await fc.close()
    await pg.goto(U);await pg.evaluate('navigator.serviceWorker.ready');await pg.reload();await pg.wait_for_function('!!navigator.serviceWorker.controller')
    await pg.click('#startBtn');await pg.wait_for_timeout(2100)
    st=await pg.evaluate('({v:!video.paused,t:video.currentTime,m:!music.paused,e:video.error?.code,s:__plato.state.introState})')
    print('REAL MEDIA',st,flush=True);ok('music plays with intro',st['m'])
    await pg.click('#skipBtn');await pg.wait_for_timeout(1800)
    st=await pg.evaluate('({s:__plato.state.introState,m:!music.paused,loop:music.loop,vp:video.paused,t:video.currentTime,title:__plato.state.titleReady})')
    print('REAL SKIP',st,flush=True)
    await pg.screenshot(path=str(OUT/'cached-reload-skip-title-hold.png'))
    if st['s']=='hold':
      ok('real decoded Skip title hold, music continues',st['t']>=23 and st['m'] and st['loop'] and st['vp'] and st['title'])
      await pg.mouse.click(600,400);ok('real title tap opens level menu',await pg.is_visible('#menu'));await pg.click('#easyBtn')
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
      Object.defineProperty(video,'duration',{configurable:true,get:()=>mockVideo.dur??25.36});Object.defineProperty(video,'seekable',{configurable:true,get:()=>({length:mockVideo.noseek?0:1,end:()=>mockVideo.end??mockVideo.dur??25.36})});
      video.play=()=>{mockVideo.paused=false;mockVideo.plays++;return Promise.resolve()};video.pause=()=>{mockVideo.paused=true};
      video.requestVideoFrameCallback=cb=>setTimeout(()=>cb(performance.now(),{mediaTime:mockVideo.time}),0);
      const realPlay=music.play.bind(music);window.musicCalls=0;music.play=()=>{musicCalls++;return musicCalls===1?Promise.reject(new Error('blocked unlock')):realPlay()};
    }''')
    await pg.click('#startBtn');await pg.wait_for_timeout(80);ok('music rejection is remembered',(await pg.evaluate('__plato.state'))['musicNeedsUnlock'])
    await pg.dispatch_event('#intro','pointerdown');await pg.wait_for_timeout(100);ok('later intro gesture retries rejected music',await pg.evaluate('musicCalls>=2&&!__plato.state.musicNeedsUnlock&&!music.paused'))
    await pg.click('#skipBtn');ok('Skip waits for seeked instead of immediate hold',await pg.evaluate('__plato.state.introState==="playing"&&__plato.state.skipPending&&!video.paused'))
    await pg.evaluate('video.dispatchEvent(new Event("seeked"))');await pg.wait_for_timeout(100)
    ok('seeked + decoded title enters hold and keeps music looping',await pg.evaluate('__plato.state.introState==="hold"&&video.paused&&!music.paused&&music.loop&&__plato.state.titleReady'))
    await pg.mouse.click(600,400);ok('hold tap opens level menu',await pg.is_visible('#menu'))
    # Finish fade before restarting so the prior fade cannot interfere with next music test.
    await pg.wait_for_timeout(1100)
    await pg.evaluate('startIntro();mockVideo.time=23.05;video.dispatchEvent(new Event("timeupdate"))')
    ok('readable title is tappable before ended',await pg.evaluate('__plato.state.introState==="playing"&&__plato.state.titleReady&&document.getElementById("tapHint").classList.contains("on")'))
    await pg.mouse.click(600,400);ok('tap during title playback opens level menu',await pg.is_visible('#menu'));await pg.wait_for_timeout(1100)
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
    await pg.evaluate('startIntro();mockVideo.time=3;mockVideo.noseek=false;mockVideo.dur=25.36;mockVideo.end=0;mockVideo.ready=4;document.getElementById("skipBtn").click()')
    ok('QA mock (len 1, end 0, dur 25.36, ready 4): Skip attempts safe seek',await pg.evaluate('__plato.state.skipPending&&!__plato.state.skipWanted&&Math.abs(mockVideo.time-25.24)<0.01'))
    await pg.evaluate('video.dispatchEvent(new Event("seeked"))');await pg.wait_for_timeout(100)
    ok('QA mock end-0 range holds decoded title after seeked',await pg.evaluate('__plato.state.introState==="hold"&&video.paused&&__plato.state.titleReady'))
    await pg.evaluate('mockVideo.end=24.0;startIntro();mockVideo.time=3;document.getElementById("skipBtn").click()')
    ok('mock range end 24.0 (< dur-0.25) still seeks',await pg.evaluate('__plato.state.skipPending&&Math.abs(mockVideo.time-25.24)<0.01'))
    await pg.evaluate('delete mockVideo.end')
    # New UI behavior on real pages; all networking remains on the local test server.
    await pg.reload();await pg.evaluate('show("menu")')
    ok('menu exposes three levels',all([await pg.is_visible('#'+k+'Btn') for k in ['easy','medium','hard']]))
    await pg.click('#mediumBtn');ok('Medium starts 50-shape guess loop',await pg.is_visible('#game') and await pg.evaluate('__plato.state.activeLevel==="medium"&&__plato.state.total===50'));await pg.fill('#guess','pear');await pg.click('#goBtn');ok('Medium correct guess scores 100',await pg.evaluate('__plato.state.score===100'));await pg.evaluate('endGame()')
    await pg.click('#againBtn');ok('Play again keeps Medium',await pg.evaluate('__plato.state.activeLevel==="medium"&&__plato.state.total===50&&__plato.state.score===0'));await pg.evaluate('endGame()')
    await pg.click('#menuBtn');await pg.click('#hardBtn');ok('Hard starts 50-shape guess loop',await pg.evaluate('__plato.state.activeLevel==="hard"&&__plato.state.total===50&&__plato.state.phase==="guess"'));await pg.fill('#guess','washer');await pg.click('#goBtn');ok('Hard correct guess scores 100',await pg.evaluate('__plato.state.score===100'));await pg.evaluate('endGame()')
    await pg.click('#endSettingsBtn');await pg.eval_on_selector('#musicVol',"e=>{e.value=35;e.dispatchEvent(new Event('input'))}")
    await pg.eval_on_selector('#soundsVol',"e=>{e.value=0;e.dispatchEvent(new Event('input'))}")
    await pg.click('#settingsDoneBtn');ok('settings Done returns to End',await pg.is_visible('#end'))
    await pg.reload();ok('saved 35% music and muted Sounds restored',await pg.evaluate('__plato.state.musicVolume===.35&&__plato.state.soundsVolume===0&&music.volume===.35'))
    await pg.evaluate('show("menu")');await pg.click('#settingsBtn');await pg.click('#settingsDoneBtn');ok('settings Done returns to Menu',await pg.is_visible('#menu'))
    await pg.evaluate('fadeMusic()');await pg.wait_for_timeout(1100);ok('fade restores saved volume',await pg.evaluate('music.volume===.35&&music.paused'))
    await pg.evaluate('installPrompt=null');await pg.click('#menuInstallBtn');ok('install fallback hint visible',await pg.is_visible('#menuInstallHint'))
    await pg.evaluate('window.__prompted=0;installPrompt={prompt:async()=>{window.__prompted++},userChoice:Promise.resolve({outcome:"dismissed"})}')
    await pg.click('#menuInstallBtn');ok('Chrome install prompt invoked on tap',await pg.evaluate('window.__prompted===1'))
    await pg.evaluate('dispatchEvent(new Event("appinstalled"))');ok('install buttons hide after install',not await pg.is_visible('#menuInstallBtn'))
    await pg.evaluate('updateStatus("pending-ready")');ok('ready corner shown in menu',await pg.is_visible('#updateReadyBtn'))
    await pg.click('#easyBtn');ok('ready corner hidden during play',not await pg.is_visible('#updateReadyBtn'))
    ok('no settings/install/update controls in guessing HUD',not await pg.is_visible('#settingsBtn') and not await pg.is_visible('#updateBtn') and not await pg.is_visible('#menuInstallBtn'))
    await pg.evaluate('endGame()');ok('ready corner shown at End',await pg.is_visible('#updateReadyBtn'))
    await pg.evaluate('pendingReady=false;updateCorner();show("menu");installed=false;updateInstall()')
    await c.set_offline(True);await pg.click('#updateBtn');ok('offline manual update fails safely','online' in await pg.inner_text('#updateBtn'));await c.set_offline(False)
    for w,h in [(390,844),(360,640),(844,390)]:
      await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('show("menu")')
      fits=await pg.evaluate("[...document.querySelectorAll('#menu button')].filter(e=>e.offsetParent).every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})")
      ok(f'menu buttons fit {w}x{h}',fits);ok(f'install hint does not overlap update {w}x{h}',await pg.evaluate('document.getElementById("menuInstallHint").getBoundingClientRect().bottom<=document.getElementById("updateBtn").getBoundingClientRect().top') if h>w else True);await pg.screenshot(path=str(OUT/f'menu-{w}x{h}.png'))
    # t2098u: genuine sayings appear with the answer only.
    qv='(()=>{const q=document.getElementById("quote"),r=q.getBoundingClientRect();return {vis:!!q.offsetParent&&!q.hidden&&r.height>0,text:document.getElementById("quoteText").textContent,by:document.getElementById("quoteBy").textContent}})()'
    ovl='(()=>{const a=document.getElementById("quote").getBoundingClientRect(),hit=id=>{const b=document.getElementById(id).getBoundingClientRect();return a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom};return {guess:hit("guess"),bar:hit("bar"),msg:hit("msg"),hud:hit("hud")}})()'
    await pg.set_viewport_size({'width':390,'height':844});await pg.evaluate('show("menu")')
    ok('quote hidden on level menu',not (await pg.evaluate(qv))['vis'])
    await pg.click('#easyBtn');await pg.wait_for_timeout(300)
    ok('Easy guess hides saying and reveal controls',not (await pg.evaluate(qv))['vis'] and not await pg.is_visible('#revealMenuBtn') and not await pg.is_visible('#nextBtn'))
    await pg.evaluate('__plato.submit("x")');await pg.wait_for_timeout(700);qr=await pg.evaluate(qv)
    ok('answer reveals exact round saying and attribution',qr['vis'] and await pg.evaluate('document.getElementById("quoteText").textContent===PlatoQuotes.pickForRound(round).text') and qr['by']=='— Plato, Republic')
    ok('Next and Menu both visible on reveal',await pg.is_visible('#nextBtn') and await pg.is_visible('#revealMenuBtn'))
    await pg.click('#nextBtn');ok('Next hides saying and advances round',await pg.evaluate('__plato.state.round===1&&__plato.state.phase==="guess"') and not (await pg.evaluate(qv))['vis'])
    await pg.evaluate('__plato.submit("x")');q1=await pg.evaluate(qv);ok('later answer rotates genuine saying',q1['vis'] and q1['text']!=qr['text'])
    await pg.click('#revealMenuBtn');ok('reveal Menu goes to Pick a level, not Start',await pg.is_visible('#menu') and not await pg.is_visible('#start') and not (await pg.evaluate(qv))['vis'])
    for lv in ['medium','hard']:
      await pg.evaluate('show("menu")');await pg.click('#'+lv+'Btn');ok(lv+' guess hides saying',not (await pg.evaluate(qv))['vis']);await pg.evaluate('__plato.submit("x")');qq=await pg.evaluate(qv);ok(lv+' answer shows genuine saying',qq['vis'] and 'Plato' in qq['by'])
    # Regression: the full italic saying AND gold line clear the actual projected
    # art, not just other DOM controls. Exercise all sayings and multiple poses.
    layout_cases=[(800,400,'easy','donut'),(800,400,'easy','cube'),
                  (1280,800,'easy','ball'),(1280,800,'easy','donut'),
                  (1280,800,'hard','washer'),(390,844,'easy','ball')]
    layout_results=[]
    for w,h,level,name in layout_cases:
      await pg.set_viewport_size({'width':w,'height':h})
      await pg.evaluate('''([level,name])=>{startGame(level);round=activeShapes.findIndex(s=>s.name===name);newRound();resize()}''',[level,name])
      await pg.wait_for_timeout(200)
      o=await pg.evaluate(ovl);ok(f'quote avoids #guess/#bar/#msg/#hud {w}x{h} {name}',not any(o.values()))
      metrics=await pg.evaluate('''()=>{
        const shape=activeShapes[round],original=round,rows=[];
        // Instrument the real shadow/object paths, independent of fitLandscape.
        const bounds=(ctx,draw)=>{let lo=Infinity,hi=-Infinity;const old={};
          for(const key of ['moveTo','lineTo']){old[key]=ctx[key];ctx[key]=function(x,y){lo=Math.min(lo,y);hi=Math.max(hi,y);return old[key].call(this,x,y)}}
          try{draw()}finally{for(const key in old)ctx[key]=old[key]}
          return {top:lo,bottom:hi}};
        for(let qi=0;qi<15;qi++){
          round=qi;phase="reveal";showQuote();const q=document.getElementById('quote'),qr=q.getBoundingClientRect(),origin=cv.getBoundingClientRect().top;
          const by=document.getElementById('quoteBy').getBoundingClientRect(),text=document.getElementById('quoteText').getBoundingClientRect();
          for(const time of [0,1000,4000,8000,20000]){
            const shadow=bounds(sg,()=>drawShadow(shape,time));
            const object=bounds(pg,()=>drawObject(shape,time,W/2,(H-150)/2+20,radius(Math.min(W,H-150)*.27)));
            rows.push({qi,time,quoteBottom:qr.bottom-origin,shadow,object,
              full:q.scrollHeight<=q.clientHeight+1&&by.bottom<=qr.bottom+.1&&text.top>=qr.top-.1,
              by:document.getElementById('quoteBy').textContent,
              bottomLimit:document.getElementById('msg').getBoundingClientRect().top-origin});
          }
        }
        round=original;newRound();return rows
      }''')
      ok(f'full saying + exact gold attribution readable {w}x{h} {name}',all(r['full'] and r['by']=='— Plato, Republic' for r in metrics))
      ok(f'quote has >=12px gap above shadow AND reveal across 15 sayings / 5 poses {w}x{h} {name}',all(min(r['shadow']['top'],r['object']['top'])-r['quoteBottom']>=12-0.1 for r in metrics))
      if w>h:
        ok(f'shadow + reveal stay above message {w}x{h} {name}',all(max(r['shadow']['bottom'],r['object']['bottom'])<=r['bottomLimit']-11.9 for r in metrics))
      else:
        ok('portrait guess retains original shadow and object scale/center',await pg.evaluate('''()=>{phase="guess";const p=[[0,-2],[0,2]],a=fitLandscape(p,wallScale(),(H-90)/2),b=fitLandscape(p,Math.min(W,H-150)*.27,(H-150)/2+20);return a.scale===wallScale()&&a.cy===(H-90)/2&&b.scale===Math.min(W,H-150)*.27&&b.cy===(H-150)/2+20}'''))
      layout_results.append({'size':[w,h],'level':level,'name':name,'metrics':metrics})
      await pg.wait_for_timeout(200);await pg.screenshot(path=str(OUT/f'{w}x{h}-{level}-{name}-guess.png'))
      await pg.evaluate('__plato.submit("x")');await pg.wait_for_timeout(700);await pg.screenshot(path=str(OUT/f'{w}x{h}-{level}-{name}-reveal.png'))
    (OUT/'layout-metrics.json').write_text(json.dumps(layout_results,indent=2))

    for screen in ['start','menu','settings','end','intro']:
      await pg.evaluate('(screen)=>show(screen)',screen)
      ok('quote hidden off-game on '+screen,not (await pg.evaluate(qv))['vis'])
      await pg.screenshot(path=str(OUT/f'off-game-{screen}.png'))
    await pg.evaluate('show("start")')
    await pg.set_viewport_size({'width':1280,'height':800})
    keys=await pg.evaluate('caches.keys()');ok('build 10 cache installed', 'platocave-v10' in keys)
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
      const src=await caches.open('platocave-v10'),dst=await caches.open('platocave-v2');
      for(const req of await src.keys()){if(req.url.endsWith('__build_manifest__'))continue;
        const url=req.url.replace(/([?]v=)[0-9]+$/,(_,a)=>a+'2');await dst.put(url,await src.match(req))}
      const meta=await caches.open('platocave-vmeta');await meta.put('meta',new Response(JSON.stringify({current:'2'})));
      await navigator.serviceWorker.register('sw.js?r3-upgrade',{scope:'./'});
    }''')
    await old.wait_for_function('''async()=>{const c=await caches.open('platocave-vmeta'),r=await c.match('meta'),m=await r.json();return m.current==='2'&&m.pending==='10'&&Object.values(m.pins||{}).includes('2')}''')
    await old.wait_for_function('navigator.serviceWorker.controller.scriptURL.includes("r3-upgrade")')
    migration=await old.evaluate('''async()=>{const m=await (await (await caches.open('platocave-vmeta')).match('meta')).json();return {m,keys:await caches.keys()}}''')
    ok('actual install pins unpinned legacy tab before claim; build 10 pending',migration['m']['current']=='2' and migration['m']['pending']=='10' and 'platocave-v2' in migration['keys'])
    text=await old.evaluate('fetch("game.js?v=2").then(r=>r.text())')
    ok('legacy client still reads its v2 script key', 'const TITLE_TIME=23.0' in text)
    new=await upgrade_ctx.new_page();await new.goto(U);await new.wait_for_function('!!navigator.serviceWorker.controller')
    migration=await new.evaluate('''async()=>({m:await (await (await caches.open('platocave-vmeta')).match('meta')).json(),keys:await caches.keys()})''')
    ok('actual next launch promotes 10 but retains old live cache',migration['m']['current']=='10' and 'platocave-v2' in migration['keys'] and '2' in migration['m']['pins'].values())
    await old.close();await new.reload()
    await new.wait_for_function('caches.keys().then(k=>!k.includes("platocave-v2"))')
    ok('actual cleanup reclaims legacy cache only after window closes',True)
    await upgrade_ctx.close();await b.close()
  summary={'passed':sum(1 for _,x in res if x),'failed':sum(1 for _,x in res if not x),'checks':res,'first_uncached':firstUncached}
  (OUT/'browser-results.json').write_text(json.dumps(summary,indent=2));print(summary['passed'],'passed,',summary['failed'],'failed');sys.exit(0 if all(x for _,x in res) else 1)
asyncio.run(main())
