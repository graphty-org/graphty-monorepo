# Session r2-s32 -- Elena, task T9 prompt B (Florentine families)

Task: open the ready-made Florentine families network, make the dots bigger for the families the network depends on most, then say what sizes and colors mean.

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s32 empty`
Saw (01.png): a dark start page. "Start" with Open project or file / New from data on the left, "Recent projects" empty, and "Samples" on the right: Les Miserables, Zachary's karate club, College football, Florentine families (15 families). A box at the bottom asks to share usage data.
Elena: "OK, there it is -- Florentine families, right in the samples list. I'll say no thanks to the data thing and open that one."

## Step 2

Command: `--step --click "No thanks" --click "Florentine families"`
Saw (02.png): 15 blue dots joined by grey lines on a light canvas, no names on them. Right panel "Graph / From Florentine families", Style and Values tabs, Overview: Nodes 15, Edges 20, Density 0.1905, Components 1. Left panel: a search box, Selection, Everything; at the bottom "Analyze (flask) in the toolbar (Shift+A) to add results here". A toolbar at the bottom of the canvas with a flask, a chart icon, "3D" and a magnifier.
Elena: "Ooh, OK, it's small, that's nice. The dot at the top left already looks bigger -- is that the important family? No names though. Let me click it and see who it is."

## Step 3

Command: `--step --click-at 531,83`
Saw (03.png): the dot is now ringed in yellow. Right panel: "Pazzi -- Node", Summary: id Pazzi, name Pazzi, Degree 1. Left panel: Selection 1.
Elena: "Pazzi. Degree 1 -- only one line, so it's NOT important, it just looked big because it's near the front, I guess. OK. I want the dots to get bigger for the important ones. There's a 'Style' tab up there -- sizes sound like style. Let me look."
(Hesitation: she misread size at first; the dot only looked big from perspective.)

## Step 4

Command: `--step --click "Style"`
Saw (04.png): Style tab for Pazzi: Fill +, Shape +, Effects +, Label +, Tooltip +, and "Why this look: Node defaults (Color, Size, Shape)".
Elena: "Hmm, this is all about Pazzi only. I don't want to make one dot bigger by hand -- I want the program to do it for the ones that matter. Let me click off the dot on the blank part and see if Style is for everything then."

## Step 5

Command: `--step --click-at 1000,700`
Saw (05.png): back to the Graph overview (Values tab). Style is there too, for the whole graph now.
Elena: "OK, back to the whole thing. Style for the graph -- let's see."

## Step 6

Command: `--step --click "Style"`
Saw (06.png): graph Style: Canvas Background F5F5F5, Method "Force - Recommended" with a paragraph, Shape 3D/2D, Spring length 30, Gravity -1.2, Advanced, "Applied". Nothing about dot size.
Elena: "Spring length, gravity... no. That's how it's laid out, not sizes. Not here. (dead end 1) There's a note at the bottom left: 'Analyze ... in the toolbar to add results here'. The flask thing at the bottom. 'Which families the network depends on' sounds like analysis. Let me click the flask."

## Step 7

Command: `--step --click-at 680,864` (the flask in the bottom toolbar)
Saw (07.png): a pop-up list "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (greyed, "Select a node first"), Most flow...
Elena: "Whoa, a lot of words. Betweenness, Eigenvector, Katz... I don't know these. 'Which nodes sit on the most shortest paths'? No idea. But PageRank says 'Start here' -- that's Google, right? Importance. I'll take the one it tells me to."
(Hesitation: long list of unfamiliar names; the "Start here" tag decided it for her.)

## Step 8

Command: `--step --click "PageRank"`
Saw (08.png): a PageRank box: "Which nodes are connected to other well-connected nodes.", Damping factor 0.85, Weight None, Advanced, "Under a second", blue Run button.
Elena: "Damping factor -- leave it. It says under a second. Run."

## Step 9

Command: `--step --click "Run"`
Saw (09.png): all dots turned orange, from light orange to almost black-brown; the middle dot is darkest. A box top left of the canvas: "Color: Influence 0.03066 [orange bar] 0.1458". The left panel has a new row "Influence 15". The dots are all the same size still. (The legend box now sits where the Pazzi dot was; that dot is hidden behind it.)
Elena: "Ooh, it colored them. Dark one in the middle is the most... influential, I guess. But the dots didn't get bigger -- I wanted size, not color. There's an 'Influence' row on the left now, maybe I can change it there."

## Step 10

Command: `--step --click "Influence"`
Saw (10.png): Influence row highlighted with an eye icon. Right panel now "Influence -- Measure from Influence, Oct 7", Style tab with Nodes/Edges; Fill: Color = Influence (with a minus); Shape +, Effects +, Label +, Tooltip +.
Elena: "OK, so Color is set to Influence here. There's no 'Size'... maybe it's under Shape? Size is kind of shape. Let me press the plus by Shape."
(Hesitation: no row literally called Size.)

## Step 11

Command: `--step --click-at 1420,234` (the + beside Shape)
Saw (11.png): a small menu under Shape's plus: "Size" (highlighted) and "Shape".
Elena: "There it is -- Size. Click."

## Step 12

Command: `--step --click "Size"`
Saw (12.png): a new row "Size" with a number box "1", a chain-link icon and a minus. Dots unchanged.
Elena: "Hmm, it's just a number, 1. If I type 3 they'd ALL get bigger, that's not it. The Color row says 'Influence', this one says '1'. That little chain icon next to it -- maybe that hooks it to something? Let me point at it first."

## Step 13

Command: `--step --hover-at 1381,264` (the chain icon beside Size)
Saw (13.png): tooltip "Size by attribute".
Elena: "'Size by attribute'. Attribute... whatever that is, 'size by' something is what I want. Click it."

## Step 14

Command: `--step --click-at 1381,264`
Saw (14.png): a pop-up "Size by attribute" with a search box and a list: under "Influence": Influence, Influence rank, Influence percentile; then "Cannot be used: Holds groups, not amounts" with id and name greyed.
Elena: "Influence -- same as the color. Pick that."

## Step 15

Command: `--step --click-at 1193,372` (Influence in the Size by attribute list)
Saw (15.png): the dots now differ in size. The middle one is much bigger and darkest; a couple of others are medium; the ones at the edges are small and light. Size row reads "1 to 3". Legend box now has two rows: "Size: Influence 0.03066 -- 0.1458" (a grey wedge) and "Color: Influence 0.03066 -- 0.1458".
Elena: "Ooh, there we go! The big dark one in the middle is the one everybody depends on. That part's done. Who IS that? Let me click it."
PART 1 DONE (dots sized by the program's importance measure).

## Step 16

Command: `--step --click-at 700,378`
Saw (16.png): the big dot ringed in yellow. Right panel: "Medici -- Node", Summary: id Medici, name Medici, Results: Influence 0.1458, #1 of 15; Degree 6.
Elena: "The Medici! Number 1 of 15. Makes sense, even I've heard of them. 0.1458 -- is that a lot? I don't know, but '#1 of 15' I understand. Before I answer what the sizes mean, let me see if 'Influence' explains itself -- I'll point at it."

## Step 17

Command: `--step --hover-at 1257,268` (the word Influence in the node panel)
Saw (17.png): nothing new; no tooltip on Influence.
Elena: "No explanation there. Maybe the little box on the drawing, 'Size: Influence'?"

## Step 18

Command: `--step --hover-at 345,64` (the "Size: Influence" legend title)
Saw (18.png): no tooltip on the legend either.
Elena: "No explanation. Fine -- I picked PageRank and it said 'which ones are connected to other well-connected ones', and what came out is called 'Influence'. I think I've got it. Done."
PART 2 DONE (answer below).

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s32`

## In character, at the end

**Did I finish?** Yes. The dots are now sized (and colored) by how important each family is to the network.

**What the sizes and colors stand for:** Both the size and the color show the same thing, "Influence" -- the score the program worked out when I ran PageRank, which it described as "which families are connected to other well-connected families". Bigger and darker = more influential. The Medici are the biggest and darkest, #1 of 15 (0.1458); the small pale ones at the edges (like Pazzi, with just one marriage) matter least. The numbers in the little legend box go from 0.03066 (smallest, lightest) to 0.1458 (biggest, darkest). I couldn't tell you what 0.1458 means on its own, but "#1 of 15" I get.

**How easy, 1 (very difficult) to 7 (very easy):** 5.

**What confused me / where I hesitated:**

- At first a dot looked bigger than the rest (Pazzi, top left) and I thought it was the important one -- it only had one line. It just looked big because of the 3D.
- I went to the Style tab first because "size" sounds like style, but for the whole graph it was only background and layout settings (spring length, gravity). Dead end.
- The Analyze list is a wall of words I don't know (Betweenness, Eigenvector, Katz, HITS). I only picked PageRank because it said "Start here". The task said "depends on most" and I'm not sure PageRank is the one that means that -- I just trusted the tag.
- Running it only changed the color, not the size. I had to find size myself: click "Influence" on the left, then the plus next to "Shape" (size was hidden under Shape), then a chain icon whose tooltip said "Size by attribute". "Attribute" is not my word, and the chain icon gave no hint until I pointed at it.
- After running, the thing is called "Influence", not "PageRank", so I had to guess they're the same.
- The legend box on the drawing covered one of the dots (Pazzi) after the analysis.
- Nothing explains what "Influence" or 0.1458 means when I point at it.
