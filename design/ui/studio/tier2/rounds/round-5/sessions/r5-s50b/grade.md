# Grade: session r5-s50b -- Ruth (tier 1 graduate), Florentine families (T23 B), who is a step or two away

**Grade: S** (success). The last screen (`08.png`) matches the answer key's B end state: the header
chip reads "12 of 15 nodes" after a filter icon, 12 dots are drawn (the three the key leaves out are
gone: the lone node at the right and the two at the bottom, present on `06.png`), and the neighbor
list reads "Medici and 11 connections" at Hops 2 over the key's 11 names in the key's order
(Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi,
Tornabuoni). The Selection row reads 12. `work.json` ends with one new step, a neighborhood of the
Medici at depth 2, turned on. Ruth answered "11 families ... not counting the Medici" and named all
11, read from the list.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the Florentine families sample with PageRank run and nodes sized and
colored by it. Tool commit `753bae997bc6`, no uncommitted changes.

## The answer against the key

- **Count (right).** 11 besides the Medici, read from the Hops 2 list header and checked against
  Selection 12 ("the 11 plus the Medici", transcript step 6).
- **Drawing narrowed (right).** Chip "12 of 15 nodes"; 12 dots on `08.png`, each with a halo.
- **Route.** The key's success path, with two differences: Ruth opened the neighbor list from the
  inspector's "..." menu ("Neighborhood", `04.png`) rather than the `g` key, and she chose Hops 2
  with a bare "2" (unambiguous on B, which has no weights). The list opening at Hops 1 is the
  list's default on every route, not a detour.
- **Work kept.** `work.json`: the PageRank run and its three style layers are unchanged; the only
  change is the neighborhood step the task asks for. Nothing gone.

## Measures

- **Steps:** 7 `real.mjs` steps after the start: click the find box and type Medici, pick the
  Medici, open the "..." menu, Neighborhood, Hops 2, search Pazzi, Filter to neighbors. The key's
  path is 5 (find, Enter, `g`, Hops 2, Filter).
- **Wrong turns:** 0. The Pazzi search (`07.png`) was a deliberate check of one name ("Pazzi --
  Salviati -- Medici"), not a step toward a wrong place; it changed no state, and the neighbor list
  stayed open beside it.
- **False "done":** none. Every claim at the end is true on `08.png`: the 11 names, "12 of 15
  nodes", 12 dots, three gone, and the legend titles "Size: PageRank, full graph" / "Color:
  PageRank, full graph". truth-on-screen holds.
- **Silent commit:** none. "Filter to neighbors" drew the chip and removed three nodes at once.
- **Numbers that disagree:** none on screen. The PageRank row still reads 15 under the filter, with
  its out-of-date (history) icon, as the key describes; Ruth did not read it as a problem and did
  not rerun.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Eight screenshots for eight steps; `leaks.json` shows no
  leaks over 18 calls.
- **Scripted exit:** not applicable; Ruth finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                   | Evidence                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The neighbor list's doors from the node inspector are a "..." menu and a small arrow beside "Degree 6"; nothing labeled "neighborhood" or "neighbors" is on the panel at rest. Ruth found it only by opening the menu on a hunch.                                        | `03.png`, `04.png` (menu open; Degree row with its arrow); transcript step 3 and "What confused me", first item |
| 2   | 2        | missing feature | The Hops 2 list gives no route: it does not say through which family each second-step family is reached. Ruth had to search Pazzi separately to find the Salviati in between; for print she wants the "via" family beside each name.                                     | `06.png` (plain list of 11 names); `07.png` (Pazzi search, edge "Salviati -- Pazzi"); transcript steps 6-7     |
| 3   | 1        | comprehension   | The header "Medici and 11 connections" calls families two marriages out "connections", which reads as direct ties, and does not say the reach; only the chosen Hops segment does.                                                                                     | `06.png`, `08.png` (header, Hops segment on 2); transcript "What confused me", third item                     |
| 4   | 1        | missing feature | After the filter, the drawing carries no names, so a reader cannot tell from the picture which families are shown or which three were dropped; Ruth took both from the list. The Data page's Filters step shows only counts, not names.                                | `08.png` (unlabeled dots); transcript step 8 and "What confused me", fourth item                              |

Problem 1 is also reported by round 5's r5-s49b (Elena, T23 A, problem 2: the Degree arrow as the
only door), so it counts as confirmed. Problem 3 echoes r5-s49b's problem 4 ("the header does not
say the reach"), also two participants, at severity 1. Problems 2 and 4 rest on this session alone.

Ruth did not touch the disabled "Filter to neighbors" button after the press (`08.png`, gray), so
the key's question about reading it as broken does not arise here.
