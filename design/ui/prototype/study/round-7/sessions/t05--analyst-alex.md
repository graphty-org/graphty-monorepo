# Session: write a note attached to Valjean -- Analyst Alex

Task given: "You have just realized why Valjean matters to your argument. Write the thought down so
that next week you, or a colleague, can come back to it attached to him. You have never typed your
name into this program. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter."

All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t05--analyst-alex/.

## Start screen (shots/tasks/t05/01.png)

Graph colored by PageRank, sized by degree. Valjean is the big dark one in the middle. Left panel
has a list -- Selection, Notes 4, PageRank, Louvain, Shortest paths, Watchlist. Left rail also has
a "Notes" icon. Two ways in already. In Gephi I'd paste this into a text file next to the .gephi
project, honestly. I want it on the node, so I'll start from the node.

## Step 1 -- click Valjean

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t05--analyst-alex/01.png task:t05 --click "Valjean"

Valjean is ringed, a chip says "Valjean, 36 connections" (good, a number), right panel says
Valjean / Node. A little toolbar popped up above the bottom bar: five icons, no words. The last
one looks like a speech bubble with a plus. That's probably a comment or note. Not going to guess
on the other four.

## Step 2 -- hover the speech bubble

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t05--analyst-alex/02.png task:t05 --click "Valjean" --hover "Add note"

Tooltip: "Add note  N". Fine, and there's a key for it. Two clicks from the node, or one if I
remember N.

## Step 3 -- click Add note

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t05--analyst-alex/03.png task:t05 --click "Valjean" --click "Add note"

Left panel switched to Notes. A new card at the top with a "Valjean x" chip already on it, a
"Write a note" box, Save (Ctrl+Enter) and Cancel. That's exactly what I wanted -- it's already
pinned to him, I didn't have to pick him from a list. Below it are older notes, and one of them is
"Highest betweenness in the book, 0.57. Next is Myriel at 0.177" with a Valjean chip and "Cites
Betweenness". Someone already wrote my kind of note. Good sign that the number travels with it.

Notes I make: nothing asks who I am. The older notes don't show an author either, just "Yesterday",
"Sep 28". For me that's fine. For a colleague opening this next week, they won't know which note is
mine versus theirs. In a shared deck that matters -- I'd want initials at least. But I'm not going
to go hunting for a profile setting to find out.

## Step 4 -- type the thought and save

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t05--analyst-alex/04.png task:t05 --click "Valjean" --click "Add note" --click "Write a note" --type "Valjean is the bridge: every route between the Myriel group and the barricade group goes through him. Remove him and they split." --click "Save"

Tool said: nothing on screen is called "Write a note"; nothing on screen is called "Save". The
mockup won't let me type. Save is grayed out because the box is empty -- that's correct, I
wouldn't want an empty note.

## Step 5 -- try the shortcut it advertises

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t05--analyst-alex/05.png task:t05 --click "Valjean" --click "Add note" --key "Control+Enter"

Nothing happens, same screen. Expected, box is empty. I'll stop here: in the real thing I'd type
the sentence and hit Ctrl+Enter.

## Wrap-up

Did I succeed? Mostly yes. I got to a note already attached to Valjean in three steps (click node,
click the bubble, write). I couldn't actually type and save it in this mockup, so I didn't see the
saved state -- I don't know for sure it shows up on Valjean next week. The right panel's "Why this
look" lists "Notes -- Label below", which hints notes put something on the node itself, and the
other notes have clickable Valjean chips, so I'd guess I can get back from either side.

What took longest: figuring out which of the five unlabeled icons was the note. Icons with no
words; I had to hover.

Concerns:
- No author on notes. "Next week, a colleague" -- they won't know who wrote what, and I was never
  asked my name. That would bother me the first time two of us disagree in the notes.
- I didn't see a way to cite a number (the betweenness note "Cites Betweenness" -- I don't know how
  that got there or whether mine will).
- Would the note survive if I reload the data next month? No idea from here. That's the Gephi
  scar.

Single Ease Question: 6 out of 7. The path was short and the pre-attached Valjean chip was the
nicest thing; I lose a point for the mystery-meat icon bar.

Would I use this instead of my current tool? For this part, yes -- right now my "notes" are a text
file next to the Gephi project and a comment in the notebook, and neither is attached to the node.
But I'd only rely on it if the notes come back after a save and reopen, and if I could export them
(with the numbers) next to the CSV. Until I see that, the text file stays.
