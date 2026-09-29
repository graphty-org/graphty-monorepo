# Where did the money go next, and does the order make sense -- Dana, supply chain risk analyst

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker. Lives in
Excel and Power BI; has tried Gephi and a Power BI network visual and dropped both. Not a network
scientist, and not a financial-crime investigator either. Mild presbyopia; small grey labels are a
real problem for her.

**Task as given by the moderator:** "Money arrived in the flagged account in early August. Follow
where it went next and tell me whether the order of the transfers makes sense."

**Screens seen, in order:** the "August alerts" project opened on a saved set of 9 accounts
("Referred AL-40122") with a reviewer's note; one account (ACC-365386) selected with its Neighbors
menu open; the same menu with Direction set to Out and a From date; the result, a filtered picture
of 11 accounts with arrows and a table of 16 transfers in time order; a Path tool screen from the
same account to another; then the separate inspector and table pages, which are on other data.

Renders the participant looked at:
- `../../../shots/alert-triage/case-open.png`
- `../../../shots/alert-triage/case-menu.png`
- `../../../shots/alert-triage/case-trace-menu.png`
- `../../../shots/alert-triage/case-trace.png`
- `../../../shots/alert-triage/case-path.png`
- `../../../shots/screens__inspector-flagged.png`
- `../../../shots/screens__inspector.png`
- `../../../shots/screens__table-dock.png`

The transfer table in the trace screen shows six rows in the render; the remaining ten rows were
read from the page as if she had scrolled the table.

## Think-aloud

**Before starting.** "Bank transfers. Not my world, but it's the same question I ask about a lot
of parts: it came in on this date, where did it ship to next, and did anything ship before it
arrived. Lot traceability. Fine."

**The first screen.** "'August alerts.' Good, that's the month. 'Nothing has been sent from this
project' -- I like that it says that before I ask. Left side, a set called 'Referred AL-40122',
9. Which one is 'the flagged account'? There are orange diamonds everywhere, fifty of them."

*Reads the note on the right.* "OK, somebody already wrote it up. 'In 3,479.70 from ACC-916833 on
Aug 5 09:09; out the next day, 15:21 to 17:42...' So the account the note is about is the first
row, ACC-365386, risk score 92. That's my flagged account. Honestly the note is doing the work
here, not the tool. If nobody had written that note I'd be picking the highest risk score and
hoping."

"And look -- the note already answers half of what you asked. Three payments out the next day,
each just under ten thousand. I'm going to check it rather than trust it."

*Clicks the ACC-365386 row.* "Right side now says the account. There's a 'Neighbors' button with
a little arrow next to it. 'Neighbors' -- people next door? I suppose the accounts it paid or got
paid by. I'll try the little arrow, I don't want to press the big button and have the picture jump
on me."

**The Neighbors menu, first look.** "'Hops from ACC-365386.' Hops. In shipping a hop is a leg, so
one hop is who it paid directly, two hops is who they paid. OK, I can live with that. '1 hop, 9
nodes, 13 edges.' Nodes, edges. I'll translate: 9 accounts, 13 transfers. '2 hops, 283 nodes,
mostly through ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219 (Streaming, 109).' Good -- that
tells me two hops is mostly the pharmacy's customers. I don't want that. That sentence saved me a
mess."

"Now, underneath: 'Direction, Both.' 'From, Any time.' That's what I need. I only care about money
going OUT, and only after it arrived. It took me a second to see these -- they look like settings,
not like the thing you'd click to follow money -- but they're in the same menu, so fine."

**Setting direction and date.** *Opens Direction, picks Out. Opens From.* "'Transfers from: Any
time, Aug 6, 2026, Pick a date...' Why is Aug 6 already in the list? The money arrived on the
FIFTH. I'd have typed Aug 5. I guess it's offering the day after the money came in -- 'on or
after, on the column time (UTC)'. I'll take Aug 6 because nothing much can happen between 09:09
and midnight on a transfer I've already seen, but I didn't choose that date, the tool did, and I
don't know why. If I'd gone into 'Pick a date' and put in the fifth, would the totals at the bottom
change? I don't know. I'd have to try it."

"Now the counts changed: 1 hop is 5 accounts, 6 transfers. 2 hops, 11 and 16. 3 hops, 19 and 32.
Much smaller than 283. That's the right size for a question I can actually answer. I'll take two
hops -- who it paid, and who they paid." *Clicks 'Filter to neighbors, 2 hops'.*

**The trace.** "OK. Now THAT is a picture I understand. It reads left to right. The flagged one on
the left, arrows out to three accounts in the middle, then out again to the right, and nearly
everything lands on ACC-465572 at the far right. Everything funnels into one place. That's my
port-chokepoint picture -- 'everything goes through one port and nobody draws it.' Here somebody
drew it."

"What IS ACC-465572? The picture doesn't say. I remember from the first table it was a merchant,
'Money transfer', and money out 0.00. So it's where money leaves this file. Like goods going to a
distributor we have no data on. I'd want the picture to say 'money transfer service' next to it,
not make me remember."

"There's a dashed line with a little clock. Legend says 'earlier than the hop before, 1'. OK,
something is out of order. Good -- that's literally your question."

"Bottom table, 16 transfers. 'Sorted by time.' Thank you. Source, target, time, amount, 'sender's
hop', 'time order'. Let me read it like a statement."

*Reads, scrolling.*
- "Aug 6, 15:21, 15:44, 17:42: ACC-365386 sends 9,260.78, 9,662.37 and 9,139.58. 'Start, starts
  the trace.' So about 28 thousand goes out the day after 3,479.70 came in."
- "Aug 8, 898028 to 597001, 157.72. That's the pharmacy. That's somebody buying aspirin. 'In
  order.' Sure, it's in order, but it isn't the money, it's shopping."
- "Aug 10, 556231 to 465572, 8,396.00 -- 'earlier than the hop before (Aug 21 12:15)'. So 556231
  paid the transfer service on the tenth, but it only got money from 898028 on the twenty-first.
  You can't ship a part before the part arrives. That one isn't the same money. Good catch, and
  it's written in the row, I don't have to work it out."
- "Aug 17, 898028 to 453831, 22.88. Coffee. Ignore."
- "Aug 19, 274887 sends 9,353.83 to 140044, 9,788.51 to 640034, 9,815.97 to 465572. Then Aug 21,
  898028 sends 9,736.88 to 556231, 9,100.93 to 140044, 9,707.38 to 465572. And the second-hop
  accounts pass it on: 640034 to 465572 on the 21st, 140044 to 465572 on the 25th."
- "Aug 21, 274887 to 579763, 171.85, and Aug 30 the flagged account itself pays the streaming
  service 168.28. Small stuff."

"The footer: 'Money in before Aug 6: 3,479.70 USD (1 transfer). Money out from Aug 6 on:
28,231.01 USD (4 transfers).' There it is in one line. Three and a half thousand in, twenty-eight
thousand out. That doesn't add up. It sent eight times what it received. Where did the rest come
from? Not from anything in this file before the sixth."

**Checking the numbers.** "Hang on. Right side says 'Money out 28,321.82 USD'. Bottom says
'28,231.01'. Those look like the same number with the digits swapped. Which is it?" *Looks again.*
"The right side says 'on the full graph', the bottom says 'from Aug 6 on'. So the difference is...
90.81. Oh, that's the pharmacy payment on Aug 3, before my date. OK, both are right. But two
numbers that close, on one screen, with the digits nearly swapped -- that's exactly how I end up
telling my VP the wrong one. Put the date on the right-side one too, or don't show both."

"And the right side says 'Links in (count) 0' but 'Money in 22,670.50 USD' two lines down. Zero in
and twenty-two thousand in? I get it -- one is inside my filter and one is the whole month -- but
that's one little grey caption doing a lot of work."

"Also the 28,231.01 includes the 168.28 to the streaming service on the thirtieth. It's small, but
it's not the money we're chasing. The tool doesn't know shopping from structuring. Fair enough, I
wouldn't expect it to."

**Does the order make sense past the first account?** "The table says 'in order' for everything
except the one clock row. But 'in order' only means the dates line up. It doesn't mean the amounts
do. 274887 got 9,260.78 on the sixth and sent out 9,353.83, 9,788.51 and 9,815.97 on the
nineteenth. That's more than it received, again. Same with 898028. Each of them pays out about
three times what came in from my account. In a warehouse that's receiving 100 units and shipping
300 -- the dates can be in order and it's still not the same stock."

"The footer only does that in-versus-out check for the account I have selected. I assume if I
click 274887 the bottom line changes to 274887's in and out. It says 'Selection ACC-365386', so
probably. I'd want that check on every row, or at least a column, instead of clicking eleven
accounts one by one. For now I'd do it in Excel with a pivot on the export."

**The Path screen.** "This one draws a route from the flagged account to ACC-580664, five legs.
I didn't ask for 580664 -- who picked that? The table has one row 'Aug 4 13:56, earlier than the
hop before' in grey. So this route goes backwards in time too. And the right side says 'Ignoring
direction... it is not a flow from one to the other.' I read the first line of that and stopped. I
don't need this screen for your question; the trace table already answered it."

**The other pages.** *Opens the inspector and table pages.* "Proteins. Les Miserables. And this
one says 'Transfers, March 2026' with the SAME account number, ACC-365386 -- but country GB, not
US, and different money totals. Is that the same account? Different month? A different bank? I'm
not going to try to reconcile that. Skipping these, they're not my data."

**My answer.** "Money came into ACC-365386 on Aug 5 at 09:09, 3,479.70 from ACC-916833. The next
afternoon it sent out three payments, each just under ten thousand, about 28 thousand in all, to
274887, 898028, and the money transfer service 465572. Around Aug 19 to 21, 274887 and 898028 each
sent another two or three just-under-ten-thousand payments on, and within a few days nearly
everything ended up at the money transfer service. The dates run in order, except one: 556231's
payment on Aug 10 happened before it was paid on Aug 21, so that one isn't part of this chain."

"Does the order make sense? The dates do. The money doesn't. Each account sends out far more than
it got from the one before, starting with the flagged account: 3.5 thousand in, 28 thousand out,
next day. So either there's money coming in from somewhere this file doesn't show, or these aren't
really 'where the money went' -- they're a set of accounts moving just-under-ten-thousand
payments around and cashing out through one service. Somebody should pull the actual bank
statement for ACC-365386."

## Single Ease Question

**5 out of 7.** "Once I had the Direction and the date set, it was quick. The picture read left to
right, the table was in date order, it flagged the one out-of-order transfer in words, and the
footer put money in against money out in one line. That's the part I'd normally build by hand.
I lost points because I had to find Direction and From inside a menu behind a little arrow, the
tool chose Aug 6 for me without saying why, and there were two money-out numbers on the same
screen that differ by one pharmacy payment and look like a typo. And 'in order' only checks
dates, not whether the account had the money -- I had to add that up myself for everyone but the
first account."

## Would she use this instead of her current tool?

"For this job? It's not my job -- I'd hand it to whoever does fraud. But the idea, yes. That trace
is lot traceability: received on this date, shipped on that date, flag anything shipped before it
arrived. I'd want exactly that for a bad resin lot."

"But not instead of what I have. Two reasons. One, that only works if I have dated shipments
between my suppliers and THEIR suppliers, and past Tier 1 I have a company name and a country.
Where do I get the Tier 2 data from? Two, my VP looks in Power BI, and IT has to approve anything
that touches the supplier list. It says 'nothing has been sent from this project', which I'd
screenshot for IT, but nobody's told me whether I can get this table out into something Power BI
reads. If the export is a plain CSV with the 'sender's hop' and 'time order' columns in it, it's a
side tool I'd keep. If not, it's a nice demo."

## Observer notes

- She identified the flagged account only from the previous reviewer's note in the set's
  inspector; without it she said she would have picked the highest risk score and guessed.
- She reached Direction and From through the caret beside Neighbors, not the Neighbors button,
  because she did not want the picture to change before she knew what it would do. She said the
  two options "look like settings, not like the thing you'd click to follow money", but found them
  without help.
- The 2-hop row's sentence naming the pharmacy and streaming service as what makes 283 accounts
  steered her away from the unfiltered two-hop step before she took it.
- The From date arrived pre-set to Aug 6. She expected Aug 5, the day the money arrived, accepted
  Aug 6 without knowing why it was offered, and could not tell whether choosing Aug 5 would change
  the footer's "Money in before" figure. (It would: the split happens at the From date, so Aug 5
  would put the arrival on the "out from" side's date range and "Money in before" would read zero.)
- The trace drawing (left to right by hop, arrows, the dashed clock edge) was the moment she
  engaged; she called it the chokepoint picture she never gets. She wanted the destination account
  labelled with its kind ("money transfer service") on the canvas.
- She read the one out-of-order transfer correctly from the "time order" column and explained it
  in her own terms ("you can't ship a part before it arrives").
- The inspector showed Money out 28,321.82 (full graph, whole month) and the footer showed
  28,231.01 (from Aug 6). She read them as a digit transposition before working out the 90.81
  difference. Same screen, same account, different scopes, near-identical digits.
- The inspector's "Links in (count) 0" (inside the step) sits two lines above "Money in
  22,670.50 USD" (full graph); she found the pairing contradictory at first glance.
- "In order" checks only dates. She noticed that the first-hop accounts each send out roughly three
  times what they received from the flagged account and wanted that in-versus-out check per row,
  not only for the selected account. She assumed, without confirming, that selecting another
  account would move the footer to it.
- "In order" also applies to small everyday payments (22.88, 157.72, 168.28), and the footer's
  money-out total includes the 168.28 streaming payment; she discounted them herself.
- The Path screen came with a To account she did not choose; she read one line of the inspector
  and left it as irrelevant to the task.
- The separate inspector and table pages use other data (proteins, a novel, a March transfers file
  reusing the same account number with a different country and totals); she skipped them and said
  the reused account number made her doubt which account she was looking at.
- Small grey text she struggled with: the "time order" column's "starts the trace", the "sender's
  hop" header, and the captions under the inspector's money rows.
