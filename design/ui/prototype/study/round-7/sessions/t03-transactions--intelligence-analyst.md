# Session: find money rings in one month of transfers -- intelligence analyst (Marcus)

Task as given: "Do the accounts fall into rings that send money mostly among themselves? Get
graphty to pick them out, then say how many there are and how big the largest few are."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t03-transactions--intelligence-analyst/.

## Step 1 -- the start screen (shots/tasks/t03-transactions/01.png)

Think-aloud: "OK. Transfers, March 2026. Three thousand accounts, nine thousand transfers. Big
gray blob of hexagons -- that's the hairball, like I figured. 'Local only' up top, good, I'll
take that at its word for now. Right side has a summary. 'Weak components 1' -- so it's all one
piece, everybody touches everybody somehow. 'Reciprocity 0'? Nobody ever sends money back to
whoever sent it to them? Odd for rings, but fine, rings go A to B to C to A, not back and forth.
What I want is 'find the groups'. Left side says 'Analyze (Shift+A) to add results here.' That's
the only thing that sounds like doing something. Click it."

## Step 2 -- open Analyze

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/02.png task:t03-transactions --click "Analyze"

Saw: a popup list. Recent: Louvain, PageRank, Shortest path. Then "Rank nodes and edges":
PageRank, Links (count), Links in, Links out, Total amount, Total amount in.

Think-aloud: "Louvain. Never heard of it. But the line under it says 'Which nodes form densely
connected groups.' That's the closest thing to 'find the rings'. Good that it says what it does
in English -- I'd have skipped it on the name alone. Why is it under 'Recent' when I've never
run anything? Whatever. Click it."

## Step 3 -- pick Louvain

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/03.png task:t03-transactions --click "Analyze" --click "Louvain"

Saw: settings. Weight: amount (loaded weight). Higher means: Stronger / Farther / Capacity.
Direction: Follow / Ignore. Resolution: 1.0. "Under a second". Run.

Think-aloud: "Weight by amount, bigger amount means stronger tie -- that's right for money.
Direction follow, sure. Resolution 1.0 -- no idea what that does, and there's nothing telling me.
Leaving it. Under a second, good. Run."

## Step 4 -- Run

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/04.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run"

Saw: a dark box: "Would add Louvain at the top of the list, running". The settings stayed open.
The chart did not change. The left panel still said "Analyze ... to add results here."

Think-aloud: "'Would add'? Would? Did it or didn't it? Nothing got colored. Nothing in the list
on the left. Nothing tells me how many groups. Maybe it's still going. Close this and look."

## Step 5 -- close the popup

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/05.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --key Escape

Saw: Escape took me back to the Analyze list, not out of it. Same "Would add" box still showing.
Chart unchanged.

Think-aloud: "Back to the menu. Still no groups."

## Step 6 -- close everything, open the table to look for a group column

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/06.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --key Escape --key Escape --click "Table"

Saw: the accounts table. Columns: id, Links in, Links out, Links total, kind, country. Sorted by
total links. The top rows all have 0 links in and 11-15 out. No group column. Chart still gray.
Left panel still empty.

Think-aloud: "If it found groups there'd be a group number on each account. There isn't. So the
Run did nothing, or it put the answer somewhere I can't see. That's two strikes. Interesting
though -- these top accounts only send, never receive. That's a pattern I'd chase, but it's not
what I was asked."

## Step 7 -- try the Assistant

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/07.png task:t03-transactions --click "Assistant"

Saw: "Assistant. Off. Nothing is sent. Turn on in Settings."

Think-aloud: "Good. Off, and it says nothing is sent. That's the right default. I'm not turning
on an AI thing with transfer data in it, so that's a dead end for me, by choice."

## Step 8 -- run Louvain, then try to get back to the Graph panel

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/08.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --click "Graph"

Saw: "nothing on screen is called 'Graph'" -- the popup was in the way.

Think-aloud: "Can't get out of the popup without backing all the way out. Fine."

## Step 9 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/09.png task:t03-transactions --click "4 more readings not computed"

Saw: a menu dropped down from the top right: Select all visible, Invert selection, Reselect
previous, Fit, Re-run layout, Reshuffle layout seed, Unpin all, Compute the overview, Add node...,
Add note, Clear graph data.

Think-aloud: "I clicked a link that said four readings weren't computed and I got a menu of ten
unrelated things. 'Compute the overview' I guess is it. Maybe one of the readings is the groups."

## Step 10 -- Compute the overview

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t03-transactions--intelligence-analyst/10.png task:t03-transactions --click "4 more readings not computed" --click "Compute the overview"

Saw: the right panel now says "Co-appearances, Graph from miserables.gexf". Nodes 77, Edges 254,
Undirected, average clustering 0.573, diameter 5, and "1 note". The title bar still says
"Transfers, March 2026". The chart is the same 3,000-account blob.

Think-aloud: "Hold on. Seventy-seven nodes? Two hundred fifty-four edges? I've got three
thousand accounts on the screen and the title says Transfers. The side panel is now describing
some other file -- 'miserables'? -- that I never loaded. Which one's lying? I can't put a number
from this thing in front of a sergeant if the panel can switch to a different dataset when I ask
it to compute something. That's it. I'm done."

## Outcome

Gave up. I did not get the groups. I can't say how many rings there are or how big the largest
ones are.

- Succeeded? No. Ran the group finder (Louvain) with the money amounts as the weight; the only
  thing it gave back was a box saying it "would add" it. No group number on any account, no
  colors, no count, no sizes.
- Single Ease Question: 2 out of 7. Finding the right tool was easy because of the one-line
  description. Getting an answer out of it never happened, and then the summary panel switched
  to a different dataset.
- Would I use this instead of i2 and Excel? No, not today. Things I liked: "Local only" in the
  top bar, the Assistant being off with "Nothing is sent", and an algorithm list that says in
  plain English what each one does. Things that ended it: Run gave me "would add ... running"
  and nothing else, so I couldn't tell if it worked; the "4 more readings not computed" link
  opened an unrelated menu; and "Compute the overview" made the side panel describe a 77-node
  file called miserables while the chart and title still said Transfers. Once a panel's numbers
  disagree with what's on screen, I can't trust any number in the tool, and I'd be the one
  cross-examined on it.
