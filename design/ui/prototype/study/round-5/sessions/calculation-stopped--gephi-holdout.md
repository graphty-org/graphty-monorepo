# Session: a calculation stopped partway -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, Gephi user since
0.8, NetworkX for anything she must reproduce. Simulated session, played at 1440x900.

**Task as given by the moderator:** "A long calculation on the citation graph stopped partway
through. Decide what you can still trust on the screen, and get a result you can use."

**Screens used:** the six states of "When the GPU is lost, and when a costly run is canceled"
(screens/gpu-lost-run, renders d1 to d6), the storyboard "Failure and recovery", the device-lost
state of screens/notices-errors, and a glance at screens/closeness-variant and
screens/selection-over-cap.

---

## Think-aloud transcript

### 1. The run in progress (gpu-lost-run, state 1)

> "Patent citations. 124,318 nodes, 1,480,221 edges, directed. I don't know this file, so I can't
> check the counts against memory -- I'll take them. And the canvas is empty. '124,318 nodes not
> drawn. Narrow the graph.' Fine. Honestly, at that size Gephi would be a hairball anyway, and at
> least it isn't pretending. But then where is my Data Lab? There's a 'Data' button on the left
> strip. Nothing on this screen shows me a single row."

> "PageRank is running, 62 percent, on 'full graph, 124,318 nodes', WebGPU. Good -- it says what
> it runs on. That is the first thing I check and it's the first line. Damping box says 0.5.
> Underneath: 'Showing the run before -- damping 0.85.' Hm. Showing it where? Nothing's drawn.
> I assume the PageRank column in the table still holds the 0.85 values. I'd want to open the
> table to be sure, and there's no table here."

> "Damping 0.5 is a strange choice, but it's the scenario's, not mine."

### 2. It stops (gpu-lost-run, state 2)

> "Failed. 'Could not run PageRank: WebGPU lost; new runs use the CPU.' Red bar, red 'Failed' in
> the results list. OK. That's honest. Gephi would have either hung or given me a column of
> half-written numbers with no warning. This is better than that, I'll say it."

> "Now the actual question: what can I trust. The box at the top still says 'Damping 0.5'. The line
> under it says 'Showing the run before, damping 0.85'. So the numbers on screen -- in the table,
> wherever they are -- are the old 0.85 run, complete, and nothing from the 62 percent run was
> written. That's what I'd assume, and I think that's what it's telling me. But look at the order
> on the page: the big editable box reads 0.5, and the thing that tells me what I'm actually
> looking at is a small grey line under it. If I'm tired, I read 0.5. A student would definitely
> read 0.5."

> "Details: 'Engine CPU; WebGPU lost. Run 2, failed at 62%. Code E_DEVICE_LOST.' 'Failed at 62%'
> worries me a little -- does that mean 62 percent of the nodes got new values? It doesn't say
> 'nothing from run 2 was kept'. I'm inferring it from 'showing the run before'. I'd want that one
> sentence: no values from this run were written."

> "And 'Run 2' -- run 2 of what? Of PageRank on this graph, I guess. Is there a list of runs? Can I
> get run 1's parameters back later? Not from this screen."

> "The engine line on the right says 'CPU; WebGPU lost'. Do I have to reload the page to get the
> GPU back? If I reload, do I lose my results? That's the browser question I always have. Nothing
> here answers it. The storyboard says the button goes back to plain 'Re-run' when WebGPU returns,
> but I'm not reading storyboards in real life."

> "'Re-run on CPU', tooltip 'Takes a few minutes on the CPU'. Fine, I'll press that. A few minutes
> is nothing. I'd get coffee."

Moderator probe (from the storyboard's own check): *Which damping produced the PageRank values
shown now?*

> "0.85. The line says so. But I had to look for it, and I only looked because I don't trust
> anything after a crash. The field says 0.5."

### 3. The notice version (notices-errors, device-lost)

> "Different dataset, same failure as a toast: 'Could not run PageRank', 'Show PageRank'. That's
> fine as a pointer. The toast doesn't say the old values are still there, but it sends me to the
> place that does."

### 4. Betweenness refused (gpu-lost-run, state 3)

> "PageRank now reads 'CPU'. Good, I'd write that in the methods. Though -- does it say damping
> anywhere on the row? No. Just 'CPU'. I'll trust that the re-run used 0.5 because that's what the
> box said. I would still want the parameter on the row, or in the column header, before I export
> it. Two PageRank columns with different damping and the same name is exactly the Gephi
> modularity_class mess I complain about."

> "Betweenness: 'Takes hours. The time limit is 30 seconds.' Thirty seconds? Who decided that?
> Where do I change it? This is my -Xmx in gephi.conf all over again, except now it's a clock. I
> run exact betweenness overnight on crawls all the time. At least it refuses before starting
> instead of dying at 62 percent, I'll give it that."

> "Options, cheapest first. 'Sampled, 101 sources, under a minute.' Why 101? That's an oddly
> precise number with no explanation. What sampling? Brandes and Pich pivots, uniform? Is it
> rescaled to the full-graph estimate the way NetworkX does with k? I need to know before I can
> compare it to anything."

> "'Exact, on 5,318 nodes, under a minute.' Which 5,318 nodes? It doesn't say. That's the exact
> trap I teach my students about -- a statistic on a subset, and the subset isn't named. If I pick
> that I have no idea what it ran on. I would not click it. (Moderator note: the annotation says it
> is a kept set, 'Drug patents granted in 2001'; the screen does not show that name.)"

> "'Past the time limit: Exact, on the full graph, hours.' Can I click that? It's listed like the
> others but under a heading that sounds like a no. I'd try clicking it. If it doesn't let me, I'm
> annoyed; if it does, then what's the time limit for?"

> "The blue button says 'Run sampled' and apparently Enter does it. I don't press Enter on things
> I haven't read. I'd click the sampled row to see its settings first. There aren't any shown
> here -- no sample size, no seed, until after I run it."

### 5. Sampled run, cancel, set it up again (states 4 to 6)

> "So in the story I pressed the default and it started with 101. I want 500 -- a bigger sample,
> and my own habit. Cancel on the black bar. The row goes to 'Not run'. Nothing kept. Good, that's
> clean: a canceled run doesn't leave half a column behind. That's the thing I was worried about in
> step 2, and here they spell it out, but in step 2 they didn't."

> "The failed exact 'Betweenness' row is still sitting there with a red x and 'hours'. It's not a
> result, it's a refusal. I don't want it in my results list. Can I delete it? Probably."

> "'Betweenness (sampled)' is its own row. I like that the name carries 'sampled'. When I export,
> the column had better be called that too, not plain 'betweenness'."

> "Editor: 'Not run, on: full graph, 124,318 nodes. Directed.' Sample size 500. 'About 101 fits
> the time limit; 500 takes a few minutes and runs in the background.' Seed 7. OK -- a seed! That's
> the first time a tool has shown me a seed without my asking. Reviewer two cannot complain about
> this one. But: same seed in NetworkX, betweenness_centrality(G, k=500, seed=7) -- will it pick the
> same 500 sources? Almost certainly not, different RNG. So 'seed 7' is reproducible inside this
> tool only. Say so, or give me the list of sources so I can feed them to NetworkX."

> "Also: 500 is past the time limit but it's allowed because it's 'in the background'. And exact
> on the full graph is refused. So the limit isn't really a limit, it's a default route. I can live
> with that if I know it."

> "Run. And... the screens end there. I never see the result. I never see the table, I never see
> what the values are normalized to, and I never see an export. So did I 'get a result I can use'?
> I set one up correctly. I didn't get it."

### 6. The other screens she was pointed to

**Closeness on a graph in pieces:**

> "Closeness, 'WF-corrected', tooltip: scaled by the share of the graph the node can reach,
> Wasserman-Faust. Yes. That's wf_improved in NetworkX, and it's the default there, so the numbers
> should match. Naming the formula in the result's name and the column header -- that's what I
> want from every statistic. The header even gives the range, 0 to 0.997. This is the screen I'd
> show a colleague. And the table says 'Filtered graph: 76 of 77 nodes' -- it tells me the subset.
> Why doesn't the betweenness refusal do that for its 5,318?"

**A selection past the cap:**

> "Not my task. Different graph. I note that Ctrl+Z undid the set creation instead of the selection
> -- I'd have pressed Ctrl+Z too, and I'd have been surprised. But nothing here is about a
> calculation that stopped."

---

## What she decided she could trust

- The PageRank values on screen after the failure are the complete damping-0.85 run: trusted,
  but only after hunting for the grey line under a field that reads 0.5, and on inference, since
  nothing says outright that the failed run wrote no values.
- In-degree: untouched by the failure, trusted.
- The re-run PageRank labelled CPU: trusted to be complete; not trusted to say which damping it
  used, because the row does not show the parameter.
- "Exact, on 5,318 nodes": not trusted, because the subset is not named.
- Sampled betweenness, 500 sources, seed 7: set up and started, the result never seen. Usable in a
  paper only if the method and normalization are stated and the sources can be exported.

## Single Ease Question

**4 out of 7.**

> "The failure part was easy -- it told me it failed, and it didn't pretend. Getting to a number I
> could publish was not. I got as far as pressing Run on something I can describe, and then the
> story stopped. Four."

## Would she use this instead of her current tool?

> "Not for this. For a graph this size I'd run betweenness in NetworkX overnight and not think
> about GPUs at all. What I'd take from here into my own head is the failure handling: a failed
> run that says it failed, keeps the old values and names whose they are, and a canceled run that
> leaves nothing behind. Gephi does none of that. But a thirty-second cap I didn't set, a subset
> with no name, and a seed I can't carry into NetworkX -- those keep me where I am. I'd stay on
> Gephi and NetworkX."

---

## Observed problems (moderator summary)

1. After the failure, the damping field reads 0.5 while the values shown are the 0.85 run; the
   line that says so is small grey text below the field. She found it only because she distrusts
   everything after a crash; she predicts a student would read 0.5.
2. The failed state never says that no values from the failed run were written; "failed at 62%"
   made her wonder whether 62% of the column was overwritten. The cancel state later says it
   plainly; the failure state does not.
3. "Exact, on 5,318 nodes" does not name the subset. This is the pattern she distrusts most
   (a statistic on an unnamed subset) and she refused the route for that reason.
4. The 30-second time limit appears with no way to see or change it on screen; she compared it to
   the memory setting in Gephi's config file.
5. "Sampled, 101 sources" shows no sample size, seed or method before running, and Enter runs it.
   She would not press Enter unread and wanted the settings visible in the refusal.
6. Sampled betweenness does not say its sampling method or normalization, and the seed is not
   portable to NetworkX; she asked for the source list to be exportable.
7. The re-run PageRank row shows the engine (CPU) but not the damping, so two PageRank runs with
   different parameters are indistinguishable by name.
8. No table, no finished result and no export appears in the path, so "get a result you can use"
   could not be completed: she configured a run but never saw its values.
9. Whether a reload is needed to recover the GPU, and whether results survive a reload, is not
   said anywhere on screen.
10. The refused exact "Betweenness" row stays in the results list with an error mark, which she
    read as clutter rather than a result.

## What she liked

- The failure is explicit and scoped: one failed row, the cause in plain words, no quiet CPU
  finish, and the old values kept.
- "Runs on: full graph, 124,318 nodes" leads every editor.
- A seed field, shown without asking.
- Cancel leaves nothing half-written; the row goes back to Not run.
- The closeness result names its formula (Wasserman-Faust) in the result name and the column
  header, and the table states the subset it describes.
