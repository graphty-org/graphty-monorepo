# Session: GPU unavailable at work -- what graphty does about it (Expert Emma)

Task as given by the moderator: "Your browser at work cannot use the graphics card for heavy
calculations. Learn what graphty will do about it, and whether anything you run will be slower or
different. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter."

Participant: Expert Emma (network scientist, notebook user, skeptical of opaque defaults).
Renders: design/ui/prototype/tmp/round-7-sessions/t32--expert-emma/NN.png

All commands were run from design/ui/prototype.

## Start screen (shots/tasks/t32/01.png)

"Les Miserables, 77 nodes, PageRank coloring. Nothing on this screen says GPU. There is a chip
up top that says 'Local only' -- that is the first thing I would click anyway, because where the
data goes is my first question. There is a lightning bolt in the bottom toolbar. Lightning usually
means 'fast' or 'accelerated'. Let me see what it is called."

## Step 1 -- the bolt

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/01.png task:t32 --hover "lightning"
    -> nothing on screen is called "lightning"

"I do not know its name, so I cannot ask for its tooltip. Fine. Leave it."

## Step 2 -- 'Local only'

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/02.png task:t32 --click "Local only"

"It opens Settings on Privacy. Good page, actually: 'Files you open: read on this computer.
Never uploaded.' Usage data off. 'What this does not promise' -- I respect that line. But that
is the data question, not the GPU question. On the left there is a 'Performance' entry. That is
where I would expect it."

## Step 3 -- Settings, Performance

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/03.png task:t32 --click "Local only" --click "Performance"

"OK. 'GPU use: When available / Never / Required.' The text explains all three: when available,
large runs use the GPU if the browser has one; never, all CPU; required, a run that cannot use the
GPU stops with the reason instead of running on the CPU. Good -- that last one means it will not
silently swap engines on me. That is the thing I actually care about for a benchmark.

GPU status: 'Idle. This graph (77 nodes) is below the threshold, so runs use the CPU.' Hm. That
does not answer my question. I asked whether THIS browser has a GPU. It is telling me the graph
is too small to bother. It says it would say 'Unavailable with a reason' otherwise, so I suppose
Idle means one exists? Or it never looked because the graph is small? I cannot tell.

'Use the GPU from N nodes -- Each algorithm's own.' Which algorithms? What are their own
thresholds? Not listed. I would want a table: algorithm, GPU path yes or no, threshold.

Limits: 'Sampled above 2,000 nodes, where an algorithm allows.' Now that is a 'different'
answer -- sampled betweenness is not exact betweenness. Is that because there is no GPU, or
always? It does not say. That line worries me more than anything about speed."

## Step 4 -- what 'Never' looks like (stand-in for my work browser)

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/04.png task:t32 --click "Local only" --click "Performance" --click "Never"

"Status changes to 'Off. Every run uses the CPU.' Clear. Still nothing about what that costs me:
how much slower, at what size it starts to hurt."

## Step 5 -- Diagnostics

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/05.png task:t32 --click "Local only" --click "Diagnostics"

"Logging, detailed profiling ('records CPU and GPU time for each frame and run'), frame rate
readout. So I could measure it myself. That is something, but it is me doing the benchmarking."

## Step 6 -- 'Required'

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/06.png task:t32 --hover "GPU"
    -> nothing on screen is called "GPU"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/07.png task:t32 --click "Local only" --click "Performance" --click "Required"

"Selecting Required: status still says 'Idle, below the threshold, so runs use the CPU.' Wait.
I said Required, and it says it will use the CPU. Is the threshold overriding 'Required'? Then
'Required' means 'required above some size I have not been told'. On my work machine, would
Required tell me 'Unavailable: no adapter' right here, or only when I run something big? I would
want it to tell me now."

## Step 7 -- does a run say which engine it used?

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/08.png task:t32 --click "from Analyze"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/09.png task:t32 --click "from Analyze" --click "Betweenness"
    -> nothing on screen is called "Betweenness"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t32--expert-emma/09.png task:t32 --click "from Analyze" --click "Which nodes sit on the most shortest paths between"

"'from Analyze' opened the algorithm list, not the record of the PageRank run, which is what I
wanted. Betweenness and Closeness have a little clock icon -- slow ones, presumably. Opened
Betweenness: weight, 'higher means stronger, uses 1/value as distance' -- good, it tells me how
weight is read. Footer: 'Under a second'. Nothing about CPU or GPU, nothing about whether it
would be sampled, no normalization. So at the moment I press Run, I do not know which engine or
whether the answer is exact. I stop here."

## Verdict

Succeeded? Partly. I learned what graphty does: with no GPU it runs everything on the CPU, and
there is a 'Required' mode that refuses instead of silently switching, and an off switch. I did
not learn the second half: how much slower, for which algorithms, and -- the part that matters --
whether anything comes out different. The status line answered 'is the graph big enough' instead
of 'does this browser have a GPU'. 'Sampled above 2,000 nodes' is the only hint of a different
answer, and it is not tied to the GPU either way. And a run does not say which engine it used.

Single Ease Question: 4 of 7. Finding the page was easy (two clicks, via the privacy chip).
Getting the answer out of it was not.

Would I use this instead of my current tool? Not for this. For analysis my notebook says which
library and which version ran; here I would need the run record to say "CPU, exact" or "GPU,
float32" and whether the result matches the CPU path. Give me a per-algorithm table (GPU path,
threshold, same result or not) and a status that says 'This browser: no WebGPU adapter' up front,
and I would trust it for the hand-off view. The privacy page, though -- that I would forward to
IT as is.
