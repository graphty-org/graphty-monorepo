# Session: communities and fewer, larger circles -- Gephi holdout (Dr. Mara Lindqvist)

Task as given: "How many circles of characters does the story fall into, how big is each one, and
what is the biggest one like? Then ask for fewer, larger circles and see what that would take."
Data: Les Miserables co-appearances. Viewport 1440x900.

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t03--gephi-holdout/.

## Steps, thinking aloud

**01 (start screen, shots/tasks/t03/01.png).** "Map colored by PageRank, sized by degree, with a
legend. Nice, Gephi can't do that. On the left a list: PageRank, Louvain '6 groups', Shortest
paths, Watchlist, a folder. Louvain is my modularity. Six groups. That row is my first click."

**02.**
`timeout 120 node app-b/study.mjs --try .../02.png task:t03 --click "Louvain"`
"A Louvain table at the bottom: 6 communities. Sizes 25, 17, 10, 10, 9, 6. That sums to 77, the
node count, so nobody is missing. Community 1 is the biggest: 25 nodes, density 0.147, 44 edges
inside, 49 leaving. More of its edges leave than stay inside, so it's a loose community, the
hub-and-spokes type. The others are tighter: Community 6 has density 1, a clique. Good: size,
density, inside and leaving in one table is more than Gephi's modularity report gives me. But the
map is still PageRank orange. I can't see where the communities sit."

**03.**
`--click "Louvain" --click "Community 1"`
"I clicked Community 1 to see who's in it. The tree expanded to the six communities and the right
panel says 'Community 1, Paints 25 nodes, Covered for Color by PageRank.' But the bottom table
jumped to all 77 nodes instead of showing me the 25. And that table has a 'group' column with 2,
8 and 4. Is that Louvain or the file's own group attribute? I think it's the file's. Two kinds of
'group' side by side, and I'd have to stop and check which one I'm reading. It still doesn't tell
me who is in the biggest community."

**04.**
`--click "Louvain" --click "Community 1" --click "Data"`
"I meant the Data tab on the right panel and got the Data page on the left rail. Still, it gave me
the checks I'd do anyway: 77 nodes, 254 edges, undirected, 1 component, weight 'value'. That
matches miserables.gexf as I know it. Results list Louvain and PageRank."

**05.**
`--hover "Hide PageRank"`
"I guessed the eye's name. 'Hide PageRank. Alt-click: show only this row.' OK, that's the
visibility toggle."

**06.**
`--click "Hide PageRank" --click "Louvain"`
"Eye crossed out. Map and legend still say PageRank, still orange. So I hid it and nothing
changed? That I don't trust. In Gephi I'd just hit Partition, modularity_class, Apply, and see
the colors. Here I still have no picture of the communities."

**07.**
`--click "6 groups"`
"Right panel is now Louvain: 'Run from Louvain, Sep 28', paints 77 nodes, 'Eight distinct' palette.
So it is painting the communities, it's just under PageRank. The run link should be the parameters."

**08.**
`--click "6 groups" --click "from Louvain, Sep 28"`
"The link opened an 'Analyze' picker: Recent, Rank nodes and edges, a search box. It's the
Statistics panel. Not what I expected from a run link. I wanted to see what the Sep 28 run used."

**09.**
`... --click "Which nodes form densely connected groups."`
"Louvain parameters: Weight 'value (loaded weight)', 'Higher means Stronger', Resolution 1.0,
'Under a second', 'Run as copy' or 'Update Louvain row'. Good that the weight is explicit and
that I can run a copy without overwriting. No seed, no randomize toggle, no modularity score
anywhere. Reviewer two will ask about the seed."

**10.**
`... --hover "Resolution"`
"No tooltip. This matters: in Gephi a resolution ABOVE 1 gives fewer, larger communities; in
NetworkX's louvain_communities it's the other way round. Nothing here tells me which convention
this is. I'll go with my hands, which are Gephi."

**11.**
`... --click "1.0" --key Backspace --key Backspace --key Backspace --key 2`
Tool said: nothing on screen is called "1.0". "Right, click the field by its label instead."

**12.**
`... --click "Resolution" --key Backspace --key Backspace --key Backspace --key 2`
"Field reads 2."

**13.**
`... --click "Run as copy"`
"'Would add Louvain as a copy at the top of the list, running.' No new count, no new table. So I
don't know whether 2 gave me fewer circles or more. I stop here."

## Outcome

- Part one, answered: 6 communities of 25, 17, 10, 10, 9 and 6 (77 total). The biggest is
  Community 1: 25 nodes, density 0.147, 44 edges inside and 49 leaving, so loose and outward
  facing. I could not find out who is in it. Clicking it did not list its members, and the map
  stayed colored by PageRank even after I hid PageRank.
- Part two, partly: I found the knob (Louvain > Resolution, run as a copy) and that's what it
  takes. But the screen never told me which direction means "fewer, larger", and I never saw a
  result, so I can't say whether my 2.0 was right.
- Succeeded? Half. Counts and sizes yes. "What is it like" only as numbers. Fewer circles: I
  found the knob but don't know which way to turn it.
- Single Ease Question: 4 of 7.
- Would I use it instead of Gephi? No. The community table, with size, density and edges
  inside versus leaving, is better than Gephi's modularity report, and run-as-copy fixes the
  overwrite problem I complain about every year. But I couldn't see the communities on the map,
  couldn't list a community's members, and resolution doesn't say its direction or show a seed. I
  can't put a partition in a paper if I can't say which convention made it. I'd stay on Gephi,
  maybe show the table in class.

## Problems seen

1. Hiding PageRank (eye crossed out) left the map and legend on PageRank, so the communities
   never became visible. Severity high.
2. Clicking a community row did not list its members; the bottom table switched to all 77 nodes.
   Severity high for "what is the biggest one like".
3. Resolution has no direction hint, and Gephi and NetworkX use opposite conventions. Severity
   high.
4. No seed, randomization or modularity score in the Louvain panel. Severity medium.
5. The "from Louvain, Sep 28" run link opens the generic Analyze picker, not that run's settings.
   Severity medium.
6. A file attribute called "group" sits beside Louvain "communities" and Group 2 and Group 8
   rows, so "group" means two things. Severity medium.
7. Two controls labeled "Data" (rail and inspector tab); I hit the wrong one. Severity low.
