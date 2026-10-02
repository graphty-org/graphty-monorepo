# Session: why Valjean looks the way he does, and a ranking that changes nothing (Gephi holdout)

Participant: Dr. Mara Lindqvist (persona: the Gephi holdout, expert Gephi user since 0.8).
Task as given: "Valjean is drawn dark brown and large. Work out what makes him dark and large. Then a
ranking you made earlier seems to change nothing when you switch it on -- work out what is going on."
Start screen: shots/tasks/t34/01.png. Renders: tmp/round-7-sessions/t34--gephi-holdout/02.png to 10.png.
All commands run from design/ui/prototype; `OUT` stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t34--gephi-holdout.

## Step 1 -- start screen (01.png)

Think-aloud: "PageRank is selected and there is a legend: Color: PageRank, Size: Degree. So the
dark color is presumably PageRank. But I see no Degree row in the list. Who does the sizing? In
Gephi I would click the node first, so I will."

## Step 2 -- click Valjean (02.png)

    timeout 120 node app-b/study.mjs --try OUT/02.png task:t34 --click "Valjean"

Saw: a "Why this look" list on the right: Notes (Label below), PageRank (Color), Degree in gray
italics (Size), Group 2 (Label above), Selection (Color, Size), Everything (Shape). Status pill:
"Valjean, 36 connections".

Think-aloud: "Oh, that is useful. Gephi has nothing like this; I would be guessing from the
Appearance panel. Color from PageRank, size from Degree. Degree is in italics and is not in the
list on the left -- that must be the '1 hidden row still paints'. Selection says Color and Size,
but that is only because I clicked him."

## Step 3 -- open Degree from the reasons (03.png)

    timeout 120 node app-b/study.mjs --try OUT/03.png task:t34 --click "Valjean" --click "Degree"

Saw: a Degree row now appears in the left list, grayed and italic, with an open eye; footer says
"1 hidden row still paints; it shows dimmed here". Right panel: Degree, measure from the graph,
"Paints 77 nodes", Shape: Size 0.5 to 3.

Think-aloud: "So there IS a Degree ranking, tucked out of the list but still sizing everything.
'Hidden' means hidden from the list, not switched off. That is a strange idea -- in Gephi a
ranking you cannot see is a ranking you forgot about. But fine, part one is answered: dark brown
is PageRank (he has the top value, 0.0754), large is Degree (36, the most)."

## Step 4 -- click Betweenness (04.png)

    timeout 120 node app-b/study.mjs --try OUT/04.png task:t34 --click "Betweenness"

Saw: the Betweenness row highlighted, crossed-out eye; the right panel still shows PageRank.

Think-aloud: "The ranking that does nothing must be Betweenness, with the crossed eye. The row
lit up but the right side still says PageRank. Did it select or not?"

## Step 5 -- hover its eye (05.png)

    timeout 120 node app-b/study.mjs --try OUT/05.png task:t34 --hover "Show Betweenness"

Saw: tooltip "Show Betweenness -- Alt-click or Alt+Space: show only this row".

## Step 6 -- switch Betweenness on (06.png)

    timeout 120 node app-b/study.mjs --try OUT/06.png task:t34 --click "Show Betweenness"

Saw: the eye is open. The canvas and legend are unchanged: still Color: PageRank.

Think-aloud: "Nothing moved. PageRank's panel says 'Covers Louvain for Color', so rows higher up
seem to win. Betweenness is below PageRank, so I bet PageRank covers it too. Let me open
Betweenness and see if it admits that."

## Step 7 -- switch it on, then open it (07.png)

    timeout 120 node app-b/study.mjs --try OUT/07.png task:t34 --click "Show Betweenness" --click "Betweenness"

Saw: row highlighted, eye open, right panel still PageRank.

Think-aloud: "Again. I cannot get Betweenness's own panel. Every time I click it the right side
stays on PageRank."

## Step 8 -- switch it on, then ask Valjean why (08.png)

    timeout 120 node app-b/study.mjs --try OUT/08.png task:t34 --click "Show Betweenness" --click "Valjean"

Saw: the same "Why this look" as step 2. Betweenness is not mentioned, not even as covered. And
the Betweenness eye in the list is crossed out again.

Think-aloud: "So either my switch-on did not stick, or the explanation does not count a row that
loses. If it is covered, I want it in that list, struck through, with who beat it."

## Step 9 -- the control experiment: PageRank off, Betweenness on (09.png)

    timeout 120 node app-b/study.mjs --try OUT/09.png task:t34 --click "Hide PageRank" --click "Show Betweenness"

Saw: PageRank eye crossed, Betweenness eye open. Canvas identical. Legend still "Color: PageRank".

Think-aloud: "PageRank is off and the map is still colored by PageRank, says the legend. Then
these eyes do not touch the canvas at all, and I cannot test anything by toggling. That is the
test I always do, and it fails here."

## Step 10 -- open the table (10.png)

    timeout 120 node app-b/study.mjs --try OUT/10.png task:t34 --click "Table"

Saw: 77 nodes; columns label, group, Degree (full graph), PageRank (full graph), Rank by PageRank,
Betweenness (full graph). Valjean 36 / 0.0754 / 1 / 0.570. A line: "Valjean is first on all three
measures; Gavroche is in the top 3 on all three".

Think-aloud: "The betweenness numbers exist and the header says full graph -- good, that is the
thing Gephi never tells me. So it is not missing data. My best guess is that PageRank covers it:
both paint color and PageRank is higher. But switching PageRank off changed nothing either, and I
never saw a screen that said 'covered by PageRank'. That is a guess, not a finding. I stop here."

## Outcome

- Did I succeed? Half. Part one, yes: dark brown is the PageRank ranking (Valjean has the highest
  PageRank), large is a Degree ranking that is hidden from the list but still sizing nodes; I
  found that through "Why this look". Part two, no: my guess is that PageRank, higher in the list,
  covers Betweenness for color, but I could not confirm it. Betweenness's own panel never opened,
  "Why this look" did not list it, and hiding PageRank did not change the canvas or the legend.
- Single Ease Question: 3 of 7. The first half was a 6; the second half was a dead end.
- Would I use this instead of Gephi? No. "Why this look" and the "(full graph)" column headers are
  things I have wanted for ten years, and they earn a second session. But a visibility toggle that
  does not change the picture, and a row whose panel I cannot open, mean I cannot run my own
  experiment to check what the tool claims -- and a "hidden" row that keeps painting is exactly the
  kind of invisible default I do not trust in a figure. I'd stay on Gephi.

## Problems seen

1. Clicking the Betweenness row highlights it but the right panel keeps showing PageRank (04, 07).
2. Toggling eyes changes nothing on the canvas or the legend, even with PageRank switched off (06, 09).
3. "Why this look" lists only the winning rows; a switched-on but covered row is not mentioned (08).
4. After switching Betweenness on and clicking a node, its eye shows crossed out again (08).
5. "Hidden row still paints" overloads "hidden": hidden from the list vs switched off (01, 03).
