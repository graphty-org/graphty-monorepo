# Session: re-run March's work on April's export -- fraud analyst (Sarah)

Task as given: "April's transfers have arrived as a new export. You want everything you built on
March -- the rings, the rankings, the colors -- to run again on April's numbers in place of
March's, without rebuilding anything."

Mode: first-impression patience (not mandated). Renders are in
tmp/round-7-sessions/t13--fraud-analyst/. All commands were run from design/ui/prototype with
`timeout 120 node app-b/study.mjs --try <abs path>/NN.png task:t13 ...`; only the steps are listed.

Outcome: gave up. I did not find a way to swap March's file for April's.

## Steps, in my own words

**01 (start screen).** March's chart, colored by Louvain rings, 35 groups. A "Links in (count)"
row as well. Title at top: "Transfers, March 2026" with a dropdown arrow. That's the case name;
that's where I'd expect "load next month" or "replace data".

**02 -- `--click "Transfers, March 2026"`.** Rename, Save, Save as, Export, "Apply recipe or style
file...", Version history, Close project. Nothing says replace, refresh, new month, new export.
"Apply recipe" sounds like bringing something IN, not swapping my data. Left rail says Data.

**03 -- `--click "Data"`.** There they are: accounts-2026-03.csv and transfers-2026-03.csv, each
with three dots. That's my March export. I want to swap the transfers one. Also notice my
Louvain colors vanished on this screen: "Nothing is colored or sized by a row". Did I lose
something just by clicking Data? Unsettling.

**04 -- `--click "Data" --hover "transfers-2026-03.csv"`.** Row highlights. No tooltip, no hint.

**05 -- `--click "Data" --click "..."`** -> "nothing on screen is called ...". Then
`--click "Data" --click "More"`. A menu opened -- but the one in the top right corner for the
whole graph, not the file. "Select all visible, Re-run layout, Add node..., Clear graph data".
Not touching "Clear graph data". Wrong dots.

**06 -- `--click "Data" --click "transfers-2026-03.csv"`.** Opens "Edit: transfers": the column
mapping. from_account -> From, to_account -> To, amount -> Weight (Stronger), timestamp -> Time.
Good, that IS my import spec, the thing I don't want to redo. But no place to point it at a new
file. The file name sits in grey next to "CSV, comma".

**07 -- same plus `--click "transfers-2026-03.csv"` again.** Dead text. Nothing happens.

**08 -- `... --click "CSV, comma"`.** "File settings: transfers-2026-03.csv": format, separator,
ids, stop after 100 errors. Nothing about choosing a different file.

**09 -- probing the row's dots by name:** `--hover "More actions"`, `"Actions"`,
`"Source actions"`, `"Options"`. The ones that matched grabbed other controls (the last one
showed "Table options" down at the bottom). Never the dots by the transfers file.

**10 -- `--click "Replace"`, `"Update"`, `"Reload"`, `"Replace file"`** -> nothing on screen is
called any of those. Then `--click "Data" --click "Transfers"` (the panel header dropdown):
"Transfers 3,000 nodes" and "Compare graphs...". Compare -- not swap. Closed it.

**11 -- more name guesses for the row dots:** `--hover "More for transfers"`,
`"Menu for transfers-2026-03.csv"`, `"File actions"`, `"More options"`, `"Add source"` -> all
"nothing on screen is called".

**12 -- `--click "Data" --click "Add data"`** (the + by Sources). File..., From a URL...,
Paste..., Set collection... That's ADD. If I add April here I expect March and April stacked
together, which is the wrong picture for a monthly review.

**13 -- `... --click "File..."`.** A file chooser: "Data file: CSV, JSON, GEXF or GraphML",
"Recipe: mule-ring-triage.graphty", "Style file: risk-review-look.json".

**14 -- `... --click "Data file: CSV, JSON, GEXF or GraphML"`.** Header says "Open as a new
graph". And it threw my mapping away: columns map to "node", amount is just an "Attribute",
"Weight: none (each edge counts 1)". That's exactly the rebuild I'm trying to avoid. Also it's
still showing the March file name and March dates -- I can't tell what I'd be loading. Cancel.

**15 -- `--click "Data" --click "from 2 tables"`.** The link in the right panel. Same mapping
editor as step 06. Still no "use a different file".

**16 -- `--click "Transfers, March 2026" --click "Apply recipe or style file..."`.** "Apply
recipe: Mule ring triage" -- watchlist, "Personalized PageRank", max flow, cycles. "You supply:
a network." So a recipe is somebody's saved settings, not my March work (my March work is the
Louvain rings and the links count). I suppose the idea might be: open April as a new graph,
then apply a recipe of March. But I never made a recipe, nothing offered to save one, and
"Open as a new graph" already lost my weight setting. Cancel.

**17 -- last tries at the row dots:** `--click "More actions for transfers-2026-03.csv"`,
`"transfers-2026-03.csv options"`, `"Source options"`, `"transfers-2026-03.csv menu"` -> nothing.
`--hover "transfers-2026-03.csv" --hover "More"` -> tooltip "More actions Shift+F10" on the
top-right graph menu again, not on my file.

Stopped here. About fifteen minutes in, past my patience for a first look.

## Verdict

**Succeeded?** No. I never got April in. Everything I found either edits March's mapping,
adds a second file next to March, or opens April as a brand-new graph with my settings gone.

**Single Ease Question:** 2 of 7.

**Would I use this instead of my current tool?** Not for this. In Excel next month I paste April
into the same sheet and the pivot refreshes. In i2 I save the import spec and run it on the new
file. Here the thing that should be the swap point -- the file name in Sources -- does nothing
I could find, and the screen that looked like it would take a file ("Open as a new graph")
dropped my amount weighting on the spot. If I have to rebuild the rings and colors every month,
that's an afternoon per month I don't have.

## What tripped me up, plainly

- The file row in Sources is the obvious place to say "here's April instead". Pointing at it
  gave no hint, and its three dots had no name I could find; every "More" I reached was a
  different menu.
- No word anywhere for replace / refresh / new version / next month.
- "Add data" adds; "Open as a new graph" starts over and loses the weight. Neither says
  "keep everything, swap the numbers".
- Clicking Data made the Louvain colors disappear ("Nothing is colored or sized by a row").
  I didn't know if I'd broken something.
- "Recipe" sounds like the answer but the only one offered is someone else's, uses PageRank
  jargon, and nothing told me how to make one from March.
- What I'd want: on the transfers file, "Replace with a newer export...", then a check that
  the columns still match, then my rings and colors rerun -- and a line telling me March is
  still in version history.
