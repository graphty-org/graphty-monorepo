# Read the numbers -- newcomer student

**Task, as the moderator gave it:** "You loaded 300 proteins and filtered to one module. Explain
every count on screen, and why the node count is not 300."

**Screens used, in order:** the load step (protein file as GraphML, then as the tab-separated
evidence file), the frame at rest with the protein data, the filter chip and its steps, and the
Results panel (finished betweenness on the proteins, and results after a filter).

**About the participant.** The persona file for this participant did not exist when the session
ran, so the character was built from the project's first-time-user persona (Explorer Elena) and
the round-one finding that legends and first statistics use words newcomers cannot read. Treat
her vocabulary and patience as assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate. She is taking an intro systems
biology course and has a class project on a protein interaction list her TA exported from STRING.
She has used the STRING website (type a protein, see a picture) and followed one Cytoscape lab
handout step by step without really knowing why. She knows "protein", "interaction", "module"
(from lecture) and has heard "degree" once. She does not know "component", "isolate", "density"
or "betweenness". She works on a 13-inch laptop, is patient for about ten minutes, and blames
herself first when a number does not add up.

**Note on the mocks.** The filter chip and the "results after a filter" screens use a different
sample network (characters from Les Miserables, 77 nodes), not the proteins. There is no screen
that shows the protein network filtered to one module, so for that part Leah reasoned from the
Les Miserables screens and said what she would expect to see for proteins. Findings that depend
on the exact protein numbers after filtering are untested.

---

## Think-aloud

### 1. The load step

**GraphML file.** "OK, 'Open ppi-core-300.graphml'. The 300 is in the name, so that's the 300
proteins. Format GraphML, 'Undirected, as the file declares' -- fine, interactions don't have a
direction, that's what my TA said. Node attributes: module, 'Category, 9 values', and
log2FoldChange. Nine modules, I guess. The table shows PSMA1, PSMA2... Proteasome. What will load:
nodes 300, edges 1,262. Nodes are proteins, edges are interactions. So 1,262 interactions. Easy."

"Role says 'None' for everything. I don't know what a role is. I'll leave it. Load."

**The tab-separated evidence file (the moderator points at it as the other way in).** "Wait, this
one is the same proteins but it says nodes **298**. Why? ... Oh, there's a line under it: '298
nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1.' OK, that is actually really
helpful, it tells me which two. But then why does the other file have 300? Same proteins. So in
one file GSK3B is in and in the other it isn't? I would have to ask my TA which one is right."

"And there's a yellow thing: '1,036 extra parallel edges. Several rows join the same two
proteins, one per evidence source.' Oh -- because STRING has text mining, experiments, databases.
So one pair shows up three times. 'Keep all: 2,298 edges' or 'Merge into one, max of confidence:
1,262 edges.' 1,262 is the number the other file had. So merged is the 'real' number of pairs? I
think I'd pick merge, because 2,298 interactions sounds wrong -- it's the same interaction counted
per source. But the default is Keep all, so I bet most of my class would click Load and get 2,298
and never notice."

"'without a weight 150.' No idea. Something about NA. I'd ignore it."

### 2. The frame at rest (protein data)

"OK, a hairball but a colorful one. Top left: 'Human protein interactions', 'ppi-core-300.g...',
a chip that says 'Full graph'. Legend at the bottom: Module color -- Ribosome 56, Proteasome 40,
Complex I 35, Spliceosome 32, MAPK signaling 31, DNA repair 30, Cell cycle 29, TGF-beta 21,
Other 26." (Adds on her fingers.) "...that's 300. Good, the legend adds up to the nodes. I like
that the numbers are right there."

"Size by degree, 1, 10, 34. So the biggest dot has 34 interactions? That one is... MAPK1 maybe,
or UBC, the big grey ones in the middle."

"Right side, Statistics. Nodes 300. Edges 1,262, 'undirected, weight: confidence'. Density
0.0281 with a little (i). I don't know what density is. Connected components 3 (2 isolates).
What's an isolate? ... Is that GSK3B and NOTCH1? Those were the two with no interaction. So in
this file they're here but floating alone -- oh, those two dots out on the right edge by
themselves, maybe. But it doesn't say which ones, the load screen said the names and this doesn't.
And '3' components -- the big blob is one, plus the 2 lonely ones is 3? I think so. I'm guessing."

"Degree distribution -- tiny bar chart, I can't read it at this size. Attributes 4. '5 more'."

**Where is the filter?** "The task says I filtered to one module. How would I have done that?
I'd click Proteasome in the legend... nothing on the legend says I can click. Then I'd try the
'Full graph' chip at the top, because it has a funnel icon. That's a filter icon, everyone knows
that one from Excel."

### 3. The filter chip (Les Miserables sample)

"The chip now says 'Filtered: 28 of 77 nodes -- 3 steps'. OK so for my proteins it would say
'Filtered: 40 of 300 nodes -- 1 step' if I picked Proteasome. That is the answer to 'why not
300': because I filtered, and it literally says X of 300. That part is clear."

"The Filter steps box: 'Filter to Largest component 76', 'Filter to degree >= 5 41', 'Filter out
group = 8 28'. The numbers going down -- I think each one is what's left after that step. 76,
then 41, then 28. The last one matches the chip. OK."

"But this sentence under step 2: '3 dropped below degree 5 by "Filter out group = 8"'. I read it
three times. So removing group 8 made three other people have fewer connections? That's... kind
of wild, but I guess if your friends leave you have fewer friends. I would not have figured that
out on my own; I'm glad it's written, but the wording is hard."

"Statistics on the right: 'Filtered graph: 28 of 77 nodes'. edges 105 of 254 -- OK, fewer
interactions because a lot of the partners got filtered away. components 1, largest component 28,
isolated nodes 0, average degree 7.50, density 0.278. Every one has a little funnel after it. I
think the funnel means 'this is the filtered number, not the whole thing'. Nobody told me that,
I'm guessing from the icon."

"So for my proteins: if I filter to Proteasome, 40 nodes, the edges would be only the interactions
where both ends are proteasome proteins. The interactions from a proteasome protein to, like,
UBC in the middle would be gone. I'd want it to say that -- 'edges between the 40 proteins
you kept' -- because I'd expect UBC's interactions to still count."

"The table at the bottom has two degree columns: 'degree' and 'degree on: full graph'. Valjean
18 and 36. OK so 18 in the filtered one and 36 in the full one. That's actually useful... but
why are there two? In my report which one do I use? My professor would say degree is degree. I'd
probably use the big one and be wrong."

"The legend in this sample is 'Group color group' with numbers 4, 3, 2, 5, 1 as the names. For
mine it would say Proteasome, fine. The legend numbers 9, 8, 7, 3, 1 add to 28 -- matches."

### 4. The Results panel

**Betweenness finished on the full protein network.** "Betweenness -- I don't know that word.
The box says 'on: full graph, 300 nodes, 3 components'. That's the same 3 from before. 'Exact'
-- the tooltip says 'Computed on every node, not estimated. It does not say the ranking is
meaningful.' Ha, OK, honest."

"Distribution 300 nodes. middle 0.0038, highest 0.138, 'zero 10 nodes, all 291='. What is
'291='? Is that a typo? Ten nodes have zero... and they're all ranked 291? I think it means they
tie for last. I only got that because 300 minus 10 is 290. That one I would skip in my report."

"Top nodes MAPK1, TP53, YWHAZ. Those are the big ones in the middle, makes sense."

**Results after a filter (Les Miserables sample).** "Now the box says 'on: filtered graph, 76
nodes, 1 component' and Scope 'Filtered graph, 76 of 77'. So it tells me it ran on the filtered
version, not the full one. Good, that's the 'why is it not 300' again, in a different place. The
Run record says 'Normalization: divided by (n-1)(n-2)/2 = 2,775 node pairs; n = 76, the
filtered graph'. That's math I don't need but I get that n is 76, not 77."

"But -- here's something -- the Statistics on the right here say nodes 76, edges 254, and in the
filter screen it said edges '105 of 254' with 254 being the full number. Here 254 is the filtered
number? Or the full? The little funnel is there, so filtered? The two screens show edges
differently, one has 'of' and one doesn't. I'd get confused comparing screenshots."

"And in this panel the stats are a grid of big numbers, and on the first screen they were a
list with 'Connected components' spelled out; here it's 'components'. Same thing, different
word. I think."

### 5. My answer to the moderator

"Counts: 300 is how many proteins were in the file. 1,262 interactions if you merge the ones that
show up from several sources, 2,298 if you keep each source's row. The legend counts per module
add up to 300. After the filter the chip says 'Filtered: N of 300 nodes', and the Statistics
switch to the filtered numbers with the funnel. It's not 300 because I filtered to one module --
the chip says so. If I loaded the TSV instead of GraphML it would be 298 even before filtering,
because GSK3B and NOTCH1 have no partner in that file. 3 components is the big network plus two
proteins that are alone -- I think. Density, isolates and the '291=' I can't explain."

---

## Single Ease Question

**4 out of 7.** "The 'X of 300' and the legend adding up made the main question easy. Everything
around it -- components, isolates, density, two degree columns, 298 versus 300 depending on the
file -- I'd have to ask my TA."

## Would she use this instead of her current tool

"For the class project, probably yes over Cytoscape, because it tells me in words what it
dropped and why, and it names GSK3B and NOTCH1. Cytoscape just gives me a number and I have to
figure it out. But I'd still check the numbers against STRING, and I would want every jargon word
to have a one-line meaning right next to it, like the 'Exact' tooltip. That tooltip was the best
thing on any screen."

---

## Problems observed

1. **No protein screen shows the filtered state.** The filter chip and the filtered Results
   state use the Les Miserables sample, so the task's own question (proteins filtered to one
   module) could not be seen, only inferred. Severity 3 for the study.
2. **The two protein files load different node counts (300 vs 298) with no bridge between
   them.** The TSV load explains the 298 with names; the frame at rest from GraphML shows 300 and
   "3 (2 isolates)" without saying the two isolates are GSK3B and NOTCH1. Leah guessed they were
   the same two. Severity 3.
3. **"Keep all: 2,298 edges" is the default** for repeated pairs. A student reads 2,298 as
   "interactions" and reports it; the pair count (1,262) is the second option. Severity 3.
4. **Jargon without an inline meaning:** density, connected components, isolates, betweenness,
   "Role", "without a weight". Only "Exact" had a plain-words tooltip. Severity 3.
5. **Two degree columns** ("degree" and "degree on: full graph") with no hint which to report.
   Severity 2.
6. **The funnel after each statistic** was read correctly only by guessing; nothing says "these
   numbers are for the filtered graph". Severity 2.
7. **Edges shown as "105 of 254" on one screen and a bare number with a funnel on another.** The
   two layouts of Statistics (list vs grid, "Connected components" vs "components") made the same
   count look like different counts. Severity 2.
8. **"zero 10 nodes, all 291="** in the betweenness distribution reads as a typo. Severity 2.
9. **The step sentence "3 dropped below degree 5 by 'Filter out group = 8'"** is correct and
   useful but took three reads. Severity 2.
10. **The module legend does not look clickable,** so the first place a student tries to filter
    to one module gives no hint; she found the filter through the chip's funnel icon. Severity 2.
11. **Which edges survive a module filter is not stated.** Leah expected interactions from a kept
    protein to a hub outside the module to still count. Severity 2.
