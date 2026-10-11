# Session r5-s09b -- Ruth, returning

Task: friends.csv is open; keep only pairs who ran together 4 or more times (third column), say how many people are left, then bring the whole club back.

All commands use `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and `real.mjs` with the session folder `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s09b` (written below as `$S`).

## Step 01 (start, already done)

01.png: friends.csv open, 20 dots colored by a PageRank run. Left panel: Selection, PageRank (20), Everything. Bottom toolbar of icons; one looks like a funnel (lines getting shorter). "Only part of the map" sounds like a filter. I will try that icon.

## Step 02

Command: `--step $S --click-at 833,864` -> `button "Filters"`.

02.png: left panel now says friends.csv, "20 nodes, 41 edges" -- writing that down: 20 people, 41 pairs. Edges have one attribute, "weight"; that must be my third column (runs together). Right panel: "New filter step", Keep "an attribute's value", Attribute (empty), "Add step" greyed. I will open Attribute and pick weight.

## Step 03

Command: `--step $S --click "Attribute"`.

03.png: list opened: Nodes -> id, Edges -> weight. Picking weight under Edges.

## Step 04

Command: `--step $S --click "role=option:weight"`.

04.png: Attribute = weight, Is = "at least" (already what I want), Value empty. Under it: "Keeps edges that pass and the nodes at their ends." Good, that tells me plainly that a runner with no pair at 4+ drops out. I will type 4 in Value.

## Step 05

Command: `--step $S --click "Value" --type "4"`.

05.png: Value shows 4, "Add step" now blue. Drawing unchanged yet, which is fair: nothing applied. Clicking Add step.

## Step 06

Command: `--step $S --click "Add step"`.

06.png: the drawing now shows only some lines. Top bar: "19 of 20 nodes, 12 of 41 edges". Left, under Filters: "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges", with a ticked checkbox. Right panel: Nodes showing 19 of 20, Edges showing 12 of 41; Full graph 20 / 41. Three places agree. Reading aloud: 19 people, 12 pairs.
Counted over what? The rule says it in words: weight at least 4, and the step said it keeps the nodes at the ends of passing edges. I counted the dots myself: I get 19 if the two overlapping pairs at the bottom (around 567/583 and 715/735) are each two dots. That matches, though the overlapping dots make my own count shaky. One small thing: the legend says "PageRank, full graph" -- so sizes still mean the 20-person scores, which is honest labeling.
Answer to the task: 19 people still in it (12 pairs at 4+ runs). Now to bring the whole club back I will untick the checkbox next to the step rather than delete it, so I can show the editor version again later.

## Step 07

Command: `--step $S --click-at 274,247` -> `input "Apply step: weight is at least 4"`.

07.png: all 20 dots and lines back. Filters row reads "weight is at least 4 -- off", box unticked. Right panel: Nodes 20, Edges 41. Whole club back, and the rule kept for later. Done with the first request.

## End attempt 1

Command: `--end $S` -> not ended; new request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

I would rather change my existing step from 4 to 5 than build a second one. I will click on the step's row to see if it opens for editing.

## Step 08

Command: `--step $S --click-at 165,231` -> `treeitem "weight is at least 4"`.

08.png: the step opened on the right, marked "Off", Value 4, button "Save and turn on". Exactly what I hoped. I will replace 4 with 5 in Value.

## Step 09

Command: `--step $S --click "Value" --key "Control+a" --type "5"`.

09.png: Value now 5; header still says "at least 4" until saved, which is fine. Clicking "Save and turn on".

## Step 10

Command: `--step $S --click "Save and turn on"`.

10.png: top bar "10 of 20 nodes, 5 of 41 edges"; Filters row "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges", ticked; right panel Nodes showing 10 of 20, Edges showing 5 of 41. My own dot count: 10 (two of them overlap at the bottom, the big dark pair). I see four lines clearly; the fifth must be between that overlapping pair, which I can't confirm by eye. Answer: 10 people at 5+ runs together.
Now unticking the step to bring the whole club back.

## Step 11

Command: `--step $S --click-at 274,247` -> `input "Apply step: weight is at least 5"`.

11.png: all 20 back, 41 edges, step reads "weight is at least 5 -- off". Whole club back. Ending.

## End

Command: `--end $S` -> session ended.

## In my own words (Ruth)

**Did I finish?** Yes, both requests. Pairs who ran together 4 or more times: 19 of the 20 people are still in the drawing (12 of 41 pairs). At 5 or more times: 10 of 20 people (5 of 41 pairs). Both times I brought the whole club back (20 people, 41 pairs) by unticking the filter step, which keeps the rule for later.

**Ease: 6 of 7.** The filter was where I guessed (the funnel button), "Edges -> weight" was clearly my third column, "at least" was already chosen, and the line "Keeps edges that pass and the nodes at their ends" told me plainly why someone drops out. The count showed in three places that agreed (top bar, the filter row, the right panel), and the row said "20 to 19 nodes, 41 to 12 edges" -- before and after, which is what I want to write down. Clicking the step reopened it with "Save and turn on", so changing 4 to 5 took seconds.

**What confused me or I could not confirm:**
- I could not check the counts against the drawing with confidence: two pairs of dots sit on top of each other at the bottom, so my own dot count only works if I assume they are two dots each, and one of the 5 lines at "at least 5" is hidden between an overlapping pair. I can't confirm that line by eye.
- The task asked "how many people", and the screen says "nodes". Fine for me after weeks, but it is the program's word, not mine.
- The screen never told me which one person dropped out at 4+. For a flyer that's fine; for a story I would want the name.
- The legend changed to "PageRank, full graph" while filtered. I took that to mean the sizes still describe all 20, which is honest, but nothing said whether that is what I would want for the flyer.
