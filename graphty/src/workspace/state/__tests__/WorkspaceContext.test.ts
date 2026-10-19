import { assert, describe, it } from "vitest";

import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../store";
import { makeWorkspaceValue } from "../WorkspaceContext";

describe("running a workspace command", () => {
    it("puts up a notice when an async command fails, instead of leaving the rejection unhandled", async () => {
        const store = createWorkspaceStore();
        const registry = createRegistry([
            {
                owner: "test",
                commands: [
                    {
                        id: "test.fail",
                        label: "Fail",
                        group: "Project",
                        run: () => Promise.reject(new Error("boom")),
                    },
                ],
            },
        ]);
        makeWorkspaceValue(store, registry, null, null).run("test.fail");
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.strictEqual(store.get().notice?.message, "Fail failed: boom");
    });
});
