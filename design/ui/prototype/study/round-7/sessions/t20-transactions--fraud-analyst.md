# Session: t20-transactions, participant: Sarah (fraud analyst, level-2 investigator)

Task as given: "Two accounts that trade with each other often should be treated as more tightly
tied than two that traded only once, whatever the sums -- and graphty should use that in every
later analysis. Set that up as the transfers come in."

Mode: first impression, own initiative (not mandated).

Commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t20-transactions--fraud-analyst/.

## 01 -- start screen (shots/tasks/t20-transactions/01.png)

Think-aloud: "OK, it's an import screen. transfers file, from_account, to_account, amount,
timestamp. Good, it already found the ends. amount is tagged 'Weight', 'Higher means Stronger'.
That's exactly what I was told NOT to do -- the sums shouldn't matter, the number of times they
traded should. Fifty bucks forty times beats one 10k wire for how tied they are. So amount can't
be the weight. I need a count of transfers per pair. 'One edge per Row / Pair' -- Pair is the
pivot-table move: group by from and to. Let's see what it does. The report at the bottom already
says no two transfers share both ends, so in this sample every pair traded once. Fine, it's a
sample; the real month won't be like that."

## 02 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try .../02.png task:t20-transactions --click "Pair"

Think-aloud: "There it is: 'One row per pair: each is one edge, its count the rows it merged.'
New column 'count', marked derived, and it's just an Attribute. amount got a Combine: Sum --
good, I still want the totals for the narrative. timestamp split into earliest and latest, that's
nice, first and last contact. But Weight is still on amount. I want count to be the weight."

## 03 -- open the count column's role menu

    timeout 120 node app-b/study.mjs --try .../03.png task:t20-transactions --click "Pair" --click "Attribute"

Think-aloud: "Menu: Subtype, Name, Time, Weight, Edge id, Position, Attribute. Weight."

## 04 -- make count the weight

    timeout 120 node app-b/study.mjs --try .../04.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight"

Think-aloud: "'Weight moved from amount to count', with an Undo. Good, it didn't leave two
weights, and it told me what it took away. count is Weight, Higher means Stronger -- more
transfers, tighter tie. amount is back to a plain attribute, summed. That's what I want."

## 05 -- poking at direction

    timeout 120 node app-b/study.mjs --try .../05.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

Think-aloud: "'Trade with each other' -- does A paying B and B paying A count as one
relationship? Clicked Undirected to see. Report says '(a, b) and (b, a) now merge: 9,113 edges
become 9,087.' But the line right under it still says '9,113 rows became 9,113 edges', and the
'Makes' header at the top still says 9,113 edges. Which is it? I can't put two different counts
in a case file. And I'm not throwing away direction anyway -- flow of funds is the whole job.
Going back to Directed." (Not replayed; the final run below leaves Directed, the default.)

## 06 -- Load

    timeout 120 node app-b/study.mjs --try .../06.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load"

Think-aloud: "Loading, 3,000 nodes, 9,113 edges. Done, I think. Whether 'every later analysis'
actually uses count, I'm taking on faith -- nothing on this screen says 'analyses will use
count'. I'll believe it when a cluster run tells me what it weighted by."

## Wrap-up

- Succeeded? I think so: one edge per pair, the number of transfers is the weight, the amounts
  are kept as a sum. About four clicks.
- Single Ease Question: 6 of 7. Took me one look to know amount was the wrong weight and
  'Pair' was the group-by. Lost a point for the contradicting edge counts when I tried
  Undirected, and for not being sure later analyses will honor it.
- Would I use this instead of my current tool? For this step, over i2's import wizard, yes --
  this is the first import screen that lets me count transfers per counterparty without
  building the pivot in Excel first, and the toast saying where the weight went is the kind of
  thing I can explain to a reviewer. But I'd still keep the pivot as my check until I see the
  analysis say what it weighted by. And the 'Local only' chip at the top had better mean it.

## Problems noted

1. With Undirected chosen, the match report says 9,113 edges become 9,087, but the line below
   ('9,113 rows became 9,113 edges') and the 'Makes' header both still say 9,113. Counts
   disagree on one screen.
2. Nothing confirms that the weight chosen here is what later analyses will use; the task's
   "every later analysis" is taken on faith.
3. Minor: 'count' only appears after choosing Pair; someone who doesn't think "group by" first
   would not find it from the amount column's Weight menu.
