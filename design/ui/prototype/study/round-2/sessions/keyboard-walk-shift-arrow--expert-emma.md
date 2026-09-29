# Keyboard walk with Shift and the arrows -- Expert Emma

**Participant:** Emma, network scientist, notebook-first (networkx and igraph), Gephi for the final figure. Mild presbyopia; wants desktop keyboard conventions.
**Task, as the moderator gave it:** "Using only the keyboard, find Javert, walk to his most connected neighbour and back, and select two of his neighbours."
**Pages:** the keyboard walk screen (driven by real key presses from its starting state, 1440 x 900), then the Find screen and the inspector as they are shown. No mouse.
**Outcome:** finished with difficulty, on a substitute node. Javert is not in the graph the walk screen loads (it is a 300-node protein network); the Find screen that does show Javert cannot be walked. Emma did the task on TP53, the hub of the protein graph, and on her first try ended with three nodes selected instead of two.

## Transcript (think-aloud)

**1. Landing.** Protein interactions, 33 of 300. TP53 in the middle, a star around it. The pink strip at the top says "Tab to the drawing (or click it), then press Shift+Down." Fine. Where is Javert? Javert is Les Miserables. This is STRING-looking protein data. I will look anyway -- maybe there is a second graph loaded. Graphs list: one entry, ppi-core-300. No.

**2. Getting to the canvas.** Tab. Tab. Tab. I counted seventeen presses: the top links, a search box, every rail button, the filter chip, the plus buttons, the style rows, the toolbar, and then finally the drawing gets a blue ring. Seventeen. There should be one key that puts me on the canvas. The strip mentions F6 somewhere in the notes for moving between regions, which I only saw after the fact; nothing on the screen told me before I started tabbing.

**3. Find Javert.** Ctrl+K, because every tool I use now has a command palette. I typed "javert". "No commands match." And underneath: "This mock lists the selection and set commands only." So it is a palette of commands, not a find. I typed "find" -- also nothing. I typed "TP53" to see whether it searches nodes at all: yes, a row "Find in this graph -- TP53". So it finds nodes by exact name. Javert is simply not in this graph.

I asked the moderator; she said "do what you would do." I looked at the Find screen: that is Les Miserables, 28 of 77 nodes, and Javert is right there next to Thenardier, degree 10 filtered, 17 in the full graph -- and that table has two degree columns, labelled "filtered graph" and "full graph". Good. But that page does not respond to the keyboard at all: Ctrl+F did nothing, Shift+Down did nothing. It is a set of pictures. So I cannot walk Javert. I will do the same thing on TP53, which is the Javert of this graph -- the big hub -- and tell you where it would differ.

**4. Select TP53 and start.** Ctrl+K, "TP53", Enter. "TP53 selected. 1 selected on canvas." The card at the bottom says "Start: TP53, the walk starts here", degree 32, rank 2 of 300. Shift+Down. Focus goes to PALB2: "1 of 32 from TP53, Weight 0.98, Degree 5". So the default order is weight. PALB2 is not "most connected", it is highest confidence.

**5. Most connected neighbour.** The card has "Neighbors by Weight / Degree / Name" and an O. Press O. "Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53, weight 0.80, degree 21, rank 7 of 300." So UBC. That is exactly what I would ask networkx for, and I like that O is one key and it kept me in TP53's neighbour list.

But: degree 21 where? We are looking at 33 of 300. On the Find screen I just saw you can label "filtered graph" and "full graph" separately. Here the card says "Degree 21" with no qualifier, and the table below says "Filtered graph" in its caption over a column that is the full-graph degree. If this were Javert, 10 versus 17 would give me a different "most connected" answer depending on which one the walk sorts by. I cannot tell from the screen which one O sorts by.

**6. And back.** Shift+Up, because Up is the obvious opposite of Down. "Start, TP53." Worked. The key sheet (I pressed ? earlier) says the real key is Shift+Enter and Shift+Up is "too". Shift+Enter for "back" I would never have guessed; I am glad Shift+Up works.

**7. Select two of his neighbours.** Here is where my hands did the wrong thing first. I am on TP53. My desktop reflex for "select two things" is Space, then Shift+Right to extend. So: Shift+Down to go into the neighbours again (lands on UBC, still in degree order -- good, it remembered). Space: "UBC added. 2 selected on canvas." Two? I have selected one thing. Oh -- TP53 is still selected from when I found it with Ctrl+K. Then Shift+Right: that did not extend anything, it moved me to RPS8 ("2 of 32"). Shift+Arrow on the canvas is movement, while in the table under it Shift+Arrow extends a range. Same keys, two meanings, depending on where the blue ring is. Space again: "RPS8 added. 3 selected on canvas." The inspector now says "3 selected": TP53 32, UBC 21, RPS8 17.

The task said two of his neighbours, not him plus two. To get TP53 out: Shift+Home back to the start, Space, "TP53 removed. 2 selected on canvas." Now it is right: UBC and RPS8, both neighbours of TP53. I had to read the announcements carefully to catch this -- the count is in the card, small, at the far right.

**8. Checking.** The inspector list "Selection 3 / TP53 32 / UBC 21 / RPS8 17" -- the numbers still have no column name. I know they are degree because I have been staring at degrees for five minutes. A biologist would not.

## After the task

**Single Ease Question: 4 of 7.** The walk itself is good -- O for the order, Shift+Down in, Shift+Up out, Space to select -- and the announcements tell me where I am every step. What made it a 4: I could not find Javert at all, seventeen Tabs to reach the drawing, finding a node by Ctrl+K leaves it selected so my "two neighbours" became three, and Shift+Right means "move" on the canvas but "extend" in the table.

**Would I use this instead of my current tool?** Instead of the notebook, no -- `sorted(G[n], key=G.degree)` is one line. Instead of Gephi for letting a collaborator poke at a hub's neighbourhood without me on the call, yes, if the degree says which graph it counts and finding a node does not quietly put it in the selection. Gephi has none of this keyboard walking; that part is genuinely better.

> "I asked for his neighbours and got him thrown in for free. Find should put me on the node, not select it -- or at least tell me it did, in words I will read."

## Problems seen

1. **Javert is not reachable on any walkable screen** (severity 3). The keyboard walk loads only the protein graph; the Find screen with Les Miserables is static and ignores keys. The task could not be done as given; it was done on TP53.
2. **Finding a node with Ctrl+K selects it, so selecting "two neighbours" gives three** (severity 3). After Ctrl+K, TP53, Enter, the first Space said "UBC added. 2 selected on canvas." Getting TP53 out needs Shift+Home then Space, which nothing suggests.
3. **Shift+Arrow means "walk" on the canvas and "extend the range" in the Nodes table directly below** (severity 2). The desktop reflex (Space, Shift+Right to extend) moved focus instead of extending.
4. **Seventeen Tab presses from page load to the drawing** (severity 2). No visible single key to jump to the canvas; the region key is only named in annotations.
5. **Walk card degree is unqualified while the view is a 33-of-300 slice** (severity 2). "Degree 21" with no "full graph" or "filtered graph"; the Find screen's table does label both, so the two screens disagree. Which degree O sorts by is not stated.
6. **Back is Shift+Enter in the key sheet** (severity 1). Shift+Up works as a second binding and is what I pressed; Shift+Enter would not have occurred to me.
7. **Inspector selection list numbers have no column name** (severity 1). "TP53 32, UBC 21, RPS8 17".

## What worked

- O switches the neighbour order in one key and keeps you in the same neighbour list; the walk remembered the degree order when I went back and in again.
- Every step announces position ("1 of 32 from TP53"), weight, degree, rank and the selection count.
- Ctrl+K finds a node by exact name and says "Find in this graph".
- "?" opens a short read-only key sheet.
- "Assistant: Off. Nothing is sent." is on the rail without looking for it.

## Moderator note

The task named Javert, but the only screen that responds to keys is the protein-network walk. The participant substituted TP53. Findings 2 to 7 are about the walk design and hold regardless; finding 1 is a study-materials gap as much as a design one -- a walkable Les Miserables state, or a task naming TP53, would remove it.
