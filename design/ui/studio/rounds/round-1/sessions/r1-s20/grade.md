# Grade: r1-s20 (T12B, Tom, Florentine families)

**Result: SD -- success with difficulty.**

The task: go to the Medici, read what the program knows about them, and name the families they
married into. Success B in answers.md asks for the Medici selected and the six families named from
the screen: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The success path ends
on the Medici's "Degree" value, which opens the list "Medici's 6 connections".

Build: 9d6598eea3e9, graphty@0.8.53 (session.json).

## Why SD and not S

- The Medici were selected and a fact was read from the screen: id and name "Medici", Degree 6
  (05.png).
- All six families were named correctly, and each name was on screen when it was read: Salviati
  (11.png), Acciaiuoli (12.png), Tornabuoni (13.png), Ridolfi (14.png), Barbadori (15.png) and
  Albizzi (16.png, the last screenshot, "Albizzi, Degree 3").
- The six balls he clicked are exactly the six ringed around the Medici in 07.png (positions
  753,251; 571,357; 697,416; 584,549; 791,545; 913,603), so the set is right, not a lucky guess.
- The names were not read from the "Medici's 6 connections" list. They were collected by clicking
  balls on the drawing one at a time, from positions remembered from 07.png. answers.md grades
  "neighbors read ... by clicking around the drawing" as SD. It is not the F code "names from
  memory": the positions were remembered, but every name was read off the screen.
- The last screenshot shows only Albizzi, not the six together. That is the cost of the route,
  not a missing answer.

## Steps and wrong turns

- Success path: 6 steps. This session: 15 steps after the start (02.png to 16.png, one hover
  included), about 2.5x.
- Wrong turns: 4.
  1. Neighborhood (07.png) as the way to the names: it selects the six but lists no names. On
     this build answers.md says it is not a success path.
  2. Clicking the "Selection 7" row (08.png): the inspector empties to the word "Selection".
  3. Data rail (09.png), hoping for a table of names.
  4. Clicking the "name" attribute (10.png): it gives "Distinct values 15", not the values.
- He never clicked the Degree row in the Medici's summary (05.png), the one control that lists
  the names.

## Claims

- False "done": none. "Seven lit up, that's Medici plus six" (07.png) is true. The closing claim
  -- six families, the six names, Degree 6 -- matches the screens, and he said himself he would
  want it checked. truth_on_screen: not applicable.
- Usage card: declined with "No thanks" at step 2, no detour.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|----------|------|---------|----------|
| 1 | 3 | behavior | The list of who a node is tied to is reachable only by clicking the Degree value, and nothing on the node's summary says it can be clicked or what Degree counts. Tom read "Degree 6" as "probably six connections" and then looked for the names in four other places. | 05.png (Degree 6, never clicked); steps 7 to 10 |
| 2 | 3 | build-defect | After Neighborhood selects 7 nodes, the summary reads "7 nodes, 0 edges", "Edges 0" beside "Edges among them 7", and shows id and name as "Acciaiuoli (1)" -- one value of seven, with a count of 1. | 07.png |
| 3 | 3 | build-defect | Clicking the "Selection 7" row in the Graph tree empties the inspector to the single word "Selection", with no list of what is selected. | 08.png |
| 4 | 2 | behavior | No names are drawn on the balls, so a reader cannot tell which family is which without clicking each one. | 03.png |
| 5 | 2 | behavior | Clicking one ball replaces the 7-node neighborhood selection, so the reader cannot work through the six while they stay marked; Tom had to remember positions and said "if I misremembered a dot, I'd never know". | 11.png against 07.png |
| 6 | 1 | behavior | The "name" attribute summary gives a count of distinct values (15) and no way to see the values themselves. | 10.png |

Not counted as an app defect: "NeighborhoodG". In the sibling session r1-s21b the screenshot shows
the tooltip "Neighborhood" with the key "G" apart; the run-together text is the tool's text
extraction. It did not change the outcome, so the session is not void.

Problems 1, 2, 3, 4 and 5 are the same findings graded in r1-s21b on the same build; problems 2
and 3 are reproduced as build defects by `design/ui/studio/rounds/round-1/repro/r1-s21b/run.sh`.

- **Build-decided:** no. **Void:** no.
