# Session r3-s50 -- Nadia (level-1 alert reviewer), task T8 "Circles of characters", Les Miserables

Persona: Nadia, transaction monitoring analyst, 14 months in; patience of about one alert (5-10 minutes); clicks what is in front of her; wants one picture plus a few lines for the file.

Task: on the Les Miserables sample, have the program pick out the circles of characters who keep turning up together; report how many circles, how big the largest is, and three characters in it.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s50 empty` -> 01.png

Saw: a dark start page. Left: "Open project or file...", "New from data...". Middle: Recent projects (empty). Right: Samples -- Les Miserables (77 characters, "Good for a first look at communities and who holds the story together"), Zachary's karate club, College football, Florentine families. A usage-data banner at the bottom with "Share usage data" / "No thanks".

Nadia: "OK, there's the Les Miserables one right there under Samples. First I'll get rid of the data-sharing box -- bank laptop, the answer is no thanks."

## Step 2 -- dismiss banner, open the sample

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the network drawn as blue balls and gray lines in the middle. Right panel "Graph -- From Les Miserables", tabs Style / Values, Overview: Nodes 77, Edges 254, Density 0.08681, Components 1, "Edges per ..." 1 to 36. Left panel: a search box "Find nodes, edges, values", "Selection", "Everything", and at the bottom a hint: "Analyze (flask icon) in the toolbar (Shift+A) to add results here". Bottom toolbar: flask, a chart-ish icon, "3D", magnifier.

Hesitation: "Components 1" -- is a component a circle? One circle can't be right for a whole novel. Probably that just means everything is connected.

Nadia: "There's a little note that says Analyze is the flask. 'Pick out the circles' sounds like an analysis, so I'll press the flask."

## Step 3 -- open Analyze

Command: `--step --click-at 679,864` (tool: button "Analyze") -> 03.png

Saw: a pop-up list with a "Filter analyses" box at the top, heading "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank ("Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (grayed, "Select a node first"), Most flow... It scrolls further.

Hesitation: all of these are about ranking single nodes; "Start here" on PageRank pulls the eye but that is not what I was asked. Nothing says "circles".

Nadia: "None of these are circles. There's a filter box with the cursor in it -- I'll just type 'group' and see what's left."

## Step 4 -- filter for "group"

Command: `--step --type "group"` -> 04.png

Saw: heading "Find groups": Louvain ("Start here", "Which nodes form densely linked groups."), Leiden, Label propagation, Girvan-Newman, Markov clustering, Spectral clustering, Hierarchical clustering.

Hesitation: seven ways to find groups and I don't know any of the names. "Start here" on Louvain is the only thing telling me what to pick.

Nadia: "Louvain says start here and 'densely linked groups' -- that's characters who keep turning up together. Click it."

## Step 5 -- Louvain settings

Command: `--step --click "Louvain"` -> 05.png

Saw: a small form: "Louvain -- Which nodes form densely linked groups.", Resolution 1, a collapsed "Advanced", "Under a second", and a blue Run button.

Hesitation: "Resolution" means nothing to me. Leaving it at 1 -- if it's the default someone picked it for a reason.

Nadia: "Run."

## Step 6 -- Run

Command: `--step --click "Run"` -> 06.png

Saw: the balls are now colored. Left panel: "Louvain 6" with Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8). A color key over the top-left of the drawing, "Color: Louvain", Group 1 to 6. The numbers add to 77, same as the node count.

Nadia: "Good, that was quick. Six circles, the biggest is Group 1 with 20 -- the yellow ones. But no names anywhere on the picture. I need three characters. I'll click Group 1 in the list and hope it shows who's in it."

## Step 7 -- click Group 1 in the left list

Command: `--step --click "Group 1"` (tool: ambiguous, took the list row) -> 07.png

Saw: Group 1 highlighted in the left list with an eye icon. Right panel now says "Group 1 -- Group from Louvain, Oct 7", tab Style open: Fill, Color E69F00. The picture did not change -- nothing lit up, still no names.

Hesitation: I wanted the people in it, and I got a color picker. Did I just open something that changes the color? I didn't touch it.

Nadia: "There's a Values tab next to Style. Maybe the names are in there."

## Step 8 -- Values tab of Group 1

Command: `--step --click "Values"` -> 08.png

Saw: Summary -- Size 20, Made by Louvain. Members -- "First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois.

Nadia: "There they are. Valjean, Fauchelevent, Bamatabois -- that'll do. I have what I was asked for, I'm stopping here."

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s50`

## Debrief (in character)

**Finished?** Yes. The program found 6 circles (Louvain). The largest is Group 1 with 20 characters. Three of them: Valjean, Fauchelevent, Bamatabois (also MlleBaptistine, MmeMagloire, Labarre and others in the first 10 shown).

**Ease: 6 out of 7.** Seven clicks and some typing, about the length of one easy alert. The note at the bottom left pointing at the flask is what got me going; without it I would have stared at the toolbar icons.

**What confused me or slowed me down:**

- The first Analyze list is all ranking -- Degree, Betweenness, PageRank with a "Start here" tag. Nothing about groups or circles on the first screen. I only found the groups because I typed "group" into the filter. Someone who doesn't type would scroll or take PageRank because it says start here.
- Seven group methods with names I've never heard of. I picked Louvain only because it also said "Start here". I have no idea whether another one would give a different answer, and if QA asked "why six?" I could not tell them.
- "Resolution 1" on the run form -- no clue what it does; I left it alone.
- "Components 1" in the overview before I ran anything made me wonder for a second if that was the circle count.
- Clicking Group 1 opened a color picker (Style tab) first, not the people in it. I worried I might change something. The names were one tab over, under Values.
- The picture never shows names, so I can't tell from the drawing which yellow ball is Valjean. For an alert file I'd want the picture with names on it; here I'd have to type the names in by hand next to a screenshot.
- The member list says "First 10" -- fine for this task, but I didn't see how to get the other ten.
