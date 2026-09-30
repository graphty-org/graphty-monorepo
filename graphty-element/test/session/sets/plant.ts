/**
 * @file Put records into the sets slice past the doors' refusals, as a stored slice being loaded
 * does: a cycle, a vendor's opaque definition, an unknown top-level field. The slice is written
 * as a new baseline (the history so far is dropped, as a load's is), the ids are issued, and the
 * change is told the way a write's is, so what watches the sets follows.
 */

import type { SetsStore } from "../../../src/session/sets/store";
import type { ElementSet } from "../../../src/session/sets/types";

/**
 * Write records into the slice as the baseline.
 * @param store - The store.
 * @param records - The records; each replaces the live one with its id.
 */
export function plant(store: SetsStore, ...records: ElementSet[]): void {
    const { dispatcher } = store;
    dispatcher.clear();
    dispatcher.seed((draft) => {
        for (const record of records) {
            draft.sets.set(record.id, record);
        }
    });
    for (const record of records) {
        store.written(record);
        store.issue(record.id);
    }

    dispatcher.events.project?.({ slices: ["sets"], cause: "command" });
}
