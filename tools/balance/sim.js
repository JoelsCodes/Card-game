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
for (const s of scripts) { try { vm.runInContext(s, ctx) } catch (e) { /* ignore UI-only errors */ } }

vm.runInContext(`
function __bot(G){
  const R=G.rules;let best=null,bs=-1e9;
  const em=G.board.map((x,i)=>x?-1:i).filter(i=>i>=0);
  G.hands.p.forEach((c,k)=>{const m2=modA(G.mod,c,R);em.forEach(i=>{
    const x=clash(G.board,i,c,'p',m2,R);let v=Math.random()*.3;
    for(const j in x.d){const e=G.board[j];if(e&&e.who==='o')v+=x.d[j]*2;else if(e&&e.who==='p')v-=x.d[j]*.5}
    v-=x.self*.5;if(v>bs){bs=v;best=[i,k]}})});
  return best;
}
function __match(pDeck,oDeck,items,chainOff){
  S.G=null;S.screen='game';
  S.opp={n:'Sim',d:2,ai:1,cm:null,l:{cap:['x'],hurt:['x'],win:['x'],lose:['x']}};
  const G=newG(pDeck.map(c=>({...c})),oDeck.map(c=>({...c})),[],false,{});
  S.G=G;G.items.o=items;G.items.p={};G.cmd={p:null,o:null};
  if(chainOff)G.chw={p:1,o:1};
  __Q.length=0;begin();
  let guard=0,stuck=false;
  while(!G.over&&guard++<3000){
    if(__Q.length){__Q.shift()();continue}
    if(G.turn==='p'&&!G.busy){const b=__bot(G);if(!b){stuck=true;break}put(b[0],'p',b[1]);continue}
    stuck=true;break;
  }
  const pp=scr(G,'p'),oo=scr(G,'o');
  return {win:pp>oo?'p':oo>pp?'o':'d',stuck};
}
`, ctx);

module.exports = {
  ctx,
  run(pDeck, oDeck, items, chainOff) {
    return vm.runInContext(`__match(${JSON.stringify(pDeck)},${JSON.stringify(oDeck)},${JSON.stringify(items)},${!!chainOff})`, ctx);
  },
  cards: () => vm.runInContext('CARDS', ctx),
  items: () => vm.runInContext('ITEMS', ctx),
};
