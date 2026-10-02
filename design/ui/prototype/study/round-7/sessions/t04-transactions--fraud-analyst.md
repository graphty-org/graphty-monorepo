# Session: find who paid ACC-633005 -- fraud analyst (Sarah)

Task as given by the moderator: "An alert names account ACC-633005. Bring it up, see what is known
about it, and pick out the accounts that sent money to it -- not the ones it paid. The data on
screen is a sample: one month of card and bank transfers between accounts."

Patience mode: not mandated (her own five-minute first-look patience, stretched a bit).
Renders: design/ui/prototype/tmp/round-7-sessions/t04-transactions--fraud-analyst/NN.png
All commands run from design/ui/prototype. KEYS below stands for
`--key A --key C --key C --key - --key 6 --key 3 --key 3 --key 0 --key 0 --key 5` (typing the ID).

## Start screen (shots/tasks/t04-transactions/01.png)

"Transfers, March 2026. A gray blob of hexagons, 3,000 nodes, 9,113 edges, density, reciprocity,
a log-log chart. None of that is my account. There's a search box top left -- 'Find rows and
notes'. Rows? Fine, an account is a row somewhere. I'm pasting the ID in. 'Local only' up top --
good, that's the first thing I'd ask about."

## Step 1 -- search box (01-04)

    timeout 120 node app-b/study.mjs --try .../01.png task:t04-transactions --click "Find rows and notes" --type "ACC-633005"
    timeout 120 node app-b/study.mjs --try .../02.png task:t04-transactions --click "Find rows and notes" --key A --key C --key C
    timeout 120 node app-b/study.mjs --try .../03.png task:t04-transactions --click "Find rows and notes" KEYS
    timeout 120 node app-b/study.mjs --try .../04.png task:t04-transactions --click "Find rows and notes" KEYS --key Enter

(01: the paste did not take; I typed it instead.) 04: **'No match for "ACC-633005"'.**
"No match. The alert names this account and the tool says it doesn't exist? Either it's not in
this month's file or the box doesn't search accounts. It doesn't tell me which. That's the first
screen and it's already lying to me, or at least not helping."

## Step 2 -- shorter search (15)

    timeout 120 node app-b/study.mjs --try .../15.png task:t04-transactions --click "Find rows and notes" --key 6 --key 3 --key 3 --key 0 --key 0 --key 5 --key Enter

'No match for "633005"'. "Same. So that box is for something else -- whatever 'rows' are here,
they aren't my accounts."

## Step 3 -- Ctrl+F (16)

    timeout 120 node app-b/study.mjs --try .../16.png task:t04-transactions --key Control+f

Nothing visible happened. "Ctrl+F does nothing either."

## Step 4 -- the table (05)

    timeout 120 node app-b/study.mjs --try .../05.png task:t04-transactions --click "Table"

"There. A table. That's what I wanted in the first place. And -- top row -- ACC-633005. Business,
GB. Links in 0, links out 15, total 15. So the search said it doesn't exist and the table has it
in the first row. Which one do I believe?

Links in zero. If that's right, nobody paid this account in March and the answer to my question is
'no one'. But every row I can see has zero in -- six business accounts in a row with nothing
coming in? I don't buy that. And it says 'rows 381 to 420' sorted by total -- why am I at row 381
and why is my account sitting at the top of it? I can't trace that zero to a transaction."

## Step 5 -- try to open the account (06, 07, 18, 19)

    timeout 120 node app-b/study.mjs --try .../06.png task:t04-transactions --click "Table" --click "ACC-633005"
    timeout 120 node app-b/study.mjs --try .../07.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Selection"
    timeout 120 node app-b/study.mjs --try .../18.png task:t04-transactions --click "Table" --click "ACC-633005" --key Enter
    timeout 120 node app-b/study.mjs --try .../19.png task:t04-transactions --click "Table" --click "ACC-633005" --click "ACC-633005"

06: row goes blue, a black label says "Selects ACC-633005". The right panel still shows the whole
graph's summary. "OK, it says it selects it. Where's the account? Its KYC fields, its alert rule,
its risk score -- I can see those columns exist. Nothing on the right changed."
07: clicked 'Selection' on the left: "Paints 0 nodes. Color FFD700, size 1.45, opacity 40." "Zero.
So it didn't select anything. And now I'm looking at paint settings. I don't want to paint, I want
the account." Enter and a second click: same, no account panel.

## Step 6 -- the transfers themselves (08, 09, 10-13)

    timeout 120 node app-b/study.mjs --try .../08.png task:t04-transactions --click "Table" --click "Edges"
    timeout 120 node app-b/study.mjs --try .../09.png task:t04-transactions --click "Table" --click "Edges" --click "to_account"
    timeout 120 node app-b/study.mjs --try .../10.png task:t04-transactions --click "Table" --click "Edges" --click "Filter"
    timeout 120 node app-b/study.mjs --try .../11.png task:t04-transactions --click "Table" --click "Edges" --hover "to_account"
    timeout 120 node app-b/study.mjs --try .../12.png task:t04-transactions --click "Table" --click "Edges" --click "Column menu"
    timeout 120 node app-b/study.mjs --try .../13.png task:t04-transactions --click "Table" --click "Edges" --click "The to_account column menu"
    (also tried "to_account options", "Column options", "More" -- the first two: nothing on screen by that name)

08: "Now we're talking. from_account, to_account, timestamp, amount. 9,113 rows. This is my
statement export. And 'Sum of amount ... select rows to total them' at the bottom -- that's a pivot
I'd actually use. All I need is to_account = ACC-633005."
09: clicking the header sorts to_account ascending. "Sorting 9,113 rows and paging 40 at a time to
find one account? That's 200-odd pages. No."
10: "nothing on screen is called Filter."
12: the little arrow on the header is "The from_account column menu" -- clicking it shows that name
and nothing opens. Couldn't find the to_account one at all. "In Excel this is one click on the
header arrow, type the ID, done. Here the arrow doesn't open."

## Step 7 -- the Data section and filters (14, 20, 21, 22, 23)

    timeout 120 node app-b/study.mjs --try .../14.png task:t04-transactions --click "Data"
    timeout 120 node app-b/study.mjs --try .../20.png task:t04-transactions --click "Full graph"
    timeout 120 node app-b/study.mjs --try .../21.png task:t04-transactions --click "Data" --hover "Add filter" --click "Add filter"
    timeout 120 node app-b/study.mjs --try .../22.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Data" --click "Add filter"
    timeout 120 node app-b/study.mjs --try .../23.png task:t04-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value"

14/20: "Wait -- now there's a filter 'amount is at least 1,000' switched ON, 812 of 3,000 nodes,
and the top bar says 812 of 3,000. Before it said Full graph. I didn't set that. Did clicking
'Data' or 'Full graph' do that? If my account had only small transfers in, it's gone now and I
wouldn't know. That's a filter on my evidence I never asked for."
21: Add filter offers: by an attribute, top of a computed value, largest component, k-core,
and -- grayed out -- **"Neighbors of the selection: select one or more nodes first."**
"That's the one. Neighbors of my account. But I have to select it first, and I can't select it --
the table click doesn't stick, the search can't find it."
22: selected the row in the table first, then Add filter: still grayed out. "Confirmed. The table
click doesn't select anything."
23: 'By an attribute' lists id (account), kind, alertRule, alertTime, country, flagged, riskScore,
amount, timestamp. "I could keep id = ACC-633005, but that gives me the account alone, not who
paid it. And 'neighbors' would give me both directions anyway -- nothing here says in versus out."

## Stopping

I gave up. About fifteen minutes in, well past what I'd give a new tool.

**Did I succeed?** No. I found the account only by luck -- it happened to be the first row of the
node table. I never got an account view (alert rule, risk score, KYC fields were columns I could
see but never opened for this account). I never got a list of who paid it. The only "answer" I have
is a 'Links in: 0' count that says nobody did, and I don't trust it: the same screen had a search
that said the account doesn't exist, six rows of zeros in a row, and a filter I didn't set. I can't
put a zero I can't trace to rows in a SAR.

**Single Ease Question (1-7):** 2.

**Would I use this instead of my current tool?** No. Today I'd export the transfers, filter
to_account = ACC-633005 in Excel, and pivot by from_account -- ten minutes, and my reviewer can
follow every number. This had the right raw table (from, to, time, amount, and a sum at the bottom
-- that part is good) and a "Neighbors of the selection" filter that sounds like exactly my job,
but I couldn't get my account selected to use either. 'Local only' and an assistant that says
"Off. Nothing is sent" are the two things I liked; they'd get it past IT. They don't get it past me
until typing an account ID brings up the account.

## What went wrong, in her words, for the studio

- "The search box doesn't find accounts and doesn't say what it does search." (04, 15)
- "The table says 'Selects ACC-633005' and then nothing is selected -- Selection paints 0 nodes,
  and the neighbors filter stays grayed out." (06, 07, 22)
- "No way to filter the transfers table by an account; the header arrow doesn't open." (09-13)
- "A filter on amount turned itself on and cut 3,000 accounts to 812." (14, 20)
- "In versus out: the only place I saw direction was a count with no rows behind it." (05)
- "Nowhere did I see 'this account' -- its alert rule, risk score, flagged -- in one place." (06)
