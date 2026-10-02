# Round 7 grades: bring in transfers and the account list (Transfers, March 2026)

Task as given: "You were sent this month's transfers as one spreadsheet, and the bank's account
list as a second spreadsheet. Bring both in so each transfer links the paying account to the
receiving account, with the account details attached, and check it before you go on."

Grading bar:

- Success: the account list is added on the import screen through the "+" by Tables, the
  transfers table then reads "From -> account" and "To -> account", the match report says every
  row has both ends, Load is pressed, and the loaded graph shows 3,000 accounts and 9,113
  transfers.
- Success with difficulty: adds the account list only after loading the transfers alone, or needs
  two tries to find where the second spreadsheet goes.
- Failure: brings the account list in as a separate graph, or loads without tying the transfers
  to the accounts.
- Gave up: stops before loading, with nothing tied together.

The intended path: the import screen with the transfers alone ("node --transfers--> node"), then
the same screen with the accounts table added ("account (3,000) --transfers (9,113)--> account
(3,000)"), then the loading screen, then the loaded graph.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | Conclusion |
|---|---|---|---|---|
| Fraud analyst (Sarah) | success with difficulty | success with difficulty | Loaded graph, Edges table: 9,113 edges, sum of amount; Sources lists accounts 3,000 | "Mostly" -- tied account to account, but would not hand it to a reviewer yet |
| Alert reviewer (Nadia) | success with difficulty | success with difficulty | Loaded graph, Nodes table: 3,000 accounts from the account file with kind and country | "Mostly" -- matching inferred from 3,000 = 3,000 |
| Analyst Alex | success with difficulty | failure | Loaded graph, Data rail, accounts source opened; "account --transfers--> account" | "It's in, I think, not I did it" -- never added the account list |
| Supply chain analyst (Dana) | success with difficulty | success with difficulty | Loaded graph, Nodes table: 3,000 accounts with kind, country, links in and out | "Mostly" -- unsure every transfer found its account |
| ML engineer (Chris) | success with difficulty | success with difficulty | Loaded graph, Nodes table; derived the join check from counts and degree 0 | "Yes, I think so" -- path was rough |

Totals: 0 success, 4 success with difficulty, 1 failure, 0 gave up.

Every participant found the "+" by Tables (most only after the hover named it "Add a table") and
chose "File..." first, which is the right choice for a spreadsheet on their drive. Nobody got a
second table from it. The four who reached the tied-together screen got there through
"From a URL...", the third menu item, after "Paste..." had replaced the whole import with an
unrelated graph.

## Why each grade

**Fraud analyst -- success with difficulty.** Took three menu items to reach the accounts table
(File did nothing visible, Paste wiped the import, From a URL added it). Opened both tables and
read the transfers table as "From -> account" / "To -> account" with "every row has both ends".
Removed the extra alerts table, pressed Load, and checked the Nodes and Edges tables: 3,000
accounts with their details and 9,113 edges with a control total. Every part of the bar was met
on screen; the wrong turns make it a difficulty.

**Alert reviewer -- success with difficulty.** Same three-item search through the add menu.
Checked the accounts table (3,000 rows, unique keys) and the transfers table ("From -> account",
both ends, 9,113 edges), loaded, and read 3,000 accounts and 9,113 edges in the tables. Noticed
the amount filter cut the view to 812 and correctly concluded it was the view, not the data.

**Analyst Alex -- failure.** Tried File and Paste, opened "From a URL..." and backed out of it
on purpose ("I don't trust a screen that skipped my steps"), then pressed Load on the transfers
alone, which still read "node --transfers--> node". That is loading without tying the transfers
to the accounts. The loaded graph then showed the accounts source anyway, because the skeleton
has only one loaded state for this task; Alex attributed it to the File picker ("I genuinely
don't know when that happened"). The grade follows what Alex did and what Alex would have
gotten: in the real product that Load produces an untyped node-to-node graph with no account
details. It is not the "added after loading" difficulty case, because Alex never added the
list after loading either.

**Supply chain analyst -- success with difficulty.** Searched for "Import" before finding
"Add a table", then the same File / Paste / From a URL sequence. Read both tables, hovered before
removing (avoided removing the transfers by accident), removed the alerts table, loaded, and
checked 3,000 accounts with their details in the Nodes table.

**ML engineer -- success with difficulty.** Same three-item search. Read both tables and the
"account (3,000) --transfers (9,113)--> account (3,000)" line, removed the alerts table, loaded,
and verified the join from counts (3,000 nodes = 3,000 unique keys, no degree-0 nodes). Reached
every point of the bar.

## Findings, with counts

Severity is Nielsen's 0-4 scale.

1. **"File..." on the add-table menu does nothing visible (5 of 5; severity 4 in the skeleton,
   to be confirmed).** Every participant chose File first and got only a "Opens the file picker"
   toast. This is mostly a skeleton gap -- the picker cannot open in a mock -- but it means the
   study never observed the intended route, and every success here ran through the wrong menu
   item. The skeleton should make File add the accounts table, so the next round measures the
   real path instead of a detour.
2. **"Paste..." replaces the whole import with an unrelated graph (5 of 5; severity 4).** The
   title becomes "Les Miserables", the transfers table disappears and XML nobody pasted appears.
   All five read it as their work being thrown away. Whatever Paste opens in the product, it must
   add a table to the current import, never replace it.
3. **No line says how many transfer ends were found in the account list (5 of 5; severity 3).**
   "Every row has both ends" read to all five as "no blank cells", not "every account matched".
   All five had to infer the join from 3,000 = 3,000. The alerts table already gets "14 of 14
   matched"; the transfers table needs the same: "from_account: 9,113 of 9,113 found in
   accounts, 0 unknown", and the same for to_account. This is the one check the task asks for.
4. **"From a URL..." adds a table from an address nobody typed (5 of 5 opened it; severity 2,
   mostly a skeleton artifact).** It jumps to the finished state with an extra alerts feed. Two
   participants worried that the tool had contacted a server on its own. Treat as a mock
   artifact, not a product finding, except that it masked finding 1.
5. **An "amount is at least 1,000" filter is already on after Load (5 of 5 noticed; severity 3).**
   The header reads "812 of 3,000 nodes". All five saw it and none had set it; two said they
   would have worked on a quarter of the accounts without knowing. A freshly imported graph
   should load unfiltered, or say plainly where an inherited filter came from.
6. **A removed source comes back after Load, and "from 2 tables" sits over three sources
   (3 of 3 who removed it; severity 3).** Fraud analyst, supply chain analyst and ML engineer
   removed the alerts table; it reappeared in Sources after Load. The alerts columns also stayed
   on the accounts table after removal (2 of 3 noticed). A removal must stick and take its
   columns with it.
7. **Removing a table says "Deleted <url>" (2 of 5; severity 2).** Read as deleting the data at
   its source. Say "Removed from this graph".
8. **The "+" by Tables has no visible label (3 of 5 searched by name first; severity 2).**
   Participants tried "+", "Add table" and "Import" before the hover named it. The supply chain
   analyst looked for "Import" first.
9. **Amount turned into a Weight ("Stronger") without being asked (2 of 5 objected; severity 1).**
   Accepted by the others. Money is not a strength to a fraud or supply chain reader.
10. **Smaller, single-voice notes (severity 1):** amounts rounded in the edge table (44.63 shown
    as 44.6; fraud analyst); node table opens at rows 381-420 instead of the top (ML engineer,
    supply chain analyst).

## What this round can and cannot say

It cannot say whether the intended route works, because no participant was able to take it:
File is the right choice and the skeleton does nothing with it. What it does say, from all five,
is that the "+" by Tables is where people look for the second spreadsheet, that the
"account --transfers--> account" line is what convinced them the join happened, and that the
match report stops one line short of the check every one of them wanted. Rerun this task once
File adds the accounts table and Paste no longer replaces the import.
