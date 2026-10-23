# Grade: session r1-s50 -- Nadia finds which Florentine families are at most two marriages from the Medici (Florentine families)

**Grade: S** (success). Nadia answered 11 families besides the Medici and named the same 11 the
answer key names: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi,
Salviati, Strozzi, Tornabuoni. The count was read from the screen: the list heading "Medici's 11
connections within 2 hops". Counting the list by hand was only a check on that heading, so the
"counted by hand" SD case does not apply. The drawing was then narrowed to exactly those 11 and
the Medici: the header chip reads "12 of 15 nodes" and the three left-out families are no longer
drawn.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, with no uncommitted
changes. This is the frozen build the criteria name. Setup `florentine-ranked.txt` ran to its
documented end state: PageRank run, sized and colored, on the run's Style tab. Every step's
screenshot matches its command. At step 2, `--click "Medici"` matched more than one thing on screen
and the tool took the first match, the node. That is the outcome the participant wanted, so it is
not a tool fault. The session is not void.

## What the last screen shows (`07.png`)

- Header chip "12 of 15 nodes" with a funnel, and its tooltip: 'Showing only: "within 2 hops of
  Medici". Click to open Filters, where you can turn it off.'
- Inspector: Medici, Neighborhood. "Medici's 11 connections within 2 hops". Hops is set to 2.
  "Filter to neighbors" is filled blue (pressed). The 11 names are listed alphabetically.
- Canvas: 12 nodes, all with the yellow selection halo. The three dark nodes visible in `05.png`
  are gone.
- Left panel: Selection 12. PageRank 15, with the history (out-of-date) icon.

## Measures

- **Steps:** 6 after the start, which is the length of the success path. The route was find box,
  then the node, then the Degree row, then Hops 2, then Filter to neighbors, then a hover check.
  The answer key lists the Degree row as one of the routes to the same list.
- **Wrong turns: 0.** She was never at the wrong hop count when giving an answer. Hops 1 was only
  the list's opening state (`04.png`). The hover at step 6 was a check, not a detour.
- **False "done": none.** Her claim of "11 families, the drawing shows only those 12" is what
  `07.png` shows. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she did not give 6 (one marriage only). She did not give 12 as the
  count. She did not rerun PageRank after the filter.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 -- the 2-hop list does not say which families are direct marriages and which are
   reached through another family.** The list is plain and alphabetical. For a case file she
   would have to switch back to Hops 1 and compare the two lists by hand. This goes beyond the
   task's question, but it is a real need for this persona. Evidence: `05.png`, debrief.
2. **Severity 2 -- after the filter, the PageRank row's icon changes to a history (out-of-date)
   icon, and nothing visible explains why.** She noticed it and did not know what it meant. She
   did not act on it: no rerun, and no doubt about the answer. The answer key notes this mark is
   not stale for this task. Evidence: `06.png`, `07.png`, step 5 remark.
3. **Severity 1 -- "Hops" is not the user's word.** She had to guess that it meant marriages away
   from the Medici. The heading "within 2 hops" confirmed it only after she clicked. Evidence:
   `04.png`, debrief.
4. **Severity 1 -- "Filter to neighbors" does not say whether it hides or deletes.** She was
   unsure until she saw the "12 of 15 nodes" chip and hovered it. Evidence: `05.png`, `06.png`,
   `07.png`.
5. **Severity 1 -- the neighbor list is reached through the "Degree 6 >" row.** She found it only
   because her history said she had used it before. A new user may not look there. Evidence:
   `03.png`, debrief.

What worked: the heading "Medici's 11 connections within 2 hops" and the Selection count (12) gave
the answer with no counting. The header chip and its tooltip settled her worry about deleting
data.

## What this says about the round

No build defect showed up. Every control did what the answer key says, and no step was lost to a
broken control or to a tool fault. The problems are wording and explanation findings ("Hops", the
filter's reversibility, the unexplained out-of-date icon), plus one information need the list does
not meet (direct ties versus ties through someone). As a returning user, she was helped by her
history: it named the Degree row.
