# Session: a long calculation stopped partway -- Expert Emma

Participant: Emma, network scientist and consultant. She works in Jupyter notebooks (networkx to
prototype, igraph or graph-tool at real sizes) and uses Gephi for the one figure a deck needs. She
reads parameter tables and API pages, not tutorials, and she arrives assuming that either the data
leaves her laptop or the numbers are not honest. She has done this task on an earlier version of
these screens.

Task as given by the moderator: "A long calculation on the citation graph stopped partway through.
Decide what you can still trust on the screen, and get a result you can use."

Screens seen, in order, as a participant sees them (design notes hidden). All were rendered fresh
for this session, in the participant view unless noted:

- `shots/record/r6-emma-stop-gpu-lost-run.png` -- the patent citation graph, seven frames top to bottom: a
  PageRank re-run in progress, the run failing, the Results list after the failure, a betweenness
  run refused, a sampled run in progress, the sampled run canceled, the sampled run's settings
- `shots/record/r6-emma-stop-rp-failed.png`, `shots/record/r6-emma-stop-rp-failed-run.png` -- the same kind of
  failure drawn on the Results panel page, list and opened
- `shots/record/r6-emma-stop-rp-canceled.png`, `shots/record/r6-emma-stop-rp-running-result.png` -- a run with its
  options open, and a run in progress with Run 1 still shown
- `shots/record/r6-emma-stop-rp-finished-sampled.png` -- a finished sampled betweenness with its run record
  open
- `shots/record/r6-emma-stop-rp-in-the-table.png` -- a finished exact betweenness with the table docked
  (on a protein graph, not the citation graph)
- `shots/record/r6-emma-stop-notices-device-lost.png`, `shots/record/r6-emma-stop-notices-later.png` -- a
  failure notice on a transfers graph, and the same screen after the notice has gone
- `shots/record/r6-emma-stop-option-form-cost.png` -- the cost choices as a pop-up over the canvas
  (glanced at)
- `shots/record/r6-emma-stop-far-top.png` -- the storyboard page in the participant view: a blank white
  page. `shots/record/r6-emma-stop-far-full.png` is the same page with design notes on, which she was
  shown after she said it was blank

---

## 1. Before it stopped

*(gpu-lost-run, first frame)*

"OK. Patent citations, 124,318 nodes, 1.48 million edges, directed. Nothing drawn, which is fine,
I don't want a hairball of a million edges anyway. PageRank, damping 0.5, running, 62 percent, on
WebGPU. 'Showing Run 1 (damping 0.85) until this run finishes.' Good. That's the sentence I want.
So whatever column I'd be looking at right now is the 0.85 one, not a half-baked 0.5 one."

"62 percent of what, though? Iterations? It's PageRank, it doesn't have a fixed amount of work --
it runs until it converges. If this is a percentage of an iteration cap, tell me the cap. I'll let
it go, it's a progress bar."

"Engine: WebGPU, top right under Statistics. I like that that's just stated."

## 2. It stops

*(gpu-lost-run, second frame)*

"'Could not run PageRank: WebGPU lost; new runs use the CPU.' Well -- it did run. It ran to 62
percent and then the device went away. 'Could not run' sounds like it never started. The Results
panel page says 'Run 2 could not finish', which is the correct sentence. Pick that one."

"Now the question I actually came for: 'Showing Run 1 (damping 0.85). Run 2 wrote nothing.' Yes.
That is the answer. Nothing from the dead run is in any column. It didn't finish on the CPU behind
my back either -- it failed and said so. That's the thing Gephi would never tell you. Details:
Engine CPU; WebGPU lost. Run 2 failed at 62%. Code E_DEVICE_LOST. I can put that in a methods
note."

"So what do I trust? The 0.85 PageRank from Run 1, the in-degree from yesterday. Nothing at 0.5.
That took me maybe fifteen seconds. Last time it took me a lot longer."

"Two buttons. Re-run on CPU -- 'Takes a few minutes on the CPU'. Try WebGPU again. Re-run uses
what's in the Damping field, 0.5, I assume, because this record is titled 'PageRank, damping 0.5'.
I'd still like the button or its tooltip to say 'damping 0.5' so I don't have to assume. Fine."

## 3. The list afterwards

*(gpu-lost-run, third frame)*

"Back in the list. The failed row keeps 'Failed: WebGPU lost' and the same 'Showing Run 1 ... Run 2
wrote nothing.' Both buttons on the row. Good, I don't have to open it."

"I press Re-run on CPU. The GPU just died on me, I'm not going to poke it again in the middle of a
deadline."

## 4. The Results panel page tells me something different

*(results-panel, failed and failed-run)*

"This is the same failure drawn on another page. 'Needs action 1', a red dot, PageRank damping 0.5.
'Showing Run 1 (damping 0.85). Run 2 wrote nothing.' Same words, good. But there's only one
button here: Try WebGPU again. No Re-run on CPU at all."

"And opened: 'Run 2 could not finish: WebGPU was lost.' Then, under the blue Try WebGPU again
button: 'Try WebGPU again runs damping 0.5, under a minute.' So on this page Try WebGPU again
RUNS the measure. On the other page its tooltip said 'nothing is re-run by itself'. Those can't
both be true. Which is it? If I press it, does something start computing on 1.48 million edges or
not? That's not a wording nit -- I'd press the wrong one."

"And if this is the real screen, there's no CPU path from here. The only way forward is to retry
the device that just crashed. I'd go looking for Re-run in the options pop-up, I guess."

"Also, the header on this record is 'PageRank, damping 0.85, Sep 28 10:14' -- the record is named
after Run 1, and the failure is about Run 2. On the other page the record was named 'damping 0.5'
and Run 1 was 09:40. Same story, different times and a different title. Different mocks, I get
it, but I'm the kind of person who checks timestamps."

"'Exact' with an info mark after it. Good. 'Weight: no numeric edge column.' Good. Runs of this
measure: Run 2 'wrote nothing' in red, Run 1 'shown'. That's the cleanest version of the answer I've
seen in this tool."

## 5. Getting a usable result: PageRank

*(gpu-lost-run, fourth frame, the list)*

"'PageRank, damping 0.5, today 10:22. Run 3. Full graph. CPU.' OK, so the CPU run went through.
Where did Run 2 go? The failed row is gone from the list. I'd want it to stay -- 'Run 2 failed,
WebGPU lost' is part of the history of this analysis. If a reviewer asks why I switched engines,
that's my answer. Maybe it's inside Run 3's record. I can't tell from here."

"And I never get to see Run 3's numbers on the citation graph. No top nodes, no table on any of
these frames for this PageRank. The only table I was shown is a protein graph. So I believe it ran,
but 'a result you can use' -- I'd have to open it and hope there's a top-nodes list like the
betweenness one has."

"The other thing I want for a CPU re-run of a GPU measure: same tolerance, same iteration cap,
same dangling-node handling? Nothing on any screen tells me PageRank's stopping rule. If Run 1 on
WebGPU and Run 3 on CPU used different tolerances, comparing them is meaningless. There's a
Compare with... on the record, which is exactly what I'd use, but the parameters that make the
comparison valid aren't listed."

## 6. Getting a usable result: betweenness

*(gpu-lost-run, fourth to seventh frames)*

"Now I ask for betweenness. 'Not run: would take hours. The time limit is 30 seconds.' Refused
before it starts -- good, I'd rather that than a spinner for three hours. Engine CPU; WebGPU lost,
and Try WebGPU again sits there next to the reason, which makes sense: the GPU is why it's hours."

"Routes. 'Sampled, 101 sources -- under a minute.' 'Exact, on the 5,318 nodes in Drug patents
granted in 2001 -- under a minute. This is a different graph.' Thank you. That's the caveat I
wanted last time. Betweenness on a subgraph is not the full-graph betweenness restricted to those
nodes, and it says so. 'Exact, on the full graph -- hours.'"

"Where's the 30 seconds set? It says 'the time limit' as if I know where it lives. I'd want a link
to it. If I'm on my desk machine at lunch I might just want the hours."

"Run sampled. It starts, 18 percent, 101 sources, CPU. I cancel it -- I want my own sample size. The
row goes back to 'Not run' with a Run button. Opened: sample size 500, 'About 101 fits the time
limit; 500 takes a few minutes and runs in the background.' Seed 7, editable. That's what I'd do in
networkx, `k=500, seed=7`. Good. I'd still like the seed on the refusal screen too, before I press
Run sampled, so I know the default run is reproducible without opening anything."

## 7. The finished sampled result

*(results-panel, finished-sampled with the run record open)*

"Top nodes with a tilde, 'estimated'. Ranks '#3-#7' shared, 'Ranks below #2 may swap between runs'.
That's honest. I like that a lot. Distribution, zero: about 79,554 nodes -- plausible for a
citation network, lots of leaves."

"Run record. Method: Brandes betweenness from 101 random sources, scaled up by 124,318 / 101. Seed
7. Error bound plus or minus 0.00035, 95 runs out of 100. That's a real parameter table. Took 29.9
s."

"And then: 'Direction: Citations read as undirected.' 'Normalization: divided by (n-1)(n-2)/2, the
node pairs of an undirected graph.' But the Options list on the same panel says Direction:
Directed, and the line at the top says 'Directed.' That's the exact thing I test every tool for.
Which one ran? Directed and undirected betweenness on a citation graph give completely different
rankings -- directed, most old patents have almost nothing flowing through them. If the record is
right, the options are lying; if the options are right, the normalization is wrong by a factor of
two. I would not put these numbers in a deck until I knew."

"Also the Engine here is WebGPU, and the run on the other page was CPU. Different mock, fine, but
it's the same 'sampled, 101 sources, seed 7' run."

## 8. The notice on another graph

*(notices-errors, device lost, then later)*

"Different project, March transfers. 'Could not run PageRank', Show PageRank, close. No cause in
the notice, but it's a notice, the cause is one click away. Fine."

"Then the notice is gone and the screen is -- normal. Nothing on the Results button in the rail.
No dot, no mark. If I'd been getting coffee when that notice showed, I'd have no idea anything
failed until I opened Results. The caption above the frame says the rail carries a mark; I don't
see one on the picture."

## 9. The pop-up version

*(option-form-cost, glanced at)*

"This is the same refusal as a floating card over the canvas instead of in the panel. 'Takes hours.
The time limit is 30 seconds. Details.' Same routes, 'Exact, on 5,318 nodes' -- here without the
'different graph' warning in view. I'd want the caveat wherever that route shows."

## 10. The storyboard page

"It's blank. White page. Nothing to read." *(Moderator turns the notes on.)* "Oh, it's the design
document. 'Emma, a network scientist... Expected reaction: Sampled is fine for a first look.' You
wrote down what I'm supposed to say. For what it's worth, I said it. I'm not reading the rest of
this, it's not a screen."

---

## Single Ease Question

**5 out of 7.**

"The part the task was about -- what can I trust -- was easy this time. One sentence, 'Showing Run
1 (damping 0.85). Run 2 wrote nothing,' on the record and on the row, and a failed run that didn't
quietly finish on the CPU. That alone is a 6. I lose a point because the two pages disagree on what
Try WebGPU again does, and on one of them there's no CPU path at all. And I'd lose another on a
real graph, because the one finished result I could read says 'Directed' in the options and 'read
as undirected' in its own run record. That's the numbers-honest question, and it failed it on the
last screen."

## Would she use this instead of her current tool?

"Instead of the notebook -- no. When a notebook kernel dies I know exactly what I have: whatever
was assigned before the traceback. Here I had to be told, and to be fair, I was told clearly. But
`betweenness_centrality(G, k=500, seed=7)` is one line and I know it's directed because I passed a
DiGraph."

"Alongside it, as the thing I hand a client after the numbers exist -- more likely than last time.
The refusal with priced routes and 'This is a different graph' is something I'd show a junior
analyst on purpose. The run record with the method, seed and error bound is the page I'd point a
reviewer at -- once it agrees with itself about direction."

---

## Observations (moderator)

### Problems found

1. **The sampled betweenness record contradicts its own options on direction.** Options and the
   run line say Directed; the run record says "Citations read as undirected" and normalizes by the
   undirected pair count. She would not use the numbers. Severity: high.
2. **Try WebGPU again means two different things.** On the GPU-lost screen its tooltip says
   nothing re-runs by itself; on the Results panel's failed record the line beside it says "Try
   WebGPU again runs damping 0.5, under a minute." She could not tell whether pressing it starts a
   computation. Severity: high.
3. **The Results panel's failed record has no Re-run on CPU.** Its only forward action is to retry
   the device that just failed. Severity: medium-high.
4. **No PageRank values are ever shown for the CPU re-run on the citation graph.** The task's
   "result you can use" is visible only for sampled betweenness. Severity: medium.
5. **PageRank's stopping rule is never stated** (tolerance, iteration cap, dangling nodes), so a
   CPU re-run cannot be checked as comparable to the WebGPU run, and "failed at 62%" has no unit.
   Carried over from the earlier round. Severity: medium.
6. **The failed run disappears from the list after the CPU re-run.** Run 3 appears, and Run 2's
   failure is no longer visible in the history. Severity: medium.
7. **After the notice clears, the transfers screen shows no mark on the Results rail button**,
   although the frame's caption says it carries one. Carried over. Severity: medium.
8. **"Could not run PageRank" for a run that reached 62 percent.** The Results panel's "Run 2
   could not finish" is the accurate sentence. Severity: low.
9. **The 30-second time limit is named but not linked to where it is set.** Carried over.
   Severity: low.
10. **The seed of the default sampled run is not shown on the refusal**, only after opening the
    record. Severity: low.
11. **The pop-up form of the refusal lists "Exact, on 5,318 nodes" without "This is a different
    graph."** Severity: low.
12. **The two pages give the same failure different times and titles** (Run 1 at 09:40 vs 10:14;
    record titled damping 0.5 vs damping 0.85). She noticed and discounted it. Severity: low.
13. **The storyboard page is blank in the participant view**, and with notes on it scripts her
    expected reactions. Severity: low (not a product screen).

### What delighted her

- "Showing Run 1 (damping 0.85). Run 2 wrote nothing." on the record and on the closed row --
  answered the task's first question in about fifteen seconds.
- The GPU failure is a failure with a cause and a code, never a quiet CPU finish.
- Engine stated in Statistics ("CPU; WebGPU lost") and on every run row.
- Refusal before a run of hours, with routes priced cheapest first, and "This is a different
  graph." on the subgraph route.
- Sample size with "About 101 fits the time limit" and an editable seed.
- The sampled result: estimated values with a tilde, shared rank bands, "Ranks below #2 may swap
  between runs", and a run record naming Brandes, the scaling, the seed and the error bound.
- "Exact" with an explanation mark, and "Weight: no numeric edge column" on the run line.

### Compared with the earlier round

The row that said only "Failed" now says whose values are shown; a way to retry WebGPU exists; the
subgraph route carries its caveat; the refused row no longer reads as a failure. The rail mark,
PageRank's stopping rule and the time-limit link are still missing.
