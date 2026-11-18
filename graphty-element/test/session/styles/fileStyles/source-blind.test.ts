/**
 * After a load, nothing in graphty-element can tell which program wrote the file. The one place a program identity
 * travels is the `source` graph-io reports beside the styles it reads (format, dialect and writing program), which is
 * report-only: this loads real specimens through the whole session, with graph-io's report rewritten to name every
 * program in turn, and asserts the same layers, the same values and the same saved project each time.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ExtractedStyles } from "@graphty/graph-io/styles";
import { assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../../../session";
import { dispatcherOf } from "../../../../src/session/GraphSession";
import { fileStylesOn } from "../../../helpers/file-styles-on";

/** The source the next extraction reports in place of its own, or null to keep its own. */
const identity = vi.hoisted(() => ({ source: null as ExtractedStyles["styles"]["source"] | null, rewritten: 0 }));

vi.mock("@graphty/graph-io/styles", async (original) => {
    const real = await original<typeof import("@graphty/graph-io/styles")>();
    return {
        ...real,
        extractStyles: (...args: Parameters<typeof real.extractStyles>): ReturnType<typeof real.extractStyles> => {
            const extracted = real.extractStyles(...args);
            const { source } = identity;
            if (extracted === null || source === null) {
                return extracted;
            }

            identity.rewritten++;
            return { ...extracted, styles: { ...extracted.styles, source } };
        },
    };
});

fileStylesOn();

const CORPUS = join(__dirname, "..", "..", "..", "..", "..", "graph-io", "test", "corpus", "styles");

/** Specimens from programs whose look graph-io settles differently, with the format each loads as. */
const SPECIMENS: readonly { readonly name: string; readonly type: string; readonly data: string }[] = [
    {
        name: "a yEd GraphML file",
        type: "graphml",
        data: readFileSync(join(CORPUS, "graphml", "yed-shapenode", "voc__voctomix__schema.graphml"), "utf8"),
    },
    {
        name: "a Gephi GEXF file",
        type: "gexf",
        data: readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8"),
    },
    {
        name: "a Graphviz DOT file",
        type: "dot",
        data: `digraph { node [shape=box style="rounded,filled" fillcolor=tomato]; a -> b [arrowhead=onormal style=dashed]; b -> c [arrowhead=halfopen]; c [shape=cylinder]; }`,
    },
    {
        name: "a Cytoscape.js JSON file",
        type: "json",
        data: JSON.stringify({
            elements: {
                nodes: [{ data: { id: "a", label: "a" } }, { data: { id: "b", label: "b" } }],
                edges: [{ data: { id: "e", source: "a", target: "b" } }],
            },
            style: [
                { selector: "node", style: { label: "data(label)", shape: "round-triangle", "text-valign": "top" } },
                { selector: "edge", style: { "target-arrow-shape": "triangle-half-bottom", "line-style": "dashed" } },
            ],
        }),
    },
];

/** Every program identity graph-io can report, with a format and a dialect that go with it, and none. */
const SOURCES: readonly ExtractedStyles["styles"]["source"][] = [
    { format: "graphml", dialect: "css", tool: "yed" },
    { format: "graphml", dialect: "css", tool: "yfiles3" },
    { format: "gexf", dialect: "css", tool: "gephi" },
    { format: "dot", dialect: "x11", tool: "graphviz" },
    { format: "json", dialect: "cytoscape-js", tool: "cytoscape-js" },
    { format: "cx2", dialect: "cytoscape", tool: "cytoscape" },
    { format: "cys", dialect: "cytoscape", tool: "cytoscape-fallbacks" },
    { format: "json", dialect: "vis", tool: "vis-network" },
    { format: "json", dialect: "graphology", tool: "sigma" },
    { format: "net", dialect: "css", tool: "pajek" },
    { format: "gml", dialect: "tk", tool: "ogdf" },
    { format: "graphml", dialect: "css", tool: "networkx" },
    { format: "json", dialect: "graphty", tool: "graphty" },
    { format: "gml", dialect: null, tool: null },
];

/**
 * A saved project without the session member's id: a new project's identity, different on every save whatever was
 * loaded.
 * @param text - The saved project.
 * @returns The rest of it.
 */
function steady(text: string): unknown {
    return JSON.parse(text, (key, value: unknown) =>
        typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "graphty-session"
            ? { ...value, id: undefined }
            : value,
    );
}

/**
 * Load one file into a fresh session and read back what a consumer can see of the load.
 * @param type - The format.
 * @param data - The file.
 * @returns The layers, the data, the stored values and the saved project.
 */
async function load(type: string, data: string): Promise<unknown> {
    // Every load happens at the same moment, so the times a save records match.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T00:00:00Z") });
    const session = createGraphSession();
    try {
        await session.data.import({ type, config: { data } }, { styles: "file" });
        const { text } = await session.project.save();
        return {
            layers: session.styles.list(),
            nodes: session.data.nodes(),
            edges: session.data.edges(),
            attributes: session.data.attributes(),
            values: [...dispatcherOf(session).state.graph.values],
            project: steady(text),
        };
    } finally {
        session.dispose();
        vi.useRealTimers();
    }
}

describe("a loaded file reads the same whatever program graph-io names as its source", () => {
    for (const { name, type, data } of SPECIMENS) {
        it(`gives ${name} the same layers, values and saved project`, async () => {
            identity.source = null;
            const own = await load(type, data);
            for (const source of SOURCES) {
                identity.source = source;
                const before = identity.rewritten;
                const loaded = await load(type, data);
                assert.isAbove(identity.rewritten, before, "the load read the rewritten source");
                assert.deepEqual(loaded, own, JSON.stringify(source));
            }
            identity.source = null;
        });
    }
});
