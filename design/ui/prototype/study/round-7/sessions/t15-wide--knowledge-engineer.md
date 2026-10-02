# Session: wide host data, applying a colleague's colors and analysis steps -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona in study/personas/knowledge-engineer.md).

Task as given by the moderator: "A colleague sent the colors and analysis steps their team uses on
host data, without their data. Two of the things they expect to find about each host are called
differently in your hosts. Put them to use on your hosts so that nothing in them is silently
skipped. The data on screen is a sample: a company's IT estate, hosts and the network connections
between them, with dozens of things recorded about each."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t15-wide--knowledge-engineer/. D below stands for that folder.

## Start screen (shots/tasks/t15-wide/01.png)

"IT estate, March 2026. Hosts, 300 nodes, 1,105 edges, directed, weight bytes_total_24h. Fine,
those are labeled as nodes and edges, good. 'Columns: 8 of 69' -- so 69 attributes, that is the
wide part. 'Nothing is colored or sized by a row' -- I would say 'by an attribute', but fine.

The colleague sent me a file. So I am looking for import, or 'apply', or 'load style'. Nothing in
the top bar says that. 'Views' on the left rail sounds like a saved look; I try that first."

## Step 1 -- Views

    timeout 120 node app-b/study.mjs --try D/01.png task:t15-wide --click "Views"

"'No saved views. Save view.' Only saving, no loading. There is a '...' up there."

    timeout 120 node app-b/study.mjs --try D/02.png task:t15-wide --click "Views" --hover "More"
    timeout 120 node app-b/study.mjs --try D/04.png task:t15-wide --click "Views" --click "More for views"

"'Export tour video... Save a view first.' A video. Not what I want."

## Step 2 -- the main menu

    timeout 120 node app-b/study.mjs --try D/03.png task:t15-wide --click "Menu"

"New project, Open, Open recent, Select where, Settings, Help. No 'Import' and no 'Apply'. I will
look at Style before I try Open, because Open usually means replacing my project."

## Step 3 -- the Style tab in the right panel

    timeout 120 node app-b/study.mjs --try D/05.png task:t15-wide --click "Style"

"Canvas background, print-safe colors, layout method 'Spread Out', seed 7. Nothing about loading a
style from elsewhere."

## Step 4 -- guessing the left panel's '...' menu

    timeout 120 node app-b/study.mjs --try D/06.png task:t15-wide --click "More for layers"      -> nothing on screen is called that
    timeout 120 node app-b/study.mjs --try D/06.png task:t15-wide --click "More for graph"       -> nothing on screen is called that
    timeout 120 node app-b/study.mjs --try D/06.png task:t15-wide --click "More"
    (also tried: "More for the layer list", "More for layers list", "Layer list options",
     "More for hosts", "Layers", "More for the graph" -- none exist)

"'More' opened the right panel's menu, not the one I meant: select all, invert selection, fit,
re-run layout, compute the overview, add node, add note, clear graph data. Nothing to apply. The
'...' next to the search box I could not name. In a real app I would just click it."

## Step 5 -- Analyze

    timeout 120 node app-b/study.mjs --try D/07.png task:t15-wide --click "Analyze"

"A command palette: Louvain, PageRank, shortest path, 'Links (count)'. 'Links' for degree -- I
would say degree. Anyway this runs one algorithm; it does not take my colleague's file."

## Step 6 -- Open...

    timeout 120 node app-b/study.mjs --try D/08.png task:t15-wide --click "Menu" --click "Open..."

"Three files: transfers-2026-04.csv, mule-ring-triage.graphty, risk-review-look.json. None of them
says hosts. 'risk-review-look' sounds like colors -- maybe it is the colleague's look. Try it."

    timeout 120 node app-b/study.mjs --try D/09.png task:t15-wide --click "Menu" --click "Open..." --click "risk-review-look.json"

"Wait. The title is now 'Transfers, March 2026', 3,000 nodes. My hosts are gone? I opened a
style file and it swapped my graph. The dialog itself is actually the kind of thing I wanted:
'Apply style file: Risk review look. Brings: styles. You supply: a network with an account
column.' A list of what it expects -- alertRule, flagged, riskScore, kind, amount -- '4 of 5
matched by name and type', and for alertRule a 'Choose an attribute' picker or 'Leave unbound',
and Apply is disabled until I decide. Good. That is honest: it does not skip silently.

But it is for accounts, not hosts, and only one thing is unmatched, not two. Not my colleague's
file. And why am I looking at a transfer network now?"

## Step 7 -- Open recent

    timeout 120 node app-b/study.mjs --try D/10.png task:t15-wide --click "Menu" --click "Open recent"

"Mule ring review, knockdown screen, March transfers, patent citations. Nothing about hosts."

## Step 8 -- the Data section

    timeout 120 node app-b/study.mjs --try D/11.png task:t15-wide --click "Data"

"Sources: hosts-2026-03.csv, 300 nodes; connections-2026-03.csv, 1,105 rows, 1,105 edges. Good, rows
versus edges reconciled. Attributes listed with types and fill rates: backup_last_success_at 84%,
cmdb_*, cpu_*. This is the useful screen. There is a '+' on Sources."

    timeout 120 node app-b/study.mjs --try D/12.png task:t15-wide --click "Data" --click "Add source"  -> nothing on screen is called that
    (also tried "Import", "Add a source" -- none; "Add data" and "Add" exist)
    timeout 120 node app-b/study.mjs --try D/12.png task:t15-wide --click "Data" --click "Add data"

"File, From a URL, Paste, Set collection."

    timeout 120 node app-b/study.mjs --try D/13.png task:t15-wide --click "Data" --click "Add data" --click "File..."

"'Data file: CSV, JSON, GEXF or GraphML', 'Recipe: mule-ring-triage.graphty', 'Style file:
risk-review-look.json'. So a recipe is the thing that carries steps. 'Colors and analysis steps'
-- that is a recipe. But this one is called mule ring triage. Still no hosts. Try it."

    timeout 120 node app-b/study.mjs --try D/14.png task:t15-wide --click "Data" --click "Add data" --click "File..." --click "Recipe: mule-ring-triage.graphty"

"Again the project flips to 'Transfers, March 2026'. 'Apply recipe: Mule ring triage. Brings:
styles, 1 set, 3 runs.' Watchlist, personalized PageRank, max flow, cycles, riskScore, alertRule.
'4 of 4 matched.' Accounts again. Nothing to rename. Not my colleague's."

## Step 9 -- URL and Paste

    timeout 120 node app-b/study.mjs --try D/15.png task:t15-wide --click "Data" --click "Add data" --click "From a URL..."
    timeout 120 node app-b/study.mjs --try D/16.png task:t15-wide --click "Data" --click "Add data" --click "Paste..."

"URL: 'Add to Transfers', structuring alerts from a bank URL. Paste: the title is now 'Les
Miserables', with GraphML. Every door I open drops me into somebody else's dataset. I have no idea
which graph I am editing any more. That is three unexplained switches."

## Step 10 -- Assistant

    timeout 120 node app-b/study.mjs --try D/17.png task:t15-wide --click "Assistant"

"'Off. Nothing is sent.' Good, and I will not turn it on with confidential data."

## Step 11 -- one last attempt at the left '...'

    (tried "More for the tree", "More for tree", "Tree options", "More for the graph tree" -- none exist)

"I give up."

## Outcome

Succeeded? No. "I never found my colleague's host file. The only style and recipe files on offer
were for bank accounts, and opening either one replaced my hosts with a transfer network. I could
not tell if my IT estate was still open."

Single Ease Question: 2 of 7.

Would I use this instead of my current tool? "Not on this evidence. The apply dialog I did see is
better than anything I have: it lists what the file expects, says how many matched by name and
type, makes me bind or explicitly leave each missing one unbound, and will not apply until I do.
That is exactly 'nothing silently skipped', and I would want it for SHACL-style shape reuse. But
I could not get it to apply to my own graph. Opening a style file switched the whole project, and
so did paste and the URL path. An app that changes which graph I am looking at when I ask it to
style the one I have loses my trust faster than any missing feature. I would stay with my notebook
and a mapping table until applying a file to the open graph is obvious and stays on that graph."

## Problems observed (participant's words, summarized)

- No obvious place to apply someone else's colors and steps to the open graph: Views only saves,
  the main menu has Open but no Apply or Import, the Style tab has no load.
- None of the offered files was for hosts; nothing helped her find the colleague's file.
- Opening a style file, a recipe, a URL or pasted text switched the project title and data
  (Transfers, then Les Miserables) with no explanation. She read this as losing her hosts graph.
- The left panel '...' next to the search box could not be reached by any name she guessed.
- Vocabulary: "Links (count)" for degree; "colored by a row" for colored by an attribute.

## What worked for her

- The apply dialog: expected attributes listed, "4 of 5 matched by name and type", a per-row
  "Choose an attribute" or "Leave unbound", Apply disabled until each is decided.
- Data section: sources with node and edge counts that reconcile, attributes with types and fill
  rates.
- Assistant off by default and saying "Nothing is sent".
