# Session: transfers weighted by how often two accounts trade -- Dr. Chen (computational biologist)

Task as given: "Two accounts that trade with each other often should be treated as more tightly tied
than two that traded only once, whatever the sums -- and graphty should use that in every later
analysis. Set that up as the transfers come in. The data on screen is a sample: one month of card and
bank transfers between accounts."

Renders: design/ui/prototype/tmp/round-7-sessions/t20-transactions--bioinformatics-researcher/01.png to 11.png
All commands run from design/ui/prototype with
`timeout 120 node app-b/study.mjs --try <render> task:t20-transactions <steps>`.

## Start screen

Think-aloud: "Fine, it's an import screen and it's already guessed the columns. from_account, to_account,
amount is the Weight, 'Higher means Stronger'. So right now the tie strength is the sum of money, which
is exactly what I'm told not to use. In my world this is the difference between weighting by STRING
combined score and weighting by number of independent experiments. I want the count of transfers per
pair as the weight. There's a toggle 'One edge per Row / Pair'. Pair is the collapse step. The match
report says 'No two transfers share both ends'. In a month of card transactions? Every account pair
traded exactly once? That's odd. Either it's a toy sample or it's counting A->B and B->A as different
pairs. Note it, move on."

## Step 1 -- collapse to one edge per pair (01.png)

Command: `--click "Pair"`

"Good. 'One row per pair: each is one edge, its count the rows it merged.' It made a derived count
column and a 'timestamp (latest)'. That's the right idea, it's what I'd do with dplyr group_by + n().
But amount is still the Weight and it's now set to Combine: Sum. Count is an 'Attribute'. I need to
swap them. Every count is 1, which fits 'no two transfers share both ends', so in this sample the weight
will be flat. Whatever; the setup is what matters, the real feed will have repeats."

## Step 2 -- make count the weight (02.png, 03.png)

Commands: `--click "Pair" --click "Attribute"`, then add `--click "Weight"`

"The menu under count is a list of roles: Subtype, Name, Time, Weight, Edge id, Position, Attribute.
Weight. Toast: 'Weight moved from amount to count. Undo.' Clear, I like that it says it moved rather than
leaving me with two weights. Higher means Stronger on count. Correct: more transfers, tighter tie."

## Step 3 -- direction (04.png)

Command: add `--click "Undirected"`

"'Trade with each other.' If A pays B ten times and B pays A ten times, that's one relationship, not two,
for this question. So undirected. The report now says 'Undirected: (a, b) and (b, a) now merge: 9,113
edges become 9,087.' Fine. But the header still says 9,113 edges, and the last line still says
'9,113 rows became 9,113 edges.' Which is it? And the 26 merged pairs should now have count 2, and I
can't see whether they do. A count I can't reconcile -- I'd write that down before going further."

## Step 4 -- load (05.png, 06.png)

Commands: add `--click "Load"`; then add `--click "Analyze"`

"Progress dialog: '3,000 nodes, 9,113 edges...'. Not 9,087. Then the Analyze list opened and on the right
there's a Summary. Edges 9,113. Direction: Directed. Weight: amount, stronger.

That's not what I set. None of it. It loaded with the defaults -- amount as weight, directed, one edge
per row. If I hadn't read the summary I'd have run Louvain on money totals and believed it was on
frequency. This is the 'silent' failure I left Cytoscape over."

## Step 5 -- try to fix it from the graph (07.png, 08.png, 09.png, 10.png)

Commands: `... --click "Load" --click "amount, stronger"` (07: 'nothing on screen is called
"amount, stronger"' -- the load dialog was still up), then
`... --click "Load" --click "Analyze" --key Escape --click "amount, stronger"` (08), then the same plus
`--click "Pair" --click "Attribute" --click "Weight" --click "Undirected"` (09), then plus
`--click "Apply"` (10).

"The weight link opens 'Edit: transfers'. And it shows Row, amount = Weight, Directed. So it really
threw my choices away; it's not just the summary being stale. Redo it: Pair, count to Weight, Undirected.
Same screen as before, same 9,087 vs 9,113 inconsistency. Apply.

Back on the graph: Edges 9,113, Directed, Weight amount, stronger. Attributes panel: transfers 'In use
(1): amount -- Weight'. No count column anywhere. Twice now."

## Step 6 -- last try, directed, no undirected merge (11.png)

Command: `--click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "Analyze" --key Escape --click "Data"`

"Maybe Undirected was what broke it. Pair plus count-as-weight only, Load. Data panel: transfers
9,113 rows, 9,113 edges; amount is Weight; no count. Same.

I can do this in igraph. `count(df, from, to)`, `graph_from_data_frame`, `E(g)$weight <- n`. Two lines,
and I know what the weight is."

## Outcome

- Did I succeed? No. I found the right controls -- one edge per pair, the derived count, making count
  the weight, higher means stronger -- but the loaded graph ignored all of it, both on Load and on Apply
  in the edit screen. The graph that every later analysis would use is weighted by amount.
- I also saw no way to say "as the transfers come in" -- nothing about a live or appended feed, so I
  don't know whether this setup would survive next month's file even if it had stuck.
- Single Ease Question: 2 of 7. Finding the controls was a 5; the result not sticking is what matters.
- Would I use this instead of my current tool? Not for this. The import screen is better than
  Cytoscape's table import -- it shows what it guessed, it names the merge, the toast says what moved.
  But a weight setting that is silently dropped is worse than no setting, and the counts disagree on
  the same screen (9,087 in one line, 9,113 in the next). The only thing that saved me was the Summary
  panel on the right saying "Weight: amount". I'd keep it in R.
