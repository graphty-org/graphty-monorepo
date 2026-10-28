# Grade: session r1-s19 -- Dana, a returning supply-chain analyst, finds the shortest chain of introductions in the running club (friends.csv)

**Grade: S** (success). The chain and the count are right and were read off the run's Values,
the answer key's success state for T18 A: Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, 3
people in between (`09.png`). The follow-up is right too: Ben, Theo, Ravi, Pia, Nora, 4
introductions (`14.png`, the last screenshot). Both runs used Follow "All" and Weight "None", so
neither falls into `meaning-wrong` (a chain from Follow Out, or with the tie numbers set as a
distance).

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The setup (`friends-ranked.txt`) ran to the end;
every step's screenshot matches its command; the tool printed no error. The session is not void.

## What the last screen shows (`14.png`)

- The run's Values: "Path 5 nodes, 4 edges"; Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4,
  Nora 5. This is the answer key's follow-up chain for A.
- Made with: Analysis Shortest path, Ran Oct 8, 11:30:12 PM, From Ben, To Nora, Follow All,
  Weight None with the line "Not read -- weight's meaning is not set, and a path needs a
  distance." under it; Advanced run settings closed.
- The Graph tree: Selection 1, Shortest path 4 hops (highlighted), PageRank 20, Everything. One
  Shortest path row: the second run replaced the first, as the answer key says it does.
- The drawing: five black nodes and four black edges on the left side; Chloe, who is not on this
  chain, is still drawn with the yellow selection highlight at about 716,744.
- The first chain, from the main prompt (`09.png`): Values "Path 5 nodes, 4 edges", Nodes in
  order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with From Chloe, To Milo, Follow All,
  Weight None.

## Measures

- **Steps, main prompt:** 8 after the start (`02.png` to `09.png`). The success path is about 6
  actions (p or Analyze, From, To, Find path). The two extra steps were the find box search and
  the click on its Chloe result; the selection they made filled From, so they fed the path rather
  than leading away from it.
- **Wrong turns, main prompt: 0.** The find box (`02.png`, `03.png`) is a place her history names,
  and the node's inspector it opens shows no way on to a path (the node's "..." menu, which holds
  "Path between...", was not opened). It is not counted as a broken habit, because the selection
  carried into the Shortest path form's From (`06.png`). Scrolling the Analyze list (`05.png`) is
  the route to the entry, not a detour.
- **Steps, follow-up:** 5 (`10.png` to `14.png`; steps 12 to 14 each hold two or three actions:
  clear From, type and pick Ben, type and pick Nora, Find path). Within the follow-up target of
  the success path + 1. **Wrong turns, follow-up: 0.** Reopening put From back on "Chloe" (her
  selection) with To empty (`11.png`), so she had to clear From first; this cost one action, not
  a wrong turn.
- **False "done": none.** Both answers she gave match the Values on screen and the answer key.
  truth-on-screen: her side remarks are accurate -- the path's start node is not black in
  `09.png`, Chloe stays yellow in `14.png`, and the first chain is gone after the second run.
- **Wrong answers avoided:** she kept Follow on All and Weight on None, did not read the chain off
  the drawing (no names are drawn), and did not name Farah, the node Chloe half-hides.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 -- the selection highlight stays on the selected node through every run and hides
   the path's color on it.** In `09.png` the chain's first node, Chloe, is drawn yellow, not black
   like the other four, so on the picture the chain "looked like it started one ball late"; in
   `14.png` Chloe is still yellow on a chain she is not part of, and the Graph tree still lists
   "Selection 1". She trusted the Nodes in order list instead, so it did not lead to a wrong
   answer; a reader who reads the drawing would miscount the chain by one. Evidence: `03.png`,
   `09.png`, `14.png`, step 9 and 14 remarks, debrief.
2. **Severity 2 -- Shortest path sits below the fold of the Analyze list, under the ranking
   entries.** She saw only PageRank, Degree, Betweenness and similar on opening and said that
   without scrolling she would have concluded it was not there. Evidence: `04.png`, `05.png`,
   debrief. (Once used, it appeared at the top under Recent, `10.png`.)
3. **Severity 2 -- the Weight line "Not read -- weight's meaning is not set, and a path needs a
   distance" is not understood.** She read it twice, called it "gibberish", and said that if she
   had wanted the numbers in her file she would not know what to do. None was right for this task,
   so it cost nothing here. Evidence: `06.png`, step 6 remark, debrief.
4. **Severity 1 -- the result counts "edges" and "hops", never steps or links between people.** She
   translated "4 edges" into 4 introductions herself. Evidence: `09.png`, debrief.
5. **Severity 1 -- "Follow: Out / All" is not explained, and the chain runs against some drawn
   arrows.** She kept All because it "sounded like use every link", and paused when one arrow on
   the black chain pointed back toward Chloe; she said that for her supplier data direction
   matters and she would want to know which way the chain went. The answer is the same either way
   here. Evidence: `06.png`, `09.png`, step 9 remark, debrief.
6. **Severity 1 -- a second run replaces the first, so two chains cannot be kept side by side.**
   She had written the first one down; she wanted both for a slide. Evidence: `14.png`, debrief.

What worked: the Analyze entry's one-line description ("The fewest steps ... between two nodes")
matched her question in her own words; From was filled with the node she had picked; the answer
came back as a numbered list in order, which she trusted over the picture; and the second time
the entry was at the top under Recent.

## What this says about the round

No build defect blocked or misled this session: every control did what the answer key says, the
tool reported no failed step, and no step was spent on a broken control. The participant's time
went to the task, not to fighting the interface. The findings are design ones: how the drawing
layers a selection over a run's result, where Shortest path sits in a list led by ranking
entries, and words ("Not read", "edges", "Follow Out") a returning analyst has to translate. These
are a simulated participant's observations; her history names the find box and the analysis
button, and she was no faster than a new user on anything it does not name.
