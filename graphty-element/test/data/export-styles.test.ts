/**
 * @file Writing the style layers into a file (`styles: true`) and reading them back
 * (`styles: "file"`): the same layers and the same picture per element through GEXF, GraphML,
 * DOT, CX2 and Cytoscape.js JSON; a palette written as its values with a note; CSV's losses
 * reported before writing; and an export without styles exactly as it was.
 */

import { assert, describe, it } from "vitest";

import {
    createGraphSession,
    EXPORT_STYLE_LOSS_CODES,
    FILE_STYLE_CODES,
    type GraphSession,
    type LayerSpec,
} from "../../session";
import { type ExportLoss, exportSession } from "../../src/data/export";

/** The formats that keep layers, and the options that pick each. */
const FORMATS: readonly [string, string, Readonly<Record<string, unknown>>][] = [
    ["GEXF", "gexf", {}],
    ["GraphML", "graphml", {}],
    ["DOT", "dot", {}],
    ["CX2", "cx2", {}],
    ["Cytoscape.js JSON", "json", { dialect: "cytoscape" }],
];

/**
 * A graph of eight nodes in a chain, with a group, a weight and a kind per edge.
 * @returns The session, loaded.
 */
async function chain(): Promise<GraphSession> {
    const session = createGraphSession();
    const nodes = Array.from({ length: 8 }, (_unused, i) => ({
        id: `n${String(i)}`,
        group: i % 3 === 0 ? "x" : "y",
        w: i + 1,
    }));
    const edges = Array.from({ length: 7 }, (_unused, i) => ({
        source: `n${String(i)}`,
        target: `n${String(i + 1)}`,
        kind: i % 2 === 0 ? "b" : "a",
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
    return session;
}

/** A stack covering every kind of layer a file keeps as a layer, edge and node layers interleaved. */
const STACK: readonly LayerSpec[] = [
    { name: "fixed", target: "node", selector: { match: "everything" }, set: { "node.color": "#ff8800" } },
    // an edge layer between node layers stays where it is
    {
        name: "edge kind",
        target: "edge",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "edge.color": { by: "data.kind", scale: "passthrough", map: { a: "#0000ff", b: "#00ff00" } } },
    },
    {
        name: "by group",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.group", scale: "passthrough", map: { x: "#ff0000" }, unmapped: "skip" } },
    },
    {
        name: "size",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "node.size": { by: "data.w", scale: "linear", domain: [1, 8], range: [1, 4] } },
    },
    {
        name: "fade",
        target: "node",
        kind: "encoding",
        selector: { match: "expression", where: "data.w > `4`" },
        encode: {
            "node.opacity": {
                by: "data.w",
                stops: [
                    { at: 5, value: 0.3 },
                    { at: 8, value: 0.9 },
                ],
            },
        },
    },
    {
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.labelColor": "#112233", "node.labelSize": 14 },
    },
    {
        name: "by degree",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: {
            "node.outline": {
                by: "graphty.degree",
                stops: [
                    { at: 1, value: "#000000" },
                    { at: 2, value: "#ffffff" },
                ],
            },
        },
    },
];

/**
 * The chain with the stack above and node `n7` and edge `n2 -> n3` hidden.
 * @returns The session.
 */
async function styled(): Promise<GraphSession> {
    const session = await chain();
    for (const spec of STACK) {
        await session.styles.add(spec);
    }

    await session.visibility.set({
        kind: "all",
        of: [
            { kind: "not", of: { kind: "expression", where: "data.w == `8`" } },
            { kind: "not", of: { kind: "edges", where: "data.source == 'n2'" } },
        ],
    });
    return session;
}

/**
 * Load a file back with its styles.
 * @param text - The file.
 * @param format - Its format.
 * @returns The session.
 */
async function loadBack(text: string, format: string): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: format, config: { data: text } }, { styles: "file" });
    return session;
}

/** A load's scope on its own elements: `graphty.style.<namespace>.<kind>.el.load`. */
const SCOPE = String.raw`graphty\.style\.[a-z0-9_-]+\.(?:node|edge)\.el\.load`;

/**
 * A layer as its spec, with what a load adds set aside: the scope on the load's own elements.
 * @param session - The session.
 * @returns The layers above the element's own, bottom first.
 */
function specs(session: GraphSession): Record<string, unknown>[] {
    return session.styles
        .list()
        .filter((layer) => layer.source.by !== "element")
        .map((layer) => {
            let { selector } = layer;
            if (selector.match === "has" && new RegExp(`^${SCOPE}$`).test(selector.path)) {
                selector = { match: "everything" };
            } else if (selector.match === "expression") {
                const scoped = new RegExp(String.raw`^\((.*)\) && ${SCOPE} != \`null\`$`).exec(selector.where);
                selector = scoped === null ? selector : { match: "expression", where: scoped[1] };
            }

            return {
                name: layer.name,
                target: layer.target,
                kind: layer.kind,
                selector,
                set: layer.set ?? {},
                encode: layer.encode ?? {},
            };
        });
}

/**
 * What every node and edge is drawn with, by row.
 * @param session - The session.
 * @returns The merged styles, nodes then edges.
 */
function picture(session: GraphSession): unknown[] {
    return [
        ...session.data.nodes().map((record) => session.styles.explain({ node: record.id }).merged),
        ...session.data.edges().map((record) => session.styles.explain({ edge: record.id }).merged),
    ];
}

/**
 * The codes of the losses.
 * @param losses - The losses.
 * @returns Their codes.
 */
function codes(losses: readonly ExportLoss[]): string[] {
    return losses.map((loss) => loss.code);
}

describe("styles written into a file come back as the same layers", () => {
    for (const [name, format, options] of FORMATS) {
        it(`${name}: equal layers, equal explain() per element, equal visibility`, async () => {
            const session = await styled();
            const result = exportSession(session, format, { ...options, styles: true });
            assert.isFalse(
                codes(result.losses).some((code) => code.startsWith("E_")),
                "nothing refuses the export",
            );
            assert.notInclude(codes(result.losses), "W_STYLES_NOT_EXPORTED");

            const back = await loadBack(await result.text(), format);
            assert.deepEqual(specs(back), specs(session));
            assert.deepEqual(picture(back), picture(session));
            assert.deepEqual(Array.from(back.visibility.nodeMask()), Array.from(session.visibility.nodeMask()));
            assert.deepEqual(Array.from(back.visibility.edgeMask()), Array.from(session.visibility.edgeMask()));
            session.dispose();
            back.dispose();
        });
    }

    it("writes a palette as the colors it paints, says so, and draws the same colors after a load", async () => {
        const session = await chain();
        await session.styles.add({
            name: "ramp",
            target: "node",
            kind: "encoding",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.w", palette: "viridis" } },
        });
        const result = exportSession(session, "gexf", { styles: true });
        const flattened = result.losses.filter((loss) => loss.code === "W_STYLE_LAYER_FLATTENED");
        assert.deepEqual(
            flattened.map((loss) => loss.params),
            [{ columns: [], count: 8, target: "node", property: "fill", layer: "ramp", reason: "SCALE" }],
        );

        const back = await loadBack(await result.text(), "gexf");
        assert.deepEqual(picture(back), picture(session));
        session.dispose();
        back.dispose();
    });
});

describe("what an export cannot keep", () => {
    it("CSV: reports each property it cannot write before anything is written", async () => {
        const session = await styled();
        const result = exportSession(session, "csv", { styles: true });
        const unwritten = result.losses
            .filter((loss) => loss.code === "W_STYLE_NOT_WRITTEN")
            .map((loss) => `${String(loss.params.target)} ${String(loss.params.property)}`);
        for (const property of ["node fill", "node width", "node opacity", "node borderColor", "edge color"]) {
            assert.include(unwritten, property);
        }

        assert.include(codes(result.losses), "W_STYLE_RULES_NOT_KEPT");
        session.dispose();
    });

    it("reports nothing lost for a graph drawn only by the element's own base layers", async () => {
        const session = await chain();
        for (const format of ["csv", "gexf", "graphml", "pajek"]) {
            const result = exportSession(session, format, { styles: true });
            assert.deepEqual(
                result.losses.filter((loss) => loss.code.startsWith("W_STYLE")).map((loss) => loss.code),
                [],
                format,
            );
        }

        session.dispose();
    });

    it("leaves the drawn style columns out when styles are written", async () => {
        const session = await styled();
        const view = {
            nodeStyle: () => ({ color: { r: 1, g: 2, b: 3, a: 1 }, size: 2 }),
            edgeStyle: () => ({ color: { r: 1, g: 2, b: 3, a: 1 }, width: 2 }),
        };
        const plain = await exportSession(session, "json", {}, view).text();
        const withStyles = await exportSession(session, "json", { styles: true }, view).text();
        assert.include(plain, "style.color");
        assert.notInclude(withStyles, "style.color");
        assert.notInclude(withStyles, "style.size");
        session.dispose();
    });
});

describe("an export without styles", () => {
    for (const [name, format, options] of FORMATS) {
        it(`${name}: writes the same bytes, and says when layers were not written`, async () => {
            const session = await chain();
            const before = exportSession(session, format, options);
            assert.notInclude(codes(before.losses), "W_STYLES_NOT_EXPORTED");
            const text = await before.text();

            await session.styles.add(STACK[0]);
            const after = exportSession(session, format, options);
            assert.strictEqual(await after.text(), text);
            const note = after.losses.find((loss) => loss.code === "W_STYLES_NOT_EXPORTED");
            assert.deepEqual(note?.params, { columns: [], count: 1 });
            session.dispose();
        });
    }
});

describe("the export style codes", () => {
    it("are listed from ./session, among every style code, and name every style loss an export reports", async () => {
        assert.deepEqual([...EXPORT_STYLE_LOSS_CODES].sort(), [
            "E_STYLES_MISMATCH",
            "W_STYLES_NOT_EXPORTED",
            "W_STYLE_APPROXIMATED",
            "W_STYLE_LAYER_FLATTENED",
            "W_STYLE_NOT_WRITTEN",
            "W_STYLE_RULES_NOT_KEPT",
        ]);
        for (const code of EXPORT_STYLE_LOSS_CODES) {
            assert.include(FILE_STYLE_CODES, code);
        }

        const session = await styled();
        for (const [, format, options] of [...FORMATS, ["CSV", "csv", {}] as const]) {
            const style = codes(exportSession(session, format, { ...options, styles: true }).losses).filter((code) =>
                code.includes("STYLE"),
            );
            for (const code of style) {
                assert.include(EXPORT_STYLE_LOSS_CODES, code, format);
            }
        }

        session.dispose();
    });
});
