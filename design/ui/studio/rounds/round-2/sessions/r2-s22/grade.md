# Grade: session r2-s22 -- Morgan (screen reader), Javert and who he is tied to, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json, screen-reader mode). Graded from the last
screenshot (42.png), the focus and live-region lines in the transcript, and two scripted re-runs on
the same build. No files were downloaded (the task asks for none).

## Grade: SD (success with difficulty)

- **Success A met.** 42.png shows Javert selected (inspector header "Javert", "Neighborhood"),
  the list "Javert's 17 connections" with all 17 names, and the canvas highlighting him and his
  neighbors. Morgan reached the region "Javert's 17 connections" (step 37), tabbed through every
  name (steps 38-42), read "Degree 17" as his fact (step 29), and named all 17, spelled as on
  screen, and the count 17.
- **Route:** the Degree row ("Degree 17", Enter). Not G, not the context menu.
- **Why SD, not S:** three wrong turns before the success path (below), and the find box was found
  by chance rather than by a route the screen offered.
- **Whole task from the keyboard:** yes.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (see the tool note at the end).

## Counts

|                  | This session                                      | Reference          |
| ---------------- | ------------------------------------------------- | ------------------ |
| Steps (real.mjs) | 41 after the start                                | 6 (pointer path)   |
| Key presses      | about 70 (64 keys plus the 6 letters of "Javert") | 27 (keyboard path) |
| Wrong turns      | 3                                                 | --                 |

Wrong turns:

1. Steps 12-23 (12.png-23.png): a full Tab lap from the canvas to look for a find box. The lap
   started after the left panel, and Morgan stopped on "Local only", one Tab before "Graph" and
   "Find", so she concluded there was no find box.
2. Step 24 (24.png): Control+F. The app has no binding for it (its find key is "/"); nothing
   changed or was announced. The next Tabs reached Find only because focus was already just before
   the left panel.
3. Steps 30-36 (30.png-36.png): tabbed on past "Degree 17" through the whole page looking for more
   of his values, then six Shift+Tabs back to "Degree 17".

## False "done"

None. Morgan said "Done" at step 42, where the screen shows exactly the 17 names she listed under
"Javert's 17 connections". Her debrief says "Degree 17" was the only value she could reach; the
Summary also shows id and name (28.png), but both just say "Javert", so her answer is not wrong.

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by `rounds/round-2/repro/r2-s22/repro.sh`
(keys only, screen-reader mode, run twice: `run1/` with `run1.log`, `run2/` with `run2.log`); both
runs behaved the same as the session.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                                                |
| --- | --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect  | Opening a sample announces "No nodes to draw" and then "Reading Les Miserables", and never announces that the load finished or how much was read. Morgan had to guess when the graph was ready and still did not know its size. Bar 8 asks for one announcement when a load finishes. Also in r2-s07 and r2-s15. | Steps 10-11, 10.png, 11.png. Repro: `run*.log` step 02 shows the two live lines; step 03 (a 5 s wait) prints no further live line; `run*/03.png` shows the graph drawn. |
| 2   | 2   | build-defect  | After Enter on a find result, focus lands on a group named only "Summary values". It does not say whose values they are, and no live region says Javert was selected. Morgan first heard his name 9 steps later, in "Javert's 17 connections".                                                                   | Step 28, 28.png. Repro: `run*.log` step 06, "focus: group "Summary values"", no live line.                                                                              |
| 3   | 2   | build-defect  | The drawing takes focus after opening a sample and has no accessible name ("Canvas (no name)"). Also in r2-s01, r2-s07 and r2-s15.                                                                                                                                                                               | Steps 10-11, 10.png. Repro: `run*.log` steps 02-03.                                                                                                                     |
| 4   | 2   | behavior      | Nothing tells a screen-reader user that a find box exists or that "/" reaches it. Morgan missed it on a full Tab lap and tried Control+F, which does nothing in the app.                                                                                                                                         | Steps 12-25, 23.png, 24.png, 25.png. One participant; unconfirmed.                                                                                                      |
| 5   | 1   | wording       | "Degree 17" is a button with no hint that it opens his connections; Morgan pressed it only because it was the only control in the Summary. She also asked whether "degree" counts characters or chapters on a weighted graph. Related to the "Degree" wording findings in r2-s21.                                | Steps 29, 36-37, 29.png, 37.png; debrief.                                                                                                                               |
| 6   | 1   | accessibility | Typing in Find announces no count of matches; the list opens silently.                                                                                                                                                                                                                                           | Step 26, 26.png; transcript ("no count of matches was spoken").                                                                                                         |
| 7   | 0   | opinion       | The connections list gives names only, not how many chapters each pair shares. The task does not ask for weights.                                                                                                                                                                                                | Step 42, 42.png; debrief.                                                                                                                                               |

What worked, for the record: the start page's sample buttons have plain names; Enter on a find
result moved focus into the node's Summary as designed; "Degree 17" followed by Enter moved focus
to a region named "Javert's 17 connections" whose names are one Tab stop each, in alphabetical
order, and the region's count matches the list.

## Tool note (not a void)

At step 27 Morgan pressed ArrowDown in Find and heard nothing. The find box does point at the
active option (`aria-activedescendant` in `graphty/src/workspace/graph-place/FindBox.tsx`), which
a real screen reader would read as "Javert", but real.mjs's focus line does not print the active
option. The gap made Morgan press Enter "blind"; it did not change her path or the result, so the
session stands. The tool should print the active descendant of a focused combobox or listbox.
