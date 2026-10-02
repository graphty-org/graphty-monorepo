# Grades: keep only transfers of 1,000 or more

The task: "From now on you only care about transfers of 1,000 or more. Make every count, drawing
and later calculation describe only those, then say how many accounts are left and whether the
summary numbers on screen describe what is left."

The intended path: from the just-loaded transfers project, open Data > Filters (or the header's
filter chip), add a step that keeps amounts of at least 1,000, and finish with one step on. The
header chip then reads "812 of 3,000 nodes", and the summary on the right carries the line
"5 readings are for all 3,000 nodes" with a "Compute on 812" button. Intended renders:
shots/tasks/t07/01.png to 04.png.

Grading rule: success means the step is applied, the chip reads 812 of 3,000, and the participant
notices the "5 readings are for all 3,000 nodes" line unprompted and presses Compute on 812.
Success with difficulty means the step was made but the stale readings were noticed only when
asked. Failure means hiding instead of filtering (the eye, or Hide on the canvas), or reporting the
3,000-node readings as describing what is left. The session is graded at the one-step state; the
later state with a second step and a note is not used, because the participant never made either.
Grades go by what was on screen and what they concluded, not by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Fraud analyst | failure | success | One-step state on the first click (01.png: "1 step, 1 on", chip "812 of 3,000 nodes"). Read the "5 readings are for all 3,000 nodes" line unprompted and pressed Compute on 812 (02.png). Concluded 812 accounts and that the summary does not describe what is left. Never used the eye or Hide. |
| Alert reviewer | failure | success | Same state on the first click (02.png). Noticed the line unprompted ("the banner admits the numbers are for all 3,000, so I'll press Compute"), pressed it (03.png). Answered "812 of 3,000" and "No, the summary does not describe what is left". |
| Analyst | failure | success | Same state (01.png). Read the line, pressed Compute on 812 (02.png). Answered 812, and "No": edges, density, degrees and components are full-graph values. Also caught that the earlier Louvain result sums to 3,000. |
| Supply chain analyst | success with difficulty | success | Same state (01.png). Read the line and called it honest, pressed Compute on 812 (02.png). Answered 812, and "No, only the node count does". |
| ML engineer | failure | success | Same state (01.png). Read the line ("at least the banner admits five readings are stale"), pressed Compute on 812 (02.png). Answered 812, and "No, only the node count does". |

Totals: 5 success, 0 success with difficulty, 0 failure, 0 gave up.

Two limits on what these grades show:

- **Nobody made the step.** On this project the header's "Full graph" chip opened the Filters list
  with "amount is at least 1,000" already made and ticked, skipping the empty list, the "+" and the
  new-step editor (intended renders 02 and 03). All five said "I didn't type 1,000". So this round
  is evidence for the second half of the task only: noticing that the readings are stale and
  answering correctly. Making an edge-attribute step from an empty list is untested. Rerun it.
- **The self-ratings are low for reasons the grade does not count.** Ease scores were 2, 2, 3, 3, 2
  out of 7. Most of the damage came from three skeleton defects listed under "Mock artifacts"
  (Compute on 812 opening a menu, that menu swapping in another dataset's summary, and a filter
  step appearing on its own). The rest comes from the real design findings below.

## Findings (design)

1. **The noticing works (5 of 5).** Every participant read "5 readings are for all 3,000 nodes"
   on their own and reached for Compute on 812 as the fix. Three called it honest and compared it
   favorably with tools that stay silent. The state bar does its job. Keep it.
2. **The step's own sentence is the most valued line on screen (5 of 5).** "amount is on edges:
   this step keeps the transfers that pass and the accounts at their ends" was quoted by every
   participant as the answer to "what did this filter do". Keep it.
3. **The Edges count does not follow an edge filter (5 of 5).** The summary reads Nodes "812 of
   3,000" next to Edges "9,113", and Edges is not one of the five readings the state bar flags. All
   five said the two cannot describe the same graph. For a filter on an edge attribute, Edges must
   read as a part of a whole ("N of 9,113") the way Nodes does, or be named in the state bar.
   Severity 3 (major): it is a count the bar does not cover, so it reads as current and is wrong.
4. **No count of transfers left (5 of 5).** The step line, the chip and the step's inspector count
   nodes only. Every participant asked how many transfers survive; three called it "the first
   number I'd check". A step on an edge attribute should say how many edges it keeps as well as
   how many nodes. Severity 3. This belongs with the shared count formatter (flag below): the
   formatter needs an edge form, not only a node form.
5. **The Edges table stays on the full graph with no way to switch it (5 of 5).** The table is
   labeled "9,113 edges (before the filter)", which every participant credited as honest, but its
   first rows (5.04, 8.97, 44.6) and its "Sum of amount, all 9,113 rows" are exactly what the task
   excluded, and nobody found a way to see the kept rows or their sum. The task says "every count";
   the table is a count. Severity 3. Either the table follows the filter, or it offers the switch
   next to its label.
6. **Earlier results on the Graph place carry no stale mark (2 of 5: analyst, ML engineer).** The
   Louvain legend ("35 groups", sizes adding to 3,000) shows no sign it was computed before the
   filter, and Analyze does not say whether a new run uses 812 or 3,000 nodes. The spec makes the
   state bar "the only filtered mark in this inspector"; it does not say what marks a run's legend
   elsewhere. Severity 2.
7. **"Everything -- Paints 3,000 nodes, 9,113 edges" beside a chip reading 812 (1 of 5).** The
   base layer's line counts the full graph while the chip counts what is left. Severity 2.
8. **No tooltip on Compute on 812 (3 of 5 hovered: fraud analyst, analyst, ML engineer).** The bar
   carries a reason ("Computed before the filters, which leave 812"), but hovering the button shows
   nothing. Severity 1.

## Mock artifacts (not design findings)

- **Compute on 812 opens the graph's "..." menu (5 of 5).** In the skeleton the button is wired to
  the "..." menu state, because no "computed on 812" state is drawn for the transfers project. Two
  participants pressed it twice. Every participant then chose "Compute the overview" from it.
- **"Compute the overview" puts the Les Miserables summary on the transfers project (5 of 5).** The
  right panel switched to "Co-appearances, from miserables.gexf, 77 nodes" while the rest of the
  screen stayed on transfers. Every participant named this as the moment they stopped trusting the
  summary panel, and it drove most of the low ease scores. It is the menu state being drawn for the
  other dataset, not a design.
- **The "Full graph" chip lands on the finished step (5 of 5).** See "Nobody made the step" above.
- **The "812 of 3,000 nodes" chip opens the later two-step state (4 of 5; not the alert
  reviewer).** It shows a second step, "kind is not merchant", and a note on the first step, which
  nobody made. Four participants read it as the app adding a filter on its own. This is the
  resting state the grading excludes. The intended render for the new-step editor (shots 03) has
  the same problem: it already holds the merchant step and the note.
- **The canvas does not change (5 of 5).** The skeleton draws the same binned picture before and
  after the filter. Whether 812 of 3,000 accounts reads as a change in a binned view is a real
  question, but this render cannot answer it.
- Nobody misread the step's own count line ("812 of 3,000 nodes", "Full graph: 812 nodes would
  pass"), so there is nothing of that kind to file.

## Flag: shared count formatter

Decided, not yet fully drawn: every count is to be written by one shared formatter. The skeleton's
count check (`node app-b/study.mjs --counts`) no longer lists data-place.js, and the filter step's
"3,000 to 812 nodes" line is gone. The "Full graph: 812 nodes would pass" line now goes through
the formatter (in inspector-attribute-and-filter-step.js). But data-place.js line 162 still
writes "Kept all 812 nodes" by hand, and the check does not catch it. Either route that line
through the formatter or teach the check its pattern. Finding 4 adds a need: the formatter also
needs an edge form for steps on edge attributes.

## Before rerunning this task

1. Start the "Full graph" chip on the just-loaded project at the empty Filters list, so the step
   is made by the participant.
2. Draw a "computed on 812" state and wire Compute on 812 to it.
3. Keep the "..." menu on the dataset on screen.
4. Redraw the new-step render without the merchant step and the note.
