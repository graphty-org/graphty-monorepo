// Where things go (design section 4.4): the graph placed from the head pose, and body-anchored
// zones for framework UI, placed from the head pose at session start and on Recenter. Nothing is
// ever parented to the graph root except the graph, so moving the graph never moves the gear.

import { type Scene, TransformNode, Vector3 } from "@babylonjs/core";

/** Offsets from the head, in its yaw frame: [right, up, forward], meters. */
const ZONES = {
    gear: [-0.2, -0.3, 0.35],
    // Its top edge 21 cm above this; it grows down to hold every technique, clear of the gear.
    gearPanel: [-0.32, 0.03, 0.5],
    steps: [0.32, -0.2, 0.48],
    log: [0, -0.38, 0.5],
} as const;

/** The framework's body-anchored zones. */
export type Zones = Record<keyof typeof ZONES, TransformNode> & {
    /** Re-place every zone from the head pose. */
    place(head: Vector3, forward: Vector3): void;
};

/**
 * Create the zones (placed for a head at standing height looking down +z until the first place).
 * @param scene - the scene
 * @returns the zones
 */
export function createZones(scene: Scene): Zones {
    const nodes = Object.fromEntries(
        Object.keys(ZONES).map((k) => [k, new TransformNode(`zone-${k}`, scene)]),
    ) as Record<keyof typeof ZONES, TransformNode>;
    const zones: Zones = {
        ...nodes,
        place(head, forward) {
            const yaw = Math.atan2(forward.x, forward.z);
            const f = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
            const r = new Vector3(f.z, 0, -f.x);
            for (const [k, [x, y, z]] of Object.entries(ZONES)) {
                const n = nodes[k as keyof typeof ZONES];
                n.position.copyFrom(head).addInPlace(r.scale(x)).addInPlace(f.scale(z));
                n.position.y += y;
                // Local +z points away from the head, so a plane child shows its front face to it.
                n.lookAt(n.position.scale(2).subtract(head));
                n.computeWorldMatrix(true);
            }
        },
    };
    zones.place(new Vector3(0, 1.6, 0), new Vector3(0, 0, 1));
    return zones;
}

/**
 * Place the graph about 75 cm ahead of the head, its center slightly below eye level, facing it.
 * @param root - the graph root
 * @param head - head position
 * @param forward - head forward direction
 * @param resetScale - also put the scale back to 1
 */
export function placeGraph(root: TransformNode, head: Vector3, forward: Vector3, resetScale: boolean): void {
    const yaw = Math.atan2(forward.x, forward.z);
    root.position.set(head.x + Math.sin(yaw) * 0.75, head.y - 0.12, head.z + Math.cos(yaw) * 0.75);
    root.rotationQuaternion = null;
    root.rotation.set(0, yaw, 0);
    if (resetScale) {
        root.scaling.setAll(1);
    }
    root.computeWorldMatrix(true);
}
