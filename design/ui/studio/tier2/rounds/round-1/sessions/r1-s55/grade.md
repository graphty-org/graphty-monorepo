# Grade: session r1-s55 -- Ruth, back at the data desk, lists who Javert is tied to (Les Miserables, ranked start)

**Grade: S** (success). The last screen (`04.png`) shows Javert's Neighborhood view with the
heading "Javert's 17 connections" and all 17 names, alphabetical: Babet, Bamatabois, Claquesous,
Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse,
Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. Ruth named all 17 from that list, said
17, and read facts about him from his node page (`03.png`): Degree 17 and PageRank "0.0303, #5 of
77". Javert was selected (Selection 1 on `03.png`). That meets every part of the answer key's
success definition for half A, reached by the Degree route with no detour.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `lesmis-ranked.txt` reached its documented
end state (PageRank inspector; the first screen shows the PageRank layer with 77). Every step's
screenshot matches its command. The session is not void.

## What the last screen shows (`04.png`)

- Inspector header "Javert / Neighborhood", "Back to Javert", heading "Javert's 17 connections",
  a Hops 1 / 2 / 3 switch with 1 chosen, "Filter to neighbors", then the 17 names above.
- The Graph tree reads Selection 18 (Javert plus 17). Javert and his neighbors wear the same yellow
  glow on the drawing.
- Two controls look lit at once: the Hops "1" outline and a gray fill on the first name, Babet.
  The answer key explains the gray fill as a hover left by the pointer resting where Degree was
  clicked.

## Measures

- **Route:** find box ("Javert"), click the node result, click the Degree row. Degree row route,
  clicked on the word "Degree" (the row also carries a chevron). 3 actions after the start
  (`02.png` to `04.png`); the answer key's path from a ranked start is 5 keyboard-and-click steps.
- **Wrong turns: 0.** In the find results she clicked the node "Javert", not one of the 17 ties
  listed under "Edges 17", after a moment's hesitation she reported.
- **False "done": none.** Every claim in her ending matches the screen: the 17 names, Degree 17,
  PageRank 0.0303 #5 of 77, id and name Javert, Selection 18. Her cross-check that the tie
  "Javert -- Valjean" in the find list matches Valjean in the neighbor list is right.
  truth-on-screen: no wrong claim.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 -- nothing on screen says what a tie means in this sample** (shared chapters).
   The panel says only "connections"; she took the task's word for it and said she could not
   confirm what a tie counted. For a journalist about to print "shares chapters with", that is a
   claim she cannot source from the program. Evidence: `03.png`, `04.png`, debrief.
2. **Severity 1 -- "Hops" is an unfamiliar word placed between the heading and the list.** She
   left it on 1 because the list matched the heading, and said that had it been on 2 she might
   not have noticed the list changed meaning. Evidence: `04.png`, debrief.
3. **Severity 1 -- the find box lists the person and his 17 ties together** ("Nodes 1", "Edges
   17", each tie naming him), so the row that is the person takes a second to pick out. No wrong
   pick here. Evidence: `02.png`, debrief.
4. **Severity 1 -- "PageRank 0.0303, #5 of 77" does not say what the number measures.** She knew
   only because her history says she ran it. Evidence: `03.png`, debrief.
5. **Severity 1 (known from the pilot, seen again) -- after clicking Degree, two rows look lit**
   (the Hops "1" outline and a hover fill on Babet). It did not mislead her. Evidence: `04.png`.
6. **Severity 1 (known from the pilot) -- on the drawing, Javert wears the same glow as his
   neighbors**, so the person asked about cannot be told from the people tied to him. She read
   the list, not the drawing, so it did not affect the answer. Evidence: `04.png`.

What worked: every count agreed with every other (Edges 17 in the find list, Degree 17, "Javert's
17 connections", 17 names, Selection 18), and the neighbor list sat one click from the node page
where her history said it was.

## What this says about the round

No implementation issue showed up: every control did what the answer key says, there were no
script errors or failed clicks, and none of the session was spent on a broken control. The
findings are about meaning and wording (what a tie stands for, what "Hops" and a PageRank value
mean), which is what a study session should surface.
