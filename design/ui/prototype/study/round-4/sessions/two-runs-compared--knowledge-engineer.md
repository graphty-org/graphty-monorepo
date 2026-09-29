# Two runs of one ranking, compared -- Dr. Min-ji Kim, knowledge graph engineer

Participant: Min-ji Kim, knowledge engineer and ontologist (persona file
study/personas/knowledge-engineer.md). Expert with graphs, SPARQL and pandas; skeptical of any
number without a method behind it; deuteranomalous.

Task as the moderator read it: "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

Screens used: screens/navigation (the "New" frames), screens/results-panel, screens/run-and-read,
screens/comparison, screens/table-dock, screens/inspector. All renders were seen as a participant
sees them (study view). Renders: shots/r4-minji-trc-*.png.

## Think-aloud

### 1. Finding yesterday's ranking

(Looking at the navigation frame "New: at rest", Les Miserables.)

"OK. Les Miserables, Co-appearances, 77 nodes. Left side has Graphs, Sets and paths, Views. No
'Results' on the left, fine. Right panel: Overview -- 77 nodes, 254 edges, density 0.0868, one
component. Those I can check: the Knuth co-appearance graph is 77 and 254. Good, the counts match
what I know. That is the first thing I look for and it passes."

"Where is yesterday's ranking? Right panel, bottom: Results -- 'Bridges, done'. That is it? Bridges is
not a ranking. So either yesterday's run is not in this project or this panel only lists some of
them. I would expect to see 'Betweenness' there."

(Moves to the table dock frame.)

"Here it is, in the table. A column group headed 'Betweenness exact, unweighted, full graph', value
and rank of 77. Valjean 0.570, #1. Gavroche 0.165 #3, Marius 0.132 #4. And a sentence above the
table: 'Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by
betweenness.' I like that the header says exact, unweighted, full graph. That is three of the four
things I would have to write in a notebook cell anyway."

"But the right panel said 'Bridges'. So the table knows about a betweenness run the Results list
does not show me. Maybe that frame is just a different moment. I will not count it, but I noticed."

(Then the results-panel frame "Results after a filter", also Les Miserables.)

"Wait. Here is another Les Mis betweenness: 'on: filtered graph, 60 nodes, 1 component', Valjean
0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. Different numbers from the table's
0.570. Which one was 'yesterday'? The scopes are different -- one says full graph, one says filtered
graph, 60 of 77 -- so I can tell them apart, and the values are not a contradiction. But if both
exist in one project, 'which betweenness' is already a question before I change anything. For the
task I will take the full-graph one as yesterday's, because that is what the table calls it."

"'Details' opens a Run record. Method: Brandes betweenness, exact, every node is a source. Seed: none,
nothing is sampled. Normalization: divided by (n-1)(n-2)/2 = 1,711 node pairs, n = 60. Weight
conversion: none, value not used. Scope: filtered graph, 60 of 77, after 'Filter to degree >= 2'.
Engine: WebGPU. And a Copy button."

"That is the most honest thing I have seen in a graph viewer. It names Brandes, it gives the
normalization with n, it names the filter step. This is what I would paste into the ticket for 'how
it was made'. Half of the colleague's question is answered by this box."

### 2. Deciding the one thing to change

"The obvious one thing: the weight. The Les Mis edges carry 'value', the number of chapters two
characters share. Yesterday's run says 'Weight: value, not used yet. Change...'. So the tool already
knows there is a numeric edge column and that I did not use it. Good -- it does not silently use it
either."

"My question before I click: used how? For betweenness a weight is a length. A higher co-appearance
count means closer, so it has to be inverted, or the heavy pairs become the long ones and the
ranking is nonsense. On the protein graph I see 'confidence, used as similarity' and on the
Louvain record 'as similarity: higher = stronger link'. So there is a notion of similarity versus
distance. I cannot see where I set that for 'value' on Les Mis, and I cannot see what betweenness
does with a similarity. I would expect the run record to say 'value used as similarity, converted
to distance by 1/value' or whatever it actually does. Nothing I can see promises that."

### 3. Running it again with the weight

"Change... on the weight line. The options popover opens: 'Options wait for Run'. Scope, Weight
dropdown. I pick 'value'. On the PageRank example, changing damping shows 'Damping 0.5 has not run.
Run queues it after this run' with Run and Reset. So I expect the same: 'Weight value has not run.
Run.' Clear enough."

"The typo state is nice -- 'unknown attribute confidnce; Closest: confidence'. It does not guess for
me. Good."

"I press Run. The Runs section becomes 'Runs 2: Run 2 running, Run 1 ... shown'. So yesterday's run
is not overwritten; it is Run 1 and it stays shown until Run 2 lands. That is what I wanted to know
most. If it had replaced yesterday's numbers I would have had to export them first, and I would not
have trusted it again."

"What I do not know: when Run 2 lands, is Run 1 still something I can open? The list says 'Run 1 ...
shown' -- is 'shown' a toggle? Can I click Run 1 and read its top nodes again? The mock never shows
Run 2 finished with Run 1 beside it. I am guessing it works."

### 4. Comparing the two runs

"Under Runs there is 'Compare with...'. That is the button. The comparison screen is on a payments
graph, not Les Mis, so I read it as the pattern."

"The picker, 'Compare PageRank with': PageRank on March data, Betweenness (not run), Degree. So it
offers another data version and other measures. It does not list 'PageRank Run 1' or 'the earlier
damping'. For my task that is the one entry I need -- betweenness unweighted against betweenness
weighted, same graph -- and it is not in the list. If I saw this picker for real I would assume
comparing two runs of the same measure is not supported, and I would export both columns to CSV and
do it in pandas."

"Say it does work. The comparison surface: a scatter of rank against rank, rank 1 at the top left,
diagonal is agreement. 'N of the top 50 in both', a Top selector 5/10/20/50/100, Spearman with and
without the tied block at the bottom, and an (i) that explains the ties. That is good statistics. It
tells me it left out the tied block and gives the number with them in brackets. I would have written
that caveat myself."

"But the sides are named by their measures: 'Ranked higher by [Betweenness | PageRank]', 'PageRank
and betweenness'. With my two runs both sides are 'Betweenness'. What would the toggle say --
'Betweenness | Betweenness'? The March-and-April example names them by the data, 'PageRank on March
data' / 'on April data', so maybe it would say 'Betweenness, unweighted' and 'Betweenness, weight
value'. It has to name the one thing that differs, or the whole screen is ambiguous. I cannot tell
from what is drawn."

"The right column does have each side's line -- 'Exact. Unweighted, directed. Details' -- and
Details opens each run record. So 'how each was made' is two clicks, per side. That is right."

### 5. The table route, as a fallback

"Back in the table. Each run adds a score column and a rank column under a header naming method,
weight and scope: 'Betweenness exact, unweighted, full graph'. So after my weighted run I would
get a second group, presumably 'Betweenness exact, weight value, full graph', beside it. Then the
line above the table does the first-order comparison in words, and 'Compare rankings...' opens the
scatter. This route I believe more than the picker, because the table shows it."

"Export table as CSV: 'Each run's columns carry its method and scope in the header, as in the
table.' And the file's own ids beside labels. Good -- that is what I would send the colleague if she
wants to check my numbers, and the header travels with the data."

### 6. Answering the colleague

"What I would send her: the two run records, copied; the comparison's agreement line -- top-k
overlap and Spearman with and without ties; the 'ranked higher by' list for each side; and the CSV
with both column groups. Save comparison keeps it; Add note on a row lets me say why Javert moves, or
whatever moves. That is a complete answer and nothing in it is invented by the tool."

"What I could not answer from the screens: whether the weight was inverted for shortest paths. That
is the one fact that decides whether the second ranking means anything, and it is the fact I am
least able to see."

## Where she got stuck or guessed

1. **The picker does not offer the earlier run.** "Compare PageRank with" lists another data
   version and other measures, never the same measure's Run 1. For this task that was the only
   entry needed. She would have given up on the comparison screen and exported to pandas.
2. **Two runs of one measure have no names.** The comparison names sides by measure ("Ranked higher
   by Betweenness | PageRank"). With two betweenness runs both sides read "Betweenness"; nothing
   drawn shows the side named by the one option that differs.
3. **Weight as length or as strength is invisible at the moment it matters.** "Weight: value, not
   used yet. Change..." lets her pick the column, but not see or set whether a higher value means
   closer (to be inverted for shortest-path measures) or farther. The run record's "Weight
   conversion" row would be the place to say it; no drawn record shows a weighted betweenness.
4. **Whether Run 1 stays readable after Run 2 lands is unshown.** "Run 1 ... shown" suggests a
   choice between runs but no frame shows switching to it.
5. **Yesterday's run was hard to find in the Les Miserables frame.** The right panel's Results
   listed only "Bridges" while the table held a betweenness column. Two Les Mis betweenness
   readings exist across the mocks (full graph, 0.570; filtered 60 of 77, 0.419); the scopes tell
   them apart, but she had to decide which was "yesterday".
6. **The run screen looks older than the navigation screen.** In the run-and-read frames the right
   panel still has Results, Statistics and an Export row, arranged differently from the navigation
   "New" frames. She read it as two versions of the product.

## What worked

- The run record: method (Brandes, exact), seed, normalization with n, weight conversion, scope with
  the filter step named, engine, and Copy. "Half the colleague's question is this box."
- "Weight: value, not used yet" -- the tool knows the column exists and does not use it silently.
- Changing an option queues Run 2 and keeps Run 1 as the shown result until Run 2 lands; yesterday
  is not overwritten.
- The comparison's statistics: top-k overlap at a chosen k, Spearman with and without the shared
  tie block, and an explanation of why.
- Column headers that carry method, weight and scope, into the CSV export too.
- The counts on Les Miserables (77 nodes, 254 edges, 1 component) matched what she knows.

## Single Ease Question

**4 of 7.** "Running it again was easy, and the records are better than my notebook. Comparing two
runs of the same measure is the whole task, and the one button for it did not offer my earlier
run, and would not have told me which side was which."

## Would she use this instead of her current tool?

"No, not instead. For this job my current tool is a notebook: networkx, run it twice, a Spearman,
a merge on the ids. It takes ten minutes and I know exactly what the weight did. What graphty has
that my notebook does not is the run record written for a reader, and a table whose headers say how
each column was made -- I would happily hand that to a colleague who does not read Python. If the
comparison offered 'the same measure, an earlier run' and named each side by what changed, and the
record said how the weight was turned into a length, I would use it for this and send her the saved
comparison. And for my own graph it still does not load Turtle, so it stays a tool for toy data and
flat exports."
