# Round 2: what the study found

Round 2 of the simulated study of the graphty mocks: 105 task sessions with 19 simulated personas
across 30 tasks, and 4 focus groups (people leaving Gephi or Cytoscape; investigators; code-first
and screen-reader users; first-timers and people handed a file). 18 tasks repeat round 1 on the
revised mocks; 12 are new and aim at the changes made after round 1. Every participant is
simulated, built from the persona files in `../personas/`. Treat every finding as a hypothesis to
confirm with real people, not as proof.

How to read this page:

- **Severity** is Nielsen's scale: 0 not a problem (used for things to keep), 1 cosmetic, 2 minor,
  3 major, 4 catastrophe (the task cannot be done, the user leaves, or the user would report a
  wrong answer without knowing).
- **Sessions** counts task sessions where the problem was seen; **participants** counts distinct
  personas. Focus-group mentions are listed separately and never added to the session count.
- **Observed** means the participant did something: clicked the wrong thing, stopped, nearly
  reported a wrong number, lost work. **Said** means an opinion. A finding supported only by
  opinion is marked so and its severity is held down by one.
- **Mock or design.** Problems caused by the mocks themselves come first, in Part 1, and are not
  counted against the design.
- One participant saying something once is recorded under "single voices" and not ranked.

Session files are in `sessions/`, focus groups in `focus-groups/`. Round 1 is in
`../round-1/insights.md`.

---

## Task success and ease

Outcome codes: **success** (done, unaided), **with difficulty** (done, but after a wrong turn, a
guess, or a moderator step-in), **failed** (wrong or no answer). No one gave up. SEQ is the Single
Ease Question, 1 (very hard) to 7 (very easy), asked after each task.

### Tasks repeated from round 1

| Task | Sessions | Success | With difficulty | Failed | Completed | Mean SEQ | Round 1 SEQ |
|---|---:|---:|---:|---:|---:|---:|---:|
| A colleague's file: is it worth an afternoon? | 5 | 0 | 5 | 0 | 5 of 5 | 3.8 | 4.2 |
| Is it OK to use under strict data rules? | 5 | 1 | 4 | 0 | 5 of 5 | 5.2 | 3.8 |
| Who matters most, and how sure are you? | 5 | 0 | 5 | 0 | 5 of 5 | 4.2 | 3.4 |
| What groups are there, and how does the biggest differ? | 4 | 0 | 4 | 0 | 4 of 4 | 5.0 | 2.8 |
| Can these rankings be trusted? (weight trap) | 4 | 0 | 4 | 0 | 4 of 4 | 4.2 | 3.3 |
| Clear or refer a flagged account, starting from search | 3 | 0 | 1 | 2 | 1 of 3 | 2.0 | 2.0 |
| Citation data too big to draw | 4 | 0 | 4 | 0 | 4 of 4 | 4.2 | 4.3 |
| The biggest connected piece | 4 | 1 | 3 | 0 | 4 of 4 | 5.0 | 4.5 |
| A figure a reviewer can read, even in grey | 4 | 0 | 4 | 0 | 4 of 4 | 3.2 | 2.5 |
| Get back after an unexpected change | 5 | 0 | 4 | 1 | 4 of 5 | 3.4 | 4.0 |
| Do two scores agree on who matters? | 4 | 3 | 1 | 0 | 4 of 4 | 5.0 | 4.8 |
| This week's export: redo last week, show what changed | 3 | 0 | 3 | 0 | 3 of 3 | 4.0 | 2.7 |
| Use a colleague's recipe on your gene list | 3 | 0 | 3 | 0 | 3 of 3 | 4.0 | 3.7 |
| Share your setup without your data | 4 | 1 | 3 | 0 | 4 of 4 | 5.0 | 4.8 |
| Keyboard only: walk out from TP53 | 3 | 0 | 3 | 0 | 3 of 3 | 4.7 | 3.7 |
| How is this account connected to that one? | 4 | 0 | 4 | 0 | 4 of 4 | 3.5 | 2.8 |
| Measure who bridges groups on the whole citation graph | 4 | 0 | 4 | 0 | 4 of 4 | 4.8 | 4.5 |
| Leave yourself a note on why you kept these accounts | 3 | 0 | 3 | 0 | 3 of 3 | 4.0 | 3.3 |
| **Repeated tasks** | **71** | **6** | **62** | **3** | **68 of 71** | **4.21** | **3.65** |

### New tasks in round 2

| Task | Sessions | Success | With difficulty | Failed | Completed | Mean SEQ |
|---|---:|---:|---:|---:|---:|---:|
| Explain every count after filtering to one module | 3 | 0 | 3 | 0 | 3 of 3 | 3.3 |
| Top 50 by betweenness into Excel or pandas, and how sure | 3 | 0 | 3 | 0 | 3 of 3 | 4.7 |
| Answer IT: did anything leave, before and after a data-source query | 3 | 0 | 3 | 0 | 3 of 3 | 4.7 |
| Fix the wrong middle filter step without losing the third | 4 | 0 | 4 | 0 | 4 of 4 | 4.8 |
| Path between two accounts, weighted by amount, with dates | 3 | 0 | 2 | 1 | 2 of 3 | 3.0 |
| Keyboard only: find Javert, walk, select two neighbours | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 |
| Read a finished community detection result | 3 | 1 | 2 | 0 | 3 of 3 | 5.0 |
| A grey, colour-blind-safe figure with the top 10 labelled | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 |
| Run PageRank on a column you never thought about | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 |
| Weekly refresh by Replace, then export the table | 2 | 0 | 2 | 0 | 2 of 2 | 4.5 |
| Start from the alert and judge the account's neighbourhood | 2 | 0 | 2 | 0 | 2 of 2 | 4.5 |
| Do betweenness and PageRank agree? (scatter view) | 2 | 1 | 1 | 0 | 2 of 2 | 5.0 |
| **New tasks** | **34** | **2** | **31** | **1** | **33 of 34** | **4.18** |

### All of round 2

- **105 sessions: 8 success, 93 with difficulty, 4 failed.** 101 of 105 completed (96%); 8 of 105
  (7.6%) without a wrong turn, guess or step-in. Round 1: 63 of 71 (89%) and 1 of 71 (1.4%).
- **Mean SEQ 4.20 of 7** (round 1: 3.65). On the 18 repeated tasks alone, 3.65 rose to 4.21.
- **"Completed" overstates four tasks.** In these, the session was coded as done but a required
  part of the task could not be met on the screens, so read them as partial:
  - the grey figure, both versions (7 sessions): nobody could put up-versus-down direction on the
    figure, and nobody could confirm the written file was grey;
  - the path weighted by amount (all 3): the path ran unweighted and no transfer had a date;
  - finding Javert by keyboard (all 3): he cannot be found on any page that takes keys, so the
    walk was done from a stand-in node (this one is a mock limit).
  Counting those as partial, 89 of 105 (85%) fully met the task.

What moved:

- **The biggest gains are where round 1 found a missing screen and round 2 drew it:** groups
  (2.8 to 5.0), this week's export (2.7 to 4.0), the data rules page (3.8 to 5.2), who matters
  (3.4 to 4.2), the keyboard walk (3.7 to 4.7). The new finished community result, the rank
  ranges on sampled runs, the "Where your data goes" page and the Add-data warning carried them.
- **Two tasks got worse.** "Worth an afternoon" (4.2 to 3.8): the screen after Load contradicts
  the load step, in all 5 sessions (a mock seam, see Part 1). "Get back" (4.0 to 3.4): Ctrl+Z
  now silently undoes the good step first, and in one session unticking the wrong step then threw
  the good step away for good (see finding 2).
- **Still the hardest:** starting from a search for a flagged account (1 of 3, SEQ 2.0, the same
  as round 1), the path weighted by amount (3.0), the grey figure (3.2 and 3.7), and explaining
  counts after a filter (3.3). Starting from the alert instead worked (2 of 2, SEQ 4.5).
- Caution: SEQ from simulated participants is not calibrated against real users. Compare tasks
  and rounds with each other, not with published norms (about 5.5).

---

## Part 1: problems caused by the mocks, to fix before round 3

These cost the study signal but are not evidence about the design.

### Mock 1. The screen after Load is not the file that was loaded

- **What happens:** the load step reads `ppi-core-300-evidence.tsv` (298 nodes, 2,298 edges with
  Keep all, GSK3B and NOTCH1 named as dropped). The next screen is the GraphML protein sample:
  300 nodes, 1,262 edges (the Merge count), "2 isolates", a file chip reading
  "ppi-core-300.g...", and module colours from a column the TSV does not have.
- **Severity for the study:** 4. Every participant made the count check, and every one stopped
  trusting every number on screen. "That's my screen-says-4,000, download-says-3,100 thing."
  (Jordan)
- **Evidence (observed):** 5 of 5 worth-an-afternoon sessions (Elena, Alex, Jordan, Tom, Dana).
- **Recommendation:** add a `ppi-evidence` dataset to `kit/fixtures.json` built from the TSV with
  Keep all, and make frame-at-rest continue from it. The design lesson that survives is finding 7
  (load choices must stay visible after load).

### Mock 2. The dataset changes partway through a task

- **What happens:** Les Miserables appears on the filter-chip and Find pages during protein,
  citation and account tasks; the results panel opens on patent citations for protein and
  Les Miserables tasks; notes are drawn only on proteins for an accounts task; the keyboard walk
  holds only proteins, so Javert cannot be found; "Compare rankings..." on the protein table opens
  the payments comparison; the export dialog shows another project.
- **Severity for the study:** 3. Participants blamed themselves ("Did I load the wrong thing?"),
  and in read-the-numbers and the Javert task the core step could only be done by analogy.
- **Evidence (observed):** about 30 sessions, 17 participants. All 3 read-the-numbers, all 3
  keyboard-walk-shift-arrow, all 3 remember-why, all 3 flagged-account, 3 of 4 too-big-to-draw,
  quiet-weight-trap (Chris, Mara), groups-differ (Chen, Jordan), costly-measure (Min-ji),
  figure-for-reviewer (Tom), this-weeks-export (Dana: no supplier data at all),
  how-connected-by-amount (Sarah), flagged-account-from-alert (Nadia, Sarah on the reference
  pages), rankings-agree-scatter (the student).
- **Recommendation:** one dataset per task path, end to end. Add a protein module filter state to
  filter-chip, a Les Miserables state to keyboard-walk, account data to notes-panel, and a supply
  chain dataset for the supply-chain persona.

### Mock 3. Two mocks of the same state still disagree

- **What happens:** 105 against 106 edges and density 0.278 against 0.280 for the same filter
  (filter-chip against undo and Find); 157 against 158 edges; 1,904 against 1,843 edges and 1 against
  44 components for the same rule; a hub neighbourhood whose in-degree maximum (217) is lower than
  one of its own hubs (236); a components list that adds up to more than the total; degree
  "1 to 842" in version history against "0 to 842" in the replay report; Betweenness defaulting to
  directed with 101 sources on the options form but undirected with 50 on the results panel;
  "weight: confidence" at rest but "no weight" in the results panel for the same network.
- **Severity for the study:** 4. Every expert who spotted one said they would stop trusting the
  tool ("The day I find a number I can't reconcile in front of a client, I am back in networkx
  for good." -- Emma). All four costly-measure sessions stalled on the direction and sample-size
  mismatch.
- **Evidence (observed):** 21 sessions, 13 participants: too-big-to-draw (Priya, Emma, Min-ji,
  Chris), get-back (Alex, Jordan, Sarah), costly-measure (all 4), who-matters (Maren),
  read-the-numbers (Chen), weight-at-first-run (Min-ji, the student), this-weeks-export (Min-ji),
  weekly-refresh-replace (Alex), narrow-or-paint (Emma), fix-wrong-middle-step (Dana).
- **Recommendation:** round 1 asked for every count to come from the fixtures; finish that. Every
  statistic on every page is computed by `kit.js` from `fixtures.json`, and `check.mjs` fails when
  two pages name the same state with different values. The design lesson is finding 5.

### Mock 4. The Les Miserables fixture has lost an edge

- **What happens:** the OldMan to Myriel edge is stored as a self-loop on Myriel. OldMan becomes an
  isolate, "Largest component" drops 1 of 77 on a graph that experts know is connected, the
  statistics leave the self-loop out (253 edges counted, 254 shown), and Myriel's betweenness falls
  from about 0.18 to 0.151.
- **Severity for the study:** 3. Five experts recognised the dataset and doubted the importer or
  the algorithm.
- **Evidence (observed):** 6 sessions, 5 participants: quiet-weight-trap (Emma, Alex, Mara),
  narrow-or-paint (Alex, Emma), who-matters (Mara).
- **Recommendation:** fix the edge list in `kit/fixtures.json` and regenerate every Les Miserables
  number. If a task needs an isolate, add a named one and say so in the task.

### Mock 5. Stale renders, dead controls and design notes visible to participants

- **What happens:** PNGs in `shots/` older than their pages (old wording, old colour directions,
  missing warnings); controls that do nothing (Compare with..., Details on the comparison, the
  project menu, PageRank in the catalog, Add step, the Weight dropdown, info icons, the legend);
  and design annotations shown in the participant view ("waits on graphty-element", "blocked",
  "the owner's decision", pink dashed boxes), which participants read as broken product.
- **Severity for the study:** 2.
- **Evidence (observed):** stale renders in 7 sessions (Priya, Alex, Morgan, Emma, Min-ji, Elena,
  Tomas); dead controls in about 15 sessions; annotations read as product in 9 sessions (Maren,
  Priya, Marcus, Chris, Alex, the student, Elena, Dana, Sarah).
- **Recommendation:** re-shoot every PNG before a round (`node kit/shoot.mjs` over the task
  pages); hide annotations in the participant view; wire every control a task path touches, or
  label it "not in this mock".

---

## Part 2: design findings, most severe first

### 1. Relationships have no date, so no path or neighbourhood can be defended

- **What happens:** no transfer on any screen shows when it happened: not the account panel, the
  Edges table, the path's walk list, nor the export. Investigators cannot check "in 30 days",
  pass-through or layering, and a shortest path can run backwards in time without warning.
- **Severity:** 4 for investigators.
- **Evidence (observed):** 10 sessions, 4 participants: how-connected-by-amount (Sarah, Nadia,
  Priya: all rated it 4), flagged-account-from-alert (Nadia, Sarah), flagged-account (Sarah,
  Priya, Marcus), how-connected (Sarah), plus too-big-to-draw (Priya: no time range anywhere).
  Investigators focus group theme 1 (one independent voice, two reasoned adoptions).
  "Step is not a time. If step 2 happened before step 1, this isn't a chain, it's a coincidence."
  (Priya)
- **Fidelity note:** the kit's transfer fixtures already carry timestamps; the mocks just never
  show them. What is new design is the time check on a path.
- **Recommendation:** every relationship with a time column shows it in the Edges table, the walk
  list and every export; a time-range filter step; a path's hops listed in date order, with a
  plain warning when a hop happens before the one it follows.

### 2. Undo silently takes out the step you wanted to keep, and unticking can lose it for good

- **What happens:** the three filter steps are 76, 41, 28; the middle one is wrong. The first
  Ctrl+Z reverses the last step (the good one) with no message; only the chip count changes.
  Once undone, a step vanishes from the steps list, so it cannot be ticked back. Unticking the
  wrong step then clears Redo, and the good step is gone from the list, Redo and Undo history.
- **Severity:** 4 (work lost without the user knowing).
- **Evidence (observed):** 7 sessions, 7 participants. get-back: Elena, Alex, Jordan, Dana
  (silent undo, recovered with Redo), Sarah (lost the step permanently and failed: "That's me
  reconstructing my own work from a legend."). fix-wrong-middle-step: Alex, the student (reached
  for Ctrl+Z first and removed the step to keep). Elena said she would have done the same.
- **Recommendation:** every undo and redo shows what it reversed ("Undid Filter out group 8.
  Redo") with a link to the steps list; an undone filter step stays in the list, greyed, marked
  "undone"; ticking a step on or off is its own reversible action and does not discard redo.

### 3. A figure for a reviewer: the gray check misleads, direction cannot be shown, and only PNG
comes out

- **What happens:** four linked problems. (a) "View as Gray" in the export dialog only previews
  gray; the file is written in colour, which a small note says, and a student would have sent a
  colour file. (b) When the preview shows modules collapsing to one gray, nothing points to the
  Print look that would fix it. (c) "Color by log2FoldChange to show the direction" is a sentence
  with no control, so nobody put up-versus-down on the figure. (d) The only format is PNG.
- **Severity:** 4.
- **Evidence (observed):** 7 sessions, 6 participants: figure-for-reviewer (Maren, Chen, Tom,
  Jordan) and print-ready-grey (Maren, Chen, the student). Gray preview with no fix or misread as
  the setting: all 7. Direction never shown: all 4 figure-for-reviewer sessions. PNG only: Maren
  and Chen in both tasks ("A PNG is not a figure." -- Chen). Switchers focus group theme 5.
- **Recommendation:** in the export dialog, when the gray preview shows colours colliding, say
  which ones and offer "Use the Print look" in place; say in the dialog which look the file will
  be written with. Make the direction note a button that adds a diverging colour layer centred
  on zero. Offer SVG and PDF with real text (a published format: propose in
  `framework-changes.md`).

### 4. The recipe offers the network's own fold-change column as if it were yours

- **What happens:** the recipe dialog enables Apply and says "Everything was found by name"
  before the recipient has added their table, using a `log2FoldChange` column that came inside
  the colleague's network. With the table added, the picker offers that column next to the
  table's `log2FC`; the network's column has the matching name and 300 values, so it looks right.
- **Severity:** 4 (a confident, wrong figure).
- **Evidence (observed):** 3 of 3 use-colleagues-file sessions. Tom caught it only because
  152 + 148 = 300 and his sheet has 96 rows; Maren had her cursor on Apply; Elena picked the wrong
  column and said she would have pressed Apply. First-contact focus group theme 1 (raised to 4
  because it survived the revision).
- **Recommendation:** the recipe author marks which inputs come from the recipient; Apply stays
  off until they are supplied; a column from the recipe's own network is never offered for a
  "your data" input; when the recipient's table lacks the column, say "ask the sender".

### 5. A weight that was chosen is not the weight that was used, and nothing says so plainly

- **What happens:** the path tool shows Weight "amount", but the path runs on hop count; the only
  sign is a grey line, "Paths ignore amount: hops were counted, not dollars", under a header that
  says "(unweighted)". For PageRank, an unanswered weight meaning is quietly used as a strength,
  while paths and Betweenness ignore it; the only place this is said is a hover card on a
  Betweenness form. Results then echo the choice back in other words ("confidence as similarity")
  or not at all ("Unweighted").
- **Severity:** 4 (a user would write "weighted by amount" in a case file).
- **Evidence (observed):** 10 sessions, 9 participants: how-connected-by-amount (Sarah, Nadia,
  Priya: "The box said amount and it quietly didn't." -- Nadia), weight-at-first-run (the student,
  Jordan, Min-ji: "The same unanswered state does two opposite things depending on the measure."),
  quiet-weight-trap (Alex, Chris: cannot find where the meaning is set). Plus 1 stated: Mara.
  Code-first focus group theme 1; switchers theme 7.
- **Recommendation:** a run that cannot use the chosen weight refuses, like the filtered-scope
  refusal, and says what to answer; an unanswered meaning means "not used" for every measure;
  every weighted result's state line repeats the user's own answer ("amount: bigger is a
  stronger tie").

### 6. The data page leaves open exactly what IT asks first

- **What happens:** "Where your data goes" was praised in every session as the thing to attach to
  an approval ticket. But hosting and country, usage statistics and crash reports, running your
  own copy, turning the Assistant off for a whole organisation, and a contact all read "owner
  decision open". Where a data-source sign-in is stored is not listed.
- **Severity:** 4 for adoption (every participant said the review stops there). This is an owner
  decision more than a screen problem.
- **Evidence (observed):** 8 sessions, 7 participants: data-stays-here (Priya, Sarah, Marcus,
  Chen, Alex) and did-anything-leave (the IT reviewer, Sarah, Marcus). "I can't send a page to IT
  that says 'to be decided.'" (Marcus). Investigators focus group theme 2.
- **Recommendation:** the owner fills in the five open rows; add credential storage and a
  "CJIS / regulated data" line; state the Content-Security-Policy if one exists, so "no other
  sites" is enforced rather than promised. Until then, do not ship the page with open boxes.

### 7. After loading, the choices made at load vanish

- **What happens:** the load step records "NA as missing", "Keep all" and "150 edges without a
  weight", then the main window shows only "weight: confidence". A user cannot tell which choice
  produced the edge count, or remember the 150 blank weights.
- **Severity:** 3.
- **Evidence (observed):** 3 sessions: worth-an-afternoon (Alex, Dana, Tom looked for them).
  Stated: Chen (read-the-numbers: "150 of what?").
- **Recommendation:** the file popover and Statistics carry a "Loaded with" line (read-as choices,
  merge rule, counts dropped or unweighted), and it travels in the run record.

### 8. A count that does not name the graph it was counted on reads as a contradiction

- **What happens:** this was round 1's most severe finding; funnel marks and "degree on: full
  graph" now help, but the gaps left cause the same misreadings. Statistics' "largest component"
  counts after all steps while the step says 76; the walk card says "degree 21" in a 33-of-300
  view with 3 neighbours visible; two degree columns carry no hint which to report; "4
  components" appears with "Largest component" still ticked and no explanation on the undo page.
- **Severity:** 3 (was 4).
- **Evidence (observed):** 12 sessions, 10 participants: narrow-or-paint (Dana nearly reported 28,
  Min-ji 58, Alex read 28 as the answer), keyboard-walk (Morgan, Emma, Priya), keyboard-walk-shift-
  arrow (Emma, Tomas), read-the-numbers (the student), fix-wrong-middle-step (Alex, Dana).
  "If I had stopped there I would have reported 58." (Min-ji). The funnel mark itself went unseen
  by Dana and the student.
- **Recommendation:** name the scope in words beside the number, not only in an icon ("in the
  filtered graph: 28 of 77"); the walk card says "3 of 21 shown"; when a later step splits an
  earlier one's result, the undo page says so too.

### 9. Filter steps: the chip does not look like a button, and the cross-step notes read as errors

- **What happens:** the filter chip, the one-click route to the steps list, is small grey text
  that reads as a label; people found it last, after undo failed. Inside, the note "3 dropped
  below degree 5 by Filter out group = 8" explains an earlier step by a later one, and read as a
  contradiction or an error. Step counts show what is left, not what each step removed, and the
  column has no heading.
- **Severity:** 3.
- **Evidence (observed):** chip missed or found by accident in 9 sessions (get-back: Elena, Alex,
  Jordan, Dana; fix-wrong-middle-step: Elena, Dana, the student; narrow-or-paint: Alex;
  too-big-to-draw: Min-ji). Notes misread in 8 sessions (fix-wrong-middle-step: Elena nearly
  turned off the step to keep, the student; get-back: Sarah, Jordan; narrow-or-paint: Dana,
  Min-ji; read-the-numbers: Elena, the student).
- **Recommendation:** draw the chip as a button with a caret; show "took out 35" beside "41 left";
  word the note from the reader's side ("3 of these fell below degree 5 once group 8 was removed
  below") and never style it like a warning.

### 10. Communities: a group cannot be picked up, listed or taken away

- **What happens:** the finished community result is the round's biggest improvement (SEQ 2.8 to
  5.0). But clicking a group's row or legend entry does nothing visible, there is no inspector
  view of a run's group and no member list, and it is unclear whether a per-node membership column
  exports. The next step, enrichment or reporting the members, dead-ends.
- **Severity:** 3.
- **Evidence (observed):** 6 sessions, 5 participants: groups-differ (Maren, Chen, Jordan, Mara:
  "I want the 62, sorted, so I can grab the top ten." -- Jordan), groups-differ-finished (Chen,
  Mara: "That's the summary, not the partition.").
- **Recommendation:** a group row selects its members and opens an inspector view (members by a
  chosen measure, edges in and out, Copy ids, Create set); the Nodes table gets the membership
  column and exports it.

### 11. "What makes this group different" is one column somebody else chose

- **What happens:** the group-against-the-rest comparison shows one data column (log2FoldChange),
  with no way to choose others and no spread or test; overlap with the file's modules is a count,
  not an enrichment.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 groups-differ sessions (Maren, Chen, Jordan, Mara). Chen and
  Maren want enrichment p-values, which graphty does not do.
- **Recommendation:** let the reader choose the compared columns; show spread (and, for a numeric
  column, a simple test with its name). Enrichment stays out of scope; say so, and make the member
  list easy to copy out (finding 10).

### 12. "How sure" is answered for sampled runs but not for exact ones, and does not leave the app

- **What happens:** round 1's second-most-severe finding. Rank ranges ("#3 to #7") and "Ranks
  below #2 may swap between runs" were praised by nearly everyone. Left open: an exact run gives
  no cue ("It does not say the ranking is meaningful" read as "the tool won't vouch for it");
  agreement between measures is shown one node at a time; ranges exist for the top 5 only, and
  the CSV writes a bare integer rank.
- **Severity:** 3 (was 4).
- **Evidence (observed):** 8 sessions, 7 participants: who-matters (Alex, Jordan, Maren, Mara,
  Elena: "So it's exact but it might not mean anything? Then how sure am I?"), top-50-to-excel
  (Chris, Alex, Emma: "For number 40, 45, 50, how sure is it?").
- **Recommendation:** an exact run states near-ties in words ("#3 and #4 are within 1%"); a top-N
  table with each measure's rank side by side; the CSV carries low and high rank and the error
  bound as columns.

### 13. Scope and settings do not travel with the numbers

- **What happens:** the state line and run record were the most praised elements in the study.
  But they leave the app only by a Copy button: the CSV header names the scope, not the
  normalisation, seed or tool version, and no run record names a graphty version.
- **Severity:** 3.
- **Evidence:** observed in 5 sessions (top-50-to-excel: Emma, Chris; groups-differ-finished:
  Chen, Mara, Jordan). Switchers focus group theme 1 (all four, severity 4, stated); code-first
  theme 1.
- **Recommendation:** the CSV export writes a sidecar methods file (or comment line) with the full
  run record, including the graphty-element version; short column headers, provenance beside
  them.

### 14. An unused numeric column is invisible

- **What happens:** Les Miserables has a co-appearance count on every edge, but Statistics says
  "no weight" and the Weight field "None declared" in a grey box that looks disabled. Nothing says
  a numeric column is sitting there unused. The payments comparison runs unweighted with an amount
  column available.
- **Severity:** 3.
- **Evidence (observed):** 7 sessions, 6 participants: quiet-weight-trap (Emma, Alex, Chris,
  Mara: all four), rankings-agree (Emma, Mara), read-the-numbers (Chen).
- **Recommendation:** "no weight" becomes "value (number) present, not used"; the Weight select
  lists numeric columns and, on choosing one, asks the meaning question.

### 15. The weight-meaning question uses words that fit neither confidence nor money

- **What happens:** "similarity / distance / capacity", "unknown role", "1/w" do not map onto "how
  sure the link is real" or "dollars moved". The hint "Read as a distance. Not used while its
  meaning is not set." reads as a contradiction. At load, "Weight" means kilograms to one reader
  and "sized by" to another.
- **Severity:** 3.
- **Evidence (observed):** 10 sessions, 9 participants: weight-at-first-run (the student,
  Jordan), how-connected-by-amount (Sarah, Nadia, Priya), worth-an-afternoon (Elena, Jordan, Tom,
  Dana). "It's the amount. It's dollars." (Nadia)
- **Recommendation:** ask in the column's terms ("Bigger confidence means: more sure the link is
  real / closer / farther"), drop the "Read as a distance" hint until answered, and keep the
  technical term as secondary text only.

### 16. Starting from a search for an account still fails; starting from the alert works

- **What happens:** searching the id in the open project returns "0 matches" and stops, with no
  hint of which project holds it. The alert-first flow (queue, Find, account panel, hop menu)
  let both participants decide. In it, the neighbours button is an unlabelled split button whose
  main half selects nine points inside a density drawing instead of showing them.
- **Severity:** 4 for the search route, 3 for the neighbours button.
- **Evidence (observed):** flagged-account 3 of 3 (Sarah and Marcus failed; Priya only reached a
  verdict through another case's export). flagged-account-from-alert 2 of 2 (Nadia, Sarah:
  "It circled nine things in the blob. It didn't show me them.").
- **Recommendation:** "0 matches here; found in Transfers, March 2026 -- open" across projects;
  label the neighbours button and make its main action Filter to neighbours when the graph is
  past the drawing limit.

### 17. Paths: the tool appears only once exactly two nodes are selected

- **What happens:** "Paths between..." is the right tool and was praised once found. But there is
  no way to add a second Find result, and nothing on one node, in Find or in Quick actions leads
  to it. Direction defaults to undirected on money; one of 12 equal paths shows at a time.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 how-connected sessions (Sarah, Marcus, Chris, Dana: "The search
  box let me find one account and then fought me on the second."). Direction: Sarah, Marcus, Dana,
  Priya. One at a time: all 4 plus how-connected-by-amount (Sarah, Nadia, Priya).
- **Recommendation:** "Path to..." on the one-node inspector and in Quick actions, with a To field
  that searches; direction follows the data when edges are directed; list all equal paths with
  "7 of 12 go through X".

### 18. The weekly refresh: the way in is hidden and Replace sounds like losing last week

- **What happens:** the Add-data warning now stops the double count and was praised. But an open
  project shows no Update or Replace command; the Last import row opens a read-only history;
  "Replace data" reads as destroying last week; the results panel says "Needs action" where the
  history says it replayed; and "65 communities, was 35" comes with no explanation (26 of the new
  ones are accounts with no transfers).
- **Severity:** 3.
- **Evidence (observed):** entry point hidden in 5 sessions (this-weeks-export: Alex, Dana, Min-ji;
  weekly-refresh-replace: Dana, Alex); Replace feared in 3 (Alex, Dana twice); the 35 to 65 jump
  in 4 (Alex twice, Dana, Min-ji).
- **Recommendation:** "Update with a new export..." in the File menu and on the Last import row,
  described as "keeps your styles, sets, notes and runs"; the replay report separates new
  single-account groups from new real groups.

### 19. There is no visible way to open the table, and two exports disagree

- **What happens:** no toolbar icon reads as "table". People fell back on "Export files...", whose
  Tables checkbox names no format or columns and can export a filtered 157 rows without saying the
  full list is 3,093, while the table's own "Export table as CSV..." shows rows, order and a
  preview.
- **Severity:** 3.
- **Evidence (observed):** 9 sessions, 6 participants: weekly-refresh-replace (Dana, Alex),
  top-50-to-excel (Alex clicked the wrong export), how-connected-by-amount (Nadia),
  this-weeks-export (Alex, Dana, Min-ji), worth-an-afternoon (Jordan, Dana: "I bet I get a
  picture when I want a CSV.").
- **Recommendation:** a labelled Table button; one table export (the CSV dialog), reached from
  both places; any filtered export states "157 of 3,093 rows, filtered".

### 20. Ids are shown as quantities

- **What happens:** patent ids appear as "6,117,075" in the table, Find and inspector, and as
  "5879702" in Top nodes. Users fear the CSV writes the comma form and breaks their joins.
- **Severity:** 3 for code-first users (a reason to leave).
- **Evidence (observed):** 7 sessions, 5 participants: too-big-to-draw (Emma, Chris),
  costly-measure (Priya, Min-ji), top-50-to-excel (Chris, Alex, Emma).
- **Recommendation:** id columns are text, shown and written exactly as loaded; state this in the
  CSV dialog.

### 21. Past the drawing limit the rows are blocked and the only offered view is hubs

- **What happens:** at 124,318 nodes the table shows headers and "rows blocked", so the top 50
  cannot be read or confirmed to export; the only offered subset is the top 3 by degree with
  neighbours, which experts call the least interesting view.
- **Severity:** 3.
- **Evidence (observed):** top-50-to-excel 3 of 3 (Chris, Alex, Emma); hub-only sample in 4
  (too-big-to-draw: Priya, Min-ji, Chris; costly-measure: Priya). Code-first focus group theme 4.
- **Recommendation:** a paged table past the limit, sorted by the result; offer "top N by this
  result, with neighbours" and "around this node" as subsets.

### 22. Comparison: a misleading label, a fixed top-k, and no plain verdict

- **What happens:** "Spearman (ties inflate this)" is statistically wrong to experts (rho and tau
  are on different scales; the tie block lifts tau-b too); "top 5 in both" takes k from another
  panel's list; a "90%" canvas zoom sits over the statistics and reads as a confidence level; and
  no sentence says in words whether the two agree. "Compare with..." sits in Appearance in one
  state and below the fold in another.
- **Severity:** 3.
- **Evidence (observed):** label: 4 sessions, 3 participants (rankings-agree Emma, Mara, Chen;
  scatter Emma); fixed k: 5 (Emma, Chris, Mara, Chen; scatter Emma); 90%: 4 (Emma, Chris, Chen;
  scatter Emma); no verdict: the student (scatter), this-weeks-export (Alex, Dana: "If I put
  'tau-b 0.781' on a slide ... I'm dead."); Compare with not found: Dana (moderator had to point),
  Chris, Mara, Chen.
- **Recommendation:** drop "ties inflate this"; add tau on accounts outside the tie blocks and a
  k control with overlap at several k; move zoom off the comparison header; lead with a sentence
  ("They agree on the bottom, not on the top: 0 of the top 5 are shared"); put Compare with... in
  the result's action row in every state.

### 23. The keyboard walk works; getting to a named node does not

- **What happens:** the walk was praised by every keyboard participant. But there is no way to
  find a node by name from the walk: Quick actions answers a person's name with "No commands
  match". Reaching the drawing takes 11 to 17 Tabs, and F6 is not shown. Ctrl+K on a node selects
  it, so "select two neighbours" ends with three selected. The walk opens in weight order, and the
  degree order key (O) is only in the key sheet. The walk page has no headings.
- **Severity:** 4 for screen-reader users (the find part fails), 3 otherwise.
- **Evidence (observed):** keyboard-walk-shift-arrow 3 of 3 (Morgan, Emma, Tomas; partly a mock
  limit, since Javert is not in the walk page); Tab count: Priya, Emma, Tomas; find-selects: Emma,
  Tomas; weight order: Morgan, Emma, Priya (keyboard-walk), Morgan again. Code-first focus group
  theme 7.
- **Recommendation:** Ctrl+K searches node names with "No node called javert" when absent, and
  moves focus without selecting; show "F6: next region" in the frame; announce the O key on
  entry; add headings to every region.

### 24. Notes are not a record a case file can hold

- **What happens:** notes quote the value they relied on and warn when it changes, which was
  praised. But they have relative times ("2h"), no author, no edit history, no source field and
  no export; "Detached / Restore set" and "Use current" are not explained; the empty panel has no
  add button; the Notes section sits below Appearance.
- **Severity:** 3.
- **Evidence (observed):** 3 of 3 remember-why (Sarah, Marcus, Alex); also flagged-account (Sarah,
  Priya, Marcus: no disposition). Investigators focus group theme 4.
- **Recommendation:** absolute date and author on every note, an edit trail, an optional
  source field, notes in the findings export; a note on a set freezes its member list; an add
  button in the empty panel; Notes above Appearance on sets.

### 25. The catalog names methods, not questions

- **What happens:** Betweenness, Katz, HITS, Harmonic with no task words; Degree is missing from
  Centrality; no measure reads a partition for "bridges between groups"; Louvain versus Leiden has
  no guidance.
- **Severity:** 3.
- **Evidence (observed):** 11 sessions, 9 participants: who-matters (Jordan, Elena, Maren),
  narrow-or-paint (Dana), groups-differ (Chen, Jordan), costly-measure (Emma, Priya, Chris, Min-ji
  all answered "high betweenness" instead of "bridges groups").
- **Recommendation:** a plain line under each method ("who sits between groups"), Degree in the
  list, a group-aware bridging measure (participation coefficient) after a community run, and a
  "use this if unsure" mark.

### 26. Graph vocabulary blocks non-technical readers

- **What happens:** degree, component, isolate, density, node, edge, parallel edges, Ends, Role,
  hop. Non-technical participants guessed, skipped, or chose by position.
- **Severity:** 3 for them (stated and observed).
- **Evidence (observed):** 14 sessions, 7 participants: Elena (fix-wrong-middle-step, get-back,
  read-the-numbers, worth-an-afternoon), Dana (fix, get-back, narrow, how-connected), the student
  (fix, read-the-numbers), Sarah (flagged-account), Tom and Jordan (worth-an-afternoon). "'Degree'
  to me is a temperature." (Dana). First-contact focus group theme 10; investigators theme 5.
- **Recommendation:** a one-line meaning on hover for every statistic, and reader words in step
  labels ("at least 5 connections").

### 27. Size and colour show two measures, and size is read as importance

- **What happens:** size by degree with a "1 / 10 / 34" key and no unit; colour by a log-scaled
  measure that turns nearly every node the same brown. People read the biggest dot as the most
  important and could not say which measure they were looking at.
- **Severity:** 3.
- **Evidence (observed):** 6 sessions, 5 participants: worth-an-afternoon (Elena, Tom: "the most
  connected proteins are 'Other'?"), who-matters (Jordan, Maren, Elena), read-the-numbers (Elena).
  First-contact focus group theme 2.
- **Recommendation:** the size key says "number of connections"; the key says who chose the
  encoding ("set automatically"); a result painted on the map uses one channel, not two.

### 28. The share-a-recipe file: what it is and who can open it

- **What happens:** everyone praised "No data inside" and the "Left behind" list. But ".graphty,
  opens in graphty or any app with graphty-element" says nothing about whether it is readable
  text, scriptable, or openable by a lab on Cytoscape, R or Gephi. Recipe and Style file overlap;
  the section is below the fold; "overview readings" is opaque; the layout does not travel.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 share-without-data (Maren, Chen, Mara, Emma). Layout: Mara.
  Switchers focus group theme 8.
- **Recommendation:** state the format in one line ("a readable JSON file, documented at ...")
  and propose the format and its schema in `framework-changes.md` (a published file format is a
  one-way door); drop the separate Style file row or say it is contained; list the layout with
  its parameters.

### 29. The Assistant line says what could be sent, not what was

- **What happens:** "Assistant on: sends names and statistics" does not say whose names, is in the
  present tense, and does not say whether anything has left yet. No state shows the line after a
  data-source query, and there is no record of what left.
- **Severity:** 3.
- **Evidence (observed):** 9 sessions, 8 participants: data-stays-here (Priya, Sarah, Marcus,
  Chen, Alex), did-anything-leave (the IT reviewer, Sarah, Marcus: none could answer the
  after-query half from the app).
- **Recommendation:** "Assistant on: sends node names and up to 10 values per column to
  Anthropic when you ask" and, after a send, "Sent to Anthropic at 14:02 -- see what"; draw the
  post-query state ("Sent to warehouse.example.org: your query").

### 30. Communities: colours too close, and the headline figure unexplained

- **What happens:** Communities 1 and 8 are amber and yellow, 9 and 10 share a grey, 7 is black on
  black edges; the same proteins change colour between the module and community layers; "the
  file's modules 0.663" beside modularity 0.716 took several reads; modularity has no reference.
- **Severity:** 2.
- **Evidence (observed):** colours in 6 sessions (groups-differ: Maren, Jordan, Mara;
  groups-differ-finished: Jordan, Mara, Chen); the label in 6 (Maren, Jordan, Mara, Chen, and
  Jordan and Mara again).
- **Recommendation:** a palette checked for neighbours and grey; "modularity of your module
  column: 0.663"; let groups be renamed, defaulting to the dominant file label.

### 31. Shorthand in results: "all 31=", "middle", "291="

- **What happens:** "zero: 46 nodes, all 31=" read as a typo or truncation; "middle" is not
  "median"; "#1,780=" and "291=" need decoding.
- **Severity:** 2.
- **Evidence (observed):** 10 sessions, 9 participants: quiet-weight-trap (Emma, Alex, Chris,
  Mara), narrow-or-paint (Alex, Dana, Min-ji), read-the-numbers (the student), who-matters
  (Maren), rankings-agree (Chen).
- **Recommendation:** "46 nodes score 0, tied at rank #31"; "median".

### 32. The answer sits at the bottom of the result, cut off

- **What happens:** Top nodes is under Scope, Weight, Appearance and Distribution and shows 4 or 5
  rows at 1440 by 900; the Run record popover covers the canvas.
- **Severity:** 2.
- **Evidence (observed):** 8 sessions, 6 participants: who-matters (Alex, Maren, Mara, Elena),
  top-50-to-excel (Chris, Emma), groups-differ (Chen, Mara: popover).
- **Recommendation:** Top nodes first, 10 rows; the run record opens in the side panel.

### 33. Small grey text and unlabelled icons

- **What happens:** 11 to 12px grey labels, the funnel mark and rail captions were missed or
  unreadable; the lightning bolt, the flask (Results), the note tool, the keep-as-group icon and
  path export icons have no labels.
- **Severity:** 2.
- **Evidence (observed):** grey text in 9 sessions (Dana 3 times, Mara, Chris, Chen, Priya, Alex,
  Min-ji); icons in 9 (Jordan twice, Dana, Emma, Marcus, Alex twice, Sarah, Chris).
- **Recommendation:** secondary text at 12px or larger at the contrast of body text; label every
  toolbar icon on hover with its name and key, and give the rare ones a text label.

### Single voices, kept but not ranked

- Paths are disabled past the drawing limit, where bank data lives (Sarah).
- Pair scores (common neighbours, Adamic-Adar) next to a path (Chris).
- A layout named with its parameters inside a recipe (Mara).
- An imported model-score column as one side of a comparison (Chris).
- The start screen's "Bank transfers" sample does not say it is synthetic (Sarah).
- Label top N by a signed column ignores magnitude, and "2 hidden where labels overlap" cannot be
  forced (seen by all 3 print-ready-grey participants; kept here because it is one control).
- Cost estimates are for WebGPU only; half of Min-ji's laptops have none.

---

## Part 3: what to keep

Severity 0: praised unprompted by several participants, and observed to help.

- The lock line, "This browser. Nothing sent.", repeated in the same words on the start screen,
  under the project name and in the file popover (20+ sessions).
- The load step's issue with counts ("150 of 2,298 values are NA"), each read-as option stating
  its result, and the drop line naming GSK3B and NOTCH1 (all 5 worth-an-afternoon sessions).
- The "Where your data goes" page as a forwardable, dated, printable document with a "what this
  page does not promise" section (8 sessions).
- Rank ranges and "Ranks below #2 may swap between runs" on sampled runs (10+ sessions).
- The state line and the run record with Copy (20+ sessions, every expert).
- The refusal with priced routes and the "not drawn, every node counted" message (8 sessions).
- Filter steps with a count after each step, and unticking without deleting (9 sessions).
- The finished community result: the groups table, seed, "numbered by size", singletons named.
- "Covered by Degree size above" with Move above (4 sessions).
- The gray and red-green previews and the legend drawn into the export (7 sessions), once they
  lead to a fix (finding 3).
- "84 of 96 genes matched" with every miss named and the spreadsheet-date tags (3 sessions, and
  both focus groups that saw it).
- The Add-data warning with "Replace data instead" and the found / new / not-in-April counts.
- "Paths between..." with From and To filled in, and the hop menu that sizes each hop first.
- The comparison's tie bands and "1,153 accounts not plotted".

---

## Focus groups in one paragraph each

- **Leaving Gephi or Cytoscape** (`focus-groups/switchers.md`): scope and settings must leave
  inside exports (4, all four); arbitrary group ids (3); nobody starts where the design starts
  (3, partly a stimulus effect); reproducibility (seed, layout, version) (3); vector export with
  its legend (3). Keep "Nothing sent" and statistics at rest.
- **Investigators** (`focus-groups/investigators.md`): time on every relationship (4); provable
  data handling (3); why each extra account is in an export (3); a source row on every exported
  line (3); graph words (3 for non-technical). Supply-chain fit is discounted: every frame was a
  bank story.
- **Code-first and access** (`focus-groups/code-first.md`): how a number was computed, where it is
  read (3); graphty-element as a notebook widget (3, a scope question and public API: propose,
  do not decide); results back out as data (3, partly a misreading of the mock); a grid view for
  screen readers (3).
- **First contact** (`focus-groups/first-contact.md`): the recipe's column choice (4); size read
  as importance (3); legends in words (3); start from the reader's own data (3). The gene-match
  report is again the most trusted screen.

Group-think discounted throughout: later agreement counted only when it added a reason; the notebook
widget and the keyboard grid were primed or reciprocal; name slips are simulation artifacts.

---

## What round 3 should test

1. Undo that names what it reversed, with undone steps kept in the list (finding 2).
2. The export dialog's gray check leading to the Print look, and SVG (finding 3).
3. The recipe with author-locked inputs (finding 4).
4. A weight that refuses or states itself on every result (findings 5, 14, 15).
5. Dated transfers and a time-ordered path, on a continuous investigator dataset (finding 1).
6. The weekly return with "Update with a new export" (finding 18).
7. Only after Part 1 is fixed: re-run "worth an afternoon" and "read the numbers", whose scores
   are mostly mock seams today.
