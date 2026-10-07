# Session r3-s39 -- Morgan Reyes (screen-reader analyst), task T6 "What did I get?"

Dataset: Les Miserables sample. Start: empty, screen-reader mode (`--sr`). Keyboard only.

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s39 empty --sr`

Heard: `focus: nothing (the page itself)`.

Morgan: "Nothing focused. Fine, that is a fresh page. No title read to me by this tool, so I'll read the page to find out what it is, then Tab."

## Step 1 -- read the page

Command: `--step ... --read`

Heard: button "Main menu"; heading 1 "graphty"; button "Local only"; heading 2 "Start"; "Open project or file... Ctrl+O"; "New from data..."; "Files are read on this computer and never uploaded."; heading 2 "Recent projects"; heading 2 "Samples" with four sample buttons including "Open the Les Miserables sample"; then a usage-data consent block with "Share usage data" and "No thanks".

Morgan: "Headings. Real ones. And it tells me the file stays on my machine without my asking -- that's the first question answered. There's a sample button for Les Miserables. There's also a telemetry question; I'll say no to that, agency rules. I'll Tab to find out the order."

## Steps 2-7 -- learn the tab order

Commands: `--step ... --key Tab` six times.

Heard, in order: button "Main menu"; button "Local only"; button "Open project or file... Ctrl+O"; button "New from data..."; button "Open the Les Miserables sample"; button "Open the Zachary's karate club sample".

Morgan: "Tab order follows reading order. Every button has a name that says what it does. 'Local only' as a button is a bit odd -- a button that is a statement -- but I'll leave it. I went one past Les Miserables; Shift+Tab back to check it reverses, then Enter."

Note: each step took about 20-25 seconds to come back in the tool; not counted against the app.

## Step 8 -- Shift+Tab

Command: `--step ... --key Shift+Tab` -- heard: button "Open the Les Miserables sample".

Morgan: "Reverses cleanly. Enter to open it. I'll ignore the telemetry question for now; it's not blocking."

## Step 9 -- Enter on the sample

Command: `--step ... --key Enter`

Heard: `focus: nothing (the page itself)`; `live: status (polite): "Les Miserables: 77 nodes, 254 edges"`.

Morgan: "Good: it told me the size once. 77 nodes, 254 edges. Not good: focus fell to the page; the button I pressed is gone and I'm nowhere. I'll read the page to see what's there now."

## Step 10 -- read the page after loading

Command: `--step ... --read`

Heard: buttons "Main menu", "Project: Les Miserables", "Undo", "Redo" (disabled), "Local only", "Graph", "Data"; text "Graph Les Miserables"; combobox "Find"; tree items "Selection", "Everything"; "Analyze in the toolbar ( Shift+A ) to add results here"; buttons "Analyze", "Layout", "View", "Quick actions"; "Les Miserables: 77 nodes, 254 edges Graph"; button "From Les Miserables"; button "Graph actions"; tabs "Style", "Values" (selected); button "Collapse Overview" (expanded); then: "Nodes 77 Edges 254 Direction Undirected, from the file: directed 0 Density 0.08681 Components 1 Edges per node 1 to 36, mean 6.597".

Morgan: "There it is, without running anything: 77 nodes, 254 edges, one component, density, degree range 1 to 36, mean 6.597. That answers three of my four questions. One component means every character reaches every other. 'Undirected, from the file: directed 0' -- I take that to mean the file said directed equals zero, so it's treated as undirected. Clunky phrasing but at least it says where the decision came from, which is more than most tools. Complaint: the headings I had on the start page are gone. I heard no heading in that whole read. Now the facts recorded per character and per connection. There's a 'Data' button; that's my guess. Tabbing to it."

## Step 11 -- Tab x6

Command: `--step ... --key Tab` (six times)

Heard: "Main menu", "Project: Les Miserables", "Undo", "Redo disabled", "Local only", "Graph".

Morgan: "Disabled Redo is in the tab order -- acceptable, I'd rather know it exists. 'Graph' and 'Data' read like a view switch. One more Tab, then Enter on Data."

## Step 12 -- Tab

Command: `--step ... --key Tab` -- heard: combobox "Find".

Morgan: "It skipped 'Data'. So Graph and Data are a group with one tab stop, probably arrow keys inside. Nobody told me that -- 'Graph' was read as a plain button, not 'selected' or 'pressed', no 'one of two'. Shift+Tab back and try Right Arrow."

## Step 13 -- Shift+Tab, Right Arrow

Command: `--step ... --key Shift+Tab --key ArrowRight`

Heard: button "Graph", then button "Graph" again. Right Arrow did nothing.

Morgan: "So 'Data' was read to me in browse mode but I cannot reach it with Tab or with arrows. That is a dead end. A button I can hear and cannot press. Fine -- the panel on the other side had a 'Values' tab and an 'Overview'. Maybe the attributes are listed there below the counts. I'll Tab forward into that and read."

## Step 14 -- Tab x10

Command: `--step ... --key Tab` (ten times)

Heard: combobox "Find"; treeitem "Selection"; separator "Resize left panel" value 240; Canvas "Graph drawing"; button "Analyze"; button "From Les Miserables"; button "Graph actions"; tab "Values" selected; button "Collapse Overview" expanded; separator "Resize inspector" value 240.

Morgan: "There's a 'Graph drawing' in the tab order, I'll come back to it. After the Overview there's nothing but a resize handle. So the Overview is all the Values tab has. Shift+Tab back into it and read the region to be sure I'm not missing attribute names."

## Step 15 -- Shift+Tab, read the inspector

Command: `--step ... --key Shift+Tab --read`

Heard: complementary "Inspector": "Graph"; "From Les Miserables"; "Graph actions"; tabs Style / Values; "Collapse Overview"; then the same counts line.

Morgan: "Landmark named 'Inspector', fine. But no list of what's recorded per character or per connection. Counts yes, attributes no. Next: the 'Graph drawing'. If I land on a character it might tell me its fields. Shift+Tab back to it and press an arrow."

## Step 16 -- Shift+Tab x5

Command: `--step ... --key Shift+Tab` (five times) -- ends on: Canvas "Graph drawing".

Morgan: "'Canvas, Graph drawing.' No hint of what keys it takes. Arrow key and listen."

## Step 17 -- Right Arrow on the drawing

Command: `--step ... --key ArrowRight` -- heard: Canvas "Graph drawing", nothing else.

Morgan: "Silent. Try Enter, as I would."

## Step 18 -- Enter on the drawing

Command: `--step ... --key Enter` -- heard: Canvas "Graph drawing", nothing else.

Morgan: "Dead, as expected. 'Image. Image.' Except it says 'canvas'. That's two dead ends: a Data button I can't reach and a drawing that says nothing. Before I fall back to hunting for an export, the question mark for keyboard help."

## Step 19 -- question mark

Command: `--step ... --key "?"` (a first attempt spelled `Shift+Slash` was refused by the tool, not the app) -- heard: button "Close".

Morgan: "Something opened and put me on a Close button. Reading it."

## Step 20 -- read the shortcuts dialog

Command: `--step ... --read`

Heard: dialog "Keyboard shortcuts" with headings per group (Project, Selection, Settings and help, View, Analyze, Graph tree, Data). Under "Data": "Table Shift+T". Also "Quick actions Ctrl+K", "Export... Ctrl+E", "Find /".

Morgan: "This is the good part. Real headings, real list. 'Data -- Table, Shift+T.' That's what I want. Into my keystroke file it goes. Escape out, then Shift+T."

## Step 21 -- Escape

Command: `--step ... --key Escape` -- heard: focus: nothing (the page itself).

Morgan: "Focus dropped again. I was on the drawing; now I'm on nothing. Second time it's lost my place. Shift+T anyway."

## Step 22 -- Shift+T

Command: `--step ... --key Shift+T`

Heard: focus: nothing (the page itself); live status "77 of 77 rows" -- marked unconfirmed by the tool (the region arrived already filled; many screen readers would not speak it).

Morgan: "Maybe something opened. If my screen reader skipped that status, I'd have heard nothing at all and focus is still on nothing. Reading the page."

## Step 23 -- read the page with the table open

Command: `--step ... --read`

Heard: the toolbar as before, then: tab "Nodes" selected; tab "Edges"; "77 nodes"; button "Columns: 2 of 2"; button "Table options"; button "Close table"; "In the order loaded 77 of 77 rows"; header row "Id name Options for name"; then rows such as "Napoleon Napoleon", "Myriel Myriel", "MlleBaptistine Mlle Baptistine" ... (14 rows read, ending at "MmeDeR Mme de R"); then the inspector again.

Morgan: "There's the table. Nodes tab: two columns, 'Id' and 'name'. 'Columns: 2 of 2' says that's all of them, so each character has an id and a name and nothing else. Only 14 rows came through in a read of a 77-row table -- a virtualised list, I'd bet, which is the kind of thing that loses my place. For this question I don't need the rows. Now the Edges tab. Focus is still nowhere, so I Tab in from the top."

## Step 24 -- Tab x12

Command: `--step ... --key Tab` (twelve times)

Heard: "Main menu", "Project: Les Miserables", "Undo", "Redo disabled", "Local only", "Graph", "Find", "Selection", "Resize left panel", "Graph drawing", "Analyze", separator "Resize table" value 240.

Morgan: "Twelve keys to get near the table, and it still says 'Graph' rather than letting me go to 'Data'. Next should be the Nodes tab."

## Step 25 -- Tab

Command: `--step ... --key Tab` -- heard: tab "Nodes" selected.

Morgan: "Right Arrow to Edges, the way tabs should work."

## Step 26 -- Right Arrow

Command: `--step ... --key ArrowRight` -- heard: tab "Edges" selected; live "254 of 254 rows" (marked unconfirmed by the tool).

Morgan: "Tabs behave like tabs. 254 rows matches the edge count. Read the region for the columns."

## Step 27 -- read the Edges table

Command: `--step ... --read`

Heard: region "Table": tabs Nodes / Edges (selected); "254 edges"; button "Columns: 3 of 3"; "Table options"; "Close table"; "In the order loaded 254 of 254 rows"; header row "From To shared_chapters Options for shared_chapters"; rows such as "Napoleon Myriel 1", "MlleBaptistine Myriel 8", "Valjean Myriel 5".

Morgan: "Each connection has a From, a To and 'shared_chapters' -- a number, presumably how many chapters the two characters appear in together; the tool doesn't say, that's the file's own column name. 'From' and 'To' on a graph it just told me is undirected is a small contradiction; I'd want it to say 'endpoints' or explain. Three of three columns, so that's everything. I have my four answers. Done."

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s39`

## Debrief (Morgan, in character)

**Did I finish?** Yes. 77 characters, 254 connections, one component -- so every character can be reached from every other. Each character records an id and a name. Each connection records its two endpoints (From, To) and `shared_chapters`, a number.

**Ease: 4 out of 7.**

What worked:
- The start page has real headings, named buttons, and tells me my file stays on this computer before I ask.
- The load announced the size once: "Les Miserables: 77 nodes, 254 edges".
- The inspector's Overview gives nodes, edges, direction, density, components and degree range in text, without running anything. That is the summary-first I want.
- The question-mark shortcut list is excellent: headings per group, and it is where I found "Table, Shift+T".
- The table tabs work with arrow keys; "Columns: 3 of 3" tells me I'm seeing every column.

What confused me or cost me:
- **"Data" is a button I can hear and cannot reach.** Browse mode reads "Graph" and "Data" side by side; Tab skips from "Graph" to "Find", and Right Arrow on "Graph" does nothing. Neither button says whether it is pressed. I only got to the table through the shortcut list.
- **The graph drawing is silent.** "Canvas, Graph drawing" is in the tab order, but arrow keys and Enter say nothing, and there is no hint on entry of what it does.
- **Focus falls to nothing three times**: after opening the sample, after closing the shortcuts dialog, and after Shift+T opened the table. Each time I had to Tab in from the top -- thirteen presses to reach the table.
- **The table's row count may never be spoken**: "77 of 77 rows" and "254 of 254 rows" arrive in a status region that was already filled, which my screen reader often skips. With focus on nothing, Shift+T could have sounded like it did nothing.
- No headings at all once a graph is open, unlike the start page.
- "Direction: Undirected, from the file: directed 0" took me a second to parse; and then the edge table calls the endpoints "From" and "To", which sounds directed.
- A browse-mode read of the table gave me only the first 14 rows of 77 -- I suspect a virtualised list. Fine for this question, worrying for the next.
- `shared_chapters` is not explained anywhere; it's the file's raw column name.

Would I use this instead of my scripts? For this task, maybe as a quick look at a file I hadn't seen: the Overview line is what I'd print first in NetworkX anyway. Not yet for anything I'd have to navigate.
