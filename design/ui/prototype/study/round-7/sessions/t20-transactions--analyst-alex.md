# Session: t20-transactions -- Analyst Alex

Task as given: "Two accounts that trade with each other often should be treated as more tightly
tied than two that traded only once, whatever the sums -- and graphty should use that in every
later analysis. Set that up as the transfers come in. The data on screen is a sample: one month of
card and bank transfers between accounts."

All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t20-transactions--analyst-alex/.

## Start screen (shots/tasks/t20-transactions/01.png)

Alex: "OK, this is an import screen. Two tables, accounts 3,000 and transfers 9,113. Counts up
front, good, that's what I'd check against SQL. 'Local only' at the top -- I'll take that as the
data stays here. Right now amount is set as the Weight, 'Higher means Stronger'. That's the
opposite of what I want: they said whatever the sums. I want the number of transfers between two
accounts. In pandas I'd do a groupby on from/to and count. There's this 'One edge per -- Row /
Pair' thing. Pair sounds like the groupby. The report says 'No two transfers share both ends, so
One edge per Pair would change nothing'... huh. In a month of transfers? That's odd. Let me click
it anyway and see what columns it gives me."

## Step 1 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try .../01.png task:t20-transactions --click "Pair"

Alex: "There we go -- a banner 'One row per pair: each is one edge, its count the rows it merged',
and a new column 'count', marked derived, set to Attribute. Amount now has a Combine: Sum. That's
basically my groupby. But Weight is still on amount. I need count to be the weight. Every count
here is 1, which matches what the report said, but it still makes me a bit uneasy."

## Step 2 -- open the count column's role

    timeout 120 node app-b/study.mjs --try .../02.png task:t20-transactions --click "Pair" --click "Attribute"

Alex: "Clicking 'Attribute' under count gives a menu: Subtype, Name, Time, Weight, Edge id,
Position, Attribute. From and To are greyed with an explanation that count is derived from the
pair. Fine. Weight."

## Step 3 -- make count the weight

    timeout 120 node app-b/study.mjs --try .../03.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight"

Alex: "Toast: 'Weight moved from amount to count', with Undo. Good, I like that it told me it took
it off amount instead of me guessing whether there are now two weights. count is Weight, Higher
means Stronger -- more transfers, tighter tie. That's the setup."

"But hang on. 'Trade with each other' -- if A pays B and B pays A, that's the same relationship to
me. Directed is on, so those are two separate pairs. And that might be why every count is 1. Let
me try Undirected."

## Step 4 -- Undirected

    timeout 120 node app-b/study.mjs --try .../04.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

Alex: "Report now says 'Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087.' OK,
so 26 pairs went both ways. But the very next line still says '9,113 rows became 9,113 edges', and
the header up top still says '9,113 edges from 9,113 rows'. And the six sample rows all still show
count 1. Which is it, 9,087 or 9,113? That's exactly the kind of thing that ends up wrong in a
report. I'd go check this in pandas before I believed it."

"Also -- for a fraud or payments person, losing direction might be bad. I'm not sure I want
Undirected for every later analysis just to get the counting right. I wish the pair merge had its
own 'either direction' switch instead of flipping the whole graph undirected. I'll keep it
undirected for this since the task said 'with each other'."

## Step 5 -- Load

    timeout 120 node app-b/study.mjs --try .../05.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load"

Alex: "Loading bar with Cancel, 'Reading transfers-2026-03.csv -- 3,000 nodes, 9,113 edges...'.
Again 9,113, not 9,087. So now I really don't know whether the undirected merge happened. Progress
and a cancel button though -- that I like."

## Step 6 -- check what Weight actually does (hover)

    timeout 120 node app-b/study.mjs --try .../06.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --hover "Stronger"

Alex: "Tooltip: 'A bigger value is a closer tie: a path through it counts as shorter.' OK, that's
the one-line explanation I want -- shortest paths will treat frequent traders as closer. It
doesn't say anything about communities or centrality, though. 'Every later analysis' -- I'm
trusting that Weight means weight everywhere. Nothing showed me that."

"And 'as the transfers come in' -- does this setup stick when I load April's file? Nothing here
says it's saved as a recipe for the next import. I'd have to try it next month and see."

## Wrap-up

Did I succeed? "Mostly, I think. count of transfers per pair is the weight, higher is stronger,
and I loaded it. Two doubts: the edge count disagrees with itself after Undirected (9,087 vs
9,113), and I can't tell if this setting carries to next month's file or into every algorithm."

Single Ease Question: 5 out of 7. "The clicks were few -- Pair, Attribute, Weight, that's three.
The time went on the 9,087 versus 9,113 thing and on whether Undirected was what I wanted."

Would I use this instead of my current tool? "For this part, maybe. In Gephi you merge parallel
edges and it sums weights; getting a count as the weight is a fiddle there, and here it was a
column I just had to promote. But I'd still verify the pair counts in pandas the first time,
because the screen gave me two different edge totals. If those agreed and it remembered the setup
for next month, yes, I'd use it for the import step."

## Problems noted

1. After Undirected, the match report says 9,113 edges become 9,087, but the summary line, the
   header ("9,113 edges from 9,113 rows") and the loading dialog all still say 9,113, and the
   sample rows still show count 1. Contradictory counts. (severe for trust)
2. Merging (a,b) with (b,a) for counting is only reachable by making the whole graph undirected;
   no way to count "either direction" while keeping transfer direction.
3. Nothing confirms the weight setup will apply to the next file ("as the transfers come in").
4. Nothing confirms the weight is used by algorithms other than paths (tooltip only mentions paths).
5. "No two transfers share both ends" in a month of payments is surprising and unexplained.

## Delights

- Pair plus a derived count column made "count transfers per pair" a direct choice.
- Toast "Weight moved from amount to count" with Undo: no ambiguity about two weights.
- Plain tooltip on Stronger explaining what a bigger weight means.
- Progress with Cancel while loading.
