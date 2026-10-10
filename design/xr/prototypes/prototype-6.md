**Prototype 6: The Workshop**

_The idea in one line:_ no menus anywhere. No lists, radials, palettes or command lines. Every choice is a physical act with a tool.

- **Attribute:** you pull its tag off a node.
- **Operation:** you pick the tool that does it.
- **Number:** you set it with a knob, a pull or a squeeze.
- **Results, style layers, filter steps and history** all become objects you can see, move and remove.

**How it differs from prototype 4 (the Tool Belt):** prototype 4 still had menus inside its tools: a thumbstick radial for settings and a cartridge rack to browse the catalog. Here everything is chosen by physical acts:

| Layer          | This prototype                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Tools only.** What you hold, and how you use it, is the command                                                                                                     |
| **Navigation** | **A turntable stand** under the graph: spin it with your hand, raise or lower it with a lever. **A magnifying lens** for looking closer, instead of zooming the world |
| **Selection**  | **Tongs:** pinch nodes up one at a time, or sweep them, and they collect in a **tray** at your side. The tray is the selection                                        |
| **"Menus"**    | **None.** A **pegboard** of tools on your left, and **attribute tags** pulled off nodes, which you load into tools                                                    |
| **Parameters** | **Physical controls on the tools:** knobs with detents, pull distance, squeeze pressure                                                                               |
| **Feedback**   | **Objects:** printed result strips, hanging layer sheets, sieves on a rail, history receipts                                                                          |

**Setup:**

- **Scene:** a solid background in full VR, seated or standing.
- **The graph** stands on a round turntable at chest height in front of you.
- **To your left** is a pegboard of about ten tools.
- **To your right** are two rails: an upper one for layer sheets and filter sieves, and a lower one for history receipts.
- **Devices:** hands primarily, on Meta Quest, Samsung Galaxy XR or Apple Vision Pro. Controllers work too, as grip to grab and trigger to use.

**The universal acts:**

| Act                                                                            | Meaning, everywhere                                                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Grab** (pinch-grab, or the grip button)                                      | Pick up a tool, a tag, a strip or a sheet. Let go to drop it; a dropped tool returns to its peg |
| **Use** (squeeze the held tool: pinch harder, or the trigger)                  | Do what the tool does                                                                           |
| **Load** (touch a tag to a tool)                                               | Give the tool its attribute: the tag clicks into a slot on the tool                             |
| **Turn a knob** on the held tool (pinch the knob and twist, or the thumbstick) | Change its setting. Each detent clicks                                                          |
| **Hang or remove** an object on a rail                                         | Add or remove a layer, a filter step or a history point                                         |

**The pegboard:**

| Tool                                      | What it does                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Magnifier**                             | Hold it over the graph. Nodes under the lens show their attributes as small tags hanging off them. Pinch a tag and pull it off to get an **attribute tag** you can load into other tools                                                                |
| **Tongs**                                 | Pick up nodes into your selection tray. Squeeze and drag to sweep several up                                                                                                                                                                            |
| **Stretch cord**                          | Hook it on a node and pull out to grab neighbors, with one ring per pull length. Hook two nodes for the path between them                                                                                                                               |
| **Instruments,** one per algorithm family | **Balance scale** for centrality (importance), **sorting bins** for communities, **measuring tape** for distances and paths, **flow meter** for flow. Each has a labeled **selector ring,** like a camera's mode dial, to choose the specific algorithm |
| **Spray can**                             | Load an attribute tag, then spray: **color by** that attribute. The nozzle ring sets the color scale                                                                                                                                                    |
| **Pump**                                  | Load a tag, then pump: **size by** that attribute                                                                                                                                                                                                       |
| **Sieve**                                 | Load a tag and set the mesh knob as a threshold, then pass it through the graph: a **filter**                                                                                                                                                           |
| **Sticky-note pad**                       | Peel a note off and stick it on a node                                                                                                                                                                                                                  |
| **Typewriter**                            | The one text tool: type, or dictate, a name or a phrase, and it produces a **search tag**                                                                                                                                                               |
| **Rubber stamp**                          | Stamp a project folder on the shelf to save                                                                                                                                                                                                             |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph stands on its turntable. The pegboard glows briefly and a hint reads "Grab a tool from the board."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** put your hand on the turntable's rim and spin it. Pull its lever to raise or lower the graph to eye level.
- **To look closer:** grab the **Magnifier** and hold it in front of a region. The lens shows that part enlarged, with labels readable. You move the lens, never the world.
- **Controls:** spin, lever, lens.

**Step 3. Find the Medici.**

- **If you can see it:** grab the **Tongs**, reach over and squeeze on the big central node. It lifts slightly and a copy appears in your tray, so the Medici is selected.
- **If you need to search:** grab the **Typewriter**, type or dictate "Medici", and it prints a **search tag**. Touch the tag to the graph, and matching nodes glow; tong the one you want.
- **Controls:** grab, squeeze, with the Typewriter for search.

**Step 4. Who they married into.**

- **What you do:** grab the **Stretch cord**, hook its end on the Medici, and pull your hand away. At the first click, a ring of six families lights up and "6" hangs on the cord. Release to drop them into the tray. A second click is 2 hops.
- **What you see:** the tray now holds seven tokens: "7 selected".
- **Controls:** hook, pull, release. Distance is the number.

**Step 5. Who matters most.**

- **What you do:** grab the **Balance scale**. Its selector ring is set to PageRank; turn it if you want degree or betweenness. Set it down on the turntable beside the graph, which means "measure everything". To measure only your selection, set the tray on the scale instead.
- **What you see:** the scale tips, works, and prints a **result strip**: a ranked list, Medici 0.146, Guadagni 0.098, Strozzi 0.088... It also leaves a **PageRank tag** on every node.
- **Controls:** grab, turn the selector ring, set it down.

**Step 6. Read the result.**

- **What you do:** pick up the strip and hang it on the edge of the turntable, or anywhere you want. Pinching a name on the strip lifts that family into your tray.
- **Single values:** hold the **Magnifier** over a node to see its PageRank tag.
- **Controls:** grab and hang, pinch, lens.

**Step 7. Color and size by PageRank.**

- **What you do:** hold the Magnifier over any node and pull its **PageRank tag** off. Load it into the **Spray can**, then aim and spray across the graph.
- **What you see:** nodes take color from their PageRank as the spray passes over them. A **layer sheet** marked "Color: PageRank" appears on the upper rail.
- **Size:** load another PageRank tag into the **Pump** and squeeze it at the graph. Nodes grow by PageRank, and a "Size: PageRank" sheet hangs beside the color sheet.
- **Spraying only some nodes:** the sheet records "applies to: these nodes". That subset rule is something menus make hard and a spray makes obvious.
- **Controls:** pull a tag, load it, spray or squeeze. The nozzle ring changes the color scale.

**Step 8. Keep only the strong families.**

- **What you do:** pull another PageRank tag and load it into the **Sieve**. Turn its mesh knob; each detent shows the threshold on the rim, and you stop at "0.070". Pass the sieve down through the graph.
- **What you see:** families below the threshold fall through and fade. The sieve hangs itself on the upper rail as a filter step.
- **Later:** turn its knob on the rail to change the threshold, or lift it off the rail to remove the filter.
- **Controls:** load, turn, pass through. Physical rail order is the filter order.

**Step 9. Write a note.**

- **What you do:** peel a note from the **Sticky-note pad**, dictate "check the 1434 exile date" while holding it (or type on the system keyboard), and press it onto the Strozzi node.
- **What you see:** the note sticks there. Pull it off to edit it; drop it on the floor to delete it.
- **Controls:** peel, speak or type, stick.

**Step 10. Undo a mistake.**

- **What you see:** every action has dropped a small **receipt** on the lower rail, newest on the right: "sieve PageRank 0.070", "pump PageRank", "spray PageRank".
- **What you do:** to undo, pull the newest receipt off. To go back several steps, pull off an older receipt, and everything to its right goes with it.
- **Controls:** grab and remove. History is visible all the time.

**Step 11. Save.**

- **What you do:** grab the **Rubber stamp** and stamp the project folder on the shelf. A new project offers a blank folder whose label you dictate or type.
- **What you see:** the folder fills: "Saved".
- **Controls:** grab, stamp.

---

**Advanced journeys:**

- **A compound rule:** sieves hung one after another on the rail mean AND. Two sieves clipped side by side on one hook mean OR. A sieve can carry a second tag, such as a century, with a value knob of its own. The rail is the rule, read left to right.
- **Tuning algorithm options:** each instrument has small option knobs beside its selector ring, such as PageRank's damping. Turning them on a scale that has already been used marks its strip as out of date; touching the strip to the scale re-runs it.
- **Comparing two runs:** clamp two result strips together with a **comparator clip**. It prints a difference strip and leaves "difference" tags on the nodes, which you can spray.
- **Layers that apply to subsets:** sheets on the rail carry the tray contents they were sprayed with. Slide sheets left or right to reorder them.
- **Recipes:** pull a run of receipts off the lower rail together, and they fuse into a **recipe card**. Feeding the card to a new project replays it.
- **Joining tables:** not here. It stays on the 2D page.

**How it scales:**

- **Algorithms:** families map to instruments (centrality, communities, paths, flow, similarity, layout). Each instrument's selector ring holds that family's algorithms, generated from graphty's catalog, so a new algorithm adds a ring position.
- **Attributes need no new controls,** because they come off the nodes as tags.
- **New result kinds** print as new strip styles.
- **The limit:** a family with 15 or more algorithms makes a crowded ring, and too many instruments crowds the pegboard. Past about 12 tools it needs a second board, or drawers, which starts to become a menu.

**On each device:**

| Act                | Hands (Quest, Galaxy XR, Vision Pro) | Controllers (Quest, Galaxy XR; PS VR2 on Vision Pro) |
| ------------------ | ------------------------------------ | ---------------------------------------------------- |
| Grab               | Pinch-grab                           | Grip                                                 |
| Use / squeeze      | Pinch harder                         | Trigger, with pressure where it matters              |
| Turn a knob        | Pinch the knob and twist             | Thumbstick while pointing at the knob                |
| Spin the turntable | Push the rim                         | Push the rim with the controller                     |
| Type               | System keyboard, or dictation        | Same                                                 |

**Why it should work:**

- **Every choice is visible and physical.** The menu is replaced by what's in front of you: tags on nodes, tools on a board, sheets and sieves on rails.
- **The state is always visible:** layers, filters and history are objects on rails, so you can see and change the whole analysis at a glance.
- **Undo is direct:** you take a receipt off.
- **It's distinctive.** No graph tool works like this, and it may be enjoyable to use.

**What it would teach us:**

- whether working with no menus at all stays efficient, or becomes slow and tiring once the novelty wears off;
- whether pulling attribute tags off nodes is a usable way to pick attributes when there are dozens;
- whether physical rails for layers, filters and history help people understand an analysis better than lists do;
- where the metaphor breaks, which tells us which parts of graphty need a non-physical route.

**Known risks:**

- **Many movements:** each step is a few physical acts, which risks fatigue and slowness for experienced users.
- **The tag supply:** an attribute only exists as a tag once you've pulled it off a node. Attributes that are empty on the visible nodes are hard to reach.
- **Learning the tools:** the pegboard has to be learned, though tool shapes help, for example a scale for importance.
- **Text** still falls back to a keyboard or dictation through the Typewriter.

**All six prototypes:**

| Layer      | 1. Palette           | 2. Say               | 3. Gestures          | 4. Tool Belt              | 5. Workbench         | 6. Workshop               |
| ---------- | -------------------- | -------------------- | -------------------- | ------------------------- | -------------------- | ------------------------- |
| Mode model | Select, then command | Select, then command | Select, then command | Tools (with menus inside) | Edit properties      | **Tools only**            |
| Navigation | Two-hand grab        | Grab, or voice       | Grab                 | Graph comes to you        | Miniature            | **Turntable and lens**    |
| Selection  | Pinch                | "This"               | Lasso                | Painting                  | Query and outline    | **Tongs and tray**        |
| Choosing   | Palette              | Speech               | Flicks               | Radial and rack           | Panels               | **Tags, tools and rails** |
| Parameters | Sliders              | Speech               | Twist                | Dial and pressure         | Typing and scrubbing | **Knobs and pulls**       |
