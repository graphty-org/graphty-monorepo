# Figma-like menus

Desktop design-tool panels placed in space around the graph (design section 9.4):

- **Toolbar**, below the graph: Show PageRank, Degree, Betweenness or Community (runs the result
  and colors by it), Sieve and Probe (hand the tool over through `ctx.tools`, or grayed with the
  reason, such as "Physical tools is off"), and Note (asks `ctx.text` for a line: the keyboard
  when text entry is on, canned chips when it is off). A status line under the buttons says what
  the last press did.
- **Layer list**, left of the graph: the selection, color by, size by, the filter, hidden nodes
  and the note count, each with an `x` that issues the command removing just that layer.
- **Inspector**, right of the graph: the selected node's value and rank for every result.
- **Context popover**, beside the selected node and following it: 1 hop, Hide, Note, Probe. It
  goes when the selection clears. A gear-panel setting switches it off.

The layer list and the inspector are slates: drag the title bar ("drag here") by ray or pinch to
move them; they move in their own plane, so a 20 cm sweep moves them 20 cm. The module claims no
input; every control is UI, and every change goes through `ctx.commands`, so undo names it.

Placement follows the head's yaw at session start and after every Recenter.

## What it reuses

| Piece                          | Reused                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every panel                    | Babylon 2D GUI on a mesh (`AdvancedDynamicTexture.CreateForMesh`), through the framework's `ctx.ui.panel`, as in playgrounds #24DLJ4#7 and #43YQHC#2 |
| Slate drag                     | Babylon core `PointerDragBehavior` -- the behavior `HolographicSlate` itself drags its content with                                                  |
| Buttons and text               | The framework panel's `button` and `text` (sized from the shared text scale)                                                                         |
| Tool hand-over, text, commands | The framework seams `ctx.tools`, `ctx.text`, `ctx.commands`                                                                                          |

`NearMenu`, `HolographicSlate` and `FollowBehavior` themselves are not used:

- they live in a `GUI3DManager` utility layer, and each manager makes its layer the scene's default,
  so a second technique using GUI 3D (node menus already does) steals ray picking from the first;
- the framework's targeting does not see utility-layer meshes as UI unless they carry its UI tag,
  so a press on a slate button would also reach the arbiter as a press on empty space and clear
  the selection;
- `NearMenu`, `HolographicSlate` and the MRTK buttons fetch icons and models from
  assets.babylonjs.com at run time, which the dry run forbids (no request leaves the page's origin);
- `HolographicSlate`'s title bar drags with `SixDofDragBehavior`, which treats a far ray as a near
  grab (`pickInfo.originMesh` is always set by XR pointer selection), so the slate twists with the
  wrist and swings on a long lever arm.

## Known gaps (fix or replace later)

- No drag-to-reorder and no show/hide eye in the layer list; a layer is only removed.
- "Show <result>" is two history steps (Run, then Color by); undo takes two presses. A compound
  command would make it one.
- The inspector shows values but edits none ("editable where a value is a setting" is not built).
- The toolbar is world-fixed, not lazily following like `NearMenu`; it does not move with the graph.
- No two-hand scale or rotate of a slate (the `SlateGizmo`), and no push or pull in depth.
- Recenter is noticed by watching a framework zone node move; a framework `onRecenter` hook should
  replace that.
- When a shared `GUI3DManager` (with mirrored assets and the UI tag) exists in the framework, the
  real `NearMenu` and `HolographicSlate` could replace these panels.
