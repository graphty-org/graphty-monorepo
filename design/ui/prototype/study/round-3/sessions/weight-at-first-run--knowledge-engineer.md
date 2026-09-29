# Session: a weight at the first run -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (see ../../personas/knowledge-engineer.md).
Task as given by the moderator: "Run PageRank on a network whose edges have a confidence column
you have never thought about."
Screens used: the option form with a cost (option-form-cost), then the Results panel
(results-panel). The participant looked at the renders and asked what a control would do when it
was not drawn; the moderator answered from the prototype's own behaviour.

## Transcript (think-aloud, lightly trimmed)

**First screen, the option form.**

"OK. Human protein interactions, 300 nodes, 1,262 edges. Nodes and edges, labelled as nodes and
edges, not 'items'. Good. Undirected. And on the right, under Statistics: 'weight -- confidence:
numbers, not used'. That is the first thing on this screen I actually like. It found a numeric
column called confidence and it is telling me, before I ask, that nothing is using it. Most tools
either silently use the first numeric column as a weight or silently ignore it, and you find out
which when a number looks wrong."

"But the task is PageRank, and the open form is Betweenness. Somebody else's result, apparently.
The catalog on the left has PageRank at the bottom of Centrality. I would click that."

(Moderator: the prototype has no PageRank form drawn; clicking PageRank in the catalog would open
the same kind of form for PageRank.)

"So I am being asked to imagine PageRank's form from Betweenness's. Fine, I will read this one as
the pattern. There is a warning: 'Can't weight paths by confidence: confidence isn't set up as a
length yet.' Length. For Betweenness, shortest paths, a length makes sense. For PageRank there is
no length, there is a transition probability. Then the next sentence: 'Until you say what a higher
confidence means, no measure uses it, PageRank included.' OK, that sentence is the one that
answers my task. It names PageRank. So the rule is global: the column is off for every measure
until I declare what it means. I can defend that. I cannot defend a tool where confidence is a
weight in one result and nothing in the next."

"What I do not know is what PageRank's own refusal says. Does it also say 'length'? If it tells me
PageRank needs a length I will assume someone copy-pasted the message."

**The question the refusal opens.**

"The button is 'Set up confidence'. Click. Now: 'For confidence, a higher number means...'
with examples 0.99, 0.79, 0.40. Real values from the column -- good, that is the first thing I
would have gone to SPARQL to check. What I also want and do not get: how many edges have no
confidence at all. In our data a missing confidence is common and it does not mean zero. Is a
blank a 0, a 1, or is the edge dropped? Nothing here says."

"The four choices. 'A closer or stronger link -- similarity.' 'A longer or costlier step --
distance.' 'More can pass through -- capacity.' 'Don't use confidence.'"

"Here is my problem, and I want it written down exactly. Confidence is not any of these. It is an
epistemic value: the probability that the statement is true. The interaction may not exist at
all. It is not a strength of the interaction, it is my belief in it. None of the three meanings
is 'how sure are we this edge is real'."

"For PageRank specifically, I know what I want to happen: the random walker follows an edge in
proportion to its confidence, so a 0.40 edge carries less than a 0.99 edge. That is exactly the
arithmetic of 'similarity'. So I will pick 'a closer or stronger link', and I will be the one
explaining in a meeting that we did not claim the proteins are 'closer', we weighted by belief.
The label is wrong for my data; the arithmetic is right. I would have liked either a fourth
meaning -- 'how likely the link is real' -- or at least one line under the question saying what
PageRank does with each answer. If I had picked 'distance', what would PageRank do, invert it? One
over 0.40? It does not say. For a measure with no paths, 'distance' is a trap."

"'The answer is kept on confidence: every measure and the Path tool read it.' So this is a
declaration on the column, not an option of this run. That is the right place for it -- it is a
fact about the data, like a range on a property. But it is a big side effect for a radio button.
If I answer this inside PageRank's form I am also changing what Shortest path does next week. I
would want that said before I click, not in grey under the choices. It is said, to be fair. It is
in the smallest text on the panel."

"'Nothing runs until you answer.' Run is greyed. Fine. No surprise run. I like that."

**After answering, the Results panel.**

(Moderator: after the answer, Run turns on; the participant clicks Run. The prototype shows the
finished state on a weighted Louvain result drawn the same way; the moderator pointed her to it.)

"The state line: 'Weight: confidence, higher = stronger link (your answer)'. 'Your answer'. Yes.
That is provenance. It is not pretending the tool decided. And Details opens a run record: method,
seed, damping, normalization, weight conversion: 'confidence used as given, 0.40 to 0.99; higher =
stronger link (your answer, given in the option form of the first run that read it)'. That is
what I would paste into a Confluence page next to the number. Damping says 'Does not apply' here
because it is Louvain; on PageRank I assume it would say 0.85. The failed-run screen elsewhere
shows 'damping 0.85', so I believe it."

"Still missing in that record: how many edges had no confidence, and what was done with them. The
range 0.40 to 0.99 tells me the minimum of what was there, not what was absent."

"The out-of-date screen: 'confidence is now read as a similarity; these read it as a distance.
Louvain, Shortest path TP53 to SMAD3.' So if I change my mind the results that used the old
meaning are flagged and the unweighted ones stay current. That is correct behaviour and more than
Gephi or Neo4j Bloom has ever told me."

"The colour ramp on the canvas is orange to dark brown, one hue, log scale, with the zero case
stated. I can read that. Nothing here is red against green."

## Single Ease Question

4 of 7. "Getting it to run was easy; knowing I had told it the right thing was not. The question
has no answer that means 'probability the link is real', and it does not say what PageRank does
with each answer."

## Would she use it instead of her current tool?

"For this job -- a weighted centrality on an exported edge list, with a record of what the weight
meant -- yes, over Gephi, whose weight handling I have never been able to document, and over a
notebook for a quick look. The refuse-until-declared rule and 'your answer' in the record are the
reasons. It is not a replacement for my triple store: I had to flatten to an edge CSV to get here,
and the question it asked me is a property-graph question, not a statement-about-a-statement
question. Give me a meaning for 'how sure are we' and a count of edges with no value, and I would
put its numbers in a governance report."

## Problems observed

1. No PageRank form exists; the refusal and weight question are drawn only for Betweenness, so
   the participant had to infer PageRank's behaviour. (severity 2)
2. The refusal says "isn't set up as a length yet", wording that fits path measures only; for
   PageRank it would read as a copy error. (severity 2)
3. None of the three meanings fits an epistemic confidence (probability the edge is real); the
   participant chose "similarity" as the least-wrong arithmetic, knowing the label misdescribes her
   data. (severity 3)
4. The question does not say what the chosen measure does with each answer (for PageRank, what
   "distance" or "capacity" would do to the walk). (severity 3)
5. Missing values in the weight column are not counted or explained, neither in the question nor
   in the run record's weight conversion. (severity 3)
6. That the answer is written onto the column and changes every measure and the Path tool is said
   only in the smallest grey text under the choices. (severity 2)
