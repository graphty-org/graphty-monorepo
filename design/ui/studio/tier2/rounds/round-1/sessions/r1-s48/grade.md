# Grade: session r1-s48 -- Grace, back for the quarter, finds the families within two marriages of the Medici (Florentine families)

**Grade: S** (success). The count is right: 11 families besides the Medici (Acciaiuoli, Albizzi,
Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni), the
answer key's list exactly, with Peruzzi, Lamberteschi and Bischeri left out. The drawing is
narrowed to the Medici and those 11: the header chip reads "12 of 15 nodes" and 12 dots are drawn.
She took the success path's own controls (Neighborhood, Hops 2, Filter to neighbors) with no
detour, in 7 steps.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The setup (`florentine-ranked.txt`) reached its
end state, every step's screenshot matches its command, and the tool printed no error. The session
is not void.

## What the last screen shows (`08.png`)

- Inspector: Medici, Neighborhood, heading "Medici's 11 connections within 2 hops", Hops 2 chosen,
  "Filter to neighbors" a filled blue chip (pressed), the 11 names listed alphabetically.
- Header chip: "12 of 15 nodes" with the filter icon.
- Drawing: 12 dots, all with the yellow selection halo; the three outside dots drawn in `06.png`
  (at about 958,408; 719,557; 697,715) are gone.
- Left panel: Selection 12; PageRank 15 with the out-of-date (history) icon and its tooltip "Ran
  on 15 nodes; 12 shown now", which covers the rail's Notes button and the Everything row.
- Legend unchanged (Size and Color: PageRank, 0.03066 to 0.1458), the whole graph's range.

## Measures

- **Steps:** 7 after the start (`02.png` to `08.png`); the graded end state is reached at step 6
  (`07.png`); step 7 was a hover to check the PageRank icon. The answer key's success path is 5
  steps (find, select, open the list, Hops 2, filter).
- **Wrong turns: 0.** Opening the node's "..." menu (step 3) was a search for the feature, and the
  first item she tried, Neighborhood, was the right one.
- **False "done": none.** She claimed 11 families and a drawing of only those plus the Medici; the
  screen shows both (`06.png`, `08.png`). She counted the list against Selection 12 before
  answering. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she did not stop at Hops 1 (6). She read the out-of-date mark on
  PageRank as information, not as a reason to rerun, which is right for this task.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 -- the feature that answers "who is one or two steps away" is reached only through
   a node's "..." menu, under the name "Neighborhood", and she found it by guessing.** Nothing in
   the task's words (marriages, families a step away) points to it; it was the only menu item that
   sounded close. Evidence: `04.png`, step 3 and 4 remarks, debrief.
2. **Severity 2 -- "Hops" is unexplained jargon.** She worked out its meaning only by noticing that
   Hops 1 gave the six direct marriages, and said she would not put the word on a slide. Evidence:
   `05.png`, step 4 remark.
3. **Severity 2 -- the heading "Medici's 11 connections within 2 hops" counts families but says
   "connections", which she reads as marriages (the Medici have 6).** She stopped to count the list
   against Selection before trusting it. A reader who does not count could report "11 marriages".
   Evidence: `06.png`, step 5 remark, debrief.
4. **Severity 1 -- no name is drawn on any dot in this setup, so the Medici could not be found by
   looking;** the find box solved it at once. Evidence: `01.png`, start remark.
5. **Severity 1 -- after the filter, the PageRank row's icon changes to a history icon whose
   meaning shows only on hover ("Ran on 15 nodes; 12 shown now"), and that tooltip covers the
   rail's Notes button and the Everything row.** She hovered and was reassured; a user who does not
   hover is left wondering whether the ranking went stale. Evidence: `07.png`, `08.png`.
6. **Severity 0 -- after the filter the drawing is not refit and the legend keeps the whole graph's
   PageRank range** (known on this build). She did not remark on it. Evidence: `07.png`, `08.png`.

What worked: the find box's result list showed the Medici's six direct ties before any click
(`02.png`), Selection matched the list count at every step (7, then 12), and "Filter to neighbors"
did exactly what she expected, with the "12 of 15 nodes" chip confirming the narrowing.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, no click failed,
and no step was spent on a broken control. The problems are wording and findability: the
neighborhood feature's name and place, "Hops", and a heading that says "connections" where the
reader counts families.
