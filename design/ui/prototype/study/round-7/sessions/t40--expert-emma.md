# Session t40 -- Expert Emma

Task given: "The full patent citation network your group keeps -- every patent and the earlier
patents it cites, well over a hundred thousand of them -- is in your Downloads folder. Get a first
look at it in graphty. The file is a sample: a very big network of patents. If that is not your
line of work, treat it as your own biggest export."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t40--expert-emma/.

## Start screen (shots/tasks/t40/01.png)

Think-aloud: "Top right says Local only, and under Start: 'Files are read on this computer and
never uploaded.' Good, that is the first thing I look for, and it is in one plain line. I would
still want to know about telemetry, but fine. There is 'Open project or file...' with Ctrl+O,
and -- oh -- in Recent projects there is 'Patent citations 1999-2001, 124,318 patents,
~/Downloads/Patent citat...'. Apparently someone in my group already opened it. But I was told
the file is in Downloads, so I open the file. That is what I would do with my own export."

## Step 1 -- Open project or file

    timeout 120 node app-b/study.mjs --try .../01.png task:t40 --click "Open project or file..."

Result: no file dialog. I land directly in a project called "Les Miserables" with 77 nodes,
PageRank coloring, Louvain groups, shortest paths and a watchlist.

Think-aloud: "What? I asked to open a file and I got the Les Miserables sample with somebody's
layers already on it. Where is the file picker? I did not pick anything. That is a sample
dataset, the one thing I skip."

## Step 2 -- The recent entry for the patent file

    timeout 120 node app-b/study.mjs --try .../02.png task:t40 --click "Patent citations 1999-2001"

Result: the same Les Miserables project.

Think-aloud: "I click 'Patent citations 1999-2001, 124,318 patents' and I get 77 characters from
Victor Hugo. Either the recent list is lying or the click is going somewhere else. That is
exactly the kind of thing that makes me stop trusting a tool."

## Step 3 -- New from data

    timeout 120 node app-b/study.mjs --try .../03.png task:t40 --click "New from data..."

Result: an import screen for "Door entries, March 2026" -- people, buildings, entries tables,
a match report about 25 person_ids not in people.

Think-aloud: "This is someone else's door-badge data. The import screen itself is actually
decent -- the 'Makes person --entries--> building' line, the match report with counts, the
leading-zero warning. That is the kind of honesty I want. But it is not my file."

## Step 4 -- Drop a file

    timeout 120 node app-b/study.mjs --try .../04.png task:t40 --click "or drop a file anywhere in this window"

Result: drop overlay, "Drop to open. CSV, GraphML, GEXF, GML, DOT, Pajek, JSON, Neo4j. The file is
read here and never uploaded."

Think-aloud: "Good list of formats, Pajek included. Restates the local claim. Fine. I drop it."

    timeout 120 node app-b/study.mjs --try .../05.png task:t40 --click "or drop a file anywhere in this window" --click "Drop to open"

Result: import screen for "transfers-2026-03.csv", 9,113 rows, 3,000 accounts.

Think-aloud: "Transfers again. 9,113 rows. My file has well over a hundred thousand patents. This
is not what I dropped."

## Step 5 -- Recent list, other ways in

    timeout 120 node app-b/study.mjs --try .../06.png task:t40 --click "3 more"

Result: a toast, "3 more recent projects"; the list does not expand.

    timeout 120 node app-b/study.mjs --try .../07.png task:t40 --click "124,318 patents"

Result: Les Miserables again.

    timeout 120 node app-b/study.mjs --try .../08.png task:t40 --key Control+o

Result: the transfers-2026-03.csv import screen again.

Think-aloud: "Ctrl+O gives me the transfers file with no dialog. Every road to 'open a file'
gives me a file I did not choose."

## Step 6 -- Menus inside the project

    timeout 120 node app-b/study.mjs --try .../09.png task:t40 --click "Open project or file..." --hover "Les Miserables"
    timeout 120 node app-b/study.mjs --try .../10.png task:t40 --click "Open project or file..." --click "Les Miserables"

Result: tooltip "Project menu F2", then a project menu with Rename, Save, Save as, Export, Apply
recipe or style file, Version history, Close project. No Open.

Side note while it was open: the right panel shows a Summary -- nodes 77, edges 254, undirected,
weight "value, stronger", density 0.0868, connected components 1, average degree 6.6, highest
degree 36, and a log-log complementary degree distribution. "That is the first minute I want.
Counts, direction, weight detected, components, density, degree distribution. If that shows up
for my patents I am interested."

    timeout 120 node app-b/study.mjs --try .../11.png task:t40 --click "Open project or file..." --click "Menu"

Result: main menu: New project, Open... Ctrl+O, Open recent, Select where..., Settings,
Keyboard shortcuts, Help.

    timeout 120 node app-b/study.mjs --try .../12.png task:t40 --click "Open project or file..." --click "Menu" --click "Open recent"

Result: submenu lists Mule ring review, Knockdown screen September, March transfers, Patent
citations 1999-2001.

    timeout 120 node app-b/study.mjs --try .../13.png task:t40 --click "Open project or file..." --click "Menu" --click "Open..."

Result: "Choose a file" submenu: transfers-2026-04.csv, mule-ring-triage.graphty,
risk-review-look.json. No patent file.

    timeout 120 node app-b/study.mjs --try .../14.png task:t40 --click "Open project or file..." --click "Menu" --click "Open recent" --click "Patent citations 1999-2001"

Result: a toast "Open Patent citations 1999-2001"; the screen stays on Les Miserables.

Think-aloud: "It says it is opening it, and then nothing. No progress, no 'parsing 124,318
nodes', no error. If it is loading in the background, tell me. If it failed, tell me why."

## Step 7 -- One last try

    timeout 120 node app-b/study.mjs --try .../15.png task:t40 --click "New from data..." --hover "Add table"

Result: "nothing on screen is called 'Add table'".

Think-aloud: "OK. I have tried the Start button, the recent entry twice, the drop target, Ctrl+O,
the main menu's Open and Open recent. Every one gives me a canned file or nothing. I give up."

## Outcome

- Succeeded? No. I never saw the patent network. I never saw how it handles 124k nodes, which
  was the whole point -- whether it tells me counts first, warns me about the size, or tries to
  draw a hairball and pins the fan.
- Single Ease Question: 1 of 7.
- Would I use this instead of my current tool? Not on this evidence. The parts I saw are the
  right parts: the local-only statement is plain and repeated, the import screen states what it
  makes and reports mismatches with counts, and the summary panel gives the numbers I want in
  the first minute. But "Open file" never opened my file, the recent entry for my file opened a
  different dataset, and the menu's "Open Patent citations" showed a toast and did nothing.
  A tool that opens the wrong data when I click my file is worse than a tool that refuses.

## Problems as she would report them

1. "Open project or file..." (and Ctrl+O) does not show a file picker; it lands in a sample
   project or another user's CSV. Severity: blocks the task.
2. The recent entry "Patent citations 1999-2001, 124,318 patents" opens Les Miserables (77
   nodes). Severity: blocks the task and destroys trust.
3. Open recent > Patent citations 1999-2001 in the main menu shows "Open Patent citations
   1999-2001" and nothing happens: no progress, no error, no cancel. Severity: high.
4. The Open... "Choose a file" list does not include anything in Downloads. Severity: high.
5. "3 more" in Recent projects shows a toast instead of expanding. Severity: low.
6. No sign anywhere of how a very large file is handled (size warning, sampling, counts before
   drawing). Could not be evaluated. Severity: unknown, but it is what I came to check.
