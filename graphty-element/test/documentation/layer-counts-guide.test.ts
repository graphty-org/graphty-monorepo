/**
 * @file The canonical example of `docs/guide/layer-counts.md`, kept working.
 *
 * The guide reaches the session as `document.querySelector("graphty-element")!.session`; this test
 * builds the same session headlessly, checks the guide's code block is the code below, and runs
 * that code with its outcomes asserted.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

const GUIDE = join(__dirname, "../../docs/guide/layer-counts.md");

/** The guide's example after its setup line, which this test replaces with a headless session. */
const BODY = `await session.data.addNodes([{ id: "a", score: 2 }, { id: "b", score: 8 }, { id: "c", score: 0 }, { id: "d" }]);

// Color every node by its score, on a logarithmic scale.
const layer = await session.styles.add({
    name: "By score",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.score", scale: "log", palette: "viridis" } },
});

const counts = session.styles.counts(layer.id);
console.log(\`Colors \${String(counts.painted["node.color"])} of \${String(counts.matched)} nodes\`);
console.log(counts.noValue, "have no score;", counts.outsideScale, "cannot be placed on a log scale");
`;

describe("the layer counts guide", () => {
    it("shows the code this test runs", () => {
        const block = /```ts\n([\s\S]*?)```/.exec(readFileSync(GUIDE, "utf8"))?.[1] ?? "";
        assert.isTrue(block.startsWith('import "@graphty/graphty-element";\n'));
        assert.isTrue(block.endsWith(BODY), "the guide's example body matches this test");
    });

    it("prints the numbers the guide says it prints", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", score: 2 }, { id: "b", score: 8 }, { id: "c", score: 0 }, { id: "d" }]);
        const layer = await session.styles.add({
            name: "By score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score", scale: "log", palette: "viridis" } },
        });

        const counts = session.styles.counts(layer.id);
        assert.strictEqual(counts.painted["node.color"], 2);
        assert.strictEqual(counts.matched, 4);
        assert.strictEqual(counts.noValue, 1);
        assert.strictEqual(counts.outsideScale, 1);
        session.dispose();
    });
});
