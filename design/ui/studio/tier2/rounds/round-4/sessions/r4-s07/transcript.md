# Session r4-s07 transcript

Participant: Tom, a returning user. Session folder (screenshots, logs):
`tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s07/` in the studio worktree.

Task as given: the running club list, friends.csv, is open with names on the drawing. How many
runs did Gus and Ivan do together? Then point out Gus and Ivan, and nobody else, so whatever is
done next applies only to those two.

All commands run from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/` and
`S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s07`.

## Step 0 -- start

Command: `node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked-names.txt`

Output: waited for a browser slot, then 01.png.

Seen (01.png): the running club drawing, orange balls with names. Gus is low in the middle, Ivan
is just up and to the right of him, near Hana. A key at the top left says "Size: PageRank" and
"Color: PageRank". On the left: Selection, PageRank 20, Everything. Right: a style panel.

In character: "Right, that's the club list. There's Gus and there's Ivan, and a line between
them. I'll click the line and see if it tells me the number."

## Step 1 -- click the line between Gus and Ivan

Command: `node design/ui/studio/tool/real.mjs --step $S --click-at 758,583`

Output: `at 758,583: edge with id "13"`; 02.png.

Seen (02.png): the line turned blue. The right panel now says "Gus -> Ivan", "Edge", and under
Summary: From Gus, To Ivan, weight 1. "Selection" on the left now shows 1.

In character: "From Gus, to Ivan, weight 1. The spreadsheet column was called weight, and that's
the runs together, so: one run. A bit odd it says 'weight' and not runs, but that's what the
column was called in the file, so fine. Now I want Gus and Ivan picked, the two people, not the
line. I'll click Gus first."

## Step 2 -- click Gus

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Gus"`

Output: 03.png.

Seen (03.png): Gus has a yellow glow around him. The right panel says Gus, Node, Degree 4,
PageRank 0.0535, #5 of 20. Selection on the left still says 1; the blue line is gone.

In character: "Gus is lit up, and the count says 1, so it swapped the line for Gus. Good. Now
Ivan as well, without losing Gus. Most programs, you hold Shift and click the second one. Ivan is
half behind Hana, I'll click on his name."

## Step 3 -- shift-click Ivan

Command: `node design/ui/studio/tool/real.mjs --step $S --shift-click "Ivan"`

Output: `clicked node "Ivan" on the canvas, at 821,547`; 04.png.

Seen (04.png): Gus and Ivan both have the yellow glow; nobody else does. The right panel heading
says "2 nodes selected", Nodes 2, Edges joining these nodes 1. Selection on the left says 2.

In character: "Two lit up, Gus and Ivan, and it says 2 nodes selected. Hana is right on top of
Ivan and she isn't lit, so I didn't catch her by mistake. That's what I wanted. I'm done."

## Step 4 -- end

Command: `node design/ui/studio/tool/real.mjs --end $S`

Output: session ended; the session folder was copied next to this transcript; leak check found no
file opened outside the session folder.

## End of session, in character

**Did I finish?** Yes. Gus and Ivan ran together once: clicking the line between them showed
"From Gus, To Ivan, weight 1". Then I clicked Gus and Shift-clicked Ivan, and the panel said
"2 nodes selected" with only those two glowing.

**Ease: 6 out of 7.**

**What confused me:**
- The number was labelled "weight", not runs. I only knew it meant runs because I remembered the
  column in the spreadsheet was called that. If someone else had made the file, I'd be guessing
  what "weight" stands for.
- Ivan is mostly hidden behind Hana. I clicked on his name and it worked, but I wasn't sure until
  I saw that Hana wasn't lit up.
- It is not obvious that Shift-click adds a second person. I tried it because other programs do it;
  nothing on the screen told me. It worked first time, so no harm done.
- "Selection 1" on the left kept saying 1 when I went from the line to Gus. It meant one thing
  picked, not one person, which I only understood when it said 2 later.
