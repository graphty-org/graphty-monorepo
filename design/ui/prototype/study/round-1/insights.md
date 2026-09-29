# Round 1: what the study found

Round 1 of the simulated study of the graphty mocks: 71 task sessions with 15 simulated personas
across 18 tasks, and 4 focus groups (people leaving Gephi or Cytoscape; investigators; code-first
and screen-reader users; first-timers and people handed a file). Every participant is simulated,
built from the persona files in `../personas/`. Treat every finding as a hypothesis to confirm with
real people, not as proof.

How to read this page:

- **Severity** is Nielsen's scale: 0 not a problem (used here for things to keep), 1 cosmetic,
  2 minor, 3 major, 4 catastrophe (the task cannot be done, or the user leaves).
- **Sessions** counts the task sessions where the problem was observed. **Participants** counts
  distinct personas. A focus-group mention is listed separately and never counted as a session.
- **Observed** means the participant did something (clicked the wrong thing, stopped, gave a
  wrong answer). **Said** means an opinion. Where only opinion supports a finding it is marked,
  and its severity is held down by one.
- **Mock or design.** Some problems come from the mocks themselves (a screen showing a different
  dataset from the one just loaded, numbers that differ between two hand-made mocks). Those are
  listed first, kept apart, and do not count as evidence against the design.

Session files are in `sessions/`, focus groups in `focus-groups/`.

---

## Task success and ease

Outcome codes: **success** (done, unaided), **with difficulty** (done, but with a wrong turn, a
guess, or a moderator step-in), **failed** (wrong or no answer), **gave up**. SEQ is the Single
Ease Question, 1 (very hard) to 7 (very easy), asked after each task.

| Task | Sessions | Success | With difficulty | Failed or gave up | Completed | Mean SEQ |
|---|---:|---:|---:|---:|---:|---:|
| A colleague's file: is it worth an afternoon? | 5 | 0 | 5 | 0 | 5 of 5 | 4.2 |
| Is it OK to use, and did anything leave? | 5 | 0 | 5 | 0 | 5 of 5 | 3.8 |
| Who matters most, and how sure are you? | 5 | 0 | 5 | 0 | 5 of 5 | 3.4 |
| What groups are there, and how does the biggest differ? | 4 | 0 | 3 | 1 | 3 of 4 | 2.8 |
| Can these rankings be trusted? (weight trap) | 4 | 0 | 4 | 0 | 4 of 4 | 3.3 |
| Clear or refer a flagged account | 3 | 0 | 0 | 3 | 0 of 3 | 2.0 |
| Citation data too big to draw: anything worth a look? | 4 | 0 | 4 | 0 | 4 of 4 | 4.3 |
| The biggest connected piece: size and who matters | 4 | 0 | 4 | 0 | 4 of 4 | 4.5 |
| A figure a reviewer can read, even in grey | 4 | 0 | 2 | 2 | 2 of 4 | 2.5 |
| Get back after an unexpected change | 5 | 0 | 5 | 0 | 5 of 5 | 4.0 |
| Do two scores agree on who matters? | 4 | 1 | 3 | 0 | 4 of 4 | 4.8 |
| This week's export: redo last week, show what changed | 3 | 0 | 2 | 1 | 2 of 3 | 2.7 |
| Use a colleague's recipe on your gene list | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 |
| Share your setup without your data | 4 | 0 | 4 | 0 | 4 of 4 | 4.8 |
| Keyboard only: walk from TP53, select two neighbours | 3 | 0 | 3 | 0 | 3 of 3 | 3.7 |
| How is this account connected to that one? | 4 | 0 | 3 | 1 | 3 of 4 | 2.8 |
| Measure who bridges groups on the whole citation graph | 4 | 0 | 4 | 0 | 4 of 4 | 4.5 |
| Leave yourself a note on why you kept these accounts | 3 | 0 | 3 | 0 | 3 of 3 | 3.3 |
| **All tasks** | **71** | **1** | **62** | **8** | **63 of 71 (89%)** | **3.65** |

What the numbers say:

- **Only 1 of 71 sessions was a clean success.** 89% finished, but almost all of them after a
  wrong turn, a guess, or a moderator stepping in. An unaided success rate near 1% on mocks is
  expected to be low (nothing is clickable end to end), but the pattern is the point: people get
  there by guessing.
- **Mean SEQ 3.65 of 7** is below the usual benchmark of about 5.5. Every task is below it.
- **The hardest tasks are the ones that start from a question in the user's own world**, not from
  the tool: the flagged account (0 of 3, SEQ 2.0), the grey figure (2 of 4, SEQ 2.5), this week's
  export (SEQ 2.7), groups (SEQ 2.8) and how two accounts connect (SEQ 2.8).
- **The easiest are the ones where graphty already does something other tools do not**: sharing a
  setup without data (4.8), comparing two rankings (4.8), and narrowing to the biggest piece (4.5).
- Caution: SEQ from simulated participants has not been calibrated against real users. Compare
  tasks with each other and against round 2, not against published norms.

---

## Part 1: problems caused by the mocks, to fix before round 2

These are not evidence about the design, but they cost the study a great deal of signal and must
be fixed before any design finding is re-tested.

### M1. The screen after Load shows a different dataset from the file just opened

- **What happens:** a participant loads the protein evidence file (or is told the task is about
  accounts, patents or Les Miserables), and the next screen shows another dataset. Participants
  blamed themselves ("Did I click the sample by accident?"), lost the thread, or said they would
  close the tab in a real product.
- **Severity for the study:** 3. It is not a design defect, but it cost the moderator a step-in in
  every "worth an afternoon" session and made three investigator tasks impossible.
- **Evidence (observed):** 26 of 71 sessions, 14 participants. All 5 "worth an afternoon"
  sessions; all 3 flagged-account sessions (the account the task names is not in any graph a
  participant can search); all 3 remember-why sessions (notes shown only on protein data); 3 of 4
  weight-trap sessions (no mock uses Les Miserables, the dataset the task names); 3 too-big
  sessions; plus who-matters, groups-differ, narrow-or-paint, how-connected, rankings-agree and
  this-weeks-export sessions.
- **Recommendation:** build one continuous dataset per task path in the kit fixtures (the loaded
  file stays the file through every screen of that path), and add the transfers data to Find,
  the inspector, notes and the path view.

### M2. Two mocks of the same state give different numbers

- **What happens:** the same filtered graph shows 1,843 edges and 44 components on one screen and
  1,904 edges and 1 component on another; 105 or 106 edges; density 0.0865 or 0.0868; 253 or 254
  edges; the ring as 12 accounts and $226,756.28 on screen but 14 accounts and $262,796.52 in the
  export note; red means "below zero" on one colour screen and blue on another.
- **Severity for the study:** 4. Every expert who noticed said they would stop trusting every
  number, and several stopped the task to check by hand. That reaction is real (see D1), but the
  cause here is hand-typed mock numbers.
- **Evidence (observed):** 9 sessions, 7 participants: too-big-to-draw (Emma, Min-ji, Chris),
  narrow-or-paint (Alex, Emma, Min-ji), get-back (Jordan), plus the investigators focus group
  (one finder, two echoes) and the first-contact focus group (one finder, two echoes).
- **Recommendation:** generate every count on every mock from `kit/fixtures.json` and
  `kit/alerts.json`; add a check to the kit that fails when two pages disagree about a named
  state. The design lesson that survives is in D1.

### M3. Controls that look live but do nothing

- **What happens:** the Details link, the steps-list checkboxes on the Undo mock, Scope dropdowns,
  "More actions" and "295 more in the table" do nothing when clicked. Participants read them as
  broken.
- **Severity for the study:** 2.
- **Evidence (observed):** 17 sessions. Details: who-matters (Alex, Jordan, Mara, Elena),
  quiet-weight-trap (Emma, Alex, Mara). Checkboxes: all 5 get-back sessions. Scope: 4
  narrow-or-paint sessions.
- **Recommendation:** in round 2 every control a task path needs must respond, even if only with a
  static next state. A dead control is only acceptable when it is labelled "not in this mock".

---

## Part 2: design findings, most severe first

### D1. A number that is not labelled with what it was counted over reads as a contradiction

- **What happens:** people check numbers against each other and against their own source. When two
  counts differ and nothing says why, they stop trusting both. Examples that are genuinely in the
  design, not mock errors: a file named 300 proteins loads 298 nodes (two proteins have no
  interaction, which only the design notes explain); the fold-change legend runs -2.41 to 2.98 while
  the attribute runs -2.52 to 3.15 (two different columns from two files, never named on screen);
  "degree" means the filtered graph in one column and the full graph in another; "largest
  component 28" answers a different question once filters are on.
- **Severity:** 4.
- **Evidence (observed):** 14 sessions, 10 participants. worth-an-afternoon (Elena, Alex, Dana:
  "If this was 1,400 suppliers and it said 1,398 I'd want to know which two"); figure-for-reviewer
  (Maren, Chen, Tom, Jordan: "The dashboard says one thing and the export says another"; Tom gave
  up partly over it); narrow-or-paint (Alex nearly reported 28 instead of 76, Dana); keyboard-walk
  (Emma, Priya: UBC degree 21 but 3 neighbours shown); get-back (Elena: "why does Valjean have three
  different numbers"). Focus groups: investigators theme 1 and first-contact theme 1 (the same
  reaction to mock errors).
- **Recommendation:** every count, range and statistic names its set and its source in words
  ("298 nodes: 2 proteins in the file have no interaction", "log2FC from qPCR file, 84 proteins",
  "degree in the filtered graph"). Where a figure can be read two ways, show both side by side
  only when they differ.

### D2. "Who matters, and how sure?" -- the second half cannot be answered

- **What happens:** people find the top five quickly, then cannot say how firm the ranking is. The
  sampled route says "50 sources" with no accuracy statement; near-ties (0.0695, 0.0687) are shown
  as clean ranks; the grey word "Exact" was read by a first-timer as "the ranking is certain". The
  one confidence cue that worked for everyone -- the inspector's "#2 of 300" on degree,
  betweenness and PageRank -- exists for one node at a time, so checking a top twenty means twenty
  clicks and a notepad.
- **Severity:** 4 (the task's second half fails; a first-timer would repeat a wrong claim).
- **Evidence (observed):** 5 of 5 who-matters sessions (Alex, Jordan, Maren, Mara, Elena), plus
  groups-differ (Chen), rankings-agree (all 4 asked for tie-aware agreement), costly-measure (all 4
  asked for an error bound on the sampled run). 13 sessions, 11 participants.
  "Exact! OK, great, so it's not a guess." (Elena, who-matters). "Fifty what? If she asks how sure
  I am, I've got nothing to point at." (Jordan).
- **Recommendation:** a top-N table with every run measure as a column and its rank; a plain
  agreement line ("TP53 is in the top 2 on all three measures"); mark near-ties ("3rd to 5th are
  within 8% of each other"); state a sampled run's expected rank stability in words. Say what
  "Exact" means ("computed on every node, not estimated") so it is not read as "certain".

### D3. Community detection has no finished result, and no place to compare groups

- **What happens:** the task "what groups are there and how does the biggest differ" has nowhere
  to land. Louvain and Leiden appear only queued or out of date; no screen shows a detection's
  groups, sizes, modularity or seed. Per-group statistics (edges inside and out) exist only on a
  hand-made set, one at a time, and nothing compares a group with the rest or summarises a data
  column (such as mean fold change) per group. The named modules on the protein graph came with
  the file, and three participants could not tell that from a detection.
- **Severity:** 4.
- **Evidence (observed):** 4 of 4 groups-differ sessions (Maren, Chen, Jordan, Mara; Mara failed).
  "What I actually want is one table: nine rows, one per group. Sortable." (Mara). Seed missing on
  Louvain: Chen, Mara, and the switchers and code-first focus groups.
- **Recommendation:** design the finished community result: a groups table (size, edges inside,
  edges out, density, a chosen attribute's mean or share, compared with the rest of the graph),
  modularity, algorithm, resolution and seed in the state line, and a click from a legend row to
  that group. Label imported groups as "from the file".

### D4. Getting a ranked list or a full table out is the job, and there is no visible way

- **What happens:** analysts want the scores as rows: sorted, with original ids, into Excel,
  pandas or R. "295 more in the table" points at a table nobody has seen; two Export buttons do
  not say which gives a table and which a picture; the comparison's export hides in an overflow
  menu and might be capped at 100 rows.
- **Severity:** 3.
- **Evidence (observed):** 20 sessions, 10 participants. who-matters (Alex, Jordan, Mara, Elena),
  worth-an-afternoon (Alex, Jordan), too-big-to-draw (Priya, Chris), costly-measure (all 4),
  rankings-agree (all 4), this-weeks-export (Alex, Dana), groups-differ (Chen, Mara). Code-first
  focus group theme 4 ("data must come back out using the original ids").
- **Recommendation:** every ranked result and every table gets one labelled "Export as CSV"
  beside it, exporting all rows with original ids, both ranks where relevant, and column headers
  that carry the scope and method ("betweenness, sampled 50 sources, filtered graph").

### D5. After loading, nothing on screen says whether data has left the machine

- **What happens:** the start screen's padlock line ("Your files stay on this computer ...
  uploads nothing") is praised by nearly everyone who sees it. But once a graph is open it is gone.
  Asked mid-session "did anything just leave?", every participant answered from memory, and the
  greyed Assistant with a sparkle icon made several assume the worst. The file popover says where
  data came from, not where it went.
- **Severity:** 3.
- **Evidence (observed):** 5 of 5 data-stays-here sessions (Priya, Sarah, Marcus, Chen, Alex), all
  unable to point at anything on screen. Assistant read as a possible leak: 4 of 5. "'Probably' is
  the word I'd get torn apart for on the stand." (Marcus). The first-contact and investigators
  focus groups both named the privacy line as the reason they tried the tool.
- **Recommendation:** a small standing status in the frame ("Local only: nothing sent") that
  changes when a data source or the Assistant is used; the Assistant, when off, says "Off. Nothing
  is sent."; the file popover adds "Not sent anywhere".

### D6. "Uploads nothing" is a sentence, not something an IT or security reviewer can check

- **What happens:** regulated users (bank, police, pharma, supply chain) all say the tool cannot
  be used on real data until IT approves it, and one sentence is not approval. They ask who runs
  it, whether it sends telemetry, fonts or crash reports, whether it can be self-hosted, and what
  a data source sends and to whom. That projects are kept in browser storage is learned only from
  an error state.
- **Severity:** 3 (adoption, not usability). Hosting and policy are the owner's decisions, not
  screen design.
- **Evidence:** said, but consistently and unprompted: 5 of 5 data-stays-here sessions, plus the
  would-use answers of 12 other sessions (Dana in all four of hers, Marcus, Sarah, Priya, Emma,
  Jordan). Investigators focus group theme 3: all four independently.
- **Recommendation:** a "Where your data goes" page reachable from the padlock line, written to be
  forwarded (what is sent, when, to whom; no telemetry; works offline; where projects are kept and
  how to clear them). Say "Projects are kept in this browser" in the first-run line. Record
  hosting and org-wide Assistant switch-off as owner decisions in framework-changes.md.

### D7. A result does not state its full definition

- **What happens:** experts cannot check numbers against NetworkX, igraph or Gephi because the
  result does not say how betweenness was normalised, how a similarity weight became a length, the
  tie rule, the damping or the seed. The Details link, where they expected this, is dead in the
  mock. The state line that exists ("Exact. Unweighted, undirected.") is the most praised line in
  the product, so the pattern is right and needs extending.
- **Severity:** 3.
- **Evidence (observed):** 17 sessions, 8 participants: who-matters (Alex, Mara, Jordan, Maren),
  quiet-weight-trap (all 4), narrow-or-paint (Emma), too-big-to-draw (Emma), rankings-agree (all
  4), costly-measure (Emma, Chris). Code-first focus group theme 1; switchers theme 2.
  "I don't know what the denominator is. That's the first thing I would put in a methods section."
  (Mara, rated 4).
- **Recommendation:** extend the state line with normalisation, weight column and how it was read
  ("weighted by confidence, read as similarity, length 1/w"), seed, and damping; make Details open
  the full definition with a call that reproduces it in NetworkX or igraph; speak the state line
  to screen readers when a result arrives.

### D8. What a weight means is never shown on the result, and the out-of-date sentence reads backwards

- **What happens:** the planted trap (a similarity read as a distance) was found by all four
  participants, but only by piecing together the load step, the Statistics row and the out-of-date
  popover. The result's own state line never names the weight's role. "confidence is now read as a
  similarity; these read it as a distance" was read as a claim that the listed results still use
  it wrongly. "Betweenness and Closeness read no weight" contradicts the Weight field on
  Betweenness.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 quiet-weight-trap sessions (Emma, Alex, Chris, Mara). Alex:
  "I genuinely can't tell which way round that sentence goes."
- **Recommendation:** the result state line names the weight column, its role and the conversion.
  Rewrite the popover in past tense per result ("Louvain was computed with confidence as a
  distance"). Remove the contradiction: either Betweenness reads a weight or its field goes.

### D9. The load step's question about what a weight means cannot be answered by most people

- **What happens:** "Similarity / Distance / Capacity / Unknown" with "1 - w, 1/w, -log w" means
  nothing to non-specialists. People leave the default without understanding it; "Weight" was read
  as shipping weight and as dot size; "Unknown" is really two behaviours (paths ignore it,
  PageRank reads it as a similarity). Dollar amounts fit none of the four.
- **Severity:** 3.
- **Evidence (observed):** 9 sessions, 7 participants: all 5 worth-an-afternoon sessions (Elena,
  Alex, Jordan, Tom, Dana), this-weeks-export (Alex, Dana), quiet-weight-trap (Alex, Chris).
  First-contact focus group theme 3: participants could answer the question when asked in their
  own terms ("nine mentions is a closer tie than one").
- **Recommendation:** ask in the user's words ("Does a bigger number mean a stronger tie, a
  longer distance, or neither?") with the column's own values as an example; hide the formulas
  behind a disclosure; name what "not set" does to each algorithm family; do not nag after a
  skip.

### D10. Undo cannot fix a mistake that is not the last step, and does not say what it undid

- **What happens:** with a wrong middle filter step, every participant's first move was Ctrl+Z,
  which removed the good last step. No message named what was undone. Undo history looks like a
  way to pick one step but undoes every newer one too. The real fix -- unticking one step in the
  filter steps list -- was reached by accident or with help. Once fixed, "Filter to Largest
  component" stayed ticked while Statistics showed 4 components, which made people doubt the fix.
- **Severity:** 3.
- **Evidence (observed):** 5 of 5 get-back sessions (Elena, Alex, Sarah, Jordan, Dana) pressed
  Ctrl+Z first and lost a step they wanted. 3 of 5 were confused by the 4 components. 2 of 5
  (Elena, Sarah) pressed Ctrl+Y for redo and nothing happened.
- **Recommendation:** Undo shows a short notice naming what it reversed; when the change was a
  filter step, the notice offers "Turn off just this step instead" and opens the steps list. Mark
  a step whose result was changed by a later step ("Largest component, then group 8 split it:
  4 pieces"). Support Ctrl+Y on Windows.

### D11. A figure for print: no grey check, no vector format, no way to show magnitude

- **What happens:** no screen lets anyone check how a figure reads in grey, and the blue-white-red
  scale turns strong up and strong down into the same dark grey. Export is PNG only, sized as "2x"
  rather than dpi. "Changed most" needs absolute fold change for size or labels, and nothing offers
  it. Labels are on hubs, not on the genes that changed. The empty state promises "Color by" and
  "Size by", but no such control exists; a layer turned on under Module color "paints nothing"
  with no reason a first-timer could read.
- **Severity:** 4.
- **Evidence (observed):** 4 of 4 figure-for-reviewer sessions (Maren, Chen, Tom, Jordan; Tom and
  Jordan failed). Tom gave up at the layer that painted nothing: "I clicked it, nothing moved.
  That's the moment I stop." First-contact focus group: greyscale and colour-blind legend raised
  independently by three.
- **Recommendation:** a grey and colour-vision preview in the style editor and the export preview;
  palettes labelled in words ("prints well in grey", "safe for colour-blind readers"); SVG and PDF
  export with real text; an "absolute value" option on size and a "label the top N by this value"
  rule; "Color by" on each attribute row; a layer that paints nothing says which layer above it
  wins and offers "Move above".

### D12. The weekly refresh: Add data double-counts and Replace cannot be found

- **What happens:** to bring in this week's snapshot, the only visible button is Add data, which
  merges both weeks (17,483 edges from 9,113 + 8,370). Replace data is not on any screen. The
  dialog counts matched and new records but not those that disappeared, which is what managers ask
  about. Community ids and colours look stable across versions but are not matched.
- **Severity:** 4.
- **Evidence (observed):** 3 of 3 this-weeks-export sessions (Alex, Dana, Min-ji); Dana failed.
  Alex caught the merge only because the total did not match his SQL.
- **Recommendation:** when a file with the same columns is opened into an existing project, ask
  "Replace last week's data or add to it?" with Replace first; show added, removed and matched
  counts and the match key before commit; list removed records by name; warn that group numbers
  are not matched across versions, or match them.

### D13. An investigation cannot start from an alert or an account

- **What happens:** there is no way in from an alert (no alert reason, rule or date), the account
  is not findable, and when an id does not match Find offers the closest name -- dangerous for
  account numbers. No screen shows an account's transfers with amounts, dates and direction, so
  clear-or-refer cannot be decided. riskScore and ready-made sets carry no reason or author.
- **Severity:** 4. Part of this is M1 (the account is missing from the searched graph), but the
  missing transfer records, alert context and exact-id matching are design gaps.
- **Evidence (observed):** 3 of 3 flagged-account sessions (Sarah, Priya failed; Marcus gave up).
  Transfer records missing: also how-connected (Sarah, Marcus). Investigators focus group themes 2
  and 4 (time and source records).
- **Recommendation:** an alert entry that lands on the account with the alert's reason; exact
  matching for id-like values (no "closest"); a transfers list per account and per edge with date,
  amount and direction; every score and set shows where it came from.

### D14. "How are these two connected?" has no visible way to ask

- **What happens:** with two accounts selected, nothing offers "path between". The path tool is an
  unlabelled icon. Find takes one term, and a second search replaces the first. The path found is
  fewest hops, one of 12 shown one at a time, with no amounts or dates on hops.
- **Severity:** 3 (4 for the participant who failed).
- **Evidence (observed):** 4 of 4 how-connected sessions (Sarah, Marcus, Chris, Dana; Dana
  failed). "Selecting two nodes is exactly when 'shortest path between' shows up. It's not here."
  (Chris).
- **Recommendation:** "Find paths between" in the two-node selection's first row; a From and To
  form; show all equal paths together and mark nodes common to all; weight by an edge column;
  export the path as rows.

### D15. Unlabelled icons hide the tools people need

- **What happens:** the path tool, the note tool, the table, and export actions are icons with no
  label or tooltip. Participants avoid unlabelled icons or guess.
- **Severity:** 3.
- **Evidence (observed):** 11 sessions, 9 participants: how-connected (all 4), remember-why (all
  3), worth-an-afternoon (Jordan), who-matters (Jordan), groups-differ (Jordan), how-connected
  (Dana). "I'm not clicking a mystery button on my first minute." (Alex).
- **Recommendation:** tooltips on every toolbar icon with the name and key; labels on the icon
  buttons in inspector rows ("Copy ids", "Add to set").

### D16. Notes: the first note has no obvious place to go

- **What happens:** the empty Notes panel is blank (read as loading or broken); the inspector's
  Notes section appears on some objects and not others; a note has no author or case field; "Use
  current" reads as rewriting evidence; nothing says whether notes are saved or exported.
- **Severity:** 3 (Alex rated 4: no place to write the first note on the accounts graph).
- **Evidence (observed):** 3 of 3 remember-why sessions (Sarah, Marcus, Alex).
- **Recommendation:** empty state with "Add a note about the selection"; the Notes section on
  every inspector, always; author and date on each note; rename "Use current" to "Update to
  current value (keeps the old one)"; state saving and export behaviour.

### D17. A received recipe asks for a network the recipient does not have

- **What happens:** the sender says "drop your gene list on it", but the card asks for a protein
  network and a table. A network then appears as "already open" that the recipient never opened.
  "no node with this id" does not say whether a gene is missing from the network or not real.
- **Severity:** 3 (Maren and Elena, 4: stuck without the moderator).
- **Evidence (observed):** 3 of 3 use-colleagues-file sessions (Tom, Maren, Elena). First-contact
  focus group theme 5.
- **Recommendation:** a recipe states what it brings and what the recipient must supply, and can
  carry or point to its network; say where "already open" came from; reword to "not in this
  network"; offer a fix for spreadsheet-date genes as for letter case.

### D18. Sharing a setup: the recipe is hard to find and does not say whether the analysis travels

- **What happens:** everyone found the recipe, but under the heading "Starting point", below the
  fold. The Travels list does not say whether algorithm runs and their parameters (clustering,
  layout settings, seed) go with it, and "a module per protein" under "Asked for" reads as if the
  recipient must bring their own clusters. The dialog opens with network figures ticked, and
  ticking Recipe does not untick them, so a no-data export could include a picture of the data.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 share-without-data sessions (Maren, Chen, Mara, Emma). Figures
  left ticked: Chen and Emma noticed only from the file count.
- **Recommendation:** rename the section ("Share the setup, without data"); list algorithm runs
  with their parameters under Travels; choosing a recipe clears other kinds, or warns; show the
  text of notes that travel; say what opens a .graphty file and that it is readable text.

### D19. Filter scope and a result's Scope field look like two settings that do not know each other

- **What happens:** after filtering to the biggest piece, the result editor says "Scope: Full
  graph". Nobody could tell whether a run follows the filter. The "Full graph" chip itself reads
  as a status label, not a button.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 narrow-or-paint sessions (Alex, Emma, Dana, Min-ji). "If I set
  the filter and then Betweenness runs on the full graph anyway, that's a wrong number in a slide."
- **Recommendation:** a run defaults to the current filter and its Scope field says so ("Filtered
  graph, 76 nodes -- follows the filter"); give the chip a button affordance.

### D20. The cost gate: honest, but forces choices users want to make themselves

- **What happens:** refusing a run that would take hours, and offering cheaper routes, is praised
  by everyone. But the form forces "Undirected" on a directed citation graph with no reason or
  control, does not show or let the user set the seed, defaults to 50 sources while saying 100
  fits, refuses a few-minute sample under a fixed 30-second budget while offering an hours-long
  exact run, and labels a subgraph run "Exact". "Budget" read as money to a first-timer.
- **Severity:** 3 (Emma rated the missing seed 4).
- **Evidence (observed):** 4 of 4 costly-measure sessions (Emma, Priya, Chris, Min-ji); budget read
  as money: who-matters (Elena).
- **Recommendation:** a direction choice with the graph's own direction as default; show and
  allow setting the seed; default to the largest sample that fits; let the user raise the time
  limit for a background run; call the subgraph route "Betweenness within ...", not "Exact"; say
  "time limit", not "budget".

### D21. Past the drawing limit: honest, but the leads are dead ends

- **What happens:** "124,318 nodes not drawn" and the count-before-commit are praised, but the
  message is easy to miss on a blank canvas, isolates and small components cannot be clicked open,
  and "degree" on a directed graph never says in, out or total.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 too-big-to-draw sessions (Priya, Emma, Min-ji, Chris); in/out
  degree also costly-measure (Min-ji).
- **Recommendation:** centre the not-drawn message; make component and isolate counts open their
  rows in the table; label degree as in, out or total on directed graphs; add a degree
  distribution to the first statistics.

### D22. Two rankings compared: the right numbers, the wrong picture

- **What happens:** Spearman next to "0 of 50 shared at the top" gave every participant the answer
  in seconds. But Spearman is computed over huge tie blocks at zero, there is no rank-against-rank
  scatter (two coloured hairballs instead), each side's settings are missing, top-K is fixed at 50,
  and no visible command starts a comparison.
- **Severity:** 3.
- **Evidence (observed):** 4 of 4 rankings-agree sessions (Emma, Chris, Mara, Chen); entry point
  missing: Chris, Mara, Chen, and this-weeks-export (Alex, Dana).
- **Recommendation:** replace the second canvas with a rank-against-rank scatter; add Kendall
  tau-b and a figure without the tie blocks; a K control; each side's state line under its name;
  "Compare with..." on every result row.

### D23. Keyboard walk: works for a screen reader, less so for a sighted keyboard user

- **What happens:** the walk's spoken lines were praised by the screen-reader participant. But
  neighbours are walked in edge-confidence order with no way to sort by degree; a sighted keyboard
  user sees less than a screen-reader user (values are only spoken); Enter replaces the selection
  and Space adds, which caught all three; Ctrl+K cannot find a node by name; the inspector's
  selection rows speak raw markup.
- **Severity:** 3.
- **Evidence (observed):** 3 of 3 keyboard-walk sessions (Morgan, Emma, Priya). Code-first focus
  group themes 2 and 6.
- **Recommendation:** show the focused node's values on the walk pill; say the sort order and allow
  sorting by degree; Ctrl+K finds nodes by name; fix the inspector rows' accessible names; a "?"
  key sheet.

### D24. Legends and first statistics use words newcomers cannot read

- **What happens:** groups are bare numbers, "degree", "density 0.0868" and "degree distribution"
  mean nothing to non-specialists, and the biggest, most central dot is read as "most important".
  Part of this is the sample file, which really has numeric groups.
- **Severity:** 3.
- **Evidence (observed):** 9 sessions, 7 participants: worth-an-afternoon (Elena, Jordan, Tom,
  Dana), who-matters (Alex, Elena), narrow-or-paint (Dana), keyboard-walk (Emma, Priya: "score").
  Switchers focus group theme 1 (all four independently); first-contact theme 4.
- **Recommendation:** let a user rename a category once and keep the name on new data and in
  exports; a one-line plain gloss beside each statistic ("Density: 9% of possible links exist");
  say what size encodes in the legend ("size: number of connections").

### D25. Small grey secondary text is hard to read

- **Severity:** 2.
- **Evidence (observed):** 6 sessions, 4 participants: worth-an-afternoon (Tom, Dana),
  narrow-or-paint (Dana), get-back (Dana), quiet-weight-trap (Mara), this-weeks-export (Dana).
  Investigators focus group theme 9.
- **Recommendation:** raise the contrast of secondary text used for key facts (the privacy line,
  the filter chip) to body contrast; keep 9 px captions for truly secondary notes.

### D26. "Replace" next to Overview reads as destructive

- **Severity:** 2.
- **Evidence (observed):** 3 sessions: worth-an-afternoon (Alex, Jordan, Tom), all avoided it.
- **Recommendation:** rename to say what it does ("Change overview...").

---

## Part 3: what to keep (severity 0)

These were praised independently across many sessions, and behaviour confirmed them.

- **The import check before loading.** Blocking Load on a text-read number column, with the count,
  sample rows and each choice's result in rows. 5 of 5 worth-an-afternoon; "better than Gephi,
  which would just have loaded it as a string" (Alex).
- **The padlock line on the start screen.** Praised in 14 sessions and by all four focus groups.
  Keep it and extend it (D5, D6).
- **The run's state line** ("on: full graph, 300 nodes. Exact. Unweighted, undirected."). Praised
  in 12 sessions. Extend it (D7).
- **Cost shown before running, and refusal instead of a frozen tab.** 13 sessions.
- **Filter steps with a count after each step,** turned off one at a time. 13 sessions; the thing
  that made the get-back task recoverable.
- **"Previous selection" in the table's scope line.** 5 of 5 get-back sessions found and used it.
- **"84 of 96 genes matched" with each unmatched gene named** and spreadsheet dates caught. The
  most trusted screen in the study (3 sessions, first-contact and switchers focus groups).
- **Find says when a hit was left out by a filter and names the step.** 6 sessions.
- **Rank with a denominator ("#2 of 300").** The only confidence cue that worked (D2).
- **Notes that record the value they quote and warn when it changes.** 3 of 3 remember-why.

---

## Discounted

- **Focus-group echo.** In all four groups, agreement grew each round without new reasons. Only
  independent first-round mentions are counted above.
- **Scope asks from one voice:** STRING query and enrichment inside graphty (Maren), RDF import
  (Min-ji), Parquet (Chris), notebook widget (Emma, Chris), typed entities (Marcus), GEXF round
  trip (Mara). These are product-scope questions for the owner, not usability findings.
- **Simulation.** Simulated participants are consistent and articulate in a way real people are
  not. Confirm D1, D2, D3, D11 and D12 with real users on real files before large design changes.
