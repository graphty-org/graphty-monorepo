# Grade: session r1-s27 -- Alex, back for the weekly rerun, puts the updated running club list in place of the old one and reranks (friends.csv to friends-v2.csv)

**Grade: S** (success). Alex read the top person from the open PageRank run before changing
anything (Farah 0.06394), replaced friends.csv with friends-v2.csv through the Data page's
right-click "Replace with file...", loaded it, pressed Rerun in the "Data changed since this run"
bar, and gave both names right: Farah first before, Ava first now (0.08012), still 20 people and
41 ties. The last screen shows exactly the answer key's end state. He took the answer key's
success path step for step, with one extra step (the save) and no detour.

Build seen: `946256efb876 graphty@0.8.56` (session.json "buildStamp"), at 1440 x 900, no
uncommitted changes. This is the frozen build named in the criteria. The setup ran to its end
(`setup.log`: the file chooser was answered with friends.csv), the session log is empty, and every
screenshot matches its command. The session is not void.

## What the last screen shows (`09.png`)

- The graph panel reads "Graph friends-v2.csv", with Selection, PageRank 20 and Everything in the
  tree; the PageRank row carries the bar-chart icon, not the out-of-date mark.
- The run's inspector: "PageRank, Measure, ran Oct 8, 11:35:20 PM"; Values "20 of 20 have a value,
  0.02872 to 0.08012"; Top 10 starting Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141 --
  the answer key's new top four exactly.
- Made with: Analysis PageRank, Ran Oct 8, 11:35:20 PM, Weight "weight (read as closer)" with
  "Its meaning was not set, so this run assumed a higher weight means closer."
- The drawing's key reads 0.02872 to 0.08012 for both Size and Color: the layers were kept and now
  read the new run.
- A toast, "Saved friends in this browser."
- "First before" was read before any change: Top 10 "Farah 0.06394", run time 11:34:19 PM
  (`02.png`). The replace page said "Was 20 nodes, 41 edges; now 20, 41" (`05.png`).

## Measures

- **Steps:** 8 after the start (`02.png` to `09.png`); the answer reached at step 6 (`07.png`).
  The key's success path is 6 steps (Values, Data, right-click, Replace with file, Load, Rerun);
  the two extra steps are Control+S and Save.
- **Wrong turns: 0.** Every step is on the key's success path. He went to the Data rail first
  ("that is where I would expect to swap the file") and tried a right-click on the source row at
  once, by habit from Gephi.
- **False "done": none.** At step 5 (`06.png`), after Load, he did not report a name: he read the
  "Data changed since this run" bar and pressed Rerun. His final claims all hold on screen: Farah
  first before at 0.06394 (`02.png`), Ava first now at 0.08012 and Farah second at 0.06556
  (`07.png`, `09.png`), "counts match" (`05.png`), "colors and sizes stayed on" (`07.png`, the key's
  layers read the new range). His wrap-up says "four clicks" and then lists five; a miscount, not a
  claim about the graph. truth-on-screen: no wrong claim.
- **Traps avoided:** no `stale-read` (he named the bar and reran before reading); he did not pick
  "Edit source...", listed first in the right-click menu (`04.png`); he did not open friends-v2.csv
  as a new project; he left "Higher means" on "Not set", which this task does not need; he did not
  click the "Reset Damping factor to default" button, which after Load sat under the pointer in
  its hover state (`06.png`, about 1411,870).
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session, r1-s25 and r1-s26, same task) -- the only way to put a
   newer file in place of the old one is behind a right-click (or a "..." that appears only on
   hover) on the source's row in Data.** At rest the row shows no button or other sign that it
   has a menu (`03.png`). Alex found it only because Gephi taught him to right-click; he says
   "Someone who does not right-click would be stuck there." Stuck there, the visible alternative is
   "Open project or file...", which starts a new map and loses the run and its styling. Evidence:
   `03.png`, `04.png`; wrap-up.
2. **Severity 3 (confirmed: this session and r1-s25) -- between Load and Rerun, last month's
   ranking stays on screen at full contrast as if it were current.** The Top 10 (Farah 0.06394
   first), the histogram, "20 of 20 have a value, 0.03779 to 0.06394" and the drawing's key all
   keep the old run, with nothing on them marking them out of date; the only marks are the "Data
   changed since this run" bar and the row's wordless history icon (`06.png`). Alex read the bar
   and reran, but said "if I had glanced at the list without reading the bar I could have reported
   the old ranking as the new one", which is the answer key's `stale-read` trap. Evidence:
   `06.png`; wrap-up.
3. **Severity 2 -- nothing keeps or shows the run before the replacement beside the run after it.**
   The task's question (who moved) needs both lists; Alex got the "before" only because he wrote
   Farah down first. Once Rerun runs, the old Top 10 is gone from the screen. A reader who reruns
   first has no way left to answer "who was first before". Evidence: `02.png` against `07.png`;
   wrap-up ("if I had not, last month's top name would have been gone").
4. **Severity 1 -- "Higher means: Not set" on the replace page needed a sentence of reading before
   Alex knew leaving it alone was safe.** Nothing on the task path needed it, and the sentence
   below ("Until you do ... PageRank and communities read a higher weight as closer") gave him the
   answer. Evidence: `05.png`; wrap-up.

What worked: the replace page's "Was 20 nodes, 41 edges; now 20, 41" was the check he wanted
before loading (`05.png`); the run's inspector stayed open on Values through the replacement, so
the "Data changed since this run" bar and its Rerun button were in front of him (`06.png`); one
press of Rerun redid the ranking, cleared the out-of-date mark, changed the run's time (11:34:19 PM
to 11:35:20 PM) and kept the size and color layers ("That is the bit I hate redoing every week",
`07.png`).

## Did the build get in the way?

No. Every control did what the answer key says it does on this build: the right-click menu, the
replace page, Load, the out-of-date bar, Rerun and Save. No step failed, no command errored, and
every screen matches the pilot screens the key cites (`rounds/r1d4/pilot/T21A/`). The participant
spent no time on broken controls; what he raised -- where replacing lives, the stale list between
Load and Rerun, no before-and-after view -- are questions of what a weekly rerun needs, which is
what the task asks about.
