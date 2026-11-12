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
