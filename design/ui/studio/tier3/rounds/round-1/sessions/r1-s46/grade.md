Grade: F
False done: no
Wrong turns: 0

# Grade: r1-s46 (task T49 B, persona Alex)

Participant model: claude-opus-5-5 (both participant logs record Opus in all 32 model entries;
nothing in the transcript says Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's two logs (23 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Reversed by: typing the old color back (`6366F1`) into the color box.
Follow-up answered: yes, in the transcript ("Follow-up" section).

## The record

When this folder was graded, its `transcript.md`, `styles-steps.jsonl`, `styles.json` and
`key.json` did not belong to its screenshots: they were written at 14:34-14:35 by an earlier start
of r1-s46 (a transcript that clicks the picker's yellow swatch, with no follow-up), and the copy at
`--end` keeps a differing file as it was. The participant's own folder
(`tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s46/`) holds the files that match
`01.png` to `09.png` and the participant's logs. Those four files were copied here; the earlier
ones are kept in `superseded-earlier-start/`. The run itself did not fail, so this is no VOID.

## Against the success definition

T49 B asks for Zachary's karate club opened from the samples with every member yellow, then, as
the follow-up, the picture put back exactly as it was when it opened. It is graded by the drawing
(`answers.md`, "Rules settled before round 1").

- The start: the first `styles-steps.jsonl` line after the sample opened is `04.png`, look
  `76f16b7d52f0`, colors `["#6366f1"]` (lines `01.png` to `03.png`, look `9e7e49b0439e`, are the
  start page's demo).
- The change: `07.png`, look `15fb1e6b06d3`, colors `["#ffd700"]` -- every node one color,
  Everything's Fill Color `FFD700`, typed as a hex by the participant ("I'll just type FFD700
  (yellow)"). Drawn `#FFD700`; `colorWord` gives "gold", because FFD700 is the CSS keyword gold and
  the keyword is returned before any hue band. The app speaks the same word: the box's name on the
  next click is "Node color, set here, gold" (step 6). "gold" does not contain "yellow", so by the
  asked-color rule (`criteria.md`) the asked yellow does not hold, and T49 says a session with no
  line of every node yellow is F, whatever the last look.
- The end: the last line (`09.png`) has look `587e9be416e2` and colors `["#6366f1"]`: the same
  drawing as the start, a tree that differs only in the layer's revision, exactly as the key
  records for typing `6366F1` back. `key.json` draws 34 nodes `#6366f1` and 78 edges `#a9a9a9`.
  The follow-up part on its own would be S.

For the audit: FFD700 has hue 51 degrees, inside `colorWord`'s yellow band (45 to 70), and reads
yellow on screen (`07.png`), so a reader would call this task done. The F comes from the keyword
lookup taking precedence over the hue band, not from the drawing. Whether the grading rule or
the app's naming should change is a question for the criteria, not a call this grade can make.

## Steps

7 steps against the key's 5 + 1. A first `--click "Samples"` was refused by the tool as ambiguous
and did nothing, so it is no step. Then: Samples by position (1), the karate club card (2),
Everything (3), the color box (4), `FFD700` with Enter (5); after the follow-up, the color box
(6) and `6366F1` with Enter (7). Typing the old value back is a listed route, one step longer than
Undo. No wrong turns.

## Problems

1. Severity 2, opinion. The color box shows only a hex code, nothing visible names the color, and
   nothing says that a color word such as `yellow` is accepted. The participant chose `FFD700`
   from memory as "yellow"; the app's own name for it, "gold", lives only in the box's accessible
   name. He said someone who does not know hex "would be stuck" (wrap-up; step 5, `06.png`,
   `07.png`). The same hex-only reading was recorded on T49 A (r1-s45).
2. Severity 2, behavior. Nothing on the field returns it to the value the sample opened with. The
   participant got the picture back exactly only because he had read `6366F1` before overwriting
   it, and did not trust the Undo arrow "to stop at exactly the right point" (follow-up answer;
   `08.png`, `09.png`). Typing it back also leaves a style tree that differs from the start in its
   revision (`587e9be416e2` against `76f16b7d52f0`), which the screen cannot show -- a design
   finding, not a grade.
3. Severity 1, accessibility. Two reachable controls on the start screen are both named "Samples"
   (the top bar link and the big button), so a click by name was ambiguous (`01.png`, `02.png`).
   The refused click is a tool event; the shared name is recorded for the audit (also r1-s45).
4. Severity 1, wording. "Style layers" read as "developer-speak"; the participant would have
   looked for "Color" or "Appearance" first, and guessed Everything from its count (step 4,
   `04.png`, `05.png`).

No build defect seen on this route, so no repro was made.

## What worked

- The sample card's counts (34 nodes, 78 edges) and the panel's matching counts let the
  participant confirm the right network at once (`03.png`, `04.png`).
- "Everything styles all 34 nodes" confirmed the guessed layer (`05.png`).
- Clicking the color box selected its value, so both typed hex codes replaced it cleanly
  (`06.png`, `08.png`).
