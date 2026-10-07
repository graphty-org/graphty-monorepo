# Pilot: T14, stop for the day and come back

Piloted on 2026-10-06 against the production build in `graphty/dist` (graphty 0.8.53, commit
9d6598eea, no uncommitted changes) at `/?next`, driven by `tool/real.mjs`, one live browser
session started from `rounds/pilot/T14/setup.txt`.

## Verdict

**End state reached.** The project was saved under a chosen name, closed, and reopened from
Recent projects on the start screen, both straight away and after closing the tab and opening the
app again. The drawing came back in the same arrangement, with the Influence row, its orange
colors, the key "Color: Influence 0.003299 - 0.07543" and the character names. A participant
who says "everything came back" is right in every respect they can check, with one small loss:
the Influence row no longer shows its count, "77", after the reopen. That loss does not block the
task, but a careful participant comparing the row before and after may report it, so the answer
key should say how to grade that (see below).

## What was walked

| Step | Screenshot | What happened |
| ---- | ---------- | ------------- |
| setup start | `01.png` | The setup ran whole. Rows: Selection, Influence (77), Everything; orange nodes; key "Color: Influence 0.003299 - 0.07543"; names drawn; the label line reads "77 labels, 7 hidden to avoid overlap". This is the intended starting state. |
| `--key Control+s` | `02.png` | "Save Les Miserables as" dialog, Name prefilled and selected, hint "Choose where the file goes next. Later saves write the same file." |
| `--type "Les Mis day one"`, `--key Enter` | `03.png` | The save picker took the name; a 29,853-byte project file was written (`saved/Les Mis day one.graphty.json`). The header now reads "Les Mis day one", and a notice says "Saved as Les Mis day one". |
| click the project name | `04.png` | The project menu: Rename, Open project or file..., Save, Export..., Save as..., Close project. |
| click "Close project" | `05.png` | The start screen, with no "discard changes" question (the work was saved). Recent projects lists "Les Mis day one", 77 nodes, Oct 6, 2026, 1:51 PM. |
| click "Les Mis day one" | `06.png` | Reopened, notice "Opened Les Mis day one". Same drawing in the same arrangement, orange colors, key and names. The Influence row shows its color ramp but **no "77"**. The panel on the right shows the Graph overview (77 nodes, 254 edges). |
| click "Influence" | `07.png` | The run's values are all there: 77 of 77 have a value, 0.003299 to 0.07543, Top 10 led by Valjean 0.07543, Myriel 0.04278; Made with: Influence, ran Oct 6, damping factor 0.85. |
| click "Everything" | `08.png` | The label line is back: "Abc name", "77 labels, 7 hidden to avoid overlap". |
| close the tab and open the app again (`--reopen`) | `09.png` | The start screen in a new tab; Recent projects still lists "Les Mis day one" (time now 1:52 PM, the last time it was opened). |
| click "Les Mis day one" | `10.png` | Same as `06.png`: everything back, the Influence row again without its count. |

The path in the answer key (5 steps: Control+s, type a name, Enter, project menu > Close project,
click the name under Recent projects) works as written.

## Blockers

None block the end state. One defect is visible in it:

1. **graphty-element: a reopened run loses its summary, so the Influence row loses its count.**
   Before the save the row reads "Influence 77" (`01.png`); after a reopen it reads "Influence"
   with only the ramp (`06.png`, `10.png`). The app shows the count the element publishes for a
   run (`graphty/src/workspace/graph-place/rows.ts`, `count: summary?.measured`). When a project
   opens, `graphty-element/src/session/projectFile.ts` (about line 1069) hands each saved result
   back to its run as a canned outcome with `result`, `caveats` and `fields` but no `summary`, so
   `Run.finishWork` sets `summaryValue` to undefined and the run's record has no `summary`. The
   saved file does hold the numbers (`measured: { nodes: 77, edges: 254 }`, `graph.measured: 77`),
   so nothing is lost on disk; the fix is to pass the restored result's `summary()` in that
   outcome. Every summary-driven reading of a reopened run is affected the same way, including a
   partition's group counts.

## For the answer key (not blockers)

- "The run, its colors and the names are back" should be checked as: an "Influence" row, orange
  nodes with the key "Color: Influence 0.003299 - 0.07543", and names drawn with the Everything
  row's label line "Abc name". Until the count defect is fixed, a participant who says "it all
  came back except the number next to Influence" is right, and counts as a match, not as
  `lost-state`.
- After the reopen the panel on the right shows the Graph overview rather than the Everything
  row that was selected before closing. That is a selection, not work, and should not count as
  lost.
- Closing the tab and opening the app again works with this tool (`--reopen`, `09.png`,
  `10.png`), so a participant who closes the tab is on an accepted path.

## Other observations

- After the save step the tool reported "the drawing is still moving (the canvas kept changing
  for a second with no input)", but the drawing in `02.png` and `03.png` is identical; the only
  change is the "Saved as" notice appearing over the canvas. Probably a false report from the
  notice, not a moving drawing. The drawing kept the same orientation in every screenshot of this
  session, and reopened in the same arrangement, so the layout seed holds across a save and a
  reopen.
- After the save closes the dialog, keyboard focus lands on the Analyze button in the bottom
  toolbar (its tooltip "Analyze Shift+A" is showing in `03.png`), not back where the reader was.
- The Everything row's Fill shows a purple color "#63..." (`01.png`, `08.png`) while every node
  is orange, because the Influence row paints over it. A reader may not see why the swatch and
  the drawing disagree.
- The Graph overview's direction line is cut off at the panel edge: `Undirected, from the file:
  "directed": f` (`06.png`, `10.png`).
