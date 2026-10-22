# Tier 2 report: returning users on the real graphty app

Written 2026-10-11 for the owner. It covers the five rounds of the returning-user study (tier 2), run on the real graphty app between 2026-10-08 and 2026-10-11. Tier 1 (first-time users) is reported in `../report.md`.

## Summary

- **Returning users now finish every task.** Success went from 52 of 55 sessions (round 1) to 55 of 55 (round 5). Every task met its success floor in rounds 4 and 5.
- **Two bars still fail, both narrow.** The first is drawn names and nodes covering each other, the one severity 3 problem left. It belongs to graphty-element's label placement and layout spacing. The second is an edge's inspector: it shows 29 words against a limit of 27, and the two extra words are true scope facts ("full graph", "on nodes"), so they were not cut.
- **The tasks have hit their ceiling.** Round 5 met the stall rule on its strict reading. Every task already succeeds, so success cannot rise further. The round 4 fixes it was meant to check sit on screens that no task sends a reader to; for example, no participant opened the data table under a filter step. More simulated rounds on these tasks will mostly measure the study. The next useful signal needs new tasks that route readers through the fixed screens, or real people.
- **The study's own faults cost more than the product's.** Participants read the facilitator's task file. A leak check read no logs and passed. The start check (the "gate") was skipped twice. Briefings named answers. Round 5's first run went out from an outdated copy of the run script. In round 5, step counting, the participants' histories, the task setups and the prompts' own words each put a study artifact into the scores. Each fault was closed by putting a refusal into the one command every session runs, or is listed below to be corrected before the next round.
- **Three decisions wait on the owner**, all open since before round 5: bare numbers in rules, what an edge's width measures, and whether a project file keeps the camera.

## What was tested

**The product.** The tier 1 workspace of the graphty app (`/?next`). It was built from the studio worktree as a local production build and frozen before each round. `tool/real.mjs` drives it the way a person would: pointer, keys, file drops and screenshots.

| Round        | Build (commit, version)   | Dry runs before it | Sessions run | Valid |
| ------------ | ------------------------- | ------------------ | ------------ | ----- |
| 1            | 946256efb, graphty@0.8.56 | 4                  | 56           | 55    |
| 2            | 8f0d5a6f7, graphty@0.8.61 | 4                  | 56           | 55    |
| 3            | 26f3bb968, graphty@0.8.61 | 3                  | 56           | 56    |
| 4            | 5277e2cbe, graphty@0.8.64 | 2                  | 56           | 53    |
| 5, first run | 8c015b806, graphty@0.8.65 | 1                  | 56           | 0     |
| 5, re-run    | 8c015b806, graphty@0.8.65 | (same)             | 56           | 55    |

A dry run walks every task on both of its datasets, plus the previous round's commonest wrong turns, by pointer and by keyboard. Faults in implementation and polish were fixed and the build frozen again. Dry runs stopped once a walk found nothing new.

**The ten tasks** (`tasks.md`), each on two datasets (halves A and B):

- bring two spreadsheets in as one network;
- keep only the strong ties;
- find the fewest people in between;
- leave notes that stay with the work;
- open a file whose number means "farther" and have every run read it that way;
- rerun on a newer copy of the file;
- mark everything that meets a condition;
- see who is a step or two away;
- select one tie on the drawing;
- show one person and their ties.

The cost bar measures four of them, "the core four": filtering, the shortest path, the weight's meaning, and rerunning on a newer file.

**Participants** (`roster.md`). Nine returning personas: six tier 1 graduates (Grace, Ruth, Dev, Elena, Nadia, Tom) and three regular analysts (Alex, Jordan, Dana). Each session briefed one of them with a history of earlier sessions, a prompt and a starting project.

**Expert work each round.** Four specialists walked the frozen build: controls and gestures, visual design, keyboard and screen-reader accessibility, and a screenshot audit at 1200 x 900 and at 900 x 700. `tool/bars.mjs` scored the scripted bars:

- every algorithm reading the weight as it was loaded (290 runs);
- automated accessibility (axe, shared accessible names, focus after scripted actions);
- the number of words on screen at rest.

Two independent skeptics then checked every claim against the transcripts, screenshots and source before it became an insight.

**What a simulated participant can and cannot tell us.** Every participant is one model playing a persona. A failure is strong evidence: the screen let a capable reader go wrong. A pass is weak: seven sessions that agree are one model's habit, not seven people. "Returning" is a briefing, not a memory. A participant is faster than a real person on anything its history names, and no faster on anything else. Round 5 showed how far this goes: the participants whose histories named the Style tab went there first, and the others never did. Keyboard-only, screen-reader and touch use were not studied in sessions (owner, 2026-10-07). Only the scripted accessibility bar and the accessibility walkthrough cover them.

## Results per round

The bars are the frozen ones in `criteria.md`, and every bar must hold in the same round. Each status is the status after the skeptics. "Not scored" never counts as a pass.

### Round 1 (946256efb): 52 of 55 succeeded

| Bar                                   | Result                                            |
| ------------------------------------- | ------------------------------------------------- |
| 1 Success per task and half           | Fails: marking by condition, 3 of 4               |
| 2 Earlier work kept                   | Not scored (no open-work lister yet)              |
| 3, 4, 6                               | Hold                                              |
| 5 Numbers agree with drawing and data | Fails: a run's key looked current after Replace   |
| 7 Weight read as loaded               | Not scored by script; 0 sessions misread a weight |
| 8 Automated accessibility             | Not run; fails by hand (focus fell to the page)   |
| 9 Words at rest                       | Not scored                                        |
| 10 Expert walkthrough and audit       | Fails: 3 confirmed severity 3                     |
| 11 Cost of the core four              | Fails: the weight's meaning, 23 steps against 22  |

### Round 2 (8f0d5a6f7): 55 of 55 succeeded

| Bar                             | Result                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| 1 Success per task and half     | Holds, weakened: participants read the facilitator's task file |
| 2 to 7                          | Hold (7: 290 scripted runs, 0 wrong readings)                  |
| 8 Automated accessibility       | Fails: 3 serious axe violations                                |
| 9 Words at rest                 | Fails: every tier 2 screen above round 1's count               |
| 10 Expert walkthrough and audit | Fails: 2 confirmed severity 3                                  |
| 11 Cost of the core four        | Fails: shortest path, 8.5 steps against 8                      |

### Round 3 (26f3bb968): 54 of 56 succeeded

| Bar                             | Result                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| 1 Success per task and half     | Fails: selecting one tie, 2 of 4                            |
| 2 to 7                          | Hold                                                        |
| 8 Automated accessibility       | Fails by its letter on one axe hit, likely a false positive |
| 9 Words at rest                 | Fails by one word on an edge's inspector                    |
| 10 Expert walkthrough and audit | Fails: 1 confirmed severity 3 (drawn names)                 |
| 11 Cost of the core four        | Holds                                                       |

### Round 4 (5277e2cbe): 53 of 53 valid succeeded

| Bar                                   | Result                                          |
| ------------------------------------- | ----------------------------------------------- |
| 1 Success per task and half           | Holds, even if the three owed sessions fail     |
| 2 to 4, 6, 7, 8                       | Hold                                            |
| 5 Numbers agree with drawing and data | Fails: the data table ignored a filter step     |
| 9 Words at rest                       | Fails: an edge's inspector, 29 words against 27 |
| 10 Expert walkthrough and audit       | Fails: 2 confirmed severity 3                   |
| 11 Cost of the core four              | Holds                                           |

Three round 4 sessions were lost to the study runner and never re-run. Round 5 ran every task again on a newer build, so no later result depends on them.

### Round 5 (8c015b806): 55 of 55 valid succeeded

The first run of round 5 was void: the study tool refused all 56 sessions at start because the gate had not run. The re-run passed the gate and is the round scored here (`rounds/round-5/scores.md`, `insights.md`).

| Bar                                   | Result                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1 Success per task and half           | Holds: every task and half at its floor; 50 succeeded cleanly and 5 with difficulty                         |
| 2 Earlier work kept                   | Holds as scored since round 2; a second shortest path replaced the first in 6 sessions                      |
| 3, 4, 6                               | Hold                                                                                                        |
| 5 Numbers agree with drawing and data | Holds, but only because nobody met the case: 0 of 12 participants opened the data table under a filter step |
| 7 Weight read as loaded               | Holds: 290 runs, 0 wrong readings                                                                           |
| 8 Automated accessibility             | Holds: 0 serious axe hits on 14 screens; focus held after 17 actions                                        |
| 9 Words at rest                       | Fails: an edge's inspector, 29 against 27                                                                   |
| 10 Expert walkthrough and audit       | Fails: 1 confirmed severity 3 (drawn names and nodes covering each other)                                   |
| 11 Cost of the core four              | Holds; counted the answer key's way, the shortest path has room                                             |

One session (r5-s02b) is void and owed. It ended before its first step after a model-side interruption; nothing in the app or the tool caused it, and T22 holds even if the re-run fails. Severity 3 findings fell from 5 confirmed in round 4 to 1. The specialists' raw total rose from 153 to 162, because the accessibility and visual passes walked screens no earlier round had reached (Export, Save as, Settings, a run's Values), and none of the new findings is above severity 2.

## What was learned, most important first

1. **The product's remaining problems are small; the tasks no longer find more.** Every task succeeds, and every confirmed problem left is severity 2 or below except drawn names. Round 4's severity 3 fixes, such as the data table under a filter step, are confirmed only by specialists, because no task gives a reader a reason to open those screens. The T17 prompt asks for a count the top bar already shows. Read strictly, round 5 is stalled. (`rounds/round-5/insights.md`, item 3.)
2. **A rule that is only written down does not hold; a refusal in the command every session runs does.** The gate was skipped in rounds 3 and 4 while the plan said it was required. A leak check read zero logs for a whole round and passed. Moving the gate into `real.mjs --start` refused all 56 sessions of round 5's ungated first run, so no bad data entered. The re-run, launched from the main run script, passed the gate, and its leak check read exactly one log per session. That first run also taught that a continuation script written after a usage limit is a fork: every later fix must reach it, or the run is relaunched from the main script.
3. **The study measures itself unless every history, prompt, setup and count is checked against what it scores.** Round 5 found four places where it did:
    - **Step counts.** The answer key counts typing a name and picking it as one step; participants did both as two. The "shortest path on its limit" finding came from that mismatch, not the design.
    - **Histories.** All three participants who went first to the Style tab had histories that named it.
    - **Setups.** The rerun and notes setups never saved, while the histories said "saved", so a plain Save opened "Save as".
    - **Prompts.** "Without taking any stop or link off the drawing" put the fear of hiding into every transcript. "So that every calculation treats more minutes as a longer trip" told participants the answer.

    In earlier rounds, the facilitator's file and the briefings leaked answers, so every "noticed unprompted" count from rounds 3 and 4 is discounted.

4. **Drawn names and nodes covering each other is the one severity 3 that survived every round.** On the running-club data, "Chloe" is drawn over "Farah" and two sized nodes are drawn inside each other. On the filtering task an overlapping pair hid one of five ties, so three participants could not check the count by eye. The element already declutters label against label, which the app turns on. It does not move a label off a dot, and the layout can place two nodes on top of each other. The other half of round 4's claim, a drawn name taking a click meant for the tie under it, did not reproduce: three clicks on this build all got the tie.
5. **A control that matches a common habit is used at once.** Selecting one tie went from 2 of 4 (round 3) to 7 of 7 and then 4 of 4 after Shift-click on a node began adding it to the selection. The toolbar Filters button was the first move in 7 of 7 and then 8 of 8 filtering sessions. A bare "10" typed in the find box now gives a "10 or more" row, 3 of 3, where round 4's build offered a rule the selector then refused. These passes are partly primed by the histories; the failures they replaced were not.
6. **The defects that remain are pairs of checks that disagree about one fact.** Round 4's two new severity 3s were both of this kind: the find box offered a rule its own parser refused, and the filter editor saved a step it treated as unchanged. Round 5's specialists found two more. An edge-only filter step marks every run out of date while its note reads "Ran on 20 nodes; 20 shown now". A rule on a column the data does not have answers like a true empty result. Look for the second check whenever one is fixed.
7. **Readers type a condition in the data's own words, never in rule syntax.** Across rounds 2 to 5, no participant typed "=" first. Readers type the column name or the number, so the find box turns either into a working rule. Backticks still show in the rule text of layers and the key, and one participant read "Put numbers in backticks:" as a refusal.
8. **Measure a claim before classing it.** A still screenshot cannot show a missing tooltip; hovering can. A "stale size after undo" turned out to be 3D perspective. Several proposed new APIs were already half built. Scripting a claim before fixing it closed several false findings without a code change.

## What was changed, by package, and whether the next round confirmed it

**graphty-element.** All of these are additive, decided by the team and recorded in `../owner-decisions.md`.

| Change                                                                                                                                | Round | Confirmed?                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| Selection halo rings a node without tinting it                                                                                        | 1     | Yes: no selection misread in round 2                    |
| A selection's added color or width starts at the highlight look (`styles.highlightStyle`)                                             | 2     | Yes: no mark erased in round 3                          |
| An Add that repeats loaded ties reports how many                                                                                      | 2     | Yes: Replace found 8 of 8 in round 3                    |
| Shift-click on a node adds it to the selection                                                                                        | 3     | Yes: 7 of 7 (round 4), 4 of 4 (round 5)                 |
| A typed number offers "at least" (`FindValueRow.atLeast`)                                                                             | 3     | Partly: one dataset offered a rule the selector refused |
| Only rules the selector accepts are offered; "or more" for any in-range number (`FindResult.atLeast`); one rule spelling (`rulePath`) | 4     | Yes: a bare "10" gave "10 or more", 3 of 3              |

**graphty app.**

| Change                                                                                                                        | Round | Confirmed?                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| Find answers a typed condition with the rule that reads it; Enter runs it                                                     | 1, 2  | Yes, every round from 3                                            |
| Replace and Edit source in the source's "..." menu                                                                            | 1     | Found 8 of 8, but 7 of 8 in round 5 reached it by a hidden route   |
| A file opened from the start screen goes through the Data page, where the weight's meaning is set                             | 1     | Yes: 8 of 8 in rounds 3 to 5 (round 5's prompt named it)           |
| The canvas key says ", out of date"                                                                                           | 1     | Yes: 0 copied old values in rounds 3 to 5                          |
| Keyboard focus fixes in the step editor, find box, Path form and Color                                                        | 1-3   | Yes: the scripted focus check held in rounds 4 and 5               |
| Words at rest cut back toward round 1's counts                                                                                | 2     | Partly: an edge's inspector is still 2 words over                  |
| Shortest path found by the readers' words; Analyze ranks name matches first                                                   | 2, 3  | Yes                                                                |
| A Filters button on the canvas toolbar                                                                                        | 3     | Yes: first move 7 of 7, then 8 of 8                                |
| A filter step over edges counts edges and nodes                                                                               | 3, 4  | Yes for the step row; the out-of-date note still counts only nodes |
| The data table lists what the filter steps keep; an off step stays off; New project then Discard; a note's Cancel keeps focus | 4     | Specialists only: no task reached them                             |

**compact-mantine.** The extra-small checkbox got a 24 px target in round 2, and the axe runs from round 3 on no longer flag it. A stat row now wraps its reading instead of cutting it. A number box follows `value={undefined}`. A fold's content is no longer a named region. These three change existing behavior; the owner ruled on 2026-10-10 that they ship as a minor release.

**Study tool** (`tool/`).

| Change                                                                          | Round | Confirmed?                                                      |
| ------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------- |
| At most four live sessions; exact name matches; a real file drop                | 1     | Yes                                                             |
| Scripts for the weight, accessibility, words-at-rest and open-work bars         | 1, 3  | Yes: scored from round 2                                        |
| A participant cannot read a facilitator file                                    | 2     | Yes; the briefing then leaked, fixed in round 4                 |
| The runner refuses a round without gate evidence                                | 3     | No: round 4 ran ungated through a continuation                  |
| `real.mjs --start` refuses a session of an ungated round                        | 4     | Yes: refused 56 of 56, then the re-run passed the gate          |
| Briefings name each data file and its kind only; the leak check reads briefings | 4     | Yes: one log read per session; 2 flags, both cleared on reading |

## What was deferred, and why

- **Moving labels off dots and edges, and spacing nodes by their drawn size** (graphty-element). This is the open severity 3. It extends label declutter, an additive option and the team's call. It was too large to land between rounds without blurring what each round measured. It is first in line now.
- **Round 5's severity 2 problems** (`rounds/round-5/insights.md`, item 4). Each was held so that round 5 measured one build:
    - No names are drawn unless the setup turns them on, so a chain or a neighborhood can only be checked against a list.
    - Replace has no visible control.
    - Opening a newer file lands on Add, with Load as the filled button, even when every tie would be added twice.
    - The Add page leaves new people out by default, with a reason that names node rows the file does not have.
    - A note's subject is whatever the inspector shows, and the form cannot change it.
    - "Hops" is unexplained, and "Medici and 11 connections" does not match "Selection 12".
    - "Filter to neighbors" gives no way back.

    All are the app's to fix, plus one fact from graphty-element if it names node rows that do not exist.

- **Three findings only the specialists saw:** the "or more" row below the matching ties, a missing column answered as an empty result, and the edge-only out-of-date note. The proposed shapes are additive: a fact naming the columns no element has, and edge counts on the out-of-date fact.
- **A notice when a second path replaces the first.** 6 of 6 participants who ran two paths had written the first down, and no prompt asked for both.
- **Severity 1:** the funnel icon on find's value rows; Style having no threshold; a numeric column loading as a plain attribute; Ctrl and Meta for adding to a selection; the toast announced as an alert; menu shortcut names.
- **Whether a run's results belong in Attributes.** graphty-element's `data.attributes()` declares `origin: "result"` but never sets it. This waits until after the study.

## Decisions waiting on the owner

Only breaking changes and one-way doors are listed here. Everything additive was decided by the team and recorded in `../owner-decisions.md`. The owner's 2026-10-10 ruling settled every row of the studio pull request's breaking-change table (all ship as a minor release), including the histogram banding, the selected edge's blue band and the three compact-mantine changes.

1. **Should graphty-element's rule language accept a bare number** (`weight > 3`) instead of asking for backticks? This changes what an existing API accepts, and JMESPath, the language the rules are a subset of, refuses a bare number. Readers never type the backticks. The find box already offers a working rewrite, so the study does not wait on this answer. Raised 2026-10-07.
2. **What an edge's line width measures.** A width of W draws 10 x W / d pixels at distance d. So the default 8 draws under 2 pixels on a graph framed from 50 units away, and three participants read it as broken. Either fix changes what an existing setting does: screen pixels, or a new default with a documented unit. Raised 2026-10-09.
3. **Should a project file keep the camera?** This changes a saved file format. Today a reopened project is framed afresh, which can sit about 60 px off from how it was saved. Raised 2026-10-08.

## Next steps

1. **Fix the study before another round compares anything.**
    - Count steps the same way for participants and the answer key (typing and picking is one step; a refused click is not a step), and restate bar 11 for rounds 2 to 5.
    - Make the setups agree with the histories: projects the histories call saved must start saved.
    - Rewrite the prompts that name what they measure: the weight's meaning and the fear of hiding.
    - Give the filtering task a question that only the data table answers.
2. **Land the smallest product fixes, each in its owning package.**
    - graphty-element: label placement and spacing by drawn size.
    - App: a visible Replace on the source; the Add page's defaults and words; a choosable note subject; the value row's icon and tooltip.
    - Then script the edge-only out-of-date note and the missing-column answer, and fix them in the element first and the app second.
3. **Decide bar 9 (b) on its merits.** The two words over the limit are true scope facts. Raise that screen's limit with the reason in the criteria's change log, rather than reword the screen to meet a count.
4. **Run the owed r5-s02bb session** (Ruth, the marking task's B half) and score it into round 5. Re-run the tie-click claim on 8c015b806.
5. **Make the runner end a round on the first start refusal**, so an ungated round costs one session, not 56.
6. **Next, real people rather than another simulated round on these tasks.** Five to eight analysts and one screen-reader user on the core four. They should measure what simulation cannot: whether readers find Filters and Replace without a history that names them, and whether 3D sizes mislead. If another simulated round runs first, it needs new tasks that route readers through the screens fixed in rounds 4 and 5.
