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
