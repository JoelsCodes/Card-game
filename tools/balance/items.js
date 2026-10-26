// Isolated strength of each item and commander: same deck vs same opponents, only the player's tool changes.
// Usage: node items.js MATCHES_PER_CONFIG [part total]   e.g. node items.js 300 0 2
const sim = require('./sim_full.js');
const vm = require('vm'), fs = require('fs');
const ctx = sim.ctx;
const N = +process.argv[2] || 300, PART = +process.argv[3] || 0, TOT = +process.argv[4] || 1;
vm.runInContext(`
(function(){const f=aiMoveM;aiMoveM=function(G){return f(G)}})();
function __deck3(){const p=[];for(const c of CARDS.filter(c=>c.lv<=3).sort((a,b)=>sum(b)-sum(a))){if(p.length>=10)break;if(okAdd(p.map(x=>x.id),c.id))p.push(c)}return p}
function __one(tool,kind,n){
  const ph=__deck3().map(c=>({...c}));
  const rules=resolve(matchRules(n));
  let G=newG(ph,oppHand(n),rules,0,{});
  G.items.p=kind==='item'?{[tool]:ITEMS[tool].c}:{};G.items.o={};
  G.cmd=G.cmd||{};G.cmd.p=kind==='cmd'?tool:null;G.cmd.o=null;
  S.opp=n;S.screen='game';S.G=G;S.res=null;S.cine=0;S.intro=0;
  begin();let guard=0;
  while(guard++<6000){G.vb=0;if(__Q.length){__Q.shift()();continue}if(S.G!==G){G=S.G;G.vb=0;begin();continue}if(G.over)break;
    if(G.turn==='p'&&!G.busy){aiMoveM(G);continue}if(G.turn==='o'&&!G.busy){aiMove();continue}break}
  const pp=scr(G,'p'),oo=scr(G,'o');return pp>oo?1:pp<oo?-1:0}
function __cfg(tool,kind,N,seed){const T=NPCS.filter(x=>x.d===3);let w=0,l=0,d=0,err=0;
  for(let i=0;i<N;i++){const n=T[i%T.length];try{const r=__one(tool,kind,n);if(r>0)w++;else if(r<0)l++;else d++}catch(e){err++;__Q.length=0}}
  return{tool,kind,w,l,d,err}}
`, ctx);
const items = vm.runInContext('Object.keys(ITEMS)', ctx), cmds = vm.runInContext('Object.keys(CMD)', ctx);
const cfgs = [['none', 'none'], ...items.map(k => [k, 'item']), ...cmds.map(k => [k, 'cmd'])];
const out = [];
cfgs.forEach(([t, k], i) => {
  if (i % TOT !== PART) return;
  const r = vm.runInContext(`__cfg(${JSON.stringify(t)},${JSON.stringify(k)},${N})`, ctx);
  out.push(r); console.log(JSON.stringify(r));
});
fs.writeFileSync(`/home/claude/balance_data/items_${PART}.json`, JSON.stringify(out));
