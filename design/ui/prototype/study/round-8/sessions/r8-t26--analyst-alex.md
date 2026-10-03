# Session: Analyst Alex -- rerun March's work on April's transfers

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which
are open now (example data if you do not work in banking). April's export has arrived as
transfers-2026-04.csv. You want everything you built to run again on April's numbers in place of
March's, without rebuilding it."

All commands were run from `design/ui/prototype`, with
`S=tmp/round-8-sessions/r8-t26--analyst-alex`. Renders are in that folder.

## Step 1 -- start screen (shots/tasks/r8-t26/01.png)

OK, this is the March project. Louvain colors, 35 communities, a "Links in (count)" thing under it,
seed 11 -- good, the seed is shown, so if I rerun I should get comparable groups. Bottom right says
"Data version: March". So it knows which month this is. What I want is "swap the file". In Gephi
that's re-import and redo everything. Let me look at the project name menu first, that's where
File would be.

## Step 2 -- project menu

    timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t26 --click "Transfers, March 2026"

Open project or file, Save, Export, "Apply recipe or style file...", Version history. "Apply
recipe" is interesting but I don't have a recipe file, I have the project open already. I don't
want to open April as a new project -- that's the rebuild-everything route. Not here. I'll try the
Data rail.

## Step 3 -- Data rail

    timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t26 --click "Data"

There it is: Sources, accounts-2026-03.csv (3,000 nodes) and transfers-2026-03.csv (9,113 rows).
That's my file. I want to swap that one. Let me click it.

## Step 4 -- clicking the file name

    timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

This is a column-mapping screen, "Edit: transfers". Nice match report, every from/to found, 9,113
rows became 9,113 edges -- that matches SQL. But no "change file" here. Clicking the file name at
the top does nothing. Back out. There's a "..." next to the file in the list.

## Step 5 -- finding the dots menu

    timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t26 --click "Data" --click "More"

Wrong menu -- that's the graph menu on the right (Select all, Re-run layout, Clear graph data).
Not touching "Clear graph data". I rested the pointer on the little dots to see what they're called
(probes: "Actions", "Options", "Menu"; the dots next to my file say "Actions for
transfers-2026-03.csv").

## Step 6 -- the file's menu

    timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv"

"Replace with file...". That's the exact words I'd have typed. Also "Add rows from file" -- that
would be appending, which is not what I want; I want April instead of March. The greyed "Remove"
has a paragraph under it I didn't read.

## Step 7 -- replace

    timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..."
    timeout 120 node app-b/study.mjs --try $S/09.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv"

It offers transfers-2026-04.csv right away. Picked it. Now: 8,370 rows, "all 4 columns of
transfers-2026-03.csv are here, so every role carried over". Good -- I didn't have to re-map from
and to and weight. Every from_account and to_account found in accounts. Timestamps say 2026-04.
8,370 is a plausible April number; I'd check it against SQL. Load button is lit.

One thing: the accounts file is still accounts-2026-03.csv. For this task they only gave me April
transfers, so fine, but if I had an April accounts file I'd want to do it in the same go.

## Step 8 -- load

    timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load"

OK, this is actually helpful. Under the file: "8,370 rows, was 9,113", "27 components, was 1",
"26 new single-node groups: accounts with no transfers in April". I'd have had to find that out
the hard way. And a yellow box: "Louvain and the other runs used March's transfers. They show
March's results until you rerun them." Good -- it doesn't pretend the old colors are April's.

Two things bother me. First, the project title flipped to "Transfers, April 2026" by itself. Did I
just overwrite March? I need March to compare against, and for the deck. Nothing says March is
still saved somewhere. Second, "the other runs" -- which ones? There's one button, "Open Louvain".
What are the others, and do I have to find each one?

## Step 9 -- Open Louvain

    timeout 120 node app-b/study.mjs --try $S/11.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain"

"Louvain used March data. It is now April: 794 transfers added, 1,537 removed." 9,113 + 794 -
1,537 = 8,370. Adds up. Warning triangle on Louvain in the list. Rerun button right there.

But the Summary under it is weird: "35 communities and 26 unconnected nodes". The 35 is March's
run and the 26 is April's isolated accounts. That's a mixed number. If I screenshotted that for
the deck it'd be wrong.

## Step 10 -- rerun

    timeout 120 node app-b/study.mjs --try $S/12.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun"

"Rerunning" with a progress bar and a Cancel. Good, I know it's doing something. Seed is still 11,
weight still amount. So same settings, new data. That's what I wanted.

## Step 11 -- the rankings

    timeout 120 node app-b/study.mjs --try $S/13.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun" --click "Links in (count)"
    timeout 120 node app-b/study.mjs --try $S/14.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun" --click "Expand"
    timeout 120 node app-b/study.mjs --try $S/14.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun" --click "from Louvain, Sep 28"
    timeout 120 node app-b/study.mjs --try $S/15.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Actions for Louvain"
    timeout 120 node app-b/study.mjs --try $S/15.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --hover "Louvain"

My ranking is "Links in (count)". It has no warning triangle, so I guess it just recounted on its
own? Clicking it says "not available yet", so I can't confirm. The note said "Louvain and the
other runs" but only Louvain has a triangle. So either there are other runs I can't see, or the
message is generic. I tried to expand Louvain and its menu -- nothing by those names. The run link
just scrolled me to "Data version: March, now April". Hovering Louvain told me run names can't be
changed. Not what I was after.

I'm stopping here. The file is swapped, my colors and the ranking layer are still there, Louvain
is rerunning with the same seed and weight, and I never had to re-map a column.

## Verdict

**Succeeded?** Mostly, I think. The swap was easy once I found the dots menu, and the "was 9,113,
now 8,370 / 27 components, was 1" lines are exactly the sanity check I'd do by hand. What keeps me
from saying "done":
- I don't know if March is still saved. The title changed to April on its own. If that overwrote
  March, I've lost my comparison and last month's deck source.
- "Louvain and the other runs" -- I only ever found one run to rerun. If there were five, I want
  one "rerun all", not five trips. I'd count the clicks every month.
- While Louvain was out of date, its summary mixed March's 35 communities with April's 26
  unconnected nodes. That's the kind of number that ends up in a report wrong.
- I couldn't see the rerun finish, or check that the ranking actually moved to April's numbers.

**Single Ease Question:** 5 of 7. Finding "Replace with file" took me two wrong turns (clicking the
file name, the wrong dots menu). After that it was smooth.

**Would I use this instead of my current tool?** For this monthly job, probably yes, if March is
kept somewhere. In Gephi I redo the whole appearance half every month by hand; here I swapped one
file and clicked Rerun once, and the column mapping carried over. That's the Gephi half gone. I'd
still compute anything I have to defend in Python and check the counts against SQL, and I'd want a
"rerun everything that's out of date" button before I trust it with a deck that has more than one
algorithm on it.
