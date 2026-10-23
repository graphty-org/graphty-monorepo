# Session r1-s37b: Nadia, running club "who matters most"

Participant: Nadia, a level-1 transaction monitoring analyst at a mid-size bank, fourteen months
in, no graph tools of her own. Task: "A friend's list of who in your running club knows whom is
already drawn in it. Have the program put the people in order of how much the whole club depends
on them, and tell us the top three, in order, and what the order was based on."

Start: the setup steps ran unseen (No thanks; Open project or file...; upload friends.csv). The
session waited about 20 minutes for a free browser slot before the first screenshot; that wait is
the tool, not the app.

## Steps

### 1. First look (01.png)

Command: `--start <session> setup:<file with the three setup steps>`

Saw: 20 blue balls with arrows between them, no names on any of them. Left: a search box
"Find nodes, edges, values", then "Selection" and "Everything". Right: an Overview -- Nodes 20,
Edges 41, Directed, Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. At the bottom
left: "Analyze (Shift+A) to add results here". A row of icons at the bottom middle.

Think-aloud: "Okay. No names on the dots, so I can't just eyeball it. In my world I'd paste an
account number into the search box, but I don't have a name to search for -- I need the program to
rank them. The bottom-left says Analyze adds results. The flask at the bottom is probably that."

### 2. Hover the flask (02.png)

Command: `--step <session> --hover-at 659,864`

Saw: tooltip "Analyze Shift+A". Confirmed.

### 3. Open Analyze (03.png)

Command: `--step <session> --click-at 659,864`

Saw: a list under "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first
order (grayed, "Select a node first"), Most flow (grayed).

Think-aloud (hesitated here, longest pause of the session): "That's a lot of math words.
'How much the whole club depends on them' -- Betweenness says 'which nodes sit on the most
shortest paths between others', which kind of sounds like 'if they left, people get cut off'.
But PageRank says Start here. I don't know the difference and I'm not going to research it.
If the program says start here, I start here. If QA asks, 'the program's recommended ranking'."

### 4. Pick PageRank (04.png)

Command: `--step <session> --click-at 536,600`

Saw: a small PageRank card: "Which nodes are connected to other well-connected nodes.",
"Damping factor 0.85", "Under a second", a Run button.

Think-aloud: "Damping factor. No idea. Leave it. Under a second is nice."

### 5. Run (05.png)

Command: `--step <session> --click Run`

Saw: all the dots turned orange, a few dark brown. A legend at the top left: "Color: Influence,
0.04382 to 0.06608". The left panel gained a row "Influence" with an orange bar and "20".

Think-aloud: "Okay, it colored them. Darker is more, I guess? But there are still no names, so
the picture alone doesn't tell me who. And it says 'Influence' now -- I clicked PageRank. Is that
the same thing? I assume so, it's the only new row."

### 6. Click the Influence row (06.png)

Command: `--step <session> --click-at 121,156`

Saw: the right panel switched to "Influence, Measure from Influence, Oct 6". A Values strip,
"20 of 20 have a value, 0.04382 to 0.06608, median 0.04736", then a "Top 10" list:
Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575, Gus 0.0547, Jada 0.0483, Theo 0.04826,
Sana 0.04806, Ravi 0.04785, Quinn 0.04758. Below, "Made with: Analysis Influence, Ran Oct 6,
Damping Factor 0.85".

Think-aloud: "There it is. That's what I wanted from the start -- a list with names and numbers.
Farah, Ava, Hana. I could paste that into a file."

### 7. End

Command: `--end <session>`

## Answer, in character

Top three: Farah (0.06608), Ava (0.06423), Hana (0.05883). The order is the program's
"Influence" score, which is what it shows after I ran PageRank: it ranks people who are connected
to other well-connected people.

## Debrief, in character

- Did I finish? Yes, I think so. About six clicks.
- How hard (1-7, 7 hardest): 3.
- What confused me:
    - The analysis list. I had to choose between Betweenness and PageRank for "how much the club
      depends on them" and I couldn't tell which one actually means that. I went with "Start here"
      because it was labeled, not because I understood it. If QA asked me why PageRank and not
      Betweenness, I couldn't defend it.
    - I clicked "PageRank" and the result is called "Influence" everywhere afterwards -- the legend,
      the left row, and even "Made with: Analysis Influence". The word PageRank is gone. If I write
      "PageRank" in my notes and someone opens this later, they won't find it.
    - After Run, the drawing changed color but nothing told me where the ranked list was. The dots
      have no names, so the picture alone was useless for the question. I only found the list
      because the new "Influence" row was the obvious thing to click.
    - "Damping factor" means nothing to me; I left it alone.
- What worked: the "Top 10" list with names and numbers is exactly what goes into a file. The
  Overview numbers on the first screen were clear.
