# Reading stored positions

Many graph files store where each node was drawn: Gephi's GEXF, a yEd diagram, Graphviz output, a
Pajek network, a Cytoscape session. Each format writes those coordinates its own way. Some grow y
downward, as a screen does, and some upward. yEd stores a box's top-left corner rather than the
node's center. Pajek pads a flat drawing with a z of 0.5.

`extractPositions()` from `@graphty/graph-io/positions` reads any format's coordinates into one
form: each node's center, y growing upward, in the file's own unit. Pass it the importer that read
the file, the snapshot and the report:

<!-- generated:begin example:positions/read -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph, registry } from "@graphty/graph-io";
import { extractPositions } from "@graphty/graph-io/positions";

const { snapshot, report } = await importGraph(await readFile("proteins.xgmml", "utf8"));

// Pass the importer that read the file: it knows how its format spells a coordinate
const positions = extractPositions(registry.importer(report.format), snapshot, report);

if (positions?.usable !== true) {
    console.log("the file stores no usable positions");
} else {
    console.log(`${positions.placed} of ${positions.total} nodes placed, in ${positions.units} units`);
    // Each node's center, y up: Cytoscape wrote node 1 at x="10" y="20", y growing downward
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const [x, y, z] = positions.coords.subarray(3 * i, 3 * i + 3);
        console.log(`${String(snapshot.ids.idOf(i))}: ${x}, ${y}, ${z}`);
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:positions/read -->

```text
3 of 3 nodes placed, in file units
1: 10, -20, 0
2: 30, -40, 0
3: 50, 0, 0
```

<!-- generated:end -->

Cytoscape wrote this file with y growing downward, so node 1's stored `y="20"` is `-20` here. The
snapshot is left as the importer read it; the conversion runs when you call `extractPositions()`.

## What it returns

`extractPositions()` returns `null` when the file stores no positions. Otherwise it returns a
`FilePositions`:

- `coords`: x, y and z per node, by node index (`3 * snapshot.nodeCount` numbers). A node with no
  position has `NaN` in all three.
- `usable`: `false` when nothing is stored, or when every node sits on one point. The coordinates
  are then all `NaN`.
- `placed` and `total`: how many nodes have a position, and how many need one. Group containers the
  file gives no box are not counted in `total`.
- `units`: `"px"` when the format's coordinates are pixels or points, `"file"` when they are in
  whatever unit the file chose.
- `dims`: `3` when the nodes differ in z, else `2` (z is then 0).
- `source`: the format, the program that wrote the file when it can tell (`tool`), and which way
  that file's y grew (`yAxis`).
- `medianNodeSize`: the median node diameter, in `units`, when the file stores node sizes.
- `bounds`: the box around every placed node.
- `groups`: a box for each group container the file draws one for (a Graphviz cluster's `bb`, a
  yEd group node).
- `notes`: what could not be read as written, as `{ code, params, elements }`.

## How each format is read

| Format                            | Unit                                                                    | Which way y grows in the file                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GEXF                              | the file's own                                                          | up                                                                                                                                                    |
| GraphML from yEd                  | pixels                                                                  | down; the box's top-left corner is moved to its center                                                                                                |
| GML                               | pixels                                                                  | down, as the GML specification says, unless `Creator` names Gephi or Tulip                                                                            |
| Pajek                             | the file's own                                                          | down; z is centered on 0.5, and a z of 0.5 on every vertex is a flat drawing                                                                          |
| DOT                               | points when the root graph has `bb` (Graphviz output), inches otherwise | up                                                                                                                                                    |
| XGMML, CX, CX2, Cytoscape session | the file's own (Cytoscape writes pixels)                                | already stored y up by the importer                                                                                                                   |
| JSON                              | the file's own                                                          | Cytoscape.js `elements`: already stored y up. Plain `x` / `y`: up, unless d3-force or vis.js keys mark them as screen coordinates and there is no `z` |

When the file's y grows downward and it stores a real z, z is turned with y, so a 3D drawing is
rotated half a turn, never mirrored. In a Pajek file that NetworkX wrote, two or more nodes at
exactly (0, 0) count as unplaced when other nodes have positions, because NetworkX writes (0, 0)
for a node it has no position for.

## Notes

| Code                        | Meaning                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `W_POSITION_STACKED`        | Every placed node is on one point; the coordinates are dropped and `usable` is false. |
| `W_POSITION_PARTIAL`        | Some nodes have no position.                                                          |
| `W_POSITION_NON_FINITE`     | Some coordinates are not finite numbers; those nodes count as unplaced.               |
| `W_POSITION_DIMS_MIXED`     | The file mixes 2- and 3-coordinate positions.                                         |
| `W_POSITION_ANCHOR_NO_SIZE` | A top-left coordinate has no width or height, so it was not moved to the center.      |
| `W_POSITION_OTHER_VIEWS`    | The file holds more than one view (layout); only the first is used.                   |
| `W_POSITIONS_NOT_READ`      | The file has position-like columns this format does not read (plain `x` / `y`).       |

`POSITION_ISSUE` names them: `POSITION_ISSUE.PARTIAL` is `"W_POSITION_PARTIAL"`.

## Writing positions back

`toFilePositions(coords, extra, sizes?)` is the inverse: it turns neutral coordinates back into a
format's spelling (`extra` is the position column's `meta.extra`), undoing the y flip, Pajek's z
origin and yEd's top-left corner.

## A format plugin with positions

An importer tells `extractPositions()` how its coordinates are spelled in one of two ways:

- the role-`position` column's `meta.extra` (`yAxis`, `units`, `anchor`, `sourceDims`,
  `zOrigin`), or
- an optional `positions(snapshot)` method that names the columns:
  `{ x: "x", y: "y", yAxis: "down", units: "px" }`.

With neither, a role-`position` column is read as center, y up, in the file's own unit. See
[Writing a format plugin](./extending/new-format.md).
