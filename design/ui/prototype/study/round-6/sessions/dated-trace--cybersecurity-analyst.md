# Session: follow the money forward in time -- Priya, threat hunter

Participant: Priya, senior threat hunter at a regional bank's SOC (persona file
`study/personas/cybersecurity-analyst.md`).

Task as read to her: "Money arrived in the flagged account in early August. Follow where it went
next and tell me whether the order of the transfers makes sense."

Screens used: the alert triage screen (August transfers, 3,000 accounts, 9,171 transfers), the
inspector and the table dock. Everything that matters for this task is on the alert triage screen;
the table dock page is loaded with a novel's character network, not transfers, and she looked at it
for a few seconds and went back.

## Think-aloud

**1. Which account is "the flagged account"?**

"Fifty alerts, sorted by alert id. 'The flagged account' -- there are fifty flagged accounts. I'm
going with the one at the top of the risk column: AL-40122, ACC-365386, structuring, risk 92. If
you meant a different one, tell me. Top bar still says 'Nothing has been sent from this project'
and the rail says Assistant off, nothing is sent. Fine. Same comment as always: it's a mock, it's
not on our list, I'd be doing this with a scrubbed file."

She typed the account id into the search box; it found one node, "personal, US; in Alerts", and
selected it. "Good, search takes an exact id. That's my ground-truth check."

**2. When did the money arrive?**

The inspector shows the attributes with their source files (riskScore from the accounts file,
alertTime Aug 7 02:17 UTC from the alerts file). She opened the Edges tab of the table.

"Edges of the selection, eight rows, sorted by time. That's what I want -- that's basically my
Splunk table. In: 3,479.70 from ACC-916833 on Aug 5 09:09. Out the next day, three transfers
between 15:21 and 17:42, all nine-thousand-something. That's your structuring alert right there.
Times say UTC in the header. Good, everything I have is UTC."

"Footer: Money in 22,670.50, three transfers. Money out 28,321.82, five transfers. That's the whole
month though. I only care about what happened after Aug 5."

**3. Finding a way to say 'forward, after this date'**

"Where do I type the query? There's no box. OK. The thing that pivots is this Neighbors button in
the inspector, so I'll try the arrow next to it."

The menu listed hop counts with sizes (1 hop 9 nodes, 2 hops 283 nodes, 3 hops 2,122) and two rows
underneath, Direction: Both and From: Any time.

"Oh, there it is. Direction and From. I would not have found that in 90 seconds if I hadn't
clicked the caret on the pivot button -- it's two levels in, under a button that looks like it
just does one thing. But it's where I'd look for 'expand', so fine."

She set Direction to Out and From to Aug 6, 2026 ("on or after, on the column time (UTC)").

"It told me which column it's using for the date. Good -- if I had two time columns I'd want to
know. Why did I pick the 6th and not the 5th 09:09? Because it only takes a date. If the money
came in at 23:50 and left at 00:10 I'd be stuck. Can I type a time? 'Pick a date' says no."

"And now the hop rows recount: 1 hop 5 nodes, 2 hops 11, 3 hops 19. Versus 283 at 2 hops with no
direction. That's the thing BloodHound never did for me -- tell me how big it's going to be
before I click. I'll take 2 hops."

She chose Filter to neighbors, 2 hops. The chip read "Filter to ACC-365386 and neighbors, out from
Aug 6, 2 hops: 11 nodes", with Undo.

"That sentence is my query. I can read it back. I want to copy it and paste it into the case, and
I want it to still be there next month. It's a filter step, so maybe it keeps. I'll trust that when
I see it saved."

**4. Reading the trace**

The drawing now has arrows, left to right, the seed on the left, ACC-465572 on the right with
everything pointing into it, and one dashed line with a clock on it. Legend: "alert is true 4",
"earlier than the hop before 1".

"OK, the picture is actually readable. Arrows. Everything drains into 465572. What is that --"
(clicks the node in the table) "-- merchant, category 'Money transfer', money in 119k, money out
zero. That's the cash-out. Of course out is zero, it's a merchant, the file only has our side."

"Dashed one with a clock. Legend says 'earlier than the hop before'. Let me look at the table."

Edges tab: "Filtered graph: 16 of 9,171 edges. Sorted by time; the selection's 4 marked." Columns
source, target, time, amount, sender's hop, time order. Only six rows fit on screen above the
footer; she scrolled for the rest.

Reading it out:

- Aug 6 15:21, 15:44, 17:42 -- the three structured transfers out, "start / starts the trace".
- Aug 8, ACC-898028 pays a pharmacy 157.72. "Noise."
- Aug 10 13:32, ACC-556231 pays 465572 8,396.00, "earlier than the hop before (Aug 21 12:15)".
- Aug 17, 898028 pays 22.88 somewhere. "Noise."
- Aug 19, ACC-274887 sends 9,353.83 to ACC-140044, 9,788.51 to ACC-640034, 9,815.97 to 465572.
- Aug 21, 898028 sends 9,736.88 to 556231, 9,100.93 to 140044, 9,707.38 to 465572; 640034 pays
  465572 9,199.75; 274887 pays 171.85 somewhere.
- Aug 25, 140044 pays 465572 8,299.52.
- Aug 30, the seed pays a streaming service 168.28, also labelled "starts the trace".

"So 556231 paid the cash-out on the 10th, and the money from 898028 only reached it on the 21st.
That one can't be this money. It flagged it and told me the date it was comparing against. That
is exactly the check I would have done by hand in pandas, and it did it in the row. Good."

"'sender's hop' -- took me a second. 1 means the sender is one hop from the seed. I'd have called
it 'hop' and put 0 for the seed. Whatever, it's readable."

"What bugs me: it's one list sorted by time, so the chains are interleaved. To follow 274887's
money I'm reading rows 7, 8, 9, 14 and skipping the others. I want to group by sender, or collapse
by hop. In Splunk I'd sort by sender then time. Can I click the column header to sort by sender?
Probably. Then I lose the time order across hops. I'll live with it."

"And 'in order' on a 22.88 payment is technically true and useless. I need an amount floor --
'only transfers over 1,000' -- on the step, not after. The Aug 30 streaming payment labelled
'starts the trace' is wrong-sounding: it's three weeks later and 168 bucks. It's a first-hop
transfer, fine, but it didn't start anything."

**5. Does the order make sense? The numbers.**

Footer under the table: "Selection ACC-365386, on the full graph -- Money in before Aug 6
3,479.70 USD (1 transfer) -- Money out from Aug 6 on 28,231.01 USD (4 transfers)."

"There it is. That's the real answer and it's the first thing I'd put in the case. 3.5k came in,
28k went out. The timing makes sense, the money doesn't. That account had a balance before
August or there's a funding source that isn't in this file. The August deposit didn't fund the
structuring, it's cover. I'd ask for the statement."

She cross-checked: 9,260.78 + 9,662.37 + 9,139.58 + 168.28 = 28,231.01. "Adds up. Good."

"Now the inspector on the right says Money out 28,321.82. Footer says 28,231.01. Two money-out
numbers on one screen, 90.81 apart. OK -- the inspector is 'on the full graph', and the 90.81 is
the pharmacy payment on Aug 3. But the same panel says '4 neighbors, links in 0, links out 4'
which is the filtered step, and then 'full graph 8 neighbors: in 3, out 5', and then money on the
full graph. Three scopes in one box. I figured it out because I added it up. My lead won't."

"Same problem one hop down, and this is the one that matters. 274887 got 9,260.78 from the seed and
paid out 9,353.83 + 9,788.51 + 9,815.97, about 29k, all 'in order'. 'In order' only means the
dates line up. It doesn't mean it's the same money, and each of these accounts pays out three
times what it got from the chain. The footer does the before/after split for the account I
selected. I want that split on every account in the trace, as a column: in from the chain,
out after it, the difference. Otherwise 'in order' reads like 'same money' and somebody will write
it up that way."

"Also: who reached 140044 first? It got money from 274887 on the 19th and 898028 on the 21st, then
paid out on the 25th, 'in order'. In order against which one? It doesn't say. For 556231 it named
the date. Do it for all of them."

"And the dwell time. The seed moved money in about a day. The second hop sat on it for 13 to 15
days. That's a real change in behaviour and it's the thing I'd want to see first, and I had to
do the subtraction in my head. Give me a 'time since it arrived' column."

**6. Getting it out**

She opened Export on the inspector. Earlier in the same screen the export dialog offered a
findings report (.html) and a CSV with columns source, target, time (UTC), amount (USD), "2 files
go to the download folder. Nothing is uploaded."

"Nothing uploaded, good. But I'd want the CSV of *this* table with the 'sender's hop' and 'time
order' columns, because that's the analysis. If it only gives me source, target, time, amount,
I'm redoing the order check in my notebook, which defeats the point. I couldn't see the dialog for
the trace itself, so I don't know."

**7. Timeline?**

"I asked for a timeline in every session. The Edges tab sorted by time with the hop column is
most of a timeline. The graph with the arrows actually helped for once -- I could see it all
drains into one merchant. I'd still want the same thing laid out left to right by date."

## Her answer to the task

"On Aug 6 the money went from ACC-365386 to two personal accounts (ACC-274887, ACC-898028) and
straight to ACC-465572, a money-transfer merchant. The two personal accounts held it 13 to 15 days
and on Aug 19 and 21 paid it on: to 465572 directly and through ACC-140044 and ACC-640034, which
paid 465572 again on Aug 21 and 25. Everything ends at 465572. The order makes sense for a
layering chain -- with two exceptions. ACC-556231's 8,396 to 465572 on Aug 10 happened before the
chain's money reached it on Aug 21, so it isn't this money. And the amounts don't line up: 3,479.70
came in before Aug 6 and 28,231.01 went out after, and each hop-1 account sends out about three
times what it got from the chain. The timing fits. The money doesn't. Somebody needs the statement."

## Single Ease Question

**5 out of 7.**

"The dated, directional pivot with the counts before I commit, and the row that says 'this one
happened before its money arrived, here's the date' -- that's genuinely good, and it's the first
time one of these tools answered 'in what order' instead of drawing me a hairball. It loses points
because I had to find Direction and From two levels into a caret, there's still no box to type
the query into, the date filter has no time, three different scopes are mixed in one inspector,
and 'in order' only checks dates when the question was whether it's the same money. I did the
amount check by hand."

## Would she use this instead of her current tool?

"Instead of? No. Splunk finds the transfers and my notebook does the maths, and that isn't
changing. Alongside, for this -- following something hop by hop in time order -- yes, I'd use it
if it were on the approved list, because the ordering check and the before/after footer saved me
the pandas I'd normally write. It's the same shape as lateral movement: account, host, host, in
time order. If it let me type the query, gave me the in/out split per account and exported the
trace table with its order column, I'd put it on my second screen."

## Problems she hit

- Direction and From are two levels deep in the Neighbors caret; she found them only because the
  pivot button was the obvious place to click. No typed query. (severity 3)
- From takes only a date, not a time; a same-day pass-through cannot be separated. (severity 2)
- The trace table sorts every chain by time into one list, so one account's onward transfers are
  scattered; she wanted grouping by sender or by hop. (severity 2)
- "In order" checks only dates. It does not say which incoming transfer it compared against for an
  account reached twice (ACC-140044), and it does not check amounts, so it reads like "same money"
  when each hop-1 account pays out about three times what it got. (severity 3)
- The inspector mixes three scopes in one section: step counts ("4 neighbors"), full-graph counts,
  and full-graph money that differs from the table footer (28,321.82 against 28,231.01).
  (severity 3)
- Small payments (22.88, 157.72, 168.28) sit in the trace labelled "in order" or "starts the trace";
  no amount floor on the step. The Aug 30 streaming payment labelled "starts the trace" misreads.
  (severity 2)
- No dwell-time column; she did "13 to 15 days" in her head. (severity 2)
- She could not see whether the export of the trace keeps the sender's hop and time order columns;
  the export dialogs elsewhere on the screen list only source, target, time and amount.
  (severity 2)
- The table dock showed six of sixteen rows before the footer at her window size; she scrolled.
  (severity 1)
- "The flagged account" was ambiguous with fifty alerts; she picked the highest risk. (severity 1,
  a task-wording issue rather than the design)

## What pleased her

- The hop rows recount with Direction and From before she commits: 11 accounts, not 283.
- The filter chip reads back her query as a sentence she can check.
- The dashed, clock-marked transfer and its row naming the date it was compared against.
- The footer that splits money in before the date against money out after it; it added up.
- Arrows on the drawing made the drain into one merchant visible at a glance.
- Times labelled UTC everywhere; the date filter names the column it uses.
