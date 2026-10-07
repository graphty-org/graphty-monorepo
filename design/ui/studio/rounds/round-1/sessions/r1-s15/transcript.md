# Session r1-s15: Ruth, names on every dot (College football)

Participant: Ruth, a reporter on a regional investigations desk, first time with any graph tool.
Task: practice on the ready-made College football network and get every team's name written next
to its dot. Start: empty app, no files.

All commands run from the studio worktree with `T=design/ui/studio/tool` and
`S=design/ui/studio/rounds/round-1/sessions/r1-s15`.

## Steps

### 1. Start

`node $T/real.mjs --start $S empty` -> 01.png

Saw: a dark start screen. Start column (Open project or file, New from data), Recent projects
(empty), Samples on the right listing Les Miserables, Zachary's karate club, College football
(115 teams), Florentine families. A box at the bottom asks to share usage data.

Think-aloud: "Before I do anything, that box. I keep unpublished names in here, so no, I am not
sharing anything. The sample I need is right there: College football, 115 teams. Good, so I
should end up with 115 names."

### 2. Decline usage data

`node $T/real.mjs --step $S --click "No thanks"` -> 02.png

Think-aloud: "Box gone. Now the football one."

### 3. Open the sample

`node $T/real.mjs --step $S --click "College football"` -> 03.png

Saw: the network drawn as blue balls joined by gray lines, no names anywhere. Left panel: a search
box "Find nodes, edges, values", then "Selection" and "Everything". Right panel: "Graph / From
College football", tabs Style and Values; Values is open with Nodes 115, Edges 613, density,
components 1, edges per node 7 to 12.

Think-aloud: "115 nodes, matches the sample card. Nothing is named. Usually you change how
things look under something like 'Style', so I'll try that tab."

### 4. Style tab of the graph

`node $T/real.mjs --step $S --click "Style"` -> 04.png

Saw: Style shows only Canvas (Background color F5F5F5) and a layout Method ("Force -
Recommended") with a Seed of 1. Nothing about names or labels.

Hesitation: "Hmm. Background and a 'method' and a 'seed'. I don't know what a seed is and I don't
see names. This is the style of the whole page, not of the dots. Maybe I have to pick the dots
first. 'Everything' on the left sounds like all the dots."

### 5. Pick "Everything"

`node $T/real.mjs --step $S --click "Everything"` -> 05.png

Saw: right panel now headed "Everything", with Nodes / Edges switches and sections Fill (Color),
Shape (Size, Shape: Icosphere), Effects, Label, Tooltip. Label has a plus next to it.

Think-aloud: "There it is, 'Label'. That is the word for a name on a chart. Plus means add one."

### 6. Add a label line

`node $T/real.mjs --step $S --click-at 1419,356` -> 06.png
Tool: `at 1419,356: button "Add label line"`

Saw: a list pops out, "Find an attribute", with three choices: id, label, value. A new row in the
panel says "Pick an attribute".

Hesitation: "Which one is the team name? 'id' could be a number, 'value' sounds like a number.
'label' is probably the name. I'd want to see a preview of what each one holds before choosing,
but I'll guess label."

### 7. Choose "label"

`node $T/real.mjs --step $S --click-at 1115,486` -> 07.png
Tool: `at 1115,486: option "label"`

Saw: team names appear next to the dots: GeorgiaTech, Maryland, Florida, Tennessee, Arkansas,
BoiseState, NewMexicoState, UCLA, Stanford, ArizonaState, and so on. They are small and some are
hard to read where dots cluster. The panel row reads "Above  Abc label", and underneath, in small
gray text: "115 labels, 14 hidden to avoid overlap".

Think-aloud: "Yes, names. 'label' was right. But the note says 14 are hidden. The task was every
team, and for me a dropped name is exactly the kind of thing that gets a story wrong. Which 14?
And how do I bring them back?"

### 8. Try the "Aa" button

`node $T/real.mjs --step $S --click-at 1220,386` -> 08.png
Tool: `at 1220,386: button "Label position"`

Saw: a small grid of nine dots, top middle highlighted. It only moves where the name sits.

Think-aloud: "Position, not what I want. Not 'show all'."

### 9 and 10. Close it, hover the note

`node $T/real.mjs --step $S --key Escape` -> 09.png
`node $T/real.mjs --step $S --hover-at 1290,410` -> 10.png
Tool: `tooltip: null`

Think-aloud: "Nothing on hover. I hoped it would list the 14 or offer a fix."

### 11. Click the note

`node $T/real.mjs --step $S --click-at 1290,410` -> 11.png

Saw: no change. The note is just text.

Think-aloud: "It tells me there's a problem but gives me nothing to do about it."

### 12 and 13. Zoom in, hoping hidden names come back

`node $T/real.mjs --step $S --wheel 740,470,-600` -> 12.png
`node $T/real.mjs --step $S --wheel 740,470,-2000` -> 13.png

Saw: the drawing did not change at all, both times. No zoom.

Hesitation: "In maps, names show up when you zoom. But the scroll wheel did nothing. Is it frozen?
One of the buttons along the bottom is lit; maybe it's in some mode. I don't know what those
icons mean and I'm not going to guess through all of them."

### 14. Click the label line itself

`node $T/real.mjs --step $S --click-at 1348,386` -> 14.png
Tool: `at 1348,386: button "Label, Above: label"`

Saw: the same attribute list again, now with "In use: label" on top and id, value below. No
setting for size, overlap or "show all".

Think-aloud: "Only lets me change which field. No 'show every name' switch anywhere I can find."

### 15. Close and stop

`node $T/real.mjs --step $S --key Escape` -> 15.png
`node $T/real.mjs --end $S`

## Debrief, in character

**Did you finish?** Partly. Names are on the drawing, and getting them there was quick once I
found "Everything" and then "Label". But the app itself says 14 of the 115 are hidden, and I could
not find any way to show those 14 or even to see which ones they are. The task was every team, so
by my own standard I did not finish. I stopped after three dead ends (the note, zooming, the label
row).

**How hard (1 = very easy, 7 = very hard):** 4. Adding names was a 2; the missing 14 make it a 4.

**What confused me:**

- The first Style tab I opened (on the graph) had only background and "method / seed", no names.
  I had to guess that "Everything" on the left was the way to style the dots.
- The attribute choices id, label, value gave no hint of what each holds. I guessed "label" was
  the team name. A sample value beside each would have saved the guess.
- "14 hidden to avoid overlap" is the most important line on the panel for me and it is tiny gray
  text that does nothing when hovered or clicked. It should say which ones and offer to show them
  anyway.
- The scroll wheel did not zoom the drawing, so I could not even try to make room for the hidden
  names.
- The names are small and run together where dots bunch up; several are unreadable at this size
  ("BrighamYoung" overlaps its neighbor). I could not hand this to a graphics desk as is.
- The icons on the bottom bar have no words, so I did not try them.
