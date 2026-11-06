/**
 * A test that blocks its page is out of reach of every timer in that page: the file guard, in
 * vitest's own process, has to end the run and name the test (#5816). This is a real run in real
 * Chromium, so it lives where Chromium is installed, not with the Node-only tool tests.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assert, it } from "vitest";

const CONFIG = fileURLToPath(new URL("file-guard-fixture/guard.config.mjs", import.meta.url));

/**
 * Runs the fixture to its end.
 * @returns its exit code and output
 */
function runBlockedPage(): Promise<{ code: number | null; output: string }> {
    return new Promise((resolve) => {
        const child = spawn("pnpm", ["exec", "vitest", "run", "--config", CONFIG], {
            cwd: fileURLToPath(new URL("..", import.meta.url)),
            stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.on("close", (code) => {
            resolve({ code, output });
        });
    });
}

it("ends a run whose page is blocked, with a failure naming the test", async () => {
    const { code, output } = await runBlockedPage();
    assert.strictEqual(code, 1, output);
    assert.match(
        output,
        /\[HANG\] blocked\.fixture\.ts ran past the 15 s file guard; it had reached test: blocks the page/,
    );
});
