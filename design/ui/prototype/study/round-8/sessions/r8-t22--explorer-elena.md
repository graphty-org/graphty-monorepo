# Session: leave two reminders (Valjean, and the Javert-Valjean tie) -- Explorer Elena

Task as given: "The Les Miserables network is open (example data, not your own). Leave yourself
two reminders for later: one on Valjean (why he matters to your reading) and one on the tie
between Javert and Valjean. Then check that each reminder sits with the right thing and say when
it was written."

Start screen: shots/tasks/r8-t22/01.png. All renders below are in
tmp/round-8-sessions/r8-t22--explorer-elena/. Every command was run from
design/ui/prototype as
`timeout 120 node app-b/study.mjs --try <abs path>/NN.png task:r8-t22 <steps>`;
only the steps are listed.

## Think-aloud

**01 (start).** OK, a picture of dots and lines, lots of panels. Left side is a long list of
things I don't recognize (PageRank, Louvain, Link prediction...). I do see "Notes" in the left
rail and a "1 note" link at the top. But I want the note *on Valjean*, so my instinct is: click
Valjean in the picture first, like clicking a bar in our dashboard.

**02** -- `--click "Valjean"`
Valjean got a ring around him, "Valjean, 36 connections" under the picture, and a little row of
icon buttons popped up. The right side now says "Valjean / Node". The last icon looks like a
speech bubble with a plus. That smells like "comment".

**03** -- `--click "Valjean" --hover "Add note"`
Resting on the bubble says "Add note N". Good, that's what I hoped. (Not sure what the N is --
a keyboard shortcut I guess.)

**04** -- `--click "Valjean" --click "Add note"`
The left panel turned into a Notes list, and at the top there's a box that says "Note on:
Valjean" with an x. That is exactly what I wanted to see -- it tells me who the note is about
before I write it. There's a line saying notes are saved without a name and I could add my name
in Settings. Fine, it's just for me.

**05** -- `... --click "Write a note"` failed: "nothing on screen is called 'Write a note'".
I just started typing instead, the box already had the cursor:
`--click "Valjean" --click "Add note" --type "The hub: almost every storyline runs through him. Start every reading here."`
Text is in the box, Save lights up blue.

**06** -- `... --click "Save"`
Saved. Top of the list: my text, a little "Valjean" tag, "Oct 2, 2026, 19:28". The count went
from 7 to 8 notes. One down.

Now the tie between Javert and Valjean. Problem: in the picture Javert sits practically on top
of Valjean -- the labels overlap ("Valjean Javert") and I cannot see a line between them, let
alone click it with a trackpad. So I look for a list.

**07** -- `... --click "Save" --click "Edges"`
A table slid up from the bottom: source, target, Notes, value. Row 5 is Javert / Valjean / 17,
and it already has a little "1" speech bubble -- someone (the example?) left a note on it. I
want to click that row.

**08** -- `... --click "Edges" --click "Javert"`
Wrong. It jumped to Javert the *person* ("Javert, 17 connections"), the table flipped back to
Nodes. Annoying -- I clicked the word Javert in the edge row, I meant the row.

**09** -- `... --click "Edges" --click "Javert Valjean 1 17"` -- "nothing on screen is called"
that. I couldn't find a way to pick the row itself rather than a name in it. Giving up on the
table.

**10** -- `... --click "Save" --click "Javert -- Valjean"`
At the bottom of the Notes list there's an older note "They share 17 chapters..." with a tag
"Javert -- Valjean" that has a little line icon. I clicked the tag. The right side now says
"Javert -- Valjean / Edge", ends Javert and Valjean, value 17, and "Notes: 1 note". So that's
the tie itself. I found it by accident, through somebody else's note -- I would never have found
it if that example note weren't there.

**11** -- `... --click "Javert -- Valjean" --click "Add note" --type "The chase. Is this the strongest rivalry in the book, or just shared scenes?"`
(The tool said two "Add note" buttons; it used the plus at the top of the Notes panel.) The box
says "Note on: Javert -- Valjean". Good, it picked up what I had selected.

**12** -- `... --click "Save"`
Saved. Top of the list: "The chase..." with tag "Javert -- Valjean", "Oct 2, 2026, 19:30".
Below it my Valjean note, tag "Valjean", "Oct 2, 2026, 19:30". 9 notes now. The right panel for
the tie says "2 notes" -- mine plus the old one.

Checking: each note shows its tag right under the text -- one says Valjean (a dot icon, a
person), one says Javert -- Valjean (a line icon, the connection). And the tie's own panel
counts my note. Both were written today, Oct 2, 2026, around 19:28-19:30.

**13** -- `... --click "Save" --click "Valjean" --click "Data"`
I wanted to see Valjean's own page list my note. "Data" took me to a whole different Data screen
on the left instead of the Data tab on the right. Never mind.

**14** -- `... --click "Save" --click "Valjean"`
Valjean selected again; left side went back to the big Graph list. The right side's "Why this
look" mentions "Notes -- Label" but I didn't see "1 note" for Valjean there on the Style tab.
I'm satisfied from the Notes list, so I stop.

One confusion: there's also an older note "Javert follows Valjean through the whole book" tagged
with *two people* (Valjean, Javert) instead of the tie. Is that a note on the tie or not? To me
those look like the same thing. I'm trusting the line icon.

## Outcome

- Succeeded? Yes, I think so: two notes, one tagged Valjean and one tagged Javert -- Valjean,
  both dated Oct 2, 2026 (19:28 and 19:30).
- Single Ease Question: 5 of 7. The Valjean note was easy (click him, bubble, type, save). The
  tie was hard: the line is invisible under two overlapping dots, clicking a row in the edge
  table selects a person, and I only reached the tie through an existing note's tag.
- Would I use this instead of my current tool? For leaving myself notes on a chart, yes over
  Miro sticky notes -- the note knows what it's about and the thing knows it has notes. But if
  the example note hadn't been there I'd have been stuck on the connection, and I'd want a plain
  "add a note about the connection between these two" when two people are selected.
