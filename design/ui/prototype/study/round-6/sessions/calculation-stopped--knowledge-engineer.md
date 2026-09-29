# Session: a long calculation stopped partway -- Dr. Min-ji Kim

**Participant:** Min-ji Kim (fictional), knowledge graph engineer and ontologist; SPARQL in a
triple store workbench, rdflib and pandas in notebooks, networkx or igraph when she needs a graph
measure. Company laptop with integrated graphics; WebGPU only on the newer machines. Two
unexplained failures end her session. See ../../personas/knowledge-engineer.md.

**Task, as the moderator gave it:** "A long calculation on the citation graph stopped partway
through. Decide what you can still trust on the screen, and get a result you can use." (The same
wording as the previous round.)

**Screens, in order:** the PageRank re-run on WebGPU, its failure, the run list after the
failure, the refused betweenness run, the sampled run started and canceled, the sampled run set
up again (screens/gpu-lost-run.html); the same failure as the Results panel shows it, the refused
exact betweenness, the finished sampled betweenness with its run record, a finished CPU run, a
finished run opened in the table (screens/results-panel.html); the betweenness options over the
time limit, running, and finished with a 500-source sample typed (screens/option-form-cost.html);
the notices and errors page (screens/notices-errors.html). The failure-and-recovery storyboard
was opened and rendered as an empty white page in the participant view, so she saw nothing from
it. Viewed at 1440 x 900 in the participant view.

**Renders she saw (all under shots/):** r6-minji-stop-gpu-d1.png, -gpu-d2.png, -gpu-d2b.png,
-gpu-d3.png, -gpu-d4.png, -gpu-d5.png, -gpu-d6.png, -rp-failed.png, -rp-failed-run.png,
-rp-refused.png, -rp-finished-sampled.png, -rp-cpu-path.png, -rp-in-the-table.png, -cost.png,
-notices.png, -far.png (the blank storyboard) -- all with the prefix r6-minji-stop-.

**Outcome:** finished, with difficulty. She said correctly that the PageRank values on screen are
Run 1's (damping 0.85) and that the failed 0.5 run left nothing behind, and she set up a sampled
betweenness with 500 sources and seed 7. She still never saw a single PageRank value from any
run of the citation graph. The two screens that show this failure disagree about when Run 1 ran
and about what she can do next, and the finished sampled betweenness says "Directed" in its
options and "read as undirected" in its own run record. She would use the sampled ranking to
look, not to report.

---

## Think-aloud transcript

### 1. The run in progress

> Patent citations. 124,318 nodes, 1,480,221 edges, directed. Components "not computed" -- fine,
> I would rather see that than a guess. Canvas empty, "124,318 nodes not drawn." Good. It did not
> try to draw them and hang my tab.
>
> PageRank, damping 0.5, running, 62 percent, on the full graph, WebGPU. Under the damping field:
> "Showing Run 1 (damping 0.85) until this run finishes." So Run 1 was 0.85, this is Run 2 at
> 0.5. That is clearer than last time -- it names the run by number. Showing it where, though?
> Nothing is drawn and there is no table. Same question I had before.

### 2. It stopped: what does the screen claim now?

> "Could not run PageRank: WebGPU lost; new runs use the CPU." Then, in bold: "Showing Run 1
> (damping 0.85). Run 2 wrote nothing." Good. That is the sentence I wanted. "Wrote nothing" is
> better than "failed" -- failed could mean half-written. Details: Engine "CPU; WebGPU lost",
> "Run 2 failed at 62%", E_DEVICE_LOST. The raw code, I can paste that into a ticket.
>
> The important thing: it did not quietly finish the last 38 percent on the CPU and hand me a
> mixed vector. It stopped and said so.
>
> [Moderator: what can you still trust on this screen?]
>
> - Nodes, edges, direction: about the data, not the run. As far as I trust the import.
> - PageRank: Run 1's values, damping 0.85. The screen says it twice now. I believe it.
> - Run 2: nothing. It says so.
> - The damping field still reads 0.5 -- the value that failed -- with 0.85 in the text above it.
>   It is less treacherous than last round because the bold line is right there, but the input
>   box is still showing me a number that is not what is on screen.
>
> [Goes back to the list, D2B.] Results, newest first. The failed row, "Failed: WebGPU lost", the
> same "Showing Run 1" line, Re-run on CPU, Try WebGPU again. Under it "PageRank, damping 0.85,
> today, 09:40. Run 1. Full graph. WebGPU." And "In-degree, 27 Sep, 16:40. Full graph. CPU." Good,
> the in-degree now says where and when. Last time it said nothing and I let it go; now I do not
> have to.
>
> But I still cannot see a single PageRank value. The Run 1 row has no Top nodes, no range, no
> link to a table. It tells me whose values are showing and shows me none. On the protein
> betweenness I saw later there is "Top nodes" and "295 more in the table". Why not here? I would
> click the Run 1 row and hope.

### 3. The same failure, on the other screen

> [Opens the Results panel's version of the failure, -rp-failed and -rp-failed-run.]
>
> Wait. Same project, same graph size, same failure. Here Run 1 is "Sep 28 10:14" and Run 2 is
> "Sep 28 10:21". On the other screen Run 1 was 09:40 and the failed run started at 10:14. So
> 10:14 is Run 1 on one screen and Run 2's start on the other. The graph is "Citations" there and
> "Citations 1999 to 2001" here. The icons are different, a flask there, a sigma here.
>
> And the recovery is different. There: blue "Re-run on CPU", and a secondary "Try WebGPU again".
> Here: only "Try WebGPU again", as the primary button, with "Try WebGPU again runs damping 0.5,
> under a minute." No CPU button at all. If WebGPU is lost, what do I press on this screen to get
> 0.5 on the CPU? The Options icon, I suppose, but the screen does not say.
>
> I know these are mockups. But this is exactly the kind of thing I check: two views of one run
> should agree on when it ran. If a real tool showed me two different timestamps for Run 1 I would
> stop trusting both until I knew which one the log says.
>
> Good things on this version: "Runs of this measure 2 -- Run 2, damping 0.5, wrote nothing; Run 1,
> damping 0.85, shown." That is a run log. And the "Exact" info mark says "Computed on every node,
> not estimated. It does not say the ranking is meaningful." Somebody wrote that for me.
>
> Still no values for Run 1 here either. Options, runs, Compare with... Where are the numbers?

### 4. Re-run on CPU

> [Back on the first screen.] "Re-run on CPU", tooltip "Takes a few minutes on the CPU". Honest
> button. I press it. On my laptop the CPU is what I would have most days anyway.
>
> [D4 list.] "PageRank, damping 0.5, today, 10:22. Run 3. Full graph. CPU." Thank you -- last round
> the re-run row only said CPU and I had to guess the damping. Now it is in the name. Run 3, not
> "Run 2 again", so the failed attempt keeps its number. Correct.
>
> So I have a PageRank at 0.5 on the CPU. That is the "result I can use" for PageRank, on paper. I
> still have not seen one value from it on any screen. I would open it, expect a Top nodes list
> and a table link, and export. I am taking that on faith.

### 5. Betweenness refused

> [D3.] "Not run: would take hours. The time limit is 30 seconds. Engine: CPU; WebGPU lost."
> Refused before it started. That is the lesson from Neo4j Browser done right.
>
> Routes. "Sampled, 101 sources, under a minute." "Exact, on the 5,318 nodes in Drug patents
> granted in 2001, under a minute. This is a different graph." Good -- last time it said "5,318
> nodes" with no name and I refused it. Now it names the set, and "This is a different graph" is
> blunt in the right way: betweenness on a subgraph is not betweenness on the graph restricted to
> those nodes. I would still not pick it for this question, but I know what it is.
>
> On the options screen the same set is visible under Sets and paths. On the failure screen it
> is not -- the Results list replaces it. Fine; the route names it.
>
> "Sampled" -- how? The route alone does not say. The tooltip on the options screen does:
> "Betweenness estimated from 101 source nodes drawn at random, seed 7, on the full graph." Better.
> Why 101? "The largest sample that fits the time limit." Fine, it is a budget, not a magic
> number.
>
> The options screen also offers "Sampled, 500 sources, a few minutes" as a route past the time
> limit. The failure screen does not; there I had to run 101, cancel, and type 500. Same measure,
> two different lists of routes.

### 6. Canceled, then set up properly

> [D4, D5.] It started at once at 18 percent as "Betweenness (sampled)". I wanted 500, so I
> canceled from the notice. Row: "Not run", Run button. Nothing half-computed kept. A canceled
> estimate is not an estimate. Right.
>
> The refused "Betweenness" row stays: "Not run: would take hours." No red X any more, just a
> sentence. I can live with that -- it is a record that I asked. I would still like to remove it.
>
> [D6.] "Not run, on: full graph, 124,318 nodes. Directed." Sample size 500, "About 101 fits the
> time limit; 500 takes a few minutes and runs in the background." Seed 7. With a seed and a
> sample size I can rerun it next week, or reproduce it in networkx with k=500 and the same seed
> -- well, not the same sources, different generator, but the same method. I press Run.

### 7. What a finished sampled run looks like

> [Options screen, finished.] "Readings: Scores are estimated from 101 sources. The top of the
> ranking is usually stable; a single score can be well off." That is an accuracy statement. Last
> round I asked for exactly that.
>
> [Results panel, finished sampled run, run record open.] Now we are talking. "Method: Brandes
> betweenness from 101 random sources, scaled up by 124,318 / 101." "Error bound: +/- 0.00035 on
> each value, 95 runs out of 100." Seed 7. Took 29.9 s. Engine WebGPU. Top nodes with patent
> numbers and tilde values, "#3-#7" where the values sit inside the error bound, "Ranks below #2
> may swap between runs." "124,313 more in the table." That is a result I can put a footnote on.
> I can check the top five against networkx.
>
> And then: "Direction: Citations read as undirected." "Normalization: divided by (n-1)(n-2)/2,
> the node pairs of an undirected graph." Two lines lower, under Options: "Direction: Directed."
> The header line above says "Directed." The refused exact run on this same screen says "the
> directed citations read as undirected." The run on the failure screen said "Directed" before I
> pressed Run.
>
> Which is it? On a citation graph that is not a detail. Directed betweenness counts paths along
> citations; undirected counts paths that go backwards through a citing patent. The values differ,
> the ranking can differ, and the normalization constant differs by a factor of two. One panel is
> telling me both. I cannot put this number in a report until I know which one was computed.
>
> [Moderator: so what would you do with it?]
>
> Use the ranking to look -- which patents to open. Not to report. And file a question.

### 8. The notices page, for comparison

> [Skims.] The fraud-transfers project: "Could not run PageRank -- Show PageRank". No reason in
> the notice. Then it is gone. Different right panel: "Graph / nodes / edges" lowercase there,
> "Statistics / Nodes" on the citation screen, "Overview" on the Results panel version. Three
> headings for the same four numbers.
>
> "Canvas not available: graphics device lost; the graph, results and selection are still
> held." And a table below with the betweenness column. That is the right idea -- when the drawing
> dies, the numbers are still here. Why is there a table on this screen and none on the citation
> failure screen?
>
> The protein betweenness result is in a project called "Protein interactions", but the graph in
> its left panel is called "Co-appearances". That is the Les Miserables graph's name. Probably a
> copy-paste in the mockup, but I noticed.
>
> [The storyboard.] A blank white page. Nothing to see.

---

## Single Ease Question

**4 of 7.** "Knowing what failed and what survived is now easy -- a 6. The run numbers, 'wrote
nothing', the damping in the re-run's name, the named 5,318 set: all fixed. Getting something I
can use is still a 3. I never saw one PageRank value on the citation graph. The two failure
screens give Run 1 two different times and two different recovery buttons. And the sampled
betweenness, which finally names Brandes and gives an error bound, says directed and undirected
in the same panel."

## Would she use this instead of her current tool

> No, not for this. For centrality on 124,000 nodes I would use igraph or networkx in a notebook,
> where I pick directed or not in one argument, and the code is the record. And this is a citation
> graph, not an RDF graph -- nothing on these screens touches my data.
>
> What would move me: the run record. Method, seed, normalization, error bound, engine, time,
> with a Copy button. That is better than what I write in my own notebooks, honestly. If every
> finished run had that, if it agreed with the options above it, and if the failure screen showed
> me the values it says it is keeping, I would use this for a first look and check the top of the
> ranking in networkx. Today, the direction contradiction alone means I would check everything.

---

## Problems observed

1. **The finished sampled betweenness contradicts itself on direction (severity 4).** One panel
   says "Directed" in its header and options, and "Citations read as undirected" with an
   undirected normalization in its run record; the refused exact run says "the directed citations
   read as undirected", while the failure screen's sampled run says "Directed." She would not
   report the number: "one panel is telling me both."
2. **"Showing Run 1" with nothing shown (severity 3, repeated).** On both versions of the failure
   the record names whose PageRank values are on screen and shows none of them: no Top nodes, no
   range, no link to the table. The finished protein runs have all three. The re-run on the CPU
   (Run 3) is also never shown with values.
3. **Two versions of the same failure disagree (severity 3).** The run list puts Run 1 at 09:40
   and the failed run at 10:14; the Results panel puts Run 1 at 10:14 and Run 2 at 10:21. The
   graph is "Citations" on one and "Citations 1999 to 2001" on the other. One offers "Re-run on
   CPU" as the primary action; the other offers only "Try WebGPU again", so with WebGPU lost it
   gives no visible way to run damping 0.5 on the CPU.
4. **The two refusals offer different routes (severity 2).** The options screen lists "Sampled,
   500 sources, a few minutes" past the time limit; the failure screen's refusal does not, so she
   had to run 101, cancel and type 500.
5. **The damping field still shows the failed value (severity 2, softened).** The input reads 0.5
   while the values on screen are 0.85. The bold "Showing Run 1 (damping 0.85). Run 2 wrote
   nothing." line now sits right above it, which she said makes it much harder to misread.
6. **The same statistics under three headings (severity 1).** "Statistics" with "Nodes", "Graph"
   with lowercase "nodes", and "Overview" for the same counts, on screens of one product.
7. **A mismatched graph name in the notices page (severity 1).** The "Protein interactions"
   project lists its graph as "Co-appearances", the Les Miserables graph's name.
8. **The failure-and-recovery storyboard renders empty in the participant view (moderator
   note).** She saw a blank white page; nothing on it could be judged.

## What worked for her

- "Run 2 wrote nothing" -- the failed run left no partial values, and says so in those words.
- No silent CPU finish: "failed at 62%", with E_DEVICE_LOST in Details.
- Runs are numbered; the CPU re-run is Run 3 and carries its damping in its name.
- The 5,318-node route now names its set and says "This is a different graph."
- In-degree now states its engine and date.
- The run record on a finished sampled run: Brandes from 101 random sources, scaled up, seed,
  normalization, a 95-in-100 error bound, engine, time taken, and a Copy button.
- "The top of the ranking is usually stable; a single score can be well off" and tie bands
  ("#3-#7") that follow from the error bound.
- A visible, editable seed and a sample size that says what fits the time limit.
- Cancel leaves the row Not run, with nothing half-computed kept.
