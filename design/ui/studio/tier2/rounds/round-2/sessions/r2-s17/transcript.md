# Session r2-s17 -- Grace (returning), task T17, dataset A (running club, friends.csv)

Build: 8f0d5a6f7791 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/)

## Start

    node ../tool/real.mjs --start rounds/round-2/sessions/r2-s17 setup:friends-ranked.txt

01.png: My club map is up, "friends" at the top, the PageRank ranking colored orange and sized. Left
side has Graph with Selection, PageRank (20), Everything. I need only the pairs that ran together 4
or more times. The runs count is the third column of my file, so I'll start where I remember the
columns were: Data on the left.

## Step 2

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "Data"

02.png: Data shows friends.csv, "20 nodes, 41 edges" -- matches my 41 rows and 20 people. Edges have
"weight", that's my runs column. There's a "Filters" row with a plus, like Excel's filter. I'll
press that plus.

## Step 3

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click-at 276,197
    (at 276,197: button "Add filter step")

03.png: Right side now says "New filter step", "Keep: an attribute's value", and an empty
"Attribute" box, with "Add step" grayed out. "Keep" reads like what I want. I'll open Attribute and
look for weight.

## Step 4

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "Attribute"

04.png: The list has Nodes: id, and Edges: weight. Weight is my runs. Picking that.

## Step 5

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "weight#2"

(Facilitator note: two controls are named "weight" -- the list option and the left-side attribute
row. "weight#2" turned out to be the left-side row, not the option I meant. A person would have
clicked the option in the open list.)

05.png: The right side now shows a summary of weight: Edges, Amount, 1 to 5, 5 distinct values.
Useful to know the runs go 1 to 5. But my half-made filter is gone -- the "New filter step" box
disappeared without asking. I'll press the Filters plus again and pick weight from the list this
time.

## Step 6

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click-at 276,197 --click "Attribute"
    (at 276,197: button "Add filter step")

06.png: Back to the filter box with the list open. Clicking "weight" under Edges in the list.

## Step 7

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click-at 1245,295
    (at 1245,295: option "weight")

07.png: Now "weight", "Is: at least", and an empty Value box. Under it: "Keeps edges that pass and
the nodes at their ends." That's exactly "4 or more" in plain words. I'll type 4 in Value.

## Step 8

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "Value" --type "4"

08.png: Value says 4 and "Add step" turned blue. No preview of how many are left yet. Pressing Add
step.

## Step 9

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "Add step"

09.png: The drawing thinned out to separate little pieces. Top bar says "19 of 20 nodes"; the right
side says "Nodes showing 19 of 20", "Edges showing 12 of 41", and a note that the counts below are
for the whole graph (20, 41). On the left under Filters: "weight is at least 4 -- 20 to 19 nodes"
with a ticked box. The legend now says "PageRank on 20 nodes", so it tells me the ranking was from
the whole club -- fine. I count the dots: about 19, two pairs overlap at the bottom. So 12 pairs ran
together 4 or more times, and 19 people are still in it -- only one person drops out. Answer: 19
people.

Now to bring the whole club back. The ticked box next to the filter looks like Excel's filter
checkbox; I'll untick it.

## Step 10

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click-at 273,239
    (at 273,239: input "Apply step: weight is at least 4")

10.png: Everyone is back: 20 nodes, 41 edges on the right, the "19 of 20" in the top bar is gone,
and my ranking colors and sizes are still on. The filter stays in the list marked "off", so I can
turn it on again next time. That part is done: 19 people with 4+ runs together, whole club back.

Follow-up from the facilitator: "Your club now asks the same for pairs who ran together 5 or more
times. How many people are in the drawing then? Bring the whole club back when you are done."

I'd rather change my existing filter from 4 to 5 than make a new one. I'll click on the filter's
name to see if it opens for editing.

## Step 11

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click-at 165,231
    (at 165,231: treeitem "weight is at least 4")

11.png: It opened my filter on the right, Value 4, with a "Save and turn on" button. I'll replace
the 4 with a 5.

## Step 12

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "Value" --key Control+a --type "5"

12.png: Value now 5. Pressing "Save and turn on".

## Step 13

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click "Save and turn on"

13.png: "10 of 20 nodes" in the top bar, "Edges showing 5 of 41", and the filter now reads "weight
is at least 5 -- 20 to 10 nodes". I count the dots: 2 + 2 + 2 + 2, and two overlapping at the
bottom -- 10. So 5 pairs ran together 5 or more times, 10 people in the drawing. Untick to bring the
whole club back.

## Step 14

    node ../tool/real.mjs --step rounds/round-2/sessions/r2-s17 --click-at 273,239
    (at 273,239: input "Apply step: weight is at least 5")

14.png: Whole club back: 20 nodes, 41 edges, ranking colors and sizes as before, the filter kept as
"weight is at least 5 -- off". Done.

## End

    node ../tool/real.mjs --end rounds/round-2/sessions/r2-s17

## In my own words (Grace)

**Did I finish?** Yes, both parts.
- 4 or more runs together: 19 people still in the drawing (12 pairs), then the whole club back.
- 5 or more runs together: 10 people (5 pairs), then the whole club back.

**Ease: 6 of 7.**

What worked: I went to Data because that's where my columns were, and "Filters" with a plus read
just like Excel. "Keep -- weight -- at least -- 4" plus the line "Keeps edges that pass and the
nodes at their ends" said it in plain words. The top bar's "19 of 20 nodes" and the filter's own
"20 to 19 nodes" gave me the count straight away, so I didn't have to count dots (I did anyway, and
it matched). Unticking the box brought everyone back with my ranking colors untouched, and the
filter waited there "off" so the second question was just changing 4 to 5.

What confused me or slowed me down:
- The first time, my half-built filter vanished when I clicked the "weight" row on the left side --
  no warning, I just had to press the plus and start over. (Part of that was me picking the wrong
  "weight": there are two things called weight on screen at once, the one in the list I had open
  and the one in the left column.)
- The column is still called "weight" because that's my file's header; I had to remember that
  weight means number of runs. Fine for me, but I'd want to call it "runs" on a flyer.
- Before pressing "Add step" there was no hint how many people would be left; I only found out
  after.
- With 19 of 20 left, I wanted to know who the one person was who dropped out, and nothing told me
  by name. I didn't go looking because the task didn't ask.
- The legend says "PageRank on 20 nodes" while the drawing shows 19 -- I understood it as "ranked on
  the whole club", but "PageRank" is still not a word I'd put on a flyer.

(Facilitator note: the first `--end` printed the follow-up request word for word and kept the
session open; the follow-up had already been done in steps 10-14 from the task text, so `--end` was
run a second time.)

    node ../tool/real.mjs --end rounds/round-2/sessions/r2-s17
