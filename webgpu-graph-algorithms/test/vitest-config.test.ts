/**
 * vitest.config.ts: which runs go one file at a time.
 *
 * The config decides the root `fileParallelism` from the projects named on the command line. The device-error files
 * and the multi-gigabyte limit files must each run serially; the main `node` project must not. The `node-gpu-alone`
 * project (issue #1884) runs serially through its own per-project setting, after the `node` project. The config
 * reads process.argv when it is evaluated, so each case sets the argument list and imports a fresh copy.
 */
import type { ViteUserConfig } from "vitest/config";

/**
 * Evaluates vitest.config.ts as if vitest had been started with the given arguments.
 * @param args - the command-line arguments after `vitest run`
 * @returns the config
 */
async function configFor(args: readonly string[]): Promise<ViteUserConfig> {
    const saved = process.argv;
    process.argv = [saved[0] ?? "node", "vitest", "run", ...args];
    try {
        vi.resetModules();
        // A computed specifier: the config sits outside tsconfig.json's file list, so tsc must not follow it.
        const mod = (await import(new URL("../vitest.config.ts", import.meta.url).href)) as { default: ViteUserConfig };
        return mod.default;
    } finally {
        process.argv = saved;
    }
}

/**
 * The root `fileParallelism` the config resolves for the given arguments.
 * @param args - the command-line arguments after `vitest run`
 * @returns the root `fileParallelism`
 */
async function rootFileParallelism(args: readonly string[]): Promise<boolean | undefined> {
    return (await configFor(args)).test?.fileParallelism;
}

/** The parts of a project's test options these cases read. */
interface ProjectTest {
    readonly name?: string;
    readonly include?: readonly string[];
    readonly exclude?: readonly string[];
    readonly fileParallelism?: boolean;
    readonly sequence?: { readonly groupOrder?: number };
}

/**
 * One project's test options, by name.
 * @param config - the evaluated config
 * @param name - the project name
 * @returns its test options
 */
function projectTest(config: ViteUserConfig, name: string): ProjectTest {
    const projects = (config.test?.projects ?? []) as readonly { readonly test?: ProjectTest }[];
    const found = projects.find((p) => p.test?.name === name)?.test;
    if (found === undefined) {
        throw new Error(`no project ${name}`);
    }
    return found;
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

    it("runs the GPU-alone files after the node project, one at a time, without serialising the node project", async () => {
        const config = await configFor(["--project=node", "--project=node-gpu-alone"]);
        expect(config.test?.fileParallelism).toBeUndefined();
        const node = projectTest(config, "node");
        const alone = projectTest(config, "node-gpu-alone");
        expect(alone.fileParallelism).toBe(false);
        expect(alone.sequence?.groupOrder ?? 0).toBeGreaterThan(node.sequence?.groupOrder ?? 0);
        expect(alone.include).toContain("test/layouts/grid-exact.test.ts");
        for (const file of alone.include ?? []) {
            expect(node.exclude).toContain(file);
        }
    });
});
