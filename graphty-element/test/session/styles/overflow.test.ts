/**
 * @file What a categorical colour encoding does with more groups than its palette can keep apart.
 *
 * `encode({ overflow })` picks one of three answers, and the default is written into the layer by
 * `encode()` itself, so a saved document says which one it was drawn with.
 */

import { assert, describe, it } from "vitest";

import type { Channel, FieldDescriptor, LayerSpec, RunId } from "../../../src/catalog/types";
import { OKABE_ITO_COLORS, OTHER_GROUP_COLOR } from "../../../src/config/palettes/categorical";
import { isGraphtyError } from "../../../src/errors";
import type { RunRef } from "../../../src/session/results/types";
import type { ColorValue } from "../../../src/session/styles/channels";
import {
    type EncodedValue,
    OVERFLOW_SHAPES,
    prepareBinding,
    type PreparedBinding,
    type RuleBinding,
} from "../../../src/session/styles/encoding";
import {
    type EncodingRun,
    type EncodingSource,
    type EncodingSpec,
    planEncoding,
} from "../../../src/session/styles/EncodingSpec";
import { checkLayerSpec } from "../../../src/session/styles/Layer";
import { buildLegend } from "../../../src/session/styles/legend";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createScaleRegistry } from "../../../src/session/styles/scales";

const scales = createScaleRegistry();

function field(name: string, kind: FieldDescriptor["kind"], type: FieldDescriptor["type"]): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.x.${name}` };
}

const LOUVAIN: EncodingRun = {
    id: "louvain",
    label: "Communities",
    algorithm: "louvain",
    params: {},
    shape: "community",
    fields: [field("group", "node", "integer")],
};

const EDGE_GROUPS: EncodingRun = {
    id: "edgegroups",
    label: "Edge groups",
    algorithm: "edge-groups",
    params: {},
    shape: "edge-metric",
    fields: [field("value", "edge", "string")],
};

const DEGREE: EncodingRun = {
    id: "degree",
    label: "Degree",
    algorithm: "degree",
    params: {},
    shape: "node-metric",
    fields: [field("value", "node", "number")],
};

const RUNS = [LOUVAIN, EDGE_GROUPS, DEGREE];

const SOURCE: EncodingSource = {
    run: (ref: RunRef) => RUNS.find((entry) => entry.id === ref),
    runIds: (): readonly RunId[] => RUNS.map((entry) => entry.id),
};

function plan(spec: EncodingSpec): LayerSpec {
    return planEncoding(spec, SOURCE);
}

function bindingOf(layer: LayerSpec, channel: Channel): RuleBinding {
    return (layer.encode ?? {})[channel] as RuleBinding;
}

function codeOf(call: () => unknown): string {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : `threw something else: ${String(error)}`;
    }

    return "did not throw";
}

function hex(value: EncodedValue | undefined): string | undefined {
    return value === undefined ? undefined : (value as ColorValue).hex.toLowerCase();
}

/**
 * A column of `groups` groups where group g0 is the largest and each later group is smaller, so
 * "largest group first" has one right answer.
 */
function column(groups: number): { names: string[]; values: string[] } {
    const names = Array.from({ length: groups }, (_, index) => `g${String(index)}`);
    const values = names.flatMap((name, index) => Array.from({ length: groups + 1 - index }, () => name));

    return { names, values };
}

function prepare(channel: Channel, binding: RuleBinding, values: readonly unknown[]): PreparedBinding {
    return prepareBinding({ channel, binding: { ...binding, by: "g" }, column: values, scales });
}

const okabe = OKABE_ITO_COLORS.map((color) => color.toLowerCase());
const grey = OTHER_GROUP_COLOR.toLowerCase();

describe("what encode() writes for overflow", () => {
    it("writes the default, other, onto a categorical colour encoding that names no palette", () => {
        assert.strictEqual(bindingOf(plan({ run: "louvain", channel: "node.color" }), "node.color").overflow, "other");
    });

    it("writes nothing onto a measurement, which has no groups to overflow", () => {
        assert.isUndefined(bindingOf(plan({ run: "degree", channel: "node.color" }), "node.color").overflow);
    });

    it("writes nothing when the caller named a palette and no overflow, so the palette is still refused", () => {
        const layer = plan({ run: "louvain", channel: "node.color", palette: "okabe-ito" });

        assert.isUndefined(bindingOf(layer, "node.color").overflow);
        assert.strictEqual(
            codeOf(() => prepare("node.color", bindingOf(layer, "node.color"), column(10).values)),
            "E_CAP_EXCEEDED",
        );
    });

    it("records an overflow the caller asked for", () => {
        const layer = plan({ run: "louvain", channel: "node.color", overflow: "extend" });

        assert.strictEqual(bindingOf(layer, "node.color").overflow, "extend");
    });
});

describe('overflow: "other"', () => {
    const { names, values } = column(10);
    const prepared = prepare("node.color", bindingOf(plan({ run: "louvain", channel: "node.color" }), "node.color"), values);

    it("keeps the palette's colours, in palette order, for the eight largest groups", () => {
        assert.strictEqual(prepared.palette?.id, "okabe-ito");
        assert.deepEqual(
            names.slice(0, 8).map((name) => hex(prepared.paint(name))),
            okabe,
        );
    });

    it("paints every remaining group one grey", () => {
        assert.strictEqual(hex(prepared.paint("g8")), grey);
        assert.strictEqual(hex(prepared.paint("g9")), grey);
        assert.notInclude(okabe, grey);
        assert.deepEqual(prepared.lumped, ["g8", "g9"]);
    });

    it("folds beyond a named palette's own capacity when the caller asked for it", () => {
        const binding = bindingOf(
            plan({ run: "louvain", channel: "node.color", palette: "tol-vibrant", overflow: "other" }),
            "node.color",
        );
        const named = prepare("node.color", binding, values);
        const painted = names.map((name) => hex(named.paint(name)));

        assert.lengthOf(new Set(painted.slice(0, 7)), 7);
        assert.deepEqual(painted.slice(7), [grey, grey, grey]);
    });

    it("says in the legend what the grey means", () => {
        const layer = plan({ run: "louvain", channel: "node.color" });
        const elements: SelectorSource = {
            nodeValue: () => undefined,
            edgeValue: () => undefined,
            nodeIdOf: (index) => `n${String(index)}`,
            edgeIdOf: (index) => `e${String(index)}`,
        };
        const checked = checkLayerSpec(layer, { id: "l0", elements, scales });

        assert.isNotNull(checked.layer, JSON.stringify(checked.result.errors));

        const compiled = checked.layer?.layer;
        if (compiled === undefined) {
            return;
        }

        const binding = bindingOf(layer, "node.color");
        const blocks = buildLegend({
            layers: () => [compiled],
            encoding: () => [prepareBinding({ channel: "node.color", binding, column: values, scales })],
            scales,
        });
        const swatches = blocks[0]?.swatches ?? [];
        const last = swatches[swatches.length - 1];

        assert.lengthOf(swatches, 9);
        assert.strictEqual(last?.label, "other: 2 groups");
        assert.strictEqual(last?.color?.toLowerCase(), grey);
    });
});

describe('overflow: "shape"', () => {
    const layer = plan({ run: "louvain", channel: "node.color", overflow: "shape" });

    it("adds a node shape binding to the same layer, so the two are added and removed together", () => {
        const shape = bindingOf(layer, "node.shape");

        assert.strictEqual(shape.by, "results.louvain.group");
        assert.strictEqual(shape.overflow, "shape");
        assert.deepEqual(layer.selector, { match: "has", path: "results.louvain.group" });
    });

    it("cycles the colours and moves to the next shape on each full cycle", () => {
        const { names, values } = column(18);
        const color = prepare("node.color", bindingOf(layer, "node.color"), values);
        const shape = prepare("node.shape", bindingOf(layer, "node.shape"), values);

        names.forEach((name, index) => {
            assert.strictEqual(hex(color.paint(name)), okabe[index % 8], `colour of ${name}`);
            assert.strictEqual(shape.paint(name), OVERFLOW_SHAPES[Math.floor(index / 8)], `shape of ${name}`);
        });
    });

    it("draws the first cycle in the element's default shape", () => {
        assert.strictEqual(OVERFLOW_SHAPES[0], "icosphere");
        assert.lengthOf(new Set(OVERFLOW_SHAPES), OVERFLOW_SHAPES.length);
    });

    it("folds what is left past every shape into the grey, and draws no shape for it", () => {
        const capacity = 8 * OVERFLOW_SHAPES.length;
        const { names, values } = column(capacity + 2);
        const color = prepare("node.color", bindingOf(layer, "node.color"), values);
        const shape = prepare("node.shape", bindingOf(layer, "node.shape"), values);

        assert.strictEqual(hex(color.paint(names[capacity])), grey);
        assert.isUndefined(shape.paint(names[capacity]));
        assert.strictEqual(shape.paint(names[capacity - 1]), OVERFLOW_SHAPES[OVERFLOW_SHAPES.length - 1]);
    });

    it("is refused on an edge encoding, because edges have no shape to cycle", () => {
        let error: unknown;
        try {
            plan({ run: "edgegroups", channel: "edge.color", overflow: "shape" });
        } catch (caught) {
            error = caught;
        }

        assert.isTrue(isGraphtyError(error));
        assert.match((error as Error).message, /shape/);
    });

    it("is refused on a hand-written edge layer too", () => {
        assert.strictEqual(
            codeOf(() => prepare("edge.color", { by: "g", scale: "ordinal", overflow: "shape" }, ["a"])),
            "E_BAD_LAYER",
        );
    });
});

describe('overflow: "extend"', () => {
    const { names, values } = column(10);

    it("gives every group a colour of its own when no palette is named", () => {
        const binding = bindingOf(plan({ run: "louvain", channel: "node.color", overflow: "extend" }), "node.color");
        const prepared = prepare("node.color", binding, values);

        assert.lengthOf(new Set(names.map((name) => hex(prepared.paint(name)))), 10);
    });

    it("keeps a named palette's colours and continues past them", () => {
        const binding = bindingOf(
            plan({ run: "louvain", channel: "node.color", palette: "okabe-ito", overflow: "extend" }),
            "node.color",
        );
        const prepared = prepare("node.color", binding, values);
        const painted = names.map((name) => hex(prepared.paint(name)));

        assert.deepEqual(painted.slice(0, 8), okabe);
        assert.lengthOf(new Set(painted), 10);
        assert.notInclude(painted, undefined);
    });
});
