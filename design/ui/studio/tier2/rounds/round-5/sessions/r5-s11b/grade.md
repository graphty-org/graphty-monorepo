# Grade: session r5-s11b -- Jordan (regular analyst), running club (T17 A), only the strong ties

**Grade: S** (success), prompt and follow-up both. The last screen (`13.png`) matches the key's
"back" state: no chip in the header, the Filters row reads "weight is at least 5" over "off" with
its checkbox clear, the Overview reads Nodes 20, Edges 41 with no "showing" rows, the legend
titles are plain "Size: PageRank" / "Color: PageRank", and the whole tangle is drawn again. Before
that, the drawing was narrowed and the count read where the key says it is shown: at 4 or more,
`07.png` shows chip "19 of 20 nodes, 12 of 41 edges", row "20 to 19 nodes, 41 to 12 edges", and
Overview "Nodes showing 19 of 20"; Jordan answered 19 people (12 ties). At 5 or more, `12.png`
shows chip "10 of 20 nodes, 5 of 41 edges", row "20 to 10 nodes, 41 to 5 edges", Overview "Nodes
showing 10 of 20"; Jordan answered 10 people (5 ties). Both are the key's values. The whole club
came back after each (`09.png`, `13.png`).

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. Start: the
`friends-ranked` setup (friends.csv loaded, PageRank run, nodes sized and colored by PageRank).

## The answer against the key

- **Narrowed (right).** `07.png`: only ties with weight 4 or more drawn; 19 dots. `12.png`: five
  pairs, 10 dots.
- **Count (right, read on screen).** 19 at 4 or more, 10 at 5 or more, read from the chip and the
  row and confirmed by the Overview. Jordan also counted dots at 4 or more and got 19; at 5 or
  more the overlapping pair near 717,745 / 735,744 (the key's known overlap) made the dot count
  "fiddly", and Jordan trusted the number instead. Edge counts were reported as ties, not as
  people: no `read-wrong`.
- **Back (right).** Unticking the step's checkbox both times; `work.json` ends with
  `step-1 off {"kind":"range","attribute":"data.weight","min":5,"nodes":"ends"}` -- the step kept,
  switched off.
- **Route.** The canvas toolbar's Filters tool (the funnel at about 833,863), which the key
  accepts like the Filters "+". Attribute picked from the list, "at least" was already the
  comparison, Value 4, Add step. Follow-up by the key's path: click the row, edit Value to 5,
  "Save and turn on", then one untick.
- **The "Save and turn on" trap:** not fallen into. Jordan read the button, saw the step come on
  (`12.png`, checkbox ticked), and unticked once to bring everyone back.
- **Work kept.** `work.json`: runs, layers, notes and sources identical at start and end; the only
  addition is the filter step, off; `gone` is empty.

## Measures

- **Steps:** 13 `real.mjs` steps (8 for the prompt, 5 for the follow-up). The key's success path
  is about 7 for the prompt and 4 for the follow-up. The extras are two hovers to read tooltips
  before clicking (the toolbar funnel, the checkbox), which are checks, not wrong turns.
- **Wrong turns:** 0.
- **False "done":** none. Every claim in the wrap-up (19 people / 12 ties, 10 people / 5 ties,
  club back at 20 and 41, step left in the list switched off) is true on `07.png`, `09.png`,
  `12.png` and `13.png`. truth-on-screen holds.
- **Rerun of PageRank:** none. Jordan read "PageRank, full graph" as "the sizes were not
  recomputed on the filtered drawing" -- the ranking, not what is drawn -- which is a correct
  reading.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Thirteen screenshots for thirteen steps; `leaks.json` shows
  no leaks over 28 calls; the setup log shows the file loaded.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                         | Evidence                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | missing feature | The New filter step editor shows no count of what the step would keep before "Add step", so trying several thresholds means saving each one. Known on this build.                              | `06.png` (Value 4, Add step enabled, no preview); transcript step 6 and "What confused me", first bullet                         |
| 2   | 1        | discoverability | The on/off control for a step is an unlabeled small checkbox; its meaning was learned only from the hover tooltip "Turn this step off".                                                       | `08.png` (tooltip), `07.png` (bare checkbox at 274,247); transcript step 7 and "What confused me", fifth bullet                  |
| 3   | 1        | layout          | After narrowing, the drawing keeps the full graph's positions, so pairs that overlapped stay overlapped (717,745 / 735,744 at 5 or more) and a count by eye cannot be checked. Known overlap. | `12.png` (the overlapping pair near the bottom); transcript step 13 and "What confused me", fourth bullet                        |
| 4   | 1        | wording         | The column is shown only by its file name "weight", and the panels say "nodes" and "edges"; Jordan identified the column only because it was the only number on the ties.                     | `04.png` (Attribute list: Edges: weight); transcript "What confused me", second and third bullets                                |

No problem reached severity 3 or 4: the participant reached the right answer and the right end
state on both questions with no wrong turn.
