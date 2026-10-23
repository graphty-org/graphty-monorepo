# Grade: session r5-s05b

Task T22, dataset A (bus stops, bus-stops.csv, ranked, colored and sized by PageRank at the start),
persona Nadia (tier 1 graduate). Build 8c015b806086 (graphty@0.8.65), the frozen round 5 build
(`session.json`).

**Grade: S** -- the three links of 10 minutes or more are selected and drawn with a blue band on
the full map, nothing was taken off the drawing, and the participant gave the right count, 3.

## Evidence from the last screenshot (08.png) and the saved files

- The line under the find box reads "3 edges selected"; the inspector header reads "3 edges
  selected", Summary "Edges 3"; the left list shows "Selection 3".
- The inspector's "Selected edges" table lists School -> Harbor 12, Depot -> Station 15,
  Station -> Harbor 14 -- exactly the answer key's three links.
- All 10 stops and all links are still drawn; the three selected links carry the thick blue band.
  The table under the drawing reads "Edges 17 edges", sorted by minutes highest first: 15, 14, 12
  (highlighted), then 9 -- no link at exactly 10.
- `work.json`: no filter step at the start or the end (`"steps": []`), the PageRank run and all
  three layers kept, nothing under "gone".
- The participant's final answer: "Three links take 10 minutes or more: Depot -> Station (15),
  Station -> Harbor (14), School -> Harbor (12)", matching the key.

## Route and counts

- Steps: 7 in all. Four reached the selection (click the find box; type "minutes"; select all and
  type "=minutes >= 10"; click the offered "=minutes >= `10`" / "Select its matches"), one more
  than the 3-step success path. Three more checked the answer in the table (open Table, Edges tab,
  sort by minutes).
- The bare-number refusal: the participant clicked the offered corrected rule and did not retype
  it, which the key counts as the success path, not a detour.
- Typing the column name alone ("minutes") showed "Start with = to select by a value" with the
  rule offered; the participant followed it. That is the find box answering the habit, not a dead
  end.
- Wrong turns: 0. The table check was kept and finished, not undone or abandoned.
- False "done" claims: none. "Done" was said with the correct selection and count on screen.
- Scripted exit: not applicable.

## Problems

1. **Severity 2 -- the red line "Put numbers in backticks:" reads as a refusal of a rule a person
   would naturally type.** The participant: "I have never typed a backtick at work ... I would not
   have known to write it that way myself." She got through only because the corrected rule was
   offered under it (04.png). The answer key already names this wording as a known trap; this
   session is another instance of the participant noticing it.
2. **Severity 1 -- nothing on screen says whether ">= 10" includes a link of exactly 10.** The
   selection's summary shows only the matches, so the participant spent three extra steps opening
   the table, switching to Edges and sorting to rule out a link at 10 (06.png to 08.png). No wrong
   conclusion followed; it cost steps.
3. **Severity 1 -- the table under the drawing shows only four rows** at this window size (07.png),
   so finding the large values needed a sort. The sort worked on the first click and said so
   ("Sorted by minutes, highest first").
4. **Severity 0 -- whether a selection survives into a saved picture or the project** was raised
   as a worry and not tested. Opinion only, held down from 1; outside the question the task asks.
5. **Severity 0 -- the option row "Select its matches" carries a funnel icon** (04.png), the
   same mark the toolbar uses for filters, while the task depends on selecting and not hiding.
   The participant read the words and was not misled; recorded for the skeptics, not counted
   against the task.

## Notes on the method

- The participant is simulated and briefed as a returning user; a pass is weak evidence until real
  people confirm it. Keyboard and screen-reader access were not studied in this session.
- The tool ran cleanly: the start setup completed (`setup.log`), every step produced its
  screenshot, `leaks.json` lists no leaks, and the session ended with `--end`.
