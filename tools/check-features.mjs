#!/usr/bin/env node
// The features check (design/ci/channels-pipeline/features.md, section 4): every experiment id the code,
// the stories and the site configurations name is a row of graphty-element's FEATURES, every row has its
// tracking issue, no graduated id lingers, every flagged descriptor field carries its `@experimental` tag,
// and the features module reads no host URL, storage or environment. Experimental items may appear in the
// public API report: `@experimental` promises no compatibility (owner, 2026-10-25; features.md section 11).
//
//   node tools/check-features.mjs          fails naming every problem
//   node tools/check-features.mjs --list   prints every flag with its age, issue and referencing files
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = "graphty-element/src/features/registry.ts";
const FEATURES_DIR = "graphty-element/src/features";
const SCAN_DIRS = ["graphty-element/src", "graphty-element/stories", "graphty/src", "graphty/sites"];
const SOURCE = /\.(?:[cm]?[jt]sx?|json|mdx)$/;
const TEST = /\.(?:test|spec)\.[cm]?[jt]sx?$|\.test-d\.ts$/;

function walk(root, dir) {
    const abs = join(root, dir);
    if (!existsSync(abs)) return [];
    return readdirSync(abs).flatMap((name) => {
        if (name === "node_modules" || name === "dist") return [];
        const rel = join(dir, name);
        if (statSync(join(root, rel)).isDirectory()) return walk(root, rel);
        return SOURCE.test(name) && !TEST.test(name) ? [rel] : [];
    });
}

// Comments and string literals blanked out, so a word in a doc comment or a string is not code.
const stripCommentsAndStrings = (text) =>
    text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gm, "");

const quoted = (text) => [...text.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * The FEATURES rows and GRADUATED_FEATURES ids, read from the registry's source.
 * @param text - The source of graphty-element/src/features/registry.ts.
 * @returns What it declares.
 */
export function readRegistry(text) {
    const block = (name) =>
        text.match(new RegExp(`export const ${name}\\b[^=]*=\\s*Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\)`))?.[1];
    const rows = [...(block("FEATURES") ?? "").matchAll(/\{[^{}]*\}/g)].map((m) => ({
        id: m[0].match(/\bid:\s*["']([^"']+)["']/)?.[1],
        issue: Number(m[0].match(/\bissue:\s*(\d+)/)?.[1] ?? 0),
        since: m[0].match(/\bsince:\s*["']([^"']+)["']/)?.[1],
    }));
    return { rows, graduated: quoted(block("GRADUATED_FEATURES") ?? "") };
}

// Every place a file names an experiment id: [{ id, line, kind }].
function references(file, text) {
    const refs = [];
    const add = (re, kind, ids = (m) => [m[1]]) => {
        for (const m of text.matchAll(re))
            for (const id of ids(m)) refs.push({ id, line: lineOf(text, m.index), kind });
    };
    // A tag opens a doc-comment line; `@experimental` quoted in prose is not one.
    add(/^[ \t]*(?:\/\*\*|\*)?[ \t]*@experimental\b[ \t]*([a-z0-9-]*)/gm, "@experimental tag");
    // ponytail: an error's `details` or `params` names a capability, not a flag; skipped by line.
    add(/^(?!.*\b(?:details|params):).*?\bfeature:\s*["']([^"']+)["']/gm, "feature field");
    add(/\bfeatures\.has\(\s*["']([^"']+)["']/g, "features.has call");
    if (/\.stories\.[cm]?[jt]sx?$/.test(file))
        add(/\bfeatures:\s*\[([^\]]*)\]/g, "story features parameter", (m) => quoted(m[1]));
    if (file.startsWith("graphty/sites/") && file.endsWith(".json")) {
        let features = [];
        try {
            features = JSON.parse(text).features ?? [];
        } catch {
            refs.push({ id: "", line: 1, kind: "unreadable site configuration" });
        }
        for (const id of features)
            refs.push({ id, line: lineOf(text, text.indexOf(`"${id}"`)), kind: "site configuration" });
    }
    return refs;
}

/**
 * Runs every rule over a checkout.
 * @param root - The repository root.
 * @returns Every problem found, and each declared flag with the files that reference it.
 */
export function checkFeatures(root) {
    const problems = [];
    const { rows, graduated } = readRegistry(
        existsSync(join(root, REGISTRY)) ? readFileSync(join(root, REGISTRY), "utf8") : "",
    );
    const declared = new Set(rows.map((r) => r.id));
    const files = new Map(rows.map((r) => [r.id, new Set()]));

    for (const row of rows) {
        if (!(row.issue > 0))
            problems.push(`${REGISTRY}: FEATURES row "${row.id}" names no tracking issue (issue: <number>)`);
    }

    for (const file of SCAN_DIRS.flatMap((dir) => walk(root, dir))) {
        if (file === REGISTRY) continue;
        const text = readFileSync(join(root, file), "utf8");
        const lines = text.split("\n");
        for (const ref of references(file, text)) {
            if (declared.has(ref.id)) files.get(ref.id).add(file);
            else if (ref.kind === "unreadable site configuration") problems.push(`${file}: not valid JSON`);
            else if (ref.id === "") problems.push(`${file}:${ref.line}: @experimental names no feature id`);
            else problems.push(`${file}:${ref.line}: ${ref.kind} names "${ref.id}", which is not in FEATURES`);
            // ponytail: "its tag" means within the 30 lines above the field; a real AST walk if that misfires.
            if (
                ref.kind === "feature field" &&
                !lines
                    .slice(Math.max(0, ref.line - 31), ref.line)
                    .join("\n")
                    .includes(`@experimental ${ref.id}`)
            ) {
                problems.push(
                    `${file}:${ref.line}: feature field "${ref.id}" has no @experimental ${ref.id} tag in its doc comment`,
                );
            }
        }
        for (const id of graduated) {
            const at = text.search(new RegExp(`["'\`]${id.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}["'\`]`));
            if (at >= 0) problems.push(`${file}:${lineOf(text, at)}: graduated feature "${id}" is still named`);
        }
        if (file.startsWith(`${FEATURES_DIR}/`)) {
            const code = stripCommentsAndStrings(text);
            for (const m of code.matchAll(
                /\blocation\b|\blocalStorage\b|\bsessionStorage\b|\bprocess\.env\b|\bimport\.meta\.env\b/g,
            )) {
                problems.push(
                    `${file}: the features module reads ${m[0]}; the page passes feature ids, the element never reads them from the host`,
                );
            }
        }
    }

    return { problems, flags: rows.map((r) => ({ ...r, files: [...files.get(r.id)].sort() })) };
}

const ageDays = (since, now) => (since ? Math.floor((now - Date.parse(since)) / 86_400_000) : NaN);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const { problems, flags } = checkFeatures(root);
    if (process.argv.includes("--list")) {
        if (flags.length === 0) console.log("No experiments are declared in FEATURES.");
        for (const f of flags) {
            console.log(
                `${f.id}  age ${ageDays(f.since, Date.now())} days (since ${f.since ?? "?"})  issue #${f.issue || "?"}  ${f.files.length} files`,
            );
            for (const file of f.files) console.log(`    ${relative(".", join(root, file)) || file}`);
        }
    }
    if (problems.length > 0) {
        console.error(`check-features: ${problems.length} problem(s)\n${problems.map((p) => `  ${p}`).join("\n")}`);
        process.exit(1);
    }
    if (!process.argv.includes("--list")) console.log(`check-features: ok (${flags.length} experiments declared)`);
}
