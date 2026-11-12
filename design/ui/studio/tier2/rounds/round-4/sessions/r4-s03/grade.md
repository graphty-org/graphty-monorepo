# Grade: session r4-s03 -- Nadia (tier 1 graduate, returning), running club (T24 A), one tie on the drawing

**Grade: S** (success). The number is right and read from the screen, and at the end exactly Gus
and Ivan are selected. `03.png` shows the edge inspector "Gus -> Ivan" (subtitle "Edge") with From
Gus, To Ivan, weight 1 under "Summary", the Selection row 1 and the line drawn with a blue band;
Nadia answered "once (the tie's weight is 1)", the key's 1. The last screenshot, `05.png`, shows
"2 nodes selected" (subtitle "Selection"), Summary Nodes 2, "Edges joining these nodes 1", the
left panel's Selection row 2, and yellow halos on Gus and Ivan only. That is the key's end state
for Select endpoints, reached instead by a click on Gus and a Shift-click on Ivan, which the key
lists as a route on this build with the same end state (`rounds/round-4/pilot/T24A/06.png`,
`07.png`). Nadia went straight to that route; she never looked for the ends command and failed to
find it, so the SD rule for "selected one at a time after the ends command was not found" does not
apply. No detour.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `friends-ranked-names.txt` (PageRank run,
nodes sized and colored by it, every name drawn, `01.png`), as the task specifies. `session.log`
is empty and `setup.log` holds only the file chooser lines: no script, console or request errors.
No leaks (`leaks.json`: 15 calls, 0 leaks). The graph was not changed (`work.json`: start and end
identical, nothing gone). Not void.

## The answer against the key

- **The number (right).** `03.png`: "weight 1" in the Gus -> Ivan inspector. Read from the
  screen, not guessed from the line's look; the right tie (From Gus, To Ivan), not Gus to Hana.
- **The two ends selected, and nobody else (right).** `05.png`: "2 nodes selected", Nodes 2,
  Selection row 2, halos on Gus and Ivan only. Hana, whose label overlaps Ivan's sphere, was not
  hit: the tool reported the Shift-click landing on node "Ivan" at 821,547.
- **Traps the key names:** she did not read the tie as Gus to Hana, did not click a name after
  selecting (which would drop the selection to one), and did not use Ctrl in place of Shift.

## Measures

- **Clicked the line itself:** yes, on the first try (`--click-at 760,582`, the tool printing
  edge id "13"), after one hover at the same point.
- **Route:** hover the line (`02.png`, no change), click the line (`03.png`), click Gus
  (`04.png`), Shift-click Ivan (`05.png`). The "Edge actions" menu and "Select endpoints" were
  never opened. How she got from "the two on this tie" to a selection: from a desktop habit
  ("like picking two files in Windows"), not from the app's words.
- **Steps:** 4 after the start. The key's path is 4 (line click, Edge actions, Select endpoints,
  plus reading); Nadia's is the same length, with the hover in place of opening the menu.
- **Wrong turns: 0.** The hover was a look, not a wrong action; it changed nothing and she moved
  on at once.
- **False "done": none.** Each final claim holds on screen: weight 1 (`03.png`), "2 nodes
  selected" with only Gus and Ivan ringed (`05.png`). truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

1. **The tie gives no sign on hover. Severity 1.** Evidence: `02.png` is the same as `01.png`;
   the tool reports a pointer hand over edge "13" but no tooltip and no change to the line. Nadia:
   "Hovering the line gave a hand pointer but no popup with the number; I had to click it." The
   hand was enough of a cue and the click worked first time, so it cost one step, no more.
2. **"Edges joining these nodes 1" under "2 nodes selected" reads as if the tie might be selected
   too. Severity 1.** Evidence: `05.png` Summary rows "Nodes 2" and "Edges joining these nodes
   1"; Nadia: "made me wonder for a second whether the line was picked as well. I decided it was
   only a count." She reached the right reading; a less careful reader could think a next action
   would also apply to the tie.
3. **Ivan's sphere sits almost under Hana's label and sphere, so picking him is a small, risky
   target. Severity 1.** Evidence: `01.png` and `05.png`, the "Hana" label box drawn over the
   lower half of Ivan's sphere and the Gus-Ivan line ending at that label's edge (a known note on
   this build). Nadia: "I was worried shift-click would grab Hana. It did not." No wrong pick
   here.
4. **The tie's number is labeled only with the file's column name. Severity 0.** Evidence:
   `03.png` "weight 1"; Nadia knew from her own list that weight means runs, "but QA would ask me
   how I know". The word is the data's own column name, which the app shows as it is; noted, not
   a defect in the app.

Not studied, as every tier 2 report says: keyboard-only and screen-reader access are untested by
sessions. The participant is simulated; this pass is weak evidence until real people confirm it.
