# Session: t32 -- Chris, ML engineer (recommendation systems)

Task as given: "Your browser at work cannot use the graphics card for heavy calculations. Learn what
graphty will do about it, and whether anything you run will be slower or different."

Renders: design/ui/prototype/tmp/round-7-sessions/t32--ml-engineer-recsys/
All commands were run from design/ui/prototype.

## 01 -- start screen (shots/tasks/t32/01.png)

Think-aloud: "Les Miserables, 77 nodes. Up top there's 'Local only' and 'Full graph'. Down
at the bottom there's a floating toolbar: flask, play, cube, list, lightning bolt. The bolt is my
first guess for 'acceleration'. Nothing on the screen says GPU, CPU or WebGPU."

## 02 -- hover the bolt

    timeout 120 node app-b/study.mjs --try .../t32--ml-engineer-recsys/02.png task:t32 --hover "lightning"

Result: nothing on screen is called "lightning".
Think-aloud: "I can't name it, so I'll move on. In real life I'd rest my pointer on it, but I
don't know what it says."

## 03 -- click "Local only"

    timeout 120 node app-b/study.mjs --try .../03.png task:t32 --click "Local only"

Settings opens on Privacy. Think-aloud: "OK, the chip is about privacy, not compute. Good to see
'Files you open: read on this computer, never uploaded', because that's the first question my
privacy review would ask. But not what I'm after. There's a 'Performance' entry on the left."

## 04 -- Settings > Performance

    timeout 120 node app-b/study.mjs --try .../04.png task:t32 --click "Local only" --click "Performance"

Think-aloud: "This is it.
- GPU use: When available / Never / Required. With the default, if there's no GPU, it runs on the
  CPU. 'Required' stops with the reason rather than quietly falling back. That's the honest
  version, and I like it. A silent fallback would wreck any timing I take.
- GPU status: 'Idle. This graph (77 nodes) is below the threshold, so runs use the CPU.' Fine,
  but that doesn't tell me whether THIS browser even has a GPU. It says the status can read
  'Unavailable with a reason', but I can't see what my work machine would show.
- 'Use the GPU from N nodes': per-algorithm default threshold. OK.
- Limits: draws up to 50k nodes / 100k edges, less detail above 10k, 'sampled above 2,000 nodes,
  where an algorithm allows'.
What's missing: it never says how much slower the CPU path is, or whether results differ. And
the 'sampled above 2,000 nodes' line bugs me. Is sampling a CPU-only thing? If the CPU samples
and the GPU is exact, then my numbers ARE different without a GPU, and nothing here says so. My
real graph is millions of edges, so it's way past every limit on this page anyway."

## 05 -- choose "Required"

    timeout 120 node app-b/study.mjs --try .../05.png task:t32 --click "Local only" --click "Performance" --click "Required"

Think-aloud: "Required is selected, and the status still says Idle. No warning like 'this
browser has no GPU, so large runs will stop'. If I picked Required on my work laptop I'd want it
to tell me right there that I've just made big runs impossible."

## 06 -- Settings > Diagnostics

    timeout 120 node app-b/study.mjs --try .../06.png task:t32 --click "Local only" --click "Diagnostics"

Think-aloud: "'Detailed profiling: records CPU and GPU time for each frame and run.' That's
how I'd get real timings, which beats a 'GPU accelerated' badge. But it's off by default and it
doesn't show me a GPU vs CPU comparison. I'd have to run it twice myself."

## 07 -- one more try at the bolt

    timeout 120 node app-b/study.mjs --try .../07.png task:t32 --hover "GPU"

Result: nothing on screen is called "GPU". Think-aloud: "OK, the canvas has nothing about the GPU.
It's only in Settings. I'll stop."

## Outcome

Did I succeed? Partly. I learned what graphty does: with no GPU, large runs go to the CPU (the
default), or they stop with a reason if I choose Required. It never falls back silently. That's
the right policy, and it's clearly written. What I did NOT learn: whether anything is slower by a
number, or whether results come out different. The page gives no CPU vs GPU timing and no
statement that results are identical. The "sampled above 2,000 nodes" limit makes me suspect
that results can be approximate, but it doesn't say whether that depends on the GPU. I also
couldn't see what the status says on a browser that actually has no GPU. Here it only said
"Idle" because the sample is small.

Single Ease Question: 5 / 7. Finding it took two clicks once I guessed that "Local only" opens
Settings. The chip's name doesn't suggest that, and nothing on the canvas points to GPU status.
The second half of the question stays unanswered.

Would I use this instead of my current tool? Not on this evidence. My heavy compute already runs
on a remote GPU cluster, and the browser is a thin client. The "Required, never silently fall
back" policy and per-run profiling are points in its favor. But the limits (50k nodes drawn,
sampling above 2,000) say my real graph would be cut down anyway. I'd want two things first: a
line per run that says "computed on CPU, 3.2 s, exact" (or "sampled"), and a plain statement
of whether CPU and GPU results match.

## Problems noticed

- Nothing in the main window shows GPU status or where a run executed. It's only inside
  Settings, reached through a chip labeled "Local only" that reads as a privacy badge.
- The Performance page doesn't say whether CPU and GPU results are identical, or how much slower
  the CPU is.
- "Sampled above 2,000 nodes, where an algorithm allows" doesn't say whether sampling depends on
  having a GPU, or how a sampled result is marked.
- Choosing "Required" gives no warning about what it means on this browser (status stays
  "Idle").
- The status only shows the small-graph case ("Idle"). I couldn't see whether this browser lacks
  a GPU.
