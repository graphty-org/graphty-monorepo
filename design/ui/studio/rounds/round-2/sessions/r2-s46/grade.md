# Grade: session r2-s46 -- Grace (nonprofit operations analyst), T6 "What did I get?"

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Les Miserables from the start screen.
Graded from the last screenshot (08.png), the screenshots before it, the transcript and one
scripted re-run on the same build. No files were saved (no `downloads/`), and none were needed.
Never graded from Grace's own rating (6 of 7).

## Grade: S (success)

All four parts were read off the screen on the success path:

| Part | Grace's answer | On screen | Right? |
|---|---|---|---|
| Characters | 77 | Overview "Nodes 77" (03.png); Data > Sources "77 rows, 77 nodes" (06.png) | yes |
| Connections | 254 | Overview "Edges 254" (03.png); "254 rows, 254 edges" (06.png) | yes |
| Everyone reachable | yes, one connected piece | Overview "Components 1" (03.png) | yes |
| Recorded facts | characters `id`, `name`; connections `shared_chapters` | Data > Attributes (06.png) | yes |

- The path matches the reference: open the sample, read Values > Overview, open Data from the
  rail. Every answer came from those two screens. The clicks on `shared_chapters` (07.png) and on
  Valjean (08.png) were checks that confirmed what she already had; they did not change an answer.
- **Why S, not SD:** no wrong turn, and no answer depended on help. She hovered the cut-off "Edges
  per ..." row and read its tooltip ("Edges per node"), but that row is not one of the four
  answers. Her hover on "Components" returned no tooltip, so she read "Components 1" as "one
  connected piece" and checked it against the drawing (no loose dot). That reading is right, and
  it was made from the success path's own screen. The guess is a usability problem (problem 1
  below), not a difficulty in the task as graded.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no. The tool reported "Components" as ambiguous (the row and
  its label) and hovered the row, which is what a person points at.
- **Usage card:** declined ("No thanks", step 2).

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 7 in total; 5 up to the last answer on screen (step 6, 06.png) | 2-3 (plus "No thanks") |
| Wrong turns | 0 | -- |

The two hovers (steps 4 and 5) and the two confirming clicks (steps 7 and 8) were checks, not
wrong turns: nothing was undone or abandoned.

## False "done"

None. Grace says "Done" at step 8 with 08.png showing Valjean's id, name and Degree 36, and the
Data panel still listing id, name and shared_chapters. Every claim in her answers matches the
screens: 77 and 254 (03.png, 06.png), Components 1 (03.png), shared_chapters from 1 to 31, 17
distinct values, 100% filled (07.png). She also says, correctly, that Degree is computed by the
app and not recorded in the file.

Silent commits: none. Nothing was changed.

## Problems

Severity runs from 0 to 4 (Nielsen's scale); an opinion is held one level down. The build defect
was reproduced by `rounds/round-2/repro/r2-s46/repro.sh`, which replays the session's path and
hovers each unclear label. Its output is in `run/` and `run.log`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | "Components 1" is the only answer on screen to "can everyone reach everyone", and the word is network jargon with no tooltip or plain reading. Grace guessed it right from the drawing; on a graph too dense to check by eye, a newcomer has nothing to check against. "1 connected group" or "All connected" would answer the question as asked. The count itself is graphty-element's; the words are the app's. | Steps 3-4, 03.png, 04.png ("tooltip: null"). Repro: `run/04.png`, run.log. One participant (round 2 r2-s19 and r2-s23 also skipped this row as meaningless); unconfirmed as a misreading. |
| 2 | 2 | build-defect | The direction row of the Overview shows no label. Its value, "Undirected, from the file: directed 0", is too long for the row, pushes the label "Direction" (present only as the accessible name) out of view, and runs past the right edge of the panel (it ends at about x 1430 where every other value ends at 1416). The same row on every load. | Step 3, 03.png. Repro: `run/03.png`, `run/06.png`; run.log names the row `group "Direction Undirected, from the file: directed 0"`. |
| 3 | 1 | wording | "from the file: directed 0" reads like a count of zero or a raw flag. Grace "read it twice". It means the file said the graph is undirected. | Step 3, 03.png. |
| 4 | 1 | behavior | Labels cut off: "Edges per ..." in the Overview, "Les Mis...", "Node t..." and "Ed..." in Data > Sources. Each has a tooltip with the full name (repro `run/05.png`, `run/08.png` to `run/10.png`), so nothing is lost, but a reader must hover to read a row name in a panel with room to spare. | Steps 3, 5, 6; 03.png, 05.png, 06.png. |
| 5 | 1 | wording | The start screen says "77 characters"; the Overview says "Nodes" and "Edges". Grace matched them by the number (77 = 77). | Steps 1, 3; 01.png, 03.png. |
| 6 | 0 | opinion | "Density 0.08681" means nothing to this reader and would not go on a slide. | Step 3, 03.png. |
| 7 | 0 | opinion | "Degree" sits under a node's Summary beside the file's own id and name, with nothing to say that the app computed it. Grace worked it out from the 36 matching the Overview's top end. | Step 8, 08.png. |

A note on the repro: the tool's tooltip read-out lags after a hover that shows no new tooltip
(`run.log` prints the previous tooltip for the direction row and for "Node table"). The
screenshots, not those lines, are the evidence for problem 2.

What worked, for the record: opening the sample drew the network and filled the Overview with
the counts at once, so three of the four answers were on the first screen after one click. The
Data page showed the recorded columns grouped by Nodes and Edges like a spreadsheet's header
rows, with row counts that agree with the Overview. Clicking an attribute gave its range, fill
rate and distinct values. "Files are read on this computer and never uploaded" on the start
screen answered this persona's first worry before she asked it.
