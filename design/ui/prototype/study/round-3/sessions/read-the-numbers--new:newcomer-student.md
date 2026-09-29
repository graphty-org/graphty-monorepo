# Read the numbers -- newcomer student (round 3)

**Task, as the moderator gave it:** "You loaded 300 proteins and filtered to one module. Explain
every count on screen, and why the node count is not 300."

**Screens used, in order:** the load step (the protein file as GraphML, then the tab-separated
evidence file with its repeated-pairs choice, the import report and the graph right after Load),
the frame at rest with the protein data, the filter chip (no steps, then three steps), and the
Results panel (betweenness finished on the proteins, Louvain on the proteins, and betweenness after
a filter). All renders were the participant view, with design notes hidden.

**About the participant.** There is still no persona file for this participant, so the same
character as round two was used: built from the project's first-time-user persona and the
round-one finding that legends and first statistics use words newcomers cannot read. Her
vocabulary and patience are assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate, intro systems biology course,
class project on a protein interaction list her TA exported from STRING. She knows "protein",
"interaction", "module" (from lecture) and has heard "degree" once. She does not know
"component", "isolate", "density", "betweenness" or "modularity". 13-inch laptop, patient for
about ten minutes, blames herself first when a number does not add up.

**Note on the mocks.** As in round two, no screen shows the protein network filtered to one
module. The filter chip and the "after a filter" Results screen use the Les Miserables sample (77
characters). Leah reasoned from those and said what she expected for her proteins.

---

## Think-aloud

### 1. The load step

**The first page the moderator opened.** "There's a row of links at the top -- '1 Clean, 2 Weight
read as text, 3 Repeated pairs, 4 Too large...' and 'Show annotations'. Is that part of the app?
It looks like a menu of problems. And the file is transfers-2026-03.csv, 3,000 nodes -- that's
bank accounts, not my proteins. I'm going to assume this is the wrong one." (Moderator points her
to the GraphML file.)

**GraphML.** "Open ppi-core-300.graphml. OK, same as last time: Sample, first 5 of 300 nodes, PSMA1
to PSMA5, Proteasome. What will load: nodes 300, edges 1,262. 300 proteins, 1,262 interactions.
Module is 'Category, 9 values' -- nine modules. confidence is a Number, Role 'None'. Role still
means nothing to me. Load."

**The evidence file.** "This one says 298 nodes, 2,298 edges, and 'without a weight 150'. And the
line at the bottom -- '298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1.'
Good, names. The yellow warning: 1,036 extra parallel edges, one per evidence source." (Opens the
drop-down.) "Oh, this is better than last time. 'Keep all: 2,298 edges -- one edge per row, so
degree counts every source.' 'Merge into one, max of confidence: 1,262 edges -- one edge per pair
of proteins.' So if I keep all, MAPK1's degree goes up just because text mining AND experiments
both found the same thing. That's not what I want. I'd pick Merge. But the tick is still on Keep
all, so if I hadn't opened this I'd have loaded 2,298."

**After Load (kept all).** "Right side: Nodes 298, Edges 2,298, and under it 'undirected, 1,036
parallel; confidence: numbers, not used'. OK, 2,298 minus 1,036 is 1,262, so the real pairs are
there if you do the subtraction. 'not used' -- the confidence isn't used? Last screen it said
Weight in the Role column. Now it's not used. Hmm. Connected components 1. And a box 'Last import:
parallel edges kept (2,298); 150 edges without a weight'. That box is handy -- it's a receipt."

"The Version history page says it again: 'Found: Nodes 298, 2 proteins in the file have no
interaction: GSK3B, NOTCH1. Pairs 1,262 distinct.' 'Pairs 1,262 distinct' -- that's the sentence I
wanted. It's just on a page I would never open."

### 2. The frame at rest (GraphML proteins)

"Colorful hairball. Legend bottom left: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32,
MAPK signaling 31, DNA repair 30, Cell cycle 29, TGF-beta 21, Other 26." (Adds on her fingers.)
"300. Nice, same as last time."

"Statistics: Nodes 300, Edges 1,262, 'undirected, weight: confidence'. Density 0.0281, with an
(i)." (Hovers the (i).) "Nothing happens. Clicked it. Nothing. Connected components '3 (2
isolates)', also an (i) that does nothing. So I still don't know what an isolate is. But now I
think I get it from the other file: the other file had 298 and 1 component, this one has 300 and
3 components, 2 isolates. 300 minus 298 is 2. So the 2 isolates are GSK3B and NOTCH1, the two
dots floating off on their own -- top right and bottom right. That's my guess; this screen doesn't
say their names. I only know because I looked at the other file first."

"Also: this says 'weight: confidence'. The evidence file said 'confidence: not used'. Same data,
same column. Which is it?"

"Where would I filter to one module? I'd click Proteasome in the legend." (Clicks.) "Nothing.
OK, the chip at the top, 'Full graph' with the funnel."

### 3. The filter chip (Les Miserables sample)

**No steps.** "Clicked 'Full graph'. A box: 'Filter steps. No filter steps. Every number reads the
full graph.' Oh, I like that sentence. That tells me what the chip does to the numbers before I
even do anything. Add step -- it would ask Filter to or Filter out, I guess 'Filter to module =
Proteasome'."

**Three steps.** "Chip now says '27 of 77 nodes -- 3 steps'. Steps: 'Filter to degree >= 2, took
out 17, 60 left.' 'Filter to degree >= 5, took out 20, 40 left, keeps only nodes with at least 5
neighbors among the 60 it reads.' 'Filter out group 8, took out 13, 27 left.' Much easier than
last time. 'took out 17, 60 left' -- I can read that. The 'among the 60 it reads' bit explains
why the order matters. 77 minus 17 is 60, minus 20 is 40, minus 13 is 27. Adds up."

"Statistics: 'Filtered graph: 27 of 77 nodes' with a funnel, edges '104 of 254', components 1,
largest component 27, isolated nodes 0, average degree 7.70, density 0.296. The funnel is on every
number and on the legend too. I'm guessing funnel = this number is after the filter. Nobody says
that, but it's the same icon as the chip, so it's a good guess."

"Wait -- on the left, under Sets and paths, 'The barricade, rule, 0 of 13' with a funnel. Zero?
The barricade set is gone? Oh, because I filtered out group 8, and that's probably all the
barricade people. OK. That took me a minute."

"Table: 'degree' with a funnel, 17 for Valjean, and 'degree on: full graph' 36. Same as last time:
which do I put in my report? If I filtered to Proteasome, then PSMA1's degree would be only its
interactions with other proteasome proteins. I'd want that written somewhere -- 'counts only
neighbors that are still in the filter'. The step sentence 'at least 5 neighbors among the 60 it
reads' kind of says it, but only on that step."

"So for my proteins I'd expect the chip to say '40 of 300 nodes -- 1 step', legend just
Proteasome 40, edges 'X of 1,262' where X is only the interactions inside the proteasome."

### 4. The Results panel

**Betweenness, proteins, full graph.** "'on: full graph, 300 nodes, 3 components.' Exact tooltip:
'Computed on every node, not estimated. It does not say the ranking is meaningful.' Still the best
tooltip in the app. Distribution 300 nodes, middle 0.0038, highest 0.138, 'zero: 10 nodes, all
291='. Still the 291=. I think it's '10 tied for rank 291', but it looks like a typo. The legend
below says 'the 10 proteins at 0 take the lightest color', so at least somewhere it says 10
proteins are zero."

"Now the Statistics here: nodes 300, edges 1,262, components 3, average degree 8.41. And
'Edges: undirected, no weight'. NO weight? The frame said 'weight: confidence'. And components
here is just 3, the '2 isolates' part is gone. It's a grid now instead of a list, and 'Connected
components' is 'components'. Same graph, third way of writing it."

**Louvain, proteins.** "The moderator asked about modules, and this says 'Groups 10 communities',
'the file's modules 0.663', 'single proteins 2, no interaction'. Legend: Community 1 62, Community
2 43, Community 3 36... My file had Ribosome 56. Is Community 1 the ribosome? Is 'community' the
same as 'module'? If I'd filtered 'to one module' using THIS, I'd get 62, not 56 or 40. I'd get
this wrong on the homework. And Edges now says 'undirected, similarity weight'. That's four
versions of the weight sentence."

"'single proteins 2, no interaction' -- that's the isolates again! Said in normal words! Why
doesn't the Statistics box say it like that?"

**Betweenness after a filter (Les Miserables).** "Chip: 'Filtered: 60 of 77 nodes -- 1 step'. On
the filter screen the chip said '27 of 77 nodes -- 3 steps', without 'Filtered:'. Small thing.
'on: filtered graph, 60 nodes, 1 component', Scope 'Filtered graph, 60 of 77'. Run record:
'n = 60, the filtered graph; after Filter to degree >= 2'. OK, so it tells me the run used the 60,
not the 77. That's the 'why not 300' answer again, in a third place."

"Statistics: nodes 60 with funnel, edges 237 with funnel, components 1, density 0.134. On the
filter screen edges were '104 of 254'. Here it's just '237', no 'of 254'. And the legend -- 2 is
14, 8 is 13, 4 is 11 -- those are the exact numbers from the unfiltered legend on the other
screen, and this legend has no funnel. So are those the full counts or the filtered counts? On
the filter screen the legend had a funnel. Here it doesn't. I'd guess full... but then the dots
are missing. I don't know."

"'zero 32 nodes, all 29=' and 'middle 0.000'. More than half are zero? Middle is zero? Fine, I
guess that happens when you cut the lonely people off... no idea."

### 5. My answer to the moderator

"300 is the proteins in the GraphML file; the legend's nine module counts add up to 300. 1,262 is
the interactions -- distinct pairs. In the evidence file it's 298 proteins because GSK3B and NOTCH1
have no partners, and 2,298 edges if you keep one per evidence source, which is the default, or
1,262 if you merge. The '3 components, 2 isolates' on the GraphML screen is the big network plus
GSK3B and NOTCH1 floating alone -- I worked that out from 300 minus 298, the screen doesn't say
it. After I filter to Proteasome the chip would say 40 of 300 and every number with a funnel is
about the 40; edges would be only interactions inside the proteasome. It's not 300 because the
chip says I filtered. Density, the '291=', and whether the legend after filtering is filtered or
not -- I can't explain. And I can't tell you if the graph has a weight: one screen says
confidence, one says not used, one says no weight, one says similarity weight."

---

## Single Ease Question

**5 out of 7.** "The main question -- why not 300 -- is easy now: the chip, the steps with 'took out
17, 60 left', the funnels, the 'every number reads the full graph' line. It's all the other
numbers around it. The (i) buttons don't do anything, the weight is described four different ways,
and the isolates only get names on screens I wouldn't look at."

## Would she use this instead of her current tool

"Yes, over Cytoscape for the class project. It keeps telling me in sentences what it dropped --
GSK3B and NOTCH1, 'took out 17, 60 left', 'single proteins 2, no interaction'. Cytoscape just
changes the number. But I'd want the same words everywhere: if 'single proteins, no interaction'
is what an isolate is, put that next to 'isolates'. And make the (i) buttons actually say
something, because the one tooltip that works is the best thing in the app."

---

## Problems observed

1. **Still no protein screen in the filtered state.** The task itself (proteins filtered to one
   module) could only be inferred from the Les Miserables sample. Severity 3 for the study.
2. **The weight is described four ways for the same data.** Frame at rest: "weight: confidence";
   evidence file after Load: "confidence: numbers, not used"; Results with betweenness: "no
   weight"; Results with Louvain: "similarity weight". Load step shows Role "None" for confidence
   in GraphML. Leah could not say whether her graph has a weight. Severity 3.
3. **The info icons next to Density, Connected components and Degree distribution do nothing**
   when hovered or clicked. Severity 3 -- these are exactly the words she needs explained.
4. **Isolates are never named on the GraphML frame.** "3 (2 isolates)" is only decodable by
   comparing with the evidence file (300 vs 298). The plain wording exists elsewhere ("2 proteins in
   the file have no interaction: GSK3B, NOTCH1"; Louvain's "single proteins 2, no interaction") but
   not next to the statistic. Severity 3.
5. **"Keep all: 2,298 edges" is still the default** for repeated pairs. The option text now
   explains the consequence well, but only after opening the drop-down. The "Pairs 1,262 distinct"
   line appears only in Version history. Severity 2.
6. **Louvain "communities" versus the file's "modules".** Community 1 has 62 proteins, the largest
   module (Ribosome) 56; nothing ties the two vocabularies together, and a student asked to
   "filter to one module" may pick a community. Severity 2.
7. **The legend after a filter on the Results screen has no funnel** while the filter-chip screen's
   legend does, and its first counts (14, 13, 11) match the unfiltered legend, so she could not
   tell filtered from full counts. Severity 2.
8. **Statistics look different on every screen:** list with "Connected components 3 (2
   isolates)" and Density on the frame; grid with "components 3" and average degree in Results;
   "104 of 254" edges on the filter screen but a bare "237" with a funnel in Results. Severity 2.
9. **The chip text differs between screens:** "27 of 77 nodes -- 3 steps" versus "Filtered: 60 of
   77 nodes -- 1 step". Severity 1.
10. **"all 291=" / "all 29="** in the betweenness distribution still reads as a typo. Severity 2.
11. **Two degree columns** ("degree" and "degree on: full graph") with no hint which to report,
    and no statement that a filtered degree counts only neighbors that survive. Severity 2.
12. **Module legend rows are not clickable** as a way to filter to one module; she found the
    filter only through the chip. Severity 2.
13. **The load-step page opens on the mock's state bar and a transactions file**, with links like
    "Weight read as text" and "Show annotations" that look like part of the app. She first thought
    she had the wrong page. Severity 1 (study material, not product).
14. **"The barricade, 0 of 13"** in Sets and paths after filtering took her a minute to connect to
    the filter step. Severity 1.

## What worked

- "No filter steps. Every number reads the full graph." -- the empty filter popover told her what
  the chip does before she used it.
- Step rows with "took out 17 -- 60 left" and "at least 5 neighbors among the 60 it reads".
- The funnel repeated on every filtered number and on the chip.
- The repeated-pairs options now explain what each choice does to degree.
- The "Last import" receipt and the named proteins GSK3B and NOTCH1.
- The "Exact" tooltip.
