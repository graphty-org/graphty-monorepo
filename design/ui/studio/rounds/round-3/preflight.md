# Round 3 preflight: the tier 1 study on the real graphty app

Checked on 2026-10-07 against the ten items under "Before a round may start" in `criteria.md`, on
the studio worktree's build `b7590f8de22b graphty@0.8.53` (commit b7590f8de; HEAD is f108a2350,
which adds only studio documents), served from a frozen copy,
`design/ui/studio/tmp/researcher/r3/dist-b7590f8de`.

## Verdict

**PASS: round 3 may start.** All ten items hold. Nothing blocks. Three things were fixed during the
check, each in the study, not the app:

- **The word count for bar 9 counted words nobody sees.** `tool/bars.mjs` counted the hidden
  status line a screen reader reads (the new "Les Miserables: 77 nodes, 254 edges") and a label
  clipped to nothing, so round 3's build first measured 46 words at rest against round 2's 42,
  which would have failed "app words at rest never go up". The script now skips text inside a box
  clipped to 1 pixel or less, as the rule ("visible words") says. Measured again with the same
  script: 41 on both builds. Logged in `criteria.md` (change log, 2026-10-07).
- **The tool printed `ambiguous` for every labeled control** ("Show all labels", "Format",
  "Table"), counting a label and its input as two controls. Graders were going to meet two false
  prints per T13 session and one per names session. `tool/real.mjs` now treats a label and the
  control it labels as one; `--prove` passes again (33 checks) and a scripted session clicks
  "Show all labels" and "Format" with no `ambiguous` print.
- **The answer key still marked five round 3 routes "not yet walked"** and planned statements
  ("re-record at preflight"). Every one is now walked on this build and written in `answers.md`;
  T7's route keeps its Values step, the names control is called a checkbox, T11 accepts Rings by
  group and Columns by group alike, and T14, T13 and T8 have round 3 entries.

**Known before the round (does not block it):** bar 8 fails on its automated part already (below,
item 8 and "Found while checking"), so round 3 cannot meet every bar unless that one color changes
first. That is the studio's decision, not a study fault. If the color changes before launch, the
build changes: re-run items 1, 2, 3 (keyboard paths only), 9 (hashes) and the bars script.

## The ten items

| #   | Item                                                                                                    | Result                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The build under study is this worktree's commit, rebuilt; the commit is in every `session.json`         | PASS                       | `graphty/dist/index.html` carries `b7590f8de22b graphty@0.8.53`, built 02:47 after the last code commit (02:45); compact-mantine's `dist` was rebuilt at 02:46, after its two fixes. `git diff --stat b7590f8de HEAD -- graphty graphty-element compact-mantine` is empty and nothing is uncommitted there. The build is copied to `tmp/researcher/r3/dist-b7590f8de` and every session serves the copy (`REAL_DIST`, `plan.md` step 2). Each `session.json` records HEAD (f108a2350) and the build stamp; graders check the stamp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2   | `real.mjs --prove` prints only `ok`, including the screen-reader mode and a planted `--click` refused   | PASS                       | `preflight/prove2.out`: 33 checks, "every check passed", exit 0, after the label fix (the first run, `tmp/researcher/r3/prove.out`, also passed). Screen-reader checks include the refused planted click, the highlighted option of the find box, a region that arrived filled marked unconfirmed, and `--read` in the Export dialog.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 3   | Every task's success path and keyboard path runs on the build as a script and ends on its success state | PASS                       | **Success paths, every tier 1 task:** T6, T7 (both datasets), T9 (both), T10 (both), T11 (main and group routes), T12 (both), T13, T15 (both) and T16 in `rounds/r2/pilot/<task>/` on this build; T2, T3, T5, T8, T14 and the T7 B setup in `preflight/<task>/` (`tmp/researcher/r3/walk.sh`). Each reached its end state; screenshots looked at. **Keyboard paths** (`preflight/keypaths.out`, keys and typing only, 14 of 14 reached their end state): T2 20 keys; T5 18; T6 28; T9 57 (Les Miserables) and 60 (Florentine families); T10 53 and 55, including Space on "Show all labels"; T12 27 and 30 (26 by G); T14 97; T15 105 (Les Miserables) and 103 (the own file, now walked whole by keys); T15's export by Main menu > Export... 51. **Screen-reader mode** (`preflight/C-sr2.out`): the drawing is announced as `Canvas "Graph drawing"`; arrowing the Analyze filter announces the highlighted option ("PageRank Start here ..."); the run is announced "PageRank finished". No step needed a pointer. |
| 4   | Every reference value recorded on the commit under test; none blank                                     | PASS                       | `preflight/ranks.out`: every ranking on Les Miserables, Florentine families and friends.csv identical to `answers.md`, the run rows now named by method. Louvain: 6 groups, 20, 17, 11, 11, 10, 8, modularity 0.5556, the same 20 members of Group 1 in the exported nodes CSV, on 3 of 3 fresh loads (round 2's version of this script exported the wrong format and read no groups; fixed). Label statements: "77 labels, 7 hidden", "115 labels, 14 hidden", "77 labels, 6 hidden" once sized, "20 labels, 0 hidden" sized on friends.csv, and "77 labels" / "115 labels" with the checkbox on (keyboard walks and pilots). Javert 17 and the Medici 6 neighbors identical.                                                                                                                                                                                                                                                                                                                                         |
| 5   | Wording check on every screen a success path reaches; the script fails on a planted echo                | PASS                       | `tmp/researcher/r3/wording-dump.mjs` dumped 51 screens (two misses: the usage card's "What is collected" is not a button, as in round 2, and the Rings by group form, which the T11 pilot shows); `preflight/wording-check.out` caught the planted "picture, save, analyze, export" and refuses fewer than 30 screens or 17 prompts. Three words newly shared ("finish" in T15, "fix" and "exactly" in T5) are kept, each with its reason, in `tasks.md`. No prompt changed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6   | Persona files strengthened (Dev, Ruth, Grace), Nadia's checked, Sam's written                           | PASS, with round 1's limit | Unchanged since round 1 (SHA-256 below equal round 2's). The studio files for Dev, Grace, Ruth and Sam have still had no skeptic review, so no first-time persona carries more than 7 sessions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7   | The tool can close the tab and reopen the same browser storage (T14)                                    | PASS                       | `--prove`: "a reopened tab keeps the browser storage". The T14 walk saved "Les Mis work", went Back to start and reopened it from Recent projects with the PageRank colors and the names (`preflight/T14/08.png`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 8   | The exported image has a key                                                                            | PASS                       | T15 on both datasets: "Size: PageRank" and "Color: PageRank" with ranges (`rounds/r2/pilot/T15/A/downloads/`, `B/downloads/`); T13: "Color: Louvain" with Group 1 to 6 (`rounds/r2/pilot/T13/downloads/`). After a ranking run and then a community run the key shows only "Color: Louvain" (`preflight/C-legend/08.png`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 9   | Tasks and criteria frozen; a new round folder; participants get only the prompt and their persona file  | PASS                       | `rounds/round-3/` is new. Changes made between rounds are logged: `criteria.md` change log (round 3 size, bar 9 script), `tasks.md` (round 3 wording check), `answers.md` (walked round 3 routes, re-recorded values, keyboard counts), `roster.md` (round 3 allocation). Their SHA-256 are below; a session may start only if they still match. Participant rules: `plan.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10  | Every change carried into the round is listed as built or not built, checked on the served build        | PASS: 12 of 12 built       | Table below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## The twelve changes, checked on the served build

| Change                                                           | Built? | How it was checked                                                                                                                                                      |
| ---------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A dialog opened from a menu keeps focus                          | Built  | Keys: Main menu, Export..., Enter: focus `button "Close"` inside the dialog, Tab stays inside, Escape returns focus to "Main menu" (`preflight/keypaths.out`, T15Amenu) |
| The key leaves out a layer painted over on every node            | Built  | Degree, then Louvain: the key reads only "Color: Louvain" (`preflight/C-legend/08.png`)                                                                                 |
| Fit in 2D frames the whole graph                                 | Built  | View > 2D, zoom in, key 0: every node back inside the canvas (`preflight/C-2dfit/06.png`)                                                                               |
| Group layouts offer community results                            | Built  | After Louvain, Rings by group and Columns by group are enabled with "Group by: Communities" chosen; both apply (`rounds/r2/pilot/T11/groups/`)                          |
| A finished load and a finished run are announced                 | Built  | Live region: "Les Miserables: 77 nodes, 254 edges", "friends: 20 nodes, 41 edges", "PageRank finished" (`preflight/keypaths.out`, `C-sr2.out`)                          |
| The drawing has a name and a focus ring                          | Built  | Tab reaches `Canvas "Graph drawing"`; a thin dark ring frames the canvas (`preflight/C-sr2/15.png`). The ring's contrast is bar 8's to measure                          |
| Size "+" opens its picker                                        | Built  | "Add to Shape", "Size": the list opens at once with "Fixed size" first; by keys, Down arrow to "PageRank", Enter (`rounds/r2/pilot/T9/`, `keypaths.out`)                |
| A clickable row's trailing glyph is part of the row              | Built  | A click at the chevron of "Degree 17 >" (1411, 236) opens "Javert's 17 connections" (`preflight/C-chevron2/06.png`)                                                     |
| A run is named by its method everywhere                          | Built  | Outline, key, inspector, Values and the run rows of every ranking read the method (`preflight/ranks.out`, pilots)                                                       |
| "Show all labels" beside the hidden count                        | Built  | A checkbox; checked, the statement reads "77 labels" and every name is drawn; by keys Tab and Space, announced "77 labels" (`rounds/r2/pilot/T10/`, `keypaths.out`)     |
| Screen-reader mode hears the highlighted option; baselines first | Built  | `--prove`; the Analyze filter's highlighted option printed (`C-sr2.out`); round 2's bars baseline is in `rounds/round-2/baseline/`, re-measured below                   |
| Answer key for the new routes                                    | Built  | `answers.md` round 3 entries walked (item 3)                                                                                                                            |

## Bars 8 and 9, measured before the round

`tool/bars.mjs` on this build (`preflight/bars/bars-b7590f8de.json`) and, with the same script, on
round 2's build (`bars-4a7a1a7fb.json`):

- **Bar 9, app words at rest: 41 (target <= 50), PASS**, the same 41 on both builds.
- **Bar 8, axe part: FAIL, one cause, unchanged from round 2.** Dimmed text `#8c8c8c` on the dark
  panel `#2c2c2c` measures 4.15:1 where 4.5:1 is required, on 9 of 13 screens (start screen,
  Analyze, Style with a label line, find results, a node's Values, Export Image and Data, the
  refusal). It is one color in compact-mantine's dark ramp; no round 2 decision changed it. The
  other parts of bar 8 (shared names, focus drops, focus visibility, announcements) are the
  accessibility specialist's script and are not measured here.

## Found while checking (none blocks the round; each goes to whoever owns the fix)

- **Focus falls to the page after opening a sample.** The drawing no longer takes focus on load
  (the change removed it on purpose), so after Enter on "Open the Les Miserables sample" focus is on
  nothing and the next Tab starts at "Main menu". Focus also still falls to the page after "No
  thanks" (a bar 8 "focus never drops" item). Expect keyboard participants to comment.
- **"PageRank finished" is spoken again after a saved project is reopened**, after "Opened
  <name>": a restored run, not a new one. A screen-reader participant may think it re-ran.
- **The run row of a reopened project still has no count** (graphty-element: a restored run has
  no summary), as in rounds 1 and 2.
- **Graphty-element's own English still reaches the screen:** the Layout list's refusals ('G is
  not planar', 'the layout "bipartite" needs exactly two groups, and "results.louvain.group" names
  6'), British "centre" in a layout description, and graph-io's sentences in the CSV export box.
- **Seen in the pilots and expected in sessions:** the key box covers a node at the top left on
  Florentine families and Les Miserables (one placement per dataset, held after round 2); the 3D
  view draws Ava's dot larger than Farah's on friends.csv although Farah ranks first; selecting a
  node recenters the camera so low nodes sit under the toolbar; Columns by group draws the groups
  out of the key's order; the Overview's "Undirected, from the file: directed 0" runs past the
  panel edge; histograms of all-distinct values draw equal bars.
- **For the study's own tools:** `real.mjs --click-at` names what it hit as "presentation" on the
  Degree row's chevron (the click works); the screen-reader walk of this check took the wrong
  control once because a Tab count was guessed (`preflight/C-sr/`), which is the walker's error,
  not the app's.

## Frozen files (SHA-256 at the end of this preflight)

Recompute in `design/ui/studio/` with `sha256sum criteria.md tasks.md answers.md roster.md
personas/*.md tool/real.mjs tool/bars.mjs rounds/round-3/setups/*.txt`. A mismatch means a file
changed after the freeze: stop and find out why.

```
23c0b9080f49e30fd9d2ffb1e3010442ba46190c45bd560ad1d793db968b2a77  criteria.md
894c14c8648890a0986f7b41842606d6677bff2ee53fdd82ccec76524dd5a104  tasks.md
5f352f4b6f3188d1283712666375bf02ff80694878faf59618e852f1d457a2aa  answers.md
d36773a272933bf00d4dcc8c119a09b2cba38bc0ccdf72fa90d7301aea118051  roster.md
3a0a87789c5bff210e7c7032a1abebd2b0f95306e8ea1f484905e56c5ad6a0f3  personas/class-project-student.md
e24c20183436e7314ecda7d44e20fb99934c570a966bddea173daf9d091c2b37  personas/data-journalist.md
fb41423b1b958006dc9d5ee98f7077f4230159e26d7fb2c2fa6c43fffd4b950e  personas/keyboard-only-sam.md
05745739eb0bae0edfc52c93634afd4fd291d2234777d30a2ff9f2ec2eded954  personas/nonprofit-operations-analyst.md
dddb3254d82804184321de3c0ab39c23db5d9bc1afe984034acbd9541007b722  tool/real.mjs
d01c721db3b5a5c24111455d7c3fbc1eff9efb4069bdb3731e8390ff6fdcacaf  tool/bars.mjs
df1d489610c065b31d58411caa6ef20630164dcda04ad12685152aef84e73c8c  rounds/round-3/setups/T13.txt
b62d7f33b6052f4e895e373edb9d8d7c74cad3dd3bd630dc5611cb9d260133dc  rounds/round-3/setups/T14.txt
03939df715d4a00fdbee3ba0947670c35fc4443dacfcc2a32bdd091d3de36f18  rounds/round-3/setups/T7-B.txt
```

## Conditions on the runner (as in round 2)

1. At most 3 participants alive at once, every attempt followed by `real.mjs --end`; a dry run of
   a few queued sessions with one planted agent stop is run by whoever starts the round.
2. Every `real.mjs` command of a session carries `REAL_DIST` pointing at the frozen copy.
3. The runner hands each participant the persona file named in its session record (a full path),
   the one-or-two-sentences-per-step rule and the rating question as written.
