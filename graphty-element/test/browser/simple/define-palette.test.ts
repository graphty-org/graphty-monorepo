/**
 * @file The palette guide's toy examples, run on a real element: what a reader who copies them
 * sees.
 *
 * Each example is the file the guide includes (docs/examples/simple-tier/palette/), imported here
 * as it is written, so the guide cannot show code this file did not run. The examples register
 * through `definePalette`; everything below reads only what a person or a picker can observe --
 * the catalogue, the colour a style layer paints, the refusal a mistake gets.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { useBrandPalettes } from "../../../docs/examples/simple-tier/palette/use-brand-palettes";
import { definePalette, isGraphtyError } from "../../../extend";
import type { Graphty } from "../../../index.js";
import type { LayerSpec } from "../../../session";
import { operationQueueOf } from "../../../src/Graph";

/** The brand example's colours, as the guide writes them. */
const BRAND = ["#0B1D51", "#1B7F79", "#F2A65A", "#E07A1F", "#7A3E9D"] as const;

/** The brand ramp's three anchors. */
const RAMP = ["#E8F1FA", "#1B7F79", "#0B1D51"] as const;

/**
 * Seven nodes: three teams of three, two and one (so the teams are numbered alpha, bravo,
 * charlie, largest first), and a score that lands on each of the ramp's three anchors.
 */
const NODES = [
    { id: "a1", team: "alpha", score: 0 },
    { id: "a2", team: "alpha", score: 50 },
    { id: "a3", team: "alpha", score: 100 },
    { id: "b1", team: "bravo", score: 0 },
    { id: "b2", team: "bravo", score: 50 },
    { id: "c1", team: "charlie", score: 100 },
    { id: "loner" },
];
const EDGES = [
    { src: "a1", dst: "a2" },
    { src: "a2", dst: "a3" },
    { src: "a3", dst: "b1" },
    { src: "b1", dst: "b2" },
    { src: "b2", dst: "c1" },
];

/** The guide's brand example is evaluated once per page, as a module is. */
let brand: Promise<unknown> | undefined;

/**
 * Run the guide's first example: define the brand palettes.
 * @returns When the example module has run.
 */
function defineBrand(): Promise<unknown> {
    brand ??= import("../../../docs/examples/simple-tier/palette/brand-palettes");
    return brand;
}

let element: Graphty;

beforeEach(async () => {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
});

afterEach(() => {
    element.remove();
});

/**
 * Load the toy graph and wait until the element has taken it in.
 */
async function loadGraph(): Promise<void> {
    element.nodeData = NODES.map((node) => ({ ...node }));
    element.edgeData = EDGES.map((edge) => ({ ...edge }));
    await operationQueueOf(element.graph).waitForCompletion();
}

/**
 * Add a style layer through the element's session and wait for it to paint.
 * @param spec - The layer.
 */
async function addLayer(spec: LayerSpec): Promise<void> {
    await element.session.styles.add(spec);
    await operationQueueOf(element.graph).waitForCompletion();
}

/**
 * The colour a node is painted, as six-digit upper-case hex.
 * @param id - The node.
 * @returns The colour, or null when nothing paints it.
 */
function painted(id: string): string | null {
    const color = element.session.styles.explain({ node: id }).merged["node.color"];
    return color === undefined ? null : color.hex.slice(0, 7).toUpperCase();
}

/**
 * A layer that colours every node by a value.
 * @param by - The value's path.
 * @param scale - "ordinal" for groups, "linear" for amounts.
 * @param palette - The palette to name, or none to take the default.
 * @returns The layer.
 */
function colourBy(by: string, scale: "ordinal" | "linear", palette?: string): LayerSpec {
    return {
        name: `Colour by ${by}`,
        target: "node",
        selector: { match: "everything" },
        encode: {
            "node.color": {
                by,
                scale,
                ...(scale === "linear" ? { domain: [0, 100] } : {}),
                ...(palette === undefined ? {} : { palette }),
            },
        },
    };
}

/**
 * What a call was refused with.
 * @param call - The call.
 * @returns The code, the field and the message, or null when nothing was thrown.
 */
function refusal(call: () => void): { code: string; field: unknown; message: string } | null {
    try {
        call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            return { code: "not-a-graphty-error", field: null, message: String(error) };
        }

        return { code: error.code, field: error.details.field, message: error.message };
    }

    return null;
}

describe("the brand palettes from the guide's first example", () => {
    it("are listed in the catalogue a picker reads, named from their ids", async () => {
        await defineBrand();

        const offered = element.session.catalog.palettes();
        const categorical = offered.find((palette) => palette.id === "acme-brand");
        const ramp = offered.find((palette) => palette.id === "acme-brand-ramp");

        assert.isDefined(categorical, "acme-brand is offered beside the element's own palettes");
        assert.isDefined(ramp, "and so is acme-brand-ramp");
        assert.strictEqual(categorical.plainName, "Acme brand", "the name a picker shows, from the id");
        assert.strictEqual(categorical.kind, "categorical");
        assert.strictEqual(categorical.capacity, BRAND.length, "one group per colour");
        assert.deepStrictEqual([...categorical.colors], [...BRAND]);
        assert.deepStrictEqual([...categorical.colorblindSafe], [], "no colour-vision claim was made");
        assert.strictEqual(ramp.kind, "sequential");
        assert.strictEqual(ramp.capacity, null, "a ramp has no fixed number of groups");
    });

    it("paints each group one brand colour when a layer names the categorical palette", async () => {
        await defineBrand();
        await loadGraph();
        await addLayer(colourBy("data.team", "ordinal", "acme-brand"));

        assert.deepStrictEqual(
            [painted("a1"), painted("b1"), painted("c1")],
            [BRAND[0], BRAND[1], BRAND[2]],
            "alpha, bravo and charlie, largest group first, take the first three colours",
        );
        assert.strictEqual(painted("a2"), BRAND[0], "every member of a group is painted the same");
    });

    it("ramps an amount through its anchors when a layer names the sequential palette", async () => {
        await defineBrand();
        await loadGraph();
        await addLayer(colourBy("data.score", "linear", "acme-brand-ramp"));

        assert.deepStrictEqual(
            [painted("a1"), painted("a2"), painted("a3")],
            [...RAMP],
            "0, 50 and 100 land on the anchors",
        );
    });

    it("becomes the colours of every binding that names none, after the guide's use-it line", async () => {
        await defineBrand();
        useBrandPalettes(element);
        await loadGraph();
        await addLayer(colourBy("data.team", "ordinal"));

        assert.deepStrictEqual([painted("a1"), painted("b1"), painted("c1")], [BRAND[0], BRAND[1], BRAND[2]]);

        await addLayer(colourBy("data.score", "linear"));

        assert.deepStrictEqual([painted("a1"), painted("a2"), painted("a3")], [...RAMP]);

        const saved = JSON.stringify(element.session.styles.toDocument());
        assert.include(saved, '"acme-brand"', "a saved document names the palette the default resolved to");
        assert.include(saved, '"acme-brand-ramp"');
    });

    it("never wraps round: six groups on five colours paint nothing and report E_CAP_EXCEEDED", async () => {
        await defineBrand();
        element.nodeData = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, team: id }));
        await operationQueueOf(element.graph).waitForCompletion();
        const before = painted("a");
        const warned: string[] = [];
        const original = console.warn;
        console.warn = (...args: unknown[]) => warned.push(args.map(String).join(" "));
        try {
            await addLayer(colourBy("data.team", "ordinal", "acme-brand"));
        } finally {
            console.warn = original;
        }

        assert.strictEqual(painted("a"), before, "six groups do not fit five colours, so the layer paints nothing");
        assert.isTrue(
            warned.some(
                (line) => line.includes('"Colour by data.team" paints nothing') && line.includes("E_CAP_EXCEEDED"),
            ),
            `the element says why on the console; it said: ${JSON.stringify(warned)}`,
        );
    });

    it("colours a run's result with the default palette, with no style code", async () => {
        await defineBrand();
        useBrandPalettes(element);
        await loadGraph();

        const run = element.run("degree", {}, { as: "deg" });
        await run;
        const deadline = Date.now() + 5000;
        const derived = (): boolean =>
            element.session.styles.list().some((layer) => layer.source.by === "run" && layer.source.runId === run.id);
        while (!derived() && Date.now() < deadline) {
            await new Promise((settle) => setTimeout(settle, 10));
        }
        await operationQueueOf(element.graph).waitForCompletion();

        assert.strictEqual(painted("loner"), RAMP[0], "the lowest degree takes the ramp's first colour");
        assert.strictEqual(painted("a2"), RAMP[2], "the highest takes its last");
    });
});

describe("a palette defined from design tokens", () => {
    it("takes the colours the tokens hold when they are read before the call", async () => {
        document.documentElement.style.setProperty("--brand-navy", "#0B1D51");
        document.documentElement.style.setProperty("--brand-teal", "#1B7F79");
        try {
            await import("../../../docs/examples/simple-tier/palette/token-colour");
        } finally {
            document.documentElement.style.removeProperty("--brand-navy");
            document.documentElement.style.removeProperty("--brand-teal");
        }

        const defined = element.session.catalog.palettes().find((palette) => palette.id === "acme-token-brand");
        assert.isDefined(defined);
        assert.deepStrictEqual([...defined.colors], ["#0B1D51", "#1B7F79"]);
    });
});

describe("the mistakes a beginner makes with definePalette", () => {
    it("refuses a var() colour, and the message shows how to read the token", () => {
        const refused = refusal(() => {
            definePalette({ id: "acme-var", kind: "categorical", colors: ["var(--brand-navy)"] });
        });

        assert.isNotNull(refused, "var() is refused");
        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.strictEqual(refused.field, "colors");
        assert.match(refused.message, /^definePalette\("acme-var"\): /, "the message starts with the call and the id");
        assert.include(refused.message, "var(--brand-navy)", "and quotes what was written");
        assert.include(refused.message, "getComputedStyle", "and shows the fix");
    });

    it("refuses a token read too early, as an empty string, the same way", () => {
        const refused = refusal(() => {
            definePalette({ id: "acme-early", kind: "categorical", colors: ["#0B1D51", ""] });
        });

        assert.isNotNull(refused);
        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.strictEqual(refused.field, "colors");
        assert.include(refused.message, "getComputedStyle");
    });

    it("refuses a colour that is not a colour, naming it", () => {
        const refused = refusal(() => {
            definePalette({ id: "acme-typo", kind: "sequential", colors: ["#0B1D51", "navvy"] });
        });

        assert.isNotNull(refused);
        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.strictEqual(refused.field, "colors");
        assert.include(refused.message, '"navvy"');
    });

    it("refuses a kind that is not one of the three", () => {
        const refused = refusal(() => {
            definePalette({ id: "acme-kind", kind: "qualitative" as "categorical", colors: ["#0B1D51"] });
        });

        assert.isNotNull(refused);
        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.strictEqual(refused.field, "kind");
        assert.match(refused.message, /^definePalette\("acme-kind"\): /);
    });

    it("refuses an id that is not lower-case words joined by hyphens", () => {
        const refused = refusal(() => {
            definePalette({ id: "Acme Brand", kind: "categorical", colors: ["#0B1D51"] });
        });

        assert.isNotNull(refused);
        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.strictEqual(refused.field, "id");
    });
});
