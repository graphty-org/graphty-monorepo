/**
 * @file The frame called final after a `node.texture` picture lands draws the textured nodes
 * (issue #4237). The picture's repaint hands its nodes a new material from inside a frame; the
 * stable signal must not fire until that material's shader is ready, because a frame silently
 * skips a mesh whose shader is not.
 *
 * The race is forced, not waited for: the textured nodes' material answers "not ready" during the
 * draw phase of exactly one frame -- the first one that would be called final once the picture is
 * on -- and "ready" again before that frame ends. A check made after the frame has drawn sees a
 * ready shader and calls a frame that skipped both nodes final; a check made when the draw starts
 * does not.
 */

import type { Material } from "@babylonjs/core/Materials/material";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { PNG_1X1 } from "../../fixtures/models/fixtures";
import { mount, nextModelEvent, stubFetch } from "./helpers";

/**
 * The drawn meshes whose material is not ready to draw them now.
 * @param meshes - The scene's meshes.
 * @returns Their names.
 */
function notReady(meshes: readonly AbstractMesh[]): string[] {
    return meshes
        .filter((mesh) => mesh.getClassName() !== "InstancedMesh" && mesh.isEnabled())
        .filter((mesh) => mesh.isVisible || (mesh as Mesh).instances.length > 0)
        .filter((mesh) => mesh.material !== null && !mesh.material.isReady(mesh, (mesh as Mesh).instances.length > 0))
        .map((mesh) => mesh.name);
}

/** The update manager's settlement flags, read to find the frame that would be called final. */
interface Settlement {
    stateIsFinished: boolean;
    drawnFrameIsFinished: boolean;
}

/**
 * Make `material` answer "not ready" while `blocked()` is true, as a shader still compiling does.
 * @param material - The material to wrap.
 * @param blocked - Whether to answer "not ready" now.
 */
function blockReadiness(material: Material, blocked: () => boolean): void {
    const isReady = material.isReady.bind(material);
    const isReadyForSubMesh = material.isReadyForSubMesh.bind(material);
    material.isReady = (...args) => !blocked() && isReady(...args);
    material.isReadyForSubMesh = (...args) => !blocked() && isReadyForSubMesh(...args);
}

describe("node.texture and the stable frame", () => {
    it("calls the frame final only once the textured nodes' material can draw them", async () => {
        const picture = `https://pictures.example.com/fresh.png?${String(Date.now())}`;
        stubFetch(new Map([[picture, PNG_1X1]]));
        const element = await mount();
        await element.graph.addNodes([
            { id: "a", position: { x: -2, y: 0, z: 0 } },
            { id: "b", position: { x: 2, y: 0, z: 0 } },
        ]);
        await element.waitForStableFrame();
        const scene = element.graph.getScene();
        // The meshes the frame being drawn drew: Babylon calls a mesh's draw observers only once
        // its shader is ready, so a frame that skipped a mesh never calls them.
        const drew = new Set<AbstractMesh>();
        const watch = (mesh: AbstractMesh): void => {
            if (mesh.getClassName() !== "InstancedMesh" && "onBeforeDrawObservable" in mesh) {
                (mesh as Mesh).onBeforeDrawObservable.add(() => drew.add(mesh));
            }
        };
        scene.meshes.forEach(watch);
        scene.onNewMeshAddedObservable.add(watch);
        scene.onBeforeDrawPhaseObservable.add(() => {
            drew.clear();
        });
        // Force the race: the first frame that would be called final with the picture on draws
        // while the textured material's shader is "not ready", and is ready again before the
        // frame ends. Inserted first, so it runs before the update manager samples readiness.
        const settlement = (element.graph as unknown as { updateManager: Settlement }).updateManager;
        const wrapped = new Set<Material>();
        let blockedFrames = 0;
        let blocking = false;
        scene.onBeforeDrawPhaseObservable.add(
            () => {
                const node = element.graph.getNodeMesh("a") as InstancedMesh | undefined;
                const source = node?.getClassName() === "InstancedMesh" ? node.sourceMesh : node;
                const material = source?.material;
                const textured = material
                    ?.getActiveTextures()
                    .some((texture) => texture.name.startsWith("graphty-texture-"));
                if (
                    blockedFrames > 0 ||
                    material === undefined ||
                    material === null ||
                    textured !== true ||
                    !settlement.stateIsFinished ||
                    settlement.drawnFrameIsFinished
                ) {
                    return;
                }
                if (!wrapped.has(material)) {
                    wrapped.add(material);
                    blockReadiness(material, () => blocking);
                }
                blocking = true;
                blockedFrames += 1;
            },
            undefined,
            true,
        );
        scene.onAfterDrawPhaseObservable.add(() => {
            blocking = false;
        });
        // What each announcement of a final frame left undrawn, read in the frame it announced.
        const skipped: string[][] = [];
        element.graph.on("graph-frame-stable", () => {
            const missing = ["a", "b"].filter((id) => {
                const node = element.graph.getNodeMesh(id) as InstancedMesh | undefined;
                return (
                    node === undefined || !drew.has(node.getClassName() === "InstancedMesh" ? node.sourceMesh : node)
                );
            });
            skipped.push([...notReady(scene.meshes), ...missing.map((id) => `node ${id} not drawn`)]);
        });
        const drawn = nextModelEvent(element, (change) => change.ref === picture && change.state === "drawn");
        await element.session.styles.add({
            name: "fresh picture",
            target: "node",
            selector: { match: "everything" },
            set: { "node.texture": picture },
        });
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.equal(blockedFrames, 1, "one frame that would be called final drew without the shader");
        assert.isAbove(skipped.length, 0, "the picture was announced final");
        assert.deepEqual(
            skipped,
            skipped.map(() => []),
            "a frame called final skipped a mesh for want of a shader",
        );
        const sphere = element.graph.getNodeMesh("a");
        assert.isDefined(sphere);
        assert.include(scene.getActiveMeshes().data, sphere, "the textured nodes are in the frame drawn");
    });
});
