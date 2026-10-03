# Session: swap March transfers for April, keep everything built -- fraud analyst (Sarah)

Task given: "Last month you built groups, rankings and colors on March's card transfers, which
are open now (example data if you do not work in banking). April's export has arrived as
transfers-2026-04.csv. You want everything you built to run again on April's numbers in place
of March's, without rebuilding it."

Mode: own initiative (not mandated). Renders are in
tmp/round-8-sessions/r8-t26--fraud-analyst/. Every command was run from
design/ui/prototype; `D` is that render folder (absolute path in the real commands).

## Start (shots/tasks/r8-t26/01.png)

"Transfers, March 2026" up top. Left list: Louvain 35 groups, Links in (count), Everything.
Right side has a Louvain panel, and right at the bottom it says "Data version: March". So the
thing knows which month it is. Good. I want to swap the file, not rebuild the picture. In Excel
I would change the data source of the pivot and hit refresh. Let me look for that.

## Step 1 -- the title menu (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t26 --click "Transfers, March 2026"

File menu: Rename, Open project or file, Save, Export, "Apply recipe or style file...",
Version history, Save as, Close. "Apply recipe" -- no idea what a recipe is here. "Open
project or file" sounds like it would open April as a brand new thing and I'd lose my groups.
Not this. The data is probably under Data.

## Step 2 -- Data (03.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t26 --click "Data"

Sources: accounts-2026-03.csv and transfers-2026-03.csv, each with a "..." next to it. There's
my March file. That's what I need to swap.

## Step 3 -- clicked the file name (04.png, 05.png)

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

Opens an "Edit: transfers" screen -- column mapping, from/to account, amount as weight, a match
report. Looks like the import screen, nothing about a different file. Clicking the file name
at the top of it does nothing. Back out; try the dots.

## Step 4 -- finding the dots menu (06-08.png)

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t26 --click "Data" --click "More actions for transfers-2026-03.csv"
      -> nothing on screen is called that
    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t26 --click "Data" --click "..."
      -> nothing on screen is called "..."
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t26 --click "Data" --click "More"   (hit the wrong menu)
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t26 --click "Data" --click "Options"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t26 --click "Data" --click "Actions"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv"

(Getting a pointer onto the right "..." took me a few goes; in a real browser I would just have
clicked the dots on that row.) The menu: Rename, "Replace with file...", "Add rows from
file...", Edit source, Remove (greyed, with a paragraph I skipped). "Replace with file" -- that
is literally what I'm doing. Good.

## Step 5 -- Replace with file (09.png)

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..."

"Replace transfers-2026-03.csv with" and a picker showing transfers-2026-04.csv. Yes.

## Step 6 -- pick April (10.png)

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv"

Now this I like. Dates in the preview are 2026-04. Match report: 8,370 rows, "all 4 columns
of transfers-2026-03.csv are here, so every role carried over", 8,370 of 8,370 from_account
found in accounts, same for to_account. That's my reconciliation check done for me -- I'd
normally VLOOKUP that. Only thing: the accounts file is still accounts-2026-03.csv. Fine if
nobody new opened an account, but it says all were found, so OK. Load.

## Step 7 -- Load (11.png)

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load"

Title now says "Transfers, April 2026". Source says "8,370 rows, was 9,113", "27 components,
was 1", "26 new single-node groups: accounts with no transfers in April". Plain English, with
the before number. Good. Yellow box: "Louvain and the other runs used March's transfers. They
show March's results until you rerun them." with one button, "Open Louvain".

Wait -- "and the other runs". Which other runs? There's only a button for Louvain. My
rankings? And the picture still shows March's group counts, 297, 182... So right now the
colors on screen are March's groups on April's transfers. If I screenshotted that for the case
file it would be wrong. At least it told me.

Also: did I just overwrite March? The title changed to April. I need March kept -- it's
evidence for March's SAR.

## Step 8 -- Open Louvain, Rerun (12.png, 13.png)

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t26 ... --click "Load" --click "Open Louvain"
    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t26 ... --click "Load" --click "Open Louvain" --click "Rerun"

Warning icon on Louvain in the list. Panel: "Louvain used March data. It is now April: 794
transfers added, 1,537 removed." Rerun button. Pressed it: "Rerunning", progress bar, Cancel.
Same settings, seed 11, amount as weight -- that's what I want, nothing to re-enter. But the
summary right under it already says "35 communities and 26 unconnected nodes", mixing March's
groups with April's isolated accounts. Which is it?

## Step 9 -- the ranking (14.png)

    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t26 ... --click "Rerun" --click "Links in (count)"

"Opens Links in (count) in the inspector (not available yet)." So I can't see whether my
ranking updated. It has no warning icon, so I assume it just counts and follows the data. I'm
assuming.

## Step 10 -- back to Data (15.png)

    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t26 ... --click "Rerun" --click "Data"

Yellow box is gone. Results lists only Louvain. Fine, so Louvain was the only "run". The
legend is still showing 297, 182, 147 -- March's numbers -- so the rerun hasn't landed yet as
far as I can tell.

## Step 11 -- was March kept? Version history (16.png)

    timeout 120 node app-b/study.mjs --try $D/16.png task:r8-t26 ... --click "Rerun" --click "Transfers, April 2026" --click "Version history"

This is actually good. "April data, current. Replaced from transfers-2026-04.csv. 3,000
accounts (was 3,000), 8,370 transfers (was 9,113). 794 new, 1,537 not in April." "Large
change: 65 communities (was 35)." "Community numbers carried over from March: a community
keeps its number when most of its members stay" -- that matters, Community 1 in April is
roughly Community 1 in March, so my notes still line up. March data is still there below as
an older version. Audit trail, good.

But three things bother me in that log:
- "PageRank -- Directed, damping 0.85". So there WAS a ranking run, PageRank. It's not in my
  layer list and the yellow box only offered Louvain. Did PageRank get rerun on April or is it
  still March's? I can't tell.
- "Asked the assistant -- Sent to api.anthropic.com ... 14 account ids". Account IDs went to
  an outside company. I didn't do that in this session, but if that's in my case log, I'm
  explaining it to compliance. That alone could get the tool pulled.
- The history picture says 65 communities, but the main screen still said 35. Two different
  answers to the same question on two screens.

## Step 12 -- click PageRank in the log (17.png)

    timeout 120 node app-b/study.mjs --try $D/17.png task:r8-t26 ... --click "Version history" --click "PageRank"

It jumped to a project called "Les Miserables" -- Valjean, Javert, Cosette. That is not my
case. Where's my case? How do I get back? I'm stopping here.

## Verdict

Did I succeed? Mostly. The April file is in, the match report checked it, Louvain was rerun
with the same settings, and March is kept in history. What I could not confirm: that the
ranking (PageRank, or "Links in") is on April numbers, and I never saw the rerun finish on the
main screen -- the legend still showed March's counts. I would not put that picture in a case
file without seeing the new numbers myself.

Single Ease Question: 4 of 7. The swap itself was a 2 -- "Replace with file" is the right
words and the match report is better than what I do in Excel. Finding the dots menu, the
"other runs" with no button, the ranking I couldn't open, and the jump into somebody else's
project dragged it down.

Would I use this instead of my current tool? For the monthly refresh of a big case, maybe --
re-pointing a pivot is easy, re-pointing an i2 chart is not, and this kept my groups and
settings. But not until (1) it tells me every run that's stale and reruns them all in one go,
(2) it shows me the finished new numbers on the main screen, and (3) I know why account IDs
were sent to an outside server. Item 3 is a showstopper at a bank.
