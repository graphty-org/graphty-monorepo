# Keyboard walk: find Javert, move through his neighbors, select two -- Morgan Reyes (screen-reader analyst)

**Task as given by the moderator:** "Without a mouse, find Javert, move through the characters he is
connected to, and select two of them."

**Participant:** Morgan Reyes, blind data analyst, NVDA at a very fast rate, screen curtain on
(persona: `study/personas/screen-reader-analyst.md`). Simulated participant.

**Pages used:** the working mock `screens/keyboard-walk.html` (driven with real key presses; every
"it says" line below is the text the mock's live region or focused element produced for that key),
`flows/keyboard-walk.html` (the same walk written out on Les Miserables), `screens/find.html`,
`screens/inspector.html` (one node), and the storyboard `storyboards/keyboard-only.html`. Renders
looked at: `shots/tasks/keyboard-walk-shift-arrow/01-keyboard-walk.png`,
`02-inspector-one-node.png`, `shots/screens__keyboard-walk.png`, and two shots of my own run in
`tmp/r4-kw-morgan/` (`find-route-end.png`, `after-fix.png`).

**Mock limit that shaped the session:** the only page that answers keys is loaded with the protein
sample (TP53 and its 32 neighbors). Javert exists only on the flow page, as a written trace. I did
the task with keys on TP53 and checked each step against the written Javert trace. Where a
difference below is a mock limit rather than a design problem, it says so.

---

## Think-aloud

### 1. Arriving

Page title: "Keyboard walk on the protein network." Protein. The moderator said Javert. Javert is a
Les Miserables character, I know that dataset from the NetworkX docs. Either the moderator gave me
the wrong page or there is more than one graph in here. I'll find out.

H through the headings. I get "Protein interactions", "Graphs", "Sets and paths", "Views 1", then
"Everywhere", "Graph drawing", "Nodes table" -- those last three are the key sheet's headings, which
means the key sheet is in the reading order even though it is closed? Or it's the heading list of a
dialog I haven't opened. Either way, I did not hear a heading called "Graph drawing" for the drawing
itself or "Nodes table" for the table, only for the key list. So headings get me to the left panel
and then to a help sheet. Not to the drawing. That's a strike, a small one.

(Moderator note: the flow page says every region has a heading of its own name. In the mock the
drawing and the table are not reachable by H; the names I heard came from the key sheet.)

### 2. Tab order, first pass

Tab, Tab. There is a "Gallery" link and a row of tabs and an "Annotations" checkbox. The moderator
tells me those are the mock's own chrome, not the product. Fine, I'll ignore them.

Then: "Main menu, button", "Graph, button", "Data, button", "Notes, button", "Assistant, button" --
five separate Tab stops. Then "33 of 300, button". 33 of 300 what? It's a button that says a
fraction. I'd have to press it to learn it's a filter. Then "Find in Graphs", "Add to Graphs", the
graph "ppi-core-300, 300 nodes", "Add to Sets and paths". Then "Tools, toolbar. Select, pressed, 1
of 5." Then the drawing.

On the drawing: "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing
selected. The walk starts at TP53. Shift+Arrow: walk. Enter: select. Question mark: keys."

Good. It told me it's an application region, told me the count, told me the keys to start. That's
the first thing in fifteen years of graph tools that said something other than "image" on the
drawing. I'm writing that down, and I'm not praising it yet.

Tab once more: "Nodes table, filtered graph, 33 rows, sorted by degree. TP53, DNA repair, degree 32,
rank 2 of 300. Row 1 of 33." Table right after the drawing. That's the order I'd want.

Tab again and now the rail is "Main, toolbar. Main menu, 1 of 5." One stop. The first time round it
was five stops. So the tab order is different the second lap than the first. I noticed, and I don't
like it: I learn a page by counting Tabs, and the count just changed under me.

(Moderator note: probably the mock only groups the rail after focus has been on the drawing once.
Recorded as seen.)

### 3. Finding Javert

The task says "find". Ctrl+F is find everywhere I work. Ctrl+F.

"Find, nodes in this graph. Type a node's name."

I type javert. "0 results. No nodes match "javert"."

Enter anyway. Same thing. Esc: "Graph drawing. The walk starts at TP53. Nothing selected on canvas."
Esc put me back on the drawing, which is where I was. Good.

Then Ctrl+K, because the drawing's key sheet mentioned it: "Quick actions. 11 results. Select
neighbors, unavailable, nothing selected, 1 of 11." Type javert: "1 result. Find "javert", 1 of 1."
Enter hands me back to Find, which again says nothing matches.

So Javert is not in this graph. The tool said so twice, clearly, and "nodes in this graph" told me
where it looked. That part is fine. But I have now spent my two tries on Javert, and I'm about to
count a dead end.

I ask the moderator -- my one question for this task: "Is Javert in this file?" Moderator: no, the
working mock only holds the protein sample; the Les Miserables version is written out on another
page. Do it on TP53, the hub here, and compare.

OK. TP53 is my Javert. I'll read the Javert page afterwards to see what I'd have heard.

### 4. Finding TP53, route one: Find

Ctrl+F, "tp53": "1 result. TP53, DNA repair, degree 32. Enter selects, 1 of 1."

It told me Enter selects. I heard it. Enter.

"TP53 selected. 1 selected on canvas. The walk starts at TP53."

Found, selected, and it says the walk starts there. Fine. That's what find means to me: take me to
it and hold it.

### 5. Moving through the neighbors

Shift+Down, as the drawing told me.

"Walking the drawing. PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98,
degree 5, rank 247 of 300. Shift+Enter goes back, Esc ends the walk, Tab leaves the drawing, ] and
[ step through the selection, O changes the order, question mark lists the keys."

That's long. At my rate, maybe two and a half seconds. It's the first step, it tells me the exits,
and I'll allow it once. What I care about: "neighbor 1 of 32 of TP53" -- where I am, how many, and
of whom. That's the sentence I've wanted from every graph tool.

"Weight 0.98." Weight of what? The order is "by weight". I don't know what the weight is in this
file. I had to go to the inspector later to find "edge weight: confidence". In Les Miserables the
flow page says it would say "co-appearances 17" instead -- the column's own name. Here it says the
generic word. If it's confidence, say confidence. (Moderator note: the flow page says the Les
Miserables walk names the column; the protein mock says "weight". Unclear whether the protein
version would say "confidence" in the product.)

Shift+Right: "RPA1, 2 of 32, weight 0.95, degree 7, rank 172 of 300."

Shorter now. Same order of words. Good. Name first, then position. At speed I hear "RPA1, 2 of 32"
and I can skip the rest.

"Rank 172 of 300." Rank by what? By degree, I assume, because degree came right before it. I'm
assuming. The table's column header says "degree rank", so the table knows. The walk doesn't say.

### 6. Selecting two

I'll take the top two by confidence. Shift+Left back to PALB2, the first neighbor. Enter.

"PALB2 selected. 2 selected on canvas."

Two selected. Wait. I've selected one neighbor. Two? Oh. TP53. Find selected TP53, and TP53 is still
selected. So "2 selected" is TP53 and PALB2.

Shift+Right, RPA1, Enter: "RPA1 selected. 3 selected on canvas."

Three. The task was two of the characters he's connected to. I have the hub plus two. Nothing
stopped me and nothing warned me; it counted honestly, which is the only reason I caught it. If I
wasn't a numbers person I'd have walked off with three.

This is exactly the thing the Les Miserables page says it fixed: "Nobody ends 'select two of his
neighbors' with three selected." It fixed it for Ctrl+K. It did not fix it for Ctrl+F, and Ctrl+F is
what "find" means to everyone I've ever trained. The moderator's own task says "find".

### 7. Getting back to two

I want to read what I have. The first announcement told me "] and [ step through the selection".
[.

"PALB2, selected 2 of 3." [ "TP53, selected 1 of 3." [ again: "TP53, selected 1 of 3."

It repeated itself at the end. The Les Miserables page says it should say "First selected". A repeat
reads like a stuck key to me; "first" would tell me it's the end. Small.

On TP53, Space: "TP53 removed. 2 selected on canvas."

Two. Then ] to check: "PALB2, selected 1 of 2." [ "PALB2, selected 1 of 2." again a repeat at the
end. Fine, I know what the repeat means now.

Shift+Up: "Back to RPA1, neighbor 2 of 32 of TP53." It put me back in the walk where I was before I
stepped through the selection. That's the "can I get back to where I was" test, and it passed.

### 8. Checking it in the table

Tab: "Nodes table, filtered graph, 33 rows, sorted by degree. PALB2, DNA repair, degree 5, rank 247
of 300, selected. Row 31 of 33. 1 of 2 selected. Shift+Arrow here extends the row selection."

It put me on the first selected row, not the top of the table. Row 31. And "1 of 2 selected". The
table agrees with the drawing. "Selected" is at the end of the row reading; I'd want it earlier, but
it's there.

The inspector, from the render: "Selection 3: TP53 32, PALB2 5, RPA1 7" before I removed TP53. So
there's a place to read the selection back as a list, not only through announcements. That matters
more to me than the announcements: an announcement goes by once, a list stays.

### 9. Route two: Quick actions, to compare

Reload. Tab to the drawing. Plain Down, out of habit: "View moved. Shift+Arrow walks the graph."
View moved means nothing to me, but it told me the right key right away, once. Acceptable.

Ctrl+K, "tp53": "2 results. Go to TP53, node, exact name. Enter goes there, 1 of 2."

Enter: "Walking the drawing. TP53, start of the walk, not selected. Degree 32, rank 2 of 300,
module DNA repair. Nothing selected on canvas."

"Not selected." I found it, and it says not selected. My reflex is to fix that: I press Enter.

"TP53 selected. 1 selected on canvas. ] and [ step through the selection."

And I'm back in the same place as with Find: the hub is selected before I've picked any neighbor.
The difference is that this time I did it myself, because "not selected" sounded like a problem.
If the task had said "select two of his neighbors" I might have held off. It said "find Javert", and
found-but-not-selected is a state I've never met in any other tool.

Then Shift+Down, Shift+Right twice, O: "Neighbors by degree, highest first. UBC, neighbor 1 of 32 of
TP53, weight 0.80, degree 21, rank 7 of 300." O re-sorted and jumped me to the top. Useful: "who is
his best-connected partner" is one key. I only found O because the first long announcement named
it.

Space twice by accident on WRN: "WRN added. 3 selected." then "WRN removed. 2 selected." Only the
second was heard at speed. "Removed" with no warning that I'd just added it. I'd have to read the
selection back to trust it again, which I did with [ -- and that works.

Shift+Home: "Back to TP53, start of the walk. 3 selected on canvas." Shift+Up at the start: "At the
start, TP53." Esc: "Walk ended at TP53. 3 selected on canvas." Consistent, every key says something,
no silent presses.

### 10. Reading the Javert version

The Les Miserables page's trace is what I'd have heard with the real task: Ctrl+K, javert, "Go to
Javert", Shift+Down to "Valjean, neighbor 1 of 17 of Javert, by co-appearances, highest first.
Co-appearances 17, degree 36, rank 1 of 77, group 2." Enter, Shift+Right, Enter, done with two.
That's clean, and "co-appearances 17" is better than "weight 0.98" because it tells me what the
number is.

But the trace starts at Ctrl+K. Nobody I train starts "find" at Ctrl+K. They start at Ctrl+F, and on
that page Ctrl+F's Enter selects Javert and makes him the start. Same three-selected ending as my
TP53 run. Only the key sheet tells you the two keys behave differently.

---

## Outcome

Completed with difficulty, on the stand-in node. Javert could not be found in the only page that
takes keys (mock limit; the tool said so plainly). On TP53, both routes -- Find and Quick actions --
left me with three selected instead of two: Find selects the node it finds, and "Go to" announces
"not selected", which I then "fixed" with Enter. I recovered with [ and Space and verified in the
table. About 12 key presses for the walk and selection, plus 5 to get back to two.

## Single Ease Question

**4 out of 7.**

The walk itself is a 6: consistent sentences, name first, position every time, a way back from
everywhere, no silent key. It loses two for ending on the wrong count by the route I'd naturally
take, and for "weight" and "rank" that I had to guess the meaning of.

## Would I use this instead of my current tool?

Not instead of my scripts. My scripts already answer "who is TP53 connected to" in one line of
NetworkX and print it as text I can read line by line.

But for the manager's "who is connected to this clinic, and through whom?" -- asked in a meeting,
with the picture on the shared screen -- yes, possibly, alongside. The walk let me move through the
neighbors in an order I chose and come back without reloading, and the drawing, the table and the
inspector agreed on what I'd picked. That is the first time a graph drawing has told me anything at
all. Whether I'd trust it on the referral network depends on two things I didn't get to test: where
the file goes when I load it, and whether "weight" and "rank" say what they are.

## What I'd still take away (the problems)

1. **Find selects, so "find X, select two of his neighbors" ends with three.** Ctrl+F then Enter
   selects the hub; every neighbor added after it counts on top. The fix on the Les Miserables page
   (Go to selects nothing) only covers Ctrl+K. Screen: `screens/keyboard-walk.html` (Find), same in
   `flows/keyboard-walk.html` (key table, Ctrl+F row). Severity: high -- it's the task's end state
   and it's silent until you count.
2. **"Go to" says "not selected", which invites Enter on the hub.** Found-but-not-selected is a new
   state to me; "not selected" sounds like something to fix. Severity: medium.
3. **"Weight 0.98" and "rank 172 of 300" don't say what they are.** Weight of what (confidence, I
   found later in the inspector); rank by what (degree, I assumed). The Les Miserables trace names
   the column ("co-appearances"); the protein mock doesn't. Severity: medium.
4. **Headings don't reach the drawing or the table.** H gets me the left panel and the key sheet's
   headings, not a "Graph drawing" or "Nodes table" heading, though the flow page says every region
   has one. Severity: medium (mock may lag the flow).
5. **Tab order changes between the first lap and the second.** The rail is five stops the first
   time and one stop after the drawing has had focus. Severity: low-medium; I count Tabs.
6. **"33 of 300, button" doesn't say it's a filter.** Severity: low.
7. **At either end of the selection, [ and ] repeat the same node** instead of saying "First
   selected" / "Last selected" as the flow page promises. Reads like a stuck key. Severity: low.
8. **A doubled Space is heard only as "removed".** The add is cut off by the removal. I had to read
   the selection back to trust it. Severity: low (read-back works).
9. **The first walk announcement is long** (about two and a half seconds at my rate). Once is
   acceptable; I'd object if it came back. Severity: low.

## What worked, twice in a row

- Every key said something; no silent presses, including at the ends of lists and at the start.
- "Neighbor N of M of TP53" -- where I am, how many, and relative to whom -- every step, same word
  order.
- Getting back: Shift+Up, Shift+Home, and Shift+Up after stepping through the selection all put me
  where I expected and said where that was.
- Esc returned focus to the drawing from Find, Quick actions, the key sheet and the inspector visit,
  every time.
- The table, the inspector's selection list and the announcements agreed on the count and the
  names.
