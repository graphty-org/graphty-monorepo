# Session r3-s51 -- Dana Okafor (supply chain risk analyst), task T8 "Circles of characters", Les Miserables

Task as given: practice on the ready-made Les Miserables network; have the program pick out the circles of characters who keep turning up together; report how many circles, how big the largest is, and three characters in it.

## Start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s51 empty`
Screenshot 01.png: a start page. Left: "Open project or file...", "New from data...", "Files are read on this computer and never uploaded" (good -- that answers my IT question before I ask). Middle: Recent projects (empty). Right: Samples, Les Miserables first, "77 characters ... Good for a first look at communities". Bottom: a box asking to share usage data. Small grey text everywhere, hard on my eyes.

## Step 1
Dana: "Usage data? No. Anything that phones home is an IT ticket. No thanks. Then the Les Miserables sample, that's what they told me to use."
Command: `--step --click "No thanks" --click "Les Miserables"`
Saw (02.png): the network drawn -- blue dots and grey lines, a hairball as usual. Left: a search box, "Selection", "Everything". Right: "Graph" panel with Overview numbers (Nodes 77, Edges 254, Density, Components 1). Bottom-left hint: "Analyze [flask icon] in the toolbar (Shift+A) to add results here". Bottom toolbar: flask, a chart-ish icon, "3D", magnifier.
Hesitation: "Components 1" -- is that my answer? One circle? That can't be what they mean by circles of characters who turn up together. I don't trust that word.

## Step 2
Dana: "Nice hairball. Nothing here says 'groups'. The hint at the bottom says Analyze is the flask in the toolbar -- I'll click the flask."
Command: `--step --click-at 679,864`
Saw (03.png): a popup list "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS, All-pairs distance... each with a one-line grey description. All ranking, nothing about groups. Words I don't know (Katz, HITS, Eigenvector) -- I won't touch those.
Hesitation: PageRank says "Start here" but that's ranking, not circles. The list continues below; rather than scroll a wall of math terms, I'll use the filter box.

## Step 3
Dana: "I want groups. There's a filter box with the cursor in it -- I'll type 'group'."
Command: `--step --type "group"`
Saw (04.png): filtering worked. Heading "Find groups": Louvain ("Start here", "Which nodes form densely linked groups."), Leiden, Label propagation, Girvan-Newman, Markov clustering, Spectral clustering, Hierarchical clustering. Names are people's names to me, but the descriptions are plain enough.
Hesitation: seven ways to find groups -- which one is "right"? I'm not going to compare seven. The "Start here" tag decides it for me.

## Step 4
Dana: "Louvain, 'Start here', 'which nodes form densely linked groups'. Fine, that's the one."
Command: `--step --click "Louvain"`
Saw (05.png): a small Louvain form: "Resolution" = 1, "Advanced" collapsed, "Under a second", a blue "Run" button.
Hesitation: "Resolution" -- like screen resolution? No idea what it changes. Leaving the default.

## Step 5
Dana: "Don't know what resolution means here, leaving it. Run."
Command: `--step --click "Run"`
Saw (06.png): the dots are now colored. Left list: "Louvain 6", then Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8). A color key over the top-left of the drawing, "Color: Louvain", Group 1-6. Group 1 (gold/yellow) is the biggest, 20.
That's two of my three answers: 6 circles, largest has 20. Good -- a list with counts, sorted, that's how I like it. Now I need names. No names on the dots at all.

## Step 6
Dana: "Six groups, biggest is Group 1 with 20. I need names of who's in it -- I'll click Group 1 in the list and hope it shows me the members."
Command: `--step --click "Group 1"`
Saw (07.png): Group 1 is highlighted in the list (with an eye icon). The right panel now says "Group 1 -- Group from Louvain, Oct 7", tab "Style" open: Fill, Color E69F00. Nothing about who is in it. The drawing didn't change -- no names, no highlighting of the gold dots.
Hesitation: I asked who's in the group and it offers me a color picker. There's a "Values" tab next to Style; that sounds more like data.

## Step 7
Dana: "I don't want to recolor it, I want the list. Try 'Values'."
Command: `--step --click "Values"`
Saw (08.png): Values tab: "Summary -- Size 20, Made by Louvain", then "Members -- First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois.
That's my answer. Only the first 10 of 20 are listed and I don't see a way to get the rest or copy them out, but the task only asks for three.

## End
Command: `--end`

## Debrief (in character)

**Did I finish?** Yes. The program came up with 6 circles (it calls them "groups"). The largest, Group 1, has 20 characters. Three of them: Valjean, MlleBaptistine and MmeMagloire (also Fauchelevent, Marguerite, Labarre...).

**Ease: 5 out of 7.** Eight steps, no dead ends. Running it was quick and the result came back as a sorted list with counts, which is the part I actually trust.

**What slowed me down or confused me:**
- The Analyze list opens on a wall of ranking methods with names I don't know (Katz, HITS, Eigenvector). I only found the groups because I typed "group" in the filter. If I hadn't thought to type, I'd have been scrolling math terms.
- Seven ways to find groups and no word on why I'd pick one over another. I took "Start here" on faith. If I ran Leiden and got 5 groups, which number goes in front of the VP?
- "Resolution" on the Louvain form -- no idea what it does. I left it alone.
- The overview panel says "Components 1" right from the start. For a second I thought that was the answer to "how many circles". Two different words for groups-ish things.
- Clicking Group 1 first showed me a color picker (Style tab), not who's in the group. I had to guess that "Values" is where the members are.
- Members shows only "First 10" of 20. Where are the other ten? I'd want the whole list and a way to get it into Excel.
- The drawing has no names on the dots, and clicking the group didn't highlight its dots, so the picture didn't help me answer anything -- the side panel did.
- Small grey text throughout (the descriptions under each analysis, "Under a second", "First 10") is hard to read without my glasses.

**So what for the business:** finding clusters of suppliers that keep showing up together could be interesting, but only if I can get the member list out into a table. "Files never uploaded" on the start page is the first thing I'd show IT.
