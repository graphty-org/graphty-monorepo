# Pilot: T9, bigger dots for the ones that matter

Build under study: commit 452285142, build 452285142099 graphty@0.8.53, opened at `/?next`.
Sessions: `A/` (Les Miserables, 13 screenshots) and `B/` (Florentine families, 7 screenshots).
No script errors, `console.error` lines or failed requests were printed in either session, and
neither session log holds an error. The pilot of the earlier build (commit 9d6598eea) is kept in
`prev-9d6598eea/`.

## Result

The end state is reached on both datasets: a PageRank run, a Size line on its result row bound to
the result ("1 to 3"), dots that visibly differ, and a legend reading "Size: Influence" above
"Color: Influence", each with the value range (A/11.png, B/05.png). The Values tab then lists the
top 10 and "Made with -- Analysis: Influence" (A/12.png, B/06.png). The drawing held still for 3
seconds after the end state (A/12 against A/13, B/06 against B/07).

The answer key's path works exactly as written, including `--click "PageRank"` (A/04.png); the
keyboard pick with Enter works too (B/03.png).

## Path (Les Miserables)

| # | Step | Screenshot | What happens |
|---|---|---|---|
| 1 | `--start empty` | A/01.png | Start page, four samples on the right, usage card at the bottom |
| 2 | `--click "No thanks" --click "Les Miserables"` | A/02.png | Sample opens: 77 nodes, 254 edges, all blue, no arrowheads |
| 3 | `--key Shift+A --type PageRank` | A/03.png | Analyze popover, one result "PageRank -- Start here" |
| 4 | `--click "PageRank"` | A/04.png | PageRank form (damping 0.85) with Run |
| 5 | `--click "Run"` | A/05.png | Row "Influence" (77) appears; dots turn orange, the highest dark brown; legend "Color: Influence 0.003299 .. 0.07543" |
| 6 | `--click "Influence"` | A/06.png | The row's Values tab: histogram, Top 10, Made with |
| 7 | `--click "role=tab:Style"` | A/07.png | Style tab: Color = Influence with an orange swatch; Shape + |
| 8 | `--click "Add to Shape"` | A/08.png | Menu: Size, Shape |
| 9 | `--click "Size"` | A/09.png | Size line, fixed value 1, with a link icon; the legend is unchanged |
| 10 | `--hover "Size by attribute"` | A/10.png | Tooltip "Size by attribute" |
| 11 | `--click "Size by attribute"` | A/11.png | Picker: Influence, Influence rank, Influence percentile; id and name disabled ("Cannot be used: Holds groups, not amounts") |
| 12 | `--click "role=option:Influence"` | A/12.png | Size reads "1 to 3"; dots differ in size; legend gains "Size: Influence" on top |
| 13 | `--click "role=tab:Values" --wait 3000` | A/13.png | Top 10: Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; drawing unchanged |

Florentine families: B/02 (open), B/03 (Analyze, Enter), B/04 (Run), B/05 (row, Style, Add to
Shape, Size: fixed 1), B/06 (Size by attribute, Influence: "1 to 3"), B/07 (Values, wait). Range
0.03066 to 0.1458; top 3 Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881.

## Remaining blockers and findings

None of these stops the end state. The first two put the "what do the sizes mean" answer at risk.
All were already seen on the earlier build; none is fixed on this one.

1. **App defect -- the legend card hides a family on Florentine families.** The family at about
   531,83 is fully visible before the run (B/02.png, B/03.png) and sits under the legend card from
   the run on (B/04.png to B/07.png; only a sliver at about 547,85 shows once the card grows to two
   entries in B/06.png). One of 15 families can no longer be seen or compared by size. The card is
   the app's overlay at the top left of the canvas, and the camera frames the graph against the
   whole canvas. Either the app places the card where it does not cover the framed graph, or
   graphty-element needs a way to frame the graph inside part of the canvas (its `zoomToFit()`
   takes no inset today), which would be a public API change. On Les Miserables no node is
   covered (A/12.png), but the card's right edge touches the dot at 562,90.

2. **Element default -- perspective changes how big a dot looks.** The drawing is 3D with
   perspective. Before size is bound, dots of equal size already differ: about 18 px radius at
   531,83 against about 10 px at 876,568 (B/02.png). After binding, depth still adds to or
   subtracts from the bound size: in B/06.png the dot at 518,261 looks bigger than the one at
   876,568 though both sit near the low end of the ramp. "Bigger means more Influence" is only
   roughly true on screen (`meaning-wrong` risk). Needs a decision before round 1: open the samples
   in 2D or without perspective, or accept the confound and tell graders.

3. **Task wording / answer key -- the word "PageRank" leaves the screen after the run.** The
   participant picks "PageRank", but the result row, the inspector header ("Influence, Measure
   from Influence, Oct 6"), the Style tab, the attribute picker, both legend entries and "Made
   with -- Analysis" all say "Influence" (A/05 to A/13). The PageRank help line ("Which nodes are
   connected to other well-connected nodes") shows only in the form before the run (A/04.png).
   The key already accepts "Influence"; graders should expect answers that name the word but not
   what it measures. The header's "from Influence" names the row after itself and says nothing
   about where the values came from.

4. **Observation -- the tool printed "the drawing is still moving" right after Run** on Florentine
   families only (B/04.png): the canvas changed for about a second as the colors were repainted,
   then held still (B/05 onward). Not seen on Les Miserables this time (A/05.png). Not a defect a
   participant would notice; recorded so graders do not read it as a turning camera.

5. **App defect, minor -- the "Label" heading in the Style tab is drawn unlike its siblings.** Fill,
   Shape, Effects and Tooltip are small headings; Label is larger and indented (A/07.png), and once
   size is bound it shows as a highlighted chip (A/12.png, B/06.png). Does not affect T9.

6. **App or element defect, minor -- the Values histogram on Florentine families is 15 equal
   bars** (B/07.png): with 15 values each bar holds one family, so the chart hides that Medici
   (0.1458) is far from the rest. Les Miserables' chart is fine (A/13.png).

7. **Element observation, minor -- large spheres are visibly faceted.** The Medici sphere at size 3
   shows flat facets and a white triangular highlight (B/06.png, about 700,378). Cosmetic.

8. **App defect, minor -- the overview row "Edges per n..." is cut off** (B/02.png; "Edges per
   ..." in A/02.png), with no way to read the full name on screen.

## Answer key

- The path runs as written; no correction needed. `--key Enter` in place of
  `--click "PageRank"` also works.
- Step count: the key's "about 9 steps, 11 commands" holds; this walk used 12 commands on Les
  Miserables because it hovered the link icon once and opened the row's Values tab separately.
- Reference values (unchanged from the earlier build): Les Miserables range 0.003299 to 0.07543,
  top 3 Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 (A/13.png); Florentine range 0.03066 to
  0.1458, top 3 Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881 (B/07.png).
- Screen-reader check: the Size line reads "1 to 3"; the legend's size entry text is
  "Size: Influence 0.003299 0.07543" (A/12.png). Confirm against the accessibility tree in the
  rehearsal.
