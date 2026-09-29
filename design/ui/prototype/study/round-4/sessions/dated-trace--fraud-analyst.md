# Dated trace -- Fraud analyst (Sarah)

**Participant:** Sarah, level-2 financial crime investigator at a mid-size bank, eight years in.
Works escalated cases over days; lives in the statement export and a pivot table; has used i2
Analyst's Notebook a few times a year. Session mode: first impression, not mandated -- she gives it
one real task and her usual patience.

**Task as given by the moderator:** "Money arrived in the flagged account in early August. Follow
where it went next and tell me whether the order of the transfers makes sense."

**Screens seen, in the order she went:** the escalated-case frames of the alert triage storyboard
(August transfers, 3,000 accounts), the alert triage screen states for one hop, the account's own
transfers, two hops, the 9,000-to-9,999 step, the kept ring, the path, and the export; then the
"Sets and paths" page's "Neighbors out of one account, in a date window" section; the Sets and paths
screen; the inspector's flagged-account state; the table dock page.

Renders she looked at (all under `design/ui/prototype/shots/`):
- `alert-triage/case-open.png`, `alert-triage/seed-hop1.png`, `alert-triage/seed-own.png`
- `alert-triage/case-menu.png`, `alert-triage/case-hop2.png`, `alert-triage/case-distractor.png`
- `alert-triage/case-ring.png`, `alert-triage/case-path.png`, `alert-triage/case-export.png`
- `flows__sets-and-paths.png` (section 5, the dated neighbors sketch and its rows table)
- `r4-sarah-dated-screens-sets-and-paths.png` (the Sets and paths screen, study view)
- `screens__inspector-flagged.png`
- `r4-sarah-dated-screens-table-dock.png` (glanced at)

## Think-aloud

**The escalation (case-open).** "OK, this is the one level 1 sent up. Referred AL-40122, nine
accounts, frozen. Note from Nadia on the right -- good, she wrote times. 'In 3,479.70 from
ACC-916833 on Aug 5 09:09; out the next day, 15:21 to 17:42: 9,260.78 to ACC-274887, 9,662.37 to
ACC-898028, 9,139.58 to ACC-465572, money transfer.' So the flagged account is ACC-365386 and the
early-August money is the 3,479.70 on the 5th. That's what you mean by 'money arrived'?"

"Hang on. Three and a half thousand in, and twenty-eight thousand out the next afternoon? That's
not pass-through. That's not even the same money. Either there's an opening balance I'm not seeing,
or there's a cash deposit or a branch credit that isn't in this file. First thing I'd ask for is
the full statement with balances. The picture can't tell me that and nothing on this screen warns
me that the file doesn't have balances."

**The account's own transfers (seed-own).** "This is what I actually want: the account's own
transfers, sorted by time. 'Edges of the selection, ACC-365386: 8 of 13 edges.' Edges -- fine, I
get it, transfers. Aug 3 90.81 to a pharmacy. Aug 5 3,479.70 in. Aug 6 15:21, 15:44, 17:42 -- three
out, all nine-thousand-something. Structuring pattern, textbook. Then Aug 17 9,863.99 in from
ACC-796219 and Aug 24 9,326.81 in from ACC-228299. The eighth row is cut off at the bottom -- I'd
scroll. Fine."

"Adding it in my head: out on the 6th is 28,062.73. In before that is 3,479.70. So roughly 24,500
came from somewhere this file doesn't show. I'd want the tool to add that up for me. It doesn't. In
the pivot I'd have the in and out totals by date in two minutes."

"And the two big ones coming IN on the 17th and 24th are from alerted accounts. So money goes out,
and later similar amounts come back from other people in the same group. That smells like
round-tripping, not a straight chain."

**One hop, whole step (seed-hop1).** "Nine accounts, thirteen transfers, sorted by amount. I can
already see second-hop stuff in here: ACC-274887 to ACC-465572 Aug 19, 9,815.97; ACC-898028 to
ACC-465572 Aug 21, 9,707.38. Those are the people the flagged account paid on the 6th, paying the
money transfer service two weeks later. Not rapid. Thirteen, fifteen days."

"Sorted by amount though. For this question I need time. I'd click the time header. I assume that
works -- it did on the other view."

"The lines on the picture have no arrows and no amounts. I can't tell who paid whom from the
picture. I'm reading the table, the picture is decoration right now."

**Two hops (case-menu, case-hop2).** "Neighbors menu. '1 hop, 9 nodes. 2 hops, 283 nodes, mostly
through a pharmacy and a streaming service.' Good -- it tells me why it's 283 before I do it. That
I like. It saved me pulling two shops' customers into my case. 'Follow: All'. That's direction? I
would want 'out only'. There's no date box here. I want 'after Aug 5' -- anything before the money
arrived is not where the money went."

"If I do 2 hops anyway: 283 accounts, 470 transfers. Sorted by amount. ACC-274887 to ACC-640034 Aug
19, 9,788.51. So ACC-274887 got 9,260.78 on the 6th and sent out 9,815.97 plus 9,788.51 on the 19th
-- nineteen and a half out against nine and a quarter in. Again, more out than in. Nobody in this
chain is passing on 'the' money. They're all spending more than they got from the flagged account.
That's either a funded ring or the file is missing inflows."

"283 is useless to me as a picture. The two shops again. I'd undo."

**The 9,000-to-9,999 step and the ring (case-distractor, case-ring).** "Someone filtered to
transfers just under ten grand. Fourteen accounts. That's the right move, that's what I'd do in
Excel -- filter the amount column to 9,000 to 9,999. And it's honest about ACC-523284: 'inside the
step it has one transfer; full graph 3 neighbors.' It says Nigeria, salary-funded. Ruled out and
written down. Good, that's what my reviewer asks."

"Ring of 12, 24 transfers among them, 226,756.28. The number I care about is the cash-out: the note
says 109,887.89 through the money transfer service. Where did the tool get that? It's in the note,
which a person typed. I'd want that as a figure the tool computed and I can trace to rows."

**The path (case-path).** "Path tool. From ACC-365386 to ACC-580664. Why ACC-580664? My question has
no 'to'. I don't know where it ends -- that's the whole question. I'd never have typed that
account. I'd have to guess an end and try each one."

"But the table under it is actually useful: 365386 to 274887 Aug 6 9,260.78; 274887 to 640034 Aug
19 9,788.51; 640034 to 177247 Aug 21 9,861.02; then 177247 to 405902 Aug 4 13:56 -- and it says
'earlier than the hop before'. Good. That's exactly the thing I'd catch by eye, and it caught it.
Then 405902 to 580664 Aug 19."

"So this 'path' is five hops but it's not a flow. The fourth hop happened two weeks before the
third. And every amount is a bit different -- 9,260, 9,788, 9,861 -- so even the in-order hops
aren't one sum. It's the shortest line on a chart, not the route the money took. The side panel
even says ignoring direction it's two hops through the money transfer service, 'not a flow'. OK, so
it's telling me not to trust its own path. Why is it the tool you're showing me for 'where did it
go next' then?"

**The dated version (Sets and paths page, section 5).** "Moderator says there's another page. This
is the thing I actually want. 'Neighbors, Direction Out, Window Mar 4 to 17.' Then a line: 'Out of
ACC-233575, Mar 4 to 17: 3 transfers, $28,559.99, to 3 accounts; then 7 transfers out of them after
the one that reached them, $56,018.09... 2 transfers are earlier than the hop before and are not
counted.' That's one sentence I could drop into a narrative. Dashed line with a clock for the
backwards one. Rows with a 'time order' column saying 'in order' or 'earlier than the hop before
(Mar 9, 19:47)'. Yes. That is the pivot I build by hand, with the order check done."

"But it's March. Different file, different account -- ACC-233575. And there are pink dashed boxes
saying 'waits on the element'. So I can't do it on my August case. The August screens -- the ones
my case is actually on -- have 'Follow: All' and no window. So the thing that answers your question
isn't there for my case."

"And one thing even on the March one: 'after the one that reached them' -- fine, but it counts
$56,018 going out of accounts that received $28,559. It'll happily sum money that couldn't have
come from my account. It says 'not the same money' for the backwards ones, but not for 'more out
than in'. I'd still have to check balances."

**The Sets and paths screen.** "March transfers, merchant ACC-893168, 37 payers. Not my case. Set
intersect icons. Not what I need for this."

**The inspector (flagged account).** "Wait. ACC-365386 again -- but here it's 'Transfers, March
2026', country GB, alert time 2026-03-09. On the August screen it's country US, alert Aug 7. Same
account number, two countries? If I saw that in a real case I'd stop and raise a data-quality
ticket. I'm assuming you've just got two demo files, but I'm telling you, that would cost the
tool my trust on day one."

"There's a 'proposed' box: In $19,449.22, Out $28,587.48, summed by graphty. THAT is what I wanted
on the August account. In and out totals right on the account. And again it's marked proposed."

**Export (case-export).** "Findings report, figure, nodes and edges CSV. '4 files go to the
download folder. Nothing is uploaded.' Good. Names 46 accounts, 18 people outside the ring --
thanks for telling me before I send it. Would the edges CSV have the 'earlier than the hop before'
column? Not stated here. If it doesn't, I'm re-doing the order check in Excel anyway."

**Table dock page (glanced).** "Time column right after the two accounts, by default. Correct. Every
other tool puts it at the far right. Otherwise it's a table."

## Her answer to the task

"Where it went: the flagged account ACC-365386 got 3,479.70 from ACC-916833 on Aug 5, and the next
afternoon sent three transfers just under 10,000 -- 9,260.78 to ACC-274887, 9,662.37 to ACC-898028
and 9,139.58 to the money transfer service ACC-465572. The two personal accounts sat on it about two
weeks, then paid out: ACC-274887 on Aug 19, 9,815.97 to the money transfer service and 9,788.51 to
ACC-640034; ACC-898028 on Aug 21, 9,707.38 to the money transfer service. ACC-640034 went on to
ACC-177247 on Aug 21. Most of it ends at the money transfer service.

"Does the order make sense? Not as one sum moving forward. The account sent out about eight times
what arrived on the 5th, so the funds came from somewhere this file doesn't show. Each next account
also paid out more than it received from ACC-365386, so none of it is traceable as the same money.
One step on the 'path' happened before the step it supposedly follows. And two alerted members sent
similar amounts back into ACC-365386 on the 17th and 24th. That reads as a ring cycling structured
amounts and cashing out through the transfer service, not a layering chain. For the SAR I'd
describe it as coordinated structuring with circular flows, and ask for full statements with
balances before I claim any dollar went from A to C."

"How confident am I: fairly, on the dates and amounts, because they're in the table. I did the
adding and the in-versus-out in my head. The tool did not do it."

## Single Ease Question

**4 out of 7.** "The facts are all there and the table is good. The 'earlier than the hop before'
flag on the path is the best thing I saw. But for my actual question I had to hop account to
account and add it up myself, the path tool wanted an end I don't have, and the one screen that
answers this -- out only, a date window, a one-line summary -- is on another month's data and
marked as not built. On my case I got there the way I'd get there in Excel, only slower to set up."

## Would she use this instead of her current tool?

"Not instead of Excel. Maybe instead of i2 for the big cases, if two things are real: the dated
'out, after this date' neighbors with that summary line, and in-and-out totals on the account. i2
doesn't flag a hop that goes back in time, and that alone would save me an hour on a ring case.
But I'd need it on the file I'm working, not a demo, and I'd need the order check in the exported
CSV so my reviewer can see it without the tool. And it has to get past IT -- the 'nothing is
uploaded' line helps with that. Today, as shown on August: it's a nicer viewer for a table I
already have."

## Problems observed (in her words, with where)

1. **No 'where did it go next' on the case's own screens.** Alert triage, Neighbors menu: only
   hops and "Follow: All"; no Out-only, no date window. "Anything before the money arrived is not
   where the money went." Severity: high -- the task could only be done by hand.
2. **Path tool needs an end she does not have.** Alert triage, path frame: "My question has no
   'to'. I'd never have typed that account." Severity: high.
3. **The shown path is not a flow, and the tool says so only in small print.** Path frame: a hop
   dated Aug 4 follows one dated Aug 21; the side panel says the undirected route is "not a flow".
   "Why is it the tool you're showing me for where did it go next?" Severity: medium.
4. **No in-versus-out totals on the account, and nothing flags out greater than in.** Alert
   triage, account transfers: 3,479.70 in, 28,062.73 out next day; she added it in her head. The
   inspector's proposed totals exist only on the March file. Severity: high.
5. **Same account ID with different attributes on two screens.** Inspector: ACC-365386 is GB,
   alerted Mar 9 on the March file; on the August file it is US, alerted Aug 7. "That would cost
   the tool my trust on day one." Severity: medium.
6. **The dated trace is shown only on March data, marked not built.** Sets and paths section 5:
   the right answer, on another account and month. Severity: medium.
7. **The dated summary sums money that cannot be the same money.** Sets and paths section 5: the
   second hop counts 56,018.09 out of accounts that received 28,559.99; it excludes backwards
   transfers but not amounts beyond what arrived. Severity: medium.
8. **Canvas links carry no direction or amount.** Alert triage hop frames: "I can't tell who paid
   whom from the picture." Severity: low.
9. **Cash-out total exists only in a typed note.** Ring frame: 109,887.89 through the money
   transfer service is in Sarah's own note, not a computed, traceable figure. Severity: low.
10. **Unclear whether the edges CSV carries the time-order check.** Export dialog. Severity: low.

## What she liked

- The hop menu's sizes, with the reason 2 hops is 283 (two shops' customers), before committing.
- "Earlier than the hop before" on the path rows, and the dashed clock mark in the sketch.
- The dated summary line on the March page: "one sentence I could drop into a narrative."
- The ruled-out lookalike written down with its full-graph count.
- Time column right after the two accounts, by default.
- "4 files go to the download folder. Nothing is uploaded." and the head count before export.
