Grade: S
False done: no
Wrong turns: 0
Read from: rule
Merged: no

# Grade: r1-s50 (task T50 B, persona Ruth)

Participant model: claude-opus-5-5 (the participant log records Opus in all 38 model entries;
nothing in the transcript says Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (15 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T50 B asks the reader to open a colleague's project (volunteers-thanks.graphty.json), count the
green people and say what they have in common that made the project color them green. Success:
6 people, 30 or more hours and trained, read from the layer's conditions.

- The answer given: 6 green people -- Hannah Weiss, James Carter, Ken Ito, Ben Adler, Lucy Grant,
  Priya Nair -- who "put in at least 30 hours (the rule says hours between 30 and 52; 52 is the
  highest in the sheet) AND are trained". This is the answer key's six names and its rule
  exactly, and Zara Ahmed (38 hours, not trained) was correctly named as the one left out.
- Read from the rule: the layer's collapsed chips at step 3 (`03.png`: "hours 30 to 52, 7 nodes",
  "trained: yes, 15 nodes"), then the opened rule at step 4 (`04.png`: "Nodes that pass every
  condition", hours Between 30 and 52, trained Yes, 6 of 24). The participant did not take 7 or
  15 off a single chip; it said outright that 7 and 15 giving 6 needed the AND, and opened the
  rule to confirm it before answering.
- The drawn color: `key.json` draws 6 nodes `#008000` and 18 `#6366f1`; `#008000` is green
  (hue 120), matching the key line "Color: Thank-you cards, 6 of 24 nodes".
- Nothing changed: `styles.json` `changes.changed` is empty. Opening the rule put focus in the
  "30" box (`04.png`), and the next click (the Table button) closed the card with the rule as
  sent (`05.png`, `06.png` show the same chips). The "gone" and "added" lists are the start
  page's demo replaced by the opened project, not the participant's doing.
- Final screen (`06.png`): the "Thank-you cards" layer's Style with its two conditions shown and
  the table sorted by hours, highest first; seven rows of 30 or more, Zara Ahmed's trained "No".
  The participant's closing claim matches the screen and the style tree.

## Steps

5 steps against the key's 2 (open the file, the layer). 1. "Open a file" with the project.
2. "Thank-you cards" (rule shown as chips). 3. "Which nodes" (rule opened). 4. The Table button.
5. The "hours" column header. Steps 3 to 5 are checks of a rule already on screen, not wrong
turns: step 3 answered a real ambiguity in the collapsed line, and steps 4 and 5 matched the
rule against the rows by hand.

## Problems

1. Severity 2, wording. The collapsed rule shows two chips, "hours 30 to 52, 7 nodes" and
   "trained: yes, 15 nodes", with no "and" between them and no "every condition" until it is
   opened; each chip's own count (7, 15) sits next to the layer's 6, so a reader must work out
   the AND from the arithmetic (step 3, `03.png`). The answer key already records this; a reader
   who stops at the chips can give 7 or 15.
2. Severity 2, behavior. The table cannot show which rows a layer paints: no color or layer
   column and no way to show only the layer's members, so the six names were matched by hand
   against the rule (steps 4 and 5, `05.png`, `06.png`). Recorded in the key ("the table has no
   color column and cannot show only the selection").
3. Severity 1, wording. "30 to 52" reads as an upper limit somebody chose; only the slider handle
   at the end and the sorted table showed 52 is the column's highest, so the rule means "30 or
   more" (step 4, `04.png`).
4. Severity 1, opinion. Opening a colleague's rule shows editable boxes with focus and the value
   "30" selected, and a green "Done", so the participant was wary of changing the project by
   accident (step 4, `04.png`). Nothing changed.
5. Severity 1, behavior. The drawing has no names on the dots and the participant could not say
   from the picture who is green (step 2, `02.png`); hover and members by id are recorded in the
   key.

No build defect beyond what the answer key already records was seen on this route, so no repro
was made.

## What worked

- The project opened with its look, and the key over the drawing ("Color: Thank-you cards, 6 of
  24 nodes") and the layer row's count (6) agreed with the six green dots at once (`02.png`).
- One click on the layer named in the key showed its rule; one more ("Which nodes") said "Nodes
  that pass every condition" plainly (`03.png`, `04.png`).
- The table's sort by hours, with "Sorted by hours, highest first", let the participant check the
  rule row by row and find the one high-hours person left out (`06.png`).
