# Do two rankings agree? -- Expert Emma, round 6

**Participant:** Expert Emma, network scientist and consultant (notebook user: networkx, igraph; Gephi for figures).
**Task as given by the moderator:** "Do these two ways of scoring agree on who matters?"
**Pages used:** the comparison screen (PageRank against betweenness on the April payments data, with its popovers: About Spearman, the run records, Export; the Results place with Compare with...), then the table dock.
**Renders seen:** `shots/tasks/rankings-agree/01-comparison.png`, `shots/emma-r6-rankings-comparison-full.png` (study view, whole page), `shots/tasks/rankings-agree/02-table-dock-large.png`.
**Last run:** round 3, ease 6 of 7 for this participant.

## Think-aloud

**1. First look.** "Payments network review. Right column says Comparison, PageRank and betweenness. Rail on the left: Graph, Data, Results, Notes, and under it 'Assistant: Off. Nothing is sent.' And under the project name, 'Nothing has been sent from this project', underlined, so presumably a link to a log. Good. That is the first question answered before I asked it."

"The hairball in the middle, coloured by PageRank on a log scale. Ignoring it. The bottom half is the part I care about: Scatter tab, rank on PageRank across, rank on betweenness down."

**2. The headline and the number.** "Agreement: '0 of the top 50 in both. The rankings disagree at the top.' Top is set to 50 now; last time it was 10. Fine. 'At the other lengths: 0 of 5, 0 of 10, 0 of 20, 18 of 100.'"

"And now: 'Spearman 0.40, leaving out the 1,153 accounts tied at the bottom of both (0.78 with them).' Oh, good. That is exactly the second line I asked for. And they led with the tie-excluded one, which is the right order -- 0.78 was mostly leaf accounts agreeing that they are leaves. 0.40 is the honest figure for anyone who has any flow at all. I would have written that sentence myself."

**3. The i next to Spearman.** "Let me see if it says anything this time." *(Opens About Spearman.)* "'Ties take the average of their ranks.' Average rank, fine, that is what scipy does. 'The accounts tied at the bottom of both measures agree only because both give them the least, which pulls the number toward 1. The first number leaves them out; the one in brackets counts everyone.' Good. A junior could read that and not be misled. It does not say what happens to the other 161 accounts that are at zero betweenness but not at the PageRank floor -- they are still in, still tied, averaged. I can infer it. Still no Kendall's tau-b, which is what I would actually report with this many ties. I will do that in pandas."

**4. Something I did not expect.** "Wait. Look at the Differences list with 'PageRank' selected: ACC-393859 #1 on PageRank, #1,780= on betweenness. The top eight on PageRank are all #1,780=. That is the zero-betweenness tie block. So the accounts PageRank says matter most sit on no shortest path at all -- they are sinks. And in the export preview they are merchants with degree 842, 513, 318. Money ends there, it does not pass through. And the brokers on the other side, ACC-139419 #76 / #1. That is the whole story for the client: two different kinds of 'important'. The scatter shows it too -- the band along the bottom starts at PageRank rank 1."

"One thing, though. The list says '#1,780='. That is the lowest-place, min-rank convention: 3,093 minus 1,314 plus 1. But the Spearman popover just told me ties get the average rank, which would be about 2,436. Two tie conventions on one screen. For the coefficient it is the right one, for display min-rank is what sports tables do, fine. But it is not said next to the list, and the CSV writes 1780 in rank_betweenness. Somebody will run a plain Pearson on those two rank columns and call it Spearman and get a different number. The methods file does say 'tied accounts share the highest place they fill', so it is documented, just not where the coefficient is."

**5. How each side was computed.** "Under PageRank: 'Unweighted, directed. Details.' Last time Details went nowhere. Click." *(Opens the PageRank run record.)* "Method: PageRank, directed. Seed: does not apply, same result every run. Damping 0.85. Normalization: values sum to 1. Weight conversion: none, unweighted. Iterations: 100, fixed. No transfers out: its share is spread evenly over every account. Scope: full graph, April, 3,093 accounts."

"That is a proper methods line. Dangling nodes handled the networkx way. 'Iterations 100, fixed' -- fixed means it stops at 100 whether or not it has converged? I would rather see the tolerance and the final residual. networkx stops on tol=1e-6. For ranking at rank 76 it will not matter; for the fourth decimal on a slide it might."

*(Opens the Betweenness run record.)* "Brandes, exact, directed. Normalization: divided by (n-1)(n-2), ordered pairs, n = 3,093. That is networkx's directed convention. Thank you. That was the thing I could not tell last time and it is now one click from the comparison, which is where it has to be. And there is a Copy button on the record. Copy as what, text? If it pasted as a dict I could put straight into a notebook cell, that would be lovely. I cannot tell from here."

**6. Unweighted, again.** "Both runs: weight conversion none, unweighted. On a payments network. And the table dock proves the file has amounts -- the New column menu offers 'Money in: sum of amount on transfers in, USD'. So the amounts are there and both measures ignored them. That may be the right choice for 'who is connected to whom', but nothing here says it was a choice, or offers me 'the same comparison, weighted by amount'. The record is honest that it is unweighted, which is better than last time. It does not tell me why."

**7. Where would I start this myself?** "Now the part that moved. On the Results place in the rail: a list of Runs -- Degree, Louvain communities, PageRank. I select PageRank and right under it, before 'Show as style layer', there is 'Compare with...'. Yes. That is where it belongs: on the run, as an analysis, not under Appearance. Last time I went to the three-dot menu first; here I would not have to look. The picker: 'Compare PageRank with', a search box, 'PageRank, damping 0.5, Run 1', 'PageRank on March data', 'Betweenness, Not run', 'Degree'. So a comparison can be another measure, another parameter, or another snapshot, all from the same list. Picking Betweenness when it has not run presumably runs it; the earlier round showed B running with a Cancel, so I assume the same."

"It is also in the table's column menu -- Sort, Filter to..., Compare with... -- and there is a damping 0.85 against 0.5 comparison further down the page: 'Spearman 0.998'. Good, that is a sensitivity check in one click. That is actually more useful to me than the betweenness one."

"And when I save it, the Runs list gets a 'PageRank and betweenness' entry with 'Run on April data' under it. So the comparison is a thing with a name and a data version. Fine."

**8. Getting the numbers out.** "Export table. The preview shows the file name, the first lines: id, kind, country, degree, pagerank, betweenness, rank_pagerank, rank_betweenness. And 'Beside it: a methods .txt' with damping, normalization, the tie convention, and the graphty-element version. That is the file I would ask a student for. I would load it and compute tau-b and the tie-excluded Spearman myself, and check them against 0.40."

**9. Answering the moderator.** "No, they do not agree on who matters. None of the top 50 are shared, 18 of the top 100. The 0.78 overall is mostly 1,153 leaf accounts tied at the bottom of both; without them it is 0.40. The top PageRank accounts are high-degree merchants where money ends, with zero betweenness; the top betweenness accounts are brokers around PageRank rank 70 to 300. Both unweighted, PageRank damping 0.85, betweenness exact and normalized by (n-1)(n-2). About a minute and a half, faster than last time, and I did not have to guess the parameters."

## Single Ease Question

**6 of 7.** "Easier than last time: the parameters and the tie handling are now one click from the number, and the tie-excluded Spearman is already there. Not a 7 because the weights were silently off on a network that has amounts, the ranks in the list use a different tie convention from the coefficient without saying so beside it, and there is no Kendall's tau."

## Would she use it instead of her current tool?

"For computing, no -- I still recompute in the notebook, that is my job. But for this screen, yes, I would stop making the rank-rank plot in matplotlib. It handles ties better than I bother to, it states its methods, and the export comes with a methods file and a version. The damping-sensitivity comparison is something I would actually use before a client meeting. If Compare with... were a call I could make from a notebook widget and get this same view, it would be in my workflow next week."

## Problems observed

1. **Weights ignored with no reason and no weighted alternative (severity 2).** Both run records say "Weight conversion: None: unweighted", and the same data has transfer amounts (the table offers "Money in: sum of amount"). Nothing says it was a choice or offers the weighted comparison. Quote: "The record is honest that it is unweighted ... It does not tell me why."
2. **Two tie conventions on one screen, the display one not stated beside it (severity 2).** Spearman uses average ranks (About Spearman), but the Differences list and the CSV show min rank ("#1,780=", 1780); the methods file says so, the screen does not. Quote: "Somebody will run a plain Pearson on those two rank columns and call it Spearman and get a different number."
3. **No Kendall's tau-b or other tie-robust coefficient (severity 1).** With 1,314 accounts tied at zero betweenness she would report tau-b. Quote: "Still no Kendall's tau-b, which is what I would actually report with this many ties."
4. **PageRank "Iterations: 100, fixed" without tolerance or convergence (severity 1).** Quote: "fixed means it stops at 100 whether or not it has converged? I would rather see the tolerance and the final residual."
5. **Run record's Copy format unknown (severity 1).** Quote: "Copy as what, text? If it pasted as a dict I could put straight into a notebook cell, that would be lovely."
6. **Overlap at other lengths still a sentence, not a curve (severity 1, carried from round 3).** She read it without trouble this time and did not raise it again unprompted.
7. **No scripted route (severity 2, standing concern).** Quote: "If Compare with... were a call I could make from a notebook widget and get this same view, it would be in my workflow next week."

## What worked

- "Compare with..." on the selected run in the Results place, beside "Show as style layer": she found it without looking, and called it the right home (in round 3 she hunted in the overflow menu because it was filed under Appearance).
- The picker lists another measure, another parameter setting and another snapshot together; the damping 0.85 against 0.5 comparison (Spearman 0.998) she called more useful than the task itself.
- Tie-excluded Spearman first, with everyone in brackets, and an About Spearman that states average ranks and why the tie block inflates the number.
- Run records one click from each side: damping, normalization (betweenness by (n-1)(n-2)), dangling-node rule, seed, scope -- the round-3 severity-3 problem is gone.
- The Differences list exposed the real finding (top PageRank accounts are zero-betweenness merchant sinks) without her looking for it.
- Export preview with the exact file name, first lines and a methods file carrying the graphty-element version.
- "Nothing has been sent from this project" and "Assistant: Off" visible without asking.
