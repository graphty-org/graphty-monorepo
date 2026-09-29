# Get back -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science. Gephi since 0.8, teaches it every year, NetworkX for anything that has to be reproducible.
Has wanted undo in Gephi for a decade and tests it the moment she makes a mistake. Works on a
MacBook, so her hands say Cmd+Z. See ../../personas/gephi-holdout.md.

**Task as given by the moderator:** "Something on the screen just changed that you did not expect.
Get back to where you were."

**Screens seen:** the undo mock in its participant view (Les Miserables sample, 27 of 77 nodes,
three filter steps, a hand-built selection of Valjean and his neighbours just cleared by a click on
empty canvas); the same screen after one undo; the main menu's Edit submenu with Undo history open;
the screen after redo; the table's Previous selection button and what it restored; the filter
chip's steps list.

Renders she looked at:
- `../../../shots/tasks/get-back/01-undo.png` (the starting screen)
- `../../../shots/screens__undo-s2--study.png` (after Cmd+Z: 40 of 77 nodes, "Undone: Filter out group 8")
- `../../../shots/r4-mara-getback-editmenu.png` (main menu, Edit, Undo history, at that point)
- `../../../shots/tasks/get-back/01-undo.png` again (after Redo: back to 27 of 77; same drawing)
- `../../../shots/r4-mara-getback-s0.png` (after Previous selection: 18 nodes selected, inspector shows them)
- `../../../shots/tasks/get-back/02-filter-chip.png` (the steps list, opened from the chip)

## Think-aloud

**The starting screen.** "Right. Something changed. Let me find out what before I touch anything --
no, that's a lie, I'll touch something, but let me look first."

"Graph panel on the left, chip says 27 of 77 nodes, 3 steps. That's a filter chain, fine. Canvas
looks like the Les Mis co-appearance network, I've taught this one a hundred times -- Valjean in the
middle, Fantine's cluster up top. Inspector on the right says Statistics, 'On: filtered graph, 27 of
77 nodes', edges 104, density 0.296. Good. That's the first tool that has told me what a statistic
ran on without me asking. Gephi never says."

"Now the table. 'Selected: none, showing the previous selection.' So I had a selection and it's
gone. I'd have been looking at Valjean's neighbourhood and I clicked the background. That's what
changed. In Gephi that's also what happens, and in Gephi there's nothing you can do about it."

**First move: Cmd+Z.** "Cmd+Z. Obviously. Let's see if it covers selection."

(After the undo.) "No. No, it doesn't. The graph just grew -- there's a whole blue cluster at the
bottom right that wasn't there. Marius, Enjolras, Gavroche -- that's the barricade, group 8. There's
a black bar above the toolbar: 'Undone: Filter out group 8'. So it undid my last filter step, not my
click. Chip now says 40 of 77 nodes, 2 of 3 steps. Statistics say 40 of 77, edges 193."

"OK. I'll give it this: it told me exactly what it undid, in words, and the numbers all moved
together. The legend moved too -- group 8, 13. I can check that. But that's not what I wanted. The
thing I lost wasn't a filter, it was a selection, and the undo key doesn't know about selections.
Every other program I use, if I click and lose something, Cmd+Z brings it back."

"And now the table is doing something I don't like. 'full graph' column -- Valjean 36, Thenardier
16, Javert 17, Fantine 15, then Gueulemer and Babet are blank. Blank. Is that missing? Did it fail
to compute? Degree filtered 10, full graph nothing." (Pause.) "Oh, I suppose it's blank because it's
the same number. With group 8 back in they have all their neighbours. Don't do that. A blank cell in
a column of numbers is a missing value. If I export this to R, what's in that cell? I'd rather see
10 twice than guess."

**Checking what the undo covers.** "Where's the menu. There's no menubar -- the three lines, top
left. File, Edit, View, Selection, Algorithms, Recipes. Edit. 'Undo Filter to degree >= 5, Ctrl+Z.
Redo Filter out group 8, Ctrl+Shift+Z.' Good, it names both. 'Undo history.' Let me see."

"Two entries: 'Filter to degree >= 5, Undo back to here (1 step)' and 'Filter to degree >= 2, Undo
back to here (2 steps).' Only filter steps. No 'Clear selection' in there. So selection really isn't
an undo step here, it's a separate thing."

"And I have to say, 'Undo back to here' -- if I click 'Filter to degree >= 5', do I end up with
that filter or without it? The 1 step says without, I think. In Photoshop's History panel you click
a line and you're at that line, with it done. This reads the other way round. I wouldn't click it
without trying it on something I didn't care about."

"Below that: 'Previous selection, Ctrl+Alt+Z.' There it is. That's what I want. It's a different key
from undo. I'll never remember Cmd+Option+Z; I'd remember it's in the menu, maybe."

**Putting the filter back.** "First I undo my undo. Redo is right there -- click it. Or Cmd+Shift+Z,
same thing." (Clicks Redo.) "Back to 27 of 77, 3 steps. The bar says 'Redone: Filter out group 8'.
Blue cluster gone. Density 0.296 again. Fine. So I'm back where I started, minus the selection."

**Getting the selection back.** "Now, I saw in the table line -- 'Previous selection' and 'Show
filtered graph' sitting after the 'Selected: none' text. I read those as column hints the first time,
they're so faint. It's a button?" (Clicks Previous selection.) "There. 'Selected: 18 of 27 nodes.
Sorted by degree.' Rings on the nodes on the canvas -- very thin rings, I have to squint on the laptop
screen -- and the inspector switched to '18 nodes', with a breakdown: group 2 seven, group 4 seven,
group 5 three, group 3 one. Valjean plus seventeen. That's the neighbourhood I had."

"So if I'd read the table line first, I'd have been done in one click. I didn't, because my hand
went to Cmd+Z before my eyes went to the table. That'll be true of every one of my students too."

**Checking the filter chain, because I don't trust it yet.** "While I'm here -- the chip. Click it."
(Steps list opens.) "'Filter to degree >= 2, took out 17, 60 left. Filter to degree >= 5, took out
20, 40 left, keeps only nodes with at least 5 neighbors among the 60 it reads. Filter out group 8,
took out 13, 27 left.' That's how Gephi's filter chain works too -- each one reads the output of the
one above -- but Gephi never writes it out. 'Among the 60 it reads.' Yes. That's the sentence I have
to draw on the whiteboard every year. Good."

"The checkboxes -- so undo unticked a step rather than deleting it. That's actually the right idea;
I'd want that. In Gephi if I drag a filter out of the chain it's gone and I rebuild it."

"This panel says 'characters' and 'Character pairs 104 of 254' on the right, and the other screen
said nodes and edges. Which is it? 'Character pairs' is edges. Call them edges. If I'm writing a
methods section I need the word that's in the literature, not one it made up for the sample."

"Is anything wrong with these steps? Nothing here tells me. You asked me to get back to where I was;
I'm back. If one of those steps was a mistake, that's my problem to know, not the screen's."

## Single Ease Question

**5 of 7.** "One wrong turn, and it was the software's wrong turn, not mine -- Cmd+Z should have
been the answer, and instead it took away a filter. It told me plainly what it did, and Redo fixed
it in one press, so it cost me ten seconds, not an afternoon. The real fix was one click, but it was
in the faintest text on the screen."

## Would she use this instead of her current tool?

"For this -- recovering from a mistake -- it's already better than Gephi, which is a low bar because
Gephi has nothing. An undo that names what it undid, filter steps that switch off instead of
vanishing, statistics that say what they ran on: those are three things I've complained about for ten
years. But no, I wouldn't switch on the strength of this. I haven't seen it open my GEXF, I haven't
seen ForceAtlas2 with my parameters, I haven't seen an SVG. Undo is a reason to try it with my own
data. It's not a reason to rewrite my course."

## Findings

- **Cmd+Z does not bring back a lost selection; it undid a filter step instead.** Her reflex was the
  undo key, and it reversed the last filter, visibly changing the graph from 27 to 40 nodes. The
  selection has its own key (Ctrl+Alt+Z, shown as proposed in the menu) and its own button.
  > "The thing I lost wasn't a filter, it was a selection, and the undo key doesn't know about selections."
- **The Previous selection button reads as a hint, not a control.** It sits in faint text on the
  table's scope line; she read it only after the undo detour.
  > "I read those as column hints the first time, they're so faint."
- **Blank cells in the "full graph" column read as missing data.** When a node's filtered degree
  equals its full-graph degree the cell is empty; she took it for a failed computation and asked what
  would land in R.
  > "A blank cell in a column of numbers is a missing value. I'd rather see 10 twice than guess."
- **"Undo back to here" is ambiguous about whether the named step survives.** She could not tell
  whether choosing "Filter to degree >= 5" keeps that filter or removes it, and would not click it on
  real work.
  > "In Photoshop's History panel you click a line and you're at that line, with it done. This reads the other way round."
- **Two vocabularies for the same thing across screens.** The undo screen says nodes and edges; the
  steps-list screen says characters and "Character pairs". She wants the standard terms.
  > "'Character pairs' is edges. Call them edges."
- **Selection rings are too thin to see on a laptop screen.** The only canvas signal that the
  selection came back was a thin outline she had to squint at.
- **The Previous selection key will not be remembered.** She would find it in the menu, not in her
  hands.

## What worked

- The undo line named the exact step it undid, in words, and stayed on screen, so the wrong undo was
  obvious and cheap to reverse.
- Every number moved together on undo and redo: chip, statistics, legend, table. She could check it.
- "On: filtered graph, 27 of 77 nodes" on the statistics answered her standing Gephi grievance
  before she asked.
- Undo unticks a filter step instead of deleting it; the step stays in the list.
- The steps list's "keeps only nodes with at least 5 neighbors among the 60 it reads" states the
  chain semantics she has to teach by hand every year.
- Previous selection restored all 18 nodes, the table rows and the inspector's group breakdown in
  one click.
