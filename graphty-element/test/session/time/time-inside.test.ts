/**
 * `time.inside`: what every filter keeps inside the window in force, by kind, while the visible
 * count (`visibility.summary`) stays whole, since the window narrows only the drawing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";

describe("time.inside", () => {
    it("counts what the window holds, null with no window, and leaves the summary whole", async () => {
        const session = createGraphSession({ features: ["timeline"] });
        const nodes = Array.from({ length: 4 }, (_, i) => ({ id: `n${String(i)}`, t: i }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
        await session.time.setField({ nodes: { start: "t", unit: "ms" } });
        assert.isNull(session.time.inside);

        await session.time.window({ from: 0, to: 2 });
        assert.deepEqual(session.time.inside, { nodes: 2, edges: 0 });
        assert.strictEqual(session.visibility.summary.visibleNodes, 4);

        await session.time.window({ from: 1, to: 4 });
        assert.deepEqual(session.time.inside, { nodes: 3, edges: 0 });

        await session.time.window(null);
        assert.isNull(session.time.inside);
        session.dispose();
    });
});
