/**
 * Models and pictures dropped or chosen by the reader: reading what was dropped (files, a folder, a
 * .zip) and putting an accepted model or picture on nodes. Whether files are a model or a picture,
 * and whether one is fine, is graphty-element's call (`detectAssetKind`, `session.assets.add`);
 * this file only hands it the files and words the answer.
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import { detectAssetKind } from "@graphty/graphty-element/catalog";
import type { AssetOffer, AssetRecord, AssetSource, GraphSession, ModelChange } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

import type { WorkspaceStore } from "../state/store";
import { modelWords } from "../style/modelWords";

/** What was dropped: the files, and the same files as graphty-element's assets take them. */
export interface Dropped {
    /** Every file, for asking the element what they are. */
    readonly files: readonly File[];
    /** For `session.assets.add`: the files, or a folder's files by path. */
    readonly source: AssetSource;
}

/** The first bytes the element reads to tell a model or a picture (it reads up to 4 KB). */
const HEAD_BYTES = 4096;

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
 * Whether any of the files is a 3D model or a picture, as graphty-element tells from each name and
 * first bytes.
 * @param files - the files.
 * @returns true for a model or a picture, even one the element cannot load (it says why on add).
 */
export async function holdsAsset(files: readonly File[]): Promise<boolean> {
    for (const file of files) {
        const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
        if (detectAssetKind({ filename: file.name, head }) !== undefined) {
            return true;
        }
    }
    return false;
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
    if (session.assets.waiting().length === 0) {
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
    return [...(source as Iterable<File>)].filter((f) => f instanceof File);
}

/** How large a model's picture is drawn in a field's glyph slot, in CSS pixels. */
const THUMBNAIL_PX = 16;

/**
 * A model's picture: a sample's catalog thumbnail, else the model as graphty-element draws it
 * (`nodeThumbnail`) once it is drawn; undefined until then (the cube stands in).
 * @param element - the element, which draws the picture.
 * @param session - the element's session.
 * @param ref - what a layer names, or undefined for no model.
 * @returns the picture's URL, or undefined.
 */
export function useModelThumbnail(
    element: GraphtyElement | null,
    session: GraphSession | null,
    ref: string | undefined,
): string | undefined {
    const states = useModelStates(ref === undefined ? null : session);
    const drawn = states.some((change) => change.ref === ref && change.state === "drawn");
    const [drawing, setDrawing] = useState<string | undefined>(undefined);
    useEffect(() => {
        if (element === null || ref === undefined || !drawn) {
            setDrawing(undefined);
            return undefined;
        }
        let live = true;
        element
            .nodeThumbnail({ shape: "box", model: ref, size: THUMBNAIL_PX * Math.ceil(window.devicePixelRatio || 1) })
            .then((url) => {
                if (live) {
                    setDrawing(url);
                }
            })
            .catch(() => {
                // The cube stays.
            });
        return () => {
            live = false;
        };
    }, [element, ref, drawn]);
    const sample = ref === undefined ? undefined : session?.catalog.models().find((m) => m.id === ref)?.thumbnail;
    return sample ?? drawing;
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
    return ref.startsWith("asset:") ? "" : ref;
}

/**
 * A model's name for the reader: its main file without the extension, or a sample's name.
 * @param session - the element's session.
 * @param ref - what a layer names: an asset id.
 * @returns the name.
 */
export function modelName(session: GraphSession, ref: string): string {
    const sample = session.catalog.models().find((m) => m.id === ref);
    if (sample !== undefined) {
        return sample.plainName;
    }
    // The element resolves what a layer names: an id, the id a model had while it waited for
    // parts, a URL. A waiting model is named by its main file too.
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
 * Whether any node layer names a model or picture, by any name the element knows it by.
 * @param session - the element's session.
 * @param ref - the model's id, or the id it had while it waited.
 * @returns true when a layer names it.
 */
function named(session: GraphSession, ref: string): boolean {
    const id = session.assets.find(ref)?.id ?? ref;
    return session.styles
        .list()
        .some((layer) =>
            [layer.set?.["node.model"], layer.set?.["node.texture"]].some(
                (value) => typeof value === "string" && (value === ref || session.assets.find(value)?.id === id),
            ),
        );
}

/**
 * One undoable layer drawing a model or a picture on the selected nodes, or on every node when
 * nothing is selected, and the notice that says so with Undo.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param record - the model or the picture: accepted, or a model waiting for parts.
 * @param message - the notice's words, when they are not "Nodes drawn as ...".
 */
async function drawOnNodes(
    session: GraphSession,
    store: WorkspaceStore,
    record: AssetRecord,
    message?: string,
): Promise<void> {
    const { nodes } = session.selection;
    const picture = record.kind === "image";
    const name = picture ? pictureName(session, record.id) : modelName(session, record.id);
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: nodes.length > 0 ? { match: "ids", nodes } : { match: "everything" },
        set: picture ? { "node.texture": record.id } : { "node.model": record.id },
    });
    const drawn = `${picture ? "drawn with" : "drawn as"} ${name}`;
    store.set({
        // The new layer opens in the Style panel, so its Shape or Picture field (and a model's
        // missing-parts chip) is in view.
        inspected: { kind: "layer-row", id: layer.id, tab: "style" },
        notice: {
            message: message ?? (nodes.length > 0 ? `Selected nodes ${drawn}` : `Nodes ${drawn}`),
            action: {
                label: "Undo",
                run: () => {
                    void session.undo();
                },
            },
        },
    });
}

/**
 * Hands the files to a model waiting for them first; else adds them, and makes one undoable layer
 * drawing the model (`node.model`) or the picture (`node.texture`) on the selected nodes, or on
 * every node when nothing is selected. A model waiting for parts gets its layer too, so the Shape
 * field names it and offers its parts; a model finished by these files that no layer names yet is
 * put on the nodes. A refusal is said in a notice.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param source - the model's or the picture's files.
 * @returns the record, or null when the files went to a waiting model or were refused.
 */
export async function putAssetOnNodes(
    session: GraphSession,
    store: WorkspaceStore,
    source: AssetSource,
): Promise<AssetRecord | null> {
    const { supplied, rest } = await offerFirst(session, source, filesOf(source));
    if (rest === null) {
        const [part] = supplied;
        const finished = session.assets.find(part.ref);
        if (finished?.state === "accepted" && !named(session, part.ref)) {
            await drawOnNodes(session, store, finished);
            return null;
        }
        store.set({ notice: { message: `${part.fileName} added to ${modelName(session, part.ref)}` } });
        return null;
    }
    const record = await session.assets.add(rest);
    const waits = session.assets.waiting().some((w) => w.id === record.id);
    if (record.state !== "accepted" && !waits) {
        const [first] = record.problems;
        store.set({ notice: { message: first === undefined ? "The model could not be added." : modelWords(first) } });
        return null;
    }
    const [missing] = waits ? record.problems : [];
    await drawOnNodes(session, store, record, missing === undefined ? undefined : modelWords(missing));
    return record;
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
