# Dated trace -- Fraud analyst (Sarah)

**Participant:** Sarah, level-2 financial crime investigator at a mid-size bank, eight years in.
Works escalated cases over days; lives in the statement export and a pivot table; has used i2
Analyst's Notebook a few times a year. Session mode: first impression, not mandated -- one real
task and her usual patience.

**Task as given by the moderator:** "Money arrived in the flagged account in early August. Follow
where it went next and tell me whether the order of the transfers makes sense." (Same wording as the
previous round.)

**Screens seen, in the order she went:** the escalated case on the alert triage screen (August
transfers, 3,000 accounts): the case as it opens, the account's own transfers, the Neighbors menu
set to Out and From Aug 6, the resulting trace; then, for comparison, the path frame and the export
dialog; a glance at the inspector page (flagged-account state) and the table dock page.

Renders she looked at (all under `design/ui/prototype/shots/`):
- `alert-triage/case-open.png`, `alert-triage/seed-own.png`
- `alert-triage/case-trace-menu.png`, `alert-triage/case-trace.png`
- `alert-triage/case-path.png`, `alert-triage/case-export.png`
- `screens__inspector-flagged.png`, `screens__table-dock.png` (glanced)

The trace table shows six rows in the render; the remaining ten were read from the page as if she
had scrolled the table (the page's own rows, nothing invented).

## Think-aloud

**The escalation (case-open).** "Same case as last time. Referred AL-40122, nine accounts, frozen.
Nadia's note: in 3,479.70 from ACC-916833 on Aug 5 09:09, out the next afternoon to ACC-274887,
ACC-898028 and the money transfer service ACC-465572. So 'money arrived' is the 3,479.70 on the 5th."

"New: the node table has Money in and Money out columns. ACC-365386, in 22,670.50, out 28,321.82
for the month. OK, so already before I do anything, more left than came in. Good -- that is the
first number I'd have built a pivot for."

**The account's own transfers (seed-own).** "Edges tab, sorted by time, eight transfers. Aug 3,
90.81 to a pharmacy. Aug 5 09:09, 3,479.70 in. Aug 6 15:21, 15:44, 17:42 -- three out, all
nine-thousand-something. Then Aug 17, 9,863.99 in from ACC-796219, and the eighth row is cut off.
Footer: 'Money in 22,670.50 USD (3 transfers), Money out 28,321.82 USD (5 transfers).' Fine."

"But look at the order. Twenty-eight thousand goes out on the 6th. Only 3,479.70 came in before
that. The other nineteen thousand-odd of 'money in' lands on the 17th and the 24th -- AFTER it went
out. So the account paid out money it didn't have yet. Either there's an opening balance, an
overdraft, or a credit this file doesn't have. That's the first thing I'd put in the RFI: full
statement with running balance."

**The Neighbors menu (case-trace-menu).** "Neighbors dropdown on the account. Hops from ACC-365386,
and now there's Direction -- set to Out -- and From -- Aug 6, 2026, 'on or after, on the column time
(UTC)'. That's what I asked for last time. Out only, after the money arrived."

"1 hop, 5 nodes, 6 edges: 'Its 4 transfers out from Aug 6 on, and the transfers among the accounts
they reach.' 2 hops, 11 nodes, 16 edges. 3 hops, 19. Small. Compared to the 283 I got last time
with no direction, that's a case I can actually read. I'll take 2 hops."

"Two things. It's a date, not a time. The money came in at 09:09 on the 5th. If something had gone
out at 14:00 on the 5th, 'From Aug 6' would drop it and I'd never know. I'd rather point at the
3,479.70 row and say 'follow from this transfer'. And UTC -- our core banking statements are in
local time. A late-evening transfer can land on the next day in UTC. I'd have to remember that
when I cross-check against the statement."

**The trace (case-trace).** "OK. Chip says 'Filtered: 11 of 3,000 nodes'. The picture has arrows
now. ACC-365386 on the left, arrows out to ACC-274887, ACC-898028, ACC-512219, and a long one across
to ACC-465572 on the right, and everything eventually pointing into ACC-465572. That's the money
transfer service. That reads like cash-out, which is what I'd expect."

"I count the labels: ACC-365386, 274887, 898028, 512219, 140044, 453831, 556231, 579763, 597001,
465572. That's ten. Chip says eleven. There's a line going down under that black 'Filter to...'
message -- the eleventh is sitting under the popup. It'll go away, I assume, but for a second I
thought the count was wrong."

"Still no amounts on the lines. Doesn't matter, I'm going to read the table."

"The table. Source, target, time, amount, sender's hop, time order. Sorted by time. That IS the
timeline. Let me read down:"

"Aug 6 15:21, 15:44, 17:42 -- the three from the flagged account, 'starts the trace'. Aug 8
ACC-898028 to ACC-597001, 157.72 -- pharmacy, somebody's prescription, noise. Aug 10 13:32,
ACC-556231 to ACC-465572, 8,396.00, hop 2, 'earlier than the hop before (Aug 21 12:15)'. Good. So
ACC-556231 paid the transfer service on the 10th, but money from our chain only reached it on the
21st. That can't be our money. Dashed line with a clock on the picture for it too. That's the check
I'd do by eye and miss one in twenty."

"Scrolling. Aug 17 ACC-898028 to ACC-453831, 22.88 -- shop. Aug 19, ACC-274887: 9,353.83 to
ACC-140044 at 14:06, 9,788.51 to ACC-640034 at 15:09, 9,815.97 to ACC-465572 at 16:56. Three in under
three hours, all just under ten. There's your structuring again, one hop down. Aug 21, ACC-898028:
9,736.88 to ACC-556231, 9,100.93 to ACC-140044, 9,707.38 to ACC-465572. Same pattern. ACC-640034 to
ACC-465572 Aug 21 15:55, 9,199.75. ACC-274887 to ACC-579763, 171.85, noise. Aug 25 ACC-140044 to
ACC-465572, 8,299.52. Aug 30 the flagged account to ACC-512219, 168.28 -- that's the streaming
service. All 'in order' except the one."

"Footer: 'Selection ACC-365386, on the full graph. Money in before Aug 6: 3,479.70 USD (1 transfer).
Money out from Aug 6 on: 28,231.01 USD (4 transfers).' Yes. That's the sentence. It did the adding
I did in my head last time, and it split it at the date. Four transfers because the 168.28
streaming payment on the 30th is in there -- I'd rather it didn't lump a subscription in with the
structured ones, but it tells me the count, so I can see it."

"Now here's my problem with 'in order'. ACC-274887 got 9,260.78 from us on the 6th. On the 19th it
sent out 9,353.83 plus 9,788.51 plus 9,815.97 -- that's about 28,958. Three times what it got from
us. The table says 'in order' on all three. In order by the clock, sure. But that is not our money
moving on. Same for ACC-898028: got 9,662.37 from us, sent out about 28,545 on the 21st. If a junior
wrote 'the funds were then forwarded to' based on this column, QA would send it back. The column
should say 'later than the hop before' or it should also tell me 'sent 3.1 times what it received
from the hop before'. Otherwise it's half a check."

"And I want the cash-out figure. How much of this ended at ACC-465572? I'd click the target header,
or select the rows into ACC-465572 -- I assume the footer sums selected rows like the earlier one
did ('8 rows selected, Money in, Money out'). Doing it by hand: 9,139.58, 9,815.97, 9,199.75,
9,707.38, 8,299.52 -- 46,162.20 in order, plus the 8,396.00 that came too early. I'd want the tool
to give me 'into ACC-465572 inside this trace' as one line. It's the number that goes in the
narrative."

**Inspector on the right, in the trace.** "Connections: 4 neighbors, Links in 0, Links out 4 -- then
Money in 22,670.50, Money out 28,321.82, 'on the full graph'. Links in zero and money in twenty-two
thousand, one under the other. I get it after reading the small print -- the counts are the
filtered step, the money is the whole month. But a reviewer glancing at a screenshot of that panel
would ask me which one is wrong. Put the two on the same basis, or put the basis on the row, not
in grey underneath."

**The path frame (case-path).** "Last time you showed me this for 'where did it go'. I don't need
it now -- the trace answered it without me guessing an end account. Path is for 'does A reach B',
which is a different question. Fine that it's there. It still says Aug 4 'earlier than the hop
before' on hop four. Consistent with the trace. Good."

**Export (case-export).** "This export is for the ring set, not for my trace. Findings report,
figure, nodes and edges CSV, '4 files go to the download folder. Nothing is uploaded.' Good. But
does the edges CSV carry 'sender's hop' and 'time order'? Still not stated. If I export the trace
and those two columns aren't in it, I'm redoing the order check in Excel for my reviewer, and the
best thing on this screen stays on this screen."

**Inspector page (glanced).** "ACC-365386, 'Transfers, March 2026', country GB, alert March 9.
Same account number I just traced as a US account alerted Aug 7. I said it last time. Two demo
files, I know. On a real case, I'd stop and raise a data-quality ticket."

**Table dock page (glanced).** "Time next to the two accounts. Still the right place for it."

## Her answer to the task

"Where it went: ACC-365386 got 3,479.70 from ACC-916833 on Aug 5 at 09:09. The next afternoon,
between 15:21 and 17:42, it sent three transfers just under 10,000 -- 9,260.78 to ACC-274887,
9,662.37 to ACC-898028 and 9,139.58 straight to the money transfer service ACC-465572. The two
personal accounts held for about two weeks. On Aug 19 ACC-274887 sent three more just-under-10,000
transfers inside three hours: to ACC-140044, ACC-640034 and ACC-465572. On Aug 21 ACC-898028 did the
same: to ACC-556231, ACC-140044 and ACC-465572. Then ACC-640034 (Aug 21) and ACC-140044 (Aug 25)
paid ACC-465572 as well. In time order, 46,162.20 of what this trace shows ends at the money
transfer service.

"Does the order make sense? The dates run forward, yes -- except ACC-556231's 8,396.00 to the
transfer service on Aug 10, which is before any money from this chain reached it, so it's not part
of this flow. But the amounts don't. The flagged account sent 28,231.01 out against 3,479.70 in, and
most of its other inflow arrived a week and more AFTER it had already paid out. Each next account
also paid out about three times what it got from the account before. So this is not one sum being
layered forward. It's a group of accounts each moving structured amounts on a schedule and cashing
out at the same service, funded from somewhere this file doesn't show. For the SAR: coordinated
structuring with a common cash-out point, pending full statements with balances before I say any
dollar went from A to C."

"Confidence: good on dates, amounts and who paid whom -- that's all in the table. The tool did the
in-before and out-after split for me this time. It did not tell me that 'in order' is only about
time, and it did not give me the cash-out total; those I did myself."

## Single Ease Question

**5 out of 7.** "Getting there was easy -- one menu, Out, a date, two hops, and the table is the
timeline I'd have built in Excel with the order check already done. That's the jump from last time.
What keeps it off a six: I had to do the in-versus-out per account in my head, and the 'in order'
column would have misled a junior. The cash-out total into the transfer service I added by hand. And
one node sat under a popup while I was counting."

## Would she use this instead of her current tool?

"Not instead of Excel -- the statement and the pivot are still where the balances are, and balances
are the question this case turns on. Instead of i2 on a ring case like this one: yes, I'd try it.
i2 doesn't give me 'out, from this date, two hops' in one menu, and it doesn't flag a transfer that
happened before the money got there. That's an hour saved on a case like this. Conditions: the
exported edges CSV has to carry the hop and time-order columns so my reviewer sees the check
without the tool, and IT has to approve it -- 'nothing is uploaded' helps. And fix the wording of
'in order' before someone puts it in a narrative."

## Problems observed (in her words, with where)

1. **"In order" is only about time; the amounts say it is not the same money.** Alert triage, the
   trace's Edges tab, time order column: ACC-274887 received 9,260.78 and then sent about 28,958,
   all marked "in order". "If a junior wrote 'the funds were then forwarded' off this column, QA
   would send it back." Nothing flags an account sending out more than it received from the hop
   before. Severity: high -- it invites a wrong statement in a SAR.
2. **No cash-out total for the trace.** Trace frame: how much of the traced money ends at
   ACC-465572 is not stated anywhere; she added 46,162.20 by hand. "It's the number that goes in the
   narrative." Severity: medium.
3. **The From option is a date, not "after this transfer", and it is in UTC.** Neighbors menu, From
   submenu: the money arrived Aug 5 09:09; a same-day outflow would be dropped by "From Aug 6", and
   UTC days can differ from the bank's local-time statements. "I'd rather point at the 3,479.70 row
   and say follow from this transfer." Severity: medium.
4. **Unclear whether the exported edges CSV carries "sender's hop" and "time order".** Export dialog
   (shown for the ring set; no export of the trace itself is shown). "If they aren't in it, the best
   thing on this screen stays on this screen." Severity: medium.
5. **Inspector mixes two scopes one row apart.** Trace frame, inspector Connections: "Links in 0"
   (the filtered step) directly above "Money in 22,670.50" (the full month), with the basis only in
   grey text below. "A reviewer would ask me which one is wrong." Severity: medium.
6. **A node is hidden under the confirmation message.** Trace frame: the chip says 11 accounts, ten
   labels are visible; ACC-640034 sits under the "Filter to ... 11 nodes" popup. Severity: low.
7. **The footer's "Money out from Aug 6" lumps a 168.28 streaming payment in with the structured
   transfers.** Trace frame footer, "4 transfers". She can see the count, so it is not hidden, but
   she would want to exclude small spending. Severity: low.
8. **Same account ID, different attributes on two pages.** Inspector page: ACC-365386 is GB and
   alerted Mar 9 on the March file; on the August case it is US, alerted Aug 7. Repeated from the
   previous round, unchanged. Severity: medium.
9. **Links on the drawing carry direction now, but still no amount.** Trace frame. She reads the
   table instead. Severity: low.

## What she liked

- Direction Out and a From date in the same Neighbors menu, with every hop row recounted before
  she commits: "11 accounts instead of 283 -- a case I can read."
- The trace table sorted by time with "sender's hop" and "earlier than the hop before (Aug 21
  12:15)": "the check I'd do by eye and miss one in twenty."
- The footer split at the From date: "Money in before Aug 6: 3,479.70; money out from Aug 6 on:
  28,231.01 -- that's the sentence."
- Money in and Money out columns on the node table from the first screen.
- Arrows on the drawing, all converging on the money transfer service: "reads like cash-out."
- The dashed line with a clock for the out-of-order transfer.
- "4 files go to the download folder. Nothing is uploaded."
