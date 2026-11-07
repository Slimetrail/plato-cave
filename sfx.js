// Original wrong-answer sounds, synthesized live with Web Audio (no recorded or copyrighted clips).
// A low "agony moan" (sawtooth voice through vowel formant filters, sliding down) followed by a short scream.
(function(root){
let ctx=null;
function ac(){if(!ctx){const C=root.AudioContext||root.webkitAudioContext;if(!C)return null;ctx=new C()}if(ctx.state==="suspended")ctx.resume();return ctx}
function voice(c,t0,dur,f0,f1,formants,peak,vib){
 const out=c.createGain();out.gain.setValueAtTime(0.0001,t0);out.gain.exponentialRampToValueAtTime(peak,t0+0.12);out.gain.setValueAtTime(peak,t0+dur*0.6);out.gain.exponentialRampToValueAtTime(0.0001,t0+dur);out.connect(c.destination);
 const o=c.createOscillator();o.type="sawtooth";o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
 const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=vib;lg.gain.value=f0*0.04;lfo.connect(lg);lg.connect(o.frequency);
 for(const [f,q,g] of formants){const b=c.createBiquadFilter();b.type="bandpass";b.frequency.value=f;b.Q.value=q;const gg=c.createGain();gg.gain.value=g;o.connect(b);b.connect(gg);gg.connect(out)}
 o.start(t0);lfo.start(t0);o.stop(t0+dur+0.05);lfo.stop(t0+dur+0.05)}
function wrong(){const c=ac();if(!c)return false;const t=c.currentTime+0.02;
 voice(c,t,1.5,190,105,[[700,6,1.2],[1150,8,0.7],[2600,10,0.25]],0.5,5.5); // moan "ohhh"
 voice(c,t+1.15,0.75,820,560,[[950,5,1],[1500,7,0.8],[3000,9,0.35]],0.32,9);  // scream "aaah"
 return true}
root.PlatoSfx={wrong:wrong,unlock:ac,ORIGINAL:true};
})(self);
