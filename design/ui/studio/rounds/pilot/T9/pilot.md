# Pilot: T9, bigger dots for the ones that matter

Build under study: commit a1e6b91ff, build 0196d46212aa graphty@0.8.53, opened at `/?next`.
Sessions: `A/` (Les Miserables, 14 screenshots) and `B/` (Florentine families, 6 screenshots).
No script errors, `console.error` lines or failed requests were printed in either session.

## Result

The end state is reached on both datasets: a PageRank run, a Size line on its result row bound
to the result ("1 to 3"), dots that visibly differ, and a legend reading "Size: Influence" and
"Color: Influence" with the value range (A/12.png, B/06.png).

The answer key's path does not work as written, though. It needs three corrections, listed under
"Answer key" below. Walked as corrected, it takes 9 steps from the empty app.

## Path that works (Les Miserables; Florentine is the same)

| # | Step | Screenshot | What happens |
|---|---|---|---|
| 1 | `--start empty` | A/01.png | Start page, samples listed on the right |
| 2 | `--click "No thanks" --click "Les Miserables"` | A/02.png | Sample opens, 77 nodes, 254 edges, all blue |
| 3 | `--key Shift+A --type PageRank` | A/03.png | Analyze popover, one result "PageRank -- Start here" |
| 4 | `--key Enter` | A/04.png | Nothing happens |
| 5 | `--key ArrowDown --key Enter` | A/05.png | Nothing happens |
| 6 | `--click "PageRank"` | A/06.png | PageRank form (damping 0.85) with Run |
| 7 | `--click "Run"` | A/07.png | A row named "Influence" (77) appears; dots turn orange; legend "Color: Influence 0.003299 .. 0.07543" |
| 8 | `--click "Influence" --click "role=tab:Style"` | A/08.png | Row's Style tab: Color = Influence; Shape + |
| 9 | `--click "Add to Shape"` | A/09.png | Menu: Size, Shape |
| 10 | `--click "Size"` | A/10.png | Size line, fixed value 1, with a link icon |
| 11 | `--click "Size by attribute"` | A/11.png | Attribute picker: Influence, Influence rank, Influence percentile; id and name disabled ("Holds groups, not amounts") |
| 12 | `--click "role=option:Influence"` | A/12.png | Size reads "1 to 3"; dots differ in size; legend gains "Size: Influence" |
| 13 | `--click "role=tab:Values"` | A/13.png | Top 10: Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; "Made with -- Analysis: Influence" |

Steps 4 and 5 are the detour; without them the path is 9 steps (B/02 to B/06 is the same path
in 5 tool calls).

## Blockers and findings

1. **App defect -- Enter does not choose the only Analyze result.** After typing "PageRank" the
   list shows one entry, but Enter (A/04.png) and ArrowDown then Enter (A/05.png) do nothing; only
   a click opens it (A/06.png). This also breaks the T7 path the T9 key refers to
   (`--key Enter` after `--type PageRank`), and the keyboard-only path.

2. **Task wording / meaning risk -- the run is renamed "Influence" and the word "PageRank" leaves
   the screen.** The participant picks "PageRank", but the result row, the Style tab, the
   attribute picker, the legend and "Made with -- Analysis" all say "Influence" (A/07, A/11, A/13).
   A participant asked "what do the sizes stand for" can only answer "Influence", which is
   probably acceptable, but graders need the key to say that "Influence" counts as naming the
   ranking. The help line "Which nodes are connected to other well-connected nodes" is shown
   only before the run (A/06), so after it nothing on screen explains what Influence measures.

3. **graphty-element or app default -- the drawing is 3D with perspective and keeps turning.**
   With no input the drawing rotates between screenshots (A/13.png and A/14.png, a 3-second
   wait, show a different view), and on Florentine families part of the graph turns out of the
   frame (B/03.png, a node clipped at the right edge). Depth also changes how big a dot looks:
   before size was bound, equal-size dots already differ visibly (B/05.png, the dot at about
   370,700 against the one at 840,337). For a task whose answer is "bigger means more important",
   perspective size is a confound a participant can misread (`meaning-wrong`). Worth a decision
   before round 1: open samples in 2D or without perspective for this task, or accept the
   confound and say so in the key.

4. **App defect -- the legend shows a nonsense entry for a constant size.** Right after "Size"
   is added with its fixed value 1, the legend reads "Size: Influence -- Influence - Node Colour
   1" (A/10.png, B/05.png): an entry for a size that does not vary, with an internal layer name
   and British spelling. It goes away once size is bound (A/12.png). A participant who stops at
   step 10 sees a "Size: Influence" legend while every dot is the same size -- a ready-made false
   "done" (`stopped-at-toggle`).

5. **App defect -- the legend covers part of the drawing.** The legend box at the top left of the
   canvas sits over nodes and edges (A/14.png top left; B/06.png, a node at about 520,135 is
   hidden under it), and the camera does not frame around it.

6. **App defect, minor -- the Color line's swatch is gray.** The Color line says "Influence" with
   a gray swatch while the dots are an orange ramp (A/08.png, B/05.png).

7. **Observation -- the Color ramp barely separates values.** Before size is bound almost every
   dot is the same orange (A/07.png); only the very top ranks are visibly darker. Colors still
   "stand for Influence" per the legend, so it does not block the task.

8. **Observation -- the drawing has arrowheads on an undirected graph.** The overview says
   "Undirected" but edges are drawn with arrowheads (A/02.png, B/02.png). It may mislead the
   participant's reading of the picture; it does not block T9.

## Answer key corrections

- "run PageRank as in T7": the T7 step `--key Enter` does nothing on this build; use
  `--click "PageRank"` (or record the Enter failure as a build defect).
- "select its row": the row is named **Influence**, not PageRank: `--click "Influence"`.
- "pick PageRank": the attribute is **Influence**, and the picker's group heading is also
  "Influence", so the step is `--click "role=option:Influence"`; a plain `--click "Influence"`
  in the open picker is ambiguous.
- Step count: 9 from the empty app (start, open sample, Analyze + type, click PageRank, Run,
  select row + Style, Add to Shape, Size, Size by attribute + pick). Fix it at "about 9".
- Success wording: state that answering "Influence" for both size and color meets "says what a
  bigger dot means and what the colors stand for".
- Reference values (from this pilot): Les Miserables PageRank top 3 Valjean 0.07543, Myriel
  0.04278, Gavroche 0.03577 (A/13.png); range 0.003299 to 0.07543. Florentine PageRank range
  0.03066 to 0.1458 (B/06.png).
- Screen-reader check: the Size line's name is "Size" with value "1 to 3"; the legend's size
  entry text is "Size: Influence 0.003299 0.07543" (A/12.png). Confirm against the accessibility
  tree in the rehearsal.
