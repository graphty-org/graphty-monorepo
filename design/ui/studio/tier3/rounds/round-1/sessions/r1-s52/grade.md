Grade: S
False done: no
Wrong turns: 0
Read from: rule

# Grade: r1-s52 (task T50 B, persona Dev)

Participant model: claude-opus-5-5 (the participant log records Opus in all 27 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (10 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page with "Open a file").

## Against the success definition

T50 B asks for volunteers-thanks.graphty.json opened, how many people are green said, and what
they have in common said: 30 or more hours and trained, read from the layer's conditions.

- The project opened with its look: six green dots, the key "Color: Thank-you cards" with "6 of
  24 nodes", and the layers Hovered, Selected, Thank-you cards (6) and Everything (24) (`02.png`).
- The count, 6, was read from the key and the layer row at step 2, the step it was first given.
- The rule was read from the layer's conditions: the chips "hours 30 to 52, 7 nodes" and "trained:
  yes, 15 nodes" (`03.png`), then the opened picker, "Nodes that pass every condition", hours
  Between 30 to 52 and trained Yes, "6 of 24 nodes" (`04.png`). The participant said "trained AND
  between 30 and 52 hours". The rule as the screen states it is the layer's rule (52 is the file's
  highest), so it reads as the key's "30 or more hours and finished training": S.
- The participant did not take 7 or 15 from one chip; it noticed the two chip counts could not
  both be the green count and checked the combination on screen before answering.
- The color: the drawn value is `#008000` (6 nodes, `key.json`); `colorWord` gives "green" (the
  CSS keyword).
- Final screen (`04.png`): Thank-you cards open on Style with its picker open, both conditions and
  Fill Color 008000. Nothing changed: `styles.json` `changes.changed` is empty (the `gone` and
  `added` lists are the start page's demo replaced by the project's own layers at the open). The
  closing claim matches the screen.

## Steps

3 steps against the key's 2: "Open a file" with the upload (1), the Thank-you cards layer (2),
Which nodes opened (3). Step 3 is a check of "and" against "or" that the collapsed chips did not
answer; it led to the answer on screen ("Nodes that pass every condition") and was not abandoned,
so it is not a wrong turn. Nothing was typed into the opened cards and Done was not pressed.

## Problems

1. Severity 2, wording. The collapsed "Which nodes" line shows each card's own count ("hours 30 to
   52, 7 nodes", "trained: yes, 15 nodes") beside the layer's "6 of 24" with nothing saying both
   must hold; "Nodes that pass every condition" appears only once the picker is opened. The
   participant had to reason from 7 and 15 against 6, or open the picker, to know it was "and"
   (step 3, `03.png`; the key records the same gap on this build). A reader who reads one chip
   gets 7 or 15, which T50 grades F.
2. Severity 1, behavior. Opening the picker puts focus in the hours card's first box with its
   value "30" selected (`04.png`), so the next key typed would rewrite a colleague's rule; the
   participant said it made them nervous to edit by accident. This is the settled behavior (focus
   in the card's first box, `answers.md` T50), recorded for the design, not as a defect (step 3).
3. Severity 1, wording. The Color line shows only the hex code "008000"; the color's name is not
   on screen (step 2, `03.png`).
4. Severity 0, opinion. "Style layers" was not the word the persona's tutorial used ("Partition",
   "Ranking"); the layer's name matching the key's line carried them across (step 2, `02.png`).

No build defect: everything the participant met matches what the key says this build does, so no
repro was scripted.
