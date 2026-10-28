/**
 * @file `node.texture` (design/rendering/node-models.md section 2.8): a picture drawn as a built-in
 * shape's surface or as a model's base color texture, from a file or a URL, fetched through the
 * same reader gate as a model, with tint its own channel.
 */

import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { PNG_1X1, sphereGlb } from "../../fixtures/models/fixtures";
import { cleanups, drawnAsModel, mount, nextModelEvent, stubFetch } from "./helpers";

/**
 * Hold `fetch` for one URL until released; every other request passes through.
 * @param url - The URL held.
 * @param bytes - What it answers with once released.
 * @returns A promise settled when the URL is requested, and the release.
 */
function holdFetch(url: string, bytes: Uint8Array): { requested: Promise<void>; release: () => void } {
    const original = globalThis.fetch.bind(globalThis);
    let release = (): void => undefined;
    const released = new Promise<void>((resolve) => {
        release = resolve;
    });
    let noteRequested = (): void => undefined;
    const requested = new Promise<void>((resolve) => {
        noteRequested = resolve;
    });
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        if ((input instanceof Request ? input.url : String(input)) !== url) {
            return original(input, init);
        }

        noteRequested();
        await released;
        return new Response(bytes as Uint8Array<ArrayBuffer>, { status: 200 });
    });
    cleanups.push(() => {
        spy.mockRestore();
    });
    return { requested, release };
}

/**
 * Settles after the scene has drawn some frames.
 * @param element - The element.
 * @param frames - How many.
 * @returns Settles after that many frames.
 */
function framesDrawn(element: Graphty, frames: number): Promise<void> {
    const scene = element.graph.getScene();
    return new Promise((resolve) => {
        let left = frames;
        const observer = scene.onAfterRenderObservable.add(() => {
            left--;
            if (left === 0) {
                scene.onAfterRenderObservable.remove(observer);
                resolve();
            }
        });
    });
}

/**
 * The texture a node's source material draws, or null.
 * @param element - The element.
 * @param id - The node.
 * @returns The texture's name, or null.
 */
function surfaceOf(element: Graphty, id: string): string | null {
    const mesh = element.graph.getNodeMesh(id);
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : mesh;
    const material = (source?.material ?? {}) as Partial<Pick<StandardMaterial, "diffuseTexture">> &
        Partial<Pick<PBRMaterial, "albedoTexture">>;
    const texture = material.albedoTexture ?? material.diffuseTexture ?? null;
    return texture?.name ?? null;
}

describe("node.texture", () => {
    it("draws a picture added as a file on a built-in shape, and leaves other nodes plain", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }, { id: "b" }]);
        const picture = await element.session.assets.add({ files: new Map([["dots.png", PNG_1X1]]) });
        assert.equal(picture.state, "accepted");
        assert.equal(picture.kind, "image");
        const drawn = nextModelEvent(element, (change) => change.ref === picture.id && change.state === "drawn");
        await element.session.styles.add({
            name: "picture",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.texture": picture.id },
        });
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.include(surfaceOf(element, "a") ?? "", picture.id);
        assert.isNull(surfaceOf(element, "b"));
    });

    it("stores a transparent pixel white, cuts it out of a flat node and keeps a solid one whole", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "solid" }, { id: "flat" }]);
        // A green pixel with no alpha (hidden color, as Kenney's previews hold) beside an opaque red.
        const canvas = new OffscreenCanvas(2, 1);
        const context = canvas.getContext("2d");
        assert.isNotNull(context);
        context?.putImageData(new ImageData(Uint8ClampedArray.from([71, 112, 76, 0, 255, 0, 0, 255]), 2, 1), 0, 0);
        const png = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
        const picture = await element.session.assets.add({ files: new Map([["clear.png", png]]) });
        const drawn = nextModelEvent(element, (change) => change.ref === picture.id && change.state === "drawn");
        await element.session.styles.add({
            name: "picture",
            target: "node",
            selector: { match: "everything" },
            set: { "node.texture": picture.id },
        });
        await element.session.styles.add({
            name: "flat",
            target: "node",
            selector: { match: "ids", nodes: ["flat"] },
            set: { "node.shape": "ellipse" },
        });
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const materialOf = (id: string): StandardMaterial => {
            const mesh = element.graph.getNodeMesh(id);
            return (mesh instanceof InstancedMesh ? mesh.sourceMesh : mesh)?.material as StandardMaterial;
        };
        const pixels = await materialOf("solid").diffuseTexture?.readPixels();
        assert.deepEqual(
            [...new Uint8Array((pixels as Uint8Array).buffer)].slice(0, 8),
            [255, 255, 255, 0, 255, 0, 0, 255],
        );
        assert.isNull(materialOf("solid").opacityTexture, "a solid keeps its surface whole");
        assert.isFalse(materialOf("solid").needAlphaTesting());
        assert.strictEqual(materialOf("flat").opacityTexture?.name, materialOf("flat").diffuseTexture?.name);
        assert.isTrue(materialOf("flat").needAlphaTesting(), "a flat node cuts the clear pixels out");
        assert.isFalse(materialOf("flat").needAlphaBlending(), "not sorted as a see-through material");
    });

    it("replaces a model's base color texture with a picture fetched by URL from code", async () => {
        const picture = "https://pictures.example.com/dots.png";
        const model = "https://models.example.com/ball.glb";
        const requested = stubFetch(
            new Map([
                [picture, PNG_1X1],
                [model, sphereGlb(12, 6)],
            ]),
        );
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const drawn = nextModelEvent(element, (change) => change.ref === model && change.state === "drawn");
        await element.session.styles.add({
            name: "textured model",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": model, "node.texture": picture },
        });
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "a"));
        const mesh = element.graph.getNodeMesh("a") as InstancedMesh;
        const material = mesh.sourceMesh.material as PBRMaterial;
        assert.isNotNull(material.albedoTexture, "the picture is the base color texture");
        assert.include(requested, picture);
    });

    it("asks before a picture a file's layer names, and draws it once allowed", async () => {
        const picture = "https://pictures.example.org/dots.png";
        const requested = stubFetch(new Map([[picture, PNG_1X1]]));
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const asked = new Promise<string>((resolve) => {
            element.session.on("network:pending", (request) => {
                resolve(request.params.id);
            });
        });
        const drawn = nextModelEvent(element, (change) => change.ref === picture && change.state === "drawn");
        await element.session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "from a file",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.texture": picture },
                },
            ],
        });
        const id = await asked;
        const [request] = element.session.network.pending();
        assert.equal(request.params.kind, "texture");
        assert.equal(request.params.by, "file");
        assert.notInclude(requested, picture);
        await element.session.network.allow(id);
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isNotNull(surfaceOf(element, "a"));
    });

    it("does not call the frame final while a picture is still downloading", async () => {
        const picture = "https://pictures.example.com/slow.png";
        const held = holdFetch(picture, PNG_1X1);
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        await element.session.styles.add({
            name: "slow picture",
            target: "node",
            selector: { match: "everything" },
            set: { "node.texture": picture },
        });
        await held.requested;
        const stable = element.waitForStableFrame().then(() => "stable" as const);
        // While the download is held, drawn frames must come before the frame is called final.
        const first = await Promise.race([stable, framesDrawn(element, 5).then(() => "frames" as const)]);
        assert.equal(first, "frames", "the frame was called final with the picture still downloading");
        held.release();
        await stable;
        assert.isNotNull(surfaceOf(element, "a"), "the final frame draws the picture");
    });

    it("draws a picture node as a wireframe when node.wireframe asks", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const picture = await element.session.assets.add({ files: new Map([["dots.png", PNG_1X1]]) });
        const drawn = nextModelEvent(element, (change) => change.ref === picture.id && change.state === "drawn");
        await element.session.styles.add({
            name: "wire picture",
            target: "node",
            selector: { match: "everything" },
            set: { "node.texture": picture.id, "node.wireframe": true },
        });
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const mesh = element.graph.getNodeMesh("a");
        const material = (mesh instanceof InstancedMesh ? mesh.sourceMesh : mesh)?.material as StandardMaterial;
        assert.include(material.diffuseTexture?.name ?? "", picture.id);
        assert.isTrue(material.wireframe);
    });

    it("draws a picture the reader refused once its host is allowed after all", async () => {
        const picture = "https://pictures.example.org/later.png";
        const requested = stubFetch(new Map([[picture, PNG_1X1]]));
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const asked = new Promise<string>((resolve) => {
            element.session.on("network:pending", (request) => {
                resolve(request.params.id);
            });
        });
        const refused = nextModelEvent(element, (change) => change.ref === picture && change.state === "rejected");
        await element.session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "from a file",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.texture": picture },
                },
            ],
        });
        element.session.network.deny(await asked);
        await refused;
        assert.notInclude(requested, picture);
        const drawn = nextModelEvent(element, (change) => change.ref === picture && change.state === "drawn");
        element.session.assets.allowHosts(["pictures.example.org"]);
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.include(requested, picture);
        assert.isNotNull(surfaceOf(element, "a"));
    });

    it("refuses a model file named as a texture", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const ball = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        const refused = nextModelEvent(element, (change) => change.ref === ball.id && change.state === "rejected");
        await element.session.styles.add({
            name: "wrong kind",
            target: "node",
            selector: { match: "everything" },
            set: { "node.texture": ball.id },
        });
        const [problem] = (await refused).problems;
        assert.equal(problem?.code, "E_MODEL_FORMAT_UNSUPPORTED");
        assert.equal(problem?.params.assetKind, "model");
    });

    it("refuses a picture named as a model, saying it is a picture", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "a" }]);
        const picture = await element.session.assets.add({ files: new Map([["colormap.png", PNG_1X1]]) });
        assert.equal(picture.kind, "image");
        const refused = nextModelEvent(
            element,
            (change) => change.ref === picture.id && (change.state === "rejected" || change.state === "failed"),
        );
        await element.session.styles.add({
            name: "picture as model",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": picture.id },
        });
        const settled = await refused;
        assert.equal(settled.state, "rejected");
        const [problem] = settled.problems;
        assert.equal(problem?.code, "E_MODEL_FORMAT_UNSUPPORTED");
        assert.equal(problem?.params.assetKind, "image");
        assert.isFalse(drawnAsModel(element.graph, "a"));
    });
});
