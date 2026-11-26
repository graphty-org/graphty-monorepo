# User input latency: catalog, conditions and gaps

Every input a reader can give graphty-element or the graphty app should show its result on screen within 300 ms,
and preferably within 150 ms. This document lists every such input, says how a test drives each one with real
input and what counts as "the result is visible", names the conditions that change its cost, defines the
condition matrix a repeatable suite runs, and lists what the current runner (`interaction-latency.mjs` in this
directory) does not yet cover.

See INTERACTION-LATENCY.md for how the runner works today.

## 1. What is measured

- **Latency** runs from the input event's own `event.timeStamp` (the moment the browser received the mouse, wheel,
  key or touch event Playwright sent) to the first presented frame whose pixels show the result. "Presented"
  means the animation frame after the one in which graphty-element drew the change; the runner reads the canvas
  back (graphty-element keeps its last drawn frame) and compares a small box at the target with the box before
  the input.
- A result that is not on the canvas (a menu, a dialog, a table row, an Inspector heading) is visible when it
  appears in the accessibility tree or the DOM with layout (non-zero box, not `hidden`), checked each frame.
- **State time** (the moment the public API reports the result: selection, hovered node, camera state, a style's
  resolved value) is kept beside the pixel time. It separates "the element knew" from "the reader saw".
- **Animations** (a camera glide, a layout transition, a tour) are timed twice: latency to the first frame that
  moved, which must meet the 300 ms bar, and animation length to the settled frame, which is reported but not
  held to the bar.
- **Continuous inputs** (drags, wheel runs, held keys, pinches) are timed per move, and as bursts at 60 and
  120 events a second: lag from the last event to the frame that shows it, and frames dropped during the burst.
- **Slow network or compute** (an expand fetch, an assistant reply, an algorithm run on 100k nodes) is timed to
  the first visible response, the pending or running state, which must meet the bar; time to the finished result
  is reported as work length.

Bands: under 150 ms is good, 150 to 300 ms is acceptable, over 300 ms fails. The suite reports the 95th
percentile of each cell against the bands.

### Condition codes used in the tables

| code | condition                                       | values the suite uses                                                                                                             |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| N    | graph size (nodes; edges about twice the nodes) | 100, 1k, 10k, 50k, 100k                                                                                                           |
| P    | render path                                     | objects (the default), batched                                                                                                    |
| S    | look                                            | plain (no style layers), default (graphty-element's default layers: Everything, Selected, Hovered, Pinned), heavy (see section 3) |
| D    | dimension                                       | 3D, 2D                                                                                                                            |
| R    | device pixel ratio                              | 1, 2                                                                                                                              |
| L    | layout state                                    | settled, force layout running                                                                                                     |
| A    | app panels (app only)                           | closed, Inspector Style tab open, table open, timeline open                                                                       |
| Sel  | current selection size                          | 1, 100, all                                                                                                                       |
| Deg  | degree of the node under the input              | low (2), hub (top 1 percent)                                                                                                      |

"Harness" names the runner's interaction id when it already times the input, or says **gap**.

## 2. Catalog

### 2.1 Pointer on the canvas: hover

| input                                          | drive                                                       | result visible                                                                                                                           | cost driven by                                                                                                 | harness                                                             |
| ---------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Pointer onto a node                            | `mouse.move` from empty canvas onto the node's screen point | box at the node changes to the Hovered look; with no hover look in the style, state only (hovered node) and the row is marked no-visible | N, P (batched reads the node ID target back a frame or more later), S (Hovered layer, data-bound styles), R, L | hover-node, hover-node-cold, hover-node-running-layout (state only) |
| Pointer off a node onto empty canvas           | move from the node to an empty point                        | box at the node returns to the unhovered look                                                                                            | as above                                                                                                       | pointer-leaves-node                                                 |
| Pointer from one node straight onto a neighbor | move between two adjacent node points                       | old box loses, new box gains the Hovered look                                                                                            | N, P (stale async picks dropped), S                                                                            | **gap**                                                             |
| Pointer out of the element while hovering      | move from a node to a point outside the element             | hover look gone at the node; edge tooltip removed                                                                                        | S, tooltips                                                                                                    | **gap**                                                             |
| Hover sweep across a dense area                | 60 and 120 Hz `mouse.move` burst across many nodes          | each frame's Hovered box matches the node under the pointer at most one pick late; lag after the last move, dropped frames               | N, P, S, R                                                                                                     | **gap** (bursts cover drag, orbit, pan, wheel only)                 |
| Pointer onto an edge                           | move onto the midpoint of an edge (straight and curved)     | edge box changes to the hover look, or edge-hover state when no look                                                                     | edge count, P (batched on WebGPU reads the edge ID target back), curves, arrowheads, R                         | hover-edge                                                          |
| Hover a node until its tooltip shows           | move onto a node with a node.tooltip layer                  | tooltip card pixels appear beside the node                                                                                               | tooltip text, fonts, N                                                                                         | hover-node-tooltip, app-tooltip-node                                |
| Hover an edge until its tooltip shows          | move onto an edge with an edge.tooltip layer                | tooltip pixels at the pointer                                                                                                            | edge pick cost, P                                                                                              | hover-edge-tooltip, app-tooltip-edge                                |
| Pointer over a label card's close button       | move onto the x                                             | cursor style changes (read `getComputedStyle(canvas).cursor`; no pixel change)                                                           | label count                                                                                                    | **gap**                                                             |
| Pen hover                                      | CDP `Input.dispatchMouseEvent` with `pointerType: "pen"`    | as mouse hover                                                                                                                           | as mouse                                                                                                       | **gap**                                                             |

### 2.2 Pointer on the canvas: click, select, context

| input                                                 | drive                                                   | result visible                                                              | cost driven by                                                        | harness                                                            |
| ----------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Click a node                                          | `mouse.down` / `mouse.up` on the node                   | box at the node shows the Selected look                                     | N, P, S, Sel being replaced, L, accessible node list re-marking       | click-select-node, -cold, click-select-running-layout (state only) |
| Shift-click a node (add)                              | Shift held, click                                       | added node shows the Selected look                                          | Sel, S                                                                | shift-click-add-node                                               |
| Ctrl/Cmd-click a selected node (toggle off)           | Control held, click                                     | node loses the Selected look                                                | Sel, S                                                                | ctrl-click-toggle-node                                             |
| Click an edge                                         | click on an edge midpoint                               | edge box shows the selected look                                            | edge count, P (WebGPU edge readback), curves, arrowheads              | click-select-edge                                                  |
| Shift- or Ctrl-click an edge                          | modifier held, click                                    | edge added to or toggled in the selected look                               | as above, Sel                                                         | **gap**                                                            |
| Click empty canvas                                    | click an empty point                                    | every previously selected box loses the Selected look (check the first one) | Sel (up to 100k), S, edge pick before deciding empty                  | click-empty-deselect                                               |
| Click inside a group outline                          | click inside a drawn outline away from nodes            | selection drawn cleared; group-outline click reported                       | group count, outline layers                                           | **gap** (needs a graph with group outlines)                        |
| Click a label card's close button                     | click on the x                                          | card pixels gone, selection cleared                                         | label count, Sel                                                      | **gap**                                                            |
| Right-click an unselected node                        | right button down/up                                    | node shows the Selected look                                                | as click                                                              | right-click-node, -cold                                            |
| Right-click an edge, a selected node, or empty canvas | right button                                            | selection kept as is (state), host contextmenu event received               | edge pick cost                                                        | **gap**                                                            |
| Double-click a node to expand (network source)        | `mouse.dblclick` on a node, against a local stub source | first new node drawn (pending state if the element shows one)               | stub latency excluded beyond first draw, N, L restart, S on new nodes | **gap** (needs a stub network source)                              |
| Single-click expand (expand trigger = click)          | click on a node, stub source                            | node selected look, then first new node                                     | as above                                                              | **gap**                                                            |
| Tap a node                                            | CDP touch tap                                           | Selected look                                                               | as click                                                              | touch-tap-select                                                   |
| Tap empty canvas                                      | CDP touch tap on empty point                            | selection cleared                                                           | as click empty                                                        | **gap**                                                            |
| Pen tap                                               | CDP pen pointer down/up                                 | Selected look                                                               | as click                                                              | **gap**                                                            |

### 2.3 Pointer on the canvas: drag nodes and regions

| input                                    | drive                              | result visible                                                          | cost driven by                                                  | harness                                                         |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Drag a node, per move (3D and 2D)        | down on a node, `mouse.move` steps | node box at the new pointer position shows the node                     | Deg (edges redrawn), N, P, S (labels, arrowheads, curves), L, R | drag-node, burst-drag-node-60hz/120hz, drag-node-running-layout |
| Release a dragged node                   | `mouse.up`                         | Pinned look at the node (or node-drag-end state when the look has none) | Pinned layer, history, autosave, layout reheat                  | drop-node                                                       |
| Drag a hub node                          | as drag, on a top-degree node      | as drag                                                                 | Deg = hub                                                       | **gap** (targets are whatever node is pickable)                 |
| Mod+Z while still holding a node         | key while the mouse button is down | node stops following; drawing shows it back where the step began        | history size                                                    | **gap**                                                         |
| One-finger drag on a node                | CDP touch move                     | node follows the finger                                                 | as drag                                                         | **gap**                                                         |
| Pen drag on a node                       | CDP pen moves                      | node follows                                                            | as drag                                                         | **gap**                                                         |
| Shift-drag a rectangle, per move         | Shift held, down on empty, moves   | outline pixels follow the pointer (SVG over the canvas: DOM box)        | cheap; outline only                                             | **gap** (only the release is timed)                             |
| Release a Shift-drag rectangle           | `mouse.up`                         | enclosed nodes show the Selected look                                   | N (region test), Sel added, S                                   | region-select                                                   |
| Shift-drag a lasso, per move and release | as rectangle with region = lasso   | outline follows; enclosed nodes selected                                | lasso point count, N                                            | **gap**                                                         |

### 2.4 Camera from pointer, wheel and touch

| input                                          | drive                                           | result visible                                                           | cost driven by                                                           | harness                                        |
| ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------- |
| Left-drag empty canvas to orbit (3D), per move | down on empty, moves                            | whole-canvas thumbnail differs from before                               | N, P, S (labels and declutter, arrowheads, curves), R, L, antialias mode | drag-orbit-3d, burst-orbit-60hz/120hz          |
| Pan: right-drag (3D), left-drag (2D), per move | as above                                        | thumbnail differs                                                        | as orbit                                                                 | drag-pan, burst-pan-60hz/120hz                 |
| Middle-drag pan (3D)                           | middle button drag                              | thumbnail differs; no browser autoscroll                                 | as orbit                                                                 | **gap**                                        |
| Right-drag pan does not open a menu on release | right-drag 3 px or more, release                | no contextmenu event reaches the host (DOM: no app menu)                 | none                                                                     | **gap** (correctness, not latency)             |
| Drag on a globe or location map                | drag on a map-layout graph                      | thumbnail differs; grabbed point stays under the pointer                 | basemap tiles, sizeSpace, arcs                                           | **gap** (needs a map graph)                    |
| One wheel notch                                | `mouse.wheel` 100 px                            | thumbnail differs                                                        | as orbit; label size at depth                                            | wheel-zoom, burst-wheel-60hz/120hz             |
| Wheel with zoom-to-pointer                     | wheel with the option on (always on for maps)   | thumbnail differs; point under the pointer kept                          | extra unprojection                                                       | **gap**                                        |
| Trackpad pinch (Ctrl+wheel)                    | `keyboard.down("Control")` + small wheel deltas | thumbnail differs                                                        | event rate                                                               | pinch-ctrl-wheel, burst-pinch-wheel-60hz/120hz |
| Trackpad two-finger scroll (small deltas)      | 120 Hz burst of 2 to 4 px wheel deltas          | accumulated zoom drawn; lag after last delta                             | event rate, tiny deltas                                                  | **gap** (wheel rows send whole notches)        |
| One-finger drag on empty canvas                | CDP touch moves                                 | thumbnail differs                                                        | as orbit; R = 2 on phones                                                | touch-drag-camera                              |
| Two-finger pinch, per move and burst           | CDP two-point touch moves                       | thumbnail differs                                                        | gesture recognizer, R                                                    | touch-pinch, touch-pinch-burst                 |
| Two-finger twist (roll)                        | CDP two touch points rotating                   | thumbnail differs                                                        | as pinch                                                                 | **gap**                                        |
| Any press during a camera tour                 | play a tour, then click                         | camera stops: thumbnail stops changing within the bar (two equal frames) | tour state                                                               | **gap**                                        |
| Camera input while auto-rotate is on           | auto-rotate on, then drag                       | auto-rotation stops (camera follows only the drag)                       | autoRotateResume                                                         | **gap**                                        |

### 2.5 Keyboard on the canvas and the element

| input                                             | drive                                                                           | result visible                                                                             | cost driven by                       | harness                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| Tab into the canvas / press to focus              | `keyboard.press("Tab")`, or click                                               | focus ring (CSS outline) present; `document.activeElement` is the element                  | none                                 | **gap** (trivial; correctness of key delivery)             |
| Arrow key (3D turns, 2D pans)                     | `keyboard.press` with canvas focused                                            | thumbnail differs                                                                          | N, P, S, R                           | key-camera-turn-or-pan                                     |
| Zoom key (W/S or = / - in 3D, = / - in 2D)        | key press                                                                       | thumbnail differs                                                                          | as above                             | key-camera-zoom                                            |
| Roll key (A/D in 3D, Q/E in 2D)                   | key press                                                                       | thumbnail differs                                                                          | as above; labels re-oriented         | **gap**                                                    |
| Hold a camera key                                 | `keyboard.down`, CDP key events with `autoRepeat: true` at 30 Hz, `keyboard.up` | frames keep changing every frame; stop latency: thumbnail still within the bar after keyup | sustained frame cost, dropped frames | **gap**                                                    |
| Mod+Z / Shift+Mod+Z / Mod+Y on the focused canvas | key press after a step (node move, color change, data add)                      | drawing returns to (or re-applies) the step                                                | what the step changed, N             | **gap** on the element; app-undo times one case in the app |
| Ctrl+A on the focused canvas                      | key press                                                                       | input:select-all event only (the element selects nothing)                                  | consumer's handler                   | **gap** (event delivery only)                              |
| Escape with a keymap attached                     | key press with a selection                                                      | Selected look gone                                                                         | Sel, S                               | app-escape-deselect (app only)                             |
| Accessible node list: Up/Down/Home/End            | keys in the list                                                                | `aria-activedescendant` moves (accessibility tree)                                         | N (one option per visible node)      | node-list-walk                                             |
| Accessible node list: Enter or Space              | key on the active option                                                        | node shows the Selected look; live region text                                             | as click; list re-marking            | node-list-select                                           |
| Minimap arrow keys                                | keys on the focused minimap                                                     | main thumbnail differs                                                                     | as camera                            | **gap**                                                    |
| Push-to-talk hold key                             | `keyboard.down` on the configured key                                           | listening state visible (app Talk control in the accessibility tree)                       | speech engine start                  | **gap** (see section 5)                                    |

### 2.6 Minimap, resize and pixel ratio

| input                                                  | drive                                                                 | result visible                                                             | cost driven by                  | harness       |
| ------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------- | ------------- |
| Click in the minimap                                   | click                                                                 | main thumbnail differs                                                     | main redraw, minimap redraw     | minimap-click |
| Drag in the minimap, per move                          | down and moves                                                        | main thumbnail differs per move                                            | as above                        | **gap**       |
| Resize the window                                      | `page.setViewportSize`                                                | canvas backing size matches the new box and the thumbnail is not stretched | canvas pixels, R, N, labels     | **gap**       |
| Resize by a panel (splitter drag in the app), per move | drag the panel handle                                                 | canvas box and backing size follow per move                                | as resize; panel content reflow | **gap**       |
| Change pixel ratio (browser zoom, other screen)        | CDP `Emulation.setDeviceMetricsOverride` with a new deviceScaleFactor | canvas backing size changes and redraws                                    | R, N, labels                    | **gap**       |

### 2.7 XR (graphty-element in a headset)

All of these are **gaps** and cannot be driven headless; see section 5.

| input                                           | result visible                     | cost driven by                                                                |
| ----------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Enter VR / Enter AR button                      | immersive session running          | session start, scene rebuild                                                  |
| Point a controller or hand ray at a node        | laser ends on the node, hover look | N, P (batched needs a row scan per controller per frame), 72 to 120 Hz budget |
| Trigger or pinch on a node, no move             | Selected look                      | Sel, S, stereo cost                                                           |
| Trigger or pinch and move                       | node follows the hand              | Deg, L, zAxisAmplification                                                    |
| Double pick to expand                           | new nodes drawn                    | fetch, N, L                                                                   |
| Thumbsticks                                     | graph turns, zooms, pans           | N, P, S                                                                       |
| Two-hand gesture                                | graph scales and turns             | N, P, S                                                                       |
| Face buttons (talk, approve, deny)              | talk state, card approved          | assistant                                                                     |
| Wrist orb pinch to talk; pointing while talking | talk state; pointed nodes recorded | hand tracking, picks                                                          |
| In-headset card or menu press                   | card acts, host menu item reported | host                                                                          |

### 2.8 Model preview (element)

| input                                                | drive                            | result visible               | cost driven by                   | harness |
| ---------------------------------------------------- | -------------------------------- | ---------------------------- | -------------------------------- | ------- |
| Drag, wheel, pinch, arrow keys on a 3D model preview | real input on the preview canvas | preview canvas pixels differ | model triangles, preview size, R | **gap** |

### 2.9 App canvas extras

The element inputs above also run on the app page (the runner already does this for most ids); these are the
app's own additions.

| input                                                                                                                                                     | drive                                    | result visible                                                                                       | cost driven by                     | harness                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Click a node with Focus selected on                                                                                                                       | click                                    | Selected look drawn; Inspector heading names it; glide's first moved frame                           | A, N, P, D                         | app-click-select-node, app-click-inspector, -style-open, -focus-off, app-first-select-inspector |
| Focus selected glide length                                                                                                                               | click                                    | camera settled (animation length)                                                                    | N                                  | app-click-glide-settled                                                                         |
| Shift-click a second node                                                                                                                                 | Shift + click                            | Inspector shows the selection summary                                                                | Sel                                | app-shift-click-add                                                                             |
| Right-click a node until the canvas menu shows                                                                                                            | right click                              | menu in the accessibility tree                                                                       | menu items built for the selection | app-right-click-menu, -cold                                                                     |
| Right-click an edge or empty canvas                                                                                                                       | right click                              | edge or empty-canvas menu shown                                                                      | edge pick                          | **gap**                                                                                         |
| Touch-and-hold for the menu                                                                                                                               | CDP touch held past the long-press delay | menu shown (delay excluded: measured from the long-press moment)                                     | menu                               | **gap**                                                                                         |
| Shift+F10 or ContextMenu key                                                                                                                              | key on the focused canvas                | menu shown                                                                                           | menu                               | **gap**                                                                                         |
| Pick a canvas-menu item (Fit, Fit selection, New layer from selection, Clear selection, Select endpoints, Expand, Collapse, Simulate removing, Filter to) | click the item                           | the item's result drawn (camera first moved frame, Selected look, new layer look, hidden nodes gone) | per item: Sel, N, S                | **gap**                                                                                         |

### 2.10 App keys and toolbar commands

| input                                                            | drive                         | result visible                                                 | cost driven by            | harness                                          |
| ---------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------- | ------------------------- | ------------------------------------------------ |
| Escape clears the selection                                      | key                           | Selected look gone                                             | Sel, A                    | app-escape-deselect, -style-open                 |
| Ctrl/Cmd+A selects all                                           | key                           | Selected look on a sampled node; Inspector summary             | N, S, A                   | app-select-all                                   |
| G grows to the neighborhood                                      | key                           | neighbor shows the Selected look                               | Deg, S                    | app-grow-neighborhood                            |
| 0 fits the graph                                                 | key                           | first moved frame; settled                                     | N, glide                  | app-fit-graph                                    |
| F fits the selection                                             | key                           | first moved frame; settled                                     | Sel                       | **gap**                                          |
| 5 switches 2D and 3D                                             | key                           | drawn in the other dimension; settled                          | N, P, S, L re-run         | app-switch-dimension                             |
| 9 toggles auto-rotate                                            | key                           | thumbnail starts changing every frame (or stops)               | N, P                      | **gap**                                          |
| L or Legend button                                               | key / click                   | legend card shown or hidden                                    | legend sections           | app-legend-toggle (button only)                  |
| Shift+T or Table button                                          | key                           | table dock with first data row; canvas redrawn at the new size | N rows, columns           | app-table-open, -cold                            |
| T toggles the timeline                                           | key (graph with a time field) | dock shown, canvas resized                                     | time bins                 | **gap**                                          |
| Ctrl/Cmd+K opens quick actions                                   | key                           | palette shown, search focused                                  | command count             | app-quick-actions                                |
| Type in quick actions and press Enter                            | type, Enter                   | list filtered per keystroke; then the chosen command's result  | command count             | **gap**                                          |
| / or Ctrl/Cmd+F focuses Find                                     | key                           | Find input focused                                             | none                      | **gap**                                          |
| Type one character in Find                                       | type                          | result list updated                                            | N searched, columns       | app-find-keystroke                               |
| Enter or click on a Find hit (Shift adds)                        | key / click                   | matching nodes show the Selected look                          | match count, glide        | **gap**                                          |
| Ctrl/Cmd+Z undo (after a color change)                           | key                           | color reverted at the node                                     | the step                  | app-undo                                         |
| Undo for other steps (node move, layer delete, data add, filter) | key after the step            | drawing reverted                                               | the step, N               | **gap**                                          |
| Redo (Shift+Mod+Z, Ctrl+Y) and the header Undo/Redo buttons      | key / click                   | step re-applied                                                | the step                  | **gap**                                          |
| F6 / Shift+F6                                                    | key                           | focus in the next panel                                        | none                      | **gap**                                          |
| ? shortcuts dialog                                               | key                           | dialog shown                                                   | none                      | **gap**                                          |
| F2 rename project, type, Enter                                   | keys                          | field shown; name committed                                    | autosave                  | **gap**                                          |
| Ctrl/Cmd+S, Shift+Ctrl/Cmd+S                                     | key                           | saved state shown / Save as dialog shown                       | N (serialization), styles | **gap**                                          |
| Ctrl/Cmd+O, main menu Open                                       | key                           | file chooser event (see section 5)                             | none                      | **gap**                                          |
| Ctrl/Cmd+V paste data                                            | key with clipboard granted    | pasted data staged (source card shown)                         | pasted size               | **gap**                                          |
| Ctrl/Cmd+E export dialog                                         | key                           | dialog shown with preview                                      | preview render, N         | **gap**                                          |
| Ctrl/Cmd+, settings dialog                                       | key                           | dialog shown                                                   | none                      | **gap**                                          |
| Ctrl/Cmd+I assistant place                                       | key                           | place shown                                                    | conversation length       | **gap**                                          |
| Shift+A Analyze, P Path between                                  | key                           | popover / path form shown                                      | catalog size              | **gap** (opened only by click inside timed rows) |
| N add note                                                       | key                           | note listed; annotation drawn                                  | annotations               | **gap**                                          |
| V save camera                                                    | key                           | camera listed in Views                                         | none                      | **gap**                                          |
| Digit bound to a saved camera                                    | key                           | first moved frame; settled                                     | glide                     | **gap**                                          |
| Toolbar Zoom in / Zoom out                                       | click                         | thumbnail differs                                              | N                         | **gap**                                          |
| Camera menu presets (Top, Side, Isometric, Fit)                  | click                         | first moved frame; settled                                     | glide                     | **gap**                                          |
| Mode menu 2D / 3D                                                | click                         | as key 5                                                       | as key 5                  | **gap** (setup only)                             |
| Focus selected toggle, Stop tour, Filters button                 | click                         | toggle state shown / tour stops / filter panel shown           | none                      | **gap**                                          |
| Open main, mode, camera, help menus                              | click                         | menu shown                                                     | none                      | **gap**                                          |

### 2.11 App panels: Graph place and Inspector

| input                                                                                                                    | drive                | result visible                                        | cost driven by                      | harness                   |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------- | ----------------------------------- | ------------------------- |
| Rail: Graph, Data, Views, Notes, Assistant, Settings                                                                     | click                | place shown                                           | layer count, sources, conversation  | app-rail-data (Data only) |
| Click a layer row                                                                                                        | click                | Inspector shows its Style tab                         | layer count, style counts           | **gap** (setup only)      |
| Layer eye (hide / show)                                                                                                  | click, Shift+Mod+H   | layer's nodes gone, then back                         | nodes matched, N, P                 | app-layer-visibility      |
| Lock / unlock                                                                                                            | click, Shift+Mod+L   | lock state shown                                      | none                                | **gap**                   |
| Reorder by drag, per move and drop; Move up/down; Move to folder; Pin                                                    | drag / Mod+] / Mod+[ | drag preview per move (DOM); restyled drawing on drop | layer count, overlapping layers, N  | **gap**                   |
| Rename, Duplicate, Delete, Ungroup                                                                                       | F2 / Mod+D / Delete  | row changed; duplicate or delete restyles the graph   | nodes matched                       | **gap**                   |
| Add layer / New layer from selection                                                                                     | click                | row added and its look drawn                          | Sel, N                              | **gap**                   |
| Select what it paints                                                                                                    | row menu item        | members show the Selected look                        | members, S                          | **gap**                   |
| Graph row (Everything header)                                                                                            | click                | Graph values shown                                    | N (summaries)                       | **gap**                   |
| Inspector tabs (Values, Style, Edge)                                                                                     | click                | tab content shown                                     | style counts, charts over N         | **gap** (setup only)      |
| Inspector Largest component item                                                                                         | click                | members show the Selected look                        | component computation               | app-inspector-item        |
| Node values: neighbor, edge, membership, result, copy id, hops                                                           | click                | item selected or inspected; hops recomputed           | Deg, hops                           | **gap**                   |
| Graph overview: which degree, direction                                                                                  | click                | summary recomputed                                    | N                                   | **gap**                   |
| Run values, layer values controls                                                                                        | click                | values updated; run settings re-run                   | algorithm                           | **gap**                   |
| Why this look: click a layer line                                                                                        | click                | that layer opened                                     | none                                | **gap**                   |
| Kind menu (...) items                                                                                                    | click                | command result                                        | per item                            | **gap**                   |
| Graph settings: background color/image, lighting, hide overlapping labels, move labels off nodes, same size at any depth | click / type         | drawing changes                                       | labels at N, lighting, image decode | **gap**                   |
| Panel resize handle (left panel, Inspector, table), per move                                                             | drag                 | canvas redrawn at the new size per move               | R, N, labels, table rows            | **gap**                   |

### 2.12 App panels: Style tab

| input                                                                                               | drive        | result visible                                 | cost driven by                                              | harness                               |
| --------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| Type a color and press Enter                                                                        | type, Enter  | node drawn in the new color                    | nodes matched, P, file styles                               | app-restyle-color, -cold, -style-open |
| Pick from the swatch picker / drag in the color picker, per move                                    | click / drag | live preview drawn per move; commit on release | restyle per move                                            | **gap**                               |
| Number field: type, arrow-step, scrub (size, width, opacity, curvature, arrowhead size, glow, halo) | keys / drag  | drawing updated per step                       | channel (size moves edge ends, curvature rebuilds edges), P | **gap**                               |
| Select: shape, edge style, arrowhead type, wireframe, visibility                                    | click option | rebuilt meshes or rows drawn                   | mesh or batch rebuild, N                                    | **gap**                               |
| Nodes / Edges switch, kind switch on                                                                | click        | section shown; styling starts                  | none / restyle                                              | **gap**                               |
| Add a property with a section's +                                                                   | click        | row shown                                      | none                                                        | **gap**                               |
| Add a node label (Label > attribute)                                                                | click        | label pixels at a node                         | label count, fonts, declutter, R                            | app-labels-on                         |
| Label settings (size, color, background, placement)                                                 | click / type | labels redrawn                                 | label count                                                 | **gap**                               |
| Bind color to data (Vary by)                                                                        | click        | node drawn in its data color                   | column scan, palette                                        | app-bind-style                        |
| Bind size, change palette, scale, bins, steps; binding preview                                      | click        | preview updated; drawing updated               | N, column                                                   | **gap**                               |
| Groups: value per group, rename, Select these, New layer for group, Clear                           | click        | group restyled or selected                     | group size and count                                        | **gap**                               |
| Which picker: add step, pick field, tick values, drag range, test, hops                             | click / drag | match count and drawing updated                | selector over N, hops                                       | **gap**                               |
| Highlight color and size                                                                            | click        | Selected look changed                          | Sel                                                         | **gap**                               |
| Model: pick a model, slider per move                                                                | click / drag | nodes drawn with the model                     | model load, N times triangles                               | **gap**                               |
| Picture: pick or drop an image                                                                      | click        | nodes textured                                 | image decode, N                                             | **gap**                               |
| Shaders: add from gallery, reorder (drag or Alt+Up/Down), remove, params                            | click / keys | effect drawn                                   | shader compile, R                                           | **gap**                               |
| Shader code editor typing                                                                           | type         | recompiled preview                             | compile per edit                                            | **gap**                               |
| Reference picker: arm, then click a node or a table row                                             | click        | node shown as the reference                    | rule re-evaluation                                          | **gap**                               |

### 2.13 App panels: Data place, table, filters, timeline

| input                                                                                                  | drive               | result visible                                              | cost driven by                   | harness                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Click a table row (Shift, Ctrl)                                                                        | click               | node shows the Selected look (refit so it is on screen)     | Sel, table re-render             | app-table-row-select (state only)                |
| Click a column header to sort                                                                          | click               | first rows change                                           | N rows                           | app-table-sort                                   |
| Scroll the table                                                                                       | wheel burst         | rows shown without blank frames; lag after last wheel       | page fetch per window            | **gap**                                          |
| Header menu (Rename, Hide, Hide others, Filter to, Details, Match on this)                             | click               | column changed; Filter to hides nodes                       | N                                | **gap**                                          |
| Nodes/Edges/source tabs, Shown/All, maximize, close, options                                           | click               | table switches; canvas resized                              | N rows                           | **gap**                                          |
| Issues list: fix, ignore, restore, show rows                                                           | click               | issue resolved; data updated                                | N                                | **gap**                                          |
| Add data: File, Samples, Generator, Paste, New from data, Network data                                 | click               | dialog or chooser shown; on confirm, first frame with nodes | N, parse, layout                 | **gap**                                          |
| Source row actions: select, rename, Load more, Refresh, Select nodes, Remove, Replace, Edit, Edit join | click               | action's result drawn                                       | N, fetch                         | **gap**                                          |
| Fields: type, unit, direction, higher-means, role (Time, Label), remove                                | click               | field updated; bindings restyled                            | column size                      | **gap** (setup only)                             |
| Filters: add, edit card (attribute, operator, value, range), toggle, clear                             | click / type / drag | hidden nodes gone; counts updated                           | filter over N, hide or show many | **gap**                                          |
| Runs list: re-run, remove, Score dialog                                                                | click               | run re-drawn or removed                                     | algorithm, restyle               | **gap**                                          |
| Time card: designate time field, unit, zone, mode, step                                                | click               | timeline shown or updated                                   | time parse over rows             | **gap**                                          |
| Timeline Step forward                                                                                  | click               | readout and drawing change                                  | N per step                       | app-timeline-step                                |
| Timeline keys , . < > and Jump to selection                                                            | keys                | as step                                                     | N                                | **gap**                                          |
| Timeline brush drag, per move and release                                                              | drag                | drawing follows per move                                    | entering/leaving rows, N, P      | **gap**                                          |
| Timeline brush end drag                                                                                | drag                | end drawn per move; window set on release                   | as above                         | **gap**                                          |
| Timeline wheel / Ctrl+wheel / pinch zoom                                                               | wheel               | bars rebinned                                               | time bins                        | **gap**                                          |
| Play / pause time                                                                                      | click / key         | first changed frame; per-frame cost while playing           | N                                | **gap**                                          |
| Show whole timeline, show all time, clear the window chip, type a window                               | click / type        | window reset drawn                                          | N                                | **gap**                                          |
| Join screen, network data form, server node expand, staged source cards                                | click / type        | preview or commit shown                                     | rows, fetch                      | **gap** (several are experiments off by default) |

### 2.14 App: analysis and layout

| input                                                      | drive           | result visible                                                           | cost driven by                             | harness                                                         |
| ---------------------------------------------------------- | --------------- | ------------------------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| Analyze button                                             | click           | popover with list, filter focused                                        | catalog size                               | **gap** (inside timed rows only)                                |
| Type in Filter analyses                                    | type            | list narrowed per keystroke                                              | catalog size                               | **gap**                                                         |
| Analyze > Degree > Run                                     | click           | running row shown (first response); layer listed and drawn (work length) | N, algorithm, GPU or CPU, suggested styles | app-run-analysis                                                |
| Other algorithms (PageRank, Louvain, betweenness), Run all | click           | as above                                                                 | algorithm cost                             | **gap**                                                         |
| Shortest path between two nodes                            | form, Find path | path layer drawn                                                         | N, combobox search                         | app-shortest-path                                               |
| Simulate removing (node or edge menu)                      | click           | effect drawn                                                             | N, measures re-run                         | **gap**                                                         |
| Layout > Circle or Grid > Apply                            | click           | first moved frame; settled                                               | N, transition                              | app-layout-apply                                                |
| Layout > Force > Apply / Re-run                            | click           | first moved frame; settled                                               | N, GPU or CPU                              | app-layout-rerun-force                                          |
| Other layouts, layout options, Reshuffle seed              | click / type    | first moved frame; settled                                               | algorithm, worker                          | **gap** (element-layout-switch times setLayout, not real input) |
| Map layout: address, map source, image upload              | type / click    | map drawn, nodes placed                                                  | tiles, gazetteer, N                        | **gap**                                                         |

### 2.15 App: start, project, views, notes, assistant, export, dialogs

| input                                                                                                                        | drive                       | result visible                                     | cost driven by                              | harness             |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------- | ------------------------------------------- | ------------------- |
| Click a sample card / open a file                                                                                            | click                       | first frame with nodes; settled                    | N, parse, layout                            | app-open-cold       |
| New project, Back to start, Generator, Network data, Recent project                                                          | click                       | screen, dialog or graph shown                      | N for dispose and open                      | **gap**             |
| Sample search, group filter, grid/list toggle                                                                                | type / click                | list filtered                                      | list size                                   | **gap**             |
| Start screen hero graph: turn, click a node, Analyze                                                                         | as canvas inputs            | as canvas                                          | small graph                                 | **gap**             |
| Drop a file on the window or Data page                                                                                       | see section 5               | file staged, then first frame with nodes           | file size, N                                | **gap**             |
| Click a saved camera; drag to reorder cameras or tour stops                                                                  | click / drag                | first moved frame; settled / card follows          | glide, list size                            | **gap**             |
| New tour, edit stops, Play tour                                                                                              | click / type                | first moved frame (tour length reported)           | N per frame                                 | **gap**             |
| Add, edit, remove a note                                                                                                     | click / type                | note listed; annotation drawn                      | annotation count                            | **gap**             |
| Assistant: type and send                                                                                                     | type, Enter (stub provider) | keystrokes echoed; message and waiting state shown | conversation length                         | **gap**             |
| Assistant: approve or deny an action                                                                                         | click                       | the action's result drawn                          | the action                                  | **gap**             |
| Talk button / Shift+Mod+Space                                                                                                | hold                        | listening state shown                              | speech provider                             | **gap** (section 5) |
| Export dialog: change format, size, background, columns, scope                                                               | click                       | preview updated                                    | image size, R, N                            | **gap**             |
| Export CSV                                                                                                                   | click                       | download event                                     | N rows                                      | app-export-csv      |
| Export image, video, project, report                                                                                         | click                       | progress shown (first response); download event    | resolution, frames times N                  | **gap**             |
| Settings: theme, number format, single-key shortcuts, GPU acceleration, import file styles, usage data, timeline style, name | click                       | setting applied (chrome repaint or graph redraw)   | GPU toggle and file styles change the graph | **gap**             |
| Settings: shader quality, motion on/off                                                                                      | click                       | shaders redrawn / animation stopped                | shader count, N                             | **gap**             |
| Custom model, Add shader dialogs                                                                                             | click                       | dialog shown                                       | none                                        | **gap**             |
| Legend: scroll, resize, click an entry                                                                                       | wheel / click               | card scrolled                                      | sections                                    | **gap**             |
| Notices: Undo in a notice, recover autosaved work, privacy and survey cards, WebGPU chip                                     | click                       | step undone / work restored / card gone            | undo cost, restore size                     | **gap**             |

## 3. Condition matrix

### 3.1 Looks

- **plain**: no style layers; nodes and edges in the element's base look.
- **default**: graphty-element's default layers (Everything, Selected, Hovered, Pinned), which the app also uses.
- **heavy**: default layers plus labels on every node, arrowheads, curved edges, node and edge tooltips, node color
  bound to a numeric column, node size bound to degree, and one file style from
  `design/ui/studio/tool/files`. This is the most expensive look a reader can reasonably build; the runner's
  current "styled" mode is labels, arrowheads and the default layers only.

### 3.2 Why not the full cross product

Sizes (5) times paths (2) times looks (3) times dimensions (2) times pixel ratios (2) times layout states (2) is
240 element pages; at the measured 8 to 13 minutes a page (a 44-cell page at 5 repetitions took 10 to 13 minutes
at 1k and 7 to 30 minutes at 10k) that is more than 40 hours. The runner's own defaults today are 48 element
pages and 36 app pages, well over 10 hours. The suite instead holds one anchor condition and moves one or two
axes at a time from it, plus the corners where costs multiply (100k, batched, heavy, pixel ratio 2).

Anchor: 10k nodes, objects path (the default), default look, 3D, pixel ratio 1, layout settled, app panels closed.

Every page loads once and runs a fixed list of inputs; inputs that need special graphs (map, group outlines,
network source, time field) run on their own small pages. Repetitions: 3 in the full tier (the 95th percentile
is then the worst of 3 per page, kept honest by the nightly history), 3 in the quick tier.

### 3.3 Quick tier (every change to graphty-element or the app; about 30 minutes of GPU lock)

Core inputs only: hover-node, pointer-leaves-node, hover-edge, click-select-node, click-empty-deselect,
drag-node, drop-node, drag-orbit-3d (drag-pan in 2D), wheel-zoom, key-camera-turn-or-pan, touch-tap-select,
burst-drag-node-60hz, burst-orbit-60hz, and on the app page app-click-inspector, app-escape-deselect,
app-select-all, app-restyle-color, app-table-open, app-layer-visibility.

| page                            | N    | P       | look    | D   | R   | L       | est. minutes |
| ------------------------------- | ---- | ------- | ------- | --- | --- | ------- | ------------ |
| element                         | 10k  | objects | default | 3D  | 1   | settled | 6            |
| element                         | 10k  | batched | default | 3D  | 1   | settled | 6            |
| element                         | 100k | batched | default | 3D  | 1   | settled | 9            |
| app (gen-10k, default features) | 10k  | objects | default | 3D  | 1   | settled | 9            |
| total                           |      |         |         |     |     |         | about 30     |

### 3.4 Full tier (nightly, or on demand; about 2 hours 50 minutes of GPU lock)

All catalog inputs the runner can drive, on these pages:

| page  | purpose                                                                                                                      | N                           | P                              | look    | D   | R   | L       | est. minutes |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------ | ------- | --- | --- | ------- | ------------ |
| E1    | size sweep                                                                                                                   | 100                         | objects                        | default | 3D  | 1   | settled | 7            |
| E3    | anchor, then force layout running phase                                                                                      | 10k                         | objects                        | default | 3D  | 1   | both    | 12           |
| E4    | size sweep, default path at scale (quick-tier inputs only)                                                                   | 100k                        | objects                        | default | 3D  | 1   | settled | 8            |
| E5    | render path, then running phase                                                                                              | 10k                         | batched                        | default | 3D  | 1   | both    | 12           |
| E6    | render path at scale, then running phase                                                                                     | 100k                        | batched                        | default | 3D  | 1   | both    | 14           |
| E7    | size sweep                                                                                                                   | 50k                         | batched                        | default | 3D  | 1   | settled | 10           |
| E8    | 2D                                                                                                                           | 10k                         | objects                        | default | 2D  | 1   | settled | 9            |
| E9    | 2D at scale                                                                                                                  | 100k                        | batched                        | default | 2D  | 1   | settled | 12           |
| E10   | look: plain                                                                                                                  | 10k                         | objects                        | plain   | 3D  | 1   | settled | 8            |
| E11   | look: heavy                                                                                                                  | 10k                         | objects                        | heavy   | 3D  | 1   | settled | 10           |
| E12   | look: heavy at scale                                                                                                         | 100k                        | batched                        | heavy   | 3D  | 1   | settled | 14           |
| E14   | worst corner, and pixel ratio 2                                                                                              | 100k                        | batched                        | heavy   | 3D  | 2   | settled | 14           |
| E15   | special graphs (map, group outlines, stub network source, label cards), plus the 1k point for core pointer and camera inputs | 1k                          | objects                        | default | 3D  | 1   | settled | 6            |
| A1    | app anchor, with Style tab, table and timeline phases                                                                        | gen-10k                     | objects                        | default | 3D  | 1   | settled | 14           |
| A2    | app at scale                                                                                                                 | gen-100k                    | batched (if the app offers it) | default | 3D  | 1   | settled | 14           |
| A3    | app real file with file styles                                                                                               | lesmis, file-styles feature | objects                        | file    | 3D  | 1   | settled | 8            |
| A4    | app 2D                                                                                                                       | gen-10k                     | objects                        | default | 2D  | 1   | settled | 9            |
| total |                                                                                                                              |                             |                                |         |     |     |         | about 181    |

The estimates come from the runner's 1k and 10k pages on this machine (about 3 seconds per repetition of one
input, plus load). The suite must record each page's own wall time and print the total, so a run that drifts
past 3 hours shows which page grew. Each page holds the GPU lock from load to teardown, so page minutes are lock
minutes. If the run grows, the first cut is E10 (plain look), then A4 (app 2D). Pixel ratio 2 is covered only at
the worst corner (E14); a 10k pixel-ratio-2 page is the first addition if the budget frees up.

### 3.5 Tracking

- Each run appends one JSON line per cell (as today) and writes a summary keyed by input id and page condition:
  95th percentile drawn latency, state latency, settled time, burst lag and dropped frames, and the band.
- A committed baseline (the way `perf-baseline.json` serves `perf-matrix.mjs`) holds the last accepted summary.
  A cell regresses when its 95th percentile rises by more than 20 percent and more than one frame (16.7 ms), or
  when it crosses a band. The report lists regressions first, then every cell over 300 ms, then cells between
  150 and 300 ms.
- Nightly summaries are kept so a slow creep across many small changes is visible.

## 4. Gaps in the current runner

### 4.1 Conditions

1. No tiers: the defaults run 48 element pages and 36 app pages, more than 10 hours, so the suite cannot run on
   every change and does not fit a nightly 3-hour budget.
2. Smallest default size is 1k (200 exists but is not in the defaults); the matrix needs 100.
3. The "styled" look lacks curved edges, data-bound color and size, tooltips (added only for the tooltip rows)
   and file styles on the element page; there is no "heavy" look and no look that deletes the Hovered layer
   while keeping the rest.
4. Pixel ratio 2 runs only at 50k and 100k, never at the anchor size or with the heavy look.
5. Layout running covers three inputs (hover, click, drag), and two of them end on state only. Camera inputs,
   wheel, keys and touch are never timed while a layout runs. See 4.4 for how to read pixels while everything
   moves.
6. App panels: the Style tab open is the only panel condition. Table open, timeline open and the left panel on
   the Data place are not crossed with canvas inputs.
7. Node degree is not chosen: targets are whatever nodes are pickable, so a hub drag (the costliest drag) is not
   guaranteed.
8. Selection size is not varied: deselect and select-all cost depend on it and run only at the sizes the case
   happens to leave.

### 4.2 Inputs not timed

Every row marked **gap** in section 2 (139 inputs) and the 10 XR inputs in section 2.7. The most important for the 300 ms goal, because they
are common and their cost grows with graph size or look:

- hover sweep across many nodes and node-to-neighbor hover (batched pick lag build-up)
- shift- and ctrl-click on edges, right-click on edges and empty canvas, tap on empty canvas
- held camera keys (sustained frames and stop latency after keyup), roll keys, middle-drag, trackpad small-delta
  scroll, zoom-to-pointer, two-finger twist, touch node drag, pen
- canvas and panel resize, pixel ratio change
- undo and redo of steps other than a color change, and redo at all
- app canvas-menu items, F fit selection, toolbar zoom and camera presets
- every Style tab control except the color box, label add and color binding; layer reorder, duplicate, delete
- filters, timeline brush and play, table scroll and header menu
- other algorithms and layouts, Find Enter, quick actions typing
- settings that change the graph (GPU acceleration, file styles, shader quality, motion)

### 4.3 What is measured

1. Bursts (drag, orbit, pan, wheel, pinch) end on the tracked state (camera or node position) changing, not on
   pixels; they should end on the thumbnail differing, like the single-input rows.
2. Several app rows end on the DOM or state only (table row select, running-layout rows); where the result is on
   the canvas it should be read from pixels.
3. No baseline, no regression rule and no 150 ms band: `report` prints tables and counts cells over 300 ms but
   nothing compares a run with the last accepted one, and no history is kept.
4. Animation length is reported for the Focus selected glide, fit, dimension switch and layout apply only; saved
   cameras, camera presets, the minimap transition and tours are not.
5. Per-page wall time is not reported, so the GPU-lock budget cannot be checked from a run.

### 4.4 Reading pixels while a layout runs

Every pixel changes every frame while a force layout runs, so "the box at the target differs" proves nothing.
Instead, read the target node's current screen position through the public API on each frame and test the box
there for the look's own color (the Selected or Hovered layer's color, read from
`session.styles.explain`). A drag is visible when the node's box under the pointer shows the node's color.

## 5. Inputs a headless browser cannot drive

| input                                                                                                                                 | why not                                                                                                                                                                                   | nearest proxy                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All XR inputs (rays, triggers, pinches, thumbsticks, two-hand gestures, face buttons, wrist orb, in-headset cards) and entering VR/AR | headless Chromium has no WebXR device; the WebXR emulator only loads in graphty-element's vitest `xr` project, and it drives pose objects, not real input, and has no headset frame clock | Time the same handlers' desktop twins (hover, click, drag, orbit, wheel) on a stereo-sized canvas (two eyes side by side, 2 x 1832 x 1920 at pixel ratio 1) against the 72 to 120 Hz frame budget; keep XR correctness in the vitest `xr` project. For the Enter VR / AR button, time click to the button's pressed state only. |
| Push-to-talk, Talk button, assistant voice                                                                                            | needs a microphone and a speech provider                                                                                                                                                  | Chromium's `--use-fake-device-for-media-stream` with a stub provider: time to the listening state shown, which is the first visible response                                                                                                                                                                                    |
| Assistant replies and approvals over the network                                                                                      | a real model round trip is not input latency                                                                                                                                              | stub provider; time to the echoed message and waiting state                                                                                                                                                                                                                                                                     |
| Ctrl/Cmd+O, File..., Replace with file (native file chooser)                                                                          | the OS dialog is not drawn by the page                                                                                                                                                    | Playwright's `filechooser` event as "chooser shown"; `setFiles` then time to the first frame with nodes                                                                                                                                                                                                                         |
| Drop a file from the desktop                                                                                                          | no real drag from outside the page                                                                                                                                                        | `setInputFiles` on the page's file input; a synthetic `drop` would not be real input                                                                                                                                                                                                                                            |
| Browser zoom (Ctrl + / -), moving to another screen                                                                                   | headless has no browser zoom or second screen                                                                                                                                             | CDP `Emulation.setDeviceMetricsOverride` with a new deviceScaleFactor: same resize and pixel-ratio path                                                                                                                                                                                                                         |
| Real trackpad pinch and two-finger scroll                                                                                             | Playwright cannot send gesture events                                                                                                                                                     | Ctrl+wheel and small-delta wheel bursts, which is what the browser turns those gestures into                                                                                                                                                                                                                                    |
| Hardware key auto-repeat                                                                                                              | Playwright sends one keydown                                                                                                                                                              | CDP `Input.dispatchKeyEvent` with `autoRepeat: true` at 30 Hz                                                                                                                                                                                                                                                                   |
| Display scan-out                                                                                                                      | headless presents frames without a real display                                                                                                                                           | the frame after the draw is the last point measured; real screens add one or two refresh periods (about 17 to 33 ms at 60 Hz), so the suite's bars should be read with that margin                                                                                                                                              |
| Double-tap producing `dblclick` on touch                                                                                              | browser-dependent synthesis                                                                                                                                                               | mouse double-click for expand; touch double tap recorded as "not delivered" if no dblclick arrives                                                                                                                                                                                                                              |
| Model preview with a real 3D model download                                                                                           | network                                                                                                                                                                                   | serve the model from the bench page's own server                                                                                                                                                                                                                                                                                |

Pen, touch long-press and clipboard paste are drivable: CDP mouse events take `pointerType: "pen"`, CDP touch
events can hold a point, and the browser context can grant clipboard permission.
