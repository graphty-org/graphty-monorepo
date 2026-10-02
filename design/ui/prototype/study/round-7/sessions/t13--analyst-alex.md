# Session: rerun March's analysis on April's transfers -- Analyst Alex

Task as given: "April's transfers have arrived as a new export. You want everything you built on
March -- the rings, the rankings, the colors -- to run again on April's numbers in place of
March's, without rebuilding anything."

Start screen: shots/tasks/t13/01.png. All renders are in
tmp/round-7-sessions/t13--analyst-alex/. Every command was run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <png> task:t13 ...`.

## Steps, thinking aloud

1. Start screen. Title "Transfers, March 2026" with a dropdown. Louvain colors, 35 groups, a
   "Links in (count)" ranking. "I want to swap the data under this. The title has an arrow --
   start there."
   `--click "Transfers, March 2026"` -> 01.png
   Menu: Rename, Save, Save as, Export, Apply recipe or style file..., Version history, Close
   project. "No 'replace data' or 'import'. 'Apply recipe' sounds backwards -- it puts a recipe
   ONTO what's open, and what's open is March. Data is probably on the Data tab."

2. `--click "Data"` -> 02.png
   Sources: accounts-2026-03.csv (3,000 nodes), transfers-2026-03.csv (9,113 rows). Filter
   "amount is at least 1,000", 812 of 3,000 nodes. "Good, the files. But the picture just went to
   gray hexagons and it says 'Nothing is colored or sized by a row'. Did I lose my colors by
   opening a tab? Guessing it's just a different view." Each file has a "..." with no label.

3. `--click "Data" --hover "transfers-2026-03.csv"` -> 03.png. Only highlights the row.

4. `--click "Data" --click "More"` -> 04.png. Wrong menu: the graph's own menu on the right, with
   "Clear graph data" in it. "Not touching that."

5. `--click "Data" --click "transfers-2026-03.csv"` -> 05.png
   Opens "Edit: transfers", the column mapping (from/to account, amount as weight, timestamp).
   "I'd expect to swap the file here. No 'Replace' or 'Choose file' button."

6. `... --click "transfers-2026-03.csv"` (the file name in the editor) -> 06.png. Nothing.

7. `... --click "CSV, comma"` -> 07.png. "File settings": format, separator, ids, stop after
   100 errors. "Parsing settings only. Not a different file."

8. `--click "Data" --click "Replace"` -> "nothing on screen is called Replace" (08.png).

9. Guessed names for the "..." by hovering: "Source actions" (nothing), "More options"
   (nothing), "Actions" -> 09.png, "Options" -> 10.png.
   09.png tooltip: "Actions for accounts-2026-03.csv". 10.png: "Table options" at the bottom.
   "So that's its name. Took me a while because the dots don't say anything until you hover."

10. `--click "Data" --click "Actions for transfers-2026-03.csv"` -> 11.png
    Menu: Rename, Replace with file..., Edit source..., Refresh. "Replace with file -- that's
    it."

11. `... --click "Replace with file..."` -> 12.png
    "Replace: transfers-2026-03.csv". New file transfers-2026-04.csv, 8,370 rows. "All 4 columns
    of transfers-2026-03.csv are here, so every role carried over." Load / Cancel.
    "That's what I'd want: weight still amount, direction still directed, and a row count I can
    check against SQL. BUT the preview rows have March timestamps (2026-03-29, 2026-03-25...) and
    are the same rows as the March preview. Is this really April's file? I'd open it in Excel to
    check. The count changed, so I'll go on. Also: April may have accounts that aren't in the
    March accounts file, and nothing here says how many ids don't match an account."

12. `... --click "Load"` -> 13.png
    "Source still says transfers-2026-03.csv, 9,113 rows, 9,113 edges, 'r...' cut off. Summary
    still 9,113 edges -- the replace screen said 8,370. Title still March 2026. AND my filter
    'amount is at least 1,000' is gone: 'No filters'. That's exactly the thing I'm scared of."

13. `... --click "Load" --hover "transfers-2026-03.csv"` -> 14.png. No tooltip; the cut-off
    text stays cut off.

14. `... --click "Load" --click "Graph"` -> 15.png
    Pixel-for-pixel the start screen: Community 1 297, Community 2 182, modularity 0.688,
    "Run from Louvain, Sep 28". "If this had re-run on 8,370 April transfers, something would
    have moved, and the date would be today. Either the load didn't take, or I'm looking at
    March's results on April's data. That's the worst case -- a deck that says April and shows
    March."

15. `... --click "from Louvain, Sep 28"` -> 16.png
    Opens the general "Analyze" picker. "So I could run Louvain again by hand. And PageRank. And
    redo the colors. That's rebuilding everything, which is what I already do in Gephi every
    month. I'm stopping."

## Outcome

- Did I succeed? No, or at least I can't tell, which for a monthly deck is the same as no. I
  found "Replace with file" and the replace screen looked right. After Load, nothing on screen
  showed April: same file name, same 9,113 edges, same March title, same communities, same
  Sep 28 date. My filter disappeared. I never saw any sign that the rings, rankings or colors
  re-ran.
- Single Ease Question: 2 of 7. Most of the time went to finding a "..." with no label, and then
  I couldn't tell whether it had worked.
- Would I use this instead of my current tool? Not for the monthly refresh yet. The replace
  screen ("every role carried over", the row count) is the part Gephi doesn't have, and if it
  had then shown me April's counts and "Louvain re-run today, groups changed from 35 to N", I'd
  switch for this alone, because redoing the Gephi half every month is my biggest time sink.
  As it stands I'd still rerun in Python and rebuild the picture by hand, because I can't prove
  which month's numbers I'm looking at.

## What got in the way, in my words

- "The '...' next to each file has no label. I tried three wrong things before hovering found
  'Actions for ...'."
- "The replace preview shows March dates. Is it even the April file?"
- "After Load the file name, edge count and title all still say March."
- "My filter vanished when I loaded the new file, and nothing told me."
- "Louvain still says Sep 28, with the same sizes. Did it re-run or not?"
- "Opening the Data tab turned my colored graph gray. It made me think I'd lost my colors."
- "Nothing told me whether April's transfers point at accounts that aren't in the March
  accounts file."
