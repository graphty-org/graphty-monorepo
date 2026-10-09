# Grade: session r1-s46 -- Dana (regular analyst), T22 prompt B, Les Miserables

**Grade: SD** (success with difficulty). The last screen (`16.png`) is the answer key's end state
for prompt B. The find box holds ``=shared_chapters >= `10` `` with "13 edges selected" under it.
The Selection row in the left list reads 13. The inspector is headed "13 edges selected", with
Summary Edges 13 and a "Selected edges" table listing the key's 13 ties with their counts, from
MmeMagloire -- Myriel 10 to Bossuet -- Enjolras 10. Thick blue bands mark the 13 ties, all 77
characters and the other ties are still drawn, and there is no filter step. Dana read the count,
13, from the screen and checked the table against her condition.

She got there only after the find box turned the condition away twice. ">= 10" and
"shared_chapters >= 10" each got "No match", and Enter changed nothing. She guessed the leading
"=" from Excel formulas, since nothing on screen showed it. The criteria list "a refused rule
retyped" as a detour. The backtick correction that followed is the answer key's own path, but the
two earlier rejections are not. She also left an unintended style change on the drawing (see
problem 2). So the grade is SD, not S.

Build seen: `946256efb876 graphty@0.8.56` (`session.json`), 1440 x 900, no uncommitted changes.
This is the frozen build the criteria name. The setup (`lesmis-ranked.txt`) reached its end state
(`01.png`).

**One tool step misfired, and it does not void the session.** At step 6, `--click "Find nodes,
edges, values"` printed `elementHandle.click: Timeout 3000ms exceeded`, and the screen did not
change (`06.png`). The answer key counts this timeout as the tool's fault, not the participant's.
r1-s14 met the same timeout under machine load, from parallel sessions. This click was not traced
on its own, so load is the likely mechanism, not a proven one. Nothing in `05.png` covers the box.
Dana recovered the way any person could, by clicking the box where she saw it (step 7, `07.png`),
so the misfire cost one step. She thought the step 5 Color click might have failed the same way.
It did not: the key gained "Edge color: Everything" and the view changed (`05.png`), so that click
reached the app.

## Measures

- **Route:** a rule typed in the find box, the answer key's path. She did not use Shift-clicks,
  a color or a filter. She saw the Filters plus on the Data page and chose not to use it, because
  "a filter in my world hides rows" (step 9).
- **Typed "=" without being shown it: yes.** She never typed a lone "=", so she never saw the
  column list or the "Type a rule, such as ..." hint. She tried "=" because Excel formulas start
  with it (step 14).
- **Where she found `shared_chapters`:** on the Data page's Attributes list and that column's
  summary (`09.png`, `10.png`), not from the "=" list.
- **Places she looked for a way to select by a condition:** first the Style panel (Edges, then
  Line, then Color, `02.png` to `05.png`), then the find box as a text search, then the Data
  page's attribute summary ("no 'count above X' and no way to act on it here", step 10).
- **Example value 16:** she noticed the example said 16 when she had typed 10. She kept 10 and did
  not use 16.
- **Steps:** 15 after the start (`02.png` to `16.png`), against 3 on the answer key's path. One
  of those (step 3) was a hover with no change, and one came from the tool misfire (step 6).
- **Wrong turns: 3.**
  1. Steps 2 to 5 (`02.png` to `05.png`): the Style panel's Edges side, then Line, then Color.
     This added an edge color on Everything, not on the layer she had open.
  2. Step 8 (`08.png`): ">= 10" in the find box got `No match for ">= 10"`.
  3. Steps 12 and 13 (`12.png`, `13.png`): "shared_chapters >= 10", then Enter, got "No match"
     both times.
  The Data visit (steps 9 to 11) was deliberate research and found the column's name, so it is
  not counted as a wrong turn. The refusal at step 14 ("Put numbers in backticks") and her fix at
  step 15 are the answer key's path.
- **Selection kept:** she pressed no Escape after Enter and no Control+Z, so she did not hit the
  known traps for this task (Escape clearing the selection, Control+Z undoing styling).
- **False "done": none.** Her claims match the last screen: 13 ties, thick blue lines, nothing
  taken off the drawing, and both 10s in. Her remark that the drawing "re-arranged itself" at step
  5 is not quite right. `04.png` and `05.png` show the same layout, zoomed out and shifted. She
  claimed nothing as done from it, so it is not a false "done". truth-on-screen: no wrong claim.
- **Self-rating** (3 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). A finding that is only the participant's opinion is held one
level down. Whether a problem is confirmed is decided when the round is tallied across sessions.
Where another session met the same problem, its id is given.

1. **Severity 3 (r1-s43 met the same, at severity 4, and failed) -- the find box answers a
   condition typed without "=" with only "No match", with no hint that a rule starts with "=".**
   The box's placeholder says it finds "values". Dana typed the condition twice and pressed Enter,
   and nothing on screen pointed toward the rule syntax. She got through only by guessing from
   Excel formulas, and said that "somebody who does not think in Excel formulas would have stopped
   there". Evidence: `08.png`, `12.png`, `13.png`, debrief item 3.
2. **Severity 2, build defect (r1-s43 met the same) -- choosing Color under Edges, Line while the
   PageRank layer is open writes the color to the Everything layer.** Nothing appears under Line in
   the panel she was using. The only sign is a new "Edge color: Everything" entry at the top of the
   map key. The change stays on the drawing at the end (`16.png`), and she said "I do not know what
   I changed". Evidence: `04.png`, `05.png`, `06.png`, debrief item 1.
3. **Severity 2 -- nothing near the find box names the columns a rule can use, unless the user
   first types a lone "=".** Dana left for the Data page to learn that the tie count is called
   `shared_chapters`. Evidence: `09.png`, `10.png`, debrief item 4.
4. **Severity 2 (r1-s43 met the same, at severity 3) -- the Style panel, where she looked first
   because "make it stand out" is about looks, has no way to color ties by a cutoff she chooses.**
   Line's menu offers Color, Width, Opacity, Pattern and Curved. She compared it to Excel's
   conditional formatting, "two clicks". Evidence: `04.png`, debrief items 1 and 6.
5. **Severity 1 -- adding the edge color zoomed the drawing out and shifted it.** The layout is
   unchanged between `04.png` and `05.png`, but the view moved by itself after a style change, and
   she read it as a re-arrangement. Evidence: `04.png`, `05.png`, step 5 remark.
6. **Severity 1 -- "Put numbers in backticks", with an example value (16) that differs from the one
   typed (10).** She had to work out what a backtick is from the example and found the 16 "odd".
   It cost her one retype, which is the designed path. Evidence: `14.png`, debrief item 5.
7. **Severity 1 (opinion, held down from 2) -- she was unsure whether the selection would stay if
   she clicked elsewhere. For a slide she wants the marking to stay.** On this build, Escape
   outside the box does clear it (answer key, "Known on this build"), so her doubt is well founded.
   She did not lose it in this session. Evidence: debrief item 6.

What worked, from the screens: once the rule was accepted, the answer showed in three places that
agree: the line under the box, the Selection row and the inspector. The "Selected edges" table,
with each pair and its count, let her check the condition herself. She called it "the part I would
actually use" (`16.png`). The refusal message came as she typed, before Enter, and its example
showed the syntax (`14.png`).

## For the tool, not the app

A `--click` by accessible name on the find box timed out at Playwright's 3-second limit while the
box was visible and nothing covered it (`06.png`), and `--click-at` on the same spot worked
(`07.png`). It looks the same as r1-s14's timeout under machine load. A person's click would not
have failed. The step 5 output was cut short in the transcript, so the tool's printed result for
that click is not on record. The screen shows that it reached the app.
