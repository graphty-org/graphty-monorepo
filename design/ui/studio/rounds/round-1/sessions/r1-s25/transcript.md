# Session r1-s25: Nadia (level-1 alert reviewer), Les Miserables, bigger dots for the ones that matter

Participant: Nadia, a transaction monitoring analyst at a bank, fourteen months in. She has no
graph tools of her own and has only seen a colleague's link charts on escalated cases. She judges
a tool in minutes per alert.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on a
character, the bigger that character's dot. Then tell us what the sizes and the colors on the
drawing now stand for."

Start: the empty app. Build under study: graphty@0.8.53 (commit 9d6598ee).

Commands are run from `design/ui/studio`; S stands for `rounds/round-1/sessions/r1-s25`.

## Steps

### 1. The empty app (01.png)

`node tool/real.mjs --start S empty`

Saw: a start page with Start (Open project or file, New from data), an empty Recent projects
column, and Samples on the right: Les Miserables (77 characters), Zachary's karate club, College
football, Florentine families. A usage-data banner at the bottom.

Nadia: "Usage-data banner, no thanks. The sample I need is right there on the right."

### 2. Dismiss the banner (02.png)

`--step S --click "No thanks"`

The banner closed.

### 3. Open the sample (03.png)

`--step S --click "Les Miserables"`

Saw: 77 purple dots, all one size and one color. Left panel: a search box, "Selection",
"Everything", and at the bottom "Analyze (Shift+A) to add results here". Right panel: an Overview
(77 nodes, 254 edges, density, 1 component). A small toolbar at the bottom of the canvas.

Nadia: "Everything looks the same. 'Depends on most' means the program has to work something out.
The bottom-left says Analyze. The flask icon in the toolbar is probably that."

### 4. Open Analyze (04.png)

`--step S --click-at 659,864` (printed: button "Analyze")

Saw: a list under "Rank nodes and edges": Degree, Betweenness ("Which nodes sit on the most
shortest paths between others"), Edge betweenness, Closeness, PageRank with a "Start here" badge,
Eigenvector, Katz, HITS, All-pairs distance, and more below.

Nadia: "PageRank says 'Start here', which makes me second-guess myself. But 'depends on' to me is
the middleman, like a pass-through account that everything flows through: take it out and things
fall apart. Betweenness is the one that says 'sits between others'."

Hesitation: about five seconds between PageRank (the recommended one) and Betweenness.

### 5. Pick Betweenness (05.png)

`--step S --click "Betweenness"`

Saw: a small card: Betweenness, its one-line description, "Under a second", and a Run button.

Nadia: "Under a second. Fine. Run."

### 6. Run it (06.png)

`--step S --click "Run"`

Saw: every dot turned orange. A legend at top left: "Color: Bridges, 0 to 1624". A new row
"Bridges 77" in the left panel. The dots did not change size. One dot in the middle looked darker
brown; to her the rest looked like the same orange.

Nadia: "I picked Betweenness and now it's called 'Bridges'. Same thing? I'm guessing yes. It
colored everything, but the job said bigger dots, and nothing got bigger."

Confusion: the name changed from Betweenness to Bridges with no explanation. The color scale reads
as almost one color except for a single dot.

### 7. Open the Bridges result (07.png)

`--step S --click "Bridges"`

Saw: the right panel now shows Bridges: a histogram (0 to 1,624, median 0), a Top 10 (Valjean
1,624, Myriel 504, Gavroche 470.6, Marius 376.3, Fantine 369.5, Thenardier 213.5, Javert 154.8,
MlleGillenormand 135.7, Enjolras 121.3, Tholomyes 115.8) and "Made with: Bridges, Oct 6". Tabs
Style and Values at the top.

Nadia: "This is the part I'd actually use: a Top 10 I can paste into a file. Valjean is way out in
front. Now, size. 'Style' sounds like where size would be."

### 8. Style tab (08.png)

`--step S --click "Style"`

Saw: Nodes and Edges toggles. Rows: Fill (with Color: Bridges), Shape, Effects, Label, Tooltip,
each with a plus.

Nadia: "No Size row. Is size under Shape? A dot's size is kind of its shape. Trying the plus."

Hesitation: size is hidden under "Shape"; she guessed.

### 9. Plus next to Shape (09.png)

`--step S --click-at 1419,226` (printed: button "Add to Shape")

Saw: a small menu: Size, Shape.

Nadia: "There it is."

### 10. Add Size (10.png)

`--step S --click "Size"`

Saw: a Size row with a box showing "1", a small arrow, and a chain-link icon. Nothing on the
drawing changed.

Nadia: "Color has 'Bridges' in its box, so maybe this arrow lets me pick Bridges too."

### 11. The arrow in the Size box (11.png)

`--step S --click-at 1352,256` (printed: button "Open list")

Saw: a list opened with nothing in it, a thin empty strip under the box.

Nadia: "Empty. Nothing to pick. What's the chain icon?"

Dead end 1: the size box's list is empty.

### 12. Hover the chain icon (12.png)

`--step S --key Escape --hover-at 1381,256`

Printed tooltip: "Size by attribute".

Nadia: "'Size by attribute.' That's probably what I want."

### 13. Size by attribute (13.png)

`--step S --click-at 1381,256`

Saw: a picker "Find an attribute" with a Bridges group (Bridges, Bridges rank, Bridges
percentile) and, grayed out under "Cannot be used: Holds groups, not amounts", id and name.

Nadia: "Plain Bridges, same as the color."

### 14. Pick Bridges (14.png)

`--step S --click-at 1189,324` (printed: option "Bridges")

Saw: the middle dot became much bigger and dark brown; the hub at the bottom with many spokes
became the second largest; a few others grew a little. The Size box now says "1 to 3". The legend
shows two rows: "Size: Bridges, 0 to 1624" and "Color: Bridges, 0 to 1624".

Nadia: "Now it reads. Big one in the middle, a second big one at the bottom with all the spokes."

### 15. Hover the biggest dot (15.png)

`--step S --hover-at 768,447` (printed: node with id "Valjean", tooltip: null)

Saw: nothing appeared on screen. No name, no number.

Nadia: "No name pops up. I'd assume it's Valjean, because he's the runaway number one in the Top
10 and this is the one huge dot. But I can't point at a dot and see who it is. For an alert file
that matters."

Dead end 2: hovering a dot shows nothing.

### 16. End

`node tool/real.mjs --end S`

## Answer, in character

"The size of each dot is its Bridges score, which is what the program called Betweenness: how
often that character sits on the shortest route between two other characters. Bigger means more of
the network passes through them. Valjean is by far the biggest, then Myriel, then Gavroche,
Marius and Fantine. The color is the same thing again: darker orange to brown is a higher Bridges
score, light orange is near zero. So size and color both say the same number."

## Debrief, in character

- Did I finish? Yes, I think so. The big dots are the ones the network depends on, and I can say
  what the sizes and colors mean, as long as Bridges really is Betweenness.
- How hard (1 easy to 7 very hard): 4.
- What confused me:
    - I picked "Betweenness" and the result was called "Bridges". Nothing told me they're the same.
      QA would ask me which measure I used and I'd have to guess the answer.
    - Running it colored the dots but did not size them. The task was about size, so I had to find
      that myself.
    - Size was hidden under "Shape", behind a plus. I guessed.
    - The arrow in the Size box opened an empty list. The thing that worked was the small chain
      icon, which I only found by hovering it.
    - The color scale barely changes: apart from the one big dot, they all looked the same orange.
    - Hovering a dot shows no name, so I can't confirm which dot is Valjean from the drawing. I
      trusted the Top 10 list instead.
    - "PageRank: Start here" made me doubt my pick. If that's the recommended one, why?
- Minutes: about four or five from opening the sample. Fine for practice, too long for every
  alert. The Top 10 list is the bit I'd paste into a file; the picture alone would not satisfy QA
  without names on it.
