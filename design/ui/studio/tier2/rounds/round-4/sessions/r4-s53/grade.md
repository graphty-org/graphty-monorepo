# Grade: session r4-s53 -- Jordan (regular analyst), Les Miserables (T12R A), one person and his ties

**Grade: S** (success). Every part of tier 1's Success A (`../answers.md`, T12) is met. Javert is
selected and his inspector read: `03.png` shows "Javert / Node", Summary id Javert, name Javert,
Degree 17, and Results PageRank "0.0303, #5 of 77"; Jordan named both the degree and the PageRank,
either of which is a fact read. His neighbors are listed on screen by name: the last screen
(`04.png`) is the Neighborhood view, heading "Javert and 17 connections", Hops 1, and the
alphabetical list Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent,
Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1,
Woman2. Jordan named all 17 from that list, spelled as on screen, and said 17. Every name and the
count match the key. No detour: the find list's row opened the node, not a tie.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (PageRank run, size and color by
PageRank, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Selected (right).** `03.png`: Javert's inspector, a yellow halo on one dot, left panel
  Selection 1.
- **Fact read (right).** Degree 17 and PageRank 0.0303, #5 of 77, both as on `03.png` and in the
  key.
- **Neighbors (right).** All 17 names from the Neighborhood list on `04.png`, not from the find
  list's ties and not from memory. Selection 18 on `04.png` (Javert plus 17).
- **Count (right).** 17, from the heading and Jordan's own count of the list; it also matches the
  find list's "Edges 17" (`02.png`), which Jordan noticed and did not rely on.
- **Work kept.** `work.json`: start and end identical (one PageRank run, three layers, no notes,
  no steps, source Les Miserables); nothing gone.

## Measures

- **Route:** the Degree row (clicked on the row between the word and the number, not on the
  chevron). The `g` shortcut, the Node actions menu and the context menu were not used.
- **Find list:** opened by a click on the find box and typing, then a click on the "Javert" row
  under "Nodes 1". No Down arrow, so the key's "picks a tie instead of the node" trap did not
  arise.
- **Steps:** 3 `real.mjs` steps after the start (`02.png` to `04.png`). The success path is 4
  (`/`, type, Enter, Degree); Jordan folded the focus and typing into one step and clicked the row
  instead of Enter.
- **Wrong turns:** 0.
- **False "done":** none. Every end claim (17 neighbors, the 17 names, Degree 17, PageRank 0.0303,
  fifth of 77) is true on `03.png` / `04.png`. truth-on-screen: holds.
- **Silent commit:** none. Each click changed the inspector visibly.
- **Numbers that disagree:** none. Heading 17, list of 17, Degree 17, Edges 17 and Selection 18
  agree.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the session ended
  normally, and `leaks.json` shows no leaks over 16 calls.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | discoverability | The Degree row is a link only by a small chevron at the right edge. Jordan said a first-time user would not guess the names live behind it; Jordan found it from the returning-user history, so this session does not test a first-time reader.               | `03.png` ("Degree 17 >"); transcript debrief: "only a link because of a tiny '>' at the right edge"              |
| 2   | 1        | trust           | The find list's "Edges 17" and the neighbor count are the same number here, and Jordan wondered whether ties and people always match (two ties to one person would break it). Nothing on screen says which one the find list counts. Settled by the list.     | `02.png` ("Edges 17"); transcript step 1 and debrief                                                            |
| 3   | 1        | visual          | In the Neighborhood view two controls look lit at once: the chosen Hops "1" (outlined) and the first name, Babet, under the resting pointer's gray hover fill. Jordan was not misled. Known on this build (answer key, T12R).                                   | `04.png` (Hops "1" outlined, Babet row gray)                                                                    |
| 4   | 0        | feature request | The neighbor list shows no PageRank beside each name, so the circle cannot be ranked in place. Outside the task's question.                                                                                                                                   | `04.png`; transcript debrief: "The list has no PageRank next to each name"                                      |

Problems 1 and 2 rest on one participant and are not confirmed by this session alone.
