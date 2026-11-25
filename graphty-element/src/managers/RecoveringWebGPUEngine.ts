/// <reference types="@webgpu/types" />
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";

import type { GpuDeviceHandle } from "../render/gpuHandles";

/**
 * A WebGPU engine that comes back from a lost device.
 *
 * Babylon's does not: it starts `initAsync` and, without waiting for it, rebuilds on the device
 * that was lost and says the context is back, so the page floods validation errors after a
 * `device.destroy()` and dies in `createBuffer` after a GPU process crash. Here the rebuild and
 * the restored event wait for the new device, and the loop's frames stay skipped until then. The
 * overrides are Babylon internals: a Babylon upgrade reruns `test/gpu-loss/`.
 *
 * It also destroys the map-readable buffers Babylon leaves behind (issue #9850). Babylon never destroys its
 * occlusion query buffers, nor a readPixels buffer whose read was cut short by a loss or a dispose, and Chromium
 * keeps every such buffer until the page's frame goes away. Then it destroys them all, and one made on a device
 * of a GPU process that has since crashed is a use-after-free that takes the page's renderer down (chromium
 * 143.0.7499.4, in `LocalDOMWindow::FrameDestroyed`). Destroyed here when their device is done with, there is
 * nothing left for it.
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
    /** Why {@link drawingDevice} has no device to give: the restore failed or the engine was disposed. */
    private noDevice: { error: unknown } | null = null;
    /** Babylon's reopening of the device after the last loss, kept for {@link retryRestore}. */
    private reopen: (() => void) | null = null;
    /** Those told of the new device by {@link drawingDevice}. */
    private readonly waiting: { resolve: (device: GpuDeviceHandle) => void; reject: (error: unknown) => void }[] = [];
    /** The map-readable and map-writable buffers made on this engine's devices and not destroyed yet. */
    private readonly mappable = new Set<GPUBuffer>();

    /**
     * Opens nothing yet: as Babylon's engine, with every map-readable buffer of each device it opens noted.
     * @param args - Babylon's `WebGPUEngine` arguments: the canvas and the options.
     */
    constructor(...args: ConstructorParameters<typeof WebGPUEngine>) {
        super(...args);
        // Babylon sets `_device` once per device it opens, in `initAsync`, before it makes any buffer on it.
        let device: GPUDevice | undefined;
        Object.defineProperty(this, "_device", {
            configurable: true,
            get: () => device,
            set: (opened: GPUDevice | undefined) => {
                device = opened;
                if (opened !== undefined) {
                    this.trackMappable(opened);
                }
            },
        });
    }

    /**
     * The device drawn on, waiting for the new one during a loss. The wait is already set when a
     * consumer of the same device hears of the loss: Babylon's `device.lost` handler was attached
     * when the device opened, before anyone could be handed it, so it runs first.
     * @returns The device; rejects once a restore has failed or the engine is disposed, since
     * nothing would ever answer.
     */
    drawingDevice(): Promise<GpuDeviceHandle> {
        if (this.noDevice !== null) {
            return Promise.reject(this.noDevice.error);
        }

        return this.awaitingDevice
            ? new Promise((resolve, reject) => {
                  this.waiting.push({ resolve, reject });
              })
            : Promise.resolve(this._device);
    }

    /**
     * The device drawn on now, or null while a loss waits for the new one.
     * @returns The device, or null.
     */
    deviceNow(): GpuDeviceHandle | null {
        return this.awaitingDevice || this.noDevice !== null ? null : this._device;
    }

    /** Disposes the engine and refuses whoever waits for its device. */
    override dispose(): void {
        super.dispose();
        this.destroyMappable();
        this.giveUp(new Error("the WebGPU engine was disposed"));
    }

    /**
     * Tries again to open a device after a restore failed, and rebuilds on it. Does nothing while
     * the engine has a device or is still waiting for one.
     */
    retryRestore(): void {
        if (this.noDevice !== null && this.reopen !== null && !this.isDisposed) {
            this._restoreEngineAfterContextLost(this.reopen);
        }
    }

    protected override _restoreEngineAfterContextLost(initEngine: () => void): void {
        this.reopen = initEngine;
        this.awaitingDevice = true;
        this.noDevice = null;
        const loss = ++this.losses;
        this.tellCanvas("webglcontextlost");
        super._restoreEngineAfterContextLost(() => {
            if (this.isDisposed) {
                return;
            }

            // Typed as returning nothing, but the initEngine Babylon passes is async. A rebuild on
            // the new device that throws fails the restore as a refused device does: left as an
            // unhandled rejection, nothing said the graph had stopped drawing and every wait for
            // the restore waited forever (issue #6422).
            const reopened = (initEngine as unknown as () => Promise<void>)();
            // The lost device's buffers, now that `initAsync` has moved the engine on: a read of one still
            // waiting resolves empty instead of failing.
            this.destroyMappable();
            reopened
                .then(() => {
                    this.finishRestore(loss);
                })
                .catch((error: unknown) => {
                    if (loss === this.losses && !this.isDisposed) {
                        this.onRestoreFailed?.(error);
                        this.giveUp(error);
                    }
                });
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
     * `Mesh._rebuild`, which Babylon's own `_rebuildBuffers` reaches through each scene's geometry
     * rebuild, drops a mesh's per-instance buffers but not their per-render-pass copies, the only
     * ones WebGPU uses: a write to one made on the lost device fails validation after a `destroy`
     * and aborts the renderer after a crash. So they are dropped first; Babylon rebuilds every
     * geometry itself, once.
     */
    protected override _rebuildBuffers(): void {
        for (const scene of [...this.scenes, ...this._virtualScenes]) {
            for (const mesh of scene.meshes) {
                if (mesh instanceof Mesh && mesh._userInstancedBuffersStorage !== undefined) {
                    mesh._userInstancedBuffersStorage.renderPasses = {};
                }
            }
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
     * Answers whoever waits for a device, and whoever asks from now on, with a refusal.
     * @param error - Why there is no device.
     */
    private giveUp(error: unknown): void {
        this.noDevice = { error };
        for (const { reject } of this.waiting.splice(0)) {
            reject(error);
        }
    }

    /**
     * Notes every map-readable or map-writable buffer the device makes, until something destroys it.
     * @param device - A device the engine opened.
     */
    private trackMappable(device: GPUDevice): void {
        const createBuffer = device.createBuffer.bind(device);
        device.createBuffer = (descriptor: GPUBufferDescriptor): GPUBuffer => {
            const buffer = createBuffer(descriptor);
            if ((descriptor.usage & (GPUBufferUsage.MAP_READ | GPUBufferUsage.MAP_WRITE)) !== 0) {
                this.mappable.add(buffer);
                const destroy = buffer.destroy.bind(buffer);
                buffer.destroy = (): undefined => {
                    this.mappable.delete(buffer);
                    destroy();
                };
            }

            return buffer;
        };
    }

    /** Destroys every map-readable or map-writable buffer still alive. */
    private destroyMappable(): void {
        for (const buffer of [...this.mappable]) {
            buffer.destroy();
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
