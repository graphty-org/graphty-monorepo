# Session: a weight read the wrong way -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist, associate professor of computational social science. Gephi
since 0.8, teaches it every year, checks every number she publishes against NetworkX. Mild
presbyopia.

**Task, as the moderator gave it:** "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

**Screens seen, in order:** the load step (`shots/tasks/quiet-weight-trap/01-weight-role-trap.png`);
the weight trap page, states A2 to A6 (`shots/screens__weight-role-trap-a2--study.png` to
`-a6--study.png`); for comparison, the node table with its ranks on the same dataset
(`shots/qwt-mara-r6-table-dock.png`), the Run a measure menu and the main menu's Algorithms list
on the protein project (`shots/qwt-mara-r6-run-and-read.png`, `shots/qwt-mara-r6-results-panel.png`)
and the data panel on the payments project (`shots/qwt-mara-r6-data-panel.png`).

**Outcome:** success. She answered the weight question correctly on the first look, ran weighted
betweenness, and afterwards checked the numbers in her own NetworkX notebook: all of them matched
to three decimals, for both readings of the weight. Her trust in the ranking is real but
conditional: the conversion is now on the result, the normalization still is not, and the table
column that she would export does not say which reading made it. She also went looking for
weighted degree first, out of Gephi habit, and could not find it in this project's catalog.

---

## Transcript (thinking aloud)

### 1. The load step

> miserables.json. Seventy-seven characters, two hundred fifty-four edges, undirected. Yes, that
> is Les Mis -- 77 and 254, I have typed those numbers into a slide more times than I want to
> count. Zero isolates, correct.

> "Edge attribute value, whole numbers, 1 to 31; most edges 1 to 3." With a histogram. Good. That
> is the Knuth co-occurrence count, number of chapters two characters share. The max is Valjean
> and Cosette, I think, or Valjean and Marius. Whatever.

> "A measure that reads value asks, each time it runs, what a bigger value means." So it does not
> ask me here. Fine. Actually I prefer that -- the column is data, the reading is a choice of the
> analysis. In Gephi the weight column is just "Weight" and each statistic does whatever it does
> with it, and you find out from the source code. Load.

### 2. "Rank the characters" -- where she went first

> Rank the characters. My first reflex is weighted degree. In Gephi that is Statistics, Average
> Weighted Degree, and then sort the column in the Data Laboratory. It is the honest first ranking
> for co-occurrence: how many scenes you share with everybody.

> Results panel. Catalog. Centrality: Betweenness, Closeness, Harmonic, PageRank, Eigenvector.
> Where is degree? There is a "degree" column in the table already -- 36 for Valjean. That is the
> plain count of neighbours, not the weighted one. Valjean's weighted degree is 158, not 36. So
> the tool computed degree for me without asking and did not weight it, and it is not labelled
> unweighted. On this dataset I know it; on my own data I would not.

> (She clicks the filter icon next to Catalog, expecting a list of families.) I suppose this is
> where degree hides. I am not going to hunt. I'll do betweenness, which is what the task is
> really about anyway -- anybody who says "the edges carry a number" to me is asking whether I
> know which way the weight goes.

*Moderator note: on the protein project the Run a measure menu has a Degree family with "Links
(count)" and "Total confidence". She was shown it afterwards and said "Total value, then. I would
never have looked for the word Total. Call it weighted degree, or put weighted degree in brackets.
That is the name in every paper."*

### 3. The run form (A2)

> Betweenness. A small form. Scope: Full graph, 77. Good, it says the set; in Gephi you only find
> that out when your filter was still on. Weight: value. "In this run, a bigger value means:
> Choose..." and Run is grey, with "Choose what a bigger value means first".

> Good. That is the right place for the question. It blocks me, it does not guess for me. Gephi's
> betweenness simply ignores the weights -- it is Brandes on the unweighted graph -- and half my
> students do not know that and write "weighted betweenness" in their papers.

> Normalized: on. Normalized how? For undirected, NetworkX divides by (n-1)(n-2)/2. igraph does
> not normalize by default. Gephi normalizes differently again. A toggle called Normalized is not
> a convention. I want one line under it, or I want it in the result.

> Over on the right, Statistics: "Weight: value, shared scenes, 1 to 31." Shared scenes? Where
> did it get "shared scenes"? The JSON has a field called value and nothing else. If the file
> carries a description, fine, show me that it came from the file. If the tool made it up, I want
> to know. I will come back to that.

### 4. The answers (A3)

> Two answers. "A longer or costlier step -- Distance = value." "A closer or stronger link --
> Distance = 1 / value, such as a count of shared scenes."

> Closer or stronger. Obviously. It is a count of co-occurrences; more shared scenes is a stronger
> tie, so a shorter path. And -- well, the second option is literally describing this dataset.
> That is the answer printed on the button again. For me it tests nothing. For a student it helps,
> I suppose, unless the example ever sits on the wrong option.

> What I like: each answer says the formula. "Distance = 1 / value." Not minus log, not max minus
> value. One over value. That is what I would write in the methods section, and it is what
> NetworkX does if I build the inverse column myself. Good.

> The highlighted row when the menu opens is the first one, the wrong one for this data. I would
> not press Enter on it, but somebody will.

*She chose "a closer or stronger link". The moderator then showed states A4 to A6, where another
participant had first chosen the other answer, and asked her to read the result as if it were
hers.*

### 5. The wrong reading, shown (A4)

> Run 1, "Distance = value". It is right there on the run row, under the name. Last time I had to
> dig for that. Now I can see it without opening anything.

> Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177. Hmm. It looks like a ranking.
> Javert third -- plausible, he is everywhere in the plot. Nothing on the screen says this is
> wrong, and nothing could: the tool does not know the data. The only defence is the line
> "Distance = value" and the reader knowing what value is. That is honest. It is still a trap.

> And the table column: "betweenness, 0 to 0.454". It does not say Distance = value there. The
> caption above says "Sorted by betweenness." If I export this table, I get a column called
> betweenness, and six months later nobody knows which run it was.

### 6. Changing the answer (A5)

> She opens the result. The same form, the answer changed to closer or stronger. The run row says
> "Out of date" with a warning mark, the column header says "Out of date", and the old numbers are
> still there with "Top nodes, Run 1 (Distance = value)". The verb is "Re-run (keeps Run 1)".

> This is the best thing on the page. In Gephi, re-running a statistic overwrites the column for
> whatever was visible and leaves the rest, and nothing tells you. Here the old run is kept, it is
> marked stale, and it tells me it will keep it. I would teach with this screen.

### 7. The ranking (A6)

> Run 2, "Distance = 1 / value", 10:15. Run 1 still listed under it with its own line. Good.

> Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193, Courfeyrac 0.177, Thenardier 0.172,
> Gavroche 0.102.

> So Marius is second. That is the right story: Marius is the bridge between Valjean's world and
> the barricade students, and he is only a bridge if strong ties are short. Javert has vanished
> from the top -- he shares a scene or two with many people, which is exactly what makes him a
> short cut when you read the counts as lengths.

> My answer to the task, then: by weighted betweenness, reading value as closeness, Valjean,
> Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche. If you want who is central by volume
> of ties, weighted degree: Valjean, Marius, Enjolras, Courfeyrac. I would report both and say
> which is which.

> What I cannot do on this screen: see Run 1 and Run 2 side by side. The table has one betweenness
> column, and it is Run 2. To see Javert drop I need both columns and a rank for each. The
> node table on the other project has rank columns and a "Compare rankings..." link -- that is
> what I want here, with the run's conversion in each column header.

### 8. Checking the numbers

> I do not trust any number until NetworkX agrees. (Afterwards, in her own notebook:
> `nx.les_miserables_graph()`, `betweenness_centrality` with `weight='weight'` and with a
> `1/weight` column.)

> Distance = value: Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177, Thenardier 0.129.
> Matches. Distance = 1 / value: Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193,
> Courfeyrac 0.177. Matches. Marius goes from tenth to second, Javert from third to forty-fifth.
> Matches. And the unweighted one on the other table, Valjean 0.570, Gavroche 0.165 -- that is
> NetworkX's unweighted, normalized. So "Normalized" here means NetworkX's convention. It should
> say so; I had to find out by computing it.

### 9. Do I trust the ranking?

> Yes, with conditions. I trust it because the run asked me the direction, refused to run without
> an answer, printed the formula on the result, and the numbers reproduce in NetworkX exactly.
> That is more than Gephi gives me: Gephi's betweenness is unweighted and does not say so.

> The conditions: say the normalization; put the conversion in the column header and in the
> exported column name, not only on the run row; show me where "shared scenes" came from; and let
> me put two runs side by side. And label the degree column in the table as unweighted, because it
> is, and put weighted degree in the catalog under the name everybody uses.

### 10. Single Ease Question and verdict

> Six. The part that matters -- which way the weight goes -- was asked at the right moment and
> could not be skipped, and the answer is written on the result. I lose a point for the missing
> normalization and for having to go to another tool to learn it, and because I could not find
> weighted degree.

> Instead of Gephi? No. This is one statistic on 77 nodes. My work is ForceAtlas2 on thirty
> thousand nodes and an SVG with labels for a reviewer, and I have not seen that here. But for the
> statistics, alongside NetworkX, and for teaching the weight trap to students -- yes, I would open
> it. The numbers checked out, and that is the first thing a new tool has to survive with me.

---

## What the moderator observed

- She answered the weight question correctly within seconds. The second option's gloss ("such as
  a count of shared scenes") names this dataset, and the Statistics panel already says "value,
  shared scenes", so the question did not test her; she called it "the answer printed on the
  button" for the second round running.
- She questioned where "shared scenes" came from: the file has a bare field called value. If the
  tool supplies that description, she reads it as a guess the tool made about her data.
- Her first move for "rank" was weighted degree, the Gephi habit. The catalog on this project
  showed only the Centrality family, and the table's "degree" column is the unweighted count
  without saying so. She did not find weighted degree and did not look long. Shown the "Total
  confidence" entry on another project, she said she would never search for the word Total.
- The conversion on the run row ("Distance = value", "Distance = 1 / value") was read at a glance
  and was the main reason her trust went up from the earlier round. The table column header and
  the table caption do not carry it, and she expects the exported column to.
- "Normalized" with no convention was her main reproducibility gap. She confirmed by computation
  that it matches NetworkX's normalization and said the screen should have told her.
- Out of date on the run and on the column, with "Re-run (keeps Run 1)", was again the strongest
  positive moment; she compared it directly with Gephi's statistic columns that are overwritten
  for visible nodes only.
- She wanted Run 1 and Run 2 side by side with ranks, as the node table on another project offers
  with "Compare rankings...". On this page only one betweenness column is visible after the re-run.
- The menu of answers opens with the first answer (Distance = value) highlighted, which is the
  wrong reading for count data; she flagged it as a keyboard trap for students.
- Every number on the page matched NetworkX 3.1 to three decimals for both readings, including
  the rank moves (Marius 10th to 2nd, Javert 3rd to 45th).
