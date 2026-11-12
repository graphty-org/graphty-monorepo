# The graphty design studio: tier 1 study report

Written 2026-10-07. The studio tested whether a first-time user can do the core things in the real graphty app, and fixed what got in the way. The core things are: open data, read it, run an analysis, size and label nodes by it, find a node's ties, save a picture and the numbers, and save and reopen a project. Three rounds ran. This report covers what was tested, what it showed, what changed and what happens next.

## 1. What was tested

**The build.** The study used the real graphty app, not a mock. It was built from the local branch `design/studio-tier1` in the worktree `.worktrees/design-studio-tier1` and served as a production build at `https://dev.ato.ms:9366/?next` (`?next` opens the tier 1 workspace). Each round froze one build, and every session recorded its build stamp:

| Round                                    | Build (commit)                                                          | Sessions planned / graded |
| ---------------------------------------- | ----------------------------------------------------------------------- | ------------------------- |
| Pilot (every task walked once by script) | a1e6b91ff                                                               | 16                        |
| Round 1                                  | 9d6598eea (452285142 for a few re-runs; they differ by one header word) | 56 / 43                   |
| Round 2                                  | 4a7a1a7fb                                                               | 56 / 56                   |
| Round 3                                  | b7590f8de (`graphty@0.8.53`)                                            | 56 / 54 (2 void)          |

Before rounds 2 and 3, every task was walked again by script on the new build (about 20 and 9 sessions). This proved that each decided change was on screen and that the answer key still matched.

**The tasks.** There were thirteen tier 1 tasks, listed in `tasks.md`, with success definitions in `answers.md`. Each is a short prompt that never names the control it needs:

- something to try it on (pick a sample)
- your own list of ties (a CSV file)
- a file that will not read
- what did I get
- who matters most
- circles of characters (communities)
- bigger dots for the ones that matter
- names on every dot
- untangle the drawing (layout)
- one character and who he is tied to
- a picture and the numbers for a report
- stop for the day and come back
- a whole first session that chains most of these

A first-look task was measured but not graded. The core four tasks ran on two datasets each, so an answer could not come from memory of one sample. The core four are: the whole first session, names on every dot, one character's ties, and bigger dots.

**The participants.** There were twelve simulated personas (`roster.md`):

- Six first-time users took about two thirds of the sessions: a product manager, a lab manager who only opens files, a bank alert reviewer, a student, a nonprofit's data person and a reporter.
- The rest were an operations analyst, a marketing analyst, a supply-chain analyst, an expert Gephi user, a keyboard-only analyst and a blind screen-reader analyst.

Each session is a fresh agent with no memory of any other. It drives the app through a headless browser one step at a time (`tool/real.mjs`) and sees a screenshot after every step. The screen-reader persona sees only the accessibility tree and live-region text. The participant thinks aloud, says when it is done, and rates ease from 1 to 7. Graders scored each session against the answer key and its screenshots. Defects were reproduced by script. Two independent skeptics then tried to refute every finding before it was kept.

**What a simulated participant can tell us.** It finds dead ends, silent actions, false counts, broken keyboard paths, and words that send people to the wrong place. A failure is strong evidence, especially one reproduced by script.

**What it cannot tell us.**

- It is one model playing every persona, so twelve "people" making the same wrong first guess is really one guess repeated.
- Its ease ratings are uncalibrated.
- A pass is weak evidence until real people confirm it.
- It does not hear what a real screen reader speaks.
- It may know the famous datasets (Les Miserables, Florentine families) from training, so answers counted only when read off the screen.

## 2. Results against the frozen criteria

The nine bars in `criteria.md` were frozen before round 1. "Done" means one of three things: all nine bars hold in one round, round 3 finishes, or a round shows no gain on the core four. Each table shows the result after the skeptic check, and notes the scorer's first reading where it differed.

### Round 1 (43 graded sessions)

| Bar                                                   | Target          | Result                                                                                                                              | Status          |
| ----------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1. Each task's success; each dataset half             | >= 75% per half | 39 of 43. One character's ties: Les Miserables half 1 of 3                                                                          | Fails           |
| 2. First-time personas' sessions                      | >= 80%          | 31 of 34 (91%)                                                                                                                      | Holds           |
| 3. Severity-4 problems open                           | 0               | 1: a node's neighbors by name could only be reached by clicking an unmarked "Degree" value; two participants left without the names | Fails           |
| 4. Silent commit on a success path                    | 0               | The "No crossings" layout did nothing and said nothing (one participant, reproduced)                                                | Borderline fail |
| 5. Counts or key lines that disagree with the drawing | 0               | None shown                                                                                                                          | Holds (weak)    |
| 6. False "done"                                       | 0               | 0 of 43                                                                                                                             | Holds (weak)    |
| 7. Keyboard and screen-reader personas succeed        | all             | Screen-reader mode not built yet; one keyboard session cut off                                                                      | Cannot pass     |
| 8. Automated accessibility check                      | passes          | Not run                                                                                                                             | Not scored      |
| 9. App words at rest                                  | <= 50           | Not run                                                                                                                             | Not scored      |

Tier 1 ease was 4.50. The core four went 24 of 26, ease 4.07. Fourteen sessions were lost to the study runner, not to the app: its clock ran while a session waited for a browser.

### Round 2 (56 sessions, 0 void)

| Bar                               | Target          | Result                                                                                                                                                                                  | Status                                |
| --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1. Each task; each half           | >= 75% per half | 52 of 54. Neighbors task 8 of 8 (it failed in round 1)                                                                                                                                  | Holds                                 |
| 2. First-time personas            | >= 80%          | 34 of 34                                                                                                                                                                                | Holds (weak)                          |
| 3. Severity-4 problems            | 0               | A dialog opened from the main menu left focus behind it, and the screen-reader persona gave up on export. Held at severity 3 after the check: one participant, partly a tool blind spot | Holds after check (scored as failing) |
| 4. Silent commit                  | 0               | 0                                                                                                                                                                                       | Holds                                 |
| 5. Counts or key lines vs drawing | 0               | The key kept "Color: Connections" after a community run repainted every node (reproduced)                                                                                               | Fails                                 |
| 6. False "done"                   | 0               | 0 of 56                                                                                                                                                                                 | Holds (weak)                          |
| 7. Keyboard and screen reader     | all             | Keyboard-only 3 of 3. The screen reader failed the whole first session at the export dialog                                                                                             | Fails                                 |
| 8. Accessibility check            | passes          | Not run; expected to fail                                                                                                                                                               | Not scored                            |
| 9. Words at rest                  | <= 50           | 41, measured later on this build                                                                                                                                                        | Holds                                 |

Tier 1 ease was 4.98. The core four went 33 of 34, ease 4.88. The round was not stalled.

### Round 3 (56 sessions, 2 void)

| Bar                               | Target          | Result                                                                                                                                                                                                                             | Status                                |
| --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1. Each task; each half           | >= 75% per half | 53 of 53 valid; every task and half at or above its bar                                                                                                                                                                            | Holds (weak)                          |
| 2. First-time personas            | >= 80%          | 35 of 35                                                                                                                                                                                                                           | Holds (weak)                          |
| 3. Severity-4 problems            | 0               | Scored as one: in the default 3D view a nearer dot is drawn larger, so two close sizes (2.8% apart) appear in the wrong order. Held at severity 3: no one asked to rank answered wrong, and graders had been told what to look for | Holds after check (scored as failing) |
| 4. Silent commit                  | 0               | 0 in 56                                                                                                                                                                                                                            | Holds                                 |
| 5. Counts or key lines vs drawing | 0               | The label count was challenged and found true: names collide, but they are drawn                                                                                                                                                   | Holds after check (scored as failing) |
| 6. False "done"                   | 0               | A "Whole graph" export drawn from another angle was scored a false "done". The picture is complete and truthful, so the session regrades as success with difficulty                                                                | Holds after check (scored as failing) |
| 7. Keyboard and screen reader     | all             | Screen reader 7 of 7. Keyboard-only 2 of 2 measured; its whole first session was void because the agent clicked with the pointer                                                                                                   | Fails on missing data                 |
| 8. Accessibility check            | passes          | Gray helper text `#8c8c8c` on `#2c2c2c` measures 4.15:1 (4.5:1 needed) on 9 of 13 screens                                                                                                                                          | Fails                                 |
| 9. Words at rest                  | <= 50           | 41                                                                                                                                                                                                                                 | Holds                                 |

Tier 1 ease was 5.28. The core four went 28 of 29, ease 5.38. The median wrong turns per session fell to 0 (round 2: 1). These ease and wrong-turn gains are a pattern, not proof: they are one model's ratings, and the study tool changed between rounds.

**Did the studio reach "done"?** Yes, by the stop rule "round 3 finished", not by passing. Seven of nine bars hold in round 3:

- Bar 8 fails on one measured color in the shared dark theme.
- Bar 7 fails only because the keyboard-only whole first session was voided and not re-run.

Neither is a reason for a fourth simulated round: each needs only a fix or a single session.

## 3. What was learned

1. **The real app is now usable by a newcomer on the core path, as far as simulation can say.** Every tier 1 task passed in round 3, and first-time personas went 35 of 35. In the last mock round the whole first session went 0 of 21. Evidence: `rounds/round-3/scores.md`. Caveat: passes by one model are weak evidence; this needs real people.
2. **Fixing the route people take beats marking the one they miss.** In round 1, 0 of 6 pointer users found a node's neighbor list. Round 2 changed one route and added no cue, and 8 of 8 then reached the names.
3. **Offering a way out works better than an honest count alone.** "77 labels, 7 hidden" was true, but every names session hunted for a way to show the hidden names. In round 2 none of the 8 sessions was a quick success, and they took 3.5 times the shortest path. A "Show all labels" switch beside the count made it 7 of 8 quick successes at 1.5 times the path.
4. **The exported picture is where quality still drops.** Each of these is a separate graphty-element defect:
    - names are soft while the key is sharp
    - "4x print" is an enlarged 2x picture
    - the key box covers a node (Pazzi on Florentine families, in every session, because the layout is seeded)
    - a "Whole graph" export turns the drawing
    - a selection ring is drawn into the file

    Three of them are reproduced by script (`rounds/round-3/repro/`).

5. **Sizing by a result in a 3D perspective view can put close values in the wrong order.** Ava's dot was drawn about 140 px across and Farah's about 120 px, the reverse of their PageRank scores. The cause is inferred (perspective), not traced. Evidence: `rounds/round-3/repro/r3-s09/run/downloads/friends_current-view.png`.
6. **Every focus change needs a "where does focus go instead" check.** Stopping the drawing from grabbing focus on load fixed one problem and caused another. After a sample opens by keyboard, the button that held focus disappears and focus falls to the page; this was reproduced in six sessions.
7. **Finding things is now the main cost, not doing them.**
    - Size sits behind "+" beside Shape; 16 of 17 sizing sessions named finding it as a difficulty.
    - Labels live on "Everything", not on the graph's own Style tab, which 7 of 8 names sessions opened first.
    - Group layouts are grayed with nothing pointing to a community run; 3 of 5 missed that route.

    Each is one shared guess repeated, so it needs real users before any redesign.

8. **The element still writes English where it should return codes.** Layout refusals ("G is not planar") and CSV export warnings reach the screen in program words. This breaks the rule that graphty-element returns neutral facts and the app writes every word.
9. **Lessons about the study method:**
    - Pilot every task on each new build before a round; it caught task-deciding defects every time.
    - Check that every carried decision is built on the served build.
    - A severity 4 needs a wrong conclusion a reader would act on, judged from what the participant could perceive.
    - Do not tell graders the outcome to look for.
    - Prove a new tool mode against a known-good control before scoring its findings.

## 4. What was changed

All changes are on the local branch `design/studio-tier1`; none are on master. The branch also carries work from other lines that the build under study needed. That work is not studio fixes and is listed only because it ships with this branch:

- four graphty-element feature branches: three are since merged to master (#1264, #1271, #1276), and `elementAt` (#1267) is still open
- a local branch of 54 interface fixes, `fix/ipad-review-2026-10-06`

### Before round 1 (from the pilot), on the round 1 build

| Package                 | Change                                                                                                                                                                            | Problem it fixed                                                            | Next round                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| graphty-element         | Camera keys no longer stick when a shortcut moves focus                                                                                                                           | The drawing spun forever after Shift+A                                      | No spin reported again                                                                         |
| graphty-element + app   | The caller's legend is drawn into a captured image                                                                                                                                | Exported pictures had no key (issue #133)                                   | Every exported picture carried its key, rounds 1-3                                             |
| graphty-element         | A GraphML or GEXF file cut short is refused                                                                                                                                       | A damaged file loaded partly, with no warning                               | The broken-file task passed every round                                                        |
| graphty-element         | Nodes named only by edges are drawn                                                                                                                                               | "New from data..." then Load drew nothing                                   | Own-file task 3 of 3                                                                           |
| graphty-element         | Spectral uses the smallest Laplacian eigenvectors (also changes the layout package)                                                                                               | Spectral was broken                                                         | Partly: still a clump on Les Miserables, which the skeptics judged the algorithm, not a defect |
| graphty-element + app   | No default layout seed in the element; the app passes seed 1                                                                                                                      | Owner rule of 2026-10-06                                                    | Same drawing on every load                                                                     |
| graphty-element         | Undirected graphs are drawn without arrowheads                                                                                                                                    | Arrows on undirected samples invited wrong answers about who can reach whom | No further reports                                                                             |
| graphty-element         | Exported community groups are numbered by size rank, as on screen                                                                                                                 | CSV group ids did not match the legend                                      | Picture-and-numbers task 2 of 2 in rounds 2 and 3                                              |
| app                     | The Analyze list can be picked by keyboard                                                                                                                                        | Enter did nothing in the Analyze list                                       | Keyboard sessions ran analyses                                                                 |
| app (+ compact-mantine) | The Export dialog is modal, with Image and Data as tabs                                                                                                                           | The page behind the dialog stayed clickable                                 | Held                                                                                           |
| app                     | A failed open returns to the start screen and keeps the reason                                                                                                                    | A failed open left an empty project and a reason that vanished              | Broken-file task passed                                                                        |
| app                     | Legend and Color line show only what the drawing shows; one Everything row; focus moves to the node after a find pick; chrome controls named once, with tooltips on cut-off names | False key lines, a duplicate row, focus stuck in find                       | No recurrence                                                                                  |

### Before round 2, on the round 2 build

| Package         | Change                                                                                                  | Problem it fixed                                         | Next round                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| app             | The Neighborhood command opens the neighbor list                                                        | Neighbors by name were a dead end (round 1's severity 4) | 8 of 8 reached the names, though through the Degree row, not the command |
| app             | A refused layout says why under Method                                                                  | "No crossings" did nothing and said nothing              | No silent commit in rounds 2 and 3                                       |
| app             | The selection Summary drops empty rows; the Selection row and source tables open instead of dead-ending | Three detours on the neighbors task                      | No recurrence                                                            |
| app             | Focus moves to the new line after a Style pick                                                          | Focus fell to the page                                   | Held                                                                     |
| compact-mantine | No "Open list" arrow on a field with no choices                                                         | The Size field opened an empty list                      | Empty list gone; finding Size still named a difficulty 18 of 18          |
| compact-mantine | Default focus ring on controls the theme gave none                                                      | Invisible keyboard focus                                 | The keyboard-only persona saw rings                                      |
| graphty-element | Mouse-wheel zoom on the 3D orbit camera                                                                 | No wheel zoom                                            | No complaints                                                            |
| study tool      | Screen-reader mode; browsers freed when a session ends                                                  | Screen-reader sessions could not run; voided sessions    | Round 2 had 0 voids                                                      |

### Before round 3, on the round 3 build

| Package               | Change                                                                              | Problem it fixed                                    | Round 3                                                      |
| --------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| compact-mantine       | A dialog opened from a menu keeps focus                                             | Focus was left behind the export dialog             | Confirmed: export done by keyboard and screen reader         |
| app                   | "Show all labels" switch beside the hidden-name count                               | No way out of hidden names                          | Confirmed: 7 of 8 quick, 1.5x the path                       |
| app                   | Size "+" opens its from-data list                                                   | Users had to find a fixed "1" and a chain-link icon | Confirmed for that chain of steps; finding Size is unchanged |
| app                   | Runs named by their method everywhere                                               | Participants paused over the run name "Influence"   | 0 pauses (a weak measure)                                    |
| app                   | A finished load and a finished run are announced                                    | Screen-reader users heard nothing                   | Confirmed                                                    |
| graphty-element + app | Grouping layouts offer run results as groupings                                     | Group layouts stayed disabled after a community run | Works when found; 2 of 5 found it                            |
| graphty-element       | Canvas named from the host's `aria-label`, focus ring drawn inside it, no autofocus | Unnamed canvas, clipped focus ring                  | Confirmed; caused the focus-after-load regression            |
| graphty-element       | The legend leaves out a layer painted over on every node                            | Stale "Color: Connections" key                      | No task route exercised it                                   |
| graphty-element       | 2D Fit frames the whole graph (and the 2D zoom unit is documented)                  | Fit zoomed into one edge                            | No task route exercised it                                   |
| compact-mantine       | A clickable row's trailing glyph is part of the row                                 | Clicking the ">" did nothing                        | Not exercised                                                |
| study tool            | Hears the highlighted option; has a reading mode; measures bars 8 and 9             | Tool blind spots were scored as findings            | Used                                                         |

### Deferred, and why

- **Everything found in round 3** (focus after a sample opens, the gray-text contrast, export picture quality, the 3D size misreading, finding Size and labels, the remaining words): round 3 was the last round, so nothing after it was fixed. These are the first work in section 6.
- **The key box covering a node** needs key placement or fit insets in graphty-element, which is new public API. It is held for the owner.
- **Element English in layout refusals and export warnings** belongs in graphty-element as codes plus parameters, with the words in the app. It is not something to patch in the app.
- **The 3D size misreading, soft names in exports, the "Whole graph" export angle, the selection in the export, and Force freezing as a cloud when re-applied:** each needs a trace in graphty-element first.
- **Bigger redesigns** (Size on a line of its own, a signpost from the graph's Style tab, opening a run on its values) were deferred to keep one change per path per round. They need real users.

## 5. Decisions the owner must make

These come from `owner-decisions.md`. Each one changes what graphty-element promises third-party consumers, so each needs a yes before it reaches master.

1. **`captureScreenshot({ legend })` and the new exported type `ScreenshotLegendSection`.** The caller hands the element the key's words, and the element draws them into the picture. Open points: the names, and whether the card's position and look should be options.
2. **Undirected graphs draw no arrowheads by default, plus a new public read, `DataManager.directed`.** Open point: whether `explain()` should name the arrowhead a directed graph draws.
3. **Exported community groups are numbered by size rank, not by the algorithm's id.** Files exported before and after this change disagree on group numbers.
4. **`styles.legend()` leaves out a layer painted over on every element.** Since that entry was written, master gained neutral legend facts (#1364), including a `legend.painted-over` code. My recommendation is to withdraw the element change and have the app drop blocks that carry that fact. That needs no change to an existing method. Either way, it must be reconciled when the branch meets master.
5. **`catalog.optionsFor` fills `values` for a grouping option** with the columns that can group nodes, run results included.
6. **The element's `aria-label` names its canvas** (`observedAttributes` and the JSX props change), and the canvas no longer takes focus on mount.
7. **A 2D camera's `zoom` is documented** as relative to a half-width of 5 units, and the built-in fit now answers in that unit.
8. **No decision needed:** the force layout's seed default is back to master's `null`. Master agrees: #1271 landed tests and docs only.

Other open items for the owner:

- the usage-data card's wording
- tooltip delay (500 or 1000 ms)
- whether a run's suggested style should paint above a reader's own color-everything layer
- whether to start the real-user study below (it costs real people's time)
- approving the screenshots that these changes move in the visual review

## 6. Next steps, in priority order

1. **Bring the branch up to date with master and split it into pull requests.** The branch no longer merges cleanly. Master has moved under it, with conflicts in `Graph.ts`, `LayoutManager.ts`, `legend.ts`, the session API report, the layouts guide, the legend card and a color picker. Land the pull requests in this order:
    1. `elementAt` (#1267, already open) lands on its own.
    2. The 54 interface fixes (`fix/ipad-review-2026-10-06`, local only) go in as their own pull request, from whoever owns that work. The studio's app changes sit on top of them.
    3. graphty-element fixes with no public API change: camera keys, truncated GraphML and GEXF, nodes from edges, Spectral (with the layout package), wheel zoom, 2D Fit.
    4. graphty-element public API changes, one pull request per item in section 5, each after the owner's yes. Reconcile the legend change with master's neutral facts first.
    5. compact-mantine fixes: the empty-list arrow, the default focus ring, menu-to-dialog focus, the row's trailing glyph, the modal pieces.
    6. graphty app changes, grouped by path and landed after the element and compact-mantine pull requests they use: keyboard and focus; export dialog; neighbors and selection; labels switch and Size picker; run names and announcements; legend words.
    7. The studio's documents and study tool (`design/ui/studio/`) as a docs pull request.

    Every visual package needs owner-approved screenshots before merge.

2. **Fix what round 3 found, in the package that owns each problem.**
    - First, the focus regression (app): where focus goes after a sample opens, after the usage card closes, and after Escape from the shortcuts dialog.
    - Also first, the gray-text contrast (compact-mantine's dark color ramp). With these two fixed, bars 7 and 8 can pass.
    - Then file high-priority graphty-element issues for:
        - codes instead of English in refusals and export warnings
        - export quality: names rendered at the target size, a real 4x, the "Whole graph" camera, no selection ring
        - key placement, so the key never covers a node
    - Trace the 3D size misreading with one 2D export of the running club before choosing a fix.
3. **Run one keyboard-only whole first session** on the fixed build to close bar 7. It is the only measurement still missing.
4. **Study real people next, not more simulations.** The remaining questions are beyond what one model playing personas can show: whether Size and labels are found, whether 3D sizes mislead, what a real screen reader speaks, and whether the ease gains are real. The proposal: graphty.app with opt-in usage data, 5 to 8 real analysts on the core path, and at least one real screen-reader user.
5. **Tier 2 (common repeat work) needs these before its first round:**
    - tasks and an answer key for filtering, the shortest chain between two nodes, notes, joining more than one table (the deferred "two spreadsheets as one network" task), weight set at load and used by every run, and rerunning on new data
    - personas who return to the app, not first-timers
    - the same frozen bars, pilot on every new build, and skeptic check that the tier 1 rounds used
    - a runner check that keyboard-only personas never click

    Weight at load is the largest known gap: the owner decided every run uses it, and the build does not do that yet.
