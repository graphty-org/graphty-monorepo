# Session: leave two notes (Valjean, and the Javert-Valjean link) -- Marcus, criminal intelligence analyst

Task as given: "The Les Miserables network is open (example data, not your own). Leave yourself two
reminders for later: one on Valjean (why he matters to your reading) and one on the tie between
Javert and Valjean. Then check that each reminder sits with the right thing and say when it was
written."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t22--intelligence-analyst/. Abbreviation below: D = that folder.

## Start screen (shots/tasks/r8-t22/01.png)

"OK, novel characters on a link chart. All orange dots, no icons, but fine, it is demo data. Left
side has a big list -- PageRank, Louvain, shortest paths, a watchlist. There is a 'Notes 4 items'
row and a 'Notes' button on the far left rail. Before I go hunting in menus I'll do what I do in
i2: click the guy."

## Step 1 -- click Valjean

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t22 --click "Valjean"

"Valjean is ringed, right panel says Valjean, Node. Little strip pops up under the chart: 'Valjean,
36 connections' and five icons with no words on them. Last one looks like a speech bubble with a
plus. Let me rest the pointer on it."

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t22 --click "Valjean" --hover "Add note"

"Tooltip says 'Add note', shortcut N. Good, that's what I wanted. Icons with no labels are a pain
on a projector, but the tooltip is plain English."

## Step 2 -- Add note on Valjean

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t22 --click "Valjean" --click "Add note"

"Left panel flipped to Notes. Box at the top: 'Note on: Valjean' with an x, and 'Write a note'.
That's the right thing -- it already knows who I'm writing about. It also says notes are saved
without a name and to add my name in Settings. In my shop every product has an author; I'd want
that on by default, not buried in settings. Not today's problem."

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t22 --click "Valjean" --click "Add note" \
      --type "Valjean is the hub - 36 connections, ties the crews together. Key subject for the brief." \
      --click "Save"

"Saved. Top of the list: my text, a chip 'Valjean', and 'Oct 2, 2026, 19:26'. Count went from 7
notes to 8. That's one."

## Step 3 -- find the Javert-Valjean link

"Now the line between Javert and Valjean. Those two dots are practically on top of each other in
the middle of the hairball -- I'm not going to try to hit that line with a mouse. There's an
'Edges' tab down the bottom. Links table, that I understand."

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t22 [...steps 1-2...] --click "Edges"

"Table: 254 edges, source, target, Notes, value. Fifth row: Javert / Valjean, value 17, and it
already has a note marker '1'. Click the row."

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t22 [...] --click "Edges" --click "Javert"

(Tool reported: "Javert" matched a link and a table row; it clicked the first.)

"That's not what I wanted. It grabbed Javert the person -- right panel says Javert, Node -- and the
table jumped back to Nodes. I clicked in the links table and got a person. Annoying."

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t22 [...] --click "Edges" --click "Javert Valjean 1 17"

(Tool: nothing on screen is called that.)

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t22 [...] --click "Edges" --click "17"

(Tool: matched two rows, clicked the Courfeyrac/Enjolras one.)

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t22 [...] --click "Edges" --click "1"

"Clicked the little note marker on the Javert row. Row looks highlighted but the right panel still
says Valjean, Node. So the table row does not select the link? Or I just can't tell. Three tries
and I still don't have the line selected. This is where I start asking 'is there a way to just...'"

"Then I notice: down at the bottom of the notes list there's an older note, 'They share 17
chapters... edge to keep in the pursuit figure', with a chip 'Javert -- Valjean'. Those chips
looked clickable on my own note. Try that."

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t22 [...] --click "Edges" --click "Javert -- Valjean"

"There it is. Right panel: 'Javert -- Valjean, Edge', ends Javert and Valjean, value 17,
undirected, 1 note. The floating strip shrank to three icons, speech bubble still on the end. I got
here through somebody else's old note, which is luck, not design. If that note hadn't existed I
don't know how I'd have selected the line."

## Step 4 -- note on the link

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t22 [...] --click "Javert -- Valjean" --click "Add note" \
      --type "Javert-Valjean: pursuer and target, 17 shared chapters. Strongest adversarial link - keep on the chart." \
      --click "Save"

(Tool: "Add note" matched two buttons; clicked the first.)

"Saved. Top of the list now: my link note with chip 'Javert -- Valjean', Oct 2, 2026, 19:29. Under
it my Valjean note, chip 'Valjean', Oct 2, 2026, 19:28. '9 notes in this graph.' Right panel for
the link says '2 notes -- Open in Notes', up from 1."

## Step 5 -- check

"Each one sits with the right thing: the Valjean note has the Valjean person chip, the link note has
the Javert -- Valjean link chip with the little line icon, and the link's own panel counts it. The
Nodes table shows Valjean with 3 notes -- the two older ones that name him plus mine -- so the link
note didn't get dumped on Valjean the person. That's correct.

When written: Valjean note Oct 2, 2026 at 19:28 (it read 19:26 the first time I looked; the clock
just moved between my looks), link note Oct 2, 2026 at 19:29. No time zone and no author. For a
reminder to myself that's fine. For anything that goes in a case file I want the zone and my name
stamped on it automatically."

## Verdict

- Succeeded? Yes. Both notes saved, each attached to the right thing, both dated.
- Single Ease Question: 4 of 7. The person note was two clicks and obvious. The link note was a
  fight: clicking in the links table selected the person instead of the link, and I only got the
  link selected by clicking a chip on someone else's old note.
- Would I use this instead of i2? Not for this alone. Notes pinned to an entity and to a link, with
  a date, is what i2 calls a source note and it's what I want. But I need to be able to pick a link
  straight out of the links table, the note needs an author and a time zone by default, and a
  reliability grade would be the next thing I'd ask for. Fix the link selection and I'd use it for
  working notes on a case.

## Problems seen

1. Clicking a name in the Edges table selected the node and flipped the table back to Nodes; no
   obvious way to select the link itself from its own table row.
2. The only route I found to select the link was a chip on an existing note -- not discoverable if
   that note had not been there.
3. Notes are unsigned by default (name only via Settings); timestamps carry no time zone.
4. Context strip icons have no text labels; tooltips needed.
