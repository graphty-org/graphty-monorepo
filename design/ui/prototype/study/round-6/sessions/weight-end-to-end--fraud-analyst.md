# Session: cheapest route and most central accounts, using the transfer amounts -- Sarah, fraud analyst

Participant: Sarah, complex-case fraud investigator (study/personas/fraud-analyst.md). Mode: first
impression, not mandated -- she gives it the time a real case would allow, and says when she would
stop.

Task as read to her: "The transfers have an amount on each one. Find the cheapest route between two
accounts and the most central accounts, and tell me what each answer used."

Screens, as she saw them (study view, design notes hidden), all in `shots/`:

| Step | Screen and state | Render |
|---|---|---|
| 1 | Main frame at rest, transfers file | `r6-sarah-we2e-frame-at-rest-dataset-transactions-s1.png` |
| 2 | Sets and paths, 3: path tool | `r6-sarah-we2e-sets-and-paths-s3.png` |
| 3 | Sets and paths, 4: found path | `r6-sarah-we2e-sets-and-paths-s4.png` |
| 4 | Sets and paths, 5: what amount means | `r6-sarah-we2e-sets-and-paths-s5.png` |
| 5 | Run and read: "money" typed in Quick actions | `r6-sarah-we2e-run-and-read-money.png` |
| 6 | Run and read: Money in, read | `r6-sarah-we2e-run-and-read-money-read.png` |
| 7 | Run and read: the catalog (protein data) | `r6-sarah-we2e-run-and-read.png` |
| 8 | Weight trap A3 and A6 (Les Miserables data) | `r6-sarah-we2e-weight-role-trap-a3.png`, `-a6.png` |
| 9 | Results panel, finished (protein data) | `r6-sarah-we2e-results-panel-finished.png` |
| 10 | Table dock, edges and export | `r6-sarah-we2e-table-dock-edges.png` |

## Think-aloud

### 1. The file is open

> "OK. Transfers, March 2026. 3,000 accounts, 9,113 -- 'edges (rows)', fine, rows I understand,
> that's my transaction count. A grey blob. No labels. As expected.
>
> Right side: 'Loaded: transfers-2026-03.csv, direction followed, amount not used yet. Change...'
> That's the first thing on this screen I actually read. 'Amount not used yet.' Good -- it's telling
> me straight out it isn't looking at the dollars. Most tools don't tell you that, they just draw.
>
> So the obvious move: click Change... and turn amount on. That's where I'd go. I'd expect to tell it
> once, 'amount is dollars, use it', and be done for the whole case."

(Moderator note: in the design, Change... on that line reopens the load choices; what a bigger
amount means is not set there but asked by each run. She was not told this.)

> "And 'Nothing has been sent from this project', top left. I noticed. Keep that."

### 2. Cheapest route: the path tool

She looked for anything that said "path" or "route". The toolbar's second icon (two joined nodes)
opened the path bar.

> "From, To. Good, that's the right question. I paste ACC-271813 in From, ACC-233575 in To.
>
> Scope says 'Filtered graph' with a warning, and underneath: 'From is outside the filtered graph.
> Set Scope to Full graph to search it.' Fine -- clear, it told me what to do. I'd have been annoyed
> if it just said 'no path'.
>
> Weight: 'amount, not used yet'. There it is again. So the path ignores money unless I change that.
> I want the cheapest route, so I need amount in there. I'd open that dropdown before I press Run."

(She could not see the dropdown's options on this state; she pressed Run, as the screen shows next.)

### 3. The found path

> "3 hops. Start at the bottom, end at the top, arrows. Right panel: 'Found path (unweighted)'.
> 'Weight: amount, not used yet.' 'Paths ignore amount: hops were counted, not dollars.'
>
> OK, that's honest. That's exactly the sentence I'd want in my notes. It didn't pretend to be the
> cheapest; it's the fewest hops. I'd have missed '(unweighted)' in grey, but the line underneath I
> can't miss.
>
> And the table underneath -- this is the part I care about. Step 1, 2, 3, source, target, time,
> amount. $3,530.28 on March 4, then $9,782.05 on the 7th, $9,616.72 on the 8th. That's a pass-through
> pattern right there, in and out under ten grand, a day or two apart. I'd screenshot this table
> before I'd screenshot the picture.
>
> 'Ties: 1 of 2 as short.' So there's another 3-hop route. Where is it? I want both. If I'm writing
> this up and there's a second route the same length, the reviewer will ask why I picked this one."

(The edges table in the table-dock page later showed both routes, five rows, with "1 of 2" and
"2 of 2" and "Sum of amount, 5 rows: 41,796.59 USD". She found that only because she was going
through the table pages, not from this panel.)

### 4. Making it use the dollars

She clicked the Weight row in the right panel. The small editor opened.

> "Weight: amount. 'In this run, a bigger amount means:' -- 'a closer or stronger link'. Then:
> 'Distance = 1 / amount. The path prefers big transfers.' And a Re-run button.
>
> Hm. Wait. I asked for the cheapest route. This says it prefers big transfers. That's the opposite
> of cheap, isn't it? If cheapest means the least money moved, I want the other thing -- a bigger
> amount is a *bigger* cost. Is there another answer in this list? It's a dropdown, so presumably.
>
> Honestly though -- 'cheapest' is your word, not mine. In my world nobody wants the cheapest route.
> I want the route the money actually took, which is the big transfers. So 'prefers big transfers' is
> what I'd pick on a real case. But for your question, I'd pick whatever the other option is.
>
> 'Distance = 1 / amount.' I'm not a maths person, but I get it: big number, short distance. Fine.
> I'd copy that line into my notes as-is.
>
> What I don't get to see is the answer. I press Re-run and... this is where the screens stop. Does
> the path change? Does it still say 3 hops? What does the panel say afterwards -- does it still say
> 'unweighted'? I can't tell you what the weighted route is, because I never saw it."

She then looked at the weight trap screens (Les Miserables) to see the dropdown open.

> "There -- two answers: 'a longer or costlier step, Distance = value' and 'a closer or stronger
> link, Distance = 1 / value'. So for cheapest I pick 'a longer or costlier step'. Costlier -- yes,
> that's the one that matches the question. Good that the word 'costlier' is actually in there; I'd
> have found it.
>
> But this is a book. Valjean, Javert. I'm reading your transfers case through a novel. I'll assume
> it works the same on money."

### 5. Most central accounts

> "'Central' -- that's not my word. I'd say the hub. The account everything touches, or the account
> the money runs through. So which one do you mean? I'll try money first."

She opened Quick actions and typed "money" (run-and-read, state 5).

> "Oh, that's nice. 'Money: sums of amount, in dollars.' Money in, Money out, Money in minus out --
> 'what each account kept'. That last one is a pivot I build every single case. And then separately,
> 'Counts of transfers, not money': links in, links out. Good -- it keeps the counts and the dollars
> apart. That's the mistake juniors make in Excel all the time."

She ran Money in.

> "'Money in, Sep 29 10:31.' 'On full graph, 3,000 accounts. Sum of amount, in dollars, on the
> transfers into each account. Directed. CPU.' Right, that's what it used. I can read that out to a
> reviewer.
>
> Top: ACC-393859, $440,784, 907 links in. That's a merchant. 907 senders -- that's a payment
> processor or a shop, not my mule. ACC-893168 at #3, $149,438 from only 37 transfers, 'fewer and
> larger' -- now THAT'S the interesting one. It even says it in words. That's the line I'd paste.
>
> So is this 'most central'? By my definition, kind of. But I suspect you meant something else."

She went back to the catalog (run-and-read, the protein data) for anything else.

> "Betweenness: 'How often a node lies on the shortest paths between other nodes: the brokers and
> bottlenecks.' Brokers. OK, that I can use -- that's a pass-through account, a mule sitting between
> the victims and the cash-out. That's what I'd want 'central' to mean. I'd click it because of the
> word 'brokers', not because of 'betweenness'.
>
> But this screen is proteins. MAPK1, TP53. And the other one's a novel. There's no screen where I run
> the broker thing on my transfers with the amounts. So I'm guessing: I click Betweenness, it asks me
> the same 'a bigger amount means' question -- based on the book screens -- I pick... what? Brokers of
> big money. 'A closer or stronger link', I suppose, so big transfers count as the main roads. That's
> the opposite of what I picked for cheapest. Same column, opposite answer, depending which question
> I'm asking. I think that's right? It makes me slightly nervous.
>
> The book screen does show why it matters: run it one way, Javert is third; run it the other way,
> he's 45th. And the run list says 'Run 1. Distance = value', 'Run 2. Distance = 1 / value' right
> under each one. Good. Both stay. That's my audit trail -- I can show the reviewer I ran it both ways
> and which one I used."

### 6. Telling you what each answer used

She read the finished results panel (protein data) for the wording.

> "'Weight: confidence, not used yet. Change...' at the top. Then further down under Options:
> 'Weight: None for this run.' Two ways of saying the same thing on the same panel. Pick one. If I
> copy one into the case file and my colleague copies the other, the reviewer thinks we ran two
> different things.
>
> And 'Exact' with the little note -- 'does not say the ranking is meaningful'. Ha. Fair enough."

Her answer to the moderator, as she would write it in her notes:

> "Route: ACC-271813 to ACC-233575, 3 hops, Mar 4 to Mar 8. Used: hops only, amount ignored -- the
> tool said so. There's a second 3-hop route; the edges table shows both, $41,796.59 across the five
> transfers. The dollar-weighted route: I set 'a bigger amount means a longer or costlier step' for
> cheapest, and I can tell you it would be labelled 'Distance = amount', but I never saw what route
> came back.
>
> Central: Money in, full graph, sum of amount in dollars, directed. Top is a merchant, I'd discount
> it. ACC-893168 is the one to look at: $149,438 from 37 transfers. Brokers weighted by amount: I know
> which button and which question, from the other datasets. I didn't see it on the transfers."

### 7. Export check

> "Export table... on the edges tab, and a CSV preview with UTC timestamps and 'amount (USD)' in the
> header. Good, the currency is in the header, not lost. That's going into Excel. Does the CSV
> say it was the unweighted path? Because if the file lands in the case without the 'hops, not
> dollars' line, it's just five rows with no story."

## Single Ease Question

**4 of 7.**

> "The parts I saw, I could do, and it told me the truth about what it used -- 'hops were counted, not
> dollars' is the best sentence on any of these screens. But half of your question I answered by
> looking at a novel and a protein map and assuming. And 'cheapest' against 'prefers big transfers'
> made me stop and think which way round it was. If I'd been on a deadline I'd have run it both ways
> just to be safe, which is fine, it keeps both."

## Would she use this instead of her current tool?

> "Instead of Excel? No. The Money in and Money in minus out totals are my pivot table with fewer
> steps, and I liked that it said 'fewer and larger' for me, but I can do that in ten minutes already
> and my reviewer reads Excel.
>
> Instead of i2, for finding a route between two accounts across three thousand of them with the
> dates and amounts in a table underneath? Possibly, yes -- i2 can't find that route for me, I draw
> it. That table of steps is the thing. But only if the dollar-weighted route actually comes back
> with the same honest label, and only if IT approves it. I'd want to see it on our real volumes
> before I told my manager anything."

## Where she hesitated or went wrong

1. **Change... on the file's line looked like the place to switch amount on for the whole case.**
   "Loaded: ... amount not used yet. Change..." invited her to set amount once, at the file. The
   meaning is asked by each run instead, so her first instinct points at the wrong place.
2. **"Cheapest" against "a closer or stronger link ... prefers big transfers".** The only pre-set
   answer she saw on the transfers was the opposite of the task's word. She worked it out only by
   finding the open dropdown on a different dataset, where "costlier" matched.
3. **The weighted path's result is never shown on the transfers.** After Re-run the screens stop.
   She could not say what route comes back, or whether the panel drops "(unweighted)".
4. **No broker (betweenness) run on the transfers with amounts.** The only weighted centrality run
   she saw was on Les Miserables; the catalog tooltip ("brokers and bottlenecks") was on proteins.
   She inferred the transfers flow from two unrelated datasets.
5. **The same column needs opposite answers for her two questions** (cheapest: costlier step;
   brokers of big money: closer link). She thinks that is right but it made her nervous; nothing on
   screen confirmed it.
6. **The results panel states the weight twice in two phrasings** ("Weight: confidence, not used
   yet" at the top, "Weight: None for this run" under Options).
7. **"Ties: 1 of 2 as short"** named a second route without a way to see it from the panel; she
   found both only in the edges table.
8. **Unclear whether an exported CSV carries what the answer used** (hops, not dollars).

## What worked for her

- "Paths ignore amount: hops were counted, not dollars." -- the line she would paste into her notes.
- "Found path (unweighted)" together with the step table: step, source, target, time, amount.
- Quick actions for "money" splitting dollar sums from transfer counts, and "Money in minus out".
- The Money in state line ("Sum of amount, in dollars, on the transfers into each account.
  Directed.") and the plain-words read "37 transfers, fewer and larger".
- Each run in the list naming its conversion ("Run 1. Distance = value"), with both runs kept.
- The Scope warning that told her exactly what to change when From was outside the filter.
- "Nothing has been sent from this project" on every screen.
