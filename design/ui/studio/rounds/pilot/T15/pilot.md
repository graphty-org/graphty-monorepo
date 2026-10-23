# Pilot: T15, a whole first session (Les Miserables, prompt A)

Build under test: commit a1e6b91ff281, build stamp `0196d46212aa graphty@0.8.53`, app at `/?next`,
empty start. Screenshots are in `A/` (01.png to 22.png); the exported image is
`A/downloads/les-miserables_current-view.png`. Prompt B (`friends.csv`) was not piloted: it shares
every step after the load with A, and the load is T3's path.

## Verdict

The end state is NOT reached as `answers.md` defines it. Steps 1 to 4 are reached; step 5 (an image
that passes the picture checklist) fails, because the exported image has no key and the drawing
never holds still, so "the same arrangement as the final screen" cannot hold. Per `criteria.md`
preflight item 8, the legend fix (graphty-element issue #133) has not landed in this build, so T15
must not be run with participants yet, or must be graded on steps 1-4 plus "an image was
downloaded".

| Part                                                     | Reached                          | Evidence                                        |
| -------------------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| 1. Sample drawn                                          | yes                              | 02.png: 77 nodes, 254 edges                     |
| 2. Ranking run from Analyze, finished                    | yes, with a detour               | 05.png (Enter did nothing), 06.png, 07.png      |
| 3. Sizes bound to the result, visibly different          | yes                              | 13.png: Size "1 to 3", legend "Size: Influence" |
| 4. Label line bound to `name` on Everything, names drawn | yes, but its count line is wrong | 17.png, 18.png                                  |
| 5. Image downloaded that passes the checklist            | no                               | 19.png, downloaded PNG                          |

## The path as walked (20 steps to the download)

1. `--start A empty` -- 01.png, start screen with the usage card.
2. `--click "No thanks" --click "Open the Les Miserables sample"` -- 02.png, graph drawn.
3. `--key Shift+A` -- 03.png; `--type PageRank` -- 04.png, one match "PageRank (Start here)".
4. `--key Enter` -- 05.png: nothing happens; the list stays open with its one match.
5. `--click "PageRank"` -- 06.png, the PageRank form (damping 0.85, Run).
6. `--click "Run"` -- 07.png: nodes turn orange, a row "Influence 77" appears, legend "Color: Influence".
7. `--click "Influence"` -- 08.png, Values: Top 10 Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577.
8. `--click "role=tab:Style"` -- 09.png; `--click "Add to Shape"` -- 10.png (Size / Shape menu).
9. `--click "Size"` -- 11.png, a constant size 1; `--click "Size by attribute"` -- 12.png.
10. `--click "role=option:Influence"` -- 13.png, sizes 1 to 3, legend "Size: Influence".
11. `--click "Everything"` -- 14.png; `--click "role=tab:Style"` -- 15.png.
12. `--click "Add label line"` -- 16.png, attribute picker (id, name, Influence...).
13. `--click "role=option:name"` -- 17.png, names drawn; tool: "the drawing is still moving".
14. `--wait 5000` -- 18.png, same state.
15. `--key Control+e` -- 19.png, Export dialog: "The legend is not in the image".
16. `--click "Export"` -- 20.png; saved `les-miserables_current-view.png`, 1806 x 1720.
17. `--key Escape --wait 1000` -- 21.png; `--wait 1000` -- 22.png (no input; drawing turned).

No console error, script error or failed request was printed at any step; `session.log` is empty.

## Blockers

### 1. The exported image has no key (graphty-element defect, known)

- Step 15, 19.png: the Export dialog says "The legend is not in the image. The legend card on the
  canvas is not drawn into exported images yet."
- The downloaded PNG shows the nodes, sizes and names but no size or color key. Picture checklist
  item "a key that names every channel in use" fails. This is graphty-element issue #133, and
  preflight item 8 says T15 waits for it.

### 2. The drawing never holds still (graphty-element defect, likely)

- With no input between them, 21.png and 22.png show the same graph turned by a large angle (Myriel's
  star moves from top left to bottom center). Every screenshot from 02.png on shows a different
  orientation of the same graph (compare 02, 04, 05, 06, 07).
- Consequences: the exported image (step 16) does not match the final screen (20.png) in
  arrangement, so the checklist item "the same arrangement as the final screen" fails whatever the
  participant does; a participant cannot point at a node they saw a step earlier
  (`--click-at` from the last screenshot hits whatever moved there); the tool's stable-frame wait
  did not flag it before labels were added, so the element's "settled" signal and what is drawn
  disagree.
- Mechanism not established in this pilot (no auto-rotate setting found in graphty-element or the
  app source); it needs a look at whether the layout keeps running or the camera keeps moving.

### 3. The label line's count is wrong, and the element never announces label counts (graphty-element defect, maybe app)

- Steps 13-17, 17.png, 18.png, 20.png: under the label line the Style panel says "0 labels,
  0 hidden to avoid overlap" while about 77 names are drawn.
- Every step after the label was added prints "the drawing is still moving (... the node label
  counts have not been announced.)". The count the app shows is the element's announcement, which
  never arrives. This is a counts-disagree-with-the-drawing item (`criteria.md` bar 5 must be 0)
  and it decides T10's "reads the hidden-for-overlap count" path.

### 4. Enter does not pick the only match in Analyze (app defect, or answer key)

- Step 4, 05.png: after `--type PageRank` the list shows one match; `--key Enter` does nothing.
  `answers.md` T7 path (used by T15) says `--key Enter`. Either Enter should open the highlighted
  (or only) match -- the expected behavior of a filter list -- or the path in `answers.md` is wrong.
  Clicking the entry works (06.png).

### 5. The answer key names "PageRank"; the app names the result "Influence" (answer key)

- 07.png onward: the run's row, legend, attribute group and options are all "Influence"
  ("Influence", "Influence rank", "Influence percentile"); nothing on screen after the run says
  PageRank except the Analyze entry. `answers.md` T9 path says "pick PageRank" at the size-by step;
  it should say "pick Influence". Graders should also accept a participant who calls the measure
  "Influence".

### 6. The legend lists every name as a key entry once labels are on (graphty-element or app defect)

- 17.png onward: the legend card grows a "Label: Everything" section listing each character twice
  ("Anzelma Anzelma", "Babet Babet", ... "65 more"). A label is not a channel that needs a key; the
  card now covers the left fifth of the canvas and hides the nodes under it. The checklist's "a key
  that names every channel" will also be ambiguous once the key is exported: does it need this list?

### 7. The constant size step shows a misleading key entry (graphty-element or app defect)

- Step 9, 11.png: after "Size" is added (constant 1), the legend shows "Size: Influence --
  Influence - Node Colour 1": an internal layer name, British spelling, and a size channel that is
  not bound to anything yet. A participant can take this as "sizes done" (the expected
  `false-done` on the size step).

### 8. Adding a label line creates a second "Everything" row (app defect, likely)

- 17.png: the left list now has two rows named "Everything" (one with a brush icon, one with the
  layers icon, the second selected). A participant reading the list cannot tell them apart, and a
  later `--click "Everything"` is ambiguous.

## Smaller observations (not blockers)

- 02.png: the Overview line reads "Undirected, from the file: directed 0", which is truncated or
  garbled, and edges are drawn with arrowheads although the graph is called undirected.
- 09.png onward: the Color chip on the Influence row's Style tab shows a gray swatch while the nodes
  are orange.
- 16.png: the attribute picker lists `id` and `name`; the reference values in `answers.md` say
  `name` and `graphty_originalId`. The reference table should say `id`.
- 17.png: drawn labels are small serif text, blurry at this zoom; many overlap in the center.
- `--click "Export"` printed `ambiguous` (the button and the dialog share the name); the tool took
  the button, which was right. Harmless, but the T13 path should say `--click "role=button:Export"`.

## Activation measure

Picking and running a ranking needs no help from a tooltip, but the Enter detour (step 4) means a
keyboard-first participant fails the "no detour" condition on this build.
