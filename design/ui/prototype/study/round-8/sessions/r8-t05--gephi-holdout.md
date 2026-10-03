# Session: open a coworker's edited GraphML file -- the Gephi holdout

Participant: Dr. Mara Lindqvist (persona: study/personas/gephi-holdout.md), associate professor, Gephi user since 0.8.
Task as given: "You have never used this program before. A coworker emailed you an edited copy of a network file of Les Miserables characters; it is saved as miserables-edited.graphml in your Downloads folder. Bring it into the program and either get to a point where you can carry on working, or know exactly what to tell your coworker to fix."
Viewport: 1440x900. All commands run from design/ui/prototype.

## Step 1 -- the start screen

Screen: shots/tasks/r8-t05/01.png

"Start page. A cookie-style banner at the bottom asking to share usage data -- no. I'm not clicking 'share' on anything before I've seen what this does with my files. 'No thanks.'

On the left: 'Open project or file...' with Ctrl+O. Good, that's where File > Open lives, I don't have to hunt. 'Files are read on this computer and never uploaded' -- I'll believe it when I've seen the network tab, but fine, that's the right sentence to have there. I'm ignoring the samples column; I don't need their Les Mis, I have the edited one."

## Step 2 -- Open

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t05--gephi-holdout/02.png task:r8-t05 --click "No thanks" --click "Open project or file..."
```

Screen: a file picker on Downloads listing miserables-edited.graphml (18 KB, Sep 29), miserables.gexf, a .graphty project, and a grayed-out .docx.

"There it is. miserables-edited.graphml, 18 KB. The original gexf is 22 KB -- different format so I won't read anything into the size. Pick it, Open."

## Step 3 -- what happened to my file

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t05--gephi-holdout/03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"
```

Screen: an "Open as a new graph" view. Left list "Tables" with miserables-edited marked with a red x. A red error box: "miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at node 80, which no node has (lines 590, 611 and 640). A graph file sets its own ids: make each node id unique and give every edge's ends a node, or choose another file." Below: "Nothing to show: nothing was read." Footer: "Load is off: no setting here fixes miserables-edited.graphml", Load button disabled.

"Well. It refused. Gephi's import report would have warned me and then quietly merged the duplicate and dropped the dangling edges -- and I'd find out three weeks later that a character is missing. This is the opposite: it won't load at all.

Honestly, I'm reading it twice and it's actually the right answer. Two nodes with id 11, lines 48 and 212. Three edges pointing at node 80, which doesn't exist, lines 590, 611 and 640. That's exactly what I'd send back. Line numbers -- I can paste that into the email as is. My guess: my coworker added a character, reused 11 instead of taking a fresh id, and maybe renamed or deleted 80 and forgot its edges. Count-wise the original Les Mis has 77 nodes, ids 0 to 76, so an '80' is somebody's hand edit.

What I don't love: 'Nothing to show: nothing was read.' So I can't even look at the table to see which two characters both claim 11. Gephi at least shows me the rows. I'd like to see the two labels so I can tell her 'Valjean and the new one are both 11'. And there's a 'Match report' label at the bottom with nothing under it -- empty, so what is it for?"

## Step 4 -- is there an import option that lets me through anyway?

```
timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t05--gephi-holdout/04.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "GraphML"
```

Screen: a "File settings" popover: Format GraphML (auto), Ids "1 and "1" are one node", Stop reading "After 100 errors", and "Position scale appears here once a column is a Position."

"Gephi's importer has the 'merge parallel edges' and 'create missing nodes' checkboxes; I'm looking for those. Nothing like it. Format, how ids compare, an error limit. None of that touches duplicate ids or missing endpoints, and the footer already said so: 'no setting here fixes' it. OK, I believe it -- it told me plainly rather than letting me fiddle for ten minutes. I'll stop here."

## Verdict

Succeeded? Yes. I know exactly what to tell my coworker: node id 11 is used twice (lines 48 and 212), and three edges (lines 590, 611, 640) point at a node 80 that isn't in the file -- give the new node its own id and either add node 80 or fix those edges. I could not carry on working, but that was one of the two allowed outcomes and the file really is broken.

Single Ease Question: 6 of 7. Three clicks to a precise diagnosis with line numbers. One point off because I can't see the offending rows -- which labels share id 11 -- without opening the file in a text editor, and because there's no "load it anyway and show me what you dropped" path, which is what I'd want if the coworker were on a plane.

Would I use this instead of Gephi? Not for this alone. A good error message doesn't move my course or my decade of .gephi files. But I'll say this: Gephi would have imported that file silently and I'd have published with a wrong node count. A tool that refuses and points to the line earns a second session -- on my 23k-node GEXF, where the real test is.

## Problems noticed

- After a refused file the view says "Nothing to show: nothing was read", so the two records that share id 11 cannot be seen in the app; she has to open the file in a text editor to learn which characters collide.
- No way to load the valid part and list what was left out; a Gephi user expects at least the option, even if it is off by default.
- "Match report: miserables-edited" heading at the bottom with nothing under it; unclear what it is for.
- The file settings popover holds nothing about duplicate ids or missing endpoints, which is where a Gephi user looks for "create missing nodes" / "merge" options. The footer saying no setting fixes it saved time.

## What worked

- Usage-data banner declinable with one click, nothing collected before answering.
- Open is where File > Open would be, with Ctrl+O shown.
- The error names both problems, with counts, ids and line numbers, in one sentence she could forward verbatim.
- Load disabled with a plain statement that no setting fixes the file, instead of letting her try every option.
