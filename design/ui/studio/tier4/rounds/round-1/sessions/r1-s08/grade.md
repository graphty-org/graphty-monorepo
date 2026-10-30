Grade: P
False done: 1 (truth on screen: the `installed` header still shows the `Aa` text glyph in 05.png)
Wrong turns: 1
Steps: 4 (path steps: 5)
Model: opus (claude-opus-5-5; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 14 calls checked)

# r1-s08 -- T62 B, Tom (returning user), build 79ed770292

## Result

The last screenshot (05.png) shows the table sorted "Sorted by installed, Z to A" with G10 Birch
Hollow, 2018-06-27, on top, and the timeline strip open ("Jun 30, 1995 - Jun 27, 2018"). The
`installed` header reads `Aa` `Time` `installed`: the column is designated as the time but its
kind is still text, and the cells are still ISO text. `data.json` agrees: the column
`data.installed` has type `string` with role `time`, and `knownFields.nodeTimePath` is `installed`.

The participant named Birch Hollow, which is right, but the success definition needs the column's
kind to be a date (calendar glyph). The answer key names this exact route -- the inspector's
"Set in Data" -- as P: it designates the time and leaves the kind untested. So: P.

The participant said it was finished ("Did I finish? Yes") while the header still marked the
column as text. That is a false "done". The screen did show the truth: the participant noticed
the `Aa` glyph in steps 1 and 3 and was talked out of it by the timeline's date labels.

## Route against the success path

The path is the `installed` header's Options menu > Type > date, then the header clicked twice for
newest first (5 steps). The participant took:

1. "Set in Data" in the inspector's Overview, next to "Time: installed" (02.png): a Time row in
   Data > Fields, a "Time" chip on the header, a Timeline button in the toolbar; header still
   `Aa`. Off the path; kept to the end, so it is the route, not a wrong turn.
2. Clicked the `installed` header: "Sorted by installed, A to Z", 1995 on top (03.png).
3. Clicked it again: "Z to A", G10 Birch Hollow on top (04.png). Steps 2 and 3 are the path's two
   header clicks.
4. Opened the Timeline (05.png) to check whether the days were read as dates. A place the task
   does not need, opened only to look and then left: one wrong turn.

The Options menu holding Type was never opened.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 3 | behavior | The inspector's Overview offers "Time: installed" with a "Set in Data" button on a text column of ISO days. It is the only visible control that names the column, so a reader asked to make the program read the days as days presses it. It designates the time and leaves the kind text, and everything that follows (the Time chip, the Timeline button, the timeline's month-name dates) reads as success. This route ended in a false "done". | Step 1, 01.png ("Time: installed", "Set in Data") and 02.png (header `Aa` `Time` `installed`); 05.png |
| 2 | 2 | behavior | The timeline writes the text column's values as calendar dates ("Jun 30, 1995 - Jun 27, 2018") while the table marks the same column as text. Two places disagree about what the column is; the participant trusted the timeline. | Step 4, 05.png (timeline range against header `Aa`) |
| 3 | 2 | wording | The header shows the text glyph `Aa` and a "Time" chip together, and the sort caption says "A to Z" / "Z to A" on a column designated as the time. The participant asked "words or days?" and could not tell from the table. | Steps 2-3, 03.png, 04.png |
| 4 | 2 | behavior | The header's Options ("...") button is not drawn on `installed` at rest, so the menu that holds Type has no visible entry point from the starting screen. | 01.png (no "..." on any header) |
| 5 | 1 | behavior | "Set in Data" gives no confirmation of what it changed and does not say that it changes the saved project; the participant read the undo arrow lighting up as the only sign. | Step 1, 02.png |

No build defect was reproduced: "Set in Data" leaving the kind as text is the behavior the answer
key already records for this build, and the other problems are friction or wording, not a wrong
result, so no scripted repro was made.

## Participant's own rating (not used for the grade)

Finished: yes. Ease 5 of 7.
