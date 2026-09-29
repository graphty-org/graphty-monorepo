# Session: keyboard walk -- Expert Emma

**Participant.** Emma, network scientist, lives in Jupyter with networkx and igraph, uses Gephi for
the final figure. Keyboard-first where she can be; no assistive technology.

**Task as given by the moderator.** "Without a mouse, find Javert, move through the characters he
is connected to, and select two of them."

**Pages used.** The working keyboard mock (screens/keyboard-walk.html), driven by real key presses
in a browser; the inspector render for one node (screens/inspector.html#one-node). The storyboard
and flow pages render blank in the participant view, so she never saw them.

**Outcome.** Failure on the task as worded: there is no Javert in the only graph the mock loads.
She then ran the same walk on the protein graph (TP53) to judge the keys, and that part worked
first time.

---

## Think-aloud

**1. Page loads.** "Okay. 'Protein interactions', 33 of 300. TP53 in the middle, hairball of
proteins round it. You told me Javert. Javert is Les Miserables. Either I am supposed to switch
graphs or someone loaded the wrong file. Let me look for a way to switch, without the mouse."

**2. Tabbing in.** Tab from the top of the page. Skip link, then Main menu, Graph, Data, Notes,
Assistant, one Tab stop each. Then the Graphs header, the search icon, the plus, the one graph
row, the Sets plus, the toolbar, and on the thirteenth Tab, the drawing.

"Thirteen Tabs to reach the thing I came for. The left rail is five separate stops -- that should
be one stop with arrow keys inside, like every toolbar. And the skip link I passed at the start --
I did not know what it skipped to, it gave me no text I could see. I would have taken it if it
said 'Skip to graph'."

"The Graphs list has one row: ppi-core-300. So no Les Miserables in here. There is nothing else to
switch to."

**3. On the drawing.** A card appears under the graph: "Graph drawing. Start: TP53, the walk starts
here. Degree 32, rank 2 of 300, DNA repair. Neighbors by Weight / Degree / Name, O. Shift+Arrow:
walk. Enter: select. ?: keys."

"Right, that is honest about what it is going to do. It has already decided the walk starts at
TP53 -- the highest-degree node in the view I suppose. Fine. But I want Javert."

**4. Quick actions, Ctrl+K, 'Javert'.** One row: 'Find "Javert" -- nodes, sets, styles and more,
in Find'. The footer says "This mock lists the selection and set commands only."

"No 'Go to Javert'. It is offering to search for it instead, which tells me it did not find an
exact name."

**5. Ctrl+F, 'jav'.** "No nodes match 'jav'."

"There it is. Javert is not in this graph. I cannot do the task as you gave it. In a real session
I would stop here and ask you which file you meant."

**Moderator (per protocol, no hint about the product):** "Do what you would do."

"What I would do is check whether the keys work on whatever is loaded, because if they do, loading
the right file is your problem, not the tool's. I will pretend TP53 is Javert."

**6. Plain Down arrow first, out of habit.** The view shifts. It says "View moved. Shift+Arrow
walks the graph."

"Good -- it told me the arrows pan and what to press instead. I did not have to guess. I would
have expected arrows to move between nodes, because that is what every list does, but I can live
with Shift if it tells me once, and it did."

**7. The key sheet, '?'.** A 'Keys' panel lists Everywhere (Ctrl+F, Ctrl+K, F6, ?) and Graph drawing
(Arrows move the view; Shift+Down walk into neighbors; Shift+Right / Shift+Left next / previous
neighbor; Shift+Enter back one step; Shift+Home back to the start; O order; Enter select; Space
toggle; ] [ step through the selection; Alt+Enter the inspector; Ctrl+Alt+Z previous selection; Esc
ends the walk; Tab to the table, walk kept). Footer: "graphty-element's default keys. Read only."

"This is the part I like. A reference page, not a tutorial. Every key on one sheet. 'Read only' --
so I cannot rebind them. That will matter to someone. Shift+Enter for 'back' is odd; I would have
guessed Shift+Up, and it says Shift+Up works too, fine."

**8. Ctrl+K, 'TP53', Enter.** "Walking the drawing. TP53, start of the walk, not selected. Degree
32, rank 2 of 300, module DNA repair. Nothing selected on canvas."

"'Go to' selects nothing. Good, that is what I want -- looking is not choosing. If Javert had been
in the file this is exactly how I would have found him: Ctrl+K, name, Enter. That part I would
call done."

**9. Shift+Down.** "PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98, degree
5, rank 247 of 300."

"'Weight 0.98.' The graph panel on the right says the edge weight is 'confidence'. So call it
confidence 0.98 here too. If this were Les Mis, the weight would be co-appearance counts, and I
would want the word 'co-appearances', not 'weight'. Also 'highest first' by weight -- fine as a
default, but for a first look at a character I would rather go by degree. O switches it; the
card shows Weight / Degree / Name, so I can see which order I am in. That I appreciate."

"Rank 247 of 300 at degree 5, and RPA1 later at degree 7 is 172. So ties get the same rank and the
next one skips. Standard competition ranking, I assume. It does not say, and the table column
'degree rank 1 to 300' does not say either. Minor, but I would want it in the docs."

**10. Shift+Right.** "RPA1, 2 of 32, weight 0.95, degree 7, rank 172 of 300." "1 of 32, 2 of 32 --
it keeps count. Good, I always know where I am in the list."

**11. Enter.** "RPA1 selected. 1 selected on canvas. ] and [ step through the selection." A ring
goes round RPA1; the Nodes table scrolls to RPA1 and highlights the row; the inspector on the right
changes to the selection.

**12. Shift+Right, Enter.** "RAD51, 3 of 32 ... RAD51 selected. 2 selected on canvas."

"Two selected, and Enter added, it did not replace the first. That is the thing I was worried
about -- in half the tools I use, 'select' means 'select only this'. Here it said '2 selected'
out loud and in the card. Done."

"Now the inspector says '2 selected', module DNA repair, degree 'Mixed', and a Selection list: RPA1
7, RAD51 5. What are 7 and 5? Degree, presumably, because it matches. But there is no column
header. An unlabelled number next to a name is exactly how a junior reads the wrong thing."

"And the table only shows RPA1 highlighted. RAD51 is off the bottom of what I can see. If I tab to
the table will it scroll to both? I did not try."

**13. Shift+Enter.** "Start, TP53." "Back to the hub in one key. Good."

**14. Esc.** "Walk ended at TP53. 2 selected on canvas." The card now reads "Walk kept: at the
start, TP53". "Esc ended the walk and kept my selection. One more Esc would clear it, the key
sheet says. Fine -- as long as I do not double-tap Esc by habit, because I would lose the
selection. Is there an undo? The sheet says Ctrl+Alt+Z 'previous selection'. Okay, there is a
way back."

**15. The inspector for one node (a separate screen).** "This one is called 'Human protein
interactions' and the graph is 'Interactions', not 'ppi-core-300' as in the other screen. Same
data? I assume so, but I would check. There is a 'Neighbors' button whose tooltip says 'Filter to
neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it. Shift+N.' So 'Neighbors' here filters the graph,
while in the walk 'neighbors' are what I step through, and on the quick-actions list there is
'Select neighbors'. Three things called neighbors. I would have pressed Shift+N expecting to
select them and instead hidden 267 nodes."

---

## Single Ease Question

**For the task as given: 2 of 7.** "I could not find Javert because he is not there. Nothing told
me what dataset I was in except the word 'Protein' at the top, and the one graph in the list. If
you are testing whether I can find a node, give me the file that has it."

**For the walk itself, on TP53: 6 of 7.** "Once I was on the drawing, find, step, select, select,
back, out -- every key did what the sheet said, every step told me where I was and how many were
selected. The minus one is the thirteen Tabs to get there and the unlabelled numbers in the
selection list."

## Would she use this instead of her current tool?

"For this job, no. In the notebook it is `sorted(G['Javert'], key=G.degree, reverse=True)` and I
have the list in one line, with the weights, and nothing gets hidden or deselected by a stray key.
But I do not hand a notebook to a fraud investigator. If I were giving someone who cannot or will
not use a mouse a way to look around a graph I built, this is better than Gephi, which has nothing
like it. So: not instead of my tool, but instead of 'sit next to them and drive'."

---

## What went wrong, in her words, ranked

1. **The requested node does not exist in the only loaded graph.** "Javert -- no nodes match." The
   task could not be done at all; nothing on screen named the dataset clearly enough to say so up
   front. Severity: high (for the study, not the product).
2. **Thirteen Tab presses to reach the drawing,** five of them on the left rail one icon at a time;
   the skip link at the top gave no visible label. Severity: medium.
3. **"Weight 0.98" where the graph says the weight is "confidence".** The spoken and shown value
   should use the column's own name (confidence; co-appearances for Les Miserables). Severity:
   medium.
4. **The Selection list in the inspector shows 7 and 5 with no label.** Probably degree; nothing
   says so. Severity: medium.
5. **"Neighbors" means three things:** the walk's list, "Select neighbors" in quick actions, and a
   Neighbors button that filters the graph to one hop. Severity: medium.
6. **Esc twice clears the selection;** easy to do by habit. Recovery exists (Ctrl+Alt+Z) but is not
   announced when it happens. Severity: low.
7. **Rank ties are not explained** (degree 5 is rank 247, degree 7 is 172). Severity: low.
8. **Graph name differs between screens** ("Protein interactions" / ppi-core-300 versus "Human
   protein interactions" / Interactions). Severity: low.

## What she liked

- Plain arrows pan, and the first press says "Shift+Arrow walks the graph" -- no guessing.
- One key sheet, reference style, reachable with "?" from anywhere.
- Go to a node by name selects nothing; Enter adds and never replaces; the count is said every
  time ("2 selected on canvas").
- Position in the list is always stated ("3 of 32 from TP53"), and the walk order (Weight / Degree /
  Name) is visible and switchable with one key.
- Shift+Enter back one step, Shift+Home back to the start, Esc keeps the selection.
