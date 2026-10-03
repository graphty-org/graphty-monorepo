# Session: open a coworker's edited GraphML file -- Explorer Elena

Task given by the moderator: "You have never used this program before. A coworker emailed you an
edited copy of a network file of Les Miserables characters; it is saved as
miserables-edited.graphml in your Downloads folder. Bring it into the program and either get to a
point where you can carry on working, or know exactly what to tell your coworker to fix."

Participant: Explorer Elena (first-time graph user, product manager). Clock: first contact.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--explorer-elena/.

## 01 -- start screen (shots/tasks/r8-t05/01.png)

> OK. Start, recent projects, samples. There's a big box at the bottom asking about usage data --
> "No thanks", get that out of my way. "Open project or file..." is the obvious one, it has Ctrl+O
> next to it like every other app. I could also drag it in, but let's just click.

## 02 -- Open project or file

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t05 --click "No thanks" --click "Open project or file..."

Screen: a "Choose files" dialog showing Downloads: miserables-edited.graphml (18 KB, Sep 29),
miserables.gexf, Patent citations 1999-2001.graphty, and a grayed-out chapter-notes.docx. Open is
disabled until something is ticked.

> There it is, miserables-edited.graphml. There's also a miserables.gexf -- I guess that's the
> original? Checkboxes, so I tick the one I want and hit Open.

## 03 -- open the edited file

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"

Screen: not a picture. A data screen titled "Open as a new graph", a "Tables" list with
miserables-edited and a red x icon, a red-x message box, "Nothing to show: nothing was read.", and
at the bottom "Load is off: no setting here fixes miserables-edited.graphml" with a grayed-out
Load button.

> Oh. No picture. Red x. OK, what does it say...
> "miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at
> node 80, which no node has (lines 590, 611 and 640)."
> Hmm. I don't really know what a "node" or an "edge" is, but... two things both called 11, and
> some lines pointing at an 80 that isn't there. And it gives me line numbers. That I can just
> copy and send to him.
> Second line: "make each node id unique and give every edge's ends a node, or choose another
> file." So it's his file, not something I did. Good -- I was about to assume I opened it wrong.
> And the bottom says no setting here fixes it, so I shouldn't go hunting for a checkbox. That's
> actually kind of nice to be told.

## 04 -- poke the GraphML box anyway

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "GraphML"

Screen: a "File settings" pop-up: Format GraphML (auto), Ids "1 and "1" are one node", Stop
reading "After 100 errors", and a line about Position scale.

> I clicked the GraphML thing in case it was the wrong type. Nope, this is settings. "1 and "1"
> are one node"? I don't know what that means. I'm not touching this. It already told me nothing
> here fixes it. Close.

## 05 -- Choose another file...

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "Choose another file..."

Screen: a small dark pop-up at the top left, over the file name and the start of the error:
"Choose a file -- No other data files in this folder".

> Maybe I can just keep working with the old one, the .gexf, while he fixes his. ...
> "No other data files in this folder"? But I literally just saw miserables.gexf sitting in
> Downloads a minute ago. Is that not a data file? Did it move? Huh.
> And it's covering the error message I was reading.
> Whatever. I'm not going to fight it. I know what to send him.

Engagement dropped here; she stopped trying new things.

## What she would send the coworker

> "Hey -- the file you sent won't open. It says there are two characters with the same id, 11
> (lines 48 and 212), and three connections that point at an 80 that doesn't exist (lines 590,
> 611 and 640). Can you fix those and resend?"

## Debrief

- Succeeded? "Yes, I think so. It didn't open, but I know exactly what to tell him, with line
  numbers. I couldn't get to a point where I keep working, though -- the 'choose another file'
  said there were no other files, which I don't believe."
- Single Ease Question: 5 of 7. "Finding the file and the reason was easy. The words 'node' and
  'edge' I had to guess at, the settings box was gibberish, and the other-file thing was weird."
- Would she use it instead of her current tool? "Not yet -- I didn't actually see anything. But I
  liked that it told me whose problem it was and where, instead of quietly dropping stuff. Gephi
  never got that far for me."

## Observations (for the session runner)

- The error message was read and understood in its first line; the line numbers made it
  forwardable. "node", "edge" and "id" were jargon to her, but the numbers carried the meaning.
- "Load is off: no setting here fixes ..." stopped her from hunting through settings; she opened
  File settings once anyway and closed it as unreadable ("1 and "1" are one node").
- "Choose another file..." said "No other data files in this folder" while the Downloads dialog
  had just shown miserables.gexf. She read this as the app contradicting itself, and it ended her
  attempt to carry on with the original file. The pop-up also covered the error text.
- No canvas and no picture at any point; for her, nothing "loaded".
