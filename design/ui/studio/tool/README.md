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
  then `../rounds/tier-<N>/setups/` (the tier: see "Briefing a participant"); a file in none of them prints one `SETUP FAILED: no such setup file`
  line and exits 2, with no session started. A
  setup step that misses fails the start with `SETUP FAILED`, which is itself a finding. A setup
  click waits up to 20 seconds for its control (a participant's click, 3), since nobody waits on it
  and a loaded machine can take longer than 3 seconds; a control that never becomes clickable in
  that time still fails the start. When the
  setup ends, nothing has focus and the pointer is off the page, as when a saved project is
  reopened: the participant does not arrive to a focus ring or a hover on the control the setup
  used last, and the first Tab goes to the top of the page (Main menu), not to the control after
  the setup's last click.
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

| Step                                                                                | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--click "<name>"`                                                                  | Clicks the control with that name: what it says, its accessible name or its label; a text box with none of those matching, by its placeholder (`--click "Find nodes, edges, values"`). Exact names before partial ones, and a control before a container whose words include the name (a dialog, a heading the app focuses, a filter card: an element focusable only by a negative tabindex). `"<name>#2"` takes the second of that name; `"role=tab:Style"` only that role. A name several controls share is refused: the step does nothing and prints `ambiguous`, with each candidate as `"<name>#n"` and what it is. `#n` picks by position, which a person never sees, so among different kinds of control (a panel row and an open list's option) it is refused too: name the one meant by its kind, `"role=option:weight"`. |
| `--rclick`, `--dblclick`, `--shift-click`, `--ctrl-click`, `--alt-click`, `--hover` | The same, with that button or key held. A hover prints the tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--click "<node name>"`                                                             | With no control of that name, clicks a node whose label is drawn on the canvas and is on screen, at its center, and says where. A node with no label drawn cannot be named, as for a person.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--click-at x,y` (`--rclick-at`, `--dblclick-at`, `--hover-at`)                     | A point on the last screenshot. Prints what is there: a node (by its label), empty canvas, or the control. `--hover-at` also prints the pointer's shape there (`cursor: pointer`), which a screenshot never shows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `--hover-icon <n>`                                                                  | Hovers the nth control that has a name but no visible text, and prints its tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--drag x1,y1 x2,y2`                                                                | Presses at the first point, moves to the second, releases (pan, or move a node).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--wheel x,y,delta`                                                                 | Turns the wheel at a point; a negative delta zooms in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--key <Key>`                                                                       | A key or chord: `Enter`, `Escape`, `ArrowDown`, `Control+o`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--type "<text>"`                                                                   | Types into what has focus. With nothing that takes text focused, types nothing and fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `--upload <file>`                                                                   | Answers the open file chooser (or the next one to open within 3 seconds), including the app's project-file picker (Locate...).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `--reopen`                                                                          | Closes the tab and opens the app again in a new tab with the same browser storage: Recent projects and the saved files are still there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `--drop <file>`                                                                     | Drags the file in from outside the window and drops it on the middle, through the browser itself, as a person would. Prints `the page took it`, or `the drop was not delivered` when nothing there takes a dropped file (a real browser would then open the file itself in place of the app).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `--read`                                                                            | Prints what a screen reader's browse mode reads in the open dialog, or else the region around focus (see "Screen-reader mode").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--wait <ms>`                                                                       | Lets the app work on its own for a moment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `--expect "<text>"`, `--expect-not "<text>"`                                        | Fails unless the text is (or is not) on screen within 2 seconds. Also `role=<role>`, `role=<role>:<name>`, `selected=N` and `described=<text>` (the focused control's accessible description holds the text).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

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
  `visibility: hidden`) or one with no text is no tooltip, so it reads `null`, never `""`.
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
  different kinds. In round 2 `weight#2` took the Data panel's row instead of the open list's
  option the participant meant, and threw away a half-made filter step.
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

**The tier.** A folder's tier is its own (a session under `tier3/`, or its copy under
`tmp/studio-sessions/tier3/`, is tier 3), else `REAL_TIER`, else 2. It decides which tier's
`tasks.md`, `answers.md`, `roster.md` and `criteria.md` the briefing, the follow-up, the gate and
the frozen-build check read, and where setups are looked up; the briefing's start command carries
`REAL_TIER`. A persona whose roster section says "This is your first time" is briefed under "Your
experience with this program" instead of "Your earlier sessions with this program".

**The follow-up.** T17 and T18 each have a follow-up prompt for every session that finished the
first. The tool gives it, so it never depends on anyone remembering: a session started on a T17
or T18 half (from its `plan.md` row, or `--start ... --task T18B`) answers its first `--end` with
exit 3 and the follow-up word for word, and stays open. The participant carries on in the same
session and runs `--end` again; one who gave up runs `--end` again at once. `session.json`
records `"followUp": "given <time>"` (never the words).

## After a participant's session

What the tool keeps in every session folder for the graders (the participant never needs them):

- For bar 2 (earlier work kept), `work-start.json` lists the open work the participant arrives to
  -- runs, style layers, notes, filter steps and sources, each by its id and name -- and `--end`
  writes `work.json`: that list, the same list at the end, and `gone`, what the start held and the
  end does not (a renamed run, an edited note or a step turned off is not gone). Graders judge
  only whether each item in `gone` was the participant's choice. The participant never sees
  either file.
  A filter step is recorded with its whole rule (`step-1 off {"kind":"range",...,"min":5,...}`),
  and a run with the name the screen gives it, its algorithm, then the element's own label:
  `pagerank PageRank (label Influence)`.
- For the look of the drawing, `styles-start.json` holds the whole style tree at the start
  (`styles.tree()` and every layer's spec and counts, read through graphty-element's public API)
  and `--end` writes `styles.json`: the start, the end, and `changes` -- the layers gone, added and
  changed by id (a changed count alone is no change). `styles-steps.jsonl` has one line per
  screenshot: whether a graph was open, a hash of what its layers look like (ids and counts
  left out) and `colors`, the distinct node colors drawn, from which `score.mjs` reads the time to
  the first styled graph (every node in one new color).
- For the data, `--end` writes `data.json`: the node, edge, visible and selected counts; each source
  with graphty-element's counts, a recount of the nodes and edges that name it, the numbers its row
  chips read when the Data place shows it, its join (rows matched of rows) and the roles its load
  read each table with; each column's kind, type and roles, and the project's known fields (time,
  weight and its meaning); each filter card with Select or Hide, on or off, its rule, the element's
  count and the chips the card shows. Every file the app downloads also gets a line in
  `downloads.jsonl` with the network as it was when it was written (totals, what was drawn, each
  source's counts). `endstate.mjs` reads both (see "Measuring the scripted bars").

`--end` on a participant's folder (one under `tmp/studio-sessions/`) copies the whole folder,
screenshots, `transcript.md`, `saved/` and `downloads/` included, to the round's session folder it
was briefed from (never one that already holds a `grade.md`), and writes `leaks.json` beside it:
what the participant opened outside its own folder. The copy only adds: it refreshes the tool's own
records (the numbered screenshots, `briefing.md`, `session.json`, `session.log`, `setup.log`,
`work-start.json`, `work.json`, `leaks.json`) and never removes or rewrites any other file already
in the round's folder, such as the step notes a participant writes there during the session; a
file of the same name that differs is kept as it was and named in a `kept ... as it was` line. It
prints `copied to <folder>` and the check's result. A first `--end` that hands over a follow-up copies
nothing; the second does. An `--end` after the session closed itself still copies.

```bash
node $T/real.mjs --leaks <session folder> [transcript.jsonl ...]
```

The check reads every tool call of the participant's Claude Code transcripts. Without transcript
paths it finds them itself: the session logs under `~/.claude/projects/` (or
`$CLAUDE_CONFIG_DIR/projects/`) written since the briefing whose opening prompt names the folder
(its own folder under `tmp/studio-sessions/`, or the round's `sessions/<id>` folder the round runner
names) and a study participant, so the follow-up's agent counts and the facilitator's own agents do
not.
A session is void, and is re-run rather than graded, if any call opened:

- a facilitator file, by name, anywhere: `tasks.md`, `answers.md`, `criteria.md`, `roster.md`,
  `plan.md`, `scores.md`, `insights.md`, `decisions.md`, `grade.md`
- a persona file (any path through a `personas/` folder)
- anything else under the studio's files, except its own copied folder, `tool/real.mjs` (run, not
  read) and the data files in `tool/files/`
- a path with `..`, or a Grep or Glob with no folder (it searches wherever the agent runs)

It prints one `VOID: the participant opened <what>, <path> (<tool>, <transcript>)` line per call
and exits 1; with none, one `leak check:` line with the counts and exit 0; with no transcript
found, a `FAIL:` line and exit 2, which is no verdict: run it again with the transcript's path.

```bash
node $T/real.mjs --leaks <round folder>     # e.g. tier2/rounds/round-4
```

The round's check runs the same check on every session the round's `plan.md` lists or its
`sessions/` holds, rewrites each session's `leaks.json`, and prints `leak check: <n> participant
logs read for <m> of <k> sessions`, each `VOID` line with its session, and `FAIL: no participant
log read for <n> sessions: <ids>` when it could not read a session's log. It exits 1 on either: a
check that read nothing never reports "no leaks".

## Before a round's first session: the gate

```bash
node $T/real.mjs --gate <round folder>
```

A round may not start until its folder holds, for the frozen build named on the first line of its
tier's `criteria.md`:

- the walks of every task half its `plan.md` runs, each in a folder of its own under the half's:
  `tmp/design-studio/<tier>/<round>/pilot/<half>/<walk>/` of the main checkout
  (`tier3/round-2/pilot/T40B/s3-pointer/`; a round walked before 2026-10-21 keeps them in
  `<round folder>/pilot/`), with its screenshots and its
  `session.json`. For `round-N` the walks of its dry run's passes count too, each in the same
  shape under `tmp/design-studio/<tier>/rN/pilot/` and `rNd1/`, `rNd2/` ... (tier 4's round 1 was
  piloted in `r1d1` to `r1d3`). A half needs a success walk and a detours walk, and a keyboard walk
  when the plan gives the half a keyboard-only session (a start with `--keys`). The walk's folder
  name says which it is: one holding `keys` or `keyboard` is the keyboard walk, and counts only when
  its `session.json` records `keyboardOnlyMode: true` (started `--keys`); one holding `success`,
  `path` or `pointer` is the success walk; any other is a detours walk (`x2a-table`,
  `n4-quick-actions`: a walk named for where it goes is never taken for the success walk). A walk counts when its commit is the frozen build or
  holds the same app code (no difference in `graphty`, `graphty-element`, `compact-mantine` or
  `pnpm-lock.yaml`, by `git diff`); a walk on other app code is named and does not count;
- the bars run on that build: `<round folder>/bars/bars.json` from `bars.mjs <round folder>/bars
--dist <frozen build>`, with every planted case caught and no `MISS` line (a failing bar does not
  stop the gate). For tier 3 also the light run, `<round folder>/bars-light/`, each a `--tier 3`
  run that reached every screen, focus action and typing check bar 6 lists (`BAR6` in
  `measure.mjs`) and wrote a `spoken.json` that is not empty. For tier 4 the same two folders, each
  a `--tier 4` run (`bars` with `--scheme dark`, `bars-light` with `--scheme light`) that reached
  every data screen of bar 5 at both sizes (`BAR5_TIER4` in `measure.mjs`), caught its planted
  cases there, and wrote a `spoken.json` and a `vocabulary.json` that are not empty.

It prints a `FAIL:` line per missing piece and exits 1. When all are there it writes a "Gate
evidence" section at the end of `plan.md` listing each file, and exits 0.

`--start` checks for that section itself: a session folder of a round
(`rounds/<round>/sessions/<id>`, or the participant's folder that mirrors one) is refused, exit 1
and one `FAIL:` line, unless the round's `plan.md` holds a "Gate evidence" section written for the
frozen build. So no runner, continuation script or start by hand can run a session the gate never
passed. Pilots (`<round>/pilot/`) and expert walkthroughs (`<round>/expert/`) are not sessions of
the round and start without it.

The round runner (`../tier2/rounds/workflow-tier2.js`) runs the bars and the gate after the plan
and stops the round on a failure, and runs the round's leak check before scoring.

## Browsers

A study browser draws on the GPU. Headless Chromium draws WebGL with SwiftShader, a software
rasterizer, unless told otherwise: an idle graphty page then burned 550 to 690% CPU, four study
browsers kept the machine's load above 47, and every step waited on the CPU. `real.mjs` launches its
browsers with ANGLE on Vulkan (`--use-angle=vulkan --enable-features=Vulkan`) and the extracted
`libEGL.so.1` in the main checkout's `tmp/egl/` (this machine has none of its own, and without it
these flags hang the first page instead of failing; `REAL_EGL_DIR` names another copy). The same
idle page then costs 27 to 51%. Every session checks the renderer the page draws with and records it
in `session.json` (`renderer`); a software renderer fails the start loudly, with the reason on the
command's own output, rather than running slowly. `REAL_GPU=0` runs SwiftShader on purpose, on a
machine with no GPU.

At most eight GPU browsers run at once for the studio, through one gate. A session takes one of the
machine's browser slots (`with-browser.sh`) when it starts and holds it until `--end`; a start
waits, saying so, while every slot is taken. The slots are the main checkout's
`tmp/browser-slots/slot1` to `slot8`. Slots 1 to 4 are the same ones `tools/with-browser.sh`
hands to the pre-push gate's browser test shards and to visual-preview captures, so a study round
and the machine's test runs share them; slots 5 and up are the studio's alone. A command that
draws on the GPU (`real.mjs` sets `BROWSER_GPU=1` for its sessions) may take up to 8; any other
command, drawn in software, up to 4. `BROWSER_SLOTS` (1 to 16) sets the cap; above 16 the gate
refuses to run (exit 2). Eight GPU sessions with a graph open used 6.8 GB of memory in all (about
850 MB each), 110% of one core idle and about 210% while all eight stepped at once, and 1.5 GB of
the card's memory (2026-10-21). Every command that launches a browser for the studio
(`real.mjs`, `bars.mjs`, a private walk) goes through `with-browser.sh`. `real.mjs --start` takes its own
slot (it runs its session process through the gate), `--prove` runs the gate itself for each browser
it starts, `--replay` and `--rewalk` start their sessions as `--start` does, and `--step`, `--end` and
`--brief` launch no browser, so all of them are called directly;
wrapped in the gate by mistake, they run at once instead of holding one slot while waiting for a
second. `bars.mjs` is the same: its walks are `real.mjs` sessions that each take a slot, and its tier
1 screens run as `bars.mjs --inner`, which it puts through the gate itself, so the gate passes a
`bars.mjs` command through without a slot (wrapped, it used to hold one idle slot for the whole run).

Waiting starts are served first come, first served: each waiter takes a ticket in the pool's
`queue/` folder, named by when it asked, and only the oldest live ticket may take the next free
slot; a waiter that was killed leaves a ticket the next waiter removes. `node --test
design/ui/studio/tool/with-browser.test.mjs` checks the order, the dead waiter and the `bars.mjs`
pass-through with no browser. Commands that take the machine's slots without this script (the
pre-push gate's browser shards) do not queue; they take a slot when they find one free.

**Warm browsers.** A cold start launches a browser, opens the app on a clean profile and lets it
settle: 7 to 11 seconds after its slot. So the tool keeps a few browsers warm: launched, the app
open and settled on a clean profile, never touched. A `--start` of the same build, window size and
color scheme (and the same `real.mjs`) takes one over and starts in about 2 seconds; `session.log`
says `took over warm browser`. A start still waiting in the queue takes one the moment one is ready.
Every `--start`, and every `--end` that names its build with `REAL_DIST`, tops the pool up to
`REAL_WARM_POOL` (default 2; 0 turns the pool off, and then nothing takes a warm browser either).
A warm browser takes its slot through the gate's try mode (`BROWSER_SLOT_TRY=1`): only a spare slot
above 4, at once or not at all, and never while a start waits in the queue, so it never stands
between a start or a test shard and a slot. One that waits `REAL_WARM_SECONDS` (default 600)
unclaimed, or sees starts queue for a slot for 6 seconds, closes and frees its slot. Warm browsers
wait in `/tmp/graphty-real-warm/`, with their log there.

**A start that must not wait in the background.** A start that waits longer than the caller's
shell call allows is moved to the background, and an agent whose turn then ends never comes back
to it (round 4 of tier 2: r4-s05, r4-s20 and r4-s28 never started). `REAL_SLOT_WAIT_SECONDS=<s>`
bounds the wait: with no slot free after that long, `--start` stops its waiting session process
and exits 4 with nothing started, and the caller runs the same command again. The round runner
starts each participant's session this way, in a step of its own, before the participant's turn
begins, so a participant never waits for a slot. A session whose start never produced `01.png` is
not a session: the runner re-runs it from a new folder (`<id>b`) and the scores name it.

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

## Scripted walks

A dry-run walk (`tier2/pilot/detours.sh`) or a re-walk of the pilots' paths (`tier2/pilot/rewalk.sh`)
starts its sessions with `REAL_MISS_FAILS=1`: then a step that finds nothing to act on (a name that
matches nothing, or several things, or typing with no box focused) exits 2, so the walk fails
instead of passing a check it never reached. A participant's session leaves it unset: a miss is
part of what they did, and exits 0. A replayed participant route (`rewalk.sh` with a session
folder) also leaves it unset, since the participant's own misses are replayed as they happened.

## Replaying a route

Every session saves its own route: `route.jsonl` in its folder, one line saying how it started
(`empty` or the setup file's full path, `--keys`, `--sr`, the window and color scheme), then one
line per `--step` with its actions and its check points: what the step printed, whether a name
missed, and the controls and headings on the screen it ended on, by kind and name. A pilot, a detour
walk, a keyboard walk or a re-walk is therefore already a script.

```bash
D=<main checkout>/tmp/design-studio/tier3
node $T/real.mjs --replay $D/r1d1/pilot/T38A/success $D/r1d2/pilot/T38A/success
node $T/real.mjs --rewalk $D/r1d1/pilot/T38A $D/r1d2/pilot/T38A [--only success,detours]
```

`--replay <walk folder | route.jsonl> <new session folder>` starts the new session the way the
route did, on whatever build `REAL_DIST` names now, and sends the route's steps one `--step` at a
time, printing one line per step. A step diverges when a name it uses is missing, it printed
anything else (a different node at a point, another tooltip, another focus line, a new script
error), or the screen it ends on differs from the recorded one by more than a couple of controls
(`REAL_REPLAY_TOLERANCE`, default 2 or 5% of the screen). A refusal of a shared name is compared by
what was refused and the candidates offered, never by the tool's wording of it, and a name the route
recorded as refused that the matcher now resolves (its rival was a container) is checked by name and
not done, as the recording did nothing (`match.mjs`). Lines that differ from run to run on
the same screen are not compared: a slow click that landed, a drawing still moving, a notice gone
before the screenshot. At the first divergence it stops (exit 5), prints how the step differed, and
leaves the session open on that screen: whoever replayed it looks at the screenshot and carries on
by hand with `--step`, then `--end`, and the new folder's own `route.jsonl` becomes the route to
replay next time. A route that matched to the end is ended (exit 0; `--keep` leaves it open to
extend it); `--end-on-diverge` ends a diverged one too. `replay.json` in the new folder records how
many steps matched and where it diverged. A route written by hand -- a first line such as
`{"start": "empty", "keys": false}`, then one `{"steps": ["--click", "Load"]}` line per step --
replays too, with only its names checked, since it records no screens.

`--rewalk <old walks folder> <new walks folder>` replays every route it finds under the old folder
(a task's pilot folder, or a pilot folder of tasks), `REAL_REWALK_PARALLEL` (default 4) at a time,
each through the gate, into the same place under the new one. A walk that diverged is ended and its
folder renamed `<walk>-diverged`, which leaves `<walk>` free for a walker to `--replay` again and
carry on by hand from where the build went another way. `rewalk.json` in the new folder lists each
walk's result; the command exits 0 when every route matched and 5 when any diverged. A route that
matched shows what the earlier walk showed, so the earlier walk's report stands for it and nobody
needs to look at it again; only the diverged ones need a walker.

Participants' sessions are never replayed: a participant drives every step. Pilots, detours,
keyboard walks and the re-walks after a fix replay.

## The scripted dry run

A dry-run pass starts with the app's scripted routes (`graphty/acceptance/`, one per task half: the
success path as real clicks and keys on the GPU, with outcome checks read through graphty-element's
API), not with an agent:

```bash
node $T/dry-run-pass.mjs --dist <frozen build> --out <main checkout>/tmp/design-studio/tier3/<pass>/script
```

It runs every route (about a minute for tier 3's 30), keeps the screen each one ended on, and
compares it with the same route's in the newest earlier pass beside `--out`, with the drawing and
the status bar covered: the drawing may still be settling when a route ends (what it shows is what the
outcome checks read), and the autosave chip says "saving..." or "saved" depending on when its write
lands. A screen that changed is run once more, and one that differs between two runs of the
same build is marked `unstable` instead of `changed`. `summary.json` in `--out` lists each route's
task, result, reason, screenshots (`<route>.png`, and `<route>.ui.png` with those covered),
`change` (`same`, `changed`, `new` or `unstable`) and diff image. The design studio's workflow sends
a pilot agent only to a task whose route failed or has none, and the `changed` and `new` screens and the
broken walks to one reviewer (below). `node --test $T/dry-run-pass.test.mjs` checks how it finds the earlier pass.

### The reviewer

`dry-run-review.mjs` turns a pass into one request for a fresh-context agent, and checks its answer:

```bash
node $T/dry-run-review.mjs request <pass>/script [--base <ref>] [--study <tier dir>]
node $T/dry-run-review.mjs verdicts <pass>/script
```

`request` picks the routes whose end screen changed or is new and those whose walk broke before its
outcome checks, and writes `review-request.md` (the reviewer's whole prompt, with each route's new and
earlier screen, diff image and accessibility tree) beside `summary.json`, exiting 3. With nothing to
judge it writes nothing and exits 0: no agent is started. A failed outcome check is a bug with no
judge (exit 1), and an `unstable` screen is not judged. A route the machine stopped (the browser not on
the NVIDIA card, no worker reached it) has no screen: the pass could not run, exit 4, and nothing is
judged. The agent gives each route one verdict -- `bug`, `intended` (naming the commit or answer-key
line that explains it), `usability` or `cannot-tell` -- with a reason and the screenshots it rests on,
in `verdicts.json`; `verdicts` checks it (evidence only from that route's own files, an `intended` cite
only a commit of the branch, or with no `--base` any commit, or an existing `file:line`) and exits 1
while a bug or cannot-tell remains. Exit 2 from either command is a failure of the tool or the answer,
never a result. The design studio's workflow runs it after the scripted
pass and adds every verdict but `intended` to its task's defects.

On a long-running branch, its agent runs the same thing itself, never automatically: a pass on a build of
the branch's base, then one on the branch's head beside it (so the head's earlier pass is the base's), then
the request with `--base`, which adds the branch's commits and changed files so `intended` can name a commit:

The base build is a worktree at the base with graphty built in it (`git worktree add tmp/<task>/base
origin/master`, `pnpm install --frozen-lockfile`, then `pnpm exec nx run graphty:build`); its
`graphty/dist` is `<base build>`. Run the tool from the branch's own worktree: `--base` reads that
repository's git. For a targeted run, give both passes `--only <route>[,<route>]` with the routes the
change touches; with no `--only` every route runs twice.

```bash
node $T/dry-run-pass.mjs --dist <base build> --out tmp/<task>/acceptance/base/script
node $T/dry-run-pass.mjs --dist graphty/dist --out tmp/<task>/acceptance/head/script
node $T/dry-run-review.mjs request tmp/<task>/acceptance/head/script --base origin/master
```

Exit 3: give the agent a fresh-context subagent the request file's path; it writes `verdicts.json`.
`node --test $T/dry-run-review.test.mjs` checks the selection and the answer check.

What a `same` screen does not show: the drawing and the status bar are covered, so a drawing problem
the outcome checks cannot read (labels gone, nodes off screen, a blank canvas) or an error chip in the
status bar reads as `same` and no reviewer looks at it. An `unstable` screen is logged and not
reviewed, so a real change on a route that also flickers between runs is hidden until the route is
made stable. Pilots walk the detours and the keyboard walk; a route that passes is not looked at
screen by screen.

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
unconfirmed, `--read` in the Export dialog, the first Tab after a setup landing on Main menu), a
planted position pick between the open Attribute list's option "weight" and the Data panel's row
"weight" that must be refused, an end, and the participant's side without a browser (a participant's folder inside the studio's files refused, one with no briefing refused, a briefing written outside the studio, a planted transcript that opens `tasks.md` voided by name while a clean one and another agent's are not, an end that copies the session back with `leaks.json` and keeps a note written in the round's folder before it, a round's leak check that fails naming a session with no readable log, a start refused for a session of a round whose plan holds no gate evidence, and a gate that refuses a round folder with no pilot results and no bars run, then passes and lists the evidence in the plan; then, with every slot of a planted one-slot pool full, a start bounded by `REAL_SLOT_WAIT_SECONDS` that exits 4 with nothing started, and the same start run again that starts the session once the slot frees), and the faster tool's own checks (the session draws on the GPU, not SwiftShader, and `session.json` names the renderer; a batch stops at its first miss; a walk saves its route; a replay of an unchanged route matches every check point and ends; a planted change in what a step printed stops a replay at that step with the session left open; a rewalk that sorts an unchanged route from a missing control and a changed screen, keeping the diverged folders aside; and, in a pool of its own, a start that tops up the warm pool and the next start that takes the warm browser over). It prints `ok` or `FAIL` per check and exits 1 on any failure. `node --test design/ui/studio/tool/with-browser.test.mjs` checks the gate's caps and its try mode without a browser.
Its sessions are written under `design/ui/studio/tmp/prove/`, which it clears first; set
`REAL_PROVE_DIR=<folder>` to run it beside another self-test.

## Measuring the scripted bars

```bash
node design/ui/studio/tool/bars.mjs <out dir> [--dist <build dir>] [--scheme dark|light]
```

For tier 3, `bars.mjs <out dir> --tier 3 [--dist <build dir>] [--scheme dark|light]
[--record-limits]` measures only tier 3's screens, walked from the empty start page by clicking as
a first-time user would ("Open a file", Samples): every screen, focus action and typing check
bar 6 of `../tier3/criteria.md` lists, at 1440 x 900 and 900 x 700: axe, shared names, focus and
typing are read at both sizes (each result past the first size is keyed "<name> at 900x700"), and
each of those four checks must catch its planted failure at both sizes, or its readings there are
not trusted and the gate refuses the run. That list is `BAR6` in
`measure.mjs`; whatever of it the walks did not reach is a `MISS` line ("not walked (bar 6 lists
it)"), as is every step that missed or was refused. It checks bar 8 (axe, shared names, focus kept
after each action, a value typed with no click written after adding a text card, choosing "Starts
with", adding a Color line and a Shape line), bar 9 (words at rest against the `tier3` counts in
`bars-limits.json`, which `--record-limits` writes from the run, keeping the lower count) and bar
10, with the same planted cases, and writes `vocabulary.json` (every measured screen's words and
control names) and `spoken.json` (what each screen says out loud: its controls' accessible names,
what has focus, the live regions' text and the notices shown during the move), both for the
wording check. `--only <walk>[,<walk>]` and `--size <WxH>` run part of it, for writing a walk.

For tier 4, `bars.mjs <round folder>/bars --tier 4 --scheme dark --dist <frozen build>` (and
`<round folder>/bars-light --tier 4 --scheme light`) walks bar 5's data screens of
`../tier4/criteria.md` from the empty start page: the web address box (from the start screen and
from Sources "+"), Sources "+", the join screen (deliveries.csv added to pantries.csv), the issue
list, Fields "+", the Filters picker and Export on Data, at 1440 x 900 and 900 x 700, with axe on
each; the axe, shared-name and focus checks each catch a planted failure at both sizes first. A
serious or critical axe finding fails the run (shared names and focus are reported only), as does a
screen not reached (a `MISS` line). It writes `vocabulary.json` and `spoken.json` for the wording
check, as tier 3's does.

```bash
node design/ui/studio/tool/endstate.mjs <round folder | session folder> ...   # bar 4's end-state check
node design/ui/studio/tool/endstate.mjs --self-test                            # planted mismatches caught
node design/ui/studio/tool/steps.mjs <round folder> [--answers <answers.md>]   # bar 7, steps per core task
node design/ui/studio/tool/steps.mjs --self-test                               # planted cases caught
node --test design/ui/studio/tool/tier4.test.mjs                               # tier 4 gate, bar 5 list
```

`endstate.mjs` reads each session's `data.json` and exported files and writes `endstate.json`
beside them. It reports a filter card whose chips differ from graphty-element's count; a Hide card
on alone whose count is not what is drawn (one that hides more than it says), or, with several,
what is drawn outside the cards' bounds (with a time window on, only the upper bound); a Select
card on alone whose count is not what is selected (with several, outside the largest and their
sum); a source whose counts differ from its recount or its row chips; and an exported file (CSV,
GraphML, GEXF, JSON) whose node or edge rows match neither the whole network, what was drawn nor
one source when it was written (`downloads.jsonl`). An image or a project file is listed, not
counted. Exit 1 on any mismatch, on a session with no `data.json`, and on a run that read no item.
`steps.mjs` counts each core task session's inputs in its `route.jsonl` (clicks, keys, typed text,
files chosen or dropped, drags; hovering, reading and `--expect` are not steps) against the answer
key's "Path steps" for its half, and fails a core task whose median is more than 3 over its path,
that has no path count, or that has no graded session to count; a VOID session gives way to its
re-run and a keyboard-only session is reported apart. It writes `steps.json`.

```bash
node design/ui/studio/tool/wording.mjs <tasks.md> <out dir>/vocabulary.json   # prompt words on screen
node design/ui/studio/tool/wording.mjs --self-test                             # each planted echo caught
node design/ui/studio/tool/keydraw.mjs <round folder | session folder> ...     # key and drawing agree
node design/ui/studio/tool/keydraw.mjs --self-test                             # planted disagreements
node design/ui/studio/tool/score.mjs <round folder> [--task T39]                # bars 1 to 4 (bar 4 limit: 10)
node design/ui/studio/tool/score.mjs --self-test                               # planted failures caught
node --test design/ui/studio/tool/tier3.test.mjs                               # tier wiring, style dump
```

`wording.mjs` lists every word a prompt shares with the screens or with `spoken.json` beside
`vocabulary.json` (it fails without it), except common English words and the words `tasks.md` keeps
on purpose ("Kept in every task", each task's "Kept on purpose"), and every phrase of two or more
words (not only common ones) a prompt shares with one screen's words, one control's name or one
spoken line, even when each word is kept; a phrase kept on purpose is listed in backticks like a
word. A word's forms count as one: plurals, -ed, -ing and irregular forms (draw, drawn; keep,
kept). Exit 1 on any. `keydraw.mjs` reads each session's `key.json` (written by `--end`: the key's
sections, each row's chip color, and how many nodes and edges are drawn in each color) and
`styles.json`, and reports a key row in a color nothing is drawn in, two rows of one section in one
color, and a "N of M nodes" the layer of that name or the drawing does not bear out; it fails on a
session with no `key.json` and on a run that read no key row. `score.mjs` reads the round's `plan.md`, each session's `grade.md` (its first three lines:
`Grade:`, `False done:`, `Wrong turns:`, plus `Route:` on a T47 success and `Scripted exit: yes`
on a scripted give-up) and `styles-steps.jsonl`, and writes `score.json`.

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
