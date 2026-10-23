# Grade: session r3-s45 -- Elena (tier 1 graduate, returning), running club (T23 A), who is a step or two away

**Grade: S** (success). Elena's answer, "14 people, not counting Ava (Ben, Chloe, Dev, Eli, Farah,
Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo)", matches the key exactly (14, the same 14
names). The drawing ends narrowed to Ava and those 14: the header chip reads "15 of 20 nodes". She
read the count from the screen ("Ava and 14 connections" at Hops 2) and took the key's route with no
detour.

Last screenshot (`06.png`): header chip "15 of 20 nodes" after the filter icon; inspector "Ava",
subtitle "Neighborhood", "Ava and 14 connections", Hops 2 chosen, Follow All, "Filter to neighbors"
drawn disabled (gray), the 14 names listed; the left panel's Selection row 15; 15 dots drawn, all
haloed; the legend titles read "Size: PageRank, full graph" and "Color: PageRank, full graph"
(0.03779 to 0.06394); the PageRank row shows its out-of-date icon and still reads 20. `work.json`:
start and end hold the same run, layers and source; the end adds one step,
`{"kind":"neighborhood","seeds":["Ava"],"depth":2}`; nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria, at
1440 x 900, no uncommitted changes. Start: setup `friends-ranked.txt` (the setup list in
session.json). No leaks (`leaks.json`: 0 calls).

**Recording gap, not a void.** `transcript.md` holds only the last step ("7. End") and the
participant's own-words section; the step-by-step narration of steps 1 to 6 is missing, and
`session.log` is empty. The run itself did not fail: every screenshot (`01.png` to `06.png`),
`work.json` and `session.json` are present and agree, and the end state and the route are fully
readable from them. The grade rests on those, as the criteria require (last screenshot, saved
files), so the session is graded, not voided. What is lost is the participant's reasoning at each
step; the only first-hand words are the own-words section.

## The answer against the key

- **The count (right).** 14 besides Ava, read from "Ava and 14 connections" with the 14 names under
  it (`05.png`). She said "not counting Ava", so the "Ava and 14" ambiguity did not trip her; the
  Selection row beside it read 15.
- **The narrowing (right).** "Filter to neighbors" at Hops 2 (`06.png`): chip "15 of 20 nodes", 15
  dots drawn, the step in `work.json` is depth 2 seeded on Ava, Follow All (so not the
  `meaning-wrong` Follow Out route).
- **One step only (6).** Not met: Hops 1 ("Ava and 6 connections", `04.png`) was the list's opening
  state, and she moved to 2 before answering.

## Measures

- **Route (from the screenshots):** find box, typed Ava (`02.png`: "Nodes 1" Ava, "Edges 6");
  picked Ava (`03.png`: node inspector, Degree 6, PageRank 0.03779, #20 of 20, Selection 1);
  opened the Degree row's arrow (`04.png`: the list at Hops 1, "Ava and 6 connections", the
  Neighbor / weight table, Selection 7); Hops 2 (`05.png`: "Ava and 14 connections", Selection 15);
  "Filter to neighbors" (`06.png`). The key names the Degree row's route as opening the same list.
- **Steps:** 5 after the start (`02.png` to `06.png`), the same as the key's success path.
- **Wrong turns: 0.**
- **False "done":** none. Her final claims hold on screen: 14 named people (`05.png`, `06.png`) and
  "15 of 20 nodes" (`06.png`). truth_on_screen: holds.
- **Rerun of PageRank or reading the out-of-date mark as a problem:** no rerun; she did not mention
  the row's icon. She did not understand the legend's "full graph" (problem 4).
- **Disabled "Filter to neighbors":** she noticed it go gray and doubted for a moment that it had
  worked, then confirmed from the chip; she did not press it again (problem 5).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

1. **The way into a person's neighbors is an unlabeled arrow on a row named "Degree". Severity 2.**
   Evidence: `03.png`, the only way in on the node inspector is the ">" beside "Degree 6"; her own
   words: "I didn't know the little arrow next to 'Degree 6' was the way to see her
   friends-of-friends -- I clicked it on a guess. 'Degree' isn't a word I use; 'connections' would
   have told me." She succeeded, but by guess. Single participant on this task; not confirmed here.
2. **Ava is drawn as the smallest dot, "#20 of 20". Severity 1.** Evidence: `03.png`; she read it as
   "the least important runner, which seemed odd for the person throwing the party". Outside the
   question the task asks; it did not change her answer.
3. **The "full graph" legend titles are not understood. Severity 1.** Evidence: `06.png`, "Size:
   PageRank, full graph" / "Color: PageRank, full graph" after the filter; her words: "the legend
   changed to 'PageRank, full graph' and I didn't know what that meant." Known on this build per the
   key; no wrong conclusion drawn.
4. **The pressed "Filter to neighbors" goes gray, which reads as "did it work?". Severity 1.**
   Evidence: `06.png`, the button drawn disabled; her words: "The Filter button greying out after I
   pressed it made me wonder for a second if it had worked, but the '15 of 20 nodes' at the top told
   me." The key asks to record any participant who reads the disabled button as broken: a momentary
   doubt, resolved by the chip, no second press.
5. **The step-by-step transcript was not kept. Severity 0 (a recording defect, not a build
   problem).** Evidence: `transcript.md` holds only "7. End" and the own-words section;
   `session.log` is empty. The screenshots and `work.json` carry the route and end state, so the
   grade is unaffected, but no per-step remarks can be counted for this session.

## For the round

- Count as S on T23 A: right number, right narrowing, no detour.
- Problem 1 (the Degree row as the only door to the neighbor list, named with a word she does not
  use) is the finding to compare across the other T23 and T12R sessions.
