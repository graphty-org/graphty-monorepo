# Session: a weight read the wrong way -- Analyst Alex

**Participant:** Alex, operations data analyst. Uses NetworkX for the numbers and Gephi for the
picture. Mild red-green colour vision deficiency.

**Task, as the moderator gave it:** "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

**Screens seen, in order:** the weight trap page, states A1 to A6 (shots
`screens__weight-role-trap-a1--study.png` to `-a6--study.png`); the run menu
(`screens__run-and-read-task-quiet-weight-trap--study.png`); the results panel
(`screens__results-panel-task-quiet-weight-trap--study.png`); the inspector
(`screens__inspector-task-quiet-weight-trap--study.png`); the recipe binding step
(`screens__binding-step--study.png`).

**Outcome:** success with difficulty. Alex answered the load question the wrong way, got a
plausible wrong ranking, and caught it himself -- but only because the words "used as distance"
kept being repeated next to the result. He fixed it in two clicks and re-ran. He ends up trusting
the second ranking "more than the first, less than NetworkX".

---

## Transcript (thinking aloud)

### 1. Opening the file (A1)

> OK, miserables.json. I know this one, it's the Les Mis graph from every NetworkX tutorial.
> Before anything -- down the left, "Assistant Off. Nothing is sent." Fine. I'll take that for now.

> Counts: 77 nodes, 254 edges, undirected, zero isolated. That's what NetworkX gives me for
> `les_miserables_graph()`, 77 and 254. Good, counts match. I'd keep going.

> Then there's a histogram and a question. "Edge attribute value, whole numbers, 1 to 31, most
> edges 1 to 3." "For value, a higher number means..." Hmm. I don't normally get asked this. In
> NetworkX I just pass `weight="value"` and it does... whatever it does.

> Four options. I read the bold ones: "a longer or costlier step", "a closer or stronger link",
> "more can pass through", "Don't use value". The grey bit next to the first one says "Read by
> shortest path, betweenness, closeness." I'm going to run betweenness. So -- that one? That's the
> one betweenness reads.

*(He clicks the first option without reading the grey line under the second option. Asked
afterwards, he had not noticed it says "such as a count of shared scenes".)*

> Load. Two clicks, fine.

**Moderator note:** the grey text beside each role names the measures that read it. Alex treated
"Read by betweenness" as "pick this if you want betweenness", which is the opposite of what the
question is asking. The one line that would have saved him ("a count of shared scenes") is the
grey text of an option he did not pick, and he skims grey text.

### 2. Finding betweenness

*(He looks at the run menu on the protein page, and the main menu's Algorithms list.)*

> The screenshots I've got for "run" are some protein network, not Les Mis. Whatever, same menu I
> assume. Centrality, Betweenness at the top. Hover says "How often a node lies on the shortest
> paths between other nodes: the brokers and bottlenecks. Click to run." That's a decent one-liner,
> I could almost say that to my director.

> There's a "Change overview..." and "confidence, not used yet" on this protein one. Not my data,
> skipping.

### 3. The first ranking (A2)

> OK, it ran. Table's sorted by betweenness: Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel
> 0.177, Thenardier 0.129, Fantine 0.114.

> Valjean on top, obviously. Javert third, sure, he's chasing Valjean the whole book. This looks
> right. Honestly if I were in a hurry I'd screenshot this.

> ...Except Valjean at 0.454. When I run plain betweenness in NetworkX on this graph I'm pretty sure
> Valjean is about 0.57. It's in every tutorial. So this isn't the number I know.

> Right side: "Weight: value, used as distance." And under Results, Betweenness, same thing,
> "Weight: value, used as distance."

> Hang on. Value is how many scenes two characters share. More scenes together, that's -- closer,
> not further. If it's used as a distance then two characters who are in thirty scenes together are
> thirty steps apart. That's backwards.

> So I picked the wrong thing at the start. Great. And it didn't complain at all, it just gave me a
> perfectly believable top five. That's exactly the kind of thing that ends up in a deck wrong.

> The picture didn't help me either. Valjean's the big dot, but I can't tell if the size is
> betweenness or degree -- there's a colour legend for "group" but nothing for size. I assumed it
> was betweenness until I noticed it looks the same as before I ran anything.

**Moderator note:** Alex caught the error from the text label, not from the ranking. The ranking
by itself looked credible to him ("Javert third, sure"). The number he used as a sanity check
(0.57) is the unweighted NetworkX value, which is not on screen in either reading, so he could not
confirm against it.

### 4. Checking what the run actually did (A3)

> Let me click the Betweenness row and see what it says.

> A little form. Scope: Full graph, 77. "Weight -- from Edges": "value, used as distance", with a
> chain-link icon. Underneath: "Read as a distance: a bigger value is a longer step." Well, at least
> it's honest. It says in plain words what it did.

> Top nodes list again, same numbers. "Details" I don't care about yet.

> There's an icon at the end of the weight field, hover says "Detach: read value another way for
> this run only." Detach? Detach from what? I don't want a one-off, I want the whole project to
> stop treating scenes like miles. Not clicking that.

> What I'd actually want here is a "no weight" choice, just so I can see the 0.57 I know. There's no
> obvious way to do that for this one run without "Detach", and I don't know what Detach does.

### 5. Fixing the reading (A4)

> The Statistics block on the right has "Weight: value, used as distance" with an arrow. Clicking
> that.

> "Edges" pops up. Direction: Undirected / Directed. Weight: value. "A higher value means": I change
> it to "a closer or stronger link". There's a "How it is converted" link -- I'd click that if the
> number surprised me, not before.

> And straight away Betweenness says "Out of date" with a "Re-run" button, and the table header
> says "Out of date" too. OK, that's good. Gephi would've just left the old numbers sitting there
> looking valid.

> Only thing: the old numbers are still in the table, 0.454 and so on, just with "Out of date" in
> small grey under the column name. If someone walked past my screen right now they'd read those.

### 6. Out of date, then re-run (A5, A6)

> Re-run. One click.

> New table: Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193, Courfeyrac 0.177, Thenardier
> 0.172, Gavroche 0.102. Header says "0 to 0.795". Results row now says "Weight: value, used as
> similarity."

> Whoa, that's a different story. Javert's gone from the top. Marius jumped to second. Gavroche
> dropped from second to seventh. So the "choke points" depend completely on that one question at
> load time. That's... actually a useful thing to know, and slightly scary.

> Does Marius at number two make sense? He's the bridge between the students and Cosette's lot, I
> suppose. I'd buy it.

> The picture hasn't changed at all between the two runs. Same dot sizes, same colours. So the
> picture is not showing me betweenness, which I'd assumed. Where did the result go on the graph?

### 7. The inspector and recipes, briefly

> The inspector on the protein one lists results as "PageRank, full graph, unweighted",
> "Betweenness, full graph, hops counted", "Louvain, confidence used as similarity". I like that --
> every result says how it read the weight, right in the list. If I had two betweenness runs side by
> side like that, one "hops counted" and one "value used as similarity", I could put both in the
> deck and explain the difference.

> The recipe page is huge. What I notice is there's a "For confidence, a higher number means" drop
> down in there too, so if a colleague reuses my steps they get asked the same question. Fine. But
> if they answer it wrong, like I did, the recipe won't stop them either.

---

## The answer Alex gives the moderator

> "Ranked by betweenness, with value read as shared scenes -- so more scenes means closer:
> Valjean, Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche.

> Do I trust it? More than the first one I got, which had Gavroche and Javert up top because I told
> it scenes were distances. I trust it because the tool tells me, on the result itself, how it read
> the number, and because when I changed that it marked the old result Out of date instead of
> leaving it there looking fine. I don't fully trust it because I can't check it against NetworkX
> from here -- the number I know, 0.57 for Valjean, is the unweighted one, and I couldn't see an
> unweighted run to compare with. Before this went in a deck I'd run
> `betweenness_centrality(G, weight=...)` with one-over-value in Python and check Valjean's 0.795."

---

## Single Ease Question

**4 out of 7.**

> "Running it was easy. Getting the right answer was not -- the first thing it asked me, I got
> wrong, and nothing told me I'd got it wrong except a label I happened to read. If I hadn't known
> Les Mis, I'd have shipped the first ranking."

## Would he use this instead of his current tool?

> "For this bit, maybe. NetworkX would have given me the same wrong answer if I'd passed
> `weight='value'` without thinking -- actually worse, because it doesn't say 'used as distance'
> anywhere. This at least writes it on the result. And the Out of date thing is better than Gephi.
> But I'd still check the numbers in Python the first few times, and I'd want the picture to
> actually change when I run something."

---

## Problems observed

1. **The load question leads the analyst to the wrong reading (severity 3).** The grey text
   "Read by shortest path, betweenness, closeness" beside "a longer or costlier step" reads as
   "choose this if you want betweenness". Alex wanted betweenness, so he chose it. The line that
   describes his data ("such as a count of shared scenes") sits beside a different option and is
   grey, which he skims. Quote: "I'm going to run betweenness. So -- that one? That's the one
   betweenness reads."
2. **The wrong ranking looks right (severity 3).** Nothing flags a weight read as a distance when
   its values look like counts (whole numbers, 1 to 31, mostly 1 to 3). Alex caught it only from
   the words "used as distance", and only because he knew the dataset. Quote: "It just gave me a
   perfectly believable top five."
3. **No unweighted run to compare against (severity 2).** Alex's only sanity check is the
   unweighted NetworkX value (Valjean about 0.57), and neither reading shows it. The only per-run
   control is "Detach", which he did not understand and would not click. Quote: "Detach? Detach
   from what?"
4. **The picture does not change after a run (severity 2).** Node sizes and colours are identical
   before the first run, after it, and after the re-run, and there is no size legend. Alex assumed
   the big dots were betweenness. Quote: "Where did the result go on the graph?"
5. **Out-of-date numbers still read like results (severity 1).** After the re-map, the old values
   stay in the table at full strength, with "Out of date" only as small grey text under the column
   header. Quote: "If someone walked past my screen right now they'd read those."
6. **The run screens show a different dataset (severity 1).** The run menu, results panel and
   inspector renders are the protein network, not Les Miserables, so Alex had to assume the flow
   was the same. Quote: "Some protein network, not Les Mis. Whatever, same menu I assume."

## What worked for him

- The counts in the open dialog (77, 254, undirected, 0 isolated) matched what he knows from
  NetworkX, straight away.
- Every result names how it read the weight ("value, used as distance", "hops counted",
  "confidence used as similarity"). This is what caught the error.
- Changing the reading marked Betweenness "Out of date" at once, with a one-click "Re-run".
- The betweenness hover line ("the brokers and bottlenecks") is something he could say to a
  director.
