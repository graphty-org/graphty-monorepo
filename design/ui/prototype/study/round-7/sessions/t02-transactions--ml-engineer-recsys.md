# Session: top ten accounts by distinct senders -- Chris, ML engineer (recommendations)

Task as given: "Which ten accounts receive transfers from the greatest number of other accounts
this month? Get graphty to work it out so you can hand the list on."

How Chris reads it: the number of DISTINCT senders per account (in-degree over unique source
accounts), not the number of transfers. In his world that is "number of unique users who touched
this item", not "number of interactions".

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t02-transactions--ml-engineer-recsys/ (shortened to $D below).

## 01 -- start screen (shots/tasks/t02-transactions/01.png)

Think-aloud: "OK, hex-binned blob, at least it's not drawing a hairball of 9k edges. Right panel
has the numbers I care about: 3,000 nodes, 9,113 edges, directed, reciprocity 0, highest total
degree 907. Fine. I want in-degree. There's an 'Analyze (Shift+A)' link on the left. Click it."

## 02 -- Analyze

    timeout 120 node app-b/study.mjs --try $D/02.png task:t02-transactions --click "Analyze"

Think-aloud: "A palette. Louvain, PageRank... 'Links in (count): how many edges come into each
node.' That's in-degree by edge count. My question is distinct senders. If account A paid B five
times this month, that's five edges, one sender. Is there a 'unique' version? Nothing in the list
says so. Also why 'Links'? Just say in-degree."

## 03 -- Links in (count)

    timeout 120 node app-b/study.mjs --try $D/03.png task:t02-transactions --click "Analyze" --click "Links in (count)"

Think-aloud: "One-line description, a 'Measure' dropdown, 'Under a second', Run. Let me see if the
dropdown has a distinct-neighbors option."

## 04 -- Measure dropdown

    timeout 120 node app-b/study.mjs --try $D/04.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Links in (count)"

Think-aloud: "Links / Links in / Links out. All counts of edges. No 'count distinct', no option to
collapse parallel edges. Fine, run it and see what the numbers look like."

## 05 -- Run

    timeout 120 node app-b/study.mjs --try $D/05.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run"

Think-aloud: "A tooltip says it 'would add Links in (count) at the top of the list, running'.
Nothing else happened. Where is 'the list'? I don't see a result, a ranking, nothing."

## 06-07 -- trying to get to the table

    timeout 120 node app-b/study.mjs --try $D/06.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run" --click "Table"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run" --key Escape --click "Table"

Think-aloud: "Table is covered by the popup. Escape only took me back one level to the palette.
Two Escapes, then."

## 08 -- Table

    timeout 120 node app-b/study.mjs --try $D/08.png task:t02-transactions --click "Analyze" --click "Links in (count)" --click "Run" --key Escape --key Escape --click "Table"

Think-aloud: "OK, here's a node table. And there's already a column 'Links in (count, full
graph)'. So I didn't need Analyze at all? The table was sorted by 'Links total'. And it's showing
'Rows 381 to 420 of 3,000'. Why am I on row 381? I just opened it."

## 09 -- sort by Links in

    timeout 120 node app-b/study.mjs --try $D/09.png task:t02-transactions --click "Table" --click "Links in (count, full graph)"

Think-aloud: "Sorted descending by in-links, arrow points down. But still rows 381 to 420, so the
top of the ranking is ten pages above me. I can see values of 4, 3, 2 here, which is the middle
of the distribution. The top 10 is what I need."

## 10-13 -- page back to the top

    timeout 120 node app-b/study.mjs --try $D/10.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Previous page"
    timeout 120 node app-b/study.mjs --try $D/11.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --hover "Previous"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "Column menu"
    (13) same as 09 followed by --click "Previous rows" ten times

Think-aloud: "The arrow is 'Previous rows'. Clicked it ten times: still 'Rows 381 to 420'. The
tooltip on it says the skeleton holds one page. So I can't get to row 1. 'Column menu' opened the
id column's menu, not the one I wanted."

## 14-15 -- the Links in column menu

    timeout 120 node app-b/study.mjs --try $D/14.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "The Links in (count, full graph) column menu"
    timeout 120 node app-b/study.mjs --try $D/15.png task:t02-transactions --click "Table" --click "Links in (count, full graph)" --click "The Links in column menu"

Think-aloud: "Hoping for 'top N' or 'copy column'. Couldn't hit the chevron on that header by
name. Given up on that."

## 16 -- Edges table (checking the denominator)

    timeout 120 node app-b/study.mjs --try $D/16.png task:t02-transactions --click "Table" --click "Edges"

Think-aloud: "from_account, to_account, timestamp, amount. 9,113 rows. One row per transfer. So
an account paid twice by the same sender has two edges, and 'Links in (count)' counts it twice.
That's not what I was asked. I'd need a 'unique senders' measure or a 'merge parallel edges'
switch, and I haven't seen either. Nice touch: the sum of amount at the bottom, with the row
count."

## 17-21 -- looking for export

    timeout 120 node app-b/study.mjs --try $D/17.png task:t02-transactions --click "Table" --click "More"
    timeout 120 node app-b/study.mjs --try $D/18.png task:t02-transactions --click "Table" --click "Table actions"
    timeout 120 node app-b/study.mjs --try $D/19.png task:t02-transactions --click "Table" --click "Export"
    timeout 120 node app-b/study.mjs --try $D/20.png task:t02-transactions --click "Table" --click "Table menu"
    timeout 120 node app-b/study.mjs --try $D/21.png task:t02-transactions --click "Table" --click "More table actions"

Think-aloud: "'More' opened the graph's own menu on the right (select all, re-run layout, add
node...). No export there. The table's '...' I can't reach by any name I'd guess. Nothing is
called Export anywhere. I'm done."

## Wrap-up

- Succeeded? No. I found the in-degree column and sorted it, but I never saw the top ten rows, I
  could not export or copy anything, and the measure counts transfers, not distinct senders. Even
  if I'd seen the top ten I'd have handed on the wrong list unless every pair only transacts once,
  and the Edges table suggests repeat payers are possible.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my notebook? No. This is
  `df.groupby('to_account').from_account.nunique().nlargest(10)` -- one line. The tool made me
  find the measure twice (Analyze palette, then a table column that already existed), the Run
  button gave no result I could see, the table opened mid-list, and there was no way out with the
  ids. What I did like: the summary panel is honest (directed, reciprocity, highest degree, the
  degree CCDF), it says "Local only", and the edge table shows the row count and a column total.
  If 'Links in' had a 'distinct senders' option, the sorted table opened at row 1, and a "copy top
  N / export CSV" sat on the column, this would be a 30-second task.
