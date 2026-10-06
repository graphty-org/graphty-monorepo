#!/usr/bin/env node
/**
 * Fails when a workspace package uses a tool that only the ROOT package.json declares.
 *
 * pnpm hoists the root's devDependencies (and this repository sets shamefully-hoist), so a
 * package can run `vite` from its scripts, or import "vite" from its vite.config.ts, without
 * declaring it -- until the package is built outside this workspace, or hoisting changes, and
 * the build breaks. knip cannot see it: it counts the root manifest's dependencies as available
 * to every workspace. check-published-deps.mjs cannot either: it reads packed dist files, and
 * build tools never reach them.
 *
 * For each workspace this collects
 *   - the executables its package.json scripts invoke, and
 *   - the bare imports of its *.config.* files,
 * and reports each one that belongs to a package the root declares and the workspace does not.
 *
 * Usage: node tools/check-declared-build-tools.mjs              (exit 1 when anything is found)
 *        node tools/check-declared-build-tools.mjs --self-test  (prove it catches an undeclared vite)
 */
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scratchWorkspace } from "./scratch-workspace.mjs";
import { workspaceDirs } from "./workspace-files.mjs";

/**
 * Reads a package.json.
 * @param file - the path
 * @returns the parsed manifest
 */
function readJson(file) {
    return JSON.parse(readFileSync(file, "utf8"));
}

/**
 * Every dependency name a manifest declares, of any kind.
 * @param pkg - the manifest
 * @returns the names
 */
function declared(pkg) {
    return new Set(
        ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((k) =>
            Object.keys(pkg[k] ?? {}),
        ),
    );
}

/**
 * The executables each root dependency installs, as executable name -> package name.
 * @param rootDir - the workspace root
 * @param rootDeps - the root's declared dependencies
 * @returns the map
 */
function rootBinaries(rootDir, rootDeps) {
    const require = createRequire(join(rootDir, "package.json"));
    const bins = new Map();
    for (const name of rootDeps) {
        let manifest;
        try {
            manifest = require.resolve(`${name}/package.json`);
        } catch {
            // a package whose exports hide package.json: look for it on disk
            const guess = join(rootDir, "node_modules", name, "package.json");
            if (!existsSync(guess)) {
                continue;
            }
            manifest = guess;
        }
        const { bin } = readJson(manifest);
        if (typeof bin === "string") {
            bins.set(name.split("/").pop(), name);
        } else if (bin !== undefined) {
            for (const exe of Object.keys(bin)) {
                bins.set(exe, name);
            }
        }
    }
    return bins;
}

/** Words that run the next word as the command. */
const RUNNERS = new Set(["npx", "exec", "env", "cross-env", "time", "timeout", "nice"]);

/**
 * The executables a shell command line starts: the first word of each simple command, past
 * environment assignments and runners such as `pnpm exec` or `npx`.
 * @param line - a package.json script
 * @returns the executable names
 */
function commandsOf(line) {
    const found = [];
    for (const part of line.split(/&&|\|\||[;|()]/)) {
        const words = part.trim().split(/\s+/).filter(Boolean);
        let i = 0;
        while (i < words.length) {
            const w = words[i];
            if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || RUNNERS.has(w) || w.startsWith("-") || /^\d+$/.test(w)) {
                i++;
            } else if (w === "pnpm" || w === "npm" || w === "yarn") {
                // `pnpm exec x` / `pnpm x` runs x; `npm run x` runs a script, which is checked on its own
                if (words[i + 1] === "run" || words[i + 1] === "run-script") {
                    break;
                }
                i++;
            } else {
                found.push(w);
                break;
            }
        }
    }
    return found;
}

/**
 * The package a bare import specifier names, or undefined for a relative, absolute or builtin one.
 * @param spec - the specifier
 * @returns the package name
 */
function packageOf(spec) {
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) {
        return undefined;
    }
    const parts = spec.split("/");
    return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * The bare imports of one source file.
 * @param source - the file's text
 * @returns the package names
 */
function importsOf(source) {
    const names = [];
    const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm;
    for (const match of source.matchAll(re)) {
        const name = packageOf(match[1]);
        if (name !== undefined) {
            names.push(name);
        }
    }
    return names;
}

/**
 * Checks every workspace under a root.
 * @param rootDir - the workspace root (holds package.json and pnpm-workspace.yaml)
 * @returns one line per undeclared use
 */
function check(rootDir) {
    const root = readJson(join(rootDir, "package.json"));
    const rootDeps = declared(root);
    const bins = rootBinaries(rootDir, rootDeps);
    const dirs = workspaceDirs(rootDir);
    const problems = [];
    for (const dir of dirs) {
        const pkgFile = join(rootDir, dir, "package.json");
        if (!existsSync(pkgFile)) {
            continue;
        }
        const pkg = readJson(pkgFile);
        const own = declared(pkg);
        own.add(pkg.name);
        const report = (dep, where) => {
            if (rootDeps.has(dep) && !own.has(dep)) {
                problems.push(`${dir}: ${where} uses ${dep}, which only the root package.json declares`);
            }
        };
        for (const [script, line] of Object.entries(pkg.scripts ?? {})) {
            for (const exe of commandsOf(line)) {
                const dep = bins.get(exe);
                if (dep !== undefined) {
                    report(dep, `script "${script}" runs ${exe}`);
                }
            }
        }
        for (const file of readdirSync(join(rootDir, dir))) {
            if (/\.config\.(?:[cm]?[jt]s)$/.test(file)) {
                for (const dep of importsOf(readFileSync(join(rootDir, dir, file), "utf8"))) {
                    report(dep, file);
                }
            }
        }
    }
    return problems;
}

/**
 * Builds a one-package workspace whose root declares vite, and checks that the package is
 * reported while it leaves vite undeclared and passes once it declares it.
 */
function selfTest() {
    const { dir, write } = scratchWorkspace("declared-tools-");
    try {
        write("package.json", { name: "root", devDependencies: { vite: "^7.0.0" } });
        write("pnpm-workspace.yaml", 'packages:\n    - "app"\n');
        write("node_modules/vite/package.json", { name: "vite", bin: { vite: "bin/vite.js" } });
        write("app/vite.config.ts", 'import { defineConfig } from "vite";\nexport default defineConfig({});\n');
        write("app/package.json", { name: "app", scripts: { build: "tsc && vite build" } });
        const undeclared = check(dir);
        if (undeclared.length !== 2 || !undeclared.every((p) => p.includes("uses vite"))) {
            throw new Error(`expected the script and the config reported, got ${JSON.stringify(undeclared)}`);
        }
        write("app/package.json", {
            name: "app",
            scripts: { build: "tsc && vite build" },
            devDependencies: { vite: "^7.0.0" },
        });
        if (check(dir).length !== 0) {
            throw new Error("a package that declares vite was still reported");
        }
        console.log("check-declared-build-tools self-test: passed");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.includes("--self-test")) {
        selfTest();
        process.exit(0);
    }
    const problems = check(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    for (const p of problems) {
        console.error(p);
    }
    if (problems.length > 0) {
        console.error(`\n${problems.length} undeclared tool use(s). Declare each in that package's devDependencies.`);
        process.exit(1);
    }
    console.log("check-declared-build-tools: every workspace declares the tools it runs");
}
