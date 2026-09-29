# Session: the cheapest route and the most central accounts, with an amount on every transfer -- Marcus, criminal intelligence analyst

Participant: Marcus, criminal intelligence analyst at a state fusion center (simulated; persona in
../../personas/intelligence-analyst.md). Mid-afternoon, a money-laundering lead on his desk, so he
pushes through more than he would on a slow day. Light theme, study view where the page has one.

Task as given by the moderator, and nothing more: "The transfers have an amount on each one. Find
the cheapest route between two accounts and the most central accounts, and tell me what each
answer used."

Screens, in the order he met them (renders in `shots/`, crops in `tmp/marcus-weight/`):

1. `screens/load-step.html`, the transfers file in the Open dialog (`screens__load-step-clean.png`;
   whole study page `r4-marcus-weight-load-step.png`)
2. `screens/binding-step.html`, top of the page (`screens__binding-step.png`)
3. `screens/sets-and-paths.html`, states 3 to 5: the Path tool's bar, the found path, "amount: what
   it means" (`sets-and-paths-s3.png`, `-s4.png`, `-s5.png`)
4. `flows/sets-and-paths.html`, sections 2 to 4 (`r4-marcus-weight-sets-and-paths-flow.png`; the
   study-view render of this page, `r4-marcus-weight-sets-and-paths.png`, came out blank white)
5. `screens/run-and-read.html`: the Catalog and a finished Betweenness (`run-and-read--catalog.png`,
   `run-and-read--done.png`). Drawn on a protein network; the moderator said to read it as if it
   were the transfers
6. `screens/results-panel.html`, Finished (`screens__results-panel--finished.png`), same protein
   network
7. `screens/table-dock.html` (`r4-marcus-weight-table-dock.png`): the March transfers ranked by
   Degree and PageRank, the protein network with three measures, and the path taken out as rows

## Transcript

**Before starting.**

> "Cheapest route. Okay, I'll be honest, that isn't how I think about money. On a laundering case
> I follow the big money, I don't go looking for the smallest. But you said cheapest, so: add up
> the dollars along the way, lowest total wins. Not fewest hops. Every tool I've used gives you
> fewest hops and calls it 'shortest'. That's the first thing I'm checking."

> "Most central, to me, is betweenness. The middleman. And 'what each answer used' means I have
> to write down, in the file, whether the dollars went into it. If I can't say that on the stand,
> I don't have an answer."

### 1. Loading the file

**Open dialog, transfers-2026-03.csv.**

> "First thing, where does this go. Top of the screen doesn't say. I'll come back to that. Format
> CSV, each row is an edge -- a link, fine. Ends from_account to to_account, Directed. Good, money
> goes one way. Sample on the right, 9,113 rows, 3,000 nodes. That matches the export."

> "amount: Currency (USD). Role: None. Hm. I want to tell it this is the weight -- that's what
> Analyst's Notebook calls the thing you put on the line. Let me open Role."

He opens the Role list on amount (the page says it holds no Weight entry).

> "No Weight in here. It's a money column and I can't say it's the weight? Then down at the bottom:
> 'Weight: amount, not used yet.' So it knows amount is the weight. It just won't use it yet. Not
> used by what? Fine. It's telling me the truth -- nothing is using the dollars right now. I'll
> take that over a tool that quietly does something with them. Load."

> "Timestamp got a Time role and it read the month, 'Mar 1 to Mar 31, UTC.' Somebody thought
> about that. Good."

### 2. A detour

He opens the binding step page because it was on the list.

> "'Apply a recipe.' Proteins, a lab lead named Maren, fold change. This isn't about my
> transfers. I don't know what a recipe is and I'm not going to learn it for this. Back."

### 3. The route, first try

**Path tool bar (state 3).**

> "Two little dots with a squiggle -- that's the route button. From ACC-271813, To ACC-233575. Yellow
> warning: 'From is outside the filtered graph. Set Scope to Full graph.' Somebody left a filter on
> riskScore. Fine, it told me which one, over on the right: 'Left out by riskScore 20 or more.' I'd
> have been angry if it just said 'no path'. Full graph."

> "Next line: 'Weight: amount, not used yet', and it's a dropdown. That's the knob I want. I'm
> going to run it first and see what it calls the answer, because I want to know what it does
> when I DON'T touch it."

**Found path (state 4).**

> "Three hops. Start, end, arrows on the lines. Right side: 'Found path (unweighted)'. And in words:
> 'Paths ignore amount: hops were counted, not dollars.' Okay. That's the sentence I'd put in the
> report, word for word. So this is fewest transfers, not cheapest. It said so. Good."

> "Table underneath: step, source, target, amount. $3,530.28, $9,782.05, $9,616.72. No dates on
> those rows in this one. I'll come back to that."

> "'Ties: 1 of 2 as short.' So there are two routes of three transfers and it's showing me one.
> Which one did it pick and why that one? If the defense attorney finds the other one, I look
> like I hid it."

> "Now the honeycomb. Hexagons in grey. What is that, a heat map? Where are my accounts? I see four
> dots with labels on a beehive. That's not a link chart. Moving on."

### 4. Telling it what the dollars mean

He clicks the Weight row on the result (state 5).

> "'amount: what it means. Applies to every result that reads amount.' Every result. Okay, hold
> that thought. 'For amount, a higher number means' -- and it's already filled in: 'a closer or
> stronger link'. Then: 'A path prefers big transfers.'"

> "Wait. It's already filled in? I never answered that. The result I'm looking at says 'not used
> yet', and the box says 'closer or stronger'. Which one is it? If I close this, did I just say
> yes?"

> "'A path prefers big transfers.' That line I like. That's plain. And it's the opposite of what
> the moderator asked for. Big transfer is a big number, and I want the route with the least
> money, so a big number has to count as far away. Let me see what else is in the list."

The popover's list is not drawn in the mock; the flow page (section 2, step 2a) lists the
choices: "a closer or stronger link (similarity) / a longer or costlier step (distance) / more
can pass through (capacity) / Don't use amount".

> "'A longer or costlier step.' Costlier. That's the one. Cheapest route means every dollar is a
> cost. The words in brackets, similarity, distance -- I don't need those, the English is enough.
> 'More can pass through, capacity' -- that sounds like a pipe. I'd never pick that on money."

> "'How it is converted.' No, I'm not opening that. If I have to know the math to use the
> dropdown, the dropdown's wrong."

### 5. What it would show

The mock has no screen for the weighted route, so he reads section 4 of the flow page, "What the
path length counted", a table of the same two accounts under each answer.

> "Here we go. 'Amount, a longer or costlier step (distance)': ACC-271813, ACC-946224, ACC-670564,
> ACC-233575. 'Found path, 3 hops, distance $22,397.82'. 'Weight: amount, used as distance.' That's
> my answer. It went through 670564, not 242954. And it gives the total in dollars. I'd have added
> those up by hand otherwise."

> "Quick check. The other route, through 242954: 3,530.28 plus 9,782.05 plus 9,616.72 -- about
> twenty-two nine. This one: 3,530.28 plus 9,468.23 plus 9,399.31 -- twenty-two three ninety-seven.
> Yeah, it's cheaper. Five hundred and something dollars cheaper."

> "But -- is that the cheapest route in the whole month, or the cheaper of the two three-hop
> routes? There are transfers in this file for five bucks. A five-hop route through five-dollar
> transfers beats twenty-two thousand easily, if one exists. The screen says '3 hops, distance
> $22,397.82'. It doesn't say 'no cheaper route exists at any length'. I'd assume it searched
> everything, but I'd want it to say so, because that's the first question on cross."

> "And then the last column says: '(the wrong reading here)'. 'Treating money as a cost makes the
> strongest ties the longest: the failure the question guards against.' Wrong? You asked me for
> the cheapest route. That IS money as a cost. I get what they mean -- if I'm tracing the big
> money, big transfers are the strong links. But the question was cheapest. If the screen ever
> tells me my reading is 'wrong' when it's exactly what I was asked, I'm going to stop trusting
> its opinions. Tell me what it does. Don't grade me."

> "The same table says 'A weighted search has no tie here, so one route is drawn.' Good. Unweighted
> there was a tie, weighted there isn't. That I can explain."

### 6. The route as records

**Table, "Selected: 5 edges on 2 paths" (table-dock), and the rows in the flow page.**

> "This is what I actually need. from_account, to_account, timestamp, hop, amount, on paths. Each
> transfer with its date. 2026-03-04, then 03-07, then 03-08 or 03-09. The money moves forward in
> time. 'In order.' If a hop went backwards in time it says 'earlier than the hop before' with a
> little clock. That's the thing that bites you -- a link chart that shows money moving before it
> arrived. Somebody's been burned by that. Good."

> "'Export table as CSV' right there. So the rows go to Excel and into the case file. Every line
> has a record behind it. That part I'd use tomorrow."

> "What I don't see anywhere: a total row. The distance line gives $22,397.82 for the weighted
> route, but the table of rows doesn't add them up. For the unweighted pair I'm adding in my head."

### 7. The most central accounts

**Run a measure / Catalog (run-and-read).**

> "Results, the flask. Catalog: Centrality -- Betweenness. Tooltip: 'How often a node lies on the
> shortest paths between other nodes: the brokers and bottlenecks. Click to run.' Brokers. That's
> the middleman. Thank you for saying it in one line. Closeness, Eigenvector, Harmonic, HITS, Katz,
> PageRank -- I don't know half of those and I'm not going to."

**Finished Betweenness (run-and-read done, results panel Finished).** Read as if these were the
transfers.

> "'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. CPU.' Unweighted. Okay,
> so the dollars didn't go in. Undirected -- on money that should be directed, but on this
> protein thing I guess not."

> "Weight: 'None declared.' And on the other screen the same thing says 'Weight: confidence, not
> used yet. Change...' and further down 'Weight: None for this run.' That's three ways of saying
> the same thing on two screens. On the stand I say one sentence. Which one is it?"

> "Now here's my problem. Back on the route, the popover said 'Applies to every result that reads
> amount.' So if I set amount to 'costlier step' for the cheap route -- does my betweenness now
> use dollars as a cost too? Because I don't want that. For the middleman, I want who sits between
> the crews, count of connections. Or maybe by money moved, the big way. Definitely not 'the
> account on the cheapest routes'. That's a different question."

> "The result panel says 'Weight: None for this run.' So I can switch it off per run. Then what
> does 'applies to every result' mean? Every result that I didn't switch off? I'd have to run it
> both ways and compare to know what it did, and I haven't got time for that."

> "Top nodes: 1 MAPK1 0.1379. Point one three seven nine of what? A share of all the shortest
> routes, I'm guessing. The tooltip on 'Exact' says 'computed on every node, not estimated. It does
> not say the ranking is meaningful.' Ha. At least it's honest."

**Transfers table (table-dock, March transfers).**

> "Here's the real data. Degree and PageRank, 'damping 0.85, unweighted, full graph' written right
> in the column header. That's the one I'd put in the report: what was run, with what, on what.
> The line on top: 'The top 10 are the same on both measures, led by ACC-393859.'"

> "Who's ACC-393859? Down in the other table -- kind: merchant, US, riskScore 0. The most central
> account in my transfer file is a store. Of course it is. Everybody pays the store. Degree 907.
> I'd have to filter merchants out before any of this means anything, and nothing here warned me."

> "No betweenness on the transfers table. The betweenness I saw was on proteins. So for 'most
> central' on my actual data I've got PageRank and degree, both unweighted. I'll take degree --
> I can explain degree: this many different accounts."

> "The protein table has 'Louvain weighted, seed 7' next to 'Betweenness exact, unweighted'.
> Weighted by WHAT? Which column, read which way? It says 'unweighted' clearly for the others and
> then just 'weighted' for this one. That's exactly the question you asked me -- what did it use --
> and that header doesn't answer it."

### 8. His answer to the moderator

> "Cheapest route from ACC-271813 to ACC-233575: through ACC-946224 and ACC-670564, three transfers,
> $22,397.82 total, March 4 to 9, in time order. That used the amounts, with a bigger amount counted
> as a costlier step -- the screen says 'Weight: amount, used as distance'. The fewest-hops answer,
> which ignores the dollars, gives two three-transfer routes tied, and it says 'Unweighted: counts
> transfers'."

> "Most central: by PageRank and degree, both unweighted, full graph -- the column header says so --
> ACC-393859, which is a merchant, so that answer's useless until I take the merchants out.
> Betweenness I could only see on the sample network, unweighted. I can't tell you for sure
> whether setting amount as a cost for the route would have changed the centrality later, because
> the screen said it applies to every result and the results panel said none for this run."

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 3.**

> "Three. The route part is a five if the weighted screen really looks like that table. It tells
> you hops or dollars, gives you the total, and the rows come out with dates. The part that costs
> it is the weight box coming up already filled in with the opposite of what I needed, and not
> knowing whether that one answer leaks into the centrality. And the centrality on the real data
> hands me a store."

**Would he use it instead of his current tool?**

> "Instead of i2? No. Everything I've got is in .anb and the guy down the hall only has i2. Next to
> i2, for this one job -- route between two accounts with the dollars and dates as rows I can
> export -- yes, I'd use it, if IT signs off on where the data goes. I never did find a line on the
> load screen that told me that. i2 can't give me a dollar-total route at all; I do that in Excel
> by hand. What it does that Excel doesn't is exactly that. But I'd want it to stop pre-filling
> answers I didn't give, and I'd want every result to say which column and which way, every time,
> in the same words."

## What he got stuck on, in his words

1. "The weight box was already filled in with 'closer or stronger' before I'd said anything, while
   the result next to it said 'not used yet'." (sets-and-paths state 5)
2. "'Applies to every result that reads amount' -- then my cheap-route answer changes my middleman
   ranking? The results panel says 'None for this run.' Which wins?"
3. "It found a three-hop cheapest route. Did it look at longer routes through small transfers? It
   doesn't say."
4. "Your own page calls the costlier-step reading 'the wrong reading here'. It was the question.
   Don't put that attitude in the product."
5. "'None declared', 'not used yet', 'None for this run': three wordings for the same fact."
6. "'Louvain weighted' -- by what?"
7. "The top account is a merchant and nothing told me."
8. "The found path's table has amounts but no total, and in the first view no dates."
9. "No Weight in the Role list, for a money column. I went looking for it there first."

## Moderator notes

- The study-view render of `flows/sets-and-paths.html` (`--study`) is a blank white page; the
  participant used the normal render.
- There is no mock of the weighted route's result or of the popover's open list; the participant
  read both from the flow page's tables, which a real user would never see.
- The found-path screen (state 4) shows the edge rows without timestamps; the table-dock and the
  flow page show them with timestamps.
