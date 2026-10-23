# Pilot: T5, a file that will not read

Build under study: graphty@0.8.53, build 9d6598eea3e9, commit 9d6598eea, opened at `/?next` (from
`session.json`). Viewport 1440 x 900.

## Verdict

The end state is reached in the two steps the answer key gives. `club-members.graphml` is cut off
in the middle of its second `<key>` element, on its ninth line (eight full lines, then a partial
one). After opening it, the app stays on the start screen and shows:

> club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was
> read. Ask for the file again.

That gives the participant everything the success criterion asks for: the file is incomplete, where
(line 9, which is correct), and what to tell the coworker (send it again). The task can run as
written.

## Steps

Main session (this folder):

| Step | Command                                                              | Screenshot | What the screen shows                                                                                                              |
| ---- | -------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                                                  | `01.png`   | Start screen: Open project or file..., New from data..., empty Recent projects, four samples, the usage-data card.                 |
| 2    | `--click "Open project or file..." --upload club-members.graphml`    | `02.png`   | Still the start screen. The refusal above, with a close button, at the bottom of the window. No project opened, no console errors. |
| 3    | `--expect "role=alert" --expect "incomplete or damaged near line 9"` | `03.png`   | Unchanged; both expects pass, so the refusal is in an alert and is announced assertively.                                          |

Second session (`persist/`), checking that the refusal does not vanish and leaves no trace:

| Step | Command                                                                | Screenshot       | What the screen shows                                                                     |
| ---- | ---------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                                                    | `persist/01.png` | Start screen, as above.                                                                   |
| 2    | open and upload, as above                                              | `persist/02.png` | The same refusal.                                                                         |
| 3    | `--wait 15000 --expect "Ask for the file again" --expect "role=alert"` | `persist/03.png` | 15 seconds later the refusal is still there; both expects pass.                           |
| 4    | `--reopen`                                                             | `persist/04.png` | New tab: Recent projects is still empty, so the failed file left no empty project behind. |

## Blockers

None. Nothing stops the success path, and the keyboard-path requirement (an assertive
announcement) is met.

## Minor observations (not blockers)

1. **App, cosmetic:** the refusal sits on top of the usage-data card and hides the end of its
   line "Nothing is collected until you answer." (`02.png`). Neither text becomes unreadable
   enough to matter for this task.
2. **App, wording:** the message names the file "club-members" without its `.graphml` extension.
   A participant still knows which file is meant.
3. **Study tool:** the upload step printed only `chose the file club-members.graphml` and the
   screenshot path, not the alert text, although the tool's README says each command prints what
   a participant would notice. The screenshot carries the message, so a participant who looks at
   it is not misled; a participant who reads only the printed output might be. Worth printing new
   alerts in the step output.

No task-wording or answer-key problem: the answer key's path and success line match what the
screen shows.
