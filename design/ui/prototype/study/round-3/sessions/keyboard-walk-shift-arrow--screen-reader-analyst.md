# Keyboard walk with Shift and the arrows -- Morgan Reyes, screen-reader analyst

Participant: Morgan Reyes, blind health-services analyst, NVDA and keyboard only (persona file:
study/personas/screen-reader-analyst.md). Simulated session.

Task as given by the moderator: "Using only the keyboard, find Javert, walk to his most connected
neighbour and back, and select two of his neighbours."

Screens: the keyboard walk mock (screens/keyboard-walk.html), then a look at the Find mock
(screens/find.html). The inspector appears inside the walk mock. What the screen reader says is
taken from the mock's own announcement strip, replayed key by key in a browser; the lines in
quotes below are the mock's exact words.

Outcome: the walk, the way back and the two-node selection worked. "Find Javert" did not: the walk
screen holds a protein network, not the Les Miserables graph, and its command box has no route to
Find. Morgan spent the one moderator question allowed per task on it and did the rest on TP53, the
node the walk screen offers. The task is recorded as done with difficulty.

---

## Transcript (think-aloud, Morgan's words)

**Page load.** Title: "Keyboard walk on the protein network." Protein. I was told Javert. Javert
is a policeman in a novel, not a protein. Let's see whether this thing knows anything I don't.

**H for headings.** I press H. It jumps to... something in a thing called "Keys" that isn't open.
Then nothing useful. "Graphs", "Sets and paths", "Styles" -- my arrow keys read them as text, but
they're not headings. So no headings in the actual app. That's the first thing I check and it
failed. Noted.

**Tab, a few times.** "Gallery, link." "Canvas focused, tab." That's the prototype's frame, not the
app, the moderator says; fine, I'll ignore the first three. Then: "Skip to the graph drawing.
F6..." Good, a skip link, I like those. I don't take it yet because I want to learn the tab order.
"Main menu." "Graph." "Assistant." "Results." "Notes." Five stops for one strip of buttons. Then
"33 of 300" -- 33 of 300 what? It's a button, apparently. "Find in Graphs." "Add to Graphs."
"ppi-core-300, 300 nodes." "Add to Sets and paths." "Add to Styles." "Size by degree, style
layer." "Tools, toolbar. Select, pressed, 1 of 5." Then finally:

> "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
> walk starts at TP53. Shift+Arrow: next neighbor. Space: select. Question mark: keys."

Thirteen Tabs from the skip link to here. The skip link is the right answer, and I'll use it next
time. But this, this I actually like. It says "application" and then tells me what the keys are.
It told me where the walk starts. It gave me a count: 33 shown out of 300. That's an overview
before it throws me into a list. OK. Slightly surprised.

**Arrow Right, plain.** "View moved. Shift+Arrow walks the graph." Fine -- plain arrows pan a
picture I can't see, and it told me once what I should have pressed. Not chatty. Good.

**Finding Javert.** There's no search box I've heard in the drawing. I try Ctrl+K, which is what
half my tools use for "go to anything".

> "Quick actions. 11 results. Select neighbors, unavailable, nothing selected, 1 of 11."

I type Javert.

> "0 results. No commands or nodes match "Javert"."

So it searched node names too -- it says "nodes" -- and there's no Javert. There's no "search for
it properly" option either. Just zero. I try "find", in case there's a Find command.

> "0 results. No commands or nodes match "find"."

There's a "Find in Graphs" button back in the panel, but that sounds like it finds graphs, not
people in a graph, and I'm not going back thirteen Tabs to guess. That's a dead end. I Escape.

> "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
> walk starts at TP53. Shift+Arrow: next neighbor. Space: select. Question mark: keys."

The whole welcome speech again. I heard it thirty seconds ago. At my rate it's short, but it's
going to be this every single time I come back to the drawing.

**Moderator question (my one for this task).** "Is Javert in this graph at all?" Moderator: this
screen has the protein sample loaded; Javert lives in the other screen, the Les Miserables one,
which is a still picture with no keyboard behind it. Do the walk with the node this screen gives
you.

So the first word of the task can't be done here. I'll say what I'd say about any tool: if I
can't get to a named node by typing its name, I'm going to the table and pressing the first letter.
I'll count it against the screen, not against me.

**The Find screen, briefly.** The moderator reads me what's on it: a find box with "thenard"
typed, two results, "Thenardier" and "Mme.Thenardier", each with a group and a degree; a hint line
that says Enter selects, Esc closes, F6 next region. Another still says typing a name into Ctrl+K
offers "Find 'marius'". That's what I wanted on the other screen. Two screens, same Ctrl+K, and
they don't agree on what happens when you type a name. That's exactly what makes me stop trusting
a keymap.

**Question mark, on the drawing.** "Keys, dialog." I arrow through it. On the canvas: arrows move
the view; Shift+Down starts the walk; Enter opens the inspector. Walking: Shift+Right next
neighbor, Shift+Left previous, Shift+Down into this node's neighbors, Shift+Enter back one step,
Shift+Up too, Shift+Home back to the start, O cycles the order: weight, degree, name. Selection:
Space, then ] and [ to step through what's selected. Esc ends the walk; Esc again clears the
selection. Tab goes to the Nodes table.

That's a real keymap, with headings inside a dialog that says what it is. It goes in my text file.
Esc.

> "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
> walk starts at TP53. ..."

Third time. I know.

**Shift+Down: start the walk.**

> "PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98, degree 5, rank 247 of
> 300. Shift+Enter goes back, Esc ends the walk, Tab leaves the canvas, ? lists the keys."

Name first -- good, that's the word I need. "1 of 32" -- I know where I am. It told me the order
without me asking. But "by weight" -- weight of what? 0.98 of what? I scroll back through what I
heard in the panel earlier -- the inspector said "edge weight: confidence", but only because I
went looking. And "rank 247 of 300". Rank by what? Degree, I'd guess. I don't guess. Write it down.

The task says "most connected neighbour". PALB2 has degree 5; that's not it. The first neighbor
is the strongest link, not the busiest node. Good thing I read the keys: O.

**O.**

> "Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53, weight 0.80, degree 21, rank
> 7 of 300."

There we go. "Neighbors by degree" first, then the node. UBC, degree 21. That's the most connected
neighbor -- or it is if "degree 21" means what I think it means.

**Shift+Down: walk into UBC's neighbors.** I want to be "at" UBC and see where I can go.

> "TP53, neighbor 1 of 3 of UBC in filtered graph, by degree, highest first. Weight 0.80, degree
> 32, rank 2 of 300, where you came from."

Hold on. UBC has degree 21, and now it says UBC has 3 neighbors, "in filtered graph". So the 21 is
in the whole 300-node graph, and I'm looking at 33 of them. It did tell me -- "in filtered graph"
-- and the opening said 33 of 300. But the degree number never says which graph it's counted in,
and here are two numbers for the same node that disagree by a factor of seven. If I put "most
connected neighbour: UBC, degree 21" in a report, somebody's going to ask 21 of what. So: is
"most connected" 21 in the full graph, or among what I can see? The tool picked for me without
saying.

"Where you came from" -- that's nice. That's exactly the thing I lose in these structures. I'd
have liked it earlier in the sentence, but it's there.

**Back.** I'd try Shift+Up first because it's the opposite of Shift+Down.

> "Back to UBC, neighbor 1 of 32 of TP53."

Again:

> "Start, TP53."

Back where I started, and it said "Start". Two keypresses, no reloading the page. This is the part
every other tool gets wrong. It worked. Shift+Enter did the same when I tried it -- odd choice of
key for "back", but Shift+Up is there, so I don't care.

**Select two neighbors.** From the start, Shift+Right.

> "UBC, neighbor 1 of 32 of TP53, by degree, highest first. Weight 0.80, degree 21, rank 7 of
> 300."

It remembered I wanted "by degree". Space.

> "UBC added. 1 selected on canvas. ] and [ step through the selection."

"Added" -- first word is the verb, good. It taught me the next key the moment it became useful,
once. That's how it should be. Shift+Right.

> "RPS8, 2 of 32, weight 0.42, degree 17, rank 11 of 300."

Shorter the second time. It dropped "neighbor of TP53" because I already know. Good. Space.

> "RPS8 added. 2 selected on canvas."

Two selected. Task done, as far as the keys go.

**Checking it, because I don't take a tool's word for it.** Enter:

> "Inspector, RPS8, selected. Module Ribosome, degree 17, rank 11 of 300."

It visited RPS8 without changing anything. Esc:

> "RPS8, 2 of 32."

Back in my walk, in the same place. Nice. Now Tab to the table:

> "Nodes table, filtered graph, 33 rows, sorted by degree. UBC, Unassigned, degree 21, rank 7 of
> 300, selected. Row 2 of 33. 1 of 2 selected."

It landed me on my first selected row and told me it's one of two. That's the link between the
drawing and the table I always want and never get. "Row 2 of 33. 1 of 2 selected." is two "of"s
back to back, though; at speed they blur together.

**Shift+Down in the table, out of habit.** I just spent five minutes learning that Shift+Down
means "go deeper" in the walk.

> "RPS8. 2 selected on canvas."

Did that just move me, or did it select a range? It says two selected, which is what I had. The
moderator tells me that in the table Shift+Down selects a range from where I started, and replaces
the selection. It happens to give the same two nodes because they sit next to each other in degree
order. With any other two I'd have lost my selection without hearing it. Same keys, two regions
apart, opposite jobs: one walks, one silently rewrites what I picked.

**Shift+Tab back to the drawing.**

> "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. 2 selected on canvas.
> The walk starts at UBC. ..."

The walk starts at UBC now, not TP53. My starting point was TP53. Leaving the drawing threw my walk
away and made the first selected node the new start. So "get back to where I was" works while I'm
inside the drawing and stops working the moment I Tab out to check something. I'd have to find
TP53 again -- and on this screen, finding by name is what didn't work.

Ctrl+Alt+Z, "Previous selection", from the key sheet:

> "Previous selection: 2 selected on canvas."

Two what? I had two before, I have two now. It doesn't say which. I can't tell whether anything
changed.

---

## Single Ease Question

**4 of 7.** The walk itself is a 6: it talks, it knows where I came from, and back is one key.
Finding the person I was asked to find was a 1, because the screen has nobody by that name and
Ctrl+K has no route to Find. Taking a middle number is the honest average.

## Would I use this instead of my current tool?

"For the one thing it does well, maybe. Walking out from a clinic, hearing who it's tied to in
order, and getting back to it in two keys -- I can't do that in NetworkX without writing a loop and
reading a list. That's new, and it's the first graph drawing that has said anything useful to me
on the first arrow press. But I'd still check every number in my own scripts, because it tells me
'degree 21' without saying which graph it counted in, and 'rank 247' without saying rank of what.
And if typing a name doesn't take me to that name, I'm not going to use it to answer my manager's
'who's connected to this clinic' in an hour. Fix finding by name, tell me what the numbers are, and
don't forget where I started when I Tab out. Then we'll talk. Until then it's my scripts, and this
for a look around."

---

## Problems observed

1. **Finding a node by name is a dead end on the walk screen** (severity 3). The task's node is not
   in the walk screen's data (a mock limit), and Ctrl+K answers "0 results. No commands or nodes
   match" with no route to Find -- while the Find screen's Ctrl+K offers "Find 'marius'" for the same
   kind of query. The two screens disagree on what Ctrl+K does with a name.
2. **Numbers without their definitions** (severity 3). "Weight 0.98" does not say it is the edge's
   confidence; "rank 247 of 300" does not say rank by what; "degree 21" does not say it counts the
   full 300-node graph while the walk shows 3 neighbors "in filtered graph". "Most connected" is
   decided on a number whose scope is never spoken.
3. **Leaving the drawing loses the walk's start** (severity 3). After Tab to the table and Shift+Tab
   back, the walk starts at the first selected node (UBC), not the node the walk started from
   (TP53).
4. **Shift+Down does opposite things two regions apart** (severity 3). On the drawing it walks
   deeper; in the Nodes table it selects a range and replaces the selection, announced only as
   "RPS8. 2 selected on canvas".
5. **No headings in the app** (severity 3). The panel's section names ("Graphs", "Sets and paths",
   "Styles") are not headings; the heading key finds only the closed key sheet's headings.
6. **The full welcome is repeated each time focus returns to the drawing** (severity 2), including
   the key instructions, after every Esc from Quick actions or the key sheet.
7. **Default neighbor order is by weight** (severity 2); the entry announcement does not mention
   that the order can be changed. O was found only through the key sheet.
8. **"Previous selection" does not say what it restored** (severity 2): "Previous selection: 2
   selected on canvas." when two were selected before and after.
9. **Long Tab path to the drawing** (severity 2): thirteen stops from the skip link, including five
   separate stops for the main menu strip.
10. **Table focus line puts two counts back to back** (severity 1): "Row 2 of 33. 1 of 2 selected."

## What worked (Morgan would still take something away from each)

- The drawing announces itself as an application, gives a size ("33 of 300 nodes shown"), names the
  start node and the keys.
- Every walk step leads with the node's name and its place ("1 of 32"); the second step is shorter
  than the first.
- "Where you came from" on the node you arrived from; Shift+Up and Shift+Home get back, and "Start,
  TP53" confirms it.
- The neighbor order survives going back and forth.
- Space says "added", teaches ] and [ once, and the inspector visit (Enter, Esc) returns to the same
  walk position.
- Tab from the drawing lands on the first selected row and says "1 of 2 selected".
