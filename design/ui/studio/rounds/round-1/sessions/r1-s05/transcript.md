# Session r1-s05 -- Alex (analyst), task T15 prompt A (Les Miserables)

Participant: Alex, data analyst, uses NetworkX and Gephi, skeptical, short on time.
Start: empty app. All commands run from `design/ui/studio` with
`node tool/real.mjs ... rounds/round-1/sessions/r1-s05`.

## Think-aloud and steps

### 01 -- start (`--start ... empty`)

Saw: a start page. Left: "Open project or file...", "New from data...", "or drop a file anywhere in
this window", and "Files are read on this computer and never uploaded." Right: "Samples" with Les
Miserables (77 characters), Zachary's karate club, College football, Florentine families. Top right a
lock and "Local only". Bottom: a usage-data box, "Share usage data" / "No thanks".

Alex: "OK, first thing -- does it send my data anywhere? 'Files are read on this computer and never
uploaded', and 'Local only' up top. Good, that is where I would look for it. I'm saying no to the
usage-data thing, I don't need to think about that today. Les Miserables is right there, 77
characters. That's the one."

### 02 -- `--step --click "No thanks" --click "Les Miserables"`

Saw: the graph drawn, blue dots and gray lines, a recognizable Les Mis shape (Myriel's fan at the
bottom). Right panel "Overview": Nodes 77, Edges 254, "Undirected, from the file: directed 0",
Density 0.08681, Components 1, "Edges per ... 1 to 36, mean 6.597". Bottom toolbar of icons; left
panel footer "Analyze (Shift+A) to add results here".

Alex: "77 and 254 -- that's the Les Mis graph NetworkX ships, I know those numbers. One component.
Good, the counts are right there, I trust it a bit more already. Part one, it's on screen -- done.
Now 'which characters matter'. There's a flask icon and the hint says Analyze. Let's click that."

### 03 -- `--step --click-at 659,864` (the flask, "Analyze")

Saw: a popup with "Filter analyses" search and a list under "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS,
All-pairs distance, Depth-first order (grayed, "Select a node first")... Each has a one-line
description.

Alex: "A search box, good, I'll just type it. PageRank says 'Start here', but I know betweenness and
I can defend it -- who sits between the groups. Typing 'betweenness'."

### 04 -- `--step --type "betweenness" --key Enter`

Saw: a small card "Betweenness -- Which nodes sit on the most shortest paths between others." and
"Under a second", with a Run button.

Alex: "'Under a second.' That is exactly what I want to know before I click, after the four-hour
NetworkX thing. Run."

### 05 -- `--step --click "Run"`

Saw: every dot turned orange, Valjean's dot a dark brown. A key top-left: "Color: Bridges, 0 ...
1624". Left list got a new row "Bridges" with an orange bar and "77".

Alex: "It recolored on its own, nice -- I didn't have to build a rule. But wait, 'Bridges'? I ran
betweenness. Is 'Bridges' the same thing? I'm guessing yes because 1624 looks like raw betweenness
for Valjean. The colors are all orange-ish; besides the one dark one I can't tell them apart very
well. Let me click that row and see the numbers."

Hesitation: the result's name ("Bridges") does not match the name I picked ("Betweenness").

### 06 -- `--step --click "Bridges"`

Saw: right panel now "Bridges, Measure from Bridges, Oct 6", Values histogram (77 of 77 have a
value, 0 to 1,624, median 0), and a "Top 10": Valjean 1,624; Myriel 504; Gavroche 470.6; Marius
376.3; Fantine 369.5; Thenardier 213.5; Javert 154.8; MlleGillenormand 135.7; Enjolras 121.3;
Tholomyes 115.8. "Made with: Analysis Bridges, Ran Oct 6".

Alex: "There it is, a top-ten table. Valjean, Myriel, Gavroche -- that's the same order I'd get out
of NetworkX unnormalized. OK, I'm warming up. Part two done: Valjean matters most, then Myriel,
Gavroche, Marius, Fantine. 'Made with' still says Bridges and never says betweenness though, which
I'd have to explain in a deck. Median zero -- right, most characters are on nobody's path. Now
bigger dots. Style tab."

### 07 -- `--step --click "Style"`

Saw: Nodes / Edges switch; sections Fill (Color = Bridges), Shape, Effects, Label, Tooltip, each with
a plus.

Alex: "No 'Size' anywhere. Probably under Shape? Trying the plus there."

Hesitation: size is not a visible heading; I had to guess it lives under Shape.

### 08 -- `--step --click-at 1419,226` ("Add to Shape")

Saw: a little menu: Size, Shape.

Alex: "Yep. Size."

### 09 -- `--step --click "Size"`

Saw: a Size row with "1" in a dropdown, a chain-link icon, and a minus. Dots unchanged.

Alex: "It's a fixed number. I want it driven by the score. What is that chain icon?"

### 10 -- `--step --hover-at 1380,256`

Tooltip: "Size by attribute".

Alex: "That's the one."

### 11 -- `--step --click-at 1380,256`

Saw: "Find an attribute" list: under Bridges -- Bridges, Bridges rank, Bridges percentile; grayed
"Cannot be used: Holds groups, not amounts" -- id, name.

Alex: "Bridges, plain."

### 12 -- `--step --click-at 1189,324`

Saw: Size now "1 to 3". Valjean is a big dark ball in the middle, Myriel and Fantine visibly
bigger, the rest small. Key now has two rows: "Size: Bridges 0 ... 1624" (a gray wedge) and "Color:
Bridges 0 ... 1624".

Alex: "Part three done: bigger dot = more betweenness. Took me about four clicks, a hover to find
the chain icon. In Gephi this is the Ranking-size thing, so about the same. Size and color are both
showing the same number now, which is a bit redundant, but fine. Names next -- Label plus."

### 13 -- `--step --click-at 1419,324` ("Add label line")

Saw: attribute list: id, name, and the Bridges ones.

Alex: "name."

### 14 -- `--step --click-at 1117,454`

Saw: names above every dot, small serif text. Under Label: "Above", "Abc name", and "77 labels, 7
hidden to avoid overlap".

Alex: "Names are on. And it tells me 7 are hidden for overlap -- I like that it says so instead of
quietly dropping them. The text is tiny on screen, and Valjean's own name is kind of buried on top
of his big ball. Part four done-ish. Now a picture. Menu."

### 15 -- `--step --click-at 24,20` (Main menu)

Saw: New project, Open project or file..., Save, Export... (Ctrl+E), Settings, Keyboard shortcuts,
Help.

### 16 -- `--step --click "Export..."`

Saw: Export dialog. Image tab: "A picture of the drawing, 2x (1806 x 1720), PNG", Preset "To share
-- PNG, 2x", View "Current view", size choices, format PNG/JPEG/WebP, background. A preview with the
key in the top-left corner. Footer "Saved to this computer only; nothing is uploaded." There's also
a Data tab.

Alex: "Preview shows the key in the picture -- good, that's what I'd otherwise screenshot
separately. PNG at 2x is fine for slides. Export. (Noting there's a Data tab -- that's probably my
CSV for later.)"

### 17 -- `--step --click "Export"`

Tool: a file was saved: les-miserables_current-view.png, 1806 x 1720.
Screen: toast "Exported les-miserables_current-view.png".

Looked at the file: white-gray background, the drawing with names, and a key box top-left: "Size:
Bridges 0 -- 1624" and "Color: Bridges 0 -- 1624". Valjean big and dark brown in the middle.

Alex: "That I can paste. Key's in it, readable. The names in the picture are small and slightly
blurry and some overlap around Valjean, but the big ones read. Part five done."

### 18 -- `--step --hover "Bridges"` then `--end`

Tooltip: none.

Alex: "One last thing -- I hovered 'Bridges' to see whether it says it's betweenness. Nothing. So
my slide key will say 'Bridges' and my director will ask me what that is."

## What the sizes and colors stand for (said aloud)

"Both the size and the color of a dot are that character's betweenness -- the app calls it
'Bridges' -- from 0 to 1624. Bigger and darker means the character sits on more of the shortest
paths between other characters. Valjean is far ahead at 1624, then Myriel 504, Gavroche 471,
Marius 376, Fantine 370."

## End, in character

- **Did I finish?** Yes, all five parts: on screen, ranked (betweenness), sized by it, names on, PNG
  with key exported.
- **How hard (1 = very easy, 7 = very hard)?** 2.
- **What took longest / confused me:**
  - I picked "Betweenness" and everything afterward called it "Bridges" -- the left list, the key,
    the "Made with" line, the exported picture. Nowhere does it say Bridges = betweenness. That's
    the label that goes in front of my director.
  - Size isn't a heading of its own; I had to guess it's under "Shape" and then find the chain
    icon ("Size by attribute") by hovering. Once I knew, it was quick.
  - The orange-to-dark-brown color scale is hard to read except at the top end; almost everyone
    looks the same orange. Size does the real work.
  - Labels are tiny and Valjean's name sits on top of his own ball, hard to read in the picture.
- **What I liked:** "never uploaded" / "Local only" on the start page and in the export dialog;
  counts (77 / 254) shown immediately; "Under a second" before running; a top-10 table whose
  numbers match NetworkX; the result recolored the drawing by itself; it told me 7 labels were
  hidden; the key is inside the exported image.
