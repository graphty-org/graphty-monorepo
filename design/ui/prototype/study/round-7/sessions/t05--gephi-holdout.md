# Session: attach a thought to Valjean -- the Gephi holdout (Dr. Mara Lindqvist)

Task as given: "You have just realized why Valjean matters to your argument. Write the thought down
so that next week you, or a colleague, can come back to it attached to him. You have never typed
your name into this program. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter."

Renders are in design/ui/prototype/tmp/round-7-sessions/t05--gephi-holdout/. Every command was run
from design/ui/prototype, with D set to that render folder.

## Step 1 -- the start screen (shots/tasks/t05/01.png)

Mara: "Les Mis, the textbook co-appearance graph. Fine. In Gephi there is nowhere to put a thought
on a node. I would add a string column called 'memo' in the Data Laboratory and type into the cell,
and my colleague would never find it. Here there is a 'Notes' row with a 4 in the left list and a
Notes icon on the far left, so somebody has thought about this. But I want it on HIM, so I start
with him. Valjean is the big dark node in the middle -- click him."

## Step 2 -- select Valjean

    timeout 120 node app-b/study.mjs --try $D/02.png task:t05 --click "Valjean"

Mara: "Selected, 'Valjean, 36 connections' -- correct, degree 36 is what I remember for him. The
right panel is now about Valjean. A little toolbar appeared over the canvas with five icons and no
words. The last one looks like a speech bubble with a plus. I rest the pointer on it."

## Step 3 -- hover the speech-bubble icon

    timeout 120 node app-b/study.mjs --try $D/03.png task:t05 --click "Valjean" --hover "Add note"

Mara: "'Add note', shortcut N. Good. An icon I had to hover to read, but the tooltip is one line and
it has a keyboard key, which I will actually use."

## Step 4 -- Add note

    timeout 120 node app-b/study.mjs --try $D/04.png task:t05 --click "Valjean" --click "Add note"

Mara: "The left panel switched to a Notes list with a composer on top. It is already tagged with a
'Valjean' chip, with an x to remove it, so I did not have to say who it is about. 'Write a note',
Save with Ctrl+Enter, Cancel. Under it the existing notes, several also tagged Valjean, and some
'Cite' a PageRank or Betweenness run -- that last bit I like: a note that says which computation it
was made against is exactly what I lack in my lab notebook."

## Step 5 -- try to write (test harness friction, not the product)

    timeout 120 node app-b/study.mjs --try $D/05.png task:t05 --click "Valjean" --click "Add note" --click "Write a note" --type "Valjean is the bridge: ..."
    -> nothing on screen is called "Write a note"
    timeout 120 node app-b/study.mjs --try $D/06.png task:t05 --click "Valjean" --click "Add note" --type "Valjean is the bridge: ..."
    -> box still empty
    timeout 120 node app-b/study.mjs --try $D/07.png task:t05 --click "Valjean" --click "Add note" --click "Save"
    -> nothing on screen is called "Save" (it is disabled while the box is empty)
    timeout 120 node app-b/study.mjs --try $D/08.png task:t05 --click "Valjean" --click "Add note" --key V --key a --key l
    -> "Val" appears in the box, Save turns blue

Mara (in effect): "The cursor is already in the box -- I just type. Save stays gray until there is
text, which is right." (The first three attempts were the session tool, not the app: it has no
typing command, only single keys. In the app the box had focus on open, which is what she would
have relied on.)

## Step 6 -- write and save

    TXT="Bridge: ties every group together"; one --key per character (Space for spaces)
    timeout 180 node app-b/study.mjs --try $D/09.png task:t05 --click "Valjean" --click "Add note" <keys> --click "Save"

Mara: "Saved. It is at the top of the list: 'Bridge: ties every group together', a Valjean chip,
'Just now'. The canvas did not move, my selection is still on him, and the right panel's 'Why this
look' lists 'Notes -- Label below', so the note seems to show up as a label on him. That is
attached to the node, not a free-floating sticky. Done, as far as I can tell."

## Step 7 -- where does it live?

    timeout 180 node app-b/study.mjs --try $D/10.png task:t05 --click "Valjean" --click "Add note" <keys> --click "Save" --hover "Local only"

Mara: "The chip at the top says 'Local only', tooltip 'Privacy settings'. Good for my IRB data:
nothing left the machine. But the task said a colleague should be able to come back to it, and
'local only' means my colleague cannot, unless I send them the file. And the note has no author on
it -- 'Just now', no name. I never typed my name, so it could not have one. When three of us write
notes on Valjean, whose is whose? I would want initials at least, or a prompt for a name the first
time I share. I did not try to share; the task did not ask me to and I do not click share on data I
have not cleared."

## Verdict

- Succeeded? Yes. The note is saved, tagged to Valjean, and listed in Notes. Whether a colleague
  can reach it next week depends on the project file going to them, which the screen hints at
  ('Local only') but does not spell out for a note.
- Single Ease Question: 6 of 7. Select, one icon, type, save. I lost a point because the icon had
  no word on it and because there is no author on the note.
- Would I use this instead of Gephi? Not for this alone. Notes pinned to a node and citing the run
  they were made against are something Gephi simply does not have -- I keep this in a text file
  next to the .gephi project and it rots. That earns a second session. It does not move my papers:
  my ForceAtlas2 settings, my GEXF round trip and my course materials are still in Gephi, and I
  have not seen this hold my 23k-node crawl.

## Observations for the designers (her words, summarized)

- Found Add note by hovering an unlabeled icon in a floating toolbar; the tooltip and the N key
  saved it.
- The composer pre-tagged the selected node -- no picking him a second time.
- No author on a saved note; "Local only" leaves it unclear how a colleague would see it.
- "Notes -- Label below" in the node's style explanation was the only sign the note is visible on
  the canvas; she did not check whether the label actually appears.
