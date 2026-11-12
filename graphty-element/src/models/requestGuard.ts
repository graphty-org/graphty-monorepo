/**
 * @file The guard every model load runs under: while a load is in progress, every URL Babylon.js
 * is about to request passes through `Tools.PreprocessUrl`, and a URL named under the load's root
 * that is not one of the files handed to that load throws (design/rendering/node-models.md, section 3.3).
 *
 * A load names its files under a root of its own in `graphty-model:`, a scheme no page can resolve,
 * and the loaders resolve every reference a model makes against that root (an absolute
 * `https://host/x.png` becomes `graphty-model:/1/https://host/x.png`). So a reference the intake
 * checks missed never turns into a same-origin request carrying the reader's cookies: it is either
 * one of the load's own files, mapped to the `blob:` URL made for it, or it is refused.
 *
 * Only `graphty-model:` URLs are the guard's business. The hook is process-wide and a load is
 * asynchronous, so every other request made meanwhile -- a node's picture, an edge's texture,
 * another element on the page -- is not the model's and passes unchanged (issue #7235).
 */

import { Tools } from "@babylonjs/core/Misc/tools.js";

import { matchInSet, normalizePath } from "../session/assets/references";

/** The root every model load's files are named under, below a root of the load's own. Unresolvable against any page. */
const MODEL_ROOT = "graphty-model:/";

/** The prefix of the error a refused request throws, so a load can tell it from a parse error. */
export const REFUSED = "graphty-model-refused:";

/** One load's files: path inside the set to the `blob:` URL made for it. */
type FileUrls = ReadonlyMap<string, string>;

/**
 * The loads running now, by the root each load's files are named under. Every load has a root of
 * its own (`graphty-model:/<n>/`), so two loads running at once whose main files share a name --
 * two dropped files both called model.glb -- each read their own bytes.
 */
const active = new Map<string, FileUrls>();

/** Loads started on this page, for unique roots. */
let loads = 0;

/**
 * Resolve a URL against the loads running now.
 * @param url - What Babylon is about to request.
 * @returns The URL to request instead, or undefined when no load owns it.
 */
function resolve(url: string): string | undefined {
    for (const [root, files] of active) {
        if (url.startsWith(root)) {
            let path: string;
            try {
                path = decodeURIComponent(url.slice(root.length));
            } catch {
                return undefined;
            }

            // The same tolerant matching the intake accepted the model by (design 12.5): a
            // reference written in another case, with backslashes or as a path on its author's
            // disk reaches the one file of the set it was checked against, and nothing else.
            const normalized = normalizePath(path) ?? "";
            const match = matchInSet(normalized, files);
            return match !== undefined && "path" in match ? files.get(match.path) : undefined;
        }
    }

    return undefined;
}

let installed = false;

/** Wrap Babylon's URL hook once. Outside a load, and for any URL not under {@link MODEL_ROOT}, the previous hook runs unchanged. */
function install(): void {
    if (installed) {
        return;
    }

    installed = true;
    const previous = Tools.PreprocessUrl;
    Tools.PreprocessUrl = (url: string): string => {
        if (active.size === 0 || !url.startsWith(MODEL_ROOT)) {
            return previous(url);
        }

        const mapped = resolve(url);
        if (mapped === undefined) {
            throw new Error(`${REFUSED}${url}`);
        }

        return previous(mapped);
    };
}

/**
 * Guard every request until the returned function is called.
 * @param files - The load's files: path to `blob:` URL.
 * @returns The root this load names its files under, and a function that ends its guard.
 */
export function guardRequests(files: FileUrls): { readonly root: string; readonly release: () => void } {
    install();
    const root = `${MODEL_ROOT}${String(++loads)}/`;
    active.set(root, files);
    return {
        root,
        release: () => {
            active.delete(root);
        },
    };
}
