# Session: Analyst Alex -- pick flagged GB accounts and keep them as a named list

Task as given: "Pick out every account the monitoring system marked as suspicious that is based in
Great Britain, all at once, and keep them as a named list you can come back to. The data on screen
is a sample: one month of card and bank transfers between accounts."

Start screen: shots/tasks/t10-transactions/01.png. Renders are in
tmp/round-7-sessions/t10-transactions--analyst-alex/. All commands run from design/ui/prototype
with `D=tmp/round-7-sessions/t10-transactions--analyst-alex` (absolute path in practice).

Outcome: GAVE UP. No account was ever selected; no list was saved.

## Think-aloud

**01 (start).** "3,000 accounts, 9,113 transfers. Counts up top right, fine. I need flagged plus GB.
There's 'Table' at the bottom -- that's where I'd expect to filter by column."

**02** `--click "Table"`
"There's a country column. No flagged column though. 'Columns: 10 of 12', so two are hidden."

**03** `--click "Table" --click "country"`
"Clicking the header just sorted it, BR first. That's Excel behavior, fine, but sorting doesn't
pick anything. There's a small down-arrow on the header."

**04** `--click "Table" --click "Columns: 10 of 12"`
"Okay, 'flagged' and 'riskScore' are ticked, they're just off the right edge. alertRule, alertTime
are hidden. So the data is there."

**05** `--click "Full graph"`
"Funnel at the top, 'Full graph' -- I assumed filter. Clicked it and now it says '812 of 3,000
nodes' and there's a filter 'amount is at least 1,000' switched on. I didn't make that. Was it
already in the file, or did my click just apply it? The picture looks exactly the same, so I can't
tell. A filter hides things; it isn't a list of accounts anyway." (Concern: if I'd built my
selection on top of this I'd have silently lost every flagged GB account under 1,000.)

**06** `--click "Data" --click "flagged"`
"I clicked 'flagged' in the attribute list and the right panel shows 'amount'. That's not what I
clicked."

**07** `--click "Selection"`
"'Selection' row -- but it's just the highlight color for whatever's selected. 'Paints 0 nodes'.
Doesn't tell me how to select."

**08** `--hover "Select"`
"Hovering gave me a tooltip 'Built-in rows keep their names'. Not helpful."

**09** `--click "More"`
"Three-dot menu on the graph: Select all visible, Invert selection, Reselect previous... No
'select where'. So the idea might be: filter it down, then 'Select all visible'. Two tools for one
job, but okay."

**10** `--click "Data" --click "Add filter"`
"New filter step. 'Keep: By an attribute or computed value', top of a computed value, largest
component, k-core. First one."

**11** `... --click "By an attribute or computed value"`
"Field list. accounts: alertRule, alertTime, country, flagged, riskScore. Pick flagged."

**12** `... --click "flagged"`
"The list closed and the right side flipped back to 'amount'. Again. My new step still says 'Kept
all 812 nodes'. I picked flagged twice now and both times I got amount." (The same word 'flagged'
is in the left list and in the dropdown; my click landed on the left one.)

**13** `--click "Views"`
"'Named list you can come back to' -- Views sounds like saved stuff. 'No saved views. Save view.'
But a view is the camera and the picture, I think, not a list of 40 account IDs. Nothing says
otherwise."

**14** `--click "Analyze"`
"Algorithm picker with one-line descriptions -- I like that, actually. 'Search, or say what to
find.' I'd type 'flagged GB' here. Everything listed is a metric, though."

**15** `--click "Analyze" --click "flagged"`
-> nothing on screen is called "flagged". "Not in that list."

**16** `--click "Table" --click "flagged"`
"Back to the table, clicked the flagged header. Sorted 'no' first. Little arrow next to it again."

**17** `... --click "Column menu"` (also tried "flagged menu", "Column options", "Filter": nothing
on screen has those names)
"Hovering the arrow says 'The id column menu' -- the id one, not flagged."

**18** `... --click "The flagged column menu"`, `"flagged column menu"`, `"The country column menu"`,
`"The id column menu"` -> nothing on screen is called any of these; `--hover "flagged" --click
"column menu"` just shows the id tooltip again, no menu opens.
"I can't get the dropdown on flagged or country to open. In Excel this is one click."

**19** `--click "Table" --click "Table options"` (tried "Table menu", "Table actions": nothing)
"Table '...' menu: Time slider, Export table as CSV. No filter."

**20** `--hover "Quick actions"`; **21** `--click "Quick actions"`
"Lightning bolt is 'Quick actions, Ctrl+K'. 'Type a command or a place'. I'd type 'select' and
hope. But I've been at this well past five minutes and I haven't selected one account."

Stopped here.

## Wrap-up

**Did I succeed?** No. I never selected a single account and saved nothing.

**Single Ease Question (1-7):** 2. I found the data quickly (country and flagged are both there),
then lost the rest of the time to: a filter I didn't make that shrank the graph to 812 without
the picture changing; clicking 'flagged' twice and being shown 'amount'; a column dropdown that
wouldn't open on the column I wanted; and no visible "select where flagged = yes and country = GB".

**Would I use this instead of my current tool?** Not for this. For "pick everything matching two
attribute values and save it" I'd export the table as CSV, AutoFilter in Excel, and paste the IDs
-- or do it in pandas in one line. Gephi's filter panel isn't pretty but I'd have it done. What
would change my mind: an Excel-style filter dropdown on the table columns, then "save these as a
list" right there, and a clear sign of which filters are already on when I open a file.

## Commands run (in order)

```
timeout 120 node app-b/study.mjs --try $D/02.png task:t10-transactions --click "Table"
timeout 120 node app-b/study.mjs --try $D/03.png task:t10-transactions --click "Table" --click "country"
timeout 120 node app-b/study.mjs --try $D/04.png task:t10-transactions --click "Table" --click "Columns: 10 of 12"
timeout 120 node app-b/study.mjs --try $D/05.png task:t10-transactions --click "Full graph"
timeout 120 node app-b/study.mjs --try $D/06.png task:t10-transactions --click "Data" --click "flagged"
timeout 120 node app-b/study.mjs --try $D/07.png task:t10-transactions --click "Selection"
timeout 120 node app-b/study.mjs --try $D/08.png task:t10-transactions --hover "Select"
timeout 120 node app-b/study.mjs --try $D/09.png task:t10-transactions --click "More"
timeout 120 node app-b/study.mjs --try $D/10.png task:t10-transactions --click "Data" --click "Add filter"
timeout 120 node app-b/study.mjs --try $D/11.png task:t10-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value"
timeout 120 node app-b/study.mjs --try $D/12.png task:t10-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value" --click "flagged"
timeout 120 node app-b/study.mjs --try $D/13.png task:t10-transactions --click "Views"
timeout 120 node app-b/study.mjs --try $D/14.png task:t10-transactions --click "Analyze"
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --click "Analyze" --click "flagged"   # nothing called "flagged"
timeout 120 node app-b/study.mjs --try $D/16.png task:t10-transactions --click "Table" --click "flagged"
for n in "Column menu" "flagged menu" "Column options" "Filter"; do timeout 120 node app-b/study.mjs --try $D/17.png task:t10-transactions --click "Table" --click "flagged" --click "$n"; done   # only "Column menu" matched
timeout 120 node app-b/study.mjs --try $D/17.png task:t10-transactions --click "Table" --click "flagged" --click "Column menu"
timeout 120 node app-b/study.mjs --try $D/18.png task:t10-transactions --click "Table" --click "The flagged column menu"   # nothing
timeout 120 node app-b/study.mjs --try $D/18.png task:t10-transactions --click "Table" --click "flagged" --click "The flagged column menu"   # nothing
for n in "flagged column menu" "The country column menu"; do timeout 120 node app-b/study.mjs --try $D/18.png task:t10-transactions --click "Table" --click "flagged" --click "$n"; done   # nothing
timeout 120 node app-b/study.mjs --try $D/18.png task:t10-transactions --click "Table" --click "flagged" --click "The id column menu"   # nothing
timeout 120 node app-b/study.mjs --try $D/18.png task:t10-transactions --click "Table" --click "flagged" --hover "flagged" --click "column menu"
for n in "Table menu" "Table actions" "Table options"; do timeout 120 node app-b/study.mjs --try $D/19.png task:t10-transactions --click "Table" --click "$n"; done   # only "Table options" matched
for n in "Actions" "Quick actions" "Select by" "Automations"; do timeout 120 node app-b/study.mjs --try $D/20.png task:t10-transactions --hover "$n"; done
timeout 120 node app-b/study.mjs --try $D/20.png task:t10-transactions --hover "Quick actions"
timeout 120 node app-b/study.mjs --try $D/21.png task:t10-transactions --click "Quick actions"
```
