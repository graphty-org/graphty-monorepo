# Session: "What groups are there, and what makes the biggest one different?" -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite; see `../../personas/gephi-holdout.md`),
associate professor, Gephi user since 2012.
**Task, as the moderator gave it:** "What groups are there in this network, and what makes the
biggest one different?"
**Material:** three static mocks, in this order: the Results panel, the Styles list and the
Inspector, at 1440 by 900. They are pictures, not a working app: where she "clicks", the session
moves to the frame that shows what that click would produce, and when no frame shows it, she is
told so.
**Outcome:** failed. She named the groups only by reading an attribute the file already carried;
she could not get a community detection result to finish, and she could not say what sets the
biggest group apart.
**Ease (1 very hard to 7 very easy):** 2.

---

## Transcript

Moderator reads the task. Mara is looking at the Results panel, the "Patent citations" project.

**Mara:** OK. Groups. In Gephi that's Statistics, Modularity, Run, then Appearance, Partition,
modularity class. So I want the statistics panel. Is this it? "Results". Fine, there's a flask icon,
I'll take it.

*(She reads the left column.)*

**Mara:** "Catalog", "Centrality", "Community". Good, there's a Community heading. Girvan-Newman,
Label propagation, Leiden, Louvain. Where's Modularity? ... Oh, I see, they've named it by the
algorithm, which is more honest than Gephi to be fair -- Gephi's "Modularity" button IS Louvain. I'd
have typed "modularity" into this search box, "Find a result or algorithm". Does that find Louvain?
I can't tell from here.

**Moderator:** It is a picture; what would you do?

**Mara:** I'd type modularity and if nothing came up I'd be annoyed and click Louvain. Clicking
Louvain.

*(She is shown the frame where Louvain is queued behind a PageRank run.)*

**Mara:** "Queued behind PageRank; under a minute once it starts. On: full graph, 124,318 nodes.
Edges read as undirected." Now THAT I like. It says what it runs on. Full graph, not the filtered
view. Gephi never tells you that; half my students run modularity on the giant component without
knowing it. So, credit.

*(Reads the options.)*

**Mara:** Scope, Direction, Weight -- "None declared", fine, citations have no weight. Resolution
1.0. Where is the seed? Where is "randomize"? Louvain is not deterministic. The betweenness one two
rows up has a Seed field, 7, and the one algorithm on this screen that actually NEEDS a seed doesn't
show one. Reviewer two is going to ask me why community 7 became community 4, and I need to be able
to say "seed 42, resolution 1.0".

*(She looks at the canvas.)*

**Mara:** And the canvas is empty. "124,318 nodes not drawn: more than this browser draws at once
(50,000). Narrow the graph." Well. There it is. Web tool, big graph, no picture. My retweet
networks are 60k. So I compute communities and I can't see them? The whole point of Gephi is that I
see the map while it computes. I'll give it this: it says so plainly instead of melting. But I'd be
closing the tab about now in real life.

**Moderator:** Please keep going.

**Mara:** Fine. It runs. Where does the result go? "Appearance: its color layer is added when it
runs." So it'll color by community automatically. OK -- I'd rather choose that myself, but OK. Show
me the finished Louvain.

**Moderator:** There is no frame of Louvain finished on this screen.

**Mara:** Then I'm stuck on the first step. What's there that's finished?

*(She is shown the finished Betweenness frame on the "Human protein interactions" project.)*

**Mara:** Different dataset now, 300 proteins. Betweenness, with a distribution and a top-nodes
list. That's nice, that's better than Gephi's little HTML report. But that's not groups. Let me
check the counts while I'm here: 300 nodes, 1,262 edges, average degree 8.41 -- two times 1,262 over
300 is 8.41, yes. Density on the other screen, 0.0281 -- 1,262 over 300 times 299 over 2, yes. The
numbers add up, which is more than I expected.

*(She scans the Catalog again on this project: Louvain, Leiden -- no timing, no state.)*

**Mara:** There's one frame, "out of date", with a Louvain in "Needs action". So somebody ran
Louvain on this protein graph at some point. Out of date because the edge weight changed meaning.
Re-run. Fine, and then? Still no picture of what it produced. Where do the communities live
afterwards? A column in a table? Is there a table? I haven't seen a table on any of these screens.

*(She moves to the Styles list mock.)*

**Mara:** Right, here are colored clusters. Legend at the bottom: "Module color, module". Ribosome
56, Proteasome 40, Complex I 35, Spliceosome 32, MAPK signaling 31, four more. And on the right under
Attributes, "module: 9 values".

So is "module" the Louvain result? ... No. Those are names. Louvain doesn't name anything; it gives
you 0, 1, 2. These are biological annotations that came in with the file. So these aren't
communities the tool FOUND, these are labels somebody already put on the proteins. That's a
partition by an existing attribute, which in Gephi is Appearance, Partition, pick the column. Fine,
I can answer half the question with that, but I want to be clear I'm not answering it with the
tool's community detection. Those could be completely different groupings.

**Mara:** So: nine modules, the biggest is Ribosome with 56. That's the "what groups" answer, if
the moderator accepts the annotation instead of a detection.

*(She reads frames 8 and 9: the Module color layer dragged above Betweenness color so the module
colors win.)*

**Mara:** And I can drag the module coloring above the betweenness coloring and it wins. That's a
layer stack. Photoshop for graphs. Gephi just has "the last thing you applied". Fine, I see why,
but this is a lot of machinery to answer "color by module". Fourteen layers, "3 layers paint
nothing"... my students would get lost in here.

**Mara:** Now, what makes Ribosome different. In Gephi I'd filter to modularity class equals that
one, then look at the Data Lab sorted by degree, and compare the average degree and the internal
versus external edges by hand. Where do I do that here?

*(She moves to the Inspector mock.)*

**Mara:** OK, click one protein, TP53: module "DNA repair", degree 32, "#2 of 300", betweenness,
pagerank, each with a rank. The rank is useful, I'll give it that. Not what I need though.

*(Frame 6: the DNA repair set.)*

**Mara:** Now this is closer. A "set", DNA repair, rule "module = DNA repair". Statistics: edges
inside 105, edges out 42, neighbors out 40, average degree 8.4. Members by degree. That IS the
thing I'd compute by hand. Let me check: 105 inside is 210 endpoints, plus 42 out, 252, over 30
members, 8.4. Consistent.

But it's DNA repair, 30 proteins. It's not the biggest one. To get Ribosome I'd have to... what,
make a new set with the plus next to "Sets and paths", write a rule module equals Ribosome, then
select it and read these numbers. Then do that eight more times, and write them down, and compare
them myself. And the "edges inside / edges out" -- is that 105 against the network average? What's
normal? The whole graph's average degree is 8.41 and this set's is 8.4, so DNA repair is... average.
That's not a finding.

**Mara:** What I actually want is one table: nine rows, one per group, with size, internal edges,
external edges, internal density, conductance or at least the ratio, and the modularity
contribution. Sortable. Then the biggest one's difference jumps out. I don't see that anywhere. The
legend has counts and nothing else.

**Moderator:** Anything else you'd try?

**Mara:** Select all of Ribosome from the legend and see what the inspector says? The legend rows
don't look clickable. There's a crosshair icon next to "DNA repair  Module color" in the set's
Appearance section -- maybe that selects them? I'd guess, and I'd be guessing. And the one thing I
came here for, the tool finding the communities, the text at the top of this page says a community
from a run "is not drawn yet". So they know.

**Mara:** My answer, for the record: nine annotated modules, biggest is Ribosome at 56 proteins,
and from the picture it's the dense light-blue blob on the right with not much going out, so I'd
GUESS it's more self-contained than the others. I can't back that with a number from this tool
without building nine sets by hand. That's the hairball-reading I tell my students not to publish.

---

## After the task

**Single Ease Question:** 2. "The pieces are there, scattered. Nothing takes me from 'find the
groups' to 'compare the groups'. And the one algorithm I needed never finished on screen."

**Would she use this instead of Gephi?** "No. Not for this. In Gephi this is Modularity, Run,
Partition, then a filter and the Data Lab, ten minutes. Here I couldn't get a community result to
look at, the Louvain options have no seed so I couldn't cite the run anyway, and the big graph isn't
drawn at all. What I'd steal from it: the line that says what a statistic ran on -- full graph, how
many nodes, undirected -- and the set statistics, edges inside and out. Put those in a per-group
table next to the communities and you'd have something I'd show my students. Today I'd stay on
Gephi."

## What she liked (earned, not offered)

- Every run states what it ran on: "on: full graph, 124,318 nodes. Edges read as undirected." She
  called this the fix for the thing she warns her students about every year.
- The numbers she checked by hand (average degree, density, the set's edges inside and out) all
  agreed.
- A set's Statistics block (edges inside, edges out, neighbors out, average degree) is the
  comparison she normally does by hand.
- Rank beside each value in the Inspector ("#2 of 300").
- The drawing limit is said plainly rather than the page freezing.

## Problems, worst first

1. **No finished community result anywhere.** Louvain appears only queued or out of date; the
   Inspector page itself says a community from a run is not drawn yet. The task's first step
   cannot be completed with the tool's own detection. (Results panel, Inspector.) Severity 4.
2. **No way to compare groups.** Group size lives in the legend, per-group statistics live only on
   a hand-made set, one at a time. There is no table of all groups with size, internal and external
   edges, density or modularity contribution. The second half of the task has no home. (Styles
   list legend, Inspector set.) Severity 4.
3. **Louvain shows no seed or randomization option**, while sampled Betweenness does. A partition
   she cannot reproduce is one she cannot publish. (Results panel, Louvain options.) Severity 3.
4. **The given groups are indistinguishable from detected ones at a glance.** "Module color" with
   named groups looks like a community result; only her domain knowledge told her it was an
   imported annotation. (Styles list, legend and attributes.) Severity 2.
5. **Large graph not drawn** (124,318 nodes past a 50,000 limit): she computes communities she
   cannot see. Honest, but for her retweet networks it is disqualifying. (Results panel canvas.)
   Severity 3.
6. **No modularity score** shown anywhere; a Louvain run without Q is half a result. (Results
   panel.) Severity 2.
7. **Vocabulary:** no "modularity" anywhere; she could not tell whether search maps it to Louvain.
   "Set", "layer", "module" all need translating back to partition and filter. Severity 2.
8. **Layer stack weight:** fourteen layers, "3 layers paint nothing", drag to reorder -- a lot of
   machinery to do "color by this column". She doubts students would follow it. Severity 2.
