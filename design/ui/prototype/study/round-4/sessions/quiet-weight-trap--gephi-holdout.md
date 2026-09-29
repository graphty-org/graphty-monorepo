# Session: the quiet weight trap -- Gephi holdout (Mara)

**Participant:** Dr. Mara Lindqvist (fictional composite; see study/personas/gephi-holdout.md).
Associate professor, Gephi user since 0.8, teaches it every year.
**Task, as given by the moderator:** "The Les Miserables edges carry a number. Rank the
characters, then tell me whether you trust the ranking and why."
**Screens used:** the weight trap sequence (load question, first result, trust check, re-map,
Out of date, re-run), the algorithm catalog (run-and-read), the Algorithms menu (results
panel), the inspector with its Results list, and the recipe binding step. Laptop size,
1440x900.

**Outcome:** finished. She ranked the characters by betweenness with the co-appearance count
read as a strength, and said she trusts the ORDER but will not cite the NUMBERS until she has
reproduced them in NetworkX, because the conversion formula and the normalization are one
click away from the result instead of on it.

**Single Ease Question:** 5 of 7.
**Would she use it instead of Gephi:** no, not instead. She would use this screen in her
methods class to teach what an edge weight means, which is something Gephi never makes a
student decide.

---

## Transcript

Think-aloud, lightly cleaned. Moderator lines are marked M. Everything else is Mara.

### 1. Opening the file (load question)

> Les Mis. Fine, I know this one, it ships with Gephi. Seventy-seven characters, two hundred
> fifty-four edges. Let me check... 77, 254, undirected. Good, the counts are right, we can
> keep going.

> Isolated nodes zero, correct. What is this box... "Edge attribute value, whole numbers, 1 to
> 31; most edges 1 to 3." Yes, that's the co-appearance count, the number of chapters two
> characters share. Valjean and Cosette are the 31, I think.

> "For value, a higher number means..." Hm. So it's asking me whether the weight is a strength
> or a length. Nobody has ever asked me that in Gephi. Gephi just calls it Weight and every
> statistic does whatever it does with it -- and betweenness in Gephi ignores it completely,
> which half my students never find out.

> "a longer or costlier step -- distance." "a closer or stronger link -- similarity, such as a
> count of shared scenes." Well, that's practically the answer printed on the button. Shared
> scenes, that is this dataset. I pick the second one. Obviously it's a strength: more
> chapters together, closer ties.

> Nothing was picked for me. Good. I would have been annoyed if it had guessed.

> The last row, "Don't use value -- the same as leaving the question unanswered." Wait. So if I
> just hit Load without reading, I get an unweighted graph and no warning? That's the second
> trap in this box. My students will hit Load. I'd rather Load were disabled until you answer,
> or the result says "unweighted" loudly. Let me see if it does.

She pressed Load with "a closer or stronger link" selected.

> M: For the next few screens, the mock shows what happens if someone picked the first option,
> "a longer or costlier step." Treat it as a file a student sent you.

> Ha. Fine. That is the realistic case anyway. I get these files by email.

### 2. The first ranking (the student's file)

> Right, it's already run betweenness. I didn't ask it to, but OK, the student did. Table is at
> the bottom -- that's my Data Lab, good, it's visible, I can see rows. Sorted by betweenness.
> Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177, Thenardier, Fantine, Mabeuf.

> That's not what I remember. Unweighted normalized betweenness on Les Mis, Valjean is about
> 0.57, and Myriel is up near the top because he's the hub for all his little star of
> visitors, and Gavroche and Marius are around there too. Javert at third is odd. So something
> was done to this. What was it computed on?

> Top right. "Weight: value, used as distance." And again under the result row: "Betweenness --
> Weight: value, used as distance." Well, there it is. Twice. It read the co-appearance count as
> a length, so the strongest friendships count as the longest roads and the paths go around
> them. That's backwards.

> I'll give it this: in Gephi I would never know from the column what went into it. Here the
> result line says it. I found it in about ten seconds -- but I found it because the numbers
> looked wrong to me and I know this dataset by heart. A student looking at "Valjean, Gavroche,
> Javert" would say "sure, the main characters" and write it up. Nothing is red, nothing is
> flagged. The word "distance" is sitting there in grey small type. If I didn't know to look,
> I wouldn't look.

> And the table column says "betweenness, 0 to 0.454". It doesn't say "as distance". If I sort
> or export that table -- is the reading in the exported column name? I can't tell from here.
> That's where Gephi burns me: the CSV goes to R and the provenance is gone.

### 3. The trust check (opening the result)

She clicked the Betweenness row in the Results list.

> Scope: Full graph, 77. Good, that's the first thing I wanted -- not "whatever is visible".
> Weight -- from Edges: "value, used as distance." "Read as a distance: a bigger value is a
> longer step." Clear enough. Normalized, switched on. Top nodes, same list.

> Normalized how? NetworkX divides by (n-1)(n-2)/2 for undirected. Is that the same? It doesn't
> say. And endpoints, excluded I assume. That would be under "Details", I suppose. I shouldn't
> have to open "Details" for the one thing a reviewer asks me. Put the formula on the row.

> There's a little icon at the end of the weight pill. Tooltip: "Detach: read value another way
> for this run only." Detach? Detach from what? I don't know that word in this sense. It sounds
> like it would unlink my column. I would not click that. What I actually want is "change it
> for the whole graph", and I suppose clicking the pill does that. Let me try the pill.

### 4. Changing the reading on the graph

The pill opened the Edges editor. (She reached it by clicking the Weight row in the graph's
Statistics; she said either would have been her guess.)

> Edges. Direction: Undirected, Directed. Weight: value. "A higher value means": I set it to "a
> closer or stronger link." OK, and the Weight line at the top now says "value, used as
> similarity". The Betweenness row went to "Out of date" with a Re-run button, and the column
> header says "Out of date" too.

> Good. Good! It didn't rerun behind my back, and it didn't silently leave the old numbers
> sitting there pretending to be current. This is exactly the thing I complain about in Gephi,
> where a column can be half one run and half another and nothing tells you. Here the column
> itself says it is stale. That I like. I would show that slide in class.

> "How it is converted." That's the part I need. If it's a similarity and betweenness needs
> lengths, it has to invert it. 1 over value? Max minus value? Negative log? Those give different
> rankings. It's collapsed, and I have to open it. Let me open it.

> M: In the mock it expands to show the conversion; the default is one over the value.

> One over value. Fine, that's what I'd write in NetworkX myself: distance equals 1 divided by
> weight. It's the standard choice. But it's on the graph's edge settings, not on the result. In
> six months when I open this project for a revision, the result row says "used as similarity"
> and not "1/value". If someone changes the conversion later, does my result go out of date?
> I'd hope so. I can't see it here.

> And Ctrl+Z -- does that undo the role change? The moderator says the undo entry is called
> "Change role of value". All right. If that's true that is already more than Gephi gives me.

### 5. Re-run and the ranking

She pressed Re-run.

> Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193, Courfeyrac 0.177, Thenardier 0.172,
> Gavroche 0.102. Javert gone off the top -- where is he -- 45th?

> That makes sense to me. Marius is the bridge between the students at the barricade and
> Valjean and Cosette, and those are heavy ties, so the short strong paths go through him.
> Javert has lots of edges but thin ones, one or two chapters each, so once the strong ties are
> short he isn't on the cheap paths any more. Gavroche drops for the same reason. Myriel stays up
> because nobody else reaches his little cluster. Yes. That is a story I can defend.

> So, the ranking: Valjean, Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche.

> The row now says "Weight: value, used as similarity." Good, the reading moved with the numbers.

### 6. The other screens

> M: Here are a few more screens from the same app, different data.

> Proteins. Well, fine, it's a mock.

> The catalog: Betweenness, and the tooltip: "How often a node lies on the shortest paths
> between other nodes... Click to run." Click to run. So one click and it runs, with whatever the
> graph says the weight means, and the tooltip doesn't mention weight at all. Gephi at least
> pops a little dialog with Directed and Normalize before it runs. Here the weight question was
> asked once, at load time, maybe by someone else, and never again. That's how the student's file
> happened. I'd want the catalog entry, or the tooltip, to say "reads value as distance" before I
> click.

> "Closeness, WF-corrected." Wasserman-Faust. Somebody here knows the literature. That I like;
> it tells me which formula without me asking.

> The menu with Algorithms: fine, Centrality, Community, Path, Structure. That's where I'd look.

> The inspector: Results, "Louvain, 10 communities, confidence used as similarity"; "PageRank,
> full graph, unweighted." Yes. That is the column header Gephi should have had for ten years.
> Scope and weight on every result. Louvain doesn't say resolution or seed, though, and I've had
> a reviewer on my back over a changed community number. I'd want the seed there too.

> The recipe screen with the confidence mapping, "For confidence, a higher number means...
> a closer or stronger link" -- same question in someone else's workflow. Consistent, at
> least. It's far too dense for me to read on a laptop, but that's a different task.

### 7. Do you trust the ranking?

> The order, yes. Valjean first, Marius second, it matches what I know about the book and it
> matches the logic of strong ties being short. The numbers, not yet. I'd reproduce it in
> NetworkX -- betweenness_centrality with weight as 1/value, normalized -- and if Valjean comes
> out 0.795 I'll cite it. The tool told me what it read and how, which is more than Gephi does.
> It did not put the conversion and the normalization on the result, so I can't check it from
> the result alone. I have to go into the graph's edge settings to find the formula. For a paper,
> that's the thing that has to be on the row, and in the exported column.

> And I only caught the wrong version because I've seen this dataset a hundred times. On a new
> dataset, the distance ranking would have looked perfectly plausible. The label was there. It
> just wasn't loud. The fix wasn't hard -- two clicks and a Re-run -- but finding that you need it
> is on you.

### 8. Single Ease Question and verdict

> Five. The fix was easy and the out-of-date state is honest. It's not higher because the
> dangerous version looks exactly like the right one, and the formula is hidden behind two
> disclosures.

> Instead of Gephi? No. Not for this. This is one statistic on a 77-node graph; my work is
> ForceAtlas2 on thirty thousand nodes and an SVG for a reviewer, and I haven't seen any of that
> here. But this particular screen -- asking what the number means when you load the file --
> I'd steal for teaching. Gephi never asks, and every year a student publishes betweenness that
> ignored the weights or read them backwards.

---

## What the moderator observed

- She answered the load question correctly in under ten seconds; the gloss "such as a count of
  shared scenes" names this dataset almost verbatim, so the load question did not test much for
  her. She called it "the answer printed on the button".
- She spotted the wrong reading in the student's result only because the numbers disagreed with
  her memory of the unweighted values. She then found "used as distance" on the result row within
  about ten seconds. She said a student would not have looked.
- She read "Don't use value -- the same as leaving the question unanswered" as a second trap: a
  quick Load gives an unweighted graph, and she could not tell whether any result would say
  "unweighted" loudly.
- "Detach" meant nothing to her and sounded destructive; she did not use it.
- Out of date on both the result row and the column header was the strongest positive moment
  of the session; she compared it directly with Gephi's statistic columns that silently mix
  runs.
- The conversion (one over the value) and the normalization convention are the two facts she
  needs to reproduce a number, and neither is on the result. She had to be told what "How it is
  converted" contains.
- "Click to run" in the catalog runs betweenness without showing the weight reading first; she
  linked this directly to how the wrong file came about.
- She wants the reading, the conversion and the normalization carried into the exported column,
  not just shown in the app.
