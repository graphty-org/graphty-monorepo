# Session: what groups are there, and how is the biggest different -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), computational social scientist, Gephi user since
0.8, teaches it every year. See ../../personas/gephi-holdout.md.

**Task, as the moderator gave it:** "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

**Screens, in order:** the finished Louvain result with its run record open
(screens/results-panel.html#louvain), the Communities: Louvain tab of the table
(screens/results-panel.html#louvain-table), the styles list with a betweenness colour open
(screens/styles-list.html), a saved set, DNA repair, in the inspector (screens/inspector.html#set),
and the node table ranked by PageRank (screens/table-dock.html#ranked). After that she went looking
for a way to see Community 1 on its own and was shown the group inspector (screens/inspector.html,
the community state and the table-row state) and Community 1 compared with the rest
(screens/styles-list.html, the group compare frames), and glanced at the comparison surface
(screens/comparison.html).

**Renders she saw:** shots/tasks/groups-differ/01-results-panel-louvain.png,
02-results-panel-louvain-table.png, 03-styles-list.png, 04-inspector-set.png,
05-table-dock-ranked.png; then shots/screens__inspector-group.png, shots/inspector-group-row.png,
shots/screens__styles-list-group-compare.png, shots/screens__styles-list-group-columns.png,
shots/screens__comparison.png. Laptop size, 1440 by 900.

---

## Think-aloud transcript

**Reading the task.** "What groups are there." Fine, that's modularity. In Gephi I'd run Modularity
from the Statistics panel, partition by modularity_class, and then read the percentages in the
Partition panel -- not the class numbers, those are random. "How is the biggest one different" --
different on what? Bigger, obviously. I'd look at density inside it, how much it leaks to the rest,
and whatever attribute column the file brought. Protein network, not my field. I'll read the numbers
and not pretend to know the biology.

**The finished Louvain result.** (01, results-panel, the run record open.) Left side, Results. It
says "Louvain, Sep 28 09:31", and right under it: "on: full graph, 300 nodes, 3 components". Good.
That is the first thing I ask and it answered before I asked. In Gephi I'd have to remember whether
my giant-component filter was still on. Here the scope is written on the result itself. And there's
an Options block that says Scope: Full graph again. I'll believe it.

"Seeded. Undirected. CPU." Weight: "confidence, used as similarity". Resolution 1, seed 7. The run
record popover: method "Louvain, weighted modularity, resolution 1", seed 7, normalization
"modularity divided by twice the total confidence of all edges" -- that's the textbook 2m with
weights. "Weight conversion: confidence used as given, 0.40 to 0.99, as similarity: higher =
stronger link." Okay. That's the "use weights" checkbox in Gephi, except here it tells me what it did
with the weights, which Gephi never does.

"Numbering: by size, largest first; a protein with no interaction is a community of its own." Oh,
that I like. Community 1 is the biggest, and it will be the biggest next time too. Reviewer two
cannot ask me why community 7 became community 4. Well -- he can, if the partition moves, but at
least the number means something. And there's a Copy button on the record. I'd paste that straight
into a methods section.

Groups: 10 communities, modularity 0.716. "The file's modules 0.663" -- so the file came with its
own grouping and they scored that too, as a baseline. That's a nice touch; Louvain beats the curated
modules on Q, which is what you'd expect, Louvain is optimising exactly that. Largest: 62 proteins.
"Single proteins: 2, no interaction." Three components on 300 nodes, two isolates. I can see them,
the two grey dots out on the right. So really it's 8 groups plus two loose proteins. Gephi would
have given each isolate its own class too, so no complaint.

"Took 0.4 s." Three hundred nodes. I should hope so. This is a toy graph for me; I want to see this
at 30,000.

**The communities table.** (02.) I clicked "Communities table". It opens a tab in the table at the
bottom: Nodes, Edges, Communities: Louvain. So this is my Data Lab, with a table of the partition
itself, one row per community. Gephi doesn't have that. In Gephi I'd be exporting the node table to
R and doing a group_by to get this.

"Full graph: 10 communities, 2 of them a single protein. Sorted by size." Columns: size, edges
inside, edges out, density inside, log2FoldChange mean versus the rest, hub, and module "from the
file; most members".

Let me check it adds up, because if it doesn't I'm done. Sizes: 62, 43, 36, 36, 31, 31, 30, 29, 1,
1 -- that's 300. Edges inside: 232 plus 156, 142, 104, 109, 82, 97, 104 -- 1,026. Edges out sum to
472; every edge between two groups is counted once from each side, so 236 between. 1,026 plus 236
is 1,262. Matches the overview. Density for Community 1: 232 over 62 times 61 over 2, that's 232
over 1,891, 0.123. Community 8: 104 over 406, 0.256. Right. It's the plain unweighted density. It
doesn't say unweighted in the header, though, and the run was weighted, so someone will ask. I'd
want that word in the column header.

So, what groups are there. Community 1 is 56 of 62 Ribosome. Community 2 is Proteasome, 40 of 43.
3 is Complex I, 4 Spliceosome, 5 MAPK signaling -- 31 of 31, perfectly clean -- 6 is TGF-beta, only
21 of 31, that's the messy one. 7 Cell cycle, 8 DNA repair, 29 of 29. Then the two singletons, GSK3B
and NOTCH1. So the answer to the first half is: eight groups, and seven of them are essentially the
file's own modules; TGF-beta is the one Louvain doesn't agree with.

The biggest one. Community 1, 62 proteins. And -- look at the density column -- it's the loosest.
0.123. Every other real group is 0.165 or more; DNA repair is 0.256. And it has the most edges out,
93. So the biggest group is big partly because it's baggy. The hub column says AKT1. AKT1 is a
kinase, even I know that's not a ribosome protein. And the module column says 56 of 62, so six of
them aren't ribosomal. My guess: Louvain parked the central hubs in the biggest cluster. That's a
very Louvain thing to do.

The expression column: +0.02 versus +0.09 for the rest. So it's flat. Hardly moves. Community 2 is
+0.29, that's the one that moved. So the biggest group is not the interesting group biologically,
if I'm reading log2FoldChange right. I'm reading it as "mean of the column", which it says. Fine.

Now I want to see those six proteins. I click the Community 1 row. Nothing. I double-click it.
Nothing. Right-click, nothing. Hm. In Gephi I'd go Filters, Partition, modularity_class, drag it
in, and look. Here the row is a row and that's it. The coloured chip is there, the name is there,
nothing tells me it's clickable and it isn't.

**The styles screen.** (03.) Now I'm somewhere else. Top left says "Stress response study", not
"Human protein interactions", and the graph is called "ppi-core-300" instead of "Interactions". Same
300 and 1,262, so I suppose it's the same data. But everything is brown, it's coloured by
betweenness on a log scale. Why am I looking at betweenness? That's not my question. I'll say this
for it: "Each value is divided by 0.000077, the smallest above 0, before the log", and "On a straight
scale 289 of 300 proteins would share the lightest of the 5 colors". That is honest. Gephi's ranking
would have given me 289 identical dots and let me find out in Preview. But it's no help for groups.
Moving on.

**A set in the inspector.** (04.) Back to "Human protein interactions". A set called DNA repair,
"rule", 30 nodes, module = DNA repair. And a button at the top: "Compare with the rest". That's the
thing I wanted -- but for the wrong group. It's the file's module, not Louvain's Community 1.
Edges inside 105, edges out 42. Community 8 was 104 and 41 with 29 proteins, so one DNA repair
protein went to another community and took one inside edge and one outside edge with it. Consistent.

Here's something that tripped me. This map is coloured by module, and the right-hand cluster, the one
with RPL28 and RPS8, is light blue. On the Louvain map that same cluster was amber. And the amber
cluster here is on the left, and it's Proteasome. So amber means Ribosome-ish on one map and
Proteasome on the next. The two partitions are nearly the same groups and they get swapped colours.
I looked at this map for a good ten seconds thinking amber was still Community 1. Gephi does exactly
the same thing to me, to be fair, which is why I fix palettes by hand before every figure. But a new
tool could line the colours up when two partitions mostly agree. I teach colour-blind students; if
colour is the only thing tying the pictures together, it had better be consistent.

**The node table.** (05.) Nodes tab, sorted by PageRank. id, module, community, degree, betweenness,
PageRank, each with its rank. The header on each measure group says what it ran on: "Louvain
weighted, seed 7, full graph", "betweenness exact, unweighted, full graph", "PageRank damping 0.85,
unweighted, full graph". That's the thing I've wanted in Gephi for ten years. The column says what
it was computed on. Nobody will mix two runs in one column without it saying so.

And there's my answer to the six. AKT1: module Unassigned, community Community 1. HSP90AA1:
Unassigned, Community 1. RPL28: Ribosome, Community 1. So yes, at least two of the big central hubs
sit in Community 1 with the ribosome. That's why it's loose and leaky. I can't see the other four
from here without filtering, and I can't filter by clicking the community in this mock. I'd sort by
the community column, I suppose. Or export and do it in R. I'd rather not have to.

"Near tie: the next rank's value is within 1%" and "#4=". Good. Degree ties marked. I don't need it
for this task but I noticed.

**Looking for Community 1 on its own.** I asked the moderator whether a community could be opened
like the DNA repair set was. I was shown the group inspector. Community 4, "4 of 10" with arrows, so
I can step through communities -- that's nice, that's the Partition panel as a pager. "Compare with
the rest" at the top again. Size, edges inside, edges out, log2FoldChange mean and "rest of graph".
Members by degree with rank ranges -- UBB #7 to #10, that's the ties again. "Keep as set". Fine.

And the table-row state: pick a row in the Nodes tab and the table narrows to "Community 4: 36
nodes, 1 selected". That's the filter I wanted. So the real thing has it; I just couldn't get to it
from the Communities tab, which is where I was standing when I wanted it.

**Community 1 compared with the rest.** (styles-list, group compare.) There it is. "Descriptive only;
no statistical test. 62 proteins in Community 1, 238 in the rest." Thank you. I've watched students
put a t-test on a community found by optimising for difference and call it significant. Box plots,
group against rest, median and IQR. log2FoldChange: median -0.02 versus 0.05, rank-biserial r -0.02.
Nothing. Degree: 9 versus 8, r 0.14. Barely anything. Betweenness 0.0047 versus 0.0037, r 0.08.
"Effect size, not a significance test." Right.

So the biggest group is barely different from the rest on any node measure. It's different in shape:
it's the biggest and the loosest, it leaks the most, and it holds a couple of the central hubs.
That's a real finding, and the communities table got me there faster than this panel did.

Two quibbles. The 238 "rest" includes the two isolated proteins. Two out of 238 won't move a median,
but I'd want the option to leave out the singletons. And I can pick which columns to compare on --
"Number columns only" -- that's good, but it's weights and density I'd want next to each other, and
density is a per-group number, not a per-node one, so it lives in the table and not here. That's
fine once you know. It took me a minute.

The comparison surface -- two rankings side by side, a scatter. Different question, rankings, not
groups. I didn't need it. It's about payments, not proteins.

**My answer.** Louvain, weighted by confidence, resolution 1, seed 7, full graph: 10 communities,
Q 0.716 against 0.663 for the file's own modules. Eight real groups, seven of which match the file's
modules almost exactly -- Ribosome, Proteasome, Complex I, Spliceosome, MAPK signaling, Cell cycle,
DNA repair -- plus a TGF-beta group that's only two-thirds TGF-beta; and two isolated proteins, GSK3B
and NOTCH1. The biggest, Community 1, 62 proteins, mostly Ribosome, is the loosest group (density
0.123, lowest of the eight) and the leakiest (93 edges out), because it also took in central hubs
like AKT1 and HSP90AA1. On expression it's flat, +0.02 against +0.09 for the rest, and on degree and
betweenness it's no different from the rest in any way I'd write down.

---

## Single Ease Question

**5 of 7.**

"The answer was in one table, and the table adds up. That's most of it. I lost points on clicking a
community row and getting nothing, on a detour through a betweenness screen in a project with a
different name, and on the colours swapping between the two maps. None of those would stop me. All of
them would slow down twenty-five students."

## Would she use this instead of her current tool?

"Not instead. Not yet. For this task, the partition with its seed, its scope and its weights written
on it, numbered by size, and a table of the communities with density and edges out -- that's better
than what Gephi gives me, and I'd take that table into a paper tomorrow. But I've not seen it open my
GEXF, I've not seen ForceAtlas2 with my parameters, I've not seen the SVG, and I've not seen it hold
30,000 nodes. 300 proteins is a demo. Show me the retweet network. Until then I'd stay on Gephi and
maybe use this for the lab, where the scope-on-the-result thing would save me the lecture about
filters."

---

## Problems found

1. **Communities table rows do nothing.** (results-panel, Communities: Louvain tab.) She clicked,
   double-clicked and right-clicked the Community 1 row to see its members; nothing happened and
   nothing suggests the row can be opened. The community inspector and "Compare with the rest" exist,
   but she could not reach them from the table where the question led her. Severity 3.
2. **The two partitions' colours are swapped.** (results-panel Louvain map vs inspector set, module
   colour.) The ribosome cluster is amber under Louvain and light blue under module; amber is
   Proteasome under module. She misread the module map as still showing Community 1 for about ten
   seconds. Two partitions that mostly agree could share colours for matched groups. Severity 3.
3. **The styles screen is off-task and in a differently named project.** ("Human protein
   interactions / Interactions" vs "Stress response study / ppi-core-300", with a betweenness colour
   open.) She had to check the counts to be sure it was the same data, and the screen said nothing
   about groups. Severity 2.
4. **She cannot see which proteins make Community 1 more than its module.** (Communities table,
   "module, most members": Ribosome 56 of 62.) The six others are only found by reading the Nodes tab
   row by row; she found AKT1 and HSP90AA1 by luck of the PageRank sort. Severity 2.
5. **"density inside" does not say unweighted.** (Communities table.) The run was weighted by
   confidence; the density is the plain edge count over possible pairs. A reviewer will ask which.
   Severity 2.
6. **"The rest" includes the two isolated proteins.** (Community 1 compared with the rest: 62 vs
   238.) No way to leave out singletons, and no line saying they are included. Severity 1.
7. **Per-group numbers and per-node comparisons live in two places.** (Communities table vs Compare
   with the rest.) Density and edges out are only in the table, distributions only in the compare
   panel; she took a minute to work out why density was not a "compare on" choice. Severity 1.
8. **Small grey secondary text.** (Communities table, "vs +0.09"; run record labels.) Tiring at
   laptop size for someone who bumps font size. Severity 1.

## What she liked

- "on: full graph, 300 nodes, 3 components" written on the result, and every measure column in the
  node table saying what it ran on and with which settings.
- The run record: weighted modularity, normalization written out, weight conversion, seed, a Copy
  button for the methods section.
- "Numbering: by size, largest first" -- community numbers that mean something.
- Q for the file's own modules shown beside Louvain's Q.
- A communities table that adds up to the overview's 300 and 1,262, with density and edges out per
  group; "not defined" for a single protein.
- "Descriptive only; no statistical test" and effect sizes instead of p-values on a partition found
  by optimisation.
- The "4 of 10" pager on a community, like stepping through Gephi's partition list.
