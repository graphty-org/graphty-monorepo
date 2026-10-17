import type { Scene } from "@babylonjs/core";

/**
 * Scenes holding a label whose animation has not been started yet.
 *
 * A node owes one when it builds a label; the graph's frame loop pays it through
 * `DataManager.startLabelAnimations()` on the first frame with the layout at rest and no style
 * paint left to draw, so a load's labels are all built before their animations start. Kept per
 * scene, like `LabelDeclutter.track`, so a node can owe it without a door on the graph, and a
 * disposed graph, whose frame loop has stopped, starts nothing.
 */
const owed = new WeakSet<Scene>();

/**
 * Say that a label was built on this scene and its animation has yet to start.
 * @param scene - The scene the label is drawn in.
 */
export function oweLabelAnimations(scene: Scene): void {
    owed.add(scene);
}

/**
 * Clear the debt.
 * @param scene - The graph's scene.
 * @returns Whether any label animation was owed.
 */
export function payLabelAnimations(scene: Scene): boolean {
    return owed.delete(scene);
}
