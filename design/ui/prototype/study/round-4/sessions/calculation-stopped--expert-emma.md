# Session: a long calculation stopped partway -- Expert Emma

Participant: Emma, network scientist (physics PhD, faculty plus consulting). Lives in Jupyter with
networkx and igraph; uses Gephi for the final figure. Her two questions of any tool: where does my
data go, and are the numbers honest.

Task as given by the moderator: "A long calculation on the citation graph stopped partway through.
Decide what you can still trust on the screen, and get a result you can use."

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/record/screens__gpu-lost-run--study.png` -- the patent citation graph (124,318 patents,
  1,480,221 citations, nothing drawn): PageRank re-running at damping 0.5; the run failing; a
  Betweenness request refused; a sampled run started, canceled and set up again
- `shots/storyboards__failure-and-recovery.png`, branch D only -- the same story as a sequence of
  crops (read with the "expected reaction" lines ignored)
- `shots/record/screens__notices-errors--study.png`, states 4, 4b and 6 -- the failure notice on a
  3,000-account transfer graph, the same screen ten seconds later, and the "Canvas not available"
  card
- `shots/record/screens__closeness-variant--study.png` and `shots/record/screens__selection-over-cap--study.png`
  -- glanced at, not part of this task

---

## 1. The run while it is running

> Patent citations, 124,318 nodes, 1.48 million edges, directed. Components "not computed" --
> fine, at least it says so instead of guessing. Engine: WebGPU. "124,318 nodes not drawn. Narrow
> the graph..." Good. I do not want a hairball of 120k patents anyway.
>
> Left rail: "Assistant. Off. Nothing is sent." I noticed that before anything else. Good.
>
> So I had PageRank at 0.85 and I am re-running at 0.5. The editor says "Running, 62%, on: full
> graph, 124,318 nodes. WebGPU." And "Showing the run before: damping 0.85." OK. That line is
> exactly what I would ask. The old values stay until the new ones land, and it tells me whose
> they are. I like that more than I expected to.
>
> 62% of what, though? Iterations against a max? Converged residual? PageRank does not have a
> natural percent. If it is iterations out of a cap, show me the cap and the tolerance. I will let
> it cook.

## 2. It stops: what can I trust?

> Failed. Red X on the PageRank row. Editor: "Could not run PageRank: WebGPU lost; new runs use the
> CPU." Details: "Engine CPU; WebGPU lost. Run 2 failed at 62%. Code E_DEVICE_LOST."
>
> Right, first thing: it did NOT finish on the CPU behind my back. It failed and said so, with a
> code I could search. That is the correct behaviour. I have seen tools switch backends silently
> and I only found out because the timing was wrong.
>
> Second thing: whose numbers are on screen. The editor still says "Showing the run before: damping
> 0.85". The damping field says 0.5. So... the field is what I asked for, and the values are from
> the old run. I think. I read that twice. If I were tired, I would read 0.5 off the field and
> assume the column is the 0.5 run.
>
> And the row in the inspector says only "Failed". If I close the editor, the row says Failed and
> nothing else. Does that mean the PageRank column is gone? Still 0.85? Or -- the one that
> actually worries me -- partial values from 62% of an unconverged 0.5 run? The editor says 0.85,
> but the row is where I'd look later, and the row does not say it holds anything. A failed run
> that still holds a good previous result should say that on the row: "Failed; showing damping
> 0.85" or similar. Right now the row reads like "nothing here".
>
> And where ARE the values? Nothing is drawn, fine, but I see no table on this screen and the
> result row has no top nodes. I would go to "Data" on the left rail and hope there is a table with
> a pagerank column. I cannot tell from here whether it would be labelled with its damping. If
> the column just says "pagerank" I have no way to know which run it is once I close this editor.
>
> What I'd trust: node and edge counts, direction. The 0.85 PageRank -- probably, if the table
> column carries that label. The 0.5 run -- nothing, it did not finish. Components -- never
> computed.

## 3. Re-run on CPU

> One button, "Re-run on CPU". Tooltip: "Takes a few minutes on the CPU." OK, a few minutes for
> PageRank on 1.5 million edges on a CPU sounds right; I would accept that. But the cost is in a
> tooltip. I only saw it because I hovered.
>
> Re-run with which damping? The field says 0.5, the shown values are 0.85. "Re-run" says the
> failed run to me, so 0.5. I would guess 0.5 and press it. If it re-runs 0.85 I would be annoyed
> and would not notice until I compared numbers.
>
> Also: "new runs use the CPU". Forever? A driver reset usually comes back in a few seconds. I have
> a discrete GPU on the desk machine. Where is "try WebGPU again"? The storyboard says the button
> goes back to plain Re-run when WebGPU returns, but I can't make it try. I would reload the page
> -- and then I'd wonder whether my project survives a reload.
>
> Pressed it. PageRank row now reads "CPU". Fine.

## 4. Betweenness is refused

> Now Betweenness. Red X, "hours". Editor: "Takes hours. The time limit is 30 seconds. Engine: CPU;
> WebGPU lost." Then "Fits the time limit: Sampled, 101 sources -- under a minute. Exact, on 5,318
> nodes -- under a minute. Past the time limit: Exact, on the full graph -- hours."
>
> Good. Honestly, good. It refuses before burning my afternoon, and the cost of each route is
> right there. Brandes on 124k nodes on a CPU is hours; that estimate is believable.
>
> Who set 30 seconds? It says "the time limit" like it is a law of nature. I would want to find
> where to change it. Not shown here.
>
> "Exact, on 5,318 nodes." Which 5,318? Betweenness on an induced subgraph is a different quantity,
> not an approximation of the full-graph one -- shortest paths change when you drop nodes. If this
> is a named set I made, name it. As written, a junior would pick it because it says "Exact" and
> report it as the betweenness of those patents. That is wrong and the screen invites it.
>
> "Sampled, 101 sources." Sampled how? Uniform sources, Brandes-Pich style? Normalized how? With
> what error? No seed shown here. My baseline for this graph used 500 sources. I pressed Enter
> because it was focused -- and it ran immediately with 101. I did not get to set k first.

## 5. Cancel, set 500, run

> "Running Betweenness (sampled)", 18%. Cancel on the running notice. Pressed it.
>
> Row: "Betweenness (sampled) -- Not run -- Run". Nothing kept from the canceled run. Good, I do
> not want an 18% sample hanging around looking like a result. Focus is on the row, Enter opens the
> editor. Fine, that is keyboard-reasonable.
>
> Editor: "Not run, on: full graph, 124,318 nodes. Directed." Sample size, I type 500. "About 101
> fits the time limit; 500 takes a few minutes and runs in the background." Seed: 7. OK -- seed
> shown and editable. That is what I needed. Run.
>
> So it took refuse, run, cancel, reopen, edit, run. Two steps too many. The refusal should have
> had the sample size field in it, or Enter should open the editor instead of running.
>
> The old "Betweenness -- hours" row with its red X stays in the list under PageRank. It is not an
> error, it is a refusal I routed around. It will look like a failure to whoever opens this next.

## 6. The notice elsewhere

> The other screen: transfers graph, "Could not run PageRank -- Show PageRank" on a dark notice.
> Ten seconds later it is gone, and I look at that screen: inspector shows the graph, a style
> stack, no Results section, no mark on the rail that I can see. If I was reading my notebook when
> that notice fired, I would not know anything failed. The citation screen had a Results section
> in the inspector; this one doesn't. Different screens, different answers.
>
> The "Canvas not available -- Graphics device lost; the graph, results and selection are still
> held" card: fine, clear, and "Download project file" first is the right order. On the citation
> graph nothing is drawn anyway, so I would never see it there.
>
> Closeness page, glanced: "Closeness, WF-corrected", tooltip names Wasserman-Faust. Someone read
> the literature. Good. Not my task.

## Outcome

> What I'd trust: the counts; the 0.85 PageRank only because the editor told me, and only while
> that editor was open; the CPU PageRank at -- I think -- 0.5; the 500-source sampled betweenness
> once it finishes, with seed 7. I'd want to see the numbers in a table with the run's parameters
> on the column and export them before I'd call any of it "usable". I never saw a table or an
> export on these screens.

**Single Ease Question: 4 of 7.** The failure itself is handled better than anything I use: no
silent CPU finish, a code, a refusal with priced routes. What cost me was reading which run's values
are on screen once the editor closes, guessing which damping Re-run uses, and the extra round trip
to set the sample size.

**Would I use this instead of my current tool?** For this job, no. In the notebook a dead GPU is a
traceback, I re-run the cell with the parameters I wrote down, and `betweenness_centrality(G,
k=500, seed=7)` is one line. I'd use this as the view I hand to someone else after the numbers
exist -- and the refusal screen is something I'd actually point a junior at, as long as "Exact, on
5,318 nodes" gets its name and its caveat.

## Problems found

1. **The failed row says only "Failed" while it still holds the previous run's values.** The
   editor says "Showing the run before: damping 0.85"; closed, the row reads Failed with nothing
   else, next to a damping field reading 0.5. She could not tell from the row whether the column
   holds the 0.85 run, nothing, or partial 0.5 values. Severity: high -- this is the task's own
   question.
2. **No values visible on these screens.** Nothing is drawn, no table is docked, and the result
   rows carry no top nodes or export. "A result you can use" had nowhere to be read from. Severity:
   high.
3. **"Exact, on 5,318 nodes" is unnamed and uncaveated.** Betweenness on a subset is a different
   quantity; the label "Exact" invites reporting it as the full-graph value. Severity: medium-high.
4. **Enter on the refusal runs the sampled default at once**, with no sample size or seed shown,
   so a researcher with her own k must cancel and reopen. Severity: medium.
5. **Re-run on CPU does not say which parameters it uses** (field 0.5, shown values 0.85), and its
   cost is only in a tooltip. Severity: medium.
6. **No way to retry WebGPU**; "new runs use the CPU" reads as permanent for the session.
   Severity: medium.
7. **After the failure notice times out, the transfer screen shows no trace of the failure** (no
   Results section, no visible rail mark). Severity: medium.
8. **PageRank's parameters used are incomplete:** no tolerance, iteration cap, weight use or
   dangling-node handling in Details; "failed at 62%" has no unit. Severity: medium.
9. **The 30-second time limit is stated but not linked to where it is set.** Severity: low.
10. **The refused "Betweenness -- hours" row keeps its red X** after she took another route, and
    reads as a failure. Severity: low.

## What delighted her

- The failed run did not finish on the CPU quietly; it named the cause and gave a code.
- "Showing the run before: damping 0.85" -- whose values are on screen, in words.
- Engine in Statistics, "CPU; WebGPU lost".
- The refusal before a run of hours, with each route priced.
- Sample size with "About 101 fits the time limit", and the seed shown and editable.
- "Assistant Off. Nothing is sent." in the rail.
- Closeness labelled WF-corrected, with the citation in its tooltip.
