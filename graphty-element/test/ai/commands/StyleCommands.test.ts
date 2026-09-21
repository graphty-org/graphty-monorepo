/**
 * StyleCommands Tests - Tests for style-related commands.
 *
 * WHAT A STYLE COMMAND PRODUCES is one layer on `session.styles`, and these tests read it back
 * off the stack. They used to read `result.affectedNodes` instead, a count the command got by
 * running `jmespath.search()` once per element to guess at how many it had matched. Nothing
 * counts elements now: a layer is added, the stack repaints whatever it matches, and a selector
 * the element refuses comes back as a refusal rather than as a match count of zero -- which is
 * the number a correct answer of "none of them" also has.
 * @module test/ai/commands/StyleCommands.test
 */

import { assert, beforeEach, describe, it } from "vitest";

import { clearStyles, findAndStyleEdges, findAndStyleNodes } from "../../../src/ai/commands/StyleCommands";
import type { CommandContext } from "../../../src/ai/commands/types";
import type { Graph } from "../../../src/Graph";
import type { Layer } from "../../../src/session/styles";
import { createMockContext, createTestGraph } from "../../helpers/test-graph";

describe("StyleCommands", () => {
    let graph: Graph;
    let context: CommandContext;

    beforeEach(() => {
        graph = createTestGraph();
        context = createMockContext(graph);
    });

    /**
     * The layer a command named, read back off the session's stack.
     * @param name - The layer name the command was given.
     * @returns The layer, or undefined when nothing by that name was added.
     */
    function layerNamed(name: string): Layer | undefined {
        return graph.getSession().styles.list().find((layer) => layer.name === name);
    }

    describe("findAndStyleNodes", () => {
        it("styles all nodes with empty selector", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#ff0000" },
                    layerName: "test",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.ok(result.message.toLowerCase().includes("node"));
        });

        it("styles nodes matching selector", async () => {
            // The mock graph has nodes with type 'server', 'client', 'router'
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "data.type == 'server'",
                    style: { color: "#0000ff", size: 2 },
                    layerName: "servers",
                },
                context,
            );

            assert.strictEqual(result.success, true);

            const layer = layerNamed("servers");
            assert.isDefined(layer, "the command's whole output is one layer on the session's stack");
            assert.deepStrictEqual(layer.selector, { match: "expression", where: "data.type == 'server'" });
            assert.strictEqual(layer.target, "node");
            assert.deepStrictEqual(layer.set, { "node.color": "#0000ff", "node.size": 2 });
        });

        it("applies size styling", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { size: 2.5 },
                    layerName: "large-nodes",
                },
                context,
            );

            assert.strictEqual(result.success, true);
        });

        it("applies shape styling", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { shape: "box" },
                    layerName: "boxed-nodes",
                },
                context,
            );

            assert.strictEqual(result.success, true);
        });

        it("refuses a selector the element cannot parse, and says so", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "not_a_valid_jmespath[[",
                    style: { color: "#ff0000" },
                    layerName: "invalid",
                },
                context,
            );

            // The refusal is the point. The previous implementation turned an unparseable
            // selector into an empty match array, which reached the reader as "no nodes matched"
            // -- the same words a correct answer of zero uses.
            assert.strictEqual(result.success, false);
            assert.isUndefined(layerNamed("invalid"), "and nothing was committed to the stack");
        });

        it("refuses a bare number, because a selector literal goes between backticks", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "data.size > 5",
                    style: { color: "#ff0000" },
                    layerName: "bare-number",
                },
                context,
            );

            assert.strictEqual(result.success, false);
            assert.include(result.message, "backticks", "the message says how to write it instead");
        });

        it("adds the layer when the selector is valid but nothing in the graph answers it", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "data.nonexistent == 'value'",
                    style: { color: "#ff0000" },
                    layerName: "no-match",
                },
                context,
            );

            // A correct selector over a path this graph does not carry is a layer that will
            // paint when the data arrives, not an error -- so it goes in, and the caller is told
            // that nothing answers it yet.
            assert.strictEqual(result.success, true);
            assert.isDefined(layerNamed("no-match"));
            assert.include(result.message, "data.nonexistent");
        });
    });

    describe("findAndStyleEdges", () => {
        it("styles all edges with empty selector", async () => {
            const result = await findAndStyleEdges.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#00ff00", width: 2 },
                    layerName: "test-edges",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.ok(result.message.toLowerCase().includes("edge"));
        });

        it("styles edges with selector", async () => {
            const result = await findAndStyleEdges.execute(
                graph,
                {
                    selector: "data.weight > `0.5`",
                    style: { color: "#ffff00" },
                    layerName: "heavy-edges",
                },
                context,
            );

            assert.strictEqual(result.success, true);

            const layer = layerNamed("heavy-edges");
            assert.isDefined(layer);
            assert.strictEqual(layer.target, "edge");
            assert.deepStrictEqual(layer.selector, { match: "expression", where: "data.weight > `0.5`" });
        });

        it("applies line width styling", async () => {
            const result = await findAndStyleEdges.execute(
                graph,
                {
                    selector: "",
                    style: { width: 3 },
                    layerName: "thick-edges",
                },
                context,
            );

            assert.strictEqual(result.success, true);
        });

        it("applies line type styling", async () => {
            const result = await findAndStyleEdges.execute(
                graph,
                {
                    selector: "",
                    style: { lineType: "dash" },
                    layerName: "dashed-edges",
                },
                context,
            );

            assert.strictEqual(result.success, true);
        });
    });

    describe("clearStyles", () => {
        it("clears styles from a named layer", async () => {
            // First add a style layer
            await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#ff0000" },
                    layerName: "to-clear",
                },
                context,
            );

            // Then clear it
            const result = await clearStyles.execute(
                graph,
                {
                    layerName: "to-clear",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.ok(result.message.toLowerCase().includes("clear"));
            assert.isUndefined(layerNamed("to-clear"), "and the layer really left the stack");
        });

        it("clears all dynamic styles when no layerName provided", async () => {
            // Add multiple style layers
            await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#ff0000" },
                    layerName: "layer1",
                },
                context,
            );
            await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#00ff00" },
                    layerName: "layer2",
                },
                context,
            );

            // Clear all
            const result = await clearStyles.execute(graph, {}, context);

            assert.strictEqual(result.success, true);
            // Swept by SOURCE rather than by a list the module keeps, so both go whatever order
            // they were added in and whatever else is on the stack.
            assert.isUndefined(layerNamed("layer1"));
            assert.isUndefined(layerNamed("layer2"));
        });

        it("handles clearing non-existent layer gracefully", async () => {
            const result = await clearStyles.execute(
                graph,
                {
                    layerName: "nonexistent-layer-xyz",
                },
                context,
            );

            // Should succeed (no-op) or indicate nothing to clear
            assert.strictEqual(result.success, true);
        });
    });

    describe("findAndStyleNodes metadata", () => {
        it("has correct name", () => {
            assert.strictEqual(findAndStyleNodes.name, "findAndStyleNodes");
        });

        it("has description", () => {
            assert.ok(findAndStyleNodes.description.length > 0);
        });

        it("has parameters schema", () => {
            assert.ok(findAndStyleNodes.parameters);
        });

        it("has examples", () => {
            assert.ok(Array.isArray(findAndStyleNodes.examples));
            assert.ok(findAndStyleNodes.examples.length > 0);
        });
    });

    describe("findAndStyleEdges metadata", () => {
        it("has correct name", () => {
            assert.strictEqual(findAndStyleEdges.name, "findAndStyleEdges");
        });

        it("has description", () => {
            assert.ok(findAndStyleEdges.description.length > 0);
        });

        it("has parameters schema", () => {
            assert.ok(findAndStyleEdges.parameters);
        });

        it("has examples", () => {
            assert.ok(Array.isArray(findAndStyleEdges.examples));
        });
    });

    describe("clearStyles metadata", () => {
        it("has correct name", () => {
            assert.strictEqual(clearStyles.name, "clearStyles");
        });

        it("has description", () => {
            assert.ok(clearStyles.description.length > 0);
        });

        it("has parameters schema", () => {
            assert.ok(clearStyles.parameters);
        });
    });

    /**
     * Regression test for Issue #5: LLMs may use "*" instead of "" to match all
     * Bug: Anthropic used selector "*" to mean "match all nodes", but our code
     * only treated empty string "" as "match all". The "*" was invalid JMESPath
     * and returned no matches.
     *
     * Fix: Handle common "match all" patterns like "*", "all", "*.*", "true".
     */
    describe("regression: common 'match all' selectors work (Issue #5)", () => {
        it("selector '*' matches all nodes", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "*",
                    style: { color: "#ff0000" },
                    layerName: "star-selector",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(
                layerNamed("star-selector")?.selector,
                { match: "everything" },
                "'*' is the element's own spelling for the whole graph, which is `everything`",
            );
        });

        it("selector 'all' matches all nodes", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "all",
                    style: { color: "#ff0000" },
                    layerName: "all-selector",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(layerNamed("all-selector")?.selector, { match: "everything" });
        });

        it("selector '*' matches all edges", async () => {
            const result = await findAndStyleEdges.execute(
                graph,
                {
                    selector: "*",
                    style: { color: "#00ff00" },
                    layerName: "star-edge-selector",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(layerNamed("star-edge-selector")?.selector, { match: "everything" });
        });

        it("selector with whitespace ' * ' matches all nodes", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: " * ",
                    style: { color: "#ff0000" },
                    layerName: "whitespace-star",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(layerNamed("whitespace-star")?.selector, { match: "everything" });
        });
    });

    /**
     * Regression test for Issue #4: CSS color names must reach the renderer as colours.
     *
     * The bug: the command stored the raw string, and the mesh built its material with
     * `Color3.FromHexString()`, which only reads hex -- so a name like "red" failed silently and
     * the node came out black.
     *
     * WHERE THE CONVERSION LIVES NOW. The command writes what it was given straight into the
     * channel, and the channel converts: every colour channel takes any CSS colour and publishes
     * it as a parsed value. So these read the PAINT rather than the layer, which is the only
     * reading that says what a node is actually drawn in.
     */
    describe("regression: CSS color names are converted to hex (Issue #4)", () => {
        /**
         * What the style stack resolved for one node, once every layer has been applied.
         * @param index - The node's dense index.
         * @returns Its colour as the renderer will write it into the instance.
         */
        function nodeColor(index: number): { r: number; g: number; b: number; a: number } | null {
            return graph.getStylePainter().nodePaint(index)?.color ?? null;
        }

        it("findAndStyleNodes converts CSS color name 'red' to a painted colour", async () => {
            await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "red" },
                    layerName: "css-color-test",
                },
                context,
            );

            assert.strictEqual(
                layerNamed("css-color-test")?.set?.["node.color"],
                "red",
                "the command hands the channel what it was given, unmangled",
            );
            assert.deepStrictEqual(nodeColor(0), { r: 255, g: 0, b: 0, a: 1 }, "and the channel makes red of it");
        });

        it("findAndStyleNodes converts CSS color name 'blue' to a painted colour", async () => {
            await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "blue" },
                    layerName: "css-color-test-blue",
                },
                context,
            );

            assert.deepStrictEqual(nodeColor(0), { r: 0, g: 0, b: 255, a: 1 });
        });

        it("findAndStyleEdges converts CSS color name 'green' to hex", async () => {
            await findAndStyleEdges.execute(
                graph,
                {
                    selector: "",
                    style: { color: "green" },
                    layerName: "css-edge-color-test",
                },
                context,
            );

            // An edge carries its colour in its style rather than beside it, because the edge
            // renderer has no per-instance state. "green" is #008000, not the #00FF00 that
            // "lime" is.
            assert.strictEqual(graph.getStylePainter().edgePaint(0)?.style.line?.color, "#008000");
        });

        it("findAndStyleNodes still accepts hex colors", async () => {
            await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#FF5733" },
                    layerName: "hex-color-test",
                },
                context,
            );

            assert.deepStrictEqual(nodeColor(0), { r: 255, g: 87, b: 51, a: 1 });
        });
    });

    /**
     * Regression test for Issue #1: a style command must repaint what it styles.
     *
     * The bug: the commands pushed onto the layer array directly, which mutates the stack and
     * tells nobody, so the nodes and edges already on screen were never redrawn. The session's
     * stack has no such door -- `add()` IS the repaint, and it resolves only once the pass it
     * drove has finished, which is what these two assert.
     */
    describe("regression: style commands repaint what they style (Issue #1)", () => {
        it("findAndStyleNodes has painted the nodes by the time it answers", async () => {
            const result = await findAndStyleNodes.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#ff0000" },
                    layerName: "regression-test",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(
                graph.getStylePainter().nodePaint(0)?.color,
                { r: 255, g: 0, b: 0, a: 1 },
                "a command that answered before the pass ran would leave the old picture up",
            );
        });

        it("findAndStyleEdges has painted the edges by the time it answers", async () => {
            const result = await findAndStyleEdges.execute(
                graph,
                {
                    selector: "",
                    style: { color: "#00ff00" },
                    layerName: "regression-test-edges",
                },
                context,
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(graph.getStylePainter().edgePaint(0)?.style.line?.color, "#00ff00");
        });
    });
});
