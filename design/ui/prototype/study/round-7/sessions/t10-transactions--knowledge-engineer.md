# Session: pick out flagged accounts in Great Britain and keep them as a named list

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona: study/personas/knowledge-engineer.md)

Task as given: "Pick out every account the monitoring system marked as suspicious that is based in
Great Britain, all at once, and keep them as a named list you can come back to. The data on screen
is a sample: one month of card and bank transfers between accounts."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t10-transactions--knowledge-engineer/.

## 01 -- start screen (shots/tasks/t10-transactions/01.png)

"3,000 nodes, 9,113 edges, a gray hexagon blob. Fine, accounts are instances, transfers are the
object property between them. In my world this is one SPARQL query: ?a :flagged true ; :country
'GB'. Then I would put the result in a named graph or a SKOS collection. Let me find where the
attributes are. There is a Table toggle at the bottom; that is where I would look first."

## 02 -- open the table

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10-transactions--knowledge-engineer/02.png task:t10-transactions --click "Table"

"Good, a table of the node file, accounts-2026-03.csv. id, link counts, kind, country. It even
says which file the rows came from -- I like that. Country is there as a two-letter code. I do not
see a flag column yet, so it is probably off to the right."

## 03 -- click the country header

    ... --click "Table" --click "country"

"It sorted ascending: BR, then DE. Sorting is not filtering. GB will be somewhere around page
five. I am not paging through 3,000 rows to tick boxes."

## 04 -- Columns: 10 of 12

    ... --click "Table" --click "Columns: 10 of 12"

"OK, here is the schema: id (account) as key, kind, alertRule, alertTime, country, flagged,
riskScore. flagged has a different icon -- a boolean, I assume. Good, the data is there. Odd:
kind is listed as 'Color (kind)' but the canvas badge says 'Nothing is colored or sized by a
row'. Which one is true? I note it and move on. This panel only shows or hides columns; there is
no 'where' here."

## 05 -- the funnel button at the top, "Full graph"

    timeout 120 node app-b/study.mjs --try .../05.png task:t10-transactions --click "Full graph"

"A funnel means filter, so I clicked it. And now the top says '812 of 3,000 nodes' and there is
a filter 'amount is at least 1,000' already ticked on. I did not make that filter. Did my click
turn it on, or was it there all along and hidden? Either way the summary on the right now says
'Nodes 812 of 3,000' but 'Edges 9,113' -- the same edge count as the full graph. If 2,188 nodes
are gone, some of their edges must be gone too. That number is wrong or it is labelled wrong.
That is my first strike: a count I cannot reconcile."

## 06 -- click the flagged attribute in the Data panel

    ... --click "Data" --click "flagged"

"I wanted to see what flagged holds -- how many true, how many false, any blanks. The row
highlights, but the inspector on the right shows 'amount -- Edge attribute', the histogram of
transfer amounts. I clicked flagged. It showed me amount. That is not a small thing; I can no
longer be sure the screen is describing the thing I picked."

## 07 -- Selection row in the Graph panel

    ... --click "Selection"

"Maybe Selection is where selection rules live. No -- it is a style: yellow, size 1.45, opacity
40, 'Paints 0 nodes'. It tells me how a selection looks, not how to make one by a rule."

## 08 -- the find box

    ... --click "Find rows and notes"

"Find rows and notes. Free text search, I assume. I would type GB, but text search is not a
conjunction of two conditions; it would match GB anywhere. I leave it."

## 09 -- Analyze

    ... --click "Analyze"

"'Search, or say what to find' -- and then Louvain, PageRank, shortest path, link counts. These
are algorithms, not a query. I am not asking for a centrality, I am asking for two attribute
conditions. Closed it."

## 10 -- the graph's three-dot menu

    ... --click "More actions"

"Select all visible, Invert selection, Reselect previous. So the intended path is probably:
filter down until only the right accounts are visible, then 'Select all visible'. That is
backwards from how I think -- I want to select by a rule, not hide everything else and then
select what is left -- but I will try it."

## 11 -- click a GB cell in the table

    ... --click "Table" --click "GB"

"'Selects ACC-633005'. One row. So the table selects one row at a time. Not 'all at once'."

## 12 -- add a filter step

    ... --click "Data" --click "Add filter"

"A 'New step' appears, stacked under the amount filter I never asked for, and it already says
'Kept all 812 nodes', so it starts from 812, not 3,000. I would have to remember to untick the
amount filter or I silently lose flagged GB accounts that only had small transfers. Nothing
warns me about that. Options: by an attribute, top of a computed value, largest component,
k-core, neighbors of the selection."

## 13 -- By an attribute or computed value

    ... --click "Data" --click "Add filter" --click "By an attribute or computed value"

"A field picker: accounts' attributes, transfers' attributes, note count. flagged is there."

## 14 -- pick flagged

    ... --click "Data" --click "Add filter" --click "By an attribute or computed value" --click "flagged"

"I clicked flagged. The picker closed, the step still says 'Kept all 812 nodes' with no
condition, and the right side is showing the amount attribute again. Same thing as before:
I ask for flagged, I get amount. Second strike."

## 15 -- Views, to see where a named list would be kept

    ... --click "Views"

"'No saved views. Save view.' A view is a camera and a style, I assume, not a set of accounts.
Nowhere have I seen 'save selection as a list' or 'named set'. Even if I got the filter to work,
I do not know where the named list would live."

## Stopping

"I am stopping here. Two things on this screen do not add up: the filtered summary keeps the full
edge count, and twice I picked flagged and was shown amount. Plus a filter I did not create was
switched on and quietly narrowed everything I did afterwards to 812 accounts. That is exactly
the kind of silent narrowing I cannot defend in a governance report."

## Outcome

- Succeeded? No. I never got a set of flagged GB accounts, and I never found where a named list
  would be kept.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? No. For this job my current tool is a SPARQL
  query with two triple patterns and a named graph for the result; it takes thirty seconds and I
  can see exactly what it did. Here the data is all present -- flagged and country are right
  there in the schema -- but there is no direct "select where" and no visible place to keep a
  named set. The path the tool seems to want (filter until only they remain, then select all
  visible) means hiding things to select things, and it inherited a filter I did not create.
  Fix the counts and give me "select nodes where flagged is true and country is GB, save as..."
  in one place, and I would look again.

## What she noticed (for the record)

- Positive: the table names the source file; the column chooser shows the whole schema with
  types and roles.
- The filtered summary shows "Nodes 812 of 3,000" but "Edges 9,113", unchanged.
- An "amount is at least 1,000" filter was already on (or turned on by the funnel button) and a
  new filter step starts from its 812 nodes, with no warning.
- Clicking flagged (in the attribute list, and in the filter field picker) shows the amount
  attribute in the inspector.
- "kind" is marked "Color (kind)" while the canvas says nothing is colored by a row.
- No way to select many nodes by a condition except filter-then-select-all-visible; no visible
  place to save a selection as a named list.
