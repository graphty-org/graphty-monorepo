/**
 * The fidelity harness's readJson: a missing file is "none", but a path the browser may not read is an error. A baseline
 * run outside the worktree (GRAPHTY_ORACLE_BASELINE) was refused by Vitest, read as "no baseline", and every newly
 * failing element came out "unclassified" (#4270).
 */
import { assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import { readJson } from "../fidelity/mount";

describe("fidelity readJson", () => {
    it("reads a file and returns null for a missing one", async () => {
        await commands.writeFile("tmp/read-json-probe/present.json", '{"a":1}');
        assert.deepEqual(await readJson("tmp/read-json-probe/present.json"), { a: 1 });
        assert.strictEqual(await readJson("tmp/read-json-probe/missing.json"), null);
    });

    it("throws for a path the browser may not read, never returning null", async () => {
        let error: unknown = null;
        try {
            await readJson("/etc/hostname");
        } catch (e) {
            error = e;
        }
        assert.match(String(error), /cannot read \/etc\/hostname/);
    });
});
