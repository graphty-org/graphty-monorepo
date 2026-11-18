/**
 * listAutosaves and removeAutosave: the work kept under a key, read and deleted without an
 * element, for a page that offers it before it shows a graph.
 */

import { assert, describe, it, vi } from "vitest";

import { memoryAutosaveStore } from "../../extend";
import { LIST_TIMEOUT_MS } from "../../src/autosave/Autosaver";
import { listAutosaves, removeAutosave } from "../../src/autosave/elementAutosave";
import { isGraphtyError } from "../../src/errors/GraphtyError";
import { write } from "./store-contract";

describe("listAutosaves and removeAutosave", () => {
    it("lists a key's entries as autosaver.list() describes them, and deletes one", async () => {
        const store = memoryAutosaveStore();
        await store.commit([
            write("a", "k", 0, { rest: "a" }, { name: "Org chart", nodes: 3, edges: 2, dirty: true }),
            write("b", "other", 0, { rest: "b" }),
        ]);

        const entries = await listAutosaves("k", { store });
        assert.deepEqual(
            entries.map(({ id, name, nodes, edges, dirty, live }) => ({ id, name, nodes, edges, dirty, live })),
            [{ id: "a", name: "Org chart", nodes: 3, edges: 2, dirty: true, live: false }],
        );

        await removeAutosave("k", "a", { store });
        assert.deepEqual(await listAutosaves("k", { store }), []);
        assert.strictEqual((await listAutosaves("other", { store })).length, 1);
    });

    it("refuses an entry the key does not hold", async () => {
        const store = memoryAutosaveStore();
        await store.commit([write("b", "other", 0, { rest: "b" })]);
        const error: unknown = await removeAutosave("k", "b", { store }).then(
            () => null,
            (reason: unknown) => reason,
        );
        assert.isTrue(isGraphtyError(error) && error.code === "E_AUTOSAVE_UNKNOWN_ENTRY");
    });

    it("refuses with E_AUTOSAVE_STALLED when the store never answers, as behind another tab's unfinished write", async () => {
        vi.useFakeTimers();
        try {
            // Another tab holds a read-write transaction and is suspended: this read is queued behind it.
            const store = { ...memoryAutosaveStore(), list: () => new Promise<never>(() => undefined) };
            const outcome: { settled: unknown } = { settled: null };
            // Read through a call: the assertion below narrows the field to null for the compiler.
            const settledNow = (): unknown => outcome.settled;
            void listAutosaves("k", { store }).then(
                (entries) => {
                    outcome.settled = entries;
                },
                (reason: unknown) => {
                    outcome.settled = reason;
                },
            );
            await vi.advanceTimersByTimeAsync(LIST_TIMEOUT_MS - 1);
            assert.isNull(outcome.settled, "still waiting before the bound");
            await vi.advanceTimersByTimeAsync(1);
            const settled = settledNow();
            // Never an empty list: that says nothing is kept, and a page would open again work
            // another tab is writing.
            assert.isTrue(isGraphtyError(settled) && settled.code === "E_AUTOSAVE_STALLED", String(settled));
            assert.deepEqual(isGraphtyError(settled) ? settled.details : null, {
                afterMs: LIST_TIMEOUT_MS,
                step: "list",
            });
        } finally {
            vi.useRealTimers();
        }
    });
});
