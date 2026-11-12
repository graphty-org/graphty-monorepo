# Grade: session r2-s38 -- Jordan (returning regular analyst), team (T21 B), the list was updated

**Grade: S** (success). The old file was replaced, not added beside it, the ranking was rerun on
the new list, and all three answers are right. The last screen (`09.png`) shows the left panel
titled "Graph team-v2.csv", the PageRank row reading 14, the drawing key "Size: PageRank" and
"Color: PageRank" at 0.02333 to 0.1339 with no "out of date", and the run's inspector "ran Oct 9,
8:52:36 PM" with "14 of 14 have a value, 0.02333 to 0.1339, median 0.04819" and Top 10 "Di 0.1339,
Hal 0.1305, Ed 0.1245". Jordan's answer: 14 people now (were 12), Hal first before (0.1293), Di
first now (0.1339), Hal second (0.1305). All match the key.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Setup `team-ranked` (team.csv loaded, PageRank run, size by PageRank). Not void:
every step produced its screen, the session and setup logs show no errors, and the start waited
for a browser slot without failing.

## The answer against the key

- **Team size now (right).** 14. Read from the Replace page ("Was 12 nodes, 16 edges; now 14,
  21", `06.png`), the Overview (Nodes 14, Edges 21, `07.png`) and the rerun ("14 of 14 have a
  value", `09.png`).
- **First before (right).** Hal, 0.1293, read from the run's Values before the replacement
  (`02.png`), not from a stale screen after it.
- **First now (right).** Di, 0.1339, read after Rerun (`09.png`). Not `stale-read`: Jordan saw the
  "Data changed since this run" bar and the old Top 10 in `08.png` and did not report from it.
- **Work kept (right).** `work.json` start and end both list the run "pagerank PageRank (label
  Influence)" and the three layers (Node defaults, Edge defaults, Influence); sources go from
  team.csv to team-v2.csv, and team.csv under "gone" is the replacement the task asks for, not
  `work-lost`. Not `added-not-replaced`: one source, team-v2.csv.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`): Values, Data, team.csv
  (left click), Source actions, Replace with file... with team-v2.csv, Replace, PageRank, Rerun.
  This is exactly the key's walked round 2 route through the source inspector's "..." menu
  (8 steps), which is graded like the success path; it is two more than the right-click route
  (6). 1.0x against the route taken, 1.33x against the shortest route.
- **Wrong turns:** 0.
- **False "done":** none. truth_on_screen holds: every number Jordan reported is on the last
  screen or on the earlier screen it was read from.
- **Stale read:** none, though the old Top 10 sat at full contrast under the "Data changed" bar
  (`08.png`).
- **Blue dots read as a highlight or selection:** no. Jordan read them as "the new people, not
  colored because the ranking hasn't seen them" (`07.png`), which is right.
- **Moved drawing read as lost work:** no. "My coloring is still there, good."
- **"Added" heading read as an addition:** not seen; Jordan did not return to the source's
  inspector after Replace.
- **Quoted "closer" as a reason:** yes. On the Replace page Jordan left "Higher means: Not set"
  because "last time it said it assumed closer" (transcript, step 6), which the key asks to record.
  Leaving it was correct for this task.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Scripted exit:** no.

## Problems

1. **After Rerun the earlier ranking is gone, with no before/after (severity 2).** `08.png` shows
   the old Top 10 (Hal first); `09.png` after Rerun shows only the new one, and nothing on screen
   keeps or compares the earlier values. Jordan could answer "who was first before" only because
   Jordan opened Values and wrote the name down before replacing the file: "If I hadn't, I
   couldn't answer ... there's no before/after or 'moved up/down' view." A participant who
   replaced first would have no way to recover the earlier answer except Undo. It did not cost
   this session, so not 3.
2. **"Higher means: Not set" does not say whether leaving it keeps the earlier reading (severity
   1).** `06.png`: the Replace page offers Not set / Closer / Farther / Capacity with the line
   "Until you do ... PageRank and communities read a higher weight as closer." Jordan: "I wasn't
   sure leaving it unset would give the same reading. A line saying 'same as your current file'
   would have reassured me." Left as is, correctly.
3. **A left click on the source row opens a table drawer nobody asked for, and it stays open
   (severity 1).** `04.png` to `09.png`: the Edges table ("21 edges", "In the order loaded")
   occupies the bottom of the canvas through Replace and Rerun and pushes the drawing and its
   toolbar up. Jordan: "Clicking the file row first popped open a big table at the bottom I didn't
   ask for."
4. **The replace action is reachable only through an unlabeled "..." (severity 1).** `04.png`,
   `05.png`: the source's inspector shows no Replace control; Jordan found "Source actions" by
   guessing that "file options hide" there. Found first try, so it cost nothing here.
5. **The run row's out-of-date mark is a wordless history icon (severity 1).** `07.png`,
   `08.png`: the PageRank row's icon changes to a clock and its count stays 12. Jordan "only
   understood it because the legend also said 'out of date'."
6. **Between Replace and Rerun the old Values stay at full contrast (severity 1, not hit).**
   `08.png`: histogram, "12 of 12 have a value" and the Top 10 with Hal first, unmarked, below the
   "Data changed since this run" bar. Jordan read the bar and did not take the stale name; a reader
   who skims would. Recorded because the key names it as a `stale-read` trap.

## Build-level notes for the round

- No implementation fault was hit: every click landed on the first try, every screen matched the
  answer key's description of this build, and no step errored. The problems above are about
  information design (the lost earlier ranking, the weight question's wording, wordless icons and
  an unrequested drawer), not defects in the build.
- Simulated participant: a returning user's briefing, not a memory. A pass here is weak evidence
  until a real person confirms it. Keyboard and screen-reader access were not tested by this
  session.
