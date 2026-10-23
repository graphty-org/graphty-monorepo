# Grade: session r1-s01 -- Elena, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because Elena had to guess that size
lived under "+" beside Shape, and needed a tooltip ("Size by attribute") to learn how to size the
dots by a value.

Build seen: `9d6598eea3e9 graphty@0.8.53` (session.json), at 1440 x 900.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png`: opened from Samples on the start screen; the Overview
   reads Nodes 77, Edges 254, matching the reference values.
2. **A ranking run finished.** `06.png`: PageRank (shown on screen as "Influence") colored all 77
   nodes, with a key reading 0.003299 to 0.07543, the reference range, and an "Influence 77" row.
   `07.png`: the Top 10 reads Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577, matching the
   reference top three.
3. **Sizes bound to the result and visibly different.** `13.png` and `19.png`: a Size line
   ("1 to 3") on the Influence row and "Size: Influence" in the key; Valjean and Myriel are
   clearly the largest dots. Meaning, at the end: "Both the size and the color show the same
   thing: 'Influence', which is what the app calls PageRank... Bigger and darker = more
   influential. Valjean is by far the biggest, then Myriel." Correct, and the order was on
   screen (`07.png`) before she said it.
4. **Names drawn.** `15.png` and `19.png`: a label line bound to `name` on the Influence row,
   which covers all 77 nodes, reads "77 labels, 6 hidden to avoid overlap" -- the reference
   statement for a sized Les Miserables. Real names are drawn, not ids.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `19.png`; sizes are visibly different; the names drawn on screen are drawn in
   the image (small and soft, Valjean's on top of his own dot, but present); the key names both
   channels in use ("Size: Influence" and "Color: Influence", each 0.003299 to 0.07543).
   `19.png` shows the toast "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 18 `real.mjs` steps after the start (`02.png` to `19.png`), two of them hovers and
  one a click the tool could not resolve. The success path is about 18, so about 1.0x.
- **Wrong turns:** 0. The hovers on the Analyze icon and the link icon were checks, not steps off
  the path; opening the Top 10 (step 6) was on the way to the Style tab.
- **False "done":** none. "Part 1 done" (`02.png`, drawing and counts on screen), "Part 2 done"
  (`07.png`, ranked list on screen), "Part 3 done" (`13.png`, Size line and key), "Part 4 done:
  names on the drawing" (`15.png`; she did not claim every name, and noted 6 were hidden), and
  "Part 5 done" (download present, passes the checklist) are all true. truth_on_screen: not
  applicable.
- **Activation:** yes. She picked PageRank from the "Start here" tag and ran it with no tooltip
  and no detour (`04.png` to `06.png`). She did hover the flask icon once to confirm it was
  Analyze before opening the list (`03.png`).
- **Usage card:** left unanswered; it closed on its own when the graph opened. No stated belief
  about what is sent.
- **Tool prints:** step 16's first try, `--click "Export#2"`, used a name form the tool does not
  resolve; nothing happened, and the next step clicked the dialog's Export button by position.
  No state changed and a person would have simply clicked the button, so this is not a tool
  fault and the session is not void. Her complaint that the dialog's button "has the same name
  as the menu item" comes from this tool miss, not from anything she saw.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                        | Evidence                                                  |
| --- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | 2        | behavior      | Labels are very small on screen and soft in the 2x export; Valjean's name, the picture's main point, sits on his own large dot and is crossed by his edges, so it is the hardest name to read. Elena believed it was hidden under the dot, and "6 hidden to avoid overlap" does not say which. | step 13 `15.png`, `19.png`, the download (around Valjean) |
| 2   | 2        | behavior      | No "Size" line on the Style tab; size is reached through "+" beside Shape. She had to guess the section.                                                                                                                                                                                       | step 7 `08.png`, step 8 `09.png`                          |
| 3   | 2        | behavior      | Adding Size gives a fixed size ("1"); sizing by a value is behind an unlabeled link icon whose purpose shows only on hover ("Size by attribute"). This is what made the session SD.                                                                                                            | step 9 `10.png`, step 10 `11.png`, `12.png`               |
| 4   | 1        | wording       | The run is picked as "PageRank" and then named "Influence"; for a moment she wondered whether she had run something else.                                                                                                                                                                      | step 5 `06.png`                                           |
| 5   | 1        | wording       | "Size by attribute": "attribute" reads as a database word to her.                                                                                                                                                                                                                              | step 10 `11.png`                                          |
| 6   | 1        | opinion       | The key gives raw decimals (0.003299 to 0.07543) with no low/high or less/more wording, so a reader of the exported picture learns only that higher is more.                                                                                                                                   | `13.png`, the download                                    |
| 7   | 1        | wording       | The Overview line "Undirected, from the file: directed 0" reads to her as a sentence with words missing.                                                                                                                                                                                       | step 2 `02.png`                                           |
| 8   | 1        | behavior      | The Analyze entry point is an unlabeled flask icon; she had to hover to confirm it.                                                                                                                                                                                                            | step 3 `03.png`                                           |
| 9   | 0        | opinion       | Before sizing, the orange shades of the Influence colors barely differ, so color alone told her little; only the Top 10 (one click away) said who mattered.                                                                                                                                    | step 5 `06.png`                                           |
| 10  | 0        | accessibility | The Export dialog and its Export button share the accessible name "Export". Harmless to a sighted user; listed for the accessibility check.                                                                                                                                                    | step 16 `18.png`                                          |

No problem in this session is a build defect under the criteria (no crash, dead control, wrong
count or keyboard block), so there is no repro directory for it. Problems 1, 2, 3, 4, 5, 6 and 9
repeat findings from the other Les Miserables first-session grade (Nadia) and count toward
confirmation as behavior, wording and opinion.
