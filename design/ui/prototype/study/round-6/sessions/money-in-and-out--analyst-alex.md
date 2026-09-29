# Session: "Which accounts take in far more than they send?" -- Alex, operations data analyst

Participant: Alex, 31, data analyst. SQL, pandas and NetworkX; draws in Gephi; hands everything
over in Excel. Company laptop, no admin rights. Mild red-green colour vision deficiency.

Task as given by the moderator: "Your manager wants the ten accounts in the March transfers that
take in far more money than they send out, with the amounts, by end of day."

Check before the task ran: every screen in this session that shows the transfers' money shows
weighted degree under its money names (Money in, Money out, Money in minus out) -- the run flow
(Quick actions and the finished run), the table (New column menu and the money columns) and the
inspector (Totals: Money in, Money out). The main window at rest shows no measure at all, and the
Results panel screens are drawn on the protein network with no money on them. So the task ran.

Screens used: the main window with the March transfers open (at rest), the run flow on the
transfers (Quick actions typed "money", then the finished Money in run), the Results panel (for
the run record layout), the table under the canvas (the New column menu, and the three money
columns on a selection), and the inspector on one flagged account.

Renders he looked at, in order (all in `shots/`):
`screens__frame-at-rest-dataset-transactions.png`, `screens__run-and-read-money.png`,
`screens__run-and-read-money-read.png`, `r6-alex-money-table-dock-large.png`,
`r6-alex-money-table-dock-selected.png`, `r6-alex-money-inspector-flagged.png`.

## Think-aloud transcript

**Main window, transfers open.**

"Same file as last time. 'Transfers, March 2026'. 3,000 nodes, 9,113 edges, 9,113 rows. Matches
the extract. One weak component. Fine."

"'Nothing has been sent from this project' up top, and 'Assistant off, nothing is sent' on the
side. OK. I'm not going to read the privacy page, but I like that it's just sitting there."

"'Loaded: transfers-2026-03.csv, direction followed, amount not used yet. Change...' -- this is the
line that scared me off last time. 'Not used yet.' I still don't know what I'd be agreeing to if I
clicked Change. Not touching it. I'll go and look for the thing I want."

**Quick actions. What do I type?**

"Last time I typed 'degree' and there was no degree. My gut says type 'degree' again, because in
NetworkX this is `in_degree(weight='amount')`. But the task says money, so -- 'money'."

(Looks at `screens__run-and-read-money.png`.)

"Oh. OK. 'Money: sums of amount, in dollars.' Money in -- 'total amount of the transfers into each
account.' Money out. Money in minus out -- 'what each account kept: in less out.' That's it.
That's literally the question. In less out."

"And then underneath, separately, 'Counts of transfers, not money: Links in (count), Links out
(count).' Good. That's the trap I nearly fell into with the total degree column last time --
number of transfers versus amount of money. It's split and it says which is which. Somebody
thought about that."

"Hang on though. Top right, the graph stats: 'Edges: directed; amount, not used yet.' And right
under my cursor it's offering to sum amount. So is amount used or not? I think 'not used yet'
means 'nothing's been run on it yet', but it reads like 'we ignored your amount column'. If I
screenshot this for my manager he'll ask me the same thing."

"I'd click 'Run Money in minus out'. The screen I've got for after is Money in, not in minus out,
so I'm going to read that one and assume minus out looks the same."

**The finished run (Money in).**

(Looks at `screens__run-and-read-money-read.png`.)

"'Money in, Sep 29 10:31. On: full graph, 3,000 accounts. Sum of amount, in dollars, on the
transfers into each account. Directed. CPU.' Good. Full graph, all 3,000. That's the scope line I
need, because the first question in the meeting is always 'is this everybody?'"

"Top accounts. ACC-393859, $440,784, 907 links in, #1. ACC-893168 is #3 by money in but #37 by
link count -- '37 transfers, fewer and larger'. Huh. That's actually a useful sentence. That's the
kind of thing a fraud person would want to know. I didn't ask for it, but fine."

"It only shows me five. I need ten. '2,995 more in the table.' OK, so the ten is in the table, not
here. One more click. I'd have liked it to just show ten, honestly, ten is the number everybody
asks for."

"The amounts here are rounded to the dollar, $440,784. Fine for a slide."

"Options: 'Sums amount. Direction In.' So for in minus out I'd expect Direction to say... both? In
less out? I don't know what it says there. I'm guessing."

**The table. Getting the ten.**

(Looks at `r6-alex-money-table-dock-large.png`.)

"This is the other way in. Column header menu on the degree column: sort, filter, 'Color by
degree', 'Size: degree', and 'New column' with Money in, Money out, Money in minus out -- same
three names, same one-liners, 'Money in less money out, USD'. And Links in (count), 'counted, not
summed'. OK, the words are the same in both places. That matters -- I'd have lost trust if the
menu called it 'weighted in-strength' and the table called it something else."

"'Weighted degree, sum of amount (USD), full graph' as the group header over the money columns --
right, weighted degree, that's the NetworkX word. So I can tell my manager 'weighted in-degree
minus weighted out-degree on amount' if anyone technical asks, and 'money in less money out' to
everyone else. That's two sentences I can actually say."

(Looks at `r6-alex-money-table-dock-selected.png`.)

"Here it's on 14 selected accounts, not everybody. 'Selected: 14 nodes. Show filtered graph.'
Show filtered graph? I didn't filter anything. I want the 3,000. I'm guessing that link gets me
back to everybody, but 'filtered' is the wrong word for what I think I'm looking at, which is the
full graph. I'd hesitate on that one."

"Columns: Links in, Links out, Money in, Money out, Money in minus out. The range under Money in
minus out: -69,007.50 to 440,783.97. So the top of that column is going to be ACC-393859 --
440,783.97 in, and... well, if 440,783.97 is also the top of Money in, it sent out nothing. Zero
out. So in minus out is the whole of in."

"So the plan on the full table: click the Money in minus out header, sort descending, top ten
rows. id, Money in, Money out, Money in minus out. That's the answer."

"Numbers in the table are to the cent, no dollar sign -- the header says USD. The panel said
$440,784. Same number, rounded. Fine, I checked."

"Footer: 'Sum of Money in, 14 rows: 340,978.02 USD. Money out 400,931.03. Money in minus out
-59,953.01.' 340,978.02 minus 400,931.03 is -59,953.01. Yep. It adds up. I did it in my head
before I trusted it. And the minus numbers are just minus signs, no red and green. Good, because
I can't read red and green."

**Cross-check on one account.**

(Looks at `r6-alex-money-inspector-flagged.png`.)

"Click one account, the right side: 'Totals: Money in $19,449.22, Money out $28,587.48, summed by
graphty from transfers-2026-03.csv'. Transfers In 3, Out 5. OK so it tells me where the number
came from. I'd take one account, run it in SQL, and check the cents match. If they do, I'm done
checking."

"It doesn't give me the 'in minus out' here though, I'd have to subtract. -9,138.26. Not a big
deal, but if it's in the table it may as well be here."

**What does 'far more' mean?**

"This is my real worry. The tool gives me in minus out, in dollars. My manager said 'far more'.
If 'far more' means biggest dollar difference, this is it. If it means 'takes in ten times what it
sends', that's a ratio, and there's no ratio column. An account with $5,000 in and $0 out would
be infinitely 'far more' and nowhere near the top ten by difference."

"I'm going with the dollar difference, because that's what 'with the amounts' sounds like, and I'll
say so in the email: 'ranked by money in minus money out'. If he wanted a ratio I'd do it in Excel
from the export -- two columns are already there."

"The other thing: the top of Money in is all merchants -- 'kind: merchant' all the way down on the
Money in list. So my top ten by in-minus-out is probably ten merchants. Merchants take in money,
that's what merchants do. That might be exactly what he wants, or it might be a useless list. I
think I'd send the ten as asked and add a line: 'all merchants; want me to exclude merchants?'
There's a 'Filter to...' in the column menu, I assume on kind, but I'm not going to do it
unasked."

**Getting it out.**

"'Export table...' top right of the table. Last round the export told me exactly which table and
showed the first lines before I pressed it. I assume it's the same. Sorted, top ten, export, into
Excel, email. Done."

## Single Ease Question

**5 out of 7.**

"It's in there now, and it's called what it is. Money in minus out, in dollars, split away from the
transfer counts. That's the whole difference from last time -- last time I ended up in a pivot
table. What took longest: working out that the ten are in the table and not in the panel, the
'amount not used yet' line that contradicts the menu right below it, 'Show filtered graph' when I
hadn't filtered, and deciding what 'far more' means, which the tool can't decide for me. Not a 6
because I had to assume the in-minus-out result looks like the Money in one, and I'd still
cross-check one account in SQL before I sent anything."

## Would he use this instead of his current tool?

"For this exact question on its own? Honestly, no. It's a GROUP BY. Two sums and a subtract in SQL,
thirty seconds, and it goes straight to Excel. I don't need a graph for this."

"But if I've already got the transfers open in here because I'm doing the network stuff anyway --
yes, I wouldn't leave to do it in SQL any more. Last round the tool basically said 'I can't do
this'. Now it can, the numbers add up, it tells me it's the full graph, and the names are ones I
can put in an email. That's the difference between me opening Jupyter and not."

## Moderator notes

- Completed on the mocks, with one assumption: there is no render of the finished Money in minus
  out run, so he read the Money in run and assumed the same layout. He would sort the table by
  Money in minus out to get the ten.
- Found the measure by typing "money" in Quick actions on the first try. His first instinct was
  still "degree"; the group header "Weighted degree" in the table confirmed the NetworkX term for
  him afterwards.
- Did not fall for the link-count trap this time; he credited the "Counts of transfers, not money"
  heading by name.
- Verified the footer arithmetic and the rounding between the panel ($440,784) and the table
  (440,783.97) himself before trusting either.
- Raised, unprompted, that "far more" could mean a ratio, and that the top of the list is likely
  all merchants. He resolved both by stating his choice in the email rather than by the tool.
- SEQ 5 (round 5, on screens without weighted degree: 2).
