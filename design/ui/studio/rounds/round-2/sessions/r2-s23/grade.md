# Grade: session r2-s23 -- Elena, the Medici and the families they married into

**Grade: SD** (success with difficulty). The last screenshot (`06.png`) shows the Medici selected,
the panel "Medici -- Neighborhood" with the heading "Medici's 6 connections" and the list
Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Elena read one fact first ("Degree
6", `04.png`) and at the end named all six families and the count 6 from that list. That meets the
task's Success B. It is SD rather than S because her first click on the row's cue, the chevron at
the right end of "Degree 6 >", did nothing (`05.png`), and she reached the list only by trying again
on the word "Degree".

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), 1440 x 900, no uncommitted changes. No
files were downloaded (none were asked for).

- **Route:** the Degree row ("Degree 6 >"), reached on the second click. The Medici were selected
  by clicking a dot on the drawing, not through the find box.
- **Failure codes:** none.
- **Build-affected:** yes, it cost a step but did not decide the outcome. **Build-decided:** no.
- **Void:** no. Every tool step did what a person could do.

## Steps and wrong turns

| Measure               | This session             | Success path                                                                  |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Steps after the start | 5 (`02.png` to `06.png`) | 6 by the find box (open, `/`, type, Down, Enter, Degree), plus the usage card |
| Wrong turns           | 1                        | 0                                                                             |

The wrong turn is step 5, the click on the chevron (`05.png`). Clicking the middle dot instead of
searching is not counted as a wrong turn: it landed on the Medici and is a shorter route than the
find box. It was a guess, though, not something the screen supported (problem 3).

## False "done"

None. "The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati and
Tornabuoni" matches `06.png`. "An id and a name (both 'Medici') and 'Degree 6'" matches `04.png`.
The screen says "connections", not marriages; the sample is a marriage network, so her reading is
correct, though the screen itself never says so (problem 5). truth_on_screen: not applicable.

Her remark "the one in the middle IS the Medici. So it's the most important family" (step 4) is a
belief taken from where the dot sits in the drawing, not a claim that a step is done. It happens
to be true for this sample (the Medici have the most marriages), but nothing on screen said it.

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. The build defect is reproduced by
`rounds/round-2/repro/r2-s23/repro.sh` (the session's own clicks, run twice, `run1/` and `run2/`,
logs `run1.log`, `run2.log`). Both runs: the click at the chevron (1410,236) lands on group
"Summary values" and `--expect-not "Medici's 6 connections"` holds (`run*/05.png`, row shaded, no
list); `--click "Degree"` then opens "Medici's 6 connections" (`run*/06.png`, the same as
`06.png`). The same defect was reproduced on Les Miserables by the graders of sessions r2-s19 and
r2-s21.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                                               |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | The chevron drawn at the right end of the "Degree 6 >" row is outside the row's button. A click on it lands on the surrounding "Summary values" group, which only shades the row and opens nothing. The chevron is the only cue that the row goes further, so the spot a reader is most likely to click is the one that does nothing. Elena: "Nothing happened. Maybe I missed the little arrow." | Step 5, `05.png` (tool: "at 1410,236: group Summary values"). Repro: `run1/05.png`, `run2/05.png` (chevron, no list), `run1/06.png`, `run2/06.png` (the word "Degree" opens the list). |
| 2   | 2   | wording      | "Degree" does not tell a first-time reader that it is how many families the Medici are tied to. Elena: "I don't know what Degree is"; she pressed it only because it was the one row with an arrow, and learned its meaning from the list heading afterwards.                                                                                                                                     | Step 4, `04.png`; step 6, `06.png`. Also seen in r2-s19.                                                                                                                               |
| 3   | 2   | behavior     | No names are drawn on the dots, so Elena could not tell which dot was the Medici. She guessed the middle, most connected dot and did not think of the find box at the top left. The guess worked here; on a sample whose layout puts the target elsewhere she would have clicked dot by dot. She also read the dot's central position as importance, which the drawing does not mean.             | Step 3, `03.png`; step 4, `04.png`; end of transcript ("I did not think to use the search box").                                                                                       |
| 4   | 2   | behavior     | After the list opens, "Selection 7" (left) sits beside "Medici's 6 connections" (right), with nothing saying the 7 is the 6 plus the Medici. Elena paused and guessed right; a reader who reports the selection count reports 7.                                                                                                                                                                  | Step 6, `06.png`. Also seen in r2-s19 ("Selection 18" beside 17).                                                                                                                      |
| 5   | 1   | wording      | The list says "connections"; nothing on the Graph screen says a connection in this sample is a marriage. Elena assumed it from what the sample is about.                                                                                                                                                                                                                                          | Step 6, `06.png`.                                                                                                                                                                      |
| 6   | 1   | opinion      | The overview after opening ("Density 0.1905", "Components 1") means nothing to this reader and was ignored.                                                                                                                                                                                                                                                                                       | Step 3, `03.png`.                                                                                                                                                                      |

What worked, for the record: the Florentine families sample was found at once on the start page,
and once the Degree row opened, the list gave exactly the names the task asked for, alphabetically,
with the count in the heading.
