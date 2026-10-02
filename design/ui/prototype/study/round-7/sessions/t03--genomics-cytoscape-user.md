# Session: clusters in the co-appearance network -- Maren (genomics postdoc, Cytoscape user)

Task as given: "How many circles of characters does the story fall into, how big is each one, and what is the biggest one like? Then ask for fewer, larger circles and see what that would take."

Renders are in design/ui/prototype/tmp/round-7-sessions/t03--genomics-cytoscape-user/. Every command was run from design/ui/prototype, as `timeout 120 node app-b/study.mjs --try <render> task:t03 <steps>`; only the steps are listed below.

## Start screen (shots/tasks/t03/01.png)

"OK. A network, all orange, sized by degree, colored by PageRank. Fine. 'Circles' -- they mean clusters, modules. In Cytoscape I'd run MCODE or MCL. On the left there is a list, and one row says Louvain, 6 groups. That's a clustering. So the answer to 'how many' is probably sitting right there: 6. But I want to see them, and the network is all one color, so I can't."

## 02 -- `--click "Louvain"`

A table opened under the network: "6 communities", with size, density, edges inside, edges leaving. Sizes 25, 17, 10, 10, 9, 6.

"Good, that's a real table with numbers. 25+17+10+10+9+6 = 77, which matches the node count elsewhere, so nobody got dropped. Biggest is Community 1, 25 characters, density 0.147 -- that's the loosest of the six -- and it has more edges leaving (49) than inside (44). So the biggest one isn't really a tight module, it's the sprawling one. Community 6 has density 1, a clique. The panel on the right still says PageRank though, and the network is still orange. I clicked Louvain and the picture didn't change. Why?"

## 03 -- `--click "Louvain" --click "Community 1"`

The tree opened six Community rows; right panel says Community 1, paints 25 nodes, "Covered for Color by PageRank". The table at the bottom flipped back to all 77 nodes.

"So it's orange because PageRank is on top of it. OK, that I can read. But I asked for Community 1 and the table went to all 77 nodes, sorted by degree. Who is IN community 1? There's a 'group' column with numbers 2, 8, 4 -- is 'group' the community? It has the same colored squares. Valjean is group 2 with a yellow square and Community 1 is yellow too... I don't trust that. Two different words for what might be two different things."

## 04 -- `--click "Louvain" --click "Community 1" --click "Data"`

"I wanted the Data tab on the right. It sent me to a whole Data page on the left instead -- sources, attributes. Not what I meant. Back."

## 05 -- `... --click "Community 1" --hover "Covered for Color by PageRank"`

Tooltip: "Covered by PageRank for Color on 25 of 25".

"Fine. Still doesn't tell me who's in it."

## 06 -- `... --click "Community 1" --click "Paints 25 nodes"`

Selection now says 5 nodes; the panel says "5 nodes", "Why this look".

"I clicked 'Paints 25 nodes' and got 5 nodes selected. 25 became 5. That is exactly the kind of thing that makes me stop trusting the counts. Which 5? I don't know."

## 07 -- `--click "6 groups"`

Right panel: Louvain, "Run from Louvain, Sep 28", paints 77 nodes, color "Eight distinct".

"Clicking the 6 groups text actually selected the Louvain row. Now: fewer, bigger clusters. In MCL that's the inflation value. I need the parameters. 'from Louvain, Sep 28' is a link, try it."

## 08 -- `--click "6 groups" --click "from Louvain, Sep 28"`

An Analyze picker opened with a list of algorithms (Louvain, PageRank, Shortest path, Betweenness ...).

"I wanted the settings of the run I already have, not a catalog. But Louvain is at the top under Recent."

## 09 -- `... --click "Which nodes form densely connected groups."`

Louvain dialog: Weight = value, Higher means Stronger, Resolution 1.0, "Under a second", buttons Run as copy / Update Louvain row.

"There it is. Resolution 1.0. Nothing tells me which way to move it. In MCL, lower inflation gives bigger clusters; I'd guess lower resolution here too, but that's a guess. 'Under a second' is nice -- Cytoscape never tells me how long. And 'Run as copy' means I keep the old six. Good, I want them side by side."

## 10 -- `... --click "Resolution"`

"Clicked the label hoping for a hint. Nothing."

## 11 -- `... --click "1.0"`

Tool: nothing on screen is called "1.0".

"I can't get into the box to change it. So I can't actually try 0.5."

## 12 -- `... --click "Run as copy"`

Toast: "Would add Louvain as a copy at the top of the list, running".

"So it would rerun -- at 1.0, the same thing. I still don't know what number gives fewer groups, or how many I'd get."

## 13 -- `--click "6 groups" --click "More"`

Menu on Louvain: Rerun, Run as copy, Restore the suggested look, Show members in table, Lay out by these groups, Compare with another run..., Lock, Hide in list, Add note, Delete.

"'Show members in table' -- that's what I wanted ten minutes ago. Hidden behind the dots."

## 14 -- `--click "Louvain" --click "Community 1" --click "More" --click "Show members in table"`

Table filtered to "Community 3, 10 of 77 nodes": Myriel, Mlle.Baptistine, Mme.Magloire, Countess de Lo, Cravatte, Geborand ...

"That's Community 3, not 1. I had Community 1 selected. Now I've got the bishop's household. Wrong cluster."

## 15 -- `... --click "Community 1" --hover "More"`

Tooltip on the right panel's dots: "More actions Shift+F10".

## 16 -- `... --click "Community 1" --click "More actions"`

Menu opened -- but the header says Community 3 again, and the right panel switched to Community 3. Menu: Select members, Show members in table, Keep as set, Frame members, Compare with, Export ...; a gray line says "A run's groups renumber when it reruns; Keep as set to name one".

"Again Community 3. Every time I ask for the menu of the biggest cluster I get Community 3. I give up on listing the 25. The note about renumbering is useful, though -- MCODE does that to me too and nobody warns you."

## 17 -- `--click "6 groups" --click "More" --click "Compare with another run..."`

The whole screen changed to a different file: "Transfers, March 2026", 3,000 accounts, Louvain March vs April, Agreement 0.449.

"Where did Les Miserables go? This is someone's bank transfers. I didn't open that. If that were my unpublished data in somebody else's window I'd be very unhappy. The comparison itself -- agreement score, matched pairs, size changes -- is the kind of thing I'd want for comparing two resolutions. But not like this."

## 18 -- `--click "6 groups" --click "More" --click "Rerun"`

A new row "Betweenness 2" appeared at the top, with a progress bar.

"I said rerun Louvain and it started betweenness. No. I'm done."

## Outcome

- How many circles: 6 (Louvain). Sizes 25, 17, 10, 10, 9, 6 -- adds up to 77, all characters.
- Biggest: Community 1, 25 characters, the loosest of the six (density 0.147) and more edges leaving it (49) than inside (44). I never got to see who is in it; every attempt showed me Community 3 or five unexplained nodes.
- Fewer, larger circles: I found the Resolution field (1.0) and "Run as copy", but could not change the value, nothing says which direction gives bigger groups, and Rerun started the wrong algorithm. I did not get fewer circles.

Did I succeed? Half. The count and sizes yes, quickly. What the biggest one is like, only by numbers, not by members. Fewer circles, no.

Single Ease Question: 3 of 7.

Would I use this instead of Cytoscape? No. The community table with size, density and edges in/out is better than what MCODE gives me, and "under a second" plus "run as copy" are things I'd like. But I clicked Community 1 and got Community 3, clicked 25 nodes and got 5, clicked rerun and got betweenness, and one menu dropped me into someone else's file. After that I don't trust what's on screen. And there's no MCL or MCODE, no enrichment per cluster -- it even says enrichment isn't part of it -- so I'd have to leave for half my pipeline anyway.
