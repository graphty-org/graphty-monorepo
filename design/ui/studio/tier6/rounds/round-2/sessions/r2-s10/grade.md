Grade: S
False done: no
Wrong turns: 0
Model calls: 9
Failure: none
Participant model: claude-opus-5-5 (74 of 74 model lines in the participant's log; no line in it or in transcript.md names sonnet)
Steps: 10 actions, plus 3 waits that do not count. 5 of the actions are the success path, which with its 2 reads makes the key's 7 steps. The other 5 are one look inside "2 steps" and 4 checks after the look was already back

# Session r2-s10: T94 B, Grace (returning), volunteers-thanks project

**Result.** Grace had the Assistant color everyone by crew and then size them by hours, pressed the
Undo under the newest answer, pressed the Undo that then appeared under the first answer, and
reported how she knew the project was back. Every record agrees that it is. She reached the start
state on the success path at step 9, so the grade is S. The checks she made afterwards changed
nothing and led nowhere wrong, so they are neither a detour nor a wrong turn.

**Why it is not void.** `leaks.json` read the session's transcript and found no leaks in 30 calls.
The session ran on the frozen build named in `criteria.md` (`session.json`: 3b2a7f0649, no
uncommitted changes; `route.jsonl` serves `.study-builds/tier6-r1d2-3b2a7f0649`). Every step ended
with code 0 and nothing missed, and no model call failed.

**What the records show.**

- `styles-steps.jsonl`: `look` is d531fe5816d6 on the first line, 013fe4ea72ce after the color,
  d75feb76a12f after the size, 013fe4ea72ce after the first Undo, and d531fe5816d6 from `10.png`
  to the last line, always with `graph: true`.
- `styles.json`: `changes` lists nothing gone, added or changed.
- `work.json`: 9 layers at the start and the same 9 at the end, no runs at either end, nothing gone.
  The community run did not stay behind.
- `key.json` and `14.png`, the last screen: the card reads "Color: Thank-you cards", 6 of 24 nodes;
  18 nodes are drawn #6366f1 and 6 are drawn #008000.
- The network area of `01.png` and `14.png` is identical, pixel for pixel. Her "same positions" holds.
- `data.json`: 24 nodes, 63 edges, one source, no filters, the file's 6 columns only.
- The conversation: `10.png` shows both turns with their rows reading Undone. It is the last screen
  with the panel open, since she then moved to Graph and Data. Session r2-s09, on the same build,
  shows a conversation still there after the same move (its `09.png`).
- `14.png`: the Undo arrow at the top is gray and Redo is lit, as she said.

**Counts on screen.** All true. "Computed Communities for 24 nodes" and the reply's 3 groups of 8
match the picture: `06.png` draws 8 nodes in each color. "Sized 24 nodes by hours" and 2 to 52 match
the file's lowest and highest hours.

**How the reader got there.**

- Step 1: Assistant.
- Step 2: the color request. Steps 3 and 4 were waits. The picture changed at once, before the reply
  (`03.png`), and the reply arrived in `05.png`.
- Step 5: opened "2 steps" to see how the groups were made.
- Step 6: the size request. Step 7 was a wait.
- Step 8: Undo on the newest turn (`09.png`, notice "Undid Make the people with the most hours
  bigger as well.").
- Step 9: Undo on the first turn, which had come back (`10.png`). The look is the start's from here.
- Steps 10 to 13: Graph, Data, Table, close the table. Checking only.

**The report.** It says how she knows, and each thing it says was on screen first: both notices, both
Undone rows, the card, the four layers with their counts (`11.png`), the 24 and 63, the one source,
the 6 columns and the gray arrow. She did not claim the saved copy is back: she says she trusted
Autosave and did not reopen the project.

**What the round asked of this session.**

- Reversal: the turn's Undo, twice. She chose it over asking the Assistant because she knew what Undo
  does and would not spend another question.
- Layer list: she did want it. With the look back, she left the Assistant for Graph to compare the
  layers with the list she wrote down at the start, then went on to Data and the table.
- A change that applies at once: not comfortable. On a colleague's finished project she wanted to be
  asked first, or told the project was safe, and "Autosave: saved" appearing mid-change added to that.

**Bar 7.** Holds for this session: picture, layers and runs as they started, after two changes, with
the conversation there.

**Problems.** None blocked her or left her with a wrong belief, and no severity 3 was seen. Nothing
here is a build fault that a scripted path would need to prove: each item below is what the design
does, what the model said, or a word already recorded. None is marked as a build defect.

| Sev | Kind     | Problem                                                                                                                                                                                                                                                                                                                                               | Evidence                     |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 2   | wording  | The model's: "Detected 3 distinct crews of 8 people each" states as a finding what was worked out from the links. The file has no crew column, and the reply does not say so. The screen gave a way to tell ("Computed Communities", the table), but she only found it by opening the table at step 12, after the groups were gone                    | Steps 4, 12; 05.png, 13.png  |
| 2   | behavior | The change replaced a colleague's finished look and "Autosave: saved" showed while it happened, with nothing saying what the save holds. She could not tell whether the project had been overwritten, and at the end took the saved copy on trust. Applying at once is the design; what is unanswered is what Autosave means for it                      | Steps 2, 13; 03.png, 14.png  |
| 1   | wording  | The key card says "Color: Louvain" with Group 1, 2, 3 to a reader who asked for crews. Already in the backlog for this task                                                                                                                                                                                                                             | Steps 2, 4; 03.png, 05.png   |
| 1   | behavior | The first turn's Undo goes when the second turn lands, and she briefly thought the way back was lost. It returned after the next Undo. `decided.md` settles Undo on the newest step only, so this is friction, not a fault                                                                                                                              | Steps 6, 8; 07.png, 09.png   |
| 1   | wording  | "Open run" and "Open layer" meant nothing to her and she pressed neither. "Communities" and "Algorithm results" under the steps told her little about what was done                                                                                                                                                                                    | Steps 5, 7; 06.png, 08.png   |
| 1   | behavior | The key card, grown by the size row, covers nodes at the top left. `decided.md` settles the card as an overlay that may cover a node                                                                                                                                                                                                                   | Step 6; 07.png, 08.png       |
| 1   | opinion  | "Sends to Google" is seen and read as honest, but nothing she opened said exactly what leaves, and the file holds real names and phone numbers                                                                                                                                                                                                         | Steps 0, 1; 01.png, 02.png   |

These are simulated sessions, and the model behind the Assistant varies from run to run. A pass here
is weak evidence until real people confirm it.
