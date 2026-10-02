# Session: bring a saved network in and check it arrived whole -- Tom, the recipe recipient

Task as given: "A colleague saved the network of characters onto your computer for you. Bring it
into graphty, starting from the screen you see, and check it arrived whole."

Start screen: shots/tasks/t14/01.png. Renders: tmp/round-7-sessions/t14--recipe-recipient/.
All commands were run from design/ui/prototype; D stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t14--recipe-recipient

## Step 0 -- the start screen

Think-aloud: "OK. Three columns. 'Start', 'Recent projects', 'Samples'. Les Miserables is sitting
right there under Samples, 77 characters -- but that's their sample, not the file she saved for
me. I want HER file. 'Open project or file...' is the first thing on the left, that's what I'd
want. There's also 'drop a file anywhere in this window', which is what I'd normally do, but I
don't have the folder open. And underneath: 'Files are read on this computer and never uploaded.'
Good. I read that. Top right says 'Local only' too. That answers my first question before I
asked it."

## Step 1 -- Open project or file...

    timeout 120 node app-b/study.mjs --try $D/01.png task:t14 --click "Open project or file..."

What I saw: no file window at all. It went straight to a full picture: "Les Miserables" at the
top left, a network of orange dots with names (Valjean, Javert, Cosette, Marius...), a legend
"Color: PageRank, Size: Degree", a list on the left with PageRank, Louvain 6 groups, Shortest
paths, Watchlist, a folder "For the report", Betweenness. Panel on the right about PageRank,
"Paints 77 nodes".

Think-aloud: "Wait. I didn't pick anything. Is this her file or did it just open the sample? It
says 'Les Miserables'; the sample was called that too. I'll assume it found the file she saved,
because I'd normally have chosen it myself. It opened, and it isn't grey dots -- there are colors
and a legend, so it kept her look. 77 nodes, same as the sample said. But this left list is
already full of things -- PageRank, Louvain, 'For the report', 'Watchlist'. Did she do all that,
or does the app do it to every file? I don't know what PageRank or Louvain are and I'm not
clicking them. The question is whether it's all there. Where's a count of the connections?"

## Step 2 -- the name at the top

    timeout 120 node app-b/study.mjs --try $D/02.png task:t14 --click "Open project or file..." --click "Les Miserables"

What I saw: a menu (Rename, Save, Save as, Export, "Apply recipe or style file...", Version
history, Close project). Behind it, the right panel had changed to "Co-appearances, Graph from
miserables.gexf" with a Summary: Nodes 77, Edges 254, Undirected, Connected components 1, and a
chart I didn't read.

Think-aloud: "Menu's nothing I need. But the right side -- that's it. 'from miserables.gexf'.
That's a file name; that must be what she saved. Nodes 77, edges 254. One connected component,
which I take to mean nothing's floating off on its own. That's the number I'd give the PI. I
can't say 254 is right without her telling me how many there should be, though. Is there
anything telling me nothing got dropped on the way in? Let me click the file name."

Note: I only saw that panel because I happened to click the title. I wouldn't have known the
right side had a Data tab otherwise; on the first screen it was showing PageRank.

## Step 3 -- the file name link

    timeout 120 node app-b/study.mjs --try $D/03.png task:t14 --click "Open project or file..." --click "Les Miserables" --key Escape --click "from miserables.gexf"

What I saw: a page headed "Edit: miserables.gexf", "Esc to leave". Line across the top: "Makes
Les Miserables: 77 nodes, 254 edges". A table of nodes: id, label (Myriel, Napoleon,
Mlle.Baptistine...), group. "Showing the first 8 of 77 rows." At the bottom "Match report: nodes
-- 77 rows; every id is unique." And "Apply is off: Nothing has changed yet", with Cancel and a
grayed-out Apply.

Think-aloud: "'Edit'. I don't want to edit her file. That word makes me nervous. But the bottom
says nothing has changed and Apply is gray, so I haven't broken anything. 'Match report: 77 rows;
every id is unique.' That's the sort of line I want -- it's telling me there were no duplicates
and nothing missing. The tick marks next to nodes 77 and edges 254 on the left look like
'checked'. Let me see the edges one."

## Step 4 -- edges

    timeout 120 node app-b/study.mjs --try $D/04.png task:t14 --click "Open project or file..." --click "Les Miserables" --key Escape --click "from miserables.gexf" --click "edges"

What I saw: source, target, value columns. "Match report: edges -- 254 rows; every edge has both
ends." Up top: "Weight: none (each edge counts 1)".

Think-aloud: "254 rows, every edge has both ends. So no connections pointing at someone who isn't
there. Fine, that's whole, as far as I can tell. But hang on -- this says 'Weight: none (each
edge counts 1)', and the panel on the previous screen said Weight 'value, stronger'. There's a
'value' column right here with 8s and 10s in it. So which is it? Is the picture using her numbers
or not? I'd probably ask her about this bit. I'm not touching 'Directed' or 'Undirected' down
there either. I'll leave without pressing anything."

I stopped here. I would close this with Esc, not Cancel -- "Cancel" sounds like it might undo the
import.

## After the session

- Did I succeed? I think so. The file opened with her colors, and I found two lines that said 77
  nodes with no duplicates and 254 edges with both ends. I'm not fully sure it was her file and
  not the sample, because no window ever asked me which file.
- Single Ease Question: 5 of 7. Opening was one click. Finding "did it all arrive" took a lucky
  click on the title and then a link into a screen called "Edit", which I'd rather not have been
  in. And the two weight lines disagree, which I'd have to ask about.
- Would I use this instead of what I have now? For opening something she sends me, probably yes:
  nothing to install, and it said up front that files aren't uploaded, which is the first thing I
  ask. It looked like a finished picture, not grey dots. But I'd want the "77 nodes, 254 edges,
  nothing missing" to be on the screen when it opens, not two clicks away behind an Edit page.
  Otherwise she could just send me a PNG and an Excel file.

## Problems noticed (in my words)

1. No file was chosen -- it just opened. I couldn't be sure it was her file rather than the
   sample with the same name. (Severity: medium)
2. The "did it arrive whole" counts are not shown when the file opens; the right panel showed
   PageRank. I only found Nodes 77 / Edges 254 by clicking the title. (Severity: high)
3. The match report lives on a page titled "Edit: miserables.gexf". Checking is not editing;
   the word made me nervous. (Severity: medium)
4. The summary said Weight "value, stronger"; the edges page said "Weight: none (each edge counts
   1)" with a value column right there. Contradiction I can't resolve. (Severity: high)
5. The opened project already held many rows I didn't recognize (PageRank, Louvain, Watchlist,
   For the report) with no word on who made them. (Severity: low)
6. "Cancel" on a page where nothing changed sounds like it would undo the import. (Severity: low)

## What pleased me

- "Files are read on this computer and never uploaded" on the very first screen, and "Local only"
  at the top.
- It opened with colors and a legend, not grey dots.
- "Match report: 77 rows; every id is unique" and "254 rows; every edge has both ends" -- plain
  sentences with numbers.
- "Apply is off: Nothing has changed yet" told me I hadn't broken her file.
