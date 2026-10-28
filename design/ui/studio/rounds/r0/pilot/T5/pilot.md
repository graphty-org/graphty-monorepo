# Pilot: T5, a file that will not read

Build under study: graphty@0.8.53, build 452285142099, commit 452285142, opened at `/?next` (from
`session.json`). Viewport 1440 x 900. An earlier pilot of this task, on build 9d6598eea3e9, is kept
in `previous/`; this build behaves the same.

## Verdict

The end state is reached in the two steps the answer key gives. `club-members.graphml` has eight
full lines and is cut off part way through a ninth. After opening it, the app stays on the start
screen and shows:

> club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was
> read. Ask for the file again.

That is everything the success criterion asks for: the file is incomplete, where (line 9, which is
correct), and what to tell the coworker (send it again). The task can run as written.

## Steps

| Step | Command                                                                                                | Screenshot | What the screen shows                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                                                                                    | `01.png`   | Start screen: Open project or file..., New from data..., empty Recent projects, four samples, the usage-data card.                 |
| 2    | `--click "Open project or file..." --upload club-members.graphml`                                      | `02.png`   | Still the start screen. The refusal above, with a close button, at the bottom of the window. No project opened, no console errors. |
| 3    | `--expect "role=alert" --expect "incomplete or damaged near line 9" --expect "Ask for the file again"` | `03.png`   | Unchanged; all three pass, so the refusal is in an alert and is announced assertively.                                             |
| 4    | `--wait 15000 --expect "Ask for the file again" --expect "role=alert"`                                 | `04.png`   | 15 seconds later the refusal is still there; both pass.                                                                            |
| 5    | `--reopen`                                                                                             | `05.png`   | New tab: Recent projects is still empty, so the failed file left no empty project behind.                                          |

## Blockers

None. Nothing stops the success path, and the keyboard path's requirement (an assertive
announcement) is met.

## Minor observations (not blockers)

1. **App, cosmetic:** the refusal sits on top of the usage-data card and hides the end of its line
   "Nothing is collected until you answer." (`02.png`). Neither text becomes hard to read.
2. **App, wording:** the message names the file "club-members" without its `.graphml` extension. A
   participant still knows which file is meant.
3. **Study tool:** the upload step printed only `chose the file club-members.graphml` and the
   screenshot path, not the alert text, although the tool's README says each command prints what a
   participant would notice. A participant who reads only the printed output could miss the
   refusal; one who looks at the screenshot will not. Printing new alerts in the step output would
   close this.

No task-wording or answer-key problem: the answer key's path and success line match the screen.
