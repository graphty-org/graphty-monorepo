# Driving the real graphty app in a study

`real.mjs` lets a study participant (or a pilot, or a grader) use the real graphty app one step at
a time: it opens the app in a headless browser, does what each step says, waits for the drawing to
settle, and saves a numbered screenshot of the whole 1440 x 900 window after every step. Each
session is one live browser, so the graph stays exactly where the participant last saw it.

The app under study is the production build in `graphty/dist` of this worktree, opened at `/?next`
(the tier 1 workspace; the parameter goes away when that workspace becomes the default). The tool
serves the build itself on a loopback port, so no dev server or network is involved. Rebuild the
app after changing it: `pnpm exec nx run graphty:build` from the worktree root, with the Sentry
variables unset.

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
  per line, unquoted (`--click Open the Zachary's karate club sample`); `#` lines are comments. A
  setup step that misses fails the start with `SETUP FAILED`, which is itself a finding.
- The folder gets `01.png`, `02.png`, ..., `session.json` (the commit and build under study, the
  start), `session.log` (the session process's own log), `setup.log`, and `downloads/`.
- A session nobody steps for 45 minutes closes itself, so a forgotten one cannot hold a browser.

## Steps

Several steps may follow one `--step`; they run in order, and one screenshot is saved at the end.

| Step                                                                                | What it does                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--click "<name>"`                                                                  | Clicks the control with that name: what it says, its accessible name or its label. Exact names before partial ones. `"<name>#2"` takes the second of that name; `"role=tab:Style"` only that role. A name several controls share prints `ambiguous`. |
| `--rclick`, `--dblclick`, `--shift-click`, `--ctrl-click`, `--alt-click`, `--hover` | The same, with that button or key held. A hover prints the tooltip.                                                                                                                                                                                  |
| `--click "<node name>"`                                                             | With no control of that name, clicks a node whose label is drawn on the canvas and is on screen, at its center, and says where. A node with no label drawn cannot be named, as for a person.                                                         |
| `--click-at x,y` (`--rclick-at`, `--dblclick-at`, `--hover-at`)                     | A point on the last screenshot. Prints what is there: a node (by its label), empty canvas, or the control.                                                                                                                                           |
| `--hover-icon <n>`                                                                  | Hovers the nth control that has a name but no visible text, and prints its tooltip.                                                                                                                                                                  |
| `--drag x1,y1 x2,y2`                                                                | Presses at the first point, moves to the second, releases (pan, or move a node).                                                                                                                                                                     |
| `--wheel x,y,delta`                                                                 | Turns the wheel at a point; a negative delta zooms in.                                                                                                                                                                                               |
| `--key <Key>`                                                                       | A key or chord: `Enter`, `Escape`, `ArrowDown`, `Control+o`.                                                                                                                                                                                         |
| `--type "<text>"`                                                                   | Types into what has focus. With nothing that takes text focused, types nothing and fails.                                                                                                                                                            |
| `--upload <file>`                                                                   | Answers the open file chooser (or the next one to open within 3 seconds).                                                                                                                                                                            |
| `--drop <file>`                                                                     | Drops the file on the middle of the window.                                                                                                                                                                                                          |
| `--wait <ms>`                                                                       | Lets the app work on its own for a moment.                                                                                                                                                                                                           |
| `--expect "<text>"`, `--expect-not "<text>"`                                        | Fails unless the text is (or is not) on screen. Also `role=<role>`, `role=<role>:<name>` and `selected=N`.                                                                                                                                           |

A file is a path, or a name from `files/`:

| File                   | What it is                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| `friends.csv`          | A links spreadsheet: `source,target,weight`, 41 rows between 20 people. |
| `florentine.gml`       | A small GML network: marriages between 15 Florentine families.          |
| `club-members.graphml` | A GraphML file cut off part way through, which the app cannot read.     |

## What it prints

- `tooltip: "..."` after every hover, or `tooltip: null`.
- Misses: `nothing on screen is called "..."`, `only 2 controls are called ...`.
- `ambiguous: ...` when a name is shared.
- `at x,y: node "Medici"` (or `empty canvas`, or the control there) for every point step.
- `a file chooser is open` when a click opened one.
- `a file was saved: florentine_current-view.png, 1806 x 1720 (path)` for every download.
- `the drawing is still moving` when the layout had not settled 15 seconds after the step.
- Every script error, `console.error` and failed request since the last step. In the real app
  each is a defect worth a bug report. They make the command exit 1.

## Browsers

At most four browsers run at once on this machine, across every study and tool. A session takes
one of the four slots (`with-browser.sh`) when it starts and holds it until `--end`; a start
waits, saying so, while all four are taken.

## Checking the tool

```bash
node design/ui/studio/tool/real.mjs --prove
```

Runs real sessions against the build: a start, clicks by control name and by a node's drawn
label, a click at a point, a hover tooltip, typing, an upload, a download, setup starts (one that
works, one that fails) and an end. It prints `ok` or `FAIL` per check and exits 1 on any failure.
Its sessions are written under `design/ui/studio/tmp/prove/`.
