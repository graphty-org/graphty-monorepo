/**
 * @file The address a node's placed picture (`node.image`) is loaded from when the layer names an image asset of
 * `session.assets` (`asset:...`) rather than a URL: an object URL of the asset's bytes, made once per asset. The
 * placed picture loads its address itself (NodeDecorationMesh.buildImage), and the browser cannot fetch an asset id,
 * so without this an asset that draws as `node.texture` drew nothing as `node.image` (E_IMAGE_LOAD).
 */

import type { AssetId } from "../session/assets/AssetsApi";

/** The part of `session.assets` read here. */
interface PictureAssets {
    find(ref: string): { readonly id: AssetId; readonly state: string; readonly kind: string } | undefined;
    files(id: AssetId): ReadonlyMap<string, Uint8Array>;
    ready(ref: string): Promise<unknown>;
}

/**
 * Each session's object URLs by asset id, and per id waited for, the nodes still waiting to draw again (null once
 * the wait settled).
 */
const held = new WeakMap<object, { urls: Map<string, string>; asked: Map<string, Set<() => void> | null> }>();

/**
 * The address to load `node.image` from.
 * ponytail: an object URL lives as long as its session; revoke on asset removal if many pictures are swapped.
 * @param session - The element's session, or anything without assets.
 * @param src - What `node.image` names.
 * @param onReady - Called once when an asset that was not held yet is ready, so the node draws again; every node that
 *   asks while the asset is on its way is called.
 * @returns The object URL of an accepted image asset; `src` itself for a URL, or for an asset that is not an
 *   accepted image once it was waited for (it then fails to load and is reported as any picture is); null while an
 *   asset is still on its way.
 */
export function pictureAddress(session: unknown, src: string, onReady: () => void): string | null {
    const assets = (session as { assets?: Partial<PictureAssets> } | null | undefined)?.assets;
    if (!src.startsWith("asset:") || assets?.find === undefined || assets.files === undefined) {
        return src;
    }

    let mine = held.get(assets);
    if (mine === undefined) {
        mine = { urls: new Map(), asked: new Map() };
        held.set(assets, mine);
    }

    const made = mine.urls.get(src);
    if (made !== undefined) {
        return made;
    }

    // eslint-disable-next-line unicorn/no-array-callback-reference -- session.assets.find looks an asset up by id, not an array's find
    const record = assets.find(src);
    if (record?.state === "accepted" && record.kind === "image") {
        const [bytes] = assets.files(record.id).values();
        if (bytes !== undefined) {
            const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
            mine.urls.set(src, url);
            return url;
        }
    }

    if (assets.ready === undefined) {
        return src;
    }

    const waiting = mine.asked.get(src);
    if (waiting === null) {
        return src;
    }

    if (waiting !== undefined) {
        waiting.add(onReady);
        return null;
    }

    const { asked } = mine;
    const all = new Set([onReady]);
    asked.set(src, all);
    const settle = (): void => {
        asked.set(src, null);
        for (const each of all) {
            each();
        }
    };
    assets.ready(src).then(settle, settle);
    return null;
}
