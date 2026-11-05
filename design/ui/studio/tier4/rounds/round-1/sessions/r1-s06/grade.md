Grade: S
False done: 0
Wrong turns: 0
Steps: 5 (6 actions; path steps: 5)
Model: opus (claude-opus-5-5; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 15 calls checked)

# r1-s06 -- T62 B, Maren (returning user), build 79ed770292

## Result

The last screenshot (06.png) shows the `installed` column with the calendar glyph on its header,
the values drawn as dates ("Jun 27, 2018"), the caption "Sorted by installed, newest first" and
the top row G10 Birch Hollow, installed Jun 27, 2018. `data.json` records the column
`data.installed` with type `time` (the date kind), and `knownFields.nodeTimePath` is null, so the
column's kind changed; it was not only designated as the time. The participant named Birch Hollow.
Both halves of the success definition hold: S. Node count stays 11 throughout (work.json,
data.json); no layer, run or source was added or removed (work.json start and end match).

## Route against the success path

The path is the `installed` header's Options menu > Type > date, then sort newest first (the
menu's "Sort descending" or two header clicks) and read the top row (5 steps). The participant
took:

1. Clicked the `installed` header, looking for a column type; it sorted A to Z and the "..."
   button appeared on the header (02.png).
2. Clicked "Options for installed" (03.png).
3. Type (04.png): text (checked), number and yes/no each "11 will not convert", date, category.
4. date (05.png): calendar glyph, values as dates, caption "oldest first" because the sort from
   step 1 carried over.
5. "Options for installed" > "Sort descending": "newest first", Birch Hollow on top (06.png).

Step 1 is an extra action the path does not need, but it was neither taken back nor abandoned:
its sort carried into step 4 and was then reversed by the path's own sort step, and it is what
surfaced the Options button. Not a wrong turn under the criteria. The participant said done only
when the screen showed the date column sorted newest first: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | behavior | The header's Options ("...") button is not drawn at rest. It showed on `installed` only after that header was clicked, so the menu holding Type was found only through a sort the participant did not ask for. | Step 1, 01.png (no "..." on any header) against 02.png ("..." on `installed`) |
| 2 | 2 | behavior | A header click on a text column of ISO days sorts it A to Z, which already puts the days in date order, so the table can look finished while the column is still text. The only sign is the small `Aa` glyph on the header. | Step 1, 02.png ("Sorted by installed, A to Z", header still `Aa`) |
| 3 | 2 | wording | Before any change, the inspector's Overview reads "Time: installed" with a "Set in Data" button while the table header marks `installed` as text (`Aa`) and Data > Fields lists no time. The participant never learned what it meant. | 01.png and 06.png (right panel "Time: installed", "Set in Data"; Fields shows only Id, Latitude, Longitude) |
| 4 | 1 | wording | In the Type submenu, number and yes/no say "11 will not convert" but date says nothing, so the participant picked date by elimination rather than from a positive count. | Step 3, 04.png |
| 5 | 1 | behavior | Choosing date gives no confirmation of how many values converted; the participant inferred it from the glyph and from every row showing a date. | Step 4, 05.png |
| 6 | 1 | opinion | The participant expected the column kind to be set where the file was brought in (beside Id, Latitude, Longitude under gauges.csv in Data), not only from the table header. | End-of-session notes; 06.png left panel |

No build defect was reproduced: all six are friction on a working path, not a wrong result, so no
scripted repro was made.

## Participant's own rating (not used for the grade)

Finished: yes. Ease 6 of 7.
