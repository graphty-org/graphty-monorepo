/**
 * @file The element's sample models (design/rendering/node-models.md, section 10): every sample in
 * `session.catalog.models()` has a thumbnail a page can show, draws on the nodes a layer names it
 * for with no file added, is read once however many layers name it, and never joins the session's
 * own assets. The guide's per-kind encoding draws each kind as its sample.
 */

import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { ModelCache } from "../../../src/models/ModelCache";
import { drawnAsModel, modelEvents, mount, nextModelEvent } from "./helpers";

const NODES = [
    { id: "web", kind: "server" },
    { id: "db", kind: "server" },
    { id: "alice", kind: "person" },
    { id: "oak", kind: "tree" },
    { id: "crate", kind: "box" },
    { id: "r2", kind: "robot" },
];

describe("the sample models", () => {
    it("have thumbnails a page can show", async () => {
        const element = await mount();
        const models = element.session.catalog.models();
        assert.deepEqual(
            models.map((m) => m.id),
            ["asset:sample/box", "asset:sample/server", "asset:sample/person", "asset:sample/tree"],
        );
        for (const model of models) {
            const image = new Image();
            image.src = model.thumbnail;
            await image.decode();
            assert.deepEqual([image.naturalWidth, image.naturalHeight], [128, 128], model.id);
        }
    });

    it("draw each kind as its sample from one encoding, with no file added", async () => {
        const element = await mount();
        element.nodeData = NODES;
        await operationQueueOf(element.graph).waitForCompletion();
        const events = modelEvents(element);
        const drawn = new Set<string>();
        const allDrawn = new Promise<void>((resolve) => {
            element.addEventListener("graphty-model-change", (event) => {
                if (event.detail.state === "drawn") {
                    drawn.add(event.detail.ref);
                }

                if (drawn.size === 4) {
                    resolve();
                }
            });
        });

        await element.session.styles.encode({
            column: { kind: "node", name: "kind" },
            channel: "node.model",
            values: {
                server: "asset:sample/server",
                person: "asset:sample/person",
                tree: "asset:sample/tree",
                box: "asset:sample/box",
            },
        });
        await allDrawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        for (const id of ["web", "db", "alice", "oak", "crate"]) {
            assert.isTrue(drawnAsModel(element.graph, id), `${id} is drawn as its sample`);
        }

        assert.isFalse(drawnAsModel(element.graph, "r2"), "an unlisted kind keeps its shape");
        const source = (id: string): unknown => (element.graph.getNodeMesh(id) as InstancedMesh).sourceMesh;
        assert.strictEqual(source("web"), source("db"), "both servers share one model");
        assert.equal(ModelCache.of(element.graph)?.size, 4);
        assert.isEmpty(
            events.filter((e) => e.state === "rejected" || e.state === "failed"),
            "nothing failed",
        );
        assert.isEmpty(element.session.assets.list(), "samples are not the session's assets");
        assert.equal(element.session.assets.get("asset:sample/server")?.state, "accepted");
    });

    it("hold back the finished frame until the model is on screen", async () => {
        const element = await mount();
        element.nodeData = NODES;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        await element.session.styles.add({
            name: "Servers",
            target: "node",
            selector: { match: "expression", where: "data.kind == 'server'" },
            set: { "node.model": "asset:sample/server" },
        });

        // No model event awaited: the stable frame alone must mean the model is drawn.
        await element.waitForStableFrame();
        assert.isTrue(drawnAsModel(element.graph, "web"));
        assert.isTrue(drawnAsModel(element.graph, "db"));
    });

    it("draw a sample a layer names literally, and report an unknown sample with its shape kept", async () => {
        const element = await mount();
        element.nodeData = NODES;
        await operationQueueOf(element.graph).waitForCompletion();
        const tree = nextModelEvent(element, (c) => c.ref === "asset:sample/tree" && c.state === "drawn");
        const teapot = nextModelEvent(element, (c) => c.ref === "asset:sample/teapot" && c.state === "rejected");
        await element.session.styles.add({
            name: "Trees",
            target: "node",
            selector: { match: "expression", where: "data.kind == 'tree'" },
            set: { "node.model": "asset:sample/tree" },
        });
        await element.session.styles.add({
            name: "Robots",
            target: "node",
            selector: { match: "expression", where: "data.kind == 'robot'" },
            set: { "node.model": "asset:sample/teapot" },
        });

        await tree;
        const rejected = await teapot;
        await element.waitForStableFrame();
        assert.isTrue(drawnAsModel(element.graph, "oak"));
        assert.isFalse(drawnAsModel(element.graph, "r2"));
        assert.deepEqual(rejected.problems, [{ code: "E_MODEL_UNKNOWN_ASSET", params: { id: "asset:sample/teapot" } }]);
    });
});
