**Prototype 4: The Tool Belt**

_The idea in one line:_ you work the way a craftsperson does. Pick up a tool from your belt and apply it to the graph, over and over, instead of selecting something and then choosing a command. Algorithms are cartridges you load into a tool. Built for controllers, like a game.

**How it differs, layer by layer, from prototypes 1 to 3:**

| Layer          | This prototype                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Tools**, not select-then-command. The tool in your hand decides what the trigger does                                                                                            |
| **Navigation** | **The graph comes to you.** It turns and frames itself around whatever you act on. A turntable on the off-hand thumbstick is the only manual control; there's no two-hand grabbing |
| **Selection**  | **Painting:** sweep the brush across nodes. Plus **"more like this"**                                                                                                              |
| **Menus**      | A **tool belt** of slots around your waist, a **cartridge rack** for the full catalog, and a **thumbstick radial** on each tool for its settings                                   |
| **Parameters** | The **thumbstick dial** on the tool, and **trigger pressure** for strength or reach                                                                                                |
| **Feedback**   | A small **screen on the tool head,** like a multimeter, plus marks on the graph                                                                                                    |

**Setup:** a solid background in full VR. The graph floats at chest height about 80 cm away. Controllers on Meta Quest and Samsung Galaxy XR. On Apple Vision Pro, PlayStation VR2 Sense controllers, which it has supported since visionOS 26, with a hand fallback at the end.

**The control vocabulary:**

| Control                       | Meaning, everywhere                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Right grip at a belt slot** | Take that tool, or put the held tool back                                                                |
| **Right trigger**             | Use the tool: a tap acts on the thing you point at; a hold-and-sweep acts on everything you sweep across |
| **Right thumbstick, flicked** | The tool's radial, with up to 8 settings. Pushing the stick toward a setting and releasing chooses it    |
| **Right thumbstick, rotated** | The tool's dial: change the current setting's value                                                      |
| **Right trigger pressure**    | Strength or reach, such as brush size or how many hops a pull reaches                                    |
| **Left thumbstick**           | Turntable: turn and tilt the graph. Click the stick to re-frame                                          |
| **B, a tap**                  | Undo. **Hold B and turn the right stick** to scrub back through history                                  |
| **Y**                         | Opens the cartridge rack, the whole catalog                                                              |
| **A**                         | Confirm or apply, when a tool asks                                                                       |

**The belt:** eight slots around your waist, each with a visible handle you can feel by grip position.

| Slot        | Tool         | What it does                                                                                                   |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| Front left  | **Probe**    | Point at anything; its values show on the tool screen                                                          |
| Front right | **Brush**    | Paint a selection. The radial switches between add, subtract and "more like this"                              |
| Right hip   | **Expander** | Tap a node to grab its neighbors; trigger pressure sets the hop count                                          |
| Right back  | **Analyzer** | Holds an algorithm cartridge. Tap a node, a selection, or empty space for the whole graph, to run it           |
| Left hip    | **Painter**  | Color, size or labels by an attribute. Tap empty space to paint everything; sweep to paint only what you touch |
| Left back   | **Sieve**    | Filters. Set a condition on the radial and dial; sweep it through the graph to preview; A to commit            |
| Left front  | **Pen**      | Notes. Tap a node, then type or dictate                                                                        |
| Center back | **Project**  | Save, open, export                                                                                             |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph appears. The belt glows briefly at your waist, and a hint on the right controller says "Grip at your hip to take a tool."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** push the left thumbstick to turn the graph; click it to frame the whole graph.
- **What you see:** the graph turns and tilts. You never move or scale it by hand; the graph stays at a comfortable distance and comes to you as you work.
- **Controls:** the left stick only.

**Step 3. Find the Medici.**

- **What you do:** grip at the front left slot to take the **Probe**. Point it at the nodes; the tool screen shows the name and values of whatever you point at. Point at the big central node: "Medici, degree 6". Pull the trigger to select it.
- **To search by name:** flick the Probe's radial to **Find**, which opens the system keyboard. Type "Med", and matches glow in the graph.
- **What you see:** a ring on the Medici, and the graph turns to put it front and center.
- **Controls:** grip to take, point, trigger, with the keyboard only for typed search.

**Step 4. Who they married into.**

- **What you do:** put the Probe back and take the **Expander** from your right hip. Point at the Medici and squeeze the trigger. Half pressure means 1 hop; the tool screen shows "1 hop: 6" and the six families light up. Release to select them. A full squeeze gives 2 hops.
- **What you see:** the graph frames the seven families.
- **Controls:** take the tool, point, squeeze. How hard you squeeze is the number.

**Step 5. Who matters most.**

- **What you do:** press **Y**. The cartridge rack opens beside you: a shelf of labeled cartridges in drawers (Centrality, Communities, Paths, Flow), with a search slot on top. Grip the **PageRank** cartridge and slot it into the **Analyzer**, which you've taken from your back. Point at empty space and pull the trigger, meaning "the whole graph".
- **What you see:** the Analyzer's screen shows progress, then "PageRank: done", and a ranking column stands up to the right of the graph.
- **Controls:** Y, grip a cartridge, load it, trigger.

**Step 6. Read the result.**

- **What you do:** take the **Probe** again. Pointing at any node shows its PageRank on the screen, with its rank: "Strozzi 0.088, #3 of 15". Pointing the Probe at the ranking column scrolls it, and pulling the trigger on a name selects that family.
- **Controls:** the Probe, which works the same on the graph and on the result.

**Step 7. Color and size by PageRank.**

- **What you do:** take the **Painter**. Flick its radial to **Color by**, then turn the dial through the attributes to **PageRank**. Pull the trigger on empty space to apply it to everything. Then flick to **Size by**, dial to PageRank, and trigger.
- **What you see:** the graph recolors and resizes. Each application becomes a style layer.
- **Painting a subset instead:** hold the trigger and sweep across a few families. That creates a layer that applies only to those nodes. The tool model makes this natural.
- **Controls:** the radial chooses a mode, the dial chooses a value, and the trigger applies.

**Step 8. Keep only the strong families.**

- **What you do:** take the **Sieve**. Flick its radial to **Attribute**, dial to PageRank; flick to **Rule**, dial to "at least"; flick to **Value** and turn the dial.
- **What you see:** "0.070" on the tool screen, and families below it fade as a preview. Press **A** to commit the filter step.
- **Controls:** the radial picks the part of the rule, the dial sets it, A commits.

**Step 9. Write a note.**

- **What you do:** take the **Pen**, point at the Strozzi family and pull the trigger. Type on the system keyboard, or hold A to dictate "check the 1434 exile date". Release.
- **What you see:** a pin appears on the node. Pointing the Pen at the pin shows the note on the tool screen; pulling the trigger reopens it for editing.
- **Controls:** take the tool, point, trigger, then keyboard or dictation.

**Step 10. Undo a mistake.**

- **What you do:** tap **B** to step back once. For more, **hold B and turn the right stick** backward through history. The tool screen names each step as you pass it: "filter PageRank 0.07", "size by PageRank".
- **What you see:** release where you want to be.
- **Controls:** B, plus the stick as a scrub wheel. Undo is the same whatever tool you hold.

**Step 11. Save.**

- **What you do:** take the **Project** tool from center back and pull its trigger to **Save**. Its radial also holds Open, Export and Name.
- **What you see:** "Saved".
- **Controls:** take the tool, trigger.

---

**Advanced journeys** (how it stretches; not full designs):

- **A compound rule** ("weight at least 4 AND from the 1400s"): the Sieve holds a stack of conditions. Clicking the right stick adds a row; the radial and dial set each row, and the tool screen shows the whole rule. OR becomes a second Sieve applied after the first. That's a real limit, so OR-heavy rules may want a typed or spoken route.
- **Tuning algorithm options:** each cartridge carries its options. When you load PageRank, the Analyzer's radial shows them (damping, weight, iterations), with each dial starting at the default. A new algorithm's options appear automatically, because they come from graphty's catalog.
- **Comparing two runs:** load two result cartridges into the Probe, A and B. Pointing at a node shows both values and the difference, and a radial setting tints the graph by that difference.
- **Reordering a layer stack:** flick the Painter to **Layers**, and the layers appear as slabs stacked beside the graph. Grab and slide them to reorder. Pointing the Painter at a slab edits that layer.
- **Recipes:** a **Recorder** slot captures the sequence of tool uses as a reusable cartridge. Loading it into the Analyzer replays the sequence on new data.
- **Joining tables:** probably not in the headset. It stays on the 2D page.

**How it scales:**

- **The tools stay at about eight,** and the catalog grows inside them as cartridges, with drawers and search in the rack.
- **Settings are generated** from each algorithm's and attribute's catalog entries, so new algorithms need no new controls.
- **New kinds of objects need no new tools.** The Probe and Brush work on anything.
- **A plugin** adds cartridges, or at most one new tool for a belt slot.

**On each device:**

| Action                | Quest / Galaxy XR controllers | Vision Pro with PS VR2 controllers | Hands only (fallback)                              |
| --------------------- | ----------------------------- | ---------------------------------- | -------------------------------------------------- |
| Take a tool           | Grip at a belt slot           | Grip at a belt slot                | Pinch at a belt slot                               |
| Use a tool            | Trigger                       | Trigger                            | Pinch                                              |
| Tool radial and dial  | Right stick flick and rotate  | Right stick                        | Pinch-hold and flick; pinch and twist for the dial |
| Strength              | Trigger pressure              | Trigger pressure                   | Pinch distance                                     |
| Turn the graph        | Left stick                    | Left stick                         | Off-hand pinch and drag                            |
| Undo / rack / confirm | B / Y / A                     | Equivalent buttons                 | Off-hand thumb gestures                            |

**Why it should work:**

- **The tool model fits repeated work.** Painting many subsets, probing many nodes, or sieving with variations no longer means reselecting and re-choosing a command each time.
- **Controllers give precision and feel:** analog pressure, a dial, haptic clicks at each hop or value step, and tools you can find by feel without looking, like game weapon slots.
- **Low arm use.** The hands stay low and the graph comes to you.
- **The catalog doesn't bloat the interface.** It lives in cartridges, out of the way until you need it.

**What it would teach us:**

- whether the tool model beats select-then-command for graphty's styling and filtering;
- whether people remember belt positions after a session or two;
- whether trigger pressure and the stick dial are precise enough for hops and thresholds;
- whether graph-comes-to-you navigation, with no grabbing, feels freeing or confining.

**Known risks:**

- **Switching tools costs time when you only want one action.** One-off jobs may feel slower than with a context menu.
- **Mode errors:** forgetting which tool you hold. The tool screen and a distinct tool shape mitigate this.
- **It depends on controllers.** Vision Pro needs extra controllers, and the hands-only fallback loses pressure and haptics.

**Where the four stand now:**

| Layer      | 1. Palette Hand      | 2. Point and Say        | 3. Gesture Grammar   | 4. Tool Belt                                 |
| ---------- | -------------------- | ----------------------- | -------------------- | -------------------------------------------- |
| Mode model | Select, then command | Select, then command    | Select, then command | **Tools**                                    |
| Navigation | Two-hand grab        | Two-hand grab, or voice | Two-hand grab        | **The graph comes to you, plus a turntable** |
| Selection  | Point and pinch      | Point, plus "this"      | Pinch and lasso      | **Painting, plus "more like this"**          |
| Menus      | Hand-held palette    | Spoken grammar          | Marking menus        | **Belt, cartridge rack, stick radial**       |
| Parameters | Sliders              | Spoken numbers          | Wrist twist          | **Stick dial, trigger pressure**             |
| Feedback   | The palette          | Command bar and cards   | On the graph         | **The tool screen**                          |

The navigation and selection columns are still the weakest. For the next prototype I'd vary those hardest:

- **Navigation:** a hand-held miniature that steers the view, or walking along edges.
- **Selection:** a typed query with a keyboard.
- **Menus:** a dock or shelf fixed in space, like Figma's toolbar.

That last one would also be the closest to a "Figma for VR".
