# Session r3-s43 -- Grace (nonprofit operations analyst), task T7 prompt B (running club)

Prompt: "A friend's list of who in your running club knows whom is already drawn in it. Have the
program put the people in order of how much the whole club depends on them, and tell us the top
three, in order, and what the order was based on."

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s43 setup:rounds/round-3/setups/T7-B.txt`
Screenshot: 01.png

Saw: a drawing of 20 blue dots with arrows, no names on them. Right panel says Nodes 20, Edges 41,
Directed, Density, Components 1, "Edges per node 3 to 6, mean 4.1". Left panel: a find box,
"Selection", "Everything", and at the bottom "Analyze (flask) in the toolbar (Shift+A) to add
results here". Toolbar at the bottom: flask, a chart icon, 3D, magnifier.
Thought (Grace): 20 people, 41 rows, matches the friend's list. No names on the dots, which
bothers me. The hint at the bottom says "Analyze" adds results -- that sounds like where ranking
would be. I'll click the flask.

## Step 2 -- open Analyze

Command: `--step --click "Analyze"`
Screenshot: 02.png

Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first
order (grayed, "Select a node first"), Most flow... Each has a one-line description.
Hesitated: lots of words I do not know (Katz, HITS, Eigenvector). None says "who the club depends
on". Betweenness ("sit on the most shortest paths between others") and PageRank ("connected to
other well-connected nodes") both sound plausible. The program marks PageRank "Start here", and I
am new, so I'll trust that.

## Step 3 -- PageRank settings

Command: `--step --click "PageRank"`
Screenshot: 03.png

Saw: a PageRank panel: "Damping factor 0.85", "Weight None", "Advanced", "Under a second", Run.
Hesitated briefly on "Damping factor" -- no idea what it is, so I leave the defaults. Weight None
is fine; the friend's list is just who knows whom. Clicking Run.

## Step 4 -- Run

Command: `--step --click "Run"`
Screenshot: 04.png

Saw: the dots turned orange-to-dark-brown, a key at top left "Color: PageRank 0.04382 ... 0.06608",
and the left panel now has a row "PageRank 20". Still no names on any dot, and no list.
Thought: I can see a few darker dots near the bottom, but I need names in order. The "PageRank 20"
row on the left looks like it might open the list. Clicking it.

## Step 5 -- click the PageRank result row

Command: `--step --click "PageRank"`
Screenshot: 05.png

Saw: the row is highlighted; the right panel changed to "PageRank -- Measure from PageRank, Oct 7"
with a Style tab open (Fill, Color: PageRank, Shape, Effects, Label, Tooltip). Still no list.
Thought: this is about how it looks, not the order. There is a "Values" tab next to Style --
that sounds like the numbers per person. Clicking Values.

## Step 6 -- Values tab

Command: `--step --click "Values"`
Screenshot: 06.png

Saw: a "Values" bar chart (0.04382 to 0.06608, "20 of 20 have a value", median 0.04736), then
"Top 10" with names: Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575, Gus 0.0547, Jada
0.0483, Theo 0.04826, Sana 0.04806, Ravi 0.04785, Quinn 0.04758. Then "Made with: Analysis
PageRank, Ran Oct 7, Damping factor 0.85, Weight None".
Thought: there's my list, with names. 20 of 20 have a value, so everyone is counted. I'm done.

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s43`

## Answer (in character)

Top three, in order: 1. Farah (0.06608), 2. Ava (0.06423), 3. Hana (0.05883).
The order was based on PageRank -- the program describes it as "which nodes are connected to
other well-connected nodes" -- with its default settings (damping factor 0.85, no weight).

Did I finish? Yes, in 5 steps.

Ease: 5 of 7.

What confused me:

- The Analyze list is a wall of technical names (Betweenness, Closeness, Eigenvector, Katz, HITS).
  Nothing said "who the club depends on" or "most connected" in plain words. I picked PageRank
  only because it was tagged "Start here"; I am not sure it is the right measure for "the whole
  club depends on them" -- Betweenness ("sit on the most shortest paths between others") might
  have been the better fit, and nothing helped me choose between them.
- After Run, the dots only changed color. There were no names on the dots and no list appeared;
  I had to guess that clicking the "PageRank 20" row and then the "Values" tab would show the
  ranking. The list should appear where I can see it right after Run.
- Clicking the result row opened "Style" first (fill, shape, effects), which is not what I wanted.
- The numbers (0.06608) mean nothing to me and I could not explain them to a board; a rank
  (1st, 2nd, 3rd) or a plain-words note would help.
- "Damping factor" is jargon; I left it alone.
- I liked "Local only" at the top -- it suggests my data stays on my computer.
