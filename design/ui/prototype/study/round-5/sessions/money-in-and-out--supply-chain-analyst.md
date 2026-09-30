# Session: the ten accounts that take in far more than they send out -- Dana, supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst at an industrial equipment maker (simulated;
see ../../personas/supply-chain-analyst.md). She lives in Excel and Power BI, is not a network
scientist, skips anything labelled with a graph-theory term, and reads tables carefully. Money
flows are not her field, but supplier payments and spend are, so she treats "accounts" as "who
we pay and who pays whom".

Task as given by the moderator: "Your manager wants the ten accounts in the March transfers that
take in far more money than they send out, with the amounts, by end of day."

Screens seen, in order, as the participant sees them (design notes hidden):

- the March transfers project at rest: shots/screens__frame-at-rest-dataset-transactions.png
- the measure list (Results "+") and its typed version: shots/record/run-and-read--catalog.png,
  shots/record/run-and-read--quick.png (drawn on the protein sample; the list is the same for any graph)
- a finished measure, to see what a result looks like: shots/screens__results-panel--finished.png
- the table under the canvas on the transfers, Nodes tab: shots/record/r4-dana-money-table-dock-large.png
- the column menu: shots/record/r4-dana-money-table-dock-header.png
- the Edges tab and its CSV: shots/record/r4-dana-money-table-dock-edges.png,
  shots/record/r4-dana-money-table-dock-out.png
- the Export dialog with a table checked: shots/record/r4-dana-money-export-table.png

## The project at rest

> "Okay, 'Transfers, March 2026'. Three thousand accounts, nine thousand one hundred and
> thirteen transfers. So this is a payments file -- from, to, amount. Fine, that's basically an
> AP ledger. I can think about that."

> "The picture is a grey honeycomb. 'No labels: 3,000 accounts drawn as density.' Okay, so it's
> telling me up front the picture won't help me. Honestly, thank you. I'm not reading a hairball
> for this anyway -- my manager wants a list of ten."

> "Over on the right: 'Loaded: transfers-2026-03.csv, direction followed, amount not used yet.'
> Hm. 'Amount not used yet.' That's the whole question. The money is the question. So right now
> nothing on this screen has added up a single dollar. At least it says so -- I've had tools add
> things up wrong without saying."

> "'Change...' next to it. Change what? The file? How it reads amount? I'll come back to that if
> I'm stuck. It's a link in the middle of a sentence, I almost didn't see it was clickable."

> "Nodes, edges, density 0.00101, 'Weak components' -- I don't know what a weak component is and
> I'm not going to find out today. 'Total degree distribution', tiny bar chart. Not my
> vocabulary. 'Attributes 9, 5 more.' The grey text on that side is small, I'm leaning in."

> "Where's a search box that says 'money'? There's a magnifier next to Graphs. That's for graphs,
> not for what I want. Okay -- 'Results', with a plus. Results is what I want. Click the plus."

## The list of measures

> "'Run a measure.' Centrality: Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS,
> Katz, PageRank. Community: Girvan-Newman, Label propagation, Leiden, Louvain. Structure: K-core,
> Topological sort."

> "I don't know what any of those words mean except betweenness, and I only know that from a
> webinar -- it's the chokepoint one. That's not 'takes in more than it sends'. PageRank is the
> Google thing? Important pages? Important isn't what I was asked."

> "Hover on Betweenness: 'How often a node lies on the shortest paths between other nodes: the
> brokers and bottlenecks.' Good, a sentence. But it's the wrong sentence for me. Is there one of
> these that means money in versus money out? HITS... I'm not hovering over every one of these. If
> it's there, it's hiding behind a name."

> "Let me type it. The typed box -- 'Find a result or algorithm.' I'd type 'money'. Or 'received'.
> Or 'inflow'. I don't see anything in this list that would come back for those. It's a menu of
> math names; there's no 'total received' or 'net'."

> "What does a finished one look like, in case one of these is secretly my answer?" (She looks at
> the finished betweenness result.) "'Top nodes', a number to four decimals, a histogram. And
> 'Weight: confidence, not used yet. Change...' So even the measures don't use the money unless I
> go and tell them to. And the numbers are 0.1379 -- that's not dollars. My manager said 'with the
> amounts'. None of this gives me an amount. Close it."

## The table

> "There's a 'Table' strip at the bottom. Tables I understand. Open it."

> "Nodes tab: id, kind, country, community, degree, pagerank, riskScore. 'kind' -- business,
> personal, merchant, I saw merchant somewhere. 'degree (total, full graph)', 1 to 907. So degree
> is how many transfers an account has? 'Total' -- total of what, in plus out? If you've got a
> total you've got the two halves. Where are the two halves? I want 'transfers in', 'transfers
> out', and then the same in dollars. There's no column for money on the accounts at all."

> "Nine hundred and seven transfers on one account. That's a merchant, I'd bet -- a shop gets paid
> by everyone and pays nobody. Which means if I do the manager's question naively, the top ten
> is going to be all shops. Park that; I'll need to ask her if she wants merchants in or out."

> "Column menu, on the degree header: Sort, Filter to..., Compare with..., Color by, Size, 'New
> column' with an arrow, 'Join...'. New column! Hover it." (The submenu is not drawn on the mock;
> the moderator says nothing appears.) "Nothing. So maybe I can make a column, maybe I can't. If
> that's where 'sum of amount received' lives, I'd never know from this. In Excel I'd know in two
> seconds, it's SUMIFS."

> "Edges tab. Okay, this is my file: from_account, to_account, timestamp, amount. 9,113 rows.
> Amount 5.00 to 9,895.21. The header says 'UTC; 2026-03-01 to 2026-03-31' in little grey type --
> fine, it's March, that's what I needed to check."

> "Can I sort by amount? Sure. But the biggest single transfers isn't the question -- an account
> that got one big payment and sent out two big ones is a wash. I nearly handed that in, to be
> honest. The question is the total in minus the total out, per account. That's a pivot. The tool
> has every number it needs and won't add them up for me."

## Getting it out

> "'Export table as CSV...' on the Edges tab. Click."

> "Export dialog. Table (.csv), Tab: Nodes / Edges -- I pick Edges. Rows: all of them. 'Beside it:
> a methods file' -- a little text file saying where the numbers came from. My VP will never read
> it, but audit might, keep it. 'Amount read as currency (USD)' -- good, so it didn't mangle the
> decimals. 'Weight: amount, not used yet; no measure here reads a weight.' Again. It keeps telling
> me it hasn't used the amount, which is honest, and also the whole problem."

> "Bottom line: '2 files go to your Downloads folder. Nothing is uploaded.' That's the sentence I
> want for IT. Export."

> "And now I'm in Excel. PivotTable on the edges file: rows = to_account, values = sum of amount;
> second pivot, rows = from_account, sum of amount. XLOOKUP one into the other, 'in minus out',
> sort descending, top ten. Add the kind from the nodes file so I can flag the merchants. Ten
> minutes, fifteen if the lookup fights me. I could have done this with the raw CSV straight out of
> the bank system and never opened this tool."

> "One thing I'd want to decide with my manager, and the tool didn't help me decide it: 'far more'
> -- is that the dollar difference or the ratio? An account that took in 200 and sent out 0 has an
> infinite ratio. I'd give her the difference, with 'in' and 'out' side by side so she can see the
> ratio herself, and a note on which ones are merchants."

## What she hands in (her plan)

> "Ten rows: account, kind, country, received, sent, net. From the Excel pivot, not from this
> tool. And a line at the bottom saying which ones are merchants, because those take in money by
> design and I don't want someone chasing a supermarket."

## Single Ease Question

"How easy was this task?" (1 = very difficult, 7 = very easy): **3**

> "Getting the data out was easy -- one button, clear dialog, nothing uploaded. That part's a 6.
> Answering the question in the tool was impossible. There's no money-in, money-out anywhere; the
> list of measures is all math names; 'New column' goes nowhere. I did the actual work in Excel.
> Three, and that's generous because the export was painless."

## Would she use this instead of her current tool?

> "No. For this question it's a slower route to Excel. My current tool is a pivot table, and the
> pivot table wins because it adds up the amounts, which is the only thing this question needs.
> The day this table shows me 'received' and 'sent' next to each account, in dollars, and lets
> me sort by the difference -- and tells me the top ten are mostly merchants -- then it beats
> Excel, because I wouldn't have to build the pivot every month. Right now it's the thing I export
> from."

> "And I'd still ask: does it go into Power BI? A CSV does. That's something."

## Moderator notes (observed, not said by the participant)

- She read "amount not used yet" on the at-rest screen correctly and understood that nothing
  shown had summed money. She did not click "Change..." on that line; she read it as part of the
  sentence and could not tell what it would change.
- She opened the Results "+" list expecting a money measure. None of the names (Betweenness,
  Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank, the community and structure
  entries) told her it answers "takes in more than it sends"; she hovered one and gave up on the
  rest. Nothing in the list mentions in versus out, or received versus sent, in words she would
  type.
- The Nodes tab's "degree (total, full graph)" made her ask where the in and out halves were. No
  column on the accounts carries money, and no in- or out- split is offered.
- She found "New column" in the column menu and hoped it was the way to add "sum of amount
  received". The submenu is not drawn, so the mock gave her no answer either way.
- She briefly considered sorting the Edges tab by amount, then rejected it herself: the largest
  single transfers are not the largest net receivers. A less careful reader would have handed that
  in.
- She noticed unprompted that an account with 907 transfers is probably a merchant and that a
  naive "money in minus money out" top ten would be dominated by merchants. The tool gave no hint
  of this; she got it from domain sense and the "kind" column.
- She raised, and resolved herself, the ambiguity in "far more" (difference versus ratio, and the
  zero-out case). Nothing on screen helped frame it.
- Export was quick and trusted: the Edges toggle, "amount read as currency (USD)", the methods
  file and "Nothing is uploaded" all landed. The actual answer was produced in Excel.
- Small grey secondary text (the column subtitles, the state line, the statistics labels) drew a
  complaint again at her usual zoom.
