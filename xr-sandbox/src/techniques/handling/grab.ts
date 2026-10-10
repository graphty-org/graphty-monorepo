// Grabbing the graph with Babylon's SixDofDragBehavior, fed by the arbiter instead of by Babylon's
// pointer events. The behavior is attached to a proxy node in a private virtual scene, so nothing
// but this file ever sends it a pointer event: the sandbox's input reaches techniques only through
// the arbiter (design section 5), and a near-interaction grab of a real mesh would bypass it.
//
// - One hand: each held hand is an "xr-near" pointer with an origin mesh, which is the behavior's
//   NEAR_DRAG mode, the one WebXRNearInteraction uses for isNearGrabbable meshes: the graph follows
//   the hand's grip rigidly (no push along the ray), eased by the behavior's dragDeltaRatio.
// - Babylon's stock two hands: both hands as "touch" pointers, the behavior's two-pointer mode
//   (its XR pointer types refuse a second pointer). It scales by the hands' distance with no
//   clamp, turns about the vertical axis only, and is not smoothed: that is what "stock" means.
//
// After the behavior moves the proxy, apply() copies the proxy's pose to the graph root, in the same
// frame, before the scene renders.

import {
    type AbstractEngine,
    type AbstractMesh,
    type IMouseEvent,
    PickingInfo,
    PointerEventTypes,
    PointerInfo,
    Quaternion,
    Ray,
    Scene,
    SixDofDragBehavior,
    TransformNode,
    Vector3,
} from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";

/** How a hand is fed to the behavior. */
type Kind = "xr-near" | "touch";

/** The grab driver. */
export interface Grab {
    readonly behavior: SixDofDragBehavior;
    /** Start feeding `hand` as a pointer, from its grip pose (world). */
    down(hand: Hand, kind: Kind, grip: TransformNode, root: TransformNode): void;
    /** Stop feeding `hand`. */
    up(hand: Hand): void;
    /** The hands being fed. */
    held(): Hand[];
    /** Per frame: move every fed hand to its grip pose, step the easing, copy the proxy to the root. */
    apply(grips: Record<Hand, TransformNode>, root: TransformNode): void;
}

const IDS: Record<Kind, Record<Hand, number>> = {
    "xr-near": { left: 7101, right: 7102 },
    touch: { left: 7201, right: 7202 },
};

/**
 * The root's rotation as a quaternion (placeGraph sets Euler angles).
 * @param root - the graph root
 * @returns its rotation quaternion, created from the Euler angles when missing
 */
export function rootRotation(root: TransformNode): Quaternion {
    root.rotationQuaternion ??= Quaternion.FromEulerVector(root.rotation);
    return root.rotationQuaternion;
}

/**
 * Create the driver.
 * @param engine - the scene's engine (the virtual scene shares it and never renders)
 * @returns the driver
 */
export function createGrab(engine: AbstractEngine): Grab {
    const scene = new Scene(engine, { virtual: true });
    scene.detachControl();
    const proxy = new TransformNode("handling-grab-proxy", scene);
    proxy.rotationQuaternion = new Quaternion();
    const behavior = new SixDofDragBehavior();
    behavior.detachCameraControls = false;
    behavior.allowMultiPointer = true;
    proxy.addBehavior(behavior);

    // A hand as the behavior sees it: a node with the grip's world pose.
    const hands: Record<Hand, TransformNode> = {
        left: new TransformNode("handling-hand-left", scene),
        right: new TransformNode("handling-hand-right", scene),
    };
    hands.left.rotationQuaternion = new Quaternion();
    hands.right.rotationQuaternion = new Quaternion();
    const fed = new Map<Hand, Kind>();
    const ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);
    const pick = new PickingInfo();
    pick.hit = true;
    pick.pickedMesh = proxy as unknown as AbstractMesh;
    pick.pickedPoint = new Vector3();
    pick.ray = ray;

    const sync = (hand: Hand, grip: TransformNode): void => {
        const h = hands[hand];
        (grip.parent as TransformNode | null)?.computeWorldMatrix(true);
        grip.computeWorldMatrix(true);
        h.position.copyFrom(grip.absolutePosition);
        (h.rotationQuaternion as Quaternion).copyFrom(grip.absoluteRotationQuaternion);
    };

    const send = (type: number, hand: Hand, kind: Kind): void => {
        const h = hands[hand];
        // xr-near: the grip is the aim, the grip and the origin mesh (NEAR_DRAG). touch: a ray from
        // the hand along its forward axis, picked 1 cm out, so the drag point rides with the hand.
        ray.origin.copyFrom(h.position);
        h.getDirectionToRef(Vector3.Forward(), ray.direction);
        h.position.addToRef(ray.direction.scale(0.01), pick.pickedPoint as Vector3);
        pick.aimTransform = kind === "xr-near" ? h : null;
        pick.gripTransform = kind === "xr-near" ? h : null;
        pick.originMesh = kind === "xr-near" ? (h as unknown as AbstractMesh) : null;
        const event = { pointerId: IDS[kind][hand], pointerType: kind } as unknown as IMouseEvent;
        scene.onPointerObservable.notifyObservers(new PointerInfo(type, event, pick), type);
    };

    return {
        behavior,
        down(hand, kind, grip, root) {
            if (fed.size === 0) {
                proxy.position.copyFrom(root.position);
                (proxy.rotationQuaternion as Quaternion).copyFrom(rootRotation(root));
                proxy.scaling.copyFrom(root.scaling);
                proxy.computeWorldMatrix(true);
            }
            sync(hand, grip);
            fed.set(hand, kind);
            send(PointerEventTypes.POINTERDOWN, hand, kind);
        },
        up(hand) {
            const kind = fed.get(hand);
            if (kind) {
                fed.delete(hand);
                send(PointerEventTypes.POINTERUP, hand, kind);
            }
        },
        held: () => [...fed.keys()],
        apply(grips, root) {
            if (fed.size === 0) {
                return;
            }
            for (const [hand, kind] of fed) {
                sync(hand, grips[hand]);
                send(PointerEventTypes.POINTERMOVE, hand, kind);
            }
            // The behavior eases one pointer toward its target in onBeforeRender; this scene never
            // renders, so step it here, once per frame.
            proxy.computeWorldMatrix(true);
            scene.onBeforeRenderObservable.notifyObservers(scene);
            root.position.copyFrom(proxy.position);
            rootRotation(root).copyFrom(proxy.rotationQuaternion as Quaternion);
            root.scaling.copyFrom(proxy.scaling);
        },
    };
}
