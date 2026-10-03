# Session: open a coworker's edited GraphML file -- the recipe recipient (Tom)

Task given by the moderator: "You have never used this program before. A coworker emailed you an
edited copy of a network file of Les Miserables characters; it is saved as miserables-edited.graphml
in your Downloads folder. Bring it into the program and either get to a point where you can carry
on working, or know exactly what to tell your coworker to fix."

Participant: Tom, a lab manager who opens files other people send him and never builds networks.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--recipe-recipient/.

## Start screen (shots/tasks/r8-t05/01.png)

> Big box at the bottom about usage data. "Your data is yours, but please help us." I don't share
> anything from this laptop without asking IT, so: No thanks.
>
> Top left: "Open project or file...". That's what I want. Under it, "Files are read on this
> computer and never uploaded." Good, that's the first thing I'd have asked. And "Local only" up in
> the corner. Fine.
>
> There's a Les Miserables sample on the right too. That's not hers though, that's theirs. I want
> the one she sent me.

## Step 1 -- dismiss the banner, open the file picker

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t05 --click "No thanks" --click "Open project or file..."

Screen: a "Choose files" box listing Downloads: miserables-edited.graphml (18 KB, Sep 29),
miserables.gexf, Patent citations 1999-2001.graphty, and a grayed-out chapter-notes.docx.

> There it is, miserables-edited.graphml, Sep 29. That's hers. Tick it, Open.

## Step 2 -- pick the file and open it

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"

Screen: a whole new screen, "Open as a new graph". Left, a "Tables" list with miserables-edited and a
red circle beside it. A red x message across the top:

"miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at
node 80, which no node has (lines 590, 611 and 640)."

Second line: "A graph file sets its own ids: make each node id unique and give every edge's ends a
node, or choose another file." A blue "Choose another file..." button. Below: "Nothing to show:
nothing was read." At the bottom: "Load is off: no setting here fixes miserables-edited.graphml",
Cancel, and a grayed Load.

> OK. No picture. That's not what she sent, but it's not pretending either.
>
> I read the first line, and the first line is the whole answer: two things called 11, at lines 48
> and 212, and three connections pointing at an 80 that isn't there, lines 590, 611 and 640. That I
> can paste straight into an email. I don't know what a "node id" is exactly, but she will, and the
> line numbers mean she doesn't have to hunt.
>
> Is it me or the file? It says the file. And down the bottom, "no setting here fixes" it. So I'm
> not going to sit here fiddling. Good, that's honest.
>
> Lots of stuff on this screen I don't need: "Tables", "Makes / Nothing yet", that GraphML box
> with "auto" next to it, "Match report" with nothing under it. I don't know what any of that is
> and I'm not touching it. The empty "Match report" heading made me wonder for a second whether
> something was supposed to be there.
>
> The left side icons say Graph, Data, Views, Notes, Assistant. Not going near those today.

## Step 3 -- leave without changing anything

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "Cancel"

(The tool reported two controls called Cancel and clicked the first.)

Screen: back on the start page, but the "Choose files" box is open again, with a black note at the
bottom: "Load canceled: nothing was loaded", and an Undo button.

> "Nothing was loaded." Good, I didn't break anything and her file is still her file.
>
> But why is the file box open again? I pressed Cancel, I wanted out. And "Undo" next to "nothing
> was loaded" -- undo what? Undo the canceling? I'm not pressing that. I'll close this box with the
> X and that's it.

## Wrap-up

**Did I succeed?** Yes, the second half of the task: I know exactly what to tell her. Email:
"The program won't open it. It says there are two characters with the id 11 (lines 48 and 212),
and three connections go to an id 80 that doesn't exist (lines 590, 611 and 640). Can you fix
those and resend?" I can't carry on working with it, but that's on the file, and the screen said
so.

**Single Ease Question (1-7):** 6. Opening it was three clicks and the message told me what was
wrong and where. Lost a point because after Cancel the file box came back up with an "Undo" I
didn't understand, and the screen with the error had a lot of empty boxes and words I didn't need.

**Would I use this instead of what I do now?** For this, yes over Cytoscape -- no install, it said
up front nothing gets uploaded, and the error was in English with line numbers instead of some
"NumberFormatException". But honestly, what I do now is ask her to send a PNG and an Excel file,
and I'd still have to do that today because I never saw the network. I'd use it again if she sends
a file that actually opens.
