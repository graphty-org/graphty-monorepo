# Session: a long calculation stopped partway -- Dr. Min-ji Kim, knowledge graph engineer

Participant: Min-ji, knowledge engineer and ontologist for an enterprise knowledge graph at a
financial-services company. Works in SPARQL, GraphDB, Protege and Python notebooks (rdflib,
pandas). Company laptop with integrated graphics; WebGPU only on the newer machines. Polite
suspicion toward any graph viewer; two unexplained failures end her session.

Task as given by the moderator: "A long calculation on the citation graph stopped partway
through. Decide what you can still trust on the screen, and get a result you can use."

Screens seen, in order, as a participant sees them (design notes and expected reactions hidden):

- `shots/screens__gpu-lost-run-d1--study.png` -- PageRank re-running on WebGPU, damping 0.5
- `shots/screens__gpu-lost-run-d2--study.png` -- PageRank failed, editor open, Details expanded
- `shots/screens__gpu-lost-run-d3--study.png` -- Betweenness refused, routes listed
- `shots/screens__gpu-lost-run-d4--study.png` -- sampled betweenness running
- `shots/screens__gpu-lost-run-d5--study.png` -- sampled run canceled, row Not run
- `shots/screens__gpu-lost-run-d6--study.png` -- sampled editor, sample size 500, seed 7
- `shots/screens__notices-errors--device-lost.png`, `shots/notices-errors--device-lost-later.png`
  -- the same kind of failure on another project (fraud transfers)
- `shots/screens__notices-errors--cpu.png` -- a finished CPU result, for comparison
- `shots/screens__closeness-variant--study.png`, `shots/screens__selection-over-cap--study.png`
  -- skimmed at the end, not needed for the task

---

## 1. Before the failure: the run in progress

> Patent citations. 124,318 nodes, 1,480,221 edges, directed. Those are labelled nodes and
> edges, not "items" -- good, I can check those against a COUNT query. Components "not computed"
> -- fine, honest, better than a guess.
>
> The canvas is empty. "124,318 nodes not drawn." Good. That is the right behaviour -- Neo4j
> Browser would have tried to draw them and hung my tab. So everything I learn is going to come
> from the right-hand side.
>
> PageRank, 62 percent, WebGPU. The editor: damping 0.5 in the field, and "Showing the run
> before: damping 0.85". So there was an earlier run at 0.85 and someone changed it to 0.5. OK.
> Showing it *where*, though? Nothing is drawn and there is no table open. I will come back to
> that.

## 2. It stopped: what does the screen claim now?

> "Could not run PageRank: WebGPU lost; new runs use the CPU." Plain. The row says Failed with a
> red icon and the word -- I do not need colour for that, the word is there.
>
> Details: Engine "CPU; WebGPU lost", "Run 2 failed at 62%", Code E_DEVICE_LOST. I like that the
> raw code is there. That is what I would paste into a ticket. And "failed at 62%" tells me it
> did not quietly finish the other 38 percent somewhere else. That is the thing I actually
> worried about: a tool that loses the accelerator and silently hands me a half-converged vector
> as if it were the answer. It did not do that. Good.
>
> So what can I trust:
>
> - Nodes, edges, direction -- those are about the data, not the run. I trust them as much as I
>   trust the import, which I would check separately.
> - In-degree -- no marker on it, no engine chip either. I assume it is from before and it is
>   intact, but it does not say what engine or when. For a count that is exact whatever computes
>   it, I will let it go.
> - PageRank -- the values on screen, if there are any, are the damping 0.85 run. It says so
>   twice, in the editor. That I believe.
> - Nothing from the 0.5 run. It failed; nothing was kept. Fine.
>
> But I still cannot SEE the 0.85 values. The editor tells me whose values are showing and
> shows me none of them. No top nodes, no range, no table. On the protein screen [the finished
> CPU result] there was a "Top nodes" list and a Version line, "graphty-element 2.0.0" -- that is
> exactly what I want here. On this screen I would click Data in the left rail and hope a table
> comes up with a PageRank column. I would guess it does. I would also want that column header to
> say "damping 0.85", not just "PageRank", because the minute I export it the editor note is
> gone.
>
> [Moderator asks: which damping do the PageRank values on screen use?]
>
> 0.85. The editor says so. The field says 0.5, which is a little treacherous -- the input box
> shows the value that failed and the label beside it shows the value that is real. If I only
> glanced at the field I would say 0.5. I read the grey line; not everyone will.

## 3. The other failure screen, for comparison

> [Looks at the fraud project's device-lost notice.] "Could not run PageRank", "Show PageRank".
> No reason in the notice. Then later it is gone and there is a red dot on Results. That is a
> different layout from the citation screen: different left rail -- Results and Assistant icons
> here, Data there -- and "Graph / nodes / edges" in lowercase instead of "Statistics / Nodes".
> Is that the same product? If two screens of the same tool disagree about where results live, I
> start wondering which one is the real one. Minor, but I noticed.

## 4. Re-run on CPU

> The button says "Re-run on CPU". Tooltip: "Takes a few minutes on the CPU." That is an honest
> button. It names where it goes. I press it. On my laptop that is the only engine I would have
> most days anyway.
>
> [D3] PageRank now has a CPU chip. No Failed. I assume it ran with 0.5, because that is what was
> in the field. It does not say. The row just says CPU. I would open it to check the damping
> before I believe the new numbers -- one click, but I should not have to guess.

## 5. Betweenness refused

> Now Betweenness. Row: red X, "hours". Editor: "Takes hours. The time limit is 30 seconds.
> Engine: CPU; WebGPU lost." It refused before it started. That is the neo4j-browser lesson done
> properly -- tell me before the tab dies, not after. I respect that.
>
> Routes: "Fits the time limit: Sampled, 101 sources, under a minute. Exact, on 5,318 nodes,
> under a minute. Past the time limit: Exact, on the full graph, hours."
>
> Two questions immediately.
>
> First: which 5,318 nodes? There is nothing in Sets and paths. The left panel is empty under
> Sets. So where did 5,318 come from? Top 5,318 by something? A component? A kept set I cannot
> see? That is exactly the kind of number I do not accept without a name. If I ran exact
> betweenness on "5,318 nodes" and could not say which, I could not defend a single value in
> the output. I would not pick that route.
>
> Second: sampled how? 101 sources -- why 101, not 100? Uniform random source nodes? Brandes-Pich
> style, scaled up? Normalized or not? Which betweenness, on a directed graph -- directed paths,
> I assume, since the graph is directed. None of that is on this screen. "Sampled" is a method
> family, not a method.
>
> "Run sampled" is the blue button and the first row is focused. Enter would run it. I would not
> press Enter on a default I have not read, but I see why it is the default. It is the cheap one.
>
> [Moderator asks: what does each route cost, before you choose?]
>
> Under a minute, under a minute, hours. That part is clear. What it costs me in accuracy is not
> on the screen at all. A sample of 101 on 124 thousand nodes -- the top of the ranking is
> probably fine, the tail is noise. It should say that, or at least give me an error bound.

## 6. The sampled run, canceled

> [D4] It started at once, 18 percent, and the row reads "Betweenness (sampled)" -- a separate row
> from the refused "Betweenness". Good that the word "sampled" is in the name; I would not want a
> sampled estimate to wear the plain name. But now I have two betweenness rows, one of them a
> permanent red X saying "hours". Does the refused one stay forever? It is not a result, it is a
> refusal. I would want to be able to remove it, or have it collapse into the sampled one.
>
> I want more sources than 101, so I cancel from the notice at the bottom. [D5] Row: "Not run",
> Run button, and it is outlined, so I know where I am. Nothing half-computed left behind. That
> is right: a canceled estimate is not an estimate.

## 7. Setting it up properly

> [D6] Editor: "Not run, on: full graph, 124,318 nodes. Directed." Good -- scope and direction
> stated before I run. Sample size 500. "About 101 fits the time limit; 500 takes a few minutes and
> runs in the background." Seed 7.
>
> Seed. Thank you. That is the first thing on this whole path I would call professional. A
> sampled number without a seed is not reproducible, and I cannot put a non-reproducible number
> in a governance report. With a seed and a sample size I can rerun it next week and get the
> same thing, or rerun it in NetworkX with the same sources and compare.
>
> Although -- same sources only if the sampling procedure is documented. Seed 7 into what? If I
> cannot reproduce it outside graphty, the seed only helps inside graphty.
>
> I press Run. I would expect the finished row to read "Betweenness (sampled)" with the sample
> size and seed somewhere on it, and the values to carry some mark that they are estimates. I did
> not get to see the finished state, so I cannot say it does.

## 8. Skimmed at the end

> [Closeness screen] "Closeness WF-corrected", tooltip says Wasserman-Faust, 7 components. I know
> that correction. That is how I want every variant named -- the formula in the column header.
> Whoever did that should do the same for "sampled": name the estimator.
>
> [Selection screen] Ctrl+Z deletes a set because selecting is not undoable. That would bite me,
> but it is not my task.

---

## Did she complete the task?

Mostly. She said correctly which PageRank values were on screen (the damping 0.85 run) and that
nothing from the failed 0.5 run survived, and she set up a sampled betweenness with a sample size
and seed she chose. She could not see the 0.85 values anywhere on the failure screen, did not
confirm what damping the CPU re-run used, rejected the "Exact, on 5,318 nodes" route because the
screen does not say which nodes, and never saw a finished sampled result with estimate marks.

## Single Ease Question

**4 of 7.** "Knowing what failed was easy -- 6, even. Knowing what I could use was hard. The
screen told me whose values were showing and never showed them, and it offered me a 5,318-node
subset with no name."

## Would she use this instead of her current tool?

> No, not for this. For centrality on a graph this size I would run igraph or NetworkX in a
> notebook, where I choose the estimator, see the code, and the numbers go straight into a
> dataframe with the parameters beside them. And this is a citation graph, not my graph -- nothing
> on these screens touches RDF.
>
> But I will say this: the failure handling is more honest than anything I have used in a
> browser. It did not finish on the CPU behind my back, it refused the hours-long run before it
> started, it gave me the raw error code, and it asked for a seed. Neo4j Browser does none of
> that. If it named the sampling method, put the parameters in the column header, and never
> showed me a count without saying what it counts, I would trust its numbers enough to check
> them. That is further than most tools get.

## Findings (moderator)

1. **"Showing the run before" with nothing shown (severity 3).** Past the drawing limit, the
   failed PageRank editor names which run's values are on screen, but no values are visible: no
   top nodes, no range, no table. She had to guess the Data rail holds them. The finished CPU
   result on the protein screen shows "Top nodes" and a Version line; the failed and running
   states do not.
2. **Unnamed 5,318-node scope in the refusal (severity 3).** "Exact, on 5,318 nodes" appears
   while Sets and paths is empty; the screen never says which nodes. She refused the route:
   "a count without a name I cannot defend."
3. **The damping field shows the failed value (severity 2).** The input reads 0.5 while the
   values on screen are 0.85; only the grey line beside it says so. She read it correctly and
   predicted a glance would not.
4. **Re-run result does not state its parameters (severity 2).** After Re-run on CPU the
   PageRank row shows only "CPU"; she could not tell whether it used 0.5 without opening it.
5. **"Sampled" is not a method (severity 2).** No estimator named, no reason for 101, no
   accuracy statement; "under a minute / hours" gives time cost but not accuracy cost. She
   contrasted it with "WF-corrected (Wasserman-Faust)", which she praised.
6. **The refused row lingers (severity 1).** The red "hours" Betweenness row stays beside
   Betweenness (sampled); she read it as a refusal, not a result, and wanted it removable.
7. **Two shells for one failure (severity 1).** The citation screens and the fraud-project
   device-lost screens differ in the left rail (Data versus Results and Assistant) and in the
   statistics heading, which made her ask which one is the product.

Delights: no silent CPU finish ("failed at 62%"); the raw error code in Details; refusal before
an hours-long run; "(sampled)" in the result's name; scope and direction stated before running;
a visible, editable seed; Cancel leaves nothing behind.
