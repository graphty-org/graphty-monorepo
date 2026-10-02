# Session: check what came in -- Analyst Alex

Task as given: "Someone on your team brought this month's transfers into a project and has started
on them; you were just looking at one account. Before anyone works the month, check what came in
overall: how many accounts and transfers, whether the transfers run one way, whether everything
hangs together or falls into separate pieces, and whether anything looks off."

All commands run from design/ui/prototype. D = tmp/round-7-sessions/t01-transactions--analyst-alex
(absolute path used in the real commands).

## 01 -- start screen (shots/tasks/t01-transactions/01.png)

Gray hexagon ball. Right side is one account, ACC-633005, business, GB, degree 15. Top bar says
"Local only" -- good, that is the first thing I want to know, my data is not going anywhere. Next
to it "Full graph". No counts anywhere I can see. Left panel has "Louvain 35 groups", "Links in
(count)", "Everything". Nothing tells me how many accounts. I don't want the one account, I want
the whole thing. "Data" in the left rail sounds like where counts would be. "Everything" might be
the whole graph too. Try both.

## 02 -- click Data

    timeout 120 node app-b/study.mjs --try $D/02.png task:t01-transactions --click "Data"

OK, this is what I wanted. Sources: accounts-2026-03.csv, 3,000 nodes; transfers-2026-03.csv,
9,113 rows, 9,113 edges -- rows equal edges, so nothing dropped on import. Right side summary:
Edges 9,113, Directed, Weak components 1, Reciprocity 0, average total degree 6.08, highest total
degree 907.

But: "Nodes 812 of 3,000" and the top bar now says "812 of 3,000 nodes". There's a filter on,
"amount is at least 1,000", checked. My teammate left that on. On the Graph screen the same top
bar said "Full graph". So which is it? That bothers me -- if I screenshot the graph screen I'd say
full graph and it isn't. And the picture looks identical with the filter on, so I can't tell from
the picture either.

"5 readings are for all 3,000 nodes" -- OK, so the components and reciprocity are for everything,
not the 812. Fine, that's what I want for an intake check, but I had to read that twice.

Reciprocity 0 -- so no account sends money back to anyone that sent to it. One way. Weak
components 1 -- it all hangs together, no islands. Highest degree 907 on a graph where the average
is 6 -- that's one account touching almost a third of all accounts. That's the "looks off" thing,
or it's a payment processor. I want to know who it is.

## 03 -- click Everything (Graph screen)

    timeout 120 node app-b/study.mjs --try $D/03.png task:t01-transactions --click "Everything"

Style settings. "Paints 3,000 nodes, 9,113 edges", color 6366F1. Not what I'm after. Back to Data.

## 04 -- Data, then "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try $D/04.png task:t01-transactions --click "Data" --click "4 more readings not computed"

I expected to see the 4 extra readings. Instead a menu popped up: Select all visible, Fit, Re-run
layout, ... "Compute the overview", ... "Clear graph data". Odd place for that menu but "Compute
the overview" sounds like it.

## 05 -- Data, then click the Weak components row

    timeout 120 node app-b/study.mjs --try $D/05.png task:t01-transactions --click "Data" --click "Weak components"

Opened a node table at the bottom. "3,000 nodes (before the filter)". Sorted by links total, but
it says rows 381 to 420 and the top row has 15. Where's the 907 account? Page 381? I didn't ask for
page 381.

## 06 -- Data, menu, Compute the overview

    timeout 120 node app-b/study.mjs --try $D/06.png task:t01-transactions --click "Data" --click "4 more readings not computed" --click "Compute the overview"

Wait. Now the right side says "Co-appearances, from miserables.gexf", 77 nodes, 254 edges,
Undirected. That is not my data. Left side still says accounts and transfers. If I had pasted
this into the deck I'd be reporting 77 accounts. This is the kind of thing that gets me in
trouble. I'm not trusting this button.

## 07 -- Data, click 907

    timeout 120 node app-b/study.mjs --try $D/07.png task:t01-transactions --click "Data" --click "907"

Nothing. I wanted it to take me to the account with 907 links.

## 08 -- Data, Compute on 812

    timeout 120 node app-b/study.mjs --try $D/08.png task:t01-transactions --click "Data" --click "Compute on 812"

Same menu as before popped up. Not doing that again after what happened in 06.

## 09 -- Table (Graph screen)

    timeout 120 node app-b/study.mjs --try $D/09.png task:t01-transactions --click "Table"

Table, 3,000 nodes, still rows 381 to 420, sorted by links total descending, top row 15. It's
parked on the account I was looking at, I think.

## 10 -- Table, click the Links total header

    timeout 120 node app-b/study.mjs --try $D/10.png task:t01-transactions --click "Table" --click "Links total (count, full graph)"

Flipped to ascending, still rows 381 to 420. Still can't get to the top of the list.

## 11 -- Table, "Previous page"

    timeout 120 node app-b/study.mjs --try $D/11.png task:t01-transactions --click "Table" --click "Previous page"

Tool said nothing on screen is called "Previous page". The little arrows have no name I can find.
Gave up on finding the 907 account this way.

## 12 -- click "Links in (count)"

    timeout 120 node app-b/study.mjs --try $D/12.png task:t01-transactions --click "Links in (count)"

Tooltip says "Opens Links in (count) in the inspector". The inspector still shows ACC-633005. And
the note at the top still says "Nothing is colored or sized by a row" even though there's a
Louvain row and a Links in row in the list. Hidden, I guess. Not helping.

## 13 -- Data, click the "1" next to Weak components

    timeout 120 node app-b/study.mjs --try $D/13.png task:t01-transactions --click "Data" --click "1"

Same node table as 05. I wanted "here is your one component, 3,000 of 3,000". Fine, 1 is 1.

## 14 -- Table, Edges

    timeout 120 node app-b/study.mjs --try $D/14.png task:t01-transactions --click "Table" --click "Edges"

9,113 edges, from_account, to_account, timestamp, amount. Sum of amount 14,156,522. This is the
kind of number I'd check against SQL. Good.

## 15 -- Data, click flagged

    timeout 120 node app-b/study.mjs --try $D/15.png task:t01-transactions --click "Data" --click "flagged"

I clicked flagged, it highlighted flagged, but the right side shows "amount". Huh. Anyway, amount:
0.50 to 98,400, 9,113 transfers, 14,156,522.28 total, 1,553.44 average, nothing missing. Very
skewed. One 98k transfer in a month where the average is 1.5k is worth a look. I never got to see
how many accounts are flagged.

Stopping here.

## What I'd report

- 3,000 accounts, 9,113 transfers (rows = edges, nothing dropped). Total amount 14,156,522.28.
- Directed, reciprocity 0: transfers run one way, nobody pays back.
- One weak component: it all hangs together.
- Off: one account has 907 links against an average of 6 -- couldn't find which one. Largest
  transfer 98,400. And a filter (amount at least 1,000, 812 of 3,000 accounts) was left on, which
  the graph screen labels "Full graph".

## Did I succeed?

Mostly. I have the counts, direction and pieces, and two things that look off. I could not name
the 907 account, and I don't know how many are flagged. And one button replaced my overview with a
completely different dataset, which I'd have to warn people about.

Single Ease Question: 4 of 7. The Data screen gave me most of it in one click -- that part is
better than Gephi, where I'd be running statistics one by one. What took longest: trying to get
from "highest degree 907" to the actual account, and the table stuck on rows 381 to 420.

Would I use this instead of my current tool? Not yet. The overview panel is what I want for an
intake check, and "Local only" up top is the right answer to my first question. But the
"Full graph" vs "812 of 3,000" mismatch and the overview switching to a 77-node graph are exactly
the kind of wrong number that ends up in a report. I'd still check the counts in SQL and
NetworkX before I believed this.
