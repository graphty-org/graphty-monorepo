# Session: swap March's transfers for April's, keep everything built (alert reviewer, Nadia)

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which
are open now. April's export has arrived as transfers-2026-04.csv. You want everything you built
to run again on April's numbers in place of March's, without rebuilding it."

Start screen: shots/tasks/r8-t26/01.png -- "Transfers, March 2026", Louvain groups colored, a
"Links in (count)" layer, legend with Community 1-7.

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t26--alert-reviewer/.

## Steps, thinking aloud

1. 01.png (start). "Title says March. I need April's file in. There's a Data icon on the left."

2. `timeout 120 node app-b/study.mjs --try .../02.png task:r8-t26 --click "Data"`
   Data panel: Sources lists accounts-2026-03.csv and transfers-2026-03.csv, each with three dots.
   "There it is, the March transfers file. I want to swap it. The dots probably have Replace."

3. `--click "Data" --hover "transfers-2026-03.csv"` -> no tooltip.
   `--click "Data" --click "More actions for transfers-2026-03.csv"` -> nothing on screen is called that.
   `--click "Data" --click "..."` -> nothing on screen is called "...".
   `--click "Data" --hover "More"` -> first match is "More actions", tooltip "More actions Shift+F10".
   "I can't get at the dots next to the file by name."

4. `--click "Data" --click "More actions"` -> 04.png. A menu titled "Transfers": select all, fit,
   re-run layout, add node, add note, Clear graph data. "That's the whole-graph menu, not the
   file. Nothing about replacing. And I'm not touching Clear graph data."

5. `--click "Data" --click "transfers-2026-03.csv"` -> 05.png. "Edit: transfers" column-mapping
   screen with a match report. "This is the mapping from last month. The file name is up top."
   `... --click "transfers-2026-03.csv"` again -> 06.png, nothing changed. "This screen is about
   columns, not about swapping the file."

6. `--click "Transfers, March 2026"` -> 07.png. Title menu: Rename, Open project or file, Save,
   Export, Apply recipe or style file, Version history, Save as, Close project. "Open project or
   file - I have a file. Apply recipe sounds like applying something to a graph, and I have
   nothing called a recipe."

7. `--click "Transfers, March 2026" --click "Open project or file..."` -> 08.png. A file chooser
   lists transfers-2026-04.csv. `... --click "transfers-2026-04.csv"` -> 09.png: "Open as a new
   graph", weight none, and the preview shows transfers-2026-03 with March dates.
   "New graph is exactly the rebuild-everything route. And why does it show the 03 file with
   March dates when I clicked 04? Weight none too. Cancel."

8. Remembered the blue "Data version: March" at the bottom of the side panel on the start screen.
   `--click "March"` -> 10.png. Version history: "March data, the current and only version" and
   "Replacing the data adds one. Replace with file...". "That's the word I was looking for. But
   the graph went all gray here, 'Nothing is colored or sized by a row' - did my colors go?
   Probably just this screen."

9. `--click "March" --click "Replace with file..."` -> 11.png. "Replace: transfers-2026-03.csv",
   a chooser offering transfers-2026-04.csv.
   `... --click "transfers-2026-04.csv"` -> 12.png. April dates, 8,370 rows, every account found,
   weight still amount, "every role carried over". "Good. Odd that the first six amounts are
   identical to March's to the cent - I'd check that against the export before I'd trust it."

10. `... --click "Load"` -> 13.png. Title now "Transfers, April 2026". Source says 8,370 rows,
    was 9,113; 27 components, was 1; 26 accounts with no April transfers. Yellow box: "Louvain
    and the other runs used March's transfers. They show March's results until you rerun them.
    [Open Louvain]". "So the colors on screen are still March's. If I'd screenshotted that for
    a file, QA would have my head. And what are 'the other runs'? There's only one button."

11. `... --click "Open Louvain"` -> 14.png. "Louvain used March data. It is now April: 794
    transfers added, 1,537 removed. [Rerun]". "Fine. But the legend on the picture still says
    297 nodes and has no warning on it."

12. `... --click "Rerun"` -> 15.png. "Rerunning" with a progress bar and Cancel.
    `... --click "Links in (count)"` -> 16.png. Tooltip "Opens Links in (count) in the inspector
    (not available yet)"; Louvain still rerunning. "The ranking has no warning sign. Does it
    need rerunning or not? I can't tell."
    `... --click "Louvain"` -> 17.png. Still "Rerunning", legend and sizes still March's numbers.

Stopped here.

## Did I succeed?

Partly. April's file is in, in place of March's, and nothing had to be remapped - that part
worked once I found it. I started the rerun of the groups, but I never saw April's groups or
colors actually land, and I don't know whether the "Links in (count)" ranking was redone or is
still showing March. So I would not put this picture in an alert file yet.

## Single Ease Question: 3 out of 7

Finding Replace took four wrong turns: the dots next to the file I couldn't reach, the graph
menu, the column screen, and "Open project or file", which wanted to make a new graph. The only
way in was a small blue word "March" at the bottom of the side panel, which I only noticed
because I'd skimmed it at the start. After that it was smooth until the rerun, where "the other
runs" was never explained.

## Would I use this instead of my current tool?

Not for this. For me this is a monthly refresh, and in a spreadsheet I paste April over March
and the totals update - I know they did. Here the screen kept March's colors and March's legend
numbers on the picture after it said "April" in the title, and only a yellow box in a side panel
told me. If I'm in a hurry on day twenty-nine I take the screenshot without reading the box.
If one button said "Replace data and rerun everything" and the picture itself said "stale" until
it was done, I'd use it.

## Problems noted

- Replacing a file is not offered where the file is listed (Data > Sources); its menu could not
  be found, and the graph's own menu has nothing about the data source.
- "Open project or file" with the April CSV goes to "Open as a new graph" and its preview showed
  the March file with March dates and no weight.
- The only route to Replace is the "Data version: March" link at the bottom of the inspector,
  then Version history.
- After loading April, the canvas legend and colors still show March's results with no warning
  on the picture itself; the warning is only in the side panels.
- "Louvain and the other runs" -- the ranking layer carries no warning and cannot be opened,
  so I could not tell whether it needed a rerun. No "rerun all".
- Version history's preview shows the graph gray ("Nothing is colored or sized by a row"),
  which made me think my colors were gone.
- The rerun never visibly finished in my session.
