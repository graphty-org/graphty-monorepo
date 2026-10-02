# Session: leave a note on the Valjean-to-Javert chain -- Marcus, criminal intelligence analyst

Task as given: "Your team already worked out the chain of characters linking Valjean to Javert
with as few go-betweens as possible. Leave a reminder attached to that chain as a whole -- not to
either man -- saying it should be checked against the book. You have never typed your name into
this program."

Start screen: shots/tasks/t39/01.png. Renders: tmp/round-7-sessions/t39--intelligence-analyst/.
All commands run from design/ui/prototype.

## Step 1 -- find the chain

Looking at the start screen. Left list has "Shortest paths" and under it "Valjean to Jav..." with
a 2 next to it, and "Myriel to Javert" with a 3. That first one is the one the team ran. Clicking it.

    timeout 120 node app-b/study.mjs --try .../t39--intelligence-analyst/01.png task:t39 --click "Valjean to Jav"

Right panel: "Valjean to Javert -- Path from Shortest paths". 2 nodes, 1 edge, 17 shared
chapters. So there are no go-betweens at all, they're linked directly. Fine, that is the chain.
Members in path order, start and end. At the bottom: "Notes -- No notes. Add note (N)." That panel
is about the path, so a note from here should hang on the path.

## Step 2 -- Add note

    timeout 120 node app-b/study.mjs --try .../02.png task:t39 --click "Valjean to Jav" --click "Add note"

Left side flipped to Notes. A draft box at the top already tagged "Valjean to Javert" with the
orange path swatch, a "Write a note" box, Save (gray) with Ctrl+Enter, Cancel. Good -- it's tagged
to the chain, not to one man. The other notes below use a little person icon for Valjean and
Javert alone, and a different icon for an edge, so I can tell the difference.

## Step 3 -- typing (fumbled)

    timeout 120 node app-b/study.mjs --try .../03.png task:t39 --click "Valjean to Jav" --click "Add note" --type "Check this chain against the book." --click "Save"
    -> nothing on screen is called "Save"
    timeout 120 node app-b/study.mjs --try .../04.png task:t39 --click "Valjean to Jav" --click "Add note" --click "Write a note" --type "Check this chain against the book." --click "Save"
    -> nothing on screen is called "Write a note"; nothing on screen is called "Save"

Box stayed empty both times. (This was me fumbling with how to type, not the screen. The cursor
was already in the box.)

    timeout 120 node app-b/study.mjs --try .../05.png task:t39 --click "Valjean to Jav" --click "Add note" --key C --key h --key e --key c --key k

"Check" in the box, Save turned blue. The cursor lands in the box on its own -- good, that is how
it should work.

## Step 4 -- write and save

    timeout 180 node app-b/study.mjs --try .../06.png task:t39 --click "Valjean to Jav" --click "Add note" --key C --key h ... (one key per letter of "Check this chain against the book") --key Control+Enter

Saved. Top of the Notes list: "Check this chain against the book", chip "Valjean to Javert" with
the orange path swatch, "Just now". Right panel for the path now reads "1 note . Add note". Done.

It never asked my name, which is what I wanted for a quick reminder. But the note shows no author
either -- just "Just now". If this goes to a colleague on a shared case, "who wrote this, when" is
the first question. On my own machine, fine.

## Verdict

- Succeeded? Yes. The note sits on the chain (path chip, path color), and the path's own panel
  counts it. Not on Valjean, not on Javert.
- Single Ease Question: 6 of 7. Click the chain, click Add note, type, Ctrl+Enter. The only drag
  was my own fumbling with the keyboard.
- Would I use it instead of my current tool? For this job, yes over i2 -- in i2 I'd drop a text
  box next to the links and it's attached to nothing; move the chart and it floats off. Here the
  note is tied to the result itself. Two things I'd still want before it goes in a case file: the
  note should show who wrote it, and a reminder like "check against the source" should be a
  real follow-up flag I can filter on, not just free text. Also, "chain with as few go-betweens as
  possible" came back as two people and one link -- I'd want the screen to say plainly "direct
  link, no intermediaries" so nobody briefs it as a chain.
