# Grade: session r1-s21 -- Grace, back for the quarter, finds the shortest chain of introductions in the running club (friends.csv)

**Grade: S** (success). Both answers are right and were read off the run's Values list, the
place the answer key names for S. Prompt: Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, with
Ava, Ivan and Kofi in between. Follow-up: Ben, Theo, Ravi, Pia, Nora -- 4 introductions. Both
runs used Follow "All" and Weight "None", so neither falls into `meaning-wrong`.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `friends-ranked.txt` ran without error; every
step's screenshot matches its command, and every click landed on the control named in the tool's
reply. The session is not void.

## What the last screen shows (`16.png`)

- The run's Values: "Path 5 nodes, 4 edges".
- Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5. This is the answer key's follow-up chain.
- Made with: Analysis Shortest path, Ran Oct 8, 11:31:10 PM, From Ben, To Nora, Follow All,
  Weight None with "Not read -- weight's meaning is not set, and a path needs a distance." under
  it; Advanced run settings closed.
- The Graph tree lists Selection, Shortest path (4 hops, highlighted), PageRank (20), Everything.
  The PageRank sizes and colors are still on every node not on the path; the path's nodes and
  edges are black, and the legend reads "Shortest path / On the path" above the PageRank keys.

The main prompt's answer is on `09.png`: Values "Path 5 nodes, 4 edges", Nodes in order Chloe 1,
Ava 2, Ivan 3, Kofi 4, Milo 5; Made with From Chloe, To Milo, Follow All, Weight None, Ran Oct 8,
11:30:01 PM. This matches the answer key's chain for prompt A.

## Measures

- **Steps:** 16 after the start (`02.png` to `16.png`): 8 for the prompt, 7 for the follow-up.
  The answer key's success path is about 5 steps per question; the extra steps are the Analyze
  list, a scroll in it, and picking each name from its suggestion list with a separate click.
- **Wrong turns: 0.** The scroll in the Analyze list (`02.png` to `03.png`) was reading on to the
  right group, not a detour: the first click on the toolbar's Analyze button was the right entry,
  and she chose "Shortest path" from its description ("The fewest steps ... between two nodes")
  on the first look. She did not try the filter box.
- **False "done": none.** Both "done" claims are supported by the screen at the time (`09.png`,
  `16.png`); her counts (4 introductions, 3 in between) agree with "5 nodes, 4 edges" and the
  answer key. truth-on-screen: no wrong claim. Her remark that the second run replaced the first
  is correct (`16.png`: one "Shortest path 4 hops" row, the Chloe chain gone).
- **Wrong answers avoided:** she did not set a weight (the tie numbers are runs together, not
  distances), did not switch Follow to Out, and did not read names off the drawing, which has no
  names on (she said so, step 9).
- **Words from the prompt:** she did not go to the From field straight from the prompt's "from
  Chloe to Milo"; she reached the form through Analyze and its description.
- **Arrowheads against the chain:** on `09.png` the path runs against some arrows; she read
  "Follow All" as "ties count either way" (step 4) and did not doubt the chain.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 -- a second Shortest path run replaces the first without a word.** The Graph tree
   keeps one "Shortest path 4 hops" row and the first chain is gone from the drawing and the
   inspector; nothing on screen said it would be replaced. She had written the first chain down,
   so nothing was lost here, but a user who wanted both chains for one email would lose the first.
   Evidence: `16.png`, step 16 remark, debrief. (The answer key records the replacement as known
   behavior on this build.)
2. **Severity 1 -- the Weight line "Not read -- weight's meaning is not set, and a path needs a
   distance" reads like a warning on a run that is correct.** She wondered whether something was
   wrong and ignored it because nothing stopped her. On a fewest-people question the line is
   noise; a less confident user might stop or change the weight and get a wrong chain. Evidence:
   `04.png`, `09.png`, `16.png`, step 9 remark, debrief.
3. **Severity 1 -- the result counts in "hops" and "edges", not in steps or introductions.** She
   worked out that 4 edges = 4 introductions but would not show those words to her board.
   Evidence: `09.png` ("Shortest path 4 hops", "Path 5 nodes, 4 edges"), debrief.
4. **Severity 1 -- "Shortest path" is not a word she would have typed; she found it by scrolling
   past the ranking and grouping analyses and reading descriptions.** It cost one scroll here.
   She named "chain", "introduce" and "connect" as her own words; whether the filter matches them
   was not tried in this session. Evidence: `02.png`, `03.png`, debrief.
5. **Severity 1 -- the drawing shows the chain but not who is in it, because the ranked map has
   no names on.** She read the names from the Values list instead, which is the intended reading.
   Evidence: `09.png`, `16.png`, debrief. (Known on this build: friends.csv draws no names by
   default.)

What worked: the toolbar's Analyze button was where her history said analyses live; the
"Shortest path" description matched her question in plain words; typing a name and picking it
from the suggestion moved focus on to the next field; the numbered "Nodes in order" list was, in
her words, what she would paste into an email; "Shortest path" sat first under Recent for the
follow-up, which halved the clicks; and the path's black highlight left the PageRank colors and
sizes on every other node.

## What this says about the round

No build defect showed up: every control did what the answer key says, the run took one click
after the names were in, and no step was spent on a broken or misbehaving control. The problems
are wording and expectation findings (replacement of the earlier chain, a warning-like weight
line, graph-theory terms in the result). The participant is simulated and was told she had used
the analysis button before, so this pass is weak evidence until real users confirm it.
