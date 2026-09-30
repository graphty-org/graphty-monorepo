# Session: bring in March's transfer export and say whether it is what you think -- Dana, supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst at an industrial equipment maker (simulated;
see ../../personas/supply-chain-analyst.md). Excel and Power BI every day, not a network
scientist, skips graph-theory words, reads tables carefully. A bank's case system is not her
world; she reads the transfers the way she reads an accounts-payable payment run: who paid whom,
how much, when.

Task as given by the moderator: "Your bank's case system just exported March's transfers as a
spreadsheet file. Bring it in, and tell me whether what you are looking at is what you think it
is."

Screens seen, in order, as the participant sees them (design notes hidden):

- the start screen and the Excel file refused: shots/record/r6-dana-lac-transfers-not-read.png
- the load step on the CSV, two issues: shots/screens__load-transfers.png (the page's own state
  strip cropped out of her view), and at laptop size shots/record/r6-dana-lac-transfers-ready-1280.png
- the amount choice opened: shots/record/r6-dana-lac-transfers-amount-policy.png
- after Load, with the "higher number means" question open: shots/record/r6-dana-lac-transfers-loaded.png
- the Data panel after the first load: shots/screens__data-panel.png

## Before she touches anything

> "First question, same as always: where does this file go when I open it? It's a bank's
> transfers, so it's worse than my supplier list. ... I don't see anything on this start screen
> that tells me. 'Open a graph'. Graph. OK, so this is a chart thing. 'Recent: February
> transfers'. 'Open...'. There's no 'Import', but Open will do."

## First attempt: the spreadsheet

> "You said spreadsheet, so I take the spreadsheet. transfers-2026-03.xlsx. Open."

(The step shows "Could not open transfers-2026-03.xlsx: Excel workbooks are not read." and
"In Excel, save the sheet as CSV (File, Save As, "CSV UTF-8"), then open that file. Nothing in
graphty has changed." with Cancel and Choose another file...)

> "Well. Everything I own is an xlsx. That's strike one -- I give a tool two. ... To be fair it
> tells me exactly what to do, and 'CSV UTF-8' is the right one, the plain CSV mangles our German
> supplier names. And 'nothing has changed', good, it didn't half-load something. But I have to
> leave the tool, open Excel, Save As, and come back, for every file, every month. Power BI eats
> xlsx. Why can't this?"

> "Saving it now. ... Hm. When Excel saves it as CSV it writes the amounts the way they're
> formatted on screen, dollar signs and commas. Let's see if this thing chokes on that."

## Second attempt: the CSV

> "Opened. OK, a big box. Left side: Format, 'CSV, comma, header row'. Source column
> from_account, target column to_account. It picked those itself. Good, those are the right two
> -- money goes from, to. If it had picked amount as the target I'd have closed it."

> "'Id column: None: ids are the account names'. They're not names, they're account numbers,
> ACC-something. Fine, I know what it means."

> "Issues, two. Yellow. First one: 'amount is written as currency text'. Ha. Told you. 'All
> 9,113 values carry a dollar sign...' -- I read the first line. And the box under it already
> says 'Read as Currency (USD): 9,113 weighted edges'. So it spotted it and fixed it. That is
> honestly the thing Gephi never did; it would've read those as text and not said a word."

She opens the amount choice.

> "Two options. 'Read as Currency (USD)... "$1,240.00" becomes 1240. Total $14,156,522.28.
> Every value kept.' -- oh, now THAT I like. A total. I can put SUM on the amount column in
> Excel and if it says fourteen million one fifty-six five twenty-two twenty-eight, I believe
> everything else on this screen. That's a control total, that's how we check every ERP load.
> Why is it hidden inside a dropdown, though? It should be sitting on the screen where I can see
> it without clicking. I only found it because I was nosy."

> "Other option, 'Keep as text: unweighted edges, measures that use weights treat every transfer
> as equal.' No. Currency, obviously."

> "Second issue: '412 extra parallel edges'. Parallel edges. I don't know what that is. Next line:
> 'Some pairs of accounts made more than one transfer; 412 rows repeat a pair already read.'
> OK -- that's just the same payer paying the same payee twice in a month. That's normal. In AP
> that's every monthly invoice. Default is 'Keep all: 9,113 edges'. So one per row. Fine,
> leave it. ... There's a little 'i' next to it; I'm not hovering on that."

> "Then the sample, first five of 9,113 rows. Account, account, amount 'as written', timestamp.
> $5.04, $8.97, $349.71. There's a yellow bar down the amount column, that's the 'marked in the
> sample' I suppose. It says the ones over a thousand have commas, but none of these five are over
> a thousand, so I can't actually see one of the problem rows. Show me a row with $1,240.00 in
> it, that's the one I'm worried about."

> "The grey small print under the column names, 'as written', 'date and time' -- I need my
> glasses for that. Same with the explanation lines under each issue, they're light grey and
> small."

> "Bottom: 'What will load. nodes 3,000, edges 9,113, rows dropped 0.' Nodes and edges. So,
> accounts and transfers, I'm guessing. 9,113 rows in, 9,113 out, zero dropped. That's the number
> I'd check first. Good. 3,000 accounts -- I'd have to pivot on both columns in Excel to check
> that, but it's believable."

> "On the laptop -- we do these in meetings -- the box runs off the bottom of the screen and I
> can't see the Load button. I'd have to know to scroll, or zoom out, and I keep the browser at
> 110 percent."

(At 1280 x 720 the dialog's footer, with Load, Cancel and Filter at import..., is below the
window edge.)

> "Load."

## After the load

> "OK. Grey honeycomb blob in the middle. Is that a map? A heat map of... something? It's
> darker on the right. There are no names on anything. That picture tells me nothing about
> whether this is my data. Nice hairball, again."

> "Right side, 'Statistics'. nodes 3,000, edges 9,113, same as before, good. 'components 1',
> 'isolated 0' -- I don't know those words. 'density 0.00101'. No idea. 'average total degree
> 6.08'. 'highest total degree 907'. ... Degree. Is that 907 transfers on one account? If one
> account has 907 of 9,113 transfers, that's ten percent of everything, that's the first thing I'd
> want to see. Who is it? It doesn't say which account. I can't click the number. In Excel that's
> a COUNTIF and a sort and I have the name."

> "'Last import: 9,113 rows, 0 dropped'. '412 parallel edges, kept'. OK, it remembered what I
> told it. Good. But where's my fourteen million? The total was the best check on the whole
> screen and it's gone now. I'd want that on this list: rows, dropped, total amount."

> "'Directed; amount, not used yet.' ... Not used yet? Two minutes ago it said '9,113 weighted
> edges' and the role said Weight. Now it's not used. So did it read my amounts or didn't it?
> That is exactly the kind of thing that makes me stop trusting the rest."

> "'For amount, a higher number means' -- Not answered. Let me open it. 'a closer or stronger
> link, similarity'. 'a longer or costlier step, distance'. 'more can pass through, capacity'.
> 'Don't use amount'. ... Money. A bigger transfer means more money moved through that pair.
> 'More can pass through' -- that's volume, that's throughput, that's the capacity of a lane.
> That's the one. Capacity."

(She chose capacity. The flow expects similarity for this data; nothing on the screen told her
either was wrong, and nothing asked again.)

> "It took it. No complaint. So I guess that was right? I have no way to know if I just changed
> every number after this."

## The Data panel

> "There's a 'Data' button on the left, let me see if there's a table in there. ...
> 'transfers-2026-03.csv, 9,113 rows, one edge each; repeat pairs are not merged.' Oh, that's
> better English than the other side. 'from_account: where each transfer starts', 'to_account:
> where each transfer ends'. 'amount, numbers, USD. Weight: amount, not used yet. A run that can
> use it asks what a larger amount means.' ... So it's still saying 'not used yet' here, and I
> just answered the question on the other side. Or does this screen come before I answered?
> Either way, two places, two wordings."

> "And on this side the summary says 'accounts 3,000, transfers (rows) 9,113'. Accounts and
> transfers! Why does this side speak English and the Statistics side says nodes and edges?"

> "I don't see a table of the rows themselves. I want to see my 9,113 rows, sorted by amount,
> biggest first, so I can see the top one matches the top one in Excel. That's how I check a
> load."

> "Top left it says 'Nothing has been sent from this project' and the left strip says
> 'Assistant Off. Nothing is sent.' That's what IT will ask. I'd have liked to see that BEFORE I
> handed it the bank file, not after."

## Is it what she thinks it is?

> "Mostly yes. Nine thousand one hundred and thirteen transfers in, none dropped, amounts read as
> dollars, repeat payments kept as separate payments. That part I believe, and the currency catch
> is genuinely good. What I can't say is anything about the shape of it -- the blob doesn't tell
> me, 'highest degree 907' doesn't say who, and I'm not sure whether amount is being used or
> not, or whether I just told it the wrong thing about what amount means."

## Single Ease Question

> "Five. Getting the file in: easy once I'd done the Save As, and it caught the dollar signs.
> Checking it: harder. I had to guess at two words and one question."

SEQ: 5 of 7.

## Would she use this instead of her current tool?

> "Instead of Excel for checking a load? No. A pivot and a SUM tell me the same thing in ten
> minutes, and I can see the rows. It won't even open my xlsx. And I still don't know if IT will
> sign off -- it says nothing is sent, which is good, but I'd need that written down for the
> security review, not just a line on the screen. What it beats Excel on is the dollar-sign
> catch and the running total before it loads; if that total stayed on the screen after loading
> and I could click the 907 to see who it is, I'd use it as the first step before whatever I do
> next. Side tool, for now."

## Observed problems

1. The best trust check on the screen, the total amount ("Total $14,156,522.28"), is only inside
   the closed amount dropdown in the load step and does not appear anywhere after Load. She found
   it by accident and looked for it afterwards on the Last import row.
2. The load step says "9,113 weighted edges" and sets amount's role to Weight; after Load the same
   column reads "amount, not used yet". She read this as a contradiction and it cost her trust.
3. "For amount, a higher number means": for money she chose "more can pass through (capacity)",
   not "a closer or stronger link (similarity)". The tool accepted it silently. None of the four
   options is worded in terms of money moved.
4. The Excel workbook is refused. The message is clear and correct, but for an analyst whose
   every export is xlsx it is a failed attempt, every month.
5. Statistics after Load uses nodes, edges, components, isolated, density and degree; the Data
   panel overview says accounts and transfers (rows). "highest total degree 907" names no account
   and cannot be followed to one.
6. At a 1280 x 720 window the load dialog's footer, with Load, falls below the window edge.
7. The first five sample rows contain no amount over a thousand, so the commas the issue warns
   about are never shown in the sample.
8. Where the data goes is stated only after the load ("Nothing has been sent from this
   project"), not on the start screen or the load step, which is where she asked.
9. The hex-binned grey canvas with no labels read to her as possibly a heat map of geography and
   told her nothing about her data.
10. Small light-grey text: the issue explanations and the "as written" / "date and time"
    sub-headers in the sample.
11. "parallel edges" in the issue heading; she understood only from the plain second line.
