# Session: GPU unavailable at work -- Dr. Chen (computational biologist)

Task as given: "Your browser at work cannot use the graphics card for heavy calculations. Learn what graphty will do about it, and whether anything you run will be slower or different."

All commands ran from design/ui/prototype. Renders are in tmp/round-7-sessions/t32--bioinformatics-researcher/ (D below).

## Step 0 -- start screen (shots/tasks/t32/01.png)

"Les Miserables, 77 nodes, colored by PageRank. Nothing on this screen says anything about a graphics card. There is a 'Local only' chip at the top, which I like, but that is about where the data lives. There is a small toolbar at the bottom: flask, play, cube, list, and a lightning bolt. Lightning usually means 'speed' or 'acceleration'. I'll rest my pointer on it."

## Step 1 -- trying to name the lightning bolt

    timeout 120 node app-b/study.mjs --try D/01.png task:t32 --hover "lightning"
    -> nothing on screen is called "lightning"
    timeout 120 node app-b/study.mjs --try D/02.png task:t32 --hover "Performance"   (and "Speed", "Acceleration", "GPU")
    -> nothing on screen is called ...
    timeout 120 node app-b/study.mjs --try D/02.png task:t32 --hover "Quick actions"

"Quick actions, Ctrl+K. So the bolt is a command palette, not acceleration. Fine -- misleading icon for what I was after, but I see why. Not where the GPU lives."

## Step 2 -- main menu (D/03.png)

    timeout 120 node app-b/study.mjs --try D/03.png task:t32 --click "Menu"

"New project, Open, Select where..., Settings..., Keyboard shortcuts, Help. In Cytoscape this sort of thing is in Preferences. Settings it is."

## Step 3 -- Settings (D/04.png)

    timeout 120 node app-b/study.mjs --try D/04.png task:t32 --click "Menu" --click "Settings..."

"General, Privacy, Accessibility and input, Performance, Assistant, Headset, Diagnostics. Performance is the obvious one."

## Step 4 -- Settings > Performance (D/05.png)

    timeout 120 node app-b/study.mjs --try D/05.png task:t32 --click "Menu" --click "Settings..." --click "Performance"

"Right, this is the page. Reading it properly:
- GPU use: When available / Never / Required. 'When available: large runs use the GPU if this browser has one. Never: everything runs on the CPU. Required: a run that cannot use the GPU stops with the reason instead of running on the CPU.' Good. That answers 'what will graphty do': on my work machine it runs on the CPU, and it does not pretend otherwise. The Required option is actually what I would want for a benchmark -- no silent fallback. That is better than the OpenCL mess in Cytoscape, where layouts just quietly did something.
- GPU status: 'Idle. This graph (Les Miserables, 77 nodes) is below the threshold, so runs use the CPU.' Then a line explaining it can say Checking, Running on the GPU with the device name, Idle, Unavailable with a reason, or Error. So on my work browser I would presumably see 'Unavailable' plus a reason. Here it says Idle because the graph is tiny, which means this screen does not actually tell me whether THIS browser has a GPU. I'd have to load something big to find out. Mild annoyance.
- Use the GPU from N nodes: blank = 'each algorithm's own'. What is each algorithm's own? Which algorithms even have a GPU version? Not listed. I'd want a table: algorithm, GPU yes/no, threshold.
- Limits: draws up to 50,000 nodes / 100,000 edges, less detail above 10,000 nodes, selections up to 5,000, 'Sampled above 2,000 nodes, where an algorithm allows'.

That last line worries me more than the GPU. My STRING networks are 2,000-15,000 nodes. 'Sampled' -- sampled how, with what seed, and does it say so on the result? That is a 'different result', and it seems independent of the GPU. Also 'Draws up to 50,000 nodes, 100,000 edges' -- the full interactome background is several hundred thousand edges, so that's out regardless."

## Step 5 -- Diagnostics (D/06.png)

    timeout 120 node app-b/study.mjs --try D/06.png task:t32 --click "Menu" --click "Settings..." --click "Diagnostics"

"Logging, Detailed profiling (CPU and GPU time per run), frame rate. Profiling could let me measure the slowdown myself. Nothing about whether the results differ."

## Step 6 -- try Required (D/07.png)

    timeout 120 node app-b/study.mjs --try D/07.png task:t32 --click "Menu" --click "Settings..." --click "Performance" --click "Required"

"Selected. Status still says Idle, 77 nodes below threshold. Nothing else changes. I'd expect it to warn me that on this graph nothing would use the GPU anyway, or tell me whether Required would block anything. It doesn't."

## Step 7 -- does a run say where it ran? (D/08.png, D/09.png)

    timeout 120 node app-b/study.mjs --try D/08.png task:t32 --click "from Analyze"
    timeout 120 node app-b/study.mjs --try D/09.png task:t32 --click "from Analyze" --click "Betweenness"
    -> nothing on screen is called "Betweenness"
    timeout 120 node app-b/study.mjs --try D/09.png task:t32 --click "from Analyze" --click "Closeness"

"Analyze list. Betweenness and Closeness have a little clock icon -- I assume that means 'slow'. Couldn't open Betweenness from here, took Closeness instead. The form: weight, 'Closeness reads a weight as distance: it uses 1/value' -- good, that is the kind of statement I can put in a methods section. At the bottom: 'Under a second', Run. No word on CPU or GPU, and no estimate of what it would be on a big graph without a GPU. If the estimate accounts for my CPU-only browser, it should say so."

## Step 8 -- Help (D/10.png)

    timeout 120 node app-b/study.mjs --try D/10.png task:t32 --click "Menu" --click "Help"

"Documentation, Report a problem, About. I'm not going to go read documentation to find out whether GPU PageRank and CPU PageRank give the same numbers. Stopping here."

## Outcome

Do I think I succeeded? Partly. I learned what graphty does: with GPU use on 'When available' it runs on the CPU when the browser has no GPU, the status line would say Unavailable with a reason, and 'Required' makes a run stop instead of falling back. I can also turn on profiling to time things. What I did NOT learn: which algorithms use the GPU at all and from what size, how much slower the CPU path is on a graph my size, and -- the one I care about -- whether a CPU run gives the same numbers as a GPU run (ForceAtlas2-type layouts and floating-point sums can differ). The app never says the results are identical, and it never says they aren't. The 'Sampled above 2,000 nodes' line is a separate, bigger worry about different results that the page states but does not explain.

Single Ease Question: 5 of 7. Finding the page was quick once I gave up on the lightning bolt (which turned out to be Quick actions). Understanding its consequences was not.

Would I use this instead of my current tool? Not for this reason. Cytoscape and igraph run on the CPU anyway, so a CPU-only browser costs me nothing I have today. The explicit 'Required, stops with the reason' option is more honest than anything Cytoscape's OpenCL apps ever told me, and I'd note that in its favor. But until a run records where it ran (CPU or GPU, which device) and whether it was sampled, I cannot put its numbers in a methods section, so it stays a viewer for me.

## Specific points

- The lightning bolt in the bottom toolbar reads as "speed/acceleration" but is Quick actions; I spent four tries on it.
- GPU status on a small graph says Idle, so it cannot tell me whether this browser has a GPU at all until I load something big.
- "Each algorithm's own" threshold: no list of which algorithms have a GPU path or their thresholds.
- No statement anywhere that CPU and GPU runs give the same results (or how they differ).
- The run form shows a time estimate ("Under a second") but not whether it will run on CPU or GPU.
- Selecting Required gave no feedback about its effect on the current graph.
- "Sampled above 2,000 nodes, where an algorithm allows" -- unexplained, and it hits my typical network size.
