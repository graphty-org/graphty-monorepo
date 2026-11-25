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
            const nodes = [...session.data.nodes()];
            // the label layer is painted on a frame
            await waitFor(() => {
                const unlabeled = nodes.filter((node) => (element.labelOf(node.id)?.text ?? "") === "");
                assert.deepEqual(
                    unlabeled.map((node) => node.id),
                    [],
                    `${sample.program}: every node is labeled`,
                );
            });
            // the labels are the opening's own: one Undo takes them back with the graph
            assert.equal(session.history.position, 1, `${sample.program} opens as one undo step`);
        },
    );
});
