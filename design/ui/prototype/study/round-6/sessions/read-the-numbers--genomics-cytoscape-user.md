# Session: read every count after filtering to one module -- Maren (genomics, Cytoscape user)

Participant: Maren, fourth-year cancer biology postdoc, her lab's "computational person". DESeq2 in
R, STRING and Cytoscape two or three times a month, follows the stringApp protocol step by step.
Her line in the sand: one silent data loss and she stops trusting every number on screen. Plays on
a 14-inch laptop, about 1440 x 900.

Task as given by the moderator: "You loaded 300 proteins and filtered to one module. Explain every
count on screen, and why the node count is not 300."

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/tasks/read-the-numbers/01-load-step-graphml.png` -- the open dialog for ppi-core-300.graphml
- `shots/tasks/read-the-numbers/02-frame-at-rest.png` -- the network after loading, Statistics open
- `shots/tasks/read-the-numbers/03-filter-chip-proteins.png` -- filtered to the Ribosome module,
  the filter popover open, the table open underneath
- `shots/tasks/read-the-numbers/04-results-panel-finished.png` -- a finished betweenness run
- `tmp/read-the-numbers-maren/nav.png` -- the navigation page (rendered fresh for this session)

---

## 1. The open dialog

"OK, so this is a GraphML file. That's already not what I'd have -- I'd have a gene list and my
DESeq2 table -- but fine, somebody gave me the network. Let's read it."

"Top right: 'Sample, first 5 of 300 nodes.' PSMA1 to PSMA5, module Proteasome, log2FoldChange
numbers. The ids are gene symbols, good, nothing turned into a date. 'What will load: nodes 300,
edges 1,262.' So that's my starting point. 300 in, 1,262 edges."

"Node attributes 2 -- module and log2FoldChange. Edge attributes 1 -- confidence. 'Weight:
confidence, not used yet.' Hm. So the STRING score is in there but it isn't doing anything. That's
honest, at least. In Cytoscape I'd have cut at 0.4 or 0.7 before I ever got here, so I'd want to
know if this network is already cut. It doesn't say. Not today's question."

"'module: Category, 9 values.' Nine modules. Who made the modules? MCODE? It came in the file, so
presumably whoever made the file. I'd need that for methods. Parking it."

"Edges here is just 'edges'. No unit on it. Keep that in mind."

## 2. The network, loaded

"Right panel, Statistics. 'Loaded: ppi-core-300.graphml, undirected, confidence not used yet.' Same
thing the dialog told me. Good, it's consistent."

"'Nodes: 300 nodes.' Matches. Nothing dropped on the way in. That's the first thing I check and
it's right there."

"'Edges: 1,262 edges (rows).' Rows? Rows of what -- the file? OK. And then the next line: 'Linked
pairs: 1,262 linked pairs.' ... So two lines with the same number. Why are there two? I suppose if
the file had the same interaction twice, rows would be more than pairs. STRING can give you the
same pair from two channels, so... maybe that's what it's for? There's an i next to linked pairs, I
would hover it. In this mock nothing comes up. Since they're equal, I read it as: no duplicate
interactions in this file. If that's the point, it's a useful check, actually -- I've never known
whether Cytoscape merged duplicates or not. But I had to work it out. It doesn't say 'no
duplicates'."

"Density 0.0281. I don't use density. I believe it."

"'Connected components 3 (2 isolates).' So three pieces: the big one and two lonely nodes. Yes, I
can see two grey dots out on their own, top right and bottom right. So the largest component is
298? It doesn't say the size of the largest component, I'm working it out. In Cytoscape the first
thing I do after STRING is keep the largest component, so I'd want that number written, not
subtracted."

"Degree distribution -- little bar thing. Skip. 'Attributes 4'. Four? The dialog said two node
attributes and one edge attribute. That's three. Plus id? Probably counting id. Small thing, but
it's exactly the kind of small thing that makes me go back and check."

"The legend, bottom left. Module colour: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32,
MAPK signaling 31, DNA repair 30, Cell cycle 29, TGF-beta 21, Other 26." (adds on fingers) "56, 96,
131, 163, 194, 224, 253, 274... plus 26 is 300. It adds up. Good. That's the first legend that's
ever added up for me without me exporting the node table to Excel. 'Unassigned' has no number next
to it -- zero? Then why list it? Or is Other the unassigned ones? Other is grey and Unassigned is
also... no swatch. I'd guess Unassigned is zero and Other is 'modules too small to get a colour',
but it doesn't say which modules are in Other."

"And MAPK signaling is black. Black nodes. Hm. That's fine for my PI, it's not red-green."

"'Labels: the 22 proteins with the most partners. 7 more hidden where they overlap.' OK, that's a
count with a reason. Fine."

"Bottom strip: 'Table 300 nodes, 1,262 edges (rows).' Same as the panel. Good."

## 3. Filtered to the Ribosome module

"Now the filter. Top left, the chip says '56 of 300 proteins - 1 step'. OK -- so that's the answer
to 'why not 300', straight away. 56 of 300. And now it says proteins, not nodes. I prefer proteins,
honestly. But the first screen said nodes. Same thing, I know, but it switched on me."

"The popover: 'Filter to module Ribosome, took out 244 - 56 left.' 244 plus 56 is 300. Great. That's
exactly what I want: what was removed and what's left, as numbers that add up. And Ribosome was 56
in the legend, so it matches. If a colleague asked me 'why only 56', I'd point at this line."

"Right panel, Statistics now. 'Proteins 56 of 300, in the filtered graph.' 'Interactions 217 of
1,262, in the filtered graph.' ... Wait. On the first screen that was 'edges (rows)' and there was
a separate 'linked pairs'. Now it's 'Interactions' and there's no rows, no pairs. Which one is 217?
Rows or pairs? On this file they're the same so it doesn't matter, but the whole point of saying
'rows' on the first screen was that it might not be the same. So on the one screen where I care
most -- the subnetwork I'm going to put in a figure -- the unit is gone."

"And why did 1,262 become 217? I have to think it through: only interactions where both ends are
ribosome proteins are kept. Everything from a ribosome protein out to something else is dropped.
It doesn't say that. The table does help, though -- 'Degree (filtered)' and 'Degree (full graph)',
RPL28 14 and 17. So RPL28 has 3 partners outside the ribosome that aren't counted here. Oh -- that's
actually good. I've been caught by that in Cytoscape: you make a subnetwork and your 'hub' suddenly
has a different degree and you don't notice. Here both columns are side by side. Good."

"'Components 1, of the filtered graph (56 of 300 proteins).' One piece. 'Largest component 56.'
'Isolated proteins 0.' Fine, consistent. 'Average degree 7.75.' 'Density 0.141.' Every one of these
says 'of the filtered graph (56 of 300 proteins)'. By the fifth one I stopped reading that part.
It's a lot of repeated words on a laptop screen. But I'd rather it said it than not."

"Here the panel gives me 'Largest component 56' -- a line the full network didn't have. So on the
screen where I needed it, before, it wasn't there, and on the screen where it's trivially 56, it
is. Backwards."

"Legend: 'Module color module - Ribosome 56' with a little filter icon. Right, only ribosome is
shown. Consistent."

"Left: 'Interactions 300 proteins' under Graphs. So the underlying network is still all 300. Good, it
kept the parent network. And 'Hubs rule 0 of 10'. ... What is that? Hubs by what? 0 of 10 what?
I'd guess: there's a saved set of 10 hub genes, and none of them are in the ribosome module. But
what makes something a hub here -- degree? MCC? It just says 'rule'. If I clicked on it I suppose
I'd find out, but as a number on screen, '0 of 10' means nothing to me, and it made me worry
for a second that the filter had lost my hubs. It's the only count on this screen I can't
explain."

"The canvas. One ribosome node hanging off the bottom on a long line. Degree 1 in the module, I
guess. Fine."

"Style stack says 'Size: degree'. Degree in the filtered network or the full one? The table has both
now. The node sizes -- I don't know which one they follow."

## 4. The results panel

"This is a betweenness run. 'on: full graph, 300 nodes, 3 components.' So this was run on the whole
network, not on my ribosome module. The chip top left says 'Full graph' now, so the filter's off
here. OK. If I'd wanted it on the module, I'm not sure what I'd do -- 'Re-run (keeps Run 1)' is
greyed out."

"Right side, Overview: 'nodes 300, edges 1,262, components 3, average degree 8.41.' Edges -- no
'(rows)' again. So the unit appears on one screen and nowhere else. And the words keep changing:
nodes, proteins, edges, edges (rows), interactions, linked pairs. They're all the same two numbers
on this file. I can follow it because I've been paying attention, but I'm the kind of person who
reads every number. My PI would ask 'is 217 the same kind of thing as 1,262?' and I'd have to say
'I think so'."

"'295 more in the table.' 300 minus the top 5. Fine. 'Distribution 300 nodes.' Fine. 'zero -- 10
nodes, all 291=' -- that's cut off. All 291 what? I can't read the end of it. 10 nodes with zero
betweenness -- the two isolates plus eight dead ends, probably. The legend says 'the 10 proteins at
0 take the lightest color.' OK, 10 matches 10."

"'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' I read
that twice. I don't know what a tie line is. Skip."

"'Exact: Computed on every node, not estimated. It does not say the ranking is meaningful.' Ha.
That's the most honest thing I've read in a network tool. Also, betweenness -- I don't use it. In
cytoHubba I'd take MCC."

## 5. Navigation page

"This is a different dataset -- Les Miserables? Two little copies of a screen, one with a menu open:
Open, Update with new data, Export, Download project file, Version history. Overview on the right:
nodes 77, edges 254, density, components 1. No '(rows)' here either. Nothing here about my proteins.
I don't know why I'm looking at this for this question. I'd close it."

---

## My answer to the moderator

"The node count is 56, not 300, because I filtered to one module, Ribosome, and the filter says it
took out 244 and left 56. Ribosome was 56 in the legend on the full network, and the legend adds up
to 300. The 300 are still there in the parent network -- the left panel still says 300 proteins.
Interactions went from 1,262 to 217 because only interactions with both ends inside the ribosome
are kept; the table shows each protein's degree in the module and in the full network, so I can
see what was cut per gene. One component, no isolates in the module. The full network had 3
components: the main one plus 2 lone proteins. Rows and linked pairs are both 1,262, which I take to
mean there are no duplicate interactions in the file. The one count I can't explain is 'Hubs 0 of
10'."

## Single Ease Question

**5 out of 7.**

"The main question -- why 56 and not 300 -- took me five seconds, and the numbers add up
everywhere I checked them. That's more than I get from Cytoscape, where I export the node table to
count things. I'm taking points off because the units don't stay put. On the first screen it
bothers to say 'edges (rows)' and 'linked pairs', and then on the filtered screen and the results
screen it's just 'interactions' or 'edges' again, so I don't know which one I'm reading. Nodes
become proteins and edges become interactions between two screens. The largest component is
missing on the full network where I need it. 'Hubs 0 of 10' means nothing. And one line is cut off."

## Would I use this instead of Cytoscape?

"For checking what a filter did to my network -- yes, I'd rather have this. 'Took out 244, 56 left'
and the two degree columns side by side are exactly the checks I do by hand now. For the paper, no,
not yet. This started from a GraphML file somebody else made, with modules already assigned. My
pipeline starts from a gene list and a STRING query at a cutoff, and I don't see the STRING query,
the clustering, or where the modules came from -- I'd have to write that in the methods and I can't
from what's on screen. I'd use it to explore, and the figure stays in Cytoscape, because that's
what my PI and the reviewers know."

---

## Observations (moderator notes, not the participant's words)

Problems, most severe first:

1. **The unit on edge counts is shown on one screen only.** The loaded network says "1,262 edges
   (rows)" and "1,262 linked pairs"; the filtered view says "Interactions 217 of 1,262" with neither
   unit, and the load dialog, the results Overview and the navigation page say bare "edges". She
   could not tell whether 217 counts rows or pairs, on the screen where she said it mattered most.
   Severity: high for this task.
2. **The names for the same count change between screens.** nodes / proteins; edges / edges (rows) /
   interactions / linked pairs. She followed it, but predicted her PI would not.
3. **"Hubs rule 0 of 10" has no stated rule.** The only count she could not explain; it briefly made
   her suspect the filter had dropped her hubs.
4. **Largest-component size is missing on the full network.** She had to subtract (298); the
   filtered view shows it where it is trivially 56.
5. **Two equal lines (rows and pairs) with no word saying why.** She inferred "no duplicates" herself;
   the info icon gave nothing.
6. **Truncated text in the results panel**: "zero 10 nodes, all 291=" is cut off.
7. **"Attributes 4"** against the dialog's two node plus one edge attribute: she guessed id is
   counted, and flagged it as the kind of mismatch that makes her re-check.
8. **Legend "Unassigned" with no count, and "Other 26" without its members named.**
9. **"Size: degree" does not say filtered or full degree**, now that the table shows both.
10. **The repeated "of the filtered graph (56 of 300 proteins)"** on every statistic line: she stopped
    reading it by the fifth line. Low.
11. **The navigation page shows a different dataset** and nothing she could use for this task.

What worked, in her words: "took out 244 - 56 left" (both halves add to 300); the module legend
summing to 300; "Degree (filtered)" beside "Degree (full graph)"; the parent network still showing
300 proteins; "Exact ... does not say the ranking is meaningful".

Compared with round 3 (ease 3.7): the "why not 300" answer is now immediate, and the full-network
units are explicit. The regression risk is that the new units stop at the first screen.
