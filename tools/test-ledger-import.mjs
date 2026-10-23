#!/usr/bin/env node
// The one-time import of the test history already on disk into the test ledger (design/ci/test-ledger.md 9):
// every gate in tmp/push-log.jsonl and every shard pass in tmp/prepush-passes/shard/, as kinds `import-*`, which
// count in flaky statistics but are never exoneration evidence. Run once (2026-10-23); idempotent, since record
// ids are hashes. Delete this file once the imported records age out (120 days, `prune`).
//
//   node tools/test-ledger-import.mjs     imports, then rebuilds the ledger's index

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

import { failureHashes, familyOf, ledgerDir, outcomeOf, rebuild, writeRecord } from "./test-ledger.mjs";

const h16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const git = (cwd, args) => {
    try {
        return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
        return "";
    }
};
const list = (d) => (existsSync(d) ? readdirSync(d) : []);
const readJsonText = (t) => {
    try {
        return JSON.parse(t);
    } catch {
        return null;
    }
};
const readJson = (p) => readJsonText(existsSync(p) ? readFileSync(p, "utf8") : "");

/**
 * The same facts from a Vitest log, for the one-time import of kept gate logs (no JUnit was written then):
 * the per-file lines and the "Failed Tests" section.
 * @param log the log
 * @param pkg the package directory
 * @returns `{ files: Map, failures: [] }`
 */
export function parseVitestLog(log, pkg) {
    const into = { files: new Map(), failures: [] };
    const text = stripVTControlCharacters(log);
    const fileLine = /^ [✓❯] (?:\|[^|]+\| )?(\S+) \((\d+) tests?(?: \| (\d+) failed)?(?: \| (\d+) skipped)?\)/gm;
    for (const [, path, n, failed = 0, skipped = 0] of text.matchAll(fileLine)) {
        const f = into.files.get(`${pkg}/${path}`) ?? { passed: 0, failed: 0, skipped: 0, ms: 0, dup: 0 };
        f.failed += Number(failed);
        f.skipped += Number(skipped);
        f.passed += Number(n) - Number(failed) - Number(skipped);
        into.files.set(`${pkg}/${path}`, f);
    }
    const at = text.lastIndexOf("Failed Tests ");
    let heads = [];
    let block = [];
    const flush = () => {
        heads.forEach(([file, name]) => into.failures.push({ file, name, text: block.join("\n") }));
        heads = [];
        block = [];
    };
    for (const line of at < 0 ? [] : text.slice(at).split("\n").slice(1)) {
        const head = /^ FAIL {2}(?:\|[^|]+\| )?(\S+) > (.+)$/.exec(line);
        if (head && block.length) flush();
        if (head) heads.push([`${pkg}/${head[1]}`, head[2].trim()]);
        else if (/^⎯/.test(line) || /^\s*Test Files\s/.test(line)) flush();
        else if (heads.length) block.push(line);
    }
    flush();
    return into;
}

const importKind = (cwd = "") => {
    const wt = /\.worktrees\/([^/]+)/.exec(cwd)?.[1] ?? "";
    if (/^land-check|^golden-local$/.test(wt)) return "import-land-check";
    if (/^golden-verify/.test(wt)) return "import-verify";
    if (/^golden-bisect/.test(wt)) return "import-bisect";
    // a cut's gate tests a golden commit in a tool-owned worktree
    if (/^golden-cut/.test(wt)) return "import-cut";
    return "import-push";
};

/**
 * Imports what the machine already kept, as kinds `import-*` that are never exoneration evidence: every gate
 * in tmp/push-log.jsonl (shard verdicts from its saved lines and gate log; the failures from each failed
 * shard's kept log), and every shard pass in tmp/prepush-passes/shard/. A pass learns its file list from a
 * failed run of the same shard on the same tree, which ran the same files.
 * @param main the main checkout
 * @param [env] the environment
 * @returns counts
 */
export async function importHistory(main, env = process.env) {
    const dir = ledgerDir(env, main);
    const { SHARDS } = await import(pathToFileURL(join(main, "tools/ci-test-matrix.mjs")).href);
    const known = new Map(SHARDS.map((s) => [s.shard, s]));
    // A shard the matrix no longer (or not yet) lists is read as its family's (graphty-3 as graphty).
    const shardOf = { get: (n) => known.get(n) ?? known.get(familyOf(n)) };
    shardOf.has = (n) => Boolean(shardOf.get(n));
    const recs = new Map();
    const trees = new Map();
    const treeOf = (sha) =>
        trees.has(sha)
            ? trees.get(sha)
            : trees.set(sha, git(main, ["rev-parse", "-q", "--verify", `${sha}^{tree}`]) || null).get(sha);
    const add = (r) => {
        const s = shardOf.get(r.shard);
        if (!s || !r.commit) return;
        const hash = h16([r.commit, r.shard, r.at, r.outcome].join("\0")).slice(0, 8);
        const id = `${Date.parse(r.at)}-imp${hash}-${r.shard}`;
        const v = r.selected ? "+files" : "";
        recs.set(id, {
            v: 1,
            id,
            kind: r.kind,
            branch: r.branch ?? null,
            commit: r.commit,
            tree: treeOf(r.commit),
            base: null,
            dirty: false,
            shard: r.shard,
            family: familyOf(r.shard),
            variant: familyOf(r.shard) + v,
            selected: r.selected ? [] : null,
            outcome: r.outcome,
            reused_from: null,
            started_at: new Date(Date.parse(r.at)).toISOString(),
            secs: 0,
            log: r.log ?? null,
            files: r.files ?? [],
            failures: r.failures ?? [],
            exonerations: [],
        });
    };
    const log = join(main, "tmp/push-log.jsonl");
    const entries = (existsSync(log) ? readFileSync(log, "utf8") : "").split("\n").map(readJsonText);
    entries.filter((e) => e?.sha).forEach((e) => importGate(e, { add, shardOf, main }));
    for (const f of list(join(main, "tmp/prepush-passes/shard"))) {
        const p = readJson(join(main, "tmp/prepush-passes/shard", f));
        if (p?.sha)
            add({
                kind: p.branch ? "import-push" : "import-detached",
                branch: p.branch,
                commit: p.sha,
                at: p.at,
                shard: p.shard,
                outcome: "passed",
            });
    }
    const filesOf = new Map(
        [...recs.values()].filter((r) => r.files.length).map((r) => [`${r.shard}\0${r.tree}\0${r.variant}`, r.files]),
    );
    for (const r of recs.values()) {
        const sibling = r.outcome === "passed" && filesOf.get(`${r.shard}\0${r.tree}\0${r.variant}`);
        if (sibling) r.files = sibling.map(([f, p, x, s, ms]) => [f, p + x, 0, s, ms, 0]);
        writeRecord(dir, r);
    }
    return {
        invocations: recs.size,
        failed: [...recs.values()].filter((r) => r.outcome === "failed").length,
        results: [...recs.values()].reduce((n, r) => n + r.files.reduce((m, f) => m + f[1] + f[2], 0), 0),
        failures: [...recs.values()].reduce((n, r) => n + r.failures.length, 0),
    };
}

/**
 * One gate of the push log: its saved lines and, when it is still on disk, its whole log.
 * @param e the push log entry
 * @param io as importLine's
 */
function importGate(e, io) {
    const gate = existsSync(e.gateLog ?? "") ? readFileSync(e.gateLog, "utf8").split("\n") : [];
    const base = { kind: importKind(e.cwd), branch: e.branch, commit: e.sha, at: e.startedAt ?? e.at };
    for (const l of new Set([...(e.gate ?? []), ...gate])) importLine(l, base, io);
}

/**
 * One line of a gate's output: a `[PASS] <shard>` line, or the `[FAIL] <shard>: its whole log is kept in <file>`
 * line, whose kept log gives the files and failures.
 * @param l the line
 * @param base the gate's kind, branch, commit and time
 * @param io where it goes
 * @param io.add adds a record
 * @param io.shardOf the matrix entry of a shard name
 * @param io.main the main checkout
 */
function importLine(l, base, { add, shardOf, main }) {
    const pass = /^\s*\[PASS\] (\S+)( \[selected)?/.exec(l);
    if (pass) add({ ...base, shard: pass[1], selected: Boolean(pass[2]), outcome: "passed" });
    const kept = /\[FAIL\] (\S+): its whole log is kept in (\S+)/.exec(l);
    if (!kept || !existsSync(kept[2]) || !shardOf.has(kept[1])) return;
    const text = factLines(readFileSync(kept[2], "utf8"));
    const parsed = parseVitestLog(text, shardOf.get(kept[1]).package);
    // a run of selected files names them on its command line
    const selected = /\.test\.[cm]?[jt]sx?\b/.test(/^==> \S+: (.*)$/m.exec(text)?.[1] ?? "");
    const failures = parsed.failures.map((f) => ({
        file: f.file,
        name: f.name,
        ...failureHashes(f.text, f.file, main),
        message: f.text.slice(0, 2000),
    }));
    const outcome = outcomeOf({ code: 1, log: text, junit: { failures, bad: false } });
    const files = [...parsed.files].map(([f, c]) => [f, c.passed, c.failed, c.skipped, c.ms, c.dup]);
    add({ ...base, shard: kept[1], selected, outcome, files, failures, log: kept[2] });
}

/**
 * The lines of a kept gate log the import reads (a log can hold millions of lines of DOM dumps): the command,
 * the per-file and summary lines, and each failure's heading with the 8 lines after it.
 * @param text the log
 * @returns those lines
 */
function factLines(text) {
    const out = [];
    let after = 0;
    for (let pos = 0; pos < text.length;) {
        let end = text.indexOf("\n", pos);
        if (end === -1) end = text.length;
        const line = text.slice(pos, end);
        pos = end + 1;
        if (/^ (?:[✓❯]|FAIL) |Test Files |^\s+(?:Tests|Errors) |^==> |Failed Tests |^⎯/.test(line)) {
            out.push(line);
            after = line.startsWith(" FAIL ") ? 8 : 0;
        } else if (after-- > 0) out.push(line);
    }
    return out.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const main = dirname(git(process.cwd(), ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
    console.log(JSON.stringify(await importHistory(main)));
    console.log(`ledger: rebuilt as ${rebuild()}`);
}
