/**
 * The open selection workspace is cleared only on a real close: an editor remounted under the same
 * key (a development hot swap, issue #9982) leaves it open.
 */

import { assert, describe, it } from "vitest";

import { createWorkspaceStore } from "../../state/store";
import { holdOpenWorkspace } from "../openWorkspace";

const KEY = "selector:layer-1:node";

describe("holdOpenWorkspace", () => {
    it("keeps the workspace open across a remount and clears it when the last editor goes", async () => {
        const store = createWorkspaceStore();
        store.set({ selectionWorkspace: { owner: KEY, host: "selector" } });
        let closes = 0;
        const onClose = (): void => {
            closes += 1;
        };
        const departing = holdOpenWorkspace(store, KEY, onClose);
        const remounted = holdOpenWorkspace(store, KEY, onClose);
        departing();
        await Promise.resolve();
        assert.strictEqual(store.get().selectionWorkspace?.owner, KEY, "a remount leaves it open");
        assert.strictEqual(closes, 0);

        remounted();
        await Promise.resolve();
        assert.isNull(store.get().selectionWorkspace, "the last editor going closes it");
        assert.strictEqual(closes, 1);
    });

    it("leaves another editor's open workspace alone", async () => {
        const store = createWorkspaceStore();
        store.set({ selectionWorkspace: { owner: "filter:c1:node", host: "filter" } });
        holdOpenWorkspace(store, KEY, () => undefined)();
        await Promise.resolve();
        assert.strictEqual(store.get().selectionWorkspace?.owner, "filter:c1:node");
    });
});
