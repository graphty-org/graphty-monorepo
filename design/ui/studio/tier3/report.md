# Tier 3 report: first use and styling

Written 2026-10-21 by the Design Director, for a reader who did not watch the study. Round 1 ran and was scored on 2026-10-21. The studio has stopped there, because the plan ran one round and any further round needs the owner's go.

## The short version

- **Round 1 ran on the frozen build 758b8e8081: 56 sessions on 12 tasks, and 55 of them succeeded.**
    - No session said "done" when it was not.
    - Wrong turns were 1 or fewer per task.
    - A newcomer reached a first styled graph in a median of 6 steps (the limit is 10).
    - The one keyboard-only persona finished all four of her tasks.
- **The round does not pass, and could not by plan.** Three tasks were not scheduled for round 1. Of the bars that were scored, four fail:
    - **Task success** fails on one session, and the grading rule caused it, not the reader. The drawing is plainly yellow (`#FFD700`). The app's color-naming table calls that color "gold", and the rule judges by that name.
    - **Severity 3 problems** fail only on two problems that were already known and rated 3 before the round. No new severity 3 or 4 survived the two skeptic checks.
    - **Accessibility** fails on small targets, two scroll regions, one low-contrast chip in the light theme, shared names on the start screen, and an F6 stop with no focus ring.
    - **Words at rest** fails: four screens are over their limits.
- **The round is at its ceiling.** Every participant is played by one model, so success tells us little. What the round did show is where newcomers pay:
    - they look for the nodes' color in the wrong panel first;
    - a new style line starts at the value everything already has, so it looks broken;
    - checking which nodes a layer paints is done by eye;
    - keyboard users lose focus twice on the way in.
- **Nothing in the product changed after round 1.** The next decision is the owner's: whether to fund round 2. Before it would come a fix pass led by the color-naming table, the accessibility items and the words.

## What was tested

**The question.** Can a person who has never used graphty open it, bring in data, and make the drawing say something? The tasks cover:

- one color for everything;
- a subset picked by its data;
- sizes that follow a number;
- names on the drawing;
- ties styled apart from people;
- clusters the program finds;
- many layers changed at once;
- a change taken back;
- reading what someone else's color picks out.

**What is studied.** The combined Style panel in the real graphty app:

- **A layer tree** of layers and folders, in paint order.
- **A selected layer's Node and Edge tabs.** Each opens with a "Which nodes" picker above the property lines. The picker is built from typed condition cards: number range, category values, text that contains or starts with, yes or no, and has or has no value.
- **Bulk editing.** A folder or several layers show the same fields. A field whose layers differ shows a purple "Layer" token.

**Tasks.** There are fifteen tasks, T37 to T51 in `tasks.md`. Each has two halves on different data: Les Miserables, College football, a volunteers file, a news-sources file, a yeast gene network, a neighbors CSV, and two saved projects made by a "colleague".

- Round 1 ran 12 of them. T37 (a first look), T42 (a number threshold) and T44 (names on the drawing) were left for a later round.
- The core tasks ran at 6 sessions each: T39 (one color), T40 (pick by letters in a name), T47 (every cluster as a cube, colors kept) and T48 (cluster colors on only some people).
- The other eight tasks ran at 4 sessions each.

**Participants.** Nine composite first-time personas:

- Dev (student)
- Grace (nonprofit data)
- Ruth (reporter)
- Elena (product manager)
- Tom (lab manager)
- Nadia (bank alert reviewer)
- Alex (knows Gephi)
- Maren (knows Cytoscape)
- Sam (keyboard only, with every pointer step refused)

**Sessions.** 56 were planned and 56 were graded, all on the frozen build and all from the empty start screen.

- **Void: 11.** These are runner failures, not findings. In each one:
    1. the participant started its own browser inside its turn;
    2. the start waited past the shell's 120-second limit for one of four shared browser slots;
    3. the participant ended its turn to wait;
    4. ending the turn killed the waiting start.

    One more session never started. All 12 were re-run from clean folders, and the re-runs are the ones counted.

- **Sonnet: 0.** Every graded session ran on Opus. No session hit a model error, so the fallback model was never used.
- **Leaks: 0.** No participant opened a file outside its own session folder.

**Builds.** All tier 3 work is on the branch `design/studio-tier3`.

- Design iterations were frozen as `tier3-i1-68a2140049`, `tier3-i2-2faecd941b` and `tier3-i3-617b43b270`.
- The owner-reviewed fifth build is `tier3-i5-71743cf67b`, and the bulk-editing build is `tier3-bulk7-457aa9f0f2`.
- Readiness passes ran on 58556989e8, ed4351b258, 5bd16cda6e, 6dd0b00bd7 and e3c5bca8e6. After a merge from the golden integration branch, they ran on 7d87760756, 6de5f95d12 and 758b8e8081.
- **Round 1 ran on 758b8e8081** (graphty 0.8.91), served from `.study-builds/tier3-r1d2-758b8e8081`.

**The study tool** passed its readiness check before the round on its second run (`rounds/round-1/tool-dry-run-2.md`). It needed five fixes first:

- accessibility measured at 900 x 700 as well as 1440 x 900;
- browser slots served first come, first served;
- a disk profile for each session;
- Escape closing a file chooser;
- briefings cleaned of notes meant for the study team.

Prompts that echoed on-screen words were also reworded.

**Expert walkthroughs and audits.** These ran on the frozen build before the experts saw the sessions (`rounds/round-1/expert/`):

- an accessibility specialist: every walk screen at both sizes and in both themes, plus three keyboard and screen-reader sessions;
- a design engineer's screenshot audit: 117 screenshots at 1200 x 900 and 900 x 700;
- a Figma product designer, on controls and gestures;
- a visual designer.

Before the round, five experts walked each of three design iterations. A researcher, a user advocate and a red team reviewed the success criteria five times.

**What a simulated participant can and cannot tell us.** Every participant is one model playing a persona.

- **A failure is strong evidence.** The model reads every word on screen and never tires, so if it cannot finish, a person likely will not either.
- **A pass is weak evidence.** The model:
    - has the same blind spots in all nine personas;
    - reads labels a person would skim;
    - types hex codes from memory;
    - produces sessions that are not independent when two run on the same prompt.
- **What follows from that:**
    - a problem counts as confirmed only on two different task halves, or in one session plus a scripted repro;
    - rounds are compared with each other, never with published norms;
    - anything that passes still needs real people to confirm it.

## Results against the frozen bars

### Round 1 (build 758b8e8081)

Verdict, by the criteria's rule: **not passable in round 1, because three tasks were not run by plan.**

| #   | Bar                      | Target                                                                                     | Result                                                                                                                                                                 |
| --- | ------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success             | At least 80% S or SD per task, each half 2 of 3                                            | **Fails.** 55 of 56; 11 of 12 tasks hold. T49 B is 1 of 2: the drawing is yellow, but the color table names `#FFD700` "gold"                                           |
| 2   | False "done"             | 0                                                                                          | Holds: 0 of 56                                                                                                                                                         |
| 3   | Wrong turns              | Median at most 2 per task                                                                  | Holds: every median is 1 or less                                                                                                                                       |
| 4   | First styled graph (T39) | Median at most 10 steps                                                                    | Holds: median 6, counted by hand (the scoring script started at the start page's demo and printed 3)                                                                   |
| 5   | Severity 3 and 4 open    | 0 confirmed                                                                                | **Fails** on two problems rated 3 before the round: a node's own Fill "+" makes a one-node layer, and the folder's chain icon paints every cluster one color           |
| 6   | Accessibility            | axe 0 serious or critical, unique names, focus kept, typing lands; both sizes, both themes | **Fails.** Target size and scroll regions (both themes); the "Autosave: saved" chip at 2.17:1 (light); shared names on the start screen; an F6 stop with no focus ring |
| 7   | Keyboard (Sam)           | 3 of 4 S or SD, 0 confirmed blocks                                                         | Holds: 4 of 4, no block, at 37 to 105 key presses                                                                                                                      |
| 8   | Words at rest            | No screen above its recorded limit                                                         | **Fails:** 4 of 7 screens over                                                                                                                                         |

Per task, successes and median steps against the answer key's path:

| Task                         | Success | Median wrong turns | Median steps (key) |
| ---------------------------- | ------- | ------------------ | ------------------ |
| T38 color a kind             | 4/4     | 0                  | 12.5 (12)          |
| T39 one color, first graph   | 6/6     | 0.5                | 5 (5)              |
| T40 pick by name             | 6/6     | 1                  | 20 (13 to 16)      |
| T41 yes/no and no value      | 4/4     | 0                  | 17.5 (18)          |
| T43 size by a number         | 4/4     | 1                  | 8.5 (6)            |
| T45 style some ties          | 4/4     | 0                  | 17.5 (16)          |
| T46 recolor one group        | 4/4     | 1                  | 15.5 (12)          |
| T47 all groups as cubes      | 6/6     | 0                  | 11 (11)            |
| T48 narrow every group       | 6/6     | 0                  | 11 (11)            |
| T49 change and put back      | **3/4** | 0                  | 6.5 (5 + 1)        |
| T50 read a colleague's layer | 4/4     | 0                  | 5 (2 to 3)         |
| T51 a color per kind         | 4/4     | 1                  | 7 (5)              |

Words at rest, the four screens over their limits:

| Screen                       | Words | Limit |
| ---------------------------- | ----- | ----- |
| A sample just opened         | 72    | 50    |
| Everything's Node tab        | 53    | 47    |
| A layer with a condition     | 45    | 39    |
| A layer with four conditions | 51    | 42    |

On the first screen, 19 of the 72 words are a storage notice that the automation causes. Without it the screen has 53 words and is still over.

The key-and-drawing check, run by script over all 56 final states, found 0 disagreements.

### Readiness passes before round 1

Pilots walked every task's success path and its common detours. The bar was narrow: no crash, no blocked task, and no result a grader would misread.

| Build                               | Date           | Lines         | Fix now                        | Regressions from the last fixes |
| ----------------------------------- | -------------- | ------------- | ------------------------------ | ------------------------------- |
| 58556989e8, ed4351b258, 5bd16cda6e  | 2026-10-17..18 | 490, 366, 324 | not recorded per pass          | --                              |
| 6dd0b00bd7                          | 2026-10-18     | 283           | broad bar (polish included)    | --                              |
| e3c5bca8e6                          | 2026-10-19     | 369           | 124, 2 blocking                | 37                              |
| 7d87760756 (after the golden merge) | 2026-10-20     | 495           | 10 (4 crash, 4 block, 2 spoil) | 8, all from the merge           |
| 6de5f95d12                          | 2026-10-20     | 228           | 2 (spoil)                      | 0                               |
| 758b8e8081                          | 2026-10-21     | 141           | 0                              | 0                               |

Round 1 confirmed the last pass: no session was decided by a build defect.

## What was learned, most important first

1. **Newcomers look for the nodes' color in the wrong panel first.**
    - With nothing picked, the Graph inspector's Style tab holds only canvas settings. It points nowhere for node color or size.
    - 9 sessions on 5 task halves went there first.
    - Each recovered only by matching the count beside "Everything" in the layer list to the node count (`rounds/round-1/sessions/r1-s33/04.png`).
2. **A new style line starts at the value everything already has, so adding it looks broken.**
    - A new Fill Color line holds `6366F1`, the color every node already is.
    - A new edge Width line starts at 8, with no unit.
    - Accepting either changes nothing on screen. Seen in 9 sessions on 5 halves.
3. **One color table decides both a grade and what the app says aloud.**
    - compact-mantine's `colorWord` returns a CSS keyword before it looks at hue. So `#FFD700` is "gold", while a salmon, `#F16363`, is "red".
    - In T46, two different group colors share one spoken name.
    - It produced the round's only F, and screen-reader users hear the same names. One shared fix serves both.
4. **Checking which nodes a layer paints is done by eye.**
    - Nothing on the drawing names a node, and pointing at one shows nothing.
    - A layer's Values tab lists ids rather than names.
    - The table neither marks nor filters the rows a layer paints, so readers cross-checked 24 rows by hand.
    - No reader misread a result. The cost is steps and doubt.
5. **Keyboard users lose focus twice on the way in.**
    - The inspector's F6 stop draws no focus ring (WCAG 2.4.7).
    - Both "Samples" controls scroll to the library and leave focus behind.
    - A sample card is 30 or more Tabs away: the nine category chips are nine stops, and Enter in the search does nothing.
    - Sam still finished all four tasks. All of this comes from one persona.
6. **The color box is hex first and never says that a color word works.**
    - Typing a color word worked every time it was tried, but nothing on screen says it will.
    - The swatches hold no common hues.
    - Readers who knew no hex code spent extra steps on the hue bar. Real newcomers would likely be slower than the model, which typed hex codes from memory.
7. **Avoiding the purple "Layer" token is not the same as reading it.**
    - The mistake the token guards against never happened: 0 of 10 sessions painted every cluster one color.
    - Yet 6 sessions on 5 halves called the token unreadable and went around it.
    - The bars count avoiding it as understanding it.
8. **The round is at its ceiling, and the measuring tool limits it.**
    - 55 of 56 sessions succeeded.
    - The answer key describes most of the problems the graders cite, so the grading may also lead them.
    - The signal is in cost (steps over the key on T40, T43, T46, T50 and T51), in the routes taken, and in named problems.
9. **The light-theme contrast failure is one chip, not every screen.**
    - Measured before the round, contrast seemed to fail on every screen.
    - Round 1 traced all of it to the "Autosave: saved" chip: `#40c057` on `#ecf9ee`, 2.17:1 at 11 px.
    - The purple token measures 7.15:1 in the dark theme and 5.66:1 in the light theme.
10. **Before the round, the fix loop created more defects than it removed until the bar was narrowed.**
    - On e3c5bca8e6, 37 of 124 must-fix lines came from the previous pass's fixes. 26 of them came from two commits, each of which flipped a switch that neighboring routes relied on.
    - The bar was then narrowed to crash, block and spoiled grading, and every route a fix crosses was walked again. The next passes found 10, 2 and 0 must-fix lines, with no regressions from the studio's own fixes.
    - A merge from upstream is a fix pass nobody triaged: all 10 must-fix lines on 7d87760756 came from the golden merge.

**Six build defects have repros** (`rounds/round-1/repro/`), each severity 2 or less:

- a click on the "+" in Style layers is lost while the find list is open;
- one click on the color picker's hue bar sets the color and closes the picker;
- the first color applied with a find-box selection held moves the drawing about 130 px;
- the analysis filter finds community methods for "communit" but none for "community";
- the color swatch's focus is drawn around the whole color box;
- Escape from a selection returns to the Graph inspector instead of the open layer.

A claim that the mouse wheel barely zooms came from one synthetic event. It stands only after a repro with 30 notches.

## What was changed, by package

Counts are commits on the studio branch since tier 3 began (2026-10-11). Nothing in the product changed after round 1.

**graphty-element (104 commits), all additive** (`../owner-decisions.md`, "decided by the team"):

- Built:
    - the style tree (layers, folders, pins, locks);
    - one row that paints both nodes and edges;
    - starting rows and run placement, as consumer options with neutral defaults;
    - every readable value, with value counts;
    - a has-value rule;
    - several layers as the groups of one binding;
    - labels sized in screen pixels;
    - published hover and click events.
- Readiness fixes:
    - a saved project reads a renamed channel;
    - a reload keeps hand-picked edge layers;
    - an empty layer takes its first rule;
    - Undo across a reopened file redraws the graph.
- **Confirmed** by the next readiness pass and by round 1.

**graphty app (230 commits):**

- The combined Style panel: the layer tree, the Node and Edge tabs, and the condition-card picker.
- Bulk editing, with the "Layer" token and the "Color from each layer" dialog.
- The key, and the words throughout.
- **Confirmed by round 1** for success (55 of 56). The costs above are its open problems.

**compact-mantine (85 commits):**

- one look for every style field;
- the bound value and the token pill;
- a color picker that holds the prior color, says why it refuses text, and closes on Enter;
- lists that open on the value in force and say when typing matches nothing;
- a tree with one Tab stop;
- focus rings when focus is set by the program;
- color names.

**Partly confirmed.** Round 1 found three problems here:

- the color names disagree with the drawing (learning 3);
- the toast does not wrap at 900 x 700;
- one F6 stop has no focus ring.

**The study tool (`../tool/`):**

- Built:
    - a scripted walk that gets past the start page;
    - the wording check;
    - bar 4's limit;
    - the key-and-drawing script;
    - an entry check that refuses planted bad rounds;
    - the five pre-round fixes listed under "What was tested".
- **Confirmed:** round 1 had no tool-caused void sessions. The 11 voids came from the first wave starting browsers inside the participants' turns.
- **Still wrong:** bar 4 starts counting at the start page's demo, and the tool dropped one grade file that lacked its grade lines. Both were corrected by hand.

**Rejected after a re-walk and reverted** (`rejected-fixes.md`). Each is to be made again in the shared part, not per control:

- calling a crimson red;
- a node called by its label everywhere;
- table sort hints;
- a focused heading's ring;
- showing the layer list on select;
- one click opening the Which line's list;
- one name per control;
- F6 moving round five regions;
- the find box's letter case;
- Escape in the inspector.

## What was deferred, and why

- **T37, T42 and T44**, because the owner allowed one round for now. A find-box rule using `>` makes a raw threshold card that cannot be edited. It must be fixed before T42 runs (`>=` works).
- **The backlog** (`backlog.md`, 41 entries from the last readiness pass). These are friction, wording and keyboard problems a participant gets past, including the drawing moving while a selection is held. Fixing them inside the readiness loop produced the regressions in learning 10, so they are fixed in batches between rounds.
- **The bar 6 and bar 8 failures** were not fixed before round 1. The round could not pass anyway, and a fix would have changed the build and restarted the readiness walks.
- **Two severity 3 claims seen only by experts** are dropped from bar 5 until someone writes a repro:
    - Shift-click in the layer tree anchors on the last clicked layer and can pull the base layer into a bulk edit;
    - a picker whose conditions together pick nothing looks healthy once it is closed.
- **A "Cube" synonym for the Box shape** was rejected. "Cube" is one task's word, and all six sessions found Box.

## Decisions waiting on the owner

Listed here are only changes that would break graphty-element's published behavior or change a default, plus one saved-file format. The details, and the additive alternative each one already has, are in `../owner-decisions.md`. None of them blocks the study.

1. **The breaking pieces of unified styles** (2026-10-12):
    - a layer painting both kinds widens the `target` a consumer reads back;
    - starting rows and runs-on-top as defaults, and deprecating `selectionStyle`;
    - the default selection halo (1.13:1 where 3:1 is needed) and the label badge contrast;
    - label and edge motion following the reduced-motion setting by default;
    - collapsible Nodes and Edges groups.
2. **Default label size** (2026-10-12). A new label is about 8 px tall at the default framing. `sizeUnit: "screen"` exists as an option. Making it, or a larger number, the default changes every label.
3. **Default label font fallback** (2026-10-13). The default is a bare "Verdana", so machines without it draw a serif.
4. **A bare name in a rule reading a run's result when no column has it** (2026-10-17), and whether `selectorRule` reads comparisons by default.
5. **Kelly's palette for 10 to 19 groups** when a binding names no palette (2026-10-17).
6. **Labels drawn over the edges in front of them by default** (2026-10-17).
7. **Turning "Hide overlapping labels" on or off as an undo step** (2026-10-18).
8. **A value beyond a written domain drawn past the range's end** (2026-10-19).
9. **What an edge's line width measures** (2026-10-09). A width of W draws 10 x W / d pixels at distance d, so the default of 8 is under 2 pixels on a graph framed from 50 units away. Round 1 met it again: a new Width line at 8 with no unit looked broken (learning 2).
10. **The camera saved in a project file** (2026-10-08). This is a saved-file format. Round 1's audit found that a saved project reopened in a smaller window is drawn off center; why is not traced yet.
11. **A bare number in a rule** (2026-10-07): `weight > 3` instead of `` weight > `3` ``. This changes what an existing call accepts. The find box already offers a working rewrite.

## Next steps

1. **The owner decides whether to run round 2.** Everything below waits on that go, except the tool and criteria work in step 2, which costs no sessions.
2. **Fix the measuring tool and the criteria first** (no new build):
    - bar 4 counts from the first step after the graph opens;
    - decide, before seeing round 2, whether a CSS keyword inside the asked hue's band (gold inside yellow) meets the asked-color rule;
    - add a measure that separates avoiding the "Layer" token from understanding it;
    - read every prompt and the answer key for leading, and move the bars toward cost (steps over the key, wrong turns, routes) now that success is at its ceiling;
    - start each session's browser as its own step before the participant's turn, so no start dies waiting for a slot.
3. **Fix the product in this order.** After each fix, walk again every route the change crosses.
    1. `colorWord` in compact-mantine: hue before keyword, so the spoken name and the grade match the drawing.
    2. Bar 6:
        - the chip's contrast;
        - the target sizes;
        - the F6 focus ring;
        - the shared start-screen names;
        - focus after "Samples";
        - the toast wrapping at 900 x 700.
    3. Bar 8: the four screens over their word limits.
    4. The two severity 3 backlog items: the node's own Fill "+", and the folder's chain icon.
    5. The severity 2 design problems:
        - a route to node color from the empty Graph inspector;
        - a new line that starts at a value that shows on screen;
        - a way to see which rows and nodes a layer paints;
        - a color box that says it takes color words.
    6. The six build defects with repros, and the raw `>` threshold card before T42 runs.
4. **Freeze a build, run the readiness pass and the tool check, then run round 2** with T37, T42 and T44 added, so the study can pass in one round.
5. **Confirm with real people** whatever passes, because a pass by the same model is weak evidence.

ACTION NEEDED: decide whether to fund tier 3 round 2 (round 1: 55 of 56 sessions passed; fails accessibility, word limits, one grading rule)
