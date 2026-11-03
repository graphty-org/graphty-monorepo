# Tier 5 report: choosing which nodes

Date: 2026-11-03. Study build: 1e123d7d33 (`criteria.md` line 1), served from the main checkout's `.study-builds/tier5-r1d1-1e123d7d33`.

## Summary

Tier 5 tests how a person who already knows graphty says which nodes a result applies to: which nodes a style layer paints ("Which nodes") and which nodes a Data filter card keeps. Both use one editor: a read-only outline in the sidebar at rest, and one non-modal workspace over the canvas for every edit.

- **Round 1 ran and no participant saw the app.** All 60 sessions (30 planned, 30 re-runs) are void for one cause in the study tool: a round may not start until its gate check has run and written its evidence into the round plan, and nobody ran that check. Every start was refused with the same line, and the re-run rule re-launched each session into the same refusal. Nothing about the build caused it.
- **So the bars that read sessions are not measured**: task success, false "done", wrong turns, cost, the keyboard participant, and the follow-up questions.
- **What was measured comes from four expert walks and the scripted walk.** Two independent reviewers then checked each finding, each trying to argue it down.
    - Bar 4 (no open severity 3) fails on one finding: a screen reader hears counts from a panel the workspace covers.
    - Bar 5's expert parts hold: 0 serious accessibility findings (axe) on 36 screens and no keyboard block.
    - The calm-first and Figma bars are not measured, because two of their inputs did not run.
- **The three problems that blocked the round before were closed on this build.** The node table at 50,000 nodes now searches first, the 14 serious axe findings are gone, and no task prompt shares a word with the screens.
- **The studio stops here, at this run's one-round budget.** Eight dry-run passes and one round produced zero valid sessions. The bottleneck was the launch path, not the build.

## What was tested

### Builds

| Build                                                                  | What it was                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 7225138fd3, d231869fd5, 7ca4cae647                                     | Selection cards, after polish rounds 1 to 3                                                            |
| 7dfd51c277                                                             | The cards the owner rejected on 2026-11-01 as overwhelming (7ca4cae647's copy is kept as its stand-in) |
| 7acb6c4c07, 1b8c1045bc                                                 | Outline and one property pane, after repolish rounds 1 and 2                                           |
| 6a37a22344, 64cb33f3a6, 18e34e7295                                     | The workspace, after workspace polish rounds 1 to 3                                                    |
| d13c2ff3da                                                             | First criteria freeze                                                                                  |
| baac78342b, 797a4f6b47, 47c95a09fc, c3100058ab, f0a9a014cb, d3fda9f2b6 | Dry run passes 1 to 6                                                                                  |
| 0c163f54bf                                                             | Second criteria freeze; dry run pass 7                                                                 |
| 1e123d7d33                                                             | Dry run pass 8; frozen; round 1                                                                        |

### Tasks

Each task has two halves on different data, A and B.

| Task | What the person does                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| T70  | A simple choice, made twice                                                                |
| T71  | Either of two things ("Or")                                                                |
| T72  | All of one kind, except some                                                               |
| T73  | Everything within k hops of a named node                                                   |
| T74  | The few nodes a measure ranks first                                                        |
| T75  | Making a big network readable, as a chain of steps                                         |
| T76  | The landing page's pointing effect (dry run only: its success path never opens the editor) |
| T77  | Changing a rule a colleague set up                                                         |
| T78  | A count over just the strong ties                                                          |
| T79  | One choice in a network of 50,000 nodes                                                    |

### Participants

There are seven simulated returning users, each with a written history of earlier work in graphty:

- Grace, a nonprofit data person
- Ruth, a reporter
- Dana, a supply-chain risk analyst
- Tom, a lab manager
- Maren, a genomics researcher
- Alex, an operations analyst
- Sam, a keyboard-only analyst

Every session starts from the person's own saved project, or one a colleague shared.

### Rounds and sessions

|                          | Count                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Rounds run               | 1 (the criteria allow 3)                                                                   |
| Sessions planned         | 30: 4 each on T70, T71, T73, T74, T78; 2 each on T72, T75, T77, T79; Sam's 2 keyboard-only |
| Re-runs                  | 30 (one per session, as the plan allows)                                                   |
| Void                     | 60 of 60                                                                                   |
| Valid pointer sessions   | 0                                                                                          |
| Valid keyboard sessions  | 0                                                                                          |
| Run on Sonnet            | 0 (every session ran on Opus)                                                              |
| Usable follow-up answers | 0                                                                                          |

Before the round, pilots walked every task in eight dry-run passes. The study tool's two check runs on 1e123d7d33 also started throwaway sessions, which grade nothing.

### Expert walkthroughs and audits

- **Before the round** (each is a file in this folder):
    - 3 spec reviews
    - card polish rounds 1 to 3: ease, Figma, accessibility, correctness and architecture
    - repolish rounds 1 and 2: the owner's lens, Figma, correctness and scale
    - three concepts judged from first principles
    - a placement study of the sidebar, a bottom drawer and a workspace
    - workspace polish rounds 1 to 3
    - two rounds of criteria reviews
    - a rating check and a calm-first check on the rejected and frozen builds
- **Round 1 on 1e123d7d33** (`rounds/round-1/expert/`):
    - an accessibility walk by keyboard and screen reader
    - a Figma product designer's walk
    - a visual designer's walk
    - a screenshot audit at 1200 x 900 and 900 x 700, over the style host, the filter host, a colleague's project and 50,000 nodes

    Every finding then went through two independent checks: a finding both checks drop is dropped, and a finding one check weakens is weakened.

- **Not run this round**: the interaction designer's walk, the content designer's hand count of words at rest, and the calm-first check on the frozen build. Bars 6, 7 and 9 need them.

### What a simulated participant can and cannot tell us

- **Every participant runs on the same model, so its blind spots are shared.** A failure is strong evidence. A pass is weak, because the model succeeds wherever a task sends it.
- **The overwhelm rating cannot see the owner's complaint.** The same two people rated the rejected cards 3 and 5, and the build under test 2 and 3. That is a gap of 1.5 where the criteria need 2, and every reason they gave named a bug, never crowding. So bar 9 rests on counted calm-first findings, not on the rating.
- **No session uses a screen reader.** Screen-reader problems come only from the accessibility walk.
- **The round measures first use only.** It does not measure a second use, saved selections or hierarchy cuts.

## Results per round, against the frozen bars

### Round 1 (1e123d7d33)

The "Predicted before the round" column is the dry run's prediction on d3fda9f2b6. The "Round 1" column is the round's result after the two checks (`rounds/round-1/insights.md`).

| #   | Bar                           | Target                                  | Predicted before the round                      | Round 1                                                                                                   |
| --- | ----------------------------- | --------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Task success                  | 3 of 4 or 2 of 2 per task, no half at 0 | Weak pass (pilots reached 19 of 20 halves)      | Not measured: 0 valid sessions                                                                            |
| 2   | False "done"                  | 0                                       | Not predicted                                   | Not measured                                                                                              |
| 3   | Wrong turns                   | Median at most 2                        | Not predicted                                   | Not measured                                                                                              |
| 4   | Severity 3 and 4 open         | 0 confirmed                             | Fail: the 50,000-node table had no search       | **Fail, on one finding**: counts spoken from a covered panel                                              |
| 5   | Keyboard                      | Sam succeeds, 0 blocks, 0 serious axe   | Fail: 14 serious axe findings                   | Not measured (Sam's sessions void); the expert parts hold: 0 serious axe on 36 screens, no keyboard block |
| 6   | The owner's data rules        | 0 confirmed violations                  | Not predicted                                   | Not measured: the word count and interaction walk did not run; no violation found                         |
| 7   | Figma and graphty consistency | 0 severity 3-4, at most 5 severity 2    | Not predicted                                   | Not measured: 1 confirmed severity 2; 7 Figma candidates unconfirmed                                      |
| 8   | Cost on core tasks            | Median steps at most the path plus 3    | Not predicted                                   | Not measured                                                                                              |
| 9   | Calm-first                    | At most 3 severity 2, none of 3-4       | Fail, if confirmed (2 double counts, 5 spacing) | Not measured: 1 confirmed severity 2; the calm-first check did not run on this build                      |

The pre-round "double counts" were later ruled to be two different facts by the criteria's own test: each has a reachable state where its two numbers differ. So they are not findings.

## What was learned, most important first

1. **The round failed in the launch path, and the warning was already written.** The tool's second check run on this build said `--start` would refuse every session until the gate ran. The round launched anyway. The re-run rule ("no first screenshot: run it again") then re-ran all 30 sessions into the same refusal. A cause every session shares should stop a round at its first refusal, and the cheapest guard is one smoke session started before the roster.

2. **A screen reader hears a panel the reader cannot see** (severity 3, the one bar 4 failure).
    - While the workspace is open over a selected layer, each count change is announced twice into one status region: first the workspace's count, then the covered inspector row's count.
    - The second announcement replaces the first. So the header reads "15 of 24" while the listener may hear "4 of 24 nodes", the count of an unrelated layer (`expert/a11y/k1/43.png`).
    - The cause is one call in the graphty app (`WhichPicker.tsx` line 435). The outline beside it already goes quiet while the workspace is open.

3. **The editor still draws one result as several counts.** It is spoken twice (above), and printed in two number formats on one 50,000-node screen ("37.5k of 50k" beside "35,960").
    - Earlier passes fixed the worse cases in graphty-element with additive counts: a layer counted over two bases, and a key that said a covered layer drew nothing. Neither has come back.
    - What is left needs one rule for where a count is shown and spoken, and in what format, not per-screen fixes.

4. **The reference picker is a second build of the picker.** It differs from the value picker in three ways:
    - Tab in its search jumps to the main menu and leaves its list open.
    - Its search says nothing about how many items matched.
    - It groups its list differently.

    One shared searchable combobox closes all of these. T73 (a named node's neighbors) depends on it, so it matters as soon as sessions run.

5. **Names stop describing what they name.** Both cases break rules the studio had already decided (`decided.md` lines 631-632 and 694):
    - Clear renames a filter card "a selection" in the header, the outline and the sidebar.
    - A chosen reference shows only its id ("v02", not "James Carter").

6. **Two decided rules collide, and the build follows both.**
    - On a new filter card, Clear then Escape removes the card with its steps, and Undo does not bring it back. One rule says Escape on a new card's picker takes the card back; another says Escape never discards work. The reader is told ("Filter not added"). A written rule must say which wins.
    - The workspace also has no layout below 1280 px wide: at 900 x 700 the preview is a 44 px sliver. Nothing decides widths below 1280 x 800.

7. **Each fix leaves open the step just after it.** The pattern held in every one of the eight passes:
    - The busy sign covered edits but not opening the workspace, then not Done.
    - Cancel removed a new card, but Undo brought it back.
    - A color typed during a busy close went to page shortcuts. After that fix, the focus after Enter still drifts.

    The dry run converged only once every fix's check walked one step past its own action. Pass 8 found nothing that crashes, blocks a task or spoils a grade.

8. **The owner's complaint was about structure, not polish.** Three polish rounds left the cards cramped. Replacing them with an outline and one workspace is what moved the owner's-lens judgment to "would not walk away on a small graph". The rating check confirms the model cannot feel crowding, so the calm-first counts are the only instrument for it.

9. **On large graphs the lists are fixed, but the waits are not.** Every list at 50,000 nodes is now bounded, counted and searchable. But 6 of 74 scripted steps on the 50,000-node path wait more than 10 seconds, with a busy sign and no progress. The longest, 16.1 s, opens a department checklist.

10. **What remains is mostly work already decided but not built, and keyboard and screen-reader work.** Of 722 backlog rows (with repeats), 136 are behavior `decided.md` settles but the build does not do, and 235 are accessibility. The dry run fixes only what crashes, blocks or spoils a grade, so these wait for the fix loop between rounds.

11. **Where the editor sits made no measurable difference.** In the placement study the sidebar, a bottom drawer and a workspace each scored 9 of 9 on four tasks, and each was rated 2 to 3 for overwhelm.

## What was changed, by package

No round session has confirmed any change yet. Every check below is a pilot re-walk or the scripted walk.

### graphty-element

All of these changes are additive and `@beta`, recorded under "decided by the team" in `../owner-decisions.md`.

- **The selection model:**
    - a `union` rule of ordered Add, Keep and Except steps, with the leaves `measure`, `hops`, `touching`, `nonempty`, `same-value` and `by-size`
    - `scope.watchSteps` for live counts and reasons
    - `styles.showBranches`, the picking view
    - `scope.histogram`
    - value kinds and field facts for pickers
    - Edges where inside a step
    - `scope.asUnion`
    - `waitForPainted`
    - `camera.refitOnResize`
- **From the dry run:**
    - `StyleCounts.visible` and a key block's `scope.visible`, which count a layer over the graph the filter leaves
    - `UnionStep.mode`
    - `history.restoreTo(step, { redo: "drop" })`
    - no "covered" reading while the picking view repaints
    - name search that works with no label column
    - the node table's pages follow Undo and Redo
    - one node batch per frame on large repaints (d801a0fddd)

### graphty app

- **One selection editor for both places.** It went through three designs: cards, then an outline with one pane, then the sidebar outline plus one workspace.
    - A filter card has no effect word.
    - "+" appears only in section headers.
    - An Except switch replaces the verb menu.
    - Advanced is closed at rest.
    - Every list is bounded.
- **From the dry run:**
    - "Drawing" shows from the click to the painted result on large graphs.
    - The data table never takes the editor's selection.
    - Cancel on a new filter card leaves no undo step.
    - The preview key and the canvas toolbar are hidden while the workspace is open.
    - The matches strip searches first, and the value picker's list scrolls by itself.
    - A just-added color line shows no color until one is picked.
    - A control the reader moves to while the workspace closes keeps focus.

### compact-mantine

- `InputBase` used as a button is now drawn as the Select. No token, spec or Figma test changed, but it needs the owner's Figma approval before it lands (below).

### Study tool

- A setup start ends with an empty undo history (c8581ff123).
- The tool scores tier 5's bars and walks tier 5's screens: axe, wording and the 50,000-node lists (fb61362abf).
- The self-test stays inside the machine's browser limit and passes under tier 5's settings. Words at rest, the rejected build's large list and long waits each have a script (2aa3ff3fad).

### Fixes and whether the next check confirmed them

| Fix                                            | Built in                           | Confirmed by                                                |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| The false "covered" claim                      | 557f065428                         | Pass 2 re-walk                                              |
| The data table drawn under the workspace       | 1c02b8a883                         | Pass 2                                                      |
| A test's mode lost                             | a6257fe0c7                         | Pass 2                                                      |
| No reference found by its name column          | 92a64cffe5                         | Pass 2                                                      |
| One layer counted over two bases               | 50d50e28ae                         | Pass 2                                                      |
| No sign during a 50,000-node edit              | f6ab091f47, e13e34f007, c3100058ab | Pass 4                                                      |
| Cancel on a new filter card                    | 47c95a09fc, 9610767e29             | Pass 4                                                      |
| The node table after Undo                      | a93110cfb5                         | Pass 6                                                      |
| Undo history left by the setup                 | c8581ff123                         | Pass 6                                                      |
| 50,000-node table search; serious axe findings | 4fb3f45d59                         | Scripted walk on 1e123d7d33: 0 serious axe, no failing list |
| A color box showing a color nothing paints     | e85f37f53a                         | Pass 8                                                      |
| Keys typed during a busy close lost            | 1e123d7d33                         | Pass 8 (the focus after Enter still drifts; backlog)        |
| Faster large repaints                          | d801a0fddd                         | Not measured on its own; waits over 10 s remain             |

## What was deferred, and why

- **The backlog** (`backlog.md`, 722 rows over eight passes, with repeats):

    | Kind               | Rows |
    | ------------------ | ---- |
    | Decided, not built | 136  |
    | Friction           | 158  |
    | Wording            | 115  |
    | Cosmetic           | 78   |
    | Accessibility      | 235  |

    The dry run fixes only what crashes, blocks a task or spoils a grade on a walked route. The "decided, not built" rows go first in the next fix loop: pickers that flip up over the header, a canvas click that moves the camera, and Escape in a color box.

- **Round 1's severity 2 findings**: the reference picker, Clear's rename, the reference's id, the colliding Escape rules and the narrow layout. They gate no bar, and no fix pass was open after the round.
- **Not built**:
    - Pick on canvas: graphty-element has no armed one-click pick that leaves the selection alone.
    - The group pane's Color, and Settings in Advanced.
    - Saved selections and hierarchy cuts.
- **T76 has no sessions**, so nothing on its route is graded.
- **Waits over 10 s at 50,000 nodes.** The busy sign is built; making the edits faster is engine work, not a dry-run fix.

## Decisions waiting on the owner

Only breaking changes to a published API and departures from compact-mantine's Figma lock are listed. Each one is in `../owner-decisions.md`, and the build keeps today's behavior until he decides. Round 1 added none.

### Breaking changes to graphty-element

1. **A filter condition that reads the selection goes stale** (2026-10-31). It keeps the selection it first read.
    - (a) Refuse it, in the next grouped major.
    - (b) Freeze it to node ids when it is written.
    - (c) Make the filter follow the selection.
    - (d) Leave it. This is what is built; the app never writes such a condition.
2. **Algorithm levels read as ordered values** (2026-10-31). This covers bfs `level`, and the `value` of k-core and dfs.
    - (a) Declare them ordinal in the next major.
    - (b) Leave them. This is what is built.
    - (c) Add an optional override.
3. **A graph file's node names** (2026-11-01). A GraphML file whose names are in a `name` column has its nodes named by id ("n17").
    - (a) The GraphML and CSV importers pick the name or label column, as GML does.
    - (b) The app sets it from the Data place's Name role.
    - (c) Leave it.
4. **A text column whose values repeat** (2026-11-01) offers only Contains.
    - (a) List it as a category when it has at most half as many distinct values as records.
    - (b) Keep it as it is.
5. **A saved Select card** (2026-11-01).
    - (a) graphty-element rewrites it as Keep, turned off, when it loads the project.
    - (b) Keep it as it is. This is what is built: the card shows read-only until its first edit.

### compact-mantine's Figma lock

6. **Two hit targets below 24 px**: the split button's chevron (16 x 24) and the slider and histogram thumbs (10 to 12 px).
7. **The checked Chip's contrast** is 1.98:1 in light and 1.3:1 in dark. Also: should the split button carry a word ("+ Keep")?
8. **List fields ignore a caller's height cap, and arrow keys skip disabled menu items**, so a keyboard reader never hears why an item is off.
9. **A histogram of whole numbers draws hairlines** in a step's pane.
    - (a) compact-mantine gives each bar at least one step of width.
    - (b) graphty-element adds an upper edge to each bin.
    - (c) Keep the hairlines.
10. **`InputBase` themed as the Select.** This is already built on the study branch and needs his Figma approval before it lands.

## Next steps

1. **Fix the launch path.**
    - The leak check in `tool/real.mjs` tests only the paths a call opens, never written content. As it stands it flagged about 34 clean sessions that quoted the tool's own error.
    - The runner checks the gate before launch, and stops the round at the first refused start whose cause every session shares.
    - One smoke session starts before the roster.
2. **Fix bar 4's one failure first**: speak counts only from the surface that is showing (graphty app). Then the severity 2 findings:
    - one shared searchable combobox for the reference picker
    - Clear keeps the card's name
    - a chosen reference shows the value that matched
3. **Settle two rules in `decided.md`**:
    - which wins when Clear then Escape meets "Escape never discards work"
    - the workspace's layout below 1280 px wide
4. **Run the missing inputs** on the next frozen build:
    - the calm-first check over every screen it lists, including the reference picker and the 50,000-node checklist
    - the content designer's hand count
    - the interaction designer's walk
    - the audit of the seven Figma candidates
5. **Freeze, run the gate until it writes its evidence, then restart round 1 in full.** Round 1 does not count toward the cap of three rounds or as "a round with no progress", because it measured nothing about the build.
6. **After the round**, run the two-check review, then the fix loop. Take the "decided, not built" rows and the keyboard and screen-reader problems around Undo and Redo first.
