# Session: dated trace -- supply chain analyst (Dana)

Participant: Dana, supply chain risk analyst (study/personas/supply-chain-analyst.md). Excel and
Power BI every day; not a banker, not a network person.
Mode: voluntary trial. The task is outside her domain (bank transfers, not suppliers); she was
told to treat "account" like "supplier" and "transfer" like "shipment" if that helps, and she did.

Task as given: "Money arrived in the flagged account in early August. Follow where it went next
and tell me whether the order of the transfers makes sense."

Material worked from: the alert triage screens in the order a participant meets them (the file
opened, the flagged account found, the hop menu, one hop, the account's own transfers, two hops,
the Path tool), plus the sets-and-paths, inspector and table-dock pages. Renders were read; page
HTML was read only to see what a menu offers.

## Think-aloud

**1. The file opens.** (shots/alert-triage/open.png)

"OK. Grey honeycomb, orange diamonds. I'm guessing the diamonds are the flagged ones -- yes, the
little box says 'Alerts, alert is true, 50'. And '2,950 nodes drawn as density'. Nodes. Fine, the
accounts. So it didn't try to draw three thousand dots at me. That's already better than the Power
BI visual, which would still be spinning.

Left side says 'Assistant Off. Nothing is sent.' Good. That's the first thing IT asks me. I'll
come back to that.

Which one is 'the flagged account'? There are fifty. The table's sorted by alertId... AL-40122,
ACC-365386, risk 92, 'Structuring: 3 or more transfers of 9,000...'. That's the highest number
I can see and it's the one that's about moving money, so I'll assume that's the one you mean.
If you meant a different one, you should have said -- I'm not reading fifty rows."

**2. Find the account.** (shots/alert-triage/seed-find.png)

"Search box, paste ACC-365386, Enter. One hit, it's ringed on the picture, row highlighted in the
table. Right panel: personal, US, risk 92 -- and it tells me the 92 came from the accounts file,
'not computed by graphty'. I like that. When my risk platform shows me a score I never know where
it came from.

alertTime Aug 7 02:17. '8 neighbors, In 3, Out 5.' Three things paid it, it paid five. That's the
bit I want: who it paid."

**3. The Neighbors menu.** (shots/alert-triage/seed-menu.png)

"There's a 'Neighbors' button with a little arrow. Hops from ACC-365386. '1 hop - 9 nodes, 13
edges.' 2 hops, 283. 3 hops, 2,122. OK, I don't really say 'hop', but I get it -- one step out,
two steps out. Like tier 1, tier 2. The 283 has a sentence -- 'mostly through a Pharmacy and a
Streaming' -- so two steps out is basically everyone who shops at the same chemist. That's the
same as when every supplier turns out to buy from the same distributor. Useless. I'll stay at
one.

There's a line 'Follow ... All' with an arrow. I don't know what that is. Follow what? If it
means 'follow the money out', I want that. I'd click it, but I can't see what's under it, so I'm
leaving it on All. What I actually want is 'only what went out after the money came in', and
nothing in this menu says anything about dates.

'Filter to neighbors, 1 hop.' Click."

**4. One hop.** (shots/alert-triage/seed-hop1.png)

"Nine dots. Readable, labels on each. But the lines have no arrows, so from the picture I can't
tell who paid who. Doesn't matter, I'm going to the table anyway; tables are where I live.

Edges tab, 13 rows, sorted by amount, largest first. Hm. I want it by date. Source, target, time,
amount. The top one's an Aug 17 payment IN to our account. The Aug 6 ones are further down.
This mixes everyone's transfers, not just our account's -- ACC-274887 paying ACC-465572 is in
here too. OK, that's actually the 'where it went next' bit, so I'll want it in a minute."

**5. The account's own transfers, by date.** (shots/alert-triage/seed-own.png)

"I clicked the account in the picture and the table changed -- 'Edges of the selection,
ACC-365386: 8 of 13 edges. Sorted by time.' It told me it changed, in the grey line on top,
which I only noticed because the rows got shorter. Fine. Now it's a statement. Reading it like a
stock ledger:

- Aug 3 07:21 -- out 90.81 to ACC-597001. That's the pharmacy. Petty cash.
- Aug 5 09:09 -- IN 3,479.70 from ACC-916833. That's your 'money arrived in early August'.
- Aug 6 15:21 -- out 9,260.78 to ACC-274887
- Aug 6 15:44 -- out 9,662.37 to ACC-898028
- Aug 6 17:42 -- out 9,139.58 to ACC-465572 (the right panel earlier said that one is a
  'Money transfer' merchant)
- Aug 17 12:43 -- IN 9,863.99 from ACC-796219
- Aug 24 13:28 -- IN 9,326.81 from ACC-228299

Wait. 3,479 comes in, and the next afternoon about 28,000 goes out -- I make it 28,062.73 on my
calculator, the tool didn't add it up for me. That's like receiving 350 units and shipping 2,800
the next day. Either there was stock on the shelf before August that this file doesn't show me,
or it isn't the same money. Then after it's gone, two big amounts come IN, on the 17th and 24th.
Restocking after you've shipped. In my world that's an expediter covering a shortage. In a bank
I'd guess somebody is topping the account back up.

All three going out are just under 10,000. Even I know what that looks like -- the alert name
says it: structuring. And the alert fired that night, Aug 7 02:17, after the third one."

**6. Where it went next -- one more step.** (back to shots/alert-triage/seed-hop1.png, then
shots/alert-triage/case-hop2.png)

"Now 'next'. The three that received money: ACC-274887, ACC-898028, the transfer service. I go
back to the step's 13 rows -- click empty canvas, I suppose, to drop the selection -- and pick out
the rows that start with those accounts:

- ACC-274887 -> ACC-465572 (the service), Aug 19 16:56, 9,815.97
- ACC-898028 -> ACC-465572, Aug 21 17:39, 9,707.38

So what went out on Aug 6 sat for about two weeks and then went to the money transfer service.
And ACC-796219 and ACC-228299 -- the two that paid our account later -- ALSO pay the same service,
Aug 17 and Aug 24. Everybody in this little group pays the service. I don't know what happens
inside a money transfer service; I'd call it a dead end, like a freight forwarder: stuff goes in,
and I can't see which shipment comes out where.

The one-hop table doesn't show ACC-274887's other payments, only the ones inside the nine. I
tried two hops to see them. 283 accounts, 470 rows, sorted by amount. There: ACC-274887 ->
ACC-640034, Aug 19 15:09, 9,788.51. So 274887 paid two people on Aug 19, both just under ten
thousand, and it only got 9,260 from us. Same thing again: more out than in, unless it had money
already.

This is where I'm doing it by eye. I'm scanning 470 rows for three account numbers and comparing
dates in my head. In Excel I'd put a filter on source and a date filter 'after Aug 6'. Here I
couldn't find either -- I'd have to use the magnifier on the table, which I assume is a search,
and search one account at a time."

**7. The Path tool.** (shots/alert-triage/case-path.png)

"There's a tool at the bottom with a squiggle -- From, To, 'Along transfers', Run. This screen
already has From ACC-365386 To ACC-580664. I didn't pick 580664 and I don't know why that one;
someone else set this up. But let's read it, it's the kind of 'follow it all the way' thing I
wanted.

365386 -> 274887 Aug 6 15:21
274887 -> 640034 Aug 19 15:09
640034 -> 177247 Aug 21 12:07
177247 -> 405902 Aug 4 13:56 -- 'earlier than the hop before'
405902 -> 580664 Aug 19 16:16

OK so the first three are in order: 6th, 19th, 21st. Then it goes BACK to August 4th. That's
before our money even arrived. So this chain is not the money moving -- it's just who has ever paid
who. It told me so, in small grey writing next to the date, and on the right it says 'Ignoring
direction... it is not a flow from one to the other'. I nearly missed the grey bit. That's the
single most important line on the screen and it's the lightest text on it. On my laptop at 110%
I would not have read it without my glasses.

What I'd want is the opposite: a 'Run' that only follows transfers that happened after the one
before. Then whatever it finds actually could be the same money. As it is, it finds me a route
and then warns me the route is wrong."

**8. Checking the other pages.** (shots/screens__sets-and-paths.png, sets-and-paths-s5.png,
screens__inspector-path.png, screens__table-dock.png)

"These are other data -- March transfers, then proteins, then Les Miserables? I'm skipping the
protein one. The March path shows 'amount: what it means', 'a higher number means a closer or
stronger link'. I don't know why a transfer would be 'closer'. Not my question. The Path panel on
March says 'Direction: follows transfers'. Nothing anywhere about following dates. The table page
has a paragraph at the top; I read the heading and skipped it."

## Answer to the moderator

"Money came in on Aug 5 -- 3,479.70 from ACC-916833. The next afternoon, Aug 6, the account sent
out three payments just under ten thousand each, about 28,000 in total, to ACC-274887, ACC-898028
and the money transfer service ACC-465572. Two weeks later, Aug 19 and 21, the two personal
accounts passed about the same amounts on -- to the transfer service and to ACC-640034.

Does the order make sense? Not as one pot of money moving along. Far more went out than came in,
so the 3,479 can't be what paid for it. Then fresh money came in after (Aug 17 and 24) from
accounts that also pay the same transfer service. It looks like a group of accounts taking turns
topping each other up and cashing out through one service, each payment kept under ten thousand.
And the long chain the Path tool draws isn't the money either -- one of its steps is dated before
the money arrived. That's my read. I'd want someone who does banks to check it."

## Single Ease Question

**5 out of 7.** "Finding the account and reading its own payments by date was quick -- two clicks
and it's a statement. Going one step further was the hard part: I scanned a big table by eye and
did the adding up myself, and the tool that says 'follow' doesn't follow dates."

## Would you use this instead of your current tool?

"No, not instead. For this job, honestly, the account's own statement sorted by date I could do in
Excel in ten minutes. The bit it did that Excel doesn't do quickly is going one step out and
keeping the dates next to each account, and that little 'earlier than the hop before' warning --
that's real, I'd have missed that in a pivot. If it had an 'only after the one before' switch and
added up in versus out, I'd take it seriously for tracing a part through tiers, because that's
exactly my problem with lot dates.

But it's a side tool. Same questions as always: does IT approve it, and can I get this table into
Power BI? The 'nothing is sent' line helps with the first one. Nothing I saw answers the second."

## Problems observed

1. There is no way to follow only the transfers that happen after the one before. The hop menu's
   'Follow' offers a direction, and the Path tool follows direction, so the chain it finds can run
   backwards in time; the tool warns afterwards instead of letting her ask for a dated trace.
   (Hop menu, Path tool; severity 3.)
2. Money in versus money out is never totalled for an account or a window. She had to add 28,062.73
   by hand to see that 3,479.70 in cannot fund it -- the central fact of the task. (Edges tab,
   inspector; severity 3.)
3. The key warning, "earlier than the hop before", is small grey secondary text; the inspector's
   "not a flow" line is also plain body text in a long paragraph. She nearly missed both and would
   not have read them on her laptop. (Path tool table; severity 2.)
4. Following the next step means scanning a 470-row table by eye for three account numbers; she
   found no filter by source account or by date in the table. (Edges tab at two hops; severity 2.)
5. The one-hop drawing has no arrowheads, so she could not see who paid whom without the table.
   (Canvas, one hop; severity 2.)
6. The step's Edges tab opens sorted by amount; she wanted time, and the tab silently switches
   scope when she selects an account -- she noticed only because the rows got fewer. (Edges tab;
   severity 2.)
7. "Follow ... All" in the hop menu does not say what it follows; she guessed it might mean "follow
   the money" and could not see what else it offered. (Hop menu; severity 2.)
8. The Path tool screen came with a To account she did not choose and could not explain; she had
   no way to ask "where does it end up" without first knowing the end. (Path tool; severity 2.)
9. Screens on other data (March transfers, proteins, novel characters) broke the thread; she
   skipped them. (Sets-and-paths, inspector, table-dock pages; severity 1.)

## What she liked

- "Nothing is sent" visible from the first screen, without asking.
- The risk score says which file it came from and that the tool did not compute it.
- Two steps out is sized before she commits, with a sentence saying it is mostly a pharmacy and a
  streaming service -- she stayed at one step because of it.
- Selecting the account turns the edge table into a dated statement in one click.
- The "earlier than the hop before" warning caught something she would have missed in a pivot.
