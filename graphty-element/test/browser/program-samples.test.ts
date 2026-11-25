/**
 * The sample files from other programs that the graphty app's start page offers
 * (graph-io/test/corpus/programs/samples.json, one per program), each loaded into a real `<graphty-element>` with its
 * file's styles the way the app opens it: in the 3D view, every label drawn (declutter off) and kept off the nodes and
 * edges it would cover (avoidance on), and then switched to the 2D view. In both views every node and edge arrives,
 * and the drawing holds what the file states, counted over every node and edge (fidelity/program-sample-checks.ts).
 */
import { afterEach, assert, describe, it } from "vitest";

import SAMPLES from "../../../graph-io/test/corpus/programs/samples.json";
import type { Scene } from "../../../graph-io/test/fidelity/scene";
import { fileFacts } from "../../../graph-io/test/programs/program-file-facts";
import type { Graphty } from "../../index.js";
import { drawnScene, mountSample, readSample, unmount } from "../fidelity/mount";
import { checkStyled, EXPECTED, type Expected, widthToSpacing } from "../fidelity/program-sample-checks";

/** A sample whose format carries no styling: the column its node labels come from, and one node's text in it. */
interface Unstyled {
    /** The column the element offers for the label role, or null when the node id is the label. */
    readonly column: string | null;
    /** A node and the text the file gives it in that column. */
    readonly node?: readonly [string, string];
}

const UNSTYLED: Readonly<Record<string, Unstyled>> = {
    // a person's name; a film has a title instead
    neo4j: { column: "name", node: ["Keanu", "Keanu Reeves"] },
    // the term's name
    "obo-foundry": { column: "name", node: ["TAXRANK:0000006", "species"] },
    // nothing but the ids
    "cytoscape-sif": { column: null },
    "cytoscape-table": { column: null },
    // a name as the id and a group number
    d3: { column: null },
};

/**
 * The drawing the element shows now, once it has settled.
 * @param element - the element
 * @param sha256 - the sample's hash
 * @param command - how it was loaded
 * @returns the scene
 */
async function settledScene(element: Graphty, sha256: string, command: string): Promise<Scene> {
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();
    return drawnScene(element, sha256, command);
}

afterEach(() => {
    unmount();
});

describe("the sample files from other programs, drawn with their file styles as the graphty app opens them", () => {
    it("has an expectation for every sample", () => {
        assert.deepEqual(
            SAMPLES.filter((sample) => sample.styled).map((sample) => sample.id),
            Object.keys(EXPECTED),
        );
        assert.deepEqual(
            SAMPLES.filter((sample) => !sample.styled).map((sample) => sample.id),
            Object.keys(UNSTYLED),
        );
    });

    it.each(SAMPLES.map((sample) => [sample.program, sample] as const))("%s", async (_, sample) => {
        // a table whose header does not name its edge ends names them in the source's options; a Neo4j file is
        // read by the element's CSV source, which knows it by its header
        const columns = "columns" in sample ? sample.columns : undefined;
        const options = columns === undefined ? undefined : { edgeSource: columns.source, edgeTarget: columns.target };
        const type = ("type" in sample ? sample.type : undefined) ?? sample.format;
        const { element, sha256, command } = await mountSample(
            { id: sample.id, format: type, file: sample.file, license: sample.license, routes: [] },
            undefined,
            undefined,
            options,
            // as the graphty app opens a sample from its start page, in its 3D view
            "placed",
            "3d",
        );
        const { counts: drawnCounts } = element.session.status;
        assert.deepEqual([drawnCounts.nodes, drawnCounts.edges], [sample.nodes, sample.edges], `${sample.id} counts`);
        const expected = EXPECTED[sample.id] as Expected | undefined;
        if (expected === undefined) {
            // no labels of its own: the element offers the file's name column for the label role, else the node id
            const unstyled = UNSTYLED[sample.id];
            assert.isDefined(unstyled, `${sample.id} has an expectation`);
            assert.equal(
                element.session.data.roleCandidate("node", "label"),
                unstyled.column,
                `${sample.id} label column`,
            );
            if (unstyled.node !== undefined && unstyled.column !== null) {
                const [id, text] = unstyled.node;
                const record = [...element.session.data.nodes()].find((node) => node.id === id);
                assert.equal(record?.[unstyled.column], text, `${sample.id} node ${id} ${unstyled.column}`);
            }
            return;
        }
        const file = await fileFacts(sample, new Uint8Array(await (await readSample(sample.file)).data.arrayBuffer()));
        if (file.positions !== null) {
            assert.equal(element.layout, "fixed", `${sample.id} is drawn where the file placed it`);
            assert.equal(element.session.seededNodeCount, sample.nodes);
        }
        if (expected.layout !== undefined) {
            assert.equal(element.layout, expected.layout, `${sample.id} is laid out as its file asks`);
        }
        // as the graphty app draws it (its ElementHost): every label shown, labels kept off the nodes and edges they
        // cover, and a size bound to data drawn at one depth's scale
        const sizeBound = element.session.styles
            .legend()
            .some((block) => block.channel === "node.size" && block.field !== undefined);
        element.layoutBehavior = {
            ...element.layoutBehavior,
            labels: { declutter: false, avoidNodesAndEdges: true },
            node: { sizeSpace: sizeBound ? "pivot" : undefined },
        };
        const view3d = await settledScene(element, sha256, command);
        checkStyled(sample, "3D", view3d, file, expected);
        // the app's 2D button
        element.viewMode = "2d";
        const view2d = await settledScene(element, sha256, command);
        checkStyled(sample, "2D", view2d, file, expected);
        // a drawing flat on its plane is drawn in the same proportions in perspective: its nodes as large beside the gaps
        // between them in 3D as in 2D (a label hung in front of a Graphviz box once moved the orbit pivot off the plane,
        // and a size drawn at the pivot's depth drew every box a fifth larger, over its neighbors)
        assert.closeTo(
            widthToSpacing(view3d.nodes) / widthToSpacing(view2d.nodes),
            1,
            0.03,
            `${sample.id} node size beside the gaps, 3D over 2D`,
        );
    });
});
