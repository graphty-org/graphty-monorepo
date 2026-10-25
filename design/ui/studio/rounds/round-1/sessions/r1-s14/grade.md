# Grade: session r1-s14 -- Grace, names on every dot (College football)

- **Grade:** SD (success with difficulty).
- **Why it is a success.** The last screenshot (`11.png`) shows a label line on Everything, which
  covers all 115 teams, bound to the `label` attribute (the line reads "Abc label"). Team names
  are drawn beside the dots across the canvas (GeorgiaTech, Maryland, Arkansas, Arizona,
  California and so on). The panel reads "115 labels, 14 hidden to avoid overlap", and Grace read
  it and said why the 14 are missing: "14 of them are hidden on purpose" because they would
  overlap, and she found no way to show them. That is the correct reading: this build has no
  control that draws every name.
- **Why it is SD and not S.** She first opened the graph-level Style tab, found no names setting
  there, and only reached Everything by guessing (step 4). She also hesitated between `id`,
  `label` and `value` with no example values to tell them apart (step 6). The four steps after
  the names appeared were dead ends hunting for a "show all" that does not exist.
- **False "done":** no. She said "Mostly, not fully ... 14 of them are hidden", which matches the
  screen. No `truth-on-screen` claim.
- **Build-decided:** no. The wheel defect below cost one step after the task was already met.
- **Void:** no. `real.mjs` did nothing a person could not do. Note: the session start waited about
  an hour for a free browser slot; that does not affect the grade.
- **Downloads:** none, and none needed for this task.

## Measures

- **Steps:** 10 tool steps after the start (`02.png` to `11.png`, one hover included). The
  success path is 4 steps from the start screen (open, Everything, Add label line, pick the
  attribute) plus declining the usage card. Success was reached at step 7 (`07.png`), 6 steps in,
  about 1.5x the path.
- **Wrong turns:** 5. One before success: the graph-level Style tab (step 4), abandoned. Four
  after success, all looking for a way to show the hidden names: Label position "Aa" (step 8),
  hovering the hidden-count note (step 9), reopening the attribute list "Abc label" (step 10),
  the mouse wheel (step 11). Each was abandoned.
- **Recovery:** succeeded despite the early wrong turn.
- **Ease (from the transcript):** Grace answered 4 on a scale the transcript wrote as "1 = very
  easy, 7 = very hard", the reverse of the Single Ease Question; on the standard scale it is 4 of 7.
- **Usage card:** declined with "No thanks", no detour. No wrong belief: she relied on "Files are
  read on this computer and never uploaded" and "Local only".
- **Silent commits:** none. Picking `label` (`06.png` to `07.png`) drew names on the canvas.
- **Counts against the drawing:** no disagreement seen. Values shows 115 nodes, matching the
  sample's 115 teams, and the label note's 115 matches.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                       | Evidence                                                                                                                                                                                                                                                    |
| --- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | build-defect | Turning the mouse wheel over the drawing does not zoom, so Grace could not make room for the hidden names or enlarge the tiny ones.                                                           | Step 11: `11.png` is the same drawing as `10.png` (only the attribute list closed) and the note still reads 14 hidden. Already reproduced as a scripted path on the same build in sessions r1-s10b, r1-s11b, r1-s15b and r1-s19b (`rounds/round-1/repro/`). |
| 2   | 2        | behavior     | "14 hidden to avoid overlap" says names are missing but offers no way to act on it and does not say which 14. Hovering it shows nothing. Grace ended unable to put every team on the drawing. | Steps 7-10; `07.png`, `09.png`. Expected on this build per the task definition.                                                                                                                                                                             |
| 3   | 2        | behavior     | The graph-level Style tab has no labels setting; the names live under Everything, and nothing points there. Grace found it by guessing.                                                       | Step 4, `04.png`. Also seen in session r1-s16b.                                                                                                                                                                                                             |
| 4   | 2        | behavior     | The attribute list offers `id`, `label`, `value` with no sample values, so a newcomer guesses which holds the team names.                                                                     | Step 6, `06.png`; step 10, `10.png`.                                                                                                                                                                                                                        |
| 5   | 2        | opinion      | The labels are very small and pile on top of each other and on the lines; there is no text-size control near the label line. Grace would not put this on a slide.                             | `07.png`, `11.png`.                                                                                                                                                                                                                                         |
| 6   | 0        | opinion      | Team names have no spaces ("NewMexicoState"). That is the sample's data, not the app.                                                                                                         | `07.png`.                                                                                                                                                                                                                                                   |
