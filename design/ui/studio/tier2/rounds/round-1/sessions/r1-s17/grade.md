# Grade: session r1-s17 -- Ruth, back on the story, finds the shortest chain of introductions in her running club (friends.csv)

**Grade: S** (success). Both answers are right and both were read off the run's Values. Main
prompt: Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, 3 people in between (`11.png`). Follow-up:
Ben, Theo, Ravi, Pia, Nora -- 4 introductions, 3 in between (`18.png`, `19.png`). Both match the
answer key, and both runs used Follow "All" and Weight "None", which is what the key asks for. Her
one detour was a filter word that did not find the analysis. She cleared it on the next step, and
the filtered list's own heading is what showed her where to look, so it is a wrong turn but not the
longer detour that SD describes.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step ran and every screenshot matches its
command. At step 3 the tool reported `"Chloe" matched 5 options; took the first, the node`, which
is the option she meant (`03.png` shows the node Chloe selected). The session is not void.

## What the last screen shows (`19.png`)

- The run's Values: "Path 5 nodes, 4 edges". Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5.
  This is the answer key's follow-up chain.
- Made with: Analysis Shortest path, Ran Oct 8, 11:26:58 PM, From Ben, To Nora, Follow All, Weight
  None, with the line "Not read -- weight's meaning is not set, and a path needs a distance." under
  it.
- The Graph tree shows one "Shortest path 4 hops" row, highlighted, plus PageRank (20) and
  Everything. The find box holds "Ravi", whose four ties are listed (Pia -> Ravi, Quinn -> Ravi,
  Ravi -> Sana, Ravi -> Theo).
- The drawing shows the Ben-to-Nora chain in black down the left side. The Chloe-to-Milo chain from
  the first run is no longer drawn or listed anywhere (compare `11.png`).
- The main answer is on `11.png`: Values "Path 5 nodes, 4 edges", Chloe 1, Ava 2, Ivan 3, Kofi 4,
  Milo 5; Made with From Chloe, To Milo, Follow All, Weight None, Ran 11:25:35 PM.

## Measures

- **Steps:** 13 on the main prompt (`02.png` to `13.png`); the answer first appears at step 11.
  Steps 12 and 13 were her own checks of the links in the find box, not part of the answer. The
  success path is about 4 to 5 steps (p, or Analyze then Shortest path; From; To; Find path). She
  also went through a selected node and the Analyze list, which is an allowed route.
- **Follow-up (the second time):** 5 steps (`14.png` to `18.png`) to the answer, plus 1 check
  (`19.png`). The follow-up's success path is about 4 steps, so 5 meets the target of the success
  path + 1. 0 wrong turns on the follow-up.
- **Wrong turns: 1.**
    1. Step 6 (`06.png`): typed "link" in the Analyze filter, her own word for "how two people are
       linked". It returned Degree, Louvain, Leiden and Link prediction ("Which missing edges the
       shared neighbors suggest"). Shortest path is not among them. She cleared the filter and
       scrolled at step 7 (`07.png`), steered by the heading "Find paths and edge sets" that showed
       above Link prediction.
- **First move:** the find box (`02.png`), a place her history names. It was not a broken habit:
  selecting Chloe there filled the Shortest path form's From for her (`08.png`), so the habit led
  on to the task.
- **Words the prompt avoided:** she reached the From field through the form, not by going to it
  straight after reading the prompt.
- **False "done": none.** Each time she said she was finished, the screen showed the chain she
  named, in that order, with 5 nodes and 4 edges. Her claim at step 18 that the first chain was
  gone is true on screen. She checked links against the data: Ava -> Chloe (`02.png`), Ivan -> Ava
  and Ivan -> Kofi (`12.png`), Kofi -> Milo (`13.png`), Ravi -> Theo and Pia -> Ravi (`19.png`).
  All are in the lists shown. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she did not choose Follow Out, did not set a weight, did not read a
  chain off the unlabeled drawing, and did not doubt the chain because the arrows run against it.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

1. **Severity 2 -- the reader's own word for this question finds the opposite analysis.** Typing
   "link" in the Analyze filter returns Link prediction, which guesses at ties that are missing,
   and not Shortest path, which follows ties that exist (`06.png`). For a reporter, using
   invented ties instead of real ones would be a wrong story. She caught it because the
   description said "missing edges". She named "chain", "connected" and "introduce" as her other
   words; whether any of them reach Shortest path was not tried in the session. Evidence:
   `06.png`; transcript, step 6 and "What confused me" item 1.
2. **Severity 2 -- a second run replaces the first, and the first chain is gone without the
   participant choosing to remove it.** After the Ben-to-Nora run, the Graph tree still has one
   "Shortest path 4 hops" row and the Chloe-to-Milo chain is gone from the drawing and the
   inspector (`11.png` against `18.png`). The answer key documents this. She noticed it and had
   written the first chain down, so nothing was lost to her today, but she said she expected to
   keep both "on the map for the editor". This is a run that disappeared without the participant
   choosing to remove it, so it should be checked against the scripted list of open work for the
   "earlier work kept" bar (`not-kept`). Evidence: `18.png`, `19.png`; transcript, step 18 and item 4.
3. **Severity 2 -- the result does not say whether the chain is the only shortest one.** The
   Values give one chain and "5 nodes, 4 edges". Nothing on screen says whether another chain of
   the same length exists. On this data each pair has exactly one (answer key), so her answer is
   right. But a reporter cannot tell "the shortest" from "one of the shortest", and she said those
   are different sentences in a story. Evidence: `11.png`, `18.png`; transcript, "What I can't
   confirm".
4. **Severity 1 -- the Weight explanation is not understood.** "Not read -- weight's meaning is not
   set, and a path needs a distance." She read it twice, could not say what "meaning is not set"
   asks her to do, and left Weight at None. None was the right setting, so the task was not
   affected. Evidence: `08.png`, `15.png`, `19.png`; transcript, item 3.
5. **Severity 1 -- Shortest path is far down a long Analyze list of rankings.** The list opens on
   "Rank nodes and edges" (Degree through All-pairs distance). The "Find paths and edge sets"
   section is reached only by scrolling. She found it once she knew the heading. On the second
   run, Recent put Shortest path at the top (`14.png`). Evidence: `05.png`, `07.png`; transcript,
   item 1.
6. **Severity 1 -- the arrows on the drawing run against the chain.** Ivan -> Ava -> Chloe in the
   file, read as Chloe, Ava, Ivan in the result. The answer key documents this. Only the Follow
   "All" setting explains it. She understood, but said the drawing alone would have made her doubt
   the chain. Evidence: `11.png`, `12.png`; transcript, step 12 and item 5.
7. **Severity 0 -- the suggestion list under To covers the Follow row while it is open.** This is
   documented in the answer key. She noticed it and picked the suggestion, with no effect on the
   task. Evidence: `09.png`, `17.png`.

No implementation fault reached the participant: no crash, no error, no control that did nothing,
and every result she read was correct.

## What worked (from the screens)

- Selecting a person first filled From in the Shortest path form (`08.png`).
- The result came as numbered names in order, with Made with recording From, To, Follow, Weight and
  the time (`11.png`, `18.png`).
- On the second run, Shortest path appeared at the top of the Analyze list under Recent (`14.png`),
  and the second chain took 5 steps with no wrong turns.
