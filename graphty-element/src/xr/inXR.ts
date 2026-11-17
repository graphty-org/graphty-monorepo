import type { Scene } from "@babylonjs/core/scene.js";

/**
 * Whether the scene is in an XR session.
 * @param scene - The scene.
 * @returns True in XR.
 */
export function inXR(scene: Scene): boolean {
    const xrHelper = (scene.metadata as { xrHelper?: { baseExperience?: { state?: number } } } | null)?.xrHelper;
    return xrHelper?.baseExperience?.state === 2; // WebXRState.IN_XR
}
