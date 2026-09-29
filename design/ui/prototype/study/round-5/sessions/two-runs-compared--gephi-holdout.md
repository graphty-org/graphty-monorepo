# Session: rank again with one thing changed, and say what differs -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science, Gephi since 0.8, NetworkX for anything reproducible. See ../../personas/gephi-holdout.md.

**Task, as the moderator gave it:** "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

**What the task tests:** whether a second run of the same measure, with one option changed, sits
beside the first instead of overwriting it; whether the two can be compared; and whether each
run's method and settings can be read and handed on.

**Screens, in order:** the navigation comparison (screens/navigation.html: the "Today: Results
panel" frame and the "New: at rest" frame); the results panel (screens/results-panel.html: the
Les Miserables filtered state, the running state with a changed option, the finished and Louvain
states for the run record); the result in the inspector (screens/inspector.html); the bottom dock
table (screens/table-dock.html, small graph and ranked states); the comparison surface
(screens/comparison.html, both sections and the run record); the run-and-read catalog
(screens/run-and-read.html). Viewed at 1440 x 900.

**Renders she saw:** shots/screens__navigation.png, shots/screens__navigation-frame-today-results.png,
a render of the "New: at rest" frame made for this session (not kept in shots/),
shots/screens__results-panel--filtered.png, shots/screens__results-panel--running-result.png,
shots/screens__results-panel--finished.png, shots/screens__results-panel--variant.png,
shots/screens__results-panel--outofdate.png, shots/screens__inspector-result.png,
shots/screens__table-dock.png, shots/screens__table-dock-ranked--study.png,
shots/screens__comparison--study.png, shots/screens__comparison-versions.png,
shots/screens__comparison-open-rec-m-pr.png, shots/run-and-read--rank.png,
shots/screens__run-and-read-task-quiet-weight-trap--study.png. No mock shows two runs of the same
measure compared; for that step she was told what the page says Compare with... offers, and she
guessed the rest from the two comparisons that are drawn.

---

## Think-aloud transcript

**Deciding what "one thing changed" is.** Yesterday I ran betweenness on the whole co-appearance
graph, unweighted. That is what everyone does with Les Mis first. The obvious one thing to change
is the weight: the edges carry `value`, the number of chapters two characters share. Unweighted
betweenness treats a one-scene walk-on the same as Valjean and Cosette living together for three
hundred pages. So: same measure, same graph, weight on. And I already know the trap. In NetworkX,
`weight=` on betweenness is a *length*. Hand it the co-appearance count raw and the strongest ties
become the longest paths, and the ranking is nonsense. Whatever this tool does, it has to tell me
which way it read `value`.

**The navigation page.** A before-and-after slide for the designers. But it is Les Mis, so I look.
77 nodes, 254 edges. That is the right graph. The "Today: Results panel" frame has a table with
betweenness: Valjean 0.57, Gavroche 0.165, Marius 0.132, Fantine 0.13, Thenardier 0.075, Javert
0.054. Those are NetworkX's normalized numbers, I have seen that list a hundred times. Good. That's
yesterday's ranking, then, and it matches.

On the left of that frame: "In this project -- Betweenness, done; Bridges, done." Fine. Then I open
the "New" frame -- the one they are going to build -- and the right panel's Results list has only
"Bridges, done". Where did my betweenness go? The table at the bottom of that frame has no
betweenness column either. Is that because yesterday's run was not kept, or because the mock just
did not draw it? I cannot tell. In Gephi the column would at least still be in the Data Lab.
If yesterday's run is gone overnight, the task is already half dead: "what differs from yesterday"
needs yesterday.

I'll assume it's kept. I go to the results panel.

**The results panel, Les Mis.** The only Les Mis state is a filtered one: "on: filtered graph, 60
nodes, 1 component". Not my run -- mine was the whole graph -- but it's the same panel, so I read
it for where the settings live.

"Exact. Undirected. WebGPU. Details." Then: "Weight: value, not used yet. Change..." Good. That is
the first thing I wanted to see: it knows there is a weight column, and it says out loud it did not
use it. Gephi never tells you whether the statistic read the weight. I would have hunted through the
Statistics dialog for a checkbox.

Top nodes: Valjean 0.419, Gavroche, Marius, Fantine, Javert. "Every step in the top 5 is over the
1% tie line." I like that. "zero: 32 nodes, all 29=" -- thirty-two characters with zero
betweenness, all tied at rank 29. Yes, that's how ties should be written. It's also how most people
misreport Les Mis: they "rank" 32 characters who are all zero.

Down the panel: Options, Scope "Filtered graph, 60 of 77", Weight "None for this run". Runs: "Run
1, 0.1 s, shown". Compare with...

**Changing the one thing.** I click "Change..." next to Weight. It is not wired in the mock, so
nothing happens. The Options header has an icon; the running-state mock (PageRank on patents) shows
what that opens: a popover, "PageRank options -- Options wait for Run", Scope, Direction, Weight,
Damping. The damping field has a blue dot and the line "Damping 0.5 has not run. Run queues it
after this run." And in the panel: "Runs 2 -- Run 2 running, 62% -- Run 1, damping 0.85, shown."

Stop. This is the single most important thing on these screens for me. Run 1 is *kept*, with the
setting that made it written next to it, and the new run is Run 2. In Gephi a rerun writes over
the column, and if a filter was on, it writes over *part* of the column and leaves the rest from
the old run. I have had a student hand me a table that was two runs stitched together with nothing
to say so. Here the runs are separate objects. Good.

What I don't get to see: what the Weight dropdown offers for betweenness. On the PageRank
popover it's a dropdown with "No numeric edge column". On Les Mis it would say `value` -- and then
what? "Used as similarity"? "As distance"? The Louvain state gives me a hint of the vocabulary:
"Weight: confidence, used as similarity. Change..." and its run record says "Weight conversion:
confidence used as given, 0.40 to 0.99, as similarity: higher = stronger link." For modularity
that's the end of it. For betweenness it isn't. If `value` is a similarity, the shortest-path code
has to turn it into a length somehow -- 1/value? max minus value? -log? Those give different
rankings. That row, "Weight conversion", is exactly where I'd look, and on the filtered Les Mis run
it says "None: value not used". So the row exists. I just never see it filled in for a
shortest-path measure. That's the number I'd have to cite.

The out-of-date mock also tells me they know about this: "Louvain used confidence as a distance.
It is now used as similarity. Re-run to update." So the tool does track which way a weight was
read, per result. I believe the mechanism is there. I haven't seen the transformation.

**Reading the result through the inspector.** The inspector version of the same result puts
"Compare with..." and "Show as style layer" right under the name, and a Run block: "Weight:
confidence, not used yet. Shortest paths counted hops; confidence was not used." "Counted hops" --
that's the phrase I would put in a methods section. I'd want the weighted one to say "shortest
paths summed 1/value" or whatever it does, in the same place.

Small thing: in the results panel Compare with... is at the bottom under Runs, in the inspector it
is the first button at the top. Same result, same command, two places. Which one is the product?

**Comparing the two runs.** The comparison page says: "The picker lists only what can be ranked
against a score: its own earlier run and the other scores." So Compare with... on Run 2 should
offer "Run 1". That's the move. There is no mock of it -- both drawn comparisons are two
different measures, or the same measure on two months of data. I read the March/April one as the
nearest thing.

What's on it is good, and I'll say so. A scatter of rank against rank, rank 1 at the top left.
"49 of the top 50 in both months." Top: 5, 10, 20, 50, 100, with the other lengths written out.
Spearman 0.76 "leaving out the 900 accounts tied at the bottom of both months (0.88 with them)."
That last part is honest and it matters for Les Mis: unweighted, a big block of characters sits at
zero; weighted, some of them may still be at zero. If you leave the tied block in, Spearman looks
wonderful for no reason. They give both numbers. I'd also want Kendall's tau, because that's what
reviewers in my field ask for with this many ties, but I can live with Spearman plus the overlap.

Then the Differences list: "Moved -- March only -- April only", each account with its old rank,
new rank, places moved. For me that's "who climbed when you weight by shared chapters". I'd expect
the minor characters who share many chapters with one family -- the Thenardier household, the
Friends of the ABC -- to move, and the one-scene characters to drop. That list is the paragraph
my colleague actually wants.

**"How each was made."** Each side has "Details". The run record from the two-measures
comparison: Method, Seed "Does not apply: the same result every run", Damping, Normalization
"Values sum to 1 over the accounts", Weight conversion "None: unweighted", Iterations, Scope. And a
**Copy** button. That is the second half of the task done in one click, if it works: copy record
for Run 1, copy record for Run 2, paste both into the email. Gephi's statistics report is an HTML
window with a chart and no parameters worth quoting; I rebuild this by hand every time.

And the table. The ranked-table mock names every column by its run: "Betweenness exact,
unweighted, full graph", with a "rank of 300" beside it, and the CSV header repeats it:
"betweenness (exact, unweighted, full graph)". So the CSV I'd send her says what each column is.
What I do not know: with two runs of the *same* measure, do I get two betweenness columns side by
side -- "unweighted" and "weighted by value" -- or does the table only carry the run that is
"shown"? If it's only the shown one, I'm back to Gephi's overwrite, just politer.

**What I'd send her, if the missing pieces behave as I guess.** "Unweighted betweenness (Brandes,
exact, normalized, hops counted) against betweenness weighted by co-appearance count (value turned
into a length by ___). Top 10 overlap: __ of 10. Spearman __ without the tied zeros, __ with them.
Biggest movers: __." Every blank except the conversion I can fill from what's drawn. The
conversion blank is the one I can't publish without.

**Where the sides are named.** One more worry. The two drawn comparisons name sides by measure
("PageRank / Betweenness") or by data ("PageRank on March data / on April data"). Two runs of
betweenness would both be "Betweenness". If the header just says "Run 1 / Run 2" I will be
checking Details every time I glance at the scatter to remember which axis is weighted. Name them
by the thing that differs: "unweighted" and "weighted by value".

---

**Single Ease Question (1 = very difficult, 7 = very easy):** 4.

"Four. The pieces are right, and some of them are better than anything I have: keeping Run 1 when
I rerun, the tie-honest Spearman, the run record with a Copy button. But I never saw the one thing
the task is about -- two betweenness runs side by side -- and I never saw how it turns a
co-appearance count into a path length. I also nearly lost yesterday's run in the new layout. I
got there by assuming, and assuming is not a method."

**Would she use this instead of her current tool?** "For this task, not yet -- today I'd do it in
NetworkX: two `betweenness_centrality` calls, one with `weight` set to an inverted `value`,
`spearmanr`, done in ten lines, and I know exactly what the weight did. If this showed me the
weight conversion in the run record and kept both runs as columns in the export, I'd use the
comparison screen for teaching -- students would see the ranking move instead of reading two
lists. For the paper figure I'd still go to Gephi."

---

## Moderator notes

- **Choice of change:** weight by co-appearance count (`value`), unprompted, and she named the
  distance-versus-similarity trap before opening anything.
- **Numbers checked:** the Les Miserables betweenness values on the navigation frame match
  NetworkX's normalized values; 77 nodes and 254 edges match. This earned the session its trust.
- **Yesterday's run:** the "Today" frame lists Betweenness as done; the "New: at rest" frame lists
  only Bridges and its table has no betweenness column. She read that as a possible loss of
  yesterday's result and said the task would fail if runs do not survive overnight.
- **Rerun keeps the first run:** Runs 2 with Run 1 kept and labelled by its setting was the
  strongest moment. She tied it directly to Gephi overwriting a statistic's column.
- **Weight conversion never seen for a shortest-path measure:** the only filled "Weight conversion"
  row is Louvain's (similarity, used as given). For weighted betweenness she needs the transform
  from count to length; without it she would not publish the number.
- **No run-against-run comparison is drawn:** she worked from the text "its own earlier run" and
  the March/April comparison. Her open questions: what the two sides are called, and whether the
  table and CSV carry both runs as separate columns.
- **Compare with... placement:** at the bottom under Runs in the results panel, at the top of the
  inspector's result view. She noticed and asked which is real.
- **Asked for but not offered:** Kendall's tau beside Spearman, given the size of the tied block.
- **Unwired control she tried:** "Change..." next to Weight.
