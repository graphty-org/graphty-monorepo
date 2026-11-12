# The graphty design studio: tier 4 report (data management)

Written 2026-10-30, after the tier's one round of sessions closed. Tier 4 asks whether a person who already uses graphty can manage their own data in it for the first time:

- bring a network in from a web address;
- join two spreadsheets into one network;
- get a column read as dates;
- tell the program which columns hold the place, time, weight and name;
- narrow and mark the picture with filter cards;
- review and repair what the program says is wrong in a file;
- send the data out again.

**Status.** The round ran: 28 sessions on the frozen build, all graded, none void. People finished the work (25 of 26 pointer sessions; the keyboard-only participant 2 of 2), and nothing they did left wrong data behind: the end-state check compared 60 counts and exported files against the network and found no mismatch. Three of the seven bars fail outright -- keyboard (one accessibility defect on 14 of 16 screens), the owner's data rules (a clipped approved ratio), and cost on the join task -- and two more fail only as the rules were frozen. The owner set one round for this tier (a 12 to 24 hour box that started at 10:38 PT on 2026-10-29), so the studio stops here. The fixes the round decided are made next, then the branch lands.

## 1. What was tested

**The app.** The real graphty app, built from branch `design/studio-tier4` in `.worktrees/design-studio-tier4`, served by the study tool (`design/ui/studio/tool/real.mjs`) as a production build on loopback and drawn on the GPU.

| Build                           | Used for                                                                   |
| ------------------------------- | -------------------------------------------------------------------------- |
| e52d7c4f57                      | Six expert walkthroughs before the freeze                                  |
| 7de2dc4e23                      | First freeze, with the walkthroughs' fifteen fixes                         |
| 0ffeae2ef5 to a53beb7179        | Dry run passes 1 to 7 (five builds)                                        |
| **79ed770292** (graphty@0.8.92) | Dry run pass 8, two tool dry runs, **round 1** and its expert walkthroughs |

The frozen build is `.study-builds/tier4-r1d3-79ed770292` in the main checkout. Every session's `session.json` names it.

**Tasks** (`tasks.md`). Nine, each in two domains so a pass cannot come from one domain's words. Half A is a food bank (sites and delivery routes, volunteers, a reporter's sources); half B is a river project (gauges and the stretches between them, a yeast gene network).

| Task    | What the person does                                  | Sessions |
| ------- | ----------------------------------------------------- | -------- |
| T60     | Bring a network in from a web address                 | 2        |
| **T61** | Join two spreadsheets into one network                | 4 + Sam  |
| **T62** | Get dates that were read as plain words read as dates | 4        |
| T63     | Set up where and when (map and timeline)              | 2        |
| T64     | Set a node's name and an edge's weight                | 2        |
| **T65** | Narrow the picture, then mark some of what is left    | 4 + Sam  |
| T66     | Take one node out of the picture                      | 2        |
| **T67** | Review the file's issues and fix what can be fixed    | 4        |
| T68     | Export                                                | 2        |

Bold tasks are the core tasks that bar 7 scores.

**Participants** (`roster.md`). Seven returning-user personas, each starting from a saved project that matches their history (T60 and T61 start empty): Grace (nonprofit data), Ruth (reporter), Dana (supply-chain analyst), Tom (lab manager), Maren (genomics), Alex (operations), and Sam, who uses the keyboard only and counts only for the keyboard bar.

**Sessions** (`rounds/round-1/`). 28 planned, 28 run and graded, 0 void, 0 re-runs, 0 run on Sonnet: all 28 ran on Opus and none ended on an API error. No participant opened a file outside its own folder. Each session was graded from its step log, its screenshots and its end-state record (`data.json`), and the T61 and T65 sessions got the task's follow-up question.

**Expert walkthroughs and checks on the frozen build.**

- Accessibility walkthrough by keyboard and screen-reader text (`expert/a11y.md`).
- Screenshot audit of the data screens at 1200 x 900 and 900 x 700 (`expert/engineer.md`).
- Figma product designer walkthrough (`expert/figma.md`).
- Visual designer walkthrough in both themes and both sizes (`expert/visual.md`).
- Scripted: the axe walk in dark and light (`bars/`, `bars-light/`), the end-state check (`tool/endstate.mjs`, 60 items), the step counter (`tool/steps.mjs`), and scripted reproductions of 13 findings (`repro/`).
- Not run: the interaction designer's walkthrough, and the content designer's hand count of words at rest.

Two independent skeptics then checked every scored problem; one that both dropped was dropped, one that either weakened was weakened (`rounds/round-1/insights.md`).

**Before the round.** Six experts walked the data screens and decided fifteen fixes (`decided.md`, `review/`). An eight-pass dry run (about 2,350 pilot sessions, mostly replays) found and fixed five screens that misstated data (`dry-run-r1-1.md` to `-r1-4.md`). Two tool dry runs checked the browser limit, the name matcher, file drop, detour replay (26 of 26), the wall between participant and facilitator files, and every scripted bar (`rounds/round-1/tool-dry-run-1.md`, `-2.md`).

**What a simulated participant can and cannot tell us.** Every participant is the same language model playing a persona. A failure is strong evidence: the screen did not carry the person through. A pass is weak: the model reads every word, never tires, and shares the designers' blind spots. It cannot tell how long a real person takes, what they notice at a glance, or what they would never try. That is why tier 4 scores cost (steps over the answer key's path, wrong turns, false "done") and not only completion. This round also showed a new limit: participants believed the study tool's text over their own screenshot (section 3, item 1).

## 2. Results against the frozen bars

### Round 1 (28 sessions on 79ed770292)

| #   | Bar (target)                                              | As frozen            | After the skeptic check               | Evidence                                                                                                                                                                         |
| --- | --------------------------------------------------------- | -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success: at least 75% S or SD per task, no half at 0 | **Holds**            | Holds                                 | 25 of 26 pointer sessions (19 S, 6 SD, 1 P); every task at or above 75%. The miss is T62 B                                                                                       |
| 2   | False "done": 0                                           | Fails (1)            | Fails, contested                      | r1-s08 set the column as the time and stopped while its kind was still text. His answer was right and the timeline drew dates; the false done exists only against the answer key |
| 3   | Wrong turns: median at most 2 per task                    | Fails (T64 median 3) | Fails as frozen; not a design failure | Before success each T64 session had 1 wrong turn. The rest were checks after the task was done and hovers misled by the study tool                                               |
| 4   | Severity 3 and 4 problems open: 0                         | Pending              | **Holds**                             | 0 severity 4 (60 end-state items, no mismatch). The four severity 3 candidates were all lowered to 2 or 1                                                                        |
| 5   | Keyboard: Sam S or SD; 0 serious or critical axe findings | **Fails**            | Fails                                 | Sam 2 of 2 S. axe: critical `aria-valid-attr-value` on 14 of 16 screens in each theme -- the table's Nodes tab points at a panel that is never rendered                          |
| 6   | Owner's data rules: 0 violations                          | Pending              | **Fails**                             | The joined source row's approved "17/19 rows joined" ratio is clipped out of sight. Words at rest and the interaction walkthrough were not judged                                |
| 7   | Core cost: median steps at most the key's path + 3        | **Fails**            | Fails                                 | T61 9 over (16 inputs against 7), T65 4.5 over, T67 3.5 over; T62 0 over. Counted as frozen, every input including checks after success                                          |

On bar 7: by the graders' count of steps to the success state, T65 and T67 come within the limit; T61 does not (about 12 inputs to the joined network against a path of 7). T61's cost is real; T65's and T67's is mostly people checking a result the screen did not confirm.

### The dry run before the round

| Pass | Build                    | Findings | Fix now | Outcome                                                                                                                            |
| ---- | ------------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 0ffeae2ef5               | 318      | 23      | Eight fixes; six fix-now rows came from two walkthrough fixes colliding on one row                                                 |
| 2    | 037e96e9bb               | 144      | 4       | Three fixes; the weight fix had not reached a run's reuse                                                                          |
| 3-7  | ff17391bb1 to a53beb7179 | 81-106   | 1-7     | One fix (the Select card's count) built twice and taken back twice before its re-walk finished; one re-pilot of an unchanged build |
| 8    | 79ed770292               | 96       | **0**   | Session-ready                                                                                                                      |

## 3. What was learned, most important first

1. **The study tool told participants something false, and they believed it over the screen.** Hovering a column's issue mark opens its fix list, but the tool printed `tooltip: null`. Four participants (r1-s13, s15, s21, s22) reported that nothing appeared; one "almost gave up". This made false findings and two of T64's wrong turns. A tool line that contradicts the screenshot is worse than no line. It is the first fix before any further round.

2. **The join screen does not show what Join will do.** The most severe open problem (severity 2; one skeptic held 3). The row whose end is unknown is drawn untagged as "1 not in graph", and 3 of 4 T61 participants read it as "will be left out"; Join adds it with an empty node. The repeated key is tagged as added. Everyone read the true result from the counts after Join, so no wrong result stood, but this checking is most of T61's cost (`repro/r1-s03/02.png`). The preview must equal the result, row for row.

3. **Choices come after the act, with a default already applied.** The unknown end is decided only after Join, in the issue list, with "Add nodes" already in effect, and "Leave out" does not say it deletes (5 sessions). A new filter card starts on Hide, so 5 of 5 participants who made a card meant to mark first took part of the picture away (`sessions/r1-s09/16.png`). The task order made this default bite, and the same default helped T66, so the fix is to ask at the act, or to default to the choice that removes nothing. The team's planned "Select | Filter to | Filter out" renames the effect but keeps a new card starting on taking things out; that default is reopened.

4. **One fact drawn two ways sends people to a second menu.** Setting a column as the time leaves its header glyph on text while the timeline draws "Jun 30, 1995 - Jun 27, 2018" (four sessions named it; the one false done). A filter card's count chip counts the whole graph under Hide and only the picture under Select. Place roles are set but not marked on the headers. Each costs doubt and steps, not wrong answers.

5. **The bars failed partly by construction.** The axe defect behind bar 5 was known before the freeze and kept in the backlog under the rule that the dry run fixes only what spoils a grade, so the bar was certain to fail. Bar 2's one failure rests on the answer key's definition while the participant's answer was right. Bar 3 mixed checks after success with real detours, and graders counted hovers differently. Next tier: fix every known bar-failing defect before freezing, review the answer key against the product's model, and define a wrong turn as an input before success.

6. **Four of the fifteen walkthrough fixes were not built as decided** (fix coverage in `scores.md`). The joined source row cuts the second file's name to one letter and hides the ratio (R11: that is bar 6); the inspector's "Set in Data" sets the time in place instead of opening Fields (R10: that is the false done); two join counts are not chips (R13: the join preview); the web address box has no Open button (R8). The dry run walked these routes but graded only whether they spoiled a result. A decided fix needs its own acceptance check in the dry run.

7. **The table header is where people go for column work.** T62: 3 of 4 went there and succeeded. T63: both checked the place in the header's Role menu and neither opened Fields. This supports the owner's choice to keep Type and Role in the header menu. The inspector shortcut misleads only when the task is about the column's kind (n = 4, one P).

8. **The dry run's data fixes held under real use.** No session left a filter that hid more than it said, a source count that disagreed with a recount, or an export that dropped a row. The five misstating screens the dry run fixed did not recur.

Dropped by the skeptics: "a date fix created a sort trap" (nobody fell into it) and "where people fix issues depends on where they start" (two sessions a half, confounded with the dataset).

## 4. What was changed

All of it is on `design/studio-tier4`, not yet on master. "Confirmed" means the round's sessions or end-state check exercised it and it behaved.

**graphty-element** (additive or defect fixes):

| Change                                                                                                                                                                                | Round 1                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A range rule can compare dates (`range` leaf `as: "time"`)                                                                                                                            | Confirmed (T65 B date cards)                                                                |
| A weight role set after loading is the weight runs read (`loadedWeight()` follows the role)                                                                                           | Set in both T64 sessions; no session ran an analysis on it                                  |
| `refused-row` counts only rows the graph lost                                                                                                                                         | Confirmed (T60, no false refusal)                                                           |
| A select condition can select only what is in the picture (`FilterCondition.within`, `FilterSelectWithin`), and its card counts what it would select (`visibility.conditionCounts()`) | Confirmed by the end-state check; the count's basis differs from Hide's (section 3, item 4) |
| The unknown-end issue says which end is unknown (`params.ends`)                                                                                                                       | Reached in T61 and T66; the app does not yet name the end on screen                         |
| New `COLUMN_ROLES` export; an option for which selection changes move the camera pivot                                                                                                | Header Role menu works; its submenu opens highlighted on None                               |

**graph-io:** an import error that dropped only one value says so (`params.skipped`, `SKIPPED_VALUE`). Confirmed (T60).

**compact-mantine:** `ListboxCheck` is exported. No look, token or Figma test changed.

**graphty app.** The walkthroughs' fixes: Filters "+" opens the attribute picker; text cards preview while typing; cards rest as one-row summaries; choosing the time sets only the time; one door to network data; source rows show their issues; one role list; Fields has one group per source; Export opens on Data and states its loss; date columns read as dates. The dry run's fixes: an issue chip never covers the counts; every door that adds a file opens the join screen; a column's kind alone draws its cells; date conditions; the Data source card keeps the edges between its nodes; Export's scope counts the rows it writes; inspector rows use the node's name; Select cards write the picture-only choice. Round 1 confirmed most of these as working; R8, R10, R11 and R13 are not built as decided (section 3, item 6).

**Study tool** (before the round): a study build serves `site.json`; `--end` writes `data.json`; `endstate.mjs` checks bar 4; `steps.mjs` counts bar 7; `bars.mjs --tier 4` runs the axe walk and the words check; a new name matcher (`tool/match.mjs`, with tests) stops refusing a control's exact name when the same words sit in a container. All worked in the round, except the hover report (section 3, item 1).

## 5. What was deferred, and why

- **Product fixes from the round.** The round closed minutes before this report; the criteria say the round's decided fixes are made, landed and reported after it. Nothing from the round is built yet. The list is in section 7.
- **Six team decisions decided before the round but not built** (`owner-decisions.md`, "tier 4 data management questions"): the filter effect words, the renames to "Attributes" and "Data sources", Alt+Down in the column "..." tooltip, the Open button, a mark on detected roles with phone numbers no longer read as places (problem 26 in the round), and dates written date-only in CSV. They change words and looks the round was measuring as they stood. The filter words go in with a non-destructive default, not as decided (section 3, item 3).
- **"Type" against "Kind of value".** An A/B measured by first-try success on T62. It needs a round; this tier has none left.
- **Candidates not confirmed** (one session or one expert, no repro): Export's format warning dropping focus, a date card resting as a raw millisecond number, a typed "at least 10" stored with today's maximum as its top, the first file's issue chip vanishing after a join, and more in `scores.md`. Each needs a scripted repro before it is fixed.
- **The backlog** (`backlog.md`): about 790 dry-run rows, mostly repeats, tagged by owning package; most are keyboard and focus friction (F6, Tab in lists, focus after a dialog). The round confirmed two of them (problems 18, 19).

## 6. Decisions waiting on the owner

**None from tier 4.** Every graphty-element, graph-io and compact-mantine change is additive or a defect fix, recorded under "decided by the team" in `design/ui/studio/owner-decisions.md`. Nothing breaks a published API or changes a default.

One change sits near the line: a weight role set after loading now changes what `data.loadedWeight()` returns. It is recorded as a defect fix, because no consumer sets the weight role to have runs ignore it. If the owner reads it as a change of behavior, the fallback is a new `data.weight()` that runs read, leaving `loadedWeight()` as it was.

Older owner questions from tiers 2 and 3 are still recorded there and block nothing here.

## 7. Next steps, in order

1. **Fix the study tool's hover report**: a hover that opens a popover or hover card reports it. Re-check the accessibility finding it spoiled.
2. **Fix pass for the round** (graphty app unless noted):
    - the join preview shows exactly what Join will do, and the unknown end is decided on the join screen, with each choice naming what it does;
    - a new filter card starts on the effect that removes nothing; "Leave out" says it deletes;
    - setting a column as the time sets its kind to date; place roles get header chips; a card's count uses one basis;
    - the joined source row truncates the name last and never the ratio, and "17 of 19 joined" beside 18 edges is made consistent (bar 6);
    - the table renders the panel its Nodes tab names (bar 5), in compact-mantine if the Tabs component is the cause;
    - R10, R11 and R13 as decided; the six team decisions, the filter words with the default changed;
    - the confirmed severity 2 problems in `scores.md` (problems 5 to 26), each in its owning package; problem 26 (phone read as a place) in graphty-element.
3. **Re-walk** each fixed route with the dry run's pilots, and replay the 13 scripted repros, which should now fail to reproduce. This confirms the fixes, but not with new participants.
4. **Land the branch** through its pull request.
5. **For the next tier:**
    - run the tool dry run first, alongside the expert walkthroughs, and check every tool line against its screenshot;
    - fix known bar-failing defects before freezing;
    - review the answer key against the product's model, and define a wrong turn (input before success; hovers counted one way);
    - give each decided fix an acceptance check in the dry run;
    - plan the cap so a fix round and a re-test round both fit, because one round can find problems but not confirm their fixes.
