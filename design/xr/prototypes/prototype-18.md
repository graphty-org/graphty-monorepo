**Prototype 18: Linked Views** -- The graph is one of several views on an arc around you (table, histograms, scatter, matrix). A brush in any view lights the same objects in every view, and you give a command by dragging something from one view onto another.

### How it differs, layer by layer

| Layer                    | Linked Views                                                                                                                                                                                                                                                                                                                                                           | Differs from                                                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode model               | Brushing and linking. There is one shared selection, the rule, and every view shows it. Commands are drags: you pick up the brush tag, a column or an algorithm card and drop it on another view. What the drop does is defined by the pair (what you carry, where you drop it).                                                                                       | Select-then-command with a menu at the object (Context Menus, 11; Palette Hand, 1); tools in hand (Tool Belt, 4; Workshop, 6; Grip and Tool, 8). Here the graph is not the only place you select, and verbs come from drops, not from a menu at the object. |
| Navigation               | Up to five views are open on an arc at the graph's distance: a full-size center slot and two smaller slots on each side, all within an easy head turn. Pull a view's title bar onto another slot to swap them. Inside the graph view, a two-hand pinch (or a one-hand turn ring) turns and scales the graph.                                                           | Workbench (5) has one fixed dock and a miniature; HUD (10) follows your head. Here the views are peers and you rearrange them yourself.                                                                                                                     |
| Selection                | A brush, drawn in whatever view makes the question easy: a range on a histogram, a rectangle on a scatter, a run of rows in the table, a band in the matrix, a lasso in the graph. A tap starts a new rule with exactly what you tapped. A drag narrows: brushes in different views combine with AND, and an extra brush drawn from a view's "+" tab adds with OR.     | Point and pinch (1, 2), lock-on (10), lasso in the graph only (3, 11), typed query (5). Here the graph is rarely the best place to select.                                                                                                                  |
| Menus / command surfaces | No menus at the objects. Drops between views, the brush tag's four buttons for the whole rule, and a verb bar of at most four buttons under each view. The "+" slot offers a row of view tiles, the only list in the design. Each algorithm run adds a column to the table and spawns a histogram of it.                                                               | Every prior prototype has a menu, palette, belt, glyph set or strip that lists verbs. Here the views themselves are the command surface.                                                                                                                    |
| Parameters               | The edges of a brush on a histogram are the values; tap an edge's readout for a stepper when you need an exact number. An algorithm option is a one-handle axis that you drag the same way.                                                                                                                                                                            | Sliders on a palette (1), spoken numbers (2), wrist twist (3), stick dial (4), typing (5), knobs (6, 8), finger counts (7).                                                                                                                                 |
| Feedback                 | A brush lights its rows, bars, points, cells and nodes in every view at once (brightened and outlined, never by color alone), and the tag shows the count ("5 of 15"). While you carry something, every place that can take it lights and names what the drop would do, and a drop that removes or hides anything previews the result in every view before you let go. | Feedback local to the object or the panel you touched.                                                                                                                                                                                                      |
| Undo                     | The brush tag's back steps the selection back, whichever view changed it. Anything that changes data, style or notes goes on a global history, shown as a strip under the graph with undo always one tap away; pull it open to peek at and jump to any step.                                                                                                           | Palette button (1), "undo" word (2), thumb swipe (3), receipts (6), wind time (9).                                                                                                                                                                          |

**Setup:** solid colored background in full VR. The graph view sits in the center slot at chest height, 70-80 cm away, with the node table on its left and the matrix on its right. The brush tag sits just above the graph view and the history strip just below it. Seated, the arc is set at the seated chest height when you enter. Works with hands (pinch only), or with controllers (trigger for pinch, grip to turn the graph, thumbstick and the upper face buttons as shortcuts). Eyes are used only on Vision Pro, where look-and-pinch aims. Voice is optional and only fills the "find" field.

### The control vocabulary

A pinch that moves less than about 2 degrees is a tap (released at once) or a hold (kept about half a second); anything more is a drag.

| Input                                                                                                                                                                            | Meaning everywhere                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Point (hand ray or controller ray)                                                                                                                                               | Aim. Hovering a mark lights the same object in every view and shows its value; nothing changes.                                                                                                                        |
| Pinch (trigger) hold without moving                                                                                                                                              | Peek: the same as hover, for devices with no hover. On a history step, peek shows the project as it was at that step. Releasing changes nothing.                                                                       |
| Pinch (trigger) tap on a mark                                                                                                                                                    | Start a new rule with exactly that mark: a row, a node, a histogram bar's range, or a matrix cell's two nodes. Every view's part of the old rule clears (back restores it).                                            |
| Pinch (trigger) tap on a column header                                                                                                                                           | Sort by that column (numbers high to low first); a second tap reverses.                                                                                                                                                |
| Pinch (trigger) tap on a button or a chip                                                                                                                                        | Press it. A chip in a well toggles that layer or filter on and off; its "x" removes it, with a preview while you aim at the "x".                                                                                       |
| Pinch (trigger) drag over a view's data                                                                                                                                          | Draw this view's part of the rule: a range on a histogram, a rectangle on a scatter, rows in a table, a band in the matrix, a lasso in the graph. It replaces this view's part and keeps the other views' parts (AND). |
| Pinch-drag from the "+" tab at the corner of a view's brush                                                                                                                      | Draw another brush in this view, added to the first (OR). Works one-handed.                                                                                                                                            |
| Pinch-drag a brush edge                                                                                                                                                          | Move that edge: change the value. Pull your hand back toward you while dragging for fine steps. Tap the edge's readout for a stepper.                                                                                  |
| Pinch-drag a carry handle: the brush tag (or its small copy on any view), a column header, a histogram's axis label, a catalog card's or history step's row handle, a layer chip | Carry it. Release over a lit target to command; release anywhere else to cancel (it flies back).                                                                                                                       |
| Pinch-drag a view's title bar                                                                                                                                                    | Move the view. Release on another slot to swap the two; anywhere else, it returns.                                                                                                                                     |
| Two-hand pinch inside the graph view (both grips)                                                                                                                                | Turn, scale and move the graph inside its view. A second hand pinching during a lasso cancels the lasso and starts the move.                                                                                           |
| Pinch-drag the turn ring under the graph (one grip)                                                                                                                              | Turn and tilt the graph with one hand.                                                                                                                                                                                 |
| Thumbstick left / right (controllers only)                                                                                                                                       | Snap the arc by one slot, instantly, with no sliding motion.                                                                                                                                                           |
| Thumbstick up / down (controllers only)                                                                                                                                          | Scroll the table, catalog or history you are pointing at. With hands, drag the scroll rail at the view's right edge.                                                                                                   |
| Dominant-hand upper face button (B, or Y if left-handed)                                                                                                                         | Back on the brush tag.                                                                                                                                                                                                 |
| Off-hand upper face button (Y, or B if left-handed)                                                                                                                              | Undo on the history strip.                                                                                                                                                                                             |
| "find" verb on a table, then speak or type a name                                                                                                                                | Brush the rows whose label matches. Speech is used only where the browser offers recognition; the in-app keyboard always works.                                                                                        |

### Key structures

**The arc.** The center slot is full size; two smaller slots on each side sit at about 35 and 65 degrees, and a "+" slot sits at the right end. Side views stay live and linked but show bars, counts and highlights rather than readable rows; swap a view into the center to read it. A view that does not fit, or that you close, becomes a tab on the "+" slot and comes back with its brush.

**The brush tag.** One tag, above the graph view, always present ("nothing brushed" when empty). It shows the whole rule as text, one chip per view that holds a part of it (the chip names its view, even one out of sight or closed; its "x" removes that part alone), and the count. Its buttons act on the whole rule:

- back: undo the last change to the rule, made in any view
- not: invert the whole rule
- +hop: grow the result of the rule by one hop
- clear: empty the rule

Each view that holds part of the rule also shows a small copy of the tag, which carries the same way. The catalog, notes and history views brush their own kind of rows (algorithms, notes, steps); those brushes stay in that view, with a local tag of their own, and never join the rule.

**The views.** Each view spawns from the "+" slot, or appears on its own when an algorithm runs and a slot is free.

| View                            | Marks                                          | Brush shape                                                              | What it offers as a drop target                                                                    |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Graph                           | nodes, edges                                   | lasso (on the view's flat projection, so it reaches nodes behind others) | anywhere: frame the carried objects; wells for color, size, label and keep along its left edge     |
| Node table (and edge table)     | rows, column headers                           | rows                                                                     | anywhere: run a carried algorithm on the whole graph; a key column's header: join a carried column |
| Histogram (one column)          | bars                                           | range, with two edges                                                    | its axis: take a carried column (spawns a scatter of the two beside it)                            |
| Scatter (two columns)           | points                                         | rectangle                                                                | each axis: take a carried column                                                                   |
| Matrix                          | cells (one per edge)                           | row or column band (nodes)                                               | none (a selector only)                                                                             |
| Catalog                         | algorithm and recipe cards, as rows of a table | rows (its own)                                                           | a carried history tag: save those steps as a recipe                                                |
| Notes                           | note cards                                     | cards (its own)                                                          | a carried brush tag: a new note attached to those objects; on a card, reattach it                  |
| History (the strip pulled open) | steps, newest on top                           | rows (its own)                                                           | none                                                                                               |

Node views and edge views link both ways: a node brush lights the edges between brushed nodes, and an edge brush lights its endpoints.

**The drops.** One rule per pair; the target lights and names the result before you let go.

| Carry                                 | Drop on                           | Result                                                                                                                                                                    |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| brush tag                             | graph view                        | frame those nodes and bring them forward                                                                                                                                  |
| brush tag                             | graph's keep well                 | a filter step that keeps only the brushed objects (previews what leaves)                                                                                                  |
| brush tag                             | graph's color or size well        | a style layer scoped to that brush (a swatch strip appears; tap a hue)                                                                                                    |
| brush tag                             | notes view                        | a new note attached to the brushed objects                                                                                                                                |
| brush tag                             | a pending run's "to" slot         | the target nodes of that run                                                                                                                                              |
| column header or histogram axis label | graph's color, size or label well | map that column for the whole graph (or, dropped on a layer chip in the well, within that layer's scope); previews while you aim                                          |
| column                                | histogram axis                    | spawn a scatter of the two beside that histogram                                                                                                                          |
| column                                | scatter axis                      | change that axis                                                                                                                                                          |
| column                                | empty slot or the "+" slot        | spawn a histogram of it                                                                                                                                                   |
| column                                | another table's key column header | join the two tables on those keys (previews matched and unmatched)                                                                                                        |
| catalog card                          | table                             | run on the whole graph; adds a column and spawns a histogram                                                                                                              |
| catalog card                          | brush tag                         | run on the brushed subgraph; an algorithm that needs a source uses the brush as its source, and one that also needs a target shows a pending card with an empty "to" slot |
| history tag                           | catalog                           | save the brushed steps as a recipe card                                                                                                                                   |
| layer chip                            | another place in its well         | reorder the layers                                                                                                                                                        |

A brush tag dropped on a well or on the notes view becomes that filter, layer or note, and the rule clears in the same history step, so one undo brings back both. A drop on the graph view only frames, and the rule stays. While you carry anything, small copies of the lit targets also gather near your hand, so a drop is a short move.

**Verb bars.** At most four buttons under each view, acting on that view only. Most views have only close. The graph has fit, layout and 2D/3D and cannot be closed. A table has find, only (hide unbrushed rows) and close. A histogram has bins and close; a histogram of a run has options, copy, remove and close. The catalog has find and close. The history strip has undo, redo and save.

### The journey

1. **Enter**
    - **What you do:** Put on the headset and open the Florentine families project in XR.
    - **What you see:** The graph in the center view, the node table to the left, the matrix to the right, and a "+" slot at the right end. Above the graph, the brush tag reads "nothing brushed"; below it, the history strip shows "opened" with undo and save.
    - **Controls:** none.

2. **Get oriented**
    - **What you do:** Point across the graph, then across the table (on Vision Pro, pinch-hold a node to peek). Two-hand pinch the graph and turn it once, or drag its turn ring with one hand.
    - **What you see:** Each node you point at lights its table row and its matrix row and column, with the family name and degree. Pointing at a row lights the node. You learn the linking before you change anything.
    - **Controls:** point or pinch-hold; two-hand pinch or turn ring.

3. **Find the Medici**
    - **What you do:** In the table, which is sorted by name, tap the Medici row. (Or tap "find" on the table's verb bar and say or type "Medici".)
    - **What you see:** The Medici row, node and matrix row light together. The brush tag reads "Medici, 1 of 15", with a "table" chip, and a small copy of it sits on the table.
    - **Controls:** pinch tap on a row (or find).

4. **Who they married into**
    - **What you do:** Glance at the matrix, then tap "+hop" on the brush tag.
    - **What you see:** The Medici row of the matrix already shows the marriages as filled cells. After +hop, the selection grows to the families they married into, lit in the graph, the table and the matrix: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The tag reads "Medici + 1 hop, 7 of 15".
    - **Controls:** tag button tap.

5. **Who matters most (PageRank)**
    - **What you do:** Tap the "+" slot and pick the catalog tile; the catalog spawns in the nearest free slot. Tap its category header to sort, then drag over the centrality rows to narrow the list to them. Pinch the PageRank card by its row handle and drag it onto the node table.
    - **What you see:** While you carry the card, the table lights "run on all 15 nodes" and the brush tag lights "run on 7 nodes". You drop on the table. A "pagerank" column fills in, a PageRank histogram spawns into the next free slot, and the run appears on the history strip.
    - **Controls:** pinch tap on a tile and a header; pinch-drag over rows; pinch-drag a card handle; release on a lit target.

6. **Read the result**
    - **What you do:** Tap the pagerank column header to sort. Point at the bars of the histogram (on Vision Pro, pinch-hold them), then tap its top bar.
    - **What you see:** The Medici sit at the top of the sorted table. Pointing at a bar shows its range and count. Tapping the top bar starts a new rule: it lights the Medici everywhere, and the tag reads "pagerank 0.13-0.15, 1 of 15".
    - **Controls:** pinch tap on a header; point or pinch-hold; pinch tap on a bar.

7. **Color and size by PageRank**
    - **What you do:** Drag the pagerank column header onto the graph's color well, then again onto its size well.
    - **What you see:** As you aim at each well, it says "color by pagerank" or "size by pagerank" and the graph previews the change. After each drop the well holds a chip, and each drop is one style layer on the history strip.
    - **Controls:** pinch-drag a column header to a well.

8. **Keep only strong families (filter)**
    - **What you do:** On the PageRank histogram, drag from the right end leftward. Then pinch the left edge and drag it until its readout says 0.070, pulling your hand back for the last steps (or tap the readout and use the stepper). Drag the brush tag onto the graph's keep well, and look before you let go.
    - **What you see:** As the edge moves, the count on the tag changes ("5 of 15"), and the families above and below the line light and dim in every view. Over the keep well, the preview shows the other ten families fading out of every view and reads "keep 5, hide 10". After the drop, they leave the graph, the table greys out their rows, the histogram shows the kept range solid and the rest hollow, and the keep well holds a filter chip. The rule clears, and the filter step goes on the history strip.
    - **Controls:** pinch-drag a range; pinch-drag a brush edge (or the stepper); pinch-drag the tag to a well.

9. **Write a note**
    - **What you do:** Tap the "+" slot and pick the notes tile. Tap the Medici row, then drag the tag onto the notes view. Type on the in-app keyboard: "Medici broker between otherwise unconnected families." (Where the browser offers speech recognition, the keyboard's microphone key dictates.)
    - **What you see:** A note card that names its object ("Medici"). Pointing at the card lights the Medici in every view, and a small note mark appears on the Medici row.
    - **Controls:** pinch tap on a row; pinch-drag a tag; the in-app keyboard.

10. **Undo a mistake**
    - **What you do:** Say you dropped the pagerank column on the label well by accident. Tap undo on the history strip (or press the off-hand upper face button). To go further back, pull the strip open into the history view, pinch-hold a step to peek, and tap it to jump there.
    - **What you see:** Undo removes the label layer and the strip shows the step before. In the open history, peeking shows every view as it was at that step, and releasing returns you to now. After a jump, the later steps stay greyed above it, so you can tap one to redo. To remove one layer without undoing what came after, aim at the "x" on its chip (the graph previews without it) and tap. A slip in the selection alone is cheaper still: tap back on the brush tag (or press the dominant upper face button).
    - **Controls:** strip undo or face button; pinch-hold and tap a history row; chip "x"; tag back.

11. **Save**
    - **What you do:** Tap save on the history strip.
    - **What you see:** The project saves its steps, style layers, filter, note and the arrangement of the arc, so the same views come back in the same slots. The history marks the save point.
    - **Controls:** strip tap.

### Advanced journeys

- **Compound rule:** drag a range of pagerank 0.07 and up on its histogram. Drag the degree column header onto the "+" slot to spawn its histogram, and drag a range of degree 4 and up there. The two brushes are in different views, so they combine with AND; the tag reads "pagerank 0.07-0.15 AND degree 4-6, 3 of 15" (Medici, Guadagni, Strozzi). To get an OR, drag from the "+" tab of the pagerank brush to draw a second range on the same histogram. "not" on the tag inverts the whole rule. Drag the tag to the keep well to make it a filter step, or to a color well to make a layer.
- **Tuning algorithm options:** tap "options" on the PageRank histogram's verb bar. Its options appear as one-handle axes under the histogram, such as damping at 0.85. On a small graph, dragging the handle re-runs the algorithm as you drag; on a large one, it re-runs each time the handle rests, and the bars dim while they are stale. The brush keeps its values, so the count on the tag changes with the bars. Releasing commits a new step.
- **Comparing two runs:** tap "copy" on the PageRank histogram's verb bar. A "pagerank 2" column and its histogram appear, with options open; set damping to 0.5. Drag the "pagerank 2" header onto the first histogram's axis, and a scatter of the two spawns beside it. Points on the diagonal agree. Brush the points far from it to see, in the graph and the table, which families change rank between the two settings.
- **Layers on subsets:** tap the Medici row, tap +hop, and drop the tag on the color well. That makes a layer scoped to those families, with a swatch strip on which you tap a hue. Dropping a column on that layer's chip maps the column within that scope only. Layers stack in the well in the order dropped; dragging a chip up or down reorders them, tapping it toggles it, and its "x" removes it.
- **Recipes:** pull the history strip open, drag over the run, layer and filter steps, and carry the history's tag onto the catalog. A recipe card appears among the algorithms, and you play it the same way: drop it on a table for the whole graph, or on the brush tag for a subset.
- **Paths:** tap the Medici row and drop the shortest-path card on the brush tag. A pending card appears with "from: Medici" filled and an empty "to" slot. Tap the Strozzi row and drop the tag on the "to" slot; the path becomes a true/false column that is itself a brush.
- **Joining tables:** picking the file stays on the 2D page. Once the file is loaded, its table appears as a view, and the join itself is done here: drag its key column header onto the node table's id header. Before you let go, the target shows a two-bar histogram of matched and unmatched rows. After the drop, the unmatched rows are a ready-made brush.

### How it scales

- **60+ algorithm catalog:** the catalog is itself a table (category, what it returns, cost estimate), so you navigate it by brushing, just like the data. Brush a category, then a cost range, and the list shrinks to the few cards that fit. "find" works here too. A run adds one column; its histogram spawns while a slot is free, and otherwise waits as a tab on the "+" slot or spawns when you drag its header to a slot.
- **New object types:** every new object type is rows in some table. Communities get a groups table and runs get a runs table; style layers and filter steps are chips in wells. Brushing and dropping work on them unchanged, so the views need no new verbs.
- **Plugins:** a plugin algorithm declares what it returns, and that decides where it lands:
    - node values become a node table column and a histogram
    - edge values become an edge table column
    - a path or a subgraph becomes a true/false column that is itself a brush
    - a layout becomes new positions in the graph view

    Its options become one-handle axes, and whether it takes a source or a target decides what a drop on the brush tag does. A plugin may add a view type (for example a timeline), which joins the arc and the linking.

- **The limit:**
    - Five open views fit within an easy head turn; more wait as tabs. Four or five live brushes are as many as people can read.
    - A graph of several thousand nodes still works in the histograms, the scatter and a scrolling table. A lasso in a dense 3D graph and a full matrix of that size do not.
    - Verbs with no data shape (choosing a layout, camera presets, XR settings) end up on verb bars and get nothing from the linking.
    - Long text entry is as weak here as anywhere in VR.

### On each device

| Device            | Inputs                                                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S | hands (pinch, with a system ray, joints through WebXR hand input) or Touch controllers | Both are exposed to WebXR in the Quest Browser: a pinch fires select, and two hands give two input sources for the two-hand move. Hover works fully, so linking on hover works. Controllers report trigger, grip, thumbstick and the A/B/X/Y buttons through the standard gamepad mapping. The system keyboard is not available inside an immersive session as far as we know, so the in-app keyboard is required; speech recognition for "find" is optional and must be checked in the Quest Browser. Eye tracking (Quest Pro only) is not exposed to WebXR.                       |
| Samsung Galaxy XR | hands or the Galaxy XR controllers, in Chrome on Android XR                            | WebXR hand input and controllers are exposed; check that the controllers' face buttons follow the standard mapping before relying on the undo shortcuts. The system uses eye tracking, but as far as we know it is not exposed to WebXR pages. Same scheme as Quest.                                                                                                                                                                                                                                                                                                                |
| Apple Vision Pro  | eyes and hands (transient pointer); PS VR2 Sense controllers where Safari exposes them | Safari's WebXR exposes look-and-pinch as a transient pointer: the ray starts where you look when the pinch starts, then follows the hand. There is no hover, so pinch-hold (peek) does the job of hover, and drag-time feedback (lit targets, previews) works because a ray exists for the whole drag. Brush edges and the "+" tab get grab zones of about 3 degrees. Hand positions, requested with hand tracking, drive the two-hand graph move and the pull-back fine mode. Recent visionOS versions support PS VR2 controllers; where WebXR exposes them, they map as on Quest. |

### Why it should work

- Brushing and linking is one of the best-tested techniques in visualization. Becker and Cleveland brushed scatterplot matrices (1987). Dynamic queries (Ahlberg, Williamson and Shneiderman, 1992) were faster and better liked than form queries for finding items in a data set. Brushing and linking became the core of shipped analyst tools: Spotfire grew out of dynamic queries, and Tableau's highlight and filter actions link sheets.
- Dragging a field onto a shelf to encode it is Tableau's central interaction, from the Polaris research (Stolte, Tang and Hanrahan, 2002). Analysts already know it, and it is learned by doing rather than by reading.
- In VR, ImAxes (Cordeil et al., 2017) showed that people with no training build multi-view visualizations by grabbing axes and placing them. DXR (Sicat et al., 2019) made immersive linked views a toolkit pattern. This prototype keeps their direct grabbing and adds the graph as one of the views.
- Coordinated multiple views are a well-surveyed design space (Roberts, 2007; North and Shneiderman's snap-together visualizations, 2000). Users find relations across views that a single view hides.
- More display space helps sensemaking: in "Space to Think" (Andrews, Endert and North, 2010), analysts used a large display as external memory. An arc of views around you is that space without monitors.
- Many graph questions are really table or distribution questions: the top ten by PageRank, everyone above a threshold. They are easier to answer in a histogram or a sorted table than in a hairball, and the graph still shows where those nodes sit.

### What it would teach us

- Whether dragging between views can replace menus entirely, or whether people look for a menu when they want a verb.
- Whether the rule "a tap starts over, a drag narrows (AND across views), the '+' tab adds (OR)" is understood from the tag alone, without explanation.
- How many views people keep open, how far they turn their heads, and whether they move the graph out of the center once they have a table and a histogram.
- Whether histogram brush edges are precise enough as the main way to enter thresholds with hand tracking, and how often people fall back to the stepper.
- Whether linking on hover, which Vision Pro replaces with a held pinch, is essential or only nice.
- Whether a run's column and histogram are a good enough "result object", or whether people want the run as a thing they can pick up.
- Whether the graph view is used for selection at all once other views are available.

### Known risks

- **Arm fatigue from long drags and raised pointing.** Mitigation: while you carry something, the lit targets also appear as small copies near your hand (as in drag-and-pop, Baudisch et al., 2003), so a drop is a short move. Rays work from a hand resting low, the views tilt slightly toward you, and the swap keeps the views you use most in the center.
- **A pinch release that jitters drops on the wrong target.** Mitigation: a target must stay named under the ray for a moment before it can take the drop, every drop is one undo away on the history strip, and drops that remove or hide anything preview first.
- **Brush edges are imprecise when hand tracking jitters.** Mitigation: edges snap to bin boundaries and to round values, the readout shows the value and the count while you drag, pulling the hand back lowers the gain, and the readout's stepper gives exact values without any steady hand.
- **Hidden commands: you have to know what can be dropped where.** Mitigation: lifting anything lights every valid target with what the drop would do, and invalid targets stay dark. At first, the graph's wells show their names even when nothing is carried.
- **Too many views and too much head turning.** Mitigation: start with three views, keep at most five open within about 65 degrees each side, and put the rest on "+" tabs. Arc moves snap instantly. The arc layout is saved with the project.
- **AND/OR mix-ups when brushes pile up.** Mitigation: a tap always starts a fresh rule, so a stray part from another view never silently empties a new selection. The tag always shows the full rule as text, with one chip per view, including views out of sight or closed; the chip's "x" removes that part alone, and back undoes any rule change.
- **The graph becomes one panel among several, which may lose people who came for the graph.** Mitigation: the graph starts in the center, cannot be closed, frames the nodes of any brush tag dropped on it, and every brush shows on it first.
- **Large graphs.** Mitigation: histograms and scatters aggregate well, and the table only builds the rows in view. The lasso works on the view's flat projection rather than in depth. When the graph is large, the matrix shows only the rows of the current brush, and option handles re-run only when they rest.

### Comparison row

| 18 | Linked Views | The graph is one of several views on an arc (table, histograms, scatter, matrix); a brush anywhere lights everywhere, and dragging between views is how you command | brushing and linking; commands are drags between views | arc of up to five views, swap one into the center | histogram ranges, scatter rectangles, table rows, graph lassos; tap starts over, drag narrows, "+" tab adds | drags between views + the brush tag's buttons + a small verb bar per view; a run adds a column and a histogram | histogram brush edges, stepper for exact values | brush tag back + always-visible history strip |
