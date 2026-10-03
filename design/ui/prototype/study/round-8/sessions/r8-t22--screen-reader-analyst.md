# Session: notes on Valjean and on the Javert -- Valjean tie (screen-reader analyst, Morgan)

Task as given by the moderator: "The Les Miserables network is open (example data, not your own).
Leave yourself two reminders for later: one on Valjean (why he matters to your reading) and one on
the tie between Javert and Valjean. Then check that each reminder sits with the right thing and say
when it was written."

All commands were run from `design/ui/prototype`. `D` is
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t22--screen-reader-analyst`.
Every run replays from the start screen.

## Start (shots/tasks/r8-t22/01.png)

Page has a left strip of buttons: Graph, Data, Views, Notes, Assistant. Good, they have names.
There's a "Graph" panel with a tree of rows, a picture in the middle I'll ignore, and something on
the right about PageRank. "Local only" near the top. Fine, it's example data anyway. "Reminders"
-- nothing is called that. "Notes" is the nearest word. I'll go there.

## 02 -- open Notes

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t22 --click "Notes"

Tool warned "Notes" matches two things, a button and a tree row also called "Notes". I meant the
button. Two things with the same name, one tab stop apart -- I'd hear "Notes" twice and have to
guess. It took the button.

Notes panel: "7 notes in this graph", then a list. Each note has text, chips naming what it's on
("Valjean", "Javert -- Valjean", "Community 3"), and a date like "Sep 28, 2026, 12:30". Someone has
already written about Valjean and about the Javert tie. So I'll have to tell mine apart from these
later. There's an unlabeled-looking plus at the top.

## 03, 04 -- what is the plus?

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t22 --click "Notes" --hover "New note"
    -> nothing on screen is called "New note"
    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t22 --click "Notes" --hover "Add note"
    -> tooltip: "Add note N"
    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t22 --click "Notes" --click "Add note"

First guess at the name was wrong; second was "Add note", shortcut N. It opened a form: "Note on:
PageRank" with a remove x, an empty "Write a note" box, Save (Ctrl+Enter), Cancel.

PageRank? I didn't ask for PageRank. It grabbed whatever row was highlighted when I came in. If I
hadn't read the "Note on" line I'd have filed my Valjean note on a measure. That's a trap. There's
no obvious "add a thing" control next to it, only the x. I'll cancel in my head and pick Valjean
first, the way I'd do it from a table.

## 05, 06 -- table, pick Valjean

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t22 --click "Table"
    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t22 --click "Table" --click "Valjean"

Table opens: "77 nodes sorted by degree", a summary line "Valjean is first on all three
measures", column headers label, Notes, group, Degree, Rank by degree, PageRank. A real table with
a Notes column, Valjean shows 2. That's the kind of thing I like.

Selecting Valjean: right side now says "Valjean, Node". A row of icon buttons appeared near the
middle.

## 07, 08 -- Add note with Valjean selected

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t22 --click "Table" --click "Valjean" --hover "Add note"
    -> tooltip: "Add note N"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t22 --click "Table" --click "Valjean" --click "Add note"

Same name, same shortcut, consistent. Form says "Note on: Valjean". That's what I want.

## 09 -- write and save

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t22 --click "Table" --click "Valjean" --click "Add note" --type "Center of the network: first on degree, PageRank and betweenness. Every chapter runs through him." --click "Save"

(First attempt passed the text wrongly to the tool and it refused; my mistake, not the app's.)

Saved. "8 notes in this graph". Mine is at the top, chip "Valjean", "Oct 2, 2026, 19:28". The
table's Notes cell for Valjean went from 2 to 3. Counted in words, in a table cell. Good.

## 10 -- the tie: Edges table

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t22 ... --click "Save" --click "Edges"

"254 edges sorted by value". Columns source, target, Notes, value. Row: Javert, Valjean, 1 note,
17. There it is.

## 11, 12 -- selecting the edge row

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t22 ... --click "Edges" --click "Javert"
    -> ambiguous: link "Javert" (in an old note), row "Javert Valjean 1 17"; clicked the link

Wrong thing. It jumped to the node Javert, and the table flipped back to Nodes on its own. I lost
my place in the edge table. Exactly what I complain about.

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t22 ... --click "Edges" --click "Javert Valjean 1 17"
    -> nothing on screen is called "Javert Valjean 1 17"
    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t22 ... --click "Edges" --click "Javert Valjean"
    -> nothing on screen is called "Javert Valjean"

Two dead ends trying to get onto the edge row itself. The row has a name when I'm told it's
ambiguous, but I can't reach it by that name. On a real screen reader I'd arrow down the column
and press Enter; I can't tell from here whether that works.

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t22 ... --click "Edges" --click "Javert -- Valjean"

That worked, but I got there through the chip on somebody else's old note, not the table. Right
side: "Javert -- Valjean, Edge", Direction Undirected, Ends Javert, Valjean, value 17, Notes "1
note -- Open in Notes Sep 28". So the thing I'm on is the tie. And it says undirected out loud,
which I appreciate. The table had again flipped back to Nodes.

## 13, 14 -- note on the edge

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t22 ... --click "Javert -- Valjean" --click "Add note"
    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t22 ... --click "Javert -- Valjean" --click "Add note" --type "Pursuit tie: 17 shared chapters. Check it against the Louvain split." --click "Save"

Form: "Note on: Javert -- Valjean". Saved. "9 notes in this graph". Mine at top, chip "Javert --
Valjean", "Oct 2, 2026, 19:31". The edge's own panel now says "2 notes -- Open in Notes" -- and
the "Sep 28" that was there before is gone. So with one note it gave a date, with two it gives
none. Inconsistent.

"Add note" here was also ambiguous: two controls with the identical name "Add note". Same words,
two places. I can't tell them apart, though both did the same thing this time.

## 15 -- "Open in Notes" on the edge

    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t22 ... --click "Save" --click "Open in Notes"

Nothing changed that I can find. Still "9 notes in this graph", the whole list. I expected the two
notes on this edge. A link that does nothing audible is a link I stop trusting.

## 16, 17 -- check Valjean from his side

    timeout 120 node app-b/study.mjs --try $D/16.png task:r8-t22 ... --click "Save" --click "Valjean"
    -> "Valjean" matches 6 controls; clicked the first

Six things called Valjean. It took the table row and switched my left panel from Notes back to
Graph without asking. Valjean is selected; right side on the Style tab.

    timeout 120 node app-b/study.mjs --try $D/17.png task:r8-t22 ... --click "Valjean" --click "Style" --key ArrowRight

Arrow key moves Style to Data like a proper tab list. Data tab: id 11, label Valjean, results
(PageRank 0.0754 #1 of 77, Betweenness 0.419 #1-#2 on 60 of 77 -- hm, and a raw "betweenness 0.57"
further down, two betweenness numbers with no word on which is normalized; not today's job but I
noticed), Memberships, and Notes "3 notes -- Open in Notes". Three is right: two old ones plus
mine. My edge note is not counted on Valjean, which is correct -- it's on the tie, not on him.

## 18 -- "Open in Notes" on Valjean

    timeout 120 node app-b/study.mjs --try $D/18.png task:r8-t22 ... --key ArrowRight --click "Open in Notes"

Again: the full list of 9, not Valjean's 3. I had to find mine by reading. Both mine are at the
top, newest first:

- "Pursuit tie: 17 shared chapters..." -- on "Javert -- Valjean" -- Oct 2, 2026, 19:32
- "Center of the network..." -- on "Valjean" -- Oct 2, 2026, 19:32

(The minute changes every time I rerun because each run writes them fresh; the date is today,
Oct 2, 2026.)

## Verdict

Did I succeed? Yes. Two notes, one on the node Valjean, one on the edge Javert -- Valjean,
both written today, Oct 2, 2026, about half past seven in the evening. Each panel says how many
notes it has and the chips say what each note is on.

What cost me:

- The first "Add note" silently aimed at PageRank, because that row happened to be selected.
  Read "Note on" or you file it on the wrong thing.
- I could not get onto the edge row in the table by its name; I got there through someone
  else's old note. Two dead ends before that. The table flipped from Edges back to Nodes on its
  own twice.
- "Open in Notes" opens all notes, not the ones for the thing I'm on. The count says 3, the list
  says 9.
- The edge's notes summary showed a date with one note and none with two.
- Too many things share a name: "Notes" twice, "Add note" twice, "Valjean" six times, "Data"
  twice (panel and tab).
- Choosing Valjean switched my left panel from Notes to Graph without my asking.

What I'd keep: the Notes column in both tables with a count in it, "Note on:" spoken before I
type, the plain dates with time, "Undirected" stated on the edge, tabs that respond to arrows.

Single Ease Question: 4 of 7.

Would I use this instead of my current tool? For notes, no. A plain-text file next to my script,
"Valjean: center, 2026-10-02", is faster and I never lose my place in it. What's interesting is
that the note sits on the node and the edge and the tables count them -- if "Open in Notes"
actually showed me just that thing's notes, and I could pick an edge row from the table by
keyboard, I'd consider it for the hand-off to sighted colleagues. Not yet.
