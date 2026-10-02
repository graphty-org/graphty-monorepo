# Session: weight transfers by how often two accounts trade -- Chris (ML engineer, recommendations)

Task as given: "Two accounts that trade with each other often should be treated as more tightly
tied than two that traded only once, whatever the sums -- and graphty should use that in every
later analysis. Set that up as the transfers come in."

Renders: design/ui/prototype/tmp/round-7-sessions/t20-transactions--ml-engineer-recsys/
All commands run from design/ui/prototype; D is that renders folder.

## Start screen (shots/tasks/t20-transactions/01.png)

An import screen for transfers-2026-03.csv. Header line reads like a schema:
`account (3,000) --transfers (9,113)--> account (3,000)`. Good, I can read that. Columns
from_account / to_account / amount / timestamp, each with a role chip. amount is "Weight",
"Higher means Stronger". So right now the tie strength is the sum of money. Wrong for me.

What I want is basically the co-interaction count: weight = number of transfers per pair. In
pandas that is `groupby([src, dst]).size()`. There is a "One edge per: Row | Pair" toggle. Pair
is the groupby. Clicking it.

## Step 1 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try $D/01.png task:t20-transactions --click "Pair"

Nice: banner "One row per pair: each is one edge, its count the rows it merged." A derived
`count #` column appeared, role "Attribute". amount got a "Combine: Sum" picker, timestamp became
earliest/latest. This is the groupby I wanted, with the aggregations stated. Points for that.

But: every count in the preview is 1, and the match report says "No two transfers share both
ends: One edge per Pair changes nothing." So on this sample the frequency signal is flat --
every pair traded once in that direction. Fine, it is a sample; the setup still matters for the
real feed. Now make count the weight.

## Step 2 -- open the count column's role menu

    timeout 120 node app-b/study.mjs --try $D/02.png task:t20-transactions --click "Pair" --click "Attribute"

Menu: From/To (disabled, explained -- "count is derived from the pair"), Subtype, Name, Time,
Weight, Edge id, Position, Attribute. Clear enough.

## Step 3 -- count -> Weight

    timeout 120 node app-b/study.mjs --try $D/03.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight"

Toast: "Weight moved from amount to count. Undo". count now says Weight, Higher means Stronger;
amount dropped to Attribute (still summed). That is exactly the right behavior -- one weight,
it tells me it moved it. Good.

## Step 4 -- direction

"Trade with each other" -- A pays B and B pays A is the same relationship to me. Directed keeps
those as two edges with count 1 each, which undercounts exactly the pairs I care about. Trying
Undirected at the bottom.

    timeout 120 node app-b/study.mjs --try $D/04.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

Report line: "Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087." OK, so 26
reciprocal pairs, those get count 2. That is the actual signal in this sample.

BUT the same screen also says "9,113 rows became 9,113 edges" two lines below, and the header
still says "9,113 edges from 9,113 rows". So which is it, 9,087 or 9,113? First thing I check is
the denominator and the screen disagrees with itself. Also undirected throws away who paid whom
for every later analysis -- I would rather have count computed over the unordered pair while
keeping direction, but there is no such option. I accept the trade-off for this task.

## Step 5 -- Load

    timeout 120 node app-b/study.mjs --try $D/05.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load"

Progress: "Reading transfers-2026-03.csv -- 3,000 nodes, 9,113 edges..." with a bar. Numbers on
the progress, I like that. But 9,113 again, not 9,087. Suspicious.

## Step 6 -- verify what actually loaded

    timeout 120 node app-b/study.mjs --try $D/06.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "Data"

Summary panel: Edges 9,113. Direction: Directed. Weight: "amount, stronger". Attributes list:
transfers -> amount "Weight, Filter s...", no count column at all. Also a filter "amount is at
least 1,000 -- 812 of 3,000 nodes" that I never created, and the top bar says "812 of 3,000
nodes". Reciprocity 0 -- which contradicts the 26 merged reciprocal pairs it just told me about.

So none of what I set survived the load. It silently went back to sum-of-amount, directed, one
edge per row. This is the worst kind of failure: the import screen showed me exactly what I
wanted and then the graph is something else, and if I had not checked the summary I would have
run every later analysis on the amount weight.

## Step 7 -- try to fix it after the fact

Clicked the "amount, stronger" link in the summary.

    timeout 120 node app-b/study.mjs --try $D/07.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "Data" --click "amount, stronger"

"Edit: transfers" -- the same mapping screen, reset to Row / amount=Weight / Directed. Confirms
my settings were dropped. Redoing them and pressing Apply.

    timeout 120 node app-b/study.mjs --try $D/08.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "Data" --click "amount, stronger" --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Apply"

Back on Data. Summary: Edges 9,113, Directed, Weight "amount, stronger". Attributes: amount =
Weight. No count. The mystery filter is gone now (so Apply did something), but the weight is
still amount. Second time it ignored me.

I stop here. I set it up twice and the app twice kept the money weight.

## Wrap-up

Did I succeed? No. The import screen let me express exactly the right thing -- one edge per
pair, weight = count of transfers, undirected so reciprocal trades merge -- and it was the
clearest groupby UI I have seen in a graph tool. But what got loaded is directed, one edge per
row, weighted by amount, both on Load and on Apply. Every later analysis would use the sums,
which is exactly what the task said not to do.

Single Ease Question: 2 / 7. Finding the controls was a 6. Getting the result was a 1, and I
only know it failed because I read the summary panel.

Would I use this instead of my current tool (pandas + networkx)? Not today. In a notebook this
is `df.groupby(['u','v']).size()` and I know it worked. The import screen is genuinely good --
the Pair toggle with derived count, the explicit Combine pickers, the "Weight moved from amount
to count" toast, the progress with real counts -- but a tool that silently drops my weight
choice and contradicts its own edge counts (9,087 vs 9,113, reciprocity 0 vs 26 merged pairs)
fails my correctness bar, and an unexplained "amount at least 1,000" filter appearing on load
makes me distrust every number on the screen.

Things that would also have helped: an option to count over the unordered pair while keeping the
edges directed, and a way to see the count distribution (how many pairs traded 1, 2, 5+ times)
before I commit.
