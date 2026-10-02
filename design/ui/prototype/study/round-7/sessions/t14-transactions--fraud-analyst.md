# Session: bring in transfers and the account list -- Sarah, fraud analyst

Task as given: "You were sent this month's transfers as one spreadsheet, and the bank's account
list as a second spreadsheet. Bring both in so each transfer links the paying account to the
receiving account, with the account details attached, and check it before you go on."

Mode: first impression, not mandated. All commands run from design/ui/prototype; renders are in
tmp/round-7-sessions/t14-transactions--fraud-analyst/. `T` below stands for
`timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t14-transactions--fraud-analyst/NN.png task:t14-transactions`.

## Step 1 -- start screen (shots/tasks/t14-transactions/01.png)

"OK, the transfers file is already in. from_account, to_account, amount, timestamp. It says it
makes 'node --transfers--> node'. Node. Fine, accounts. 9,113 rows, 3,000 ids, every row has both
ends. That's the transfers half. Now where does my account list go? There's a plus next to
'Tables'. That's the only thing that looks like 'add another'."

## Step 2 -- finding the plus (02-04)

    T --hover "+"            -> nothing on screen is called "+"
    T --hover "Add table"    -> nothing on screen is called "Add table"
    T --hover "Add a table"  -> 04.png, tooltip "Add a table"

"Right, 'Add a table'. Good, that's what I want."

## Step 3 -- the add menu (05)

    T --click "Add a table"

"File..., From a URL..., Paste... My account list is a spreadsheet on my drive. File."

## Step 4 -- File... (06)

    T --click "Add a table" --click "File..."

"A black bubble says 'Opens the file picker'. And... nothing. No picker, no second table. In real
life I'd pick accounts-2026-03.csv here, but I can't, so I'm stuck. Let me try the others."

## Step 5 -- Paste... (07)

    T --click "Add a table" --click "Paste..."

"Whoa. The title changed to 'Les Miserables'. My transfers table is GONE from the list. There's
XML about Napoleon. Where's my transfers file? I didn't ask for that. I'd be hitting Esc and
praying right now."

## Step 6 -- From a URL... (08)

    T --click "Add a table" --click "From a URL..."

"Now it says 'Add to Transfers', and the list has accounts 3,000, transfers 9,113, and
'structuring alerts' 14, fetched from https://alerts.bank.example/structuring/2026... I never
typed an address. It went out and fetched something? 'Fetched on the first of 3 tries.' If this
thing talks to a server on its own, I need to know which one. But -- there's an accounts table
in here. That's what I wanted."

## Step 7 -- look at accounts (09)

    T --click "Add a table" --click "From a URL..." --click "accounts"

"accounts-2026-03.csv, 3,000 rows, every key is unique. id is the Key, kind, country, riskScore,
flagged. And alertRule, alertTime -- those came off the alerts thing, they're not in my account
list. Top line now says 'account (3,000) --transfers (9,113)--> account (3,000)'. That's the
shape I want: account to account."

## Step 8 -- look at transfers (10)

    T --click "Add a table" --click "From a URL..." --click "transfers"

"from_account is From -> account, to_account is To -> account. Amount is the Weight, timestamp is
Time. 9,113 rows became 9,113 edges, no duplicates. What it does NOT tell me: do all 3,000
account ids in the transfers exist in my account list? Or did it make blank accounts for ones it
couldn't find? 'Every row has both ends' is not the same as 'every end matched the account
list'. That's the check I actually care about. The numbers both say 3,000, so I'll assume yes,
but I'm assuming."

## Step 9 -- get rid of the alerts I didn't ask for (11)

    T --click "Add a table" --click "From a URL..." --hover "Remove"   (tooltip found)
    T ... --hover "Remove table"  -> nothing on screen is called "Remove table"
    T --click "Add a table" --click "From a URL..." --click "Remove structuring alerts"

"Gone from the list. The bubble says 'Deleted https://alerts.bank.example/...'. Deleted? I hope
it means removed from here, not deleted at the bank. And alertRule and alertTime are STILL sitting
on my accounts table. So did I remove it or not?"

## Step 10 -- Load (12)

    T ... --click "Remove structuring alerts" --click "Load"

"Big gray blob. Hairball, as expected. But look at Sources on the left: accounts, transfers, and
'alerts.bank.example/struct... account . 14 rows'. I removed that! It's back. And the right side
says 'Graph from 2 tables' while the list shows three. Which is it?

And Filters: 'amount is at least 1,000', ticked, '812 of 3,000 nodes'. I didn't set that. Somebody
did. Top bar says '812 of 3,000 nodes'. If I hadn't looked I'd be working on a quarter of the
accounts without knowing why."

## Step 11 -- check the rows (13, 14)

    T ... --click "Load" --click "Table"
    T ... --click "Load" --click "Table" --click "Edges"

"Nodes table: 3,000 nodes before the filter, from accounts-2026-03.csv, with links in, links out,
kind, country. So the account details are on the accounts. Good.

Edges: from_account, to_account, timestamp, amount, 9,113 edges. 'Sum of amount, all 9,113 rows:
14,156,522'. THAT I like -- that's my control total, I can tie it to the spreadsheet footer.
But the amounts: 44.63 in the file shows as 44.6 here. Don't round my money. And the sum has no
cents either. If the total doesn't match to the cent, my reviewer bounces it."

Stopped here.

## Verdict

Did I succeed? Mostly. Transfers link paying account to receiving account, the account details
are on the accounts, 9,113 edges, 3,000 accounts, and I have a total I can tie out. But I only got
the account list in by a back door: 'File...' did nothing I could see, 'Paste...' threw my work
away and opened somebody else's graph, and 'From a URL...' dragged in an alerts feed I never asked
for. I removed it and it came back after Load, and a filter I never set is hiding three quarters
of the accounts. I would not hand this to a reviewer until I knew where that filter and that third
source came from.

Single Ease Question: 3 of 7.

Would I use this instead of what I have? Not yet. The import screen itself is better than i2's
wizard -- it guessed From and To and the key on its own, and the "account --transfers--> account"
line tells me what I'm getting in one look. The control total is genuinely useful. But it has to
tell me in plain words how many transfer ends did NOT match my account list, it must not round
amounts, and it must not add sources or filters I didn't ask for. Right now I'd still do the join
as a VLOOKUP in Excel, because there I know what's in it.

## Problems seen

1. "File..." shows only a bubble "Opens the file picker"; no second table appears (06).
2. "Paste..." replaces the whole graph with an unrelated one ("Les Miserables"); the transfers
   table disappears with no warning (07).
3. "From a URL..." fetches from an address the user never typed and adds a third table
   ("structuring alerts") nobody asked for (08).
4. No match report line says how many transfer account ids were found / not found in the account
   list -- the one check the task asks for (10).
5. Removing the alerts table says "Deleted <url>" -- reads like deleting the remote data (11).
6. After removing the alerts table, alertRule and alertTime columns stay on the accounts (11), and
   the alerts source reappears in Sources after Load, while the header says "from 2 tables" (12).
7. An "amount is at least 1,000" filter is on after Load, showing 812 of 3,000 nodes, though the
   user never set one (12).
8. Edge table shows 44.6 for a 44.63 amount; sum shows no cents (14).
9. The plus next to "Tables" has no visible label; only its tooltip names it (02-04).
