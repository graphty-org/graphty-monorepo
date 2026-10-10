# Grade: session r1-s16 -- Tom (returning), T17 prompt B (Les Miserables)

**Grade: G (gave up).** Not a success.

Build 946256efb876 (graphty@0.8.56), as `session.json` records; no uncommitted changes.

## Why G

The task asks for a drawing that has only the pairs sharing 5 or more chapters, the count of
characters left (26 of 77), and every character brought back. The last screenshot (`10.png`) shows
the whole Les Miserables network unchanged: no filter step, no "26 of 77 nodes" chip, the left
list holding only Selection, PageRank (77) and Everything, and the find box reading "No match for
'chapters'". No count was stated and nothing was narrowed, so there was nothing to bring back.
Tom stopped and said he would ask a colleague for a picture instead: he left the task, which is G
rather than F. The follow-up prompt was not given (it goes only to sessions that succeeded).

## Not void

The first setup start failed (`failed-start-1/`): the setup's own click on "PageRank" timed out at
Playwright's "done scrolling" stage under a machine load average of about 158, and every later
setup step missed. That attempt was discarded and the second start reached the setup's end state
(`01.png`: ranked, colored and sized by PageRank, as the answer key says a ranked setup ends). The
session itself ran on a correct start, and every step after it acted on screen as described, so it
is scored.

## Claims

- False "done": **none.** Tom said plainly that he had not finished and had no count.

## Wrong turns: 3

1. Opened Analyze and searched it for "chapters" (`02.png`, `03.png`: "No analysis matches
   'chapters'"). Narrowing the drawing does not live there.
2. Hovered the Layout button to learn its name (`05.png`).
3. Typed "chapters" into the left "Find nodes, edges, values" box (`09.png`, `10.png`: "No match
   for 'chapters'").

The three attempts to close the Analyze list (canvas click, Escape twice) are not counted as wrong
turns: each was a normal way to dismiss a popover, and they failed because of the defect below.

## Problems

| Sev | Problem | Evidence |
| --- | ------- | -------- |
| 4 | No route to narrowing the drawing was found. The filter lives on the Data page (an attribute's "Filter to...") or the Filters "+" step; nothing on the first screen points there, and the participant left without finding it. Neither search box knows the task's words: the attribute is named `shared_chapters`, yet "Find nodes, edges, values" answers "No match for 'chapters'" and Analyze's "Filter analyses" answers "No analysis matches 'chapters'". Nothing on the screen names the ties' number at all, so the participant had no word to look for. One participant; behavior, so not confirmed until a second session shows it. | `03.png`, `10.png`; transcript steps 2, 8 and 9; debrief "Nothing on the screen says 'ties' or 'chapters' anywhere" |
| 2 | Build defect: the Analyze popover does not close on a click on the empty canvas or on Escape. The first Escape only empties its search box (`04.png`); a click on the canvas un-presses the flask button but leaves the list open (`06.png`); a second Escape moves focus to the canvas (it gains an outline) and the list stays (`07.png`); only a second press of the flask button closes it (`08.png`). Cost three steps, and the participant said "I thought I had broken it". Not in the answer key, so the task pilots did not meet it. Confirmed at one participant once a scripted repro (open Analyze, Escape, click canvas, Escape) shows the same on the build. | `04.png`, `06.png`, `07.png`, `08.png`; transcript steps 3 to 6 |
| 1 | The pressed state and the open state of the Analyze button disagree: after the canvas click the button looks unpressed while its list is still open, so the button no longer tells the reader the list belongs to it. | `06.png` against `02.png` |
| 0 | Setup reliability (tool, not the app): the setup's click on "PageRank" exceeded the tool's 3-second click limit while the machine was saturated (load about 158 on 32 threads, about ten software-rendering headless Chromium processes and a vitest run). Recorded for the run log; it did not affect the scored session. | transcript "Start"; `failed-start-1/` |

## Notes for the round

- This session's failure is a discoverability failure (where filtering lives, and what the data
  calls the ties' number), with an implementation defect on the way: the Analyze popover that will
  not dismiss. The defect did not decide the grade -- after closing the list Tom still had no path
  to the filter -- but it is the kind of flaw a dry run on this build should have caught before a
  participant met it.
- The answer key's success path starts from Data, and the rail's Data button was on screen the
  whole time (`01.png` to `10.png`); Tom's history names only the analysis button, so he never
  tried it.
