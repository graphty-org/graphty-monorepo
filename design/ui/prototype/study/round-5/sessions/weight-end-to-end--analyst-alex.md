# Session: one money column, two questions -- Analyst Alex

**Participant:** Alex, operations data analyst. NetworkX for the numbers, Gephi for the picture.
Mild red-green colour vision deficiency.

**Task, as the moderator gave it:** "The transfers have an amount on each one. Find the cheapest
route between two accounts and the most central accounts, and tell me what each answer used."

**Screens seen, in order:** the load step, clean transfers file
(`shots/record/r4-alex-weight-e2e-load-step.png`, first frame); the recipe binding step, only the
"what a weight means" part (`shots/record/r4-alex-weight-e2e-binding-step.png`); the run menu and the
first betweenness result (`shots/record/r4-alex-weight-e2e-run-and-read.png`); the sets and paths screen
(`shots/record/r4-alex-weight-e2e-sets-and-paths.png`) and the flow's screens 3 to 7
(`shots/sets-and-paths-s3.png` to `-s7.png`, the path tool, found path, "amount: what it means",
no path, frozen copy); the flow's table "What the path length counted"; the results panel, mainly
the finished betweenness and the "Review out of date" states
(`shots/record/r4-alex-weight-e2e-results-panel.png`); the table dock, the transfers Nodes tab and the
path's Edges tab (`shots/record/r4-alex-weight-e2e-table-dock.png`).

Note for the reader: the transfers mocks show the path search and an unweighted PageRank, but no
screen shows a weighted path result or a weighted centrality on transfers. Where Alex reads a
weighted result below, he is reading it from the flow's table of what the path length counted
(the one place the weighted route and its $22,397.82 total appear), or guessing from the protein
screens what the same run would look like on transfers. Those steps are marked "(inferred)".

**Outcome:** success with difficulty. Alex got a cheapest route that he trusts and can state in
dollars, after one surprise (the path tool showed "amount" in its Weight field but counted hops).
He did not get a "most central" answer that uses amount in the way he meant it. The tool asks
once, for the whole project, what a higher amount means. His answer for the route ("a higher
amount is a costlier step") is the opposite of what he wants for centrality ("more money is a
stronger tie"). Changing it marks the route out of date. He ended up reporting an unweighted
centrality and saying so, which is honest but is not the question he was asked.

---

## Transcript (thinking aloud)

### 1. Opening the file

> transfers-2026-03.csv. Before I do anything: down the left it says "Assistant Off. Nothing is
> sent." OK. That's the line I look for. I'd still want to know whether the file itself goes to a
> server, but at least nothing's hiding it.

> Format CSV, each row is an edge, from_account to to_account, directed. Good, that's how I'd have
> set it up. amount is "Currency (USD)", timestamp is "Date and time, UTC" -- it actually read the
> Z. Nice. 3,000 nodes, 9,113 edges. That's what I'd have got from the SQL count, so I believe it.

> Role for amount says None. I want this to be the weight, so let me open that... [reads the
> Role list for amount] ...there's no Weight in there. Huh. Then underneath, "Weight: amount, not
> used yet." So it knows amount is the weight, it's just not using it? Or it's saying amount is a
> number column it could use? I'll take it as "it'll ask me later". I don't love that I can't just
> say it here, where I'm looking at the column, but it's not blocking me. Load.

### 2. Where do I even say what amount means?

The moderator let him glance at the recipe apply screen, because it has the only full list of
answers visible before a run.

> "For confidence, a higher number means: a closer or stronger link / a longer or costlier step /
> more can pass through / Don't use confidence." OK. So that's the question. That's actually the
> question NetworkX never asks me -- betweenness just treats weight as a distance and PageRank
> treats it as a strength and you find out from a Stack Overflow answer. Fine. I'll look for that
> same question on my own file.

### 3. The cheapest route: finding the tool

> Cheapest route. It's going to call it shortest path, they always do. I'll type it -- Ctrl+K,
> "path". [the Algorithms menu has Path > Shortest path, "two nodes..."] OK, that's there. There's
> also this toolbar icon with the two curvy lines, which turns out to be the same thing. I'd never
> have guessed that icon, I'd have typed.

> Now which two accounts? You didn't tell me, so I'll take the two that are already sitting on
> the canvas, ACC-271813 and ACC-233575.

[Screen 3: the path bar. From ACC-271813, To ACC-233575, Scope "Filtered graph" with a warning,
Weight "amount, not used yet". Line: "From is outside the filtered graph. Set Scope to Full graph
to search it."]

> Wait, why is there a filter on? "Filtered: 1,071 of 3,000 nodes." I didn't make that. OK,
> somebody's left a riskScore filter on. At least it tells me instead of silently not finding it.
> Scope, Full graph.

> Weight says "amount, not used yet". So... amount is picked. Good, that's what I want. Run.

### 4. The first route, and the surprise

[Screen 4: Found path (unweighted), 3 hops. Created from: Weight "amount, not used yet". "Paths
ignore amount: hops were counted, not dollars." Ties "1 of 2 as short". Edges tab: $3,530.28,
$9,782.05, $9,616.72.]

> Found path, three hops. Hang on -- "(unweighted)". And "Paths ignore amount: hops were counted,
> not dollars." But the box said amount! I literally had amount in the Weight field. So "not used
> yet" meant "not used", full stop. That's the kind of thing I'd have missed if it didn't also
> print that sentence in plain English. The sentence saved me; the field lied to me.

> And "1 of 2 as short" -- so there's a tie on hops, fine, that's expected with hop counts.

> The Edges tab at the bottom gives me the three transfers with amounts. Good, that's the table I'd
> paste. No total though. I'd have to add them up myself.

### 5. Telling it what amount means

[Screen 5: clicking the Weight row opens "amount: what it means". "Applies to every result that
reads amount. For amount, a higher number means [a closer or stronger link]. A path prefers big
transfers. > How it is converted".]

> OK, here's the question. It's already set to "a closer or stronger link" -- did I pick that? I
> didn't pick that. It looks like a default. "A path prefers big transfers." No. I asked for
> cheapest. Cheapest means the smallest total amount. So a bigger amount is a costlier step.

> [opens the list] "a longer or costlier step (distance)". That one. The word "costlier" is right
> there, which helps, because "distance" on money would have made me pause.

> "Applies to every result that reads amount." Hmm. Every result. I'll come back to that.

> I'd expect it to re-run. There's no Run or Apply button in that box, so I assume picking it does
> it, or I have to hit Run on the path again. Not sure which.

### 6. The cheapest route, weighted (inferred)

No screen shows this state. Alex reads it from the flow's table "What the path length counted",
the row for "a longer or costlier step (distance)".

> So with amount as a cost, it goes ACC-271813, ACC-946224, ACC-670564, ACC-233575. "Found path,
> 3 hops, distance $22,397.82", "Weight: amount, used as distance". That's the route through the
> $9,468 and $9,399 transfers instead of the $9,782 and $9,616 ones. Checks out -- 3,530.28 plus
> 9,468.23 plus 9,399.31 is 22,397.82. I added it up in my head, roughly, and it's right.

> I'd call it "cost", not "distance", in a slide. But it puts a dollar sign on it, so I know it's
> the sum of amounts and not some converted number. That I like.

> And then -- the table next to this says "(the wrong reading here)" for my row. For their fraud
> person, sure, following the big money is the point. For "cheapest", it's the right reading. So
> the tool's own notes think amount-as-cost is a mistake, and my task says it's the whole point.
> I'm glad it asked instead of deciding.

### 7. The most central accounts

> Now central. I'll do what I always do: betweenness, and PageRank because somebody will ask.
> Ctrl+K, "betw"... Run Betweenness. It runs straight away.

[From the run-and-read and results-panel screens (protein network): Betweenness, "Exact.
Unweighted, undirected. CPU." Options: Weight "None for this run". State line on the finished
result: "Weight: confidence, not used yet. Change..."]

> It says Unweighted. Fine, honest. And Weight: "None for this run". So there's a per-run weight
> after all? Then in the result it says "Weight: confidence, not used yet. Change..." -- two
> different ways of saying it wasn't weighted. OK.

> On transfers, the table already has "PageRank damping 0.85, unweighted, full graph" and "degree
> (total, full graph)", and one line above: "The top 10 are the same on both measures, led by
> ACC-393859." That line is great. That's exactly the sentence a director wants: two measures,
> same top ten.

> But that's unweighted. You asked me to use the amounts. So: Weight, None for this run -> amount.
> And now what does it do? It reads the answer I gave for the path. Amount is a cost. So
> betweenness weighted by amount-as-cost finds the accounts that sit on the cheapest routes. And
> PageRank weighted by amount-as-cost... it'd have to flip it, so a $9,000 transfer counts less
> than a $5 one. For "who's central in the money", that's backwards. I want big transfers to count
> more.

> So for centrality I want "a closer or stronger link". For the route I wanted "a longer or
> costlier step". Same column. And it said "Applies to every result that reads amount."

### 8. Trying to have both

[Results panel, "Review out of date": "Shortest path used confidence as a distance. It is now used
as similarity. Re-run to update. Betweenness and Closeness did not use the weight, so they stay
current." Button "Re-run all".]

> OK, so if I change amount to "stronger link", my route goes out of date and it wants me to re-run
> it -- and re-running it would give me the big-transfer route, which isn't cheapest any more. So I
> can't have both answers live at the same time.

> Can I keep the old route? There's "Keep path" on the found path. Maybe a kept path is frozen,
> like the "frozen" sets in the list? I don't know. The frozen copy screen is for a set, not a
> path. I'd try it and hope. If it doesn't hold, I'd screenshot the route first, which is exactly
> what I do in Gephi and exactly what I wanted to stop doing.

> Honestly? What I'd do is: keep amount as a cost, report the route, and for centrality either
> run it unweighted and say "unweighted", or make a second column -- like 1 over amount -- except
> I don't think I can make that column here without going back to pandas. There's a "New column"
> in the column menu, but I don't know what's in it.

> The other thing I'd actually want for "central in the money" is just total amount in and out per
> account. Weighted degree, strength, whatever you call it. The catalog has Betweenness, Closeness,
> Eigenvector, Harmonic, HITS, Katz, PageRank. No "total amount". Degree here is a count. That's
> the first number my manager would ask for and I can't get it.

### 9. "What did each answer use?"

> The route: the state line says "Weight: amount, used as distance", scope full graph, follows
> transfers. Plus the dollar total. That I can write down. (inferred -- from the flow's table.)

> Centrality: the table header says "PageRank damping 0.85, unweighted, full graph". That's
> really good -- the method's right there in the column header and in the CSV header too. I'd paste
> that straight into a footnote.

> But on the protein one, Louvain's header just says "Louvain weighted, seed 7". Weighted by what?
> As what? If I'd run a weighted betweenness on amount, would the header say "weighted" and nothing
> else? Then my footnote says "weighted" and the director asks "by what" and I have to go dig.
> The run record behind Details spells it out ("Weight conversion: confidence used as given, as
> similarity"), but that's two clicks deep, and it's not in the export header.

> And one thing I'm not sure about: that "Weight: amount, used as distance" line -- is it about
> this run, or about the column? The betweenness result says "Weight: confidence, not used yet"
> while its own option says "None for this run". Once I've answered amount for the path, does an
> unweighted betweenness now say "Weight: amount, used as distance"? If it does, I'll put in my
> deck that betweenness used amount when it didn't. That's the one that would embarrass me.

---

## The answer Alex gives the moderator

> "Cheapest route from ACC-271813 to ACC-233575 is three transfers: through ACC-946224 and
> ACC-670564, $22,397.82 total. That used amount as a cost -- I had to tell it that; out of the box
> it counted hops and gave me a different route through ACC-242954 even though the Weight box said
> amount. Full graph, following the direction of the transfers."

> "Most central: ACC-393859 leads, and the top ten are the same on PageRank and on degree. Both of
> those are unweighted -- they ignore the amounts. I didn't weight them because the tool only lets
> amount mean one thing at a time, and I'd set it to 'cost' for the route. Weighting centrality by
> cost would make big transfers count less, which is backwards for this question. If you want
> central-by-money, I'd do total amount per account in pandas."

---

## Single Ease Question

**3 out of 7.**

> The route was fine once I found the meaning question -- maybe a 5 on its own. Centrality with
> the amounts, I couldn't do the way I meant it. And the Weight box saying "amount" on an
> unweighted path cost me a minute of doubt.

---

## Would he use this instead of his current tool?

> For the route: yes, actually. Picking the two accounts on the picture, seeing the hops in a
> table with the amounts, and having it say "used as distance" next to the answer -- that's better
> than dijkstra_path in a notebook and then drawing it in Gephi. And it made me say what amount
> means, which NetworkX never does; I've probably shipped a betweenness with money-as-distance
> before and never known.

> For centrality on money: no, not yet. One meaning per column, for the whole project, doesn't fit
> how I work -- I ask two questions of one column all the time. In pandas I just pass a different
> column. Until I can say "this run reads amount as strength" without breaking the route, or get a
> total-amount-per-account measure, I'm doing that half in Python and the tool is where I make the
> picture. Which is where I am today.

---

## Problems observed

1. **Weight field shows a column while the run ignores it** (path bar, screen 3; found path,
   screen 4). The Weight field reads "amount, not used yet", which Alex read as "amount is
   selected". The run then counted hops. Only the separate sentence "Paths ignore amount: hops
   were counted, not dollars" caught it. Severity 3.
   > "The sentence saved me; the field lied to me."
   The flow's own text says the field's default reads "none: count transfers"; the mock shows
   the column name instead.

2. **One meaning per column blocks two ordinary questions on the same column** (the "amount:
   what it means" popover; "Review out of date"). "Cheapest route" needs amount as a cost;
   "central by money" needs amount as a strength. Answering one makes the other wrong, and
   changing the answer marks the first result out of date, with "Re-run" as the only offered
   action. Severity 4: it decided the outcome of half the task.
   > "I ask two questions of one column all the time. In pandas I just pass a different column."
   The mock itself marks where the meaning lives (on the column or on each run) as an open
   decision; this session is evidence for a per-run override.

3. **The meaning select looks preselected** ("a closer or stronger link" already shown, screen 5),
   while the binding step shows "Choose" for the same question. Alex asked "did I pick that?". A
   default here is the exact failure the question exists to prevent. Severity 3.

4. **No total per account ("strength", weighted degree)** in the catalog. Degree on transfers is
   a count. For money data this is the first "central" number a manager asks for. Severity 3.
   > "That's the first number my manager would ask for and I can't get it."

5. **"Weighted" without "by what, as what"** in the table's group header and the CSV header
   ("Louvain weighted, seed 7"). The full answer sits in the run record, behind Details. For
   "tell me what each answer used", the header is where he copies from. Severity 3.

6. **The weight sentence reads as the column's state, not the run's** (results panel: "Weight:
   confidence, not used yet" next to "Weight: None for this run"). Alex feared that after the
   column is answered, an unweighted run would print "Weight: amount, used as distance" and he
   would report it as weighted. The mocks do not show this case, so it is unresolved, but the
   wording invites it. Severity 3.

7. **No weighted result is mocked for transfers.** The cheapest route with its $22,397.82 total
   exists only as a row in the flow's table; no weighted centrality on transfers exists at all.
   Alex had to infer the end state of both halves of the task. Severity 2 (a gap in the mocks,
   not the design).

8. **No total on the path's rows.** The Edges tab lists each hop's amount but not the sum; the
   total is only in the state line (inferred). Severity 2.

9. **Role list on the load step has no Weight**, while the same dialog says "Weight: amount, not
   used yet". Alex tried to set it there first. Mild, recovered in seconds. Severity 1.

10. **After answering the meaning, it is not clear whether the path re-runs.** The popover has no
    Run or Apply. Severity 2.

11. **"Keep path" is not clearly a frozen copy.** With the route about to go out of date, Alex
    wanted to freeze it; only sets show a "frozen" copy. Severity 2.

---

## What worked for him

- "Assistant Off. Nothing is sent." visible from the first screen.
- Counts at load (3,000 and 9,113) he could check against SQL; the timestamp read as UTC.
- "Paths ignore amount: hops were counted, not dollars." Plain, specific, and the only thing that
  stopped a wrong answer.
- The meaning question itself, with "costlier" in the words: "That's the question NetworkX never
  asks me."
- A dollar-denominated path total ("distance $22,397.82") that he could verify by hand.
- The table's group header "PageRank damping 0.85, unweighted, full graph", carried into the CSV
  header.
- The agreement line "The top 10 are the same on both measures, led by ACC-393859."
- The out-of-date review naming which results used the weight and which did not.
