# Session: bring in transfers and the account list -- Dana Okafor (supply chain risk analyst)

Task as given: "You were sent this month's transfers as one spreadsheet, and the bank's account
list as a second spreadsheet. Bring both in so each transfer links the paying account to the
receiving account, with the account details attached, and check it before you go on."

Renders are in tmp/round-7-sessions/t14-transactions--supply-chain-analyst/. Every command was run
from design/ui/prototype with `timeout 120 node app-b/study.mjs --try <png> task:t14-transactions ...`;
only the steps are listed below.

## Start (shots/tasks/t14-transactions/01.png)

A data screen with the transfers file already open: from_account and to_account marked
"From -> node" and "To -> node", amount and timestamp as attributes. Match report: 9,113 rows,
3,000 ids, 9,113 edges.

Think-aloud: "OK, the transfers are in and it guessed the two account columns. It calls my accounts
'node' -- fine, whatever. Now I need the account list. There's a plus next to Tables."

## Step 1 -- find how to add the second file (02.png)

- `--hover "Add table"` -> nothing on screen is called "Add table"
- `--click "+"` -> nothing on screen is called "+"
- `--hover "Import"` -> nothing on screen is called "Import"
- `--hover "Add"` -> tooltip shows "Add a table" (02.png)

"I looked for 'Import' first, that's what every tool calls it. The plus is 'Add a table'. Fine."

## Step 2 -- Add a table (03.png)

`--click "Add a table"` -> menu: File..., From a URL..., Paste...

"File. My account list is a CSV on my drive."

## Step 3 -- File... (04.png)

`--click "Add a table" --click "File..."` -> a toast "Opens the file picker" and nothing else
changes. The account list never appears.

"Nothing happened. I'd pick my file here, I guess, but nothing shows up."

## Step 4 -- Paste... (05.png)

`--click "Add a table" --click "Paste..."` -> the graph name changes to "Les Miserables", my
transfers table is gone from the Tables list, and there is a pasted XML snippet with a warning
"choose GraphML or GEXF". Load is off.

"Whoa. Where did my transfers go? What is Les Miserables? I didn't paste anything. If this happened
for real I'd close the tab and think it lost my data."

## Step 5 -- From a URL... (06.png)

`--click "Add a table" --click "From a URL..."` -> header now says "Add to Transfers". Tables:
accounts 3,000, transfers 9,113, and a "structuring alerts" table (14 rows) from
https://alerts.bank.example/structuring/2026-03.json that I never typed. "Makes: account (3,000)
--transfers (9,113)--> account (3,000)   account (3,000) + structuring alerts columns".

"I didn't type a URL, but now there's an accounts table -- that's my bank list -- plus an alerts
table I never asked for. OK, at least 'accounts' is here."

## Step 6 -- look at the accounts table (07.png)

`... --click "accounts"` -> accounts-2026-03.csv, each row is a node, id is the Key, kind, country,
riskScore, flagged, alertRule, alertTime. "3,000 rows; every key is unique."

"Good, that's the list: id, business or personal, country, a risk score. Unique ids, that I like.
But the alert columns are already stuck onto it."

## Step 7 -- look at the transfers table (08.png)

`... --click "transfers"` -> from_account now "From -> account", to_account "To -> account".
amount has become "Weight" with "Higher means: Stronger / Farther / Capacity" (Stronger picked),
timestamp became "Time". Report: 9,113 rows, every row has both ends, 9,113 edges.

"Now the ends say 'account', so it joined them to the list. But 'every row has both ends' -- does
that mean every account was found in the bank list, or just that the cells aren't blank? I want a
line that says 'all transfers matched an account on the list'. And it turned amount into a
'Weight, Stronger' on its own. I didn't ask for that; amount is money, not a strength."

## Step 8 -- remove the alerts table I didn't want (09.png, 10.png)

`... --hover "Remove"` -> the tooltip on the first minus says "Remove transfers" (09.png).

"Glad I hovered. I nearly deleted my transfers."

`... --click "Remove structuring alerts" --click "accounts"` -> toast "Deleted
https://alerts.bank.example/structuring/2026-03.json  Undo". The "Makes" line drops
"+ structuring alerts columns", but the accounts table still shows alertRule and alertTime filled in
(10.png).

"So it says the alert columns are gone, but they're still sitting in my accounts table. Which is it?
That's exactly how I stop trusting a tool."

## Step 9 -- Load (11.png)

`... --click "Remove structuring alerts" --click "Load"` -> graph view. Sources lists
accounts-2026-03.csv (3,000 nodes), transfers-2026-03.csv (9,113 edges) AND
alerts.bank.example/struct... (14 rows) -- the one I removed. A filter "amount is at least 1,000"
is already on, so the top bar says "812 of 3,000 nodes". The right panel says "from 2 tables",
Nodes 812 of 3,000, Edges 9,113, Weak components 1. The picture is a gray hex blob.

"It's loaded, but the alerts source I deleted is back, and someone switched on an amount filter I
never set. 'From 2 tables' but three sources listed. The picture is a hairball -- nothing I'd show
anyone."

## Step 10 -- check it in the table (12.png)

`... --click "Load" --click "Table"` -> nodes table: "3,000 nodes (before the filter) from the node
file accounts-2026-03.csv", columns id, Links in, Links out, Links total, kind, country. Opened on
"Rows 381 to 420 of 3,000".

"This is the part I'd trust. Each account has its kind and country and how many transfers go in and
out -- ACC-633005, business, GB, 15 out. So the details are attached and the transfers hang off the
right accounts. What I still can't see is whether any transfer pointed at an account that's NOT on
the bank's list. The first screen found 3,000 ids and the list has 3,000 rows, so I'm assuming they
match. One account has 907 transfers -- I'd want to look at that next. And why did the table open on
row 381?"

Stopped here.

## Verdict

- Succeeded? Mostly. Both files are in, transfers run account to account, and the account details
  show in the table. I am not sure every transfer found its account, the alerts data I removed came
  back, and a filter I never set is on.
- Single Ease Question: 3 of 7.
- Would I use it instead of my current tool? Not yet. In Excel I'd XLOOKUP the account list onto the
  transfers and count the #N/A rows -- ten minutes, and I'd know for sure how many didn't match. Here
  the join itself was easy once I found it, and I liked "every key is unique" and the Makes line. But
  File did nothing, Paste swapped my whole graph for something called Les Miserables, URL pulled in
  data I never asked for, and Remove didn't really remove it. If it can't tell me plainly "X
  transfers have no matching account" and leave out what I deleted, I'm back in Excel. And I'd still
  need IT to sign off and a way to get the table into Power BI.
