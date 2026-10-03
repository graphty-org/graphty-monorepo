# Session: card transfers, path from ACC-271813 to ACC-233575 -- Sarah (fraud analyst)

Mode: first impression (not mandated). Task as given by the moderator: "A month of card transfers
between accounts is open, and the program has already sorted the accounts into groups. Work out
how money could have gone from account ACC-271813 to account ACC-233575 through the smallest
number of other accounts: say which accounts are in between, whether there is more than one such
way, and whether the dates allow it."

All commands run from design/ui/prototype. Renders in
tmp/round-8-sessions/r8-t21-transactions--fraud-analyst/.

## Start screen (shots/tasks/r8-t21-transactions/01.png)

"Transfers, March 2026. A hairball, coloured by 'Louvain' -- 35 'communities'. Whatever. Right
panel full of modularity numbers I'm not going to read. I've got two account numbers. There's a
box top left that says 'Find rows and notes'. Pasting the account in there."

## Step 1 -- click the search box

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t21-transactions --click "Find rows and notes"

"Box is focused. Fine."

## Step 2 -- type the source account into the search box

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t21-transactions --type "ACC-271813"
    (result: nothing had focus, typed nothing)
    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t21-transactions --click "Find rows and notes" --type "ACC-271813"

Screen: `No match for "ACC-271813"  Clear`.

"No match? It's in the task. It's an account ID. That's the first thing anyone types into this
box and it says there's nothing. That's how a tool loses me in the first minute."

## Step 3 -- open the table instead

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t21-transactions --click "Table"

"OK, a node table: 3,000 accounts, id, links in, links out, total amount in. Sorted by amount in.
That's the shape of my Excel export at least. But I'm not scrolling 3,000 rows for one ID."

## Step 4 -- search with only the digits

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t21-transactions --click "Find rows and notes" --type "271813"

Screen: `No match for "271813"`.

"Still nothing. So 'find rows' doesn't find rows by their ID. I'd write that down as a bug."

## Step 5 -- the icons at the bottom

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t21-transactions --click "Run an analysis"
    (nothing on screen is called that)
    hovered "Analyze" -> tooltip "Analyze Shift+A"  (also tried "Algorithms", "Find path", "Path": nothing)
    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t21-transactions --click "Analyze"

"The beaker is 'Analyze'. Big list: Louvain, PageRank -- no thanks -- and 'Shortest path: the
fewest steps, or the lightest route, between two nodes'. Fewest steps. That's hops. That's my
question."

## Step 6 -- Shortest path

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t21-transactions --click "Analyze" --click "Shortest path"

"'Path between', From, To, Direction 'Follow edges' or 'Either way', a 'Follow time order' tick
box, Weight 'amount (set at load)', 'Stronger / Farther / Capacity'... and 'Shortest path reads a
weight as distance: it uses 1/amount'. Hang on -- I asked for the fewest accounts, not the
fattest money. If it's weighting by amount it's not counting hops. Follow edges I'll keep:
money goes one way."

## Step 7 -- type From and To

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --type "ACC-271813"
    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --type "ACC-271813" --key Enter --click "Click to pick" --type "ACC-233575" --key Enter
    (nothing on screen called "Click to pick" once Enter had moved on; the To field had already taken the typing)

"Typed it, hit Enter, it jumped to To and took the second ID. Good -- and here it accepts the
ID, which the search box wouldn't. Same app, two answers. 'Find path' is lit up."

## Step 8 -- change the weight

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t21-transactions ... --click "amount (set at load)"

"Two options: amount, or 'None (fewest steps)'. That's the one. Glad it says it in plain words,
but I'd have run it on amount if I hadn't read that grey line. Default should match the title --
it's called shortest path and it doesn't do the shortest path out of the box."

## Step 9 -- run it

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t21-transactions ... --click "None (fewest steps)" --click "Find path"

Screen: bottom bar "3 steps. 2 routes tie. Dates in order. Route 1 of 2". Right panel: From
ACC-271813 (business, riskScore 1), To ACC-233575 (personal, riskScore 98, flagged), and the
transfers in order:

- ACC-271813 -> ACC-946224, 3,530.28, 4 Mar
- ACC-946224 -> ACC-670564, 9,468.23, 7 Mar
- ACC-670564 -> ACC-233575, 9,399.31, 9 Mar
- "This trace: 3 transfers, 4 Mar to 9 Mar, dates in order"

"Now that's what I wanted. Three transfers, two accounts in the middle, amounts and dates on each
step, 'dates in order' column with a Yes on each. And it tells me up front there's a tie.
But look at 946224: 3,530 in from my source, 9,468 out three days later. That's more out than
in. So it's not 'the same money' -- something else topped it up. The tool says 'could have',
which is honest, but I'd need 946224's other inflows before I wrote 'pass-through' in a SAR.
And the chart: I can't see the path anywhere in that hairball. It's coloured orange, and so is
community 5. Useless for the case file."

## Step 10 -- second route

    timeout 120 node app-b/study.mjs --try .../11.png task:r8-t21-transactions ... --click "Find path" --click "Next route"

Screen: Route 2 of 2:

- ACC-271813 -> ACC-946224, 3,530.28, 4 Mar
- ACC-946224 -> ACC-242954, 9,782.05, 7 Mar
- ACC-242954 -> ACC-233575, 9,616.72, 8 Mar
- "This trace: 3 transfers, 4 Mar to 8 Mar, dates in order"

"Second route goes through 946224 too, then 242954 instead of 670564. So 946224 is the choke
point -- every shortest way goes through it. That's the account I'd pull statements on first.
Both routes are in date order."

## Step 11 -- try to see the path on the chart

    timeout 120 node app-b/study.mjs --try .../12.png task:r8-t21-transactions ... --click "Find path" --click "4 accounts, 3 transfers"

Tooltip: "Selects the path's accounts and transfers". Chart looks the same.

"Selected, apparently. I still can't find four dots in three thousand. I'd want 'show only the
path' and a picture. I'm done -- I have my answer from the side panel."

## Answer

- Fewest accounts in between: two (three transfers).
- More than one way: yes, two routes tie.
  - Route 1: ACC-271813 -> ACC-946224 (4 Mar, 3,530.28) -> ACC-670564 (7 Mar, 9,468.23) -> ACC-233575 (9 Mar, 9,399.31).
  - Route 2: ACC-271813 -> ACC-946224 (4 Mar, 3,530.28) -> ACC-242954 (7 Mar, 9,782.05) -> ACC-233575 (8 Mar, 9,616.72).
  - ACC-946224 is on both.
- Dates: both routes run forward in time (4 to 9 Mar and 4 to 8 Mar), so the dates allow it. The
  amounts grow after the first hop, so the first account's 3,530 cannot be the whole of what
  moved; other money joined at ACC-946224.

## Debrief

- Succeeded? Yes, I think so. The panel gave me the accounts, the tie and the dates.
- Single Ease Question: 4 of 7. The path tool itself was a 6. Losing the first minute to a search
  box that can't find an account ID, and having to switch the weight to get actual fewest steps,
  drags it down.
- Would I use it instead of my current tool? Not instead -- alongside, maybe, for the cases with
  many linked accounts. In Excel I couldn't find a two-hop path between two accounts in ten
  minutes, so the path list with dates is a real saving. But I can't see the path on the chart,
  and I didn't find a way to get the route out as a picture or rows for the case file. And it
  has to be approved by IT before I'd put real customer data in it, "Local only" badge or not.

## Problems noted

1. Search box ("Find rows and notes") says "No match" for an account ID that exists (also for
   just the digits). The first thing I typed failed.
2. Shortest path defaults to weighting by amount (1/amount as distance); "fewest steps" is hidden
   in a dropdown. The title promises fewest steps.
3. The found path is not visible in the full chart: same orange as a community, no fade of the
   rest, "selects the path" changes nothing I can see.
4. Amounts on the trace grow hop to hop; the tool says "dates in order" but nothing warns that
   the amount doesn't follow -- I had to work that out myself.
5. No obvious export of the route (picture or rows) from where I was.
