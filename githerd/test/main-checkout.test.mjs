import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { updateMainCheckout } from "../lib/main-checkout.mjs";

/** @type {string} */
let tmp;
/** @type {string} the main checkout, behind origin by one commit */
let root;
/** @type {string} another clone, which advances origin */
let other;

/**
 * Commits a file in a clone.
 * @param {string} cwd the clone
 * @param {string} file the file
 * @param {string} text its contents
 * @returns {string} the commit
 */
function commit(cwd, file, text) {
    writeFileSync(join(cwd, file), text);
    git(cwd, "add", file);
    git(cwd, "commit", "-q", "-m", `change ${file}`);
    return git(cwd, "rev-parse", "HEAD");
}

/**
 * Runs git in the main checkout the way the daemon's runGit does.
 * @param {string[]} args the arguments
 * @returns {Promise<{code: number, stdout: string, stderr: string}>} the result
 */
const runGit = async (args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return { code: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
};

/** @type {string} the commit origin's master moved to */
let ahead;

beforeEach(() => {
    isolateGit();
    tmp = mkdtempSync(join(tmpdir(), "githerd-main-"));
    const remote = join(tmp, "remote.git");
    root = join(tmp, "root");
    other = join(tmp, "other");
    git(tmp, "init", "-q", "--bare", "-b", "master", remote);
    for (const clone of [root, other]) {
        git(tmp, "init", "-q", "-b", "master", clone);
        for (const [k, v] of [
            ["user.name", "Test"],
            ["user.email", "test@example.com"],
            ["commit.gpgsign", "false"],
        ])
            git(clone, "config", k, v);
        git(clone, "remote", "add", "origin", remote);
    }
    commit(root, "a.txt", "one\n");
    git(root, "push", "-q", "origin", "master");
    git(other, "pull", "-q", "origin", "master");
    ahead = commit(other, "a.txt", "two\n");
    git(other, "push", "-q", "origin", "master");
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const update = (acting = true) => updateMainCheckout(runGit, "master", { fetched: false, acting });

describe("updateMainCheckout", () => {
    it("fetches and fast-forwards a clean checkout on the default branch, leaving untracked files", async () => {
        writeFileSync(join(root, "notes.txt"), "mine\n");
        const r = await update();
        expect(r).toEqual({ outcome: "updated", text: `main checkout updated to ${ahead.slice(0, 8)}` });
        expect(git(root, "rev-parse", "HEAD")).toBe(ahead);
        expect(readFileSync(join(root, "a.txt"), "utf8")).toBe("two\n");
        expect(readFileSync(join(root, "notes.txt"), "utf8")).toBe("mine\n");
        expect(await update()).toEqual({ outcome: "current", text: "main checkout is current" });
    });

    it("in dry-run only says what it would do", async () => {
        const before = git(root, "rev-parse", "HEAD");
        expect(await update(false)).toEqual({
            outcome: "would-update",
            text: `main checkout would be fast-forwarded to ${ahead.slice(0, 8)}`,
        });
        expect(git(root, "rev-parse", "HEAD")).toBe(before);
    });

    it("leaves a checkout on another branch alone, its default branch too", async () => {
        const before = git(root, "rev-parse", "master");
        git(root, "switch", "-q", "-c", "feature");
        expect(await update()).toEqual({ outcome: "skipped", text: "main checkout not updated: on branch feature" });
        expect(git(root, "rev-parse", "master")).toBe(before);
    });

    it("leaves a detached checkout alone", async () => {
        git(root, "switch", "-q", "--detach");
        expect((await update()).text).toBe("main checkout not updated: HEAD is detached");
    });

    it("leaves a checkout with changes to tracked files alone", async () => {
        const before = git(root, "rev-parse", "HEAD");
        writeFileSync(join(root, "a.txt"), "edited\n");
        expect(await update()).toEqual({
            outcome: "skipped",
            text: "main checkout not updated: has changes to tracked files",
        });
        expect(git(root, "rev-parse", "HEAD")).toBe(before);
        expect(readFileSync(join(root, "a.txt"), "utf8")).toBe("edited\n");
    });

    it("leaves a checkout with a cherry-pick in progress alone", async () => {
        writeFileSync(join(root, ".git", "CHERRY_PICK_HEAD"), `${git(root, "rev-parse", "HEAD")}\n`);
        expect((await update()).text).toBe("main checkout not updated: a cherry-pick is in progress");
    });

    it("leaves a checkout that diverged from origin alone", async () => {
        const mine = commit(root, "b.txt", "local\n");
        expect(await update()).toEqual({
            outcome: "skipped",
            text: "main checkout not updated: diverged from origin/master",
        });
        expect(git(root, "rev-parse", "HEAD")).toBe(mine);
    });

    it("says so when the fetch fails", async () => {
        git(root, "remote", "set-url", "origin", join(tmp, "gone.git"));
        const r = await update();
        expect(r.outcome).toBe("fetch-failed");
        expect(r.text).toMatch(/^main checkout not updated: git fetch origin master failed: /);
    });
});
