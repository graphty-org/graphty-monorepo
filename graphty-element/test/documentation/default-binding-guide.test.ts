/**
 * @file The example of "Letting the element choose the scale" in `docs/guide/styling.md`, kept
 * here so the documented code keeps working. It is the guide's code on a standalone session, with
 * its comments turned into assertions; the guide reaches the same session as `element.session`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("the styling guide's default binding example", () => {
    it("picks the scale and range from the level, and declares a level as one step", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", group: 1, score: 3.2 },
            { id: "b", group: 2, score: 8.9 },
            { id: "c", group: 1, score: 5.0 },
        ]);

        // A group code gets one color per group; a measurement gets a size range you can see.
        await session.styles.add({
            name: "Group and score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.group" }, "node.size": { by: "data.score" } },
        });
        const [color, size] = session.styles.legend();
        assert.strictEqual(color.kind, "categorical");
        assert.lengthOf(color.swatches, 2);
        assert.strictEqual(size.swatches[0].size, 0.5);
        assert.strictEqual(size.swatches[size.swatches.length - 1].size, 3);

        const binding = session.styles.defaultBinding("data.score", "node.color");
        assert.strictEqual(binding.level, "quantity");
        assert.strictEqual(binding.scale, "linear");

        await session.data.declare("data.score", { level: "category" }); // one undoable step
        assert.strictEqual(session.data.attributes().find((each) => each.path === "data.score")?.level, "category");
        assert.strictEqual(session.history.steps.at(-1)?.label, "Declared data.score a category");

        // past 8 groups, one "other" row lists the rest
        assert.lengthOf(session.styles.legend({ maxCategories: 8 })[0].swatches, 2);

        session.dispose();
    });
});
