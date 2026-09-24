import { assert, describe, it } from "vitest";

import { PALETTE_DESCRIPTORS } from "../../../src/catalog/palettes";
import { SCALE_DESCRIPTORS } from "../../../src/catalog/scales";
import { isGraphtyError } from "../../../src/errors";
import { toColorValue } from "../../../src/session/styles/channels";
import { paletteCapacity, type PreparedRamp, prepareRamp, type RampSpec } from "../../../src/session/styles/palettes";
import {
    BUILT_IN_SCALES,
    type BuiltInScaleName,
    createScaleRegistry,
    groupCount,
    isScaleMiss,
    quantileThresholds,
    type ScaleContext,
    type ScaleFn,
    type ScalePlugin,
} from "../../../src/session/styles/scales";
import { interpolatePalette } from "../../../src/utils/styleHelpers/color/interpolation";

/** A context with nothing but a domain, which is every scale's minimum. */
function over(low: number, high: number, extra: Partial<ScaleContext> = {}): ScaleContext {
    return { domain: [low, high], ...extra };
}

/** The error code a call threw, so a test can name the contract rather than the message. */
function codeOf(call: () => unknown): string {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : `threw something else: ${String(error)}`;
    }

    return "did not throw";
}

/** One scale by name, from a registry that holds only what the element ships. */
function builtIn(name: string): ScaleFn {
    return createScaleRegistry().require(name);
}

describe("the registry", () => {
    it("holds exactly the scales the catalogue describes", () => {
        assert.deepEqual(
            createScaleRegistry().names(),
            SCALE_DESCRIPTORS.map((descriptor) => descriptor.name),
        );
    });

    it("names its built-ins as a type as well as at run time", () => {
        const names: readonly BuiltInScaleName[] = ["linear", "log", "neglog10", "sqrt", "pow", "bins", "quantile", "ordinal", "passthrough"];

        assert.deepEqual([...names].sort(), Object.keys(BUILT_IN_SCALES).sort());
    });

    it("has an implementation for every described scale and describes every implementation", () => {
        // The two lists are the same list seen twice. A descriptor with no implementation offers
        // a consumer a scale that paints nothing; an implementation with no descriptor is a
        // scale no form can find.
        assert.deepEqual(
            [...SCALE_DESCRIPTORS.map((descriptor) => descriptor.name)].sort(),
            Object.keys(BUILT_IN_SCALES).sort(),
        );
    });

    it("hands back the catalogue entry, without the code attached to it", () => {
        const described = createScaleRegistry().describe("quantile");

        assert.strictEqual(described?.plainName, "Equal Counts");
        assert.isUndefined((described as unknown as { map?: unknown }).map);
    });

    it("answers undefined for a name nobody registered, and throws when told it must have one", () => {
        const registry = createScaleRegistry();

        assert.isUndefined(registry.get("rainbow"));
        assert.strictEqual(codeOf(() => registry.require("rainbow")), "E_UNKNOWN_SCALE");
    });

    it("says what is available when it refuses a name", () => {
        try {
            createScaleRegistry().require("rainbow");
            assert.fail("require should have thrown");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.include(isGraphtyError(error) ? (error.details.available as string[]) : [], "linear");
        }
    });

    it("takes a plugin's scale and reads it like a built-in", () => {
        const registry = createScaleRegistry();
        const plugin: ScalePlugin = {
            name: "always-red",
            plainName: "Always Red",
            domainKind: "numeric",
            options: [],
            map: () => "#ff0000",
        };
        registry.register(plugin);

        assert.strictEqual(registry.require("always-red")(1, over(0, 10)), "#ff0000");
        assert.include(registry.names(), "always-red");
    });

    it("refuses to shadow a name that is already taken", () => {
        const registry = createScaleRegistry();
        const plugin = { name: "linear", plainName: "Mine", domainKind: "numeric", options: [], map: () => 0 } as const;

        assert.strictEqual(codeOf(() => { registry.register(plugin); }), "E_DUPLICATE_PLUGIN");
    });

    it("is per session, so one registry's plugin is not another's", () => {
        const mine = createScaleRegistry();
        mine.register({ name: "mine", plainName: "Mine", domainKind: "numeric", options: [], map: () => 1 });

        assert.isUndefined(createScaleRegistry().get("mine"));
    });
});

describe("linear", () => {
    const linear = builtIn("linear");

    it("places a value where it sits between the ends", () => {
        assert.strictEqual(linear(0, over(0, 10)), 0);
        assert.strictEqual(linear(5, over(0, 10)), 0.5);
        assert.strictEqual(linear(10, over(0, 10)), 1);
    });

    it("clamps a value outside the domain rather than running off the end of a palette", () => {
        assert.strictEqual(linear(-50, over(0, 10)), 0);
        assert.strictEqual(linear(50, over(0, 10)), 1);
    });

    it("answers the near end when every value is the same", () => {
        // A degenerate domain has no spread to place anything in. The value is at once the
        // smallest and the largest, and the scale reports the smallest.
        assert.strictEqual(linear(7, over(7, 7)), 0);
        assert.strictEqual(linear(7, over(7, 7, { range: [4, 9] })), 4);
    });

    it("misses on a domain that is not numbers at all", () => {
        assert.isTrue(isScaleMiss(linear(5, over(Number.NaN, 10))));
        assert.isTrue(isScaleMiss(linear(5, over(0, Number.POSITIVE_INFINITY))));
    });

    it("misses on a value it cannot read, which is what leaves an unmeasured element unpainted", () => {
        for (const value of [undefined, null, Number.NaN, "", "  ", "seven", {}, [], true]) {
            assert.isTrue(isScaleMiss(linear(value, over(0, 10))), JSON.stringify(value) ?? "undefined");
        }
    });

    it("reads a number that arrived as text, because an imported column often does", () => {
        assert.strictEqual(linear("5", over(0, 10)), 0.5);
    });

    it("maps into the range the binding asked for", () => {
        assert.strictEqual(linear(5, over(0, 10, { range: [10, 20] })), 15);
    });

    it("sends the smallest value to the far end when reversed", () => {
        assert.strictEqual(linear(0, over(0, 10, { reverse: true })), 1);
        assert.strictEqual(linear(10, over(0, 10, { reverse: true })), 0);
        assert.strictEqual(linear(0, over(0, 10, { reverse: true, range: [1, 5] })), 5);
    });

    it("puts the midpoint in the middle, whichever side of centre it sits", () => {
        assert.strictEqual(linear(8, over(0, 10, { midpoint: 8 })), 0.5);
        assert.strictEqual(linear(4, over(0, 10, { midpoint: 8 })), 0.25);
        assert.strictEqual(linear(9, over(0, 10, { midpoint: 8 })), 0.75);
    });

    it("ignores a midpoint sitting on an end, which would be a division by nothing", () => {
        assert.strictEqual(linear(5, over(0, 10, { midpoint: 0 })), 0.5);
        assert.strictEqual(linear(5, over(0, 10, { midpoint: Number.NaN })), 0.5);
    });

    it("runs a descending domain without inverting itself", () => {
        assert.strictEqual(linear(10, over(10, 0)), 0);
        assert.strictEqual(linear(0, over(10, 0)), 1);
    });
});

describe("log", () => {
    const log = builtIn("log");

    it("places a value by its order of magnitude", () => {
        assert.strictEqual(log(1, over(1, 1000)), 0);
        assert.strictEqual(log(1000, over(1, 1000)), 1);
        assert.closeTo(log(10, over(1, 1000)) as number, 1 / 3, 1e-12);
    });

    it("misses on zero and on a negative, which is the common case and not the edge one", () => {
        // Betweenness has zeros on every real graph. A zero is not plottable on a log scale: it
        // is not NaN, not clamped to the floor and not quietly reassigned -- it is not painted.
        assert.isTrue(isScaleMiss(log(0, over(1, 1000))));
        assert.isTrue(isScaleMiss(log(-4, over(1, 1000))));
    });

    it("misses everywhere when the domain itself starts at zero, rather than inventing a floor", () => {
        // There is no honest floor to substitute. Whoever prepares the binding computes the
        // domain over the values that can be plotted.
        assert.isTrue(isScaleMiss(log(5, over(0, 1000))));
        assert.isTrue(isScaleMiss(log(5, over(-1, 1000))));
    });

    it("answers the near end when every value is the same", () => {
        assert.strictEqual(log(10, over(10, 10)), 0);
    });
});

describe("neglog10", () => {
    const neglog = builtIn("neglog10");

    it("turns a p-value into a significance, in the order the domain was given", () => {
        assert.strictEqual(neglog(1, over(1, 1e-10)), 0);
        assert.strictEqual(neglog(1e-10, over(1, 1e-10)), 1);
        assert.closeTo(neglog(1e-5, over(1, 1e-10)) as number, 0.5, 1e-12);
    });

    it("misses on zero, which is what a p-value that underflowed arrives as", () => {
        assert.isTrue(isScaleMiss(neglog(0, over(1, 1e-10))));
    });
});

describe("sqrt and pow", () => {
    const sqrt = builtIn("sqrt");
    const pow = builtIn("pow");

    it("spreads the small values out, which is what makes an area read as a magnitude", () => {
        assert.strictEqual(sqrt(0, over(0, 100)), 0);
        assert.strictEqual(sqrt(25, over(0, 100)), 0.5);
        assert.strictEqual(sqrt(100, over(0, 100)), 1);
    });

    it("keeps a negative value on the negative side instead of answering NaN", () => {
        assert.strictEqual(sqrt(-100, over(-100, 100)), 0);
        assert.strictEqual(sqrt(0, over(-100, 100)), 0.5);
    });

    it("is linear when nobody says how hard to bend", () => {
        assert.strictEqual(pow(5, over(0, 10)), 0.5);
    });

    it("bends by the exponent it was given", () => {
        assert.strictEqual(pow(25, over(0, 100, { exponent: 0.5 })), 0.5);
        assert.strictEqual(pow(5, over(0, 10, { exponent: 2 })), 0.25);
    });

    it("ignores an exponent that is not a number", () => {
        assert.strictEqual(pow(5, over(0, 10, { exponent: Number.NaN })), 0.5);
    });
});

describe("bins", () => {
    const bins = builtIn("bins");

    it("cuts five equal ranges when the binding does not say how many", () => {
        assert.strictEqual(groupCount("bins", over(0, 10)), 5);
        assert.strictEqual(bins(1, over(0, 10)), 0);
        assert.strictEqual(bins(5, over(0, 10)), 0.5);
        assert.strictEqual(bins(9.9, over(0, 10)), 1);
    });

    it("puts the top of the domain in the last group rather than one past it", () => {
        assert.strictEqual(bins(10, over(0, 10, { bins: 4 })), 1);
        assert.strictEqual(bins(1000, over(0, 10, { bins: 4 })), 1);
    });

    it("cuts at the boundaries the ranges say", () => {
        const four = over(0, 100, { bins: 4 });

        assert.strictEqual(bins(24.9, four), 0);
        assert.strictEqual(bins(25, four), 1 / 3);
        assert.strictEqual(bins(50, four), 2 / 3);
        assert.strictEqual(bins(75, four), 1);
    });

    it("answers the near end when there is one group, or when the domain is a single point", () => {
        assert.strictEqual(bins(5, over(0, 10, { bins: 1 })), 0);
        assert.strictEqual(bins(7, over(7, 7, { bins: 4 })), 0);
    });

    it("misses on a value or a domain it cannot read", () => {
        assert.isTrue(isScaleMiss(bins(undefined, over(0, 10))));
        assert.isTrue(isScaleMiss(bins(5, over(Number.NaN, 10))));
    });
});

describe("quantile", () => {
    const quantile = builtIn("quantile");

    it("sorts a value into the group its cut points put it in", () => {
        const context = over(0, 100, { thresholds: [10, 20, 30] });

        assert.strictEqual(groupCount("quantile", context), 4);
        assert.strictEqual(quantile(5, context), 0);
        assert.strictEqual(quantile(10, context), 1 / 3);
        assert.strictEqual(quantile(25, context), 2 / 3);
        assert.strictEqual(quantile(300, context), 1);
    });

    it("is one group when nothing computed a cut point, and says so rather than guessing", () => {
        assert.strictEqual(groupCount("quantile", over(0, 100)), 1);
        assert.strictEqual(quantile(42, over(0, 100)), 0);
    });

    it("misses on a value it cannot read", () => {
        assert.isTrue(isScaleMiss(quantile("nope", over(0, 100, { thresholds: [10] }))));
    });
});

describe("quantileThresholds", () => {
    it("cuts a column into groups of equal count", () => {
        const column = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const context = over(0, 0, { thresholds: quantileThresholds(column, 3) });
        const quantile = builtIn("quantile");

        assert.strictEqual(groupCount("quantile", context), 3);
        assert.deepEqual(
            column.map((value) => quantile(value, context)),
            [0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1],
        );
    });

    it("needs two groups before a cut point exists", () => {
        assert.deepEqual(quantileThresholds([1, 2, 3], 1), []);
        assert.deepEqual(quantileThresholds([1, 2, 3], 0), []);
    });

    it("has nothing to cut in an empty column", () => {
        assert.deepEqual(quantileThresholds([], 4), []);
    });

    it("drops a cut point that separates nothing, so a column of one repeated value is one group", () => {
        // Keeping them would make groups no value can land in and legend swatches counted
        // against nothing. A grouping by equal counts cannot separate values that are equal.
        assert.deepEqual(quantileThresholds([5, 5, 5, 5], 4), []);
        assert.deepEqual(quantileThresholds([0, 0, 0, 0, 0, 9], 3), []);
    });

    it("ignores the values that are not numbers", () => {
        assert.deepEqual(quantileThresholds([Number.NaN, 1, 2, 3, 4, Number.POSITIVE_INFINITY], 2), [2.5]);
    });

    it("reads a column in any order", () => {
        assert.deepEqual(quantileThresholds([9, 1, 5, 3, 7], 2), [5]);
    });
});

describe("ordinal", () => {
    const ordinal = builtIn("ordinal");

    it("gives one position per declared category, in the order they were declared", () => {
        const context = over(0, 0, { categories: ["a", "b", "c"] });

        assert.strictEqual(groupCount("ordinal", context), 3);
        assert.strictEqual(ordinal("a", context), 0);
        assert.strictEqual(ordinal("b", context), 0.5);
        assert.strictEqual(ordinal("c", context), 1);
    });

    it("misses on a value nobody declared, rather than folding it into a neighbour", () => {
        assert.isTrue(isScaleMiss(ordinal("d", over(0, 0, { categories: ["a", "b", "c"] }))));
    });

    it("misses when no categories were declared at all", () => {
        assert.isTrue(isScaleMiss(ordinal("a", over(0, 0))));
    });

    it("answers the near end when there is one category", () => {
        assert.strictEqual(ordinal("only", over(0, 0, { categories: ["only"] })), 0);
    });

    it("reads a number or a boolean as the category it names", () => {
        assert.strictEqual(ordinal(2, over(0, 0, { categories: ["1", "2"] })), 1);
        assert.strictEqual(ordinal(true, over(0, 0, { categories: ["false", "true"] })), 1);
    });

    it("misses on a value that names no category at all", () => {
        assert.isTrue(isScaleMiss(ordinal({}, over(0, 0, { categories: ["a"] }))));
        assert.isTrue(isScaleMiss(ordinal(null, over(0, 0, { categories: ["a"] }))));
    });

    it("reverses which end the first category sits at", () => {
        const context = over(0, 0, { categories: ["a", "b", "c"], reverse: true });

        assert.strictEqual(ordinal("a", context), 1);
        assert.strictEqual(ordinal("c", context), 0);
    });
});

describe("passthrough", () => {
    const passthrough = builtIn("passthrough");

    it("hands a number and a string back untouched, whatever the domain and range say", () => {
        assert.strictEqual(passthrough(42, over(0, 1, { range: [100, 200] })), 42);
        assert.strictEqual(passthrough("#ff0000", over(0, 1)), "#ff0000");
    });

    it("names a boolean rather than counting it", () => {
        assert.strictEqual(passthrough(true, over(0, 1)), "true");
        assert.strictEqual(passthrough(false, over(0, 1)), "false");
    });

    it("misses on everything else", () => {
        assert.isTrue(isScaleMiss(passthrough(undefined, over(0, 1))));
        assert.isTrue(isScaleMiss(passthrough(Number.NaN, over(0, 1))));
        assert.isTrue(isScaleMiss(passthrough({}, over(0, 1))));
    });
});

describe("groupCount", () => {
    it("answers zero for a continuous scale, which is how a palette knows to interpolate", () => {
        for (const name of ["linear", "log", "neglog10", "sqrt", "pow", "passthrough"]) {
            assert.strictEqual(groupCount(name, over(0, 10, { bins: 6 })), 0, name);
        }
    });

    it("never answers fewer than one group for a binning scale", () => {
        assert.strictEqual(groupCount("bins", over(0, 10, { bins: 0 })), 1);
        assert.strictEqual(groupCount("bins", over(0, 10, { bins: -3 })), 1);
        assert.strictEqual(groupCount("bins", over(0, 10, { bins: 3.7 })), 3);
    });
});

describe("isScaleMiss", () => {
    it("is true only of the miss", () => {
        assert.isTrue(isScaleMiss(Number.NaN));
        assert.isFalse(isScaleMiss(0));
        assert.isFalse(isScaleMiss(""));
        assert.isFalse(isScaleMiss("#ff0000"));
    });
});

describe("binding a palette to a scale", () => {
    const registry = createScaleRegistry();

    it("interpolates a continuous palette across the domain", () => {
        const spec: RampSpec = { domain: [0, 10] };
        const ramp: PreparedRamp = prepareRamp(spec, registry);

        assert.strictEqual(ramp.palette.id, "ylorbr");
        assert.strictEqual(ramp.scale, "linear");
        assert.strictEqual(ramp.groups, 0);
        assert.strictEqual(ramp.color(0)?.hex, "#ef7818");
        assert.strictEqual(ramp.color(10)?.hex, "#662506");
    });

    it("carries the numbers beside the string, so a repaint parses nothing", () => {
        assert.deepEqual(prepareRamp({ domain: [0, 10] }, registry).color(0), {
            r: 0xef,
            g: 0x78,
            b: 0x18,
            a: 1,
            hex: "#ef7818",
        });
    });

    it("picks a colour per group from a categorical palette instead of blending two hues", () => {
        const ramp = prepareRamp(
            { scale: "ordinal", palette: "okabe-ito", domain: [0, 0], categories: ["a", "b", "c"] },
            registry,
        );

        assert.strictEqual(ramp.groups, 3);
        assert.strictEqual(ramp.color("a")?.hex, "#e69f00");
        assert.strictEqual(ramp.color("b")?.hex, "#56b4e9");
        assert.strictEqual(ramp.color("c")?.hex, "#009e73");
    });

    it("reverses by reversing the scale, so one flag flips every kind of palette", () => {
        const ramp = prepareRamp(
            { scale: "ordinal", palette: "okabe-ito", domain: [0, 0], categories: ["a", "b", "c"], reverse: true },
            registry,
        );

        assert.strictEqual(ramp.color("a")?.hex, "#009e73");
        assert.strictEqual(ramp.color("c")?.hex, "#e69f00");
    });

    it("samples a continuous palette at the group positions when the scale groups", () => {
        const ramp = prepareRamp({ scale: "bins", domain: [0, 100], bins: 3 }, registry);

        assert.strictEqual(ramp.groups, 3);
        assert.strictEqual(ramp.color(0)?.hex, "#ef7818");
        assert.strictEqual(ramp.color(99)?.hex, "#662506");
    });

    it("does not paint a value with no place on the scale", () => {
        const ramp = prepareRamp({ scale: "log", domain: [1, 1000] }, registry);

        assert.isUndefined(ramp.missing);
        assert.isUndefined(ramp.color(0));
        assert.isUndefined(ramp.color(undefined));
    });

    it("paints one only when a reader asks for it by name", () => {
        const ramp = prepareRamp({ scale: "log", domain: [1, 1000], missing: { value: "#cccccc" } }, registry);

        assert.strictEqual(ramp.missing?.hex, "#cccccc");
        assert.strictEqual(ramp.color(0)?.hex, "#cccccc");
    });

    it("refuses a missing colour that is not a colour, at the edit rather than at the frame", () => {
        assert.strictEqual(
            codeOf(() => prepareRamp({ domain: [0, 1], missing: { value: "grayish" } }, registry)),
            "E_BAD_LAYER",
        );
    });

    it("refuses a palette the element does not have, and says what it does have", () => {
        // E_UNKNOWN_PALETTE rather than E_BAD_LAYER: the layer is well formed, and what is wrong
        // is that nothing on this page answers to the name -- the same failure a consumer already
        // switches on for an unknown algorithm, layout or format.
        assert.strictEqual(
            codeOf(() => prepareRamp({ domain: [0, 1], palette: "rainbow" }, registry)),
            "E_UNKNOWN_PALETTE",
        );
    });

    it("refuses a scale nobody registered", () => {
        assert.strictEqual(codeOf(() => prepareRamp({ domain: [0, 1], scale: "rainbow" }, registry)), "E_UNKNOWN_SCALE");
    });

    it("never wraps a categorical palette round to its first colour", () => {
        // Group eight sharing a colour with group zero says nothing, silently. Twelve groups
        // against an eight-colour palette is a layer that gets disabled with a reason.
        const twelve = Array.from({ length: 12 }, (_unused, index) => `g${index}`);

        assert.strictEqual(
            codeOf(() => prepareRamp({ scale: "ordinal", palette: "okabe-ito", domain: [0, 0], categories: twelve }, registry)),
            "E_CAP_EXCEEDED",
        );
    });

    it("lets a continuous palette name as many groups as are asked for", () => {
        const ramp = prepareRamp({ scale: "bins", palette: "viridis", domain: [0, 100], bins: 20 }, registry);

        assert.strictEqual(ramp.groups, 20);
    });

    it("takes the colour a registered scale produces itself, without consulting the palette", () => {
        const own = createScaleRegistry();
        own.register({
            name: "traffic",
            plainName: "Traffic Light",
            domainKind: "numeric",
            options: [],
            map: (value) => (typeof value === "number" && value > 5 ? "#ff0000" : "#00ff00"),
        });
        const ramp = prepareRamp({ scale: "traffic", domain: [0, 10] }, own);

        assert.strictEqual(ramp.color(9)?.hex, "#ff0000");
        assert.strictEqual(ramp.color(1)?.hex, "#00ff00");
    });
});

describe("the cost of a colour", () => {
    const registry = createScaleRegistry();

    it("builds each colour once, so a repaint does no string work per element", () => {
        // The same object comes back, not an equal one: the ramp is a table built at the edit,
        // which is what keeps fifty thousand elements inside one frame.
        const ramp = prepareRamp({ domain: [0, 1] }, registry);

        assert.strictEqual(ramp.color(0.42), ramp.color(0.42));
        assert.strictEqual(ramp.color(0.42), ramp.color(0.42 + 1e-7));
    });

    it("hands back the same swatch for every element in a group", () => {
        const ramp = prepareRamp(
            { scale: "ordinal", palette: "okabe-ito", domain: [0, 0], categories: ["a", "b"] },
            registry,
        );

        assert.strictEqual(ramp.color("a"), ramp.color("a"));
    });

    it("samples the ramp finely enough that the table costs no colour", () => {
        const ylorbr = PALETTE_DESCRIPTORS.find((descriptor) => descriptor.id === "ylorbr");
        assert.isDefined(ylorbr);
        const ramp = prepareRamp({ domain: [0, 1] }, registry);

        for (let step = 0; step <= 200; step++) {
            const at = step / 200;
            const exact = toColorValue(interpolatePalette(at, ylorbr.colors));
            const table = ramp.color(at);
            if (exact === null || table === undefined) {
                assert.fail(`no colour at ${at}`);
            }

            for (const channel of ["r", "g", "b"] as const) {
                assert.isAtMost(Math.abs(table[channel] - exact[channel]), 1, `${channel} at ${at}`);
            }
        }
    });

    it("hits both ends of the ramp exactly", () => {
        const ramp = prepareRamp({ domain: [0, 1] }, registry);

        assert.strictEqual(ramp.color(0)?.hex, "#ef7818");
        assert.strictEqual(ramp.color(1)?.hex, "#662506");
    });
});

describe("paletteCapacity", () => {
    it("says a continuous palette has no capacity to exceed", () => {
        const viridis = PALETTE_DESCRIPTORS.find((descriptor) => descriptor.id === "viridis");
        assert.isDefined(viridis);

        assert.deepEqual(paletteCapacity(viridis, 500), { fits: true, capacity: null, distinct: 500 });
    });

    it("says how far a categorical palette falls short", () => {
        const okabe = PALETTE_DESCRIPTORS.find((descriptor) => descriptor.id === "okabe-ito");
        assert.isDefined(okabe);

        assert.deepEqual(paletteCapacity(okabe, 8), { fits: true, capacity: 8, distinct: 8 });
        assert.deepEqual(paletteCapacity(okabe, 9), { fits: false, capacity: 8, distinct: 9 });
    });
});
