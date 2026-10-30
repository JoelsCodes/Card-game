# Practice simulator

Runs full career campaigns against the game's own engine, with a bot playing the player's side.
Nothing here ships to players.

## Run it
    cd tools/balance
    node campaign.js 40        # 40 campaigns, prints a summary

Output:
- `campaign_last.json`: full log of the first campaign
- `campaign_rydia.json`: every match against Rydia from all campaigns

## Current rules in the campaign
- New player: 300 Sols, 10 starting cards, unlock system on.
- Player buys standard packs (150 Sols) whenever they can afford one.
- Player builds the best legal 10-card deck from owned cards.
- Item belt: Bolt, Bomb, Revive, Potion, Remedy, Reclash, Flip, Draw, Smoke, Trap, Scout (up to the belt limit).
- Command card: Mist Dragon, then Ifrit, then Choco, if unlocked.
- Each opponent is fought 5 times before moving on, win or lose.
- Run ends after 5 losses in a row.

## Limits
- The player uses the game's strongest AI, so real players will likely do worse.
- Draft matches use the player's collection instead of a draft.

## Editing the rules
The rules are in `campaign.js`: `__resetP`, `__belt`, `__play` and `__campaign`.
