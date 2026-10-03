# Session: try the program on a sample before using your own data -- genomics Cytoscape user (Maren)

Task as given by the moderator: "You have just installed this program to see whether it could help with your work, but your own data is not ready yet. Before you spend time on your own file, you would like to see the program working on something. Get something onto the screen to try it on, and tell us what it is."

Start screen: shots/tasks/r8-t02/01.png. Renders: tmp/round-8-sessions/r8-t02--genomics-cytoscape-user/01.png to 05.png. All commands were run from design/ui/prototype.

## Step 1 -- start screen

What I see: on the left, "Open project or file..." and "New from data...". On the right, a "Samples" list. At the bottom, a banner asking me to share usage data.

Thinking aloud: "OK, the banner first. 'We will never see the data you analyze' is nice, but my PI would not want anything leaving the machine, so: No thanks. 'Files are read on this computer and never uploaded' is good, that's the first thing I'd ask. Samples... Les Miserables, karate club. I don't care about a novel. 'Protein interactions, 300 proteins, good for hubs and the paths that link two proteins.' That one is closest to what I actually do. A 300-node PPI is about the size of a STRING network from my DEG list. That's the one."

## Step 2 -- decline the banner, open Protein interactions

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t02 --click "No thanks" --click "Protein interactions"

Result (01.png): a network opened, but the title bar says "Les Miserables", and the nodes are labeled Valjean, Javert, Cosette, Fantine, Marius. It's colored orange to brown by "PageRank".

Thinking aloud: "Wait. I clicked proteins. This is the novel. Valjean is not a protein. Did I misclick?"

## Step 3 -- check the start screen again

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t02 --click "No thanks"

Result (02.png): the start screen, a toast "Usage data stays off." with a Settings button. The Protein interactions entry is clearly its own row, under the karate club.

Thinking aloud: "Fine, the banner went away and it told me so. And Protein interactions is clearly its own row. I didn't hit the wrong line."

## Step 4 -- click it by its count instead

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t02 --click "No thanks" --click "300 proteins"

Result (03.png): Les Miserables again, identical.

Thinking aloud: "Same thing. Twice now I asked for proteins and got the novel. And nothing told me. No 'this sample isn't available', no error, just a different network than the one I picked. That is exactly what I hate: it does something other than what I asked and doesn't say so."

## Step 5 -- look for a way to switch from inside

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t02 --click "No thanks" --click "Protein interactions" --click "Les Miserables"

Result (04.png): the title menu shows Rename, Open project or file, Save, Export, Apply recipe or style file, Version history, Save as, Close project. No samples. On the right, a summary panel: "Co-appearances, Graph from miserables.gexf", 77 nodes, 254 edges, undirected, density 0.0868, 1 connected component, average degree 6.60, highest degree 36, plus a degree distribution plot.

Thinking aloud: "No way to switch samples here. But the right panel is actually good: node count, edge count, number of components, highest degree, all as numbers. That's what I'd check first in Cytoscape. And it names the file, miserables.gexf, so now I'm completely sure it's the novel and not my proteins. A GEXF file, I'd never have that, I'd have a gene list."

## Step 6 -- one last try, clicking the description text

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t02 --click "No thanks" --click "Human proteins and the interactions between them. Good for hubs and the paths that link two proteins."

Result (05.png): Les Miserables again.

Thinking aloud: "Three times. I'm done trying for proteins. Something is on the screen and I can look at that."

## What is on screen (my answer to the moderator)

"It's the Les Miserables network, the characters from the novel, 77 nodes and 254 edges, one connected component. Characters are linked when they appear together, I think, it says 'Co-appearances'. The nodes are colored orange to brown by PageRank, 0.0033 to 0.075, and there's a little legend box for that in the corner, which I'll grant is more than Cytoscape gives me. Valjean is in the middle, obviously. On the left there's a list of things already done to it: PageRank, Louvain with 6 groups, shortest paths, a top 9 by degree, a watchlist, notes. It looks like someone's worked example. But it's not what I picked. I picked Protein interactions, three times, and it gave me this every time without saying why."

Things I noticed along the way:
- I didn't open it in 3D, and it's flat. Good. (There's a cube button at the bottom I didn't touch.)
- The PageRank colors are a single orange-to-brown ramp, not red-green. Fine for my PI.
- The left panel is dense: "Labels show... 1 node", "Valjean t... 2 nodes", "Top 9 by de... 9 nodes" are all cut off. "1 row not listed still paints" -- I have no idea what that means.
- "PageRank" as the first coloring, nobody told me what high PageRank means for a character. For genes I'd want that in one line.

## Wrap-up

Did I succeed? "Partly. I got something on the screen and I can tell you exactly what it is, because the side panel names the file and counts the nodes. But I didn't get the thing I chose. I wanted the protein network and I got the novel, three times, with no message. If this happens with my own file, if I load my genes and it shows me something else without saying so, I'm out."

Single Ease Question (1 = very difficult, 7 = very easy): 3. "Getting something on screen took one click. Getting the thing I asked for, I couldn't."

Would I use this instead of Cytoscape? "Not from this. I haven't seen it do anything with genes, and the one biology sample wouldn't open. The summary panel with the counts and the legend that shows up on its own are nice, I'll give it that. But I still don't know where I'd paste a gene list, there's no STRING, no MCODE, no enrichment that I've seen, and nothing to cite. And the first thing it did was silently swap my choice for a different dataset, which is precisely the kind of thing that makes me stop trusting the numbers. Maybe for poking around. The paper figure stays in Cytoscape."
