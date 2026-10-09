/**
 * Every AI command that takes a selector reads the same language: the element's selector
 * expression, with a record's own fields under `data.`. findNodes and zoomToNodes used to read
 * bare fields while the style commands read `data.`, so a selector carried from one tool to the
 * next matched nothing.
 * @module test/ai/commands/selectors.test
 */

import { assert, beforeEach, describe, it } from "vitest";

import { BUILTIN_COMMANDS } from "../../../src/ai/commands/builtin";
import { zoomToNodes } from "../../../src/ai/commands/CameraCommands";
import { findNodes } from "../../../src/ai/commands/QueryCommands";
import { SELECTOR_SYNTAX } from "../../../src/ai/commands/selectors";
import type { CommandContext } from "../../../src/ai/commands/types";
import type { Graph } from "../../../src/Graph";
import { createMockContext, createTestGraph } from "../../helpers/test-graph";

describe("AI command selectors", () => {
    let graph: Graph;
    let context: CommandContext;

    beforeEach(() => {
        graph = createTestGraph({
            nodes: 6,
            edges: 3,
            nodeData: (i) => ({ type: i % 2 === 0 ? "server" : "database", age: i * 10 }),
        });
        context = createMockContext(graph);
    });

    it("findNodes and zoomToNodes match the same nodes for the same data. selector", async () => {
        const found = await findNodes.execute(graph, { selector: "data.type == 'server'" }, context);
        const zoomed = await zoomToNodes.execute(graph, { selector: "data.type == 'server'" }, context);

        assert.deepStrictEqual((found.data as { nodeIds: string[] }).nodeIds, ["node-0", "node-2", "node-4"]);
        assert.deepStrictEqual(zoomed.affectedNodes, ["node-0", "node-2", "node-4"]);
    });

    it("findNodes reads numbers and double quotes the way a style layer does", async () => {
        const older = await findNodes.execute(graph, { selector: "data.age > `30`" }, context);
        const quoted = await findNodes.execute(graph, { selector: 'data.type == "database"' }, context);

        assert.deepStrictEqual((older.data as { nodeIds: string[] }).nodeIds, ["node-4", "node-5"]);
        assert.deepStrictEqual((quoted.data as { nodeIds: string[] }).nodeIds, ["node-1", "node-3", "node-5"]);
    });

    it("a bare field matches nothing and the answer says to write data.", async () => {
        const found = await findNodes.execute(graph, { selector: "type == 'server'" }, context);
        const zoomed = await zoomToNodes.execute(graph, { selector: "type == 'server'" }, context);

        assert.strictEqual((found.data as { total: number }).total, 0);
        assert.include(found.message, "data.type");
        assert.include(zoomed.message, "data.type");
    });

    it("an expression that does not parse is a failure, not zero matches", async () => {
        const found = await findNodes.execute(graph, { selector: "data.type ==" }, context);
        const zoomed = await zoomToNodes.execute(graph, { selector: "data.type ==" }, context);

        assert.strictEqual(found.success, false);
        assert.strictEqual(zoomed.success, false);
    });

    it("every built-in command that takes a selector describes the same language", () => {
        const withSelector = BUILTIN_COMMANDS.filter((command) =>
            Object.keys((command.parameters as unknown as { shape: Record<string, unknown> }).shape).includes(
                "selector",
            ),
        );

        assert.deepStrictEqual(
            withSelector.map((command) => command.name),
            ["findNodes", "findAndStyleNodes", "findAndStyleEdges", "zoomToNodes"],
        );
        for (const command of withSelector) {
            const { selector } = (command.parameters as unknown as { shape: { selector: { description?: string } } })
                .shape;
            assert.include(selector.description, SELECTOR_SYNTAX, command.name);
        }
    });
});
