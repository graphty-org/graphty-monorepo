# Grade: session r1-s47 -- Elena, back after a month, finds who is within two steps of Ava (running club, friends.csv)

**Grade: S** (success). Her count is right: 14 people besides Ava (Ben, Chloe, Dev, Eli, Farah,
Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo), read from the screen's own heading "Ava's 14
connections within 2 hops", with Follow on All. The drawing is narrowed to exactly Ava and those 14:
the header chip reads "15 of 20 nodes" and 15 dots are drawn. Both halves match the answer key's
success state, reached on the key's route with no detour.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `friends-ranked.txt` reached its end state
(PageRank run styled, Style tab). Every step's screenshot matches its command. Two clicks matched
more than one control by name ("Ava" in the find results and on the drawing; "2" on the Hops button
and in Dev's weight cell); in both the tool took the control a person aiming at it would hit (the
node row, the Hops "2" button), so neither is a tool fault. The session is not void.

## What the last screen shows (`06.png`)

- Header chip: "15 of 20 nodes" with a filter icon.
- Inspector: "Ava -- Neighborhood", "Ava's 14 connections within 2 hops", Hops 2 chosen, Follow All
  chosen, "Filter to neighbors" drawn as a filled blue (pressed) button, and the 14 names above in
  alphabetical order.
- Drawing: 15 dots, all ringed in yellow; the five people left out (Lena, Milo, Nora, Omar, Pia, the
  top-right group in `05.png`) are gone.
- Left panel: Selection 15; the PageRank row now carries the history (out-of-date) icon and still
  reads 20.

## Measures

- **Steps:** 5 after the start (`02.png` to `06.png`): find box, pick Ava, Degree row, Hops 2,
  Filter to neighbors. The key's success path is 5 steps.
- **Wrong turns: 0.** Typing in the find box instead of pressing "/" and Enter, and opening the list
  from the Degree row instead of the "g" shortcut, are routes the answer key accepts. She never chose
  Hops 1 as the answer, never touched Follow, and never filtered on an attribute.
- **False "done": none.** She claimed 14 people and "the drawing has only Ava and her 14 people";
  the screen shows both ("Ava's 14 connections within 2 hops", "15 of 20 nodes", 15 dots).
  truth-on-screen: no wrong claim.
- **Wrong answers avoided:** not 6 (Hops 1), not 6 with Follow Out (`meaning-wrong`), not 15
  presented as excluding Ava.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None of these is a build defect: every control did what the
answer key says it does on this build.

1. **Severity 2 -- the way to "who is near this person" is hidden behind the "Degree 6" row.**
   Nothing on Ava's Values tab says "see who she is connected to"; she clicked the row only because
   of its small chevron and because her history named reading a person's connections on the right.
   A returning user without that memory has no word on screen to lead them there. Evidence:
   `03.png` (Summary: id, Degree 6 with a chevron), step 4 remark, debrief.
2. **Severity 2 -- after the filter, the PageRank row's icon changes to a history symbol with no
   words, and she could not tell whether her ranking was now wrong or needed rerunning.** She
   chose to ignore it; another reader could rerun it or distrust the sizes, though the answer key
   says the ranking is not stale for this task. Matches the key's "record any participant who reads
   the mark as a problem". Evidence: `05.png` (bar-chart icon) against `06.png` (history icon), step
   6 remark, debrief.
3. **Severity 1 -- "Hops" is jargon.** She guessed it meant "how many people out" from its place
   next to "connections", and the heading's "within 2 hops" confirmed the guess. Did not slow her.
   Evidence: `04.png`, `05.png`, step 4 remark.
4. **Severity 1 -- "Follow: Out / In / All" is not explained.** She left it on All without knowing
   what Out or In would do. On friends.csv, which loads directed, Out gives the wrong group; the
   default protected her, nothing on screen did. Evidence: `04.png`, step 5 remark, debrief.
5. **Severity 1 -- picking Ava in the find results does not move or zoom the drawing to her, and
   she is one of the smallest dots.** Only the yellow halo showed where she was. Known on this
   build. Evidence: `03.png` (halo at about x 640, y 578), debrief.
6. **Severity 1 -- no names on the drawing, so she could not check on the picture which dot is
   which person; she had to trust the list.** Evidence: `01.png` to `06.png`, debrief.
7. **Severity 1 -- the way back to the whole club is not obvious once filtered.** Outside the
   task's question; she named only the pressed blue button and the "15 of 20 nodes" chip as hints.
   Opinion only, held one level down. Evidence: `06.png`, debrief.

What worked: the neighbor list's heading restates the answer in full ("Ava's 14 connections within
2 hops"), the Selection count follows it (15), and "Filter to neighbors" plus the "15 of 20 nodes"
chip made the narrowing one click and visible.

## What this says about the round

The session ran on the frozen build with no tool fault, no console or script error reported, and no
control that failed: the participant's time went to finding and understanding the feature, not to
working around a broken one. Its findings are about wording and discoverability (the Degree row as
the entry, "Hops", "Follow", the unlabeled out-of-date icon), not implementation defects.
