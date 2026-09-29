# Keyboard walk: find Javert, move through his neighbors, select two -- Morgan Reyes (screen-reader analyst)

**Task as given by the moderator:** "Without a mouse, find Javert, move through the characters he is
connected to, and select two of them."

**Participant:** Morgan Reyes, blind data analyst, NVDA at a very fast rate, screen curtain on
(persona: `study/personas/screen-reader-analyst.md`). Simulated participant. Morgan did this task
once before, on an earlier version of the same page, and remembers it.

**Pages used:** the working mock `screens/keyboard-walk.html`, driven with real key presses in a
headless browser; every "it says" line below is the exact text the page's live region or focused
element produced for that key. Also `screens/inspector.html` (one node) and the written Les
Miserables walk on `flows/keyboard-walk.html`. Renders: `shots/tasks/keyboard-walk-shift-arrow/01-keyboard-walk.png`,
`02-inspector-one-node.png`, `shots/screens__keyboard-walk.png`, and my own end state in
`tmp/r6-kw-morgan/find-route-end.png` (the key-press script is `tmp/r6-kw-morgan/drive.mjs`).

**Mock limit that shaped the session, again:** the only page that answers keys still holds the
protein sample (TP53 and 32 neighbors). Javert is still only on the written flow page. I did the
task on TP53. Where a problem below is the mock's rather than the design's, it says so.

---

## Think-aloud

### 1. Arriving

Page title: "Keyboard walk on the protein network." Protein. Again. The moderator said Javert.
Last time this cost me my one question. I'm not spending it on the same thing twice -- I'll check
with Find, and if he's not there, I'll say so and use the hub.

H through the headings: "Protein interactions", "Graphs", "Sets and paths", "Views 1", "Graph".
That last one is the inspector's section, I think. The key sheet's headings that I heard last time
are gone from the reading order -- good, those belonged to a closed dialog. But there is still no
heading that takes me to the drawing or to the table. Headings get me the left panel and the right
panel, and skip the middle, which is the part I came for. Same strike as last time.

### 2. Tab order

Tab: gallery link, tab row, annotations checkbox -- the moderator's chrome, ignored.

Then, new: "Skip to the graph drawing. F6 moves between regions." A skip link. That's the thing
that replaces the missing heading, for people who Tab. I'll take it. I didn't press it; I wanted to
count the rest first.

"Main menu, button. Graph, button. Data, button. Results, button. Notes, button. Assistant,
button." Six stops. Then "33 of 300, button" -- still doesn't say it's a filter. "Find in Graphs",
"Add to Graphs", "ppi-core-300, 300 nodes", "Add to Sets and paths". Then "Tools, toolbar. Select,
pressed, 1 of 5." Then the drawing:

"Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
walk starts at TP53. Shift+Arrow: walk. Enter: select. Question mark: keys."

Same as last time. Size first, then the start node, then three keys. Fine.

Tab: "Nodes table, filtered graph, 33 rows, sorted by degree. TP53, DNA repair, degree 32, rank 2
of 300. Row 1 of 33. Shift+Arrow here extends the row selection."

Tab: "Main, toolbar. Main menu, 1 of 6." One stop now. First lap it was six. It still changes
under me between laps. I said this last round. Still true. I count Tabs; the count is wrong on one
of the two laps, and I can't tell which one is the product and which is the mock.

### 3. Looking for Javert

Shift+Tab back to the drawing. Ctrl+F.

"Find, nodes in this graph. Type a node's name." Type javert. "0 results. No nodes match
"javert"." Enter: nothing new said, it's still zero. Esc: "Graph drawing. The walk starts at TP53.
Nothing selected on canvas."

Ctrl+K for good measure: "Quick actions. 10 results. Select neighbors, unavailable, nothing
selected, 1 of 10." Type javert: "1 result. Find "javert", 1 of 1." That only sends me back to the
Find that already said no. Esc.

So the tool is honest: Javert isn't in "this graph". It said where it looked. No question to the
moderator this time; I know the answer. TP53 is the most-connected node here; it stands in for
Javert. But I want it on the record that I was given a task about a character and a file about
proteins, twice. If I were testing this for real I'd have stopped here.

### 4. Finding TP53 with Find

Ctrl+F, "tp53": "1 result. TP53, DNA repair, degree 32. Enter goes there, 1 of 1."

"Enter goes there." Last time this said "Enter selects". That was the whole problem last time.
Enter.

"Walking the drawing. TP53, start of the walk, not selected. Nothing selected on canvas."

Went there, did not select it, and I'm already in the walk. OK. This is the one place I tripped last
time -- "not selected" sounds like a fault to fix, and my finger wants Enter. This time I know
better, and the task says select two of *his* neighbors, so I hold off. Someone meeting it fresh
would press Enter. I would have. "Not selected" is still said as if it were news.

### 5. Moving through the neighbors

Shift+Down.

"PALB2, neighbor 1 of 32 of TP53, by confidence, highest first. confidence 0.98, degree 5, rank
247 of 300. Shift+Enter goes back, Esc ends the walk, Tab leaves the drawing, O changes the order,
question mark lists the keys."

"By confidence." "Confidence 0.98." That's the fix I asked for: it names the column, not "weight".
Good. The long tail with the exit keys is still long, about two and a half seconds at my rate, but
it's the first step and I get it once. It no longer mentions ] and [ here, because nothing is
selected yet. That's right: don't tell me how to step through a selection I don't have.

"Rank 247 of 300." Rank of what? Still doesn't say. Degree came right before it so I assume degree
rank; the table header says "degree rank" so the table knows. Also "of 300" while the drawing shows
33 -- I get that it's the whole graph, but I'm assuming that too.

Shift+Right: "RPA1, 2 of 32, confidence 0.95, degree 7, rank 172 of 300." Short form. Name first,
position second. At speed, "RPA1, 2 of 32" is all I need.

Shift+Left: "PALB2, 1 of 32, confidence 0.98, degree 5, rank 247 of 300." Back where I was.

### 6. Selecting two

Enter on PALB2: "PALB2 selected. 1 selected on canvas. ] and [ step through the selection."

One. Not two. The hub is not counted. That's what should have happened last round.

Shift+Right, RPA1, Enter: "RPA1 selected. 2 selected on canvas."

Two. Done, with the count said in words both times. That's the task. About eight key presses from
Ctrl+F.

### 7. Checking what I have

[: "PALB2, selected 1 of 2." [ again: same sentence again. And again. ]: "RPA1, selected 2 of 2."
] again: same again.

It still repeats itself at the ends. I know now that a repeat means "end", but a repeat and a stuck
key sound identical to me. The Les Miserables page says "First selected" and "Last selected". This
page doesn't. Small, but it's the second round I've said it.

Shift+Up: "Back to RPA1, neighbor 2 of 32 of TP53." It put me back in the walk where I was before I
stepped through the selection. Shift+Up: "Start, TP53." Shift+Up: "At the start, TP53." Shift+Home:
"Back to TP53, start of the walk, not selected. 2 selected on canvas." Every step back says where it
landed. That still works.

Tab: "Nodes table, filtered graph, 33 rows, sorted by degree. PALB2, DNA repair, degree 5, rank 247
of 300, selected. Row 31 of 33. 1 of 2 selected. Shift+Arrow here extends the row selection."

Landed on my first selected row, not the top. "1 of 2 selected." The table agrees. The
"Shift+Arrow here extends..." hint came again; I'd heard it on my Tab lap in section 2.

(Moderator note: the mock was reloaded between the Tab lap and this run; within one load the hint
is said only on the first table entry. So this repeat is the mock, not the design.)

Shift+Tab: "Graph drawing. Walk kept: at the start, TP53. 2 selected on canvas." It kept my place.
Good.

Alt+Enter: "Inspector, 2 selected." Esc: back to "Graph drawing. Walk kept: at the start, TP53. 2
selected on canvas." ? : "Keys, dialog. Everywhere, heading." Esc: same drawing sentence. Every way
out comes back to the same place and says the same thing. That's twice in a row now, across two
rounds. I'll say it: that part works.

### 8. Where I nearly lost it

Still on the drawing, "walk kept" but not walking. I pressed O to hear the orders: "Neighbors by
degree, highest first." "Neighbors by name, A to Z." "Neighbors by confidence, highest first." It
changed the order but I'm not on a neighbor, so it said nothing else. Fine.

Then Esc. I meant "end the walk", because that's what the first announcement taught me Esc does.

"Selection cleared (2 nodes). Ctrl+Z brings it back."

My two are gone. The walk had already ended when I Tabbed out -- "walk kept" apparently means "not
walking" -- so Esc fell through to "clear the selection". Same key, two meanings, and nothing told
me which state I was in except the word "kept", which I heard as "still going". To its credit it
said exactly what it did and how to undo it, once, in words. Ctrl+Z (tested on the second route):
"Selection restored (1 node). 1 selected on canvas." So I can recover. But I'd not have pressed Esc
if I'd known, and I train people who press Esc to get out of anything.

Then Shift+Down: "Walking the drawing. TP53, start of the walk." It picked the walk back up at TP53.

### 9. Route two: Quick actions, and the double Space

Reload. Tab to the drawing. Plain Down, out of habit: "View moved. Shift+Arrow walks the graph."
Once. OK.

Ctrl+K, "tp53": "2 results. Go to TP53, node, exact name. Enter goes there, 1 of 2."

Enter: "Walking the drawing. TP53, start of the walk, not selected. Degree 32, rank 2 of 300, module
DNA repair. Nothing selected on canvas."

This time I played the new user and pressed Enter on the hub, as I did last round: "TP53 selected. 1
selected on canvas. ] and [ step through the selection." So a fresh user still ends with the hub
selected. The count told me honestly, and that's the only reason I'd catch it. The difference from
last round: Find no longer does it *for* me. Only "not selected" still tempts me into it.

Shift+Down to PALB2, Space twice by accident: "PALB2 added. 2 selected on canvas." then "PALB2
removed. 1 selected on canvas." At my rate the second cuts the first; I heard "removed". Same as
last time. Read-back with [ fixes my trust in it.

Shift+Right, RPA1, Space: "RPA1 added. 2 selected on canvas." Two -- TP53 and RPA1, which is wrong
for the task, and "2 selected" sounds exactly like the right answer. Only [ or the table tells me
which two.

Delete: "Remove: not built in this mock." Mock limit, noted.

Tab to the table: "... TP53, DNA repair, degree 32, rank 2 of 300, selected. Row 1 of 33. 1 of 2
selected." There's the hub. Esc: "TP53 alone selected." Esc again: "Selection cleared (1 node).
Ctrl+Z brings it back." Ctrl+Z: "Selection restored (1 node)." Esc in the table narrows first,
then clears. At least that's the same rule as the spreadsheets I use.

### 10. The inspector, from the render

The moderator read me the inspector picture (my one ask of what's on screen): TP53, "Node",
"Neighbors" button, "Path to...", attributes with where each came from -- "degree 32, counted by
graphty, #2 of 300". So the inspector *does* say what the rank is of: "#2 of 300" sits under
degree. The walk just says "rank 2 of 300" with no "degree" attached. And that picture is titled
"Human protein interactions", 300 nodes, full graph, while the working page says "Protein
interactions", 33 of 300. If my sighted colleague had that on screen and I had the working page,
we'd be talking about two different files by different names.

---

## Outcome

Completed, on the stand-in node, with one recoverable slip. Javert could not be found (mock limit,
second round running; the tool said so plainly with both Find and Quick actions). By Find, the
fixed route: Ctrl+F, tp53, Enter, Shift+Down, Enter, Shift+Right, Enter -- two neighbors selected,
hub not selected, count said in words. About eight presses. Afterwards an Esc meant to end the walk
cleared the selection because the walk had already ended; Ctrl+Z restores it. By Quick actions,
the "not selected" phrasing still led me (playing a first-time user) to select the hub, and "2
selected" then sounded like success when it was the hub plus one.

## Single Ease Question

**5 out of 7.**

Up from last time, and earned: Find no longer selects, so the natural route ends on two; the walk
says "confidence" instead of "weight"; the long drawing reading comes once. It loses points for the
task being about a node that is not in the page for the second round, for "rank" with no "of what",
for Esc meaning two things depending on a state I can only infer from the word "kept", and for
"not selected" still sounding like something to fix.

## Would I use this instead of my current tool?

Not instead of my scripts. `G.neighbors("TP53")` sorted by edge weight is one line and prints text
I can read and paste.

Alongside them, for the meeting case -- a manager asks "who is this clinic connected to, strongest
first?" with the picture on the shared screen -- yes, now I'd try it for real. The walk said who,
in what order, by what column, and how many, every step, and I could leave, visit the table and
the inspector, and come back to my place. That's twice in a row it has done that, so I'll say it
works. What would still stop me: I have not once done this on the file the task names, I don't know
where my file goes when I load it, and a number like "rank 247 of 300" with no definition is the
kind of thing I'd have to check against NetworkX before I believed it.

## What I'd still take away (the problems)

1. **The task's node is not in the working page, two rounds running.** Javert exists only as a
   written trace; the page that takes keys is the protein sample. Ctrl+F and Ctrl+K both say so
   clearly. Screen: `screens/keyboard-walk.html`. Severity: high for the study (the task cannot be
   done as worded), not a product defect.
2. **Esc clears the selection when the walk has already ended, and "walk kept" sounds like "still
   walking".** After Tab away and back, the drawing says "Walk kept: at the start, TP53. 2 selected
   on canvas." Esc then says "Selection cleared (2 nodes). Ctrl+Z brings it back." I meant "end the
   walk", which the first step taught me Esc does. Recoverable, and it said so, but I lost my
   selection with the key I use to get out of things. Screen: `screens/keyboard-walk.html`.
   Severity: medium.
3. **"Not selected" after Go to and Find still invites Enter on the hub.** A first-time user
   presses Enter to "fix" it, and every neighbor after that counts on top of the hub; "2 selected"
   then sounds right when it is the hub plus one. Severity: medium.
4. **"Rank 247 of 300" doesn't say rank of what.** The inspector puts "#2 of 300" under degree; the
   table calls the column "degree rank"; the walk says only "rank". Severity: medium.
5. **No heading reaches the drawing or the table.** H finds the left panel and the inspector, not
   the middle. The new "Skip to the graph drawing" link helps people who Tab, not people who move by
   heading. Severity: medium.
6. **Tab order changes between laps.** The rail is six stops the first time round and one stop
   ("Main, toolbar") after the drawing has had focus. Severity: low-medium.
7. **[ and ] repeat the same node at either end** instead of saying first or last. Severity: low.
8. **A doubled Space is heard only as "removed".** Severity: low (read-back works).
9. **"33 of 300, button" still doesn't say it's a filter.** Severity: low.
10. **The inspector picture and the working page name the graph differently** ("Human protein
    interactions", full graph vs "Protein interactions", 33 of 300). Mock inconsistency, but it's
    the kind of thing that makes me and a sighted colleague talk past each other. Severity: low.

## What worked, twice in a row

- Find now goes to the node without selecting it; "select two of his neighbors" ends with two.
- The walk names the column it orders by and its value ("by confidence ... confidence 0.98").
- "Neighbor N of M of TP53", name first, every step, same word order.
- Every exit -- Tab, Alt+Enter, ?, Esc from Find and Quick actions -- comes back to the same kept
  place and says where that is.
- Every key said something; the table, the walk and the count agreed on what was selected.
- The first, long drawing reading comes once; later arrivals are short.
