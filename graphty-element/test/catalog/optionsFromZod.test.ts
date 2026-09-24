import { assert, describe, it } from "vitest";
import { z } from "zod/v4";

import { DijkstraAlgorithm } from "../../src/algorithms/DijkstraAlgorithm";
import { LeidenAlgorithm } from "../../src/algorithms/LeidenAlgorithm";
import { MinCutAlgorithm } from "../../src/algorithms/MinCutAlgorithm";
import { PageRankAlgorithm } from "../../src/algorithms/PageRankAlgorithm";
import { optionsFromZod } from "../../src/catalog/optionsFromZod";
import type { OptionDescriptor } from "../../src/catalog/types";
import { GraphStyle } from "../../src/config/GraphStyle";
import { NodeStyle } from "../../src/config/NodeStyle";
import type { OptionsSchema } from "../../src/config/OptionsSchema";
import { BipartiteLayout } from "../../src/layout/BipartiteLayoutEngine";
import { ForceAtlas2Layout } from "../../src/layout/ForceAtlas2LayoutEngine";
import { KamadaKawaiLayout } from "../../src/layout/KamadaKawaiLayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { SpringLayout } from "../../src/layout/SpringLayoutEngine";

function byName(descriptors: readonly OptionDescriptor[], name: string): OptionDescriptor {
    const found = descriptors.find((d) => d.name === name);
    if (found === undefined) {
        throw new Error(`no option named ${name} in ${descriptors.map((d) => d.name).join(", ")}`);
    }

    return found;
}

function schemaOf(source: { zodOptionsSchema?: OptionsSchema }): OptionsSchema {
    const schema = source.zodOptionsSchema;
    if (schema === undefined) {
        throw new Error("the class under test has no zodOptionsSchema");
    }

    return schema;
}

describe("optionsFromZod", () => {
    describe("real algorithm schemas", () => {
        it("emits every Dijkstra option, in declaration order", () => {
            const options = optionsFromZod(schemaOf(DijkstraAlgorithm));

            assert.deepEqual(
                options.map((o) => o.name),
                ["source", "target", "bidirectional"],
            );
        });

        it("reads a string-or-number node reference as a node id", () => {
            const source = byName(optionsFromZod(schemaOf(DijkstraAlgorithm)), "source");

            assert.strictEqual(source.type, "node-id");
            assert.isNull(source.default);
            assert.strictEqual(source.plainName, "Source Node");
            assert.strictEqual(source.description, "Starting node for shortest path (uses first node if not set)");
        });

        it("carries the advanced flag through from the option metadata", () => {
            const bidirectional = byName(optionsFromZod(schemaOf(DijkstraAlgorithm)), "bidirectional");

            assert.deepInclude(bidirectional, {
                type: "boolean",
                default: true,
                advanced: true,
                plainName: "Bidirectional Search",
                technicalName: "bidirectional",
            });
        });

        it("keeps a bounded float as a number, with its range and its step", () => {
            const resolution = byName(optionsFromZod(schemaOf(LeidenAlgorithm)), "resolution");

            assert.deepInclude(resolution, { type: "number", min: 0.1, max: 5, default: 1, step: 0.1 });
        });

        it("separates an integer option from a float one", () => {
            const options = optionsFromZod(schemaOf(LeidenAlgorithm));

            assert.deepInclude(byName(options, "randomSeed"), {
                type: "integer",
                min: 0,
                max: 2147483647,
                default: 42,
            });
            assert.deepInclude(byName(options, "maxIterations"), { type: "integer", min: 1, max: 500, default: 100 });
            assert.strictEqual(byName(options, "threshold").type, "number");
        });

        it("keeps a nullable string as a string, with null as its default", () => {
            const weight = byName(optionsFromZod(schemaOf(PageRankAlgorithm)), "weight");

            assert.strictEqual(weight.type, "string");
            assert.isNull(weight.default);
            assert.isTrue(weight.advanced);
        });

        it("emits no Zod object anywhere in the result", () => {
            const options = optionsFromZod(schemaOf(MinCutAlgorithm));

            assert.deepEqual(JSON.parse(JSON.stringify(options)), options);
        });

        it("gives every option a plain name and a technical name", () => {
            const options = optionsFromZod(schemaOf(MinCutAlgorithm));

            for (const option of options) {
                assert.isAbove(option.plainName.length, 0);
                assert.strictEqual(option.technicalName, option.name);
            }
        });
    });

    describe("real layout schemas", () => {
        it("turns a Zod enum into an enum with a choice per value", () => {
            const align = byName(optionsFromZod(schemaOf(BipartiteLayout)), "align");

            assert.strictEqual(align.type, "enum");
            assert.strictEqual(align.default, "vertical");
            assert.deepEqual(align.values, [
                { value: "vertical", label: "Vertical" },
                { value: "horizontal", label: "Horizontal" },
            ]);
        });

        it("reports the bound of a positive number", () => {
            const scale = byName(optionsFromZod(schemaOf(BipartiteLayout)), "scale");

            assert.deepInclude(scale, { type: "number", min: 0, default: 1, step: 0.1 });
            assert.isUndefined(scale.max);
        });

        it("publishes 'use edge weights' as a boolean that is on by default, for both engines that read weights", () => {
            // The two engines used to name an attribute instead -- Kamada-Kawai's `weightProperty`
            // and ForceAtlas2's `weightPath` -- and neither did anything: no weight ever reached
            // either layout function. Naming an attribute was the wrong question anyway, because
            // which record key carries the weight is settled one layer up by
            // `knownFields.edgeWeightPath`, for every engine at once. What is left for a reader to
            // decide is whether to arrange by the weights at all, which is one boolean, published
            // under one name, for both engines -- so a picker can offer it and a reader can say no.
            for (const engine of [KamadaKawaiLayout, ForceAtlas2Layout]) {
                const weighted = byName(optionsFromZod(schemaOf(engine)), "weighted");

                assert.strictEqual(weighted.type, "boolean", `${engine.type}: weights are on or off`);
                assert.strictEqual(weighted.default, true, `${engine.type}: a weighted graph is arranged by its weights`);
                assert.isNotTrue(weighted.advanced, `${engine.type}: a reader should not have to go looking for it`);
            }
        });

        it("keeps a nullable positive integer an integer", () => {
            const seed = byName(optionsFromZod(schemaOf(NGraphEngine)), "seed");

            assert.deepInclude(seed, { type: "integer", min: 0, default: null });
        });

        it("reports no range for an integer whose only bound is the safe-integer limit", () => {
            const seed = byName(optionsFromZod(schemaOf(NGraphEngine)), "seed");

            assert.isUndefined(seed.max);
        });

        it("reports neither bound for an unbounded integer", () => {
            const count = byName(optionsFromZod(z.object({ count: z.number().int() })), "count");

            assert.strictEqual(count.type, "integer");
            assert.isUndefined(count.min);
            assert.isUndefined(count.max);
        });

        it("emits a spring layout form with no unknown options", () => {
            const options = optionsFromZod(schemaOf(SpringLayout));

            assert.deepEqual(
                options.map((o) => o.name),
                ["scalingFactor", "k", "iterations", "scale", "dim", "seed"],
            );
            assert.deepEqual(
                options.filter((o) => o.type === "unknown"),
                [],
            );
            assert.deepInclude(byName(options, "k"), { type: "number", default: null });
        });
    });

    describe("a bare Zod object schema", () => {
        it("walks the element's own graph style schema", () => {
            const options = optionsFromZod(GraphStyle);

            assert.deepInclude(byName(options, "addDefaultStyle"), { type: "boolean", default: true });
            assert.deepInclude(byName(options, "startingCameraDistance"), { type: "number", default: 30 });
            assert.strictEqual(byName(options, "layout").type, "string");
            assert.strictEqual(byName(options, "viewMode").type, "enum");
            assert.deepEqual(
                byName(options, "viewMode").values?.map((v) => v.value),
                ["2d", "3d", "ar", "vr"],
            );
        });

        it("names an option with no metadata from its key", () => {
            const twoD = byName(optionsFromZod(GraphStyle), "twoD");

            assert.strictEqual(twoD.plainName, "Two D");
        });

        it("takes supplied metadata over anything the schema carries", () => {
            const options = optionsFromZod(GraphStyle, {
                meta: { twoD: { label: "Flat view", description: "Draw the graph in two dimensions", advanced: true } },
            });

            assert.deepInclude(byName(options, "twoD"), {
                plainName: "Flat view",
                description: "Draw the graph in two dimensions",
                advanced: true,
            });
        });

        it("returns nothing for a schema that declares no properties", () => {
            assert.deepEqual(optionsFromZod(z.number()), []);
        });

        it("reads a union of literals as the same enum a Zod enum would give", () => {
            const fromEnum = optionsFromZod(z.object({ mode: z.enum(["fast", "exact"]).default("fast") }));
            const fromLiterals = optionsFromZod(
                z.object({ mode: z.union([z.literal("fast"), z.literal("exact")]).default("fast") }),
            );

            assert.strictEqual(fromLiterals[0].type, "enum");
            assert.deepEqual(fromLiterals[0].values, fromEnum[0].values);
            assert.strictEqual(fromLiterals[0].default, "fast");
        });

        it("groups an option when the metadata says which group it belongs to", () => {
            const options = optionsFromZod(GraphStyle, {
                meta: { twoD: { group: "View" }, viewMode: { group: "View" } },
            });

            assert.strictEqual(byName(options, "twoD").group, "View");
            assert.strictEqual(byName(options, "viewMode").group, "View");
            assert.isUndefined(byName(options, "layout").group);
        });
    });

    describe("constructs it cannot classify", () => {
        it("keeps an object-valued option, typed unknown, with a reason", () => {
            // `graph.selection` -- the colour, scale and opacity of the selection highlight. It
            // replaced `graph.effects` here, which named three post-process settings no renderer
            // ever read and which were deleted rather than left in a published schema as
            // something a consumer could set and never see.
            const selection = byName(optionsFromZod(GraphStyle), "selection");

            assert.strictEqual(selection.type, "unknown");
            assert.include(selection.unsupportedReason, "object or record");
        });

        it("keeps a union of objects, typed unknown, with a reason", () => {
            const background = byName(optionsFromZod(GraphStyle), "background");

            assert.strictEqual(background.type, "unknown");
            assert.include(background.unsupportedReason, "union");
        });

        it("drops no option from a schema of nested objects", () => {
            const options = optionsFromZod(NodeStyle);

            assert.deepEqual(
                options.map((o) => o.name),
                // Every top-level field of NodeStyle, exactly. `enabled` was here until 2.0
                // withdrew it: the session's visibility mask decides whether a node is drawn and
                // nothing ever read the flag.
                ["shape", "texture", "effect", "label", "tooltip"],
            );
            for (const option of options) {
                if (option.type === "unknown") {
                    assert.ok(option.unsupportedReason);
                } else {
                    assert.isUndefined(option.unsupportedReason);
                }
            }
        });

        it("types an array option unknown rather than dropping it", () => {
            const options = optionsFromZod(z.object({ nlist: z.array(z.array(z.number())).nullable().default(null) }));

            assert.lengthOf(options, 1);
            assert.deepInclude(options[0], { name: "nlist", type: "unknown", default: null });
            assert.include(options[0].unsupportedReason, "array");
        });

        it("follows a schema that Zod hoisted into the document's definitions", () => {
            const shared = z.number().min(1).max(9).default(4).meta({ id: "SharedCount" });
            const options = optionsFromZod(z.object({ count: shared }));

            assert.deepInclude(options[0], { name: "count", type: "number", min: 1, max: 9, default: 4 });
        });

        it("types a recursive schema unknown rather than looping", () => {
            const node: z.ZodType = z.lazy(() => z.object({ child: node.optional() }));
            const options = optionsFromZod(z.object({ child: node }));

            assert.lengthOf(options, 1);
            assert.strictEqual(options[0].type, "unknown");
            assert.ok(options[0].unsupportedReason);
        });

        it("says so when the only thing left of a union is a reference back into itself", () => {
            const node: z.ZodType = z.lazy(() => z.object({ child: node.optional() }));
            const options = optionsFromZod(z.object({ child: node.nullable() }));

            assert.strictEqual(options[0].type, "unknown");
            assert.include(options[0].unsupportedReason, "recursive");
        });

        it("types a heterogeneous union unknown, naming the arms", () => {
            const options = optionsFromZod(z.object({ mixed: z.union([z.boolean(), z.array(z.number())]) }));

            assert.include(options[0].unsupportedReason, "boolean");
            assert.include(options[0].unsupportedReason, "array");
        });

        it("types a null-only option unknown", () => {
            const options = optionsFromZod(z.object({ nothing: z.null() }));

            assert.deepInclude(options[0], { type: "unknown" });
            assert.include(options[0].unsupportedReason, "null");
        });

        it("types an unrepresentable construct unknown", () => {
            const options = optionsFromZod(z.object({ when: z.date(), anything: z.custom(() => true) }));

            assert.deepEqual(
                options.map((o) => o.type),
                ["unknown", "unknown"],
            );
            assert.include(options[0].unsupportedReason, "no JSON Schema type");
        });
    });

    describe("failures it refuses to throw on", () => {
        it("returns nothing when a schema-shaped value cannot be converted", () => {
            assert.deepEqual(optionsFromZod({ _zod: {} } as unknown as z.ZodType), []);
        });

        it("still names every option when the whole options schema fails to convert", () => {
            const broken = {
                first: { schema: {} as unknown as z.ZodType, meta: { label: "First", description: "the first one" } },
                second: {
                    schema: {} as unknown as z.ZodType,
                    meta: { label: "Second", description: "", step: 2, group: "Tuning", advanced: true },
                },
            };

            const options = optionsFromZod(broken);

            assert.deepEqual(
                options.map((o) => o.name),
                ["first", "second"],
            );
            assert.deepInclude(options[0], { type: "unknown", plainName: "First", description: "the first one" });
            assert.deepInclude(options[1], { step: 2, group: "Tuning", advanced: true });
            for (const option of options) {
                assert.ok(option.unsupportedReason);
            }
        });
    });

    describe("overrides", () => {
        it("lets an author say what a node reference really is", () => {
            const options = optionsFromZod(schemaOf(DijkstraAlgorithm), {
                overrides: {
                    bidirectional: { internal: true },
                    source: { type: "node-id", group: "Endpoints" },
                },
            });

            assert.deepInclude(byName(options, "source"), { type: "node-id", group: "Endpoints" });
            assert.isTrue(byName(options, "bidirectional").internal);
        });

        it("lets an author retype an option the walk could not classify", () => {
            const options = optionsFromZod(schemaOf(LeidenAlgorithm), {
                overrides: { randomSeed: { type: "seed" } },
            });

            assert.deepInclude(byName(options, "randomSeed"), { type: "seed", min: 0, default: 42 });
        });
    });
});
