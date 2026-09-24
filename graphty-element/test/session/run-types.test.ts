import { assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { type FieldDescriptor, RESULT_SHAPES, type ResultShape } from "../../src/catalog/types";
import {
    bindResultPath,
    checkShapeContract,
    isHighlightShape,
    RESULT_FIELD_CONTRACT,
    RESULT_FIELD_NAMES,
    RESULT_PATH_RUN_PLACEHOLDER,
    RESULT_ROOT,
    RESULT_SHAPE_CONTRACTS,
    type ResultFieldName,
    type ResultLayerRole,
    resultPath,
    type ResultShapeContract,
    resultShapeContract,
} from "../../src/session/results/types";
import {
    isRunId,
    isRunStatus,
    isTerminalRunStatus,
    type Precision,
    type Run,
    RUN_ID_PATTERN,
    RUN_STATUSES,
    type RunStatus,
} from "../../src/session/runs/types";

/** Every shape contract, in the order the shape union declares them. */
const CONTRACTS: readonly ResultShapeContract[] = RESULT_SHAPES.map((shape) => RESULT_SHAPE_CONTRACTS[shape]);

/**
 * Every field name one contract names, paired with the half of the result it was named in.
 * @param contract - The contract to read.
 * @returns One entry per declared name, optional graph fields included.
 */
function declaredNames(contract: ResultShapeContract): { name: ResultFieldName; kind: "node" | "edge" | "graph" }[] {
    return [
        ...contract.nodeFields.map((name) => ({ name, kind: "node" as const })),
        ...contract.edgeFields.map((name) => ({ name, kind: "edge" as const })),
        ...contract.graphFields.map((name) => ({ name, kind: "graph" as const })),
        ...contract.optionalGraphFields.map((name) => ({ name, kind: "graph" as const })),
    ];
}

/**
 * What a consumer can draw from a shape, written as a switch so the compiler checks that every
 * shape is handled. The `never` binding in the default arm is the whole point: adding a shape to
 * the union without extending this switch fails to compile.
 * @param shape - The shape to classify.
 * @returns The layer role.
 */
function layerRoleOf(shape: ResultShape): ResultLayerRole {
    switch (shape) {
        case "node-metric":
        case "edge-metric":
        case "community":
        case "layered-grouping":
        case "category-table":
            return "encoding";
        case "path":
        case "node-set":
        case "edge-set":
            return "highlight";
        case "pair-list":
        case "temporal":
        case "fact":
            return "none";
        default: {
            const unreachable: never = shape;

            throw new Error(`unhandled result shape: ${String(unreachable)}`);
        }
    }
}

/**
 * The same exhaustiveness check for the precision a run reports.
 * @param precision - The precision to describe.
 * @returns How many bits of mantissa the arithmetic carried.
 */
function precisionBits(precision: Precision): number {
    switch (precision) {
        case "f32":
            return 32;
        case "f64":
            return 64;
        default: {
            const unreachable: never = precision;

            throw new Error(`unhandled precision: ${String(unreachable)}`);
        }
    }
}

/**
 * A field descriptor, with only the parts the contract check reads spelled out.
 * @param name - The field name.
 * @param kind - Which half of the result it belongs to.
 * @param type - Its value type.
 * @returns The descriptor.
 */
function field(name: string, kind: FieldDescriptor["kind"], type: FieldDescriptor["type"]): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `${RESULT_ROOT}.$.${name}` };
}

describe("the result shape table", () => {
    it("has an entry for every shape, keyed by the shape it describes", () => {
        assert.strictEqual(CONTRACTS.length, RESULT_SHAPES.length);

        for (const shape of RESULT_SHAPES) {
            assert.strictEqual(RESULT_SHAPE_CONTRACTS[shape].shape, shape, `${shape} is keyed under its own name`);
            assert.strictEqual(resultShapeContract(shape), RESULT_SHAPE_CONTRACTS[shape]);
        }
    });

    it("names only fields the field contract defines", () => {
        for (const contract of CONTRACTS) {
            for (const { name } of declaredNames(contract)) {
                assert.isTrue(
                    Object.hasOwn(RESULT_FIELD_CONTRACT, name),
                    `${contract.shape} names "${name}", which has no meaning declared`,
                );
            }
        }
    });

    it("never lets one field name mean two things", () => {
        // The field contract holds one entry per name, so a name cannot carry two meanings. What
        // a shape CAN get wrong is using a name on the wrong half of the result -- a per-element
        // name as a graph field, say -- which would be the same collision by another route.
        for (const contract of CONTRACTS) {
            for (const { name, kind } of declaredNames(contract)) {
                const expected = kind === "graph" ? "graph" : "element";

                assert.strictEqual(
                    RESULT_FIELD_CONTRACT[name].scope,
                    expected,
                    `${contract.shape} declares "${name}" as a ${kind} field, but it means a ${RESULT_FIELD_CONTRACT[name].scope}-level value`,
                );
            }
        }
    });

    it("defines no field that no shape uses", () => {
        const used = new Set(CONTRACTS.flatMap((contract) => declaredNames(contract).map((entry) => entry.name)));

        for (const name of RESULT_FIELD_NAMES) {
            assert.isTrue(used.has(name), `"${name}" has a meaning but no shape declares it`);
        }
    });

    it("gives every field a meaning and at least one permitted type", () => {
        for (const name of RESULT_FIELD_NAMES) {
            const entry = RESULT_FIELD_CONTRACT[name];

            assert.isAbove(entry.meaning.length, 0, `"${name}" has no meaning`);
            assert.isAbove(entry.types.length, 0, `"${name}" permits no type`);
        }
    });

    it("declares a primary field the shape itself publishes", () => {
        for (const contract of CONTRACTS) {
            if (contract.primaryField === null) {
                assert.strictEqual(contract.shape, "fact", "only a fact result has no shape-fixed primary field");
                continue;
            }

            const names = declaredNames(contract).map((entry) => entry.name);

            assert.include(names, contract.primaryField, `${contract.shape} points at a field it does not publish`);
        }
    });

    it("asks for a headline scalar only where the shape is read for one number", () => {
        for (const contract of CONTRACTS) {
            if (!contract.headlineScalar) {
                continue;
            }

            assert.include(
                contract.graphFields,
                "count",
                `${contract.shape} asks for a headline beside "count" but never declares "count"`,
            );
            assert.strictEqual(contract.layer, "highlight");
        }
    });

    it("agrees with an exhaustive switch about which shapes paint which layer", () => {
        for (const shape of RESULT_SHAPES) {
            assert.strictEqual(RESULT_SHAPE_CONTRACTS[shape].layer, layerRoleOf(shape), shape);
            assert.strictEqual(isHighlightShape(shape), layerRoleOf(shape) === "highlight", shape);
        }
    });

    it("makes exactly the three subset shapes exclusive highlights", () => {
        const highlights = RESULT_SHAPES.filter((shape) => isHighlightShape(shape));

        assert.deepStrictEqual([...highlights], ["path", "node-set", "edge-set"]);
    });
});

describe("checkShapeContract", () => {
    it("passes a field list that publishes everything its shape declares", () => {
        const fields = [
            field("value", "node", "number"),
            field("rank", "node", "integer"),
            field("percentile", "node", "number"),
            field("min", "graph", "number"),
            field("max", "graph", "number"),
            field("median", "graph", "number"),
            field("mean", "graph", "number"),
            field("measured", "graph", "integer"),
            field("normalization", "graph", "string"),
            field("tiedAtMin", "graph", "integer"),
        ];

        assert.deepStrictEqual(checkShapeContract("node-metric", fields), []);
    });

    it("reports a required field that is missing", () => {
        const violations = checkShapeContract("community", [
            field("group", "node", "integer"),
            field("groupCount", "graph", "integer"),
            field("sizes", "graph", "table"),
        ]);

        assert.strictEqual(violations.length, 1);
        assert.strictEqual(violations[0].field, "groupSize");
        assert.strictEqual(violations[0].kind, "node");
    });

    it("reports a required field declared on the wrong half of the result", () => {
        const violations = checkShapeContract("edge-metric", [
            field("value", "node", "number"),
            field("rank", "edge", "integer"),
            field("percentile", "edge", "number"),
            field("min", "graph", "number"),
            field("max", "graph", "number"),
            field("median", "graph", "number"),
            field("mean", "graph", "number"),
            field("measured", "graph", "integer"),
            field("normalization", "graph", "string"),
            field("tiedAtMin", "graph", "integer"),
        ]);

        assert.strictEqual(violations.length, 1);
        assert.strictEqual(violations[0].field, "value");
        assert.strictEqual(violations[0].kind, "edge");
    });

    it("reports a required field carrying a type its meaning does not permit", () => {
        const violations = checkShapeContract("layered-grouping", [
            field("level", "node", "string"),
            field("levelSize", "node", "integer"),
            field("levelCount", "graph", "integer"),
            field("sizes", "graph", "table"),
        ]);

        assert.strictEqual(violations.length, 1);
        assert.strictEqual(violations[0].field, "level");
        assert.include(violations[0].reason, "\"integer\"");
    });

    it("accepts a shape's optional graph field being absent, and present", () => {
        const base = [
            field("group", "node", "integer"),
            field("groupSize", "node", "integer"),
            field("groupCount", "graph", "integer"),
            field("sizes", "graph", "table"),
        ];

        assert.deepStrictEqual(checkShapeContract("community", base), []);
        assert.deepStrictEqual(checkShapeContract("community", [...base, field("modularity", "graph", "number")]), []);
    });

    it("asks a set result for the one number it is actually read for", () => {
        const withoutHeadline = [field("in", "edge", "boolean"), field("count", "graph", "integer")];
        const violations = checkShapeContract("edge-set", withoutHeadline);

        assert.strictEqual(violations.length, 1);
        assert.strictEqual(violations[0].field, null);
        assert.strictEqual(violations[0].kind, "graph");

        const withHeadline = [...withoutHeadline, field("totalWeight", "graph", "number")];

        assert.deepStrictEqual(checkShapeContract("edge-set", withHeadline), []);
    });

    it("requires nothing of a fact result, whose scalars are its own", () => {
        assert.deepStrictEqual(checkShapeContract("fact", []), []);
    });
});

describe("the built-in catalogue", () => {
    it("fills every field the shape it claims declares", () => {
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            const violations = checkShapeContract(descriptor.shape, descriptor.fields);
            const reasons = violations.map((violation) => violation.reason).join("; ");

            assert.deepStrictEqual(violations, [], `${descriptor.key} (${descriptor.shape}): ${reasons}`);
        }
    });

    it("writes every static field path against the run-id placeholder", () => {
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            for (const declared of descriptor.fields) {
                assert.strictEqual(
                    declared.path,
                    `${RESULT_ROOT}.${RESULT_PATH_RUN_PLACEHOLDER}.${declared.name}`,
                    `${descriptor.key}.${declared.name}`,
                );
            }
        }
    });
});

describe("result paths", () => {
    it("addresses a field under its run", () => {
        assert.strictEqual(resultPath("louvain", "group"), "results.louvain.group");
        assert.strictEqual(resultPath("louvain"), "results.louvain");
    });

    it("binds a descriptor's placeholder path to a run", () => {
        assert.strictEqual(bindResultPath("results.$.value", "betweenness"), "results.betweenness.value");
        assert.strictEqual(bindResultPath("data.weight", "betweenness"), "data.weight");
    });
});

describe("run identity and status", () => {
    it("accepts a selector-safe id and refuses everything else", () => {
        assert.isTrue(isRunId("louvain"));
        assert.isTrue(isRunId("louvain_r1-2"));
        assert.isFalse(isRunId("Louvain"), "an id ends up in a selector, so it is lower case");
        assert.isFalse(isRunId("2louvain"), "an id starts with a letter");
        assert.isFalse(isRunId("louvain.2"), "a dot would split the path");
        assert.isFalse(isRunId(""));
        assert.isFalse(isRunId(7));
        assert.isTrue(RUN_ID_PATTERN.test("a"));
    });

    it("narrows a status string, and says which statuses are final", () => {
        for (const status of RUN_STATUSES) {
            assert.isTrue(isRunStatus(status));
        }

        assert.isFalse(isRunStatus("done"));

        const terminal = RUN_STATUSES.filter((status: RunStatus) => isTerminalRunStatus(status));

        assert.deepStrictEqual([...terminal], ["succeeded", "failed", "canceled"]);
    });

    it("keeps a time-boxed stop out of the failure statuses", () => {
        // A run that hits its time box resolves rather than rejecting, so there is deliberately
        // no "partial" status: partial is a flag on a run that SUCCEEDED.
        assert.notInclude([...RUN_STATUSES], "partial");
    });
});

describe("the run type", () => {
    it("is a PromiseLike and not a Promise", () => {
        // A Promise subclass would send every unawaited failure to the window as an unhandled
        // rejection, which an element driven by click handlers cannot afford. These two
        // assignability checks are evaluated by the compiler; the assertions only keep them
        // from being deleted as unused.
        type Assignable<A, B> = A extends B ? true : false;

        const isPromiseLike: Assignable<Run<number>, PromiseLike<number>> = true;
        const isPromise: Assignable<Run<number>, Promise<number>> = false;

        assert.isTrue(isPromiseLike);
        assert.isFalse(isPromise);
    });

    it("reports precision as one of two arithmetics", () => {
        assert.strictEqual(precisionBits("f32"), 32);
        assert.strictEqual(precisionBits("f64"), 64);
    });
});
