/**
 * Models and pictures dropped on or chosen in the Models pop-over: reading what was dropped (files,
 * a folder, a .zip) and naming what graphty-element holds. Whether files are a model or a picture,
 * and whether one is fine, is graphty-element's call (`session.assets.add`); this file only hands
 * it the files.
 */

import {
    type AssetOffer,
    type AssetSource,
    type GraphSession,
    isAssetId,
    type ModelChange,
} from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** What was dropped: the files, and the same files as graphty-element's assets take them. */
interface Dropped {
    /** Every file, for asking the element what they are. */
    readonly files: readonly File[];
    /** For `session.assets.add`: the files, or a folder's files by path. */
    readonly source: AssetSource;
}

/**
 * Every file under a dropped folder entry, by its path from the drop.
 * @param entry - the folder or file entry.
 * @param into - path to file.
 */
async function walk(entry: FileSystemEntry, into: Map<string, File>): Promise<void> {
    if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
            (entry as FileSystemFileEntry).file(resolve, reject);
        });
        into.set(entry.fullPath.replace(/^\//, ""), file);
        return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });
        if (batch.length === 0) {
            return;
        }
        await Promise.all(batch.map((child) => walk(child, into)));
    }
}

/**
 * What a drop holds. Must be called during the drop event: the browser empties the transfer after.
 * @param transfer - the drop's data.
 * @returns the files, with a dropped folder's files keyed by their paths.
 */
export async function readDrop(transfer: DataTransfer): Promise<Dropped> {
    const files = [...transfer.files];
    const entries = [...transfer.items].map((item) => item.webkitGetAsEntry());
    if (!entries.some((entry) => entry?.isDirectory === true)) {
        return { files, source: files };
    }
    const byPath = new Map<string, File>();
    await Promise.all(entries.flatMap((entry) => (entry === null ? [] : [walk(entry, byPath)])));
    return { files: [...byPath.values()], source: { files: byPath } };
}

/**
 * Hands files to the models waiting for parts first (`session.assets.offer`), so a picture reaches
 * the model that needs it; what no waiting model takes is left to add.
 * @param session - the element's session.
 * @param source - the files as `session.assets.add` takes them.
 * @param files - the same files, one by one.
 * @returns the parts supplied, and what is left to add (null when nothing is).
 */
export async function offerFirst(
    session: GraphSession,
    source: AssetSource,
    files: readonly File[],
): Promise<{ readonly supplied: AssetOffer["supplied"]; readonly rest: AssetSource | null }> {
    if (session.assets.waiting().length === 0 || files.length === 0) {
        return { supplied: [], rest: source };
    }
    const offered = await session.assets.offer(files);
    if (offered.supplied.length === 0) {
        return { supplied: [], rest: source };
    }
    // ponytail: what is left loses its folder paths; a waiting model's parts arrive by name.
    return { supplied: offered.supplied, rest: offered.rest.length === 0 ? null : [...offered.rest] };
}

/**
 * The files of a source handed over one by one: what a chooser or a drop gave.
 * @param source - the files.
 * @returns them, or none for a URL or bytes.
 */
export function filesOf(source: AssetSource): File[] {
    if (typeof source === "string" || source instanceof ArrayBuffer || source instanceof Uint8Array) {
        return [];
    }
    if (source instanceof File) {
        return [source];
    }
    if ("files" in source && source.files instanceof Map) {
        return [...source.files.values()].filter((f): f is File => f instanceof File);
    }
    return [...(source as Iterable<unknown>)].filter((f): f is File => f instanceof File);
}

/**
 * A file's name for the reader: the last part of its path or address, without its query, its
 * fragment or its extension.
 * @param path - a path or an address.
 * @returns the name, or "" when there is none.
 */
export function fileStem(path: string): string {
    const file = path.split(/[?#]/)[0].split("/").pop() ?? "";
    return file.replace(/\.[^.]*$/, "");
}

/**
 * What a layer names, when it is an address and not an asset id.
 * @param ref - what the layer names.
 * @returns the address, or "" for an id.
 */
function addressOf(ref: string): string {
    return isAssetId(ref) ? "" : ref;
}

/**
 * A model's name for the reader: its main file without the extension, or a sample's name.
 * @param session - the element's session.
 * @param ref - what a layer names: an asset id, the id a model had while it waited, or a URL.
 * @returns the name.
 */
export function modelName(session: GraphSession, ref: string): string {
    const sample = session.catalog.models().find((m) => m.id === ref);
    if (sample !== undefined) {
        return sample.plainName;
    }
    return fileStem(session.assets.find(ref)?.path ?? addressOf(ref)) || "Model";
}

/**
 * A picture's name for the reader: its file name without the extension.
 * @param session - the element's session.
 * @param ref - what `node.texture` names: an asset id or a URL.
 * @returns the name.
 */
export function pictureName(session: GraphSession, ref: string): string {
    return fileStem(session.assets.find(ref)?.path ?? addressOf(ref)) || "Picture";
}

/**
 * Where every model a layer names stands, from graphty-element, read again whenever a model moves on.
 * @param session - the element's session, or null.
 * @returns the latest change of each model.
 */
export function useModelStates(session: GraphSession | null): readonly ModelChange[] {
    const [states, setStates] = useState<readonly ModelChange[]>(() => session?.assets.states() ?? []);
    useEffect(() => {
        if (session === null) {
            setStates([]);
            return undefined;
        }
        setStates(session.assets.states());
        return session.on("model:changed", () => {
            setStates(session.assets.states());
        });
    }, [session]);
    return states;
}

/**
 * A model's picture: a sample's catalog thumbnail. A model the reader added has none (the cube
 * stands in): graphty-element's `nodeThumbnail` draws only built-in shapes yet.
 * @param session - the element's session.
 * @param ref - what a layer names, or undefined for no model.
 * @returns the picture's URL, or undefined.
 */
export function modelThumbnail(session: GraphSession, ref: string | undefined): string | undefined {
    return ref === undefined ? undefined : session.catalog.models().find((m) => m.id === ref)?.thumbnail;
}
