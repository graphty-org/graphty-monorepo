Grade: S
False done: 0
Wrong turns: 0
Overwhelm: 2 -- node color box -- "I clicked the box expecting a palette like Cytoscape's colour chooser and nothing opened -- no swatches, no hint text I could see. For a few seconds I didn't know if I'd clicked the wrong thing or if it was broken"

# r1-s04 grade (task T70B, persona Maren, participant model opus)

Build 1e123d7d33 (tier5-r1d1-1e123d7d33), 1440 x 900, pointer. Steps: 25 against the answer
key's 15 (+10). Tool refusal: none (two "ambiguous" lines at steps 2 and 14 were the tool's
name-one guard on a click; the session went on). Leaks: none (`leaks.json` read two transcripts,
44 calls, no leak).

## End state against the success definition

The last screenshot (18.png) and the end-state records match T70 B's success:

- Filter: one Data filter card keeping `telemetry` yes. Top bar "7 of 11 nodes, 3 of 13 edges";
  `data.json` visibleNodes 7 of totalNodes 11, filter-1 count 7 of 11; nothing deleted (sources
  still 11 nodes and 13 edges).
- Layer: "1990s gauges", Which nodes "installed 1990 to 1999", "2 of 7"; key "Color: 1990s
  gauges, 2 of 7 nodes"; `key.json` draws 2 nodes in #ffa500. Fill FFA500 is plainly orange.
- Reported: 7 gauges in the picture and 2 orange (Upper Falls 1998, Lake Inlet 1999), with G05
  (1995) named as out of the picture because it sends no readings -- the key's values exactly.

Route: filter first (an "also success" order), then the layer with Between 1990 to 1999 instead of
Before 2000 (the key's equal route with more steps). The filter opened from the canvas toolbar's
Filters button, which saved the path's Data click (-1). The eleven extra steps: Graph place click
(1), renaming the layer by typing a name and Enter (2), opening the test list and choosing Between
(2), clicking each year box and typing the second year (3), clicking into the empty color box
before typing (1), and two clicks the tool turned away as ambiguous ("telemetry", "Fill"), each
followed by the named one (2).

Wrong turns 0: no place outside the path, no menu or picker closed empty, no undo or removal. The
two ambiguous clicks did nothing in the app and are tool lines, not turns.

False done 0: the claim of done at step 17 matches the screen and the records.

Follow-up: answered in the transcript (rating 2; least sure at the empty Fill color box, 17.png;
the drawing while choosing).

## Problems

1. **The empty Fill color box gives no sign that it takes a typed color** (severity 2, behavior).
   Steps 15-16 (16.png, 17.png): after Fill "+", the Color row is an empty box with a tiny empty
   swatch, no placeholder; a click in the box focuses it and opens nothing. The participant got
   orange only by guessing she could type the word, and named this as the moment she was least
   sure. The picker opens only from the small swatch at the box's left edge, which she did not
   find. Same control as the other T70 B session's least-sure moment (the picker there), on the
   same half.
2. **The selection preview colors the matches green while the person is building an orange
   layer** (severity 2, behavior). Step 13 (14.png): with "Group colors" on in the workspace
   header, the two matches draw in the group's green (#009E73) and the five others fade to pale
   lilac. She read it as "selected", but "it did briefly read like 'these will be green', and I
   was making an orange layer"; she would rather see a neutral ring or outline on the matches, or
   the layer's color once one is set. Answers the preview question.
3. **Ticking a value in a filter does not say whether it keeps or removes those nodes**
   (severity 1, wording). Step 4 (05.png): she guessed "keeps" and only the top bar's "7 of 11"
   confirmed it afterwards.
4. **Whether a Between range's end year includes that whole year is unstated** (severity 1,
   wording). Step 13 (14.png): "1990 to 1999" includes all of 1999 (Lake Inlet, Oct 11, 1999,
   matches), but she could tell only from which rows matched.
5. **One kept gauge sits under the canvas toolbar with the node table open** (severity 1,
   behavior; already in answers.md for T70 B). 18.png: the node at the bottom middle of the canvas
   is behind the toolbar, so the drawing shows 6 of 7. She noticed it and counted from the top bar.
6. **"telemetry" names both the picker option and another control in the filter workspace**
   (severity 1, accessibility). Step 2 (03.png): a click by name matched a button "telemetry" and
   the option "telemetry, 2 values"; a screen reader user hears two controls of one name. Already
   noted in answers.md for `role` in T70 A; here it holds for `telemetry` too.
