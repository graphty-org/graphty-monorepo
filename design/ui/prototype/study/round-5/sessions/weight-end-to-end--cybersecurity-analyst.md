# Session: weights from load to answer -- Priya (threat hunter)

- **Participant:** Priya, senior threat hunter in a bank SOC (study/personas/cybersecurity-analyst.md)
- **Task, as read by the moderator:** "The transfers have an amount on each one. Find the cheapest
  route between two accounts and the most central accounts, and tell me what each answer used."
- **Pages worked:** screens/load-step (Clean), screens/binding-step, screens/sets-and-paths (states
  1 to 7), flows/sets-and-paths, screens/run-and-read, screens/results-panel (catalog, Finished),
  screens/table-dock (Three measures ranked, Getting rows out).
- **Outcome:** failure. She got a route, but it was the fewest-hops route, not the cheapest, and she
  knew it. She could not find a way to make amount mean cost. She never saw a centrality result on
  the transfers at all.
- **Single Ease Question:** 2 of 7.

---

## Before anything

"Same three questions as always. Is it approved, where does it run, does it phone home. The left
rail says 'Assistant Off. Nothing is sent.' OK, that's the phone-home answer, sort of. It's a claim,
not something I can check, but it's the right claim in the right place. Still not approved. For a
real trial I'd stop here. This is a lab file of transfers, not bank logs, so I'll keep going."

"Also: transfers aren't my world. I'll treat accounts like hosts and a transfer like a logon. The
'cheapest route' is the path of least resistance. Fine, I get the idea."

## Step 1. Loading the file (screens/load-step, Clean)

"Open transfers-2026-03.csv. It guessed CSV with a header, each row is an edge, from_account to
to_account, directed. Good, and it shows its guess, which is what I want. 9,113 rows, 3,000 nodes,
9,113 edges -- rows equal edges, nothing dropped. I like that the numbers line up."

"timestamp: 'Date and time, UTC', and the column header says Mar 1 to Mar 31. That's the time range.
First tool this month that told me the range without me asking. Good."

"amount: 'Currency (USD)', Role 'None'. Down at the bottom: 'Weight: amount, not used yet.' So it
knows amount is a number and it's deliberately not using it. I'd have expected to set the weight
right here, next to the column. Let me open the Role list."

(Reads the HTML for the Role control: Role starts at None and offers no Weight.)

"No Weight role. So where do I tell it amount is a cost? It says the meaning is asked 'by the first
run that uses it'. Fine, I'll believe that for now. But I'm already nervous: I'm loading something
where the one column the task is about is 'not used yet', and I have no idea what it'll be used as
later. Load."

## Step 2. The binding page (screens/binding-step)

"This is recipes -- somebody else's saved analysis, genes, fold change. Not my task. There's a link
'What a weight means', and a line saying 'What a weight means is asked once, on the column, and every
measure and the Path tool read that one answer.' Once. On the column. For everything. Hold that
thought, because the task has two questions and I don't think they want the same answer."

She moves on without using anything here.

## Step 3. The cheapest route (screens/sets-and-paths)

"State 1. March transfers, Graph panel, 'Sets and paths' on the left. There's a Path tool in the
toolbar, the two-lines icon. I'd rather type a query, something like 'shortest path from A to B
weighted by amount', but there's no box. OK, the tool."

State 3, Path tool:

"From ACC-271813, To ACC-233575. Scope 'Filtered graph' with a warning: 'From is outside the
filtered graph. Set Scope to Full graph to search it.' Good -- that's a real error with the fix in
it. And right there: 'Weight: amount, not used yet', with a dropdown. There it is. This is where I
say amount is the cost."

(Checks what the dropdown offers in the HTML: it is a static field with no option list.)

"The dropdown doesn't open. It just says 'amount, not used yet'. So I either run it like this or I
don't run it. I'll set Scope to Full graph and hit Run, and see what it tells me."

State 4, Found path:

"'Found path (unweighted), 3 hops.' Right in the name. And under Created from: 'Weight: amount, not
used yet. Paths ignore amount: hops were counted, not dollars.' OK. Credit where it's due: it did
not lie to me. It told me in plain words this is the fewest-hops route, not the cheapest. That's
exactly the line I'd need before I put this in a case."

"The hops come out as rows in the Edges tab, in path order: $3,530.28, $9,782.05, $9,616.72. And
'Ties: 1 of 2 as short'. So there's another 3-hop route and I'm only looking at one. Which one did it
pick, and why this one? The table-dock page shows both paths together, with an 'on paths' column --
2 of 2, 1 of 2 -- that's better. Here it's one of two and I can't see the other."

"But look at the amounts: $9,782 and $9,616. The whole file runs $5 to $9,895. This route goes
through two of the biggest transfers in the month. If 'cheapest' means anything, it isn't this."

State 5, What amount means (she clicks 'amount, not used yet' in the Weight row of the inspector):

"There's the question. 'amount: what it means. Applies to every result that reads amount. For
amount, a higher number means: a closer or stronger link. A path prefers big transfers.'"

"No. No no. That's the default? 'A path prefers big transfers'? I asked for the cheapest route and
the preset answer makes it go looking for the biggest money. If I'd been in a hurry and just clicked
through, I'd have gotten a 'weighted' route that's the opposite of what I asked for, and it would
have said 'weighted by amount' on it and looked legit. That's worse than the unweighted one."

"Open the list. I want 'a cost' or 'a distance'."

(The field has no options in the HTML. 'How it is converted' is a closed disclosure; the page's
note says 1/w is the default, with 1 - w and -log w behind it.)

"It won't open. I can't see what else it offers. 'How it is converted' -- converted? One over w? If
amount is already a cost I don't want it converted to anything, I want it summed. I can't tell
whether that's even an option. So I'm stuck at: either unweighted, or 'prefers big transfers'. I'd
give up on the path here and go do it in the notebook with networkx, where I write
weight='amount' and I know what that means."

"And 'Applies to every result that reads amount.' That's the thing from the recipe page. If I set
amount to cost for the route, it's cost for everything. Hold on to that for the centrality part."

State 6 and 7 (No path, Frozen copy) she skims: "'No path' tells me why, fine. Frozen copy, fine.
Not what I need."

## Step 4. The most central accounts (screens/run-and-read, results-panel, table-dock)

"Now centrality. Where do I run it? Main menu, Algorithms, Centrality: Betweenness, Closeness,
Eigenvector, PageRank... That's a list I know. I'd pick betweenness -- choke points, the accounts
money has to pass through."

"But this is human proteins. 300 proteins. The run-and-read page, the results panel, all of it is
proteins. The table dock's ranked state is proteins too. Where are my transfers?"

(The table dock's Large graph state is the 3,000 March accounts, sorted by pagerank, with 14
flagged accounts selected. It has no weight or method line she can find in the render.)

"There's one table of the March accounts sorted by pagerank, but I can't see what that pagerank
used. So I'll read the protein ones for how it would tell me."

Results panel, Finished:

"'Betweenness Result. On: full graph, 300 nodes, 3 components. Exact. Undirected. WebGPU. Weight:
confidence, not used yet. Change...' And down in Options: 'Weight: None for this run.' OK, that's
what I want -- every answer says what it used, on the answer. The table header says it too:
'Betweenness exact, unweighted, full graph', 'PageRank damping 0.85, unweighted, full graph'. If I
export the table, does 'unweighted' go into the CSV header? The table page says the CSV writes
'those headers'. Good, if true. That's the part of this I'd actually take to my lead."

"'Change...' next to the weight. What does it do?"

(The link goes nowhere in the mock.)

"Nothing. Same as the path. So for centrality, same wall: it'll tell me honestly it didn't use the
amount, and it won't let me make it use the amount."

"And here's the thing I was holding onto. For the route, amount is a cost: small is good. For
'most central', which central do I mean? If I want the accounts the most money flows through,
amount is a strength -- big is important. If I want betweenness over the cheap routes, amount is a
cost again. Those are two different questions and this thing wants one answer 'for every result
that reads amount'. So the moment I fix the route, I've maybe broken the ranking, or the other way
round, and nothing on the ranking would tell me I changed it unless I go read the line again."

"And honestly, for money, the first 'central' I'd want is just: total dollars in and out per
account. Weighted degree. Sum of amount. I don't see that in the Centrality list. Degree is there
as a column but it's counts, not dollars."

## Step 5. Getting it out

"Export table as CSV is there, top right of the table. Path hops open as edge rows with the time
right after the accounts, and the hops in order. That's the part I'd use: the route as rows, with
times, in order. That is a lateral-movement view, basically. Good."

"'Export files...' top right on the path screens, and a pin on the path, 'Keep path'. OK."

## What each answer used, as she reports it to the moderator

"The route: fewest hops, full graph, 3,000 accounts, direction follows the transfers. It did NOT
use amount -- it says so. It's one of two equally short routes. It goes through two of the largest
transfers in the month, so it's probably close to the most expensive route, not the cheapest. I
couldn't make it use amount as a cost."

"The central accounts: I never got them on the transfers. On the proteins it said betweenness,
exact, unweighted, full graph. I'd expect the same on transfers -- unweighted -- because the weight
control doesn't work."

"So the answer to your task is: I can tell you exactly what each answer used, and what each answer
used is 'not the amount'. Which means I didn't answer the task."

## Single Ease Question

"Two. It's a two because it was honest. Every result said 'unweighted' or 'not used yet' where I
could see it, so I didn't walk away with a wrong number. But I couldn't do the actual thing, and the
one choice it showed me for amount was backwards for 'cheapest'."

## Would she use this instead of her current tool?

"No, not for this. In the notebook I type weight='amount' and I get the cheapest path, and the code
is the record of what I used. Here I can't set it, and when I can, it's one switch for the whole
project, set to 'bigger is closer' by default. I'd come back for the hop list -- route as rows, in
order, with times, exported with headers that say what was used. That's genuinely nicer than what
I get out of BloodHound. But it'd have to be approved first, and I'd need a box I can type the query
into."

---

## Problems observed

1. **The default meaning of amount is backwards for a cost question.** The only visible reading,
   "a closer or stronger link -- a path prefers big transfers", makes the cheapest route seek the
   largest transfers. She said a fast user would get a route labelled "weighted by amount" that is
   the opposite of cheapest. Severity 4.
2. **The meaning of amount is one setting for the whole project**, while her two questions need
   different readings (cost for the route; strength, or dollars moved, for "central"). Nothing on a
   finished ranking would warn that a later change for the route altered what it reads. Severity 4.
3. **She cannot see the other readings.** The dropdown on the Path tool and in the popover does not
   open, and "Change..." beside the weight on a result does nothing, so the task's core step could
   not be tested. She read "How it is converted" (1/w) as a sign that a cost would be distorted,
   not summed. Severity 4 for the session (mock gap), 3 as design (a cost needs no conversion; say
   so).
4. **No weighted degree / "total amount per account"** among the measures. It was the first
   "central" she wanted for money. Severity 3.
5. **Centrality is never shown on the transfers.** Every run and result page shows proteins; the one
   transfers ranking (table dock, Large graph) does not show what pagerank used. She had to answer
   the centrality half by analogy. Severity 3 for the study.
6. **Load gives no place for the weight's meaning**, only "amount, not used yet". She expected to
   set it next to the column and was nervous loading a file where the task's one column had no
   stated use. Severity 2 (the deferral is explained; she accepted it grudgingly).
7. **"1 of 2 as short" with only one path drawn** on the found-path screen; which one was chosen, and
   why, is not said. The table dock's both-paths view with "on paths" was better. Severity 2.
8. **The rail changes between screens** (Results appears on some sets-and-paths states and not
   others, and not on the results panel). She noticed the button move. Severity 2.
9. **No query box** for "shortest path weighted by amount". Severity 2 (a known preference of hers).

## What worked, in her words

- "'Found path (unweighted)' and 'Paths ignore amount: hops were counted, not dollars.' It didn't
  lie to me."
- "Every ranking says what it used -- exact, unweighted, full graph -- on the answer and in the
  table header."
- "The load step showed its guess, the rows equal the edges, and it told me the time range: Mar 1 to
  Mar 31, UTC."
- "The route comes out as rows, in hop order, with the time next to the accounts."
