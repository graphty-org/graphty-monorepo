# T76 B pilot (gauges): re-walk on build f0a9a014cb

Task: make the river network behave like the start screen's pointing effect -- with the pointer on a
gauge, every gauge not joined to it goes pale and its stretches stand out; with the pointer on no
gauge, everything looks as usual.

Build: f0a9a014cb (/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-f0a9a014cb).
Start: setup gauges-clean (11 gauges, 13 stretches). The data stayed 11 nodes and 13 edges on
every screen of both walks.

Walked: the success path by pointer, and the one route on the re-walk list that belongs to this
task, the hand-built hover layers (the four-layer recipe built in the workspace, through the Which
edges strip). Every step of both routes replayed against the earlier walks and matched the screen.
Nothing crashed, blocked the task or gave a wrong result.

## Success path by pointer -- reached

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success

- Style layers "+" (Add a layer or a folder), Hover highlight: a folder "Hover highlight" of four
  layers is added. Two steps, as the answer key says. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/03.png)
- Pointer on gauge G02: G02 gets a halo, its three neighbors stay full, the other seven gauges
  and their stretches go pale, and its three stretches are drawn dark. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/04.png)
- Pointer on empty canvas: the drawing as at rest, every count 0. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/05.png)
- Pointer on G08 and G11: the same effect around each (G11: Halo 1, Its edges 2, Fade nodes 8).
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/06.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/15.png)
- The folder's Which nodes opens the workspace and Done closes it; Halo opacity takes 40, 60 and 50
  by Escape, Enter and Tab. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/09.png to 14.png)

No mismatch with the answer key.

## Hand-built hover layers (Which edges strip) -- reached

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11

- + > Layer "Fade others", Which nodes "Within 1 hop of Hovered or selected" with Except on.
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/05.png)
- Done, Fill color, opacity 30: with the pointer on nothing the layer matches all 11 gauges, as the
  rule says (except near nothing is everyone). (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/11.png) A While "Hovered or selected"
  condition then makes it match 0 at rest. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/14.png)
- + > Layer "Its edges", Edge, Which edges "Edges touching Hovered or selected", Line color 1F2937.
- Pointer on G02: its three stretches drawn dark, 7 gauges pale; Which edges reads "3 of 13".
  Pointer away: everything as at rest, both layers 0. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/22.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/23.png)

## Notes (do not spoil grading)

- In the inspector's Which nodes outline a step's pass count is cut at the panel's right edge
  ("Passes nor") and the inspector scrolls sideways. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/11.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/touched-11/14.png)
- Tab out of Halo opacity lands on its link button, whose tooltip "Node halo opacity by attribute"
  stays up and covers the line under the field. (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76B/success/14.png)
