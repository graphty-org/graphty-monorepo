/**
 * An `AutosaveStore` that keeps everything in memory: for tests, for a page that wants autosave's
 * bookkeeping without persistence, and as the reference a custom store is compared against.
 * @module autosave
 */

import {
    autosaveAbortError,
    type AutosaveCommitOptions,
    AutosaveConflict,
    type AutosaveEntryMeta,
    type AutosaveParts,
    type AutosaveStore,
    type AutosaveWrite,
} from "./types";

interface StoredEntry {
    meta: AutosaveEntryMeta;
    parts: Map<string, string | Uint8Array>;
}

/**
 * Copies a part value, so a caller that later changes its bytes does not change the store.
 * @param value - the value
 * @returns a copy (text is immutable and returned as is)
 */
function copyValue(value: string | Uint8Array): string | Uint8Array {
    return typeof value === "string" ? value : value.slice();
}

/**
 * Creates an `AutosaveStore` that keeps entries in memory only. Its contents last as long as the
 * object; nothing survives a reload.
 * @returns a new, empty store
 */
export function memoryAutosaveStore(): AutosaveStore {
    const entries = new Map<string, StoredEntry>();
    // ponytail: per-key counters only ever grow, so a removed entry's seq is never reused.
    const lastSeq = new Map<string, number>();

    return {
        list(key: string): Promise<readonly AutosaveEntryMeta[]> {
            const metas = [...entries.values()]
                .filter((e) => e.meta.key === key)
                .map((e) => structuredClone(e.meta))
                .sort((a, b) => a.seq - b.seq);
            return Promise.resolve(metas);
        },

        read(id: string): Promise<{ meta: AutosaveEntryMeta; parts: AutosaveParts } | undefined> {
            const entry = entries.get(id);
            if (entry === undefined) {
                return Promise.resolve(undefined);
            }

            const parts: Record<string, string | Uint8Array> = {};
            for (const [name, value] of entry.parts) {
                parts[name] = copyValue(value);
            }
            return Promise.resolve({ meta: structuredClone(entry.meta), parts });
        },

        commit(writes: readonly AutosaveWrite[], options?: AutosaveCommitOptions): Promise<void> {
            if (options?.signal?.aborted === true) {
                return Promise.reject(autosaveAbortError());
            }

            // Check every fence before changing anything, so the commit is all or nothing.
            for (const write of writes) {
                const storedGen = entries.get(write.id)?.meta.gen ?? 0;
                if (storedGen !== write.expectedGen) {
                    return Promise.reject(new AutosaveConflict(write.id, write.expectedGen, storedGen));
                }
            }

            // Build every new record first: a meta that cannot be cloned throws here, before anything changed.
            const seqs = new Map(lastSeq);
            let next: [string, StoredEntry][];
            try {
                next = writes.map((write) => {
                    const seq = (seqs.get(write.meta.key) ?? 0) + 1;
                    seqs.set(write.meta.key, seq);
                    const parts = new Map(entries.get(write.id)?.parts);
                    for (const [name, value] of Object.entries(write.parts)) {
                        if (value === null) {
                            parts.delete(name);
                        } else {
                            parts.set(name, copyValue(value));
                        }
                    }
                    const meta = { ...structuredClone(write.meta), id: write.id, gen: write.expectedGen + 1, seq };
                    return [write.id, { meta, parts }];
                });
            } catch (error) {
                return Promise.reject(error instanceof Error ? error : new Error(String(error)));
            }

            for (const [id, entry] of next) {
                entries.set(id, entry);
            }
            for (const [key, seq] of seqs) {
                lastSeq.set(key, seq);
            }
            return Promise.resolve();
        },

        remove(id: string): Promise<void> {
            entries.delete(id);
            return Promise.resolve();
        },
    };
}
