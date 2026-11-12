/**
 * The AI frameworks graphty-element builds into its own chunks run exactly the versions the
 * contract suite and the paid regression run tested: every direct TanStack AI or provider SDK
 * devDependency or optional dependency is pinned to one version, none is a dependency (they are
 * built into graphty-element's own chunks, never installed for consumers), and every override scoped to the TanStack chain
 * (`"@tanstack/ai-openai>openai": "7.32.0"` in pnpm-workspace.yaml) is a version its dependent
 * accepts (design/ai/tanstack-ai-harness-design.md, section 3.1 and section 7, rule 7).
 * @module test/packaging/ai-pins.test
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { frameworkFamily } from "../../../tools/ai-framework-packages.mjs";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const REPO_ROOT = resolve(PACKAGE_ROOT, "..");
// The repository's own tools resolve semver from the root, which declares it.
const semver = createRequire(join(REPO_ROOT, "package.json"))("semver") as {
    satisfies(version: string, range: string): boolean;
};

const EXACT = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

/** Direct devDependencies that need no exact pin, with the reason. */
const PIN_EXEMPT: Readonly<Record<string, string>> = {
    "@mlc-ai/web-llm": "an optional peer the consumer installs, never built in",
};

/** The dependency lists of a package.json the pins are read from. */
interface Manifest {
    readonly dependencies?: Readonly<Record<string, string>>;
    readonly devDependencies?: Readonly<Record<string, string>>;
    readonly optionalDependencies?: Readonly<Record<string, string>>;
}

/**
 * Everything wrong with the pins.
 * @param manifest - graphty-element's package.json.
 * @param overrides - The workspace's overrides, key -> version.
 * @param dependentRange - The range a package declares for one of its dependencies, or undefined.
 * @returns One message per problem.
 */
function pinProblems(
    manifest: Manifest,
    overrides: Readonly<Record<string, string>>,
    dependentRange: (dependent: string, dependency: string) => string | undefined,
): string[] {
    const problems: string[] = [];
    for (const name of Object.keys(manifest.dependencies ?? {})) {
        if (frameworkFamily(name) !== undefined) {
            problems.push(`dependency ${name} would be installed for every consumer: build it in, as a devDependency`);
        }
    }

    for (const [list, label] of [
        [manifest.devDependencies, "devDependency"],
        [manifest.optionalDependencies, "optionalDependency"],
    ] as const) {
        for (const [name, range] of Object.entries(list ?? {})) {
            if (frameworkFamily(name) !== undefined && !(name in PIN_EXEMPT) && !EXACT.test(range)) {
                problems.push(`${label} ${name} is "${range}", not one exact version`);
            }
        }
    }

    for (const [key, version] of Object.entries(overrides)) {
        const chain = key.split(">");
        if (chain.length < 2 || !chain.some((name) => frameworkFamily(name) !== undefined)) {
            continue;
        }
        const dependency = chain.at(-1) as string;
        const dependent = chain.at(-2) as string;
        if (!EXACT.test(version)) {
            problems.push(`override ${key} is "${version}", not one exact version`);
            continue;
        }

        const range = dependentRange(dependent, dependency);
        if (range === undefined) {
            problems.push(`override ${key}: ${dependent} is not installed or does not depend on ${dependency}`);
        } else if (!semver.satisfies(version, range)) {
            problems.push(`override ${key}: ${version} is outside the range ${dependent} declares, "${range}"`);
        }
    }

    return problems;
}

/**
 * Every framework package the built-in ones reach that its dependent leaves open (a range, not one
 * version) with no exact override for it, scoped (`dependent>dependency`) or not: a lockfile
 * refresh could move what ships.
 * @param roots - The built-in framework packages, graphty-element's own pins.
 * @param overrides - The workspace's overrides, key -> version.
 * @param dependenciesOf - An installed package's dependencies, or undefined when it is not installed.
 * @returns One message per open edge.
 */
function closureProblems(
    roots: readonly string[],
    overrides: Readonly<Record<string, string>>,
    dependenciesOf: (name: string) => Readonly<Record<string, string>> | undefined,
): string[] {
    const problems: string[] = [];
    const seen = new Set<string>();
    const queue = [...roots];
    for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
        if (seen.has(name)) {
            continue;
        }

        seen.add(name);
        for (const [dependency, range] of Object.entries(dependenciesOf(name) ?? {})) {
            if (frameworkFamily(dependency) === undefined) {
                continue;
            }

            const pinned = [range, overrides[`${name}>${dependency}`], overrides[dependency]].some(
                (version) => version !== undefined && EXACT.test(version),
            );
            if (!pinned) {
                problems.push(`${name} > ${dependency} is "${range}" with no exact override`);
            }

            queue.push(dependency);
        }
    }

    return problems;
}

/**
 * The workspace's overrides, from pnpm-workspace.yaml's `overrides:` block.
 * @returns key -> version
 */
function workspaceOverrides(): Record<string, string> {
    const text = readFileSync(join(REPO_ROOT, "pnpm-workspace.yaml"), "utf8");
    const block = /^overrides:\n((?:[ \t]+.*\n|\n)*)/m.exec(text)?.[1] ?? "";
    return Object.fromEntries(
        [...block.matchAll(/^[ \t]+["']?([^"'#\n]+?)["']?:[ \t]*["']?([^"'\s#]+)["']?/gm)].map((m) => [m[1], m[2]]),
    );
}

/**
 * The range an installed package declares for one of its dependencies.
 * @param dependent - The installed package.
 * @param dependency - Its dependency.
 * @returns The range, or undefined when it is not installed or does not declare it.
 */
function installedRange(dependent: string, dependency: string): string | undefined {
    const store = join(REPO_ROOT, "node_modules/.pnpm");
    const prefix = `${dependent.replace("/", "+")}@`;
    for (const entry of existsSync(store) ? readdirSync(store).filter((e) => e.startsWith(prefix)) : []) {
        const manifest = JSON.parse(
            readFileSync(join(store, entry, "node_modules", dependent, "package.json"), "utf8"),
        ) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        };
        const range = manifest.dependencies?.[dependency] ?? manifest.peerDependencies?.[dependency];
        if (range !== undefined) {
            return range;
        }
    }

    return undefined;
}

/**
 * An installed package's dependencies (the first version the store holds).
 * @param name - The package.
 * @returns Its dependencies, or undefined when it is not installed.
 */
function installedDependencies(name: string): Record<string, string> | undefined {
    const store = join(REPO_ROOT, "node_modules/.pnpm");
    const prefix = `${name.replace("/", "+")}@`;
    const entry = existsSync(store) ? readdirSync(store).find((e) => e.startsWith(prefix)) : undefined;
    if (entry === undefined) {
        return undefined;
    }

    const manifest = JSON.parse(readFileSync(join(store, entry, "node_modules", name, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
    };
    return manifest.dependencies ?? {};
}

describe("AI framework pins", () => {
    it("pins every TanStack and provider package, and every scoped override fits its dependent", () => {
        const manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")) as Manifest;
        assert.deepEqual(pinProblems(manifest, workspaceOverrides(), installedRange), []);
    });

    it("pins every TanStack and provider package the built-in ones pull in", () => {
        const manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")) as Manifest;
        const roots = Object.keys(manifest.devDependencies ?? {}).filter(
            (name) => frameworkFamily(name) !== undefined && !(name in PIN_EXEMPT),
        );
        assert.isAbove(roots.length, 0);
        assert.deepEqual(closureProblems(roots, workspaceOverrides(), installedDependencies), []);
    });

    it("refuses an open edge in the closure, and takes a scoped or a global pin", () => {
        const graph: Record<string, Record<string, string>> = {
            "@tanstack/ai": { "@tanstack/ai-utils": "^0.4.1", "@ag-ui/core": "1.0.0", "partial-json": "^0.1.7" },
            "@tanstack/ai-openai": { "@tanstack/openai-base": "^0.13.1", "@tanstack/ai-utils": "^0.4.1" },
            "@tanstack/openai-base": { openai: "^7.30.0" },
        };
        assert.deepEqual(
            closureProblems(
                ["@tanstack/ai", "@tanstack/ai-openai"],
                { "@tanstack/ai-utils": "0.4.1" },
                (n) => graph[n],
            ),
            [
                '@tanstack/ai-openai > @tanstack/openai-base is "^0.13.1" with no exact override',
                '@tanstack/openai-base > openai is "^7.30.0" with no exact override',
            ],
        );
        assert.deepEqual(
            closureProblems(
                ["@tanstack/ai-openai"],
                { "@tanstack/ai-openai>@tanstack/openai-base": "0.13.1", "@tanstack/openai-base>openai": "7.32.0" },
                (n) => graph[n],
            ),
            ['@tanstack/ai-openai > @tanstack/ai-utils is "^0.4.1" with no exact override'],
        );
    });

    it("reads the workspace's overrides", () => {
        assert.ok(Object.keys(workspaceOverrides()).length > 0);
    });

    it("refuses each planted violation", () => {
        const ranges: Record<string, string> = {
            "@tanstack/ai-openai openai": "^6.0.0",
            "@tanstack/ai-gemini @google/genai": "^2.0.0",
        };
        const problems = pinProblems(
            {
                dependencies: { "@tanstack/ai-gemini": "0.12.0", zod: "^4.6.5" },
                devDependencies: { "@tanstack/ai": "^0.68.0", "@tanstack/ai-openai": "0.29.1", lit: "^3.0.0" },
                optionalDependencies: { openai: "~7.32.0" },
            },
            {
                "@tanstack/ai-openai>openai": "7.32.0",
                "@tanstack/ai-gemini>@google/genai": "2.28.0",
                "@tanstack/ai-anthropic>@anthropic-ai/sdk": "^0.97.1",
                "lodash@<4.18.0": "^4.18.0",
            },
            (dependent, dependency) => ranges[`${dependent} ${dependency}`],
        );
        assert.deepEqual(problems, [
            "dependency @tanstack/ai-gemini would be installed for every consumer: build it in, as a devDependency",
            'devDependency @tanstack/ai is "^0.68.0", not one exact version',
            'optionalDependency openai is "~7.32.0", not one exact version',
            'override @tanstack/ai-openai>openai: 7.32.0 is outside the range @tanstack/ai-openai declares, "^6.0.0"',
            'override @tanstack/ai-anthropic>@anthropic-ai/sdk is "^0.97.1", not one exact version',
        ]);
    });
});
