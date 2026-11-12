# Digest: the eight simulated study rounds on the graphty app mocks

What this is: a condensed record of the design study that ran eight rounds (2026-09-27 to
2026-10-02) on mock-ups of the graphty app, so later work can resume without re-reading ~1,700
files. Every participant in every round was SIMULATED (an LLM playing a persona); no real user has
seen any of it.

Path shorthand used below:

- `S/` = `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/`
- `P/` = `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/`

Key files: per-round synthesis `S/round-N/insights.md`; round 8 tier 1 grade sheets
`S/round-8/sessions/grades-r8-tNN.md`; decisions and targets per round `S/decision-log.md`
("## Round 8" at line 734); owner rulings `P/owner-feedback.md`; the clickable skeleton and its
study tool `P/app-b/` and `P/app-b/README.md` ("Checking routes", line 672).

Status at hand-off: round 8 was the last completed round. Fixes for round 9 were made in the
skeleton and then round 9 was stopped so the team could build the real app instead (commit
67ffd3a77, 2026-10-02, "mock fixes made before round 9 was stopped for the real-app build"). So the
round 8 findings are the latest evidence, and the round 8 decisions (below) are the latest intended
design. Some are in the skeleton; none has been re-tested.

---

## 1. The study method as it ended up (round 8)

### Four methods per round

1. **Tree test** -- participant reads only a text outline of the navigation (`S/round-8/tree.md`)
   and picks where they would do a job. Key and wording rules in `S/round-8/tree-test.md`.
   Correct = final pick is an accepted location; direct = correct with no level opened and left.
   Each answer file records path, backtracks, final pick, confidence 1-7. Task order randomized per
   participant. Answers and grades in `S/round-8/tree-test/` (one file per persona + `grades.md`).
2. **First click** -- one click on a still render of the skeleton per prompt
   (`S/round-8/first-click/`, `grades.md`). Icon-only targets were checked by hovering in the
   skeleton.
3. **Think-aloud sessions** -- participant clicks through the clickable skeleton `P/app-b/` using
   the study tool `node app-b/study.mjs --try <out.png> <route> --click ... --hover ... --type ...`
   and narrates. One file per session `S/round-8/sessions/<task>--<persona>.md`, one grade sheet per
   task `grades-<task>.md`. Renders in `P/tmp/round-8-sessions/<task>--<persona>/`. Task start
   screens in `P/shots/tasks/<id>/01.png ...`.
4. **Focus groups** -- six simulated personas, three discussion rounds (what they see; respond to
   each other; what makes them quit/switch). Weighted below behavior. `S/round-8/focus-groups/`.

### Personas (21 in round 8)

Files in `S/personas/` (composites built from public sources and the designloom persona records).
**First-time personas (six, reported separately for tier 1):** explorer-elena (product manager,
first-time graph user), recipe-recipient "Tom" (lab manager who only opens shared files),
alert-reviewer "Nadia" (bank level-1 alert reviewer), class-project-student "Dev", nonprofit-
operations-analyst "Grace", data-journalist "Ruth". The last three (and cytoscape-holdout,
gene-ontology-cytoscape-user) were added for round 8; the three newcomer files are short (~4.5 KB)
compared with ~20-40 KB for the older personas.
**Others (15):** analyst-alex, bioinformatics-researcher "Dr. Chen", cybersecurity-analyst
"Priya", cytoscape-holdout, expert-emma, fraud-analyst "Sarah", gene-ontology-cytoscape-user
"Joaquin", genomics-cytoscape-user, gephi-holdout, intelligence-analyst "Marcus",
knowledge-engineer "Min-ji", marketing-analyst "Jordan", ml-engineer-recsys "Chris",
screen-reader-analyst "Morgan" (blind, keyboard only), supply-chain-analyst "Dana".
Every persona is a different domain; every task had at least 4 personas spanning 2+ domains
(`S/round-8/preflight.md` check 7). Persona counts by round: 15, 19, 19, 16, 16, 16, 16, 21.

### Task wording rules

- A prompt states a goal in the participant's own words. It never uses join, source, attribute,
  layer, JSON, path, array or field, and **never reuses a label shown at the target**
  (`S/round-8/tree-test.md` lines 28-33). Preflight check 6 reads every scenario against the words
  on its target (`S/round-8/preflight.md`): e.g. tasks say "picture file", "names written next to
  its dot", "a different way of arranging", "go-betweens"; controls say Export/Image, Label,
  Layout/Method, Shortest path.
- Origin of the rule: the owner caught round 6's "money in against money out" jump (ease 2.00 to
  5.00) as partly participants matching task words to the words the fix put on screen.
  **"Task wording must never reuse the words a fix puts on screen"; every label change is tested on
  at least two domains** (`P/owner-feedback.md` lines 67-75).
- Domain nouns follow the persona ("accounts" for bank, "genes"/"proteins" for biology, "hosts"
  for security, "people" otherwise); the facilitator swaps only those.
- Hypothesis files (`S/hypotheses/*.md`) are for designers only and must never be in a
  participant's prompt: "a simulated user who knows the intended answer will find it, and the
  session proves nothing."
- Tier 1 tasks open with "You have never used this program before. You will practice on the
  ready-made network ... not on your own data."
- The participant view must hide review bars, design notes and section/state ids; `study.mjs
--check` fails any route showing reviewer words ("skeleton", "not wired", "stand-in").

### Grading

- Codes: S success, SD success with difficulty, F failure, G gave up. **The bar counts S + SD.**
- **Graded from what ended on screen and what the participant concluded, not self-rating**; each
  grade checked against the last render. Self-ratings are not used (round 8: 17 of 21 called the
  first session SD, all were failures; `S/round-8/sessions/grades-r8-t01.md`).
- SD allows: more than two wrong turns, a hover/help, reading a pre-existing result instead of
  running one, a detour then correction. Each task's sheet states its own S/SD/F rules.
- **Ease** = Single Ease Question 1-7, read from the transcript (not the session summary).
- **Severity** = Nielsen 0-4 (4 = task cannot be done, or user leaves or reports a wrong answer
  unknowingly). Observed vs said: an opinion-only finding is held one level down. **Confirmed** =
  observed in 2+ participants.
- **Skeleton defects** (prototype or study-tool faults) are listed in Part 1 of each insights file
  and not counted against the design; a session that crossed one is marked "decided" (the defect
  determined the outcome) or "crossed" (hit it, still gradable).

### Targets (round 7 and round 8, frozen before the round, scored as written)

From `S/decision-log.md` "Round 8 > Targets" and `S/round-8/preflight.md` check 10:

1. Every tier 1 and tier 2 task at **>= 80% S + SD**.
2. **No confirmed severity-4 problem** left unresolved.
3. **Mean ease >= 5.5** of 7 over every session.
4. Every tree-test task at **>= 70% direct success**.
5. Tier 1 first: until tier 1 passes, studio changes go to tier 1 problems.
   At least 60% of sessions go to tier 1 (round 8: 169 of 264 = 64%); first-time personas take
   tier 1 first; every tier 1 task starts from the empty app (`start-screen/first-run`).

Earlier bars: rounds 4-6 used tree >= 70% correct and 55% direct, first click >= 70% per prompt,
no confirmed sev 3-4 finding, ease at or above the previous round on repeated tasks.

### Preflight and the browser gate

- Since round 7 a **preflight** runs before any session and the round may not start until it
  passes (`S/round-7/preflight.md`, `S/round-7/gate.md`, `S/round-8/preflight.md` -- round 8
  passed on attempt 9). Ten checks: fresh round folder; every route renders in participant view
  (`study.mjs --check`, 78 routes); task renders match the plan and are newer than the skeleton
  (`--task`, `--fresh`); the tool proves its own checks (`--prove`); tree outline holds only labels
  that exist in the skeleton and no answers; answers kept from participants; coverage/domains/
  datasets/tier 1 share; decided-but-not-drawn changes excluded or flagged; every persona has a
  file; success criteria carry the targets.
- `study.mjs --counts` fails any hand-typed fixture count; `--fixes` (added after round 8) is a
  scripted click-through proving the six round 8 deciding defects are fixed -- "until every line is
  ok, those tasks measure the prototype" (`P/app-b/README.md`).
- **Browser gate:** every browser-launching command runs through `P/kit/with-browser.sh` (flock on
  `/tmp/graphty-design-browser-slots/slot-N.lock`, `BROWSER_SLOTS` default 4). Reason: on
  2026-10-01 a round ran 23 browsers at once (49 GB) and filled swap. `study.mjs` holds one slot
  per run and gives each 25 routes a fresh context; every page starts from an empty browser store.

---

## 2. How each round scored and what changed

| Round | What was tested                                                                                                 | Methods, size                                                                         | Headline                                                                   | Source                  |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------- |
| 1     | Static gallery mocks (`P/screens/`)                                                                             | 71 sessions, 15 personas, 18 tasks, 4 focus groups                                    | 1 of 71 clean success; 89% completed; mean ease 3.65                       | `S/round-1/insights.md` |
| 2     | Revised mocks; 18 repeats + 12 new tasks                                                                        | 105 sessions, 19 personas                                                             | repeats ease 4.21 (from 3.65)                                              | `S/round-2/insights.md` |
| 3     | Mocks after round 2 (undo, weight question, dated paths, gray figure...)                                        | 136 sessions, 45 tasks                                                                | repeats of r1 4.45, repeats of r2 4.41, new 4.03                           | `S/round-3/insights.md` |
| 4     | Navigation rebuilt after owner review (rail = Graph/Data/Notes/Assistant; no Results place; no avatar)          | + tree test (16 x 14) and first click (16 x 9); 58 sessions                           | not passed; 22 confirmed sev 3-4; ease 4.17 on repeats (bar 3.80)          | `S/round-4/insights.md` |
| 5     | Round 4 decisions (one File list, recipes, weight per run) -- mostly NOT drawn                                  | tree in two arms (Results in panel vs on rail), 135 sessions                          | not passed; by frozen rule Results moved to the rail; ease 4.25 on repeats | `S/round-5/insights.md` |
| 6     | Results on the rail, undo variants                                                                              | tree 16 x 16, first click 69%, 211 sessions                                           | not passed; gate failed but round ran; ease 4.78 on repeats (+0.65)        | `S/round-6/insights.md` |
| 7     | **First round on the clickable skeleton** of refined structure B (`P/app-b/`), chosen by the owner 2026-09-30   | tree 16 x 16 (98% correct, 63% direct), first click 95%, 280 sessions over 61 tasks   | not passed; 66% S+SD; ease 3.54 (method got harder)                        | `S/round-7/insights.md` |
| 8     | Same skeleton, **tasks tiered**: tier 1 first-time core path from empty app, tier 2 repeat work, regression set | tree 21 x 15 (99.7% correct, 68% direct), first click 87%, 264 sessions over 32 tasks | not passed; 83% S+SD; ease 4.28; tier 1 75%                                | `S/round-8/insights.md` |

### What changed between rounds, and whether it helped

- **Rounds 1-3 (static mocks, participants describe clicks):** steady ease gains on repeated tasks
  (3.65 -> 4.21 -> 4.45). Mostly wording and feedback fixes. Caveat: participants never clicked,
  and one task (clear or refer a flagged account) stayed at 2.0 ease all three rounds.
- **Round 4 (owner's navigation rebuild; tree test and first click added):** the outline methods
  showed places were mostly right; failures were on settings and file jobs. Ease on repeats +0.37.
- **Round 5:** the round-4 decisions were mostly NOT drawn on the screens, so it re-measured round 4
  (`S/round-5/insights.md` "The round measured the mocks again"). Round 5's files were also written
  over round 4's per-participant files (round 4 raw answers lost). Did not help; it produced the
  rule that a round may not run until its decisions are drawn.
- **Round 6:** the precondition gate (`kit/check.mjs`, `kit/prove-gate.mjs`) FAILED and the round
  ran anyway; `check.mjs --tasks` "checked nothing" and passed. Ease rose to 4.78 but nine session
  summaries carried a higher ease than their transcripts. Real decision that held: undo = notice
  plus Ctrl+Z restores the selection (notice-alone lost the selection in 5 of 8; ease 3.62 vs 5.12).
- **Round 7 (switch to the clickable skeleton):** a far harder test. Ease fell to 3.54 because 18 of
  61 tasks could not reach their end state and the study tool could not type or modifier-click. On
  the 14 tasks with no deciding skeleton defect: 91% S+SD, ease 4.86 (`S/round-7/insights.md`
  lines 36-60). The preflight and `study.mjs --check/--prove` were added because of this.
- **Round 8 (tiering by the owner's 2026-10-02 priority, `P/owner-feedback.md` line 181):** ease
  3.54 -> 4.28, mostly from skeleton repair (end states now reachable). Clean design gains:
  communities (r7 45% -> 100%), path picker (46% -> 83%), notes on whole subjects, the layout
  method list (ease 2.50 -> 4.80), the Data summary (71% -> 100%), file actions in the main menu
  (tree: picture for slides 19% -> 90% direct, colleague's style file 13% -> 95%, replace next
  month's file 63% -> 86%). Two jobs fell because round 8 asked harder questions: find a node and
  see its neighbors (100% -> 0%, now asked by name) and labels from a field (83% -> 42%, now
  starting on the whole graph where the menu offers "Show labels" first)
  (`S/round-8/insights.md` "Compared with earlier rounds").

---

## 3. Round 8 tier 1 tasks (ids, wording, success, result)

All start on the empty app's first-run start screen unless noted. Dataset: the Les Miserables
sample (77 characters, 254 co-chapter edges) unless noted. Wording is quoted from the grade sheets.
Result = S+SD of n, mean ease, first-time personas' S+SD.

| Id                     | Task as given (abridged)                                                                                                                                                               | Success required                                                                                                                                                                                                                                                                                                   | Result                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| r8-t01                 | Whole first session: open the sample, have the program work something out about the characters, make the drawing's colors or sizes show it, put the names on, finish on a picture file | (1) sample open; (2) a measure/grouping run or updated from Analyze and read on its Data tab; (3) colors/sizes from THAT result, named (legend or bound Size line); (4) a label line on Everything (or a row covering all 77) bound to the name column; (5) end on Export > Image. Steps 3 and 4 cannot be skipped | **0 of 21** (20 F, 1 G), ease 3.10, 0 of 6 first-time                                                             |
| r8-t02                 | "your own data is not ready yet ... Get something onto the screen to try it on, and tell us what it is"                                                                                | one click on a Samples card, then say what it is                                                                                                                                                                                                                                                                   | 10 of 10, 5.00                                                                                                    |
| r8-t03                 | colleague's `miserables.gexf` in Downloads: bring it in and check all of it arrived (characters, connections, nothing dropped)                                                         | Open project or file / Ctrl+O / drop; read "Makes" line 77/254 and match report; state counts; Load                                                                                                                                                                                                                | 10 of 10, 4.60 (graded up to Load: loading card never finishes)                                                   |
| r8-t04                 | two CSVs (hosts, connections) into one network; know every machine and connection arrived                                                                                              | both files picked; import page shows two tables, 300 hosts, 1,105 connections; Load                                                                                                                                                                                                                                | 10 of 10, 5.90 (dataset "wide", IT estate)                                                                        |
| r8-t05                 | coworker's `miserables-edited.graphml`: get to where you can carry on, or know what to tell the coworker to fix                                                                        | reach the refusal page; say what is wrong (repeated id, link to a missing node)                                                                                                                                                                                                                                    | 8 of 8, 5.75                                                                                                      |
| r8-t06                 | first look: how many characters, connections, whether every one is reachable, what facts are recorded                                                                                  | read 77 / 254 / 1 component on the graph summary; list label, group, degree, betweenness                                                                                                                                                                                                                           | 12 of 12, 5.17                                                                                                    |
| r8-t07                 | "put the characters in order of how much the whole network depends on them", top three and what the order was based on                                                                 | run a ranking measure from Analyze, name top three (Valjean, Myriel, Gavroche for PageRank) and the measure                                                                                                                                                                                                        | 12 of 12 (1 S, 11 SD), 3.58                                                                                       |
| r8-t08                 | "pick out the circles of characters who keep turning up together": how many, largest size, who is at its center                                                                        | run/update Louvain; read 6 communities, largest 25, hub Gavroche                                                                                                                                                                                                                                                   | 12 of 12, 4.50                                                                                                    |
| r8-t09                 | the more the network depends on a character, the bigger the dot; leave colors alone                                                                                                    | add a Size line ("+" beside Shape > Size), bind it to a ranking or number                                                                                                                                                                                                                                          | 10 of 12 graded on the walk, **ease 2.00**; 0 of 12 saw a dot change (skeleton never applied size on this sample) |
| r8-t10                 | "Right now only a few characters have their names written on the drawing. Get every character's name written next to its dot."                                                         | Everything row > Label "+" > "Label line" > pick the name column ("label")                                                                                                                                                                                                                                         | **5 of 12 (42%)**: 0 S, 5 SD, 2 F, 5 G; ease 2.42; 2 of 6 first-time                                              |
| r8-t11                 | "The drawing looks crowded in the middle. Try a different way of arranging the dots so the clusters are easier to tell apart."                                                         | toolbar Layout or the inspector's Layout tab, pick a method other than the current one, say why                                                                                                                                                                                                                    | 10 of 10 (9 SD), 4.80                                                                                             |
| r8-t12                 | "Go to the police inspector Javert, read what the program knows about him, and see which characters he shares chapters with."                                                          | find him (Ctrl+K or list search), read his Data tab, open Neighborhood, name some of his 17 neighbors                                                                                                                                                                                                              | **0 of 12** (11 F, 1 G), ease 2.17                                                                                |
| r8-t13                 | two things for a report: a picture with its color key, and the per-character numbers in a file Excel can open                                                                          | Export > Image with legend; Export > Data on the Nodes table (or the table's CSV export)                                                                                                                                                                                                                           | 12 of 12, 4.75                                                                                                    |
| r8-t14                 | keep the work under a name you choose, put it away for the day, bring it back tomorrow                                                                                                 | Save as with own name; Close project; reopen from Recent                                                                                                                                                                                                                                                           | 10 of 10 (3 S, 7 SD), 5.30                                                                                        |
| r8-t15                 | first launch on a work laptop: decide whether you are comfortable with what it may send its makers                                                                                     | read the usage-data card, open "What is collected", answer, know where to change it                                                                                                                                                                                                                                | 6 of 6, 5.67                                                                                                      |
| r8-t16 (counted apart) | a coworker left a blank project open; get your list of connections into it                                                                                                             | an empty-state "Add data" entry to the intake                                                                                                                                                                                                                                                                      | 6 of 6, 5.33                                                                                                      |

Totals: tier 1 127 of 169 (75%), ease 4.12; first-time personas 70 of 88 (80%), others 57 of 81
(70%) -- the experts drew the hardest tasks; on the same tasks both groups fail in the same places.
Without r8-t01: 127 of 148 (86%). Tier 2 67 of 70 (96%), ease 4.71. Regression set 19 of 19, ease
3.84. All sessions: 219 of 264 (83%), ease 4.28; median ease 5.

### Why the three tier 1 failures failed

**r8-t01, the whole first session (0 of 21)** -- `S/round-8/sessions/grades-r8-t01.md`.

- **The naming step failed 19 of 21:** only 2 (gephi-holdout, screen-reader-analyst) ever bound a
  label line to the name column. 12 opened the Label "+" and chose **"Show labels"**, which adds an
  unticked checkbox; ticking it changes nothing (names come from a label line). 10 stopped there
  believing names were on. 9 never found the "+" at all: the word "Label" is not a control and the
  "+" has no tooltip of its own. The first explanation anyone saw was the Export dialog's fixed
  "64 labels hidden to avoid overlap", read as the program deliberately hiding names.
  Screen-reader-analyst: "the checkbox on its own looked finished and was not".
- Step 3 failed for everyone who ran their own analysis: the sample opens with PageRank already
  coloring all 77 nodes; Hide, Show, Move above and Color by attribute changed panel text but not
  the drawing (skeleton). Degree from Analyze landed hidden and unlisted while its Style tab
  claimed "Size 0.5 to 3". 14 chose Betweenness, whose run never finished (skeleton). Solo ("Show
  only this row") painted Louvain but was lost on opening any menu.
- 21 of 21 could not tell the sample's pre-done work (PageRank, Louvain, paths, watchlist, report
  folder) from their own. Would switch today: 0 of 21; most common reason "the panel said one thing
  and the drawing showed another". Ease median 3 (open/export ~6, the middle ~2).

**r8-t10, names on every node (5 of 12)** -- `grades-r8-t10.md`. 8 of 12 chose "Show labels"
(the words match the task); 3 stopped there. 12 of 12 clicked the word "Label" first; the "+"'s
name "Add to Label" was learned only from a neighboring "+" tooltip or by tabbing. Every second
route was a dead end in the skeleton: "Labels shown anyway" said "not available yet", the column
menu's "Add label line" said "not available yet", Quick actions' "Add label line" opened another
project. First click on the still screen was fine (20 of 21 on Label "+"): the failure is the step
after the right click.

**r8-t12, Javert's neighbors (0 of 12)** -- `grades-r8-t12.md`. No screen lists a node's neighbors
by name. 11 of 12 opened "Neighborhood of Javert", which reads "Covers: Javert and 17 neighbors"
and names no one; his Data tab's "Degree 17" was plain text; the edge table ignored the selection.
Everyone named only Valjean, from a path row or a note. Selecting a node opened the inspector on
Style ("Why this look") although all 12 wanted his data. "Data" names both the rail section and
the inspector tab; clicking it dropped the selection in 12 of 12. Skeleton faults on top: Filter to
neighbors reported 18 of 77 while drawing 77, and the inspector jumped to Valjean.

### Tree and first-click results on the tier 1 path

Tree (21 each, direct success; bar 70%): open a sample 100, own file 90, **run betweenness 29**
("Measure the graph" heading paused 16 of 21), **labels name+team 52**, layout 86, export picture
90, **export scores as CSV 38**, save and reopen 100. Tier 2 / other misses: hide edges under a
weight 62, **select by a rule 10**, merge repeated edges into a weight 38, show only one result 43.
First click (21 each): **rearrange 62%** (layout icon reads as "play"), **export the data 10%** (18
clicked the Table toggle), **who this character is tied to 57%** (9 clicked the "Valjean, 36
connections" tag, which is not a control); everything else 95-100%.

---

## 4. Recurring problems (across rounds, still open at round 8)

Ranked roughly by tier 1 impact. Round 8 finding numbers refer to `S/round-8/insights.md` Part 2.

1. **The right control is found; what it does next fails.** First clicks 87%, tree correctness
   99.7% in round 8 (98% in round 7), yet tasks fail on a menu item that does nothing visible, a
   count with no names behind it, a setting the drawing does not show. Rounds 7 and 8 both say so.
2. **Labels.** Round 7: label lines never drew (skeleton); tree "name with department under it"
   31% direct. Round 8: the "Show labels" trap (sev 4, finding 1). Recurs across both skeleton
   rounds.
3. **Color/size by a value.** Round 7 top task 8 at 60%; round 8 ease 2.00. Size hidden under the
   "Shape" "+", bind icon needs a hover ("Size by attribute"; 5 of 12 said "attribute" is not their
   word), nine jargon terms in the popover (finding 4).
4. **A result does not show on the drawing and nothing says why** (finding 3): pre-run PageRank
   covers color; newest run's landing rule unclear. Owner rule: a run paints as soon as it
   finishes (`P/owner-feedback.md`, 2026-09-30).
5. **Sample arrives pre-explained in jargon** (finding 6): "Color: PageRank 0.00330 to 0.0754" has
   no plain meaning; "1 row not listed still paints" rejected 6 of 6 in a focus group.
6. **Same words on different controls** (finding 5; round 7 finding 7): "Data" twice, "Louvain"
   four times; worst for the screen-reader persona.
7. **Imported values look computed** (finding 8): betweenness/degree from the file vs from a run
   indistinguishable (12 of 12).
8. **Find/select:** the list search box cannot find a node, id or value (sev 4, finding 15); Select
   where found only by guessing (round 7 sev 4, round 8 tree 10% direct, round 6 too).
9. **Export of the numbers** opens on Edges and is looked for at the table (finding 7). Round 7:
   the exported picture omitted the legend (sev 4, since fixed).
10. **Layout door is an icon that reads as play** (finding 9); round 7 tree 6% direct when Layout
    lived only under the Style tab.
11. **Numbers that disagree between screens** -- rounds 2-7 Part 1 every time ("fourth round
    running", `S/round-6/insights.md` Mock 2); led to `study.mjs --counts` and the rule that every
    count in a message is computed from live state.
12. **Import trust:** wants one sentence of read/kept/skipped counts (findings 11, 13 in round 7);
    a plain import arriving pre-styled (finding 12); weight guesses not marked "auto" (finding 21).
13. **Usage-data card wording** costs trust (finding 14): "the author ... and his Claude Code
    sessions" read as a second recipient; "replay" read as screen recording.

What consistently worked: loading and the match report; the broken-file refusal naming faults
with line numbers (8 of 8 would forward it); "never uploaded"/"Local only"; the communities run's
Data tab; "Covered by PageRank for Color"; the path tie report; "Note on: <thing>" before typing;
replace-and-out-of-date warning; Privacy page "Where your data goes".

### Decisions taken after round 8 (latest intended design; untested)

From `S/decision-log.md` lines 752-830: fix the six deciding skeleton defects first (Betweenness
run finishes and lands listed and painting; eye/solo/Move above repaint canvas and legend; size
pick drawn on the sample; Add rows keeps layers; Quick actions "Add label line" stays in project);
the **Label "+" with no label anywhere holds one item and immediately adds an empty label line and
opens its field picker** (Show labels only offered when a lower row sets a label; heading word runs
the same command; tooltip "Add label line"); messages state live counts ("77 names, 64 hidden to
avoid overlap"; "Show all labels" one name); the **list box becomes one find** over rows, elements
(by label, id, value) and notes, with a "Select where <attr> is <value> (n)" row; **the sample
opens with nothing run**, legend names method with one plain sentence and every channel incl. size
(2-12 px); a node opens on its **Data** tab and its degree / "N connections" select its neighbors;
a neighborhood is **listed by name** ("Javert's 17 connections", "Valjean, 17 shared chapters");
Analyze box renamed "Filter analyses", one "Start here" per heading; Export > Data opens on the
showing table (Nodes default); the table's CSV export routes through the one Export dialog; layout
icon reads as arranging; Esc closes the layout dialog. Rejected: deleting Show labels, a Size
heading of its own (needs a re-test on working wiring), question-shaped Analyze headings (to a
tree-test comparison first), a "Worked examples" sample mode.

Round 8's own "before the next round" list: re-run r8-t01, r8-t09, ranking/groups on a finished
Betweenness, and r8-t30 after the fixes; give a user's own file a clean "just loaded, nothing run"
state; add transfers data with repeated pairs and orphans.

---

## 5. Study-method lessons: what made findings unreliable

1. **Simulated participants share blind spots.** One model plays every persona: a failed task is a
   strong signal, a passed one weak until real people confirm (stated in every round since 4).
   Simulated SEQ is generous and uncalibrated; compare rounds, not published norms
   (`S/round-1/insights.md`, `S/round-6/insights.md` verdict).
2. **Self-ratings and summaries drift up.** Round 8: 17 of 21 self-rated SD on a task all failed.
   Round 6: nine session summaries gave a different ease from the transcript (seven one point
   higher). Rule: grade from the last render and the transcript, never the summary or self-rating.
3. **Prototype defects decide tasks.** Round 7: 18 of 61 tasks could not reach their end state.
   Round 8: four tasks decided by the skeleton (Betweenness never finishes, no repaint, size never
   applied, Add drops layers); without them success is 90% and ease 4.59. Fix deciding defects and
   prove them (`study.mjs --fixes`) before re-running; until then a task measures the prototype.
4. **Decisions not drawn re-measure the old design.** Round 5 tested round 4 again because the
   decisions were not on the screens; round 6 ran despite a failed gate. Hence the preflight that
   blocks a round, and the "decided, not drawn" flag on findings.
5. **A check that checks nothing passes.** Round 6's `check.mjs --tasks` reported "0 problems on 0
   pages". Every check now fails when it inspects zero items, and `--prove` plants failures to
   prove each check can fail.
6. **Task words echoing screen words inflate success** (owner, round 6 money task). Wording rule
   above; test label fixes on two domains so a fix does not serve one dataset.
7. **Study-tool artifacts inflate wrong turns.** Click-by-name picks the first of several
   same-named controls (Data, Louvain, Nodes); hovering an icon needs its hidden name, inflating
   icon-discoverability problems; round 7's tool could not type or shift/ctrl-click (turned several
   sessions into "gave up" with the right box open). Fixed in round 8's tool (`--type`,
   `--shift-click`, `--ctrl-click`, `ambiguous` warning, `Name#2`, `role=treeitem:`), but duplicate
   names still inflate counts for sighted users.
8. **The sample's pre-done work contaminates first-time tasks.** "Have the program do it" became
   ambiguous when the answer was already on screen; experts and newcomers both refused to count it.
9. **A single fixed screen ignores what was chosen.** Loading a user's file landed on the sample's
   state ("did my file load or the sample?", 10 of 10 in r8-t03); three sample cards opened Les
   Miserables. Fixtures must follow the participant's choice or the task must end before it.
10. **Unequal task allocation skews group comparisons.** Experts drew the hardest tier 1 tasks, so
    first-time 80% vs others 70% is not a real difference.
11. **File hygiene.** Round 5 overwrote round 4's raw answers; one round-6 session saw its answer
    key; four round-4 files came from an abandoned run. Fresh round folder is now preflight check 1.
12. **Resource safety.** 23 concurrent browsers on 2026-10-01 filled swap; hence the 4-slot gate.
13. **Ease bar 5.5 has never been met** in any round (best: round 6's 4.78 on repeats, on static
    mocks; round 8's 4.28 on the skeleton). Tree-direct and severity-4 bars also failed every
    round from 4 to 8.
