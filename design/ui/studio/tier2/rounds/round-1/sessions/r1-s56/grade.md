# Grade: session r1-s56 -- Jordan, returning marketing analyst, reads the Medici family and the families they married into (Florentine families)

**Grade: S** (success). The last screen shows the Medici selected and the list "Medici's 6
connections": Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Jordan named all six
from that list, said 6, and read two facts about the Medici from the node's Values (degree 6,
PageRank 0.1458, #1 of 15). That is the answer key's success for prompt B, reached by the Degree
route with no detour.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `florentine-ranked.txt` ran to its end state
(`01.png`: PageRank inspector, Style tab). Every step's screenshot matches its command. At step 3
the tool reported 7 matches for "Medici" and took the first, which was the node row the
participant meant (`03.png` shows the node inspector, not a tie), so nothing went wrong. The
session is not void.

## What the last screen shows (`04.png`)

- Inspector header "Medici / Neighborhood", "Back to Medici", heading "Medici's 6 connections".
- Hops 1 / 2 / 3 with 1 outlined, then "Filter to neighbors", then the list: Acciaiuoli,
  Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Acciaiuoli has a gray fill (the pointer
  resting where the Degree row was clicked, as the answer key notes).
- Selection 7 in the left list; the Medici and six neighbors glow yellow on the drawing.
- The facts read one step earlier (`03.png`): Summary id Medici, name Medici, Degree 6 with a
  chevron; Results PageRank "0.1458, #1 of 15".

## Measures

- **Steps:** 3 after the start (`02.png` to `04.png`): click the find box and type "Medici",
  click the node result, click "Degree". The success path is 5 steps by keyboard; the click route
  is shorter.
- **Route:** the Degree row (the word, not the chevron), from the find box's node result.
- **Wrong turns: 0.** The find box also listed the six ties (`02.png`); Jordan used them only as a
  cross-check and opened the node itself, so this is not reading from the ties.
- **False "done": none.** Every claim in the debrief is on screen: the six names and 6
  (`04.png`), degree 6 and PageRank 0.1458, #1 of 15 (`03.png`). truth-on-screen: no wrong claim.
- **Self-rating** (7 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None blocked the task.

1. **Severity 1 -- the Hops 1 / 2 / 3 switch gives no hint that 1 means direct ties only.** A
   returning user meeting it for the first time was briefly unsure whether the list was already
   what was asked; the "6 connections" heading matching Degree 6 settled it. Evidence: `04.png`,
   step 4 remark, debrief.
2. **Severity 1 -- the row clicked is called "Degree" and the view it opens is called
   "Neighborhood".** Two names for one thing. Evidence: `03.png`, `04.png`, debrief.
3. **Severity 1 -- the find box lists a node's ties with the pair in mixed order**
   ("Acciaiuoli -- Medici" beside "Medici -- Barbadori"), so scanning for the other family takes
   a moment. Evidence: `02.png`, debrief.
4. **Severity 1 -- two rows look lit at once after Degree opens the list**: the Hops "1" outline
   and the first neighbor's gray hover fill (the pointer sits where the Degree row was). Known
   from the pilots; the participant did not remark on it. Evidence: `04.png`.
5. **Severity 0 -- no names are drawn on the dots in the ranked start**, so the Medici could only
   be found through the find box. This is how the setup is made, not something the participant
   hit as a problem. Evidence: `01.png`, debrief.

What worked: the find box, the node's Values with the Degree row, and the connections list carried
a returning user's habit straight to the answer; the tier 2 additions above the list (Hops,
Filter to neighbors) did not get in the way.

## What this says about the round

No build defect showed up: every control did what the answer key says, and no time went to a
broken or misleading control. The only remarks are about naming and first-time unfamiliarity
with the new Hops switch.
