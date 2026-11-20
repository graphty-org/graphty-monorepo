/**
 * The documentation examples (docs/examples/*.ts, which the docs pages include) type-check and run, and every
 * `console.log(...)` line with a trailing `// comment` prints what the comment says. Each example is copied to
 * tmp/doc-examples/ with the package's own specifiers pointed at src/ (the `./node` and `./acquire` entries at
 * test/helpers/docs-node-entry.ts, which adds the lane's adapter) and imported, so an example that throws fails here.
 */

import { execFile } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { format, promisify } from "node:util";

import { requireGpu } from "./setup/gpu.js";

const PKG = resolve(__dirname, "..");
const DIR = join(PKG, "docs/examples");
const OUT = join(PKG, "tmp/doc-examples");
const EXAMPLES = readdirSync(DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort();
const execFileAsync = promisify(execFile);

/**
 * The example's source with the package's specifiers pointed at the sources under test.
 * @param source - the example as the docs show it
 * @returns the runnable source
 */
function pointAtSources(source: string): string {
    return source
        .replace(
            /"@graphty\/webgpu-graph-algorithms\/(node|acquire)"/g,
            JSON.stringify(join(PKG, "test/helpers/docs-node-entry.ts")),
        )
        .replace(/"@graphty\/webgpu-graph-algorithms"/g, JSON.stringify(join(PKG, "src/index.ts")));
}

/**
 * The text each commented `console.log` line must print, in order.
 * @param source - the example
 * @returns the expected prefixes
 */
function expectedLogs(source: string): string[] {
    return [...source.matchAll(/^\s*console\.log\(.*\);\s*\/\/ (.+)$/gm)].map((m) => m[1].trim());
}

describe("docs/examples", () => {
    beforeAll(() => {
        rmSync(OUT, { recursive: true, force: true });
        mkdirSync(OUT, { recursive: true });
    });

    it("type-check against the package's types", async () => {
        const tsc = join(PKG, "node_modules/typescript/bin/tsc");
        await execFileAsync(process.execPath, [tsc, "--noEmit", "-p", join(DIR, "tsconfig.json")]);
    });

    for (const name of EXAMPLES) {
        it(`${name} runs and prints what its comments say`, async (t) => {
            requireGpu(t);
            const source = readFileSync(join(DIR, name), "utf8");
            const file = join(OUT, name);
            writeFileSync(file, pointAtSources(source));
            const printed: string[] = [];
            const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
                printed.push(format(...args));
            });
            try {
                await import(file);
            } finally {
                spy.mockRestore();
            }
            const expected = expectedLogs(source);
            expect(printed.length).toBeGreaterThanOrEqual(expected.length);
            expected.forEach((want, i) => {
                expect(
                    printed[i].startsWith(want),
                    `line ${String(i + 1)}: printed "${printed[i]}", expected "${want}"`,
                ).toBe(true);
            });
        });
    }
});
