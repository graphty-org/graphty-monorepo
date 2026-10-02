# Round 7 grades: bring in transfers plus the account list (Transfers, March 2026)

Task as given: "The transfers came as one spreadsheet that only has account numbers. The bank's
account list, which says for each account whether it belongs to a business, a person or a
merchant, and which country it is in, is a second spreadsheet. Bring both in so each account
carries its details, and treat business, personal and merchant accounts as different sorts of
account."

Grading bar:

- Success: the account list is added as a second table tied to the transfers by account number,
  kind is set as the account's Subtype (three subtypes), and Load leaves the transfers graph.
- Success with difficulty: the same end, reached with a wrong turn, a long search or help from a
  hover; or the details arrive but kind stays an ordinary column and the participant says it
  should split the accounts.
- Failure: brings the account list in as its own graph, or ends somewhere else.
- Gave up: stops with nothing loaded and no answer.

The intended path is: the import screen with the transfers set up as edges, then the same screen
with the accounts table added beside it, then the accounts table with kind set to Subtype
("kind makes 3 subtypes of account: merchant (60), business (330), personal (2,610)"), then Load,
which leaves the transfers graph built from both tables.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | SEQ |
|---|---|---|---|---|
| Fraud analyst (Sarah) | success with difficulty | success with difficulty | Loaded transfers graph, node table open: kind and country per account | 3 |
| Alert reviewer (Nadia) | success with difficulty | success with difficulty | Loaded transfers graph, node table open: kind and country per account | 4 |
| Analyst Alex | success with difficulty | success with difficulty | Accounts table reopened from the loaded graph, kind still Subtype after Apply | 3 |
| Supply chain analyst (Dana) | success with difficulty | success with difficulty | Loaded transfers graph, node table open | 4 |
| Genomics Cytoscape user (Maren) | success with difficulty | success with difficulty | Loaded transfers graph, node table open | 4 |

Totals: 0 success, 5 success with difficulty, 0 failure, 0 gave up. Mean SEQ 3.6 of 7.

Every participant ended on the right state: one graph of 3,000 accounts and 9,113 transfers, the
accounts keyed by id with kind and country on each row, and kind set to Subtype with the counts
60 / 330 / 2,610. Nobody loaded the account list as a graph of its own. Nobody took the clean
path either, which is why none is graded plain success.

## Why each grade

**Fraud analyst -- success with difficulty.** Hovered the plus ("Add a table"), tried File...
(only a "Opens the file picker" message), then Paste... (the project turned into Les Miserables
and her transfers vanished from the list), then From a URL..., which showed the accounts table
she wanted along with a structuring-alerts table she never asked for. Clicked the word "Type",
then the Type box (offers only one name for the whole table), then the kind header, before
finding Subtype under the gray "Attribute" label. Loaded, checked the node table, and concluded
correctly that each account carries kind and country. Three wrong turns on the add step and
three on the subtype step.

**Alert reviewer -- success with difficulty.** The same sequence: File... dead end, Paste...
scare ("did I just lose the file?"), From a URL... giving the accounts table, then Type label,
Type box and kind header before Subtype. Checked 60 + 330 + 2,610 = 3,000 herself, loaded, and
confirmed kind and country in the node table. Her own doubt was whether "Subtype" is what
"different sorts" meant; the screen shows it is.

**Analyst Alex -- success with difficulty.** The longest route (20 renders). Several hover and
click guesses before the "Add a table" tooltip; File... and two attempts to pick the file by
name; Paste... (Les Miserables); From a URL..., which he refused to build on ("I didn't put this
together"); the main menu, looking for Import. He then loaded the transfers alone, and the
loaded graph already listed accounts-2026-03.csv as a source, which he found but had not added.
He reopened accounts from the Data rail, went to the Type box first, then found Subtype under the
kind column, applied it, and reopened to confirm it stuck. The end state meets the bar (two
tables, kind as Subtype, the transfers graph), but he never performed the add step at all; the
second table was put there by the prototype.

**Supply chain analyst -- success with difficulty.** File... dead end, Paste... scare, From a
URL... giving the accounts table; went to the Type box before Subtype. Tried to remove the alerts
table and could not name its minus button. Loaded, saw 812 of 3,000 under a filter she did not
set, and confirmed kind and country in the node table. Concluded correctly that the join and the
split are done.

**Genomics Cytoscape user -- success with difficulty.** Same add-step detour (File..., Paste...,
From a URL...); went straight to the Type box, then to Subtype under kind, with no further
misses. Loaded and confirmed the details in the node table. The cleanest of the five after the
add step.

## What the grades do and do not show

**The add-a-second-table step was not tested.** In the prototype, "Add a table > File..." only
shows a message, "Paste..." jumps to an unrelated project, and "From a URL..." jumps straight to
the state where the accounts table is already added (with a third, unrequested alerts table). So
all five got the account list in by a click that does not match what they meant to do, and
Alex got it by loading without adding anything. The finding that holds is narrower: all five
found "Add a table" on the plus next to Tables (four by hovering), and all five chose File...
first. Whether a real file picker leads them on to the join is still open.

**The prototype itself caused the two worst moments.** These are mock-fidelity effects, not
evidence about the design, but they cost trust in every session and should be fixed in the
skeleton before this task is run again:

- Paste... replaced the whole project with the Les Miserables sample and its XML (5 of 5 hit it;
  each said they would have closed the tab or stopped trusting the tool).
- From a URL... filled in an address nobody typed and added a "structuring alerts" table nobody
  asked for (5 of 5 noticed; 2 of 5 raised a data-leaving-the-machine worry).
- The loaded graph opened with a filter "amount is at least 1,000" switched on (812 of 3,000
  nodes) and a second filter "kind is not merchant" switched off, neither set by the participant
  (5 of 5 noticed; for Alex it then disappeared after Apply). The intended end screen shows
  "Full graph", so this is state carried over from another task.

**Findings about the design, with evidence counts and severity (Nielsen 0-4):**

| Finding | Seen by | Severity |
|---|---|---|
| The first place everyone looked to make "different sorts" was the table's Type box, which only offers one name for the whole table and "Rename type"; Subtype lives under the kind column's gray "Attribute" label, which reads as a caption, not a control. Three also clicked the word "Type" or the kind header first. | 5 of 5 | 3 |
| After Load, kind is listed as used for "Color (kind)" while the canvas is all gray with "Nothing is colored or sized by a row". Nobody could see the three sorts on the picture, and there is no legend. | 5 of 5 | 3 |
| The match report never says how many transfer account numbers were found in the account list ("3,000 of 3,000 matched"); "every row has both ends" answers a different question. Raised unprompted as the first thing they would check. | 2 of 5 (Dana, Maren) | 2 |
| The right panel says "Graph from 2 tables" while Sources lists three. | 3 of 5 | 2 |
| Amount and timestamp were switched to Weight and Time without the participant doing it; "Higher means Stronger" makes no sense for money. | 2 of 5 (Sarah, Dana) | 2 |
| Two names for one job: "Add a table" in the editor, "Add data to this graph" on the Sources plus. | 1 of 5 (Alex) | 1 |
| After Apply, reopening the table shows Apply enabled again with nothing changed. | 1 of 5 (Alex) | 1 |
| After Apply, the Sources line still reads "account . 3,000 nodes"; the three sorts show nowhere outside the table editor. | 1 of 5 (Alex) | 2 |
| The node table opens on "Rows 381 to 420 of 3,000" instead of the top. | 2 of 5 | 1 |

**What worked, in every session:** the Subtype result. "kind makes 3 subtypes of account:
merchant (60), business (330), personal (2,610). Every node stays type account" was read, checked
against the total by three of them, and compared favorably to Excel, Gephi and Cytoscape. The
grayed roles that say why ("needs a Number") were praised by two. Several rated the subtype step
alone at about 6 of 7; the SEQ of 3 to 4 comes from the add step and the unexplained state after
Load.

## Caveats

- Five simulated participants, one prototype run each; the counts above are for direction, not
  rates.
- Four of the five began by hovering the plus with a guessed label ("Add", "Add a table"); the
  study tool matches on the tooltip text, so finding "Add a table" is slightly easier here than
  on a real screen where the plus has no visible label.
- All five took the same detour in the same order (File..., Paste..., From a URL...). That is the
  order of the menu, so it says little beyond "File... first".
