// The rack (design section 4.4): a shelf right of the graph and nearer the owner, where the tools
// wait. A tool is taken by grabbing it from the rack (Babylon's SixDofDragBehavior: a ray grab or
// a near grab, hands or controllers) and letting go: it then docks in the hand that grabbed it, so
// that hand is free to pinch or pull the trigger. Pulled off and let go back on the rack, it stays
// there. A docked tool is never pickable, so the holding hand's ray passes through it.

import {
    Color3,
    Matrix,
    type Mesh,
    MeshBuilder,
    Quaternion,
    SixDofDragBehavior,
    StandardMaterial,
    TransformNode,
    Vector3,
} from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { TechniqueContext } from "../../framework/technique";

/** A tool that lives on the rack. */
export interface Tool {
    id: "sieve" | "probe";
    /** The grab target; every other part of the tool is its child. */
    root: Mesh;
    /** Where the root sits in the hand, in the hand anchor's frame. */
    inHand: Vector3;
    /** Called after it docks in a hand, and after it is back on the rack. */
    onTake(hand: Hand): void;
    onPut(): void;
}

/** The rack. */
export interface Rack {
    readonly node: TransformNode;
    /** Which hand holds a tool, or null when it is on the rack. */
    holderOf(tool: Tool): Hand | null;
    held(hand: Hand): Tool | null;
    /** Dock a tool in a hand (from the rack, or from the other hand). */
    take(tool: Tool, hand: Hand): void;
    /** Put a tool back on the rack. */
    put(tool: Tool): void;
    /** Re-place the rack beside the graph; call per frame. */
    follow(): void;
    show(): void;
    hide(): void;
}

/** From the graph root, in its yaw frame: right, up, toward the owner (meters). */
const OFFSET = new Vector3(0.36, -0.2, -0.3);
/** A grab pulled this far off its slot takes the tool without waiting for the release. */
const PULL_M = 0.08;

/**
 * Build the rack and register its tools, hidden.
 * @param ctx - the technique context
 * @param tools - the tools, each with its slot on the shelf (rack-local)
 * @param log - logs take and put
 * @returns the rack
 */
export function createRack(
    ctx: TechniqueContext,
    tools: { tool: Tool; slot: Vector3 }[],
    log: (message: string, data: Record<string, unknown>) => void,
): Rack {
    const { scene, graph } = ctx;
    const node = new TransformNode("physical-tools-rack", scene);
    const shelf = MeshBuilder.CreateBox("physical-tools-shelf", { width: 0.3, height: 0.012, depth: 0.08 }, scene);
    const mat = new StandardMaterial("physical-tools-shelf-mat", scene);
    mat.diffuseColor = new Color3(0.32, 0.27, 0.22);
    mat.specularColor = Color3.Black();
    shelf.material = mat;
    shelf.isPickable = false;
    shelf.parent = node;
    shelf.position.y = -0.05;
    node.setEnabled(false);

    const holder = new Map<Tool, Hand | null>();
    const slotOf = new Map<Tool, Vector3>();
    const drags = new Map<Tool, SixDofDragBehavior>();
    const pending: { tool: Tool; hand: Hand }[] = [];

    const setUi = (tool: Tool, ui: boolean): void => {
        tool.root.metadata = { ...(tool.root.metadata as object | null), ui };
        tool.root.isPickable = ui;
        tool.root.isNearPickable = ui;
    };

    const onShelf = (tool: Tool): void => {
        const drag = drags.get(tool);
        if (drag) {
            drag.disableMovement = false;
        }
        tool.root.parent = node;
        tool.root.position.copyFrom(slotOf.get(tool) ?? Vector3.Zero());
        tool.root.rotationQuaternion = Quaternion.Identity();
        setUi(tool, true);
    };

    // Docked under the framework's hand anchor (it follows the grip, with no frame of lag), at a
    // fixed offset that puts `inHand` in the target ray's frame: on Quest the grip is tilted about
    // 45 degrees from the ray, and a tool should point where the ray points.
    const dock = (tool: Tool, hand: Hand): void => {
        const anchor = ctx.anchor(`hand-${hand}`);
        const pointer = ctx.xr()?.input.controllers.find((c) => c.inputSource.handedness === hand)?.pointer;
        tool.root.parent = anchor;
        if (!pointer || !anchor.parent) {
            tool.root.position.copyFrom(tool.inHand);
            tool.root.rotationQuaternion = Quaternion.Identity();
            return;
        }
        const local = Matrix.Translation(tool.inHand.x, tool.inHand.y, tool.inHand.z)
            .multiply(pointer.computeWorldMatrix(true))
            .multiply(Matrix.Invert(anchor.computeWorldMatrix(true)));
        const q = new Quaternion();
        local.decompose(undefined, q, tool.root.position);
        tool.root.rotationQuaternion = q;
    };

    const rack: Rack = {
        node,
        holderOf: (tool) => holder.get(tool) ?? null,
        held: (hand) => [...holder].find(([, h]) => h === hand)?.[0] ?? null,
        take(tool, hand) {
            // One tool per hand: whatever this hand held goes back first.
            const other = rack.held(hand);
            if (other && other !== tool) {
                rack.put(other);
            }
            const was = holder.get(tool);
            if (was && was !== hand) {
                ctx.tools.hold(was, null);
            }
            holder.set(tool, hand);
            // A drag still in progress must not move the docked tool (its release may come later).
            const drag = drags.get(tool);
            if (drag) {
                drag.disableMovement = true;
            }
            setUi(tool, false);
            dock(tool, hand);
            ctx.tools.hold(hand, tool.id);
            log("take", { tool: tool.id, hand });
            tool.onTake(hand);
        },
        put(tool) {
            const was = holder.get(tool);
            if (!was) {
                return;
            }
            holder.set(tool, null);
            ctx.tools.hold(was, null);
            onShelf(tool);
            log("put", { tool: tool.id, hand: was });
            tool.onPut();
        },
        follow() {
            const { root } = graph;
            const m = root.computeWorldMatrix(false);
            const fx = m.m[8];
            const fz = m.m[10];
            const yaw = Math.atan2(fx, fz);
            const p = root.getAbsolutePosition();
            const s = Math.sin(yaw);
            const c = Math.cos(yaw);
            const x = p.x + OFFSET.x * c + OFFSET.z * s;
            const y = p.y + OFFSET.y;
            const z = p.z - OFFSET.x * s + OFFSET.z * c;
            // Only write when the graph moved, so a still scene stays still.
            if (Math.abs(node.position.x - x) + Math.abs(node.position.y - y) + Math.abs(node.position.z - z) > 1e-5) {
                node.position.set(x, y, z);
            }
            if (Math.abs(node.rotation.y - yaw) > 1e-5) {
                node.rotation.y = yaw;
            }
        },
        show() {
            rack.follow();
            node.setEnabled(true);
        },
        hide() {
            for (const { tool } of tools) {
                rack.put(tool);
            }
            node.setEnabled(false);
        },
    };

    const nearestHand = (at: Vector3): Hand => {
        const d = (h: Hand): number => {
            const hov = ctx.hover(h);
            if (!hov.connected) {
                return Infinity;
            }
            // The hand whose ray is on a UI mesh (this tool) wins over a nearer idle hand.
            return (
                Vector3.Distance(ctx.anchor(`hand-${h}`).getAbsolutePosition(), at) - (hov.context === "ui" ? 10 : 0)
            );
        };
        return d("left") < d("right") ? "left" : "right";
    };

    // A grab takes the tool when it is pulled PULL_M off its slot, or when it is let go, whichever
    // comes first. Taking freezes the drag (`disableMovement`) until the tool is back on the shelf,
    // so a release lost to a near-interaction handoff can never leave the tool half-dragged.
    for (const { tool, slot } of tools) {
        slotOf.set(tool, slot);
        holder.set(tool, null);
        const drag = new SixDofDragBehavior();
        drag.draggableMeshes = [tool.root];
        drags.set(tool, drag);
        let grabber: Hand | null = null;
        drag.onDragStartObservable.add(() => {
            if (holder.get(tool)) {
                return;
            }
            grabber = nearestHand(tool.root.getAbsolutePosition());
            log("grab", { tool: tool.id, hand: grabber });
        });
        const takeOnce = (): void => {
            if (grabber) {
                pending.push({ tool, hand: grabber });
                grabber = null;
            }
        };
        drag.onDragObservable.add(() => {
            if (holder.get(tool)) {
                return;
            }
            const home = Vector3.TransformCoordinates(slotOf.get(tool) ?? Vector3.Zero(), node.getWorldMatrix());
            if (Vector3.Distance(tool.root.getAbsolutePosition(), home) > PULL_M) {
                takeOnce();
            }
        });
        drag.onDragEndObservable.add(takeOnce);
        tool.root.addBehavior(drag);
        onShelf(tool);
    }
    // Takes are applied on the next frame, outside the drag behavior's own pointer observer.
    ctx.onFrame(() => {
        for (const { tool, hand } of pending.splice(0)) {
            rack.take(tool, hand);
        }
    });
    return rack;
}
