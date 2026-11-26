/**
 * The start page's section of sample files from other programs, on the real graphty-element with file styles on, as
 * every deployed site runs: it lists one card per program, named for the program; each card's file is the official
 * load test's file (graph-io/test/corpus/programs/samples.json), byte for byte; and a click opens the file as a new
 * project holding every node and edge the file does. A styled sample is drawn in the app's own 3D view, with its label
 * settings, with the file's shapes, line styles and labels, counted over every node and edge, and with no two nodes
 * over each other that the file does not already overlap (graphty-element's program-samples test checks the rest of
 * the drawing); it opens with no key over the drawing, and the key the reader opens names no column that holds the
 * file's own style values.
 */

import "../../../index.css";
import "@graphty/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import SAMPLES from "../../../../../graph-io/test/corpus/programs/samples.json";
import {
    counts,
    fileFacts,
    fileOverlaps,
    LINE_CLASS,
    overlaps,
} from "../../../../../graph-io/test/programs/program-file-facts";
import { PROGRAM_SAMPLES } from "../../../data/sampleManifest";
import { withFeatures } from "../../../test/features";
import { openBy } from "../../../test/open";
import { pickSample, sampleTile } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["file-styles"]);

afterEach(() => {
    forgetUsageAnswer();
});

/**
 * The bytes of a file, read by the test runner.
 * @param path - the path from the graphty package
 * @returns the bytes
 */
async function bytesOf(path: string): Promise<Uint8Array> {
    const base64 = await commands.readFile(path, { encoding: "base64" });
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Gunzips bytes.
 * @param bytes - the gzip data
 * @returns the data
 */
async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * The manifest entry of a program sample, by its file's name.
 * @param url - the sample's address
 * @returns the entry
 */
function testFileOf(url: string): (typeof SAMPLES)[number] {
    const entry = SAMPLES.find((each) => url.endsWith(`/samples/programs/${each.app}`));
    assert.isDefined(entry, `${url} is one of the load tests' files`);
    return entry;
}

/**
 * Opens a program's sample from the start page in a fresh workspace.
 * @param program - the program's name on its card
 * @returns the opened session and the element drawing it
 */
async function openProgram(
    program: string,
): Promise<{ session: Awaited<ReturnType<typeof openBy>>; element: HTMLElementTagNameMap["graphty-element"] }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    const session = await openBy(store, () => pickSample(program));
    // the opened project's element, not the start page's own graph
    const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    assert.isNotNull(element);
    return { session, element };
}

/** A node as the session lists it: its id and its data. */
type NodeRecord = Readonly<Record<string, unknown>> & { readonly id: string | number };

/**
 * What each sample whose format carries no styling labels its nodes with: the file's own name column, else the node
 * id. A label taken from another column fails, and so does one of the nodes the file names here.
 */
const LABELED_WITH: Readonly<
    Record<string, { readonly text: (node: NodeRecord) => string; readonly names: Readonly<Record<string, string>> }>
> = {
    // a person by name, a film by title
    Neo4j: {
        text: (node) => String(node.name ?? node.title),
        names: { Keanu: "Keanu Reeves", TheMatrix: "The Matrix" },
    },
    // a term by its name, not its TAXRANK id
    "OBO Foundry": { text: (node) => String(node.name), names: { "TAXRANK:0000006": "species" } },
    "Cytoscape (SIF)": { text: (node) => String(node.id), names: { NPM1: "NPM1" } },
    "Cytoscape (CSV table)": { text: (node) => String(node.id), names: { GAG: "GAG" } },
    D3: { text: (node) => String(node.id), names: { Myriel: "Myriel" } },
};

describe("the start page's files from other programs", () => {
    it("lists one card for each program, named for it, in its own section", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        const section = within(await screen.findByRole("region", { name: "Files from other programs" }));
        assert.deepEqual(
            PROGRAM_SAMPLES.map((sample) => sample.program),
            SAMPLES.map((sample) => sample.program),
        );
        for (const sample of PROGRAM_SAMPLES) {
            const card = section.getByRole("button", { name: sampleTile(sample.program) });
            assert.include(card.textContent, sample.size);
        }
        assert.lengthOf(section.getAllByRole("button", { name: /^Open the / }), SAMPLES.length);
    });

    it.each(PROGRAM_SAMPLES.map((sample) => [sample.program, sample] as const))(
        "serves %s's file as the load test reads it, and states its counts",
        async (_, sample) => {
            const entry = testFileOf(sample.url);
            const served = await bytesOf(`public/samples/programs/${entry.app}`);
            const stored = await bytesOf(`../graph-io/test/${entry.file}`);
            const tested = entry.file.endsWith(".gz") && !entry.app.endsWith(".gz") ? await gunzip(stored) : stored;
            assert.isTrue(
                served.length === tested.length && served.every((byte, i) => byte === tested[i]),
                `public/samples/programs/${entry.app} is graph-io/test/${entry.file}`,
            );
            assert.equal(sample.size, `${String(entry.nodes)} nodes, ${String(entry.edges)} edges`);
        },
    );

    it.each(PROGRAM_SAMPLES.map((sample) => [sample.program, sample] as const))(
        "opens the %s sample with every node and edge of its file",
        async (_, sample) => {
            const store = createWorkspaceStore();
            render(<Workspace store={store} />);
            const session = await openBy(store, () => pickSample(sample.program));
            const entry = testFileOf(sample.url);
            const statistics = session.data.statistics();
            assert.deepEqual([statistics.nodeCount, statistics.edgeCount], [entry.nodes, entry.edges]);
            assert.equal(store.get().project?.name, sample.name);
        },
    );

    it.each(PROGRAM_SAMPLES.map((sample) => [sample.program, sample] as const))(
        "says on the %s card whether its format carries styling, and labels the nodes of one that does not",
        async (_, sample) => {
            const entry = testFileOf(sample.url);
            assert.equal(sample.sentence.includes("carries no styling"), !entry.styled, sample.sentence);
            assert.equal(sample.labels !== undefined, !entry.styled, `${sample.program} labels`);
            if (sample.labels === undefined) {
                return;
            }
            const { session, element } = await openProgram(sample.program);
            const nodes = [...session.data.nodes()] as NodeRecord[];
            const labeledWith = LABELED_WITH[sample.program];
            assert.isDefined(labeledWith, `${sample.program} says what labels its nodes`);
            // the label layer is painted on a frame
            await waitFor(() => {
                const unlabeled = nodes.filter((node) => (element.labelOf(node.id)?.text ?? "") === "");
                assert.deepEqual(
                    unlabeled.map((node) => node.id),
                    [],
                    `${sample.program}: every node is labeled`,
                );
            });
            const wrong = nodes.filter((node) => element.labelOf(node.id)?.text !== labeledWith.text(node));
            assert.deepEqual(
                wrong.map((node) => `${String(node.id)}: ${String(element.labelOf(node.id)?.text)}`),
                [],
                `${sample.program}: every node is labeled from its column`,
            );
            for (const [id, text] of Object.entries(labeledWith.names)) {
                assert.equal(element.labelOf(id)?.text, text, `${sample.program} labels ${id}`);
            }
            // the labels are the opening's own: one Undo takes them back with the graph
            assert.equal(session.history.position, 1, `${sample.program} opens as one undo step`);
        },
    );

    it.each(
        PROGRAM_SAMPLES.filter((sample) => testFileOf(sample.url).styled).map(
            (sample) => [sample.program, sample] as const,
        ),
    )("draws the %s sample in the app's 3D view as its file states, with no key over it", async (_, sample) => {
        const entry = testFileOf(sample.url);
        // a desktop window, so the canvas and its toolbar are on screen beside the panels
        await page.viewport(1366, 768);
        const { session, element } = await openProgram(sample.program);
        await element.waitForSettled();
        await session.styles.settled();
        // the layout at rest and drawn (OGDF's is laid out by the force layout)
        await element.waitForStableFrame();
        // the view and the label settings the app opens a project with: every label shown, kept off nodes and edges
        assert.equal(element.viewMode, "3d");
        assert.deepInclude(element.layoutBehavior?.labels, { declutter: false, avoidNodesAndEdges: true });
        const stored = await bytesOf(`../graph-io/test/${entry.file}`);
        const file = await fileFacts(entry, entry.file.endsWith(".gz") ? await gunzip(stored) : stored);
        const nodes = file.ids;
        const edges = [...session.data.edges()].map((edge) => edge.id);

        // every node in the file's shape, every edge in its line style
        assert.deepEqual(
            counts(nodes.map((id) => session.styles.explain({ node: id }).merged["node.shape"])),
            counts(file.node("shape")),
            `${sample.program} shapes`,
        );
        const line: Readonly<Record<string, string>> = { solid: "solid", dash: "dashed", dot: "dotted" };
        assert.deepEqual(
            counts(edges.map((id) => line[String(session.styles.explain({ edge: id }).merged["edge.style"])])),
            counts(file.edge("lineStyle").map((style) => LINE_CLASS[String(style)])),
            `${sample.program} line styles`,
        );
        // every node the file labels is drawn with a label
        const texts = file.node("label");
        assert.equal(
            nodes.filter((id) => {
                const label = element.labelOf(id);
                return label?.drawn === true && label.text.trim() !== "";
            }).length,
            texts.filter((text) => typeof text === "string" && text.trim() !== "").length,
            `${sample.program} labeled nodes`,
        );
        // no two nodes drawn over each other that the file does not already overlap
        const boxes = nodes.flatMap((id) => {
            const at = element.nodeScreenPosition(id);
            if (at?.visible !== true) {
                return [];
            }
            const { left, top, right, bottom } = at.bounds;
            return [{ id, x: (left + right) / 2, y: (top + bottom) / 2, w: right - left, h: bottom - top }];
        });
        const already = fileOverlaps(file);
        assert.deepEqual(
            [...overlaps(boxes, 1)].filter((pair) => !already.has(pair)),
            [],
            `${sample.program} nodes drawn over each other that the file does not overlap`,
        );

        // the file's own drawing opens no key over it (Graphviz's row labels sat under one)
        assert.isNull(screen.queryByRole("region", { name: "Legend" }), `${sample.program} opens with no key`);
        // the columns holding each element's own style values are out of the reader's lists, and out of the key the
        // reader opens
        const hidden = session.data.attributes().filter((attribute) => attribute.hidden === true);
        assert.isNotEmpty(hidden, `${sample.program} keeps its style values in hidden columns`);
        const legendButton = within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", {
            name: "Legend",
        });
        assert.equal(legendButton.getAttribute("aria-pressed"), "false");
        await userEvent.click(legendButton);
        const legend = await screen.findByRole("region", { name: "Legend" });
        const shown = hidden.map((attribute) => attribute.name).filter((name) => legend.textContent?.includes(name));
        assert.deepEqual(shown, [], `${sample.program}'s key names no style value column`);
    });
});
