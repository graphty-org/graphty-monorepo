# Grade: session r4-s12 -- Alex (regular analyst), Les Miserables (T22 B), ties of 10 or more shared chapters

**Grade: SD** (success with difficulty). The end state is the key's in every part. The last screen
(`11.png`) shows the find box holding "=shared_chapters >= `10`", the line under it "13 edges
selected", the Selection row 13, the inspector titled "13 edges selected" with Summary Edges 13 and
a "Selected edges" table listing exactly the key's 13 ties with their values (MmeMagloire -- Myriel
10 through Bossuet -- Enjolras 10), the 13 ties drawn with thick blue bands, all 77 characters still
drawn (PageRank row 77) and no filter step. Alex answered "13", read from the screen. It is SD, not
S, because the first rule was wrong and had to be retyped after a detour: the rule on a column that
does not exist ("=weight >= `10`") got "Nothing matches this rule" (`06.png`), and Alex opened the
table to find the real column name before typing the right rule. The key lists "a wrong comparison
corrected; a refused rule retyped" under SD.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (PageRank run, size and color by
PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count (right).** 13, read from "13 edges selected" and the inspector (`10.png`, `11.png`).
- **Marked (right).** The 13 ties carry the blue selection band on the full drawing (`11.png`);
  the "Selected edges" list matches the key tie for tie and value for value.
- **Nothing removed (right).** 77 characters, every gray tie still drawn, no filter step;
  `work.json` start and end are identical (one run, three layers, no notes, no steps, one source).
- **Cross-check.** Alex sorted the table's Edges tab by shared_chapters, highest first (`11.png`);
  the top four rows are shaded as selected and agree with the list. The table showed only four rows
  and Alex did not scroll; the count still came from the app's own "13", not from counting lines.

## Measures

- **Route:** a rule in the find box. Alex did not type "=" unprompted: "weight >= 10" was typed
  with no "=", and the box offered "Start with = to select by a value:" with the suggested rule
  "=weight >= `10`" (`05.png`), which Alex clicked. The second time Alex typed
  "shared_chapters >= 10", again without "=", and clicked the suggestion (`09.png`, `10.png`).
- **Where Alex looked for the column name:** the data table's Edges tab (`08.png`: From, To,
  shared_chapters, 254 edges). Not the lone-"=" column list, which Alex never opened.
- **Where Alex looked for a "select by condition" place:** Everything > Style > Edges (`02.png`,
  `03.png`), hovering the link icon by Color ("Color by attribute"). Judged a dead end because it
  gives a ramp, not a cut-off.
- **Steps:** 10 `real.mjs` steps after the start; the success path is 3 (`/`, type, Enter). The
  bare-number correction did not arise: the box built the backticked rule from Alex's text.
- **Wrong turns: 2.** (1) Everything > Style > Edges and the link-icon hover (steps 1-3).
  (2) The "weight" rule, which selected nothing (steps 4-5). Opening the table (steps 6-7) was the
  recovery, and the sort (step 10) a check, not wrong turns.
- **False "done":** none. "Done" at step 10 and the debrief's claims (13 ties, all 10 or more,
  thick blue on the drawing, nothing removed) all hold on `11.png`. truth-on-screen: holds.
- **Silent commit:** none. Clicking "Select its matches" on the right rule drew the bands and set
  every count (`10.png`). The "weight" rule changed nothing on the drawing, and the line under the
  box said so ("Nothing matches this rule").
- **Numbers that disagree:** none on the success path. 13 everywhere it shows.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot and `leaks.json` shows no
  leaks over 28 calls.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                        |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | wrong-result    | The find box turns text naming a column the data does not have ("weight") into a rule and offers it as a working option; run, it says only "Nothing matches this rule", the same words a real rule with no matches would get. Nothing says there is no column called weight or which edge columns exist. A user who trusts it reports zero. Alex caught it only from remembering the data, and spent two extra steps in the table. | `05.png` (suggestion "=weight >= `10`"), `06.png` ("Nothing matches this rule"), `08.png` (only column is shared_chapters); transcript steps 5-7 and debrief |
| 2   | 2        | discoverability | Everything > Style > Edges, where Alex styles every week, offers only a per-value binding ("Color by attribute"), no way to mark the ties past a threshold, and nothing there points to the find box's rules. Cost three steps.                                                                                                                   | `03.png`; transcript step 3 ("Color by attribute ... I can't count from a ramp")                                                                               |
| 3   | 1        | wording         | The backticks around the number in the suggested rule ("`10`") are unexplained; Alex read them as code and did not know why they were there. Opinion, held one level down.                                                                                                                                                       | `05.png`, `09.png`; transcript step 4 and debrief                                                                                                              |
| 4   | 1        | layout          | The data table's open height shows only four rows, so checking the 13 selected ties in it would have meant scrolling; Alex stopped at four and relied on the inspector's list.                                                                                                                                                   | `11.png`; transcript step 10                                                                                                                                    |

Problems 1 to 4 rest on one participant. Problem 1 is a build behavior the answer key already
notes ("The suggestion is not checked"); a scripted repro (type "weight >= 10" in the find box on
this build, take the suggestion) would confirm it at one participant.
