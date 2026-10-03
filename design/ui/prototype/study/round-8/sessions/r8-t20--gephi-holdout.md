# Session: set aside the minor characters (Les Miserables) -- the Gephi holdout

Participant: Dr. Mara Lindqvist (Gephi user since 0.8, skeptical expert).
Task as given: "The Les Miserables network is open (example data, not your own). For every count
and every drawing from now on, you want to set aside the minor characters -- anyone who shares
chapters with fewer than five others. Set that up, then say how many characters are left."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t20--gephi-holdout/.

## 01 -- start screen (shots/tasks/r8-t20/01.png)

"Les Mis, 77 nodes, colored by PageRank. Fine. 'Shares chapters with fewer than five others' is
degree under five -- the edges are co-appearance pairs. In Gephi this is Filters, Topology,
Degree Range, drag the lower bound to 5, Filter. Where is the filter here? There's a chip at the
top with a funnel icon that says 'Full graph'. That's the closest thing to a filter I can see.
The list on the left is styling and results, not filters."

## 02 -- click the funnel chip

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20--gephi-holdout/02.png task:r8-t20 --click "Full graph"

"It jumped me to a Data page. Sources, Filters, Attributes. 'No filters. Filters change what is
computed; the eye in the Graph tree only hides.' Good -- that's the one sentence I wanted, it
tells me a filter here is not Gephi's 'statistics run on whatever is visible' accident, it's
meant to change the computation on purpose. 'Add filter step.' Click it."

## 03 -- add a filter step

    ... --click "Full graph" --click "Add filter step"

"Keep: pick one. By an attribute or computed value, Top of a computed value, Largest component,
k-core, Neighbors of the selection. k-core is a trap for a student -- 5-core is not 'degree at
least 5'. I want degree. Attribute or computed value."

## 04 -- by an attribute or computed value

    ... --click "By an attribute or computed value"

"A list of attributes: label, group, betweenness, degree, value, Louvain, PageRank, note count.
'degree' sits under 'Other attributes', which means it came in with the file, not computed by the
tool. I'd want to know it agrees with the real degree. The summary later says highest degree 36,
same as this column's max, so I'll accept it for now."

## 05 -- clicked 'degree' (landed on the wrong one)

    ... --click "By an attribute or computed value" --click "degree"

"That opened the degree attribute's own page on the right instead of putting it in my condition.
The word 'degree' is in two places on the screen -- the attribute list on the left and the menu
-- and I hit the left one. Range 1 to 36, median 6. Useful, but not what I asked for. Back to
the menu."

## 06 -- pick degree in the menu

    ... --click "By an attribute or computed value" --click "degree, nodes"

"'degree is at least' -- with an empty box. The default comparison is the right one. Type 5."

## 07 -- type 5

    ... --click "degree, nodes" --key 5 --key Enter

"'degree is at least 5 -- 41 of 77 nodes (the full graph)'. The top chip now says '41 of 77
nodes'. So: 41 characters.

But look at the canvas. Nothing moved. The whole hairball is still there -- Myriel's fan of
one-scene bishops and housekeepers, the lone node hanging off the bottom, all of it. I asked for
'every drawing from now on'. In Gephi, the moment the filter is on, the minor ones are gone from
the Overview. Here I have a number in a chip and an unchanged picture."

## 08 -- go back to Graph to see if the drawing follows

    ... --key 5 --key Enter --click "Graph"

"Now the chip says 'Full graph' again, and PageRank on the right says 'Paints 77 nodes'. Did it
throw my filter away when I changed pages? That would be worse than Gephi."

## 09 -- back to Data

    ... --click "Graph" --click "Data"

"No, the filter is still there, 41 of 77, chip says 41 again. So the chip only reports a filter
while I'm on the Data page? And the Summary right next to it, with the filter on, says Nodes 77,
density 0.0868, average degree 6.60, highest degree 36 -- those are full-graph numbers. The page
told me 'filters change what is computed', and the first computed numbers I see ignore the filter.
Which is it?"

## 10 -- open the table

    ... --key 5 --key Enter --click "Table"

"Table: '41 of 77 nodes, sorted by degree' at the top, and 'Rows 1 to 77 of 77' on the right.
The columns say 'Degree (full graph)', 'Rank by degree (full graph)', 'PageRank (full graph)'.
Rank '#4 of 77'. So the table shows me all 77 rows and ranks against all 77 while claiming 41. At
least the columns are honest that they're full-graph -- that is more than Gephi does -- but then
what did my filter change? Not the drawing, not the summary, not the table rows, not the ranks."

## 11 -- click the '41 of 77 nodes' chip

    ... --key 5 --key Enter --click "41 of 77 nodes"

"Just brings me back to Data. No 'apply to the drawing' option, nothing."

## Verdict

**Did I succeed?** Half. The filter exists, it is on, and the app says 41 of 77 characters have
degree 5 or more -- I would report 41. But the task was 'every count and every drawing from now
on', and the drawing still shows all 77 nodes, the summary still counts 77 with full-graph
density, the table lists 77 rows and ranks 'of 77', and the top chip goes back to 'Full graph'
on the Graph page. Either it isn't applied to those things or it is and they're labeled wrong;
I can't tell which, and that is the worst outcome for me.

**Single Ease Question:** 4 of 7. Finding and setting the filter was quick -- three clicks and a
number, faster than Gephi's drag-the-slider-then-press-Filter. Trusting what it did was hard.

**Would I use this instead of Gephi?** No. "Statistics follow the filter and nothing says so" is
my standing complaint about Gephi, and this goes the other way without being clearer: the Filters
panel says it changes what's computed, and everything I can see says it didn't. The '(full graph)'
labels on the table columns are a genuinely good idea and I'd steal them for my handout. But a
filter that doesn't change the picture is not a filter in my vocabulary; I'd stay on Gephi.

## Problems seen

1. With the filter on, the canvas still draws all 77 nodes (07, 09, 10). The task asked for the
   drawing to drop the minor characters; nothing visible connects the filter to the drawing.
2. The Data page says "Filters change what is computed", yet its Summary, beside the active
   filter, reports 77 nodes and full-graph density and degree (09).
3. The table header says "41 of 77 nodes" while its pager says "Rows 1 to 77 of 77" and its
   ranks read "of 77" (10).
4. The top chip reads "41 of 77 nodes" on the Data page but "Full graph" on the Graph page with
   the same filter on (08 vs 09), which reads as the filter having been lost.
5. "degree" appears both in the left attribute list and in the condition menu; clicking the word
   opened the attribute's page instead of setting the condition (05).
6. The degree used is an imported column ("Other attributes"), not one the tool computed; nothing
   at the filter says whether it matches the graph's real degree.
7. k-core sits next to the attribute filter with no hint that a 5-core is not "degree at least
   5" -- a student would pick it.
