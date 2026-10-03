# Session: card transfers, shortest route between two accounts -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Not a banker; this is example data to her.

Task as given by the moderator: "A month of card transfers between accounts is open, and the
program has already sorted the accounts into groups. Work out how money could have gone from
account ACC-271813 to account ACC-233575 through the smallest number of other accounts: say which
accounts are in between, whether there is more than one such way, and whether the dates allow it."

Start screen: shots/tasks/r8-t21-transactions/01.png
Renders: tmp/round-8-sessions/r8-t21-transactions--knowledge-engineer/NN.png
All commands were run from design/ui/prototype, with
D=tmp/round-8-sessions/r8-t21-transactions--knowledge-engineer.

## Think-aloud

**Start screen.** "A hairball colored by Louvain, 35 communities, modularity 0.688. Fine, it
names the algorithm and the seed, which is more than most tools do. The groups have nothing to do
with my question, though. I need a path between two specific individuals. First I want to know
what this graph actually is."

Step 1 -- a wasted hover on an empty name; the tool hovered the first of 33 things. Nothing useful.

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t21-transactions --hover ""

Step 2 -- the Data tab.

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t21-transactions --click "Data"

"Good. Two sources: accounts-2026-03.csv with 3,000 nodes, and transfers-2026-03.csv with 9,113
rows, one edge per row. Directed. One weak component. Edges carry `amount` and `timestamp`. It
says 'each a distinct pair', so there are no parallel transfers between the same two accounts,
which matters for the dates. There is a filter 'amount is at least 1,000' listed but it says 0
on, so I assume nothing is hidden. This is the import summary I always ask for."

Step 3 -- hovering the flask icon in the bottom toolbar. I guessed the name.

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t21-transactions --hover "Analyze"

Tooltip: "Analyze Shift+A".

Step 4 -- opening Analyze.

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t21-transactions --click "Analyze"

"A list of algorithms with one-line descriptions. 'Shortest path -- the fewest steps, or the
lightest route, between two nodes.' That is the question."

Step 5 -- Shortest path.

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t21-transactions --click "Analyze" --click "Shortest path"

"A 'Path between' form: From, To, Direction 'Follow edges' (good, directed by default), a
'Follow time order' checkbox, and Weight preset to amount, 'uses 1/amount'. That default is wrong
for my question. I asked for the fewest intermediaries, not the 'strongest' route. If I had not
read the weight line I would have got a different answer and believed it."

Step 6 -- clicking the From box. No suggestion list appears.

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name"

Step 7 -- typing the account id.

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813"

"The text is in the box, but nothing tells me it matched an account. No dropdown and no 'found'
indicator. With 3,000 ids that look alike, I want a confirmation that it resolved the identifier
I typed."

Step 8 -- Enter, then I tried to click the To box.

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --click "Click to pick" --type "ACC-233575" --key Enter

"Enter had already moved me into To, so the 'Click to pick' label was gone and my click missed.
The typing still landed in To. Both ids are in and 'Find path' is enabled. I take an enabled
button to mean both resolved. That is an inference, not something the screen told me."

Step 9 -- opening the Weight dropdown.

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)"

"'None (fewest steps)'. That is exactly the right wording."

Step 10 -- running it unweighted, without time order. I want the structural answer first.

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path"

"'3 steps. 2 routes tie. Dates in order.' The right panel has 4 accounts and 3 transfers.
Route 1 of 2: ACC-271813, then ACC-946224 (4 Mar, 3,530.28), then ACC-670564 (7 Mar,
9,468.23), then ACC-233575 (9 Mar, 9,399.31). There is a 'Dates in order' column, Yes on every
step. 'Made with: Weight None (this run's override)', so the run records what I changed. I
like that.

What I do not like:
- I cannot see the path on the canvas. The legend says the path is orange, and Community 5
  in the same legend is also orange. In a 3,000-node hairball I cannot find four orange dots
  among 139 other orange dots. The panel is the only place the answer is legible.
- 'Sum of amount 22,397.82' is a meaningless number for a chain of transfers. It adds the
  same money three times. Someone will paste it into a report.
- ACC-946224 receives 3,530.28 on 4 Mar and sends 9,468.23 on 7 Mar. Most of what leaves did
  not come from ACC-271813, and the tool says nothing about that. 'Could have gone' is true for
  at most 3,530.28 of it. That is my reading, not the tool's."

Step 11 -- hovering the arrow after 'Route 1 of 2'.

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --hover "Next route"

Step 12 -- the next route.

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --click "Next route"

"Route 2 of 2: ACC-271813, then ACC-946224 (4 Mar, 3,530.28), then ACC-242954 (7 Mar,
9,782.05), then ACC-233575 (8 Mar, 9,616.72). The dates are in order again. Both routes share
the first hop through ACC-946224 and split after it. Is '2 routes tie' every tie or the first
two found? It reads as all of them, and I would want that stated."

Step 13 -- a sanity rerun with 'Follow time order' ticked.

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "Follow time order" --click "amount (set at load)" --click "None (fewest steps)" --click "Find path"

"The click on the checkbox timed out, and the result is identical. I cannot tell whether the
box was ticked: 'Made with' lists the weight override but says nothing about time order. Logically
it does not matter here. A time-respecting route cannot be shorter than the unconstrained
shortest route, and both shortest routes are already in date order. I am stopping."

## Answer given

- Fewest intermediaries: two accounts between them (3 transfers).
- There are two such routes, and they tie:
  1. ACC-271813 -> ACC-946224 (4 Mar) -> ACC-670564 (7 Mar) -> ACC-233575 (9 Mar)
  2. ACC-271813 -> ACC-946224 (4 Mar) -> ACC-242954 (7 Mar) -> ACC-233575 (8 Mar)
- The dates allow both: each transfer is later than the one before it. Caveat (mine): the
  first hop is 3,530.28, so at most that much of the later, larger transfers can be the same
  money.

## Debrief

- **Succeeded?** Yes, I believe so. I took the answer from the side panel, not the picture.
- **Single Ease Question:** 5 of 7. The form and the result panel were clear. Points came off
  for the amount-weighted default on a "fewest steps" tool, for no confirmation that a typed id
  matched an account, for a path I could not find on the canvas because it shares a color with a
  Louvain community, and for a time-order setting I could not verify.
- **Would I use this instead of my current tool?** For this kind of question, I would use it
  alongside SPARQL, not instead of it. A property-path query gives me the same two routes, but
  this view puts the per-hop dates and the "in order" check next to each other, and it records
  the weight override. That is genuinely useful when I have to explain the answer to someone who
  does not read queries. I would not hand anyone the "Sum of amount" line, and I would not trust
  the canvas for the answer until the path stands out from the communities.
