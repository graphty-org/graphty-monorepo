# Session r5-s11b -- Jordan, returning user

Task: friends.csv is open. Keep only pairs who ran together 4 or more times (third column), say how many people are left, then bring the whole club back.

All commands run as:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step <session folder> ...`
(session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s11b)

## Step 1 -- 01.png (arrived)

friends.csv is open, colored and sized by PageRank from an earlier run. 20 people, it says next to PageRank. Bottom toolbar has an icon that looks like a filter (three lines getting shorter). I have never filtered ties by a number here. I'll try that icon.

Command: `--hover-at 833,863` -> tooltip "Filters". (02.png)

## Step 2

Good, it's called Filters. Clicking it.

Command: `--click "Filters"` (03.png)

## Step 3

It switched me to the Data panel (20 nodes, 41 edges; edges have a "weight" -- that must be my runs-together column) and opened "New filter step" on the right: Keep "an attribute's value", Attribute empty, Add step greyed out. I'll open the Attribute list.

Command: `--click "Attribute"` (04.png)

## Step 4

List shows Nodes: id, Edges: weight. Picking weight under Edges.

Command: `--click "role=option:weight"` (05.png)

## Step 5

Now it says weight / Is "at least" / Value, and a line: "Keeps edges that pass and the nodes at their ends." That's exactly what I want -- "at least 4". Typing 4 in Value.

Command: `--click "Value" --type "4"` (06.png)

## Step 6

4 is in, Add step went blue. No preview of how many would be left before I commit -- would have been nice. Clicking Add step.

Command: `--click "Add step"` (07.png)

## Step 7

Done fast. Top bar now says "19 of 20 nodes, 12 of 41 edges"; the Filters list has "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges" with a ticked box; the right side switched to Values with "Nodes showing 19 of 20, Edges showing 12 of 41". The map is mostly pairs and little chains now. I counted the dots myself and got 19 -- matches. So 19 people still in it (only one person had no 4+ partner). Legend now says "PageRank, full graph", which is honest -- the sizes were not recomputed on the filtered drawing. Fine.

Now bring everyone back. The tick box next to the step looks like an on/off -- that's safer than deleting it. Unticking it.

Command: `--hover-at 274,247` -> tooltip "Turn this step off" (08.png)

## Step 8

Tooltip confirms: "Turn this step off". Clicking it.

Command: `--click-at 274,247` (09.png)

## Step 9

Whole club back: map is the full tangle again, Values says Nodes 20, Edges 41, legend dropped the "full graph" note. The step stays in the list as "weight is at least 4 -- off", so I can flip it back on for the flyer. Good -- that's the thing Gephi never let me do without redoing it.

Command: `--end` -> the session gave a follow-up: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

## Step 10

Rather than make a second step I'll try to edit the one I have: click on "weight is at least 4" and see if it opens for editing.

Command: `--click-at 165,231` (10.png)

## Step 11

It opened the step on the right, editable: weight / at least / 4, with a button "Save and turn on". I'll replace 4 with 5 (select-all then type).

Command: `--click "Value" --key Control+a --type "5"` (11.png)

## Step 12

Value shows 5. Clicking "Save and turn on".

Command: `--click "Save and turn on"` (12.png)

## Step 13

"10 of 20 nodes, 5 of 41 edges" up top, step now reads "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges". Five pairs on the map; the two at the bottom overlap a bit, so counting by eye is fiddly, but the number agrees: 10 people. Now turning the step off again to bring the club back.

Command: `--click-at 274,247` (13.png)

## Step 14

Everyone's back: Nodes 20, Edges 41, step reads "weight is at least 5 -- off". Done. Ending.

Command: `--end` -> session ended.

## Wrap-up, in Jordan's words

- **Did I finish?** Yes, both. Pairs who ran together 4 or more times: 19 people still in the drawing (12 of the 41 ties). 5 or more times: 10 people (5 ties). Both times I brought the whole club back (20 people, 41 ties) by unticking the step, which leaves it in the list, switched off.
- **Ease: 6 out of 7.** The Filters button on the bottom bar was the first thing I tried and it went straight to a form in plain words: keep / weight / at least / value, plus a line saying it keeps the ties that pass and the people at their ends. The "19 of 20 nodes, 12 of 41 edges" in the top bar is exactly the number I need for the flyer, and it matches what I counted on the map. Changing 4 to 5 was easy: click the step, edit the number, "Save and turn on".
- **What confused me or slowed me down:**
  - The form doesn't preview how many people a value would leave before I press Add step. I'd like to see "would keep 19 people" while I'm typing, so I can try 3, 4 and 5 without saving each one.
  - The column is called "weight" in the app. I knew it was my runs-together column only because it was the only number on the ties. In a file with several number columns I'd want to see my own column header.
  - It says "nodes" and "edges" everywhere. That's fine for me, but for the club I have to translate it to "people" and "pairs".
  - At 5+ the two pairs at the bottom overlap, so I couldn't check the count by eye and had to trust the number. Spreading the drawing out again after filtering would help.
  - The box for turning the step on and off is a small square with no label. The tooltip ("Turn this step off") made it clear, but I only found it by hovering.
  - Side complaint: this is the kind of cut I used to do in NodeXL on the Twitter mention data before the API went paid. Now I only get whatever CSV Brandwatch will export, and half the time it has no tie counts at all.
