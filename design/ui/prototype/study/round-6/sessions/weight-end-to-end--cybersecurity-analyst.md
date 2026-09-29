# Weight end to end -- Priya, threat hunter (cybersecurity analyst)

**Task, as the moderator read it:** "The transfers have an amount on each one. Find the cheapest
route between two accounts and the most central accounts, and tell me what each answer used."

**Screens she saw (study view, notes hidden):** the resting frame on the March transfers, the Sets
and paths screen (path tool, found path, the found path's editor), the Run and read screen, the
weight question on a betweenness run, the Results panel, and the table dock.

Renders: `shots/r6-priya-we2e-frame-at-rest.png`, `shots/r6-priya-we2e-sets-and-paths-s3.png`,
`shots/r6-priya-we2e-sets-and-paths-s4.png`, `shots/r6-priya-we2e-sets-and-paths-s5.png`,
`shots/r6-priya-we2e-run-and-read.png`, `shots/r6-priya-we2e-weight-role-trap.png`,
`shots/r6-priya-we2e-results-panel.png`, `shots/r6-priya-we2e-table-dock.png`.

---

## Think-aloud

**Resting frame, transfers loaded.**

"OK. Top left, 'Nothing has been sent from this project', and the rail says Assistant off, nothing
is sent. Good, that's my first question answered before I asked it. I'd still want to know how I
check it, but fine for a study.

Right side: 'Loaded: transfers-2026-03.csv, direction followed, amount not used yet. Change...'
That's actually the most useful line on the screen for this task. It tells me the amount column
exists and nothing is reading it yet. 3,000 nodes, 9,113 edges (rows). One weak component. So any
two accounts should have a route.

I'm not touching Change here. Change what? The whole load? I'm not reloading a file to answer one
question. I want to set weight on the query, not on the data."

**Cheapest route. Finding the path tool.**

"No query box. Fine, I know. The toolbar at the bottom has an arrow, then that two-dots-and-a-line
icon. That's the path one, I'm guessing. Yep -- From, To, Scope, Weight, Run.

I type the two accounts. ACC-271813 to ACC-233575. It's yelling at me: 'From is outside the
filtered graph. Set Scope to Full graph to search it.' Right, someone left a filter on, riskScore
20 or more, 1,071 of 3,000. That's a good catch actually. BloodHound would've just said 'no path'
and I'd have wasted twenty minutes. It tells me what to flip. Scope to Full graph.

Weight: 'amount, not used yet'. So there's a dropdown. I want amount. I'd open it and pick amount.
What I can't tell from this bar is whether picking amount here asks me which way amount goes. The
bar doesn't show that. I'm going to guess it just... uses it somehow."

**Found path, as it comes back.**

"Found path, '(unweighted)', 3 hops. OK so I ran it without changing weight, or the mock assumes I
did. Created from: Query shortest path, Scope full graph 3,000, Weight 'amount, not used yet', and
then in plain words: 'Paths ignore amount: hops were counted, not dollars.' Good. That's the
sentence I'd want if I'd forgotten. I can't misread that as cheapest.

Direction: follows transfers. Ties: 1 of 2 as short. So there's another 3-hop route and it picked
one. I'd want to see the other one, but at least it admits it.

Endpoints: start ACC-271813 'outside filter'. It remembers the filter thing. Fine.

Table at the bottom flipped to Edges: step, source, target, time, amount. Mar 4, Mar 7, Mar 8, in
order. That's the thing I actually want -- hops in time order with amounts. $3,530.28, $9,782.05,
$9,616.72. Two of those are just under ten grand, which in my world smells like structuring, but
that's not the question.

But this is not the cheapest route. This is fewest hops. I still have to make it use dollars."

**Making it use dollars: the found path's editor.**

"I click the Weight row in the inspector -- it highlights -- and a little editor pops out: 'Found
path', Re-run. Weight: amount. 'In this run, a bigger amount means:' and it's already set to 'a
closer or stronger link'. Under it: 'Distance = 1 / amount. The path prefers big transfers.'

Wait. No. I asked for the cheapest route. Cheapest means the smallest total dollars. That's the
opposite. If I'd just hit Re-run -- and it's sitting right there -- I'd get the route through the
biggest transfers and I'd have written 'cheapest route' in my case notes. The line under it does
say 'prefers big transfers', so if I read it I catch it. I read it because I'm in a study. On shift
I'd have clicked Re-run.

Why is this one pre-picked? On the betweenness form" -- she flips to the weight question screen --
"it says 'Choose...' and Run is grey until I answer. Tooltip: 'Choose what a bigger value means
first.' That's right. That's how it should be. The path editor doesn't do that, it guesses for me,
and it guesses the wrong way for 'cheapest'. Pick one behaviour.

I'm assuming the dropdown has the other option. On the betweenness one it's 'a longer or costlier
step, Distance = value'. Costlier. OK, that word lands for cheapest. I'd pick that, Re-run.

What I don't see anywhere is the route's total. Cheapest route and there's no number that says how
cheap. I'd add the three amounts in my head -- about $22.9K for this one. If it re-ran on distance
= amount I'd want 'total amount $X' up where it says 3 hops, and the other tie's total next to it,
or I can't tell you it's the cheapest, just that the tool says so.

And I can't see the re-run result on any of these screens. I'm guessing the header drops
'(unweighted)' and the Weight row says 'amount, bigger = costlier' or 'Distance = amount'. I'm
guessing."

**Most central accounts.**

"Results on the rail. 'Run a measure...' and a search. I type 'centr' -- it gives Betweenness,
Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank. When I say central I mean betweenness,
who's in the middle of the flows, the choke points. Betweenness.

The screens here are on proteins and Les Miserables, not my transfers. I'm reading the transfers
into them. That bugs me a little; I'm having to trust that it'd look the same on money.

I also tried 'money' because the transfers screen had that: Money in, Money out, Money in minus
out, and separately Links in (count). Those are sums per account, not centrality. The top-accounts
list is nice -- 'ACC-893168 is #3 by money in and #37 by Links in (count): 37 transfers, fewer and
larger' -- that's a sentence I'd paste. But it's volume, not 'central'. I'll keep it as a second
view.

Betweenness form: Scope Full graph, Weight: value, 'In this run, a bigger value means: Choose...'.
Run is disabled until I pick. OK. Now for transfers, which way? For who sits in the middle of the
money, a big transfer is a strong link, so 'closer or stronger link', distance = 1/amount. That's
the opposite answer from the path. Same column, two different meanings in two runs, and the tool
lets me say so per run. That's correct and it's also exactly how I'd trip. I'd run it once
unweighted as a baseline anyway -- that's what my notebook does -- and once weighted.

After the run: Runs list says 'Betweenness 10:12, Run 1. Distance = value' and after a re-run 'Run
2. Distance = 1 / value'. The table column header says 'Betweenness exact, unweighted, full graph'
in the table dock view. Results panel: 'on: full graph, 300 nodes, 3 components. Exact.
Undirected. WebGPU.' plus 'Weight: confidence, not used yet. Change...' and further down Options,
'Weight: None for this run'. That's the same fact twice in two wordings. I don't mind twice. I'd
mind if they ever disagreed.

What it doesn't say, for my transfers: direction. The path said 'follows transfers'. The
betweenness form I saw was undirected Les Mis, so there's no direction field. On money, direction
matters. If betweenness on transfers quietly runs undirected, that's a different answer and I need
it in the 'what it used' line."

**Telling the moderator what each answer used.**

"Path: shortest path, full graph 3,000, follows transfers, first run counted hops and ignored
amount -- it says so. Re-run with amount as cost, distance = amount, if I pick 'costlier' and don't
trust the default. One of two ties. No total dollars shown.

Central: betweenness, exact, full graph, and the run line says unweighted or Distance = value or
1/value. Direction I can't confirm from these screens.

Can I get it out? Table has 'Export table...'. The path's edge rows are sitting in the table. I'd
export those. I didn't test that it keeps the 'what it used' line in the file. If the CSV loses
the weight and the scope, I'm writing them in the case by hand."

---

## Single Ease Question

**4 out of 7.**

"Finding things was fine -- path tool, measure search, the table. The 'what did it use' part is
better than anything I've used: every result says scope, weight, and in words what the weight did.
I'd give that a 6 by itself. It loses points on the cheapest route: the path editor pre-picks the
meaning that gives me the most expensive route and a Re-run button right next to it, while the
betweenness form makes me choose. And there's no total amount on the route, so 'cheapest' is the
tool's word, not something I can check. Plus I had to imagine the transfers betweenness from
screens about proteins and a novel."

## Would she use this instead of her current tool?

"No, not instead. Next to it. In my notebook this is three lines of networkx and the weight is
whatever I typed, and the notebook is my record. What this has that the notebook doesn't is the
'Paths ignore amount: hops were counted, not dollars' sentence sitting on the result, and hops in
time order with amounts in one table. That's what I'd show my lead. If the path editor made me
choose like the betweenness one does, showed the route total, and the export kept the 'used'
line, I'd use it for the handoff picture. The analysis stays in the notebook until it runs on my
own file and I've checked a path I already know."

---

## Findings (plain summary)

1. **The found path's weight editor pre-selects "a closer or stronger link" (prefers big
   transfers), next to an enabled Re-run.** For "cheapest route" that is the opposite meaning. The
   betweenness form asks the same question with "Choose..." and a disabled Run. The two runs
   disagree on whether the meaning is asked or assumed. Severity: high -- a wrong answer that
   looks right.
2. **No route total.** The found path shows hops and per-edge amounts but no summed amount, so a
   weighted "cheapest" route cannot be checked against the tie. Severity: medium.
3. **The path tool bar's Weight field does not show whether choosing amount will ask what it
   means.** The meaning question only appears after a run, in the path's editor. Severity: medium.
4. **No transfers screen for centrality.** Betweenness with a weight question is shown only on Les
   Miserables and the proteins; the participant had to assume the transfers look the same,
   including whether direction is followed. Severity: medium (mock coverage).
5. **Direction is named on the path ("follows transfers") but not on the centrality run shown.**
   On money, a directed and an undirected betweenness are different answers. Severity: medium.
6. **The same weight fact appears twice on a finished run, in two wordings** ("Weight: confidence,
   not used yet" and "Weight: None for this run"). Not wrong, but two phrasings of one fact invite
   a mismatch later. Severity: low.

Delights: "Nothing has been sent from this project" up front; the scope warning that says which
setting to flip; "Paths ignore amount: hops were counted, not dollars"; hops listed in time order
with amounts; "Ties: 1 of 2 as short"; every run naming its distance ("Distance = value" /
"Distance = 1 / value") in the runs list; the table column header naming how the measure was run.
