import { assert, describe, it } from "vitest";

import type { CameraState } from "../../src/camera/types";
import { linkCameras, type LinkedCameraView } from "../../src/cameras/linkCameras";
import type { Graphty } from "../../src/graphty-element";

/** A view whose camera is a plain state; setting one reports `overview-changed` as a drawn frame would. */
class FakeView extends EventTarget {
    state: CameraState = { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } };
    sets = 0;
    getCameraState(): CameraState {
        return this.state;
    }
    async setCameraState(state: CameraState): Promise<void> {
        this.sets++;
        // Read back with a rounding difference, as a real camera does.
        this.state = { ...state, position: state.position && { ...state.position, x: state.position.x + 1e-12 } };
        this.dispatchEvent(new Event("overview-changed"));
        return Promise.resolve();
    }
    move(x: number): void {
        this.state = { ...this.state, position: { x, y: 0, z: 10 } };
        this.dispatchEvent(new Event("overview-changed"));
    }
}

describe("linkCameras", () => {
    it("takes the element itself", () => {
        // A compile-time check: an element is a view `linkCameras` accepts.
        const asView = (element: Graphty): LinkedCameraView => element;
        assert.isFunction(asView);
    });

    it("moves every other view to the moved one's camera, once, with no echo", () => {
        const a = new FakeView();
        const b = new FakeView();
        const c = new FakeView();
        const unlink = linkCameras(a, b, c);

        a.move(5);
        assert.strictEqual(b.state.position?.x.toFixed(6), "5.000000");
        assert.strictEqual(c.state.position?.x.toFixed(6), "5.000000");
        assert.strictEqual(a.sets, 0);
        assert.strictEqual(b.sets, 1);
        assert.strictEqual(c.sets, 1);

        b.move(-3);
        assert.strictEqual(a.state.position?.x.toFixed(6), "-3.000000");
        assert.strictEqual(b.sets, 1);

        unlink();
        a.move(9);
        assert.strictEqual(b.state.position?.x.toFixed(6), "-3.000000");
    });

    it("passes nothing on when a view reports a frame with the camera unmoved", () => {
        const a = new FakeView();
        const b = new FakeView();
        linkCameras(a, b);
        a.move(2);
        a.dispatchEvent(new Event("overview-changed"));
        assert.strictEqual(b.sets, 1);
    });

    it("skips a peer drawing in the other mode, and a peer that refuses, raising nothing", async () => {
        const deep = new FakeView();
        deep.state = { ...deep.state, mode: "3d" };
        const flat = new FakeView();
        flat.state = { mode: "2d", zoom: 1, pan: { x: 0, y: 0 } };
        const refusing = new FakeView();
        let refused: Promise<void> | undefined;
        refusing.setCameraState = (): Promise<void> => {
            refusing.sets++;
            refused = Promise.reject(new Error("immersive"));
            return refused;
        };
        linkCameras(deep, flat, refusing);

        deep.move(5);
        assert.strictEqual(flat.sets, 0, "a 3D state is not handed to a 2D view");
        assert.deepStrictEqual(flat.state, { mode: "2d", zoom: 1, pan: { x: 0, y: 0 } });
        assert.strictEqual(refusing.sets, 1);
        // The refusal is caught by the link: awaiting it here would throw, the link's catch would not.
        await refused?.catch(() => undefined);
    });
});
