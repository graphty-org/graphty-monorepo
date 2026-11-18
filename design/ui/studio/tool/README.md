# Driving the real graphty app in a study

`real.mjs` lets a study participant (or a pilot, or a grader) use the real graphty app one step at
a time: it opens the app in a headless browser, does what each step says, waits for the page to
take it and the drawing to settle, and saves a numbered screenshot of the whole 1440 x 900 window after every step. Each
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
W=<main checkout>/tmp/design-studio/tier2/r1/pilot
node $T/real.mjs --start $W/p03-t2 empty                  # 01.png: the empty app, clean storage
node $T/real.mjs --step  $W/p03-t2 --click "Open a file" --upload friends.csv  # 02.png
node $T/real.mjs --step  $W/p03-t2 --click-at 702,380     # point at the last screenshot
node $T/real.mjs --end   $W/p03-t2                        # always end: it frees the browser
```

Pilot, dry-run, readiness and tool-check walks write their screenshots and step files under the
main checkout's `tmp/design-studio/<tier>/<round or pass>/` (`tier1` for the first tier's
`rounds/`), which git ignores; only a walk's `report.md` goes in the studio's files, naming its
screenshots by that path as plain text. `--start` and `--rewalk` refuse a walk folder inside the
studio's files (`rounds/r1d2/...` or `rounds/<round>/pilot/...`) and print the folder to use.
Scored round sessions, expert walkthroughs and bars stay in the round's folder.

Every command prints what a participant would notice, then the path of the new screenshot. A
notice the app took down before the screenshot (it keeps one for 6 seconds, and a step can take
longer to settle) is printed as `a notice showed and went before this screenshot: "..."`, since a
person watching would have read it.

- `--start <folder> empty` opens the app as a first-time visitor sees it.
- `--start <folder> setup:<file>` runs the setup file's steps first and never shows them: one step
  per line, unquoted (`--click Open the Zachary's karate club sample`); `#` lines are comments.
  `<file>` is looked up in the folder the command runs in, then the tier's folder (`../tier<N>/`),
  then `../rounds/tier-<N>/setups/` (the tier: see REFERENCE.md, "Briefing a participant"); a file in none of them prints one `SETUP FAILED: no such setup file`
  line and exits 2, with no session started. A
  setup step that misses fails the start with `SETUP FAILED`, which is itself a finding. A setup
  click waits up to 20 seconds for its control (a participant's click, 3), since nobody waits on it
  and a loaded machine can take longer than 3 seconds; a control that never becomes clickable in
  that time still fails the start. When the
  setup ends, nothing has focus and the pointer is off the page, as when a saved project is
  reopened: the participant does not arrive to a focus ring or a hover on the control the setup
  used last, and the first Tab goes to the top of the page (Main menu), not to the control after
  the setup's last click. Nor does it arrive to an undo history: once pending work has finished
  (up to 30 seconds), the setup's end empties the history through graphty-element's
  `session.history.clear()`, so Undo starts off ("Nothing to undo") and the setup's steps cannot
  be undone; history that cannot be emptied fails the start with `SETUP FAILED`.
  A start whose setup failed ends its own session: `01.png` and `setup.log` stay, and nothing keeps a
  browser.
- `--start <folder> empty --sr` (or `setup:<file> --sr`) starts a session in screen-reader mode;
  see below.
- The folder gets `01.png`, `02.png`, ..., `session.json`, `session.log` (the session process's
  own log), `setup.log`, `route.jsonl` (the steps taken, which `--replay` can run
  again) and `downloads/`. In `session.json`, `commit` is the served build's own commit (from its build stamp, the
  `graphty-build` meta tag in `REAL_DIST`'s `index.html`, or else a frozen folder's name such as
  `tier2-r1d2-909b19b57`), `buildStamp` is that stamp, `toolCommit` is this checkout's HEAD (the
  tool that ran the session, not the build), and `uncommittedChanges` says whether this
  checkout's `graphty/` or `graphty-element/` had uncommitted edits; it also holds the URL,
  the start time and the setup steps.
- The folder also gets the graders' records of what was open and how it looked (see "After a
  participant's session"); the participant never needs them.
- `--start <folder> empty --keys` (or `setup:<file> --keys`) starts a keyboard-only session: every
  pointer step is refused with exit 2 before anything runs, the screenshots are printed as usual,
  and `session.json` records `"keyboardOnlyMode": true`.
- `REAL_VIEWPORT=<w>x<h>` on the `--start` command opens the window at another size (a screenshot
  audit at 1200x900 or 900x700); studies keep the default 1440 x 900. `session.json` records it.
- `REAL_SCHEME=light` (or `dark`) on the `--start` command opens the app in that color scheme, for
  the scripted walk of both themes (`bars.mjs --tier 3 --scheme`); studies leave it unset.
- Each step's line in `route.jsonl` times how soon the app answered its first pointer press or
  key: `ms.input` (when the page took it) and `ms.firstFrame` (from the input to the next frame
  the browser drew, the frame that shows whether the app said it is working before it got busy).
  `REAL_GLANCE_MS=<ms>` on the `--start` (or `--replay`) command, with `REAL_WARM_POOL=0`, also
  saves `NN-glance.png`, the last frame the browser drew by that long after the input (from its
  screencast, so a busy page cannot delay it): the screen a person looks at while the step works.
  `ms.glance` is when that frame was drawn, from the input (negative: nothing new was drawn by
  then); the line names the file as `glance`. `REAL_GLANCE_EVERY_MS=<ms>` with it also saves
  `NN-glance-<ms>.png` every that long after the input until the screen stopped changing, to see
  a sign of work hold through a long wait. `REAL_PROFILE=1` saves `NN.cpuprofile`, a CPU
  profile of the step, for DevTools.
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
A stretch you are sure of costs one command and one screenshot instead of one each:
`--step $S --click "Open a file" --upload friends.csv --click Load`. The batch stops at its first
miss or failed `--expect`, and says which steps did not run: the rest was meant for a screen that
did not come. An `--expect` between steps is a guard: `--click Layer --expect "Which nodes" --click
"Which nodes"`.

| Step                                                                                | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--click "<name>"`                                                                  | Clicks the control with that name: what it says, its accessible name or its label; a text box with none of those matching, by its placeholder (`--click "Find nodes, edges, values"`). Exact names before partial ones, and a control before a container whose words include the name (a dialog, a heading the app focuses, a filter card: an element focusable only by a negative tabindex). `"<name>#2"` takes the second of that name; `"role=tab:Style"` only that role. A name several controls share is refused (looked at again for up to a second first, so a second control of the name the page holds only while a list closes is not taken for a shared name): the step does nothing and prints `ambiguous`, with each candidate as `"<name>#n"` and what it is. `#n` picks by position, which a person never sees, so among different kinds of control (a panel row and an open list's option) it is refused too: name the one meant by its kind, `"role=option:weight"`. |
| `--rclick`, `--dblclick`, `--shift-click`, `--ctrl-click`, `--alt-click`, `--hover` | The same, with that button or key held. A hover prints the tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--click "<node name>"`                                                             | With no control of that name, clicks a node whose label is drawn on the canvas and is on screen, at its center, and says where. A node with no label drawn cannot be named, as for a person.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `--click-at x,y` (`--rclick-at`, `--dblclick-at`, `--hover-at`)                     | A point on the last screenshot. Prints what is there: a node (by its label), empty canvas, or the control. `--hover-at` also prints the pointer's shape there (`cursor: pointer`), which a screenshot never shows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--hover-icon <n>`                                                                  | Hovers the nth control that has a name but no visible text, and prints its tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--drag x1,y1 x2,y2`                                                                | Presses at the first point, moves to the second, releases (pan, or move a node).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `--wheel x,y,delta`                                                                 | Turns the wheel at a point; a negative delta zooms in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--key <Key>`                                                                       | A key or chord: `Enter`, `Escape`, `ArrowDown`, `Control+o`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `--type "<text>"`                                                                   | Types into what has focus. With nothing that takes text focused, types nothing and fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--upload <file>`                                                                   | Answers the open file chooser (or the next one to open within 3 seconds), including the app's project-file picker (Locate...).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `--reopen`                                                                          | Closes the tab and opens the app again in a new tab with the same browser storage: Recent projects and the saved files are still there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `--drop <file>`                                                                     | Drags the file in from outside the window and drops it on the middle, through the browser itself, as a person would. Prints `the page took it`, or `the drop was not delivered` when nothing there takes a dropped file (a real browser would then open the file itself in place of the app).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `--read`                                                                            | Prints what a screen reader's browse mode reads in the open dialog, or else the region around focus (see "Screen-reader mode").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--wait <ms>`                                                                       | Lets the app work on its own for a moment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `--expect "<text>"`, `--expect-not "<text>"`                                        | Fails unless the text is (or is not) on screen within 2 seconds. Also `role=<role>`, `role=<role>:<name>`, `selected=N` and `described=<text>` (the focused control's accessible description holds the text).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

A file is a path, or a name from `files/`:

| File                             | What kind of file it is                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `friends.csv`                    | A links spreadsheet                                                                                                                                                                                                           |
| `friends-v2.csv`                 | A links spreadsheet, a later version of `friends.csv`                                                                                                                                                                         |
| `florentine.gml`                 | A GML network                                                                                                                                                                                                                 |
| `club-members.graphml`           | A GraphML network                                                                                                                                                                                                             |
| `people.csv`                     | A node spreadsheet                                                                                                                                                                                                            |
| `messages.csv`                   | An edge spreadsheet that goes with `people.csv`                                                                                                                                                                               |
| `players.csv`                    | A node spreadsheet                                                                                                                                                                                                            |
| `passes.csv`                     | An edge spreadsheet that goes with `players.csv`                                                                                                                                                                              |
| `bus-stops.csv`                  | A links spreadsheet                                                                                                                                                                                                           |
| `trails.csv`                     | A links spreadsheet                                                                                                                                                                                                           |
| `team.csv`                       | A links spreadsheet                                                                                                                                                                                                           |
| `team-v2.csv`                    | A links spreadsheet, a later version of `team.csv`                                                                                                                                                                            |
| `long-names.csv`                 | A links spreadsheet with long names, for the screenshot audit; never a task                                                                                                                                                   |
| `volunteers.graphml`             | A GraphML network of 24 people, with columns about each one                                                                                                                                                                   |
| `sources.graphml`                | A GraphML network of 24 people and organizations, with columns about each one                                                                                                                                                 |
| `neighbors.csv`                  | A links spreadsheet with columns about each link                                                                                                                                                                              |
| `lesmis-poster.graphty.json`     | A saved graphty project                                                                                                                                                                                                       |
| `volunteers-thanks.graphty.json` | A saved graphty project                                                                                                                                                                                                       |
| `yeast-galactose.graphml`        | A GraphML network of 331 yeast genes and 361 interactions, with three expression columns; Cytoscape's galFiltered demo (Ideker et al. 2001, CC0), direction dropped, written from graph-samples' `yeast-perturbation` dataset |
| `pantries.csv`                   | A node spreadsheet of a food bank's sites                                                                                                                                                                                     |
| `deliveries.csv`                 | An edge spreadsheet that goes with `pantries.csv`                                                                                                                                                                             |
| `gauges.csv`                     | A node spreadsheet of a river's gauges                                                                                                                                                                                        |
| `flows.csv`                      | An edge spreadsheet that goes with `gauges.csv`                                                                                                                                                                               |

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
  `visibility: hidden`) or one with no text is no tooltip, so it reads `null`, never `""`. A hover
  that opens a hover card or a popover and no tooltip (a column's issue mark opens its fix list)
  prints `opened a hover card: "<its name>: <its text>"` instead of `tooltip: null`.
- Misses: `nothing on screen is called "..."`, `only 2 controls are called ...`.
- `could not click "...": ... Timeout 3000ms exceeded.` when a control is there but cannot take the
  click, followed by the browser's own reason, indented (`element is not enabled`, `element is not
stable`, `<div ...> intercepts pointer events` when something covers it).
- `slow click (landed): "..." was clicked; the wait after it ran past 3000 ms` when the click was
  done but Playwright's wait afterwards (for any navigation the click started) ran out the limit,
  as it does on a loaded machine. The click worked: it is not a miss, and it never fails a setup.
- `ambiguous: "Enjolras" matches 5 controls, so the step did nothing; name one: "Enjolras#1" row ..., ...` when a name
  is shared. Pick one with `#n` or `role=<role>:<name>`. A candidate in an open list or menu says
  `in the open list`. When the controls are of different kinds, each is offered by kind, the form
  the next step takes: `name one: "role=button:Samples" button "Samples", "role=link:Samples" link
"Samples"` (with `#n` counted among one kind when two of a kind share it, `"role=row:Enjolras#2"`).
- `ambiguous: "weight#1" picks by position among different kinds of control, ...; name it by kind:
"role=option:weight", "role=treeitem:weight"` when `#n` would choose between controls of
  different kinds, since a position counted across kinds can pick a row behind an open list
  instead of the list's option.
- `at x,y: node "Medici"` (or `empty canvas`, or the control there) for every point step.
- `a file chooser is open` when a click opened one; `--upload <file>` answers it and `--key Escape` closes it with no file.
- `a file was saved: florentine_current-view.png, 1806 x 1720 (path)` for every download.
- `the save picker chose <name>` and `a project file was written: <name>, N bytes (path)` for a save.
- `the drawing is still moving` when the layout had not settled 15 seconds after the step, or when
  three captures of the canvas half a second apart keep changing (a turning camera, a drifting layout).
  Only the drawing's own pixels count: whatever lies over the canvas (an open popover, its list, a
  notice) is left out of the comparison.
- `stopped after "--click Layer": the rest of this step (--click --type) did not run` when a batch
  met a miss or a failed check before its end.
- Every script error, `console.error` and failed request since the last step. In the real app
  each is a defect worth a bug report. They make the command exit 1. The browser's own report of a
  cross-origin call it refused (a remote service that answers a refused key with no CORS header: the
  CORS line, its `net::ERR_FAILED` request and resource lines) goes to `session.log` only, since no
  reader sees it; the reader sees the app's words for the failure.

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
  time it appears or changes, or the same words are put in again, with its politeness. A region inside another one is read as part of
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

## Reference

Everything a facilitator, a round runner or a grader needs beyond running a session is in
REFERENCE.md beside this file: briefing a participant and the follow-up, after a participant's
session, the round's start gate, browsers, scripted walks, replaying a route, the scripted dry
run, tier 6 sessions, checking the tool and measuring the scripted bars.
