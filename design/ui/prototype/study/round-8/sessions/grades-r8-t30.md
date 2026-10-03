# Grades: adding April's transfers to March's loaded table (task r8-t30)

The task re-tests a problem that was rated severity 4 last round: adding rows to a table that is
already loaded. Participants started on "Transfers, March 2026", with March's Louvain groups
colored, a "Links in (count)" ranking layer and an "amount is at least 1,000" filter. They were
told April's transfers had arrived as a second file with the same columns, and that the one
transfers table should hold both months from now on, keeping everything already built.

Five simulated participants ran it on the clickable skeleton. Grades are decided by what was on
screen at the end and what the participant concluded, not by what they believed.

What success required, in order:

1. From the graph, open the Data place.
2. Open the transfers file's own menu (its "..." button, or a right-click) and choose "Add rows
   from file...".
3. On the page headed "Add to transfers", read what the add will do: the Makes line
   "account (3,000 + 132 added) --transfers (9,113 + 8,370 added)--> account", and the report's
   8,370 rows to add, 0 repeated rows, 132 new accounts.
4. Press Add.

Success with difficulty allowed trying the Sources "+" first, a detour before reading the counts,
a wrong turn, a long search, or finding the file's menu only through a hover tooltip. Failure was
replacing March, or opening April as a new graph.

## Outcome

| | Count |
|---|---|
| Success | 0 |
| Success with difficulty | 5 |
| Failure | 0 |
| Gave up | 0 |

All five rated themselves a failure. All five are graded success with difficulty: every one
reached "Add to transfers", read the counts aloud correctly, kept "Add these rows to transfers"
chosen, and pressed Add. None chose "Replace with file..." or the replace link, and none opened
April as a new graph. Every one needed at least one wrong turn and a hover tooltip to find the
file's menu, so none is a clean success.

The gap between their verdict and the grade is entirely the screen that follows Add, which is
outside the graded path and is the most important finding of this task. See "The screen after
Add" below. The grade is about whether the way to the add is findable and the preview is
understood; on that, the design held. It is not evidence that the add itself is safe, because
the skeleton never shows a finished add.

## Per participant

| Participant | Their verdict | Grade | Path to the page | Ended on |
|---|---|---|---|---|
| Fraud analyst | failure | success with difficulty | Data; hover on the file name (nothing); clicked the graph's "More" menu by mistake; clicked the file row, which opened "Edit: transfers" with no add; found the row's dots through the tooltip "Actions for transfers-2026-03.csv"; "Add rows from file..." | Pressed Add on "Add to transfers" after reading 9,113 + 8,370 and 8,370 / 0 / 132. Repeated it twice, once choosing "Add these rows to transfers" first |
| Alert reviewer | failure | success with difficulty | Data; clicked the file row (edit page, no add); file settings popover; the Sources "+" ("Add to Transfers"), whose File... went to "Open as a new graph" showing March's file (she cancelled); "Set collection..." added an unrelated source; finally the row's dots through hover, "Add rows from file..." (eleven tries) | Pressed Add after reading the Makes line and 8,370 / 0 / 132 |
| Nonprofit operations analyst | failure | success with difficulty | Data; clicked the file row (edit page, no add); clicked the graph's "More" menu; opened the accounts file's dots by mistake; then the transfers file's dots, "Add rows from file..." | Pressed Add after reading 9,113 + 8,370 and 8,370 / 0 / 132; repeated with the add choice clicked explicitly |
| Data journalist | failure | success with difficulty | Data; hover on the file name (nothing); landed on the graph's "More"; clicked the file row (edit page, no add); file settings; learned the dots' name from a hover on the accounts file's dots; then the transfers file's dots, "Add rows from file..." | Pressed Add after reading the Makes line and 8,370 / 0 / 132; repeated with the add choice clicked explicitly |
| Cybersecurity analyst | failure | success with difficulty | Data; clicked the file row (edit page, no add); clicked the file name in the editor (nothing); opened the graph's "More" menu; hovered several icons to read tooltips; then the transfers file's dots, "Add rows from file..." (about 90 seconds) | Pressed Add after reading the Makes line and 8,370 / 0 / 132; checked the Edges table afterwards |

The alert reviewer is the only one who tried the Sources "+" first. It did not offer to add rows
to transfers: its File... item led to "Open as a new graph" with March's file in it. She
recognized the danger and cancelled, so this is not the failure "opens the batch as a new
graph", but it is a near miss on exactly that failure.

## The screen after Add (severity 4, 5 of 5, not graded)

In the skeleton, Add on "Add to transfers" goes to the same state that a brand-new load of the
transfers goes to: the Graph tree is empty except Selection, Notes and Everything, the canvas is
gray with "Nothing is colored or sized by a row", the Louvain result, the "Links in (count)"
layer and the amount filter are gone, the summary still reads 3,000 nodes and 9,113 transfers,
the Data place still lists only the March file, the title still reads "Transfers, March 2026",
and Undo answers "Nothing to undo".

All five read this, independently, as the add having destroyed their work without adding April:

- Fraud analyst: "My work did not survive. That is the exact opposite of what I asked for."
- Alert reviewer: "It wiped what I built and added nothing."
- Nonprofit operations analyst: "'Nothing to undo.' That's the worst thing it could say."
- Data journalist: "A tool that wipes my work on the confirm button ... I cannot trust with a
  story."
- Cybersecurity analyst checked the Edges table: 9,113 edges, March dates only.

This is very likely a wiring fault of the skeleton rather than a design decision: the add page's
finish target is the fresh-load state. But it means the round has no evidence at all about the
thing the severity-4 finding was about -- whether a reader trusts that an add kept their work.
Until the skeleton draws a finished add (17,483 transfers, 3,132 accounts, April listed under the
transfers source, Louvain and the ranking still present and marked as computed on March's data,
the filter kept, Undo naming the add), the regression is not closed. Every participant described
that same finished state unprompted as what would have satisfied them.

## Other findings

| Finding | Participants | Severity |
|---|---|---|
| The file's own menu is hard to find: clicking the file row opens "Edit: transfers", which has no way to add a file; the graph's "More" button looks the same as the file's dots and offers "Clear graph data"; all five relied on a hover tooltip to tell the dots apart | 5 of 5 | 3 |
| On "Add to transfers", the Tables list shows April as its own row ("transfers-202...", 8,370) under transfers, while the report says the rows go into transfers; read as "is this a second table?" | 5 of 5 | 2 |
| "132 new accounts" gives no way to see them, and does not say they will have no account attributes (country, risk score) from the accounts file; fraud and threat analysts named these as exactly the accounts they would investigate | 4 of 5 (all but the alert reviewer) | 2 |
| The Sources "+" is labeled "Add to Transfers", but none of its items adds rows to the transfers table; its File... opens "Open as a new graph" | 1 of 5 tried it; 3 more avoided it believing it makes a new table | 3 |
| "Set collection..." under the Sources "+" added a source with no confirmation | 1 of 5 | 2 |
| The add page does not say what happens to existing results, layers and filters | 1 of 5 said so directly; all five assumed they were kept | 2 |
| "Replace with file..." sits directly above "Add rows from file..." in the file menu | 1 of 5 | 1 |
| Add's tooltip says "Add Enter", but Enter only confirmed the choice with a toast ("Set aside: transfers-2026-04 as its own table"), which read as the opposite of adding | 1 of 5 | 2 |
| Undo's tooltip does not say what it would undo | 1 of 5 | 1 |

## Logged, not graded

- No file picker: "Add rows from file..." opens the page with transfers-2026-04.csv already
  chosen. Only the cybersecurity analyst remarked on it, in passing ("Picked
  transfers-2026-04.csv"); no one asked where to choose the file.
- Caption-gray file lines in the Data place: no participant commented on their legibility. The
  hover attempts on file names were about finding the menu, not about reading the text.
- One participant, the data journalist, noticed that the first six April rows have the same
  accounts and amounts as the first six March rows with only the dates moved, and wondered
  whether March had been re-sent; the "0 repeated rows" line persuaded her it compares the time.
  That is a sample-data artifact worth fixing so it does not cast doubt on the repeated-row count.

## What worked

- "Add rows from file..." is in the participants' own words: four of five said so unprompted.
- The preview was called the best part of the task by all five: the Makes line with "+ added"
  counts, "0 repeated rows", "132 new accounts", and the plain warning that replacing drops
  March's rows. Two (the nonprofit operations analyst and the data journalist) said it is better
  than what they use today.
- No participant replaced March or opened April as a new graph.
