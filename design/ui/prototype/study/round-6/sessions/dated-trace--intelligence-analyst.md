# Where did the August money go, and does the order make sense -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (i2 Analyst's
Notebook, Excel, bank subpoena returns). Persona: study/personas/intelligence-analyst.md.

Task as the moderator read it: "Money arrived in the flagged account in early August. Follow where
it went next and tell me whether the order of the transfers makes sense."

Screens worked: the alert triage screen (the queue, the account's own transfers, the Neighbors
options menu, the dated two-hop trace), the inspector, and the bottom table. Renders as the
participant saw them, design notes hidden: shots/record/r6-marcus-dated-alert-triage.png,
shots/record/r6-marcus-dated-inspector.png, shots/record/r6-marcus-dated-table-dock.png.

## Think-aloud

**1. The opening screen.** "August alerts, a transfers file, fifty alerts. The picture in the middle
is a grey honeycomb with orange diamonds on it. That's not a link chart, that's a weather map. Fine,
I'm not going to read three thousand accounts off a picture anyway. The table underneath is what I'd
actually use: alert id, account, the scenario, a risk score. 'Nothing has been sent from this
project' up top -- good, that's the first thing I'd have asked. I'd still want IT's paperwork, not a
line of text, but at least it's saying it."

"Which one is flagged? The task says 'the flagged account'. Scrolling the queue... AL-40122,
ACC-365386, 'Structuring: 3 or more transfers of 9,000...' and a risk score of 92, highest one I can
see. That's my guy. If there were two structuring alerts I'd be asking you which one."

**2. The account's own transfers.** "Clicked the account, went to the Edges tab. Eight rows, sorted
by time, source and target and time and amount. This is the bank return, basically, and that's what
I want to see first before any picture.

- Aug 3 07:21, out, 90.81 to ACC-597001. Pocket change, the pharmacy.
- Aug 5 09:09, IN, 3,479.70 from ACC-916833. That's the money that 'arrived in early August'.
- Aug 6 15:21, 15:44, 17:42: three out, 9,260.78, 9,662.37, 9,139.58. Three transfers just under
  ten grand inside two and a half hours. That's the structuring alert, textbook.
- Aug 17 and Aug 24, two more in, about 9,800 and 9,300.

Hang on. Thirty-five hundred comes in on the 5th and twenty-eight thousand goes out on the 6th? Where
did the other twenty-four and a half come from? The footer's already telling me: money in 22,670.50,
money out 28,321.82 for the month. So either he had a balance sitting there on Aug 1, or cash went
in over the counter and isn't in this file. First thing I'd write down: this file doesn't explain
the source of the Aug 6 money. I need the full statement."

"The dates have no year and no seconds. 'Aug 6 15:21'. For a chart that's fine; for the exhibit I
need the full timestamp and the bank's transaction reference so I can point at the line on the
subpoena return. I don't see a reference column anywhere. Every line on the chart, I have to say
where it came from."

**3. Following it out.** "Now where did the Aug 6 money go. There's a Neighbors button on the right.
I clicked it -- the tooltip says 'filter to neighbors, 1 hop'. That gives me everybody he touched,
both directions, all month. Nine accounts. That's not the question; I want out, and after the money
came in. Is there a way to just say 'out, after this date'? ... There's a little arrow next to
Neighbors. Opened it."

"OK, this menu is actually what I wanted. 'Hops from ACC-365386', then a size for each hop, then
Direction and From. Set Direction to Out. From: 'Any time', or a date, 'on or after, on the column
time (UTC)'. I'd have picked Aug 5, the day it landed, but there's nothing going out between 09:09
on the 5th and the 6th anyway, so Aug 6 gets the same answer. I'd rather give it a time than a day,
though -- on a busier account 'on or after Aug 5' would pull in stuff from before the deposit that
morning."

"The hop line reads '1 hop, 5 nodes, 6 edges. Its 4 transfers out from Aug 6 on, and the transfers
among the accounts they reach.' Four transfers out -- I counted three on the 6th. Must be one later.
And 6 edges versus 4 transfers, the sentence explains that, I guess: it's counting transfers between
the people he paid. Nodes and edges. They're accounts and transfers. 2 hops, 11 accounts. 3 hops, 19.
Before I set the options it was 283 at two hops, so the date and direction are doing real work.
Filter to neighbors, 2 hops."

**4. The trace.** "Now it draws. Eleven accounts, flat, arrows on the lines, left to right. That's
more like it. My guy on the left, the three he paid in the middle-ish, and everything piles into
ACC-465572 on the right. Diamonds are the alerted ones, grey dots are the rest. I don't know from the
dot that 465572 is a money transfer business -- in i2 that'd be a different icon and I'd see it
instantly. Had to go back to the node table to find out it's a merchant, 'Money transfer', a hundred
and nineteen thousand in and zero out. That's the collection point. That's the account I'm writing
the next subpoena for."

"There's one dashed line with a little clock, 556231 to 465572, and the legend says 'earlier than
the hop before'. Now the table."

"Edges tab, sorted by time, with two new columns, 'sender's hop' and 'time order'.

- The three Aug 6 transfers out of 365386, 'start, starts the trace'. The fourth start row is at the
  bottom: Aug 30, 168.28 to ACC-512219. Header says 'the selection's 4 marked' and I only saw three
  highlighted until I scrolled. Small change, ignore it.
- 898028 to the pharmacy Aug 8, 157.72; to 453831 Aug 17, 22.88. Groceries. Noise.
- 556231 to 465572, Aug 10, 8,396.00, 'earlier than the hop before (Aug 21 12:15)'. Right --
  556231 didn't get anything from 898028 until the 21st, so what it sent on the 10th can't be our
  money. Good. That's exactly the thing I'd have missed by eye on a chart, and it tells me the date
  it's comparing against, so I can check it.
- Aug 19, 274887 sends 9,353.83 to 140044, 9,788.51 to 640034, 9,815.97 to 465572, all in about
  three hours. Same pattern as my guy: three just under ten.
- Aug 21, 898028 sends 9,736.88 to 556231, 9,100.93 to 140044, 9,707.38 to 465572.
- Aug 21 640034 to 465572, 9,199.75; Aug 25 140044 to 465572, 8,299.52. Second hop, both into the
  same collection account."

"So does the order make sense? The sequence does: deposit on the 5th, broken into three
under-ten-grand pieces the next afternoon, the two personal accounts that got pieces sit on it about
two weeks, then each of them does the same three-way split on the 19th and 21st, and the second-hop
accounts forward into 465572 within a few days. That's layering into a money transfer business,
and the timing is in the right direction for every link except the one the tool dashed out."

"But the amounts don't. My guy received 3,479.70 and paid out 28,062. 274887 got 9,260 from him and
paid out almost 29,000 on the 19th. Every mule is putting out three times what came from upstream.
The footer does that split for my guy -- 'money in before Aug 6: 3,479.70, 1 transfer; money out
from Aug 6 on: 28,231.01, 4 transfers' -- and I like that, it's the sentence I'd put in my report.
I want that same line for every account on the trace, next to its row. Right now I'm doing
274887's sums in my head, and I'll get one wrong in front of a sergeant."

"And 'in order' -- I'd be careful. It means the transfer is later than the one that reached that
account. It doesn't mean it's the same money. With every account putting out three times what it
got, it clearly isn't all the same money. A prosecutor reads 'in order' as 'traced'. I'd want the
column to say 'after the transfer in' or something that can't be read as proof. And there's no
tooltip on 'sender's hop' or 'time order' telling me what they check -- I worked it out from the one
dashed row."

**5. The right-hand panel on the trace.** "The panel says 'Connections: 4 neighbors, links in 0,
links out 4', then 'full graph: 8 neighbors, in 3, out 5', then money in 22,670.50. Links in zero,
money in twenty-two thousand. I get it -- the zero is the filtered picture, the money is the whole
month, and it does say 'on the full graph' in small print. But that's two different pictures in one
box. 'Side panel said 212, I counted forty.' Same smell."

**6. The inspector screen.** "Separate screen, same account number, ACC-365386. This one says
Transfers, March 2026, country GB, money in 19,449.22, alert time 2026-03-09. On the triage screen
it's August, country US, money in 22,670.50. If that's the same account, one of these is wrong. If
it's a different project, then give it a different account number, because I just spent a minute
thinking the tool mixed two months. The table screen writes times as '2026-03-29 21:09:09' with the
year and seconds -- that's the format I want on the trace too. Pick one."

**7. What I'd tell the sergeant.** "Money in: 3,479.70 from ACC-916833, Aug 5 09:09. Next
afternoon ACC-365386 sends 28,062.73 out in three pieces just under 10,000 to ACC-274887,
ACC-898028 and ACC-465572. The first two do the same split on Aug 19 and Aug 21 and everything lands
in ACC-465572, a money transfer business with 119,109 in and nothing out. The order is consistent
with layering; the amounts are not consistent with one deposit, so there's a source of funds we
haven't got -- pull the full statements for 365386, 274887 and 898028, and subpoena 465572. The
Aug 10 transfer from ACC-556231 is not part of this; it predates the money reaching that account."

## Single Ease Question

**5 of 7.**

"Once I found the arrow next to Neighbors, it was two settings and a click, and the table did the
part I'd normally do in Excel with a pivot and a sort: time order, which hop, and a flag on the one
transfer that's out of sequence. That flag is the thing I didn't have to do by hand. It loses points
because the main Neighbors button gives me the wrong question first (both directions, all month), I
had to do every mule's in-versus-out by hand, the dates have no year and no transaction reference,
and the same account number shows up with a different country on another screen."

## Would I use this instead of what I use now?

"Instead of i2? No. It doesn't open my .anb, it doesn't put a phone on the phones, and there's no
timeline chart with theme lines. For a bank return like this one -- trace the money forward from a
date and tell me which links are out of order -- yes, I'd use it beside i2 and instead of the Excel
pivot, if the department can run it on its own server and IT signs off. The dated trace is the first
thing in this tool that does something Excel doesn't do in two minutes."

## Problems found

| Where | What | Severity (1 low - 4 blocks) |
|---|---|---|
| Alert triage, trace table | The in-versus-out split is only for the selected account; each mule's own money in before its first outgoing transfer versus money out is missing, so the "amounts don't reconcile" finding is mental arithmetic | 3 |
| Inspector vs alert triage | ACC-365386 is August, country US, money in 22,670.50 on one screen and March 2026, country GB, money in 19,449.22 on the other | 3 |
| Alert triage, trace table | "in order" reads as "same money, traced"; it only means later than the transfer that reached the sender. No tooltip defines "sender's hop" or "time order" | 2 |
| Alert triage, Neighbors button | The main Neighbors click filters 1 hop, both directions, any time; Direction and From live only under the small arrow beside it | 2 |
| Alert triage, trace table | Times shown as "Aug 6 15:21": no year, no seconds, no bank transaction reference; the table screen shows full timestamps | 2 |
| Alert triage, trace panel | Connections box mixes the filtered view (links in 0) with full-graph money (22,670.50 in) in one block | 2 |
| Alert triage, Neighbors menu | From takes a day, not a time; the money arrived at 09:09 and the boundary can only be a whole day | 1 |
| Alert triage, trace drawing | A money transfer business draws as the same grey dot as a person; entity type only visible in the node table | 2 |
| Alert triage, trace table | "the selection's 4 marked" but only 3 visible until scrolling to Aug 30 | 1 |
