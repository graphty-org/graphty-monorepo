# Session r2-s53 -- Dana Okafor (supply chain risk analyst), task T8 "Circles of characters"

Dataset: Les Miserables sample. Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s53 empty` -> 01.png

Saw: a dark start page. "Open project or file...", "New from data...", recent projects (empty),
and a "Samples" column with Les Miserables (77 characters) at the top, "Good for a first look at
communities and who holds the story together." A usage-data banner at the bottom. The grey
description text is small and low contrast -- I had to lean in.

Next: say "No thanks" to the usage data (supplier data, no thank you), then open Les Miserables.

## Step 2 -- decline usage data, open the sample

Command: `--step ... --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: a network of blue dots and grey lines -- the hairball I expected, no names on any dot. Right
panel says Nodes 77, Edges 254, Density, Components 1. Left panel: a search box, "Selection",
"Everything". Bottom-left hint: "Analyze [flask] in the toolbar (Shift+A) to add results here".
At the bottom of the drawing there is a small toolbar: a flask, a chart-ish icon, "3D", a
magnifier. Nothing says "groups" or "circles" anywhere I can see.

Hesitation: "Components 1" -- is a component a circle? Probably not, it says only one.

Next: the hint names the flask as "Analyze", so I click the flask.

## Step 3 -- open Analyze

Command: `--step ... --click-at 679,864` (the flask; the tool says button "Analyze") -> 03.png

Saw: a popup list, "Filter analyses" box at top, heading "Rank nodes and edges": Degree,
Betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS... Each has a one-line
explanation, which I appreciate, but these are all rankings. I am not after a ranking, I want the
groups. The list scrolls further down.

Next: rather than scroll a list of jargon, I type "group" in the filter box.

## Step 4 -- filter for "group"

Command: `--step ... --type "group"` -> 04.png

Saw: heading "Find groups". Louvain ("Start here", "Which nodes form densely linked groups"),
Leiden, Label propagation, Girvan-Newman, Markov, Spectral, Hierarchical. Seven ways to do the
same thing is too many for me, but "Start here" settles it -- I take the one the tool recommends.
The grey explanation lines are tiny.

Next: click Louvain.

## Step 5 -- Louvain settings

Command: `--step ... --click "Louvain"` -> 05.png

Saw: a small form: "Resolution 1", "Advanced" folded, "Under a second", a blue Run button. I do
not know what resolution means here and will not touch it. Good that it tells me how long it takes.

Next: click Run.

## Step 6 -- Run

Command: `--step ... --click "Run"` -> 06.png

Saw: dots are now colored. The left panel has "Communities 6" with Group 1 (20), Group 2 (17),
Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8) -- a table with counts, that I can read.
A color key floats top-left of the drawing. So: six circles, the largest is Group 1 with 20.
Groups are sorted biggest first, which helps. Parts one and two done.

Still no names on any dot. For three characters I click "Group 1" in the list and hope it shows
me who is in it.

## Step 7 -- click Group 1

Command: `--step ... --click "Group 1"` (tool: matched the list row) -> 07.png

Saw: Group 1 is highlighted in the list, with an eye icon. The right panel switched to "Group 1,
from Communities, Oct 7", Style tab open, showing its fill color E69F00. That is not what I asked
for -- I wanted the names. The dots on the drawing did not change and nothing is labelled.

Hesitation: why would clicking a group open its paint color? I expected a member list.

Next: the right panel has a "Values" tab next to Style. Tables are where I live, try that.

## Step 8 -- Values tab

Command: `--step ... --click "Values"` -> 08.png

Saw: Summary: Size 20, Made by Communities. Members, "First 10": MlleBaptistine, MmeMagloire,
Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois. That is the
list I wanted. Part three done. Note: Valjean is in it; the names look run-together
("MlleBaptistine", "MmeDeR") -- that is the data, fine.

Hesitation: "First 10" -- where are the other 10? I did not see a "show all", but I only needed
three.

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s53`

## Answer (in character)

The program found 6 circles (it calls them "Communities", listed as Group 1 to Group 6). The
largest is Group 1 with 20 characters. Three of them: Valjean, Fauchelevent, Marguerite
(also MlleBaptistine, MmeMagloire, ...).

## Wrap-up (Dana, in character)

- Finished: yes, in seven steps after the start page.
- Ease: 6 out of 7. Typing "group" in the Analyze filter took me straight to "Find groups", and
  "Start here" on Louvain meant I did not have to know what Louvain is. The left-panel table of
  groups with counts, sorted biggest first, answered two of the three questions in one look.
- What confused me:
    - Nothing on the main screen says "groups" -- I had to know the flask is "Analyze" (the bottom-left
      hint saved me) and then guess a word to filter by. The unfiltered list opens on rankings
      (Degree, Betweenness, Katz, HITS...), which is the jargon I skip.
    - Clicking a group opened its paint color (Style tab), not who is in it. The members were one
      more click away on "Values". I would expect the member list first.
    - "First 10" with no visible way to see all 20; for a report I would need the full list, and an
      export to Excel.
    - No names on the dots, so the drawing itself tells me nothing; the color key floating over the
      top-left of the drawing covers part of the network.
    - Seven grouping methods with no hint why I would choose one over another; "Resolution" means
      nothing to me. And would I get the same 6 groups if I ran it again? I did not check.
    - Small grey description text throughout is hard for me to read.
- So what for my job: the grouping was quick and readable. Whether it means anything on my
  supplier data, where Tier 2 links are mostly missing, is another question.
