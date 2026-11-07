# python3 tests/browser_check.py  (needs a local server on 127.0.0.1:18999 serving this folder)
import asyncio,sys
from playwright.async_api import async_playwright
U="http://127.0.0.1:18999/"
async def main():
  res=[]
  def ok(n,c):res.append((n,bool(c)));print("PASS" if c else "FAIL",n)
  async with async_playwright() as p:
    b=await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]);c=await b.new_context(viewport={"width":844,"height":390},has_touch=True);pg=await c.new_page()
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(U);await pg.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller||true")
    await pg.click("#startBtn");await pg.wait_for_timeout(1500)
    st=await pg.evaluate("({v:!document.getElementById('introVideo').paused,t:document.getElementById('introVideo').currentTime,m:!document.getElementById('introMusic').paused,e:document.getElementById('introVideo').error&&document.getElementById('introVideo').error.code,s:__plato.state.introState})")
    print(st);ok("music plays with intro",st["m"]);ok("intro playing or held",st["s"] in("playing","hold"))
    await pg.click("#skipBtn");await pg.wait_for_timeout(300)
    st=await pg.evaluate("({s:__plato.state.introState,m:!document.getElementById('introMusic').paused,loop:document.getElementById('introMusic').loop,vp:document.getElementById('introVideo').paused})")
    ok("title hold: frozen video, music still playing & looping",st["s"]=="hold" and st["m"] and st["loop"] and st["vp"])
    await pg.screenshot(path="/tmp/plato-hold.png")
    await pg.mouse.click(400,200);await pg.wait_for_timeout(600)
    st=await pg.evaluate("__plato.state");ok("tap starts game",st["phase"]=="guess" and st["round"]==0)
    await pg.wait_for_timeout(800);await pg.screenshot(path="/tmp/plato-r1.png")
    await pg.fill("#guess","Ball");await pg.press("#guess","Enter");await pg.wait_for_timeout(700)
    st=await pg.evaluate("__plato.state");ok("right answer +100",st["score"]==100 and st["lastResult"]==True)
    await pg.screenshot(path="/tmp/plato-reveal.png")
    await pg.click("#nextBtn")
    await pg.evaluate("()=>{window.__sfx=0;const w=PlatoSfx.wrong;PlatoSfx.wrong=()=>{window.__sfx++;return w()}}")
    await pg.fill("#guess","banana");await pg.click("#goBtn");await pg.wait_for_timeout(300)
    st=await pg.evaluate("({s:__plato.state,n:window.__sfx})");print(st);ok("wrong answer: 0 points, moan/scream played",st["s"]["score"]==100 and st["n"]==1)
    await pg.press("#guess","Enter") if False else await pg.click("#nextBtn")
    await pg.click("#goBtn");st=await pg.evaluate("__plato.state");ok("empty guess ignored",st["phase"]=="guess")
    for i in range(2,50):
      await pg.evaluate("__plato.submit('x')");await pg.evaluate("__plato.next()")
    ok("results after 50 rounds",await pg.is_visible("#end"));print(await pg.inner_text("#endScore"))
    await pg.goto(U);await pg.wait_for_timeout(500)
    for _ in range(60):
      done=await pg.evaluate("caches.keys().then(async k=>{for(const n of k)if(/platocave-v\\d/.test(n)){const c=await caches.open(n);return (await c.keys()).length}return 0})")
      if done>=13:break
      await pg.wait_for_timeout(500)
    ok("all 13 assets cached",done>=13)
    await c.set_offline(True);await pg.reload();await pg.wait_for_timeout(800)
    ok("works offline after first load",await pg.is_visible("#startBtn"))
    await pg.click("#startBtn");await pg.wait_for_timeout(1200)
    ok("music plays offline",await pg.evaluate("!document.getElementById('introMusic').paused"))
    ok("no page errors",not errs);print(errs)
    await b.close()
  print(sum(1 for _,x in res if x),"passed,",sum(1 for _,x in res if not x),"failed");sys.exit(0 if all(x for _,x in res) else 1)
asyncio.run(main())
