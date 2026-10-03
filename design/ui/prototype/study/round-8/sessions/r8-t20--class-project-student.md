# Session: set aside minor characters (Les Miserables), class-project student

Participant: Dev, third-year history student, first graph tool after one Gephi tutorial video.

Task as given: "The Les Miserables network is open (example data, not your own). For every count
and every drawing from now on, you want to set aside the minor characters -- anyone who shares
chapters with fewer than five others. Set that up, then say how many characters are left."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t20--class-project-student/.

## Start screen (shots/tasks/r8-t20/01.png)

"OK, the Les Mis drawing. Left side is a long list: Selection, Notes, Labels, PageRank, Louvain,
Shortest paths, Density... a lot of stuff somebody already did. 'Shares chapters with fewer than
five others' -- that is just degree, right? Degree under 5. In the Gephi video that was the Filters
tab, drag 'Degree Range' in. I don't see 'Filter' in this list. Up top there's a little funnel
that says 'Full graph' with a dropdown. A funnel is a filter. I'll click that."

## Step 1 -- the funnel

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t20 --click "Full graph"

"It jumped me to a Data page. There's a 'Filters' box: 'No filters. Filters change what is
computed; the eye in the Graph tree only hides.' Good -- that's exactly what I want, change what is
computed, not just hide. Right side says 77 nodes, highest degree 36. And there's a 'degree'
attribute in the list already. Clicking 'Add filter step'."

## Step 2 -- add a step

    ... --click "Full graph" --click "Add filter step"   (02.png)

"A menu: 'By an attribute or computed value', 'Top of a computed value', 'Largest component',
'k-core', 'Neighbors of the selection'. I don't know what k-core is and I'm not going to find out.
'By an attribute' -- degree is an attribute. First one."

## Step 3 -- pick the attribute

    ... --click "By an attribute or computed value"   (03.png)
    ... --click "degree"                               (04.png)

"Dropdown of attributes; degree is there under 'Other attributes'. Clicked degree... and now the
right side is a page ABOUT degree -- 'Range 1 to 36, Median 6, Nothing uses it' -- and my filter
step still says 'New step'. Huh. I think I hit the degree in the left list instead of the one in
the dropdown. The dropdown was sitting right on top of the same word. Try again, the one inside the
menu."

(Note for the reader: the replay tool's first match for "degree" was the left-hand attribute list,
not the open dropdown, so this miss is partly the click-through harness; the name was duplicated in
two places on screen at once.)

    ... --click "degree, nodes"                        (05.png)

"There. 'degree is at least' and an empty box. 'At least' -- I want to drop fewer than five, so
keep at least 5. That's right if I think about it for a second. Typing 5, Enter."

## Step 4 -- the number

    ... --click "degree, nodes" --key 5 --key Enter    (06.png)

"Filter says 'degree is at least 5 -- 41 of 77 nodes (the full graph)'. The funnel up top now says
'41 of 77 nodes'. So 41 characters left. But... the drawing looks exactly the same? Same dots, the
little guys at the edges are all still there. And the right side still says 'Nodes 77', 'Average
degree 6.60', 'Highest degree 36'. Is that the before or the after? The task says every count. I
expected the drawing to lose the dangling ones like in Gephi."

## Step 5 -- check the Graph page

    ... --key Enter --click "Graph"                    (07.png)

"On the Graph page the funnel says 'Full graph' again, and PageRank 'Paints 77 nodes'. Did it just
throw my filter away?"

    ... --click "Graph" --click "Data"                 (08.png)

"Back on Data it's still there, '41 of 77 nodes', checkbox on. So the filter exists but the Graph
page doesn't seem to know about it, and the drawing never changed. I'm going to say 41 and stop;
I'd have to ask the TA whether the picture is really filtered."

## Verdict

- Answer given: 41 characters left.
- Do I think I succeeded? Mostly. The number feels solid because the filter itself says it. I'm
  not convinced the drawing and the other counts (PageRank 'paints 77', summary 'Nodes 77') are
  using it, and the funnel said 'Full graph' when I was on the Graph page.
- Single Ease Question: 4 of 7. Finding the filter was easy once I tried the funnel; the doubled
  'degree' cost me a wrong try; and the screen kept telling me 77 after I set it to 41.
- Would I use this instead of Gephi? Maybe. Writing 'degree is at least 5' in plain words is nicer
  than Gephi's slider, and the '41 of 77' is something I can quote in an essay. But I judge by the
  picture, and the picture didn't change, so for the assignment figure I wouldn't trust it yet.

## Problems seen

1. The drawing did not change after the filter was on (still all 77 dots, dangling minor
   characters visible). Severity: high -- the participant judges success by the figure.
2. The right-hand summary still read 'Nodes 77', 'Highest degree 36' with the filter on; unclear
   whether counts are filtered. Severity: high, given the task said "every count".
3. The top funnel read 'Full graph' on the Graph page but '41 of 77 nodes' on the Data page; the
   PageRank row on the Graph page said 'Paints 77 nodes'. Severity: medium-high.
4. The attribute dropdown opened over the left attribute list, so 'degree' appeared twice on screen
   at once; the first click landed on the wrong one and opened an attribute page instead of filling
   the step. Severity: medium (partly the click-through tool).
5. Nothing in the Graph tree mentions Filters; the participant only found them by guessing the
   funnel icon. Severity: low-medium -- the guess worked.

## What went well

- The funnel chip in the top bar led straight to Filters.
- "Filters change what is computed; the eye in the Graph tree only hides" answered the exact
  question the task raises.
- The step reads back in plain words, "degree is at least 5 -- 41 of 77 nodes".
