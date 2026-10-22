Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s32 (task T41 B, persona Alex)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (73 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the start page's "Open a file"; the top bar reads "sources").
Persona note: Alex knows Gephi; this result is reported with who he is and does not stand in for
the newcomers.

## Against the success definition

T41 B asks for `sources.graphml` opened, every source who is on the record AND has no email
painted bright red, everyone else unchanged, and their names reported.

- Layer: one node layer "Layer 1" with two cards, `on_record` = Yes ("on_record: yes, 12 nodes")
  and `email` "Has no value" ("email: no value, 9 nodes"), "4 of 24 nodes" (`11.png`, `12.png`).
  `styles.json`: the rule is all of `data.on_record` exactly true and not `data.email` having a
  value, matched 4, Node color painted on 4 -- the stack the key counts.
- Color: Fill `FF0000`, drawn `#ff0000`; `colorWord` gives "red", which holds for "bright red"
  ("bright" recorded, not graded). The key reads "Color: Layer 1, 4 of 24 nodes".
- Everyone else unchanged: `key.json` draws 4 nodes `#ff0000` and 20 at the default `#6366f1`;
  the 59 ties stay `#a9a9a9`. No other layer was touched.
- Names: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga -- the answer
  exactly. Each was on screen before it was given: the layer's Values tab lists the members as
  s05, s11, s17, s19 (`15.png`); the table shows s05 Della Whitfield and s11 Ines Moreau (cut at the
  bottom edge, also on the read-the-file page, `02.png`) in `15.png`, and s17 Friends of the
  Waterfront and s19 Tomas Varga in `16.png`. All four red dots are on screen in the last
  screenshot.
- Final screen (`16.png`) matches the key's: four red dots, the key "4 of 24 nodes", the layer
  matching 4.

## Steps

16 steps against the key's 18. Open a file with the file (1), Load (2), "+" (3), Layer (4), Which
nodes (5), Add a condition (6), on_record (7), Add a condition (8), email (9), its match menu
(10), Has no value (11), Fill "+" (12, which closed the picker and stands for the key's Done),
`FF0000` with Enter (13), Table (14), the layer's Values tab (15), one scroll (16). The key's four
dot clicks are replaced by the Values tab's member ids and the table. No move led away from the
success state. Picker opened unprompted on a single layer at step 5.

## Problems

1. Severity 3, behavior. The table never marks which rows the layer paints and offers no way to
   show only them, so the reader matched the four ids by eye against 24 rows and checked them
   against the counts (steps 14-16, `14.png` to `16.png`). Also in the key, and met on the same
   half in r1-s30; one half only, so not confirmed as a design problem by the two-halves rule.
2. Severity 2, behavior. The layer's Values tab lists its Members by id (s05, s11, s17, s19) while
   the file has a name column, so the one list of who the layer paints cannot be read or handed on
   without the table (step 15, `15.png`). The participant named it the step where he would make a
   mistake.
3. Severity 1, behavior. A new text card on `email` starts on "Contains" with a text box; "Has no
   value" sits only in its match menu, found on the first look here (steps 8-10, `09.png`,
   `10.png`).
4. Severity 1, wording. The way to start coloring a subset is a small "+" beside "Style layers"
   whose menu offers "Layer"; the participant called it developer-speak and chose it only because
   nothing else looked like coloring (steps 3-4, `03.png`, `04.png`).
5. Severity 1, behavior. The table opens with s11 half cut off at its bottom edge; a scroll is
   needed for the rest (step 14, `15.png`).
6. Severity 0, behavior. A yes/no card starts on Yes without the reader choosing; right for this
   task, noted by the participant as choosing for him (step 7, `08.png`).

No build defect: nothing here contradicts what the key says the build does, so no repro was
scripted.
