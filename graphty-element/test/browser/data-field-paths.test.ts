/**
 * @file The four data-shape settings a consumer can be told about but cannot set.
 *
 * `data.knownFields` says how the element reads a record: which key is the id, which is the
 * name, which is the weight, what a recorded position is measured in, and whether the file is a
 * digraph. Five of those have a reflecting property on the element -- `nodeIdPath`,
 * `edgeSrcIdPath`, `edgeDstIdPath`, `edgeIdPath`, `repeatedEdges` -- and four do not, although
 * every one of the four is read:
 *
 * - `nodeLabelPath` decides what a result card, a legend row and a ranked list CALL a node
 *   (`src/algorithms/results/labels.ts`);
 * - `edgeWeightPath` decides which record key a weighted algorithm reads
 *   (`src/managers/DataManager.ts`);
 * - `positionScale` converts a record's own coordinates into scene units (`src/data/GraphStore.ts`);
 * - `directed` overrules a file's header, and is the one setting a file cannot argue with
 *   (`src/data/ingest.ts`).
 *
 * A consumer holding an element had no way to say any of the four. That is what this file pins.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** How long the element needs to connect and finish its first update. */
const SETTLE_MS = 600;

let mounted: Graphty | null = null;

/**
 * Mount an element and wait for it to settle.
 * @param markup - the `<graphty-element>` tag, with its attributes
 * @returns the element
 */
async function mountMarkup(markup: string): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.innerHTML = markup;
    document.body.appendChild(container);

    const element = container.querySelector("graphty-element") as Graphty;
    mounted = element;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

    return element;
}

/**
 * What the element's configuration currently says about how records are read.
 * @param element - the mounted element
 * @returns the parsed `data` block
 */
function dataConfig(element: Graphty): {
    knownFields: { nodeLabelPath: string | null; edgeWeightPath: string | null; positionScale: number };
    directed: boolean | "auto";
} {
    return element.graph.styles.config.data;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("the four data-shape settings a consumer could not reach", () => {
    test("nodeLabelPath says what to call a node", async () => {
        const element = await mountMarkup(`<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`);

        element.nodeLabelPath = "name";

        assert.strictEqual(element.nodeLabelPath, "name", "the property reads back");
        assert.strictEqual(dataConfig(element).knownFields.nodeLabelPath, "name", "and reaches the configuration");
    });

    test("node-label-path reaches the same setting from markup", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block" node-label-path="name"></graphty-element>`,
        );

        assert.strictEqual(dataConfig(element).knownFields.nodeLabelPath, "name");
    });

    test("edgeWeightPath says which record key carries the weight", async () => {
        const element = await mountMarkup(`<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`);

        element.edgeWeightPath = "cost";

        assert.strictEqual(element.edgeWeightPath, "cost");
        assert.strictEqual(dataConfig(element).knownFields.edgeWeightPath, "cost");
    });

    test("positionScale converts a record's coordinates into scene units", async () => {
        const element = await mountMarkup(`<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`);

        element.positionScale = 10;

        assert.strictEqual(element.positionScale, 10);
        assert.strictEqual(dataConfig(element).knownFields.positionScale, 10);
    });

    test("position-scale parses as a number from markup, not as text", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block" position-scale="2.5"></graphty-element>`,
        );

        assert.strictEqual(dataConfig(element).knownFields.positionScale, 2.5);
    });

    test("a positionScale the schema refuses is reported and dropped", async () => {
        const element = await mountMarkup(`<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`);

        element.positionScale = 0;

        assert.strictEqual(dataConfig(element).knownFields.positionScale, 1, "the default survives a refused value");
    });

    test("directed overrules what a file's header says", async () => {
        const element = await mountMarkup(`<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`);

        element.directed = false;

        assert.strictEqual(element.directed, false);
        assert.strictEqual(dataConfig(element).directed, false);
    });

    test("directed=\"auto\" from markup leaves the file to decide", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block" directed="auto"></graphty-element>`,
        );

        assert.strictEqual(dataConfig(element).directed, "auto");
    });

    test("directed=\"true\" from markup settles it as a digraph", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block" directed="true"></graphty-element>`,
        );

        assert.strictEqual(dataConfig(element).directed, true);
    });
});
