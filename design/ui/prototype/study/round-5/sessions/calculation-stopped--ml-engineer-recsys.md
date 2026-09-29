# Session: a calculation that stopped partway -- Chris, ML engineer (recommendation systems)

**Task, as the moderator gave it:** "A long calculation on the citation graph stopped partway
through. Decide what you can still trust on the screen, and get a result you can use."

**Participant:** Chris, senior ML engineer on a retail recommendations team (persona:
`study/personas/ml-engineer-recsys.md`). 1440 x 900 laptop screen; looked at the dark render
first, then the light ones.

**Screens used, in order:** the GPU-lost run (`screens/gpu-lost-run.html`, states D1 to D6,
renders `shots/screens__gpu-lost-run-d1--study.png` to `-d6--study.png` and
`shots/screens__gpu-lost-run--dark.png`); the WebGPU-lost states of notices and errors
(`screens/notices-errors.html`, states 4 and 4b); a glance at the closeness variant
(`screens/closeness-variant.html`, state B2) and the selection past the cap
(`screens/selection-over-cap.html`). The failure-and-recovery storyboard was shown with the
expected reactions hidden.

## Transcript (think-aloud)

**D1, before anything breaks.** Patent citations, empty canvas, "124,318 nodes not drawn".
An editor card over the canvas: PageRank, "Running, 62%, on: full graph, 124,318 nodes.
WebGPU." Damping field says 0.5. Under it: "Showing the run before -- damping 0.85".

> OK, so I bumped damping to 0.5 and it's re-running. Full graph, 124k nodes, WebGPU. The
> denominator is right there, good. "Showing the run before, damping 0.85" -- so whatever
> PageRank numbers exist right now are from 0.85, not from what's in the box. That's a line
> most tools don't bother with. Jupyter certainly doesn't; the old cell output just sits there
> looking current.

> "62%" of what, though? PageRank doesn't have a percentage, it has a residual. 62% of the
> max iterations? 62% of the way to tolerance? I'd rather see "iteration 31, residual 2e-5".
> Minor. It's moving.

> Where are the numbers it's "showing"? The canvas is empty on purpose, fine. Statistics on the
> right, Results list with In-degree and PageRank. No table. So the values are "shown"
> somewhere I can't see. I'd guess the Data button on the left opens a table. I'll come back
> to that.

**D2, the stop.** Row: PageRank, "Failed" in red. Editor: red bar, "Could not run PageRank:
WebGPU lost; new runs use the CPU". Still "Showing the run before -- damping 0.85". Details
open: Engine "CPU; WebGPU lost", "Run 2 -- failed at 62%", Code "E_DEVICE_LOST". Blue button
in the header "Re-run on CPU"; hovering it: "Takes a few minutes on the CPU". The Statistics
Engine row now also says "CPU; WebGPU lost".

> Right. Driver reset, device lost. It failed at 62% and -- this is the thing I actually care
> about -- it did NOT quietly finish the other 38% on the CPU and hand me a Frankenstein vector.
> It says failed. And the 0.5 partial iterate is thrown away, the screen still holds the 0.85
> run and says so. That's the correct behaviour. I'd have assumed the worst otherwise.

> So what can I trust? Let me go down the list.
> - PageRank values on screen: the damping-0.85 run. Complete, from an earlier run, labelled.
>   Trustworthy AS 0.85. Not what I asked for.
> - In-degree: no mark on it, nothing said. It's a count, it didn't depend on the GPU. I'm
>   going to trust it, but that's me reasoning, not the screen telling me. There's no
>   "unaffected" or engine or timestamp on that row. If In-degree had also been a GPU result
>   from ten minutes ago, would this row look any different? I don't think so.
> - Statistics: node and edge counts are just the data. Fine. "Components: not computed" --
>   honest, I'll take that over a guess.

> "Run 2" -- run 2 of PageRank I assume. Where's run 1's info? I want to know when the 0.85 run
> happened and what engine did it. The row doesn't say. "damping 0.85" is one parameter;
> tolerance, max iter, personalization? If it's showing me an old run I want its full receipt,
> not one parameter.

> "E_DEVICE_LOST" as the last line of Details, fine, that's what I'd paste into a bug report.

> "Takes a few minutes on the CPU." A few is two or nine? On a 1.5M-edge graph PageRank on the
> CPU in numpy is seconds, honestly. Scipy sparse, forty iterations, done. If this thinks it's
> minutes I want to know why, and I want a number. I only saw that because I hovered. On a
> laptop trackpad I might have just clicked.

> And how do I get the GPU back? Nothing says. The storyboard caption says the button goes back
> to plain "Re-run" when WebGPU comes back -- comes back how? Do I reload the tab? Is there a
> "try again" for the device? A driver reset on a Mac usually recovers in a second; I'd rather
> retry on the GPU than eat "a few minutes" on the CPU. There's no way to ask for that here.
> Everything is just CPU now, forever, apparently.

**Pressing Re-run on CPU.** (Between D2 and D3; the mock skips the run itself.)

> Fine, press it. I want the 0.5 numbers, the 0.85 ones answer a different question.

**D3, asking for betweenness.** PageRank row now reads just "PageRank -- CPU". A new row,
"Betweenness", red x, "hours". Editor: "Takes hours. The time limit is 30 seconds. Engine:
CPU; WebGPU lost." Then "Fits the time limit": "Sampled, 101 sources -- under a minute"
(focused), "Exact, on 5,318 nodes -- under a minute". "Past the time limit": "Exact, on the
full graph -- hours". Button: "Run sampled".

> Wait, first -- PageRank finished? It says "CPU". That's all it says. Which damping? I assume
> 0.5 because that was in the box. How long did it take -- was it the "few minutes"? No timing,
> no "done at 14:02", no damping on the row. The failure got a paragraph; the success gets one
> word. I'd need to open the editor to confirm, and I'm annoyed I have to. That's the result I
> actually wanted out of this task.

> OK, betweenness. Refused before it starts, with the reason. Good. That's what I want from a
> tool on a 124k graph: tell me no before my laptop fans spin for an hour.

> But the row has a red error x on it. Nothing failed. It was refused, it never ran. Red x plus
> "hours" reads like "failed after hours". If I close this editor and come back, I'll see a red
> x next to Betweenness and think something broke.

> "Sampled, 101 sources." Why 101? I get that it's "whatever fits 30 seconds", but say that.
> And sampled how -- uniform over nodes? For a citation graph with massive hubs, uniform source
> sampling has ugly variance on the top ranks. I'd want to know the scheme and ideally some
> error bar, or at least "top-k stable across seeds?".

> "Exact, on 5,318 nodes." Which 5,318? There's no set in "Sets and paths", the filter says
> "Full graph". Magic number. Largest strongly connected component? Some sample? I won't click
> something that silently changes my scope. Skipping it.

> Where's "sampled, 500"? My baseline for this kind of thing is 500 sources. It only gives me
> the one size. And where does the 30-second limit come from? Can I say "I'm fine waiting ten
> minutes, run it in the background"? Not from here.

**D4, running the default and killing it.** Pressed Enter. Row "Betweenness (sampled) --
CPU", 18%, Cancel. Dark notice over the canvas: "Running Betweenness (sampled)", Cancel.

> It ran 101 because Enter took the default. I don't want 101, I want 500, and the only way to
> change it is kill this and go into the editor. Cancel on the notice.

> Also, the list is getting junky: "Betweenness" with its red x, AND "Betweenness (sampled)".
> Two rows for one question. The refused one should either go away or become the sampled one.

**D5, canceled.** Notice gone. Row "Betweenness (sampled) -- Not run", Run button, blue focus
ring round the row.

> Canceled, nothing kept. For a sampled run that's fine -- a partial Brandes over 18% of 101
> sources is junk anyway. Row's focused, I can hit Enter. Good, I didn't have to hunt with the
> mouse.

**D6, setting the sample.** Editor "Betweenness (sampled)": "Not run, on: full graph, 124,318
nodes. Directed." Sample size 500. Under it: "About 101 fits the time limit; 500 takes a few
minutes and runs in the background." Seed: 7. Run.

> Seed. There's a seed field. OK, that I respect. Same seed, same sources, same numbers --
> that's the difference between an estimate and a random number. "Directed" is stated too.
> Good.

> "500 takes a few minutes and runs in the background" -- again "a few minutes". Same phrase as
> the PageRank one. Is anything here ever a number? A tool that estimates hours
> but won't tell me whether a few is 3 or 8.

> Run. And... that's where it ends. I never see the finished result. I can't tell you whether
> the scores say "estimate", whether there's a CI, whether I can sort them or pull them out.
> The storyboard text says the row keeps "(sampled)" in its name and the scores carry estimate
> marks. I'll believe that when I see a table.

**Looking for how to get the numbers out.** Back through D1 to D6.

> There's no Export on any of these screens. The notices-and-errors page has an "Export..."
> button top right; this one doesn't. The Les Mis closeness screen has a table at the bottom
> with a column header and a range, "0 to 0.997" -- nice -- but my citation graph has no table
> in any of the six frames. "Nodes not drawn" is right, but then the table IS the product and
> I never see it. For me a usable result means a CSV or Parquet of patent_id, pagerank_0.5,
> betweenness_sampled_500, with the seed recorded somewhere. I can't find the door to that.

**The other WebGPU-lost screen (notices and errors, 4 and 4b).** Dark strip: "Could not run
PageRank", "Show PageRank". Ten seconds later, gone; a red dot on the Results button in the
left rail.

> Oh, this is the version where I wasn't looking at the result. Notice with a jump button,
> then a red dot that waits for me. That's fine. But this layout has a "Results" button in the
> left rail and the patent one doesn't -- Graph, Data, Notes. Which is it? If I'm on the patent
> project with the editor closed, where does the red dot go?

**Glance at closeness (B2) and the selection cap.**

> "Closeness (WF-corrected)", "Scaled for 7 components", offers Harmonic. Wasserman-Faust,
> I think; I had to guess. The formula's in the name, which is what I'd want for the betweenness
> too: "Betweenness (sampled, 500, seed 7)". Selection cap: "Selected: 14 nodes", "false, as
> density 2,986" -- counts everywhere, fine, not my problem today.

## Answering the task

> What I trust: the node and edge counts; In-degree, because I know it doesn't need a GPU,
> not because the screen said so; the PageRank on screen after the failure, but only as the
> damping-0.85 run, which the editor says clearly. What I don't trust until I open things:
> which damping the CPU re-run used, because the row just says "CPU". What I would not touch:
> "Exact on 5,318 nodes", because I don't know what those nodes are.

> A usable result: I'd have PageRank at 0.5 from the CPU re-run and a sampled betweenness at
> 500 sources, seed 7, running in the background. I never saw either finished, and I can't see
> how to export them. So: got to the point of launching the right run. Didn't get something I
> could paste into a notebook.

## Single Ease Question

**5 out of 7.**

> The failure part was easy and honest -- I knew in two seconds that it died, why, and that the
> numbers on screen were the old run. That's better than most things I use. It lost points for
> "a few minutes" twice with no number, the red x on a run that never failed, the magic 5,318,
> having to cancel a run just to change the sample size, the one-word "CPU" on the result I
> actually wanted, and no table or export in sight.

## Would you use this instead of your current tool?

> No. For this job my current tool is NetworKit or networkx in a notebook: `pagerank(alpha=0.5)`
> and `betweenness_centrality(G, k=500, seed=7)`, on a remote box with more cores than my
> laptop, and the output is a dataframe I already know how to write to Parquet. Nothing here
> beats that for batch numbers. What I'd genuinely steal from this is the behaviour: refusing
> the hours-long run before it starts with the cheap options listed, never mixing a GPU half
> and a CPU half into one vector, and labelling old values as old. If it showed real timings,
> kept the run's parameters on the row, and gave me the table with an export, I'd use it for
> the first look before I go write the notebook. Not instead of it.

## Observations for the designers (moderator's notes, from the transcript)

1. **The success is quieter than the failure.** After Re-run on CPU, the PageRank row reads
   only "CPU": no damping, no timing, no finish time. The participant could not tell from the
   row which run's values were now on screen, the question the task was about.
2. **"A few minutes" with no number, twice.** On the Re-run on CPU tooltip (hover only) and
   under Sample size. The participant wanted an estimate in minutes, and questioned whether
   CPU PageRank on 1.5M edges should take minutes at all.
3. **The refused row uses the failure mark.** Betweenness shows a red error icon and "hours"
   though it never ran; read as "failed after hours".
4. **"Exact, on 5,318 nodes" is unexplained.** No set, filter or tooltip says which nodes;
   the participant would not pick it.
5. **The refusal offers one sample size.** To get 500 sources the participant had to run the
   default, cancel it, and edit. He asked for the sample size (and the time limit) at the
   refusal itself.
6. **Unaffected results say nothing.** In-degree carried no engine, time or "not affected"
   mark; trusting it was the participant's own reasoning.
7. **No way back to the GPU.** Nothing says how WebGPU "comes back" or lets the participant
   retry the device instead of accepting the CPU.
8. **No table and no export on the large-graph screens.** The task's "result you can use"
   meant a file with patent ids; he found no route to one, and the sequence ends before any
   finished values are shown.
9. **Two rows for one question** (refused Betweenness and Betweenness (sampled)) after the
   sampled run starts.
10. **Rail differs between the two WebGPU-lost screens** (a Results button with a red dot in
    one, none in the other), so he could not say where a missed failure would wait for him.
11. **Worked well:** failed-not-finished-on-CPU, "Showing the run before: damping 0.85", the
    code at the end of Details, refusal before a costly run with the cheap route as default,
    focus returning to the row after Cancel, the Seed field, "Directed" and the full-graph
    denominator stated in the editor.
