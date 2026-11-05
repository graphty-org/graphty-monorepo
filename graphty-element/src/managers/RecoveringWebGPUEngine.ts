import { Mesh, WebGPUEngine } from "@babylonjs/core";

/**
 * A WebGPU engine that comes back from a lost device.
 *
 * Babylon's does not: it starts `initAsync` and, without waiting for it, rebuilds on the device
 * that was lost and says the context is back, so the page floods validation errors after a
 * `device.destroy()` and dies in `createBuffer` after a GPU process crash. Here the rebuild and
 * the restored event wait for the new device, and the loop's frames stay skipped until then. The
 * overrides are Babylon internals: a Babylon upgrade reruns `test/gpu-loss/`.
 */
export class RecoveringWebGPUEngine extends WebGPUEngine {
    /** Told when no new device could be had, so nothing will be drawn again. */
    onRestoreFailed: ((error: unknown) => void) | null = null;
    /** Whether this engine's device was opened to be shared with the layout's accelerator. */
    sharesDevice = false;
    /** True from a loss until the new device is ready: Babylon's own rebuild is skipped meanwhile. */
    private awaitingDevice = false;
    /** Counts losses, so a device lost while it opens leaves the rebuild to the later loss. */
    private losses = 0;
    /** Those told of the new device by {@link drawingDevice}. */
    private readonly waiting: { resolve: (device: GPUDevice) => void; reject: (error: unknown) => void }[] = [];

    /**
     * The device drawn on, waiting for the new one during a loss. The wait is already set when a
     * consumer of the same device hears of the loss: Babylon's `device.lost` handler was attached
     * when the device opened, before anyone could be handed it, so it runs first.
     * @returns The device.
     */
    drawingDevice(): Promise<GPUDevice> {
        return this.awaitingDevice
            ? new Promise((resolve, reject) => {
                  this.waiting.push({ resolve, reject });
              })
            : Promise.resolve(this._device);
    }

    protected override _restoreEngineAfterContextLost(initEngine: () => void): void {
        this.awaitingDevice = true;
        const loss = ++this.losses;
        this.tellCanvas("webglcontextlost");
        super._restoreEngineAfterContextLost(() => {
            if (this.isDisposed) {
                return;
            }

            // Typed as returning nothing, but the initEngine Babylon passes is async.
            (initEngine as unknown as () => Promise<void>)().then(
                () => {
                    this.finishRestore(loss);
                },
                (error: unknown) => {
                    if (loss === this.losses && !this.isDisposed) {
                        this.onRestoreFailed?.(error);
                        for (const { reject } of this.waiting.splice(0)) {
                            reject(error);
                        }
                    }
                },
            );
        });
    }

    protected override _rebuildGraphicsResources(): void {
        if (!this.awaitingDevice) {
            super._rebuildGraphicsResources();
        }
    }

    protected override _flagContextRestored(): void {
        if (!this.awaitingDevice) {
            super._flagContextRestored();
        }
    }

    /**
     * Babylon's WebGL engine rebuilds the geometries here; its WebGPU engine forgets to. And
     * `Mesh._rebuild` drops a mesh's per-instance buffers but not their per-render-pass copies, the
     * only ones WebGPU uses: a write to one made on the lost device fails validation after a
     * `destroy` and aborts the renderer after a crash.
     */
    protected override _rebuildBuffers(): void {
        for (const scene of [...this.scenes, ...this._virtualScenes]) {
            for (const mesh of scene.meshes) {
                if (mesh instanceof Mesh && mesh._userInstancedBuffersStorage !== undefined) {
                    mesh._userInstancedBuffersStorage.renderPasses = {};
                }
            }

            scene.resetCachedMaterial();
            scene._rebuildGeometries();
        }

        super._rebuildBuffers();
    }

    /**
     * Rebuilds on the new device and wakes the loop.
     * @param loss - The loss this device answers.
     */
    private finishRestore(loss: number): void {
        if (loss !== this.losses || this.isDisposed) {
            return;
        }

        this.awaitingDevice = false;
        this._rebuildGraphicsResources();
        this._flagContextRestored();
        this.tellCanvas("webglcontextrestored");
        for (const { resolve } of this.waiting.splice(0)) {
            resolve(this._device);
        }
    }

    /**
     * Fires the event a WebGL canvas fires by itself, which is all a resting loop and the edge
     * batches listen to; see `READER_INPUT_EVENTS` in RenderManager.ts for why not an observer.
     * @param type - The event.
     */
    private tellCanvas(type: "webglcontextlost" | "webglcontextrestored"): void {
        this.getRenderingCanvas()?.dispatchEvent(new Event(type));
    }
}
