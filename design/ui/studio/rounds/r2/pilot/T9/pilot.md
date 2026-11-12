# Pilot: T9, bigger dots for the ones that matter

Build under study: commit b7590f8de, build b7590f8de22b graphty@0.8.53, opened at `/?next`.
Sessions: `A/` (Les Miserables, 11 screenshots) and `B/` (Florentine families, 10 screenshots).
No script errors, `console.error` lines or failed requests were printed in either session. The
only tool print besides screenshot paths was "the drawing is still moving" right after Run, in
both sessions (the dots fading to their new colors); the next screenshot was still.

## Result

The end state is reached on both datasets: a PageRank run, a Size line on the run's row bound to
the result ("1 to 3"), dots that visibly differ in size, and a legend reading "Size: PageRank" and
"Color: PageRank", each with its value range (A/09.png, B/08.png). The answer key's round 3 path
works as written on this build, in 8 steps from the empty app.

## Path walked (Les Miserables)

| #   | Step                                           | Screenshot | What happens                                                                                                                                             |
| --- | ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `--start empty`                                | A/01.png   | Start page, usage card, four samples                                                                                                                     |
| 2   | `--click "No thanks" --click "Les Miserables"` | A/02.png   | 77 nodes, 254 edges, all blue                                                                                                                            |
| 3   | `--key Shift+A --type PageRank`                | A/03.png   | Analyze popover, one entry "PageRank -- Start here", "Which nodes are connected to other well-connected nodes."                                          |
| 4   | `--key Enter`                                  | A/04.png   | The PageRank form opens (damping 0.85, Run)                                                                                                              |
| 5   | `--click "Run"`                                | A/05.png   | Row "PageRank 77" in the outline; dots orange; legend "Color: PageRank 0.003299 .. 0.07543"                                                              |
| 6   | `--click "PageRank"`                           | A/06.png   | The run row opens on its Style tab: Color = PageRank (orange swatch), Shape +                                                                            |
| 7   | `--click "Add to Shape"`                       | A/07.png   | Menu: Size, Shape                                                                                                                                        |
| 8   | `--click "Size"`                               | A/08.png   | The "Size by attribute" list opens at once: Fixed size; PageRank, PageRank rank, PageRank percentile; id and name disabled ("Holds groups, not amounts") |
| 9   | `--click "role=option:PageRank"`               | A/09.png   | Size reads "1 to 3"; Valjean's dot at the center is clearly the largest; legend gains "Size: PageRank 0.003299 .. 0.07543"                               |
| 10  | `--click "role=tab:Values"`                    | A/10.png   | Top 10: Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; "Made with -- Analysis: PageRank"                                                             |
| 11  | `--wait 3000`                                  | A/11.png   | Identical to A/10: the drawing no longer turns on its own                                                                                                |

Florentine families (B/) follows the same path. Medici becomes the largest and darkest dot; the
Top 10 reads Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881 (B/09.png).

## The "closed the list" branch (Florentine families)

After step 8, `--key Escape` closes the list (B/06.png). The Size line is left as a fixed "1",
the legend shows only "Color: PageRank" (no Size entry), the dots do not change, and focus sits on
the chain-link button with its tooltip "Size by attribute" showing. Clicking it reopens the same
list (B/07.png) and choosing PageRank binds the size (B/08.png). This is the round 3 detour then
correction (SD) the key describes. A participant who stops at B/06 sees nothing that claims sizes
were set, so the earlier ready-made false "done" (a legend "Size" entry for a constant size) is
gone.

## Remaining blockers and findings

None blocks the end state.

1. **element-defect -- the legend card hides part of the drawing, and the element cannot frame
   around it.** On Florentine families a node at the top left (B/02.png, about 531,83) is fully
   under the legend card once the run adds it (B/04.png; only its edge shows at the card's right
   edge, about 549,90, in B/08.png). The card is the app's overlay
   (`graphty/src/workspace/canvas/CanvasOverlays.tsx`), but graphty-element's zoom-to-fit takes
   no inset or padding (`OrbitCameraController.ts` uses a fixed 5 percent), so no consumer can
   ask it to keep the graph clear of an overlay. A fix needs a new public option on the element
   (an owner decision). One of 15 families can be hidden from a participant reading sizes.

2. **element-defect (default 3D view) -- perspective still changes how big a dot looks.** Before
   any size binding, equal dots already differ on screen (B/02.png: the top-left dot at about
   531,83 and the one at 518,262 are larger than the one at 876,568; A/02.png likewise). After
   binding, PageRank differences dominate, but a mid-sized dot near the camera can read as more
   important than one farther away. A `meaning-wrong` risk for the "what do sizes stand for"
   answer; the camera no longer turns on its own (A/10 = A/11, B/09 = B/10).

3. **task-wording, not blocking -- nothing after the run says what PageRank measures.** The only
   explanation, "Which nodes are connected to other well-connected nodes.", shows in the Analyze
   list and the form (A/03.png, A/04.png). After Run every place reads "PageRank" (outline, Style,
   list, legend, "Made with"). A participant can name the sizes ("bigger = higher PageRank") from
   the screen, which the key accepts, but explaining it in their own words relies on memory of the
   form. The prompt's "depends on most" is not a word on screen, so it does not lure.

4. **app-defect, minor -- Florentine families' Values histogram is 15 equal bars** (B/09.png):
   one value per bin, so it reads as a uniform spread while the Top 10 runs from 0.1458 down to
   0.0613. It does not affect the task.

5. **answer-key, wording only.** The key's round 3 path says "not yet walked"; it is now walked
   and correct on this build, including the end state ("1 to 3", "Size: PageRank") and the
   chain-link recovery. Its round 3 "rank" step can be spelled out as `--key Shift+A`,
   `--type PageRank`, `--key Enter`, `--click "Run"`: Enter on the only Analyze entry now opens
   it (A/04.png), which it did not on the previous build.

## Fixed since the previous pilot of this task

Enter opens the only Analyze entry; runs are named by method everywhere; Size opens its list at
once; no legend entry for a constant size; the Color line's swatch matches the ramp; the drawing
does not turn on its own.
