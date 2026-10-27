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
//   node tools/channel/hold.mjs end      the land job (promoted) or nightly-abandon.yml: clear the hold, close its issue
//       env WHY, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY, RESULTS_URL; writes base and head (the held commit and the
//       held head, empty when none); ABANDONED=true (an abandon) also records `rejected` on the held head
//   node tools/channel/hold.mjs auto     release.yml's candidate_fix job, before a full or restart run picks: abandons
//       the hold when autoAbandon (below) says so, as end does with ABANDONED=true; writes abandoned, base and head
//       env RUN_URL, GH_TOKEN, GITHUB_REPOSITORY, RESULTS_URL; git history of master's head (the checkout)
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
        'It ends when this commit promotes to nightly: a red lane or a rejected screenshot is fixed forward, and changed screenshots are approved on the review page. Anyone may end it without a promotion: `gh workflow run nightly-abandon.yml --ref master -f reason="<why>"`. A full run ends it on its own when only a pipeline defect, since fixed on master, held it, or when it is over 24 hours old and master has a newer green build; changed screenshots awaiting review never end it.',
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

/** The red lanes a pipeline defect causes, never the code under test (tools/full-run.mjs LANES). */
export const PIPELINE_LANES = new Set(["captures", "recapture"]);
/** The verdicts a newer commit's own full run ends in (not inherited, not an abandon or a deferred attempt 1). */
const JUDGED = new Set(["red", "owner-item", "green-clean", "green-images", "approved"]);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a full or restart run abandons the held candidate before it picks (owner, 2026-10-27), and why. Only a
 * held head judged red or owner-item can be abandoned: one not judged yet is tested first, and green-images (changed
 * screenshots awaiting the owner's review), approved and rejected never are. It is abandoned when
 *   (a) every lane that held it red is a pipeline lane (PIPELINE_LANES) and a commit newer on master than the held
 *       one has its own verdict in which none of those lanes and not CI is red (CI green, so the captures were
 *       judged there): the defect is fixed on master; or
 *   (b) the hold started or last moved more than 24 hours ago and master has a newer commit with a green build (a
 *       recorded site).
 * @param o the facts
 * @param o.hold the store's hold `{ base, head, issue, at }`, or null
 * @param o.recent the store's recent verdicts `{ sha, state, lane, at }`, newest first
 * @param o.sites the commits with a recorded site (a green master build)
 * @param o.chain master's head and its first parents, newest first
 * @param o.now the time, ms
 * @returns `{ abandon, why }`
 */
export function autoAbandon({ hold, recent = [], sites = [], chain = [], now = Date.now() }) {
    if (!hold) return { abandon: false, why: "nothing is held" };
    const verdict = recent.find((v) => v.sha === hold.head && v.state !== "deferred");
    const s = hold.base.slice(0, 12);
    if (!verdict) return { abandon: false, why: `the held head of ${s} is not judged yet` };
    if (verdict.state !== "red" && verdict.state !== "owner-item") {
        return { abandon: false, why: `the held head of ${s} is ${verdict.state}: only a fix or the owner ends it` };
    }
    const at = chain.indexOf(hold.base);
    const newer = at === -1 ? chain : chain.slice(0, at);
    const red = String(verdict.lane ?? "")
        .split(",")
        .filter(Boolean);
    if (verdict.state === "red" && red.length && red.every((l) => PIPELINE_LANES.has(l))) {
        const own = new Map(recent.filter((v) => !String(v.lane ?? "").startsWith("inherited")).map((v) => [v.sha, v]));
        const fixed = newer.find((sha) => {
            const v = own.get(sha);
            const lanes = String(v?.lane ?? "").split(",");
            return v && JUDGED.has(v.state) && !lanes.includes("ci") && !red.some((l) => lanes.includes(l));
        });
        if (fixed) {
            return {
                abandon: true,
                why: `it was held only by a pipeline defect (${red.join(", ")}), and ${fixed.slice(0, 12)}, newer on master, passed it`,
            };
        }
    }
    const built = new Set(sites);
    const green = newer.find((sha) => built.has(sha));
    if (now - (hold.at ?? now) > DAY_MS && green) {
        const what = [verdict.state, ...red].join(" ");
        return {
            abandon: true,
            why: `it was held over 24 hours (${what}) and master has a newer commit with a green build, ${green.slice(0, 12)}`,
        };
    }
    return { abandon: false, why: `the hold on ${s} stands` };
}

async function end(env) {
    const cfg = config(env);
    const hold = await held(cfg);
    if (!hold) {
        output({ base: "", head: "" });
        return;
    }
    // only the hold read above: a train that moved or replaced it since keeps its own
    const r = cfg ? await call(cfg, "POST", "/v1/hold", { clear: true, base: hold.base, head: hold.head }) : null;
    if (!r?.ok) throw new Error(`POST /v1/hold failed (${r?.why ?? "no store configured"})`);
    if (r.data?.cleared === false) {
        if (env.ABANDONED === "true")
            throw new Error(`the hold on ${hold.base} moved while it was abandoned: run again`);
        console.log(`::warning::the hold on ${hold.base} moved before it was cleared`);
        output({ base: "", head: "" });
        return;
    }
    // an abandoned head is rejected, so an approval of it that merges later promotes nothing (resume.mjs)
    if (env.ABANDONED === "true") {
        const v = await call(cfg, "POST", "/v1/verdicts", { sha: hold.head, state: "rejected", lane: "abandoned" });
        if (!v.ok) console.log(`::warning::recording the abandoned head rejected failed (${v.why})`);
    }
    if (hold.issue)
        sh([
            "issue",
            "close",
            String(hold.issue),
            "--comment",
            `Hold on ${hold.base} ended: ${env.WHY} (${env.RUN_URL}).`,
        ]);
    output({ base: hold.base, head: hold.head });
}

async function auto(env) {
    const cfg = config(env);
    const r = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false, why: "no store configured" };
    if (!r.ok) {
        console.log(`::warning::the results store did not answer (${r.why}): nothing abandoned`);
        output({ abandoned: "false", base: "", head: "" });
        return;
    }
    const chain = execFileSync("git", ["rev-list", "--first-parent", "-n", "200", "HEAD"], { encoding: "utf8" })
        .trim()
        .split("\n");
    const { abandon, why } = autoAbandon({ ...r.data, chain });
    console.log(`::notice::${abandon ? "abandoning the held candidate: " : ""}${why}`);
    if (!abandon) {
        output({ abandoned: "false", base: "", head: "" });
        return;
    }
    output({ abandoned: "true" });
    await end({ ...env, ABANDONED: "true", WHY: `abandoned automatically: ${why}` });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const cmd = { start, update, end, auto }[process.argv[2]];
    if (!cmd) {
        console.error("usage: node tools/channel/hold.mjs start | update | end | auto (see the head of the file)");
        process.exit(2);
    }
    await cmd(process.env);
}
