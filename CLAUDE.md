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
- Cards: `CARDS` (lv 1-5 stars, `v` = [top, right, bottom, left], game `g`). Opponents: `NPCS` parsed from the `NR` string (name|game|tier 1-5|greeting), 7/10/9/7/7 per tier. `TAUNT` holds extra quotes; `LX` holds in-match lines.
- Tiers/regions: `tierOpen(d)` needs every opponent of tier d-1 beaten (`tierDone/tierTotal`); `P.gate` grandfathers old saves. `region()` = highest open tier.
- Shop: `PRICE`, `packLevel()`, `packCap()` (min of deck rank and region), `buy(g, seek, dir)`; packs: Standard, Game, Seeker (unowned only), Top/Right/Bottom/Left-heavy (1.5x weight). Duplicates refund `SELL[lv]`. Rematch wins pay `REMATCH` (40%) MGP.
- Deck rules: max 1 five-star, 2 four-star... see `okAdd`; opponents follow the same rules.
- World map: `worldMap()` + `MAPIMG` (5 stacked slices), `MAPPOS` (node positions), scrolls only the unlocked part. Tier gateways (`gateH`/`gateSVG`, Thornwall/Runeward/Frostveil/Voidrift) burn away on unlock.
- Scenes: `SCENES`, `playScene(key, after)` (rAF loop). Shopkeeper: `KEEP`, `keeperSay`. Match: `startGame`, `put`, `reward`, `winExtra`.
- Theme: brushed metal, always dark. Tokens `--m1..--m3`, `--gb` (gold border gradient), `--gf` (gold fill) at the end of the main `<style>`; tray class `.htray`, board `#bd`.

## Assets
- `assets/` has content-hashed file names. After adding/removing assets run `node scripts/make-asset-manifest.js` (updates `assets-manifest.json`). The service worker is cache-first for `/assets/`, network-first for pages.

## Testing / balance
- `tools/balance/` has the campaign simulator (`node campaign.js 40`); see its README. It has NOT been re-run since the shop caps, rematch payouts and full-clear gateways were added.
- Useful in headless tests: `P.testAll=1` unlocks everything; call `chooseNpc(i)` to start a match; `buy()`, `reward()`, `render()` are global.
