#!/usr/bin/env node
/**
 * check-owned-closure.mjs -- the owned-closure rule of design/ci/channels-pipeline.md, section 6.2.
 *
 * .github/CODEOWNERS lists the paths that wait for the owner's review. An owned script or workflow that
 * imports or runs an unowned file can be loosened through that file without the owner seeing it, so this
 * check follows every owned file's references and fails naming each unowned file it reaches. A reference
 * is a relative import (the selector's import graph, tools/test-select.mjs `literalPaths`) or a
 * repository path a workflow, shell script or string literal names (`node tools/x.mjs`). Comments are not
 * read and Markdown is not followed; `leftOut` and `NOT_ROOT` below name what else is not.
 *
 * Usage:
 *   node tools/check-owned-closure.mjs [--root <checkout>]
 *       exit 1 naming each unowned file an owned file reaches; add them to CODEOWNERS
 *   node tools/check-owned-closure.mjs --replay [--root <checkout>] [--ref origin/golden]
 *       [--since 2026-10-18] [--until 2026-10-25]
 *       the first-parent commits of <ref> in the window, and those whose change touches an owned path
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildInput, globToRe, literalPaths, pathIndex } from "./test-select.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Files whose references are followed: code, workflows, shell, JSON configs. */
const FOLLOWED = /\.(?:[cm]?[jt]sx?|ya?ml|sh|py|json)$/u;
/** A run of path characters; one with a `/` and a code or data extension names a repository path. */
const PATH_RUN = /[\w@./+-]+/gu;
const PATH_EXT = /\.(?:[cm]?[jt]sx?|sh|py|json)$/u;
const JS = /\.[cm]?[jt]sx?$/u;
/** A workflow's `working-directory: <dir>` (group 1), quoted or not, in block or flow style. */
const WORKING_DIR = /working-directory:\s*["']?([\w@./+-]+)/gu;
/** A JS string literal (kept, group 1) or a comment (removed). */
const JS_COMMENT = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/.*/gu;
/** A variable a path is written under (`$CLAUDE_PROJECT_DIR/`, `${{ github.workspace }}/`): the checkout's root. */
const ROOT_VAR = /\$\{\{[^}]*\}\}\/|\$\{?\w+\}?\//gu;
/**
 * Owned files that start no walk: agent prompts and skills, whose paths are instructions to an agent and
 * not code the pipeline runs.
 */
const NOT_ROOT = /^\.claude\/(?:workflows|skills)\//u;
/**
 * Reached files that are not followed or named: tests (the integrity check covers them), package.json (its
 * scripts are the integrity check's too), and a package's product source, which a setup file imports to
 * test it and which the pipeline does not run.
 * @param f a repo-relative path
 * @returns boolean
 */
const leftOut = (f) =>
    !buildInput(f) ||
    f.includes("node_modules/") ||
    /(^|\/)package\.json$/u.test(f) ||
    /^(?!tools\/)[^/]+\/src\//u.test(f);

/**
 * The patterns of a CODEOWNERS file, each as a RegExp over repo-relative paths. Supports what GitHub's
 * syntax needs here: a leading `/` anchors, a trailing `/` is a directory, `*` and `**`.
 * @param text the file's contents
 * @returns `[{ pattern, re }]`
 */
export function parseCodeowners(text) {
    return text
        .split("\n")
        .map((l) => l.replace(/#.*/u, "").trim().split(/\s+/u)[0])
        .filter(Boolean)
        .map((pattern) => {
            const anchored = pattern.startsWith("/") || pattern.slice(0, -1).includes("/");
            const dir = pattern.endsWith("/");
            const body = globToRe(pattern.replace(/^\//u, "").replace(/\/$/u, "")).source.slice(1, -1);
            return {
                pattern,
                re: new RegExp(`^${anchored ? "" : "(?:.*/)?"}${body}${dir ? "/.*" : "(?:/.*)?"}$`, "u"),
            };
        });
}

/**
 * Whether CODEOWNERS owns a path.
 * @param rules parseCodeowners()
 * @param path a repo-relative path
 * @returns boolean
 */
export const isOwned = (rules, path) => rules.some((r) => r.re.test(path));

/**
 * A file's text without comments: `//` and block comments in code, `#` comments elsewhere. JSON is kept.
 * @param file a repo-relative path
 * @param text its contents
 * @returns text
 */
export function withoutComments(file, text) {
    if (JS.test(file)) {
        // strings are kept whole, so a glob such as "tools/*.mjs" or a URL does not open a comment
        return text.replaceAll(JS_COMMENT, (_, str) => str ?? "");
    }
    return file.endsWith(".json") ? text : text.replaceAll(/(^|\s)#.*$/gmu, "$1");
}

// A loop, not a regex such as /\/+$/, which backtracks on a long run of the character.
const trimEnd = (text, ch) => {
    let end = text.length;
    while (end > 0 && text[end - 1] === ch) end--;
    return text.slice(0, end);
};

/**
 * The tracked files one file references: its relative imports and `../` literals (the selector's graph)
 * and the repository paths its text names, resolved from its folder or the checkout's root (a leading `/`,
 * as in nx's `{workspaceRoot}/`, is the root).
 * @param root the checkout
 * @param file a repo-relative path
 * @param index pathIndex(root)
 * @returns Set of repo-relative paths
 */
export function referencedFiles(root, file, index) {
    const out = new Set();
    if (JS.test(file)) {
        const { imports, runs } = literalPaths(root, file, index);
        [...imports, ...runs].forEach((f) => out.add(f));
    }
    let text = "";
    try {
        text = withoutComments(file, readFileSync(join(root, file), "utf8"));
    } catch {
        return out;
    }
    // a workflow's `working-directory:` (a job's, a step's or `defaults.run`'s) is a folder its paths resolve from
    const bases = [posix.dirname(file), ""];
    if (/\.ya?ml$/u.test(file)) {
        for (const [, dir] of text.matchAll(WORKING_DIR)) {
            bases.push(trimEnd(dir.replace(/^\.\//u, ""), "/"));
        }
    }
    for (const [run] of text.replaceAll(ROOT_VAR, " ").matchAll(PATH_RUN)) {
        const path = trimEnd(run, ".");
        if (!path.includes("/") || !PATH_EXT.test(path)) {
            continue;
        }
        const rel = path.replace(/^\/+/u, "");
        const hit = [
            posix.normalize(posix.join(posix.dirname(file), path)),
            ...bases.map((b) => posix.normalize(posix.join(b, rel))),
        ].find((p) => index.files.has(p));
        if (hit && hit !== file) {
            out.add(hit);
        }
    }
    return out;
}

/**
 * Every unowned file the owned files reach, with the owned file that started the walk and the file that
 * referenced it.
 * @param root the checkout
 * @param rules parseCodeowners()
 * @returns Map(unowned file -> `{ from, via }`)
 */
export function unownedClosure(root, rules) {
    const index = pathIndex(root);
    // A file left out when reached (a test an owned directory or glob covers) starts no walk either.
    const owned = [...index.files].filter(
        (f) => isOwned(rules, f) && FOLLOWED.test(f) && !NOT_ROOT.test(f) && !leftOut(f),
    );
    const seen = new Map(owned.map((f) => [f, { from: f, via: null }]));
    const todo = [...owned];
    const unowned = new Map();
    while (todo.length > 0) {
        const f = todo.pop();
        for (const ref of referencedFiles(root, f, index)) {
            if (seen.has(ref) || leftOut(ref)) {
                continue;
            }
            seen.set(ref, { from: seen.get(f).from, via: f });
            if (!isOwned(rules, ref)) {
                unowned.set(ref, seen.get(ref));
            }
            // a JSON file reached is data an owned file reads: named, not followed
            if (FOLLOWED.test(ref) && !ref.endsWith(".json")) {
                todo.push(ref);
            }
        }
    }
    return unowned;
}

/**
 * The first-parent commits of a ref in a window, and which of them change an owned path.
 * @param root the checkout
 * @param rules parseCodeowners()
 * @param opts the window
 * @param opts.ref the ref whose first-parent history is read
 * @param opts.since git's --since
 * @param opts.until git's --until
 * @returns `{ total, owned: [{ sha, subject, files }] }`
 */
export function replay(root, rules, { ref, since, until }) {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
    const log = git(["log", "--first-parent", "--format=%H%x09%P%x09%s", `--since=${since}`, `--until=${until}`, ref]);
    const commits = log
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("\t"));
    const owned = [];
    for (const [sha, parents, subject] of commits) {
        const parent = parents.split(" ")[0];
        const files = parent ? git(["diff", "--name-only", "--no-renames", parent, sha]).split("\n") : [];
        const hits = files.filter((f) => f && isOwned(rules, f));
        if (hits.length > 0) {
            owned.push({ sha, subject, files: hits });
        }
    }
    return { total: commits.length, owned };
}

function main(argv) {
    const arg = (name, fallback) => {
        const i = argv.indexOf(name);
        return i === -1 ? fallback : argv[i + 1];
    };
    const root = resolve(arg("--root", join(HERE, "..")));
    const rules = parseCodeowners(readFileSync(join(root, ".github/CODEOWNERS"), "utf8"));
    if (argv.includes("--replay")) {
        const opts = {
            ref: arg("--ref", "origin/golden"),
            since: arg("--since", "2026-10-18"),
            until: arg("--until", "2026-10-25"),
        };
        const { total, owned } = replay(root, rules, opts);
        for (const o of owned) {
            console.log(`${o.sha.slice(0, 10)} ${o.subject}\n    ${o.files.join("\n    ")}`);
        }
        console.log(
            `${owned.length} of ${total} first-parent commits of ${opts.ref} (${opts.since} to ${opts.until}) touch an owned path`,
        );
        return 0;
    }
    const unowned = unownedClosure(root, rules);
    for (const [file, { from, via }] of [...unowned].sort(([a], [b]) => a.localeCompare(b))) {
        const through = via === from ? "" : ` via ${via}`;
        console.log(`unowned: ${file}  (reached from ${from}${through})`);
    }
    if (unowned.size > 0) {
        console.log(`${unowned.size} unowned files are reached from owned files: add them to .github/CODEOWNERS`);
        return 1;
    }
    console.log("owned closure: every file an owned file reaches is owned");
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    process.exitCode = main(process.argv.slice(2));
}
