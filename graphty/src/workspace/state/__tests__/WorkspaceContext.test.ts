import { GraphtyError } from "@graphty/graphty-element/session";
import { assert, describe, it, vi } from "vitest";

import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../store";
import { makeWorkspaceValue } from "../WorkspaceContext";

/** The element's own message, which the notice never shows (#5574). */
const MESSAGE = "ELEMENT MESSAGE FOR DEBUGGING";

const registry = createRegistry([
    {
        owner: "test",
        commands: [
            {
                id: "test.fail",
                label: "Fail",
                group: "Project",
                run: () => Promise.reject(new Error(MESSAGE)),
            },
            {
                id: "test.refused",
                label: "Lock",
                group: "Project",
                run: () => Promise.reject(new GraphtyError({ code: "E_LOCKED", message: MESSAGE, source: "style" })),
            },
        ],
    },
]);

describe("running a workspace command", () => {
    it("puts up a notice when an async command fails, instead of leaving the rejection unhandled", async () => {
        const store = createWorkspaceStore();
        makeWorkspaceValue(store, registry, null, null).run("test.fail");
        await vi.waitFor(() => {
            assert.strictEqual(store.get().notice?.message, "Fail failed.");
        });
    });

    it("words an element refusal from its code, never the element's message (#5574)", async () => {
        const store = createWorkspaceStore();
        makeWorkspaceValue(store, registry, null, null).run("test.refused");
        await vi.waitFor(() => {
            assert.strictEqual(store.get().notice?.message, "Lock failed: its layer is locked.");
        });
    });
});
