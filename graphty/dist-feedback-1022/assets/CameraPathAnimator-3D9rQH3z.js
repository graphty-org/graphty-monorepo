import { Camera as A, Animation as n, Vector3 as g, CubicEase as l, EasingFunction as T } from "./babylon-EA5yuCz0.js";
import "./preload-helper-BXl3LOEh.js";
class C {
    constructor(t, a, e) {
        ((this.animations = []),
            (this.currentAnimatable = null),
            (this.camera = t),
            (this.scene = a),
            (this.fps = e.fps),
            (this.duration = e.duration),
            (this.easing = e.easing ?? "linear"));
    }
    createCameraAnimations(t) {
        if (t.length < 2) throw new Error("At least 2 waypoints are required for camera path animation");
        return (
            (this.animations = []),
            this.camera.mode === A.ORTHOGRAPHIC_CAMERA
                ? this.animations.push(
                      ...this.createOrthoZoomAnimations(t),
                      this.createPanXAnimation(t),
                      this.createPanYAnimation(t),
                  )
                : this.animations.push(this.createVector3Animation("position", t), this.createTargetAnimation(t)),
            this.animations
        );
    }
    createVector3Animation(t, a) {
        const e = new n(`camera_${t}`, t, this.fps, n.ANIMATIONTYPE_VECTOR3, n.ANIMATIONLOOPMODE_CONSTANT),
            i = a.map((o) => ({
                frame: this.timestampToFrame(o.duration ?? 0, a, o),
                value: new g(o.position.x, o.position.y, o.position.z),
            }));
        return (e.setKeys(i), this.applyEasing(e, this.easing), e);
    }
    createTargetAnimation(t) {
        const a = new n("camera_target", "target", this.fps, n.ANIMATIONTYPE_VECTOR3, n.ANIMATIONLOOPMODE_CONSTANT),
            e = t.map((i) => ({
                frame: this.timestampToFrame(i.duration ?? 0, t, i),
                value: new g(i.target.x, i.target.y, i.target.z),
            }));
        return (a.setKeys(e), this.applyEasing(a, this.easing), a);
    }
    createOrthoZoomAnimations(t) {
        const a = this.camera.orthoLeft ?? -10,
            e = this.camera.orthoRight ?? 10,
            i = this.camera.orthoTop ?? 10,
            o = this.camera.orthoBottom ?? -10,
            c = e - a,
            E = i - o,
            f = c / E,
            p = (s, m) =>
                s.map((h) => {
                    const u = h.position.z || 10,
                        O = u * f;
                    let r;
                    switch (m) {
                        case "left":
                            r = -O;
                            break;
                        case "right":
                            r = O;
                            break;
                        case "top":
                            r = u;
                            break;
                        case "bottom":
                            r = -u;
                            break;
                        default:
                            r = 0;
                    }
                    return { frame: this.timestampToFrame(h.duration ?? 0, s, h), value: r };
                }),
            d = ["orthoLeft", "orthoRight", "orthoTop", "orthoBottom"],
            N = { orthoLeft: "left", orthoRight: "right", orthoTop: "top", orthoBottom: "bottom" };
        return d.map((s) => {
            const m = new n(`camera_${s}`, s, this.fps, n.ANIMATIONTYPE_FLOAT, n.ANIMATIONLOOPMODE_CONSTANT),
                h = p(t, N[s]);
            return (m.setKeys(h), this.applyEasing(m, this.easing), m);
        });
    }
    createPanXAnimation(t) {
        const a = new n("camera_pan_x", "position.x", this.fps, n.ANIMATIONTYPE_FLOAT, n.ANIMATIONLOOPMODE_CONSTANT),
            e = t.map((i) => ({ frame: this.timestampToFrame(i.duration ?? 0, t, i), value: i.position.x }));
        return (a.setKeys(e), this.applyEasing(a, this.easing), a);
    }
    createPanYAnimation(t) {
        const a = new n("camera_pan_y", "position.y", this.fps, n.ANIMATIONTYPE_FLOAT, n.ANIMATIONLOOPMODE_CONSTANT),
            e = t.map((i) => ({ frame: this.timestampToFrame(i.duration ?? 0, t, i), value: i.position.y }));
        return (a.setKeys(e), this.applyEasing(a, this.easing), a);
    }
    timestampToFrame(t, a, e) {
        let i = 0;
        for (const c of a) {
            if (c === e) break;
            i += c.duration ?? 0;
        }
        return (a.indexOf(e) > 0 && (i += e.duration ?? 0), Math.round((i / 1e3) * this.fps));
    }
    applyEasing(t, a) {
        const e = this.getEasingFunction(a);
        e && t.setEasingFunction(e);
    }
    getEasingFunction(t) {
        switch (t) {
            case "linear":
                return null;
            case "easeInOut": {
                const a = new l();
                return (a.setEasingMode(T.EASINGMODE_EASEINOUT), a);
            }
            case "easeIn": {
                const a = new l();
                return (a.setEasingMode(T.EASINGMODE_EASEIN), a);
            }
            case "easeOut": {
                const a = new l();
                return (a.setEasingMode(T.EASINGMODE_EASEOUT), a);
            }
            default:
                return null;
        }
    }
    durationToFrames(t) {
        return Math.round((t / 1e3) * this.fps);
    }
    getTotalFrames() {
        return this.durationToFrames(this.duration);
    }
    async startRealtimeAnimation() {
        if (this.animations.length === 0) throw new Error("No animations created. Call createCameraAnimations first.");
        this.camera.animations = this.animations;
        const t = this.getTotalFrames();
        return new Promise((a) => {
            let e = !1;
            const i = setTimeout(() => {
                e || ((e = !0), a());
            }, this.duration + 100);
            this.currentAnimatable = this.scene.beginAnimation(this.camera, 0, t, !1, 1, () => {
                e || ((e = !0), clearTimeout(i), a());
            });
        });
    }
    stopAnimation() {
        this.currentAnimatable && (this.currentAnimatable.stop(), (this.currentAnimatable = null));
    }
    getCameraStateAtFrame(t) {
        if (this.animations.length === 0) throw new Error("No animations created. Call createCameraAnimations first.");
        if (this.camera.mode === A.ORTHOGRAPHIC_CAMERA) {
            const e = this.evaluateFloatAnimation("orthoTop", t),
                i = this.evaluateFloatAnimation("orthoBottom", t);
            return {
                zoom: e !== void 0 && i !== void 0 ? (e - i) / 2 : void 0,
                pan: {
                    x: this.evaluateFloatAnimation("position.x", t) ?? 0,
                    y: this.evaluateFloatAnimation("position.y", t) ?? 0,
                },
            };
        }
        return {
            position: this.evaluateVector3Animation("position", t),
            target: this.evaluateVector3Animation("target", t),
        };
    }
    evaluateFloatAnimation(t, a) {
        const e = this.animations.find((i) => i.targetProperty === t);
        if (e) return e.evaluate(a);
    }
    evaluateVector3Animation(t, a) {
        const e = this.animations.find((i) => i.targetProperty === t);
        if (e) return e.evaluate(a);
    }
    getAnimations() {
        return this.animations;
    }
    is2DCamera() {
        return this.camera.mode === A.ORTHOGRAPHIC_CAMERA;
    }
}
export { C as CameraPathAnimator };
//# sourceMappingURL=CameraPathAnimator-3D9rQH3z.js.map
