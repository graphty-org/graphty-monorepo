/**
 * @file Replacing a load on the rendered element: the newer copy's edges are drawn, the style
 * layer and the run stay, and one undo brings the earlier data and its results back.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";

const SEPTEMBER = "from,to,volume\nA,B,10\nB,C,20\nC,D,30\n";
/** Same headers, another order: A-B changed, C-D gone, D-A new. */
const OCTOBER = "volume,to,from\n15,B,A\n20,C,B\n5,A,D\n";

let mounted: Graphty | null = null;

/**
 * Mount an empty element and wait for it to settle.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    await element.graph.setLayout("random");
    return element;
}

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.waitForSettled();
}

/**
 * Wait until the element draws a number of edges.
 * @param element - The element.
 * @param edges - How many.
 */
async function drawsEdges(element: Graphty, edges: number): Promise<void> {
    await vi.waitFor(() => {
        assert.strictEqual(element.graph.getDataManager().edges.size, edges);
    });
}

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

describe("replacing a load on the element", () => {
    test("the copy is drawn, the layer and the run stay, and one undo brings September back", async () => {
        const element = await mount();
        const { session } = element;
        const file = (text: string, name: string): { config: { file: File } } => ({
            config: { file: new File([text], name) },
        });
        // Suppliers first, as the supply chain flow loads them: the shipments name only them.
        await (await session.data.prepare(file("id,name\nA,a\nB,b\nC,c\nD,d\n", "suppliers.csv"))).load();
        await (await session.data.prepare(file(SEPTEMBER, "ships-09.csv"))).load({ mode: "merge" });
        const layer = await session.styles.add({
            name: "Busy",
            target: "edge",
            selector: { match: "expression", where: "data.volume > `12`" },
            set: { "edge.color": "#ff0000" },
        });
        const run = session.runs.start("degree", undefined, { as: "degree", style: false });
        await run;

        await settled(element);
        await drawsEdges(element, 3);
        const key = await session.data.matchesSource(file(OCTOBER, "ships-10.csv"));
        assert.strictEqual(key, "s2");
        const report = await session.data.replaceSource("s2", file(OCTOBER, "ships-10.csv"));
        await settled(element);

        assert.deepStrictEqual(report.edges, { added: 1, removed: 1, changed: 1 });
        assert.strictEqual(session.data.edges().length, 3);
        assert.strictEqual(element.graph.getDataManager().edges.size, 3);
        assert.isDefined(session.styles.get(layer.id));
        assert.isDefined(session.runs.get(run.id));
        assert.strictEqual(session.data.sources()[1].name, "ships-10.csv");

        await session.undo();
        await settled(element);
        assert.strictEqual(element.graph.getDataManager().edges.size, 3);
        assert.isDefined(
            session.data.edges().find((each) => each.source === "C" && each.target === "D"),
            "September's C-D edge is back",
        );
        assert.strictEqual(session.data.sources()[1].name, "ships-09.csv");
        assert.isDefined(session.runs.get(run.id));
    });
});
