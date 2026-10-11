# Tier 2 report: returning users on the real graphty app

Written 2026-10-11 for the owner. It covers five rounds of the returning-user study (tier 2) run on the real graphty app between 2026-10-08 and 2026-10-11. Tier 1 (first-time users) is reported in `../report.md`.

## Summary

- **Four rounds measured the design; the fifth measured nothing.** Rounds 1 to 4 ran 55, 55, 56 and 53 valid sessions, and success rose from 52 of 55 to 53 of 53. Round 5's 56 sessions were all refused at start by the study tool, because the round's start check (the "gate") had never run. The refusal worked as designed, so no bad data entered the study, but round 5 has to be run again.
- **No round has met every bar yet.** In round 4, nine of the eleven bars held. Two still failed: the expert walkthrough bar, on drawn names covering each other (a graphty-element defect), and the words-at-rest bar, by two words on an edge's inspector. Those two words are true scope facts, so we did not cut them.
- **The product's remaining problems are small.** Every failure left after round 4 is severity 2 or 3, and none cost a participant the task. They are mostly cases where two parts of the app answer the same question differently. One example: the find box offered a rule for a bare number that the rule parser then refused.
- **The study's own faults cost more than the product's.** Across the rounds: participants read the facilitator's task file; a leak check read no logs and passed; the gate was skipped twice; briefings named answers; and round 5 ran from an outdated copy of the run script. Each fault was fixed by moving the refusal into the one command every session runs.
- **Six decisions wait on the owner** (end of this report). All six were open before round 5, and round 5 added none.

## What was tested

**The product.** The tier 1 workspace of the graphty app (`/?next`), as a local production build of the studio worktree, frozen before each round and driven by `tool/real.mjs` the way a person would drive it: pointer, keys, file drops and screenshots.

| Round | Build (commit, version)   | Dry runs before it | Planned sessions | Valid |
| ----- | ------------------------- | ------------------ | ---------------- | ----- |
| 1     | 946256efb, graphty@0.8.56 | 4                  | 56               | 55    |
| 2     | 8f0d5a6f7, graphty@0.8.61 | 4                  | 56               | 55    |
| 3     | 26f3bb968, graphty@0.8.61 | 3                  | 56               | 56    |
| 4     | 5277e2cbe, graphty@0.8.64 | 2                  | 56               | 53    |
| 5     | 8c015b806, graphty@0.8.65 | 1                  | 56               | 0     |

A dry run walked every task on both of its datasets, plus the previous round's commonest wrong turns, by pointer and by keyboard. Implementation and polish faults were fixed and the build was frozen again. Dry runs stopped once a walk found nothing new.

**The ten tasks** (`tasks.md`). Each was run on two datasets (halves A and B):

- bring two spreadsheets in as one network;
- keep only the strong ties (filtering);
- find the fewest people in between (shortest path);
- leave notes that stay with the work;
- open a file whose number means "farther" and have every run read it that way;
- rerun on a newer copy of the file;
- mark every node or tie that meets a condition;
- see who is a step or two away;
- select one tie on the drawing;
- show one person and who they are tied to.

The cost bar measures four of these, "the core four": filtering, the shortest path, the weight's meaning, and rerunning on a newer file.

**Participants** (`roster.md`). Nine returning personas: six tier 1 graduates (Grace, Ruth, Dev, Elena, Nadia, Tom) and three regular analysts (Alex, Jordan, Dana). Each session briefed one of them with a history of earlier sessions, a prompt and a starting project.

**Expert work each round.** Four specialists walked the frozen build: controls and gestures, visual design, accessibility by keyboard and screen reader, and a screenshot audit at 1200 x 900 and 900 x 700. `tool/bars.mjs` scored the scripted bars: every algorithm reading the weight as loaded (290 runs), automated accessibility (axe, shared names, focus after scripted actions), and words at rest. Two independent skeptics then checked every claim against the transcripts, screenshots and source before it became an insight.

**What a simulated participant can and cannot tell us.** Every participant is one model playing a persona. A failure is strong evidence: the screen let a capable reader go wrong. A pass is weak: seven sessions saying the same thing are one model's habit, not seven people. "Returning" is a briefing, not a memory, so a participant is faster than a real person on anything its history names. Keyboard-only, screen-reader and touch use were not studied in sessions (owner, 2026-10-07); only the scripted accessibility bar and the accessibility walkthrough cover them.

## Results per round

Bars are the frozen ones in `criteria.md`; every bar must hold in one round. The status shown is the status after the skeptics. "Not scored" never counts as a pass.

### Round 1 (946256efb): 52 of 55 succeeded

| Bar                                   | Result                                                         |
| ------------------------------------- | -------------------------------------------------------------- |
| 1 Success per task and half           | Fails: condition marking 3 of 4                                |
| 2 Earlier work kept                   | Not scored (the open-work lister did not exist yet)            |
| 3 No confirmed severity 4             | Holds                                                          |
| 4 No silent commit                    | Holds                                                          |
| 5 Numbers agree with drawing and data | Fails: a run's key stayed current-looking after Replace        |
| 6 No false "done"                     | Holds (0 of 55)                                                |
| 7 Weight read as loaded               | Not scored (script did not exist); 0 sessions misread a weight |
| 8 Automated accessibility             | Not run; fails by hand (focus fell to the page)                |
| 9 Words at rest                       | Not scored                                                     |
| 10 Expert walkthrough and audit       | Fails: 3 confirmed severity 3                                  |
| 11 Cost of the core four              | Fails: the weight's meaning, 23 steps against 22               |

### Round 2 (8f0d5a6f7): 55 of 55 succeeded

| Bar                             | Result                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| 1 Success per task and half     | Holds, weakened: participants read the facilitator's task file |
| 2 to 6                          | Hold                                                           |
| 7 Weight read as loaded         | Holds: 290 scripted runs, 0 wrong readings                     |
| 8 Automated accessibility       | Fails: 3 serious axe violations                                |
| 9 Words at rest                 | Fails: every tier 2 screen rose above round 1's count          |
| 10 Expert walkthrough and audit | Fails: 2 confirmed severity 3                                  |
| 11 Cost of the core four        | Fails: paths, 8.5 steps against 8                              |

### Round 3 (26f3bb968): 54 of 56 succeeded

| Bar                             | Result                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| 1 Success per task and half     | Fails: selecting one tie, 2 of 4                                 |
| 2 to 5                          | Hold                                                             |
| 6 No false "done"               | Holds (two claims dropped: both described the screen accurately) |
| 7 Weight read as loaded         | Holds                                                            |
| 8 Automated accessibility       | Fails by its letter on one axe hit, likely a false positive      |
| 9 Words at rest                 | Fails by one word on an edge's inspector                         |
| 10 Expert walkthrough and audit | Fails: 1 confirmed severity 3 (drawn names)                      |
| 11 Cost of the core four        | Holds                                                            |

### Round 4 (5277e2cbe): 53 of 53 valid succeeded

| Bar                                   | Result                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| 1 Success per task and half           | Holds, even if the three owed sessions all fail                              |
| 2 to 4, 6                             | Hold                                                                         |
| 5 Numbers agree with drawing and data | Holds by its words; the data table ignoring a filter step kept at severity 2 |
| 7 Weight read as loaded               | Holds                                                                        |
| 8 Automated accessibility             | Holds                                                                        |
| 9 Words at rest                       | Fails: an edge's inspector 29 words against 27                               |
| 10 Expert walkthrough and audit       | Fails: 2 confirmed severity 3                                                |
| 11 Cost of the core four              | Holds (paths 8 against 8, on the limit)                                      |

Three round 4 sessions were lost to the study runner and are still owed.

### Round 5 (8c015b806): 0 of 56 valid

| Bar                             | Result                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| 1 to 9, 11                      | Not scored: no session reached the app; the bars script did not run |
| 10 Expert walkthrough and audit | Fails: 1 confirmed severity 3 (drawn names)                         |

The four specialists did walk this build, and their findings stand because the build will not change for the re-run. They found six of round 4's problems fixed on it, including the data table under a filter step, the "or more" row for a number that is not itself a value, and an off filter step that now stays off. None of these fixes is credited until participants meet them.

## What was learned, most important first

1. **A rule that is only written down does not hold; a refusal in the command every session runs does.** The gate was skipped in rounds 3 and 4 while the plan said it was required, and a leak check read zero logs for a whole round and passed. In round 5, `real.mjs --start` refused all 56 sessions of an ungated round, and so no bad data entered the study. But round 5 also showed the next gap. The run in flight was a continuation script written after the 2026-10-10 usage limit. It had no gate step and never received later fixes to the main script. A continuation script is a fork: either every fix reaches it, or the run is stopped and relaunched. (`rounds/round-5/insights.md`, item 1.)
2. **Drawn names covering each other and covering dots is the one severity 3 that survived every round.** On the running-club data, "Chloe" is drawn over "Farah" and "Dev" over "Eli" (`rounds/round-5/expert/visual/narrow/02.png`). It is graphty-element's to fix. The element already declutters label against label (`layoutBehavior.labels.declutter`, which the app turns on), but it does not move a label off a dot or an edge, and the layout can place two nodes on top of each other. Round 3's measurement of it had declutter off and was re-scored. The app uses no font, offset or seed trick to hide it, so the expert bar keeps failing on it honestly.
3. **A control that matches a common habit is used at once.** After graphty-element made Shift-click on a node add it to the selection, selecting one tie went from 2 of 4 (round 3, with two false "done") to 7 of 7. The new toolbar Filters button was the first and only door in 7 of 7 filtering sessions. The pass is primed (the briefing names Shift-click), so it is weak evidence. The failure it replaced was not primed.
4. **The remaining product defects are pairs of checks that disagree about one fact.** Round 4's two new severity 3s were both of this kind. In the first, the find box offered "=`10`" for a bare number and the selector then refused it, because the suggestion's parse test was weaker than the selector's. In the second, the filter editor treated "no edit" as unchanged but still saved, and turned an off step on, when the editor was left. Round 5's specialists found two more of this kind:
    - An edge-only filter step marks every run out of date while its note says "Ran on 20 nodes; 20 shown now", which reads as "nothing changed".
    - A rule on a column the data does not have answers "Nothing matches this rule", exactly like a true empty result, and Enter empties the selection.
5. **Readers type a condition in the data's own words, never in rule syntax.** Across rounds 2 to 4, 0 participants typed "=" first. Where the prompt names a column they type the column; where it gives only a number they type the number. So the find box must turn both a column name and a bare number into a working rule. That is now built in graphty-element (`FindResult.atLeast`, `rulePath`) and checked only by specialists.
6. **Prompts and briefings can produce the behavior they measure.** Round 2's participants read the facilitator's file, and 13 of 16 did the follow-up question before it was asked. In round 3, a prompt said "point out" while the answer key credited only a selection. In rounds 3 and 4, a briefing table named the answers. Every "noticed unprompted" count from rounds 3 and 4 is discounted. Leak checks now read the briefings, not only the logs.
7. **Measure a claim before classing it.** A still screenshot cannot show that a tooltip is missing (hovering can). A "stale size after undo" turned out to be 3D perspective. Several proposed new APIs were already half built. The rule that a claim from one source is scripted before it is fixed closed several false findings without a code change.

## What was changed, by package, and whether the next round confirmed it

**graphty-element** (all additive and decided by the team; each recorded in `owner-decisions.md`):

| Change                                                                                                                                               | Round | Confirmed by the next round?                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| Selection halo rings a node without tinting it                                                                                                       | 1     | Yes: no participant misread a selection in round 2                                 |
| A selection's added color or width starts at the highlight look (`styles.highlightStyle`)                                                            | 2     | Yes: the default no longer erased a mark in round 3                                |
| An Add that repeats loaded ties reports how many                                                                                                     | 2     | Yes: Replace found 8 of 8 in round 3                                               |
| Shift-click on a node adds it to the selection                                                                                                       | 3     | Yes: one tie 7 of 7 in round 4 (primed)                                            |
| A typed number offers "at least" beside "is" (`FindValueRow.atLeast`)                                                                                | 3     | Partly: worked on one dataset; on the other it offered a rule the selector refused |
| The refused suggestion is only a rule the selector accepts; "or more" for any in-range number (`FindResult.atLeast`); one rule spelling (`rulePath`) | 4     | Specialists only (round 5): fixed                                                  |

**graphty app:**

| Change                                                                                                           | Round | Confirmed?                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| Find answers a typed condition with the rule that reads it; Enter runs it                                        | 1, 2  | Yes: 8 of 8 in round 3                                             |
| Replace and Edit source in the source's "..." menu                                                               | 1     | Yes: 8 of 8 in round 3, after round 2's leak was closed            |
| A file opened from the start screen goes through the Data page (the weight's meaning set at load)                | 1     | Yes: 8 of 8 read it as loaded in rounds 3 and 4                    |
| The canvas key says ", out of date"                                                                              | 1     | Yes: 0 of 8 read old values as current in round 3                  |
| Keyboard focus fixes in the step editor, find box, Path form and Color                                           | 1-3   | Yes: the scripted focus check held in round 4                      |
| Words at rest cut back toward round 1's counts                                                                   | 2     | Partly: 3 of 4 screens under; an edge's inspector is 2 words over  |
| Shortest path found by readers' words; Analyze ranks name matches first                                          | 2, 3  | Yes: paths cost within limit from round 3                          |
| A Filters button on the canvas toolbar                                                                           | 3     | Yes: first door 7 of 7 in round 4                                  |
| A filter step over edges counts edges and nodes                                                                  | 3, 4  | Yes for the step row; the out-of-date note still counts nodes only |
| The data table lists what the filter steps keep; off steps stay off; New project then Discard; note Cancel focus | 4     | Specialists only (round 5): fixed                                  |
| The "or more" row placed below every matching tie                                                                | --    | Not changed: confirmed severity 2 in round 5                       |

**compact-mantine:** a 24 px target for the extra-small checkbox (round 2; the round 3 axe run no longer flagged it). Also: a stat row that wraps instead of cutting its reading, a number box that follows an undefined value, and a fold whose content is no longer a named region. These last three change existing behavior and are listed for the owner below.

**Study tool** (`tool/`):

| Change                                                                          | Round | Confirmed?                                              |
| ------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| At most four live sessions; exact name matches; a real file drop                | 1     | Yes                                                     |
| Scripts for the weight, accessibility, words-at-rest and open-work bars         | 1, 3  | Yes: scored from round 2                                |
| A participant cannot read a facilitator file                                    | 2     | Yes; then the briefing itself leaked (fixed in round 4) |
| The runner refuses a round without gate evidence                                | 3     | No: round 4 ran ungated through a continuation          |
| `real.mjs --start` refuses a session of an ungated round                        | 4     | Yes: it refused 56 of 56 in round 5                     |
| Briefings name each data file and its kind only; the leak check reads briefings | 4     | Not yet: no session ran                                 |

## What was deferred, and why

- **Moving labels off dots and edges, and spacing nodes by their drawn size** (graphty-element). This extends label declutter, which is an additive option and the team's call. It is too large to land between rounds without blurring what each round measures. It is first in line after the study.
- **The "or more" row below the matching ties; a missing column answered as an empty result; the edge-only out-of-date note.** These were found by specialists on the round 5 build. They wait for the round 5 re-run, so that round measures one build. The proposed shape for the missing column is a new fact on the find and rule result naming the columns no element has. The proposed shape for the edge-only note is edge counts on the out-of-date fact. Both are additive.
- **Distance per name at two or three hops.** It needs each neighbor's distance from the element (additive). One session met it.
- **A notice when a second path replaces the first.** 0 of 7 participants needed the first chain afterwards.
- **Ctrl and Meta adding to a selection.** Nobody tried them first.
- **compact-mantine's toast announced as an alert, menu shortcut names, the heading focus mark.** Severity 1.
- **Whether a run's results belong in Attributes.** graphty-element's `data.attributes()` declares `origin: "result"` but never sets it. This is a question for after the study.

## Decisions waiting on the owner

Only breaking changes and one-way doors are listed. Everything additive was decided by the team and recorded in `../owner-decisions.md`. The owner's 2026-10-10 ruling already settled every row of the studio pull request's breaking-change table (all ship as a minor release) and the segmented control's face.

The three compact-mantine changes the study also raised (`StyleNumberInput` following `value={undefined}`, `ControlSubGroup` content no longer a named region, and stat rows that grow) are rows 20 and 21 of that table, and the owner decided on 2026-10-10 that they ship as a minor release.

1. **Should graphty-element's rule language accept a bare number** (`weight > 3`) instead of asking for backticks? This changes what an existing API accepts, and JMESPath, the language it is a subset of, refuses a bare number. Readers never type the backticks. The find box now offers a working rewrite, so the study does not depend on this answer. (2026-10-07.)
2. **What an edge's line width measures.** A width of W is 10 x W / d pixels at distance d, so the default 8 draws under 2 pixels on a graph framed from 50 units away, and three participants read it as broken. Either fix (screen pixels, or a new default and documented unit) changes what an existing setting does. (2026-10-09.)
3. **Should a project file keep the camera?** This changes a saved file format. Today a reopened project is framed afresh, which can sit about 60 px off from how it was saved. (2026-10-08.)

## Next steps

1. **Relaunch the tier 2 run from the main script** (`rounds/workflow-tier2.js`, which has the gate step), not the continuation script in the main checkout's `tmp/studio-resume/`. Before any session starts, the new run's journal must show the round 5 gate step, and `rounds/round-5/plan.md` must end with "Gate evidence". That evidence comes from `tool/bars.mjs` into `rounds/round-5/bars/`, then `real.mjs --gate`.
2. **Run the three owed round 4 sessions** on 5277e2cbe from new folders, scored into round 4.
3. **Re-run all 56 round 5 sessions** on 8c015b806 from new folders, with the same persona, half, prompt and start. The build, plan, pilots, briefings and expert findings stand.
4. **Make the runner end a round on the first start refusal**, so an ungated round costs one session, not 56.
5. **Script the open claims on 8c015b806 before anyone fixes them:** whether a drawn name still takes a click on the tie under it; the edge-only out-of-date note (to settle whether the element or the app owns it); long names cut at the canvas edges; the key growing over the drawing.
6. **Then decide round 5's changes.** The candidates are: a missing column reported as a fact (graphty-element, then the app's words); edge counts on the out-of-date fact; and the "or more" row's place in the find list (app). After that, extend label declutter to dots and edges in graphty-element.
7. **Before real users:** five to eight analysts and one screen-reader user on the core four. They should measure what simulation cannot: whether real readers find Filters and Replace without a history that names them, and whether 3D sizes mislead.
