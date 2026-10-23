/**
 * @file The canonical example of `docs/guide/readable-values.md`, kept working.
 *
 * The guide reaches the session as `document.querySelector("graphty-element")!.session`; this test
 * builds the same session headlessly, checks the guide's code block is the code below, and runs
 * that code with the outcomes the guide prints asserted.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

const GUIDE = join(__dirname, "../../docs/guide/readable-values.md");

/** The guide's example after its setup line, which this test replaces with a headless session. */
const BODY = `await session.data.addNodes([
    { id: "a", age: 30, team: "red" },
    { id: "b", age: 45, team: "blue" },
    { id: "c", age: 52 },
    { id: "d", age: 61, team: "red" },
]);

for (const value of session.data.readableValues()) {
    console.log(value.path, value.kind, value.range ?? value.valueCount, value.completeness);
}
`;

describe("the readable values guide", () => {
    it("shows the code this test runs", () => {
        const block = /```ts\n([\s\S]*?)```/.exec(readFileSync(GUIDE, "utf8"))?.[1] ?? "";
        assert.isTrue(block.startsWith('import "@graphty/graphty-element";\n'));
        assert.isTrue(block.endsWith(BODY), "the guide's example body matches this test");
    });

    it("lists what the guide says it lists, and what reads each value", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", age: 30, team: "red" },
            { id: "b", age: 45, team: "blue" },
            { id: "c", age: 52 },
            { id: "d", age: 61, team: "red" },
        ]);
        const lines = session.data
            .readableValues()
            .map((v) => [v.path, v.kind, v.range ?? v.valueCount, v.completeness]);
        assert.deepStrictEqual(lines, [
            ["id", "text", undefined, 1],
            ["data.id", "text", undefined, 1],
            ["data.age", "number", { min: 30, max: 61 }, 1],
            ["data.team", "category", 2, 0.75],
        ]);

        const layer = await session.styles.add({
            name: "By age",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.age" } },
        });
        const age = session.data.readableValues().find((v) => v.path === "data.age");
        assert.deepStrictEqual(age?.usedBy, [{ kind: "layer", id: layer.id }]);
        assert.include(age?.fits ?? [], "number");
        session.dispose();
    });
});
