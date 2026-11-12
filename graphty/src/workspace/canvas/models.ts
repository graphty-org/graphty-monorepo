/**
 * Models and pictures dropped on or chosen in the Models pop-over: reading what was dropped (files,
 * a folder, a .zip) and naming what graphty-element holds. Whether files are a model or a picture,
 * and whether one is fine, is graphty-element's call (`session.assets.add`); this file only hands
 * it the files.
 */

import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import { type AssetSource, type GraphSession, isAssetId, type ModelChange } from "@graphty/graphty-element/session";
import { type HTMLAttributes, useEffect, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";

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
 * A model's name for the reader: the name the reader gave it, its main file without the extension,
 * or a sample's name.
 * @param session - the element's session.
 * @param ref - what a layer names: an asset id, the id a model had while it waited, or a URL.
 * @returns the name.
 */
export function modelName(session: GraphSession, ref: string): string {
    const sample = session.catalog.models().find((m) => m.id === ref);
    if (sample !== undefined) {
        return sample.plainName;
    }
    const record = session.assets.find(ref);
    return record?.plainName ?? (fileStem(record?.path ?? addressOf(ref)) || "Model");
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
 * A model's picture, drawn by graphty-element as a node draws it (`modelThumbnail`), or a sample's
 * shipped thumbnail. Drawn again when the model or its style changes; undefined while it is drawn
 * and for a model that cannot be drawn (the cube stands in).
 * @param ref - what a layer names, or undefined for no model.
 * @param size - the picture's side in CSS pixels; it is drawn at the screen's pixel ratio.
 * @param style - the node's style values the picture is drawn with (Up, Turn, Color...).
 * @returns the picture's URL, or undefined.
 */
export function useModelPicture(
    ref: string | undefined,
    size: number,
    style?: Readonly<Partial<Record<Channel, ChannelValue>>>,
): string | undefined {
    const { session, element } = useWorkspace();
    // Read again when a model moves on, so a model that just got its parts is drawn.
    useModelStates(session);
    const sample = ref === undefined ? undefined : session?.catalog.models().find((m) => m.id === ref)?.thumbnail;
    const record = ref === undefined || sample !== undefined ? undefined : session?.assets.find(ref);
    const key = record?.state === "accepted" ? JSON.stringify([ref, record.digest, size, style ?? null]) : undefined;
    const [drawn, setDrawn] = useState<{ readonly key: string; readonly url: string } | null>(null);
    useEffect(() => {
        if (key === undefined || element === null) {
            return undefined;
        }
        // Read back from the key, so a style object made anew on every render draws once.
        const [asked, , side, values] = JSON.parse(key) as [
            string,
            string,
            number,
            Record<string, ChannelValue> | null,
        ];
        let live = true;
        element
            .modelThumbnail(asked, { size: side * Math.ceil(window.devicePixelRatio || 1), style: values ?? {} })
            .then((url) => {
                if (live) {
                    setDrawn({ key, url });
                }
            })
            // The cube stays: the model's own chips say why it cannot be drawn.
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [key, element]);
    return sample ?? (drawn !== null && drawn.key === key ? drawn.url : undefined);
}

/**
 * Whether files are held over a drop target, and the handlers that tell: the target is drawn as
 * the compact-mantine file drop zone draws itself while files are held over it.
 * @returns the flag and the handlers to spread on the target.
 */
export function useDropOver(): {
    readonly over: boolean;
    readonly handlers: Pick<HTMLAttributes<HTMLElement>, "onDragOver" | "onDragLeave" | "onDrop">;
} {
    const [over, setOver] = useState(false);
    return {
        over,
        handlers: {
            onDragOver: (event) => {
                event.preventDefault();
                setOver(true);
            },
            onDragLeave: (event) => {
                if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                    setOver(false);
                }
            },
            onDrop: () => {
                setOver(false);
            },
        },
    };
}
