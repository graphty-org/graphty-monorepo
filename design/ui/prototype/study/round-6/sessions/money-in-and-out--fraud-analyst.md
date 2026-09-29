# Session: money in against money out -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator (persona: `../../personas/fraud-analyst.md`).
Task as read by the moderator, and nothing more: "Your manager wants the ten accounts in the March
transfers that take in far more money than they send out, with the amounts, by end of day."

Mode: not mandated. Nobody said the tool was required, so Sarah uses it as long as it earns the time
and then goes back to what she knows. The deadline (end of day) was part of the task. She did this
same task on an earlier version of these screens, where the tool could not total the amounts and she
finished it in Excel; she remembers that.

Gate check (moderator): the task runs only if every money screen shows the money totals. The
transfers screens show them in three places -- the table's New column menu and its money columns,
Quick actions when you type "money", and the inspector's Totals for one account. The frame at rest
shows no totals, but it shows no measure of any kind, so the task ran.

Screens she saw, as a participant sees them (design notes hidden):

- the main frame at rest on the March transfers: `../../../shots/r6-sarah-mio-far.png`
- run a measure and read it: `../../../shots/r6-sarah-mio-rr-money.png` (typing "money"),
  `../../../shots/r6-sarah-mio-rr-money-read.png` (Money in, run and read),
  `../../../shots/r6-sarah-mio-rr-catalog.png`, `../../../shots/r6-sarah-mio-rr-done.png`
- the results in the side panel: `../../../shots/r6-sarah-mio-rp-finished.png`,
  `../../../shots/r6-sarah-mio-rp-in-the-table.png` (both on the protein example)
- the bottom table, every state: `../../../shots/r6-sarah-mio-tdF-header.png` (the whole page)
- the inspector: `../../../shots/r6-sarah-mio-in-flagged.png` (one flagged account),
  `../../../shots/r6-sarah-mio-in-one-node.png`

## Transcript

### 1. The frame at rest

> "Transfers, March 2026." 3,000 accounts, 9,113 transfers. Same extract as last time. Grey blob of
> hexagons. Ignoring it.
>
> Right side still says "direction followed, amount not used yet." Last time that sentence was the
> answer -- the tool couldn't add up money. So either that's still true, or this line is out of date.
> I'll find out. It would be nice if the sentence told me there was something to do with the amount,
> instead of just that nothing's been done with it.
>
> Bottom strip: "Table, 3,000 nodes, 9,113 edges (rows)." I go to the rows first. Always.

### 2. The table, and the New column menu

> Nodes tab. id, kind, country, community, then "degree (total, full graph)" and PageRank. And that
> sentence is still up there: "The top 10 are the same on both measures, led by ACC-393859." That's
> the one I complained about. ACC-393859 is the big merchant. That line still reads like an answer to
> my manager's question and it isn't one. Link counts. Moving on, but I'm noting it.
>
> Last time "New column" had an arrow and nothing behind it. Let's try it again on the degree column.
>
> Oh. It opens now. "Money in -- Sum of amount on transfers in, USD." "Money out -- Sum of amount on
> transfers out, USD." "Money in minus out -- Money in less money out, USD." And then, separated,
> "Links in (count) -- Transfers in, counted, not summed." "Links out (count)".
>
> Okay. That's exactly the three columns I asked for. And they've split the counts off and said "not
> summed", so nobody mixes up forty transfers with forty thousand dollars. Good. That's the pivot.
>
> I'd have looked for this on the amount column on the Edges tab, honestly, not on the degree column
> of the accounts. But it's the same menu on every column, so I'd have found it either way.

### 3. Reading the money columns

> I add all three. The screen they show me has them on the fourteen flagged accounts I had selected,
> sorted by Money in. Header: "Weighted degree -- sum of amount (USD), full graph." I don't know what
> weighted degree is and I don't care; the words under it say sum of amount, USD, full graph. That I
> can put in the file.
>
> Links in, Links out, Money in, Money out, Money in minus out, side by side. ACC-753261: 6 in, 6 out,
> 31,092.12 in, 28,955.61 out, net 2,136.51. That's a pass-through. Money in, money out the same
> week, keeps a couple of grand. Actually for my ring cases that's more interesting than the task --
> but it's not what my manager asked for.
>
> And there's a total at the bottom: "Sum of Money in, 14 rows: 340,978.02 USD. Money out
> 400,931.03 USD. Money in minus out -59,953.01 USD." Excel's status bar, finally. I'd use that in a
> narrative -- "the fourteen accounts received X and sent Y."
>
> The range under Money in minus out says "-69,007.50 to 440,783.97" for the full graph. 440,783.97
> in and nothing out -- that's going to be ACC-393859, the merchant, I'd bet money on it.

### 4. The whole graph, not my fourteen

> The task is all 3,000 accounts, not my flagged ones. The scope line says "Selected: 14 nodes. Show
> filtered graph." So I click Show filtered graph to get every row back, and I assume my three new
> columns stay. Then sort Money in minus out, descending.
>
> [Moderator note: that exact state -- all 3,000 rows with the money columns, sorted by net -- is not
> drawn. The Money in run below shows the same thing for Money in.]
>
> I also tried it the other way, from the search. Quick actions, typed "money". "Money: sums of
> amount, in dollars." Run Money in, Run Money out, Run Money in minus out -- "What each account kept:
> in less out." Then "Counts of transfers, not money." That's in words I use. I'd run Money in minus
> out.
>
> "Kept" is the wrong word, by the way. The account didn't keep it, it had it in and didn't send it
> out in March. It could have been withdrawn in cash, or paid a card. "Net received" is what I'd write.
> If that word went into a SAR a reviewer would circle it.

### 5. What the run gives me

> The screen they have is Money in, not minus out, but I read it. Left panel: "Money in, Sep 29 10:31.
> On: full graph, 3,000 accounts. Sum of amount, in dollars, on the transfers into each account.
> Directed. CPU." Top accounts: ACC-393859 $440,784, 907 links in. ACC-697114 $241,450, 522 links in.
> ACC-893168 $149,438, 37 links in, #37.
>
> And then a sentence: "ACC-893168 is #3 by money in and #37 by Links in (count): 37 transfers, fewer
> and larger." Now that's a useful sentence. That's the kind of thing I'd write myself. Fewer and
> larger is a pattern I look for.
>
> Table underneath: id, kind, Money in, Links in, rank by Links in. kind -- every one of the top six
> is "merchant". I said this last time. Merchants take in money and don't send it. Sort by net and
> the top ten is the sixty merchants' top ten. My manager doesn't want the supermarket.
>
> Amounts are rounded to the dollar here -- $440,784. In the table they built earlier it was
> 440,783.97. For my manager, dollars are fine. For the file I want the cents, and I'd want to know
> which one the export writes.

### 6. Getting the merchants out

> kind is a column right there. Column menu on kind, "Filter to...", pick personal and business, or
> "not merchant". I'd expect a list of the three values with tick boxes. Or click the merchant part
> of the little bar under the header.
>
> [Moderator note: the kind filter is not drawn. The column menu offers "Filter to..." on every
> column, and the Full graph button at top left opens filter steps, so both routes exist; what the
> filter looks like for a text column is not shown.]
>
> Assuming that works: filter out merchants, sort by Money in minus out, top ten. Each row with Money
> in, Money out, the net, and the counts either way so I can see forty small ones in and two big ones
> out. That's the table I asked for last round, word for word.
>
> "Far more" -- my manager's words. Net is one way. The other is in divided by out: an account that
> takes 12,000 and sends 200 is "far more", and one that takes 300,000 and sends 250,000 is a bigger
> net but it isn't "far more", it's a busy account. There's no ratio column in the menu. I'd look at
> the two columns side by side and eyeball it, or do the ratio in Excel. Not a deal breaker, but it's
> the second thing I'd reach for.

### 7. One account, and getting it out

> Clicked one of the flagged accounts, ACC-365386. Right side: flagged true, alert rule
> "Structuring: 3 or more transfers of 9,000 to 9,999 USD out in 30 days", risk score 92 "from
> accounts-2026-03.csv, not computed by graphty: the bank's own score". Good, I know whose number it
> is. Connections: Transfers In 3, Out 5. Totals: Money in $19,449.22, Money out $28,587.48, "summed
> by graphty from transfers-2026-03.csv." So I can check any row in the table against one account.
> That's the traceability I need for the reviewer.
>
> Export. On the table I've built, there's "Export table..." at the right of the tabs. On the run's
> table it was a "..." instead. I'd find it, but I'd look twice. Last time the export dialog said
> nothing is uploaded and wrote a methods file beside the CSV. If the methods file now says "Money in
> minus out: sum of amount in, less sum of amount out, USD, full graph, merchants filtered out", that
> goes straight into the case file and my reviewer doesn't ask why I used the tool.
>
> And I'd open the CSV in Excel anyway, to check the top three against a pivot. First time with any
> tool, I check. If they match, next month I don't.

## Single Ease Question

"Overall, how easy or difficult was this task?" (1 very difficult, 7 very easy)

**5.** "It does the pivot now. Money in, money out, net, with the counts beside them, in dollars, and
it says what it summed. I lost points on the merchants -- I had to know to take them out, and the
screen that ranked them didn't warn me -- and on 'far more', which it can't do as a ratio. And
'kept' is the wrong word. But I'd have the ten by lunch, not by end of day."

## Would she use this instead of her current tool?

"For this question, yes -- if IT approved it, which isn't my call. It's quicker than two pivots and
a lookup, and I can click from a number straight to the account and its transfers, which Excel can't
do. Instead of Excel, no. Excel's where the reviewer reads it. I'd use this to find the ten and
export them, and the export goes into Excel. That's fine. That's what a tool should do."

## Moderator notes

- Outcome: success inside the tool, with one guessed step. She built the answer from the table
  (New column, Money in / Money out / Money in minus out, sort) and from Quick actions ("money"). The
  kind filter that removes merchants is not drawn; she assumed the column menu's "Filter to..." would
  do it.
- Compared with the earlier round, where she finished in Excel: the New column submenu, the money
  names, the "counted, not summed" split, the footer sums and the inspector's Totals were each
  noticed and used. She said the three columns were "word for word" what she had asked for.
- Still on screen and still misleading: the line "The top 10 are the same on both measures, led by
  ACC-393859" above the transfers table, which ranks by link count and PageRank, in and out mixed,
  led by a merchant. She passed it again and flagged it again.
- "Amount not used yet" on the frame's Statistics stays true until she runs something, but it gave
  no hint that money measures exist. Last round the same line told her to stop looking.
- Merchants: the Money in run's top rows are all kind = merchant, and nothing on the result says
  so. She wanted a sentence like "the top 10 by money in are all merchants", as she asked last round.
- "What each account kept: in less out" -- she objected to "kept"; the net says nothing about what
  the account still holds. Her word: "net received".
- No ratio (money in divided by money out). For "takes in far more than it sends" she would reach
  for it second, after the net.
- Amounts round to whole dollars in the run's panel and table ($440,784) but show cents in the
  built columns (440,783.97). She asked which one the export writes.
- On the run's table the export is behind "...", not the "Export table..." label the other tables
  show; she found it but looked twice.
- She would still check the first result against an Excel pivot, once.
