# Session: keyboard walk with Shift+Arrow -- sighted keyboard user (round 3)

**Task given by the moderator:** "Using only the keyboard, find Javert, walk to his most connected
neighbour and back, and select two of his neighbours."

**Screens used:** the keyboard walk mock (screens/keyboard-walk.html, driven with real key presses in
the participant view, where the pink screen-reader strip is hidden), the Find mock
(screens/find.html, its drawn states, including "A name typed into Quick actions"), and the
inspector page (screens/inspector.html).

**Facilitator note:** the persona file for this participant is still not in the personas folder.
The participant was played as the same composite as in round 2, so his reactions to what changed
can be compared: Tomas, 36, data engineer at a freight logistics company, tendinitis in his right
wrist, a few minutes of mouse a day. Tiling window manager, Vim keys, Vimium in the browser ("/"
searches, "f" shows link hints). Does graph work in networkx in a notebook; opens Gephi only when a
colleague insists, because Gephi cannot select a node without the mouse. Knows Les Miserables from
networkx tutorials. Judges a tool by how many keys a job takes and whether he can predict the next
one. He took part in round 2, so he remembers the broad shape of the walk but not every key.

**Mock limit, again:** the walk mock is still drawn on the protein network (TP53 at the center).
Javert exists only in the Find mock, as drawn states. The study's own task card for this screen now
says "find TP53", but the moderator read "Javert". Tomas again used TP53 as his stand-in after
checking that Javert is not in the drawing.

---

## 1. Arriving

> Keyboard only. Page loads, nothing focused. "/" out of habit. Nothing, no hint, nothing moves.
> Fine, Tab.
>
> Tab goes to "Gallery", the mock's state tabs, the annotations box... that's the prototype, I'll
> ignore it. Then the rail, the graph list, the styles... I counted: eighteen presses before the
> drawing gets the blue frame. Last time it was seventeen. It hasn't got shorter.
>
> And this time there's no pink bar telling me what to do. Last round the pink bar said "Tab to the
> drawing, then Shift+Down". Without it, I'm just tabbing and hoping. I remember F6 from last time,
> but only because I'm the kind of person who reads key sheets. Nothing on this screen says F6.

## 2. Drawing focused

Screen: blue frame on the drawing. A card above the toolbar: "Start: TP53, the walk starts here,
nothing selected. Degree 32, rank 2 of 300, DNA repair. Neighbors by Weight / Degree / Name, O.
Shift+Arrow: next neighbor. Space: select. ?: keys."

> Right, the card. I like the card. It's the only place that tells a sighted person what the keys
> are, and it's where my eyes already are. Still proteins, though. No Javert.
>
> Ctrl+K. Type "javert".

Quick actions: `No commands or nodes match "javert"`, and under it a grey line "This mock lists the
selection and set commands only."

> OK, that's better than last time. "Commands or nodes" -- so it does look at names, and Javert just
> isn't in here. That's the answer I needed. I'd have liked "Find 'javert'" as a row to push it on
> to the real search, the way the Les Mis screen does it, but at least I'm not left wondering
> whether I'm in the wrong box.
>
> (The grey "this mock lists..." line is the prototype talking; ignoring it.)
>
> So Javert's not in this file. I'll look at the Les Mis screen first, then come back.

## 3. The Les Miserables screens (Find)

Screen, state "A name typed into Quick actions": query "marius", a Nodes row "Marius -- Filtered out
by 'Filter out group 8'", then `Find "marius" -- nodes, sets, styles and more, in Find`, and a
footer "Enter Choose, Esc Close, F6 Next region".

> This is the one I wanted on the other screen. Name first, and a second row that hands it to the
> full search if I only half remember it. And -- there it is -- "F6 Next region" in the footer.
> So F6 IS a thing, and they've started printing it. Just not on the drawing where I actually
> needed it.
>
> "Enter: Choose". Choose what? Last time Enter on a name selected him. "Choose" doesn't tell me
> whether I'm going to him or selecting him. That's the difference that bit me last round.
>
> Find itself: "thenard", two hits, Thenardier selected, and the footer again says Enter Select,
> Esc Close, F6 Next region. Consistent, good. Javert's in the table: degree 10 "filtered graph",
> 17 "full graph". Column headers now say which is which, fine. But when I walk, which degree does
> "most connected neighbour" use? The walk card on the protein screen says "Degree 21, rank 7 of 300"
> -- 300 is the full graph, but the list I'm walking is the filtered 33. I'd guess full graph. I'm
> guessing.

## 4. Back to the proteins -- TP53 as Javert

> Ctrl+K, "tp53". One row, "Find in this graph: TP53". Enter.

Screen: TP53 gets a black ring, the inspector switches to TP53, the card says "Start: TP53 ... 1
selected on canvas", the table highlights TP53.

> Wait -- "1 selected on canvas". I told myself last time: finding him selects him. And yes, it
> still does. At least this time it's on the card straight away, top right, so I see it before I
> start. I know it's going to bite me at the "select two neighbours" step. I'll leave it and see.

## 5. Most connected neighbour

> Shift+Down.

Card: "PALB2, 1 of 32 from TP53. Weight 0.98. Degree 5, rank 247 of 300." Neighbors by: Weight.

> Weight order again by default. PALB2, degree 5, not what I want. O.

Card: "UBC, 1 of 32 from TP53. Weight 0.80. Degree 21, rank 7 of 300. Unassigned." Neighbors by:
Degree. A double ring on UBC in the drawing.

> There. One key and the top of the list is the answer. Still the best thing on this screen. I don't
> have to page through thirty-two and remember a max, which is exactly what I'd do in Gephi with a
> sorted table and a mouse.
>
> The double ring on UBC versus the single black ring on TP53 -- I can tell them apart, "where I am"
> versus "what's selected". Took me a second, but it holds.

## 6. And back

> The card says how to go forward. It says nothing about back. Shift+Up, because that's the opposite
> of what I pressed.

Card: "TP53, start of the walk, selected, 1 selected on canvas."

> Works. I know from the key sheet that the "real" key is Shift+Enter and Shift+Up is the spare.
> I'd never have guessed Shift+Enter. The screen reader gets told "Shift+Enter goes back" when you
> start; I get nothing. Put "Shift+Up: back" on the card, it's one more line.

## 7. Two neighbours

> Shift+Down -- UBC again, it remembered degree order. Good. Space.

Card: "UBC ... selected ... 2 selected on canvas."

> Two. Because TP53 is still in there from Ctrl+K. Knew it.
>
> Shift+Right, RPS8, degree 17. Space. "3 selected on canvas."
>
> Now I clean up. Shift+Home -- back to the start, I remember it from the sheet. "TP53, start of the
> walk, selected, 3 selected." Space. "2 selected on canvas." Done: UBC and RPS8.
>
> That's four extra keys and a thing I had to remember from last week. Somebody new would hand in
> three selected nodes and not notice. In Vim, jumping to a line doesn't yank it. Going to a node
> shouldn't select it.

## 8. Ending

> Esc.

Card: "Start: UBC, the walk starts here, 2 selected on canvas." Inspector: "2 selected, Nodes ...
Selection 2: UBC 21, RPS8 17."

> Two things, both the same as last time.
>
> The card says the next walk starts at UBC. I ended at TP53. If I hit Shift+Down now I'm walking
> from UBC's neighbours, not Javert's. It's predictable once you know it picks the first selected
> node, but I'd expect it to start where I left off.
>
> And the inspector's list: "UBC 21, RPS8 17". What's 21? I know it's degree because I just read it,
> but the list doesn't say. One word would do it.

## 9. Key sheet and the inspector

> "?" -- the key sheet. Still good: one card, all the walk keys. Still no F6 on it, and the Find
> screen has F6 in its footer now, so the sheet is behind the rest of the app.
>
> On the inspector page, the neighbours button's tooltip says "Filter to neighbors, 1 hop: 33 nodes.
> Ctrl+Z undoes it. Shift+N". Last time I thought Shift+N would select his neighbours. It filters.
> That's fine, and it's honest that it tells you the size and the undo. But then there's no key that
> selects all his neighbours, and the walk sheet doesn't mention Shift+N at all.

---

## After the task

**Single Ease Question (1 very hard, 7 very easy):** 4

> Same as last time, for mostly the same reasons. The walk itself is a 6: O for degree, Shift+Up for
> back, the card with the numbers. What changed is small: "no commands or nodes match" tells me what
> happened now, and the Les Mis screens print F6. What didn't change is the thing that cost me: going
> to a node by name selects it, so "select two of his neighbours" gives you three. And I still tabbed
> eighteen times to reach the drawing with nothing on screen telling me the shortcut.

**Would you use this instead of your current tool?**

> Instead of Gephi, yes, same answer as before -- Gephi can't do any of this without a mouse, and
> this can. Instead of networkx, no; for "most connected neighbour" I'll still write one line. For
> poking around a graph and picking a few nodes to keep, yes, and my wrist would thank me. But I'd
> want the find-selects-him thing fixed before I recommend it to anyone, because they won't notice
> the count the way I did.

---

## Problems

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Keyboard walk, Quick actions | Unchanged from last round: going to a node by name (Ctrl+K, Enter) selects it, so walking to two neighbours and pressing Space gives three selected nodes. The card now shows "1 selected on canvas" up front, which is why Tomas saw it coming; he still had to go back with Shift+Home and deselect (four extra keys). A newcomer would hand in three. | 3 |
| Keyboard walk, arrival | Eighteen Tab presses to reach the drawing; with the screen-reader strip hidden, a sighted user gets no instruction on arrival at all, and F6 is not shown anywhere on this screen or on its key sheet. | 3 |
| Keyboard walk, focus card | How to go back is not on the card ("Shift+Arrow: next neighbor. Space: select. ?: keys."). The screen reader is told "Shift+Enter goes back"; a sighted user is told nothing and must guess Shift+Up or open the sheet. | 2 |
| Keyboard walk, after Esc | After Esc the card says "Start: UBC, the walk starts here" though the walk ended at TP53; the next Shift+Down walks from the first selected node, not where he stopped. | 2 |
| Find / Quick actions (Les Miserables) | The Quick actions footer says "Enter: Choose" for a node row; it does not say whether Enter goes to the node or selects it, which is the exact difference that causes the three-selected problem. | 2 |
| Find, degree columns | Degree is shown for the filtered graph and the full graph; the walk's degree order and "rank of 300" do not say which one "most connected" uses when a filter is on. | 2 |
| Keyboard walk, Quick actions | A name that is not in the graph says "No commands or nodes match" (clearer than last round) but offers no hand-off to Find, unlike the Les Miserables Quick actions, which offers `Find "marius"`. | 1 |
| Keyboard walk, key sheet | F6 appears in Find's and Quick actions' footers but not on the walk's key sheet; Shift+N (filter to neighbours) is in the inspector tooltip but not on the sheet, and there is no key to select all of a node's neighbours. | 1 |
| Keyboard walk, inspector | The selection list reads "UBC 21, RPS8 17" with no word for the number. | 1 |
| Mock limit (not the design) | The walk mock is still drawn on proteins; Javert exists only in the Find mock. The task cannot be done end to end on one dataset, and the study's own task card for this screen now says TP53 while the moderator's wording says Javert. | 2 |

**Delights:** O puts the most connected neighbour first ("one key and the top of the list is the
answer"); Shift+Up for back; the card shows the numbers a screen reader would hear, where a sighted
user is looking; "No commands or nodes match" now says what happened; the Les Miserables Quick
actions and Find print Enter / Esc / F6 in a footer; the key sheet still lists every walk key on one
card; the double ring (where I am) and single ring (selected) are distinguishable.
