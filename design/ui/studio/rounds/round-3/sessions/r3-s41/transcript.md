# Session r3-s41 -- Elena, task T7 prompt B (running club)

Participant: Elena, product manager, first time with this app. Start: the running club list
(friends.csv) already drawn.

Task as read: "Have the program put the people in order of how much the whole club depends on
them, and tell us the top three, in order, and what the order was based on."

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s41 setup:rounds/round-3/setups/T7-B.txt`
(The task's `setup:T7-B.txt` was not found from the studio folder; the round-3 setups folder held it.)

Screen (01.png): a drawing of about 20 blue dots with arrows. Left: a search box, "Selection",
"Everything". Right: "Graph -- From friends.csv", Overview: Nodes 20, Edges 41, Directed, Density
0.1079, Components 1, Edges per node 3 to 6. Bottom: a small toolbar with a flask, a chart icon,
"3D" and a magnifier. Bottom left says "Analyze (flask) in the toolbar (Shift+A) to add results here".

Elena: "OK, there's my club. No names on the dots though. Twenty people, 41... connections, I
guess. The little note at the bottom left says Analyze is the flask. 'Analyze' sounds like what I
want -- let me click the flask."

## Step 1 -- click the dot in the middle-left

Elena (before): "Who's this one in the middle? Let me just click it."

Command: `--step ... --click-at 640,578` -> "node with id Ava"

Screen (02.png): the dot turns brownish with a yellow ring. Right panel now says "Ava -- Node",
Summary: id Ava, Degree 6 (with a little arrow). Selection shows 1.

Elena: "Ava. Degree 6 -- I guess six friends? She's in the middle so she's probably the one
everybody depends on." (A guess from position; she has not checked anyone else.) "But it wants me
to have the program put them in order. That's the Analyze flask. Clicking it."

## Step 2 -- open Analyze

Command: `--step ... --click-at 680,864` -> button "Analyze"

Screen (03.png): a list pops up over the drawing: "Filter analyses", heading "Rank nodes and
edges", then Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here"
tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most flow... each with a grey
line under it.

Elena: "Oof. That's a lot of words. Betweenness, Katz, HITS... 'Rank nodes' -- ranking is what I
want, so I'm in the right place. I don't know which one means 'the club depends on them'. The
grey lines are tiny. But PageRank says 'Start here' -- fine, I'll take the one it recommends,
like Google." (Hesitated here about 20 seconds reading; did not compare Betweenness's line.)

## Step 3 -- choose PageRank

Command: `--step ... --click-at 556,600` -> option "PageRank Start here ..."

Screen (04.png): the box shrinks to a PageRank form: "Which nodes are connected to other
well-connected nodes.", Damping factor 0.85, Weight None, "Advanced", "Under a second", blue Run.

Elena: "Damping factor? No idea. I'm not touching that. 'Under a second' -- good. Run."

## Step 4 -- Run

Command: `--step ... --click Run`

Screen (05.png): everything turned orange in different shades. Top left of the drawing: "Color:
PageRank 0.04382 [orange bar] 0.06608". Left list has a new row "PageRank 20". Right panel for Ava:
"Results -- PageRank 0.06423, #2 of 20".

Elena: "Ooh, it colored them all. So darker is more? Or lighter? The bar goes light orange to dark
brown... Ava is number 2 of 20 -- so I was almost right, the middle one is important. But who's
number 1? I need a list, not twenty shades of orange. There's a 'PageRank 20' row on the left --
maybe that's the list."

## Step 5 -- click "PageRank" in the left list

Command: `--step ... --click-at 155,156` -> treeitem "PageRank"

Screen (06.png): the row is highlighted. The right panel switched to "PageRank -- Measure from
PageRank, Oct 7" on a Style tab: Nodes / Edges, Fill, Color: PageRank, Shape, Effects, Label,
Tooltip with plus signs.

Elena: "Hmm, that's colors and shapes settings. Not what I want. There's a 'Values' tab next to
Style -- values sounds like numbers. Trying that." (Small dead end.)

## Step 6 -- Values tab

Command: `--step ... --click-at 1273,104` -> tab "Values"

Screen (07.png): right panel now shows a little bar strip "0.04382 ... 0.06608, 20 of 20 have a
value, median 0.04736", then "Top 10": Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575,
Gus 0.0547, Jada 0.0483, Theo 0.04826, Sana 0.04806, Ravi 0.04785, Quinn 0.04758. Below: "Made
with -- Analysis PageRank, Ran Oct 7, Damping factor 0.85, Weight None".

Elena: "There it is -- Top 10. Farah, Ava, Hana. That's my answer. The numbers are all tiny,
0.066 versus 0.064 -- I couldn't tell you if that's a big difference, Farah and Ava are basically
tied. Whatever. It's based on PageRank, which it said means 'connected to other well-connected
people'. Is that the same as the club depending on them? Kind of? It's the one it told me to
start with, so I'll go with it."

Stopped here: she has her top three and a name for what it is based on.

Command: `--end`

## Debrief (in character)

- **Did I finish?** Yes, I think so. Top three, in order: Farah, Ava, Hana. The order was based on
  PageRank -- the program described it as "which people are connected to other well-connected
  people" (scores about 0.066, 0.064 and 0.059).
- **Ease: 5 of 7.** Getting to the list took about six clicks and only one wrong turn.
- **What confused me:**
    - The Analyze list is a wall of words I don't know (Betweenness, Eigenvector, Katz, HITS). I
      picked PageRank only because it said "Start here". I'm honestly not sure it's the one that
      means "the club depends on them" -- one of the others might have been closer, but I couldn't
      tell from the grey lines and I wasn't going to try them all.
    - After it ran, the drawing just turned shades of orange with a scale of 0.04 to 0.07. I couldn't
      tell who was first from the colors. No names on the dots either.
    - Clicking the PageRank row on the left took me to color and shape settings, not the ranking.
      The list was on the second tab, "Values" -- I found it because "values" sounded like numbers.
    - The scores have no unit or meaning I can say out loud. "0.066 -- is that a lot?" Farah and Ava
      look basically tied.
    - Damping factor sitting right there before Run made me nervous; I left it alone.
