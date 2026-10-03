# Session: transfers filtered to 1,000 or more -- Analyst Alex

Task as given: "A month of card transfers between accounts is open. If you do not work in
banking, this is example data, not your own. You want every count and every drawing from now on
to include only transfers of 1,000 or more. Set that up, then say how many accounts are left."

Start screen: shots/tasks/r8-t20-transactions/01.png
Renders: tmp/round-8-sessions/r8-t20-transactions--analyst-alex/02.png to 09.png
All commands run from design/ui/prototype; each replays from the start screen.

## Steps, thinking aloud

### 1. Start screen (01.png)
"Transfers, March 2026. Summary on the right says 3,000 nodes, 9,113 transfers, one weak
component. I want to filter out the small stuff. Up top there's a button with a funnel that says
'Full graph'. That's the filter. Clicking it."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20-transactions--analyst-alex/02.png task:r8-t20-transactions --click "Full graph"

### 2. Data panel with Filters (02.png)
"I expected a dropdown, it switched the left side to a Data panel instead. OK. There's a Filters
section: 'No filters. Filters change what is computed; the eye in the Graph tree only hides.'
That's the distinction I actually care about -- I want the counts changed, not just the picture
dimmed. 'Add filter step'."

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t20-transactions --click "Full graph" --click "Add filter step"

(The tool noted two controls named "Add filter step" and clicked the first.)

### 3. New step, Keep: Pick one (03.png)
"Menu: by an attribute or computed value, top of a computed value, largest component, k-core,
neighbors of the selection. Amount is an attribute. First one."

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t20-transactions --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"

### 4. Attribute picker (04.png)
"Grouped by table -- accounts, transfers. amount under transfers, marked as the weight. Good."

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t20-transactions --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "amount"

(05.png: the word "amount" matched the attribute list on the left as well as the menu option, and
the replay clicked the left one, which opened amount's details page instead of choosing it in the
filter. Not what I would have clicked with the menu open in front of me, so I replayed choosing the
menu entry. Side note from the details page: histogram 0.50 to 98,400, average 1,553 -- useful to
know a threshold of 1,000 is near the middle.)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t20-transactions --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "amount, in use: Weight, transfers"

### 5. Condition: amount / is at least / empty box (06.png)
"It already defaulted to 'is at least', which is what I want. Note says this keeps the edges that
pass and the nodes at their ends. Fine -- an account with no big transfer drops out. Type 1000."

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t20-transactions --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "amount, in use: Weight, transfers" --type "1000" --key Enter

### 6. Filter applied (07.png)
"'amount is at least 1000 -- 812 of 3,000 nodes (the full graph)'. Top bar now reads '812 of 3,000
nodes'. That's the answer, I think. But the picture is the same blob as before, and I don't see how
many transfers survived. Let me look at the graph summary."

    timeout 120 node app-b/study.mjs --try .../08.png ... --type "1000" --key Enter --click "Graph"

### 7. Summary, stale (08.png)
"Nodes 812 of 3,000. Edges still 9,113 transfers. Density, components, highest degree 907 -- all
the old numbers. There's a gray strip: '5 readings are for all 3,000 nodes', with a button
'Compute on 812'. So the filter did NOT flow into every count by itself, which is what I asked
for. At least it tells me. Pressing it."

    timeout 120 node app-b/study.mjs --try .../09.png ... --click "Graph" --click "Compute on 812"

### 8. Summary, recomputed (09.png)
"Now: density 0.00214, 4 weak components, average degree 3.47, highest 211, plus clustering,
diameter 12 and so on. But Edges STILL says '9,113 transfers, each a distinct pair'. Average
degree 3.47 times 812 over 2 is about 1,400 transfers, not 9,113. Either the edge line or the
average is wrong. That's exactly the thing that goes into a report wrong. And the drawing never
changed at any point -- same hex blob from the first screen. The task said every drawing should
use only the big transfers, and I can't see that it does. Maybe the blob is binned and just looks
the same, but nothing tells me so."

Stopped here.

## Answer given
812 accounts are left (of 3,000).

## Did I succeed?
Probably, for the account count: 812 shows in three places and agrees. Not sure about the rest:
the edge count never updated, the other readings needed a separate button, and the picture shows
no visible change. I would not tell my manager "every count and drawing uses the filter" from what
I saw.

## Single Ease Question
4 of 7. Building the filter was quick -- four clicks and a number, and "is at least" was already
picked. What took longest was finding out whether it had actually applied: the counts went stale
behind a "Compute on 812" button, the edge total stayed at 9,113, and the drawing looked the same.

## Would I use this instead of my current tool?
Not yet. In Gephi I'd do an edge-weight range filter and watch the graph thin out and the
node/edge counts change together. Here the filter itself is cleaner than Gephi's -- it says plainly
that filters change what is computed and the eye only hides, which Gephi never explains -- but if
the edge count disagrees with the average degree I'm going back to pandas to check, and then I've
got two tools again.

## Problems noticed
- Edges reading stays "9,113 transfers" after the filter and after "Compute on 812", while every
  other reading changed; it contradicts the average degree. (High)
- The drawing shows no visible change after filtering 3,000 accounts down to 812; nothing says
  whether it is drawing the filtered graph. (High)
- The filter changes the node count immediately but leaves the other readings for the full graph
  until a separate "Compute on 812" press; the task asked for every count to follow the filter.
  (Medium -- at least it says so)
- The edge count of the filtered graph (transfers kept) is not shown on the filter step itself;
  only nodes. (Medium)
- The top-bar "Full graph" button jumped to a different panel rather than opening a menu there.
  (Low -- it got me to the right place)
- "amount" appears both in the attribute list and in the filter's picker; a stray click opens the
  column's details instead of choosing it. (Low)
