# Pilot: T12, one character and who he is tied to

Build under study: graphty@0.8.53 (build stamp 0196d46212aa), commit a1e6b91ff, opened at `/?next`,
1440 x 900. Both datasets were walked: Les Miserables (prompt A) in this folder, Florentine families
(prompt B) in `B/`. No script error, console error or failed request was printed at any step.

## Verdict

The end state is reached for both prompts by the mouse path. Searching for the character, picking
him, then clicking the Degree row on the Values tab replaces the inspector with a list of his
neighbors by name under a heading that gives the count.

- A: `09.png` reads "Javert's 17 connections" and lists Babet, Bamatabois, Claquesous, Cosette,
  Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice,
  Thenardier, Toussaint, Valjean, Woman1, Woman2. That is the same set as the answer key.
- B: `B/06.png` reads "Medici's 6 connections" and lists Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni. That matches the answer key exactly.

The keyboard alternative in the answer key (`--key g`) does not reach the end state (see the first
two problems below).

## Steps walked (A)

| Step                                                                    | Screenshot         | What the screen shows                                                                                       |
| ----------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| start, empty                                                            | `01.png`           | Start screen with the samples list and the usage-data consent card                                          |
| `--click "No thanks"`                                                   | `02.png`           | Consent card gone                                                                                           |
| `--click "Les Miserables"`                                              | `03.png`           | 77 nodes, 254 edges drawn; the Graph overview is on the right                                               |
| `--key /`                                                               | `04.png`           | The find box has focus                                                                                      |
| `--type Javert`                                                         | `05.png`           | Under Elements: "Javert"; under Values: "Select where name is Javert (1)"                                   |
| `--key ArrowDown`                                                       | `06.png`           | The Javert row is highlighted                                                                               |
| `--key Enter`                                                           | `07.png`           | Javert selected and ringed; Values tab shows id, name, Degree 17. The find box keeps focus                  |
| `--hover "Degree"`                                                      | `08.png`           | No tooltip (`tooltip: null`)                                                                                |
| `--click "Degree"`                                                      | `09.png`           | End state: the neighbor list, 17 names, Selection 18                                                        |
| `--click "Valjean"` (in the list)                                       | `10.png`           | Valjean selected, Degree 36. Clicking a name works                                                          |
| `--key Escape`                                                          | `11.png`           | Find box cleared; focus is still in it                                                                      |
| `--key /`, `--type Javert`, `--key ArrowDown`, `--key Enter`, `--key g` | `12.png`           | The "g" went into the find box, which now lists Geborand, Gervais, ... The neighborhood command did not run |
| `--key Escape`, `--key g`                                               | `13.png`, `14.png` | Same: Escape clears the find box but leaves focus there, and "g" is typed again                             |

## Steps walked (B)

`B/01.png` to `B/06.png` repeat the A path with "Florentine families" and "Medici": Degree 6
(`B/05.png`), then the 6 names (`B/06.png`). Then `--key Escape` returns to Medici with focus on
the Degree row (`B/07.png`), and `--key g` from there does run the neighborhood command
(`B/08.png`), with the result described in the second problem below.

## Problems found

1. **App defect: the G shortcut cannot work straight after a find.** After a search result is
   chosen with Enter, focus stays in the find box, and Escape only clears the box without leaving
   it. Every later letter, including G, is typed as a search (`07.png`, `12.png`, `14.png`). A
   keyboard user who finds a node by name has no way to use a single-letter shortcut on it short
   of tabbing out. Choosing a result should probably move focus to the inspector or the canvas.
2. **App defect (or a missing feature): G selects the neighborhood but does not list it.** From
   the Medici node with focus outside the find box, G selects the 7 nodes (`B/08.png`). However,
   the inspector shows a selection summary instead of the neighbor list: "7 nodes, 0 edges",
   "Edges among them 7", and id and name both "Acciaiuoli (1)". No family names are listed apart
   from that single one, so the G path ends in an `ids-not-names` / "count with no names" state.
   The "Acciaiuoli (1)" row also reads as if the selection were one family. Only the Degree click
   opens the named list (`graphty/src/workspace/inspector/NodeValues.tsx`, `NeighborList`;
   compare the `selection.neighborhood` command in `graphty/src/workspace/toolbar/commands.ts`).
3. **Wrong answer key: the keyboard path.** `answers.md` T12 says "then `--click "Degree"` on
   Values, or `--key g`". Given problems 1 and 2, `--key g` is not an equivalent end. Remove it,
   or keep it only once the app fixes both problems.
4. **Answer key spelling.** The screen spells three of Javert's neighbors "MmeThenardier",
   "Woman1" and "Woman2", but the key writes "Mme Thenardier", "Woman 1" and "Woman 2". Graders
   should accept the on-screen spelling. The key should copy it.
5. **graphty-element or sample data: no shared-chapter counts in the neighbor list.**
   `NeighborList` is written to show "each by name with its tie value, strongest first". For Les
   Miserables, the list is alphabetical and has no value column (`09.png`), so the answer key's
   chapter counts (Valjean 17, Enjolras 6, ...) cannot be read from this screen. The sample's
   edges carry `shared_chapters` (`graphty/public/samples/les-miserables.gml`). graphty-element's
   `data.neighbors()` only weighs by the weight attribute recorded at import
   (`graphty-element/src/session/data.ts`, `neighborWeight`), and the GML import does not record
   `shared_chapters` as one. The task's success does not need the counts, so this does not block
   T12. It does block any follow-up question like "who does he share the most chapters with".
6. **Discoverability risk (task, not a defect yet).** The only route to the list is clicking
   "Degree 17", which looks like a plain read-only data row, has no tooltip (`08.png`) and no
   visible affordance (`07.png`). Expect participants to stop at "Degree 17" (a count with no
   names) or to fall back on the Edges table. Watch for it in the first sessions. If more than one
   participant stalls there, it is an app finding.
7. **Minor, not blocking: arrowheads on undirected ties.** Both samples draw an arrowhead on every
   edge (`03.png`, `B/05.png`) while the Graph overview says "Undirected" (`03.png`, which reads
   "Undirected, from the file: directed 0"; that line also runs into the panel edge). For
   marriages and shared chapters, an arrow suggests a direction that is not there. Separately,
   after selecting a node, the view recenters on it. On Florentine this leaves the lowest family
   behind the floating toolbar (`B/05.png`, around 740,845).

## Study-tool notes

The tool behaved as documented: clicks by name (including a name in the neighbor list), keys,
typing and hover all did what the README says. No tool defect was found. Prompt B was run in the
subfolder `B/` because one session folder holds one session.
