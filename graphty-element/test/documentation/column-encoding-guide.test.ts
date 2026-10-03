/**
 * @file The canonical example of `docs/guide/column-encoding.md`, kept working.
 *
 * The guide reaches the session as `document.querySelector("graphty-element")!.session`; this test
 * builds the same session headlessly with a department column, checks the guide's code block is
 * the code below, and runs that code with its outcomes asserted.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

const GUIDE = join(__dirname, "../../docs/guide/column-encoding.md");

/** The guide's example after its two setup lines, which this test replaces with a headless session. */
const BODY = `const department = session.data.attributes().find((a) => a.kind === "node" && a.name === "department")!;

// Department codes 1..14 are groups, not amounts. Numbers are drawn as a ramp unless you say so.
await session.data.declare(department, { measurement: "categorical" });
await session.styles.encode({ column: department, channel: "node.color" });

for (const block of session.styles.legend()) {
    for (const swatch of block.swatches) console.log(swatch.value, swatch.color, swatch.role);
}
`;

describe("the column encoding guide", () => {
    it("shows the code this test runs", () => {
        const block = /```ts\n([\s\S]*?)```/.exec(readFileSync(GUIDE, "utf8"))?.[1] ?? "";
        assert.isTrue(block.startsWith('import "@graphty/graphty-element";\n'));
        assert.isTrue(block.endsWith(BODY), "the guide's example body matches this test");
    });

    it("draws department codes one color per department", async () => {
        const session = createGraphSession();
        await session.data.addNodes(
            Array.from({ length: 28 }, (_, index) => ({ id: index, department: (index % 14) + 1 })),
        );

        const department = session.data.attributes().find((a) => a.kind === "node" && a.name === "department");
        assert.strictEqual(department?.measurement, "quantitative");
        if (department === undefined) {
            return;
        }

        await session.data.declare(department, { measurement: "categorical" });
        await session.styles.encode({ column: department, channel: "node.color" });

        const [block] = session.styles.legend();
        assert.strictEqual(block.kind, "categorical");
        // Fourteen departments past an eight-color palette: eight colors, and the rest in "other".
        assert.lengthOf(block.swatches, 9);
        assert.strictEqual(block.swatches.at(-1)?.role, "other");
        assert.strictEqual(block.swatches.at(-1)?.count, 12);
        session.dispose();
    });
});
