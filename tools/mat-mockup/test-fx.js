// Card effects in the Cosmetics tab: buy, equip (one at a time), dropdown state survives re-render,
// every effect preview renders, and the board class follows the equipped effect.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const out = {};
  await p.evaluate(() => { P.gil = 9000; P.testAll = 1; P.fxo = []; P.fx = null; S.screen = 'shop'; S.shopTab = 'cos'; render(); });
  out.categories = await p.evaluate(() => [...document.querySelectorAll('details.cat summary span:first-child')].map(s => s.textContent));
  out.effectTiles = await p.evaluate(() => document.querySelectorAll('.fxt').length);
  out.previews = await p.evaluate(() => [...document.querySelectorAll('.fxp')].every(x => x.querySelector('.card') && x.className.includes(' fx-')));
  await p.evaluate(() => { S.fxOpen = { fx0: true }; render(); });
  out.dropdownOpenKept = await p.evaluate(() => document.querySelector('details.cat:nth-of-type(1)') ? true : null);
  out.dropdownOpenKeptFx = await p.evaluate(() => [...document.querySelectorAll('details.cat')][1].open);
  await p.evaluate(() => buyFx('halo'));
  out.afterBuy = await p.evaluate(() => ({ owned: P.fxo, equipped: P.fx, gil: P.gil, tagOwned: !!document.querySelector('.fxt .tg.gold') }));
  await p.evaluate(() => buyFx('tracer'));
  out.oneAtATime = await p.evaluate(() => ({ equipped: P.fx, owned: P.fxo.length }));
  await p.evaluate(() => equipFx('tracer'));
  out.unequipToggle = await p.evaluate(() => { equipFx('tracer'); return P.fx; });
  // Each effect can be bought and previewed; check none throw.
  const all = await p.evaluate(() => { P.gil = 999999; FX.forEach(f => buyFx(f.k)); render(); return { owned: P.fxo.length, total: FX.length, tiles: document.querySelectorAll('.fxt').length }; });
  out.allEffects = all;
  out.boardClassOnEquip = await p.evaluate(() => { P.fx = 'halo'; save(); return fxClass(); });
  await p.evaluate(() => { S.fxOpen = { fx0: true, fx1: true, fx2: true, fx3: true, fx4: true }; render(); });
  await p.waitForTimeout(600);
  await p.locator('.cat').first().scrollIntoViewIfNeeded().catch(() => {});
  await p.screenshot({ path: path.join(__dirname, 'fx-shop.png'), fullPage: false });
  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
