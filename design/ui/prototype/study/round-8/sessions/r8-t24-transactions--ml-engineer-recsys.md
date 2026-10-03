# Session: two spreadsheets to one transfer network -- Chris, ML engineer (recommendation systems)

Task as given: "Two spreadsheets are open on the program's import page: a list of accounts and a log
of transfers between them. If you do not work in banking, treat this as example data. Make one
network of accounts tied by their transfers, and check that no transfer refers to an account missing
from the list."

Renders: tmp/round-8-sessions/r8-t24-transactions--ml-engineer-recsys/

## Step 1 -- the start screen (shots/tasks/r8-t24-transactions/01.png)

No command; this is the starting screen.

Think-aloud: "Not banking, but an edge list plus a node table is exactly my world: interactions
plus a catalog. Left side has two tables, accounts 3,000 and transfers 9,113, both with a green
check. Transfers is open. The header line says `account (3,000) --transfers (9,113)--> account
(3,000)` -- that's the schema I'd write in a notebook, good. from_account is mapped From -> account,
to_account To -> account, amount is the weight, timestamp is time. It guessed all of that right.

Down at the bottom there's a 'Match report'. I skip help text, but this is numbers, so I read it:
'9,113 of 9,113 from_account found in accounts. 9,113 of 9,113 to_account found in accounts.' That
is literally the check I was asked to do. It's the anti-join I'd do in pandas, with the counts. It
also says the data stays local -- I care about that. Before I trust it I want to see what it's
joining against on the accounts side."

## Step 2 -- look at the accounts table

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t24-transactions --click "accounts"

Think-aloud: "id column is tagged Key, and the report says '3,000 rows; every key is unique.'
Good -- if the key had duplicates the 'found in' numbers would be meaningless. Type is 'account',
each row is a node. Other columns are attributes (kind, country, riskScore, flagged). One thing I
would want and don't get: how many accounts have NO transfers at all. That's the cold-start
question in my world. Not what I was asked, though. Load."

## Step 3 -- load

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t24-transactions --click "accounts" --click "Load"

Think-aloud: "Summary on the right: 3,000 nodes, 9,113 transfers 'each a distinct pair',
directed, weight 'amount, stronger', one weak component, highest degree 907 (matches the 'top node'
from the import report), and the degree plot says 0 at degree 0. So node count equals the account
list -- no extra nodes were created for unknown ids, and every edge loaded. That's my independent
confirmation of the match report. It drew a hex density blob, not a hairball; I'll take it. The
log-log degree CCDF is the first thing I'd plot myself, nice that it's just there. Done."

## Outcome

- Succeeded? Yes. One network of 3,000 accounts and 9,113 transfers, and the check was answered
  twice: the import's match report (9,113 of 9,113 on both ends, keys unique) and the loaded graph
  (3,000 nodes, not more).
- Single Ease Question: 6 of 7. Took three clicks, and most of that was me double-checking.
  Not a 7 because the match report sits below the fold-ish under a mostly empty preview, and
  it doesn't say what WOULD happen to an unmatched id (dropped row? new node?) -- I had to infer
  it from the node count after loading.
- Would I use this instead of my current tool? For this job, maybe. In pandas it's a two-line
  anti-join, but here I got the join check, the uniqueness check, the weight/time typing and a
  degree distribution without writing anything, all local. What would decide it: does this
  import read Parquet, and does it hold at tens of millions of rows. If I have to convert to CSV
  first, I'm back in the notebook.

## Notes for the record

- The check the task asks for was already on screen at the start; no searching needed.
- Missing: count of accounts with zero transfers on the import report; a line saying what happens
  to a row whose account is not in the list.
