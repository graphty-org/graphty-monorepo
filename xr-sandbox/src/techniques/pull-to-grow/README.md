# Pull to grow

Pinch a node (or pull the trigger on it) and pull your hand away. Past a 6 cm dead zone the graph
previews the node's neighborhood, one hop per 8 cm, and the rest of the graph dims. A readout beside
the hand says "1 hop: 6", then "2 hops: +5" (what the step adds). Release to select the
neighborhood; pull back inside the dead zone ("Release to cancel") and release to do nothing.

Every hop change clicks, and on controllers it also pulses the controller.

## Settings (gear panel)

| Setting                     | Default | What it does                                                           |
| --------------------------- | ------- | ---------------------------------------------------------------------- |
| Dead zone (cm)              | 6       | A pull shorter than this is zero hops; release cancels                 |
| Per hop (cm)                | 8       | Pull distance per hop past the dead zone                               |
| Hysteresis band (cm)        | 2       | Band centered on each boundary: 14 cm is crossed out at 15, back at 13 |
| Filter min cutoff (Hz)      | 1.5     | One Euro filter on the pull distance; lower is steadier but lags more  |
| Filter beta                 | 5       | One Euro filter speed term; higher follows a fast pull with less lag   |
| Click per hop               | on      | A short synthesized click per hop change                               |
| Pulse per hop (controllers) | on      | A 20 ms haptic pulse per hop change                                    |

## What it reuses

- **`breadthFirstSearch` from `@graphty/algorithms`**, run once when the press is won, for the
  count at each hop. The selection itself comes from the framework's `neighbors` command, which
  runs the same search.
- **`1eurofilter`** (Casiez and Goguey, BSD-3-Clause), the reference One Euro filter, on the pull
  distance.
- **The framework's preview** (`ctx.commands.preview`), so the dimming is the same as every other
  preview and undo or switching the technique off cancels it.
- **The framework's chip**, its click and its hand anchors for the readout.

Only the distance-to-hops mapping (`hops.ts`) and the readout's text are written here.

## Known gaps, to fix or replace later

- The pull counts distance in any direction. Pulling away from the node only (projecting the hand
  movement on the node-to-hand direction) is a later choice.
- No cap on hops on the dense graph beyond the deepest level the search reaches (at most 8), so a
  long pull there can preview a large part of the graph.
- The arena decides on unfiltered movement (the framework's `movedM`), not the filtered distance
  the design asks for; the technique filters only after it has won.
- If the hand holds still for 300 ms before moving, the node menu wins. The arena log
  (`arbiter.win` with its losers) shows how often that happens against the owner's intent.
- The click and pulse have their own switches here; the framework's audio clicks switch does not
  reach them, because a technique cannot read framework settings.
- The readout sits on the hand's grip anchor, so it turns with the wrist; on a hand it may sit
  partly behind the fingers. Only a headset can show whether it reads well.
