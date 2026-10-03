# Session: open a coworker's edited GraphML file (nonprofit operations analyst, "Grace")

Task as given: "You have never used this program before. A coworker emailed you an edited copy of a
network file of Les Miserables characters; it is saved as miserables-edited.graphml in your
Downloads folder. Bring it into the program and either get to a point where you can carry on
working, or know exactly what to tell your coworker to fix."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--nonprofit-operations-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t05/01.png)

Think-aloud: "OK. Big box at the bottom asking me to share usage data. It says they never see my
data, and 'Files are read on this computer and never uploaded' is right there on the left, which
is what I'd want to see before I put donor names in anything. I'll say No thanks to the usage
thing -- I don't need to think about that today. Then 'Open project or file...' is the obvious
door. I'm not making something new, I'm opening a file. There's a Les Miserables sample on the
right, but that's not my coworker's copy, so I'm leaving it alone."

## Step 2 -- No thanks, then Open project or file

```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t05 --click "No thanks" --click "Open project or file..."
```

Saw: a "Choose files" box showing my Downloads folder: miserables-edited.graphml (18 KB, Sep 29),
miserables.gexf, a Patent citations file, and a grayed-out chapter-notes.docx.

Think-aloud: "There it is, top of the list, edited one. Interesting that there's also a
miserables.gexf -- I guess that's the original he started from? Not my problem right now. Tick the
box, Open."

## Step 3 -- pick the file and Open

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"
```

Saw: a screen titled "Open as a new graph" with a Tables list on the left (miserables-edited with a
red x), the file type picked as GraphML ("auto"), and a red error box:

> miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at
> node 80, which no node has (lines 590, 611 and 640).
> A graph file sets its own ids: make each node id unique and give every edge's ends a node, or
> choose another file.

Under it: "Nothing to show: nothing was read." At the bottom: "Load is off: no setting here fixes
miserables-edited.graphml", with Load grayed out.

Think-aloud: "Well, it didn't open. But honestly this is the most useful error message I've seen
from a program in a while. It says exactly two things are wrong and gives me line numbers. Two
characters have the same ID, 11, on lines 48 and 212. And there are three connections pointing at
somebody numbered 80 who isn't in the file -- lines 590, 611 and 640. That's like a VLOOKUP coming
back #N/A: he probably deleted a character or typed a wrong number.

And the bottom line says there's no setting here that fixes it, so I'm not going to sit here
fiddling with that GraphML dropdown hoping something changes. Good -- that saves me twenty minutes.

I'm a little thrown by 'node' and 'edge' -- I'd say 'person' and 'connection' -- but in context
I get it. And 'Match report' at the bottom is empty and I don't know what it would match. I'd
ignore it.

What I'd lose: I can't see ANY of it. If it's 77 characters and only one is duplicated, I'd kind
of like to see the other 76 so I could at least start. But I understand they don't want to guess
which of the two 11s is right. Fine."

I stopped here. I would email my coworker:

> "Your miserables-edited.graphml won't open. Two characters both have ID 11 (lines 48 and 212) --
> one of them needs a different ID. And three connections (lines 590, 611 and 640) point to ID 80,
> which isn't in the file -- either add character 80 back or fix those three lines. Send me the
> fixed copy."

## Wrap-up

- Did I succeed? Yes. I couldn't carry on working, but I know exactly what to tell my coworker,
  down to the line numbers, and the program told me plainly that nothing on my side would fix it.
- Single Ease Question: 6 of 7. Three clicks to the answer. Not a 7 because the words are "node",
  "edge" and "id" instead of person and connection, and because there's an empty "Match report"
  I didn't understand.
- Would I use this instead of my current tool? For this job, yes -- Excel would have just shown me
  rows and I would never have spotted a duplicate ID or a dangling 80 without building a
  COUNTIF and a lookup myself. Whether I'd use it day to day depends on whether my own spreadsheet
  export comes in as easily; this test didn't show me that.

## Problems noticed

1. "Node", "edge" and "id" in the error message are graph words, not everyday ones; a first-timer
   has to translate them (low).
2. "Match report: miserables-edited" heading with nothing under it, on a file that failed to read;
   unclear what it is for (low).
3. Nothing at all is shown when the file has only a few bad lines; I could not even look at the
   good part while waiting for the fix (low, a wish more than a defect).

## What worked

- "Files are read on this computer and never uploaded" on the start screen, before I opened donor-
  style data.
- The file picker opened straight on Downloads with my file at the top.
- The error named both problems, with line numbers, in one sentence I could paste into an email.
- "Load is off: no setting here fixes ..." stopped me from wasting time on the format dropdown.
