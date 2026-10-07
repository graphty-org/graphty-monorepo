# Grade: session r3-s52 -- Morgan (screen-reader analyst), a file that will not read (club-members.graphml)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900,
screen-reader mode (keyboard only, graded from the focus and live-region lines the tool printed),
empty start. Graded from the last screenshot (08.png) and the transcript; the task saves no file
and `downloads/` does not exist. Not graded from the participant's rating (6 of 7).

## Grade: S (success)

The success definition asks that the participant reach the refusal and be able to tell the
coworker the file is incomplete or cut off (and where, if the screen says), and that it must be
sent again whole.

- **Refusal reached:** at step 4, right after choosing the file, the assertive alert read
  "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was
  read. Ask for the file again." The message is still on screen in 05.png and 08.png.
- **What to tell the coworker:** the debrief answer is "club-members.graphml is incomplete or
  damaged near line 9 -- the program read nothing from it. Please send it again; it looks cut
  off." That is the file, the fault, the place and the action, all as the screen said them.
- **Not misled:** he never believed anything loaded ("I did not end up with anything to work on")
  and never blamed his own action.

**Why S and not SD:** one attempt, no tooltip, no help. He understood the refusal on first
hearing. Steps 5-7 were checks that the message could be found again, taken after he already had
the answer; the trouble he met there (focus loss, Shift+Tab going nowhere) cost him nothing on
the task itself.

- **Build-decided:** no. The two build defects below are real but did not decide the grade.
- **Void:** no tool fault; every command did what was asked, and the scripted repro printed the
  same lines.
- **Keyboard bar:** S for Morgan on this task. The refusal was announced as an assertive alert, as
  the task requires.
- **Failure codes:** none.

## Counts

| | This session | Success path (round 3) |
|---|---|---|
| Steps | 7 (steps 1-7); success at step 4 | 2 (pointer) / 18 keys (keyboard) |
| Keys to the refusal | 5 (Tab x3, Enter, the file) | 18 |
| Wrong turns | 1 | -- |

- He never dismissed the usage-data card; it does not trap focus, so Tab reached "Open project or
  file..." in 3 presses instead of the 11 + Enter + 5 of the rehearsed path. Fewer keys, not a
  shortcut around anything.
- Step 1 (`--read` of the start page) is orientation a screen-reader user does; not a wrong turn.
- **Wrong turn, step 6:** Shift+Tab from the page body to reach the message at the end of the page;
  focus went nowhere. It came after success and cost one step.
- Step 7 (Tab, landing on "Main menu") was his recovery; he then stopped.

## False "done"

None. "I know what to tell my coworker. Done." (step 7) matches the screen: the refusal is on
screen in 08.png and in the browse-mode read at step 5, and he stated it correctly.

## Problems

Only one participant has taken this task so far. Problems 1-3 are build defects confirmed by the
scripted repro below; the rest are seen in this participant only.

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | The refusal is announced twice, word for word, back to back, as two assertive alerts. At screen-reader speed that is a whole sentence repeated, and he wondered "whether two things failed". | 2 | build-defect | step 4 (transcript, two `live: alert (assertive)` lines); repro runs 1 and 2, step 04 |
| 2 | When the file chooser closes on a refused file, focus falls to the page body: not back on "Open project or file...", not on the message. From there Shift+Tab lands nowhere and Tab restarts at "Main menu", the far end of the page from the message's "Dismiss" button. Already listed in the answer key as a known focus defect after a refused file. | 2 | build-defect | steps 4, 6, 7; 05.png, 07.png, 08.png (focus on "Main menu"); repro runs 1 and 2, steps 04-06 |
| 3 | The refusal toast is drawn on top of the usage-data card and covers part of its text ("Nothing is collected until you ans we..." is cut off under it). Morgan cannot see it; a sighted user on this screen would. | 1 | build-defect | 05.png, 08.png; repro run1/04.png |
| 4 | The message sits last in reading order, after the whole start page and the long usage-data paragraph and its two buttons, so a top-down read hears everything else first. | 2 | accessibility | step 5 (browse-mode read); debrief |
| 5 | "Damaged near line 9" does not say what is wrong there or that the file ends early, so the coworker will ask "line 9 of what?" | 1 | wording | step 4; debrief |
| 6 | The usage-data paragraph is long and mentions "his Claude Code sessions"; he skips it and will skip it every time it is there. | 1 | wording | step 1; 01.png; debrief |

**Repro.** `rounds/round-3/repro/r3-s52/repro.sh` runs the same keyboard path twice in
screen-reader mode (Tab x3, Enter, choose club-members.graphml, Shift+Tab, Tab) on commit
f108a2350. Both runs (`run.log`, `run1/`, `run2/`) print two identical `live: alert (assertive)`
lines after the upload, `focus: nothing (the page itself)` after the upload and after Shift+Tab,
and `focus: button "Main menu"` after Tab; both 04.png show the toast over the usage card. The
toast component holds a single `role="alert"`, so the double line means the alert is mounted or
filled twice, not two regions by design; the cause was not traced further.

**What worked:** the refusal is one sentence a person can repeat -- the file, that nothing was
read, where, and what to do -- with no error code; it stays on the page after it is announced;
the start page has real headings and named buttons, the Open button speaks its Ctrl+O shortcut,
and Tab order follows reading order; "Files are read on this computer and never uploaded"
answered his first question before he asked it.
