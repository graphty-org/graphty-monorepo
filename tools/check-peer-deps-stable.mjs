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
 *   1. a removed required peer dependency (an optional one may go: no install that worked can
 *      break, and tools/check-published-deps.mjs fails a shipped file that still imports it);
 *   2. a new peer dependency, or an optional one made required;
 *   3. a peer dependency moved into dependencies;
 *   4. a narrowed range: one that no longer accepts every version the old range accepted.
 *
 * unless the branch holds a breaking commit scoped to the package since the merge base
 * (`feat(graphty-element)!: ...`, or a `BREAKING CHANGE:` footer under that scope), which is what
 * makes the release a major. A narrowed range or a removed required peer also passes when a
 * commit on the branch declares it with a line
 *
 *   Peer-Change: <package> <peer> <old range> -> <new range, or "removed">
 *
 * (owner, 2026-11-10: while nobody outside consumes the packages, a change that would be breaking
 * lands as an ordinary feat/fix commit whose message says what changed for callers).
 * `workspace:` ranges are internal: tools/check-published-deps.mjs checks them. Widening a range
 * is allowed in a minor.
 *
 * Why it exists: a consumer's install must not break in a minor
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
 * The breaking change to one peer the base declared, if any.
 * @param before - the package.json on the base
 * @param after - the package.json being checked
 * @param name - the peer
 * @param range - its range on the base
 * @returns the message, or undefined when the change is allowed
 */
function existingPeerChange(before, after, name, range) {
    const now = after.peerDependencies ?? {};
    const inDeps = name in (after.dependencies ?? {});
    if (!(name in now)) {
        if (inDeps) return { message: `peer dependency "${name}" moved into dependencies` };
        if (optional(before, name)) return undefined;
        return { message: `peer dependency "${name}" removed`, peer: name, from: range, to: "removed" };
    }
    if (!accepts(range, now[name])) {
        const message = `peer dependency "${name}" narrowed from "${range}" to "${now[name]}"`;
        return { message, peer: name, from: range, to: now[name] };
    }
    if (optional(before, name) && !optional(after, name))
        return { message: `peer dependency "${name}" is now required` };
    return undefined;
}

/**
 * The peer dependency changes between two manifests that only a major may make.
 * @param before - the package.json on the base
 * @param after - the package.json being checked
 * @returns one { message } per breaking change; a narrowed or removed peer also carries the
 *   { peer, from, to } a Peer-Change line must name to declare it
 */
export function peerChanges(before, after) {
    const old = before.peerDependencies ?? {};
    const now = after.peerDependencies ?? {};
    const problems = [];
    for (const [name, range] of Object.entries(old)) {
        if (range.startsWith("workspace:")) continue;
        const problem = existingPeerChange(before, after, name, range);
        if (problem) problems.push(problem);
    }
    for (const name of Object.keys(now)) {
        if (!(name in old) && !now[name].startsWith("workspace:")) {
            problems.push({ message: `new peer dependency "${name}"` });
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
 * Whether a commit message declares one peer change with a Peer-Change line.
 * @param message - the commit's subject and body
 * @param scopes - the names the package goes by
 * @param problem - a narrowed or removed peer from peerChanges
 * @returns true when a line names this package, peer, old range and new range exactly
 */
export function declaresPeerChange(message, scopes, problem) {
    if (!problem.peer) return false;
    const prefix = "Peer-Change:";
    for (const line of message.split("\n")) {
        if (!line.startsWith(prefix)) continue;
        const [left, to, extra] = line.slice(prefix.length).split(" -> ");
        if (to === undefined || extra !== undefined) continue;
        const [pkg, peer, ...from] = left.trim().split(" ");
        if (!scopes.includes(pkg) || peer !== problem.peer) continue;
        if (from.join(" ") === problem.from && to.trim() === problem.to) return true;
    }
    return false;
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
        [variant((m) => delete m.peerDependencies.lit), /^peer dependency "lit" removed$/],
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
        if (problems.length !== 1 || !expected.test(problems[0].message)) {
            console.error(`self-test: expected ${expected}, got ${JSON.stringify(problems)}`);
            failed++;
        }
    }
    const allowed = [
        variant((m) => (m.peerDependencies.ai = "*")),
        variant((m) => (m.peerDependencies.lit = ">=3.0.0")),
        variant((m) => (m.peerDependencies["@x/y"] = "workspace:*")),
        variant((m) => (m.peerDependenciesMeta.lit = { optional: true })),
        variant((m) => delete m.peerDependencies.ai),
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
    const [narrowed] = peerChanges(
        base,
        variant((m) => (m.peerDependencies.lit = "^3.2.0")),
    );
    const [removed] = peerChanges(
        base,
        variant((m) => delete m.peerDependencies.lit),
    );
    const [added] = peerChanges(
        base,
        variant((m) => (m.peerDependencies.react = "*")),
    );
    const declared = [
        ["fix(graphty-element): x\nPeer-Change: graphty-element lit ^3.0.0 -> ^3.2.0", narrowed],
        ["fix: x\n\nPeer-Change: @graphty/graphty-element lit ^3.0.0 -> ^3.2.0\n", narrowed],
        ["fix: x\nPeer-Change: graphty-element lit ^3.0.0 -> removed", removed],
    ];
    const undeclared = [
        ["fix(graphty-element): x", narrowed],
        ["fix: x\nPeer-Change: layout lit ^3.0.0 -> ^3.2.0", narrowed],
        ["fix: x\nPeer-Change: graphty-element ai ^3.0.0 -> ^3.2.0", narrowed],
        ["fix: x\nPeer-Change: graphty-element lit ^3.0.0 -> ^3.3.0", narrowed],
        ["fix: x\nPeer-Change: graphty-element lit ^3.0.0 -> ^3.2.0", removed],
        ["fix: x\nPeer-Change: graphty-element react * -> *", added],
    ];
    for (const [message, problem] of declared) {
        if (!declaresPeerChange(message, [...scopes, "@graphty/graphty-element"], problem)) {
            console.error(`self-test: a declared change was refused: ${JSON.stringify(message)}`);
            failed++;
        }
    }
    for (const [message, problem] of undeclared) {
        if (declaresPeerChange(message, [...scopes, "@graphty/graphty-element"], problem)) {
            console.error(`self-test: an undeclared change was accepted: ${JSON.stringify(message)}`);
            failed++;
        }
    }
    if (failed > 0) {
        console.error(`check-peer-deps-stable self-test FAILED (${failed})`);
        process.exit(1);
    }
    console.log(
        `check-peer-deps-stable self-test: ${cases.length} planted changes failed, the allowed ones passed, ` +
            `${declared.length} Peer-Change lines accepted and ${undeclared.length} wrong ones refused`,
    );
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
        const all = peerChanges(before, after);
        if (all.length === 0) continue;
        const scopes = [dir, after.name, after.name.replace(/^@graphty\//, "")];
        const messages = all.map((p) => p.message).join("; ");
        if (commits.some(([subject, body = ""]) => breaksScope(subject, body, scopes))) {
            console.log(`ok    ${after.name}: peer changes ride a breaking commit: ${messages}`);
            continue;
        }
        const problems = all.filter(
            (p) => !commits.some(([subject, body = ""]) => declaresPeerChange(`${subject}\n${body}`, scopes, p)),
        );
        if (problems.length < all.length) {
            const ok = all.filter((p) => !problems.includes(p)).map((p) => p.message);
            console.log(`ok    ${after.name}: declared by a Peer-Change line: ${ok.join("; ")}`);
        }
        if (problems.length === 0) continue;
        failed += problems.length;
        console.log(`FAIL  ${after.name}`);
        for (const p of problems) console.log(`        ${p.message}`);
    }
    if (failed > 0) {
        console.error(
            `\n${failed} peer dependency change(s) that only a major may make, with no breaking commit scoped to the ` +
                "package and no Peer-Change line declaring it on this branch. Keep the peer, or declare a narrowed or " +
                "removed peer in a commit message with a line `Peer-Change: <package> <peer> <old> -> <new|removed>` " +
                '(CLAUDE.md, "Public API and breaking changes").',
        );
        process.exit(1);
    }
    console.log("Peer dependencies: no breaking change");
}
