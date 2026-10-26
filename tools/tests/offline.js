// Offline test: service worker install, cache fill, stale-asset cleanup, offline reload.
// Run from the repo root: NODE_PATH=$(npm root -g) node tools/tests/offline.js
// Starts its own local server; takes about a minute while the cache fills.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };

let failed = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : '  ' + JSON.stringify(info)));
  if (!ok) failed++;
};

const server = http.createServer((req, res) => {
  let f = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (f.endsWith('/')) f += 'index.html';
  const file = path.join(ROOT, f);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, async () => {
  const URL0 = `http://localhost:${server.address().port}/`;
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload();
    const fill = await p.evaluate(async () => {
      const want = (await (await fetch('assets-manifest.json')).json()).length;
      for (let i = 0; i < 240; i++) {
        const c = await caches.open('vanguards-end-v1');
        const have = (await c.keys()).filter(r => r.url.includes('/assets/')).length;
        if (have >= want) return { want, have };
        await new Promise(r => setTimeout(r, 500));
      }
      return { want, timeout: true };
    });
    check('cache fills with every asset', !fill.timeout, fill);

    await p.evaluate(async () => (await caches.open('vanguards-end-v1')).put('/assets/0000000000000000.png', new Response('x')));
    await p.reload();
    await p.waitForTimeout(2500);
    check('stale assets are removed', await p.evaluate(async () => !(await (await caches.open('vanguards-end-v1')).match('/assets/0000000000000000.png'))));

    await ctx.setOffline(true);
    await p.goto(URL0 + '?action=new');
    await p.waitForTimeout(800);
    check('page opens offline (with ?query)', await p.evaluate(() => typeof render === 'function' && document.body.innerHTML.length > 1000));
    const art = await p.evaluate(async () => {
      const d = document.createElement('div');
      CARDS.slice(0, 40).forEach(c => { const e = document.createElement('div'); e.className = 'card'; e.style.width = '60px'; e.innerHTML = art(c); d.appendChild(e); });
      document.body.prepend(d);
      await new Promise(r => setTimeout(r, 1500));
      const imgs = [...d.querySelectorAll('img')];
      return { total: imgs.length, ok: imgs.filter(i => i.complete && i.naturalWidth > 0).length };
    });
    check('card art loads offline', art.ok === art.total, art);
    check('no page errors', errs.length === 0, errs);
  } finally {
    await b.close();
    server.close();
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
});
