# Round 7: what the study found

Round 7 tested the clickable skeleton of refined structure B (`../../app-b/`, specification
`../structure-comparison/structure-b-refined.md`), not the static gallery mocks of rounds 1 to 6.
Four methods, all with **simulated participants** built from the persona files in `../personas/`:

- **Tree test** (`tree.md`, key in `tree-test.md`, answers and grades in `tree-test/`): 16 personas,
  16 jobs, the skeleton's navigation as a text outline.
- **First click** (`first-click/`): 16 personas, 14 prompts on still renders of the skeleton.
- **Think-aloud sessions** (`sessions/`): 280 sessions over 61 tasks, each participant clicking
  through the skeleton with the study tool. One grade sheet per task (`sessions/grades-<task>.md`).
- **Focus groups** (`focus-groups/`): notes on paths and their tags, importing several tables,
  stacked paint, and very wide data.

**Every number here comes from simulated participants.** Sixteen personas share blind spots, so a
failed task is a strong signal and a passed one a weak signal until real people confirm it.

How to read this page:

- **Grades** come from what ended on screen and what the participant concluded, not from their own
  rating. S = success, SD = success with difficulty, F = failure, G = gave up.
- **Ease** is the Single Ease Question, 1 (very hard) to 7 (very easy), read from each transcript.
- **Severity** is Nielsen's scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe
  (the task cannot be done, or the user leaves or reports a wrong answer without knowing).
  **Observed** means a participant did something; **said** means an opinion. A finding resting on
  opinion alone is held one level down. **Confirmed** means observed in two or more participants.
- **Skeleton defects** are problems in the clickable prototype or the study tool, not in the
  design: a control the skeleton does not wire, a fixed screen that ignores what was chosen,
  sample data from another domain's task. They are in Part 1 and are not counted against the
  design. Part 2 holds the design findings.
- **Routes** are written `app-b/#/<section>/<state>` and open at http://dev.ato.ms:9825/app-b/#/...
  Participant-view renders of every route cited here are in `../../shots/app-b/<section>--<state>.png`.

---

## Verdict: the round does not pass

| Bar | Result | Met? |
|---|---|---|
| Every top task and every new task at 80% or more graded success or success with difficulty | 11 of 21 pass (table below). Six fall below because the skeleton could not reach the end state (communities on transfers, find and explore on transfers, both filter tasks partly, Replace data, recipes, the repeat export); four fall on design problems (sets, path, color or size by a value, notes on several kinds of subject) | **No** |
| No confirmed severity-4 problem left unresolved | Three confirmed severity-4 design problems: adding more rows to a loaded table is refused and the door to it is mislabeled; Select where cannot be found from any place people look; an exported picture leaves out the legend with no way to add it | **No** |
| Mean ease over every session at least 5.5 | **3.54** over all 280 sessions; 3.94 without the 67 sessions whose end state the skeleton could not reach; 4.86 over the 77 sessions on tasks no skeleton defect decided | **No** |
| Every tree-test task at least 70% direct success | 9 of 16 tasks pass. Picture for slides, a colleague's style file, the 40-appearances weight, a different arrangement, select by a typed rule, rerun on next month's file and two-line labels miss | **No** |

What the round can and cannot say:

- **18 of 61 tasks (67 sessions) could not reach their end state in the skeleton.** No click led to
  the screen the task was written to test (the unreadable-file refusals, the too-large notice, the
  recipe's applied rows, the April data after Replace, the failed rerun bar, a saved view in
  Present, three characters hidden). These sessions are evidence about the way in, not about the
  designed screen. Every one is listed in Part 1 with what to wire before it runs again.
- **Another 29 tasks crossed a skeleton defect that the graders say drove the ease rating**:
  "Compute the overview" swapping in the Les Miserables summary, the Data place drawn with another
  task's filter, a node table that opens on rows 381 to 420 and cannot page, labels never drawn,
  layouts never redrawn, and a study tool that cannot type text or modifier-click.
- **On the 14 tasks with no deciding defect**, success with difficulty or better is 70 of 77
  (91%), and mean ease is 4.86. Below the ease bar, but close to round 6's level on the static
  mocks (4.72), on a far harder test.

---

## Tree test

**Simulated participants, 16 personas, 16 jobs.** Correct = the final pick is a place the key
accepts. Direct = reached without backing out of a branch. Direct success = correct and direct.
The bar is 70% direct success on every task.

| # | Job | Correct | Direct success | Bar | Where the detours went |
|---:|---|---:|---:|---|---|
| 1 | Find the go-betweens | 16 (100%) | 14 (88%) | meets | 12 chose Rank nodes and edges; the key accepts any Analyze heading |
| 2 | Read a colleague's note on a cluster | 16 (100%) | 16 (100%) | meets | all went to Rail > Notes; none used a row's note count |
| 3 | A picture for Friday's slides | 16 (100%) | 3 (19%) | **below** | 13 opened the main menu first looking for Export, found none, backed out |
| 4 | Use a colleague's colors and settings file | 16 (100%) | 2 (13%) | **below** | 10 saw Main menu > Open... and rejected it as "opens a whole project"; 9 opened Settings |
| 5 | See the project before Tuesday | 16 (100%) | 16 (100%) | meets | Version history, direct |
| 6 | Leave out the small ones in every number | 16 (100%) | 16 (100%) | meets | all looked at the Full graph chip first but did not trust it |
| 7 | 40 appearances together = a closer tie | 13 (81%) | 1 (6%) | **below** | nearly all went to the Weight role first, found no column holding "40", backed out; Pair was "guessed" |
| 8 | Try a different arrangement | 16 (100%) | 1 (6%) | **below** | 12 reached Layout > Method only after Toolbar > View or the canvas menu; 4 stopped at Re-run or Reshuffle |
| 9 | Come back to this angle on Monday | 16 (100%) | 16 (100%) | meets | Save view, from the rail or the View menu |
| 10 | How far the groups moved between months | 16 (100%) | 15 (94%) | meets | Graph switcher > Compare graphs... |
| 11 | Select everyone matching a typed rule | 14 (88%) | 1 (6%) | **below** | 4 left Create set where... because it takes one attribute; 3 found Select where only from an earlier task; 2 ended in Analyze search |
| 12 | What the program sends to its makers | 16 (100%) | 16 (100%) | meets | Local only chip, then Settings > Privacy |
| 13 | Rerun March's work on April's file | 15 (94%) | 10 (63%) | **below** | 4 backed out of Main menu > Open...; one was afraid to press Replace and added April beside March instead |
| 14 | Name with department under it | 16 (100%) | 5 (31%) | **below** | 11 feared a second Label by would replace the name, and moved to the Style tab's Label "+" |
| 15 | Hide three but keep them counted | 16 (100%) | 16 (100%) | meets | Hide on canvas; nobody chose a filter |
| 16 | Scores came in as words | 16 (100%) | 12 (75%) | meets | 4 opened the data page's column roles first and found no "number" |
| | **All tasks** | **250 of 256 (98%)** | **160 of 256 (63%)** | 9 of 16 | |

The tree's places are right; the routes to them are not. Correctness is 98%, the highest of any
round, but direct success is 63%. Every miss on the bar is a detour, and the detours have one
pattern each: file actions are sought in the main menu (3, 4, 13), a property is sought where its
data lives rather than where it is set (7, 14, 16), and arranging is sought on the toolbar and the
canvas (8).

Task 4 was reported both ways, as planned: with all three key doors and with the project-name menu
alone, the correct rate is 100% (16 of 16 ended on Project name > Apply recipe or style file...).
The file-style doors (Main menu > Open..., the Data page) do not carry this job: 10 of 16 read
Open... as "replace my project".

## First click

**Simulated participants, 16 personas, 14 prompts.** Bar: 70% on every prompt, plus the
specification's own thresholds where it names one.

| # | Prompt | Correct | Specification's own threshold | Where the clicks went |
|---:|---|---:|---|---|
| fc01 | A colleague's note about one community | 12 (75%) | "Rows with notes" chip returns if more than a third miss inside the tree: 4 of 16 (25%) of all clicks, 4 of 10 (40%) of clicks into the tree | Notes rail 6, the Louvain row's note bubble 6, the built-in Notes row 4 (wrong) |
| fc02 | Path between two selected nodes | 16 (100%) | -- | the selection bar's route icon, 16 |
| fc03 | Stop the layout moving | 16 (100%) | about half reach the Layout icon: met | Pause icon 16 (tests recognition of "pause", not of "layout") |
| fc04 | Go back to a saved view | 16 (100%) | about half reach the View icon: not tested | all 16 used the labeled Views rail button; none the toolbar's cube |
| fc05 | Show what the colors mean | 15 (94%) | -- | Legend button 15 |
| fc06 | Make a group's edges dashed | 16 (100%) | -- | the Edges switch 16 |
| fc07 | Label every node with its name | 16 (100%) | 85%: met | Label "+" 16 |
| fc08 | Weighted count of shared chapters | 14 (88%) | -- | Total value 14; Links (count) 2 |
| fc09 | Money received | 16 (100%) | -- | Total amount in 16 |
| fc10 | Bring in a downloaded nested export | 16 (100%) | -- | Open project or file... 16 |
| fc11 | Replace this month's data under everything built on it | 13 (81%) | -- | Data rail 13; project name 2, main menu 1 (wrong) |
| fc12 | Use a colleague's style file | 15 (94%) all doors; **0 (0%)** project name alone | -- | main menu 15; project name 0 |
| fc13 | Find one attribute among 69 | 16 (100%) | -- | Find attribute box 16 |
| fc14 | Door swipes that matched nobody | 15 (94%) | -- | "from 3 tables" link 9, Data rail 6 |
| | **All prompts** | **212 of 224 (95%)** | | |

- **Every prompt passes 70%.** The still screens are legible: the right control is recognized on
  sight. The trouble in this round is in what the controls do next.
- **fc01 crosses the specification's threshold on one reading and not the other.** The
  specification should say which denominator it means. Either way the trap is the same: the built-in
  Notes row in the tree, a style row that selects the noted elements, drew 4 of 16 with the word
  "Notes" and a count. Studio reading: count against clicks into the tree (40%), so the "Rows with
  notes" question is open again; see finding 22.
- **fc12: nobody clicks the project name for a colleague's style file**, the only place Apply recipe
  or style file... lives on that screen. It passes only because the main menu's Open... also hands
  a style file to the same dialog. With the tree test (task 4) and the sessions (t15, t15-wide), the
  evidence says people go to the main menu for anything file-like (finding 4).
- **fc04 gives no evidence on the cube icon**: the labeled Views rail button took every click.
- **fc08 and fc09 pair the weighted-measure names on two domains.** Money 16 of 16, chapters 14 of
  16. The two misses are on the attribute name "value", not on the measure names; the same two least
  technical participants also missed fc11.

## Think-aloud: task success and ease

**Simulated participants, 280 sessions over 61 tasks.**

### Overall

| | Sessions | S | SD | F | G | S + SD | Mean ease |
|---|---:|---:|---:|---:|---:|---:|---:|
| All tasks | 280 | 64 | 122 | 27 | 67 | 186 (66%) | 3.54 |
| Without the 18 tasks whose end state the skeleton cannot reach | 213 | 64 | 119 | 6 | 24 | 183 (86%) | 3.94 |
| The 14 tasks no skeleton defect decided | 77 | 37 | 33 | 0 | 7 | 70 (91%) | 4.86 |

Only 23% of sessions (64 of 280) succeeded without a wrong turn. "With difficulty" dominates every
task family: people reach the answer, rarely by the designed route.

### By top task and new task (the success bar)

| Top task or new task | Tasks | S + SD | Rate | Mean ease | Without unreachable end states | Bar (80%) |
|---|---|---:|---:|---:|---:|---|
| 1 Characterize the whole graph | t01, t01-transactions | 11 of 13 | 85% | 4.31 | 85% | meets |
| 2 Rank by a measure | t02, t02-transactions | 12 of 12 | 100% | 3.33 | 100% | meets |
| 3 Communities | t03, t03-transactions | 5 of 11 | 45% | 2.73 | 83% | below (skeleton) |
| 4 Find a node and explore around it | t04, t04-transactions | 5 of 9 | 56% | 2.22 | 100% | below (skeleton) |
| 5 Take a note | t05 | 5 of 6 | 83% | 5.67 | 83% | meets |
| 6 Filter, then characterize | t07, t07-wide | 5 of 10 | 50% | 2.20 | 100% | below (skeleton) |
| 7 Make the layout readable | t08, t08-transactions | 9 of 10 | 90% | 3.00 | 90% | meets |
| 8 Color or size by a value | t09, t09-wide | 6 of 10 | 60% | 2.60 | 60% | **below** |
| 9 Named sets, combined | t10, t10-transactions | 0 of 10 | 0% | 2.10 | 0% | **below** |
| 10 Compare | t11 | 6 of 6 | 100% | 4.67 | 100% | meets |
| 11 Path between two nodes | t12, t12-doorentries, t12-transactions | 6 of 13 | 46% | 3.23 | 46% | **below** |
| 12 Reuse an analysis (Replace data) | t13 | 0 of 6 | 0% | 2.17 | not measurable | below (skeleton) |
| Bookend: load a graph | t14, t14-transactions, t26 | 12 of 14 | 86% | 3.93 | 86% | meets |
| Bookend: start from a recipe | t15, t15-wide | 0 of 9 | 0% | 2.11 | not measurable | below (skeleton) |
| Bookend: export | t16, t17, t17-transactions | 11 of 15 | 73% | 4.47 | 100% | below (skeleton) |
| New: one graph from several tables | t18, t18-transactions, t19 | 18 of 18 | 100% | 5.00 | 100% | meets |
| New: weight set at load | t20, t20-transactions | 10 of 10 | 100% | 4.70 | 100% | meets |
| New: labels from a field | t21, t21-wide | 9 of 10 | 90% | 2.80 | 90% | meets |
| New: notes with no author name | t05, t06, t06-doorentries, t39, t39-doorentries | 17 of 22 | 77% | 4.73 | 77% | **below** |
| New: a field found and used among dozens | t22, t23 | 11 of 13 | 85% | 4.54 | 85% | meets |
| New: a graph built from a nested document | t24, t25 | 12 of 12 | 100% | 4.75 | 100% | meets |

"Below (skeleton)" means the rate rises over 80% once the unreachable sessions are set aside, or
cannot be measured at all; the design under test was not reached. The notes row falls short only
because the study tool cannot type: in three of the five failed sessions the writing box was open
with the right subject when the participant stopped (t39). Sets, path, and color or size are below
the bar on design problems (findings 2, 9, 10, 12 and 6).

### Every task

| Task | What it asked | Sessions | Success | With difficulty | Failed | Gave up | S + SD | Mean ease | Skeleton effect |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| t01 | what did my colleague hand me? | 7 | 5 | 0 | 0 | 2 | 71% | 5.00 | no deciding defect |
| t01-transactions | check what came in (March transfers) | 6 | 0 | 6 | 0 | 0 | 100% | 3.50 | crossed a skeleton defect |
| t02 | who the teammate's work ranks highest (Les Miserables) | 6 | 0 | 6 | 0 | 0 | 100% | 4.50 | no deciding defect |
| t02-transactions | top ten receiving accounts (transfers sample) | 6 | 3 | 3 | 0 | 0 | 100% | 2.17 | crossed a skeleton defect |
| t03 | how many circles, and what fewer, larger ones would take (Les Miserables) | 6 | 0 | 5 | 1 | 0 | 83% | 3.33 | crossed a skeleton defect |
| t03-transactions | transaction rings (transfers) | 5 | 0 | 0 | 0 | 5 | 0% | 2.00 | end state unreachable |
| t04 | look up Valjean, then narrow to him and his neighbors | 5 | 0 | 5 | 0 | 0 | 100% | 2.40 | crossed a skeleton defect |
| t04-transactions | who sent money to the alerted account (Transfers, March 2026) | 4 | 0 | 0 | 4 | 0 | 0% | 2.00 | end state unreachable |
| t05 | write a note attached to Valjean | 6 | 5 | 0 | 0 | 1 | 83% | 5.67 | crossed a skeleton defect |
| t06 | two reminders, one on the Javert -- Valjean tie, one on Myriel's circle | 5 | 0 | 5 | 0 | 0 | 100% | 3.80 | crossed a skeleton defect |
| t06-doorentries | a note on Ana Ruiz's visits to building B1 | 4 | 0 | 4 | 0 | 0 | 100% | 2.75 | crossed a skeleton defect |
| t07 | keep only transfers of 1,000 or more | 5 | 5 | 0 | 0 | 0 | 100% | 2.40 | crossed a skeleton defect |
| t07-wide | production hosts that talk to at least three others | 5 | 0 | 0 | 0 | 5 | 0% | 2.00 | end state unreachable |
| t08 | try a different arrangement, then stop it moving | 6 | 0 | 5 | 0 | 1 | 83% | 2.50 | crossed a skeleton defect |
| t08-transactions | rearranging the transfers graph | 4 | 2 | 2 | 0 | 0 | 100% | 3.75 | crossed a skeleton defect |
| t09 | shade the kept list of researchers by how much each has published | 5 | 0 | 3 | 1 | 1 | 60% | 2.20 | crossed a skeleton defect |
| t09-wide | shade the hosts by peak processor load (wide data) | 5 | 0 | 3 | 2 | 0 | 60% | 3.00 | crossed a skeleton defect |
| t10 | make a third list of what two kept lists have in common | 5 | 0 | 0 | 1 | 4 | 0% | 2.60 | end state unreachable |
| t10-transactions | picking out flagged accounts in Great Britain as a named list | 5 | 0 | 0 | 0 | 5 | 0% | 1.60 | no deciding defect |
| t11 | compare March's rings with April's | 6 | 0 | 6 | 0 | 0 | 100% | 4.67 | no deciding defect |
| t12 | the shortest path from Fantine to Gavroche (Les Miserables) | 5 | 0 | 1 | 0 | 4 | 20% | 2.00 | crossed a skeleton defect |
| t12-doorentries | how are Ana Ruiz and Priya Nair linked? (door entries) | 4 | 0 | 1 | 0 | 3 | 25% | 3.25 | crossed a skeleton defect |
| t12-transactions | trace the money (March transfers) | 4 | 0 | 4 | 0 | 0 | 100% | 4.75 | crossed a skeleton defect |
| t13 | rerun March's analysis on April's transfers | 6 | 0 | 0 | 1 | 5 | 0% | 2.17 | end state unreachable |
| t14 | bring in a saved file and check it arrived whole | 5 | 0 | 5 | 0 | 0 | 100% | 4.60 | crossed a skeleton defect |
| t14-transactions | bring in transfers and the account list (Transfers, March 2026) | 5 | 0 | 4 | 1 | 0 | 80% | 3.20 | crossed a skeleton defect |
| t15 | apply a colleague's recipe | 5 | 0 | 0 | 1 | 4 | 0% | 2.20 | end state unreachable |
| t15-wide | apply a colleague's colors and analysis steps to wide host data | 4 | 0 | 0 | 0 | 4 | 0% | 2.00 | end state unreachable |
| t16 | export a slide-ready picture of the current drawing | 6 | 3 | 3 | 0 | 0 | 100% | 5.33 | no deciding defect |
| t17 | send a colleague's ranking scores to a spreadsheet | 5 | 1 | 4 | 0 | 0 | 100% | 5.20 | no deciding defect |
| t17-transactions | send this month's flagged-accounts spreadsheet (transfers) | 4 | 0 | 0 | 4 | 0 | 0% | 2.25 | end state unreachable |
| t18 | three security spreadsheets into one picture | 7 | 5 | 2 | 0 | 0 | 100% | 5.29 | no deciding defect |
| t18-transactions | bring in transfers plus the account list (Transfers, March 2026) | 5 | 0 | 5 | 0 | 0 | 100% | 3.60 | crossed a skeleton defect |
| t19 | door swipes, one link per pair, then each swipe as a node | 6 | 6 | 0 | 0 | 0 | 100% | 5.83 | no deciding defect |
| t20 | weighting door swipes by count and buildings by height, at import | 5 | 4 | 1 | 0 | 0 | 100% | 6.00 | no deciding defect |
| t20-transactions | weight transfers by how often two accounts trade (Transfers, March 2026) | 5 | 5 | 0 | 0 | 0 | 100% | 3.40 | crossed a skeleton defect |
| t21 | two-line labels on the circle around the bishop | 6 | 0 | 5 | 0 | 1 | 83% | 2.50 | crossed a skeleton defect |
| t21-wide | label each host by its everyday name (wide IT estate sample) | 4 | 0 | 4 | 0 | 0 | 100% | 3.25 | crossed a skeleton defect |
| t22 | size hosts by long-unfixed critical vulnerabilities | 7 | 0 | 5 | 1 | 1 | 71% | 3.29 | crossed a skeleton defect |
| t23 | bring in two wide CSV exports (hosts and connections) | 6 | 5 | 1 | 0 | 0 | 100% | 6.00 | no deciding defect |
| t24 | bring a nested research export in as a co-author and membership network | 7 | 5 | 2 | 0 | 0 | 100% | 4.86 | no deciding defect |
| t25 | split nested memberships into records, keep addresses whole | 5 | 0 | 5 | 0 | 0 | 100% | 4.60 | no deciding defect |
| t26 | bring in a coauthor network and look at one person | 4 | 2 | 1 | 0 | 1 | 75% | 4.00 | crossed a skeleton defect |
| t27 | first open at work, decide what may leave the computer | 3 | 3 | 0 | 0 | 0 | 100% | 4.33 | no deciding defect |
| t28 | add the April transfers, which turn out to be unreadable | 3 | 0 | 0 | 0 | 3 | 0% | 2.00 | end state unreachable |
| t28-doorentries | bring this week's door swipes in alongside March's | 3 | 0 | 0 | 0 | 3 | 0% | 2.00 | end state unreachable |
| t28-lesmis | bringing a colleague's Les Miserables file into graphty | 2 | 0 | 0 | 2 | 0 | 0% | 5.50 | end state unreachable |
| t28-nested | bringing a second nested research export in alongside the first | 3 | 0 | 0 | 1 | 2 | 0% | 2.00 | end state unreachable |
| t29 | get your network into a new, empty project | 3 | 0 | 0 | 1 | 2 | 0% | 2.00 | end state unreachable |
| t30 | keep a view, title it, and step through the kept views | 3 | 0 | 0 | 3 | 0 | 0% | 2.67 | end state unreachable |
| t31 | turn on the Assistant and learn what it would send | 3 | 0 | 3 | 0 | 0 | 100% | 2.33 | crossed a skeleton defect |
| t32 | what happens when the work browser cannot use the graphics card (Les Miserables) | 3 | 0 | 3 | 0 | 0 | 100% | 4.67 | crossed a skeleton defect |
| t33 | find out how the April rerun went, and which month is on screen | 3 | 0 | 0 | 3 | 0 | 0% | 3.00 | end state unreachable |
| t34 | why Valjean looks the way he does, and a ranking that changes nothing | 3 | 0 | 0 | 0 | 3 | 0% | 3.33 | end state unreachable |
| t35 | walk the drawing from character to character with the keyboard | 3 | 0 | 3 | 0 | 0 | 100% | 2.67 | crossed a skeleton defect |
| t36 | what the project looked like before a change (Transfers, March 2026) | 3 | 2 | 1 | 0 | 0 | 100% | 5.00 | crossed a skeleton defect |
| t37 | show one coloring on its own, then hide three characters without changing the counts | 3 | 0 | 3 | 0 | 0 | 100% | 2.00 | end state unreachable |
| t38 | rename the two report groups (Les Miserables) | 3 | 0 | 3 | 0 | 0 | 100% | 3.33 | no deciding defect |
| t39 | leave a note on the Valjean-to-Javert chain as a whole | 4 | 1 | 0 | 0 | 3 | 25% | 5.50 | crossed a skeleton defect |
| t39-doorentries | leave a note on a whole chain (door entries) | 3 | 2 | 0 | 0 | 1 | 67% | 6.00 | crossed a skeleton defect |
| t40 | open a network too large to draw (patent citations) | 3 | 0 | 0 | 0 | 3 | 0% | 1.00 | end state unreachable |

"End state unreachable": no click in the skeleton leads to the screen the task tests. "Crossed a
skeleton defect": the task's grade sheet names a skeleton or study-tool defect that changed what
participants saw or how they rated it. Self-ratings and grades differ often: the participants rated
the whole attempt, including the defects; the grades follow the bar.

### Compared with earlier rounds

Rounds 1 to 6 put still mocks in front of participants, who described what they would click;
round 7 made them click through a skeleton that only partly works. So a fall in ease here mixes a
harder method with the design. Wording also changed: no task repeats round 6's words. The closest
pairs:

| Job | Round 6 (still mocks) | Round 7 (skeleton) | Reading |
|---|---|---|---|
| Who matters most | 0 S, 8 SD, ease 5.00 | t02: 0 S, 6 SD, ease 4.50 | holds; the order is right every time, the route never the designed one |
| What groups are there | 0 S, 7 SD, ease 5.00 | t03: 0 S, 5 SD, 1 F, ease 3.33 | counts and sizes found by all; retuning and members are where it breaks |
| How is one account connected | 0 S, 5 SD, ease 4.60 | t12-transactions: 0 S, 4 SD, ease 4.75 | holds; the Les Miserables and door-entries versions collapse on picking the ends |
| Update with this month's file | 3 S, 3 SD, ease 5.33 | t13: 0 of 6, ease 2.17 | not comparable: the after-Load screen still shows March |
| Redo last week's export | 0 S, 4 SD, 1 F, ease 4.20 | t17-transactions: 4 F, ease 2.25 | not comparable: Export again draws no result |
| Share your setup / a team's look | ease 5.00 / 4.00 | t15: 0 of 5, ease 2.20 | not comparable: Apply adds no rows |
| Top 50 into a spreadsheet | 1 S, 5 SD, ease 5.00 | t17: 1 S, 4 SD, ease 5.20 | holds |
| Keyboard walk | 0 S, 2 SD, 3 F, ease 3.60 | t35: 0 S, 3 SD, ease 2.67 | better outcome (no failure), lower ease: the Data tab shows the wrong person |
| Notes a colleague can attribute | 1 S, 4 SD, ease 4.80 | t05: 5 S, 1 G, ease 5.67 | better: selecting first and the pre-tagged box worked for 6 of 6 |
| Is it OK with our data / did anything leave | ease 4.83 / 4.40 | t27: 3 S, ease 4.33 | holds; the Assistant's missing off switch is new |
| Too big to draw | 2 S, 3 SD, ease 5.40 | t40: 3 G, ease 1.00 | not comparable: the notice cannot be reached |
| Real change or noise | 0 S, 6 SD, ease 4.17 | t11: 0 S, 6 SD, ease 4.67 | holds; the comparison screen reads well, the way to it does not |
| Tree: a picture for the paper | 100% direct | tree 3: 19% direct | **fell**: Export left the main menu |
| Tree: bring in a team's colors file | 0% direct | tree 4: 13% direct | still the main menu's Open... first |
| Tree: next month's file, keeping the setup | 100% direct | tree 13: 63% direct | fell; Replace is found, but after a detour through Open... |

The one clean fall is the picture: in round 6 every participant went straight to File > Export; in
round 7 Export lives only under the project name, and 13 of 16 went to the main menu first and
found nothing.

---

## Part 1: skeleton and study-tool defects (not design findings)

These decided or distorted sessions. Fix them in the skeleton before any task below runs again;
until then the tasks measure the prototype.

### End states no click reaches (18 tasks, 67 sessions)

| Task | What the skeleton does instead | What to wire |
|---|---|---|
| t03-transactions (rings) | Run on Louvain only shows "Would add Louvain ... running" | Run goes to the graph with the Louvain row added |
| t04-transactions (who paid this account) | Find does not match a row id; a node-table row click selects nothing; row then Neighborhood opens Les Miserables | id search, row selection and the directed Neighborhood on the transfers |
| t07-wide (production hosts with 3+ links) | A step the reader builds keeps "all 300 nodes" whatever condition it holds | the step builder applies a typed condition and a degree threshold, or start on the built steps |
| t10 (what two lists have in common) | start screen lacks "Top 9 by degree"; the set's menu opens for Community 3; the tool cannot shift-click | both inputs on the start screen; the menu acts on its row; modifier clicks in the tool |
| t13 (Replace data) | after Load the source still reads March, the filter is gone, Louvain has no out-of-date mark, Rerun opens Les Miserables | the after-Load state with April's name and rows, the filter kept, the marked runs |
| t15, t15-wide (a colleague's recipe) | Apply adds no rows; the hosts recipe is in no file list; opening a recipe redraws the window as Transfers, Cancel lands in Les Miserables | Apply reaches the applied state; the hosts recipe in both pickers; Cancel returns |
| t17-transactions (this month's export) | Export again draws nothing; the project still says March while the button says April | the result row with name, month and count; matching month |
| t28, t28-doorentries, t28-lesmis, t28-nested (files that will not read) | every file door opens a clean canned file; the refusal screens are reachable only by address | the file chooser opens the refused file for each task |
| t29 (fill an empty project) | Add data... opens the door-entries import; the Data rail shows the full Les Miserables graph | Add data asks for the file; the empty project stays empty |
| t30 (save and present a view) | the new view vanishes; Present shows three fixed slides | the new row carries into the list and the deck |
| t33 (how the rerun went) | the failure bar is drawn only on the second route; history and compare say the rerun succeeded | the failed state reachable from the run row; history agrees |
| t34 (why Valjean looks this way) | a click on the Betweenness row leaves PageRank's panel open | a row click opens its own panel; eye toggles persist |
| t37 (hide three) | Hide on canvas always hides Valjean; the next selection unhides him | Hide acts on the selection and stays |
| t40 (too large to draw) | every door opens another dataset; Open recent shows only a passing message | the patent row and Open lead to the notice |

### Defects that changed what participants saw on many tasks

| Defect | Sessions or tasks | Effect |
|---|---|---|
| "Compute the overview" (from the graph's "..." or "Compute on 812") replaces the transfers summary with the Les Miserables one | t01-transactions 6 of 6, t07 5 of 5, t03-transactions 3 of 5, t02-transactions, t33 | named by nearly everyone as the moment they stopped trusting every number |
| The Data place and the loaded transfers carry another task's filter ("amount is at least 1,000", 812 of 3,000) while the start screen says Full graph | 13 transfers tasks | read as a filter the participant's own click had turned on |
| The node table opens on rows 381 to 420, does not return to row 1 after a sort, and the back arrow's tooltip says "the skeleton holds one page" | t01-transactions, t02-transactions 6 of 6, t04-transactions, t10-transactions | the top of any ranking unreachable; the word "skeleton" leaked to participants |
| Clicking any transfers attribute shows "amount" | t10-transactions 5 of 5, t17-transactions, t01-transactions | flagged accounts could not be counted or filtered |
| "Add a table > File..." only shows a toast; "Paste..." replaces the import with Les Miserables; "From a URL..." adds an alerts feed nobody asked for | t14-transactions 5 of 5, t18-transactions 5 of 5, t28-doorentries | every second table arrived by the wrong door; Paste read as data loss |
| Open project or file... on the start screen skips the Data page and opens the finished sample | t14, t28-lesmis, t29, t40 | "did I open my colleague's file or the sample?" |
| Layout changes never redraw; Re-run layout opens the loading screen | t08 6 of 6, t08-transactions 4 of 4 | "looks better" could not be judged |
| Label lines never draw on the canvas | t21 5 of 5, t21-wide 4 of 4 | "if it isn't on the picture it didn't happen" |
| A set's color binding paints the whole table and is labeled Everything's | t09 3 of 3 who bound | three completions read as failures |
| The Size data button pressed with Enter opens "Color from data" | t22 2 of 7 (one failure) | a keyboard user cannot bind size |
| The node Data tab shows Valjean's record for every walked node | t35 3 of 3 | "who each one is" cannot be graded |
| The loaded graph ignores import choices (weight, direction) | t20-transactions 3 of 5 who checked, t20 1 | correct setups read as dropped |
| The path inspector is a fixed route; the result bar totals the other route; new paths take stand-in names | t12-transactions 4 of 4, t12 | two totals for one path |
| A row's "..." and Shift+F10 open the menu for Community 3 whatever is selected | t10 5 of 5, t38 3 of 3, t09, t12-transactions, t37 | actions appear to target the wrong object |
| A note-count bubble or note link jumps to the Les Miserables notes | t06-doorentries 4 of 4, t12-doorentries 3 of 4, t34, t11, t33 | two sessions ended there |
| Fixture contradictions: Weight "value, stronger" in the summary against "none" in the edge table; Everything's fill 6366F1 against gray nodes; "Color (kind)" against "Nothing is colored"; "from miserables.json" against .gexf; "Graph from 2 tables" over three sources; 421 nodes where the report implies 420; the export preview has no PageRank column | t01 7 of 7, t14 4 of 5, and 15 more tasks | each costs trust; one place must own each fact |
| The loading card for door entries never finishes | t18 7 of 7, t19 6 of 6 | the picture was never seen |

### Study-tool limits

- **No typing.** `--type` is silently ignored; participants had to press one key at a time. This
  turned three t39 sessions, one t05 session and one t39-doorentries session into "gave up" with the
  right writing box open, and emptied search boxes in t04-transactions, t06-doorentries,
  t12-doorentries and t12-transactions. The tool should type, or refuse an unknown argument.
- **No shift-click or ctrl-click.** Multi-select (t10, t12, t37) could not be tried.
- **Click by name takes the first match.** "Data", "Column menu", "label", "More" and "flagged" each
  hit the wrong control at least once because two controls share the name. The duplicate names are
  real (findings 7 and 16) but the counts are inflated for sighted participants.
- **Hovering an icon needs its name.** Participants guessed names to read tooltips a real pointer
  would show at once, so icon discoverability counts are inflated.

---

## Part 2: design findings, most severe first

Each finding names its evidence, how many participants did or said it, the routes it concerns,
and a direction. Owner decisions from `../../owner-feedback.md` are marked as such; everything else
is a studio direction, reversible.

### 1. Adding more rows to a loaded table is refused, and the door to it is labeled the opposite way (severity 4, confirmed)

- **Evidence.** Asked to bring a newer export in "alongside" the one loaded (t28, t28-doorentries,
  t28-nested), 9 of 9 described the job as "more rows of the same table" and 9 of 9 found nowhere to
  do it. The Sources "+" says "Add data to this graph" and opens a screen headed "Open as a new
  graph" (`data-page/load-into`); 9 of 9 read the two labels as contradicting each other and took
  the header as the truth; at least 4 cancelled or refused Load because of it. The source's own menu offers
  only Rename, Replace with file..., Edit source..., Refresh, and all 9 rejected Replace as
  destroying the earlier month. In t29 3 of 3 read Add data... as someone else's data replacing
  their project, and 2 of 3 who pressed Load saw the project renamed.
- **The designed state confirms it is design, not wiring.** `data-page/add-matching` -- a file with
  the same columns as a loaded table -- turns Load off and says "loading it adds a second copy of
  transfers ... Replace it, or remove this table". The specification's own Tableau table says
  "'Add to this graph' already appends". The two disagree, and participants' job sides with the
  table.
- **Participants:** 12 sessions, 11 people. **Routes:** `app-b/#/data-page/load-into`,
  `app-b/#/data-page/add-matching`, `app-b/#/data-place/at-rest`, `app-b/#/data-page/refused-empty`.
- **Direction.** The header follows the door ("Add to Transfers"), and the footer's "Load into" is
  visible whenever there is a choice. A file whose columns match a loaded table offers "Add these
  rows to transfers" with a match report for the combined table (new rows, accounts already present,
  new accounts, overlapping dates, repeated rows), as the recurring weekly or monthly job needs.
  Appending rows to a source is a data-loading capability of graphty-element, not app code.

### 2. Select where cannot be found from any place people look for it (severity 4, confirmed)

- **Evidence.** t10-transactions: 5 of 5 gave up picking out flagged accounts in Great Britain as a
  named list; 0 of 5 opened the main menu, where Select where... lives. Where they went instead:
  the table and its column headers 5 of 5, the Selection row 5 of 5 (expecting to make a selection
  there and finding only its highlight color), Add filter 5 of 5, Analyze's "say what to find" 5 of
  5, Views 5 of 5. The two most query-fluent participants described the existing dialog almost word
  for word while failing to find it. Tree task 11: 1 of 16 direct; 3 found it only because they had
  read the main menu on an earlier task; 4 left Create set where... because it takes one attribute.
- **Second half.** 5 of 5 could not say where a named list would be kept: Views reads as "the camera
  and the picture", a filter "hides things", and nothing on the resting screen says named lists
  exist.
- **Participants:** 5 sessions plus 16 tree-test participants. **Routes:**
  `app-b/#/select-where/where`, `app-b/#/main-menu/open`, `app-b/#/graph-place/transfers-loaded`,
  `app-b/#/table-dock/column-menu`, `app-b/#/context-menus/attribute`.
- **Direction.** Offer the same dialog from the places people went: the Selection row ("Select
  where..."), a table column's menu ("Select where country is..."), an attribute's menu (already
  specified as Create set where...), and Find handing a typed rule to it. After a selection exists,
  "Keep as set" should be visible on the selection bar, not only in a menu. One dialog, more doors.

### 3. An exported picture leaves out the legend, and nothing can put it back (severity 4, confirmed)

- **Evidence.** t16: 6 of 6 needed the legend on the slide ("the first question is what do the
  dark ones mean"); 5 of 6 read "Full graph - legend not drawn" and searched Preset, Advanced and
  View for a switch; none exists. The one participant without a graph-tool background skipped the
  gray subtitle and left believing the file matched her screen; the preview is cut off below the
  fold, so it could not have shown her. All five who noticed would rebuild the key by hand, which
  is the chore they said keeps them on their current tool.
- **Participants:** 6. **Route:** `app-b/#/export-dialog/image`.
- **Direction.** Draw the legend into the image by default whenever it is on the canvas, with a
  switch to leave it out, and show it in the preview. If the legend is drawn by graphty-element,
  its image export is where the legend belongs.

### 4. File actions are looked for in the main menu, and the main menu has none of them (severity 3, confirmed)

- **Evidence.** Tree task 3: 13 of 16 opened the main menu first for Export (3 of 16 direct; round 6,
  with Export in a File menu: 16 of 16 direct). Tree task 4: 10 of 16 considered Main menu >
  Open... for a colleague's file and rejected it. First click fc12: 0 of 16 clicked the project name;
  15 of 16 the main menu. Sessions: t16 3 of 6 opened the main menu first; t17-transactions 3 of 4;
  t15-wide 3 of 4 went to the main menu and only 1 of 4 ever found Apply recipe or style file... (by
  exhaustion, "I would never have looked under the file name"). Three participants looked for the
  word "Import", which appears nowhere.
- **Participants:** 16 (tree) + 16 (first click) + 14 sessions. **Routes:**
  `app-b/#/main-menu/open`, `app-b/#/project-menu/open`, `app-b/#/recipe-apply/binding`.
- **Direction (studio decision, reversible).** The owner asked for Export... under the project name,
  as Figma does; keep it there. Figma's main menu also carries the file commands, so the main menu
  gains Save, Export..., Apply recipe or style file... and Version history beside New and Open, or a
  File submenu holding them. Rename the Open... entry's help so it says it opens a new project and
  leaves the current one open.

### 5. Arranging the drawing is only under the graph's Style tab, and the graph's own panel is hard to hold open (severity 3, confirmed)

- **Evidence.** t08: 6 of 6 searched the toolbar, main menu, Analyze, View or Quick actions first;
  0 of 6 found the Layout picker on purpose (two arrived through the Views rail, one through the Data
  rail, one through a reload). Picking the graph in the switcher shows its panel only while the menu
  is open; Escape returns the panel to the selected PageRank row (6 of 6). Quick actions and the
  canvas menu offer only Re-run and Reshuffle seed, which 4 of 6 said are not "a different
  arrangement". Tree task 8: 1 of 16 direct; 4 never reached Method. t08-transactions: 4 of 4 found
  it, but only after a hover on the play button taught them the word "layout"; 3 of 4 said "style
  means colors". The less technical participants praised the plain method names; the experts wanted
  the algorithm's name visible (ForceAtlas2 is an "engine" under "Spread Out").
- **Participants:** 10 sessions + 16 tree. **Routes:** `app-b/#/graph-place/at-rest`,
  `app-b/#/inspector-nothing-selected/layout-method`, `app-b/#/context-menus/canvas`,
  `app-b/#/toolbar/layout-settled`.
- **Direction.** Give the same picker more doors: "Layout method..." in the canvas menu and in
  Quick actions ("arrange" should find it), and from the layout button (a menu or a long press).
  Make the graph selectable as itself (Escape with nothing selected, or a click on empty canvas, shows
  the graph's panel and keeps it). Show the engine's name beside the method once chosen.

### 6. Coloring, sizing and labeling by a value start from controls nobody can see at rest (severity 3, confirmed)

- **Evidence.** The bind icon beside Fill > Color and Size appears only under the pointer or after
  focus: t09-wide 5 of 5 never reached it by the intended path, t09 5 of 5 struggled (three found it
  only by its tooltip, one refused an unnamed icon by their data), t22 4 of 7 met it only by
  tabbing. The attribute panel says "Painted by: No row paints from ..." and offers no action there:
  t09-wide 4 of 5 and t22 3 of 7 wanted the button exactly there; Color by and Size by sit behind its
  "...". The graph's Style tab has no node color or size (t22 7 of 7, t09-wide 5 of 5 went there
  first). The canvas chip "Nothing is colored or sized by a row" names the job and does nothing
  (t22 7 of 7 tried it, t09-wide 5 of 5); "row" is read as a table row (t22 5 of 7). Labels: the
  "+" beside Label is found on a still screen (fc07 16 of 16), but in t21-wide 4 of 4 chose "Show
  labels" first, which adds an unticked box and never asks for a field, because "Label line" means
  nothing to them; the "+" then behaves differently the second time (3 of 4).
- **Participants:** 32 sessions. **Routes:** `app-b/#/style-pickers/bind`,
  `app-b/#/inspector-group-set-path-row/style`, `app-b/#/inspector-attribute-and-filter-step/attribute`,
  `app-b/#/style-pickers/plus-menu`, `app-b/#/graph-place/wide`.
- **Direction.** Show the bind icon at rest with the accessible name "Color from a field" ("Size from
  a field"); put "Color by... / Size by..." on the attribute panel's "Painted by" line; make the chip
  open the Everything row's Style tab; let a section heading open the same menu as its "+". For
  labels, one item "Add a label line" that opens the field list (it starts empty, as the owner
  decided) and turns labels on with it.

### 7. Two controls named "Data" sit side by side (severity 3, confirmed)

- **Evidence.** The rail's Data and the inspector's Data tab: t02 5 of 6, t04 5 of 5, t03 6 of 6,
  t21 4 of 6, t05 3 of 6, t06 3 of 5, t38 3 of 3 aimed at the tab and opened the rail section, which
  also dropped the selection (t04: 4 of 5 never saw Valjean's own record). The study tool's
  first-match click inflates the count for sighted users, but the screen-reader analyst hears "Data"
  twice, and the dropped selection is real.
- **Participants:** about 30 sessions over 8 tasks. **Routes:** `app-b/#/inspector-node/data`,
  `app-b/#/data-place/at-rest`.
- **Direction (studio decision, reversible).** Name the rail place for what it holds. The owner asked
  whether Data is really "Sources" (Tableau's Data Source); the inspector tab can keep "Data". At
  least give them different accessible names.

### 8. The link to how a result was made opens the Analyze catalog (severity 3, confirmed)

- **Evidence.** "from Louvain, Sep 28", "from Analyze" and "Run from Louvain" in a result's header:
  t33 3 of 3, t13 2 of 2, t03 2, t02 1, t11 1 clicked expecting that run's record (inputs, data month,
  when, seed) and got the picker for a new run. In t33 it is the most obvious way to ask "where did
  this come from".
- **Participants:** 9. **Routes:** `app-b/#/inspector-run-row/data`, `app-b/#/inspector-measure-row/style`.
- **Direction.** The provenance link opens the run's own record (its Data tab, Made with), with
  Rerun there. Check against the specification first: if it already says so, this is wiring.

### 9. Path between: the ends cannot be named, and the default answers a different question (severity 3, confirmed)

- **Evidence.** Les Miserables (t12): 4 of 5 never got a name into From or To; the banner says
  "Click a node or set for From", the field says "Type a name", the drawing is not clickable by name
  in the skeleton, and the field shows no list of matching names. Door entries (t12-doorentries): 3 of
  4 selected Ana Ruiz first and found From still empty; opening the form switches the table to Edges
  and blocks it (4 of 4). Part of this is the study tool (no typing) and the skeleton (canvas not
  clickable), but no participant was offered a name list. The Weight defaults to the loaded weight
  ("uses 1/value") while every task asked for as few people in between as possible: 9 of 9 noticed
  and had to find "None", which does not say it counts steps; on the transfers 0 of 4 could say
  what the weight did to the route (round 6 found the same; decided then, still not drawn).
- **Participants:** 13. **Routes:** `app-b/#/path-popover/from-analyze`,
  `app-b/#/path-popover/picking-to`, `app-b/#/path-popover/from-selection`.
- **Direction.** From and To are comboboxes listing matching names as you type, and a selected node
  fills From; the table stays usable while the form is open. Weight offers "None (fewest steps)" by
  name, and a question phrased in hops defaults to it.

### 10. A path's result: the total misleads for money, and the path hides under other paint (severity 3, confirmed)

- **Evidence.** t12-transactions: 4 of 4 rejected the summed total (22,397.82) as "how much passed",
  working out that at most the first hop (3,530.28) can have traveled the whole way; 3 of 4 could not
  tell whether another route existed. The orange path matched a community color and could not be
  found (4 of 4; the community coloring itself is a skeleton leak). Les Miserables: a finished path
  is "Covered for Color by PageRank" (t12 3 of 5).
- **Participants:** 7. **Routes:** `app-b/#/inspector-group-set-path-row/path`,
  `app-b/#/path-popover/found`.
- **Direction.** For a flow, show the most that can have passed (the smallest hop) beside the sum,
  and say when other routes tie. A selected path draws above the paint that covers it.

### 11. A selected group's members cannot be seen or listed (severity 3, confirmed)

- **Evidence.** When another row owns color, selecting a group lights nothing: t03 6 of 6 never saw
  the 25 members of the biggest community; t06 5 of 5 picked Community 3 as Myriel's circle only
  because an older note said so; t21 6 of 6 guessed which group holds the bishop; t38 3 of 3 named
  groups from the full 77-row table; t02 1 (the Watchlist). The table does not narrow to the selected
  group, and "Paints 25 nodes" selected 5 in three sessions (unverified, possibly wiring).
- **Participants:** 21. **Routes:** `app-b/#/inspector-group-set-path-row/community-3`,
  `app-b/#/graph-place/at-rest`.
- **Direction.** The Selection layer is pinned on top by the owner's decision; it should outline
  selected members whatever paints their fill. A group's panel lists its members (or opens "Show
  members in table" in one click), and a node's panel names its groups.

### 12. Combining sets needs two selected rows, and nothing teaches how to select two (severity 3, confirmed)

- **Evidence.** t10: 4 of 5 clicked a second row and saw it replace the first; 2 would have tried
  Ctrl-click "but nothing tells me that works"; the hint "Shift-click or Ctrl-click adds a row" appears
  only once two rows are selected. Same in t37 (3 of 3 could not gather three characters) and t12 (1).
  The study tool cannot modifier-click, so confirm with a real pointer. The operation words (Union,
  Intersect, Subtract, Exclude) were recognized by 5 of 5, and the result's "Made with" block was
  praised by 5 of 5.
- **Participants:** 9. **Routes:** `app-b/#/context-menus/row`, `app-b/#/graph-place/at-rest`.
- **Direction.** Teach multi-select where it is needed: "Combine with..." offers a picker for the
  second row when only one is selected, and the hint appears on the first selection.

### 13. Import reports stop one line short of the check people make (severity 3, confirmed)

- **Evidence.** After joining two tables, "every row has both ends" was read as "no blank cells", not
  "every account matched": t14-transactions 5 of 5, t18-transactions 2 of 5, t23 1 of 6, t13 3 of 5
  on Replace. Door swipes (t18): 7 of 7 read "3 keys differ only by leading zeros (not merged)" and
  looked for a way to merge them (role menu 5, the "#" type mark 3); none exists, and the line gives
  no row count, so 3 of 7 wrote a guessed number into their answer. 5 of 7 wanted the 32 unmatched
  rows out as a list for the data owner. "1 repeated key (kept the first)" silently drops a second
  badge (3 of 7). The tables focus group gave unmatched rows (6 of 6) and leading zeros (6 of 6)
  severity 4.
- **Participants:** 21 sessions + 6 in the focus group. **Routes:** `app-b/#/data-page/entries`,
  `app-b/#/data-page/unmatched-rows`, `app-b/#/data-page/edit-accounts`, `app-b/#/data-page/replace`.
- **Direction.** Every link line says how many keys were found in the table it points at ("9,113 of
  9,113 from_account found in accounts"). Leading zeros get a rule the reader can switch on (treat as
  equal without rewriting the ids), with the rows it affects. Unmatched rows stay reachable after
  Load and can be exported. A repeated key shows what was dropped.

### 14. The first picture of a new import cannot show what was imported (severity 3, confirmed)

- **Evidence.** Two node types and three edge types arrive as identical gray dots and lines: t24 7 of
  7 could not tell researchers from institutions (one invented a wrong reading); t18-transactions 5
  of 5 could not see the three account kinds though "kind" was listed as Color; t26 4 of 4 found no
  names on a 12-node graph.
- **Participants:** 16. **Routes:** `app-b/#/graph-place/nested`, `app-b/#/graph-place/plain-json`,
  `app-b/#/graph-place/transfers-loaded`.
- **Direction.** When a graph has more than one node or edge type, the default paint tells them
  apart (as a suggested layer the reader can remove, per the owner's "unopinionated styling"), and
  small graphs show names by default.

### 15. Nested import: membership is off by default, and an unwanted table cannot be left out (severity 3, confirmed)

- **Evidence.** t24: 7 of 7 had to find that researchers' affiliations (242 records whose
  institution_id all resolve) are kept as one value by default, while the "Makes" line already reads
  as if institutions were connected; the expert six caught it by domain knowledge, the first-time user
  by a word match. 7 of 7 wanted to leave the "links" table (visited, reviewed for) out of a
  membership picture; its checkbox has no name or tooltip and 6 of 6 who tried failed. The option that
  makes edges is "Several rows" while "Several edges" is disabled (5 of 7 hesitated). t25: the
  Data panel's "Read as..." returns to the panel it came from (2 of 5), and the inspector says "open it
  on the Data page" while on the rail place called Data (2 of 5).
- **Participants:** 12. **Routes:** `app-b/#/data-page/json-tree`, `app-b/#/data-page/json-array-menu`,
  `app-b/#/data-page/edit-json-researchers`, `app-b/#/inspector-attribute-and-filter-step/nested-field`.
- **Direction.** A list of records whose ids all resolve to another table is offered as edges, flagged
  in the report; a table's include box has a name ("Include links") and says whether excluding drops
  or only hides; "Several rows" says it makes edges when it does. "Read as..." opens the place where
  the reading changes.

### 16. Several unlabeled "..." buttons answer to the same name (severity 3 for screen-reader users, 2 otherwise; confirmed)

- **Evidence.** The row's, the inspector's and the table's "..." look alike; two share "More
  actions". t17 4 of 5 opened the wrong one first (the screen-reader analyst heard "more actions, more
  actions" and landed in a menu with Delete); t13 6 of 6 hit the inspector's menu (with Clear graph
  data) before the source row's; t22 every table column's chevron is "Column menu" with nothing tying
  it to its column.
- **Participants:** about 20. **Routes:** `app-b/#/table-dock/column-menu`,
  `app-b/#/data-place/at-rest`, `app-b/#/table-dock/table-options`.
- **Direction.** Each "..." names its owner ("PageRank actions", "Graph actions", "Actions for
  transfers-2026-03.csv", "country column menu").

### 17. "4 more readings not computed" opens a general menu next to Clear graph data (severity 3, confirmed)

- **Evidence.** t01 7 of 7 clicked it; 2 refused to go further and never got the readings, because
  the menu has "Clear graph data" in it and "Add node..." under the pointer. t01-transactions 6 of 6,
  t03-transactions 5 of 5, t02-transactions 2 of 6, and "Compute on 812" (t07 5 of 5) open the same
  menu. The specification sends the link to that menu at Compute the overview, so this is the design.
- **Participants:** 25. **Routes:** `app-b/#/inspector-nothing-selected/overview`,
  `app-b/#/context-menus/graph`, `app-b/#/inspector-nothing-selected/filtered`.
- **Direction.** The link computes the four readings in place (they are cheap at this size; costly ones
  state their cost first). "Compute on 812" does the same on the filtered graph. Destructive commands
  leave the menus reached from read-only links.

### 18. A filter's scope does not reach every count, and narrowing offers no recompute (severity 3, confirmed)

- **Evidence.** An edge filter (t07): 5 of 5 found Nodes "812 of 3,000" beside Edges "9,113", which
  the state bar does not flag; no count of transfers left anywhere; the Edges table stays on all 9,113
  with no switch. 5 of 5 noticed the stale-readings line on their own and praised it. Filter to
  neighbors (t04): 5 of 5 found the table, legend and rank ("#1 of 77") unchanged and nothing offering
  to recompute on the 37, so the task's "every number describes only them" felt unfinished to all.
- **Participants:** 10 (+6 noticed the same mixed scope in t01-transactions). **Routes:**
  `app-b/#/data-place/one-step`, `app-b/#/inspector-nothing-selected/filtered`,
  `app-b/#/selection-bar/filtered-to-neighbors`, `app-b/#/table-dock/transfers`.
- **Direction.** Edges read as a part of a whole after an edge filter, and the step counts edges as
  well as nodes; the table follows the filter or offers the switch beside its label; a neighbors filter
  offers "Compute on 37" like the stale-readings bar.

### 19. Filter conditions: a known category takes free text, and degree cannot be a threshold (severity 3, confirmed)

- **Evidence.** t07-wide: 5 of 5 met a blank text box for environment though its three values are
  known (prod 187, staging 67, dev 46); 4 would have typed "production" and matched nothing. Degree is
  missing from "By an attribute or computed value" (3 of 3 who looked); it appears only under "Top of a
  computed value". Clicking a value row ("prod, 187 hosts") does nothing (3 of 5 expected "keep only
  these").
- **Participants:** 5. **Routes:** `app-b/#/inspector-attribute-and-filter-step/wide-filter`,
  `app-b/#/data-place/wide-filters`, `app-b/#/inspector-attribute-and-filter-step/attribute`.
- **Direction.** A category condition picks from its values with counts; computed values (degree,
  in and out) are listed in the field picker; an attribute's value rows offer "Filter to this value".

### 20. Notes: no time a record can use, the empty author is silent, and counts disagree (severity 3, confirmed)

- **Evidence.** Focus group on notes: 6 of 6 raised, unprompted, that "2 h ago" and "Yesterday"
  cannot go into a case file or lab notebook; they want date and clock time, with edits keeping the
  original time. Sessions: 5 of 6 in t05, 4 of 5 in t06, 3 of 4 in t39 said a colleague could not
  tell who wrote a note, and nothing said a name can be set. The Graph list's "Notes 4", the panel's "1
  note" and the Notes list's seven disagree (t05 4 of 6; t39 1 of 4). A saved note is invisible from
  its subject (t05 4 of 6: nothing on Valjean or his Style tab).
- **Owner decisions in force.** Each note records its author and time; the author comes only from
  Settings, will usually be empty, and is shown only when a project holds notes by more than one
  author; time and target are required metadata.
- **Participants:** 15 sessions + 6. **Routes:** `app-b/#/notes-place/all`,
  `app-b/#/notes-place/writing`, `app-b/#/notes-place/two-authors`, `app-b/#/graph-place/at-rest`.
- **Direction (studio).** Show the stored date and time on every note (relative words can stay as a
  hover); when no author is set, the writing box says so once, quietly, with a link to Settings,
  without asking for a name. One count of notes, named for what it counts. The subject's panel lists
  its notes.

### 21. A note can land on the wrong subject with only a small chip to warn (severity 3, confirmed; 4 if the table's selection is not followed)

- **Evidence.** Door entries (t06-doorentries): 4 of 4 picked the 1001 to B1 row in the table, pressed
  N, and got a writing box tagged with the whole graph; all 4 caught it by the chip, 3 of 4 said in a
  hurry they would have saved it there. (The table row click is unwired in the skeleton, which is half
  of this.) Add note with nothing selected attaches to the whole graph silently (t06 5 of 5); opening
  the Notes place dropped a selected group so the note went to the graph (t06 1); the chip has only an
  "x", no way to pick another subject. The chip itself worked every time it was read: the subject
  guard is good, the defaults around it are not.
- **Participants:** 9. **Routes:** `app-b/#/notes-place/writing`, `app-b/#/table-dock/edges`,
  `app-b/#/inspector-edge/door-pair`.
- **Direction.** N follows the table's selection like the canvas's; the writing box lets the reader
  change its subject; a note about the whole graph says so in words, not only in a chip.

### 22. Notes on a path: the tag does not say it is a path, and opening a note switches the path off (severity 2, confirmed)

- **Evidence.** t39 3 of 4 and t39-doorentries 2 of 3: a path chip ("Valjean to Javert") differs from
  two person chips only by an icon; other chips read "Ana Ruiz . person", "B1 . building". Spoken
  aloud the two are nearly the same. The notes focus group agreed 6 of 6 after prompting (one voice
  unprompted) and asked for a hop count and the middle stop ("via B1"); links are spelled " -- ", " ->
  " and "to". Opening Add note from the path turns the path's coloring off (t39-doorentries 3 of 3: "did
  my note break the coloring?"). Writing a note on the path was otherwise direct for 7 of 7.
  First click fc01: the built-in Notes row drew 4 of 16 for a note about a community.
- **Participants:** 7 sessions + 6 + 16. **Routes:** `app-b/#/inspector-group-set-path-row/path-door-entries`,
  `app-b/#/notes-place/door-entries`, `app-b/#/graph-place/at-rest`.
- **Direction.** Chips read "<name> . path" (and the hop count); one spelling for a link; the canvas
  keeps showing what is being annotated while the note is written.

### 23. Hidden, covered and switched off are not told apart (severity 3, confirmed)

- **Evidence.** "1 hidden row still paints" read as a contradiction or a bug at first sight: t34 3 of 3,
  the paint focus group 4 of 5 independently (three named it as a reason to quit), t02 1. Why this
  look lists only the rows that won, so a covered ranking is invisible on the node (t34 3 of 3 went
  there for it); PageRank's panel says "Covers Louvain for Color" but not Betweenness, which it also
  covers (3 of 3 took the omission as proof their correct theory was wrong). Why this look itself was
  praised by 3 of 3. The focus group's sharpest point: the missing Degree row and the "hidden row
  still paints" line are the same thing, and no participant connected them.
- **Participants:** 4 sessions + 5. **Routes:** `app-b/#/graph-place/show-hidden`,
  `app-b/#/inspector-node/why-this-look`, `app-b/#/inspector-measure-row/covered`.
- **Direction.** Two words for two things: "hidden from the list" and "off" (the eye). Why this look
  lists covered rows under the winner ("Betweenness, covered by PageRank"); "Covers ..." names every
  covered row; the canvas legend names what lost a channel.

### 24. Communities: resolution has no direction, and the April run is invisible until compared (severity 3, confirmed)

- **Evidence.** t03: nothing says which way resolution gives fewer, larger communities (4 of 6 asked;
  Gephi and NetworkX use opposite conventions, and the Gephi user typed 2); clicking the value marks the
  run changed without showing the new value (3); "Update Louvain row" put a typed 0.5 back to 1.0
  (1, possibly wiring). t11: 6 of 6 went to the project menu first; April's data and run appear only
  inside the comparison ("somebody already loaded April", 6 of 6); April's run settings cannot be
  checked (4 of 6); the agreement measure is unnamed (5 of 6); the size list has no change or percent
  column (6 of 6). The comparison screen itself was read correctly by all six, and the rerun band was
  praised. Transfers rings (t03-transactions): "ring" finds nothing in Analyze (2 of 5).
- **Participants:** 12. **Routes:** `app-b/#/inspector-run-row/all-options`,
  `app-b/#/full-canvas-modes/comparison`, `app-b/#/graphs-switcher/many`, `app-b/#/analyze-popover/search-groups`.
- **Direction.** Resolution says "lower: fewer, larger groups" and previews the count; a graph or run
  that exists appears in the switcher and the run list before comparing; the comparison shows both
  runs' settings, names its measure (adjusted Rand or NMI) and adds a change column and the members who
  joined or left.

### 25. Count measures do not say what an edge is (severity 3, confirmed)

- **Evidence.** t02-transactions: 6 of 6 asked unprompted whether "Links in (count) -- how many edges
  come into each node" counts transfers or distinct senders; only 2 found the import report's line "No
  two transfers share both ends" that answers it, and both wanted it beside the measure. The Measure
  dropdown offers no distinct-neighbor count. t07-wide 4 of 5 asked the same of "talks to three
  hosts" on a directed graph; t26 1 ("3 neighbors" vs "3 connections").
- **Participants:** 11. **Routes:** `app-b/#/analyze-popover/link-counts`, `app-b/#/analyze-popover/transfers`.
- **Direction.** The measure's form says in one line what an edge is in this graph ("each edge is one
  transfer; 0 pairs repeat"), and a distinct-neighbor count is offered where edges repeat.

### 26. Import choices that change the edges do not move every count, and some are dropped silently (severity 3, confirmed)

- **Evidence.** t19: turning "Each row is" to a node removes One edge per Pair and the count weight with
  no message (5 of 6 noticed; switching back restores Row and no weight). t20-transactions: with
  Undirected, the report says "9,113 edges become 9,087" while the header, the next line and the
  loading card say 9,113 (5 of 5 asked "which is it?"; part skeleton). Merging both directions of a
  pair is possible only by making the whole graph undirected (5 of 5 raised it; 2 kept Directed and
  lost the merge). Pre-set weights (count, floors, bytes) are accepted but read as unexplained guesses
  (t20 5 of 5, t23 6 of 6). The setups themselves worked: 6 of 6 chose Pair at once, 5 of 5 praised
  "Weight moved from amount to count".
- **Participants:** 22. **Routes:** `app-b/#/data-page/entries-pair`, `app-b/#/data-page/entries-as-nodes`,
  `app-b/#/data-page/weight-moved`, `app-b/#/data-page/wide-hosts`.
- **Direction.** Every count on the screen follows a choice that changes it; switching a mode that
  cannot keep a setting says what it set aside and restores it on the way back; Pair offers "either
  direction" while keeping edges directed; an "auto" weight says why it was picked.

### 27. Recipes: the dialog's count does not say what it counts, and a set's landing is shown only after Apply (severity 3, confirmed)

- **Evidence.** t15: 5 of 5 asked "four of what?" at "4 of 4 matched by name and type" above six rows;
  Show all answered it. 5 of 5 asked "whose 19 accounts?" at the Watchlist row, which says how many
  the file brings but not how many exist in the open data (the applied state shows "7 of 19"). t15-wide:
  the dialog should say which project it applies to (4 of 4 checked the title bar after every file
  action). "Leave unbound" was jargon (1). The preview before Apply was praised by every participant who
  saw it.
- **Participants:** 9. **Routes:** `app-b/#/recipe-apply/binding`, `app-b/#/recipe-apply/mismatch`,
  `app-b/#/recipe-apply/wide-mismatch`.
- **Direction.** The count names its unit ("4 of 4 columns matched"); a set row states its landing
  before Apply ("19 accounts, 7 in this data"); the dialog's title names the open project.

### 28. Exporting a table: no column choice, and the preview cannot show what goes out (severity 3, confirmed)

- **Evidence.** t17: 5 of 5 exported every column because there is no column picker; the preview's header
  is cut off and cannot be scrolled, so 5 of 5 could not confirm the ranking was in the file; "Export
  table as CSV..." exports the whole graph in file order, not the table as shown (2); export is not on
  the result's own menu (4 of 5 looked there first). Nothing says who made a result, so "my colleague's
  ranking" was a guess (5 of 5; partly the task's wording). t17-transactions: Recent exports and "Export
  again, on April data" were recognized at once by 4 of 4 and are the right idea; the design does not
  yet say what the reader sees after pressing it, nor what scope or filter last month's file used.
- **Participants:** 9. **Routes:** `app-b/#/export-dialog/data`, `app-b/#/export-dialog/recent-exports`,
  `app-b/#/table-dock/table-options`.
- **Direction.** Columns on the Data export, defaulting to the table's visible columns when opened from
  the table; a wrapping header in the preview; "Export values..." on a result row's menu; a Recent
  exports row states its scope, filter, month and count, and Export again adds a new named row.

### 29. The Assistant cannot be switched on or off as such (severity 3, confirmed)

- **Evidence.** t31: "Turn on in Settings" leads to a page with no On; 3 of 3 hunted five to eight steps
  and the panel still said Off. t27: 3 of 3 read the Privacy page's Assistant line and looked for an
  Off; the only route was "Forget all keys", "off by accident" until someone pastes a key; 2 asked for a
  switch an administrator can see or lock. The two pages describe the payload differently ("a summary
  of the graph" against "node names and statistics"; 3 of 3), and "statistics" is never defined. The
  data question itself was answered correctly by 6 of 6.
- **Participants:** 6. **Routes:** `app-b/#/settings/assistant`, `app-b/#/settings/privacy`,
  `app-b/#/assistant-place/no-provider`.
- **Direction.** One explicit Assistant switch (Off by default, as it is), with the provider below it;
  one sentence for what is sent, the same on both pages, naming what "statistics" covers.

### 30. Version history: entries carry no when or who, and the start screen disagrees with it (severity 3, confirmed)

- **Evidence.** t36: Version history was found in one click by 3 of 3 and "View only. Restore adds it as
  a new version" was understood at once; but most entries have no date and none says who acted (3 of 3
  graded themselves down for it), and the start screen shows the March result under "Transfers, March
  2026" while the history marks April as current (3 of 3; partly two states drawn separately). Clicking
  a log row leaves the history (1). In t33, 2 of 3 looked in the history first for a run's status.
- **Participants:** 6. **Routes:** `app-b/#/full-canvas-modes/version-history`,
  `app-b/#/full-canvas-modes/past-version`.
- **Direction.** Every entry states when and, when an author is set, who; a row opens its details
  inside the history; the title and the start screen name the current version.

### 31. The GPU page answers the wrong question (severity 3, confirmed)

- **Evidence.** t32: 3 of 3 reached Settings > Performance and read the policy correctly (no silent
  switch to the CPU; praised by all three). None could answer how much slower the processor is or
  whether results differ, because the page does not say; "Sampled above 2,000 nodes" read as a bigger
  risk than speed (3 of 3); on a small graph the status says "Idle, below the threshold", which answers
  "is this graph big enough", not "does this browser have a GPU" (3 of 3); a run never says where it ran
  or whether it was exact (3 of 3). Everyone tried the lightning icon first (it is Quick actions).
- **Participants:** 3. **Routes:** `app-b/#/settings/performance`, `app-b/#/settings/performance-gpu-unavailable`.
- **Direction.** Status leads with the device ("This browser has no WebGPU"); the page says results are
  the same on CPU and GPU and gives a rough speed cost by size; a run's Made with records engine and
  exact or sampled.

### 32. The keyboard walk is found only on the shortcut sheet, and walks by screen position (severity 3, confirmed)

- **Evidence.** t35: 3 of 3 pressed plain arrows and saw "Arrows orbit the camera"; Tab reaches one node
  and leaves; only the "?" sheet named Shift+Arrows. Once found the walk worked (name and count each
  step). 2 of 3 asked to walk along links rather than screen position, which means nothing without
  sight of the layout; the inspector resets to Style on every step (3 of 3).
- **Owner decision in force.** Shift+Arrow walks; plain arrows orbit in 3D and pan in 2D.
- **Participants:** 3. **Routes:** `app-b/#/inspector-node/why-this-look`, `app-b/#/commands-and-search/shortcuts`.
- **Direction.** The orbit notice names the walk key; a second walk mode follows links; the inspector
  keeps the tab the reader chose while walking.

### 33. Renaming and showing one row alone have no visible door (severity 3, confirmed)

- **Evidence.** t38: 3 of 3 found no Rename on the row or panel; a second single click did nothing;
  all three learned F2 from a grayed item in a menu opened for another row. Nobody tried a double-click,
  which the owner chose and the skeleton supports, so the owner's gesture is untested, not failed. t37:
  "show only this row" exists only as Alt-click or Alt+Space in the eye's tooltip (3 of 3 found it by
  hovering; 2 looked in the row menu first), and a solo on the row already on top changes nothing
  visible and says nothing in words (3 of 3).
- **Participants:** 6. **Routes:** `app-b/#/graph-place/rename`, `app-b/#/graph-place/solo`,
  `app-b/#/context-menus/row`.
- **Direction.** The row's tooltip names both gestures ("Double-click to rename"); "Show only this" in
  the row menu; a solo states itself in the list ("Showing only PageRank -- Show all"). Rerun t38 with a
  real pointer.

### 34. A saved view keeps only the camera, and people expect it to keep the look (severity 3, confirmed)

- **Evidence.** t30: 3 of 3 saved an angle that "tells the story" and expected its coloring to come back
  with it; the inspector's "Keeps: Camera" appears only after saving. (Losing the view itself and Present
  starting on 2 of 3 are skeleton.) Saving and presenting were found by 3 of 3 at once.
- **Participants:** 3. **Routes:** `app-b/#/views-place/saving`, `app-b/#/views-place/at-rest`.
- **Direction.** Say what a view keeps when saving ("Keeps the camera; colors follow the rows"); decide
  in the specification whether a view may keep its paint. Present starts on the first view.

### 35. A layout rated too slow for the graph runs on one click (severity 3, confirmed)

- **Evidence.** t08-transactions: 2 of 4 (the two less technical participants) clicked Natural Grouping,
  rated for 2,000 nodes, on a 3,000-node graph; it applied at once; the warning ("the canvas stops
  responding") is only in a tooltip on a gray number, and one read the clock mark as "recent". Methods
  that need an input (Rings from a Node, Columns by Group) apply without asking for it (3 of 4). The Size
  column was the best-liked part (4 of 4).
- **Participants:** 4. **Routes:** `app-b/#/inspector-nothing-selected/transfers-methods`.
- **Direction.** An over-rated method asks first, naming the graph's count; the mark reads "slow" in
  words; a method that needs an input asks for it.

### 36. A graph's standout number cannot be followed to its node (severity 3, confirmed)

- **Evidence.** t01-transactions: 6 of 6 named "Highest total degree 907" as the thing that looks off, and
  6 of 6 could not learn which account it is. The table opening mid-list (also 6 of 6) is partly the
  skeleton's single page; opening a sorted table anywhere but its top is design.
- **Participants:** 6. **Routes:** `app-b/#/inspector-nothing-selected/transfers`, `app-b/#/table-dock/transfers-nodes`.
- **Direction.** Extremes in the summary are links that select the node; the table opens at its top.

### 37. Long names lose the part that tells them apart (severity 2, confirmed)

- **Evidence.** Middle truncation hides the distinguishing words: t23 6 of 6
  ("vuln_count_critical...iated_over_30_days" against "patch_pendi...ical_count"), t22 4 of 7, the wide
  focus group 4 of 5, t24 tree names ("data...affiliations"), t28-nested ("network-export-2026-0...").
  Nobody chose a wrong column because of it, but every one slowed.
- **Participants:** 17. **Routes:** `app-b/#/data-page/wide-find-column`, `app-b/#/data-place/attributes-wide`.
- **Direction.** Keep the leaf and the differing part visible (truncate the common prefix), and give the
  full name on hover and to assistive technology.

### 38. Icon-only selection bar (severity 2, confirmed; owner decision in force)

- **Evidence.** The bar over the canvas: t04 3 of 4 guessed two to four names before "Neighborhood"; t05
  5 of 5 hovered before Add note; t26 3 of 3. The owner decided the toolbar carries icons with tooltips
  after a hover delay. The guessing is inflated by the study tool; first click found the route icon 16 of
  16 on a still screen.
- **Participants:** 12. **Routes:** `app-b/#/selection-bar/one-node`, `app-b/#/selection-bar/two-nodes`.
- **Direction.** Keep icons only; give each a tooltip naming the action and its key, and shown on focus
  as well as hover.

### Findings at severity 2 or below (grouped)

- **Neighborhood preview names no neighbors and dims nothing** (t04 4 of 5); "Add as steps" means nothing
  (4 of 4).
- **"Edit" titles a screen opened only to look** (t01, t14 5 of 5 hesitated; Apply being off reassured).
- **The edge table shows ids, not names** (t06-doorentries 4 of 4 looked up 1001 in the Nodes tab).
- **Present has no legend** (t30 1); **the export toast does not name the size** (t16 1).
- **Two pixel widths in Advanced disagree** (t16 2 of 6: 1,802 against 2,055).
- **Compare graphs... offered with one graph** (t28-nested 2 of 3).
- **Columns picker looks like the attribute list but only toggles columns**, and Escape closes the table
  with it (t22 5 of 7).
- **Escape steps back one level in Analyze and the popover covers the Table toggle** (t02-transactions 4
  of 6, t03-transactions 5 of 5).
- **"Clear graph data" sits in everyday menus** (remarked by participants in t01, t03-transactions, t08,
  t13, t15; never pressed).
- **"Local only" says nothing until opened** (t18 3 of 7, t26 2 of 4, t27: its tooltip "Change this in
  Settings > Privacy" made one participant think local-only could be turned off).
- **Telemetry opt-in: all three declined on the masked session replay** (t27 3 of 3). The list did its
  job -- they decided with the facts. The owner's decision stands; this is information, not a defect.

---

## Focus groups

- **Notes on paths and their tags** (`focus-groups/fg-notes.md`, 6 participants): relative times only
  (6 of 6, unprompted, severity 3); no author (6 of 6, ranked differently); the path tag must say it is a
  path, with hops and the middle stop (6 of 6 after prompting); a note should keep the run it came from,
  as the existing "Earlier run" note does (5 of 6). Discount: steered agreement on the path tag; three of
  six work where notes become evidence.
- **Importing several tables** (`focus-groups/fg-tables.md`, 6): rows left out at Load must survive Load
  (6 of 6, severity 4); leading zeros need a rule that treats ids as equal without rewriting them (6 of 6,
  severity 4); save the setup and rerun it next month (5 of 6, the most common reason to quit). The summary
  line is the most trusted thing on the screen. Discount: the test data was built with these problems and
  the report listed them.
- **Stacked paint** (`focus-groups/fg-paint.md`, 5): "hidden still paints" reads as a bug (4 of 5
  independently, severity 4); the size row is the hidden row, which nobody connected; the result that lost
  a channel is invisible, and all five want it named in the canvas legend. The legend was praised by all
  five. Discount: four opened round 2 agreeing with one expert on Degree; nobody clicked Show hidden rows.
- **Very wide data** (`focus-groups/fg-wide.md`, 5): the fill percentage is unlabeled (5 of 5); the Size by
  picker lists unusable columns first (5 of 5; the specification says last, so a skeleton defect);
  defaults look accidental (5 of 5); middle truncation hides the difference (4 of 5); the search rule is
  invisible (5 of 5). Discount: the "nobody types that" pile-on reacted to a scripted query.

## What worked (behavior, several participants)

- **The match report and the "Makes" line**: the reason people trusted every import (t18 6 of 7 had the
  answer before looking for it; t24 7 of 7 reconciled 510 + 242 + 160; t14 5 of 5).
- **Several tables into one graph**: 18 of 18; Pair at once (t19 6 of 6); Subtype's counts (t18-transactions
  5 of 5).
- **The comparison screen with its rerun band**: read correctly by every participant who reached it (t11 6
  of 6, t33 2 of 2, t36 3 of 3).
- **Why this look** answered "why does he look like this" on the first click (t34 3 of 3).
- **The subject chip on a new note** stopped every wrong-subject note it was read for (t06, t06-doorentries,
  t39).
- **Replace with file...** was each participant's own word for the job (t13 6 of 6 who saw it; 5 of 6 found
  it) and "every role carried over" the most praised line.
- **"(full graph)" in column headers**, the stale-readings line, and the filter step's sentence ("keeps the
  transfers that pass and the accounts at their ends").
- **Privacy statements**: "Local only", "Assistant: Off. Nothing is sent.", "Saved to this computer only;
  nothing is uploaded" were named by most participants on the bank and security data as the first question
  answered.
- **Still screens**: 212 of 224 first clicks right.

## What round 8 must do first

1. **Fix the skeleton before testing.** Wire every end state in Part 1's first table, and remove the
   defects in its second table; most are a route pointing at another dataset's state. Then `--try` each
   task's designed path to its last screen as a gate.
2. **Give the study tool typing and modifier clicks**, or have it refuse unknown arguments.
3. **Rerun, unchanged in wording,** the 18 tasks whose end state was unreachable, so their designs are
   measured for the first time.
4. **Answer the three severity-4 design findings** (appending rows, Select where's doors, the legend in
   exports) and the file-menu finding in the specification, and test them in round 8 on two domains with
   wording that does not use the controls' words.
5. **Make the success bar measurable**: report "with difficulty" separately (it is 66% of successes), and
   fix the denominator of the first-click "Rows with notes" rule.
