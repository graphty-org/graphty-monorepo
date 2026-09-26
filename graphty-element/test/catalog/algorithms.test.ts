import { assert, describe, it } from "vitest";

import { Algorithm } from "../../src/algorithms";
import {
    algorithmByKey,
    algorithmByLegacyKey,
    BUILT_IN_ALGORITHMS,
    type BuiltInAlgorithmDescriptor,
} from "../../src/catalog/algorithms";
import {
    COST_CLASSES,
    DEPRECATED_ALGORITHMS,
    KNOWN_ALGORITHMS,
    type OptionDescriptor,
    RESULT_SHAPES,
} from "../../src/catalog/types";

/** The namespace every algorithm this package registers is registered under. */
const NAMESPACE = "graphty";

/**
 * The type of every registered algorithm, without its namespace.
 * @returns The registered types, sorted.
 */
function registeredTypes(): string[] {
    return Algorithm.getRegisteredAlgorithms(NAMESPACE).map((key) => key.slice(NAMESPACE.length + 1));
}

/**
 * Every option on every descriptor, paired with the key that carries it.
 * @returns One entry per option in the whole table.
 */
function everyOption(): { key: string; option: OptionDescriptor }[] {
    return BUILT_IN_ALGORITHMS.flatMap((descriptor) =>
        descriptor.options.map((option) => ({ key: descriptor.key, option })),
    );
}

/**
 * Visit every value reachable from a descriptor, so a test can assert something about all of
 * them at once.
 * @param value - The value to walk into.
 * @param path - Where this value sits, for a failure message.
 * @param visit - Called once for the value and once for everything inside it.
 */
function walk(value: unknown, path: string, visit: (found: unknown, at: string) => void): void {
    visit(value, path);

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            walk(item, `${path}[${index}]`, visit);
        });

        return;
    }

    if (typeof value === "object" && value !== null) {
        for (const [name, member] of Object.entries(value)) {
            walk(member, `${path}.${name}`, visit);
        }
    }
}

/**
 * Find one descriptor by key, failing the test rather than returning undefined.
 * @param key - The 2.0 key to look for.
 * @returns The descriptor.
 */
function descriptorFor(key: string): BuiltInAlgorithmDescriptor {
    const found = algorithmByKey(key);
    if (found === undefined) {
        throw new Error(`no descriptor for ${key}`);
    }

    return found;
}

describe("built-in algorithm catalogue", () => {
    describe("coverage of what actually ships", () => {
        it("gives every registered algorithm exactly one descriptor", () => {
            const claims = registeredTypes().map((type) => ({
                type,
                descriptors: BUILT_IN_ALGORITHMS.filter((descriptor) =>
                    descriptor.legacyKeys.some((legacy) => legacy.key === type),
                ).map((descriptor) => descriptor.key),
            }));

            assert.deepEqual(
                claims.filter((claim) => claim.descriptors.length !== 1),
                [],
            );
        });

        it("claims no legacy key that is not registered", () => {
            const registered = new Set(registeredTypes());
            const claimed = BUILT_IN_ALGORITHMS.flatMap((descriptor) =>
                descriptor.legacyKeys.map((legacy) => legacy.key),
            );

            assert.deepEqual(
                claimed.filter((key) => !registered.has(key)),
                [],
            );
        });

        it("folds twenty-five registered algorithms into twenty-three keys", () => {
            const legacyCount = BUILT_IN_ALGORITHMS.reduce((total, d) => total + d.legacyKeys.length, 0);

            assert.lengthOf(registeredTypes(), 25);
            assert.lengthOf(BUILT_IN_ALGORITHMS, 23);
            assert.strictEqual(legacyCount, 25);
        });

        it("uses a unique key for every descriptor", () => {
            const keys = BUILT_IN_ALGORITHMS.map((descriptor) => descriptor.key);

            assert.strictEqual(new Set(keys).size, keys.length);
        });

        it("uses only published keys, and describes every published key that is not deprecated", () => {
            const described = BUILT_IN_ALGORITHMS.map((descriptor) => descriptor.key);
            const published = [...KNOWN_ALGORITHMS];

            assert.deepEqual(
                described.filter((key) => !published.includes(key)),
                [],
            );
            assert.deepEqual(
                published.filter((key) => !described.includes(key)),
                [...DEPRECATED_ALGORITHMS],
            );
        });

        it("describes none of the deprecated algorithms, which are not implemented", () => {
            for (const key of DEPRECATED_ALGORITHMS) {
                assert.isUndefined(algorithmByKey(key));
            }
        });
    });

    describe("plain JSON, all the way down", () => {
        it("round-trips the whole table through JSON with nothing lost", () => {
            assert.deepStrictEqual(JSON.parse(JSON.stringify(BUILT_IN_ALGORITHMS)), BUILT_IN_ALGORITHMS);
        });

        it("round-trips every option descriptor on its own", () => {
            for (const { key, option } of everyOption()) {
                assert.deepStrictEqual(JSON.parse(JSON.stringify(option)), option, `${key}.${option.name}`);
            }
        });

        it("references no class and no function", () => {
            const functions: string[] = [];
            walk(BUILT_IN_ALGORITHMS, "algorithms", (found, at) => {
                if (typeof found === "function") {
                    functions.push(at);
                }
            });

            assert.deepEqual(functions, []);
        });

        it("holds nothing but plain objects, arrays and scalars", () => {
            const exotic: string[] = [];
            walk(BUILT_IN_ALGORITHMS, "algorithms", (found, at) => {
                if (typeof found !== "object" || found === null || Array.isArray(found)) {
                    return;
                }

                if (Object.getPrototypeOf(found) !== Object.prototype) {
                    exotic.push(at);
                }
            });

            assert.deepEqual(exotic, []);
        });

        it("declares no cost function, because a closure does not survive a worker", () => {
            assert.deepEqual(
                BUILT_IN_ALGORITHMS.filter((descriptor) => descriptor.cost !== undefined),
                [],
            );
        });
    });

    describe("what every descriptor promises", () => {
        it("carries a plain name, a technical name, a description and a complexity", () => {
            for (const descriptor of BUILT_IN_ALGORITHMS) {
                assert.isAbove(descriptor.plainName.length, 0, `${descriptor.key} plainName`);
                assert.isAbove(descriptor.technicalName.length, 0, `${descriptor.key} technicalName`);
                assert.isAbove(descriptor.description.length, 0, `${descriptor.key} description`);
                assert.isAbove(descriptor.complexity.length, 0, `${descriptor.key} complexity`);
            }
        });

        it("uses a declared cost class and a declared result shape", () => {
            for (const descriptor of BUILT_IN_ALGORITHMS) {
                assert.include(COST_CLASSES, descriptor.costClass, descriptor.key);
                assert.include(RESULT_SHAPES, descriptor.shape, descriptor.key);
            }
        });

        it("declares at least one result field, each addressed under the run's result root", () => {
            for (const descriptor of BUILT_IN_ALGORITHMS) {
                assert.isAbove(descriptor.fields.length, 0, descriptor.key);
                for (const declared of descriptor.fields) {
                    assert.strictEqual(
                        declared.path,
                        `results.$.${declared.name}`,
                        `${descriptor.key}.${declared.name}`,
                    );
                    assert.isAbove(declared.plainName.length, 0);
                    assert.isAbove(declared.technicalName.length, 0);
                }
            }
        });

        it("names a field once per element kind", () => {
            for (const descriptor of BUILT_IN_ALGORITHMS) {
                const addresses = descriptor.fields.map((declared) => `${declared.kind}.${declared.name}`);

                assert.strictEqual(new Set(addresses).size, addresses.length, descriptor.key);
            }
        });

        it("gives a metric result the uniform per-shape fields", () => {
            const metrics = BUILT_IN_ALGORITHMS.filter(
                (descriptor) => descriptor.shape === "node-metric" || descriptor.shape === "edge-metric",
            );

            assert.isAbove(metrics.length, 0);
            for (const descriptor of metrics) {
                const names = descriptor.fields.map((declared) => declared.name);
                for (const required of ["value", "rank", "percentile", "min", "max", "median", "mean", "measured"]) {
                    assert.include(names, required, `${descriptor.key} is missing ${required}`);
                }
            }
        });

        it("gives a community result the uniform per-shape fields", () => {
            const communities = BUILT_IN_ALGORITHMS.filter((descriptor) => descriptor.shape === "community");

            assert.isAbove(communities.length, 0);
            for (const descriptor of communities) {
                const names = descriptor.fields.map((declared) => declared.name);
                for (const required of ["group", "groupSize", "groupCount", "sizes"]) {
                    assert.include(names, required, `${descriptor.key} is missing ${required}`);
                }
            }
        });

        it("gives a set result membership, a count and one headline number", () => {
            const sets = BUILT_IN_ALGORITHMS.filter(
                (descriptor) => descriptor.shape === "node-set" || descriptor.shape === "edge-set",
            );

            assert.isAbove(sets.length, 0);
            for (const descriptor of sets) {
                const names = descriptor.fields.map((declared) => declared.name);

                assert.include(names, "in", descriptor.key);
                assert.include(names, "count", descriptor.key);
            }
        });
    });

    describe("options, emitted from the schemas rather than transcribed", () => {
        it("gives every option a name, a plain name and a control type", () => {
            for (const { key, option } of everyOption()) {
                assert.isAbove(option.name.length, 0, key);
                assert.isAbove(option.plainName.length, 0, `${key}.${option.name}`);
                assert.strictEqual(option.technicalName, option.name, `${key}.${option.name}`);
            }
        });

        it("classifies every built-in option, leaving none unknown", () => {
            const unclassified = everyOption()
                .filter(({ option }) => option.type === "unknown")
                .map(({ key, option }) => `${key}.${option.name}: ${option.unsupportedReason ?? ""}`);

            assert.deepEqual(unclassified, []);
        });

        it("names an option once per algorithm", () => {
            for (const descriptor of BUILT_IN_ALGORITHMS) {
                const names = descriptor.options.map((option) => option.name);

                assert.strictEqual(new Set(names).size, names.length, descriptor.key);
            }
        });

        it("reads PageRank's options straight out of its own schema", () => {
            const pagerank = descriptorFor("pagerank");

            assert.deepEqual(
                pagerank.options.map((option) => option.name),
                ["dampingFactor", "maxIterations", "tolerance", "weight", "useDelta"],
            );
            assert.deepInclude(pagerank.options[0], {
                type: "number",
                default: 0.85,
                min: 0,
                max: 1,
                plainName: "Damping Factor",
            });
        });

        it("reads a node reference as a node id rather than a string", () => {
            const source = descriptorFor("shortest-path").options.find((option) => option.name === "source");

            assert.strictEqual(source?.type, "node-id");
            assert.isNull(source?.default);
        });
    });

    describe("the folded keys", () => {
        it("offers the shortest-path engine as a parameter, with each single-source engine as a choice", () => {
            const method = descriptorFor("shortest-path").options.find((option) => option.name === "method");

            assert.strictEqual(method?.type, "enum");
            assert.deepEqual(
                method?.values?.map((choice) => choice.value),
                ["dijkstra", "bellman-ford"],
            );
            assert.isNull(method?.default);
            assert.isTrue(method?.advanced);
        });

        it("gives the all-pairs sweep a key of its own rather than a switch on shortest-path", () => {
            // A run fixes its result shape from its descriptor once, at creation, so a parameter
            // that changed the shape would make the catalogue wrong about every run of that key:
            // the all-pairs sweep measures every node where shortest-path names one route.
            assert.isUndefined(descriptorFor("shortest-path").options.find((option) => option.name === "allPairs"));
            assert.strictEqual(descriptorFor("shortest-path").shape, "path");
            assert.strictEqual(descriptorFor("all-pairs-distance").shape, "node-metric");
        });

        it("offers the two shortest-path engines' shared options exactly once", () => {
            const names = descriptorFor("shortest-path").options.map((option) => option.name);

            assert.lengthOf(
                names.filter((name) => name === "source"),
                1,
            );
            assert.lengthOf(
                names.filter((name) => name === "target"),
                1,
            );
            assert.include(names, "bidirectional");
        });

        it("offers component strength as a parameter, weak by default", () => {
            const strength = descriptorFor("components").options.find((option) => option.name === "strength");

            assert.strictEqual(strength?.type, "enum");
            assert.deepEqual(
                strength?.values?.map((choice) => choice.value),
                ["weak", "strong"],
            );
            assert.strictEqual(strength?.default, "weak");
        });

        it("maps every renamed key to its 2.0 key and the parameters that reproduce it", () => {
            assert.deepNestedInclude(algorithmByLegacyKey("dijkstra"), {
                "descriptor.key": "shortest-path",
                params: { method: "dijkstra" },
            });
            assert.deepNestedInclude(algorithmByLegacyKey("bellman-ford"), {
                "descriptor.key": "shortest-path",
                params: { method: "bellman-ford" },
            });
            assert.deepNestedInclude(algorithmByLegacyKey("floyd-warshall"), {
                "descriptor.key": "all-pairs-distance",
                params: {},
            });
            assert.deepNestedInclude(algorithmByLegacyKey("connected-components"), {
                "descriptor.key": "components",
                params: {},
            });
            assert.deepNestedInclude(algorithmByLegacyKey("scc"), {
                "descriptor.key": "components",
                params: { strength: "strong" },
            });
        });

        it("maps the twenty unchanged keys to themselves with no parameters", () => {
            const unchanged = BUILT_IN_ALGORITHMS.filter((descriptor) => descriptor.legacyKeys.length === 1).filter(
                (descriptor) => descriptor.legacyKeys[0].key === descriptor.key,
            );

            assert.lengthOf(unchanged, 20);
            for (const descriptor of unchanged) {
                assert.deepEqual(algorithmByLegacyKey(descriptor.key)?.params, {}, descriptor.key);
            }
        });

        it("says the all-pairs sweep costs a cube, where the single-source engines do not", () => {
            assert.strictEqual(descriptorFor("shortest-path").costClass, "instant");
            assert.strictEqual(descriptorFor("all-pairs-distance").costClass, "cubic");
            assert.include(descriptorFor("all-pairs-distance").complexity, "O(n^3)");
        });
    });

    describe("lookups", () => {
        it("finds a descriptor by its 2.0 key", () => {
            assert.strictEqual(algorithmByKey("betweenness")?.technicalName, "Betweenness centrality");
        });

        it("returns undefined for a key nothing carries", () => {
            assert.isUndefined(algorithmByKey("acme:triangles"));
            assert.isUndefined(algorithmByLegacyKey("acme:triangles"));
        });
    });
});
