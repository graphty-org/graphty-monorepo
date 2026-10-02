# Session: label hosts by name -- Analyst Alex

Task as given by the moderator: "Have each host in the drawing show what people call it, not its
inventory number. The data on screen is a sample: a company's IT estate, hosts and the network
connections between them, with dozens of things recorded about each."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t21-wide--analyst-alex/`.

## Start screen (shots/tasks/t21-wide/01.png)

"OK, IT estate, 300 nodes, 1,105 edges. Counts are right there, good. A ring of clusters and one
dense blob on the right, no names on anything. In Gephi this is the 'T' button at the bottom plus
picking the label column in the data lab. Here... there's a Style tab and a Data tab on the right.
Labels are a look thing, so Style."

## Step 1 -- Style tab

    timeout 120 node app-b/study.mjs --try .../01.png task:t21-wide --click "Style"

"Canvas, background, print-safe colors, 'Hide overlapping labels'. So labels exist somewhere, but
this is the whole-picture settings. Layout method and seed, nice, I like seeing a seed. Nothing
about which column the label is. Hmm."

## Step 2 -- Everything row

    timeout 120 node app-b/study.mjs --try .../02.png task:t21-wide --click "Everything"

"Left panel has Selection, Notes, Everything. 'Everything' sounds like all nodes. Yep -- 'Paints 300
nodes, 1,105 edges, default look'. There's Fill, Shape, Effects, Label, Tooltip. Label with a plus.
That's it."

Aside: "Color says 6366F1, that's a purple, but every node on screen is gray. Which one is lying?"

## Step 3 -- click the word Label

    timeout 120 node app-b/study.mjs --try .../03.png task:t21-wide --click "Everything" --click "Label"

"Nothing. The heading doesn't open. Has to be the little plus."

## Step 4 -- trying to hit the plus

    timeout 120 node app-b/study.mjs --try .../04.png task:t21-wide --click "Everything" --hover "Add label"
    -> nothing on screen is called "Add label"
    timeout 120 node app-b/study.mjs --try .../04.png task:t21-wide --click "Everything" --click "+"

"Whoa, that opened an Analyze popup with Louvain and PageRank. Not what I wanted. Wrong plus."

    (hovers tried, render 05.png) "Add Label", "Show label", "Show labels" -> nothing on screen is
    called that; "Add" -> tooltip "Add to Effects" on the Effects plus.

"So the plus next to Label is 'Add to Label'. Odd phrasing, 'add to label', but fine. Four plus
buttons in a column that all look the same, you have to hover each one."

## Step 5 -- Add to Label

    timeout 120 node app-b/study.mjs --try .../06.png task:t21-wide --click "Everything" --click "Add to Label"

"Menu: 'Label line' and 'Show labels'. I want labels shown. 'Label line' -- is that a line drawn
from the node to the label? A leader line? I'll take Show labels."

## Step 6 -- Show labels

    timeout 120 node app-b/study.mjs --try .../07.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels"

"It added a 'Show labels' row with an UNticked box. I just asked it to show labels and it gives me a
switch that's off. Two clicks for one thing."

## Step 7 -- tick it

    timeout 120 node app-b/study.mjs --try .../08.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"

"Ticked. Nothing on the drawing changed. And I never told it which column. So 'Label line' must be
the column after all, not a leader line."

## Step 8 -- Label line

    timeout 120 node app-b/study.mjs --try .../09.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "Label line"
    -> nothing on screen is called "Label line"

"The menu didn't come back this time; the plus went straight to a field picker, 'Above: Pick a
field'. OK. The list: 'In use: id -- Key, hostname -- Name'. That's handy, it tells me hostname is
the name column, I didn't have to scroll through the 60-odd cmdb_ things. Little percentages next to
the date columns, I guess how full they are. hostname."

## Step 9 -- hostname

    timeout 120 node app-b/study.mjs --try .../10.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "Label line" --click "hostname"

"Panel: Above -- hostname, Show labels -- ticked. The drawing... still dots. No names anywhere. Not
even on the isolated ones out on the edge where there's room. Maybe I'd have to zoom in? Nothing
tells me that. If I showed this to my manager he'd say 'where are the names'."

Stopped here.

## Wrap-up

**Did I succeed?** "Half. The settings say hostname is the label and labels are on, so I think I
did the right thing. But I can't see a single name on the picture, so I can't prove it. In Gephi I'd
at least see the text pile up into a mess."

**Single Ease Question (1-7):** 3. "What took longest was finding the plus. Clicking the word
'Label' does nothing, the plus buttons all look the same, and one of them throws an Analyze popup
at you. Then 'Show labels' gave me an off switch, and the column choice came in through a different
door the second time. The hostname-is-Name hint was the good part."

**Would I use this instead of my current tool?** "Not for this yet. Gephi's label column is clunky
but I see the result. Here the panel and the picture disagree twice -- the color says purple and the
nodes are gray, the labels are on and there are no labels. Until the picture shows what the panel
says, I don't trust it with a deck."
