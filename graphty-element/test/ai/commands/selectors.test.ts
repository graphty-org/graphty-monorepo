/**
 * Every AI command that takes a selector reads the same language: the element's selector
 * expression, with a record's own fields under `data.`. findNodes and zoomToNodes used to read
 * bare fields while the style commands read `data.`, so a selector carried from one tool to the
 * next matched nothing.
 * @module test/ai/commands/selectors.test
 */

import { assert, beforeEach, describe, it } from "vitest";

import {
    clearStyles,
    describeProperty,
    findAndStyleEdges,
    findAndStyleNodes,
    listAlgorithms,
    queryGraph,
    runAlgorithm,
    sampleData,
    setCameraPosition,
    setDimension,
    setImmersiveMode,
    setLayout,
} from "../../../src/ai/commands";
import { zoomToNodes } from "../../../src/ai/commands/CameraCommands";
import { findNodes, getSchema } from "../../../src/ai/commands/QueryCommands";
import { CONNECTED_BY_SYNTAX, nodeScopeOf, SELECTOR_SYNTAX } from "../../../src/ai/commands/selectors";
import type { CommandContext, GraphCommand } from "../../../src/ai/commands/types";
import type { Graph } from "../../../src/Graph";
import { createMockContext, createTestGraph } from "../../helpers/test-graph";
import { makeSession } from "../../session/helpers";

/** The deprecated hand-written commands, in the order the assistant used to offer them. */
const LEGACY_COMMANDS: readonly GraphCommand[] = [
    queryGraph,
    findNodes,
    getSchema,
    sampleData,
    describeProperty,
    listAlgorithms,
    runAlgorithm,
    setLayout,
    setDimension,
    setImmersiveMode,
    findAndStyleNodes,
    findAndStyleEdges,
    clearStyles,
    setCameraPosition,
    zoomToNodes,
];

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

    it("connectedBy picks the nodes at an end of a matching edge, and the selector narrows them", async () => {
        // The mock's edges run node-i to node-(i+1) with weight i / 10: only edge-2 is above 0.15.
        const ends = await findNodes.execute(graph, { selector: "", connectedBy: "data.weight > `0.15`" }, context);
        const servers = await findNodes.execute(
            graph,
            { selector: "data.type == 'server'", connectedBy: "data.weight > `0.15`" },
            context,
        );
        const zoomed = await zoomToNodes.execute(graph, { connectedBy: "data.weight > `0.15`" }, context);
        const none = await findNodes.execute(graph, { selector: "", connectedBy: "data.weight > `5`" }, context);

        assert.deepStrictEqual((ends.data as { nodeIds: string[] }).nodeIds, ["node-2", "node-3"]);
        assert.deepStrictEqual((servers.data as { nodeIds: string[] }).nodeIds, ["node-2"]);
        assert.deepStrictEqual(zoomed.affectedNodes, ["node-2", "node-3"]);
        assert.include(none.message, "No nodes matched");
    });

    it("a real session resolves the connectedBy scope to the same nodes", async () => {
        const h = makeSession();
        h.add(
            [
                { id: "a", type: "server" },
                { id: "b", type: "database" },
                { id: "c", type: "server" },
            ],
            [
                { src: "a", dst: "b", weight: 0.9 },
                { src: "b", dst: "c", weight: 0.1 },
            ],
        );

        const ends = await h.session.scope.resolve(nodeScopeOf("", "data.weight > `0.5`"));
        const servers = await h.session.scope.resolve(nodeScopeOf("data.type == 'server'", "data.weight > `0.5`"));

        assert.deepStrictEqual([...ends.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...servers.nodes], ["a"]);
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
        const withSelector = LEGACY_COMMANDS.filter((command) =>
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

        const withConnectedBy = LEGACY_COMMANDS.filter((command) =>
            Object.keys((command.parameters as unknown as { shape: Record<string, unknown> }).shape).includes(
                "connectedBy",
            ),
        );
        assert.deepStrictEqual(
            withConnectedBy.map((command) => command.name),
            ["findNodes", "findAndStyleNodes", "zoomToNodes"],
        );
        for (const command of withConnectedBy) {
            const { connectedBy } = (
                command.parameters as unknown as { shape: { connectedBy: { description?: string } } }
            ).shape;
            assert.strictEqual(connectedBy.description, CONNECTED_BY_SYNTAX, command.name);
        }
    });
});
