/**
 * A throwaway repository with a bare remote, whose commits can be signed with a test SSH key that
 * the repository trusts, so `git log --format=%G?` reports `G` without touching the owner's GPG
 * keyring. Call `isolateGit()` from visual-review's helpers first.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { git } from "../../../visual-review/test/helpers.mjs";
import { tempDir } from "./temp-dir.mjs";

/**
 * Writes a file, creating its directory.
 * @param {string} path the file
 * @param {string} data its contents
 */
export function put(path, data) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
}

/**
 * Stages everything and commits it.
 * @param {string} cwd the worktree
 * @param {string} message the commit message
 * @param {{sign?: boolean}} [options] sign with the test key (the default)
 * @returns {string} the new commit's SHA
 */
export function commitAll(cwd, message, { sign = true } = {}) {
    git(cwd, "add", "-A");
    // The summary line (`[master <sha>] message`) names the commit in full, so no `git rev-parse`
    // process follows: a test's time is mostly the git processes it runs one after another.
    const out = git(cwd, "-c", "core.abbrev=40", "commit", ...(sign ? ["-S"] : []), "-m", message);
    return /** @type {RegExpExecArray} */ (/ ([0-9a-f]{40})\] /.exec(out))[1];
}

/**
 * Builds a repository as `makeRepo` returns it, from git commands.
 * @returns {{tmp: string, root: string, remote: string}} the paths
 */
function buildRepo() {
    const tmp = tempDir("githerd-git-");
    const remote = join(tmp, "remote.git");
    const root = join(tmp, "root");
    const key = join(tmp, "key");
    execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "test", "-f", key]);
    writeFileSync(join(tmp, "allowed"), `test@example.com ${readFileSync(`${key}.pub`, "utf8")}`);
    git(tmp, "init", "-q", "--bare", "-b", "master", remote);
    git(tmp, "init", "-q", "-b", "master", root);
    for (const [k, v] of [
        ["user.name", "Test"],
        ["user.email", "test@example.com"],
        ["gpg.format", "ssh"],
        ["user.signingkey", key],
        ["gpg.ssh.allowedSignersFile", join(tmp, "allowed")],
    ]) {
        git(root, "config", k, v);
    }
    git(root, "remote", "add", "origin", remote);
    put(join(root, ".gitignore"), "/.worktrees/\n");
    put(join(root, "README.md"), "hello\n");
    put(join(root, "CLAUDE.md"), "rules\n");
    put(join(root, "visual-baselines/a.png"), "baseline-1\n");
    commitAll(root, "chore: first");
    git(root, "push", "-q", "origin", "master");
    return { tmp, root, remote };
}

/** @type {string | null} a repository this test file built and never hands out, which each copies */
let template = null;

/**
 * Creates `<tmp>/remote.git` and the clone `<tmp>/root` on branch master with one signed commit,
 * configured to sign with a fresh SSH key it trusts. Each is a copy of one repository the test file
 * builds with git at its first call, with the clone's config (key, trust list, remote) pointed at
 * the copy: a copy runs no process, and building runs fifteen, one after another, which on a
 * machine busy with gates took seconds of the calling test's time.
 * @returns {{tmp: string, root: string, remote: string}} the paths
 */
export function makeRepo() {
    if (template === null || !existsSync(template)) template = buildRepo().tmp;
    const tmp = tempDir("githerd-git-");
    cpSync(template, tmp, { recursive: true });
    const config = join(tmp, "root", ".git", "config");
    writeFileSync(config, readFileSync(config, "utf8").replaceAll(template, tmp));
    return { tmp, root: join(tmp, "root"), remote: join(tmp, "remote.git") };
}
