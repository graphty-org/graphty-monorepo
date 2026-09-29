# Session: the cheapest route and the most central accounts, with an amount on every transfer -- Marcus, criminal intelligence analyst

Participant: Marcus, criminal intelligence analyst at a state fusion center (simulated; persona in
../../personas/intelligence-analyst.md). A money-laundering lead is on his desk, so he pushes
through more than he would on a slow afternoon. Light theme, study view (design notes hidden).

Task as given by the moderator, and nothing more: "The transfers have an amount on each one. Find
the cheapest route between two accounts and the most central accounts, and tell me what each
answer used."

Screens, in the order he met them. Renders are in `shots/`, all named `r6-marcus-we2e-*.png`:

1. `screens/frame-at-rest.html?dataset=transactions` (`-far.png`): the March transfers at rest
2. `screens/sets-and-paths.html`, states 3 to 5 (`-sp-s3.png`, `-sp-s4.png`, `-sp-s5.png`): the
   Path tool, the found path, the path's weight editor. States 1, 2, 6 and 7 looked at and passed
   over
3. `screens/run-and-read.html`, Money and Money-read (`-rr-money.png`, `-rr-money-read.png`) on the
   transfers; Catalog, Done and Rank (`-rr-catalog.png`, `-rr-done.png`, `-rr-rank.png`) on a protein
   network the moderator asked him to read as if it were the transfers
4. `screens/weight-role-trap.html`, states a1 to a6 (`-wrt-a1.png` ... `-wrt-a6.png`), on a Les
   Miserables co-appearance network, same instruction
5. `screens/results-panel.html`, Finished and Variant (`-rp-finished.png`, `-rp-variant.png`),
   proteins
6. `screens/table-dock.html`, Selected and Edges on the transfers (`-td-selected.png`,
   `-td-edges.png`), Ranked on the proteins (`-td-ranked.png`)

## Transcript

**Before starting.**

> "Cheapest route. That's not how I work money -- on a laundering case I follow the big money. But
> you said cheapest, so I read it as: add up the dollars along the way, lowest total wins. Not
> fewest hops. Every tool I've touched does fewest hops and calls it 'shortest'. That's the first
> thing I check."

> "Most central, for me, is betweenness. The middleman. And 'what each answer used' -- that's the
> part I get cross-examined on. Did the dollars go into it or not. If the screen can't tell me, I
> don't have an answer."

### 1. The transfers at rest

**Frame at rest, transfers.**

> "Transfers, March 2026. 'Nothing has been sent from this project' -- good, that's the first
> thing I look for, and it's up top where I can point IT at it. Three thousand accounts drawn as
> a grey honeycomb. 'No labels: 3,000 accounts drawn as density.' Fine, I didn't expect to read
> three thousand names."

> "Over on the right: 'Loaded: transfers-2026-03.csv, direction followed, amount not used yet.
> Change...' Okay. So it's telling me straight off it knows about the amount and it isn't using
> it. Not used by what, I don't know yet, but I'd rather it say that than quietly use it. I'll
> leave Change alone for now -- I want to see what the route does when I don't touch anything."

### 2. The route, first try

**Path tool (state 3).** He finds the button with two dots and a squiggle in the bottom bar.

> "That's the route button. From ACC-271813, To ACC-233575. Yellow mark on Scope: 'From is outside
> the filtered graph. Set Scope to Full graph to search it.' Somebody left a riskScore filter on --
> right panel says 'Left out by riskScore 20 or more.' Good. Last tool I used just said 'no path'
> and I wasted twenty minutes. Full graph."

> "Next to it, Weight: 'amount, not used yet', and it's a dropdown. That's the knob. But I run it
> first, untouched, so I know what it does by default."

**Found path (state 4).**

> "Found path, and in grey next to it: '(unweighted)'. 3 hops. And under Weight: 'Paths ignore
> amount: hops were counted, not dollars.' Okay. That's honest. That's exactly the sentence I'd
> need on the stand, and it's already written for me. 'Ties: 1 of 2 as short.' So there's another
> three-hop route it didn't show me. I want to know that -- a defense attorney will find the
> other one."

> "Bottom table: the three transfers, in order, with dates and amounts. $3,530.28, $9,782.05,
> $9,616.72. Every line traceable to a row. That's what I want. But this is fewest hops. Not my
> answer yet."

### 3. The route, by dollars

**The path's weight editor (state 5).** He clicks the Weight line in the right panel ("amount, not
used yet"), which is highlighted; a small box opens beside it.

> "Found path. Weight: amount. Then 'In this run, a bigger amount means:' -- and it's already
> filled in: 'a closer or stronger link'. Underneath: 'Distance = 1 / amount. The path prefers big
> transfers.'"

> "Hold on. Prefers big transfers. That's the opposite of cheapest. If I'd hit Re-run without
> reading that line I'd have the most expensive route and I'd have called it the cheapest. The
> little math line I skip -- 'one over amount', whatever -- but 'prefers big transfers' I can read.
> That saved me."

> "Why is it already picked, though? I didn't pick it. Is that a default? Is that what someone
> before me chose? I don't know. I didn't see a 'Choose' in there."

He opens the second box expecting the other choice.

> "I'm guessing the other one in here is something like 'costs more' -- I saw a list like that on
> another screen (see below) that said 'a longer or costlier step, Distance = value'. That's the
> one I want. Dollars are the cost. I'd pick that and Re-run."

**What he could not see.** No screen shows the path after that re-run.

> "And then what? I want to see the name change from '(unweighted)' to something that says
> dollars, and I want a total. The table on another screen had 'Sum of amount, 5 rows: 41,796.59
> USD' at the bottom -- that's for the two tied routes together, which is not a route. For my
> answer I need 'this route, total $X, three transfers' in one place. I'm assuming it does that.
> I'm assuming. I can't write 'assuming' in a report."

### 4. The central accounts on the transfers

**Run a measure, typed "money" (run-and-read, Money).**

> "Results tab, 'Run a measure...'. I typed money because that's my data. 'Money: sums of amount,
> in dollars' -- Money in, Money out, Money in minus out. And under it: 'Counts of transfers, not
> money' -- Links in, Links out. That split is good; that's what I'd do in a pivot table anyway.
> But none of that is betweenness. Most money in is a big fish, not the middleman."

**Money in, finished (run-and-read, Money-read).**

> "Top accounts by money in, with where each sits by number of links. ACC-893168 is number 3 by
> money and number 37 by links -- '37 transfers, fewer and larger.' Now that's a lead. That's a
> sentence I'd give a sergeant. But again, that's not 'central'. I'll hold onto it."

**The catalog (protein network, read as the transfers).**

> "Okay, now you're showing me proteins. MAPK1. I don't do proteins. You want me to pretend these
> are accounts, fine. Centrality heading, Betweenness, and the hover says 'How often a node lies
> on the shortest paths between other nodes: the brokers and bottlenecks.' Brokers. That's my
> word. Good. Click to run."

### 5. What does the amount mean for betweenness?

**The Les Miserables pages (weight-role-trap a1 to a6).** The moderator: "same idea, different
file."

> "Now it's a book. Right. 'Open miserables.json... Edge attribute value... A measure that reads
> value asks, each time it runs, what a bigger value means.' Okay, so it's going to ask me. I
> like that it's upfront."

> "Betweenness box. Weight: value. 'In this run, a bigger value means: Choose...' and the Run
> button's greyed out -- 'Choose what a bigger value means first.' Two choices: 'a longer or
> costlier step, Distance = value', or 'a closer or stronger link, Distance = 1 / value, such as a
> count of shared scenes'."

> "So here it MAKES me choose. On the route it had one filled in already. Which is it? If it makes
> me choose on one, make me choose on the other. The one that was pre-filled is the one that would
> have burned me."

> "Now for money and betweenness. Think it through. A big transfer between two accounts -- that's a
> strong tie, they're close. So for the middleman question, bigger amount means closer. For the
> route question you gave me, bigger amount means costlier. Same column, opposite answers, in the
> same case file. That's... actually right, I think, and the tool lets me do it. But I'd better be
> able to show which run was which, because the defense will say I flipped it to suit myself."

**Two runs side by side (a6).**

> "Runs list: 'Betweenness, 10:15, Run 2. Distance = 1 / value' and 'Betweenness, 10:12, Run 1.
> Distance = value.' Both kept, both labelled. Valjean on top either way, then it reshuffles --
> Marius jumps from nowhere to number two. That's the whole point: the setting changes who's
> important. And it's written right on the run. Good. I'd rather the label said 'amount as cost' or
> 'amount as strength' than 'Distance = 1 / value', but I can live with it."

> "(a5) Out of date, 'Re-run (keeps Run 1)'. It doesn't throw away the old one. Good. If I lose a
> run I can't explain the chart."

### 6. Reading the answer back

**Results panel, Finished (proteins).**

> "Top of the result: 'Exact. Undirected. WebGPU. Weight: confidence, not used yet. Change...' and
> down in Options: 'Weight: None for this run.' Two ways of saying the same thing on one panel.
> And on the other screen for the same run it said 'Exact. Unweighted.' Three wordings. Pick one.
> On the stand I need to say the same words every time."

> "The hover on Exact: 'Computed on every node, not estimated. It does not say the ranking is
> meaningful.' Ha. Whoever wrote that has been cross-examined. I like it."

> "'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' So 3
> and 4 are nearly a coin flip. That's useful -- I wouldn't tell a sergeant number 3 is more
> important than number 4."

**Table, Ranked (proteins).**

> "Column headers: 'Betweenness exact, unweighted, full graph', 'PageRank damping 0.85,
> unweighted, full graph'. That's it -- that's 'what each answer used', printed on the column. If I
> export this table, does that header come with it? It has to, or it's gone the moment it hits
> Excel."

**Table, Selected and Edges (transfers).**

> "Transfers again. 'Weighted degree: sum of amount (USD), full graph' over Money in, Money out,
> Money in minus out. So 'weighted' here means dollars. Fine. 'Sum of Money in, 14 rows' at the
> bottom. Edges tab: the path legs with the 'step' column and '1 of 2', '2 of 2' -- so it shows
> both tied routes. And 'Export table...' Good."

### 7. His answer to the moderator

> "Cheapest route: I'd set the route's weight to amount, meaning 'costlier', not the one it had
> filled in, and re-run. The first run used hops, not dollars, and said so. The dollar run -- I
> never saw it come back, so I can't give you the total or the accounts. Most central: betweenness,
> amount meaning 'stronger', and the run name says 'Distance = 1 / value'. The one I actually saw
> on transfers was Money in, which used amount summed in dollars, and it put ACC-893168 in front of
> me. That's the answer I'd trust today."

## Single Ease Question

**4 out of 7.**

> "The honest labels carry it: '(unweighted)', 'hops were counted, not dollars', the run list with
> the setting on each run, the column header that says unweighted. That's better than anything
> Analyst's Notebook gives me. But the one screen where I actually set the dollars for the route
> had the wrong answer already picked, and I never saw the route come back weighted. And the
> betweenness part I had to do on proteins and a novel. Half the job I did in my head."

## Would he use this instead of his current tool?

> "Not instead. Beside i2, for this kind of question, if it runs on our own server -- 'Nothing has
> been sent' is a start, but IT wants paperwork, not a line on a screen. What would move me: the
> route editor makes me choose like the betweenness one does, the weighted route comes back with
> its dollar total and a name that says 'by amount', and the exported table keeps the 'unweighted
> / by amount' header. Do that and I'd run my middleman question here and draw the court chart in
> i2."

## Observations for the studio (moderator's notes)

1. **The route's meaning box comes pre-filled with the opposite of "cheapest"** (sets-and-paths
   state 5): "a closer or stronger link ... The path prefers big transfers." The betweenness editor
   on the Les Miserables page makes the reader choose and holds Run until they do. Marcus caught it
   only because he reads the line under the box; he called it "the one that would have burned
   me". Severity: high.
2. **No screen shows the route after a re-run by amount**: no "(by amount)" name and no total in
   dollars for one route. The only sum on screen covers both tied routes together. He could not
   report the cheapest route. Severity: high.
3. **Three different wordings for one fact on the results screens**: "Unweighted" (run-and-read),
   "Weight: confidence, not used yet" and "Weight: None for this run" (results panel, both on the
   same panel). Severity: medium.
4. **The central-accounts half is shown only on proteins and a novel**, never on the transfers
   with amount as a strength. Marcus had to work out for himself that the same column means cost
   for the route and strength for betweenness, and worried about defending that. Severity: medium.
5. **"Distance = value" / "Distance = 1 / value" as the run label** is read by him as math. He
   asked for "amount as cost" / "amount as strength". Severity: low.
6. **Whether the "unweighted / by amount" column header survives Export table** is his first
   question about the table. Severity: low (a question, not a defect seen).
7. What worked: "(unweighted)" on the path name and "hops were counted, not dollars"; the scope
   warning naming the filter; "Ties: 1 of 2 as short"; the Money / Counts split in the catalog;
   "fewer and larger" on ACC-893168; runs kept side by side with their setting; the "Exact"
   tooltip; the tie line in the top five.
