/**
 * @file `session.catalog.optionsFor`: one algorithm's or layout's options with the parts that
 * depend on the data filled in for a scope.
 */

import { assert, describe, it } from "vitest";

import type { AlgorithmDescriptor, OptionDescriptor } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { scopeResolverOfSession } from "../../src/session/GraphSession";
import { optionsFor } from "../../src/session/optionsFor";
import { type Harness, makeSession } from "./helpers";

/**
 * A triangle a-b-c with a tail c-d, plus a separate pair e-f and a lone node g: 7 nodes, 5
 * edges, 3 components, largest degree 3 (c), largest core 2 (the triangle).
 * @returns The harness, loaded.
 */
function loaded(): Harness {
    const harness = makeSession();
    harness.add(
        ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id })),
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "a" },
            { src: "c", dst: "d" },
            { src: "e", dst: "f" },
        ],
    );

    return harness;
}

/** Every bound reference the element resolves, one per option, all as maxima. */
const BOUNDED: readonly OptionDescriptor[] = [
    { name: "nodes", plainName: "nodes", type: "integer", min: 1, max: { from: "graph.nodeCount" } },
    { name: "edges", plainName: "edges", type: "integer", max: { from: "graph.edgeCount" } },
    { name: "degree", plainName: "degree", type: "integer", max: { from: "graph.maxDegree" } },
    { name: "core", plainName: "core", type: "integer", max: "graph.maxCore" },
    { name: "components", plainName: "components", type: "integer", max: { from: "graph.componentCount" } },
    { name: "custom", plainName: "custom", type: "integer", max: { from: "plugin.somethingElse" } },
    { name: "start", plainName: "start", type: "node-id" },
];

/**
 * Resolve the {@link BOUNDED} options against a session's graph.
 * @param harness - The loaded session.
 * @param scope - The scope to measure.
 * @returns The options by name.
 */
function boundedOver(harness: Harness, scope: Parameters<typeof optionsFor>[2]): Map<string, OptionDescriptor> {
    const resolver = scopeResolverOfSession(harness.session);
    const descriptor = { key: "test-bounded", options: BOUNDED } as unknown as AlgorithmDescriptor;
    const resolved = optionsFor(
        {
            algorithms: () => [descriptor],
            layouts: () => [],
            resolve: (spec) => resolver.resolutionOf(spec ?? "graph"),
        },
        "test-bounded",
        scope,
    );

    return new Map(resolved.map((option) => [option.name, option]));
}

describe("session.catalog.optionsFor", () => {
    it("lists the graph's real node ids for a node option", async () => {
        const harness = loaded();

        const options = await harness.session.catalog.optionsFor("bfs", "graph");
        const nodeOptions = options.filter((option) => option.type === "node-id" || option.type === "node-set");

        assert.isNotEmpty(nodeOptions, "bfs declares a node option");
        for (const option of nodeOptions) {
            assert.deepStrictEqual(
                option.values?.map((choice) => choice.value),
                ["a", "b", "c", "d", "e", "f", "g"],
                option.name,
            );
        }

        harness.session.dispose();
    });

    it("lists only the scope's nodes when a scope is given", async () => {
        const harness = loaded();

        const options = await harness.session.catalog.optionsFor("bfs", { nodes: ["e", "f"] });
        const node = options.find((option) => option.type === "node-id");

        assert.deepStrictEqual(
            node?.values?.map((choice) => choice.value),
            ["e", "f"],
        );
        harness.session.dispose();
    });

    it("returns the static descriptor unchanged where nothing depends on the data", async () => {
        const harness = loaded();
        const declared = harness.session.catalog.layouts().find((layout) => layout.id === "circular");
        assert.isDefined(declared);

        const options = await harness.session.catalog.optionsFor("circular");

        assert.deepStrictEqual(options, declared?.options);
        harness.session.dispose();
    });

    it("refuses a key that is neither an algorithm nor a layout", async () => {
        const harness = loaded();

        const refusal: unknown = await harness.session.catalog
            .optionsFor("no-such-thing")
            .catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(refusal) && refusal.code === "E_UNKNOWN_ALGORITHM");
        harness.session.dispose();
    });

    it("replaces every bound reference with the number measured over the whole graph", () => {
        const harness = loaded();

        const options = boundedOver(harness, "graph");

        assert.strictEqual(options.get("nodes")?.max, 7);
        assert.strictEqual(options.get("nodes")?.min, 1, "a literal bound is kept");
        assert.strictEqual(options.get("edges")?.max, 5);
        assert.strictEqual(options.get("degree")?.max, 3);
        assert.strictEqual(options.get("core")?.max, 2, "the bare reference string resolves too");
        assert.strictEqual(options.get("components")?.max, 3);
        assert.deepStrictEqual(
            options.get("custom")?.max,
            { from: "plugin.somethingElse" },
            "an unknown reference is kept",
        );
        harness.session.dispose();
    });

    it("measures over the scope, not the whole graph", () => {
        const harness = loaded();

        const options = boundedOver(harness, { nodes: ["a", "b", "c"] });

        assert.strictEqual(options.get("nodes")?.max, 3);
        assert.strictEqual(options.get("edges")?.max, 3);
        assert.strictEqual(options.get("degree")?.max, 2);
        assert.strictEqual(options.get("core")?.max, 2);
        assert.strictEqual(options.get("components")?.max, 1);
        assert.deepStrictEqual(
            options.get("start")?.values?.map((choice) => choice.value),
            ["a", "b", "c"],
        );
        harness.session.dispose();
    });

    it("lists a numeric node id as its string form", () => {
        const harness = makeSession();
        harness.add([{ id: 0 }, { id: 1 }], [{ src: 0, dst: 1 }]);

        const options = boundedOver(harness, "graph");

        assert.deepStrictEqual(options.get("start")?.values, [
            { value: "0", label: "0" },
            { value: "1", label: "1" },
        ]);
        harness.session.dispose();
    });
});
