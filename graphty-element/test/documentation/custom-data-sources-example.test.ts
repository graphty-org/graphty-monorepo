/**
 * @file The custom-data-sources guide's importer example is code that runs.
 *
 * `test/data/guide-example/trade-flows.ts` is the guide's "Wrapping a graph-io importer" block,
 * character for character, except that a reader's copy imports `@graphty/graphty-element/extend`
 * rather than the entry point's source file. Importing it registers the format; the tests below
 * load a file through it with the public session API.
 */

import "../data/guide-example/trade-flows";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../extend";
import { createGraphSession } from "../../session";

const PACKAGE = join(__dirname, "../..");
const GUIDE = join(PACKAGE, "docs/guide/extending/custom-data-sources.md");
const EXAMPLE = join(PACKAGE, "test/data/guide-example/trade-flows.ts");

describe("the custom-data-sources guide", () => {
    it("shows exactly the importer example that runs here", () => {
        const guide = readFileSync(GUIDE, "utf8");
        const section = guide.slice(guide.indexOf("## Wrapping a graph-io importer"));
        const block = /```ts\n([\s\S]*?)```/.exec(section)?.[1];
        const example = readFileSync(EXAMPLE, "utf8").replace('"../../../extend"', '"@graphty/graphty-element/extend"');

        assert.isDefined(block, "the guide has a code block under 'Wrapping a graph-io importer'");
        assert.strictEqual(block, example);
    });

    it("loads a trade-flows file with its weights and the direction it states", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "trade-flows", config: { data: "FR\tDE\t12.5\nDE\tPL\t3\n\tPL\t1\n" } });

        assert.deepEqual(
            session.data.edges().map((edge) => [edge.source, edge.target, edge.weight]),
            [
                ["FR", "DE", 12.5],
                ["DE", "PL", 3],
            ],
        );
        assert.strictEqual(session.data.nodes().length, 3);
        assert.deepEqual(session.data.statistics().directednessSource, {
            by: "file",
            statedBy: "a trade-flows file (shipments go one way)",
        });
        session.dispose();
    });

    it("loads a trade-flows file, which a reader hands over as bytes", async () => {
        const session = createGraphSession();
        const file = new File(["FR\tDE\t12.5\n"], "march.trade");
        await session.data.import({ type: "trade-flows", config: { file } });

        assert.deepEqual(
            session.data.edges().map((edge) => [edge.source, edge.target, edge.weight]),
            [["FR", "DE", 12.5]],
        );
        session.dispose();
    });

    it("refuses a file with no shipment in it as a parse failure", async () => {
        const session = createGraphSession();
        try {
            await session.data.import({ type: "trade-flows", config: { data: "\n" } });
            assert.fail("expected the load to be refused");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_PARSE_FAILED", String(error));
        } finally {
            session.dispose();
        }
    });
});
