# Grade: session r3-s27 -- Ruth (reporter), task T9 B, Florentine families

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (14.png), the size-binding screenshots (09.png to
11.png) and the transcript. The session saved no files (there is no `downloads/` folder). Not graded
from the participant's rating (5 of 7).

## Grade: SD (success with difficulty)

Every part of the success definition holds in 14.png:

1. **A ranking was run.** Steps 2-4: Analyze (the flask), Betweenness, Run. The outline gains a
   "Betweenness 15" row and the key reads "Color: Betweenness 0 to 47.5" (05.png). Betweenness is
   a ranking measure from the "Rank nodes and edges" list. She picked it over the "Start here"
   PageRank on her own reading of the task's "depends on most", which is a sound reading.
2. **Sizes are bound to it.** Steps 5-10: the run row, "Add to Shape", Size, then (after the slip
   below) the chain-link and the option "Betweenness". The Size line reads "1 to 3" (11.png). The
   dots differ visibly: Medici large in the middle, Guadagni and one more medium, the rest small.
   The key gains "Size: Betweenness 0 to 47.5" above the color row (11.png, 14.png).
3. **Meaning stated from the screen.** Debrief: both size and color stand for Betweenness, "how
   often a family sits on the shortest chain of marriages between two other families"; bigger and
   darker means the network runs through that family more. Read from the key (both rows say
   "Betweenness") and from the Analyze card's line "Which nodes sit on the most shortest paths
   between others" (04.png). Correct. Her named ranks were on screen before she stated them:
   Medici "47.5, #1 of 15" (13.png) and Guadagni "23.17, #2 of 15" (14.png). Both match the
   reference values (Medici 47.5, Guadagni 23.17).

**Why SD and not S:** one detour then a correction on the size step. At step 8 her click meant for
the option "Betweenness" in the "Size by attribute" list landed on the outline's "Betweenness" row
(the tool printed `ambiguous ... took the first`). The list closed and left a Size line with a
fixed "1" and unchanged dots (09.png). She saw the dots had not changed, found the chain-link
beside the Size box (step 9, 10.png) and chose the option (step 10, 11.png). The answer key scores
reaching the binding by the chain-link after the list closed as a detour then a correction: SD on
round 3. The slip came from an ambiguous tool command rather than from her reading of the screen;
if it is discounted the session is an S. Either way it counts as a success.

- **The size list:** used, then closed by the slip (not by Escape, not by "Fixed size"), then
  reopened by the chain-link and answered with "Betweenness". "Fixed size" was never chosen.
- **Did she mention the sizes not changing:** yes, twice: after Run ("The dots are still all the
  same size", step 4) and after the slip ("The dots are unchanged in size", step 8).
- **Usage card:** declined ("No thanks", step 1). No detour, no wrong belief about what is sent.
- **Run name:** no pause over the run's name; the row, inspector and key all read "Betweenness".
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. The step 8 click went to a control a person could click (the outline row, visible
  and enabled), and the tool printed the ambiguity. It did not change the end state; the
  participant recovered on screen. The hover at step 11 reached a node (the tool reports the id);
  the app showed nothing because no tooltip line was set, which is how the build behaves, not a
  tool fault.

## Counts

|                               | This session                             | Reference (round 3 path) |
| ----------------------------- | ---------------------------------------- | ------------------------ |
| Commands to the success state | 10 step commands (11 actions) to step 10 | 8 steps, 10 commands     |
| Commands in the whole session | 13 step commands (14 actions)            | --                       |
| Wrong turns                   | 1                                        | --                       |

- **The wrong turn:** step 8, the click that closed the size list (09.png); corrected at steps 9-10.
- **Not counted as wrong turns:** declining the usage card (step 1). Choosing Betweenness over
  PageRank (a defensible ranking, on the success path). The hover at step 11 and the two node
  clicks at steps 12-13, which came after the success state and changed nothing on the drawing.

## False "done"

None. She said "I'm done: the drawing shows what I was asked for" (step 13) and "Yes. The dots
are now sized by Betweenness, and colored by Betweenness too" (debrief). The screen agrees: Size
reads "1 to 3", the key shows "Size: Betweenness" and "Color: Betweenness", and the dots differ
(14.png). She also said plainly what she could not do (name the dots without clicking, explain
what the number 47.5 counts); neither is a claim the screen contradicts.

## Bars touched

- **Bar 4 (silent commit):** none. Run changed every dot's color (04.png to 05.png). Binding the
  size changed the dot sizes and the key (10.png to 11.png). The fixed "1" left at step 8 was not
  a commit she made: the list closed under a stray click, and she did not believe it had sized
  anything.
- **Bar 5 (counts and key against the drawing):** the key's range 0 to 47.5 matches the reference
  maximum (Medici 47.5). "Betweenness 15" matches the 15 families. "#1 of 15" and "#2 of 15" match
  the reference order. No mismatch.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. One problem is a build
defect reproduced by a scripted path; the rest are seen in this one participant.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                | Evidence                                                                                                                                                                                                                                                                                                          |
| --- | --- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | The key in the canvas's top-left corner covers a family's dot. The Pazzi dot at about 531,84 is visible on load (02.png) and hidden under the key from the moment the run finishes (05.png onward), so that family's size and color cannot be read. Same on every run. | Session: 02.png against 05.png, 11.png, 14.png; debrief "the key box ... sits on top of a dot". Repro: `rounds/round-3/repro/r3-s27/repro.sh` -- hovering 531,84 reports `node with id "Pazzi"` before the run (run/03.png) and `div` (the key) after the run and after sizes are bound (run/07.png, run/12.png). |
| 2   | 2   | behavior     | No family names on the dots, and hovering a dot shows nothing. To say which family is biggest she had to click each dot. For a reporter, sizes without names do not answer "which families".                                                                           | Step 11: 11.png against 12.png, identical; the tool reports a node under the pointer. Steps 12-13, 13.png, 14.png.                                                                                                                                                                                                |
| 3   | 2   | wording      | The key's numbers (0 to 47.5) carry no unit or meaning. The only explanation was the one-line description on the Analyze card before Run, which is gone once the run is done. She could not say what 47.5 counts without relying on memory of that card.               | Step 12 hesitation; debrief; 11.png key.                                                                                                                                                                                                                                                                          |
| 4   | 1   | wording      | Size sits under "Shape", behind a "+". With no word "Size" on the Style tab she guessed "a dot's size is part of its shape" and found it.                                                                                                                              | Steps 5-7, 06.png, 07.png.                                                                                                                                                                                                                                                                                        |
| 5   | 1   | wording      | The "Start here" tag on PageRank pulled against the task's "depends on most", which Betweenness's line matches better. She resisted it, but had to decide between them from one-line descriptions alone.                                                               | Step 2, 03.png.                                                                                                                                                                                                                                                                                                   |
| 6   | 1   | behavior     | A selected dot turns yellow-gold under its ring, so its color cannot be compared with the key while it is selected.                                                                                                                                                    | Step 13, 14.png (Guadagni gold).                                                                                                                                                                                                                                                                                  |
| 7   | 0   | opinion      | Size and color encode the same measure, and the key does not say which families sit at either end of the range. Held one level down as an opinion.                                                                                                                     | 11.png; debrief.                                                                                                                                                                                                                                                                                                  |

**What worked:** the start-page hint "Analyze (flask icon) in the toolbar (Shift+A)" sent her
straight to Analyze. Each analysis has a one-line definition that let her map "depends on most"
to Betweenness. Run colored the dots and added a key at once. The run row opened on Style, Size
under "Add to Shape" opened the from-data list at once with the run's own measure first, and the
chain-link reopened that list when it closed by accident. A node's Values give "47.5, #1 of 15",
a sentence she could pass on as-is.

## Tool note

`--click "Betweenness"` at step 8 matched five controls and took the outline row instead of the
list option. A participant pointing at the option would not have closed the list; the participant
recovered with `role=option:Betweenness`. Recorded as a tool print, not a tool fault: the click
reached a real, visible control.
