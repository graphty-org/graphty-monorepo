# Session: "Which accounts take in far more than they send?" -- Alex, operations data analyst

Participant: Alex, 31, data analyst. Uses SQL, pandas and NetworkX, draws in Gephi, hands
everything over in Excel. Company laptop, no admin rights.

Task as given by the moderator: "Your manager wants the ten accounts in the March transfers that
take in far more money than they send out, with the amounts, by end of day."

Screens used: the main window with the March transfers open (at rest), the Results panel and the
run flow (drawn on the protein network), the table under the canvas (the transfers' Nodes and
Edges tabs, and the Export table as CSV popover), and the Export dialog.

Renders he looked at, in order (all in `shots/`):
`screens__frame-at-rest-dataset-transactions.png`, `run-and-read--catalog.png`,
`screens__results-panel--catalog.png`, `run-and-read--quick.png`,
`screens__results-panel--finished.png`, `r4-alex-money-table-dock-large.png`,
`r4-alex-money-table-dock-edges.png`, `r4-alex-money-table-dock-out.png`,
`r4-alex-money-export-table.png`.

## Think-aloud transcript

**Main window, transfers open.**

"OK, 'Transfers, March 2026'. Counts first. 3,000 nodes, 9,113 edges. That's what the extract
had -- 3,000 accounts, 9,113 rows. Good, nothing dropped. 'Weak components 1.' Fine, it's all
one blob, which for payments I'd expect because everybody pays the same big merchants."

"The picture is... a grey hexagon heat thing. 'No labels: 3,000 accounts drawn as density.' OK.
I'm not going to get anything off that anyway. My manager does not want a picture, he wants ten
rows."

"Up here in the stats: 'Loaded: transfers-2026-03.csv, direction followed, amount not used yet.'
Direction followed, good, because that's the whole question -- in versus out. 'Amount not used
yet.' Hm. That's the bit I need. I need it to add up amounts. There's a 'Change...' link. I'm
not clicking that yet, I don't know what 'used' would mean -- used for what? Last time 'used'
meant it got read as a distance and I got a nonsense betweenness. I'll look for the thing I
actually want first."

**Looking for a measure. The catalog.**

"There's a 'Find a result or algorithm' box. I'll type what I want. ... What do I type. 'In'?
'Net'? 'Flow'? In NetworkX this is `in_degree(weight='amount')` minus
`out_degree(weight='amount')`. So... 'degree'."

(Looks at the catalog list and the quick-actions render.)

"Centrality: betweenness, closeness, eigenvector, harmonic, HITS, Katz, PageRank. Community.
Path. Structure. Flow: maximum flow, minimum cut, 'source and sink'. Prediction. ... There's no
degree in here at all. Degree's the first thing anybody runs. Where's degree?"

"'Flow.' Money flow? No -- 'maximum flow, source and sink', that's the pipe-capacity thing
between two nodes. That's not it. If I clicked that I'd be picking a source and a sink and
getting one number. No."

"HITS. OK, I actually half remember this one. Hubs and authorities. Authority is the one that
gets pointed at. So an account that gets paid a lot would be an 'authority'? ... Maybe. But
that's not an amount, that's a score, 0.00-something. My manager said 'with the amounts'. And
I'd have to explain what HITS is, and I can't. Not using that."

"PageRank weighted by amount -- same problem. It gives me who money ends up at, sort of, but not
'takes in more than it sends'. And not in dollars. I'd be answering a different question and
calling it this one. That's exactly how you get caught out in a meeting."

"Also the Results screens are the protein network. I'm assuming it's the same menu on the
transfers. Fine."

**The table.**

"OK, forget the menu. There's a table at the bottom, 'Table 3,000 nodes, 9,113 edges'. Open
that."

"Nodes tab: id, kind, country, community, 'degree (total, full graph)', pagerank, riskScore.
'Total' degree. Total. So it knows there's an in and an out, because it's calling this one
total. Where are the other two? I'd click the column header and look for in and out. ... The
header's got a chevron menu on hover, sort, histogram. Nothing about direction that I can see.
And it's counts anyway. The number of transfers, not the money. Somebody who gets one 9,800
payment and sends out twenty 5-dollar ones would look like they send more. Useless for this."

"Selected 14 accounts, the right side shows kind, country, community, total degree, pagerank,
riskScore. No money anywhere on an account. The money is only on the edges."

**Edges tab.**

"Edges: from_account, to_account, timestamp, amount. 'UTC; 2026-03-01 to 2026-03-31.' Good,
that confirms it's March and only March, I'd have had to check that in SQL otherwise. Amount 5.00
to 9,895.21."

"Can I just sort by amount? ... Sort descending, take the top ten to_accounts. ... No. No, stop.
That's the ten biggest single transfers. One account could be in there three times, and an
account that gets a thousand small payments never shows up. And it says nothing about what they
send out. I nearly did that. That's the kind of thing that goes in the deck wrong."

"So it's a group-by. Sum amount by to_account, sum amount by from_account, subtract, sort. Two
minutes in pandas. And honestly -- it's a GROUP BY in SQL, I don't even need a graph for this. I
don't see anywhere in here that does a group-by."

**Getting it out.**

"'Export table as CSV...' on the Edges tab. The popover: rows, order, columns, file name. The
first lines are right there: `from_account,to_account,timestamp (UTC),amount (USD)`. Good. It's
the edges, it says edges, it shows me edge rows. I've been burned on that exact thing in Gephi,
the nodes button giving me edges. Here I can see what I'm getting before I press it. That's
worth something."

"The big Export dialog says the same, 'Tab: Nodes | Edges', and a methods file beside it. The
methods file says 'Weight: amount, not used yet; no measure here reads a weight.' Well. That's
honest. That's basically the tool telling me it can't do my question. At least it said it
instead of making something up."

"'2 files go to your Downloads folder. Nothing is uploaded.' Fine."

"So: export 9,113 edges, open in Excel, pivot table -- rows to_account, sum of amount; second
pivot on from_account; XLOOKUP one into the other, subtract, sort, top ten. Or pandas. Either
way the answer comes from Excel, not from this."

"Timestamp in the CSV is `2026-03-29T21:09:09Z` -- with the T and the Z. Excel won't read that
as a date without me fixing it. Doesn't matter for this task, it would next time."

**One more thing: what does 'far more' mean?**

"'Take in far more than they send out.' Net inflow in dollars, or the ratio? An account that
takes in 50k and sends 45k has a big net but isn't 'far more'. One that takes in 2,000 and sends
nothing has an infinite ratio. I'd give him net inflow, top ten, with in, out and the ratio as
columns, and say which one I sorted on. Nothing in the tool helped me think about that, but
nothing would, really, that's my job."

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 2.**

"Two. Getting the edges out was easy, that was fine, I'd give that part a six. But the task
wasn't 'export the edges', it was 'which accounts take in more than they send', and the tool
couldn't answer it. I finished it in Excel. If I score the tool on the question it's a two, and
I'm being generous because the export didn't lie to me."

**Would you use this instead of your current tool?**

"For this? No. This is SQL. `SELECT account, SUM(in) - SUM(out)`... I'd never have opened a
graph tool for it, and now I know why. What bugs me is that it's so close: it knows the
direction, it knows the amount column is money, it calls degree 'total' so it knows about in
and out. It just won't add up the money per account. If the nodes table had money in and money
out next to degree, I'd have sorted that column and been done in thirty seconds, and then I'd
actually want to see those ten on the picture -- who pays them. That part, who's paying the ten,
is a graph question, and that's where I'd have started to like it."

"And I'd want degree in the menu. I typed it and it wasn't there."

## Problems observed

1. **No way to rank accounts by money in against money out (severity 4).** The transfers are
   loaded directed with an amount column, but no measure, column or table view sums the amount
   per account. The catalog has no degree or strength entry, the Nodes table has only
   "degree (total)" as a count, and the Export methods file confirms "no measure here reads a
   weight". The participant finished the task in Excel from the raw edges. Quote: "The tool
   couldn't answer it. I finished it in Excel."
2. **Degree is missing from the catalog and search (severity 3).** Degree appears as a table
   column but not in the Algorithms menu or the "Find a result or algorithm" list, so the first
   thing he typed found nothing. The column header "degree (total, full graph)" implies in and
   out exist, and neither can be found. Quote: "Total. So it knows there's an in and an out...
   Where are the other two?"
3. **Near-miss: sorting edges by amount looks like an answer (severity 3).** The Edges tab sorts
   by amount, which gives the ten largest single transfers, not the ten accounts with the largest
   net inflow. He caught it himself; a hurried analyst would not. Nothing on screen separates
   "per transfer" from "per account". Quote: "I nearly did that. That's the kind of thing that
   goes in the deck wrong."
4. **"Amount not used yet. Change..." does not say what using it would do (severity 2).** The one
   control that mentions the money column does not say whether "using" the amount would sum it,
   rank by it or treat it as a distance, so he left it alone. Quote: "Used for what?"
5. **Plausible wrong tools sit in the catalog (severity 2).** "Flow: Maximum flow" and HITS
   (authorities) both sound like money coming in; neither answers the question or gives dollars.
   Quote: "I'd be answering a different question and calling it this one."
6. **The run screens show the protein network, not the transfers (severity 1).** Same problem as
   earlier rounds: he had to assume the menu is the same for his data. Quote: "I'm assuming it's
   the same menu on the transfers."
7. **The CSV's timestamp is not an Excel date (severity 1).** `2026-03-29T21:09:09Z` needs
   cleaning before Excel treats it as a date. Quote: "Excel won't read that as a date without me
   fixing it."

Note for the designers (not seen by the participant): the inspector's flagged-account state
already draws "amount, totals: In $19,449.22, Out $28,587.48" for one account, as a proposal to
graphty-element. The same two totals as Nodes-table columns (with a rank, like degree) would have
answered this task in one sort; one account at a time would not have.

## What worked for him

- The node and edge counts (3,000 and 9,113) matched the extract at once.
- "direction followed" in the load line, and the Edges tab's date range "2026-03-01 to
  2026-03-31", answered two checks he would otherwise have run in SQL.
- The export popover and dialog show the file's first lines and name the tab, so he knew he was
  getting edges, not nodes, before pressing Export.
- The methods file said plainly that nothing read the amount, instead of implying a result.
- "Nothing is uploaded" at the point of export.
