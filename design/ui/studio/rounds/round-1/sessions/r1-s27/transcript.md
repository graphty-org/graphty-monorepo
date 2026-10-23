# Session r1-s27: Grace, bigger dots for the families that matter (Florentine families)

Participant: Grace, operations and data coordinator at a small nonprofit, first time using a graph tool.
Task: using the ready-made network of the leading families of Renaissance Florence and the marriages between them, make the drawing show which families the network depends on most (the more it depends on a family, the bigger its dot), then say what the sizes and colors now stand for.
Start: empty app. Tool: design/ui/studio/tool/real.mjs. Build: graphty@0.8.53, commit 9d6598eea3e9.

(Before the first screenshot the session waited about 30 minutes for a free browser slot. That is part of the study setup, not the app.)

## Step by step

### 01.png -- `--start ... empty`

What I saw: a dark start page. Under "Start": "Open project or file...", "New from data...", "or drop a file anywhere in this window", and "Files are read on this computer and never uploaded." Under "Samples" on the right: Les Miserables, Zachary's karate club, College football, and "Florentine families -- 15 families -- Marriages between the leading families of Renaissance Florence. Good for finding who brokers between groups." At the bottom, a box: "Your data is yours, but please help us," with "Share usage data" and "No thanks".

Thinking aloud: "Good, it says files never leave this computer, so I could use donor data here later. I don't want to share usage data on a work laptop, so No thanks. The task says to use the ready-made Florentine one, and it's right there under Samples."

### 02.png -- `--step --click "No thanks" --click "Florentine families"`

What I saw: a drawing of 15 blue balls joined by gray lines, with no names on them. On the right, "Overview": Nodes 15, Edges 20, "Undirected, from the file: directed 0", Density 0.1905, Components 1, "Edges per n..." 1 to 6, mean 2.667. On the left: Selection, Everything, and at the bottom "Analyze (Shift+A) to add results here." A small toolbar at the bottom of the canvas has five icons.

Thinking aloud: "15 families, same as the sample card said, good. 20 marriages. The dots are all the same size and have no names. 'Density' and 'Components' mean nothing to me. The hint at the bottom left says Analyze, and the flask icon in the toolbar looks like it could be that."

Hesitation: none of the dots have names, so I can't tell which family is which.

### 03.png -- `--step --hover-at 659,864`

Printed: button "Analyze", tooltip "Analyze Shift+A". Confirms the flask is Analyze.

### 04.png -- `--step --click-at 659,864`

What I saw: a list headed "Rank nodes and edges": Degree ("How many edges each node has"), Betweenness ("Which nodes sit on the most shortest paths between others"), Edge betweenness, Closeness, PageRank with a blue "Start here" tag ("Which nodes are connected to other well-connected nodes"), Eigenvector, Katz, HITS, All-pairs distance, a grayed-out "Depth-first order -- Select a node first", and "Most flow" below.

Thinking aloud: "Lots of jargon. 'Depends on most'... If one family dropped out, which one would cut everyone else off? That sounds like the families who sit between others. Betweenness says 'sit on the most shortest paths between others', and the sample card said this dataset is 'good for finding who brokers between groups'. PageRank says 'Start here', which pulls at me, but its description is about being connected to well-connected people, which is popularity, not dependence. I'll go with Betweenness."

Hesitation: real hesitation between PageRank ("Start here") and Betweenness. The "Start here" tag nearly decided it for me. "Edge betweenness" next to it added to the confusion.

### 05.png -- `--step --click "Betweenness"`

What I saw: the list collapsed into a small card: "Betweenness -- Which nodes sit on the most shortest paths between others. Under a second," with a blue "Run" button.

Thinking aloud: "Under a second, fine. Run."

### 06.png -- `--step --click "Run"`

What I saw: every dot turned orange, and one in the middle turned very
