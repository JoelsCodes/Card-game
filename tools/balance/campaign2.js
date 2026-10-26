// Full-career run: player must beat all 40 opponents; may rechallenge beaten opponents to farm MGP.
// Usage: node campaign2.js RUNS SHOP SKILL   (SHOP = std|seek, SKILL = mirror|0|1|2)
const sim = require('./sim_full.js');
const vm = require('vm'), fs = require('fs');
const ctx = sim.ctx;
const RUNS = +process.argv[2] || 20, SHOP = process.argv[3] || 'seek', SKILL = process.argv[4] || 'mirror', FARM = +(process.argv[5] ?? 2);
vm.runInContext(`
var __SHOP=${JSON.stringify(SHOP)},__SKILL=${JSON.stringify(SKILL)},__FARM=${FARM};
(function(){const f=aiMoveM;aiMoveM=function(G){if(__SKILL==='mirror')return f(G);const a=S.opp.ai;S.opp.ai=+__SKILL;try{return f(G)}finally{S.opp.ai=a}}})();
function __reset(){P={xp:0,gil:300,beat:[],sets:[],mc:0};coll={};S.pick=[];topUp();P.unl=['potion'];P.prog={};P.belt=[];P.cm=[null,null,null,null,null];P.dk=0;P.decks=[[],[],[],[],[]];ensureP();P.gate=1;try{P.sel=unlPick()}catch(e){P.sel=null}}
const __IP=['bolt','bomb','revive','potion','remedy','reclash','flip','draw','smoke','trap','scout'],__CP=['mist',...Object.keys(CMD).filter(k=>k!=='mist')];
function __belt(){P.belt=__IP.filter(k=>P.unl.includes(k)&&ITEMS[k]).slice(0,bmax());const cm=__CP.find(k=>P.unl.includes(k));if(cm)P.cm[P.dk]=cm}
function __deck(){S.pick=[];autoPick();const ph=S.pick.map(id=>CARDS[id]);return{sum:ph.reduce((t,c)=>t+sum(c),0),lv:+(ph.reduce((t,c)=>t+c.lv,0)/Math.max(1,ph.length)).toFixed(2),n4:ph.filter(c=>c.lv===4).length,n5:ph.filter(c=>c.lv===5).length}}
function __shop(st){S.screen='shop';S.G=null;for(let g=0;g<500;g++){const sk=seekPool().length;if(__SHOP==='seek'&&sk&&P.gil>=PRICE.seek){const b=P.gil;buy(null,1);if(P.gil===b)break;st.seek++;st.spent+=PRICE.seek;continue}
 if(P.gil>=PRICE.std){const b=P.gil;buy();if(P.gil===b)break;st.std++;st.spent+=PRICE.std;S.pack=null;continue}break}S.pack=null}
function __play(n){S.pick=[];autoPick();const ph=S.pick.map(id=>CARDS[id]);if(ph.length<10)return{k:'nodeck'};
 const rules=resolve(matchRules(n));let G=newG(ph.map(c=>({...c})),oppHand(n),rules,0,{});
 G.items.p=Object.fromEntries(P.belt.map(k=>[k,ITEMS[k].c]));G.cmd=G.cmd||{};G.cmd.p=cmOf();
 S.opp=n;S.screen='game';S.G=G;S.res=null;S.cine=0;S.intro=0;begin();let guard=0;
 while(guard++<6000){G.vb=0;if(__Q.length){__Q.shift()();continue}if(S.G!==G){G=S.G;G.vb=0;begin();continue}if(G.over)break;
  if(G.turn==='p'&&!G.busy){aiMoveM(G);continue}if(G.turn==='o'&&!G.busy){aiMove();continue}break}
 return{k:(S.res&&S.res.k)||'stuck'}}
var __crash=[];function __camp(maxM){__reset();const rec={},st={std:0,seek:0,spent:0},log=[],tierOpenAt={1:0},tierClearAt={};let n=0,farm=0,earned={match:0,first:0,rank:0,dup:0};
 const ev=o=>{const r=rec[o.n]||{w:0,t:0};const wr=(r.w+1)/(r.t+2);return wr*Math.round((60+40*o.d)*REMATCH)+(1-wr)*10};
 while(n<maxM){__shop(st);
  if(P.beat.length===NPCS.length)break;
  const un=NPCS.filter(x=>tierOpen(x.d)&&!P.beat.includes(x.n));
  let o,mode;
  if(farm>0){const bt=NPCS.filter(x=>P.beat.includes(x.n));o=bt.sort((a,b)=>ev(b)-ev(a))[0];farm--;mode='farm'}
  if(!o){o=un.sort((a,b)=>(rec[a.n]?rec[a.n].t:0)-(rec[b.n]?rec[b.n].t:0)||a.d-b.d||NPCS.indexOf(a)-NPCS.indexOf(b))[0];mode='new'}
  __belt();const dk=__deck(),g0=P.gil,b0=P.beat.length,xr=rankOf(P.xp),u0=P.unl.length;n++;let r;try{r=__play(o)}catch(e){__crash.push({o:o.n,e:String(e).slice(0,120),st:String(e.stack).split(String.fromCharCode(10)).slice(1,4).join('|')});__Q.length=0;S.G=null;S.screen='shop';continue}if(r.k==='stuck'||r.k==='nodeck'){log.push({stuck:o.n});break}
  rec[o.n]=rec[o.n]||{w:0,t:0};rec[o.n].t++;if(r.k==='win')rec[o.n].w++;
  const first=P.beat.length>b0;
  if(mode==='new'&&r.k!=='win')farm=__FARM;
  for(let d=2;d<=5;d++)if(tierOpenAt[d]==null&&tierOpen(d))tierOpenAt[d]=n;
  for(let d=1;d<=5;d++)if(tierClearAt[d]==null&&NPCS.filter(x=>x.d===d).every(x=>P.beat.includes(x.n)))tierClearAt[d]=n;
  log.push({n,o:o.n,d:o.d,mode,res:r.k,first,gil0:g0,gil1:P.gil,gain:P.gil-g0,sum:dk.sum,lv:dk.lv,n4:dk.n4,n5:dk.n5,own:Object.keys(coll).length,reg:region(),cap:packCap(),rank:rankOf(P.xp),unl:P.unl.length,nu:P.unl.slice(u0)})}
 return{crash:__crash.splice(0),n,done:P.beat.length===NPCS.length,beaten:P.beat.length,st,rec,tierOpenAt,tierClearAt,log,unl:P.unl.slice(),rank:rankOf(P.xp)}}
`, ctx);
const out = [];
for (let i = 0; i < RUNS; i++) out.push(vm.runInContext('__camp(3000)', ctx));
fs.mkdirSync('/home/claude/balance_data', { recursive: true });
fs.writeFileSync(`/home/claude/balance_data/c2_${SHOP}_${SKILL}_f${FARM}.json`, JSON.stringify(out));
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] };
console.log(JSON.stringify({ RUNS, SHOP, SKILL, done: out.filter(o => o.done).length, matchesMed: med(out.map(o => o.n)), beatenMed: med(out.map(o => o.beaten)) }));
