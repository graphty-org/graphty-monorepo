import { assert, describe, it } from "vitest";

import type { Channel, FieldDescriptor, LayerSpec, PaletteId, RunId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import type { RunRef } from "../../../src/session/results/types";
import type { ColorValue } from "../../../src/session/styles/channels";
import {
    type BindingCounts,
    type EncodedValue,
    isBuiltInScale,
    prepareBinding,
    type PrepareBindingOptions,
    type PreparedBinding,
    requireChannel,
    type RuleBinding,
} from "../../../src/session/styles/encoding";
import {
    type EncodingRun,
    type EncodingSource,
    type EncodingSpec,
    planEncoding,
} from "../../../src/session/styles/EncodingSpec";
import { createScaleRegistry, type ScaleRegistry } from "../../../src/session/styles/scales";

/** A fresh registry per call, so one test's plugin scale never reaches the next test. */
function scales(): ScaleRegistry {
    return createScaleRegistry();
}

/** Prepare a binding over a column, with the boilerplate every case shares. */
function prepare(
    channel: Channel,
    binding: PrepareBindingOptions["binding"],
    column?: Iterable<unknown>,
    extra: Partial<PrepareBindingOptions> = {},
): PreparedBinding {
    return prepareBinding({ channel, binding, column, scales: scales(), ...extra });
}

/** The error code a call threw, so a test names the contract rather than the message. */
function codeOf(call: () => unknown): string {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : `threw something else: ${String(error)}`;
    }

    return "did not throw";
}

/** What one prepared binding counted, named so a test can assert the whole shape at once. */
function countsOf(prepared: PreparedBinding): BindingCounts {
    return prepared.counts;
}

/** The hex a painted colour carries, so a colour assertion reads as a colour. */
function hex(value: EncodedValue | undefined): string | undefined {
    return value === undefined ? undefined : (value as ColorValue).hex;
}

describe("the four things calculatedStyle was used for", () => {
    it("maps a node's degree to its size", () => {
        const prepared = prepare("node.size", { by: "results.degree.value", range: [1, 5] }, [1, 2, 3, 4]);

        assert.deepEqual(prepared.domain, [1, 4]);
        assert.strictEqual(prepared.paint(1), 1);
        assert.strictEqual(prepared.paint(4), 5);
        assert.strictEqual(prepared.paint(2.5), 3);
    });

    it("maps a degree to a size by area, which is what a radius has to do to read as a count", () => {
        const prepared = prepare("node.size", { by: "results.degree.value", scale: "sqrt", range: [1, 5] }, [1, 4, 9]);

        assert.strictEqual(prepared.paint(1), 1);
        assert.strictEqual(prepared.paint(4), 3);
        assert.strictEqual(prepared.paint(9), 5);
    });

    it("maps a community to a colour, one colour per group and never two groups to one colour", () => {
        const prepared = prepare(
            "node.color",
            { by: "results.louvain.group", scale: "ordinal", palette: "okabe-ito" },
            [0, 0, 1, 2],
        );

        assert.deepEqual(prepared.categories, ["0", "1", "2"]);
        assert.strictEqual(prepared.groups, 3);

        const painted = [prepared.paint(0), prepared.paint(1), prepared.paint(2)].map(hex);

        assert.strictEqual(new Set(painted).size, 3, "three groups must be three colours");
    });

    it("maps a node's type to its shape", () => {
        const prepared = prepare("node.shape", { by: "data.type", scale: "ordinal" }, ["gene", "gene", "protein"]);

        assert.deepEqual(prepared.categories, ["gene", "protein"]);
        assert.strictEqual(prepared.paint("gene"), "box");
        assert.strictEqual(prepared.paint("protein"), "sphere");
    });

    it("maps a node's type to a named shape, rather than to whichever shape is in that slot", () => {
        const prepared = prepare(
            "node.shape",
            { by: "data.type", scale: "ordinal", map: { gene: "icosphere", protein: "torus" } },
            ["gene", "protein"],
        );

        assert.strictEqual(prepared.paint("gene"), "icosphere");
        assert.strictEqual(prepared.paint("protein"), "torus");
    });

    it("computes a true or false value and turns a node effect on with it", () => {
        const prepared = prepare("node.wireframe", { by: "data.provisional" }, [true, false, true]);

        assert.strictEqual(prepared.paint(true), true);
        assert.strictEqual(prepared.paint(false), false);
        assert.isUndefined(prepared.paint(undefined), "an element with no value keeps what is beneath it");
    });

    it("turns a label on for the elements a run measured and leaves every other label alone", () => {
        // The closed channel set has no "label on or off" channel, so the declarative spelling of
        // "label these and nothing else" is a layer that writes node.label for the elements it
        // selects. Everything else keeps the label the layers below it gave it.
        const prepared = prepare("node.label", { by: "results.degree.value" }, [3, 7]);

        assert.strictEqual(prepared.paint(7), "7");
        assert.isUndefined(prepared.paint(undefined));
    });
});

describe("a value with no place on the scale", () => {
    it("takes the missing branch under a logarithm, and a zero is therefore not painted", () => {
        const prepared = prepare("node.color", { by: "x", scale: "log" }, [0, 1, 10, 100]);

        assert.isUndefined(prepared.paint(0), "a zero on a log scale is not painted");
        assert.isDefined(prepared.paint(1));
        assert.deepEqual(prepared.domain, [1, 100], "the extent is worked out over the plottable values");
    });

    it("is counted rather than silently drawn wrong", () => {
        const prepared = prepare("node.color", { by: "x", scale: "log" }, [0, -4, 1, 10, 100]);

        assert.strictEqual(prepared.counts.notPlottable, 2);
        assert.include(prepared.departures, "2 not plottable on a log scale");
    });

    it("is never NaN and never clamped to the domain floor", () => {
        const prepared = prepare("node.size", { by: "x", scale: "log", range: [1, 5] }, [0, 1, 100]);

        assert.isUndefined(prepared.paint(0));
        assert.notStrictEqual(prepared.paint(0), 1, "the floor of the range is a value, not a place to put a miss");
    });

    it("does the same under a significance scale, which is a logarithm by another name", () => {
        const prepared = prepare("node.color", { by: "padj", scale: "neglog10" }, [0, 0.001, 0.05, 1]);

        assert.isUndefined(prepared.paint(0));
        assert.strictEqual(prepared.counts.notPlottable, 1);
    });

    it("is painted after all when a reader asks for it by name", () => {
        const prepared = prepare(
            "node.color",
            { by: "x", scale: "log", missing: { value: "#cccccc" } },
            [0, 1, 10, 100],
        );

        assert.strictEqual(hex(prepared.paint(0)), "#cccccc");
    });

    it("says nothing at all when every value is unplottable, rather than painting an invented one", () => {
        const prepared = prepare("node.color", { by: "x", scale: "log" }, [0, -1, -2]);

        assert.isUndefined(prepared.paint(0));
        assert.isUndefined(prepared.paint(-1));
        assert.strictEqual(prepared.counts.notPlottable, 3);
        assert.include(prepared.departures, "no value is plottable on a log scale");
    });
});

describe("an element the run never measured", () => {
    it("is not painted at all, rather than painted a default", () => {
        const prepared = prepare("node.color", { by: "results.betweenness.value" }, [0.1, 0.9]);

        assert.isUndefined(prepared.paint(undefined));
        assert.isUndefined(prepared.paint(null));
    });

    it("is not painted a muted grey either, unless the layer says so in writing", () => {
        const asked = prepare(
            "node.color",
            { by: "results.betweenness.value", missing: { value: "#888888" } },
            [0.1, 0.9],
        );

        assert.strictEqual(hex(asked.paint(undefined)), "#888888");
    });

    it("counts exactly what it read, and every figure it prints comes from that", () => {
        const prepared = prepare("node.color", { by: "x", scale: "log" }, [0, 1, 10, null], { unmeasured: 5 });

        assert.deepEqual(countsOf(prepared), {
            seen: 4,
            unreadable: 1,
            notPlottable: 1,
            clamped: 0,
            other: 0,
            unmeasured: 5,
        });
    });

    it("is counted for the legend when the caller says how many there were", () => {
        const prepared = prepare("node.color", { by: "results.betweenness.value" }, [0.1, 0.9], { unmeasured: 312 });

        assert.strictEqual(prepared.counts.unmeasured, 312);
        assert.include(prepared.departures, "not measured (312)");
    });

    it("is not painted on a channel that carries words either", () => {
        const prepared = prepare("node.shape", { by: "data.type", scale: "ordinal" }, ["gene"]);

        assert.isUndefined(prepared.paint(undefined));
    });
});

describe("the domain", () => {
    it("is the extent of the column when nothing says otherwise", () => {
        assert.deepEqual(prepare("node.size", { by: "x" }, [4, 1, 9]).domain, [1, 9]);
    });

    it("is the extent of the column when it is asked for by name", () => {
        assert.deepEqual(prepare("node.size", { by: "x", domain: "auto" }, [4, 1, 9]).domain, [1, 9]);
    });

    it("is what the binding says when the binding says", () => {
        assert.deepEqual(prepare("node.size", { by: "x", domain: [0, 10] }, [4, 1, 9]).domain, [0, 10]);
    });

    it("is cut at the percentiles a clamp names, and the outliers are counted", () => {
        const column = Array.from({ length: 101 }, (_unused, index) => index);
        const prepared = prepare("node.size", { by: "x", clamp: [2, 98], range: [0, 1] }, column);

        assert.deepEqual(prepared.domain, [2, 98]);
        assert.strictEqual(prepared.counts.clamped, 4);
        assert.include(prepared.departures, "clamped at p2/p98");
    });

    it("refuses to be set twice, because a domain and a clamp cannot both win", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.size", { by: "x", domain: [0, 10], clamp: [2, 98] }, [1, 2])),
            "E_BAD_LAYER",
        );
    });

    it("refuses a clamp that is not a pair of percentiles", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.size", { by: "x", clamp: [98, 2] }, [1, 2])),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.size", { by: "x", clamp: [-1, 98] }, [1, 2])),
            "E_BAD_LAYER",
        );
    });

    it("is refused rather than invented when the column it would be worked out from is absent", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.size", { by: "x" })),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.color", { by: "x", scale: "ordinal" })),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.size", { by: "x", scale: "quantile" })),
            "E_BAD_LAYER",
        );
    });

    it("is not needed, and not asked for, when the binding states it outright", () => {
        const prepared = prepareBinding({
            channel: "node.size",
            binding: { by: "x", domain: [0, 10], range: [0, 1] },
            scales: scales(),
        });

        assert.strictEqual(prepared.paint(5), 0.5);
    });

    it("says so when the column measured nothing", () => {
        assert.include(prepare("node.size", { by: "x" }, []).departures, "nothing measured");
    });
});

describe("the groupings", () => {
    it("cuts equal ranges out of the domain", () => {
        const prepared = prepare("node.size", { by: "x", scale: "bins", bins: 4, range: [0, 3] }, [0, 10]);

        assert.strictEqual(prepared.groups, 4);
        assert.strictEqual(prepared.paint(0), 0);
        assert.strictEqual(prepared.paint(9.9), 3);
    });

    it("cuts groups of equal count at the column's own quartiles", () => {
        const prepared = prepare("node.size", { by: "x", scale: "quantile", range: [0, 3] }, [1, 2, 3, 4, 5, 6, 7, 8]);

        assert.strictEqual(prepared.groups, 4);
        assert.strictEqual(prepared.paint(1), 0);
        assert.strictEqual(prepared.paint(8), 3);
    });

    it("numbers the categories the column holds, largest group first", () => {
        const prepared = prepare("node.color", { by: "g", scale: "ordinal" }, ["c", "b", "b", "a", "a", "a"]);

        assert.deepEqual(prepared.categories, ["a", "b", "c"]);
    });

    it("breaks a tie in size by name, so preparing the same column twice gives the same order", () => {
        const prepared = prepare("node.color", { by: "g", scale: "ordinal" }, ["z", "y", "x"]);

        assert.deepEqual(prepared.categories, ["x", "y", "z"]);
    });

    it("reads a number and a boolean as the same category names the ordinal scale reads", () => {
        const numbers = prepare("node.color", { by: "g", scale: "ordinal" }, [3, 3, 7]);
        const flags = prepare("node.color", { by: "g", scale: "ordinal" }, [true, false, false]);

        assert.deepEqual(numbers.categories, ["3", "7"]);
        assert.deepEqual(flags.categories, ["false", "true"]);
        assert.notStrictEqual(hex(flags.paint(true)), hex(flags.paint(false)));
        assert.isDefined(numbers.paint(3), "the name the category list holds is the name the scale looks up");
    });
});

describe("the palette's capacity", () => {
    it("refuses to wrap, so group eight and group zero never share a colour", () => {
        const column = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

        assert.strictEqual(
            codeOf(() => prepare("node.color", { by: "g", scale: "ordinal", palette: "okabe-ito" }, column)),
            "E_CAP_EXCEEDED",
        );
    });

    it("fits once an 'other' bucket has absorbed the rare groups", () => {
        const column = ["a", "a", "b", "b", "c", "c", "d", "d", "e", "e", "f", "f", "g", "g", "h", "h", "i"];
        const prepared = prepare(
            "node.color",
            { by: "g", scale: "ordinal", palette: "okabe-ito", other: { threshold: 2, value: "#cccccc" } },
            column,
        );

        assert.strictEqual(prepared.counts.other, 1);
        assert.strictEqual(hex(prepared.paint("i")), "#cccccc");
        assert.notStrictEqual(hex(prepared.paint("a")), "#cccccc");
        assert.include(prepared.departures, '1 lumped into "other"');
    });

    it("applies to a channel that carries one of a fixed list, for the same reason", () => {
        assert.strictEqual(
            codeOf(() => prepare("edge.style", { by: "x", scale: "bins", bins: 10 }, [0, 1])),
            "E_CAP_EXCEEDED",
        );
    });

    it("refuses an 'other' bucket on a scale that reads numbers, rather than ignoring it", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.color", { by: "x", other: { threshold: 2, value: "#cccccc" } }, [1, 2])),
            "E_BAD_LAYER",
        );
    });
});

describe("a literal binding", () => {
    it("writes one colour to every element the layer selects", () => {
        const prepared = prepare("node.color", { value: "#ff9900" });

        assert.strictEqual(hex(prepared.paint(undefined)), "#ff9900");
        assert.strictEqual(hex(prepared.paint(42)), "#ff9900");
        assert.isNull(prepared.path);
        assert.isNull(prepared.scale);
    });

    it("writes a number, a word and a switch", () => {
        assert.strictEqual(prepare("node.size", { value: 3 }).paint(undefined), 3);
        assert.strictEqual(prepare("node.shape", { value: "torus" }).paint(undefined), "torus");
        assert.strictEqual(prepare("node.wireframe", { value: true }).paint(undefined), true);
    });

    it("refuses a value the channel does not carry, with the code its validation reports", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.shape", { value: "plane" })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.opacity", { value: 1.5 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.wireframe", { value: 7 })),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.color", { value: "not a colour" })),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.label", { value: 42 })),
            "E_BAD_LAYER",
        );
    });

    it("takes a label style, which is the one channel value that is an object", () => {
        const prepared = prepare("node.labelStyle", { value: { sizePx: 18, weight: "bold" } });

        assert.deepEqual(prepared.paint(undefined), { sizePx: 18, weight: "bold" });
    });
});

describe("what a rule cannot be pointed at", () => {
    it("refuses a channel the element draws nothing for", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.marker", { by: "x" }, ["a"])),
            "E_UNSUPPORTED",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.marker", { value: "a badge" })),
            "E_UNSUPPORTED",
        );
    });

    it("refuses to bind a whole label style to a path, because no scale produces one", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.labelStyle", { by: "x" }, ["a"])),
            "E_BAD_LAYER",
        );
    });

    it("refuses a position where a word belongs", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.label", { by: "x", scale: "linear" }, [1, 2])),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.wireframe", { by: "x", scale: "sqrt" }, [1, 2])),
            "E_BAD_LAYER",
        );
    });

    it("refuses a channel that does not exist, which is the edge of the closed set", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.sparkle" as Channel, { value: 1 })),
            "E_UNKNOWN_CHANNEL",
        );
        assert.strictEqual(
            codeOf(() => requireChannel("node.sparkle")),
            "E_UNKNOWN_CHANNEL",
        );
        assert.strictEqual(requireChannel("node.color").target, "node");
    });

    it("refuses a scale nobody registered", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.color", { by: "x", scale: "rainbow" }, [1, 2])),
            "E_UNKNOWN_SCALE",
        );
    });

    it("refuses a missing value the channel does not carry", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.shape", { by: "x", missing: { value: "plane" } }, ["a"])),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.color", { by: "x", missing: { value: 4 } }, [1, 2])),
            "E_BAD_LAYER",
        );
    });

    it("refuses a per-value override the channel does not carry", () => {
        assert.strictEqual(
            codeOf(() => prepare("node.shape", { by: "x", map: { gene: "plane" } }, ["gene"])),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => prepare("node.color", { by: "x", map: { gene: "not a colour" } }, ["gene"])),
            "E_BAD_LAYER",
        );
    });

    it("takes a missing value on a channel that is on or off, which map and missing spell as words", () => {
        const prepared = prepare("node.wireframe", { by: "x", missing: { value: "false" } }, [true]);

        assert.strictEqual(prepared.paint(undefined), false);
    });
});

describe("the registered scale, which is the escape hatch", () => {
    /** A registry holding one plugin scale that produces a finished channel value. */
    function withPlugin(
        map: (value: unknown) => string | number,
        domainKind: "categorical" | "numeric",
    ): ScaleRegistry {
        const registry = scales();
        registry.register({ name: "plugin", plainName: "A Plugin Scale", domainKind, options: [], map });

        return registry;
    }

    it("maps a value onto a channel that already exists", () => {
        const registry = withPlugin((value) => (Number(value) > 5 ? "#ff0000" : "#0000ff"), "numeric");
        const prepared = prepareBinding({
            channel: "node.color",
            binding: { by: "x", scale: "plugin" },
            column: [1, 9],
            scales: registry,
        });

        assert.strictEqual(hex(prepared.paint(9)), "#ff0000");
        assert.strictEqual(hex(prepared.paint(1)), "#0000ff");
    });

    it("cannot invent a channel, only fill one", () => {
        const registry = withPlugin(() => "#ff0000", "numeric");

        assert.strictEqual(
            codeOf(() =>
                prepareBinding({
                    channel: "node.aura" as Channel,
                    binding: { by: "x", scale: "plugin" },
                    column: [1],
                    scales: registry,
                }),
            ),
            "E_UNKNOWN_CHANNEL",
        );
    });

    it("has what it produces checked against the channel like anything else", () => {
        const buildable = withPlugin(() => "torus", "categorical");
        const imaginary = withPlugin(() => "plane", "categorical");
        const options = { channel: "node.shape" as Channel, binding: { by: "x" } as RuleBinding, column: ["a"] };

        assert.strictEqual(
            prepareBinding({ ...options, binding: { by: "x", scale: "plugin" }, scales: buildable }).paint("a"),
            "torus",
        );
        assert.isUndefined(
            prepareBinding({ ...options, binding: { by: "x", scale: "plugin" }, scales: imaginary }).paint("a"),
            "a shape the element cannot build is not painted, not substituted",
        );
    });

    it("may produce a word for a channel that carries words, which a built-in scale may not", () => {
        const registry = withPlugin((value) => `Node ${String(value)}`, "numeric");
        const prepared = prepareBinding({
            channel: "node.label",
            binding: { by: "x", scale: "plugin" },
            column: [1, 2],
            scales: registry,
        });

        assert.strictEqual(prepared.paint(2), "Node 2");
    });

    it("is told apart from a built-in by name, and there is nothing else to tell them apart by", () => {
        assert.isTrue(isBuiltInScale("linear"));
        assert.isTrue(isBuiltInScale("passthrough"));
        assert.isFalse(isBuiltInScale("plugin"));
    });
});

describe("reading a value the way the scales read it", () => {
    it("takes a column of numbers that arrived as text", () => {
        const prepared = prepare("node.size", { by: "x", range: [0, 1] }, ["3", "5"]);

        assert.deepEqual(prepared.domain, [3, 5]);
        assert.strictEqual(prepared.paint("3"), 0);
        assert.strictEqual(prepared.paint("5"), 1);
    });

    it("counts what the scale cannot read rather than folding it into the extent", () => {
        const prepared = prepare("node.size", { by: "x" }, [3, 5, null, "elephant", undefined]);

        assert.deepEqual(prepared.domain, [3, 5]);
        assert.strictEqual(prepared.counts.seen, 5);
        assert.strictEqual(prepared.counts.unreadable, 3);
        assert.include(prepared.departures, "3 carry no value the scale can read");
    });

    it("keys a per-value override by the name the ordinal scale looks the value up under", () => {
        const byNumber = prepare("node.color", { by: "g", map: { "3": "#ff0000" } }, [1, 3, 5]);
        const byFlag = prepare("node.color", { by: "g", scale: "passthrough", map: { true: "#00ff00" } }, [
            true,
            false,
        ]);

        assert.strictEqual(hex(byNumber.paint(3)), "#ff0000");
        assert.notStrictEqual(hex(byNumber.paint(1)), "#ff0000");
        assert.strictEqual(hex(byFlag.paint(true)), "#00ff00");
    });
});

// ---------------------------------------------------------------------------------------------
// encode()
// ---------------------------------------------------------------------------------------------

/** One published field, spelled out so a test can say exactly what a run offers. */
function field(
    name: string,
    kind: FieldDescriptor["kind"],
    type: FieldDescriptor["type"],
    runId: RunId = "$",
): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/** A centrality run: a number per node. */
const BETWEENNESS: EncodingRun = {
    id: "betweenness",
    label: "Betweenness",
    algorithm: "betweenness",
    params: { normalized: true },
    shape: "node-metric",
    fields: [
        field("value", "node", "number"),
        field("rank", "node", "integer"),
        field("percentile", "node", "number"),
        field("max", "graph", "number"),
    ],
};

/** A partition run: a group per node. */
const LOUVAIN: EncodingRun = {
    id: "louvain",
    label: "Communities",
    algorithm: "louvain",
    params: {},
    shape: "community",
    fields: [field("group", "node", "integer"), field("groupSize", "node", "integer")],
};

/** A flow run: a number per edge. */
const FLOW: EncodingRun = {
    id: "flow",
    label: "Flow",
    algorithm: "max-flow",
    params: {},
    shape: "edge-metric",
    fields: [field("value", "edge", "number")],
};

/** A route run, which names a subset rather than measuring everything. */
const ROUTE: EncodingRun = {
    id: "route",
    label: "Shortest Path",
    algorithm: "shortest-path",
    params: {},
    shape: "path",
    fields: [field("onPath", "node", "boolean"), field("order", "node", "integer")],
};

/** A prediction run, which publishes a table and nothing per element. */
const PAIRS: EncodingRun = {
    id: "pairs",
    label: "Link Prediction",
    algorithm: "link-prediction",
    params: {},
    shape: "pair-list",
    fields: [field("pairs", "graph", "table")],
};

/** Every run these tests can look up. */
const RUNS: readonly EncodingRun[] = [BETWEENNESS, LOUVAIN, FLOW, ROUTE, PAIRS];

/** A source over the runs above, which is all `encode()` needs from a session. */
const SOURCE: EncodingSource = {
    run: (ref: RunRef): EncodingRun | undefined => RUNS.find((entry) => entry.id === ref),
    runIds: (): readonly RunId[] => RUNS.map((entry) => entry.id),
};

/** Plan one encoding over the runs above. */
function plan(spec: EncodingSpec): LayerSpec {
    return planEncoding(spec, SOURCE);
}

/** The binding one generated layer carries for its channel. */
function bindingOf(layer: LayerSpec, channel: Channel): RuleBinding {
    const encode = layer.encode ?? {};

    return encode[channel] as RuleBinding;
}

describe("encode()", () => {
    it("writes the selector itself, and writes a presence test rather than an expression", () => {
        const layer = plan({ run: "betweenness", channel: "node.color" });

        assert.deepEqual(layer.selector, { match: "has", path: "results.betweenness.value" });
    });

    it("scopes the layer to exactly the elements the run measured", () => {
        const layer = plan({ run: "louvain", channel: "node.color" });

        assert.deepEqual(layer.selector, { match: "has", path: "results.louvain.group" });
    });

    it("reads the field the shape declares primary, so nobody opens the catalogue to name it", () => {
        assert.strictEqual(
            bindingOf(plan({ run: "betweenness", channel: "node.color" }), "node.color").by,
            "results.betweenness.value",
        );
        assert.strictEqual(
            bindingOf(plan({ run: "louvain", channel: "node.color" }), "node.color").by,
            "results.louvain.group",
        );
    });

    it("reads another field when one is named", () => {
        const layer = plan({ run: "betweenness", field: "percentile", channel: "node.size" });

        assert.deepEqual(layer.selector, { match: "has", path: "results.betweenness.percentile" });
    });

    it("records which run, which algorithm and which parameters painted the layer", () => {
        const layer = plan({ run: "betweenness", channel: "node.color" });

        assert.deepEqual(layer.source, {
            by: "run",
            runId: "betweenness",
            algorithm: "betweenness",
            params: { normalized: true },
        });
        assert.strictEqual(layer.kind, "encoding");
        assert.strictEqual(layer.target, "node");
    });

    it("takes its target from the channel, so an edge metric paints edges", () => {
        const layer = plan({ run: "flow", channel: "edge.width" });

        assert.strictEqual(layer.target, "edge");
        assert.deepEqual(layer.selector, { match: "has", path: "results.flow.value" });
    });

    it("names the layer after the run and the channel, and takes a name when given one", () => {
        assert.strictEqual(plan({ run: "betweenness", channel: "node.color" }).name, "Betweenness - Node Colour");
        assert.strictEqual(plan({ run: "betweenness", channel: "node.color", name: "Hot spots" }).name, "Hot spots");
    });

    it("reads a measurement through a continuous scale and a partition through a categorical one", () => {
        assert.strictEqual(
            bindingOf(plan({ run: "betweenness", channel: "node.color" }), "node.color").scale,
            "linear",
        );
        assert.strictEqual(bindingOf(plan({ run: "louvain", channel: "node.color" }), "node.color").scale, "ordinal");
    });

    it("reads a partition's group size as the measurement it is, rather than as a group", () => {
        const layer = plan({ run: "louvain", field: "groupSize", channel: "node.size" });

        assert.strictEqual(bindingOf(layer, "node.size").scale, "linear");
    });

    it("picks a palette that never wraps for groups and a ramp for measurements", () => {
        const groups: PaletteId = "okabe-ito";

        assert.strictEqual(bindingOf(plan({ run: "louvain", channel: "node.color" }), "node.color").palette, groups);
        assert.strictEqual(
            bindingOf(plan({ run: "betweenness", channel: "node.color" }), "node.color").palette,
            "viridis",
        );
    });

    it("leaves the palette off a channel that carries no colour", () => {
        assert.isUndefined(bindingOf(plan({ run: "betweenness", channel: "node.size" }), "node.size").palette);
    });

    it("carries the taste it was given through to the binding", () => {
        const layer = plan({
            run: "betweenness",
            channel: "node.color",
            scale: "sqrt",
            palette: "plasma",
            clamp: [2, 98],
            reverse: true,
            missing: { value: "#cccccc" },
        });
        const binding = bindingOf(layer, "node.color");

        assert.strictEqual(binding.scale, "sqrt");
        assert.strictEqual(binding.palette, "plasma");
        assert.deepEqual(binding.clamp, [2, 98]);
        assert.strictEqual(binding.reverse, true);
        assert.deepEqual(binding.missing, { value: "#cccccc" });
    });

    it("generates a layer the binding preparation then accepts", () => {
        const layer = plan({ run: "louvain", channel: "node.color" });
        const prepared = prepareBinding({
            channel: "node.color",
            binding: bindingOf(layer, "node.color"),
            column: [0, 0, 1, 2],
            scales: scales(),
        });

        assert.strictEqual(prepared.groups, 3);
        assert.strictEqual(prepared.palette?.id, "okabe-ito");
    });
});

describe("what encode() refuses", () => {
    it("refuses a run this session does not hold, with the nearest names", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "betwenness", channel: "node.color" })),
            "E_UNKNOWN_RUN",
        );

        try {
            plan({ run: "betwenness", channel: "node.color" });
            assert.fail("planning should have thrown");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.include(isGraphtyError(error) ? (error.details.candidates as string[]) : [], "betweenness");
        }
    });

    it("refuses a field the run does not publish", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "betweenness", field: "valu", channel: "node.color" })),
            "E_UNKNOWN_ATTRIBUTE",
        );
    });

    it("refuses a field published for the other half of the graph", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "flow", channel: "node.color" })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => plan({ run: "betweenness", channel: "edge.color" })),
            "E_BAD_COMMAND",
        );
    });

    it("refuses a field that is one number for the whole graph", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "betweenness", field: "max", channel: "node.size" })),
            "E_BAD_COMMAND",
        );
    });

    it("refuses a result that names a subset, and says which verb paints one", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "route", channel: "node.color" })),
            "E_BAD_COMMAND",
        );

        try {
            plan({ run: "route", channel: "node.color" });
            assert.fail("planning should have thrown");
        } catch (error) {
            assert.include(error instanceof Error ? error.message : "", "highlight()");
        }
    });

    it("refuses a result with nothing per element on it", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "pairs", channel: "node.color" })),
            "E_BAD_COMMAND",
        );
    });

    it("refuses a channel the element does not have", () => {
        assert.strictEqual(
            codeOf(() => plan({ run: "betweenness", channel: "node.sparkle" as Channel })),
            "E_UNKNOWN_CHANNEL",
        );
    });
});
