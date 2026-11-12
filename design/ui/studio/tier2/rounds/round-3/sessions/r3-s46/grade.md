# Grade: session r3-s46 -- Nadia (tier 1 graduate, returning), Florentine families (T23 B), who is a step or two away

**Grade: S** (success). Nadia's answer, "11 families within two marriages of the Medici (Acciaiuoli,
Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni)",
matches the key exactly: 11, the same 11 names, the Medici not counted. The drawing ends narrowed
to the Medici and those 11: the header chip reads "12 of 15 nodes" and 12 dots are drawn. She read
the count from the screen ("Medici and 11 connections" at Hops 2) and made no detour.

Last screenshot (`09.png`): header chip "12 of 15 nodes" after the filter icon, its tooltip open:
'Showing only: "within 2 hops of Medici". Click to open Filters, where you can turn it off.';
inspector "Medici", subtitle "Neighborhood", "Medici and 11 connections", Hops 2 chosen, "Filter to
neighbors" drawn disabled (gray), the 11 names listed alphabetically; the left panel's Selection row
12, the PageRank row with its out-of-date (history) icon and still reading 15; 12 dots drawn, all
haloed; the legend's color title reads "Color: PageRank, full graph" (0.03066 to 0.1458), the size
title hidden under the chip's tooltip. `work.json`: start and end hold the same run, layers and
source; the end adds one step, `{"kind":"neighborhood","seeds":["Medici"],"depth":2}`; nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria, at
1440 x 900, no uncommitted changes. Start: setup `florentine-ranked.txt` (the setup list in
session.json). No leaks (`leaks.json`: 0 calls). The run did not fail: every screenshot (`01.png` to
`09.png`), the transcript, `work.json` and `session.json` are present and agree. Not void.

## The answer against the key

- **The count (right).** 11 besides the Medici, read from "Medici and 11 connections" with the 11
  names under it (`07.png`), Selection 12 beside it. She said "not counting the Medici", so the
  "Medici and 11" wording did not trip her.
- **The narrowing (right).** "Filter to neighbors" at Hops 2 (`08.png`): chip "12 of 15 nodes", the
  three outlying families (Peruzzi, Lamberteschi, Bischeri per the key) gone, the step in
  `work.json` depth 2 seeded on the Medici.
- **One step only (6).** Not met as an answer: Hops 1 ("Medici and 6 connections", `06.png`) was the
  list's opening state, and she moved to 2 before answering. She also read the six direct ties off
  the search results (`02.png`) and correctly called them only the first ring.

## Measures

- **Route (from the screenshots and transcript):** find box, typed Medici (`02.png`: "Nodes 1"
  Medici, "Edges 6"); picked the node (`04.png`: node inspector, Degree 6, PageRank #1 of 15,
  Selection 1); the inspector's "Node actions" menu (`05.png`: Neighborhood, Path between..., Frame
  selection, Add note); Neighborhood (`06.png`: Hops 1, "Medici and 6 connections", Selection 7);
  Hops 2 (`07.png`: "Medici and 11 connections", Selection 12); "Filter to neighbors" (`08.png`);
  hovered the chip to check what the filter did (`09.png`). The key's success path uses the `g`
  shortcut; the inspector menu's Neighborhood item opens the same list (the key names the canvas
  menu and the Degree row as equivalent routes).
- **Steps:** 7 after the start that changed the screen (`02.png`, `04.png` to `09.png`), against the
  key's 5; the extra two are opening the menu and the confirming hover.
- **Wrong turns: 0.** The refused click at step 2 (`03.png`, identical to `02.png`) was the tool
  declining an ambiguous name ("Medici" matched the node row and its six edge rows); nothing
  happened on screen and a person would simply have clicked the top row. It is not a wrong turn by
  the participant and not a tool fault (the tool did not act; it asked for a sharper target).
- **False "done":** none. Her final claims hold on screen: the 11 named families (`07.png`,
  `09.png`) and "12 of 15 nodes" with the filter "within 2 hops of Medici" (`09.png`).
  truth_on_screen: holds.
- **Rerun of PageRank or reading the out-of-date mark as a problem:** no rerun. She did read the
  mark and the "full graph" legend as a possible problem ("I don't know if that means my ranking is
  now stale or wrong for the 12 families") -- recorded as the key asks (problem 2).
- **Disabled "Filter to neighbors":** she noticed it gray (`08.png`), did not press it again and did
  not read it as broken.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

1. **The neighbor list is found only behind an unlabeled three-dot menu. Severity 2.** Evidence:
   `04.png`, nothing on the node inspector names "who is two away"; `05.png`, she opened the menu
   only because "that was the only menu there"; her words: "'Neighborhood' lives behind the
   three-dot menu on the node panel ... Nothing on the panel itself says 'who is two away'." She
   succeeded, by elimination. The same discoverability gap as session r3-s45 (T23 A), who found the
   list only by guessing at the arrow beside "Degree 6": two participants on this task reached the
   list by guess, through two different doors. Confirmed as a behavior finding (2 participants).
2. **After the filter, the "full graph" legend titles and the PageRank row's history icon leave her
   unsure whether the ranking is still valid. Severity 2.** Evidence: `08.png`, `09.png` ("Color:
   PageRank, full graph", the history icon on the PageRank row, which still reads 15); her words:
   "I don't know if that means my ranking is now stale or wrong for the 12 families. QA would ask
   which numbers the picture shows." She drew no wrong conclusion and did not rerun, but left with
   an open doubt about the picture she would hand on. Session r3-s45 also did not understand "full
   graph" (severity 1 there); confirmed as a misreading (2 participants).
3. **"Hops" does not say what one hop is. Severity 1.** Evidence: `06.png`, `07.png`; her words: "I
   guessed one hop means one marriage from the Medici. The list growing from 6 to 11 at 2 made it
   make sense, but the word alone didn't tell me." Resolved by the list's change; no wrong answer.
4. **"Filter to neighbors" does not say before the press whether it hides or deletes. Severity 1.**
   Evidence: transcript step 5 ("Not sure whether that deletes the other families or only hides
   them") and step 7, where she hovered the chip (`09.png`) to confirm nothing was thrown away. The
   button's own tooltip (per the key, "Hide every node outside this neighborhood ...") was never
   shown because she clicked without hovering; the chip's tooltip answered it after the fact.
5. **A search result named "Medici" is shared by the node and its six edges. Severity 0.** Evidence:
   `02.png`, `03.png`; her words: "Clicking 'Medici' in the search results was refused because the
   edges carry the name too." This is the tool's name-matching, not something a person meets on
   screen (the node row is the first, under "Nodes 1"); recorded only because she mentioned it.

## For the round

- Count as S on T23 B: right number, right narrowing, no detour.
- Problems 1 and 2 each now have two participants across T23 A and B (this session and r3-s45):
  the way into the neighbor list is found only by guess, and the "full graph" legend after a filter
  is not understood.
