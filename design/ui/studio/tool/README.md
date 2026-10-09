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

Every command prints what a participant would notice, then the path of the new screenshot.

- `--start <folder> empty` opens the app as a first-time visitor sees it.
- `--start <folder> setup:<file>` runs the setup file's steps first and never shows them: one step
  per line, unquoted (`--click Open the Zachary's karate club sample`); `#` lines are comments.
  `<file>` is looked up in the folder the command runs in, then `../tier2/`, then
  `../rounds/tier-2/setups/`; a file in none of them prints one `SETUP FAILED: no such setup file`
  line and exits 2, with no session started. A
  setup step that misses fails the start with `SETUP FAILED`, which is itself a finding. When the
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
- `REAL_VIEWPORT=<w>x<h>` on the `--start` command opens the window at another size (a screenshot
  audit at 1200x900 or 900x700); studies keep the default 1440 x 900. `session.json` records it.
- A session nobody steps for 15 minutes closes itself, so a forgotten one cannot hold a browser.
- Call `real.mjs` directly, with your own session folder, for every step. Do not write a helper
  script that wraps it: a script shared between sessions sends one participant's steps into
  another's browser. A client stopped mid-step (its agent was stopped) does not end the session;
  the step still runs and the next one works.

## Steps

Several steps may follow one `--step`; they run in order, and one screenshot is saved at the end.

| Step                                                                                | What it does                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--click "<name>"`                                                                  | Clicks the control with that name: what it says, its accessible name or its label; a text box with none of those matching, by its placeholder (`--click "Find nodes, edges, values"`). Exact names before partial ones. `"<name>#2"` takes the second of that name; `"role=tab:Style"` only that role. A name several controls share prints `ambiguous`. |
| `--rclick`, `--dblclick`, `--shift-click`, `--ctrl-click`, `--alt-click`, `--hover` | The same, with that button or key held. A hover prints the tooltip.                                                                                                                                                                                                                                                                                      |
| `--click "<node name>"`                                                             | With no control of that name, clicks a node whose label is drawn on the canvas and is on screen, at its center, and says where. A node with no label drawn cannot be named, as for a person.                                                                                                                                                             |
| `--click-at x,y` (`--rclick-at`, `--dblclick-at`, `--hover-at`)                     | A point on the last screenshot. Prints what is there: a node (by its label), empty canvas, or the control. `--hover-at` also prints the pointer's shape there (`cursor: pointer`), which a screenshot never shows.                                                                                                                                       |
| `--hover-icon <n>`                                                                  | Hovers the nth control that has a name but no visible text, and prints its tooltip.                                                                                                                                                                                                                                                                      |
| `--drag x1,y1 x2,y2`                                                                | Presses at the first point, moves to the second, releases (pan, or move a node).                                                                                                                                                                                                                                                                         |
| `--wheel x,y,delta`                                                                 | Turns the wheel at a point; a negative delta zooms in.                                                                                                                                                                                                                                                                                                   |
| `--key <Key>`                                                                       | A key or chord: `Enter`, `Escape`, `ArrowDown`, `Control+o`.                                                                                                                                                                                                                                                                                             |
| `--type "<text>"`                                                                   | Types into what has focus. With nothing that takes text focused, types nothing and fails.                                                                                                                                                                                                                                                                |
| `--upload <file>`                                                                   | Answers the open file chooser (or the next one to open within 3 seconds), including the app's project-file picker (Locate...).                                                                                                                                                                                                                           |
| `--reopen`                                                                          | Closes the tab and opens the app again in a new tab with the same browser storage: Recent projects and the saved files are still there.                                                                                                                                                                                                                  |
| `--drop <file>`                                                                     | Drops the file on the middle of the window.                                                                                                                                                                                                                                                                                                              |
| `--read`                                                                            | Prints what a screen reader's browse mode reads in the open dialog, or else the region around focus (see "Screen-reader mode").                                                                                                                                                                                                                          |
| `--wait <ms>`                                                                       | Lets the app work on its own for a moment.                                                                                                                                                                                                                                                                                                               |
| `--expect "<text>"`, `--expect-not "<text>"`                                        | Fails unless the text is (or is not) on screen. Also `role=<role>`, `role=<role>:<name>` and `selected=N`.                                                                                                                                                                                                                                               |

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
  hover is not this hover's and is never printed.
- Misses: `nothing on screen is called "..."`, `only 2 controls are called ...`.
- `could not click "...": ... Timeout 3000ms exceeded.` when a control is there but cannot take the
  click, followed by the browser's own reason, indented (`element is not enabled`, `element is not
stable`, `<div ...> intercepts pointer events` when something covers it).
- `ambiguous: ...` when a name is shared.
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

## Browsers

At most four browsers run at once on this machine, across every study and tool. A session takes
one of the four slots (`with-browser.sh`) when it starts and holds it until `--end`; a start
waits, saying so, while all four are taken.

## Checking the tool

```bash
node design/ui/studio/tool/real.mjs --prove
```

Runs real sessions against the build: a start, clicks by control name and by a node's drawn
label, a click at a point, a hover tooltip (and one right after another, while the first fades
out), a click on a disabled control that must print its reason, a client killed mid-step that must
leave the session running, typing, an upload, a download, a name inside an open
dialog and one behind it, a save, a reopened tab that reopens the save from Recent projects, a
planted spin (a camera key held on the canvas) that must be reported, typing into an open popover
whose box keeps repainting over a still drawing, which must not be, setup starts (one that works,
one that fails), a screen-reader session (nothing focused after its setup, a focus line after every step, a live region's new
text, the highlighted option of the find box, a planted region that arrives filled marked
unconfirmed, `--read` in the Export dialog) and an end. It prints `ok` or `FAIL` per check and exits 1 on any failure.
Its sessions are written under `design/ui/studio/tmp/prove/`, which it clears first; set
`REAL_PROVE_DIR=<folder>` to run it beside another self-test.

## Measuring the accessibility and word-count bars

```bash
node design/ui/studio/tool/bars.mjs <out dir> [--dist <build dir>]
```

Measures two of the bars in `criteria.md` on a production build: axe-core on each core screen of
bar 8 (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`; a serious or critical violation fails),
and bar 9, the app's own words on screen at rest (Les Miserables loaded, nothing selected,
1440 x 900; data values, node names, numbers and the drawing left out, every counted word
printed). It writes `<out dir>/bars.json` and exits 1 when either bar fails. The other parts of
bar 8 (shared names, focus drops, focus visibility, announcements) are not in it. To measure a
build before fixes replace it, copy `graphty/dist` first and pass the copy with `--dist`.
