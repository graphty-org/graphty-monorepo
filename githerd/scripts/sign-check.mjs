#!/usr/bin/env node
/**
 * Manual check 4 of githerd/CLAUDE.md: does a signed commit finish within 10 seconds when it is
 * made the way a code-editing run makes it? Start it as a one-shot servherd server under `env -i`,
 * so it has pm2 as its parent and only the daemon's environment, exactly as a run spawned by the
 * daemon would:
 *
 *   servherd start -n githerd-sign-check -- env -i GITHERD_ROOT=<repository> \
 *     GITHERD_STATE_DIR=<state directory> PORT={{port}} node <repository>/githerd/scripts/sign-check.mjs
 *
 * It loads `daemon-env.json` from the state directory, builds a run's environment (`runEnv` with
 * the run git config), runs `timeout 30 git commit -S` in a scratch repository, and writes
 * `{ok, seconds, signed, error}` to `<state directory>/sign-check.json` and to stdout. It passes
 * when the commit is signed and took under 10 seconds. Remove the servherd entry afterwards.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadDaemonEnv } from "../lib/launcher.mjs";
import { ownerIdentity, runEnv, writeRunGitconfig } from "../lib/runner.mjs";

const stateDir = process.env.GITHERD_STATE_DIR;
const root = process.env.GITHERD_ROOT;
if (!stateDir || !root) {
    console.error("sign-check: GITHERD_ROOT and GITHERD_STATE_DIR must be set");
    process.exit(2);
}
loadDaemonEnv(stateDir, process.env);

const scratch = mkdtempSync(join(tmpdir(), "githerd-sign-check-"));
const repo = join(scratch, "repo");
const npmrc = join(scratch, "npmrc");
writeFileSync(npmrc, "");
let result;
try {
    const gitconfig = writeRunGitconfig(scratch, ownerIdentity(root));
    const env = runEnv(process.env, { gitconfig, npmrc, run: {} });
    execFileSync("git", ["init", "-q", repo], { env, stdio: "pipe" });
    const start = Date.now();
    execFileSync("timeout", ["30", "git", "commit", "-S", "-q", "--allow-empty", "-m", "sign check"], {
        cwd: repo,
        env,
        stdio: "pipe",
    });
    const seconds = (Date.now() - start) / 1000;
    const signed = execFileSync("git", ["cat-file", "-p", "HEAD"], { cwd: repo, env, encoding: "utf8" }).includes(
        "\ngpgsig ",
    );
    result = { ok: signed && seconds < 10, seconds, signed };
} catch (err) {
    const e = /** @type {any} */ (err);
    result = {
        ok: false,
        error: String(e.stderr || e.message)
            .trim()
            .slice(0, 500),
    };
}
writeFileSync(join(stateDir, "sign-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
rmSync(scratch, { recursive: true, force: true });
