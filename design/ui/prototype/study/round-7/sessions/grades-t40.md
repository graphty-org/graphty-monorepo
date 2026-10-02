# Grades: open a network too large to draw (patent citations)

The task: "The full patent citation network your group keeps -- every patent and the earlier
patents it cites, well over a hundred thousand of them -- is in your Downloads folder. Get a first
look at it in graphty. The file is a sample: a very big network of patents. If that is not your
line of work, treat it as your own biggest export."

The intended path: from the start screen, Open project or file... (or New from data..., or the
"Patent citations 1999-2001" row under Recent projects) leads to a notice on an empty canvas:
"Too large to draw. patent-citations-sample.csv has 124,318 nodes; a graph draws up to 50,000
nodes and 100,000 edges, so nothing was loaded", with "Choose another file..." and "Details".

Grading rule: success means the participant reached that notice and said that nothing was loaded,
why (the counts against the limits), and what they would do instead (open a part of the network
under the limit, or read Details). Success with difficulty means they read the notice only after
trying the file again. Failure means they believed part of it loaded or could not say what to do
next. Grades go by what was on screen at the end and what they concluded.

## The skeleton could not show the notice

No participant could reach the notice, because nothing on the start screen leads to it. In the
clickable skeleton:

- "Open project or file..." and the "Patent citations 1999-2001" row (its name, its "124,318
  patents" subtitle and its "..." > Open) all open the Les Miserables project.
- "New from data..." opens the door-entries import; the drop target and Ctrl+O open the
  transfers import.
- In the main menu, Open recent > Patent citations 1999-2001 only shows a passing message.

The notice itself exists and renders correctly when its screen is opened directly (the second
render of this task's success path). The click that should lead to it was never wired. This
round's sessions are therefore not evidence for or against the notice. They are evidence that a
participant given this task tries every one of the intended ways in, which the task needs.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| ML engineer, recommendation systems | gave up | gave up (caused by the skeleton) | Tried Open project or file, the patent row three ways (name, subtitle, "..."), New from data, drop, Ctrl+O and "3 more". Every one ended on Les Miserables or an unrelated import; the last screen is Les Miserables (13.png). Never saw the notice. His reasoning was correct for what he saw: the row he clicked showed a different dataset. |
| Expert Emma | gave up | gave up (caused by the skeleton) | Same set of entry points plus the main menu's Open..., Open recent and the project menu. Ended on Les Miserables after Open recent showed only a passing message (14.png), then one failed hover (15.png). Never saw the notice. |
| Computational biologist | gave up | gave up (caused by the skeleton) | Same set of entry points plus the main menu. Ended on the Open... file chooser listing three unrelated files (14.png). Never saw the notice. |

Totals: 0 success, 0 success with difficulty, 0 failure, 3 gave up. All three gave-ups come from
the missing link, not the design. Ease scores: 1, 1, 1 out of 7, all of them about reaching a file
that was never offered.

## What the sessions do show

1. All three tried Open project or file... first, and all three saw the patent row under Recent
   projects and tried it second. Both are intended ways in, so in a wired skeleton all three
   would have reached the notice on the first or second click. (3 of 3)
2. All three said, before anything went wrong, what they came to check: whether a very large
   file is refused or drawn as a hairball, and whether the app gives counts first. The
   biologist: "at that size what I need most is to be told what is happening". The ML engineer:
   "does it refuse to draw a 124k-node hairball by default, does it tell me nodes/edges and what
   it left out". This is exactly what the notice answers, so the task is a fair test of it once
   the link exists. (3 of 3)
3. Two of three asked for a part of the network in place of the whole (an ego network for one
   patent; "decompose, look at the degree distribution"). That matches the notice's suggested
   next step, so "what would you do instead" is a question these participants can answer.
   (2 of 3)

## Not filed as design findings

- The header reads "Les Miserables" behind the notice. That is a mock artifact; no participant
  reached the notice, so none commented on it.
- The patent network under Recent projects, as if it had been opened before, is a mock artifact.
  All three read it as "someone in my group already opened it" and picked it, which is a correct
  way in.
- Every entry point opening a different canned dataset (Les Miserables, door entries,
  transfers), the file chooser listing no Downloads file, and "3 more" not expanding are all
  skeleton stand-ins. They cost all three participants their trust (3 of 3 said a recent row
  that opens a different dataset is "worse than an error"), but they say nothing about the
  designed screens.

## Severity

- Skeleton wiring, severity 4 for the study (not for the product): the task cannot be completed
  in the skeleton. The start screen needs a way to the notice for this task -- the patent row,
  or Open project or file... while running this task -- and the task must be rerun with fresh
  participants before the notice is graded.
- Design findings: none can be graded from this round.

## Side observations worth keeping (single voices, not graded)

- The ML engineer noted Parquet is missing from the drop target's list of formats. (1 of 3)
- The ML engineer, on the transfers import's loader: "Reading transfers-2026-03.csv, 3,000 nodes,
  9,113 edges" with a progress bar and Cancel was the kind of feedback he wanted for a big file.
  (1 of 3)
- Two of three praised the import's match report and the Summary panel (counts, density,
  components, degree distribution) as "the first minute I want". (2 of 3)
