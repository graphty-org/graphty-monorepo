# Session: can these rankings be trusted? -- Analyst Alex

**Participant**: Alex, data analyst (operations analytics, logistics). Uses NetworkX for the numbers and
Gephi for the picture.
**Task as given**: "Something about these rankings bothers a reviewer. Find out whether the numbers can
be trusted." The planted problem: on the Les Miserables co-appearance network, the edge weight (how
often two characters appear together -- bigger means closer) was read as a distance (bigger means
farther), so every path-based ranking is upside down.
**Screens**: the Results panel (first), then the load step.
**Note on the material**: none of the screens shows the Les Miserables graph. The results panel shows a
300-protein network and a 124,318-node citation network; the load step shows transfers and protein
files. Alex had to judge the question by finding where this tool would tell him how the weight was read.

## Think-aloud

**1. Results panel, "Running" (PageRank on the citation graph).**
"OK, this isn't Les Mis. Whatever. The reviewer's bothered by the rankings, so first thing I want is:
what was this run *on*, and what did it do with the weights. Because on Les Mis the only interesting
thing on the edges is the co-appearance count."
Reads the grey line under the progress bar: "on: full graph, 124,318 nodes. Exact. Directed." "Fine."
Then the form: Scope, Direction, Weight -- "Weight: None declared." "None declared by who? By me? So
it ran unweighted. On Les Mis that would give you one answer, weighted gives you another. At least it
says something."

**2. "Finished" state (Betweenness on the protein graph).**
Goes straight to the grey line: "Exact. Unweighted, undirected. WebGPU. Details." "Right, *this* is the
line I care about. Unweighted. So for my reviewer, I'd want this to say 'weighted, count as distance'
or whatever -- and then I'd know. On this one it just says unweighted, so I can't tell what it would
say for Les Mis."
Clicks **Details**. Nothing happens in the prototype. "Details went nowhere. That's the one link I
actually wanted."
Top nodes: MAPK1 0.1379, TP53 0.1139... "Proteins, I don't know these. On Les Mis I'd know -- Valjean's
the top for betweenness, Myriel is up there because of all the one-scene people hanging off him. If
Valjean isn't first I'd already be suspicious. That's honestly how I'd check it: against what NetworkX
gives me."
Looks at the Weight dropdown again: "None declared", greyed. "Can I change it here? It looks
disabled. So if the weight *was* wrong, I can't fix it on the result. Where do I fix it?"

**3. Hunting for where the weight meaning lives. Right panel, Statistics.**
"Edges: undirected, no weight. '4 more.'" "No weight. OK so the graph doesn't even have a weight."
Moves on through the state tabs looking for one with a weight.

**4. "Out of date" state.**
"Oh, here -- 'Edges: undirected, similarity weight'. So that's where the meaning goes." Reads the
popover: "confidence is now read as a similarity; these read it as a distance." Stops. "Wait. 'Now
read as a similarity; *these* read it as a distance.' So Louvain and the shortest path read it as a
distance? That's -- is that the bug? Or is it saying they *used* to read it as a distance and now
they're stale? I genuinely can't tell which way round that sentence goes."
Re-reads it. "I think it means they ran under the old setting. But 'these read it as a distance' in
present tense sounds like they still do. If I'm the reviewer, I'd screenshot that and say 'see, it's
reading it as a distance.'"
"Betweenness and Closeness read no weight, so they stay current." "Huh. So betweenness ignored the
weight completely. On Les Mis that matters, because a weighted betweenness is what my reviewer would
be looking at. It's good that it says so, though. Gephi would never tell me that."
Notices the two orange warning dots and "Re-run". "Fine, Re-run all. That I get."

**5. Load step, "Clean" (transfers file).**
"So this is where you set it up." Sees the amount column: Read as "Currency (USD)", Role "Weight",
then "amount as a weight means: Similarity / Distance / Capacity / Unknown", Unknown selected.
"Paths ignore it; PageRank and communities read it as a similarity."
"OK. So this is the switch. For Les Mis the count is a similarity -- more scenes together, closer. If
someone clicked Distance here, that's my reviewer's problem. That's the whole bug in one click."
"Unknown is the default and paths *ignore* it but PageRank reads it as similarity? So on Unknown half
my results use the weight and half don't. That's... actually the kind of thing that ends up in a deck
wrong. I'd want it to just ask me."

**6. Load step, "Repeated pairs" (protein evidence file).**
"Similarity, 'Larger is closer.' Good, that's plain. 'As a distance: 1 - w.' Offered first because
every value is between 0 and 1." "Right, for confidence scores fine. For Les Mis the counts go up to,
what, 31? 1 minus 31 is negative. I assume it wouldn't offer that -- it says 'offered first because
every value is between 0 and 1', so presumably it'd offer 1/w. I'd take 1/w, that's what I'd do in
NetworkX anyway."
"But this is at load time. The reviewer's looking at a *ranking*. If I loaded Les Mis three weeks ago
and ticked Distance, how do I see that from the ranking? The ranking line said 'Unweighted' on that
other screen. I'd want it to say 'weight: value, read as distance' right there, next to the numbers."

**7. Wrap-up.**
"So can the numbers be trusted? I'd say: I know where I'd look -- the grey line on the result, the
Edges row in Statistics, and this Similarity/Distance thing when you load. If the Edges row said
'distance weight' on Les Mis, that's my answer, and I'd flip it to Similarity and re-run. But none of
these screens actually showed me a result that says which way it read the weight. It said
'Unweighted' or 'None declared'. And Details didn't do anything. So I'm half-sure."

## After the task

**Single Ease Question**: 3 of 7.
"What took longest: working out which screen even tells you how the weight was read. The switch at
load is clear. The result doesn't repeat it -- it says unweighted or nothing -- and the one sentence
that talks about similarity versus distance on the result side, I read backwards."

**Would you use this instead of what you use now?**
"For this kind of check, it's already better than Gephi, because Gephi just silently uses the weight
column however it feels like and I find out in NetworkX. Here at least it asks, and it tells me
betweenness ignored the weight. But I'd still rerun it in NetworkX before I told a reviewer it's fine.
If the result line said 'weight: count, read as similarity' I'd stop doing that."

## Problems observed

1. **The result does not say how the weight was read.** The state line on a finished result says
   "Unweighted" or the Weight field says "None declared"; nothing on the result names the weight
   column and its role (similarity or distance) or the conversion used. The meaning lives only on
   the load step and in the Statistics Edges row. Severity 3.
2. **The out-of-date popover sentence reads backwards.** "confidence is now read as a similarity;
   these read it as a distance" was read as "these results currently treat it as a distance" -- the
   exact misreading a reviewer would screenshot. Severity 3.
3. **Details on the result does nothing** in the prototype -- the one place Alex expected the full
   account of how the run used the data. Severity 2.
4. **Weight field on the result looks disabled**, so Alex could not tell whether a wrong weight
   reading could be fixed from the result or had to be fixed elsewhere; no pointer to where.
   Severity 2.
5. **"Unknown" reads the weight differently per algorithm** (paths ignore it, PageRank and
   communities treat it as similarity). Alex saw this as a mixed-state trap: half the results use the
   weight, half do not, silently. Severity 2.
6. **Betweenness ignores the weight without the result making that loud.** Only the out-of-date
   popover says "Betweenness and Closeness read no weight". On Les Miserables a reviewer expects a
   weighted betweenness. Severity 2.

## What worked

- The Similarity / Distance / Capacity / Unknown choice at load, with "Larger is closer": plain words,
  the whole planted bug is one visible click.
- The distance conversion is shown and chosen (1 - w, with 1/w and -log w named).
- The Statistics Edges row carrying "similarity weight".
- Results that read the changed weight go out of date, and the ones that did not are named as such.
