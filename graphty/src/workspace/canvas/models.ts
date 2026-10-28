/**
 * Models dropped or chosen by the reader: reading what was dropped (files, a folder, a .zip) and
 * putting an accepted model on nodes. Whether files are a model, and whether a model is fine, is
 * graphty-element's call (`detectModelFormat`, `session.assets.add`); this file only hands it the
 * files and words the answer.
 */

import { detectModelFormat } from "@graphty/graphty-element/catalog";
import type { AssetRecord, AssetSource, GraphSession } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { modelWords } from "../style/words";

/** What was dropped: the files, and the same files as graphty-element's assets take them. */
interface Dropped {
    /** Every file, for asking the element what they are. */
    readonly files: readonly File[];
    /** For `session.assets.add`: the files, or a folder's files by path. */
    readonly source: AssetSource;
}

/** The first bytes the element reads to tell a model (detectModelFormat reads up to 4 KB). */
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
 * Whether any of the files is a 3D model, as graphty-element tells from each name and first bytes.
 * @param files - the files.
 * @returns true for a model, even one the element cannot load (it says why on add).
 */
export async function holdsModel(files: readonly File[]): Promise<boolean> {
    for (const file of files) {
        const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
        if (detectModelFormat({ filename: file.name, head }) !== undefined) {
            return true;
        }
    }
    return false;
}

/**
 * A model's name for the reader: its main file without the extension, or a sample's name.
 * @param session - the element's session.
 * @param ref - what a layer names: an asset id.
 * @returns the name.
 */
function modelName(session: GraphSession, ref: string): string {
    const sample = session.catalog.models().find((m) => m.id === ref);
    if (sample !== undefined) {
        return sample.plainName;
    }
    const path = session.assets.list().find((r) => r.id === ref || r.url === ref)?.path;
    return path === undefined ? "Model" : (path.split("/").pop() ?? path).replace(/\.[^.]*$/, "");
}

/**
 * Adds the model and, once accepted, one undoable layer drawing it on the selected nodes, or on
 * every node when nothing is selected. A refused model is said in a notice.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param source - the model's files.
 * @returns the record, or null when it was refused.
 */
export async function putModelOnNodes(
    session: GraphSession,
    store: WorkspaceStore,
    source: AssetSource,
): Promise<AssetRecord | null> {
    const record = await session.assets.add(source);
    if (record.state !== "accepted") {
        const [first] = record.problems;
        store.set({ notice: { message: first === undefined ? "The model could not be added." : modelWords(first) } });
        return null;
    }
    const { nodes } = session.selection;
    const name = modelName(session, record.id);
    await session.styles.add({
        name,
        target: "node",
        selector: nodes.length > 0 ? { match: "ids", nodes } : { match: "everything" },
        set: { "node.model": record.id },
    });
    store.set({
        notice: {
            message: nodes.length > 0 ? `Selected nodes drawn as ${name}` : `Nodes drawn as ${name}`,
            action: {
                label: "Undo",
                run: () => {
                    void session.undo();
                },
            },
        },
    });
    return record;
}
