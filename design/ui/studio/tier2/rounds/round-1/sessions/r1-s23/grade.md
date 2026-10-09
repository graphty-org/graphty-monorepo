# Grade: session r1-s23 -- Elena, a product manager back after a month, finds the shortest chain of introductions from Chloe to Milo (friends.csv)

**Grade: SD** (success with difficulty). The chain and the count are right and were read off the
run's Values, the place the answer key grades: Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, 3
people in between (`16.png`). The run used Follow "All" and Weight "None", so it does not fall into
`meaning-wrong`. It is SD rather than S because she first set out to work the chain out by hand
(looking up Chloe's and Milo's ties and comparing them), abandoned that, and then needed a second
word in the Analyze filter before finding Shortest path. The answer key grades "right chain after a
detour" SD.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every screenshot matches its command. At step 3
the tool reported an ambiguous name and took the node option, which is what a person clicking that
row gets. Step 5 was the driver's wrong name for the suggestion row (`option=Milo`): the tool
printed that nothing on screen is called that and the screen did not change (`05.png` is
byte-identical in size to `04.png`); the driver clicked the row by position at step 6. That is not
a tool fault and not a participant action. The session is not void.

**The follow-up prompt was not given.** The criteria give every successful T18 session one
follow-up prompt ("the second time"), word for word from `tasks.md`, once the participant says the
main prompt is done. This session ended at `--end` right after the first answer. The main task is
fully gradable, so the session stands, but the "second time" measure (steps and wrong turns on the
follow-up) has no result for this session and must not be counted as a pass.

## What the last screen shows (`16.png`)

- The run's Values: Summary "Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4,
  Milo 5. This is the answer key's chain A exactly, the only chain of that length.
- Made with: Analysis Shortest path, Ran Oct 8, 11:32:28 PM, From Chloe, To Milo, Follow All,
  Weight None with "Not read -- weight's meaning is not set, and a path needs a distance." under
  it; Advanced run settings closed.
- The Graph tree: Selection 1, Shortest path 4 hops (highlighted), PageRank 20, Everything.
- The legend: "Shortest path -- On the path" (black swatch) above the PageRank size and color keys.
- The path is drawn in black from the bottom middle to the top right, except Milo, who keeps the
  yellow selection ring from step 6 and reads as olive, not black.
- No files were saved; the task asks for none.

## Measures

- **Steps:** 15 after the start (`02.png` to `16.png`, counting step 5's no-op). The success path
  is about 5 (p or Analyze, From, To, Find path). Steps 2 to 6 were the hand-comparison, steps 9
  and 10 the filter words.
- **First move:** the find box (`02.png`), a place her history names. It is not a broken habit:
  it selected a node, and the selected node carried into the Shortest path form's From (`11.png`),
  as it did in r1-s19.
- **Wrong turns: 2.**
  1. Steps 4 to 6 (`04.png` to `06.png`): looked up Milo and compared his ties (Kofi, Lena, Nora,
     Omar) with Chloe's (Ava, Ben, Dev, Farah) to find someone in common, then concluded that "doing
     this by hand means opening friends of friends of friends" and abandoned the approach. A side
     effect: Milo, the destination, was the last node selected, so the form opened with From =
     Milo and she had to clear it (`11.png`, `12.png`); one action, not a separate wrong turn.
  2. Step 9 (`09.png`): typed "chain" in the Analyze filter: `No analysis matches "chain"`.
     Recovered on the next step with "shortest", a word she borrowed from the ranking entries'
     descriptions (`10.png`).
  Opening the Analyze list and reading past the ranking entries (`08.png`) is the route to the
  entry, not a detour.
- **Follow-up (the second time):** not given (see above). No steps or wrong turns to record.
- **False "done": none.** Her answer at step 16 -- Chloe, Ava, Ivan, Kofi, Milo; three in between;
  four introductions -- matches the Values on screen and the answer key. truth-on-screen: her side
  remarks are accurate. Milo's dot is olive, not black, because the selection ring stays on
  (`16.png`); the find list showed "Ava -> Chloe" (`02.png`), an arrow against the chain's
  direction.
- **Wrong answers avoided:** kept Follow on All (an Out run would be `meaning-wrong`), kept Weight
  on None, read the chain off Nodes in order rather than the drawing (no names are drawn), and did
  not name Farah, whom Chloe half-hides.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None is a build defect: every control she used did what the
answer key says it does, and no step was spent on a broken control.

1. **Severity 2 (confirmed: this session and r1-s19) -- the selection highlight stays on a node
   through a path run and hides the path's color on it.** Here the destination, Milo, keeps his
   yellow ring and reads olive; she "almost thought he wasn't part of it until I read the list". A
   reader of the drawing alone would count the chain one short. Evidence: `06.png`, `16.png`,
   debrief.
2. **Severity 2 (confirmed: this session and r1-s01) -- the Analyze filter does not match the
   reader's own word for a path.** "chain" found nothing; she found the entry only because the
   ranking entries' descriptions happened to say "shortest paths". r1-s01 met the same with
   "quickest" for the same entry. Evidence: `09.png`, `10.png`, debrief ("If I hadn't read those
   little grey lines I'd have been stuck reading friends lists by hand").
3. **Severity 2 (confirmed: this session and r1-s19) -- Shortest path sits below the fold of the
   Analyze list, under a long run of ranking entries.** She saw Degree, Betweenness, Katz, HITS and
   others and "the one I needed was further down, under a heading I never saw until I filtered".
   Evidence: `08.png`, `10.png`, debrief.
4. **Severity 2 (confirmed: this session and r1-s19) -- the Weight line "Not read -- weight's
   meaning is not set, and a path needs a distance" is not understood and reads as a warning.** She
   did not know whether she had to act on it. None was right here, so it cost nothing. Evidence:
   `11.png`, `16.png`, debrief.
5. **Severity 1 (confirmed: this session and r1-s19) -- "Follow: Out / All" is unexplained, and the
   chain runs against some of the file's arrows.** She kept All without knowing what it meant and,
   after seeing "Ava -> Chloe" in the find list, was "not totally sure whether the direction of the
   arrows should have mattered for introductions". The answer is the same either way here.
   Evidence: `02.png`, `11.png`, `16.png`, debrief.
6. **Severity 1 (confirmed: this session, r1-s18 and r1-s19) -- the result counts "hops" and
   "edges", never introductions or steps between people.** The tree says "4 hops", Values "5 nodes,
   4 edges"; she counted it herself to be sure. Evidence: `16.png`, debrief.
7. **Severity 1 -- From is filled with the last-selected node even when that node is the
   destination.** Milo, whom she had selected only to see where he sat, went into From, and she had
   to clear it. Evidence: `11.png`, `12.png`, debrief.
8. **Severity 1 -- a find-box search lists a node's ties but marks nothing on the drawing until a
   row is clicked.** "Nothing on the picture lit up that I can see." She clicked the row and got the
   ring. Evidence: `02.png`, `03.png`.

What worked: the Shortest path entry's description ("The fewest steps ... between two nodes")
matched her question once she found it; picking a suggestion moved focus on to the next field and
then to Find path (`13.png`, `15.png`); and the answer came back as a numbered list in order, "the
sentence I'd paste into Slack".

## What this says about the round

No implementation issue reached the participant: no broken control, no wrong value, no console
error, and the tool reported no failed step. Her extra steps went to design questions -- finding a
path tool from a habit that leads to reading ties by hand, a filter that does not know the reader's
word, and labels ("Not read", "Follow", "hops") she had to translate. The one gap in this session
is the run's: the follow-up prompt was not given, so the "second time" measure is missing for it.
These are a simulated participant's observations; her history names the find box and the analysis
button, and she was no faster than a new user on anything it does not name.
