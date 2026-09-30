# What groups are there -- Dana, supply chain risk analyst

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker. Lives in
Excel and Power BI; has tried Gephi and a Power BI network visual and dropped both. Not a network
scientist. Mild presbyopia; small grey labels are a real problem for her.

**Task as given by the moderator:** "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

**Screens seen:** the main menu's Algorithms list; a finished Louvain run in the right-hand panel;
the Communities table in the bottom table; one community selected in the right-hand panel (the
"Compared with the rest" section); a single protein selected with the node table filtered to its
community; the comparison screen (opened by mistake from "Compare with...").

Renders the participant looked at:
- `../../../shots/screens__results-panel--catalog.png`
- `../../../shots/record/screens__results-panel--louvain.png`
- `../../../shots/screens__results-panel--louvain-table.png`
- `../../../shots/screens__inspector-group.png`
- `../../../shots/screens__styles-list-group-compare.png`
- `../../../shots/record/screens__inspector-group-row.png`
- `../../../shots/screens__comparison.png`
- `../../../shots/screens__table-dock.png` (glanced at the export button, left)

## Think-aloud

**Before starting.** "Proteins. OK, not my world, but fine -- I'll pretend they're suppliers.
'Groups.' In my head that's commodity families, or regions. Let's see what it thinks a group is."

**The picture as it opens.** *Looks at the grey hairball.* "Right, so this is the hairball.
Three hundred dots, 1,262 lines. Nice hairball. There are clumps, I can see maybe seven or eight
blobs with my eyes, but nothing's telling me what they are. Right-hand side: 'components 3'. Is
that the groups? Three groups? That can't be it, I can see more than three clumps."

"There's a 'Results: Connected components 3'. I don't know what a component is. I'll assume it's
not what the moderator means, because the picture obviously has more than three."

**Looking for a button.** "There's no 'group' or 'cluster' button anywhere on the screen. Menu,
top left." *Opens the menu, hovers Algorithms.* "Algorithms. Great. That's the word I skip."

*Reads the list.* "Centrality -- that's the chokepoint stuff, I've heard that. Community. OK,
'community' is the closest word to 'groups' on this list. Under it: Girvan-Newman, Label
propagation, Leiden, Louvain. Four people's names and one I can almost read. Which one? No
sentence, nothing saying what the difference is. If this were my data I'd close the menu here,
honestly. For the task I'll pick one. Louvain's at the bottom, it's a town in Belgium, sounds
like the default. I'll take that." *[Moderator note: picked by guess; she would not have clicked
any of the four on her own data.]*

"'Label propagation' I'd have avoided -- sounds like it'll relabel my data."

**The finished run.** *Picture is now coloured.* "OK, now we're talking. Colours. And the legend
bottom right says Community 1, 62; Community 2, 43; Community 3, 36; Community 4, 36; 6 more. So
ten groups. That's an answer, sort of."

"Right panel. 'Groups 10 communities.' Largest 62 proteins. 'Single proteins 2, no
interaction.' So two of the ten aren't groups at all, they're one protein each on their own. So
really eight groups and two loners. I'd have wanted it to say that straight: eight groups, plus
two that aren't connected to anything."

"'modularity 0.716' and 'the file's modules 0.663.' No idea. Two numbers next to each other
usually means someone wants me to compare them. Is 0.716 good? Is higher better? I'm skipping
it."

"'Seeded. Undirected. CPU.' -- Seeded. Hm. Seed 7. That tells me if I ran it with a different
seed I'd get different groups? That's the thing I hate: numbers that change when you re-run. At
least it's written down. If I put 'ten groups' on a slide and someone reruns it and gets nine, I
want to be able to say 'seed 7' and have the same answer. I guess that's what this is for. The
little info circle probably says so, I didn't hover it."

"There's a 'Run record' box open with Method, Seed, Damping, Normalization, Weight conversion...
that's for whoever audits this. 'Weight: confidence, used as similarity, 0.40 to 0.99, higher =
stronger link.' Actually, that one line is useful -- it tells me it used the confidence column and
which way round. In my data that'd be spend, and I'd want to know it didn't treat big spend as a
long distance. Fine."

**"Communities table".** "Ooh, 'Communities table.' A table. That's where I live." *Clicks.*

*Table opens under the picture.* "OK. This is what I wanted from the start. One row per group.
Size, edges inside, edges out, density, the fold-change thing, hub, module."

"Community 1: 62 proteins, 232 inside, 93 out, density 0.123, hub AKT1, module Ribosome 56 of
62. So the tool's biggest group is basically the file's Ribosome group -- 56 of its 62 match what
the file already said. I like that. That's me checking the pivot against the ERP. If it had said
'Ribosome 12 of 62' I'd want to know why."

"Why is it called 'Community 1' everywhere though, if the table knows it's the Ribosome one? The
legend on the picture says Community 1, the panel says Community 1. Nobody's going to say
'Community 1' in a meeting. I'd want to rename it Ribosome, or have it do that. I don't see how to
rename it."

"'Sorted by size.' Good, biggest first. And it says '10 communities, 2 of them a single protein.'
Matches the panel. Good, the numbers agree between the two places. That matters to me more than
you'd think."

**How is the biggest one different -- from the table.** *Reads down each column, finger on the
screen.* "Size -- it's the biggest, obviously, 62 against 43 next. Edges out, 93, the most of
any group. So it talks to the other groups more than anyone else. Density 0.123 -- that's the
lowest of the real groups, the others are 0.17 to 0.26. The tooltip, if it's like the others,
would say share of possible connections. So it's big and loose, and it leaks outwards."

"If this were suppliers, 'lots of edges out' is the one I'd care about -- that's the group other
groups depend on. That's the chokepoint question. But I had to work that out from four columns
myself. There's no column that says 'most connected to other groups'."

"'log2FoldChange mean, vs the rest.' +0.02 vs +0.09. Don't know what log2FoldChange is -- it's
one of their columns from the file, I think. The 'vs' bit I get: this group's number, then
everyone else. That's a nice little layout, actually, 'this vs the rest' in the cell. The grey
'vs +0.09' is small and pale though. Without my glasses that's gone."

"The grey subheads -- 'proteins', 'mean, vs the rest', 'highest degree', 'from the file; most
members' -- are tiny. I'd zoom to 125 and hope."

"'hub, highest degree.' Degree. I'll assume 'most lines'. AKT1."

"'Export table...' top right of the table. Good. That's the one I'd press first. Can Power BI read
what comes out? Probably a CSV, so yes."

**Clicking the group.** "Can I click Community 1 to see just it?" *Clicks it in the legend; right
panel changes.* *[She was shown the selected-group render with Community 1, and the Community 4
render for the member list.]*

"Community 1, Community. Created from Louvain run, seed 7. Size 62, edges inside 232, edges out
93, density 0.123 -- same numbers as the table. Good."

"'Compared with the rest.' OK, that's literally the moderator's question. 'Descriptive only; no
statistical test.' Fine, I don't need a test, I need a sentence. '62 proteins in Community 1, 238
in the rest.'"

*Looks at the box plots.* "These are the box-and-whisker things from my APICS stats module. I
never liked them. Orange dots on top, grey dots underneath. For log2FoldChange they sit right on
top of each other. Median group -0.02, rest 0.05. Basically the same."

"'rank-biserial r -0.02.' I don't know what that is." *Hovers.* "'Effect size, -1 to 1: how far
this group's values sit above or below the rest's. Near 0, they overlap.' OK, one line, I read
it. So near zero means no difference. -0.02 is near zero. Degree: 0.14, also near zero-ish? Is
0.14 near zero? It doesn't say where 'near' stops. I'd want it to just say 'about the same' or
'higher' in words."

"So the answer from this bit is: on those two things, the biggest group isn't different. It's just
bigger. That's... actually a fine answer, and it didn't pretend otherwise. But I only get the two
things somebody picked. Where did log2FoldChange and degree come from? There's a little sliders
icon next to 'Compared with the rest.' No label. I don't click unlabelled icons -- in our ERP
that's how you end up in a config screen you can't get out of. So I'm stuck with these two."

"And it doesn't compare it with the table's columns -- edges out, density. The table told me more
about how it's different than this section did. The big difference is 'it connects outward the
most and it's the loosest' and that's in the table, not in the 'compared with the rest' part."

"'Enrichment analysis isn't part of graphty.' Don't know what enrichment is. 'Copy members.'
Copies the list -- useful, I'd paste that into Excel."

**The members list.** *[Community 4 render.]* "Members by degree: UBB 21, '#7 to #10 of 300'. Why
is it a range and not a rank? Ties, I suppose. Weird, but I'll live. '33 more members' -- I'd
rather it just opened the table filtered to them." *[Protein-selected render.]* "Oh, it does,
kind of -- the node table says 'Community 4: 36 nodes, 1 selected.' That's what I want. Rows."

**"Compare with..."** *Back on the Louvain run panel.* "'Compare with...' under Runs. Maybe that
compares the groups with each other?" *Clicks; shown the comparison screen.* "No. This is
PageRank against betweenness, a scatter plot, a different dataset about payments. 'Do they rank
the same things the same way.' That's not what I wanted. I wanted to put Community 1 next to
Community 2. Back."

"So the word 'compare' is on two things that do different jobs. The one I wanted was 'Compared
with the rest', inside the group. The one I clicked was 'Compare with...' on the run. I'd have
kept clicking the wrong one."

**Wrapping up.** "My answer: ten groups -- eight real ones and two proteins on their own. The
biggest is Community 1, 62 proteins, which is basically the file's Ribosome set. It's different
mostly in shape, not in the numbers: it's the biggest, the loosest, and it has the most
connections out to other groups. On the fold-change number and on how connected each protein is,
it looks like everyone else."

"Took me a while and I had to read four columns and work out which ones mattered. The table did
most of the work. The 'compared with the rest' panel told me what's NOT different, which is
worth something, but it didn't tell me what IS."

"On my data -- I don't know what the groups would even be. Tier 1 suppliers, parts, sites.
Suppliers that share parts? I already have commodity codes for that. The groups would be
interesting if I had Tier 2 links, so I could see which suppliers secretly share a sub-supplier.
Where do I get the Tier 2 data from? Same question as always."

## Single Ease Question

**4 out of 7.** "The table was easy. Getting to it was a guess -- I picked a Belgian town out of a
list of four names -- and the 'how is it different' part I had to piece together myself."

## Would she use this instead of her current tool?

"No. Not instead. For groups on my supplier data, a pivot on commodity code and region gives me
the groups I actually present, in ten minutes, and my VP reads it in Power BI. What this has that
Excel doesn't is finding groups I didn't already label -- and the check against my own labels,
'Ribosome 56 of 62', is the thing that would make me trust it. But that's only useful if I have
the sub-tier links, and I mostly don't. And I'd need to know IT signs off on it. So: a side tool,
maybe, if the Communities table exports clean and the groups can carry real names instead of
'Community 1'."

## Observer notes

- She reached "Community" in the Algorithms menu only because the moderator's word "groups" was
  close to it. On her own data she said she would have closed the menu: four method names under
  one heading, no sentence saying what question they answer or how they differ.
- She read "components 3" in the graph overview as a candidate answer to "what groups are there"
  and had to reject it by eye.
- The Communities table was the turning point: sorted by size, one row per group, the file's own
  module named with a match count. She treated "Ribosome 56 of 62" as a reconciliation check and
  said it raised her trust.
- She found the biggest group's real differences (most edges out, lowest density) in the table,
  not in the "Compared with the rest" section, which showed only two preselected columns and
  concluded "no difference". She would not open the unlabelled sliders icon to add columns.
- The effect-size tooltip worked (she read it and applied it), but she could not tell whether
  0.14 counts as "near 0" and asked for the words "about the same" / "higher" / "lower".
- "Compare with..." on the run panel sent her to a rank-against-rank comparison of two measures,
  not a group-against-group comparison. The two "compare" labels do different jobs and she chose
  the wrong one first.
- She asked to rename "Community 1" to what it is; nothing on the screens she saw offers that.
- Small grey sub-labels in the table header and the "vs the rest" figures were hard for her to
  read.
