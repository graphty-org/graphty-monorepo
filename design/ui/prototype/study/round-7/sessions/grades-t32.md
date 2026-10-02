# Round 7 grades: what happens when the work browser cannot use the graphics card (Les Miserables)

Task as given: "Your browser at work cannot use the graphics card for heavy calculations. Learn
what graphty will do about it, and whether anything you run will be slower or different."

Grading bar:

- Success: Settings > Performance is reached and the participant reads that the graphics card is
  not available, that calculations run on the processor, and what that means for speed, with no
  silent change to results.
- Success with difficulty: the same page reached through Quick actions or Help, or after a wrong
  turn or a long search.
- Failure: believes results will be estimated differently, or cannot reach the setting.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | What they concluded |
|---|---|---|---|---|
| Network scientist (Expert Emma) | success with difficulty | success with difficulty | Betweenness run form, after Settings > Performance | no GPU means every run uses the processor; Required stops instead of switching; speed and sameness of results unknown |
| Computational biologist (Dr. Chen) | success with difficulty | success with difficulty | Help menu, after Settings > Performance | the same; added that a run never says where it ran |
| ML engineer, recommendation systems (Chris) | success with difficulty | success with difficulty | Settings > Diagnostics, after Settings > Performance | the same; suspects sampling may make results approximate but does not say it does |

Totals: 0 success, 3 success with difficulty, 0 failure, 0 gave up. All three reached Settings >
Performance and read the policy correctly: without a graphics card graphty runs on the processor,
and the Required setting stops a run with its reason rather than switching engines quietly. None
of them could answer the second half of the task -- how much slower, and whether anything comes
out different -- because the page does not say.

## Why each grade

**Every grade is capped below success for the same two reasons, one the design's and one the
prototype's.**

- The design's: the success bar asks the participant to read "what that means for speed". The
  Performance page, including the target screen (the "no GPU" version, render 02 in the task's
  success path), says nowhere how much slower the processor is or at what size it starts to
  matter. No participant could meet that part of the bar on any screen.
- The prototype's: the target screen shows "Unavailable. This browser has no WebGPU, so every run
  uses the CPU." That version is only reachable by typing its address; clicking Settings >
  Performance always shows the other version, "Idle. This graph (77 nodes) is below the threshold,
  so runs use the CPU." So no participant ever saw the "graphics card not available" line. They
  inferred it from the help text ("it says Checking, ... Unavailable with a reason, or Error"),
  and all three said so. This gap is the prototype's, not the participants', and it does not lower
  their grades, but it does mean this round did not test whether the "Unavailable" wording is
  understood.

None of them is a failure: all three noticed the "Sampled above 2,000 nodes, where an algorithm
allows" line as a possible source of different results, but none concluded that losing the
graphics card changes the results. Emma said it is "not tied to the GPU either way", Dr. Chen
that it "seems independent of the GPU", and Chris that the page "doesn't say whether that depends
on the GPU". That is doubt, correctly placed, not a wrong belief.

**Network scientist -- success with difficulty.** Tried the lightning bolt in the bottom toolbar
first, as "acceleration", and could not name it. Then clicked the "Local only" chip (a privacy
badge), which opened Settings on Privacy; from there she clicked Performance (render 03). She
read all three GPU use options correctly, then tried Never ("Off. Every run uses the CPU.") as a
stand-in for her work browser. A wrong first try plus an entry through an unrelated chip is a
wrong turn. She ended on the Betweenness run form, looking for which engine a run would use, and
found none.

**Computational biologist -- success with difficulty.** Spent four tries on the lightning bolt
before learning it is Quick actions, then took the intended route: Menu > Settings... >
Performance (render 05). Read the page the same way as Emma. Tried Required (no visible effect on
a 77-node graph), checked Diagnostics, opened the Closeness run form ("Under a second", nothing
about the engine), and stopped on the Help menu without opening documentation. The longest search
of the three, ending in the right conclusion.

**ML engineer -- success with difficulty.** Same path as Emma: the bolt (no name), then "Local
only" > Privacy > Performance (render 04). Read the policy correctly and called it "the honest
version". Tried Required and Diagnostics. Ended on Diagnostics, with the conclusion that the
policy is right but speed and sameness of results are unanswered.

## What the sessions say about the design

Counts are out of three. Severity is Nielsen's 0 to 4.

| Finding | Seen by | Severity |
|---|---|---|
| The Performance page never says what running on the processor costs in speed, or whether processor and graphics-card runs give the same numbers. This is the second half of the task, and no screen answers it. | 3 of 3 | 3 |
| "Sampled above 2,000 nodes, where an algorithm allows" reads as a different, approximate result, with no word on whether it depends on the graphics card, how it is sampled, or how a sampled result is marked. All three called it a bigger worry than speed. | 3 of 3 | 3 |
| A run never says where it ran or whether it was exact. Two opened a run form and found a time estimate ("Under a second") but no engine; all three asked for a per-run line such as "processor, 3.2 s, exact". | 3 of 3 | 3 |
| GPU status on a small graph says "Idle, below the threshold", which answers "is this graph big enough" instead of "does this browser have a graphics card". All three wanted the device answer up front, whatever the graph size. | 3 of 3 | 3 |
| Choosing Required gives no feedback about this browser (status stays "Idle"); two read it as "Required is overridden by the threshold" or wanted a warning that large runs are now blocked. | 3 of 3 | 2 |
| The lightning bolt in the bottom toolbar reads as "acceleration" and was everyone's first try; it is Quick actions. Nothing outside Settings shows graphics-card status. | 3 of 3 | 2 |
| "Use the GPU from N nodes: each algorithm's own" -- no list of which algorithms have a graphics-card version or their thresholds. | 3 of 3 | 2 |
| Two of three reached Settings through the "Local only" chip. It worked, but the chip's name does not suggest Settings, so it is a lucky entry rather than a signpost. | 2 of 3 | 1 |

What worked, 3 of 3: the GPU use explanation. Every participant read "When available / Never /
Required" correctly, and all three singled out "a run that cannot use the GPU stops with the reason
instead of running on the CPU" as the policy they trust, because a quiet switch would spoil any
timing or benchmark.

## Note for the next round

To test the "Unavailable" wording itself, the session needs a way to reach the no-graphics-card
version of the page by clicking -- for example a starting state where the browser already reports
no WebGPU -- rather than only by address.
