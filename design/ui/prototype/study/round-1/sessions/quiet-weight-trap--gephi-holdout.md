# Session: can the rankings be trusted? (the Gephi holdout)

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, ten years of Gephi.
**Task as given:** "Something about these rankings bothers a reviewer. Find out whether the
numbers can be trusted." The planted problem: on Les Miserables, the edge weight counts how
often two characters appear together (bigger means closer), and a path measure read it as a
distance (bigger means farther).
**Screens used:** the Results panel, then the load step.
**Outcome:** finished with difficulty. She worked out where the weight's meaning is set, and that
changing it flags the path results as out of date. She could not confirm, from any result, how a
weight had been turned into a distance.
**Single Ease Question:** 3 of 7.

## Think-aloud

**1. The Results panel, first screen (a PageRank run on patent citations).**
"OK, this is not Les Mis. This is a patent citation network, 124 thousand nodes. Fine, I'll assume
it's the same panel whatever the data is. PageRank is running, 'on: full graph, 124,318 nodes.
Exact. Directed.' -- good, it says what it ran on. That's the thing Gephi never tells you. There's
a Weight dropdown, 'None declared', greyed. So this PageRank ran unweighted. That's what I'd want
to know first."

"The reviewer's complaint is about rankings, so I want a finished one with a table of numbers.
Across the top there's a row of numbered links, '8. Finished'. I'll click that."

**2. Finished: betweenness on the human protein network.**
"Still not Les Mis. Human proteins, 300 nodes. OK. Betweenness, and the line under the title:
'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU.' I like that
line. If this were weighted it would have to say 'weighted' here, and that is where I'd look for
the reviewer's problem. It says Unweighted, so on THIS run the weight can't be the problem."

"Top nodes: MAPK1 0.1379, TP53 0.1139. Is that normalized? NetworkX normalizes by default, Gephi
shows both. It doesn't say. I would check MAPK1 against `nx.betweenness_centrality` before I'd
believe it. The distribution has a note, 'bar height: square root of the count' -- fine, but that
text is tiny. I'm squinting."

"There's a 'Details' link after 'WebGPU.' I'd click it expecting the full record: which weight,
how it was converted, what version. [Clicking it shows nothing new in the prototype.] Nothing. So
I don't know what Details would tell me. That's the link I'd need most."

**3. Going looking for a weighted run.** "The task says similarity used as distance. So I need a
result that USED a weight. Weight field is 'None declared' on every one of these. Let me go through
the numbered states." [Pages through Out of date, Editor error, Closeness.]

**4. Editor error.** "Here someone typed 'confidnce' into Weight on Betweenness and it says
'unknown attribute confidnce; Closest: confidence'. Good, it doesn't silently run unweighted on a
typo. That's actually the kind of thing that bites my students. And over on the right, under the
graph statistics, 'Edges: undirected, similarity weight'. So the graph knows confidence is a
similarity. Where did that get set? Not here."

**5. Out of date.** "This one is interesting. 'confidence is now read as a similarity; these read
it as a distance.' Louvain and 'Shortest path TP53 to SMAD3' are flagged out of date, with Re-run.
So if I -- or whoever loaded Les Mis -- changed what the weight means, the path results get a
warning. That IS the reviewer's problem, and the tool catches it. Good."

"But wait. It says 'Betweenness and Closeness read no weight, so they stay current.' Two screens
ago Betweenness had a Weight box I could type into. So does betweenness read a weight or not? If I
put the Les Mis co-appearance count in there, does betweenness treat it as distance? Then it should
be on this list too. Either the sentence is wrong or the Weight box on Betweenness is. That's
exactly the kind of contradiction a reviewer finds and I have to explain in a response letter."

"And Louvain 'read it as a distance'? Louvain reads weights as strengths. Modularity with a
distance makes no sense. Maybe I'm misreading; I'd want that sentence to say which of the two it
means per row."

**6. The load step.** "The moderator said load-step too. Presumably the weight meaning is set when
the file comes in." [Looks at the first load frame, a transfers CSV.] "Columns, Read as, Role.
amount -> Weight, and then 'amount as a weight means: Similarity / Distance / Capacity / Unknown',
Unknown picked, and 'Paths ignore it; PageRank and communities read it as a similarity.' OK! This
is the thing. Gephi has nothing like this. In Gephi 'Weight' is just a column and Dijkstra-ish
stuff treats it as a cost whether you meant it or not."

[Looks at the Repeated pairs frame.] "Similarity picked, 'Larger is closer', and then 'As a
distance: 1 - w'. 'Offered first because every value is between 0 and 1. Other choices: 1/w, -log
w, or ask when a path first needs it.' Right, so for Les Mis the co-appearance counts go from 1 to
31 or so -- 1 - w would give negative distances. I'd hope it offers 1/w first there. The note says
it chooses by the range, so presumably yes, but I can't see a Les Mis version to be sure."

"So my answer to the reviewer: if whoever loaded it said 'Distance', or left it at the wrong role,
the betweenness ranking on Les Mis is inverted -- the characters who appear together MOST become
the farthest apart, and Valjean's bridges look wrong. To check, I'd open the graph's Edges row on
the right ('similarity weight' or not), and then the result's state line should say 'weighted' and
HOW. That's the part I can't see anywhere: no result screen says 'weight: value, similarity,
distance = 1/w'. The state line only ever says 'Unweighted'."

**7. Where would I change it after loading?** "If it was loaded wrong, where do I fix it? The load
dialog is gone by then. The right panel says 'Edges: undirected, similarity weight', and there's
'4 more'. I'd guess I click that. I'm not sure. In Gephi I'd just edit the column in the Data
Laboratory. I don't see a node or edge table here at all."

## After the task

**SEQ: 3.** "I found the idea of the answer, but I had to stitch it together from three screens,
and the one screen I needed -- a weighted result telling me how it used the weight -- isn't there."

**Would she use it instead of Gephi?** "Not for this yet. Declaring what a weight MEANS at load is
the best idea in this whole thing -- honestly, I'd put it in my methods section. And the 'these
read it as a distance, re-run' warning is what I wish Gephi had after I mess with a column. But I
can't show a reviewer which conversion was used, the betweenness sentence contradicts the
betweenness Weight box, and I can't see the edge table to check the numbers myself. Until the
result line says 'weighted by value, read as similarity, distance 1/w', I'd rerun it in NetworkX
and cite that."

## Problems observed

1. **No result states how a weight became a distance.** Every state line reads "Unweighted"; there
   is no weighted run whose line names the attribute, its declared meaning and the conversion
   (1 - w, 1/w, -log w). Severity 3.
2. **"Betweenness and Closeness read no weight" contradicts the Weight box on Betweenness.**
   Severity 3.
3. **"These read it as a distance" lists Louvain,** which reads weights as strengths; the sentence
   does not say per row what each result did with the weight. Severity 2.
4. **Details after the engine name leads nowhere visible;** it is the link an expert would open to
   audit a run. Severity 2.
5. **1 - w is the default conversion shown;** on count weights like Les Miserables it would give
   negative distances. The note says the default follows the range, but no count-weight example
   shows it. Severity 2.
6. **No visible way to change a weight's meaning after load** other than guessing "4 more" on the
   right panel, and no edge table to check values. Severity 2.
7. **Normalization of betweenness values is not stated,** so the numbers cannot be checked against
   NetworkX or Gephi without guessing. Severity 2.
8. **Small secondary text** (distribution footnote, legend notes) is hard to read. Severity 1.

## What worked

- The state line "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected." -- the
  trust check she has wanted from Gephi for a decade.
- Declaring at load what a weight means, with a plain gloss ("Larger is closer", "Paths ignore
  it").
- A typo in the Weight field is refused with the closest match instead of silently running
  unweighted.
- Changing a weight's meaning flags the results that depended on it as out of date, with Re-run.
