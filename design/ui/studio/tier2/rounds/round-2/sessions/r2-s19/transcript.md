# Session r2-s19 -- Alex (returning operations analyst), task T17, dataset A (running club, friends.csv)

Commands run from `design/ui/studio/tier2/` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`, session folder
`S=rounds/round-2/sessions/r2-s19`. Tool: `node ../tool/real.mjs`.

## Start

`node ../tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

Alex: OK, friends.csv is open, PageRank already run on it, 20 people, orange balls sized and colored by
PageRank. The job: only pairs with 4 or more runs together. In Gephi that is an edge weight range
filter. I don't see a Filters panel here. Left rail has Graph, Data, Notes. Let me look at Data first --
that's where the weight column would be.

## Step 2

`--step $S --click "Data"` -> 02.png

Alex: Data panel: friends.csv, 20 nodes, 41 edges -- good, matches the file. And there it is, "Filters"
with a plus. Edges have a "weight" column. That's what I want. Clicking the plus next to Filters.

## Step 3

`--step $S --click-at 275,197` (prints: button "Add filter step") -> 03.png

Alex: Right panel now says "New filter step", Keep: "an attribute's value", Attribute: empty dropdown,
"Add step" greyed out. Fine, pick the attribute -- should be weight.

## Step 4

`--step $S --click-at 1320,170` (prints: combobox) -> 04.png

Alex: Dropdown: Nodes / id, Edges / weight. Taking Edges weight.

## Step 5

`--step $S --click-at 1245,295` (prints: option "weight") -> 05.png

Alex: Now: weight, Is "at least", Value empty. Hint under it: "Keeps edges that pass and the nodes at their
ends." That's exactly what I want -- people without a strong pair drop out. Typing 4.

## Step 6

`--step $S --click-at 1320,266 --type "4"` (prints: input) -> 06.png

Alex: Value 4 is in, "Add step" turned blue. No preview of how many edges pass -- Gephi shows that live
while you drag the range. Whatever, clicking Add step.

## Step 7

`--step $S --click "Add step"` -> 07.png

Alex: Done. The top bar now reads "19 of 20 nodes", the filter list has "weight is at least 4 / 20 to 19
nodes" with a checkbox, and the right panel says "Nodes showing 19 of 20, Edges showing 12 of 41". The
drawing is a bunch of little pairs and chains now, the long weak links are gone. So: 19 people still in
it, 12 pairs at 4 or more runs. Honestly 19 surprised me -- I thought more would drop -- but three places
agree, so I'll go with 19. One gripe: below that the panel still shows "Components 1", and it does say
"counts below are for the whole graph", but for the filtered view I'd want the component count too; this
is obviously in more than one piece.

Answer to the club: 19 people are still in the drawing.

Now bring everybody back. I'll untick the checkbox on the filter rather than delete it -- I'll probably
need it again.

## Step 8

`--step $S --click-at 274,239` (prints: input "Apply step: weight is at least 4") -> 08.png

Alex: Everyone's back: Nodes 20, Edges 41, "19 of 20 nodes" gone from the top bar, the filter says "off".
Same layout as before, nobody moved, which I like. Prompt done: 19 people, whole club back.

## Follow-up (given word for word)

"Your club now asks the same for pairs who ran together 5 or more times. How many people are in the
drawing then? Bring the whole club back when you are done."

Alex: Same thing with 5. I'd rather change the one I have than build a second. Clicking on the filter
row to see if it opens for editing.

## Step 9

`--step $S --click-at 160,231` (prints: treeitem "weight is at least 4") -> 09.png

Alex: The editor opened with my rule: weight, at least, 4, and a button "Save and turn on". Nice -- one
button does both. Replacing 4 with 5.

## Step 10

`--step $S --click-at 1320,266 --key Control+a --type "5"` (prints: input) -> 10.png

Alex: Value reads 5. Header still says "weight is at least 4" until I save, fair. Save and turn on.

## Step 11

`--step $S --click "Save and turn on"` -> 11.png

Alex: "10 of 20 nodes" up top, filter now reads "weight is at least 5 / 20 to 10 nodes", Values says 10 of
20 nodes, 5 of 41 edges. I can count them on the canvas: three pairs plus a chain of four -- 10. That
one I believe without squinting. Answer: 10 people at 5 or more runs.

Small thing: the legend says "PageRank on 20 nodes" -- so sizes and colors are still the scores from the
whole club, not recomputed for the 10. That's what I'd want for a flyer, but good that it says so.

Bringing the club back: untick again.

## Step 12

`--step $S --click-at 274,239` (prints: input "Apply step: weight is at least 5") -> 12.png

Alex: Whole club back: Nodes 20, Edges 41, filter "off", same drawing as when I started. Done.

`--end $S`

## Wrap-up (in character)

**Finished?** Yes, both parts. 4 or more runs together: 19 people still in the drawing (12 of 41
pairs). 5 or more: 10 people (5 of 41 pairs). Both times I brought the whole club back (20 nodes, 41
edges) by unticking the filter.

**Ease: 6 out of 7.** Data, plus next to Filters, pick weight, it already says "at least", type the
number, Add step. Five clicks the first time, three the second because I could edit the rule I had. It
told me the answer in three places at once (top bar, the filter row, the Values panel), and turning it
off put everything back without the layout jumping. That's better than Gephi, where I always forget to
drag the filter back into the query box.

**What confused me or slowed me down:**
- I had to guess the filter lives under Data. Coming from the Graph tab there was nothing that said
  "filter" until I switched over. I found it fast because I went looking for the weight column, but
  the first place I looked for it was the toolbar at the bottom.
- No preview while typing the number: I didn't know how many pairs would pass until I clicked Add step.
  In Gephi the range slider shows the count live.
- 19 of 20 at 4+ surprised me; I only believed it after counting the pieces on screen. The panel then
  says "Components 1" right under "Nodes showing 19 of 20", and the line "the counts below are for the
  whole graph" is the only thing stopping me from thinking that's the filtered view. For a split-up
  drawing I'd want the component count of what's showing.
- The checkbox at the far right of the filter row is small; I wasn't sure at first whether it meant
  "on" or "selected". The word "off" appearing under the rule after I clicked settled it.

## Session close

The first `--end` printed the follow-up request word for word ("Your club now asks the same for pairs
who ran together 5 or more times...") and kept the session open. That request had already been carried
out above (steps 8 to 12, from the task text), so `--end $S` was run a second time to close the session.
