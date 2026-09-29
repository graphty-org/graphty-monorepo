# Session: keyboard walk with Shift+Arrow -- sighted keyboard user

**Task given by the moderator:** "Using only the keyboard, find Javert, walk to his most connected
neighbour and back, and select two of his neighbours."

**Screens used:** the keyboard walk mock (screens/keyboard-walk.html, driven with real key presses),
the Find mock (screens/find.html, its drawn states), and the inspector page (screens/inspector.html).

**Facilitator note:** the persona file for this participant was not in the personas folder when the
session ran. The participant was played as a composite built from the round-1 keyboard sessions
(the finding "works for a screen reader, less so for a sighted keyboard user") and from the way
people with repetitive strain injury describe going mouseless in public forums (browser extensions
that add link hints, tiling window managers, Vim keys everywhere, and a standing distrust of apps
that say "keyboard accessible" and mean "Tab reaches it eventually").

The composite: Tomas, 36, a data engineer at a freight logistics company. Tendinitis in his right
wrist since 2021; he allows himself a few minutes of mouse a day and spends them carefully. He runs
a tiling window manager, Vim keys in his editor, and Vimium in the browser, so he expects "/" to
search and "f" to show link hints. He does his graph work in networkx in a notebook and only opens
Gephi when a colleague insists, because in Gephi he cannot select a node without the mouse. He knows
the Les Miserables co-appearance graph from networkx tutorials. He is not a designer; he judges a
tool by how many keys a job takes and whether he can predict what the next key will do.

**Mock limit found during the session:** the keyboard walk mock is drawn on the protein network (33
of 300 proteins, TP53 at the center), not on Les Miserables; only the Find mock has Javert, and
there it is a static picture. The moderator, when asked, said only "do what you would do". Tomas
used TP53, the hub of the protein drawing, as his stand-in for Javert. Problems below say which are
the mock's and which are the design's.

---

## 1. Arriving on the keyboard walk page

> Right, keyboard only. The page loads, nothing has focus. First thing I do in any web app is
> press "/" because that's search in half the things I use. Nothing. OK, Tab.
>
> Tab lands on "Gallery" up top, then the mock's own tabs, then the annotations checkbox. That's the
> prototype, not the app, I'll ignore it. Keep tabbing. Rail buttons -- Graph, Assistant, Results,
> Notes -- then the "33 of 300" chip, the graph list, the styles list, the toolbar... seventeen
> presses before the drawing gets a blue frame. That's a lot, but the pink bar -- the screen reader
> strip -- said "Tab to the drawing, then press Shift+Down" so at least somebody told me.
>
> I'd have hit F6 if I'd known. I only found F6 later in the key sheet. Nothing on the screen says F6.

Moderator note: the strip at the top is the screen reader's text, shown for sighted testers; it is
not in the product. Tomas read it anyway; a real sighted user would not have it.

## 2. Canvas focused -- looking for Javert

Screen: a panel above the toolbar appears: "Start: TP53, the walk starts here. Degree 32, rank 2 of
300, DNA repair. Neighbors by Weight / Degree / Name, O. Shift+Arrow: next neighbor. Space: select.
?: keys."

> OK, this is nice. It tells me where I am and what the keys are, in the drawing itself, not in a
> help page. But -- there's no Javert. These are proteins. TP53, UBC, BRCA1. Is this the wrong file?
>
> I want to search. Ctrl+F would give me the browser's find bar, which is the wrong thing in a
> canvas app, so I try Ctrl+K because every app I use has Ctrl+K now.

Ctrl+K opened Quick actions: "Select neighbors, unavailable, nothing selected" and ten more commands.

> Type "javert". "No commands match." Zero results. So either it doesn't search names, or Javert
> isn't here. I can't tell which. It doesn't say "no node called javert", it says no *commands*.
> That's the part that worries me: if I'd typed a real name and it said "no commands match" I'd
> think Ctrl+K only does commands.
>
> (asks the moderator whether it's the right dataset; moderator: "do what you would do")
>
> Fine. I'll open the Find screen, it has Les Mis in it.

## 3. The Find mock (Les Miserables)

Screen: Find open in the left panel, query "thenard", two hits (Thenardier, Mme.Thenardier), Javert
visible in the drawing and in the table below: degree 10 in the filtered graph, 17 in the full graph.

> OK, there's a search box in the left panel with "Name, id or value". This is what I wanted Ctrl+K
> to be. The tooltip says it opens with Ctrl+F -- good, so Ctrl+F is the app's, not the browser's.
> I'd type "javert" here and I'm pretty confident I'd get one hit. There's no Javert state to click,
> but "thenard" gives two rows and the first is selected, so I'll take it on faith.
>
> Question, though: "most connected neighbour". The table has two degree columns -- "filtered graph"
> 10 and "full graph" 17 for Javert. Which one does "most connected" mean? The walk thing later says
> "degree 21, rank 7 of 300" and doesn't say which. I'd assume the one I'm looking at.
>
> Also: how do I get from this Find list to walking? The tooltip says Esc closes Find and "the
> selection stays". Then I'd have to get back to the drawing -- another pile of Tabs, or F6 if I
> remember it. Nothing here says "Shift+Down to walk from Thenardier".

## 4. Back on the protein drawing -- TP53 as Javert

> I'll pretend TP53 is Javert. Ctrl+K again, type "tp53".

Quick actions: a "Find in this graph" group with one row, "TP53". Enter.

> There it is. So Ctrl+K *does* find names, when they exist. Enter -- it's selected, the ring's on
> it, the inspector on the right says TP53, and I'm back on the drawing with the blue frame. That's
> genuinely good. Two keys and a name. That's the Vimium feeling.

## 5. Walking to the most connected neighbour

> The hint says Shift+Arrow. Which arrow? I press Shift+Down because the strip said Shift+Down
> earlier.

Pill: "PALB2, 1 of 32 from TP53. Weight 0.98, degree 5, rank 247 of 300. Neighbors by Weight."

> PALB2, degree 5. That's not the most connected, it's sorted by weight. And "weight" -- the
> right-hand panel says the edge weight is "confidence". Same thing, I assume. Whatever. The
> Weight / Degree / Name switch is right there with "O" next to it. Press O.

Pill: "UBC, 1 of 32 from TP53. Weight 0.80, degree 21, rank 7 of 300. Neighbors by Degree." UBC
gets the focus ring on the drawing.

> Oh, that's exactly what I wanted. One key and the first neighbour IS the answer. UBC, degree 21.
> I don't have to walk thirty-two nodes and remember a running max. That's the thing Gephi would make
> me sort a table for.
>
> Now back. The hint on the pill doesn't say how to go back. It says "Shift+Arrow: next neighbor.
> Space: select. ?: keys." I'd guess Shift+Up, which is the opposite of what I pressed.

(Shift+Up works: it is the second binding for back.)

> Shift+Up: "Start, TP53." The pill says "TP53, start of the walk, selected". Back. Good. The
> strip earlier said "Shift+Enter goes back" -- so there are two keys for it. I'll use Shift+Up,
> it's where my fingers are.

## 6. Selecting two neighbours

> Shift+Down again -- UBC, because it remembered Degree. Space. "UBC added, 2 selected on canvas."
>
> Two? I've only selected one neighbour.
>
> Oh. TP53 is still selected, from when I found him with Ctrl+K. Hm. Shift+Right, RPS8, degree 17.
> Space. "3 selected on canvas." The inspector says "3 selected: TP53 32, UBC 21, RPS8 17."
>
> So I've selected Javert plus two neighbours, not two neighbours. The task said two of his
> neighbours. I have to undo him. Where is he? Shift+Home, "back to the start", says the key sheet.
> Shift+Home: "Start, TP53. 3 selected." Space: "TP53 removed. 2 selected on canvas." Done.
>
> That's fine once you know, but it's a trap. Finding a node with Ctrl+K *selects* it. I didn't ask
> to select him, I asked to go to him. In Vim, jumping to a line doesn't yank it.

## 7. Ending and checking

> Esc. "Walk ended at TP53. 2 selected on canvas." The inspector: "2 selected, Nodes. Selection 2:
> UBC 21, RPS8 17."
>
> Two things. The numbers 21 and 17 in the inspector list have no label. I know they're degree
> because I just saw them, but a colleague wouldn't.
>
> And the pill now says "Start: UBC, the walk starts here" -- but the strip said the walk ended at
> TP53. If I press Shift+Down again I start from UBC, not where I was. I'd expect it to pick up at
> TP53. I didn't press it, but I'd have been surprised.
>
> Out of curiosity, "?" -- the key sheet. Oh, that's good: every key on one card, "graphty-element's
> default keys". That's where I'd have learned Shift+Home and that Esc twice clears the selection. It
> should say F6 though; the only place I saw F6 was the Tab trip at the start. And Enter "Open the
> inspector" -- I pressed Enter on a walked node once and the inspector switched to just that node,
> "53BP1, selected", while two were selected. I got out with Esc, but for a second I thought I'd lost
> the other one.

## 8. The inspector page

> I looked at the inspector page. It's a document, lots of text and states, not something I can
> drive. The one-protein state has the neighbour-select button with "Shift+N" in its tooltip. I
> didn't know about Shift+N from the walk. If that selects all neighbours, that's the other half of
> the job, but it's not on the key sheet on the walk screen.

---

## After the task

**Single Ease Question (1 very hard, 7 very easy):** 4.

> The walk itself is a 6. O for degree and Shift+Up for back are exactly right, and the pill showing
> the numbers means I don't need a screen reader to know what I'm on. What drags it down: Ctrl+K
> found my node by selecting it, which silently put him in my selection, and I only caught it because
> the count said 2 when I expected 1. Seventeen Tabs to the drawing on arrival. And "no commands
> match" for a name.

**Would you use this instead of your current tool?**

> Instead of Gephi, yes, straight away, because in Gephi I can't do any of this without a mouse. I
> would not give up networkx for it -- for "most connected neighbour" I'd still write one line of
> Python. But for looking around a graph, following links from a node, picking a few to keep, this
> is the first graph tool I've seen where my wrist doesn't hurt afterwards. Fix the find-selects-it
> thing and put F6 somewhere I can see it.

---

## Problems

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Keyboard walk, Quick actions | Finding a node by name with Ctrl+K and Enter selects it. Walking to its neighbours and pressing Space then adds to that selection, so "select two of his neighbours" produced three selected nodes including the start node. Tomas noticed only because the count read 2 after his first Space, and had to go back with Shift+Home and deselect. | 3 |
| Keyboard walk, Quick actions | Typing a name that is not in the drawing ("javert") says "No commands match", the same words as a mistyped command. Tomas could not tell whether Ctrl+K searches names at all. | 2 |
| Keyboard walk, arrival | Seventeen Tab presses from the top of the page to the drawing; F6 (the region jump) is not shown anywhere on screen and is not on the key sheet. | 2 |
| Keyboard walk, focus pill | The pill's hint names forward keys only ("Shift+Arrow: next neighbor"); how to go back is not on the screen. Tomas guessed Shift+Up and it worked; the strip said Shift+Enter. | 1 |
| Keyboard walk, after Esc | After Esc the pill says "Start: UBC, the walk starts here" while the message says the walk ended at TP53; the next Shift+Down would start from the first selected node, not where he was. | 2 |
| Keyboard walk, inspector | The inspector's selection list shows "UBC 21, RPS8 17" with no word for the number. | 1 |
| Keyboard walk, Enter on a walked node | Enter on a walked node switched the inspector to that one node ("53BP1, selected") while two were selected; he briefly thought he had lost the other. | 2 |
| Find, Les Miserables | Two degree columns (filtered graph 10, full graph 17 for Javert); the walk pill says "degree 21, rank 7 of 300" without saying which graph, so "most connected" is ambiguous when a filter is on. | 2 |
| Find | No on-screen route from a Find hit to walking from it (Esc closes Find, then the user must find the drawing again). | 2 |
| Keyboard walk, focus pill | "Weight" on the pill, "confidence" as the graph's edge weight in the right column: two words for one value. | 1 |
| Inspector | Shift+N (select neighbours) appears in the inspector's tooltip but not on the walk's key sheet. | 1 |
| Mock limit (not the design) | The walk mock is drawn on proteins; Javert exists only in the Find mock, as a picture. The task cannot be done end to end on one dataset. The older renders in shots/ (keyboard-walk--s1.png, --s2.png) still show "Shift+Up back" and "by confidence", which the live page has replaced. | 2 |

**Delights:** O switching the neighbour order to degree put the answer first ("one key and the first
neighbour IS the answer"); Shift+Up for back; the pill shows the values a screen reader would hear;
Ctrl+K with an exact node name goes straight to it; the "?" key sheet lists every key on one card.
