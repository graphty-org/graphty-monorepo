# Grade: session r4-s45 -- Nadia (tier 1 graduate), running club (T23 A), who is a step or two away

**Grade: S** (success). Both parts of the task are met on the last screen (`08.png`). The count is
read from the screen: the neighbor list at Hops 2 with Follow All is headed "Ava and 14
connections", with the 14 names the key gives (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada,
Kofi, Quinn, Ravi, Sana, Theo), and Selection reads 15. Nadia answers 14, not counting Ava. The
drawing is narrowed to exactly those people and Ava: the header chip reads "15 of 20 nodes" after
the filter icon, 15 dots are drawn (the two near-overlapping pairs the key warns about counted as
two each), and "Filter to neighbors" is drawn disabled, which this build does once its step is on.
`work.json` adds one step, `{"kind":"neighborhood","seeds":["Ava"],"depth":2}`. No detour: Hops 1
is where the list opens, not a choice she made.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run,
sized and colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count (right).** 14 besides Ava, with the key's 14 names (`07.png`). Left out, as the key
  says: Lena, Milo, Nora, Omar, Pia.
- **Direction (right).** Follow All, kept on purpose: "running together has no direction". Not the
  `meaning-wrong` answer (6 with Follow Out).
- **Two steps, not one (right).** Nadia read Hops 1 ("Ava and 6 connections", `06.png`) as one
  step and chose 2 herself.
- **Drawing narrowed (right).** `08.png`: chip "15 of 20 nodes", 15 dots, the 5 outside gone.
- **Work kept.** `work.json`: the run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; the only change is the neighborhood step the task
  asks for.

## Measures

- **Route:** the find box ("Ava"); a click on Ava's own row in the results; the node inspector's
  "..." menu (Node actions); Neighborhood; Hops 2; Filter to neighbors. The inspector-menu route
  opens the same list as the key's `g`, canvas-menu and Degree-row routes.
- **Steps:** 7 `real.mjs` steps after the start (`02.png` to `08.png`), one of them a click the
  tool refused (below). The key's success path is 5.
- **Wrong turns:** 0. Step 2's `--click "Ava"` was refused by the tool as ambiguous (the node row
  and all six edge rows contain "Ava"); nothing changed on screen (`02.png` and `03.png` are the
  same file size and screen) and she aimed at the node row next. That is a click that never
  landed, not a move into a wrong place. Opening the "..." menu "because I had nothing else to
  try" led straight to Neighborhood.
- **Broken habit:** none. Her first move, the find box, led on to the task.
- **False "done":** none. Every end claim (14 people besides Ava, the 14 names, the drawing shows
  only those 15, "15 of 20 nodes", the other five hidden not deleted) is true on `07.png`,
  `08.png` and in `work.json`. truth-on-screen: holds.
- **Doubted the count against Degree 6:** no; she named the 14 as Ava's people plus their people
  and said "eight of them are friends of friends".
- **Read the PageRank out-of-date mark as a problem / reran it:** no. She read the history icon and
  "PageRank, full graph" as "these numbers are from before you filtered", which is right, and did
  not rerun.
- **Read the disabled button as broken, or pressed it to undo:** no. She noted she could not tell
  from the button how to undo, and would look at the "15 of 20" chip instead.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the setup's upload was
  answered (`setup.log`), and `leaks.json` shows no leaks over 20 calls.
- **Scripted exit:** not applicable; Nadia finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                       | Evidence                                                                                                                                                                                      |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Neighborhood is reached from a selected person only through the inspector's "..." menu (or a shortcut and the canvas menu she did not know); nothing in Ava's panel names it. Nadia found it by trying the one unexplored control, and says that without it she would have read six lists of connections and counted by hand. | `04.png` (Ava's panel, no visible Neighborhood control), `05.png` (the menu); transcript debrief: "I never knew the Neighborhood item was behind the '...' ... I only opened it because I had nothing else to try" |
| 2   | 1        | wording         | The list header "Ava and 14 connections" calls friends of friends "connections"; it made Nadia pause, since 8 of the 14 are not Ava's own ties, and the header does not say how many hops it covers (only the Hops segment does).            | `07.png`; transcript debrief: "'connections' made me pause: these aren't all her connections"                                                                                                 |
| 3   | 1        | feedback        | After the filter the PageRank row shows only a history icon and the key says "full graph"; nothing on screen says in words that the scores were not redone for the 15 shown. Nadia guessed right.                                          | `08.png` (icon on the PageRank row, "Size: PageRank, full graph"); transcript debrief: "nothing told me so in words"                                                                          |
| 4   | 1        | feedback        | Once pressed, "Filter to neighbors" goes gray and gives no sign at the button of how to undo the filter; the only cue Nadia saw was the "15 of 20 nodes" chip.                                                                                | `08.png`; transcript debrief: "I can't tell from that button how to undo it"                                                                                                                  |
| 5   | 1        | targeting       | In the find results Ava's name appears in her node row and in all six edge rows, so a click on the name is ambiguous; she had to aim at her own row. The node row is first and highlighted, so a person clicking would likely hit it; the cost here is the tool's locator, and is recorded only as a mark of how crowded the results are with one name. | `02.png`, `03.png`; transcript step 2                                                                                                                                                         |

All five rest on one participant and are not confirmed by this session alone. Problems 3 and 4 are
the states the answer key already records for this build (the out-of-date mark under a filter; the
disabled button whose tooltip, seen only on a later hover, names the Filters step as the way back).
