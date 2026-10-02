# Session: bring a colleague's file into graphty and check it arrived whole -- Morgan Reyes (screen-reader analyst)

Task as given: "A colleague saved the network of characters onto your computer for you. Bring it
into graphty, starting from the screen you see, and check it arrived whole. The data on screen is
a sample: characters of the novel Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t14/01.png. All commands were run from design/ui/prototype; renders are in
tmp/round-7-sessions/t14--screen-reader-analyst/.

## Step 1 -- the start screen

Morgan: "Title is 'graphty'. Headings: Start, Recent projects, Samples. Good -- named parts. Under
Start: 'Open project or file..., Ctrl+O', 'New from data...', 'or drop a file anywhere in this
window' -- I'm not dropping anything, I can't drag. 'Files are read on this computer and never
uploaded.' That answers my first question before I asked it. Credit for that. There's a Les
Miserables sample on the right too, but my colleague gave me a file, so I want the file, not the
sample. Open project or file."

    timeout 120 node app-b/study.mjs --try .../01.png task:t14 --click "Open project or file..."

## Step 2 -- something opened

Render 01: a full project titled "Les Miserables", with a Graph tree holding Selection, Notes (4),
PageRank, Louvain (6 groups), Shortest paths, a Watchlist, a "For the report" folder, Betweenness
(hidden) and Everything. The picture is in the middle and a style panel for PageRank is on the right.

Morgan: "No file dialog. I pressed Open and I'm already inside something called Les Miserables. Did
I pick my colleague's file? I never heard a file name. And this has PageRank, Louvain, four notes, a
'For the report' folder -- a raw file my colleague just saved doesn't come with my notes in it. So
either this is somebody's old project or the sample. I can't tell which, and that matters: I'm being
asked whether MY file arrived whole. First the counts. 'Data' is the obvious place to ask how big it
is."

    timeout 120 node app-b/study.mjs --try .../02.png task:t14 --click "Open project or file..." --click "Data"

## Step 3 -- the Data view

Render 02: Sources lists "miserables.gexf, 77 nodes, 254 edges", with a nodes table (77 nodes) and
an edges table (254 rows, 254 edges). A Summary on the right reads Nodes 77, Edges 254, Direction
Undirected, Weight "value, stronger", Density 0.0868, Connected components 1, Average degree 6.6,
Highest degree 36, then "4 more readings not computed", then a degree chart.

Morgan: "Now we're talking. File name first: miserables.gexf. 77 nodes, 254 edges, undirected, one
component. That's what NetworkX gives me for les_miserables_graph: 77 and 254. 'edges: 254 rows, 254
edges' -- rows equals edges, so nothing was thrown away between the file and the graph. That's
exactly the sentence I want, and I got it without running anything. Average degree 6.6 is right
too: 2 times 254 divided by 77. The degree chart I'll skip; it gets a sentence, so fine.

But 'arrived whole' also means: were any ids duplicated, were any edges pointing at nothing? Rows
equals edges says nothing was dropped, not why. I'll open the source."

    timeout 120 node app-b/study.mjs --try .../03.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf"

## Step 4 -- the source, nodes table

Render 03: "Edit: miserables.gexf, Esc to leave". "Makes Les Miserables: 77 nodes, 254 edges". The
format is GEXF (auto). "Each row is a node: set by the file". The table shows the first 8 of 77 rows
(id, label, group). "Match report: nodes -- 77 rows; every id is unique." The bottom line reads:
Direction "As the file says" / Directed / Undirected; "Apply is off: Nothing has changed yet";
Cancel; Apply.

Morgan: "'Edit' -- I wanted to look, not edit. But it tells me how to leave, Esc, before I need to,
and Apply is off because nothing changed, so I'm not going to break anything by being here. Good.
'Match report: nodes, 77 rows, every id is unique.' Duplicate ids are the thing I check first on
every import, and it says it in one line. 'Direction: As the file says' -- so it isn't quietly
flattening a directed file. That's my second favorite line today. Edges."

    timeout 120 node app-b/study.mjs --try .../04.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf" --click "edges"

## Step 5 -- the edges table

Render 04: "Each row is an edge: set by the file". "Weight: none (each edge counts 1)". Columns:
source (From -> node), target (To -> node), value. First 8 of 254 rows. "Match report: edges -- 254
rows; every edge has both ends."

Morgan: "'Every edge has both ends.' No dangling edges. So structurally this arrived whole: 77
unique nodes, 254 edges, all attached, one component.

Now the problem. This header says 'Weight: none, each edge counts 1'. Two minutes ago the summary
said 'Weight: value, stronger'. Same file, same session, two answers. Which one does the PageRank
in the tree use? This is the normalised-betweenness argument all over again: I'd compute weighted
in NetworkX, get a different number, and nobody would know why. I'm writing that down as a defect,
not a quibble.

Also, 'source' and 'target' are typed Abc, text, while the ids look like numbers. That's fine for
GEXF, I just noticed it.

One thing left: where did this come from? Did I open my colleague's file? The title menu might say."

    timeout 120 node app-b/study.mjs --try .../05.png task:t14 --click "Open project or file..." --click "Les Miserables"

## Step 6 -- the title menu

Render 05: the project menu reads Les Miserables; Rename F2; Save Ctrl+S; Save as... Ctrl+Shift+S;
Export... Ctrl+E; Apply recipe or style file...; Version history; Close project.

Morgan: "Rename, Save, Export, Version history. No path. 'Les Miserables' is a project name, not a
file name. I still don't know which file on disk this is, or whether 'Open project or file' opened
my colleague's file or something from Recent projects. I'll stop. I've checked the counts twice and
the match reports twice."

## Verdict

**Did I succeed?** Mostly. The data I ended up with is whole: 77 nodes with unique ids, 254 edges
with both ends attached, direction as the file says, one component. The counts match NetworkX. What
I can't swear to is that this is my colleague's file. I never chose a file, I never heard a path,
and what opened already had PageRank, Louvain, saved paths and four notes in it, which a fresh
file wouldn't. If my manager asked "is that the file Sam sent you?", I'd have to say "I think so."

**Single Ease Question:** 4 of 7. Once I found the Data view, the check itself was quick and the
wording was good. Getting there meant opening something without knowing what, and leaving with two
answers about weight.

**Would I use this instead of my current tool?** Not for importing, not yet. In NetworkX I read a
file by its path and print len(G), G.number_of_edges() and the number of components; three lines,
and I know which file I read. What graphty does better is the match report: "every id is unique",
"every edge has both ends", "254 rows, 254 edges", all in plain sentences without my writing the
checks. I'd want that. But it has to tell me which file it read, and it has to say the same thing
about weight in both places. Until then, I'd load the file here and verify it in Python anyway, and
then there's no point.

## What worked

- "Files are read on this computer and never uploaded" on the start screen, before I asked.
- The Data view led with the file name and node and edge counts, plus "254 rows, 254 edges".
- The summary's counts, component count and average degree are right, and readable as name and value
  pairs.
- The match reports: "77 rows; every id is unique" and "254 rows; every edge has both ends".
- "Direction: As the file says" -- no silent undirecting.
- The source view says how to leave (Esc) and that nothing has changed (Apply off).

## What failed or worried me

1. "Open project or file..." opened a full project with no file chooser and no file name spoken. I
   could not confirm this was the colleague's file and not a recent project or the sample. (Severe
   for this task.)
2. Weight contradicts itself: the summary says "value, stronger" and the edges source says "none
   (each edge counts 1)". (Severe: it decides every weighted measure.)
3. The project already held results, notes and saved views, which doesn't fit "a file just
   arrived". It made me doubt everything I read afterwards.
4. The project menu gives no file path or origin anywhere.
5. The source opens under the word "Edit" when I only wanted to look; Apply being off reassured me,
   but "Edit" was the first word I heard.
