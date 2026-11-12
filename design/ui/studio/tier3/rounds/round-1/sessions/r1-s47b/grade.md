Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s47b (task T49 A, persona Tom)

Participant model: claude-opus-5-5 (both participant logs record Opus in every model entry; the
only "Sonnet" in them is a skill description, not the model).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read both participant logs (26 tool calls) and lists no file opened
outside the session's own folder. No `downloads/` or `saved/` files.
Reversed by: the Undo arrow in the top bar, one click.
Follow-up answered: yes, in the transcript ("Follow-up" section, `09.png`, `10.png`).

## Against the success definition

T49 A asks for the Les Miserables sample opened with every character red, then, as the follow-up,
the picture put back exactly as it was when it opened. It is graded by the drawing.

- The start: the first `styles-steps.jsonl` line after the sample opened is `04.png`, look
  `76f16b7d52f0`, colors `["#6366f1"]` (`01.png` to `03.png`, look `9e7e49b0439e`, are the start
  page's demo).
- The change: `07.png` and `08.png`, look `47435bf47f4e`, colors `["#f16363"]` -- every node one
  color, Everything's Fill Color `F16363`, set by dragging the picker's hue slider to its red end.
  Drawn `#F16363`; `colorWord("#F16363")` is "red" (hue 0, lightness 0.67, not a CSS keyword), so
  the asked red holds. The participant called it "a bit of a salmon red"; shade is recorded, not
  graded.
- The end: the last line (`10.png`) has look `76f16b7d52f0` and colors `["#6366f1"]` -- the start's
  look exactly, as the key records for Undo. `key.json` draws 77 nodes `#6366f1` and 254 edges
  `#a9a9a9`. The last screenshot shows blue-violet dots, Color `6366F1`, the notice "Undid changing
  node color on Everything." and Undo's tooltip "Nothing to undo".

S: the change was made, and the last look equals the start's.

## Steps and wrong turns

7 steps against the key's 5 + 1. A first `--click "Samples"` was refused by the tool as ambiguous
(two controls share the name) and did nothing: a tool event, no step. Then: Samples by position
(1), the card "Who holds the novel together" (2), Everything (3), the color swatch "Pick node
color" (4), the hue slider's red end (5), Close panel (6); after the follow-up, a wait (no step)
and the Undo arrow (7). The picker route costs one step more than typing `red` in the box (open,
pick, close against click, type). No move led away from the success state: 0 wrong turns.

False done: no. "I'm done" at step 6 was true (`08.png`, all 77 dots `#F16363`), and the follow-up
claim "back exactly as it was" is true in the drawing and in the style tree (same look).

## Problems

1. Severity 2, opinion. The color is shown only as a hex code (`6366F1`, `F16363`); nothing visible
   names it, and nothing says a color word such as `red` is accepted in the box. The participant
   "wouldn't type a code" and did not know what the numbers meant, so he reached red by the hue
   slider instead (steps 4-6, `05.png`, `06.png`, `07.png`; wrap-up). The same hex-only reading is
   recorded on T49 A (r1-s45) and T49 B (r1-s46).
2. Severity 1, behavior. Dragging only the hue slider keeps the old color's saturation and
   brightness, so "red" from indigo comes out a muted salmon (`F16363`), and the participant said
   he would not know how to get a "proper" red without typing a code (step 5, `07.png`). The
   picker's swatch row offers no red (`06.png`: indigo, gray, blue, yellow, black).
3. Severity 1, accessibility. Two reachable controls on the start screen are both named "Samples"
   (the top bar link and the big button), so a click by name was ambiguous (`01.png`, `02.png`).
   The refused click is a tool event; the shared name is recorded for the audit (also r1-s45,
   r1-s46).
4. Severity 1, wording. "Everything" sits beside "Hovered" and "Selected" under "Style layers"; the
   participant guessed it meant all characters only from its count, 77 (step 4, `04.png`), and
   found Color only by looking for a colored square among Shape, Visibility, Text, Fill, Effects
   and Rendering (step 5, `05.png`).
5. Severity 1, wording. The help line under "Style nodes" ("Everything styles all 77 nodes: it is
   the base layer, under every other layer.") is in small gray text the persona said he would need
   glasses for (`05.png`). Recorded as reported; not measured here.

No build defect seen on this route, so no repro was made.

## What worked

- The sample card's title and counts (77 nodes, 254 edges) matched the opened graph and the
  Everything row's 77, which confirmed both the network and the layer (`03.png`, `04.png`).
- The drawing changed the moment the hue slider moved, so applying needed no extra action
  (`07.png`).
- Undo named exactly what it reversed ("Undo changing node color on Everything"), its notice
  confirmed it, and "Nothing to undo" told the participant nothing of his was left (`10.png`).
