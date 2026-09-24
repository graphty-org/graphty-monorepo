/**
 * @file The `node-data` and `edge-data` attributes, exactly as the getting-started guide writes
 * them.
 *
 * The first example a stranger meets is markup, not script:
 *
 *     <graphty-element node-data='[{"id":"a"},{"id":"b"}]' edge-data='[{"source":"a","target":"b"}]'>
 *
 * Neither property declared a Lit converter, so the setter was handed the raw attribute TEXT,
 * `Array.isArray` was false, and every row was dropped with no error at all. The guide's opening
 * example drew an empty canvas, and nothing said why. That is the same silent class as the
 * endpoint spelling this release fixes: a plausible result, no warning, and a document that
 * disagrees with the runtime.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** How long the element needs to connect, finish its first update and ingest the attributes. */
const SETTLE_MS = 600;

let mounted: Graphty | null = null;

/**
 * Mount an element written the way the guide writes it, and wait for it to settle.
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

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("the markup form of the guide's first example", () => {
    test("builds the graph the attributes describe", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                node-data='[{"id": "a"}, {"id": "b"}]'
                edge-data='[{"source": "a", "target": "b"}]'></graphty-element>`,
        );

        assert.deepStrictEqual(element.nodeData, [{ id: "a" }, { id: "b" }], "the attribute parsed into records");
        assert.strictEqual(element.getNodeCount(), 2, "two nodes, not an empty canvas");
        assert.strictEqual(element.getEdgeCount(), 1, "and the edge between them");
    });

    test("refuses text that is not JSON without taking the element down", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                node-data='not json at all'></graphty-element>`,
        );

        assert.isUndefined(element.nodeData, "nothing was set from text that could not be read");
        assert.strictEqual(element.getNodeCount(), 0);
    });

    test("refuses a JSON object where an array of records belongs", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                node-data='{"id": "a"}'></graphty-element>`,
        );

        assert.isUndefined(element.nodeData, "one record is not a list of records");
        assert.strictEqual(element.getNodeCount(), 0);
    });
});

describe("the repeat policy, in markup", () => {
    test("keeps both edges of a repeated pair by default", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                node-data='[{"id": "a"}, {"id": "b"}]'
                edge-data='[{"source": "a", "target": "b"}, {"source": "a", "target": "b"}]'></graphty-element>`,
        );

        assert.strictEqual(element.getEdgeCount(), 2, "a file that lists a pair twice holds two edges");
    });

    test("folds them into one when the markup asks it to", async () => {
        // Before this attribute existed the policy was reachable only by reaching into
        // `element.getStyles().config`, which is the element's own configuration object -- so a
        // capability the element has had since the repeat policy landed could not be switched on
        // by anyone consuming the element the way its own guide teaches.
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                repeated-edges="first"
                node-data='[{"id": "a"}, {"id": "b"}]'
                edge-data='[{"source": "a", "target": "b"}, {"source": "a", "target": "b"}]'></graphty-element>`,
        );

        assert.strictEqual(element.repeatedEdges, "first", "the attribute reached the property");
        assert.strictEqual(element.getEdgeCount(), 1, "and the second record did not become an edge");
    });

    test("reports a policy it does not have without taking the element down", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                repeated-edges="merge-somehow"
                node-data='[{"id": "a"}, {"id": "b"}]'
                edge-data='[{"source": "a", "target": "b"}, {"source": "a", "target": "b"}]'></graphty-element>`,
        );

        assert.isUndefined(element.repeatedEdges, "an unrecognised policy is dropped, not stored");
        assert.strictEqual(element.getNodeCount(), 2, "and the graph still drew");
        assert.strictEqual(element.getEdgeCount(), 2, "on the default policy it kept");
    });

    test("treats two records sharing a named edge id as one edge", async () => {
        const element = await mountMarkup(
            `<graphty-element style="width:100%;height:100%;display:block"
                edge-id-path="edgeId"
                repeated-edges="last"
                node-data='[{"id": "a"}, {"id": "b"}]'
                edge-data='[{"source": "a", "target": "b", "edgeId": "e1", "label": "first"},
                            {"source": "a", "target": "b", "edgeId": "e1", "label": "second"}]'></graphty-element>`,
        );

        assert.strictEqual(element.edgeIdPath, "edgeId");
        assert.strictEqual(element.getEdgeCount(), 1, "one identifier, one edge");
    });
});
