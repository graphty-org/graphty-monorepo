# Session: ten accounts that take in far more than they send out -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). Simulated session, played in character, dark mode,
study view (design notes hidden).

Task as given by the moderator, and nothing more: "Your manager wants the ten accounts in the
March transfers that take in far more money than they send out, with the amounts, by end of day."

Screens, in the order she met them (renders in `shots/`):

1. `screens/frame-at-rest.html?dataset=transactions` -- Transfers, March 2026 at rest
   (`r4-priya-money-frame.png`)
2. `screens/table-dock.html` -- the Nodes tab opened, then its column menu (`#large`, `#header`;
   `r4-priya-money-table-large.png`, `r4-priya-money-table-header.png`)
3. `screens/results-panel.html#catalog` and `#quick-actions`, `screens/run-and-read.html#catalog`
   and `#quick` -- looking for a measure that adds up amounts
   (`r4-priya-money-results-catalog.png`, `r4-priya-money-results-quick-actions.png`,
   `r4-priya-money-run-catalog.png`, `r4-priya-money-run-quick.png`)
4. `screens/run-and-read.html#done`, `screens/results-panel.html#variant` -- the Weight option on a
   finished measure (`r4-priya-money-run-done.png`, `r4-priya-money-results-variant.png`)
5. `screens/table-dock.html#edges` and `#out` -- the Edges tab and its CSV export
   (`r4-priya-money-table-edges.png`, `r4-priya-money-table-out.png`)
6. `screens/export-dialog.html#table` -- the table export with its methods file
   (`r4-priya-money-export-table.png`)

## Transcript

**Before starting.**

> "OK. 'Take in far more than they send out.' That's money in minus money out per account, summed
> over the month. Or in divided by out. My manager didn't say which and won't care, but I'll give
> both columns so nobody argues. That's a group-by. In my notebook this is four lines of pandas. So
> the bar for this tool is: is it faster than four lines of pandas?"

> "Usual three questions. Approved? No. Runs where? Calls out? ... Top left: 'Nothing has been sent
> from this project.' Rail says 'Assistant Off. Nothing is sent.' Fine. It says it, which is more
> than most. A real trial still stops at 'not on the list', but this is a study, so, going on."

**1. The frame at rest.**

> "'Transfers, March 2026.' Good, there's the month, right in the title. File chip
> 'transfers-2026...' -- truncated, but that's the file. 3,000 nodes, 9,113 edges. A blob in the
> middle. 'No labels: 3,000 accounts drawn as density.' OK, I'm not going to read a hairball
> anyway."

She reads the Statistics block because it has numbers.

> "'Loaded: transfers-2026-03.csv, direction followed, amount not used yet.' -- Huh. That's
> actually the most useful sentence on the screen for this task. Direction followed, good, because
> in versus out is the whole question. 'Amount not used yet.' So right now nothing in here knows
> about money. Everything it'll compute is counts of transfers. I want dollars."

> "There's a 'Change...' link. I'm guessing that's where I tell it amount is the weight. I'll come
> back to that if nothing else works."

> "Where's the query box? ... No query box. Ctrl+F, slash -- that's search, it'll find an account
> by id, it won't do a group-by. OK. Table. The strip at the bottom says 'Table 3,000 nodes, 9,113
> edges.' Open it."

**2. The Nodes table.**

> "Columns: id, kind, country, community, a Degree group, PageRank, riskScore off the edge. Degree
> says 'degree (total, full graph)', 1 to 907. 'Total' -- so it knows there's an in and an out. I
> want in and out separately. And I want them in dollars, not in transfer counts."

> "Header says 'March transfers'. The title said 'Transfers, March 2026'. Same thing, I assume.
> Don't make me assume."

She opens the column menu on the degree column.

> "Sort descending, sort ascending, Filter to..., Compare with..., Color by degree, Size: degree,
> New column, Join... Nothing that says 'in' or 'out'. Nothing that says 'amount'."

> "'New column' has an arrow. That's the only thing here that sounds like it might let me write
> something. If it gave me a formula box -- sum of amount on incoming minus sum on outgoing -- I'd
> be done in a minute."

In the mock the submenu does not open; she hovers and nothing appears.

> "Nothing. OK, I'll take that as 'it doesn't do that'. That's a guess and I don't like guessing,
> but I'm not spending more than a minute and a half on a menu. 'Join...' -- join what, to what? A
> join is how I'd do this in SQL, edges joined to nodes, grouped. But I'm not clicking a thing
> called Join on a guess and ending up with a column I can't explain to my manager."

**3. Looking for a measure.**

> "Maybe it's an algorithm. Hamburger, Algorithms. Centrality: Betweenness, Closeness, Eigenvector,
> Harmonic, HITS, Katz, PageRank. Community... Path... Structure... Flow: Maximum flow, Minimum cut,
> 'source and sink...'"

She stops at two of them.

> "HITS. Hubs and authorities. Authority is 'lots of stuff points at you'. That's the nerd version
> of 'takes in a lot'. But it's not money, and it's not in-minus-out, and if I hand my manager
> 'authority score 0.03' he'll ask what it is and I'll be explaining eigenvectors at 5 p.m. No."

> "Maximum flow needs a source and a sink. I don't have a source and a sink, I have 3,000
> accounts. No."

> "And -- where's Degree? It's a column in the table, the right panel on one of these says
> 'Results: Degree, exact, full graph', but it's not in the Algorithms list. So I can't even find
> the thing that's closest to what I want to go set its options."

She tries Ctrl+K.

> "Quick actions. Typing 'centrality' gives me the same seven. I'd type 'in-degree', 'amount',
> 'sum', 'net'. The page doesn't show me what comes back for those; I'm betting nothing, because
> nothing I've seen so far has any of those words. If there were a 'Weighted in-degree' or 'Money
> in' in this list I'd have seen it under Centrality."

**4. The Weight option.**

She opens a finished measure to see what options look like.

> "Betweenness, and there's 'Weight: None for this run' with a dropdown. And on the other one:
> 'Weight: confidence, not used yet. Change...' So measures can take a weight. If I set amount as
> the weight, maybe degree would become weighted degree, and then in and out weighted degree would
> be exactly money in and money out."

> "But I've got no in and out, and degree isn't in the list of things I can open. So I'd be
> changing a setting on the whole file, 'amount is the weight', to find out if some column I
> can't see starts using it. That's not a hunt, that's poking."

**5. The Edges tab.** At this point she stops looking for it in the product.

> "Fine. Edges tab. 'Full graph: 9,113 edges.' from_account, to_account, timestamp 'UTC;
> 2026-03-01 to 2026-03-31', amount '5.00 to 9,895.21'. That's my raw data with a time range on
> it. Good, that's the one thing I really needed from a screen: which range. The whole of March,
> UTC."

> "9,113 matches the frame. So nothing got dropped on the way in, or at least the count agrees with
> itself. I'd still check it against the file's line count."

> "'Export table as CSV...' -- preview says 'from_account,to_account,timestamp (UTC),amount (USD)'.
> Currency and time zone in the header. Somebody thought about that."

**6. The export dialog.**

> "Scope, Tab: Nodes or Edges. I pick Edges. Rows: all 9,113. 'Beside it: ...methods.txt.' Let me
> read that, it's short. 'Data: transfers-2026-03.csv, 3,000 accounts, 9,113 transfers, directed.
> Load: nodes from from_account and to_account; amount read as currency (USD); timestamp kept as
> text. Weight: amount, not used yet; no measure here reads a weight.'"

She laughs, not kindly.

> "'No measure here reads a weight.' Well, there it is. It's honest. It just told me in the export
> dialog, on the way out the door, that nothing in here was ever going to add up the amounts. I
> wish it had said that on the first screen instead of 'Change...', which made me think it could."

> "'2 files go to your Downloads folder. Nothing is uploaded.' Export."

**7. The workaround, said out loud.**

> "So here's what I'm actually doing: edges CSV into the notebook. groupby to_account, sum amount --
> that's money in. groupby from_account, sum amount -- money out. Outer join on account, fill zero,
> in minus out, in over out. Sort. Head ten. Five minutes, most of it opening Jupyter."

> "And I already know what the top ten's going to be: merchants. 60 merchant accounts, everybody
> pays them, they barely send anything. That's technically the right answer and it's noise. If I
> hand my manager ten merchants he'll say 'obviously'. So I'd join the node CSV for 'kind', and
> give him two lists: top ten overall, and top ten personal accounts. The personal ones are the ones
> anybody cares about."

> "Also -- the mule ring. The alert rule on those 14 is 'structuring, transfers out'. Mules take
> money in and send it straight back out, so in-minus-out on a mule is near zero. They won't be on
> this list. If my manager thinks this list catches mules, it doesn't, and I'd say so in the email.
> A tool that knew about money would have made that obvious. This one couldn't, because it doesn't
> know about money."

> "And for 'by end of day' I'm attaching a CSV, not a picture. Nobody's asked for a picture."

She does not produce the ten accounts in the session: the mock has no amounts she can sum, and she
will not guess at them.

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 2.**

> "It's a 2 and not a 1 because it got my data out clean, with the time range and the currency in
> the header, and the methods file said out loud that it wasn't using amount. The actual task --
> sum the money per account -- it couldn't do at all. I did it in pandas. So graphty's contribution
> to this task was a CSV export of a file I already had."

**Would she use this instead of her current tool?**

> "For this? No. This is a table question, it was always a table question. A graph tool that can't
> sum a number on the edges into the nodes is going to lose every table question to my notebook.
> What would change my mind: in and out on the degree column -- counts and amounts -- right in the
> table, sortable, one click. 'Money in', 'Money out', 'Net'. Then I'd sort, filter kind to
> personal, click the top account and see who paid it. That last bit, who paid it, is the thing my
> notebook is bad at and a graph is good at. It never got me there."

## Problems, in her words

| Where | What | Severity (1-4) |
|---|---|---|
| Whole product | No way to add up the amount on an account's incoming and outgoing transfers (money in, money out, net). The task could not be done in graphty; she did it by exporting the edges and summing in her notebook. | 4 |
| Nodes table, degree column | "degree (total, full graph)" says "total" but there is no in / out choice anywhere she could find, and no weighted-by-amount variant, so the nearest column answers a different question (transfer counts, both directions). | 3 |
| Algorithms menu and Quick actions | Degree appears as a table column and as a result, but is not in the Algorithms list, so she could not find where its options live. Typing words like "amount", "in-degree" or "net" had nothing obvious to match. | 3 |
| Frame state line vs export methods file | The frame says "amount not used yet. Change...", which suggests setting amount as the weight will make it count. Only the export's methods file says "no measure here reads a weight." She learned the dead end on the way out. | 3 |
| Nodes table column menu | "New column" (with an arrow) and "Join..." are the only entries that sound like computing something, and neither says what it does. She would not click Join on a guess. | 2 |
| No query box | Nowhere to type "sum amount by to_account"; she would have written it in one line. | 2 |
| Names | The same data is "Transfers, March 2026" on the frame and "March transfers" on the table. | 1 |
| Result framing | Nothing warned that a net-inflow ranking will be led by merchants, or that mules (money in, money straight out) will not appear on it; she knew both from the domain, a newcomer would not. | 1 |

## What worked, in her words

- "'Nothing has been sent from this project' and 'Assistant Off. Nothing is sent.' It answers the
  phone-home question without me asking."
- "'Transfers, March 2026' in the title and 'UTC; 2026-03-01 to 2026-03-31' on the timestamp column.
  I know exactly which range every number is from."
- "'direction followed, amount not used yet.' It told me up front it didn't know about money. I
  just didn't believe it hard enough."
- "The CSV header says 'timestamp (UTC)' and 'amount (USD)'. That's the whole reason I can drop it
  into Splunk without a note."
- "The methods file. Rows, source file, what was loaded as what, and 'no measure here reads a
  weight'. That's the sentence I'd paste into the email so nobody asks if the numbers are weighted."
- "9,113 edges on the frame, 9,113 in the table, 9,113 rows in the export. The counts agree."
