# Session: a calculation that stopped partway -- Dr. Chen, computational biologist

Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md). Fifteen years of protein
interaction networks; Cytoscape for figures, R and igraph for anything she has to reproduce. Her worst
memory of a network tool is an interactome merge that sat at "finalizing" for more than a day.

Task as read by the moderator: "A long calculation on the citation graph stopped partway through.
Decide what you can still trust on the screen, and get a result you can use."

Screens seen, as a participant sees them (design notes hidden), in the order she met them:

- screens/gpu-lost-run.html, states d1 to d6 (shots/record/r6-chen-stop-gpu-d1.png ... -d6.png)
- screens/results-panel.html, states failed, failed-run, refused, finished-sampled, cpu-path,
  in-the-table (shots/r6-chen-stop-results-panel-*.png)
- screens/notices-errors.html, states device-lost and device-lost-later
  (shots/r6-chen-stop-notices-errors-device-lost*.png)
- screens/option-form-cost.html, states over-budget and sample-over-budget
  (shots/r6-chen-stop-option-form-cost-*.png)
- storyboards/failure-and-recovery.html, branch D, read as text (the page rendered blank in the
  screenshot tool, at both full-page and viewport size; it is built from frames of the screen above)

## Think-aloud

### 1. The run in progress (gpu-lost-run, d1)

"Patent citations. Not my kind of graph, but fine, a graph is a graph. 124,318 nodes, 1.48 million
edges, and it tells me it won't draw them: '124,318 nodes not drawn. Narrow the graph.' Good. I'd
rather that than a hairball that takes the laptop down.

PageRank, damping 0.5, started 10:14, running 62%, full graph, WebGPU. And then this line: 'Showing
Run 1 (damping 0.85) until this run finishes.' OK. That's the sentence I never got from Cytoscape.
Whatever numbers are sitting in the table right now are the old 0.85 numbers, not some half-written
mix. I'd want that to be true in the table too, not just here, but I'll take it."

### 2. It stops (gpu-lost-run, d2)

"Red bar: 'Could not run PageRank: WebGPU lost; new runs use the CPU.' Then 'Showing Run 1 (damping
0.85). Run 2 wrote nothing.'

So what can I trust. Run 1, damping 0.85, all of it. Run 2 -- nothing, and it says nothing, which is
the important word. It didn't dump 62% of an iteration into my column. If this were igraph I'd have
an error and no object, which is the same thing, honestly, and that's what I want.

Details: Engine 'CPU; WebGPU lost', Run 2 'failed at 62%', Code E_DEVICE_LOST. Fine. That code is
what I'd paste into a bug report. The inspector on the right also says Engine: CPU; WebGPU lost, so the
state of the machine is in two places. Good.

Two buttons. 'Re-run on CPU', and 'Try WebGPU again'. The CPU cost is in a tooltip -- 'Takes a few
minutes on the CPU'. Why is that hidden? That's the one number I need to decide between the two
buttons. I'd have missed it if I hadn't hovered. And 'a few minutes' is vague; I'd accept it for
PageRank, it's cheap.

One thing I don't see: a GPU run and a CPU run of the same PageRank -- do they agree? To what
tolerance? Run 1 was WebGPU at 0.85. If I re-run 0.5 on the CPU and compare the two, am I comparing
damping or am I comparing engines? Nothing here tells me the convergence tolerance or the iteration
count for either run. For PageRank that's a methods-section line."

### 3. Back to the list (gpu-lost-run, d2b)

"The list says the same thing on the row: 'Failed: WebGPU lost. Showing Run 1 (damping 0.85). Run 2
wrote nothing.' With the two buttons on the row. Good, consistent. And Run 1, 0.85, 09:40, WebGPU,
is right underneath. In-degree from the 27th is there too, on CPU.

I'm going to press Re-run on CPU. PageRank on 124k nodes on a CPU is not a big job. I'd do it in
igraph in less time than this conversation."

### 4. The other version of the same moment (results-panel, failed and failed-run)

"Wait, this is the same situation drawn differently. 'Needs action 1', PageRank damping 0.5, Sep 28
10:21, a red exclamation mark, 'Showing Run 1 (damping 0.85). Run 2 wrote nothing.' and one link:
'Try WebGPU again'. No 'Re-run on CPU' at all. And the times are different -- 0.85 was 10:14 here and
09:40 on the other screen. Different graph name in the inspector, 'Citations 1999 to 2001'.

Which one is the product? If this is what I get and the GPU is really gone -- driver crashed, whatever
-- I have one button and it's the one that won't work. I'd be stuck. I'd go looking for a Re-run
somewhere else.

Opening the record: 'Run 2 could not finish: WebGPU was lost. Showing Run 1 (damping 0.85). Run 2
wrote nothing.' and under Runs of this measure: Run 2, damping 0.5, 10:21, 'wrote nothing' in red;
Run 1, damping 0.85, 10:14, 'shown'. That table is exactly the audit trail I want. That's what I'd
point a reviewer at. 'Try WebGPU again runs damping 0.5, under a minute.' -- so the retry re-runs
too? On the other screen Try WebGPU again 'reruns nothing by itself', according to the storyboard.
Two different behaviours for a button with the same name. I'd have to click it to find out, and I
don't like finding out by clicking."

### 5. Asking for betweenness afterwards (gpu-lost-run d3, results-panel refused, option-form-cost)

"Right, suppose Run 3, the CPU PageRank, is done. Now I want betweenness, because PageRank alone on a
citation graph just tells me what's old and famous. 'Not run: would take hours. The time limit is 30
seconds.' Thank you. That's the stringApp complaint, answered: tell me the limit.

Ways forward, cheapest first: Sampled, 101 sources, under a minute. Exact on the 5,318 nodes in 'Drug
patents granted in 2001' -- and it says 'This is a different graph.' Yes it is. I'm glad it says so,
because a student would take that number and call it the betweenness of the network. Exact on the
full graph, hours, past the limit.

Why 101? That's a strange number. I'd want to choose it. On the refusal in the list there is no field
for sample size, just 'Run sampled' and Enter runs it. The option form version (option-form-cost,
over-budget) is better: it also lists 'Sampled, 500 sources, a few minutes' under Past the time limit.
So one screen gives me 500 and the other makes me run, cancel and edit (d4 to d6) to get 500. I
don't want to launch a run I'm going to cancel just to reach a field.

d6: sample size 500, seed 7, 'About 101 fits the time limit; 500 takes a few minutes and runs in the
background.' Seed is there. Good. A seed means I can rerun it and get the same number. That's the
single most reassuring field on any of these screens."

### 6. The list after the recovery (gpu-lost-run, d4 and d5)

"Newest first: Betweenness (sampled), 18%, 101 sources, CPU, Cancel. Betweenness, not run, would take
hours. PageRank damping 0.5, 10:22, Run 3, Full graph, CPU. PageRank 0.85, Run 1, WebGPU.

Where did Run 2 go? The failed one. It was on the list a minute ago with its red cause; now there's
Run 3 and no trace in the list that 0.5 failed once on the GPU. I assume it's in the record under
'Runs of this measure', like on the other screen. I'd check. For a methods section I don't care, but
if the numbers ever looked odd I'd want to know the first attempt died.

And Run 3 -- did it finish? The row says 'Run 3. Full graph. CPU.' No 'finished', no time taken.
Nothing says it failed either, so I'll read it as done. I'd open it to be sure.

d5, after cancel: 'Not run', with a Run button. Nothing kept. Fine, that's what cancel should mean."

### 7. What a sampled result looks like (results-panel, finished-sampled)

"This is the part that would actually go in a paper. Betweenness (sampled), 101 sources. Values with
tildes: ~0.0160, ~0.0037. Ranks '#3-#7' shared, with 'Ranks below #2 may swap between runs.' Honest.
Run record: 'Brandes betweenness from 101 random sources, scaled up by 124,318 / 101', seed 7, error
bound plus or minus 0.00035 on each value, 95 runs out of 100, took 29.9 s, engine WebGPU, and a Copy
button. I could paste that into Methods nearly as it is. That's better than cytoHubba ever gave me.

But it contradicts itself. The header says 'Directed.' The Options block says Direction: Directed.
The run record says 'Citations read as undirected', and the normalization is 'the node pairs of an
undirected graph'. On a citation graph that is not a detail -- directed and undirected betweenness
are different measures. Which one did it compute? If I can't answer that, I can't use the number.
And the refusal said the same, 'the directed citations read as undirected'. So maybe undirected is
the truth and the 'Directed' labels are the graph, not the run. It shouldn't be my job to reconcile
three labels.

'Damping: Does not apply' in a betweenness record. Delete that row. 'Re-run (keeps Run 1)' is greyed
out and doesn't say why."

### 8. The notice (notices-errors, device-lost and device-lost-later)

"On the March transfers graph: a dark notice at the bottom, 'Could not run PageRank', 'Show PageRank',
and an X. And then later -- nothing. The notice is gone and the screen looks perfectly normal. The
Results icon on the left has no dot, no count. If I'd gone for coffee I'd come back to a clean screen
and no idea anything failed, until I opened Results. On the citation screens the Needs action group
catches it, if I open Results. I'd want the rail to say so."

### 9. Deciding

"What I can trust: Run 1, PageRank at 0.85, which is what's shown, and the inspector's statement that
the GPU is gone. What I can't: anything from Run 2, which it tells me itself. What I did: Re-run on
CPU for PageRank 0.5, and for betweenness, sampled at 500 sources with seed 7, knowing it's an
estimate with a stated error.

What I'd still check before I quoted anything: that Run 3 finished, and whether that betweenness is
directed or not."

## Answers

**Single Ease Question (1 = very difficult, 7 = very easy): 5.**

"The failure itself was easy to read -- 'Run 2 wrote nothing' is the best sentence on any of these
screens. What cost me was two versions of the same failure with different buttons, the CPU cost
hidden in a tooltip, a sample size I couldn't set until after I'd started and cancelled, and a
betweenness result that says Directed in two places and undirected in a third."

**Would you use this instead of your current tool?**

"Not instead. Alongside, for looking. My current tool for anything I have to reproduce is igraph in
R, and nothing here showed me how to drive this from a script or pull the run record into R. The
Copy button and Export table are a start. But for this exact situation -- a long run dying halfway --
it's better than Cytoscape, which would have sat at 'finalizing' or given me 'null'. This told me
what died, what's still on screen, and what each way forward costs. If the run record stays that
honest and the direction labels agree with each other, I'd trust its numbers enough to check them
against igraph, which is more than I say about most tools."

## Observations for the study

- Pass on the round's bet: asked which damping the shown PageRank used, she answered 0.85 at d2 and
  again at d2b, unprompted, and named Run 2 as having written nothing.
- Pass at the refusal: she named each route's cost before choosing and noticed that the 5,318-node
  route is a different graph.
- The two screens for the same failure disagree: the Results panel's failed row offers only Try
  WebGPU again (no Re-run on CPU), the timestamps and graph name differ, and Try WebGPU again re-runs
  on one screen and runs nothing on the other.
- The CPU cost for Re-run on CPU is only in a tooltip.
- The refusal in the run's record offers only the default sample (101); the option form's refusal also
  offers 500 sources. On the record she had to start, cancel and edit to reach 500.
- After Re-run on CPU, the failed Run 2 no longer appears in the Results list, and Run 3's row does not
  say it finished.
- The sampled betweenness record says Directed in its header and Options but "Citations read as
  undirected" and an undirected normalization in its run record. For this persona that blocks quoting
  the number.
- PageRank records show no convergence tolerance or iteration count, so she could not tell whether
  a WebGPU run and a CPU run are comparable.
- Once the failure notice closes, nothing outside Results shows that a run failed.
- The failure-and-recovery storyboard rendered as a blank page in the screenshot tool (both full-page
  and viewport); only its text was read.
