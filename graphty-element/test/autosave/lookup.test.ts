/**
 * listAutosaves and removeAutosave: the work kept under a key, read and deleted without an
 * element, for a page that offers it before it shows a graph.
 */

import { assert, describe, it } from "vitest";

import { memoryAutosaveStore } from "../../extend";
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
});
