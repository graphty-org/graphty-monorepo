/**
 * The browser's side of a project file: where the browser keeps file handles (the File System
 * Access API, Chromium), Recent projects reopens the file; elsewhere reopening asks for the file.
 * Nothing here reads what is in a file.
 */

import { PROJECT_FILE } from "@graphty/graphty-element/session";

/** The file type a project is saved as, for the pickers: graphty-element's project file. */
const PROJECT_TYPE = {
    description: "graphty project",
    accept: { [PROJECT_FILE.mediaType]: [PROJECT_FILE.extension] },
} as const;

/** The parts of the File System Access API this file uses, which TypeScript's DOM library lacks. */
interface FileAccessWindow {
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
 * Whether an error is the reader cancelling a picker.
 * @param error - what a picker threw.
 * @returns true for a cancel.
 */
function isCancel(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
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
