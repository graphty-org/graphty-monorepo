/**
 * The start page lists what graphty-element's catalog lists, with no list of its own: a dataset and
 * a generator added to the catalog appear in the library, the dataset with its size and first
 * sentence and the generator with the form its own parameters build, on the real element. That a
 * generator opens a graph from that form is StartPageFrame.real-element.test.tsx's.
 */

import "../../../index.css";
import "@graphty/graphty-element";

import {
    DATASET_DESCRIPTORS,
    type DatasetMeta,
    GENERATOR_DESCRIPTORS,
    type GeneratorDescriptor,
} from "@graphty/graphty-element/catalog";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { sampleTile } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { setSampleCatalogForTests } from "../sampleLibrary";

/** A dataset graph-samples does not ship. */
const FAKE_DATASET: DatasetMeta = {
    name: "fake-test-network",
    title: "Fake test network",
    description: "A dataset that exists only in this test. It has a second sentence.",
    citation: "Nobody 2026",
    source: "https://example.org/fake",
    license: "CC0",
    nodes: 12,
    edges: 11,
    directed: false,
    weighted: false,
    attributes: {},
    groundTruth: null,
    showcases: [],
};

/** A generator graph-samples does not ship. */
const FAKE_GENERATOR: GeneratorDescriptor = {
    name: "fake-ring",
    plainName: "Fake ring",
    description: "A ring that exists only in this test.",
    params: [
        { name: "n", plainName: "Nodes", type: "integer", default: 9, min: 3 },
        { name: "closed", plainName: "Closed", type: "boolean", default: true },
    ],
};

afterEach(() => {
    setSampleCatalogForTests();
    forgetUsageAnswer();
});

describe("the start page lists graphty-element's catalog", () => {
    it("shows a dataset and a generator added to the catalog, the generator with its own parameters", async () => {
        setSampleCatalogForTests({
            datasets: [...DATASET_DESCRIPTORS, FAKE_DATASET],
            generators: [...GENERATOR_DESCRIPTORS, FAKE_GENERATOR],
        });
        render(<Workspace store={createWorkspaceStore()} />);
        const library = within(screen.getByRole("region", { name: "Sample library" }));

        const dataset = library.getByRole("button", { name: sampleTile(FAKE_DATASET.title) });
        assert.include(dataset.textContent, "12 nodes, 11 edges");
        assert.equal(dataset.getAttribute("title"), "A dataset that exists only in this test.");
        assert.lengthOf(
            library.getAllByRole("button", { name: /^Generate a graph: / }),
            GENERATOR_DESCRIPTORS.length + 1,
        );

        await userEvent.click(library.getByRole("button", { name: "Generate a graph: Fake ring" }));
        const dialog = await screen.findByRole("dialog", { name: "Fake ring" });
        assert.include(dialog.textContent, FAKE_GENERATOR.description);
        assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Nodes" }).value, "9");
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("switch", { name: "Closed" }).checked);
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
    });
});
