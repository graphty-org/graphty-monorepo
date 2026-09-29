# Cheapest route and most central accounts -- Dana, supply chain risk analyst (round 6)

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker. Lives in
Excel and Power BI; has tried Gephi and a Power BI network visual and dropped both. Not a network
scientist; says "centrality" for any importance score and "chokepoint" for betweenness. Mild
presbyopia; small grey labels are a real problem for her. She did this same task in the previous
round.

**Task as given by the moderator:** "The transfers have an amount on each one. Find the cheapest
route between two accounts and the most central accounts, and tell me what each answer used."

**Screens seen (participant view, design notes hidden):** the app at rest (Les Miserables); the
path tool on the March transfers (the form with the filtered-scope warning, the unweighted result,
the "what amount means" editor on the result, the reversed-direction message); the weight question
asked when a measure is run, its two answers, and two runs kept side by side (Les Miserables); the
Run a measure menu and the quick search (protein network); a finished Betweenness run and its
node (proteins); the quick search for "money" and the finished Money in run (transfers); the
table's Edges tab with both routes, the three-measure ranked table (proteins), the transfers table
with Degree and PageRank, the New column menu, and the Export dialog.

Renders the participant looked at (all in `../../../shots/`):
- `r6-dana-we2e-frame-at-rest.png`
- `r6-dana-we2e-sp-s3.png` (path form), `r6-dana-we2e-sp-s4.png` (found path, unweighted),
  `r6-dana-we2e-sp-s5.png` (what amount means), `r6-dana-we2e-sp-s6.png` (no path one way)
- `r6-dana-we2e-weight-role-trap.png` (the whole page: weight asked at the run, two runs)
- `r6-dana-we2e-run-and-read.png` (the whole page; she stopped reading after the filtered-graph
  frame)
- `r6-dana-we2e-results-panel.png` (skimmed; none of it is on transfers)
- `r6-dana-we2e-table-dock.png` (the whole page)

## Think-aloud

**Before starting.** "Same thing as last time. Account is a site, amount is freight cost, cheapest
route is lane costing. Most central, for me, is chokepoint. And 'what each answer used' is the
footnote my VP asks for. Last time the route was OK once I told it amount was a cost, and the
central bit I couldn't answer at all. Let's see if that's moved."

**The app at rest.** *Les Miserables, the right-hand Statistics block.* "'Loaded: miserables.json,
undirected, value not used yet. Change...' OK, so it's still telling me there's a number column
and nothing's using it. That's fine, I'd rather it says so. I'm not changing anything here, I
don't know what I'd be changing it to yet."

**Finding the route.** *March transfers, the path bar open: From, To, Run, Scope, Weight.*
"From ACC-271813, To ACC-233575. Run is greyed. Scope has a yellow mark: 'From is outside the
filtered graph. Set Scope to Full graph to search it.' Right, somebody's got a filter on, 1,071 of
3,000. Full graph. Weight says 'amount, not used yet' and it's a dropdown. Last time I left it
alone and got the fewest-transfers route. I know that now. But I still don't know what I'd pick in
there -- it's the column name. I'll run it and read what it says, that worked last time."

*The unweighted result.* "Line on the map, start, end. 'Found path (unweighted), 3 hops.' Right
panel: 'Weight: amount, not used yet. Paths ignore amount: hops were counted, not dollars.' Good.
Same line as last time and it's still the best line on the screen. 'Ties: 1 of 2 as short.' Still
doesn't tell me why it picked this one. Direction: 'follows transfers'. Good, money goes one way."

*The table under it, Edges tab, three rows: $3,530.28, $9,782.05, $9,616.72.* "That's this route.
I'm not adding it up again, I know from last time there's a cheaper one."

*On the other Edges tab frame, the one with both routes and 'on paths 1 of 2 / 2 of 2', with the
footer 'Sum of amount, 5 rows: 41,796.59 USD'.* "Oh, it sums for me now. Forty-one thousand? That's
both routes added together. That's not a number anybody wants. Sum per route, please -- 'route 1
of 2: $22,929, route 2 of 2: $22,398' -- and I'm done with my calculator. As it is I'd still paste
it into Excel and pivot on 'on paths'."

**Making it count dollars.** *Clicks the Weight row in the result panel; the editor opens: 'Found
path', Re-run; Weight: amount; 'In this run, a bigger amount means:' with 'a closer or stronger
link' already in the box; under it 'Distance = 1 / amount. The path prefers big transfers.'*

"'In this run.' OK. That's new, and that's the thing I complained about. So what I say here is for
this route only. Good. But -- it's filled in again. 'A closer or stronger link.' 'The path prefers
big transfers.' That's the dearest route! I asked for cheapest. Who put that in? And the panel
right behind it still says 'amount, not used yet'. So which is it -- is 'stronger link' what it
used, or is it what it would use if I press Re-run? I think it's a suggestion, because it says not
used yet. But a suggestion that's the wrong way round for cheapest is worse than an empty box.
Distance equals one over amount -- I read that as 'it will flip my numbers', and I don't want them
flipped."

*Opens the list.* (Moderator: the list on this screen isn't drawn; the same question asked at a
run, on another screen, shows two answers.) *Looks at that screen: 'a longer or costlier step --
Distance = value' and 'a closer or stronger link -- Distance = 1 / value, such as a count of
shared scenes'.* "'Costlier step', distance equals value. That's mine. Amount is the cost of the
step, add them up. I'd pick that and press Re-run."

"And there, on that other screen, the box says 'Choose...' and Run is grey with 'Choose what a
bigger value means first'. That's right. It makes you answer and it doesn't answer for you. Why
does the path editor not do that too? Same question, two behaviours."

*Asks what she'd see after Re-run.* (Moderator: none of the screens shows the path re-run with
amount as a cost.) "So I can't check it. Last time you told me it came out at $22,397.82 via
670564, labelled 'distance'. If it still says 'distance $22,397.82' my VP asks if we're shipping by
the mile. For money it's 'total' or 'cost'. I'd want the result to say 'Weight: amount, as cost,
this run' in the same place it said 'not used yet'. Right now I'd be trusting that it happened."

**Reversing the route.** *The bar with From and To swapped: 'No directed path; one exists ignoring
direction', button 'Ignore direction'.* "Clear. I wouldn't press it -- a truck doesn't drive
backwards up a one-way lane. Good that it says so and doesn't just do it."

**Most central accounts.** "Now central. Last time this is where it fell apart." *Looks at the Run
a measure menu (proteins): Degree -- Links (count), Total confidence; Centrality -- Betweenness,
Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank; Community; Structure.* "Same
seven words. Betweenness is the only one I'd click. The tooltip, 'how often a node lies on the
shortest paths between other nodes: the brokers and bottlenecks' -- bottlenecks, yes, that's a
chokepoint. Good, one line, I read it."

*The quick search on the transfers, typed 'money': 'Money: sums of amount, in dollars -- Run Money
in, Total amount of the transfers into each account; Money out; Money in minus out'. Then 'Counts
of transfers, not money -- Links in (count), Links out (count)'.* "Oh, now that's my language.
'Sums of amount, in dollars.' 'Counts of transfers, not money.' It split them for me. Money in is
a pivot table, honestly -- sum of amount by to_account. I could do that in Excel in two minutes.
But it's the first time the tool talked dollars without me having to translate."

*The finished Money in run: 'on: full graph, 3,000 accounts. Sum of amount, in dollars, on the
transfers into each account. Directed. CPU.' Top accounts with 'Links in (count)' next to each:
ACC-393859 $440,784, 907 links in, #1; ACC-893168 $149,438, 37 links in, #37. And the line
'ACC-893168 is #3 by money in and #37 by Links in (count): 37 transfers, fewer and larger.'*

"THAT is the sentence. 'Fewer and larger.' Thirty-seven transfers and it's number three by money.
That's the one I'd worry about -- few big shipments through one door. And it tells me what it
used right at the top: sum of amount, into each account, directed, whole graph. Options: 'Sums:
amount, Direction: In.' That's my footnote. I'd put that on the slide."

"But is it 'central'? It's volume. It's where the money lands. It doesn't tell me who the money
goes THROUGH. For a chokepoint I want the betweenness one, with dollars in it."

*Back to the Betweenness run screens -- proteins again, MAPK1, TP53.* "Proteins. Again. I can't
see betweenness on my transfers anywhere. The panel says 'Exact. Unweighted, undirected. CPU.' and
Options 'Weight: None for this run'. OK -- 'for this run', and now the weight question on the other
screen also says 'in this run'. So those two agree now. Last time I couldn't tell if changing it
for centrality would change my route. Now I read it as: each run has its own answer. The route has
'costlier', the chokepoint run would have whatever I tell it. That's what I asked for."

*The two-run screen on Les Miserables: 'Run 1. Distance = value' and 'Run 2. Distance = 1 / value',
two different top-fives (Valjean 0.454 then 0.795; Gavroche #2 in one, Marius #2 in the other), and
'Re-run (keeps Run 1)'.* "Right, so it keeps both. Good. Same data, two answers, and the name of
each run says what it assumed. That I can defend. Though 'Distance = value' is not how I'd label
it. I'd say 'value as cost' and 'value as strength'. I had to go back to the dropdown to remember
which one was which."

"And undirected. For proteins, fine. On my transfers the path followed the money and the Money in
run says 'Directed'. Would betweenness on transfers ignore direction? I can't tell, there's no
screen. That was my question last time and it's still open."

*Then which to pick for chokepoint.* "If I ran betweenness on transfers with amount, which answer
do I pick? Costlier step makes a big transfer a long hop, so big money counts less for the
chokepoint. Stronger link makes big money count more. For a chokepoint I want the big money to
count. So -- 'stronger link' for the chokepoint and 'costlier step' for the route. Opposite
answers for the same column. Last round that would have been impossible. Now it's allowed, if I'm
reading 'in this run' right. But I worked that out myself; nothing on screen told me that
'bottleneck' means you want the second one."

**Reading the ranking in the table.** *The transfers table: Degree 'degree (total, full graph)',
PageRank 'damping 0.85, unweighted, full graph', and above it 'The top 10 are the same on both
measures, led by ACC-393859.'* "Good. Column says what it used. 'Unweighted' -- so PageRank counted
every transfer the same, five-dollar ones and ten-thousand-dollar ones. I'd write that in the
footnote. And top ten the same on both -- that's the kind of sentence I'd put on a slide."

*The protein table's group header: 'Louvain weighted, seed 7, full graph'.* "Still there. Weighted
by what? Nothing on that screen says which column. Every other header told me what it used; that
one says 'weighted' and stops. That's the one I'd get asked about."

*The New column menu on the transfers table: 'Money in -- Sum of amount on transfers in, USD'.*
"So I can add the money column right in the table next to degree. That's how I'd work. That's
Excel with a map."

*The Export dialog: 'Table (.csv)'; 'Methods: Always written beside it'; 'Each run's columns carry
its method and scope in the header, as in the table.'; 'Beside it: ...-methods.txt'.* "That's the
Power BI question answered, sort of. A CSV I can load, and the header says 'community (Louvain,
weighted, seed 7, full...'. So the footnote comes with the numbers. That matters to me more than
anything on the map. I'd still need IT to say yes before I load a supplier list, and the 'Nothing
has been sent from this project' line under the title is the thing I'd screenshot for them."

**Summing up, as asked.**

"Cheapest route: I'd pick 'a longer or costlier step' in the result's editor and re-run. From last
time it's via 670564, about $22,398 -- but I didn't see that on these screens, so I'm reporting it
on trust. What it used: amount as a cost, this run only, following the direction of the money,
whole graph. The first answer it gave me, three hops, used nothing -- and it said so, 'hops were
counted, not dollars'."

"Most central: on my transfers I can only honestly give you two things. By money, ACC-393859 at
$440,784 in, and the one to watch is ACC-893168 -- #3 by money on 37 transfers. That used the sum
of amount into each account, directed, whole graph. By connections, PageRank and degree agree on
the top ten, led by ACC-393859 -- and that used no amounts at all, whole graph. The chokepoint one,
betweenness with dollars, I never saw on transfers."

## Single Ease Question

**4 out of 7.** "Better than last time. It stopped keeping one answer for the whole column -- 'in
this run' -- and it has money words now, 'sums of amount, in dollars' versus 'counts of transfers,
not money', which is the first time a tool like this spoke my language. The Money in run told me
exactly what it used and gave me a sentence I'd put on a slide. But the route editor still comes
with the wrong answer filled in -- 'prefers big transfers' when I asked for cheap -- while the
other screen makes you choose. I never saw the cheap route actually come out. And the chokepoint
one is still proteins."

## Would she use it instead of her current tool?

"Not instead. Beside. The route I can still do in Excel in the time it takes me to find the
right dropdown, and Money in is literally a pivot table. What I don't have anywhere is a number
that carries its own footnote -- 'sum of amount, directed, full graph', 'PageRank unweighted' --
into the CSV, and a line like 'thirty-seven transfers, fewer and larger'. If IT signs off and the
CSV loads into Power BI with those headers, I'd open it when someone asks 'where did this number
come from' or 'what goes through this site'. Show me betweenness on my own data with dollars in
it, and don't pre-fill the answer for me, and I'd take it to the Thursday meeting."

## Observer notes

- The per-run weight meaning ("In this run, a bigger amount means:"; "Re-run (keeps Run 1)"; runs
  named "Distance = value" / "Distance = 1 / value") resolved her main round-5 objection. She read
  it as "each run has its own answer" and concluded, on her own, that she could use amount as a
  cost for the route and as a strength for a chokepoint run.
- The path result's weight editor still opens with "a closer or stronger link" already in the
  field and "The path prefers big transfers." -- the opposite of cheapest -- while the panel
  behind it says "amount, not used yet". She could not tell whether the pre-filled answer was
  what was used or a suggestion. The run form on the other screen starts at "Choose..." with Run
  disabled ("Choose what a bigger value means first"); she preferred that and asked why the two
  differ.
- No screen shows the path re-run with amount as a cost, so she could not see the cheapest route
  or its total; she reported it on trust from the previous round. The flow page still labels the
  weighted total "distance $22,397.82" and calls "a longer or costlier step" "the wrong reading
  here", and still says the answer is kept once on the column; both contradict the screens she
  used (not shown to her this round).
- The run labels "Distance = value" and "Distance = 1 / value" did not carry meaning for her; she
  had to reopen the list to recall which was which. She suggested "value as cost" / "value as
  strength".
- The Edges tab footer "Sum of amount, 5 rows: 41,796.59 USD" sums both tied routes together. She
  wanted a total per route ("route 1 of 2", "route 2 of 2"), which would have replaced her
  calculator.
- The quick search for "money" (grouped "Money: sums of amount, in dollars" and "Counts of
  transfers, not money") and the Money in run were the strongest moments: the run's scope line
  ("Sum of amount, in dollars, on the transfers into each account. Directed.") and the sentence
  "ACC-893168 is #3 by money in and #37 by Links in (count): 37 transfers, fewer and larger." were
  what she would take to a slide. She also noted Money in is a pivot table she can build in Excel.
- She treats Money in as volume, not centrality. Betweenness (her "chokepoint") appears only on
  the protein network; she never saw a chokepoint ranking of accounts, weighted or not, and still
  could not tell whether betweenness on transfers would follow direction as the path and Money in
  do.
- Nothing told her which weight answer suits a bottleneck question; she reasoned it out
  ("stronger link" for chokepoints, "costlier step" for routes).
- Column-group headers ("PageRank damping 0.85, unweighted, full graph"), "The top 10 are the same
  on both measures", and the Export dialog's "Methods: Always written beside it" were her answer to
  "what did each answer use". "Louvain weighted, seed 7" still names no column and was the one
  header she said she would be challenged on.
- The Export dialog's CSV with methods in the header is what would make it a side tool next to
  Power BI; IT approval remains her gate.
