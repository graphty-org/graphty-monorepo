# Grade: session r1-s32 -- Nadia, back again, puts the team's updated list in place of the old one (team.csv to team-v2.csv)

**Grade: S** (success). All three answers are right and were on screen when she gave them, and
the old list was replaced, not added to. The team has 14 people now ("Nodes 14", `08.png`; the
PageRank row reads 14 and "14 of 14 have a value", `10.png`). First before: Hal, 0.1293, read
from the Values' Top 10 before anything changed (`02.png`). First now: Di, 0.1339, then Hal
0.1305 and Ed 0.1245 (`10.png`). All match the answer key. Her work was kept: the PageRank run,
its color and its size layers are all still on the last screen, now on the new numbers.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build the criteria name. Setup `team-ranked.txt` reached its end state (the
team ranked, colored and sized by PageRank, `01.png`). Every click, key and upload did what was
asked; nothing in the run points to a tool fault. Not void.

## What the last screen shows (`10.png`)

- Left panel: "Graph team-v2.csv"; the PageRank row with its bar-chart icon and 14.
- Inspector: PageRank, "ran Oct 8, 11:39:16 PM" (the setup's run was 11:37:49 PM, `02.png`), so
  the run was redone. Values: "14 of 14 have a value, 0.02333 to 0.1339, median 0.04819". Top 10
  starts Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141.
- The drawing's key reads 0.02333 to 0.1339 for both size and color, the key's reference range
  after Rerun. The two new people are orange like everyone else.
- Made with: "weight (read as closer)", "Its meaning was not set, so this run assumed a higher
  weight means closer." Damping factor 0.85, unchanged.
- Edges table: 21 edges.

## Measures

- **Steps:** 9 after the start (`02.png` to `10.png`). The key's path has 6 (Values, Data,
  right-click the source row, Replace with file..., Load, Rerun), plus a click on the PageRank row
  that the key allows when the run's inspector was not open at Load. So 7 on her route; 2 over.
- **Wrong turns: 2.** Both recovered in one step, with no help.
    1. A click on the file name "team.csv" beside "Graph" at the top of the left panel (`03.png`),
       expecting a way to swap the file. It is plain text; the screen did not change (`03.png` is
       byte-for-byte the same as `02.png`).
    2. A left click on the "team.csv" row under Sources (`05.png`). It showed the source's facts
       ("Added: Nodes 12, Edges 16") and its rows, with no action. She then right-clicked the same
       row, which opened the menu with "Replace with file..." (`06.png`). This is the same dead end
       that made another participant give up on the other half of this task.
- **First move:** the inspector's Values tab, to read "first before" -- on the success path.
- **Broken habit:** none. Her history names the find box, the list of connections, the analysis
  button and the start screen, not the Data place, and none of her moves went to those.
- **Traps the key names:** none taken. She did not read the top person off the stale drawing
  after Load (`08.png` still keys 0.03273 to 0.1293), did not press "Edit source...", did not load
  the file as an addition, and did not click the "Reset Damping factor to default" button. She
  read the two blue dots after Load as "the two new people, they have no ranking color", which is
  what they are, not a highlight or a selection.
- **False "done": none.** Her "Done" at step 9 came with the rerun on screen. Her claim that "the
  coloring and sizing stayed on, so the work I had is still there" is true (`10.png`).
  truth-on-screen: no wrong claim.
- **Earlier work kept:** yes. The run, its two style layers and the one source are all present at
  the end; the source now holds team-v2.csv, which is what the task asked.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). Each was seen in this session only unless noted.

1. **Severity 3 -- "Replace with file..." is reachable only by right-clicking the source row (or
   its hover-only "..."); the source's own panel offers no action.** Nadia found it only because
   she tried a right-click "because that's how Windows works", and said that otherwise "I would
   not have seen 'Replace with file...' anywhere". The left click on the row (`05.png`) shows
   facts and a table, nothing to act on. The same row stopped a participant on the other half of
   this task, who left without finishing (r1-s29), so the behavior is seen in two sessions. It is
   held at 3 here because she recovered; the round decides whether the pair confirms a 4.
   Evidence: `05.png`, `06.png`, transcript steps 4 and 5, debrief.
2. **Severity 2 -- the file name beside "Graph" at the top of the left panel looks like the place
   the file lives but does nothing when clicked.** She expected it to lead to the file and lost a
   step. Evidence: `02.png` against `03.png` (identical), transcript step 2.
3. **Severity 2 -- after Load, the out-of-date run is marked only by a wordless icon on its row
   and by the drawing's two blue dots; the key, the row's count and the colors stay on the old
   values.** After Load the row still reads "12" with a history icon in place of the bar-chart
   icon, and the key still reads 0.03273 to 0.1293 (`08.png`). The words "Data changed since this
   run" appear only once the run is opened (`09.png`). She caught it from the blue dots and said
   she would want it "said without clicking". A reader who reads the top person off the drawing
   at this point gets the old answer; she did not. Evidence: `08.png`, `09.png`, transcript steps
   7 and 8, debrief.
4. **Severity 1 -- "Higher means: Not set" on the Replace page made her stop and check whether
   she had to choose something to keep the ranking as before.** The note under it answered the
   question ("PageRank and communities read a higher weight as closer"), so she went on. Opinion,
   held one level down from 2. Evidence: `07.png`, transcript step 6, debrief.

What worked: the Replace page's "Was 12 nodes, 16 edges; now 14, 21" told her in one line that
two people joined (`07.png`). The run's "Data changed since this run" with a Rerun button was
clear once she opened the run (`09.png`). Rerun kept the run, its colors and its sizes, and the
new "Ran" time shows it was redone (`10.png`).

## What this says about the round

This session met design problems, not an implementation fault. Every control did what the answer
key says it does on this build: the label did nothing because it is a label, the left click on the
source showed its facts as designed, the right-click menu, the Replace page, Load and Rerun all
behaved as piloted, and every number on screen agrees with the key. The two wrong turns are both
about where the replace action lives, which is a question of design, not of the build breaking.
