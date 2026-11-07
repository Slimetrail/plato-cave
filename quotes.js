// Plato's Cave - short genuine sayings from Plato's Republic, Book VII (the Allegory of the Cave),
// Benjamin Jowett's public-domain translation (light plain-English trims only, see t2067u).
// Shown small during play rounds; one per round, rotating by round index. Works in browser and node.
(function(root){
"use strict";
const SOURCE="Plato, Republic";
const TEXTS=[
"They see only their own shadows, or the shadows of one another, which the fire throws on the opposite wall of the cave.",
"How could they see anything but the shadows if they were never allowed to move their heads?",
"To them, the truth would be literally nothing but the shadows of the images.",
"He will be unable to see the realities of which in his former state he had seen the shadows.",
"Will he not fancy that the shadows which he formerly saw are truer than the objects which are now shown to him?",
"When he approaches the light his eyes will be dazzled, and he will not be able to see anything at all of what are now called realities.",
"Last of all he will be able to see the sun, and not mere reflections of him in the water.",
"Better to be the poor servant of a poor master, and to endure anything, rather than think as they do and live after their manner.",
"Coming suddenly out of the sun to be replaced in his old situation, would he not be certain to have his eyes full of darkness?",
"Men would say of him that up he went and down he came without his eyes.",
"The prison-house is the world of sight, the light of the fire is the sun.",
"The journey upwards is the ascent of the soul into the intellectual world.",
"In the world of knowledge the idea of good appears last of all, and is seen only with an effort.",
"The bewilderments of the eyes are of two kinds, and arise from two causes, either from coming out of the light or from going into the light.",
"The power and capacity of learning exists in the soul already."];
const QUOTES=Object.freeze(TEXTS.map(text=>Object.freeze({text,by:SOURCE})));
function pickForRound(i){const n=QUOTES.length,k=((Math.floor(Number(i)||0)%n)+n)%n;return QUOTES[k]}
const API={QUOTES,pickForRound,SOURCE};
if(typeof module!=="undefined"&&module.exports)module.exports=API;else root.PlatoQuotes=API;
})(typeof self!=="undefined"?self:this);
