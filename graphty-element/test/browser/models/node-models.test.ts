/**
 * @file Nodes drawn as loaded 3D models (`node.model`, design/rendering/node-models.md): the
 * design's first example, failures and refusals reported once per model, URL provenance, fit,
 * instancing, picking, tint, freeing a template, and the frame cost at a thousand nodes.
 *
 * Every model here is built as bytes by `test/fixtures/models/fixtures.ts`. The one URL on the web,
 * the design's own `https://example.com/models/rack.glb`, is answered by a stub of `fetch`, so the
 * test makes no request off this machine and the example still runs exactly as written.
 */

import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { ModelCache } from "../../../src/models/ModelCache";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { drawnAsModel, modelEvents, mount, nextModelEvent, stubFetch } from "./helpers";

/** The design's example URL. */
const RACK_URL = "https://example.com/models/rack.glb";

describe("nodes drawn as models", () => {
    it("draws the design's first example: the model on both servers, a sphere on alice", async () => {
        stubFetch(new Map([[RACK_URL, sphereGlb(16, 8, [0.5, 1, 0.4])]]));
        const graph = await mount();
        const drawn = nextModelEvent(graph, (change) => change.ref === RACK_URL && change.state === "drawn");

        // The design's section 2.1, as written.
        graph.nodeData = [
            { id: "web", kind: "server" },
            { id: "db", kind: "server" },
            { id: "alice", kind: "person" },
        ];
        graph.edgeData = [
            { source: "alice", target: "web" },
            { source: "web", target: "db" },
        ];

        await graph.session.styles.add({
            name: "Servers as racks",
            target: "node",
            selector: { match: "expression", where: "data.kind == 'server'" },
            set: { "node.model": "https://example.com/models/rack.glb" },
        });

        const record = await graph.session.assets.ready(RACK_URL);
        assert.equal(record.state, "accepted");
        await drawn;
        await operationQueueOf(graph.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(graph.graph, "web"), "web is the model");
        assert.isTrue(drawnAsModel(graph.graph, "db"), "db is the model");
        assert.isFalse(drawnAsModel(graph.graph, "alice"), "alice keeps her shape");
        // A page that mounts later reads the same state from the session.
        const state = graph.session.assets.states().find((change) => change.ref === RACK_URL);
        assert.equal(state?.state, "drawn");
    });

    it("leaves the placeholder on a 404, and says so once, by the URL the layer named", async () => {
        const url = `${location.origin}/no-such-model-${String(Date.now())}.glb`;
        const graph = await mount();
        const events = modelEvents(graph);
        await graph.graph.addNodes([{ id: "a" }]);
        const layer = await graph.session.styles.add({
            name: "missing",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": url },
        });
        const record = await graph.session.assets.ready(url);
        assert.equal(record.state, "rejected");
        assert.equal(record.problems[0]?.code, "E_MODEL_FETCH");
        assert.equal(record.problems[0]?.params.status, 404);
        await operationQueueOf(graph.graph).waitForCompletion();
        await graph.waitForStableFrame();

        const failures = events.filter((change) => change.state === "rejected");
        assert.lengthOf(failures, 1, "one event for the failed model");
        const [failure] = failures;
        assert.equal(failure.ref, url);
        assert.include(failure.layerIds, layer.id);
        assert.equal(failure.problems[0]?.code, "E_MODEL_FETCH");
        assert.equal(failure.problems[0]?.params.status, 404);
        assert.isFalse(drawnAsModel(graph.graph, "a"), "the node keeps its shape");
        assert.isNotNull(graph.graph.getNodeMesh("a"));
    });

    it("asks before a URL from a project file or an AI command, and fetches only what the reader allows", async () => {
        const fromFile = "https://models.example.org/from-file.glb";
        const fromAi = "https://ai-models.example.net/from-ai.glb";
        const requested = stubFetch(new Map([[fromAi, sphereGlb(12, 6)]]));
        const graph = await mount();
        await graph.graph.addNodes([{ id: "a" }, { id: "b" }]);
        const asked: string[] = [];
        const bothAsked = new Promise<void>((resolve) => {
            graph.session.on("network:pending", (request) => {
                asked.push(request.params.url);
                if (asked.length === 2) {
                    resolve();
                }
            });
        });
        const refusedFile = nextModelEvent(graph, (change) => change.ref === fromFile && change.state === "rejected");
        const drawnAi = nextModelEvent(graph, (change) => change.ref === fromAi && change.state === "drawn");

        // A project file's styles are applied as a style document (src/session/projectFile.ts).
        await graph.session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "from a file",
                    target: "node",
                    selector: { match: "ids", nodes: ["a"] },
                    set: { "node.model": fromFile },
                },
            ],
        });
        // The AI style commands add their layers with this source (src/ai/commands/StyleCommands.ts).
        await graph.session.styles.add({
            name: "from the AI",
            target: "node",
            source: { by: "plugin", name: "graphty-ai" },
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.model": fromAi },
        });
        await bothAsked;

        const pending = graph.session.network.pending();
        const byUrl = new Map(pending.map((request) => [request.params.url, request.params]));
        assert.equal(byUrl.get(fromFile)?.by, "file");
        assert.equal(byUrl.get(fromAi)?.by, "ai");
        assert.equal(byUrl.get(fromAi)?.host, "ai-models.example.net");
        assert.notInclude(requested, fromFile, "nothing is fetched before the answer");
        assert.notInclude(requested, fromAi);

        graph.session.network.deny(byUrl.get(fromFile)?.id ?? "");
        await graph.session.network.allow(byUrl.get(fromAi)?.id ?? "");
        const refused = await refusedFile;
        assert.equal(refused.problems[0]?.code, "E_MODEL_URL_BLOCKED");
        assert.deepEqual(refused.problems[0]?.params.hosts, ["models.example.org"]);
        await drawnAi;
        await operationQueueOf(graph.graph).waitForCompletion();
        assert.notInclude(requested, fromFile);
        assert.include(requested, fromAi);
        assert.isFalse(drawnAsModel(graph.graph, "a"));
        assert.isTrue(drawnAsModel(graph.graph, "b"));
    });

    it("fetches a project file's URL once the page allows its host, but never a private one", async () => {
        const allowed = "https://models.example.net/allowed.glb";
        const local = `${location.origin}/private-${String(Date.now())}.glb`;
        const requested = stubFetch(new Map([[allowed, sphereGlb(12, 6)]]));
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }, { id: "b" }]);
        element.session.assets.allowHosts(["models.example.net", location.host]);
        const drawn = nextModelEvent(element, (change) => change.ref === allowed && change.state === "drawn");
        const refused = nextModelEvent(element, (change) => change.ref === local);
        await element.session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "allowed host",
                    target: "node",
                    selector: { match: "ids", nodes: ["a"] },
                    set: { "node.model": allowed },
                },
                {
                    name: "private host",
                    target: "node",
                    selector: { match: "ids", nodes: ["b"] },
                    set: { "node.model": local },
                },
            ],
        });

        await drawn;
        const blocked = await refused;
        assert.equal(blocked.problems[0]?.code, "E_MODEL_URL_BLOCKED");
        assert.include(requested, allowed);
        assert.notInclude(requested, local);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "a"));
        assert.isFalse(drawnAsModel(element.graph, "b"));
    });

    it("loads a model the reader refused once its host is allowed after all", async () => {
        const url = "https://models.example.org/later.glb";
        const requested = stubFetch(new Map([[url, sphereGlb(12, 6)]]));
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const asked = new Promise<string>((resolve) => {
            element.session.on("network:pending", (request) => {
                resolve(request.params.id);
            });
        });
        const refused = nextModelEvent(element, (change) => change.ref === url && change.state === "rejected");
        await element.session.styles.applyTemplate({
            version: 1,
            layers: [
                { name: "from a file", target: "node", selector: { match: "everything" }, set: { "node.model": url } },
            ],
        });
        element.session.network.deny(await asked);
        await refused;
        assert.notInclude(requested, url);
        const drawn = nextModelEvent(element, (change) => change.ref === url && change.state === "drawn");
        element.session.assets.allowHosts(["models.example.org"]);
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        assert.include(requested, url);
        assert.isTrue(drawnAsModel(element.graph, "a"));
    });

    it("draws a model a layer names before its file is added, once it is added", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const events = modelEvents(element);
        await element.session.styles.add({
            name: "named early",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": "asset:early-ball" },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isFalse(drawnAsModel(element.graph, "a"));
        const drawn = nextModelEvent(
            element,
            (change) => change.ref === "asset:early-ball" && change.state === "drawn",
        );
        await element.session.assets.add(
            { files: new Map([["ball.glb", sphereGlb(12, 6)]]) },
            { name: "asset:early-ball" },
        );
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "a"));
        const loads = events.filter((change) => change.ref === "asset:early-ball" && change.state === "accepted");
        assert.lengthOf(loads, 1, "the model is prepared once");
    });

    it("draws a model as wide as an icosphere of the same size under the default size mode", async () => {
        const element = await mount(600, 300);
        const { graph } = element;
        const asset = await element.session.assets.add(sphereGlb(24, 12));
        await graph.addNodes([
            { id: "model", position: { x: -2, y: 0, z: 0 } },
            { id: "shape", position: { x: 2, y: 0, z: 0 } },
        ]);
        await graph.setLayout("fixed", { dim: 3 });
        const drawn = nextModelEvent(element, (change) => change.state === "drawn");
        await element.session.styles.add({
            name: "one model",
            target: "node",
            selector: { match: "ids", nodes: ["model"] },
            set: { "node.model": asset.id },
        });
        await drawn;
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isTrue(drawnAsModel(graph, "model"));

        /**
         * How wide a node is drawn on screen, from the world box of everything it draws.
         * @param id - The node.
         * @returns Its width in CSS pixels.
         */
        const screenWidth = (id: string): number => {
            const mesh = graph.getNodeMesh(id);
            assert.isNotNull(mesh);
            const drawnMeshes = drawnAsModel(graph, id) ? [mesh, ...mesh.getChildMeshes(true)] : [mesh];
            let min = Infinity;
            let max = -Infinity;
            for (const part of drawnMeshes) {
                part.computeWorldMatrix(true);
                const box = part.getBoundingInfo().boundingBox;
                min = Math.min(min, box.minimumWorld.x);
                max = Math.max(max, box.maximumWorld.x);
            }

            const center = mesh.getAbsolutePosition();
            const left = element.worldToScreen(new Vector3(min, center.y, center.z));
            const right = element.worldToScreen(new Vector3(max, center.y, center.z));
            return Math.abs(right.x - left.x);
        };

        const model = screenWidth("model");
        const shape = screenWidth("shape");
        assert.isAbove(shape, 0);
        assert.approximately(model / shape, 1, 0.02, `model ${String(model)} px, icosphere ${String(shape)} px`);
    });

    it("makes the same draw calls for 10 model nodes as for 1,000", async () => {
        const element = await mount();
        const { graph } = element;
        const asset = await element.session.assets.add(sphereGlb(12, 6));
        const grid = (from: number, to: number): { id: string; position: { x: number; y: number; z: number } }[] =>
            Array.from({ length: to - from }, (_, k) => {
                const i = from + k;
                return { id: `n${String(i)}`, position: { x: (i % 40) * 2, y: Math.floor(i / 40) * 2, z: 0 } };
            });
        await graph.addNodes(grid(0, 10));
        await graph.setLayout("fixed", { dim: 3 });
        const drawn = nextModelEvent(element, (change) => change.state === "drawn");
        await element.session.styles.add({
            name: "models",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": asset.id },
        });
        await drawn;
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();

        /**
         * Render one frame and count its draw calls.
         * @returns The count.
         */
        const drawCalls = (): number => {
            const instrumentation = new SceneInstrumentation(graph.scene);
            const counter = instrumentation.drawCallsCounter;
            counter.fetchNewFrame();
            graph.scene.render();
            const calls = counter.current;
            instrumentation.dispose();
            return calls;
        };

        const ten = drawCalls();
        await graph.addNodes(grid(10, 1000));
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        const models = [...graph.getDataManager().nodes.keys()].filter((id) => drawnAsModel(graph, String(id)));
        assert.lengthOf(models, 1000, "every node draws the model");
        assert.equal(drawCalls(), ten);
    });

    it("says a color is ignored on an untinted model, and draws it red once tinted", async () => {
        const element = await mount();
        const { graph } = element;
        const asset = await element.session.assets.add(sphereGlb(24, 12));
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await graph.setLayout("fixed", { dim: 3 });
        const drawn = nextModelEvent(element, (change) => change.state === "drawn");
        await element.session.styles.add({
            name: "model",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": asset.id },
        });
        await drawn;
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();

        /**
         * Count the red pixels on screen.
         * @returns How many.
         */
        const redPixels = async (): Promise<number> => {
            await element.waitForStableFrame();
            graph.scene.render();
            const { engine } = graph;
            const pixels = (await engine.readPixels(
                0,
                0,
                engine.getRenderWidth(),
                engine.getRenderHeight(),
            )) as unknown as Uint8Array;
            let count = 0;
            for (let at = 0; at < pixels.length; at += 4) {
                if (pixels[at] > 120 && pixels[at + 1] < 60 && pixels[at + 2] < 60) {
                    count++;
                }
            }

            return count;
        };

        const ignored = nextModelEvent(element, (change) =>
            change.problems.some((fact) => fact.code === "W_MODEL_COLOR_IGNORED"),
        );
        const red = await element.session.styles.add({
            name: "red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        const warning = (await ignored).problems.find((fact) => fact.code === "W_MODEL_COLOR_IGNORED");
        assert.deepEqual(warning?.params.layerIds, [red.id]);
        const before = await redPixels();
        assert.isBelow(before, 50, "an untinted white model is not red");

        await element.session.styles.add({
            name: "tint",
            target: "node",
            selector: { match: "everything" },
            set: { "node.modelTint": true },
        });
        await operationQueueOf(graph).waitForCompletion();
        assert.isAbove(await redPixels(), 500, "the tinted model is drawn red");
    });

    it("frees a model's template once no layer names it", async () => {
        const element = await mount();
        const { graph } = element;
        const asset = await element.session.assets.add(sphereGlb(12, 6));
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        const drawn = nextModelEvent(element, (change) => change.state === "drawn");
        const first = await element.session.styles.add({
            name: "model",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.model": asset.id },
        });
        const second = await element.session.styles.add({
            name: "model again",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.model": asset.id },
        });
        await drawn;
        const cache = ModelCache.of(graph);
        assert.isNotNull(cache);
        assert.equal(cache.size, 1, "one template, shared");
        const groups = graph.scene.meshes.filter((mesh) => mesh.name.startsWith("graphty-model-")).length;
        assert.isAbove(groups, 0);

        await element.session.styles.remove(first.id);
        await element.waitForStableFrame();
        assert.equal(cache.size, 1, "still named by a layer");

        await element.session.styles.remove(second.id);
        await vi.waitFor(() => {
            assert.equal(cache.size, 0);
        });
        assert.equal(graph.scene.meshes.filter((mesh) => mesh.name.startsWith("graphty-model-")).length, 0);
        assert.isFalse(drawnAsModel(graph, "a"));
        assert.isFalse(drawnAsModel(graph, "b"));
    });

    it("turns, stretches and re-centers the model with its geometry channels", async () => {
        const element = await mount();
        const { graph } = element;
        // Tall along y, thin along z, and centered away from the file's origin.
        const asset = await element.session.assets.add(sphereGlb(12, 6, [0.5, 1, 0.25], [1, 1, 1, 1], [2, 0, 0]));
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await graph.setLayout("fixed", { dim: 3 });

        /**
         * Draw the node with these channels and read the box of what it draws, around its center.
         * @param set - The channels.
         * @returns The box's corners, relative to the node.
         */
        const boxWith = async (set: Record<string, unknown>): Promise<{ min: Vector3; max: Vector3 }> => {
            const drawn = nextModelEvent(element, (change) => change.state === "drawn");
            const layer = await element.session.styles.add({
                name: "probe",
                target: "node",
                selector: { match: "everything" },
                set: { "node.model": asset.id, ...set },
            });
            await drawn;
            await operationQueueOf(graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.isTrue(drawnAsModel(graph, "a"));
            const mesh = graph.getNodeMesh("a");
            assert.isNotNull(mesh);
            mesh.computeWorldMatrix(true);
            const box = mesh.getBoundingInfo().boundingBox;
            const center = mesh.getAbsolutePosition();
            const read = { min: box.minimumWorld.subtract(center), max: box.maximumWorld.subtract(center) };
            await element.session.styles.remove(layer.id);
            return read;
        };
        const extent = (box: { min: Vector3; max: Vector3 }): Vector3 => box.max.subtract(box.min);

        const plain = await boxWith({});
        const plainExtent = extent(plain);
        assert.approximately(plainExtent.y, 1.5, 0.01, "the largest extent is the node's");
        assert.approximately(plain.min.y + plain.max.y, 0, 0.01, "centered on its box");

        const upX = extent(await boxWith({ "node.modelSourceUp": "x" }));
        assert.isAbove(upX.x, upX.y, "the file's y now lies along x");

        const turned = extent(await boxWith({ "node.modelTurn": 90 }));
        assert.approximately(turned.x, plainExtent.z, 0.01, "a quarter turn swaps x and z");

        const stretched = extent(await boxWith({ "node.modelFit": "stretch" }));
        assert.approximately(stretched.x, stretched.y, 0.01, "stretch fills every axis");
        assert.approximately(stretched.z, stretched.y, 0.01);

        const origin = await boxWith({ "node.modelCenter": "origin" });
        // glTF's handedness turns the file's +x to Babylon's -x, so the side is either; the model is
        // off center by about its own width either way.
        assert.isAbove(
            Math.abs(origin.min.x + origin.max.x),
            1,
            "the file's origin is the pivot, so the model sits to one side",
        );
    });
});
