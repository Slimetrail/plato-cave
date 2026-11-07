# Plato's Allegory of the Cave (local, unpublished build)
Open: serve this folder (e.g. `python3 -m http.server 18999 --bind 127.0.0.1`) and visit http://127.0.0.1:18999/
- Intro: assets/intro.mp4 is a byte-for-byte copy of intro-export/plato-cave-intro-t1977u-r2.mp4 (sha256 60e6cd0c…8fc4), played muted as-is.
  assets/intro-music.mp3 is a byte-for-byte copy of the approved plato_intro_sad_greek.mp3 (sha256 9c640edc…dac8da), played as a separate looping audio element. Nothing re-encoded or muxed.
- Wrong-answer sounds (sfx.js) are original, synthesized live with Web Audio. No recorded clips.
- Cave wall texture and icons are original procedural images (Pillow), made for this game.
- 50 shapes in shapes.js; every shadow is the same mesh projected from the fire's point light onto the wall plane.
- Offline/update: sw.js follows Shark Attack's pattern (version.json never cached; new build downloaded all-or-nothing, switched on next launch; silent when offline).
- Tests: `node tests/run.js` and (with server running) `python3 tests/browser_check.py`.
