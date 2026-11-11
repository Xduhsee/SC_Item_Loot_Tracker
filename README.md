# SC Loot Tracker (desktop app)

Fan-made Star Citizen loot, blueprint and materials tracker. Not affiliated with CIG.
Your data is saved to a file on your PC, with a dated backup once a day (last 14 kept).

## Run it
1. Unzip this folder somewhere, open a terminal inside it.
2. `npm install`   (downloads Electron, a few hundred MB, once)
3. `npm start`     (opens the app, use this to try it)

## Build an installer to share
`npm run dist`  ->  installer and portable .exe appear in `dist/`.
Send your friend the installer. It is unsigned, so Windows SmartScreen will warn:
click "More info" then "Run anyway".

## Where your data lives
`%APPDATA%\sc-loot-tracker\` : `tracker-data.json`, `item-database.json`, `backups\`
(the Data & backup tab has an "Open data folder" button). It survives reinstalling.

## Move your list from the browser version
Browser version: Data & backup -> Create backup text -> Copy.
Desktop app: same tab -> paste into the box -> Replace my list.

## First launch
Press Update once (about a minute, ~60 MB) to fill autocomplete and blueprints.

## Features (v1.2 to v1.5)
- Tags (Keep / Sell / Scrap / Trade) and notes on each stack, with a tag filter
- Bulk select: move, tag or delete several stacks at once
- Craft list: pick blueprints, see total materials against what you own
- Armor sets: pieces owned per set and what is missing (needs one Update press)
- History: log of adds, removals and moves with a session summary
- CSV export of the inventory
- UEX price estimates behind a manual "Refresh UEX prices" button
- Finder tab (v1.3): UEX shops and prices, wiki blueprint missions with drop chances, links to Cstone and SC Craft Tools
- Loot log (v1.4, v1.5): optional system and place when adding an item (also in quick-add), a "Loot by location" panel and per-item history in the Finder, CSV export
- Planner tab (v1.6): ranks missions by how many blueprints you have not marked as known, using Star Citizen Wiki mission rewards (about 330 mission lookups once, then cached; estimates treat each reward pool as one blueprint from its list)
- Sessions tab (v1.7): start/stop timer or manual entry, aUEC per hour by activity, CSV export. Planner standing (v1.7): set your rank per giver, filter to missions you can accept, see which rank-ups unlock the most new blueprints
- Quick-add window on `Ctrl+Shift+L` (always on top, works over borderless windowed games)

## Repo layout
- `main.js`, `preload.js`, `store.js`: Electron shell and disk storage
- `app/index.html`: the tracker UI used by the desktop app
- `app/quick.html`: the small quick-add window
- `web/loot-tracker.html`: the same tracker as a single file for a browser
- `docs/README-for-friend.txt`: end-user install guide to send with the installer
- `.github/workflows/release.yml`: pushing a tag like `v1.0.1` builds the Windows installer and attaches it to a GitHub Release

## Releasing an update
1. Bump `"version"` in `package.json` (for example 1.1.0 to 1.1.1) and push.
2. `git tag v1.1.1` then `git push --tags`.
3. The workflow builds the installer and publishes it, with `latest.yml`, to Releases.
4. Installed copies (installer build only) check on launch, download it, and offer to restart. The portable .exe never auto-updates. The repo must be public for this to work.
