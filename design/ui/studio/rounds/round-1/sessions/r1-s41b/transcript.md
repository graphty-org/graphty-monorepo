# Session r1-s41b -- Jordan (marketing network analyst), task T8 "Circles of characters"

Dataset: Les Miserables sample. Start: empty app. Viewport 1440 x 900.

Answer given: **6 circles; the largest has 20 characters; three of them are Valjean,
Fauchelevent and MlleBaptistine.**

## Steps

### 1. Start

    node tool/real.mjs --start rounds/round-1/sessions/r1-s41b empty

Screenshot 01.png: the start page has three columns: Start (Open project or file, New from data),
Recent projects (empty), and Samples. Les Miserables is the first sample, "77 characters", and it
says it is "Good for a first look at communities". A usage-data banner sits at the bottom. A
"Local only" badge is at the top right, and a line under Start says "Files are read on this
computer and never uploaded."

Think-aloud: "OK, it says local only, and files never get uploaded. Good, that's the first thing
legal asks me. It's a sample anyway. Usage data -- no thanks, I'm not reading that. Les Mis says
'communities' right on the card, so that's my one."

### 2. Decline usage data, open the sample

    node tool/real.mjs --step ... --click "No thanks" --click "Les Miserables"

Screenshot 02.png: the graph opens, all blue dots, a medium hairball. Left: a search box, Selection,
Everything. Right: an Overview (77 nodes, 254 edges, density, 1 component). A toolbar sits at the
bottom with five icons, and a hint at the bottom left reads "Analyze (Shift+A) to add results here".

Think-aloud: "Hairball, as usual. Nothing called Communities or Clusters anywhere I can see. The
icons at the bottom don't have words on them. The flask, I guess? The hint at the bottom says
'Analyze', and the flask is the only thing that looks like analysis."

Hesitation: a few seconds. No button carried a task word like "Communities" or "Find groups".

### 3. Open Analyze

    node tool/real.mjs --step ... --click-at 659,864      # button "Analyze"

Screenshot 03.png: a popover listing "Rank nodes and edges": Degree, Betweenness, Edge
betweenness, Closeness, PageRank (marked "Start here"), Eigenvector, Katz, HITS, All-pairs
distance, and grayed entries further down. A filter box is at the top.

Think-aloud: "This is all influence-score stuff. Clusters aren't in the first screen. There's a
filter box, so I'll just type what I want."

### 4. Filter for communities

    node tool/real.mjs --step ... --type "communit"

Screenshot 04.png: the list narrows to "Find groups": Louvain (marked "Start here"), Leiden, Label
propagation, Girvan-Newman, Markov clustering, Spectral clustering, Hierarchical clustering, each
with a one-line description.

Think-aloud: "OK, Louvain, I know that one from Gephi -- 'Which nodes form densely linked
groups.' And it says 'Start here', so I take the default. I'm not going to read up on Markov
clustering."

### 5. Choose Louvain

    node tool/real.mjs --step ... --click "Louvain"

Screenshot 05.png: a small panel with a Resolution field set to 1, "Under a second", and a Run
button.

Think-aloud: "Resolution, 1. I'm leaving it. I like that it tells me how long it'll take."

### 6. Run it

    node tool/real.mjs --step ... --click "Run"

Screenshot 06.png: the dots are colored right away. A legend "Color: Communities" floats at the top
left of the canvas with Group 1 to Group 6. The left list now has "Communities 6" with each group
and its count: Group 1 20, Group 2 17, Group 3 11, Group 4 11, Group 5 10, Group 6 8.

Think-aloud: "There we go. Six groups, and it gives me the sizes in the list, sorted -- Group 1 is
20. That's the number I need without counting dots. A legend on the canvas, too, so nobody asks
me what orange means. 'Group 1' is a terrible name for a slide, but fine. Now who's in it?"

### 7. Open the biggest group

    node tool/real.mjs --step ... --click-at 141,188      # treeitem "Group 1"

Screenshot 07.png: Group 1 is highlighted in the list. The right panel shows "Group 1, from
Communities, Oct 6": Size 20, Made by Communities, and Members "First 10": MlleBaptistine,
MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois.

Think-aloud: "Valjean's in it, so the group makes sense -- that's my sanity check, the main guy is
in the big group. Valjean, Fauchelevent, MlleBaptistine. Done."

Hesitation: the canvas did not visibly change when Group 1 was chosen in the list -- no dimming or outline that I could see -- so I
had to trust the panel and match the yellow color by eye to find the group on the drawing.

### 8. End

    node tool/real.mjs --end rounds/round-1/sessions/r1-s41b

## Wrap-up, in character

- **Did I finish?** Yes. Six circles; the largest has 20 characters; three of them are Valjean,
  Fauchelevent and MlleBaptistine.
- **How hard (1-7)?** 2. About a minute.
- **What confused me:**
  - Nothing on screen said "communities" or "clusters" until I opened the flask and typed. The
    toolbar icons have no words; I picked the flask because of the "Analyze" hint at the bottom
    left. The first list is all ranking measures, so grouping is not visible without scrolling or
    filtering.
  - The groups are called "Group 1" to "Group 6". Fine for this task, useless for a messaging
    doc -- I'd want them named after something their members share, or at least by their biggest
    member.
  - Clicking Group 1 in the list did not light it up on the drawing that I could see; I matched
    the color by eye.
  - The members panel shows only the "First 10" of 20. For a shortlist I'd want all of them and a
    way to copy or export them.
  - Good: "Local only" and "never uploaded" answered my data question before I asked it; the run
    time estimate ("Under a second") was right; the counts per group were listed, so I did not have
    to count dots; the legend sits on the canvas.
