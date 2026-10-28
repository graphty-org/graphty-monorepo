# Grade: r1-s21b (T12B, Dev, Florentine families)

**Result: SD -- success with difficulty.**

The task: select the Medici, read what the program knows about them, and name the families they
married into. Success B in answers.md asks for the Medici selected and the six families named from
the screen: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The success path ends
on the Medici's "Degree" value, which opens the list "Medici's 6 connections".

## Why SD and not S

- The Medici were selected and a fact was read from the screen: id and name "Medici", Degree 6
  (06.png).
- All six families were named correctly, and each name was on screen when it was read: Salviati
  (21.png), Acciaiuoli, Tornabuoni, Ridolfi, Barbadori and Albizzi (22.png to 26.png, the last
  screenshot showing Albizzi, Degree 3).
- The names were not read from the "Medici's 6 connections" list. They were collected by clicking
  six balls on the drawing one at a time, from positions remembered from 08.png. answers.md grades
  "neighbors read ... by clicking around the drawing" as SD.
- The last screenshot (26.png) shows only Albizzi, not the six together. That is the cost of the
  route, not a missing answer: every name was on screen at the step it was read.

## Steps and wrong turns

- Success path: 6 steps. This session: 25 recorded steps (26 actions), not counting one click the
  tool could not resolve (step 4, a placeholder name; no screenshot change for the participant).
- Wrong turns: 6.
    1. Neighborhood (G) as the way to the names (08.png): it selects the six but lists no names.
       answers.md says G is not a success path.
    2. Clicking the "name Acciaiuoli (1)" row hoping for a list (09.png): nothing happens.
    3. Data > Edge table to read the marriages (11.png): opens an import page instead.
    4. Hovering a ball for its name (13.png): no tooltip.
    5. Toolbar tour and Quick actions > "label" (14.png to 18.png): the only match, "Add label
       line", is disabled.
    6. Clicking the "Selection 7" row (20.png): the inspector empties.
- The participant never clicked the Degree row in the Medici's summary (06.png), which is the
  one control that lists the names.

## Claims

- False "done": none. The final claim (6 families, the six names, Degree 6) matches what the
  screens showed. truth_on_screen: not applicable.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                 | Evidence                                              |
| --- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 3        | behavior     | The list of who a node is tied to is reachable only by clicking the Degree value, and nothing on the node's summary says so. The participant read "Degree 6", understood it as six connections, and still looked for the names in five other places.    | 06.png (Degree 6 shown, never clicked); steps 8 to 18 |
| 2   | 3        | build-defect | After Neighborhood selects 7 nodes, the summary reads "7 nodes, 0 edges", "Edges 0" beside "Edges among them 7", and shows id and name as "Acciaiuoli (1)" -- one value of seven, with a count of 1 -- so the selection looks like it holds one family. | 08.png; repro 04.png                                  |
| 3   | 3        | build-defect | Clicking the "Selection 7" row in the Graph tree empties the inspector to the single word "Selection", with no list of what is selected.                                                                                                                | 20.png; repro 05.png                                  |
| 4   | 3        | build-defect | Clicking the existing "Edge table" row in the Data tree opens a full-page "Add to Florentine families" import form instead of showing the table's 20 rows. The participant feared damaging the sample.                                                  | 11.png; repro 07.png                                  |
| 5   | 2        | behavior     | No names are drawn on the balls and hovering a ball shows no name, so a reader cannot tell which family is which without clicking each one.                                                                                                             | 03.png, 13.png                                        |
| 6   | 2        | behavior     | Clicking one ball replaces the 7-node neighborhood selection, so the reader cannot work through the six while keeping them marked; they had to remember positions from an earlier picture.                                                              | 21.png against 08.png                                 |
| 7   | 2        | wording      | The only label command in Quick actions, "Add label line", is disabled with no reason given, and "label line" does not read as "show names".                                                                                                            | 18.png                                                |

Two complaints in the transcript are not app defects and are not counted:

- "Tooltips lag one button behind": the screenshots show the right tooltip on each button
  (14.png Analyze, 15.png Legend, 16.png Quick actions). The participant read the tool's printed
  output, not the screen.
- "NeighborhoodG": on screen the tooltip shows "Neighborhood" and the key "G" apart (07.png); the
  run-together text is the tool's text extraction.

Neither changed the outcome, so the session is not void, but both are tool-reporting faults worth
fixing in real.mjs (its printed hover text should match the screenshot).

## Repro

`design/ui/studio/rounds/round-1/repro/r1-s21b/run.sh` (run on build 452285142099,
graphty@0.8.53) reproduces problems 2, 3 and 4 on every run (04.png, 05.png, 07.png), and its last
step confirms the success path works: Medici selected, "Degree" clicked, the list "Medici's 6
connections" shows all six names (11.png). Problems 3 and 4 match the same defects reproduced for
session r1-s19b on Les Miserables (the Selection row and the Data tree's table rows).
