#!/usr/bin/env node
// Keeps the main checkout following master. Sessions read CLAUDE.md, the skills, .claude/settings.json and the round
// tools from the main checkout, and `tools/live.sh workspace` puts unmerged branches there, so it drifts both ways.
// The only merge used to sit in a prose step of the rounds that they skipped: by 2026-11-17 the main checkout was 465
// commits behind master and conflicting, and the issue round ran a stale tools/issue-groups.mjs.
//
// `issue-groups.mjs check --fix` (every round) calls syncWorkspace(). Under a lock it fetches, asks
// `git merge-tree --write-tree HEAD origin/master` whether the merge is clean, and only then runs a signed
// `git merge --no-edit origin/master` (git itself refuses to overwrite a dirty file the merge would touch). Any failure,
// a locked gpg agent included, ends in `git merge --abort`; it never passes --no-gpg-sign and never merges a branch
// other than master. It records { behind, ahead, conflict, at, behindSince, error } in tmp/workspace-sync.json, which
// `issue-groups.mjs idle` reads: a conflict, or being behind for over an hour, is a sink the round must clear.
//
//   node tools/workspace-sync.mjs        sync the main checkout (git's common directory's parent), print the record
import { execFileSync } from "node:child_process";
import {
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GIT_TIMEOUT_MS = 120_000; // a merge that waits on a pinentry prompt with no terminal is killed, then aborted

const git = (root, args, timeout = GIT_TIMEOUT_MS) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout }).trim();

// The merge runs in a new session with no controlling terminal, so the Commitizen prepare-commit-msg hook (it opens
// /dev/tty when it can) and a pinentry prompt fail at once instead of waiting.
const detached = (root, args) =>
    execFileSync("setsid", ["-w", "git", ...args], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: GIT_TIMEOUT_MS,
    }).trim();

const tryGit = (root, args, run = git) => {
    try {
        return { ok: true, out: run(root, args) };
    } catch (error) {
        return { ok: false, status: error.status, out: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim() };
    }
};

const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === "EPERM";
    }
};

// O_EXCL lock in git's common directory; a dead holder's lock is broken, a live one means another sync is running.
const lock = (path) => {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const fd = openSync(path, "wx");
            writeFileSync(fd, String(process.pid));
            return fd;
        } catch (error) {
            if (error.code !== "EEXIST") throw error;
        }
        let holder = 0;
        try {
            holder = Number(readFileSync(path, "utf8"));
        } catch {
            // removed between the open and the read
        }
        if (holder && alive(holder)) return null;
        try {
            unlinkSync(path);
        } catch {
            // another process broke it first
        }
    }
    return null;
};

const count = (root, range) => Number(tryGit(root, ["rev-list", "--count", range]).out) || 0;

// Fetches, then merges origin/master only on master and only when merge-tree says it is clean; fills in the record.
const mergeIfClean = (root, common, record) => {
    const fetched = tryGit(root, ["fetch", "-q", "--no-tags", "origin", "master"]);
    if (!fetched.ok) record.error = `fetch failed: ${fetched.out.split("\n")[0]}`;
    const branch = tryGit(root, ["symbolic-ref", "-q", "--short", "HEAD"]).out;
    record.behind = count(root, "HEAD..origin/master");
    record.ahead = count(root, "origin/master..HEAD");
    if (branch !== "master") {
        record.error = `the main checkout is on ${branch || "a detached HEAD"}, not master`;
        return;
    }
    if (record.behind === 0) return;
    const tree = tryGit(root, ["merge-tree", "--write-tree", "HEAD", "origin/master"]);
    if (!tree.ok) {
        record.conflict = tree.status === 1;
        if (!record.conflict) record.error = `merge-tree failed: ${tree.out.split("\n")[0]}`;
        return;
    }
    const merged = tryGit(root, ["merge", "--no-edit", "origin/master"], detached);
    if (!merged.ok) {
        if (existsSync(join(common, "MERGE_HEAD"))) tryGit(root, ["merge", "--abort"]);
        record.error = `merge failed and was aborted: ${merged.out.split("\n").at(-1)}`;
    }
    record.behind = count(root, "HEAD..origin/master");
    record.ahead = count(root, "origin/master..HEAD");
};

/**
 * Merges origin/master into the main checkout when it merges cleanly, and records where the checkout stands.
 * @param root the main checkout
 * @param o `{ now }`
 * @returns the record, plus `line` for the round's output
 */
export function syncWorkspace(root, o = {}) {
    const now = o.now ?? Date.now();
    const common = resolve(root, git(root, ["rev-parse", "--git-common-dir"]));
    const fd = lock(join(common, "workspace-sync.lock"));
    if (fd === null) return { line: "workspace: another sync is running" };
    const recordPath = join(root, "tmp", "workspace-sync.json");
    let prev = null;
    try {
        prev = JSON.parse(readFileSync(recordPath, "utf8"));
    } catch {
        // first sync
    }
    const record = { at: new Date(now).toISOString(), behind: 0, ahead: 0, conflict: false, error: null };
    try {
        mergeIfClean(root, common, record);
    } finally {
        closeSync(fd);
        unlinkSync(join(common, "workspace-sync.lock"));
    }
    const stillBehind = prev?.behind > 0 ? (prev.behindSince ?? prev.at) : record.at;
    record.behindSince = record.behind > 0 ? stillBehind : null;
    mkdirSync(join(root, "tmp"), { recursive: true });
    writeFileSync(`${recordPath}.tmp`, `${JSON.stringify(record)}\n`);
    renameSync(`${recordPath}.tmp`, recordPath);
    const state = record.conflict ? ", CONFLICTS with master: merge it by hand" : "";
    const err = record.error ? ` (${record.error})` : "";
    return { ...record, line: `workspace: behind ${record.behind}, ahead ${record.ahead}${state}${err}` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { mainRoot } = await import("./issue-queue.mjs");
    console.log(syncWorkspace(mainRoot()).line);
}
