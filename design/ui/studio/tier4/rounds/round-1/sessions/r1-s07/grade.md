Grade: S
False done: 0
Wrong turns: 0
Steps: 5 (path steps: 5)
Model: opus (claude-opus-5-5; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 14 calls checked)

# r1-s07 -- T62 A, Alex (returning user), build 79ed770292

## Result

The last screenshot (06.png) shows the `opened` column with the calendar glyph on its header,
the values drawn as dates ("Mar 8, 2023"), the caption "Sorted by opened, newest first" and the
top row P12 Bayview Clinic, opened Mar 8, 2023. `data.json` records the column `data.opened` with
type `time` (the date kind), so the kind changed and was not only designated as the time
(`knownFields.nodeTimePath` is null). The participant named Bayview Clinic. Both halves of the
success definition hold: S.

## Route against the success path

The path is the `opened` header's Options menu > Type > date, then the header clicked twice for
newest first (5 steps). The participant took:

1. Clicked the `opened` header, expecting a way to change the type; it sorted A to Z (02.png).
2. Clicked the "..." ("Options for opened") on the header (03.png).
3. Type (04.png): the submenu shows text (checked), number and yes/no each "12 will not convert",
   date, category.
4. date (05.png): calendar glyph, values as dates, caption "oldest first" because the sort from
   step 1 carried over.
5. Clicked the header again: "newest first", Bayview Clinic on top (06.png).

Same steps as the path in a different order. Step 1 did not do what the participant meant, but
its sort was kept and counts toward the two header clicks, so it is not a wrong turn under the
criteria (nothing was taken back or abandoned).

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | behavior | A header click on a text column of ISO days sorts it A to Z, which already puts the dates in date order, so the table looks finished while the column is still text. The only sign is the small `Aa` glyph. This participant read the glyph; a reader who does not could stop here with the right name and the wrong kind. | Step 1, 02.png ("Sorted by opened, A to Z", header still `Aa`) |
| 2 | 2 | behavior | The header's Options ("...") button is not drawn at rest. It showed on `opened` only after that header was clicked, so the menu holding Type was found only through the sort click. | 01.png (no "..." on any header) against 02.png ("..." on `opened`) |
| 3 | 2 | wording | Before any change, the inspector's Overview reads "Time: opened" with a "Set in Data" button while the table header marks `opened` as text (`Aa`). The participant could not tell whether the program already read the column as a time and said it made them second-guess. | Step 1, 01.png (right panel "Time: opened", "Set in Data"; header `Aa opened`) |
| 4 | 1 | behavior | Choosing date gives no confirmation that the column's kind changed; the participant relied on the glyph and the date formatting. | Step 4, 05.png |

No build defect was reproduced: the four problems are friction on a working path, not a wrong
result, so no scripted repro was made.

## Participant's own rating (not used for the grade)

Finished: yes. Ease 6 of 7.
