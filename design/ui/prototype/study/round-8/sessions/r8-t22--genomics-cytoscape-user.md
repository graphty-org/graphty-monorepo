# Session: leave two reminders (a character and a tie), then check them

Participant: Maren, genomics postdoc who uses Cytoscape (persona: study/personas/genomics-cytoscape-user.md)
Task given: "The Les Miserables network is open (example data, not your own). Leave yourself two reminders for later: one on Valjean (why he matters to your reading) and one on the tie between Javert and Valjean. Then check that each reminder sits with the right thing and say when it was written."
Start screen: shots/tasks/r8-t22/01.png
Renders: tmp/round-8-sessions/r8-t22--genomics-cytoscape-user/01.png to 11.png
All commands were run from design/ui/prototype as `timeout 120 node app-b/study.mjs --try <render> task:r8-t22 <steps>`. Each run replays from the start screen, so the steps below build up.

## Steps and think-aloud

### 1. Click Valjean on the canvas (01.png)
Steps: `--click "Valjean"`

"OK, Les Mis. Not my data, but fine. In Cytoscape I'd just put a comment in a column. There's a Notes icon on the left rail, but I'll start with the thing itself: click Valjean."

Seen: Valjean selected, "Valjean, 36 connections" under him, and a small floating toolbar of five unlabeled icons. The right panel switched to Valjean / Node.

### 2. Rest the pointer on the last icon (02.png)
Steps: `--click "Valjean" --hover "Add note"`
Output: `tooltip: "Add note N"`

"The last icon looks like a speech bubble with a plus. I don't click unlabeled icons blind, so I hover. 'Add note', shortcut N. Good."

### 3. Add note (03.png)
Steps: `--click "Valjean" --click "Add note"`

"The left side turned into a Notes panel. 'Note on: Valjean' is already filled in with a little node icon, and the cursor is in a 'Write a note' box. That's what I want. There are already seven other notes in here from someone else, which is a bit noisy, but fine. It also says notes are saved without a name unless I set it in Settings. I don't care for myself."

### 4. Write and save the Valjean note (04.png)
Steps: `--click "Valjean" --click "Add note" --click "Write a note" --type "Valjean is the hub: 36 ties, he holds the whole cast together. Start the reading here." --click "Save"`
Output: `nothing on screen is called "Write a note"` (the box already had the cursor, so typing went in anyway)

"Saved. It's at the top, with a 'Valjean' chip and 'Oct 2, 2026, 19:27'. Count went from 7 to 8 notes."

### 5. Find the Javert-Valjean edge (05.png)
Steps: `... --click "Save" --click "Edges"`

"Now the tie. On the canvas Javert sits right on top of Valjean, the line between them is a couple of pixels. I'm not trying to click that. In Cytoscape I'd go to the edge table. There's an Edges tab at the bottom."

Seen: the edge table opened. 254 edges, sorted by value. Fifth row: Javert / Valjean, Notes column shows a speech bubble with 1, value 17.

"This is the edge table I know. Javert to Valjean, 17, already has one note on it."

### 6-7. Try to click that row (06.png, 07.png)
Steps: `... --click "Edges" --click "Javert"`
Output: `ambiguous: "Javert" matches 2 controls (link "Javert", tr "Javert Valjean 1 17"); clicked the first`
Then: `... --click "Edges" --click "Javert Valjean 1 17"` -> `nothing on screen is called "Javert Valjean 1 17"`
Then: `... --click "Edges" --click "Javert Valjean"` -> `nothing on screen is called "Javert Valjean"`

"I click Javert in the row, and nothing visible happens. The Javert tag on somebody's old note in the Notes panel seems to have taken the click instead. Tried again on the row. Still nothing. Annoying."

### 8. Switch the left side back to Graph and click the row (08.png)
Steps: `... --click "Save" --click "Graph" --click "Edges" --click "Javert"`

"Let me get that notes list out of the way. Back to the Graph panel, then click Javert in the edge table."

Seen: the row highlighted, footer "Sum of value, 1 row: 17", right panel "Javert -- Valjean / Edge", Selection "1 edge", floating toolbar now three icons including the same note icon.

"There. It's an edge selection, and the panel says so."

### 9. Add note on the edge (09.png)
Steps: `... --click "Javert" --click "Add note"`

"'Note on: Javert -- Valjean' with a curved-line icon, so it's on the tie, not on one of the two characters. Good."

### 10. Write and save the edge note (10.png)
Steps: `... --click "Add note" --type "Pursuit tie: 17 shared chapters. Check if it holds after dropping minor characters." --click "Save"`

"Saved. 9 notes now. Top: my tie note with a 'Javert -- Valjean' chip, Oct 2, 2026, 19:29. Below it my Valjean note with a 'Valjean' chip, also 19:29. In the edge table, the Javert/Valjean row's note count went from 1 to 2. That's the check I trust: the count on the row moved."

### 11. Check the Valjean note lands on Valjean (11.png)
Steps: `... --click "Save" --click "Valjean"`
Output: `ambiguous: "Valjean" matches 10 controls (button "Valjean", link "Valjean", link "Valjean", link "Valjean", tr "Cosette Valjean 31", ...); clicked the first`

"I click the Valjean chip on my note. It jumps back to the Graph panel with Valjean selected, and the node table shows Valjean with 3 notes: two that were already there plus mine. Javert still shows 1, so the tie note didn't get put on Javert the person. That's correct.

But the Graph panel says 'Notes 4 items' and the Notes panel said '9 notes in this graph'. Which one is it? Maybe the 4 is only the ones on the network itself, not on nodes, but nothing says so. In Cytoscape I'd count rows and they'd match."

## Outcome

Did I succeed? Yes, I think so. Two notes: one on Valjean (node chip, counted in his row in the node table) and one on the Javert -- Valjean edge (edge chip, counted in the edge row, not on Javert's node row). Both were written Oct 2, 2026 at 19:29. The Valjean one first said 19:27 and later 19:29, because every replay recreates it.

Single Ease Question: 5 of 7.
- Easy: the note button on the selection toolbar fills in "Note on" for me, and the note-count column in the tables is the check I actually believe.
- Hard: picking the edge. The canvas line is too short to click, and my first click in the edge table seemed to go to the notes list instead. I had to close the notes list to get the row selected. The "4 items" against "9 notes" mismatch made me doubt the count for a second.

Would I use this instead of Cytoscape? For this, partly. Cytoscape has no real "note on a node" at all: I add a text column and type into a cell, and an edge comment is worse. Notes tied to the thing, with a date and a count in the table, are nicer than that. But it's a side feature. I'd use it while exploring, and the paper figure and methods still come from Cytoscape, because that's what the lab protocol and reviewers know. Also, notes are "saved without a name" and the top bar says "Local only". Fine for me, but if I'm sending this to my PI I'd want to know where the notes live before I trust them.

## Problems noticed
1. The Javert -- Valjean edge can't really be picked on the canvas: the two nodes overlap, so the line is a few pixels long. I only got it through the edge table.
2. With the Notes panel open, my click on Javert in the edge table didn't select the row. Name chips on other people's notes seem to compete with the table. It worked after switching the left side back to Graph.
3. The Graph panel says "Notes 4 items" while the Notes panel says "9 notes in this graph", with no explanation of the difference.
4. Minor: the notes list already holds seven notes from someone else, mixed in with mine. With no author name ("saved without a name"), I can only tell mine apart by the date.
