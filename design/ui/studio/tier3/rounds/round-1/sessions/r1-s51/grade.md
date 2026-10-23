Grade: S
False done: no
Wrong turns: 0
Read from: rule

# Grade: r1-s51 (task T50 A, persona Elena)

Participant model: claude-opus-5-5 (the participant log records Opus in all 37 model entries;
nothing in the transcript says Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (14 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page with "Open a file").

## Against the success definition

T50 A asks for lesmis-poster.graphty.json opened, the orange characters named, and what they have
in common said, read from the layer's conditions.

- The project opened with its look: three orange nodes, the key "Color: Poster" with "3 of 77
  nodes", and the layers Hovered, Selected, Poster (3) and Everything (77) (`02.png`).
- The rule was read from the layer's conditions: step 3 (`04.png`) opened Poster on Style, with
  "Which nodes 3 of 77 nodes", the chip "name contains Mlle, 3 nodes" and Color FFA500. One name
  (Mlle Baptistine, step 2) had been seen before, so the rule was not inferred from the names; the
  participant read it off the chip and then checked the name against it.
- The three names: a click on each orange dot (steps 2, 4 and 5; `03.png`, `05.png`, `06.png`)
  showed Mlle Baptistine, Mlle Vaubois and Mlle Gillenormand, the key's three. The participant
  checked the count against the key's "3 of 77 nodes".
- The color: the drawn value is `#ffa500` on 3 nodes (`key.json`; 74 nodes `#6366f1`, 254 edges
  `#a9a9a9`); `colorWord` gives "orange" (the CSS keyword). Mlle Gillenormand is left selected in
  `06.png`; the style tree still paints it `#ffa500`.
- Final screen (`06.png`): Mlle Gillenormand's node inspector on Values (id, name, Degree 7), three
  orange dots, the key "Color: Poster 3 of 77 nodes". This is the last name's card, not the layer's
  Style that the key names as the final screen; the rule had been on screen at step 3 and the
  answer stands on it. Nothing changed: `styles-steps.jsonl` keeps look `1328d3dd4bea` from `02.png`
  to `06.png`, and `styles.json` `changes.changed` is empty (the `gone`/`added` lists are the start
  page's demo replaced by the project's own layers at the open). The closing claim matches the
  screen.

## Steps

5 steps, the key's own count for this route: "Open a file" with the upload (1), the Poster layer
(the rule, 1), and a click on each of the three orange dots (3; the key's "or click each orange dot
(3 more steps)" in place of the Values tab). The order differed (one dot before the layer), which
costs nothing. No wrong turns.

## Problems

1. Severity 2, behavior. No place the participant found lists the three orange characters by name;
   they were named only by clicking each dot, one of them small and half hidden in the crowded part
   of the drawing (steps 2, 4, 5; `05.png`). The layer's Values tab, which lists the members (by id),
   was not noticed. The drawing itself names no node (known on this build, `answers.md` T50).
2. Severity 1, behavior. Each node click glides the camera to center the pick, so the next orange
   dot moved before the participant could click it ("it recenters every time I click a dot"; steps
   2, 4, 5; `03.png`, `05.png`, `06.png`). This is the settled framing (`decided.md` 2026-10-20),
   recorded for the design, not as a defect.
3. Severity 1, opinion. Nothing ties the key's "Color: Poster" to the layer list where the rule
   lives; the participant found it only by matching the name "Poster" in both places (step 3,
   `03.png`). The key does nothing on click and has no tooltip (known, `answers.md` T50).
4. Severity 1, wording. "Degree" on each node's card meant nothing to a newcomer and was ignored
   (steps 2, 4, 5; `06.png`).

No build defect: everything the participant met matches what the key says this build does, so no
repro was scripted.
