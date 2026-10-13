#!/usr/bin/env node
/**
 * check-peer-deps-stable.mjs -- a published package's peer dependencies change only in a major.
 *
 * A consumer installs a package's peers themselves, so a peer that appears, disappears, becomes
 * required, moves into dependencies or accepts fewer versions breaks an install that worked. That
 * is a breaking change, released only in a major. This compares every published workspace
 * package's package.json with the one on the merge base with origin/master ($PEER_DEPS_BASE
 * overrides the base) and fails on:
 *
 *   1. a removed peer dependency;
 *   2. a new peer dependency, or an optional one made required;
 *   3. a peer dependency moved into dependencies;
 *   4. a narrowed range: one that no longer accepts every version the old range accepted.
 *
 * unless the branch holds a breaking commit scoped to the package since the merge base
 * (`feat(graphty-element)!: ...`, or a `BREAKING CHANGE:` footer under that scope), which is what
 * makes the release a major. `workspace:` ranges are internal: tools/check-published-deps.mjs
 * checks them. Widening a range is allowed in a minor.
 *
 * Why it exists: graphty-element's AI SDK peers are to be removed when TanStack AI replaces the
 * SDK, and nothing would have stopped that removal from shipping in a minor
 * (design/ai/tanstack-ai-harness-design.md, section 7, rule 7).
 *
 * Usage: node tools/check-peer-deps-stable.mjs [--self-test]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import semver from "semver";

import { workspaceDirs } from "./workspace-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Whether a peer is optional in a manifest.
 * @param manifest - a package.json
 * @param name - the peer
 * @returns true when peerDependenciesMeta marks it optional
 */
function optional(manifest, name) {
    return manifest.peerDependenciesMeta?.[name]?.optional === true;
}

/**
 * Whether a new range accepts every version the old one did.
 * @param before - the old range
 * @param after - the new range
 * @returns true when nothing is narrowed
 */
function accepts(before, after) {
    if (before === after) return true;
    if (!semver.validRange(before) || !semver.validRange(after)) return false;
    return semver.subset(before, after);
}

/**
 * The peer dependency changes between two manifests that only a major may make.
 * @param before - the package.json on the base
 * @param after - the package.json being checked
 * @returns one message per breaking change
 */
export function peerChanges(before, after) {
    const old = before.peerDependencies ?? {};
    const now = after.peerDependencies ?? {};
    const problems = [];
    for (const [name, range] of Object.entries(old)) {
        if (range.startsWith("workspace:")) continue;
        if (!(name in now)) {
            problems.push(
                name in (after.dependencies ?? {})
                    ? `peer dependency "${name}" moved into dependencies`
                    : `peer dependency "${name}" removed`,
            );
        } else if (!accepts(range, now[name])) {
            problems.push(`peer dependency "${name}" narrowed from "${range}" to "${now[name]}"`);
        } else if (optional(before, name) && !optional(after, name)) {
            problems.push(`peer dependency "${name}" is now required`);
        }
    }
    for (const name of Object.keys(now)) {
        if (!(name in old) && !now[name].startsWith("workspace:")) {
            problems.push(`new peer dependency "${name}"`);
        }
    }
    return problems;
}

/**
 * Whether a commit is a breaking change scoped to a package.
 * @param subject - the commit's subject line
 * @param body - the commit's body
 * @param scopes - the names the package goes by in a scope
 * @returns true for `type(scope)!:` or a `BREAKING CHANGE:` footer under that scope
 */
export function breaksScope(subject, body, scopes) {
    const header = /^\w+\(([^)]*)\)(!)?:/.exec(subject);
    if (!header || !header[1].split(",").some((s) => scopes.includes(s.trim()))) return false;
    return header[2] === "!" || /^BREAKING[ -]CHANGE:/m.test(body);
}

/**
 * Runs git in the repository.
 * @param args - git's arguments
 * @returns its output
 */
function git(...args) {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
}

/**
 * Plants each kind of breaking peer change, and a change that is allowed, and fails unless each
 * is judged right.
 */
function selfTest() {
    const base = {
        dependencies: { zod: "^4.0.0" },
        peerDependencies: { ai: "^5.0.0", lit: "^3.0.0", "@mlc-ai/web-llm": ">=0.2.0", "@x/y": "workspace:^" },
        peerDependenciesMeta: { ai: { optional: true }, "@mlc-ai/web-llm": { optional: true } },
    };
    const variant = (change) => {
        const copy = structuredClone(base);
        change(copy);
        return copy;
    };
    const cases = [
        [variant((m) => delete m.peerDependencies.ai), /^peer dependency "ai" removed$/],
        [variant((m) => (m.peerDependencies.react = "*")), /^new peer dependency "react"$/],
        [variant((m) => delete m.peerDependenciesMeta.ai), /^peer dependency "ai" is now required$/],
        [
            variant((m) => {
                delete m.peerDependencies.lit;
                m.dependencies.lit = "^3.0.0";
            }),
            /^peer dependency "lit" moved into dependencies$/,
        ],
        [variant((m) => (m.peerDependencies.lit = "^3.2.0")), /^peer dependency "lit" narrowed/],
    ];
    let failed = 0;
    for (const [after, expected] of cases) {
        const problems = peerChanges(base, after);
        if (problems.length !== 1 || !expected.test(problems[0])) {
            console.error(`self-test: expected ${expected}, got ${JSON.stringify(problems)}`);
            failed++;
        }
    }
    const allowed = [
        variant((m) => (m.peerDependencies.ai = "*")),
        variant((m) => (m.peerDependencies.lit = ">=3.0.0")),
        variant((m) => (m.peerDependencies["@x/y"] = "workspace:*")),
        variant((m) => (m.peerDependenciesMeta.lit = { optional: true })),
    ];
    for (const after of allowed) {
        const problems = peerChanges(base, after);
        if (problems.length > 0) {
            console.error(`self-test: a widened or internal change failed: ${JSON.stringify(problems)}`);
            failed++;
        }
    }
    const scopes = ["graphty-element"];
    const breaking = [
        ["feat(graphty-element)!: drop the AI SDK peers", ""],
        ["refactor(graphty,graphty-element)!: x", ""],
        ["feat(graphty-element): x", "BREAKING CHANGE: the ai peer is gone"],
    ];
    const notBreaking = [
        ["feat(graphty-element): x", ""],
        ["feat(layout)!: x", ""],
        ["feat!: x", ""],
    ];
    for (const [subject, body] of breaking) if (!breaksScope(subject, body, scopes)) failed++;
    for (const [subject, body] of notBreaking) if (breaksScope(subject, body, scopes)) failed++;
    if (failed > 0) {
        console.error(`check-peer-deps-stable self-test FAILED (${failed})`);
        process.exit(1);
    }
    console.log(`check-peer-deps-stable self-test: ${cases.length} planted changes failed, the allowed ones passed`);
}

if (process.argv.includes("--self-test")) {
    selfTest();
} else {
    const base = git("merge-base", "HEAD", process.env.PEER_DEPS_BASE ?? "origin/master").trim();
    const commits = git("log", "--format=%s%x00%b%x1e", `${base}..HEAD`)
        .split("\x1e")
        .map((c) => c.trim().split("\0"))
        .filter(([subject]) => subject);
    let failed = 0;
    for (const dir of workspaceDirs(root)) {
        const file = path.join(root, dir, "package.json");
        if (!fs.existsSync(file)) continue;
        const after = JSON.parse(fs.readFileSync(file, "utf8"));
        if (after.private) continue;
        let before;
        try {
            before = JSON.parse(git("show", `${base}:${dir}/package.json`));
        } catch {
            continue; // a new package: nothing published to stay compatible with
        }
        const problems = peerChanges(before, after);
        if (problems.length === 0) continue;
        const scopes = [dir, after.name, after.name.replace(/^@graphty\//, "")];
        if (commits.some(([subject, body = ""]) => breaksScope(subject, body, scopes))) {
            console.log(`ok    ${after.name}: peer changes ride a breaking commit: ${problems.join("; ")}`);
            continue;
        }
        failed += problems.length;
        console.log(`FAIL  ${after.name}`);
        for (const p of problems) console.log(`        ${p}`);
    }
    if (failed > 0) {
        console.error(
            `\n${failed} peer dependency change(s) that only a major may make, and no breaking commit scoped to the ` +
                "package on this branch. Keep the peer, or land the change with the package's next major " +
                '(CLAUDE.md, "Breaking changes and major releases").',
        );
        process.exit(1);
    }
    console.log("Peer dependencies: no breaking change");
}
