# Grade: session r5-s06b (task T22 B, Elena, tier 1 graduate)

**Grade: SD** (success after one abandoned detour)

Build 8c015b806086 graphty@0.8.65 (`session.json`), the frozen build `criteria.md` names. The run
ended normally; no tool fault.

## End state against the success definition

The task (Les Miserables) asks to point out on the drawing every tie of 10 or more shared chapters,
without removing anything, and to say how many there are. The answer key wants 13 ties marked,
everything still drawn, no filter step, and the count read from the screen.

The last screenshot (`09.png`) shows:

- The find box holding `=shared_chapters >= `10`` and the line under it "13 edges selected"; the
  Selection row reads 13; the inspector header "13 edges selected", Summary Edges 13.
- The "Selected edges" table lists exactly the 13 ties of the answer key with the same values
  (MmeMagloire--Myriel 10 through Bossuet--Enjolras 10).
- The 13 ties drawn with thick blue bands; every character still drawn (PageRank row 77).
- No filter step (`work.json` end state: `steps: []`).

The participant answered 13 and read it from "13 edges selected" and the table. That meets S on
the end state. It is SD because the answer came after a detour: steps 02 to 06 went to Everything >
Style > Edges and set Width by attribute to shared_chapters, which did not mark the ties and was
abandoned (left in place, not undone).

## Counts

- False "done" claims: 0. The final claim ("13 ties ... shown in blue on the drawing with nothing
  taken off") matches `09.png`.
- Wrong turns: 1 -- the Everything > Style > Edges > "Width by attribute" route (steps 02-06),
  abandoned. It left an extra "Everything" style layer with edge width by shared_chapters
  (`work.json`, end `layers` adds `everything_1 Everything`); it removes nothing and does not affect
  the grade.
- Route (measure): a rule in the find box. The participant typed `shared_chapters >= 10` without
  "=" and was never shown "=" before typing; the "Start with = to select by a value:" hint and its
  corrected option row (`08.png`) turned it into the rule, and a click on "Select its matches"
  selected the 13. Three steps from the box (click box, type, pick the option). Did not retype the
  suggestion. Did not use 16.
- Places looked for a way to select by a condition: Everything > Style > Edges (Width by attribute),
  then the find box.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | Width by attribute on edges gives no visible difference: the Width field reads "8 to 16" for values 1 to 31, every line still draws hair-thin, and the camera zooms out on the change, so the participant could not see which ties were heavier and abandoned the route | `05.png` vs `06.png`; transcript step 06 ("the lines all still look hair-thin to me") |
| 1 | The empty find box ("Find nodes, edges, values") gives no sign that it takes a condition or that rules start with "="; the participant found it only by typing a spreadsheet-style filter | `07.png`; transcript, "What confused me" item 2 |
| 1 | The legend row for the new edge width is titled "Edge width: Everything" (the layer's name), where the node rows name their measure ("Size: PageRank"); nothing on the drawing's key says the width follows shared_chapters | `06.png`, `09.png` |
| 1 | The abandoned width change stays on the drawing as a new Everything layer; the participant was unsure whether it mattered and did not undo it | `work.json` end layers; transcript, "What confused me" item 1 |
| 1 (opinion, held down) | The backticks around the number in the suggested rule (`10`) read as code | `08.png`; transcript, "What confused me" item 3 |

No problem blocked the task. The participant's own rating (5 of 7) was not used for the grade.
