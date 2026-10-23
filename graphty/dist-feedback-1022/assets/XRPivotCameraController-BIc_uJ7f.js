import { Vector3 as f, Quaternion as E, Ray as M, WebXRState as D } from "./babylon-EA5yuCz0.js";
import { a as I, P as O } from "./index-B5Ke6Umr.js";
import { J as N } from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
import "./label-style-DGSNp8RO.js";
function x(c, t = 0.15) {
    if (Math.abs(c) < t) return 0;
    const e = Math.sign(c),
        i = (Math.abs(c) - t) / (1 - t);
    return e * Math.pow(i, 2);
}
const P = 0.15,
    k = 0.04,
    L = 0.03,
    w = 0.08,
    A = 0.02,
    X = 2,
    y = 0.04,
    F = 0.06,
    T = 1e-4;
function z(c, t) {
    return c < (t ? F : y);
}
function G(c) {
    return Math.max(0, 1 - c / y);
}
function W(c, t) {
    const e = x(c.x, P),
        i = x(c.y, P),
        n = x(t.x, P),
        s = x(t.y, P),
        o = e * k,
        r = i * L,
        a = Math.abs(o) > T || Math.abs(r) > T;
    return {
        yaw: a ? o : 0,
        pitch: a ? r : 0,
        zoom: Math.abs(s) > T ? 1 + s * A : 1,
        pan: Math.abs(n) > T ? n * w : 0,
    };
}
function V(c, t, e, i) {
    const n = 1 + (e - c) * X,
        s = 2 - Math.max(0.9, Math.min(1.1, n)),
        o = f.Cross(t, i),
        r = o.length();
    if (r <= T) return { zoom: s, axis: null, angle: 0 };
    const a = Math.acos(Math.max(-1, Math.min(1, f.Dot(t, i))));
    return { zoom: s, axis: o.scaleInPlace(1 / r), angle: -a };
}
const p = N.getLogger(["graphty", "camera", "xr", "input"]);
class Y {
    constructor(t, e) {
        ((this.enabled = !1),
            (this.setupControllers = new Map()),
            (this.controllerCleanup = new Map()),
            (this.gestureControllers = new Map()),
            (this.leftStick = { x: 0, y: 0 }),
            (this.rightStick = { x: 0, y: 0 }),
            (this.leftHand = null),
            (this.rightHand = null),
            (this.previousDistance = null),
            (this.previousDirection = null),
            (this.wasPinching = { left: !1, right: !1 }),
            (this.handTrackingFeature = null),
            (this.lastControllerRemovedTime = 0),
            (this.INPUT_SWITCH_DELAY_MS = 100),
            (this.isDraggingNode = !1),
            (this.draggedNodeHandler = null),
            (this.dragHand = null),
            (this.lastDragHandPosition = null),
            (this.VELOCITY_SLOW_THRESHOLD = 0.005),
            (this.VELOCITY_FAST_THRESHOLD = 0.03),
            (this.AMP_SLOW = 5),
            (this._AMP_MEDIUM = 10),
            (this.AMP_FAST = 20),
            (this.lastDragTime = 0),
            (this.SMOOTHING_FACTOR = 0.7),
            (this.smoothedDelta = null),
            (this.DRAG_THRESHOLD = 0.08),
            (this.dragStartHandPosition = null),
            (this.dragThresholdExceeded = !1),
            (this.frameCount = 0),
            (this.dragUpdateCount = 0),
            (this.pivotController = t),
            (this.xr = e),
            (this.scene = e.baseExperience.sessionManager.scene));
    }
    enable() {
        this.enabled ||
            ((this.enabled = !0),
            this.enableHandTracking(),
            this.xr.input.onControllerAddedObservable.add((t) => {
                const i = performance.now() - this.lastControllerRemovedTime;
                if (i < this.INPUT_SWITCH_DELAY_MS && this.lastControllerRemovedTime > 0) {
                    const n = this.INPUT_SWITCH_DELAY_MS - i;
                    setTimeout(() => {
                        (this.setupController(t), this.addGestureController(t));
                    }, n);
                } else (this.setupController(t), this.addGestureController(t));
            }),
            this.xr.input.onControllerRemovedObservable.add((t) => {
                (this.cleanupController(t), this.removeGestureController(t));
            }),
            this.xr.input.controllers.forEach((t) => {
                (this.setupController(t), this.addGestureController(t));
            }));
    }
    enableHandTracking() {
        try {
            const { featuresManager: t } = this.xr.baseExperience;
            this.handTrackingFeature = t.getEnabledFeature("xr-hand-tracking");
        } catch {
            this.handTrackingFeature = null;
        }
    }
    addGestureController(t) {
        const { uniqueId: e } = t,
            { handedness: i } = t.inputSource;
        (i === "left" || i === "right") && this.gestureControllers.set(e, { controller: t, handedness: i });
    }
    removeGestureController(t) {
        const { uniqueId: e } = t;
        this.gestureControllers.has(e) && this.gestureControllers.delete(e);
    }
    disable() {
        this.enabled &&
            ((this.enabled = !1),
            this.setupControllers.forEach((t, e) => {
                const i = this.controllerCleanup.get(e);
                i && i();
            }),
            this.setupControllers.clear(),
            this.controllerCleanup.clear(),
            this.gestureControllers.clear(),
            (this.leftStick = { x: 0, y: 0 }),
            (this.rightStick = { x: 0, y: 0 }),
            (this.leftHand = null),
            (this.rightHand = null),
            (this.wasPinching = { left: !1, right: !1 }),
            (this.handTrackingFeature = null),
            this.resetGestureState());
    }
    setupController(t) {
        const { handedness: e } = t.inputSource,
            { uniqueId: i } = t;
        if (this.setupControllers.has(i)) return;
        const { inputSource: n } = t;
        if (n.profiles.some((a) => a.includes("hand") || a.includes("generic-trigger-touchpad"))) return;
        const o = (a) => {
                if (this.setupControllers.has(i)) return;
                const l = a.getComponent("xr-standard-thumbstick");
                if (!l) return;
                this.setupControllers.set(i, !0);
                const u = e === "left";
                let v = !1;
                const m = (H) => {
                        if (v) return;
                        const { x: S } = H,
                            { y: R } = H;
                        u
                            ? ((this.leftStick.x = S), (this.leftStick.y = R))
                            : ((this.rightStick.x = S), (this.rightStick.y = R));
                    },
                    C = l.onAxisValueChangedObservable.add(m),
                    b = this.scene;
                let g = null;
                const _ = () => {
                    if (v || !this.enabled) return;
                    if (!this.setupControllers.has(i)) {
                        g && (b.onBeforeRenderObservable.remove(g), (g = null));
                        return;
                    }
                    if (l._disposed) {
                        g && (b.onBeforeRenderObservable.remove(g), (g = null));
                        return;
                    }
                    const H = l.axes.x,
                        S = l.axes.y;
                    u
                        ? ((this.leftStick.x = H), (this.leftStick.y = S))
                        : ((this.rightStick.x = H), (this.rightStick.y = S));
                };
                ((g = b.onBeforeRenderObservable.add(_)),
                    this.controllerCleanup.set(i, () => {
                        if (((v = !0), C))
                            try {
                                l.onAxisValueChangedObservable.remove(C);
                            } catch {}
                        if (g)
                            try {
                                b.onBeforeRenderObservable.remove(g);
                            } catch {}
                    }));
            },
            r = t;
        if (r.motionController) o(r.motionController);
        else {
            r.onMotionControllerInitObservable.add((l) => {
                o(l);
            });
            let a = 0;
            const d = setInterval(() => {
                if ((a++, this.setupControllers.has(i) || a > 20)) {
                    clearInterval(d);
                    return;
                }
                r.motionController && (o(r.motionController), clearInterval(d));
            }, 100);
        }
    }
    cleanupController(t) {
        const { uniqueId: e } = t,
            { handedness: i } = t.inputSource,
            n = this.controllerCleanup.get(e);
        (n && (n(), this.controllerCleanup.delete(e)),
            this.setupControllers.delete(e),
            i === "left" ? (this.leftStick = { x: 0, y: 0 }) : i === "right" && (this.rightStick = { x: 0, y: 0 }),
            (this.lastControllerRemovedTime = performance.now()));
    }
    update() {
        this.enabled &&
            (this.frameCount++,
            this.processThumbsticks(),
            this.updateHandStates(),
            this.processNodeInteraction(),
            this.isDraggingNode || this.processHandGesturesInternal());
    }
    processThumbsticks() {
        const { yaw: t, pitch: e, zoom: i, pan: n } = W(this.leftStick, this.rightStick);
        ((t !== 0 || e !== 0) && this.pivotController.rotate(t, e),
            i !== 1 && this.pivotController.zoom(i),
            n !== 0 && this.pivotController.panViewRelative(n, 0));
    }
    processHandGesturesInternal() {
        if (!this.leftHand?.isPinching || !this.rightHand?.isPinching) return;
        const t = this.leftHand.position,
            e = this.rightHand.position,
            i = f.Distance(t, e),
            s = e.subtract(t).normalize();
        if (this.previousDistance === null || this.previousDirection === null) {
            ((this.previousDistance = i), (this.previousDirection = s.clone()));
            return;
        }
        const { zoom: o, axis: r, angle: a } = V(this.previousDistance, this.previousDirection, i, s);
        (this.pivotController.zoom(o),
            r && this.pivotController.rotateAroundAxis(r, a),
            (this.previousDistance = i),
            (this.previousDirection = s.clone()));
    }
    updateHandStates() {
        ((this.leftHand = this.getHandState("left")), (this.rightHand = this.getHandState("right")));
    }
    getHandState(t) {
        let e = null;
        for (const i of this.gestureControllers.values())
            if (i.handedness === t) {
                e = i;
                break;
            }
        if (e) {
            const { controller: i } = e,
                { grip: n } = i,
                s = i;
            if (n && s.motionController)
                try {
                    const o = n.position;
                    if (Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.z)) {
                        const r = s.motionController.getComponent("xr-standard-trigger");
                        if (r) {
                            const a = r.value ?? 0;
                            if (r.pressed === !0 || a > 0.5)
                                return (
                                    this.wasPinching[t] || p.debug("Trigger press", { handedness: t, value: a }),
                                    (this.wasPinching[t] = !0),
                                    {
                                        position: o.clone(),
                                        rotation: n.rotationQuaternion?.clone() ?? E.Identity(),
                                        isPinching: !0,
                                        pinchStrength: a,
                                    }
                                );
                            this.wasPinching[t] &&
                                (p.debug("Trigger release", { handedness: t, value: a }),
                                (this.wasPinching[t] = !1),
                                this.resetGestureState());
                        }
                    }
                } catch {}
        }
        if (this.handTrackingFeature)
            try {
                const n = this.handTrackingFeature.getHandByHandedness?.(t);
                if (n) {
                    const s = n.getJointMesh("wrist"),
                        o = n.getJointMesh("thumb-tip"),
                        r = n.getJointMesh("index-finger-tip");
                    if (s && o && r) {
                        if (!Number.isFinite(s.position.x) || !Number.isFinite(o.position.x)) return null;
                        const a = f.Distance(o.position, r.position),
                            d = this.wasPinching[t],
                            l = z(a, d);
                        if (
                            (l !== d &&
                                (p.debug(l ? "Pinch start" : "Pinch end", { handedness: t, distance: a }),
                                l || this.resetGestureState()),
                            (this.wasPinching[t] = l),
                            l)
                        )
                            return {
                                position: s.position.clone(),
                                rotation: s.rotationQuaternion?.clone() ?? E.Identity(),
                                isPinching: !0,
                                pinchStrength: G(a),
                            };
                    }
                }
            } catch {}
        return null;
    }
    resetGestureState() {
        ((this.previousDistance = null), (this.previousDirection = null));
    }
    isEnabled() {
        return this.enabled;
    }
    getPivotController() {
        return this.pivotController;
    }
    processNodeInteraction() {
        const t = this.leftHand?.isPinching ?? !1,
            e = this.rightHand?.isPinching ?? !1;
        if (t && e) {
            this.isDraggingNode && this.endNodeDrag();
            return;
        }
        if (this.isDraggingNode && this.draggedNodeHandler && this.dragHand) {
            const i = this.dragHand === "left" ? this.leftHand : this.rightHand;
            i?.isPinching ? this.updateNodeDrag(i.position) : this.endNodeDrag();
            return;
        }
        t && !e && this.leftHand
            ? this.tryStartNodeDrag("left", this.leftHand.position)
            : e && !t && this.rightHand && this.tryStartNodeDrag("right", this.rightHand.position);
    }
    tryStartNodeDrag(t, e) {
        let i = null;
        for (const u of this.gestureControllers.values())
            if (u.handedness === t) {
                ({ controller: i } = u);
                break;
            }
        if (!i) return;
        const n = new M(f.Zero(), f.Forward(), 100),
            s = i;
        if (s.getWorldPointerRayToRef) s.getWorldPointerRayToRef(n);
        else {
            const u = i.grip ?? i.pointer;
            ((n.origin = u.position.clone()), (n.direction = u.forward.clone()));
        }
        const o = this.scene.pickWithRay(
            n,
            I(this.scene, n, (u) => u.isPickable && u.isEnabled()),
        );
        if (!o?.hit || !o.pickedMesh) return;
        const r = this.findDragHandlerForMesh(o.pickedMesh);
        if (!r) return;
        const d = r.getNode().mesh.position,
            { pickedPoint: l } = o;
        (p.debug("Drag start", {
            handedness: t,
            handPos: { x: e.x, y: e.y, z: e.z },
            nodePos: { x: d.x, y: d.y, z: d.z },
            pickPt: l ? { x: l.x, y: l.y, z: l.z } : null,
        }),
            (this.isDraggingNode = !0),
            (this.draggedNodeHandler = r),
            (this.dragHand = t),
            (this.lastDragHandPosition = e.clone()),
            (this.dragStartHandPosition = e.clone()),
            (this.dragThresholdExceeded = !1),
            (this.lastDragTime = performance.now()));
    }
    updateNodeDrag(t) {
        if (!this.draggedNodeHandler || !this.lastDragHandPosition || !this.dragStartHandPosition) return;
        const e = performance.now();
        if (!this.dragThresholdExceeded) {
            const C = f.Distance(t, this.dragStartHandPosition);
            if (C < this.DRAG_THRESHOLD) {
                ((this.lastDragHandPosition = t.clone()), (this.lastDragTime = e));
                return;
            }
            ((this.dragThresholdExceeded = !0), p.debug("Drag threshold exceeded", { distance: C }));
            const b = this.draggedNodeHandler.getNode();
            (this.draggedNodeHandler.onDragStart(b.mesh.position.clone()),
                (this.lastDragHandPosition = t.clone()),
                (this.lastDragTime = e));
            return;
        }
        const i = t.subtract(this.lastDragHandPosition),
            n = i.length();
        if (n < 1e-4) return;
        this.dragUpdateCount++;
        const s = e - this.lastDragTime,
            o = Math.max(s / 1e3, 0.001),
            r = n / o,
            a = this.calculateVelocityBasedGain(r),
            d = this.transformDeltaToSceneSpace(i);
        (d.scaleInPlace(a),
            this.smoothedDelta === null
                ? (this.smoothedDelta = d.clone())
                : (this.smoothedDelta.scaleInPlace(this.SMOOTHING_FACTOR),
                  this.smoothedDelta.addInPlace(d.scale(1 - this.SMOOTHING_FACTOR))));
        const l = this.smoothedDelta.clone(),
            m = this.draggedNodeHandler.getNode().mesh.position.clone().add(l);
        (this.dragUpdateCount <= 5 &&
            p.trace("Drag update", {
                updateCount: this.dragUpdateCount,
                delta: { x: i.x, y: i.y, z: i.z },
                velocity: r,
                amplification: a,
                newPos: { x: m.x, y: m.y, z: m.z },
            }),
            this.draggedNodeHandler.setPositionDirect(m),
            (this.lastDragHandPosition = t.clone()),
            (this.lastDragTime = e));
    }
    calculateVelocityBasedGain(t) {
        if (t < this.VELOCITY_SLOW_THRESHOLD) return this.AMP_SLOW;
        if (t > this.VELOCITY_FAST_THRESHOLD) return this.AMP_FAST;
        const e = (t - this.VELOCITY_SLOW_THRESHOLD) / (this.VELOCITY_FAST_THRESHOLD - this.VELOCITY_SLOW_THRESHOLD);
        return this.AMP_SLOW + e * (this.AMP_FAST - this.AMP_SLOW);
    }
    transformDeltaToSceneSpace(t) {
        const e = this.pivotController.pivot.rotationQuaternion;
        if (!e) return t.clone();
        const i = t.clone();
        return (i.rotateByQuaternionToRef(e, i), i);
    }
    endNodeDrag() {
        (this.draggedNodeHandler &&
            (this.dragThresholdExceeded
                ? (p.debug("Drag end", { updateCount: this.dragUpdateCount }), this.draggedNodeHandler.onDragEnd())
                : (p.debug("Select (threshold not exceeded)"), this.draggedNodeHandler.select())),
            (this.isDraggingNode = !1),
            (this.draggedNodeHandler = null),
            (this.dragHand = null),
            (this.lastDragHandPosition = null),
            (this.dragStartHandPosition = null),
            (this.dragThresholdExceeded = !1),
            (this.dragUpdateCount = 0),
            (this.lastDragTime = 0),
            (this.smoothedDelta = null));
    }
    findDragHandlerForMesh(t) {
        if (t.metadata && typeof t.metadata == "object") {
            const e = t.metadata;
            if (e.graphNode?.dragHandler) return e.graphNode.dragHandler;
        }
        return null;
    }
    isDragging() {
        return this.isDraggingNode;
    }
}
const h = N.getLogger(["graphty", "camera", "xr"]);
class Z {
    constructor(t, e) {
        ((this.frameCount = 0),
            (this.scene = t),
            (this.xr = e),
            (this.pivotController = new O(t)),
            (this.inputHandler = new Y(this.pivotController, e)),
            h.debug("Created"),
            this.setupXRListeners());
    }
    setupXRListeners() {
        h.debug("Setting up XR state listeners");
        const t = this.xr.baseExperience.state;
        (h.debug("Current XR state", { state: D[t] }),
            t === D.IN_XR && (h.debug("Already in XR, enabling immediately"), this.enableXRMode()),
            this.xr.baseExperience.onStateChangedObservable.add((e) => {
                const i = D[e];
                (h.debug("XR state changed", { state: i }),
                    e === D.IN_XR ? this.enableXRMode() : e === D.NOT_IN_XR && this.disableXRMode());
            }),
            this.xr.baseExperience.onInitialXRPoseSetObservable.add((e) => {
                h.debug("Initial XR pose set", {
                    cameraName: e.name,
                    position: { x: e.position.x, y: e.position.y, z: e.position.z },
                });
            }));
    }
    enableXRMode() {
        const { camera: t } = this.xr.baseExperience;
        ((t.parent = this.pivotController.pivot),
            h.debug("XR camera parented to pivot", { pivotName: this.pivotController.pivot.name, cameraName: t.name }),
            this.parentHandMeshesToPivot(),
            this.inputHandler.enable(),
            h.debug("Input handler enabled"));
    }
    parentHandMeshesToPivot() {
        try {
            const { featuresManager: t } = this.xr.baseExperience,
                e = t.getEnabledFeature("xr-hand-tracking");
            if (!e) {
                h.debug("No hand tracking feature to parent");
                return;
            }
            const i = e;
            (i.leftHand?.handMesh &&
                ((i.leftHand.handMesh.parent = this.pivotController.pivot),
                h.debug("Left hand mesh parented to pivot")),
                i.rightHand?.handMesh &&
                    ((i.rightHand.handMesh.parent = this.pivotController.pivot),
                    h.debug("Right hand mesh parented to pivot")));
            const n = this.scene.meshes.filter((s) => s.name.includes("hand") || s.name.includes("Hand"));
            if (n.length > 0) {
                h.debug("Found hand-related meshes", { count: n.length });
                for (const s of n)
                    s.parent || ((s.parent = this.pivotController.pivot), h.debug("Parented mesh", { name: s.name }));
            }
        } catch (t) {
            h.warn("Error parenting hand meshes", { error: String(t) });
        }
    }
    disableXRMode() {
        (h.debug("Exiting XR, disabling input"),
            this.inputHandler.disable(),
            (this.xr.baseExperience.camera.parent = null));
    }
    update() {
        if ((this.frameCount++, this.frameCount % 300 === 0)) {
            const { camera: t } = this.xr.baseExperience,
                { pivot: e } = this.pivotController;
            h.trace("Heartbeat", {
                frame: this.frameCount,
                inputEnabled: this.inputHandler.isEnabled(),
                cameraParent: t.parent ? t.parent.name : "null",
                pivotPos: { x: e.position.x, y: e.position.y, z: e.position.z },
                pivotScale: e.scaling.x,
            });
        }
        this.inputHandler.update();
    }
    get pivot() {
        return this.pivotController.pivot;
    }
    getPivotController() {
        return this.pivotController;
    }
    getInputHandler() {
        return this.inputHandler;
    }
    reset() {
        this.pivotController.reset();
    }
    dispose() {
        (this.inputHandler.disable(), this.pivotController.pivot.dispose());
    }
}
export { Z as XRPivotCameraController };
//# sourceMappingURL=XRPivotCameraController-BIc_uJ7f.js.map
