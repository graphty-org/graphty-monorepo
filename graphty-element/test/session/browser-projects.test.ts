/**
 * @file `browserProjects` from the Node-safe session entry: it imports in Node, touches nothing
 * until called, and refuses with `E_UNSUPPORTED` where there is no IndexedDB.
 */

import { assert, describe, it } from "vitest";

import { browserProjects, createGraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";

describe("browserProjects in Node", () => {
    it("refuses every storage method with E_UNSUPPORTED and says storage is not kept", async () => {
        const session = createGraphSession();
        for (const call of [
            () => browserProjects.list(),
            () => browserProjects.save(session),
            () => browserProjects.get("x"),
            () => browserProjects.remove("x"),
        ]) {
            const error: unknown = await call().then(
                () => null,
                (caught: unknown) => caught,
            );
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual((error as { code: string }).code, "E_UNSUPPORTED");
        }

        assert.isFalse(await browserProjects.persisted());
        assert.isFalse(session.project.dirty);
    });
});
