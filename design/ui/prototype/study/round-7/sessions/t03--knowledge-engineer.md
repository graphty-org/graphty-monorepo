# Session: community structure and resolution -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).
Task as given by the moderator: "How many circles of characters does the story fall into, how big
is each one, and what is the biggest one like? Then ask for fewer, larger circles and see what that
would take. The data on screen is a sample: characters of the novel Les Miserables, linked when they
appear in the same chapter. If that is not your line of work, treat them as your own people or
things."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t03--knowledge-engineer/.

## Start screen (shots/tasks/t03/01.png)

"Co-appearance graph, every node orange-to-brown by PageRank. There is a row called Louvain, '6
groups'. Fine -- Louvain, I know what that is, modularity maximization. But the canvas is painted by
PageRank, so nothing I see is the communities. The groups are in the list; I will start there."

## Step 1 -- open the Louvain row

    timeout 120 node app-b/study.mjs --try .../01.png task:t03 --click "Louvain"

"A table opened underneath: '6 communities', size, density, edges inside, edges leaving. 25, 17,
10, 10, 9, 6. That adds to 77, which is what I expect for this dataset. Let me check the arithmetic
instead of trusting it: 25 nodes have 300 possible pairs, 44 inside, 0.147 -- correct. 6 nodes with
15 inside, density 1, a clique -- correct. Edges inside sum to 194; 254 total minus 194 is 60
crossing edges, and edges leaving sum to 120, which is 60 counted from both ends. Consistent. Good.
That is the first thing in this tool I would defend in a meeting."

"The biggest one, Community 1, is the loosest: density 0.147 and more edges leaving (49) than inside
(44). In my world that is the pattern of a bad entity-resolution merge or a hub class that pulls
everything in. I want to see who is in it."

"Annoyance: the right panel still talks about PageRank. I clicked Louvain and the inspector did not
follow."

## Step 2 -- click Community 1

    --click "Louvain" --click "Community 1"

"Inspector now says Community 1, 'Paints 25 nodes', but 'Covered for Color by PageRank'. So the
color is there and hidden under another layer. The table jumped back to Nodes and shows all 77, not
the 25. The node table has a 'group' column with values 2, 8, 4 -- that is not Louvain, that is the
group attribute that came in the file. Two different 'groups' on one screen. Please do not call
both of them group."

## Step 3 -- try the Data tab

    --click "Louvain" --click "Community 1" --click "Data"

"That went to the left rail's Data section, not the inspector tab. Still useful: 77 nodes, 254
edges, undirected, one connected component. Those match the published counts for this dataset.
Results lists Louvain and PageRank as columns."

## Step 4 -- click "Paints 25 nodes"

    --click "Louvain" --click "Community 1" --click "Paints 25 nodes"

"I expected the 25 members. I got a selection of '5 nodes' and a 'Why this look' panel. 25 became
5 with no explanation. That is exactly the kind of mismatch that makes me stop trusting the numbers.
Strike one."

## Step 5 -- hide PageRank so I can see the communities

    --click "Louvain" --click "Community 1" --click "PageRank" --hover "Hide"
    --click "Hide PageRank" --click "Louvain"

"Tooltip: 'Hide PageRank'. Clicked it. The eye is crossed out -- and the canvas is still orange with
the PageRank legend. The list says '1 hidden row still paints.' So hiding a row does not stop it
painting? Then what does hide mean? I never got the communities on the canvas. Strike two, though I
will keep going because the table was honest."

## Step 6 -- find the members of Community 1

    --click "Louvain" --click "Community 1" --hover "More"
    --click "Louvain" --click "Community 1" --click "More actions"
    --click "Louvain" --click "Community 1" --click "More actions" --key Escape --click "Community 1" --click "More actions"
    --click "Louvain" --click "Community 1" --click "More actions" --click "Show members in table"
    --click "Louvain" --click "Community 1" --click "More actions" --click "Show members in table" --click "Select members"   (nothing on screen is called "Select members")

"There is a menu with 'Select members' and 'Show members in table' -- good, that is what I want.
But every time I open it, it is for Community 3, not the one I selected. 'Show members in table'
then filters to 'Community 3, 10 of 77 nodes': Myriel, Mlle.Baptistine, Mme.Magloire... That works,
for the wrong community. I could not get the same menu for Community 1."

## Step 7 -- column chooser

    --click "Nodes" --click "Columns: 7 of 7"

"Is there a Louvain column I can sort the node table by? The chooser offers label, group, degree,
betweenness. No Louvain, even though the Data section lists Louvain under Results. So no."

## Step 8 -- the Louvain run itself

    --click "Louvain" --click "Community 1" --click "from Louvain"

"This is the page I wanted from the start. 'Run from Louvain, Sep 28'. 6 communities, 0
unconnected nodes, modularity 0.565 with a plain-language line. Sizes as a bar strip and a list with
hubs: Community 1, 25, 'Hub Gavroche, 16 links inside'. 'Made with': method, weight (loaded weight,
value), seed 7. A seed! Reproducible. I like that."

"Careful reading: 'Hub Gavroche, 16 links inside' but the table says Community 1 has 44 edges
inside. I worked out that 16 is Gavroche's own links inside the community, not the community's. The
wording invites the wrong reading."

"So the biggest circle: 25 characters, the loosest of the six, held together by Gavroche, more
links out than in. In the novel that makes sense -- the street, the barricade, the people who touch
everyone. In my graph I would call it suspicious and open it."

## Step 9 -- fewer, larger circles

    --click "Louvain" --click "Community 1" --click "from Louvain" --click "All options..."
    --click "Louvain" --click "Community 1" --click "from Louvain" --click "All options..." --click "1.0"
    --click "Louvain" --click "Community 1" --click "from Louvain" --click "All options..." --click "1.0" --click "Rerun"
    --click "Louvain" --click "Community 1" --click "from Louvain" --click "All options..." --click "1.0" --click "All options..."

"Options: Resolution 1.0, Level 'Final, most merged', seed, tolerance. Resolution is the gamma in
modularity; lower it, say 0.5, and you get fewer, bigger communities. I know that. Nothing on screen
says which direction does what -- someone who does not know Louvain would have no idea that 'fewer
circles' means 'smaller number here'."

"I changed resolution. A bar appeared: 'Settings changed since the run -- Rerun / Revert'. Good, it
does not silently recompute. Rerun: 'Rerunning, cannot be stopped' and then nothing -- the old six
communities stay on screen. When I reopened the options to check what value I had entered, it still
said 1.0 and the 'changed' bar had gone. I do not know what I actually ran."

    --click "Louvain" --click "Community 1" --click "More actions" --click "Analyze..."
    --click "Louvain" --click "Community 1" --click "More actions" --click "Analyze..." --click "Which nodes form densely connected groups."
    --click "Louvain" --click "Community 1" --click "More actions" --click "Analyze..." --click "Which nodes form densely connected groups." --click "1.0" --click "Run as copy"   (nothing on screen is called "1.0")

"Second route, through Analyze: a short Louvain form with Resolution and two buttons, 'Run as copy'
and 'Update Louvain row'. 'Run as copy' is exactly right for me -- keep the six-group run and put the
coarser one next to it so I can compare. Its tooltip says it 'would add Louvain as a copy at the top
of the list, running'. That is where I stop: I found the lever twice, I never saw the answer."

## After the session

Did I succeed? The first half, yes: 6 communities, sizes 25, 17, 10, 10, 9, 6, and the biggest is a
loose 25-character group around Gavroche with density 0.147 and more edges leaving than inside. The
second half only partly: what it takes is lowering the resolution and rerunning (ideally as a copy),
but I never saw the resulting circles, and the screen never tells you lower means fewer.

Single Ease Question: 4 of 7. The run page and the community table are clear and the numbers
check out; getting there took detours, and the canvas never showed me the communities.

Would I use this instead of my current tool? Not for my knowledge graph -- there is still no way
to get Turtle or a SPARQL result in, and that decides it. For a quick community pass on an exported
edge list I would consider it over a notebook with networkx, because the run page records method,
weight, seed and resolution and the counts reconcile. But three things would have to be fixed
first: hiding a layer must stop it painting, "Paints 25 nodes" must not turn into 5, and the menu
must belong to the row I selected.
