#!/usr/bin/env node
// The branch a push will be merged into, for every pre-push step that judges "what this push
// changes": the SonarQube changed lines (tools/sonar-gate.mjs), the affected packages and test shards
// (tools/prepush.sh), the secret scan (.husky/pre-push) and the push queue's fast lane and push log
// (tools/push-queue.sh). Measured against origin/master, a branch stacked on another pull request's
// branch counts the whole parent branch as its own change (#2546).
//
//   node tools/push-base.mjs [--branch <name>]   prints the base ref, such as origin/master
//
// The answer, first that holds:
//   1. $PUSH_BASE_REF, which the push queue and the pre-push hook export once they have asked, so a
//      push asks at most once.
//   2. The local record: `branch.<name>.prBase` (tools/worktree-new.sh writes it for a branch started
//      from another branch), or an upstream that is a different branch than <name>.
//   3. The pull request's base: one `gh pr view <name> --json baseRefName`, only when origin is on
//      GitHub. gh failing (offline, rate limit) gives origin/master, and says so.
//   4. origin/master.
// A base that is missing locally, or already merged into origin/master (the parent landed), gives
// origin/master too.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MASTER = "origin/master";

function tryRun(cmd, args, cwd, env) {
    try {
        return {
            out: execFileSync(cmd, args, {
                cwd,
                env,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
                timeout: 30000,
            }).trim(),
        };
    } catch (e) {
        return { error: `${e.stderr ?? ""}`.trim() || e.message };
    }
}

/**
 * The ref this push merges into.
 * @param [opts] where and how to ask
 * @param [opts.cwd] the checkout being pushed
 * @param [opts.branch] the branch being pushed (default: the checked-out branch)
 * @param [opts.env] the environment (PUSH_BASE_REF, PATH for gh)
 * @param [opts.log] where a line about a base other than origin/master, or a failed lookup, goes
 * @returns a remote-tracking ref, such as "origin/master" or "origin/feat/style-import"
 */
export function pushBaseRef({ cwd = process.cwd(), branch, env = process.env, log = (m) => console.error(m) } = {}) {
    if (env.PUSH_BASE_REF) return env.PUSH_BASE_REF;
    const git = (...args) => tryRun("git", args, cwd, env).out ?? "";
    branch ||= git("symbolic-ref", "--short", "-q", "HEAD");
    if (!branch) return MASTER;

    let target = git("config", `branch.${branch}.prBase`).replace(/^origin\//, "");
    let why = `branch.${branch}.prBase`;
    if (!target) {
        const up = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", `${branch}@{upstream}`);
        if (up.startsWith("origin/") && up !== `origin/${branch}`) [target, why] = [up.slice(7), "its upstream"];
    }
    if (!target && /github\.com/.test(git("remote", "get-url", "origin"))) {
        const pr = tryRun("gh", ["pr", "view", branch, "--json", "baseRefName", "-q", ".baseRefName"], cwd, env);
        if (pr.out) [target, why] = [pr.out, "its pull request's base"];
        else if (!/no (open )?pull requests? found/i.test(pr.error)) {
            log(
                `push base: ${MASTER} (gh could not say which branch ${branch}'s pull request merges into: ${pr.error.split("\n")[0]})`,
            );
        }
    }
    if (!target || target === "master") return MASTER;
    const ref = `origin/${target}`;
    if (!git("rev-parse", "--verify", "-q", `refs/remotes/${ref}^{commit}`)) {
        log(`push base: ${MASTER} (${ref}, ${why}, is not fetched here)`);
        return MASTER;
    }
    if (tryRun("git", ["merge-base", "--is-ancestor", ref, MASTER], cwd, env).out !== undefined) return MASTER;
    log(`push base: ${ref} (${why}), not ${MASTER}`);
    return ref;
}

/**
 * The commit this push's changes are measured from.
 * @param [opts] pushBaseRef's options, plus `head`
 * @param [opts.head] the commit being pushed (default HEAD)
 * @returns the merge base of the base ref and `head`
 */
export function pushBase({ head = "HEAD", ...opts } = {}) {
    const ref = pushBaseRef(opts);
    return execFileSync("git", ["merge-base", ref, head], { cwd: opts.cwd, env: opts.env, encoding: "utf8" }).trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const i = process.argv.indexOf("--branch");
    console.log(pushBaseRef({ branch: i > 0 ? process.argv[i + 1] : undefined }));
}
