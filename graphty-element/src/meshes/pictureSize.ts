/**
 * @file The natural size of the pictures a scene sizes nodes by: a node that grows to hold its picture
 * (`shape.labelFitImage`) and a table cell sized to its `<IMG>` need the picture's own width and height in pixels
 * before the node can be laid out. Each picture is read once per scene; until it arrives the node is laid out without
 * it, the record of pending work (`managers/PendingWork.ts`) holds "the picture is final" back, and every node that
 * asked is fitted again once it is known (or known to be unreadable).
 */

import { pendingWorkOf } from "../managers/PendingWork";

/** A node that sizes itself by a picture. */
export interface PictureUser {
    isDisposed(): boolean;
    /** Fit the node again, now that a picture it asked for is measured. */
    refitPicture(): void;
}

/** A picture's own width and height, in pixels. */
export interface PictureSize {
    readonly width: number;
    readonly height: number;
}

/** One picture: its size once read (null while loading, and when it could not be read), and who waits for it. */
interface Entry {
    size: PictureSize | null;
    loading: boolean;
    readonly users: Set<PictureUser>;
}

/** The pictures of each scene, by URL. */
const scenes = new WeakMap<object, Map<string, Entry>>();

/**
 * A picture's own size in pixels, once it is read. The first ask starts reading it; a node that asks while it is
 * read is fitted again when it is.
 * @param scene - The scene the node draws in.
 * @param src - The picture's URL.
 * @param user - The node asking.
 * @returns Its size, or null while it is read and when it cannot be.
 */
export function pictureSize(scene: object, src: string, user: PictureUser): PictureSize | null {
    let pictures = scenes.get(scene);
    if (pictures === undefined) {
        pictures = new Map();
        scenes.set(scene, pictures);
    }
    let entry = pictures.get(src);
    if (entry === undefined) {
        entry = { size: null, loading: true, users: new Set() };
        pictures.set(src, entry);
        read(scene, src, entry);
    }
    if (entry.loading) {
        entry.users.add(user);
    }
    return entry.size;
}

/**
 * Reads a picture's size, holding the scene's picture back until every node that asked is fitted to it.
 * @param scene - The scene.
 * @param src - The picture's URL.
 * @param entry - Its entry.
 */
function read(scene: object, src: string, entry: Entry): void {
    const release = pendingWorkOf(scene)?.begin("picture", "a node's picture is still being read to size its node");
    const image = new Image();
    const done = (): void => {
        entry.loading = false;
        for (const user of entry.users) {
            if (!user.isDisposed()) {
                user.refitPicture();
            }
        }
        entry.users.clear();
        release?.();
    };
    image.onload = () => {
        entry.size =
            image.naturalWidth > 0 && image.naturalHeight > 0
                ? { width: image.naturalWidth, height: image.naturalHeight }
                : null;
        done();
    };
    image.onerror = done;
    image.src = src;
}

/** A picture a label draws: the image once loaded (null while loading or when it failed), and who waits for it. */
interface Drawable {
    image: HTMLImageElement | null;
    loading: boolean;
    readonly waiting: Set<() => void>;
}

/** The pictures labels draw in each scene, by URL. */
const drawables = new WeakMap<object, Map<string, Drawable>>();

/**
 * A picture to draw on a label's canvas, loaded once per scene and URL. The first ask starts loading it, held in the
 * record of pending work until it lands; `ready` is called once it has, so the label is painted again.
 * @param scene - The scene the label draws in.
 * @param src - The picture's URL.
 * @param ready - Called once the picture has loaded, while it was loading.
 * @returns The loaded picture, or null while it loads and when it cannot be.
 */
export function drawablePicture(scene: object, src: string, ready: () => void): HTMLImageElement | null {
    let pictures = drawables.get(scene);
    if (pictures === undefined) {
        pictures = new Map();
        drawables.set(scene, pictures);
    }
    let entry = pictures.get(src);
    if (entry === undefined) {
        const made: Drawable = { image: null, loading: true, waiting: new Set() };
        entry = made;
        pictures.set(src, made);
        const release = pendingWorkOf(scene)?.begin("picture", "a label's picture is still loading");
        const image = new Image();
        // drawn on a canvas that is uploaded as a texture: a picture from another origin must not taint it
        image.crossOrigin = "anonymous";
        const done = (): void => {
            made.loading = false;
            for (const call of made.waiting) {
                call();
            }
            made.waiting.clear();
            release?.();
        };
        image.onload = () => {
            made.image = image.naturalWidth > 0 ? image : null;
            done();
        };
        image.onerror = done;
        image.src = src;
    }
    if (entry.loading) {
        entry.waiting.add(ready);
    }
    return entry.image;
}
