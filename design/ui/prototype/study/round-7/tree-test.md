# Round 7 tree test: the navigation as it stands after round 6

This tests where people look for things, with no visual design at all: participants see only a
tree of text, open one level at a time, and pick the place where they would do the job. The tree
they read is `tree.md` in this folder, and nothing else: it holds the outline only, so no task,
answer or score can leak into a session.

The tree is the navigation drawn on the gallery today (`screens/navigation.html`, frames "new",
"new-node", "new-results", "new-run", "new-menu", "new-file", "new-prefs", "new-data"), plus the
places the round-6 decisions added (`../decision-log.md`, "Round 6"):

- The rail lists what a project owns: the main menu, Graph, Data, Results, Notes and the
  Assistant. Results is the rail place for runs; the label "Results" was kept after round 6.
- An opened run pins the selected node's line above Top nodes ("Valjean: #3 of 77, show in
  table"); a community run lists its groups, and a row selects its group.
- A style layer made from a run says "From run: <the run>", and that line opens the run.
- A source row in Data states its facts and offers only "Update with new data..."; a column says
  that each run asks what its value means. The Loaded line no longer offers "Change...".
- A path's Members states its count and its sums; tied routes get "Route 1 of 2".
- Every file intake (File > Open..., Add a source, a drop) recognizes a recipe and opens the one
  Apply dialog; Main menu > Recipes > Apply a recipe... stays.
- The right panel with nothing selected holds Background, Layout, the Overview and the Style
  stack, as the frame at rest draws it.
- Preferences holds the Assistant provider, the WebGPU choice and "Usage data", where the first-run
  question's answer is kept.

Every participant is simulated from the persona files in `../personas/`. Sixteen simulated
participants are far below the 50 or more a real tree test wants, and they share blind spots: a
failed task is a strong signal and a passed task a weak one. Every table of results from this test
says so beside its numbers.

## How it runs

- **One tree, all 16 personas.** The label question ("Results" or "Runs") was closed after round 6:
  the label stays "Results". Milestone 7 said every persona would take both trees; that referred to
  the label variant, which is retired, so round 7 runs one tree with every persona (a studio
  decision; the label is not re-tested).
- **Each persona is its own session,** with no memory of any other session and no access to this
  file, the gallery or the earlier rounds' answers. A session that sees this file, answers from
  another persona's answers, or returns no answers is thrown away and run again, never left out.
- **All 16 tasks, in an order shuffled per session.**
- **What is recorded for every task:** each place opened, in order; the final pick; whether the
  participant went back up the tree; confidence from 1 to 7; one sentence in the participant's
  words. Record every first top-level place opened, even on correct paths.

## How it is scored (frozen before the round; not changed after answers are read)

- **Correct:** the final pick is one of the task's correct places.
- **Direct:** correct, reached without going back up the tree.
- **Pass:** on every task, at least 70% correct and at least 55% direct, all 16 personas.
- **Picks counted separately** are listed per task below. Each is wrong or indirect, and each is
  reported with its count.
- **Where the key changed since round 6,** a change in the number is partly a change in the key.
  Tasks 1, 2, 4, 5 and 6 are reported under both keys, the new one for the pass and the round-6
  one beside it.
- **Flagged task 4.** Its new correct places (File > Open..., the project name menu's Open... and
  Data > Sources > Add a source) come from a decided change whose page half is drawn only on the
  protein recipe page (`screens/recipe-apply.html#file-open`, `#add-source`), not on the screens
  of the think-aloud task about a team's colors file. The tree test scores the design as decided,
  so the new key decides the pass. The round-6 key is reported beside it, and if task 4 passes on
  the new key alone, the result says "passes only through the new file routes".
- **Flagged task 13.** "Usage data" under Preferences is where the first-run question says the
  answer is kept ("You can change this any time in Preferences"), but no Preferences screen draws
  it yet. The task tests whether people look there; a pass is a reason to draw it, not proof it
  works.

## Tasks

Written in the participant's words, never in the tree's labels. Tasks 1 to 10 repeat round 6's
wording exactly (round-6 task number in brackets), so each change shows as a difference between
rounds. Tasks 11 to 16 are new: the two top tasks never tested (make the layout readable, combine
sets) and four first-use moments (the usage-data answer, the Assistant, a failed save, a browser
with no WebGPU).

| # | Task (read to the participant) | Correct places | Counted separately |
|---:|---|---|---|
| 1 | [2] Earlier you worked out which characters hold the groups together. Where do you see how Valjean scored and where he places? | Right panel, with a node selected > Results; Results (rail) > An opened run > The selected node's line; Bottom table > Nodes tab, Edges tab, and a tab for each opened run; Bottom table > Search; Bottom table > Column header menu (sort). Round-6 key: the same without the selected node's line | Results (rail) > An opened run > Top nodes (shows Valjean only because he is first) |
| 2 | [3] A colleague wants to repeat an earlier calculation exactly. Where do you find how it was set up? | Results (rail) > Each run; Results (rail) > An opened run > Settings; Results (rail) > An opened run > State line; Right panel, with nothing selected > Style stack > Each layer (its "From run:" line opens the run). Round-6 key: the first three | Any pick in Data > Sources |
| 3 | [5] You are about to find the cheapest route between two accounts. Where do you make sure a bigger transfer counts as more expensive, not less? | Canvas > Floating toolbar > Path (options); Main menu > Selection > Paths between...; Right panel, with a node selected > Header actions (Path to...); Main menu > Algorithms > Path | Data > Sources > Its columns; The loaded file's chip; Right panel, with nothing selected > Overview |
| 4 | [7] A colleague sent you a file of the colors and sizes their team always uses. Where would you bring it into this project? | Main menu > Recipes > Apply a recipe...; Data > Recipes; Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file...; Main menu > File > Open...; Project name menu > Open...; Data > Sources > Add a source (+). Round-6 key: the first three. **Flagged** (above) | Style stack > Add a layer > Empty layer; every visit to Main menu > Recipes that backs out |
| 5 | [11] You have selected the transfers along one route. Where do you see how much money moved along it in total? | Bottom table > Footer; Right panel, with a set, a group or a path selected > Members. Round-6 key: the footer only | Bottom table > Edges tab (sorting single transfers is not a total) |
| 6 | [12] Where do you find out how the biggest group differs from the rest of the network? | Right panel, with a set, a group or a path selected > Compare with the rest; Bottom table > Row menu (compare this group with the rest); Results (rail) > An opened run > Groups (the row selects the group, whose panel holds the comparison). Round-6 key: the first two | Results (rail) > An opened run > Compare with another run... (it lists runs, not the rest of the graph) |
| 7 | [15] One character you care about has no name showing on the drawing, because names are hidden where they would overlap. Where do you make sure that character's name always shows? | Right panel, with a node selected > Show label anyway; Canvas > Legend > The labels line | Right panel, with nothing selected > Style stack (any place in it); Look |
| 8 | [16] Where do you see where money went next after it left one account in early August? | Right panel, with a node selected > Header actions (Neighbors: direction, from a date); Main menu > Selection > Neighbors... | Filter chip > Add a step; Bottom table > Column header menu (filter to...); Data > Versions |
| 9 | [8] Next month's transfers file has arrived. Where do you bring it in so that everything you set up carries over? | Main menu > File > Update with new data...; Project name menu > Update with new data...; Data > Sources > Update with new data...; The loaded file's chip > Update with new data... | Main menu > File > Open...; Data > Sources > Add a source (+) |
| 10 | [10] Your manager wants the accounts that take in far more money than they send out. Where do you start? | Main menu > Algorithms > Centrality (Weighted degree); Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions; Results (rail) > Run a measure...; Bottom table > Column header menu (new column) | Bottom table > Edges tab |
| 11 | The drawing is one tangled ball and you cannot make out any groups in it. Where do you go to make it easier to read? | Right panel, with nothing selected > Layout; Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions | Right panel, with nothing selected > Style stack (any place in it); Main menu > View > 2D or 3D; Filter chip (any place in it) |
| 12 | You have put aside two lists of accounts. Your manager wants only the accounts that are on the first list and also on the second. Where do you get them? | Graph (rail) > Sets and paths | Filter chip > Add a step (it narrows the view; it keeps no list); Bottom table (any place in it) |
| 13 | When you first opened the app you agreed to let it collect how you use it. You have changed your mind. Where do you take that back? | Main menu > Preferences > Usage data. **Flagged** (above) | Data > Sent and saved (it reports, it does not change the answer); The line under the project name |
| 14 | You would like to ask questions about the network in plain words and get answers back. Where do you set that up? | Main menu > Preferences > Assistant provider; Assistant (rail) | Main menu > Quick actions... (it runs commands; it does not answer questions) |
| 15 | The app has just told you it could not keep your latest changes in this browser. Where do you make sure you have a copy of your work before you close the tab? | Canvas > The one-line notice; Main menu > File > Download project file; Project name menu > Download project file | Main menu > File > Export...; Project name menu > Export...; Data > Export... (each writes an output, not the project); Main menu > File > Version history |
| 16 | A ranking took far longer than on a colleague's computer. Where do you find out whether your browser used the graphics card for it? | Results (rail) > An opened run > State line; Main menu > Preferences > Use WebGPU when available | Results (rail) > An opened run > Settings (the method, not the engine) |

## Placements this covers

Every placement the decision log names as new or provisional after round 6, and the two top tasks
and four first-use moments that were never tree-tested:

| Placement | Tasks |
|---|---|
| Results as the rail place for runs; the selected node's line pinned above Top nodes | 1, 2, 10 |
| A style layer from a run leads back to the run ("From run:") | 2 (and first-click prompt 1) |
| The meaning of a bigger weight is chosen in each run; the Loaded line and the column only describe the data | 3 (and first-click prompt 4) |
| Every file intake recognizes a recipe and opens the one Apply dialog; Recipes > Apply a recipe... stays | 4 (flagged; and first-click prompt 5) |
| A path's Members states its sums; the table footer totals the selection | 5 |
| A community row selects its group; Compare with another run... lists runs, not the rest | 6 |
| Show label anyway on the selected node, and the legend's hidden-labels line | 7 |
| Neighbors with a direction and a from date (a real findability miss kept on purpose) | 8 |
| A source row offers only Update with new data...; the file chip and one File list (regression) | 9 |
| Weighted degree in the algorithm list, Quick actions and the table's New column | 10 |
| Layout in the right panel with nothing selected (top task 7) | 11 |
| Sets and paths as the place to combine kept sets (top task 9) | 12 |
| The usage-data answer kept in Preferences (first use: the opt-in) | 13 (flagged) |
| The Assistant provider in Preferences and the Assistant on the rail (first use: the opt-in) | 14 |
| Download project file after a failed autosave (first use: the first save) | 15 |
| The engine named on a run's state line, and the WebGPU choice in Preferences (first use: no WebGPU) | 16 |

## Known differences between the tree and the drawn screens

Recorded so a miss is not blamed on the wrong cause:

- Two drawings of Preferences exist: a dialog on `screens/navigation.html` (name, theme, Assistant
  provider) and a menu on `screens/preferences.html` (theme, overview, motion, WebGPU, scroll,
  AI provider...). Neither shows "Usage data". The tree lists the union and adds Usage data.
- The right panel with nothing selected is drawn three ways: Overview and Style stack only
  (`screens/navigation.html`), Background, Layout, Overview and Style stack
  (`screens/frame-at-rest.html`), and Graph, Statistics with a Layout row that runs
  (`screens/run-and-read.html#layout`). The tree follows the frame at rest.
- The protein recipe page draws File > Open... and Add a source opening the Apply dialog; the
  April transfers screens used by the team-colors think-aloud task do not.
