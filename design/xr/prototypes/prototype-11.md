**Prototype 11: Context Menus Everywhere**

_The idea in one line:_ the right-click menu, made spatial. Click anything with the menu button (a node, an edge, a selection, a result, a layer, or empty space) and a compact menu opens right there, angled toward you, offering what you can do to that thing. A Figma-style dock (the outline and the inspector from prototype 5) folds out when you want to edit details or see the whole project. **Everything is a context menu first, and a panel only when you ask for one.**

**How it differs, layer by layer:**

| Layer          | This prototype                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Object, then menu:** the desktop's right-click model. What you click decides the menu                                                                                                 |
| **Navigation** | **Controller grips and thumbstick:** both grips move or scale the graph; the left stick turns it. Clicking empty space is reserved for the background menu, so navigation never uses it |
| **Selection**  | **Trigger click,** with **Shift** on the controller (hold the left trigger) to add. A small **lasso** item on the background menu selects a region                                      |
| **Menus**      | **Context menus at the click point,** different for each kind of object, with submenus and search. Plus the **fold-out dock** (outline and inspector)                                   |
| **Parameters** | **Controls inside menu items,** as in Figma: a stepper for hops, a slider for a threshold, a short field for a number                                                                   |
| **Feedback**   | **The menu's header** shows the object's name and key values. Results go to the dock's outline, or to cards you pin                                                                     |

**Setup:** a solid background in full VR, with the graph about 80 cm away, seated or standing. **Controllers first** (Meta Quest, Samsung Galaxy XR, or PlayStation VR2 controllers on Apple Vision Pro), with hand-tracking equivalents at the end.

**The control vocabulary:**

| Control                               | Meaning, everywhere                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Right trigger, click**              | Select what you point at (node, edge, chip, card). On empty space: clear the selection    |
| **A button** (the "right-click")      | Open the **context menu** for what you point at. On empty space, the **background menu**  |
| **Right thumbstick, up and down**     | Move through menu items; long menus scroll                                                |
| **Right trigger** on a menu item      | Choose it. An item with an arrow opens its submenu beside it                              |
| **B button**                          | Back one menu level, or close the menu                                                    |
| **Y button**                          | Show or hide the dock (outline on the left, inspector on the right)                       |
| **Both grips**                        | Move or scale the graph. **Left stick** turns it                                          |
| **Left trigger, held** while clicking | Add to the selection, like Shift                                                          |
| **Typing into a menu's search field** | Filter the menu: the system keyboard, a Bluetooth keyboard, or voice from the field's mic |

**How menus behave:**

- **Opening:** a menu opens at the point you clicked, offset slightly so it doesn't cover the object, with a thin leader line back to it. It always faces you and keeps a constant readable size, however far away the object is.
- **Header:** every menu starts with a header naming the object and showing its key values.
- **Ordering:** menus show **recently used** items at the top, then the full list grouped.
- **Search:** menus with more than about 12 items get a **search field** at the top.
- **Closing:** choosing an item closes the menu and applies the action, or opens a preview when the action changes something you might want to review.

**The menus, by kind of object:**

| Clicked thing                                                            | Menu contents                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node**                                                                 | Header: name, degree, recent values. **Neighbors >** (with a hops stepper), **Path to... >**, **Analyze from here >**, **Style this node >**, **Hide**, **Pin**, **Add note**, **Inspect** (opens the dock's inspector on it), **Copy name**    |
| **Edge**                                                                 | Header: endpoints and weight. **Select both ends**, **Hide edge**, **Add note**, **Inspect**                                                                                                                                                    |
| **A selected group** (click any selected node when several are selected) | Header: "7 selected". **Analyze these >**, **Style these >**, **Keep only these**, **Hide these**, **Expand >**, **Save as a set**, **Clear**                                                                                                   |
| **Empty space,** the background menu                                     | **Find...**, **Analyze >** (every algorithm, grouped by family, with search), **Paint >**, **Filter >**, **Layout >**, **View >** (fit, 2D or 3D, reset), **Add data >**, **Undo**, **Redo**, **History >**, **Project >** (save, open, export) |
| **A result card**                                                        | **Color by this**, **Size by this**, **Select top N >**, **Compare with... >**, **Options...**, **Rerun**, **Delete**                                                                                                                           |
| **A layer or filter chip**                                               | **Edit...**, **Move up / Move down**, **Turn off**, **Duplicate**, **Delete**                                                                                                                                                                   |
| **A note pin**                                                           | **Read**, **Edit**, **Delete**                                                                                                                                                                                                                  |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph appears, and a hint floats beside it: "A = menu. Try it on empty space."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** squeeze both grips and pull to scale and move the graph; push the left stick to turn it. Or point at empty space, press **A**, and choose **View > Fit**.
- **Controls:** grips and stick, or the background menu.

**Step 3. Find the Medici.**

- **If you can see it:** point at the big central node and pull the trigger to select it.
- **If you need to search:** point at empty space, press **A**, choose **Find...**, and type "Med" into the menu's search field. Matches list in the menu and glow in the graph; pull the trigger on **Medici**.
- **What you see:** the Medici selected and framed.
- **Controls:** trigger, or A then Find.

**Step 4. Who they married into.**

- **What you do:** point at the Medici and press **A**. The node menu opens beside it, headed "Medici, degree 6". Move to **Neighbors >**, and its submenu shows a hops stepper set to 1, with the line "6 families". Pull the trigger on **Select**. For 2 hops, flick the stick right on the stepper first.
- **What you see:** "7 selected".
- **Controls:** A, then the stick and trigger, with an inline stepper for the number.

**Step 5. Who matters most.**

- **What you do:** point at empty space, press **A**, and choose **Analyze > Centrality > PageRank**. PageRank is near the top if you've used it before, or type "page" in the search field.
- **What you see:** a short preview shows the options (damping, weight) with defaults, then **Run**. A result card appears beside the graph with the top 10: Medici 0.146, Guadagni 0.098, Strozzi 0.088...
- **Controls:** the background menu, two submenu levels or a search.

**Step 6. Read the result.**

- **What you do:** point at any node and press **A**. The node menu's header now includes "PageRank 0.088, #3". Point at a name on the result card and pull the trigger to select that family.
- **Controls:** the same A menu, with richer headers.

**Step 7. Color and size by PageRank.**

- **What you do:** point at the result card and press **A**, then choose **Color by this**. Do it again and choose **Size by this**.
- **What you see:** the graph recolors and resizes, and two layer chips appear along the base of the graph.
- **To fine-tune a layer:** press **A** on its chip, choose **Edit...**, and the dock's inspector opens on that layer with its color scale and range.
- **Controls:** the result card's menu. The menu on the thing you want to use is the shortest route.

**Step 8. Keep only the strong families.**

- **What you do:** press **A** on the result card again, or on empty space, and choose **Filter >**. The submenu holds a small slider: "PageRank at least ___". Push the stick right to raise it, and watch families below the line fade; it reads "0.070". Pull the trigger on **Apply**.
- **What you see:** a filter chip appears next to the layer chips.
- **Later:** press A on the chip to edit, turn off, or delete it.
- **Controls:** a menu with a slider built in.

**Step 9. Write a note.**

- **What you do:** point at the Strozzi family, press **A**, and choose **Add note**. A small text field opens in the menu; type, or press its mic and say "check the 1434 exile date". Pull the trigger on **Save**.
- **What you see:** a note pin on the node, with its own menu: read, edit, delete.
- **Controls:** a menu, a text field.

**Step 10. Undo a mistake.**

- **What you do:** press **A** on empty space and choose **Undo**. For several steps, choose **History >**, which lists each step by name, and pull the trigger on the one to go back to.
- **Controls:** the background menu. Undo is never more than two clicks away.

**Step 11. Save.**

- **What you do:** press **A** on empty space and choose **Project > Save**. A new project asks for a name in a menu field.
- **Controls:** the background menu.

---

**The fold-out dock**, from prototype 5, optional. Press **Y**, or choose **Inspect** in any menu, and two panels fold out on either side of the graph:

- **The outline (left):** every object in the project (sources, runs, layers, filters, notes, sets) as a list. Each row has the **same context menu** as the object itself.
- **The inspector (right):** the full properties of whatever is selected, editable, for when a menu's quick controls aren't enough. For example a layer's full color scale, an algorithm's every option, or a compound filter rule.

The rule tying them together: **the menu is for doing, the inspector is for detail.** Every menu item that needs more than a number or a choice ends in "...", and opens the inspector.

---

**Advanced journeys:**

- **A compound rule:** **Filter > Rule...** opens the inspector's rule editor. Conditions are rows, with AND and OR groups; each row's attribute and operator are small menus, and the value is a field. Rules can be typed in the same editor.
- **Tuning algorithm options:** **Options...** on a result card opens them in the inspector. Changing one marks the card as out of date, and its menu offers **Rerun**.
- **Comparing two runs:** select two result cards with the left-trigger add, press **A** on either, and choose **Compare**. The selection menu offers it because two results are selected.
- **Layers that apply to subsets:** **Style these >** on a group's menu creates a layer that applies only to that group. Layer chips reorder with **Move up / Move down**, or by dragging rows in the outline.
- **Recipes:** in **History >**, hold the left trigger and select a range of steps, then choose **Save as recipe**. Recipes appear in the background menu under **Recipes >**.
- **Joining tables:** **Add data > Join...** opens a step-by-step join in the inspector: pick two tables and their key columns from menus. That makes it more workable here than in most prototypes.

**How it scales:** very well, and it's the most like the desktop.

- **Every menu is generated** from graphty's catalog for the clicked object's type. A new algorithm, object type or option becomes a new menu item automatically.
- **Long menus get search and recent items,** so a 60-algorithm catalog stays usable.
- **Plugins add items** to the menus of the object types they act on.

**On each device:**

| Action              | Controllers (Quest, Galaxy XR; PS VR2 on Vision Pro) | Hands (Quest, Galaxy XR)          | Vision Pro, eyes and hands |
| ------------------- | ---------------------------------------------------- | --------------------------------- | -------------------------- |
| Select              | Trigger                                              | Ray and pinch                     | Look and pinch             |
| Context menu        | **A button**                                         | **Pinch and hold** (long press)   | **Look and pinch-hold**    |
| Move through a menu | Stick, or point                                      | Point                             | Look                       |
| Choose an item      | Trigger                                              | Pinch                             | Pinch                      |
| Back / close        | B                                                    | Pinch empty space beside the menu | Look away and pinch        |
| Dock                | Y                                                    | Background menu, "Show panels"    | Same                       |

**Why it should work:**

- **It's the most familiar model there is.** Everyone knows right-click, and graphty's desktop app is object-first, so the same menus can serve both.
- **Discoverable:** you never need to remember where a command lives. Click the thing, and its options are there.
- **Short trips:** the menu appears where your attention already is, not on a far panel.
- **Scales with the product:** menus grow with graphty's catalog without new interaction design.
- **The dock gives depth when needed,** and the menus keep it out of the way the rest of the time.

**What it would teach us:**

- whether menus at the point of action beat a fixed toolbar (prototype 5) or a hand palette (prototype 1) for speed and errors;
- whether menus that open beside objects block what you're looking at in dense graphs;
- how deep submenus can go in VR before people get lost (two levels? three?);
- whether menus and the dock feel like one coherent system, or two that compete.

**Known risks:**

- **Pointing precision on small menu items** with a hand ray. Items need to be large, and the pointer should snap to the nearest item.
- **Menus covering the graph** in dense areas. The offset and leader line help, and menus can be dragged aside.
- **Long-press on hand tracking** is slow and can be ambiguous with a pinch-drag.
- **It's the least novel prototype.** That's useful as the baseline that every other prototype has to beat.

**All eleven prototypes, by mode model:**

| Mode model                          | Prototypes                                         |
| ----------------------------------- | -------------------------------------------------- |
| Select, then command                | 1 Palette, 2 Say, 3 Gesture Grammar                |
| Tools                               | 4 Tool Belt, 6 Workshop, 8 Grip and Tool           |
| Edit properties                     | 5 Workbench                                        |
| Sign chords                         | 7 Hand Signs                                       |
| Scope ring and cast                 | 9 Spellcasting                                     |
| Target lock, then act               | 10 HUD                                             |
| **Object, then menu (right-click)** | **11 Context Menus**, which shares its dock with 5 |
