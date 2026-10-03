#!/usr/bin/env node
/**
 * bench-groups -- which benchmark groups a change can move, so the paired benchmark (scripts/bench-ab.js) on the
 * GPU lane runs only those. One full paired run is 4 ABBA rounds x 2 builds x every group of benchmarks/run.ts, about
 * 65 minutes on the T4 by 2026-10-01; most pull requests touch one algorithm and can move one or two groups.
 *
 * The rule:
 *   1. A group's file set is every webgpu-graph-algorithms/src file its benchmark reaches through imports,
 *      transitively, starting from the bench file that defines the group's run function AND from benchmarks/run.ts
 *      itself (the runner creates the context every group runs on). Type-only imports count: they are cheap
 *      over-selection, never under-selection. The scan works per file, so two groups defined in one bench file
 *      (triangles, label-propagation) share a set.
 *   2. A changed file under src/ selects every group whose set contains it.
 *   3. A changed file in AFFECTS_EVERY_GROUP, or one under src/ that no group's set contains (the scan cannot
 *      place it), selects EVERY group. Fail safe: a file the scan cannot see is assumed to move everything.
 *   4. A changed file outside webgpu-graph-algorithms/src selects nothing (the lane skips the step then anyway).
 *   test/bench-groups.test.ts holds the rule to that: every group has a non-empty set, and every file under src/
 *   is in some set or in AFFECTS_EVERY_GROUP, so a new file no benchmark reaches fails the test until it is placed.
 *
 * Usage (from webgpu-graph-algorithms; paths are repository-relative, as `git diff --name-only` prints them):
 *   git diff --name-only <base> HEAD | node scripts/bench-groups.js [--base <rev>]
 *   node scripts/bench-groups.js --list          # every group, in run order
 * Prints the selected groups on stdout, space separated: "all" when every group is selected, empty when none. The
 * reason for each changed src file goes to stderr. --base drops a selected group that <rev>'s benchmarks/run.ts does not declare (a group new in the change has no
 * base to be compared against, and the base's runner would refuse its name).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

/** The package directory and its path inside the repository. */
const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A path relative to the package, always with "/": path.relative gives "\\" on Windows, and every
 * set, list and comparison here uses "/".
 * @param {string} file an absolute path
 * @returns {string} the package-relative path
 */
const rel = (file) => relative(PACKAGE_DIR, file).split(sep).join("/");
const PACKAGE_PREFIX = "webgpu-graph-algorithms/";

/**
 * src files that influence every group's timings without a benchmark importing them by name, plus the device setup
 * every group runs on. Package-relative. A change to any of these runs every group.
 * - src/node/index.ts: creates the Dawn device for the whole run (and loads the "webgpu" module by name).
 * - src/device/acquire.ts, src/device/caps.ts: the adapter, features and limits the device is requested with.
 * - src/constants.ts: package-wide defaults read by the context.
 * - src/kernel/prelude.ts, src/kernel/wgsl.ts: text every WGSL module is composed from.
 * The rest are files NO benchmark loads, listed so the placement test passes and a change to them stays fail safe
 * (every group) rather than silent. When a benchmark starts to reach one, delete it from here.
 * - src/browser/index.ts, src/index.ts, src/accelerator.ts: entry points the Node benchmarks never import.
 * - the algorithms no group measures: bellman-ford, closeness, spectral (and its power-iteration), the layout
 *   calibration, and the kernels only they compile (bf-relax, closeness-level, closeness-rowsum).
 */
export const AFFECTS_EVERY_GROUP = Object.freeze([
    "src/node/index.ts",
    "src/device/acquire.ts",
    "src/device/caps.ts",
    "src/constants.ts",
    "src/kernel/prelude.ts",
    "src/kernel/wgsl.ts",
    "src/browser/index.ts",
    "src/managed.ts",
    "src/index.ts",
    "src/accelerator.ts",
    "src/algorithms/bellman-ford.ts",
    "src/algorithms/closeness.ts",
    "src/algorithms/power-iteration.ts",
    "src/algorithms/spectral.ts",
    "src/layouts/calibrate.ts",
    "src/wgsl/bf-relax.wgsl.ts",
    "src/wgsl/closeness-level.wgsl.ts",
    "src/wgsl/closeness-rowsum.wgsl.ts",
]);

/**
 * The relative module specifiers a file imports or re-exports, static or dynamic.
 * @param {string} file - absolute path
 * @returns {string[]} the specifiers starting with "."
 */
function relativeImports(file) {
    const info = ts.preProcessFile(readFileSync(file, "utf8"), true, true);
    return info.importedFiles.map((f) => f.fileName).filter((s) => s.startsWith("."));
}

/**
 * Resolves a relative specifier the way the package's sources write them ("./x.js" for x.ts).
 * @param {string} from - the importing file, absolute
 * @param {string} spec - the specifier
 * @returns {string | null} the absolute file, or null when it is not a file of this package
 */
function resolveImport(from, spec) {
    const base = resolve(dirname(from), spec);
    for (const candidate of [base.replace(/\.js$/, ".ts"), base, `${base}.ts`, join(base, "index.ts")]) {
        if (candidate.startsWith(PACKAGE_DIR) && existsSync(candidate) && candidate.endsWith(".ts")) {
            return candidate;
        }
    }
    return null;
}

/**
 * src/kernels.ts is the kernel registry: it imports every WGSL module, so following its imports would put every
 * kernel in every group. Instead a kernel is an edge from the file that names its id as a string literal
 * (`kernelSpec("bfs-fused")`, `["fill", "bc-forward"].map(...)`) to the WGSL module(s) the registry entry of that id
 * imports. A kernel named only by a computed string is missed here; when no other group names it either, the
 * placement test fails and a change to it selects every group.
 * @returns {Map<string, string[]>} kernel id -> absolute WGSL module files
 */
export function kernelModules() {
    const registry = join(PACKAGE_DIR, "src/kernels.ts");
    const text = readFileSync(registry, "utf8");
    /** @type {Map<string, string>} imported identifier -> absolute file, for the src/wgsl imports only */
    const wgslImports = new Map();
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(\.\/wgsl\/[^"]+)"/g)) {
        const file = resolveImport(registry, m[2]);
        for (const id of m[1].split(",").map((x) => x.trim())) {
            if (id !== "" && file !== null) {
                wgslImports.set(id, file);
            }
        }
    }
    const modules = new Map();
    const segments = text.split(/\bid:\s*"/).slice(1); // each segment starts with an entry's id
    for (const segment of segments) {
        const id = /^([\w-]+)"/.exec(segment)?.[1];
        const files = [...wgslImports].filter(([name]) => new RegExp(`\\b${name}\\b`).test(segment)).map(([, f]) => f);
        if (id !== undefined) {
            modules.set(id, [...(modules.get(id) ?? []), ...files]);
        }
    }
    return modules;
}

/**
 * The package's src files reached from the roots through imports, transitively, with the registry's WGSL imports
 * replaced by kernel-id edges (see kernelModules()).
 * @param {readonly string[]} roots - absolute files
 * @param {Map<string, string[]>} kernels - from kernelModules()
 * @returns {Set<string>} package-relative src paths
 */
function reachedSrc(roots, kernels) {
    const registry = join(PACKAGE_DIR, "src/kernels.ts");
    // src/managed.ts (acquireAccelerator) imports createAccelerator and through it every algorithm and layout, and
    // the node and browser entries import it; no benchmark calls it, so following it would put every algorithm in
    // every group. It is in AFFECTS_EVERY_GROUP instead.
    const managed = join(PACKAGE_DIR, "src/managed.ts");
    const seen = new Set();
    const stack = [...roots];
    while (stack.length > 0) {
        const file = /** @type {string} */ (stack.pop());
        if (seen.has(file)) {
            continue;
        }
        seen.add(file);
        for (const spec of file === managed ? [] : relativeImports(file)) {
            const target = resolveImport(file, spec);
            if (target !== null && !(file === registry && spec.startsWith("./wgsl/"))) {
                stack.push(target);
            }
        }
        if (file !== registry) {
            for (const m of readFileSync(file, "utf8").matchAll(/["'`]([\w-]+)["'`]/g)) {
                stack.push(...(kernels.get(m[1]) ?? []));
            }
        }
    }
    return new Set([...seen].map((f) => rel(f)).filter((f) => f.startsWith("src/")));
}

/**
 * The groups benchmarks/run.ts declares, in order, and the bench file of each. Parses the GROUPS object literal:
 * `name: runFn` or `[NAME_CONST]: runFn`, with runFn and NAME_CONST imported from "./x.bench.js".
 * @param {(path: string) => string} read - reads a package-relative file
 * @returns {{ name: string, benchFile: string }[]} the groups; throws when the shape is not recognised
 */
export function declaredGroups(read = (p) => readFileSync(join(PACKAGE_DIR, p), "utf8")) {
    const runTs = read("benchmarks/run.ts");
    /** @type {Map<string, string>} imported identifier -> package-relative bench file */
    const importedFrom = new Map();
    for (const m of runTs.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/([\w.-]+)\.js"/g)) {
        for (const id of m[1].split(",").map((s) => s.replace(/^\s*type\s+/, "").trim())) {
            if (id !== "") {
                importedFrom.set(id, `benchmarks/${m[2]}.ts`);
            }
        }
    }
    const block = /const GROUPS\b[^\n]*=\s*\{\n([\s\S]*?)\n\};/.exec(runTs);
    if (block === null) {
        throw new Error("benchmarks/run.ts: no `const GROUPS = { ... };` found");
    }
    const groups = [];
    for (const m of block[1].matchAll(/^\s*(\[(\w+)\]|"([\w-]+)"|([\w-]+))\s*:\s*(\w+)\s*,?\s*$/gm)) {
        const benchFile = importedFrom.get(m[5]);
        if (benchFile === undefined) {
            throw new Error(`benchmarks/run.ts: ${m[5]} is not imported from a bench file`);
        }
        let name = m[3] ?? m[4];
        if (m[2] !== undefined) {
            const value = new RegExp(`export const ${m[2]}\\s*=\\s*"([\\w-]+)"`).exec(read(benchFile));
            if (value === null) {
                throw new Error(`${benchFile}: no \`export const ${m[2]} = "..."\``);
            }
            name = value[1];
        }
        groups.push({ name, benchFile });
    }
    if (groups.length === 0) {
        throw new Error("benchmarks/run.ts: GROUPS declares no group this script can read");
    }
    return groups;
}

/**
 * Every group's src file set (rule 1 of the header).
 * @returns {Map<string, Set<string>>} group name -> package-relative src paths, in run order
 */
export function groupFileSets() {
    const runner = join(PACKAGE_DIR, "benchmarks/run.ts");
    const benchFiles = new Set(declaredGroups().map((g) => g.benchFile));
    // The runner's own imports, minus the bench files: what every group shares.
    const prelude = relativeImports(runner)
        .map((s) => resolveImport(runner, s))
        .filter((f) => f !== null && !benchFiles.has(rel(f)));
    const kernels = kernelModules();
    const sets = new Map();
    for (const { name, benchFile } of declaredGroups()) {
        sets.set(name, reachedSrc([join(PACKAGE_DIR, benchFile), .../** @type {string[]} */ (prelude)], kernels));
    }
    return sets;
}

/**
 * Every file under src/, package-relative.
 * @returns {string[]} the files
 */
export function srcFiles() {
    return readdirSync(join(PACKAGE_DIR, "src"), { recursive: true, withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => rel(join(d.parentPath, d.name)));
}

/**
 * The groups a change selects (rules 2-4 of the header).
 * @param {readonly string[]} changed - repository-relative paths
 * @param {Map<string, Set<string>>} [sets] - from groupFileSets()
 * @returns {{ groups: string[], reasons: string[] }} the groups in run order, and one line per changed src file
 */
export function selectGroups(changed, sets = groupFileSets()) {
    const all = [...sets.keys()];
    const selected = new Set();
    const reasons = [];
    for (const path of changed) {
        if (!path.startsWith(`${PACKAGE_PREFIX}src/`)) {
            continue;
        }
        const file = path.slice(PACKAGE_PREFIX.length);
        const owners = all.filter((g) => sets.get(g)?.has(file));
        if (AFFECTS_EVERY_GROUP.includes(file)) {
            all.forEach((g) => selected.add(g));
            reasons.push(`${file}: in the affects-every-group list -> all groups`);
        } else if (owners.length === 0) {
            all.forEach((g) => selected.add(g));
            reasons.push(`${file}: no benchmark imports it (deleted, new, or unplaced) -> all groups`);
        } else {
            owners.forEach((g) => selected.add(g));
            reasons.push(`${file}: reached by ${owners.join(", ")}`);
        }
    }
    return { groups: all.filter((g) => selected.has(g)), reasons };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const argv = process.argv.slice(2);
    if (argv[0] === "--list") {
        console.log(
            declaredGroups()
                .map((g) => g.name)
                .join(" "),
        );
    } else {
        const changed = readFileSync(0, "utf8")
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s !== "");
        const sets = groupFileSets();
        const { groups, reasons } = selectGroups(changed, sets);
        reasons.forEach((r) => console.error(r));
        let out = groups;
        const baseIndex = argv.indexOf("--base");
        if (groups.length === sets.size) {
            out = ["all"]; // bench:ab with no group runs each side's own groups, so a group new in the change still runs
        } else if (baseIndex !== -1) {
            const rev = argv[baseIndex + 1];
            const atBase = new Set(
                declaredGroups((p) =>
                    execFileSync("git", ["show", `${rev}:./${p}`], { cwd: PACKAGE_DIR, encoding: "utf8" }),
                ).map((g) => g.name),
            );
            for (const g of out.filter((name) => !atBase.has(name))) {
                console.error(`${g}: not declared at ${rev}, nothing to compare against -> dropped`);
            }
            out = out.filter((g) => atBase.has(g));
        }
        console.error(`selected: ${out.length === 0 ? "(none)" : out.join(" ")}`);
        console.log(out.join(" "));
    }
}
