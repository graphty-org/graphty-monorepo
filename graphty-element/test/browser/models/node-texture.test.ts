/**
 * @file `node.texture` (design/rendering/node-models.md section 2.8): a picture drawn as a built-in
 * shape's surface or as a model's base color texture, from a file or a URL, fetched through the
 * same reader gate as a model, with tint its own channel.
 */

import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { PNG_1X1, sphereGlb } from "../../fixtures/models/fixtures";
import { drawnAsModel, mount, nextModelEvent, stubFetch } from "./helpers";

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
        assert.equal((await refused).problems[0]?.code, "E_MODEL_FORMAT_UNSUPPORTED");
    });
});
