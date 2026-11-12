Grade: S
False done: no
Wrong turns: 1

# Grade: r1-s33 (task T43 A, persona Maren)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (33 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the start page's "Open a file"; `work.json` ends with the one source
`volunteers.graphml`, the sample's layers and run gone).

## Against the success definition

T43 A asks for `volunteers.graphml` brought in, node size following `hours` for every node, larger
for more, and the person who gave the most named from the screen.

- Size: bound on Everything, the stack the key counts as S. `styles.json` row `everything_2`
  encodes `node.size` by `data.hours`, linear, range 1 to 3, matched 24 of 24. The Size box shows
  the chip "hours" with "From 1 to 3", and the key over the drawing reads "Size: hours" with a
  wedge from 2 to 52 (`08.png`, `11.png`; `key.json`). No other layer sets size.
- Answer: Hannah Weiss, 52 hours -- the answer exactly. Read from the table sorted on the hours
  header, highest first, whose top row is v09 Hannah Weiss, staff, 52 (`11.png`), and checked
  against the key's 52 maximum.
- Final screen (`11.png`): dot sizes vary, the size key is on the canvas, the sorted table shows
  the answer.

## Steps

8 steps against the key's 6 (7 by the table route, which swaps the dot click for Table and the
header). Open a file with the file (1), Load (2), the right panel's Style tab (3, the wrong turn:
with nothing picked it shows the canvas settings, `04.png`), Everything (4), the link icon beside
Size (5; reached after a hover, not counted), `hours` (6), Table (7), the hours header (8). The
one step over the table route is the Style tab click.

## Problems

1. Severity 2, behavior. The drawing alone cannot answer "who gave the most": no names on the dots,
   and in 3D a dot's drawn size also depends on its distance from the camera, so the biggest is
   not clear at a glance (v09 at 52 and v02 at 48 look alike). The participant went to the table
   to be sure (steps 7-8, `08.png`, `10.png`, `11.png`). Also in the key.
2. Severity 2, behavior. With nothing picked, the right panel's Style tab holds only canvas
   settings (background, lighting, labels); node size lives in the Everything layer on the left,
   which the participant had to guess means "all nodes" (steps 3-4, `04.png`, `05.png`).
3. Severity 1, wording. The control that sizes by a column is an unlabeled link icon beside Size;
   the participant found its meaning only from its tooltip "Node size by attribute" on hover
   (step 5, `05.png`, `06.png`).
4. Severity 1, wording. "From 1 to 3" under the bound Size names no unit and does not say that 2
   hours draws at 1 and 52 at 3, or how to widen the range (step 6, `08.png`).
5. Severity 0, opinion. The graph opens as shaded 3D spheres; for a report figure the participant
   wanted a flat 2D view (`03.png`). Not needed for this task.

No build defect: nothing here contradicts what the key says the build does, so no repro was
scripted.
