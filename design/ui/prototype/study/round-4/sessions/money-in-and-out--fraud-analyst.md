# Session: money in against money out -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator (persona: `../../personas/fraud-analyst.md`).
Task as read by the moderator, and nothing more: "Your manager wants the ten accounts in the March
transfers that take in far more money than they send out, with the amounts, by end of day."

Mode: not mandated. Nobody said the tool was required, so Sarah uses it as long as it earns the time
and then goes back to what she knows. The deadline (end of day) was part of the task.

Screens she saw, as a participant sees them (design notes hidden):

- the main frame at rest on the March transfers: `../../../shots/record/r4-sarah-inout-screens_frame-at-rest_html_dataset_transactions.png`
- the bottom table, every state: `../../../shots/record/r4-sarah-inout-screens_table-dock_html.png`
- the results in the inspector, every state: `../../../shots/record/r4-sarah-inout-screens_results-panel_html.png`
- run a measure and read it, every state: `../../../shots/record/r4-sarah-inout-screens_run-and-read_html.png`
- the Export dialog: `../../../shots/record/r4-sarah-inout-screens_export-dialog_html.png` and `../../../shots/record/screens__export-dialog-table--study.png`

## Transcript

### 1. The frame at rest

> Okay. "Transfers, March 2026." 3,000 accounts, 9,113 transfers. Fine, that matches what I'd expect
> for the extract. The picture is a grey blob of hexagons -- "3,000 accounts drawn as density". I'm
> not going to find ten accounts in a blob, so I'm ignoring the picture.
>
> Right side, Statistics: "Loaded: transfers-2026-03.csv, direction followed, amount not used yet."
> Huh. Amount not used yet. So it knows there's an amount column. It just hasn't done anything with
> it. That's honest, I'll give it that. "Direction followed" -- good, from and to matter, that's the
> whole question.
>
> Density 0.00101, weak components 1, a histogram of "total degree". None of that is money. I need in
> and out, in dollars, per account.
>
> Where's the table? Bottom strip: "Table, 3,000 nodes, 9,113 edges." Nodes and edges. Accounts and
> transactions, fine. That's where I go first. I always go to the rows first.

### 2. The table: accounts tab

> Opened the table. Accounts tab -- sorry, "Nodes". Columns: id, kind, country, community, then a
> group called "Degree" with "degree (total, full graph)" and a rank, then "PageRank", then riskScore.
>
> Degree, total, 1 to 907. That's a count of links, isn't it? Not money. And "total" -- in plus out
> lumped together. That's exactly the thing I need split apart. The account with 907 links is going
> to be a merchant or a payroll account; everybody pays the supermarket. That's not a finding, that's
> a Tuesday.
>
> There's a sentence above the table: "The top 10 are the same on both measures, led by ACC-393859."
> The same on both measures -- which measures? Degree and PageRank. I don't know what PageRank is, and
> the header says "damping 0.85, unweighted". Unweighted means it didn't look at the amounts either,
> right? So those are two ways of counting links, and they agree. Great. Neither of them is dollars.
>
> ACC-393859 is a merchant; I saw it in the other tab. If I sent my manager "top ten by PageRank" he'd
> ask me what PageRank is and I'd have nothing. And somebody junior would send it, because the table
> says "top 10" in a sentence and it looks like an answer. That worries me more than anything else on
> this screen.
>
> No column for money received. No column for money sent. The accounts tab is the bank's own fields
> plus two link counts.

### 3. The table: transactions tab

> Edges tab. "Full graph: 9,113 edges." from_account, to_account, timestamp, amount. Amount 5.00 to
> 9,895.21. Good -- this is my statement export, basically. Time right after the two accounts, which
> is how I'd lay it out too.
>
> Now what I want is: group by to_account, sum amount; group by from_account, sum amount; subtract.
> That's a pivot. Two minutes in Excel. Where's the pivot?
>
> Column menu on amount. Sort descending, sort ascending -- that gives me the single biggest
> transfers, which isn't the question. One ten-thousand-dollar transfer into an account that sends out
> fifteen thousand is not "takes in far more than it sends". Filter to... -- I could filter, but a
> filter doesn't add anything up. Compare with... -- no. Color by, Size -- no. "New column" with an
> arrow. Okay, that's the one, maybe it has "total per account" in it.
>
> [Moderator note: the New column submenu is not drawn in the mock; hovering it shows nothing.]
>
> Nothing. It's an arrow to nowhere. "Join..." -- join to what? I don't have another table, I have
> this one. I'm not doing a join to answer a sum.
>
> No totals row either. No "sum of selected". Even Excel's status bar sums what you highlight.

### 4. Looking for it as a calculation

> Fine, maybe it's one of their algorithms. Main menu, Algorithms. Centrality: Betweenness, Closeness,
> Eigenvector, Harmonic centrality, HITS, Katz, PageRank. I don't click any of those; I can't map any
> of them to a typology and I'd have to explain it to an examiner. Community: Girvan-Newman, Label
> propagation, Leiden, Louvain -- people's names. Path, Structure, Flow. "Maximum flow" -- flow, money
> flows. "Source and sink..." So I'd pick one account to start and one to end. That's for tracing a
> path between two accounts, not ten accounts out of 3,000. Not it.
>
> There's no "Degree" in that list at all, even though the table has a Degree column. So where did
> the table's degree come from? I don't know. And I don't see "money in", "money out", "net",
> "received", "total amount" -- anything in words I use.
>
> Quick actions, Ctrl+K. I'd type "received". Or "total". In the screens I have, the search box only
> lists algorithms under "Algorithms, Centrality", with how long each takes. I'd type "amount" and
> I'd expect it to at least say "amount is not used by anything yet". I don't see that it would.
>
> The results panel on the proteins has a line "Weight: confidence, not used yet. Change..." and an
> Options block with "Weight". So some of these can take a weight. If I could run something with
> Weight = amount, Direction = incoming... but I don't know which one. And the export text for my own
> transfers file says it flat out: "Weight: amount, not used yet; no measure here reads a weight."
> No measure here reads a weight. So the tool knows the amounts, and has nothing that adds them up.
> That's the answer to my question: it can't do it.
>
> The "Change..." link on the Statistics line -- I'd click it once, hoping it says "use amount". From
> what I can see it reopens how the file was loaded. Even if I set amount as the weight there, nothing
> reads it. Dead end.

### 5. Getting it out, doing it in Excel

> So I get the rows out. Edges tab, "Export table as CSV..." The dialog: Rows, Nodes or Edges tab,
> the first lines of the CSV, and a methods file beside it. "2 files go to your Downloads folder.
> Nothing is uploaded." Good. That line I like. That's the first thing my IT person would ask.
>
> The CSV is from_account, to_account, timestamp, amount. Which is... the file I loaded. The March
> transfers extract, in the same columns, with the timestamp moved. I already had this file before I
> opened the tool.
>
> In Excel: pivot on to_account, sum of amount, that's in. Pivot on from_account, sum of amount,
> that's out. XLOOKUP one into the other, in minus out, maybe in divided by out, sort, top ten. Then
> I'd filter out kind = merchant from the accounts file, because the sixty merchants are going to take
> the whole top ten -- merchants take in money and barely send any, that's what a merchant is. My
> manager doesn't want Tesco; he wants personal accounts that behave like collection points. Probably
> I'd also drop payroll-type business accounts, or at least mark them. Twenty minutes with the lookup
> to the accounts file. Done by lunch.
>
> The methods file is nice for the case file, I suppose. "Weight: amount, not used yet." My reviewer
> would read that and ask why I used the tool at all.

### 6. What I'd have wanted

> On the accounts tab, two columns: "received (USD)" and "sent (USD)", and a third, "received minus
> sent". Sort, top ten, done. With a count of transfers each way next to them so I can see if it's one
> big deposit or forty small ones -- forty small ones in, two big ones out, that's a funnel account.
> And a way to hide merchants in one click, because kind is already a column.
>
> And if the tool wants to call it something fancy underneath, fine, but the header should say
> "money received, March, USD", not "weighted in-degree", and the sentence above the table should say
> "the top 10 by money received are all merchants" -- that would actually be useful, it'd tell me to
> filter.
>
> Honestly, the thing I'd flag hardest: that "top 10 are the same on both measures" line. It reads
> like an answer to exactly my question and it's the wrong answer. Link counts, unweighted, in and out
> mixed. Somebody will send that to a manager.

## Single Ease Question

"Overall, how easy or difficult was this task?" (1 very difficult, 7 very easy)

**2.** "I got the answer. The tool didn't give it to me; Excel did. The only step the tool did was
hand me back my own CSV."

## Would she use this instead of her current tool?

"No. Not for this. This is a pivot table question, and a pivot table does it in minutes, and my
reviewer reads a pivot table. The tool doesn't add up money per account, which is most of what I do.
If the accounts tab had money in and money out as columns, then maybe -- because I could click from
the top account straight to its transfers and see who's feeding it, which Excel can't show me. That
bit would be worth something. Without the totals it's a viewer."

## Moderator notes

- Outcome: she reached the answer only outside the tool (Export table as CSV on the Edges tab, then an
  Excel pivot). Inside the tool she did not get one number she could hand in.
- Workarounds she listed: exported the transfers to Excel to total them; built in and out with two
  pivots and a lookup; joined the accounts file by hand to exclude merchants.
- Nearest wrong answer on screen: the Nodes tab's "degree (total, full graph)" and the line "The top 10
  are the same on both measures, led by ACC-393859". Both count links, not dollars, both merge in and
  out, and the leader is a merchant. She rejected it; a less experienced analyst might not.
- She read "amount not used yet" (Statistics) and "Weight: amount, not used yet; no measure here reads a
  weight" (export methods) correctly, as "the tool cannot sum amounts", and trusted the tool more for
  saying so -- but it also told her to stop trying.
- She never opened a measure by name. Nothing in the Algorithms list is labelled in money words, and
  there is no Degree entry there even though the table shows a Degree column.
- The column menu's "New column" submenu is not drawn in the mock; she expected "total per account"
  there.
- "Nothing is uploaded" in the Export dialog footer was the one line she praised unprompted.
