# Session: check what came in -- Priya (threat hunter)

Task as given: "Someone on your team brought this month's transfers into a project and has started
on them; you were just looking at one account. Before anyone works the month, check what came in
overall: how many accounts and transfers, whether the transfers run one way, whether everything
hangs together or falls into separate pieces, and whether anything looks off."

All commands were run from design/ui/prototype. D = tmp/round-7-sessions/t01-transactions--cybersecurity-analyst.

## Start screen (shots/tasks/t01-transactions/01.png)

"Is this approved, where does it run, does it phone home? There's a 'Local only' chip, which is
better than most tools manage. The canvas is a gray hexagon blob: 'Nothing is colored or sized by a
row'. Fine, I don't care about the picture. The right panel is one account, ACC-633005. I want the
totals for the whole month, not one account. There's a rail on the left: Graph, Data, Views, Notes,
Assistant. I'm not touching Assistant. Data sounds like where the counts live."

## 01 -- hover the Local only chip

    timeout 120 node app-b/study.mjs --try $D/01.png task:t01-transactions --hover "Local only"

"Tooltip says 'Privacy settings'. That doesn't tell me whether it calls out. In real life I'd stop
here and ask. It's a study, so I'll keep going."

## 02 -- Data

    timeout 120 node app-b/study.mjs --try $D/02.png task:t01-transactions --click "Data"

"This is the page I wanted. Sources: accounts-2026-03.csv, 3,000 nodes; transfers-2026-03.csv,
9,113 rows, 9,113 edges. Rows match edges, so nothing got dropped on import. Good, that's the first
thing I check. Right side: Direction Directed, Reciprocity 0, Weak components 1, average total
degree 6.08, highest total degree 907. So the transfers only go one way (no pair pays each other
back), and it's one connected piece. But one account touching 907 others when the average is about
6? That's the thing that looks off.

Now the problem. The top bar said 'Full graph' a second ago. Now it says '812 of 3,000 nodes', and
there's a filter 'amount is at least 1,000', switched on. Did I just turn that on by clicking Data?
And Nodes says '812 of 3,000' but Edges says 9,113. If 2,188 accounts are filtered out, their edges
can't all still be there. Those don't add up. There's a note '5 readings are for all 3,000 nodes'
with 'Compute on 812'. OK, so the readings are probably for everything. I'm not sure."

## 03 -- the "Full graph" chip on the start screen

    timeout 120 node app-b/study.mjs --try $D/03.png task:t01-transactions --click "Full graph"

"Clicking 'Full graph' takes me to the same Data page, and the chip now says '812 of 3,000 nodes'.
So the start screen said full graph while a filter was on? Or the filter only counts on one page?
Which is it? Either way, I can't trust the chip."

## 04 -- 4 more readings not computed

    timeout 120 node app-b/study.mjs --try $D/04.png task:t01-transactions --click "Data" --click "4 more readings not computed"

"It opened a menu: select all, fit, re-run layout, 'Compute the overview', add node, clear graph
data. Odd place for 'Clear graph data', right next to what I wanted. I'll take 'Compute the
overview'."

## 05 -- Compute the overview

    timeout 120 node app-b/study.mjs --try $D/05.png task:t01-transactions --click "Data" --click "4 more readings not computed" --click "Compute the overview"

"What? The panel now says 'Co-appearances, from miserables.gexf': 77 nodes, 254 edges,
Undirected, 1 note. That's not my data. The left side still lists the March transfer files. I asked
for more readings on my month and got some other graph's numbers. If this happened on a real case
I'd close the tab, and I would not put any number from this screen in a ticket. I'm going back to
the first set of readings (from 02) and treating those as my answer, with that caveat."

## 06 to 09 -- the nodes table, looking for the 907 account

    timeout 120 node app-b/study.mjs --try $D/06.png task:t01-transactions --click "Table"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t01-transactions --click "Data" --click "Weak components"
    timeout 120 node app-b/study.mjs --try $D/08.png task:t01-transactions --click "Table" --click "Links total (count, full graph)"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t01-transactions --click "Table" --click "Links total (count, full graph)" --click "Links total (count, full graph)"

"The table is sorted by Links total, descending, but it's sitting on rows 381 to 420 of 3,000.
That's where the last person left it, I suppose. The columns say 'full graph', which is the scope
I want, and on the Data page the table says '3,000 nodes (before the filter)'. That's the first
label today that told me plainly what I'm looking at. Clicking the '1' next to Weak components did
nothing I could see.

The rows I can see: Links in 0, Links out 11 to 15, all business accounts. A lot of accounts that
only send. That fits 'reciprocity 0'.

Clicking the header flips the sort but leaves me on rows 381 to 420. Ascending, row 381 already
has a total of 1, which means about 380 accounts above it with 0 links. The degree chart says 0
accounts at degree 0. One of those is wrong."

## 10 to 12 -- trying to get to the top of the table

    timeout 120 node app-b/study.mjs --try $D/10.png task:t01-transactions --click "Table" --hover "Previous page"
    timeout 120 node app-b/study.mjs --try $D/11.png task:t01-transactions --click "Table" --click "Previous page"
    (both: nothing on screen is called "Previous page")
    timeout 120 node app-b/study.mjs --try $D/12.png task:t01-transactions --click "Table" --click "Previous"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t01-transactions --click "Table" --click "Previous rows"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t01-transactions --click "Table" --click "Back"
    (nothing on screen is called "Back")
    timeout 120 node app-b/study.mjs --try $D/12.png task:t01-transactions --click "Table" --click "Previous rows"

"The back arrow's tooltip says 'Shows the next rows (the skeleton holds one page)'. 'Next' on the
back button, and it doesn't move. So I can't page to the top, and I can't see which account has
907 links. In Splunk that's '| sort - count | head'. Here I just can't get it."

## 13 -- Edges table

    timeout 120 node app-b/study.mjs --try $D/13.png task:t01-transactions --click "Edges"

"9,113 edges again, columns from_account, to_account, timestamp, amount. The timestamps I can see
are all in March (Mar 11 to Mar 29). Good, the time range matches the file name. Footer: sum of
amount over all 9,113 rows is 14,156,522. That's about 1,550 a transfer on average, but every row
on screen is 5 to 45. So a handful of very large transfers carry most of the money. That's the
second thing I'd flag."

## 14 -- the search box

    timeout 120 node app-b/study.mjs --try $D/14.png task:t01-transactions --click "Find rows and notes"

"The box takes focus but I can't type into it here, so I can't search 'flagged'. I'm done."

## What I'd tell the team

- 3,000 accounts, 9,113 transfers, all dated March. Rows equal edges, so the import dropped nothing.
- The transfers run one way: the graph is directed with reciprocity 0, and many accounts only send.
- It hangs together: 1 weak component. There are 35 Louvain groups inside it, but that's clusters,
  not separate pieces.
- What looks off: one account with 907 links against an average of about 6; and a total of about
  14.2 million spread over transfers that mostly look tiny, so a few big ones dominate. I could not
  name the 907 account.
- Caveats: a filter (amount at least 1,000, 812 of 3,000 accounts) is on, and the start screen says
  "Full graph" anyway. 'Compute the overview' showed a different dataset's numbers. And the table's
  row 381 doesn't agree with the "0 accounts at degree 0" reading.

## Debrief

Succeeded? Mostly. I have counts, direction, connectedness and two things that look off. But I
couldn't name the outlier, and the screen gave me two reasons to doubt the numbers.

Single Ease Question: 3 of 7. The Data page summary is the right idea, and it was quick to find.
After that, the filter chip contradicting itself, the overview turning into someone else's graph
and a table I can't page cost me most of the time.

Would I use this instead of my current tool? No, not today. For "what came in", I'd run a few
lines of pandas (row counts, nunique, groupby degree, sort, head) and trust the result. I'd come
back for the Data summary panel (rows vs edges, direction, reciprocity, components, all on one
screen, with the file named) if the scope were always stated next to each number and the numbers
never changed underneath me.
