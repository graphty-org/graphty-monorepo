# Session: weight transfers by how often two accounts trade -- Marcus, criminal intelligence analyst

Task as given: "The accounts and transfers spreadsheets are open on the import page (example data
if you do not work in banking). In every analysis from now on, two accounts that trade often
should count as more tightly tied than two that traded once. Set that up before you load, then
check it took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25-transactions--intelligence-analyst/.

## 01 -- the start screen (shots/tasks/r8-t25-transactions/01.png)

Import page with two tables, accounts (3,000) and transfers (9,113). Across the top it says
"Weight: amount", and under the amount column it says "Higher means Stronger". So it is already
set to treat a big transfer as a strong tie. That isn't what I was asked for. I was asked about
how OFTEN two accounts trade, not how much money moved. A single $50,000 wire would count as
tighter than forty $20 transfers. In a structuring case that's backwards.

I see "One edge per Row / Pair". "Pair" sounds like it rolls all the transfers between two
accounts into one link. That's what I'd do in a pivot table: count of rows per from/to.

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t25-transactions --click "Pair"

## 02 -- Pair

Good. A banner says "One row per pair: each is one edge, its count the rows it merged." There's a
new gray "count" column marked "derived", and its role says "Attribute". The toast says amount
stays the weight, summed. So it still wants dollars to be the weight. I want count to be the
weight. I click the "Attribute" under count to see if I can change it.

Every count in the preview reads 1, which is odd. The report says "No two transfers share both
ends." Noted.

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t25-transactions --click "Pair" --click "Attribute"

## 03 -- role menu on count

A menu: Subtype, Name, Time, Weight, Edge id, Position, Attribute (checked). Weight is right
there. The two gray lines at the top about From and To being derived I skip.

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight"

(The tool noted "Weight" matched both the menu item and amount's role button; it clicked the menu
item, which is what I meant.)

## 04 -- count is the weight

Toast: "Weight moved from amount to count". The top line now says "Weight: count, the number of
rows per pair". Under count: "Higher means Stronger". amount dropped back to Attribute, summed.
That's what I wanted, and it was three clicks. Fair.

But every count is still 1, and the report still says no two transfers share both ends. So in
this file nobody sent money to the same account twice? Then weighting by count does nothing. Unless
it's counting A-to-B separately from B-to-A. For "how tight are these two accounts" I don't care
which way the money went. There's "Direction: As the file says / Directed / Undirected" at the
bottom. Try Undirected.

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

## 05 -- Undirected

New line in the report: "Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087." So 26
pairs traded both ways. OK.

But the header at the top still says "9,113 edges from 9,113 rows", and the last line of the
report still says "9,113 rows became 9,113 edges." Three numbers on one screen and two of them
disagree with the third. Which one's lying?

Also, I just gave up who-paid-whom. On money that's usually the whole case. I'd rather keep the
arrows AND count both directions as one tie, but I don't see a way to do both. For this task I'm
told tight ties matter, so I'll keep Undirected and load.

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load"

## 06 -- loaded

A gray hex blob of 3,000 accounts. Not a link chart, but fine for now. Right panel, Summary:
Edges "9,087 transfers, each a distinct pair", Direction "Undirected", Weight "count, stronger"
(it's a link). That looks like it took. "Local only" up top, and the import page said nothing is
uploaded. Good, that's the first thing I'd ask.

To "check it took" for every analysis I want to see where that setting lives. I click the
"count, stronger" link.

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "count, stronger"

## 07 -- the edit page for transfers

This is where it fell apart. It opens "Edit: transfers" and it shows One edge per ROW, "Weight:
amount", amount marked Weight, Higher means Stronger, Direction DIRECTED. Everything I changed is
back the way it started. No count column. The report says "amount is each edge's weight." Bottom
says "Apply is off: Nothing has changed yet."

So the summary says count and undirected, and the page that's supposed to be the settings says
amount and directed. If I hit Apply here by accident, do I lose my setup? I don't touch it.

Let me look at the actual edges instead.

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "Edges"

## 08 -- the edges table

Bottom table, Edges tab: "9,113 edges", "Rows 1 to 6 of 9,113". Columns: from_account,
to_account, timestamp, amount. No count column at all, nothing that says which column is the
weight. Meanwhile the side panel right next to it still says 9,087 and "count, stronger".

That's my "side panel says 212, I count forty" story all over again. Three places, three answers:
the summary says count/undirected/9,087, the edit page says amount/directed, the table says
9,113 with no count. I can't tell a sergeant or a defense attorney which one the betweenness
score is going to use. I'm done.

## Wrap-up

- Did I succeed? I don't know, and that's the problem. I think I set it up before loading -- the
  import page did what I asked in three clicks and the summary agrees. But the check failed: two
  of the three places I looked say it didn't take. I would not trust a score off this graph.
- Single Ease Question: 3 out of 7. Setting it was a 5 or 6. Checking it was a 1.
- Would I use this instead of what I have? Not yet. The import page beats my Excel pivot for
  this: picking Pair, making count the weight and seeing "nothing is uploaded" up front is
  good. But a tool that gives me three different edge counts and two different weights for the
  same graph is something I can't put my name to on the stand. Also the data here had almost no
  repeat pairs, so I couldn't tell from the numbers whether the weighting changed anything, and
  making it undirected cost me the direction of the money, which I need.

## Problems as I saw them

1. After loading, clicking the summary's weight link opens an edit page that shows the ORIGINAL
   settings (Row, weight amount, Directed), not what I loaded. Severe: it says my setup didn't
   take.
2. The loaded edges table says 9,113 edges and has no count column, while the summary says 9,087
   and weight is count. Severe.
3. On the import page with Undirected on, the header and the last report line still say 9,113
   edges while the line above says 9,087. Moderate.
4. No way to count both directions as one tie and still keep who paid whom. Moderate for money
   work.
5. Picking Pair keeps amount (summed) as the weight by default; the count is there but parked as an
   Attribute. Minor -- I found it, but "trade often" is the count, and someone in a hurry would
   load dollar weights without noticing.
6. Nothing tells me in plain words that "every analysis" will use the weight, e.g. betweenness
   using count. I had to trust the word "stronger". Minor.
