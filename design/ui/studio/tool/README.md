# Driving the real graphty app in a study

`real.mjs` lets a study participant (or a pilot, or a grader) use the real graphty app one step at
a time: it opens the app in a headless browser, does what each step says, waits for the drawing to
settle, and saves a numbered screenshot of the whole 1440 x 900 window after every step. Each
session is one live browser, so the graph stays exactly where the participant last saw it.

The app under study is the production build in `graphty/dist` of this worktree, opened at `/?next`
(the tier 1 workspace; the parameter goes away when that workspace becomes the default). The tool
serves the build itself on a loopback port, so no dev server or network is involved. Rebuild the
app after changing it: `pnpm exec nx run graphty:build` from the worktree root, with the Sentry
variables unset. To study a build that others' rebuilds must not replace mid-session, copy
`graphty/dist` and start with `REAL_DIST=<the copy>`; the session serves that copy until `--end`.

## A session

```bash
T=design/ui/studio/tool
node $T/real.mjs --start rounds/r1/p03-t2 empty                  # 01.png: the empty app, clean storage
node $T/real.mjs --step  rounds/r1/p03-t2 --click "No thanks"    # 02.png
node $T/real.mjs --step  rounds/r1/p03-t2 --click "Open project or file" --upload friends.csv
node $T/real.mjs --step  rounds/r1/p03-t2 --click-at 702,380     # point at the last screenshot
node $T/real.mjs --end   rounds/r1/p03-t2                        # always end: it frees the browser
```

Every command prints what a participant would notice, then the path of the new screenshot. A
notice the app took down before the screenshot (it keeps one for 6 seconds, and a step can take
longer to settle) is printed as `a notice showed and went before this screenshot: "..."`, since a
person watching would have read it.

- `--start <folder> empty` opens the app as a first-time visitor sees it.
- `--start <folder> setup:<file>` runs the setup file's steps first and never shows them: one step
  per line, unquoted (`--click Open the Zachary's karate club sample`); `#` lines are comments.
  `<file>` is looked up in the folder the command runs in, then `../tier2/`, then
  `../rounds/tier-2/setups/`; a file in none of them prints one `SETUP FAILED: no such setup file`
  line and exits 2, with no session started. A
  setup step that misses fails the start with `SETUP FAILED`, which is itself a finding. A setup
  click waits up to 20 seconds for its control (a participant's click, 3), since nobody waits on it
  and a loaded machine can take longer than 3 seconds; a control that never becomes clickable in
  that time still fails the start. When the
  setup ends, nothing has focus and the pointer is off the page, as when a saved project is
  reopened: the participant does not arrive to a focus ring or a hover on the control the setup
  used last.
- `--start <folder> empty --sr` (or `setup:<file> --sr`) starts a session in screen-reader mode;
  see below.
- The folder gets `01.png`, `02.png`, ..., `session.json`, `session.log` (the session process's
  own log), `setup.log`, and `downloads/`. In `session.json`, `commit` is the served build's own commit (from its build stamp, the
  `graphty-build` meta tag in `REAL_DIST`'s `index.html`, or else a frozen folder's name such as
  `tier2-r1d2-909b19b57`), `buildStamp` is that stamp, `toolCommit` is this checkout's HEAD (the
  tool that ran the session, not the build), and `uncommittedChanges` says whether this
  checkout's `graphty/` or `graphty-element/` had uncommitted edits; it also holds the URL,
  the start time and the setup steps.
- For bar 2 (earlier work kept), `work-start.json` lists the open work the participant arrives to
  -- runs, style layers, notes, filter steps and sources, each by its id and name -- and `--end`
  writes `work.json`: that list, the same list at the end, and `gone`, what the start held and the
  end does not (a renamed run, an edited note or a step turned off is not gone). Graders judge
  only whether each item in `gone` was the participant's choice. The participant never sees
  either file.
  A filter step is recorded with its whole rule (`step-1 off {"kind":"range",...,"min":5,...}`),
  and a run with the name the screen gives it, its algorithm, then the element's own label:
  `pagerank PageRank (label Influence)`.
- `REAL_VIEWPORT=<w>x<h>` on the `--start` command opens the window at another size (a screenshot
  audit at 1200x900 or 900x700); studies keep the default 1440 x 900. `session.json` records it.
- Scrollbars are drawn as a person's desktop Chrome draws them: Playwright's headless Chromium
  hides them by default (`--hide-scrollbars`), and the tool turns that off, so a pane that
  scrolls shows its scrollbar in the screenshot. A report quotes a control's name up to 80
  characters, the same length everywhere.
- A session nobody steps for 15 minutes closes itself, so a forgotten one cannot hold a browser.
- Call `real.mjs` directly, with your own session folder, for every step. Do not write a helper
  script that wraps it: a script shared between sessions sends one participant's steps into
  another's browser. A client stopped mid-step (its agent was stopped) does not end the session;
  the step still runs and the next one works.

## Steps

Several steps may follow one `--step`; they run in order, and one screenshot is saved at the end.

| Step                                                                                | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--click "<name>"`                                                                  | Clicks the control with that name: what it says, its accessible name or its label; a text box with none of those matching, by its placeholder (`--click "Find nodes, edges, values"`). Exact names before partial ones. `"<name>#2"` takes the second of that name; `"role=tab:Style"` only that role. A name several controls share is refused: the step does nothing and prints `ambiguous`, with each candidate as `"<name>#n"` and what it is. |
| `--rclick`, `--dblclick`, `--shift-click`, `--ctrl-click`, `--alt-click`, `--hover` | The same, with that button or key held. A hover prints the tooltip.                                                                                                                                                                                                                                                                                                                                                                                |
| `--click "<node name>"`                                                             | With no control of that name, clicks a node whose label is drawn on the canvas and is on screen, at its center, and says where. A node with no label drawn cannot be named, as for a person.                                                                                                                                                                                                                                                       |
| `--click-at x,y` (`--rclick-at`, `--dblclick-at`, `--hover-at`)                     | A point on the last screenshot. Prints what is there: a node (by its label), empty canvas, or the control. `--hover-at` also prints the pointer's shape there (`cursor: pointer`), which a screenshot never shows.                                                                                                                                                                                                                                 |
| `--hover-icon <n>`                                                                  | Hovers the nth control that has a name but no visible text, and prints its tooltip.                                                                                                                                                                                                                                                                                                                                                                |
| `--drag x1,y1 x2,y2`                                                                | Presses at the first point, moves to the second, releases (pan, or move a node).                                                                                                                                                                                                                                                                                                                                                                   |
| `--wheel x,y,delta`                                                                 | Turns the wheel at a point; a negative delta zooms in.                                                                                                                                                                                                                                                                                                                                                                                             |
| `--key <Key>`                                                                       | A key or chord: `Enter`, `Escape`, `ArrowDown`, `Control+o`.                                                                                                                                                                                                                                                                                                                                                                                       |
| `--type "<text>"`                                                                   | Types into what has focus. With nothing that takes text focused, types nothing and fails.                                                                                                                                                                                                                                                                                                                                                          |
| `--upload <file>`                                                                   | Answers the open file chooser (or the next one to open within 3 seconds), including the app's project-file picker (Locate...).                                                                                                                                                                                                                                                                                                                     |
| `--reopen`                                                                          | Closes the tab and opens the app again in a new tab with the same browser storage: Recent projects and the saved files are still there.                                                                                                                                                                                                                                                                                                            |
| `--drop <file>`                                                                     | Drags the file in from outside the window and drops it on the middle, through the browser itself, as a person would. Prints `the page took it`, or `the drop was not delivered` when nothing there takes a dropped file (a real browser would then open the file itself in place of the app).                                                                                                                                                      |
| `--read`                                                                            | Prints what a screen reader's browse mode reads in the open dialog, or else the region around focus (see "Screen-reader mode").                                                                                                                                                                                                                                                                                                                    |
| `--wait <ms>`                                                                       | Lets the app work on its own for a moment.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `--expect "<text>"`, `--expect-not "<text>"`                                        | Fails unless the text is (or is not) on screen. Also `role=<role>`, `role=<role>:<name>` and `selected=N`.                                                                                                                                                                                                                                                                                                                                         |

A file is a path, or a name from `files/`:

| File                   | What it is                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `friends.csv`          | A links spreadsheet: `source,target,weight`, 41 rows between 20 people.                                                                                                                            |
| `friends-v2.csv`       | The same 41 links between the same 20 people, with new weights (each weight `w` is now `6 - w`).                                                                                                   |
| `florentine.gml`       | A small GML network: marriages between 15 Florentine families.                                                                                                                                     |
| `club-members.graphml` | A GraphML file cut off part way through, which the app cannot read.                                                                                                                                |
| `people.csv`           | A node spreadsheet: `id,name,team`, 12 staff of a small nonprofit.                                                                                                                                 |
| `messages.csv`         | Its edge spreadsheet: `from,to,emails`, 23 rows; one names `p13`, who is not in `people.csv`.                                                                                                      |
| `players.csv`          | A node spreadsheet: `id,name,position`, 10 players of a football team.                                                                                                                             |
| `passes.csv`           | Its edge spreadsheet: `from,to,passes`, 18 rows; one names `s11`, who is not in `players.csv`.                                                                                                     |
| `bus-stops.csv`        | `from,to,minutes`: 17 bus links between 10 stops, each with its travel time.                                                                                                                       |
| `trails.csv`           | `from,to,km`: 13 trails between 9 junctions, each with its length.                                                                                                                                 |
| `team.csv`             | `source,target,weight`: 16 ties between 12 colleagues.                                                                                                                                             |
| `team-v2.csv`          | The same team two months later: two new people (Mo, Nia) and five new ties, 21 in all.                                                                                                             |
| `long-names.csv`       | `source,target,average_minutes_between_visits`: 9 ties between 6 sites, two named in 40 or more characters, a 30-character column name. For the screenshot audit's truncation check, never a task. |

## Names, dialogs and lists

- While a dialog that blocks the page (`aria-modal`) is open, a name resolves only inside it and in a
  list or menu it opened. A control of that name behind the dialog is a miss, printed as
  `nothing in the open dialog is called "Data" (a control behind the dialog is)`.
- A select (combobox) is clicked by its label, such as `--click "Method"`, not by the value it
  shows; to change it again, click the label again, then the option.

## Saving and reopening a project

The app saves a project one of two ways. Most saves go into the browser itself: Control+S opens
the app's own "Save <name> as" dialog, Save keeps the project in this browser and Recent projects
lists it after `--reopen`. Such a save opens no picker, so the tool prints only the screenshot and
writes nothing to `saved/`. A save to a local file uses the browser's save picker, as below.

Headless Chromium cancels the browser's own save and open pickers at once, so the tool answers them
itself. The save picker takes the name it suggests and writes the project into the browser's
private storage, with a real file handle that Recent projects keeps as Chromium would; every file
written that way is also copied to `saved/` in the session folder. The open picker (Locate...) waits
for the next `--upload`, for example `--upload <session folder>/saved/<name>.graphty.json`.

```bash
node $T/real.mjs --step $S --key Control+s --click Save   # the save picker chose ...; saved/...
node $T/real.mjs --step $S --reopen                       # a new tab: Recent projects lists it
node $T/real.mjs --step $S --click "<project name>"       # reopens the saved file
```

## What it prints

- Only the screenshot path when a step just opens or closes something (a menu, a dialog, a panel)
  and nothing else happened: look at the screenshot.
- `tooltip: "..."` after every hover, or `tooltip: null`. A tooltip still fading out from the last
  hover is not this hover's and is never printed; one dismissed and hidden by CSS (opacity 0,
  `visibility: hidden`) or one with no text is no tooltip, so it reads `null`, never `""`.
- Misses: `nothing on screen is called "..."`, `only 2 controls are called ...`.
- `could not click "...": ... Timeout 3000ms exceeded.` when a control is there but cannot take the
  click, followed by the browser's own reason, indented (`element is not enabled`, `element is not
stable`, `<div ...> intercepts pointer events` when something covers it).
- `slow click (landed): "..." was clicked; the wait after it ran past 3000 ms` when the click was
  done but Playwright's wait afterwards (for any navigation the click started) ran out the limit,
  as it does on a loaded machine. The click worked: it is not a miss, and it never fails a setup.
- `ambiguous: "Enjolras" matches 5 controls, so the step did nothing; name one: "Enjolras#1" row ..., ...` when a name
  is shared. Pick one with `#n` or `role=<role>:<name>`.
- `at x,y: node "Medici"` (or `empty canvas`, or the control there) for every point step.
- `a file chooser is open` when a click opened one.
- `a file was saved: florentine_current-view.png, 1806 x 1720 (path)` for every download.
- `the save picker chose <name>` and `a project file was written: <name>, N bytes (path)` for a save.
- `the drawing is still moving` when the layout had not settled 15 seconds after the step, or when
  three captures of the canvas half a second apart keep changing (a turning camera, a drifting layout).
  Only the drawing's own pixels count: whatever lies over the canvas (an open popover, its list, a
  notice) is left out of the comparison.
- Every script error, `console.error` and failed request since the last step. In the real app
  each is a defect worth a bug report. They make the command exit 1.

## Screen-reader mode

For a participant who uses a screen reader, start the session with `--sr`. After every step (and
at the start) the tool prints what a screen reader would say, read from Chromium's own
accessibility tree. The screenshot is still saved for graders, but its path is not printed, and
every pointer step (`--click` and its variants, `--click-at` and its variants, `--hover`,
`--hover-icon`, `--drag`, `--wheel`, `--drop`) is refused with exit 2 before anything runs: only
`--key`, `--type`, `--read`, `--upload`, `--reopen` and `--wait` work. A setup start still runs its own
clicks, unseen, before the participant arrives.

```
focus: combobox "Find" value "zzzz"
live: status (polite): "No match for \"zzzz\""
```

- `focus:` is the focused element (inside a shadow root too): its role, its accessible name, its
  value, and its states (`expanded`, `checked`, `selected`, `pressed`, `disabled`, ...). `(no name)`
  means a screen reader would say only the role. `nothing (the page itself)` means focus is on no
  control, for example after a dialog closed without handing focus back.
- `; highlighted:` follows a `focus:` line when the focused control keeps focus and points at an
  item inside it (`aria-activedescendant`), as a combobox does while Arrow keys move through its
  options: `focus: combobox "Find" value "Stro" expanded; highlighted: option "Strozzi" selected`.
  A screen reader reads that item, not only the box.
- `live:` is the text of a live region (`aria-live`, `role=status`, `role=alert`, `role=log`) each
  time it appears or changes, with its politeness. A region inside another one is read as part of
  it; a hidden one is not read. Text that changes several times in one step (typing a letter at a
  time) prints each version; a real screen reader may speak only the last. A region that arrived
  on the page with its text already in it ends with `-- unconfirmed: ...`: many screen readers
  read only a change to a region that was already there, so that text may never be spoken. A
  `role=alert` is read on arrival and is never marked.
- `--read` reads the open dialog, or else the region, landmark or form around focus, the way a
  screen reader's browse mode reads it: one `read:` line per run of text, heading and control, in
  page order, starting with the container's own role and name. It moves nothing and focuses
  nothing. It shows what a participant could hear by reading the screen, not what was announced.
- What it cannot tell: how a particular screen reader phrases it, or when it would cut itself off.
  Read the lines as what the page offers a screen reader, not as a transcript of speech.
- `session.json` records `"screenReaderMode": true`.

## Briefing a participant, and the follow-up

```bash
node $T/real.mjs --brief $S/tier2/rounds/round-3/sessions/r3-s05
# prints <worktree>/tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s05/briefing.md
```

A participant's session never runs inside the studio's own files (`design/ui/studio/`), where
`tasks.md`, the answers and the personas are a few folders up. The facilitator names a session by
its folder in the round (`rounds/round-N/sessions/<id>`), and `--brief` writes the participant's
own folder outside the studio, under `tmp/studio-sessions/` of the worktree, at the same path
below it, and prints its `briefing.md`. The participant starts, steps and is ended in that folder;
`--end` copies it back to the round's folder for the graders (see "After a participant's
session").

`briefing.md` is everything a participant gets and nothing else: their persona files with the
sections written for the study team left out (facilitator notes, the team's hypotheses, open
questions for the study), the history under their name in `tier2/roster.md`, the prompt of their
task's half word for word, the exact `--start` command with the build and their own folder, and
this file's "A session", "Steps" and "Names, dialogs and lists". The task, half, persona and start
come from the session's row in the round's `plan.md` (the folder's name is the session id; a
re-run `r3-s05b` takes `r3-s05`'s row); `--task T17A --persona Grace` names them for a folder with
no plan. A participant reads only its own folder: never `tasks.md` (it holds the avoided words and
the follow-ups), `answers.md`, `roster.md` or a persona file directly.

`--start` refuses, starting nothing:

- a participant's folder inside the studio's files: any `rounds/<round>/sessions/<id>` folder
  there, or one holding a `briefing.md`. The refusal names the folder to brief and start instead.
- a folder under `tmp/studio-sessions/` with no `briefing.md` that `--brief` wrote for that folder.
- a folder that holds a facilitator file: one named like a study document (`tasks.md`,
  `answers.md`, `criteria.md`, `roster.md`, `plan.md`, `grade.md`, ...) or any text file that
  carries avoided words, facilitator notes or a success path. `--brief` checks its own output the
  same way.

Pilots, expert walkthroughs, graders' reproductions and screenshot audits are not participants:
they start in folders of the studio as before (`pilot/`, `expert/`, `repro/`, `tmp/`).

**The follow-up.** T17 and T18 each have a follow-up prompt for every session that finished the
first. The tool gives it, so it never depends on anyone remembering: a session started on a T17
or T18 half (from its `plan.md` row, or `--start ... --task T18B`) answers its first `--end` with
exit 3 and the follow-up word for word, and stays open. The participant carries on in the same
session and runs `--end` again; one who gave up runs `--end` again at once. `session.json`
records `"followUp": "given <time>"` (never the words).

## After a participant's session

`--end` on a participant's folder (one under `tmp/studio-sessions/`) copies the whole folder,
screenshots, `transcript.md`, `saved/` and `downloads/` included, to the round's session folder it
was briefed from, replacing an earlier attempt's copy (never one that already holds a `grade.md`),
and writes `leaks.json` beside it: what the participant opened outside its own folder. It prints
`copied to <folder>` and the check's result. A first `--end` that hands over a follow-up copies
nothing; the second does. An `--end` after the session closed itself still copies.

```bash
node $T/real.mjs --leaks <session folder> [transcript.jsonl ...]
```

The check reads every tool call of the participant's Claude Code transcripts. Without transcript
paths it finds them itself: the session logs under `~/.claude/projects/` (or
`$CLAUDE_CONFIG_DIR/projects/`) written since the briefing whose opening prompt names the folder
and a study participant, so the follow-up's agent counts and the facilitator's own agents do not.
A session is void, and is re-run rather than graded, if any call opened:

- a facilitator file, by name, anywhere: `tasks.md`, `answers.md`, `criteria.md`, `roster.md`,
  `plan.md`, `scores.md`, `insights.md`, `decisions.md`, `grade.md`
- a persona file (any path through a `personas/` folder)
- anything else under the studio's files, except its own copied folder, `tool/real.mjs` (run, not
  read) and the data files in `tool/files/`
- a path with `..`, or a Grep or Glob with no folder (it searches wherever the agent runs)

It prints one `VOID: the participant opened <what>, <path> (<tool>, <transcript>)` line per call
and exits 1; with none, one `leak check:` line with the counts and exit 0; with no transcript
found, exit 2, which is no verdict: run it again with the transcript's path.

## Browsers

At most four browsers run at once on this machine, across every study, tool and test run. A
session takes one of the machine's four browser slots (`with-browser.sh`) when it starts and holds
it until `--end`; a start waits, saying so, while all four are taken. The slots are the main
checkout's `tmp/browser-slots/slot1` to `slot4`, the same ones `<main checkout>/tmp/with-browser.sh`
hands to the pre-push gate's browser test shards and to visual-preview captures, so a study round
and the machine's test runs share one limit. `BROWSER_SLOTS` (1 to 4) uses fewer of the four;
above 4 the gate refuses to run (exit 2). Every command that launches a browser for the studio
(`real.mjs`, `bars.mjs`, a private walk) goes through `with-browser.sh`. `real.mjs --start` takes its own
slot (it runs its session process through the gate), `--prove` runs the gate itself for each browser
it starts, and `--step`, `--end` and `--brief` launch no browser, so all five are called directly;
wrapped in the gate by mistake, they run at once instead of holding one slot while waiting for a
second.

**Why round 1 of tier 2 ran more than four browsers (2026-10-09).** Until then `with-browser.sh`
kept a pool of its own, four lock files in `/tmp/graphty-design-browser-slots/`, while the pre-push
gates of other worktrees took theirs from the machine pool in the main checkout's
`tmp/browser-slots/`. The two pools never saw each other: the studio's four sessions were never
more than four (only four studio lock files ever existed, and a session's browser exits with its
session process), but at 06:14 to 06:24 UTC pre-push gates ran their browser test shards (vitest
browser projects, some starting more than one Chromium each) beside them, about ten software-rendering
Chromium GPU processes in all, and the load average reached about 158 on 32 threads. Pages then
could not answer a click's hit test within the tool's 3 seconds (r1-s14, r1-s16, r1-s46). "Five
sessions" in the grades counted session folders whose times overlapped, not browsers. One pool
closes that path.

## Checking the tool

```bash
node design/ui/studio/tool/real.mjs --prove
```

Runs real sessions against the build: a start, clicks by control name and by a node's drawn
label, a click at a point, a hover tooltip (and one right after another, while the first fades
out), a click on a disabled control that must print its reason, a planted click that lands but whose wait
after it runs past the limit (reported landed, not missed), a hover over a planted dismissed,
hidden tooltip (reported `null`), a client killed mid-step that must
leave the session running, typing, an upload, a download, a name inside an open
dialog and one behind it, a save, a reopened tab that reopens the save from Recent projects, a
planted spin (a camera key held on the canvas) that must be reported, typing into an open popover
whose box keeps repainting over a still drawing, which must not be, setup starts (one that works,
one whose step names nothing, one whose click never becomes clickable), a screen-reader session (nothing focused after its setup, a focus line after every step, a live region's new
text, the highlighted option of the find box, a planted region that arrives filled marked
unconfirmed, `--read` in the Export dialog), an end, and the participant's side without a browser (a participant's folder inside the studio's files refused, one with no briefing refused, a briefing written outside the studio, a planted transcript that opens `tasks.md` voided by name while a clean one and another agent's are not, an end that copies the session back with `leaks.json`). It prints `ok` or `FAIL` per check and exits 1 on any failure.
Its sessions are written under `design/ui/studio/tmp/prove/`, which it clears first; set
`REAL_PROVE_DIR=<folder>` to run it beside another self-test.

## Measuring the scripted bars

```bash
node design/ui/studio/tool/bars.mjs <out dir> [--dist <build dir>] [--scheme dark|light]
```

Measures the scripted bars of `criteria.md` and `../tier2/criteria.md` on a production build, in
about 15 minutes, and writes `<out dir>/bars.json`; it exits 1 when a bar fails or a screen was not
reached:

- **Bar 7 (a):** every algorithm in graphty-element's catalog runs on `friends.csv` loaded with each
  weight meaning (closer, farther, capacity, not set) and once with no weight column, directed
  and undirected. A run must read the loaded weight in its own sense or not at all, and a run that
  read no weight must give the same answer as on the table with no weight column.
- **Bar 8:** axe-core (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`; a serious or critical
  violation fails) on tier 1's core screens and on every tier 2 screen the criteria list; on the
  tier 2 screens also controls that share an accessible name, and whether focus fell to the page
  after each action the criteria list (adding, ticking and deleting a filter step, Escape from the
  step editor, the Path popover and the find box, Find path, saving a note, each Load, Rerun,
  Filter to neighbors, Select endpoints).
- **Bar 9:** the app's own words on screen (data values, node names and numbers left out, every
  counted word printed): tier 1's screen at rest, at most 50; and tier 2's rest screen, a path
  run's inspector, an edge's inspector and the neighbor list, none above round 1's count in
  `bars-limits.json`.
- **Bar 10, the scripted counts:** on every tier 2 screen bar 8 lists, and on `long-names.csv`'s
  Data place, a node's inspector and the find box, at 1440 x 900 and again at 1280 x 800, each
  printed with its screen and element: text cut off (`scrollWidth > clientWidth` on a box that
  hides its overflow) with no title, accessible name or tooltip giving it whole (each such text is
  hovered, and a tooltip holding the whole text counts as readable, as does a copy of the whole
  text elsewhere on screen); and a visible error code
  (`E_BAD_SELECTOR`) or field path (`results.louvain.group`, `data.weight`), the data's own words
  left out. They are findings for the experts to rate, so they do not fail the run.

Tier 1's screens and bar 7 run in the script's own browser; tier 2's screens are walked with
`real.mjs` sessions under `<out dir>/sessions/`, whose screenshots show each screen measured.
Before a reading is trusted, each check must fail on a planted case (an image with no text
alternative, two buttons of one name, focus dropped to the page, a clipped name, an
`E_BAD_SELECTOR` string, a wrong weight reading of each kind), and a check that reads nothing
fails; every planted case is printed with whether it was caught and on which screen and element.
`with-browser.sh node --test design/ui/studio/tool/bar10.test.mjs` checks bar 10's counts on a
known page. To measure a build before fixes replace it, copy
`graphty/dist` first and pass the copy with `--dist`.
