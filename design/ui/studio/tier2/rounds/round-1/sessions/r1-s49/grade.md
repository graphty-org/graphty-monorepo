# Grade: session r1-s49 -- Jordan, a returning marketing analyst, counts who is within two runs of Ava and narrows the drawing to them (friends.csv)

**Grade: S** (success). Jordan answered 14 people besides Ava and named all 14: Ben, Chloe, Dev,
Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo. That is the answer key's count
and list. The last screen shows the drawing narrowed to exactly Ava and those 14: the header chip
reads "15 of 20 nodes", 15 dots are drawn, and the five people the key leaves out (Lena, Milo,
Nora, Omar, Pia) are gone. He read the count from the screen ("Ava's 14 connections within 2
hops"), left Follow on All so the direction of the ties did not shrink the set, and took no detour.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `friends-ranked.txt` reached its end state
(PageRank ranked and styled). Every step ran and every screenshot matches its command. Twice the
tool reported an ambiguous name and took the first match ("Ava" took the node; "2" took the Hops
2 choice rather than Dev's "2"); in both cases the first match was what the participant meant, so
neither changed the session. The session is not void.

## What the last screen shows (`07.png`)

- Header chip with a funnel icon: "15 of 20 nodes".
- Inspector: Ava, Neighborhood, "Back to Ava", heading "Ava's 14 connections within 2 hops",
  Hops 2 chosen, Follow All chosen, "Filter to neighbors" a filled blue chip (pressed), and the 14
  names listed alphabetically, Ben through Theo.
- Drawing: 15 dots, all ringed (Ava and her 14); the five unringed dots seen at Hops 2 before the
  filter (`05.png`, top right) are no longer drawn. The drawing was not refit, so the narrowed
  graph sits where it was.
- Left panel: Selection 15; the PageRank row shows the history icon, and the hover tooltip reads
  "Ran on 20 nodes; 15 shown now", covering the rail's Notes button.
- Legend unchanged: PageRank 0.03779 to 0.06394, the whole graph's range.

## Measures

- **Steps:** 6 after the start (`02.png` to `07.png`). The count first appears at step 5
  (`05.png`); the drawing is narrowed at step 6 (`06.png`); step 7 was a hover to check the
  ranking's new icon. The key's success path is about 5 steps.
- **Wrong turns: 0.** He went find box, Ava, Degree, Hops 2, Filter to neighbors. The Degree
  row's route is one the answer key names as opening the same list, and his history names Degree
  as where he reads a node's connections. Typing in the find box and reading its tie list
  (`02.png`) gave him the six direct partners, which he then confirmed against the Hops 1 list; it
  was a check, not a detour.
- **False "done": none.** He said done at step 7, and the screen supports both halves: the 14
  names under "within 2 hops" and the "15 of 20 nodes" chip with 15 dots. truth-on-screen: his
  reading of the out-of-date mark ("the colors still come from the whole club") is correct, and
  he did not rerun PageRank or treat the mark as a problem for the task.
- **Wrong answers avoided:** not 6 (Hops 1), not a count from Follow Out (`meaning-wrong` on this
  directed file), not 15 given as excluding Ava.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None blocked the task.

1. **Severity 2 -- the ties of a "runs with" list are drawn and listed as one-way arrows, and the
   neighborhood count depends on Follow, which starts on All only by default.** The find box
   lists "Ava -> Ben" and "Sana -> Ava" (`02.png`); he worried the count would depend on direction
   and trusted it only because he saw All lit (`04.png`, debrief). A user who picks Out gets a
   smaller, wrong set with nothing on screen saying so. Evidence: `02.png`, `04.png`, step 2
   remark, debrief.
2. **Severity 2 -- at Hops 2 the list drops the run counts and does not mark who is a direct
   partner and who is a friend of a friend.** Hops 1 shows a Neighbor / weight table; Hops 2 is a
   plain alphabetical name list. For an invite list he wanted exactly that split. Evidence:
   `04.png` against `05.png`, step 5 remark, debrief.
3. **Severity 1 -- "Hops" is unexplained jargon.** He knew it from another tool; he said much of
   his team would not, and "1 / 2 / 3" carries no hint of "friends of friends". Evidence:
   `04.png`, debrief.
4. **Severity 1 -- the PageRank row's out-of-date mark is an icon swap that needs a hover to
   read.** The row still reads 20, the legend keeps the whole graph's range, and only the icon's
   tooltip says "Ran on 20 nodes; 15 shown now"; the tooltip covers the rail's Notes button.
   He read it correctly, but only after stopping to hover. Evidence: `06.png`, `07.png`, step 6
   remark.
5. **Severity 1 -- no visible way back to the whole graph that he could name.** He guessed the
   header funnel chip; the pressed "Filter to neighbors" chip is the panel's own way back (press
   again), but nothing on the last screen says so without a hover. Not needed for this task.
   Evidence: `07.png`, debrief.
6. **Severity 0 -- the drawing is not refit after narrowing**, leaving the 15 dots off-center
   with empty space at the top right. He did not remark on it. Evidence: `06.png`, `07.png`.

What worked: the neighbor list reached from the Degree row, which he already used, carried the
whole task. The heading changing to "Ava's 14 connections within 2 hops" gave the count without
any counting by hand, Selection 15 confirmed it, and "Filter to neighbors" plus the "15 of 20
nodes" chip made the narrowing visible in one click. The out-of-date tooltip said exactly what
was stale and why.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, and no time went
to a broken or misbehaving control. The problems are design findings about direction on a
mutual relationship, how much the 2-hop list says, and the wording of Hops. Because Jordan's
history names the Degree row as his route to a node's connections, this pass is weak evidence for
a user without that habit, who would have to find the neighbor list some other way.
