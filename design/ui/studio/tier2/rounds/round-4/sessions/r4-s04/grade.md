# Grade: session r4-s04 -- Grace (tier 1 graduate, returning), bus stops (T24 B), one tie on the drawing

**Grade: SD** (success after a detour). The number is right and read from the screen, and at the
end exactly Station and Stadium are selected. `05.png` shows the edge inspector "Station ->
Stadium" (subtitle "Edge") with From Station, To Stadium, minutes 4 under "Summary", the left
panel's Selection row 1 and the line drawn with a blue band; Grace answered "4 minutes", the key's
4. The last screenshot, `07.png`, shows "2 nodes selected" (subtitle "Selection"), Summary Nodes 2,
"Edges joining these nodes 1", the left panel's Selection row 2, and yellow halos on Station and
Stadium only. That is the key's end state for Select endpoints, reached instead by a click on
Station and a Shift-click on Stadium, a route the key lists on this build with the same end state
(`rounds/round-4/pilot/T24B/06.png`, `07.png`). It is SD, not S, because the line was reached
only after a detour: the first click meant for the line picked Stadium (`02.png`), and she then
opened Stadium's neighborhood list (`03.png`), which selected four stops, before she found the
line with a hover and a second, higher click.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `bus-stops-ranked-names.txt` (PageRank run,
stops sized and colored by it, every name drawn, `01.png`), as the task specifies. `session.log`
is empty and `setup.log` holds only the file chooser lines: no script, console or request errors.
No leaks (`leaks.json`: 26 calls, 0 leaks). The graph was not changed (`work.json`: start and end
identical, nothing gone). Not void.

## The answer against the key

- **The number (right).** `05.png`: "minutes 4" in the Station -> Stadium inspector. Read from
  the screen, from the right tie (From Station, To Stadium), not guessed from the line's look.
- **The two ends selected, and no other stop (right).** `07.png`: "2 nodes selected", Nodes 2,
  Selection row 2, halos on Station and Stadium only. The tool reported the Shift-click landing on
  node "Stadium" at 726,221, the sphere, not its name.
- **Traps the key names:** the first line click at 754,168 is the known near miss on the top edge
  of the white "Stadium" label, which picks Stadium (`02.png`); she recognized it at once ("Missed
  the line and got Stadium instead"). She did not click a name after selecting the two, did not
  use Ctrl in place of Shift, and did not end with a miss on empty canvas.

## Measures

- **Clicked the line itself:** yes, on the second try (`--click-at 762,150`, `05.png`), after a
  first click that picked Stadium and a hover at 762,150 that showed the hand pointer (`04.png`).
- **Route:** click near the line, landing on Stadium (`02.png`); the arrow on Stadium's Degree row,
  opening "Stadium and 3 connections" and selecting four stops (`03.png`); hover the line
  (`04.png`); click the line (`05.png`); click Station (`06.png`); Shift-click Stadium (`07.png`).
  The "Edge actions" menu and "Select endpoints" were never opened. How she got from "the two on
  this link" to a selection: a desktop habit ("that's how you add to a pick in most programs"),
  not the app's words.
- **Steps:** 6 after the start. The key's path is 3 actions (line click, Edge actions, Select
  endpoints); the Shift-click route from a first-try line click is 3 as well.
- **Wrong turns: 2.** (1) The click at 754,168 meant for the line picked Stadium. (2) Opening
  Stadium's neighborhood list to look for the minutes, which shows names only and changed the
  selection from 1 to 4. The hover was a look, not a wrong action.
- **False "done": none.** Each final claim holds on screen: minutes 4 (`05.png`), "2 nodes
  selected" with only Station and Stadium ringed and "Edges joining these nodes 1" (`07.png`).
  truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.

## Problems

1. **The Stadium name box covers most of the short Station-Stadium line, so a click aimed at the
   line picks Stadium. Severity 2.** Evidence: `01.png`, the white "Stadium" label drawn over the
   lower part of the line; the click at 754,168 reported "node Stadium" (`02.png`); the key names
   752,170 as the same near miss. Grace: "Stadium's name tag sits right on top of the short line,
   so there's very little line left to hit. I only found the line by aiming above the tag." It
   cost two wrong turns here; on a denser drawing a short tie may be nearly unclickable.
2. **Opening a node's connections list changes the selection without saying so. Severity 2.**
   Evidence: `02.png` Selection row 1, `03.png` Selection row 4 with halos on Stadium, Harbor,
   School and Station, after only the arrow on the Degree row. Grace: "I expected reading a list
   not to change what's picked." Had she gone on to act on "the selection" from there, the action
   would have applied to four stops, not two.
3. **The connections list gives only names, not the values on each tie. Severity 1.** Evidence:
   `03.png`, "Stadium and 3 connections" lists Harbor, School, Station with no minutes. A reader
   looking for a tie's number from a node gets no route to it there; Grace had to go back to the
   drawing.
4. **The tie gives no sign on hover beyond the hand pointer. Severity 1.** Evidence: `04.png` is
   the same drawing as `02.png` apart from the cursor; no tooltip, no change to the line. Grace:
   "Hovering the line showed a hand pointer but no pop-up." The hand was enough of a cue and the
   next click worked.

Not studied, as every tier 2 report says: keyboard-only and screen-reader access are untested by
sessions. The participant is simulated; this pass is weak evidence until real people confirm it.
