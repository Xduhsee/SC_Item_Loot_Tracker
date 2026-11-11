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
- Redesign (v1.8): MGS Dynamics logo and icon, five sections (Home, Stuff, Find, Track, Data) with sticky navigation and sub-pages, a Home screen (quick add, session timer, what to farm next, recent loot), remembered add defaults, toast messages, compact rows, shortcuts (Alt+1 to 5, / for search)
- Inventory as a grouped table (size and grade chips, tag pills, value column, Find/Note/Move actions); Blueprints checklist with category and material chips, plus a Cards view; Craft list and Armor sets in the same table style (v1.9.1)
- Materials tab (v1.10): one row per material, quality and location, with quality bands and a minimum-quality setting for craftable checks; ship components show their class (Military, Stealth, Industrial, Civilian, Competition)
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

## v1.11.0
- Data tab: labelled backups (import, restore, manual) with a Restore button. Restoring takes a snapshot of your current data first.
- Quality field on Home quick-add for materials; Undo now covers materials.
- Planner and Sessions restyled as tables to match the rest of the app.

## v1.12.0
- Inventory rows with a known blueprint show "Scraps into about ..." with the materials you get back. It's an estimate: half of the crafting recipe. Verify in game.

## v1.13.0
- Inventory: select items and press "Scrap total" to see the materials you'd get back. "Add to Materials and remove these items" moves them into the Materials tab (quality unknown) and Undo reverses it.
- Fixed: the Delete button in the selection bar did nothing. It now deletes the selected stacks after a second click, and Undo restores them.

## v1.14.0
- New top-level Missions tab: mission cards grouped by faction, filter and sort by activity (Hauling, Combat, Mining, Salvage and so on), with requirements shown up front (cargo and SCU, enemies, system, where offered). The wiki data has no pickup or drop-off locations, so those show as chosen in game.
- New My Standing tab: set your rank per faction once; the Missions board and Planner use it.
- Home, Finder, Loot by location, History, Data and "Added this patch" restyled to match Inventory and Blueprints, with proper empty states and header status chip.
- Find buttons now open a popup with three tabs (Where to get it, Blueprint missions, Scraps into). "Open in Finder" jumps to the full tab; Esc closes it.
- Fixed: horizontal scrolling on phone-width screens.
