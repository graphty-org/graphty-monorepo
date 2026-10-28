import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { erdosRenyiGraph } from "../src/generators/index.js";
import { graphHash } from "./helpers/graph.js";

const root = path.resolve(import.meta.dirname, "..");
const DATASET_DIRS = readdirSync(path.join(root, "src/datasets"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

interface PackageJsonShape {
    name: string;
    version: string;
    private: boolean;
    type: string;
    sideEffects: boolean;
    exports: Record<string, Record<string, string>>;
    files: string[];
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
}

const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as PackageJsonShape;

describe("package.json", () => {
    it("publishes an ESM package with a root, a generators subpath and one subpath per dataset", () => {
        expect(packageJson.name).toBe("@graphty/graph-samples");
        expect(packageJson.private).toBe(false);
        expect(packageJson.type).toBe("module");
        expect(packageJson.sideEffects).toBe(false);
        expect(Object.keys(packageJson.exports)).toEqual([".", "./generators", "./datasets/*"]);
        for (const entry of Object.values(packageJson.exports)) {
            expect(Object.keys(entry)[0]).toBe("types");
        }
        expect(packageJson.exports["./datasets/*"].import).toBe("./dist/datasets/*.js");
        expect(packageJson.files).toEqual(expect.arrayContaining(["dist/", "src/", "README.md", "LICENSE", "NOTICE"]));
        // no dataset's data ships: the packed files under dist/data/ are for graphty.app, data/ is not listed
        expect(packageJson.files).toContain("!dist/data/");
        expect(packageJson.files).not.toContain("data/");
    });

    it("depends on graph-format as both a dependency and a peer", () => {
        expect(packageJson.dependencies["@graphty/graph-format"]).toBe("workspace:^");
        expect(packageJson.peerDependencies["@graphty/graph-format"]).toMatch(/^\^\d+\.\d+\.\d+$/);
    });
});

describe("plain ASCII", () => {
    it("every source, test, script and document of the package is ASCII", () => {
        const offenders: string[] = [];
        const walk = (dir: string): void => {
            for (const name of readdirSync(dir)) {
                const file = path.join(dir, name);
                if (statSync(file).isDirectory()) {
                    walk(file);
                } else if (/[\u0080-\uffff]/.test(readFileSync(file, "utf8"))) {
                    offenders.push(path.relative(root, file));
                }
            }
        };
        for (const dir of ["src", "data", "test", "scripts"]) {
            walk(path.join(root, dir));
        }
        for (const file of ["NOTICE", "README.md", "CLAUDE.md", "package.json"]) {
            if (/[\u0080-\uffff]/.test(readFileSync(path.join(root, file), "utf8"))) {
                offenders.push(file);
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe.runIf(existsSync(path.join(root, "dist/graph-samples.js")))("the built bundle", () => {
    it("has a module and a declaration shim for every entry", () => {
        for (const name of ["graph-samples", "generators", ...DATASET_DIRS.map((d) => `datasets/${d}`)]) {
            expect(existsSync(path.join(root, `dist/${name}.js`)), name).toBe(true);
            expect(existsSync(path.join(root, `dist/${name}.d.ts`)), name).toBe(true);
        }
    });

    it("produces the same graphs as the source", async () => {
        const url = (file: string): string => pathToFileURL(path.join(root, file)).href;
        const generators = (await import(url("dist/generators.js"))) as { erdosRenyiGraph: typeof erdosRenyiGraph };
        const options = { n: 500, p: 0.02, seed: 12 };
        expect(graphHash(generators.erdosRenyiGraph(options))).toBe(graphHash(erdosRenyiGraph(options)));
        const karate = (await import(url("dist/datasets/karate.js"))) as {
            karate: (options: { fetch: typeof fetch }) => Promise<GraphSnapshot>;
        };
        const body = readFileSync(path.join(root, "dist/data/v1/karate.gsnp.gz"));
        const snapshot = await karate.karate({ fetch: () => Promise.resolve(new Response(body)) });
        expect(snapshot.edgeCount).toBe(78);
    });
});
