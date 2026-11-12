/**
 * @file Per-node models from a data column (design/rendering/node-models.md, section 2.2):
 * `styles.encode({ column, channel: "node.model", values })` draws each listed kind as its model,
 * leaves an unlisted kind on `node.shape`, prepares each model once however many nodes share it,
 * and fetches a URL -- listed or read from the data -- only once the reader allows its host, once
 * per distinct URL however many nodes name it.
 *
 * The three models are built as bytes by `test/fixtures/models/fixtures.ts` and added under
 * names, standing in for the element's sample models; each has its own vertex count, so a node's
 * mesh says which model it draws.
 */

import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { ModelCache } from "../../../src/models/ModelCache";
import type { ModelChange } from "../../../src/session/types";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { drawnAsModel, modelEvents, mount, nextModelEvent, stubFetch } from "./helpers";

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

    it("fetches a URL in the value map only once the reader allows its host, once for every node", async () => {
        const rack = "https://models.example.com/rack.glb";
        const element = await graphOfKinds();
        const requested = stubFetch(new Map([[rack, sphereGlb(12, 6)]]));
        const asked = new Promise((resolve) => {
            element.session.on("network:pending", resolve);
        });
        const drawn = nextModelEvent(element, (change) => change.ref === rack && change.state === "drawn");
        await element.session.styles.encode({
            column: { kind: "node", name: "kind" },
            channel: "node.model",
            values: { server: rack },
        });
        await asked;

        const [request] = element.session.network.pending();
        assert.equal(request.code, "W_URL_NEEDS_APPROVAL");
        assert.equal(request.params.url, rack);
        assert.equal(request.params.host, "models.example.com");
        assert.equal(request.params.kind, "model");
        assert.equal(request.params.by, "data");
        assert.notInclude(requested, rack, "nothing is fetched before the answer");

        await element.session.network.allow(request.params.id);
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "web"));
        assert.isTrue(drawnAsModel(element.graph, "db"));
        assert.lengthOf(
            requested.filter((url) => url === rack),
            1,
            "one request for both servers",
        );
        assert.lengthOf(element.session.network.pending(), 0);
    });

    it("draws a column of URLs, one request per distinct URL, and refuses what the reader denies", async () => {
        const ball = "https://models.example.com/ball.glb";
        const other = "https://elsewhere.example.org/x.glb";
        const element = await graphOfKinds();
        const requested = stubFetch(new Map([[ball, sphereGlb(12, 6)]]));
        element.nodeData = NODES.map((node) => ({ ...node, model: node.kind === "robot" ? other : ball }));
        await operationQueueOf(element.graph).waitForCompletion();
        const drawn = nextModelEvent(element, (change) => change.ref === ball && change.state === "drawn");
        const refused = nextModelEvent(element, (change) => change.ref === other && change.state === "rejected");

        await element.session.styles.add({
            name: "models from the data",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.model": { by: "data.model", scale: "passthrough" } },
        });
        await element.waitForStableFrame();
        const pending = element.session.network.pending();
        assert.sameMembers(
            pending.map((request) => request.params.url),
            [ball, other],
        );
        for (const request of pending) {
            if (request.params.url === ball) {
                await element.session.network.allow(request.params.id);
            } else {
                element.session.network.deny(request.params.id);
            }
        }

        await drawn;
        const blocked = await refused;
        assert.equal(blocked.problems[0]?.code, "E_MODEL_URL_BLOCKED");
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "web"));
        assert.isTrue(drawnAsModel(element.graph, "oak"));
        assert.isFalse(drawnAsModel(element.graph, "r2"), "the denied URL keeps the shape");
        assert.lengthOf(
            requested.filter((url) => url === ball),
            1,
            "five nodes, one request",
        );
        assert.notInclude(requested, other);
    });
});
