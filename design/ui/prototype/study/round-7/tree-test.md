# Round 7 tree test: the refined B navigation

This tests where people look for things with no visual design: a participant reads only the text
outline in `tree.md` (this folder), opens one level at a time, and picks the place where they
would do the job. `tree.md` holds the outline and nothing else, so no prompt, answer or score can
reach a session. The outline is the clickable refined B skeleton as a participant sees it: the
header (main menu, project-name menu), the rail (Graph, Data, Views, Notes, Assistant), the Data
page, the canvas's right-click menus, the toolbar's tooltip names, the selection bar, the
inspector's tabs and sections, and the table.

Every participant is simulated from the persona files in `../personas/`. Sixteen simulated
participants are far below the 50 or more a real tree test wants, and they share blind spots: a
failed task is a strong signal and a passed task a weak one. Every table of results says so beside
its numbers.

**Scoring.** Correct means the participant's final pick is one of the locations listed for that
task. Direct means correct with no backtracking (no level opened and then left). The bar for this
round is 70 percent direct on every task. Each answer file records the path taken, every level
opened and left, the final pick, and a confidence rating from 1 to 7.

**Order.** Tasks are given in a different random order to each participant; the order is recorded
in the answer file.

**Wording.** Each prompt states a goal in the participant's own words. None uses join, source,
attribute, layer, JSON, path, array or field, and none reuses a label the outline shows at the
place it points to. Domain words follow the persona: a prompt says "accounts" to the fraud and
alert personas, "genes" or "proteins" to the biology personas, "hosts" to the security persona,
and "people" or "characters" to everyone else. The facilitator swaps only those nouns.

## The tasks

Each task names the placement it tests (from the refined B specification, sections 2.2 to 2.4,
4, 5.3, 9, 10 and 11, and the decision log), its correct locations, and the skeleton route each
location stands for.

### Tree 1. The ones everything passes through

Prompt: "You want to know which people the network depends on to get from one group to another --
the go-betweens. Where would you go to work that out?"

Tests: running an analysis from the toolbar's Analyze popover, with no Algorithms place on the
rail (spec 2.2).

Correct:
- Toolbar > Analyze (Shift+A), any heading inside it -- `analyze-popover/open`
- Canvas > Right-click on a node > Analyze... -- `context-menus/node`, which opens `analyze-popover/scoped`
- Toolbar > Quick actions (Ctrl+K) -- `commands-and-search/quick-actions-results`

### Tree 2. Why a colleague cared about one cluster

Prompt: "A colleague told you they wrote down why one cluster of people mattered to them. Where
would you look to read what they wrote?"

Tests: notes as their own rail place, not rows in the tree, with note counts on rows (spec 2.1).

Correct:
- Rail > Notes, its list of notes -- `notes-place/all`
- Rail > Graph > Find rows and notes -- `graph-place/find`
- Rail > Graph > the list of rows > A grouping (a run), opening to its groups (a group row's note count) -- `inspector-group-set-path-row/notes`

### Tree 3. A figure for Friday

Prompt: "You need a picture of the network as it looks right now, to paste into Friday's slides.
Where do you go?"

Tests: Export... in the project-name menu, with no Export button or rail place (owner decision;
spec 9 and 10.2).

Correct:
- Header > Project name > Export... > Image -- `export-dialog/image`

### Tree 4. The lab's color scheme on your data

Prompt: "A colleague emailed you their lab's colors and settings, saved from their own copy of
graphty, with none of their data in it. Where would you put them to use on the network you have
open?"

Tests: Apply recipe or style file... in the project-name menu; round 6 decided every file intake
recognizes a recipe, so Open... and Sources + also count (decision log, Round 6, "Replace and
recipe").

Correct:
- Header > Project name > Apply recipe or style file... -- `recipe-apply/binding`
- Header > Main menu > Open... -- `main-menu/open-file`
- Rail > Data > Sources (+ adds data) -- `data-page/entries` (the Data page, which hands a recipe to the same dialog)

Reported both ways: the correct rate with all three, and with the project-name menu alone, so the
round can say whether File-style doors carry the job.

### Tree 5. What it looked like before Tuesday

Prompt: "Someone changed things in this project on Tuesday. Where do you see what the project
looked like before that, and what was done since?"

Tests: Version history in the project-name menu as the one home of data versions (spec 9).

Correct:
- Header > Project name > Version history -- `full-canvas-modes/version-history`

### Tree 6. Only the big ones count

Prompt: "From now on you want every number and every drawing to leave out the small transfers
(or small interactions) and count only the large ones. Where do you set that up?"

Tests: filters belong with the data, in the Data place, and the header chip opens them (owner;
spec 2.4 and 7).

Correct:
- Rail > Data > Filters (+ adds a step) -- `data-place/new-step`
- Header > Full graph (filter) -- `data-place/empty-filters`

### Tree 7. A bigger number means a closer tie

Prompt: "In your door-swipe spreadsheet, a person and a building that appear together 40 times
should be treated as more tightly tied than a pair that appears once, in every analysis from now on.
Where do you tell graphty that?"

Tests: weight chosen when the data is loaded, as a column's role on the Data page (owner,
2026-09-30; spec 2.4 and 11.3). Round 6's tree had a per-run answer here; this is the moved key.

Correct:
- The data page > The chosen table > Each column's role > Weight -- `data-page/entries-pair`
- Rail > Data > Sources > Each file > Edit source... > (the column's role) Weight -- `data-page/edit-entries`

### Tree 8. Untangle the drawing

Prompt: "The drawing is a tangle. You want to try a different way of arranging it. Where do you
go?"

Tests: the layout method as a property of the graph, in the inspector's Style tab when nothing is
selected; Re-run layout in the canvas menu (spec 2.3 and 5.3).

Correct:
- Inspector > Style tab > Layout (when nothing is selected) > Method -- `inspector-nothing-selected/layout-method`
- Canvas > Right-click on empty canvas > Re-run layout or Reshuffle layout seed -- `context-menus/canvas`

### Tree 9. The angle you want to show again

Prompt: "You turned the drawing to an angle that shows the story well. You want to come back to
exactly this angle on Monday and show it to your manager. Where do you go?"

Tests: saved views in the Views place and the View flyout; no camera button of its own (spec 2.3
and 4.1).

Correct:
- Rail > Views > Save view (+) -- `views-place/saving`
- Toolbar > View > Save view -- `view-flyout/3d`

### Tree 10. Did the groups change between months?

Prompt: "You have last month's and this month's network in the same project. Where do you see how
far the groups of people moved between the two?"

Tests: Compare graphs... in the graph switcher and Compare with another row... on a row (spec 9
and 10.3).

Correct:
- Rail > Graph > Graph switcher > Compare graphs... -- `graphs-switcher/many`, then `full-canvas-modes/comparison`
- Rail > Graph > A row's right-click menu > Compare with another row... (on the grouping) -- `context-menus/run-row`

### Tree 11. Everyone matching a rule

Prompt: "You want to pick out, at once, every person who matches a rule you can type, such as
everyone in one country with a high score. Where do you go?"

Tests: Select where... in the main menu, with no Select tool on the toolbar (spec 2.3 and 10.1).

Correct:
- Header > Main menu > Select where... -- `select-where/where`
- Rail > Data > Attributes > An attribute's menu > Create set where this is... -- `select-where/attribute`

### Tree 12. What leaves my computer

Prompt: "Your IT department asks what, if anything, this program sends back to its makers. Where
do you check, and change it?"

Tests: the privacy chip in the header and Settings > Privacy (owner, 2026-09-29; spec 9 and 11.2).

Correct:
- Header > Local only (privacy) -- `settings/privacy`
- Header > Main menu > Settings... > Privacy -- `settings/privacy`

### Tree 13. Next month's numbers, same analysis

Prompt: "April's export has arrived. You want everything you built on March -- the groups, the
rankings, the colors -- to run again on April's numbers in place of March's. Where do you start?"

Tests: Replace with file... on the source row in Data > Sources (spec 15, top task 12).

Correct:
- Rail > Data > Sources > Each file or address > Replace with file... -- `data-page/replace`
- Toolbar > Quick actions -- `commands-and-search/quick-actions` (typing the job)

### Tree 14. Names over the dots

Prompt: "You want each person's name written next to them in the drawing, and their department
written under it. Where do you set that up?"

Tests: label lines on a row's Style tab that start empty, and Label by on an attribute (owner,
2026-09-30; spec 16.6).

Correct:
- Inspector > Style tab > Label (+ adds a label line) -- `inspector-group-set-path-row/label-empty`
- Rail > Data > Attributes > An attribute's menu > Label by -- `context-menus/attribute`

### Tree 15. Out of sight, but still counted

Prompt: "Three people clutter the drawing. You want them out of sight for now, but you still want
every count and ranking to include them. Where do you do that?"

Tests: Hide on canvas (drawing only) kept apart from a filter step (changes what is computed)
(owner, 2026-09-30; spec 2.3 and 3.6).

Correct:
- Selection bar > Hide on canvas -- `selection-bar/hidden`
- Canvas > Right-click on a node > Hide on canvas -- `context-menus/node`

Counted as a wrong answer that matters: Rail > Data > Filters (it removes them from every count).

### Tree 16. Numbers that came in as words

Prompt: "Your scores came in as words, so graphty will not let you size people by them.
Where do you tell it they are numbers?"

Tests: Read as on an attribute (Data > Attributes and the attribute's inspector); roles stay on
the Data page (spec 5.2 and 7).

Correct:
- Rail > Data > Attributes > An attribute's menu > Read as... -- `inspector-attribute-and-filter-step/attribute`
- The data page > The chosen table > Each column's role (the column's type) -- `data-page/edit-source`

## Placements and the tasks that test them

| Placement (provisional unless the owner decided it) | Who decided | Task |
|---|---|---|
| No Algorithms place; Analyze in the toolbar | studio | 1 |
| Notes are a rail place, not tree rows | studio | 2 |
| Export... in the project-name menu | owner | 3 |
| Apply recipe or style file... in the project-name menu; every file door recognizes a recipe | studio | 4 |
| Version history in the project-name menu | studio | 5 |
| Filters with the data, opened by the header chip | owner (filters with the data); studio (the chip) | 6 |
| Weight chosen on the Data page at load | owner | 7 |
| Layout method on the graph's inspector; Re-run in the canvas menu | studio | 8 |
| Saved views in the Views place and the View flyout | studio | 9 |
| Compare graphs... in the switcher; Compare with... on a row | studio | 10 |
| Select where... in the main menu | studio | 11 |
| The privacy chip and Settings > Privacy | owner (opt-in); studio (the chip) | 12 |
| Replace with file... on a source row | studio | 13 |
| Label lines on a row's Style tab, starting empty | owner | 14 |
| Hide (eye, Hide on canvas) apart from filters | owner | 15 |
| Read as on the attribute | studio | 16 |

Not testable as a tree: the comparison of a toolbar Analyze against a rail-place Analyze that the
specification proposes (2.2). The skeleton draws only the toolbar build, so the round reports
first-click and session evidence on the toolbar build alone.
