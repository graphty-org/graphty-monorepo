Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s45 (task T49 A, persona Dev)

Participant model: claude-opus-5-5 (both participant logs record Opus in every model entry, 36
and 15; nothing in the transcript says Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's two logs (20 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Reversed by: the Undo arrow.

## Against the success definition

T49 A asks for Les Miserables opened from the samples with every character red, then, as the
follow-up, the picture put back exactly as it was when it opened. It is graded by the drawing
(`answers.md`, "Rules settled before round 1").

- The start: the first `styles-steps.jsonl` line after the sample opened is `04.png`, look
  `76f16b7d52f0`, colors `#6366f1`. (Lines `01.png` to `03.png`, look `9e7e49b0439e`, are the start
  page's demo and are not the start.)
- The change was made: `07.png`, look `dadecee7d3de`, colors `["#ff0000"]` -- every node red,
  Everything's Fill Color `FF0000`. Drawn `#FF0000`, `colorWord` "red" (hue 0): the asked color
  holds.
- The follow-up answer is in the transcript: one click on the Undo arrow (`08.png`).
- The end: the last line (`08.png`) has look `76f16b7d52f0` and colors `["#6366f1"]`, the start's
  look exactly, as the key says Undo gives on this build. `key.json` draws 77 nodes `#6366f1` and
  254 edges `#a9a9a9`.
- Final screen (`08.png`): blue-violet dots everywhere, Everything's Fill Color `6366F1`, the
  notice "Undid changing node color on Everything.", the Undo tooltip "Nothing to undo". The
  participant's closing claim (back to 6366F1, only the one change undone) matches the screen and
  the style tree.

`styles.json`'s `start` and `changes` hold the start page's demo, so its "gone" list (the Louvain
run and nine layers) is the demo's, not the participant's doing, and is not graded.

## Steps

6 steps against the key's 5 + 1. A first `--click "Samples"` was refused by the tool as
ambiguous (two controls share the name) and did nothing, so it is no step. Then: Samples by
position (1), the Les Miserables card (2), Everything (3), the color box (4), `FF0000` with Enter
(5); after the follow-up, the Undo arrow (6). Step for step the success path; the participant
typed the hex `FF0000` where the key types `red`, the same one step and the same drawn value. No
wrong turns.

## Problems

1. Severity 1, accessibility. Two reachable controls on the start screen are both named
   "Samples" (the top bar link and the big button in the box), so a click by name was ambiguous
   (step 1, `01.png`/`02.png`). The participant noticed it ("Samples appears twice on the first
   screen") and picked the big one. Bar 6 asks that no two reachable controls share an accessible
   name; recorded for the audit. The refused click itself is a tool event, not reader confusion.
2. Severity 1, opinion. The color box shows only a hex code (`6366F1`), and nothing on screen says
   that a color word such as `red` is accepted. This participant knew `FF0000` from a class and
   said a classmate who does not know hex might be stuck; the picker behind the swatch was not
   tried (step 5, `05.png`/`06.png`).
3. Severity 1, wording. The storage notice ("This browser may clear what it keeps...") shown when
   the sample opened made the participant "a bit nervous about losing work" on a task that needs
   no saving (step 3, `04.png`).

No build defect seen on this route, so no repro was made.

## What worked

- "Everything styles all 77 nodes" told the participant at once that the layer they had guessed
  was the one for every character (`05.png`).
- Clicking the color box selected its value, so the typed hex replaced it cleanly (`06.png`).
- The Undo arrow was noticed unprompted when the color changed (`07.png`), and was the first and
  only move for the follow-up. Its notice "Undid changing node color on Everything." and the
  "Nothing to undo" tooltip let the participant check that exactly one change was reversed.
