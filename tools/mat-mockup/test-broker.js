// Traveling broker: appears after 7-10 matches, stays 3 matches, sells Gloamwood/Ruinspire only.
// Also checks that those cards never come from packs, the seeker or the starting top-up.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const out = {};
  out.collections = await p.evaluate(() => ({ gloam: CARDS.filter(c => c.g === 'Gloamwood').length, ruin: CARDS.filter(c => c.g === 'Ruinspire').length, restricted: CARDS.filter(isBro).length }));

  // Appearance timing: fixed target of 8 matches.
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; coll = {}; CARDS.filter(c => c.lv <= 1).slice(0, 5).forEach(c => coll[c.id] = 1); P.bro = { c: 0, t: 8, vis: 0, left: 0, stock: [] }; save(); });
  const seen = [];
  for (let i = 1; i <= 9; i++) { await p.evaluate(() => brokerTick()); seen.push(await p.evaluate(() => P.bro.vis)); }
  out.appearsAtMatch = seen.indexOf(1) + 1;   // expect 8

  // Stock: three restricted cards; some may be one tier higher.
  out.stockRestricted = await p.evaluate(() => P.bro.stock.every(id => isBro(CARDS[id])) && P.bro.stock.length === 3);

  // Buy the first item: gold goes down, the card is owned, and the slot is sold.
  const before = await p.evaluate(() => ({ gil: P.gil, id: P.bro.stock[0], price: brokerPrice(CARDS[P.bro.stock[0]]) }));
  await p.evaluate(() => buyBroker(0));
  out.buy = await p.evaluate(b => ({ spent: b.gil - P.gil, owned: !!coll[b.id], soldSlot: P.bro.stock[0] === null }), before);
  out.buy.expectedPrice = before.price;

  // Upgrade roll: forced 0.1 (<25%) then 0.5 to pick the first upgraded card.
  out.upgrade = await p.evaluate(() => {
    const real = Math.random; const seq = [0.1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]; Math.random = () => seq.length ? seq.shift() : 0.5;
    const s = brokerStock(); Math.random = real;
    const base = CARDS.filter(isBro); return { levels: s.map(id => CARDS[id].lv), allRestricted: s.every(id => isBro(CARDS[id])), poolLevels: [...new Set(base.map(c => c.lv))].sort() };
  });

  // Leaves after 3 matches while visible.
  const leave = [];
  for (let i = 0; i < 3; i++) { await p.evaluate(() => brokerTick()); leave.push(await p.evaluate(() => P.bro.vis)); }
  out.leave = leave;   // expect [1,1,0]

  // Packs, seeker and starting top-up never hand out restricted cards.
  out.restrictedFromPacks = await p.evaluate(() => {
    coll = {}; P.gil = 999999; P.testAll = 1;
    let bad = 0;
    for (let i = 0; i < 120; i++) { buy(); buy(1); buy(0, i % 4); }
    for (const id of Object.keys(coll)) if (isBro(CARDS[id])) bad++;
    coll = {}; topUp(); for (const id of Object.keys(coll)) if (isBro(CARDS[id])) bad++;
    return bad;
  });

  // Map shows the broker node while visible, and not after leaving.
  await p.evaluate(() => { P.bro = { c: 0, t: 8, vis: 1, left: 2, stock: brokerStock() }; save(); S.screen = 'menu'; render(); });
  out.mapNode = await p.evaluate(() => !!document.querySelector('[aria-label="Traveling broker"]'));
  await p.locator('[aria-label="Traveling broker"]').click();
  await p.waitForTimeout(400);
  out.sheetShown = await p.evaluate(() => !!document.querySelector('[aria-label="Traveling broker"].sheet, .sheet[aria-label="Traveling broker"]'));
  await p.screenshot({ path: path.join(__dirname, 'broker-sheet.png') });

  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
