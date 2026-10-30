# Vanguard's End: notes for Claude

Single-file vanilla-JS card-game PWA. Almost everything is in `index.html` (inline CSS + JS, ~250 KB). No build step, no framework.

## Working rules (from the owner)
- Show a mockup/screenshot before big UI changes; they like to compare options.
- Do NOT add pity systems, guaranteed-drop mechanics or similar economy changes without approval.
- Test with Playwright (`NODE_PATH=$(npm root -g) node script.js`), headless, phone viewport 390x800. Say that it was not checked on a real phone.
- Commit and push every change. Commit messages end with the trailers the current session reminder gives. A "repository moved" notice on push is harmless.
- Never use `pkill -f` / `kill $(pgrep -f ...)` (kills the shell).
- Python string patching of index.html: assert each old string occurs exactly once, then replace.

## Structure
- `render()` builds the current screen with `a.innerHTML` in an else-if chain on `S.screen`: title, menu (world map), unlocks, decks, settings, guide, shop, draft, deck, game, hall. Bottom tabs: `TABDEF`/`drawTabs` (Play, Unlocks, Shop, Decks).
- State: `S` (UI, not saved), `P` (player save, localStorage key `PK`: xp, gil/MGP, beat[], unl[], prog, gate, mapTier...), `coll` (owned cards by id).
- Cards: `CARDS` is built from the literal table `CD` (name, type c/m/s, stars 1-5, `v` = [top, right, bottom, left], faction); `g` is the collection (`COLN`, ~20 cards each). Cards carry no original-name or game-tag fields; art is keyed by card id (`NEWART`, `IMG`, `SPECIAL`). Opponents: `NPCS` parsed from the `NR` string (name|collection|tier 0-5|greeting; tier 0 is the Quill tutorial), 7/10/9/7/7 per tier. `TAUNT` holds extra quotes; `LX` holds in-match lines.
- Tiers/regions: `tierOpen(d)` needs every opponent of tier d-1 beaten (`tierDone/tierTotal`); `P.gate` grandfathers old saves. `region()` = highest open tier.
- Shop: `PRICE`, `packLevel()`, `packCap()` (min of deck rank and region), `buy(g, seek, dir)`; packs: Standard, Game, Seeker (unowned only), Top/Right/Bottom/Left-heavy (1.5x weight). Duplicates refund `SELL[lv]`. Rematch wins pay `REMATCH` (40%) MGP.
- Deck rules: max 1 five-star, 2 four-star... see `okAdd`. Opponents use `oppOk`: same limits, but Region 4+ may hold a third 4-star and Region 5 a second 5-star. Opponent decks are fixed at load from the tier's rank pool (`NPCS`), not earned. The AI's search reads the player's real hand (`search(nb,G.hands.p,...)`), i.e. it sees hidden cards. Rog pays full MGP on a loss until first beaten (in `reward`). The last 3 Region 1 opponents use ai 1.
- World map: `worldMap()` + `MAPIMG` (5 stacked slices), `MAPPOS` (node positions), scrolls only the unlocked part. Tier gateways (`gateH`/`gateSVG`, Thornwall/Runeward/Frostveil/Voidrift) burn away on unlock.
- Scenes: `SCENES`, `playScene(key, after)` (rAF loop). Shopkeeper: `KEEP`, `keeperSay`. Match: `startGame`, `put`, `reward`, `winExtra`.
- Theme: brushed metal, always dark. Tokens `--m1..--m3`, `--gb` (gold border gradient), `--gf` (gold fill) at the end of the main `<style>`; tray class `.htray`, board `#bd`.

## Assets
- `assets/` has content-hashed file names. After adding/removing assets run `node scripts/make-asset-manifest.js` (updates `assets-manifest.json`). The service worker is cache-first for `/assets/`, network-first for pages.

## Testing / balance
- `tools/tests/smoke.js` (screens, shop, cosmetics, broker, a match, asset integrity) and `tools/tests/offline.js` (service worker, offline reload), and `tools/tests/commanders.js` (passives, Overdrives, a few full AI matches), and `tools/tests/tutorial.js` (the Quill tutorial: gates the map, pays 50 MGP once). Run them before pushing; see `tools/tests/README.md`.
- `tools/balance/campaign2.js` is the current full-career simulator (beat all 40, rematch farming optional): `node campaign2.js RUNS seek|std mirror|0|1|2 FARM`. Writes JSON to /home/claude/balance_data. Last run Oct 26 2026 (results: tier 1 too easy, tiers 2-3 hardest, tiers 4-5 easier than 3; farming does not speed progress because pack rank is capped by region; all unlockables earned by region 3). `campaign.js` is the older version.
- `tools/godot-mcp/` is separate from the game: an MCP server (`server.js`) plus Godot 4 editor plugin (`addons/claude_bridge`) that let Claude drive the Godot editor. Tests: `node test/mock.js`, `node test/e2e.js /path/to/godot`. See its README.
- Useful in headless tests: set `P.beat`, `P.gate=5` and `P.unl` to unlock everything (see `tools/tests/smoke.js`); call `chooseNpc(i)` to start a match; `buy()`, `reward()`, `render()` are global.
