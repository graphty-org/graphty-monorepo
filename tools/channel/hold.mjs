#!/usr/bin/env node
// The held nightly candidate's records (design/ci/channels-pipeline.md section 3, "Held candidate"): the results
// store's one-row candidate table and the "Nightly held on <sha12>" issue. release.yml pushes and deletes branch
// channel/candidate itself, with the deploy key.
//
//   node tools/channel/hold.mjs start    the verdict job, hold=start: open the hold issue and hold SHA in the store,
//       only when the store holds nothing now (a verdict on the held commit comments instead, as update does);
//       writes issue and action (start, update or none: what it did, which the jobs after the verdict follow)
//       env SHA, STATE, WHAT, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY, RESULTS_URL and the job's OIDC token
//       writes issue to GITHUB_OUTPUT
//   node tools/channel/hold.mjs update   the verdict job, hold=update: a verdict on the held head, as a comment
//       env SHA, STATE, WHAT, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY, RESULTS_URL
//   node tools/channel/hold.mjs end      the land job (promoted) or the abandon job: clear the hold, close its issue
//       env WHY, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY, RESULTS_URL; writes base (the held commit, empty when none);
//       ABANDONED=true (the abandon job) first records `rejected` on the held head
import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

import { call, config } from "../results/client.mjs";

export const HOLD_TITLE = "Nightly held on";

/**
 * The hold issue.
 * @param o the facts
 * @param o.sha the held commit
 * @param o.state its verdict
 * @param o.what what the verdict found (red lanes, changed screenshots, the owner item)
 * @param o.run the run's URL
 * @returns `{ title, body }`
 */
export function holdIssue({ sha, state, what, run }) {
    const body = [
        `Nightly is held on ${sha}: its full run ended ${state} (${what}) after its one same-commit re-run: ${run}`,
        "",
        "Master keeps merging, and newer commits' full runs still run and file their red issues, but none of them is promoted to nightly or replaces this candidate. Branch `channel/candidate` holds it.",
        "",
        "It ends when this commit promotes to nightly: a red lane or a rejected screenshot is fixed forward, and changed screenshots are approved on the review page. Only the owner ends it without a promotion: `gh workflow run release.yml --ref master -f mode=abandon`.",
        "",
        "To fix it forward, start the fix from the candidate's head, never from newer master: `worktree-new.sh fix/<issue>-<topic> origin/channel/candidate --issue <issue>` (the script in tools/; or `" +
            sha +
            "` in place of `origin/channel/candidate` while that branch does not exist yet), commit the fix with `Refs #<this issue>` in its message, and open it as usual (`tools/pr-open.sh --proof <file>`; the merge of master it adds on top never enters the candidate). When it merges into master, release.yml merges the fix into `channel/candidate` and re-tests the new head, only where the fix reaches. A further fix commit for the same pull request goes on a branch from its last fix commit, merged into the pull request's branch.",
    ].join("\n");
    return { title: `${HOLD_TITLE} ${sha.slice(0, 12)}`, body };
}

const sh = (args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const output = (fields) => {
    const lines = Object.entries(fields).map(([k, v]) => `${k}=${v}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
    console.log(lines.join("\n"));
};
const bodyFile = (text) => {
    const file = join(tmpdir(), `hold-${process.pid}.md`);
    writeFileSync(file, text);
    return file;
};
async function held(cfg) {
    const r = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false, why: "no store configured" };
    if (!r.ok) throw new Error(`the results store did not answer (${r.why})`);
    return r.data.hold;
}
async function post(cfg, body) {
    const r = cfg ? await call(cfg, "POST", "/v1/hold", body) : { ok: false, why: "no store configured" };
    if (!r.ok) throw new Error(`POST /v1/hold failed (${r.why})`);
}

async function start(env) {
    // A held candidate is never replaced, and the store is asked now, not trusted from the pick: a run picked while
    // nothing was held (or its same-commit re-run, which keeps attempt 1's pick) can end after another run held its
    // commit. Before any issue is opened, so a hold the store refuses (409) leaves no "Nightly held" issue behind.
    const hold = await held(config(env));
    if (hold && (hold.head === env.SHA || hold.base === env.SHA)) {
        await update(env);
        output({ issue: "", action: "update" });
        return;
    }
    if (hold) {
        console.log(`::notice::${hold.head} is held already: ${env.SHA} is not held`);
        output({ issue: "", action: "none" });
        return;
    }
    // the store first: it is what the next slot reads, so a hold it did not record is no hold and fails the job,
    // and a hold another run took since the read above (409) is that run's. Only then the issue, so neither leaves
    // a "Nightly held" issue for a hold the store does not have
    const cfg = config(env);
    const r = cfg ? await call(cfg, "POST", "/v1/hold", { base: env.SHA, head: env.SHA, issue: null }) : null;
    if (r && !r.ok && /\b409\b/.test(r.why)) {
        console.log(`::notice::another run held its commit just now: ${env.SHA} is not held`);
        output({ issue: "", action: "none" });
        return;
    }
    if (!r?.ok) throw new Error(`POST /v1/hold failed (${r?.why ?? "no store configured"})`);
    const { title, body } = holdIssue({ sha: env.SHA, state: env.STATE, what: env.WHAT, run: env.RUN_URL });
    const labels = ["bug", "priority:high", "effort:medium"].flatMap((l) => ["--label", l]);
    let issue = null;
    try {
        issue = Number(
            sh(["issue", "create", "--title", title, ...labels, "--body-file", bodyFile(body)])
                .split("/")
                .pop(),
        );
        // the same base again only records the issue on the hold the store already has
        await post(cfg, { base: env.SHA, head: env.SHA, issue });
    } catch (error) {
        console.log(`::warning::the hold stands, but its issue is not recorded: ${error.message.split("\n")[0]}`);
    }
    output({ issue: issue ?? "", action: "start" });
}

async function update(env) {
    const hold = await held(config(env));
    if (!hold?.issue) return;
    sh([
        "issue",
        "comment",
        String(hold.issue),
        "--body-file",
        bodyFile(`The full run on the held head ${env.SHA} ended ${env.STATE} (${env.WHAT}): ${env.RUN_URL}`),
    ]);
}

async function end(env) {
    const cfg = config(env);
    const hold = await held(cfg);
    if (!hold) {
        output({ base: "" });
        return;
    }
    // an abandoned head is rejected, so an approval of it that merges later promotes nothing (resume.mjs)
    if (env.ABANDONED === "true") {
        const r = await call(cfg, "POST", "/v1/verdicts", { sha: hold.head, state: "rejected", lane: "abandoned" });
        if (!r.ok) throw new Error(`recording the abandoned head failed (${r.why})`);
    }
    await post(cfg, { clear: true });
    if (hold.issue)
        sh([
            "issue",
            "close",
            String(hold.issue),
            "--comment",
            `Hold on ${hold.base} ended: ${env.WHY} (${env.RUN_URL}).`,
        ]);
    output({ base: hold.base });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const cmd = { start, update, end }[process.argv[2]];
    if (!cmd) {
        console.error("usage: node tools/channel/hold.mjs start | update | end (see the head of the file)");
        process.exit(2);
    }
    await cmd(process.env);
}
