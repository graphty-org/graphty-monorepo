# Grade: session r5-s08b -- Jordan (regular analyst), Les Miserables (T22 B), ties that meet a condition

**Grade: S** (success). The last screen (`07.png`) matches the answer key's B end state: the line
under the find box reads "13 edges selected", the Selection row reads 13, the inspector header
reads "13 edges selected" with Summary Edges 13, and the "Selected edges" table (Edge,
shared_chapters) lists exactly the key's 13 ties with the key's values (MmeMagloire -- Myriel 10
through Bossuet -- Enjolras 10, Cosette -- Valjean 31). The 13 ties are drawn as thick blue bands,
every gray tie is still drawn and the PageRank row still reads 77. No filter step exists
(`work.json`: steps empty at start and end). Jordan answered "13 ties have 10 or more shared
chapters; they are the blue ties on the drawing", read from the screen.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, with no uncommitted changes. Start: the Les Miserables setup (PageRank run,
nodes sized and colored by PageRank). Seven screenshots for seven steps; `leaks.json` shows no leaks
over 17 calls. Not void.

## The answer against the key

- **Marked (right).** `07.png`: exactly the 13 key ties selected and drawn in blue; nothing hidden.
- **Count (right).** 13, read from the line under the box, the inspector and the table, which agree.
  Jordan also checked that the two ties of exactly 10 are included ("ten or more", not "more than
  ten").
- **Work kept.** `work.json`: the start and end lists are identical (one PageRank run, three style
  layers, no notes, no steps, one source). Nothing gone, nothing added.

## Measures

- **Route:** a rule in the find box. Jordan typed `shared_chapters >= 10` without "=" and had not
  been shown "=" anywhere before typing. The box answered with "Start with = to select by a value:"
  and the marked option row "=shared_chapters >= `10`" over "Select its matches" (`06.png`); one
  click on it selected the 13 (`07.png`). Did not use 16.
- **Where Jordan looked first:** Everything > Style > Edges (`02.png`, `03.png`), hovered the
  chain-link icon beside Color ("Color by attribute"), and opened the "Color by attribute" picker,
  which lists shared_chapters (`05.png`). That is where `shared_chapters` was found. Jordan judged
  that a color ramp over every tie gives neither "just the 10-plus ones" nor a count and left with
  Escape without picking anything. This is the place looked for a select-by-condition control; none
  was found there.
- **Steps:** 6 `real.mjs` steps after the start (02 to 07), against a success path of 3: the 4-step
  look in the Style tab, then type in the find box, then click the option. 2x the success path.
- **Wrong turns:** 0. The Style-tab look (steps 02 to 05) changed nothing: no attribute was picked,
  no layer was added (`work.json` identical at start and end), and the panel was left with Escape.
  It is counted as exploration, as in earlier rounds where a look that changed nothing was not
  counted, and unlike r5-s03b and r5-s06b, where the same route applied a style that was then undone
  or abandoned.
- **False "done":** none. "13 ties ... picked out in blue on the full drawing, nothing hidden" is
  true on `07.png`. truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                        |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | 2        | findability     | The Style tab, where a returning user colors things, offers only one color for every tie or a ramp by an attribute; it has no way to mark the ties above a value and no pointer to the find box's rules. Cost 4 steps here.                    | `03.png`, `05.png`; transcript steps 03-05 and "What confused me"                               |
| 2   | 1        | findability     | The empty find box ("Find nodes, edges, values") gives no sign that it takes a condition; Jordan found it only by guessing. The "Start with = to select by a value" hint appeared only after a condition was typed.                             | `05.png` (empty box), `06.png` (hint); transcript step 05 and "What confused me"                |
| 3   | 1        | wording         | The rewritten rule wraps the number in backticks ("=shared_chapters >= `10`"), a syntax Jordan says he would never type himself.                                                                                                                | `06.png`; transcript step 06 and "What confused me"                                             |
| 4   | 1        | missing feature | The marking is only a selection: there is no visible way to keep the 10-plus ties marked as a style with a key ("blue = 10+ chapters") for a slide. Did not affect the task; loss on a later click was not observed in this session.          | transcript "What confused me"                                                                   |

Problem 1 matches r5-s03b and r5-s06b (the same Everything > Style > Edges route on the same build)
and is confirmed. Problem 2 matches r5-s06b's second problem and is confirmed. Problem 3 matches
r5-s06b's held-down opinion. Problem 4 matches r5-s01b's second problem and round 4's r4-s10.
