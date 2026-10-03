# Session: Expert Emma -- set aside minor characters, count what is left

Task as given: "The Les Miserables network is open (example data, not your own). For every count
and every drawing from now on, you want to set aside the minor characters -- anyone who shares
chapters with fewer than five others. Set that up, then say how many characters are left."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t20--expert-emma/.

## 01 -- start screen (shots/tasks/r8-t20/01.png)

"Graph tree on the left, PageRank coloring, a 'Local only' chip -- good, that answers my first
question before I ask it. Next to it: 'Full graph' with a funnel. That reads like the scope
everything is computed over. That is where I start."

## 02 -- click the scope chip

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t20 --click "Full graph"

"It jumped me to Data, with a Filters section that says 'Filters change what is computed; the
eye in the Graph tree only hides.' That is exactly the distinction I want somebody to have
thought about. Degree is already an attribute. Add filter step."

## 03 -- add a filter step

    ... --click "Full graph" --click "Add filter step"

(The tool noted two controls are named "Add filter step"; it clicked the first.)

"Menu: by attribute, top of a computed value, largest component, k-core, neighbors of the
selection. Careful: 'shares chapters with fewer than five others' is degree < 5, NOT a 5-core.
A k-core prunes recursively and would remove more. Attribute it is. Good that both are offered;
I can see a junior picking k-core here and getting a different number without knowing why."

## 04 -- by attribute

    ... --click "By an attribute or computed value"

"Picker grouped into in use, other attributes, edges, results, notes. 'degree' is under other
attributes, which means it came in with the file. I would like to know whether that is the
plain neighbor count or something the file author weighted. I'll take it and check."

## 05 -- wrong degree

    ... --click "degree"

(Two controls matched "degree"; the tool clicked the one in the left Attributes list.)

"That opened the attribute's own page, not the filter. Annoying, but it told me something:
imported, not computed, range 1 to 36, median 6. With a median of 6, 'at least 5' should keep a
bit over half. Back to the dropdown."

## 06 -- pick degree in the filter's picker

    ... --click "degree, nodes"

"'degree is at least' is preselected, and an empty box. Right operator by default."

## 07 -- type 5

    ... --click "degree, nodes" --key 5 --key Enter

"41 of 77 nodes. The step in the list says '41 of 77 nodes (the full graph)', the top chip now
says '41 of 77 nodes'. Plausible against the median. But the drawing has not changed: Myriel's
degree-1 leaves are still there, the pendant nodes on the right are still there, and the
PageRank legend still reads 0.00330 to 0.0754 -- so PageRank was not recomputed on the 41
either, or it was and nobody tells me."

## 08 -- check the summary through the chip

    ... --key Enter --click "41 of 77 nodes"

"The graph summary: 77 nodes, density 0.0868, average degree 6.60, highest degree 36. Those are
the full-graph numbers. The help text promised filters change what is computed. Either this
summary is deliberately the unfiltered source -- then label it so -- or the filter only counted
and did nothing else. I cannot tell which, and that is the problem."

## 09 -- check the Graph tab

    ... --key Enter --click "Graph"

"And now the top chip says 'Full graph' again and PageRank 'paints 77 nodes'. Did moving to the
Graph tab drop my filter? The task said 'from now on'. If a tab switch discards it, this is not
set up, it was a preview. I stop here."

## Outcome

- Answer given: 41 characters (degree at least 5, i.e. shares chapters with five or more).
- Do I think I succeeded? Half. I got a count I believe, and the filter exists in the Data
  list. I do not believe "every count and every drawing" now use it: the picture, the graph
  summary and the PageRank range all still show the 77-node graph, and the scope chip went back
  to "Full graph" when I changed tabs.
- Single Ease Question: 4 of 7. Finding and building the filter was easy (4 clicks, sensible
  default operator, attribute vs k-core both offered). Confirming it took effect everywhere was
  impossible.
- Would I use this instead of my current tool? For this job, not yet. In networkx it is one
  line: `G.subgraph([n for n, d in G.degree() if d >= 5])`, and then every number afterward is
  on the subgraph by construction. Here the filter's reach is unclear. If the drawing, the
  summary and the computed measures visibly switched to "41 of 77" and stayed that way across
  tabs, the setup itself would be faster than Gephi's filter panel, and I would say so.

## Problems noted

1. Filter applied, but the canvas still draws all 77 nodes (degree-1 nodes visible).
2. Graph summary (nodes, density, average degree) still shows full-graph values after the
   filter; no label says it is the unfiltered source.
3. PageRank legend and "paints 77 nodes" unchanged; no sign of recompute or of staleness.
4. The top scope chip reads "Full graph" again after switching to the Graph tab -- looks like
   the filter was dropped.
5. Two controls named "degree" (Attributes list and the filter picker) -- clicking the visible
   one opens the attribute page instead of choosing it for the filter.
6. Two controls named "Add filter step" on the Data page.
7. "degree" is the file's column; nothing says whether it is the unweighted neighbor count.
