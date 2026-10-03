# Session: select the flagged accounts in Great Britain (knowledge engineer)

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).
Task as given: "March's card transfers are open (example data if you do not work in banking). Pick out,
all at once, every account in Great Britain that was flagged, so you can work on just those. Say how
many there are."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t32--knowledge-engineer/. Below, D stands for that folder.

## Start screen (shots/tasks/r8-t32/01.png)

"Transfers, 3,000 nodes, 9,113 transfers. Good, it says nodes versus edges. A grey hexagon blob in
the middle -- is position meaningful? Probably not. I am not in banking but this is a plain
WHERE clause: country = GB and flagged = true. In SPARQL that is two triple patterns and a FILTER.
Where is the query box? I see 'Find rows and notes'. And nothing that says query, select or filter
on this screen except the 'Full graph' button at the top. First I want to see the columns."

## Step 1 -- open the table

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t32 --click "Table"

"A table of nodes, 11 of 13 columns, sorted by total amount. id, links in, links out, total amount.
I do not see country or flagged. They must be off to the right. 'Sum of total amount in: select
rows to total them' -- fine."

## Step 2 -- the 'Full graph' button

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t32 --click "Full graph"

"That took me to a Data page: Sources, Filters, Attributes. The attribute list is useful: alertRule,
alertTime, country, flagged (T|F, so a boolean, good), kind, riskScore. 'Filters change what is
computed; the eye in the Graph tree only hides.' I do not want to change what is computed, I want
to pick them out. But noted."

## Step 3 -- click the country attribute to see its values

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t32 --click "Full graph" --click "country"

"Category, from accounts-2026-03.csv, 3,000 nodes. Values: 'Read from accounts-2026-03.csv on the
Data page'. I am ON the Data page. Where are the distinct values? I want to know whether it is GB,
UK or 'United Kingdom' before I write anything. No value counts. That is the first thing a profiler
should show me."

## Step 4 -- the Selection row in the Graph tree

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t32 --click "Selection"

"That is just the paint for the selection: yellow, size 1.45, 40 percent. Not a way to select."

## Step 5 -- guessing a 'Select' control

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t32 --click "Select"

"Same panel. It matched Selection."

## Step 6 -- the graph's More actions menu

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t32 --click "More"

"Select all visible, Invert selection, Reselect previous, Fit, layout things, Add node, Clear graph
data. No 'select where'. Clear graph data sits right there, I will not touch that."

## Step 7 -- show columns

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t32 --click "Table" --click "Columns: 11 of 13"

"country, flagged, kind, riskScore are ticked, so they are in the table, just off screen. Fine."

## Step 8 -- look for a filter on the table

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t32 --click "Table" --click "Filter"

Result: nothing on screen is called "Filter". "No filter on the table itself."

## Step 9 to 13 -- the search boxes

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t32 --click "Find rows and notes"
    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t32 --click "Analyze"
    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t32 --click "Analyze" --type "flagged"
    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t32 --click "Analyze" --type "select"
    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t32 --click "Find rows and notes" --type "GB"

"Analyze says 'Search, or say what to find'. So I say what to find: 'flagged'. No match. 'select'.
No match. It is a list of algorithms -- Louvain, PageRank, Shortest path -- not a finder. The left
box, 'Find rows and notes', says no match for 'GB'. So 'rows' here does not mean data rows; it means
the paint layers in that tree. That word is misleading -- in a table a row is a record."

## Step 14 to 19 -- a filter step on the Data page

    timeout 120 node app-b/study.mjs --try D/14.png task:r8-t32 --click "Data" --click "Add filter step"
    timeout 120 node app-b/study.mjs --try D/15.png task:r8-t32 --click "Data" --click "Add filter step" --click "By an attribute or computed value"
    timeout 120 node app-b/study.mjs --try D/16.png task:r8-t32 --click "Data" --click "Add filter step" --click "By an attribute or computed value" --click "country"
    timeout 120 node app-b/study.mjs --try D/17.png task:r8-t32 --click "Data" --click "Add filter step" --click "By an attribute or computed value" --click "country, accounts"
    timeout 120 node app-b/study.mjs --try D/18.png task:r8-t32 --click "Data" --click "Add filter step" --click "By an attribute or computed value" --click "country, accounts" --type "GB"
    timeout 120 node app-b/study.mjs --try D/19.png task:r8-t32 --click "Data" --click "Add filter step" --click "By an attribute or computed value" --click "country, accounts" --type "GB" --key Enter

"Not what I want -- a filter changes what is computed -- but it is the only attribute condition I
have found. Keep: by an attribute. country, is, and an empty text box. No dropdown of the actual
values. I type GB and press Enter. The step is now called 'country is GB', and it says
'This step: 3,000 of 3,000 nodes'. The canvas did not change. So either there is no GB in this
data, or the count is not being recomputed. It does not tell me which. That is an unexplained
number, and I distrust it."

## Step 20 -- click that count

    timeout 120 node app-b/study.mjs --try D/20.png task:r8-t32 --click "Data" --click "Add filter step" --click "By an attribute or computed value" --click "country, accounts" --type "GB" --key Enter --click "3,000 of 3,000 nodes"

"What? This is 'Les Miserables', a co-appearance graph of 77 characters. My transfers are gone.
I clicked a node count and it swapped the whole dataset. That is the second unexplained thing.
Normally that is where I close the tab. I will give it one more honest try from a clean start,
because the table had my columns."

## Step 21 to 22 -- right-click the country column

    timeout 120 node app-b/study.mjs --try D/21.png task:r8-t32 --click "Table" --click "Select by"
    timeout 120 node app-b/study.mjs --try D/22.png task:r8-t32 --click "Table" --rclick "country"

"'Select by' is nothing. Right-click on the country header: Add label line, Show as groups,
Place by (not available), Filter to..., Select where country is..., Read as..., Edit on the Data
page. There it is: 'Select where country is...'. Hidden behind a right-click on a column I had to
scroll to. I also now see the values: US, FR. ISO codes, so GB is right. And flagged shows 'no',
not false."

## Step 23 to 25 -- the Select dialog, first attempts

    timeout 120 node app-b/study.mjs --try D/23.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..."
    timeout 120 node app-b/study.mjs --try D/24.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --type " == 'GB' && flagged == true"
    timeout 120 node app-b/study.mjs --try D/25.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --key Control+a --type "country == 'GB' && flagged == true"

"A real query box. Query / Ids, Nodes / Edges, and Replace / Add / Remove / Within. Good, those
are the set operations I want. The box is prefilled with 'country' but the cursor sits at the
START, so my typing went in front of it: '== 'GB' && flagged == truecountry'. Annoying. I cleared
it and wrote it properly with &&. 'Select 0', and the hint still says 'Finish the query with a
comparison'. No error, no 'unknown operator'. It just silently does not understand me."

## Step 26 to 28 -- the '+ condition' helper

    timeout 120 node app-b/study.mjs --try D/26.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --click "+ condition"
    timeout 120 node app-b/study.mjs --try D/27.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --click "+ condition" --click "flagged"
    timeout 120 node app-b/study.mjs --try D/28.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --click "+ condition" --click "flagged, accounts"

"'+ condition' wrote 'country and'. So the conjunction is the word 'and', not &&. That is how I
learned the grammar -- from the helper, not from an error message. It gives me 'country and
flagged', with no operators or values, so I still have to type the comparisons myself."

## Step 29 -- the query that works

    timeout 120 node app-b/study.mjs --try D/29.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --key Control+a --type "country == 'GB' and flagged == true"

"'1 of 3,000 nodes match'. Select 1, Create set, Create set from rule. One. That is small. I want
to check it."

## Step 30 to 31 -- known-answer check on each half

    timeout 120 node app-b/study.mjs --try D/30.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --key Control+a --type "country == 'GB'"
    timeout 120 node app-b/study.mjs --try D/31.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --key Control+a --type "flagged == true"

"flagged == true: 14 of 3,000. country == 'GB' on its own: 'Not available yet: counting this
query in this version.' So the tool can count GB-and-flagged but not GB. I cannot verify the
denominator. One out of fourteen flagged accounts being British is plausible for example data,
but I am taking it on trust."

## Step 32 -- select it

    timeout 120 node app-b/study.mjs --try D/32.png task:r8-t32 --click "Table" --rclick "country" --click "Select where country is..." --key Control+a --type "country == 'GB' and flagged == true" --click "Select 1"

"'Selected 1 of 3,000 nodes where country == 'GB' and flagged == true', and the inspector says
1 node, with the query written out. Good: it records HOW the selection was made. That is
provenance, I like that. But: I cannot see which hexagon is selected on the canvas, the table does
not jump to the row, and -- where did 'Louvain, 35 groups' and 'Links in (count)' come from in the
left tree? I did not run Louvain. Something ran an algorithm I did not ask for, or it was there
and hidden before. Either way, unexplained."

## Verdict

- Succeeded? Yes, I believe so: one account, the flagged account in GB, selected in one step by a
  query. Answer: 1. I am only moderately confident, because I could not cross-check the GB count
  and I could not see the selected account on screen.
- Single Ease Question: 2 of 7. The query itself is fine once found. Finding it took about twenty
  attempts: the only way in was a right-click on a column header I had to scroll to, the Analyze
  box that says "say what to find" does not find, "Find rows" does not find rows of data, the
  query box takes && silently and does nothing, and a click on a filter count swapped my whole
  dataset for Les Miserables.
- Would I use it instead of my current tool? No. For this job a SPARQL SELECT with a FILTER, or a
  pandas one-liner, takes ten seconds and I can trust the count. What would change my mind: a
  visible "Select where..." next to the search box, value counts on an attribute (show me GB: n
  before I type it), a parse error when the query is wrong, every count computable, and no
  algorithms or datasets appearing that I did not ask for. The recorded query on the selection is
  the one thing I would keep.
