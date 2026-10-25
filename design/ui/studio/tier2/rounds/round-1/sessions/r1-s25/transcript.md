# Session r1-s25 -- Grace (returning), task T21, dataset A (running club)

Build: tier2-r1d4-946256efb (frozen). Start: setup friends-ranked.txt.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ node design/ui/studio/tool/real.mjs --start design/ui/studio/tier2/rounds/round-1/sessions/r1-s25 setup:friends-ranked.txt
```

## 01.png -- start

My club map from last month is open: "friends", file friends.csv, a PageRank run on the left with 20
next to it, orange dots sized by it, legend top left. No names on the dots. Before I change anything
I want to write down who is first now -- the run's Values tab on the right should list them.

## 02.png -- `--step --click "Values"`

There it is. Top 10: Farah 0.06394 first, then Hana 0.05941, Milo 0.05648. So **first before = Farah**.
"Made with: weight (read as closer)" -- fine, same as last time. Now I need the new file in place of
the old one. I'll look in the main menu (top left) where I opened things before.

## 03.png -- `--step --click-at 23,20` (Main menu)

Menu: Back to start, New project, Open project or file..., Open sample, Save, Save as, Export...
Nothing says "new version of my file". "Open project or file" is how I started a fresh map before, and
I'm worried it would give me a new map without my sizes and colors. Let me close this and look in
Data on the left, which is where my file's columns were listed -- maybe the file lives there.

## 04.png -- `--step --key Escape --click "Data"`

Data shows "Sources: friends.csv, 20 nodes, 41 edges". 20 people, 41 rows -- matches the sheet. This
is where the old file is, so the new one should go here. I'll click on friends.csv to see what it offers.

## 05.png -- `--step --click "friends.csv"`

Right side now says friends.csv, Source, Added: Nodes 20, Edges 41, and a table opened at the bottom
with my rows (Ava-Ben 3, Ava-Chloe 5...). Nice to see the rows. But no button to swap the file. Maybe a
right-click on the file name gives me more.

## 06.png -- `--step --rclick "friends.csv"`

(Tool note: the name matched the list item and the heading on the right; it took the list item, which
is what I meant.) A small menu: "Edit source..." and "Replace with file...". "Replace with file" is
exactly what I want -- the new list in place of the old. I'll click it and pick friends-v2.csv.

## 07.png -- `--step --click "Replace with file..." --upload friends-v2.csv`

A full page: "Replace: friends-v2.csv. Was 20 nodes, 41 edges; now 20, 41." Love that line -- same 20
people, same 41 rows, that's what I expected. The rows show new weights (Ava-Chloe was 5, now 1). At
the bottom: "41 edge rows read; the load makes 20 nodes and 41 edges." There's a "Higher means: Not set
/ Closer / Farther / Capacity" choice; it says until I choose, the ranking reads higher as closer --
same as last time, which is what I want for "ran together more often". I'll leave it and press Load.

## 08.png -- `--step --click "Load"`

Back on the map. Top left says "Graph friends-v2.csv"; right side: Nodes 20, Edges 41 -- counts the
same as before, good. My colors and sizes are still there. The table at the bottom shows Ava-Chloe 1
now, so the new numbers are in. The PageRank row on the left now has a little clock-ish icon instead of
the bar-chart icon. The legend still says 0.03779 to 0.06394, the old numbers, so I bet the ranking has
not been redone. Let me hover that little icon to see what it means.

## 09.png -- `--step --hover-at 81,156`

Tooltip: "Data changed since this run". Good, it tells me the ranking is old. Now how to redo it --
I'll click the PageRank row and look at its panel on the right; maybe there's a button there.

## 10.png -- `--step --click-at 155,156` (PageRank row)

The right side shows a gray strip "Data changed since this run" with a blue "Rerun" button. The list
below still shows the old top 10 (Farah first) -- good that it warned me. I'll press Rerun.

## 11.png -- `--step --click "Rerun"`

Done in one press. "ran Oct 8, 11:33:48 PM" -- a new time. The legend now says 0.02872 to 0.08012, the
sizes moved (a big dark dot in the middle now), the warning strip is gone and the row's icon is back to
the bar chart. Top 10 now: **Ava 0.08012 first**, Farah 0.06556 second, Hana 0.06428 third. Still
"20 of 20 have a value". So Farah was first before, Ava is first now. I'll save so next month it's
there -- Save in the menu was Ctrl+S.

## 12.png -- `--step --key Control+s`

A "Save friends as" box with the name "friends". I thought this was already saved, but fine, it asks
once. Keep the name, press Save.

## 13.png -- `--step --click "Save"`

"Saved friends in this browser." Everything is still there: Ava first, my orange colors and sizes, 20
people and 41 links. I'm done.

```
node design/ui/studio/tool/real.mjs --end design/ui/studio/tier2/rounds/round-1/sessions/r1-s25
```

## Wrap-up (in character)

- **Finished?** Yes. Farah was first before (0.06394); Ava is first now (0.08012), with Farah second
  (0.06556). Same 20 people and 41 links in both files. My colors, sizes and legend were kept, and the
  legend updated to the new range once I reran.
- **Ease:** 6 of 7.
- **What went well:** the "Replace: friends-v2.csv -- Was 20 nodes, 41 edges; now 20, 41" line told me
  at once that nobody was lost. After loading, the ranking was marked old ("Data changed since this
  run") and one Rerun button fixed it. I never had to rebuild anything.
- **What confused me:**
    - Finding the swap took a detour. I looked in the main menu first (where I've always opened files);
      it only has "Open project or file...", which I was afraid would start a new map. The real way was
      hidden behind a right-click on the file in Data -> Sources. Clicking the file normally showed its
      counts and rows but no swap button; I only found it because I tried a right-click. A colleague who
      doesn't right-click would probably not find it.
    - Between Load and Rerun the map still showed last month's sizes and legend numbers while the table
      showed the new weights. The only sign was a tiny icon change on the PageRank row; I had to hover it
      to learn the ranking was out of date. The Rerun strip only appeared once I clicked the row.
    - "Higher means: Not set / Closer / Farther / Capacity" on the replace page -- I understood "Closer"
      but not "Capacity"; I left it because the sentence said the ranking already reads higher as closer.
    - Ctrl+S asked me to name the project as if it had never been saved; I expected it to just save.
