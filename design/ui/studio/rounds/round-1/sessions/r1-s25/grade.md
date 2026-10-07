# Grade: r1-s25 (T9A, Nadia, Les Miserables)

**Grade: SD** (success with difficulty). A ranking ran, the dot sizes are bound to its result and
visibly differ, the key shows size, and Nadia said correctly what the sizes and the colors stand
for. It is SD rather than S because she reached the size binding only after guessing that size
lives under "Shape", a dead end in the Size box's empty list, and a hover on an unlabeled link
icon to learn it meant "Size by attribute".

Build under study: graphty@0.8.53 (commit 9d6598ee). No files were downloaded; none were asked
for.

## Against the success definition

1. **A ranking run.** `06.png`: Nadia picked Betweenness from the "Rank nodes and edges" list and
   ran it; it is shown on screen as "Bridges". `07.png`: the Top 10 starts Valjean 1,624, Myriel
   504, Gavroche 470.6. Betweenness is a ranking measure, so this meets the definition, even
   though the reference path uses PageRank.
2. **Sizes bound to the result.** `15.png` (the last screenshot): the Bridges row's Style tab has
   a Size line reading "1 to 3", the key on the canvas reads "Size: Bridges, 0 to 1624" above
   "Color: Bridges, 0 to 1624", and the dots differ clearly: Valjean in the middle is by far the
   largest, the hub at the bottom left (Myriel) second, a few others somewhat larger.
3. **Meaning, from the screen.** Her answer: "The size of each dot is its Bridges score ... Bigger
   means more of the network passes through them ... The color is the same thing again: darker
   orange to brown is a higher Bridges score ... So size and color both say the same number."
   That matches the key and the run's description. Her ranking (Valjean, Myriel, Gavroche, Marius,
   Fantine) is read from the Top 10 and is correct.

## Measures

- **Steps:** 15 `real.mjs` steps (`01.png` to `15.png`, two hovers included) against a path of
  about 11 commands: about 1.4x.
- **Wrong turns:** 1. The arrow in the Size box (`11.png`) opened an empty list. Hovering the link
  icon (`12.png`) was a check, and the last hover (`15.png`) came after the task was done.
- **False "done":** none. "Yes, I think so" was said with the sizes bound and the key showing
  "Size: Bridges"; her statement that Bridges is Betweenness is true.
- **Silent commit:** none on the success path. Adding "Size" at `10.png` changed nothing on the
  canvas, but that step sets a fixed size of 1, not a binding; the binding at `14.png` changed
  both the drawing and the key.
- **Build-decided:** no. **Void:** no. `real.mjs` did nothing a person could not do.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The arrow on the Size box opens an empty list: a thin blank strip with no options. A control that offers a choice and then holds nothing is a dead end; the working route is a separate unlabeled link icon. Seen on the screen; reproduce on the build as a scripted path before counting it confirmed. | `11.png` |
| 2 | 2 | behavior | Sizing by a value sits behind an unlabeled link icon whose purpose shows only on hover ("Size by attribute"). Adding "Size" gives a fixed size of 1. | `10.png`, `12.png`, `13.png` |
| 3 | 2 | behavior | There is no Size line on the Style tab until one is added under the "+" beside "Shape"; she had to guess that size counts as shape. | `08.png`, `09.png` |
| 4 | 2 | behavior | Hovering a dot shows no name or value, so she could not confirm from the drawing which dot is Valjean and trusted the Top 10 instead. She said the picture alone would not satisfy her QA reviewer. | `15.png` (hover printed tooltip: null) |
| 5 | 2 | wording | The run is chosen as "Betweenness" and then named "Bridges" everywhere after, with nothing tying the two. She answered "as long as Bridges really is Betweenness". | `05.png`, `06.png` |
| 6 | 2 | wording | Once bound, the Size line reads "1 to 3" and does not name the value it uses, while the Color line beside it says "Bridges". Only the key on the canvas says what sizes stand for. | `15.png` |
| 7 | 1 | behavior | Running the ranking colors the dots but leaves their size alone; the color ramp reads as one orange for all but a single dot, because most values are near 0. | `06.png` |
| 8 | 1 | opinion | The "Start here" badge on PageRank made her doubt a pick that suited her question better. | `04.png` |
