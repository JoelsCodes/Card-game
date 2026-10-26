// Headless check of the seeker pack: artwork, eligibility by rank, message and no charge when blocked.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const open = () => p.evaluate(() => { S.screen = 'shop'; S.shopTab = 'packs'; render(); });
  const seekTile = () => p.evaluate(() => [...document.querySelectorAll('.ptile')].find(t => t.innerText.includes('Seeker pack')).innerText.replace(/\s+/g, ' ').trim());
  const out = {};

  // Case 1: a fresh roster with plenty still obtainable: artwork and pack eligibility.
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; coll = {}; CARDS.filter(c => c.lv <= 1).slice(0, 5).forEach(c => coll[c.id] = 1); save(); });
  await open();
  out.rankOpen = { tile: await seekTile(), art: await p.evaluate(() => [...document.querySelectorAll('.ptile img')].some(i => i.src.includes('70af5f1f8165ef4a.jpg'))) };
  const gilBefore = await p.evaluate(() => P.gil);
  await p.evaluate(() => { if (!seekPool().length) throw new Error('expected pool'); buy(null, 1); });
  out.rankOpen.charged = gilBefore - (await p.evaluate(() => P.gil));
  out.rankOpen.gotNewCard = await p.evaluate(() => Object.keys(coll).length);

  // Case 2: blocked by rank. Own every card up to the cap, so the seeker has nothing left.
  await p.evaluate(() => { P.gil = 5000; coll = {}; for (const c of CARDS) if (c.lv <= 1) coll[c.id] = 1; const cap = packCap(); for (const c of CARDS) if (c.lv <= cap) coll[c.id] = 1; save(); });
  await open();
  out.blocked = { tile: await seekTile(), cap: await p.evaluate(() => packCap()) };
  const gilB = await p.evaluate(() => P.gil);
  await p.locator('.ptile', { hasText: 'Seeker pack' }).click({ force: true }).catch(() => {});
  await p.evaluate(() => buy(null, 1));
  out.blocked.chargedAfterAttempt = gilB - (await p.evaluate(() => P.gil));
  out.blocked.toast = await p.evaluate(() => (document.querySelector('.toast') || {}).textContent || null);

  // Case 3: owns every card in the game.
  await p.evaluate(() => { P.gil = 5000; coll = {}; for (const c of CARDS) coll[c.id] = 1; save(); });
  await open();
  out.all = { tile: await seekTile() };

  console.log(JSON.stringify({ ...out, errors: errs }, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
