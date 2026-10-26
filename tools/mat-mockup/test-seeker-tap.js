const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; coll = {}; for (const c of CARDS) if (c.lv <= 1) coll[c.id] = 1; const cap = packCap(); for (const c of CARDS) if (c.lv <= cap) coll[c.id] = 1; save(); S.screen = 'shop'; S.shopTab = 'packs'; render(); });
  const res = await p.evaluate(() => {
    const t = [...document.querySelectorAll('.ptile')].find(x => x.innerText.includes('Seeker pack'));
    t.click();
    const toast = document.querySelector('.toast');
    return { toast: toast ? toast.textContent : null, gil: P.gil };
  });
  console.log(JSON.stringify(res));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
