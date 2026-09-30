# Session: the ten accounts that take in far more than they send out -- Dana, supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst at an industrial equipment maker (simulated;
see ../../personas/supply-chain-analyst.md). Excel and Power BI every day, not a network
scientist, skips graph-theory words, reads tables carefully. Money transfers are not her field;
she reads "accounts" the way she reads an AP ledger: who pays whom, and how much.

Task as given by the moderator: "Your manager wants the ten accounts in the March transfers that
take in far more money than they send out, with the amounts, by end of day."

Check before the task: the money screens (the typed measure list, the finished Money in run, the
table's New column menu and money columns, and the account inspector's Totals) all show the
money sums, so the task ran. The results-panel renders on file are drawn on the protein sample,
not the transfers; she used the finished Money in run on the run-and-read page for that step.

Screens seen, in order, as the participant sees them (design notes hidden):

- the March transfers project at rest: shots/record/r6-dana-money-frame-at-rest.png
- the typed measure box with "money" in it: shots/record/r6-dana-money-run-and-read-money.png
- the finished Money in run, with the table open: shots/record/r6-dana-money-run-and-read-money-read.png
- the column menu, New column opened: shots/record/r6-dana-money-table-dock-large.png
- the three money columns beside the counts (drawn on the 14 flagged accounts):
  shots/record/r6-dana-money-table-dock-selected.png
- the Edges tab and its CSV: shots/record/r6-dana-money-table-dock-edges.png
- one account in the inspector, with its Totals: shots/record/r6-dana-money-inspector-flagged.png

## The project at rest

> "Same file as last time. 'Transfers, March 2026', three thousand accounts, nine thousand one
> hundred and thirteen transfers. Grey honeycomb, 'No labels: 3,000 accounts drawn as density.'
> Fine, I'm not reading the picture."

> "Right-hand side still says 'direction followed, amount not used yet.' Okay. That was the whole
> problem last time -- nothing had added up a dollar. So either that's still true or there's
> something new that adds it up when I ask. Let's see."

> "Where do I ask? Last time I went to Results and got a menu of maths names. There's this
> 'Quick actions' thing at the bottom with a lightning bolt. That doesn't say 'search' to me, but
> it's the only thing that looks like I can type into it. Try it."

## Typing "money"

> "Type 'money'. Oh. Okay. 'Money: sums of amount, in dollars.' Money in -- 'total amount of the
> transfers into each account.' Money out. Money in minus out -- 'what each account kept: in less
> out.' That's the question. That is literally the question my manager asked."

> "And underneath: 'Counts of transfers, not money. Links in (count), how many transfers come in,
> whatever their amount.' Good, that's a useful warning. Last time I nearly sorted by the number
> of transfers and called it money. This one tells me which is which before I click. I don't love
> 'Links' -- they're transfers, call them transfers -- but the sentence under it says transfers,
> so I'm fine."

> "Would I have typed 'money'? Yes, that's the first word I'd type. 'Received'? Maybe. 'Net'?
> Probably, actually -- net is what finance says. I'd want 'net' to find the minus one. I don't
> know if it does."

> "I'll start with Money in, because I want to see what a result looks like before I trust the
> minus one."

## The Money in run

> "'Money in, Sep 29 10:31. On: full graph, 3,000 accounts. Sum of amount, in dollars, on the
> transfers into each account. Directed.' Good -- it tells me what it added up in one line. That's
> the line I'd paste under a slide."

> "Top accounts. ACC-393859, $440,784, 907 links in. ACC-697114, $241,450. Those are the shops I
> guessed last time -- and yes, the table below says 'merchant, merchant, merchant, merchant.'
> Every one of the top six is a merchant. So if I hand this in raw my manager gets a list of
> supermarkets. I'll have to take merchants out, or at least flag them."

> "This bit's nice: 'ACC-893168 is #3 by money in and #37 by Links in (count): 37 transfers,
> fewer and larger.' That's the sort of sentence that makes me look twice at an account. That's a
> reason, not just a rank."

> "But why is it showing me the link count beside the money? I didn't ask about counts. What I
> want next to 'money in' is 'money out'. That's the pair. The count is interesting, it's not the
> question."

> "Right, the minus one. I didn't see a drawn screen for Money in minus out run on its own, so
> I'll assume it looks like this one with the net in the number column. What I really want is
> the three numbers side by side for each account, and that's a table, so -- the table."

## The table: New column

> "Degree column menu. Sort, Filter, Compare, Color by, Size, New column. Last time New column
> went nowhere. Hover... Money in, 'sum of amount on transfers in, USD.' Money out. Money in minus
> out, 'money in less money out, USD.' Then Links in (count), Links out (count), 'counted, not
> summed.' Okay! It's the same three as the typed box. Same names in both places. Good, I don't
> have to learn two vocabularies."

> "Why is it under the 'degree' column's menu, though? I'd never open a column called 'degree'
> on purpose. I got there because I was poking around. If I'd started on the 'id' column would I
> still get New column? I assume every column has it. Please say every column has it."

> "Add all three." (She is shown the money columns drawn on the 14 flagged accounts; the moderator
> explains the full-graph version is the same columns over all 3,000 rows.) "'Weighted degree,
> sum of amount (USD), full graph.' Ugh, 'weighted degree' on the group header -- I don't know
> what that is and I don't need to, the three columns under it say Money in, Money out, Money in
> minus out. I'll ignore the header."

> "Range on the minus column: -69,007.50 to 440,783.97. So the top is that 440 thousand merchant
> again -- it takes in 440 and sends out basically nothing. Makes sense for a shop."

> "Sort descending on Money in minus out. It's in the column menu. I'm trusting that it does what
> it says; the sorted-by-net screen isn't drawn, but sort is sort."

> "Then 'kind' -- business, personal, merchant. Filter to... on kind, take merchants out. Or leave
> them in and flag them. I'd actually do both: first list with merchants flagged, because my
> manager might want the shops too, and a second list without. That's a two-minute decision, not
> a tool problem."

> "'Far more' -- I still have to decide what that means. Dollar difference or the ratio? There's
> no ratio column. An account that took in $200 and sent $0 has an infinite ratio and I don't
> want that on top. So difference, with in and out beside it so she can eyeball the ratio. The
> tool lets me show all three, which is exactly what I'd do in Excel. Fine."

> "Selected rows get a total at the bottom: 'Sum of Money in, 14 rows: 340,978.02 USD. Money out
> 400,931.03 USD.' Handy. If I select my ten I get the total they took in. That's a line for the
> slide."

> "Little thing: the run panel says $440,784, the table says 440,783.97 with no dollar sign. Same
> number, I get it -- one's rounded -- but if I put the panel number on a slide and someone checks
> it against the export, I've got to explain the 97 cents. Pick one."

## Checking one account

> "Click one account, just to check the sums are real. ACC-365386. Connections: Transfers In 3,
> Out 5. Totals: Money in $19,449.22, Money out $28,587.48, 'summed by graphty from
> transfers-2026-03.csv.' Good. I can check that against the Edges tab by hand if audit asks. It
> says where the number came from. That's what I want from every number."

> "It'd be nicer if it also said 'in minus out' there, so I don't do the subtraction in my head,
> but I can do the subtraction."

## Getting it out

> "Export table... Same dialog as last time, I assume: CSV, the Nodes tab, 'nothing is uploaded.'
> The CSV has my three money columns in it? It should -- they're columns in the table now. That
> goes into Power BI or straight into the email. Done."

> "The Edges tab is there if audit wants the raw rows: from, to, timestamp, amount, USD in the
> header. Same as before."

## What she hands in (her plan)

> "Ten rows: account, kind, country, money in, money out, money in minus out, sorted by the last
> one. Merchants flagged, and a second tab without them. Totals line at the bottom from the
> footer. One sentence under it: 'Sum of amount on transfers in and out, March 1 to 31, from
> transfers-2026-03.csv.' All of it from the tool this time. No pivot."

## Single Ease Question

"How easy was this task?" (1 = very difficult, 7 = very easy): **5**

> "Last time I couldn't do it in the tool at all. This time the word 'money' found it, the three
> columns are named the way I'd name them, and it tells me counts are not money. That's a big
> jump. Not a 6 or 7 because: 'Quick actions' doesn't look like a search box, I got to New column
> through a column called 'degree', the header says 'weighted degree' which means nothing to me,
> the Money in run shows me counts next to money instead of money out, and the top of every list
> is shops -- nothing warns me, I just know it. Also I had to take the sort on faith."

## Would she use this instead of her current tool?

> "For this question? Probably, yes -- instead of the pivot. The pivot is ten to fifteen minutes
> every month and the XLOOKUP fights me. Here it's: type money, add three columns, sort, filter
> out merchants, export. If it keeps those three columns on the project next month when I load
> April, that's the thing that beats Excel -- I don't rebuild it. If I have to add the columns
> again every month, it's a tie, and a tie goes to Excel because Excel's already open."

> "And I still ask: IT. 'Nothing is uploaded' is the sentence I need. The CSV goes into Power BI.
> So it's a side tool that feeds my dashboard, not a replacement for it. That's fine. That's more
> than it was last time."

## Moderator notes (observed, not said by the participant)

- She found the money measures by typing "money" into Quick actions, but only after deciding it
  was "the only thing that looks like I can type into". The label and lightning icon did not read
  to her as a search box. She did not reopen the Results measure list, which in the previous round
  gave her only mathematical names.
- The group heading "Counts of transfers, not money" and the one-line descriptions landed at
  once; she called the count/money split a warning that would have stopped her previous near-
  mistake. She disliked "Links" for transfers but accepted it because the line under it says
  transfers.
- She said she would also type "net" and "received"; whether those find Money in minus out is not
  shown.
- On the finished Money in run she valued the sentence contrasting rank by money with rank by
  count, but asked why the companion value is Links in (count) rather than Money out: for this
  question, in and out are the pair.
- She reached New column through the degree column's menu by exploration and said she would never
  open a column named "degree" on purpose; she hoped every column offers New column. The group
  header "Weighted degree" meant nothing to her; she read past it to the column names.
- No screen shows the full 3,000-row table sorted by Money in minus out; she assumed sort works
  and said so. The drawn money columns are on the 14 flagged accounts.
- Merchants dominate every money-in ranking. Nothing on screen points this out; she caught it
  from the kind column, as in the previous round, and planned to filter and flag them herself.
- The same quantity is shown as $440,784 in the run panel and 440,783.97 (no currency sign, USD
  in the header) in the table; she flagged the mismatch as a slide-versus-export problem.
- The project is named "Transfers, March 2026" on some screens and "March transfers" on the table
  screens; she did not comment on it.
- The inspector's per-account Totals with "summed by graphty from transfers-2026-03.csv" built
  trust; she wanted the in-minus-out figure there too.
- The at-rest screen still reads "amount not used yet", which is true until a money measure runs,
  but gave her no hint that money sums exist.
- Her "use instead" answer hinges on the money columns persisting into next month's data.
