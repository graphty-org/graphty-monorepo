/**
 * @file What `defineAlgorithm` fills in for the author, read back from the registry in Node: the
 * catalogue entry, the cost model, and the registration rules (design/extensions/simple-tier.md
 * section 4.1, "What the element fills in"). What a run fills in is checked in the browser, in
 * test/browser/simple/define-algorithm-defaults.test.ts.
 */

import { afterEach, assert, describe, it } from "vitest";

import { checkShapeContract, defineAlgorithm, type NodeView } from "../../extend";
import { clearRegisteredAlgorithmsForTesting, registeredAlgorithmByKey } from "../../src/catalog/registry";
import { isGraphtyError } from "../../src/errors";

afterEach(() => {
    clearRegisteredAlgorithmsForTesting();
});

/**
 * The registry's entry for a key, asserted to exist.
 * @param key - The id.
 * @returns The entry.
 */
function entry(key: string): NonNullable<ReturnType<typeof registeredAlgorithmByKey>> {
    const found = registeredAlgorithmByKey(key);
    assert.isDefined(found, `"${key}" is registered`);
    return found;
}

describe("the catalogue entry defineAlgorithm fills in", () => {
    it("names, files and prices a node score", () => {
        defineAlgorithm({ id: "acme-hop-reach", node: (node) => node.degree });

        const { descriptor, namespace, type, costUnits } = entry("acme-hop-reach");
        assert.strictEqual(namespace, "acme-hop-reach", "the legacy address is <id>:<id>");
        assert.strictEqual(type, "acme-hop-reach");
        assert.strictEqual(descriptor.plainName, "Acme hop reach");
        assert.strictEqual(descriptor.technicalName, "Acme hop reach");
        assert.strictEqual(descriptor.description, "");
        assert.strictEqual(descriptor.category, "custom");
        assert.strictEqual(descriptor.shape, "node-metric");
        assert.isEmpty(checkShapeContract("node-metric", descriptor.fields));
        assert.deepEqual(descriptor.options, []);
        assert.strictEqual(descriptor.costClass, "instant");
        assert.strictEqual(descriptor.complexity, "O(n + m)");
        assert.strictEqual(costUnits?.(10, 20, {}), 10 + 2 * 20, "one visit per node, two per edge");
    });

    it("uses the author's name and description when given", () => {
        defineAlgorithm({ id: "acme-named", name: "Reach", description: "How far.", version: "1.2.0", edge: () => 1 });

        const { descriptor, version } = entry("acme-named");
        assert.strictEqual(descriptor.plainName, "Reach");
        assert.strictEqual(descriptor.technicalName, "Reach");
        assert.strictEqual(descriptor.description, "How far.");
        assert.strictEqual(descriptor.shape, "edge-metric");
        assert.isEmpty(checkShapeContract("edge-metric", descriptor.fields));
        assert.strictEqual(version, "1.2.0");
    });

    it("prices a whole-graph function by its passes option, default or chosen", () => {
        defineAlgorithm({
            id: "acme-iterate",
            options: { rounds: { type: "integer", default: 30 } },
            passes: "rounds",
            nodes: () => new Map(),
        });

        const { descriptor, costUnits } = entry("acme-iterate");
        assert.strictEqual(descriptor.costClass, "iterative");
        assert.strictEqual(costUnits?.(10, 20, { rounds: 30 }), 30 * 30);
        assert.strictEqual(costUnits?.(10, 20, { rounds: 2 }), 2 * 30);
    });

    it("publishes a grouping as a community", () => {
        defineAlgorithm({ id: "acme-parts", groups: () => new Map() });

        const { descriptor } = entry("acme-parts");
        assert.strictEqual(descriptor.shape, "community");
        assert.isEmpty(checkShapeContract("community", descriptor.fields));
        assert.strictEqual(entry("acme-parts").costUnits?.(10, 20, {}), 30, "one pass without a passes option");
    });
});

describe("registering a definition", () => {
    it("treats a fresh object carrying the same function as the same algorithm", () => {
        const node = (view: NodeView): number => view.degree;
        defineAlgorithm({ id: "acme-again", node });
        const first = entry("acme-again");
        defineAlgorithm({ id: "acme-again", node });

        assert.strictEqual(entry("acme-again"), first, "the registration was not replaced");
    });

    it("refuses a different algorithm under a taken id when asked to be strict", () => {
        defineAlgorithm({ id: "acme-taken", node: () => 1 });

        let caught: unknown;
        try {
            defineAlgorithm({ id: "acme-taken", node: () => 2 }, { strict: true });
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught));
        assert.strictEqual((caught as { code: string }).code, "E_DUPLICATE_PLUGIN");
    });
});
