# Session: bring in transfers and accounts -- Chris (ML engineer, recommendation systems)

Task given by the moderator: "You were sent this month's transfers as one spreadsheet, and the
bank's account list as a second spreadsheet. Bring both in so each transfer links the paying
account to the receiving account, with the account details attached, and check it before you go
on."

Start screen: shots/tasks/t14-transactions/01.png. Renders in
tmp/round-7-sessions/t14-transactions--ml-engineer-recsys/. All commands were run from
design/ui/prototype.

## Steps (think-aloud)

**01 (start).** "OK, the transfers CSV is already parsed. from_account and to_account are auto-set
to From/To, amount is a number and timestamp is a date. The header line reads
'node --transfers-2026-03 (9,113)--> node', and the report says 3,000 ids in nodes of type 'node'.
That's honest, I like the report. Now I need the account list. The '+' next to Tables is the
obvious place."

**02.** `timeout 120 node app-b/study.mjs --try .../02.png task:t14-transactions --hover "Add"`
"Tooltip: 'Add a table'. Good."

**03.** `... --try .../03.png task:t14-transactions --click "Add a table"`
"Menu: File..., From a URL..., Paste.... My account list is a file."

**04.** `... --click "Add a table" --click "File..."`
"Toast: 'Opens the file picker'. Nothing else happens; I'd pick accounts.csv here, but no table
shows up. Try another route."

**05.** `... --click "Add a table" --click "Paste..."`
"Whoa. The title changed to 'Les Miserables', my transfers table is gone and there's some
GraphML XML pasted in with an error. Paste didn't add a table, it replaced my whole import. That
would scare me off if it were real. Back out."

**06.** `... --click "Add a table" --click "From a URL..."`
"Now the header says 'Add to Transfers', not 'Open as a new graph'. The tables are accounts
(3,000), transfers (9,113) and a 'structuring alerts' table (14) from some alerts.bank.example
URL. I never asked for alerts. But accounts is there, so I'll go with it."

**07.** `... --click "Add a table" --click "From a URL..." --click "accounts"`
"accounts-2026-03.csv: id is the Key, then kind, country, riskScore, flagged, alertRule and
alertTime as attributes. 'Every key is unique', good. The top line now reads
'account (3,000) --transfers (9,113)--> account (3,000)'. That's the graph I want."

**08.** `... --click "transfers"`
"from_account is 'From -> account', to_account is 'To -> account', amount became the Weight
('Higher means Stronger', fine for money) and timestamp is a Time. The report says '9,113 rows;
every row has both ends', but it said the same before accounts existed, so that's just
'no blanks'. It does NOT say how many from/to ids were found in the account list. That's the one
number I want."

**09.** `... --click "Add a table" --click "From a URL..." --hover "Remove"`
"The tooltip landed on 'Remove transfers'. Careful. Also note: the alerts report says
'Adds 2 columns to account: 14 of 14 matched'. THAT is the line I wanted on transfers."

**10.** `... --click "Remove structuring alerts"`
"Deleted, with Undo. Now it's account (3,000) --transfers (9,113)--> account (3,000). Directed is
selected, which is right for payments."

**11.** `... --click "Remove structuring alerts" --click "Load"`
"Loaded. 3,000 nodes, 9,113 edges, directed, 1 weak component, reciprocity 0, highest degree 907
(a hub; I'd look at that later). But:
- The alerts source I deleted is back in Sources ('alerts.bank.example/struct... 14 rows'), while
  the panel says 'from 2 tables'. Which is it?
- A filter 'amount is at least 1,000' is on, so it's 812 of 3,000 nodes. I didn't set that.
  Presumably it was already on the graph I 'added to'. It's not obvious.
- The canvas is a gray hex blob. Fine, I didn't want a picture."

**12.** `... --click "Load" --click "Table"`
"Nodes table: '3,000 nodes (before the filter) from the node file accounts-2026-03.csv', with id,
links in/out/total, kind, country... so the account details are on the nodes. Check by counts:
3,000 nodes equal 3,000 unique account keys, so no transfer pointed at an unknown account (that
would have added a node). The degree chart shows 0 nodes at degree 0, so no account is unused.
There are 9,113 edges for 9,113 rows. I'm satisfied, but I had to derive the join check myself.
Odd: the table opened at 'Rows 381 to 420', not row 1."

## Outcome

- Succeeded? Yes, I think so: the transfers link account to account, and the account attributes
  are attached. The path there was rough, though.
- Single Ease Question: 4 / 7.
- Would I use this instead of my current tool? Not instead of it. In a notebook this is a
  pd.merge plus two asserts. I would use it alongside, for the first look at a new file: the
  'Makes' line and the match report are better than what I get from pandas by default. To trust
  it I need three things. The edge table should report 'from_account: N of N found in accounts,
  K unknown', like the alerts table did. A deleted source must stay deleted. And it should tell
  me when a filter from an earlier session is already hiding three quarters of the graph.

## Problems noted

1. "Paste..." replaced the whole import, title included, with an unrelated dataset, and lost my
   transfers table.
2. "From a URL..." added a table I never asked for (structuring alerts), along with the accounts
   I wanted.
3. The transfers match report has no count of ids matched against the account list; the alerts
   table gets one ("14 of 14 matched").
4. A source deleted before Load reappears in Sources after Load; the panel says "from 2 tables"
   but lists 3.
5. A pre-existing filter ("amount is at least 1,000") is active after the load, with no notice.
6. The node table opens at rows 381-420 instead of the top.
