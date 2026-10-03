# Session: a broken GraphML file from a coworker -- the class-project student (Dev)

Task as given: "You have never used this program before. A coworker emailed you an edited copy of
a network file of Les Miserables characters; it is saved as miserables-edited.graphml in your
Downloads folder. Bring it into the program and either get to a point where you can carry on
working, or know exactly what to tell your coworker to fix."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--class-project-student/ (written D below).

## 01 -- start screen (shots/tasks/r8-t05/01.png)

Reading everything first. "Start: Open project or file..., New from data..., or drop a file."
"Files are read on this computer and never uploaded" -- good, my professor makes a big deal of
that. On the right are samples, and one is literally Les Miserables. Tempting, but my coworker
edited a copy, so I need THEIR file, not the sample. There is a big box at the bottom asking about
usage data. I just want it gone. "No thanks."

My file is a file, so "Open project or file..." is the obvious one. "New from data" sounds like
starting from a spreadsheet, which is not what I have.

## 02 -- the file chooser

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t05 --click "No thanks" --click "Open project or file..."

A "Choose files" box showing Downloads. There it is: miserables-edited.graphml, 18 KB, Sep 29.
There is also a miserables.gexf -- probably the original? Not what I was asked to open. The
.docx is grayed out, which makes sense. I tick the graphml and press Open.

## 03 -- the error

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"

OK, a lot of screen. Top says "Open as a new graph". There is a red X and a message:

"miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at
node 80, which no node has (lines 590, 611 and 640). A graph file sets its own ids: make each
node id unique and give every edge's ends a node, or choose another file."

Below: "Nothing to show: nothing was read." And at the very bottom, "Load is off: no setting here
fixes miserables-edited.graphml", with Load grayed out.

My first reaction: so it did not work at all. Not even the good parts? I get that two people
have the same number, and some lines point at a person 80 who does not exist. Honestly that is
pretty readable -- it even gives me line numbers. But I do not know what an "id" is in a graphml
file exactly; I assume it is the number each character gets. "Match report" at the bottom is
empty and I do not know what it means.

What I want is "just load it and skip the broken bits", like Excel would. Let me see if there is
a setting.

## 04 -- the GraphML dropdown

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "GraphML"

It opened "File settings": Format GraphML (auto), Ids "1 and "1" are one node" (what? that
sentence makes no sense to me -- 1 and 1 are the same, obviously?), and "Stop reading: After 100
errors". That last one sounds like my way out: if I set it to never stop, maybe it reads past
the errors. "Position scale appears here once a column is a Position" -- no idea, ignoring it.

## 05 -- trying Load anyway

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "Load"

(The tool reported: could not click "Load" -- it is grayed out.) Yep, I could not press it.
Same screen as before.

## 06, 07 -- "Never: read every record"

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "GraphML" --click "After 100 errors"
    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "GraphML" --click "After 100 errors" --click "Never: read every record"

Options: after 10, 100, 1,000 errors, or "Never: read every record". I picked Never. Nothing
changed: Load is still gray and the bottom still says "no setting here fixes" the file. OK, so
it meant that literally. That was my second wrong try, so I stop poking. In hindsight the bottom
line had already told me no setting would help; I just did not believe it, because the settings
box was right there and "Stop reading after errors" really looks like it should let me skip bad
records. If it is never going to help with this, why is it offered?

## Where I stopped

I cannot carry on with this file. What I would email my coworker:

"Hey -- the graphml you sent won't open. Two characters both have id 11 (lines 48 and 212 in the
file), so one needs a different id. And three edges (lines 590, 611 and 640) connect to node 80,
which doesn't exist -- either add node 80 back or fix those edges. Can you resend?"

I am fairly confident in that, because the app gave me the exact lines. I would not know how to
fix it myself (I do not edit XML), so sending it back is right for me.

## Debrief

- Did I succeed? Yes, I think so -- I know exactly what to tell my coworker. I did not get a
  graph, but the task said that was allowed.
- Single Ease Question: 5 out of 7. Opening the file was easy and the error message was clear
  and specific. I lost points because I wasted two tries on settings that could never help, and
  I was annoyed that it would not load the good 99 percent and just flag the broken bits.
- Would I use this instead of my current tool (Gephi, from the tutorial)? Maybe. Gephi would
  probably have loaded something and I would not have noticed the problem until my numbers were
  wrong, which is the thing I am scared of. This told me plainly and with line numbers. But I
  would want a "load anyway and skip the broken lines" option, because the night before a
  deadline I cannot wait for my coworker.

## Observations (participant's own words)

- "Load is off: no setting here fixes ..." is at the very bottom in small gray text; I read the
  big red box first and the settings box after, and only believed the bottom line after trying.
- "Stop reading: Never: read every record" sounds like it skips errors; it does not, here.
- "Ids: 1 and "1" are one node" means nothing to me.
- "Match report" with nothing under it -- not sure what it is for.
- I never found out what "Makes: Nothing yet" at the top means.
