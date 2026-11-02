# T76 B pilot (gauges): re-walk on build 797a4f6b47

Task: make the river network behave like the start screen's pointing effect -- with the pointer on a
gauge, every gauge not joined to it goes pale and its stretches stand out; with the pointer on no
gauge, everything looks as usual.

Build: 797a4f6b47 (/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-797a4f6b47).
Start: setup gauges-clean (11 gauges, 13 stretches). The data stayed 11 nodes and 13 edges on
every screen of both walks.

Walked: the success path by pointer, and the hand-built hover layers route (the four-layer recipe
built in the workspace, through the Which edges strip). Nothing crashed, blocked the task or gave a
wrong result.

## Success path by pointer -- reached

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success

Replayed the earlier route; every one of its 14 steps matched the screen on this build.

- Style layers "+" (Add a layer or a folder), Hover highlight: a folder "Hover highlight" of four
  layers (Halo, Its edges, Fade edges, Fade nodes) is added. Two steps, as the answer key says.
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/03.png)
- Pointer on gauge G02: G02 gets a halo, its three neighbors stay full, the other seven gauges
  and their stretches go pale, and its stretches are drawn dark. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/04.png)
- Pointer on empty canvas: the drawing as at rest, every layer count 0. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/05.png)
- Pointer on G08 and G11: the same effect around each. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/06.png, 15.png)
- The folder's Which nodes opens the workspace and Done closes it; Halo opacity takes 40, 60 and 50
  by Escape, Enter and Tab. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/09.png to 14.png)

No mismatch with the answer key.

## Hand-built hover layers (Which edges strip) -- reached

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11

The replay diverged at its first step only because the table no longer shows a "Which nodes"
column in its rows; the walk carried on by hand along the same route.

- + > Layer, renamed "Fade others", Which nodes, typed "within", Enter: "Within 2 hops of" with
  "Choose a reference". (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/03.png, 04.png)
- Reference "Hovered or selected", Hops 1, Except on: the step reads "Except Within 1 hop of
  Hovered or selected -- Passes none". (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/05.png)
- Done, Fill color, opacity 30: with the pointer on nothing the layer matches all 11 gauges and
  every gauge is pale at rest (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/11.png). This is what the rule says (except near
  nothing is everyone); the route then adds Condition... "While ... has nodes" with Hovered or
  selected, after which the layer matches 0 at rest. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/13.png, 14.png)
- Pointer on G02: 7 gauges pale, G02 and its 3 neighbors full. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/15.png)
- + > Layer "Its edges", Edge, Which edges, typed "touch", Enter: "Edges touching", reference
  Hovered or selected: 0 of 13 at rest. Done; Line > Color 1F2937.
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/17.png, 18.png, 19.png)
- Pointer on G02: the three stretches touching it drawn dark, 7 gauges pale; Which edges reads
  "3 of 13". Pointer away: everything as at rest, both layers 0.
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/22.png, 23.png)

## Notes (do not spoil grading)

- In the Which nodes and Which edges strips, a step's pass count is cut at the panel's right edge
  ("Passes non") when the step's text is long. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/06.png, 18.png)
- The Except step reads "Passes none" while the layer it belongs to matches 11 of 11 at rest; a
  person may read "none" as "nothing is faded" and miss that every gauge is pale until the While
  condition is added. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/06.png, 11.png)
