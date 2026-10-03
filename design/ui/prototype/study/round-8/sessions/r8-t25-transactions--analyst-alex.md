# Session: r8-t25-transactions -- Analyst Alex

Task as given: "The accounts and transfers spreadsheets are open on the import page (example data
if you do not work in banking). In every analysis from now on, two accounts that trade often should
count as more tightly tied than two that traded once. Set that up before you load, then check it
took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25-transactions--analyst-alex/.

## Start screen (shots/tasks/r8-t25-transactions/01.png)

"OK, import page, two tables, accounts 3,000 and transfers 9,113. Good, 'The data stays on this
computer: nothing is uploaded' -- that's the line I look for, and it's right there. And 'Local only'
up top. Fine."

"Now the ask. Trade often = tied tighter. Right now the weight is amount, 'Higher means Stronger'.
That's money, not how often. Two accounts that moved one big payment would look tighter than two
that traded fifty times. Not what I want. In Gephi I'd merge parallel edges and the weight becomes
the count. There's a 'One edge per Row / Pair' switch. Pair sounds like merge. But the match
report already says 'No two transfers share both ends, so One edge per Pair would change nothing.'
Hm. So every pair traded once? That's odd for transfers. Let me try it anyway."

## Step 1 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t25-transactions --click "Pair"

"Banner: 'One row per pair: each is one edge, its count the rows it merged.' There's a new 'count'
column, marked derived. But the toast says 'amount stays the Weight, summed.' So the weight is now
total money per pair. Still not frequency. I need count to be the weight. Count column says
'Attribute' under it -- that's probably its role. Every value is 1 though."

## Step 2 -- open the count column's role

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t25-transactions --click "Pair" --click "Attribute"

"A menu: Subtype, Name, Time, Weight, Edge id, Position, Attribute. Weight it is."

## Step 3 -- make count the weight

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight"

(The tool warned "Weight" matched two controls and clicked the menu item, which is what I meant.)

"Toast: 'Weight moved from amount to count.' Top line now reads 'Weight: count, the number of rows
per pair', Higher means Stronger. That's literally the sentence I wanted. Good -- one swap, not two
steps. amount dropped to Attribute, combine Sum, so I keep the money too. Nice."

"But the counts are all 1. Directed, A->B and B->A are different pairs. If A pays B and B pays A,
that's two accounts trading, I'd count it as one relationship. Try Undirected."

## Step 4 -- Undirected

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

"Report: 'Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087.' OK, 26 pairs went
both ways. But -- the very next line still says '9,113 rows became 9,113 edges' and the 'Makes'
header still says 9,113 edges. And 'One edge per Pair changes nothing' is still there. Which is it,
9,087 or 9,113? Two numbers on the same panel. That's the kind of thing that makes me stop
trusting the counts. I'll load and see what the graph says."

## Step 5 -- Load

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load"

"Summary on the right: 3,000 nodes, Edges '9,087 transfers, each a distinct pair', Undirected,
Weight 'count, stronger'. OK, that's the check -- it took. 3,000 matches. 9,087 matches the merge
line, not the '9,113 became 9,113' line, so that line was stale."

"Small thing: '9,087 transfers' -- they're not transfers anymore, they're pairs. 9,113 transfers.
I'd write that wrong in a deck."

## Step 6 -- click the weight link to double-check

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "count, stronger"

"Whoa. 'Edit: transfers' -- and it shows One edge per ROW, Weight: AMOUNT, DIRECTED, '9,113 rows
became 9,113 edges', no count column. That's my original settings, not what I loaded. So which one
is true? The summary says count; the editor that the summary link opens says amount. If I hit
Apply here, does it put amount back? I'm not touching it. This is exactly the Gephi thing -- you
reopen and your settings are gone."

## Step 7 -- look at the edges table

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected" --click "Load" --click "Edges"

"Edges table: '9,113 edges', Rows 1 to 6 of 9,113, columns from_account, to_account, timestamp,
amount. 'Columns: 4 of 4'. No count column at all. Summary says 9,087 edges weighted by count,
table says 9,113 edges with no count. That's three places, two stories. I can't tell my director
which one the betweenness ran on."

"And 'every analysis from now on' -- I assume the weight sticks to this graph. Nothing told me
whether it applies to next month's import too. I'd guess no."

Stopped here.

## Wrap-up

**Did I succeed?** I think I set it up -- the summary right after load says weight is count,
stronger, undirected, 9,087 pairs. But I can't confirm it took, because the edit screen behind that
same link shows amount/row/directed, and the edges table shows 9,113 rows and no count. So: set up,
yes; checked, no -- the check contradicted itself.

**Single Ease Question: 3 / 7.** Setting it was actually fine -- Pair, then make count the weight,
three clicks, and the 'Weight: count, the number of rows per pair' line is great. What took longest
was trying to believe it. The import panel said 9,113 and 9,087 at the same time, and after loading
the edit screen and the edge table both disagree with the summary.

**Would I use this instead of Gephi?** Not yet for this. The import side beats Gephi -- merging
parallel edges into a count and making it the weight is clearer than Gephi's merge dialog, and the
'nothing is uploaded' line is right where I need it. But if the edit screen reopens with my old
weight, that's the reopened-project-lost-my-settings problem again, and if I can't see the count on
the edges table I can't export it to Excel and show someone. I'd still compute the pair counts in
pandas and import a pre-weighted edge list, because then I know what the weight is.

## Problems noted

1. Edit screen opened from the loaded graph's Weight link shows the original import settings (Row,
   Weight: amount, Directed, 9,113 edges), not the ones loaded (Pair, count, Undirected, 9,087).
   Severity: high -- it says the setting did not take, and Apply might revert it.
2. Edges table after load: 9,113 edges, 4 columns, no count column; summary says 9,087 edges
   weighted by count. Severity: high -- no way to see or export the weight.
3. Import match report with Pair + Undirected shows both "9,087" and "9,113 rows became 9,113
   edges" and "One edge per Pair changes nothing" at once; the Makes header stays at 9,113.
   Severity: medium.
4. Summary calls merged pairs "9,087 transfers" though there are 9,113 transfers. Severity: low.
5. Nothing says whether "from now on" holds for the next import of this data. Severity: medium.
6. "Weight" in the role menu has the same name as the amount column's role chip (two controls
   named "Weight" on screen). Severity: low.
