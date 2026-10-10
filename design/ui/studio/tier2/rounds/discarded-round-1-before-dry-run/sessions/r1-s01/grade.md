# Grade: session r1-s01 -- Dev, bus stops (T20 A), a number that means "farther"

**Grade: SD** (success with difficulty). The route and the total are right: Depot, Market, Park,
Clinic, Harbor, 14 minutes, and the run's Made with reads "Weight: minutes (farther)". But Dev
took the per-run route: the file was opened with "Open project or file...", which loads it with no
weight meaning, and the minutes were chosen only inside this one Shortest path run. The task asked
that every calculation treat more minutes as a longer trip, and the next calculation would not.
The answer key grades this route SD.

Build seen: `16dcf3494700 graphty@0.8.56` (session.json), the frozen build named in the criteria,
at 1440 x 900.

## The answer against the key

- **Route and total (right).** `20.png` and `21.png`: Summary "Path 5 nodes, 4 edges", "Total
  distance 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. Dev checked the sum
  against the edge table sorted by the Shortest path column (4 + 3 + 4 + 3 = 14, `21.png`).
- **Where the program says it used the minutes.** Dev pointed to Made with "Weight: minutes
  (farther)" and the Weight select reading "minutes (farther)" (`21.png`). On the load-time route
  that select reads "minutes (farther, loaded)"; here it does not say "loaded".
- **Not loaded with a meaning.** `04.png`: after Open, the Overview shows Nodes 10, Edges 17,
  Direction Directed, Density, Components, Edges per node, and no "Loaded weight" row. `19.png`:
  the Path popover's Weight starts on "None", with "minutes (farther)" as the only other choice.
- **Not a wrong answer.** Not `weight-not-read` (the route is the minutes route, not Depot,
  Station, Harbor or Depot, School, Harbor); not `read-wrong` (the 14 is the total, not the 4 hops).

## Measures

- **Steps:** 20 `real.mjs` steps after the start (`02.png` to `21.png`). The success path is about
  12 (No thanks, New from data, choose a file, the role box, Weight, Farther, Load, p, From, To,
  Find path). About 1.7x.
- **Wrong turns:** 4.
  1. Opening the file with "Open project or file..." (`04.png`), his habit from the first
     assignment, instead of "New from data...". This is the turn that decided the grade.
  2. Clicking the "Amount" tag on the minutes attribute and then hovering it (`07.png`,
     `08.png`): nothing happens and there is no tooltip.
  3. The attribute's "..." menu (`09.png`): only "Filter to..." and "Show in table".
  4. The source row "bus-stops.csv" (`10.png`): it reports only "Added: Nodes 10, Edges 17".
  Two aiming slips are not counted as wrong turns, because the tool matched a name the app gives to
  two controls (see problems 5 and 6): "From" took the table's From header (`14.png`), and "Type
  a node's name" took the From box twice, giving "DepotHarbor" (`16.png`).
  A click at 1419,74 on the start screen landed on nothing (`03.png` is identical to `02.png`);
  no state changed.
- **False "done":** none. "I'm done" (`21.png`) is true for the route and the total, which are on
  screen. Dev did not claim that every calculation uses the minutes; he said he did not know and
  guessed they do not ("Weight started at None, so I'd guess the others don't unless I pick it
  each time"), which is correct. truth_on_screen: not applicable.
- **Ease (from the transcript):** 5 of 7.
- **Silent commit (bar 4):** none on the path taken. Find path drew the orange route, the key and
  the run's Values (`20.png`).
- **Numbers that disagree (bar 5):** none. "Total distance 14" matches the four edges in the table.
- **Wrong weight reading without a sign (bar 7b):** no. The run read minutes as farther and said
  so.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and the tool reported
  each ambiguous match.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                       |
| --- | -------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | discoverability    | "Open project or file..." loads a table with a numeric edge column straight onto the canvas and never asks what the number means or says that it was left without a meaning. A returning user's habitual route therefore skips the one setting the task depends on, and nothing on the screen points to "New from data..." as the place to set it.                                                  | `04.png`: drawn at once, Overview has no weight row; transcript: "It didn't ask me anything about the minutes" |
| 2   | 3        | discoverability    | Once a file is loaded, there is no place to give a column its weight meaning. The minutes attribute in the Data place shows two tags, "Amount" and "From the file", that look like chips but do nothing on click and carry no tooltip; its "..." menu holds only "Filter to..." and "Show in table"; the source row shows only what was added. Dev searched all three and gave up.                | `06.png`, `07.png`, `08.png` (tooltip: null), `09.png`, `10.png`                                               |
| 3   | 2        | trust              | The run's Made with line reads "Weight: minutes (farther)" whether the meaning was set at load for every run or chosen for this run only; only the select's "(farther, loaded)" tells them apart, and it is absent here without saying "this run only". Dev offered this line as proof that "the program used the minutes" in the sense the task asked, which it does not show.                    | `21.png` Made with; transcript end: "that's the proof for my instructor"                                       |
| 4   | 2        | wording            | The attribute is tagged "Amount" while the Path popover calls the same column "minutes (farther)". The two words do not obviously say the same thing; "Amount" read to Dev as "more is more", not "more is farther", and made him distrust the column.                                                                                                                                         | `06.png`, `19.png`; transcript: "Amount made me nervous"                                                       |
| 5   | 2        | accessibility-name | The From and To boxes of the Path popover share one placeholder and accessible name, "Type a node's name" (the tool reported two matches each time), and To sits right under From's suggestion list. Bar 8 forbids two reachable controls with the same name. It cost two extra steps and a "DepotHarbor" entry.                                                                                 | `15.png`, `16.png`, `17.png`; tool: `ambiguous: "Type a node's name" matches 2 controls`                       |
| 6   | 1        | accessibility-name | A "From" button (the edge table's column header) and the Path popover's From box are both reachable as "From"; clicking by name sorted the table and closed the popover.                                                                                                                                                                                                                        | `14.png`; tool: `ambiguous: "From" matches 2 controls (button "From", combobox "")`                            |
| 7   | 2        | discoverability    | The Weight select in the Path popover starts on "None" even though the file has one numeric edge column; a user who does not open it gets a link count, and nothing beside "None" says the minutes exist. Dev found the minutes only because he opened the list on purpose.                                                                                                                         | `19.png`                                                                                                       |
| 8   | 1        | wording            | Shortest path's description, "The fewest steps, or the lightest route", uses "lightest" for a cost; Dev "almost didn't trust it" for minutes.                                                                                                                                                                                                                                                    | `12.png`                                                                                                       |
| 9   | 1        | legibility         | No names are drawn on the nodes, so the orange route on the canvas can be read only through the Nodes in order list.                                                                                                                                                                                                                                                                           | `20.png`, `21.png`                                                                                             |

Problems 1 and 2 together are why the task ended SD rather than S: the habitual route skipped the
meaning, and no place after loading could recover it. Neither is severity 4, because the answer Dev
gave was right and he stated his doubt about other calculations rather than claiming them.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
