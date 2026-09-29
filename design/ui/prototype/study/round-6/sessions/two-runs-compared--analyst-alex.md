# Two rankings compared -- Analyst Alex

Participant: Analyst Alex (intermediate graph analyst; NetworkX for the numbers, Gephi for the
picture, Excel for everyone else).

Task, as the moderator gave it: "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

Screens looked at: navigation, results-panel, comparison, table-dock (study view, rendered).

Note on the material: only the navigation screen shows Les Miserables. The results panel shows a
protein network and a patent-citations graph, and the comparison screen shows a payments network.
Where the Les Miserables frames stop, Alex reads the other datasets as "the same screen with
someone else's data" and says so.

---

## Think-aloud

**1. Finding yesterday's ranking (navigation).**

"OK, Les Miserables, 77 nodes, 254 edges, one component. Good, that's the number I know. Where did
my ranking go... there's a 'Results' icon on the left rail. Click. 'Every run of a measure, with its
settings and date. Newest first.' Betweenness, today 14:02 -- well, the moderator said yesterday,
whatever -- 'Exact, normalized; no weight. Full graph, 77 nodes.' And Bridges from the 27th. Fine.
That's actually the thing Gephi never gives me: a list of what I ran."

"Click Betweenness. It opens in the same side panel. 'Ran on the full graph, 77 nodes. No weight:
every edge counts the same.' Then a little settings block: method exact every node, normalized yes,
edges undirected, weight none, ran 29 Sep 2026 14:02. Top nodes Valjean 0.57, Myriel 0.177,
Gavroche 0.165. Those look like what NetworkX gives me for Les Mis with normalized=True, so -- OK,
I'm listening."

"And the table underneath flipped to 'Sorted by betweenness'. Nice, I didn't ask for that but it's
what I'd have done."

**2. Deciding what 'one thing changed' is.**

"The obvious one is the weight. The Data panel says 'Edges: value, 254. Weight: value, not used
yet.' So the file has co-appearance counts and I ranked without them. My colleague would ask
exactly that: what if two characters who share twenty scenes count for more than two who share
one. So: same betweenness, weighted by value."

**3. Changing it and running again.**

"There's 'Re-run' and 'Compare with...' under the settings. Re-run with what, though? On the Les
Mis frame the button just says Re-run. On the protein one it says 'Re-run (keeps Run 1)' and it's
greyed. Hover would tell me: 'The options match Run 1. Change one to re-run.' OK, so I change
something first, then Re-run. And 'keeps Run 1' -- good, it's not going to overwrite yesterday's.
That was my first worry."

"Where do I change the weight? On the protein frame there's 'Weight: confidence, not used yet.
Change...' right under the Exact line, and an Options block with a little sliders icon. The
patent frame shows the form that opens: Scope, Direction, Weight dropdown, then 'Damping 0.7 has
not run. Run queues it after this run, and keeps Run 1.' with a Run button and 'under a minute'.
So for me it'd be Weight: value, Run. That's, what, Change, pick value, Run -- three clicks. Fine.
I'd do this maybe once a month, that's fine."

"But -- and this is the bit I'd actually get wrong -- I don't see anywhere on these screens
whether 'value' is treated as a strength or a distance. For betweenness in NetworkX the weight is
a distance, so more scenes together means a LONGER path, which is backwards for co-appearance. I
only know that because I got burned once. I'm guessing the form would say it -- there's a 'Weight
conversion' row in the run record later -- but on the form I was shown there's just a dropdown
that says the column name. If it doesn't say, I pick 'value', get a ranking, and hand my colleague
something that's quietly upside down."

**4. Seeing the second run next to the first.**

"After it runs, the result page has 'Runs of this measure 2': Run 2 damping 0.5, Run 1 damping
0.85, one marked 'shown'. So for me it'd read Run 2 weight value, Run 1 no weight. Good, both
kept, both dated. Then 'Compare with...' right under it."

"Compare with opens a menu: 'Earlier runs of PageRank' at the top, highlighted, then 'Other runs
on this graph', then 'The same run on another data version...'. That's the right order. The one I
want is first. One click."

**5. Reading the comparison.**

"The two-runs panel on the comparison page: 'PageRank at damping 0.85 and 0.5.' Each side
labelled with what it is: 'Damping 0.85 -- PageRank run 2. Unweighted, directed. Details.'
'Damping 0.5 -- PageRank run 1.' Wait. On the results panel Run 1 was 0.85 and Run 2 was 0.5.
Here it's the other way round. Different dataset, sure, but if that happens on mine I'm going to
tell my colleague the wrong run was the weighted one. That's the kind of thing that ends up in a
report wrong. The damping number is the thing I'd trust, not the run number."

"Agreement: 'The rankings agree at the top. Spearman 0.998, leaving out the 1,153 accounts tied at
the bottom of both (1.000 with them).' I like that it says it in words first. The Spearman bit I'd
paste into the email but I wouldn't lead with it. There's an info pop-up, 'About Spearman', that
says 1 is the same order, 0 unrelated, and that ties at the bottom make it look better than it is.
That's honestly a better explanation than my director would get from me."

"Differences: 'Ranked higher at' with a toggle, Damping 0.85 / Damping 0.5. 'Top 100 on either, by
rank at damping 0.85.' Then a list: ACC-233575 #89 at 0.85, #124 at 0.5. That's the list she
actually asked for -- who moved. For Les Mis it would be, I'd bet, Valjean stays #1 and some of the
minor characters jump around. Which is the story."

"On the big comparison (PageRank against betweenness, different measures) there's a scatter, 'Top
5 / 10 / 20 / 50 / 100' buttons and '0 of the top 50 in both'. I'd want that same top-N overlap
for two runs, because 'the top 10 are the same 10' is the sentence I'd say out loud. On the
two-runs strip I only see Spearman and the moved list, not the overlap number. Maybe it's there
and the strip is cut short. I can't tell."

"The colours: the PageRank legend is purple to yellow. Good. No red-green. I can read it."

**6. "How each was made."**

"The 'Details' link next to each side opens a 'Run record' with Copy: method, seed ('Does not apply:
the same result every run' -- nice, answers my Louvain paranoia before I ask), damping,
normalization, weight conversion 'None: unweighted', iterations, scope 'Full graph, April data,
3,093 accounts'. That's the 'how each was made' half of her question. Copy, paste into the email,
done. Twice, one per run. I'd rather have one Copy that does both runs side by side, but two is
fine."

"And the table: if I open the table after both runs, the column headers carry the method --
'Betweenness exact, unweighted, full graph', 'PageRank damping 0.85, unweighted, full graph'. So
if both runs sit in the table as two columns, each header tells you which is which. The export
dialog says 'Each run's columns carry its method and scope in the header, as in the table' and
writes a methods .txt beside the CSV. That's the Excel half. I'd open that in Excel and my
colleague could sort it herself."

"What I didn't see: the table with two runs of the SAME measure side by side. Would the headers be
'betweenness (exact, unweighted)' and 'betweenness (exact, weighted by value)'? I'd assume so from
the pattern, but I'm assuming."

**7. Saving it.**

"'Save comparison' top right, then 'Comparison saved, Undo' and it appears in the Runs list as
'PageRank and betweenness' under the two runs. So next week I can find it. If I hit Done without
saving, 'Comparison closed without saving, Reopen'. OK, that's forgiving. Gephi would just have
lost it."

---

## What I'd tell the colleague (as Alex would write it)

"Ran betweenness twice on the full Les Mis graph, 77 characters. Run 1 (yesterday): exact,
normalized, no edge weight -- every co-appearance counts the same. Run 2 (today): same, but
weighted by the scene-count column. Top of the list agrees (Spearman figure attached), the ones
that moved are listed below. Method details for both runs attached." -- and then a line he adds
himself: "Checking whether the weight was read as distance or strength before you use it."

---

## Single Ease Question

**5 out of 7.**

"Finding yesterday's run and comparing it with a new one was easy, easier than anything I do now --
in Gephi I'd be exporting two CSVs and doing a VLOOKUP. It loses two points for two things. One,
I couldn't see on the form whether my weight means 'closer' or 'farther', and that's the one thing
that makes weighted betweenness right or wrong. Two, the run numbers flip between the results
list and the comparison, so I'd stop trusting 'Run 1' and go by the settings instead."

## Would I use this instead of my current tool?

"For this job, yes -- the compare-two-runs part and the run record I'd use tomorrow. That's the
bit I currently do by hand, and the 'Details, Copy' is basically my methods paragraph written for
me. For the numbers themselves I'd still run it once in NetworkX next to it the first time, to see
they match. If they match, I stop doing that."

---

## Findings (for the studio)

| Screen | What happened | Severity (1 low - 4 blocks) |
|---|---|---|
| results-panel (options form) | Changing the weight shows only the column name; nothing says whether the weight is read as a distance or a strength for betweenness. Alex would pick "value" and could hand over an inverted ranking without knowing. The run record's "Weight conversion" row answers it only after the run. | 3 |
| comparison (two runs of one measure) vs results-panel | Run numbers disagree: the results panel lists Run 1 = damping 0.85, Run 2 = 0.5; the comparison's two-runs panel labels 0.85 as run 2 and 0.5 as run 1. Alex stops trusting run numbers. | 3 |
| comparison (two runs of one measure) | The top-N overlap ("N of the top 10 in both") shown for two measures is not visible for two runs; that is the sentence Alex would say out loud. | 2 |
| navigation / comparison | No frame shows the task's own data (Les Miserables) past the first result; the second run and the comparison are only shown on other datasets, so Alex has to assume the Les Mis version works the same. | 2 |
| comparison (run record) | "How each was made" needs two separate Copy actions, one per run; one copy of both run records side by side would match the question. | 1 |
| navigation | The Les Mis result shows "Re-run" while the other screens say "Re-run (keeps Run 1)"; the plain label revives the worry that the old run is overwritten. | 1 |

What worked, in his words: the Results list with settings and date on every run; "Compare with..."
putting earlier runs of the same measure first; "Rankings agree at the top" in words before the
Spearman number; the moved list with a toggle for direction; the run record with Seed "does not
apply" and Copy; method-carrying column headers and the methods file beside the CSV; "Comparison
closed without saving, Reopen".
