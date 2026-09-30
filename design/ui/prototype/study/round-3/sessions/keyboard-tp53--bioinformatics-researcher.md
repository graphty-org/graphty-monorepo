# Session: find TP53 and its neighbours without a mouse -- Dr. Chen, computational biologist

- Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md). Sighted, uses a
  trackpad normally; for this task the trackpad is off, so keyboard only.
- Task as given: "Without a mouse, find TP53 and look at who it connects to."
- Pages: screens/keyboard-walk.html (the protein network, 33 of 300 nodes shown), then
  screens/find.html (Find, shown on a different sample graph). Driven with real key presses in the
  study view (design notes hidden). The strip of prototype tabs across the top is not part of the
  product and is ignored below except where it cost Tab presses.
- Outcome: success, with difficulty. Found TP53 by eye in two seconds and by keyboard in about four
  minutes; the two keyboard routes that worked were ones she only found by guessing.

## Transcript

**0:00 -- first look.** (shot: r3-chen-keyboard-canvas-focused.png is the same screen after Tab)

> "Protein interactions, 33 of 300. Nodes table sorted by degree, TP53 at the top, degree 32, degree
> rank 2. Well, of course it's TP53. It's in the middle of the drawing with everything pointing at
> it. So finding it is not the problem, the problem is getting the cursor on it without a
> trackpad."

**0:10 -- Ctrl+F.**

> "Ctrl+F. That's what I do in every app, RStudio, the browser, Cytoscape's search box."

Nothing happens in the app. (In a real browser Chrome's own find bar would open and highlight
"TP53" in the table text, which does not select anything in the app.)

> "Nothing. OK, maybe it's the browser find then. That doesn't help me, it just highlights the
> word."

**0:25 -- slash.**

> "Some web tools use slash for search." -- Presses /. Nothing.

**0:40 -- Tab.** First Tab lands on a "Skip to the graph drawing. F6 moves between regions." link
in the top left corner (shot: r3-chen-keyboard-skip-link.png).

> "Skip to the graph drawing. That's sensible, but I didn't want the drawing, I wanted a search box.
> I'll keep tabbing and see what's there."

Tabs past it. Main menu, Graph, Assistant, Results, Notes on the left rail, then the "33 of 300"
filter chip, then a magnifier on the Graphs header.

> "Magnifier. Its label says 'Find in Graphs'. Find in graphs -- as in find one of my graphs in
> the list? I have one graph. I don't want to search for a graph, I want to search for a gene.
> Skip."

Continues: Add to Graphs, ppi-core-300, Add to Sets and paths, Add to Styles, Size by degree, the
tool bar, and on the 15th Tab the drawing gets a blue border.

> "Fifteen Tabs. In Cytoscape I'd have typed it in the search field in the corner by now. Should
> have pressed Enter on that skip link."

**1:30 -- the drawing has focus.** A card appears above the tool bar: "Start: TP53, the walk starts
here. Degree 32, rank 2 of 300, DNA repair. Neighbors by Weight / Degree / Name, O.
Shift+Arrow: next neighbor. Space: select. ?: keys."

> "Oh. It's already on TP53. That's convenient, but only because TP53 happens to be the biggest
> node. If I'd been asked for PALB2 this would start somewhere else. And nothing on the drawing
> is ringed -- the card says TP53 but TP53 itself looks exactly as it did before. I'm trusting the
> card."
>
> "'The walk.' What walk? I'll press the question mark it offers."

**1:45 -- the key sheet** (shot: r3-chen-keyboard-key-sheet.png).

> "Arrows move the view, Shift+Down starts the walk, Shift+Right next neighbour, Shift+Enter back,
> O changes the order. Space selects. Fine, that's readable, it's a table. There's no line on here
> that says how to search for a node. That's the first thing I'd want on a keys card."

Esc closes it.

**2:00 -- first step.** Shift+Down. PALB2 gets a double ring; the card reads "PALB2, 1 of 32 from
TP53. Weight 0.98. Degree 5, rank 247 of 300, DNA repair" (shot: r3-chen-keyboard-first-neighbor.png).

> "Now this I like. It's ordered by weight, highest first, and the graph panel says edge weight is
> confidence, so that's the STRING combined score. PALB2 at 0.98 -- yes, that's a well supported
> interaction. Rank 247 of 300 by degree: that's the kind of thing I want next to a hub. It's
> telling me the strongest partner isn't a hub itself."
>
> "But call it confidence. 'Weight' could be anything. I only know it's confidence because I happen
> to have read the right-hand panel."

Shift+Right twice: RPA1 0.95, RAD51 0.87.

> "Stepping through 32 of these one at a time is how you'd read a list to someone over the phone.
> It's fine for five. For 32 I want the list."

Presses O: "Neighbors by degree, highest first. UBC, weight 0.80, degree 21."

> "UBC first by degree. Ubiquitin. That's exactly the study-bias hub I don't care about. Good that I
> can flip the order, and good that it shows the confidence next to it anyway."

Shift+Up: back to TP53. Space: "TP53 added, 1 selected." Enter: the right panel shows TP53, Node,
module DNA repair, degree 32, #2 of 300.

> "OK, that's TP53 found and selected. Now 'who it connects to' as a list."

**2:50 -- trying to get the list.** Esc, Esc, Esc (ends the walk, then clears the selection --
she did not mean to clear it).

> "Hm, the third Esc threw my selection away. There's a 'previous selection' key on the card, but I
> didn't read that closely."

**3:00 -- Ctrl+K, a guess.**

> "Ctrl+K is the search in half the web apps I use -- GitHub, Slack. Try it."

A box opens with "Find a command" in it and a list: Select neighbors (grey), Select members,
Select all... (shot: r3-chen-keyboard-quick-actions.png).

> "'Find a command.' I don't want a command, I want TP53. But there it is: Select neighbors. Grey,
> because I just cleared the selection. Let me just type the gene."

Types TP53. The list becomes "Find in this graph: TP53" (shot: r3-chen-keyboard-quick-tp53.png).
Enter. TP53 selected. Enter again opens the right panel on TP53. The focus ring sits on the first of
three unlabelled icon buttons; no tooltip shows on keyboard focus.

> "Little network icon. After the list I just saw, I'm guessing that's 'select neighbours'."

Enter.

**3:40 -- the neighbours** (shot: r3-chen-keyboard-select-neighbors.png).

> "32 neighbors added, 33 selected. And -- everything is selected. Every node on the screen has a
> ring, every row in the table is blue. Of course: the filter is 33 of 300, and it's TP53 plus its
> 32 partners. So 'select neighbours' on this view tells me nothing I didn't have. I would have
> expected it to tell me they're all shown, or to reach into the other 267."
>
> "The Selection list on the right is TP53 32, PALB2 5, RPA1 7, RAD51 5 -- that's the confidence
> order again, but the confidence isn't in the list, only degree. And the table below is sorted by
> degree, not confidence. The walk card was the only place I saw the score."
>
> "Is 32 the degree in this filtered view or in the whole 300? The rank says 'of 300' so I assume
> full graph. The other mock I've seen shows two columns, filtered and full. This one should too."

**4:00 -- Tab to the table.** "Nodes table, filtered graph, 33 rows. TP53, row 1, selected." Down
arrow walks rows; every one is selected.

> "I can arrow down the rows. That's the one I'd actually use -- if there were a confidence column
> and a 'neighbours of TP53' filter that I could copy out."

**4:20 -- the Find page.** Moderator shows screens/find.html.

> "So this is what Ctrl+F is meant to open: a search box in the left panel, the hits as a list,
> 'Enter Select, Esc Close, F6 Next region' at the bottom. That's what I tried first, and that's
> what I'd want. Two things: it's shown on Les Miserables, not on my network, so I can't tell how it
> handles a gene symbol versus a UniProt ID. And the page I was actually on did nothing on Ctrl+F.
> If Ctrl+F does this in the product, most of my four minutes goes away."

## After the task

**Single Ease Question: 4 of 7.**

> "Finding TP53 was easy only because it was already the start of the walk. If it hadn't been, my
> first two instincts -- Ctrl+F and the magnifier -- led nowhere on this page, and I found the one
> that worked by guessing Ctrl+K from GitHub. The walk itself is good: neighbours ordered by
> confidence, with degree rank beside each one, is better than anything Cytoscape gives me from the
> keyboard, which is nothing. But 'look at who it connects to' means a list with the scores, and
> the list I got had no scores and was every node on the screen."

**Would she use this instead of her current tool?**

> "For this task? I'd do it in R: `neighbors(g, 'TP53')` and `E(g)[.from('TP53')]$combined_score`,
> ten seconds. In Cytoscape, from the keyboard, I can't do it at all, so this beats Cytoscape. It
> doesn't beat igraph. It would, for looking, if Ctrl+F found a gene and the neighbour list carried
> the confidence."

## Problems observed

1. **Ctrl+F does nothing on the network page, and nothing on screen names another search key.** Her
   first instinct; the design (Find) says Ctrl+F opens a search box, but on this page it is dead,
   and the keys card lists no search key. Severity 3.
2. **The Graphs header magnifier is read as "Find in Graphs" -- find a graph, not a node.** She
   skipped the one visible search control. Severity 3.
3. **Quick actions says "Find a command"; typing a gene name there is a guess.** It works (exact
   name gives "Find in this graph: TP53") but nothing invites it, and Ctrl+K is not printed
   anywhere she looked. Severity 2.
4. **"Select neighbors" on a view that is already TP53's neighbourhood selects everything.** With
   the filter at 33 of 300 (TP53 and its 32 partners) the result is every node, with no word that
   all neighbours are already shown or that the filter hides none. Severity 2.
5. **The confidence score appears only in the walk card, and there as "Weight".** The Selection list
   and the table show degree only; the edge score, which is what "who it connects to" means to her,
   is not in the list she would copy. Severity 3.
6. **Degree does not say filtered or full graph.** "Degree 32, rank 2 of 300" leaves her guessing
   which graph the 32 counts; the Find page shows both columns, this one does not. Severity 2.
7. **At the start of the walk the start node carries no mark on the drawing.** The card says "Start:
   TP53" but TP53 looks unchanged until the first step. Severity 1.
8. **Fifteen Tab presses to reach the drawing if the skip link is passed.** The skip link is there
   and correct; a sighted user reading it as "not what I want" pays for it. Severity 1.
9. **The inspector's action buttons are icons with no visible name on keyboard focus.** She guessed
   "Select neighbors" from the icon. Severity 2.
10. **A third Esc clears the selection she had just made.** Recoverable with the previous-selection
   key, which she did not notice. Severity 1.

## What worked

- Neighbours in confidence order with degree rank beside each one: "the strongest partner isn't a
  hub" in one keystroke.
- O to reorder by degree or name, and the card showing which order is on.
- The keys card: short, grouped, readable.
- Quick actions accepting an exact gene name and selecting it.
- The table as a keyboard grid that follows the selection.

Screenshots: shots/record/r3-chen-keyboard-skip-link.png, r3-chen-keyboard-canvas-focused.png,
r3-chen-keyboard-key-sheet.png, r3-chen-keyboard-first-neighbor.png,
r3-chen-keyboard-quick-actions.png, r3-chen-keyboard-quick-tp53.png,
r3-chen-keyboard-select-neighbors.png.
