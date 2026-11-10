SC LOOT TRACKER
Fan-made Star Citizen loot, blueprint and materials tracker.
Not affiliated with Cloud Imperium Games.

Track armor, weapons, weapon attachments, items and materials by quantity
and location, plus the blueprints you know. Everything is saved on your own
PC. Nothing you track is sent anywhere.


-----------------------------------------------
1. INSTALL
-----------------------------------------------

You were sent one of these two files. Double-click it.

  "SC-Loot-Tracker-Setup-... .exe"   (installer)
     Follow the prompts, choose a folder if you like, and finish.
     A Start menu / desktop shortcut is created. Open the app from there.

  "SC-Loot-Tracker-Portable-... .exe"   (portable, no install)
     Put it anywhere you like (Desktop, a Games folder) and double-click
     it to run. Make a shortcut yourself if you want one.

WINDOWS WARNING (this is normal)
The app is not code-signed, because that costs money, so Windows
SmartScreen may show "Windows protected your PC".
  1. Click "More info"
  2. Click "Run anyway"
Only do this because you got the file directly from the person who made
it. Never do it for a file from a stranger.


-----------------------------------------------
2. FIRST-TIME SETUP (do this once)
-----------------------------------------------

Open the app and press the UPDATE button (top right).

It downloads the full Star Citizen item and blueprint lists so that
autocomplete works. It takes about a minute and downloads roughly 60 MB.
You need an internet connection for this step only. After that the list
is saved on your PC.

Press Update again after each game patch to pull in new items. The
"Added this patch" tab shows what is new.


-----------------------------------------------
3. USING IT
-----------------------------------------------

INVENTORY tab
  - Start typing an item name. Pick it from the suggestions.
  - Set a quantity and a location (locations autocomplete too, and your
    own custom ones are remembered).
  - Click Add. Adding the same item to the same location stacks the
    quantity.
  - Use the +/- buttons or edit the numbers on a row to change quantity.
    Rows can be moved to another location or removed.
  - Use the filters and search box to find things quickly.

BLUEPRINTS tab
  - Mark the blueprints you know.
  - Materials from your inventory are compared against each blueprint,
    so you can see what you can craft right now.

  - Tag any row Keep / Sell / Scrap / Trade, and click "+ note" to add a
    short note. Filter by tag, or search for words in your notes.
  - Tick the boxes on several rows to move, tag or delete them together.
  - "Refresh UEX prices" downloads community-reported prices so each row
    shows an estimated value. Sell = what shops pay you, Buy = what they
    charge. Only some items have sell prices, and all numbers are
    estimates.

FINDER tab
  - Search any item, or press "Find" on a row in the Inventory or
    Blueprints tab. It shows where UEX says the item is sold and for how
    much, which missions reward its blueprint (with drop chance), what the
    blueprint needs, and links to the Cstone Item Finder and SC Craft Tools.
  - Shop data comes from UEX and mission data from the Star Citizen Wiki.
    Both are community-maintained and can lag behind a patch, so check the
    dates shown. Loot drop locations are not available from any source, so
    the Finder says so instead of guessing.
  - Needs an internet connection.

CRAFT LIST tab
  - On the Blueprints tab press "+ Craft list". This tab adds up the
    materials for everything on the list, compares them with what you own
    and shows what you are short of. "Copy shopping list" copies it.

ARMOR SETS tab
  - Shows how many pieces of each armor set you own (for example 3 of 4)
    and which piece is missing. Press + on a missing piece to log it.
  - Press Update once after installing this version so set data downloads.

HISTORY tab
  - A log of what you added, used, removed or moved, with a summary of
    the current session.

ADDED THIS PATCH tab
  - Lists items and blueprints new in the latest patch.

DATA & BACKUP tab
  - "Create backup text" gives you your whole list as text you can save
    or send to another PC. "Replace my list" or "Merge into my list"
    loads one back.
  - "Export inventory as CSV" saves your list for Excel or Google Sheets.
  - "Open data folder" shows where the app keeps your saved data.
  - Undo is available for list changes made in the current session.


QUICK ADD WINDOW (desktop app only)
  Press Ctrl+Shift+L anywhere to open a small always-on-top window. Type an
  item, a quantity and a location, press Enter, and it is added to your
  list. Press Esc to close it. Star Citizen must run in BORDERLESS
  WINDOWED mode for the window to appear over the game; it will not show
  over true fullscreen. If another program already uses Ctrl+Shift+L, the
  hotkey will not work, but Tools > Quick add window in the menu still does.


-----------------------------------------------
4. YOUR DATA
-----------------------------------------------

Your list is saved automatically as a file on your PC. A dated backup
copy is made once a day and the last 14 are kept. If the main file is
ever damaged, the app restores the newest good backup and tells you.

Updating or reinstalling the app does not delete your data. Uninstalling
may leave the data folder behind; use "Open data folder" in the Data &
backup tab to find it.

Want to keep your list safe long term? Occasionally use "Create backup
text" and save it somewhere outside the PC, such as cloud storage.


-----------------------------------------------
5. UPDATES
-----------------------------------------------

If you used the installer, the app checks for a new version each time it
opens. When one is ready it asks "Restart and update" or "Later". Your
saved list is not affected. You can also check by hand from the menu:
Help > Check for updates (press Alt if the menu bar is hidden).

The portable version never updates itself. For a new version, download
the newest file again and replace the old one. Your data stays safe.

Item updates (new game items) are separate: use the Update button inside
the app after each Star Citizen patch.


-----------------------------------------------
6. TROUBLESHOOTING
-----------------------------------------------

Update fails or stalls
  The item sources (Star Citizen Wiki and UEX) can be briefly down.
  Wait a few minutes and press Update again.

Autocomplete is empty
  Press Update once. The item list is not built in; it is downloaded.

App will not open after "Run anyway"
  Right-click the file, choose Properties, tick "Unblock" if shown, then
  Apply and try again.

Something looks wrong with my list
  Open the Data & backup tab. Check the banner at the top of the app. If
  your data file was restored from a backup, it says so.


Item data comes from the Star Citizen Wiki API and UEX. This tool is run
by neither of them, and either can be briefly unavailable.
