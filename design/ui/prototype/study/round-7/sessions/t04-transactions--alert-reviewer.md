# Session: transactions task, played by the level-1 alert reviewer (Nadia)

Task as given: "An alert names account ACC-633005. Bring it up, see what is known about it, and
pick out the accounts that sent money to it -- not the ones it paid."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t04-transactions--alert-reviewer/.

## Step 0 -- start screen (shots/tasks/t04-transactions/01.png)

"OK. Big gray blob of hexagons. 3,000 nodes, 9,113 edges. None of that tells me anything about
my account. There's a box top left that says 'Find rows and notes'. That's where the account
number goes. That's always where the account number goes."

## Step 1 -- click the search box

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/01.png task:t04-transactions --click "Find rows and notes"

"It's got the blue outline, so it's taking input. Paste."

## Step 2 -- type the account number

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/02.png task:t04-transactions --click "Find rows and notes" --type "ACC-633005"

"...Nothing. The box is still empty. No list dropping down, no 'no results', nothing. Did it
take my paste? I have no idea. In the case system I paste the number and I'm on the account.
Fine -- there's a 'Table' at the bottom. Tables I understand."

(The search box did not take the typed text: the screen was identical to the previous one.)

## Step 3 -- open the table

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/03.png task:t04-transactions --click "Table"

"Oh -- there it is, first row. ACC-633005, business, GB. Lucky, because it says rows 381 to 420
of 3,000 and I didn't scroll there; I don't know why it opened on that page, but I'll take it.
Links in: 0. Links out: 15. Links total: 15.

So... nobody sent money to it? Fifteen payments out and zero in? For a business account in a
month? That's either the answer or I'm reading the column wrong. 'Links in' -- is that money
coming in? I think so, it's directed. But I want to see the actual transfers, not a count. And
I want the profile -- risk score, why it alerted."

## Step 4 -- click the account's row

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/04.png task:t04-transactions --click "Table" --click "ACC-633005"

"Row went light blue, and a little black label pops up over the picture: 'Selects ACC-633005'.
Selects it -- good. But the right-hand side is still the whole graph's summary. Nothing about
my account. Nothing lit up in the blob that I can see. Did it select or not?"

## Step 5 -- click "Selection" on the left to see what is selected

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/05.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Selection"

"'Selection -- Built-in row. Paints 0 nodes. Color FFD700, size 1.45, opacity 40.' So it's a
color setting, not my selection. And zero nodes, so my click didn't select anything after all,
and the blue on my row is gone. I don't want to restyle anything, I want the account."

## Step 6 -- try the Data section on the left

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/06.png task:t04-transactions --click "Data"

"Two files, accounts and transfers. And there are fields called alertRule, alertTime, flagged,
riskScore -- that's what I actually need for the file. But they're just names in a list; I
can't see the values for my account.

Wait. Top bar now says '812 of 3,000 nodes', and there's a filter, 'amount is at least 1,000',
ticked on. A second ago it said 'Full graph'. Did I just turn that on by clicking Data? Did I
change the data? If QA asks why I only looked at transfers over 1,000, I can't tell them,
because I didn't do it. That makes me nervous about everything I've read so far. Although the
table column did say '(count, full graph)', so maybe the zero is still right."

## Step 7 -- click the row again, in case one click was only a hover

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/07.png task:t04-transactions --click "Table" --click "ACC-633005" --click "ACC-633005"

"Same thing. 'Selects ACC-633005' and then nothing happens. It says it selects; it doesn't."

## Step 8 -- the Edges tab of the table, to see the transfers themselves

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/08.png task:t04-transactions --click "Table" --click "Edges"

"OK, this is a transaction list: from_account, to_account, timestamp, amount. 9,113 of them.
This is what I'd do in a spreadsheet: filter to_account equals ACC-633005, read the
from_account column. That's the 'who sent money to it' list."

## Step 9 -- click the to_account header to sort or filter

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/09.png task:t04-transactions --click "Table" --click "Edges" --click "to_account"

"Up arrow, so sorted ascending... 157047, 173956, 393859, 393859, 527694. Then on the next
click (below) it's 966916 first and then 527694, 393859, 393859, 173956. Fine, it sorts. There's
a little dropdown arrow at the end of the header but it doesn't tell me what it is. Even
sorted, I'd be paging 9,113 rows six at a time to find mine. No."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/12.png task:t04-transactions --click "Table" --click "Edges" --click "to_account" --click "to_account"

## Step 10 -- the Assistant, as a last resort

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/10.png task:t04-transactions --click "Assistant"

"'Off. Nothing is sent. Turn on in Settings.' IT is never turning that on at a bank. Moving on."

## Step 11 -- Selection from the start screen, and select-then-Edges

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/11.png task:t04-transactions --click "Selection"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t04-transactions--alert-reviewer/13.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Edges"

"Selection is still the paint settings, zero nodes. And picking my account and then going to the
transfers shows the same first six transfers for the whole graph, none of them mine. I thought
the transfers list would narrow to the account I just picked. It doesn't."

## Where I stopped

"That's my ten minutes. That's a whole alert. I'm going back to the case system."

## Did I succeed?

No. I found the account's row in the table (only because the table happened to open on the
page it was on) and I saw it is a business account in GB with 15 transfers out and 0 in. If
that 0 is right, the answer is "no account sent money to it", which for this alert I would
write down and escalate, because a business that only pays out is odd. But I never saw a single
transfer into or out of it, I never got its risk score or why it alerted, and I never managed
to select it. I would not put "0 senders" in an alert file on the strength of a count column in
a tool where clicking Data seemed to switch a filter on by itself.

## Single Ease Question

2 out of 7. The search box would not take the account number, and clicking the account said
"Selects ACC-633005" but selected nothing.

## Would I use this instead of my current tool?

No. In the case system I paste the account number and in seconds I have the profile and the
transactions in and out. Here I could not get to one account, which is the first thing every
alert needs. The parts I did see -- alertRule, riskScore and flagged as fields, the transfer list
with from and to -- are the right things, so if search worked and clicking an account showed me
its profile and its incoming transfers, I could see it saving time on the few alerts where the
counterparties matter. As it is, it costs me minutes on every alert, and it gives me nothing I
can paste into the file: no picture of my account and no list of senders.

## Problems seen, in her words

1. Search box shows focus but typing the account number does nothing -- no results, no "no
   match" message (render 02).
2. Clicking the account's row shows "Selects ACC-633005" but nothing gets selected: the right
   panel stays on the whole graph and Selection says "Paints 0 nodes" (renders 04, 05, 07).
3. "Selection" on the left is a paint setting (color, size, opacity), not "what I have
   selected" -- confusing (render 05, 11).
4. Opening Data showed a filter "amount is at least 1,000" switched on and the top bar changed
   from "Full graph" to "812 of 3,000 nodes", with no sign I had done it -- did I change the
   data? (render 06).
5. No way to filter the transfer list to one account; sorting only (renders 08, 09, 12).
6. Picking an account does not narrow the transfer list to that account (render 13).
7. The account's alert fields (alertRule, riskScore, flagged) are listed as field names, but
   I never saw the values for my account.
8. Nodes table opened on rows 381-420 for no reason I could see; lucky, but I'd never trust it
   to land on my account again (render 03).
