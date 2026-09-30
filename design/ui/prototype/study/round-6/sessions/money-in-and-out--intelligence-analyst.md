# Session: money in against money out -- Marcus, criminal intelligence analyst

Participant: Marcus, criminal intelligence analyst at a state fusion center (persona:
`../../personas/intelligence-analyst.md`).

Task as read by the moderator, and nothing more: "Your manager wants the ten accounts in the March
transfers that take in far more money than they send out, with the amounts, by end of day."

Mode: not mandated. Nobody said the tool was required. Marcus's fallback is an Excel pivot on the
transfers file.

Gate check: the task runs only if every money screen shows weighted degree. The March transfers
appear on the run-and-read, table and inspector pages, and all three show money in and money out
per account. The results-panel page has no transfers state at all, so it is not a money screen.
The task ran.

Screens he saw, as a participant sees them (design notes hidden), rendered with the March
transfers where the page offers them:

- the main frame at rest: `../../../shots/record/r6-marcus-money-frame-at-rest.png`
- Run a measure... opened (the page draws the protein project here, not the transfers): `../../../shots/record/r6-marcus-money-catalog.png`
- Quick actions with "money" typed: `../../../shots/record/r6-marcus-money-quick-money.png`
- the Money in result opened, with the table: `../../../shots/record/r6-marcus-money-read.png`
- the table's column menu, New column: `../../../shots/record/r6-marcus-money-table-new-column.png`
- the table with the three money columns, on the 14 flagged accounts: `../../../shots/record/r6-marcus-money-table-three-columns.png`
- getting rows out, Export table...: `../../../shots/record/r6-marcus-money-table-out.png`
- one account in the inspector: `../../../shots/record/r6-marcus-money-inspector.png`

## Transcript

### 1. The frame at rest

> "Transfers, March 2026." 3,000 accounts, 9,113 edges -- rows. OK, so edge is a transfer. Picture
> is a grey honeycomb, "3,000 accounts drawn as density". That's not a link chart, that's a
> weather map. I'm not finding ten accounts in that, so I'm not looking at it.
>
> Right side. "Loaded: transfers-2026-03.csv, direction followed, amount not used yet." Good. It
> knows who sent and who received, and it knows there's an amount. "Not used yet" -- so it hasn't
> done anything with the money. I'll take honest over clever.
>
> "Total degree distribution." No idea, don't care. That's the degree thing, how many lines a guy
> has. I don't want how many lines, I want dollars.
>
> Bottom: "Table, 3,000 nodes, 9,113 edges (rows)." That's where I'd go first. If this is a
> spreadsheet with a picture stuck on top, I can work with a spreadsheet.

### 2. Looking for "total per account"

> Rail on the left says Graph, Data, Results, Notes. Results sounds like where the math lives.
> "Run a measure..." Click.
>
> [Reads the menu] Degree: Links (count), Total confidence. Centrality: Betweenness -- middleman,
> I know that one. Closeness, Eigenvector, Katz... Community, Louvain, Leiden. None of that is
> money. And "Total confidence"? Confidence of what? That's not my data. Did it load somebody
> else's file? The title up top says "Human protein interactions." That's not my case.

Moderator note: the catalog frame on the run-and-read page is drawn on the protein project even
with the transfers requested, so Marcus saw a menu for the wrong dataset. On the transfers the
design says the Degree group reads in money words; he never saw that version.

> So I don't know what this list says on my data. If it said "Money in" under Degree I might have
> clicked it. If it says "Total amount" I'd click it. If it says "weighted" anything, I wouldn't.
>
> There's a "Quick actions" button at the bottom. Sounds like a gimmick, but it's got a search box.
> I'll just type what I want. "money."

### 3. Quick actions, "money"

> Oh. OK. "Money: sums of amount, in dollars." Run Money in, "Total amount of the transfers into
> each account." Run Money out. Run Money in minus out, "What each account kept: in less out."
> And then a separate group, "Counts of transfers, not money": Links in, Links out.
>
> That split is right. That's exactly the mistake a new guy makes -- counts the transfers instead of
> adding them up. It told me which is which before I clicked. Good.
>
> "What each account kept." Kept? No. That account didn't necessarily keep anything. It could have
> walked it out of the bank in cash. On the stand I say "net received," not "kept." If defense
> counsel reads "kept" off my exhibit, that's a question I have to answer. Fix the word.
>
> The question is "take in far more than they send out." In minus out is the obvious one. But
> "far more" -- my manager might mean ratio. Guy takes in twenty grand and sends out five hundred,
> that's far more. Guy takes in four hundred grand and sends out three hundred eighty, the
> difference is bigger but that's a pass-through. There's no "in divided by out" here. I'll take
> the difference and eyeball the out column.
>
> I'd have clicked Money in minus out. The screen I get is Money in, so let's read that.

Moderator note: the mock shows only the Money in result opened; Money in minus out is reachable as a
column in the table.

### 4. Reading the Money in result

> "Money in, Sep 29 10:31." "Sum of amount, in dollars, on the transfers into each account.
> Directed. CPU." CPU -- whatever, it's the computer. It said what it added up, and that it
> followed direction. That's the sentence I need for the methods paragraph.
>
> Top accounts: ACC-393859, $440,784, 907 links in. ACC-697114, $241,450, 522 links in. Then
> number 3, ACC-893168, $149,438, 37 links in, #37. And a line under it: "ACC-893168 is #3 by money
> in and #37 by Links in (count): 37 transfers, fewer and larger."
>
> Now THAT is something I didn't know. Fewer, bigger transfers into one account -- that's the one I'd
> pull. It pointed at the odd one out without calling him a suspect. It just gave me the two numbers
> and let me decide. That's how I want it.
>
> But the table under it -- every row says "merchant." 393859, merchant. 697114, merchant. Of course
> the merchants take in the most money, that's what a store is. My manager doesn't want the grocery
> chain. I need to either knock the merchants out or I'm handing him ten businesses.
>
> Also: the side list says $440,784. Rounded. Later the table says 440,783.97. Which one goes in
> the brief? The table one. But I had to notice.
>
> "2,995 more in the table." Fine, open it.

### 5. The table, New column

> Table's up. Columns: id, kind, Money in, Links in (count), rank. No Money out. No difference.
> Where do I add a column? In Excel it's just... you type in the next column.
>
> [Tries the menu on a column header] Sort descending, Sort ascending, Filter to..., Compare
> with..., Color by degree, Size: degree, New column. New column opens: Money in, Money out, Money
> in minus out, each with a line under it -- "Sum of amount on transfers out, USD." Then Links in
> (count), Links out (count), "counted, not summed."
>
> Found it. But I found it in the menu on the degree column, which is the one column I'd never
> have clicked, because I don't care about degree. It should be on the header row or next to
> Export, not inside somebody else's column. If I hadn't been poking around I'd be in Excel by now.
>
> Add Money out, add Money in minus out.

### 6. The three money columns

> [Looks at the table with three money columns] Now we're talking. Header over them: "Weighted
> degree sum of amount (USD), full graph." Weighted degree, whatever that is -- the part after it
> says sum of amount, in US dollars, on the whole graph. That's enough. Money in, Money out, Money
> in minus out, side by side, with Links in and Links out in their own group next to it. That's the
> pivot table I would have built, already built.
>
> Little bar charts in the headers. Money in minus out goes from -69,007.50 to 440,783.97. The top
> end is the big merchant again, I'd bet.
>
> The footer: "Sum of Money in, 14 rows: 340,978.02 USD. Money out 400,931.03 USD. Money in minus
> out -59,953.01 USD." So the 14 selected ones sent out sixty grand more than they took in. That
> footer is handy -- that's a number I'd put on a slide.
>
> Wait -- 14 rows? "Selected: 14 nodes." I've got the 14 flagged ones, not all 3,000. How do I get
> everybody back? The only link is "Show filtered graph." Filtered is smaller. I want bigger. I'm
> not clicking something that says filtered when I want unfiltered. [Pause] ...there's nothing else
> on this line. OK. Click it. If I lose my columns I'm done.

Moderator note: "Show filtered graph" returns the table to every row and keeps the added columns.
Marcus clicked it only after ruling everything else out.

> OK, 3,000 rows, columns are still there. Sort Money in minus out, descending.
>
> Top of that list is merchants. I need Filter to... on the kind column, kind is not merchant.
> The menu's there. I'm going to assume it takes a value off a list, like an Excel filter, because
> I can't see it from here. If it wants me to type an expression, that's where I stop.
>
> Then I read off the top ten: account, Money in, Money out, Money in minus out. Plus Links in and
> out so the sergeant sees "37 transfers, fewer and larger" without me saying it.

### 7. Checking one account before it goes in a brief

> I don't hand my manager a number I haven't checked on at least one account. Click one.
>
> Inspector: ACC-365386. Every attribute says where it's from -- "from accounts-2026-03.csv."
> riskScore 92 "not computed by graphty: the bank's own score, 0 to 100." Good, that's exactly the
> line I want -- that score is the bank's problem, not mine.
>
> Down at the bottom, Totals: Money in $19,449.22, Money out $28,587.48, "summed by graphty from
> transfers-2026-03.csv." Transfers: In 3, Out 5. Those are clickable -- that's the eight transfers
> behind the totals, with dates and amounts. That's discovery. If a defense attorney asks "where'd
> nineteen thousand four hundred come from," I open three rows. Excel can do it, but not in one
> click.

### 8. Getting it out

> "Export table..." top right of the table. [Looks at the export screen] Table (.csv), "Always
> written beside it" -- a methods file next to the CSV, and the header carries the method and the
> scope. That's the paperwork I'd have to write anyway. Good.
>
> The example it shows me is some protein file though -- MAPK1, TP53. I can't see what MY file
> would look like. Does the Money in minus out column come out with "USD" in the header? I'd assume
> yes. I'd open it in Excel and check before it goes anywhere.
>
> "Nothing has been sent from this project." Top left, every screen. I read it every time. That's
> the only reason I'd put a real bank return in here.

## Single Ease Question

"Five. I got there. The money part is actually good once you find it -- in, out, difference, side
by side, and it tells you a count from a dollar. What cost me: the first menu I opened was for the
wrong file, the column I needed was hiding in the degree column's menu, and the link back to
everybody says 'filtered.' And I still have to throw out the merchants and decide whether 'far
more' means difference or ratio, which the tool can't do for me and can't help me with -- there's
no ratio."

SEQ: 5

## Would he use this instead of his current tool?

"For this exact question -- no, honestly. It's a pivot. Sum amount by to_account, sum by
from_account, subtract, sort, filter out merchants. Ten minutes in Excel and I trust Excel. But
the next question my manager asks is always 'who's sending it to them,' and there Excel falls over
and this doesn't: I click the account and there are the transfers. So: alongside, not instead.
And only if IT signs off that it runs on our box -- the 'nothing sent' line gets me to ask, it
doesn't get me approved."

## Moderator notes

- Outcome: success with difficulty. He reached a sorted Money in minus out column on all 3,000
  accounts and a plan to filter out merchants and export; he did not see the filter or the
  exported file for his own data.
- Route: Results > Run a measure... (dead end; the frame shows the protein project) > Quick
  actions, typed "money" > Money in result > table > degree column menu > New column > Show
  filtered graph > sort > Filter to... on kind > Export table...
- What worked: the money words and the "Counts of transfers, not money" group; the "fewer and
  larger" line under the Money in ranking; the three money columns under one header naming the
  sum and unit; the selection-total footer; the inspector's Totals with "summed by graphty from
  transfers-2026-03.csv" and clickable transfer counts; the methods file beside the CSV.
- Nearest wrong answer on screen: the Money in ranking itself. Its top five are merchants and it
  ignores money out entirely. Marcus rejected it because he knows what merchants do; the screen
  does not warn that a large Money in is a store.
- No ratio: "far more" is read two ways (difference or ratio). Only the difference exists. He
  guessed his manager meant difference and would eyeball Money out; a ratio would surface
  different accounts.
- "What each account kept" was objected to as a courtroom risk; he would write "net received".
- Number formatting differs between surfaces: "$440,784" in the Results list, "440,783.97" in the
  table.
- "Show filtered graph" read as narrowing when he needed to widen; he clicked it by elimination.
- New column lives only inside an existing column's menu (here, degree), which he would not open
  for money.
- Mock gaps he hit: the catalog and the Export example are drawn on the protein project; the Money
  in minus out result is not drawn opened; Filter to... on a text column is not drawn.
