# Grade: session r1-s53 -- Dana (returning regular analyst), task T24 A (running club)

Build 946256efb876 (graphty@0.8.56), the frozen build named in `../../../../criteria.md`;
`session.json` records that build stamp and no uncommitted changes. Setup
`friends-ranked-names.txt` ran to its end (`setup.log`). Graded from `06.png` (the last
screenshot) and `03.png`, never from the participant's rating.

## Grade: S

- **The number.** `03.png`: the edge inspector is titled "Gus -> Ivan" (subtitle "Edge"), with
  Summary From Gus, To Ivan, weight 1, a blue band on the Gus-Ivan line and the left panel's
  Selection row at 1. The participant answered 1 run, which matches the answer key (1).
- **Exactly the two ends selected at the end.** `06.png`: Gus and Ivan carry yellow rings and no
  other node does; the right panel reads "2 nodes selected" and the left panel's Selection row
  reads 2.
- **Path.** The success path in the answer key, with no detour: a hover on the line (step 2), one
  click on the line that hit edge 13 on the first try (step 3), the three-dot "Edge actions" menu
  (step 4), "Select endpoints" (step 5). Step 6 only opened the Style tab to look; it changed
  nothing on the drawing.
- **Measure.** The participant clicked the line itself; it took one try.

False "done" claims: none. The "done" claim at the end matches `06.png`.

Wrong turns: 0.

## Problems

| Sev | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 2   | "Select endpoints" is not the participant's word; she reached it by guessing that "endpoints" meant "the two people at either end". She would not have had to guess at "Select Gus and Ivan".                                                                                                                                                                                                                                                 | Transcript, step 4 and debrief                                                   |
| 2   | Hana's label box is drawn over the lower half of Ivan's sphere, and the selected Gus-Ivan line stops at that label, so the tie looks as if it ends at Hana. A second Gus line runs to Hana just below it. This participant told the two lines apart by slope and did not misread the tie, but the drawing invites the misreading the answer key warns about. After Select endpoints the same label also covers the lower part of Ivan's ring. | `03.png`, `06.png`; transcript, step 2                                           |
| 1   | The inspector title "Gus -> Ivan" shows a direction for a tie that has none ("they ran together"); the participant wondered whether it meant "Gus invited Ivan". The arrow is the file's column order.                                                                                                                                                                                                                                        | `03.png`; transcript, step 3 and debrief                                         |
| 1   | The value is labeled "weight", not the participant's word for it (runs together); she had to assume what it meant.                                                                                                                                                                                                                                                                                                                            | `03.png`; debrief                                                                |
| 1   | Hovering the line shows no tooltip; only the pointer turning into a hand says it can be clicked.                                                                                                                                                                                                                                                                                                                                              | Transcript, step 2 (tool output: cursor pointer, no tooltip); `02.png` unchanged |
| 1   | The participant could not tell whether the selection ring lasts past the next click, which matters for a slide; she did not test it.                                                                                                                                                                                                                                                                                                          | Debrief                                                                          |
| 1   | The small gray subtitles under the panel headings ("Edge", "Selection") are hard to read for this participant.                                                                                                                                                                                                                                                                                                                                | `03.png`, `06.png`; debrief                                                      |

No problem in this session came from a defect in the build or the tool: every screen matched the
answer key's description of this build, and nothing failed, froze or showed an error.

## Caveat

Simulated participant briefed with a history, not a memory; a pass is weak evidence until real
people confirm it. Keyboard and screen-reader access were not studied in tier 2.
