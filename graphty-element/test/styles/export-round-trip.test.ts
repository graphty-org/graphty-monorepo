/**
 * @file Styles written into every format the element writes (`styles: true`) and read back
 * (`styles: "file"`), from hand-made stacks covering every kind of layer and from styled files of
 * graph-io's corpus:
 *
 * 1. a format that keeps rules gives back the same layers and the same `explain()` per element
 *    and channel, and the same visibility;
 * 2. every difference between the graph written and the graph read back is named by a note, of
 *    the export or of the load that read it back;
 * 3. export, load and export again writes the same bytes;
 * 4. a value another program changed in the file comes back as that value, the rest unchanged;
 * 5. a graphty block for another graph, a truncated block and a hostile one are set aside with a
 *    note, and never throw.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession, FILE_STYLE_ISSUE, fileStyleOf, type GraphSession, type LayerSpec } from "../../session";
import { type ExportResult, exportSession } from "../../src/data/export";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { ExplainTarget } from "../../src/session/styles/explain";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");

/**
 * Every format the element writes, with the options that pick it and whether it keeps rules. The
 * JGF shape of JSON is left out: it reads integer-like node ids back first, so the graph read back
 * holds its nodes in another order than this test compares them in (graph-io's own round trip
 * checks JGF by id).
 */
const WRITERS: readonly {
    readonly name: string;
    readonly format: string;
    readonly options: Readonly<Record<string, unknown>>;
    readonly rules: boolean;
    /** False where the graph's data alone does not write the same bytes after a read. */
    readonly dataStable?: boolean;
}[] = [
    { name: "GEXF", format: "gexf", options: {}, rules: true },
    { name: "GraphML", format: "graphml", options: {}, rules: true },
    { name: "GML", format: "gml", options: {}, rules: true },
    { name: "DOT", format: "dot", options: {}, rules: true },
    // A Pajek vertex's name is its label, and the element writes the node id there: a label written
    // as a `label` pair beside it is read back as the name.
    { name: "Pajek", format: "pajek", options: {}, rules: true, dataStable: false },
    { name: "XGMML", format: "xgmml", options: {}, rules: true },
    { name: "CX2", format: "cx2", options: {}, rules: true },
    { name: "JSON node-link", format: "json", options: { dialect: "node-link" }, rules: true },
    { name: "d3 JSON", format: "json", options: { dialect: "d3" }, rules: true },
    { name: "Cytoscape.js JSON", format: "json", options: { dialect: "cytoscape" }, rules: true },
    { name: "graphology JSON", format: "json", options: { dialect: "graphology" }, rules: true, dataStable: false },
    { name: "vis.js JSON", format: "json", options: { dialect: "vis" }, rules: true },
    { name: "CSV", format: "csv", options: {}, rules: false },
];

/** The neutral properties each channel is drawn from, for matching a difference to a note. */
const PROPERTIES: Readonly<Record<string, readonly string[]>> = {
    "node.color": ["fill"],
    "node.outline": ["borderColor"],
    "node.size": ["width", "height"],
    "node.opacity": ["opacity", "fillOpacity"],
    "node.shape": ["shape"],
    "node.label": ["label"],
    "node.tooltip": ["tooltip"],
    "edge.color": ["color"],
    "edge.width": ["width"],
    "edge.opacity": ["opacity"],
    "edge.style": ["lineStyle"],
    "edge.arrowHead": ["targetArrow"],
    "edge.arrowTail": ["sourceArrow"],
    "edge.arrowHeadColor": ["targetArrowColor"],
    "edge.arrowTailColor": ["sourceArrowColor"],
    "edge.arrowHeadSize": ["arrowSize"],
    "edge.arrowTailSize": ["arrowSize"],
    "edge.curvature": ["curved"],
    "edge.label": ["label"],
    "edge.arrowHeadText": ["targetLabel"],
    "edge.arrowTailText": ["sourceLabel"],
};
const LABEL_PROPERTIES = ["labelColor", "labelSize", "labelFont", "labelWeight", "labelItalic", "labelPosition"];

// ---------------------------------------------------------------------------------------------
// The hand-made stacks
// ---------------------------------------------------------------------------------------------

/**
 * A session whose `degree` run counts each node's links.
 * @returns The session.
 */
function sessionWithDegree(): GraphSession {
    const session: GraphSession = createGraphSession({
        runs: {
            execute: (context: RunExecutionContext): Promise<RunOutcome> => {
                const counts = new Map<string, number>();
                for (const edge of session.data.edges()) {
                    for (const end of [edge.source, edge.target]) {
                        counts.set(String(end), (counts.get(String(end)) ?? 0) + 1);
                    }
                }

                const nodes = session.data.nodes().map((node) => ({
                    id: node.id,
                    values: { value: counts.get(String(node.id)) ?? 0 },
                }));
                return Promise.resolve({
                    result: createRunResult({
                        runId: context.runId,
                        shape: "node-metric",
                        fields: [
                            {
                                name: "value",
                                plainName: "Connections",
                                technicalName: "degree",
                                kind: "node",
                                type: "number",
                                path: "results.$.value",
                            },
                        ],
                        measured: { nodes: nodes.length, edges: 0 },
                        nodes,
                        caveats: {
                            exact: true,
                            direction: "as-loaded",
                            precision: "f64",
                            method: "degree",
                            facts: [],
                            notes: [],
                        },
                        durationMs: 1,
                    }),
                });
            },
        },
    });
    return session;
}

/** Every kind of layer: fixed, a table, linear and log scales, stops, a palette, label fields, degree and a run's result. */
const STACK: readonly LayerSpec[] = [
    { name: "fixed", target: "node", selector: { match: "everything" }, set: { "node.color": "#ff8800" } },
    {
        name: "by team",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.team", scale: "passthrough", map: { x: "#ff0000" }, unmapped: "skip" } },
    },
    {
        name: "size",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "node.size": { by: "data.w", scale: "linear", domain: [1, 8], range: [1, 4] } },
    },
    {
        name: "log outline width",
        target: "node",
        kind: "encoding",
        selector: { match: "expression", where: "data.w > `2`" },
        encode: { "node.outline": { by: "data.w", palette: "viridis" } },
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
        set: { "node.labelColor": "#112233", "node.labelSize": 14, "node.label": "n" },
    },
    {
        name: "by degree",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: {
            "node.shape": { by: "graphty.degree", scale: "passthrough", map: { "1": "box", "2": "sphere" } },
        },
    },
    {
        name: "by run",
        target: "node",
        kind: "encoding",
        selector: { match: "expression", where: "data.team == 'y'" },
        encode: { "node.size": { by: "results.deg.value", scale: "log", range: [1, 3] } },
    },
    {
        name: "edge kind",
        target: "edge",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "edge.color": { by: "data.kind", scale: "passthrough", map: { a: "#0000ff", b: "#00ff00" } } },
    },
    {
        name: "edge width",
        target: "edge",
        selector: { match: "expression", where: "data.kind == 'a'" },
        set: { "edge.width": 3, "edge.style": "dash" },
    },
];

/**
 * A chain of eight nodes with the stack above, a degree run, and node `n7` and edge `n2 -> n3` hidden.
 * @returns The session.
 */
async function handMade(): Promise<GraphSession> {
    const session = sessionWithDegree();
    await session.data.addNodes(
        Array.from({ length: 8 }, (_unused, i) => ({ id: `n${String(i)}`, team: i % 3 === 0 ? "x" : "y", w: i + 1 })),
    );
    await session.data.addEdges(
        Array.from({ length: 7 }, (_unused, i) => ({
            source: `n${String(i)}`,
            target: `n${String(i + 1)}`,
            kind: i % 2 === 0 ? "b" : "a",
        })),
    );
    await session.runs.start("degree", undefined, { as: "deg", style: false });
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
    await session.styles.settled();
    return session;
}

// ---------------------------------------------------------------------------------------------
// Corpus files
// ---------------------------------------------------------------------------------------------

/**
 * Round trips that fail today for a reason that is not the style system's, each with the reason.
 * They run as expected failures, so each is noticed the day it is fixed.
 */
const KNOWN_GAPS: ReadonlyMap<string, string> = new Map();

/** The element's reader for each corpus directory. */
const READERS: Readonly<Record<string, string>> = {
    cx2: "cx2",
    cys: "cys",
    cyjs: "json",
    dot: "dot",
    gexf: "gexf",
    gml: "gml",
    graphml: "graphml",
    pajek: "pajek",
    xgmml: "xgmml",
};

/**
 * Two small styled files of a corpus directory, from the files written by tools, not by graphty.
 * @param dir - The directory.
 * @returns Their paths.
 */
function sample(dir: string): string[] {
    const out: string[] = [];
    const walk = (at: string): void => {
        for (const name of readdirSync(at).sort()) {
            const path = join(at, name);
            if (statSync(path).isDirectory()) {
                if (name !== "generated") {
                    walk(path);
                }
            } else if (!/\.(md|cycss|gz)$/.test(name) && statSync(path).size < 40_000 && out.length < 2) {
                out.push(path);
            }
        }
    };
    walk(dir);
    return out;
}

/**
 * Load a corpus file with its styles.
 * @param type - Its reader.
 * @param path - The file.
 * @returns The session, or null when the file carries no styles the element draws.
 */
async function corpusSession(type: string, path: string): Promise<GraphSession | null> {
    const session = createGraphSession();
    await session.data.import({ type, config: { data: new Uint8Array(readFileSync(path)) } }, { styles: "file" });
    if (!session.styles.list().some((layer) => fileStyleOf(layer) !== null)) {
        session.dispose();
        return null;
    }

    return session;
}

// ---------------------------------------------------------------------------------------------
// Comparing
// ---------------------------------------------------------------------------------------------

/**
 * A value as the comparison reads it: a color as lowercase `#rrggbb`, objects field by field.
 * @param value - The value.
 * @returns It, normalized.
 */
function norm(value: unknown): unknown {
    if (typeof value === "object" && value !== null && "hex" in value) {
        return (value as { hex: string }).hex.slice(0, 7).toLowerCase();
    }

    if (typeof value === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
        return value.slice(0, 7).toLowerCase();
    }

    if (typeof value === "number") {
        return Number(value.toPrecision(6));
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, inner]) => inner !== undefined)
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([key, inner]) => [key, norm(inner)]),
        );
    }

    return value ?? null;
}

/**
 * What every node and edge is drawn with, per channel, in record order.
 * @param session - The session.
 * @returns Per kind, per element, the merged style.
 */
function picture(session: GraphSession): Record<"node" | "edge", Record<string, unknown>[]> {
    return {
        node: session.data
            .nodes()
            .map((record) => norm(session.styles.explain({ node: record.id }).merged) as Record<string, unknown>),
        edge: session.data
            .edges()
            .map((record) => norm(session.styles.explain({ edge: record.id }).merged) as Record<string, unknown>),
    };
}

/** A load's scope on its own elements and its file-style namespace, set aside when layers are compared. */
const NAMESPACE = String.raw`graphty\.style\.(?:"[^"]*"|[A-Za-z0-9_-]+)`;
const SCOPE = String.raw`${NAMESPACE}\.(?:node|edge)\.el\.load(?:\."?\d+"?)?`;

/**
 * A value with every file-style namespace in its strings written as `*`.
 * @param value - The value.
 * @returns It, with the namespaces set aside.
 */
function anyNamespace(value: unknown): unknown {
    if (typeof value === "string") {
        return value.replaceAll(new RegExp(`${NAMESPACE}\\.(node|edge)\\.`, "g"), "graphty.style.*.$1.");
    }

    if (Array.isArray(value)) {
        return value.map(anyNamespace);
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, anyNamespace(inner)]));
    }

    return value;
}

/**
 * The layers above the element's own, as specs, with what a load adds set aside: its scope, its
 * namespace and the ids it gives layers.
 * @param session - The session.
 * @returns The specs, bottom first.
 */
function specs(session: GraphSession): unknown[] {
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

            return anyNamespace({
                name: layer.name,
                target: layer.target,
                kind: layer.kind,
                selector,
                set: layer.set ?? {},
                encode: layer.encode ?? {},
            });
        });
}

/** A note of an export or a load, as the coverage check reads it. */
interface AnyNote {
    readonly code: string;
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Whether a note names a difference on one channel of one kind.
 * @param note - The note.
 * @param kind - Nodes or edges.
 * @param channel - The channel that differs.
 * @returns True when it does.
 */
function names(note: AnyNote, kind: "node" | "edge", channel: string): boolean {
    if (!note.code.includes("STYLE") || (note.params.target !== kind && note.params.target !== null)) {
        return false;
    }

    const property = String(note.params.property);
    // a label's style is one channel merged and several in a layer's contribution
    const properties = /\.label(?:Style|Color|Size|Font|Weight|Italic)$/.test(channel)
        ? LABEL_PROPERTIES
        : (PROPERTIES[channel] ?? []);
    return (
        properties.includes(property) ||
        property === `graphty:${channel}` ||
        property.split(",").some((one) => properties.includes(one))
    );
}

/**
 * Write a session's graph with its styles, setting aside a refusal over ids or direction by the
 * options that rewrite them.
 * @param session - The session.
 * @param format - The format.
 * @param options - Its options.
 * @returns The result and its text.
 */
async function write(
    session: GraphSession,
    format: string,
    options: Readonly<Record<string, unknown>>,
    styles = true,
): Promise<{ result: ExportResult; text: string }> {
    const first = exportSession(session, format, { ...options, styles });
    try {
        return { result: first, text: await first.text() };
    } catch {
        const again = exportSession(session, format, {
            ...options,
            styles,
            sanitizeIds: "mangle",
            onMixedDirection: "directed",
            ...(format === "gml" ? { sanitizeKeys: "mangle" } : {}),
        });
        return { result: again, text: await again.text() };
    }
}

/**
 * Load a written file back with its styles.
 * @param text - The file.
 * @param format - Its format.
 * @returns The session.
 */
async function loadBack(text: string, format: string): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: format, config: { data: text } }, { styles: "file" });
    await session.styles.settled();
    return session;
}

/**
 * Whether a graph's data alone, written without styles, reads back and writes the same bytes.
 * @param source - The session.
 * @param writer - The format.
 * @returns True when it does.
 */
async function dataIsStable(source: GraphSession, writer: (typeof WRITERS)[number]): Promise<boolean> {
    const plain = async (session: GraphSession): Promise<string> =>
        (await write(session, writer.format, writer.options, false)).text;
    const first = createGraphSession();
    const second = createGraphSession();
    try {
        await first.data.import({ type: writer.format, config: { data: await plain(source) } });
        const once = await plain(first);
        await second.data.import({ type: writer.format, config: { data: once } });
        return (await plain(second)) === once;
    } catch {
        return false;
    } finally {
        first.dispose();
        second.dispose();
    }
}

/**
 * One round trip: write, read back, compare, write again.
 * @param source - The session written.
 * @param writer - The format.
 * @param strict - Whether the session is the hand-made stack, whose data every format but graphology's writes
 *     again unchanged.
 */
async function roundTrip(source: GraphSession, writer: (typeof WRITERS)[number], strict = false): Promise<void> {
    let written: { result: ExportResult; text: string };
    try {
        written = await write(source, writer.format, writer.options);
    } catch (error) {
        // The format cannot hold this graph's data at all, styles or not (Pajek refuses a label
        // holding a quote): nothing here is about styles.
        const refused = await write(source, writer.format, writer.options, false).then(
            () => false,
            () => true,
        );
        if (refused) {
            return;
        }

        throw error;
    }

    const { result, text } = written;
    assert.isFalse(
        result.losses.some((loss) => loss.code.startsWith("E_")),
        "nothing refuses the export",
    );
    assert.isFalse(
        result.losses.some((loss) => loss.code === "W_STYLES_NOT_EXPORTED"),
        "styles were asked for",
    );

    if (!writer.rules) {
        // A format with no style slots and no block: every channel a layer draws is named as not
        // written. The element's own base layers are not: loading the file draws them again.
        const base = new Set(
            source.styles
                .list()
                .filter((layer) => layer.source.by === "element" && layer.source.reason === "default")
                .map((layer) => layer.id),
        );
        const drawnBy = (target: ExplainTarget): string[] =>
            source.styles
                .explain(target)
                .contributions.filter((contribution) => !base.has(contribution.layerId))
                .flatMap((contribution) => Object.keys(contribution.values));
        for (const kind of ["node", "edge"] as const) {
            const targets: ExplainTarget[] =
                kind === "node"
                    ? source.data.nodes().map((record) => ({ node: record.id }))
                    : source.data.edges().map((record) => ({ edge: record.id }));
            const channels = new Set(targets.flatMap(drawnBy));
            for (const channel of channels) {
                assert.isTrue(
                    result.losses.some((loss) => names(loss, kind, channel)),
                    `${kind} ${channel} is named as not written`,
                );
            }
        }

        assert.include(
            result.losses.map((loss) => loss.code),
            "W_STYLE_RULES_NOT_KEPT",
        );
        return;
    }

    const back = await loadBack(text, writer.format);
    try {
        const before = picture(source);
        const after = picture(back);
        assert.strictEqual(after.node.length, before.node.length, "the nodes come back");
        assert.strictEqual(after.edge.length, before.edge.length, "the edges come back");

        // 2. Every difference is named by a note of the export or of the load that read it back.
        const notes: AnyNote[] = [...result.losses, ...(back.data.lastImport()?.styles?.notes ?? [])];
        const unnamed: string[] = [];
        for (const kind of ["node", "edge"] as const) {
            before[kind].forEach((was, i) => {
                const now = after[kind][i] as Record<string, unknown> | undefined;
                if (now === undefined) {
                    return;
                }

                for (const channel of new Set([...Object.keys(was), ...Object.keys(now)])) {
                    if (
                        JSON.stringify(was[channel] ?? null) !== JSON.stringify(now[channel] ?? null) &&
                        !notes.some((note) => names(note, kind, channel))
                    ) {
                        unnamed.push(
                            `${kind} ${String(i)} ${channel}: ${JSON.stringify(was[channel])} -> ${JSON.stringify(now[channel])}`,
                        );
                    }
                }
            });
        }

        assert.deepEqual(unnamed.slice(0, 8), [], `${String(unnamed.length)} differences no note names`);

        {
            // 1. The same layers, the same picture, the same visibility.
            const flattened = new Set(
                result.losses
                    .filter((loss) => loss.code === "W_STYLE_LAYER_FLATTENED")
                    .map((loss) => String(loss.params.layer)),
            );
            // A layer the load could not rebuild as written is drawn from its neutral rule, as its note says.
            const rebuiltNot = (back.data.lastImport()?.styles?.notes ?? [])
                .filter((note) => note.code === FILE_STYLE_ISSUE.LAYER_SPEC_IGNORED)
                .map((note) => String(note.params.property));
            const kept = (list: unknown[]): unknown[] =>
                list.filter((spec) => {
                    const { name } = spec as { name: string };
                    return (
                        !flattened.has(name) &&
                        !rebuiltNot.some((id) => name === id || name.startsWith(`${id}#`) || name.startsWith(`${id}.`))
                    );
                });
            assert.deepEqual(kept(specs(back)), kept(specs(source)), "the same layers");
            assert.deepEqual(after, before, "the same picture");
            assert.deepEqual(Array.from(back.visibility.nodeMask()), Array.from(source.visibility.nodeMask()));
            assert.deepEqual(Array.from(back.visibility.edgeMask()), Array.from(source.visibility.edgeMask()));

            // 3. Export, load and export again writes the same bytes, wherever the graph's data
            // alone does (a graphology record holds its attributes under `attributes`, which the
            // graphology writer nests one level deeper on every pass).
            const stable = await dataIsStable(source, writer);
            if (strict) {
                assert.strictEqual(stable, writer.dataStable !== false, "the data alone writes the same bytes again");
            }

            if (stable) {
                const again = await write(back, writer.format, writer.options);
                const once = await loadBack(again.text, writer.format);
                const thrice = await write(once, writer.format, writer.options);
                once.dispose();
                assert.strictEqual(thrice.text, again.text, "the same bytes");
            }
        }
    } finally {
        back.dispose();
    }
}

describe("styles written into every format come back", () => {
    for (const writer of WRITERS) {
        it(`${writer.name}: a stack of every kind of layer`, async () => {
            const session = await handMade();
            try {
                await roundTrip(session, writer, true);
            } finally {
                session.dispose();
            }
        });
    }

    const files = Object.entries(READERS).flatMap(([dir, type]) =>
        sample(join(CORPUS, dir)).map((path) => ({ type, path, name: path.slice(CORPUS.length + 1) })),
    );
    for (const writer of WRITERS) {
        for (const file of files) {
            const gap = KNOWN_GAPS.get(`${writer.name}: ${file.name}`);
            // A known gap is expected to fail, so it is noticed the day it is fixed.
            const title = `${writer.name}: ${file.name}${gap === undefined ? "" : ` (fails today: ${gap})`}`;
            (gap === undefined ? it : it.fails)(title, async () => {
                const session = await corpusSession(file.type, file.path);
                if (session === null) {
                    return;
                }

                try {
                    await roundTrip(session, writer);
                } finally {
                    session.dispose();
                }
            });
        }
    }
});

describe("a file graphty wrote and another program changed", () => {
    /**
     * The hand-made stack written as GEXF.
     * @returns The session and the file.
     */
    async function written(): Promise<{ session: GraphSession; text: string }> {
        const session = await handMade();
        const { text } = await write(session, "gexf", {});
        return { session, text };
    }

    it("draws a fill another program changed as that fill, and the rest as written", async () => {
        const { session, text } = await written();
        // Node n1's fill, in GEXF's own slot, as Gephi would save it.
        const edited = text.replace(/(<node id="n1"[\s\S]*?<viz:color )r="\d+" g="\d+" b="\d+"/, '$1r="1" g="2" b="3"');
        assert.notStrictEqual(edited, text, "the file holds n1's fill");
        const back = await loadBack(edited, "gexf");
        const before = picture(session);
        const after = picture(back);
        assert.strictEqual(after.node[1]["node.color"], "#010203");
        after.node.forEach((style, i) => {
            if (i !== 1) {
                assert.deepEqual(style, before.node[i], `node ${String(i)}`);
            }
        });
        assert.deepEqual(after.edge, before.edge);
        session.dispose();
        back.dispose();
    });

    for (const [name, change] of [
        [
            "for another graph",
            (block: string): string =>
                block.replace(
                    /(fingerprint(?:&quot;|")\s*:\s*\{(?:&quot;|")nodes(?:&quot;|")\s*:\s*)(\d+)/,
                    (_whole, head: string, count: string) => `${head}${String(Number(count) + 1)}`,
                ),
        ],
        // Cut at a comma, so the XML around the block still parses.
        ["truncated", (block: string): string => block.slice(0, block.lastIndexOf(",", block.length / 2))],
        [
            "hostile",
            (block: string): string =>
                block.replace(/"rules"|&quot;rules&quot;/, (rules) => {
                    const quote = rules.startsWith("&quot;") ? "&quot;" : '"';
                    return `${quote}__proto__${quote}:{${quote}polluted${quote}:1},${rules}`;
                }),
        ],
    ] as const) {
        it(`sets aside a graphty block ${name} with a note, and draws the file's own styles`, async () => {
            const { session, text } = await written();
            const start = text.indexOf("graphty.styles");
            assert.isAbove(start, -1, "the file holds the block");
            // The block's JSON text, wherever the format put it.
            const open = text.indexOf("{", start);
            const close = text.lastIndexOf("}", text.indexOf("<", open));
            const block = text.slice(open, close + 1);
            const edited = text.slice(0, open) + change(block) + text.slice(close + 1);
            if (name === "for another graph") {
                // Another graph: the fingerprint no longer matches the nodes.
                assert.notStrictEqual(edited, text);
            }

            const back = await loadBack(edited, "gexf");
            const notes = back.data.lastImport()?.styles?.notes ?? [];
            if (name !== "hostile") {
                assert.isTrue(
                    notes.some((note) => note.code === FILE_STYLE_ISSUE.BLOCK_IGNORED),
                    `noted: ${JSON.stringify(notes.map((note) => note.code))}`,
                );
            }

            assert.isUndefined(({} as Record<string, unknown>).polluted, "nothing reached Object.prototype");
            // The file's own per-element values are still drawn.
            assert.strictEqual(picture(back).node[1]["node.color"], picture(session).node[1]["node.color"]);
            session.dispose();
            back.dispose();
        });
    }
});
