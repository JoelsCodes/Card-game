// Smoke test: every screen, shop, cosmetics, broker, a match, and asset integrity.
// Run from the repo root: NODE_PATH=$(npm root -g) node tools/tests/smoke.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

let failed = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : '  ' + JSON.stringify(info)));
  if (!ok) failed++;
};

(async () => {
  // Every asset the page names must exist on disk, and the manifest must list exactly assets/.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const refs = [...new Set(html.match(/assets\/[0-9a-f]{16}\.(?:png|jpg|mp3)/g))];
  check('referenced assets exist', refs.every(r => fs.existsSync(path.join(ROOT, r))), refs.filter(r => !fs.existsSync(path.join(ROOT, r))));
  const onDisk = fs.readdirSync(path.join(ROOT, 'assets')).filter(f => !f.startsWith('.')).map(f => 'assets/' + f).sort();
  const listed = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-manifest.json'), 'utf8')).sort();
  check('assets-manifest.json is up to date', JSON.stringify(onDisk) === JSON.stringify(listed), 'run node scripts/make-asset-manifest.js');
  const unref = onDisk.filter(f => !html.includes(f.slice(7, 23)));
  check('no unreferenced asset files', unref.length === 0, unref.slice(0, 10));

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = [], bad = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('requestfailed', r => bad.push(r.url()));
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(500);

  const r = await p.evaluate(async () => {
    const o = {};
    const tryIt = (k, f) => { try { o[k] = f(); } catch (e) { o[k] = 'ERR ' + e.message; } };
    P.beat = NPCS.map(n => n.n); P.gate = 5; P.unl = ['potion', 'revive', 'smoke', 'bomb', 'trap', 'scout', 'remedy', 'draw', 'bolt', 'flip', 'reclash', ...CM_ORDER]; P.gil = 999999;
    o.artMissing = CARDS.filter(c => !art(c)).map(c => c.id);
    o.musicOk = BM.every(u => /^assets\/[0-9a-f]{16}\.mp3$/.test(u));
    o.screens = {};
    for (const sc of ['title', 'menu', 'unlocks', 'decks', 'settings', 'guide', 'shop', 'hall'])
      tryIt('s_' + sc, () => { S.screen = sc; render(); return document.body.innerText.length > 20; });
    for (const t of ['packs', 'cos', 'coll'])
      tryIt('shop_' + t, () => { S.screen = 'shop'; S.shopTab = t; render(); return true; });
    tryIt('buyStd', () => { const g = P.gil; buy(0); return P.gil < g; });
    tryIt('buySeek', () => { const g = P.gil; buy(1); return P.gil < g || !seekPool().length; });
    tryIt('mat', () => { buyMat(MATS[0].k); equipMat(MATS[0].k); return P.mats.includes(MATS[0].k) && P.mat === MATS[0].k; });
    tryIt('fx', () => { buyFx(FX[0].k); if (P.fx !== FX[0].k) equipFx(FX[0].k); return P.fxo.includes(FX[0].k) && P.fx === FX[0].k; });
    tryIt('battery', () => { const was = !!P.bs; toggleBS(); const on = document.body.classList.contains('bsv') === !was; toggleBS(); return on; });
    tryIt('broker', () => { brokerSheet(); return true; });
    try { chooseNpc(0); await new Promise(res => setTimeout(res, 2500)); o.match = S.screen === 'game' && !!document.getElementById('bd'); }
    catch (e) { o.match = 'ERR ' + e.message; }
    return o;
  });
  await p.waitForTimeout(1200);
  const broken = await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));

  check('every card has art', r.artMissing.length === 0, r.artMissing);
  check('music uses hashed assets', r.musicOk === true);
  for (const [k, v] of Object.entries(r)) if (/^(s_|shop_|buy|mat$|fx$|battery|broker|match)/.test(k)) check(k, v === true, v);
  check('no broken images', broken.length === 0, broken);
  check('no failed requests', bad.length === 0, [...new Set(bad)].slice(0, 10));
  check('no page errors', errs.length === 0, errs);
  await b.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
