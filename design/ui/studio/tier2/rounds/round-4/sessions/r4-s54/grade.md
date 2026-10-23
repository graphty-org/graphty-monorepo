# Grade: session r4-s54 -- Ruth (tier 1 graduate, returning), Florentine families (T12R B), one family and who they married into

**Grade: S** (success). Every part of tier 1's Success B (`../../../../../answers.md`, T12) is met.
The Medici were selected and their inspector read: `04.png` shows "Medici / Node", Summary id
Medici, name Medici, Degree 6, and Results PageRank "0.1458, #1 of 15", with Selection 1 and one
dot haloed. The six families were named from the screen: `05.png` is the Neighborhood view, header
"Medici" over "Neighborhood", "Back to Medici", the heading "Medici and 6 connections", Hops 1/2/3
with 1 chosen, "Filter to neighbors", and the list Acciaiuoli, Albizzi, Barbadori, Ridolfi,
Salviati, Tornabuoni, with Selection 7 and the six neighbors haloed. Ruth named all six, spelled as
on screen, and said 6. Route: the find box, the node row, the Degree row (clicked on the word
"Degree"). No detour.

**The last screenshot (`07.png`) is not the Medici list.** After reaching the answer Ruth clicked
Ridolfi in the list and opened Ridolfi's connections ("Ridolfi and 3 connections": Medici,
Strozzi, Tornabuoni) to check one marriage from the other side. The check is correct and changes
nothing in the answer, which was on screen in `05.png` and named from there in the transcript. As
in the earlier session that ended the same way (round 2, r2-s56), the grade rests on `05.png` plus
the transcript, and `07.png` is consistent with it (Medici heads Ridolfi's list).

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, size and color by
PageRank, no names drawn, `01.png`), as the task specifies. Tool commit `435e878a1d4c`, no
uncommitted changes. `session.log` is empty; `leaks.json` shows no leaks over 18 calls. Not void.

## The answer against the key

- **Medici selected (right).** `04.png`: inspector header "Medici / Node", Selection 1, the
  central dot haloed.
- **A fact read (right).** `04.png`: Degree 6; PageRank "0.1458, #1 of 15". Ruth also read id and
  name, and said that is all the program holds on them, which matches the screen.
- **The six families by name from the screen (right).** `05.png` lists the six exactly as the key
  spells them; the transcript repeats all six and gives the count 6.
- **Not partial.** Ruth saw the six "Medici -- X" ties in the find list first (`02.png`, "Edges 6")
  and said they read like six marriages, but she did not answer from them: she went on to the
  Neighborhood list and answered from it. Not the key's SD for neighbors read from the ties.
- **Work kept.** `work.json`: start and end identical (one PageRank run labeled Influence, three
  layers, no notes, no steps, source Florentine families); nothing gone.

## Measures

- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), one of them refused by the
  tool. The answer was on screen after 4 (`02.png` type, `03.png` refused click, `04.png` node row,
  `05.png` Degree), against the key's 4 on this build (`/`, type, Enter, Degree). The last 2
  (`06.png`, `07.png`) were a deliberate cross-check, not a search.
- **Refused click:** `--click "Medici"` matched the node row and the six tie rows and was refused
  as ambiguous; nothing changed (`03.png` is byte-identical to `02.png`). Ruth retried with
  `"Medici#1"`, the top row a person would click. This is the tool asking for a precise target,
  not a participant error and not a tool fault (it did nothing a person could not do and did not
  fail to do what was asked); it is not counted as a wrong turn.
- **Wrong turns:** 0. She never picked a tie instead of the node, never pressed Down arrow, never
  touched Hops or "Filter to neighbors". The Ridolfi check was chosen and worked.
- **False "done":** none. "Did I finish? Yes" with six named families and the count is true on
  `04.png` / `05.png`. Her claim that the program holds nothing more on the Medici matches the
  Values tab (id, name, Degree, PageRank). truth-on-screen: holds.
- **Numbers that disagree:** none. "Edges 6", Degree 6, "6 connections", six names and Selection 7
  agree.
- **Route recorded:** Degree row, the word "Degree", not the chevron. The `g` shortcut, the Node
  actions menu and the context menu were not used.
- **Broken habit:** partial and recovered. Her history has the connections list on the person's
  page; on this build it is one click behind the Degree row. She inferred it from the chevron and
  was right on the first try.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                 | Evidence                                                              |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | 1        | discoverability | The node's Values tab shows "Degree 6 >" but nothing labeled "connections" and no names; a returning user's habit (read the list on the person's page) needs one click whose purpose the screen does not name. Ruth guessed from the chevron. Seen in r2-s56 (Ruth) and r4-s53 (Jordan) as well.                        | `04.png`; transcript step 2 and debrief                               |
| 2   | 1        | navigation      | Clicking a name in the neighbor list moves straight to that node's inspector; the Medici list is gone and "Back to Medici" is no longer offered from Ridolfi's view (it reads "Back to Ridolfi"). Ruth called it handy but said it took her away without asking. The Selection count also changes silently (7, then 1, then 4). | `05.png` Selection 7; `06.png` Selection 1; `07.png` Selection 4, "Back to Ridolfi"; debrief |
| 3   | 1        | visibility      | The ranked start draws no names, so the haloed dots cannot be matched to families without clicking each one. Known for ranked starts (answer key, T12R); the task does not need it.                                                                                                                                   | `05.png`; debrief                                                     |
| 4   | 1        | trust           | The find list's "Edges 6" carries a scrollbar, so Ruth could not tell whether six was all of them; settled later by the Neighborhood list. Known on this build (answer key, T12R: a "Values" group below the ties makes the list scroll).                                                                              | `02.png` (scrollbar beside the edge list); transcript step 1          |
| 5   | 0        | visual          | In the Neighborhood view two controls look lit at once: the chosen Hops "1" (outlined) and the first name under the resting pointer's gray hover fill (Acciaiuoli; on Ridolfi's view, Medici). She did not mention it. Known on this build.                                                                            | `05.png`, `07.png`                                                    |
| 6   | 0        | tool            | `--click "Medici"` was refused as ambiguous (the node row and six tie rows all contain the name); the retry with the top row worked. Not a build defect and not a person's problem.                                                                                                                                     | `03.png` identical to `02.png`; transcript step 2                     |

No severity 3 or 4: the answer was right and complete on the first route, the one habit change
cost one click she worked out alone, and every confusion she raised was about a side effect or a
control she did not need.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
