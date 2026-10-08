# Grade: session r2-s19 -- Tom (recipe recipient), T12 prompt A (Les Miserables, Javert)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (07.png),
the transcript and a scripted re-run of the session's own path on the same build. No files were
saved (none are needed for this task). Never from Tom's own rating (5 of 7).

## Grade: SD (success with difficulty)

Success A holds on the last screen:

- **Javert selected** through the find box (05.png: "Javert, Node", Selection 1).
- **One fact read:** "Degree 17" in his Summary values (05.png); Tom ties it to the list at the end.
- **Neighbors listed on screen by name:** 07.png shows "Javert's 17 connections" with all 17 names,
  spelled exactly as in the answer key (Babet ... Woman1, Woman2).
- **Named and counted:** Tom names all 17 from that list and says 17.

- **Route:** the Degree row (round 2's "Degree 17 >"), reached on the second click.
- **Why SD, not S:** the first click, on the chevron the round 2 build added to that row as the cue,
  did nothing (step 6, 06.png). Tom found the list only by trying again on the word "Degree", and
  said that if the second try had failed he would have stopped. That is a detour on the success
  path, so not S.
- **Failure codes:** none.
- **Build-affected:** yes, it cost a step and nearly the task, but did not decide the outcome.
  **Build-decided:** no.
- **Void:** no. At step 3 the tool refused `--click "Find nodes, edges, values"` (that text is the
  box's placeholder, not a name) and typed nothing; nothing reached the app, and step 4 clicked the
  box by position, as a person would.

## Counts

|                                   | This session | Success path |
| --------------------------------- | ------------ | ------------ |
| Steps (real.mjs, after the start) | 6 (02-07)    | 6            |
| Wrong turns                       | 1            | 0            |

The wrong turn is step 6, the click on the chevron. Step 3 is not counted: it was a tool command
that did nothing, not a choice in the app. Picking Javert from the find results with a click
instead of Down arrow and Enter is the same step.

## False "done"

None. "It knows his name and a Degree of 17, nothing else" matches 05.png (id, name, Degree). "17,
listed above" matches 07.png. The edges of this sample are shared chapters, so "shares chapters
with 17" is a correct reading, though the screen itself never says so (problem 4).

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. The build defect is reproduced by
`rounds/round-2/repro/r2-s19/repro.sh` (the session's own clicks, run twice, `run1/` and `run2/`,
logs `run1.log`, `run2.log`). Both runs: the click at the chevron (1410,236) lands on
group "Summary values" and `run*/05.png` matches 06.png (row shaded, no list); a click at the
middle of the same row (1330,236) lands on button "Degree 17" and `run*/06.png` shows "Javert's
17 connections", the same as 07.png.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                          |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | The chevron drawn at the right end of the "Degree 17 >" row is outside the row's button. A click on it lands on the surrounding "Summary values" group, which only shades the row and opens nothing. The chevron is the one cue that says "this goes further", so the control a reader is most likely to click is the one that does nothing. Tom: "I clicked it. Nothing moved. Did it do anything?" and would have given up after one more miss. | Step 6, 06.png (tool: "landed on group Summary values"). Repro: `run1/05.png`, `run2/05.png` (chevron), `run1/06.png`, `run2/06.png` (row middle opens the list). |
| 2   | 2   | wording      | "Degree" does not tell a non-specialist that it is how many characters he is tied to. Tom had the answer on screen at step 5 and did not recognize it ("a degree in what?"); he learned the meaning only from the list heading afterwards.                                                                                                                                                                                                        | Step 5, 05.png; end of transcript. One participant; unconfirmed until a second.                                                                                   |
| 3   | 2   | behavior     | After the list opens, "Selection 18" (left) sits beside "Javert's 17 connections" (right) with nothing saying the 18 is the 17 plus Javert. Tom guessed right but said two numbers on one screen is what makes him look foolish in a meeting; a reader who reports the selection count reports 18.                                                                                                                                                | Step 7, 07.png. One participant; unconfirmed.                                                                                                                     |
| 4   | 1   | wording      | The list says "connections"; nothing on the Graph screen says that a connection in this sample means two characters share a chapter. Tom took it on trust from the start page's sample description.                                                                                                                                                                                                                                               | Step 7, 07.png; 01.png for the sample description.                                                                                                                |
| 5   | 1   | opinion      | The overview after opening ("Density", "Components", "Undirected, from the file: directed 0") means nothing to this reader and was skipped.                                                                                                                                                                                                                                                                                                       | Step 2, 02.png.                                                                                                                                                   |
| 6   | 1   | opinion      | No names are drawn on the dots by default, so the picture told Tom nothing about who Javert is tied to; the list did all the work.                                                                                                                                                                                                                                                                                                                | Steps 2-7, 02.png, 07.png.                                                                                                                                        |
| 7   | 0   | opinion      | "Woman1" and "Woman2" read as file names, not people. They are the data's own names, not the app's words.                                                                                                                                                                                                                                                                                                                                         | Step 7, 07.png.                                                                                                                                                   |

What worked, for the record: the find box was the first place Tom looked and found Javert at once
(04.png); the selected dot turned yellow; the neighbor list is alphabetical, complete and headed
with the count, and the 17 neighbors are lit in the drawing; "Local only" with the lock reassured
him.
