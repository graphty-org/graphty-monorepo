/**
 * Loading the parts of the package that are fetched on first use (the generators and datasets, the file formats, the
 * WebGPU code), with a warning when one never arrives.
 */

/** How long a part may take to load before the call warns that it may never load. */
export const STALL_MS = 5000;

/**
 * A part of the package loaded on first use, warning on the console when it has not loaded after STALL_MS.
 *
 * In a Vite 6 or 7 (Rollup) production build, the part's chunk imports the chunk that holds the consumer's entry
 * module, because both use @graphty/graph-format and Rollup puts shared code in the chunk that loads first. When that
 * entry module awaits the call at its top level, the entry chunk is still evaluating, so the part can never run and
 * the await never settles. ES modules report nothing, and no package layout avoids it (the package's synchronous
 * methods need @graphty/graph-format up front), so the warning names the cause. A slow network shows it too; the
 * call then carries on.
 * @param load - the dynamic import
 * @param call - what is waiting, as the reader wrote it ("graphtyDataset")
 * @returns the import
 */
export function loadPart<T>(load: Promise<T>, call: string): Promise<T> {
    const timer = setTimeout(() => {
        console.warn(
            `graphty: ${call} has waited ${String(STALL_MS / 1000)} s for part of @graphty/cytoscape-extensions to load. ` +
                `If a module awaits ${call} at its top level, a Vite 6 or 7 production build never loads it: call it ` +
                "inside an async function, or with .then(), instead. On a slow network the call carries on.",
        );
    }, STALL_MS);
    const clear = (): void => {
        clearTimeout(timer);
    };
    load.then(clear, clear);
    return load;
}
