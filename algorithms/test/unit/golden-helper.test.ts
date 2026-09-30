/**
 * `legacyResult()` replays golden records by test name and call position, so two ways of reading
 * the wrong record must fail the run instead of passing: two tests sharing a name, and a record a
 * full passing run never reads (a dropped fixture or a renamed test). The broken suites live in
 * `test/helpers/golden-cases/` and run in a child vitest, since they are meant to fail.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("golden records", () => {
    it("fail a second test of the same name and a record no test reads", () => {
        const run = spawnSync(
            join(pkg, "node_modules/.bin/vitest"),
            ["run", "-c", "test/helpers/golden-cases/vitest.config.ts", "--reporter=json"],
            { cwd: pkg, encoding: "utf8" },
        );
        const report = JSON.parse(run.stdout.slice(run.stdout.indexOf("{"))) as {
            testResults: {
                name: string;
                message: string;
                assertionResults: { status: string; failureMessages: string[] }[];
            }[];
        };
        const file = (name: string) => report.testResults.find((f) => f.name.endsWith(name));
        const duplicate = file("duplicate-names.test.ts");
        expect(duplicate?.assertionResults.map((a) => a.status)).toEqual(["passed", "failed"]);
        expect(duplicate?.assertionResults[1].failureMessages.join("")).toContain(
            'two tests are named "shares a name"',
        );
        const unread = file("unread-record.test.ts");
        expect(unread?.assertionResults.map((a) => a.status)).toEqual(["passed"]);
        expect(unread?.message).toContain("1 records no test read, first reads one record #1");
    });
});
