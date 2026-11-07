/**
 * @file The file styles experiment, off and on. Off, a session draws no file's styles, writes none
 * into a file, and its catalog offers neither the style channels nor the values added to draw
 * other programs' files; a layer that writes one directly is still drawn, and a saved project
 * opens with the styles it was saved with. On, it is exactly what the element did before the
 * switch. Every session here names its features, so these hold in the On configuration too.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { channelsFor } from "../../catalog";
import { createGraphSession, fileStyleOf, type GraphSession } from "../../session";
import { FORMAT_DESCRIPTORS } from "../../src/catalog/formats";
import { exportSession } from "../../src/data/export";
import { isGraphtyError } from "../../src/errors";
import { FILE_STYLE_CHANNELS } from "../../src/features/fileStyles";
import { SESSION_CATALOG_TABLES } from "../../src/session/catalog";

const OFF = { features: [] };
const ON = { features: ["file-styles"] };
const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");
const MISERABLES = readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8");
const GEXF = { type: "gexf", config: { data: MISERABLES } };

// The values each channel had before the experiment's work began, written out.
const BASELINE_SHAPES = [
    "box",
    "capsule",
    "cone",
    "cylinder",
    "dodecahedron",
    "elongated_pentagonal_cupola",
    "elongated_pentagonal_dipyramid",
    "elongated_square_dipyramid",
    "geodesic",
    "goldberg",
    "hexagonal_prism",
    "icosahedron",
    "icosphere",
    "octahedron",
    "pentagonal_dipyramid",
    "pentagonal_prism",
    "pentagonal_pyramid",
    "rhombicuboctahedron",
    "sphere",
    "square_pyramid",
    "tetrahedron",
    "torus",
    "torus-knot",
    "triangular_dipyramid",
    "triangular_prism",
];
const BASELINE_ARROWS = [
    "box",
    "crow",
    "diamond",
    "dot",
    "half-open",
    "inverted",
    "none",
    "normal",
    "open-diamond",
    "open-dot",
    "open-normal",
    "sphere-dot",
    "tee",
    "vee",
];
const BASELINE_PATTERNS = ["box", "dash", "dash-dot", "diamond", "dot", "sinewave", "solid", "star", "zigzag"];

/**
 * The code a call is refused with.
 * @param call - The call.
 * @returns The code and its params, or null when it was not refused with one.
 */
async function refusal(call: () => unknown): Promise<{ code: string; params: unknown } | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? { code: error.code, params: error.details } : null;
    }

    return null;
}

/**
 * The values one channel offers in a session.
 * @param session - The session.
 * @param channel - The channel.
 * @returns Its values, sorted.
 */
function valuesOf(session: GraphSession, channel: string): string[] {
    const target = channel.startsWith("node.") ? "node" : "edge";
    const found = session.catalog.channels(target).find((descriptor) => descriptor.channel === channel);
    return [...(found?.values ?? [])].sort();
}

/**
 * The layers a file's styles made.
 * @param session - The session.
 * @returns How many there are.
 */
function fileLayers(session: GraphSession): number {
    return session.styles.list().filter((layer) => fileStyleOf(layer) !== null).length;
}

describe("the file styles experiment off", () => {
    it("refuses a load that asks for the file's styles, by either spelling, and changes nothing", async () => {
        const session = createGraphSession(OFF);
        const asked = await refusal(() => session.data.import(GEXF, { styles: "file" }));
        assert.deepStrictEqual(asked, { code: "E_FEATURE_OFF", params: { feature: "file-styles", key: "styles" } });
        const configured = await refusal(() =>
            session.data.import({ type: "gexf", config: { data: MISERABLES, styles: "file" } }),
        );
        assert.strictEqual(configured?.code, "E_FEATURE_OFF");
        assert.strictEqual(session.data.nodes().length, 0);
        session.dispose();
    });

    it("refuses a draft's load that asks for styles, and the draft reports none", async () => {
        const session = createGraphSession(OFF);
        const draft = await session.data.prepare(GEXF);
        assert.isNull(draft.styles);
        assert.strictEqual((await refusal(() => draft.load({ styles: "file" })))?.code, "E_FEATURE_OFF");
        assert.strictEqual(session.data.nodes().length, 0);
        await draft.load();
        assert.isAbove(session.data.nodes().length, 0);
        session.dispose();
    });

    it("loads a styled file plainly, with no styles report and no file-made layers", async () => {
        const session = createGraphSession(OFF);
        await session.data.import(GEXF);
        assert.isAbove(session.data.nodes().length, 0);
        assert.notProperty(session.data.lastImport() ?? {}, "styles");
        assert.strictEqual(fileLayers(session), 0);
        session.dispose();
    });

    it("refuses an export with styles and data.setFileStyles, and a plain export names no style loss", async () => {
        const session = createGraphSession(OFF);
        await session.data.import(GEXF);
        await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        assert.deepStrictEqual(await refusal(() => exportSession(session, "gexf", { styles: true })), {
            code: "E_FEATURE_OFF",
            params: { feature: "file-styles", key: "styles" },
        });
        const plain = exportSession(session, "gexf");
        assert.isFalse(plain.losses.some((loss) => loss.code.startsWith("W_STYLE")));
        const set = await refusal(() => session.execute({ op: "data.setFileStyles", loads: [] }));
        assert.strictEqual(set?.code, "E_FEATURE_OFF");
        const inTransaction = await refusal(() =>
            session.transaction("Set styles", (tx) => tx.execute({ op: "data.setFileStyles", loads: [] })),
        );
        assert.strictEqual(inTransaction?.code, "E_FEATURE_OFF");
        session.dispose();
    });

    it("lists no format's styles and no styles writer option", () => {
        const session = createGraphSession(OFF);
        for (const format of session.catalog.formats()) {
            assert.notProperty(format, "styles", format.id);
            assert.isFalse(
                (format.writerOptions ?? []).some((option) => option.name === "styles"),
                format.id,
            );
        }
        assert.strictEqual(session.catalog.formats(), session.catalog.formats(), "the same array on every call");
        session.dispose();
    });

    it("leaves the experiment's channels and values out of the catalog", () => {
        const session = createGraphSession(OFF);
        for (const target of ["node", "edge"] as const) {
            const offered = session.catalog.channels(target).map((descriptor) => descriptor.channel);
            const expected = channelsFor(target)
                .map((descriptor) => descriptor.channel)
                .filter((channel) => !FILE_STYLE_CHANNELS.has(channel));
            assert.deepStrictEqual(offered, expected);
            assert.strictEqual(session.catalog.channels(target), session.catalog.channels(target));
        }
        assert.deepStrictEqual(valuesOf(session, "node.shape"), BASELINE_SHAPES);
        assert.deepStrictEqual(valuesOf(session, "edge.arrowHead"), BASELINE_ARROWS);
        assert.deepStrictEqual(valuesOf(session, "edge.arrowTail"), BASELINE_ARROWS);
        assert.deepStrictEqual(valuesOf(session, "edge.style"), BASELINE_PATTERNS);
        assert.deepStrictEqual(valuesOf(session, "node.sizeMode"), ["diameter", "scale"]);
        session.dispose();
    });

    it("leaves Graphviz's edge routes out of the fixed layout's options", async () => {
        const session = createGraphSession(OFF);
        const names = (await session.catalog.optionsFor("fixed")).map((option) => option.name);
        assert.notInclude(names, "edgeRoutes");
        assert.notInclude(names, "graphvizAttributes");
        session.dispose();
    });

    it("spreads a binding over the values the channel had, and caps groups at their count", () => {
        const session = createGraphSession(OFF);
        const spread = session.styles.sequence({ scale: "linear" }, { channel: "node.shape", count: 60 });
        assert.isTrue(spread.values.every((value) => typeof value === "string" && BASELINE_SHAPES.includes(value)));
        assert.include(spread.values, BASELINE_SHAPES.at(-1));
        assert.strictEqual(
            session.styles.sequence({ scale: "ordinal" }, { channel: "node.shape", count: 25 }).values.length,
            25,
        );
        assert.throws(
            () => session.styles.sequence({ scale: "ordinal" }, { channel: "node.shape", count: 30 }),
            /node\.shape has 25 values/,
        );
        session.dispose();
    });

    it("paints a number spread over shapes with the shapes the channel had", async () => {
        const session = createGraphSession(OFF);
        await session.data.addNodes(Array.from({ length: 60 }, (_, n) => ({ id: `n${String(n)}`, n })));
        await session.styles.add({
            name: "By n",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.shape": { by: "data.n", scale: "linear" } },
        });
        const shapes = session.data
            .nodes()
            .map((node) => (session.styles.explain({ node: node.id }).merged as Record<string, unknown>)["node.shape"]);
        assert.isTrue(
            shapes.every((shape) => BASELINE_SHAPES.includes(String(shape))),
            String(shapes),
        );
        assert.include(shapes, BASELINE_SHAPES.at(-1));
        session.dispose();
    });

    it("draws a layer that writes a value the catalog leaves out", async () => {
        const session = createGraphSession(OFF);
        await session.data.addNodes([{ id: "a" }]);
        await session.styles.add({
            name: "Flat",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "rectangle", "node.width": 3 },
        });
        const merged = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.shape"], "rectangle");
        assert.strictEqual(merged["node.width"], 3);
        session.dispose();
    });

    it("opens a project saved with the experiment on with the styles it was saved with", async () => {
        const saved = createGraphSession(ON);
        await saved.data.import(GEXF, { styles: "file" });
        const layers = fileLayers(saved);
        assert.isAbove(layers, 0);
        const node = saved.data.nodes()[0].id;
        const color = (session: GraphSession): unknown =>
            (session.styles.explain({ node }).merged as Record<string, unknown>)["node.color"];
        const { text } = await saved.project.save();

        const opened = createGraphSession(OFF);
        await opened.project.open(text, { discard: true });
        assert.strictEqual(fileLayers(opened), layers);
        assert.deepStrictEqual(color(opened), color(saved));
        saved.dispose();
        opened.dispose();
    });
});

describe("the file styles experiment on", () => {
    it("offers every channel and format exactly as the element ships them", () => {
        const session = createGraphSession(ON);
        for (const target of ["node", "edge"] as const) {
            assert.strictEqual(session.catalog.channels(target), channelsFor(target));
        }
        assert.strictEqual(session.catalog.formats(), SESSION_CATALOG_TABLES.formats());
        assert.isTrue(FORMAT_DESCRIPTORS.some((format) => format.styles !== undefined));
        const groups = session.styles.sequence({ scale: "ordinal" }, { channel: "node.shape", count: 30 });
        assert.include(groups.values, "rectangle");
        session.dispose();
    });

    it("draws a file's styles as layers and reports them", async () => {
        const session = createGraphSession(ON);
        const draft = await session.data.prepare(GEXF);
        assert.isNotNull(draft.styles);
        await draft.load({ styles: "file" });
        assert.isAbove(fileLayers(session), 0);
        assert.property(session.data.lastImport() ?? {}, "styles");
        session.dispose();
    });
});
