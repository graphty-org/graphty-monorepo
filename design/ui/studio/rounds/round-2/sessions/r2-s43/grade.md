# Grade: session r2-s43 -- Tom, a file that will not read (club-members.graphml)

**Grade: SD** (success with difficulty). Tom reached the refusal on the first try, and it gave
him everything the task asks for: the file is incomplete or damaged near line 9, nothing was
read, and he should ask for the file again (`02.png`). He did not trust it on its own, though.
In his words, he wanted "to be sure it is not just me using the wrong button" before emailing the
coworker. So he opened the same file a second way and peeked at File settings before he was sure
what to say. The task's rule gives SD to a participant who needs a second attempt to understand
the refusal, and that is what happened here. The second attempt is what made him confident, even
though it told him less.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.
No files were downloaded, and none were expected for this task.

## What the screen shows at the end

The last screenshot (`05.png`) is the "Open as a new graph" page with a red box that reads
"club-members.graphml could not be read as GraphML. Check the file, or pick another format in
File settings." Load is disabled ("The file could not be read"), the File settings popover is
open (Format: Auto, Error limit 100), and no graph is loaded. He did not change any setting.
The message he says he will send ("will not open -- the program says it is incomplete or damaged
near line 9 and nothing was read. Can you send it again") matches the refusal in `02.png` word for
word on every fact. Nothing on any screen says the file loaded.

## Measures

- **Steps:** 4 `real.mjs` steps after the start (`02.png` to `05.png`). The success path is 2
  actions, and Tom's step 2 did both (after "No thanks"), so he was on the path after one step.
- **Wrong turns:** 3, all after he had already reached the refusal, and all to confirm it:
  "New from data..." (`03.png`), choosing the same file there (`04.png`), and opening File settings
  (`05.png`).
- **False "done":** none. His "Did I finish? Yes" is true. He reached the refusal and knows what
  to tell the coworker, and the screen never suggested that anything loaded. truth_on_screen:
  not applicable.
- **Usage card:** declined ("No thanks", step 2).
- **Tool prints:** none unusual, and session.log is empty. This is not a tool fault, and the
  session is not void.
- **Build-decided:** no. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The same damaged file is refused with two different messages. "Open project or file..." says "the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again." "New from data..." says only "could not be read as GraphML. Check the file, or pick another format in File settings." The second message leaves out the cause and the line, and its advice points the other way: it suggests the file may be fine and the format setting is wrong. A user who goes in that way first has nothing to tell the sender and may start changing formats on a broken file. Tom said that if he had gone there first, he would have been less sure what to tell the coworker. Ruth (r2-s44) met the same pair of messages. | Steps 2 and 4 (`02.png`, `04.png`). Reproduced: `rounds/round-2/repro/r2-s43/repro.sh` opens club-members.graphml through "Open project or file..." and then through "New from data...". Its `run/02.png` shows the detailed refusal and `run/04.png` the short one, the same as the session. |
| 2 | 2 | behavior | The refusal is a toast low on the screen, and it vanishes for good once the user moves on. Nothing keeps it: it cannot be reopened, and copying it into an email is awkward. Tom wanted to paste it into his email to the coworker. Ruth (r2-s44) also lost the first message when she went to "New from data..." and said that without writing it down she would have lost the line number. | Steps 2 and 3 (`02.png`, `03.png`) |
| 3 | 2 | wording | File settings offers "Error limit -- Bad rows read past before the file is refused: 100". Nothing tells a user whether raising it would load a broken file part of the way, or whether they would then be told what was left out. Tom read it as a way to let a broken file in half-read and stayed away from it. Seen in this session only. | Step 5 (`05.png`) |
| 4 | 2 | accessibility | Small gray text is hard to read for a user with weak eyesight: "Drop a file here, or choose a file...", "Choose a file first", "The file could not be read" (next to Load) and the start page's helper lines. Several other sessions in this round also say small gray text is hard to read. | Steps 3 and 4 (`03.png`, `04.png`); next to Load in `05.png` |

Problem 1 is a build defect. The scripted path above does the same thing on every run, so under
the criteria it is confirmed even with one participant. Ruth (r2-s44) also met it. Problem 2 is
confirmed by two participants (Tom and Ruth). Problem 4 is confirmed by the other sessions that
report small gray text. Problem 3 comes from this participant only.
