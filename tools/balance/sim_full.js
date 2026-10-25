// Harness where BOTH sides play the game's own AI logic (player side = mirrored copy).
const vm = require('vm'), fs = require('fs');
const HTML = process.env.GAME_HTML || '/home/claude/card-game/index.html';
const html = fs.readFileSync(HTML, 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const Q = [];
const stub = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : (k === 'then' ? undefined : stub()),
  apply: () => stub(), construct: () => stub(), set: () => true
});
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: true }),
  setTimeout: f => { Q.push(f); return 0 }, clearTimeout() {}, setInterval: () => 0,
  requestAnimationFrame: f => { Q.push(f) },
  document: stub(), navigator: stub(), Audio: function () { return stub() },
  AudioContext: function () { return stub() }, performance: { now: () => Date.now() },
  fetch: () => Promise.resolve(stub()), location: { href: '', search: '', pathname: '/' },
  addEventListener() {}, innerWidth: 400, innerHeight: 800, __Q: Q
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const s of scripts) { try { vm.runInContext(s, ctx) } catch (e) { } }

// Pull the AI's own functions out of the game source and make a player-side copy.
const all = scripts.join('\n');
function extract(name) {
  const m = new RegExp('function ' + name + '\\(').exec(all);
  if (!m) throw new Error('missing ' + name);
  let depth = 0;
  for (let j = all.indexOf('{', m.index); j < all.length; j++) {
    if (all[j] === '{') depth++;
    else if (all[j] === '}') { depth--; if (depth === 0) return all.slice(m.index, j + 1); }
  }
  throw new Error('unterminated ' + name);
}
const NAMES = ['aiMove', 'aiItems', 'aiCmd', 'domItems', 'applyM', 'search'];
function mirror(src) {
  let s = src.replace(/'o'/g, "'§'").replace(/'p'/g, "'o'").replace(/'§'/g, "'p'");
  s = s.replace(/\.o\b/g, '.§').replace(/\.p\b/g, '.o').replace(/\.§/g, '.p');
  for (const n of NAMES) s = s.replace(new RegExp('\\b' + n + '\\(', 'g'), n + 'M(');
  s = s.replace(/\bevalS\(/g, 'evalSM(');
  return s;
}
vm.runInContext("const evalSM=b=>b.reduce((t,x)=>x&&x.who?t+(x.who==='p'?1:-1)*(10+x.hp):t,0);\n" + NAMES.map(n => mirror(extract(n))).join('\n'), ctx);

vm.runInContext(`
function __match(pDeck,oDeck,items,chainOff){
  S.G=null;S.screen='game';
  S.opp={n:'Sim',d:2,ai:1,cm:null,l:{cap:['x'],hurt:['x'],win:['x'],lose:['x']}};
  const G=newG(pDeck.map(c=>({...c})),oDeck.map(c=>({...c})),[],false,{});
  S.G=G;G.items.o={...items};G.items.p={...items};G.cmd={p:null,o:null};
  if(chainOff)G.chw={p:1,o:1};
  __stats.turns=0;__stats.pushes=0;__stats.chain=0;__stats.items=[];__Q.length=0;begin();
  let guard=0,stuck=false;
  while(!G.over&&guard++<3000){
    if(__Q.length){__Q.shift()();continue}
    if(G.turn==='p'&&!G.busy){aiMoveM(G);continue}
    stuck=true;break;
  }
  const pp=scr(G,'p'),oo=scr(G,'o');
  return {win:pp>oo?'p':oo>pp?'o':'d',stuck,turns:__stats.turns,pushes:__stats.pushes,chain:__stats.chain,items:__stats.items.slice()};
}
`, ctx);

vm.runInContext(`
var __stats={turns:0,pushes:0,chain:0,items:[]};
(function(){
  const __put=put; put=function(...a){__stats.turns++; return __put(...a)};
  const __pr=pushRes; pushRes=function(...a){const r=__pr(...a); if(a[0]===S.G.board) __stats.pushes+=r.length; return r};
  const __ai=applyItem; applyItem=function(G,w,k,t){__stats.items.push(w+':'+k); return __ai(G,w,k,t)};
  chainBanner=function(w){__stats.chain++};
})();
`, ctx);
module.exports = {
  ctx,
  run(pDeck, oDeck, items, chainOff) {
    return vm.runInContext(`__match(${JSON.stringify(pDeck)},${JSON.stringify(oDeck)},${JSON.stringify(items)},${!!chainOff})`, ctx);
  },
  cards: () => vm.runInContext('CARDS', ctx),
  items: () => vm.runInContext('ITEMS', ctx),
};
