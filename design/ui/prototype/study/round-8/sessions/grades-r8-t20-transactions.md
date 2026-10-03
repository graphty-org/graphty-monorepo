# Grades: keep only transfers of 1,000 or more, then count the accounts (round 8)

Task given to participants: "A month of card transfers between accounts is open. If you do not
work in banking, this is example data, not your own. You want every count and every drawing from
now on to include only transfers of 1,000 or more. Set that up, then say how many accounts are
left."

This is a repeat-work task (filter, then read what is left) on a second kind of data, card
transfers, after the same job was tested on another data set.

What counts as success: from the open graph (app-b/#/graph-place/transfers-loaded), open the Data
place (the rail's Data, or the "Full graph" funnel chip in the top bar), add a filter step ("Add
filter step" or the Filters "+"), choose Keep "By an attribute or computed value", the attribute
amount, "is at least", type 1000, and state 812 accounts -- read from the step's inspector ("This
step 812 of 3,000 nodes"), the step row, or the top-bar chip. Success with difficulty: the step
built on another column first, the count read only after opening the graph's summary, or more than
two wrong turns. Failure: hiding on the canvas only, or answering 3,000.

How this was graded. Outcomes come from what ended on screen and what the participant answered,
not from how sure they felt. All six rated themselves "success with difficulty"; in every case the
difficulty they described came after the answer was already on screen -- checking whether the
rest of the app obeyed the filter -- not from reaching it. Two things in the transcripts are not
counted as wrong turns:

- The "amount" mis-click. With the attribute menu open, the study tool's click on the word
  "amount" matched the amount row in the Data place's left Attributes list first and opened that
  column's details page. Every participant hit this, and every one then clicked the menu entry
  ("amount, in use: Weight, transfers"). A person looking at the open menu clicks the menu row;
  this is a name collision in the click-through tool, not a path a person would take. It is still
  logged below, because two controls with the same visible name is a real problem for anyone
  driving the app by name (speech input, screen readers' element lists).
- Opening the Graph summary and pressing "Compute on 812" after the answer was read. That was
  verification of "every count", not a search for the answer.

## Outcomes

| Participant | They said | Graded | Why |
|---|---|---|---|
| Sarah, the fraud analyst | success with difficulty | **success** | Funnel chip "Full graph", Add filter step, By an attribute, amount (menu), "is at least" preselected, 1000, Enter: step row, inspector and top chip all read 812 of 3,000 nodes (render 06). Answered 812 accounts. Then checked the summary, pressed Compute on 812, and doubted the unchanged Edges line and drawing. |
| Nadia, the alert reviewer | success with difficulty | **success** | Same direct path; 812 read on the step and the chip before leaving the Data place. Answered 812. SEQ 5. |
| Marcus, the criminal intelligence analyst | success with difficulty | **success** | Same direct path; read 812 on the step and noticed the funnel mark on the amount attribute. Answered 812 of 3,000. Checked the summary afterwards. |
| Dana, the supply chain analyst | success with difficulty | **success** | Same direct path, 812 read at the step. After verifying the summary she reopened the chip and landed on a step inspector carrying a second step and a note she had not made (render 09); she judged it removed nothing and kept 812. |
| Priya, the threat hunter | success with difficulty | **success** | Same direct path, 812 read at the step. Later visits (edge table, chip) did not change her answer; she added "connected by 1,204 transfers", read from the step inspector's reference state. |
| Analyst Alex | success with difficulty | **success** | Same direct path, 812 read at the step and chip; checked the summary and recomputed. Answered 812 of 3,000. |

Totals: 6 of 6 success, 0 with difficulty, 0 failure, 0 gave up. Every participant found the
filter through the top-bar funnel chip on the first click; none used the rail's Data, and none
tried hiding on the canvas. Single Ease Question: 4, 5, 5, 4, 4, 4 (median 4).

## Findings

Severity is Nielsen's 0-4. "Skeleton" means the skeleton draws something the design does not
intend; fix it before the next round so it stops masking the design.

| Finding | Seen by | Severity | Kind |
|---|---|---|---|
| After the filter and after "Compute on 812", the Graph summary's Edges line still reads "9,113 transfers", contradicting its own average degree (about 1,400 transfers) and the step's "1,204 of 9,113 edges". Every participant caught it and every one said they would re-check the number in another tool. | 6/6 | 4 if real; skeleton | Skeleton: the spec makes the filtered count read "n of N" like the Nodes line |
| The drawing looks identical before and after the filter (the same 3,000-node blob); nothing says whether the canvas shows 812 or 3,000. The task asked for every drawing. | 6/6 | 3 | Partly fidelity (the skeleton's canvas is a fixed picture), but the design question is real: the canvas needs a visible sign that a filter applies, and the spec's "filtered-out drawn faintly" is off by default |
| Readings other than the node count stay on the full graph until "Compute on 812" is pressed in the Graph summary, a different place from where the filter was set, right after the Data place promised "Filters change what is computed". Participants found the stale-readings bar and credited it for saying so, but read the extra press as breaking "every count from now on", and one asked whether it must be pressed after every change. | 6/6 | 3 | Design (the state bar is the spec's intended behavior) |
| Two controls named "amount" on screen at once (the left Attributes list and the open attribute menu); one click opened the column's details instead of filling the step. | 6/6 in the tool; would not occur for a pointer user | 2 | Accessible-name collision; matters for speech and screen-reader users |
| Reopening the step after the walk shows the reference state, not the participant's step: a second step "kind is not merchant" and "1 note" appear unbidden, and the value reads "1,000". Both participants who saw it said a tool that adds filters on its own loses their trust. | 2/6 | 3 for those who saw it; skeleton | Skeleton: the walk's step and the reference step are two fixtures |
| The step built during the walk reports only nodes ("This step 812 of 3,000 nodes"); the transfers kept are shown only in the reference state ("1,204 of 9,113 edges"). Two asked how many transfers survived. | 2/6 | 2 | Skeleton inconsistency; the design should show edges kept for an edge-attribute step |
| The edge table says "9,113 edges (before the filter)" and lists sub-1,000 amounts. It labels itself honestly, but the participant counted the table as one of the "every count". | 1/6 | 2 | Design; single voice, watch in later rounds |
| Two controls named "Add filter step" (the Filters "+" and the link). | 3/6 noted via the tool | 1 | Accessible-name collision |
| The "Full graph" chip switches the left panel to the Data place rather than opening a menu in place; both who remarked on it said it got them to the right place. | 2/6 | 1 | Design; no cost to the task |

Legibility of the Data place's file and table lines (set in caption gray in the skeleton): no
participant commented on it.

## What worked

- The funnel chip read as "filter" to all six on first sight and led straight to Filters.
- "Filters change what is computed; the eye in the Graph tree only hides" answered the
  data-versus-view question for 5 of 6 before they asked it.
- "is at least" preselected for a number column (noted by 6 of 6).
- "amount is on edges: this step keeps the edges that pass and the nodes at their ends" -- the
  rule in one sentence, which 4 of 6 praised as the right meaning for a flow-of-funds filter.
- The attribute menu grouped by table (accounts, transfers), so no one wondered which amount.
- The top chip showing "812 of 3,000 nodes", so the answer stayed in view and a filter cannot be
  left on unnoticed.
