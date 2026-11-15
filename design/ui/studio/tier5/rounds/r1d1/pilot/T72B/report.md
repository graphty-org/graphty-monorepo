# Pilot: T72 B (gauges -- readings sent by itself, not installed in the 1990s), targeted re-pilot

Build: f0a9a014cb, served from `.study-builds/tier5-r1d1-f0a9a014cb`. Every walk started from the
task's real start, `setup:gauges-clean.txt` (11 gauges, 13 stretches, station as the label, the
node table open). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T72B/ (below,
`<walk>/NN.png`). Walks of the same names from an earlier build (797a4f6b47) were moved to
`_797a4f6b47/` in that folder. The data stayed the task's own on every walk: 11 nodes and 13 edges
at the end of each; the five gauges reached are G02 Mill Pond, G04 Fox Creek, G06 Willow Run, G07
Stone Weir and G11 Quarry Pool.

Result: **reached** by pointer. Nothing walked crashes, blocks the task or gives a wrong count.

## Success path by pointer (`success/`)

Replayed the latest success walk; all 11 steps matched.

- + > Layer, Which nodes, telemetry, tick yes, Condition... > installed, 2000, Enter, Except:
  "Except installed before 2000", header 5 of 11, strip G02, G04, G06, G07, G11 (08.png).
- Done, Add to node fill, E4572E, Enter: five orange nodes, key "Color: Layer 1, 5 of 11 nodes",
  inspector "telemetry yes / Except installed before 2000 / 5 of 11", Layer 1 row 5 (10.png).
- Hex box: a new value then Escape put back E4572E (11.png); Tab kept it, focus to the link
  button (12.png).

## Touched routes that belong to this task

Four entries of the fix list are this task's; each walk folder is named by its place in that list.

### touched-5: success path and a filter card from the canvas toolbar

Replayed; all 4 steps matched. The toolbar's Filters opened a new card's workspace; telemetry yes,
installed before 2000, Except: "5 of 11 nodes, 1 of 13 edges" in the top bar (03.png). Done, then a
new layer on All nodes filled E4572E: five orange nodes, inspector "5 of 5", row 5, key "Color:
Layer 1" with no count (05.png). A participant would answer 5; graded not success (a filter card),
as the answer key says.

### touched-23: two layers, then After 2000

Replayed; all 18 steps matched.

- Layer 1 telemetry yes, orange (7). Layer 2 on installed: After picked, 1990 typed, then Between
  with 1999: "installed 1990 to 1999", 3 of 11 (G01, G05, G09); the mode and the typed date carry
  across (09.png).
- Done, Add to node fill, Enter with no color typed: Layer 2 commits 6366F1, the default node color,
  so nothing on the canvas changes; key "Color: Layer 2, 3 of 11" and "Color: Layer 1, 7 of 11
  nodes, 2 nodes covered by Layer 2" (11.png). Five nodes look orange; a participant stopping here
  answers 5 with no layer holding the rule (not success).
- Back in Layer 1: Condition... installed, After, 2000; Escape, Escape; Before then After again,
  Done: Layer 1 "telemetry yes / installed after 2000", 5 of 11, key "Color: Layer 1, 5 of 11 nodes"
  (19.png). The answer key's equal route works.

### touched-24: Between 1990 and 1999, the equal second step

Replayed; steps 1-6 matched. Step 7 stopped on the tool's name matching ("Except" names both the
switch and the outline row), not on the app; the screen was the same (08.png). Carried on by hand:

- "not" and "1990" in the value picker: "Nothing found" (02.png, 03.png); Escape took the empty
  step back (04.png), as decided.
- telemetry yes, installed, Between, 1990 Tab 1999, Except on: "Except installed 1990 to 1999",
  5 of 11 (07.png). The equal second step works.
- Except off, mode After: the typed 1990 is carried, "installed after 1990", 7 of 11 (09.png).
- Control+A, 2000, Enter: "installed after 2000", 5 of 11, focus stays in the box (10.png);
  Escape: value kept, focus to the outline row (11.png), as decided.
- Done, Add to node fill, E4572E, Enter: five orange, "telemetry yes / installed after 2000",
  5 of 11 (12.png).

### touched-36: a filter card from the canvas toolbar

The same route as touched-5's detour, walked again on its own; all 4 steps matched, the same
screens (03.png, 05.png).

## Defects (all walks)

None that crash, block or spoil the grade. Still seen, unchanged:

- With the node table open, one orange node sits half under the canvas toolbar, so a count of the
  picture finds four plus a half (success/10.png, touched-24/12.png); the key and the inspector say 5.
- Under a filter card, a layer's key line "Color: Layer 1" has no count while the inspector says
  "5 of 5" (touched-5/05.png).
- Enter on a new Fill with no color typed commits the default 6366F1, which draws nothing new
  (touched-23/11.png).

## Answer key against the screen

- Path B: "type 2000; Enter" -- the count updates as the digits are typed; Enter changes nothing
  visible. Otherwise the route and its final outline match the screen.
- Also success "After 2000" and "Except Between 1990 and 1999": both build and give 5 of 11.
