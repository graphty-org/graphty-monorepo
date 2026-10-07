# Circles of characters in Les Miserables -- Elena, first contact

Participant: Elena, a product manager with no graph training, using the app for the first time.
Task: use the bundled Les Miserables network, have the program find the circles of characters who
keep turning up together, and report how many circles, how big the largest is, and three
characters in it. Start: the empty app, no files.

All commands are run from `design/ui/studio` with `S=rounds/round-1/sessions/r1-s39`.

## Steps

### 1. The empty app

`node tool/real.mjs --start $S empty` -> `01.png`

Saw: a start page with "Open project or file...", "New from data...", recent projects (empty), and
a Samples column listing "Les Miserables -- 77 characters -- Characters who share a chapter of the
novel. Good for a first look at communities and who holds the story together." A usage-data
banner at the bottom.

Think-aloud: "OK, there's a Les Miserables one right there, and it even says communities. The
thing at the bottom wants my data. No thanks."

### 2. Dismiss the banner

`--step $S --click "No thanks"` -> `02.png`

### 3. Open the sample

`--step $S --click "Les Miserables"` -> `03.png`

Saw: a cloud of identical blue dots with gray lines, no names on them. Left panel: a search box,
"Selection", "Everything". Right panel: Graph overview -- Nodes 77, Edges 254, Density 0.08681,
Components 1, "Edges per ... 1 to 36, mean 6.597". A floating toolbar at the bottom with five
icons and no words. Bottom of the left panel: "Analyze (Shift+A) to add results here" (I did not
read this).

Think-aloud: "Huh, a bunch of blue dots. No names. Density, components... not my words. I want
groups. Let me click the one in the middle where all the lines meet."

### 4. Click the busiest dot

`--step $S --click-at 768,447` -> `04.png` (tool: node "Valjean")

Saw: the right panel changed to "Valjean -- Node", id Valjean, name Valjean, Degree 36. The dot got
a yellow ring.

Think-aloud: "Valjean. Of course, he's the main character, so he's in the middle. Degree 36,
whatever that is. OK, but I still don't see any groups."

Hesitation: I tried the canvas first and it only told me about one person. No hint here about
groups.

### 5. Hover the bottom icons

`--step $S --hover-at 659,864` -> `05.png` (tooltip: "Analyze Shift+A")

Think-aloud: "These icons have no labels. The beaker one says Analyze. That sounds like where it
would find groups."

### 6. Open Analyze

`--step $S --click-at 659,864` -> `06.png`

Saw: a popup list under "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank ("Start here"), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most
flow... each with a one-line description. A "Filter analyses" box on top.

Think-aloud: "Ugh. Betweenness, Katz, HITS. I don't know any of these. None of these says groups.
There's a filter box -- let me just type 'group'."

Hesitation: the first screen of the list is all ranking; the groups section is not visible without
scrolling or filtering.

### 7. Filter for groups

`--step $S --type "group"` -> `07.png`

Saw: a "Find groups" heading with Louvain ("Start here"), Leiden, Label propagation, Girvan-Newman,
Markov clustering, Spectral clustering, Hierarchical clustering.

Think-aloud: "Find groups, there it is. Louvain? I can't even say that. But it says Start here, so
fine."

### 8. Pick Louvain

`--step $S --click "Louvain"` -> `08.png`

Saw: a small form: "Which nodes form densely linked groups." Resolution: 1. "Under a second." Run.

Think-aloud: "Resolution, 1. I'm not touching that. Run."

### 9. Run it

`--step $S --click "Run"` -> `09.png`

Saw: the dots turned six colors. A legend "Color: Communities" on the canvas, Group 1 to Group 6.
The left panel grew "Communities 6" with Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11),
Group 5 (10), Group 6 (8). The right panel (still Valjean) now shows Memberships: Communities --
Group 1.

Think-aloud: "Ooh, colors! Six groups. Group 1 has 20, that's the biggest. And Valjean is in
Group 1, the yellow one -- so the yellow ones are Valjean's crowd. That's one name. But the dots
don't have names, so how do I get two more? Let me click Group 1 on the left."

Wrong guess (in character): "The pink bunch hanging off the bottom must be the less important
characters, since they're off on their own." Nothing on screen says that.

### 10. Open Group 1

`--step $S --click-at 141,188` -> `10.png` (tool: treeitem "Group 1")

Saw: right panel "Group 1 -- from Communities, Oct 6", Size 20, Made by Communities, and Members
"First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais,
Fauchelevent, Bamatabois. The canvas looked the same as before: nothing about Group 1 lit up or
dimmed, and Valjean still showed as the selection (Selection 1).

Think-aloud: "There we go. Size 20, and a list. Valjean, Fauchelevent, MlleBaptistine. Done. Odd
that the picture didn't change when I picked the group -- I had to trust that yellow means Group 1."

### 11. End

`node tool/real.mjs --end $S`

## Answer given

- Circles: 6
- Largest: Group 1, 20 characters
- Three in it: Valjean, Fauchelevent, MlleBaptistine

## In character, at the end

- Did I finish? Yes.
- How hard (1 = very easy, 7 = very hard): 3. Once I found the beaker it was quick.
- What confused me:
  - The bottom icons have no words; I only found Analyze by hovering.
  - The Analyze list opens on a wall of words I don't know (Betweenness, Katz, HITS). If I hadn't
    thought to type "group" I'd have been scrolling through it. Louvain is not a word I would have
    picked without the "Start here" tag.
  - "Resolution" -- no idea what it does, so I left it alone.
  - The dots never had names, so I couldn't read the characters off the picture; only the side
    list told me who was in the group, and it showed "First 10" of 20.
  - Clicking Group 1 didn't highlight its members on the picture; Valjean stayed selected instead.
  - The bottom-left line "Analyze (Shift+A) to add results here" was on screen the whole time and I
    never read it.
