# Session: transfers network with an orphan check -- supply chain analyst (Dana Okafor)

Task as given: "Two spreadsheets are open on the program's import page: a list of accounts and a
log of transfers between them. If you do not work in banking, treat this as example data. Make one
network of accounts tied by their transfers, and check that no transfer refers to an account
missing from the list."

Outcome: success. Three screens, two clicks.

## Step 1 -- the start screen

Screen: shots/tasks/r8-t24-transactions/01.png (no command; the start screen).

"OK, banking data, fine -- for me it's suppliers and purchase orders, same shape. Two tables on
the left, accounts 3,000 and transfers 9,113, both with a green tick. The transfers table is
open. The top strip says 'account (3,000) --transfers (9,113)--> account (3,000)'. That's what I
want: accounts on both ends.

It already guessed from_account is 'From -> account' and to_account is 'To -> account', amount is
the weight, and timestamp is time. I'd normally have to tell Gephi which column is source and
target. It guessed, but it SAYS it guessed, in blue, right under each header. Good.

Now the part I actually care about -- the bottom: 'Match report: transfers'. 'Every row has both
ends.' '9,113 of 9,113 from_account found in accounts.' '9,113 of 9,113 to_account found in
accounts.' That's my answer: nothing in the log points at an account that isn't on the list.
That's the XLOOKUP I'd do in Excel with a filter on #N/A, done for me.

'The data stays on this computer: nothing is uploaded.' And 'Local only' up top. That's the first
thing IT would ask. I'll take it, though IT will want it in writing, not on a screen.

Small stuff: the grey text at the bottom -- 'Showing the first 6 of 9,113 rows', the 'auto' tag,
'Higher means Stronger / Farther / Capacity' -- is small and light. On my laptop without my
glasses I'd squint. And 'Weight', 'Stronger', 'Capacity' -- I don't know what Capacity would do to
me. I'm leaving it alone. 'A row without one would weigh 1 / 0' -- don't care, every row has one."

## Step 2 -- look at the account list before trusting it

Command:
`timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t24-transactions--supply-chain-analyst/02.png task:r8-t24-transactions --click "accounts"`

Screen: the accounts table. id is the Key, everything else is an Attribute. 'Each row is a node',
'an edge' grayed out with 'An edge needs exactly two linking columns; this table has none'.
Match report: '3,000 rows; every key is unique.'

"I check the master list too, because if there are duplicates in the master file every number
after is wrong. 'Every key is unique.' Good. That's the second half of what I'd check -- if the
same account was in twice under the same id the match counts would look fine and still be lying.
It doesn't tell me about the same company under two different ids, but nothing would.

Country, risk score, flagged, alert rule -- these come along as columns. Fine. Nothing to change."

## Step 3 -- Load

Command:
`timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t24-transactions--supply-chain-analyst/03.png task:r8-t24-transactions --click "Load"`

Screen: the graph view. A big gray blob of hexagons in the middle. Right panel 'Transfers, Graph
from 2 tables': Nodes 3,000; Edges 9,113 transfers, each a distinct pair; Directed; Weight amount,
stronger; Weak components 1; a degree chart.

"3,000 nodes -- same as the account list, so it didn't invent extra accounts from the transfer
log. 9,113 edges -- same as the rows. Nothing got dropped. That's my reconciliation: rows in equals
rows out. One network -- 'Weak components 1', I think that means it's all one connected piece,
but 'weak component' is not a word I use. Same with 'Density 0.00101', 'Reciprocity 0', 'degree'.
I'd skip all of that.

The picture itself -- nice hairball. Gray honeycomb. It tells me nothing, and 'Nothing is colored
or sized by a row' at the top is honest about that. For this task I don't need the picture, the
numbers were the point.

Done. One network, and the check was on the import screen before I even pressed Load."

## Did I succeed?

Yes. The network is one graph of 3,000 accounts and 9,113 transfers, and the import page told me
every transfer's from and to account is in the list (9,113 of 9,113 both ways) and every account
id is unique. The node count after load matching the list confirmed it.

## Single Ease Question

6 of 7. I barely had to do anything; the check I'd normally build in Excel was already there in
plain sentences. One off for the small light-gray text and the jargon in the summary panel
('weak components', 'reciprocity', 'degree') that I had to read past.

## Would I use this instead of my current tool?

For this job -- joining a list to a log and checking the log only refers to things on the list --
it beats my Excel XLOOKUP routine, mainly because it reports the match in counts before loading and
says it guessed the columns. But I'd still want two things before it replaces anything: an export
of the rows that DIDN'T match (here there were none, so I can't tell if I'd get a list or just a
number -- a number is no good to me, I need the IDs to send back to the data owner), and something
Power BI can read. And IT has to sign off; 'nothing is uploaded' helps that conversation but
doesn't finish it. Side tool for now, a good one.

## Problems noticed

- Small, light-gray helper text (row counts, 'auto', weight options) is hard to read at laptop size.
- 'Capacity' and 'Farther' under Weight are unexplained; I avoided them.
- The summary panel after load uses terms I don't know (weak components, reciprocity, density,
  degree); the one I needed -- is it all one piece -- is phrased as 'Weak components 1'.
- Not testable here: what the match report shows when some transfers DO point at missing
  accounts, and whether I can get those rows out as a list.
