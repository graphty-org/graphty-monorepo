# Pilot: T62 A (pantries.csv, "which site opened most recently") -- targeted re-walk

Build: ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1). Start: setup
`pantries.txt` (pantries.csv open on its own, Data place showing, the table open). All screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T62A/.
The data stayed the task's own on every walk: 12 sites, P01-P12, no edges.

Every walk was started by replaying an earlier walk of the same route on this build. All four
matched every check point to the end, so every screen below is this build's own.

Result: reached by pointer and by keyboard. Answer on screen: **Bayview Clinic** (P12, Mar 8,
2023), with `opened`'s kind set to date (calendar glyph in the header).

## Route 1: success path by pointer (w1-path)

Replayed from the first pass's walk; all 7 steps matched. Start: `opened` reads Aa with ISO text
"2015-03-02"; the inspector shows "Time: opened" with "Set in Data" (w1-path/01.png). Header
"Options for opened" > Type > date turns the glyph to a calendar and the cells to "Mar 2, 2015";
"Options for opened" > Sort descending gives "Sorted by opened, newest first" with P12 Bayview
Clinic, Mar 8, 2023 on top (w1-path/08.png). Path steps: 5, as the answer key says.

## Route 2a: detour, the inspector's "Set in Data" (w2-inspector)

Replayed from the previous pass's walk of this route (r1d1 y2-detour-inspector); all 11 steps
matched. "Set in Data" sets the node Time to `opened` at once: Fields gains a Time row, the canvas
toolbar gains a clock button, the header reads "Aa Time opened", the cells stay ISO text and the
kind stays text (02.png). Two header clicks sort "A to Z" then "Z to A" and put Bayview Clinic
(2023-03-08) on top (03.png, 04.png). This is the decided behavior (a text-kind column reads as
text whatever its role); the first pass's walk of this route was taken on a build that drew the
cells as dates, which is why that replay diverged at step 1. Escape in the Time row's list keeps
the value (06.png); Fields "+" > Kind adds an empty Kind row, Escape twice takes it back (07-10.png).
Header menu > Type > date then sets the kind: calendar glyph, "Mar 8, 2023", "newest first" (12.png).

## Route 2b: detour, Data > Fields "+" > Time > opened (w3-fields)

Replayed from r1d1 y3-detour-fields; all 12 steps matched. Fields "+" > Time adds an empty Time row
with its list open (03.png); Enter with the pointer off the list takes nothing (05.png); choosing
`opened` gives the same state as 2a: header "Aa Time opened", ISO cells, Type still checks text
(06.png, 07.png), Role checks Time (08.png). Right-click on the header opens the same header menu
(11.png); right-click on the source row lists Replace with file..., Select nodes, Export..., Rename,
Remove -- nothing about a column's kind (12.png).

## Route 3: success path by keyboard only (w4-keys, --keys --sr)

Replayed from the first pass's walk; all 73 steps matched, so its Tab order and findings stand
(focus never fell to the page body). ArrowRight walks the headers to "text opened"; Shift+F10 opens
the header menu; Type > date; Shift+F10 > Sort descending; the cell "Bayview Clinic" is reached by
arrows and Enter selects P12 (w4-keys/60.png).

## Routes in the fix list

None of these routes belongs to T62 A. Each one was walked once on this build, in its own session,
by replaying the walk of the same route from that task's pilot. Every replay matched every check
point to the end (exit 0), so the screens are the ones recorded there. Folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T62A/:

- T65A success path: f01-T65A-path (ends with the selection inspector: a Summary and no node list)
- T65A success path, the other card order: f02-T65A-other-order
- T65B success path: f03-T65B-path (ends at "3 nodes selected"; selection inspector, no node list)
- T65B detour, a style layer's Which nodes: f04-T65B-which-nodes
- T68A and T68B starts: f05-T68A-start, f05b-T68B-start
- T64B detour, table header Role > Weight, then Shortest path again: f06-T64B-table-role
- T64A detour, table header Role > Weight, then Shortest path again (also Analyze list for a weight,
  and Analyze > Shortest path after the label is set): f07-T64A-table-role
- T64A and T64B success path (Analyze after Data > Fields; inspector and find P05): f08-T64A-path,
  f08b-T64B-path (path result reads names after the label is set)
- T64B detour, Analyze list for a weight: f09-T64B-analyze-weight
- T64B success check, inspector and find G05: f10-T64B-inspector-find

A second, fresh replay of the success path and of these routes was queued (folders g00-g10) but
never got a browser: every machine-wide browser slot stayed taken, and it was stopped before any
session started.

## Mismatches between the answer key and the screen

None on the success path. The answer key's note for routes 2a/2b (ISO text under a "Time" chip, a
header click sorting "A to Z" / "Z to A") matches this build.

## Defects (crash, block or a wrong result that spoils grading)

None on the pointer success path or the two detours.

Keyboard (carried, unchanged on this build): the header menu, the only place that sets a column's
kind, opens only with Shift+F10; the "..." button is not a Tab or arrow stop and nothing on screen
names the key (w4-keys/48.png, 49.png). A keyboard participant who does not know Shift+F10 cannot
reach Type.

## Not walked

A fresh re-walk on this pass of the success path and the fix-list routes: no browser slot came free.
The walks above on the same frozen build stand in for it.
