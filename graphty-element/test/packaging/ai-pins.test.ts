/**
 * The AI frameworks graphty-element builds into its own chunks run exactly the versions the
 * contract suite and the paid regression run tested: every direct TanStack AI or provider SDK
 * devDependency is pinned to one version, and every override scoped to the TanStack chain
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

/**
 * Direct devDependencies that need no exact pin yet, with the reason. The AI SDK goes when the
 * TanStack engine replaces it (milestone 2), and this list with it.
 */
const PIN_EXEMPT: Readonly<Record<string, string>> = {
    ai: "the AI SDK 5, removed with milestone 2",
    "@ai-sdk/anthropic": "the AI SDK 5, removed with milestone 2",
    "@ai-sdk/google": "the AI SDK 5, removed with milestone 2",
    "@ai-sdk/openai": "the AI SDK 5, removed with milestone 2",
    "@mlc-ai/web-llm": "an optional peer the consumer installs, never built in",
};

/**
 * Everything wrong with the pins.
 * @param devDependencies - graphty-element's devDependencies.
 * @param overrides - The workspace's overrides, key -> version.
 * @param dependentRange - The range a package declares for one of its dependencies, or undefined.
 * @returns One message per problem.
 */
function pinProblems(
    devDependencies: Readonly<Record<string, string>>,
    overrides: Readonly<Record<string, string>>,
    dependentRange: (dependent: string, dependency: string) => string | undefined,
): string[] {
    const problems: string[] = [];
    for (const [name, range] of Object.entries(devDependencies)) {
        if (frameworkFamily(name) !== undefined && !(name in PIN_EXEMPT) && !EXACT.test(range)) {
            problems.push(`devDependency ${name} is "${range}", not one exact version`);
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

describe("AI framework pins", () => {
    it("pins every TanStack and provider devDependency, and every scoped override fits its dependent", () => {
        const { devDependencies } = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")) as {
            devDependencies: Record<string, string>;
        };
        assert.deepEqual(pinProblems(devDependencies, workspaceOverrides(), installedRange), []);
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
            { "@tanstack/ai": "^0.68.0", "@tanstack/ai-openai": "0.29.1", openai: "~7.32.0", lit: "^3.0.0" },
            {
                "@tanstack/ai-openai>openai": "7.32.0",
                "@tanstack/ai-gemini>@google/genai": "2.28.0",
                "@tanstack/ai-anthropic>@anthropic-ai/sdk": "^0.97.1",
                "lodash@<4.18.0": "^4.18.0",
            },
            (dependent, dependency) => ranges[`${dependent} ${dependency}`],
        );
        assert.deepEqual(problems, [
            'devDependency @tanstack/ai is "^0.68.0", not one exact version',
            'devDependency openai is "~7.32.0", not one exact version',
            'override @tanstack/ai-openai>openai: 7.32.0 is outside the range @tanstack/ai-openai declares, "^6.0.0"',
            'override @tanstack/ai-anthropic>@anthropic-ai/sdk is "^0.97.1", not one exact version',
        ]);
    });
});
