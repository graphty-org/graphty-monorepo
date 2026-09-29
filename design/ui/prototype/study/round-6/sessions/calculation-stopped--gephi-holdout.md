# Session: a calculation stopped partway -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, Gephi user since
0.8, NetworkX for anything she must reproduce. Simulated session, played at 1440x900.

**Task as given by the moderator:** "A long calculation on the citation graph stopped partway
through. Decide what you can still trust on the screen, and get a result you can use."

**Screens used:** the seven states of "When the GPU is lost, and when a costly run is canceled"
(screens/gpu-lost-run: running, failed, failed row with the record closed, refused, sampled
running, canceled, set up again); screens/results-panel in its failed, canceled and
finished-sampled states; screens/notices-errors, device lost; screens/option-form-cost, over the
time limit and with a sample past it; the storyboard "Failure and recovery", read as text.

---

## Think-aloud transcript

### 1. The run in progress

> "Patent citations again. 124,318 nodes, 1,480,221 edges, directed, nothing drawn -- fine, I said
> last time that's honest at this size. PageRank, damping 0.5, running 62 percent on the full
> graph, WebGPU. And under the damping box: 'Showing Run 1 (damping 0.85) until this run
> finishes.' Good. That is the sentence I wanted. It's still small grey text under a box that says
> 0.5, but it's there before anything goes wrong, which means I've read it once before I need it."

### 2. It stops

> "Red bar: 'Could not run PageRank: WebGPU lost; new runs use the CPU.' And now, in black, not
> grey: 'Showing Run 1 (damping 0.85). Run 2 wrote nothing.' Yes. That is exactly the line I asked
> for. 'Wrote nothing.' I don't have to infer it from the 62 percent any more. So: the PageRank I'm
> looking at is complete, it's 0.85, and none of the failed run leaked into it. I trust that."

> "The header still reads 'PageRank, damping 0.5' and the damping box still reads 0.5. I
> understand why -- that's the thing I asked for, not the thing I got -- but I'd still put money
> on a student reading the header and writing 0.5 in their lab report. The bold line saves it.
> Barely."

> "'Re-run on CPU', tooltip 'Takes a few minutes on the CPU.' And now 'Try WebGPU again'. Hover:
> asks the browser for the GPU again, re-runs nothing by itself. Good, that answers my 'do I have
> to reload the page' question, at least partly. It still doesn't tell me whether a reload would
> cost me my results. I wouldn't reload to find out."

> "Details: Run 2, failed at 62%, E_DEVICE_LOST. Fine, that's for the bug report."

### 3. Back to the list

> "I close the record. The row keeps it: 'PageRank, damping 0.5. Failed: WebGPU lost. Showing
> Run 1 (damping 0.85). Run 2 wrote nothing.' Both buttons on the row. And underneath, 'PageRank,
> damping 0.85, Run 1, Full graph, WebGPU.' So the damping is in the name now. Two PageRanks, two
> names that say how they differ. That fixes my modularity_class complaint for this case."

> "One thing: 'Run 1' is on the 0.85 row and 'Run 2' was the 0.5 attempt. So the run numbers
> belong to PageRank as a whole, not to each row? Later the 0.5 row says 'Run 3'. Run 3 of a row
> that never had a Run 1 or 2 that I can see. I'd figure it out. My students would ask me."

### 4. The same failure elsewhere

> "The toast on the other dataset: 'Could not run PageRank', 'Show PageRank'. Doesn't say the old
> values are kept, but it sends me to the row that does. Fine."

> "The results-panel version of the failed row is different, though. There it's under 'Needs
> action', with only 'Try WebGPU again' -- no 'Re-run on CPU'. And the times don't match the other
> screen. If I'm meant to believe these are the same app, one of them is out of date. I'd go with
> the one that gives me the CPU button, because that's the one that gets me a number."

### 5. Re-run on CPU, then Betweenness refused

> "Pressed Re-run on CPU. The list now: 'PageRank, damping 0.5, today 10:22, Run 3, Full graph,
> CPU.' Damping, scope, engine, all on the row. That's a result I can put in a methods section.
> Good."

> "Betweenness: 'Not run: would take hours. The time limit is 30 seconds.' Still thirty seconds I
> didn't choose and still nowhere on this screen to change it. It's my -Xmx again. I'd look in
> Preferences; I'd find it or I wouldn't."

> "'Exact, on the 5,318 nodes in Drug patents granted in 2001. This is a different graph.' Oh --
> they named it. And they warn me it's a different graph. That's the exact thing I complained
> about. I still wouldn't use it for a claim about the whole citation network, but now I know
> what it is, and that's the point."

> "'Sampled, 101 sources, under a minute.' Still no seed, no method shown before I run it. And
> Enter runs it. I don't press Enter on things I haven't read."

> "The options form on the other screen shows this better: there's a 'Sampled, 500 sources, a few
> minutes' row under 'Past the time limit'. The refusal here doesn't offer it. Why do I have to
> cancel a run to get the sample size I want, when the other form just lists it? And that form
> says 'Exact, on 5,318 nodes' without the set's name -- so the fix only landed in one of the two
> places."

### 6. Sampled runs, canceled, set up again

> "In the story the default ran with 101. I'd cancel for 500 too. Cancel: the row goes to 'Not
> run', nothing kept. Good. Open it: sample size 500, 'About 101 fits the time limit; 500 takes a
> few minutes and runs in the background.' Seed 7. Run. And the story ends there again, on this
> screen. Same as last time: I set it up, I didn't see it finish."

### 7. What a finished sampled result looks like

> "The finished-sampled result panel shows me what I'd get. Betweenness (sampled), 101 sources.
> Top nodes are marked 'estimated', ranks '#3-#7' as a tie, 'Ranks below #2 may swap between
> runs.' Honest. Details opens a run record: 'Brandes betweenness from 101 random sources, scaled
> up by 124,318 / 101.' That's NetworkX's k rescaling, n over k. Error bound plus or minus 0.00035,
> 95 runs out of 100. I've never had a tool tell me that. Copy button. I'd paste that straight into
> the supplement."

> "But then: 'Direction: Citations read as undirected.' And normalization 'Divided by (n-1)(n-2)/2,
> the node pairs of an undirected graph.' The summary right beside it says 'Directed', and the
> Options block says 'Direction: Directed.' Which is it? For citations that's not a detail --
> directed and undirected betweenness are different numbers, and the normalization differs by a
> factor of two. One screen, two answers. I can't report this until I know. That's the kind of
> thing that makes me go back to NetworkX and compute it myself to check."

> "Also this record says Engine WebGPU, 29.9 s, Sep 28 -- so it's yesterday's run, not the one I
> just set up. Fine as an example. I still haven't seen my 500-source run."

> "'124,313 more in the table' -- there's a link to the table. Good. On the protein graph I can see
> the table: betweenness column, header says 'exact, full graph', rank column, 'ties share'. If the
> sampled column says 'estimated, 101 sources' in its header the same way, I'd export it."

---

## What she decided she could trust

- PageRank on screen after the failure: the complete damping-0.85 run. Trusted, and this time
  without inferring it: "Run 2 wrote nothing" says so.
- The CPU re-run, "PageRank, damping 0.5, Run 3, Full graph, CPU": trusted; the row names its
  parameter, scope and engine.
- In-degree: untouched, trusted.
- "Exact on the 5,318 nodes in Drug patents granted in 2001": trusted for what it is, not used,
  because it is a different graph.
- Sampled betweenness: the method, rescaling, seed and error bound she trusts; the direction she
  does not, because the run record and the summary disagree.

## Single Ease Question

**5 out of 7.**

> "The failure part is now easy -- it tells me it failed, what's on screen and that nothing was
> written. I got a PageRank I can use, with the damping on the row. What keeps it from a six:
> betweenness still has a clock I didn't set, the refusal won't let me pick 500 without a
> cancel, and the sampled result contradicts itself on direction. Five."

## Would she use this instead of her current tool?

> "For recovering from a crashed calculation, this is better than anything Gephi has ever done --
> Gephi either hangs or leaves half a column. The run record with the method, the seed and the
> error bound is better than NetworkX, which gives me a dict and nothing else. But I wouldn't
> switch on this evidence. The directed-or-undirected contradiction is the thing I'd have to check
> in NetworkX, and if I'm checking in NetworkX anyway, I run it in NetworkX. Fix that, put the
> time limit where I can see it, and I'd use it for exploring big graphs before I commit to the
> overnight run. Not yet instead of Gephi."

---

## Observed problems (moderator summary)

1. The sampled betweenness run record says "Citations read as undirected" and normalizes by the
   undirected pair count, while the summary line and the Options block in the same panel say
   "Directed". For a citation graph the two give different numbers; she would not report the
   result until she knew which one ran.
2. The over-time refusal in the failure flow offers only "Sampled, 101 sources"; the options form
   elsewhere lists "Sampled, 500 sources, a few minutes" under "Past the time limit". Getting a
   larger sample in the failure flow takes a run, a cancel and a re-open.
3. The two refusal surfaces disagree on naming the subset: the failure flow says "the 5,318 nodes
   in Drug patents granted in 2001. This is a different graph."; the options form says only
   "Exact, on 5,318 nodes".
4. The 30-second time limit is still shown with no way to see where it is set or change it from
   the screen.
5. The refusal's default ("Sampled, 101 sources") shows no seed or method before it runs, and
   Enter runs it.
6. After the failure the record's header and the damping field still read 0.5 while the shown
   values are 0.85. The bold "Showing Run 1 (damping 0.85). Run 2 wrote nothing." line now
   answers it, but the most prominent text on the record is the value that did not run.
7. Run numbers are shared across rows with different settings ("Run 1" on the 0.85 row, "Run 3" on
   the 0.5 row), which reads as a gap.
8. The failed row in screens/results-panel ("Needs action", only "Try WebGPU again", different
   times) does not match the failed row in the failure flow (both "Re-run on CPU" and "Try WebGPU
   again").
9. The failure flow still ends before the 500-source run finishes; the only finished sampled
   result shown is a different, earlier run.
10. Whether a page reload keeps results is still not said; "Try WebGPU again" removes the need to
    reload but not the worry.
11. The "Failure and recovery" storyboard rendered as a blank page in participant view; she read
    it as text only.

## What she liked

- "Run 2 wrote nothing." -- the one sentence she asked for last round, now in bold on the record
  and repeated on the row.
- Damping in the result's name: two PageRank rows that say how they differ.
- "Try WebGPU again" with a tooltip saying it re-runs nothing by itself.
- The subset named in the refusal, with "This is a different graph."
- The sampled run record: method, rescaling (n / k), seed, error bound with its confidence, and a
  Copy button; ranks shown as ties with "may swap between runs".
- Cancel still leaves nothing half-written.
