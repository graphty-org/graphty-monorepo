# Tier 2 answer key -- GRADERS ONLY

Participants never see this file. The tasks are in `tasks.md` (this folder), the bars in
`criteria.md`. Grading follows tier 1's rules (`../answers.md`, its opening sections, and
`../criteria.md`, "Grades"): S, SD, F, G; answers count only when they were on screen first;
graded from the last screenshot, the downloads and the transcript, never from a self-rating;
build defects confirmed by a scripted repro.

**Screenshot paths** such as `preflight/T17A/09.png` or `T17A/09.png` are under
`../rounds/tier-2/preflight/` (build ca8b3b916c22, before the tier 2 fixes). Paths starting
`final/` are in this folder (`final/T4/A/07.png` is `pilot/T4-final/A/07.png`): the walk of every success path on the
study build e2ccec0e9304 (`criteria.md`, first line), with each session's steps in
`pilot/<task>-final/<A|B>.steps.log`. Where the two differ, the final walk is the screen.

**Where the values come from.** Every reference value was read from graphty-element on the served
build `ca8b3b916c22 graphty@0.8.55` (https://dev.ato.ms:9366/?next, 2026-10-07), two ways: a probe
that loads each file through the element's own import and reads filter counts, routes and rankings
(`preflight/reference/probe.mjs`, `probe2.mjs`; output `reference.json`, `reference-open.json`), and
a pilot of every task through the app with `tool/real.mjs`, whose screenshots show the same values
(`preflight/<task>/`). T22 to T24 were piloted on a frozen copy of that build; their values are
the screens' and agree with a count from the files (`preflight/reference/hand.py`). A ranking is
the element's PageRank, which follows each tie from its first column to its second (a CSV opened
"as the file says" is directed); NetworkX's undirected PageRank gives a different order, so never
grade against a hand calculation. Every value was then read again on the study build e2ccec0e9304
from the final walk's screens (`pilot/<task>-final/`), and agrees.

**Every value and every "known on this build" note is re-recorded on the build a round studies**
(criteria, preflight items 3 to 5). This key is recorded on build 8f0d5a6f7791, the round 2 study build (its section below, after 2dcea6dd5bba's); a note that build no longer shows has been deleted or reworded, not left
for graders.

**The first round 1 build, 16dcf3494700.** Round 1 was first planned on build 16dcf3494700. Every task half was piloted on it from the start `roster.md` names, with screenshots in
`rounds/r1/pilot/<task><half>/` of this folder (for example `rounds/r1/pilot/T4A/07.png`). Every
value in this key agrees with those screens; where a screen differs (a click point, a cut label, a
note no longer true), the task's entry says so and cites the pilot. The `final/` walks started
from the earlier, unranked setups, while round 1's starts are ranked, colored and sized by
PageRank, so a `final/` drawing can look different from a session's even where the values agree.
Screenshot numbers depend on how the steps are grouped: match the screen, not the number.

**The earlier study build, 3dfe7daf9e45 (graphty@0.8.56).** Before 909b19b578d4 (below), the
round was to run on build 3dfe7daf9e45. Every task half but T21 A was piloted on it again from its start,
with screenshots in `rounds/r1d1/pilot/<task><half>/` (for example `rounds/r1d1/pilot/T4A/09.png`).
Every reference value held. Where this build's screen differs from an earlier note, the task's
entry below now gives this build's screen and cites `rounds/r1d1/`; a `final/` or `rounds/r1/`
citation is kept only where its screen still matches. Across tasks on this build: a selected tie
is drawn with a blue band (not gold); a run's Made with lists "From" and "To" (not "Source" and
"Target"); picking an option in the Path popover's From with a click moves focus on to To.

**The second dry run build, 909b19b578d4 (graphty@0.8.56).** Before 8c4eef4722ac (below), round 1
was to run on build 909b19b578d4, which holds the fixes the 3dfe7daf9e45 pilots pointed to. Every task
half, T21 A included, was piloted on it from its start, with screenshots in
`rounds/r1d2/pilot/<task><half>/` (for example `rounds/r1d2/pilot/T4A/12.png`). Every success path
landed on the first try with no script errors, console errors or failed requests, and every
reference value held. Where this build's screen differs, the task's entry below gives this build's
screen and cites `rounds/r1d2/`; an older citation is kept only where its screen still matches.
Across tasks on this build:

- After the find box picks a node, or after a run finishes, focus lands on the inspector's title
  (the node's or the run's name in the panel header, with a focus ring), not on a row below it.
- A run's Made with "Ran" row and the inspector's subtitle show the date and the time ("Oct 8,
  4:31:04 PM"), so two runs, or a run before and after Rerun, can be told apart on screen.
- A shortest path is drawn in black on the ranked starts, and the legend has one heading,
  "Shortest path", over one entry, "On the path".
- A session's `session.json` records under "commit" the studio worktree's commit at the time of
  the session, not the build served; the "buildStamp" (`909b19b578d4 graphty@0.8.56`) names the
  build. Check the build by the stamp.

**The third dry run build, 8c4eef4722ac (graphty@0.8.56).** Before 946256efb876 (below), round 1 was to run on build 8c4eef4722ac (buildStamp `8c4eef4722ac graphty@0.8.56`). Every task half was piloted
on it from its start, with screenshots in `rounds/r1d3/pilot/<task><half>/` (for example
`rounds/r1d3/pilot/T4A/10.png`). Every success path landed on the first try with no script errors,
console errors or failed requests, and every reference value held. Where this build's screen
differs, the task's entry below gives this build's screen and cites `rounds/r1d3/`. The notes
across tasks for 909b19b578d4 above still hold, except:

- After the find box picks a node, the focus on the inspector's title is drawn as blue underlined,
  link-style text, not as a ring (`rounds/r1d3/pilot/T12RA/05.png`, `T12RB/05.png`, `T23B/03.png`).
- After Rerun, no focus mark could be seen anywhere (`rounds/r1d3/pilot/T21A/07.png`); focus may
  be on no control. Not confirmed with a screen reader.
- The times in "Ran" are the time of day of each session ("Oct 8, 7:28:37 PM" in one pilot); the
  example times in this key are only examples. Match a run by its time changing, not by the text.

**The round 1 study build, 946256efb876 (graphty@0.8.56).** Round 1 ran on build 946256efb876
(`criteria.md`, first line; buildStamp `946256efb876 graphty@0.8.56`). Every task half was
piloted on it from its start (T18 B last, its walk recorded in its entry), with screenshots in `rounds/r1d4/pilot/<task><half>/` (for
example `rounds/r1d4/pilot/T4A/11.png`). Every success path landed on the first try with no script
errors, console errors or failed requests, and every reference value held. Where this build's
screen differs, the task's entry below gives this build's screen and cites `rounds/r1d4/`. The
notes above still hold, except:

- After the find box picks a node, focus is in the inspector (a read of the page finds it at the
  node's title heading), but no focus mark is drawn: the title is plain white text, with no ring,
  underline or color change (`rounds/r1d4/pilot/T12RA/05.png`, `T12RB/05.png`, `T19B/02.png`).
  After "Back to <name>" no focus mark is drawn either (`T12RB/10.png`). The shortcut that follows
  (n for a note) still works.
- After Rerun, a read of the page finds focus in the inspector at the run's heading
  (`rounds/r1d4/pilot/T21B/`), but no focus mark can be seen (`T21A/07.png`).
- An Escape that clears a selection shows a toast, "Selection cleared: 1 node" (or "3 edges"),
  with only a close button and no way to restore the selection; it fades by the next step
  (`rounds/r1d4/pilot/T19A/05.png`, `T22A/12.png`). Control+Z that undoes a style change shows a
  toast naming it ("Undid changing Size on PageRank.", `T22A/17.png`), which also fades
  (`T22B/17.png`).
- The tooltip "Turn this step on" on a checkbox, and the tooltips of "Filter to neighbors", open
  only once the pointer enters the control: right after a click with the pointer still on the
  control, `real.mjs --hover` prints an empty tooltip ("") and none is drawn
  (`rounds/r1d4/pilot/T17A/10.png`, `T17B/09.png`, `T23B/06.png`); moving away and back shows it
  (`T17A/12.png`, `T17B/11.png`, `T23B/17.png`). A participant who clicks and keeps the pointer
  still sees no tooltip.

**The round 2 study build, ddf8b3b63039 (graphty@0.8.60).** Round 2 was first to run on build ddf8b3b63039, before fabc16247403 (below). Every task half but T12R was piloted on it from its start, with
screenshots in `rounds/r2/pilot/<task><half>/` (for example `rounds/r2/pilot/T4A/08.png`; T21 A's
inspector-menu route in `rounds/r2/pilot/T21A-menu/`). Every success path, and every round 2
route, landed on the first try with no script errors, console errors or failed requests, and
every reference value held. T12R A and B were not walked on this build: the tool could not get
them a browser (see `../tool/README.md`, "Browsers"); their entry below is still 946256efb876's
until they are. Where this build's screen differs, the task's entry below gives this build's
screen and cites `rounds/r2/`. The notes above still hold, except:

- While a run's ranking does not match what is drawn -- a filter step is on (T17, T23) or the data
  was replaced and not yet rerun (T21) -- the drawing's key titles read "Size: PageRank, out of
  date" and "Color: PageRank, out of date"; the range shown is still the run's own (the whole
  graph's, or the old file's), and nothing says whose range it is. The words go once the filter is
  off or the run is redone (`rounds/r2/pilot/T17A/07.png`, `08.png`; `T21A/06.png`;
  `T23A/07.png`). Under a filter the ranking is not stale for the task: record any participant who
  reruns PageRank or asks what is out of date.
- A run's Values tab opens with a collapsible "Summary" heading over its first row ("Path 5 nodes,
  4 edges"), and the run's subtitle reads the kind word and a link-styled time ("Path ran Oct 9,
  5:54:06 AM") (`rounds/r2/pilot/T18A/10.png`); for PageRank the kind word is "Measure" ("Measure ran Oct 9, ...", `rounds/r2d3/pilot/T21A/07.png`). On 8f0d5a6f7791 PageRank's Values tab heads that first section "Values" instead of "Summary" (`rounds/r2d4/pilot/T21A/02.png`, `06.png`, `07.png`).
- A selected node is marked by its yellow halo only; under a style layer that colors nodes (every
  ranked start), its fill does not change (pixels identical before and after,
  `rounds/r2/pilot/T24A/03.png` against `06.png`; `T23B/04.png`).
- After Find path, after Rerun and after a project's Save, no focus mark can be seen anywhere
  (`rounds/r2/pilot/T18A/10.png`, `T21A/07.png`, `T19A/09.png`). After Rerun, Tab lands on the
  "ran Oct 9, ..." link in the inspector header (`T21A/08.png`), so focus is in the inspector.
- The tooltip of "Filter to neighbors" now opens on A too once the pointer re-enters
  (`rounds/r2/pilot/T23A/10.png`).
- The dates read "Oct 9"; the times are each session's.

**The round 2 dry run build, fabc16247403 (graphty@0.8.61).** Round 2 runs on build fabc16247403
(`criteria.md`, first line). Every task half but T21 B was piloted on it from its start, T12R A and
B included, with screenshots in `rounds/r2d1/pilot/<task><half>/` (for example `rounds/r2d1/pilot/T4A/07.png`). T21 B's pilot
never got a browser (all four machine-wide slots stayed taken for more than 5 minutes), so its
entry is still ddf8b3b63039's. Every success path walked landed on the first try with no script
errors, console errors or failed requests, every reference value held, and `work.json` shows
nothing gone (T21 A's replaced file aside, as before). The T20 round 2 route was walked again (10
steps); T21 A walked the right-click route, not the inspector menu. Where this build's screen
differs, the task's entry below gives it and cites `rounds/r2d1/pilot/`. The notes above still hold, except:

- Under a filter step (T17, T23) the drawing's key titles read "Size: PageRank on 20 nodes" and
  "Color: PageRank on 20 nodes" (Les Miserables "on 77 nodes", Florentine "on 15 nodes"): the
  number is the nodes the run ranked, while the header chip counts fewer. The range is still the
  whole graph's. The titles go back to plain "Size: PageRank" once the step is off
  (`rounds/r2d1/pilot/T17A/07.png`, `09.png`; `T23A/07.png`; `T23B/07.png`). No visible words say "out of date"
  under a filter: the PageRank row shows a history icon whose tooltip explains it ("Ran on 20
  nodes; 15 shown now"), and "PageRank, out of date" is only its accessible name. After a
  replacement not yet rerun (T21) the titles still read "Size: PageRank, out of date"
  (`rounds/r2d1/pilot/T21A/06.png`). Record any participant who reads "on 20 nodes" as the count still drawn.
- The chosen part of a segmented control is a solid white fill with dark text, not an outline: the
  Hops "1", "an edge" under "Each row is", and the chosen one of Add and Leave out
  (`rounds/r2d1/pilot/T4A/07.png`, `T12RA/06.png`).
- The neighborhood view is headed "<name> and <n> connections" ("Ava and 6 connections", "Ava and
  14 connections within 2 hops", "Javert and 17 connections", "Medici and 6 connections"), not
  "<name>'s <n> connections". The count is the same; the Selection row (n + 1) counts the person
  too. The panel header keeps the node's icon and color swatch, with the subtitle "Neighborhood"
  and a "Back to <name>" row above the heading (`rounds/r2d1/pilot/T23A/05.png`, `T12RB/06.png`). At 1440 x 900
  the Florentine Hops 2 heading is cut to "Medici and 11 connections within 2 ho..." with no
  tooltip (`rounds/r2d1/pilot/T23B/05.png`).
- A source's inspector heads its counts "Loaded", not "Added" (`rounds/r2d1/pilot/T4A/14.png`, `15.png`).
- A filter step's row is drawn with the blue selected fill while its editor is open
  (`rounds/r2d1/pilot/T17A/10.png`, `T17B/11.png`).
- The left panel's graph title (for example "Graph bus-stops.csv") is a button: a click brings
  back the graph's inspector and its Overview, also after a run, with the run still drawn
  (`rounds/r2d1/pilot/T20A/12.png`), and with a neighbor list and its filter open (`rounds/r2d2/pilot/T23B-old-build-d5a3bee/09.png`).
- No reset button is drawn beside a setting at its default (the PageRank Damping factor after
  Replace and after Rerun, `rounds/r2d1/pilot/T21A/06.png`, `07.png`, `09.png`).
- The find box's hint and its bare-number refusal quote the participant's own condition as a rule
  (T22).
- A Recent projects row's subtitle fits on one line ("In this browser - 20 nodes - Oct 9, 9:54
  AM", `rounds/r2d1/pilot/T19A/10.png`).
- The import page names the file format under "File settings" ("CSV auto") at the top right of
  the table pane, and puts its counts line and its unmatched-row line in a strip above Direction,
  Cancel and Load (T4, T20).
- After a project is reopened the Undo button is grayed: the undo history does not survive a save
  and reopen, and nothing says so (`rounds/r2d1/pilot/T19A/11.png` against `09.png`).
- **For graders reading `work.json`:** the tool names the PageRank run and its style layer
  "Influence" ("pagerank Influence", "influence_1 Influence") while the screen says "PageRank", and
  it cuts a filter step's rule off mid-text (`step-1 off {"kind":"range","attribute":"data.weight","min":5,"nodes":"e`,
  `rounds/r2d1/pilot/T17A/work.json`). A participant sees neither; grade from the screen.

**The earlier round 2 study build, eaea2a75d95b (graphty@0.8.61).** Round 2 was first frozen on
build eaea2a75d95b (buildStamp `eaea2a75d95b graphty@0.8.61`). Its app and element source
is the same as d5a3bee20b61, the third round 2 dry run build (`dry-run-r2-3.md`). Every task half
was piloted on it from its start, with screenshots in `rounds/r2d2/pilot/<task><half>/`, except
three halves whose folder already held an earlier walk: T4 B is in `T4B-eaea2a75d/`, T17 B in
`T17B-eaea2a75d/` and T22 A in `T22A-eaea2a75d/`. The folders `T4B/`, `T17B/` and `T22A/` still
hold walks of d5a3bee20b61; the other d5a3bee20b61 walks are kept beside this build's as
`<task><half>-old-build-d5a3bee/` (T4 A's as `T4A-unfrozen-d5a3bee20b61/`). Cite only this build's
folders for this build. Every success path landed on the first try with no script errors, console
errors or failed requests, every reference value held, and `work.json` shows nothing gone (T21's
replaced file aside, as before). Where this build's screen differs, the task's entry below gives it
and cites `rounds/r2d2/pilot/`. The notes above still hold, except:

- The "1 row left out" inspector holds only its "Left out" section, with no counts (T4).
- "Show the 1 unmatched row" no longer moves Add and Leave out (T4).
- A preview that scrolls draws a scrollbar, but its caption still says every row is shown ("The
  first 17 rows of 17") while the last rows are below the pane (T4, T20).
- The weight note under a run's Weight row is at the rows' own size (T18).
- The find box's red refusal starts at the same place as its gray lines, and Enter on a rule that
  picks the set already selected shows the count again (T22).
- A section title cut short shows in full in a tooltip on hover (T23 B).
- Reopened at Hops 1 while this node's 2-hop filter is on, "Filter to neighbors" shows pressed
  (T23).
- A menu opened with a click can open with its first item filled blue (keyboard focus on it): the
  "Edge actions" menu on "Select endpoints" (T24).
- **For graders reading `work.json`:** a filter step's rule is recorded whole, and the PageRank run
  as `pagerank PageRank (label Influence)`, the screen's name followed by the element's own label;
  only the style layer is still named `influence_1 Influence` (`rounds/r2d2/pilot/T17A/work.json`,
  `T17B-eaea2a75d/work.json`). The shortest path run's own label is "Shortest route", which no
  screen shows (`T18B/work.json`). Grade from the screen.

**The previous round 2 study build, 2dcea6dd5bba (graphty@0.8.61).** Round 2 was to run on build
2dcea6dd5bba (buildStamp `2dcea6dd5bba graphty@0.8.61`). Every task half was piloted
on it from its start, with screenshots in `rounds/r2d3/pilot/<task><half>/`. Every success path
landed on the first try with no script errors, console errors or failed requests, every reference
value held, and `work.json` shows nothing gone (T21's replaced file aside). Where this build's
screen differs, the task's entry below gives it and cites `rounds/r2d3/pilot/`. The notes on
eaea2a75d95b above still hold, except:

- A whole table's import preview is captioned "All N rows" ("All 23 rows", "All 18 rows", "All 17
  rows", "All 13 rows", and "All 41 rows" on the Replace page), where earlier builds said "The
  first N rows of N". The rows below the pane are still cut off under it (T4, T20, T21).
- The "Add a table" tooltip opens to the left of the "+", in the Tables column, and covers nothing
  in the table pane (T4).
- The neighbor list reopened while a node's 2-hop filter is on comes back at Hops 2, with
  "Filter to neighbors" pressed and its ordinary pressed tooltip; the Hops 2 heading wraps onto two
  lines instead of being cut, and has no tooltip (T23 B).
- A menu opened with a click highlights no item: the "Edge actions" menu shows its three items
  alike (T24).
- On B, Escape with focus on the Selection row shows the toast "Selection cleared: 13 edges"
  (T22).

**The round 2 study build, 8f0d5a6f7791 (graphty@0.8.61).** Round 2 runs on build 8f0d5a6f7791
(`criteria.md`, first line). Every task half was piloted on it from its start, with screenshots
in `rounds/r2d4/pilot/<task><half>/`. Every success path in this key landed on the first try with no script errors,
console errors or failed requests, every reference value held, and `work.json` shows nothing gone
(T21's replaced file aside), with one exception: T12R's path, which this build shortens to 4 steps
(its entry below). The notes on 2dcea6dd5bba above still hold, except:

- The find list marks its first result as soon as a name is typed, so Enter picks it; Down arrow
  now moves the mark to the second result. On T12R that is the person's first tie, so the old
  path's Down arrow and Enter open a tie, not the person (T12R).
- After Enter picks a tie in the find list, focus stays in the emptied find box; after Enter picks
  a node, focus moves to the inspector (T12R).
- The "1 row left out" inspector's heading carries the red-orange warning triangle its Sources row
  carries; the source's own inspector keeps the plain document icon (T4).
- A click on a node's drawn name selects that node and opens its inspector (T24 B).
- PageRank's Values tab heads its first section "Values", not "Summary"
  (`rounds/r2d4/pilot/T21A/02.png`); the path run's tab still heads it "Summary" (T21, T18).

Screens this key did not describe, all the same on 2dcea6dd5bba where it was walked:

- T4: the open "Add a table" menu also covers the green check mark on the "Nodes: people.csv" row
  in the Tables list (A, `rounds/r2d4/pilot/T4A/06.png`).
- T17: the T17 notes hold on this build, A walked with its follow-up (`rounds/r2d4/pilot/T17A/07.png`,
  `08.png`, `11.png`, `12.png`; pixel for pixel the same as `rounds/r2d3/pilot/T17A/07.png`).
- T18 B: the ranked start's key already holds two PageRank rows, "Size: PageRank" (a gray wedge)
  and "Color: PageRank" (an orange gradient), both 0.03066 to 0.1458 (`rounds/r2d4/pilot/T18B/01.png`);
  after the run "Shortest path / On the path" (black swatch) sits above them, and the five path
  nodes are drawn black although the key still shows the orange PageRank gradient
  (`07.png`, `11.png`). Record any participant who reads a black node as off the gradient.
- T19: after Tab moves focus from a half-written note to the editor's Cancel button, Escape removes
  the button's ring and no focus mark is drawn anywhere, while the note and its text stay open
  (`rounds/r2d4/pilot/T19A/13.png`, `14.png`); Control+Enter from Cancel still saves the note
  (`16.png`). Before the first step the inspector shows the PageRank run (Style tab), as every
  ranked setup leaves it (`T19A/01.png`).
- T20 A: a click on the graph title ("bus-stops.csv") brings back the Overview with the path still
  drawn, and the tree's "Shortest path 4 hops" row loses its blue selected fill
  (`rounds/r2d4/pilot/T20A/12.png` against `13.png`); the Park-to-Clinic route edge ends under the
  large Clinic node with no visible arrowhead (`12.png`); in the Overview, the "Loaded weight" label
  and its value "minutes (farther)" nearly touch (`07.png`).
- T20 B: of the two route nodes that overlap, Creek is at about 790,636 (hovering there names it)
  and Summit at about 755,645 (`rounds/r2d4/pilot/T20B/14.png`). The "Higher means" label sits at
  about y 270 and its choice buttons at about y 283 to 305 (`05.png`): a point at y 272 lands on
  the label, not a choice.
- T22: with a lone "=" typed, the first column row ("id, Node column") is drawn filled, as the
  marked option (`rounds/r2d4/pilot/T22A/03.png`, `T22B/03.png`). What Enter does there has not
  been walked; record any participant who presses it.
- T22: after Escape clears the selection with focus on the Everything row, that row stays drawn
  selected while the inspector shows Graph / Overview (A, `rounds/r2d4/pilot/T22A/13.png` to
  `15.png`). After Control+Z undoes "Size on PageRank", the nodes are not drawn at one size: on B
  the highest-ranked (Valjean, Myriel) are among the smallest dots and many low-ranked ones are
  larger, the same after the camera turns, while the Everything layer reads Size 1
  (`rounds/r2d4/pilot/T22B/13.png`, `15.png` to `17.png`; the same on `rounds/r2/pilot/T22B/13.png`).
  Record any participant who reads node sizes after that undo.
- T23 A: hovering the PageRank row in the left panel shows an eye (visibility) icon at the row's
  right edge as well as the history icon (`rounds/r2d4/pilot/T23A/09.png`).
- T24 B: the setup's key reads "Size: PageRank" and "Color: PageRank", both 0.04282 to 0.3273
  (`rounds/r2d4/pilot/T24B/01.png`). Searching "Stadium" lists the results under the headings
  "Nodes 1" and "Edges 3", with "Stadium" in bold in each tie's title (`10.png`).
- For graders reading `work.json` (T18 B): the PageRank run is `pagerank PageRank (label
  Influence)` with layer `influence_1 Influence`, the path run `shortest_path Shortest path (label
  Shortest route)` with layers "Shortest route (nodes)" and "Shortest route (edges)"; no screen
  shows "Influence" or "Shortest route". Grade from the screen.

**Routes the round 2 build adds (walked on ddf8b3b63039).** Three round 2 changes open routes this key did
not list: the find box answers a typed condition with the rule that would read it (T22), the
source's inspector gets the "..." menu holding Replace with file... and Edit source... (T21), and a
data file opened with "Open project or file..." from the start screen goes through the Data page
(T20). Each task's entry gives the route as a "Round 2 route" with its step count, counted the way
the success paths are counted (one `real.mjs` step per screenshot). Each was walked on
ddf8b3b63039 and its entry gives the walked count: T20 10, T21 8 (one more than first counted,
because the app does not go back to the run after a replacement made from the source's inspector),
T22 4. Bar 11 and the steps measure keep the
success paths' counts (T18 4, T20 11, T21 6, T22 3); a round 2 route is graded like the success
path (S when it ends right with no detour), and a session that takes it is compared with the same
limit.

**Scripted exits.** A participant who gives up because the persona file's own rule says to (for
example "the second failure ends the session") is still graded G, and every count stays as it is.
Graders write "scripted exit" beside the grade, quote the persona file's rule with its path and
line, and name the two attempts it counted. A give-up the rule does not cover (the participant
leaves before the rule's limit, or for another reason) gets no label. `criteria.md`, "Grades".

**Where each setup leaves the screen.** A ranked setup (`friends-ranked.txt`, `team-ranked.txt`,
`bus-stops-ranked.txt`, `lesmis-ranked.txt`, `florentine-ranked.txt`) ends on the PageRank run's
inspector with its Style tab chosen, the run just styled; it does not end on Everything. A names
setup (`friends-ranked-names.txt`, `bus-stops-ranked-names.txt`) adds a label line on Everything
afterwards, so it ends on the Everything inspector, Style tab. Every setup hands over with nothing
focused and the pointer off the page, so no control is lit by a hover on the first screen.

**Tool faults seen in the round 1 pilots, not participant misses.** A click that times out
(`elementHandle.click: Timeout 3000ms exceeded`) with no change on screen is the tool's: it
happened once on a setup start (`lesmis-ranked.txt`, which still reached its end state) and once
on `--click "Degree"` (T12R A; the retry worked). Its cause is not traced; no pilot on
909b19b578d4 met it. After two hovers in a
row, the tooltip `real.mjs` prints can be the previous one's: trust the screenshot over the
printed tooltip. On eaea2a75d95b, with the machine's load average near 90 to 115, setup clicks
timed out twice, both ways round: once the click never happened and the start did not fail (T22 B,
size by PageRank missing, kept as `rounds/r2d2/pilot/T22B-setup-missed-size/`), once the click
landed and the start failed with SETUP FAILED (T12R A, kept as `T12RA-setup-click-timeout/`).
`setup.log` writes "could not click" in both cases. Before a session counts, check its first
screenshot against the start the setup should leave (for the ranked starts, Size reads "PageRank
1 to 3" and the key has a Size row), not the setup log.

**Success paths** are `real.mjs` steps, walked once each on that build (pilots). Steps marked
(click-at) use a point from the pilot's screenshot; a point is valid only for that build and that
seed, so the pilot of each round re-reads it.

**Failure codes for tier 2** (tier 1's codes also apply):

- `weight-not-read` -- the answer was computed without the tie's number when the task needed it
  (a route counted in links, not minutes or kilometers)
- `added-not-replaced` -- the new file was added beside the old one (doubled ties) instead of
  replacing it
- `stale-read` -- a value read from a run that was out of date (computed on the old file)
- `work-lost` -- the participant's earlier run, colors, reminders or filter are gone at the end
  without the participant choosing to remove them
- `not-kept` -- reminders made but not there after closing and reopening
- `not-marked` -- the elements the task asked to make stand out are not distinguishable from the
  rest at the end (nothing selected, or a color that does not separate them)
- `hid-the-rest` -- the task said to keep everything on the drawing and a filter step is still on
  at the end
- `meaning-wrong` -- a choice that makes the program read the data the wrong way round (a count of
  runs set as a distance, ties followed one way only where they run both ways)

## T4. Two spreadsheets as one network (tier 2)

- **A (office): 12 people and 22 links arrived; messages.csv has 23 rows, and one of them (line 24,
  `p11,p13,6`: Kemi Bello emails p13 six times) names p13, who is not on the staff list.** The Data
  page says so before loading: "12 node rows and 23 edge rows read; the load makes 12 nodes and 22
  edges." and "1 edge row names a node missing from the node rows. Show the 1 unmatched row", with
  "Leave out" chosen (`rounds/r2/pilot/T4A/07.png`). The link shows line 24 as `24 | p11 | p13 (no
node row) | 6`, with a red-orange warning triangle before p13 and p13 drawn in red-orange, over
  the caption "1 unmatched row: p13 has no node row"; it also changes the page: the preview table
  shrinks to that one row with a "Show all rows" link above it, and the summary line then reads
  only "1 edge row names a node missing from the node rows." with Add and Leave out
  (`rounds/r2/pilot/T4A/08.png` against `07.png`). The Tables list marks the edge table with a red-orange warning triangle and reads
  "Edges: messages.csv / 23 rows, 1 left out". After Load: the project and graph are named "people and messages" (the app header at the top left reads it), the subtitle under "Graph" at the top of the inspector reads "From 2 files" (drawn in blue, like a link; `rounds/r2d1/pilot/T4A/11.png`), Overview Nodes 12,
  Edges 22, Directed, Density 0.1667, Components 1, "Edges per node 3 to 6, mean 3.667" (the value
  wraps onto two lines) (`rounds/r1d4/pilot/T4A/09.png`; the Graph page's Overview has no Sources
  row). On the Data page (a click on "Data") the Sources list shows the source's row in full on two
  lines, "people.csv and messages.csv" over "12 nodes, 22 edges", with three rows under it:
  people.csv, messages.csv and "1 row left out", the last marked only by a red-orange warning
  triangle: its text is the same white as the file rows (`rounds/r2/pilot/T4A/12.png`). Hovering the source row shows no tooltip, and the pointer stays an arrow although a click selects the row; the whole text is already on screen (`rounds/r2d1/pilot/T4A/13.png`). Selecting the source row opens
  the source in the inspector, titled "people.csv and messages.csv" with the subtitle "Source": a "Loaded" section (Nodes 12, Edges 22; headed "Added" before fabc16247403, `rounds/r2d1/pilot/T4A/15.png`) first, then a "Left out" section with its own heading,
  holding "1 edge row was left out: it names a node missing from the node rows." and the row itself
  (`rounds/r1d4/pilot/T4A/12.png`); only the source row is highlighted, not its three child rows.
  Selecting the "1 row left out" row opens an inspector titled "1 row left out" with the subtitle
  "Left out of people.csv and messages.csv" and only a "Left out" section (the sentence and the
  row), with no counts (`rounds/r2d2/pilot/T4A/15.png`; the source's own inspector, with "Loaded"
  first, `16.png`). In both, the row wraps and shows in full: "Line
  24: p13 has no node row; from p11, to p13, emails 6" (`11.png`, `12.png`), so the missing person, the sender and the
  number of emails are all on screen with no hover. Choosing "Add"
  instead loads 13 nodes and 23 edges (p13 becomes a node with no name); either choice is correct
  if the participant says which row did not fit.
- **B (football team): 10 players and 17 passes arrived; passes.csv has 18 rows, and one
  (line 17, `s04,s11,3`: Dina Moss passes 3 times to s11) names s11, who is not in players.csv.** Data
  page: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges", "1 edge row
  names a node missing from the node rows", line 17, `s04, s11 (no node row), 3`, under the caption "1 unmatched row: s11 has no node row" with a "Show all rows" link once "Show the 1 unmatched row" is clicked (`rounds/r2d1/pilot/T4B/10.png`), and the Tables
  list's edge table "Edges: passes.csv" with the warning triangle and "18 rows, 1 left out"
  (`rounds/r1d4/pilot/T4B/07.png` to `09.png`); after Load: "From 2 files", 10 nodes, 17 edges,
  Density 0.1889, Components 1, "Edges per node 2 to 4, mean 3.4" (`10.png`); on the Data page the
  source's row shows in full on two lines, "players.csv and passes.csv" over "10 nodes, 17 edges",
  with three rows under it: players.csv, passes.csv and "1 row left out", the last with the
  red-orange warning triangle (`11.png`); hovering the source row shows no tooltip; the
  "1 row left out" row opens an inspector with the subtitle "Left out of players.csv and
  passes.csv" and only a "Left out" section, with no counts (`rounds/r2d2/pilot/T4B-eaea2a75d/14.png`); the source's own inspector (subtitle "Source") has "Loaded" (Nodes 10, Edges 17) first and "Left out" second (`T4B-eaea2a75d/15.png`). In both the line wraps in full: "Line 17: s11 has
  no node row; from s04, to s11, passes 3". The import heading reads "players: 10 nodes" after the first file (`rounds/r2d1/pilot/T4B/04.png`) and "players and passes: 10 nodes, 17 edges" once passes.csv is added (`07.png`); the header still reads "Untitled" until Load (`04.png` to `09.png`), and only
  after Load do the header and the Data page title read "players and passes" (`10.png`,
  `11.png`). On A likewise the name "people and messages" reaches the header only at Load. With "Add": 11 and 18. The import page's weight line, unmatched-row line and
  Add and Leave out buttons are drawn at about body size. Before "Show the 1 unmatched row" is
  clicked, the edge table's preview ends at line 15, cut at the bottom, under the caption "The first 18 rows of 18" (on 2dcea6dd5bba "All 18 rows", A "All 23 rows", `rounds/r2d3/pilot/T4B/07.png`, `T4A/07.png`), so the caption says every row is shown while some are below the pane; a vertical scrollbar, the whole right pane's rather than the table's, runs from the heading row down to the summary strip, and it is the only sign that line 17 is below (A likewise, line 24 below line 15). The summary
  under the table names the problem (`rounds/r2d2/pilot/T4B-eaea2a75d/07.png`, `T4A/07.png`). While that scrollbar is drawn, "File settings" and "CSV auto" sit about 15 px further left than without it (`T4B-eaea2a75d/07.png` to `09.png` against `04.png`, `10.png`); record any participant who mis-clicks them. On eaea2a75d95b the screens are, for A, `rounds/r2d2/pilot/T4A/` (the "Add a table" tooltip `05.png`, the edge table with its warning `07.png`, after Load `11.png`, the Data page `12.png`, the hover with no tooltip `13.png`, the "1 row left out" inspector `15.png`, the source's inspector `16.png`) and, for B, `T4B-eaea2a75d/` (the first file `04.png`, the tooltip `05.png`, its menu `06.png`, the edge table `07.png`, the unmatched row `10.png`, after Load `11.png`, the two inspectors `14.png`, `15.png`). On fabc16247403 both halves' screens are `rounds/r2d1/pilot/T4A/` and `T4B/` (the import page `03.png`, the first file `04.png`, the "Add a table" tooltip `05.png`, its menu `06.png`), then: the edge table with its warning `07.png`, the Leave out tooltip `08.png`,
  the Add tooltip `09.png`, the unmatched row `10.png`, after Load `11.png`, the Data page `12.png`,
  the hover with no tooltip `13.png`, the "1 row left out" inspector `14.png`, the source's
  inspector `15.png`. On both halves the import page is headed "Open as a new graph" from its first
  screen, and before a file is chosen it shows "Choose a file first" beside a disabled Load
  (`rounds/r2/pilot/T4A/03.png`).
- **Success path:** `--click "No thanks"`; `--click "New from data..."`; `--click "choose a
file..." --upload people.csv`; `--click "Add a table"` (the "+" beside Tables); `--click "File..."
--upload messages.csv`; read the report (`--click "Show the 1 unmatched row"` shows it); `--click "Load"`; `--click "Data"` (Sources); the "1 row left out" row is in the list; selecting it (or
  the source row) shows the left-out row again in the inspector, in full. On B the same steps with
  players.csv and passes.csv; the source row is "players.csv and passes.csv". Before Load, hovering
  "Leave out" shows the tooltip "Skip the rows whose end names no node"
  (`rounds/r2/pilot/T4A/09.png`), and hovering "Add" shows "Make a node for each missing name"
  (`T4A/10.png`, `T4B/09.png`). Which of Add and Leave out is chosen is shown only by a white fill on "Leave out" (dark text; "Add" sits in the control's slightly lighter gray track), with no words (`rounds/r2d2/pilot/T4A/07.png`, `T4B-eaea2a75d/07.png`). Clicking "Show the 1 unmatched row" takes its link out of the summary line, and Add and Leave out stay where they were, at about x 388 and x 441 (`rounds/r2d2/pilot/T4A/07.png` against `08.png`; `T4B-eaea2a75d/07.png` against `10.png`). The "Add a
  table" control is a bare "+" beside "Tables" with no words on screen; its name shows only as a
  hover tooltip, and its menu offers "File...", "From a URL..." and "Paste..."
  (`rounds/r1d4/pilot/T4A/04.png`, `05.png`; `T4B/05.png`); the open menu covers the "Each row is" control and the top of the id column picker, and closes when a choice is made (`rounds/r2d2/pilot/T4B-eaea2a75d/06.png`). Record any participant who does not
  find it. Load is enabled as soon as the first file is chosen ("10 node rows read; the load makes 10 nodes and 0 edges", `T4B-eaea2a75d/04.png`), and nothing warns that a graph with no edges is about to load, so a participant who misses the "+" can load one file and stop (`never-found`). On eaea2a75d95b the tooltip's box covered the first letter of the "Each row is" label; on 2dcea6dd5bba it opens to the left of the "+" (about x 177 to 255, y 107), inside the Tables column, and covers nothing in the table pane (`rounds/r2d3/pilot/T4A/05.png`, `T4B/05.png`). In the summary line ("10 node rows and 18 edge rows read; ..."), "10 node rows" and "18 edge rows" (A "12 node rows", "23 edge rows") are drawn in link blue and are buttons with no tooltip: the pointer turns into a hand, and a click switches the table pane to that table. Clicking "10 node rows" shows Nodes: players.csv, which also closes the unmatched-row view and brings back the "Show the 1 unmatched row" link (`rounds/r2d3/pilot/T4B/13.png`). Record any participant who clicks them, or who loses the unmatched row that way. "CSV auto", the file's format, sits at the top right of the table pane after a "File settings" label, away from the "a node" / "an edge" toggle (`rounds/r2d1/pilot/T4A/04.png`). To hover the source row with the tool, point at the tree item:
  `--hover "people.csv and messages.csv"` also matches the inspector's heading and takes the first.
- **Other routes:** opening people.csv from "Open project or file..." loads it straight in (12
  nodes, no ties); then Control+O with messages.csv goes through the Data page as an addition
  (not piloted). Grade SD if the end state and the unmatched row are right.
- **S:** the drawing holds both files' rows, the counts are stated, and the unmatched row is named
  (or "one email row names someone not on the staff list"). **SD:** counts right but the unmatched
  row found only after a detour, or not named but counted ("22 of 23"). **F:** `false-done`
  ("everything arrived" with 22 of 23 links), `never-found` (only one file in), wrong counts.
- **After Load the left-out row is on screen in two places on the Data page:** the row "1 row
  left out" in the Sources list, visible with nothing selected and marked with the red-orange
  warning triangle, and the inspectors, which name the row in full (its line, the missing person,
  from, to and the number). The Graph page says nothing about it: only "From 2 files" (drawn small,
  in link blue) and the counts (`rounds/r1d4/pilot/T4B/10.png`). A participant who loads without
  reading the report and then finds the row on the Data page (the list row or the inspector) is S;
  one who says everything arrived is `false-done`. The counts can be read from the Graph page's
  Overview, the source row or the source's inspector. Both inspectors show the left-out row under its own "Left out"
  heading; only the source's inspector also has a "Loaded" section with the whole source's Nodes and Edges, first
  (`rounds/r2d2/pilot/T4A/15.png`, `16.png`). The "1 row left out" inspector holds no counts. Its heading carries the red-orange warning triangle that marks its row in the Sources list, while the source's own inspector keeps the plain document icon (`rounds/r2d4/pilot/T4A/14.png`, `T4B/17.png`, `18.png`; on 2dcea6dd5bba the left-out row's heading had the plain document icon, `rounds/r2d3/pilot/T4A/14.png`). On 8f0d5a6f7791 the screens are `rounds/r2d4/pilot/T4A/` (01.png to 15.png) and `T4B/` (01.png to 18.png), every other value as below. On 2dcea6dd5bba the screens are `rounds/r2d3/pilot/T4A/` (after Load `11.png`, the Data page `12.png`, the hover `13.png`, the "1 row left out" inspector `14.png`, the source's `15.png`) and `T4B/` (after Load `14.png`, the Data page `15.png`, the hover `16.png`, the two inspectors `17.png`, `18.png`).
- **Note:** the people's names are an Attribute, not the label, by default; the drawing shows no names (`rounds/r2d1/pilot/T4A/11.png`), so a participant can check that every person arrived only by the count (Nodes 12; B 10), not by name. The left-out row names its sender only by id (p11, Kemi Bello in people.csv; B s04, Dina Moss): either the id or the looked-up name is right. The emails (and passes) column also comes in as an Attribute, with "Weight: none (each
  edge counts 1)", and nothing on the import page says how to make it the weight
  (`rounds/r1d3/pilot/T4A/06.png`). Neither is part of the task; record any participant who stops
  to put names on or to set the weight.

## T17. Only the strong ties

- **A (running club): 19 of the 20 people are still in it, joined by 12 ties.** Theo is the one
  left out (none of his ties reaches 4). Screen: header chip "19 of 20 nodes"; the Filters row
  reads the full name "weight is at least 4" with its checkbox ticked and a second line "20 to 19
  nodes" (the row has no tooltip); after "Add step" the right-hand panel leaves the step editor
  and shows the graph's Overview, which leads with "Nodes showing 19 of 20" and "Edges showing 12
  of 41", then "The counts below are for the whole graph." (`rounds/r1d3/pilot/T17A/07.png`). The
  step's own editor (a click on its row) says "Off" in its header once unticked
  (`rounds/r1d3/pilot/T17A/09.png`); its "On" header was not opened on this build. **Back:**
  untick the step's checkbox ("Apply step: weight is at least 4"); the row still reads "weight is
  at least 4", its second line now "off", and the chip goes (`rounds/r1d3/pilot/T17A/08.png`).
  Undo or deleting the step is equally right.
- **B (Les Miserables): 26 of the 77 characters are still in it, joined by 51 ties.** Chip "26 of
  77 nodes", row "shared_chapters is at least 5" over "77 to 26 nodes", Overview "Nodes showing 26
  of 77", "Edges showing 51 of 254" (`rounds/r1d3/pilot/T17B/07.png`). Back as in A, the row's
  second line "off" (`rounds/r1d3/pilot/T17B/09.png`).
- **The count can be read in three places:** the chip, the Overview's "showing" rows, and the
  Filters row's second line ("20 to 19 nodes": the whole graph, then what is left).
- **Follow-up answers:** A, 5 or more runs together: chip "10 of 20 nodes", row "20 to 10 nodes",
  Overview "Edges showing 5 of 41" (`rounds/r1d3/pilot/T17A/11.png`). B, 8 or more shared
  chapters: chip "17 of 77 nodes", row "77 to 17 nodes", Overview "Nodes showing 17 of 77", "Edges
  showing 19 of 254" (`rounds/r1d3/pilot/T17B/12.png`). The editor of a step that is off labels
  its button "Save and turn on" (`T17A/09.png`, `T17B/10.png`): pressing it saves the new value and
  turns the step back on at once (checkbox ticked, chip back, drawing narrowed), and the button
  says so beforehand. **The trap on this build:** a participant who then ticks the checkbox,
  expecting to switch the step on, switches it off (the same state as `T17A/12.png`,
  `T17B/13.png`: the row reads "off" and the chip goes); only the small "off" on the row's second
  line says so. Expect fewer participants to fall into it now that the button names the effect,
  and record each who does. Reporting the whole club (20; 77) from that state is `read-wrong`,
  unless the participant notices and ticks it again. Every value here held on eaea2a75d95b (A
  `rounds/r2d2/pilot/T17A/07.png`, `08.png`, `09.png`, `11.png`, `12.png`; B
  `T17B-eaea2a75d/07.png`, `08.png`, `09.png`, `11.png`, `12.png`). While an edited value is
  unsaved, the editor's header still names the saved rule ("shared_chapters is at least 5" with 8
  in the Value box, `T17B-eaea2a75d/10.png`).
- **Success path (A):** `--click "Data"`; `--click "weight"` (the attribute row); `--click
"Attribute actions"`; `--click "Filter to..."`; `--click "Value" --type 4`; `--click "Add step"`;
  read the chip; `--click "Apply step: weight is at least 4"`. **Follow-up success path (A),**
  from there: `--click "weight is at least 4"` (the step's row; its editor opens with "Off" in the
  header); `--click "Value" --key Control+a --type 5`; `--click "Save and turn on"`; read the
  chip "10 of 20 nodes" with the checkbox now ticked and the row "20 to 10 nodes"; then `--click
"Apply step: weight is at least 5"` once, which brings the whole club back (row "off", Overview
  Nodes 20, Edges 41). Saving already turned the step on, so the only tick in this path is the one
  that brings everyone back; "edit, then tick to switch it on" turns it off instead (the trap
  above). Walked on this build (`rounds/r1d3/pilot/T17A/09.png` to `12.png`, `T17B/10.png` to
  `13.png`). On B the same with `shared_chapters` and 8. On B the attribute is
  `shared_chapters` and the value 5. The Filters "+" ("Add filter step") then Attribute, "weight",
  "at least", 4 is the other door; in an earlier pilot the attribute list's "weight" option was
  hard to click by name (the tool clicked the tree row), so graders accept either door. Hovering
  the checkbox of a step that is off shows the tooltip "Turn this step on", but only once the
  pointer enters it: right after the untick, with the pointer still there, no tooltip is drawn
  (`rounds/r1d4/pilot/T17A/10.png` against `12.png`; `T17B/09.png` against `11.png`). In the editor
  of a step that is off, "Save and turn on" is enabled before any edit (`T17A/13.png`). After the
  untick the Filters row keeps its gray background although its editor is not open
  (`T17A/09.png`).
- **On the drawing:** in the A setup two pairs of dots sit almost on top of each other (about
  567,758 / 583,753 and 717,745 / 735,744, `rounds/r1d2/pilot/T17A/01.png`), so a count of visible
  dots or ties comes out short (about 11 ties at 4 or more, the 567-583 tie hidden; at 5 or more the 717-735 pair still overlaps heavily: two circles can just be made out but read as one, so a dot count can come out 9 of 10, `rounds/r2d1/pilot/T17A/12.png`). On B two dots near 640,372 and 643,368 sit almost on top of
  each other, so a dot count comes out one short: 25 seen of 26 at 5 or more, 16 of 17 at 8 or
  more (`rounds/r1d4/pilot/T17B/07.png`, `14.png`). The grade does not change (a
  count stated must be right); record the overlap as the cause when a dot count is off by these
  pairs.
- **Known on this build:** after "Add step", and likewise after "Save and turn on", the right-hand panel shows the Overview, not the step
  editor, so adjusting the step means clicking its row (`rounds/r1d3/pilot/T17A/07.png`; after "Save and turn on" on 2dcea6dd5bba, `rounds/r2d3/pilot/T17B/11.png`). Right after a click on a step's checkbox, a hover where the pointer already is shows no tooltip; "Turn this step on" appears only once the pointer leaves and comes back (`rounds/r2d3/pilot/T17B/13.png`, `14.png`). The
  "Attribute actions" menu opens over the inspector's "Table: Edges" value (`T17A/04.png`). While a step is on, both legend titles read "Size: PageRank on 20 nodes" and "Color: PageRank on 20 nodes" (B "on 77 nodes"), and they go back to plain "Size: PageRank" / "Color: PageRank" once it is off; the range is still the whole graph's (A 0.03779 to 0.06394, B 0.003299 to 0.07543), and the only words on screen about whose range it is are "on 20 nodes" (B "on 77 nodes") in the titles (`rounds/r2d1/pilot/T17A/07.png`, `09.png`, `12.png`, `13.png`; `T17B/07.png`, `08.png`, `13.png`, `14.png`). The task needs no rerun: record any participant who reruns PageRank, reads "on 20 nodes" (77) as the number still drawn, or reads the range as a count. The New filter step editor shows no count of
  what the step would keep before "Add step" (`rounds/r2/pilot/T17A/06.png`, `T17B/06.png`). While a step's editor is open its row has the blue selected fill; after an untick with the pointer still on it, the row shows only the gray hover fill (`rounds/r2d1/pilot/T17A/10.png`, `11.png` against `09.png`, `13.png`; `T17B/11.png`, `12.png`). **For graders reading `work.json`:** the
  tool lists a filter step as its id, whether it is on, and its rule ("step-1 off" on the round 2
  build's pilot, `rounds/r2/pilot/T17A/work.json`; the rule was added to the tool's record after it):
  "off" is the step's state, not its name. On fabc16247403 the rule was cut off mid-text and the run named "Influence". On eaea2a75d95b the rule is whole (`step-1 off {"kind":"range","attribute":"data.shared_chapters","min":8,"nodes":"ends"}`) and the run is `pagerank PageRank (label Influence)`; only the layer is still `influence_1 Influence` (`rounds/r2d2/pilot/T17A/work.json`, `T17B-eaea2a75d/work.json`): grade from the screen. The Data page's node Attributes list does not show the PageRank the setup
  computed: A lists only id, B only id and name (`rounds/r1d4/pilot/T17A/03.png`,
  `T17B/02.png`).
- **S:** the drawing narrowed, the count read from the chip, the Overview or the Filters row (19,
  or 26), and the whole graph back. **SD:** narrowed by a wrong first comparison then corrected;
  count read by counting dots. **F:** `wrong-attribute`, the count stated before the drawing
  changed, selection used instead (selected dots highlighted but nothing left out: the chip never
  appears), or never brought back (`work-lost` if the step was deleted with no way back and the
  participant believed the club gone).
- **Wrong reading:** under the "showing" rows the Overview still lists Nodes 20, Edges 41 (B: 77,
  254), Density, Components and Edges per node for the whole graph, below the line that says so.
  20 (or 77) given as "still in it" is `read-wrong`.

## T18. The fewest people in between

- **A (running club): Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, 3 people in between. It is
  the only chain of that length.** Screen: the Path popover, whose Weight box reads "None" under "Each edge counts as 1. A path needs a distance, and "weight" has no meaning set." (the column name in double quotes; the line wraps after "has no", `rounds/r2d1/pilot/T18A/02.png`); in its Weight list "weight (loaded, not read)" is grayed out above the checked "None", and the open list covers that explanation (`08.png`); Escape closes only the list (`09.png`). The popover also has an
  Advanced section whose Method reads "Chosen automatically" (`09.png`). After Find path the run
  opens on its Values: under a "Summary" heading "Path 5 nodes, 4 edges", then "Nodes in order"
  Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with reads Analysis "Shortest path", Ran with the
  date and time ("Oct 9, 5:54:06 AM"), From "Chloe", To "Milo", Follow "All", Weight "None" with "Each edge counts as 1. A path needs a distance, and "weight" has no meaning set." under it at the rows' own size (wrapping into three lines, after "A path" and after ""weight" has", `rounds/r2d2/pilot/T18A/10.png`; on fabc16247403 it was about 9 px), then a collapsed "Advanced run settings" whose Method
  select reads "Dijkstra, chosen automatically" (`rounds/r2/pilot/T18A/10.png`, `11.png`). Made with has no
  Weight select. friends.csv loads directed, so the Path popover has a Follow row between To and
  Weight, "Out | All", with All chosen, and Made with lists "Follow All" between To and Weight; the
  chain is the same (`../tmp/r1-dry4-tool-and-key/T18A/06.png`, `08.png`). Follow Out searches
  only along the arrows (not piloted); running together goes both ways, so a chain reported from
  an Out run that differs from the one above is `meaning-wrong`. The Graph tree row reads "Shortest path 4 hops". The tie numbers are runs together, not distances: a participant who sets them as a distance gets a different chain and is wrong for this task (`meaning-wrong`). The Weight line's "A path needs a distance" can read as a warning that something is missing, though counting ties is right here: record any participant who quotes it as the reason for setting a weight.
- **B (Florentine families): Strozzi, Ridolfi, Medici, Salviati, Pazzi -- 4 marriages, 3
  families in between; the only chain of that length.** Values as in A; Made with From "Strozzi",
  To "Pazzi", Weight "None" with the line "Each edge counts as 1." under it
  (`rounds/r1d3/pilot/T18B/06.png`; `07.png` with Advanced run settings open). The sample has no weight column, so the Path popover shows no
  line under Weight on B (`rounds/r2/pilot/T18B/02.png`). The Florentine graph is undirected, so neither the popover nor Made with
  has a Follow row on B (`../tmp/r1-dry4-tool-and-key/T18B/02.png`, `03.png`).
- **The B walk on 946256efb876** (`rounds/r1d4/pilot/T18B/`, setup `florentine-ranked.txt`, every
  screenshot looked at; `session.log` empty: no script, console or request errors). The start is
  the PageRank run's Style tab, nodes orange and sized by PageRank, no names drawn (`01.png`). `p`
  opens the Shortest path popover over the lower third of the drawing: From "Where the path
  starts", To "Where the path ends", Weight "None" with no line under it, a collapsed Advanced and
  Find path (`02.png`). Typing Strozzi in From lists one option, Strozzi, which covers the To field
  (`03.png`); picking it moves on to To. Typing Pazzi lists one option, which covers the Weight
  field (`04.png`); picking it puts the focus ring on Find path (`05.png`). Find path closes the
  popover and opens the run on its Values: "Path 5 nodes, 4 edges"; Nodes in order Strozzi 1,
  Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; Made with Analysis "Shortest path", Ran "Oct 8,
  10:35:38 PM", From "Strozzi", To "Pazzi", Weight "None" with "Each edge counts as 1." under it,
  and a collapsed Advanced run settings; the Graph tree's new row reads "Shortest path 4 hops"; the
  legend adds "Shortest path" over one black "On the path" swatch; the five nodes and four ties are
  black on the orange drawing (`06.png`). Advanced run settings opens to Method "Dijkstra, chosen
  automatically" (`07.png`). The follow-up: `p` again brings back empty From and To and covers the
  lower end of the drawn path (`08.png`); Peruzzi to Ginori (`09.png`) gives Peruzzi 1, Bischeri 2,
  Guadagni 3, Albizzi 4, Ginori 5, "5 nodes, 4 edges", Ran "10:36:11 PM", and the first chain is
  gone from the drawing and the tree (still one "Shortest path 4 hops" row, `10.png`). The highlighted tie from Peruzzi up to Bischeri passes straight through Castellani, an orange node not on the path (about 713,604, `10.png`), as on 8c4eef4722ac. Main prompt: 5 screenshots after the start
  here because typing and picking were separate steps; the key's count stays 4. Every value agrees
  with the entry above; no difference from 8c4eef4722ac was seen.
- **Follow-up answers:** A, Ben to Nora: Ben, Theo, Ravi, Pia, Nora, 5 nodes, 4 edges; Made with
  From "Ben", To "Nora", Weight "None" (`rounds/r1d3/pilot/T18A/15.png`; the only chain of that
  length, by a count over friends.csv). B, Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi,
  Ginori, 5 nodes, 4 edges (`rounds/r1d3/pilot/T18B/10.png`; agrees with a hand count from the
  marriage list). Ran shows the time of each run (for example "Oct 8, 7:28:19 PM", then "7:28:52
  PM"), so the newer chain can be told by its time changing. The second run replaces the first: the Graph tree keeps one
  "Shortest path 4 hops" row and the first chain is gone, so a participant who wants both must
  note the first. Reopening the popover with p brings back empty From and To.
- **Success path (A):** `--key p` (or a node's menu "Path between...", or Analyze, "Shortest
  path"); `--type Chloe --click "Chloe"` (the option); `--click "To" --type Milo --click "Milo"`;
  `--click "Find path"` (the run opens on its Values; no focus mark can be seen on this build,
  `rounds/r2/pilot/T18A/10.png`). Typing a name
  and pressing Enter in From moves on to To, and Enter in To moves focus to the Find path button;
  a second Enter or a click runs it (`rounds/r1d3/pilot/T18B/05.png`). Picking an option with a
  click also moves focus on: in From to To (`rounds/r1d2/pilot/T18A/04.png`), and in To to the Find
  path button (`rounds/r1d3/pilot/T18A/07.png`), so the `--click "To"` step is harmless but not
  needed. "Advanced run settings" is collapsed after the first run; once opened, it stays open after the next run (`rounds/r1d3/pilot/T18A/11.png`, `15.png`). The popover's own Advanced does not: opened before a run, it is collapsed again when the popover is reopened (`rounds/r2d1/pilot/T18A/07.png`, `12.png`). After a pick or an Enter moves focus to Find path, its focus ring is a faint thin outline, hard to see against the blue button (`rounds/r2d1/pilot/T18B/06.png`, `10.png`). Escape pressed while the Weight list is open closes only the list; the
  popover stays open. The one-item suggestion list under From covers the To label and the top of the To box while it
  is open (the box's placeholder still shows below it); the one under To covers the Weight label and most of its box on B (`rounds/r2d2/pilot/T18B/03.png`, `05.png`), and both run over the pick buttons beside the fields and on A the Follow label and the top half of the Out | All row (`rounds/r2d1/pilot/T18A/05.png`); Enter picks the
  suggestion and moves on. The popover covers the lower third of the drawing; it closes when Find path
  runs (`rounds/r1d4/pilot/T18A/10.png`), so it covers part of a highlighted path only when opened
  again after a run (`12.png`), and picking a node in From or To does not mark it on the drawing. The pick
  buttons beside From and To also take a click on a node, but friends.csv and the Florentine
  sample draw no names by default, so a participant must name the people by typing or put names
  on first.
- **Known on this build:** the legend has one heading, "Shortest path", over one entry, "On the
  path", with a black swatch. On the ranked starts the path's nodes and edges are black and stand
  out from the orange PageRank colors (`rounds/r1d3/pilot/T18A/10.png`, `T18B/06.png`). The
  inspector's icon beside the run's title is the same path icon as the Graph tree row, and after a
  run the tree's "Shortest path 4 hops" row is highlighted (`T18A/10.png`, `T18B/06.png`). Two
  layout overlaps can mislead a reader of the drawing: on A, the path's start, Chloe (about
  716,744), half-covers a larger orange node not on it (about 735,744;
  `rounds/r2/pilot/T18A/10.png`, `11.png`); on B, the highlighted Peruzzi-Bischeri edge passes straight through Castellani, an orange node not on the path (about 713,604; hovering on fabc16247403 put Peruzzi at 697,715, Bischeri at 720,557 and Castellani at 713,604, `rounds/r2d1/pilot/T18B/11.png` to `14.png`). On A's follow-up the highlighted tie from Ravi to Pia (about 507,284 to 692,156) passes straight through Quinn, an orange node not on the path (about 622,209; hovering at 630,218 names Quinn), on 2dcea6dd5bba (`rounds/r2d3/pilot/T18A/16.png`, `17.png`): record any participant who puts Quinn in the Ben to Nora chain. Hovering a node shows no tooltip and no change, though the pointer turns into a hand (`rounds/r2d2/pilot/T18A/12.png`), so the drawing cannot name such a node until names are put on. A chain read off the drawing with
  names on is still SD, as below; record any participant who names a node from such an overlap.
  On A the drawing shows each tie's arrowhead in the file's direction, and the chain runs against
  some of them (Ivan to Chloe, Kofi to Ivan, `T18A/10.png`); the Follow row, "All", is the only
  sign that a path counts ties both ways. Record any participant who doubts the chain for that
  reason.
- **S:** names in order and the count (4 introductions, or 3 people between, or 5 people in the
  chain) read off the Values or the drawing with names on. **SD:** right chain after a detour, or
  read from the highlighted drawing with names put on. **F:** a longer chain, or a guess from the
  drawing with no names on screen (`not-run`).

## T19. Reminders that stay with the work

- **Success state (A): two notes in the Notes place, "Moving away in May; ask who takes over the
  Tuesday run" with the chip "Farah", and "Spring list, checked against the sign-up sheet" with
  the chip "Graph"; the project saved; after closing and reopening, both notes are listed again.**
  (`rounds/r1d4/pilot/T19A/12.png`, the Notes place after reopening from Recent projects.) The
  inspector header of Farah reads "Node 1 note" (the type, then the link), and of the graph "From
  friends.csv 1 note" (B: "From Florentine families 1 note") (`T19A/05.png`, `08.png`).
- **B:** the same with "Check the 1434 return from exile" on "Medici" and "Marriages only; business
  ties are a separate list" on "Graph" (`rounds/r1d4/pilot/T19B/12.png`); its project is saved as
  "Florentine families".
- **Success path (A):** `--key /` `--type Farah` `--key Enter` (selects Farah; focus lands on the
  inspector's title "Farah", but no focus mark is drawn anywhere, so a screenshot cannot show where
  it went, `rounds/r2d2/pilot/T19A/02.png`, `T19B/02.png`); `--key n` (the left column switches from the Graph place to the
  Notes place, with the form "About Farah" at its top, so the filter and run list leave view,
  `rounds/r2/pilot/T19A/03.png`); `--type "<text>"`; `--key Control+Enter` (focus moves to
  the saved note's card, with a white focus ring and no tooltip); `--key Escape --key Escape`
  (nothing selected: the next note is about the graph; the new note's form says "About Graph");
  `--key n`; type; `--key Control+Enter`; `--key Control+s`; `--click Save`; `--reopen`; click the
  project in Recent projects (`--click friends`; in B click-at 624,108, its row: the sample of the
  same name is also on the start screen; `--click "Florentine families"` is refused on every build since fabc16247403 as matching two controls and does nothing (`rounds/r2d2/pilot/T19B/13.png`); `--click "Florentine families#1"`, the Recent projects gridcell, also opens it, `rounds/r2d1/pilot/T19B/10.png`, `11.png`); `--click
"Notes"`. The menus' "Add note" (a node's canvas menu, the inspector "...") and the Notes place
  "+" are the same command.
- **The save:** Control+S on this build opens "Save friends as" and keeps the project in this
  browser ("Saved friends in this browser."); Recent projects lists it after reopening as "friends"
  over "In this browser - 20 nodes - Oct 9, 2026, 5:58 AM" (the date and time of the save)
  (`rounds/r2/pilot/T19A/09.png`, `10.png`, `11.png`). From ddf8b3b63039 on (8f0d5a6f7791 included, `rounds/r2d4/pilot/T19B/12.png`) the start screen's Start
  offers "Open project or file..." (Ctrl+O) and "New from data...", and the Recent projects row has a
  "..." menu; on ddf8b3b63039 the row's subtitle wraps so that "AM" sits alone on a third line (`T19A/10.png`); on fabc16247403 it fits on one line, "In this browser - 20 nodes - Oct 9, 9:54 AM" (B "15 nodes") (`rounds/r2d1/pilot/T19A/10.png`, `T19B/09.png`).
  Opening it shows the toast "Opened friends" (B "Opened Florentine families") (`T19A/11.png`).
  After Save the dialog closes and no focus mark can be seen anywhere; the note card's ring is
  gone (`T19A/09.png`). That save
  alone counts as kept. The start screen also says "This browser can clear projects kept here.
  Save a local copy of any project you need to keep."; a participant who saves a local copy as
  well took no detour. The header's "Local only" label reads the same before and after the save,
  and nothing lasting on screen says the project is saved: only the toast, which fades.
- **S:** both notes, each on the right target, there after reopening, and the participant shows
  the Notes place (or the inspector's "1 note" link). **SD:** one note on the wrong target fixed
  after a detour; or the reminders kept but found only after searching. **F:** `not-kept` (no save,
  or the notes missing after reopening), `wrong-row` (both notes on the graph, or the Farah note
  on another person), a note typed into another field (Find, a label).
- **Screens on this build:** the whole graph stays in view through Find, the notes and the save;
  the drawing shows around and under the Save dialog; after the reopen the PageRank row reads 20
  (B 15) as before (`rounds/r1d3/pilot/T19A/09.png`, `12.png`; `T19B/09.png`, `11.png`). The
  success state is `rounds/r1d3/pilot/T19A/13.png` (B `12.png`); the screenshot numbers depend on
  how the steps are grouped. The Notes place lists the newest note first: the graph's note above
  the person's (`rounds/r1d3/pilot/T19B/07.png`, `12.png`).
- **Watch:** after the reopen, A's drawing is framed as before (about x 450 to 1030, y 110 to 775
  against x 440 to 1040, y 100 to 780, `rounds/r1d4/pilot/T19A/11.png` against `09.png`); B's is
  shifted down (about y 205 to 735 instead of 155 to 735, `rounds/r1d4/pilot/T19B/11.png` against
  `09.png`), with a toast "Opened Florentine families". On d5a3bee20b61 the drawing keeps its shape, framed a little smaller (A) or smaller and lower (B): B's top-left node is at about 569,157 before and 590,216 after, its bottom node at 698,715 and 703,719, with the same nodes beside the same neighbors (`rounds/r2d2/pilot/T19A-old-build-d5a3bee/11.png` against `13.png`; `T19B-old-build-d5a3bee/11.png` against `13.png`), and the same on eaea2a75d95b (`rounds/r2d2/pilot/T19A/11.png` against `13.png`; `T19B/11.png` against `14.png`) and on 2dcea6dd5bba (`rounds/r2d3/pilot/T19A/09.png` against `11.png`; `T19B/09.png` against `12.png`, success state `T19B/13.png`, the ambiguous sample click `T19B/11.png`) and on 8f0d5a6f7791 (`rounds/r2d4/pilot/T19A/09.png` against `11.png`; `T19B/09.png` against `14.png`, success states `T19A/12.png`, `T19B/15.png`, the ambiguous sample click `T19B/13.png`). How the reopened drawing is framed is the open camera question in `../owner-decisions.md`. Colors, sizes and key are unchanged, so
  this is not `work-lost`. The app reopens on the Graph place, not Notes; the only sign of a note
  there is the inspector's small "1 note" link (`T19A/11.png`). After the graph's note is saved,
  its header reads "From friends.csv 1 note", which counts only the graph's notes, not the
  project's two: record any participant who reads it as the Farah note missing. The first Escape
  after a note shows the toast "Selection cleared: 1 node" (`T19A/05.png`, `T19B/05.png`). After a note is saved, the focus ring stays on its card even after Escape Escape has
  cleared the selection and the inspector shows the graph (`rounds/r2d2/pilot/T19A/06.png`,
  `T19B/06.png`); once `n` opens the next note's form, the card has no ring and the form's text
  box holds the focus (`rounds/r2d2/pilot/T19A/07.png`, `T19B/07.png`). On A, Farah (the largest node, PageRank #1, about 733,744) is half-covered by
  a smaller node in front of her (about 716,744), and the yellow selection halo surrounds both, so
  the drawing does not make clear which is selected (`rounds/r1d4/pilot/T19A/02.png` to
  `04.png`). The start screen lists "Florentine families" twice on B, under
  Recent projects (the saved work, "In this browser - 15 nodes" and the date) and under Samples
  (`rounds/r1d3/pilot/T19B/10.png`); nothing on the Recent projects row says it holds the notes,
  and opening the sample shows no notes. Record any participant who reads any of these as lost data. After the reopen the Undo button is grayed (`rounds/r2d1/pilot/T19A/11.png`); record any participant who tries to undo there.

## T20. A number that means "farther"

- **A (bus stops): Depot, Market, Park, Clinic, Harbor -- 14 minutes.** Screen: after Find path
  the run opens on its Values: "Path 5 nodes, 4 edges", "Total minutes 14" (the total's label
  names the weight column), Nodes in order; Made with From "Depot", To "Harbor", Follow "All",
  Weight "minutes (farther)" (`rounds/r2/pilot/T20A/11.png`; on eaea2a75d95b under the headings Summary, Nodes in order and Made with, `rounds/r2d2/pilot/T20A/12.png`); the graph's Overview "Loaded weight
  minutes (farther)", Direction "Directed" (`rounds/r2/pilot/T20A/07.png`). The result screen also
  draws a key at the top left of the canvas, "Shortest path" over a black swatch "On the path"
  (about 310 to 548, 52 to 107), and the route's nodes and edges black and thicker (`11.png`).
  Once the run opens, the Overview is replaced by the run's Values. On fabc16247403 the left panel's title "Graph bus-stops.csv" is a button: a click brings back the graph's inspector with "Loaded weight minutes (farther)" and "Direction Directed", the path still highlighted (`rounds/r2d1/pilot/T20A/12.png`). On ddf8b3b63039 nothing brought it back (`rounds/r2/pilot/T20A/14.png` to `19.png`). So after a run a participant may point to Loaded weight or to Made with's Weight row; both are right.
  **The wrong answers:** read without the minutes, the program counts links and returns Depot,
  Station, Harbor (2 links, 29 minutes) or Depot, School, Harbor (2 links, 21 minutes); both are
  `weight-not-read`.
- **B (hiking trails): Trailhead, Creek, Meadow, Ridge, Summit -- 7.5 km.** Values "Total km 7.5", Made with Weight "km (farther)" (`rounds/r2/pilot/T20B/12.png`; on fabc16247403 `rounds/r2d1/pilot/T20B/13.png`, under the headings Summary, Nodes in order and Made with); Overview "Loaded weight
  km (farther)", Direction "Directed" (`07.png`). Wrong: Trailhead, Pine Fork, Summit (2 links,
  9.0 km), `weight-not-read`. Summit and Creek, both on the route, sit almost on top of each other
  on the drawing (about 755,645 and 790,636), no names are drawn, and hovering a node shows no
  tooltip although the pointer turns into a hand, so the route is read from Nodes in order, not
  from the drawing. The Path popover opens over the lower part of the drawing, where both ends of
  the route are (`rounds/r1d4/pilot/T20B/10.png` to `13.png`). On A no stop names are drawn either,
  and the Park-to-Clinic edge of the highlighted route shows no arrowhead: it ends under the large
  Clinic node (`rounds/r1d4/pilot/T20A/14.png`).
- **Success path (A), the load-time route:** `--click "No thanks"`; `--click "New from data..."`;
  `--click "choose a file..." --upload bus-stops.csv`; open the minutes column's role (click-at
  728,203, the box showing "Attribute"; 728,225 lands on the small type caption under it, "whole
  number" on A and "number" on B, and opens nothing, `rounds/r1d3/pilot/T20A/05.png`, `06.png`);
  the list offers From, To, Weight, Date or time, Edge id and Attribute
  (`rounds/r1d3/pilot/T20B/08.png`); `--click "Weight"` (the summary reads "Weight: minutes" for
  now, B "Weight: km"); a "Higher means" row appears BELOW the row of role boxes, under that
  summary line (about y 263 to 307); the role boxes stay where they are (the minutes box still at
  about 712,203, narrowed to about x 649 to 776 to make room for a clear button at about 797,203,
  "Reset minutes to default", `rounds/r1d4/pilot/T20A/06.png`) and only the preview table moves
  down about 62 px
  (`rounds/r1d3/pilot/T20A/07.png`, `T20B/09.png`); a point from the old layout, 712,287, now
  lands on the Higher means choices; Higher means offers Not set, Closer, Farther
  and Capacity and starts on "Not set" with "Choose what a higher weight means. Until you do, a
  path counts every edge as one step, and PageRank and communities read a higher weight as
  closer." under it; `--click "Farther"` (the line under it changes to "A higher weight means
  farther apart, such as a longer distance or travel time; a path takes the smallest total.", the
  same example whatever the data is; it holds "distance" and "time", which both prompts avoid,
  and "longer", which prompt B uses, so record a participant who quotes it as a possible wording echo; it shows only
  after Farther is chosen, so it cannot lead there; and the summary changes at once to "Weight: minutes
  (farther)", `rounds/r1d4/pilot/T20A/08.png`, `T20B/07.png`); `--click "Load"` (Load is enabled while Higher
  means is still "Not set"); `--key p` (the Path popover's Weight starts on "minutes (farther,
  loaded)", `rounds/r1d3/pilot/T20B/12.png`); From Depot, To Harbor as in T18 (a clicked option
  moves focus on to To, then to Find path); `--click "Find path"` (focus lands on the run's
  title). B: trails.csv, the km column's role box at the same first point, 728,203. The role list opens
  upward over its own box and the column label, so while it is open nothing shows which column is
  being changed (`rounds/r1d4/pilot/T20A/05.png`, `T20B/05.png`). Once the file is chosen,
  Direction, Cancel and Load move from the top bar of the import page (about y 172) to its bottom
  edge (about y 876) (`T20A/03.png` against `04.png`); on the round 2 route there is no top-bar
  state (below). On both halves,
  before a role is chosen the summary reads "Weight: none (each edge counts 1)"
  (`rounds/r1d3/pilot/T20A/04.png`, `T20B/04.png`). Screenshot numbers depend on how the steps are
  grouped; match the screen.
- **Round 2 route (T20), walked on ddf8b3b63039:** "Open project or file..." from the start
  screen sends a data file to the same Data page "New from data..." opens, with the file already
  chosen (a `.graphty` project still opens at once). "Higher means" is not asked up front: it
  appears only once the column's role is set to Weight, and Load is enabled with no role chosen.
  Steps: `--click "No thanks"`; `--click "Open project or file..." --upload bus-stops.csv` (B:
  trails.csv); click-at 728,203 (the minutes column's role box, which spans about y 200 to 222; B the km column's, same point; `rounds/r2d1/pilot/T20A/04.png`);
  `--click "Weight"`; `--click "Farther"`; `--click "Load"`; `--key p`; From Depot; To Harbor;
  `--click "Find path"` -- **10 steps** (walked), one fewer than the success path, since one step
  opens the page and chooses the file. Grade it as the success path: S when it ends right with no
  detour. Its screens: the page is titled "Open as a new graph", its Tables list reads "Edges:
  bus-stops.csv, 17 rows" (B "Edges: trails.csv, 13 rows"), its header "bus-stops: 10 nodes, 17
  edges" (B "trails: 9 nodes, 13 edges"), and Direction ("As the file says"), Cancel and Load sit
  at the bottom from the first screen (`rounds/r2/pilot/T20A/03.png`, `T20B/03.png`). On fabc16247403 they sit at about y 876 on both halves from the first screen, under a status line (B "13 edge rows read; the load makes 9 nodes and 13 edges." at about y 819), and do not move when "Higher means" appears (`rounds/r2d1/pilot/T20B/03.png`, `05.png`, `06.png`); on ddf8b3b63039 B's started at about y 824 and moved down 52 px. Once Higher means appears on B, the preview's last row (line 14) is cut off at the bottom edge while its caption still reads "The first 13 rows of 13" (`rounds/r2d1/pilot/T20B/05.png`). A does the same: "The first 17 rows of 17" with lines 16 and 17 below the pane from the first screen, and line 14 the last, partly visible, once Higher means appears; on eaea2a75d95b a scrollbar is drawn on both halves (`rounds/r2d2/pilot/T20A/03.png` to `06.png`, `T20B/05.png`, `06.png`). On 2dcea6dd5bba the captions read "All 17 rows" (A) and "All 13 rows" (B) with the same rows cut off; B's first screen fits every row (lines 2 to 14) with no scrollbar, which appears only once Higher means pushes the table down (`rounds/r2d3/pilot/T20A/03.png`, `05.png`, `06.png`; `T20B/03.png`, `05.png`, `06.png`). On both halves a row "Each row is" ("a node" / "an edge", "an edge" chosen) sits between the header and the role boxes, at about y 134 to 170; the role boxes are drawn centered at about y 211 (box about y 200 to 222), so 728,203 still opens the role list, Weight's clear button is at about 797,211, and Higher means spans about y 270 to 305 with its helper line at about y 315 (`rounds/r2d3/pilot/T20A/03.png`, `05.png`). A's status line reads "17 edge rows read; the load makes 10 nodes and 17 edges." at about y 819, and on both halves "17 edge rows" (B "13 edge rows") is drawn as a blue link that switches the table shown (as on T4). The status line never mentions the weight; the only confirmation before Load is the summary "Weight: minutes (farther)" higher up (`T20A/06.png`). Picking From or To in the Path popover does not mark that node on the drawing (`rounds/r2d3/pilot/T20A/08.png` to `12.png`). The role
  list, Weight's clear button (about 797,203; 797,211 on 2dcea6dd5bba), Higher means (about y 263 to 307; y 270 to 305 on 2dcea6dd5bba) and the two
  helper lines are as in the success path (`T20A/04.png` to `06.png`; `T20B/04.png` to `06.png`).
- **Escape on the import page:** once a file is chosen, Escape with no list open leaves the "Open
  as a new graph" page as it was, file and roles kept (`../tmp/r1-dry4-tool-and-key/T20B/04.png`
  to `05.png`); Cancel is the way out.
- **"Capacity" under Higher means:** not walked. A participant who chooses it is graded by the
  end state (the route, the total and what Made with says), and graders record the choice.
- **Numbers beside the route:** the Graph tree row reads "Shortest path 4 hops"; 4 given as the
  minutes is `read-wrong`.
- **The "Date or time" role:** the minutes column's role list offers "Date or time" beside
  "Weight" (`rounds/r1d2/pilot/T20A/05.png`). Chosen for minutes, the file loads with no weight and
  the path run counts links: Depot, Station, Harbor, no total, Made with "Weight: none (each edge
  counts 1)" (walked as "Time" on build ca8b3b916c22, `preflight/T20A-time/13.png`). It is
  `weight-not-read`.
- **The per-run route:** on 946256efb876, opened from "Open project or file..." on the start
  screen, the file loads straight in with no weight; on the round 2 build the same command shows
  the Data page first, and a participant who presses Load without giving the column the Weight
  role (Load is enabled; "Higher means" never appears) reaches the same state. Either way there is no "Loaded weight" row in the Overview. (The Data page cannot tell the routes apart: even
  after the load-time route it names no weight, `rounds/r1d2/pilot/T20B/17.png`.) The Path
  popover's Weight list then offers "minutes (farther)", which gives the right route and total
  (`T20A-open/05.png`), but only for that run. **Grade it SD**: the route is right, but the task
  asked that every calculation treat minutes as a length, and the next calculation would not.
- **S:** the load-time route, the right stops in order and the total, and the participant points
  to "Loaded weight minutes (farther)" or Made with's Weight row "minutes (farther)". Made with is
  a list of plain rows (Analysis, Ran, From, To, Follow, Weight, then a collapsed "Advanced run
  settings", `rounds/r1d4/pilot/T20A/14.png`) and holds no Weight select; "minutes
  (farther, loaded)" is shown only in the Path popover's Weight box before the run
  (`rounds/r1d3/pilot/T20B/12.png`, `T20A/14.png`). Pointing to that box before the run also
  counts. The total's label carries the weight column's name, "Total minutes 14" (B "Total km
  7.5") (`rounds/r2/pilot/T20A/11.png`, `T20B/12.png`).
- **Direction on both halves:** "As the file says" loads bus-stops.csv and trails.csv directed
  (Overview "Direction Directed"), so the Path popover has a Follow row, "Out | All", starting on
  All, and Made with lists "Follow All"; with All, direction is ignored (A:
  `rounds/r1d4/pilot/T20A/09.png`, `10.png`, `14.png`; B: `rounds/r1d4/pilot/T20B/08.png`,
  `09.png`, `14.png`). On B the route and total are the same with Follow Out or with the graph set
  undirected, since every trail on it points toward the Summit. **SD:** the
  per-run route; or the load-time route found after a detour. **F:** `weight-not-read` ("Date or
  time" chosen counts here); `read-wrong` (4); Closer chosen (paths then ignore the number: same
  wrong routes); a total added by hand from a wrong route.

## T21. The list was updated

- **A (running club): first before, Farah (PageRank 0.0639); first now, Ava (0.0801).** The rest
  of the new top four: Farah 0.0656, Hana 0.0643, Ivan 0.0614 (on screen 0.06556, 0.06428,
  0.06141). Still 20 people and 41 ties.
  Screens: before, the Values' Top 10 starts "Farah 0.06394" (`rounds/r1d4/pilot/T21A/02.png`);
  Data page titled "Replace: friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41", its confirm
  button labeled "Replace" beside Cancel (`rounds/r2/pilot/T21A/05.png`);
  after Replace the PageRank row carries the out-of-date mark and its inspector the bar "Data changed
  since this run" with "Rerun" (`06.png`); after Rerun the Values' Top 10 starts "Ava 0.08012" and
  the key reads 0.02872 to 0.08012 (`rounds/r2/pilot/T21A/07.png`). The Replace page reads
  "Weight: weight auto" and its "Higher means" shows "Not set" chosen, with the line "Choose what a
  higher weight means. Until you do, a path counts every edge as one step, and PageRank and
  communities read a higher weight as closer." under it, on both halves (`rounds/r2/pilot/T21A/05.png`,
  `T21B/05.png`); nothing there needs choosing for this task. Record any participant who quotes
  "closer" from that line as a reason. The rerun's Made with says "weight (read as closer)" and "Its meaning
  was not set, so this run assumed a higher weight means closer".
- **B (team): 14 people now (and 21 ties; were 12 and 16); first before, Hal (0.1293); first now,
  Di (0.1339), then Hal 0.1305, Ed 0.1245.** "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
  14, 21" (`rounds/r1d3/pilot/T21B/05.png`); after Rerun, Top 10 "Di 0.1339", the key 0.02333 to
  0.1339, the row 14 and "14 of 14 have a value" (`rounds/r1d4/pilot/T21B/07.png`). Walked on d5a3bee20b61 (`rounds/r2d2/pilot/T21B-old-build-d5a3bee/`) and again on eaea2a75d95b with the same values: before, Top 10 "Hal 0.1293" and "12 of 12 have a value" (`rounds/r2d2/pilot/T21B/02.png`); after Rerun, Top 10 "Di 0.1339" and "14 of 14 have a value" (`T21B/07.png`). Between Replace and Rerun the two new people, Mo and Nia, are drawn as small dots in a saturated blue unlike
  every other node, which the key does not explain (two blue dots, since d5a3bee20b61 about as large as the smallest orange ones; their place changes from
  run to run, since the layout is unseeded), and the drawing is laid out again
  (`rounds/r2d2/pilot/T21B/06.png` against `02.png`): the visible sign of the out-of-date run. Record
  any participant who reads the blue as a highlight or a selection.
- **On both halves between Replace and Rerun,** the inspector's histogram, "<n> of <n> have a value"
  with the old range, and the old Top 10 (Farah first; Hal first) stay on screen at full contrast
  with nothing on them marking them out of date. The marks are the "Data changed since this run"
  bar, the row's icon, which changes to a history icon with no words, and the drawing's key, whose
  titles read "Size: PageRank, out of date" and "Color: PageRank, out of date" while it still
  shows the old range (`rounds/r2/pilot/T21A/06.png`, `T21B/06.png`). On B the left panel's
  title changes from "Graph team.csv" to "Graph team-v2.csv" while the project name in the top
  bar stays "team" (`T21B/06.png`). The run's time is shown in its
  subtitle and under Made with ("Ran Oct 8, 4:33:16 PM"), and it changes on Rerun, so the time
  also tells the participant the run was redone.
- **Success path (A):** `--click "Values"` (to read the first name before); `--click "Data"`;
  `--rclick "friends.csv"` (the Sources row; its "..." menu works too); `--click "Replace with
file..." --upload friends-v2.csv`; `--click "Replace"` (the confirm button; it read "Load" on
  946256efb876; the app returns to the Graph page with the
  run's inspector open on its Values, where it was); `--click "Rerun"` (the run's inspector stays
  open through the replacement when it was open before; otherwise `--click "PageRank"`, the run
  row now marked out of date, comes first, and its absence or presence is not a deviation). "First
  before" is read from the Values before the replacement (or from the setup's open run).
- **Round 2 route (T21), walked on ddf8b3b63039:** the source's inspector (shown by a
  left click on the Sources row) has a "..." header menu holding "Edit source..." and "Replace with
  file...", the same items and the same rule as the row's right-click menu (on a graph made of two
  loads neither offers anything, and the inspector draws no "..."; its accessible name is "Source
  actions"). The menu opens with its first item, "Edit source...", highlighted, as every "..." does. Steps: `--click "Values"`; `--click "Data"`; `--click
"friends.csv"` (a left click; the source's inspector opens); the inspector's "..." (its accessible
  name and hover tooltip are both "Source actions", `--click "Source actions"`,
  `rounds/r2/pilot/T21A-menu/05.png`; right after the menu closes, with the pointer still on it,
  the tool printed an empty tooltip, `T21B/11.png`); `--click "Replace with file..." --upload
friends-v2.csv`; `--click "Replace"`; `--click "PageRank"` (after a replacement made from here
  the app opens the Graph inspector, Overview Nodes 20, Edges 41, Direction Directed, Loaded weight
  weight, with no Rerun on screen, `T21A-menu/08.png`; the run row's only sign is its history
  icon); `--click "Rerun"` (`T21A-menu/09.png`, `10.png`) -- **8 steps** (walked), two more than
  the right-click route. The left click on the Sources row also opens a table drawer along the
  bottom of the canvas (Nodes / Edges tabs, "41 edges", "Columns: 3 of 3"; B "21 edges", "In the
  order loaded") that pushes the drawing and its toolbar up and stays open through Replace and
  Rerun (`T21A-menu/04.png` to `10.png`, `T21B/09.png`). The open menu covers the inspector's
  Nodes count. After a replacement the source's inspector still heads its counts "Added" on ddf8b3b63039 (B Nodes 14, Edges 21, `T21B/09.png`; T4 shows the same heading as "Loaded" on fabc16247403, where this route was not walked): record any participant who reads it as the new file added beside
  the old one. Grade it as the success path: S when it ends right with no detour.
  "Edit source..." from this menu leads to the same page on the old file as from the row, with the
  same `stale-read` trap below.
- **Traps on this build:** after Replace, the old colors stay on the drawing and the key keeps the old
  range, under titles marked "out of date" (A 0.03779 to 0.06394; B 0.03273 to 0.1293) until Rerun: reading the top person then is
  `stale-read` (Farah, or Hal on B). The row's right-click menu opens with neither item
  highlighted, with "Edit source..." first, above "Replace with file..."
  (`rounds/r1d3/pilot/T21A/04.png`, `T21B/04.png`); the open menu covers the end of the row's own
  counts and the left end of the drawing key's Color bar, with its minimum value
  (`rounds/r2d2/pilot/T21A/04.png`, `T21B/04.png`). "Edit source..." opens "Replace: friends.csv" on the old file itself ("Was 20 nodes, 41
  edges; now 20, 41"), and its Load keeps 20 nodes and 41 edges and the old run
  (`../tmp/r1-dry4-tool-and-key/T21A-edit/04.png`, `T21A-edit2/02.png`): nothing changed, so a top
  name read after it is the old one (`stale-read` if reported as the new list). Control+O
  with friends-v2.csv goes to the same "Add to" page (not piloted). Opening friends-v2.csv as a new
  project and running PageRank again gives the right name but loses the earlier work: SD at best
  (`work-lost` if the participant claims the work was kept). On B the PageRank row still says 12
  until Rerun.
- **Watch:** on B the replacement lays the drawing out again, so every node moves although the
  run, its colors and its layers stay (`rounds/r1d3/pilot/T21B/06.png`); on A, where the people
  are the same, the drawing keeps its shape and the camera only zooms out a little
  (`T21A/04.png` against `06.png`). Record any participant who reads a moved drawing as lost work.
  On fabc16247403 no reset button is drawn beside the Damping factor box after Replace or after Rerun, since the value is at its default (`rounds/r2d1/pilot/T21A/06.png`, `07.png`; a hover at 1411,838 finds only the box, `09.png`). On ddf8b3b63039 a bare x sat there, near the pointer left on Replace. The Replace page's footer reads "41 edge rows read; the
  load makes 20 nodes and 41 edges." (B "21 edge rows read; the load makes 14 nodes and 21 edges"), the "41 edge rows" (B "21 edge rows") drawn in link blue (`rounds/r2d1/pilot/T21A/05.png`), and a "Direction" select reading "As the file
  says" sits at its bottom left, with Cancel and Replace at the right; nothing on the success
  path needs it (`rounds/r2/pilot/T21A/05.png`, `T21B/05.png`). On both halves its weight line
  reads "Weight: weight auto"; record any participant who stops on it. At rest the Data page's source row shows no "..."
  button; it appears only on hover (`T21A/03.png`).
- **S:** replaced (counts as above), rerun, both names right (B: and 14 people). **SD:** right
  after a detour (an addition undone, a new project), or the rerun found only after a stale read
  that the participant caught. **F:** `stale-read`, `added-not-replaced` left in place, `false-done`.
- **For graders reading `work.json`:** after the replacement it lists the old file (friends.csv;
  team.csv) under "gone" in sources. That is the replacement the task asks for, not `work-lost`:
  the run and all three layers are kept (`rounds/r2/pilot/T21A/work.json`, `T21B/work.json`).

## T22. Make the ones that meet a condition stand out

- **A (bus stops): 3 links take 10 minutes or more -- School to Harbor 12, Station to Harbor 14,
  Depot to Station 15.** Screen: the line under the find box reads "3 edges selected"; inspector
  header "3 edges selected", Summary Edges 3, Selection 3, a "Selected edges" table (Edge, minutes)
  listing School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14; the three lines drawn
  with a blue band on the full map of 10 stops (`rounds/r1d4/pilot/T22A/07.png`; on eaea2a75d95b `rounds/r2d2/pilot/T22A-eaea2a75d/07.png`, not the d5a3bee20b61 walk in `T22A/`), and no filter
  step.
- **B (Les Miserables): 13 ties of 10 or more shared chapters.** Line under the box and inspector
  "13 edges selected", Selection 13, a "Selected edges" table listing the 13 ties with their
  shared_chapters (MmeMagloire--Myriel 10, Thenardier--MmeThenardier 13, Thenardier--Valjean 12,
  Cosette--Valjean 31, Javert--Valjean 17, Marius--Gillenormand 12, Marius--Cosette 21,
  Marius--Valjean 19, Combeferre--Enjolras 15, Courfeyrac--Enjolras 17, Courfeyrac--Combeferre 13,
  Bossuet--Courfeyrac 12, Bossuet--Enjolras 10), all 77 characters still drawn, the 13 ties drawn
  with thick blue bands (`rounds/r1d3/pilot/T22B/06.png`; on eaea2a75d95b `rounds/r2d2/pilot/T22B/07.png`).
- **The count can be read in four places:** the line under the find box (until Escape empties the
  box), the inspector's header or its Summary ("Edges 3"; B "Edges 13"), the Selection layer row in
  the left list (the only "Selection 3" on screen), and the rows of the "Selected edges" table.
- **Success path (A):** `--key /`; `--type "=minutes >= \`10\`"`(a gray line under the box reads
"Rule: press Enter to select matches");`--key Enter`; read the line under the box or the
inspector. B: `--type "=shared_chapters >= \`10\`"`. A bare number (`=minutes >= 10`) is refused with "Put numbers in backticks:" and, on the next line, the participant's own condition with backticks added (A "minutes >= `10`"; B "shared_chapters >= `10`"), in red under the box as it is typed, before Enter (`rounds/r2d1/pilot/T22A/03.png`, `04.png`; `T22B/04.png`; the red line starts at the same place as the gray lines, about x 73, `rounds/r2d2/pilot/T22A-eaea2a75d/04.png`, `T22B/04.png`): a correction after it is not a detour, it is
the path; Enter on a refused rule changes nothing (`T22A/05.png`, `T22B/04.png`). A lone "="
lists the columns a rule can use (A: id as a node column, minutes as an edge column; B: id, name
as node columns, shared_chapters as an edge column; the PageRank values are not listed) above
the layer list, with "Type a rule, such as minutes > `9`" (B: "shared_chapters > `16`",
`rounds/r1d4/pilot/T22A/03.png`, `T22B/02.png`; on B "Type a rule, such as" sits alone and
"shared_chapters > `16`" wraps onto the next line). An accepted rule stays in the box after Enter (with no visible text highlight), and the
line under it reads "3 edges selected" (B "13 edges selected"). A second Enter on the accepted rule
changes nothing and is not a detour. Escape in the box clears the box and keeps the selection; the
line under the box goes with the text, so the count is then read from the inspector or the
Selection layer row (`rounds/r1d3/pilot/T22A/09.png`, `T22B/08.png`). The "=" list's example ("Type a rule, such as minutes > `9`"; B "shared_chapters > `16`") still comes from the data's own column; on B record any participant who uses 16.
- **Round 2 route (T22), walked on ddf8b3b63039:** plain text in the find box that
  matches nothing and that graphty-element reads as a rule once "=" is put in front (accepted, or
  refused only for a bare number) no longer gets only "No match": the line under the box reads "Start with = to select by a value:" and, on its own line in monospace, the participant's own text made into a rule ("=minutes >= `10`"; B "=shared_chapters >= `10`"; typed "shared_chapters > 16", it shows "=shared_chapters > `16`") (`rounds/r2d1/pilot/T22A/10.png`, `T22B/10.png`, `15.png`). The suggestion is not checked: "shared_chapters >= 10x" gets "=shared_chapters >= `10`x", which is then refused ("Not a rule Find can read (at character 25)", `rounds/r2d1/pilot/T22B/12.png`, `13.png`). Text that is no rule (a name with no match)
  still gets "No match". Steps: `--key /`; `--type "minutes >= 10"` (the hint shows); select the
  text and type the rule, `--key Control+a --type "=minutes >= \`10\`"`(B:`=shared_chapters >=
  \`10\``); `--key Enter`-- **4 steps** (walked,`rounds/r2/pilot/T22B/17.png`), one more than the success path. Typing only "=" in front
(`=minutes >= 10`) gets the bare-number refusal next, and its correction adds one step (5).
Following the hint and then the refusal is the path, not a detour: grade S when the end state is
right. Copying the hint's own line whole gives the right rule in one step, so the walked count stays 4. Record whether the participant copied it. A count from 16 is `read-wrong`, which on this build happens only if the participant typed 16. When the line under the box changes from
the two-line hint to the one-line "13 edges selected", the layer rows below move up about 17 px,
so a pointer left on the Selection row then rests on the PageRank row (`T22B/17.png`).
- **Other routes, graded by the end state:** clicking each line with Shift held (A: 3 lines; not
  checked on this build); a color on Everything's edges that separates exactly the 10-or-more ties.
  A filter step ("minutes is at least 10") narrows the drawing to the slow links and their stops
  (not piloted) but hides the rest; turned off again it leaves nothing marked.
- **Known on this build:** the selection's "..." menu offers no way to select the ends of the
  edges (`rounds/r1d2/pilot/T22B/09.png`). It opens with "Neighborhood -- Select a node first"
  disabled. Opened with a click, no item is drawn highlighted (`rounds/r1d4/pilot/T22A/14.png`,
  `T22B/11.png`), so where an Enter would land cannot be seen; opened from the keyboard on an
  earlier build, "Path between..." was highlighted (`rounds/r1d3/pilot/T22B/15.png`; not checked
  on this build). Escape with that menu open
  closes only the menu; the selection stays (`T22B/16.png`). The menu is the "..." at the top right of the inspector, named "Selection
  actions"; `--click "Selection actions"` opens it (`rounds/r1d4/pilot/T22A/14.png`,
  `T22B/13.png`). **Escape with focus outside the find box and no menu
  open clears the whole selection:** after a click on the Selection layer row, or in the
  inspector's header (focus on its Style and Values tabs), one Escape removes the bands and the
  row's count, and the inspector falls back to the graph. On A (focus on the Everything row) a
  toast "Selection cleared: 3 edges" with only a close button shows (`rounds/r2/pilot/T22A/14.png`);
  on B (focus on the Selection row) the same toast, "Selection cleared: 13 edges", showed on fabc16247403 (`rounds/r2d1/pilot/T22B/20.png`; none showed on ddf8b3b63039 or on eaea2a75d95b, `rounds/r2d2/pilot/T22B/15.png`; it shows again on 2dcea6dd5bba, `rounds/r2d3/pilot/T22B/11.png`). The find box keeps whatever text was last
  typed: the accepted rule with "Rule: press Enter to select matches" under it (A), or, if the
  participant retyped the condition without "=", that text with the hint (B), so the box gives no
  sign that nothing is marked (`T22A/14.png`, `T22B/12.png`): a participant who ends that way has nothing marked
  (`not-marked`), unless they run the rule again. The selection is not in the undo history:
  Control+Z then undoes the last style change instead, named only by a toast that fades ("Undid
  changing Size on PageRank."; in the pilot it removed the setup's size by PageRank,
  `rounds/r2/pilot/T22A/15.png`, `T22B/13.png`; Control+Shift+Z restores it); record any participant who loses
  earlier styling that way. Clicking Everything (to put names on, say) keeps the selection:
  Selection still reads 3 (B 13) and the lines stay marked (`T22A/10.png`). After a click on a
  layer row, "/" reaches the find box (`T22A/11.png`, `16.png`). The Selection layer's own panel
  shows Nodes FFD700 at 40% with size 1.45, and Edges 0077BB at 100% with size 2.5, the blue the
  selected ties are drawn in (`T22A/12.png`, `T22B/11.png`). The Everything layer's node color reads
  6366F1 although the PageRank layer above it draws every node orange (`T22A/10.png`). The bus-stops setup draws no
  stop names, so the bands cannot be tied to stop names on the drawing; the "Selected edges" table
  names them. Record where the participant went to find `minutes` or `shared_chapters` (the "=" list, the Data page, an edge's values). Enter on a rule that picks the set already selected shows the count again: with the 3 edges from "=minutes >= `10`" selected, "=minutes > `9`" (the same 3) and Enter gives "3 edges selected" under the box (`rounds/r2d2/pilot/T22A-eaea2a75d/12.png`; B "13 edges selected", `T22B/20.png`; on fabc16247403 it showed no count). After Escape empties the box, focus stays in it, so a "/" pressed to open find again is typed as text, and "/minutes >= 10" gets only "No match" (`rounds/r2d1/pilot/T22A/08.png`, `09.png`).
- **S:** the matching ties marked, everything else still drawn and no filter step on, and the count
  (3; 13) read from the screen. **SD:** the same after a detour (a filter first, then off; a wrong
  comparison corrected; a refused rule retyped; a selection lost to Escape and made again), or the
  count read by counting marked lines. **F:** `hid-the-rest`, `not-marked` (a count from a filter
  with nothing marked at the end, or a selection cleared and not made again), a wrong count,
  `false-done`.
- **Measure:** the route (a rule in the box, Shift-clicks, a color, a filter), and whether the
  participant typed "=" without being shown it anywhere. The design defers a separate dialog
  for selecting by a condition until this task shows the need; graders record every place the
  participant looked for one.

## T23. Who is a step or two away

- **A (running club): 14 people besides Ava** -- Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan,
  Jada, Kofi, Quinn, Ravi, Sana, Theo. Left out: Lena, Milo, Nora, Omar, Pia. Screen: the neighbor list at Hops 2 (with Follow All) is headed "Ava and 14 connections within 2 hops" (`rounds/r2d1/pilot/T23A/06.png`; "Ava's 14 ..." before fabc16247403) with the 14 names
  under it, Selection 15; after "Filter to neighbors" the header chip reads "15 of 20 nodes" and 15
  dots are drawn (`rounds/r1d3/pilot/T23A/06.png`, `07.png`).
- **B (Florentine families): 11 families besides the Medici** -- Acciaiuoli, Albizzi, Barbadori,
  Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni (the Hops 2 list's
  own order, alphabetical). Left out: Peruzzi, Lamberteschi, Bischeri (the sample has 15 families;
  there is no Pucci). Header "Medici and 11 connections within 2 hops" (on 2dcea6dd5bba it wraps onto two lines, "Medici and 11 connections within 2" / "hops", is never cut, and has no tooltip, `rounds/r2d3/pilot/T23B/05.png`, `06.png`; on earlier builds it was cut to "...within 2 ho..." with the whole text in a hover tooltip, `rounds/r2d2/pilot/T23B/10.png`), Selection 12; chip "12 of 15
  nodes"; the Graph inspector then reads "Nodes showing 12 of 15" and "Edges showing 14 of 20"
  (`rounds/r1d3/pilot/T23B/05.png`, `06.png`, `10.png`). The Florentine graph is undirected, so the
  list has no Follow row.
- **Success path (A):** `--key /`; `--type Ava`; `--key Enter` (selects Ava); `--key g` (the list
  opens at Hops 1, headed "Ava and 6 connections", and already sets Selection to 7, Ava and her 6
  ringed, `rounds/r1d3/pilot/T23A/05.png`; screenshot numbers depend on how the steps are grouped,
  so match the screen, not the number); `--click role=radio:2` (the Hops segment, a radio in the
  group "Hops"; a bare "2" also matches the "2" in Dev's row on A; the list then reads "Ava and 14 connections within 2 hops", Selection 15, `../tmp/r1-dry4-tool-and-key/T23A/06.png`);
  `--click "Filter to neighbors"` (`T23A/07.png`). On
  B, type Medici. A node's canvas menu "Neighborhood" and the Degree row's route open the same
  list.
- **Wrong answers:** 6 (one step only: Hops 1, on both datasets); on A, 6 with Follow Out
  (friends.csv loads directed, but running together goes both ways: `meaning-wrong`); 15 or 12
  given as the count is right if the participant says it includes Ava or the Medici. At Hops 1 the header reads "Ava and 6 connections" (B "Medici and 6 connections"), and at Hops 2 it adds the hop count, "Ava and 14 connections within 2 hops" (`rounds/r2d1/pilot/T23A/05.png`, `06.png`; `T23B/04.png`, `05.png`). "Ava and 14" can be read as 14 besides Ava or 14 with her; Selection beside it reads 15. A participant who still reports 14 (11) as direct ties, or who doubts it against
  Degree 6, is recorded; the count itself is right for this task.
- **Other routes:** the Filters section's "+" with Keep "the neighbors of the selection" (not
  checked on this build); selecting the people one by one and counting. Graded by the end state.
- **Known on this build:** typing Ava opens a results list inside the left panel, above the Selection, PageRank and Everything rows (`rounds/r2d1/pilot/T23A/03.png`), headed "Nodes 1" (Ava)
  and "Edges 6" (her six ties); Enter still selects the node (`rounds/r2/pilot/T23A/03.png`,
  `04.png`). After the find box selects Ava (B: the Medici), the drawing does not move; the node
  gets a yellow halo and no visible change of fill (Ava is the smallest dot), and focus lands in
  the inspector with no visible mark (`rounds/r2/pilot/T23A/04.png`, `T23B/04.png`). On A, Hops 1 is a Neighbor / weight table in
  alphabetical order (Ben 3, Chloe 5, Dev 2, Ivan 1, Sana 1, Theo 1), with the focus ring on the
  Hops "1" segment, not on a table row (`rounds/r1d3/pilot/T23A/05.png`), and Hops 2 a plain list
  of names; record any participant who reads the change as another feature. On B (no weights) both
  are plain alphabetical lists; `--click role=radio:2` works on both. "Filter to neighbors" is drawn as
  an outlined button before it is clicked; after the click it stays a filled blue chip, reported
  as pressed. Its tooltip ("Showing only this neighborhood. Press again to show every node" when
  pressed) opens to the left of the button over the canvas edge (about x 1040 to 1220) and covers
  no name in the list (`rounds/r1d4/pilot/T23B/17.png`); right after the click, with the pointer
  still on the button, no tooltip is drawn, and it shows once the pointer leaves and comes back, on
  both halves (`rounds/r2/pilot/T23A/08.png` against `10.png`; `T23B/08.png` against `12.png`). Pressing it again shows every node, removes
  the step from the Filters list (removed, not unticked) and drops the chip (`T23A/12.png`): the
  panel's own way back. The header chip "15 of 20 nodes" (B "12 of 15 nodes"), drawn after a
  filter icon and named "Filter: 15 of 20 nodes" to a screen reader (`--click "15 of 20 nodes"`
  still finds it, `rounds/r2/pilot/T23A/07.png`, `13.png`), has the tooltip
  'Showing only: "within 2 hops of Ava". Click to open Filters, where you can turn it off.'
  (`T23A/08.png`, `T23B/07.png`), and a click on the chip (whose pointer does not change on hover)
  opens the Data page, where the Filters list shows the step in full as "within 2 hops of Ava" over
  "20 to 15 nodes" (B "within 2 hops of Medici" over "15 to 12 nodes") with its checkbox ticked
  (`T23A/11.png`, `T23B/12.png`); the chip's tooltip closes on the click (`rounds/r1d4/pilot/T23A/11.png`, `T23B/10.png`). While
  open, before the click, it covers the left panel's graph heading and the legend's "Size:
  PageRank" title (`T23A/08.png`). After the filter, the PageRank row is marked out of date (a history icon only; "PageRank, out of date" is its accessible name, never on screen; tooltip "Ran on 20 nodes; 15 shown now", B "Ran on 15
  nodes; 12 shown now", the tooltip covering the rail's Notes button; hovering the row's name
  shows no tooltip, only its icon does) and still reads 20 (B 15), though only the drawing
  narrowed; the drawing is not refit, and the legend keeps the whole graph's PageRank range (A
  0.03779 to 0.06394, B 0.03066 to 0.1458) under titles that read "Size: PageRank on 20 nodes" and "Color: PageRank on 20 nodes" (B "on 15 nodes") (`rounds/r2d1/pilot/T23A/07.png`, `T23B/07.png`; "out of date" on ddf8b3b63039). The Data page's node Attributes list only id (B id and name); PageRank
  is not there (`rounds/r2/pilot/T23A/14.png`, `T23B/13.png`). The ranking is not stale for this task: record any participant who reruns it or
  reads the mark as a problem. On B the Graph inspector (the "showing" counts) opened only after a
  click on empty canvas, which also clears the selection and closes the neighbor list
  (`T23B/10.png`); on A two pairs of nodes (about 716,745 / 735,745 and 567,758 / 583,752) sit almost on top of each other and their halos merge, so a count of halos on the drawing can come out one or two short; the counts on screen are unaffected (`rounds/r2d2/pilot/T23A/04.png` to `06.png`). The left panel's graph title ("Graph Florentine families"), a button, also opens it, with the filter and the neighbors' selection kept (`rounds/r2d2/pilot/T23B-old-build-d5a3bee/09.png`). The setup hands over
  with the pointer off the page; on both halves the PageRank row is already highlighted on the
  first screen because the setup's last click selected it, not a hover (`T23B/01.png`). Closing the neighbor list and opening it again for the same node while its 2-hop filter is on (on 2dcea6dd5bba: a click on empty canvas, then `/`, Medici, Enter, `g`) brings it back at Hops 2 ("Medici and 11 connections within 2 hops", Selection 12) with "Filter to neighbors" pressed and its ordinary pressed tooltip, "Showing only this neighborhood. Press again to show every node" (`rounds/r2d3/pilot/T23B/14.png`, `15.png`); pressing it removes the filter and every node comes back (`16.png`). The list and the button describe the same neighborhood. (On eaea2a75d95b it came back at Hops 1 with the button pressed for the 2-hop filter, `rounds/r2d2/pilot/T23B/15.png` to `17.png`.)
- **S:** the count read from the screen and the drawing narrowed to exactly those people and the
  starting one (the chip). **SD:** right after a detour (Hops 1 first, a filter on an attribute
  undone), or counted by hand from the list. **F:** a wrong count, the drawing not narrowed,
  narrowed to the wrong set (one step), `false-done`.

## T24. One tie on the drawing

- **A (running club): Gus and Ivan ran together once (1).** Screen: a click on the line opens the
  edge inspector titled "Gus -> Ivan" (subtitle "Edge", Values tab) with From Gus, To Ivan, weight
  1 under a collapsible "Summary" heading, a gray swatch beside the title, the left panel's
  Selection row 1, and the line drawn with a blue band (`rounds/r1d4/pilot/T24A/03.png`); its menu
  (a three-dot button whose hover tooltip reads "Edge actions", `04.png`) offers "Select
  endpoints" (with no shortcut shown), "Frame selection" and "Add note", with their shortcuts drawn
  as bare letters "F" and "N" at the menu's right edge, the open menu
  covering the inspector's From value and part of the Values tab (`05.png`); on 2dcea6dd5bba a click opens it with no item filled, all three alike (`rounds/r2d3/pilot/T24A/04.png`, `T24B/04.png`; on eaea2a75d95b it opened with "Select endpoints" filled blue, `rounds/r2d2/pilot/T24A/05.png`). After it the blue band is gone (nothing marks the tie itself) and the inspector reads "2
  nodes selected" (subtitle "Selection"), Summary Nodes 2, "Edges joining these nodes 1", the left panel's Selection row
  2, and Gus and Ivan carry yellow halos; their fill keeps its PageRank color (the pixels at their
  centers are the same before and after, `rounds/r2/pilot/T24A/03.png` against `06.png`). The setup
  leaves a two-row key at the top left, "Size: PageRank" and "Color: PageRank", both 0.03779 to
  0.06394 (`rounds/r2/pilot/T24A/01.png`). Over the line the pointer turns into a hand, but the line
  itself does not change and no tooltip opens (`02.png`). On the A drawing the "Hana" label box is
  drawn over the lower half of Ivan's sphere, and the Gus-Ivan line (and its blue band) stops at the
  label's left edge, so the tie seems to end at "Hana"; a second line out of Gus runs to Hana just
  below it; after Select endpoints the label also covers the lower part of Ivan's ring. Chloe's
  label is drawn over Farah's, and Eli's is mostly hidden under Dev's (only "E" shows)
  (`01.png`, `03.png`, `06.png`). Record any participant who reads the tie as Gus to Hana.
- **B (bus stops): 4 minutes.** Inspector "Station -> Stadium" (a gray swatch beside the title,
  subtitle "Edge"), From Station, To Stadium, minutes 4 (under "Summary"), the left panel's Selection row 1
  (`rounds/r1d4/pilot/T24B/02.png`); the edge inspector itself has no count row; the "Stadium" label reads in full, with the selected line's
  band passing behind the label's white box; the button's tooltip "Edge actions" (`03.png`); the
  menu (`04.png`); after Select endpoints, Station and Stadium ringed in yellow, "2 nodes
  selected", Nodes 2, "Edges joining these nodes 1", the left panel's Selection row 2 (`05.png`).
  The open menu covers the inspector's From value ("Station") and the end of the "Values" tab label ("Valu" still shows); the label "From" still shows (`rounds/r2d2/pilot/T24B/04.png`). B was walked on eaea2a75d95b with every screen above, the near miss, the find-box routes and "4" included (`rounds/r2d2/pilot/T24B/01.png` to `09.png`); A likewise (`rounds/r2d2/pilot/T24A/01.png` to `06.png`). After Select endpoints the blue band on the Station-Stadium line is gone, so nothing marks the tie itself (`06.png`). Walked again on 2dcea6dd5bba (`rounds/r2d3/pilot/T24A/01.png` to `05.png`, `T24B/01.png` to `12.png`). On B a click on a node's drawn name (726,182, inside the "Stadium" label) selects that stop and opens its node inspector (id Stadium, Degree 3, PageRank 0.08953, #4 of 10); with Station and Stadium already selected, the plain click drops the selection to Stadium alone, Station loses its ring and the Selection row reads 1 (`rounds/r2d4/pilot/T24B/12.png`). Record any participant who clicks a name after Select endpoints and ends with one stop selected. On 2dcea6dd5bba the same click counted as empty canvas and changed nothing (`rounds/r2d3/pilot/T24B/11.png`). B's key reads "Size: PageRank" and "Color: PageRank", both 0.04282 to 0.3273 (`rounds/r2d4/pilot/T24B/01.png`). Searching the tie's title "Station -> Stadium" lists the tie with no "minutes: 4" line under it (`T24B/08.png`), unlike searching "4" (`06.png`); the minutes are read once the tie is opened.
- **Success path (A):** `--click-at 755,586` (the middle of the Gus-Ivan line on the pilot's
  drawing; the tool prints `edge with id "13"`); read the inspector; `--click "Edge actions"`;
  `--click "Select endpoints"`. B: `--click-at 762,145` (on the plainly visible part of the Station-Stadium line, `rounds/r2d3/pilot/T24B/12.png`; the earlier point 752,170 lies on the top edge of the white "Stadium" label and, on a build where names take clicks, picks Stadium instead; the middle of the Station-Stadium line,
  which runs from Station at about 777,117 to Stadium at about 726,220, on the ranked start
  `bus-stops-ranked-names.txt`; the tool prints `edge with id "15"`,
  `rounds/r2/pilot/T24B/02.png`), then the same. The earlier point 753,258 lands on empty canvas
  with no near-miss help (`rounds/r1d1/pilot/T24B/02.png`). With nothing selected it changes
  nothing on screen; after Select endpoints the same miss clears the two-node selection with no
  notice and the inspector switches to the graph's Overview (Nodes 10, Edges 17)
  (`rounds/r2/pilot/T24B/11.png`). A participant who ends that way has nothing selected: graded as
  fewer than the two. After the line
  click the Selection row reads 1 and the inspector opens on its Values; the Summary counts after
  Select endpoints are the same on B as on A. Both T24 setups (the names setups) end with the
  Everything inspector open (Style tab); the line click does not need it closed (no Escape first).
- **Other routes, graded by the end state:** typing a name in the find box lists that node and
  its ties (B: "Stadium" lists the node and School -> Stadium, Stadium -> Harbor and Station ->
  Stadium, `rounds/r1d3/pilot/T24B/06.png`; A not re-walked), and typing the inspector's title
  ("Station -> Stadium") finds exactly that tie (`07.png`). Typing the number lists ties too: on
  B, "4" lists the four ties of 4 minutes (Depot -> Market, Park -> Clinic, Station -> Stadium,
  Museum -> Library), each with "minutes: 4", and "Select where minutes is 4 (4)" (`08.png`).
  Tie titles in the list use "->", as the inspector does. A tie opened from there shows the same
  inspector, and is not a detour. Selecting Gus and then Ivan with Shift held is another
  route (S if both and only both are selected).
- **Known on this build:** the title's arrow is the file's direction, not a fact about the bus.
  The app's words here are "Edge", "Select endpoints" and "Edges joining these nodes", which the
  prompt avoids on purpose; record how the participant got from "the two on this tie" to "Select
  endpoints". On the start, the Everything inspector shows Fill Color 6366F1 (a purple swatch)
  while the PageRank layer above it draws every node orange (`rounds/r2/pilot/T24B/01.png`).
- **S:** the number (1; 4) read from the screen, and exactly the two ends selected at the end.
  **SD:** right after a detour (a missed click on the line, a wrong tie opened first), or the two
  selected one at a time after the ends command was not found. **F:** a wrong number (another tie
  read), more or fewer than the two selected, the number guessed from the line's look, `false-done`.
- **Measure:** whether the participant clicked the line itself, and how many tries the click
  took (a 1-pixel line is a small target).

## T12R. One person and who they are tied to, for a returning user

Graded with tier 1's key (`../answers.md`, T12): the same names, counts and grades. What differs from the ranked starts, walked on both halves on fabc16247403 (`rounds/r2d1/pilot/T12RA/`, `T12RB/`) and A again on eaea2a75d95b (`rounds/r2d2/pilot/T12RA/`, every screen below matching; the 5-step path landed on the first try with no script, console or request errors), and both halves again on 8f0d5a6f7791 (`rounds/r2d4/pilot/T12RA/`, `T12RB/`), where the path is 4 steps (below). An older citation is kept only where this build shows the same screen:

- **The path is 4 steps on 8f0d5a6f7791** (no sample to open): `--key /`; `--type Javert` (B:
  Medici); `--key Enter`; `--click "Degree"` (the row's name is "Degree 17", B "Degree 6"). On this
  build the find list marks its first result, the node, as soon as the name is typed, so Enter
  picks the node (`rounds/r2d4/pilot/T12RA/03.png`, `08.png` to `10.png`; `T12RB/03.png`, `06.png`
  to `08.png`). Earlier builds marked nothing, and the path was 5 steps, with `--key ArrowDown`
  before Enter. On this build ArrowDown moves the mark to the first tie ("Javert -- Valjean", B
  "Acciaiuoli -- Medici") and Enter opens that tie's inspector (`T12RA/04.png`, `05.png`;
  `T12RB/04.png`, `05.png`): the "picks a tie instead of the node" detour below. Tier 1's
  keyboard path (`../answers.md`, T12) is one key shorter on this build for the same reason: no
  Down arrow. Expect returning participants to press Down arrow by habit. A's tie inspector reads
  "shared_chapters 17", the same number as Javert's 17 connections; 17 given from that screen,
  with no names, is not a read of the neighbors. After Enter picks a tie, focus stays in the
  emptied find box (its ring shows), so a following `/` is typed into the box as text ("No match
  for "/Javert"", `T12RA/06.png`, `07.png`) and the box has to be cleared by hand.
  After Enter picks the node, focus is in the inspector at the node's title heading, but no mark is drawn: the
  title is plain white text (`rounds/r1d4/pilot/T12RA/05.png`, `T12RB/05.png`); a keyboard
  user needs Tab to reach the Degree row. Selecting the node does not move the camera.
- **The node's values:** the inspector header reads "Javert / Node" (a node icon and a color
  swatch beside it) with "Style" and "Values" tabs, Values chosen. The "Summary" section holds id,
  name and the Degree row ("Degree", "17" and a chevron, B "6"); a separate collapsible "Results"
  section below it holds only PageRank "0.0303, #5 of 77" (B "0.1458, #1 of 15") (`T12RA/05.png`,
  `T12RB/05.png`). Either PageRank or the degree is a fact read.
- **The Degree row opens the Neighborhood view:** the panel's header becomes the name over
  "Neighborhood", with a "Back to Javert" control (B "Back to Medici"); below it the heading "Javert and 17 connections" (B "Medici and 6 connections"; `rounds/r2d1/pilot/T12RA/06.png`, `T12RB/06.png`; graders take either this or the older "Javert's 17 connections" wording), then a Hops 1/2/3 switch, then "Filter
  to neighbors" (an outlined button), then the list; the neighbors are selected (Selection 18; B
  7). On both halves the Hops "1" segment (a solid white fill) and the first neighbor (Babet; B Acciaiuoli, a gray fill) look lit at once (`rounds/r2d1/pilot/T12RA/06.png`, `T12RB/06.png`).
  The gray fill is a hover, not focus: the pointer rests where the Degree row was clicked, and the
  first neighbor's row now sits under it; once the pointer moves, only the Hops "1" fill is left (`rounds/r2d1/pilot/T12RA/07.png`, `T12RB/07.png`). A participant who clicked Degree still sees two lit controls until the
  pointer moves. The Neighborhood header keeps the node's icon and color swatch (`rounds/r2d1/pilot/T12RB/06.png` against `05.png`). The `g` shortcut from the node's inspector opens the same view; after it the "Back to Javert" row shows a gray hover fill from the resting pointer while Hops "1" carries a blue focus ring, so two controls look lit at once (`rounds/r2d1/pilot/T12RA/10.png`). On the drawing
  the person asked about wears the same yellow glow as the neighbors. Neither sample is directed,
  so there is no Follow control. "Back to Javert" returns to the Summary (Selection back to 1,
  `T12RA/08.png`, `T12RB/08.png`); after it no focus mark can be seen (not checked with a screen
  reader). The tooltip of "Filter to neighbors" ("Hide every node outside this neighborhood") opens to
  the left of the button over the canvas edge and hides no name (`rounds/r1d4/pilot/T12RA/09.png`,
  `T12RB/09.png`). A screen reader reads each Hops segment twice (radio "1", then the text "1")
  and runs the heading into the group label ("Javert's 17 connections Hops" on 946256efb876; not rechecked on fabc16247403, where the heading reads "Javert and 17 connections").
- **The find box lists ties too:** typing "Medici" lists the node under "Nodes 1" and its six ties
  under "Edges 6" ("Acciaiuoli -- Medici", "Medici -- Barbadori", and so on,
  `rounds/r1d3/pilot/T12RB/03.png`). Typing "Javert" shows him and 6 of his 17 ties in view under
  the heading "Edges 17", with a scrollbar at the list's right edge, so the screen shows that more
  ties exist (`rounds/r1d3/pilot/T12RA/03.png`). Typing "Medici" draws a scrollbar too, with a longer
  thumb: below the six ties the list also holds a "Values" group ("Select where name is Medici"),
  so it does not fit either (`rounds/r2d2/pilot/T12RB-old-build-d5a3bee/02.png`; Javert's shorter thumb,
  `rounds/r2d2/pilot/T12RA/02.png`). Scrolled to its end, the list shows a "Values" heading with "Select where name is Javert (1)"
  below the 17 ties (`rounds/r1d4/pilot/T12RA/13.png`). Reading the neighbors from
  that list of ties is graded as tier 1's key grades neighbors read from the ties (SD); 6 given as
  Javert's ties from that list is a wrong count, and 17 read from the "Edges 17" heading is the
  right one. A participant who picks a tie instead of the node by mistake has taken a detour. The find box empties itself after Enter (`rounds/r2d1/pilot/T12RB/05.png`), so going back to the list of ties means typing the name again.
- **Both setups end on the PageRank inspector (Style tab), not on Everything**
  (`rounds/r1d2/pilot/T12RA/01.png`), as every ranked setup does; it does not change this task.
- **The ranked starts draw no names,** so the dots cannot be matched to names on the drawing: the
  names come from the list, and a route by clicking dots one at a time is not workable by name.
