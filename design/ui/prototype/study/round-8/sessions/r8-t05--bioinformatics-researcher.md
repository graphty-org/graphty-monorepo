# Session: r8-t05, bioinformatics researcher (Dr. Chen)

Task given: "You have never used this program before. A coworker emailed you an edited copy of a network
file of Les Miserables characters; it is saved as miserables-edited.graphml in your Downloads folder.
Bring it into the program and either get to a point where you can carry on working, or know exactly what
to tell your coworker to fix."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--bioinformatics-researcher/.

## Step 1 -- start screen (shots/tasks/r8-t05/01.png)

"Start, Recent projects, Samples. Fine. There's a banner asking to collect usage data -- the text says
nothing is collected until I answer, which is the right default. I'm saying no; I don't send telemetry
from a work machine I haven't vetted. 'Files are read on this computer and never uploaded' -- good, that
is the first thing I would have asked. 'Open project or file...' is the obvious way in. I'm not touching
the Les Miserables sample, I want my coworker's file."

## Step 2 -- decline banner, open the file chooser (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t05 --click "No thanks" --click "Open project or file..."

"A file picker on Downloads. miserables-edited.graphml, 18 KB, Sep 29. There's also miserables.gexf from
Sep 27 -- presumably the original. The .docx is grayed out, which is honest: it can't read that. I'll take
the edited one."

## Step 3 -- pick the edited GraphML and Open (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"

"Right. It refused it, and it says why:

  'miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at node 80,
  which no node has (lines 590, 611 and 640).'

That is exactly what I want from an importer. Duplicate node id and dangling edges, with line numbers.
Compare that to stringApp handing me 'null'. It guessed the format as GraphML and labels that 'auto', so
I know it guessed. The bottom bar says 'Load is off: no setting here fixes miserables-edited.graphml'.
OK -- so it isn't going to quietly drop the three edges or merge the duplicates behind my back. I'd
rather it refuse than silently drop edges; a node count I can't reconcile is worse than no network.

The wording 'make each node id unique and give every edge's ends a node' is a bit clumsy, but the line
numbers carry it."

## Step 4 -- check whether the match report says more (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "Match report: miserables-edited"

"I clicked 'Match report' at the bottom hoping for a list. Nothing changed; it's just a heading over an
empty area. Not sure what a 'match report' is for a single graph file -- probably for joining tables.
Mildly confusing to show an empty one here, but nothing lost."

## Step 5 -- check the file settings for a 'skip bad edges' option (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "GraphML"

"Clicking the format dropdown gave me 'File settings': Format GraphML (auto), Ids '1 and "1" are one
node', Stop reading 'After 100 errors'. No option to drop dangling edges or keep the first of a duplicate
id. That matches what the bottom bar said: no setting fixes it. I believe it now.

I'd actually have liked an explicit 'load anyway, dropping these 3 edges, and record that I did' -- with
the count in the import summary -- because sometimes I need to look at the thing today. But I understand
refusing, and for a coworker's edit the right answer is that they fix it."

## Stop

What I would email my coworker:

  "Your miserables-edited.graphml won't load. Two nodes share id 11 (lines 48 and 212) -- one of them
  needs a different id. And three edges (lines 590, 611 and 640) point to node 80, which doesn't exist
  in the file -- either add node 80 back or remove/redirect those edges. Probably you deleted or renumbered
  a node and didn't update the edges."

## Verdict

- Succeeded? Yes. I know exactly what to tell my coworker, with line numbers. I did not get a network on
  screen, but the task allowed for that, and I don't think I was supposed to be able to.
- Single Ease Question: 6 of 7. Three clicks to a precise diagnosis. One point off for the empty 'Match
  report' and no way to load the clean part of the file while waiting for the fix.
- Would I use this instead of my current tool? Not on this evidence alone. The import error is better than
  Cytoscape's and far better than stringApp's, and 'read locally, never uploaded' matters to me. But I
  have not seen the node table, whether my columns keep their types, any centrality, any export, or any
  way to drive it from R. Ask me again after I've got a STRING TSV in and a node table back out as a TSV.

## Notes for the record (in her words)

- "Error with line numbers and the exact ids: this is the bar every importer should meet."
- "Tell me whether my coworker's edit is what broke it -- you have the original .gexf right there in my
  Downloads, but I wouldn't expect it to compare them."
- "An empty 'Match report' heading under a failed read is noise."
- "Give me a 'load the rest and list what you dropped' option, with the dropped count in the summary.
  Refusing is fine; refusing with no alternative costs me the afternoon."
