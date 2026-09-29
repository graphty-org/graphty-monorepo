# Session: follow the August money and check its order -- Priya, threat hunter

Participant: Priya, senior threat hunter in a bank SOC (study/personas/cybersecurity-analyst.md).
Lives in Splunk and a Jupyter notebook; uses BloodHound's raw Cypher box; dark mode; about half a
1440p monitor for any new tool.

Task as given: "Money arrived in the flagged account in early August. Follow where it went next
and tell me whether the order of the transfers makes sense."

Material worked from: the alert triage screens (the queue, Find, the hop menu, one hop, the
account's own transfers, two hops, the 9,000-to-9,999 step, the Path tool, the rule editor), the
sets-and-paths flow, the inspector and the table dock. All renders in dark mode, study view.
Page HTML was read only to see the table rows below the fold and what the hop menu and the Path
form offer.

Renders cited (all in shots/): r4-priya-dated-at-open.png, -at-seed-find.png, -at-seed-menu.png,
-at-seed-hop1.png, -tall-seed-hop1.png, -at-seed-own.png, -at-case-hop2.png,
-at-case-distractor.png, -at-case-path.png, -at-rule.png, -ins-flagged.png, -td-out.png.

## Think-aloud

**0. Before anything.**

"Same three questions as always. Is it approved, where does it run, does it phone home. Left rail
says 'Assistant Off. Nothing is sent.' OK, that's one of the three, sort of. It says the
assistant sends nothing -- it doesn't say the app sends nothing. In a real trial I'd stop here
and ask. And this is transfer data, which in my bank is the fraud team's data, not mine. I would
not be loading this. For the study, fine.

Also -- this is a fraud question. I hunt logons, not money. But a hop is a hop. 'Where did it go
next and does the order make sense' is lateral movement with dollar signs on it. Let's see."

**1. The file opens.** (r4-priya-dated-at-open.png)

"Hexagons. Orange diamonds. Legend: 'alert is true, 50'. '2,950 nodes drawn as density.' OK, so
it's telling me what it didn't draw. Good, I like that it says the number.

Table: 'Rule set Alerts: 50 of 3,000 nodes. Sorted by alertId.' Fine.

Now -- 'the flagged account'. Which one? There are fifty. The moderator said 'the flagged
account' like there's one. I'm not going to ask, I'll guess: the task says money arrived and
went somewhere, so I want the one alerted for money going out. Scanning the alertScenario
column... AL-40122, ACC-365386, 'Structuring: 3 or more transfers of 9,000...', riskScore 92,
highest on screen. That's my pick. If it's the wrong account the whole session is wrong, and I'd
say that in the write-up.

Time range. What time range is this file? Chip at the top says 'transfers-2...' -- truncated.
Hover would probably give me transfers-2026-08.csv. So August. Is it ALL of August? Does it
start Aug 1 at 00:00? Is there any July in here? Nothing on screen tells me the first and last
timestamp in the file. In Splunk every search has a time picker. Here I'm inferring the range
from a filename. Park that; it's going to matter."

**2. Find the account.** (r4-priya-dated-at-seed-find.png)

"Search box on the left. I'd try '/' first -- no idea if that works, the mock doesn't say. I'll
paste ACC-365386. One hit, 'personal, US; in Alerts'. Selected, ring around the diamond, row
highlighted in the table.

Inspector: riskScore 92, 'From accounts-2026-08.csv... not computed by graphty.' Good. alertTime
Aug 7 02:17 UTC, 'From tm-alerts-2026-08.csv'. Good -- it tells me which file each field came
from. That's exactly the thing I'd have to write in a case note. Connections: 8 neighbors, In 3,
Out 5.

Toast says 'Delete step ACC-749505 and neighbors -- Undo'. That's someone else's leftover. Ignore."

**3. How far do I look?** (r4-priya-dated-at-seed-menu.png)

"Neighbors has a caret. Menu: 'Hops from ACC-365386'. 1 hop, 9 nodes, 13 edges. 2 hops, 283,
'Mostly through ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219 (Streaming, 109)'. 3 hops,
2,122.

OK, that's actually good. That is the Sentinel flood problem answered before it happens: it
tells me 2 hops explodes and WHY -- two shops. I'd take 1 hop.

Then 'Follow: All'. Follow what? All what? I think that's direction. I want 'where did it go
NEXT', so I want out. I'd click it and hope it says In / Out. The render doesn't show me the
options, so I'm guessing. There's no date row. I want 'from Aug 5 onward'. Nothing here takes a
time. So I'm going to have to do the time part by eye.

Filter to neighbors, 1 hop, Shift+N. Keyboard shortcut, noted."

**4. One hop.** (r4-priya-dated-at-seed-hop1.png, r4-priya-dated-tall-seed-hop1.png)

"Nine dots. Chip: 'Filtered: 9 of 3,000 nodes'. Legend: 5 alerted. Lines between them have no
arrows. I can't tell who paid whom from the picture, and I honestly don't care -- I'm going to
the table.

Edges tab: 'Filtered graph: 13 of 9,171 edges. Sorted by amount, largest first.' Columns source,
target, time (UTC), amount. Time is right after the two accounts. Good.

I don't want it by amount. I want it by time. That's my timeline. Click the time header, I
assume that sorts.

Aside: on half my monitor, 1280 wide, the inspector gets cut off on the right -- I can see
'ACC-3...' and the labels but none of the values. Might just be the mock being a fixed size. If
the real thing does that, it's a problem, because half a monitor is all it's getting."

**5. The account's own transfers, in time order.** (r4-priya-dated-at-seed-own.png)

"Select ACC-365386 again. Header changes: 'Edges of the selection, ACC-365386: 8 of 13 edges in
the filtered graph. Sorted by time.' Good, it tells me the table followed the selection and the
count went from 13 to 8. That's the kind of thing I'd normally get wrong in a pivot.

Reading it as a timeline:

- Aug 3 07:21 -- out 90.81 to ACC-597001 (pharmacy). Noise.
- Aug 5 09:09 -- IN 3,479.70 from ACC-916833. That's the 'money arrived in early August'.
- Aug 6 15:21 -- out 9,260.78 to ACC-274887
- Aug 6 15:44 -- out 9,662.37 to ACC-898028
- Aug 6 17:42 -- out 9,139.58 to ACC-465572
- Aug 17 12:43 -- in 9,863.99 from ACC-796219
- Aug 24 13:28 -- in 9,326.81 from ACC-228299
- (the eighth, below the fold: Aug 30, 168.28 to the streaming service)

Three out in two hours twenty minutes, all just under ten grand. Alert fired Aug 7 02:17, the
night after. Fine, the alert makes sense.

But the order. 3,479.70 in. Next day 28,062.73 out -- I added those three in my head, the tool
didn't. That's eight times what came in. So 'follow the money that arrived' is already broken:
the money that arrived can't be the money that left. It was either sitting on a balance, or
there's an inflow I can't see. Which is my time range question from step 1: is there July in
this file or not? If the file starts Aug 1, I can't tell whether this account got 25 grand on
July 30. Nothing on screen tells me where the data starts.

And the two big inflows come AFTER the outflows. Aug 17 and Aug 24. Pays out first, gets
refilled later. That's backwards for a pass-through."

Workaround: summed the three outflows by hand. No in-versus-out total on the account.
Workaround: file's date coverage inferred from the filename.

**6. Where did it go next -- the three receivers.** (r4-priya-dated-at-seed-hop1.png, table rows
below the fold)

"Now I need what ACC-274887, ACC-898028 and ACC-465572 did AFTER Aug 6. Going back to the 1-hop
table, the rows between them:

- ACC-274887 -> ACC-465572, Aug 19 16:56, 9,815.97
- ACC-898028 -> ACC-465572, Aug 21 17:39, 9,707.38

And ACC-465572 -- look it up, it's a merchant, category 'Money transfer'. So the third outflow
went straight into a money transfer service. That's the cash-out. After that the trail leaves
the bank. Nothing here can follow it, and nothing should; that's a subpoena, not a graph.

But 1 hop only shows edges between the nine. What else did 274887 and 898028 send? I need 2
hops, out only, from Aug 6 onward. The tool's 2-hop is 283 accounts, both directions, all
month."

**7. Two hops.** (r4-priya-dated-at-case-hop2.png)

"'Filtered: 283 of 3,000 nodes', 470 edges, sorted by amount. Top of the list, the ones I care
about:

- ACC-274887 -> ACC-640034, Aug 19 15:09, 9,788.51
- ACC-274887 -> ACC-465572, Aug 19 16:56, 9,815.97
- ACC-898028 -> ACC-556231, Aug 21 12:15, 9,736.88

To get those I scanned 470 rows sorted by amount for two source IDs. In Splunk that's
`source IN (ACC-274887, ACC-898028) earliest=08/06 | sort _time`. Here there's a table search
icon -- maybe it filters rows, maybe it just highlights. I don't know. I'd try it. If it's
highlight-only I'm scrolling.

So the chain in time order:

- Aug 5 09:09 in 3,479.70 (ACC-916833 -> ACC-365386)
- Aug 6 15:21 to 17:42 out 28,062.73 in three pieces
- Aug 19 15:09 and 16:56 ACC-274887 moves 19.6k on: one to ACC-640034, one to the money
  transfer service
- Aug 21 12:15 and 17:39 ACC-898028 does the same: ACC-556231, then the money transfer service

Every receiver sits on it thirteen to fifteen days, then splits it the same way in the same
afternoon: one to another personal account, one to the service. Same shape, twice. That's a
playbook, not coincidence."

Workaround: built the hop chain by hand from two tables; no 'hop' column, no 'only after the
transfer that reached them'.

**8. The refills.** (1-hop table again)

"Go back to those two late inflows. ACC-796219 pays ACC-365386 9,863.99 on Aug 17 12:43, and
pays ACC-465572 9,782.28 at 13:35. Fifty-two minutes apart. ACC-228299 pays ACC-365386 9,326.81
on Aug 24 13:28, and the service 9,616.35 at 14:09. Forty-one minutes.

Same pattern again, from the other side. Each of these accounts pays one ring member and the
money transfer service within the hour. This is a ring rotating money through the service, not
one sum being passed down a chain. I would never have seen the 52-minute thing in a picture. I
saw it because the table sorted by amount happened to put those rows next to each other.
Honestly -- that was luck."

**9. Would the Path tool help?** (r4-priya-dated-at-case-path.png)

"There's a Path tool: From, To, 'Along transfers', Run. But my question doesn't have a To. 'Where
did it go' is one-ended. I'd only use this if I already knew the destination.

Looking at the example anyway: ACC-365386 to ACC-580664, 5 hops. One row says 'Aug 4 13:56
earlier than the hop before'. OK, credit where it's due: it flags the hop that goes back in
time. That's the exact check I'm doing by eye. And the side panel says ignoring direction it's 2
hops through the service, 'not a flow'. Good that it says that, but it's small grey text.

What I actually want is that 'earlier than the hop before' mark on MY one-ended question. Out
of ACC-365386, from Aug 5, hops only forward in time. The sets-and-paths flow page draws exactly
that -- a Window row on the Neighbors menu, hops that go backwards dashed with a clock -- but
it's on the March data, and it's marked as not built. So the answer exists on a different
account in a different month. Not on mine."

**10. The typed rule.** (r4-priya-dated-at-rule.png)

"Oh -- a box I can type into. 'Where: amount between 9000 and 9999.99'. 25 nodes, 42 edges,
before I commit. 18 of 25 alerted. That's the closest thing to a query I've seen in here. Can I
write `source in (...) and time >= 2026-08-06`? Don't know. Nobody shows me the grammar. If I
could, that would have saved me steps 6 and 7. If I can't, it's a filter box that looks like a
query box.

'Create rule set' -- so I can keep it. That's the 'can I run it next month' question, maybe."

**11. Checking the account on the inspector page.** (r4-priya-dated-ins-flagged.png)

"Wait. Same ID, ACC-365386, but here it's 'Transfers, March 2026', country GB, alertTime
2026-03-09. On the alert screens it was US, August. Same ID, different country. If that happened
in a real tool I'd stop trusting every field. I know it's a mock, but that's exactly the kind of
cross-check I do in the first two minutes.

This page does have 'amount, totals: In $19,449.22, Out $28,587.48, summed by graphty from
transfers-2026-03.csv'. That's the thing I wanted in step 5. It's on the wrong month's page."

**12. Getting it out.** (r4-priya-dated-at-seed-own.png, r4-priya-dated-td-out.png)

"Export: 'Export the selection's edges... 8 transfers: time and amount.' CSV. The export dialog
shows me the rows and the file name before anything's written. Good. For the case I'd select the
five accounts in the chain and export their edges, then re-sort in Splunk or pandas. Which
means the real analysis -- the time ordering -- happens back in my notebook."

## Her answer to the moderator

"I took ACC-365386, alert AL-40122. You said 'the flagged account' and there are fifty, so if
that's the wrong one, tell me.

Money in: 3,479.70 from ACC-916833 on Aug 5, 09:09 UTC.

Next day, Aug 6, 15:21 to 17:42: three transfers out, 28,062.73 total, each just under ten
thousand -- to ACC-274887, ACC-898028 and the money transfer service ACC-465572.

Then: ACC-274887 moved it on Aug 19 (to ACC-640034, then the service); ACC-898028 on Aug 21 (to
ACC-556231, then the service). The money transfer service is where I lose it.

Does the order make sense? Not as 'the money that arrived went there next'. Eight times more
left than arrived, the refills came after the outflows (Aug 17 and 24), and the receivers held
it for two weeks. It does make sense as a ring cycling money through one money transfer service:
twice, an account paid a ring member and then the service within the same hour. I'd need to
know whether the file has anything before Aug 1 before I'd sign that, and the tool doesn't tell
me the file's date range. I'd hand this to the fraud team, it's theirs."

## Single Ease Question

**3 out of 7.**

"Finding the account and reading its own transfers in time order was easy -- that part's a 6.
Then 'where did it go next' fell apart: no direction or date on the hop menu, no in-versus-out
totals, and I stitched the chain together from a 470-row table sorted by the wrong column. The
thing that does exactly this job is drawn on a page about March, marked not built. And I found
the most important pattern by luck."

## Would she use this instead of her current tool?

"No, not for this. For this exact question my notebook is ten lines: filter by source, time
after the inflow, sort by time, group by hop. I'd get it faster and I'd have the record of what I
ran.

What I'd steal: the hop menu that tells me the size and WHY before I commit, the 'earlier than
the hop before' flag, and the inspector saying which file each field came from. If the Neighbors
menu got Out plus a date window, and the typed rule box took time and source, I'd try it for the
first look at a case -- as a pivot tool, before the notebook. Not instead of it. Also, before any
of that, it has to be on the approved list, and it has to say what it does and doesn't send,
about the whole app, not just the assistant."

## Problems, in her words

1. **One-ended trace has no direction or date.** Hop menu: "Follow: All -- all what? And where do
   I say 'from Aug 5'?" High.
2. **The dated trace exists only on the March page, not built.** Sets-and-paths flow section 5:
   "The answer's drawn, on a different account in a different month." High.
3. **No in-versus-out totals on the account.** Own-transfers frame: "3.5k in, 28k out -- I did
   that in my head. That's the single most important number." High.
4. **The file's date coverage is not stated anywhere.** Open frame, chip: "Which time range is
   this? Is there any July in here?" High.
5. **No hop column or 'after the transfer that reached them' in the 2-hop table.** Two-hop frame:
   "I built the chain by hand from 470 rows." Medium.
6. **Path tool needs a To.** Path frame: "My question doesn't have a To." Medium.
7. **Rule box grammar unknown.** Rule frame: "Can I type time and source in there? Nobody shows
   me." Medium.
8. **Same account, two different attribute sets.** Inspector page vs alert triage: "US here, GB
   there. In a real tool I'd stop trusting it." Medium.
9. **"The flagged account" is ambiguous with 50 alerts.** Open frame. Low (task wording, not the
   tool).
10. **"Nothing is sent" is scoped to the Assistant only.** Left rail. Low.
11. **Canvas edges have no arrows.** Hop frames: "Can't tell who paid whom from the picture." Low.
12. **At 1280 wide the inspector's values are cut off.** Tall one-hop render. Low (may be the
   fixed-size mock).

## What she liked

- The hop sizes, and why 2 hops jumps to 283, before committing.
- The table header saying what it's showing and how many of how many, and following the
  selection (13 edges to 8).
- The time column right after the two accounts, sortable, with UTC in the header.
- "From tm-alerts-2026-08.csv" and "not computed by graphty" on each field.
- "Earlier than the hop before" on the path rows.
- A typed Where box with counts before commit.
- Export dialog shows the rows and file name first.
