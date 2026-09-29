# Session: read the numbers -- Dr. Chen, computational biologist

Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md). Round 2, simulated.
Task as given by the moderator: "You loaded 300 proteins and filtered to one module. Explain every
count on screen, and why the node count is not 300."
Screens, in order: the load step, the graph at rest (Proteins data), the filter chip, the Results
panel. Clickable behaviour was read from each page's HTML, as a prototype would behave.

## Outcome in one paragraph

She could account for every count on the load step and on the graph at rest, and the load step's
"298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1" line was the best moment of
the session. She could not do the actual task on the protein network: the "Full graph" chip on the
protein screen does nothing, and the only filter screen is a different dataset (a novel's
characters). She transferred what she learned there back to proteins and got the principle right
(the chip is the scope; counts with a funnel are on the filtered set; the table names "on: full
graph" when a column is not), but she never saw the module-filtered protein view, so "why is it not
300" was answered by inference, not by reading. She also caught three different descriptions of the
same edge weight across the screens, which is the thing she would have stopped the session over.

## Transcript (think-aloud)

### 1. The load step

> OK, "Open a graph". First frame is a bank transfers CSV -- not mine. Skipping to the ones that
> say protein.

Frame 3, `ppi-core-300-evidence.tsv`.

> Right, this is what a STRING-style export looks like: protein_a, protein_b, source, confidence.
> "TSV, tab, header row" -- it guessed, and it tells me what it guessed. Good. Undirected, correct.
> confidence read as "Number, NA as missing", role Weight. Fine.
>
> "1,036 extra parallel edges. Several rows join the same two proteins, one per evidence source."
> Yes. That's exactly it -- PSMA1-PSMB10 comes in once from databases, once from textmining, once
> from experiments. Keep all is 2,298; merge is 1,262. 2,298 minus 1,036 is 1,262. OK, that adds up.
> And it says what merge does: max of confidence. I would want to choose max versus combined score,
> STRING doesn't take the max, it combines channels -- but at least it says max. I'd pick merge.
>
> "What will load: nodes 298, edges 2,298, without a weight 150." 298. The file is called core-300.
> And then the line under it: "298 nodes -- 2 proteins in the file have no interaction: GSK3B,
> NOTCH1." Thank you. That is the exact sentence I never get from Cytoscape. It names them.
>
> 150 without a weight -- 150 of what, 150 of the 2,298 rows, or after the merge? If I switch to
> merge does it become fewer? It doesn't say. I'd want to hover it.

Frame 8, `ppi-core-300.graphml`.

> GraphML version of the same network. 300 nodes, 1,262 edges. So here the two lonely proteins are
> in, because GraphML lists nodes separately. That's consistent with frame 3, and 1,262 matches the
> merge number. Good.
>
> But confidence here has role "None". So in this version the confidence is loaded as a column,
> not as the weight. Remember that.

### 2. The graph at rest (Proteins)

> Now I've got the picture. It's 2D, thank you. Coloured by the module column from the file.
>
> Legend: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, MAPK signalling 31, DNA repair
> 30, Cell cycle 29, TGF-beta 21, Other 26. [adds in her head] 56, 96, 131, 163, 194, 224, 253, 274,
> plus 26 is 300. OK, the legend sums to the node count. That's the first thing I check.
>
> "Other 26" -- is "Other" a value in my file, or is the legend lumping the small ones? The loader
> said the module column had 9 values. Eight named plus one. So probably it's a real value. But the
> Results table later calls it "Unassigned". So which is it? If my file says "Unassigned", say
> "Unassigned".
>
> Right panel. Nodes 300. Edges 1,262, "undirected, weight: confidence". Density 0.0281 -- 1,262
> over 300 times 299 over 2, that's about 0.028, fine. Connected components "3 (2 isolates)" --
> that's GSK3B and NOTCH1 plus the main blob. Consistent with the load step. Good.
>
> But wait: "weight: confidence". On the GraphML load, confidence was role None. So either this is
> the TSV load -- but then nodes would be 298 -- or someone set the weight after loading. I can't
> tell from here.
>
> Now the task. Filter to one module. The chip top left says "Full graph". I click it.

[The chip on this page is not wired; nothing opens.]

> Nothing. OK. I right-click a legend entry, Proteasome -- nothing either. In Cytoscape I'd select
> by column value and make a subnetwork. There's no "select" anything here I can see. I'll go to the
> filter screen the moderator mentioned.

### 3. The filter chip

> This is... Les Miserables? Valjean, Fantine. Not proteins. OK, I'll pretend "group" is my module.
>
> Chip says "Filtered: 28 of 77 nodes - 3 steps". Popover: Filter to Largest component, 76; Filter
> to degree >= 5, 41, "3 dropped below degree 5 by Filter out group = 8"; Filter out group = 8, 28.
> So each step shows how many are left after it, in order. That reads like a pipeline, which I like
> -- it's basically my dplyr chain. And the degree step warns me that a later step changed what an
> earlier step would have kept. That's honest. Slightly confusing, but honest.
>
> Right panel: "Filtered graph: 28 of 77 nodes", edges "105 of 254", each with a little funnel. The
> tooltip on the funnel says "counted on the filtered graph". Legend: 9, 8, 7, 3, 1 -- sums to 28.
> So the legend follows the filter. Table: "Filtered graph: 28 of 77 nodes", with degree (filtered)
> and "degree on: full graph" side by side. Valjean 18 here, 36 in the full graph.
>
> That column is the important one for me. If I filter to the proteasome module and rank by degree,
> I need to know whether PSMA1's degree is inside the module or in the whole interactome. Here it
> tells me both. Good.
>
> Editing a step: "Degree counts neighbors in the graph this step reads. Scope: after step 1: 76
> nodes. Result: leaves 41; takes out 35." Fine. I would click that.

So, answering the moderator by transfer:

> If I filtered the protein network to Proteasome I'd expect the chip to say "Filtered: 40 of 300
> nodes", because the legend said Proteasome is 40. Edges would be the edges with both ends in the
> module -- I can't tell you the number, nothing shows it. The legend would show one row, 40. The
> table would say "Filtered graph: 40 of 300" and the degree column would be degree inside the
> proteasome, with full-graph degree beside it.
>
> Why isn't it 300? Because the filter keeps 40. And if you mean why the file isn't 300 -- if you
> load the TSV it's 298, because GSK3B and NOTCH1 have no edges and an edge list can't carry them;
> the GraphML carries them. Both explained on the load screen.
>
> But I'm guessing all of this from a novel. I never saw the protein network filtered. If the
> number came out 41 I'd have no way to know why.

### 4. The Results panel

> Finished betweenness, proteins. "on: full graph, 300 nodes, 3 components. Exact. Unweighted,
> undirected. WebGPU." Weight: "None declared". Right panel: Edges "undirected, no weight".
>
> Hold on. The graph screen said "undirected, weight: confidence". Now it says "no weight". Then the
> Louvain frame says "undirected, similarity weight" and Louvain ran with "confidence as
> similarity, 0.40 to 0.99; bigger is a closer tie". Three different descriptions of the same edges.
> Is confidence a weight on this network or not? If betweenness ignored confidence, fine -- say
> "confidence present, not used". If I put this in a methods section I have to write one sentence
> and I don't know which one.
>
> Distribution: 300 nodes, zero: "10 nodes, all 291=". Ten proteins with zero betweenness sharing
> rank 291. The legend says "Log scale; the 10 proteins at 0 take the lightest color". OK, that's
> precise. I like "291=", that's how a ranking should show ties.
>
> Louvain: 10 communities, modularity 0.716, "the file's modules 0.663". Seed 7, resolution 1. OK.
> That's a real sentence I can quote -- detected partition is more modular than the annotated one.
> Largest 62 proteins, single proteins "2, no interaction". The communities table: Community 2 is
> "Proteasome 40 of 43". So Louvain put 3 non-proteasome proteins in with the proteasome. Makes
> sense. And "Export table as CSV" is there. Good -- that's my TSV, more or less.
>
> Cell cycle "29 of 30"; the legend on the graph said Cell cycle 29 total, so all 29 are here. DNA
> repair: legend 30, table "29 of 29" in community 8 -- so one DNA repair protein is somewhere else.
> Fine, that's consistent if I think about it.
>
> The one with the Les Mis filter -- "Results after a filter" -- says "on: filtered graph, 76 nodes"
> and the run record says "Normalization: divided by (n-1)(n-2)/2 = 2,775 node pairs; n = 76, the
> filtered graph". Oh, that's good. That's the thing a reviewer asks: normalised over what? It tells
> you n. If I filter to 40 proteasome proteins, betweenness would be normalised over 40, not 300, and
> it says so. That's more than Cytoscape's NetworkAnalyzer ever told me.

## After the task

**Single Ease Question: 3 of 7.**

> Reading any one screen was easy -- every number had its denominator next to it, and I could add up
> the legend. The task itself was hard because I couldn't do it: I couldn't filter the proteins. I
> had to work it out from Les Mis, and I had to reconcile three different statements about whether
> confidence is a weight.

**Would she use this instead of her current tool?**

> For looking at a module and making a figure, maybe, if the weight thing is fixed. The load screen
> is better than Cytoscape's import -- naming GSK3B and NOTCH1 instead of silently giving me 298 is
> exactly right. The "on: full graph" versus filtered labelling and the run record with n are what I
> need for a methods section. But it doesn't replace R. I didn't see an API. The CSV export on the
> communities table is the only way back into my pipeline I saw. So: a viewer and a figure tool,
> next to igraph, not instead of it.

## Problems observed

1. **The protein screen's filter chip does nothing, and no screen shows the proteins filtered.**
   The task could only be done by analogy on a different dataset. Every count she gave for the
   module view (40 nodes, edge count unknown) was inferred. Severity 3.
2. **The edge weight is described three ways.** Graph at rest: "undirected, weight: confidence".
   Results, betweenness: Weight "None declared", Edges "undirected, no weight". Results, Louvain:
   "undirected, similarity weight". The GraphML load set confidence's role to None. She cannot write
   one methods sentence. Severity 3.
3. **"Other" in the legend versus "Unassigned" in the communities table.** The same 9th module value
   has two names. Severity 2.
4. **"without a weight 150" has no stated base.** 150 of the 2,298 rows, or of the edges after a
   merge? It does not say whether it changes with the parallel-edge choice. Severity 2.
5. **Merge rule is max, and the only choice.** STRING combines channel scores rather than taking the
   maximum; "max of confidence" is stated, which she values, but she would want the rule to be a
   choice. Severity 1.
6. **Edge count after the module filter is not predictable from anything on screen.** The legend
   gives node counts per module but no edges-inside count until Louvain's table; for the file's own
   modules there is none. Severity 2.

## What she liked

- "298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1": the node deficit is
  named, with the names.
- The parallel-edge issue: 2,298 rows, 1,036 extras, 1,262 merged, and the arithmetic closes.
- The legend sums to the node count, and on a filter it re-counts over the filtered set.
- "degree" and "degree on: full graph" side by side in the table.
- Run record normalisation stating n for the filtered graph.
- Ties shown as "291=".
- Modularity of the detected partition next to the file's own modules' modularity.
