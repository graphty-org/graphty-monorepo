# Pilot: T21, the list was updated

Build `ca8b3b916c22 graphty@0.8.55` (the build the answer key was recorded on), served from a
frozen copy by `tool/real.mjs`. Both datasets were walked along the answer key's success path.
Screenshots for the running club are in `A/`, for the team in `B/`. No script errors, console
errors or failed requests were reported on any step.

**Result: reached on both datasets, with the values the answer key gives.**

## A: running club (setup `friends-pagerank.txt`)

| Step | Screenshot | What the screen showed |
| --- | --- | --- |
| start | 01 | friends.csv drawn and colored by PageRank; key 0.03779 to 0.06394; row "PageRank 20" |
| `--click "PageRank" --click "Values"` | 02 | Top 10 starts Farah 0.06394, Hana 0.05941, Milo 0.05648 (first before: Farah) |
| `--click "Data"` | 03 | Sources: "friends.csv 41 rows, 41 edges"; Filters; Attributes |
| `--rclick "friends.csv"` | 04 | Menu: "Edit source...", "Replace with file..." (the first item is highlighted) |
| `--click "Replace with file..." --upload friends-v2.csv` | 05 | "Replace: friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41"; 41 edge rows, weight column read as Weight |
| `--click "Load"` | 06 | Back on Graph, header "friends-v2.csv"; PageRank row shows the out-of-date icon; the open PageRank inspector shows "Data changed since this run" with "Rerun"; colors, key and Top 10 still the old run's (Farah first) |
| `--click "Rerun"` | 07 | Key 0.02872 to 0.08012; Top 10 Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141 (first now: Ava) |

## B: team (setup `team-pagerank.txt`)

Values before (02): Hal 0.1293 first, key 0.03273 to 0.1293. "Data", right-click "team.csv",
"Replace with file..." with team-v2.csv (03): "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
14, 21". Load (04): out-of-date icon and "Data changed since this run" bar; the two new people are
drawn in the default blue while the row still says 12 and the Top 10 is the old one. Rerun (05):
row "PageRank 14", "14 of 14 have a value", Top 10 Di 0.1339, Hal 0.1305, Ed 0.1245.

## What a participant could trip on (none blocked the path)

1. **Stale read after Load, as the answer key predicts.** Between Load and Rerun the drawing's
   colors, the key and the Top 10 all still show the old run (A/06, B/04). The only signals are the
   small icon on the PageRank row and the bar at the top of the run's inspector. A participant who
   reads the Top 10 right after Load answers Farah (A) or Hal (B) for "first now".
2. **The whole drawing is laid out again after Load.** On A the 20 people and 41 ties are the same
   ones, but every node moves (compare A/02 and A/06), so the picture the participant knew is gone.
   A participant may read that as "the work was lost" even though the run, its colors and the
   layers survived. Worth watching for in the round; not a blocker.
3. **"Higher means" on the Replace page shows Closer, Farther and Capacity with none visibly
   chosen** (A/05, B/03), while the line above says "Weight: weight auto" and the footnote says
   PageRank reads it as larger = closer. Off the task's path, but a careful participant may stop
   there wondering whether they must pick one.
4. In B the answer to "how many people now" is on screen in three places (Replace page "now 14",
   row "PageRank 14" after Rerun, "14 of 14 have a value"); before Rerun the row still says 12,
   which is a second stale-read risk for that question.

## Answer key check

Values, page titles and counts all match `answers.md`. One note on the success path: its
`--click "PageRank"` before "Rerun" is not needed when the run's inspector was already open before
the replacement (it stays open after Load, as in A/06 and B/04); it is needed only if the
participant left the Graph inspector showing. Graders should not count its absence as a deviation.
