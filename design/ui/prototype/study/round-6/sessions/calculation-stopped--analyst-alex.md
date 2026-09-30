# Session: a long calculation stopped partway -- Analyst Alex

Participant: Alex, data analyst on an operations analytics team at a logistics company. He computes
metrics in NetworkX and draws in Gephi. He has had a betweenness run go "over lunch and then some"
and a Cytoscape layout hang with no message, so a long run that dies partway is his worst case.

Task as given by the moderator: "A long calculation on the citation graph stopped partway through.
Decide what you can still trust on the screen, and get a result you can use."

Screens seen, in order, as a participant sees them (design notes hidden). All were rendered fresh
for this session:

- `shots/record/screens__gpu-lost-run-d1--study.png` to `-d6--study.png` -- the patent citation graph: a
  PageRank re-run in progress, the run failing, the Results list after the failure, a betweenness
  run refused, a sampled run in progress, the sampled run canceled, the sampled run's settings
- `shots/record/screens__results-panel-failed--study.png`, `screens__results-panel-failed-run--study.png`
  -- the same kind of failure drawn in the Results panel, list and opened
- `shots/record/screens__results-panel-refused--study.png`,
  `screens__results-panel-finished-sampled--study.png` -- a refused exact betweenness, and a
  finished sampled one with its run record open
- `shots/record/screens__results-panel-cpu-path--study.png` -- a finished run on a small graph with no
  WebGPU (glanced at)
- `shots/record/screens__notices-errors-device-lost--study.png`,
  `screens__notices-errors-device-lost-later--study.png` -- a failure notice on another graph, and
  the same screen after the notice has gone
- `shots/record/screens__option-form-cost-over-budget--study.png`,
  `screens__option-form-cost-sample-over-budget--study.png` -- the cost choices shown as a pop-up
  over the canvas
- `shots/record/r6-alex-stopped-storyboard.png` -- the storyboard page, which renders as a blank white
  page in the participant view

---

## 1. Before it stopped

> Patent citations again. 124,318 nodes, 1,480,221 edges, directed. Middle of the screen is empty,
> "124,318 nodes not drawn". Fine. I remember this one.
>
> PageRank, damping 0.5, "Running, 62%, on: full graph, 124,318 nodes. WebGPU." Progress bar,
> Cancel, and the same thing at the bottom. Good. That's still the bit I like.
>
> "Showing Run 1 (damping 0.85) until this run finishes." OK, that's clearer than last time. It
> says Run 1 and it says 0.85. I don't have to guess which numbers are which. The damping box
> right under it says 0.5 though -- so the box is what I asked for and the sentence is what I'm
> looking at. I get it, but I'd have to read it twice if I was in a hurry.

## 2. It stops

> Red box: "Could not run PageRank: WebGPU lost; new runs use the CPU." Then, bold, "Showing Run 1
> (damping 0.85). Run 2 wrote nothing."
>
> Right. That's the answer to half the task. What can I trust: Run 1, 0.85, from earlier. Run 2
> didn't leave half a column of numbers lying around. That's the thing I was afraid of -- NetworkX
> would just throw an exception, but Gephi, I've had it leave a half-filled column and you don't
> know which rows are new. "Wrote nothing" is exactly what I want to read.
>
> Details: Engine "CPU; WebGPU lost", Run 2 "failed at 62%", Code E_DEVICE_LOST. I don't care
> about the code but I'd paste it into a ticket if it happened twice.
>
> Two buttons. "Re-run on CPU", tooltip "Takes a few minutes on the CPU". "Try WebGPU again". A
> few minutes is fine. I'd click Re-run on CPU. I don't know what makes WebGPU come back and I'm
> not going to find out on a deadline.

## 3. The list afterwards

> Back to the Results list. Top row: "PageRank, damping 0.5, today 10:14. Failed: WebGPU lost.
> Showing Run 1 (damping 0.85). Run 2 wrote nothing." Same sentence with the box closed. Good --
> that was my complaint last time, and it's fixed here. Under it, the 0.85 run, 09:40, WebGPU. And
> in-degree from the 27th.
>
> So what I trust: in-degree, fine, it's from two days ago, nothing's changed. PageRank 0.85, fine.
> PageRank 0.5 -- doesn't exist yet.

## 4. Then I looked at the Results panel page

> Wait. This is the same thing, the same failure, drawn differently. "Needs action 1", PageRank
> damping 0.5, red exclamation, "Showing Run 1 (damping 0.85). Run 2 wrote nothing." Fine, same
> sentence. But here there's only "Try WebGPU again". No "Re-run on CPU".
>
> And when I open it: "Try WebGPU again runs damping 0.5, under a minute." On the other screen the
> WebGPU button didn't run anything, it just... tried. And the CPU button was the one that ran it.
> So which is it? If I click Try WebGPU again, do I get my numbers or do I get a status message?
>
> And why is CPU gone here? If it can take a few minutes on the CPU on one screen, why can't it on
> this one? Same graph, same node count. [Moderator: what would you do?] I'd click Try WebGPU
> again, because it's the only button. And if WebGPU is still broken I've got no idea what happens
> next. Probably it fails again and I'm in the same spot with no CPU button.
>
> Also the times don't line up. Here Run 1 is "Sep 28 10:14" and Run 2 is 10:21. On the other
> screen Run 2 started at 10:14 and Run 1 was 09:40. And the graph on the right is called
> "Citations 1999 to 2001" here and just "Citations" there. I know these are mock-ups, but if I
> saw that in the real tool I'd stop and check I was on the right file.

(Moderator note: the participant treated both pages as one product and read the difference as a
contradiction, not as two scenarios.)

## 5. Getting a usable result: PageRank

> On the first screen, after the CPU re-run, the list has "PageRank, damping 0.5, today 10:22.
> Run 3. Full graph. CPU." So it worked. Eight minutes after it started. It doesn't say "done" and
> it doesn't say how long it took -- I'm working that out from the timestamps. And it's Run 3,
> not Run 2. Fine, Run 2 was the dead one. Makes sense once you think about it.
>
> Where'd the failed row go? It was at the top and now it's gone. I guess Run 3 replaced it. I'd
> actually have kept it, just greyed out, so I can say "it failed once on GPU" if anyone asks why
> this took longer. But I wouldn't fight about it.
>
> So PageRank 0.5 -- I'd call that usable. I'd still compare the top 20 against NetworkX the first
> time. I always do.

## 6. Getting a usable result: betweenness

> Then betweenness. "Not run: would take hours. The time limit is 30 seconds. Engine: CPU; WebGPU
> lost." OK, so it's hours because the GPU went away. That's honest. That's the exact thing that
> ate my lunch in NetworkX, and here it just says no before starting. I like that a lot.
>
> Three choices. "Sampled, 101 sources, under a minute." "Exact, on the 5,318 nodes in Drug
> patents granted in 2001. This is a different graph." "Exact, on the full graph, hours."
>
> "This is a different graph" -- OK, somebody fixed my complaint from before. It's the drug patents
> set, that's a subset I made or someone made. Exact numbers on a subset are not the same as
> numbers on the whole thing. I'd pick sampled. That's what I'd do in NetworkX anyway, k equals
> something.
>
> "The time limit is 30 seconds." Still don't know who set that or where I change it. Some days I
> would happily let it run three hours, overnight. I looked for it -- nothing on this screen says
> where. The main menu has Preferences, maybe it's there. I wouldn't know without clicking.
>
> In the list, the refused one says "Not run: would take hours" in grey, not red, and no red x.
> That's better. Last time I thought it had run for hours and died.
>
> Run sampled. 18%, 101 sources, CPU, Cancel. Then it got canceled -- the moderator's story, not
> me -- and the row says "Not run" with a Run button. Fine.
>
> Open it: Sample size 500, "About 101 fits the time limit; 500 takes a few minutes and runs in the
> background." Seed 7. OK, a seed. Good, that means I can get the same answer twice. And it tells
> me 500 is allowed, just slower. That's what I'd want -- don't refuse me, just tell me.
>
> [Moderator: what does the finished result look like?] On this screen, I don't get to see it. I
> get to Run and then nothing.

## 7. The finished sampled result, from the other page

> Here's one finished. "Betweenness (sampled), 101 sources, Sep 28 09:52." Top nodes: patent
> 5879702 first, ~0.0160; 5902311 second; then three at "#3-#7". "Ranks below #2 may swap between
> runs." Huh. So only the top two are solid. That's a straight answer. I can say that to my
> director: "the top two are clear, the next five are a tie within the error". I'd actually say
> that.
>
> The run record: "Brandes betweenness from 101 random sources, scaled up by 124,318 / 101". Seed
> 7. "Error bound plus-minus 0.00035 on each value, 95 runs out of 100." OK, that's a confidence
> interval. I'd copy that whole box with the Copy button and paste it into my notes. That's the
> first time a tool has handed me the method paragraph for a slide footnote.
>
> Took 29.9 seconds. Time limit is 30. That's -- that's close. If the laptop's busy does it get
> refused next time? I'd wonder.
>
> But here's the thing. Up top it says "Sampled, 101 sources. Directed." The Options box says
> Direction: Directed. And the run record says "Citations read as undirected". And the refused
> screen said "the directed citations read as undirected". And the pop-up version of the same
> choice says "As the graph: directed". Which one ran? For betweenness on citations that matters --
> directed and undirected give different rankings. I'd need to know before I put a number in a
> deck. I'd go check it against NetworkX with directed=True and False and see which one matches.
>
> Also this one ran on WebGPU, 09:52, before anything was lost. So it's not the result I was
> trying to get in my story. I'm assuming mine would look the same with "CPU" and 500 sources.
> There's no screen that shows the 500-source run finished.

## 8. The pop-up version

> This is the same betweenness choice again but as a floating box over the empty canvas instead
> of the left panel. Same numbers, more rows: here "Sampled, 500 sources, a few minutes" is its own
> line under "Past the time limit". I actually like that better -- on the other screen I only found
> out 500 was allowed after opening the settings. Here it's a choice up front.
>
> "The top of the ranking is usually stable; a single score can be well off." Plain English. Good.
> But it's two different layouts for one decision. I don't know which one the real tool is.

## 9. The notice on another graph

> March transfers. Black bar at the bottom: "Could not run PageRank", "Show PageRank", close. The
> picture's still there. OK.
>
> Then the same screen after the bar goes away, and... nothing. No red dot, no mark on Results, no
> anything. If I'd been getting coffee I'd come back and not know a run died. [Moderator: the
> description says there should be a mark on Results.] Well, I don't see one. I zoomed in on the
> left bar. Graph, Data, Results, Notes -- nothing on Results. That's the "I don't know if it's
> doing anything" problem again, just after the fact instead of during.

## 10. The storyboard page

> Blank. White page. Same as last time.

---

## Single Ease Question

**5 out of 7.**

> The "what can I trust" part is a 6. "Showing Run 1 (damping 0.85). Run 2 wrote nothing." with the
> panel closed -- that's the sentence, that's the whole answer. And refusing the hours-long
> betweenness up front, with sampled as the default and a seed, is better than anything I use.
>
> What pulled it down: two screens told me two different things about how to get my PageRank
> back. One has Re-run on CPU, one doesn't and says CPU wouldn't fit. And the finished betweenness
> can't make up its mind whether it's directed. And I never saw my own 500-source run finish. So
> getting a result I can use, I'm still partly taking it on faith. Easier than last round, but
> faith is faith.

## Would he use this instead of his current tool?

> Not instead. Alongside, for the big runs. What I'd use it for is exactly this situation -- a run
> that's going to take ages, where I want to be told up front and get a sampled answer with an
> error bar and a seed I can quote. NetworkX gives me k and nothing else; this gives me the
> paragraph for the footnote. But I'd check the first result against NetworkX, and the directed /
> undirected thing would have to be settled before I trust a betweenness from it.

---

## Observations (moderator)

1. **The trust question is now answered with the editor closed.** The failed row in the list
   repeats "Showing Run 1 (damping 0.85). Run 2 wrote nothing." Alex read it correctly on first
   sight and named it as the answer to half the task. The high-severity finding from the last round
   (whose values a failed row holds) is resolved in this path.
2. **Two contradictory recoveries for the same failure.** The GPU-lost screens offer Re-run on CPU
   ("a few minutes") and Try WebGPU again, which "re-runs nothing by itself"; the Results panel
   offers only Try WebGPU again, which "runs damping 0.5", and hides the CPU route because a
   few-minute CPU run would pass the limit. Alex treated both as one product and could not tell
   which button produces numbers, or what he could do if WebGPU stayed lost. High: this is the
   step where he gets his result back.
3. **Direction contradicts itself on the finished sampled betweenness.** The state line and
   Options say Directed; the run record says "Citations read as undirected"; the refusal says "the
   directed citations read as undirected"; the pop-up says "As the graph: directed". For
   betweenness on a citation graph this changes the ranking, and Alex would not quote the number
   until he settled it outside the tool. High.
4. **The task still stops short of the participant's own finished result.** The only finished
   sampled betweenness is a different run (09:52, WebGPU, before the loss); nothing shows the CPU
   run on 500 sources finished. Alex completed the task partly by assumption again.
5. **The error bound and "Ranks below #2 may swap" landed strongly.** He produced a sentence for
   his director from it unprompted, and wanted the run record's Copy for a slide footnote. The
   last round's "no accuracy cue for the sample" is resolved.
6. **"Took 29.9 s" against a 30-second limit** made him wonder whether the same run would be
   refused next time on a busier laptop.
7. **The re-run completes quietly and the failed row disappears.** Run 3's row has no "done" or
   duration; he worked it out from timestamps. He would have kept the failed attempt visible,
   greyed, as history. Low.
8. **The 30-second limit still reads as someone else's setting**, with no pointer to where it is
   changed. Repeated from the last round.
9. **The refused row no longer looks like a failure.** Grey "Not run: would take hours" with no
   red mark; he did not misread it this time. Resolved.
10. **The cost choice has two layouts.** The Results-panel list (sampled 101, exact on subset,
    exact full) and the pop-up over the canvas (adds "Sampled, 500 sources, a few minutes" as a row).
    He preferred the pop-up's explicit 500 row but could not tell which is the real design.
11. **Mock defects seen by the participant:** the notice-cleared state shows no mark on the
    Results rail button although its caption promises one; the failed-run pages disagree on run
    times (Run 1 at 09:40 vs 10:14) and graph name ("Citations" vs "Citations 1999 to 2001"); the
    storyboard page is still blank in the participant view.
