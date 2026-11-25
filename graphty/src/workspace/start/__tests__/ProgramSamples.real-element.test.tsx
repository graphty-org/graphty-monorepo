/**
 * The start page's section of sample files from other programs, on the real graphty-element with file styles on, as
 * every deployed site runs: it lists one card per program, named for the program; each card's file is the official
 * load test's file (graph-io/test/corpus/programs/samples.json), byte for byte; and a click opens the file as a new
 * project holding every node and edge the file does.
 */

import "../../../index.css";
import "@graphty/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import SAMPLES from "../../../../../graph-io/test/corpus/programs/samples.json";
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
            const tested = entry.file.endsWith(".gz") ? await gunzip(stored) : stored;
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
            const store = createWorkspaceStore();
            render(<Workspace store={store} />);
            const session = await openBy(store, () => pickSample(sample.program));
            const element = document.querySelector("graphty-element");
            assert.isNotNull(element);
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
});
