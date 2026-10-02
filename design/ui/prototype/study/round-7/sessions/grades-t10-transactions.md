# Round 7 grades: picking out flagged accounts in Great Britain as a named list

The task: on one month of card and bank transfers (3,000 accounts, 9,113 transfers), pick out
every account the monitoring system flagged that is based in Great Britain, all at once, and keep
them as a named list to come back to.

What counts as success: the participant reaches "Select where..." (from the main menu, from Quick
actions, or from an attribute's menu), says the rule they would type to match flagged accounts in
Great Britain, and says where they would expect to keep the result as a named list. The session
ends on the rule dialog. Success with difficulty: reaching the dialog only through Quick actions
after a wrong place, or needing two tries to say a rule that combines both conditions. Failure:
clicking the accounts one by one as the plan, or planning to keep them as a filter step instead
of a list.

The designed path is two screens: the transfers graph at rest, then the rule dialog ("Select",
with a Query box). In this skeleton the dialog is reached from the main menu (the three-line
button left of the project name) or by typing "select", "query" or "select by" into Quick actions.
No attribute's menu offers it yet, so that route was not available to anyone.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating. The dialog's stand-in rule (kind == 'personal', 2,610 of 3,000 match) and the screen
after Select are out of scope; no participant reached either.

## Grades

| Participant | Their rating | Grade | Last screen | Why |
|---|---|---|---|---|
| Fraud analyst (Sarah) | gave up | **gave up** | Data place, "country" clicked, inspector showing the amount attribute | Tried the table, the filter builder, Views, Analyze, the graph's "..." menu and Quick actions. Opened Quick actions but did not type; its default list shows no select command. Clicked one GB cell, saw "Selects ACC-633005" and rejected one-by-one picking, so not a failure. Rejected a filter as the list ("Is a filter a list? I don't think so"). Never named where a list would live. |
| Alert reviewer (Nadia) | gave up | **gave up** | Data place, "country" clicked, inspector showing amount | Table header, filter builder, Views, Find box (typed GB: "No match for GB"), Analyze (typed "flagged" and "select": no match), "..." menu, Assistant. Never opened the main menu or Quick actions. Said a filter "hides things. The task says keep them as a list." |
| Cybersecurity analyst (Priya) | gave up | **gave up** | Graph place, "Everything" row, Style tab | Looked for exactly the dialog that exists: "a box where I type flagged = true and country = GB, a count of what it matched right next to it, and a save as". Hovered a dozen icon names, never the main menu; never opened Quick actions. Plans to export CSV and query in pandas. |
| Knowledge engineer (Min-ji) | gave up | **gave up** | Views place, "No saved views" | Stated the rule in SPARQL terms and as "select nodes where flagged is true and country is GB, save as...". Found "Select all visible" and named filter-then-select as the apparent route, called it backwards, and stopped after the filter field would not take. Clicked one GB cell and rejected one-by-one. Never opened the main menu or Quick actions. |
| Analyst Alex | gave up | **gave up** | Quick actions open, nothing typed | The closest approach: opened Quick actions at the very end and said "I'd type 'select' and hope", which would have found the dialog. Did not type, and stopped on time. Never opened the main menu. |

**Tally: 0 success, 0 success with difficulty, 0 failure, 5 gave up (5 sessions).**

Every self-rating matches the grade. Nobody concluded wrongly: no one kept a filter as the
answer, and the two who clicked a single account rejected that as the plan. Three of five stated
a rule that combines both conditions in their own words (Priya, Min-ji, Alex), and none of them
said it in the dialog, so none is credited.

## What the sessions show

Counts are out of 5. Severity is Nielsen's 0 to 4.

1. **"Select where..." is invisible from every place people looked for it.** 0 of 5 opened the
   main menu, where it lives. 2 of 5 opened Quick actions; its resting list (Re-run layout,
   PageRank, Data, Filters, Views) shows nothing about selecting, and neither typed. Where they
   looked instead, in order of how many: the table and its column headers (5 of 5), the Selection
   row in the Graph place (5 of 5, every one expecting to make a selection there and finding only
   its highlight color), Add filter in the Data place (5 of 5), Analyze and its "say what to find"
   box (5 of 5; Nadia typed "flagged" and "select" and got no match), Views (5 of 5), the graph's
   "..." menu (4 of 5, where "Select all visible" was the only select-like command). **Severity 4:**
   a core analyst task had no completions, and the people most fluent in queries (Priya, Min-ji)
   described the existing dialog almost word for word while failing to find it. Design, not
   skeleton: the main menu is an unlabeled icon and the command is not offered at any of the
   places five people searched. The Selection row and the table's column header are the two
   places all five went first.

2. **Nobody could say where a named list would be kept.** 5 of 5 opened Views as the likely home
   and set it aside as "the camera and the picture, not a list of accounts". 5 of 5 said a filter
   hides things rather than picking them and is not a list. 4 of 5 found "Select all visible" and
   pieced together filter, then select all, then "I still don't see where I'd name the result".
   **Severity 3**, with a caveat: in the design the named list (Create set) is offered after a
   selection exists, and no one got a selection, so this measures only that nothing on the resting
   screen hints that named lists exist. Fraud analyst: "A list of IDs is a basic thing; I'd expect
   it to be called a list."

3. **The table looks like a spreadsheet and is expected to filter like one.** 5 of 5 opened the
   table first; 4 of 5 clicked a header and then tried its small arrow as an AutoFilter dropdown.
   The arrow's menu opened nothing they could reach and its tooltip named the id column whatever
   column they were on. **Severity 3** for the expectation (a column menu with "Select where
   country is..." would meet four of five where they went); the id-only targeting is skeleton
   wiring, already recorded in earlier task grades.

4. **The only rule builder is a filter, and it starts from someone else's filter.** 5 of 5 added a
   filter step and saw it say "Kept all 812 nodes" because an "amount is at least 1,000" step was
   already on. 4 of 5 said their list would silently miss flagged accounts with small transfers.
   The 812 filter itself is a skeleton artifact (the Data place is drawn with another scenario's
   filter), but the reaction is the same one recorded on four other transfers tasks this round:
   people read it as a filter their own click turned on, and it lowered their trust in every
   count.

5. **Find box does not match attribute values.** Nadia typed GB and got "No match for GB"; 3
   others assumed from the label "Find rows and notes" that it searches names only. 1 of 5 tested,
   4 of 5 skipped it. **Severity 2.** One voice on the behavior, so treat it as a question: if the
   box searched values it would be a second door to the same job, which argues for it handing off
   to "Select where..." rather than doing its own matching.

## Mock artifacts (not design findings)

- **Clicking any attribute shows "amount".** 5 of 5 clicked "flagged" or "country" in the
  Attributes list and saw the amount attribute's histogram. Skeleton: one inspector is drawn for
  the Data place. It cost every participant time and trust ("I can no longer be sure the screen is
  describing the thing I picked").
- **Picking "flagged" in the filter's field list did not take.** 5 of 5. The word appears twice on
  screen and the study tool's click landed on the Attributes list behind the dropdown, which then
  showed amount (above). A study-tool targeting artifact, not evidence the picker is broken.
- **Sorting "flagged" both ways shows only "no".** Fraud analyst only; the sample page holds no
  flagged rows. Skeleton data.
- **"Nodes 812 of 3,000" beside "Edges 9,113".** Knowledge engineer only this task; graded on the
  overview task as a design issue (severity 2) and not repeated here.

None of these blocked the designed path: no one opened the main menu or typed into Quick actions,
and those routes do not touch any of them. They did consume most of every session, so the
five-of-five give-ups overstate how hidden the command is by an unknown amount. They do not
explain it away: the command was not offered at any of the places people searched.

## What worked

- "Local only" in the top bar and "Assistant: Off. Nothing is sent." (3 of 5 named them as what
  they would quote to IT or compliance).
- The column chooser showed the whole schema at once (4 of 5: "the data is there").
- The rule dialog's shape matches what the query-fluent participants asked for: a typed rule, a
  live match count, a save-as. Priya's wish list is the dialog plus a named list that keeps the
  query.

## Run again when

The dialog is reachable from the Selection row and from a table column's menu (or an attribute's
menu), and the Data place no longer opens on another scenario's filter. Ask the named-list question
again once a selection exists on screen.
