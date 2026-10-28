# Session r3-s30 -- Jordan (marketing network analyst), task T9 prompt B (Florentine families)

Task as given: practice on the ready-made network of the leading families of Renaissance Florence
and the marriages between them. Make the drawing show which families the network depends on most:
the more it depends on a family, the bigger that family's dot. Then say what the sizes and the
colors on the drawing now stand for.

Start: empty app.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s30 empty` -> 01.png

Saw: a start page. "Local only" top right, "Files are read on this computer and never uploaded" -- good, that answers my laptop question before I even ask. Samples on the right, Florentine families is listed ("Good for finding who brokers between groups"). A usage-data banner at the bottom.

## Step 2 -- dismiss the banner, open the Florentine sample

Thinking: "I'm not sharing usage data on a work laptop. No thanks. Then the Florentine sample -- that's the one I'm told to use."

Command: `--step --click "No thanks" --click "Florentine families"`
-> 02.png

Saw: 15 blue balls, all the same size, no names on them. Right panel shows Nodes 15, Edges 20, density, components. No labels on the dots is annoying -- which one is the Medici? Bottom-left hint: "Analyze (flask icon) in the toolbar (Shift+A) to add results here." That is the closest thing to a task word. There's a flask button in the floating toolbar at the bottom.

## Step 3 -- open Analyze

Thinking: "I need some kind of influence score first, then size by it. The flask says Analyze -- try that."

Command: `--step --click-at 679,864` (the flask in the bottom toolbar)
-> 03.png

Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS, ... Each has a one-line plain description. Nice that there are descriptions; I'd still have liked task words ("bridges", "reach") over algorithm names.

Hesitation: the "Start here" tag pulls me toward PageRank, but "which families the network depends on most" to me means the brokers -- take them out and the network falls apart. The sample's own blurb said "good for finding who brokers between groups". Degree just tells me who married the most. Betweenness: "which nodes sit on the most shortest paths between others" -- that's the bridge one.

## Step 4 -- choose Betweenness

Command: `--step --click "Betweenness"`
-> 04.png

Saw: a small Betweenness card: description, a collapsed "Advanced", "Under a second", and a Run button. I like that it tells me how long it will take. Not touching Advanced.

## Step 5 -- Run

Command: `--step --click "Run"`
-> 05.png

Saw: it ran instantly and painted every dot in an orange-to-dark-brown ramp. A key popped up top-left: "Color: Betweenness, 0 to 47.5" -- good, a legend, though it sits on top of one of the dots (the top-left node is hidden behind it). The left list now has a "Betweenness 15" row. But the dots are all still the same size. I asked for SIZE, it gave me COLOR. Also orange vs dark brown will not survive a greyscale printout.

## Step 6 -- open the Betweenness result row

Thinking: "There must be a 'size by' somewhere. The Betweenness row on the left is the obvious thing to poke at."

Command: `--step --click "Betweenness"`
-> 06.png

Saw: the right panel switched to "Betweenness -- Measure from Betweenness, Oct 7", Style tab, Nodes/Edges. Sections: Fill (Color = Betweenness, with a minus), Shape +, Effects +, Label +, Tooltip +. No "Size" written anywhere. Hesitation: size is probably part of "Shape"? That's a guess -- in Gephi it's its own "Size" tab.

## Step 7 -- add something under Shape

Command: `--step --click-at 1419,234` (the + beside Shape)
-> 07.png

Saw: a little menu: "Size", "Shape". There it is.

## Step 8 -- Size

Command: `--step --click "Size"`
-> 08.png

Saw: "Size by attribute" picker: Fixed size, then under Betweenness: Betweenness, Betweenness rank, Betweenness percentile; greyed out "Cannot be used: holds groups, not amounts" for id and name. Clear. Hesitation over rank vs raw score -- raw score is what I'd defend; rank would make the size gaps even.

## Step 9 -- size by Betweenness

Command: `--step --click-at 1207,416` ("Betweenness" in the picker)
-> 09.png

Saw: now the dots differ in size. One big dark one in the middle, a couple of medium ones (right of center, and lower right), lots of small ones. Key top-left now has two rows: "Size: Betweenness 0 to 47.5" (a grey wedge) and "Color: Betweenness 0 to 47.5". Size row in the panel says "1 to 3". So size and color both encode the same number. That's the task done mechanically.

But I don't trust it until I see who the big one is. If it's not the Medici I'd distrust the whole thing. There are no names on the dots.

## Step 10 -- hover the big dot to see who it is

Command: `--step --hover-at 700,378`
-> 10.png (tool reported: node with id "Medici", tooltip: null)

Saw: hovering the big dot shows NOTHING on screen -- no tooltip, no name. (The tool tells me it is "Medici", but a real person would not get that.) For a slide I'd need the names on the dots. Let me click it and see whether the panel tells me who it is.

## Step 11 -- click the big dot

Command: `--step --click-at 700,378`
-> 11.png

Saw: the big dot got a yellow halo and the right panel switched to "Medici -- Node": id Medici, name Medici, Results: Betweenness 47.5, #1 of 15; Degree 6. OK -- the Medici on top is what I'd expect for this network, so I believe the ranking. "#1 of 15" is the kind of thing I can put on a slide.

I'm stopping here: the dots are sized by how much the network depends on each family, and I can say what the key means.

Command: `--end rounds/round-3/sessions/r3-s30`

## Debrief (in character, Jordan)

**Did I finish?** Yes. Eleven steps, no dead ends: Analyze -> Betweenness -> Run, then on the result's Style panel Shape + -> Size -> Betweenness.

**My answer to the task:** The size of each dot is the family's betweenness -- how often it sits on the shortest marriage route between two other families, i.e. how much it brokers between the others. Bigger means more of the network's connections pass through that family (0 to 47.5; the Medici are the biggest at 47.5, #1 of 15). The color is the same measure again: light orange is low betweenness, dark brown is high. So size and color say the same thing twice.

**Ease: 5 out of 7.** Getting a score was fast and it told me "under a second" before I clicked, which I liked. Losing two points for:

- Running the analysis painted the dots by COLOR, not size. I asked for bigger dots; I had to go find size myself. Fine, but I didn't know whether color was what I'd get until it happened, and now the color is redundant with the size -- a VP will ask "and what does the dark brown mean?" and the answer is "the same thing as big".
- Size lives under "Shape" behind a + button. Nothing on the panel says "Size" until you open that menu; I guessed. In Gephi it's its own thing.
- No names on the dots, and hovering a dot shows nothing. I only found out the big one was the Medici by clicking it. For a slide this is useless without names; I'd have to find "Label" next.
- The key in the top-left corner sits on top of one of the dots -- one family is hidden behind it.
- Orange-to-brown ramp: will not survive a greyscale printout or a washed-out projector.
- The analysis list leads with algorithm names (Betweenness, PageRank, Katz, HITS). The one-line descriptions saved me, but "Start here" on PageRank almost pulled me the wrong way -- for "who the network depends on", I wanted the brokers, not PageRank.

**What I'd want next (not part of the task):** names on the big dots, a legend I could drop straight onto a slide, and a sorted table of the 15 families with their scores as a CSV.

**Good:** "Local only" and "Files are read on this computer and never uploaded" were on the very first screen -- I didn't have to ask legal anything. "#1 of 15" next to the score is exactly what I'd quote.
