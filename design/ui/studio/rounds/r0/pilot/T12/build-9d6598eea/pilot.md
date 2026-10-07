# Pilot: T12, one character and who he is tied to

Build under study: graphty@0.8.53 (build stamp 9d6598eea3e9), commit 9d6598eea, no uncommitted
changes, opened at `/?next`, 1440 x 900. Both datasets were walked: Les Miserables (prompt A) in
this folder, Florentine families (prompt B) in `B/`. No script error, console error or failed
request was printed at any step.

## Verdict

The end state is reached for both prompts by the answer key's six-step path, with no detour.

- A: `09.png` reads "Javert's 17 connections" and lists Babet, Bamatabois, Claquesous, Cosette,
  Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice,
  Thenardier, Toussaint, Valjean, Woman1, Woman2. Same set and spelling as the answer key; the
  list is alphabetical with no chapter counts, as the key says.
- B: `B/08.png` reads "Medici's 6 connections" and lists Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni. Matches the answer key exactly.

Nothing blocks the task. The items under "Remaining problems" are risks for participants, not
breaks in the path.

## Steps walked (A)

| Step | Screenshot | What the screen shows |
| --- | --- | --- |
| start, empty | `01.png` | Start screen, samples list, usage-data consent card |
| `--click "No thanks"` | `02.png` | Card replaced by "Usage data stays off" |
| `--click "Les Miserables"` | `03.png` | 77 nodes, 254 edges drawn; Graph overview on the right |
| `--key /` | `04.png` | Find box focused |
| `--type Javert` | `05.png` | Elements: "Javert"; Values: "Select where name is Javert (1)" |
| `--key ArrowDown` | `06.png` | Javert row highlighted |
| `--key Enter` | `07.png` | Javert selected and ringed; Values shows id, name, Degree 17. The find box is cleared and focus moves to the Summary rows (ring around them) |
| `--hover "Degree"` | `08.png` | Row highlights; `tooltip: null` |
| `--click "Degree"` | `09.png` | End state: 17 names, the 18 nodes ringed, Selection 18 |
| `--click "Valjean"` (in the list) | `10.png` | Valjean selected, Degree 36: a name in the list is a working link |
| `--key Escape` | `11.png` | Selection cleared; Graph overview back |
| `--key g` | `12.png` | Nothing selected, nothing happens (expected) |

## Steps walked (B)

`B/01.png` and `B/02.png` are byte-identical to A's. `B/03.png` opens Florentine families (15
nodes, 20 edges); `B/04.png` to `B/06.png` find and highlight Medici; `B/07.png` shows Medici
selected, Degree 6, focus on the Summary rows; `B/08.png` is the end state above.

## Fixed since the last pilot

Choosing a find result with Enter used to leave focus in the find box, so every later letter,
including single-key shortcuts, was typed as a search. Now Enter clears the box and moves focus to
the inspector's Summary rows (`07.png`, `B/07.png`).

## Remaining problems (none blocks T12)

1. **App: the Degree row has no affordance.** It is the only way to the named list, yet it looks
   like a plain read-only value: no tooltip (`08.png`), no link styling or chevron (`07.png`,
   `B/07.png`). Expect some participants to stop at "Degree 17" (a count with no names, an F
   code) or fall back on the Edges table (SD). Watch the first sessions.
2. **App: the Selection count is one more than the neighbor count.** After the Degree click the
   left rail reads "Selection 18" (`09.png`) and "7" (`B/08.png`), because Javert or Medici is
   selected along with the neighbors, while the heading says 17 or 6. A participant who reads the
   number from the rail will answer 18 or 7. Grade against the heading; consider a label that
   says "Javert and 17 connections" or leaving the center node out of the count.
3. **App or graphty-element: selecting a node from the find box pans the drawing off screen.**
   Before selection the whole Les Miserables drawing fits (`03.png`); after Enter the camera
   centers on Javert and the bottom of the drawing falls behind the toolbar and the window edge
   (`07.png` to `12.png`), and clearing the selection does not bring it back (`11.png`). Florentine
   loses its lowest node behind the toolbar the same way (`B/07.png`, `B/08.png`). Several of
   Javert's neighbors could sit in the cut-off part. Not needed for success, which reads names
   from the list.
4. **graphty-element: no tie values in the neighbor list.** The list is alphabetical with no
   shared-chapter counts (`09.png`), because the GML import does not record `shared_chapters` as
   the edge weight graphty-element weighs neighbors by. The task does not need the counts; a
   follow-up such as "who does he share the most chapters with" would.

No answer-key or task-wording changes are needed: the path, the names, the spellings and the
counts in `answers.md` match the screen.
