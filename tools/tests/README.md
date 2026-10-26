# Tests

Headless Playwright checks at a phone viewport (390x800). Run from the repo root:

```bash
NODE_PATH=$(npm root -g) node tools/tests/smoke.js    # screens, shop, cosmetics, broker, a match, asset integrity
NODE_PATH=$(npm root -g) node tools/tests/offline.js  # service worker, cache fill, offline reload (~1 min)
NODE_PATH=$(npm root -g) node tools/tests/commanders.js  # commander passives, Overdrives, a few AI matches (~1.5 min)
```

Each prints PASS/FAIL per check and exits non-zero on failure. Run them all before pushing.
Neither replaces checking on a real phone.
