# Pilot: T9, bigger dots for the ones that matter

Build under study: commit 9d6598eea, build 9d6598eea3e9 graphty@0.8.53, opened at `/?next`.
Sessions: `A/` (Les Miserables, 13 screenshots) and `B/` (Florentine families, 8 screenshots).
No script errors, `console.error` lines or failed requests were printed in either session.

## Result

The end state is reached on both datasets: a PageRank run, a Size line on its result row bound to
the result ("1 to 3"), dots that visibly differ, and a legend reading "Size: Influence" above
"Color: Influence", each with the value range (A/11.png, B/06.png). The Values tab then lists the
top 10 and "Made with -- Analysis: Influence" (A/12.png, B/07.png). The drawing held still for 3
seconds after the end state (A/12 against A/13, B/07 against B/08).

The answer key's path works exactly as written, and the T7 keyboard step works too: Enter picks
the only Analyze result. Walked from the empty app it takes 9 steps.

## Path (Les Miserables; Florentine is the same)

| #   | Step                                                         | Screenshot         | What happens                                                                                                                                             |
| --- | ------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `--start empty`                                              | A/01.png           | Start page, four samples listed on the right                                                                                                             |
| 2   | `--click "No thanks" --click "Les Miserables"`               | A/02.png           | Sample opens: 77 nodes, 254 edges, all blue, no arrowheads                                                                                               |
| 3   | `--key Shift+A --type PageRank`                              | A/03.png           | Analyze popover, one result "PageRank -- Start here"                                                                                                     |
| 4   | `--key Enter`                                                | A/04.png           | PageRank form (damping 0.85) with Run                                                                                                                    |
| 5   | `--click "Run"`                                              | A/05.png           | Row "Influence" (77) appears; dots turn orange; legend "Color: Influence 0.003299 .. 0.07543"                                                            |
| 6   | `--click "Influence" --click "role=tab:Style"`               | A/06.png           | The row's Style tab: Color = Influence with an orange swatch; Shape +                                                                                    |
| 7   | `--click "Add to Shape"`                                     | A/07.png           | Menu: Size, Shape                                                                                                                                        |
| 8   | `--click "Size"`                                             | A/08.png           | Size line, fixed value 1, with a link icon; the legend is unchanged                                                                                      |
| 9   | `--hover "Size by attribute"`, `--click "Size by attribute"` | A/09.png, A/10.png | Tooltip "Size by attribute"; picker: Influence, Influence rank, Influence percentile; id and name disabled ("Cannot be used: Holds groups, not amounts") |
| 10  | `--click "role=option:Influence"`                            | A/11.png           | Size reads "1 to 3"; dots differ in size; legend gains "Size: Influence"                                                                                 |
| 11  | `--click "role=tab:Values"`, `--wait 3000`                   | A/12.png, A/13.png | Top 10: Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; drawing unchanged after the wait                                                              |

Florentine families: B/02 (open), B/03 (Analyze + Enter), B/04 (Run), B/05 (row, Style, Add to
Shape, Size), B/06 (Size by attribute, Influence), B/07 and B/08 (Values, wait). Range 0.03066 to
0.1458; top 3 Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881.

## Fixed since the previous pilot

- Enter now opens the only Analyze result (A/04.png, B/03.png).
- The drawing no longer turns on its own (A/12 against A/13; B/07 against B/08).
- Adding Size with its fixed value no longer puts a "Size" entry in the legend (A/08.png, B/05.png),
  so a participant who stops there is not shown a false "Size: Influence".
- The Color line's swatch is orange, matching the dots (A/06.png).
- An undirected graph is drawn without arrowheads (A/02.png, B/02.png).

## Remaining blockers and findings

None of these stops the end state. Two put the "what do the sizes mean" answer at risk.

1. **App defect -- the legend hides part of the drawing.** On Florentine families the family at
   about 531,83 is fully visible before the run (B/02.png, B/03.png) and sits under the legend card
   from the run on (B/04.png to B/08.png): one of 15 families can no longer be seen or sized by
   eye. The legend is the app's overlay card at the top left of the canvas; the camera frames the
   graph against the whole canvas. Either the app places the card where it does not cover the
   framed graph, or, if the card must stay over the canvas, graphty-element needs a way to frame
   the graph inside part of the canvas (its `zoomToFit()` takes no inset today), which would be an
   element change.

2. **Element default -- perspective still changes how big a dot looks.** The drawing is 3D with
   perspective. Before size is bound, dots of equal size already differ visibly: the top-left
   family (about 531,83, radius about 18 px) against the one at 876,568 (about 10 px) in B/02.png;
   in A/02.png the dot at 562,90 against the one at 520,288. After binding, depth still adds to or
   subtracts from the bound size, so "bigger means more Influence" is only roughly true on screen.
   This is a confound for a task whose answer is read off dot sizes (`meaning-wrong` risk). Needs a
   decision before round 1: open the samples in 2D or without perspective, or accept the confound
   and tell graders.

3. **Task wording / answer key -- the word "PageRank" leaves the screen after the run.** The
   participant picks "PageRank", but the result row, the Style tab, the attribute picker, both
   legend entries and "Made with -- Analysis" all say "Influence" (A/05 to A/12). The PageRank help
   line ("Which nodes are connected to other well-connected nodes") is shown only before the run
   (A/04.png). The key already accepts "Influence"; nothing on screen after the run says what
   Influence measures, so graders should expect answers that name the word but not the meaning.

4. **Observation -- the tool reports "the drawing is still moving" right after Run** on both
   datasets (A/05.png, B/04.png): the canvas changed for about a second as the colors were
   repainted, then held still. Not a defect a participant would notice; recorded so graders do not
   read it as the old turning camera.

5. **App defect, minor -- the "Label" heading in the Style tab is drawn unlike its siblings.** Fill,
   Shape, Effects and Tooltip are small headings; Label is larger and indented (A/06.png), and after
   size is bound it shows as a highlighted chip (A/11.png, B/06.png). It does not affect T9.

6. **App or element defect, minor -- the Values histogram on Florentine families is 15 equal bars**
   (B/07.png): with 15 values each bar holds one family, so the chart says nothing about the
   distribution (Medici at 0.1458 is far from the rest, which the bars hide). Les Miserables' chart
   is fine (A/12.png). Not a T9 blocker.

7. **Element observation, minor -- large spheres are visibly faceted.** The Medici sphere at size 3
   shows flat facets and a broken highlight (B/06.png, about 700,378). Cosmetic.

8. **App defect, minor -- the overview row "Edges per n..." is cut off** (B/02.png; "Edges per ..."
   in A/02.png) with no way to read the full name on screen.

## Answer key

- The path runs as written; no correction needed. Optionally replace `--click "PageRank"` with
  `--key Enter` (both work).
- Reference values from this pilot: Les Miserables range 0.003299 to 0.07543, top 3 Valjean
  0.07543, Myriel 0.04278, Gavroche 0.03577 (A/12.png); Florentine range 0.03066 to 0.1458, top 3
  Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881 (B/07.png).
- Screen-reader check: the Size line reads "1 to 3"; the legend's size entry text is
  "Size: Influence 0.003299 0.07543" (A/11.png). Confirm against the accessibility tree in the
  rehearsal.
