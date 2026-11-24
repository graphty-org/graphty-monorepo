// TEMPORARY debug file, deleted after use.
import "../../src/graphty-element";

import { assert, it } from "vitest";

import type { Graphty } from "../../index.js";
import { type Edge, edgeInternals } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { registerTransition } from "../../extend";
import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";

const NODES = Array.from({ length: 60 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [
    ...NODES.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String(Math.floor(i / 15) * 15 + ((i + 1) % 15))}` })),
];

it("debug", async () => {
    registerTransition({
        descriptor: { id: "dbg/glide", plainName: "G" },
        move: (t, from, to) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t }),
    });
    const element: Graphty = document.createElement("graphty-element");
    element.renderPath = "batched";
    void element.session.styles.add({ name: "E", target: "edge", selector: { match: "everything" }, set: { "edge.color": "#5b6573", "edge.width": 1.2 } });
    void element.session.config.set({ layoutTransition: { transition: "dbg/glide", seconds: 2.6 } });
    void element.session.config.set({}).then(async () => {
        await element.session.config.set({ layoutTransition: { transition: "dbg/glide", seconds: 2.6, hold: 0.5 } });
    });
    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "circular";
    element.viewMode = "2d";
    element.style.display = "block";
    element.style.width = "800px";
    element.style.height = "600px";
    document.body.appendChild(element);
    await element.updateComplete;
    await element.waitForSettled();
    element.layout = "grid";
    await element.updateComplete;
    await element.waitForSettled();
    await element.waitForStableFrame();
    const dm = element.graph.getDataManager();
    const table = element.graph.getRowTable();
    const runner = transitionsOf(element.graph.getLayoutManager()) as unknown as { active: boolean; state: { rows: unknown[]; movers: Map<unknown, unknown>; start: number | null } | null };
    const out: string[] = [`built ${String(dataManagerInternals.nodesBuilt(dm))} active=${String(runner.active)} rows=${String(runner.state?.rows.length)} movers=${String(runner.state?.movers.size)} start=${String(runner.state?.start)}`];
    let i = 0;
    for (const edge of dm.edges.values() as Iterable<Edge>) {
        if (i++ > 3) break;
        const d = edgeInternals.drawn(edge);
        const ends = d.pulled !== null ? "pulled" : d.lineBatch === null ? "noBatch" : JSON.stringify(d.lineBatch.endsOf(d.lineSlots[0]));
        const s = edge.endRow("source");
        const lane = { x: 0, y: 0, z: 0 };
        table?.laneOf(s, lane);
        out.push(`${edge.srcId}: follows=${String(edge.followsRows)} row=${String(s)} center=${table?.centerOf(s).toString()} lane=${JSON.stringify(lane)} floats=${String(table?.rowPosition[s*4])},${String(table?.rowPosition[s*4+1])} ends=${ends}`);
    }
    console.log(`[dbg] ${out.join("\n[dbg] ")}`);
    element.remove();
    assert.isTrue(true);
});
