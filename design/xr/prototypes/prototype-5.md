**Prototype 5: The Workbench**

_The idea in one line:_ the closest thing to Figma in VR. Panels fixed in space around the graph, a structured list of everything in your project, a properties inspector you edit directly, and a typed command line, driven by a real keyboard. A hand-held miniature of the graph handles overview and navigation.

**How it differs, layer by layer:**

| Layer          | This prototype                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Edit properties.** Select an object and change its properties in the inspector, as in Figma. Few commands as such: most work is setting values                                         |
| **Navigation** | **A world-in-miniature.** A small copy of the graph sits on the dock. Move the view marker inside it to steer the main view, plus keyboard shortcuts. The big graph never needs grabbing |
| **Selection**  | **Typed queries** (`select PageRank > 0.07`), the **outline list**, and pointing at the graph or the miniature                                                                           |
| **Menus**      | **A dock fixed in space:** a toolbar on top, an outline on the left, the inspector on the right, the command line on the bottom. Plus **keyboard shortcuts**                             |
| **Parameters** | **Typed values,** and **scrubbing**: drag sideways on a field's label to change its value, as in Figma                                                                                   |
| **Feedback**   | **The inspector, the outline and a status line,** all in fixed places                                                                                                                    |

**Setup:**

- **Scene:** a solid background in full VR. You're seated.
- **Layout:** the graph floats in front at chest height, about 80 cm away, with four panels in a shallow arc around it at reading distance, angled toward you.
- **Devices:** Meta Quest, Samsung Galaxy XR or Apple Vision Pro, with a **paired Bluetooth keyboard** on your lap or desk, plus hands or controllers for pointing.
- **Without a keyboard:** the system keyboard stands in, which is slower.

**The dock:**

| Panel            | Position                       | Contents                                                                                                                                                                         |
| ---------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Toolbar**      | Above the graph                | A few tools (Select, Lasso, Probe, Path, Note), each with a key: V, L, P, T, N                                                                                                   |
| **Outline**      | Left                           | Every object in the project as a tree, like Figma's layers panel: Sources, Runs, Style layers, Filter steps, Notes, Saved selections, Views. Selecting a row selects the object  |
| **Inspector**    | Right                          | The properties of whatever is selected, editable: a node's values; a run's options; a style layer's attribute, scale and the nodes it applies to; a filter's rule; a note's text |
| **Command line** | Below the graph                | Type a command or query, with autocomplete. It also shows a running history                                                                                                      |
| **Miniature**    | Bottom-left corner of the dock | A palm-sized copy of the whole graph with a frustum marker showing your current view                                                                                             |

**The control vocabulary:**

| Control                                                                        | Meaning, everywhere                                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Point and pinch** (or trigger) on the graph, the miniature or an outline row | Select. Hold **Shift** while pinching to add to the selection                 |
| **Keyboard `/` or Ctrl+K**                                                     | Focus the command line                                                        |
| **Typing into a focused inspector field**                                      | Set the value. Tab moves to the next field, Enter commits                     |
| **Pinch and drag sideways on a field's label**                                 | Scrub the value, as in Figma                                                  |
| **Pinch and drag the frustum marker** in the miniature                         | Move the main view there. **Pinch and twist** on the marker turns the view    |
| **F**                                                                          | Frame the selection. **Shift+F** frames everything. Arrow keys orbit the view |
| **Ctrl+Z / Ctrl+Shift+Z**                                                      | Undo and redo. The History section of the outline shows every step            |
| **Ctrl+S**                                                                     | Save                                                                          |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph and the dock appear around it. The outline lists the source, "Florentine marriages (15 nodes, 20 edges)", with empty Runs, Style layers and Filter steps sections. The command line says "Type / to command".
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** pinch the frustum marker in the miniature and drag it around the small graph. The main view moves to match. Press Shift+F to frame everything.
- **What you see:** the big graph stays put; your view of it changes. Turning or scaling it by hand is never needed.
- **Controls:** the miniature, or the keyboard.

**Step 3. Find the Medici.**

- **What you do:** press `/` and type **`find med`**. Autocomplete lists "Medici"; press Enter.
- **What you see:** the Medici is selected and framed. The inspector shows its properties: name, degree 6, family attributes from the data.
- **Controls:** keyboard.

**Step 4. Who they married into.**

- **What you do:** type **`select neighbors 1`**. With no node named, the command applies to the current selection.
- **Alternative:** in the inspector, the Medici's **Neighbors** row reads "6". Pinch it to select those six.
- **What you see:** the status line says "7 selected", and the inspector switches to a summary of all seven, with shared attributes and counts.
- **Controls:** keyboard, or a pinch on an inspector row.

**Step 5. Who matters most.**

- **What you do:** type **`run pagerank`**, then Enter.
- **What you see:** a new row, "PageRank", appears under Runs in the outline and is selected. The inspector shows the run's options (damping 0.85, weight: none, iterations) and its result: a ranking list.
- **To change an option:** scrub the damping value, or type a new one. The run is marked out of date, and pressing Enter re-runs it.
- **Controls:** keyboard. Options are fields in the inspector.

**Step 6. Read the result.**

- **What you see:** the ranking in the inspector: Medici 0.146, Guadagni 0.098, Strozzi 0.088. Pinching a name selects that family in the graph and the miniature.
- **Pinning:** the inspector's pin button leaves a copy of the ranking floating above the graph, so it stays visible while you select other things.
- **Controls:** a pinch on a list row.

**Step 7. Color and size by PageRank.**

- **What you do:** type **`color by pagerank`** and **`size by pagerank`**.
- **Alternative:** with the PageRank run selected, its inspector offers **"Color by this"** and **"Size by this"** buttons.
- **What you see:** two rows appear under Style layers in the outline. Selecting a layer shows its properties: attribute, color scale, range, and "Applies to: everything". Each can be scrubbed or typed.
- **Controls:** keyboard or the inspector; all tuning is property editing.

**Step 8. Keep only the strong families.**

- **What you do:** type **`filter pagerank >= 0.07`**.
- **What you see:** a filter step appears in the outline, and families below it fade.
- **To adjust:** select the step and scrub its threshold in the inspector; the graph updates live.
- **Turning it off:** each step's row in the outline has an eye, as in Figma's layers.
- **Controls:** keyboard, scrubbing, and the eye toggle.

**Step 9. Write a note.**

- **What you do:** press **N** for the Note tool, point at the Strozzi family and pinch. The inspector opens a text field; type "check the 1434 exile date" and press Enter.
- **What you see:** a pin appears on the node, and the note appears in the outline under Notes, where you can rename, reorder or delete it.
- **Controls:** a keyboard shortcut, a pinch, typing.

**Step 10. Undo a mistake.**

- **What you do:** press **Ctrl+Z**. Or open **History** in the outline, which lists every step ("filter PageRank >= 0.07", "size by PageRank"), and pinch a step to go back to it.
- **Controls:** keyboard, or the History list.

**Step 11. Save.**

- **What you do:** press **Ctrl+S**. For a new project, the command line asks for a name.
- **Controls:** keyboard.

---

**Advanced journeys:**

- **A compound rule:** type it, with autocomplete for attributes and values, such as `select weight >= 4 and century = 15`. The filter step's inspector shows the rule as an editable list of conditions with AND and OR groups, so a mouse-style edit is possible too. This is the strongest prototype for rules.
- **Tuning algorithm options:** every option is an inspector field generated from graphty's catalog: defaults shown, ranges enforced, explanations on hover.
- **Comparing two runs:** Shift-pinch two runs in the outline. The inspector shows a comparison table (both values, the difference, rank changes), and **"Color by difference"** creates a layer from it.
- **Reordering layers that apply to subsets:** drag rows in the outline, as in Figma. Each layer's "Applies to" property is a query you edit in place.
- **Recipes:** select a range of lines in the command history and choose **"Save as recipe"**. The recipe appears in the outline and can be run on another project.
- **Joining tables:** a Data section in the outline, plus a Join panel in the inspector where you choose key columns from two lists. Feasible here because of the keyboard and lists, unlike in the other prototypes.

**How it scales:** best of all the prototypes so far.

- **Panels are generated from graphty's catalog,** like the desktop app. A new algorithm, option, object type or plugin shows up in the outline, the inspector and autocomplete automatically.
- **The command language grows with the catalog** with nothing new to learn: you type names.

**On each device:**

| Action                   | Quest / Galaxy XR, hands                   | Quest / Galaxy XR, controllers                   | Vision Pro                                 |
| ------------------------ | ------------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| Select                   | Point and pinch                            | Trigger                                          | Look and pinch                             |
| Scrub a value            | Pinch and drag a label                     | Trigger and drag                                 | Look, pinch and drag                       |
| Steer with the miniature | Pinch and drag the marker                  | Trigger and drag                                 | Pinch and drag                             |
| Typing                   | Bluetooth keyboard, or the system keyboard | Same                                             | Bluetooth keyboard, or the system keyboard |
| Shortcuts                | Bluetooth keyboard                         | Same, plus controller buttons for undo and frame | Bluetooth keyboard                         |

**Why it should work:**

- **It carries the desktop over.** Analysts already know a layers list, a properties inspector and a command palette, and graphty's desktop app has all three. Little is new to learn.
- **It's the strongest prototype for advanced work:** rules, options, comparisons, joins and recipes all fit naturally.
- **Panels fixed in space at reading distance, seated,** suit long sessions. Arms rest; the keyboard does most of the work.
- **Navigating with the miniature avoids motion sickness:** the big graph never moves under you unexpectedly.

**What it would teach us:**

- whether a Figma-style workspace is comfortable and readable in a headset for 30 minutes or more;
- whether people can type in full VR without seeing the keyboard, or need a visible keyboard;
- whether steering with the miniature beats grabbing or a turntable;
- how much of graphty's desktop design carries over directly, which would mean little new design for VR.

**Known risks:**

- **Typing blind in full VR.** With a solid background you can't see the keyboard. Touch typists will be fine; others may need an on-screen echo of the pressed keys.
- **Key events in WebXR sessions** are reportedly delivered for Bluetooth keyboards but not guaranteed on every headset. This needs the device check.
- **It's the least "VR".** It may just be the desktop in a headset, which is useful to know: it's the honest control condition among these prototypes.
- **Reading density:** panels need large text to be readable, so less fits in each one than on a monitor.

**Where the five stand now:**

| Layer         | 1. Palette Hand      | 2. Point and Say       | 3. Gesture Grammar   | 4. Tool Belt                       | 5. Workbench                        |
| ------------- | -------------------- | ---------------------- | -------------------- | ---------------------------------- | ----------------------------------- |
| Mode model    | Select, then command | Select, then command   | Select, then command | Tools                              | **Edit properties**                 |
| Navigation    | Two-hand grab        | Grab, or voice         | Two-hand grab        | Graph comes to you, plus turntable | **Miniature, plus keyboard**        |
| Selection     | Point and pinch      | Point, plus "this"     | Pinch and lasso      | Painting, plus "more like this"    | **Typed query, plus the outline**   |
| Menus         | Hand-held palette    | Spoken grammar         | Marking menus        | Belt and cartridge rack            | **Fixed dock, plus a command line** |
| Parameters    | Sliders              | Spoken numbers         | Wrist twist          | Stick dial and trigger pressure    | **Typed values and scrubbing**      |
| Feedback      | The palette          | Command bar and cards  | On the graph         | Tool screen                        | **Inspector and outline**           |
| Advanced work | Medium               | Medium, fine for rules | Weak                 | Medium                             | **Strong**                          |

Gaps still open for a next prototype:

- **Navigation:** walking the graph from inside, by travelling along edges.
- **Selection:** "select by example".
- **Menus:** objects that carry their own controls, so each node, run or layer has handles and dials directly on it.
- **AI:** an assisted scheme.
- **The combined prototype:** one main route plus accelerators, to test whether several routes help or confuse.
