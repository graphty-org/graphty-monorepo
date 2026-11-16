/**
 * @file A skybox picture drawn flat behind the scene (`projection: "flat"`): a background layer
 * that covers the canvas, cropping the picture's longer side to the canvas's shape and never
 * stretching it, and that stays still as the camera turns.
 */

import type { Observer } from "@babylonjs/core";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine.js";
import { Layer } from "@babylonjs/core/Layers/layer.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Observable } from "@babylonjs/core/Misc/observable.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { trackOnScene } from "../managers/PendingWork";

/** Does nothing: what {@link FlatBackdrop.settle} is before the pending work is entered. */
function noop(): void {
    // Nothing to end yet.
}

/** The flat backdrop's layer name; kept first of the scene's layers (`orderLayers`). */
export const FLAT_BACKDROP_LAYER = "graphty-flat-backdrop";

/**
 * Crop a picture to cover a canvas, as texture scale and offset: the picture's longer side, by
 * aspect, is cut evenly at both ends.
 * @param image - The picture's width over its height.
 * @param canvas - The canvas's width over its height.
 * @returns `[uScale, vScale, uOffset, vOffset]`.
 */
export function coverFit(image: number, canvas: number): [number, number, number, number] {
    if (!Number.isFinite(image) || !Number.isFinite(canvas) || image <= 0 || canvas <= 0) {
        return [1, 1, 0, 0];
    }

    if (image > canvas) {
        const u = canvas / image;
        return [u, 1, (1 - u) / 2, 0];
    }

    const v = image / canvas;
    return [1, v, 0, (1 - v) / 2];
}

/** A picture drawn flat behind the scene, covering the canvas. Shaped like a `PhotoDome` where they meet. */
export class FlatBackdrop {
    /** The picture. */
    readonly texture: Texture;
    /** Notified when the picture could not be loaded. */
    readonly onLoadErrorObservable = new Observable<string>();
    private readonly layer: Layer;
    private readonly engine: AbstractEngine;
    private readonly resized: Observer<AbstractEngine>;
    private disposed = false;
    /** Ends the picture's place in the pending work: loaded, failed or disposed. */
    private settle: () => void = noop;

    /**
     * Load a picture and draw it behind the scene once it arrives.
     * @param url - The picture's address.
     * @param scene - The scene.
     */
    constructor(url: string, scene: Scene) {
        this.engine = scene.getEngine();
        this.layer = new Layer(FLAT_BACKDROP_LAYER, null, scene, true);
        // First of the scene's layers, so every other one (a group outline) is drawn over it.
        const { layers } = scene;
        layers.splice(layers.indexOf(this.layer), 1);
        layers.unshift(this.layer);
        this.holdPicture(scene);
        this.texture = new Texture(url, scene, true, true, Texture.TRILINEAR_SAMPLINGMODE, null, (message) => {
            this.settle();
            this.onLoadErrorObservable.notifyObservers(message ?? url);
        });
        this.texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        this.layer.texture = this.texture;
        this.texture.onLoadObservable.addOnce(() => {
            this.fit();
            this.settle();
        });
        this.resized = this.engine.onResizeObservable.add(() => {
            this.fit();
        });
    }

    /**
     * Show or hide the picture.
     * @param enabled - Whether it draws.
     */
    setEnabled(enabled: boolean): void {
        this.layer.isEnabled = enabled;
    }

    /**
     * Whether {@link dispose} ran.
     * @returns True once it did.
     */
    isDisposed(): boolean {
        return this.disposed;
    }

    /** Remove the layer and release the picture. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.settle();
        this.engine.onResizeObservable.remove(this.resized);
        this.onLoadErrorObservable.clear();
        this.layer.dispose();
        this.texture.dispose();
    }

    /**
     * Hold the scene's picture as not final until the image has arrived, failed to, or this was
     * disposed (each calls {@link settle}).
     * @param scene - The scene.
     */
    private holdPicture(scene: Scene): void {
        void trackOnScene(
            scene,
            "picture",
            "a flat background picture is loading",
            new Promise<void>((resolve) => {
                this.settle = resolve;
            }),
        );
    }

    /** Crop the picture to the canvas's shape now. */
    private fit(): void {
        const { width, height } = this.texture.getSize();
        const [uScale, vScale, uOffset, vOffset] = coverFit(
            width / height,
            this.engine.getRenderWidth() / this.engine.getRenderHeight(),
        );
        Object.assign(this.texture, { uScale, vScale, uOffset, vOffset });
    }
}
