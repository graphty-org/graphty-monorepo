/**
 * The browser's side of a project file: where the browser keeps file handles (the File System
 * Access API, Chromium), Save writes the same file again and Recent projects reopens it; elsewhere
 * Save downloads a copy and reopening asks for the file. Nothing here reads what is in a file.
 */

/**
 * The file type a project is saved as, for the save picker. Temporary copy of what
 * graphty-element's `downloadProject` uses, which the element does not export (#919); import it
 * from the element and delete this once it does.
 */
const PROJECT_TYPE = {
    description: "graphty project",
    accept: { "application/vnd.graphty+json": [".json"] },
} as const;

/** The parts of the File System Access API this file uses, which TypeScript's DOM library lacks. */
interface FileAccessWindow {
    showSaveFilePicker?: (options: {
        suggestedName?: string;
        types?: readonly (typeof PROJECT_TYPE)[];
    }) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options: { types?: readonly (typeof PROJECT_TYPE)[] }) => Promise<FileSystemFileHandle[]>;
}

/** A handle's permission calls, also missing from TypeScript's DOM library. */
interface PermissionHandle {
    queryPermission?: (options: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (options: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
}

/**
 * The window's file pickers.
 * @returns the pickers this browser has.
 */
function pickers(): FileAccessWindow {
    return globalThis as unknown as FileAccessWindow;
}

/**
 * Whether this browser keeps file handles, so Save can write the same file again.
 * @returns true in Chromium.
 */
export function keepsFileHandles(): boolean {
    return typeof pickers().showSaveFilePicker === "function";
}

/**
 * The file name a project is saved under, suggested by the save picker. Temporary copy of
 * `downloadProject`'s naming rule (#919); use the element's once it exports one.
 * @param name - the project's name.
 * @returns `<name>.graphty.json`.
 */
function projectFileName(name: string): string {
    return `${name}.graphty.json`;
}

/**
 * Whether an error is the reader cancelling a picker.
 * @param error - what a picker threw.
 * @returns true for a cancel.
 */
export function isCancel(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Asks where to save (Save as...), where the browser keeps file handles.
 * @param name - the project's name, the suggested file name.
 * @returns the chosen file. Rejects with an AbortError when the reader cancels.
 */
export function chooseSaveFile(name: string): Promise<FileSystemFileHandle> {
    const { showSaveFilePicker } = pickers();
    if (showSaveFilePicker === undefined) {
        return Promise.reject(new Error("This browser keeps no file handles"));
    }
    return showSaveFilePicker({ suggestedName: projectFileName(name), types: [PROJECT_TYPE] });
}

/**
 * Writes a file's whole text.
 * @param handle - the file.
 * @param text - its new text.
 */
export async function writeFile(handle: FileSystemFileHandle, text: string): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
}

/**
 * Reads a remembered file, asking the reader's permission again where the browser wants it. Must
 * run inside the click that asked for it, because asking for permission needs one.
 * @param handle - the file.
 * @returns the file, or null when the browser can no longer read it (moved, deleted, refused).
 */
export async function readHandle(handle: FileSystemFileHandle): Promise<File | null> {
    const permission = handle as unknown as PermissionHandle;
    try {
        const state = (await permission.queryPermission?.({ mode: "readwrite" })) ?? "granted";
        if (state !== "granted" && (await permission.requestPermission?.({ mode: "readwrite" })) !== "granted") {
            return null;
        }
        return await handle.getFile();
    } catch {
        return null;
    }
}

/**
 * Asks the reader for a project file (Locate...): the file picker that keeps a handle where the
 * browser has one, else a plain file input.
 * @returns the file and, where the browser keeps them, its handle; undefined when cancelled.
 */
export async function locateFile(): Promise<{ file: File; handle?: FileSystemFileHandle } | undefined> {
    const { showOpenFilePicker } = pickers();
    if (showOpenFilePicker !== undefined) {
        try {
            const [handle] = await showOpenFilePicker({ types: [PROJECT_TYPE] });
            return { file: await handle.getFile(), handle };
        } catch (error) {
            if (isCancel(error)) {
                return undefined;
            }
            throw error;
        }
    }
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            resolve(file === undefined ? undefined : { file });
        });
        input.addEventListener("cancel", () => {
            resolve(undefined);
        });
        input.click();
    });
}
