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
 *      the dependency makes an install work, the wider peer lets an application share one copy).
 *
 * Why this exists: @graphty/algorithms shipped `pupt` as a runtime dependency for several
 * releases (GitHub issue #1), graphty-element's WebGPU peer range fell four breaking releases
 * behind, and layout published its compiled vitest.config.js. None of those failed a build.
 *
 * Needs a build first: it packs whatever is in each package's dist/.
 * Usage: node tools/check-published-deps.mjs [package-dir ...]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { builtinModules } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import semver from "semver";

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

const builtins = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));

// Static imports and re-exports start at column 0 in both tsc and rollup output, or right after
// the `;` that ends the statement before them in minified output (`import{a as b}from"x";`);
// anything indented is inside a string or a comment (graphty-element's bundle carries example
// code for its AI prompt as template strings). A `[^;]` body lets a multi-line
// `import {\n a,\n} from` match without running on into the next statement.
const IMPORT_PATTERNS = [
    /(?:^|;)(?:import|export)\b[^;]*?\bfrom\s*["']([^"'\n]+)["']/gm,
    /(?:^|;)import\s*["']([^"'\n]+)["']/gm,
    // Rolldown writes a literal dynamic specifier as a template string: import(`x`).
    /\bimport\(\s*["'`]([^"'`$\n]+)["'`]\s*\)/g,
    /\brequire\(\s*["'`]([^"'`$\n]+)["'`]\s*\)/g,
    /^\/\/\/\s*<reference\s+types\s*=\s*["']([^"'\n]+)["']/gm,
];

const VALID_NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

function packageName(specifier) {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

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
 * Rule 4: shipped test or tool configuration.
 * @param files - The shipped paths, relative and with forward slashes.
 * @returns One problem per such file.
 */
function forbiddenFiles(files) {
    return files
        .filter((file) => FORBIDDEN_FILES.some((re) => re.test(file)))
        .map((file) => `ships ${file}, which is test or tool configuration`);
}

/**
 * Whether a specifier names another package, not a relative path, a URL or a node builtin.
 * @param spec - The import specifier.
 * @returns True for a package.
 */
function isPackageSpecifier(spec) {
    if (spec.startsWith(".") || spec.startsWith("/") || /^[a-z]+:\/\//.test(spec)) return false;
    return !(builtins.has(spec) || builtins.has(packageName(spec)) || spec.startsWith("node:"));
}

/**
 * The package one import names, as the manifest must declare it: in a .d.ts, a declared "@types/x" stands for an
 * undeclared "x".
 * @param spec - The import specifier.
 * @param file - The file importing it.
 * @param manifest - The package's manifest.
 * @param declared - Every dependency and peer dependency name.
 * @returns The name, or null for a name to ignore (invalid, or the package itself).
 */
function declaredNameOf(spec, file, manifest, declared) {
    const name = packageName(spec);
    if (!VALID_NAME.test(name) || name === manifest.name) return null;
    const types = `@types/${name.replace(/^@/, "").replace("/", "__")}`;
    return /\.d\.[cm]?ts$/.test(file) && !declared.has(name) && declared.has(types) ? types : name;
}

/**
 * Every package the shipped code imports.
 * @param packed - The unpacked package's directory.
 * @param files - The shipped paths.
 * @param manifest - The package's manifest.
 * @param declared - Every dependency and peer dependency name.
 * @returns Package name to the first file that imports it.
 */
function importedPackages(packed, files, manifest, declared) {
    const imported = new Map();
    for (const file of files) {
        // The top-level src/ is shipped for source maps; it is what dist was built FROM, not what runs.
        if (file.startsWith("src/") || !/\.[cm]?js$|\.d\.[cm]?ts$/.test(file)) continue;
        addImports(imported, fs.readFileSync(path.join(packed, file), "utf8"), file, manifest, declared);
    }
    return imported;
}

/**
 * Record each package one file imports that no earlier file did.
 * @param imported - Package name to the first file that imports it, added to.
 * @param text - The file's text.
 * @param file - The file's path.
 * @param manifest - The package's manifest.
 * @param declared - Every dependency and peer dependency name.
 */
function addImports(imported, text, file, manifest, declared) {
    for (const re of IMPORT_PATTERNS) {
        for (const m of text.matchAll(re)) {
            const name = isPackageSpecifier(m[1]) ? declaredNameOf(m[1], file, manifest, declared) : null;
            if (name !== null && !imported.has(name)) imported.set(name, file);
        }
    }
}

/**
 * Rules 1 and 2: imports nothing declares, and declarations nothing imports.
 * @param imported - Package name to the first file that imports it.
 * @param declared - Every dependency and peer dependency name.
 * @param deps - The dependencies.
 * @returns The problems.
 */
function importMismatches(imported, declared, deps) {
    const problems = [];
    for (const [name, file] of imported) {
        if (!declared.has(name))
            problems.push(`${file} imports "${name}", which is neither a dependency nor a peer dependency`);
    }
    for (const name of declared) {
        if (!imported.has(name)) {
            const kind = name in deps ? "dependency" : "peer dependency";
            problems.push(`declares ${kind} "${name}", which no shipped file imports`);
        }
    }
    return problems;
}

/**
 * Rule 5: a name in both dependencies and peerDependencies.
 * @param deps - The dependencies.
 * @param peers - The peer dependencies.
 * @returns The problems.
 */
function dependencyAndPeer(deps, peers) {
    return Object.keys(deps)
        .filter((name) => name in peers && !DEPENDENCY_AND_PEER_ALLOWED.has(name))
        .map((name) => `declares "${name}" as both a dependency and a peer dependency`);
}

/**
 * Rule 3: an internal range the workspace version does not satisfy.
 * @param deps - The dependencies.
 * @param peers - The peer dependencies.
 * @param workspaceVersions - Each workspace package's version, by name.
 * @returns The problems.
 */
function staleRanges(deps, peers, workspaceVersions) {
    const problems = [];
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
 * Every problem with one unpacked package, in rule order: shipped configuration, import mismatches, names in
 * both sections, stale internal ranges.
 * @param dir - The package's workspace directory.
 * @param packed - The unpacked package's directory.
 * @param workspaceVersions - Each workspace package's version, by name.
 * @returns The problems, empty when there are none.
 */
export function check(dir, packed, workspaceVersions) {
    const manifest = JSON.parse(fs.readFileSync(path.join(packed, "package.json"), "utf8"));
    const deps = manifest.dependencies ?? {};
    const peers = manifest.peerDependencies ?? {};
    const declared = new Set([...Object.keys(deps), ...Object.keys(peers)]);
    const files = walk(packed).map((f) => path.relative(packed, f).split(path.sep).join("/"));
    const imported = importedPackages(packed, files, manifest, declared);
    return [
        ...forbiddenFiles(files),
        ...importMismatches(imported, declared, deps),
        ...dependencyAndPeer(deps, peers),
        ...staleRanges(deps, peers, workspaceVersions),
    ];
}

// Run as a script; imported (by its test), only `check` is used.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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
}
