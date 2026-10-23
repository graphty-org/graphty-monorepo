Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s30 (task T41 B, persona Grace)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (36 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the start page's "Open a file"; the top bar reads "sources").

## Against the success definition

T41 B asks for `sources.graphml` opened, every source who is on the record AND has no email
painted bright red, everyone else unchanged, and their names reported.

- Layer: one node layer "On record, no email" with two cards, `on_record` = Yes ("on_record: yes,
  12 nodes") and `email` "Has no value" ("email: no value, 9 nodes"), "4 of 24 nodes" (`12.png`,
  `17.png`). `styles.json`: the rule is all of `data.on_record` exactly true and not `data.email`
  having a value -- the stack the key counts.
- Color: Fill `FF0000`, drawn `#ff0000`; `colorWord` gives "red", which holds for "bright red"
  ("bright" recorded, not graded). The key reads "Color: On record, no email, 4 of 24 nodes".
- Everyone else unchanged: `key.json` draws 4 nodes `#ff0000` and 20 at the default `#6366f1`;
  the 59 ties stay `#a9a9a9`. No other layer was touched.
- Names: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga -- the answer
  exactly. Each was on screen with Yes and a blank email before it was given: s05 and s11 in the
  read-the-file page (`02.png`) and the table (`15.png`, s11 cut at the bottom edge), s17 and s19
  in the table (`16.png`, `17.png`). All four red dots are on screen in the last screenshot.
- Final screen (`17.png`) matches the key's: four red dots, the two cards, "4 of 24".

## Steps

17 steps against the key's 18. Open a file with the file (1), Load (2), "+" (3), Layer (4), the
layer named "On record, no email" with Enter (5, an extra step the key does not have), Which
nodes (6), Add a condition (7), on_record (8), Add a condition (9), email (10), its match menu
(11), Has no value (12), Fill "+" (13), `FF0000` with Enter (14), Table (15), two scrolls (16,
17). The key's Done and four dot clicks are replaced by reading the table. No move led away from
the success state.

## Problems

1. Severity 3, behavior. The table and the inspector never mark which rows the layer paints, and
   offers no way to show only them, so the reader reads all 24 rows by eye and checks the names
   against the "4 of 24" count (steps 15-17, `15.png` to `17.png`). Also in the key.
2. Severity 2, behavior. No names on the drawing after the color lands: four red dots, no way to
   tell who they are without a click per dot or the table (step 14, `14.png`).
3. Severity 1, wording. The way to start a group of colored people is a small "+" beside "Style
   layers" whose menu offers "Layer"; the participant guessed it and said "Layer" is not a word
   she would use (steps 3-4, `03.png`, `04.png`).
4. Severity 1, behavior. The table opens with s11 half cut off at its bottom edge, and needed two
   scrolls to read all 24 rows; s11 was read in full only on the read-the-file page (steps 15-17,
   `15.png`).

No build defect: nothing here contradicts what the key says the build does, so no repro was
scripted.
