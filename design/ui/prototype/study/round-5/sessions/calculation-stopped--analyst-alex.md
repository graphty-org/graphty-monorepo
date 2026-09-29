# Session: a long calculation stopped partway -- Analyst Alex

Participant: Alex, data analyst on an operations analytics team at a logistics company. Computes
metrics in NetworkX, draws in Gephi. Has had betweenness run "over lunch and then some" and a
Cytoscape layout hang silently, so a long run that dies is his worst case.

Task as given by the moderator: "A long calculation on the citation graph stopped partway through.
Decide what you can still trust on the screen, and get a result you can use."

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/r4-alex-stopped-gpu-lost-run.png` -- the patent citation graph, six states: a PageRank
  re-run in progress; the run failing at 62%; a betweenness run refused as too slow; a sampled
  betweenness run in progress; the sampled run canceled; the sampled run's settings
- `shots/r4-alex-stopped-notices-errors.png` -- other failure notices (undo, a file that would not
  open, a failed PageRank on another graph, save failed, canvas lost, no WebGL)
- `shots/r4-alex-stopped-selection-over-cap.png`, `shots/r4-alex-stopped-closeness-variant.png` --
  glanced at, not part of his path
- `shots/r4-alex-stopped-failure-and-recovery.png` -- the storyboard page; in the participant view
  it renders as a blank white page, so he saw nothing there

---

## 1. Before it stopped: the run in progress

> OK, "Patent citations". 124,318 nodes, 1,480,221 edges, directed. That's big -- that's bigger
> than the thing that took four hours in NetworkX. The middle of the screen is empty. "124,318
> nodes not drawn. Narrow the graph..." Fine, I wasn't expecting a picture of a million edges.
> Kind of a relief, honestly, it's not pretending.
>
> PageRank panel: "Running, 62%, on: full graph, 124,318 nodes. WebGPU." Damping 0.5. And there's a
> progress bar in the right-hand list and another one at the bottom, "Running PageRank", with
> Cancel. Good. That's the thing I never get in NetworkX -- a percentage and a Cancel. I'd sit on
> this.
>
> "Showing the run before -- damping 0.85." Hm. Showing where? There's nothing drawn and no table
> open. I think it means: if I look at PageRank values right now, they're from an older run at
> 0.85. OK. That's actually a useful line, I just don't see the values it's talking about.
>
> WebGPU. I don't really know what that is. Graphics card, I assume. The laptop has whatever Intel
> thing IT gave it.

## 2. It stopped: what can I trust?

> Right, now it's red. "Could not run PageRank: WebGPU lost; new runs use the CPU." The row says
> "Failed" with a red x. At least it says failed -- it didn't just freeze and leave the bar at 62%.
> That's the Cytoscape thing, and this isn't that.
>
> "WebGPU lost." Lost how? Did I do something? Did Chrome crash a tab? I have forty tabs open, it's
> probably me. It doesn't say whether I can get it back -- reload the page? Restart Chrome? Or is
> it gone for the day? "New runs use the CPU" -- so it's decided that for me. Fine, I guess, but I'd
> want to know if reloading brings the fast one back, because "takes a few minutes on the CPU"
> versus whatever it was doing before matters when I've got a meeting at three.
>
> Details: "Engine CPU; WebGPU lost. Run 2, failed at 62%. Code E_DEVICE_LOST." The code is for IT,
> not me. "Run 2" -- so run 1 was the 0.85 one. OK.
>
> So what do I trust. Let me actually go through it:
>
> - Nodes, edges, directed -- that's the data, not a calculation. Trust.
> - In-degree -- no mark on it, no red. It's been there since before. I'd trust it, it's just
>   counting. Though... it doesn't say what engine or when, and the other rows do. I'm assuming.
> - PageRank -- this is the one. The row says Failed. But the panel says it's still showing the
>   0.85 run. So the numbers exist, they're just not the numbers I asked for. I would NOT put those
>   in a deck as "PageRank" without saying 0.85. And here's my problem: the row out there just says
>   "PageRank -- Failed". If I close this panel, does anything on the row still say "these are the
>   0.85 values"? It says Failed. If I open the table and there's a PageRank column full of numbers,
>   is it marked old? I can't tell from this. Failed next to a column full of numbers reads like the
>   numbers are broken, OR like they're fine and only the rerun died. Which one?
> - Components -- "not computed". Honest. Nothing to trust or distrust.
>
> Honestly, 0.85 is the default, it's what NetworkX uses, it's what I'd have used anyway. I set 0.5
> because -- in this scenario I apparently did, I wouldn't normally. So for me the old run is maybe
> the result I actually want. I'd just want to be sure it's complete, not half of run 2 mixed in.
> Nothing says "run 1: complete, 0.85". It says "the run before". I'll believe it, but that's a
> question my manager would ask.

## 3. Re-run on CPU

> Big blue button: "Re-run on CPU". Tooltip: "Takes a few minutes on the CPU." OK, a few minutes I
> can do. That's what I'd click. Actually no -- first I'd ask, is it going to rerun at 0.5 or 0.85?
> The box still says 0.5, so, 0.5 I guess. Fine, that's what I asked for.
>
> [Next state] PageRank row now says "CPU", no red. So it finished? There's no "done", no time it
> took, no damping on the row. I'm guessing it worked. If I hover the row maybe it tells me. I'd
> click it and check the damping in the panel -- if it says 0.5 and no "showing the run before"
> line, then I believe it. That's one extra click every time, but OK.
>
> The Engine line up top now says "CPU; WebGPU lost" permanently. It's like a warning light on the
> dashboard that doesn't go off. I'd stop seeing it after ten minutes.

## 4. Betweenness gets refused

> Now what I'd actually do next on a citation graph -- who are the bridges. Betweenness.
>
> "Takes hours. The time limit is 30 seconds." Ha. OK. That's the most honest thing a tool has ever
> told me. That's the four-hour lunch, and it's telling me BEFORE, not after. That's worth a lot.
> Though -- what time limit? Did I set 30 seconds? Is that a setting? I'd look for it, because some
> days I'd happily let it run over lunch if I KNEW it was going to be three hours and not fourteen.
>
> Three options:
>
> - "Sampled, 101 sources -- under a minute." Highlighted, that's the default.
> - "Exact, on 5,318 nodes -- under a minute." Which 5,318? Where does that number come from? The
>   biggest component? The top by degree? A filter I made? I don't know, and I wouldn't pick it
>   without knowing, because "exact on some subset I can't name" is worse than "sampled on
>   everything" when I have to explain it.
> - "Exact, on the full graph -- hours", under "Past the time limit". Can I pick it? It's greyer.
>   Maybe not. If I can't, I'd want it to say so.
>
> "Sources." Sampled 101 sources. I sort of know this -- NetworkX has a k parameter on betweenness,
> you pick k nodes instead of all of them. I think this is that. If I didn't have that, "sources"
> would mean nothing. It doesn't tell me how wrong a sample of 101 out of 124,000 is. That's the
> thing I need: is the top 20 going to be the same top 20? Because nobody's reading 124,000 scores,
> they want the top twenty and why. If the top twenty wobbles with a different sample, I can't use
> it.
>
> Meanwhile, over in the list, there's a "Betweenness" row with a red x and "hours". Red x is what
> "Failed" looked like two minutes ago. So did it run and fail? Did it run for hours? No -- it never
> ran. But it looks the same as the PageRank that died. I read that wrong for a second.
>
> I'd press "Run sampled".

## 5. Running, cancel, and the settings

> New row: "Betweenness (sampled)", CPU, 18%, Cancel on the row and at the bottom. Good, the name
> says sampled. If I export this, I hope the column header also says sampled -- that's what saves me
> when someone copies the number into a slide.
>
> [Canceled] "Not run" and a Run button. Clean. The old red "hours" row is still sitting there
> above it though. Now I have two Betweenness rows and neither has any numbers. I'd want to delete
> the red one, I don't see how. Right-click probably.
>
> [Settings] OK, this I like. "Sample size 500. About 101 fits the time limit; 500 takes a few
> minutes and runs in the background." And "Seed 7". A seed! That's the Louvain problem -- run it
> twice, get different answers. With a seed I can rerun next month and get the same sample. That's
> the thing I'd point to if my manager asked "why did the numbers change".
>
> I'd set 500 and run it. A few minutes, in the background, with the Cancel I just saw. That's a
> result I'd use for "these are the bridges", with a footnote: sampled, 500 sources, seed 7.
>
> But -- and this is the part where I'm stuck -- I never get to see it finish. There's no screen
> with the sampled result done: no top nodes, no "estimate" marker, no "plus or minus". So I don't
> actually know if what comes out is something I can defend. I made it to "Run". I didn't make it to
> "result".

## 6. The other failure screens (glanced)

> The "Canvas not available" one, on Les Mis: "Graphics device lost; the graph, results and
> selection are still held. Restart viewer returns to the last save, 10:42." Wait -- restart
> returns to the LAST SAVE? So anything since 10:42 is gone if I click Restart? Then I click
> "Download project file" first, every time. It's the blue one, so I guess that's what they want. At
> least it tells me before I click.
>
> "Graphics device lost" here, "WebGPU lost" on the citation one. Same thing? Different thing? To me
> both mean "the graphics card fell over". If they're different, I can't tell.
>
> "Could not run PageRank" with "Show PageRank" at the bottom, on the transfers graph -- that's a
> popup, and the citation one never had a popup, just the red row. If I'd closed the panel and was
> in another tab, would I have noticed the red row? On the citation screen the running bar at the
> bottom just... went away.
>
> "Could not save the project: browser storage full. Download project file." Good that it says so
> and gives me the way out. My Gephi reopening-without-colours thing would have been this.
>
> The betweenness one on proteins: "on: full graph, 300 nodes, 3 components; exact; CPU." That line
> is what I wanted on the PageRank row. It says what it ran on and how. Why is that not on every
> row?
>
> Closeness "WF-corrected" -- no idea. I'd ignore it until a number surprised me. The selection one
> with the "12,113" bubble and "3,000 nodes, 9,113 edges" -- oh, 3,000 plus 9,113. Took me a second.
> Not my task.

## 7. What I'd tell someone I trust, and the result

> Trust: node and edge counts, in-degree, the PageRank from the earlier run at 0.85 -- as long as I
> label it 0.85 -- and after the CPU rerun, PageRank at 0.5, once I've clicked in and checked.
> Don't trust: anything with a red x, but also don't assume the red x means "ran and broke"; one of
> them never ran at all.
>
> Result I can use: PageRank, yes. Betweenness, a sampled run with 500 sources and a seed, which I'd
> label as sampled. I didn't see it finish, so I can't say whether I'd put it in front of a
> director.

## 8. Single Ease Question

**5 out of 7.**

> Knowing it failed was easy, it's red and it says failed. Getting PageRank back was one button.
> What took longest was working out whose numbers were on screen -- "the run before" is only in
> the panel, and the row says Failed -- and then the betweenness choices, which 5,318 nodes, and
> whether 101 sources is good enough. And I never saw a finished result, so I'm giving it a 5 on
> faith.

## 9. Would I use this instead of my current tool?

> For this part -- the long calculation part -- probably yes, over NetworkX-then-wait. It told me
> it would take hours before it started, it offered me a sample with a seed, it has a Cancel, and
> when the graphics thing died it said so instead of hanging. That's every bad afternoon I've had
> with betweenness, addressed. In Python I'd set k and a seed and wait and hope.
>
> But I'd still check the top 20 against NetworkX the first time, because nothing told me how far
> off a sample is. If it matched, I'd stop checking. If it didn't, I'm back in Jupyter.

---

## Observations (moderator)

1. **Honest failure landed well.** The red "Failed" row, "failed at 62%", and the refusal before a
   multi-hour betweenness run were the two moments Alex called out as better than any tool he uses.
   He never assumed a hang.
2. **"Whose values are showing" lives only in the open editor.** Alex understood "Showing the run
   before: damping 0.85" but asked twice what the Results row and a table column would say once the
   editor is closed. A row reading "Failed" beside a column of valid older numbers is ambiguous to
   him: broken numbers, or a broken rerun. He wanted the row to name the run whose values it holds.
   Severity high: this is the exact point where an old number gets quoted as a new one.
3. **A refused run looks like a failed run.** The unrun "Betweenness" row shows the same red x as
   the PageRank that died, with "hours" beside it. Alex briefly read it as "ran for hours and
   failed". He also could not see how to remove it once the sampled row existed.
4. **"Exact, on 5,318 nodes" is unexplained.** He would not choose it without knowing which nodes;
   an exact number on an unnamed subset is harder for him to defend than a sampled number on all.
5. **No accuracy cue for the sample.** "101 sources" meant something only because he knows
   NetworkX's k. Nothing told him whether the top 20 would be stable. He will validate against
   NetworkX the first time regardless.
6. **The path stops before a result.** No state shows a finished sampled betweenness with its
   estimate marking, so the task's "get a result you can use" could not be completed on the mocks.
   His SEQ of 5 is explicitly "on faith".
7. **Re-run completion is quiet.** After "Re-run on CPU" the row shows only "CPU": no done, no
   duration, no damping. He would click in to confirm 0.5 was used.
8. **"WebGPU lost" gives no way back.** He asked whether a page reload restores the fast engine;
   nothing says. The permanent "CPU; WebGPU lost" line in Statistics he predicted he would stop
   seeing.
9. **Wording mismatch across failures:** "WebGPU lost" versus "Graphics device lost"; a failure
   notice over the canvas on one graph but none on the citation graph. He wondered whether he would
   notice a failure in the background with the editor closed.
10. **"The time limit is 30 seconds" reads as someone else's setting.** He wanted to know where to
    change it, for days he would accept a known three-hour run.
11. **"Restart viewer returns to the last save, 10:42"** was read correctly as "you lose work since
    10:42", which made the Download button the obvious first click. Worked as intended.
12. **Mock defects seen by the participant:** the storyboard page renders blank in the participant
    view; the protein betweenness notice shows the title "Protein interactions" over a graph list
    reading "Co-appearances".
