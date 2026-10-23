# Grade: session r4-s24 -- Jordan (regular analyst), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), on the prompt and on the follow-up. Jordan kept only the pairs who share 5
or more chapters, answered "26 characters (51 ties)", the key's value, and brought every character
back by unticking the step. On the follow-up he edited the same step to 8, answered "17 characters
(19 ties)", the key's value, and brought everyone back again. The last screen (`12.png`) shows the
whole graph: the Filters row reads "shared_chapters is at least 8" over "off" with its checkbox
clear, the header chip is gone, the Overview reads Nodes 77 and Edges 254, every line is drawn, and
the key titles read "Size: PageRank" and "Color: PageRank" without "full graph".

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (one PageRank run labeled Influence,
nodes colored and sized by it). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **At 5 or more (right).** `07.png`: chip "26 of 77 nodes, 51 of 254 edges", row "shared_chapters
  is at least 5" over "77 to 26 nodes, 254 to 51 edges" (wrapped, "edges" on a third line), ticked;
  Overview "Nodes showing 26 of 77", "Edges showing 51 of 254". Jordan reported the node count as
  the characters (26), not the edge count, so not `read-wrong`.
- **Back (right).** `08.png`: checkbox cleared, row "off", chip gone, all 77 nodes and 254 edges.
- **Follow-up at 8 or more (right).** `11.png`: chip "17 of 77 nodes, 19 of 254 edges", row
  "shared_chapters is at least 8" over "77 to 17 nodes, 254 to 19 edges", ticked; Overview "Nodes
  showing 17 of 77", "Edges showing 19 of 254". He pressed "Save and turn on" and did not then tick
  the checkbox, so he did not fall into the trap the key describes (a tick after the save turns the
  step off).
- **Back again (right).** `12.png`, as above. One untick, as on the success path.
- **Work kept.** `work.json`: the PageRank run, the three style layers and the source Les
  Miserables are the same at start and end; nothing gone. The one addition is the filter step, left
  off (`step-1 off`, range on `data.shared_chapters`, min 8, nodes "ends"), which is how the key's
  success path ends.

## Measures

- **Door to the filter:** the Filters tool on the canvas toolbar (the funnel at 833,863), found by
  one hover (`02.png`, tooltip "Filters"); the key accepts it like the Filters "+". It opened "New
  filter step" with an empty Attribute (`03.png`); Jordan picked "shared_chapters" on the first try
  (`04.png`, `05.png`), so the grayed "Add step" with no hint never cost him anything.
- **Steps:** 11 `real.mjs` steps after the start (`02.png` to `12.png`). Prompt: 7 (hover, Filters,
  Attribute, shared_chapters, Value 5, Add step, untick). Follow-up: 4 (open the row, Value 8, Save
  and turn on, untick), the key's follow-up path exactly. The hover is the only action beyond the
  success path.
- **Wrong turns:** 0.
- **False "done":** none. Each claimed answer (26 and 51 at `07.png`, 17 and 19 at `11.png`) and
  each "everyone back" (`08.png`, `12.png`) is true on its screen. truth-on-screen: holds.
- **Silent commit:** none. Add step, Save and turn on and each untick changed the chip, the row's
  second line, the Overview and the drawing at once.
- **Out-of-date key:** the drawing's key titles read "PageRank, full graph" while the step was on
  (`07.png`, `11.png`). Jordan read it correctly (colors not rescaled) and did not rerun PageRank.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot and `leaks.json` shows no
  leaks over 35 calls.
- **Scripted exit:** not applicable; Jordan finished both parts.

## Problems

| #   | Severity | Kind        | Problem                                                                                                                                                                                                                       | Evidence                                                                                                  |
| --- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 1        | feedback    | The step editor gives no preview of what a value will keep before "Add step"; the count appears only after the step is committed, so hunting for a threshold takes a commit per try.                                          | `06.png` (Value 5, Add step enabled, no count); transcript step 5 and debrief                             |
| 2   | 1        | feedback    | While an edited value is unsaved, the editor's header still names the saved rule ("shared_chapters is at least 5" over a Value of 8), which made Jordan wonder for a moment whether his 8 had taken. Known on this build (answer key, T17 follow-up notes). | `10.png`; debrief "for a second I wondered whether my 8 had taken"                                        |
| 3   | 1        | control     | The editor of a step that is off offers only "Save and turn on"; there is no way to save a changed value while leaving the step off. Not needed for this task.                                                               | `09.png`, `10.png`; debrief                                                                               |
| 4   | 0        | wording     | The canvas toolbar tooltip reads only "Filters", which Jordan thought a first-timer looking for "only strong ties" might not connect to the task. He found it at once.                                                       | `02.png`; debrief                                                                                         |

All four rest on one participant and are not confirmed by this session alone. Problem 2 is already
recorded in the answer key for this build.
