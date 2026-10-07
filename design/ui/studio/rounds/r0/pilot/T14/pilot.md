# Pilot: T14, stop for the day and come back

Piloted on 2026-10-06 against the production build in `graphty/dist` (graphty 0.8.53, commit
452285142, build stamp `452285142099`) at `/?next`, driven by `tool/real.mjs`, one live browser
session started from `rounds/pilot/T14/setup.txt`. The pilot of the earlier build (commit
9d6598eea) is kept beside this folder in `T14-build-9d6598e/`.

## Verdict

**End state reached.** The project was saved under a chosen name, closed, and reopened from
Recent projects on the start screen, both straight away and after closing the tab and opening the
app again. The drawing came back in the same arrangement, with the Influence row, its orange
colors, the key "Color: Influence 0.003299 - 0.07543", the character names and the label line
"77 labels, 7 hidden to avoid overlap". One thing is still lost on a reopen: the Influence row's
count, "77". The answer key already grades "everything came back except the number beside
Influence" as a match, so this does not block the task.

## What was walked

| Step | Screenshot | What happened |
| ---- | ---------- | ------------- |
| setup start | `01.png` | The setup ran whole. Rows: Selection, Influence (77), Everything (selected; the inspector header now reads just "Everything"); orange nodes; key "Color: Influence 0.003299 - 0.07543"; names drawn; label line "Abc name", "77 labels, 7 hidden to avoid overlap". |
| `--key Control+s` | `02.png` | "Save Les Miserables as" dialog, Name "Les Miserables" prefilled and selected, hint "Choose where the file goes next. Later saves write the same file." |
| `--type "Les Mis day one"`, `--key Enter` | `03.png` | The save picker took the name; a 29,853-byte project file was written (`saved/Les Mis day one.graphty.json`). The header reads "Les Mis day one"; notice "Saved as Les Mis day one". |
| click "Les Mis day one" (the project name) | `04.png` | The project menu: Rename, Open project or file..., Save, Export..., Save as..., Close project. |
| click "Close project" | `05.png` | The start screen, no "discard changes" question. Recent projects lists "Les Mis day one", 77 nodes, Oct 6, 2026, 4:27 PM. |
| click "Les Mis day one" | `06.png` | Reopened, notice "Opened Les Mis day one". Same drawing, same arrangement, orange colors, key and names. The Influence row shows its ramp but **no "77"**. The inspector shows the Graph overview (77 nodes, 254 edges). |
| click "Influence" | `07.png` | The run's values are back: 77 of 77 have a value, 0.003299 to 0.07543, median 0.01242; Top 10 led by Valjean 0.07543, Myriel 0.04278; Made with: Influence, ran Oct 6, Damping Factor 0.85. |
| click "Everything" | `08.png` | The label line is back: "Abc name", "77 labels, 7 hidden to avoid overlap". |
| close the tab and open the app again (`--reopen`) | `09.png` | The start screen in a new tab; Recent projects still lists "Les Mis day one" (4:28 PM, the last time it was opened). |
| click "Les Mis day one" | `10.png` | Same as `06.png`: everything back, the Influence row again without its count. |

The answer key's path (Control+s, type a name, Enter, project menu > Close project, the name under
Recent projects) works as written, in 5 steps.

## Blockers

None block the end state. One defect remains visible in it, unchanged from the earlier build:

1. **graphty-element: a reopened run has no summary, so the Influence row loses its count.**
   Before the save the row reads "Influence 77" (`01.png`); after each reopen it reads "Influence"
   with only the ramp (`06.png`, `10.png`). The app shows the count the element publishes for a
   run (`graphty/src/workspace/graph-place/rows.ts` line 111, `count: summary?.measured`). When a
   project opens, `graphty-element/src/session/projectFile.ts` (lines 1070-1092) hands each saved
   result back to its run as an outcome with `result`, `caveats` and `fields` but no `summary`, so
   `Run.finishWork` (`graphty-element/src/session/runs/Run.ts` line 1102) stores an undefined
   summary. The saved file holds the numbers, so nothing is lost on disk; passing the restored
   result's summary in that outcome would fix it. Any summary-driven reading of a reopened run is
   affected the same way, including a partition's group counts.

## For the answer key

The key's T14 entry already covers what this pilot saw: the missing count is graded as a match,
the Graph overview after a reopen is a selection and not lost work, and closing the tab is an
accepted path (`09.png`, `10.png`). Nothing needs changing.

## Other observations (not blockers)

- After the save the tool reported "the drawing is still moving", but the drawing in `02.png` and
  `03.png` is the same; the only change is the "Saved as" notice appearing. Likely the notice
  tripped the tool's motion check.
- After the save, focus lands on the Analyze button in the bottom toolbar (its tooltip "Analyze
  Shift+A" shows in `03.png`), not back where the reader was.
- After the save the outline header still reads "Graph Les Miserables" while the header reads "Les
  Mis day one" (`03.png` onward). That is the graph's name versus the project's name, but a reader
  who just named the work may wonder why the old name stays.
- The Everything row's Fill swatch is purple "#63..." (`01.png`, `09.png`) while every node is
  orange, because the Influence row paints over it.
- The Graph overview's direction line is cut off at the panel edge: `Undirected, from the file:
  "directed": f` (`06.png`, `10.png`).
- The reopened drawing matches the saved one to within a few pixels (for example "Old Man" at
  y 630 before, 633 after), so the layout seed holds across a save and reopen.
