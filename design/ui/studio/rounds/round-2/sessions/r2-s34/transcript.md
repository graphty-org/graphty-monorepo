# Session r2-s34 -- Alex (intermediate graph analyst), task T9, Prompt B (Florentine families)

Task as given: practice on the ready-made network of the leading families of Renaissance Florence
and the marriages between them. Make the drawing show which families the network depends on most:
the more it depends on a family, the bigger that family's dot. Then say what the sizes and the
colors on the drawing now stand for.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s34 empty`

Saw (01.png): a start page. Left: "Open project or file...", "New from data...", "Files are read on
this computer and never uploaded." Top right: "Local only" with a lock. Right: Samples, including
"Florentine families -- 15 families -- Good for finding who brokers between groups." A usage-data
banner at the bottom.

Alex: Good, first thing I wanted -- it says files are never uploaded and "Local only". I'll say no
to the usage data and open the Florentine sample.

## Step 2 -- dismiss usage banner, open the sample

Command: `--step ... --click "No thanks" --click "Florentine families"`

Saw (02.png): the network drawn: 15 blue dots all about the same size, 20 lines. Right panel
"Values": Nodes 15, Edges 20, density 0.1905, 1 component, "Edges per node 1 to 6, mean 2.667".
No labels on the dots. Bottom left hint: "Analyze (flask) in the toolbar (Shift+A) to add results
here". Bottom toolbar: flask, a chart-ish icon, "3D", a magnifier.

Alex: Counts are right there -- 15 and 20, that matches what I'd expect for the Padgett data.
Nice. "Depends on most" -- that's betweenness to me, the brokers. The hint says Analyze is the
flask. I'll click Analyze.

## Step 3 -- open Analyze

Command: `--step ... --click "Analyze"`

Saw (03.png): a popover with a "Filter analyses" search box and a list under "Rank nodes and
edges": Degree, Betweenness ("Which nodes sit on the most shortest paths between others"), Edge
betweenness, Closeness, PageRank (with a "Start here" badge), Eigenvector, Katz, HITS, All-pairs
distance, Depth-first order (greyed, "Select a node first"), Most flow...

Hesitation: the "Start here" badge on PageRank pulls me a bit, but "which families the network
depends on" is a broker question, and the sample card even said "who brokers between groups".
That's betweenness. I type it into the filter like I always do.

## Step 4 -- filter to betweenness

Command: `--step ... --type "betweenness"`

Saw (04.png): the list narrowed to Betweenness and Edge betweenness, Betweenness highlighted.

Alex: Good, search works the way I want. Press Enter on Betweenness and see if the picture changes.

## Step 5 -- pick Betweenness

Command: `--step ... --key Enter`

Saw (05.png): the popover now shows a Betweenness card: description, a collapsed "Advanced",
"Under a second" and a blue "Run" button. Nothing on the drawing changed yet.

Alex: "Under a second" -- that's exactly what I want to know before I click, after the four-hour
NetworkX thing. Run.

## Step 6 -- Run

Command: `--step ... --click "Run"`

Saw (06.png): it ran instantly. All dots turned shades of orange to near-black; one central dot is
almost black. A legend at top left of the canvas: "Color: Bridges, 0 ... 47.5" with an orange
ramp. The legend box sits over the top-left dot (that dot is now hidden behind it). In the left
panel a new row "Bridges 15". Dot sizes did not change.

Alex: So it colored, not sized. And it's called "Bridges" now, not betweenness -- I'll assume that's
the betweenness score, 0 to 47.5, which is about right for unnormalized betweenness on Padgett
(Medici should be ~47.5). Orange-to-brown is fine for my eyes, no red/green. Now I need size.
I'll click the "Bridges" row on the left to see what I can do with it.

## Step 7 -- select the Bridges row

Command: `--step ... --click "Bridges"`

Saw (07.png): right panel switched to "Bridges -- Measure from Bridges, Oct 7", tab Style, Nodes /
Edges. Sections: Fill (Color = Bridges, with a minus), Shape +, Effects +, Label +, Tooltip +.
No "Size" anywhere.

Hesitation: no Size row. In Gephi size is its own thing; here I'd guess size lives under Shape.
I'll click the + next to Shape.

## Step 8 -- "Add to Shape"

Command: `--step ... --click-at 1419,234` (button "Add to Shape")

Saw (08.png): a small menu: "Size", "Shape". Size highlighted.

Alex: There it is. Size.

## Step 9 -- choose Size

Command: `--step ... --click "Size"`

Saw (09.png): a new row "Size" with a number box "1" (focused), a chain-link icon and a minus. Dots
unchanged.

Hesitation: a plain number box -- that's a fixed size for everyone, not "by betweenness". The color
row shows "Bridges" in its box, so the chain-link next to Size is probably "link to a value". I'll
hover it to check before clicking.

## Step 10 -- hover the chain-link

Command: `--step ... --hover-at 1380,264`

Printed: button "Size by attribute", tooltip "Size by attribute".

Alex: "Attribute" -- that's the Gephi "Ranking" thing. Click it.

## Step 11 -- Size by attribute

Command: `--step ... --click "Size by attribute"`

Saw (11.png): a "Size by attribute" picker: search box, group "Bridges" with Bridges, Bridges rank,
Bridges percentile; then greyed "Cannot be used: Holds groups, not amounts" -- id, name.

Alex: Nice that it tells me why id and name are greyed. Plain "Bridges" -- the raw score -- so the
size matches the color legend.

## Step 12 -- pick Bridges for size

Command: `--step ... --click-at 1188,372` (option "Bridges")

Saw (12.png): the dots now differ in size. One very big, dark-brown dot in the middle, two
mid-size dark ones to its right, several small light-orange ones. Size row reads "1 to 3". Legend
now has two rows: "Size: Bridges 0 ... 47.5" (a grey wedge) and "Color: Bridges 0 ... 47.5". The
legend still covers the top-left corner where a dot used to be.

Alex: That's the picture. Sizing part done. But I can't tell my director which family the big one
is -- no names on the dots. And I want to confirm "Bridges" really is betweenness. I'll hover the
big dot.

## Step 13 -- hover the big dot

Command: `--step ... --hover-at 700,378`

Printed: node with id "Medici" (that is the tool's note); tooltip null. On screen (13.png) nothing
appears -- no tooltip, no name. As a user I see nothing when I hover.

Alex: Hovering gives me nothing. I'd bet it's the Medici, but I'm guessing. Let me look at the
"Values" tab of this Bridges result -- maybe it lists the families and explains what Bridges is.

## Step 14 -- Values tab of the Bridges result

Command: `--step ... --click "Values"`

Saw (14.png): a histogram "15 of 15 have a value, 0 to 47.5, median 8.5"; a "Top 10" list: Medici
47.5, Guadagni 23.17, Albizzi 19.33, Salviati 13, Ridolfi 10.33, Bischeri 9.5, Strozzi 9.333,
Barbadori 8.5, Tornabuoni 8.333, Castellani 5. "Made with: Analysis Betweenness, Ran Oct 7".

Alex: There's my confirmation -- "Bridges" was made with Betweenness, and the big dot is the Medici
at 47.5, then Guadagni and Albizzi. That's the textbook Padgett answer. Done.

## Step 15 -- end

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s34`

## Debrief (in character)

**Did I finish?** Yes. The dots are now sized by betweenness (the app calls the result "Bridges"):
the more shortest paths between other families run through a family, the bigger its dot. Medici is
by far the biggest, then Guadagni and Albizzi.

**What the sizes and colors stand for now:** both stand for the same thing -- the Bridges
(betweenness) score, 0 to 47.5. Bigger dot = more of a broker; darker brown = more of a broker,
light orange = little or none. The legend at the top left says exactly that: "Size: Bridges 0 --
47.5" and "Color: Bridges 0 -- 47.5". So the color is redundant with size right now; it was put
there automatically when I ran the analysis.

**Rating:** 6 out of 7 (easy).

**What worked:** the "never uploaded / Local only" line before I loaded anything; node and edge
counts right on screen; typing "betweenness" in the Analyze search; "Under a second" before I
clicked Run; the drawing changed by itself after the run; the attribute picker explaining why id
and name cannot size a dot; "Made with: Betweenness" and the Top 10 table.

**What confused me or slowed me down:**

- I ran Betweenness and got a thing called "Bridges". I had to go to the Values tab to be sure it
  was betweenness. In a deck I'd call it betweenness; two names for one number makes me nervous.
- Running the analysis colored the dots but did not size them. Since the obvious use of a ranking
  is "bigger = more important", I had to dig for size.
- Size was hidden under "Shape" behind a "+" -- I guessed right, but there is no Size row until you
  add one, and it starts as a plain "1" number box; the chain-link "Size by attribute" icon is easy
  to miss without hovering.
- Hovering a dot shows nothing -- no family name. Without the Top 10 list I could not have named
  the big dot. For my director I'd want names on at least the big ones.
- The legend box at top left covers part of the drawing (a dot there disappeared behind it after
  the run).
- PageRank carries a "Start here" badge. For "who does the network depend on" that would have sent
  a newcomer to a different measure than the broker one.
