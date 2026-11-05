#!/usr/bin/env node
/**
 * check-packed-exports.mjs -- fail when a published package points at files its tarball will not hold.
 *
 * For every workspace package that is not private, this asks npm what it would pack
 * (`npm pack --dry-run --json --ignore-scripts`) and fails on:
 *
 *   1. a target of `exports`, `main`, `module`, `types`, `typings` or `bin` that is not in the pack
 *      (an `exports` pattern with `*` must match at least one packed file);
 *   2. an entry of `files` (not a `!` exclusion) that matches no packed file.
 *
 * One exception: a `files` entry naming a README, LICENSE or LICENCE file (any case, with or without an
 * extension) that matches nothing is printed as a warning and does not fail. npm packs those files
 * whenever they exist and ignores a missing one, so such an entry breaks nobody (issue #5325).
 *
 * Why this exists: @graphty/cytoscape-extensions was published without dist/ (issue #3275) because the
 * release's build download did not include its build; the tarball held only src/, every export pointed
 * at nothing, and nothing failed. release.yml runs this after it puts the builds in their packages and
 * before it publishes.
 *
 * Usage: node tools/check-packed-exports.mjs [package-dir ...]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { workspaceDirs } from "./workspace-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ENTRY_FIELDS = ["main", "module", "types", "typings"];

const clean = (p) => p.replace(/^\.\//, "").replace(/\/$/, "");
const globToRegExp = (glob) =>
    new RegExp(
        `^${glob
            .split("*")
            .map((s) => s.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`))
            .join(".+")}$`,
    );

/**
 * Every file path a manifest names as an entry point.
 * @param manifest - a package.json
 * @returns [field, target] pairs, null exports skipped
 */
export function entryTargets(manifest) {
    const out = [];
    for (const field of ENTRY_FIELDS) if (typeof manifest[field] === "string") out.push([field, manifest[field]]);
    if (typeof manifest.bin === "string") out.push(["bin", manifest.bin]);
    else for (const [name, target] of Object.entries(manifest.bin ?? {})) out.push([`bin.${name}`, target]);
    const walk = (value, where) => {
        if (typeof value === "string") out.push([where, value]);
        else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${where}[${i}]`));
        else if (value && typeof value === "object")
            for (const [k, v] of Object.entries(value)) walk(v, `${where}["${k}"]`);
    };
    walk(manifest.exports, "exports");
    return out;
}

/** README, LICENSE and LICENCE, which npm packs when present and skips when absent. */
const NPM_ALWAYS_PACKED = /^(readme|license|licence)(\.[^/]*)?$/i;

/**
 * The problems with a manifest against the list of files its pack holds.
 * @param manifest - a package.json
 * @param packed - the paths in its pack
 * @param warnings - collects one line per unmatched README or LICENSE files entry, which is not a problem
 * @returns one line per missing target or unmatched files entry
 */
export function missingFromPack(manifest, packed, warnings = []) {
    const files = new Set(packed.map(clean));
    const has = (target) => {
        const t = clean(target);
        if (!t.includes("*")) return files.has(t);
        const re = globToRegExp(t);
        return [...files].some((f) => re.test(f));
    };
    const problems = [];
    for (const [field, target] of entryTargets(manifest)) {
        if (!has(target)) problems.push(`${field} points at ${target}, which is not in the pack`);
    }
    for (const entry of manifest.files ?? []) {
        if (entry.startsWith("!")) continue;
        const e = clean(entry);
        const re = e.includes("*") ? globToRegExp(e) : null;
        if ([...files].some((f) => (re ? re.test(f) : f === e || f.startsWith(`${e}/`)))) continue;
        const line = `files lists ${entry}, which matches nothing in the pack`;
        if (NPM_ALWAYS_PACKED.test(e)) warnings.push(line);
        else problems.push(line);
    }
    return problems;
}

/**
 * The paths `npm pack` would put in the tarball of a package.
 * @param dir - the package directory
 * @returns the packed paths
 */
export function packedFiles(dir) {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
        cwd: dir,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
    });
    return JSON.parse(out)[0].files.map((f) => f.path);
}

/**
 * Checks packages and prints a line for each.
 * @param dirs - absolute package directories
 * @returns the number of problems found
 */
export function checkPackages(dirs) {
    let failed = 0;
    for (const dir of dirs) {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
        const warnings = [];
        const problems = missingFromPack(manifest, packedFiles(dir), warnings);
        failed += problems.length;
        console.log(`${problems.length ? "FAIL" : "ok  "}  ${manifest.name}`);
        for (const p of problems) console.log(`        ${p}`);
        for (const w of warnings) console.log(`warn  ${manifest.name}: ${w}`);
    }
    return failed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const only = process.argv.slice(2);
    const dirs = (only.length ? only : workspaceDirs(root))
        .map((d) => path.resolve(root, d))
        .filter((d) => fs.existsSync(path.join(d, "package.json")))
        .filter((d) => !JSON.parse(fs.readFileSync(path.join(d, "package.json"), "utf8")).private);
    const failed = checkPackages(dirs);
    if (failed > 0) {
        console.error(
            `\n${failed} published path(s) missing from their packs. See the header of tools/check-packed-exports.mjs.`,
        );
        process.exitCode = 1;
    }
}
