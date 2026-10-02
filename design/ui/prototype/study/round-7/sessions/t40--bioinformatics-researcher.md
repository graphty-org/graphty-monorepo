# Session: open a very large network (patent citations, 124,318 patents) -- Dr. Chen, computational biologist

Task as given: "The full patent citation network your group keeps -- every patent and the earlier patents it
cites, well over a hundred thousand of them -- is in your Downloads folder. Get a first look at it in graphty.
The file is a sample: a very big network of patents. If that is not your line of work, treat it as your own
biggest export."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t40--bioinformatics-researcher/.

## Start screen (shots/tasks/t40/01.png)

Think-aloud: "Start, Recent projects, Samples. Fine. 'Files are read on this computer and never uploaded' --
good, that is the first thing I would have asked. And there it is already in Recent: 'Patent citations
1999-2001, 124,318 patents, ~/Downloads/Patent citat...'. That's my file, or the stand-in for my 20,000-node
interactome. But I'd rather open the file than trust a recent list -- I want to see what it parses. Open
project or file."

## 01 -- Open project or file...

    timeout 120 node app-b/study.mjs --try .../01.png task:t40 --click "Open project or file..."

Result: the app went straight into a project called Les Miserables, 77 nodes, colored by PageRank, with
shortest paths and a Louvain grouping already on it.

"What? I asked to open a file and it opened... Les Miserables? I never picked Les Miserables. There was no
file dialog. Did I misclick on the sample? No, the samples are on the right. OK, back. Let me use the recent
entry instead."

## 02 -- Patent citations 1999-2001 (recent project)

    timeout 120 node app-b/study.mjs --try .../02.png task:t40 --click "Patent citations 1999-2001"

Result: Les Miserables again, identical.

"Same thing. I clicked the row that says 124,318 patents and I get 77 characters from a novel. The header
says Les Miserables. That's a node count I cannot reconcile, which for me is a stop. Let me try the import
path."

## 03 -- New from data...

    timeout 120 node app-b/study.mjs --try .../03.png task:t40 --click "New from data..."

Result: an import screen for "Door entries, March 2026" -- people, buildings, entries, with a match report
(25 person_id values not in people, and so on).

"This is actually the kind of screen I want -- a match report that says exactly which ids did not join and
lets me Add or Leave out. That's what stringApp never gives me. But it's not my file. Door entries? I didn't
choose this either. It seems to open whatever it likes."

## 04, 05 -- drop a file

    timeout 120 node app-b/study.mjs --try .../04.png task:t40 --click "or drop a file anywhere in this window"
    timeout 120 node app-b/study.mjs --try .../05.png task:t40 --click "or drop a file anywhere in this window" --click "Drop to open"

Result: 04 shows a drop overlay ("Drop to open. CSV, GraphML, GEXF, GML, DOT, Pajek, JSON, Neo4j. The file is
read here and never uploaded."). Dropping gives an import of transfers-2026-03.csv, 9,113 rows, 3,000
accounts.

"The format list is reasonable, no STRING TSV by name but a TSV is a CSV with tabs. But the dropped file came
out as bank transfers. Not patents. Three ways in, three different datasets, none of them mine."

## 06, 07 -- the patent row's subtitle, and '3 more'

    timeout 120 node app-b/study.mjs --try .../06.png task:t40 --click "124,318 patents"
    timeout 120 node app-b/study.mjs --try .../07.png task:t40 --click "3 more"

Result: 06 is Les Miserables again. 07 stays on the start screen with a small black message "3 more recent
projects" at the bottom; the list did not expand.

"'3 more' says 3 more and then shows me nothing. Fine."

## 08 -- Ctrl+O

    timeout 120 node app-b/study.mjs --try .../08.png task:t40 --key Control+o

Result: the transfers import again.

## 09-14 -- from inside the project, look for Open

    timeout 120 node app-b/study.mjs --try .../09.png task:t40 --click "Patent citations 1999-2001" --click "Les Miserables"
    timeout 120 node app-b/study.mjs --try .../10.png task:t40 --click "Patent citations 1999-2001" --hover "Menu"
    timeout 120 node app-b/study.mjs --try .../11.png task:t40 --click "Patent citations 1999-2001" --click "Main menu"
    timeout 120 node app-b/study.mjs --try .../12.png task:t40 --click "Patent citations 1999-2001" --click "Main menu" --click "Open recent"
    timeout 120 node app-b/study.mjs --try .../13.png task:t40 --click "Patent citations 1999-2001" --click "Main menu" --click "Open recent" --click "Patent citations 1999-2001"
    timeout 120 node app-b/study.mjs --try .../14.png task:t40 --click "Patent citations 1999-2001" --click "Main menu" --click "Open..."

Result: the project-name menu (09) has Rename, Save, Export, Version history, Close project -- no Open. The
hamburger is "Main menu" (10). It has New project, Open..., Open recent (11). Open recent lists Patent
citations 1999-2001 (12); clicking it shows a black message "Open Patent citations 1999-2001" at the bottom
and the screen stays on Les Miserables (13). Open... shows "Choose a file": transfers-2026-04.csv,
mule-ring-triage.graphty, risk-review-look.json -- no patent file, nothing from Downloads (14).

"It told me it was opening the patents and then it just... didn't. No progress bar, no 'this is 124,000 nodes,
it will take a minute', no error. That is exactly the Cytoscape 'finalizing' experience: something says it's
working and nothing happens. And the file picker doesn't even show my Downloads folder.

I'm done. I'd go back to igraph: read.graph, decompose, look at the degree distribution, then think about
whether a picture of 124,000 nodes is useful at all."

## Outcome

- Succeeded? No. I never saw the patent network. Every entry point opened something else (Les Miserables,
  door entries, bank transfers), and the two that named the patent file (Open recent, the recent row) either
  opened Les Miserables or announced "Open Patent citations 1999-2001" and changed nothing.
- Single Ease Question: 1 out of 7.
- Would I use this instead of my current tool? Not on this showing. The parts I glimpsed are promising --
  "never uploaded" stated up front, a real match report on import that names the ids that did not join, a
  Summary panel with nodes, edges, density, components and a log-log degree distribution. If that Summary had
  come up for 124,318 patents with honest counts, I would have kept going. But I could not get my own big file
  open, and at that size what I need most is to be told what is happening -- how long, whether it will
  sample or draw everything, what it dropped. I got silence. That is the failure I left Cytoscape over.

## Things I would point at

1. "Open project or file..", the recent "Patent citations" row and its "124,318 patents" subtitle all opened
   Les Miserables (77 nodes). A count that does not match the file I clicked is a stop-the-session problem.
2. Open recent > Patent citations 1999-2001 shows a passing message "Open Patent citations 1999-2001" and
   nothing else happens: no progress, no size warning, no error.
3. The Open... file chooser lists three files, none from Downloads and none the patent file.
4. "3 more" under Recent projects shows a message instead of expanding the list.
5. New from data, Ctrl+O and drop each opened a different unrelated dataset (door entries, transfers).
6. Good: "Files are read on this computer and never uploaded" on the start screen and the drop overlay; the
   import match report; the Summary panel with a degree distribution.
