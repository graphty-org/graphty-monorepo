# Session: cheapest route and most central accounts, on the March transfers

**Participant:** Chris, ML engineer on a recommendations team (study/personas/ml-engineer-recsys.md)
**Task as given:** "The transfers have an amount on each one. Find the cheapest route between two
accounts and the most central accounts, and tell me what each answer used."
**Screens:** frame-at-rest, sets-and-paths, run-and-read, weight-role-trap, results-panel,
table-dock, at 1440 x 900, as a participant sees them (design notes hidden).
**Renders looked at:** shots/r6-chris-we2e-frame-at-rest.png, r6-chris-we2e-sets-and-paths.png and
its -s3, -s4, -s5 steps, r6-chris-we2e-wrt-a2 to -a6.png (weight-role-trap), r6-chris-we2e-rr-money.png,
r6-chris-we2e-rr-money-read.png, r6-chris-we2e-rp-finished.png, r6-chris-we2e-table-dock.png.

---

## Think-aloud

**Frame at rest, transfers loaded.** "OK, March transfers, 3,000 nodes, 9,113 edges. Good -- it
didn't draw me a hairball, it drew a density map and says so: 'No labels: 3,000 accounts drawn as
density'. Fine. Right side: 'Loaded: transfers-2026-03.csv, direction followed, amount not used
yet.' So it knows it's directed and it's telling me the amount column is sitting there unused.
That's the thing I care about for this task. Weak components 1, density 0.00101. Degree histogram
is tiny, I can't read an axis on it, but whatever."

"Cheapest route. That's a shortest path with amount as the edge cost. Sum of amounts, minimize.
Where's shortest path... there's a little route icon in the bottom toolbar next to the arrow. I'll
try that."

**Path tool (sets-and-paths, step 3).** "From, To, Run. Scope, Weight. I'd type the account ids --
ACC-271813 to ACC-233575. Scope says Filtered graph with a warning: 'From is outside the filtered
graph. Set Scope to Full graph to search it.' Good, that's the kind of thing that silently gives
you 'no path' in networkx after you forgot you subgraphed. I'd switch to Full graph."

"Weight: 'amount, not used yet'. Hm. So the field is showing amount, but also saying it's not used.
Which is it? If I leave it, do I get a weighted path? It's a dropdown -- I'd click it expecting a
list of columns and maybe 'None'. I can't see what's in it. I'd guess leaving it on amount means
weighted. I'd probably just hit Run and look at the result, because the result will have to say."

**Found path (step 4).** "Found path, '(unweighted)', 3 hops. Right, so I guessed wrong -- the
field showing amount did not mean weighted. At least it says so in two places: the title says
unweighted and the panel says 'Paths ignore amount: hops were counted, not dollars.' That's honest.
I'll give it that. Direction 'follows transfers'. Ties '1 of 2 as short' -- nice, networkx won't
tell me there's a tie unless I ask for all_shortest_paths. Scope Full graph, 3,000. Endpoints, and
'start ... outside filter'. Good."

"The edge table underneath gives me step, source, target, time, amount: $3,530.28, $9,782.05,
$9,616.72. That's about twenty-three grand in three hops. That is not the cheapest anything, it's
the fewest hops. So now I need to make it use the amount."

"Where? The Weight row in the right panel, 'amount, not used yet'. I'd click that row."

**Weight editor on the found path (step 5).** "OK a popover: Found path, Re-run. Weight: amount.
'In this run, a bigger amount means:' and it's already filled in: 'a closer or stronger link'.
'Distance = 1 / amount. The path prefers big transfers.'"

"Wait. Who picked that? I didn't pick that. For a cheapest route that's exactly backwards -- 1 over
amount means the path goes looking for the biggest transfers. If I hadn't read the grey line under
it I'd have hit Re-run and got the most expensive-ish route and called it cheapest. That grey line
is the only thing saving me, and I skim grey lines."

"The dropdown -- I'd open it. From the other screen, the Les Mis betweenness one, I know the other
answer is 'a longer or costlier step, Distance = value'. That's mine: distance equals amount, sum
it, minimize. On this screen I can't see the list opened, I'm assuming it's the same two. Pick
'longer or costlier', hit Re-run."

"And then... nothing on these screens shows me the re-run path. I'd expect the title to lose
'(unweighted)', a total in dollars, and the Weight row to say 'amount, Distance = amount' or
similar. Last time I saw 'distance $22,397.82' on a weighted path and it added up -- I want that
number, and I want the tie count again, because weighted ties are rarer and it matters if it says
'1 of 1'. I'm guessing that's what happens. I can't check it."

"Also -- why is the meaning not asked in the Path bar, before I run? The Betweenness form on the
other screen asks it up front and waits with 'Choose...'. Here I have to run it wrong first, find
the right row, and fix it. Two runs to get one answer. For a shortest path that costs nothing, fine,
on my real graph maybe not."

**Most central accounts.** "Now 'most central'. That word is doing a lot of work. For a payment
graph I'd want two things: who moves the most money -- weighted in-degree, basically -- and who sits
between everyone, betweenness. Maybe PageRank with amount as edge strength."

"Results on the rail. 'Run a measure...' Let me try the command palette instead -- Quick actions.
I'd type 'central'. The screen I have shows someone typed 'money' and got 'Run Money in: Total
amount of the transfers into each account', Money out, Money in minus out, and separately 'Counts
of transfers, not money': Links in (count). That's a really clean split. Weighted degree, named for
what it is. I'd run Money in."

**Money in result.** "'Money in, Sep 29 10:31. on: full graph, 3,000 accounts. Sum of amount, in
dollars, on the transfers into each account. Directed. CPU.' That's the provenance line I want.
Top accounts: ACC-393859 at $440,784, 907 links in, #1 -- so the top guy is top on both. And there's
ACC-893168: #3 by money, #37 by count, '37 transfers, fewer and larger'. That's the sentence I'd
write in a notebook comment. Nice. Options: Sums amount, Direction In. Table with Money in, Links in
and the rank by links side by side. Good."

"But 'most central' is not just 'most money'. I want betweenness on the transfers. The catalog
screen I have is on the protein network: Degree, Centrality -- Betweenness, Closeness, Eigenvector,
Harmonic, HITS, Katz, PageRank. The tooltip for Betweenness: 'How often a node lies on the shortest
paths between other nodes: the brokers and bottlenecks.' One line, fine."

"On transfers, betweenness with amount -- the question comes back: bigger amount means costlier or
stronger? For 'who sits on the cheap routes' it's costlier, same as the path. For PageRank it'd be
stronger. So the same column means opposite things in two runs, and the tool lets each run carry
its own answer. That's actually correct and it's what I'd do by hand. The Les Mis screens show it:
run once with Distance = value, change the answer on the result, it goes Out of date, Re-run keeps
Run 1, and Run 2's line says 'Distance = 1 / value'. Both runs listed with their conversion. Good.
That's the 'show me the heuristic next to the other thing' habit, built in."

"I don't see any of that on the transfers, though. No weighted betweenness on accounts anywhere. I'd
have to assume the header in the table would read like the Les Mis one: 'Betweenness exact,
unweighted, full graph' -- that column-group header is great, by the way, it's exactly the
provenance I'd put in a CSV column name -- but with 'Distance = amount' instead of 'unweighted'. I'm
assuming."

**Results panel, protein example.** "On the finished Betweenness: 'Exact. Undirected. WebGPU.
Weight: confidence, not used yet. Change...' and down in Options: 'Weight: None for this run'. Same
fact, two phrasings, on one panel. 'Not used yet' sounds like a to-do; 'None for this run' sounds
like a decision. I'd prefer the second one everywhere on a finished result. The Exact tooltip --
'does not say the ranking is meaningful' -- ha. Fair."

## The answer

"Cheapest route, ACC-271813 to ACC-233575: what I actually got on screen is the fewest-hops route,
3 hops, via ACC-946224 and ACC-242954, about $22.9k total, one of two equally short. It used: hop
count, not amount; direction followed; full graph. To get the actual cheapest I'd open its Weight
row, change 'a bigger amount means' from the pre-filled 'closer or stronger link' to 'a longer or
costlier step' (Distance = amount) and Re-run. I can't tell you that route or its total, the
screens don't show it."

"Most central: by money received, ACC-393859 ($440,784), ACC-697114, ACC-893168, ACC-593226,
ACC-527694. Used: sum of amount on incoming transfers, directed, full graph, CPU. That's weighted
in-degree, not betweenness. For betweenness or PageRank on amount I'd have to choose the meaning
per run, and I haven't seen that result on this data."

## Single Ease Question

**4 of 7.** "Up from last time. Every result tells me what it used, and the unweighted path is
labelled unweighted in plain words, so I never believed a wrong answer. Money in is genuinely easy.
Minus: the path bar let me run the wrong thing first, the meaning was pre-filled with the wrong
answer for 'cheapest', and I never saw the weighted path or a weighted centrality on these accounts,
so half my answer is 'I assume'."

## Would he use this instead of his current tool?

"Instead of the notebook, no -- the data and the next step live there. Next to it, for looking at one
neighbourhood: closer than last time. What would sell me is what I saw here -- per-run weight
meaning, the conversion on the result, the column header that says 'exact, unweighted, full graph',
money in beside links in. networkx would've silently treated amount as distance for the path and
silently ignored it for PageRank, and I'd never know which. But I'd need to see the weighted path
come back with its dollar total before I trusted it on anything a VP forwards me. And it's still
not my file."

---

## Problems

1. **The path's weight meaning is pre-filled with the reading that is wrong for "cheapest"**
   (severity 3). Screen: sets-and-paths, step 5. The editor opens with "a closer or stronger link,
   Distance = 1 / amount" already chosen, while the Betweenness form on weight-role-trap waits on
   "Choose...". Quote: "Who picked that? I didn't pick that. For a cheapest route that's exactly
   backwards."
2. **No weighted path or weighted centrality on the transfers is shown anywhere** (severity 3).
   Screens: sets-and-paths, run-and-read, results-panel, table-dock. After Re-run the participant
   cannot see the route, its dollar total, its tie count, or how the result names "Distance =
   amount"; betweenness and PageRank are only shown on proteins and Les Miserables. Quote: "I'm
   guessing that's what happens. I can't check it."
3. **The Path tool's bar never asks what amount means, so the first run is always unweighted**
   (severity 2). Screen: sets-and-paths, step 3. "Weight: amount, not used yet" reads as weighted;
   the participant ran, got hops, then had to find the Weight row on the result and Re-run. Quote:
   "Two runs to get one answer."
4. **"amount, not used yet" in a Weight dropdown is ambiguous before the run** (severity 2). Screen:
   sets-and-paths, step 3. The field shows the column name and says it is unused in the same
   string; the participant guessed it meant weighted. Quote: "The field is showing amount, but also
   saying it's not used. Which is it?"
5. **"Most central" has no transfers route beyond Money in** (severity 2). Screens: run-and-read,
   results-panel. Typing a money word finds weighted degree well, but there is no sign on the
   transfers of how to reach betweenness or PageRank by amount, or that each would ask the meaning
   again. Quote: "'Most central' is not just 'most money'."
6. **A finished result states "no weight" in two phrasings** (severity 1). Screen: results-panel,
   finished. The state line says "Weight: confidence, not used yet. Change..." and Options says
   "Weight: None for this run". Quote: "'Not used yet' sounds like a to-do; 'None for this run'
   sounds like a decision."
7. **The degree histogram in Statistics has no readable axis** (severity 1). Screen: frame-at-rest.
   Quote: "Degree histogram is tiny, I can't read an axis on it."

## What earned praise

- The unweighted path says so twice, in words: "(unweighted)" and "hops were counted, not dollars".
- The scope warning before the run: "From is outside the filtered graph."
- "Ties: 1 of 2 as short".
- The weight meaning belongs to one run: two runs of the same measure can read amount opposite
  ways, each listed with its own conversion.
- Quick actions split "Money: sums of amount, in dollars" from "Counts of transfers, not money".
- Money in's line: "Sum of amount, in dollars, on the transfers into each account. Directed. CPU."
  and "#3 by money in and #37 by Links in (count): 37 transfers, fewer and larger."
- The table's column-group header "Betweenness exact, unweighted, full graph".
- A density drawing instead of a hairball for 3,000 accounts, and it says so.
