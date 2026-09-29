# Money in, money out -- Nadia, level-1 alert reviewer

**Participant:** Nadia, level-1 transaction monitoring analyst at a mid-size bank, fourteen months
in. Works an alert queue in the case system; has never used a graph tool herself. Patience: the
length of one alert. Totals go in a spreadsheet.

**Task as given by the moderator:** "Your manager wants the ten accounts in the March transfers
that take in far more money than they send out, with the amounts, by end of day."

**Viewport:** 1536 by 740 (her docked laptop at 125 percent scaling). Every render was made in the
participant view at that size.

**Screens seen** (renders in `shots/r4-nadia-money/`):
- `frame.png`, `frame-s1.png` to `frame-s9.png` (the March transfers project at rest, and its states)
- `table-full.png` (every table state; the March Nodes and Edges tabs, the column menu, the CSV
  export dialog), `table.png`, `table-edges.png`
- `run.png`, `run-catalog.png`, `results.png`, `results-catalog.png`, `results-finished.png`
  (Run a measure, the Algorithms menu, a finished result -- all on the protein graph)
- `export.png`, `export-table.png`, `export-full.png` (the Export dialog)

Page HTML was read only to see what a control does when clicked.

## Think-aloud

**1. The project opens.** (`frame.png`)

"Transfers, March 2026. Good, right month. 3,000 nodes, 9,113 edges. Nodes are accounts, edges are
transfers, I'm assuming.

The picture is a grey honeycomb. 'No labels: 3,000 accounts drawn as density.' OK, so the picture
is no use to me for this. I don't need a picture anyway, I need a list of ten accounts with two
numbers each.

Statistics on the right: 'Loaded: transfers-2026-03.csv, direction followed, amount not used yet.
Change...' Amount not used yet. That's the one column I care about and it's the one it isn't using.
I don't know what 'used' would mean. Used for what? I'll leave it, because I don't want to change
how the file loaded and then have to explain that to QA."

**2. Looking for a search box, then for money.** (`frame.png`)

"There's a search icon next to Graphs, but I don't have an account number this time -- that's the
thing I'm supposed to find. So search is no help.

Density, Weak components, Total degree distribution. None of that is money. Degree is a count of
transfers, right? Not dollars. An account with 400 tiny transfers would win on that. That's not
what my manager asked."

**3. The table.** (`table-full.png`, March Nodes tab)

"Opened the table from the strip at the bottom. Nodes: id, kind, country, community, degree
(total, full graph), rank, pagerank, riskScore. No 'total received'. No 'total sent'. No amount
column at all on the accounts.

Degree says 'total' in brackets. So somewhere there's an in and an out? I can't see where to split
it. And even then it's the number of transfers, not the amount.

The column header has a little menu. Sort descending, Sort ascending, Filter to..., Compare with...,
Color by degree, Size: degree, New column, Join... 'New column' has an arrow. That's the only thing
on this whole screen that might make a 'money in' column. What's in the submenu? The mock doesn't
show it, and clicking says it isn't working. So I don't know. If it's a formula box I'm not writing
a formula. I'd type 'sum of amount' and hope."

**4. The Edges tab.** (`table-full.png`, 'Full graph: 9,113 edges')

"Edges: from_account, to_account, timestamp, amount. OK, this is the raw data. This is my core
banking export, basically. Amount 5.00 to 9,895.21.

What I want is: for each account, add up the rows where it's in to_account, add up the rows where
it's in from_account, subtract, sort. That's a pivot table. I don't see a way to group rows here.
I can sort by amount, that gives me the biggest single transfers, not the biggest totals. Not the
same thing -- my manager will notice if I send him the biggest single transfers.

'Export table as CSV...' at the top right. That I understand."

**5. Trying the measures anyway.** (`run.png`, `results-catalog.png`)

"Before I give up, the main menu has Algorithms. Centrality: Betweenness, Closeness, Eigenvector,
Harmonic centrality, HITS, Katz, PageRank. Community, Path, Structure, Flow.

HITS -- I've heard hubs and authorities. Is an 'authority' something that receives a lot? Maybe.
But I can't put 'authority score 0.0031' in front of my manager, he asked for dollars. PageRank is
already in the table and it's a tiny decimal too. Flow: 'Maximum flow, source and sink...'. Flow
sounds like money but it wants two accounts, and I'm looking for ten I don't know yet.

None of these say 'amount' or 'total' or 'received'. The finished result screen has 'Weight: None
for this run'. Maybe weight is where amount goes. But then I'd get a weighted something-centrality,
which still isn't 'money in minus money out'. I'd be guessing, and I'd have to explain the guess."

(These screens show the protein graph, not her transfers. She read them as "what the menu would
look like on mine".)

**6. The Export dialog tells me the answer.** (`export-table.png`)

"This is the full Export. Table (.csv), Nodes or Edges. And on the right, the notes file it writes
next to it: 'Weight: amount, not used yet; no measure here reads a weight.'

So that's it, in writing. Nothing here reads the amount. Good that it tells me, honestly -- better
than me running HITS and sending a wrong list. But it means the answer isn't in here."

**7. What I actually do.** (`table-full.png`, Edges tab -> Export table as CSV)

"Edges tab, full graph, Export table as CSV. The preview says 'from_account, to_account, timestamp
(UTC), amount (USD)'. 9,113 rows. Open it in Excel, pivot: rows = account, values = sum of amount,
once for to_account and once for from_account, VLOOKUP them together, subtract, sort, top ten.
Twenty minutes if the pivot behaves.

I could have done that from the core banking extract without this tool. The tool gave me a CSV I
already had.

Another thing: 'far more money than they send out'. Is that a difference or a ratio? An account
that got 50,000 and sent 45,000 is a big difference but not 'far more'. An account that got 900 and
sent 0 is infinite ratio but who cares. I'd ask my manager, or I'd put both columns in and let him
look. The tool doesn't help me with that either way -- it doesn't know it's money."

**8. Export test.** (`export.png`)

"Could the result go in one picture and a few lines? The result would be an Excel sheet. I'd paste
the ten rows into the email. The graph picture adds nothing -- it's a honeycomb. If the tool could
select my ten accounts and show who's paying them, that would be worth a screenshot for the ones
that look bad. But I'd have to get the ten from Excel first, then paste them back in one by one.
'Half my day is copying an account number from one screen to another.' This is that."

## Single Ease Question

**2 out of 7.** "Easy to get the transfers out. Impossible to get the answer out. I did the
actual task in Excel."

## Would she use this instead of her current tool?

"No. Not for this. My current tool for this is a spreadsheet, and the spreadsheet did the work.
This added a step at the start -- open the project, find the Edges tab, export -- that the core
banking extract already does.

If there were a column on the accounts that just said 'received' and 'sent', in dollars, for the
month, and I could sort on it, I'd have been done in two minutes and I'd have used this, because
then I could click the top one and see who's feeding it. That's the part Excel can't do. But it
has to add up the money first. Every account question I get is about money. A tool that counts
transfers and not dollars isn't a money tool."

## Observed problems (moderator notes)

1. **No per-account money totals anywhere.** Neither the Nodes table, the measure catalog, nor the
   inspector offers amount received, amount sent, or the difference. The task could not be done in
   the product. (Severity: blocks the task.)
2. **"Amount not used yet" is not actionable to her.** She saw it in the first ten seconds, read it
   as "the tool is ignoring the money", and did not press Change... for fear of altering the load.
   Nothing says what using it would give her.
3. **"Degree (total)" hints at in and out but gives no way to split it**, and it counts transfers,
   not dollars. She named the trap herself: many small transfers would outrank a few large ones.
4. **"New column" is the only candidate path and its content is unknown.** She would have tried it;
   the mock does not show what it offers.
5. **The weighted measures invite a wrong answer.** She briefly considered HITS authority as
   "receives a lot". She rejected it because the manager asked for dollars; a less careful reviewer
   might send a centrality score as if it were money.
6. **The Export notes file stated the limit plainly** ("no measure here reads a weight"). She
   trusted the tool more for saying so -- and it is what made her leave for Excel.
7. **Round trip back into the graph is manual.** Once Excel has the ten, getting them back to see
   who pays them means pasting ten ids one at a time.

## What worked

- The Edges tab is the raw transfer list she recognises, with amount and timestamp next to the
  accounts, and its CSV preview shows the exact header before export.
- The methods file beside the CSV says what the file is and is not ("amount read as currency
  (USD)", "not computed by graphty"), which is what QA would want.
