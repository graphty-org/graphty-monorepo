# Session: can these rankings be trusted? -- Chris, ML engineer (recommendations)

Participant: Chris, senior ML engineer on a retail recommendations team (persona file:
study/personas/ml-engineer-recsys.md). Laptop screen, 1440 x 900.

Task as given by the moderator: "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted." The planted problem, known to the moderator only: on Les
Miserables, a similarity (how often two characters appear together) is being read as a distance,
so strong ties look long and the path-based rankings come out inverted.

Screens used: the Results panel mock (all its states) and the load step mock (all its states).

## Transcript (think-aloud)

**1. First screen of the Results panel (PageRank running on patent citations).**
"OK, this is patent citations, 124k nodes, PageRank running on WebGPU. That's not Les Mis. Is
the reviewer's ranking somewhere in here? There's a strip of 19 numbered tabs across the top. I'm
not reading 19 tab titles. ... Fine, I'll skim them. 'Results after a filter' -- that one mentions
76 of 77. Les Mis is 77 characters. Clicking that."

Note: nothing on the first screen points at the reviewer's dataset; he found Les Miserables by
counting nodes in a tab label.

**2. Les Miserables, Betweenness, filtered to the largest component (76 of 77).**
"Right. Betweenness, top five: Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius 0.131, Fantine
0.127. Valjean on top by a mile, that's what networkx gives you unweighted, roughly. First thing I
check is the denominator. 'On: filtered graph, 76 nodes, 1 component.' Good -- it tells me it
dropped one node, and the chip in the header says 'Filtered: 76 of 77 nodes, 1 step'. I like that
it's on the result and not just on the canvas."

"Next line: 'Exact. Unweighted, undirected. WebGPU.' So... unweighted. Hmm. The reviewer's
complaint is about weights being flipped, and this says there's no weight at all."

**3. Opens Details (the run record).**
"Method: Brandes, exact, every node is a source. Normalization: divided by (n-1)(n-2)/2 = 2,775
pairs, n = 76. Weight conversion: None: unweighted. Engine: WebGPU. That's actually a proper run
card -- that's what I'd put in an MLflow run. Copy button, good, I'd paste that into the review
thread."

"So for THIS run the answer is: the numbers are clean unweighted betweenness, and nothing got
inverted because nothing got weighted. But is that the run the reviewer is looking at? I can't
tell. There's only one Betweenness row under 'In this project'. No history, no 'run 2 used
value as distance'."

**4. Looks for the co-appearance counts.**
"Les Mis has a value on every edge -- the number of chapters two characters share. Where is it?
Statistics on the right says 'Edges: undirected, no weight' and '4 more'. So it either didn't
load the counts or loaded them with no role. The Weight dropdown on the run says 'None
declared'. What's in that dropdown? I'd click it expecting a list of numeric edge columns and a
choice of how to turn a similarity into a length -- 1 - w, 1/w, -log w. The mock doesn't open it.
I'm guessing."

"Ten seconds on that. The honest answer I can give the reviewer is 'this ranking ignores the
co-appearance counts'. Whether it SHOULD use them, the tool never asked me."

**5. Tries the out-of-date state on the protein network (tab 15).**
"This one's interesting. 'confidence is now read as a similarity; these read it as a distance.'
Louvain and a shortest path got flagged out of date, Re-run on each, and 'Betweenness and
Closeness read no weight, so they stay current.' That's the exact trap the reviewer is worried
about, and here the tool catches it -- but only AFTER someone changed the declaration. Who
declared it as a distance in the first place, and where did they get asked? I don't see that
screen."

"The Louvain tab says 'confidence as similarity: used as given, 0.40 to 0.99; bigger is a closer
tie'. That's the sentence I want on every weighted run, in the one-line summary, not behind
Details. It's there on Louvain's state line, which is good. If the Les Mis run had said 'value as
distance' right next to 'Exact', I'd have spotted the bug in two seconds."

**6. Goes to the load step to see where weight meaning is set.**
"Transfers CSV: amount, Currency, role Weight. Nothing about what a bigger amount means. The
page heading literally says 'what a bigger amount means is not asked here'. Protein TSV,
Repeated pairs: 'Weight is a role only. How a similarity becomes a path length is chosen with the
meaning, in the first run that reads the weight, behind a disclosure there.' Behind a disclosure.
So the one question that decides whether my shortest paths are backwards is folded away. That's
the question that should be in my face the first time a distance algorithm touches a weight."

"GraphML: 'Every role starts at None: nothing is guessed from a name.' Good, I'd rather it not
guess. But then Les Mis loads with value as None, and every run is unweighted unless I go dig.
That's a defensible default, and it's also how a reviewer ends up comparing an unweighted ranking
against a weighted one in their head."

**7. Small things he trips on.**
- "'zero: 46 nodes, all 31=' -- what's 31=? Tied at rank 31? Say 'tied at #31'."
- "'middle 0.000' while the highest is 0.547 -- fine, it's a median and most characters are
  leaves, but 0.000 to three places looks like a bug."
- "The Exact tooltip says 'It does not say the ranking is meaningful.' Ha. Yes. More of that."
- "Nineteen tabs across the top with long titles. On a laptop that's two and a half lines of
  chrome before the app starts."

**8. Verdict to the moderator.**
"The ranking on screen is trustworthy as what it says it is: exact, unweighted Brandes on 76 of 77
characters, normalized over 2,775 pairs. It did not use the co-appearance counts, so it can't
have inverted them. If the reviewer saw a ranking where a strong tie counted as a long hop,
that's a different run, and I can't find it here -- there's no run history on the row and no Les
Mis run that used a weight. The tool CAN tell you a run read a weight as a distance (the protein
one does), but the place you choose that is folded away in a run form I never saw."

## Single Ease Question

4 out of 7. Reading one run's provenance was easy; answering the reviewer's actual question
wasn't possible from these screens.

## Would he use this instead of his current tool?

"For debugging one ranking, maybe. The run record is better than what I get from a notebook
unless I'm disciplined -- method, normalization with n, scope after the filter, engine, all in one
Copy. The out-of-date flagging when a weight's meaning changes is something networkx will never
do for me; it just silently takes 'weight' as a distance. But my whole world is similarities --
co-purchase counts, cosine -- and this tool makes the similarity-versus-distance choice in a
folded section of a form, and doesn't show it on the Les Mis run at all. Put 'value as similarity,
1/w' on the state line of every weighted run and show me the runs that differ by that, and I'd
open it. Right now it's still a notebook with 'G.edges[u,v]['distance'] = 1/w' for me."

## Problems observed

1. Nothing on the Results panel shows the reviewer's run, or any run history; there is one
   Betweenness row and it is unweighted, so the planted inverted-weight run cannot be found or
   compared. Severity 3.
2. The question that decides direction of a weight (bigger = closer or farther, and the 1 - w /
   1/w / -log w conversion) is not visible in either screen; the load step defers it and the
   Results panel's Weight select is never shown open. It is described as "behind a disclosure".
   Severity 3.
3. Les Miserables loads its co-appearance counts with no role, and Statistics says only "no
   weight" plus "4 more", so the reader cannot tell a weight column exists and was ignored.
   Severity 2.
4. The first screen of the Results panel is an unrelated dataset, and finding Les Miserables
   meant scanning 19 tab titles. Severity 2.
5. "all 31=" and "middle 0.000" in the distribution read as cryptic or buggy. Severity 1.
