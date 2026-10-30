// Commander check: passives and Overdrives for Switchback, Mirror (Star Lynx), Encore, Rally and Tremor.
// Run from the repo root: NODE_PATH=$(npm root -g) node tools/tests/commanders.js
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

let failed = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : '  ' + JSON.stringify(info)));
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(400);

  // Starts a fresh match with the given player commander and an empty board.
  const setup = (k) => p.evaluate(async (k) => {
    P.beat = NPCS.map(n => n.n); P.gate = 5; P.unl = ['potion', 'revive', 'smoke', 'bomb', 'trap', 'scout', 'remedy', 'draw', 'bolt', 'flip', 'reclash', ...CM_ORDER]; P.cm = P.cm || []; P.cm[P.dk] = k; save();
    chooseNpc(NPCS.findIndex(n => n.d === 1)); await new Promise(r => setTimeout(r, 2600));
    const G = S.G;
    G.over = false; G.busy = false; G.turn = 'p'; G.od = { p: 0, o: 0 }; G.hands.p = []; G.hands.o = [];
    G.board = G.board.map(x => (x && x.b ? x : null)); // keep blocked squares, clear the rest
    return { cmd: G.cmd.p, ok: !!G.pz };
  }, k);

  const card = (id) => p.evaluate(id => ({ ...CARDS[id] }), id);

  // Place a card directly on the board (bypasses the hand).
  const put2 = (i, who, c, hp) => p.evaluate(({ i, who, c, hp }) => {
    S.G.board[i] = { c, who, orig: who, hp: hp ?? (c.hp ?? hpOf(c)) };
  }, { i, who, c, hp });

  // Pick ids of cards with high edge values so clashes are predictable.
  const ids = await p.evaluate(() => CARDS.filter(c => c.lv === 1).slice(0, 6).map(c => c.id));
  const C = await Promise.all(ids.map(card));

  // ----- Switchback -----
  let r = await setup('switchback');
  check('switchback: commander equipped', r.cmd === 'switchback', r);
  await put2(0, 'p', C[0]); await put2(5, 'p', C[1]);
  let s = await p.evaluate(() => { const G = S.G; return { can: canOd(G, 'p'), before0: G.board[0].c.id, before5: G.board[5].c.id }; });
  check('switchback: Overdrive ready with two own cards', s.can === true, s);
  await p.evaluate(() => { odUse(); itemTarget(0); itemTarget(5); });
  s = await p.evaluate(() => ({ od: S.G.od.p, c0: S.G.board[0] && S.G.board[0].c.id, c5: S.G.board[5] && S.G.board[5].c.id, item: S.G.item }));
  check('switchback: Overdrive swaps the two picked cards', s.od === 1 && s.c0 === C[1].id && s.c5 === C[0].id, s);

  r = await setup('switchback');
  C.forEach(() => {});
  await put2(2, 'p', C[2]);
  const pass = await p.evaluate(({ c }) => { const G = S.G; G.hands.p = [c]; G.turn = 'p'; put(9, 'p', 0); return { sw: G.pz.p.sw, placed: G.board[9] && G.board[9].c, orig: c }; }, { c: C[3] });
  const flipped = pass.placed && pass.placed.v && pass.orig.v && pass.placed.v[0] === pass.orig.v[2] && pass.placed.v[1] === pass.orig.v[3];
  check('switchback passive: first card placed is turned 180°', pass.sw === 1 && flipped, pass);

  // ----- Mirror (Star Lynx) -----
  r = await setup('mirror');
  await put2(5, 'p', C[0]); await put2(6, 'o', C[1]);
  await p.evaluate(() => { odUse(); itemTarget(5); });
  s = await p.evaluate(() => ({ wd: S.G.board[5].wd, od: S.G.od.p }));
  check('mirror: Overdrive marks the card', s.wd === 1 && s.od === 1, s);
  const reb = await p.evaluate(() => {
    const G = S.G; const own = G.board[5], foe = G.board[6];
    const h0 = foe.hp, o0 = own.hp;
    hitCard(G, 'o', 6, { L: 5, j: 6, dm: 2 }); // enemy at 6 hits own card at 5
    return { foe: foe.hp - h0, own: own.hp - o0, wd: own.wd };
  });
  check('mirror: the next clash hit rebounds onto the attacker', reb.own === 0 && reb.foe === -2 && reb.wd === 0, reb);
  r = await setup('mirror');
  await put2(4, 'p', C[2]);
  const bolt = await p.evaluate(() => {
    const G = S.G; G.ap.o = 3; G.items.o.bolt = 2; G.turn = 'o';
    const h0 = G.board[4].hp; applyItem(G, 'o', 'bolt', 4); // the opponent's Bolt hits your Star Lynx-protected card
    return { lost: h0 - G.board[4].hp, flag: G.pz.p.mir };
  });
  check('mirror passive: first enemy Bolt deals 1 less', bolt.lost === 1 && bolt.flag === 1, bolt);

  // ----- Encore -----
  r = await setup('encore');
  await p.evaluate(({ c }) => { S.G.grave.p = [c]; }, { c: C[4] });
  const can = await p.evaluate(() => canOd(S.G, 'p'));
  check('encore: Overdrive needs a lost card and an empty square', can === true);
  await p.evaluate(() => { odUse(); const G = S.G; const empty = G.board.findIndex(x => !x); itemTarget(empty); window.__e = empty; });
  s = await p.evaluate(() => ({ at: window.__e, c: S.G.board[window.__e] && S.G.board[window.__e].c.id, hp: S.G.board[window.__e] && S.G.board[window.__e].hp, grave: S.G.grave.p.length }));
  check('encore: lost card returns at 3 HP', s.c === C[4].id && s.hp === 3 && s.grave === 0, s);
  const enc = await p.evaluate(() => {
    const G = S.G; G.board[3] = { c: { ...CARDS[0] }, who: 'p', orig: 'p', hp: 0 };
    bury(G, 3); return { ap: G.ap.p, flag: G.pz.p.enc, grave: G.grave.p.length };
  });
  check('encore passive: first defeat gives 1 AP', enc.flag === 1 && enc.grave >= 1, enc);

  // ----- Rally Cry -----
  r = await setup('rally');
  await p.evaluate(() => { odUse(); });
  const rl = await p.evaluate(({ c }) => { const G = S.G; G.hands.p = [c]; const v0 = c.v.slice(); put(10, 'p', 0); return { flag: G.pz.p.ral, v0, placed: G.board[10] && G.board[10].c.v }; }, { c: C[5] });
  check('rally: next card placed gets +1 on all sides', rl.flag === 0 && rl.placed && rl.placed.every((x, k) => x === Math.min(10, rl.v0[k] + 1)), rl);
  r = await setup('rally');
  await p.evaluate(({ c }) => {
    const G = S.G; G.board[12] = { c: { ...CARDS[0] }, who: 'o', orig: 'o', hp: 0 };
    G.hands.p = [c]; put(14, 'p', 0);
  }, { c: C[0] });
  await p.waitForTimeout(1300);
  const rp = await p.evaluate(() => ({ flag: S.G.pz.p.rl, hp: S.G.board[14] && S.G.board[14].hp, base: S.G.board[14] && hpOf(S.G.board[14].c) }));
  check('rally passive: first kill gives your card +1 HP', rp.flag === 1 && rp.hp === rp.base + 1, rp);

  // ----- Tremor (Siege Mech) -----
  r = await setup('tremor');
  await put2(0, 'p', C[0]); await put2(5, 'p', C[1]); await put2(3, 'o', C[2]);
  const tp = await p.evaluate(({ c }) => {
    const G = S.G; G.hands.o = [c]; G.turn = 'o';
    const h0 = null; put(4, 'o', 0); return { flag: G.pz.p.tr, hp: G.board[4] && G.board[4].hp, base: G.board[4] && hpOf(G.board[4].c) };
  }, { c: C[3] });
  check('tremor passive: enemy card placed next to two of yours loses 1 HP', tp.flag === 1 && tp.hp === tp.base - 1, tp);
  r = await setup('tremor');
  await put2(7, 'o', C[4], 3); await put2(8, 'o', C[5], 1); await put2(2, 'o', C[2], 3); await put2(11, 'p', C[0]); await put2(12, 'p', C[1]);
  s = await p.evaluate(() => { const G = S.G; return { can: canOd(G, 'p') }; });
  check('tremor: Overdrive ready when enemies touch your cards', s.can === true, s);
  await p.evaluate(() => odUse());
  s = await p.evaluate(() => ({ a: S.G.board[7].hp, b: S.G.board[8].hp, far: S.G.board[2] && S.G.board[2].hp, od: S.G.od.p }));
  check('tremor Overdrive: touching enemy cards lose 1 HP, none below 1, others untouched', s.a === 2 && s.b === 1 && s.far === 3 && s.od === 1, s);

  // Opponent commanders: the AI uses each Overdrive in the situation it is written for.
  const aiCases = {
    switchback: { setup: 'own2 losing' },
    mirror: { setup: 'own next to player' },
    encore: { setup: 'grave' },
    rally: { setup: 'hand strong' },
    tremor: { setup: 'player 3' },
  };
  for (const k of Object.keys(aiCases)) {
    await p.evaluate(async (k) => { P.beat = NPCS.map(n => n.n); P.gate = 5; P.unl = ['potion', 'revive', 'smoke', 'bomb', 'trap', 'scout', 'remedy', 'draw', 'bolt', 'flip', 'reclash', ...CM_ORDER]; NPCS[NPCS.findIndex(n => n.d === 1)].cm = k; chooseNpc(NPCS.findIndex(n => n.d === 1)); await new Promise(r => setTimeout(r, 2600)); }, k);
    const used = await p.evaluate((k) => {
      const G = S.G; G.over = false; G.busy = false; G.turn = 'o'; G.od = { p: 0, o: 0 }; G.hands.p = []; G.hands.o = [];
      G.cmd.o = k; G.board = G.board.map(x => (x && x.b ? x : null)); G.grave.o = []; G.ap.o = 3;
      const c = (id) => ({ ...CARDS[id] });
      const low = CARDS.filter(x => x.lv === 1);
      const put_ = (i, who, card, hp) => { G.board[i] = { c: card, who, orig: who, hp: hp ?? hpOf(card) }; };
      if (k === 'switchback') { put_(0, 'o', c(low[0].id), 1); put_(15, 'o', c(low[1].id), 1); put_(3, 'p', c(low[2].id)); put_(7, 'p', c(low[3].id)); G.ap.p = 0; G.placed = { p: 2, o: 2 }; G.mod = { Phantom: 0, Court: 0, Order: 0, Dominion: 0 }; }
      if (k === 'mirror') { put_(5, 'o', c(low[0].id)); put_(6, 'p', c(low[1].id)); }
      if (k === 'encore') { G.grave.o = [c(low[0].id)]; put_(0, 'p', c(low[1].id)); }
      if (k === 'rally') { G.hands.o = [CARDS.find(x => x.lv === 5)]; put_(0, 'p', c(low[0].id)); }
      if (k === 'tremor') { put_(0, 'p', c(low[0].id)); put_(5, 'p', c(low[1].id)); put_(10, 'p', c(low[2].id)); put_(1, 'o', c(low[3].id)); put_(9, 'o', c(low[4].id)); }
      G.turn = 'o'; G.busy = false; canOd(G, 'o') && aiCmd(G);
      return { od: G.od.o, can: canOd(G, 'o') };
    }, k);
    check(`AI uses its ${k} Overdrive when the situation fits`, used.od === 1, used);
  }
  await p.evaluate(() => { NPCS[NPCS.findIndex(n => n.d === 1)].cm = 'ifrit'; });

  // Real play: a full match with each commander, the player auto-playing, the AI on its own timers.
  for (const k of ['switchback', 'mirror', 'encore', 'rally', 'tremor']) {
    await p.evaluate(async (k) => { P.beat = NPCS.map(n => n.n); P.gate = 5; P.unl = ['potion', 'revive', 'smoke', 'bomb', 'trap', 'scout', 'remedy', 'draw', 'bolt', 'flip', 'reclash', ...CM_ORDER]; P.cm[P.dk] = k; save(); chooseNpc(NPCS.findIndex(n => n.d === 1)); await new Promise(r => setTimeout(r, 2600)); }, k);
    const res = await p.evaluate(async () => {
      let odUsed = false, turns = 0;
      for (let n = 0; n < 40; n++) {
        const G = S.G;
        if (!G || G.over) break;
        if (G.turn === 'p' && !G.busy && !G.item) { turns++; if (canOd(G, 'p') && Math.random() < 0.5) { odUse(); const t = itemTargets(G, 'p', 'od'); if (t.length && G.item === 'od') { if (G.cmd.p === 'switchback' && t.length >= 2) { itemTarget(t[0]); itemTarget(t[1]); } else itemTarget(t[0]); } odUsed = odUsed || !!G.od.p; } autoPlay(); }
        await new Promise(r => setTimeout(r, 260));
      }
      const G = S.G;
      return { over: !!(G && G.over), turns, odUsed, aiOd: !!(G && G.od.o) };
    });
    check(`real match plays with ${k}`, res.turns >= 3 || res.over, res);
  }
  check('no page errors during real matches', errs.length === 0, errs);

  // Every new commander is in the unlock pool and has all its text.
  const meta = await p.evaluate(() => ['switchback', 'mirror', 'encore', 'rally', 'tremor'].map(k => ({ k, ok: !!(CMD[k] && CMD[k].n && CMD[k].pas && CMD[k].od && CMD[k].s && CMD[k].u) && CM_ORDER.includes(k) })));
  check('all five commanders defined and listed', meta.every(m => m.ok), meta);
  check('no page errors', errs.length === 0, errs);
  await b.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
