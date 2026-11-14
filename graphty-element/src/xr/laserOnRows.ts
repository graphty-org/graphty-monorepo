import "@babylonjs/core/Meshes/instancedMesh.js";

import type { InstancedMesh, Scene, WebXRDefaultExperience } from "@babylonjs/core";
import { Ray } from "@babylonjs/core/Culling/ray.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";

import { rowScanOf, type ScannedRow } from "../render/PickService";

/**
 * Let Babylon's XR laser land on rows a batch draws, which have no mesh.
 *
 * Babylon's `WebXRControllerPointerSelection` ends its beam, places its dot and raises its pointer
 * events from its own `scene.pickWithRay`, which sees only meshes. So before it runs each frame,
 * every controller's ray is picked as drawn, and when it lands on a meshless row an instance of
 * the row's source is put on the row's anchor, named and labeled as the row's mesh was. The
 * instance's visibility is its source's, which is 0 while a batch draws that source, and it is
 * taken off again once the frame's XR observers have run, so it is never drawn and no other pick
 * sees it. One stand-in per controller, since each casts its own ray.
 * @param scene - The graph's scene.
 * @param helper - The XR experience whose laser to serve.
 * @returns Stop serving it and dispose the stand-ins.
 */
export function laserOnRows(scene: Scene, helper: WebXRDefaultExperience): () => void {
    const frames = helper.baseExperience.sessionManager.onXRFrameObservable;
    const standIns = new Map<string, InstancedMesh>();
    const ray = new Ray(Vector3.Zero(), Vector3.Forward());
    const takeOff = (): void => {
        for (const standIn of standIns.values()) {
            standIn.setEnabled(false);
            standIn.parent = null;
        }
    };

    const before = frames.add(
        () => {
            takeOff();
            const scan = rowScanOf(scene);
            for (const controller of scan === undefined ? [] : helper.input.controllers) {
                controller.getWorldPointerRayToRef(ray);
                const { mesh: anchor } = scan?.pickRay(ray) ?? { mesh: null };
                const node = (anchor?.metadata as { graphNode?: ScannedRow } | null | undefined)?.graphNode;
                const source = node?.drawnSourceMesh;
                if (anchor === null || node?.drawnPickMesh !== null || !(source instanceof Mesh)) {
                    continue;
                }

                let standIn = standIns.get(controller.uniqueId);
                if (standIn?.sourceMesh !== source) {
                    standIn?.dispose();
                    standIn = source.createInstance(anchor.name);
                    // An instance starts at its source's place; the anchor is the whole placement.
                    standIn.position.setAll(0);
                    standIn.rotationQuaternion = null;
                    standIn.rotation.setAll(0);
                    standIn.scaling.setAll(1);
                    standIn.enablePointerMoveEvents = true;
                    standIns.set(controller.uniqueId, standIn);
                }

                standIn.name = anchor.name;
                standIn.metadata = anchor.metadata;
                standIn.parent = anchor;
                standIn.setEnabled(true);
            }
        },
        undefined,
        true,
    );
    const after = frames.add(takeOff);
    return () => {
        frames.remove(before);
        frames.remove(after);
        for (const standIn of standIns.values()) {
            standIn.dispose();
        }

        standIns.clear();
    };
}
