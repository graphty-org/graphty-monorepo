/**
 * vitest.config.ts: which runs go one file at a time.
 *
 * `fileParallelism` only takes effect at the root of the config, so the config decides it from the projects named
 * on the command line. The device-error files and the multi-gigabyte limit files must each run serially; the main
 * `node` project must not. The config reads process.argv when it is evaluated, so each case sets the argument list
 * and imports a fresh copy.
 */
import type { ViteUserConfig } from "vitest/config";

/**
 * Evaluates vitest.config.ts as if vitest had been started with the given arguments.
 * @param args - the command-line arguments after `vitest run`
 * @returns the root `fileParallelism` the config resolved
 */
async function rootFileParallelism(args: readonly string[]): Promise<boolean | undefined> {
    const saved = process.argv;
    process.argv = [saved[0] ?? "node", "vitest", "run", ...args];
    try {
        vi.resetModules();
        // A computed specifier: the config sits outside tsconfig.json's file list, so tsc must not follow it.
        const mod = (await import(new URL("../vitest.config.ts", import.meta.url).href)) as { default: ViteUserConfig };
        return mod.default.test?.fileParallelism;
    } finally {
        process.argv = saved;
    }
}

describe("vitest.config.ts root fileParallelism", () => {
    it("leaves the node project parallel", async () => {
        expect(await rootFileParallelism(["--project=node"])).toBeUndefined();
    });

    it("runs the device-error project one file at a time", async () => {
        expect(await rootFileParallelism(["--project=node-device-errors"])).toBe(false);
    });

    it("runs the limits project one file at a time, in either argument spelling", async () => {
        expect(await rootFileParallelism(["--project=node-limits"])).toBe(false);
        expect(await rootFileParallelism(["--project", "node-limits"])).toBe(false);
    });
});
