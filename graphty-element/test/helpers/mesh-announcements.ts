/**
 * @file Waiting for Babylon's late mesh announcements.
 *
 * `Scene.addMesh` puts a mesh in the scene at once but announces it on `onNewMeshAddedObservable`
 * only later, from a timer (`Tools.SetImmediate`). A counter attached to that observable
 * therefore hears meshes built before it was attached, and misses meshes built while it was
 * attached whose announcement had not fired when it was removed (#8095, and #5139 in the element).
 */
import { Tools } from "@babylonjs/core/Misc/tools.js";

/**
 * Resolve once every mesh announcement queued so far has been delivered. The announcements share
 * one queue, run in order, so a callback queued now runs after all of them.
 * @returns Promise that resolves after the announcements queued before the call.
 */
export function meshAnnouncementsDelivered(): Promise<void> {
    return new Promise((resolve) => {
        Tools.SetImmediate(resolve);
    });
}
