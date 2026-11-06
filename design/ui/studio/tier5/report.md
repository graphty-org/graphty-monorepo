# Tier 5 report: choosing which nodes

Date: 2026-11-03. Study build: 1e123d7d33 (`criteria.md` line 1), served from the main checkout's `.study-builds/tier5-r1d1-1e123d7d33`.

## Summary

Tier 5 tests how a person who already knows graphty says which nodes a result applies to:

- which nodes a style layer paints ("Which nodes");
- which nodes a Data filter card keeps.

Both use one editor. At rest it is a read-only outline in the sidebar. Every edit happens in one workspace over the canvas.

- **Round 1 ran with 30 valid sessions.** 28 used a pointer and 2 used only the keyboard. All ran on Opus and none was void.
    - A first attempt at the round was void: the study tool refused all 60 starts (details below).
    - The tool now checks before it launches, and the rerun lost no session.
- **The editor's structure held.**
    - No one said "done" on a wrong screen.
    - Every session on "either of two things" (Or) succeeded, 4 of 4, and so did both 50,000-node sessions.
    - 7 of 9 tasks met the success bar.
- **Five bars fail: 1, 3, 4, 8 and 9.** Bars 2 (false "done") and 5 (keyboard) hold. Bars 6 and 7 are not measured, because the content designer's and the interaction designer's walks did not run.
    - Task success and wrong turns fail on one session, T75 A.
    - Bar 4 fails on two severity 3 problems:
        - a screen reader hears the count of a panel it cannot see;
        - a filter step picked from a run's results is tied to a different run.
    - Cost fails on 7 of the 10 core-task halves: by 0.5 steps on T71 B, and by more on T70, T74 and T78. Most of the extra steps are spent outside the editor, on the Fill color box and on naming a layer.
    - Calm first fails at 4 against an allowance of 3. Each element is a small word or an empty first state, not the editor's layout.
- **One task measured the answer key, not the build.** In T73 (people within 2 hops of a named node), all four sessions found the right people and the right count through the canvas. They scored 0 of 4 only because the key wanted a rule the task never asks for.
- **The studio stops at this run's one-round budget.** The criteria allow two more rounds. The next run:
    - fixes the two severity 3 problems and four repeatable severity 2 problems;
    - rewords two parts of the study;
    - refreezes the build and runs round 2.

## What was tested

### Builds

| Build                                 | What it was                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 7225138fd3, d231869fd5, 7ca4cae647    | Selection cards, polish rounds 1 to 3. 7ca4cae647 stands in for the cards rejected on 2026-11-01 (no copy of 7dfd51c277 was kept) |
| 7acb6c4c07, 1b8c1045bc                | Outline and one property pane, repolish rounds 1 and 2                                                                            |
| 6a37a22344, 64cb33f3a6, 18e34e7295    | The workspace, workspace polish rounds 1 to 3                                                                                     |
| d13c2ff3da, then 0c163f54bf           | First and second criteria freezes                                                                                                 |
| baac78342b to d3fda9f2b6 (six builds) | Dry run passes 1 to 6                                                                                                             |
| 1e123d7d33                            | Dry run pass 8; frozen; round 1 (both attempts)                                                                                   |

### Tasks

Each task has two halves, A and B, on different data.

| Task | What the person does                                                                     |
| ---- | ---------------------------------------------------------------------------------------- |
| T70  | A simple choice, made twice (a filter, then a colored layer)                             |
| T71  | Either of two things ("Or")                                                              |
| T72  | All of one kind, except some                                                             |
| T73  | Everyone within 2 hops of a named node                                                   |
| T74  | The few nodes a measure ranks first                                                      |
| T75  | Making a big network readable, as a chain of steps                                       |
| T76  | The start page's pointing effect (dry run only; its success path never opens the editor) |
| T77  | Changing a rule a colleague set up                                                       |
| T78  | A count over just the strong ties                                                        |
| T79  | One choice in a network of 50,000 nodes                                                  |

### Participants

Seven simulated returning users, each with a written history of earlier work:

- Grace (nonprofit data)
- Ruth (reporter)
- Dana (supply-chain risk)
- Tom (lab manager)
- Maren (genomics)
- Alex (operations)
- Sam (keyboard only)

Every session starts from the person's own saved project or one a colleague shared.

### Rounds and sessions

|                          | First attempt (void) | Round 1                                                                                              |
| ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------- |
| Sessions planned         | 30                   | 30: four each on the core tasks (T70, T71, T73, T74, T78); two each on T72, T75, T77, T79; Sam's two |
| Re-runs                  | 30                   | 0                                                                                                    |
| Void                     | 60 of 60             | 0                                                                                                    |
| Valid pointer / keyboard | 0 / 0                | 28 / 2                                                                                               |
| Run on Sonnet            | 0                    | 0 (every grade records Opus)                                                                         |
| Usable follow-up answers | 0                    | 30                                                                                                   |

Before the round, pilots walked every task in eight dry-run passes. The round's start gate and the tool's two check runs started practice sessions that are not graded.

### Expert walkthroughs and audits

- **Before the round** (each a file in this folder):
    - three spec checks;
    - card polish rounds 1 to 3;
    - repolish rounds 1 and 2;
    - workspace polish rounds 1 to 3;
    - a placement study comparing the sidebar, a bottom drawer and a workspace;
    - two rounds of criteria checks;
    - a rating check and a calm-first check on the rejected cards.
- **On 1e123d7d33** (`rounds/round-1/expert/`):
    - an accessibility walk, by keyboard and by what a screen reader would be given;
    - a Figma product designer's walk;
    - a visual designer's walk;
    - a screenshot audit of 88 screens at 1200 x 900 and 900 x 700, covering the style host, the filter host, a colleague's project and 50,000 nodes;
    - the scripted walk in both themes: axe, words at rest, the 50,000-node lists and waits;
    - ten session repros (`rounds/round-1/repro/`).
- **How findings were checked.** Every finding went through two independent skeptics. A finding both drop is dropped; a finding either one weakens is weakened.
- **Not run:**
    - the content designer's hand count of words at rest;
    - the interaction designer's walk;
    - the calm-first check on 1e123d7d33.

    Bars 6, 7 and 9 need these, and the same three were missing from the void attempt.

### What a simulated participant can and cannot tell us

- **Every participant runs on the same model, so its blind spots are shared.** A failure is strong evidence. A pass is weak, because the model succeeds wherever a task sends it.
- **The overwhelm rating cannot detect crowding.**
    - Re-run on 1e123d7d33, the same two people rated the rejected cards 3 and 5, and this build 2 and 3.
    - The criteria need a gap of 2 points; the gap is 1.5.
    - Every reason they gave named a bug, never crowding.
    - So the median rating (3 here) is reported as a measure only, and calm first rests on counted elements.
- **No session uses a screen reader.** Those problems come only from the accessibility walk, which reads what the page writes to its status region.
- **There are 2 to 4 sessions per task**, so a single session can fail a 2-session task (T75).
- **Only first use is measured.** A second use, saved selections and hierarchy cuts are not.

## Results per round, against the frozen bars

### First attempt at round 1 (void, 1e123d7d33)

No participant saw the app, so only the expert parts could be read.

| #       | Bar                                      | Result                                                                                     |
| ------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1-3, 8  | Success, false "done", wrong turns, cost | Not measured: 0 valid sessions                                                             |
| 4       | Severity 3 and 4 open                    | Fail, on one finding: counts spoken from a covered panel                                   |
| 5       | Keyboard                                 | Expert parts hold (0 serious axe findings on 36 screens, no keyboard block); sessions void |
| 6, 7, 9 | Data rules, consistency, calm first      | Not measured: their walks did not run                                                      |

This attempt does not count toward the cap of three rounds.

### Round 1 (1e123d7d33)

Results after both skeptics (`rounds/round-1/insights.md`; raw numbers in `scores.md`).

| #   | Bar                           | Target                                         | Result                                                                                                                                                                               |
| --- | ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Task success                  | 3 of 4 (or 2 of 2) per task, no half at 0      | **Fails on T75** (1 of 2: A failed). T73's 0 of 4 is set aside as an answer-key fault (below). T70 4/4, T71 4/4, T72 2/2, T74 3/4, T77 2/2, T78 3/4, T79 2/2                         |
| 2   | False "done"                  | 0                                              | Holds: 0 of 30                                                                                                                                                                       |
| 3   | Wrong turns                   | Median at most 2 per task                      | **Fails on T75** (one session at 7, one at 0); every other task at most 1                                                                                                            |
| 4   | Severity 3 and 4 open         | 0 confirmed                                    | **Fails: 2 severity 3** (learned item 2 below)                                                                                                                                       |
| 5   | Keyboard                      | Sam succeeds, 0 blocks, 0 serious axe findings | Holds: Sam 2 of 2, no keyboard block, 0 serious or critical axe findings at both sizes and in both themes                                                                            |
| 6   | Data rules                    | 0 confirmed violations                         | Not measured (none found; two input walks missing)                                                                                                                                   |
| 7   | Figma and graphty consistency | 0 severity 3-4, at most 5 severity 2           | Not measured (3 confirmed severity 2 so far; one input walk missing)                                                                                                                 |
| 8   | Cost on core tasks            | Median steps per half at most path + 3         | **Fails on T70 A and B, T74 A and B, T78 A and B, and T71 B (by 0.5)**. T73 A's steps measure the canvas route, not the editor                                                       |
| 9   | Calm first                    | At most 3 severity 2                           | **Fails, 4 of 3, and this is a floor:** the new Or group's first state; the words "Condition..." and "Or..."; By position's count box; the workspace header's place in the Tab order |

Cost per core half, as median steps with the limit in brackets:

| Half  | Median steps (limit)                                                       |
| ----- | -------------------------------------------------------------------------- |
| T70 A | 21.5 (18)                                                                  |
| T70 B | 24.5 (18)                                                                  |
| T71 A | 11 (12)                                                                    |
| T71 B | 12.5 (12)                                                                  |
| T73 A | 22.5 (15)                                                                  |
| T73 B | 12 (15)                                                                    |
| T74 A | 20 (16)                                                                    |
| T74 B | 20.5 (16)                                                                  |
| T78 A | 23.5 (20)                                                                  |
| T78 B | 50.5 (22), including one session that counted neighbors by hand (68 steps) |

## What was learned, most important first

1. **The editor's structure works; doubt comes from small words and empty first states.**
    - No false "done" in 30 sessions, every Or session succeeded, and both 50,000-node sessions succeeded.
    - Readers who ticked a checklist picked no wrong value (0 of 6), against 6 of 9 placement-study sessions on earlier builds.
    - No one lost their place to Escape (0 of 3 who pressed it), against 5 of 9 on earlier builds.
    - The least-sure moments people named were words and first states:
        - "Condition..." and "Or..." never say "and" or "or else" (three sessions on three halves);
        - a just-added Or group opens at "B 0", with its untouched range drawn full width (four sessions).
    - Expect the next round to move on wording and defaults, not on a redesign.

2. **A count over a base the reader cannot identify is still the worst defect class.** Both severity 3 problems are of this kind.
    - **A filter step tied to the wrong run.** Connected components ran on the 112 nodes showing. The step's value picker then offered "Connected components" without saying which run. The step it made counted over a second run on the whole graph ("Group 1, 549", under a top bar reading 112 of 549). This is what stopped T75 A (`rounds/round-1/repro/r1-s23/`).
        - Which part of the graph a run covered is a fact about the run. graphty-element should report it, and the app should put it into words in the picker.
        - Renaming the entries in the app would only hide the problem.
    - **A screen reader hears the covered panel's count.** While the workspace is open, each count change is written twice to the status region. The second write is the covered inspector row's count, over a different base: "15 of 24", then "4 of 24 nodes".
        - This is fixed in the graphty app after the freeze (2718c60410), but the fix has not been walked yet.

3. **Most of the extra steps are spent outside the editor, on the color row.**
    - After Fill "+", the color box is empty. A click gives only a text cursor, so people guessed color names (7 sessions on 6 halves).
    - When the box is empty, the color picker closes on its first click and commits that color (3 sessions; repro `repro/r1-s02/`).
    - The Fill box, or the drawing after it, was the least-sure moment for 8 of 28 pointer sessions, and it is the largest share of T70's extra steps.
    - Naming a new layer added more: its name box opens in rename mode, which cost three people 2 steps each.
    - The cheapest win on cost is the color row, not the editor's structure.

4. **By position's count box gives no direction or unit, then shows a wrong message.**
    - It is one empty box, with "of all nodes" in about 9 px type. Three T74 sessions, on both halves, typed "top 5".
    - The error then says "the count and drawing still use the highest 10", while every node is drawn as a match.
    - The cause: the message is built from `card.top ?? 10`, so an untouched step claims a limit it does not apply (`repro/r1-s13/`, `repro/r1-s16/`).

5. **The study's own setup failed in three places, and each can be fixed before round 2.**
    - **T73's key wants a live "within 2 hops" rule that the task never asks for.** All four sessions made the right set and count through the canvas's Neighborhood panel (their first stop in 4 of 4), so no one ever reached the editor's Within hops step.
    - **One follow-up question invites a wish.** It asks "Would you rather it had shown something else?", and all 5 who were asked said they wanted the real color while choosing.
    - **The test data is already colored in an orange-to-brown ramp, and the tasks ask for orange.** So when a new color seems to disappear into the old one, that is partly caused by the study itself.

6. **The two designer walks that feed bars 6 and 7 did not run, in either attempt.** A bar with no input can neither pass nor fail. These walks must be part of launching a round, and must be checked before the round counts, the same way sessions are.

7. **The launch path failed once, and the fix worked.**
    - In the first attempt the start gate never ran, so every start was refused with the same message.
    - The re-run rule then re-ran all 30 sessions into the same refusal.
    - The runner now runs the gate first, and stops at the first refusal that every session shares (bf8aa82961). The rerun had 0 void sessions.

8. **Two decided rules contradict each other, and the build follows both.**
    - On a reopened filter card, Clear then Escape deletes the card, and Undo cannot bring it back (`expert/a11y/k1b/44.png` to `49.png`). Escape skips the "is this a new card" check that Cancel makes.
    - Nothing decides the workspace's layout below 1280 px. At 900 x 700 the preview is a 44 px sliver.

9. **Large graphs are usable but not quick.**
    - In the 50,000-node sessions, no wait was longer than 10 s (the longest was 8.5 s), and no one retried or gave up.
    - The scripted walk still has 4 of 74 steps over 10 s, showing a busy sign but no progress. The longest is 15.9 s.

10. **Some fixes are not confirmed by people.**
    - The share of sessions that guessed an editor word did not move: 32%, against 33% before.
    - No T78 session (0 of 4) reached the step's "Edges where" setting. Three counted over the strong ties through the Data place filter instead, which is an accepted route.

11. **Each dry-run fix left the step just after it broken, in all eight passes.** The dry run only settled once every fix's check went one step beyond the fixed action.

12. **Where the editor sits made no measurable difference.** In the placement study, the sidebar, a bottom drawer and a workspace each scored 9 of 9, and each was rated 2 to 3 for overwhelm. The rejected cards were a structure problem, and polishing them did not fix it.

## What was changed, by package

Everything below was built before the freeze, and round 1 is the first time people used it. The last column says what the round showed.

### graphty-element

All of these are additive and `@beta`, recorded under "decided by the team" in `../owner-decisions.md`.

| Change                                                                                                                                                                                           | Confirmed by round 1?                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| The selection model: a union of ordered Add, Keep and Except steps; the leaves `measure`, `hops`, `touching`, `nonempty`, `same-value` and `by-size`; Edges where inside a step; `scope.asUnion` | Yes for Or and Except (T71 4/4, T72 2/2). No person reached `hops` or Edges where         |
| Live counts and reasons (`scope.watchSteps`), `scope.histogram`, value kinds and field facts                                                                                                     | Yes: 0 false "done"                                                                       |
| `StyleCounts.visible` and a key block's `scope.visible` (a layer counted over what the filter leaves)                                                                                            | Yes: the key and the drawing agreed on 39 of 39 key rows                                  |
| `styles.showBranches` (the picking view), `waitForPainted`, and no "covered" reading while repainting                                                                                            | Partly: 4 of 5 read the picking view as a preview, but all 5 wanted to see the real color |
| `history.restoreTo`, and the node table's pages following Undo and Redo                                                                                                                          | Not reached                                                                               |
| One batch of nodes per frame on large repaints (d801a0fddd)                                                                                                                                      | Yes in sessions (longest wait 8.5 s); scripted waits over 10 s remain                     |

### graphty app

| Change                                                                                                                                                                                   | Confirmed by round 1?                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| One selection editor for both places: the sidebar outline plus one workspace, no effect word, "+" only in section headers, an Except switch, Advanced closed at rest, every list bounded | Yes for success and for truthful counts; calm first fails on its words and first states |
| The matches strip searches first; the value picker's list scrolls; the 50,000-node lists are counted and searchable                                                                      | Yes: T79 2 of 2; all 5 asked used the strip and none hid it                             |
| "Drawing" shown from the click until the result is painted; keys typed during a busy close are kept                                                                                      | Yes, in the 50,000-node sessions                                                        |
| Cancel on a new card leaves no undo step; the data table never takes the editor's selection; the preview key and the canvas toolbar are hidden while the workspace is open               | Nothing contradicted them; the Clear-then-Escape conflict remains                       |
| A just-added color line shows no color until one is picked, so the box never shows a color nothing paints                                                                                | Truthful, but the empty box is now the most-named problem (learned item 3)              |
| After the freeze: the inspector row stays quiet while the workspace is open (2718c60410)                                                                                                 | Not walked yet                                                                          |

### compact-mantine

- `InputBase` is now drawn the way the Select is drawn. No token, spec or Figma test changed. It waits for the owner's Figma approval (item 10 below).

### Study tool

| Change                                                                                                                        | Commit     |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A session's setup ends with an empty undo history                                                                             | c8581ff123 |
| Tier 5 scoring and screen walks (axe, words, 50,000-node lists)                                                               | fb61362abf |
| Scripts for words at rest, large lists and long waits                                                                         | 2aa3ff3fad |
| The runner runs the start gate first and stops on a refusal every session shares; the leak check reads only what a call opens | bf8aa82961 |

## What was deferred, and why

- **Round 1's severity 2 findings.** No fix pass was open after the round, because of the one-round budget.
    - Findings that count against a bar:
        - the empty Fill box and its first click;
        - "Is exactly" ignored on an empty text step;
        - Clear then Escape on a reopened card.
    - Consistency findings (bar 7):
        - the value picker jumping up over its field and Done (`decided.md` 734);
        - Clear renaming a card "a selection" (`decided.md` 631-632);
        - a colleague's two-step card shown at rest as one row.
    - Others:
        - a card's name that stops describing it after an Or;
        - a chosen reference shown by its id instead of its name;
        - the 900 x 700 layout.
- **Problems outside the editor** (backlog):
    - the Style layers "+" when the sidebar search is open;
    - the Neighborhood header naming a gauge by its id;
    - the start page not scrolling with the mouse wheel over its hero;
    - no sign that a lower layer already colors the same nodes.
- **Unconfirmed candidates**, each needing a repro or a second task half:
    - Largest component changes nothing and shows no "so far" count;
    - a second filter card previews over the full graph;
    - graph measures are hidden in the value picker until typed;
    - three screens are over the 50-word budget (57, 66 and 67 words).
- **The backlog** (`backlog.md`): 722 rows over eight dry-run passes, with repeats.

    | Kind                  | Rows |
    | --------------------- | ---- |
    | Decided but not built | 136  |
    | Friction              | 158  |
    | Wording               | 115  |
    | Cosmetic              | 78   |
    | Accessibility         | 235  |

    The dry run fixed only what crashes, blocks a task or spoils a grade. These rows wait for the fix loop between rounds.

- **Not built:**
    - pick on canvas: graphty-element has no armed one-click pick that leaves the current selection alone;
    - the group pane's Color, and Settings in Advanced;
    - saved selections and hierarchy cuts.
- **T76 has no sessions**, because its success path never opens the editor.

## Decisions waiting on the owner

Only breaking changes to a published API and departures from compact-mantine's Figma lock are listed. Each is in `../owner-decisions.md`, and the build keeps today's behavior until the owner decides. Round 1 added none.

### Breaking changes to graphty-element

1. **A filter condition that reads the selection goes stale** (2026-10-31). Choices:
    - (a) refuse it, in the next grouped major release;
    - (b) freeze it to node ids when it is written;
    - (c) make the filter follow the selection;
    - (d) leave it. This is what is built, and the app never writes such a condition.
2. **Algorithm levels are read as ordered values** (bfs `level`, and k-core and dfs `value`; 2026-10-31). Choices:
    - (a) declare them ordinal in the next major release;
    - (b) leave them (what is built);
    - (c) add an optional override.
3. **A graph file's node names** (2026-11-01). GraphML and CSV files whose names are in a `name` column get their nodes named by id ("n17"). Choices:
    - (a) the importers pick the name or label column, as GML does;
    - (b) the app sets it from the Data place's Name role;
    - (c) leave it.
4. **A text column whose values repeat offers only Contains** (2026-11-01). Choices:
    - (a) list it as a category when it has at most half as many distinct values as records;
    - (b) keep it.
5. **A saved Select card** (2026-11-01). Choices:
    - (a) graphty-element rewrites it as Keep, turned off, when the project loads;
    - (b) keep it. This is what is built: the card is read-only until its first edit.

### compact-mantine's Figma lock

6. **Two click targets smaller than 24 px:** the split button's chevron (16 x 24) and the slider and histogram thumbs (10 to 12 px).
7. **The checked Chip's contrast** is 1.98:1 in light mode and 1.3:1 in dark mode. Also: whether the split button should carry a word ("+ Keep").
8. **List fields ignore a caller's height cap, and the arrow keys skip disabled menu items**, so a keyboard user never hears why an item is unavailable.
9. **A histogram of whole numbers draws hairline bars** in a step's pane. Choices:
    - (a) compact-mantine gives each bar at least one step of width;
    - (b) graphty-element adds an upper edge to each bin;
    - (c) keep the hairlines.
10. **`InputBase` drawn the way the Select is drawn.** It is built on the study branch and needs the owner's Figma approval before it lands.

## Next steps

1. **Fix the two severity 3 problems.** Re-walk each with a repro that goes one step past the fixed action.
    - Re-walk the screen-reader count fix (2718c60410).
    - For the run's scope: find out whether graphty-element already reports which part of the graph a run covered. If it does not, add it as an additive change, and have the picker put it into words.
2. **Fix the four repeatable severity 2 problems**, each checked against its repro:
    - By position: add a direction and a unit, and drop the message that is built from a default;
    - the empty Fill box: give it a cue, and stop its first click from committing a color;
    - make "Is exactly" take effect on an empty step;
    - Clear then Escape (or Done) on a reopened card: make the same "is this a new card" check that Cancel makes.
3. **Calm first (bar 9).**
    - Give a new Or group a calm first state: no "B 0", and no full-width untouched range.
    - Settle "Condition... / Or...".
        - The open question had no evidence before; round 1 supplies it. Three sessions on three halves read neither word as "and" or "or else".
        - Switching to "And... / Or..." is easy to undo, so the team makes the call, records why, and round 2 checks it.
    - Move the workspace header earlier in the Tab order, make it an F6 stop, and show Escape as Done's key.
4. **Consistency (bar 7).**
    - The value picker stays under its field.
    - Clear keeps the card's name.
    - A colleague's two-step card shows its second step at rest.
5. **Fix the study's setup before round 2.**
    - T73: either the task asks for something only a rule gives, in words that do not name a control, or the key accepts a correct picked set and T73 stops counting toward the editor.
    - Replace the follow-up question that invites a wish.
    - Vary the color the tasks ask for against the colors already in the test data.
    - Fix the T73 A setup: its briefing promises a saved project the setup never writes.
    - Fix three scoring tools:
        - the end-state check counts hidden layers;
        - the grade form has no P;
        - `steps.mjs` pools the two halves of a task.
6. **Require the missing walks before the round counts:**
    - the content designer's hand count;
    - the interaction designer's walk;
    - the calm-first check on the new frozen build.
7. **Refreeze, run the start gate and one smoke session, then run round 2.** The criteria allow rounds 2 and 3. The next run needs room for the fix pass, the refreeze, the re-walks and a full round.
8. **Between rounds, take the backlog's "decided but not built" rows first**, then the keyboard and screen-reader work around Undo and Redo.
