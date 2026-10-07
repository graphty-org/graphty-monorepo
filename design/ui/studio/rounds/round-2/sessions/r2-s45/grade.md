# Grade: session r2-s45 -- Morgan (screen-reader analyst), a file that will not read

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), screen-reader mode, keys only. Graded
from the last screenshot (37.png), the screenshot after the file was chosen (10.png), the
transcript and a scripted keys-only re-run on the same build. No files were downloaded (the task
asks for none).

## Grade: S (success)

- **Success definition met.** At step 10 the refusal was announced as an assertive alert:
  "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was
  read. Ask for the file again." The same sentence is on screen in 10.png. Morgan's message for the
  coworker matches it: incomplete or damaged near line 9, nothing was read, send it again.
- **Not misled about the result.** Morgan noticed that "No nodes to draw" briefly sounded like an
  empty graph had loaded, but the alert that followed settled it, and the last screenshot (37.png)
  shows the start page with nothing loaded, which is what Morgan says.
- **Why S, not SD:** one attempt, no tooltip needed, and the refusal was understood on first
  hearing. The one wrong turn (below) came after the task was already done and did not change the
  answer.
- **Whole task from the keyboard:** yes.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 36 after the start; 9 to the refusal (7 Tabs, Ctrl+O, the file) | 2 (pointer path) |
| Key presses to the refusal | 8 keys plus the file | 18 keys (keyboard path) |
| Wrong turns | 1 | -- |

Wrong turn:

1. Step 25: pressed the toast's close button, named only "Dismiss", to find out what it closed. It
   closed the refusal, the only place its text existed, and focus fell to the page body. Morgan
   had the text in braille notes already, so the answer survived.

The Tab sweeps at steps 11-24 and 26-37 were a search for the refusal on the page (it is not in
the Tab order), not wrong turns.

## False "done"

None. Morgan's closing claims -- the file is incomplete or damaged near line 9, nothing was read,
the app is back at its start page with nothing half-loaded -- all match 10.png and 37.png.

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by `rounds/round-2/repro/r2-s45/repro.sh`
(screen-reader mode, keys only, Morgan's own path; output in `run/` and `run.log`). Two runs
behaved the same as the session.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The refusal's text cannot be reached or read again: it is not in the Tab order, and its only control is a close button named just "Dismiss", which says nothing about what it closes. Pressing it destroys the only copy of the refusal. A screen-reader user who misses or mishears the one announcement has nothing to tell the coworker. The name comes from compact-mantine's Toast default (`closeLabel = "Dismiss"`), which the app's notice view does not override. | Steps 11-25, 10.png, 25.png. Repro: `run.log` 12th Tab "focus: button \"Dismiss\"", `run/15.png`. |
| 2 | 2 | build-defect | The refusal is announced twice in a row as an assertive alert, a full interruption repeated at a fast speech rate. Only one toast is visible. | Step 10, 10.png. Repro: `run.log` section A, two identical "live: alert (assertive)" lines, `run/03.png`. |
| 3 | 2 | build-defect | Before the refusal, a polite status "No nodes to draw" is announced, so for a moment the failed open sounds like an empty graph that loaded. The app's own canvas code notes that graphty-element's load event names no source and does not tell a watcher a load was refused, so the empty-canvas card can show during a refused load (graphty-element issue #902); the fix belongs there, not in the app. | Step 10. Repro: `run.log` section A, "live: status (polite): \"No nodes to draw\"" before the alert. |
| 4 | 2 | accessibility | Focus is lost twice: it falls to the page body when the refusal appears (the answer key expects this), and again when "Dismiss" is pressed, with no announcement of what closed. Morgan had to Tab from the top both times to learn where they were (WCAG 2.4.3 focus order). | Steps 10, 11, 25, 26-37. Repro: `run.log` "focus: nothing (the page itself)" after the file and after Enter on Dismiss, `run/16.png`. |
| 5 | 1 | build-defect | The refusal toast sits over the usage-data card at the foot of the start page, covering the end of "Nothing is collected until you answer" and the card's right half. The same placement on every run. Sighted users only; Morgan was not affected. | 10.png. Repro: `run/03.png`. |
| 6 | 1 | opinion | "Near line 9" gives the place but not the fault. Saying the file stops part-way (cut off) versus contains broken markup would let the reader tell a cut-off download from a broken export. Held one level down as opinion. | Step 10 comment and debrief. One participant. |
| 7 | 1 | opinion | No headings to jump by on the start page; Morgan Tabbed through every button. Not checked: the tool reports focus and live regions, not headings, so this is Morgan's impression in a keys-only session. Held one level down as opinion. | Steps 2-8 comment, debrief. One participant. |

Positive: "Local only" is the second control in the Tab order and answered Morgan's first question
about where the file goes; the Ctrl+O shortcut in the button's name saved the rest of the walk.
