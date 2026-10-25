# Grade: session r3-s47 -- Tom (tier 1 graduate), running club (T23 A), who is a step or two away

**Grade: S** (success). Tom answered 14 people besides Ava, the key's count, and named the same
14 the key lists (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana,
Theo). The last screen (`07.png`) shows the drawing narrowed to Ava and those people: the header
chip reads "15 of 20 nodes", 15 dots are drawn, the five outside the neighborhood (top right in
`06.png`) are gone, and the neighbor list still reads "Ava and 14 connections" at Hops 2 with
Follow All. `work.json` agrees: one new step, `neighborhood` of seed Ava at depth 2; the PageRank
run, the three layers and the source are unchanged, nothing gone. Follow was left on All, which
the key requires (running together goes both ways).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of
the criteria, at 1440 x 900. Start: friends.csv loaded, PageRank run and drawn as size and color
(setup `friends-ranked`). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Count (right).** "14 people, not counting Ava". He counted the 14 names in the Hops 2 list
  himself and checked them against Selection 15 (14 plus Ava), which resolves the "Ava and 14"
  reading the key flags as ambiguous (`06.png`).
- **Drawing (right).** `07.png`: chip "15 of 20 nodes", 15 dots, "Filter to neighbors" drawn
  disabled (gray), as the key gives for a step that is on.
- **Not a wrong answer.** Not 6 (Hops 1); not Follow Out; the count is not given as 15.
- **Out-of-date mark.** He did not rerun PageRank. He named the history icon on the PageRank row
  and the legend's "full graph" titles as unclear and would ask about them (recorded below; the
  key says to record it, it does not affect the grade).

## Measures

- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`). The success path is 5
  (`/`, type, Enter, `g`, Hops 2, Filter); his route swapped the `g` key for the inspector's "..."
  menu and Neighborhood (2 steps for 1). About 1.2x the success path.
- **Wrong turns:** 0. Every move went forward; the "..." menu is a valid route to the same list.
- **False "done":** none. "Done" at `07.png` is true: the count and the narrowed drawing are on
  screen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. The filter showed its chip and the button went disabled.
- **Numbers that disagree:** none on screen ("Ava and 14 connections", Selection 15, "15 of 20
  nodes" all agree).
- **Broken habit:** none.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks (0 calls); setup completed.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Nothing on Ava's panel says "neighbors" or "friends of friends". The Degree row's chevron, the other route to the list, was not read as one; Tom found Neighborhood only by trying the "..." menu because nothing else looked likely.          | `03.png` (Degree 6 with a ">" chevron, no label); `04.png`; transcript step 3 and end: "the '...' menu was the only way in" |
| 2   | 1        | comprehension   | After the filter the PageRank row shows a history icon and the legend titles read "PageRank, full graph"; Tom could not tell whether the ranking was now stale or wrong and would have to ask.                                                    | `07.png`; transcript step 7 and end                                                                       |
| 3   | 1        | comprehension   | Nothing tells him whether "Filter to neighbors" changed the saved lab map or only the view.                                                                                                                                                     | `07.png`; transcript end                                                                                  |
| 4   | 1        | wording         | "Hops" is not the user's word; he understood it only because the list grew beside 1, 2, 3.                                                                                                                                                     | `05.png`, `06.png`; transcript end                                                                        |
| 5   | 1        | wording         | "Ava and 14 connections" can be read as 14 with or without Ava; Tom settled it only by counting the names and comparing with Selection 15.                                                                                                     | `06.png`; transcript step 6                                                                               |

No severity 3 or 4: the count was right, the drawing ended in the asked-for state, and every doubt
he raised was on a path he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
