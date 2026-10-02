# Round 8 tree test: the refined B navigation, first-time jobs first

This tests where people look for things with no visual design. A participant reads only the text
outline in `tree.md` (this folder), opens one level at a time, and picks the place where they
would do the job. `tree.md` holds the outline and nothing else, so no prompt, answer or score can
reach a session. The outline is the clickable refined B skeleton as a participant sees it: the
start screen, the header (main menu, project-name menu), the rail (Graph, Data, Views, Notes,
Assistant), the Data page, the canvas's right-click menus, the toolbar's tooltip names, the
selection bar, the inspector's tabs and sections, and the table.

Every participant is simulated from the persona files in `../personas/`. Twenty-one simulated
participants are far below the 50 or more a real tree test wants, and they share blind spots: a
failed task is a strong signal and a passed task a weak one. Every table of results says so
beside its numbers.

**Who takes it.** All 21 personas of the round. The six first-time personas (explorer-elena,
recipe-recipient, alert-reviewer, class-project-student, nonprofit-operations-analyst,
data-journalist) are reported separately as well as in the total, because the first nine tasks
are a first-time user's core path.

**Scoring.** Correct means the final pick is one of the locations listed for that task. Direct
means correct with no backtracking (no level opened and then left). The bar is 70 percent direct
on every task. Each answer file records the path taken, every level opened and left, the final
pick, and a confidence rating from 1 to 7.

**Order.** Tasks are given in a different random order to each participant; the order is
recorded in the answer file.

**Wording.** Each prompt states a goal in the participant's own words. None uses join, source,
attribute, layer, JSON, path, array or field, and none reuses a label the outline shows at the
place it points to. Domain words follow the persona: "accounts" for the bank personas, "genes" or
"proteins" for the biology personas, "hosts" for the security persona, "people" for everyone
else. The facilitator swaps only those nouns.

## The tasks

### Tree 1. Something to practice on

Prompt: "You have just installed this program and have no data of your own yet. You want
something ready-made to try it on. Where do you go?"

Tests: ready-made data on the start screen (owner, 2026-10-02: first-time users may need sample
data).

Correct:
- Start screen > Samples, any sample -- `start-screen/first-run`

### Tree 2. Your own list, first time

Prompt: "Your list of who is tied to whom is a spreadsheet in your Downloads folder. You have
just opened the program for the first time. Where do you begin to bring it in?"

Tests: the start screen's ways in, and that New from data... and Open project or file... both
reach the one intake (studio, round 7: one File list, one intake).

Correct:
- Start screen > Start > Open project or file... (opens the file picker over this screen) -- `start-screen/first-run`
- Start screen > Start > New from data... -- `data-page/entries`
- Start screen > Start > or drop a file anywhere in this window -- `start-screen/drop-target`

### Tree 3. Who the network leans on

Prompt: "You want to know which people the whole network depends on most. Where would you go to
work that out?"

Tests: running an analysis from the toolbar, with no analysis place on the rail (studio).

Correct:
- Toolbar > Analyze (Shift+A), any heading inside it -- `analyze-popover/open`
- Canvas > Right-click on a node > Analyze... -- `context-menus/node`
- Toolbar > Quick actions (Ctrl+K) -- `commands-and-search/quick-actions-results`

### Tree 4. Names on the drawing

Prompt: "You want each person's name written beside them in the drawing, and their team written
under it. Where do you set that up?"

Tests: one "Add label line" everywhere, starting empty (owner, 2026-09-30; studio, round 7).
Round 7's version of this job had 31 percent direct success.

Correct:
- Inspector > Style tab > Label (+ adds a label line) -- `inspector-group-set-path-row/label-empty`
- Rail > Data > Attributes > An attribute's menu > Add label line -- `inspector-group-set-path-row/label-by`
- Table > A column header's menu > Add label line -- `table-dock/column-menu`

### Tree 5. Untangle it

Prompt: "The drawing is a tangle. You want to try a different way of arranging it. Where do you
go?"

Tests: Layout as its own group on the graph's inspector, opened as a popover from the toolbar
(studio, round 7; round 7's version had 6 percent direct).

Correct:
- Toolbar > Layout > Method -- `toolbar/layout-open`
- Inspector > Layout tab > Method -- `inspector-nothing-selected/layout-method`

Counted correct but reported apart: Canvas > Right-click on empty canvas > Re-run layout or
Reshuffle layout seed (they redo the same arrangement, not a different one).

### Tree 6. A picture for slides

Prompt: "You need a picture of the drawing as it looks now, to paste into tomorrow's slides.
Where do you go?"

Tests: the one File list shown from both the main menu and the project-name menu (studio, round
7; round 7's version had 19 percent direct with the project-name menu alone).

Correct:
- Header > Main menu > Export... -- `export-dialog/image`
- Header > Project name > Export... > Image -- `export-dialog/image`

### Tree 7. The numbers into a spreadsheet

Prompt: "You want the scores the program worked out for every person, in Excel. Where do you
go?"

Tests: data export in the File list and the table's own export (studio).

Correct:
- Header > Main menu > Export... (then Data) -- `export-dialog/data`
- Header > Project name > Export... > Data -- `export-dialog/data`
- Table > Table options > Export table as CSV... -- `table-dock/table-options`

### Tree 8. Pick it up tomorrow

Prompt: "You have done an hour of work and need to stop. Tomorrow you want to carry on exactly
where you are. What do you do now, and where do you go tomorrow?"

Tests: Save in the File list; reopening from the start screen's list and the main menu (studio).
Correct needs both halves.

Correct:
- Today: Header > Project name > Save or Save as..., or Header > Main menu > Save -- `project-menu/save-as`
- Tomorrow: Start screen > Recent projects, or Header > Main menu > Open recent -- `start-screen/returning`, `main-menu/open-recent`

### Tree 9. Only the big ones count

Prompt: "From now on you want every number and every drawing to leave out the small ties and count
only the large ones. Where do you set that up?"

Tests: filters with the data, opened from the header chip too (owner: filters with the data;
studio: the chip). Repeated from round 7 (100 percent direct) as a control.

Correct:
- Rail > Data > Filters (+ adds a step) -- `data-place/new-step`
- Header > Full graph (filter) -- `data-place/empty-filters`

### Tree 10. A colleague's colors

Prompt: "A colleague emailed you the colors and settings their team always uses, saved from
their own copy of the program, with none of their data in it. Where would you put them to use on
the network you have open?"

Tests: Apply recipe or style file... in the File list, now in the main menu too (studio, round 7;
round 7's version had 13 percent direct).

Correct:
- Header > Main menu > Apply recipe or style file... -- `recipe-apply/binding`
- Header > Project name > Apply recipe or style file... -- `recipe-apply/binding`
- Header > Main menu or Project name > Open project or file... -- `main-menu/open-file`

### Tree 11. Everyone who matches a rule

Prompt: "You want to pick out, at once, every person who matches a rule you can type, such as
everyone in one country with a score over 50. Where do you go?"

Tests: Select where... in the main menu; the attribute menu's "Select where <attribute> is..."
naming the attribute; a typed rule in Quick actions (studio, round 7; round 7's version had 6
percent direct).

Correct:
- Header > Main menu > Select where... -- `select-where/where`
- Rail > Data > Attributes > An attribute's menu > Select where (this attribute) is... -- `select-where/attribute`
- Toolbar > Quick actions (typing the rule) -- `commands-and-search/find-rule`

### Tree 12. This week's lines, added to last week's

Prompt: "Last week you brought in a list of badge swipes. This week's swipes arrived as a second
file with the same columns. You want them to sit with last week's, in one list, not opened as a separate
network. Where do you go?"

Tests: Add rows from file... on a loaded table's menu, beside Replace with file... (studio, round
7; it answers a confirmed severity-4 finding).

Correct:
- Rail > Data > Sources > Each file or address > Add rows from file... -- `data-page/add-rows`

Counted as a wrong answer that matters: Replace with file... (it drops last week's lines).

### Tree 13. Next month instead of last

Prompt: "April's export has arrived. You want everything you built on March -- the groups, the
rankings, the colors -- to run again on April's numbers in place of March's. Where do you start?"

Tests: Replace with file... on the source row. Repeated from round 7 (63 percent direct).

Correct:
- Rail > Data > Sources > Each file or address > Replace with file... -- `data-page/replace`

### Tree 14. A bigger count means a closer tie

Prompt: "In your door-swipe spreadsheet, a person and a building that appear together 40 times
should count as more tightly tied than a pair that appears once, in every analysis from now on.
Where do you tell the program that?"

Tests: weight chosen when the data is loaded, including the new "Number of rows per pair" choice
in the Weight picker (owner, 2026-09-30; studio, round 7; round 7's version had 6 percent direct).

Correct:
- The Data page > The chosen table > Weight -- `data-page/entries-pair`
- The Data page > The chosen table > One edge per: Pair -- `data-page/entries-pair`
- Rail > Data > Sources > Each file > Edit source... > (Weight) -- `data-page/edit-entries`

### Tree 15. One coloring by itself

Prompt: "Several results color the drawing at once. You want to see one of them by itself for a
moment, without deleting or changing the others. Where do you do that?"

Tests: the renamed list commands, with "Show only this row" in a row's menu (studio, round 7).

Correct:
- Rail > Graph > A row's right-click menu > Show only this row -- `graph-place/solo`

Counted correct but reported apart: switching off the other rows' eyes one by one.

## Placements and the tasks that test them

| Placement (provisional unless the owner decided it) | Who decided | Task |
|---|---|---|
| Ready-made data on the start screen | owner (sample data for first-time users); studio (its place) | 1 |
| The start screen's ways in, one intake behind them | studio | 2 |
| Analyze in the toolbar, no analysis place on the rail | studio | 3 |
| Label lines start empty; one "Add label line" | owner (empty); studio (one label) | 4 |
| Layout as its own group, a popover from the toolbar | studio | 5 |
| One File list from both menus | studio | 6, 7, 8, 10 |
| Filters with the data, opened by the header chip | owner (filters with the data); studio (the chip) | 9 |
| Select where in the main menu, the attribute menu and a typed rule | studio | 11 |
| Add rows from file... beside Replace with file... | studio | 12, 13 |
| Weight chosen at load, including rows per pair | owner (at load); studio (the choice) | 14 |
| "Remove from list view" and "Show only this row" | studio | 15 |

Not testable as a tree: the selection-cleared notice and its restore slot, and reopening a project
with its saved selection; neither is drawn in the skeleton.
