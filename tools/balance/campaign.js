const sim = require('./sim_full.js');
const vm = require('vm');
const ctx = sim.ctx;
vm.runInContext(`
function __resetP(){P={xp:0,gil:300,beat:[],sets:[],mc:0};coll={};S.pick=[];topUp();P.unl=['potion'];P.prog={};P.sel=null;P.belt=[];P.cm=[null,null,null,null,null];P.dk=0;P.decks=[[],[],[],[],[]];ensureP();}
const __ITEM_PRI=['bolt','bomb','revive','potion','remedy','reclash','flip','draw','smoke','trap','scout'];
const __CM_PRI=['mist','ifrit','choco'];
function __belt(){P.belt=__ITEM_PRI.filter(k=>P.unl.includes(k)&&ITEMS[k]).slice(0,bmax());const cm=__CM_PRI.find(k=>P.unl.includes(k));if(cm){P.cm=P.cm||[null,null,null,null,null];P.cm[P.dk]=cm}}
function __play(n){
  S.pick=[];autoPick();
  const ph=S.pick.map(id=>CARDS[id]);
  if(ph.length<10)return {k:'nodeck'};
  const rules=resolve(matchRules(n));
  let G=newG(ph.map(c=>({...c})),oppHand(n),rules,0,{});
  G.items.p=Object.fromEntries(P.belt.map(k=>[k,ITEMS[k].c]));G.cmd=G.cmd||{};G.cmd.p=cmOf();
  S.opp=n;S.screen='game';S.G=G;S.res=null;S.cine=0;S.intro=0;
  begin();
  let guard=0;
  while(guard++<6000){
    G.vb=0;
    if(__Q.length){__Q.shift()();continue}
    if(S.G!==G){G=S.G;G.vb=0;begin();continue}
    G.vb=0;
    if(G.over)break;
    if(G.turn==='p'&&!G.busy){aiMoveM(G);continue}
    if(G.turn==='o'&&!G.busy){aiMove();continue}
    break;
  }
  return {k:(S.res&&S.res.k)||'stuck',pp:scr(G,'p'),oo:scr(G,'o'),dbg:{turn:G.turn,busy:G.busy,over:G.over,guard,hp:G.board.filter(Boolean).length,hands:[G.hands.p.length,G.hands.o.length],item:G.item,used:G.used,ap:G.ap,vb:G.vb,fight:!!G.fight,sel:G.sel,q:__Q.length}};
}
function __campaign(maxM){
  __resetP();
  let streak=0,maxStreak=0,wins=0,losses=0,draws=0,n=0,log=[],reached=0;const att={};
  while(n<maxM&&streak<5){
    while(P.gil>=PRICE.std){const before=P.gil;buy();if(P.gil===before)break}
    const cand=NPCS.filter(x=>tierOpen(x.d)&&(att[x.n]||0)<5).sort((a,b)=>a.d-b.d||NPCS.indexOf(a)-NPCS.indexOf(b));
    if(!cand.length)break;
    const o=cand[0];n++;att[o.n]=(att[o.n]||0)+1;
    __belt();const __dk=(()=>{S.pick=[];autoPick();const ph=S.pick.map(id=>CARDS[id]);return {lv:+(ph.reduce((t,c)=>t+c.lv,0)/Math.max(1,ph.length)).toFixed(2),sum:ph.reduce((t,c)=>t+sum(c),0),n4:ph.filter(c=>c.lv>=4).length,n5:ph.filter(c=>c.lv===5).length}})();const r=__play(o);
    if(r.k==='win'){wins++;streak=0}
    else if(r.k==='lose'){losses++;streak++;maxStreak=Math.max(maxStreak,streak)}
    else if(r.k==='draw'){draws++;streak=0}
    else {log.push({stuck:o.n,dbg:r.dbg});break}
    reached=Math.max(reached,o.d);
    log.push({opp:o.n,d:o.d,res:r.k,gil:P.gil,owned:Object.keys(coll).length,beat:P.beat.length,deck:__dk,belt:P.belt.slice(),cm:(P.cm||[]).filter(Boolean),pp:r.pp,oo:r.oo});
  }
  return {matches:n,wins,losses,draws,maxStreak,beaten:P.beat.length,highestTier:reached,endedBy:streak>=5?'5 losses in a row':(log.some(l=>l.stuck)?'STUCK':'no opponents left'),gil:P.gil,owned:Object.keys(coll).length,unl:P.unl.slice(),belt:P.belt.slice(),log};
}
`, ctx);
const runs=+process.argv[2]||20;
const out=[];
for(let i=0;i<runs;i++){out.push(vm.runInContext('__campaign(400)',ctx))}
const sum=k=>out.map(o=>o[k]);const unlN=out.map(o=>o.unl.length);
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
console.log(JSON.stringify({runs,beatenMedian:med(sum('beaten')),beatenMin:Math.min(...sum('beaten')),beatenMax:Math.max(...sum('beaten')),tierMedian:med(sum('highestTier')),tierMax:Math.max(...sum('highestTier')),matchesMedian:med(sum('matches')),unlockedMedian:med(unlN),unlockedMax:Math.max(...unlN),endings:out.reduce((m,o)=>(m[o.endedBy]=(m[o.endedBy]||0)+1,m),{})}));
require('fs').writeFileSync('/home/claude/balance_data/campaign_last.json',JSON.stringify(out[0],null,1));
const st=out.filter(o=>o.endedBy==='STUCK');
if(st.length)require('fs').writeFileSync('/home/claude/balance_data/campaign_stuck.json',JSON.stringify(st.map(o=>o.log.filter(l=>l.stuck||l.opp).slice(-6)),null,1));
const ry=[];out.forEach((o,i)=>o.log.forEach(l=>{if(l.opp==='Rydia')ry.push({run:i,...l})}));
require('fs').writeFileSync('/home/claude/balance_data/campaign_rydia.json',JSON.stringify(ry,null,1));
