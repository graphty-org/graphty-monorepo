/** What a drop or a folder choice holds: every file, and each by its path when a folder came with it. */
export interface ReadFiles {
    /** Every file. */
    readonly files: File[];
    /** Each file by its path from the folder ("kit/car.obj"); absent when no folder came. */
    readonly paths?: ReadonlyMap<string, File>;
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
 * What a drop holds, walking any dropped folder. Call it during the drop event: the browser empties
 * the transfer after.
 * @param transfer - the drop's data.
 * @returns the files, with every file by its path when a folder was dropped.
 */
export function readDrop(transfer: DataTransfer): Promise<ReadFiles> {
    const files = [...transfer.files];
    const entries = [...transfer.items].map((item) => item.webkitGetAsEntry());
    if (!entries.some((entry) => entry?.isDirectory === true)) {
        return Promise.resolve({ files });
    }
    const paths = new Map<string, File>();
    return Promise.all(entries.flatMap((entry) => (entry === null ? [] : [walk(entry, paths)]))).then(() => ({
        files: [...paths.values()],
        paths,
    }));
}

/**
 * The files of a folder chosen in the picker, by their paths (`webkitRelativePath`).
 * @param files - the chosen files.
 * @returns the files, with their paths when they came from a folder.
 */
export function chosenFiles(files: File[]): ReadFiles {
    return files.some((file) => file.webkitRelativePath !== "")
        ? { files, paths: new Map(files.map((file) => [file.webkitRelativePath || file.name, file])) }
        : { files };
}
