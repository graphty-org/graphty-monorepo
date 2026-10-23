Grade: S
False done: no
Wrong turns: 0
Route: folder
Token: not touched, the folder's Fill Color field showed "<<Layer>>" with the ten swatches and was left alone; every group kept its color

# Grade: r1-s14 (task T47 B, persona Nadia)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (33 tool calls) and lists no file opened
outside its own folder.

## Against the success definition

T47 B asks for the College football sample, the program's own clusters (each a color, not the
file's conferences), then every cluster's teams drawn as cubes with the colors kept.

- Last screenshot `12.png`: College football (115 nodes), the Louvain folder selected, Style tab
  "10 layers in Louvain. Layers added later are not changed.", Shape line "Box" with "Shape: 10
  changed" and Undo. Every node on the drawing is a cube, in ten colors. The key reads "Shape:
  Louvain -- Box" above "Color: Louvain -- Group 1 ..." (Groups 8 to 10 scrolled out, "3 more
  below").
- `styles.json`: the ten group layers made by the Louvain run (`results.louvain.group`), each
  with its own `node.color` and `node.shape` `box`, painted counts equal to matched: 16, 15, 14,
  12, 11, 10, 10, 9, 9, 9 (115 in all). Everything still sets `icosphere`, painted 0 for shape.
- `key.json` drawn: ten node colors with exactly those counts; the colors are the ten in
  `styles-steps.jsonl` from `07.png` (the run) through `12.png`, so no cluster's color changed.
- The clusters are the program's (a Louvain run), not the conference column. The group sizes
  match the answer key's reference values for Louvain on College football.
- Stack: the run's folder edited once (Shape "+" > Shape > Box), written to all ten group
  layers: `Route: folder`.

## Steps and wrong turns

Participant: 11 steps from `01.png` to `12.png` (Samples, the College football card, Analyze,
`cluster` typed in the filter, Louvain, Run, the Louvain folder, Shape "+", Shape, open the list,
Box). The key's path is 11 steps (`answers.md`, T47); typing `cluster` and clicking Louvain
stands in for `louvain` and Enter, the same count.

Wrong turns: 0. The filter's first highlight, "Clustering coefficient", was read and passed over
without being opened (`05.png`).

False done: no. The participant said done on `12.png`, and the screen, the key and the style
tree agree.

## Problems

1. **The color key scrolls once the shape entry is added, hiding three clusters.** Severity 2,
   kind: behavior. Step 12 (`12.png`): the key over the top left shows "Shape: Louvain -- Box"
   and Groups 1 to 7, with "3 more below"; Groups 8 to 10 are out of view, and the key covers
   the left edge of the drawing. The participant noted the box covers part of the drawing.
   Already in the answer key's record of this path; one session here.
2. **Nothing names a cube; the reader must guess that Box is one.** Severity 1, kind: wording.
   Step 11 (`11.png`): the shape list starts with Box, Sphere, Cylinder, Cone; the participant
   looked for the word "cube" first and picked Box from its icon.
3. **The analysis filter's `cluster` puts "Clustering coefficient", a ranking, first.**
   Severity 1, kind: wording. Step 5 (`05.png`): the highlighted first hit is a per-node ranking;
   the participant found the right section only by its heading "Find groups".
4. **Nothing helps choose among six grouping methods or their settings.** Severity 1, kind:
   behavior. Steps 6-7 (`05.png`, `06.png`): Louvain, Leiden, Label propagation, Markov,
   Spectral and Hierarchical sit side by side; the participant took the first one and left
   Resolution and Weight at their defaults without knowing what they do, and said she could not
   explain the choice to a colleague.
5. **Clusters are colors scattered over the drawing, not visible lumps.** Severity 1, kind:
   behavior. Step 7 (`07.png`): the run colors the nodes but the layout does not move, so a
   cluster is not seen as a group in the picture. The run leaves the layout alone by design
   (the Layout menu offers a layout by Louvain); nothing on screen points to it.
6. **Unclear whether Box changed the data or only the drawing.** Severity 1, kind: wording.
   Step 12 (`12.png`): "Shape: 10 changed" with Undo does not say it changed only the look.
7. **Nothing says the folder's Shape line reaches every group.** Severity 1, kind: wording.
   Steps 8-9 (`08.png`, `09.png`): the participant chose the folder hoping it would set every
   group; "10 layers in Louvain" and then "Shape: 10 changed" confirmed it only afterwards.

No build defect seen, so no repro.
