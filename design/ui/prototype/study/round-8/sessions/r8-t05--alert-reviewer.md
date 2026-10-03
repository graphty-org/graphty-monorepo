# Session: open a broken GraphML file -- Nadia (level-1 alert reviewer)

Task as given: "You have never used this program before. A coworker emailed you an edited copy
of a network file of Les Miserables characters; it is saved as miserables-edited.graphml in your
Downloads folder. Bring it into the program and either get to a point where you can carry on
working, or know exactly what to tell your coworker to fix."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--alert-reviewer/.

## Step 0 -- start screen (shots/tasks/r8-t05/01.png)

Think-aloud: "OK. Big box at the bottom about my data. No thanks -- I'm not reading a privacy
notice, compliance would kill me if I said yes anyway. Top left says 'Open project or file...'
with Ctrl+O. That's the one. I don't care about the samples on the right."

## Step 1 -- dismiss the banner, open the file picker

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t05 --click "No thanks" --click "Open project or file..."

Saw: a "Choose files" box listing Downloads: miserables-edited.graphml (18 KB, Sep 29),
miserables.gexf, a Patent citations .graphty file, and a grayed-out chapter-notes.docx.
Open button grayed until I pick something.

Think-aloud: "Normal file picker. There it is, the edited one, Sep 29. There's also an older
miserables.gexf -- probably the original. Not the one he sent me, so I'll ignore it. Tick the
box, Open."

## Step 2 -- pick the file and open it

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"

Saw: a screen called "Open as a new graph". Left list "Tables" with miserables-edited and a red
circle-x next to it. Format box says GraphML, "auto". A red message:
"miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at
node 80, which no node has (lines 590, 611 and 640). A graph file sets its own ids: make each
node id unique and give every edge's ends a node, or choose another file." A blue "Choose
another file..." button. Below: "Nothing to show: nothing was read." At the bottom:
"Load is off: no setting here fixes miserables-edited.graphml", Cancel, and a grayed Load.

Think-aloud: "So it didn't load. Fine -- at least it tells me why, with line numbers. That's
better than our case system, which just says 'error, contact IT'. Two things wrong: id 11 is
used twice, lines 48 and 212. And three connections point at a node 80 that isn't in the file,
lines 590, 611 and 640. And it says flat out nothing on this screen fixes it, so I'm not going
to sit here fiddling with that GraphML dropdown. That's a him problem, not a me problem.

'Node' and 'edge' -- I'm guessing node is a character and edge is a link between two of them.
'Ends' of an edge, OK, the two people it connects. I'd have said 'link' or 'connection', but I
get it."

## Step 3 -- check whether "Match report" says anything more

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "Match report: miserables-edited"

Saw: nothing changed. The "Match report: miserables-edited" line at the bottom is just a heading
with nothing under it.

Think-aloud: "I thought that might be a longer list, like which characters. Nope, empty. Don't
know what it's matching. Whatever, I've got what I need. Stopping here."

## What I'd email my coworker

"Your miserables-edited.graphml won't open. Two problems: (1) two characters both have id 11 --
lines 48 and 212, give one of them a different id; (2) three links point at a character with
id 80 that isn't in the file -- lines 590, 611 and 640. Either add character 80 back or remove
those links. Send it again when fixed."

## Wrap-up

- Did I succeed? Yes. It didn't load, but I know exactly what to tell him, down to the lines.
- Single Ease Question: 6 of 7. Three clicks and the message was right there. I lose a point
  because I had to translate "node", "edge" and "ends" into people and links, and the empty
  "Match report" heading and the "auto" tag looked like they meant something and didn't.
- Would I use this instead of my current tool? Not for my job -- I don't have a graph tool and
  most of my alerts don't need a picture. But if someone handed me a broken file, this told me
  what was wrong faster than anything I use: one screenshot of that red box would go straight
  into an email. What I'd want: a "copy this" button on the error so I can paste it to him
  without retyping line numbers, and the error to name the characters too, not just "id 11" --
  he'll know who 11 is, I won't.

## Observations for the study (in her terms)

- The error is specific and actionable: duplicate id with both line numbers, missing endpoint
  with all three line numbers, and an explicit "no setting here fixes" so she did not try to
  repair it in the app.
- "Match report: miserables-edited" at the bottom reads like an expandable report but shows
  nothing and does nothing when clicked in the failed state. She expected detail there.
- Vocabulary: "node", "edge", "edge's ends" needed translating to characters and links.
- No way to copy the error text; she would screenshot or retype.
- The "Choose another file..." button is the most prominent action, but for her the job was to
  report, not to pick another file; the older miserables.gexf in Downloads could tempt someone
  to load the wrong (unedited) file instead.
