# Session: t02-transactions -- Dana Okafor (supply chain risk analyst)

Task as given: "Which ten accounts receive transfers from the greatest number of other accounts
this month? Get graphty to work it out so you can hand the list on. The data on screen is a
sample: one month of card and bank transfers between accounts. If that is not your line of work,
treat the accounts as your own things (suppliers, customers, hosts, genes) and the transfers as
what passes between them."

Outcome: gave up. No top-ten list produced. Single Ease Question: 2 of 7.

Renders are in tmp/round-7-sessions/t02-transactions--supply-chain-analyst/. Every command was
run from design/ui/prototype with `timeout 120 node app-b/study.mjs --try <render> task:t02-transactions ...`.

## Start screen (shots/tasks/t02-transactions/01.png)

"OK, so in my world this is 'which suppliers get parts from the most other suppliers', a
fan-in. A pivot: count of distinct senders per receiver, sort descending, top ten. Ten minutes in
Excel.

What am I looking at. A grey blob of hexagons in the middle -- that tells me nothing, nice
hairball. On the right a 'Summary': Nodes 3,000, Edges 9,113. I'll take nodes as accounts and
edges as transfers. 'Highest total degree 907' -- I don't know what degree is. A little chart
I can't read without my glasses. 'Local only' up top, good, I'll ask about that later for IT.

Bottom left says 'Table'. Tables are where I live. Click it."

## 01 -- `--click "Table"`

"There's a table. Columns: id, 'Links in (count, full graph)', 'Links out', 'Links total', kind,
country. 'Links in' -- that sounds like what comes into the account. Good. It's sorted by Links
total right now. Odd that it says 'Rows 381 to 420 of 3,000' -- why am I starting in the middle?
Whatever, I'll sort on Links in."

## 02 -- `--click "Table" --click "Links in (count, full graph)"`

"Arrow on Links in, pointing down, so descending. Top row is ACC-555017 with 4. Four? The summary
says something has 907. That can't be the top. Oh -- it still says 'Rows 381 to 420'. So I'm
looking at the middle of the sorted list, not the top. I need page one."

## 03 -- `... --click "Previous"`

"Clicked the left arrow. Tooltip says 'Shows the next rows (the skeleton holds one page)'. Next?
I clicked the back arrow. And nothing moved, still 381 to 420. I don't know what 'skeleton' means
here. I can't get to the top of my own sorted table. In Excel this is Ctrl+Home."

## 04 -- `--click "Analyze"`

"Fine, the left panel has a link 'Analyze ... to add results here'. Let me try that. A list:
Louvain, PageRank -- no idea, not touching those, even with 'Start here' on it. Then
'Links (count)', 'Links in (count): How many edges come into each node', 'Links out', 'Total
amount'. 'Links in' again -- same thing as the column, I think. One question I have: is that the
number of transfers coming in, or the number of different accounts sending? An account that gets
fifty payments from one payroll account isn't what I was asked for. It says 'edges', and edges
are transfers, so I'd guess it's transfers. Not what I want, but it's all there is."

## 05 -- `--click "Analyze" --click "Links in (count)"`

"Small box: 'How many edges come into each node. Measure: Links in (count). Under a second. Run.'
OK, Run."

## 06 -- `... --click "Run"`

"Nothing happened. A dark tip says 'Would add Links in (count) at the top of the list, running'.
Would? Did it or didn't it? The left list still only says Selection, Notes, Everything. No result,
no ranking, no table."

## 07 -- `--click "Table" --click "Links in (count, full graph)" --click "Links in (count, full graph)"`

"Back to the table, maybe clicking the header again helps. Now it's ascending -- zeros. Still
rows 381 to 420. So sorting works but I can only ever see the same 40-row slice. Useless for a
top ten."

## 08 -- `--click "Table" --hover "More"`

"Looking for an export, or a 'top N', anything. Hovering the three dots got me 'More actions' on
the right side, not the table. Didn't help."

## 09 -- `--click "Data"`

"Tried the 'Data' button on the far left. Now it says '812 of 3,000 nodes' up top and there's a
filter 'amount is at least 1,000' ticked on. Hold on -- did I do that? A minute ago it said
'Full graph'. If there's a filter on, every number I've been looking at might be wrong. And the
right side now says 'Compute on 812'. I don't trust this. I wanted all accounts this month."

## 10 -- `--click "4 more readings not computed"`

"Thought maybe the summary has an 'incoming' reading hidden. Clicked '4 more readings not
computed' and got a menu: Select all, Fit, Re-run layout, Unpin all, Clear graph data. Not what
I asked for. Closing it."

## 11 -- `--click "Analyze" --click "Links in (count)" --click "Run" --key Escape --click "Table"`

"One more go: run it, close the box, open the table to see if a new column turned up. Escape just
took me back to the Analyze list and covered the Table button -- 'nothing on screen is called
Table'. And the Run still says 'Would add'.

That's it, I'm out. I'd export the transfers file and do a pivot."

## Debrief

Did I succeed? No. I found the right idea -- 'Links in' -- in two places, but I could never see
the top of the list, the Run button didn't visibly produce anything, and I never got a list I
could hand on. I'm also not sure 'Links in (count)' answers the question: it counts transfers
('edges'), and I was asked for the number of different accounts sending. Nothing on screen told me
which one it is.

Single Ease Question: 2 of 7. The words were mostly OK ('Links in' I understood), but the table
stuck in the middle, the 'previous' arrow that says 'next', a Run that only says 'would', and a
filter that seemed to appear on its own when I clicked 'Data'.

Would I use this instead of my current tool? No. Excel does this question in ten minutes with a
pivot and I can hand the result on. Here I couldn't even get the top ten rows, there's no export I
could find, and the moment a filter showed up I'd stopped trusting the numbers. 'Local only' is a
point in its favor for IT, but it doesn't plug into Power BI as far as I could see, so even if it
worked it would be a side tool.
