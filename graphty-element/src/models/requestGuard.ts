/**
 * @file The guard every model load runs under: while a load is in progress, every URL Babylon.js
 * is about to request passes through `Tools.PreprocessUrl`, and anything that is not one of the
 * files handed to that load throws (design/rendering/node-models.md, section 3.3).
 *
 * A load names its files under {@link MODEL_ROOT}, a scheme no page can resolve, so a reference
 * the intake checks missed never turns into a same-origin request carrying the reader's cookies:
 * it is either one of the load's own files, mapped to the `blob:` URL made for it, or it is
 * refused. `data:` URLs pass, because the intake allowed only image and octet-stream ones.
 */

import { Tools } from "@babylonjs/core/Misc/tools";

/** The root every model load's files are named under. Unresolvable against any page. */
export const MODEL_ROOT = "graphty-model:/";

/** The prefix of the error a refused request throws, so a load can tell it from a parse error. */
export const REFUSED = "graphty-model-refused:";

/** One load's files: path inside the set to the `blob:` URL made for it. */
type FileUrls = ReadonlyMap<string, string>;

/** The loads running now. */
const active = new Set<FileUrls>();

/**
 * Resolve a URL against the loads running now.
 * @param url - What Babylon is about to request.
 * @returns The URL to request instead, or undefined when no load owns it.
 */
function resolve(url: string): string | undefined {
    for (const files of active) {
        if (url.startsWith(MODEL_ROOT)) {
            let path: string;
            try {
                path = decodeURIComponent(url.slice(MODEL_ROOT.length));
            } catch {
                return undefined;
            }

            const mapped = files.get(path.replace(/^\.\//, ""));
            if (mapped !== undefined) {
                return mapped;
            }
        } else if ([...files.values()].includes(url)) {
            return url;
        }
    }

    return undefined;
}

let installed = false;

/** Wrap Babylon's URL hook once. Outside a load the previous hook runs unchanged. */
function install(): void {
    if (installed) {
        return;
    }

    installed = true;
    const previous = Tools.PreprocessUrl;
    Tools.PreprocessUrl = (url: string): string => {
        if (active.size === 0) {
            return previous(url);
        }

        if (url.startsWith("data:")) {
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
 * @returns A function that ends the guard for this load.
 */
export function guardRequests(files: FileUrls): () => void {
    install();
    active.add(files);
    return () => {
        active.delete(files);
    };
}
