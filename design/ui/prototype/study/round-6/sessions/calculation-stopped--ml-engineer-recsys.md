# Session: a long calculation stopped partway -- Chris, ML engineer, recommendations

- Participant: Chris, senior ML engineer on a retail recommendations team (persona:
  study/personas/ml-engineer-recsys.md). Lives in notebooks; judges every tool against "15 lines
  of networkx". Reads numbers and error messages, skips paragraphs.
- Task, as given: "A long calculation on the citation graph stopped partway through. Decide what
  you can still trust on the screen, and get a result you can use."
- Screens seen (participant view, 1440 x 900): the WebGPU-lost run sequence (seven states), the
  Results panel (failed, failed and opened, finished sampled, the table, the CPU path), the notices
  page (the device-lost notice and the moment after it clears), and the run editor with its cost
  line (sample size past the time limit).
- Renders: shots/record/r6-chris-stop-gpu-lost-run.png, shots/record/r6-chris-stop-results-panel.png,
  shots/record/r6-chris-stop-notices-errors.png, shots/record/r6-chris-stop-option-form-cost.png, plus the
  per-state participant shots of those pages in shots/.

## Think-aloud

### 1. The run in progress

> OK, patent citations, 124k nodes, 1.48M edges, directed. Nothing is drawn -- "124,318 nodes not
> drawn". Good, honestly. I don't want the hairball.
>
> PageRank, damping 0.5, running, 62%, WebGPU. And under the damping field: "Showing Run 1 (damping
> 0.85) until this run finishes." That's the line I care about. So whatever is in the table right
> now is the 0.85 run. Fine. That's the equivalent of my notebook still holding the old dataframe
> until the new cell finishes.
>
> 62% of what, though? Iterations? Nodes? PageRank on a GPU is power iteration; "62%" of a
> convergence loop is a made-up number unless it's iterations out of a max. I'll let it go.

### 2. It stops

> "Could not run PageRank: WebGPU lost; new runs use the CPU." Then "Showing Run 1 (damping 0.85).
> Run 2 wrote nothing." That's exactly the answer to the first half of the task. What can I trust:
> the 0.85 numbers, all of them, and nothing from the 0.5 run. No half-written vector. Good -- the
> worst thing a tool can do is give me 62% of new values glued to 38% of old ones and not say so.
>
> Details: Engine "CPU; WebGPU lost", Run 2 "failed at 62%", code E_DEVICE_LOST. I like that the
> code is there. I'd paste that in a bug report.
>
> Two buttons. "Re-run on CPU" -- tooltip "Takes a few minutes on the CPU". A few minutes? For
> PageRank on 1.5M edges? scipy does that in a couple of seconds on my laptop. Either this CPU path
> is really slow or the estimate is padded. Give me a number. Same complaint as last time.
>
> "Try WebGPU again" -- hover says "Asks the browser for the GPU again. If it answers, the next run
> uses WebGPU; nothing is re-run by itself." OK, clear: it's a reconnect, not a re-run. I'd click
> that first, actually -- if the GPU comes back I don't have to wait "a few minutes".

### 3. Back to the list

> I go back to Results. The failed row keeps the same line, "Showing Run 1 (damping 0.85). Run 2
> wrote nothing.", with both buttons. Under it, "PageRank, damping 0.85, today, 09:40. Run 1. Full
> graph. WebGPU." and "In-degree, 27 Sep, Full graph, CPU". In-degree didn't touch the GPU, so it's
> fine; nobody told me that, I just know in-degree is counting.
>
> Where would I have found out if I'd been in another panel? On the notices page the toast says
> "Could not run PageRank" with "Show PageRank". Then after it clears the page text says the Results
> button "carries a mark". I zoomed in on the rail. There's no mark. Just the flask and "Results".
> So if I'm in the Graph panel and I miss the toast, I'd find out... when I look at the numbers and
> something's off. That's how I find out about failed Airflow tasks too, and I hate it.

### 4. The failed run, opened from the other screen -- and the story changes

> Now I open the failed run from the Results panel page, and this one's different. The title is
> "PageRank, damping 0.85, Sep 28 10:14". Wait -- the run that failed was 0.5. On the other screen
> the title was "PageRank, damping 0.5" and Run 1 was at 09:40. Here Run 1 is at 10:14 and Run 2
> is at 10:21. I guess the title is the run that's shown? Then the header describes the survivor,
> not what I asked for. Could go either way, but the two screens disagree about what that header
> means.
>
> The red box is fine: "Run 2 could not finish: WebGPU was lost. Showing Run 1 (damping 0.85). Run
> 2 wrote nothing." Runs list: Run 2 "wrote nothing" in red, Run 1 "shown". That list is good. That's
> the MLflow runs table in miniature.
>
> But then: "Try WebGPU again runs damping 0.5, under a minute." So here Try WebGPU again DOES
> re-run. On the other screen the tooltip said it re-runs nothing by itself. Which one is it? And
> there's no "Re-run on CPU" on this version at all. If I'm the person whose GPU driver just died,
> I don't want a button whose meaning depends on which panel I clicked it from. I'd click it, wait,
> and not know if I'm waiting for a reconnect or for a PageRank.
>
> Also "Direction: Along edges" here and "Directed" everywhere else. Probably the same thing. Pick
> one word.

### 5. Getting a usable PageRank

> I pick Re-run on CPU, because it says what it'll do. The list later shows "PageRank, damping 0.5,
> today, 10:22. Run 3. Full graph. CPU." Good -- "Run 3" tells me it's a new run and not the dead
> Run 2. But how long did it take? Did it converge? Tolerance? The row gives me the run number and
> the engine and nothing else. The sampled betweenness record I saw later has "Took 29.9 s". Put
> that on every run. Show me the timing, not the badge.

### 6. Betweenness gets refused

> Next I ask for betweenness. "Not run: would take hours. The time limit is 30 seconds. Engine:
> CPU; WebGPU lost." It refused before starting. Thank you. Every other tool I've used would have
> started it and frozen the tab.
>
> Options: "Sampled, 101 sources -- under a minute", "Exact, on the 5,318 nodes in Drug patents
> granted in 2001 -- under a minute. This is a different graph.", then "Past the time limit: Exact,
> on the full graph -- hours". The "different graph" line is honest; last time I didn't know what
> that 5,318 was. I still wouldn't pick it for this task, but now I know why not.
>
> The refused row in the list is plain "Not run: would take hours" -- no red failure icon anymore.
> Good.
>
> 101 sources. I'd want 500 -- that's the k I use in networkx, and 101 is a weird number; I assume
> it's what fits 30 s. There's no field for the sample size here, so I press Run sampled, it starts,
> I cancel it from the toast, and then edit. That's three steps to type one number. It is at least
> clean: after Cancel the row says "Not run" with Run, and it's highlighted, so I didn't lose my
> place.
>
> In the editor: Sample size 500, "About 101 fits the time limit; 500 takes a few minutes and runs
> in the background." Seed 7 -- I can set a seed, great, that's reproducible. In the floating
> editor version there's "of 124,318" beside the field and "101 is the largest that fits." That's
> the number I wanted at the refusal. But "a few minutes" again. If 101 is 30 s, 500 is about 2.5
> minutes; just say "about 3 minutes".
>
> Floating editor also says "Edit held." and "Edit waits for Run". No idea what "held" means. I
> guess the change isn't applied until I press Run. Say that.

### 7. The sampled result -- and the denominator doesn't add up

> The finished sampled record: "Betweenness (sampled), 101 sources", top nodes with "~" values,
> "Ranks below #2 may swap between runs." Tooltip: "within +/- 0.00035 of the exact value in 95
> runs out of 100." That's a real error bar. I'd actually trust #1 and #2 and nothing past that as
> an ordering, which is what it tells me. Distribution: "zero ~79,554 nodes" -- 64% of patents with
> zero betweenness, plausible for a citation DAG.
>
> Then I open Details. Method: "Brandes betweenness from 101 random sources, scaled up by 124,318 /
> 101". Normalization: "Divided by (n-1)(n-2)/2, the node pairs of an undirected graph". Direction:
> "Citations read as undirected". But the summary line two inches to the left says "Directed", and
> Options says "Direction: Directed". So which is it? For betweenness on a citation graph that's not
> a rounding issue -- directed and undirected give different paths and a different denominator by a
> factor of two. This is precisely the thing I check first, and the tool contradicts itself on it.
> I would not ship these numbers until I knew which one ran.
>
> Engine on that record says WebGPU, took 29.9 s -- that's a different story from the GPU-lost one,
> where the sampled run is on CPU. OK, mocks. But I'd want the CPU version to show its timing the
> same way.
>
> Column header on the top-nodes table: "rank, low-high patent". Took me a second: rank column,
> then "patent" is the id column. Reads like a typo.

### 8. A result I can use

> "124,313 more in the table" -- opens the Nodes tab sorted by betweenness (sampled). On the protein
> screen the table has "Export table..." at the top right, and the columns say "exact, full graph"
> under each score. So I assume on the patent graph I'd get the same: a table with patent ids and
> the score, and Export. I didn't see it on the patent graph itself, and nothing says CSV or
> Parquet or whether my original ids come out. If the file has the real patent numbers and a
> column header that says "sampled, 101 sources, seed 7", I'd use it. If it's a JSON blob I'm
> writing a conversion script and then I'm back in the notebook.

## Answers

**What can you trust?** The damping 0.85 PageRank (Run 1): the failure wrote nothing, and the
screen says so on the run and on its row. In-degree, because it never used the GPU (my reasoning,
not the screen's). After Re-run on CPU, Run 3 is the 0.5 result. The sampled betweenness ranks #1
and #2, within the stated error bar -- IF it's actually the directed version, which the screen
contradicts itself about.

**Single Ease Question: 4 / 7.** The "what's on screen" half is easy -- probably the best failure
message I've seen in a graph tool. Getting a usable result is where it slips: Try WebGPU again does
two different things depending on the screen, the sampled run can't say whether it was directed,
the sample size needs run-cancel-edit, "a few minutes" instead of a number, and I never actually
saw the export on this graph.

**Would you use this instead of your current tool?** No, not for this job. For batch centrality on
a 1.5M-edge graph, `nx.pagerank` or NetworKit on a remote box gives me a dataframe in seconds and I
know exactly which direction it used because I passed it. What I'd take from here is the
behaviour: the refusal before an hours-long run with the cheap options listed, never splicing a
GPU half onto a CPU half, "Run 2 wrote nothing", the seed field, and an actual error bar on the
sampled scores. If direction and timing were stated once and consistently on every run, and the
table exported with my ids, I'd use it for the first look before writing the notebook.

## Observations for the designers (moderator's notes, from the transcript)

1. **Try WebGPU again means two things.** On the run sequence its tooltip says it re-runs nothing;
   on the Results panel's failed record the line under it says it "runs damping 0.5, under a
   minute", and Re-run on CPU is missing there. The participant could not say what he was waiting
   for after pressing it.
2. **Directed or undirected, on the same record.** The sampled betweenness summary and Options say
   Directed; its Details say "Citations read as undirected" and normalize by the undirected pair
   count. The participant said he would not use the numbers until he knew which ran -- the direction
   and the denominator are the first things he checks.
3. **The unseen-failure mark on the Results rail is not visible.** The notices page says the
   Results button carries a mark after the notice clears; in the participant view the button has
   none (same gap as last round).
4. **The failed record's title differs between screens.** One names the failed run (damping 0.5),
   the other the surviving run (damping 0.85), with different Run 1 times. The participant could not
   tell what the header was meant to name.
5. **Finished CPU runs carry no timing.** "Run 3. Full graph. CPU." -- no duration, no convergence.
   The sampled record's "Took 29.9 s" was the kind of line he wanted on every run.
6. **"A few minutes" where a number exists.** The Re-run on CPU tooltip and the 500-source cost
   line both say "a few minutes"; the participant did the arithmetic himself from "101 fits 30 s"
   and questioned whether CPU PageRank on 1.5M edges should take minutes at all.
7. **The refusal still offers only 101 sources.** Getting 500 took Run, Cancel, open, edit. The
   floating editor's "101 is the largest that fits" and "of 124,318" were what he wanted at the
   refusal itself.
8. **"Edit held" / "Edit waits for Run"** in the floating editor read as jargon.
9. **Export on the large graph is inferred, not shown.** "124,313 more in the table" promises the
   table; Export table appears only on the 300-node example, with no format or id guarantee visible.
10. **Small wording:** "Direction: Along edges" beside "Directed" elsewhere; the top-nodes header
    "rank, low-high patent" read as a typo; "62%" of a PageRank run has no unit.
11. **Worked well:** "Showing Run 1 (damping 0.85). Run 2 wrote nothing." on both the record and
    the row; the error code in Details; refusal before the costly run with the cheap route first;
    "This is a different graph." on the subset route; the refused row without a failure mark; "Run
    3" naming the new run; the seed field; the stated error bound and "Ranks below #2 may swap".
