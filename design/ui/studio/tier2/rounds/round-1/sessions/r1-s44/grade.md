# Grade: session r1-s44 -- Ruth, a returning reporter, makes the ties of 10 or more shared chapters stand out (Les Miserables)

**Grade: SD** (success with difficulty). On the last screen the 13 ties of 10 or more shared
chapters are drawn in red, every other tie and all 77 characters are still drawn, and no filter
step is on. She read the count, 13, from the screen ("13 edges selected", `27.png`), and it is the
answer key's 13. But she never found the route the design gives this task, a rule typed in the find
box starting with "=". She typed the condition without the "=" and got only "No match". She then
built the result by hand: she sorted the edge table by shared_chapters, Shift-clicked a range of
rows, and put a color on the selection as a new style layer. That took 36 steps and about seven
wrong turns.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The tool ran every step. Two commands did not do
what she meant (step 25 matched the wrong "Enjolras" cell, and step 27's first command used a step
the tool does not have). Both came from how the commands matched names. Neither changed the end
state, so the session is not void.

## What the last screen shows (`37.png`)

- Left list: Selection, "13 edges" (a brush icon, selected), PageRank 77, Everything. No filter
  step anywhere.
- Right panel: "13 edges, Layer", Edges tab, Line Color E02424 at 100%, Width 30.
- Drawing: about 13 red lines over the gray ties, in the middle cluster and the lower tie to the
  Valjean hub. All characters and the gray ties are still drawn. Nothing is selected, so the red
  comes from the layer, not from the selection.
- Legend: "Edge color: 13 edges" with a red swatch, above the PageRank size and color keys.
- Edge table under the drawing, sorted by shared_chapters with the highest first. It shows
  MmeMagloire to Myriel 10, Bossuet to Enjolras 10, then Fantine to Valjean 9 and MlleGillenormand
  to Gillenormand 9: the cut-off.
- The count was on screen at `27.png`: "13 edges selected", Summary Edges 13, and a "Selected
  edges" list of the answer key's 13 ties exactly (MmeMagloire--Myriel through Bossuet--Enjolras).
  The layer's own name, "13 edges", still shows the count on the last screen.

Against the answer key, all three parts hold: the matching ties are marked, everything else is
still drawn with no filter step, and the count of 13 was read from the screen. It is SD, not S,
because of the detours below. Marking the ties with a color on a layer of exactly those ties is
the answer key's "a color ... that separates exactly the 10-or-more ties" route, graded by its
end state.

## Measures

- **Route:** the edge table sorted by shared_chapters, a row click, then a Shift-click range in
  the table (an "other route"), then a style layer with a color on that selection. Not the rule in
  the find box.
- **Typed "=" without being shown it: no.** She never typed "=". She typed "chapters",
  "shared_chapters" and "shared_chapters >= 10", and pressed Enter (`03.png`, `08.png` to
  `10.png`). Each time the line under the box read only 'No match for "..."'. Nothing on that
  screen hinted that a condition needs a leading "=", so she never saw the "Put numbers in
  backticks" correction the answer key describes, which appears only after the "=".
- **Where she looked for the column name:** the Data page's Attributes list (`04.png`), then the
  column's own fact panel (`05.png`). The find box never named it.
- **Where she looked for a "select by a condition" control:** the find box (steps 2 to 10), the
  column's "..." menu ("Filter to..." and "Show in table", `06.png`), Everything's Edges style
  (`12.png`), and "Width by attribute" (`14.png`, `15.png`). She found none.
- **Used the example value 16:** not applicable. She never saw the "=" hint.
- **Steps:** 36 steps after the start (`02.png` to `37.png`). The answer key's success path is
  about 3 steps.
- **Wrong turns: 7.**
    1. Steps 2 and 3 (`03.png`): "chapters" typed in the find box returned "No match".
    2. Steps 8 to 10 (`08.png` to `10.png`): "shared_chapters", then "shared_chapters >= 10", then
       Enter. All "No match", with no hint toward "=".
    3. Step 6 (`06.png`): the attribute's "..." menu. She rightly turned down "Filter to...".
    4. Steps 11 to 16 (`11.png` to `16.png`): Everything's Edges, "Width by attribute" on
       shared_chapters. That made every tie a hairline ("1 to 3"). Then she clicked what she took
       for a settings cog, and it was "Detach Width", which undid it.
    5. Step 25 (`25.png`): the Shift-click landed on the wrong "Enjolras" row (the tool picked the
       first matching cell), so only 5 ties were selected. She fixed it at step 27.
    6. Steps 30 to 34 (`30.png` to `34.png`): she put width 30 on the new layer. It drew thick blue
       bands while the ties were selected (`31.png`), but once she cleared the selection the bands
       looked like nearly ordinary gray lines (`32.png`). She thought it had not worked.
    7. Steps 35 and 36 (`36.png`): the new layer's color started at A9A9A9, the gray every tie
       already has, so adding a color changed nothing until she typed a red.
- **False "done": none.** At step 37 she said she was done. The red ties, the layer and a count
  of 13 that had been on screen all agree with the answer key. truth-on-screen: she said Cosette
  to Valjean has 31 chapters (`23.png` shows shared_chapters 31). She gave a first count of 13
  from scrolling the table four rows at a time (steps 20 to 22), but did not stand on it until
  the selection count agreed. No wrong claim.
- **Earlier styling lost:** none. The PageRank size and color are still on at the end
  (legend, `37.png`).
- **Self-rating** (3 of 7) was not used in grading.

## Problems

Severity is on the 0 to 4 scale (4 = blocks the task).

1. **Severity 3 -- The find box does not lead from a typed condition to the rule form.**
   "shared_chapters >= 10" without the leading "=" returns only 'No match for "shared_chapters >=
   10"' (`09.png`, `10.png`), the same message as any failed name search. The box's placeholder,
   "Find nodes, edges, values", says nothing about conditions. A returning user who typed exactly
   the right condition, needing one more character, gave up on the box and spent about 26 more
   steps on a manual route. Evidence: `09.png`, `10.png`; transcript steps 8 to 10.
2. **Severity 3 -- A width on a style layer is barely visible once the selection is gone.** Width
   30 on the "13 edges" layer drew thick blue bands while the ties were selected (`31.png`). After
   she cleared the selection, the same layer drew lines only a few pixels heavier than the gray
   ties (`32.png`, `34.png`). Everything's own edge Width reads 8, yet it draws hairlines
   (`12.png`). So the numbers in the Width box do not match what the drawing shows, and the
   selection's own look (size 2.5) draws far thicker than a layer's width of 30. She concluded
   her styling had failed. Evidence: `31.png` against `32.png`; `12.png`.
3. **Severity 2 -- "Width by attribute" makes every tie nearly vanish.** Choosing shared_chapters
   set Width to "1 to 3", a range far below the 8 it replaced. Every tie became a faint hairline,
   and the legend reads "Edge width: Everything, 1 ... 31", which names the layer and not the
   column. Evidence: `15.png`.
4. **Severity 2 -- The icon inside a bound width box looks like settings and detaches.** She
   clicked it expecting the binding's settings. It was "Detach Width" and silently undid the
   binding. Evidence: `16.png`; transcript step 16.
5. **Severity 2 -- The column name appears only on the Data page.** The task's word "chapters"
   matches nothing in the find box (`03.png`). She had to leave Graph for Data to learn the
   column is shared_chapters (`04.png`).
6. **Severity 2 -- The edge table shows four rows at a time and cuts off names.** Names such as
   "MmeMa...", "Courfeyr..." and "Thenard..." are cut, and there are no row numbers. Counting
   down to the cut-off meant four scrolls and a tally she did not trust. Evidence: `19.png` to
   `22.png`.
7. **Severity 1 -- The "Selected edges" list shows no values.** In `27.png` it lists the 13 ties
   by name, not in chapter order and without shared_chapters. The answer key's pilot shows the
   list with each tie's shared_chapters. So she could not check the cut-off from the list. It
   also differs from what the pilot recorded for a selection made by a rule.
8. **Severity 1 -- A new layer's color starts at the gray every tie already has.** Adding Color
   shows A9A9A9 (`36.png`), so the step that should make the ties stand out changes nothing on
   the drawing until a color is typed.
9. **Severity 1 -- A layer made from a selection is named by its count and is a fixed list.** The
   layer and the legend read "13 edges" (`37.png`), which tells a reader nothing about why these
   ties. It holds the 13 ties she clicked, not the condition, so it would not follow a change in
   the data. She raised both points.
10. **Severity 0 -- Shift-click in the table selects a range, and the cell text gets the browser's
    own text highlight** (`25.png`, `27.png`). This is cosmetic. The range select itself worked
    as a spreadsheet user expected.
