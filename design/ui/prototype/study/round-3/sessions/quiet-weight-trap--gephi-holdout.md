# Session: can these rankings be trusted? -- the Gephi holdout

Participant: Dr. Mara Lindqvist (simulated; associate professor, Gephi user since 0.8).
Task as given: "Something about these rankings bothers a reviewer. Find out whether the numbers
can be trusted." The problem planted in the data: the Les Miserables co-appearance counts (more
chapters together = a stronger tie) read as a distance, which would make the strongest ties the
longest paths.
Screens: the Results panel (all its states) and the load step, as static renders.

## Transcript (thinking aloud)

**Opening the Results panel.** "This is not Les Miserables. Patent citations, 124,318 nodes,
PageRank running. The strip across the top has twenty numbered states. I'll look for my data
by name." Scans the strip. "Number 14, 'Results after a filter' -- that is the only one that
says Les Miserables in the left panel. Going there."

**The Les Miserables state.** "Les Miserables, 'Filtered: 60 of 77 nodes, 1 step'. Good, it
says so at the top, not in a footnote. Seventy-seven is right for the full graph. Betweenness
is open. The first line: 'on: filtered graph, 60 nodes, 1 component. Exact. Unweighted,
undirected. WebGPU.' Well. Gephi would never have told me that in one line. That is my
question 6 answered before I asked it."

"Top five: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. From
memory, NetworkX on the full 77 gives Valjean about 0.57, then Myriel, Gavroche, Marius,
Fantine. Myriel is gone here -- of course, the degree filter strips his ten one-chapter
bishops' friends and he stops being a bridge to anyone. So the numbers move the way they
should for a filtered graph. I'd have to run NetworkX on the same 60 to check the decimals,
and I can, because it tells me the filter: degree >= 2."

**Details (the run record).** "Method: Brandes, exact, every node a source. Seed: none. Damping:
does not apply. Normalization: divided by (n-1)(n-2)/2 = 1,711 pairs, n = 60, the filtered
graph. Weight conversion: None, unweighted. Scope. Engine." Taps the table with a finger.
"This is a methods paragraph. There is a Copy button. This is the part I would actually use."

**Now the reviewer's worry.** "The task says the reviewer is bothered by the rankings. With Les
Mis the classic mistake is to feed 'value' -- the number of chapters two characters share --
into shortest paths as if it were a length. Then Valjean and Cosette, who share thirty-odd
chapters, are the FARTHEST apart, and betweenness rewards the walk-on characters. So I want to
know: which column is the weight, and is it read as strength or as cost?"

"Right panel, Edges: 'undirected, no weight'. Hmm. Les Mis HAS a weight. The GML ships with
'value' on every edge. So either this file was loaded without it, or it was dropped. That is
exactly the sentence that makes me close a tool: 'It lost my data.'" Looks for the attribute
list. "'4 more' under Statistics -- maybe value is in there. I can't open it; it's a picture."

"The Weight field in the editor says 'None declared'. None declared by whom? By me at load? By
the file? I'd click it to see what's in the list." Checks what the control does. "It's a
dropdown with nothing behind it in this prototype. I can't see if 'value' would be offered, or
what it would ask me."

**Trying the load step to find where weight gets declared.** Opens the load step. "This is a
bank transfers CSV, not my graph. Columns, Read as, Role. amount: Currency, Role Weight. OK --
so a weight is a role I give a column when I load. And it asks nothing about what a bigger
amount means. Where does it ask that? Nowhere on this screen." Checks the import report
render. "Here: 'What a bigger confidence means is asked by the first run that reads it.' So
the question is deferred to the first run. Fine in principle -- but then I need to SEE that
question in a run to know what my reviewer saw, and none of the Les Mis states shows a
weighted run."

"In the other data set, the Louvain run record says 'confidence used as given, 0.40 to 0.99;
higher = stronger link (your answer...)'. That is the sentence I want on the Les Mis
betweenness. It exists for a partition. It doesn't exist here because this run is unweighted."

**Her conclusion.** "So what can I tell the reviewer? The ranking on screen is unweighted
betweenness on a 60-node degree>=2 subset, exact, normalized over the subset. That I can
defend, and I can reproduce it. If the reviewer thinks the co-appearance counts were used
as distances -- in this run they were not used at all. Which is its own problem for Les Mis:
an unweighted betweenness throws away the one interesting variable in that dataset. And I
cannot find out, from these screens, why the graph says 'no weight' when the file has one,
or what I would be asked if I turned value on. I'm half done."

## Single Ease Question

4 of 7. "The half I could answer, I answered faster than in Gephi, because the run says what it
ran on. The half about the weight I could not answer at all."

## Would she use it instead of Gephi?

"For statistics I'd hand to a reviewer -- maybe, if that run record really copies out like
that; it's better than anything Gephi gives me. But not until I see it keep the 'value'
column on Les Miserables and ask me, in plain words, whether more chapters means closer or
farther. If it silently drops the weight, it lost my data, and I'd stay on Gephi."

## Problems observed

1. Les Miserables shows "Edges: undirected, no weight" although the dataset carries a
   co-appearance count on every edge; nothing says whether the column was dropped, never
   loaded, or loaded without a role. (Severity 3.)
2. The Weight field reads "None declared" with no hint of which columns could be chosen or who
   declares it; the prototype does not open it. (Severity 3.)
3. No screen shows a weighted distance-based run, so the similarity-versus-distance reading --
   the thing the reviewer suspects -- cannot be checked anywhere. The Louvain record states
   "higher = stronger link"; betweenness has no equivalent in view. (Severity 3.)
4. The load step asks only for the Weight role; the meaning question is deferred to the first
   run, and the import report says so, but a later reader (a coauthor, a reviewer) has no place
   to see what answer was given for a run that used the weight. (Severity 2.)
5. The Les Miserables state is number 14 of 20 and the panel opens on a patent network; finding
   her data took a scan of the whole strip. (Severity 1.)
6. "zero: 32 nodes, all 29=" in the distribution summary is truncated or garbled. (Severity 1.)
