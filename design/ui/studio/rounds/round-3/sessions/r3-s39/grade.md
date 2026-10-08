# Grade: session r3-s39 (T6 "What did I get?", Morgan, screen-reader mode)

Build: commit f108a2350, graphty@0.8.53. Dataset: Les Miserables sample. Keyboard only, no
screenshots seen by the participant.

## Grade: SD (success with difficulty)

All four answers are right and each was heard from the app before it was stated:

| Question                       | Stated                                                             | Heard at                                                                                                     | Right? |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------ |
| Characters                     | 77                                                                 | step 9 (load announcement), step 10 (Overview "Nodes 77")                                                    | yes    |
| Connections                    | 254                                                                | step 9, step 10 ("Edges 254"), step 26 ("254 of 254 rows")                                                   | yes    |
| Can every character be reached | yes, one component                                                 | step 10 ("Components 1")                                                                                     | yes    |
| Recorded facts                 | characters: `id`, `name`; connections: From, To, `shared_chapters` | step 23 ("Columns: 2 of 2", header "Id name"), step 27 ("Columns: 3 of 3", header "From To shared_chapters") | yes    |

The last screenshot (28.png) agrees: Overview shows Nodes 77, Edges 254, Components 1; the table
is open on Edges with columns From, To, shared_chapters and "Columns: 3 of 3".

Difficulty, not plain success: three dead ends before the table was found, and the table was
reached only through the "?" shortcut list. Self-reported ease 4 of 7 (not used for the grade).

## False "done"

None. "I have my four answers. Done." (step 27) matches the screen.

## Steps and wrong turns

- Success path (keyboard, round 3 build): 28 keys.
- Session: 52 key presses plus 5 page reads (`--read`), 1.9x the path. No usage card was
  answered (the participant left it open; it did not block).
- Wrong turns: 3
    1. Steps 11-13: Tab past the rail, then Right Arrow on "Graph" to reach "Data" -- nothing moved;
       abandoned. (Down Arrow works; see problem 1.)
    2. Steps 14-15: Tab through the inspector looking for attribute names -- only counts there;
       abandoned.
    3. Steps 16-18: Right Arrow and Enter on "Graph drawing" -- silent; abandoned.
- Recovery: yes, via "?" (step 19-20, found "Table Shift+T") and Shift+T (step 22).

## Problems

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Sev | Kind          | Evidence                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The "Places" rail ("Graph", "Data") is a vertical toolbar moved with Up/Down Arrow, but Morgan heard two plain buttons with no state and no group, tried Right Arrow, and concluded "Data" cannot be reached. The app's markup is right (`role="toolbar"`, `aria-orientation="vertical"`, `aria-current="page"` in `workspace/frame/Rail.tsx` and compact-mantine `NavRail.tsx`); the tool's screen-reader mode does not print the container on entry or the `current` state (`SR_STATES` in `tool/real.mjs` has no `current`), so a real screen reader would have said "Places toolbar, vertical, Graph, current page". Tool gap, not void: the participant still finished. Fix the tool before the next screen-reader round. | 2   | behavior      | steps 11-13 (session 12.png-14.png); repro steps 04-07 print `button "Graph"` with no state, Right Arrow stays, Down Arrow reaches `button "Data"` |
| 2   | Opening a sample with Enter leaves focus on the page body; the pressed button is gone and the next Tab starts from "Main menu" again.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 3   | build-defect  | step 9 (10.png); repro step 03: `focus: nothing (the page itself)` after the load announcement                                                     |
| 3   | Escape from the keyboard-shortcuts dialog opened from the drawing leaves focus on the page body (when opened from a button it returns to that button).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 3   | build-defect  | step 21 (22.png); repro steps 11-13: on `Canvas "Graph drawing"`, "?", Escape -> `focus: nothing (the page itself)`                                |
| 4   | Shift+T opens the table without moving focus into it, and its row count is in a status region that already held the text, so many screen readers say nothing. With focus on the body, the shortcut can sound like it did nothing; reaching the table took 13 Tabs from the top.                                                                                                                                                                                                                                                                                                                                                                                                                                                | 2   | accessibility | steps 22-25 (23.png-26.png); repro step 10: focus stays on `button "Data"`, live "77 of 77 rows" marked unconfirmed                                |
| 5   | "Graph drawing" is in the Tab order but answers neither arrow keys nor Enter, and gives no hint of what it does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 2   | accessibility | steps 16-18 (17.png-19.png)                                                                                                                        |
| 6   | No headings once a graph is open (the start page has them), so heading navigation cannot find the Overview or the table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 2   | accessibility | step 10 and step 15 reads                                                                                                                          |
| 7   | "Undirected, from the file: directed 0" was hard to parse, and the edge table then labels the ends "From" and "To", which reads as directed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 1   | wording       | step 10, step 27 (28.png)                                                                                                                          |
| 8   | A browse-mode read of the 77-row node table returned 14 rows (virtualized list); did not affect this task.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 1   | opinion       | step 23                                                                                                                                            |
| 9   | `shared_chapters` is shown as the file's raw column name with no explanation. Held one level down as opinion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 0   | opinion       | step 27                                                                                                                                            |

## Repro

`rounds/round-3/repro/r3-s39/repro.sh` (output in `run.log` and `run/`). Same result on each run:
load -> body focus (problem 2); rail prints no state, Right Arrow does nothing, Down Arrow reaches
"Data" (problem 1); "?" then Escape from the drawing -> body focus (problem 3); Shift+T keeps focus
outside the table (problem 4).

## What worked

- The load announcement, once: "Les Miserables: 77 nodes, 254 edges".
- The Overview gives nodes, edges, direction, density, components and degree range as text, with
  no run needed -- three of four answers in one read.
- The "?" dialog: headings per group and a named shortcut for the table.
- Table tabs move with arrow keys; "Columns: n of n" tells the reader every column is shown.
- Start page: real headings, named buttons, and the note that files stay on this computer.
