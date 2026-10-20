/**
 * @file Per-node models from a data column (design/rendering/node-models.md, section 2.2):
 * `styles.encode({ column, channel: "node.model", values })` draws each listed kind as its model,
 * leaves an unlisted kind on `node.shape`, prepares each model once however many nodes share it,
 * and refuses a URL -- or any value read from the data -- with `E_MODEL_URL_BLOCKED` and no
 * request.
 *
 * The three models are built as bytes by `test/fixtures/models/fixtures.ts` and added under
 * names, standing in for the element's sample models; each has its own vertex count, so a node's
 * mesh says which model it draws.
 */

import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { ModelCache } from "../../../src/models/ModelCache";
import type { ModelChange } from "../../../src/session/types";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { drawnAsModel, modelEvents, mount, stubFetch } from "./helpers";

/** The graph: two servers, two people, one tree, and a robot no encoding lists. */
const NODES = [
    { id: "web", kind: "server" },
    { id: "db", kind: "server" },
    { id: "alice", kind: "person" },
    { id: "bob", kind: "person" },
    { id: "oak", kind: "tree" },
    { id: "r2", kind: "robot" },
];

const EDGES = [
    { source: "alice", target: "web" },
    { source: "bob", target: "web" },
    { source: "web", target: "db" },
    { source: "oak", target: "r2" },
];

/**
 * Mount the graph, with its data.
 * @returns The element.
 */
async function graphOfKinds(): Promise<Graphty> {
    const element = await mount();
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * How many vertices a node's model has, or null when it draws no model.
 * @param element - The element.
 * @param id - The node.
 * @returns The vertex count of the model's mesh.
 */
function modelVertices(element: Graphty, id: string): number | null {
    if (!drawnAsModel(element.graph, id)) {
        return null;
    }

    return (element.graph.getNodeMesh(id) as InstancedMesh).sourceMesh.getTotalVertices();
}

describe("styles.encode on node.model", () => {
    it("draws each kind as its model, an unlisted kind as its shape, and prepares each model once", async () => {
        const element = await graphOfKinds();
        const requested = stubFetch(new Map());
        const events = modelEvents(element);
        const { assets, styles } = element.session;
        const allDrawn = new Promise<void>((resolve) => {
            const seen = new Set<string>();
            const listener = (event: CustomEvent<ModelChange>): void => {
                if (event.detail.state === "drawn") {
                    seen.add(event.detail.ref);
                }

                if (seen.size === 3) {
                    element.removeEventListener("graphty-model-change", listener);
                    resolve();
                }
            };
            element.addEventListener("graphty-model-change", listener);
        });
        const server = await assets.add(sphereGlb(8, 4), { name: "asset:server" });
        const person = await assets.add(sphereGlb(12, 6), { name: "asset:person" });
        const tree = await assets.add(sphereGlb(16, 8), { name: "asset:tree" });
        assert.deepEqual(
            [server.state, person.state, tree.state],
            ["accepted", "accepted", "accepted"],
            "the three models pass intake",
        );

        const layer = await styles.encode({
            column: { kind: "node", name: "kind" },
            channel: "node.model",
            values: { server: server.id, person: person.id, tree: tree.id },
        });
        assert.deepInclude(layer.encode?.["node.model"], {
            by: "data.kind",
            map: { server: "asset:server", person: "asset:person", tree: "asset:tree" },
            unmapped: "skip",
        });

        // Settled when every model is drawn: one "drawn" event per model.
        await allDrawn;
        const drawn = (): string[] => events.filter((change) => change.state === "drawn").map((change) => change.ref);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.sameMembers(drawn(), ["asset:server", "asset:person", "asset:tree"], "one drawn event per model");
        const vertices = Object.fromEntries(NODES.map((node) => [node.id, modelVertices(element, node.id)]));
        assert.isNull(vertices.r2, "the unlisted robot keeps node.shape");
        const [serverV, personV, treeV] = [vertices.web, vertices.alice, vertices.oak];
        assert.isNotNull(serverV);
        assert.isNotNull(personV);
        assert.isNotNull(treeV);
        assert.equal(
            new Set([serverV, personV, treeV]).size,
            3,
            `each kind draws a different model: ${JSON.stringify(vertices)}`,
        );
        assert.equal(vertices.db, serverV, "both servers draw the server model");
        assert.equal(vertices.bob, personV, "both people draw the person model");

        // One template per distinct model, shared by every node of its kind.
        assert.equal(ModelCache.of(element.graph)?.size, 3);
        const source = (id: string): unknown => (element.graph.getNodeMesh(id) as InstancedMesh).sourceMesh;
        assert.strictEqual(source("web"), source("db"));
        assert.strictEqual(source("alice"), source("bob"));
        assert.lengthOf(
            events.filter((change) => change.state === "rejected" || change.state === "failed"),
            0,
            "nothing failed",
        );
        assert.lengthOf(
            requested.filter((url) => !url.startsWith("blob:")),
            0,
            "asset ids are never fetched",
        );
    });

    it("refuses a URL in the value map with E_MODEL_URL_BLOCKED, and requests nothing", async () => {
        const element = await graphOfKinds();
        const requested = stubFetch(new Map());
        const { styles } = element.session;
        const before = styles.list().length;
        const spec = {
            column: { kind: "node", name: "kind" },
            channel: "node.model",
            values: { server: "https://example.com/models/rack.glb" },
        } as const;

        const proposal = styles.proposeEncoding(spec);
        assert.isFalse(proposal.ok);
        assert.equal(proposal.ok ? null : proposal.refusal.code, "E_MODEL_URL_BLOCKED");

        let refusal: unknown;
        try {
            await styles.encode(spec);
        } catch (error) {
            refusal = error;
        }

        assert.equal((refusal as { code?: string } | undefined)?.code, "E_MODEL_URL_BLOCKED");
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.equal(styles.list().length, before, "no layer was added");
        assert.isFalse(drawnAsModel(element.graph, "web"));
        assert.lengthOf(requested, 0, "no request was made");
    });

    it("refuses a node.model read from the data, in a layer added by hand", async () => {
        const element = await graphOfKinds();
        const requested = stubFetch(new Map());
        element.nodeData = NODES.map((node) => ({ ...node, model: "https://example.com/models/rack.glb" }));
        await operationQueueOf(element.graph).waitForCompletion();

        let refusal: unknown;
        try {
            await element.session.styles.add({
                name: "models from the data",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.model": { by: "data.model", scale: "passthrough" } },
            });
        } catch (error) {
            refusal = error;
        }

        assert.equal((refusal as { code?: string } | undefined)?.code, "E_MODEL_URL_BLOCKED");
        await element.waitForStableFrame();
        assert.lengthOf(requested, 0, "no request was made");
    });
});
