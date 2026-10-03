# Session: add April's transfers to the March table -- Priya, threat hunter

Task as given: "March's card transfers are open (example data if you do not work in banking).
April's transfers have arrived as a second file with the same columns. You want the one table of
transfers to hold both months from now on, keeping everything you have built."

All commands were run from design/ui/prototype. S below stands for
tmp/round-8-sessions/r8-t30--cybersecurity-analyst (absolute path used in the real commands).

## Start screen (shots/tasks/r8-t30/01.png)

Transfers, March 2026. "Local only" chip up top -- good, that answers "does it phone home" at
least as a claim. On the left: Louvain layer with 35 groups, a "Links in (count)" layer. Right
panel says Louvain ran Sep 28, seed 11, data version "March". That's what I've built: a community
run and a sizing layer. Bottom of the left panel, the filter isn't visible here but I'll find it.

This is example card data, not bank logs, so I'm fine loading it. In real life this is the
monthly "append next month's export" job I do in Splunk with a new index window.

## Step 1 -- find where the data lives

    timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t30 --click "Data"

Data panel. Sources: accounts-2026-03.csv (3,000 nodes) and transfers-2026-03.csv (9,113 rows).
Filters: "amount is at least 1,000", one step. Attributes, and Louvain under Results. OK, so the
file is a "source". There's a "..." on each source row. That's where I'd expect "append".

## Step 2 -- try the table itself first

    timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t30 --click "Data" --click "transfers-2026-03.csv"

Clicking the file name opens "Edit: transfers" -- column mapping, from/to/weight/time, match
report. Nice match report, honestly: "9,113 of 9,113 from_account found in accounts". That is the
row-count accounting I always want. But nothing here says "add another file".

    timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t30 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

Clicked the file name in the editor header hoping it was a file picker. Nothing. Back out.

## Step 3 -- hunting for the row menu

    timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t30 --click "Data" --hover "More actions for transfers-2026-03.csv"
    (nothing on screen is called that)
    timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t30 --click "Data" --hover "More"
    timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t30 --click "Data" --click "More actions"

Wrong "..." -- that's the graph's menu on the right (select all, re-run layout, "Clear graph
data"). Not what I want, and "Clear graph data" is not something I want to be near.

Pointer-wandering over the icons to read tooltips:

    for n in "Actions" "Options" "Add source" "Add"; do timeout 120 node app-b/study.mjs --try $S/scratch.png task:r8-t30 --click "Data" --hover "$n"; done

The source row's dots are "Actions for transfers-2026-03.csv". The "+" by Sources is
"Add to Transfers" -- that sounds like it would make a new source/table, which is NOT what I want;
I want one table.

## Step 4 -- the row menu

    timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv"

Rename, Replace with file..., **Add rows from file...**, Edit source..., Remove (disabled, with a
paragraph explaining why). "Add rows from file" is exactly my words. About 90 seconds to get here,
mostly because the dots were the second set of dots I tried.

## Step 5 -- preview the append

    timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..."

(Picked transfers-2026-04.csv.) Header: "Add to transfers". Makes: account (3,000 + 132 added)
--transfers (9,113 + 8,370 added)--> account. Match report: same 4 columns as transfers, toggle
"Add these rows to transfers" (selected) vs "Load as its own table", "8,370 rows to add - 0
repeated rows - 132 new accounts", and a link to replace March instead. This is good. It tells me
the counts before I commit, it tells me nothing is double-counted.

Things I noticed though:
- The Tables list on the left shows "transfers-202..." as a THIRD table row with its own count,
  while the toggle says the rows go INTO transfers. So which is it? Looks like it'll be its own
  table.
- 132 new accounts that aren't in accounts-2026-03.csv. They'll be bare nodes with no country,
  no riskScore. It says "added" and moves on. I'd want to know those are attribute-less -- new
  counterparties in April is exactly the kind of thing I'd hunt on.
- Nothing on this screen says what happens to my Louvain run, the sizing layer or the amount
  filter. The task is "keep everything you have built". I'm guessing it keeps them.

## Step 6 -- commit

    timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add"

It went back to the graph and... everything is gone. Louvain layer gone, "Links in (count)"
gone, the legend says "Nothing is colored or sized by a row", the graph is a gray hex-bin blob.
And the summary on the right still says 3,000 nodes, 9,113 transfers. Title still "Transfers,
March 2026". So April didn't even go in, and my work came out.

    timeout 120 node app-b/study.mjs --try $S/09.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Data"

Data panel confirms it: only the two March sources, "No filters", Results section gone. My
"amount at least 1,000" filter is gone too.

## Step 7 -- undo

    timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --hover "Undo"
    timeout 120 node app-b/study.mjs --try $S/11.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Undo"

Undo button looks enabled, tooltip "Undo Ctrl+Z". Clicked it: toast "Nothing to undo". So the
thing that wiped my analysis is not undoable. That is the worst possible answer.

## Step 8 -- check the rows directly

    timeout 120 node app-b/study.mjs --try $S/12.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Edges"

Edges table: "9,113 edges", first rows dated Mar 29, Mar 25, Mar 11. No April. Stopping here.

## Verdict

- Succeeded? No. Finding the action was fine-ish and the preview was genuinely good, but after
  "Add" the table still holds only March, and the Louvain run, the sizing layer and the filter are
  all gone, with "Nothing to undo". Both halves of the task failed: April isn't in, and what I
  built isn't kept.
- Single Ease Question: 2 of 7. Getting to the menu was a 5; what happened after "Add" drags it
  to a 2. I'd have scored it lower if the preview hadn't been so clear about counts.
- Would I use it instead of my current tool? Not for this. In Splunk next month's data just lands
  in the index and my saved search runs over the new range; nothing I built disappears. Here the
  monthly append is the one job I'd do every month, and the first time I did it, it silently
  threw away my analysis and didn't load the file. If it had worked, the "8,370 rows to add, 0
  repeated, 132 new accounts" line is better than what I get from a Splunk ingest, and I'd have
  said so. But a tool that eats my work on the routine path doesn't get a second month.

## What would have fixed it for me

- After "Add": the summary showing 17,483 transfers, a fourth "transfers-2026-04.csv" line under
  the transfers source (or the source renamed to cover March-April), and the Louvain layer still
  there with a "data changed since this run -- rerun?" marker instead of vanishing.
- On the preview: one line saying what happens to my results, layers and filter.
- The left-hand Tables list not showing the April file as its own table when I picked "add these
  rows to transfers".
- A warning that the 132 new accounts have no attributes from the accounts file.
- Undo that undoes the thing I just did.
