# Round 3: what the study found

Round 3 of the simulated study of the graphty mocks: 136 task sessions with 19 simulated personas
across 45 tasks, and 4 focus groups (people leaving Gephi or Cytoscape; investigators; code-first
and screen-reader users; first-timers and people handed a file). 18 tasks repeat round 1, 12
repeat round 2, and 15 are new and aim at what changed after round 2 (undo, the weight question,
dated paths, the signed gray figure, recipes with a missing column, finding an account from an
older case, the weekly update, the reviewer's CSV, past-the-limit work, keys, notes). Every
participant is simulated, built from the persona files in `../personas/`. Treat every finding as a
hypothesis to confirm with real people, not as proof.

How to read this page:

- **Severity** is Nielsen's scale: 0 not a problem (used for things to keep), 1 cosmetic, 2 minor,
  3 major, 4 catastrophe (the task cannot be done, the user leaves, or the user would report a
  wrong answer without knowing).
- **Sessions** counts task sessions where the problem was seen; **participants** counts distinct
  personas. Focus-group mentions are listed separately and never added to the session count.
- **Observed** means the participant did something: clicked the wrong thing, stopped, nearly
  reported a wrong number, lost work, failed. **Said** means an opinion. A finding supported only
  by opinion is marked so and its severity is held down by one.
- **Mock or design.** Problems caused by the mocks themselves come first, in Part 1, and are not
  counted against the design. Where a mock defect hides a real design question, the design
  question is kept in Part 2 and the mock part is named there.
- One participant saying something once is listed under "single voices" and not ranked.

Session files are in `sessions/`, focus groups in `focus-groups/`. Earlier rounds:
`../round-1/insights.md`, `../round-2/insights.md`.

---

## Task success and ease

Outcome codes: **success** (done, unaided), **with difficulty** (done, but after a wrong turn, a
guess, or a moderator step-in), **failed** (wrong or no answer). No one gave up. SEQ is the Single
Ease Question, 1 (very hard) to 7 (very easy), asked after each task.

### Tasks repeated from round 1

| Task | Sessions | Success | With difficulty | Failed | Completed | Mean SEQ | Round 2 | Round 1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A colleague's file: is it worth an afternoon? | 5 | 0 | 5 | 0 | 5 of 5 | 4.0 | 3.8 | 4.2 |
| Is it OK to use under strict data rules? | 5 | 1 | 4 | 0 | 5 of 5 | 5.2 | 5.2 | 3.8 |
| Who matters most, and how sure are you? | 5 | 0 | 5 | 0 | 5 of 5 | 4.4 | 4.2 | 3.4 |
| What groups are there, and how does the biggest differ? | 4 | 0 | 4 | 0 | 4 of 4 | 4.8 | 5.0 | 2.8 |
| Can these rankings be trusted? (weight trap) | 4 | 0 | 4 | 0 | 4 of 4 | 4.0 | 4.2 | 3.3 |
| Clear or refer a flagged account, starting from search | 3 | 0 | 0 | 3 | 0 of 3 | 2.0 | 2.0 | 2.0 |
| Citation data too big to draw | 4 | 0 | 4 | 0 | 4 of 4 | 5.0 | 4.2 | 4.3 |
| The biggest connected piece | 4 | 0 | 4 | 0 | 4 of 4 | 4.8 | 5.0 | 4.5 |
| A figure a reviewer can read, even in gray | 4 | 0 | 3 | 1 | 3 of 4 | 3.0 | 3.2 | 2.5 |
| Get back after an unexpected change | 5 | 1 | 4 | 0 | 5 of 5 | 4.8 | 3.4 | 4.0 |
| Do two scores agree on who matters? | 4 | 3 | 1 | 0 | 4 of 4 | 5.5 | 5.0 | 4.8 |
| This week's export: redo last week, show what changed | 3 | 0 | 3 | 0 | 3 of 3 | 4.0 | 4.0 | 2.7 |
| Use a colleague's recipe on your gene list | 3 | 0 | 3 | 0 | 3 of 3 | 4.7 | 4.0 | 3.7 |
| Share your setup without your data | 4 | 2 | 2 | 0 | 4 of 4 | 5.5 | 5.0 | 4.8 |
| Keyboard only: walk out from TP53 | 3 | 1 | 2 | 0 | 3 of 3 | 5.0 | 4.7 | 3.7 |
| How is this account connected to that one? | 4 | 0 | 4 | 0 | 4 of 4 | 4.2 | 3.5 | 2.8 |
| Measure who bridges groups on the whole citation graph | 4 | 0 | 4 | 0 | 4 of 4 | 4.2 | 4.8 | 4.5 |
| Leave yourself a note on why you kept these accounts | 3 | 0 | 3 | 0 | 3 of 3 | 4.3 | 4.0 | 3.3 |
| **Repeated from round 1** | **71** | **8** | **59** | **4** | **67 of 71** | **4.45** | **4.21** | **3.65** |

### Tasks repeated from round 2

| Task | Sessions | Success | With difficulty | Failed | Completed | Mean SEQ | Round 2 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Explain every count after filtering to one module | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 | 3.3 |
| Top 50 by betweenness into Excel or pandas, and how sure | 3 | 2 | 1 | 0 | 3 of 3 | 5.3 | 4.7 |
| Answer IT: did anything leave, before and after a query | 3 | 0 | 3 | 0 | 3 of 3 | 5.0 | 4.7 |
| Fix the wrong middle filter step without losing the third | 4 | 0 | 4 | 0 | 4 of 4 | 4.8 | 4.8 |
| Path between two accounts, weighted by amount, with dates | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 | 3.0 |
| Keyboard only: find Javert, walk, select two neighbours | 3 | 0 | 3 | 0 | 3 of 3 | 4.3 | 3.7 |
| Read a finished community detection result | 3 | 0 | 3 | 0 | 3 of 3 | 5.0 | 5.0 |
| A gray, colour-blind-safe figure with the top 10 labelled | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 | 3.7 |
| Run PageRank on a column you never thought about | 3 | 0 | 3 | 0 | 3 of 3 | 4.0 | 3.7 |
| Weekly refresh by Replace, then export the table | 2 | 0 | 2 | 0 | 2 of 2 | 4.0 | 4.5 |
| Start from the alert and judge the account's neighbourhood | 2 | 0 | 2 | 0 | 2 of 2 | 4.0 | 4.5 |
| Do betweenness and PageRank agree? (scatter view) | 2 | 1 | 1 | 0 | 2 of 2 | 5.5 | 5.0 |
| **Repeated from round 2** | **34** | **3** | **31** | **0** | **34 of 34** | **4.41** | **4.18** |

### New tasks in round 3

| Task | Sessions | Success | With difficulty | Failed | Completed | Mean SEQ |
|---|---:|---:|---:|---:|---:|---:|
| Transfers filtered in three steps: turn off only the wrong middle one | 2 | 2 | 0 | 0 | 2 of 2 | 6.0 |
| Amount column: cheapest route and most central, and what each used | 3 | 0 | 3 | 0 | 3 of 3 | 3.3 |
| Trace March money forward and say whether the order is possible | 2 | 0 | 1 | 1 | 1 of 2 | 2.5 |
| A black-and-white fold-change figure; read which genes went up | 2 | 0 | 1 | 1 | 1 of 2 | 3.0 |
| Apply a colleague's recipe when your table lacks a column | 2 | 0 | 2 | 0 | 2 of 2 | 4.5 |
| Find an account remembered from an older case | 2 | 0 | 2 | 0 | 2 of 2 | 4.5 |
| Update last week's project and explain why the group count changed | 2 | 0 | 2 | 0 | 2 of 2 | 3.5 |
| Hand a reviewer the filtered table | 2 | 1 | 1 | 0 | 2 of 2 | 5.5 |
| Is the database password stored, and for how long? | 1 | 0 | 1 | 0 | 1 of 1 | 5.0 |
| Keyboard only: find TP53 and look at its connections | 2 | 0 | 2 | 0 | 2 of 2 | 4.5 |
| Direct contacts on a small network and on one too large to draw | 2 | 0 | 2 | 0 | 2 of 2 | 5.0 |
| Top 200 by betweenness past the drawing limit, then look around one | 2 | 0 | 0 | 2 | 0 of 2 | 2.0 |
| Say what a bigger dot means | 2 | 2 | 0 | 0 | 2 of 2 | 6.0 |
| Tree test: where would you go for five jobs? | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 |
| First click: note why you kept this group | 2 | 0 | 1 | 1 | 1 of 2 | 2.5 |
| **New in round 3** | **31** | **5** | **21** | **5** | **26 of 31** | **4.03** |

### All of round 3

- **136 sessions: 16 success, 111 with difficulty, 9 failed.** 127 of 136 completed (93%); 16 of
  136 (11.8%) without a wrong turn, guess or step-in. Round 2: 101 of 105 (96%) and 8 of 105
  (7.6%). Round 1: 63 of 71 (89%) and 1 of 71 (1.4%).
- **Mean SEQ 4.35 of 7** (round 2: 4.20, round 1: 3.65). On the 18 tasks run in all three rounds:
  3.65, 4.21, 4.45. On the 12 tasks from round 2: 4.18 to 4.41. The 15 new tasks score lower
  (4.03) and hold 5 of the 9 failures, as expected of tasks aimed at the weakest places.
- **"Completed" overstates five tasks.** Coded as done, but a required part could not be met on
  the screens; read them as partial:
  - path weighted by amount (all 3): no weighted path is ever shown, so "weighted by amount" was
    done on faith;
  - amount column end to end (all 3): no path result shows its cost or hops;
  - find Javert by keyboard (all 3): still not on the keyboard page (mock limit);
  - tree test (all 3): the fifth job, neighbours past the drawing limit, found no home;
  - the dated trace (Marcus) and the signed gray figure (Maren): the forward trace and the gene
    names could not be done.
  Counting those as partial, 113 of 136 (83%) fully met the task (round 2: 85%).

What moved:

- **Undo is fixed as a design problem.** Get back rose from 3.4 to 4.8 (5 of 5); the new
  transfers version of the same job was the cleanest task in the round (2 of 2 success, SEQ 6.0).
  An undone step now stays in the list unticked, and the undo line names what it took out. The
  reflex Ctrl+Z still takes out the good step first (finding 20), but nobody lost work.
- **Rankings and sharing are now the strongest tasks** (5.5 each), with the size key (6.0) and
  the reviewer's CSV (5.5).
- **Costly measure fell** (4.8 to 4.2) and **the gray figure did not improve** (3.2 to 3.0, one
  failure). In the costly measure the run record contradicts the form on direction (a mock defect
  that participants rated a 4); in the gray figure the Print look now hides the most-down genes.
- **Still the hardest:** anything that starts from an account search (0 of 3, SEQ 2.0, three
  rounds running), past-the-limit ranking (0 of 2), the dated forward trace (1 of 2), the first
  click for a group note (1 of 2), and the signed gray figure (1 of 2).
- Caution: SEQ from simulated participants is not calibrated against real users. Compare tasks
  and rounds with each other, not with published norms (about 5.5).

---

## Part 1: problems caused by the mocks, to fix before round 4

These cost the study signal but are not evidence about the design.

### Mock 1. The study view hides real product text

- **What happens:** `kit/kit.js` study mode hides every heading and paragraph outside its list of
  product frame classes. The start screen draws its window as `.ss-win`, so participants lose the
  "Open a graph" title, both lines about where data goes and all the recipe card's text. On the
  data page it also hid the title, the intro and section headings. The same view still shows
  design-only chrome: pink dashed outlines round unbuilt controls, the numbered state links, the
  "Show annotations" box, a pink designer ribbon, and a tab named "Wrong middle step".
- **Severity for the study:** 4 for the privacy findings. Any round-3 finding about the data line
  on the start screen from a study render is void.
- **Evidence (observed):** hidden text in 8 sessions (worth-an-afternoon: Elena, Jordan, Tom,
  Dana; data-stays-here: Chen; use-colleagues-file: Tom, Maren, Elena). Visible design chrome in
  about 10 (groups-differ: Jordan; fix-wrong-middle-step: Alex, Dana, student; undo-middle-step:
  Alex; who-matters: Elena; flagged-account: Sarah; this-weeks-export: Dana; read-the-numbers:
  student; get-back: Jordan).
- **Fix:** mark `.ss-win` and any page whose whole body is product as a product frame; hide
  `data-annot`, state bars and dashed "not built" outlines in study mode.

### Mock 2. Hand-written fixtures contradict each other

- **What happens:**
  - The evidence-file frame hard-codes "undirected, 1,036 parallel, no weight" after the load step
    commits confidence as the weight (`datasets.ppiEvidence.frame.edgesLine`), and the file chip's
    tooltip names miserables.json.
  - The sampled betweenness run record says "Citations read as undirected" and normalizes by
    (n-1)(n-2)/2 while the form and state line say Directed; the refusal render says 50 sources
    and "budget" where the page says 101 and "time limit".
  - The weekly replay report says "Weakly connected components: unchanged, 1" beside Statistics
    "components 27"; Louvain says "12, was 11" in one mock and "65, was 35" in another.
  - Degree header "1 to 34" beside "3 (2 isolates)"; Mule ring 14 on the left and 13 on the right;
    the export confirmation names protein PNGs for an evidence file; file names "proteostasis-
    screen" under a project called something else; project names changing between screens.
- **Severity for the study:** 4. In every case the participant stopped trusting every number.
  "If the record and the screen disagree, I can't use either." (Priya)
- **Evidence (observed):** about 25 sessions: all 5 worth-an-afternoon, all 4 costly-measure, plus
  who-matters (Alex), top-50-to-excel (Emma), both weekly-update, weekly-refresh-replace (Alex),
  who-matters (Mara), remember-why (Marcus), flagged-account (Marcus), figure-for-reviewer (Tom,
  Jordan), gray-figure-signed (Maren), groups-differ (Chen, Jordan, Mara), share-without-data
  (Chen), print-ready-grey (Maren), this-weeks-export (Alex).
- **Fix:** generate every count, run record and state line in a mock from one fixture object, and
  add a check that fails when two mocks of one state disagree. The design requirement that
  survives is finding 1 and finding 12: the product must also draw these from one source.

### Mock 3. The dataset still changes mid-task

- **What happens:** the filter chip and Find mocks show Les Miserables during citation, protein
  and transfers tasks; the inspector path states use proteins for account tasks; notes are on
  proteins for an accounts task; there is no protein state filtered to one module; the keyboard
  page has no Javert; the flagged-account page set omits the transfers screens its own task card
  lists, and the Find "typed id" state shows ACC-705989 instead of the id typed.
- **Severity for the study:** 3, and 4 for flagged-account, where all 3 failures trace mostly to
  this page set (see finding 9 for what survives as design).
- **Evidence (observed):** about 35 sessions: all 3 flagged-account, all 4 too-big-to-draw, all 4
  how-connected, all 3 how-connected-by-amount, all 3 remember-why, all 3 read-the-numbers, all 3
  keyboard-walk-shift-arrow, all 3 weight-end-to-end, both dated-trace, narrow-or-paint (Emma,
  Dana, Min-ji: results scoped to someone else's filter), undo-middle-step (Sarah),
  this-weeks-export (Min-ji).

### Mock 4. States the task needs are not drawn, or controls do nothing

- No PageRank form (weight-at-first-run, all 3); no weighted path result or path cost
  (how-connected-by-amount 3, weight-end-to-end 3); no note editor (remember-why: Alex, Marcus;
  notes-first-click both); "Details" and every info icon open nothing (who-matters: Mara;
  top-50-to-excel: Alex; rankings-agree: Emma, Chris, Mara; read-the-numbers: Elena, student;
  rankings-agree-scatter: student); no state after a data-source query (did-anything-leave: the IT
  reviewer); no weighted Les Miserables run (quiet-weight-trap, all 4); no run control past the
  limit (top-200-past-limit, both); the row menu on the undo page (fix-wrong-middle-step: Alex,
  Dana). Stale shots: start-screen state 4, the refusal, the Assistant-on frame.
- **Severity for the study:** 3. The participant guessed and the finding could not be tested.

---

## Part 2: design findings, most severe first

### 1. The graph's weight is described in five different ways, and "no weight" reads as data loss

- **What happens:** the same edges are "weight: confidence" at rest, "confidence: numbers, not
  used" after load, "no weight" in Results, "None declared" in the Weight field and "similarity
  weight" after Louvain. On Les Miserables, whose edges all carry `value`, Results says "no
  weight". Users cannot tell "the file has no numeric column", "it is loaded but has no meaning
  yet" and "the import dropped it" apart, and after choosing a weight they are told there is none.
- **Why:** the words describe the state of the graph from the element's point of view, not the
  question the reader asks ("is my column still here, and was it used?"). Part of the contradiction
  is fixture (Mock 2); the five spellings are design.
- **Severity:** 4. Observed: participants stopped trusting every number, and Mara named it her
  walk-away trigger. "No weight? I just picked the number thing for the weight." (Elena)
- **Evidence:** 21 sessions, 16 participants. worth-an-afternoon (all 5), quiet-weight-trap (all
  4), who-matters (Jordan, Maren, Mara), narrow-or-paint (Emma, Min-ji), read-the-numbers (all 3),
  weight-at-first-run (Jordan, student), groups-differ-finished (Chen, Mara: "your answer" to a
  question never seen). Focus groups: switchers (nothing lost silently, severity 4).
- **Recommendation:** one sentence per numeric edge column, with three states and the same words on
  every screen: "value: numbers, not used -- say what it means", "value: used as strength (your
  answer, Sep 28) -- change", "no numeric edge column". The Weight field lists the numeric columns
  it could use. The state must come from graphty-element, not be composed by the app.

### 2. Transfers on a path carry no date, time order is never checked, and money cannot be traced forward

- **What happens:** the path readout and the found-path table show step, source, target and amount
  but no timestamp (the table-dock version does, so two screens disagree). Nothing flags a hop
  that happens before the one it follows. The path tool needs a known destination, so "follow the
  money out of this account" cannot be asked. The account inspector shows neighbour counts, not
  money in and out.
- **Severity:** 4. Observed: the dated trace failed for Sarah; Marcus checked order by eye and
  said he would miss it on nine hops; Nadia could not tell QA the path was weighted.
- **Evidence:** 12 sessions, 5 participants (Sarah, Marcus, Priya, Nadia, Dana).
  flagged-account (all 3), how-connected (Sarah, Marcus), how-connected-by-amount (all 3),
  dated-trace (both), flagged-account-from-alert (both). Focus groups: investigators, 2
  independent and 2 adopted, all four called it a blocker. "Without dates this is a chain of
  payments, not a flow of funds." (Sarah)
- **Recommendation:** timestamp as a column in every path and edge table, shown directly after the
  two accounts; a time-respecting path option ("each hop after the last"); "Trace money out
  of...": forward only, N hops, within a date window; flag any hop earlier than the one before;
  in and out totals on an account; a one-line summary ("9,800 moved on in 3 hops over 48 hours").

### 3. The Print look on a signed column hides the biggest decreases, and the gray check passes anyway

- **What happens:** for a diverging fold change, Print maps -2.52 to the palest dot and 0 to middle
  gray, so the largest decreases look like "nothing changed" and values just either side of 0 print
  the same. The check reports "Checked in gray" because order survives, not sign. The preview stays
  in colour.
- **Severity:** 4. Observed: two failures (Maren in figure-for-reviewer, Chen in gray-figure-
  signed); Tom saw the tick and did not believe it. "It passed the wrong test." (Chen)
- **Evidence:** 9 sessions, 5 participants (Maren, Chen, Tom, Jordan, the student).
  figure-for-reviewer (all 4), print-ready-grey (all 3), gray-figure-signed (both). Focus groups:
  switchers (recipe frame puts two things on colour).
- **Recommendation:** for a diverging layer, gray keeps both ends dark and the midpoint light, or
  carries sign on a second channel (outline or shape); the check tests that the two sides stay
  apart, not only that order survives; the preview shows the gray file.

### 4. A shared recipe looks finished before the recipient's own data is in it

- **What happens:** the recipe preview says "Everything was found by name" and enables Apply while
  the only numbers are the network's own fold-change column; the only way to add the recipient's
  table is a small "Add a table..." link. The card says the recipe carries no data, then a network
  appears "opened by this recipe". The fold-change picker offers the network's column (300 values,
  the recipe's exact name) beside the recipient's (84 values).
- **Severity:** 4. Observed: Elena took 152 up and 148 down as her results and would have applied;
  she reached for the 300-value column "because more gets coloured"; Tom nearly pressed Apply.
- **Evidence:** 5 sessions, 4 participants. use-colleagues-file (all 3), recipe-missing-column
  (Tom, Chen). Focus groups: first-contact (3 of 4 on "did I change the file"; 2 of 4 on the
  column choice, unanswered since round 1).
- **Recommendation:** Apply stays off until a table of the recipient's is added, and the footer
  says so; "Add your table" is the main button; the network the recipe names is shown as the
  sender's with a Replace control; a column from the network is never offered as the recipient's
  fold change without the word "the sender's".

### 5. Past the drawing limit, a row is a dead end and no measure can be run

- **What happens:** clicking a row in the table of a graph too large to draw opens no inspector
  and no Neighbors button. The only ranking step is "Top N, with neighbors" with N fixed at 3; no
  run control shows exact or sampled, direction or cost. The past-limit table state shows headers
  only in one mock and rows in another.
- **Severity:** 4. Observed: both top-200 sessions failed; all 3 tree-test participants found no
  home for "neighbours past the limit"; Mara gave up clicking the row and guessed the filter step.
- **Evidence:** 7 sessions, 6 participants. top-200-past-limit (Min-ji, Chris), tree-test-homes
  (Alex, Mara, Elena), neighbors-two-sizes (Mara, Sarah).
- **Recommendation:** a selected row past the limit opens the same inspector as a drawn node,
  with Neighbors, its computed in and out degree, and "Narrow to this"; the Results catalog runs
  on an undrawn graph and states exact or sampled, direction and an estimate; "Top N" has a plain
  "keep only these rows" form and a user-set N. Rows past the limit need graphty-element support;
  record that as an element dependency.

### 6. The weight-meaning question does not fit confidence or money, and its answer is never confirmed on the result

- **What happens:** the refusal says the column "isn't set up as a length"; the choices are
  similarity, distance and capacity, with no "how sure the link is real" and nothing about money
  flow. It does not say what each answer does to the measure being run (PageRank with "distance"?).
  The answer is global for the column with the side effect in the smallest text. After answering
  amount, the path still says "(unweighted)".
- **Severity:** 3. Observed: Sarah guessed and reversed the meaning for a mule chain; Min-ji picked
  a label she said misdescribes her data; Jordan would pick "Don't use" to avoid explaining.
- **Evidence:** 11 sessions, 9 participants. weight-at-first-run (all 3), weight-end-to-end (all
  3), how-connected-by-amount (all 3), dated-trace (Sarah, Marcus).
- **Recommendation:** add "how likely the link is real" and state per measure what each answer
  does; say "confidence is not used yet", never "not a length"; show on every result "weighted by
  amount, higher = stronger (your answer) -- change"; count edges with no value; allow a per-run
  override without changing the column's answer.

### 7. The first screen after load does not say what the tool chose or what to do next

- **What happens:** a grey hairball with a few labelled hubs, which readers take for "the
  important ones"; unlabelled toolbar icons (flask, lightning, route); no table in sight; nothing
  after Load repeats what was chosen for NA values and repeated pairs.
- **Severity:** 3. Observed: Elena, Jordan and Tom read the labels as importance; Jordan guessed
  through three icons; Dana looked for a table and found none.
- **Evidence:** 12 sessions, 10 participants. worth-an-afternoon (all 5), who-matters (Elena),
  narrow-or-paint (Alex), how-connected (Dana), weight-end-to-end (Dana), remember-why (Sarah),
  weekly-refresh-replace (both). Focus groups: first-contact (tool choices not labelled as the
  tool's, severity 4, observed in Elena).
- **Recommendation:** after Load, a line "Loaded with: NA as missing, all 2,298 rows kept, 2
  proteins not in any row" that stays until dismissed; the drawing says why some nodes are named
  ("labelled: top 7 by number of connections"); toolbar icons get visible labels; the table strip
  is visible at rest.

### 8. The load step asks recipients questions only the sender can answer, in graph words

- **What happens:** load is blocked until someone decides how to read confidence; the words are
  "weigh edges", "Role: Weight", "parallel edges", "degree", "metric". Weight is preset as the
  role, which is the only reason load is blocked. "2 proteins in the file have no interaction"
  reads as the file being broken.
- **Severity:** 3. Observed: Elena and Tom chose by avoiding the word "drop"; Dana left the role
  alone because "weight" means freight to her.
- **Evidence:** 6 sessions, 6 participants. worth-an-afternoon (all 5), read-the-numbers (Chen).
- **Recommendation:** load with the column as an attribute, not a weight, and put the question in
  the Statistics sentence of finding 1; plain words ("each row is one source for a pair; 1,036
  pairs have more than one"); "GSK3B and NOTCH1 appear only with an empty partner and are not
  loaded".

### 9. An account id cannot be searched to its account, and the account never says why it was alerted

- **What happens:** most of the 0-of-3 failure is the page set (Mock 3). What survives as design:
  the account inspector shows degree and an unexplained riskScore, no alert reason, no amounts or
  dates; the only evidence route is a set someone else built, which is circular.
- **Severity:** 3 (held at 3 because the failure count is mostly a mock defect).
- **Evidence:** 5 sessions, 5 participants. flagged-account (all 3), flagged-account-from-alert
  (both). "riskScore 62 -- scale of what? Who computed it?" (Marcus)
- **Recommendation:** re-run the task on a page set that uses the transfers screens before
  judging search; show the alert's rule and time on the account; say where riskScore came from
  ("from the file"); offer the account's own transfers as the evidence export.

### 10. Searching older projects covers seven files and returns no account facts

- **What happens:** "Search recent projects" reads 7 recent files; a hit names the data file, not
  the case, and gives no totals, dates or status; Open appears to replace the open project.
- **Severity:** 3. Observed: Nadia re-pasted the id, blaming her typing; both would escalate
  rather than open.
- **Evidence:** 4 sessions, 4 participants. flagged-elsewhere (Sarah, Nadia), flagged-account
  (Marcus), how-connected (Marcus).
- **Recommendation:** say which projects were searched and offer "Search all projects on this
  computer"; a hit carries one line of account facts; "Open beside this one" or "Bring in its
  links", and never close the current project without saying so.

### 11. The weekly update says what changed, not why, and cannot compare communities

- **What happens:** counts before and after are clear, but a jump from 35 to 65 communities or 1 to
  27 components is not explained or flagged; "39 not in April" and "39 new communities" sit side by
  side; comparison offers PageRank, not communities; accounts with no transfers are called
  "closed"; no export marks rows new or dropped this week; nothing is ready for a manager.
- **Severity:** 3. Observed: Jordan built a wrong explanation from the two 39s; Alex worked the
  why out by hand; Dana would go back to XLOOKUP.
- **Evidence:** 7 sessions, 5 participants. weekly-update (Alex, Jordan), this-weeks-export (all
  3), weekly-refresh-replace (Dana, Alex). Focus groups: switchers (refresh must reproduce last
  week, 2 independent).
- **Recommendation:** a "What changed" summary that attributes changes to causes (new accounts,
  lost transfers, pieces split off) and flags large jumps; a community comparison (which accounts
  moved group); "not in April" instead of "closed"; a "this week" column (new, dropped, kept) in
  the table export.

### 12. The settings a number depends on are not where the number is read

- **What happens:** normalization is only behind Details, which opens nothing on several screens;
  CSV headers carry scope but not normalization or direction; PageRank's tolerance and dangling
  rule, the Louvain implementation and version, and the source database version are nowhere;
  Details under each side of the comparison is dead.
- **Severity:** 3. Observed: Emma, Mara and Chris said they would recompute before sending.
- **Evidence:** 12 sessions, 7 participants. top-50-to-excel (all 3), rankings-agree (Emma, Mara),
  rankings-agree-scatter (Emma), who-matters (Mara), groups-differ-finished (all 3),
  csv-to-reviewer (Emma, Chen). Focus groups: code-first (severity 4, all four; Morgan: settings
  must be spoken on the run control), switchers (complete copyable run record, all four).
- **Recommendation:** state line carries normalization and direction ("normalized by
  (n-1)(n-2)/2, directed"); CSV header or methods file carries implementation, version and
  tolerance; Details works from every place a result is shown, including the comparison.

### 13. "How sure" is answered for five rows, below the fold

- **What happens:** the near-tie sentence covers only the top 5 and is below the fold of the
  editor; the 1% threshold is not stated; "No near-ties" contradicts what readers see (0.0695 vs
  0.0687); agreement across measures has to be read off two columns.
- **Severity:** 3. Observed: Elena nearly took "middle 0.0038" as the answer; Chris and Alex
  computed gaps for ranks 6 to 50 themselves.
- **Evidence:** 8 sessions, 7 participants. top-50-to-excel (all 3), who-matters (Jordan, Maren,
  Mara, Elena), narrow-or-paint (Dana).
- **Recommendation:** put Top nodes and the sentence first; cover whatever N the table shows
  ("ranks 30-31 differ by 0.3%"); state the threshold; add "betweenness and PageRank agree on the
  top 5" when they do.

### 14. Spearman is lifted by the tied tail and nothing says so

- **What happens:** 1,153 accounts tied at the bottom on both sides lift Spearman to 0.781 under a
  sentence saying the rankings disagree; the info icon beside it is dead; no tie-excluded or
  top-weighted coefficient; two tie conventions on one screen.
- **Severity:** 3. Observed: the student blamed herself; Emma, Chris, Mara and Chen would not cite
  the number.
- **Evidence:** 6 sessions, 5 participants. rankings-agree (all 4), rankings-agree-scatter (both).
- **Recommendation:** show Spearman without the joint tie block beside it and say in words
  "0.781 counts 1,153 accounts tied on both sides"; name the tie convention; a working info icon.

### 15. Measures are named, not explained, and the catalog has no task words

- **What happens:** Betweenness, PageRank, Katz, HITS appear with no one-line meaning; searching
  "important", "top" or "rank" finds nothing; Degree is not a ranking in the catalog; nothing names
  a bridging measure over groups; "0.419 of what?".
- **Severity:** 3. Observed: Elena picked PageRank "because of Google" and reported a different
  measure; Sarah and Dana chose by guessing; Maren ranked by a number she could not define.
- **Evidence:** 12 sessions, 10 participants. who-matters (Elena, Maren, Jordan), narrow-or-paint
  (Dana, Min-ji), weight-end-to-end (Sarah, Dana), costly-measure (all 4), how-connected (Dana).
- **Recommendation:** one plain line per measure ("on many shortest routes between others: a
  bridge"); catalog search on task words; Degree as a ranking; a "bridges between groups" entry
  (participation coefficient) proposed to graphty-element.

### 16. Starting the group comparison is hidden, and the comparison's numbers disagree with the table

- **What happens:** "Compare with..." reads as "with another run"; table rows show no affordance;
  the comparison lives in the right panel after a canvas pick. The table gives a mean (+0.02 vs
  +0.09), the comparison a median (-0.02 vs 0.05).
- **Severity:** 3. Observed: Chen needed the moderator; Maren reached it by clicking a legend row
  on a guess; both biologists said they could quote the wrong sign.
- **Evidence:** 5 sessions, 4 participants. groups-differ (all 4), groups-differ-finished (Chen).
- **Recommendation:** "Compare Community 1 with the rest" on the selected row and in the result;
  one statistic in both places, labelled.

### 17. Paths show one route of many, ignore direction on money, and name no shared middle

- **What happens:** the form says every shortest path is drawn; the result shows "1 of 12" with a
  stepper; the default is undirected on transfers; "Create path to style" reads as styling; the
  node every route passes through is not called out.
- **Severity:** 3. Observed: Dana said the VP would ask about the other eleven; Marcus read the
  form's promise and the result as contradicting.
- **Evidence:** 4 sessions, 4 participants. how-connected (all 4). how-connected-by-amount
  (Priya) on direction.
- **Recommendation:** draw all ties together with the count; "every route passes through UBB";
  direction follows the data by default; "Keep path".

### 18. The weekly refresh and the table have no visible home

- **What happens:** nothing on a reopened project says "update with new data"; Replace is two
  levels down in the main menu and Add data is still the blue button; the table is not visible;
  two exports produce different things (the header's has the figure ticked and no format; the
  table's has rows, columns and a preview).
- **Severity:** 3. Observed: Dana's first instinct was Add data; Alex never found View > Table;
  Nadia reached for the wrong export.
- **Evidence:** 12 sessions, 9 participants. tree-test-homes (all 3), weekly-refresh-replace
  (both), this-weeks-export (Alex, Dana), top-50-to-excel (Chris, Alex), how-connected-by-amount
  (Nadia), top-200-past-limit (Chris), csv-to-reviewer (Chen: the methods file only on one route).
- **Recommendation:** "Update with new data..." on the project header; Replace is primary when the
  columns match; one table export reached from both places, always with its methods file.

### 19. Ids are formatted as quantities

- **What happens:** patent ids appear as 6,117,075 in some renders and 6117075 in others.
- **Severity:** 3. Said, but the consequence is concrete: a pasted id does not join.
- **Evidence:** 3 sessions, 2 participants. too-big-to-draw (Chris), costly-measure (Chris,
  Priya). Unchanged since round 2.
- **Recommendation:** never group digits in an id column; the export keeps the original string.

### 20. The first Ctrl+Z still takes the good step, and the undo line vanishes

- **What happens:** undo reverses the last step, which was the good one; Redo re-applies the bad
  one; the undo line and its "Show in steps" go after about 6 seconds; two quick undos replace the
  first message unread.
- **Severity:** 2 (down from 4). Observed in 7 sessions, and every participant recovered because
  the step stays in the list, unticked. Two sessions avoided Ctrl+Z on purpose and succeeded
  cleanly.
- **Evidence:** 7 sessions, 7 participants. get-back (all 5), fix-wrong-middle-step (Elena,
  student).
- **Recommendation:** keep the undo line until the next action; after two undos, say both; make
  the filter chip the visible way into the steps.

### 21. The steps list on one screen lacks the plain line the other screen has

- **What happens:** the filter chip mock shows "keeps only nodes with at least 5 neighbors among the
  60 it reads" under a step; the undo mock's list does not. "degree" is unexplained; "took out 20"
  does not show which 20; there is no edit control on the undo page.
- **Severity:** 2. Observed: readers found the wrong step by the biggest count, not by meaning.
- **Evidence:** 11 sessions, 7 participants. get-back (all 5), fix-wrong-middle-step (all 4),
  undo-middle-step (both).
- **Recommendation:** one steps list component with the plain line on every row; "took out 20" is
  a link that lists them; "connections" in place of "degree" in that line.

### 22. Which graph a degree counts is not said, and blank cells read as missing

- **What happens:** the walk and inspector say "degree 21" (full graph) next to "1 of 3 in filtered
  graph"; the table's full-graph column is blank where equal; two degree columns with no hint which
  to quote.
- **Severity:** 3 for screen-reader users (Morgan cannot see the mismatch), 2 otherwise.
- **Evidence:** 13 sessions, 11 participants. keyboard-walk (all 3), keyboard-walk-shift-arrow
  (all 3), keyboard-tp53 (Chen), get-back (Alex, Jordan), undo-middle-step (Alex),
  fix-wrong-middle-step (Dana), read-the-numbers (student), tree-test-homes (Elena).
- **Recommendation:** every degree says its scope in words, spoken and shown; fill every cell.

### 23. Finding a named node by keyboard is still undiscoverable, and the walk loses its start

- **What happens:** Ctrl+F does nothing on the walk page; Ctrl+K works but is shown nowhere and is
  labelled "Find a command"; going to a node selects it; after Tab to the table and back, the walk
  restarts at the first selected node; Shift+Down walks on the canvas but range-selects in the
  table; the app has no headings; the welcome is re-read every time focus returns.
- **Severity:** 3. Observed: Morgan used his one moderator question; Tomas needed four extra keys
  to drop the start node; Chen found Ctrl+K by GitHub habit.
- **Evidence:** 8 sessions, 6 participants. keyboard-walk (all 3), keyboard-walk-shift-arrow (all
  3), keyboard-tp53 (both). Focus groups: code-first (keyboard and screen reader, untested with a
  real reader).
- **Recommendation:** Ctrl+F opens Find on every page and the key sheet says so; going to a node
  moves the walk there without selecting; the walk keeps its start across Tab; headings on the
  panels, drawing and table; the long welcome only once. Run NVDA before round 4.

### 24. Group notes: the first click lands on the whole graph, and a note is not a record

- **What happens:** the empty panel's "Add note" says "about the selection" with nothing selected
  and writes a note about the graph; with the Note tool on, a click pins a note to one node; the
  saved group lives under another tab as "Sets and paths"; notes have no author, calendar date or
  source; "fixed" reads as repaired; "Detached -- Restore set" does not say what it restores.
- **Severity:** 3. Observed: Marcus failed and ended with his reason on one member; Alex's first
  click was wrong.
- **Evidence:** 5 sessions, 4 participants. notes-first-click (Alex, Marcus), remember-why (Sarah,
  Marcus, Alex). Focus groups: investigators (an author and time are not a source).
- **Recommendation:** with nothing selected, "Add note" first asks what the note is about and lists
  the kept sets; the note shows author, date and time; "fixed" becomes "frozen list"; "Restore set"
  says "back to the 14 accounts of Sep 21".

### 25. The data page leaves open exactly what IT asks first

- **What happens:** hosting and country, telemetry, self-hosting, turning the Assistant off for an
  organization, and a contact are marked "Owner decision open"; the Assistant key's storage is
  vague; the data-source line has no query text or connection security; nothing says logs and
  project files never carry the password.
- **Severity:** 3 (was 4; the rest of the page is praised and the gap is an owner decision, not a
  screen). It still blocks every regulated participant.
- **Evidence:** 9 sessions, 7 participants. data-stays-here (all 5), did-anything-leave (all 3),
  password-question (Priya). Focus groups: investigators and code-first.
- **Recommendation:** the owner decides the five items (they are one-way doors, see
  framework-changes.md); the summary box names credentials; password row adds "never in the log,
  the exported log or a project file"; the data-source line gets "See what was sent".

### 26. "Nothing sent" is small, not clickable, and reads as being about the Assistant

- **What happens:** "This browser. Nothing sent." is plain small grey text; clicking it does
  nothing; it has no time scope; on screens without it the only line is "Assistant: Off. Nothing
  is sent.", which people read as about the Assistant only.
- **Severity:** 2.
- **Evidence:** 12 sessions, 9 participants. data-stays-here (all 5), did-anything-leave (Sarah,
  Marcus), too-big-to-draw (Priya, Emma, Chris), costly-measure (Priya), who-matters (Jordan).
- **Recommendation:** make the line a link to "Where your data goes"; "Nothing has been sent from
  this project"; show it on every frame.

### 27. Sharing a recipe: what the recipient needs is not said

- **What happens:** nothing says what opens a .graphty file or whether a recipe can be applied from
  code; the layout travels as "force-directed, its settings"; "6 statistics" are not named;
  whether runs use the filtered graph is not said; the "Left behind" column is clipped.
- **Severity:** 3.
- **Evidence:** 4 sessions, 4 participants. share-without-data (all 4), plus recipe-missing-column
  (Chen: no seed, resolution or STRING version). Focus groups: code-first and switchers.
- **Recommendation:** name the layout and its parameters, list the statistics, state the order
  "filter, then runs"; a "What your recipient does" line; the file format and code route go to
  framework-changes.md as proposals.

### 28. Export for a figure: only PNG on a transparent background, and labels are hubs

- **What happens:** PNG at pixels is the only visible format; background defaults to transparent;
  labels are the top 12 by degree with no |value| option; 2 hidden for overlap without saying
  which; the Look menu is an unlabelled palette icon, and Print and Colorblind safe are exclusive.
- **Severity:** 3. Observed: gene names missing from the file ended the signed-gray task.
- **Evidence:** 9 sessions, 5 participants. figure-for-reviewer (all 4), print-ready-grey (all 3),
  gray-figure-signed (both).
- **Recommendation:** SVG and PDF with real text (proposal, framework-changes.md); white
  background default; "Top N by size of change"; label rule by threshold; say which labels were
  hidden; a labelled Look control; a gray-and-colour-blind option.

### 29. Communities: one modularity from one seed, and the headline count includes loners

- **What happens:** 0.716 with no reading; "the file's modules 0.663" unexplained; no stability
  over seeds; 10 communities include 2 single proteins; the hub column names outsiders (AKT1 for
  the ribosome).
- **Severity:** 2 (mostly said; one observed misreading of the hub).
- **Evidence:** 7 sessions, 5 participants. groups-differ-finished (all 3), groups-differ (Maren,
  Chen, Jordan, Mara).
- **Recommendation:** "8 groups and 2 unconnected proteins"; a plain reading of modularity; "Run
  with 10 seeds" showing membership stability; hub degree counted inside the group.

### 30. Leftover filter steps make a filtered number look like the answer

- **What happens:** the screen opened with three steps on, and "largest component 27" looked like
  the answer; a "Largest component" step that removes nothing switches everything into filtered
  mode with no reason.
- **Severity:** 3. Observed: Dana and Min-ji nearly answered 27.
- **Evidence:** 4 sessions, 4 participants. narrow-or-paint (all 4).
- **Recommendation:** a filtered statistic reads "27 (of the filtered 27 of 77)"; a no-op step
  says "found 1 piece; kept all 77".

### 31. Turning off a step strands nodes with no explanation

- **What happens:** components jump from 1 to 3 and grey dots float alone; the legend says "4
  more".
- **Severity:** 2. Observed: Elena and the student thought they had broken the graph.
- **Evidence:** 6 sessions, 6 participants. get-back (Elena, Jordan), fix-wrong-middle-step
  (Elena, student), undo-middle-step (Alex, Sarah).
- **Recommendation:** "3 nodes are no longer connected after group 8 came back" beside the count.

### 32. Counts that describe different things sit side by side

- **What happens:** Edges 2,298 (repeats kept) beside density on 1,262 distinct pairs;
  citationsReceived 779 beside in-degree 238 with the reason behind an isolates click; component
  size links dead; statistics laid out differently per screen.
- **Severity:** 3. Observed: Emma and Chris doubted the data for minutes; Chen found the density
  mismatch by sum.
- **Evidence:** 9 sessions, 7 participants. too-big-to-draw (all 4), neighbors-two-sizes (Mara),
  read-the-numbers (all 3), worth-an-afternoon (Elena).
- **Recommendation:** each count names what it counts ("1,262 distinct pairs"); the column note
  "counts citations from outside the sample" sits on the column; one statistics layout.

### 33. Comparison wording: A and B, "higher", and the scatter below the fold

- **Severity:** 2. **Evidence:** 7 sessions, 6 participants. rankings-agree (all 4),
  rankings-agree-scatter (both), this-weeks-export (Dana: "Compare with" under Appearance).
- **Recommendation:** measure names instead of letters; "ranked better by betweenness"; the
  scatter first at laptop size; "Compare" outside Appearance.

### 34. Small grey text and unlabelled icons

- **Severity:** 2. Measure against contrast and size rules rather than count votes.
- **Evidence:** about 14 sessions, 8 participants (Dana in 5 sessions, Mara, Marcus, Sarah, Chris,
  Priya, Chen, Nadia).
- **Recommendation:** secondary text at 12px minimum at 4.5:1; every icon button has a visible
  label or a tooltip on focus.

### 35. Size is one layer with two names, and a dot's value cannot be read

- **Severity:** 2. Both participants succeeded cleanly, so this is polish.
- **Evidence:** 2 sessions, 2 participants. read-size-key (Elena, Jordan).
- **Recommendation:** "Size: number of connections (degree)" everywhere; five ranges in the key;
  hover or select shows the value; say whether weights count.

### Single voices, kept but not ranked

- A typed rule or query box (Priya, in 4 sessions; the other investigators disagreed).
- Pair metrics (common neighbours, Adamic-Adar) and the user's own model score as a comparison
  side (Chris).
- Parquet import and export; Turtle / JSON-LD import (Chris; Min-ji). Format proposals.
- A second measure next to a node's degree: weighted degree or strength (Emma).
- A source-and-grade field on notes (Marcus).
- CJIS named on the data page (Marcus).
- Price and licence visible (Alex, Jordan).
- A gene-list start with the STRING query recorded (Maren; Mara disagreed).
- An R or Python route to apply a recipe and get the node table (Chen, Emma, Chris: strong in the
  code-first group, a fit question; proposal).

---

## Part 3: what to keep

These were praised by several participants, often observed as the moment trust was won:

- The load step refusing to load a text column, naming it, and giving each choice with its result
  in counts; the named rows and proteins that were dropped.
- The undo model: an undone step stays in the list unticked with "took out N, M left"; the undo
  line naming what it undid. (11 sessions praised it; its transfers version was the cleanest task of the round.)
- The run record with Copy: method, seed, normalization, weight conversion, scope, engine.
- Rank ranges on sampled runs and "Ranks below #2 may swap between runs".
- The refusal that prices each way forward before a costly run; "124,318 nodes not drawn" with a
  reason instead of a freeze.
- Counts before committing a step ("612 nodes, 1,843 edges, will draw"), and hop sizes before
  Neighbors (33 / 169 / 296).
- "Where your data goes" as a dated page with Print or save as PDF; "Files stay on this computer";
  "Nothing is uploaded" in every export footer.
- The gene match report: "84 of 96 matched", every miss named, the Excel-date catch.
- "No data inside" first in the recipe preview, with "Travels" and "Left behind".
- The plain first sentence of a comparison ("none of the top 10 are the same") and overlap at
  every Top N.
- Column headers that carry method and scope; the methods file beside every CSV.
- The on-canvas legend with counts, titled in plain words.
- The gray-clash warning naming the colliding values (keep it, but see finding 3).

---

## Focus groups in one paragraph each

- **Leaving Gephi or Cytoscape** (`focus-groups/switchers.md`): nothing may be lost silently on
  import (4; only Chen raised it unprompted); a complete copyable run record including layout,
  seed, filter in words, version and input hash (3); full columns with scope in CSV and SVG text
  kept as text (3); nameable groups (3, partly a numeric-label fixture); the weekly refresh must
  reproduce last week (3). Discount the unanimous run-record praise (prompted) and Maren's
  borrowed quit trigger.
- **Investigators** (`focus-groups/investigators.md`): a link with no date or source proves
  nothing (4; two independent, two adopted); no time range or timeline (3); the app vouching for
  itself is not approval evidence, the asks are a connection list and file hashes (3); no silent
  merges (3, three different fixes proposed). Discount: the dates snowball, and the note author
  shares Sarah's name -- rename it in the fixture.
- **Code-first and access** (`focus-groups/code-first.md`): settings are not shown where results
  are read or before a run (4; the "WF-corrected" closeness of 1.624 exceeds 1 with no header
  note); the data page is hidden in the main menu (3); a notebook widget (3, a fit question and a
  public API); imports from the user's own large file (3). All screen-reader judgements rest on
  intended output; run NVDA.
- **First contact** (`focus-groups/first-contact.md`): choices the tool made are not labelled as the
  tool's (4, observed in Elena); counts disagree between matching and after Apply and the cutoff
  shows only in export (4, check the mocks first); the recipe asks which fold-change column the
  sender meant (3, unfixed since round 1); "Use MDM2" turns a species mismatch into a typo fix
  (3); "did I change the sender's file?" (3).

---

## What round 4 should test

1. Fix Part 1 first: study mode that shows product text and hides design chrome; one fixture
   object per state with a disagreement check; a transfers page set for the flagged-account task.
2. The weight sentence (finding 1) and the per-measure weight question (finding 6), end to end on
   Les Miserables and on transfers, including a weighted path with its cost.
3. Dates on every path, a forward trace and time-order warnings (finding 2).
4. A signed gray figure that keeps both ends dark, with a gray preview and threshold labels
   (findings 3, 28).
5. The recipe with Apply held until the recipient's table is in (finding 4).
6. Past-the-limit rows and a measure run on an undrawn graph (finding 5).
7. The first screen after load and the "Update with new data" home, as a second tree test
   (findings 7, 18).
8. A real screen reader on the keyboard walk (finding 23).
9. At least one round with real people for the four severity-4 findings before large changes.
