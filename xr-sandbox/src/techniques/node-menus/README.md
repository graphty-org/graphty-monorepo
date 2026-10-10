# Node menus

Point at a node and hold still for 300 ms (a pinch or a trigger), or press B or Y on a controller,
and a menu of that node's verbs opens: Select, Neighbors, Probe, Note, Hide. Do the same on empty
space and the menu offers graph verbs instead: Show PageRank, Keep top half (or Remove filter),
Clear selection, Note. A quick tap still just selects the node.

The gear panel switches between two styles (setting `style`, or `s.node-menus.style=ring` in the
URL):

- **list** (the default, and the `baseline` preset's): a column of buttons beside the node, chosen
  by ray like any other panel, with a Close button at the bottom.
- **ring**: the items open in a ring at the hand and stay where they opened. Turn the wrist (or the
  controller) toward an item to light it, then release the pinch or the button to run it. A turn
  smaller than the dead zone (setting `deadZoneDeg`, 12 degrees by default) lights nothing, and
  releasing there cancels.

Note asks for its text through the framework's `ctx.text`: the text entry technique's keyboard when
that technique is on, a row of canned chips ("check", "interesting", "?") when it is off.

## What it is built on

| Part | Reused                                                                    | Notes                                                                                                                                                                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| List | Babylon GUI 3D `CylinderPanel` of `HolographicButton`s (`@babylonjs/gui`) | One column, buttons 4.5 cm square, placed beside the node. Two workarounds: each button gets our own larger `TextBlock` label (the stock `text` is 24 px of 512, unreadable at arm's length, and rebuilds the texture on every change), and a list is hidden by disabling the panel's node (`isVisible` does nothing on a container) |
| Ring | Open Brush `PinCushion.cs` (Apache-2.0), as reference only                | Written fresh (`ring.ts`, `verbs.ts`): the hand's rotation since opening is applied to a point ahead of the hand and projected onto the ring's plane; the angle picks the item, a dead zone picks none, as PinCushion does                                                                                                           |
| Text | The framework's `ctx.text` seam                                           | Canned chips when text entry is off                                                                                                                                                                                                                                                                                                  |

## What we would fix or replace later

- **One shared GUI 3D manager.** Each `GUI3DManager` makes its own utility layer Babylon's default
  one, and Babylon's XR pointer selection only sees the default. If a second technique builds its
  own manager, these buttons stop counting as UI for the framework, so a press on one would also
  reach the graph. The framework should own one manager and hand it out.
- **Ring steering is unfiltered.** It reads the grip pose directly. Real hand-tracking noise may
  need a One Euro filter (already a dependency), and the 6 degree hysteresis at sector edges is a
  first guess. On Galaxy XR hands steer by wrist turn only, which may be tiring.
- **Dismissal is a first guess.** The list closes on Close, when another menu opens, or when the
  head turns more than 70 degrees away; the ring cancels in its dead zone.
- **The list does not follow the node** if the graph is moved while it is open.
- **One level only.** pangmenu's child rings on a bounded arc (design only; it has no license) are
  not built. The `touch` style (a direct-touch panel beside the node) and Kando-style expert strokes
  without waiting for the ring are deferred.
- **HolographicButtons are square**, so long labels wrap; a wider MRTK 3 button may read better.
