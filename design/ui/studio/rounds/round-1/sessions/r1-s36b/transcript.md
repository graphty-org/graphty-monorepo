# Session r1-s36b -- Grace, task T7 prompt B (running club, friends.csv)

Participant: Grace, operations and data coordinator at a small nonprofit. First time using this
program. Prompt: "A friend's list of who in your running club knows whom is already drawn in it.
Have the program put the people in order of how much the whole club depends on them, and tell us
the top three, in order, and what the order was based on."

Start: setup (No thanks; Open project or file...; upload friends.csv), hidden from the participant.

Tool note (not part of the think-aloud): the session waited about 40 minutes for a free browser
slot before the start ran, because every one of the four shared slots was held by other sessions.

## Steps

### 01.png -- the start

Command: `node tool/real.mjs --start rounds/round-1/sessions/r1-s36b setup:rounds/round-1/sessions/r1-s36b/setup.txt`

What I saw: a drawing of blue dots joined by arrows. On the right, "Graph, From friends.csv" with
Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per node "3 to 6, mean
4.1". Bottom left: "Analyze (Shift+A) to add results here". A small toolbar at the bottom middle
with a flask icon. "Local only" at the top, which reassures me nothing is uploaded.

Think-aloud: "OK, 20 people and 41 lines -- that matches what a 41-row list would be. There are no
names on the dots, which is a pity. I need the program to rank people. The bottom left says
'Analyze ... to add results here', and the flask looks like the analyze button. I'll try that."

### 02.png -- the analysis list

Command: `--step ... --click-at 659,864` (printed: button "Analyze")

What I saw: a popup with a filter box and a heading "Rank nodes and edges": Degree, Betweenness,
Edge betweenness, Closeness, PageRank (with a "Start here" badge), Eigenvector, Katz, HITS,
All-pairs distance, and more below. Each has a one-line description.

Think-aloud: "This is a lot of jargon. 'Betweenness', 'Eigenvector', 'Katz' -- I don't know these.
The descriptions help a bit. 'Start here' on PageRank pulls me in. But the question is how much the
whole club DEPENDS on someone. Betweenness says 'which nodes sit on the most shortest paths between
others' -- that sounds like the people who hold the club together. I'm torn. I'll look at the
recommended one first."

Hesitation: about 30 seconds of reading descriptions; unsure which one matches "depends on".

### 03.png -- PageRank opened

Command: `--step ... --click "PageRank"` (printed: the drawing is still moving)

What I saw: a PageRank panel, "Which nodes are connected to other well-connected nodes.", a
"Damping factor" box with 0.85, "Under a second", and a Run button.

Think-aloud: "'Damping factor' -- no idea, I'd leave it. But 'connected to well-connected people'
is about popularity, not about the club depending on them. I think the other one fits better. I'll
go back."

### 04.png -- back to the list

Command: `--step ... --click-at 486,719` (printed: button "Back to analyses")

### 05.png -- Betweenness opened

Command: `--step ... --click "Betweenness"`

What I saw: "Betweenness. Which nodes sit on the most shortest paths between others. Under a
second. Run." No settings to fill in, which I liked.

### 06.png -- after Run

Command: `--step ... --click "Run"`

What I saw: all the dots turned orange, two of them dark brown. A key at the top left: "Color:
Bridges, 2.583 to 51.27". In the left panel a new row "Bridges" with an orange bar and 20.

Think-aloud: "It did something -- the darker ones must matter most. But it's called 'Bridges' now,
not 'Betweenness'. I assume that's the same thing in plainer words. I still can't see who is who.
I need a list. Let me click 'Bridges' on the left."

Hesitation: the name change from "Betweenness" to "Bridges" made me double-check it was my result.

### 07.png -- the result

Command: `--step ... --click "Bridges"`

What I saw: the right panel became "Bridges, Measure from Bridges, Oct 6". A "Values" section with
a row of bars (all the same height, which told me nothing), "2.583 to 51.27", "20 of 20 have a
value ... median 11.2". Then "Top 10": Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, Jada 16.1,
Theo 15.71, Ravi 14.28, Lena 13.37, Quinn 12.55, Hana 11.95. "Made with: Analysis Bridges, Ran
Oct 6".

Think-aloud: "There it is: a ranked list with names. Ava first, by a good margin, then Ivan, then
Sana. All 20 have a value, so nobody was dropped. I'd want to paste this whole list into Excel, but
for the question I have my answer."

### End

Command: `node tool/real.mjs --end rounds/round-1/sessions/r1-s36b`

## In character, at the end

**Answer:** 1. Ava (51.27), 2. Ivan (40.02), 3. Sana (21.35). The order is based on "Bridges"
(listed in the menu as "Betweenness"): how often a person sits on the shortest paths between other
people in the club, so the club leans on them to connect everyone else.

**Did I finish?** Yes.

**How hard (1-7, 7 hardest):** 3.

**What confused me:**

- The list of analyses is mostly jargon (Betweenness, Eigenvector, Katz, HITS, Damping factor).
  The one-line descriptions saved me, but I had to translate "the club depends on them" into
  "sits on shortest paths between others" myself.
- "Start here" on PageRank nearly sent me the wrong way; its description is about popularity, not
  dependence.
- I picked "Betweenness" but the result was called "Bridges". Plainer, but I had to check it was
  the same thing; one name in both places would be better.
- No names on the dots, so the colored drawing alone could not answer the question; I only got
  names after clicking the result row on the left.
- The bar chart under "Values" showed bars all the same height, which told me nothing.
- I would want a way to copy the whole ranked list into Excel; I did not look for one.
