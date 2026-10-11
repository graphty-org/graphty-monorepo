#!/usr/bin/env node
/**
 * check-published-deps.mjs -- compare what each published package SHIPS with what it DECLARES.
 *
 * For every workspace package that is not private, this packs it with `pnpm pack` (so the
 * `files` list is applied and `workspace:` ranges are rewritten exactly as a publish would),
 * reads the bare import specifiers of every shipped .js/.cjs/.mjs and .d.ts file, and fails on:
 *
 *   1. an import that is neither a dependency nor a peer dependency
 *      (node builtins and the package's own name are exempt). In a .d.ts, an import of "x" is
 *      also satisfied by a declared "@types/x" (or "@types/scope__x" for "@scope/x"), which is
 *      where the types of a package such as `react` come from;
 *   2. a dependency or peer dependency that no shipped file imports. A `/// <reference types>`
 *      directive counts as an import, which is how a global-types package such as
 *      `@webgpu/types` earns its place;
 *   3. an internal `@graphty/*` range that the workspace version of that package does not satisfy
 *      -- a stale range installs a registry copy instead of the code in this repository;
 *   4. a shipped file that is test or tool configuration (vitest.config, .storybook, test and
 *      spec files, tsbuildinfo);
 *   5. the same name in both dependencies and peerDependencies, except `@graphty/graph-format`,
 *      where it is deliberate (design/graph-format/graph-format-design.md, the packaging rule:
 *      the dependency makes an install work, the wider peer lets an application share one copy);
 *   6. in graphty-element, a shipped .js or .d.ts that imports an AI framework or provider package
 *      (tools/ai-framework-packages.mjs), except what FRAMEWORK_IMPORTS_ALLOWED lists with its
 *      reason, and a shipped .d.ts that names its adapter folder (engine/tanstack):
 *      graphty-element keeps every framework behind its engine seam and builds the frameworks it
 *      uses into its own chunks (design/ai/tanstack-ai-harness-design.md, section 7, rule 1).
 *
 * Why this exists: @graphty/algorithms shipped `pupt` as a runtime dependency for several
 * releases (GitHub issue #1), graphty-element's WebGPU peer range fell four breaking releases
 * behind, and layout published its compiled vitest.config.js. None of those failed a build.
 *
 * Needs a build first: it packs whatever is in each package's dist/.
 * Usage: node tools/check-published-deps.mjs [package-dir ...]
 *        node tools/check-published-deps.mjs --self-test   plants one violation of each kind and
 *                                                           fails unless each is reported
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { builtinModules } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import semver from "semver";

import { frameworkFamily, packageName } from "./ai-framework-packages.mjs";
import { workspaceDirs } from "./workspace-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The one package allowed to appear in both dependencies and peerDependencies. */
const DEPENDENCY_AND_PEER_ALLOWED = new Set(["@graphty/graph-format"]);

/** Shipped paths that are test or tool configuration, never part of a published package. */
const FORBIDDEN_FILES = [
    /(^|\/)vitest\.config\./,
    /(^|\/)vite\.config\./,
    /(^|\/)\.storybook\//,
    /\.(test|spec)\.[cm]?[jt]sx?$/,
    /\.test-d\.ts$/,
    /\.tsbuildinfo$/,
];

/**
 * The packages whose shipped files are scanned for AI framework imports, each with the imports it
 * may still ship, by family and file, and the reason. Only graphty-element keeps frameworks behind
 * an engine seam; compact-mantine's TanStack Table is not an AI framework. TanStack AI and the
 * provider SDKs are built into graphty-element's own chunks, so no shipped file imports them.
 */
const FRAMEWORK_IMPORTS_ALLOWED = {
    "@graphty/graphty-element": [
        {
            family: "webllm",
            files: /\.js$/,
            reason: "WebLlmProvider loads the optional @mlc-ai/web-llm peer on first use: the in-browser engine",
        },
    ],
};

/**
 * Declared peer dependencies a package may keep although no shipped file imports them: removing a
 * peer is a breaking change, so it waits for the next major (tools/check-peer-deps-stable.mjs).
 */
const UNUSED_PEERS_ALLOWED = {
    // The AI SDK 5, which graphty-element no longer imports (its TanStack AI engine replaced it);
    // the peers stay declared, optional, until the next major.
    "@graphty/graphty-element": new Set(["ai", "@ai-sdk/anthropic", "@ai-sdk/google", "@ai-sdk/openai"]),
};

const builtins = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));

// Static imports and re-exports start at column 0 in both tsc and rollup output; anything
// indented is inside a string or a comment (graphty-element's bundle carries example code for
// its AI prompt as template strings). A `[^;]` body lets a multi-line `import {\n a,\n} from`
// match without running on into the next statement.
const IMPORT_PATTERNS = [
    /^(?:import|export)\s[^;]*?\sfrom\s*["']([^"'\n]+)["']/gm,
    /^import\s*["']([^"'\n]+)["']/gm,
    /\bimport\(\s*["']([^"'\n]+)["']\s*\)/g,
    /\brequire\(\s*["']([^"'\n]+)["']\s*\)/g,
    /^\/\/\/\s*<reference\s+types\s*=\s*["']([^"'\n]+)["']/gm,
];

const VALID_NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

function workspacePackages() {
    return workspaceDirs(root)
        .filter((d) => fs.existsSync(path.join(root, d, "package.json")))
        .map((d) => ({ dir: d, manifest: JSON.parse(fs.readFileSync(path.join(root, d, "package.json"), "utf8")) }));
}

function pack(dir, dest) {
    const before = new Set(fs.readdirSync(dest));
    execFileSync("pnpm", ["pack", "--pack-destination", dest], { cwd: path.join(root, dir), stdio: "pipe" });
    const tarball = fs.readdirSync(dest).find((f) => f.endsWith(".tgz") && !before.has(f));
    const out = path.join(dest, dir);
    fs.mkdirSync(out, { recursive: true });
    execFileSync("tar", ["-xzf", path.join(dest, tarball), "-C", out]);
    return path.join(out, "package");
}

/**
 * The AI framework imports one shipped file of a scanned package holds, and whether a declaration
 * names the adapter folder.
 * @param allowed - What the package may still ship, from FRAMEWORK_IMPORTS_ALLOWED.
 * @param file - The file, relative to the package.
 * @param text - Its contents.
 * @returns One message per problem.
 */
function frameworkProblems(allowed, file, text) {
    const problems = [];
    const declaration = /\.d\.[cm]?ts$/.test(file);
    if (declaration && (/(^|\/)engine\/tanstack\//.test(file) || /(?:engine\/|["']\.\/)tanstack\//.test(text))) {
        problems.push(`${file} names the AI adapter folder (engine/tanstack), which ships no declarations`);
    }
    const packages = new Set(
        IMPORT_PATTERNS.flatMap((re) => [...text.matchAll(re)].map((m) => m[1]))
            .filter((spec) => {
                const family = frameworkFamily(spec);
                return family !== undefined && !allowed.some((a) => a.family === family && a.files.test(file));
            })
            .map(packageName),
    );
    for (const name of packages) {
        problems.push(
            `${file} imports "${name}", an AI framework or provider package; only graphty-element's own chunks ` +
                "may hold one, built in, never imported (tools/ai-framework-packages.mjs)",
        );
    }
    return problems;
}

function check(dir, packed, workspaceVersions) {
    const problems = [];
    const manifest = JSON.parse(fs.readFileSync(path.join(packed, "package.json"), "utf8"));
    const deps = manifest.dependencies ?? {};
    const peers = manifest.peerDependencies ?? {};
    const declared = new Set([...Object.keys(deps), ...Object.keys(peers)]);
    const files = walk(packed).map((f) => path.relative(packed, f).split(path.sep).join("/"));

    for (const file of files) {
        if (FORBIDDEN_FILES.some((re) => re.test(file)))
            problems.push(`ships ${file}, which is test or tool configuration`);
    }

    const imported = new Map(); // name -> first file that imports it
    const frameworkAllowed = FRAMEWORK_IMPORTS_ALLOWED[manifest.name];
    for (const file of files) {
        // The top-level src/ is shipped for source maps; it is what dist was built FROM, not what runs.
        if (file.startsWith("src/")) continue;
        if (!/\.(c|m)?js$|\.d\.(c|m)?ts$/.test(file)) continue;
        const text = fs.readFileSync(path.join(packed, file), "utf8");
        if (frameworkAllowed) problems.push(...frameworkProblems(frameworkAllowed, file, text));
        for (const re of IMPORT_PATTERNS) {
            for (const m of text.matchAll(re)) {
                const spec = m[1];
                if (spec.startsWith(".") || spec.startsWith("/") || /^[a-z]+:\/\//.test(spec)) continue;
                if (builtins.has(spec) || builtins.has(packageName(spec)) || spec.startsWith("node:")) continue;
                let name = packageName(spec);
                if (!VALID_NAME.test(name) || name === manifest.name) continue;
                const types = `@types/${name.replace(/^@/, "").replace("/", "__")}`;
                if (/\.d\.[cm]?ts$/.test(file) && !declared.has(name) && declared.has(types)) name = types;
                if (!imported.has(name)) imported.set(name, file);
            }
        }
    }

    for (const [name, file] of imported) {
        if (!declared.has(name))
            problems.push(`${file} imports "${name}", which is neither a dependency nor a peer dependency`);
    }
    for (const name of declared) {
        if (!imported.has(name) && !UNUSED_PEERS_ALLOWED[manifest.name]?.has(name)) {
            const kind = name in deps ? "dependency" : "peer dependency";
            problems.push(`declares ${kind} "${name}", which no shipped file imports`);
        }
    }
    for (const name of Object.keys(deps)) {
        if (name in peers && !DEPENDENCY_AND_PEER_ALLOWED.has(name)) {
            problems.push(`declares "${name}" as both a dependency and a peer dependency`);
        }
    }
    for (const [section, ranges] of [
        ["dependencies", deps],
        ["peerDependencies", peers],
    ]) {
        for (const [name, range] of Object.entries(ranges)) {
            const version = workspaceVersions.get(name);
            if (version && !semver.satisfies(version, range)) {
                problems.push(`${section} "${name}": "${range}" does not accept the workspace version ${version}`);
            }
        }
    }
    return problems;
}

/**
 * Plants one violation of the framework rule of each kind in a fake packed package, and fails
 * unless each is reported and nothing allowed is.
 */
function selfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-published-deps-self-test-"));
    try {
        const write = (file, text) => {
            fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
            fs.writeFileSync(path.join(dir, file), text);
        };
        write(
            "package.json",
            JSON.stringify({
                name: "@graphty/graphty-element",
                peerDependencies: { ai: "*", "@ai-sdk/openai": "*", "@mlc-ai/web-llm": "*" },
            }),
        );
        write("dist/ai.d.ts", 'import type { ChatOptions } from "@tanstack/ai";\n');
        write("dist/chunks/openai-x.js", 'import OpenAI from "openai";\n');
        write("dist/src/ai/engine/load.d.ts", 'export type Adapter = typeof import("./tanstack/index.js");\n');
        write("dist/src/ai/engine/tanstack/index.d.ts", "export {};\n");
        write("dist/chunks/webllm-x.js", 'await import("@mlc-ai/web-llm");\n');
        write("dist/chunks/vercel-x.js", 'import { generateText } from "ai";\n');
        const problems = check(".", dir, new Map());
        const expected = [
            /^dist\/ai\.d\.ts imports "@tanstack\/ai"/,
            /^dist\/chunks\/openai-x\.js imports "openai"/,
            /^dist\/src\/ai\/engine\/load\.d\.ts names the AI adapter folder/,
            /^dist\/src\/ai\/engine\/tanstack\/index\.d\.ts names the AI adapter folder/,
            /^dist\/chunks\/vercel-x\.js imports "ai"/,
        ];
        const missing = expected.filter((re) => !problems.some((p) => re.test(p)));
        const extra = problems.filter((p) => !expected.some((re) => re.test(p)));
        if (missing.length > 0 || extra.length > 0) {
            console.error("check-published-deps self-test FAILED");
            for (const re of missing) console.error(`  not reported: ${re}`);
            for (const p of extra) console.error(`  reported but allowed: ${p}`);
            process.exit(1);
        }
        console.log(`check-published-deps self-test: each planted violation was reported (${expected.length})`);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

if (process.argv.includes("--self-test")) {
    selfTest();
    process.exit(0);
}

const only = process.argv.slice(2);
const all = workspacePackages();
const workspaceVersions = new Map(all.map((p) => [p.manifest.name, p.manifest.version]));
const published = all.filter((p) => !p.manifest.private && (only.length === 0 || only.includes(p.dir)));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "check-published-deps-"));

let failed = 0;
try {
    for (const { dir, manifest } of published) {
        const problems = check(dir, pack(dir, scratch), workspaceVersions);
        if (problems.length === 0) {
            console.log(`ok    ${manifest.name}`);
        } else {
            failed += problems.length;
            console.log(`FAIL  ${manifest.name}`);
            for (const p of problems) console.log(`        ${p}`);
        }
    }
} finally {
    fs.rmSync(scratch, { recursive: true, force: true });
}

if (failed > 0) {
    console.error(
        `\n${failed} problem(s) in published package manifests. See the header of tools/check-published-deps.mjs.`,
    );
    process.exit(1);
}
