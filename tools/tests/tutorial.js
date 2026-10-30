// Tutorial: the first map node (Quill). Gates the rest of the map, plays a fixed-hand match,
// pays 50 MGP once on the first win, and pays nothing on a replay.
// Run from the repo root: NODE_PATH=$(npm root -g) node tools/tests/tutorial.js
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

let failed = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : '  ' + JSON.stringify(info)));
  if (!ok) failed++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  const newPage = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('file://' + path.join(ROOT, 'index.html'));
    await wait(800);
    return { p, errs };
  };

  // 1. Gate on a fresh save: only the tutorial is open.
  {
    const { p, errs } = await newPage();
    const g = await p.evaluate(() => ({
      t0: tierOpen(0), t1: tierOpen(1), t2: tierOpen(2), t5: tierOpen(5),
      total0: tierTotal(0), tutNode: NPCS[0].n, tutD: NPCS[0].d, npcs: NPCS.length, mapPos: MAPPOS.length,
    }));
    check('tutorial is the first map node (tier 0, NPCS[0])', g.tutNode === 'Quill' && g.tutD === 0, g);
    check('tutorial is open on a fresh save', g.t0 === true, g);
    check('rest of the map is locked before the tutorial', g.t1 === false && g.t2 === false && g.t5 === false, g);
    check('every opponent has a map slot', g.mapPos === g.npcs, g);
    check('no page errors on the map', errs.length === 0, errs);
    await p.close();
  }

  // 2-3. Play the tutorial match and check the payout.
  const playOnce = async () => {
    const { p, errs } = await newPage();
    const before = await p.evaluate(() => ({ gil: P.gil, beat: P.beat.includes('Quill') }));
    await p.evaluate(() => { chooseNpc(0); });
    await wait(400);
    const start = await p.evaluate(() => ({
      screen: S.screen, opp: S.opp && S.opp.n, hand: S.G && S.G.hands.p.length,
      banner: !!document.querySelector('.tut'), rules: S.G && S.G.rules.length,
    }));
    check('tutorial starts a match with a fixed hand and a banner', start.screen === 'game' && start.opp === 'Quill' && start.hand >= 5 && start.banner, start);
    // Play the player's turns with the game's own timer, until the match ends.
    const t0 = Date.now();
    let res = null;
    while (Date.now() - t0 < 90000) {
      res = await p.evaluate(() => {
        const G = S.G;
        if (!G) return { done: true };
        if (G.over) return { done: true };
        if (G.turn === 'p' && !G.busy) { autoPlay(); }
        return { done: false };
      });
      if (res.done) break;
      await wait(350);
    }
    await wait(2500);
    const after = await p.evaluate(() => ({ gil: P.gil, beat: P.beat.includes('Quill'), k: S.res && S.res.k, first: S.res && S.res.first, screen: S.screen, over: !!(S.G && S.G.over), open1: tierOpen(1) }));
    check('match finished within 90 s', after.over === true, after);
    check('no page errors in the match', errs.length === 0, errs);
    await p.close();
    return { before, after };
  };

  // The tutorial hand is fixed, so it should win; run it three times in fresh saves to check that.
  const wins = [];
  for (let i = 0; i < 3; i++) {
    const r = await playOnce();
    console.log('run ' + (i + 1) + ' result: ' + JSON.stringify(r.after));
    if (r.after.k === 'win') {
      check('run ' + (i + 1) + ': win pays 50 MGP and marks the tutorial beaten', r.after.beat && r.after.gil - r.before.gil === 50, { before: r.before, after: r.after });
      check('run ' + (i + 1) + ': a win opens the rest of the map', r.after.open1 === true, r.after);
      wins.push(r);
    } else {
      check('run ' + (i + 1) + ': a loss does not mark the tutorial beaten', !r.after.beat && r.after.gil === r.before.gil, { before: r.before, after: r.after });
    }
  }
  check('the tutorial is won in at least 2 of 3 runs', wins.length >= 2, wins.length);

  await b.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall tutorial checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
