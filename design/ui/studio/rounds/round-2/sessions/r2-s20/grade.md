# Grade: session r2-s20 -- Dev, one character and who he is tied to (Les Miserables)

**Grade: S** (success). Dev opened Les Miserables, found and selected Javert, read a fact about
him (Degree 17), and reached the on-screen list "Javert's 17 connections" through the Degree row,
which is the documented success path. He named all 17 neighbors from that list and gave the count 17. No detour, no help, no wrong turn.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.
No files were downloaded (none needed for this task).

## Against the success definition (prompt A)

- **Javert selected:** `05.png` -- the right panel reads "Javert -- Node", Selection 1, his dot
  highlighted.
- **One fact read:** `05.png` -- Summary: id Javert, name Javert, Degree 17. He reported all three.
- **Neighbors listed on screen by name:** `06.png` (last screenshot) -- "Javert -- Neighborhood",
  heading "Javert's 17 connections", 17 names in alphabetical order.
- **Named at least three and said 17:** his answer lists all 17, spelled exactly as on screen and
  matching the reference list (Babet ... Woman2), and says 17.
- **Route:** the Degree row ("Degree 17 >", the chevron added in round 2). He clicked it because
  the arrow suggested more lay behind it. Not G, not the context menu, not dots one at a time.

## Measures

- **Steps:** 5 `real.mjs` steps after the start (`02.png` to `06.png`), one of which (step 3) was a
  tool selector miss that changed nothing. The success path is 6 (open; `/`; type; Down; Enter;
  Degree); he reached the same place by clicking into the box instead of pressing `/` and clicking
  the suggestion instead of Down and Enter, so 5 steps against 6, about 0.8x.
- **Wrong turns:** 0.
- **False "done":** none. "Part 1 done" at `05.png` (id, name, Degree 17 on screen) and "Part 2
  done" at `06.png` (17 names and the count on screen) are both true. truth_on_screen: not
  applicable.
- **Counts against the drawing:** Selection 18 beside "17 connections" (`06.png`) is Javert plus
  his 17; correct, but it made him stop and work it out (problem 3).
- **Tool prints:** step 3, `--click "Find nodes, edges, values"`, found nothing: the box's
  accessible name is "Find" and the longer text is its placeholder. He recovered by clicking the
  box by position, which a person would simply do; no app state changed. Not a tool fault; the
  session is not void. session.log is empty.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                                | Evidence                                                                                |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | 1        | accessibility | The search box's accessible name is "Find" while the text a sighted user sees is "Find nodes, edges, values"; a voice-control user speaking the visible words does not reach it (WCAG 2.5.3, if the placeholder is taken as its visible label). Also seen in r2-s03, so confirmed at two participants. | Step 3, `03.png` (no control found by the visible text); step 4 reports combobox "Find" |
| 2   | 1        | behavior      | No names are drawn on the dots by default, so Javert cannot be found by looking; the participant had to use search. Did not cost him the task.                                                                                                                                                         | Step 2, `02.png`                                                                        |
| 3   | 1        | wording       | Selection says 18 while the heading says "Javert's 17 connections"; nothing says the 18 includes Javert himself, and he briefly wondered which number was right.                                                                                                                                       | Step 6, `06.png`                                                                        |
| 4   | 1        | wording       | "Degree" on the Summary has no explanation that it means "how many characters he is tied to"; he guessed from a tutorial, and only the small chevron told him the names were behind it.                                                                                                                | Step 5, `05.png`                                                                        |
| 5   | 0        | opinion       | The node Summary (id, name, Degree) felt thin for "what the program knows about him"; he was unsure whether more lived elsewhere (the Data view) and did not check.                                                                                                                                    | Step 5, `05.png`; debrief                                                               |

None of these is a build defect under the criteria (no crash, no dead control, no wrong count; the
18 is a correct count of the selection), so no scripted reproduction was needed. Problems 2 to 5
rest on this one participant and stay unconfirmed until another session shows them.
