# Session: dated trace -- alert reviewer (Nadia)

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Fourteen months in, works the alert queue, has never used a graph tool. Patience: the length of
one alert, about ten minutes.

Task as given, and nothing more: "Money arrived in the flagged account in early August. Follow
where it went next and tell me whether the order of the transfers makes sense."

Material worked from: the alert triage screens for the August transfers -- the project opening,
finding ACC-365386, the Neighbors menu, one hop drawn, the account's own transfers in time order
with the export menu, the Neighbors menu with Direction and From set, and the dated trace that
menu produces -- plus the inspector and table-dock pages. Renders were read; page HTML was read
only to see what a control offers when opened.

Moderator note on coverage: the Direction submenu and the date picker behind "Pick a date..."
are not drawn. Their contents were read from the page (Direction: Both, Out, In; From: any
time, or a date on the time column). The dated trace itself is drawn only in the escalated
case, after the referral (its left panel already lists a "Referred AL-40122" set); Nadia was
shown that render as the result of her own menu choices and told to ignore the extra set.

## Think-aloud

**1. The project opens.** (shots/alert-triage/open.png)

"August alerts. The grey honeycomb with orange diamonds I skip. The table at the bottom is my
queue: alertId, account, scenario, riskScore. That I can read.

'The flagged account.' They're all flagged, there are fifty. You didn't give me an alert
number. Money came in and then went out, and you care about order -- that's the structuring one,
AL-40122, ACC-365386, risk 92. It's the only one scrolled into view that's about money going
out in a batch. If you meant a 'money out within 24 hours' one, tell me now."

(Moderator did not correct her.)

**2. Find the account.** (shots/alert-triage/seed-find.png)

"Search box, top left. Paste ACC-365386. One hit. Click.

Right side. riskScore 92, from the accounts file, the bank's number, not this thing's. Good.
Scenario: three or more transfers of 9,000 to 9,999 out in thirty days. Alert time Aug 7 02:17.

Connections: 8 neighbors, 'Links in 3, Links out 5'. Links. Neighbors. Transfers. Edges further
down. That's four words for the same thing and I'm going to have to guess every time.

Oh -- this is new, or I didn't see it before: Money in 22,670.50, Money out 28,321.82. 'Sum of
amount over its transfers.' So more went out than came in over the month. That's the first line
of my note and I didn't have to add anything up. But it's the whole month. You asked about
'arrived in early August' and 'next'. The month total doesn't tell me the order.

Can I click 'Money out' to see the five? No arrow, grey text. I'll go to the big Neighbors
button again."

**3. The Neighbors menu.** (shots/alert-triage/seed-menu.png)

"Caret by Neighbors. 'Hops from ACC-365386.' 1 hop, 9 nodes. 2 hops, 283 -- 'mostly through
ACC-597001, Pharmacy, and ACC-512219, Streaming.' So a pharmacy and Netflix blow it up. Not
clicking that. 3 hops, 2,122, no.

Then: 'Direction -- Both.' 'From -- Any time.' OK. That I understand better than last time's
'Follow ... All'. Direction of money. I want out, because you said where it WENT. And From --
from a date. I want from when the money arrived."

(She hovers Direction. Moderator reads the options from the page: Both, Out, In.)

"Out. Obviously.

From. Any time, or 'Pick a date...'. The money arrived Aug 5. I'd put Aug 5. ... Does 'from Aug
5' include the thing that came in ON Aug 5? It's an out-only search so maybe it doesn't matter.
I'm guessing. The picker isn't drawn so I can't tell you what I'd actually get."

(Moderator: the drawn version uses Aug 6, "on or after, on the column time (UTC)". Shown
shots/alert-triage/case-trace-menu.png.)

"Aug 6, fine, the day after. 'On or after, on the column time (UTC)' -- a column. Whatever. It
says on or after, that's what I need.

And look, the hop rows changed. 1 hop is 5 nodes now, and the sentence under it says 'its 4
transfers out from Aug 6 on, and the transfers among the accounts they reach.' OK. So 'a hop'
is one transfer away. That's the first time a screen explained that word to me. 2 hops, 11. 3
hops, 19. Eleven is fine. 'Next' means after the three accounts we paid, so that's 2 hops.
Filter to neighbors, 2 hops. Filter, not select -- I want the rest gone."

**4. The trace.** (shots/alert-triage/case-trace.png)

"OK now there are arrows. Our account on the left, three accounts in the middle, and everything
on the right ending up at ACC-465572. That's a funnel. You don't need me to tell you that, you
can see it.

One line is dashed with a little clock. Legend at the bottom: 'earlier than the hop before, 1'.

The table. 'Filtered graph: 16 of 9,171 edges. Sorted by time.' Thank you. Sorted by time,
not by amount. Columns: source, target, time, amount, 'sender's hop', 'time order'.

- Aug 6 15:21, 15:44, 17:42 -- ours, 9,260.78, 9,662.37, 9,139.58 to 274887, 898028, 465572.
  'start, starts the trace.' Fine.
- Aug 8, 898028 sends 157.72 to 597001, the pharmacy. Noise.
- Aug 10 13:32, ACC-556231 sends 8,396.00 to 465572. 'Sender's hop 2', and 'earlier than the
  hop before (Aug 21 12:15)'.

What does that mean... hop 2 is two transfers out. The hop before it is the one that paid
556231, and that was Aug 21. So 556231 paid 465572 on the 10th with money it only got on the
21st. It can't be our money. OK. That's exactly the kind of thing I'd have to catch by lining up
dates across two rows, and it caught it for me. And it's drawn dashed on the picture, so the
screenshot shows it too.

I have to scroll for the rest -- I can see six of sixteen rows. The page has them:"

(Moderator read the remaining rows from the page.)

"- Aug 17, 898028 sends 22.88. Noise.
- Aug 19, 274887: 9,353.83 to 140044, 9,788.51 to 640034, 9,815.97 to 465572. Three in two
  hours. That's the same pattern as ours on Aug 6.
- Aug 21, 898028: 9,736.88 to 556231, 9,100.93 to 140044, 9,707.38 to 465572. Same pattern
  again.
- Aug 21, 640034 to 465572, 9,199.75. Aug 25, 140044 to 465572, 8,299.52.
- Aug 30, ours, 168.28 to 512219. The streaming service. 'Starts the trace'? It's a
  subscription. Whatever.

Everything says 'in order' except the one.

But 'in order' is lying a bit. 274887 got 9,260.78 from us and sent out three transfers of
nearly ten each. That's 29 thousand. (Adds on her phone: 9,353.83 + 9,788.51 + 9,815.97 +
171.85 = 29,130.16.) Three times what it got from us. The date is in order. The money isn't.
'In order' only means the date came after, and somebody reading my note will take it to mean
'this is our money moving on'. It isn't, not most of it. Same for 898028."

**5. The footer.** (shots/alert-triage/case-trace.png, bottom line)

"'Selection ACC-365386, on the full graph. Money in before Aug 6: 3,479.70, 1 transfer. Money
out from Aug 6 on: 28,231.01, 4 transfers.' That's the sentence I did on a calculator: an
eighth came in, the rest went out. Good. That goes straight in the file.

Wait. Money in BEFORE Aug 6. What about after? On the screen before this one, the account's own
transfers, the bottom row was Aug 17, ACC-796219 paid us 9,863.99. And the inspector on this
same screen still says Money in 22,670.50. So 19 thousand came in after the money went out, and
this footer just doesn't mention it. If I copy the footer into the file, QA reads 'only
3,479.70 came in' and that's wrong. The money coming in AFTER the money went out is half of
why the order doesn't make sense.

And there are two money-in numbers on one screen now. Inspector: 22,670.50, 'on the full
graph'. Footer: 3,479.70. Both right, both for the same account, and I have to work out why
they differ. The inspector also says '4 neighbors, Links out 4' and then 'full graph 8
neighbors: in 3, out 5'. So is it four or five out? Oh, the Aug 3 one is before the date. Fine.
But I had to stop and think."

**6. What the trace left out.**

"The two accounts that paid US after -- 796219 and 228299 -- aren't in this picture at all,
because I said Out. Last screen, 796219 paid us and then paid 465572 fifty minutes later, the
same afternoon. That's the best bit of evidence and the out-only trace drops it. I'd have to
do Direction Both to see it, and then I'm back to reading the table by eye. I'm not doing a
second run for that; I'll write it from the account's own transfers."

**7. The export test.** (shots/alert-triage/seed-own.png, Export menu)

"Plus by Export. 'Export the selection's edges, 8 transfers, time and amount.' That's the
account's own statement, it goes in the file. For the trace I'd take a screenshot of the arrows
with the dashed line -- it shows the funnel into 465572 and the one out-of-order transfer in one
picture. Does the export of the trace keep the 'earlier than the hop before' column? I didn't
see an export screen for the trace, only the account's own edges. If it doesn't, I'm typing it."

## Her answer to the task

"The flagged account is ACC-365386, alert AL-40122, I'm assuming. 3,479.70 came in on Aug 5
from ACC-916833. On Aug 6, within two and a half hours, three transfers just under 10,000 went
out -- 9,260.78 to ACC-274887, 9,662.37 to ACC-898028, 9,139.58 to ACC-465572, 28,062.73 in all.

Next: on Aug 19 ACC-274887 sent three transfers of 9,300 to 9,800, and on Aug 21 ACC-898028 did
the same, each to three accounts, and one of each three went to ACC-465572. The second-row
accounts (640034, 140044, 556231) also paid ACC-465572. Everything ends at 465572.

Does the order make sense? No. Four ways it doesn't:
1. An eighth came in before the money went out (3,479.70 in, 28,231.01 out from Aug 6).
2. The accounts we paid each sent on about three times what they got from us, so it isn't the
   same money moving, it's topped up.
3. ACC-556231 paid 465572 on Aug 10 but only received from 898028 on Aug 21 -- the tool marks it
   as earlier than the transfer before it.
4. About 19,000 came IN to our account after the outflows, Aug 17 and 24, from accounts that
   paid 465572 the same afternoon. That one's from the account's own list, not the trace.

That's a group passing amounts under ten thousand into one account. Not tuition. It goes up to
level 2 with the account's eight transfers exported and a screenshot of the trace."

Time on task, her estimate: "Twelve, fifteen minutes. Less arithmetic than I'd expect. Still
too long for my queue, but this one was never going to be a five-minute clear."

## What worked for her

- Pasting the account into the first search box: one hit.
- Money in and Money out in the inspector: "the first line of my note without adding anything."
- Direction and From as named options in the Neighbors menu, read as "money out, from a date";
  she chose Out without help.
- The one-hop row's sentence ("its 4 transfers out from Aug 6 on ...") was the first place any
  screen explained what a hop is.
- Out plus a date cut 2 hops from 283 accounts to 11, which she was willing to draw.
- Arrows, and the funnel into ACC-465572, readable from the picture alone.
- The Edges table sorted by time, with the "earlier than the hop before (Aug 21 12:15)" row and
  the dashed, clocked edge: "it caught it for me."
- The footer's split, 3,479.70 in before Aug 6 against 28,231.01 out from Aug 6 on, replacing
  the calculator.

## Where she stalled or guessed

- "The flagged account" among fifty alerts: she chose AL-40122 from the scenario names.
- Links, neighbors, transfers and edges used for one thing; "Links out (count)" and "Money out"
  are not clickable into the transfers.
- The Direction submenu and the date picker are not drawn; she would have typed Aug 5 and did
  not know whether "from Aug 5" includes a transfer on Aug 5, or what the footer would then call
  "Money in before".
- "In order" checks only the date. ACC-274887 received 9,260.78 and sent on 29,130.16, still
  "in order"; she read "in order" as a claim that the money moved on and called it misleading.
- The footer splits at the From date and says nothing about money in after it: 19,190.80 USD
  that arrived on Aug 17 and Aug 24 disappears from the one line she would copy into the file.
- Two money-in figures for the same account on one screen (inspector 22,670.50 on the full
  graph, footer 3,479.70 before Aug 6), and "Links out 4" beside "full graph ... out 5".
- Out-only drops the accounts that paid her account after the outflows, so the same-afternoon
  pattern (ACC-796219 paying ACC-365386 and ACC-465572 fifty minutes apart) is not in the trace.
- Six of sixteen rows visible without scrolling.
- "Sender's hop: start, 1, 2" still reads as jargon; she worked it out from the flagged row only.
- The Aug 30 subscription payment of 168.28 is labelled "starts the trace".
- No export shown for the trace itself, so she does not know whether the time-order column
  reaches the alert file.

## Single Ease Question

"Five. Better than last time. It told me the order -- sorted by time, it flagged the one that's
backwards, it did my in-versus-out sum. But I had to guess two menus you didn't show me, the
footer leaves out the money that came in late, and 'in order' says the dates are fine when the
amounts obviously aren't the same money. The tool knows the amounts too. It only told me about
the dates."

SEQ: 5 / 7

## Would she use it instead of her current tool?

"Instead? No. Ninety percent of my queue is one transfer and a customer profile, and nothing
here is faster for that. For an alert where the counterparties matter, like this one, I'd want
it open next to the case system: Out plus a date got me the second hop without the 283 mess,
and the dashed line is something I'd screenshot straight into the file. I'd still need core
banking for the balance and cash. And it's not my call -- somebody above Sarah picks the tools."
