/**
 * The start screen's sample library against the data it describes: a sample's size is written
 * before anything loads, so it can drift from the file the element imports. Also pins the kinds
 * of graph the library must keep offering: a directed sample, a timed one, and a real protein
 * interaction network (issue #288).
 */

import { DATASET_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { fitsInBrowser } from "../../workspace/start/library";
import { START_SAMPLES } from "../sampleManifest";

/** The node-link JSON the timed samples are written as. */
interface NodeLinkFile {
    readonly directed: boolean;
    readonly nodes: readonly Record<string, unknown>[];
    readonly links: readonly Record<string, unknown>[];
}

/**
 * Reads a sample's file as the element would import it.
 * @param id - the sample's id.
 * @returns the parsed file.
 */
async function load(id: string): Promise<NodeLinkFile> {
    const sample = START_SAMPLES.find((each) => each.id === id);
    assert.isDefined(sample, `no start sample "${id}"`);
    const response = await fetch(sample?.url ?? "");
    assert.isTrue(response.ok, `could not fetch ${id}`);
    return (await response.json()) as NodeLinkFile;
}

const JSON_SAMPLES = START_SAMPLES.filter((sample) => sample.url.endsWith(".json"));

describe("START_SAMPLES", () => {
    it.each(JSON_SAMPLES.map((sample) => [sample.id, sample.size] as const))(
        "%s states the counts of the file it loads",
        async (id, size) => {
            const file = await load(id);
            const counted = `${file.nodes.length.toLocaleString("en-US")} nodes, ${file.links.length.toLocaleString("en-US")} edges`;
            assert.equal(size, counted);
        },
    );

    it("offers a directed sample whose nodes carry a time attribute", async () => {
        const papers = await load("paper-citations");
        assert.isTrue(papers.directed);
        assert.isTrue(papers.nodes.every((node) => typeof node.year === "number"));
    });

    it("offers a sample whose edges carry a time", async () => {
        const contacts = await load("campus-contacts");
        assert.isTrue(contacts.links.every((link) => typeof link.time === "string"));
    });

    it("lists a real protein interaction network from graph-samples, with its source and license", () => {
        const stelzl = DATASET_DESCRIPTORS.find((dataset) => dataset.name === "stelzl-interactome");
        assert.isDefined(stelzl);
        if (stelzl === undefined) {
            return;
        }
        // The start screen lists every catalog dataset that fits; graph-samples' own tests pin
        // these counts against the data.
        assert.isTrue(fitsInBrowser(stelzl));
        assert.deepEqual([stelzl.nodes, stelzl.edges, stelzl.directed], [1691, 3128, true]);
        assert.match(stelzl.source, /^https:\/\//);
        assert.isNotEmpty(stelzl.license);
    });
});
