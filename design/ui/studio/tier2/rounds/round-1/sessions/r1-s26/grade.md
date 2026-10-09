# Grade: session r1-s26 -- Dev, back for the class project, swaps in the team's updated list and reranks (team.csv to team-v2.csv)

**Grade: S** (success). The old list was replaced, not added to: the Replace page read "Was 12
nodes, 16 edges; now 14, 21" and the Graph overview after Load reads Nodes 14, Edges 21. The
ranking was rerun on the new list: the PageRank row reads 14, the Values read "14 of 14 have a
value", and the run's time changed from 11:33:20 PM to 11:34:47 PM. All three answers match the
answer key: 14 people now, Hal first before (0.1293), Di first now (0.1339), then Hal 0.1305 and Ed
0.1245. The first name was read before the replacement, and the new one only after Rerun, so there
was no stale read. No detour, no extra project, no undone addition.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step ran and every screenshot matches its
command. The session is not void.

## What the last screen shows (`12.png`)

- Left panel: "Graph team-v2.csv"; the PageRank row reads 14 with the bar icon (no out-of-date
  mark).
- Inspector, PageRank run, "ran Oct 8, 11:34:47 PM", Values tab: histogram 0.02333 to 0.1339, "14
  of 14 have a value, 0.02333 to 0.1339, median 0.04819".
- Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141, Gil, Flo, Kit, Abe, Cy.
- Key: Size and Color PageRank, 0.02333 to 0.1339. Every node is drawn in the PageRank orange
  scale; no blue nodes are left. The sizing and coloring from before survived the replacement.
- Made with: PageRank, Ran Oct 8, 11:34:47 PM, Weight "weight (read as closer)", with "Its meaning
  was not set, so this run assumed a higher weight means closer."
- A toast, "Saved team in this browser." (the save after the task; not graded).

The "before" reading is on `02.png`: Top 10 starts "Hal 0.1293", "12 of 12 have a value", key
0.03273 to 0.1293, run at 11:33:20 PM.

## Measures

- **Steps:** 11 after the start (`02.png` to `12.png`); the graded end state is reached at step 9
  (`10.png`). Steps 10 and 11 saved the project, which the task did not ask for. The answer key's
  success path is 6 steps.
- **Wrong turns: 2.**
  1. Step 2 (`03.png`): opened the main menu looking for a way to bring in the newer file. It holds
     New project, Open project or file..., Open sample, Save, Save as..., Export...; nothing about
     a newer version of a file. He chose not to use "Open project or file..." for fear of losing
     the styled work, and closed the menu.
  2. Step 4 (`05.png`): left-clicked the team.csv source row in Data. It shows the source's
     details ("Added: Nodes 12, Edges 16") and no actions. He recovered on the next step by
     right-clicking, which opened "Edit source..." and "Replace with file..." (`06.png`).
  Step 1 (reading Values first) and step 3 (going to Data) are on the success path.
- **False "done": none.** Every claim in the debrief is on screen: 14 people (`07.png`,
  `08.png`, `10.png`), Hal first at 0.1293 before (`02.png`), Di 0.1339 and Hal 0.1305 now
  (`10.png`), "weight (read as closer)" on both runs (`02.png`, `10.png`). He did not claim the
  new ranking from the stale screen after Load (`08.png`, key still 0.03273 to 0.1293, row still
  12); he opened the run, saw "Data changed since this run" and reran (`09.png`). truth-on-screen:
  no wrong claim.
- **Traps the key names, and what happened:**
  - Stale read after Load: avoided.
  - "Edit source..." (first in the right-click menu, above "Replace with file..."): not chosen.
  - New project with team-v2.csv: avoided, deliberately, to keep the styling.
  - Blue new nodes between Load and Rerun: he read them correctly as "the two new people ... who
    don't have a ranking yet", though "it looked like a mistake at first". Not read as a
    selection or a highlight.
  - Moved drawing read as lost work: no; he said "My colors and sizes are still there".
  - "Reset Damping factor to default" under the pointer after Load: not clicked (after Load the
    inspector showed the Graph overview, `08.png`, because his last inspector view was the source
    details).
  - "Weight: weight auto" on the Replace page: not remarked on. He stopped on "Higher means",
    below it.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). One participant so far on this task; none is confirmed yet.

1. **Severity 3 -- the only way to replace a file with its newer version is hidden: a right-click
   menu on the source row in Data (or a "..." button that appears only on hover).** Nothing at
   rest says the row has actions. The main menu has no entry for it, and a left-click on the row
   shows only the source's counts. He found it by guessing at a right-click: "I'd never have found
   it without right-clicking though -- there was no button for it", and "If I hadn't tried
   right-clicking, I'd have asked a classmate." This is the core step of the task. Evidence:
   `03.png` (menu), `04.png` (source row at rest, no button), `05.png` (left-click: details
   only), `06.png` (right-click menu), debrief.
2. **Severity 2 -- after Load, the old ranking stays on screen with only a small icon saying it is
   out of date.** The PageRank row still reads 12 and its bar icon becomes a history icon with no
   words; the key keeps the old range 0.03273 to 0.1293; the run's Top 10 is the old one. The
   "Data changed since this run / Rerun" bar appears only after opening the run. He caught it, but
   said "only a small clock icon on the row hinted it was out of date ... I only saw it after
   clicking PageRank". A reader who looked at the drawing or the row would report Hal. Evidence:
   `08.png`, `09.png`, debrief.
3. **Severity 2 -- the two new people are drawn as small saturated-blue dots the key does not
   explain.** Between Load and Rerun they are the only nodes outside the orange scale, and the key
   shows no entry for "no value". He worked out the meaning, but "looked like a mistake at first".
   Evidence: `08.png`, `09.png`, debrief.
4. **Severity 1 -- "Higher means: Not set / Closer / Farther / Capacity" on the Replace page made
   him unsure whether he had to choose.** The sentence under it ("Until you do, ... PageRank and
   communities read a higher weight as closer") answered it, and he left it alone to match the old
   run, but "I wasn't sure that was 'right'". Evidence: `07.png`, debrief.
5. **Severity 1 -- Control+S on this project opens "Save team as" with a Name field.** The project
   had never been saved (the setup did not save it), so asking for a name is correct, but the
   title bar's "team" read to him as a saved name: "it asks me for a name every time? I thought
   this was already saved as 'team'". Nothing on the title bar besides "Local only" tells a saved
   project from an unsaved one. Outside the task. Evidence: `11.png`, debrief.

## Note on the run

At step 7 the participant named the two new people, "Mo and Nia". Those names are not on any
screen of this session: the Replace page's preview shows lines 2 to 13 (`07.png`), and Mo and Nia
appear only on lines 18 to 22 of team-v2.csv. A real user could have opened the CSV, so this is
not a tool fault and the session is not void, and the names do not enter any graded answer. It is
recorded because a simulated participant should know only what the screen and its history show.
