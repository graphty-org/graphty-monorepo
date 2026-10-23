# Session r2-s52 -- Grace (nonprofit operations analyst), task T8: circles of characters, Les Miserables

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s52 empty`
Saw (01.png): a start page. Left: "Open project or file...", "New from data...", a note that files are read on this computer and never uploaded (good -- I always look for that). Right: Samples, and Les Miserables is right at the top, "77 characters", "Good for a first look at communities". A usage-data box at the bottom asks me to share usage data.
Next: say No thanks to the usage data, then open Les Miserables.

## Step 2

Command: `--step --click "No thanks" --click "Les Miserables"`
Saw (02.png): the network drew. Right panel says Nodes 77, Edges 254 -- 77 matches the "77 characters" on the start page, good. Words like "Density" and "Components" I'd skip. Bottom-left says "Analyze (flask) in the toolbar (Shift+A) to add results here", and there is a flask button in the toolbar under the picture.
Next: click the flask (Analyze) to look for something like "groups" or "circles".

## Step 3

Command: `--step --click "Analyze"`
Saw (03.png): a long menu, "Rank nodes and edges": Degree, Betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS... Lots of jargon. Each has a one-line plain description, which helps. None says "groups" yet; the list goes further down. There's a "Filter analyses" box at the top.
Next: type "group" in the filter box instead of reading the whole list.

## Step 4

Command: `--step --type "group"`
Saw (04.png): "Find groups" -- exactly my word. Louvain is marked "Start here", "Which nodes form densely linked groups." The names (Louvain, Leiden, Girvan-Newman) mean nothing to me, but the "Start here" tag and the description make the choice easy.
Next: click Louvain.

## Step 5

Command: `--step --click "Louvain"`
Saw (05.png): a small Louvain box with "Resolution: 1" (no idea what that means, I'll leave it), "Advanced", "Under a second", and a blue Run button.
Next: click Run, leaving the default.

## Step 6

Command: `--step --click "Run"`
Saw (06.png): the dots are colored now and a legend "Color: Communities" shows Group 1 to Group 6. The left list has "Communities 6" with counts: Group 1 = 20, Group 2 = 17, Group 3 = 11, Group 4 = 11, Group 5 = 10, Group 6 = 8. Let me add: 20+17+11+11+10+8 = 77. Everyone is in a group. Parts one and two done: 6 circles, largest is Group 1 with 20 characters (the yellow one).
Hesitation: no names show on the dots, so I can't yet name anyone in it.
Next: click "Group 1" in the left list and hope it shows who is in it.

## Step 7

Command: `--step --click "Group 1"`
Saw (07.png): Group 1 is highlighted in the list; the right panel now says "Group 1" with a Style tab showing its color (E69F00). No names anywhere. There is a "Values" tab next to Style.
Next: click "Values" on the right, hoping it lists who is in the group.

## Step 8

Command: `--step --click "Values"`
Saw (08.png): Values for Group 1: Summary "Size 20", "Made by Communities", and "Members -- First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois. There are my names. Part three done.
Small note: it shows only the "First 10" of 20 and I see no way to see the other 10 or copy the list out -- for my real work I'd want all of them to paste into Excel. Not needed for this task.

## Step 9

Command: `--end rounds/round-2/sessions/r2-s52`
Session ended.

## Answer and debrief (in character)

- Finished: yes.
- How many circles: 6 ("Communities 6", called Group 1 to Group 6).
- Largest: Group 1, 20 characters (sizes 20, 17, 11, 11, 10, 8 -- adds to 77, so everyone was placed).
- Three characters in it: Valjean, Fauchelevent, MlleBaptistine (also MmeMagloire, Marguerite, Bamatabois...).
- Ease: 6 out of 7. Eight clicks, no dead ends.
- What helped: the sample was right on the start page; the hint pointing at the flask button; the filter box in the analysis menu let me type "group" and land on "Find groups"; "Start here" on Louvain took the guesswork out of choosing among names I don't know; the group sizes are listed right there and add up to the total.
- What confused or slowed me:
    - The analysis names themselves (Louvain, Leiden, Girvan-Newman, Resolution) are jargon; I picked by the "Start here" tag and the one-line description, not the name.
    - The menu opens on a long "Rank nodes and edges" list; the groups section is out of sight until you scroll or filter. Someone who doesn't think to type would have to scroll past Katz and HITS.
    - After running, the picture has colors but no names on the dots, so finding who is in a group took a guess: click the group, then switch the right panel from Style to Values. Clicking the group first showed me a color picker, which isn't what I wanted.
    - The members list stops at "First 10" of 20 with no visible way to see the rest or copy them -- I'd need that for my list for the development director.
    - The words "Group" (legend, list) and "Communities" (heading, "Made by") are used for the same thing; fine, but I'd say "groups" on a slide.
