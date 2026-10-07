# Pilot: T12, one character and who he is tied to

Build under study: graphty@0.8.53 (build stamp 452285142099), commit 452285142, opened at
`/?next`, 1440 x 900. Both datasets were walked: Les Miserables (prompt A) in this folder,
Florentine families (prompt B) in `B/`. No script error, console error or failed request was
printed at any step. The run on the earlier build (commit 9d6598eea) is kept in
`build-9d6598eea/`; this build walks the same way.

## Verdict

The end state is reached for both prompts by the answer key's six-step path, with no detour.

- A: `09.png` reads "Javert's 17 connections" and lists Babet, Bamatabois, Claquesous, Cosette,
  Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice,
  Thenardier, Toussaint, Valjean, Woman1, Woman2: the answer key's set and spelling, alphabetical,
  no chapter counts.
- B: `B/08.png` reads "Medici's 6 connections" and lists Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni. Matches the answer key exactly. `B/03.png` shows 15 nodes and 20 edges.

Nothing blocks the task. The items under "Remaining problems" are risks for participants.

## Steps walked (A)

| Step | Screenshot | What the screen shows |
| --- | --- | --- |
| start, empty | `01.png` | Start screen, samples list, usage-data card |
| `--click "No thanks"` | `02.png` | Card replaced by "Usage data stays off. Change this in Settings > Privacy" |
| `--click "Les Miserables"` | `03.png` | 77 nodes, 254 edges drawn and fitting the canvas; Graph overview on the right |
| `--key /` | `04.png` | Find box focused |
| `--type Javert` | `05.png` | Elements: "Javert"; Values: "Select where name is Javert (1)" |
| `--key ArrowDown` | `06.png` | Javert row highlighted |
| `--key Enter` | `07.png` | Javert selected and ringed; Summary: id, name, Degree 17; find box cleared, focus ring on the Summary rows |
| `--hover "Degree"` | `08.png` | Row highlights; `tooltip: null` |
| `--click "Degree"` | `09.png` | End state: 17 names; Javert and his 17 neighbors ringed; Selection 18 |
| `--click "Valjean"` (in the list) | `10.png` | Valjean selected, Degree 36: names in the list are working links |
| `--key Escape` | `11.png` | Selection cleared; Graph overview back |

## Steps walked (B)

`B/01.png` and `B/02.png` are byte-identical to A's. `B/03.png` opens Florentine families;
`B/04.png` to `B/06.png` focus the find box, type Medici and highlight the one result; `B/07.png`
shows Medici selected, Degree 6, focus on the Summary rows; `B/08.png` is the end state above.

## Remaining problems (none blocks T12)

1. **App: the Degree row has no affordance.** It is the only way to the named list, yet it looks
   like a plain read-only value: no tooltip (`08.png`), no link styling or chevron (`07.png`,
   `B/07.png`). Expect some participants to stop at "Degree 17" (a count with no names) or fall
   back on the Edges table. Watch the first sessions.
2. **App: the Selection count is one more than the neighbor count.** After the Degree click the
   left rail reads "Selection 18" (`09.png`) and "7" (`B/08.png`), because the center node is
   selected with its neighbors, while the heading says 17 or 6. A participant who reads the rail
   will answer 18 or 7. Grade against the heading.
3. **App or graphty-element: picking a node from the find box pans the drawing off screen.**
   Before the pick the whole drawing fits (`03.png`, `B/03.png`); after Enter the camera centers
   on the node and the bottom of the drawing falls behind the toolbar and the window edge
   (`07.png` to `11.png`, `B/07.png`, `B/08.png`), and clearing the selection does not bring it
   back (`11.png`). Not needed for success, which reads names from the list.
4. **App: the graph overview prints the file's raw direction statement in an unlabeled row.**
   Every overview (`03.png`, `B/03.png`) shows "Undirected, from the file: directed 0" with no
   row label, indented unlike its neighbors and running into the right edge of the panel. The
   raw GML token "directed 0" reads as a contradiction ("Undirected ... directed") to a newcomer.
   The words come from the app (`graphty/src/workspace/inspector/words.ts`, `directionWords`),
   which prints the element's `statedBy` verbatim. It does not touch T12's path but sits in
   front of every participant who opens a sample.
5. **graphty-element: no tie values in the neighbor list.** The list has no shared-chapter counts
   (`09.png`) because the Les Miserables import does not record them as the edge weight. The task
   does not need them; a follow-up such as "who does he share the most chapters with" would.

Minor: after the Degree click the row under the pointer (Cosette in `09.png`, Ridolfi in
`B/08.png`) shows a hover highlight, because the list replaces the Summary under a resting
pointer. A real mouse does the same; it is not a selection.

No answer-key or task-wording changes are needed: the path, the names, the spellings and the
counts in `answers.md` match the screen.
